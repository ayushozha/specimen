import { describe, expect, it } from 'vitest';
import type { LayoutNode } from '@specimen/core';
import type { FigmaDocument } from '@specimen/exporters';
import { importDocument } from '../src/importer';

/** A recording stand-in for the parts of Figma's plugin API the importer uses. */
function fakeFigma() {
  let ids = 0;
  const created: any[] = [];
  const node = (type: string) => {
    const n: any = {
      id: `${type}:${++ids}`, type, children: [] as any[], x: 0, y: 0, width: 0, height: 0, fills: [],
      appendChild(c: any) { this.children.push(c); c.parent = this; },
      insertChild(i: number, c: any) { this.children.splice(i, 0, c); c.parent = this; },
      resize(w: number, h: number) { this.width = w; this.height = h; },
      async setReactionsAsync(r: any) { this.reactions = r; },
      createInstance() { const i = node('INSTANCE'); i.mainComponent = this; return i; },
    };
    created.push(n);
    return n;
  };
  const page = node('PAGE');
  const loaded: string[] = [];
  const api: any = {
    currentPage: page,
    createFrame: () => node('FRAME'),
    createText: () => node('TEXT'),
    createRectangle: () => node('RECTANGLE'),
    createComponent: () => node('COMPONENT'),
    createNodeFromSvg: (svg: string) => Object.assign(node('FRAME'), { svg }),
    createImage: (bytes: Uint8Array) => ({ hash: `img-${bytes.length}`, getSizeAsync: async () => ({ width: 2200, height: 300 }) }),
    createPaintStyle: () => node('PAINT_STYLE'),
    combineAsVariants: (nodes: any[]) => Object.assign(node('COMPONENT_SET'), { children: nodes, height: 50 }),
    loadFontAsync: async (f: { family: string; style: string }) => {
      if (f.family === 'Inter' && ['Regular', 'SemiBold', 'Bold'].includes(f.style)) return loaded.push(`${f.family} ${f.style}`);
      throw new Error('missing font');
    },
    variables: {
      createVariableCollection: (name: string) => ({ name, modes: [{ modeId: 'm1' }] }),
      createVariable: (name: string) => Object.assign(node('VARIABLE'), { name, setValueForMode(this: any, _m: string, v: any) { this.value = v; } }),
    },
    viewport: { scrollAndZoomIntoView() {} },
  };
  return { api, created, page, loaded };
}

const box = (over: Partial<LayoutNode>): LayoutNode => ({
  type: 'frame', name: 'box', x: 0, y: 0, width: 10, height: 10, opacity: 1, fill: null, gradient: null, radius: [0, 0, 0, 0],
  border: null, shadows: [], clips: false, image: null, imageFit: 'fill', raster: false, svg: null, text: null, layout: null, children: [], ...over,
});

const doc: FigmaDocument = {
  format: 'specimen-figma',
  version: 1,
  source: { url: 'https://example.com', title: 'Example' },
  colors: [{ name: 'brand', hex: '#1d84f5' }],
  assets: { 'https://example.com/a.png': 'assets/a.png' },
  sections: [
    {
      id: '01-hero', name: 'Hero', screenshot: 'sections/01-hero/desktop.png', background: null, variants: [
        { name: 'Get started', x: 20, y: 60, width: 120, height: 40, defaultImage: 'states/d.png', hoverImage: 'states/h.png', durationMs: 200, easing: [0, 0, 0.58, 1] },
      ],
      tree: {
        width: 400, height: 200, background: '#ffffff', fonts: [], images: ['https://example.com/a.png'],
        root: box({
          name: 'hero', width: 400, height: 200, fill: '#f5f5f4', clips: true,
          layout: { mode: 'row', gap: 10, padding: [20, 20, 20, 20], align: 'flex-start', justify: 'normal', wrap: false },
          children: [
            box({ type: 'image', name: 'photo', x: 20, y: 20, width: 100, height: 100, image: 'https://example.com/a.png', imageFit: 'cover' }),
            box({
              type: 'text', name: 'Title', x: 130, y: 20, width: 200, height: 40,
              text: { content: 'Ship exact\ndesigns', lines: [], fontFamily: 'system-ui', fontSize: 32, fontWeight: 600, italic: false, lineHeight: 40, letterSpacing: 0, color: '#111827', align: 'left', transform: 'none', decoration: 'none' },
            }),
          ],
        }),
      },
    },
  ],
};

const files = { 'assets/a.png': new Uint8Array(10), 'sections/01-hero/desktop.png': new Uint8Array(20), 'states/d.png': new Uint8Array(3), 'states/h.png': new Uint8Array(4) };

describe('Figma importer', () => {
  it('rebuilds a section with real layers, colours and hover variants', async () => {
    const { api, created, page, loaded } = fakeFigma();
    const roots = await importDocument(api, doc, files);
    const root: any = roots[0];
    expect(root.name).toBe('Hero');
    expect(root.fills[0]).toMatchObject({ type: 'SOLID', color: { r: 0xf5 / 255 } });

    // Hidden, locked screenshot reference sits at the bottom.
    expect(root.children[0]).toMatchObject({ name: 'Screenshot (reference)', visible: false, locked: true });
    const photo = root.children.find((c: any) => c.name === 'photo');
    expect(photo.fills[0]).toMatchObject({ type: 'IMAGE', imageHash: 'img-10', scaleMode: 'FILL' });
    const title = root.children.find((c: any) => c.type === 'TEXT');
    expect(title).toMatchObject({ characters: 'Ship exact\ndesigns', fontSize: 32, x: 130, y: 20, fontName: { family: 'Inter', style: 'SemiBold' } });
    expect(loaded).toContain('Inter SemiBold');

    // The flex row matches auto layout exactly, so it becomes auto layout.
    expect(root).toMatchObject({ layoutMode: 'HORIZONTAL', itemSpacing: 10, paddingLeft: 20 });

    const variable = created.find((n) => n.type === 'VARIABLE');
    expect(variable).toMatchObject({ name: 'brand', value: { r: 0x1d / 255, a: 1 } });
    expect(created.find((n) => n.type === 'PAINT_STYLE').name).toBe('Specimen/brand');

    const set = created.find((n) => n.type === 'COMPONENT_SET');
    expect(set.name).toBe('Get started');
    const [def, hover] = set.children;
    expect(def.reactions[0]).toMatchObject({
      trigger: { type: 'ON_HOVER' },
      actions: [{ navigation: 'CHANGE_TO', destinationId: hover.id, transition: { type: 'SMART_ANIMATE', duration: 0.2, easing: { easingFunctionCubicBezier: { x1: 0, y1: 0, x2: 0.58, y2: 1 } } } }],
    });
    expect(root.children.find((c: any) => c.type === 'INSTANCE')).toMatchObject({ x: 20, y: 60 });
    expect(page.children).toContain(root);
  });

  it('places pointer motion filmstrips beside the section, under its hover variants', async () => {
    const strip = 'sections/01-hero/pointer-strip.png';
    const { api, created } = fakeFigma();
    const [root]: any[] = await importDocument(api, { ...doc, sections: [{ ...doc.sections[0], motion: [strip, 'missing.png'] }] }, { ...files, [strip]: new Uint8Array(7) });
    const placed = created.filter((n) => n.name === 'Pointer motion · frame by frame (cursor drawn in)');
    expect(placed).toHaveLength(1);
    // Scaled to the section's width, kept to the filmstrip's aspect ratio, below the 50px variant set.
    expect(placed[0]).toMatchObject({ width: 400, height: 55, x: root.width + 80, y: 90, fills: [{ type: 'IMAGE', imageHash: 'img-7', scaleMode: 'FIT' }] });
  });

  it('rejects files that are not Specimen captures', async () => {
    await expect(importDocument(fakeFigma().api, { ...doc, format: 'other' } as any, files)).rejects.toThrow('not a Specimen capture');
  });
});
