# Edge Functions — الإصدار الأول (MVP)

> قائمة دوال Supabase Edge Functions المطلوبة لإطلاق التطبيق الأول.

---

## 1. `assign-order` — توزيع الطلبات على السائقين ⚠️ إلزامي

| البند | التفاصيل |
|-------|---------|
| **المسؤولية** | عند نشر الطلب: البحث عن سائقين مؤهلين عبر `drivers` (availability=online, is_verified=true) ثم إنشاء `order_assignments` بحالة `pending` وإرسال Push Notification |
| **يستدعى من** | المتجر يضغط "نشر للسائقين" |
| **الجداول** | `delivery_orders` (يُحدّث status→published), `order_assignments` (يُدرج pending), `push_tokens` (لإرسال الإشعار) |
| **يمكن تأجيله؟** | ❌ لا — بدونها لا يصل الطلب للسائقين |

---

## 2. `accept-order` — قبول السائق للطلب ✅ اختياري (يتم عبر SQL RLS حالياً)

| البند | التفاصيل |
|-------|---------|
| **المسؤولية** | قبول السائق للطلب. حالياً يتم عبر UPDATE مباشر على `order_assignments` مع RLS |
| **يستدعى من** | السائق يضغط "قبول" |
| **الجداول** | `order_assignments`, `delivery_orders` (عبر Trigger) |
| **يمكن تأجيله؟** | ✅ يمكن — التطبيق يحدّث `order_assignments.status` مباشرة (RLS تسمح بذلك) |

---

## 3. `update-order-status` — تحديث حالة التوصيل ✅ اختياري

| البند | التفاصيل |
|-------|---------|
| **المسؤولية** | السائق يحدّث حالة الطلب (وصلت المتجر/تم الاستلام/في الطريق/تم التوصيل) + تحديث `order_status_history` |
| **يستدعى من** | السائق يضغط تحديث الحالة |
| **الجداول** | `delivery_orders`, `order_status_history` |
| **يمكن تأجيله؟** | ✅ التطبيق يحدّث `delivery_orders.status` مباشرة (RLS تسمح بذلك) + Trigger sync_assigned_driver يسجل في history |

---

## 4. `send-notification` — إرسال Push Notification ⚠️ إلزامي

| البند | التفاصيل |
|-------|---------|
| **المسؤولية** | بعد إدراج صف في `notifications`، ترسل Push عبر Expo/FCM باستخدام `push_tokens` |
| **يستدعى من** | أي عملية تحتاج إشعار (يمكن استدعاؤها من Edge Functions الأخرى أو من التطبيق) |
| **الجداول** | `notifications` (قراءة), `push_tokens` (قراءة), `notification_templates` (اختياري) |
| **يمكن تأجيله؟** | ❌ لا — بدونها لا تصل الإشعارات |

---

## 5. `wallet-transfer` — إضافة حركة مالية ✅ اختياري

| البند | التفاصيل |
|-------|---------|
| **المسؤولية** | إضافة إيداع/سحب إلى المحفظة. تستدعي `add_wallet_transaction()` داخلياً |
| **يستدعى من** | إكمال الطلب (إضافة أجر السائق), السحب من الرصيد |
| **الجداول** | `wallets`, `wallet_transactions` |
| **يمكن تأجيله؟** | ✅ التطبيق يستدعي `add_wallet_transaction()` مباشرة كـ SQL function |

---

## 6. `send-otp` — إرسال رمز التحقق للعميل ✅ اختياري

| البند | التفاصيل |
|-------|---------|
| **المسؤولية** | توليد OTP عشوائي (VARCHAR(6)) وتحديث `delivery_orders.otp_code` + إرسال SMS |
| **يستدعى من** | السائق يضغط "تم التوصيل" |
| **الجداول** | `delivery_orders` (تحديث otp_code, otp_expires_at) |
| **يمكن تأجيله؟** | ✅ الإصدار الأول يعتمد على "تأكيد الاستلام اليدوي" من العميل |

---

## الخلاصة — Edge Functions للإصدار الأول

| الرقم | الاسم | إلزامي؟ | ملاحظات |
|:-----:|------|:-------:|---------|
| 1 | `assign-order` | **⚠️ نعم** | قلب نظام التوزيع |
| 2 | `accept-order` | لا | التطبيق يحدّث مباشرة |
| 3 | `update-order-status` | لا | التطبيق يحدّث مباشرة |
| 4 | `send-notification` | **⚠️ نعم** | لا إشعارات بدونها |
| 5 | `wallet-transfer` | لا | يستدعي SQL function مباشرة |
| 6 | `send-otp` | لا | العميل يؤكد يدوياً في v1 |

**Edge Functions الإلزامية فقط: `assign-order` + `send-notification`**
