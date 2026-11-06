import { FullPageLoader } from '@/components/FullPageLoader/FullPageLoader';
import { useT } from '@/i18n';

/** The router's fallback while the first route chunk loads, labelled in the UI language. */
export function AppLoading() {
  const t = useT();
  return <FullPageLoader label={t.common.loadingApp} />;
}
