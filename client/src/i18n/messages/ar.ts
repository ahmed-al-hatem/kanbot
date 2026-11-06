/*
 * IBM Plex Sans Arabic, self-hosted, the four weights the design uses. Imported here, in the
 * lazily loaded Arabic chunk, so English visitors never download the font or these messages.
 * Each weight's CSS has `unicode-range` subsets (arabic, latin…); the browser fetches only those
 * a page uses. Arabic uses this one family for Arabic and Latin text (plan §11).
 */
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import { isolate as bdi } from '../bidi';
import { plural, type PluralForms } from '../plural';
import type { Messages } from './en';

/**
 * Arabic messages. Terms follow docs/I18N-GLOSSARY.md (بند، سبرنت، نقاط القصة…) and the strings
 * the Arabic canvas shows; digits stay Latin. Arabic has six plural forms: zero, one, two,
 * few (3–10), many (11–99), other (100+).
 */
const count = (n: number, forms: PluralForms) => plural('ar', n, forms);

/*
 * `bdi(value)` isolates user and server text (names, keys, emails, titles, a search) in the
 * sentences people *see* — toasts, titles, buttons, hints (i18n/bidi.ts). Not around a failure
 * `reason` (always this dictionary's Arabic), in aria-only labels (nothing is laid out),
 * live-region text (the announcer strips the marks anyway) or prompts sent to the AI (the
 * model gets the text as typed).
 */

const todos = (n: number) =>
  count(n, {
    zero: 'لا بنود',
    one: 'بند واحد',
    two: 'بندان',
    few: `${n} بنود`,
    many: `${n} بندًا`,
    other: `${n} بند`,
  });

const storyPoints = (n: number) =>
  count(n, {
    zero: 'لا نقاط قصة',
    one: 'نقطة قصة واحدة',
    two: 'نقطتا قصة',
    few: `${n} نقاط قصة`,
    many: `${n} نقطة قصة`,
    other: `${n} نقطة قصة`,
  });

/** The noun after a total: «8 نقاط» · «13 نقطة» (the number's form decides). */
const pointsNoun = (n: number) => count(n, { few: 'نقاط', other: 'نقطة' });

/** «3 / 5 بنود منجزة» · «11 / 12 بندًا منجزًا» · «1 / 1 بند منجز». */
const doneTodosNoun = (n: number) =>
  count(n, { few: 'بنود منجزة', many: 'بندًا منجزًا', other: 'بند منجز' });

/** «نُقل بند واحد إلى …» · «نُقلت 3 بنود إلى …». */
const movedTodos = (n: number, destination: string) =>
  count(n, {
    one: `نُقل بند واحد إلى ${destination}`,
    two: `نُقل بندان إلى ${destination}`,
    few: `نُقلت ${n} بنود إلى ${destination}`,
    many: `نُقل ${n} بندًا إلى ${destination}`,
    other: `نُقل ${n} بند إلى ${destination}`,
  });

/** «… ببند واحد» · «… ببندين» · «… بـ 3 بنود»: the preposition takes the genitive. */
const withTodos = (n: number) =>
  count(n, {
    zero: 'بلا بنود',
    one: 'ببند واحد',
    two: 'ببندين',
    few: `بـ ${n} بنود`,
    many: `بـ ${n} بندًا`,
    other: `بـ ${n} بند`,
  });

const GENERIC = 'حدث خطأ ما. حاول مجددًا.';

/** Arabic never shows the API's English text: each code and field says its meaning instead. */
const say = (message: string) => (_serverMessage: string) => message;

export const ar = {
  language: {
    label: 'اللغة',
    change: (languageName: string) => `${languageName} — تغيير اللغة`,
    loadFailed: (languageName: string) =>
      `تعذّر تحميل ${bdi(languageName)}. تحقّق من اتصالك وحاول مجددًا.`,
  },

  count: {
    todos,
    points: (n: number) =>
      count(n, {
        zero: 'لا نقاط',
        one: 'نقطة واحدة',
        two: 'نقطتان',
        few: `${n} نقاط`,
        many: `${n} نقطة`,
        other: `${n} نقطة`,
      }),
    days: (n: number) =>
      count(n, {
        zero: 'لا أيام',
        one: 'يوم واحد',
        two: 'يومان',
        few: `${n} أيام`,
        many: `${n} يومًا`,
        other: `${n} يوم`,
      }),
    weeks: (n: number) =>
      count(n, {
        zero: 'لا أسابيع',
        one: 'أسبوع واحد',
        two: 'أسبوعان',
        few: `${n} أسابيع`,
        many: `${n} أسبوعًا`,
        other: `${n} أسبوع`,
      }),
    storyPoints,
    projects: (n: number) =>
      count(n, {
        zero: 'لا مشاريع',
        one: 'مشروع واحد',
        two: 'مشروعان',
        few: `${n} مشاريع`,
        many: `${n} مشروعًا`,
        other: `${n} مشروع`,
      }),
    backlogTodos: (n: number) => `${todos(n)} في قائمة الانتظار`,
    sprints: (n: number) =>
      count(n, {
        zero: 'لا سبرنتات',
        one: 'سبرنت واحد',
        two: 'سبرنتان',
        few: `${n} سبرنتات`,
        many: `${n} سبرنتًا`,
        other: `${n} سبرنت`,
      }),
  },

  dates: {
    range: (start: string, end: string) => `${start} – ${end}`,
    from: (start: string) => `من ${start}`,
    until: (end: string) => `حتى ${end}`,
  },

  time: {
    justNow: 'الآن',
    minutesAgo: (n: number) =>
      count(n, {
        zero: 'الآن',
        one: 'منذ دقيقة',
        two: 'منذ دقيقتين',
        few: `منذ ${n} دقائق`,
        many: `منذ ${n} دقيقة`,
        other: `منذ ${n} دقيقة`,
      }),
    hoursAgo: (n: number) =>
      count(n, {
        zero: 'الآن',
        one: 'منذ ساعة',
        two: 'منذ ساعتين',
        few: `منذ ${n} ساعات`,
        many: `منذ ${n} ساعة`,
        other: `منذ ${n} ساعة`,
      }),
    daysAgo: (n: number) =>
      count(n, {
        zero: 'اليوم',
        one: 'منذ يوم',
        two: 'منذ يومين',
        few: `منذ ${n} أيام`,
        many: `منذ ${n} يومًا`,
        other: `منذ ${n} يوم`,
      }),
    daysLeft: (n: number) =>
      count(n, {
        zero: 'ينتهي اليوم',
        one: 'بقي يوم واحد',
        two: 'بقي يومان',
        few: `بقيت ${n} أيام`,
        many: `بقي ${n} يومًا`,
        other: `بقي ${n} يوم`,
      }),
    endsToday: 'ينتهي اليوم',
    endedDaysAgo: (n: number) =>
      count(n, {
        zero: 'انتهى اليوم',
        one: 'انتهى منذ يوم',
        two: 'انتهى منذ يومين',
        few: `انتهى منذ ${n} أيام`,
        many: `انتهى منذ ${n} يومًا`,
        other: `انتهى منذ ${n} يوم`,
      }),
  },

  summary: {
    todosAndPoints: (todosText: string, points: string) => `${todosText} · ${points}`,
  },

  common: {
    close: 'إغلاق',
    cancel: 'إلغاء',
    dismiss: 'إغلاق الإشعار',
    open: 'فتح',
    edit: 'تعديل',
    delete: 'حذف',
    saving: 'جارٍ الحفظ…',
    creating: 'جارٍ الإنشاء…',
    saveChanges: 'حفظ التغييرات',
    deleting: 'جارٍ الحذف…',
    clearSearch: 'مسح البحث',
    tryAgain: 'إعادة المحاولة',
    retry: 'إعادة المحاولة',
    retrying: 'جارٍ إعادة المحاولة…',
    undo: 'تراجع',
    pleaseTryAgain: 'حاول مجددًا.',
    backToProjects: 'العودة إلى المشاريع',
    loading: (what: string) => `جارٍ تحميل ${what}`,
    loadingWorkspace: 'جارٍ تحميل مساحة عملك',
    loadingApp: 'جارٍ تحميل Kanbot',
    requiredMark: ' *',
    unassigned: 'غير مُسند',
    notEstimated: 'غير مقدّر',
    themeToLight: 'التبديل إلى الوضع الفاتح',
    themeToDark: 'التبديل إلى الوضع الداكن',
    askAi: 'اسأل الذكاء الاصطناعي',
    fieldsNeedAttention: (n: number) =>
      count(n, {
        zero: 'لا حقول تحتاج إلى انتباه',
        one: 'حقل واحد يحتاج إلى انتباه',
        two: 'حقلان يحتاجان إلى انتباه',
        few: `${n} حقول تحتاج إلى انتباه`,
        many: `${n} حقلًا يحتاج إلى انتباه`,
        other: `${n} حقل يحتاج إلى انتباه`,
      }),
  },

  validation: {
    maxChars: (n: number) =>
      count(n, {
        zero: 'لا تكتب أي حرف',
        one: 'استخدم حرفًا واحدًا أو أقل',
        two: 'استخدم حرفين أو أقل',
        few: `استخدم ${n} أحرف أو أقل`,
        many: `استخدم ${n} حرفًا أو أقل`,
        other: `استخدم ${n} حرف أو أقل`,
      }),
  },

  tags: {
    added: (tag: string) => `أُضيف الوسم ${tag}`,
    removed: (tag: string) => `أُزيل الوسم ${tag}`,
    alreadyAdded: (tag: string) => `الوسم ${tag} مُضاف بالفعل`,
    limit: (max: number) =>
      count(max, {
        zero: 'لا يمكنك إضافة وسوم',
        one: 'يمكنك إضافة وسم واحد فقط',
        two: 'يمكنك إضافة وسمين فقط',
        few: `يمكنك إضافة ${max} وسوم فقط`,
        many: `يمكنك إضافة ${max} وسمًا فقط`,
        other: `يمكنك إضافة ${max} وسم فقط`,
      }),
    remove: (tag: string) => `إزالة الوسم ${tag}`,
  },

  pageError: {
    title: (page: string) => `تعذّر تحميل ${page}`,
    text: 'لم يستجب الخادم أو انقطع اتصالك. لم يُفقد شيء مما حفظته — حاول مجددًا بعد لحظات.',
    network: 'خطأ في الشبكة · تعذّر الوصول إلى الخادم',
    timeout: 'انتهت المهلة · لم يصل رد في الوقت المحدد',
    status: (status: number, reason: string) => `خطأ ${status} · ${reason}`,
    status500: 'خطأ داخلي في الخادم',
    status502: 'بوابة غير صالحة',
    status503: 'الخدمة غير متاحة',
    status504: 'انتهت مهلة البوابة',
  },

  auth: {
    tagline: 'لوحة السبرنت مع زميل ذكاء اصطناعي.',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'you@example.com',
    password: 'كلمة المرور',
    name: 'الاسم',
    namePlaceholder: 'اسمك',
    confirmPassword: 'تأكيد كلمة المرور',
    workspace: 'مساحة عملك',
    validation: {
      emailRequired: 'أدخل بريدك الإلكتروني',
      emailInvalid: 'أدخل بريدًا صالحًا، مثل name@example.com',
      passwordRequired: 'أدخل كلمة المرور',
      nameRequired: 'أدخل اسمك',
      passwordMin: 'استخدم 8 أحرف على الأقل',
      confirmRequired: 'أكّد كلمة المرور',
      passwordMismatch: 'كلمتا المرور غير متطابقتين',
    },
    login: {
      pageTitle: 'تسجيل الدخول',
      title: 'أهلًا بعودتك',
      subtitle: 'سجّل الدخول إلى لوحة السبرنت',
      forgot: 'نسيت كلمة المرور؟',
      submit: 'تسجيل الدخول',
      submitting: 'جارٍ تسجيل الدخول…',
      noAccount: 'ليس لديك حساب؟',
      createOne: 'أنشئ حسابًا',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق منهما وحاول مجددًا.',
      sessionExpired: 'انتهت صلاحية جلستك. سجّل الدخول مجددًا.',
    },
    register: {
      pageTitle: 'إنشاء حساب',
      title: 'أنشئ حسابك',
      subtitle: 'خطّط للسبرنتات مع زميل ذكاء اصطناعي',
      passwordHelp: '8 أحرف على الأقل. الأرقام والرموز تجعلها أقوى.',
      submit: 'إنشاء حساب',
      submitting: 'جارٍ إنشاء الحساب…',
      haveAccount: 'لديك حساب بالفعل؟',
      logIn: 'سجّل الدخول',
      emailTaken: 'يوجد حساب بهذا البريد الإلكتروني بالفعل.',
      strength: {
        spoken: (level: string) => `قوة كلمة المرور: ${level}`,
        tooShort: 'قصيرة جدًا',
        fair: 'مقبولة',
        good: 'جيدة',
        strong: 'قوية',
      },
    },
    forgot: {
      pageTitle: 'إعادة تعيين كلمة المرور',
      title: 'إعادة تعيين كلمة المرور',
      subtitle: 'أدخل بريد حسابك وسنرسل لك رابطًا لإعادة التعيين.',
      submit: 'إرسال رابط إعادة التعيين',
      sending: 'جارٍ الإرسال…',
      sent: 'أُرسل رابط إعادة التعيين',
      checkEmail: 'تحقق من بريدك',
      sentBefore: 'إذا كان هناك حساب مرتبط بـ ',
      sentAfter: '، فرابط إعادة التعيين في طريقه إليك.',
      resend: 'إعادة إرسال الرابط',
      resendIn: (seconds: number) =>
        count(seconds, {
          zero: 'إعادة إرسال الرابط',
          one: 'إعادة إرسال الرابط بعد ثانية',
          two: 'إعادة إرسال الرابط بعد ثانيتين',
          few: `إعادة إرسال الرابط بعد ${seconds} ثوانٍ`,
          many: `إعادة إرسال الرابط بعد ${seconds} ثانية`,
          other: `إعادة إرسال الرابط بعد ${seconds} ثانية`,
        }),
      backToLogin: 'العودة لتسجيل الدخول',
      demoNote: 'للعرض فقط — إعادة تعيين كلمة المرور غير متاحة في هذه النسخة.',
    },
    sessionExpired: {
      title: 'انتهت صلاحية جلستك',
      text: 'سجّل الدخول مجددًا للمتابعة. ستعود إلى هذه الصفحة.',
      action: 'تسجيل الدخول مجددًا',
    },
    welcome: (firstName: string) => `أهلًا بك في Kanbot يا ${bdi(firstName)}`,
  },

  shell: {
    nav: {
      label: 'القائمة الرئيسية',
      project: 'المشروع',
      backlog: 'قائمة الانتظار',
      board: 'السبرنت النشط',
      sprints: 'السبرنتات',
      projects: 'المشاريع',
    },
    skipLink: 'تخطَّ إلى المحتوى الرئيسي',
    navigation: 'التنقل',
    switcher: {
      label: (name: string, key: string) => `تبديل المشروع، الحالي: ${name} ${key}`,
      choose: 'اختر مشروعًا',
      menu: 'المشاريع',
      heading: 'مشاريعك',
      loading: 'جارٍ تحميل المشاريع…',
      loadFailed: 'تعذّر تحميل المشاريع',
      empty: 'لا توجد مشاريع بعد',
      current: 'الحالي',
      viewAll: 'عرض كل المشاريع',
    },
    profile: {
      menu: 'الحساب',
      signedInAs: (email: string) => `مسجّل الدخول باسم ${bdi(email)}`,
      shortcuts: 'اختصارات لوحة المفاتيح',
      logOut: 'تسجيل الخروج',
    },
    offline: {
      message: 'أنت غير متصل. لا يمكن حفظ التغييرات حتى يعود الاتصال.',
      retry: 'أعد المحاولة الآن',
      reconnecting: 'جارٍ إعادة الاتصال…',
      stillOffline: 'ما زلت غير متصل. سنعيد الاتصال فور عودة الشبكة.',
      backOnline: 'عاد الاتصال',
    },
    shortcuts: {
      title: 'اختصارات لوحة المفاتيح',
      description: 'تعمل في أي مكان في التطبيق، إلا أثناء الكتابة في حقل.',
      then: 'ثم',
      note: 'في اللوحة وقائمة الانتظار، ركّز على بطاقة أو صف واستخدم مفاتيح الأسهم لنقله؛ ويفتحه Enter.',
      create: 'إنشاء بند (في المشاريع: مشروع جديد)',
      search: 'البحث في قائمة الانتظار أو في مشاريعك',
      goBoard: 'الذهاب إلى لوحة السبرنت النشط',
      goBacklog: 'الذهاب إلى قائمة الانتظار',
      goSprints: 'الذهاب إلى السبرنتات',
      help: 'عرض هذه الاختصارات',
      needProject: 'افتح مشروعًا أولًا لاستخدام هذا الاختصار',
      nothingToCreate: 'لا يوجد ما يمكن إنشاؤه هنا',
      noSearch: 'لا يوجد بحث في هذه الصفحة',
    },
    project: 'المشروع',
    thisProject: 'هذا المشروع',
  },

  projects: {
    title: 'المشاريع',
    newProject: 'مشروع جديد',
    loadingName: 'المشاريع',
    pageName: 'مشاريعك',
    empty: {
      title: 'لا توجد مشاريع بعد',
      text: 'أنشئ مشروعك الأول لتبدأ التخطيط للسبرنتات.',
      action: 'أنشئ مشروعك الأول',
    },
    search: {
      label: 'ابحث في المشاريع',
      placeholder: 'ابحث بالاسم أو المفتاح',
      noMatch: (query: string) => `لا توجد مشاريع تطابق «${bdi(query)}»`,
    },
    tile: {
      menu: (name: string) => `إجراءات ${name}`,
      actions: (name: string) => `إجراءات ${name}`,
      noDescription: 'لا يوجد وصف بعد.',
      noActiveSprint: 'لا يوجد سبرنت نشط',
      activeSprint: (sprint: string) => `${bdi(sprint)} نشط`,
    },
    toast: {
      created: (name: string) => `${bdi(name)} أُنشئ`,
      updated: (name: string) => `${bdi(name)} حُدّث`,
      deleted: (name: string) => `${bdi(name)} حُذف`,
      deleteFailed: (name: string, reason: string) => `تعذّر حذف ${bdi(name)}. ${reason}`,
    },
    delete: {
      title: (name: string) => `حذف ${bdi(name)}؟`,
      fallbackName: 'المشروع',
      before: 'سيُحذف ',
      after: (key: string, todoCount: number) =>
        ` (${bdi(key)}) نهائيًا مع كل سبرنتاته${todoCount > 0 ? ` و${todos(todoCount)}` : ' وبنوده'}. لا يمكن التراجع عن ذلك.`,
      confirm: 'حذف المشروع',
    },
    form: {
      createTitle: 'إنشاء مشروع',
      editTitle: 'تعديل المشروع',
      create: 'إنشاء مشروع',
      untitled: 'مشروع بلا عنوان',
      previewCreate: (key: string) => `ستُرقَّم البنود ${bdi(`${key}-1`)}`,
      previewEdit: (key: string) => `ستُرقَّم البنود الجديدة ${bdi(`${key}-…`)}`,
      name: 'اسم المشروع',
      namePlaceholder: 'مثال: Kanbot للجوال',
      key: 'المفتاح',
      keyHelpCreate: 'اختياري · من 2 إلى 6 أحرف لاتينية. اتركه فارغًا ليُولَّد من الاسم.',
      keyHelpEdit: 'تغيير المفتاح لا يغيّر مفاتيح البنود الحالية.',
      description: 'الوصف',
      descriptionPlaceholder: 'عمّ يدور هذا المشروع؟',
      starter: 'دع Kanbot يصوغ قائمة انتظار أولية',
      starterHelp: 'يستخدم الوصف لصياغة البنود الأولى. تراجعها قبل إضافة أي شيء.',
      starterPrompt: (name: string) => `البنود الأولى لمشروع جديد اسمه «${name}»`,
      nameRequired: 'امنح مشروعك اسمًا',
      keyInvalid: 'يجب أن يتكون المفتاح من 2 إلى 6 أحرف لاتينية',
      keyTaken: 'هذا المفتاح مستخدم لمشروع آخر',
    },
  },

  todos: {
    type: { story: 'قصة', task: 'مهمة', bug: 'خلل' },
    priority: { urgent: 'عاجلة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' },
    status: {
      todo: 'للتنفيذ',
      in_progress: 'قيد التنفيذ',
      in_review: 'قيد المراجعة',
      done: 'منجز',
    },
    sprintOption: {
      active: (name: string) => `${bdi(name)} (نشط)`,
      planned: (name: string) => `${bdi(name)} (مخطط)`,
      completed: (name: string) => `${bdi(name)} (مكتمل)`,
    },
    toast: {
      saved: (key: string) => `${bdi(key)} حُفظ`,
      deleted: (key: string) => `${bdi(key)} حُذف`,
      deleteFailed: (key: string, reason: string) => `تعذّر حذف ${bdi(key)}. ${reason}`,
    },
    notFound: say('لم نعد نجد هذا البند، ربما حُذف.'),
    delete: {
      title: (key: string) => `حذف ${bdi(key)}؟`,
      fallbackKey: 'البند',
      before: 'سيُحذف ',
      after: (title: string) => ` «${bdi(title)}» نهائيًا. لا يمكن التراجع عن ذلك.`,
      confirm: 'حذف البند',
    },
    details: {
      dialogTitle: 'تفاصيل البند',
      loadingName: 'البند',
      pageName: 'هذا البند',
      meta: (type: string, date: string) => `${type} · أُنشئ في ${date}`,
      title: 'العنوان',
      description: 'الوصف',
      descriptionPlaceholder: 'أضف مزيدًا من التفاصيل…',
      improve: 'حسّن هذا البند',
      improveHint: 'اطلب من Kanbot عنوانًا ووصفًا ومعايير قبول أوضح.',
      sprint: 'السبرنت',
      currentSprint: 'السبرنت الحالي',
      completedHelp: 'لا يمكن نقل بنود سبرنت مكتمل أو تغيير حالتها',
      status: 'الحالة',
      statusHelp: 'انقله إلى السبرنت النشط لتحديد حالته',
      priority: 'الأولوية',
      type: 'النوع',
      storyPoints: 'نقاط القصة',
      noPoints: 'غير مقدّر',
      labels: 'الوسوم',
      labelsHelp: 'اضغط {enter} أو {comma} لإضافة وسم، و{backspace} لإزالة الأخير',
      labelPlaceholder: 'أضف وسمًا',
      dueDate: 'تاريخ الاستحقاق',
      overdueBy: (n: number) =>
        count(n, {
          zero: 'غير متأخر',
          one: 'متأخر يومًا واحدًا',
          two: 'متأخر يومين',
          few: `متأخر ${n} أيام`,
          many: `متأخر ${n} يومًا`,
          other: `متأخر ${n} يوم`,
        }),
      unsaved: 'تغييرات غير محفوظة',
      unsavedAnnounce: 'لديك تغييرات غير محفوظة',
      discardQuestion: 'تجاهل تغييراتك غير المحفوظة؟',
      keepEditing: 'متابعة التعديل',
      discard: 'تجاهل',
      escToClose: '{esc} للإغلاق',
      saveFailed: (key: string, reason: string) =>
        `تعذّر حفظ ${bdi(key)}. ${reason} تعديلاتك ما زالت هنا.`,
      saveFailedOffline: (key: string) =>
        `تعذّر حفظ ${bdi(key)}. تحقق من اتصالك وحاول مجددًا — تعديلاتك ما زالت هنا.`,
    },
    validation: {
      titleRequired: 'يحتاج البند إلى عنوان',
      labelMax: (n: number) =>
        count(n, {
          zero: 'لا يمكن أن يحتوي الوسم على أي حرف',
          one: 'يمكن أن يصل الوسم إلى حرف واحد على الأكثر',
          two: 'يمكن أن يصل الوسم إلى حرفين على الأكثر',
          few: `يمكن أن يصل الوسم إلى ${n} أحرف على الأكثر`,
          many: `يمكن أن يصل الوسم إلى ${n} حرفًا على الأكثر`,
          other: `يمكن أن يصل الوسم إلى ${n} حرف على الأكثر`,
        }),
      labelsMax: (n: number) =>
        count(n, {
          zero: 'لا تُضف أي وسم',
          one: 'استخدم وسمًا واحدًا أو أقل',
          two: 'استخدم وسمين أو أقل',
          few: `استخدم ${n} وسوم أو أقل`,
          many: `استخدم ${n} وسمًا أو أقل`,
          other: `استخدم ${n} وسم أو أقل`,
        }),
      dateInvalid: 'أدخل تاريخًا صالحًا',
    },
    improvePrompt: (p: {
      key: string;
      title: string;
      type: string;
      priority: string;
      points: number | null;
      description: string;
    }) =>
      [
        `حسّن ${p.key || 'هذا البند'}: اقترح عنوانًا أوضح ووصفًا أفضل ومعايير قبول. سأراجع اقتراحاتك وأعدّل البند بنفسي.`,
        '',
        `العنوان: ${p.title}`,
        `النوع: ${p.type} · الأولوية: ${p.priority} · ${p.points === null ? 'غير مقدّر' : storyPoints(p.points)}`,
        `الوصف: ${p.description || '(لا يوجد)'}`,
      ].join('\n'),
  },

  backlog: {
    title: 'قائمة الانتظار',
    loadingName: 'قائمة الانتظار',
    pageName: 'قائمة الانتظار',
    groupName: 'قائمة الانتظار',
    fallbackSprint: 'السبرنت',
    generateTodos: 'توليد البنود',
    planSprint: 'تخطيط السبرنت',
    createSprint: 'إنشاء سبرنت',
    createTodo: 'إنشاء بند',
    goTo: 'الذهاب إلى قائمة الانتظار',
    empty: {
      title: 'قائمة الانتظار فارغة',
      text: 'دوّن العمل القادم: اكتب عنوانًا في الأسفل، أو دع الذكاء الاصطناعي يصوغ بنودًا من وصف ميزة.',
    },
    group: {
      toggle: (name: string) => `إظهار أو إخفاء ${name}`,
      rows: (name: string) => `بنود ${name}`,
      active: 'نشط',
      planned: 'مخطط',
      meta: (dates: string, summary: string) => `${dates} · ${summary}`,
      noMatch: (name: string) => `لا توجد بنود في ${bdi(name)} تطابق عوامل التصفية`,
      empty: (name: string) => `لا توجد بنود في ${bdi(name)} بعد`,
      dropHint: (name: string) => `اسحب البنود إلى هنا للتخطيط لـ ${bdi(name)}`,
    },
    filters: {
      label: 'تصفية البنود',
      search: 'ابحث في البنود',
      searchPlaceholder: 'ابحث في البنود أو المفاتيح',
      byPriority: 'تصفية حسب الأولوية',
      allPriorities: 'كل الأولويات',
      byType: 'تصفية حسب النوع',
      allTypes: 'كل الأنواع',
      showing: (shown: string, total: string) => `عرض ${shown} من ${total}`,
      clear: 'مسح عوامل التصفية',
    },
    quickCreate: {
      label: 'إنشاء بند',
      placeholder: 'إنشاء بند — اكتب عنوانًا واضغط Enter',
      hint: '{enter} للإضافة',
      created: (key: string) => `${bdi(key)} أُنشئ`,
      failed: (title: string, reason: string) => `تعذّر إنشاء «${bdi(title)}». ${reason}`,
    },
    row: {
      drag: (key: string) => (key ? `اسحب ${key}` : 'اسحب البند'),
      savingGlyph: '…',
      saving: 'جارٍ الحفظ',
      moreLabels: (n: number) => `+${n}`,
      moreLabelsSpoken: (labels: string) => ` وسوم أخرى: ${labels}`,
      labelSeparator: '، ',
      menu: (key: string) => `إجراءات ${key}`,
      actions: (key: string) => `إجراءات ${key}`,
      open: 'فتح التفاصيل',
      moveToTop: 'نقل إلى الأعلى',
      moveToBottom: 'نقل إلى الأسفل',
      moveTo: (name: string) => `نقل إلى ${bdi(name)}`,
    },
    moveHelp: 'اسحب الصفوف بين المجموعات، أو حدّد عنوانًا واستخدم {up} {down} لنقله.',
    rowHelp:
      'استخدم مفتاحي السهم لأعلى ولأسفل لإعادة ترتيب هذا البند أو نقله بين السبرنتات. اضغط Enter لفتح تفاصيله.',
    dragInstructions:
      'لالتقاط بند، اضغط Space أو Enter. استخدم مفتاحي السهم لأعلى ولأسفل لنقله، وSpace أو Enter لإفلاته، وEscape للإلغاء.',
    dragOff:
      'السحب والإفلات متوقف أثناء التصفية. امسح عوامل التصفية لإعادة الترتيب، أو استخدم ⋯ نقل إلى.',
    moves: {
      moved: (key: string, name: string, position: string, total: string) =>
        `${key} نُقل إلى ${name}، الموضع ${position} من ${total}`,
      movedToast: (key: string, name: string) => `${bdi(key)} نُقل إلى ${bdi(name)}`,
      movedBack: (key: string, name: string) => `${bdi(key)} أُعيد إلى ${bdi(name)}`,
      failed: (key: string, reason: string) => `تعذّر نقل ${bdi(key)}. ${reason}`,
      atTop: (key: string) => `${key} في الأعلى بالفعل`,
      atBottom: (key: string) => `${key} في الأسفل بالفعل`,
    },
    sprint: {
      start: 'بدء السبرنت',
      complete: 'إكمال السبرنت',
      blockedBy: (name: string) => `أكمل ${bdi(name)} أولًا`,
      menu: (name: string) => `إجراءات ${name}`,
      actions: (name: string) => `إجراءات ${name}`,
      edit: 'تعديل السبرنت',
      delete: 'حذف السبرنت',
    },
    toast: {
      sprintCreated: (name: string) => `${bdi(name)} أُنشئ · اسحب البنود إليه`,
      sprintSaved: (name: string) => `${bdi(name)} حُفظ`,
      startBlocked: (active: string, name: string) => `أكمل ${bdi(active)} قبل بدء ${bdi(name)}.`,
      goToBoard: 'الذهاب إلى اللوحة',
      startEmpty: (name: string) => `أضف بنودًا إلى ${bdi(name)} قبل بدئه.`,
      started: (name: string) => `${bdi(name)} بدأ`,
      sprintDeleted: (name: string, n: number) =>
        n > 0
          ? `${bdi(name)} حُذف · ${count(n, {
              one: 'نُقل بند واحد إلى قائمة الانتظار',
              two: 'نُقل بندان إلى قائمة الانتظار',
              few: `نُقلت ${n} بنود إلى قائمة الانتظار`,
              many: `نُقل ${n} بندًا إلى قائمة الانتظار`,
              other: `نُقل ${n} بند إلى قائمة الانتظار`,
            })}`
          : `${bdi(name)} حُذف`,
      sprintDeleteFailed: (name: string, reason: string) => `تعذّر حذف ${bdi(name)}. ${reason}`,
    },
    deleteSprint: {
      title: (name: string) => `حذف ${bdi(name)}؟`,
      fallbackName: 'السبرنت',
      withTodos: (n: number) =>
        count(n, {
          one: 'سيعود بنده الوحيد إلى قائمة الانتظار؛ لا يُحذف أي بند.',
          two: 'سيعود بنداه إلى قائمة الانتظار؛ لا يُحذف أي بند.',
          other: `ستعود بنوده الـ${n} إلى قائمة الانتظار؛ لا يُحذف أي بند.`,
        }),
      empty: 'لا يحتوي على بنود. لا يمكن التراجع عن ذلك.',
    },
  },

  sprints: {
    status: { active: 'نشط', planned: 'مخطط', completed: 'مكتمل' },
    goalLabel: 'الهدف:',
    progress: {
      pointsLabel: (name: string) => `النقاط المنجزة في ${name}`,
      pointsValue: (done: number, total: number) =>
        `${done} من ${total} ${pointsNoun(total)} منجزة`,
      todosLabel: (name: string) => `البنود المنجزة في ${name}`,
      todosValue: (done: number, total: number) => `${done} من ${total} ${doneTodosNoun(total)}`,
    },
    history: {
      title: 'السبرنتات',
      loadingName: 'السبرنتات',
      pageName: 'سبرنتاتك',
      created: (name: string) => `${bdi(name)} أُنشئ · اسحب البنود إليه من قائمة الانتظار`,
      empty: {
        title: 'لا توجد سبرنتات بعد',
        text: 'خطّط لسبرنت من قائمة الانتظار: أنشئ واحدًا، واسحب البنود إليه، ثم ابدأه.',
      },
      list: {
        title: 'كل السبرنتات',
        noDates: 'بلا تواريخ',
        points: (done: number, total: number) => `${done} / ${total} ${pointsNoun(total)}`,
      },
      detail: {
        noDates: 'لا تواريخ بعد',
        completedOn: (date: string) => ` · اكتمل في ${date}`,
        tiles: {
          completed: 'البنود المكتملة',
          pointsDone: 'النقاط المنجزة',
          completion: 'نسبة الإنجاز',
          carriedOver: 'المُرحَّل',
          notFinished: 'غير منجز',
          fraction: (done: number, total: number) => `${done} / ${total}`,
          percent: (value: number) => `${value}%`,
          none: '—',
        },
        snapshotNote: 'الأرقام كما كانت عند إكمال السبرنت.',
        todos: 'البنود',
        todoCount: (n: number) => ` · ${n}`,
        todosLabel: (name: string) => `بنود ${name}`,
        loadingTodos: (name: string) => `جارٍ تحميل بنود ${name}`,
        todosPage: (name: string) => `بنود ${name}`,
        noTodos: {
          completed: 'لم يصل أي بند إلى «منجز» في هذا السبرنت.',
          planned: 'لا بنود مخططة بعد. اسحب بعضها من قائمة الانتظار.',
          active: 'لا بنود في هذا السبرنت بعد.',
        },
      },
    },
    form: {
      createTitle: 'إنشاء سبرنت',
      editTitle: (name: string) => `تعديل ${bdi(name)}`,
      create: 'إنشاء سبرنت',
      save: 'حفظ السبرنت',
      name: 'اسم السبرنت',
      startDate: 'تاريخ البدء',
      endDate: 'تاريخ الانتهاء',
      goal: 'هدف السبرنت',
      goalHelp: (max: number) =>
        count(max, {
          one: 'اختياري · حتى حرف واحد',
          two: 'اختياري · حتى حرفين',
          few: `اختياري · حتى ${max} أحرف`,
          many: `اختياري · حتى ${max} حرفًا`,
          other: `اختياري · حتى ${max} حرف`,
        }),
      goalPlaceholder: 'ماذا يجب أن يُسلّم هذا السبرنت؟',
    },
    duration: {
      bothDates: 'اختر تاريخ البدء والانتهاء لمعرفة المدة',
      optional: 'التواريخ اختيارية',
      oneDay: (range: string) => `يوم واحد · ${range}`,
      length: (length: string, range: string) => `${length} · ${range}`,
    },
    validation: {
      nameRequired: 'امنح السبرنت اسمًا',
      nameMax: (n: number) =>
        count(n, {
          one: 'اجعل الاسم أقصر من حرف واحد',
          two: 'اجعل الاسم أقصر من حرفين',
          few: `اجعل الاسم أقصر من ${n} أحرف`,
          many: `اجعل الاسم أقصر من ${n} حرفًا`,
          other: `اجعل الاسم أقصر من ${n} حرف`,
        }),
      goalMax: (n: number) =>
        count(n, {
          one: 'اجعل الهدف أقصر من حرف واحد',
          two: 'اجعل الهدف أقصر من حرفين',
          few: `اجعل الهدف أقصر من ${n} أحرف`,
          many: `اجعل الهدف أقصر من ${n} حرفًا`,
          other: `اجعل الهدف أقصر من ${n} حرف`,
        }),
      endBeforeStart: 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء',
      startRequired: 'اختر تاريخ البدء',
      endRequired: 'اختر تاريخ الانتهاء',
    },
    start: {
      title: (name: string) => `بدء ${bdi(name)}`,
      summary: (counts: string, goal: string) => (goal ? `${counts} · ${bdi(goal)}` : counts),
      submit: 'بدء السبرنت',
      starting: 'جارٍ البدء…',
      note: 'تنتقل بنوده إلى لوحة السبرنت النشط، حيث تتابعها حتى تكمله.',
      conflict: say('يوجد سبرنت نشط بالفعل. أكمله قبل بدء سبرنت آخر.'),
    },
    notFound: say('لم نعد نجد هذا السبرنت، ربما حُذف.'),
  },

  board: {
    title: 'السبرنت النشط',
    loadingName: 'السبرنت النشط',
    pageName: 'السبرنت النشط',
    viewSummary: 'عرض الملخص',
    noActive: {
      title: 'لا يوجد سبرنت نشط',
      text: 'ابدأ سبرنتًا مخططًا من قائمة الانتظار لترى لوحته هنا.',
      start: (name: string) => `بدء ${bdi(name)}`,
    },
    moveHelp: 'اسحب البطاقات بين الأعمدة، أو حدّد بطاقة واستخدم {left} {right} {up} {down} لنقلها.',
    cardHelp:
      'اضغط Enter لفتح تفاصيلها. استخدم مفتاحي السهم لليمين ولليسار لنقلها إلى عمود آخر، ومفتاحي السهم لأعلى ولأسفل لإعادة ترتيبها.',
    dragInstructions: 'حدّد بطاقة واستخدم مفاتيح الأسهم لنقلها بين الأعمدة أو إعادة ترتيبها.',
    header: {
      remaining: (text: string) => `· ${text}`,
      fraction: (done: number, total: number) => `${done} / ${total}`,
      pointsDone: (total: number) => ` ${pointsNoun(total)} منجزة`,
      todosDone: (total: number) => ` ${doneTodosNoun(total)}`,
    },
    column: {
      label: (name: string, todoCount: string) => `${name}، ${todoCount}`,
      dropHere: 'أفلت البنود هنا',
    },
    composer: {
      open: (column: string) => `إنشاء بند في ${column}`,
      label: (column: string) => `بند جديد في ${column}`,
      placeholder: 'ما الذي يجب إنجازه؟',
      hint: '{enter} إضافة · {esc} إلغاء',
      add: 'إضافة',
      created: (key: string, column: string) => `${bdi(key)} أُنشئ في ${column}`,
    },
    card: {
      overdue: 'متأخر، الاستحقاق ',
    },
    moves: {
      alreadyIn: (key: string, column: string) => `${key} في ${column} بالفعل`,
      atTop: (key: string, column: string) => `${key} في أعلى ${column} بالفعل`,
      atBottom: (key: string, column: string) => `${key} في أسفل ${column} بالفعل`,
    },
    complete: {
      title: (name: string) => `إكمال ${bdi(name)}`,
      description: (done: number, unfinished: number) =>
        `منجز: ${todos(done)} · غير منجز: ${todos(unfinished)}`,
      done: 'منجز',
      notFinished: 'غير منجز',
      points: (done: number, total: number) =>
        count(total, {
          zero: 'لا نقاط قصة في هذا السبرنت.',
          one: `اكتمل ${done} من نقطة قصة واحدة.`,
          two: `اكتمل ${done} من نقطتَي قصة.`,
          few: `اكتمل ${done} من ${total} نقاط قصة.`,
          many: `اكتمل ${done} من ${total} نقطة قصة.`,
          other: `اكتمل ${done} من ${total} نقطة قصة.`,
        }),
      legend: (n: number) =>
        count(n, {
          one: 'انقل البند غير المنجز إلى',
          two: 'انقل البندين غير المنجزين إلى',
          few: `انقل ${n} بنود غير منجزة إلى`,
          many: `انقل ${n} بندًا غير منجز إلى`,
          other: `انقل ${n} بند غير منجز إلى`,
        }),
      hint: (text: string) => `· ${text}`,
      plannedStarts: (date: string) => `مخطط، يبدأ ${date}`,
      planned: 'مخطط',
      allDone: 'كل البنود منجزة — لا شيء لنقله.',
      confirm: 'إكمال السبرنت',
      completing: 'جارٍ الإكمال…',
      toBacklog: 'قائمة الانتظار',
      completed: (name: string) => `${bdi(name)} اكتمل`,
      completedMoved: (name: string, n: number, destination: string) =>
        `${bdi(name)} اكتمل · ${movedTodos(n, bdi(destination))}`,
    },
  },

  ai: {
    disclaimer: 'قد يخطئ الذكاء الاصطناعي. راجع قبل الحفظ.',
    mockBadge: 'Mock AI',
    mockHint: 'لم يُعدّ مفتاح للذكاء الاصطناعي: الإجابات من مساعد تجريبي مدمج.',
    tryingAgain: 'جارٍ إعادة المحاولة…',
    generatedAt: (date: string, ago: string) => `${date} · ${ago}`,
    summaryOption: {
      label: 'توليد ملخص بالذكاء الاصطناعي',
      help: 'يُكتب بعد إكمال السبرنت، ويفتح الملخص معه في سجل السبرنتات.',
    },
    drawer: {
      title: 'مساعد Kanbot',
      subtitle: 'قد يخطئ الذكاء الاصطناعي',
      newChat: 'محادثة جديدة',
      close: 'إغلاق المساعد',
      quickActions: 'إجراءات سريعة',
      createTodos: 'إنشاء بنود',
      planSprint: 'تخطيط السبرنت',
      summarizeSprint: 'لخّص السبرنت',
      nothingToSummarize: 'ابدأ سبرنتًا أولًا: لا يوجد ما يُلخَّص بعد.',
      log: 'المحادثة',
      emptyTitle: 'كيف أساعدك في السبرنت؟',
      emptyText: 'اسأل عن هذا المشروع، أو جرّب أحد هذه الاقتراحات:',
      examples: {
        backlog: [
          'أي بنود قائمة الانتظار يجب أن تدخل السبرنت القادم؟',
          'أي البنود تنقصها نقاط القصة؟',
          'اقترح هدفًا للسبرنت القادم',
        ],
        board: [
          'ما الذي يعيق السبرنت النشط؟',
          'على ماذا أعمل بعد ذلك؟',
          'هل نحن على المسار لإنهاء هذا السبرنت؟',
        ],
        sprints: [
          'كيف سار السبرنت الأخير؟',
          'ما الذي يجب أن نحسّنه في السبرنت القادم؟',
          'قارن آخر سبرنتين',
        ],
      },
      youSaid: 'قلت:',
      kanbotSaid: 'قال Kanbot:',
      copy: 'نسخ',
      copied: 'نُسخ',
      copyFailed: 'تعذّر النسخ. حدّد النص وانسخه بنفسك.',
      thinking: 'يفكّر',
      failedTitle: 'تعذّر على Kanbot الرد',
      failedHint: 'رسالتك محفوظة.',
      composerLabel: 'راسل Kanbot',
      placeholder: 'اسأل Kanbot…',
      send: 'إرسال',
      composerHelp: 'Enter للإرسال، وShift+Enter لسطر جديد.',
      answered: 'أجاب Kanbot',
      newChatStarted: 'بدأت محادثة جديدة',
      summarizePrompt: (name: string) => `لخّص ${name}`,
    },
    generate: {
      title: 'توليد البنود بالذكاء الاصطناعي',
      prompt: 'صف الميزة',
      promptPlaceholder: 'مثال: صفحة الملف الشخصي مع رفع الصورة',
      promptRequired: 'صف الميزة ليعرف Kanbot ما الذي يجب تقسيمه',
      counter: (length: number, max: number) => `${length} / ${max}`,
      count: 'عدد البنود',
      hint: 'لا تُحفظ المسودات حتى تضيفها.',
      generate: 'توليد',
      regenerate: 'إعادة التوليد',
      generating: 'جارٍ التوليد…',
      drafting: 'Kanbot يصوغ البنود',
      failedTitle: 'تعذّر على Kanbot توليد البنود الآن',
      failedHint: 'وصفك محفوظ — حاول مجددًا.',
      noDrafts: 'لم يقترح Kanbot أي بنود. جرّب وصف الميزة بتفصيل أكثر.',
      intro: 'صف ميزة ويصوغ Kanbot بنودًا لتراجعها.',
      suggested: 'البنود المقترحة',
      suggestedCount: (n: number) => `(${n})`,
      selectAll: 'تحديد الكل',
      points: 'النقاط',
      draftName: (n: number) => `المسودة ${n}`,
      include: (name: string) => `تضمين ${name}`,
      titleOf: (n: number) => `عنوان المسودة ${n}`,
      typeOf: (n: number) => `نوع المسودة ${n}`,
      priorityOf: (n: number) => `أولوية المسودة ${n}`,
      pointsOf: (n: number) => `نقاط المسودة ${n}`,
      blankTitle: 'امنح هذا البند عنوانًا، أو ألغِ تحديده',
      totalPoints: (n: number) => `${n} ${pointsNoun(n)}`,
      totalSuffix: ' إجمالًا',
      add: (n: number) =>
        count(n, {
          zero: 'إضافة إلى قائمة الانتظار',
          one: 'إضافة بند واحد إلى قائمة الانتظار',
          two: 'إضافة بندين إلى قائمة الانتظار',
          few: `إضافة ${n} بنود إلى قائمة الانتظار`,
          many: `إضافة ${n} بندًا إلى قائمة الانتظار`,
          other: `إضافة ${n} بند إلى قائمة الانتظار`,
        }),
      adding: 'جارٍ الإضافة…',
      addFailed: (reason: string) => `تعذّرت إضافة البنود. ${reason}`,
      ready: (n: number) =>
        count(n, {
          zero: 'لا مسودات للمراجعة',
          one: 'مسودة بند واحدة جاهزة للمراجعة',
          two: 'مسودتا بند جاهزتان للمراجعة',
          few: `${n} مسودات بنود جاهزة للمراجعة`,
          many: `${n} مسودة بند جاهزة للمراجعة`,
          other: `${n} مسودة بند جاهزة للمراجعة`,
        }),
      added: (n: number) =>
        count(n, {
          one: 'أُضيف بند واحد إلى قائمة الانتظار',
          two: 'أُضيف بندان إلى قائمة الانتظار',
          few: `أُضيفت ${n} بنود إلى قائمة الانتظار`,
          many: `أُضيف ${n} بندًا إلى قائمة الانتظار`,
          other: `أُضيف ${n} بند إلى قائمة الانتظار`,
        }),
      viewBacklog: 'عرض قائمة الانتظار',
    },
    plan: {
      title: 'تخطيط السبرنت بالذكاء الاصطناعي',
      capacity: 'السعة (نقاط القصة)',
      capacityError: (min: number, max: number) =>
        `أدخل عددًا صحيحًا من النقاط من ${min} إلى ${max}`,
      focus: 'التركيز / الهدف (اختياري)',
      focusPlaceholder: 'مثال: إنهاء الملف الشخصي',
      suggest: 'اقترح خطة',
      suggestAgain: 'اقترح مجددًا',
      planning: 'جارٍ التخطيط…',
      planningSprint: 'جارٍ تخطيط السبرنت',
      emptyText: 'أضف بنودًا أو ولّدها أولًا، ثم يخطط Kanbot لسبرنت منها.',
      failedTitle: 'تعذّر على Kanbot تخطيط السبرنت الآن',
      failedHint: 'السعة والتركيز محفوظان.',
      goal: 'هدف السبرنت المقترح',
      backlogTodos: 'بنود قائمة الانتظار',
      total: 'الإجمالي',
      barLabel: 'النقاط مقابل السعة',
      barValue: (total: number, capacity: number | null) =>
        `${total} من ${capacity ?? '?'} ${pointsNoun(capacity ?? total)}`,
      totalValue: (total: number, capacity: number | null) =>
        `${total} / ${capacity ?? '–'} ${pointsNoun(capacity ?? total)}`,
      over: (n: number) => `تجاوزت السعة بـ ${n} ${pointsNoun(n)}. ألغِ تحديد بند أو ارفع السعة.`,
      suggestion: 'اقتراح الذكاء الاصطناعي',
      fact: (todoCount: number, points: number, capacity: number) =>
        `${todos(todoCount)} · ${points} / ${capacity} ${pointsNoun(capacity)}`,
      asSuggested: 'كما اقتُرحت أولًا. تظهر تغييراتك في القائمة وإجماليها.',
      reasoning: 'لماذا هذه الخطة؟',
      caveat:
        'قد لا تطابق ملاحظات الذكاء الاصطناعي الخطة أعلاه — الخطة مُتحقَّق منها مقابل قائمة الانتظار والسعة.',
      leftOut: 'بعض البنود التي ذكرها الذكاء الاصطناعي ليست في هذه الخطة.',
      loadingBacklog: 'جارٍ تحميل قائمة الانتظار…',
      intro: (n: number) =>
        `يختار Kanbot من قائمة الانتظار البنود التي تتّسع لسعتك، الأعلى أولوية أولًا. ${todos(n)} في قائمة الانتظار.`,
      create: (name: string, n: number) => `إنشاء ${bdi(name)} ${withTodos(n)}`,
      createFailed: (name: string, reason: string) => `تعذّر إنشاء ${bdi(name)}. ${reason}`,
      ready: (todoCount: number, points: number, capacity: number) =>
        `الخطة جاهزة: ${todos(todoCount)}، ${points} من ${capacity} ${pointsNoun(capacity)}`,
      created: (name: string, n: number) => `${bdi(name)} أُنشئ ${withTodos(n)}`,
    },
    summary: {
      title: 'ملخص الذكاء الاصطناعي',
      midSprint: 'ملخص منتصف السبرنت',
      midSprintDay: (day: number, total: number) => `ملخص منتصف السبرنت · اليوم ${day} من ${total}`,
      dialogTitle: (name: string) => `${bdi(name)} · ملخص الذكاء الاصطناعي`,
      summarize: 'تلخيص',
      summarizing: 'جارٍ التلخيص…',
      regenerate: 'إعادة التوليد',
      regenerating: 'جارٍ إعادة التوليد…',
      ready: (name: string) => `ملخص ${bdi(name)} جاهز`,
      generating: 'جارٍ توليد الملخص',
      failedTitle: 'تعذّر على Kanbot كتابة الملخص',
      emptyActive: 'احصل على قراءة سريعة لسير هذا السبرنت: التقدم والمخاطر وما يجب فعله تاليًا.',
      emptyCompleted: 'لا يوجد ملخص بعد. يستطيع Kanbot كتابة واحد مما أنجزه هذا السبرنت.',
      soFar: 'حتى الآن: ',
      liveStats: (doneTodos: number, totalTodos: number, donePoints: number, totalPoints: number) =>
        `${doneTodos} من ${totalTodos} ${doneTodosNoun(totalTodos)} · ${donePoints} من ${totalPoints} ${pointsNoun(totalPoints)} منجزة`,
      left: (text: string) => ` · ${text}`,
      generatedBefore: 'وُلّد في ',
      generatedAfter: ' · قد يخطئ الذكاء الاصطناعي. راجعه قبل المشاركة.',
      failedAfterComplete: (name: string, reason: string) =>
        `اكتمل ${bdi(name)}، لكن تعذّر توليد ملخصه بالذكاء الاصطناعي. ${reason}`,
    },
  },

  notFound: {
    pageTitle: 'لم نعثر على هذه الصفحة',
    code: 'خطأ 404',
    requested: 'العنوان المطلوب: ',
    goToProjects: 'الذهاب إلى المشاريع',
    openActiveSprint: 'فتح السبرنت النشط',
    askAi: 'اطلب من الذكاء الاصطناعي إيجادها',
    route: {
      title: 'لم نعثر على هذه الصفحة',
      body: 'قد يكون الرابط معطّلًا، أو نُقل المشروع أو البند أو حُذف. تحقق من العنوان، أو عُد إلى مكان تعرفه.',
    },
    project: {
      title: 'هذا المشروع غير موجود',
      body: 'ربما حُذف، أو يتبع حسابًا لم تسجّل الدخول إليه. تحقق من العنوان، أو اختر أحد مشاريعك.',
    },
    sprint: {
      title: 'هذا السبرنت غير موجود',
      body: 'ربما حُذف، أو يتبع مشروعًا آخر. ابحث في قائمة السبرنتات عن الذي تقصده.',
    },
    todo: {
      title: 'هذا البند غير موجود',
      body: 'ربما حُذف. ابحث في قائمة الانتظار عن بنود مشابهة.',
    },
    findItPrompt: (path: string) =>
      `حاولت فتح ${path} فظهرت «لم نعثر على هذه الصفحة». هل يمكنك مساعدتي في إيجاد ما كنت أبحث عنه؟`,
  },

  errorPages: {
    crashTitle: 'حدث خطأ ما',
    crashText:
      'واجه Kanbot خطأً غير متوقع. إعادة التحميل تحلّ المشكلة عادةً، وكل ما حفظته آمن على الخادم.',
    thisPage: 'هذه الصفحة',
    updateTitle: 'يتوفر إصدار جديد',
    updateText:
      'حُدّث Kanbot أثناء فتح هذا التبويب. أعد التحميل للحصول على أحدث إصدار — كل ما حفظته آمن.',
    updatePageText:
      'حُدّث Kanbot أثناء فتح هذا التبويب، لذا تعذّر تحميل هذه الصفحة. أعد التحميل للحصول على أحدث إصدار — كل ما حفظته آمن.',
    updateTag: 'تحديث',
    updateDocumentTitle: 'يتوفر تحديث',
    reload: 'إعادة التحميل',
  },

  dnd: {
    pickedUp: (key: string) => `التُقط ${key}.`,
    over: (key: string, list: string) => `${key} فوق ${list}.`,
    cancelled: (key: string) => `أُلغي النقل. عاد ${key} إلى مكانه.`,
    fallbackKey: 'البند',
    fallbackList: 'القائمة',
  },

  errors: {
    generic: GENERIC,
    byCode: {
      NETWORK_ERROR: 'تعذّر الوصول إلى الخادم. هل هو قيد التشغيل؟',
      TIMEOUT: 'استغرق الخادم وقتًا طويلًا للرد. حاول مجددًا.',
    },
    server: {
      VALIDATION_ERROR: say('بعض القيم غير صالحة. تحقق من الحقول وحاول مجددًا.'),
      UNAUTHORIZED: say('انتهت صلاحية جلستك. سجّل الدخول مجددًا.'),
      NOT_FOUND: say('لم نعثر على ما تبحث عنه.'),
      CONFLICT: say('يتعارض هذا مع بيانات موجودة. حدّث الصفحة وحاول مجددًا.'),
      RATE_LIMITED: say('محاولات كثيرة. حاول مجددًا بعد بضع دقائق.'),
      AI_ERROR: say('تعذّر على الذكاء الاصطناعي الرد. حاول مجددًا.'),
      INTERNAL_ERROR: say('حدث خطأ من جهتنا. حاول مجددًا.'),
    },
    fields: {
      name: say('أدخل اسمًا من 80 حرفًا أو أقل'),
      email: say('أدخل بريدًا صالحًا، مثل name@example.com'),
      password: say('استخدم من 8 إلى 200 حرف'),
      key: say('يجب أن يتكون المفتاح من 2 إلى 6 أحرف لاتينية'),
      // Projects allow 500 characters and todos 5000: the field name alone can't say which.
      description: say('الوصف أطول من المسموح. اختصره وحاول مجددًا'),
      title: say('أدخل عنوانًا من 200 حرف أو أقل'),
      goal: say('استخدم 300 حرف أو أقل'),
      startDate: say('أدخل تاريخ بدء صالحًا'),
      endDate: say('يجب أن يكون تاريخ الانتهاء في يوم البدء أو بعده'),
      labels: say('استخدم 10 وسوم أو أقل، لا يزيد كل منها على 30 حرفًا'),
      dueDate: say('أدخل تاريخًا صالحًا'),
      storyPoints: say('اختر قيمة من القائمة'),
      status: say('اختر قيمة من القائمة'),
      type: say('اختر قيمة من القائمة'),
      priority: say('اختر قيمة من القائمة'),
      sprintId: say('اختر سبرنتًا نشطًا أو مخططًا، أو قائمة الانتظار'),
    },
    field: say('هذه القيمة غير صالحة'),
  },
} satisfies Messages;
