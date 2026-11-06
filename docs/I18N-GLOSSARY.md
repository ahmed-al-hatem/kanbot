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
