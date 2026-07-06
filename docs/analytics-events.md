# Аналитика: события Яндекс.Метрики

Счётчик: **107703259**. Инициализация — [app/layout.tsx](../app/layout.tsx), хелперы — [lib/analytics.ts](../lib/analytics.ts) (`ymEvent`, `ymIdentify`, `getPlatform`).

Все события отправляются как `reachGoal`. Сквозные параметры: `platform` (`telegram` | `web`), плюс `source`/`method` для сегментации. Идентификация юзера — `ymIdentify(userId, {...})` в [AuthProvider](../components/AuthProvider.tsx) связывает ClientID с реальным `UserID`.

> ⚠️ Все цели наполняются **только с момента создания** — задним числом Метрика их не заполняет.
> ⚠️ Аудитория ~100% Telegram. Аккаунт в Supabase создаётся в момент первого запуска (`telegram-sync`), **до** онбординга и почты.

---

## 🚪 Вход и авторизация

| Событие | Goal ID | Когда шлётся | Параметры | Где |
|---|---|---|---|---|
| `app_opened` | 530021722 | Каждое открытие приложения | `platform`, `method`, `source` | [page.tsx:51](../app/page.tsx), [AuthProvider:71](../components/AuthProvider.tsx) |
| `onboarding_started` | 579305068 | Показан 1-й слайд онбординга | — | [onboarding:36](../app/onboarding/page.tsx) |
| `onboarding_completed` | 579305069 | «Начать»/«Пропустить» в конце онбординга | — | [onboarding:62](../app/onboarding/page.tsx) |
| `user_authorized` | 579305072 | Успешная Telegram-авторизация нового юзера (реальный «стал пользователем» для TG) | `platform`, `method=telegram` | [AuthProvider:72](../components/AuthProvider.tsx) |
| `email_gate_shown` | 579305070 | Показан экран «Ваш email» (TG, после онбординга) | `platform` | [EmailGate:19](../components/EmailGate.tsx) |
| `email_submitted` | 579305071 | Успешно ввёл почту на этом экране | `platform`, `activated` | [EmailGate:41](../components/EmailGate.tsx) |
| `user_registered` | 530021723 | Регистрация через **веб-форму** (email) ⚠️ | `method=email`, `platform` | [register:58](../app/register/page.tsx), [login:78](../app/login/page.tsx) |
| `user_logged_in` | 530021724 | Вход через **веб-форму** (email) ⚠️ | `method=email`, `platform` | [login:57](../app/login/page.tsx) |

⚠️ `user_registered` / `user_logged_in` — только веб. У Telegram-аудитории **не срабатывают** (авторизация авто-скрытая внутри `app_opened` → см. `user_authorized`).

---

## 👀 Просмотры экранов

| Событие | Goal ID | Когда | Где |
|---|---|---|---|
| `practice_list_viewed` | 530021725 | Открыл главную со списком практик | [page.tsx:97](../app/page.tsx) |
| `catalog_viewed` | 579306660 | Открыл каталог `/catalog` | [catalog:54](../app/catalog/page.tsx) |
| `favorites_viewed` | 579306661 | Открыл избранное `/favorites` | [favorites:38](../app/favorites/page.tsx) |
| `profile_viewed` | 530021732 | Открыл профиль | [profile:37](../app/profile/page.tsx) |

---

## 🧘 Практики и вовлечение

| Событие | Goal ID | Когда | Параметры | Где |
|---|---|---|---|---|
| `practice_started` | 530021726 | Запустил воспроизведение практики | `practice_id`, `practice_name`, `is_premium`, `platform` | [practice:99](../app/practice/[id]/page.tsx) |
| `practice_completed` | 530021727 | Дослушал практику до конца | `practice_id`, `practice_name`, `platform` | [practice:57](../app/practice/[id]/page.tsx) |
| `practice_abandoned` | 530021729 | Ушёл, не дослушав | `practice_id`, `platform` | [practice:91](../app/practice/[id]/page.tsx) |
| `streak_updated` | 530021731 | Обновился стрик после практики | `streak_days`, `platform` | [usePracticeCompletion:34](../hooks/usePracticeCompletion.ts) |
| `favorite_toggled` | 579306662 | Добавил/убрал из избранного | `action` (added/removed), `practice_id` | [useFavorites:48](../hooks/useFavorites.ts) |

---

## 💳 Монетизация

| Событие | Goal ID | Когда | Параметры | Где |
|---|---|---|---|---|
| `premium_wall_shown` | 530021730 | Тапнул премиум-практику без доступа → отправлен на подписку (**вход в воронку монетизации**) | `practice_id`, `source` (home/catalog/related), `platform` | [page:155](../app/page.tsx), [catalog:92](../app/catalog/page.tsx), [practice:436](../app/practice/[id]/page.tsx) |
| `subscribe_banner_click` | 571436022 | Клик по баннеру подписки/триала | `banner` (renewal/trial_expiry/subscribe), `platform` | [page:175](../app/page.tsx) |
| `subscribe_page_viewed` | 571436023 | Открыл страницу подписки | `source`, `platform` | [subscribe:54](../app/subscribe/page.tsx) |
| `subscribe_payment_opened` | 571436024 | Открыл виджет оплаты (GetCourse) | `platform` | [subscribe:59](../app/subscribe/page.tsx) |
| `subscribe_activate_opened` | 571436026 | Открыл активацию по email | `platform` | [subscribe:65](../app/subscribe/page.tsx) |
| `subscription_activated` | 571436027 | Оплата прошла успешно | `platform` | [subscribe:128](../app/subscribe/page.tsx) |
| `subscription_check_failed` | 571436028 | Подписка не найдена / ошибка проверки | `reason` (not_found/error), `platform` | [subscribe:131](../app/subscribe/page.tsx) |

---

## ⚙️ Прочее

| Событие | Goal ID | Когда | Параметры | Где |
|---|---|---|---|---|
| `language_changed` | 579306663 | Сменил язык в настройках | `language` | [settings:65](../app/profile/settings/page.tsx) |

---

## Ключевые воронки

**Воронка входа (активация):**
`app_opened → onboarding_started → onboarding_completed → email_gate_shown → email_submitted`
- «бросил онбординг» = `onboarding_started` − `onboarding_completed`
- «не ввёл почту» = `email_gate_shown` − `email_submitted`

**Воронка монетизации** — заведена как составная цель в Метрике, **id 579307452** («Воронка монетизации»):
`app_opened → premium_wall_shown → subscribe_page_viewed → subscribe_payment_opened → subscription_activated`
- «упёрся в пейволл» = `premium_wall_shown`
- «дошёл до оплаты, но не купил» = `subscribe_payment_opened` − `subscription_activated`

> Составная цель в Метрике ограничена **5 шагами**, поэтому `practice_started` (вовлечение) в неё не вошёл. Если нужен 6-шаговый разрез с практикой — строить через UI-отчёт «Воронки» (там ограничение мягче), добавив `practice_started` между запуском и пейволлом.

---

_Обновлено: 2026-07-06. Изменения в разметке дублировать здесь и заводить цели через Management API (`POST /management/v1/counter/107703259/goals`, тип `action`, `conditions:[{type:"exact", url:"<event>"}]`)._
