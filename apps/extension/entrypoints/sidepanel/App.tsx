import { deltaE, parseColor, type Palette, type PaletteColor, type Section, type StackItem } from '@specimen/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyse, capture, type Analysis, type CaptureResult, type Phase, type Progress } from '../../lib/capture';
import type { StyleSheetText } from '@specimen/core';
import { Session, explainError, focusTabWindow, targetTabId } from '../../lib/session';
import { CONFIG } from '../../lib/config';
import { capturedSections, motionMarkdown, stackMarkdown } from '../../lib/outputs';
import { renderPaletteCss } from '../../lib/report';
import { CopyButton, ExportView, MotionPreviews, RecordingCard, useImageUrls, type CaptureItem, type RecordingItem } from './Captures';
import { canRecordInteraction, startInteraction, stopInteraction, type RecordingSession } from '../../lib/interaction';
import { CaptureTargetChangedError } from '../../lib/safari-screenshot';

type FullAnalysis = Analysis & { sheets: StyleSheetText[] };
type Scope = 'page' | 'sections' | 'element';
type View = 'choose' | 'results' | 'history';
type Inspect = 'colours' | 'motion' | 'stack' | 'sections';
interface Shot {
  key: string;
  name: string;
  breakpoint: string;
  url: string;
}

declare global {
  interface Window {
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}

const session = new Session();
/** How often the panel asks the page whether an element was picked. */
const PICK_POLL_MS = 150;
const WIDTHS = CONFIG.breakpoints.map((b) => b.width).join(', ');
/** The parts of a capture in the order they run, as the checklist names them. */
const PHASES: [Phase, string][] = [
  ['scan', 'Scan the page'],
  ['motion', 'Record motion: reload, sweep the pointer, hover, open menus'],
  ['shots', `Screenshots and HTML at ${WIDTHS} px`],
  ['assets', 'Save the page and its assets'],
  ['exports', 'Build exports'],
];

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
  // On by default: a capture includes motion and the pointer sweep unless turned off.
  const [withMotion, setWithMotion] = useState(true);
  const [scope, setScope] = useState<Scope>('page');
  const [view, setView] = useState<View>('choose');
  const [currentKey, setCurrentKey] = useState<number | null>(null);
  // What the running capture is, for its title and checklist.
  const [running, setRunning] = useState<{ title: string; motion: boolean; scanned: boolean } | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
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
    const latest = p.latest;
    if (latest) {
      // Every screenshot is shown as it's taken: the newest large, the rest as a strip.
      const url = URL.createObjectURL(new Blob([latest.png as BlobPart], { type: 'image/png' }));
      setShots((list) => [...list, { key: `${latest.name}@${latest.breakpoint}`, name: latest.name, breakpoint: latest.breakpoint, url }]);
    }
  }, []);

  const clearShots = () =>
    setShots((list) => {
      list.forEach((s) => URL.revokeObjectURL(s.url));
      return [];
    });

  /**
   * Captures the page, or `sectionIds` only. `given` is a scan made just before (Capture a section).
   * `title` names the capture while it runs.
   */
  const runCapture = async (opts: { sectionIds?: string[]; given?: FullAnalysis; title: string }) => {
    if (tabId === null || abortRef.current) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setBusy('capture');
    setError(null);
    setNotice(null);
    clearShots();
    const scanned0 = opts.given ?? analysis;
    setRunning({ title: opts.title, motion: withMotion, scanned: !!scanned0 && (!!opts.given || !stale) });
    try {
      // Must be the first await: browsers only show the permission prompt during the click.
      await session.requestHostAccess();
      const adapter = await connect(tabId);
      // One button: scan first when there is no scan yet, or the page changed since.
      let scanned = scanned0;
      if (!scanned || (!opts.given && stale)) {
        scanned = await analyse(adapter, setProgress);
        setAnalysis(scanned);
        setExcluded(new Set());
        setStale(false);
        abort.signal.throwIfAborted();
      }
      const r = await capture(adapter, scanned, { sectionIds: opts.sectionIds, motion: withMotion, signal: abort.signal }, onProgress);
      const key = Date.now();
      setCaptures((list) => [{ key, result: r, stack: scanned.stack, analysis: scanned }, ...list]);
      setCurrentKey(key);
      setView('results');
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
      setRunning(null);
      clearShots();
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
   * One element: pick one thing on the page (a hero, a header, a button) and capture only that, with
   * its motion, hover states, pointer effects and exports, without capturing the page.
   */
  const captureElement = async () => {
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
      if (picked) await runCapture({ sectionIds: [picked.section.id], given: picked.analysis, title: `Capturing ${picked.section.name}` });
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
  const included = analysis ? analysis.sections.filter((s) => !excluded.has(s.id)) : [];
  const current = captures.find((c) => c.key === currentKey) ?? captures[0] ?? null;
  const removeCapture = (key: number) => setCaptures((l) => l.filter((c) => c.key !== key));
  const shown: View = view === 'results' && !current ? 'choose' : view;
  const step = capturing ? 1 : shown === 'results' ? 2 : 0;

  const captureOne = (id: string) => {
    const s = analysis?.sections.find((x) => x.id === id);
    void runCapture({ sectionIds: [id], title: `Capturing ${s?.name ?? 'a section'}` });
  };
  const sectionsView = analysis && (
    <SectionsView
      analysis={analysis}
      excluded={excluded}
      setExcluded={setExcluded}
      busy={!!busy}
      onCapture={captureOne}
      onRemove={(id) => setAnalysis({ ...analysis, sections: analysis.sections.filter((s) => s.id !== id) })}
      onPick={pick}
      onRedetect={() => tabId !== null && runAnalyse(tabId)}
      onHover={highlight}
      picking={busy === 'pick'}
    />
  );

  const recordRow = (lead: string) =>
    !busy && (
      <div className="record-link">
        <div className="grow">
          <strong>{lead}</strong>
          <div className="muted small">Move the mouse yourself and Specimen records it, cursor drawn in.</div>
        </div>
        <button className="action" onClick={startRecording} disabled={tabId === null}>
          <span className="rec-dot" aria-hidden="true" /> Record interaction
        </button>
      </div>
    );

  return (
    <div className="app">
      <div className="top">
        <header className="header">
          <img className="logo" src="/icon/96.png" alt="" />
          <span className="title">Specimen</span>
          <span className="host" title={analysis?.url}>
            {host}
          </span>
          <button
            className="header-button"
            aria-label="History: earlier captures"
            aria-pressed={shown === 'history'}
            title="Earlier captures"
            disabled={capturing}
            onClick={() => setView(shown === 'history' ? (current ? 'results' : 'choose') : 'history')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
        </header>
        {shown !== 'history' && (
          <ol className="steps" aria-label="Steps">
            {['Choose', 'Capture', 'Use it'].map((label, i) => (
              <li key={label} className={i < step ? 'done' : i === step ? 'now' : ''} aria-current={i === step ? 'step' : undefined}>
                {i < step ? '✓' : i + 1} · {label}
              </li>
            ))}
          </ol>
        )}
      </div>

      <main className="body">
        {recording && (
          <div className="recorder" role="status">
            <span className="dot" aria-hidden="true" />
            <span className="grow small">Recording {Math.floor(elapsed / 1000)}s · move your mouse over the page</span>
            <button className="action" onClick={() => void stopRecording()}>
              Stop
            </button>
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

        {capturing && running ? (
          <CapturingView
            title={running.title}
            motion={running.motion}
            scanned={running.scanned}
            analysis={analysis}
            progress={progress}
            shots={shots}
            cancelling={cancelling}
            onCancel={() => {
              setCancelling(true);
              abortRef.current?.abort(new DOMException('Cancelled', 'AbortError'));
            }}
          />
        ) : shown === 'history' ? (
          <HistoryView
            captures={captures}
            onOpen={(key) => {
              setCurrentKey(key);
              setView('results');
            }}
            onRemove={removeCapture}
          />
        ) : shown === 'results' && current ? (
          <ResultsView
            key={current.key}
            item={current}
            onNew={() => setView('choose')}
            onError={setError}
            onHighlight={(sel) => highlight(sel ? ({ selector: sel, name: '' } as Section) : null)}
            recordRow={recordRow('Missed an effect?')}
            recordings={recordings.map((item) => (
              <RecordingCard key={item.key} item={item} onRemove={() => setRecordings((l) => l.filter((r) => r.key !== item.key))} onError={setError} />
            ))}
          />
        ) : (
          <>
            <h1 className="heading">What do you want to capture?</h1>
            <fieldset className="choices">
              <legend className="visually-hidden">Capture scope</legend>
              <Choice value="page" scope={scope} setScope={setScope} title="Whole page" note={analysis && !stale ? `Every section Specimen finds. ${analysis.sections.length} on this page.` : 'Every section Specimen finds.'} icon={<PageIcon />} />
              <Choice value="sections" scope={scope} setScope={setScope} title="Some sections" note="Tick the ones you want from a list." icon={<SectionsIcon />} />
              <Choice value="element" scope={scope} setScope={setScope} title="One element" note="Click anything on the page; ↑ ↓ for its parent or child." icon={<ElementIcon />} />
            </fieldset>

            {scope === 'sections' && analysis && !stale && sectionsView}
            {busy === 'analyse' && progress && (
              <div className="inline-progress" aria-live="polite">
                <div className="bar">
                  <span style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
                </div>
                <span className="step-now">{progress.step}</span>
              </div>
            )}

            <label className="setting">
              <span className="grow">
                <strong>Include motion</strong>
                <span>Reloads the page and moves the pointer over each section to record animations, hovers and pointer effects. Takes longer.</span>
              </span>
              <input className="switch" type="checkbox" role="switch" checked={withMotion} onChange={(e) => setWithMotion(e.target.checked)} />
            </label>

            {!(scope === 'sections' && analysis) && (
              <div className="gets">
                <h2 className="eyebrow">You'll get</h2>
                <ul>
                  <li>Screenshots at 3 widths</li>
                  <li>Each section as HTML</li>
                  <li>Exact colours, contrast</li>
                  <li>Tech stack</li>
                  {withMotion && <li>Motion clips and code</li>}
                  <li>Figma, Framer, agents</li>
                </ul>
              </div>
            )}

            {recordings.map((item) => (
              <RecordingCard key={item.key} item={item} onRemove={() => setRecordings((l) => l.filter((r) => r.key !== item.key))} onError={setError} />
            ))}

            <div className="bottom">
              {recordRow('Want to show an effect yourself?')}
              <PrimaryButton
                scope={scope}
                tabId={tabId}
                busy={busy}
                scanned={!!analysis && !stale}
                included={included.length}
                total={analysis?.sections.length ?? 0}
                onPage={() => void runCapture({ title: 'Capturing the whole page' })}
                onScan={() => tabId !== null && runAnalyse(tabId)}
                onSections={() =>
                  void runCapture({
                    sectionIds: excluded.size ? included.map((s) => s.id) : undefined,
                    title: `Capturing ${plural(included.length, 'section')}`,
                  })
                }
                onElement={() => void captureElement()}
              />
              <p className="footer-note">
                Nothing runs until you press this.{' '}
                <a href="https://specimen.ayushojha.com/privacy.html" target="_blank" rel="noreferrer">
                  Privacy
                </a>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PrimaryButton(props: {
  scope: Scope;
  tabId: number | null;
  busy: string | null;
  scanned: boolean;
  included: number;
  total: number;
  onPage: () => void;
  onScan: () => void;
  onSections: () => void;
  onElement: () => void;
}) {
  const { scope, busy } = props;
  const picking = busy === 'pick';
  const disabled = props.tabId === null || (!!busy && !(scope === 'element' && picking));
  if (scope === 'element') {
    return (
      <button className="primary" onClick={props.onElement} disabled={disabled}>
        {picking ? 'Click an element on the page… (Esc or here to cancel)' : busy === 'analyse' ? 'Scanning…' : 'Pick an element to capture'}
      </button>
    );
  }
  if (scope === 'sections' && !props.scanned) {
    return (
      <button className="primary" onClick={props.onScan} disabled={disabled}>
        {busy === 'analyse' ? 'Scanning…' : 'Scan page'}
      </button>
    );
  }
  if (scope === 'sections') {
    return (
      <button className="primary" onClick={props.onSections} disabled={disabled || props.included === 0}>
        {props.included === props.total ? `Capture all ${props.total}` : `Capture ${props.included} of ${props.total}`}
      </button>
    );
  }
  return (
    <button className="primary" onClick={props.onPage} disabled={disabled}>
      Capture whole page
    </button>
  );
}

function Choice(props: { value: Scope; scope: Scope; setScope: (s: Scope) => void; title: string; note: string; icon: React.ReactNode }) {
  const on = props.scope === props.value;
  return (
    <label className={`choice ${on ? 'on' : ''}`}>
      <span className="choice-icon" aria-hidden="true">
        {props.icon}
      </span>
      <span className="grow">
        <strong>{props.title}</strong>
        <span>{props.note}</span>
      </span>
      <input type="radio" name="scope" value={props.value} checked={on} onChange={() => props.setScope(props.value)} />
    </label>
  );
}

const PageIcon = () => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round">
    <path d="M3 8V5a2 2 0 0 1 2-2h3M20 3h3a2 2 0 0 1 2 2v3M25 20v3a2 2 0 0 1-2 2h-3M8 25H5a2 2 0 0 1-2-2v-3" />
    <rect x="8" y="8" width="12" height="12" rx="2" fill="#d9c8f2" stroke="none" />
  </svg>
);
const SectionsIcon = () => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
    <rect x="4" y="4" width="20" height="5" rx="1.5" fill="#d9c8f2" />
    <rect x="4" y="11.5" width="20" height="5" rx="1.5" fill="#f8c9d6" />
    <rect x="4" y="19" width="20" height="5" rx="1.5" fill="#bfe0ef" />
  </svg>
);
const ElementIcon = () => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="9" width="16" height="9" rx="3" fill="#fbece6" />
    <path d="M17 15l7 7M17 15v6M17 15h6" />
  </svg>
);

/** Capturing: what's being captured right now, live, and a checklist of the parts. */
function CapturingView(props: {
  title: string;
  motion: boolean;
  scanned: boolean;
  analysis: FullAnalysis | null;
  progress: Progress | null;
  shots: Shot[];
  cancelling: boolean;
  onCancel: () => void;
}) {
  const { progress, shots } = props;
  const phases = PHASES.filter(([p]) => p !== 'motion' || props.motion);
  const now = progress ? phases.findIndex(([p]) => p === progress.phase) : props.scanned ? 1 : 0;
  const latest = shots[shots.length - 1];
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.scrollTo({ left: strip.current.scrollWidth });
  }, [shots.length]);
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;
  const meta: Partial<Record<Phase, string>> = props.analysis
    ? { scan: `${plural(props.analysis.sections.length, 'section')} · ${props.analysis.palette.colors.length} colours`, shots: shots.length ? `${shots.length} taken` : undefined }
    : {};

  return (
    <>
      <div>
        <h1 className="heading">{props.title}</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {props.motion ? 'With motion. Keep this tab open; the page reloads once.' : 'Keep this tab open.'}
        </p>
      </div>

      <div className="live-frame" aria-live="polite">
        {latest ? <img src={latest.url} alt={`Just captured: ${latest.name} at ${latest.breakpoint}`} /> : null}
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
        {latest ? (
          <span className="live-label">
            Live: {latest.name} · {latest.breakpoint}
          </span>
        ) : (
          <span className="live-empty">
            {progress?.phase === 'motion' ? 'Recording motion on the page. Each section shows here as it is captured.' : 'Each section shows here as it is captured.'}
          </span>
        )}
      </div>
      {shots.length > 1 && (
        <div className="shots" ref={strip} aria-label="Captured so far">
          {shots.map((s) => (
            <figure key={s.key}>
              <img src={s.url} alt="" />
              <figcaption>
                {s.name} · {s.breakpoint}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <ol className="checklist progress">
        {phases.map(([p, label], i) => {
          const state = i < now ? 'done' : i === now ? 'now' : '';
          return (
            <li key={p} className={state}>
              <div className="line">
                <span className="mark" aria-hidden="true">
                  {state === 'done' && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </span>
                <span className="grow">{label}</span>
                {state === 'now' ? <span className="small">{pct}%</span> : meta[p] && state === 'done' ? <span className="small muted">{meta[p]}</span> : null}
              </div>
              {state === 'now' && (
                <>
                  <div className="bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="step-now">{props.cancelling ? 'Cancelling… finishing the current step' : progress?.step ?? 'Starting…'}</span>
                </>
              )}
            </li>
          );
        })}
      </ol>

      <div className="bottom">
        <button className="secondary" onClick={props.onCancel} disabled={props.cancelling}>
          Cancel and restore the page
        </button>
        <p className="footer-note">Stops the capture and puts the page back as it was.</p>
      </div>
    </>
  );
}

/** Use it: Export (where it's going) and Inspect (colours, motion, stack, sections). */
function ResultsView(props: {
  item: CaptureItem;
  onNew: () => void;
  onError: (message: string | null) => void;
  onHighlight: (selector: string | null) => void;
  recordRow: React.ReactNode;
  recordings: React.ReactNode[];
}) {
  const { item } = props;
  const [tab, setTab] = useState<'export' | 'inspect'>('export');
  const [inspect, setInspect] = useState<Inspect>('colours');
  const m = item.result.manifest;
  const sections = capturedSections(item.result);
  const host = item.result.filename.replace(/_.*$/, '');
  const motion = m.motion;
  const motionCount = motion ? motion.animations + motion.interactions + motion.scrollEffects + motion.pointerEffects + motion.toggles : 0;
  const pills: [Inspect, string, number][] = [
    ['colours', 'Colours', item.analysis.palette.colors.length],
    ['motion', 'Motion', motionCount],
    ['stack', 'Stack', item.analysis.stack.length],
    ['sections', 'Sections', sections.length],
  ];

  return (
    <section className="capture result">
      <div className="panel">
        <div className="result-head">
          <div className="grow capture-head">
            <div className="grow">
              <div className="name">{sections.length === 1 ? sections[0].name : `Captured · ${plural(sections.length, 'section')}`}</div>
              <div className="muted small">
                {host} · {new Date(m.capturedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ·{' '}
                {motion ? `${plural(motion.animations, 'animation')}, ${plural(motion.interactions, 'hover')}, ${plural(motion.pointerEffects, 'pointer effect')}` : 'no motion'}
                {m.errors.length ? ` · ${plural(m.errors.length, 'step')} failed` : ''}
              </div>
            </div>
          </div>
          <button className="action" onClick={props.onNew}>
            New capture
          </button>
        </div>
        <div className="tabs" role="tablist" aria-label="Results">
          <button role="tab" aria-selected={tab === 'export'} onClick={() => setTab('export')}>
            Export
          </button>
          <button role="tab" aria-selected={tab === 'inspect'} onClick={() => setTab('inspect')}>
            Inspect
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === 'export' ? (
          <ExportView item={item} onError={props.onError} />
        ) : (
          <div className="panel">
            <div className="pills" role="tablist" aria-label="Inspect">
              {pills.map(([id, label, n]) => (
                <button key={id} role="tab" aria-selected={inspect === id} onClick={() => setInspect(id)}>
                  {label}
                  <span className="count">{n}</span>
                </button>
              ))}
            </div>
            {inspect === 'colours' && <PaletteView palette={item.analysis.palette} onHighlight={props.onHighlight} onError={props.onError} />}
            {inspect === 'motion' && <MotionTab item={item} onError={props.onError} recordRow={props.recordRow} recordings={props.recordings} />}
            {inspect === 'stack' && (
              <>
                <div className="toolbar">
                  <span className="muted small">Frameworks, styling and motion libraries</span>
                  <CopyButton label="Copy stack" text={() => stackMarkdown(item.analysis.stack)} onError={props.onError} />
                </div>
                <StackView stack={item.analysis.stack} />
              </>
            )}
            {inspect === 'sections' && <CapturedSectionsView item={item} />}
          </div>
        )}
      </div>
    </section>
  );
}

function MotionTab({ item, onError, recordRow, recordings }: { item: CaptureItem; onError: (message: string | null) => void; recordRow: React.ReactNode; recordings: React.ReactNode[] }) {
  const result: CaptureResult = item.result;
  const motion = result.manifest.motion;
  const rebuilt = result.manifest.exports;
  if (!motion) {
    return (
      <>
        <p className="muted">
          This capture was made with motion off. Turn on Include motion for page load and scroll video, animations frame by frame, hover and focus states, a pointer
          sweep over each section, and menus.
        </p>
        {recordRow}
        {recordings}
      </>
    );
  }
  const stats = [
    ['Animations', motion.animations],
    ['Hover and focus', motion.interactions],
    ['Scroll effects', motion.scrollEffects],
    ['Pointer effects', motion.pointerEffects],
    ['Menus', motion.toggles],
    ['Rebuilt as code', rebuilt?.replicas ?? 0],
  ] as const;
  const libs = [
    motion.libraries?.gsap && `GSAP: ${motion.libraries.gsap.tweens.length} tweens`,
    motion.libraries?.scrollTriggers.length && `ScrollTrigger: ${motion.libraries.scrollTriggers.length}`,
    motion.libraries?.lottie.length && `Lottie: ${motion.libraries.lottie.length}`,
    motion.declarative.length && `Declarative (AOS, Locomotive, Webflow): ${motion.declarative.length}`,
    motion.hooks?.observed.length && `Scroll observers: ${motion.hooks.observed.length}`,
  ].filter(Boolean);
  return (
    <>
      <div className="stats">
        {stats.map(([label, n]) => (
          <div key={label} className="stat">
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="toolbar">
        <span className="muted small">Cues and rebuilt effect code, as markdown</span>
        <CopyButton label="Copy motion" text={() => motionMarkdown(result)} onError={onError} />
      </div>
      {rebuilt?.fittedScore != null && (
        <p className="muted small" style={{ margin: 0 }}>
          Effects fitted from recorded motion match the original at {Math.round(rebuilt.fittedScore * 100)}% on average. Code is in exports/code as CSS, GSAP and Motion.
          {rebuilt.leftOut ? ` ${rebuilt.leftOut} effects matched below 80% and are only in the recordings.` : ''}
        </p>
      )}
      <MotionPreviews result={result} onError={onError} />
      {libs.length > 0 && (
        <>
          <span className="eyebrow">Read from the page</span>
          <ul className="list">
            {libs.map((l) => (
              <li key={String(l)} className="row small">
                {l}
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="eyebrow">By section</span>
      <ul className="list">
        {result.manifest.sections.map((s) => {
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
      {recordRow}
      {recordings}
    </>
  );
}

/** The sections this capture holds, from its own bundle; changing what to capture lives in Choose. */
function CapturedSectionsView({ item }: { item: CaptureItem }) {
  const sections = capturedSections(item.result);
  const thumbs = useImageUrls(item.result.files, sections.map((s) => s.shot));
  return (
    <>
      <ul className="list">
        {sections.map((s) => (
          <li key={s.id} className="history-item">
            <img src={thumbs[s.shot]} alt="" />
            <span className="grow">
              <span className="name" style={{ display: 'block' }}>
                {s.name}
              </span>
              <span className="muted small">
                {s.width}×{s.height}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small" style={{ margin: 0 }}>
        To capture other sections, start a new capture and choose Some sections.
      </p>
    </>
  );
}

function HistoryView({ captures, onOpen, onRemove }: { captures: CaptureItem[]; onOpen: (key: number) => void; onRemove: (key: number) => void }) {
  return (
    <>
      <h1 className="heading">Captures</h1>
      {captures.length === 0 ? (
        <p className="muted">Nothing captured yet. Captures stay here until you close the panel.</p>
      ) : (
        <ul className="list">
          {captures.map((c) => (
            <HistoryRow key={c.key} item={c} onOpen={() => onOpen(c.key)} onRemove={() => onRemove(c.key)} />
          ))}
        </ul>
      )}
    </>
  );
}

function HistoryRow({ item, onOpen, onRemove }: { item: CaptureItem; onOpen: () => void; onRemove: () => void }) {
  const sections = capturedSections(item.result);
  const thumbs = useImageUrls(item.result.files, sections.slice(0, 1).map((s) => s.shot));
  const m = item.result.manifest;
  return (
    <li className="history-item">
      <button onClick={onOpen}>
        {sections[0] && <img src={thumbs[sections[0].shot]} alt="" />}
        <span className="grow">
          <span className="name" style={{ display: 'block' }}>
            {sections.length === 1 ? sections[0].name : item.result.filename.replace(/_.*$/, '')}
          </span>
          <span className="muted small">
            {plural(sections.length, 'section')} · {new Date(m.capturedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {m.motion ? 'with motion' : 'no motion'}
          </span>
        </span>
      </button>
      <button className="ghost small icon" onClick={onRemove} aria-label="Remove capture">
        ×
      </button>
    </li>
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
        <span className="eyebrow">{plural(analysis.sections.length, 'section')}</span>
        <div className="actions">
          <button className="action" onClick={props.onPick} disabled={props.busy && !props.picking}>
            {props.picking ? 'Click an element… (Esc or here to cancel)' : 'Pick element'}
          </button>
          <button className="action ghost" onClick={props.onRedetect} disabled={props.busy}>
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
      {analysis.cookieBanner && <p className="muted small" style={{ margin: 0 }}>Cookie banner: clicked “{analysis.cookieBanner}”.</p>}
    </section>
  );
}

const ROLE_ORDER = ['background', 'surface', 'text', 'text-muted', 'accent', 'border'] as const;

function PaletteView({ palette, onHighlight, onError }: { palette: Palette; onHighlight: (selector: string | null) => void; onError: (message: string | null) => void }) {
  const [selected, setSelected] = useState<PaletteColor | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [allPairs, setAllPairs] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const roles = useMemo(
    () => ROLE_ORDER.map((r) => [r, palette.colors.find((c) => c.roles.includes(r))] as const).filter((e): e is readonly [(typeof ROLE_ORDER)[number], PaletteColor] => !!e[1]),
    [palette],
  );

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).catch((err) => onError(`Couldn't copy: ${err instanceof Error ? err.message : String(err)}`));
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

  const failing = palette.contrast.filter((p) => !p.passesAA);
  const pairs = allPairs || failing.length === 0 ? palette.contrast : failing;
  // Gradients that also load an image would make the panel fetch from the site; preview only pure gradients.
  const gradients = palette.gradients.filter((g) => !g.value.includes('url('));

  return (
    <section className="panel">
      {roles.length > 0 && (
        <div className="role-strip" aria-hidden="true">
          {roles.map(([role, c]) => (
            <span key={role} style={{ background: c.values[0] }} />
          ))}
        </div>
      )}

      <div className="toolbar">
        <span className="muted small">
          {palette.colors.length} colours · {palette.variables.length} variables
        </span>
        <div className="actions">
          <button className="action ghost" onClick={() => copy(JSON.stringify(palette, null, 2))}>
            {copied?.startsWith('{') ? 'Copied' : 'Copy JSON'}
          </button>
          <button className="action" onClick={() => copy(renderPaletteCss(palette))}>
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
            <button key={role} className="role" onClick={() => setSelected(c)}>
              <span className="chip" style={{ background: c.values[0] }} />
              <span className="grow">
                <strong>{role}</strong>
                <span className="mono muted" style={{ fontSize: 11 }}>
                  {c.hex}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <span className="eyebrow">All {palette.colors.length} colours</span>
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
          <span className="eyebrow">Gradients</span>
          {gradients.map((g) => (
            <button key={g.value} className="gradient" style={{ background: g.value }} title={g.value} aria-label={`Copy gradient ${g.value}`} onClick={() => copy(g.value)} />
          ))}
        </>
      )}

      {palette.contrast.length > 0 && (
        <div className="contrast-card">
          <div className="contrast-head">
            <strong className="grow">
              {failing.length
                ? `${failing.length} of ${plural(palette.contrast.length, 'text pair')} fail WCAG AA`
                : `All ${plural(palette.contrast.length, 'text pair')} pass WCAG AA`}
            </strong>
            {failing.length > 0 && failing.length < palette.contrast.length && (
              <button className="link small" onClick={() => setAllPairs(!allPairs)}>
                {allPairs ? 'Show failing only' : `Show all ${palette.contrast.length}`}
              </button>
            )}
          </div>
          <ul className="list" style={{ border: 0, borderRadius: 0 }}>
            {pairs.map((p) => (
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
                <span className={p.passesAA ? 'pass' : 'fail'}>{p.passesAA ? 'AA' : 'Fails'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {window.EyeDropper && (
        <button className="secondary" onClick={eyedrop}>
          Pick a colour from the page
        </button>
      )}
    </section>
  );
}

function StackView({ stack }: { stack: StackItem[] }) {
  const groups = useMemo(() => {
    const order = ['framework', 'builder', 'css', 'animation', 'library'];
    return order.map((cat) => [cat, stack.filter((s) => s.category === cat)] as const).filter(([, items]) => items.length);
  }, [stack]);
  const label: Record<string, string> = { framework: 'Frameworks', builder: 'Site builders', css: 'Styling', animation: 'Animation and motion', library: 'Libraries' };

  if (stack.length === 0) return <p className="muted">No frameworks or libraries detected.</p>;
  return (
    <>
      {groups.map(([cat, items]) => (
        <div key={cat} className="panel">
          <span className="eyebrow">{label[cat]}</span>
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
    </>
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
