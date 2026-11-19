import type { FigmaDocument } from '@specimen/exporters';
import { strFromU8, unzipSync } from 'fflate';

const status = document.getElementById('status')!;

document.getElementById('file')!.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  status.textContent = 'Reading capture…';
  try {
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const raw = zip['exports/figma.json'];
    if (!raw) throw new Error('No exports/figma.json in this zip. Capture the page again with the latest Specimen.');
    const doc = JSON.parse(strFromU8(raw)) as FigmaDocument;
    // Send only the images the document uses.
    const wanted = new Set<string>(Object.values(doc.assets));
    for (const s of doc.sections) {
      wanted.add(s.screenshot);
      for (const v of s.variants) wanted.add(v.defaultImage).add(v.hoverImage);
    }
    const files: Record<string, Uint8Array> = {};
    for (const path of wanted) if (zip[path]) files[path] = zip[path];
    parent.postMessage({ pluginMessage: { type: 'import', doc, files } }, '*');
  } catch (err) {
    status.textContent = err instanceof Error ? err.message : String(err);
  }
});

window.onmessage = (e: MessageEvent) => {
  const msg = e.data.pluginMessage as { type: string; text: string } | undefined;
  if (msg) status.textContent = msg.text;
};
