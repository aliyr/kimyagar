import { OverlayShell } from './OverlayShell';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';

export function CustomerRequestOverlay() {
  const customer = useGameStore((s) => s.currentCustomer());

  return (
    <OverlayShell overlayId="customer_request" title={uiLabels.customerRequest}>
      <article className="kimi-letter">
        <p className="kimi-letter-name">{customer.nameFa}</p>
        <p className="kimi-letter-body">{customer.requestFa}</p>
      </article>
    </OverlayShell>
  );
}
