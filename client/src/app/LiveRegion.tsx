import { useAnnouncer } from '@/stores/announcer';

/**
 * The single visually hidden live region at the root (DESIGN §10.4), fed by `announce()`.
 * Both regions stay mounted; the message node is keyed by id, so repeating the same text
 * ("KAN-1 moved…" twice) is still announced.
 */
export function LiveRegion() {
  const message = useAnnouncer((s) => s.message);
  const politeness = useAnnouncer((s) => s.politeness);
  const id = useAnnouncer((s) => s.id);

  return (
    <>
      <div
        className="visually-hidden"
        aria-live="polite"
        aria-atomic="true"
        data-testid="live-polite"
      >
        {politeness === 'polite' && message && <span key={id}>{message}</span>}
      </div>
      <div
        className="visually-hidden"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="live-assertive"
      >
        {politeness === 'assertive' && message && <span key={id}>{message}</span>}
      </div>
    </>
  );
}
