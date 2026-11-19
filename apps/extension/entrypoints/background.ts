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
    // Safari has no side panel: open the panel in a small window bound to this tab.
    await browser.windows.create({ url: browser.runtime.getURL(`/sidepanel.html?tabId=${tab.id}`), type: 'popup', width: 420, height: 820 });
  });
});
