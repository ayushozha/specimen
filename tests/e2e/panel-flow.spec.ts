import { expect, test } from '@playwright/test';
import { inspect, launchWithExtension, openSiteAndPanel } from './helpers';

const shot = (name: string) => ({ path: `test-results/flow-${name}.png` });

test('the panel walks through Choose, Capturing with a live preview, and Use it', async () => {
  test.setTimeout(240_000);
  const { context, extensionId } = await launchWithExtension();
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/landing.html');
    await panel.setViewportSize({ width: 420, height: 900 });

    // 1 · Choose: three scopes, motion on by default, one button.
    await expect(panel.getByRole('heading', { name: 'What do you want to capture?' })).toBeVisible();
    await expect(panel.getByRole('radio', { name: /Whole page/ })).toBeChecked();
    await expect(panel.getByRole('switch', { name: /Include motion/ })).toBeChecked();
    await panel.screenshot(shot('1-choose'));
    await panel.getByRole('radio', { name: /One element/ }).check();
    await expect(panel.getByRole('button', { name: 'Pick an element to capture' })).toBeVisible();
    await panel.screenshot(shot('1-choose-element'));
    await panel.getByRole('radio', { name: /Whole page/ }).check();

    // 2 · Capturing: the checklist, and each section shown as its screenshot is taken.
    const done = panel.evaluate(() => new Promise<void>((resolve) => window.addEventListener('specimen:done', () => resolve())));
    await panel.getByRole('button', { name: 'Capture whole page' }).click();
    await expect(panel.getByRole('heading', { name: 'Capturing the whole page' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Cancel and restore the page' })).toBeVisible();
    await panel.screenshot(shot('2-capturing-motion'));
    const live = panel.locator('.live-frame img');
    await expect(live).toBeVisible({ timeout: 180_000 });
    await expect(panel.locator('.live-label')).toHaveText(/^Live: .+ · (desktop|tablet|mobile)$/);
    await expect(panel.locator('.shots figure').nth(2)).toBeVisible({ timeout: 60_000 });
    expect(await live.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await panel.screenshot(shot('2-capturing-live'));
    await done;

    // 3 · Use it: Export by destination, then Inspect.
    await expect(panel.getByRole('tab', { name: 'Export', selected: true })).toBeVisible();
    await panel.screenshot(shot('3-export-figma'));
    await panel.getByRole('button', { name: 'Framer', exact: true }).click();
    await panel.screenshot(shot('3-export-framer'));
    await panel.getByRole('button', { name: 'Code agent' }).click();
    await expect(panel.getByText(/^DESIGN\.md for Claude Code/)).toBeVisible({ timeout: 30_000 });
    await panel.screenshot(shot('3-export-agent'));
    // Copy everything follows Which part: one section chosen, only that section goes to the agent.
    await panel.getByRole('option', { name: 'Features' }).click();
    await panel.getByRole('button', { name: 'Copy everything' }).click();
    await expect(panel.getByRole('button', { name: 'Copied' })).toBeVisible({ timeout: 30_000 });
    const md = await panel.evaluate(() => navigator.clipboard.readText());
    expect(md).toContain('### 1. Features');
    expect(md).not.toContain('Pricing');
    await panel.getByRole('option', { name: /^All \d+$/ }).click();
    await panel.getByRole('button', { name: 'Other' }).click();
    await panel.screenshot(shot('3-export-other'));
    for (const tab of ['Colours', 'Motion', 'Stack', 'Sections'] as const) {
      await inspect(panel, tab);
      await panel.screenshot({ ...shot(`4-inspect-${tab.toLowerCase()}`), fullPage: true });
    }
    // Sections lists this capture's own sections, not the live page's, with nothing to recapture there.
    await expect(panel.locator('.result .history-item')).toHaveCount(5);
    await expect(panel.locator('.result').getByRole('button', { name: 'Capture', exact: true })).toHaveCount(0);

    // History lists the capture and opens it again.
    await panel.getByRole('button', { name: 'History: earlier captures' }).click();
    await expect(panel.getByRole('heading', { name: 'Captures' })).toBeVisible();
    await panel.screenshot(shot('5-history'));
    await panel.getByRole('listitem').getByRole('button').first().click();
    await expect(panel.getByRole('tab', { name: 'Export' })).toBeVisible();
    await panel.getByRole('button', { name: 'New capture' }).click();
    await expect(panel.getByRole('heading', { name: 'What do you want to capture?' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('the panel follows the dark colour scheme', async () => {
  const { context, extensionId } = await launchWithExtension();
  try {
    const { panel } = await openSiteAndPanel(context, extensionId, 'http://localhost:4321/landing.html');
    await panel.emulateMedia({ colorScheme: 'dark' });
    await panel.setViewportSize({ width: 420, height: 900 });
    expect(await panel.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(27, 24, 50)');
    await panel.screenshot(shot('1-choose-dark'));
  } finally {
    await context.close();
  }
});
