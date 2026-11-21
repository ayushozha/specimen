import type { LayoutNode, LayoutTree, Palette, Rect, StackItem } from '@specimen/core';

/**
 * A design spec for coding agents (Claude Code, Codex, Cursor, …): one Markdown file that names the
 * exact tokens, walks each section with screenshots and numbered highlights, and spells out motion
 * and interaction cues with their timings.
 */

export type CalloutKind = 'heading' | 'text' | 'button' | 'image' | 'card' | 'container';

export interface Callout {
  n: number;
  kind: CalloutKind;
  label: string;
  /** Box relative to the section. */
  rect: Rect;
  /** One line per property an agent needs to rebuild it. */
  details: string[];
  /** Name of the layout node, to match motion cues to it. */
  node: string;
}

export interface MotionCue {
  kind: 'animation' | 'loop' | 'hover' | 'focus' | 'scroll' | 'reveal' | 'pointer';
  target: string;
  description: string;
}

export interface SpecSection {
  id: string;
  name: string;
  width: number;
  height: number;
  tree: LayoutTree;
  /** Paths relative to DESIGN.md. */
  screenshots: { desktop: string; tablet?: string; mobile?: string };
  highlights: string | null;
  callouts: Callout[];
  motion: MotionCue[];
  video: string | null;
}

export interface DesignSpecInput {
  source: { url: string; title: string };
  capturedAt: string;
  breakpoints: { name: string; width: number }[];
  palette: Palette;
  stack: StackItem[];
  sections: SpecSection[];
  /** Whether motion was recorded; when not, the spec says so instead of implying there is none. */
  motionRecorded: boolean;
  tokensFile: string;
}

/** Most callouts drawn on one section, so the highlight image stays readable. */
export const MAX_CALLOUTS = 8;

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

function walk(node: LayoutNode, fn: (n: LayoutNode, depth: number) => void, depth = 0): void {
  fn(node, depth);
  for (const c of node.children) walk(c, fn, depth + 1);
}

function textOf(node: LayoutNode): string {
  if (node.text) return node.text.content;
  return node.children.map(textOf).filter(Boolean).join(' ').trim();
}

function shorten(s: string, n = 60): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function textDetails(node: LayoutNode): string[] {
  const t = node.text;
  if (!t) return [];
  return [
    `font: ${t.fontFamily} ${t.fontWeight}${t.italic ? ' italic' : ''}, ${px(t.fontSize)}/${px(t.lineHeight)}${t.letterSpacing ? `, letter-spacing ${px(t.letterSpacing)}` : ''}`,
    `colour: ${t.color}${t.align !== 'left' ? `, align ${t.align}` : ''}${t.transform && t.transform !== 'none' ? `, ${t.transform}` : ''}`,
  ];
}

function boxDetails(node: LayoutNode): string[] {
  const out = [`size: ${Math.round(node.width)}×${Math.round(node.height)}`];
  if (node.fill) out.push(`background: ${node.fill}`);
  if (node.gradient) out.push(`background: ${node.gradient.css}`);
  if (node.radius.some((r) => r > 0)) out.push(`radius: ${node.radius.every((r) => r === node.radius[0]) ? px(node.radius[0]) : node.radius.map(px).join(' ')}`);
  if (node.border) out.push(`border: ${px(node.border.width)} ${node.border.color}`);
  for (const s of node.shadows) out.push(`shadow: ${s.inset ? 'inset ' : ''}${px(s.x)} ${px(s.y)} ${px(s.blur)} ${px(s.spread)} ${s.color}`);
  if (node.layout) {
    const l = node.layout;
    out.push(`layout: ${l.mode === 'row' ? 'row' : 'column'}, gap ${px(l.gap)}, padding ${l.padding.map(px).join(' ')}${l.align ? `, align ${l.align}` : ''}${l.justify ? `, justify ${l.justify}` : ''}${l.wrap ? ', wraps' : ''}`);
  }
  if (node.opacity < 1) out.push(`opacity: ${node.opacity}`);
  return out;
}

/** The first text inside a box, for its font details. */
function firstText(node: LayoutNode): LayoutNode | null {
  if (node.text) return node;
  for (const c of node.children) {
    const t = firstText(c);
    if (t) return t;
  }
  return null;
}

const area = (n: { width: number; height: number }) => n.width * n.height;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * The elements worth pointing at in a section, in reading order: the biggest headings, buttons and
 * links styled as buttons, large images, and repeated cards (reported once, with their count).
 */
export function pickCallouts(tree: LayoutTree, max = MAX_CALLOUTS): Callout[] {
  const sectionArea = Math.max(1, tree.width * tree.height);
  const texts: LayoutNode[] = [];
  const buttons: LayoutNode[] = [];
  const images: LayoutNode[] = [];
  const cards: { node: LayoutNode; count: number }[] = [];

  walk(tree.root, (n, depth) => {
    if (depth > 0) {
      if (n.text && n.text.content.trim()) texts.push(n);
      const painted = !!(n.fill || n.gradient || n.border || n.shadows.length);
      const label = firstText(n);
      if (n.type === 'frame' && painted && label && n.height >= 24 && n.height <= 72 && n.width <= 420 && textOf(n).length <= 40) buttons.push(n);
      if ((n.type === 'image' || n.type === 'svg') && area(n) / sectionArea > 0.04) images.push(n);
    }
    // Repeated siblings with the same size and a painted box: cards, tiles, logos.
    const kids = n.children.filter((c) => c.type === 'frame' && (c.fill || c.border || c.shadows.length || c.radius.some((r) => r > 0)));
    if (kids.length >= 2) {
      const same = kids.filter((c) => Math.abs(c.width - kids[0].width) <= 2 && Math.abs(c.height - kids[0].height) <= 2);
      const share = area(kids[0]) / sectionArea;
      if (same.length >= 2 && share > 0.01 && share < 0.45) cards.push({ node: kids[0], count: same.length });
    }
  });

  const sizes = texts.map((t) => t.text!.fontSize).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)] ?? 16;
  // Headings: the largest text above body size (an h3 can be only a step above it).
  const headings = texts.filter((t) => t.text!.fontSize > body || (t.text!.fontWeight >= 600 && t.text!.fontSize >= body)).sort((a, b) => b.text!.fontSize - a.text!.fontSize || b.text!.fontWeight - a.text!.fontWeight).slice(0, 2);
  const bodyText = texts.filter((t) => !headings.includes(t) && t.text!.content.length > 30).slice(0, 1);

  const picked: Omit<Callout, 'n'>[] = [];
  const add = (node: LayoutNode, kind: CalloutKind, label: string, details: string[]) => {
    const rect = { x: node.x, y: node.y, width: node.width, height: node.height };
    if (rect.width < 4 || rect.height < 4) return;
    // One callout per spot: a button inside a card is still worth its own, an identical box is not.
    if (picked.some((p) => p.rect.x === rect.x && p.rect.y === rect.y && p.rect.width === rect.width && p.rect.height === rect.height)) return;
    picked.push({ kind, label, rect, details, node: node.name });
  };
  for (const h of headings) add(h, 'heading', `Heading “${shorten(h.text!.content, 48)}”`, textDetails(h));
  for (const b of buttons.slice(0, 3)) add(b, 'button', `Button “${shorten(textOf(b), 32)}”`, [...boxDetails(b), ...textDetails(firstText(b)!)]);
  for (const c of cards.slice(0, 2)) {
    const t = firstText(c.node);
    add(c.node, 'card', `Card${c.count > 1 ? ` (×${c.count}, same size)` : ''}${t ? ` “${shorten(t.text!.content, 28)}”` : ''}`, [...boxDetails(c.node), ...(t ? textDetails(t) : [])]);
  }
  for (const i of images.sort((a, b) => area(b) - area(a)).slice(0, 2)) add(i, 'image', `${i.type === 'svg' ? 'Illustration' : 'Image'} ${Math.round(i.width)}×${Math.round(i.height)}`, [`size: ${Math.round(i.width)}×${Math.round(i.height)}`, `fit: ${i.imageFit}`, ...boxDetails(i).slice(1)]);
  for (const t of bodyText) add(t, 'text', `Body text “${shorten(t.text!.content, 40)}”`, textDetails(t));

  // Reading order, then drop boxes that mostly hide another callout.
  const ordered = picked.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x).slice(0, max);
  return ordered
    .filter((c, i) => !ordered.some((o, j) => j < i && o.kind === c.kind && overlaps(o.rect, c.rect) && area(o.rect) >= area(c.rect)))
    .map((c, i) => ({ ...c, n: i + 1 }));
}

interface Tokens {
  typography: { family: string; size: number; weight: number; lineHeight: number; letterSpacing: number; count: number }[];
  radii: { value: string; count: number }[];
  shadows: { value: string; count: number }[];
  spacing: { value: number; count: number }[];
  fonts: string[];
}

const top = <T extends { count: number }>(xs: T[], n: number) => xs.sort((a, b) => b.count - a.count).slice(0, n);

/** Type scale, radii, shadows and spacing as used across the captured sections. */
export function designTokens(trees: LayoutTree[]): Tokens {
  const type = new Map<string, Tokens['typography'][number]>();
  const radii = new Map<string, number>();
  const shadows = new Map<string, number>();
  const spacing = new Map<number, number>();
  const fonts = new Set<string>();
  for (const tree of trees) {
    for (const f of tree.fonts) fonts.add(f.family);
    walk(tree.root, (n) => {
      if (n.text) {
        const t = n.text;
        const key = `${t.fontFamily}|${t.fontSize}|${t.fontWeight}|${t.lineHeight}|${t.letterSpacing}`;
        const e = type.get(key) ?? { family: t.fontFamily, size: t.fontSize, weight: t.fontWeight, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, count: 0 };
        e.count++;
        type.set(key, e);
      }
      if (n.radius.some((r) => r > 0)) {
        const v = n.radius.every((r) => r === n.radius[0]) ? px(n.radius[0]) : n.radius.map(px).join(' ');
        radii.set(v, (radii.get(v) ?? 0) + 1);
      }
      for (const s of n.shadows) {
        const v = `${s.inset ? 'inset ' : ''}${px(s.x)} ${px(s.y)} ${px(s.blur)} ${px(s.spread)} ${s.color}`;
        shadows.set(v, (shadows.get(v) ?? 0) + 1);
      }
      if (n.layout) for (const v of [n.layout.gap, ...n.layout.padding]) if (v > 0) spacing.set(Math.round(v), (spacing.get(Math.round(v)) ?? 0) + 1);
    });
  }
  return {
    typography: top([...type.values()], 10).sort((a, b) => b.size - a.size || b.weight - a.weight),
    radii: top([...radii].map(([value, count]) => ({ value, count })), 6),
    shadows: top([...shadows].map(([value, count]) => ({ value, count })), 4),
    spacing: top([...spacing].map(([value, count]) => ({ value, count })), 10).sort((a, b) => a.value - b.value),
    fonts: [...fonts],
  };
}

/** Machine-readable tokens written next to DESIGN.md. */
export function tokensJson(input: Pick<DesignSpecInput, 'palette' | 'sections'>): object {
  const tokens = designTokens(input.sections.map((s) => s.tree));
  return {
    colors: input.palette.colors.slice(0, 24).map((c) => ({ hex: c.hex, value: c.values[0], roles: c.roles, variables: c.variables, uses: c.count })),
    ...tokens,
  };
}

const ROLE_ORDER = ['background', 'surface', 'text', 'text-muted', 'accent', 'border'];

export function toDesignMarkdown(input: DesignSpecInput): string {
  const { palette } = input;
  const tokens = designTokens(input.sections.map((s) => s.tree));
  const out: string[] = [];
  const host = (() => {
    try {
      return new URL(input.source.url).hostname.replace(/^www\./, '');
    } catch {
      return input.source.url;
    }
  })();

  out.push(`# ${input.source.title || host}: design spec`, '');
  out.push(`Captured from ${input.source.url} on ${input.capturedAt.slice(0, 10)} by Specimen, at ${input.breakpoints.map((b) => `${b.name} ${b.width}px`).join(', ')}.`);
  out.push('Every value below was read from the live page; screenshots are the source of truth when a value and a screenshot disagree.', '');
  out.push('## Using this spec', '');
  out.push('- **Claude Code, Codex, Cursor and other repo agents:** keep this folder in the repo and refer to it, e.g. “Build the hero exactly as in `DESIGN.md`, section 2.” Screenshots and highlights sit next to it.');
  out.push('- **Chat agents (Claude, ChatGPT, Grok, Gemini):** paste this file and attach the section screenshots it names.');
  out.push(`- Machine-readable tokens: \`${input.tokensFile}\`.`, '');

  out.push('## Colours', '', '| Role | Hex | Exact value | Variables | Uses |', '| --- | --- | --- | --- | --- |');
  const byRole = ROLE_ORDER.map((r) => [r, palette.colors.find((c) => c.roles.includes(r as never))] as const).filter(([, c]) => c);
  const rest = palette.colors.filter((c) => !byRole.some(([, r]) => r === c)).slice(0, 12);
  for (const [role, c] of byRole) out.push(`| ${role} | \`${c!.hex}\` | \`${c!.values[0]}\` | ${c!.variables.slice(0, 2).map((v) => `\`${v}\``).join(' ') || '–'} | ${c!.count} |`);
  for (const c of rest) out.push(`| – | \`${c.hex}\` | \`${c.values[0]}\` | ${c.variables.slice(0, 2).map((v) => `\`${v}\``).join(' ') || '–'} | ${c.count} |`);
  const gradients = palette.gradients.filter((g) => !g.value.includes('url(')).slice(0, 4);
  if (gradients.length) out.push('', 'Gradients:', ...gradients.map((g) => `- \`${g.value}\``));
  const failing = palette.contrast.filter((p) => !p.passesAA);
  if (failing.length) out.push('', `Contrast: ${failing.length} text/background pairs are below WCAG AA (${failing.slice(0, 3).map((p) => `${p.fg} on ${p.bg} ${p.ratio.toFixed(2)}:1`).join('; ')}).`);
  out.push('');

  out.push('## Typography', '');
  if (tokens.fonts.length) out.push(`Fonts: ${tokens.fonts.map((f) => `\`${f}\``).join(', ')}.`, '');
  out.push('| Font | Size / line height | Weight | Letter spacing | Uses |', '| --- | --- | --- | --- | --- |');
  for (const t of tokens.typography) out.push(`| ${t.family} | ${px(t.size)} / ${px(t.lineHeight)} | ${t.weight} | ${t.letterSpacing ? px(t.letterSpacing) : '0'} | ${t.count} |`);
  out.push('');

  out.push('## Shape and spacing', '');
  if (tokens.radii.length) out.push(`- Corner radius: ${tokens.radii.map((r) => `\`${r.value}\` (${r.count}×)`).join(', ')}`);
  if (tokens.shadows.length) out.push(`- Shadows: ${tokens.shadows.map((s) => `\`${s.value}\``).join('; ')}`);
  if (tokens.spacing.length) out.push(`- Spacing in use (gaps and padding): ${tokens.spacing.map((s) => px(s.value)).join(', ')}`);
  out.push('');

  if (input.stack.length) {
    out.push('## Built with', '', input.stack.map((s) => `${s.name}${s.version ? ` ${s.version}` : ''}`).join(', '), '');
  }

  out.push('## Sections', '');
  for (const [i, s] of input.sections.entries()) {
    out.push(`### ${i + 1}. ${s.name}`, '');
    out.push(`${s.width}×${s.height} at desktop.${s.tree.background ? ` Background \`${s.tree.background}\`.` : ''}`, '');
    out.push(`![${s.name}](${s.screenshots.desktop})`, '');
    const others = (['tablet', 'mobile'] as const).filter((k) => s.screenshots[k]);
    if (others.length) out.push(`Responsive: ${others.map((k) => `[${k}](${s.screenshots[k]})`).join(' · ')}`, '');
    if (s.tree.root.layout) out.push(`Layout: ${boxDetails(s.tree.root).find((d) => d.startsWith('layout:'))!.slice(8)}.`, '');
    if (s.callouts.length) {
      if (s.highlights) out.push(`Numbered highlights: ![${s.name}, highlighted](${s.highlights})`, '');
      for (const c of s.callouts) {
        out.push(`${c.n}. **${c.label}** at ${Math.round(c.rect.x)},${Math.round(c.rect.y)}`);
        for (const d of c.details) out.push(`   - ${d}`);
      }
      out.push('');
    }
    if (s.motion.length) {
      out.push('Motion and interaction:', '');
      for (const m of s.motion) out.push(`- ${m.kind}: \`${m.target}\`: ${m.description}`);
      if (s.video) out.push(`- Recording: [${s.video}](${s.video})`);
      out.push('');
    } else if (!input.motionRecorded) {
      out.push('Motion was not recorded for this capture.', '');
    } else {
      out.push('No motion or hover effects found in this section.', '');
    }
  }
  return out.join('\n');
}
