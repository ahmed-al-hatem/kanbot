import { useState, type ReactNode } from 'react';
import { ApiError } from '@/api/errors';
import { Avatar } from '@/components/Avatar/Avatar';
import { Banner } from '@/components/Banner/Banner';
import { Button, ButtonLink, IconButton } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { PointsPill } from '@/components/Chip/PointsPill';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { Dialog, type DialogSize } from '@/components/Dialog/Dialog';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Checkbox } from '@/components/Field/Checkbox';
import { Field } from '@/components/Field/Field';
import { Input, Textarea } from '@/components/Field/Input';
import { DateInput, Select } from '@/components/Field/Select';
import { TagInput } from '@/components/Field/TagInput';
import { Lozenge, type LozengeTone } from '@/components/Lozenge/Lozenge';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/Menu/Menu';
import { PageError } from '@/components/PageError/PageError';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { Skeleton, SkeletonRegion } from '@/components/Skeleton/Skeleton';
import { Spinner } from '@/components/Spinner/Spinner';
import { StatTile } from '@/components/StatTile/StatTile';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { cx } from '@/lib/cx';
import { useTheme, type Theme } from '@/stores/theme';
import styles from './UiPage.module.css';

/**
 * Dev-only catalogue of the design system (route `/__ui`, never in the production build).
 * Every component and state is rendered once per theme, side by side, to compare with the
 * canvas. Dialogs and menus portal to <body>, so they follow the global theme toggle.
 */
export function UiPage() {
  const [panes, setPanes] = useState<'both' | Theme>('both');
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const shown: Theme[] = panes === 'both' ? ['light', 'dark'] : [panes];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className="page-title">UI kit</h1>
        <span className={styles.meta}>Dev only · phase 1 · compare with the canvas</span>
        <span className={styles.spacer} />
        <div role="group" aria-label="Panes" className={styles.segmented}>
          {(['both', 'light', 'dark'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={panes === value ? 'primary' : 'subtle'}
              aria-pressed={panes === value}
              onClick={() => {
                setPanes(value);
              }}
            >
              {value === 'both' ? 'Both' : value === 'light' ? 'Light' : 'Dark'}
            </Button>
          ))}
        </div>
        <Button size="sm" icon="theme" onClick={toggle}>
          Overlays: {theme}
        </Button>
      </header>
      <div className={styles.panes}>
        {shown.map((paneTheme) => (
          <div
            key={paneTheme}
            className={cx(styles.pane, paneTheme)}
            style={{ colorScheme: paneTheme }}
          >
            <h2 className={styles.paneTitle}>{paneTheme === 'light' ? 'Light' : 'Dark'}</h2>
            <Catalogue />
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className="group-title">{title}</h3>
      {note && <p className={styles.meta}>{note}</p>}
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      {label && <span className={styles.rowLabel}>{label}</span>}
      {children}
    </div>
  );
}

function useFakeRequest(ms = 1500) {
  const [pending, setPending] = useState(false);
  const run = (then?: () => void) => {
    setPending(true);
    setTimeout(() => {
      setPending(false);
      then?.();
    }, ms);
  };
  return [pending, run] as const;
}

const LOZENGES: LozengeTone[] = ['gray', 'blue', 'green', 'purple', 'orange', 'teal', 'magenta'];
const DIALOG_SIZES: DialogSize[] = [
  'session',
  'complete',
  'sprint',
  'project',
  'todo',
  'generate',
  'plan',
];

function Catalogue() {
  return (
    <>
      <ButtonsSection />
      <FieldsSection />
      <OverlaysSection />
      <DisplaySection />
      <StatesSection />
    </>
  );
}

function ButtonsSection() {
  const [saving, save] = useFakeRequest();
  return (
    <>
      <Section
        title="Button"
        note="Hover, press (scale .97) and Tab for the focus ring. Loading keeps the width."
      >
        <Row label="Variants">
          <Button variant="primary">Primary</Button>
          <Button variant="neutral">Neutral</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ai">Ask AI</Button>
          <Button variant="danger" icon="delete">
            Delete
          </Button>
        </Row>
        <Row label="Disabled">
          <Button variant="primary" disabled>
            Primary
          </Button>
          <Button variant="neutral" disabled>
            Neutral
          </Button>
          <Button variant="subtle" disabled>
            Subtle
          </Button>
          <Button variant="ai" disabled>
            Ask AI
          </Button>
          <Button variant="danger" disabled>
            Delete
          </Button>
        </Row>
        <Row label="Loading">
          <Button variant="primary" loading loadingText="Saving…">
            Save changes
          </Button>
          <Button variant="neutral" loading loadingText="Creating…">
            Create
          </Button>
          <Button variant="ai" loading>
            Generate
          </Button>
          <Button
            variant="primary"
            loading={saving}
            loadingText="Saving…"
            onClick={() => {
              save();
            }}
          >
            Click to save
          </Button>
        </Row>
        <Row label="Sizes">
          <Button variant="primary" size="sm">
            Small 28
          </Button>
          <Button variant="primary">Medium 32</Button>
          <Button variant="primary" size="lg">
            Large 40
          </Button>
          <Button icon="add">Create sprint</Button>
          <ButtonLink to="/__ui" variant="subtle" icon="arrow-left">
            Link as button
          </ButtonLink>
        </Row>
      </Section>
      <Section title="IconButton" note="aria-label is required by the type.">
        <Row>
          <IconButton icon="show-more-horizontal" aria-label="More actions" />
          <IconButton icon="cross" aria-label="Close" variant="neutral" />
          <IconButton icon="add" aria-label="Create" variant="primary" />
          <IconButton icon="ai-sparkle" aria-label="Ask AI" variant="ai" />
          <IconButton icon="delete" aria-label="Delete" variant="danger" />
          <IconButton icon="show-more-horizontal" aria-label="Row actions" size="sm" />
          <IconButton icon="pencil" aria-label="Edit (disabled)" disabled />
        </Row>
      </Section>
    </>
  );
}

function FieldsSection() {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [labels, setLabels] = useState(['frontend', 'auth']);
  const nameError = touched && name.trim() === '' ? 'Give your project a name' : undefined;

  return (
    <Section title="Fields" note="Validate on blur: focus the name, then leave it empty.">
      <div className={styles.grid2}>
        <Field label="Project name" required error={nameError}>
          <Input
            placeholder="e.g. Kanbot Mobile"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            onBlur={() => {
              setTouched(true);
            }}
          />
        </Field>
        <Field
          label="Key"
          required
          help="2–6 letters. Changing it doesn't change existing todo keys."
        >
          <Input defaultValue="KAN" />
        </Field>
        <Field label="Email" error="Enter a valid email address">
          <Input type="email" defaultValue="sara@" autoComplete="email" />
        </Field>
        <Field label="Disabled">
          <Input defaultValue="Read only value" disabled />
        </Field>
        <Field label="Priority">
          <Select defaultValue="medium">
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Status" help="Move it into the active sprint to set a status">
          <Select defaultValue="todo" disabled>
            <option value="todo">To Do</option>
          </Select>
        </Field>
        <Field label="Due date">
          <DateInput defaultValue="2026-11-17" />
        </Field>
        <Field label="Due date" error="This todo is overdue">
          <DateInput defaultValue="2026-10-01" />
        </Field>
      </div>
      <Field label="Description" help="Up to 5000 characters">
        <Textarea placeholder="What is this project about?" />
      </Field>
      <Field
        label="Labels"
        help="Press Enter or , to add a label, Backspace to remove the last one"
      >
        <TagInput value={labels} onChange={setLabels} placeholder="Add a label" />
      </Field>
      <Row>
        <Checkbox label="Generate an AI summary" defaultChecked />
        <Checkbox
          label="Let Kanbot draft a starter backlog"
          description="Uses the description to suggest 6 todos."
        />
        <Checkbox label="Disabled" disabled />
      </Row>
    </Section>
  );
}

function OverlaysSection() {
  const [openSize, setOpenSize] = useState<DialogSize | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, runDelete] = useFakeRequest();
  const [creating, runCreate] = useFakeRequest();

  return (
    <>
      <Section
        title="Dialog"
        note="Esc, blanket click and × close; Tab is trapped; focus returns to the opener."
      >
        <Row>
          {DIALOG_SIZES.map((size) => (
            <Button
              key={size}
              onClick={() => {
                setOpenSize(size);
              }}
            >
              {size}
            </Button>
          ))}
        </Row>
        <Dialog
          open={openSize !== null}
          onOpenChange={(open) => {
            if (!open) setOpenSize(null);
          }}
          size={openSize ?? 'project'}
          title="Create project"
          footerStart={
            <Button variant="danger" icon="delete">
              Delete
            </Button>
          }
          footer={
            <>
              <Button
                variant="subtle"
                onClick={() => {
                  setOpenSize(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={creating}
                loadingText="Creating…"
                onClick={() => {
                  runCreate(() => {
                    setOpenSize(null);
                  });
                }}
              >
                Create project
              </Button>
            </>
          }
        >
          <p className={styles.meta}>
            Max width: {openSize} (DESIGN §3.5). The first field has data-autofocus.
          </p>
          <Field label="Project name" required>
            <Input data-autofocus placeholder="e.g. Kanbot Mobile" />
          </Field>
          <Field label="Description">
            <Textarea />
          </Field>
        </Dialog>
      </Section>
      <Section
        title="ConfirmDialog"
        note="AlertDialog: Cancel is focused; no blanket dismiss; stays open while pending."
      >
        <Row>
          <Button
            variant="danger"
            icon="delete"
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            Delete project
          </Button>
        </Row>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete Kanbot?"
          description="Its 24 todos and 3 sprints will be deleted too. This can't be undone."
          confirmLabel="Delete project"
          pendingLabel="Deleting…"
          pending={deleting}
          onConfirm={() => {
            runDelete(() => {
              setConfirmOpen(false);
            });
          }}
        />
      </Section>
      <Section title="Menu" note="↑ ↓ Home End move, Esc closes and refocuses the trigger.">
        <Row>
          <Menu
            label="KAN-12 actions"
            trigger={<IconButton icon="show-more-horizontal" aria-label="Actions for KAN-12" />}
          >
            <MenuItem icon="pencil">Open details</MenuItem>
            <MenuLabel>Move to</MenuLabel>
            <MenuItem icon="arrow-right">Sprint 4</MenuItem>
            <MenuItem icon="arrow-right">Backlog</MenuItem>
            <MenuItem disabled>Move to top</MenuItem>
            <MenuSeparator />
            <MenuItem icon="delete" tone="danger">
              Delete
            </MenuItem>
          </Menu>
          <Menu
            label="Profile"
            align="start"
            trigger={<Button icon="chevron-down">Sara Ahmed</Button>}
          >
            <MenuItem icon="theme">Switch theme</MenuItem>
            <MenuItem icon="log-out">Log out</MenuItem>
          </Menu>
        </Row>
      </Section>
    </>
  );
}

function DisplaySection() {
  const [progress, setProgress] = useState(18);
  return (
    <>
      <Section title="Lozenge">
        <Row>
          {LOZENGES.map((tone) => (
            <Lozenge key={tone} tone={tone}>
              {tone}
            </Lozenge>
          ))}
        </Row>
        <Row>
          <Lozenge tone="gray">Planned</Lozenge>
          <Lozenge tone="blue" live>
            Active
          </Lozenge>
          <Lozenge tone="green">Completed</Lozenge>
          <Lozenge>KAN</Lozenge>
        </Row>
      </Section>
      <Section title="Chip and PointsPill">
        <Row>
          <Chip leading={<TypeIcon type="story" size={12} decorative />}>Story</Chip>
          <Chip icon="priority-highest" tone="danger">
            Urgent
          </Chip>
          <Chip icon="priority-medium">Medium</Chip>
          <Chip icon="calendar" tone="danger">
            Overdue
          </Chip>
          <Chip tone="purple">design</Chip>
          <Chip
            tone="teal"
            onRemove={() => {
              /* demo */
            }}
            removeLabel="Remove label api"
          >
            api
          </Chip>
        </Row>
        <Row>
          <PointsPill points={1} />
          <PointsPill points={3} />
          <PointsPill points={13} />
          <PointsPill points={null} />
        </Row>
      </Section>
      <Section title="Avatar" note="Hover for the spring scale.">
        <Row>
          <Avatar name="Sara Ahmed" size={24} colorIndex={0} />
          <Avatar name="Omar Malik" size={28} colorIndex={1} />
          <Avatar name="Lina Karim" size={32} colorIndex={2} />
          <Avatar name="Yusuf" size={32} colorIndex={3} />
          <Avatar size={32} />
        </Row>
      </Section>
      <Section title="ProgressBar">
        <ProgressBar
          value={progress}
          max={32}
          height={8}
          label="Sprint 3 progress"
          valueText={`${progress} of 32 points done`}
        />
        <ProgressBar value={24} max={30} height={6} label="Sprint 1 progress" />
        <ProgressBar value={9} max={10} height={4} label="Project progress" />
        <ProgressBar value={36} max={30} height={8} label="Planned capacity" over />
        <Row>
          <Button
            size="sm"
            onClick={() => {
              setProgress(Math.round(Math.random() * 32));
            }}
          >
            Change value
          </Button>
        </Row>
      </Section>
      <Section title="StatTile">
        <div className={styles.grid4}>
          <StatTile index={0} label="Completed todos" value="9" />
          <StatTile index={1} label="Points done" value="24 / 30" />
          <StatTile index={2} label="Carried over" value="2 todos" />
          <StatTile index={3} label="Completion" value="80%" tone="success" />
        </div>
        <div className={styles.grid2}>
          <StatTile size="sm" label="Done" value="7 todos" tone="success" />
          <StatTile size="sm" label="Not finished" value="3 todos" />
        </div>
      </Section>
      <Section title="Spinner">
        <Row>
          <Spinner />
          <Spinner size={20} />
          <Spinner size={24} label="Loading your workspace" />
        </Row>
      </Section>
    </>
  );
}

const networkError = new ApiError({
  status: 0,
  code: 'NETWORK_ERROR',
  message: 'Cannot reach the server.',
});
const serverError = new ApiError({
  status: 503,
  code: 'INTERNAL_ERROR',
  message: 'Service unavailable',
});

function StatesSection() {
  const [retrying, retry] = useFakeRequest();
  return (
    <>
      <Section title="Skeleton" note="Board and backlog layouts inside a role=status region.">
        <SkeletonRegion label="board">
          <div className={styles.grid4}>
            {[0, 1, 2, 3].map((column) => (
              <div key={column} className={styles.skeletonColumn}>
                <Skeleton blockSize={16} inlineSize="50%" />
                <Skeleton blockSize={72} radius="xlarge" />
                <Skeleton blockSize={72} radius="xlarge" opacity={0.7} />
                <Skeleton blockSize={72} radius="xlarge" opacity={0.4} />
              </div>
            ))}
          </div>
        </SkeletonRegion>
        <SkeletonRegion label="backlog">
          <div className={styles.skeletonColumn}>
            <Skeleton blockSize={20} inlineSize="30%" />
            {[0, 1, 2].map((rowIndex) => (
              <Skeleton key={rowIndex} blockSize={40} />
            ))}
          </div>
        </SkeletonRegion>
      </Section>
      <Section title="EmptyState">
        <EmptyState
          icon="board"
          title="No active sprint"
          description="Start a planned sprint from the backlog to see its board here."
          actions={
            <>
              <Button>Go to Backlog</Button>
              <Button variant="primary">Start Sprint 4</Button>
            </>
          }
        />
        <EmptyState
          variant="dashed"
          icon="search"
          headingLevel={3}
          title="No projects match “mobile”"
          actions={<Button variant="subtle">Clear search</Button>}
        />
      </Section>
      <Section title="PageError">
        <PageError
          page="backlog"
          error={serverError}
          retrying={retrying}
          onRetry={() => {
            retry();
          }}
        />
        <PageError page="projects" error={networkError} backTo={false} onRetry={() => undefined} />
      </Section>
      <Section title="Banner">
        <Banner
          tone="warning"
          action={
            <Button
              variant="subtle"
              size="sm"
              loading={retrying}
              loadingText="Reconnecting…"
              onClick={() => {
                retry();
              }}
            >
              Retry now
            </Button>
          }
        >
          You&apos;re offline. Changes can&apos;t be saved until you reconnect.
        </Banner>
        <Banner
          tone="danger"
          layout="inline"
          action={
            <Button variant="subtle" size="sm">
              Retry
            </Button>
          }
        >
          Couldn&apos;t save KAN-18. Check your connection and try again — your edits are still
          here.
        </Banner>
      </Section>
    </>
  );
}
