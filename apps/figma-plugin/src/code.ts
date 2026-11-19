import type { FigmaDocument } from '@specimen/exporters';
import { importDocument } from './importer';

figma.showUI(__html__, { width: 300, height: 150, themeColors: true });

figma.ui.onmessage = async (msg: { type: 'import'; doc: FigmaDocument; files: Record<string, Uint8Array> }) => {
  if (msg.type !== 'import') return;
  try {
    const roots = await importDocument(figma, msg.doc, msg.files, (text) => figma.ui.postMessage({ type: 'progress', text }));
    figma.notify(`Imported ${roots.length} sections from ${msg.doc.source.title || msg.doc.source.url}`);
    figma.closePlugin();
  } catch (err) {
    figma.ui.postMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
  }
};
