import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Specimen',
    description: 'Capture any website section by section: screenshots, HTML, colour palette and tech stack.',
    // `debugger` drives the page through the Chrome DevTools Protocol (screenshots, viewports,
    // stylesheets, resources); no host permissions are needed on top of it.
    permissions: ['debugger', 'sidePanel', 'downloads', 'storage'],
    action: { default_title: 'Open Specimen' },
  },
});
