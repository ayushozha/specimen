import type { StackItem } from '@specimen/core';
import { useEffect, useMemo, useState } from 'react';
import type { CaptureResult } from '../../lib/capture';
import {
  agentSpec,
  baseName,
  capturedSections,
  copyHtml,
  copyImage,
  copySvg,
  downloadFile,
  figmaImportZip,
  sectionHtml,
  sectionSvg,
  stackedSvg,
  writeToFolder,
  type SpecPreview,
} from '../../lib/outputs';
import { zipSync } from 'fflate';
import { interactionFiles, type InteractionRecording } from '../../lib/interaction';

export interface CaptureItem {
  key: number;
  result: CaptureResult;
  stack: StackItem[];
}

export interface RecordingItem {
  key: number;
  recording: InteractionRecording;
}

/** Object URLs for PNG bytes, revoked when the component goes away. */
function useImageUrls(files: Record<string, Uint8Array>, paths: string[]): Record<string, string> {
  const urls = useMemo(() => Object.fromEntries(paths.map((p) => [p, URL.createObjectURL(new Blob([files[p] as BlobPart], { type: 'image/png' }))])), [files, paths.join('|')]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

export function CaptureCard({ item, onRemove, onError }: { item: CaptureItem; onRemove: () => void; onError: (message: string) => void }) {
  const { result } = item;
  const sections = useMemo(() => capturedSections(result), [result]);
  const [scope, setScope] = useState<string>(sections.length === 1 ? sections[0].id : 'all');
  const ids = scope === 'all' ? sections.map((s) => s.id) : [scope];
  const one = ids.length === 1 ? ids[0] : null;
  const thumbs = useImageUrls(result.files, sections.map((s) => s.shot));
  const [flash, setFlash] = useState<string | null>(null);
  const [spec, setSpec] = useState<{ preview: SpecPreview; highlight: string | null; markdown: string; files: Record<string, Uint8Array> } | null>(null);

  // The agent spec is built up front so its preview shows what you'll get.
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    setSpec(null);
    agentSpec(result, item.stack, ids)
      .then((s) => {
        if (!alive) return;
        const first = Object.keys(s.files).find((p) => p.startsWith('highlights/'));
        url = first ? URL.createObjectURL(new Blob([s.files[first] as BlobPart], { type: 'image/png' })) : null;
        setSpec({ preview: s.preview, highlight: url, markdown: s.markdown, files: s.files });
      })
      .catch((err) => onError(`Couldn't build the agent spec: ${err instanceof Error ? err.message : String(err)}`));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [result, scope]);

  const run = async (label: string, fn: () => Promise<unknown> | unknown) => {
    try {
      const out = await fn();
      setFlash(typeof out === 'string' ? out : label);
      setTimeout(() => setFlash(null), 2500);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const svg = () => (one ? sectionSvg(result, one) : stackedSvg(result, ids));
  const name = baseName(result, one ?? undefined);
  const host = result.filename.replace(/_.*$/, '');
  const m = result.manifest;
  const motion = m.motion;

  return (
    <article className="capture">
      <header className="capture-head">
        <div className="grow">
          <div className="name">{sections.length === 1 ? sections[0].name : host}</div>
          <div className="muted small">
            {sections.length} {sections.length === 1 ? 'section' : 'sections'} · {new Date(m.capturedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ·{' '}
            {motion ? `motion: ${motion.animations} animations, ${motion.interactions} hover` : 'no motion'}
            {m.errors.length ? ` · ${m.errors.length} steps failed` : ''}
          </div>
        </div>
        <button className="ghost small icon" onClick={onRemove} aria-label="Remove capture">
          ×
        </button>
      </header>

      <div className="thumbs" role="listbox" aria-label="Sections in this capture">
        {sections.length > 1 && (
          <button role="option" aria-selected={scope === 'all'} className={`thumb all ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')}>
            All {sections.length}
          </button>
        )}
        {sections.map((s) => (
          <button key={s.id} role="option" aria-selected={scope === s.id} className={`thumb ${scope === s.id ? 'on' : ''}`} onClick={() => setScope(s.id)} title={s.name}>
            <img src={thumbs[s.shot]} alt="" />
            <span className="small">{s.name}</span>
          </button>
        ))}
      </div>

      {flash && (
        <div className="flash small" role="status">
          {flash}
        </div>
      )}

      <h4>Design tools</h4>
      <ul className="list tools">
        <Tool name="Figma" hint="Paste as editable layers, or import with the Specimen plugin (auto layout, variables, hover variants)">
          <button className="small" onClick={() => run('Copied. Paste in Figma with ⌘V', async () => copySvg(svg() ?? fail()))}>
            Copy
          </button>
          <button className="small" onClick={() => run('Saved the plugin file', () => downloadFile(`${name}.figma.zip`, figmaImportZip(result, ids) ?? fail()))}>
            Plugin file
          </button>
        </Tool>
        <Tool name="Paper" hint="Paste HTML; Paper turns it into layers">
          <button className="small" onClick={() => run('Copied. Paste in Paper with ⌘V', async () => copyHtml(ids.map((id) => sectionHtml(result, id) ?? '').join('\n') || fail()))}>
            Copy
          </button>
        </Tool>
        <Tool name="Sketch · Penpot · Framer · Illustrator" hint="Self-contained SVG: images and fonts inside">
          <button className="small" onClick={() => run('Copied SVG. Paste with ⌘V', async () => copySvg(svg() ?? fail()))}>
            Copy SVG
          </button>
          <button className="small" onClick={() => run('Saved SVG', () => downloadFile(`${name}.svg`, svg() ?? fail()))}>
            .svg
          </button>
        </Tool>
        <Tool name="Photoshop" hint="Layered PSD: groups, background, editable text">
          <button
            className="small"
            onClick={() =>
              run('Saved PSD', () =>
                one
                  ? downloadFile(`${name}.psd`, result.files[`exports/psd/${one}.psd`] ?? fail())
                  : downloadFile(`${name}-psd.zip`, zipSync(Object.fromEntries(ids.filter((id) => result.files[`exports/psd/${id}.psd`]).map((id) => [`${id}.psd`, result.files[`exports/psd/${id}.psd`]])), { level: 0 })),
              )
            }
          >
            .psd
          </button>
        </Tool>
        <Tool name="Canva · Keynote · Slides · Notion" hint="Pixel-exact image of the section">
          <button
            className="small"
            onClick={() => run('Image copied. Paste with ⌘V', async () => copyImage(result.files[`sections/${one ?? ids[0]}/desktop.png`] ?? fail()))}
            title={one ? undefined : 'Copies the first section; pick one above for another'}
          >
            Copy image
          </button>
        </Tool>
        {motion && (
          <Tool name="After Effects · Lottie" hint="Recorded animations as an AE script and Lottie files">
            <button className="small" onClick={() => run('Saved AE script', () => downloadFile(`${host}.jsx`, result.files['exports/after-effects/specimen.jsx'] ?? fail()))}>
              .jsx
            </button>
            <button
              className="small"
              onClick={() =>
                run('Saved Lottie files', () => {
                  const lottie = Object.keys(result.files).filter((p) => p.startsWith('exports/lottie/') && ids.some((id) => p.includes(`/${id}-`)));
                  if (!lottie.length) fail('No animations in this selection');
                  downloadFile(`${name}-lottie.zip`, zipSync(Object.fromEntries(lottie.map((p) => [p.split('/').pop()!, result.files[p]]))));
                })
              }
            >
              Lottie
            </button>
          </Tool>
        )}
      </ul>

      <h4>Coding agents</h4>
      <div className="spec">
        {spec ? (
          <>
            {spec.highlight && <img className="spec-shot" src={spec.highlight} alt="Highlighted section preview" />}
            <div className="small">
              <strong>DESIGN.md</strong> for Claude Code, Codex, Cursor and other agents: exact colours, type scale, spacing, {spec.preview.sections}{' '}
              {spec.preview.sections === 1 ? 'section' : 'sections'} with {spec.preview.screenshots} screenshots, {spec.preview.highlights} numbered {spec.preview.highlights === 1 ? 'highlight' : 'highlights'}
              {spec.preview.motionCues ? `, ${spec.preview.motionCues} motion and hover cues` : motion ? ', no motion in this selection' : ' (motion not recorded)'}
              {spec.preview.videos ? `, ${spec.preview.videos} recordings` : ''}.
            </div>
            <div className="actions wrap">
              <button
                className="small"
                onClick={() =>
                  run('Saved', async () => {
                    const where = await writeToFolder(spec.files);
                    if (where) return `Saved to ${where}`;
                    downloadFile(`${name}-design-spec.zip`, zipSync(Object.fromEntries(Object.entries(spec.files).map(([p, d]) => [`design-spec/${p}`, d]))));
                    return 'Saved design-spec.zip';
                  })
                }
              >
                Save to folder
              </button>
              <button className="small" onClick={() => run('Copied. Paste into Claude, ChatGPT or Grok, and attach the screenshot', () => navigator.clipboard.writeText(spec.markdown))}>
                Copy prompt
              </button>
              {one && (
                <button className="small" onClick={() => run('Screenshot copied', () => copyImage(result.files[`sections/${one}/desktop.png`]))}>
                  Copy screenshot
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="muted small">Preparing the spec…</div>
        )}
      </div>

      <button className="link small" onClick={() => run('Saved the full bundle', () => downloadFile(result.filename, result.zip))}>
        Download everything (.zip)
      </button>
    </article>
  );
}

function Tool({ name, hint, children }: { name: string; hint: string; children: React.ReactNode }) {
  return (
    <li className="row tool">
      <div className="grow">
        <div className="name">{name}</div>
        <div className="muted small">{hint}</div>
      </div>
      <div className="actions">{children}</div>
    </li>
  );
}

function fail(message = 'This capture has no file for that export'): never {
  throw new Error(message);
}

const VIDEO = /\.(mp4|webm)$/;
/** Page-wide recordings shown under Motion, by bundle path without extension. */
const PAGE_CLIPS = [
  ['page/intro', 'Page load'],
  ['page/scroll-desktop', 'Scrolling the page'],
] as const;
const videoUrl = (bytes: Uint8Array, path: string) => URL.createObjectURL(new Blob([bytes as BlobPart], { type: path.endsWith('.mp4') ? 'video/mp4' : 'video/webm' }));

/**
 * What the capture recorded moving: pointer effects (filmstrip with the cursor drawn in, and the
 * clip), and the page-load and scroll recordings.
 */
export function MotionPreviews({ result, onError }: { result: CaptureResult; onError: (message: string) => void }) {
  const sections = useMemo(() => result.manifest.sections.filter((s) => result.files[`sections/${s.id}/pointer-strip.png`]), [result]);
  const strips = useImageUrls(result.files, sections.map((s) => `sections/${s.id}/pointer-strip.png`));
  const pageClips = useMemo(
    () =>
      PAGE_CLIPS.flatMap(([base, label]) => {
        const path = Object.keys(result.files).find((p) => p.startsWith(`${base}.`) && VIDEO.test(p));
        return path ? [{ label, path }] : [];
      }),
    [result],
  );
  const urls = useMemo(() => Object.fromEntries(pageClips.map((c) => [c.path, videoUrl(result.files[c.path], c.path)])), [pageClips, result]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const save = (filename: string, data: Uint8Array) => {
    try {
      downloadFile(filename, data);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <h3>Pointer effects</h3>
      {sections.length === 0 && (
        <p className="muted small">
          Specimen swept the pointer over each section and the page didn't visibly react. If it does react to the mouse (a trail, a follower, a tilt), record it with
          Record interaction below.
        </p>
      )}
      {sections.map((s) => {
        const clip = Object.keys(result.files).find((p) => p.startsWith(`sections/${s.id}/pointer.`) && VIDEO.test(p));
        const raw = result.files[`sections/${s.id}/pointer.json`];
        const info = raw ? (JSON.parse(new TextDecoder().decode(raw)) as { kind: string; fadeMs: number | null }) : null;
        return (
          <div key={s.id} className="spec">
            <div className="name small">{s.name}</div>
            <img className="spec-shot strip" src={strips[`sections/${s.id}/pointer-strip.png`]} alt="Pointer stroke, frame by frame" />
            <div className="small">
              {info?.kind === 'canvas' ? 'The pointer paints into a canvas' : info?.kind === 'pixels' ? 'The pointer changes the pixels under it' : 'Elements follow the pointer'}
              {info?.fadeMs != null ? `; the trail fades in about ${info.fadeMs}ms` : info && info.kind !== 'dom' ? '; the trail stays' : ''}. Included in DESIGN.md.
            </div>
            {clip && (
              <div className="actions">
                <button className="small" onClick={() => save(`${baseName(result, s.id)}-pointer.${clip.split('.').pop()}`, result.files[clip])}>
                  Clip with cursor
                </button>
              </div>
            )}
          </div>
        );
      })}
      {pageClips.length > 0 && <h3>Recordings</h3>}
      {pageClips.map((c) => (
        <figure key={c.path} className="clip">
          <video className="recording" src={urls[c.path]} controls muted loop playsInline />
          <figcaption className="muted small">{c.label}</figcaption>
        </figure>
      ))}
    </>
  );
}

export function RecordingCard({ item, onRemove, onError }: { item: RecordingItem; onRemove: () => void; onError: (message: string) => void }) {
  const r = item.recording;
  const [flash, setFlash] = useState<string | null>(null);
  const video = useMemo(() => (r.video ? URL.createObjectURL(new Blob([r.video.data as BlobPart], { type: r.video.ext === 'mp4' ? 'video/mp4' : 'video/webm' })) : null), [r]);
  useEffect(() => () => void (video && URL.revokeObjectURL(video)), [video]);
  const host = (() => {
    try {
      return new URL(r.url).hostname.replace(/^www\./, '');
    } catch {
      return 'page';
    }
  })();
  const stamp = r.at.replace(/[:.]/g, '-').slice(0, 19);
  const run = async (label: string, fn: () => Promise<unknown> | unknown) => {
    try {
      const out = await fn();
      setFlash(typeof out === 'string' ? out : label);
      setTimeout(() => setFlash(null), 2500);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      onError(err instanceof Error ? err.message : String(err));
    }
  };
  const files = () => interactionFiles(r);
  return (
    <article className="capture">
      <header className="capture-head">
        <div className="grow">
          <div className="name">Interaction · {host}</div>
          <div className="muted small">
            {(r.durationMs / 1000).toFixed(1)}s · {r.samples.length} pointer samples · {new Date(r.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
        <button className="ghost small icon" onClick={onRemove} aria-label="Remove recording">
          ×
        </button>
      </header>
      {video ? <video className="recording" src={video} controls muted loop playsInline /> : <p className="muted small">This browser couldn't encode the clip; the filmstrip and pointer path are still saved.</p>}
      {flash && (
        <div className="flash small" role="status">
          {flash}
        </div>
      )}
      <div className="actions wrap">
        {r.video && (
          <button className="small" onClick={() => run('Saved the clip', () => downloadFile(`${host}-interaction-${stamp}.${r.video!.ext}`, r.video!.data))}>
            Clip with cursor
          </button>
        )}
        {r.strip && (
          <button className="small" onClick={() => run('Filmstrip copied', () => copyImage(r.strip!))}>
            Copy filmstrip
          </button>
        )}
        <button
          className="small"
          onClick={() =>
            run('Saved', async () => {
              const where = await writeToFolder(files(), `interaction-${stamp}`);
              if (where) return `Saved to ${where}`;
              downloadFile(`${host}-interaction-${stamp}.zip`, zipSync(Object.fromEntries(Object.entries(files()).map(([p, d]) => [`interaction-${stamp}/${p}`, d]))));
              return 'Saved the interaction zip';
            })
          }
        >
          Save for agents
        </button>
        <button className="small" onClick={() => run('Copied. Paste into your agent and attach the filmstrip', () => navigator.clipboard.writeText(new TextDecoder().decode(files()['INTERACTION.md'])))}>
          Copy prompt
        </button>
      </div>
    </article>
  );
}
