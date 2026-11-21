type ScreenshotTabs = Pick<typeof chrome.tabs, 'captureVisibleTab' | 'get' | 'onActivated' | 'onDetached' | 'onRemoved' | 'onUpdated'>;

export class CaptureTargetChangedError extends Error {
  constructor() {
    super('The selected tab changed during capture. Return to it and scan again.');
  }
}

/** Safari snapshots the active tab in a window, so verify and monitor the intended tab. */
export class SafariCaptureTarget {
  changed = false;
  private url = '';
  private windowId: number | null = null;
  private expectedReload = false;

  constructor(private tabs: ScreenshotTabs, private tabId: number) {}

  get watching(): boolean { return this.windowId !== null; }

  private onActivated = (info: chrome.tabs.OnActivatedInfo) => {
    if (info.windowId === this.windowId && info.tabId !== this.tabId) this.changed = true;
  };

  private onTargetLeft = (id: number) => {
    if (id === this.tabId) this.changed = true;
  };

  private onUpdated = (id: number, change: chrome.tabs.OnUpdatedInfo) => {
    if (id !== this.tabId) return;
    if (change.url !== undefined && change.url !== this.url) this.changed = true;
    if (change.status === 'loading') {
      if (!this.expectedReload) this.changed = true;
      this.expectedReload = false;
    }
  };

  async start(url: string): Promise<number> {
    this.url = url;
    this.changed = false;
    this.tabs.onActivated.addListener(this.onActivated);
    this.tabs.onDetached.addListener(this.onTargetLeft);
    this.tabs.onRemoved.addListener(this.onTargetLeft);
    this.tabs.onUpdated.addListener(this.onUpdated);
    const tab = await this.tabs.get(this.tabId).catch(() => undefined);
    this.windowId = tab?.windowId ?? null;
    return this.check(tab);
  }

  stop(): void {
    this.tabs.onActivated.removeListener(this.onActivated);
    this.tabs.onDetached.removeListener(this.onTargetLeft);
    this.tabs.onRemoved.removeListener(this.onTargetLeft);
    this.tabs.onUpdated.removeListener(this.onUpdated);
    this.windowId = null;
  }

  private check(tab: chrome.tabs.Tab | undefined): number {
    if (this.changed || !tab?.active || tab.windowId !== this.windowId || (tab.url !== undefined && tab.url !== this.url)) {
      this.changed = true;
      throw new CaptureTargetChangedError();
    }
    return tab.windowId;
  }

  checkDocument(url: unknown): void {
    if (this.changed || url !== this.url) {
      this.changed = true;
      throw new CaptureTargetChangedError();
    }
  }

  async snapshot(): Promise<string> {
    const windowId = this.check(await this.tabs.get(this.tabId).catch(() => undefined));
    try {
      return await this.tabs.captureVisibleTab(windowId, { format: 'png' });
    } finally {
      this.check(await this.tabs.get(this.tabId).catch(() => undefined));
    }
  }

  async reload(reloadTab: () => Promise<void>): Promise<void> {
    this.expectedReload = true;
    try {
      await reloadTab();
    } finally {
      this.expectedReload = false;
    }
  }
}
