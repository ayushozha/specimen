import { installHooks } from '@specimen/core';

/** Deep-mode instrumentation for browsers without the DevTools Protocol (registered at document_start, MAIN world). */
export default defineUnlistedScript(() => {
  installHooks();
});
