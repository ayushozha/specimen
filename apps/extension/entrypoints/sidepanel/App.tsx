import { deltaE, parseColor, type PaletteColor, type Section } from '@specimen/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyse, capture, type Analysis, type CaptureResult, type Progress } from '../../lib/capture';
import type { StyleSheetText } from '@specimen/core';
import { Session, explainError, focusTabWindow, targetTabId } from '../../lib/session';
import { CONFIG } from '../../lib/config';
import { capturedSections, everythingMarkdown, motionMarkdown, stackMarkdown } from '../../lib/outputs';
import { renderPaletteCss } from '../../lib/report';
import { CaptureCard, MotionPreviews, RecordingCard, type CaptureItem, type RecordingItem } from './Captures';
import { canRecordInteraction, startInteraction, stopInteraction, type RecordingSession } from '../../lib/interaction';
import { CaptureTargetChangedError } from '../../lib/safari-screenshot';

type FullAnalysis = Analysis & { sheets: StyleSheetText[] };

declare global {
  interface Window {
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}

const session = new Session();
/** How often the panel asks the page whether an element was picked. */
const PICK_POLL_MS = 150;

export function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [recording, setRecording] = useState<RecordingSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recordingRef = useRef<RecordingSession | null>(null);
  // On by default: Capture everything includes motion and the pointer sweep unless turned off.
  const [withMotion, setWithMotion] = useState(true);
  const [live, setLive] = useState<{ name: string; url: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [stale, setStale] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const tabIdRef = useRef<number | null>(null);
  tabIdRef.current = tabId;
  // Capture reloads the page itself (deep mode); that isn't a change the user needs to hear about.
  const busyRef = useRef<string | null>(null);
  busyRef.current = busy;

  const connect = useCallback(
    (id: number) =>
      session.connect(id, (reason) => {
        if (reason === 'canceled_by_user') setError('Capture was cancelled from the debugging bar.');
      }),
    [],
  );

  const runAnalyse = useCallback(
    async (id: number) => {
      setBusy('analyse');
      setError(null);
      setStale(false);
      try {
        const adapter = await connect(id);
        const a = await analyse(adapter, setProgress);
        setAnalysis(a);
        setExcluded(new Set());
      } catch (err) {
        setError(explainError(err));
      } finally {
        setBusy(null);
        setProgress(null);
      }
    },
    [connect],
  );

  useEffect(() => {
    // Nothing runs until asked: scanning scrolls the page and may dismiss a cookie banner.
    targetTabId().then(setTabId);
    const onActivated = (info: chrome.tabs.OnActivatedInfo) => {
      if (new URLSearchParams(location.search).has('tabId')) return;
      chrome.windows.getCurrent().then((w) => {
        if (info.windowId !== w.id) return;
        void session.disconnect();
        setTabId(info.tabId);
        setAnalysis(null);
        setError(null);
      });
    };
    const onUpdated = (id: number, change: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabIdRef.current && busyRef.current !== 'capture' && (change.status === 'loading' || (import.meta.env.SAFARI && change.url))) {
        setStale(true);
        if (import.meta.env.SAFARI) setAnalysis(null);
      }
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    const onHide = () => void session.disconnect();
    window.addEventListener('pagehide', onHide);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      window.removeEventListener('pagehide', onHide);
    };
  }, [runAnalyse]);

  const onProgress = useCallback((p: Progress) => {
    setProgress(p);
    if (p.latest) {
      const url = URL.createObjectURL(new Blob([p.latest.png as BlobPart], { type: 'image/png' }));
      setLive((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { name: p.latest!.name, url };
      });
    }
  }, []);

  /** Captures the page, or `sectionIds` only. `given` is a scan made just before (Capture a section). */
  const runCapture = async (sectionIds?: string[], given?: FullAnalysis) => {
    if (tabId === null || abortRef.current) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setBusy('capture');
    setError(null);
    setNotice(null);
    try {
      // Must be the first await: browsers only show the permission prompt during the click.
      await session.requestHostAccess();
      const adapter = await connect(tabId);
      // One button: scan first when there is no scan yet, or the page changed since.
      let scanned = given ?? analysis;
      if (!scanned || (!given && stale)) {
        scanned = await analyse(adapter, setProgress);
        setAnalysis(scanned);
        setExcluded(new Set());
        setStale(false);
        abort.signal.throwIfAborted();
      }
      const skip = scanned === analysis ? excluded : new Set<string>();
      const ids = sectionIds ?? (skip.size ? scanned.sections.filter((s) => !skip.has(s.id)).map((s) => s.id) : undefined);
      const r = await capture(adapter, scanned, { sectionIds: ids, motion: withMotion, signal: abort.signal }, onProgress);
      setCaptures((list) => [{ key: Date.now(), result: r, stack: scanned.stack }, ...list]);
      // Lets automated tests (and future integrations) read the bundle.
      window.dispatchEvent(new CustomEvent('specimen:done', { detail: r }));
    } catch (err) {
      if (err instanceof CaptureTargetChangedError) {
        await session.disconnect();
        setAnalysis(null);
        setStale(true);
      }
      if (abort.signal.aborted) setNotice('Capture cancelled. The page is back as it was.');
      else setError(explainError(err));
    } finally {
      abortRef.current = null;
      setCancelling(false);
      setBusy(null);
      setProgress(null);
      setLive((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
    }
  };

  /** Record interaction: the user drives the pointer; the tab is recorded and the cursor drawn in. */
  const startRecording = async () => {
    if (tabId === null) return;
    setError(null);
    setNotice(null);
    try {
      const adapter = await connect(tabId);
      if (!canRecordInteraction(adapter)) {
        setError('Recording an interaction needs Chrome, Edge or another Chromium browser for now.');
        return;
      }
      setBusy('record');
      const session = await startInteraction(adapter);
      recordingRef.current = session;
      setRecording(session);
      setElapsed(0);
    } catch (err) {
      setBusy(null);
      setError(explainError(err));
    }
  };

  const stopRecording = useCallback(async () => {
    const session = recordingRef.current;
    if (tabId === null || !session) return;
    recordingRef.current = null;
    setRecording(null);
    setNotice('Encoding the recording…');
    try {
      const adapter = await connect(tabId);
      const r = await stopInteraction(adapter, session);
      setRecordings((list) => [{ key: Date.now(), recording: r }, ...list]);
      setNotice(null);
      window.dispatchEvent(new CustomEvent('specimen:recorded', { detail: r }));
    } catch (err) {
      setNotice(null);
      setError(explainError(err));
    } finally {
      setBusy(null);
    }
  }, [tabId, connect]);

  // Timer, and a stop at the limit so a forgotten recording doesn't run on.
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const ms = Date.now() - recording.started;
      setElapsed(ms);
      if (ms >= CONFIG.motion.maxInteractionMs) void stopRecording();
    }, 250);
    return () => clearInterval(timer);
  }, [recording, stopRecording]);

  /** Lets the user click an element on the page and adds it as a section. Clicking again cancels. */
  const pickFrom = async (scan: FullAnalysis): Promise<{ section: Section; analysis: FullAnalysis } | null> => {
    if (tabId === null) return null;
    const adapter = await connect(tabId);
    if (busyRef.current === 'pick') {
      await adapter.call('cancelPick');
      return null;
    }
    setBusy('pick');
    const back = await focusTabWindow(tabId);
    try {
      // Section ids number from 01; a picked element takes the next free number.
      const next = Math.max(0, ...scan.sections.map((s) => parseInt(s.id, 10) || 0));
      await adapter.call('startPick', next);
      let state = await adapter.call('pickState');
      while (state.picking) {
        await new Promise((r) => setTimeout(r, PICK_POLL_MS));
        state = await adapter.call('pickState');
      }
      const picked = state.section;
      if (!picked) return null;
      const updated = { ...scan, sections: [...scan.sections, picked].sort((a, b) => a.rect.y - b.rect.y) };
      setAnalysis(updated);
      return { section: picked, analysis: updated };
    } catch (err) {
      setError(explainError(err));
      return null;
    } finally {
      await back();
      setBusy(null);
    }
  };

  const pick = () => (analysis ? pickFrom(analysis) : undefined);

  /**
   * Capture a section: pick one thing on the page (a hero, a header, a button) and capture only
   * that, with its motion, hover states, pointer effects and exports, without capturing the page.
   */
  const captureSection = async () => {
    if (tabId === null) return;
    if (busyRef.current && busyRef.current !== 'pick') return;
    setError(null);
    setNotice(null);
    try {
      // Must be the first await: browsers only show the permission prompt during the click.
      await session.requestHostAccess();
      let scan = analysis;
      if (busyRef.current !== 'pick' && (!scan || stale)) {
        setBusy('analyse');
        scan = await analyse(await connect(tabId), setProgress);
        setAnalysis(scan);
        setExcluded(new Set());
        setStale(false);
        setProgress(null);
        setBusy(null);
      }
      if (!scan) return;
      const picked = await pickFrom(scan);
      if (picked) await runCapture([picked.section.id], picked.analysis);
    } catch (err) {
      setError(explainError(err));
      setBusy(null);
      setProgress(null);
    }
  };

  const highlight = useCallback(
    (section: Section | null) => {
      if (tabId === null || busy) return;
      connect(tabId)
        .then((a) => a.call('highlight', section?.selector ?? null, section?.name ?? ''))
        .catch(() => {});
    },
    [tabId, busy, connect],
  );

  const host = analysis ? safeHost(analysis.url) : '';
  const capturing = busy === 'capture';
  const included = analysis ? analysis.sections.length - excluded.size : 0;
  const [latest, ...earlier] = captures;
  const withMotionResult = captures.find((c) => c.result.manifest.motion)?.result ?? null;
  const removeCapture = (key: number) => setCaptures((l) => l.filter((c) => c.key !== key));

  return (
    <div className="app">
      <header className="header">
        <img className="logo" src="/icon/96.png" alt="" />
        <span className="title">Specimen</span>
        <span className="host" title={analysis?.url}>{host}</span>
        <a className="privacy-link small" href="https://specimen.ayushojha.com/privacy.html" target="_blank" rel="noreferrer">Privacy</a>
      </header>

      <button className="primary" onClick={() => (capturing ? undefined : runCapture())} aria-busy={capturing} disabled={tabId === null || !!busy}>
        {capturing && progress ? `Capturing… ${progress.done}/${progress.total}` : analysis && excluded.size && !stale ? `Capture ${included} sections` : 'Capture everything'}
      </button>
      <div className="capture-row">
        <button className="secondary grow" onClick={() => void captureSection()} disabled={tabId === null || (!!busy && busy !== 'pick')}>
          {busy === 'pick' ? (
            'Click a section, header or button on the page… (Esc or here to cancel)'
          ) : (
            <>
              Capture a section <span className="muted small">· pick a hero, header or button; only it is captured, with its motion</span>
            </>
          )}
        </button>
        {latest && !busy && <CopyButton label="Copy everything" title="DESIGN.md, palette, stack, motion and effect code as one markdown document" text={() => everythingMarkdown(latest.result, latest.stack)} onError={setError} />}
      </div>

      {!busy && tabId !== null && (
        <div className="options">
          <label className="switch">
            <input type="checkbox" checked={withMotion} onChange={(e) => setWithMotion(e.target.checked)} />
            <span>
              Record motion <span className="muted small">· reloads the page, sweeps the pointer over each section, hovers and opens menus</span>
            </span>
          </label>
          <div className="muted small">
            One capture gives you every part below: {analysis ? `${excluded.size ? included : analysis.sections.length} section` : 'section'} screenshots at{' '}
            {CONFIG.breakpoints.map((b) => b.width).join(' / ')}px, the palette, the tech stack, editable layers for Figma, Paper, Sketch and more, a Photoshop file and a
            DESIGN.md for agents{withMotion ? ', plus animations, hover states, pointer effects and recordings' : ''}.
            {!analysis && (
              <>
                {' '}
                <button className="link" onClick={() => runAnalyse(tabId)}>
                  Scan page
                </button>{' '}
                first to choose sections.
              </>
            )}
          </div>
        </div>
      )}

      {recording && (
        <div className="recorder" role="status">
          <span className="dot" aria-hidden="true" />
          <span className="grow small">
            Recording {Math.floor(elapsed / 1000)}s · move your mouse over the page
          </span>
          <button className="small" onClick={() => void stopRecording()}>
            Stop
          </button>
        </div>
      )}

      {progress && (
        <div className="progress" aria-live="polite">
          <div className="bar">
            <span style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
          </div>
          <div className="progress-row">
            <span className="muted small grow">{cancelling ? 'Cancelling… finishing the current step' : progress.step}</span>
            {capturing && (
              <button
                className="small"
                onClick={() => {
                  setCancelling(true);
                  abortRef.current?.abort(new DOMException('Cancelled', 'AbortError'));
                }}
                disabled={cancelling}
              >
                Cancel
              </button>
            )}
          </div>
          {live && capturing && (
            <figure className="live">
              <img src={live.url} alt="" />
              <figcaption className="muted small">Captured: {live.name}</figcaption>
            </figure>
          )}
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {notice && !busy && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {stale && !busy && (
        <div className="notice">
          The page changed; the next capture scans it again.{' '}
          <button className="link" onClick={() => tabId !== null && runAnalyse(tabId)}>
            Scan again now
          </button>
        </div>
      )}

      {latest && (
        <Block title="Screenshots and exports" meta={plural(capturedSections(latest.result).length, 'section')}>
          <CaptureCard key={latest.key} item={latest} onRemove={() => removeCapture(latest.key)} onError={setError} />
        </Block>
      )}
      {analysis && (
        <Block title="Palette" meta={`${analysis.palette.colors.length} colours`}>
          <PaletteView analysis={analysis} onHighlight={(sel) => highlight(sel ? ({ selector: sel, name: '' } as Section) : null)} />
        </Block>
      )}
      {tabId !== null && (
        <Block title="Motion" meta={withMotionResult?.manifest.motion ? `${withMotionResult.manifest.motion.pointerEffects} pointer · ${withMotionResult.manifest.motion.animations} animations` : undefined}>
          {withMotionResult && (
            <div className="toolbar">
              <span className="muted small">Cues and rebuilt effect code, as markdown</span>
              <CopyButton label="Copy motion" text={() => motionMarkdown(withMotionResult)} onError={setError} />
            </div>
          )}
          <MotionView result={withMotionResult} sections={analysis?.sections ?? []} />
          {withMotionResult && <MotionPreviews result={withMotionResult} onError={setError} />}
          {!busy && (
            <button className="secondary" onClick={startRecording}>
              Record interaction <span className="muted small">· you move the mouse, Specimen records it with the cursor drawn in</span>
            </button>
          )}
          {recordings.map((item) => (
            <RecordingCard key={item.key} item={item} onRemove={() => setRecordings((l) => l.filter((r) => r.key !== item.key))} onError={setError} />
          ))}
        </Block>
      )}
      {analysis && (
        <Block title="Stack" meta={`${analysis.stack.length} found`}>
          <div className="toolbar">
            <span className="muted small">Frameworks, styling and motion libraries</span>
            <CopyButton label="Copy stack" text={() => stackMarkdown(analysis.stack)} onError={setError} />
          </div>
          <StackView analysis={analysis} />
        </Block>
      )}
      {analysis && (
        <Block title="Sections" meta={plural(analysis.sections.length, 'section')} open={!latest}>
          <SectionsView
            analysis={analysis}
            excluded={excluded}
            setExcluded={setExcluded}
            busy={!!busy}
            onCapture={(id) => runCapture([id])}
            onRemove={(id) => setAnalysis({ ...analysis, sections: analysis.sections.filter((s) => s.id !== id) })}
            onPick={pick}
            onRedetect={() => tabId !== null && runAnalyse(tabId)}
            onHover={highlight}
            picking={busy === 'pick'}
          />
        </Block>
      )}
      {earlier.length > 0 && (
        <Block title="Earlier captures" meta={String(earlier.length)} open={false}>
          {earlier.map((item) => (
            <CaptureCard key={item.key} item={item} onRemove={() => removeCapture(item.key)} onError={setError} />
          ))}
        </Block>
      )}
    </div>
  );
}

/** Copies text built on click, and says so for a moment. */
function CopyButton({ label, title, text, onError }: { label: string; title?: string; text: () => string | Promise<string>; onError: (message: string | null) => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      className="small"
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

/** One part of the capture: a titled block that can be folded away. */
function Block({ title, meta, open = true, children }: { title: string; meta?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="block" open={open}>
      <summary>
        <h2>{title}</h2>
        {meta && <span className="muted small">{meta}</span>}
      </summary>
      <div className="block-body">{children}</div>
    </details>
  );
}

function SectionsView(props: {
  analysis: FullAnalysis;
  excluded: Set<string>;
  setExcluded: (s: Set<string>) => void;
  busy: boolean;
  picking: boolean;
  onCapture: (id: string) => void;
  onRemove: (id: string) => void;
  onPick: () => void;
  onRedetect: () => void;
  onHover: (s: Section | null) => void;
}) {
  const { analysis, excluded, setExcluded } = props;
  const toggle = (id: string) => {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExcluded(next);
  };
  return (
    <section className="panel">
      <div className="toolbar">
        {/* The count is in the block header. */}
        <span />
        <div className="actions">
          <button onClick={props.onPick} disabled={props.busy && !props.picking}>
            {props.picking ? 'Click an element… (Esc or here to cancel)' : 'Pick element'}
          </button>
          <button className="ghost" onClick={props.onRedetect} disabled={props.busy}>
            Detect again
          </button>
        </div>
      </div>
      <ul className="list" onMouseLeave={() => props.onHover(null)}>
        {analysis.sections.map((s) => (
          <li key={s.id} className="row" onMouseEnter={() => props.onHover(s)}>
            <input type="checkbox" checked={!excluded.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Include ${s.name}`} />
            <div className="grow">
              <div className="name">{s.name}</div>
              <div className="muted small">
                {s.rect.width}×{s.rect.height} · {s.source}
              </div>
            </div>
            <button className="ghost small" onClick={() => props.onCapture(s.id)} disabled={props.busy}>
              Capture
            </button>
            <button className="ghost small icon" onClick={() => props.onRemove(s.id)} aria-label={`Remove ${s.name}`} disabled={props.busy}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {analysis.cookieBanner && <p className="muted small">Cookie banner: clicked “{analysis.cookieBanner}”.</p>}
    </section>
  );
}

const ROLE_ORDER = ['background', 'surface', 'text', 'text-muted', 'accent', 'border'] as const;

function PaletteView({ analysis, onHighlight }: { analysis: FullAnalysis; onHighlight: (selector: string | null) => void }) {
  const { palette } = analysis;
  const [selected, setSelected] = useState<PaletteColor | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number>(0);

  const roles = useMemo(
    () => ROLE_ORDER.map((r) => [r, palette.colors.find((c) => c.roles.includes(r))] as const).filter(([, c]) => c),
    [palette],
  );

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(text);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1200);
  };

  const eyedrop = async () => {
    if (!window.EyeDropper) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      setPicked(sRGBHex);
      const target = parseColor(sRGBHex)!.rgba;
      const nearest = palette.colors
        .filter((c) => c.alpha === 1)
        .map((c) => ({ c, d: deltaE(parseColor(c.hex)!.rgba, target) }))
        .sort((a, b) => a.d - b.d)[0];
      if (nearest && nearest.d < 3) setSelected(nearest.c);
    } catch {
      // Cancelled with Escape.
    }
  };

  const failing = palette.contrast.filter((p) => !p.passesAA).length;
  // Gradients that also load an image would make the panel fetch from the site; preview only pure gradients.
  const gradients = palette.gradients.filter((g) => !g.value.includes('url('));

  return (
    <section className="panel">
      <div className="toolbar">
        <span className="muted small">
          {palette.colors.length} colours · {palette.variables.length} variables
        </span>
        <div className="actions">
          {window.EyeDropper && <button onClick={eyedrop}>Eyedropper</button>}
          <button className="ghost" onClick={() => copy(JSON.stringify(palette, null, 2))}>
            {copied?.startsWith('{') ? 'Copied' : 'Copy JSON'}
          </button>
          <button className="ghost" onClick={() => copy(renderPaletteCss(palette))}>
            {copied?.startsWith(':root') || copied?.startsWith('/*') ? 'Copied' : 'Copy CSS'}
          </button>
        </div>
      </div>

      {picked && (
        <div className="notice small">
          Picked <span className="mono">{picked}</span>
          {selected && selected.hex !== picked ? (
            <>
              {' '}
              · nearest page colour <span className="mono">{selected.hex}</span>
            </>
          ) : null}
        </div>
      )}

      {roles.length > 0 && (
        <div className="roles">
          {roles.map(([role, c]) => (
            <button key={role} className="role" onClick={() => setSelected(c!)}>
              <span className="chip" style={{ background: c!.values[0] }} />
              <span className="small">{role}</span>
            </button>
          ))}
        </div>
      )}

      <div className="swatches">
        {palette.colors.map((c) => (
          <button
            key={c.hex}
            className={`swatch ${selected?.hex === c.hex ? 'on' : ''}`}
            style={{ background: c.values[0] }}
            title={`${c.hex} · ${c.count}×`}
            aria-label={`${c.hex}, used ${c.count} times`}
            onClick={() => setSelected(c)}
          />
        ))}
      </div>

      {selected && (
        <div className="detail">
          <div className="detail-head">
            <span className="chip large" style={{ background: selected.values[0] }} />
            <div>
              <button className="mono copy" onClick={() => copy(selected.hex)}>
                {copied === selected.hex ? 'Copied' : selected.hex}
              </button>
              <div className="muted small">
                {selected.space} · used {selected.count}×{selected.roles.length ? ` · ${selected.roles.join(', ')}` : ''}
              </div>
            </div>
          </div>
          <dl>
            <dt>Exact values</dt>
            <dd>
              {selected.values.map((v) => (
                <button key={v} className="mono copy" onClick={() => copy(v)}>
                  {copied === v ? 'Copied' : v}
                </button>
              ))}
            </dd>
            {selected.composited && (
              <>
                <dt>Renders as</dt>
                <dd className="mono">{selected.composited}</dd>
              </>
            )}
            {selected.variables.length > 0 && (
              <>
                <dt>Variables</dt>
                <dd>
                  {selected.variables.map((v) => (
                    <button key={v} className="mono copy" onClick={() => copy(`var(${v})`)}>
                      {copied === `var(${v})` ? 'Copied' : v}
                    </button>
                  ))}
                </dd>
              </>
            )}
            <dt>Used for</dt>
            <dd className="small">
              {Object.entries(selected.properties)
                .sort((a, b) => b[1] - a[1])
                .map(([p, n]) => `${p} ${n}×`)
                .join(' · ')}
            </dd>
            <dt>Examples</dt>
            <dd onMouseLeave={() => onHighlight(null)}>
              {selected.selectors.map((s) => (
                <div key={s} className="mono small example" onMouseEnter={() => onHighlight(s)}>
                  {s}
                </div>
              ))}
            </dd>
          </dl>
        </div>
      )}

      {gradients.length > 0 && (
        <>
          <h3>Gradients</h3>
          {gradients.map((g) => (
            <button key={g.value} className="gradient" style={{ background: g.value }} title={g.value} onClick={() => copy(g.value)} />
          ))}
        </>
      )}

      <h3>Contrast</h3>
      <p className="muted small">
        {palette.contrast.length} text and background pairs; {failing} below WCAG AA.
      </p>
      <ul className="list">
        {palette.contrast.slice(0, 12).map((p) => (
          <li key={`${p.fg}${p.bg}${p.largeText}`} className="row contrast">
            <span className="pair" style={{ color: p.fg, background: p.bg }}>
              Aa
            </span>
            <span className="mono small grow">
              {p.fg} on {p.bg}
              {p.largeText ? <span className="muted"> · large</span> : null}
            </span>
            <span className="small" title={p.approximate ? 'Gradient background, measured at its average colour' : undefined}>
              {p.approximate ? '≈' : ''}
              {p.ratio.toFixed(2)}
            </span>
            <span className={`small ${p.passesAA ? 'muted' : 'fail'}`}>{p.passesAA ? 'AA' : 'Fails'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MotionView({ result, sections }: { result: CaptureResult | null; sections: Section[] }) {
  const motion = result?.manifest.motion;
  const rebuilt = result?.manifest.exports;
  if (!motion) {
    return (
      <p className="panel muted small">
        Captured with Record motion on: page load and scroll video, animations frame by frame, hover and focus states, a pointer sweep over each section,
        and menus.
      </p>
    );
  }
  const totals = [
    ['Animations', motion.animations],
    ['Hover and focus effects', motion.interactions],
    ['Scroll effects', motion.scrollEffects],
    ['Pointer effects', motion.pointerEffects],
    ['Menus and accordions', motion.toggles],
    ['Effects rebuilt as code', rebuilt?.replicas ?? 0],
  ] as const;
  const libs = [
    motion.libraries?.gsap && `GSAP: ${motion.libraries.gsap.tweens.length} tweens`,
    motion.libraries?.scrollTriggers.length && `ScrollTrigger: ${motion.libraries.scrollTriggers.length}`,
    motion.libraries?.lottie.length && `Lottie: ${motion.libraries.lottie.length}`,
    motion.declarative.length && `Declarative (AOS, Locomotive, Webflow): ${motion.declarative.length}`,
    motion.hooks?.observed.length && `Scroll observers: ${motion.hooks.observed.length}`,
  ].filter(Boolean);
  return (
    <section className="panel">
      <ul className="list">
        {totals.map(([label, n]) => (
          <li key={label} className="row">
            <span className="grow">{label}</span>
            <span className="mono">{n}</span>
          </li>
        ))}
      </ul>
      {rebuilt?.fittedScore != null && (
        <p className="muted small">
          Effects fitted from recorded motion match the original at {Math.round(rebuilt.fittedScore * 100)}% on average. Code is in exports/code as CSS, GSAP and Motion.
          {rebuilt.leftOut ? ` ${rebuilt.leftOut} effects matched below 80% and are only in the recordings.` : ''}
        </p>
      )}
      {libs.length > 0 && (
        <>
          <h3>Read from the page</h3>
          <ul className="list">
            {libs.map((l) => (
              <li key={String(l)} className="row small">
                {l}
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>By section</h3>
      <ul className="list">
        {sections.map((s) => {
          const n = motion.sections[s.id];
          return n ? (
            <li key={s.id} className="row">
              <span className="grow name">{s.name}</span>
              <span className="muted small">
                {n.animations} anim · {n.interactions} hover · {n.scrollEffects} scroll{n.pointer ? ` · ${n.pointer} pointer` : ''}
              </span>
            </li>
          ) : null;
        })}
      </ul>
    </section>
  );
}

function StackView({ analysis }: { analysis: FullAnalysis }) {
  const groups = useMemo(() => {
    const order = ['framework', 'builder', 'css', 'animation', 'library'];
    return order.map((cat) => [cat, analysis.stack.filter((s) => s.category === cat)] as const).filter(([, items]) => items.length);
  }, [analysis]);
  const label: Record<string, string> = { framework: 'Frameworks', builder: 'Site builders', css: 'Styling', animation: 'Animation and motion', library: 'Libraries' };

  if (analysis.stack.length === 0) return <p className="panel muted">No frameworks or libraries detected.</p>;
  return (
    <section className="panel">
      {groups.map(([cat, items]) => (
        <div key={cat}>
          <h3>{label[cat]}</h3>
          <ul className="list">
            {items.map((s) => (
              <li key={s.name} className="row stack">
                <details>
                  <summary>
                    <span className="name">{s.name}</span>
                    {s.version && <span className="muted small"> {s.version}</span>}
                    <span className={`badge ${s.confidence}`}>{s.confidence}</span>
                  </summary>
                  <ul className="evidence">
                    {s.evidence.map((e) => (
                      <li key={e} className="muted small">
                        {e}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
