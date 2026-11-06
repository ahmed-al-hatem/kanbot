import type { Ref } from 'react';
import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { IconButton } from '@/components/Button/Button';
import { Logo } from '@/components/Logo/Logo';
import { useT } from '@/i18n';
import { NAV_ID } from './Sidebar';
import styles from './AppShell.module.css';

interface MobileTopBarProps {
  navOpen: boolean;
  onToggleNav: () => void;
  /** Ask AI is project-scoped (the chat runs against a project), so it shows only inside one. */
  inProject: boolean;
  hamburgerRef: Ref<HTMLButtonElement>;
}

/** DESIGN §13 mobile (≤ 760px): 56px bar with the hamburger, the logo and Ask AI. Hidden above. */
export function MobileTopBar({ navOpen, onToggleNav, inProject, hamburgerRef }: MobileTopBarProps) {
  const t = useT();
  return (
    <div className={styles.topBar}>
      <IconButton
        ref={hamburgerRef}
        icon="menu"
        aria-label={t.shell.navigation}
        aria-expanded={navOpen}
        aria-controls={NAV_ID}
        onClick={onToggleNav}
      />
      <Logo size={24} wordmark />
      <span className={styles.topBarSpacer} />
      {inProject && <AskAiButton compact />}
    </div>
  );
}
