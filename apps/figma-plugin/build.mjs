// Bundles the plugin: code.js runs in Figma's sandbox, ui.html is the import panel with its script inlined.
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/code.ts'], bundle: true, outfile: 'dist/code.js', format: 'iife', target: 'es2017', logLevel: 'warning' });
const ui = await build({ entryPoints: ['src/ui.ts'], bundle: true, write: false, format: 'iife', target: 'es2020', minify: true, logLevel: 'warning' });
const script = ui.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await writeFile(
  'dist/ui.html',
  `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;font:12px/1.5 Inter,system-ui,sans-serif;color:#0a0a0a;background:#fff}
@media (prefers-color-scheme:dark){body{color:#ededed;background:#0a0a0a}}
label{display:block;border:1px dashed #d4d4d4;border-radius:8px;padding:18px;text-align:center;cursor:pointer}
label.over{border-color:currentColor;border-style:solid}
input{display:none}#status{margin-top:10px;color:#737373;min-height:18px}
</style>
<label id="drop">Drop the Specimen plugin file here<br><span style="opacity:.6">or click to choose a .figma.zip</span><input id="file" type="file" accept=".zip"></label>
<div id="status"></div>
<script>${script}</script>`,
);
console.log('built dist/code.js and dist/ui.html');
