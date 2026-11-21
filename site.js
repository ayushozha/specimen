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

const heroToggle = document.querySelector('.hero-toggle');
const heroVideo = document.getElementById(heroToggle.getAttribute('aria-controls'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (heroVideo.canPlayType('video/mp4; codecs="avc1.64001f"')) {
  const playHero = () => {
    heroVideo.play().catch(() => {
      heroToggle.textContent = 'Play animation';
    });
  };

  heroVideo.addEventListener('play', () => {
    heroToggle.textContent = 'Pause animation';
  });
  heroVideo.addEventListener('pause', () => {
    heroToggle.textContent = 'Play animation';
  });
  heroVideo.addEventListener('error', () => {
    heroToggle.hidden = true;
  });

  heroToggle.hidden = false;
  heroToggle.addEventListener('click', () => {
    if (heroVideo.paused) playHero();
    else heroVideo.pause();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) heroVideo.pause();
  });

  if (!reducedMotion.matches) playHero();
}

if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('section-reveal');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px 48px 0px' });

  document.querySelectorAll('.section-heading, .motion-copy').forEach(heading => reveal.observe(heading));
}
