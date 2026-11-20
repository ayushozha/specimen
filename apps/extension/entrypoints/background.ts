/** Width of the docked panel window in Safari, matching Chrome's side panel. */
const PANEL_WIDTH = 420;
/** Panel window id → the browser window it docks to and that window's width before docking. */
const DOCKED = 'docked';
type Docked = Record<string, { windowId: number; width: number }>;

export default defineBackground(() => {
  if (import.meta.env.CHROME || import.meta.env.EDGE) {
    // Clicking the toolbar button opens the side panel.
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
    return;
  }
  browser.action.onClicked.addListener(async (tab) => {
    if (import.meta.env.FIREFOX) {
      // Firefox: the panel lives in the sidebar.
      await (browser as unknown as { sidebarAction: { toggle(): Promise<void> } }).sidebarAction.toggle();
      return;
    }
    await dockPanel(tab);
  });
  if (import.meta.env.SAFARI) browser.windows.onRemoved.addListener(undock);
});

/**
 * Safari has no side panel, and the panel can't live inside the page because capture reloads it. So
 * the browser window narrows and the panel opens as a window docked to its right edge, bound to the tab.
 */
async function dockPanel(tab: Browser.tabs.Tab): Promise<void> {
  const url = browser.runtime.getURL(`/sidepanel.html?tabId=${tab.id}`);
  const win = tab.windowId === undefined ? null : await browser.windows.get(tab.windowId).catch(() => null);
  if (!win?.id || win.width === undefined || win.left === undefined || win.top === undefined || win.state === 'fullscreen') {
    await browser.windows.create({ url, type: 'popup', width: PANEL_WIDTH, height: 820 });
    return;
  }
  const width = Math.max(PANEL_WIDTH, win.width - PANEL_WIDTH);
  await browser.windows.update(win.id, { width, state: 'normal' });
  const panel = await browser.windows.create({ url, type: 'popup', left: win.left + width, top: win.top, width: PANEL_WIDTH, height: win.height });
  if (panel?.id === undefined) return;
  const docked = ((await browser.storage.session.get(DOCKED))[DOCKED] ?? {}) as Docked;
  docked[panel.id] = { windowId: win.id, width: win.width };
  await browser.storage.session.set({ [DOCKED]: docked });
}

/** When a docked panel closes, its browser window gets its width back. */
async function undock(closedId: number): Promise<void> {
  const docked = ((await browser.storage.session.get(DOCKED))[DOCKED] ?? {}) as Docked;
  const entry = docked[closedId];
  if (!entry) return;
  delete docked[closedId];
  await browser.storage.session.set({ [DOCKED]: docked });
  await browser.windows.update(entry.windowId, { width: entry.width }).catch(() => undefined);
}
