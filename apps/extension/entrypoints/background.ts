export default defineBackground(() => {
  // Clicking the toolbar button opens the side panel.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});
