import type { FigmaDocument } from '@specimen/exporters';
import { strFromU8, unzipSync } from 'fflate';

const status = document.getElementById('status')!;
const drop = document.getElementById('drop')!;

/** Reads a Specimen plugin file (.figma.zip) or a full bundle (.specimen.zip) and sends it to Figma. */
async function importFile(file: File): Promise<void> {
  status.textContent = 'Reading capture…';
  try {
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const raw = zip['exports/figma.json'];
    if (!raw) throw new Error('No exports/figma.json in this zip. In Specimen, use Figma ▸ Plugin file.');
    const doc = JSON.parse(strFromU8(raw)) as FigmaDocument;
    // Send only the images the document uses.
    const wanted = new Set<string>(Object.values(doc.assets));
    for (const s of doc.sections) {
      wanted.add(s.screenshot);
      if (s.background) wanted.add(s.background);
      for (const v of s.variants) wanted.add(v.defaultImage).add(v.hoverImage);
    for (const m of s.motion ?? []) wanted.add(typeof m === 'string' ? m : m.path);
    }
    const files: Record<string, Uint8Array> = {};
    for (const path of wanted) if (zip[path]) files[path] = zip[path];
    parent.postMessage({ pluginMessage: { type: 'import', doc, files } }, '*');
  } catch (err) {
    status.textContent = err instanceof Error ? err.message : String(err);
  }
}

document.getElementById('file')!.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void importFile(file);
});
for (const type of ['dragenter', 'dragover'] as const) {
  window.addEventListener(type, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
}
window.addEventListener('dragleave', () => drop.classList.remove('over'));
window.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const file = e.dataTransfer?.files[0];
  if (file) void importFile(file);
});

window.onmessage = (e: MessageEvent) => {
  const msg = e.data.pluginMessage as { type: string; text: string } | undefined;
  if (msg) status.textContent = msg.text;
};
