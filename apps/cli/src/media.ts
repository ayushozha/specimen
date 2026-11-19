import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

export interface MediaResult {
  src: string;
  file: string | null;
  skipped: string | null;
}

/**
 * Downloads the original videos a bundle references (full files, not the screenshots' frames).
 * HLS/DASH streams go through ffmpeg when it is installed; blob: sources (Media Source Extensions)
 * can't be fetched from outside the page and are reported as skipped.
 */
export async function downloadMedia(bundle: Uint8Array, outDir: string, log: (line: string) => void = () => {}): Promise<MediaResult[]> {
  const files = unzipSync(bundle);
  const media = files['design/media-colors.json'] ? (JSON.parse(strFromU8(files['design/media-colors.json'])) as { kind: string; src: string | null }[]) : [];
  const sources = [...new Set(media.filter((m) => m.kind === 'video' && m.src).map((m) => m.src!))];
  await mkdir(outDir, { recursive: true });
  const results: MediaResult[] = [];
  for (const [i, src] of sources.entries()) {
    const name = `video-${i + 1}`;
    // Sources come from the captured page: only plain web URLs, never local files or other protocols.
    if (!/^https?:\/\//i.test(src)) {
      results.push({ src, file: null, skipped: src.startsWith('blob:') ? 'Streamed through Media Source Extensions; only the page can read it. The bundle has the recorded video instead.' : 'Not an http(s) URL.' });
      continue;
    }
    if (src.startsWith('blob:')) {
      results.push({ src, file: null, skipped: 'Streamed through Media Source Extensions; only the page can read it. The bundle has the recorded video instead.' });
      continue;
    }
    try {
      if (/\.(m3u8|mpd)(\?|$)/i.test(src)) {
        const file = join(outDir, `${name}.mp4`);
        log(`ffmpeg ${src}`);
        // Streams may only pull from the network: no file:, concat: or other ffmpeg protocols.
        await run('ffmpeg', ['-y', '-loglevel', 'error', '-protocol_whitelist', 'http,https,tls,tcp,crypto', '-i', src, '-c', 'copy', file]);
        results.push({ src, file, skipped: null });
      } else {
        log(`download ${src}`);
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ext = (new URL(src).pathname.match(/\.([a-z0-9]{2,4})$/i)?.[1] ?? 'mp4').toLowerCase();
        const file = join(outDir, `${name}.${ext}`);
        await writeFile(file, new Uint8Array(await res.arrayBuffer()));
        results.push({ src, file, skipped: null });
      }
    } catch (err) {
      results.push({ src, file: null, skipped: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => reject(new Error(`${cmd} isn't available: ${e.message}`)));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `${cmd} exited with ${code}`))));
  });
}
