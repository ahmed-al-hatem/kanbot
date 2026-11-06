# Kanbot — EN ↔ AR glossary

The fixed Arabic terms for the UI, taken from the [Arabic design canvas](https://claude.ai/code/artifact/75890d4c-d82e-4f3b-bb09-8d085c7a6877)
(`project/MainAr.dc.html`). `client/src/i18n/messages/ar.ts` uses these and nothing else; a new
term is added here first. Plan: [FRONTEND-PLAN.en.md §11](FRONTEND-PLAN.en.md#11-rtl--arabic-i18n).

## Rules

- **Register:** Modern Standard Arabic, plain and short; second person singular for actions
  (أنشئ، ابحث، اسحب). Buttons are verbal nouns or imperatives as listed below; don't mix both for one action.
- **Digits:** always Latin (`0-9`), from `ar-SY-u-nu-latn`. Keys (`KAN-12`), emails and code stay LTR.
- **Months:** Levantine names — كانون الثاني، شباط، آذار، نيسان، أيار، حزيران، تموز، آب، أيلول،
  تشرين الأول، تشرين الثاني، كانون الأول. Dates read day first: «2 تشرين الثاني»، «2 تشرين الثاني 2026».
- **Ranges:** both sides in full with an en dash: «20 تشرين الأول – 2 تشرين الثاني».
- **Plurals:** all six forms through `Intl.PluralRules` (`plural()`), never `n === 1`. Example for
  بند: لا بنود · بند واحد · بندان · 3 بنود · 11 بندًا · 100 بند.
- **Loading verbs:** «جارٍ + verbal noun…» with the ellipsis character: جارٍ الحفظ… · جارٍ الإنشاء… ·
  جارٍ تسجيل الدخول… · جارٍ إنشاء الحساب… · جارٍ الإرسال… · جارٍ التوليد… · جارٍ التخطيط… ·
  جارٍ التحسين… · جارٍ الإكمال… · جارٍ إعادة الاتصال…
- **Try again:** the canvas has three versions; use them like this:
  | Where | Arabic |
  |---|---|
  | Buttons («Try again») | **إعادة المحاولة** |
  | The offline banner only («Retry now») | **أعد المحاولة الآن** |
  | Inside a sentence («… Please try again.») | حاول مجددًا |
- **Brand and product names** stay Latin: Kanbot, Mock AI badge text stays as the API names it.
- **Server errors** never reach the Arabic UI as the API's English text: `client/src/i18n/errors.ts`
  says each error code's meaning (`errors.server`) and each field's rule (`errors.fields`) instead;
  English keeps the server's text.
- **Letter-spacing** is always 0 and nothing is uppercased (Arabic has no case); lozenges keep their Arabic text.

## Terms

| English | Arabic | Notes |
|---|---|---|
| Todo (an item) | **بند** (pl. بنود) | Never «مهمة» for the item: مهمة is the *Task* type |
| Backlog | **قائمة الانتظار** | |
| Sprint | **سبرنت** (pl. سبرنتات) | Transliterated, as on the canvas |
| Active sprint | السبرنت النشط | Nav item and board title |
| Sprints (history page) | السبرنتات | |
| Project / Projects | مشروع / المشاريع | «مشاريعك» in the switcher |
| Story points | **نقاط القصة** | Short form in counts: نقطة / نقاط |
| Points (column header) | النقاط | |
| Capacity (story points) | السعة (نقاط القصة) | Plan sprint |
| Sprint goal | هدف السبرنت | |
| Type | النوع | |
| Story · Task · Bug | قصة · مهمة · خلل | Work types |
| Status | الحالة | |
| To Do | **للتنفيذ** | |
| In Progress | **قيد التنفيذ** | |
| In Review | **قيد المراجعة** | |
| Done | **منجز** | «غير منجز» for not done |
| Priority | الأولوية | |
| Urgent | **عاجلة** | Not on the canvas (the API has it, plan §2 #1) |
| High | **عالية** | |
| Medium | **متوسطة** | |
| Low | **منخفضة** | |
| Labels | الوسوم | |
| Description | الوصف | |
| Title | العنوان | |
| Due date | تاريخ الاستحقاق | |
| Start date / End date | تاريخ البدء / تاريخ الانتهاء | |
| Today | اليوم | |
| Create todo / Create todos | إنشاء بند / إنشاء بنود | |
| Create project | إنشاء مشروع | «مشروع جديد» on the tile |
| Create sprint | إنشاء سبرنت | |
| Start sprint | بدء السبرنت | |
| Complete sprint | إكمال السبرنت | Dialog title «إكمال Sprint N» |
| No active sprint | لا يوجد سبرنت نشط | |
| Edit · Delete · Cancel · Add · Send | تعديل · حذف · إلغاء · إضافة · إرسال | |
| Delete project | حذف المشروع | |
| Discard · Keep editing | تجاهل · متابعة التعديل | Unsaved changes bar |
| Unsaved changes | تغييرات غير محفوظة | |
| Move to top | نقل إلى الأعلى | «نقل إلى …» for any destination |
| Search todos · Search projects | ابحث في البنود · ابحث في المشاريع | |
| Filter by type / priority | تصفية حسب النوع / تصفية حسب الأولوية | |
| All types · All priorities | كل الأنواع · كل الأولويات | |
| Clear filters · Clear search | مسح عوامل التصفية · مسح البحث | |
| Ask AI | اسأل الذكاء الاصطناعي | |
| Kanbot assistant | مساعد Kanbot | |
| New chat | محادثة جديدة | |
| Message Kanbot (composer placeholder) | راسل Kanbot | |
| Generate todos | توليد البنود | Dialog title «توليد البنود بالذكاء الاصطناعي» |
| Plan sprint | تخطيط السبرنت | Dialog title «تخطيط السبرنت بالذكاء الاصطناعي» |
| Summarize sprint · Summarize | لخّص السبرنت · تلخيص | |
| AI summary | ملخص الذكاء الاصطناعي | |
| Regenerate | إعادة التوليد | |
| Highlights | أبرز النقاط | |
| Suggestions | اقتراحات | |
| Email · Password · Confirm password · Name | البريد الإلكتروني · كلمة المرور · تأكيد كلمة المرور · الاسم | |
| Log in · Create account | سجّل الدخول · أنشئ حسابًا | Links; page titles «أهلًا بعودتك» / «أنشئ حسابك» |
| Forgot password? | نسيت كلمة المرور؟ | |
| Reset password · Check your email | إعادة تعيين كلمة المرور · تحقق من بريدك | |
| Back to log in · Resend link | العودة لتسجيل الدخول · إعادة إرسال الرابط | |
| Your session has expired · Log in again | انتهت صلاحية جلستك · تسجيل الدخول مجددًا | |
| Page not found · Go to Projects | لم نعثر على هذه الصفحة · الذهاب إلى المشاريع | |
| Back to Projects | العودة إلى المشاريع | |
| Couldn't load {page} | تعذّر تحميل {page} | Page errors |
| Language · Change language | اللغة · تغيير اللغة | Switcher group / sidebar item |
| Switch between light and dark | التبديل بين الوضع الفاتح والداكن | Theme toggle |
| Switch to light theme · Switch to dark theme | التبديل إلى الوضع الفاتح · التبديل إلى الوضع الداكن | The toggle's name says where it goes (R2) |
| Main (nav) · Navigation (mobile menu) | القائمة الرئيسية · التنقل | |
| Skip to main content | تخطَّ إلى المحتوى الرئيسي | |
| Choose a project · View all projects · Your projects | اختر مشروعًا · عرض كل المشاريع · مشاريعك | Project switcher |
| Current (the current project) | الحالي | |
| Account · Signed in as {email} · Log out | الحساب · مسجّل الدخول باسم {email} · تسجيل الخروج | Profile menu |
| Keyboard shortcuts · then | اختصارات لوحة المفاتيح · ثم | «g ثم b» |
| You're offline · Back online · Retry now | أنت غير متصل · عاد الاتصال · أعد المحاولة الآن | Offline banner and toast |
| Loading {page} · Loading your workspace | جارٍ تحميل {page} · جارٍ تحميل مساحة عملك | Skeletons and the full-page loader |
| Retrying… | جارٍ إعادة المحاولة… | |
| Error {status} · {reason} | خطأ {status} · {reason} | Page error code line |
| Dismiss (toast ×) | إغلاق الإشعار | Not «تجاهل», which is Discard |
| Close · Cancel · Open · Save changes | إغلاق · إلغاء · فتح · حفظ التغييرات | |
| Unassigned · Not estimated | غير مُسند · غير مقدّر | Avatar / points pill (screen readers) |
| {n} story points (spoken) | {n} نقطة قصة (نقطة قصة واحدة · نقطتا قصة · 3 نقاط قصة) | Points pill |
| {n} fields need attention | حقل واحد يحتاج إلى انتباه · حقلان يحتاجان… · 3 حقول تحتاج… | Validation summary |
| Use {n} characters or fewer | استخدم {n} حرفًا أو أقل | Plural forms of حرف |
| Label {x} added / removed | أُضيف الوسم {x} · أُزيل الوسم {x} | Tag input |
| Sign up (page title) · Create account (button) | إنشاء حساب | |
| Too short · Fair · Good · Strong | قصيرة جدًا · مقبولة · جيدة · قوية | Password strength |
| Resend link in {n}s | إعادة إرسال الرابط بعد {n} ثانية | Plural forms of ثانية |
| Demo only | للعرض فقط | Forgot password note |
| {name} created · updated · deleted | {name} أُنشئ · {name} حُدّث · {name} حُذف | Toasts, canvas order (name first) |
| Untitled project (preview) | مشروع بلا عنوان | |
| Todos will be numbered {KEY}-1 | ستُرقَّم البنود {KEY}-1 | |
| Search by name or key | ابحث بالاسم أو المفتاح | Projects search placeholder |
| {n} projects · {n} backlog todos | مشروع واحد · مشروعان · 3 مشاريع · 11 مشروعًا · 100 مشروع · «… في قائمة الانتظار» | |
| {sprint} active (lozenge) | {sprint} نشط | |
| Your workspace · your projects · this project | مساحة عملك · مشاريعك · هذا المشروع | «تعذّر تحميل …» |
| Your backlog is empty | قائمة الانتظار فارغة | Canvas (Plan sprint's empty note) |
| Active · Planned · Completed (sprint) | نشط · مخطط · مكتمل | Lozenges; «Sprint 4 (مخطط)» in the Sprint select (R3) |
| Toggle {group} | إظهار أو إخفاء {group} | Group chevron (canvas) |
| Drag todos here to plan {sprint} | اسحب البنود إلى هنا للتخطيط لـ {sprint} | Empty planned sprint (canvas) |
| No todos in {group} match your filters · … yet | لا توجد بنود في {group} تطابق عوامل التصفية · لا توجد بنود في {group} بعد | |
| Showing X of Y | عرض X من Y | Filter summary (canvas) |
| Filter todos (search landmark) | تصفية البنود | |
| Search todos or keys | ابحث في البنود أو المفاتيح | Backlog search placeholder (canvas) |
| Open (row menu) · Move to bottom | فتح التفاصيل · نقل إلى الأسفل | «فتح التفاصيل» from the canvas row menu |
| Drag {key} (handle) | اسحب {key} | |
| Undo | تراجع | Toast action (canvas) |
| {key} moved to {group}, position N of M | {key} نُقل إلى {group}، الموضع N من M | Live region (canvas); «{key} أُعيد إلى …» after Undo |
| Picked up {key} · {key} is over {list} · Move cancelled | التُقط {key} · {key} فوق {list} · أُلغي النقل. عاد {key} إلى مكانه. | dnd-kit announcements |
| Drag and drop is off while filters are on | السحب والإفلات متوقف أثناء التصفية | |
| Complete {sprint} first · Complete {a} before starting {b} | أكمل {sprint} أولًا · أكمل {a} قبل بدء {b} | Start blocked (canvas toast) |
| Go to board | الذهاب إلى اللوحة | Board = **اللوحة** |
| {sprint} started · {name} saved | {sprint} بدأ · {name} حُفظ | Toasts, name first |
| Edit sprint · Delete sprint · Save sprint · Sprint name | تعديل السبرنت · حذف السبرنت · حفظ السبرنت · اسم السبرنت | |
| Sprint length hint | أسبوع واحد · أسبوعان · 3 أسابيع · 11 أسبوعًا · 100 أسبوع | `count.weeks`; days use `count.days` |
| Dates are optional | التواريخ اختيارية | |
| Todo details | تفاصيل البند | Dialog title while loading (canvas aria-label) |
| Improve this todo | حسّن هذا البند | Todo details' AI button |
| None (story points) | غير مقدّر | Same word as Not estimated |
| Overdue by {n} days | متأخر يومًا واحدًا · متأخر يومين · متأخر 3 أيام | Canvas wording, all plural forms |
| Add a label | أضف وسمًا | Tag input placeholder (canvas) |
| Retry (save-error bar) | إعادة المحاولة | Same as Try again buttons |
| Delete todo | حذف البند | Confirm button |
| A todo needs a title · Give the sprint a name | يحتاج البند إلى عنوان · امنح السبرنت اسمًا | Validation (canvas) |
| End date must be after start date | يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء | Validation (canvas) |
| Key caps (Enter, Esc, Backspace, ↑ ↓) | stay Latin | Inside sentences through `{enter}` tokens (`components/KeyHint`) |
| Go to Backlog | الذهاب إلى قائمة الانتظار | Board, Sprints, toasts (R4) |
| Drop todos here (empty column) | أفلت البنود هنا | Canvas |
| New todo in {column} · What needs to be done? | بند جديد في {column} · ما الذي يجب إنجازه؟ | Column composer (canvas) |
| {key} created in {column} | {key} أُنشئ في {column} | Composer announcement (canvas) |
| {done} / {total} pts done | {done} / {total} نقطة منجزة (نقاط for 3–10) | Board header; the noun follows the total |
| Goal: | الهدف: | Board header, sprint detail (canvas) |
| View summary · Summarize (board) | عرض الملخص · تلخيص | |
| Complete {sprint} · Not finished · Every todo is done | إكمال {sprint} · غير منجز · كل البنود منجزة | Complete sprint |
| Move N unfinished todos to | انقل البند غير المنجز · البندين غير المنجزين · 3 بنود غير منجزة إلى | All plural forms |
| planned, starts {date} | مخطط، يبدأ {date} | Destination hint (canvas) |
| {sprint} completed · N todos moved to {dest} | {sprint} اكتمل · نُقل بند واحد / بندان · نُقلت 3 بنود إلى {dest} | Toast (canvas) |
| Sprints history | سجل السبرنتات | |
| All sprints · No dates | كل السبرنتات · بلا تواريخ | Sprint list (canvas) |
| Completed (tile) · Points done · Completion · Carried over | البنود المكتملة · النقاط المنجزة · نسبة الإنجاز · المُرحَّل | Stat tiles (canvas) |
| {n} sprints | سبرنت واحد · سبرنتان · 3 سبرنتات · 11 سبرنتًا · 100 سبرنت | `count.sprints` |
| Mock AI | Mock AI | The API's name for its mode; not translated |
| Quick actions · Conversation · Thinking | إجراءات سريعة · المحادثة · يفكّر | Drawer (canvas: المحادثة، يفكّر) |
| Copy · Copied | نسخ · نُسخ | Canvas |
| You said: · Kanbot said: | قلت: · قال Kanbot: | Screen-reader prefixes |
| Kanbot couldn't answer · Your message is kept. | تعذّر على Kanbot الرد · رسالتك محفوظة. | AI error panel |
| AI can make mistakes. Review before saving. | قد يخطئ الذكاء الاصطناعي. راجع قبل الحفظ. | Canvas; «راجعه قبل المشاركة» for summaries |
| Draft (AI) · Include {title} · Select all | مسودة · تضمين {title} · تحديد الكل | Generate todos (canvas) |
| Suggested todos · Describe the feature | البنود المقترحة · صف الميزة | Canvas |
| Add N todos to Backlog | إضافة بند واحد · بندين · 3 بنود إلى قائمة الانتظار | The verb takes the dual's genitive (بندين) |
| Create {sprint} with N todos | إنشاء {sprint} ببند واحد · ببندين · بـ 3 بنود | Preposition + genitive; same in the toast «… أُنشئ ببندين» |
| Suggested sprint goal · AI's suggestion · AI's reasoning | هدف السبرنت المقترح · اقتراح الذكاء الاصطناعي · لماذا هذه الخطة؟ | Plan sprint (canvas for the goal and reasoning) |
| Over capacity by N pts | تجاوزت السعة بـ N نقطة / نقاط | Canvas |
| Mid-sprint summary · Day N of M | ملخص منتصف السبرنت · اليوم N من M | Summary card |
| Generated {time} | وُلّد في {time} | Canvas |
| Error 404 · Ask AI to find it · Open Active Sprint | خطأ 404 · اطلب من الذكاء الاصطناعي إيجادها · فتح السبرنت النشط | 404 (canvas) |
| This project / sprint / todo doesn't exist | هذا المشروع / السبرنت / البند غير موجود | 404 causes |
| Something went wrong · A new version is available | حدث خطأ ما · يتوفر إصدار جديد | Error boundaries |
| Reload · Update · Update available | إعادة التحميل · تحديث · يتوفر تحديث | Not «إعادة المحاولة», which is Try again |
