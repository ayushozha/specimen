import { cubicBezierOf } from '@specimen/core';
import type { AnimationSpec, SpecKeyframe } from './spec';

export interface LottieImage {
  /** PNG data URL of the element at rest. */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * A Lottie (Bodymovin) animation of one element: the element as an image layer, with opacity,
 * position, scale and rotation keyframes and the original easing. Plays in lottie-web, After Effects
 * (via LottieFiles), Figma and Rive importers.
 */
export function toLottie(spec: AnimationSpec, image: LottieImage, fps = 30): Record<string, unknown> {
  const frames = Math.max(1, Math.round((spec.durationMs / 1000) * fps));
  const reach = (p: 'tx' | 'ty') => Math.max(0, ...(spec.tracks[p] ?? []).map((k) => Math.abs(k.value)));
  const maxScale = Math.max(1, ...(spec.tracks.scale ?? []).map((k) => k.value));
  const w = Math.ceil(image.width * maxScale + reach('tx') * 2);
  const h = Math.ceil(image.height * maxScale + reach('ty') * 2);
  const cx = w / 2;
  const cy = h / 2;

  const animated = (keys: SpecKeyframe[] | undefined, map: (v: number) => number[], fallback: number[]) => {
    if (!keys?.length) return { a: 0, k: fallback };
    return {
      a: 1,
      k: keys.map((k, i) => {
        const [x1, y1, x2, y2] = cubicBezierOf(k.easing);
        const frame = { t: Math.round(k.offset * frames), s: map(k.value) };
        return i < keys.length - 1 ? { ...frame, o: { x: [x1], y: [y1] }, i: { x: [x2], y: [y2] } } : frame;
      }),
    };
  };
  // Position needs both axes in each key: sample both tracks at the union of offsets.
  const offsets = [...new Set([...(spec.tracks.tx ?? []), ...(spec.tracks.ty ?? [])].map((k) => k.offset))].sort((a, b) => a - b);
  const at = (keys: SpecKeyframe[] | undefined, offset: number) => keys?.find((k) => k.offset === offset)?.value ?? keys?.[0]?.value ?? 0;
  const position = offsets.length
    ? animated(
        offsets.map((o) => ({ offset: o, value: 0, easing: (spec.tracks.tx ?? spec.tracks.ty)!.find((k) => k.offset === o)?.easing ?? 'linear' })),
        () => [0, 0, 0],
        [cx, cy, 0],
      )
    : { a: 0, k: [cx, cy, 0] };
  if (offsets.length) {
    (position.k as { s: number[] }[]).forEach((key, i) => {
      key.s = [cx + at(spec.tracks.tx, offsets[i]), cy + at(spec.tracks.ty, offsets[i]), 0];
    });
  }

  return {
    v: '5.12.0',
    nm: spec.name,
    fr: fps,
    ip: 0,
    op: frames,
    w,
    h,
    ddd: 0,
    assets: [{ id: 'image_0', w: image.width, h: image.height, u: '', p: image.dataUrl, e: 1 }],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 2,
        nm: spec.name,
        refId: 'image_0',
        sr: 1,
        ip: 0,
        op: frames,
        st: 0,
        bm: 0,
        ks: {
          o: animated(spec.tracks.opacity, (v) => [v * 100], [100]),
          r: animated(spec.tracks.rotate, (v) => [v], [0]),
          p: position,
          a: { a: 0, k: [image.width / 2, image.height / 2, 0] },
          s: animated(spec.tracks.scale, (v) => [v * 100, v * 100, 100], [100, 100, 100]),
        },
      },
    ],
  };
}
