import { describe, expect, it } from 'vitest';
import type { LayoutNode, LayoutTree, Palette } from '@specimen/core';
import { designTokens, pickCallouts, toDesignMarkdown } from '../src/design-md';

const node = (over: Partial<LayoutNode>): LayoutNode =>
  ({ type: 'frame', name: 'div', x: 0, y: 0, width: 100, height: 50, opacity: 1, fill: null, gradient: null, radius: [0, 0, 0, 0], border: null, shadows: [], clips: false, image: null, imageFit: 'fill', raster: false, svg: null, text: null, layout: null, children: [], ...over }) as LayoutNode;
const text = (content: string, fontSize: number, over: Partial<LayoutNode> = {}): LayoutNode =>
  node({ type: 'text', name: content, height: fontSize * 1.2, text: { content, lines: [], fontFamily: 'Inter', fontSize, fontWeight: fontSize > 30 ? 700 : 400, italic: false, lineHeight: fontSize * 1.2, letterSpacing: 0, color: '#0a0a0a', align: 'left', transform: 'none', decoration: 'none' }, ...over });
const card = (x: number) => node({ name: 'div.card', x, y: 300, width: 300, height: 200, fill: '#ffffff', radius: [16, 16, 16, 16], border: { width: 1, color: '#e5e7eb' }, children: [text('Fast and exact', 18, { x, y: 320 })] });

const tree: LayoutTree = {
  width: 1440,
  height: 900,
  background: '#ffffff',
  fonts: [{ family: 'Inter', weight: 400, italic: false }],
  images: [],
  root: node({
    width: 1440,
    height: 900,
    layout: { mode: 'column', gap: 24, padding: [80, 32, 80, 32], align: 'center', justify: 'start', wrap: false },
    children: [
      text('Ship exact designs', 64, { x: 32, y: 80, width: 700 }),
      text('Capture every pixel of any website, section by section, with colours, motion and code.', 16, { x: 32, y: 180, width: 700 }),
      node({ name: 'a.btn', x: 32, y: 230, width: 140, height: 44, fill: '#2563eb', radius: [10, 10, 10, 10], children: [text('Get started', 16, { x: 52, y: 242 })] }),
      node({ name: 'div.grid', y: 300, width: 1400, height: 200, children: [card(32), card(352), card(672)] }),
    ],
  }),
};

describe('pickCallouts', () => {
  it('points at the heading, the button and the repeated cards, numbered in reading order', () => {
    const callouts = pickCallouts(tree);
    expect(callouts.map((c) => c.kind)).toEqual(['heading', 'text', 'button', 'card']);
    expect(callouts.map((c) => c.n)).toEqual([1, 2, 3, 4]);
    expect(callouts[0].label).toBe('Heading “Ship exact designs”');
    expect(callouts[0].details[0]).toBe('font: Inter 700, 64px/76.8px');
    expect(callouts[2].label).toBe('Button “Get started”');
    expect(callouts[2].details).toEqual(expect.arrayContaining(['background: #2563eb', 'radius: 10px']));
    expect(callouts[3].label).toBe('Card (×3, same size) “Fast and exact”');
  });
});

describe('design tokens and DESIGN.md', () => {
  const palette = {
    colors: [{ hex: '#2563eb', values: ['oklch(0.55 0.2 260)'], space: 'oklch', alpha: 1, count: 4, properties: {}, roles: ['accent'], variables: ['--brand'], selectors: [], area: 0 }],
    variables: [],
    gradients: [],
    contrast: [],
  } as unknown as Palette;

  it('reads the type scale, radii and spacing', () => {
    const t = designTokens([tree]);
    expect(t.typography[0]).toMatchObject({ family: 'Inter', size: 64, weight: 700 });
    expect(t.radii.map((r) => r.value)).toEqual(['16px', '10px']);
    expect(t.spacing.map((s) => s.value)).toEqual([24, 32, 80]);
  });

  it('writes tokens, sections, highlights and motion cues for agents', () => {
    const md = toDesignMarkdown({
      source: { url: 'https://example.com/', title: 'Example' },
      capturedAt: '2026-11-20T10:00:00.000Z',
      breakpoints: [{ name: 'desktop', width: 1440 }],
      palette,
      stack: [{ name: 'Next.js', category: 'framework', version: '15.0.0', confidence: 'high', evidence: [] }],
      sections: [
        {
          id: '01-hero',
          name: 'Hero',
          width: 1440,
          height: 900,
          tree,
          screenshots: { desktop: 'screenshots/01-hero.png', mobile: 'screenshots/01-hero-mobile.png' },
          highlights: 'highlights/01-hero.png',
          callouts: pickCallouts(tree),
          motion: [{ kind: 'hover', target: 'a.btn', description: 'transform none → translateY(-2px), 200ms ease-out' }],
          video: null,
          media: [
            { label: 'Pointer stroke, frame by frame (cursor drawn in)', path: 'motion/01-hero-pointer-strip.png' },
            { label: 'Pointer stroke clip', path: 'motion/01-hero-pointer.mp4' },
          ],
        },
      ],
      motionRecorded: true,
      tokensFile: 'tokens.json',
    });
    expect(md).toContain('# Example: design spec');
    expect(md).toContain('| accent | `#2563eb` | `oklch(0.55 0.2 260)` | `--brand` | 4 |');
    expect(md).toContain('| Inter | 64px / 76.8px | 700 | 0 |');
    expect(md).toContain('![Hero](screenshots/01-hero.png)');
    expect(md).toContain('[mobile](screenshots/01-hero-mobile.png)');
    expect(md).toContain('Numbered highlights: ![Hero, highlighted](highlights/01-hero.png)');
    expect(md).toContain('3. **Button “Get started”** at 32,230');
    expect(md).toContain('- hover: `a.btn`: transform none → translateY(-2px), 200ms ease-out');
    expect(md).toContain('Next.js 15.0.0');
    expect(md).toContain('![Pointer stroke, frame by frame (cursor drawn in)](motion/01-hero-pointer-strip.png)');
    expect(md).toContain('- Pointer stroke clip: [motion/01-hero-pointer.mp4](motion/01-hero-pointer.mp4)');
    expect(md).toContain('Claude Code, Codex, Cursor');
  });
});
