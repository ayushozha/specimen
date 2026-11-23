import type { LayoutNode } from '@specimen/core';
import { autoLayoutFits, type FigmaDocument, type FigmaSection } from '@specimen/exporters';

type Files = Record<string, Uint8Array>;
type Parent = FrameNode | ComponentNode | PageNode;

const WEIGHT_STYLE: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};
/** Generic and system font names browsers report, which Figma can't load. */
const GENERIC_FONTS = /^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|sans-serif|serif|monospace|ui-monospace|segoe ui)$/i;
const FALLBACK_FAMILY = 'Inter';
const SECTION_GAP = 200;

function rgba(hex: string): { r: number; g: number; b: number; a: number } {
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return { r: n(1), g: n(3), b: n(5), a: hex.length === 9 ? n(7) : 1 };
}

function solid(hex: string): SolidPaint {
  const { r, g, b, a } = rgba(hex);
  return { type: 'SOLID', color: { r, g, b }, opacity: a };
}

/**
 * Rebuilds a Specimen capture in Figma: colour variables and styles, one frame per section with
 * real frames, text, images and vectors, a hidden screenshot for reference, and hover states as
 * component variants wired with Smart Animate using the captured timing.
 */
export async function importDocument(figma: PluginAPI, doc: FigmaDocument, files: Files, onProgress: (text: string) => void = () => {}): Promise<SceneNode[]> {
  if (doc.format !== 'specimen-figma') throw new Error('This file is not a Specimen capture');
  const fonts = new Map<string, Promise<FontName>>();
  const imageHash = new Map<string, string>();

  const font = (family: string, weight: number, italic: boolean): Promise<FontName> => {
    const fam = GENERIC_FONTS.test(family) ? FALLBACK_FAMILY : family;
    const key = `${fam}|${weight}|${italic}`;
    if (!fonts.has(key)) {
      fonts.set(
        key,
        (async () => {
          const base = WEIGHT_STYLE[Math.round(weight / 100) * 100] ?? 'Regular';
          const styles = italic ? [`${base} Italic`, base === 'Regular' ? 'Italic' : `${base}Italic`, base] : [base, base.replace(/([a-z])([A-Z])/, '$1 $2')];
          for (const f of [fam, FALLBACK_FAMILY]) {
            for (const style of [...styles, 'Regular']) {
              try {
                await figma.loadFontAsync({ family: f, style });
                return { family: f, style };
              } catch {
                // Try the next style or family.
              }
            }
          }
          throw new Error(`No font available for ${family}`);
        })(),
      );
    }
    return fonts.get(key)!;
  };

  const image = (pathOrUrl: string): string | null => {
    if (imageHash.has(pathOrUrl)) return imageHash.get(pathOrUrl)!;
    let bytes: Uint8Array | undefined;
    if (pathOrUrl.startsWith('data:')) bytes = Uint8Array.from(atob(pathOrUrl.split(',')[1] ?? ''), (c: string) => c.charCodeAt(0));
    else bytes = files[doc.assets[pathOrUrl] ?? pathOrUrl];
    if (!bytes?.length) return null;
    try {
      const hash = figma.createImage(bytes).hash;
      imageHash.set(pathOrUrl, hash);
      return hash;
    } catch {
      return null; // A format Figma can't decode (e.g. AVIF).
    }
  };

  // Colours: variables (where the plan supports them) and paint styles.
  onProgress('Adding colours');
  try {
    const collection = figma.variables.createVariableCollection('Specimen colours');
    for (const c of doc.colors) {
      const v = figma.variables.createVariable(c.name, collection, 'COLOR');
      v.setValueForMode(collection.modes[0].modeId, rgba(c.hex));
    }
  } catch {
    // Variables unavailable (older files or plans); styles below still carry the palette.
  }
  for (const c of doc.colors) {
    const style = figma.createPaintStyle();
    style.name = `Specimen/${c.name}`;
    style.paints = [solid(c.hex)];
  }

  const build = async (n: LayoutNode, parent: Parent, ox: number, oy: number): Promise<SceneNode | null> => {
    const place = (node: SceneNode & LayoutMixin) => {
      parent.appendChild(node);
      node.x = n.x - ox;
      node.y = n.y - oy;
    };
    if (n.type === 'text' && n.text) {
      const t = n.text;
      const node = figma.createText();
      node.fontName = await font(t.fontFamily, t.fontWeight, t.italic);
      node.characters = t.content;
      node.fontSize = t.fontSize;
      node.lineHeight = { value: t.lineHeight, unit: 'PIXELS' };
      if (t.letterSpacing) node.letterSpacing = { value: t.letterSpacing, unit: 'PIXELS' };
      node.fills = [solid(t.color)];
      node.textAlignHorizontal = t.align === 'center' ? 'CENTER' : t.align === 'right' ? 'RIGHT' : t.align === 'justify' ? 'JUSTIFIED' : 'LEFT';
      if (t.transform === 'uppercase') node.textCase = 'UPPER';
      if (t.transform === 'lowercase') node.textCase = 'LOWER';
      if (t.transform === 'capitalize') node.textCase = 'TITLE';
      if (t.decoration.includes('underline')) node.textDecoration = 'UNDERLINE';
      if (t.decoration.includes('line-through')) node.textDecoration = 'STRIKETHROUGH';
      node.textAutoResize = 'WIDTH_AND_HEIGHT';
      node.name = n.name;
      place(node);
      return node;
    }
    if (n.type === 'svg' && n.svg) {
      try {
        const node = figma.createNodeFromSvg(n.svg);
        node.name = n.name;
        place(node);
        node.resize(Math.max(0.01, n.width), Math.max(0.01, n.height));
        return node;
      } catch {
        // Unsupported SVG: fall through to an empty frame of the same size.
      }
    }

    const frame = figma.createFrame();
    frame.name = n.name;
    frame.resize(Math.max(0.01, n.width), Math.max(0.01, n.height));
    const fills: Paint[] = [];
    const shot = rasterFill(n);
    if (shot) fills.push(shot);
    else if (n.fill) fills.push(solid(n.fill));
    if (n.gradient && !shot) fills.push(gradient(n.gradient.stops, n.gradient.angle));
    if (n.image && !shot) {
      const hash = image(n.image);
      if (hash) fills.push({ type: 'IMAGE', imageHash: hash, scaleMode: n.imageFit === 'contain' ? 'FIT' : 'FILL' });
    }
    frame.fills = fills;
    frame.topLeftRadius = n.radius[0];
    frame.topRightRadius = n.radius[1];
    frame.bottomRightRadius = n.radius[2];
    frame.bottomLeftRadius = n.radius[3];
    if (n.border && !shot) {
      frame.strokes = [solid(n.border.color)];
      frame.strokeWeight = n.border.width;
      frame.strokeAlign = 'INSIDE';
    }
    frame.effects = n.shadows.map((s) => {
      const { r, g, b, a } = rgba(s.color);
      return { type: s.inset ? 'INNER_SHADOW' : 'DROP_SHADOW', color: { r, g, b, a }, offset: { x: s.x, y: s.y }, radius: s.blur, spread: s.spread, visible: true, blendMode: 'NORMAL' } as Effect;
    });
    frame.opacity = n.opacity;
    frame.clipsContent = n.clips;
    place(frame);

    for (const child of n.children) await build(child, frame, n.x, n.y);

    // Auto layout only where it reproduces the browser's positions exactly.
    if (n.layout && autoLayoutFits(n)) {
      const [pt, pr, pb, pl] = n.layout.padding;
      frame.layoutMode = n.layout.mode === 'row' ? 'HORIZONTAL' : 'VERTICAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'FIXED';
      frame.itemSpacing = n.layout.gap;
      Object.assign(frame, { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl });
      frame.primaryAxisAlignItems = 'MIN';
      frame.counterAxisAlignItems = n.layout.align === 'center' ? 'CENTER' : ['flex-end', 'end'].includes(n.layout.align) ? 'MAX' : 'MIN';
    }
    return frame;
  };

  // Boxes marked raster show their exact pixels: the section screenshot, cropped to the box.
  let current: FigmaSection | null = null;
  function rasterFill(n: LayoutNode): ImagePaint | null {
    if (!n.raster || !current) return null;
    const hash = image(current.background ?? current.screenshot);
    if (!hash) return null;
    const W = current.tree.width;
    const H = current.tree.height;
    return { type: 'IMAGE', imageHash: hash, scaleMode: 'CROP', imageTransform: [[n.width / W, 0, n.x / W], [0, n.height / H, n.y / H]] };
  }

  const roots: SceneNode[] = [];
  let y = 0;
  for (const section of doc.sections) {
    current = section;
    onProgress(`Building ${section.name}`);
    const root = (await build(section.tree.root, figma.currentPage, 0, 0)) as FrameNode;
    root.name = section.name;
    root.x = 0;
    root.y = y;
    if (!root.fills || (root.fills as Paint[]).length === 0) root.fills = [solid(section.tree.background)];
    const shot = image(section.screenshot);
    if (shot) {
      const ref = figma.createRectangle();
      ref.name = 'Screenshot (reference)';
      ref.resize(section.tree.width, section.tree.height);
      ref.fills = [{ type: 'IMAGE', imageHash: shot, scaleMode: 'FILL' }];
      root.insertChild(0, ref);
      ref.x = 0;
      ref.y = 0;
      ref.visible = false;
      ref.locked = true;
    }
    const offsetY = await addVariants(figma, section, root, image);
    annotate(section, root, await addMotion(figma, section, root, files, offsetY));
    roots.push(root);
    y += section.tree.height + SECTION_GAP;
  }
  figma.viewport.scrollAndZoomIntoView(roots);
  return roots;
}

async function addVariants(figma: PluginAPI, section: FigmaSection, root: FrameNode, image: (path: string) => string | null): Promise<number> {
  let offsetY = 0;
  for (const v of section.variants) {
    const make = (state: string, path: string) => {
      const c = figma.createComponent();
      c.name = `State=${state}`;
      c.resize(Math.max(1, v.width), Math.max(1, v.height));
      const hash = image(path);
      c.fills = hash ? [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }] : [];
      return c;
    };
    const def = make('Default', v.defaultImage);
    const hover = make('Hover', v.hoverImage);
    const set = figma.combineAsVariants([def, hover], figma.currentPage);
    set.name = v.name;
    set.x = root.x + root.width + 80;
    set.y = root.y + offsetY;
    offsetY += set.height + 40;
    const [x1, y1, x2, y2] = v.easing;
    // Cast: the DOM library's own `Navigation` interface shadows Figma's `Navigation` union in this file.
    const action = {
      type: 'NODE',
      destinationId: hover.id,
      navigation: 'CHANGE_TO',
      transition: { type: 'SMART_ANIMATE', easing: { type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1, y1, x2, y2 } }, duration: v.durationMs / 1000 },
      preserveScrollPosition: false,
    } as unknown as Action;
    await def.setReactionsAsync([{ trigger: { type: 'ON_HOVER' }, actions: [action] }]);
    // An instance in place, so the section's prototype hovers like the site.
    const instance = def.createInstance();
    root.appendChild(instance);
    instance.x = v.x;
    instance.y = v.y;
  }
  return offsetY;
}

/**
 * Recorded motion beside the section, under its hover variants: clips as video layers that play in
 * Figma, then filmstrips (frame by frame, cursor drawn in). Video layers need a Figma plan that
 * allows video; where it is refused the filmstrip still shows the motion. Returns what was skipped.
 */
async function addMotion(figma: PluginAPI, section: FigmaSection, root: FrameNode, files: Files, offsetY: number): Promise<string[]> {
  const skipped: string[] = [];
  for (const entry of section.motion ?? []) {
    const m = typeof entry === 'string' ? { kind: 'image' as const, path: entry, label: 'Pointer motion · frame by frame (cursor drawn in)', width: 0, height: 0 } : entry;
    const bytes = files[m.path];
    if (!bytes?.length) continue;
    let fill: Paint;
    let width = m.width;
    let height = m.height;
    if (m.kind === 'video') {
      try {
        const video = await figma.createVideoAsync(bytes);
        fill = { type: 'VIDEO', videoHash: video.hash, scaleMode: 'FIT' };
      } catch {
        skipped.push(`${section.name}: ${m.label}`);
        continue;
      }
    } else {
      const image = figma.createImage(bytes);
      ({ width, height } = await image.getSizeAsync());
      fill = { type: 'IMAGE', imageHash: image.hash, scaleMode: 'FIT' };
    }
    const w = Math.min(width, root.width);
    const layer = figma.createRectangle();
    layer.name = m.label;
    layer.resize(w, Math.max(1, Math.round((height * w) / width)));
    layer.fills = [fill];
    layer.x = root.x + root.width + 80;
    layer.y = root.y + offsetY;
    offsetY += layer.height + 40;
  }
  return skipped;
}

/** The section's motion cues as a Dev Mode annotation, so developers see timing and easing on the frame. */
function annotate(section: FigmaSection, root: FrameNode, skipped: string[]): void {
  const lines = [...(section.notes ?? [])];
  if (skipped.length) lines.push(`Clips not placed (video layers need a Figma plan that allows video): ${skipped.join(', ')}`);
  if (!lines.length) return;
  try {
    root.annotations = [{ labelMarkdown: `**Motion**\n\n${lines.map((l) => `- ${l}`).join('\n')}` }];
  } catch {
    // Annotations are unavailable in this editor (e.g. FigJam); the motion layers are still placed.
  }
}

/** Figma linear gradient for a CSS angle (0deg = to top, 90deg = to right). */
function gradient(stops: string[], angle: number): GradientPaint {
  const rad = ((angle - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [cos, sin, 0.5 - cos / 2 - sin / 2],
      [-sin, cos, 0.5 + sin / 2 - cos / 2],
    ],
    gradientStops: stops.map((s, i) => {
      const { r, g, b, a } = rgba(s);
      return { position: stops.length > 1 ? i / (stops.length - 1) : 0, color: { r, g, b, a } };
    }),
  };
}
