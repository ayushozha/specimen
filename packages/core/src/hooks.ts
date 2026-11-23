/**
 * Instrumentation installed in the page's own JS world before any page script runs ("deep mode").
 * It records which elements react to the pointer and which are watched for scrolling into view,
 * without changing behaviour. Both functions are serialised and must stay self-contained.
 */

export interface HookReport {
  /** Elements with pointer listeners (hover effects driven by JavaScript). */
  pointerTargets: string[];
  /** True when window/document listen to pointer movement (cursor followers, parallax, magnets). */
  globalPointer: boolean;
  /** Elements passed to IntersectionObserver.observe (scroll reveals). */
  observed: string[];
  /** requestAnimationFrame calls per second while the page was idle (JS animation loops). */
  rafPerSecond: number;
}

/** Runs at document start in the MAIN world. */
export function installHooks(): void {
  const KEY = '__specimenHooks';
  const w = window as unknown as Record<string, unknown>;
  if (w[KEY]) return;
  const POINTER = new Set(['mouseenter', 'mouseover', 'mouseleave', 'mouseout', 'mousemove', 'pointerenter', 'pointerover', 'pointerleave', 'pointermove']);
  const pointerTargets = new Set<EventTarget>();
  const observed = new Set<Element>();
  let globalPointer = false;
  let rafCalls = 0;
  const started = performance.now();

  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: unknown[]) {
    if (POINTER.has(type)) {
      if (this === window || this === document || this === document.documentElement || this === document.body) {
        if (type === 'mousemove' || type === 'pointermove') globalPointer = true;
      } else pointerTargets.add(this);
    }
    return (add as (...a: unknown[]) => void).call(this, type, ...rest);
  } as typeof add;

  const observe = IntersectionObserver.prototype.observe;
  IntersectionObserver.prototype.observe = function (this: IntersectionObserver, target: Element) {
    observed.add(target);
    return observe.call(this, target);
  };

  // Timers and frames go through a gate so a capture can stop the page's clock for a moment, including
  // intervals started long before (see freezePageScripts). Frames and timeouts wait; interval ticks
  // are skipped, as if no time passed.
  let frozen = false;
  const waiting: (() => void)[] = [];
  const gate = (cb: (...a: unknown[]) => unknown, skip: boolean) =>
    function (this: unknown, ...args: unknown[]) {
      if (!frozen) return cb.apply(this, args);
      if (!skip) waiting.push(() => cb.apply(this, args));
    };
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb: FrameRequestCallback) {
    rafCalls++;
    return raf.call(window, gate(cb as never, false) as FrameRequestCallback);
  };
  const st = window.setTimeout;
  window.setTimeout = function (cb: unknown, ...rest: unknown[]) {
    return (st as (...a: unknown[]) => number).call(window, typeof cb === 'function' ? gate(cb as never, false) : cb, ...rest);
  } as typeof setTimeout;
  const si = window.setInterval;
  window.setInterval = function (cb: unknown, ...rest: unknown[]) {
    return (si as (...a: unknown[]) => number).call(window, typeof cb === 'function' ? gate(cb as never, true) : cb, ...rest);
  } as typeof setInterval;
  const setFrozen = (on: boolean) => {
    frozen = on;
    if (!on) waiting.splice(0).forEach((run) => raf.call(window, () => run()));
  };

  // Shaders: the code that draws canvas effects (WebGL GLSL, WebGPU WGSL), recorded as the page
  // compiles it, with the canvas it draws into and the last value of each WebGL uniform. Canvases
  // are tagged with data-specimen-gl so the capture can tell which section each shader belongs to.
  const MAX_SHADERS = 60;
  const MAX_SOURCE = 200_000;
  const MAX_UNIFORMS = 200;
  const shaders: { api: 'webgl' | 'webgpu'; stage: string; source: string; canvas: number | null; module: object | null }[] = [];
  const seen = new Set<string>();
  // Ids live here, not in the DOM: draw loops look them up every frame. The DOM tag is only written
  // when the capture reads the report (and removed right after), so the page's HTML stays its own.
  const canvasIds = new WeakMap<HTMLCanvasElement, number>();
  const canvases: HTMLCanvasElement[] = [];
  const canvasId = (c: unknown): number | null => {
    if (typeof HTMLCanvasElement === 'undefined' || !(c instanceof HTMLCanvasElement)) return null;
    let id = canvasIds.get(c);
    if (id === undefined) {
      id = canvases.push(c);
      canvasIds.set(c, id);
    }
    return id;
  };
  const keep = (api: 'webgl' | 'webgpu', stage: string, source: unknown, canvas: number | null, module: object | null = null) => {
    if (typeof source !== 'string' || shaders.length >= MAX_SHADERS || seen.has(source)) return;
    seen.add(source);
    shaders.push({ api, stage, source: source.slice(0, MAX_SOURCE), canvas, module });
  };
  const uniforms = new Map<number, Map<string, { value: unknown; updates: number }>>();
  const wrap = (proto: object, name: string, after: (self: unknown, args: unknown[], result: unknown) => void) => {
    const original = (proto as Record<string, unknown>)[name];
    if (typeof original !== 'function') return;
    (proto as Record<string, unknown>)[name] = function (this: unknown, ...args: unknown[]) {
      const result = (original as (...a: unknown[]) => unknown).apply(this, args);
      try {
        after(this, args, result);
      } catch {
        // Recording never breaks the page.
      }
      return result;
    };
  };
  const shaderStage = new WeakMap<object, number>();
  const locationName = new WeakMap<object, string>();
  for (const ctor of [w.WebGLRenderingContext, w.WebGL2RenderingContext]) {
    if (typeof ctor !== 'function') continue;
    const proto = (ctor as { prototype: object }).prototype;
    wrap(proto, 'createShader', (_self, [type], shader) => shader && shaderStage.set(shader as object, type as number));
    wrap(proto, 'shaderSource', (self, [shader, source]) => {
      const type = shaderStage.get(shader as object);
      keep('webgl', type === 0x8b31 ? 'vertex' : type === 0x8b30 ? 'fragment' : 'shader', source, canvasId((self as { canvas: unknown }).canvas));
    });
    wrap(proto, 'getUniformLocation', (_self, [, name], location) => location && locationName.set(location as object, String(name)));
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (!/^uniform(Matrix)?[1-4]/.test(name)) continue;
      wrap(proto, name, (self, [location, ...values]) => {
        const uniform = location ? locationName.get(location as object) : undefined;
        const id = canvasId((self as { canvas: unknown }).canvas);
        if (!uniform || id === null) return;
        const map = uniforms.get(id) ?? new Map();
        uniforms.set(id, map);
        if (!map.has(uniform) && map.size >= MAX_UNIFORMS) return;
        const last = values[values.length - 1];
        const value = ArrayBuffer.isView(last) ? Array.from(last as unknown as ArrayLike<number>).slice(0, 16) : values.length === 1 ? values[0] : values;
        map.set(uniform, { value, updates: (map.get(uniform)?.updates ?? 0) + 1 });
      });
    }
  }
  // WebGPU: one device can draw several canvases (a shared renderer), and one command encoder can
  // draw several in a row. A module is matched by order: passes that draw into offscreen textures
  // (simulation steps) belong to the next pass in the same encoder that draws into a canvas, and a
  // pass that draws into a canvas texture belongs to that canvas. Counted over frames; most wins.
  const textureCanvas = new WeakMap<object, number>();
  const viewCanvas = new WeakMap<object, number>();
  const pipelineModules = new WeakMap<object, object[]>();
  const passInfo = new WeakMap<object, { encoder: object; canvas: number | null }>();
  const pending = new WeakMap<object, { modules: Set<object>; last: number | null }>();
  const moduleCanvas = new WeakMap<object, Map<number, number>>();
  const credit = (modules: Iterable<object>, canvas: number) => {
    for (const module of modules) {
      const counts = moduleCanvas.get(module) ?? new Map<number, number>();
      counts.set(canvas, (counts.get(canvas) ?? 0) + 1);
      moduleCanvas.set(module, counts);
    }
  };
  const proto = (name: string) => (typeof w[name] === 'function' ? (w[name] as { prototype: object }).prototype : null);
  const gpuDevice = proto('GPUDevice');
  if (gpuDevice) {
    wrap(gpuDevice, 'createShaderModule', (_self, [descriptor], module) => keep('webgpu', 'wgsl', (descriptor as { code?: unknown })?.code, null, module as object));
    const modulesOf = (d: Record<string, { module?: object } | undefined>) => ['vertex', 'fragment', 'compute'].flatMap((k) => (d?.[k]?.module ? [d[k]!.module!] : []));
    for (const name of ['createRenderPipeline', 'createComputePipeline']) {
      wrap(gpuDevice, name, (_self, [d], pipeline) => pipeline && pipelineModules.set(pipeline as object, modulesOf(d as never)));
    }
    for (const name of ['createRenderPipelineAsync', 'createComputePipelineAsync']) {
      wrap(gpuDevice, name, (_self, [d], promise) => (promise as Promise<object>).then((pipeline) => pipelineModules.set(pipeline, modulesOf(d as never)), () => {}));
    }
  }
  const gpuContext = proto('GPUCanvasContext');
  if (gpuContext) wrap(gpuContext, 'getCurrentTexture', (self, _args, texture) => {
    const id = canvasId((self as { canvas: unknown }).canvas);
    if (texture && id !== null) textureCanvas.set(texture as object, id);
  });
  const gpuTexture = proto('GPUTexture');
  if (gpuTexture) wrap(gpuTexture, 'createView', (self, _args, view) => {
    const id = textureCanvas.get(self as object);
    if (view && id !== undefined) viewCanvas.set(view as object, id);
  });
  const gpuEncoder = proto('GPUCommandEncoder');
  if (gpuEncoder) {
    wrap(gpuEncoder, 'beginRenderPass', (self, [d], pass) => {
      const views = ((d as { colorAttachments?: ({ view?: object } | null)[] })?.colorAttachments ?? []).map((a) => (a?.view ? viewCanvas.get(a.view) : undefined));
      passInfo.set(pass as object, { encoder: self as object, canvas: views.find((id) => id !== undefined) ?? null });
    });
    wrap(gpuEncoder, 'beginComputePass', (self, _args, pass) => passInfo.set(pass as object, { encoder: self as object, canvas: null }));
    // Steps after the last canvas pass of an encoder go with that canvas.
    wrap(gpuEncoder, 'finish', (self) => {
      const p = pending.get(self as object);
      if (p?.modules.size && p.last !== null) credit(p.modules, p.last);
      pending.delete(self as object);
    });
  }
  for (const name of ['GPURenderPassEncoder', 'GPUComputePassEncoder']) {
    const p = proto(name);
    if (p) wrap(p, 'setPipeline', (self, [pipeline]) => {
      const info = passInfo.get(self as object);
      const modules = pipelineModules.get(pipeline as object);
      if (!info || !modules) return;
      const state = pending.get(info.encoder) ?? { modules: new Set<object>(), last: null };
      pending.set(info.encoder, state);
      if (info.canvas === null) {
        modules.forEach((m) => state.modules.add(m));
        return;
      }
      credit([...state.modules, ...modules], info.canvas);
      state.modules.clear();
      state.last = info.canvas;
    });
  }
  const canvasOfModule = (module: object | null): number | null => {
    const counts = module ? moduleCanvas.get(module) : undefined;
    if (!counts?.size) return null;
    return [...counts].sort((a, b) => b[1] - a[1])[0][0];
  };
  const shaderReport = () => {
    canvases.forEach((c, i) => c.setAttribute('data-specimen-gl', String(i + 1)));
    return reportOf();
  };
  const reportOf = () => ({
    shaders: shaders.map(({ module, ...s }) => ({ ...s, canvas: s.canvas ?? canvasOfModule(module) })),
    uniforms: Array.from(uniforms, ([canvas, map]) => ({ canvas, values: Array.from(map, ([name, u]) => ({ name, value: u.value, updates: u.updates })) })),
  });

  Object.defineProperty(w, KEY, {
    configurable: false,
    enumerable: false,
    value: { pointerTargets, observed, getGlobalPointer: () => globalPointer, rafStats: () => ({ rafCalls, started }), setFrozen, shaderReport },
  });
}

export interface CapturedShader {
  api: 'webgl' | 'webgpu';
  /** vertex, fragment (WebGL) or wgsl (WebGPU: one module can hold several stages). */
  stage: string;
  source: string;
  /** data-specimen-gl number of the canvas it draws into; null when unknown (OffscreenCanvas, unconfigured device). */
  canvas: number | null;
}

export interface ShaderReport {
  shaders: CapturedShader[];
  /** Last value of each WebGL uniform per canvas, and how often the page set it (often = animated or driven by input). */
  uniforms: { canvas: number; values: { name: string; value: unknown; updates: number }[] }[];
}

/** Reads the shaders the hooks recorded. MAIN world, self-contained. */
export function readShaders(): ShaderReport {
  const hooks = (window as unknown as Record<string, unknown>).__specimenHooks as { shaderReport?: () => ShaderReport } | undefined;
  return hooks?.shaderReport?.() ?? { shaders: [], uniforms: [] };
}

/** Reads what the hooks recorded. MAIN world, self-contained. */
export function readHooks(): HookReport {
  const hooks = (window as unknown as Record<string, unknown>).__specimenHooks as
    | { pointerTargets: Set<EventTarget>; observed: Set<Element>; getGlobalPointer(): boolean; rafStats(): { rafCalls: number; started: number } }
    | undefined;
  const empty: HookReport = { pointerTargets: [], globalPointer: false, observed: [], rafPerSecond: 0 };
  if (!hooks) return empty;

  const selectorOf = (el: Element): string => {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node !== document.documentElement) {
      const current: Element = node;
      if (current.id && document.querySelectorAll(`#${CSS.escape(current.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      const parent: Element | null = current.parentElement;
      const tag = current.tagName.toLowerCase();
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const same = Array.from(parent.children).filter((c) => c.tagName === current.tagName);
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(current) + 1})` : tag);
      node = parent;
    }
    return parts.join(' > ');
  };
  const live = (targets: Iterable<EventTarget>) =>
    Array.from(targets)
      .filter((t): t is Element => t instanceof Element && t.isConnected)
      .slice(0, 300)
      .map(selectorOf);

  const { rafCalls, started } = hooks.rafStats();
  return {
    pointerTargets: live(hooks.pointerTargets),
    globalPointer: hooks.getGlobalPointer(),
    observed: live(hooks.observed),
    rafPerSecond: Math.round((rafCalls / Math.max(1, performance.now() - started)) * 1000),
  };
}

/** Removes the data-specimen-gl tags from canvases, so the captured HTML is the page's own. */
export function clearShaderTags(): void {
  for (const el of Array.from(document.querySelectorAll('[data-specimen-gl]'))) el.removeAttribute('data-specimen-gl');
}
