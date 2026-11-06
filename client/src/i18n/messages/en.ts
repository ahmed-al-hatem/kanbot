import type { ErrorCode } from '@/types/api';
import { plural } from '../plural';

/**
 * English messages: the source of truth. `Messages` is derived from this object, so a key added
 * here must be added to ar.ts too (TypeScript fails otherwise, and i18n.test.ts checks it at
 * runtime). Read them as `t.section.key` or `t.section.fn(n)`, never by string key.
 *
 * Parameters and plurals are functions. Plurals go through `plural()` (Intl.PluralRules), never
 * `n === 1 ? … : …`, so Arabic can use all six forms.
 *
 * R1: the i18n foundation (formatting, the language switcher, error fallbacks). R2: auth, the
 * shell, projects and the shared components they render. Backlog, todo, sprints (R3) and board,
 * history, AI, 404 (R4) move later. Every English output stays exactly as it was.
 */
const count = (n: number, one: string, other: string) => plural('en', n, { one, other });

const GENERIC = 'Something went wrong. Please try again.';

/** The API's English text is shown as it came (empty → the generic message). */
const asSent = (serverMessage: string) => serverMessage || GENERIC;

export const en = {
  language: {
    /** The switcher group (segmented control on auth pages). */
    label: 'Language',
    /** The sidebar item's accessible name, after the target language's own name. */
    change: (languageName: string) => `${languageName} — Change language`,
    /** Toast when the other language's chunk can't be downloaded (offline, a new deploy). */
    loadFailed: (languageName: string) =>
      `Couldn't load ${languageName}. Check your connection and try again.`,
  },

  count: {
    todos: (n: number) => count(n, `${n} todo`, `${n} todos`),
    /** Story points, short: "1 pt", "13 pts". */
    points: (n: number) => count(n, `${n} pt`, `${n} pts`),
    days: (n: number) => count(n, `${n} day`, `${n} days`),
    /** Story points, spoken in full (the points pill's screen-reader text). */
    storyPoints: (n: number) => count(n, `${n} story point`, `${n} story points`),
    /** The Projects header meta. */
    projects: (n: number) => count(n, `${n} project`, `${n} projects`),
    /** A project tile's footer. */
    backlogTodos: (n: number) => count(n, `${n} backlog todo`, `${n} backlog todos`),
  },

  dates: {
    /** Both days are already formatted ("Oct 20", "Nov 2"); an en dash between them (DESIGN §12). */
    range: (start: string, end: string) => `${start} – ${end}`,
    from: (start: string) => `From ${start}`,
    until: (end: string) => `Until ${end}`,
  },

  time: {
    justNow: 'just now',
    minutesAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => count(n, `${n} hour ago`, `${n} hours ago`),
    daysAgo: (n: number) => count(n, `${n} day ago`, `${n} days ago`),
    daysLeft: (n: number) => count(n, `${n} day left`, `${n} days left`),
    endsToday: 'Ends today',
    endedDaysAgo: (n: number) => count(n, `Ended ${n} day ago`, `Ended ${n} days ago`),
  },

  summary: {
    /** "5 todos · 13 pts" — the backlog header and group meta (BL-1). */
    todosAndPoints: (todos: string, points: string) => `${todos} · ${points}`,
  },

  /** Words the shared components use (src/components, src/app). Callers can pass their own. */
  common: {
    close: 'Close',
    cancel: 'Cancel',
    /** The toast's × button. */
    dismiss: 'Dismiss',
    open: 'Open',
    edit: 'Edit',
    delete: 'Delete',
    saving: 'Saving…',
    creating: 'Creating…',
    saveChanges: 'Save changes',
    clearSearch: 'Clear search',
    tryAgain: 'Try again',
    retrying: 'Retrying…',
    /** After "Couldn't …." when there is nothing more specific to say. */
    pleaseTryAgain: 'Please try again.',
    backToProjects: 'Back to Projects',
    /** Skeleton regions: "Loading projects". */
    loading: (what: string) => `Loading ${what}`,
    /** The full-page loader (startup `GET /auth/me`, the first route chunk). */
    loadingWorkspace: 'Loading your workspace',
    /** After a required field's label; the control itself has `aria-required`. */
    requiredMark: ' *',
    /** An avatar with no name. */
    unassigned: 'Unassigned',
    /** The points pill with no estimate. */
    notEstimated: 'Not estimated',
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    askAi: 'Ask AI',
    /** The validation summary for screen readers (DESIGN §10.4). */
    fieldsNeedAttention: (n: number) =>
      count(n, `${n} field needs attention`, `${n} fields need attention`),
  },

  /** Limits shared by every form (server rules, plan §2 #12). */
  validation: {
    maxChars: (n: number) => `Use ${n} characters or fewer`,
  },

  /** The tag input (labels). */
  tags: {
    added: (tag: string) => `Label ${tag} added`,
    removed: (tag: string) => `Label ${tag} removed`,
    alreadyAdded: (tag: string) => `Label ${tag} is already added`,
    limit: (max: number) => `You can add up to ${max} labels`,
    remove: (tag: string) => `Remove label ${tag}`,
  },

  /** DESIGN §11 "Page load error". `page` is a lower-case page name: "your projects". */
  pageError: {
    title: (page: string) => `We couldn't load ${page}`,
    text: "The server didn't respond or your connection dropped. Nothing you saved was lost — try again in a moment.",
    network: 'Network error · server unreachable',
    timeout: 'Timeout · no response in time',
    /** "Error 503 · Service unavailable"; `reason` may be the raw error code. */
    status: (status: number, reason: string) => `Error ${status} · ${reason}`,
    status500: 'Internal server error',
    status502: 'Bad gateway',
    status503: 'Service unavailable',
    status504: 'Gateway timeout',
  },

  auth: {
    tagline: 'Your sprint board with an AI teammate.',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    name: 'Name',
    namePlaceholder: 'Your name',
    confirmPassword: 'Confirm password',
    /** The page that hides behind a failed `GET /auth/me`: "We couldn't load your workspace". */
    workspace: 'your workspace',
    validation: {
      emailRequired: 'Enter your email',
      emailInvalid: 'Enter a valid email, like name@example.com',
      passwordRequired: 'Enter your password',
      nameRequired: 'Enter your name',
      passwordMin: 'Use at least 8 characters',
      confirmRequired: 'Confirm your password',
      passwordMismatch: 'Passwords do not match',
    },
    login: {
      pageTitle: 'Log in',
      title: 'Welcome back',
      subtitle: 'Log in to your sprint board',
      forgot: 'Forgot password?',
      submit: 'Log in',
      submitting: 'Logging in…',
      noAccount: 'No account?',
      createOne: 'Create one',
      /** 401 on `POST /auth/login` (the server's own wording). */
      invalidCredentials: 'Incorrect email or password.',
      sessionExpired: 'Your session has expired. Please log in again.',
    },
    register: {
      pageTitle: 'Sign up',
      title: 'Create your account',
      subtitle: 'Plan sprints with an AI teammate',
      passwordHelp: 'At least 8 characters. Numbers and symbols make it stronger.',
      submit: 'Create account',
      submitting: 'Creating account…',
      haveAccount: 'Already have an account?',
      logIn: 'Log in',
      /** 409 on `POST /auth/register`, always under Email (AUTH-1; the server's own wording). */
      emailTaken: 'An account with this email already exists.',
      strength: {
        /** Read by screen readers: "Password strength: Good". */
        spoken: (level: string) => `Password strength: ${level}`,
        tooShort: 'Too short',
        fair: 'Fair',
        good: 'Good',
        strong: 'Strong',
      },
    },
    forgot: {
      pageTitle: 'Reset password',
      title: 'Reset your password',
      subtitle: "Enter your account email and we'll send you a reset link.",
      submit: 'Send reset link',
      sending: 'Sending…',
      /** Live-region announcement. */
      sent: 'Reset link sent',
      checkEmail: 'Check your email',
      /** "If an account exists for <b>email</b>, a reset link is on its way." */
      sentBefore: 'If an account exists for ',
      sentAfter: ', a reset link is on its way.',
      resend: 'Resend link',
      resendIn: (seconds: number) => `Resend link in ${seconds}s`,
      backToLogin: 'Back to log in',
      demoNote: "Demo only — password reset isn't available in this version.",
    },
    sessionExpired: {
      title: 'Your session has expired',
      text: "Log in again to continue. You'll come back to this page.",
      action: 'Log in again',
    },
    /** Toast after signing up (AUTH-1). */
    welcome: (firstName: string) => `Welcome to Kanbot, ${firstName}`,
  },

  shell: {
    nav: {
      label: 'Main',
      project: 'Project',
      backlog: 'Backlog',
      board: 'Active Sprint',
      sprints: 'Sprints',
      projects: 'Projects',
    },
    skipLink: 'Skip to main content',
    /** The mobile hamburger. */
    navigation: 'Navigation',
    switcher: {
      /** WCAG 2.5.3: the name contains all the visible text, name and key. */
      label: (name: string, key: string) => `Switch project, current: ${name} ${key}`,
      choose: 'Choose a project',
      menu: 'Projects',
      heading: 'Your projects',
      loading: 'Loading projects…',
      loadFailed: "Couldn't load projects",
      empty: 'No projects yet',
      current: 'Current',
      viewAll: 'View all projects',
    },
    profile: {
      menu: 'Account',
      signedInAs: (email: string) => `Signed in as ${email}`,
      shortcuts: 'Keyboard shortcuts',
      logOut: 'Log out',
    },
    offline: {
      message: "You're offline. Changes can't be saved until you reconnect.",
      retry: 'Retry now',
      reconnecting: 'Reconnecting…',
      stillOffline: "Still offline. We'll reconnect as soon as the network is back.",
      backOnline: 'Back online',
    },
    shortcuts: {
      title: 'Keyboard shortcuts',
      description: "They work anywhere in the app, except while you're typing in a field.",
      /** Between the keys of a sequence: "g then b". */
      then: 'then',
      note: 'On the board and the backlog, focus a card or a row and use the arrow keys to move it; Enter opens it.',
      create: 'Create a todo (on Projects: a new project)',
      search: 'Search the backlog or your projects',
      goBoard: 'Go to the Active Sprint board',
      goBacklog: 'Go to the Backlog',
      goSprints: 'Go to Sprints',
      help: 'Show these shortcuts',
      /** Live-region announcements when a shortcut can't act. */
      needProject: 'Open a project first to use this shortcut',
      nothingToCreate: 'There is nothing to create here',
      noSearch: 'There is no search on this page',
    },
    /** ProjectLayout's error state. */
    project: 'Project',
    thisProject: 'this project',
  },

  projects: {
    title: 'Projects',
    newProject: 'New project',
    /** Skeleton: "Loading projects"; page error: "We couldn't load your projects". */
    loadingName: 'projects',
    pageName: 'your projects',
    empty: {
      title: 'No projects yet',
      text: 'Create your first project to start planning sprints.',
      action: 'Create your first project',
    },
    search: {
      label: 'Search projects',
      placeholder: 'Search by name or key',
      noMatch: (query: string) => `No projects match “${query}”`,
    },
    tile: {
      menu: (name: string) => `${name} actions`,
      actions: (name: string) => `Actions for ${name}`,
      noDescription: 'No description yet.',
      noActiveSprint: 'No active sprint',
      /** The live lozenge: "Sprint 3 active". */
      activeSprint: (sprint: string) => `${sprint} active`,
    },
    toast: {
      created: (name: string) => `${name} created`,
      updated: (name: string) => `${name} updated`,
      deleted: (name: string) => `${name} deleted`,
      deleteFailed: (name: string, reason: string) => `Couldn't delete ${name}. ${reason}`,
    },
    delete: {
      title: (name: string) => `Delete ${name}?`,
      /** While the dialog animates out with no project. */
      fallbackName: 'project',
      /** "This permanently deletes <b>name</b> (KEY) with all of its sprints and its 3 todos. …" */
      before: 'This permanently deletes ',
      after: (key: string, todos: number) =>
        ` (${key}) with all of its sprints${todos > 0 ? ` and its ${count(todos, '1 todo', `${todos} todos`)}` : ' and todos'}. This can't be undone.`,
      confirm: 'Delete project',
    },
    form: {
      createTitle: 'Create project',
      editTitle: 'Edit project',
      create: 'Create project',
      /** The preview's name while the field is empty. */
      untitled: 'New project',
      previewCreate: (key: string) => `Todos will be numbered ${key}-1`,
      previewEdit: (key: string) => `New todos will be numbered ${key}-…`,
      name: 'Project name',
      namePlaceholder: 'e.g. Kanbot Mobile',
      key: 'Key',
      keyHelpCreate: 'Optional · 2–6 letters. Leave it empty to generate one from the name.',
      keyHelpEdit: "Changing the key doesn't change existing todo keys.",
      description: 'Description',
      descriptionPlaceholder: 'What is this project about?',
      starter: 'Generate a starter backlog with AI',
      starterHelp: 'Uses the description to draft first todos. You review them before anything is added.',
      /** Generate todos' prompt for a new project without a usable description. */
      starterPrompt: (name: string) => `First todos for a new project called "${name}"`,
      nameRequired: 'Give your project a name',
      keyInvalid: 'Key must be 2–6 letters',
      /** 409 on create / update, always under Key (PRJ-2). */
      keyTaken: 'This key is already used',
    },
  },

  errors: {
    generic: GENERIC,
    /** Codes the client itself produces (api/client.ts). */
    byCode: {
      NETWORK_ERROR: 'Cannot reach the server. Is it running?',
      TIMEOUT: 'The server took too long to respond. Please try again.',
    },
    /**
     * Server codes, given the server's message. English shows the API's text as it came (it is
     * English and "safe to show in the UI"); Arabic never shows it and says the code's meaning.
     */
    server: {
      VALIDATION_ERROR: asSent,
      UNAUTHORIZED: asSent,
      NOT_FOUND: asSent,
      CONFLICT: asSent,
      RATE_LIMITED: asSent,
      AI_ERROR: asSent,
      INTERNAL_ERROR: asSent,
    } satisfies Record<ErrorCode, (serverMessage: string) => string>,
    /**
     * `details[]` messages per top-level field (`labels.3` → `labels`), given the server's text.
     * The client validates the same rules first, so these show only when the two disagree.
     */
    fields: {
      name: asSent,
      email: asSent,
      password: asSent,
      key: asSent,
      description: asSent,
    } as Readonly<Record<string, (serverMessage: string) => string>>,
    /** A field not listed in `fields`. */
    field: asSent,
  },
};

/** Recursively widens string literals to `string`, keeping functions and object shapes. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T;

export type Messages = Widen<typeof en>;
