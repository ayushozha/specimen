import * as core from '@specimen/core';

/** Loaded into an isolated world of the inspected page; the side panel calls into `__specimenCore`. */
export default defineUnlistedScript(() => {
  (globalThis as unknown as { __specimenCore: typeof core }).__specimenCore = core;
});
