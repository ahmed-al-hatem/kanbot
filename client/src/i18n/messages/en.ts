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
 * shell, projects and the shared components they render. R3: the backlog, Todo details, the
 * sprint form / start / delete and the drag-and-drop announcements. R4: the board, Complete
 * sprint, Sprints history, the AI drawer and dialogs, 404 and the error pages. Every English
 * output stays exactly as it was.
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
    /** A sprint's length when it is whole weeks (the sprint form's hint). */
    weeks: (n: number) => count(n, `${n} week`, `${n} weeks`),
    /** Story points, spoken in full (the points pill's screen-reader text). */
    storyPoints: (n: number) => count(n, `${n} story point`, `${n} story points`),
    /** The Projects header meta. */
    projects: (n: number) => count(n, `${n} project`, `${n} projects`),
    /** A project tile's footer. */
    backlogTodos: (n: number) => count(n, `${n} backlog todo`, `${n} backlog todos`),
    /** The Sprints page header meta. */
    sprints: (n: number) => count(n, `${n} sprint`, `${n} sprints`),
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
    deleting: 'Deleting…',
    clearSearch: 'Clear search',
    tryAgain: 'Try again',
    /** The save-error bar's button (Todo details). */
    retry: 'Retry',
    retrying: 'Retrying…',
    undo: 'Undo',
    /** After "Couldn't …." when there is nothing more specific to say. */
    pleaseTryAgain: 'Please try again.',
    backToProjects: 'Back to Projects',
    /** Skeleton regions: "Loading projects". */
    loading: (what: string) => `Loading ${what}`,
    /** The full-page loader (startup `GET /auth/me`, the first route chunk). */
    loadingWorkspace: 'Loading your workspace',
    /** The router's fallback while the first route chunk loads. */
    loadingApp: 'Loading Kanbot',
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
      starterHelp:
        'Uses the description to draft first todos. You review them before anything is added.',
      /** Generate todos' prompt for a new project without a usable description. */
      starterPrompt: (name: string) => `First todos for a new project called "${name}"`,
      nameRequired: 'Give your project a name',
      keyInvalid: 'Key must be 2–6 letters',
      /** 409 on create / update, always under Key (PRJ-2). */
      keyTaken: 'This key is already used',
    },
  },

  /** The todo enums and Todo details (BL-3, BL-4). */
  todos: {
    type: { story: 'Story', task: 'Task', bug: 'Bug' },
    priority: { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' },
    status: { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' },
    /** A sprint in the Sprint select: "Sprint 4 (planned)". */
    sprintOption: {
      active: (name: string) => `${name} (active)`,
      planned: (name: string) => `${name} (planned)`,
      completed: (name: string) => `${name} (completed)`,
    },
    toast: {
      saved: (key: string) => `${key} saved`,
      deleted: (key: string) => `${key} deleted`,
      deleteFailed: (key: string, reason: string) => `Couldn't delete ${key}. ${reason}`,
    },
    /** 404 on a todo request (deleted meanwhile, e.g. in another tab), given the server's text. */
    notFound: asSent,
    delete: {
      title: (key: string) => `Delete ${key}?`,
      /** The title while the dialog animates out with no todo. */
      fallbackKey: 'todo',
      /** "This permanently deletes <b>KAN-12</b> “Title”. This can't be undone." */
      before: 'This permanently deletes ',
      after: (title: string) => ` “${title}”. This can't be undone.`,
      confirm: 'Delete todo',
    },
    details: {
      /** Dialog title and `document.title` while the todo loads. */
      dialogTitle: 'Todo details',
      /** Skeleton: "Loading todo"; page error: "We couldn't load this todo". */
      loadingName: 'todo',
      pageName: 'this todo',
      /** "Task · created Nov 2, 2026". */
      meta: (type: string, date: string) => `${type} · created ${date}`,
      title: 'Title',
      description: 'Description',
      descriptionPlaceholder: 'Add more detail…',
      improve: 'Improve this todo',
      improveHint: 'Ask Kanbot for a clearer title, description and acceptance criteria.',
      sprint: 'Sprint',
      /** The Sprint select's fallback while the sprints load. */
      currentSprint: 'Current sprint',
      completedHelp: "Todos of a completed sprint can't be moved or change status",
      status: 'Status',
      statusHelp: 'Move it into the active sprint to set a status',
      priority: 'Priority',
      type: 'Type',
      storyPoints: 'Story points',
      noPoints: 'None',
      labels: 'Labels',
      /** `{enter}`-style tokens become <kbd> keys (components/KeyHint). */
      labelsHelp: '{enter} or {comma} adds a label, {backspace} removes the last one',
      labelPlaceholder: 'Add a label',
      dueDate: 'Due date',
      overdueBy: (n: number) => `Overdue by ${count(n, `${n} day`, `${n} days`)}`,
      unsaved: 'Unsaved changes',
      /** Spoken when closing with unsaved edits. */
      unsavedAnnounce: 'You have unsaved changes',
      discardQuestion: 'Discard your unsaved changes?',
      keepEditing: 'Keep editing',
      discard: 'Discard',
      escToClose: '{esc} to close',
      /** Save failed with the API's reason (409, 404, 400…). */
      saveFailed: (key: string, reason: string) =>
        `Couldn't save ${key}. ${reason} Your edits are still here.`,
      /** Save failed without a response (network, timeout, 5xx). */
      saveFailedOffline: (key: string) =>
        `Couldn't save ${key}. Check your connection and try again — your edits are still here.`,
    },
    validation: {
      titleRequired: 'A todo needs a title',
      labelMax: (n: number) => `Labels can be ${n} characters at most`,
      labelsMax: (n: number) => `Use ${n} labels or fewer`,
      dateInvalid: 'Enter a valid date',
    },
    /** "Improve this todo": the prompt prefilled in the assistant's composer (plan §9.4). */
    improvePrompt: (p: {
      key: string;
      title: string;
      type: string;
      priority: string;
      points: number | null;
      description: string;
    }) =>
      [
        `Improve ${p.key || 'this todo'}: suggest a clearer title, a better description and acceptance criteria. I'll review your suggestions and edit the todo myself.`,
        '',
        `Title: ${p.title}`,
        `Type: ${p.type} · Priority: ${p.priority} · ${p.points === null ? 'not estimated' : `${p.points} points`}`,
        `Description: ${p.description || '(none)'}`,
      ].join('\n'),
  },

  /** The Backlog page (BL-1…7) and its sprint actions (SPR-1…3). */
  backlog: {
    title: 'Backlog',
    /** Skeleton: "Loading backlog"; page error: "We couldn't load the backlog". */
    loadingName: 'backlog',
    pageName: 'the backlog',
    /** The Backlog group's heading (todos with no sprint). */
    groupName: 'Backlog',
    /** A move's target when its sprint isn't in the list any more. */
    fallbackSprint: 'the sprint',
    generateTodos: 'Generate todos',
    planSprint: 'Plan sprint',
    createSprint: 'Create sprint',
    createTodo: 'Create todo',
    /** Links to the backlog from the board, Sprints and their toasts. */
    goTo: 'Go to Backlog',
    empty: {
      title: 'Your backlog is empty',
      text: 'Capture the work ahead: type a title below, or let AI draft todos from a feature description.',
    },
    group: {
      toggle: (name: string) => `Toggle ${name}`,
      rows: (name: string) => `${name} todos`,
      active: 'Active',
      planned: 'Planned',
      /** "Nov 2 – Nov 15 · 1 todo · 5 pts". */
      meta: (dates: string, summary: string) => `${dates} · ${summary}`,
      noMatch: (name: string) => `No todos in ${name} match your filters`,
      empty: (name: string) => `No todos in ${name} yet`,
      dropHint: (name: string) => `Drag todos here to plan ${name}`,
    },
    filters: {
      label: 'Filter todos',
      search: 'Search todos',
      searchPlaceholder: 'Search todos or keys',
      byPriority: 'Filter by priority',
      allPriorities: 'All priorities',
      byType: 'Filter by type',
      allTypes: 'All types',
      showing: (shown: string, total: string) => `Showing ${shown} of ${total}`,
      clear: 'Clear filters',
    },
    quickCreate: {
      label: 'Create todo',
      placeholder: 'Create todo — type a title and press Enter',
      hint: '{enter} to add',
      created: (key: string) => `${key} created`,
      failed: (title: string, reason: string) => `Couldn't create “${title}”. ${reason}`,
    },
    row: {
      drag: (key: string) => (key ? `Drag ${key}` : 'Drag todo'),
      /** The key cell of a quick-create row still saving: a glyph, and its spoken text. */
      savingGlyph: '…',
      saving: 'Saving',
      moreLabels: (n: number) => `+${n}`,
      /** The hidden labels, already joined with `labelSeparator`. */
      moreLabelsSpoken: (labels: string) => ` more labels: ${labels}`,
      labelSeparator: ', ',
      menu: (key: string) => `${key} actions`,
      actions: (key: string) => `Actions for ${key}`,
      open: 'Open',
      moveToTop: 'Move to top',
      moveToBottom: 'Move to bottom',
      moveTo: (name: string) => `Move to ${name}`,
    },
    moveHelp: 'Drag rows between groups, or focus a title and use {up} {down} to move it.',
    /** The title buttons' description. */
    rowHelp: 'Press Enter to open its details. Press the up and down arrow keys to move it.',
    dragInstructions:
      'To pick up a todo, press Space or Enter. Use the up and down arrow keys to move it, Space or Enter to drop it, Escape to cancel.',
    dragOff:
      'Drag and drop is off while filters are on. Clear the filters to reorder, or use ⋯ Move to.',
    moves: {
      moved: (key: string, name: string, position: string, total: string) =>
        `${key} moved to ${name}, position ${position} of ${total}`,
      movedToast: (key: string, name: string) => `${key} moved to ${name}`,
      movedBack: (key: string, name: string) => `${key} moved back to ${name}`,
      failed: (key: string, reason: string) => `Couldn't move ${key}. ${reason}`,
      atTop: (key: string) => `${key} is already at the top`,
      atBottom: (key: string) => `${key} is already at the bottom`,
    },
    sprint: {
      start: 'Start sprint',
      complete: 'Complete sprint',
      blockedBy: (name: string) => `Complete ${name} first`,
      menu: (name: string) => `${name} actions`,
      actions: (name: string) => `Actions for ${name}`,
      edit: 'Edit sprint',
      delete: 'Delete sprint',
    },
    toast: {
      sprintCreated: (name: string) => `${name} created · drag todos into it`,
      sprintSaved: (name: string) => `${name} saved`,
      startBlocked: (active: string, name: string) => `Complete ${active} before starting ${name}.`,
      goToBoard: 'Go to board',
      startEmpty: (name: string) => `Add todos to ${name} before starting it.`,
      started: (name: string) => `${name} started`,
      sprintDeleted: (name: string, todos: number) =>
        todos > 0
          ? `${name} deleted · ${count(todos, `${todos} todo`, `${todos} todos`)} moved to the backlog`
          : `${name} deleted`,
      sprintDeleteFailed: (name: string, reason: string) => `Couldn't delete ${name}. ${reason}`,
    },
    deleteSprint: {
      title: (name: string) => `Delete ${name}?`,
      fallbackName: 'sprint',
      withTodos: (n: number) =>
        count(
          n,
          'Its 1 todo goes back to the backlog; no todos are deleted.',
          `Its ${n} todos go back to the backlog; no todos are deleted.`,
        ),
      empty: 'It has no todos. This can’t be undone.',
    },
  },

  /** Create / edit sprint, Start sprint (SPR-1…3) and the Sprints history page (SPR-7). */
  sprints: {
    /** The sprint status lozenges (history, the board header). */
    status: { active: 'Active', planned: 'Planned', completed: 'Completed' },
    /** "Goal:" before a sprint's goal (board header, sprint detail). */
    goalLabel: 'Goal:',
    /** A sprint's points progress bar (board header, sprint list). */
    progress: {
      pointsLabel: (name: string) => `${name} points done`,
      pointsValue: (done: number, total: number) => `${done} of ${total} points done`,
      todosLabel: (name: string) => `${name} todos done`,
      todosValue: (done: number, total: number) => `${done} of ${total} todos done`,
    },
    history: {
      title: 'Sprints',
      /** Skeleton: "Loading sprints"; page error: "We couldn't load your sprints". */
      loadingName: 'sprints',
      pageName: 'your sprints',
      created: (name: string) => `${name} created · drag todos into it from the backlog`,
      empty: {
        title: 'No sprints yet',
        text: 'Plan a sprint from the backlog: create one, drag todos into it, then start it.',
      },
      list: {
        title: 'All sprints',
        noDates: 'No dates',
        /** "13 / 21 pts". */
        points: (done: number, total: number) => `${done} / ${total} pts`,
      },
      detail: {
        noDates: 'No dates yet',
        /** After the dates: "Oct 20 – Nov 2 · Completed Nov 2, 2026". */
        completedOn: (date: string) => ` · Completed ${date}`,
        tiles: {
          completed: 'Completed',
          pointsDone: 'Points done',
          completion: 'Completion',
          carriedOver: 'Carried over',
          notFinished: 'Not finished',
          fraction: (done: number, total: number) => `${done} / ${total}`,
          percent: (value: number) => `${value}%`,
          none: '—',
        },
        snapshotNote: 'Numbers as they were when the sprint was completed.',
        todos: 'Todos',
        /** After "Todos": " · 5". */
        todoCount: (n: number) => ` · ${n}`,
        todosLabel: (name: string) => `${name} todos`,
        loadingTodos: (name: string) => `Loading ${name} todos`,
        /** Page error: "We couldn't load Sprint 3's todos". */
        todosPage: (name: string) => `${name}'s todos`,
        noTodos: {
          completed: 'No todos were done in this sprint.',
          planned: 'No todos planned yet. Drag some in from the backlog.',
          active: 'No todos in this sprint yet.',
        },
      },
    },
    form: {
      createTitle: 'Create sprint',
      editTitle: (name: string) => `Edit ${name}`,
      create: 'Create sprint',
      save: 'Save sprint',
      name: 'Sprint name',
      startDate: 'Start date',
      endDate: 'End date',
      goal: 'Sprint goal',
      goalHelp: (max: number) => `Optional · up to ${max} characters`,
      goalPlaceholder: 'What should this sprint deliver?',
    },
    /** The hint under the dates: "2 weeks · Nov 16 – Nov 30". */
    duration: {
      bothDates: 'Add both dates to see the length',
      optional: 'Dates are optional',
      oneDay: (range: string) => `One day · ${range}`,
      length: (length: string, range: string) => `${length} · ${range}`,
    },
    validation: {
      nameRequired: 'Give the sprint a name',
      nameMax: (n: number) => `Keep the name under ${n} characters`,
      goalMax: (n: number) => `Keep the goal under ${n} characters`,
      endBeforeStart: 'End date must be after start date',
      startRequired: 'Pick a start date',
      endRequired: 'Pick an end date',
    },
    start: {
      title: (name: string) => `Start ${name}`,
      /** "3 todos · 8 pts · Ship the board". */
      summary: (counts: string, goal: string) => (goal ? `${counts} · ${goal}` : counts),
      submit: 'Start sprint',
      starting: 'Starting…',
      note: 'Its todos move onto the Active Sprint board, where you can track them until you complete it.',
      /** 409: another sprint is active (or this one isn't planned any more), given the server's text. */
      conflict: asSent,
    },
    /** 404 on a sprint request (deleted meanwhile), given the server's text. */
    notFound: asSent,
  },

  /**
   * The Active Sprint board (SPR-4…6) and Complete sprint. Column names are `todos.status`; row
   * menus, move announcements and toasts reuse `backlog.row` / `backlog.moves`.
   */
  board: {
    title: 'Active Sprint',
    /** Skeleton: "Loading active sprint"; page error: "We couldn't load the active sprint". */
    loadingName: 'active sprint',
    pageName: 'the active sprint',
    viewSummary: 'View summary',
    noActive: {
      title: 'No active sprint',
      text: 'Start a planned sprint from the backlog to see its board here.',
      start: (name: string) => `Start ${name}`,
    },
    moveHelp:
      'Drag cards between columns, or focus a card and use {left} {right} {up} {down} to move it.',
    /** The cards' description. */
    cardHelp:
      'Press Enter to open its details. Press the left and right arrow keys to move it to another column, and the up and down arrow keys to reorder it.',
    /** dnd-kit's instructions (the board has no keyboard drag sensor: the arrows on a card move it). */
    dragInstructions:
      'Focus a card and use the arrow keys to move it between columns or reorder it.',
    header: {
      /** After the dates: "· 5 days left". */
      remaining: (text: string) => `· ${text}`,
      fraction: (done: number, total: number) => `${done} / ${total}`,
      /** After the bold "3 / 8". */
      pointsDone: (_total: number) => ' pts done',
      todosDone: (_total: number) => ' todos done',
    },
    column: {
      /** The column's region name: "In Progress, 3 todos". */
      label: (name: string, todos: string) => `${name}, ${todos}`,
      dropHere: 'Drop todos here',
    },
    composer: {
      open: (column: string) => `Create todo in ${column}`,
      label: (column: string) => `New todo in ${column}`,
      placeholder: 'What needs to be done?',
      hint: '{enter} add · {esc} cancel',
      add: 'Add',
      created: (key: string, column: string) => `${key} created in ${column}`,
    },
    card: {
      /** Before the due date, for screen readers: "Overdue, due Nov 2". */
      overdue: 'Overdue, due ',
    },
    moves: {
      alreadyIn: (key: string, column: string) => `${key} is already in ${column}`,
      atTop: (key: string, column: string) => `${key} is already at the top of ${column}`,
      atBottom: (key: string, column: string) => `${key} is already at the bottom of ${column}`,
    },
    complete: {
      title: (name: string) => `Complete ${name}`,
      /** "3 todos done · 2 unfinished". */
      description: (done: number, unfinished: number) =>
        `${count(done, `${done} todo`, `${done} todos`)} done · ${unfinished} unfinished`,
      done: 'Done',
      notFinished: 'Not finished',
      points: (done: number, total: number) => `${done} of ${total} story points completed.`,
      legend: (n: number) => count(n, 'Move 1 unfinished todo to', `Move ${n} unfinished todos to`),
      /** After a destination's name: "· planned, starts Nov 16". */
      hint: (text: string) => `· ${text}`,
      plannedStarts: (date: string) => `planned, starts ${date}`,
      planned: 'planned',
      allDone: 'Every todo is done — nothing to move.',
      confirm: 'Complete sprint',
      completing: 'Completing…',
      /** The destination in the toast when the unfinished todos go to the backlog. */
      toBacklog: 'the backlog',
      completed: (name: string) => `${name} completed`,
      completedMoved: (name: string, n: number, destination: string) =>
        `${name} completed · ${count(n, '1 todo', `${n} todos`)} moved to ${destination}`,
    },
  },

  /** The AI surfaces (AI-1…5). Replies from the server are data and are shown as they come. */
  ai: {
    /** AI-5: carried by every AI surface. */
    disclaimer: 'AI can make mistakes. Review before saving.',
    /** The API's own name for its mode; the same in every language (glossary). */
    mockBadge: 'Mock AI',
    mockHint: 'No AI key is configured: answers come from a built-in demo assistant.',
    tryingAgain: 'Trying again…',
    /** "Nov 4, 2026, 3:42 PM · 2 min ago". */
    generatedAt: (date: string, ago: string) => `${date} · ${ago}`,
    summaryOption: {
      label: 'Generate AI summary',
      help: 'Written after the sprint is completed; it opens with the sprint in Sprints history.',
    },
    drawer: {
      title: 'Kanbot Assistant',
      subtitle: 'AI can make mistakes',
      newChat: 'New chat',
      close: 'Close assistant',
      quickActions: 'Quick actions',
      createTodos: 'Create todos',
      planSprint: 'Plan sprint',
      summarizeSprint: 'Summarize sprint',
      nothingToSummarize: 'Start a sprint first: there is nothing to summarize yet.',
      log: 'Conversation',
      emptyTitle: 'How can I help with your sprint?',
      emptyText: 'Ask about this project, or try one of these:',
      /** Page-aware example prompts (Requirements §9 "Suggested prompts … backlog vs board"). */
      examples: {
        backlog: [
          'Which backlog todos should go into the next sprint?',
          'Which todos are missing story points?',
          'Suggest a goal for the next sprint',
        ],
        board: [
          "What's blocking the active sprint?",
          'What should I work on next?',
          'Are we on track to finish this sprint?',
        ],
        sprints: [
          'How did the last sprint go?',
          'What should we improve next sprint?',
          'Compare our last two sprints',
        ],
      },
      youSaid: 'You said:',
      kanbotSaid: 'Kanbot said:',
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: "Couldn't copy. Select the text and copy it instead.",
      thinking: 'Thinking',
      failedTitle: "Kanbot couldn't answer",
      failedHint: 'Your message is kept.',
      composerLabel: 'Message Kanbot',
      placeholder: 'Ask Kanbot…',
      send: 'Send',
      composerHelp: 'Enter sends, Shift+Enter adds a new line.',
      answered: 'Kanbot answered',
      newChatStarted: 'New chat started',
      /** The user's message for the Summarize sprint chip. */
      summarizePrompt: (name: string) => `Summarize ${name}`,
    },
    generate: {
      title: 'Generate todos with AI',
      prompt: 'Describe the feature',
      promptPlaceholder: 'e.g. User profile page with avatar upload',
      promptRequired: 'Describe the feature so Kanbot knows what to break down',
      counter: (length: number, max: number) => `${length} / ${max}`,
      count: 'Number of todos',
      hint: "Drafts aren't saved until you add them.",
      generate: 'Generate',
      regenerate: 'Regenerate',
      generating: 'Generating…',
      drafting: 'Kanbot is drafting todos',
      failedTitle: "Kanbot couldn't generate todos right now",
      failedHint: 'Your description is kept — try again.',
      noDrafts: "Kanbot didn't suggest any todos. Try describing the feature in more detail.",
      intro: 'Describe a feature and Kanbot drafts todos for you to review.',
      suggested: 'Suggested todos',
      suggestedCount: (n: number) => `(${n})`,
      selectAll: 'Select all',
      points: 'Points',
      draftName: (n: number) => `draft ${n}`,
      include: (name: string) => `Include ${name}`,
      titleOf: (n: number) => `Title of draft ${n}`,
      typeOf: (n: number) => `Type of draft ${n}`,
      priorityOf: (n: number) => `Priority of draft ${n}`,
      pointsOf: (n: number) => `Points of draft ${n}`,
      blankTitle: 'Give this todo a title, or uncheck it',
      /** The footer total: "<b>13 pts</b> total". */
      totalPoints: (n: number) => `${n} pts`,
      totalSuffix: ' total',
      add: (n: number) => `Add ${count(n, '1 todo', `${n} todos`)} to Backlog`,
      adding: 'Adding…',
      addFailed: (reason: string) => `Couldn't add the todos. ${reason}`,
      ready: (n: number) =>
        count(n, '1 draft todo ready to review', `${n} draft todos ready to review`),
      /** Toasts (AiDialogsHost). */
      added: (n: number) => `${count(n, '1 todo', `${n} todos`)} added to the backlog`,
      viewBacklog: 'View backlog',
    },
    plan: {
      title: 'Plan sprint with AI',
      capacity: 'Capacity (story points)',
      capacityError: (min: number, max: number) =>
        `Enter a whole number of points from ${min} to ${max}`,
      focus: 'Focus / goal (optional)',
      focusPlaceholder: 'e.g. finish user profile',
      suggest: 'Suggest plan',
      suggestAgain: 'Suggest again',
      planning: 'Planning…',
      planningSprint: 'Planning sprint',
      emptyText: 'Add or generate todos first, then Kanbot can plan a sprint from them.',
      failedTitle: "Kanbot couldn't plan the sprint right now",
      failedHint: 'Your capacity and focus are kept.',
      goal: 'Suggested sprint goal',
      backlogTodos: 'Backlog todos',
      total: 'Total',
      barLabel: 'Points against capacity',
      barValue: (total: number, capacity: number | null) => `${total} of ${capacity ?? '?'} points`,
      totalValue: (total: number, capacity: number | null) => `${total} / ${capacity ?? '–'} pts`,
      over: (n: number) => `Over capacity by ${n} pts. Unselect a todo or raise capacity.`,
      suggestion: "AI's suggestion",
      /** The plan as computed from the picks: "3 todos · 8 / 10 pts". */
      fact: (todos: number, points: number, capacity: number) =>
        `${count(todos, '1 todo', `${todos} todos`)} · ${points} / ${capacity} pts`,
      asSuggested: 'As first suggested. Your changes show in the list and its total.',
      reasoning: "AI's reasoning",
      caveat:
        "The AI's notes may not match the plan above — the plan is checked against your backlog and capacity.",
      leftOut: "Some todos the AI mentioned aren't in this plan.",
      loadingBacklog: 'Loading your backlog…',
      intro: (n: number) =>
        `Kanbot picks backlog todos that fit your capacity, highest priority first. ${count(n, '1 todo', `${n} todos`)} in the backlog.`,
      create: (name: string, n: number) =>
        `Create ${name} with ${count(n, '1 todo', `${n} todos`)}`,
      createFailed: (name: string, reason: string) => `Couldn't create ${name}. ${reason}`,
      ready: (todos: number, points: number, capacity: number) =>
        `Plan ready: ${count(todos, '1 todo', `${todos} todos`)}, ${points} of ${capacity} points`,
      /** Toast (AiDialogsHost). */
      created: (name: string, n: number) =>
        `${name} created with ${count(n, '1 todo', `${n} todos`)}`,
    },
    summary: {
      title: 'AI summary',
      midSprint: 'Mid-sprint summary',
      midSprintDay: (day: number, total: number) => `Mid-sprint summary · Day ${day} of ${total}`,
      /** The board's summary dialog. */
      dialogTitle: (name: string) => `${name} · AI summary`,
      summarize: 'Summarize',
      summarizing: 'Summarizing…',
      regenerate: 'Regenerate',
      regenerating: 'Regenerating…',
      ready: (name: string) => `${name} summary ready`,
      generating: 'Generating summary',
      failedTitle: "Kanbot couldn't write the summary",
      emptyActive:
        'Get a quick read on how this sprint is going: progress, risks and what to do next.',
      emptyCompleted: 'No summary yet. Kanbot can write one from what this sprint delivered.',
      soFar: 'So far: ',
      liveStats: (doneTodos: number, totalTodos: number, donePoints: number, totalPoints: number) =>
        `${doneTodos} of ${totalTodos} todos done · ${donePoints} of ${totalPoints} pts done`,
      /** After the live stats: " · 5 days left". */
      left: (text: string) => ` · ${text}`,
      /** "Generated <time>. AI can make mistakes. Review before sharing." */
      generatedBefore: 'Generated ',
      generatedAfter: '. AI can make mistakes. Review before sharing.',
      /** Toast when Complete sprint's summary fails (the sprint stays completed). */
      failedAfterComplete: (name: string, reason: string) =>
        `${name} is completed, but its AI summary failed. ${reason}`,
    },
  },

  /** DESIGN §9 404 (every cause). */
  notFound: {
    /** `document.title`: "Page not found · Kanbot". */
    pageTitle: 'Page not found',
    code: 'Error 404',
    requested: 'Requested address: ',
    goToProjects: 'Go to Projects',
    openActiveSprint: 'Open Active Sprint',
    askAi: 'Ask AI to find it',
    /**
     * Variants by cause. The API answers 404 both for ids that don't exist and for other users'
     * ids, so "no access" reads like "doesn't exist" and the copy mentions both.
     */
    route: {
      title: "We can't find that page",
      body: 'The link may be broken, or the project or todo was moved or deleted. Check the address, or head back to somewhere you know.',
    },
    project: {
      title: "This project doesn't exist",
      body: "It may have been deleted, or it belongs to an account you're not signed in to. Check the address, or pick one of your projects.",
    },
    sprint: {
      title: "This sprint doesn't exist",
      body: 'It may have been deleted, or it belongs to another project. Check the sprint list for the one you meant.',
    },
    todo: {
      title: "This todo doesn't exist",
      body: 'It may have been deleted. Check the backlog for similar todos.',
    },
    /** What "Ask AI to find it" puts in the composer. Nothing is sent until the user does. */
    findItPrompt: (path: string) =>
      `I tried to open ${path} and got "Page not found". Can you help me find what I was looking for?`,
  },

  /** Error boundaries (plan §9.3): a page that crashed, a new deploy, the last-line crash screen. */
  errorPages: {
    crashTitle: 'Something went wrong',
    crashText:
      'Kanbot hit an unexpected error. Reloading usually fixes it, and everything you saved is safe on the server.',
    /** RenderErrorPage: "We couldn't load this page". */
    thisPage: 'this page',
    updateTitle: 'A new version is available',
    updateText:
      'Kanbot was updated while this tab was open. Reload to get the latest version — everything you saved is safe.',
    /** The route boundary's version (a page chunk failed). */
    updatePageText:
      "Kanbot was updated while this tab was open, so this page couldn't load. Reload to get the latest version — everything you saved is safe.",
    updateTag: 'Update',
    /** `document.title`: "Update available · Kanbot". */
    updateDocumentTitle: 'Update available',
    reload: 'Reload',
  },

  /** dnd-kit's screen-reader announcements, shared by the backlog and the board (lib/dnd). */
  dnd: {
    pickedUp: (key: string) => `Picked up ${key}.`,
    over: (key: string, list: string) => `${key} is over ${list}.`,
    cancelled: (key: string) => `Move cancelled. ${key} is back where it was.`,
    fallbackKey: 'Todo',
    fallbackList: 'the list',
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
      title: asSent,
      goal: asSent,
      startDate: asSent,
      endDate: asSent,
      labels: asSent,
      dueDate: asSent,
      storyPoints: asSent,
      status: asSent,
      type: asSent,
      priority: asSent,
      sprintId: asSent,
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
