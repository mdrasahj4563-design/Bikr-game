export interface AdsgramController {
  show: () => Promise<{ done: boolean; description?: string; state?: string; error?: boolean }>;
  destroy?: () => void;
}

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: string; debug?: boolean }) => AdsgramController;
    };
  }
}

export interface AdExecutionResult {
  mode: 'live_sdk' | 'preview_player';
  rewarded: boolean;
  reason?: string;
}

/**
 * Checks whether the native Adsgram Web SDK is loaded on window and a numeric blockId is configured.
 * When running inside Telegram Mini App with the Adsgram script tag and real blockId, it calls window.Adsgram.init({ blockId }).show().
 * Otherwise returns mode: 'preview_player' so the user can experience the exact opt-in rewarded view flow in the web preview.
 */
export async function tryRunLiveAdsgramSdk(blockId: string): Promise<AdExecutionResult> {
  const trimmed = blockId.trim();
  if (typeof window !== 'undefined' && window.Adsgram && /^\d+$/.test(trimmed)) {
    try {
      const controller = window.Adsgram.init({ blockId: trimmed });
      const result = await controller.show();
      return {
        mode: 'live_sdk',
        rewarded: Boolean(result?.done && !result?.error),
        reason: result?.description,
      };
    } catch (err) {
      return {
        mode: 'live_sdk',
        rewarded: false,
        reason: err instanceof Error ? err.message : 'Adsgram session closed before reward completion.',
      };
    }
  }

  return {
    mode: 'preview_player',
    rewarded: false,
  };
}
