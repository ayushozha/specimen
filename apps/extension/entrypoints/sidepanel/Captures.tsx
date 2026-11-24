import type { StackItem } from '@specimen/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Analysis, CaptureResult } from '../../lib/capture';
import {
  agentSpec,
  baseName,
  capturedSections,
  copyHtml,
  copyImage,
  copySvg,
  downloadFile,
  everythingMarkdown,
  figmaImportZip,
  framerComponent,
  framerOverrides,
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
  /** The scan the capture was made from: its palette, sections and stack. */
  analysis: Analysis;
}

export interface RecordingItem {
  key: number;
  recording: InteractionRecording;
}

/** Object URLs for PNG bytes, revoked when the component goes away. */
export function useImageUrls(files: Record<string, Uint8Array>, paths: string[]): Record<string, string> {
  const urls = useMemo(
    () => Object.fromEntries(paths.filter((p) => files[p]).map((p) => [p, URL.createObjectURL(new Blob([files[p] as BlobPart], { type: 'image/png' }))])),
    [files, paths.join('|')],
  );
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

/** Runs an export, shows what happened for a moment, and reports failures. */
function useRunner(onError: (message: string) => void) {
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = async (label: string, fn: () => Promise<unknown> | unknown) => {
    try {
      const out = await fn();
      setFlash(typeof out === 'string' ? out : label);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlash(null), 2500);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      onError(err instanceof Error ? err.message : String(err));
    }
  };
  return { flash, run };
}

/** Copies text built on click, and says so for a moment. */
export function CopyButton({
  label,
  title,
  className = 'action',
  text,
  onError,
}: {
  label: string;
  title?: string;
  className?: string;
  text: () => string | Promise<string>;
  onError: (message: string | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      className={className}
      title={title}
      onClick={async () => {
        try {
          // The write starts inside the click and resolves when the text is built: Safari only allows
          // clipboard writes during the gesture, and long builds (Copy everything) would miss it.
          const built = Promise.resolve(text());
          if (typeof ClipboardItem === 'function') await navigator.clipboard.write([new ClipboardItem({ 'text/plain': built.then((t) => new Blob([t], { type: 'text/plain' })) })]);
          else await navigator.clipboard.writeText(await built);
          setCopied(true);
          onError(null);
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1500);
        } catch (err) {
          onError(`Couldn't copy: ${err instanceof Error ? err.message : String(err)}`);
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

const DESTINATIONS = [
  ['figma', 'Figma'],
  ['framer', 'Framer'],
  ['agent', 'Code agent'],
  ['other', 'Other'],
] as const;
type Destination = (typeof DESTINATIONS)[number][0];

/**
 * Export: choose which part, then where it's going. Each destination shows one main action and the
 * few others that make sense for it, each saying what you get.
 */
export function ExportView({ item, onError }: { item: CaptureItem; onError: (message: string | null) => void }) {
  const { result } = item;
  const sections = useMemo(() => capturedSections(result), [result]);
  const [scope, setScope] = useState<string>(sections.length === 1 ? sections[0].id : 'all');
  const [dest, setDest] = useState<Destination>('figma');
  const ids = scope === 'all' ? sections.map((s) => s.id) : [scope];
  const one = ids.length === 1 ? ids[0] : null;
  const thumbs = useImageUrls(result.files, sections.map((s) => s.shot));
  const { flash, run } = useRunner(onError);
  const [spec, setSpec] = useState<{ preview: SpecPreview; highlight: string | null; markdown: string; files: Record<string, Uint8Array> } | null>(null);

  // The agent spec is built up front so its description says what you'll get.
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

  const svg = () => (one ? sectionSvg(result, one) : stackedSvg(result, ids));
  const overrides = framerOverrides(result, ids);
  const name = baseName(result, one ?? undefined);
  const host = result.filename.replace(/_.*$/, '');
  const motion = result.manifest.motion;
  const firstOnly = one ? undefined : 'Uses the first section; pick one above for another';

  const copyForFigma = () => run('Copied. Paste in Figma with ⌘V', async () => copySvg(svg() ?? fail()));
  const savePlugin = () => run('Saved the plugin file', () => downloadFile(`${name}.figma.zip`, figmaImportZip(result, ids) ?? fail()));
  const saveSvg = () => run('Saved SVG', () => downloadFile(`${name}.svg`, svg() ?? fail()));

  return (
    <div className="panel">
      <span className="eyebrow">Which part</span>
      <div className="thumbs" role="listbox" aria-label="Sections in this capture">
        {sections.length > 1 && (
          <button role="option" aria-selected={scope === 'all'} className={`thumb all ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')}>
            All {sections.length}
          </button>
        )}
        {sections.map((s) => (
          <button key={s.id} role="option" aria-selected={scope === s.id} className={`thumb ${scope === s.id ? 'on' : ''}`} onClick={() => setScope(s.id)} title={s.name}>
            <img src={thumbs[s.shot]} alt="" />
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      <span className="eyebrow">Where is it going?</span>
      <div className="dests">
        {DESTINATIONS.map(([id, label]) => (
          <button key={id} aria-pressed={dest === id} onClick={() => setDest(id)}>
            {label}
          </button>
        ))}
      </div>

      {flash && (
        <div className="flash small" role="status">
          {flash}
        </div>
      )}

      {dest === 'figma' && (
        <div className="card">
          <button className="primary" onClick={copyForFigma}>
            Copy for Figma
          </button>
          <span className="muted">Paste with ⌘V as editable layers.</span>
          <Option title="Plugin file" note="Import with the Specimen plugin: auto layout, variables, hover variants, and clips that play.">
            <button className="action" onClick={savePlugin}>
              Save plugin file
            </button>
          </Option>
          <Option title="SVG" note="One self-contained file with its images and fonts inside.">
            <button className="action" onClick={saveSvg}>
              Save .svg
            </button>
          </Option>
        </div>
      )}

      {dest === 'framer' && (
        <div className="card">
          <button
            className="primary"
            title={firstOnly}
            onClick={() => run('Copied. In Framer: Assets ▸ Code ▸ New file, paste', () => navigator.clipboard.writeText(framerComponent(result, one ?? ids[0]) ?? fail()))}
          >
            Copy component
          </button>
          <span className="muted">A code component that renders the section exactly; a WebGL shader on it runs live.</span>
          {overrides && (
            <Option title="Motion overrides" note="Gives your own layers the captured hover, reveal and scroll motion.">
              <button className="action" onClick={() => run('Copied. Paste into a Framer code file, then pick an override for a layer', () => navigator.clipboard.writeText(overrides))}>
                Copy overrides
              </button>
            </Option>
          )}
        </div>
      )}

      {dest === 'agent' && (
        <div className="card">
          <CopyButton
            className="primary"
            label="Copy everything"
            title="DESIGN.md, palette, stack, motion and effect code as one markdown document"
            text={() => everythingMarkdown(result, item.stack)}
            onError={onError}
          />
          {spec ? (
            <>
              <span className="muted">
                DESIGN.md for Claude Code, Codex, Cursor and other agents: exact colours, type scale, spacing, {spec.preview.sections}{' '}
                {spec.preview.sections === 1 ? 'section' : 'sections'} with {spec.preview.screenshots} screenshots, {spec.preview.highlights} numbered{' '}
                {spec.preview.highlights === 1 ? 'highlight' : 'highlights'}
                {spec.preview.motionCues ? `, ${spec.preview.motionCues} motion and hover cues` : motion ? ', no motion in this selection' : ' (motion not recorded)'}
                {spec.preview.videos ? `, ${spec.preview.videos} recordings` : ''}.
              </span>
              {spec.highlight && <img className="spec-shot" src={spec.highlight} alt="Highlighted section preview" />}
              <Option title="Prompt" note="DESIGN.md as text, for Claude, ChatGPT or Grok in a chat.">
                <button className="action" onClick={() => run('Copied. Paste into Claude, ChatGPT or Grok, and attach the screenshot', () => navigator.clipboard.writeText(spec.markdown))}>
                  Copy prompt
                </button>
              </Option>
              <Option title="Folder" note="DESIGN.md with screenshots and highlights, for agents that read files.">
                <button
                  className="action"
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
              </Option>
              {one && (
                <Option title="Screenshot" note="Attach it with the prompt in a chat agent.">
                  <button className="action" onClick={() => run('Screenshot copied', () => copyImage(result.files[`sections/${one}/desktop.png`]))}>
                    Copy screenshot
                  </button>
                </Option>
              )}
            </>
          ) : (
            <span className="muted">Preparing DESIGN.md…</span>
          )}
        </div>
      )}

      {dest === 'other' && (
        <ul className="tool-list">
          <Tool name="Paper" hint="Pastes HTML; Paper turns it into layers.">
            <button className="action" onClick={() => run('Copied. Paste in Paper with ⌘V', async () => copyHtml(ids.map((id) => sectionHtml(result, id) ?? '').join('\n') || fail()))}>
              Copy HTML
            </button>
          </Tool>
          <Tool name="Sketch · Penpot · Illustrator" hint="Self-contained SVG: images and fonts inside.">
            <button className="action" onClick={() => run('Copied SVG. Paste with ⌘V', async () => copySvg(svg() ?? fail()))}>
              Copy SVG
            </button>
            <button className="action" onClick={saveSvg}>
              .svg
            </button>
          </Tool>
          <Tool name="Photoshop" hint="Layered PSD: groups, background, editable text.">
            <button
              className="action"
              onClick={() =>
                run('Saved PSD', () =>
                  one
                    ? downloadFile(`${name}.psd`, result.files[`exports/psd/${one}.psd`] ?? fail())
                    : downloadFile(`${name}-psd.zip`, zipSync(Object.fromEntries(ids.filter((id) => result.files[`exports/psd/${id}.psd`]).map((id) => [`${id}.psd`, result.files[`exports/psd/${id}.psd`]])), { level: 0 })),
                )
              }
            >
              Save .psd
            </button>
          </Tool>
          <Tool name="Canva · Keynote · Slides · Notion" hint="Pixel-exact image of the section.">
            <button className="action" title={firstOnly} onClick={() => run('Image copied. Paste with ⌘V', async () => copyImage(result.files[`sections/${one ?? ids[0]}/desktop.png`] ?? fail()))}>
              Copy image
            </button>
          </Tool>
          {motion && (
            <Tool name="After Effects · Lottie" hint="Recorded animations as an AE script and Lottie files.">
              <button className="action" onClick={() => run('Saved AE script', () => downloadFile(`${host}.jsx`, result.files['exports/after-effects/specimen.jsx'] ?? fail()))}>
                .jsx
              </button>
              <button
                className="action"
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
      )}

      <div className="download">
        <span className="grow small muted">Everything in one file: report, images, HTML, clips and specs.</span>
        <button className="action" onClick={() => run('Saved the full bundle', () => downloadFile(result.filename, result.zip))}>
          Download .zip
        </button>
      </div>
    </div>
  );
}

function Option({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="card-row">
      <div className="grow">
        <strong>{title}</strong>
        <span className="muted small">{note}</span>
      </div>
      {children}
    </div>
  );
}

function Tool({ name, hint, children }: { name: string; hint: string; children: React.ReactNode }) {
  return (
    <li>
      <div className="grow">
        <strong>{name}</strong>
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
/** Shows a frame from inside the clip as its poster: the first frame is often blank while the page loads. */
const POSTER_AT = '#t=0.6';

/**
 * What the capture recorded moving: pointer effects (the clip with the cursor drawn in, or its
 * filmstrip), and the page-load and scroll recordings.
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
  // Each section's pointer clip plays in place, so the effect is seen moving, not as a thumbnail strip.
  const pointerClips = useMemo(
    () =>
      Object.fromEntries(
        sections.flatMap((s) => {
          const path = Object.keys(result.files).find((p) => p.startsWith(`sections/${s.id}/pointer.`) && VIDEO.test(p));
          return path ? [[s.id, path]] : [];
        }),
      ),
    [sections, result],
  );
  const urls = useMemo(
    () => Object.fromEntries([...pageClips.map((c) => c.path), ...Object.values(pointerClips)].map((p) => [p, videoUrl(result.files[p], p)])),
    [pageClips, pointerClips, result],
  );
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
      {sections.length === 0 && (
        <p className="muted small">
          Specimen swept the pointer over each section and the page didn't visibly react. If it does react to the mouse (a trail, a follower, a tilt), record it yourself
          below.
        </p>
      )}
      {sections.map((s) => {
        const clip = pointerClips[s.id];
        const raw = result.files[`sections/${s.id}/pointer.json`];
        const info = raw ? (JSON.parse(new TextDecoder().decode(raw)) as { kind: string; fadeMs: number | null }) : null;
        return (
          <div key={s.id} className="effect">
            <div>
              <div className="eyebrow">Pointer effect · {s.name}</div>
              <strong>
                {info?.kind === 'canvas' ? 'The pointer paints into a canvas' : info?.kind === 'pixels' ? 'The pointer changes the pixels under it' : 'Elements follow the pointer'}
                {info?.fadeMs != null ? `; the trail fades in about ${info.fadeMs}ms` : info && info.kind !== 'dom' ? '; the trail stays' : ''}.
              </strong>
              <div className="note">Cursor drawn in. Included in DESIGN.md.</div>
            </div>
            {clip ? (
              // Plays on hover: several full-size clips decoding at once is heavy for a side panel.
              <video
                src={urls[clip] + POSTER_AT}
                preload="metadata"
                muted
                loop
                playsInline
                controls
                aria-label={`Pointer sweep over ${s.name}`}
                onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
                onMouseLeave={(e) => e.currentTarget.pause()}
              />
            ) : (
              <img src={strips[`sections/${s.id}/pointer-strip.png`]} alt="Pointer stroke, frame by frame" />
            )}
            {clip && (
              <div className="actions">
                <button className="small light" onClick={() => save(`${baseName(result, s.id)}-pointer.${clip.split('.').pop()}`, result.files[clip])}>
                  Save clip with cursor
                </button>
              </div>
            )}
          </div>
        );
      })}
      {pageClips.length > 0 && (
        <>
          <span className="eyebrow">Recordings</span>
          <div className="clips">
            {pageClips.map((c) => (
              <figure key={c.path} className="clip">
                <video className="recording" src={urls[c.path] + POSTER_AT} preload="metadata" controls muted loop playsInline />
                <figcaption className="small">{c.label}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function RecordingCard({ item, onRemove, onError }: { item: RecordingItem; onRemove: () => void; onError: (message: string) => void }) {
  const r = item.recording;
  const { flash, run } = useRunner(onError);
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
  const files = () => interactionFiles(r);
  return (
    <article className="capture capture-recording">
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
          <button className="action" onClick={() => run('Saved the clip', () => downloadFile(`${host}-interaction-${stamp}.${r.video!.ext}`, r.video!.data))}>
            Clip with cursor
          </button>
        )}
        {r.strip && (
          <button className="action" onClick={() => run('Filmstrip copied', () => copyImage(r.strip!))}>
            Copy filmstrip
          </button>
        )}
        <button
          className="action"
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
        <button className="action" onClick={() => run('Copied. Paste into your agent and attach the filmstrip', () => navigator.clipboard.writeText(new TextDecoder().decode(files()['INTERACTION.md'])))}>
          Copy prompt
        </button>
      </div>
    </article>
  );
}
