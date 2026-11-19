import { deltaE, parseColor, type PaletteColor, type Section } from '@specimen/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyse, capture, type Analysis, type CaptureResult, type Progress } from '../../lib/capture';
import type { StyleSheetText } from '@specimen/core';
import { Session, downloadBundle, explainError, targetTabId } from '../../lib/session';
import { toSvg } from '@specimen/exporters';

type View = 'sections' | 'palette' | 'motion' | 'stack';
type FullAnalysis = Analysis & { sheets: StyleSheetText[] };

declare global {
  interface Window {
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}

const session = new Session();

export function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [view, setView] = useState<View>('sections');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
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
    targetTabId().then((id) => {
      setTabId(id);
      if (id !== null) void runAnalyse(id);
    });
    const onActivated = (info: chrome.tabs.OnActivatedInfo) => {
      if (new URLSearchParams(location.search).has('tabId')) return;
      chrome.windows.getCurrent().then((w) => {
        if (info.windowId !== w.id) return;
        void session.disconnect();
        setTabId(info.tabId);
        setAnalysis(null);
        setResult(null);
        setError(null);
      });
    };
    const onUpdated = (id: number, change: chrome.tabs.OnUpdatedInfo) => {
      if (change.status === 'loading' && id === tabIdRef.current && busyRef.current !== 'capture') setStale(true);
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

  const runCapture = async (sectionIds?: string[]) => {
    if (tabId === null || !analysis) return;
    // Must be the first await: browsers only show the permission prompt during the click.
    await session.requestHostAccess();
    setBusy('capture');
    setError(null);
    setResult(null);
    try {
      const adapter = await connect(tabId);
      const ids = sectionIds ?? (excluded.size ? analysis.sections.filter((s) => !excluded.has(s.id)).map((s) => s.id) : undefined);
      const r = await capture(adapter, analysis, { sectionIds: ids }, setProgress);
      setResult(r);
      // Lets automated tests (and future integrations) read the bundle without the download.
      window.dispatchEvent(new CustomEvent('specimen:done', { detail: r }));
      await downloadBundle(r);
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const pick = async () => {
    if (tabId === null || !analysis) return;
    setBusy('pick');
    try {
      const adapter = await connect(tabId);
      // Section ids number from 01; a picked element takes the next free number.
      const next = Math.max(0, ...analysis.sections.map((s) => parseInt(s.id, 10) || 0));
      const picked = await adapter.call('pickElement', next);
      if (picked) setAnalysis({ ...analysis, sections: [...analysis.sections, picked].sort((a, b) => a.rect.y - b.rect.y) });
    } catch (err) {
      setError(explainError(err));
    } finally {
      setBusy(null);
    }
  };

  /** Copies a section for pasting into design tools: HTML for Paper, SVG for Figma and Illustrator. */
  const copySection = async (section: Section, format: 'html' | 'svg') => {
    if (tabId === null || !analysis || !section.selector) return;
    try {
      const adapter = await connect(tabId);
      if (format === 'html') {
        const { html } = await adapter.call('serializeElement', section.selector, analysis.sheets);
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([html], { type: 'text/plain' }) }),
        ]);
      } else {
        const tree = await adapter.call('layoutTree', section.selector, 1500);
        await navigator.clipboard.writeText(toSvg(tree, (url) => url));
      }
    } catch (err) {
      setError(explainError(err));
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

  return (
    <div className="app">
      <header className="header">
        <img className="logo" src="/icon/96.png" alt="" />
        <span className="title">Specimen</span>
        <span className="host" title={analysis?.url}>{host}</span>
      </header>

      <div className="segmented" role="tablist">
        {(['sections', 'palette', 'motion', 'stack'] as View[]).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      <button className="primary" onClick={() => (capturing ? undefined : runCapture())} aria-busy={capturing} disabled={!analysis || !!busy}>
        {capturing && progress ? `Capturing… ${progress.done}/${progress.total}` : excluded.size ? `Capture ${included} sections` : 'Capture everything'}
      </button>

      {progress && (
        <div className="progress" aria-live="polite">
          <div className="bar">
            <span style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
          </div>
          <div className="muted small">{progress.step}</div>
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {stale && !busy && (
        <div className="notice">
          The page changed.{' '}
          <button className="link" onClick={() => tabId !== null && runAnalyse(tabId)}>
            Analyse again
          </button>
        </div>
      )}
      {!analysis && !busy && !error && tabId !== null && (
        <div className="empty">
          <p>Analyse this page to find its sections, colours and tech stack.</p>
          <button onClick={() => runAnalyse(tabId)}>Analyse page</button>
        </div>
      )}

      {result && !busy && <Done result={result} />}

      {analysis && view === 'sections' && (
        <SectionsView
          analysis={analysis}
          excluded={excluded}
          setExcluded={setExcluded}
          busy={!!busy}
          onCapture={(id) => runCapture([id])}
          onCopy={copySection}
          onRemove={(id) => setAnalysis({ ...analysis, sections: analysis.sections.filter((s) => s.id !== id) })}
          onPick={pick}
          onRedetect={() => tabId !== null && runAnalyse(tabId)}
          onHover={highlight}
          picking={busy === 'pick'}
        />
      )}
      {analysis && view === 'palette' && <PaletteView analysis={analysis} onHighlight={(sel) => highlight(sel ? ({ selector: sel, name: '' } as Section) : null)} />}
      {analysis && view === 'motion' && <MotionView result={result} sections={analysis.sections} />}
      {analysis && view === 'stack' && <StackView analysis={analysis} />}
    </div>
  );
}

function Done({ result }: { result: CaptureResult }) {
  const { manifest } = result;
  return (
    <div className="notice">
      <div>
        Saved <span className="mono">{result.filename}</span>
      </div>
      <div className="muted small">
        {manifest.sections.length} sections · {manifest.files.length} files
        {manifest.errors.length ? ` · ${manifest.errors.length} steps failed (listed in the report)` : ''}
      </div>
      <button className="link" onClick={() => downloadBundle(result)}>
        Download again
      </button>
    </div>
  );
}

function CopyMenu({ section, onCopy, disabled }: { section: Section; onCopy: (s: Section, f: 'html' | 'svg') => Promise<void>; disabled: boolean }) {
  const [done, setDone] = useState<string | null>(null);
  const copy = async (format: 'html' | 'svg', e: React.MouseEvent) => {
    (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
    await onCopy(section, format);
    setDone(format === 'html' ? 'HTML copied' : 'SVG copied');
    setTimeout(() => setDone(null), 1500);
  };
  return (
    <details className="menu">
      <summary className={`ghost small ${disabled ? 'disabled' : ''}`} aria-label={`Copy ${section.name}`}>
        {done ?? 'Copy'}
      </summary>
      <div className="menu-list" role="menu">
        <button role="menuitem" onClick={(e) => copy('html', e)} disabled={disabled}>
          HTML <span className="muted">for Paper</span>
        </button>
        <button role="menuitem" onClick={(e) => copy('svg', e)} disabled={disabled}>
          SVG <span className="muted">for Figma, Illustrator</span>
        </button>
      </div>
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
  onCopy: (section: Section, format: 'html' | 'svg') => Promise<void>;
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
        <span className="muted small">{analysis.sections.length} sections</span>
        <div className="actions">
          <button onClick={props.onPick} disabled={props.busy}>
            {props.picking ? 'Click an element… (Esc to cancel)' : 'Pick element'}
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
            {s.selector && <CopyMenu section={s} onCopy={props.onCopy} disabled={props.busy} />}
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

const VIEW_LABEL: Record<View, string> = { sections: 'Sections', palette: 'Palette', motion: 'Motion', stack: 'Stack' };

function MotionView({ result, sections }: { result: CaptureResult | null; sections: Section[] }) {
  const motion = result?.manifest.motion;
  const rebuilt = result?.manifest.exports;
  if (!motion) {
    return (
      <p className="panel muted">
        Motion is recorded during Capture everything: page load and scroll video, animations frame by frame, hover and focus states, pointer effects and
        menus.
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
                {n.animations} anim · {n.interactions} hover · {n.scrollEffects} scroll
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

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
