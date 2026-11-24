import { expect, test, type BrowserContext } from '@playwright/test';
import { CaptureTargetChangedError, SafariCaptureTarget } from '../../apps/extension/lib/safari-screenshot';
import { captureButton, launchWithExtension, scan } from './helpers';

function event<Args extends unknown[]>() {
  const listeners = new Set<(...args: Args) => void>();
  return {
    addListener: (listener: (...args: Args) => void) => listeners.add(listener),
    removeListener: (listener: (...args: Args) => void) => listeners.delete(listener),
    emit: (...args: Args) => { for (const listener of listeners) listener(...args); },
    count: () => listeners.size,
  };
}

const targetId = 12;
const windowId = 3;
const targetUrl = 'http://localhost:4321/landing.html';
const png = 'data:image/png;base64,stub';

function mockTabs() {
  let activeId = targetId;
  let calls = 0;
  const onActivated = event<[{ windowId: number; tabId: number }]>();
  const onDetached = event<[number]>();
  const onRemoved = event<[number]>();
  const onUpdated = event<[number, { status?: string; url?: string }]>();
  return {
    onActivated, onDetached, onRemoved, onUpdated,
    setActive: (id: number) => { activeId = id; },
    async get() { return { active: activeId === targetId, windowId, url: targetUrl }; },
    async captureVisibleTab() { calls++; return png; },
    calls: () => calls,
    listenerCount: () => onActivated.count() + onDetached.count() + onRemoved.count() + onUpdated.count(),
  };
}

function captureTarget(tabs: ReturnType<typeof mockTabs>) {
  return new SafariCaptureTarget(tabs as unknown as ConstructorParameters<typeof SafariCaptureTarget>[0], targetId);
}

async function snapshot(tabs: ReturnType<typeof mockTabs>) {
  const target = captureTarget(tabs);
  try {
    await target.start(targetUrl);
    return await target.snapshot();
  } finally {
    target.stop();
  }
}

test('a Safari snapshot returns pixels when the selected tab stays active', async () => {
  const tabs = mockTabs();
  await expect(snapshot(tabs)).resolves.toBe(png);
  expect(tabs.calls()).toBe(1);
  expect(tabs.listenerCount()).toBe(0);
});

test('Safari never requests a snapshot when another tab is already active', async () => {
  const tabs = mockTabs();
  tabs.setActive(31);
  await expect(snapshot(tabs)).rejects.toThrow(CaptureTargetChangedError);
  expect(tabs.calls()).toBe(0);
  expect(tabs.listenerCount()).toBe(0);
});

test('Safari discards a snapshot when the active tab changed, even without an event', async () => {
  const tabs = mockTabs();
  tabs.captureVisibleTab = async () => { tabs.setActive(31); return png; };
  await expect(snapshot(tabs)).rejects.toThrow(CaptureTargetChangedError);
  expect(tabs.listenerCount()).toBe(0);
});

test('Safari discards in-flight pixels even if the selected tab is active again', async () => {
  const tabs = mockTabs();
  const changeTarget = [
    () => {
      tabs.onActivated.emit({ tabId: 31, windowId });
      tabs.onActivated.emit({ tabId: targetId, windowId });
    },
    () => tabs.onDetached.emit(targetId),
    () => tabs.onRemoved.emit(targetId),
    () => tabs.onUpdated.emit(targetId, { status: 'loading' }),
  ];
  for (const change of changeTarget) {
    tabs.captureVisibleTab = async () => { change(); return png; };
    await expect(snapshot(tabs)).rejects.toThrow(CaptureTargetChangedError);
    expect(tabs.listenerCount()).toBe(0);
  }
});

test('Safari rejects later snapshots if the selected tab navigates between them', async () => {
  const tabs = mockTabs();
  const target = captureTarget(tabs);
  try {
    await target.start(targetUrl);
    await expect(target.snapshot()).resolves.toBe(png);
    tabs.onUpdated.emit(targetId, { status: 'loading' });
    await expect(target.snapshot()).rejects.toThrow(CaptureTargetChangedError);
    expect(tabs.calls()).toBe(1);
  } finally {
    target.stop();
  }
});

test('Safari permits one planned reload and rejects a URL change during it', async () => {
  const tabs = mockTabs();
  const target = captureTarget(tabs);
  try {
    await target.start(targetUrl);
    await target.reload(async () => { tabs.onUpdated.emit(targetId, { status: 'loading', url: targetUrl }); });
    await expect(target.snapshot()).resolves.toBe(png);
    await target.reload(async () => { tabs.onUpdated.emit(targetId, { status: 'loading', url: `${targetUrl}#changed` }); });
    await expect(target.snapshot()).rejects.toThrow(CaptureTargetChangedError);
  } finally {
    target.stop();
  }
});

async function openSafariTestPanel(context: BrowserContext, extensionId: string) {
  const site = context.pages()[0];
  await site.goto(targetUrl);
  const worker = context.serviceWorkers()[0];
  const [tab] = await worker.evaluate(() => chrome.tabs.query({}));
  const opened = context.waitForEvent('page');
  await worker.evaluate((url) => chrome.windows.create({ url, type: 'popup', width: 420, height: 800 }),
    `chrome-extension://${extensionId}/sidepanel.html?tabId=${tab.id}&adapter=extension&testBrowser=safari`);
  const panel = await opened;
  await scan(panel);
  return { site, panel };
}

test('Safari rescans before the next capture when the original document is replaced at the same URL', async () => {
  const { context, extensionId } = await launchWithExtension();
  try {
    const { site, panel } = await openSafariTestPanel(context, extensionId);
    await site.reload();
    // The old scan is dropped, and Capture whole page scans the new document before capturing it.
    await expect(panel.getByText('The page changed; the next capture scans it again.')).toBeVisible();
    const done = panel.evaluate(() => new Promise<boolean>((resolve) => window.addEventListener('specimen:done', () => resolve(true))));
    await panel.getByRole('radio', { name: /Whole page/ }).check();
    await panel.getByRole('button', { name: 'Capture whole page' }).click();
    expect(await done).toBe(true);
    await expect(panel.getByText('The page changed; the next capture scans it again.')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('Safari rejects the capture even when raster plate cleanup also fails', async () => {
  const { context, extensionId } = await launchWithExtension();
  try {
    const { panel } = await openSafariTestPanel(context, extensionId);

    await panel.evaluate(() => {
      let takingPlate = false;
      let targetChanged = false;
      const execute = chrome.scripting.executeScript.bind(chrome.scripting);
      const snapshot = chrome.tabs.captureVisibleTab.bind(chrome.tabs);
      const get = chrome.tabs.get.bind(chrome.tabs);
      document.body.dataset.captureCompleted = 'false';
      window.addEventListener('specimen:done', () => { document.body.dataset.captureCompleted = 'true'; });
      chrome.scripting.executeScript = (async (injection: chrome.scripting.ScriptInjection) => {
        const result = await execute(injection);
        const [method, args] = injection.args ?? [];
        if (method === 'layoutTree') (result[0].result as { root: { raster: boolean } }).root.raster = true;
        if (method === 'plateMode') {
          takingPlate = args[1];
          if (!takingPlate && targetChanged) {
            document.body.dataset.plateCleanupFailed = 'true';
            throw new Error('Simulated raster plate cleanup failure');
          }
        }
        return result;
      }) as typeof chrome.scripting.executeScript;
      chrome.tabs.captureVisibleTab = (async (id: number, options: chrome.extensionTypes.ImageDetails) => {
        const image = await snapshot(id, options);
        if (takingPlate) targetChanged = true;
        return image;
      }) as typeof chrome.tabs.captureVisibleTab;
      chrome.tabs.get = (async (id: number) => {
        const tab = await get(id);
        return targetChanged ? { ...tab, active: false } : tab;
      }) as typeof chrome.tabs.get;
    });

    await captureButton(panel).click();
    await expect(panel.getByText('The selected tab changed during capture. Return to it and scan again.')).toBeVisible({ timeout: 60_000 });
    await expect(panel.locator('body')).toHaveAttribute('data-plate-cleanup-failed', 'true');
    await expect(panel.locator('body')).toHaveAttribute('data-capture-completed', 'false');
    // The scan is dropped: choosing sections again needs a fresh one.
    await expect(panel.getByText('The page changed; the next capture scans it again.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Scan page' })).toBeEnabled();
  } finally {
    await context.close();
  }
});
