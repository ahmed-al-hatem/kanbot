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
import { plural, type PluralForms } from '../plural';
import type { Messages } from './en';

/**
 * Arabic messages. Terms follow docs/I18N-GLOSSARY.md (بند، سبرنت، نقاط القصة…) and the strings
 * the Arabic canvas shows; digits stay Latin. Arabic has six plural forms: zero, one, two,
 * few (3–10), many (11–99), other (100+).
 */
const count = (n: number, forms: PluralForms) => plural('ar', n, forms);

const todos = (n: number) =>
  count(n, {
    zero: 'لا بنود',
    one: 'بند واحد',
    two: 'بندان',
    few: `${n} بنود`,
    many: `${n} بندًا`,
    other: `${n} بند`,
  });

const GENERIC = 'حدث خطأ ما. حاول مجددًا.';

/** Arabic never shows the API's English text: each code and field says its meaning instead. */
const say = (message: string) => (_serverMessage: string) => message;

export const ar = {
  language: {
    label: 'اللغة',
    change: (languageName: string) => `${languageName} — تغيير اللغة`,
    loadFailed: (languageName: string) =>
      `تعذّر تحميل ${languageName}. تحقّق من اتصالك وحاول مجددًا.`,
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
    storyPoints: (n: number) =>
      count(n, {
        zero: 'لا نقاط قصة',
        one: 'نقطة قصة واحدة',
        two: 'نقطتا قصة',
        few: `${n} نقاط قصة`,
        many: `${n} نقطة قصة`,
        other: `${n} نقطة قصة`,
      }),
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
    clearSearch: 'مسح البحث',
    tryAgain: 'إعادة المحاولة',
    retrying: 'جارٍ إعادة المحاولة…',
    pleaseTryAgain: 'حاول مجددًا.',
    backToProjects: 'العودة إلى المشاريع',
    loading: (what: string) => `جارٍ تحميل ${what}`,
    loadingWorkspace: 'جارٍ تحميل مساحة عملك',
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
    welcome: (firstName: string) => `أهلًا بك في Kanbot يا ${firstName}`,
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
      signedInAs: (email: string) => `مسجّل الدخول باسم ${email}`,
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
      noMatch: (query: string) => `لا توجد مشاريع تطابق «${query}»`,
    },
    tile: {
      menu: (name: string) => `إجراءات ${name}`,
      actions: (name: string) => `إجراءات ${name}`,
      noDescription: 'لا يوجد وصف بعد.',
      noActiveSprint: 'لا يوجد سبرنت نشط',
      activeSprint: (sprint: string) => `${sprint} نشط`,
    },
    toast: {
      created: (name: string) => `${name} أُنشئ`,
      updated: (name: string) => `${name} حُدّث`,
      deleted: (name: string) => `${name} حُذف`,
      deleteFailed: (name: string, reason: string) => `تعذّر حذف ${name}. ${reason}`,
    },
    delete: {
      title: (name: string) => `حذف ${name}؟`,
      fallbackName: 'المشروع',
      before: 'سيُحذف ',
      after: (key: string, todoCount: number) =>
        ` (${key}) نهائيًا مع كل سبرنتاته${todoCount > 0 ? ` و${todos(todoCount)}` : ' وبنوده'}. لا يمكن التراجع عن ذلك.`,
      confirm: 'حذف المشروع',
    },
    form: {
      createTitle: 'إنشاء مشروع',
      editTitle: 'تعديل المشروع',
      create: 'إنشاء مشروع',
      untitled: 'مشروع بلا عنوان',
      previewCreate: (key: string) => `ستُرقَّم البنود ${key}-1`,
      previewEdit: (key: string) => `ستُرقَّم البنود الجديدة ${key}-…`,
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
      description: say('استخدم 500 حرف أو أقل'),
    },
    field: say('هذه القيمة غير صالحة'),
  },
} satisfies Messages;
