/**
 * Framer code component for one captured section: the section's own HTML rendered exactly, and,
 * where the page drew it with a WebGL shader, that shader running live inside it and following the
 * pointer. Effects that can't run outside the site (WebGPU pipelines, effects built in JavaScript)
 * come as the recorded clip, behind a property.
 */

export interface FramerShader {
  vertex: string;
  fragment: string;
  /** Last values the page set, for uniforms the runner can't derive (colours, strengths). */
  uniforms: { name: string; value: unknown }[];
  /** The canvas box relative to the section, in CSS px. */
  rect: { x: number; y: number; width: number; height: number };
}

export interface FramerComponentInput {
  /** Component name: letters and digits, starting with a capital. */
  name: string;
  source: string;
  width: number;
  height: number;
  /** The section's self-contained HTML document. */
  html: string;
  shader: FramerShader | null;
  /** Data URL of the recorded clip, shown when "Recorded motion" is on. */
  clip: string | null;
}

/** Valid component name from a section name ("02 · Own your value" → "OwnYourValue"). */
export function framerName(name: string): string {
  const words = name.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const joined = words.map((w) => w[0].toUpperCase() + w.slice(1)).join('').slice(0, 48);
  return /^[A-Z]/.test(joined) ? joined : `Section${joined}`;
}

/**
 * Runs inside the section's iframe: finds the canvas snapshot (an <img>) at `rect`, swaps in a live
 * canvas and draws `fragment` over a full-screen quad. Pointer, time and resolution uniforms are fed
 * live; other uniforms keep the values the page set. Leaves the snapshot when anything fails.
 */
export function shaderRunnerScript(shader: FramerShader): string {
  return `(() => {
  const S = ${JSON.stringify(shader).replace(/</g, '\\u003c')};
  const near = (a, b) => Math.abs(a - b) <= 3;
  const run = () => {
    const target = Array.from(document.querySelectorAll('img, canvas')).find((el) => {
      const r = el.getBoundingClientRect();
      return near(r.left + scrollX, S.rect.x) && near(r.top + scrollY, S.rect.y) && near(r.width, S.rect.width) && near(r.height, S.rect.height);
    });
    if (!target) return false;
    const canvas = document.createElement('canvas');
    canvas.className = target.className;
    canvas.setAttribute('style', target.getAttribute('style') || '');
    canvas.setAttribute('data-specimen-live', '');
    const gl = canvas.getContext('webgl');
    if (!gl) return true;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'compile');
      return s;
    };
    const program = gl.createProgram();
    try {
      gl.attachShader(program, compile(gl.VERTEX_SHADER, S.vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, S.fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) {
      return true;
    }
    target.replaceWith(canvas);
    gl.useProgram(program);
    // A full-screen quad on the vertex shader's first attribute.
    const attrib = gl.getActiveAttrib(program, 0);
    if (attrib) {
      const loc = gl.getAttribLocation(program, attrib.name);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    const captured = new Map(S.uniforms.map((u) => [u.name, u.value]));
    const active = [];
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
      const u = gl.getActiveUniform(program, i);
      active.push({ name: u.name.replace(/\\[0\\]$/, ''), type: u.type, loc: gl.getUniformLocation(program, u.name) });
    }
    let pointer = [-10000, -10000];
    addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      pointer = [(e.clientX - r.left) * (canvas.width / r.width), (r.bottom - e.clientY) * (canvas.height / r.height)];
    });
    const set = (u, v) => {
      const a = Array.isArray(v) ? v : [v];
      if (u.type === gl.FLOAT) gl.uniform1f(u.loc, a[0]);
      else if (u.type === gl.FLOAT_VEC2) gl.uniform2fv(u.loc, a.slice(0, 2));
      else if (u.type === gl.FLOAT_VEC3) gl.uniform3fv(u.loc, a.slice(0, 3));
      else if (u.type === gl.FLOAT_VEC4) gl.uniform4fv(u.loc, a.slice(0, 4));
      else if (u.type === gl.FLOAT_MAT4 && a.length >= 16) gl.uniformMatrix4fv(u.loc, false, a.slice(0, 16));
      else if (u.type === gl.INT || u.type === gl.BOOL) gl.uniform1i(u.loc, a[0]);
    };
    const start = performance.now();
    const frame = (now) => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      for (const u of active) {
        if (/mouse|pointer|cursor/i.test(u.name) && u.type === gl.FLOAT_VEC2) set(u, pointer);
        else if (/time/i.test(u.name) && u.type === gl.FLOAT) set(u, (now - start) / 1000);
        else if (/res|size|viewport/i.test(u.name) && u.type === gl.FLOAT_VEC2) set(u, [canvas.width, canvas.height]);
        else if (captured.has(u.name)) set(u, captured.get(u.name));
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return true;
  };
  // Retry until the snapshot is laid out (big inline images can delay it), for up to 5s.
  let tries = 0;
  const attempt = () => {
    if (!run() && ++tries < 50) setTimeout(attempt, 100);
  };
  attempt();
})();`
}

/** CSP for the component's iframe: the section's own, plus the inline runner script. */
const FRAMER_CSP =
  "default-src 'none'; img-src * data: blob:; media-src * data: blob:; font-src * data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

/** The section HTML with the runner added and the CSP opened for it. */
export function framerHtml(html: string, shader: FramerShader | null): string {
  const csp = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, `<meta http-equiv="Content-Security-Policy" content="${FRAMER_CSP}">`);
  if (!shader) return csp;
  // `</` inside the script would end it early; the runner never contains it, and JSON escapes `<`.
  return csp.replace(/<\/body>/i, `<script>${shaderRunnerScript(shader)}</script></body>`);
}

/** The Framer code component as TSX, to paste into a new code file in Framer. */
export function toFramerComponent(input: FramerComponentInput): string {
  const { name, width, height } = input;
  const html = framerHtml(input.html, input.shader);
  return `// Generated by Specimen from ${input.source.replace(/\s+/g, ' ')}
// In Framer: Assets ▸ Code ▸ New file, paste this, then drag ${name} onto the canvas.
// The section renders exactly as captured.${input.shader ? ' Its WebGL shader runs live and follows the pointer.' : ''}${input.clip ? ' Turn on "Recorded motion" to play the effect as it was captured.' : ''}
import { addPropertyControls, ControlType } from "framer";
import { useEffect, useRef, useState } from "react";

const HTML = ${JSON.stringify(html)};
const CLIP = ${input.clip ? JSON.stringify(input.clip) : 'null'};
const WIDTH = ${Math.round(width)};
const HEIGHT = ${Math.round(height)};

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth ${Math.round(width)}
 * @framerIntrinsicHeight ${Math.round(height)}
 */
export default function ${name}({ recordedMotion, style }) {
  const box = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / WIDTH || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} style={{ ...style, position: "relative", overflow: "hidden", aspectRatio: \`\${WIDTH} / \${HEIGHT}\` }}>
      <iframe
        title="${name}"
        srcDoc={HTML}
        sandbox="allow-scripts"
        style={{ border: 0, width: WIDTH, height: HEIGHT, transform: \`scale(\${scale})\`, transformOrigin: "0 0", display: "block" }}
      />
      {recordedMotion && CLIP && (
        <video src={CLIP} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      )}
    </div>
  );
}

addPropertyControls(${name}, {
  recordedMotion: { type: ControlType.Boolean, title: "Recorded motion", defaultValue: false },
});
`;
}
