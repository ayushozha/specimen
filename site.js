const showcase = document.querySelector('[data-showcase]');
const tablist = showcase.querySelector('[role="tablist"]');
const tabs = [...tablist.querySelectorAll('[role="tab"]')];

function selectTab(selectedTab) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panel.hidden = !selected;
  }
}

for (const tab of tabs) {
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tab.id);
  panel.tabIndex = 0;
  tab.addEventListener('click', () => selectTab(tab));
}

tablist.addEventListener('keydown', (event) => {
  const current = tabs.indexOf(event.target);
  const keys = {
    ArrowLeft: (current - 1 + tabs.length) % tabs.length,
    ArrowRight: (current + 1) % tabs.length,
    Home: 0,
    End: tabs.length - 1,
  };
  if (!Object.hasOwn(keys, event.key)) return;

  event.preventDefault();
  const next = tabs[keys[event.key]];
  selectTab(next);
  next.focus();
});

selectTab(tabs[0]);
tablist.hidden = false;

const copyButton = document.querySelector('[data-copy]');
const copyStatus = document.querySelector('.copy-status');
const commands = document.getElementById(copyButton.dataset.copy);

if (navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(commands.textContent);
      copyStatus.textContent = 'Commands copied.';
    } catch {
      copyStatus.textContent = 'Copy unavailable. Select the commands above to copy them.';
    }
  });
}

const bannerToggle = document.querySelector('.banner-toggle');
const banner = document.getElementById(bannerToggle.getAttribute('aria-controls'));

bannerToggle.hidden = false;
bannerToggle.addEventListener('click', () => {
  const playing = banner.getAttribute('src') === 'assets/banner.webp';
  banner.src = playing ? 'assets/banner-still.webp' : 'assets/banner.webp';
  bannerToggle.textContent = playing ? 'Play banner animation' : 'Stop banner animation';
});
