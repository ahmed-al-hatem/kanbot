import { useEffect, useRef } from 'react';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { useOnline, useRetryConnection } from '@/hooks/useConnection';
import { getT, useT } from '@/i18n';
import { toast } from '@/stores/toast';

/**
 * DESIGN §11 Offline (artboard S06): a full-width warning banner above the shell while
 * TanStack Query is offline, "Retry now", and a "Back online" toast on reconnect. Mutations
 * don't wait for the network (`networkMode: 'always'`), so the copy doesn't promise a sync.
 */
export function OfflineBanner() {
  const t = useT();
  const online = useOnline();
  const retry = useRetryConnection();
  const wasOnline = useRef(online);

  useEffect(() => {
    if (online && !wasOnline.current) toast.success(getT().shell.offline.backOnline);
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
          loadingText={t.shell.offline.reconnecting}
          onClick={() => {
            retry.mutate(undefined, {
              onError: () => toast.error(getT().shell.offline.stillOffline),
            });
          }}
        >
          {t.shell.offline.retry}
        </Button>
      }
    >
      {t.shell.offline.message}
    </Banner>
  );
}
