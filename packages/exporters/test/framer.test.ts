import { describe, expect, it } from 'vitest';
import { framerHtml, framerName, toFramerComponent } from '../src';

const html = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"></head><body><img class="a" src="data:,"></body></html>';
const shader = { vertex: 'attribute vec2 p; void main(){gl_Position=vec4(p,0,1);}', fragment: 'precision mediump float; uniform vec2 uMouse; void main(){gl_FragColor=vec4(1);}', uniforms: [{ name: 'uTint', value: [1, 0, 0] }], rect: { x: 0, y: 0, width: 1440, height: 900 } };

describe('Framer component', () => {
  it('names components validly', () => {
    expect(framerName('02 · own your value')).toBe('Section02OwnYourValue');
    expect(framerName('Get started')).toBe('GetStarted');
  });

  it('adds the shader runner and opens the CSP only for inline scripts', () => {
    const out = framerHtml(html, shader);
    expect(out).toContain("script-src 'unsafe-inline'");
    expect(out).toContain('uniform vec2 uMouse;');
    expect(out).toMatch(/<script>\(\(\) => \{[\s\S]*<\/script><\/body>/);
    expect(framerHtml(html, null)).not.toContain('<script>');
  });

  it('writes a Framer code component with intrinsic size and a recorded-motion control', () => {
    const tsx = toFramerComponent({ name: 'Hero', source: 'https://example.com/', width: 1440, height: 900, html, shader: null, clip: 'data:video/mp4;base64,AA' });
    expect(tsx).toContain('export default function Hero(');
    expect(tsx).toContain('@framerIntrinsicWidth 1440');
    expect(tsx).toContain('addPropertyControls(Hero');
    expect(tsx).toContain('title: "Recorded motion"');
    expect(tsx).toContain('const CLIP = "data:video/mp4;base64,AA"');
  });
});
