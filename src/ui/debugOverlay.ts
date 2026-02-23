import type { PluginDiagnostics } from '../types';

export class DebugOverlay {
  private root: HTMLDivElement;
  private content: HTMLDivElement;
  private collapsed = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'slp-debug-overlay';
    this.root.setAttribute('data-sitelen-layer-ui', 'overlay');
    this.root.setAttribute('aria-live', 'polite');

    const header = document.createElement('div');
    header.className = 'slp-debug-overlay__header';

    const title = document.createElement('strong');
    title.textContent = 'sitelen-layer diagnostics';

    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 'slp-debug-overlay__collapse';
    collapse.textContent = '–';
    collapse.setAttribute('aria-label', 'Collapse diagnostics overlay');
    collapse.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      collapse.textContent = this.collapsed ? '+' : '–';
      this.content.style.display = this.collapsed ? 'none' : 'block';
    });

    header.append(title, collapse);

    this.content = document.createElement('div');
    this.content.className = 'slp-debug-overlay__content';

    this.root.append(header, this.content);
  }

  mount(): void {
    if (this.root.isConnected) {
      return;
    }

    document.body.appendChild(this.root);
  }

  update(diagnostics: PluginDiagnostics): void {
    const scorePercent = Math.round(diagnostics.score * 100);
    const emojiCoveragePercent = Math.round(diagnostics.emojiCoverageRatio * 100);
    this.content.textContent = [
      `TP score: ${scorePercent}%`,
      `Threshold: ${Math.round(diagnostics.threshold * 100)}%`,
      `Eligible: ${diagnostics.eligible ? 'yes' : 'no'}`,
      `Tokens: ${diagnostics.totalTokens}`,
      `TP tokens: ${diagnostics.recognizedTokens}`,
      `Ignored candidates: ${diagnostics.ignoredCandidates}`,
      `Layer: ${diagnostics.activeLayer}`,
      `Layer source: ${diagnostics.modeSource}`,
      `Toggle mode: ${diagnostics.toggleMountMode}`,
      `Toggle size: ${diagnostics.toggleSize}`,
      diagnostics.toggleMountedIn ? `Toggle mount: ${diagnostics.toggleMountedIn}` : '',
      `Container: ${diagnostics.containerInfo}`,
      `Profile: ${diagnostics.matchedProfileId ?? diagnostics.profileId ?? 'none'}`,
      diagnostics.matchedProfileReason ? `Profile reason: ${diagnostics.matchedProfileReason}` : '',
      `Updated: ${diagnostics.lastUpdatedAt}`,
      `Observer batches: ${diagnostics.observerStats.batchesProcessed}`,
      `Observer mutations: ${diagnostics.observerStats.mutationsObserved}`,
      `Sitelen pona font: ${diagnostics.sitelenPonaFontReady ? 'ready' : 'missing'}`,
      `Sitelen pona render: ${diagnostics.sitelenPonaRenderMode}`,
      `Emoji replaced: ${diagnostics.emojiReplacementCount}`,
      `Emoji coverage: ${emojiCoveragePercent}%`,
      diagnostics.sitelenPonaWarning ? `Warning: ${diagnostics.sitelenPonaWarning}` : ''
    ]
      .filter(Boolean)
      .join('\n');
  }

  destroy(): void {
    this.root.remove();
  }
}
