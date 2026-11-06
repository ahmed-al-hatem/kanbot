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

const storyPoints = (n: number) =>
  count(n, {
    zero: 'لا نقاط قصة',
    one: 'نقطة قصة واحدة',
    two: 'نقطتا قصة',
    few: `${n} نقاط قصة`,
    many: `${n} نقطة قصة`,
    other: `${n} نقطة قصة`,
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

  todos: {
    type: { story: 'قصة', task: 'مهمة', bug: 'خلل' },
    priority: { urgent: 'عاجلة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' },
    status: { todo: 'للتنفيذ', in_progress: 'قيد التنفيذ', in_review: 'قيد المراجعة', done: 'منجز' },
    sprintOption: {
      active: (name: string) => `${name} (نشط)`,
      planned: (name: string) => `${name} (مخطط)`,
      completed: (name: string) => `${name} (مكتمل)`,
    },
    toast: {
      saved: (key: string) => `${key} حُفظ`,
      deleted: (key: string) => `${key} حُذف`,
      deleteFailed: (key: string, reason: string) => `تعذّر حذف ${key}. ${reason}`,
    },
    notFound: say('لم نعد نجد هذا البند، ربما حُذف.'),
    delete: {
      title: (key: string) => `حذف ${key}؟`,
      fallbackKey: 'البند',
      before: 'سيُحذف ',
      after: (title: string) => ` «${title}» نهائيًا. لا يمكن التراجع عن ذلك.`,
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
      saveFailed: (key: string, reason: string) => `تعذّر حفظ ${key}. ${reason} تعديلاتك ما زالت هنا.`,
      saveFailedOffline: (key: string) =>
        `تعذّر حفظ ${key}. تحقق من اتصالك وحاول مجددًا — تعديلاتك ما زالت هنا.`,
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
      noMatch: (name: string) => `لا توجد بنود في ${name} تطابق عوامل التصفية`,
      empty: (name: string) => `لا توجد بنود في ${name} بعد`,
      dropHint: (name: string) => `اسحب البنود إلى هنا للتخطيط لـ ${name}`,
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
      created: (key: string) => `${key} أُنشئ`,
      failed: (title: string, reason: string) => `تعذّر إنشاء «${title}». ${reason}`,
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
      moveTo: (name: string) => `نقل إلى ${name}`,
    },
    moveHelp: 'اسحب الصفوف بين المجموعات، أو حدّد عنوانًا واستخدم {up} {down} لنقله.',
    rowHelp:
      'استخدم مفتاحي السهم لأعلى ولأسفل لإعادة ترتيب هذا البند أو نقله بين السبرنتات. اضغط Enter لفتح تفاصيله.',
    dragInstructions:
      'لالتقاط بند، اضغط Space أو Enter. استخدم مفتاحي السهم لأعلى ولأسفل لنقله، وSpace أو Enter لإفلاته، وEscape للإلغاء.',
    dragOff: 'السحب والإفلات متوقف أثناء التصفية. امسح عوامل التصفية لإعادة الترتيب، أو استخدم ⋯ نقل إلى.',
    moves: {
      moved: (key: string, name: string, position: string, total: string) =>
        `${key} نُقل إلى ${name}، الموضع ${position} من ${total}`,
      movedToast: (key: string, name: string) => `${key} نُقل إلى ${name}`,
      movedBack: (key: string, name: string) => `${key} أُعيد إلى ${name}`,
      failed: (key: string, reason: string) => `تعذّر نقل ${key}. ${reason}`,
      atTop: (key: string) => `${key} في الأعلى بالفعل`,
      atBottom: (key: string) => `${key} في الأسفل بالفعل`,
    },
    sprint: {
      start: 'بدء السبرنت',
      complete: 'إكمال السبرنت',
      blockedBy: (name: string) => `أكمل ${name} أولًا`,
      menu: (name: string) => `إجراءات ${name}`,
      actions: (name: string) => `إجراءات ${name}`,
      edit: 'تعديل السبرنت',
      delete: 'حذف السبرنت',
    },
    toast: {
      sprintCreated: (name: string) => `${name} أُنشئ · اسحب البنود إليه`,
      sprintSaved: (name: string) => `${name} حُفظ`,
      startBlocked: (active: string, name: string) => `أكمل ${active} قبل بدء ${name}.`,
      goToBoard: 'الذهاب إلى اللوحة',
      startEmpty: (name: string) => `أضف بنودًا إلى ${name} قبل بدئه.`,
      started: (name: string) => `${name} بدأ`,
      sprintDeleted: (name: string, n: number) =>
        n > 0
          ? `${name} حُذف · ${count(n, {
              one: 'نُقل بند واحد إلى قائمة الانتظار',
              two: 'نُقل بندان إلى قائمة الانتظار',
              few: `نُقلت ${n} بنود إلى قائمة الانتظار`,
              many: `نُقل ${n} بندًا إلى قائمة الانتظار`,
              other: `نُقل ${n} بند إلى قائمة الانتظار`,
            })}`
          : `${name} حُذف`,
      sprintDeleteFailed: (name: string, reason: string) => `تعذّر حذف ${name}. ${reason}`,
    },
    deleteSprint: {
      title: (name: string) => `حذف ${name}؟`,
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
    form: {
      createTitle: 'إنشاء سبرنت',
      editTitle: (name: string) => `تعديل ${name}`,
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
      title: (name: string) => `بدء ${name}`,
      summary: (counts: string, goal: string) => (goal ? `${counts} · ${goal}` : counts),
      submit: 'بدء السبرنت',
      starting: 'جارٍ البدء…',
      note: 'تنتقل بنوده إلى لوحة السبرنت النشط، حيث تتابعها حتى تكمله.',
      conflict: say('يوجد سبرنت نشط بالفعل. أكمله قبل بدء سبرنت آخر.'),
    },
    notFound: say('لم نعد نجد هذا السبرنت، ربما حُذف.'),
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
