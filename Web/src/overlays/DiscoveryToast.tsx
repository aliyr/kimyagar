import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

const TOAST_MS = 1800;

export function DiscoveryToast() {
  const first = useGameStore((s) => s.discoveryQueue[0]);

  useEffect(() => {
    if (!first) return;
    const id = window.setTimeout(() => {
      useGameStore.getState().popDiscovery();
    }, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [first]);

  if (!first) return null;

  return (
    <div className="kimi-discovery-toast" data-testid="discovery-toast" aria-live="polite">
      {first.textFa}
    </div>
  );
}
