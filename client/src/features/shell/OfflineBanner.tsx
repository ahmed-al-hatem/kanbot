import { useEffect, useRef } from 'react';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { useOnline, useRetryConnection } from '@/hooks/useConnection';
import { toast } from '@/stores/toast';

/**
 * DESIGN §11 Offline (artboard S06): a full-width warning banner above the shell while
 * TanStack Query is offline, "Retry now", and a "Back online" toast on reconnect.
 */
export function OfflineBanner() {
  const online = useOnline();
  const retry = useRetryConnection();
  const wasOnline = useRef(online);

  useEffect(() => {
    if (online && !wasOnline.current) toast.success('Back online · your changes are synced');
    wasOnline.current = online;
  }, [online]);

  if (online) return null;
  return (
    <Banner
      tone="warning"
      action={
        <Button
          variant="subtle"
          size="sm"
          loading={retry.isPending}
          loadingText="Reconnecting…"
          onClick={() => {
            retry.mutate(undefined, {
              onError: () => toast.error("Still offline. We'll reconnect as soon as the network is back."),
            });
          }}
        >
          Retry now
        </Button>
      }
    >
      You&apos;re offline. Changes will sync when you reconnect.
    </Banner>
  );
}
