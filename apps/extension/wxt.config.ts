import { defineConfig } from 'wxt';

/** Firefox add-on id (stable across releases). */
const GECKO_ID = '{14f92d4e-015f-446a-a14f-d61e317a400d}';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  hooks: {
    // Safari has no side panel API: the panel opens in a window docked beside the page (see background.ts).
    'build:manifestGenerated': (wxt, manifest) => {
      if (wxt.config.browser !== 'safari') return;
      delete (manifest as { side_panel?: unknown }).side_panel;
      manifest.permissions = manifest.permissions?.filter((p) => p !== 'sidePanel');
    },
  },
  manifest: ({ browser, mode }) => {
    const base = {
      name: 'Specimen',
      description: 'Capture any website section by section: screenshots, HTML, motion, colours, tech stack and design-tool exports.',
      action: { default_title: 'Open Specimen' },
    };
    if (browser === 'firefox' || browser === 'safari') {
      return {
        ...base,
        // Standard extension APIs only; site access is asked for when a capture starts.
        permissions: ['scripting', 'activeTab', ...(browser === 'firefox' ? ['downloads'] : ['storage'])],
        optional_host_permissions: ['<all_urls>'],
        ...(browser === 'firefox' && {
          // 140 is the first Firefox that reads data_collection_permissions (required for new add-ons).
          browser_specific_settings: {
            gecko: { id: GECKO_ID, strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } },
            gecko_android: { strict_min_version: '142.0' },
          },
        }),
      };
    }
    return {
      ...base,
      // `debugger` drives the page through the Chrome DevTools Protocol (screenshots, viewports,
      // stylesheets, resources); no host permissions are needed on top of it.
      permissions: ['debugger', 'sidePanel', 'downloads', ...(mode === 'e2e' ? ['scripting', 'activeTab'] : [])],
      // Test builds only: lets the tests run the Firefox/Safari code path inside Chromium.
      ...(mode === 'e2e' && { host_permissions: ['<all_urls>'] }),
    };
  },
});
