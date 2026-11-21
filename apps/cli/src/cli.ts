#!/usr/bin/env node
/**
 * Specimen from the command line: batch captures with the real extension, capture diffs and full
 * media downloads. Run with Node 23+ (TypeScript is run directly): `node apps/cli/src/cli.ts help`.
 */
import { chromium } from '@playwright/test';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { captureUrl, launch } from './capture.ts';
import { checkBundle } from './check.ts';
import { diffBundles, diffHtml } from './diff.ts';
import { downloadMedia } from './media.ts';

const DEFAULT_EXTENSION = resolve(dirname(new URL(import.meta.url).pathname), '../../extension/.output/chrome-mv3');

const HELP = `Specimen CLI

  specimen capture <url...> [--urls file] [--out dir] [--concurrency n] [--headed] [--no-motion] [--extension dir]
      Capture pages with the Specimen extension (Capture everything) and save the .specimen.zip bundles.

  specimen diff <before.zip> <after.zip> [--out dir]
      Compare two captures: sections, screenshots (pixel diff), colours, variables, tech stack, motion.

  specimen check <bundle.zip...>
      Report a capture's errors, sections, stack and motion, and how closely each SVG export matches
      the section's screenshot.

  specimen media <bundle.zip> [--out dir]
      Download the original videos a capture references; HLS/DASH streams need ffmpeg.

Build the extension first: pnpm build. Install the browser once: npx playwright install chromium.
`;

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string', short: 'o' },
      urls: { type: 'string' },
      concurrency: { type: 'string', default: '1' },
      headed: { type: 'boolean', default: false },
      'no-motion': { type: 'boolean', default: false },
      extension: { type: 'string', default: DEFAULT_EXTENSION },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const [command, ...args] = positionals;
  if (!command || values.help || command === 'help') return console.log(HELP);

  if (command === 'capture') {
    const urls = [...args, ...(values.urls ? (await readFile(values.urls, 'utf8')).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [])];
    if (!urls.length) throw new Error('Give at least one URL, or --urls with a file of URLs.');
    const out = resolve(values.out ?? 'captures');
    await mkdir(out, { recursive: true });
    const workers = Math.max(1, Math.min(Number(values.concurrency) || 1, urls.length));
    const queue = [...urls];
    let failed = 0;
    // One browser per worker: each capture drives its own tab and debugger connection.
    await Promise.all(
      Array.from({ length: workers }, async () => {
        const { context, extensionId } = await launch({ extensionDir: values.extension!, headed: values.headed });
        try {
          for (let url = queue.shift(); url; url = queue.shift()) {
            const started = Date.now();
            try {
              const { filename, zip } = await captureUrl(context, extensionId, url, {
                extensionDir: values.extension!,
                motion: !values['no-motion'],
                onProgress: (u, step) => process.stderr.write(`\r\x1b[K${u}: ${step}`),
              });
              const path = await freePath(join(out, filename));
              await writeFile(path, zip);
              process.stderr.write('\r\x1b[K');
              console.log(`${url} → ${path} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
            } catch (err) {
              failed++;
              process.stderr.write('\r\x1b[K');
              console.error(`${url} failed: ${err instanceof Error ? err.message : err}`);
            }
          }
        } finally {
          await context.close();
        }
      }),
    );
    process.exitCode = failed ? 1 : 0;
    return;
  }

  if (command === 'diff') {
    if (args.length !== 2) throw new Error('Usage: specimen diff <before.zip> <after.zip>');
    const [a, b] = await Promise.all(args.map((p) => readFile(p)));
    const out = resolve(values.out ?? 'specimen-diff');
    const browser = await chromium.launch({ channel: 'chromium' });
    try {
      const { report, images } = await diffBundles(new Uint8Array(a), new Uint8Array(b), await browser.newPage());
      await mkdir(join(out, 'diff'), { recursive: true });
      for (const [path, data] of Object.entries(images)) await writeFile(join(out, path), data);
      await writeFile(join(out, 'diff.json'), JSON.stringify(report, null, 2));
      await writeFile(join(out, 'index.html'), diffHtml(report));
      const changed = report.sections.filter((s) => s.status !== 'same');
      console.log(`${changed.length} of ${report.sections.length} sections differ · colours +${report.colors.added.length} −${report.colors.removed.length} · ${join(out, 'index.html')}`);
    } finally {
      await browser.close();
    }
    return;
  }

  if (command === 'check') {
    if (!args.length) throw new Error('Usage: specimen check <bundle.zip...>');
    const browser = await chromium.launch({ channel: 'chromium' });
    try {
      for (const file of args) {
        const r = await checkBundle(new Uint8Array(await readFile(file)), browser);
        console.log(`\n${r.url}`);
        console.log(`  errors: ${r.errors.length ? r.errors.join(' | ') : 'none'}`);
        console.log(`  stack: ${r.stack.join(', ') || 'none detected'}`);
        if (r.motion) console.log(`  motion: ${Object.entries(r.motion).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
        console.log(`  exports: ${Object.entries(r.exports).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
        for (const s of r.sections) console.log(`  ${s.svgMatch === null ? '   –' : `${Math.round(s.svgMatch * 100).toString().padStart(3)}%`}  ${s.name}`);
      }
    } finally {
      await browser.close();
    }
    return;
  }

  if (command === 'media') {
    if (args.length !== 1) throw new Error('Usage: specimen media <bundle.zip>');
    const out = resolve(values.out ?? 'specimen-media');
    const results = await downloadMedia(new Uint8Array(await readFile(args[0])), out, (l) => console.log(l));
    for (const r of results) console.log(r.file ? `saved ${r.file}` : `skipped ${r.src}: ${r.skipped}`);
    if (!results.length) console.log('This capture references no videos.');
    return;
  }

  throw new Error(`Unknown command "${command}".\n\n${HELP}`);
}

/** `name.specimen.zip`, or `name-2.specimen.zip`… if taken: batch captures never overwrite each other. */
async function freePath(path: string): Promise<string> {
  const taken = (p: string) => access(p).then(() => true, () => false);
  if (!(await taken(path))) return path;
  for (let i = 2; ; i++) {
    const next = path.replace(/\.specimen\.zip$/, `-${i}.specimen.zip`);
    if (!(await taken(next))) return next;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
