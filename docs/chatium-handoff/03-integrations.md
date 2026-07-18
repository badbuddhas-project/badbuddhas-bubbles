# 03. Интеграции

Внешние системы, с которыми работает приложение. Для каждой — что делает, контракт, и как воспроизвести в Chatium.

## Telegram

Приложение живёт в первую очередь как **Telegram Mini App** (бот `@BadBuddhas_bubbles_bot`, deep-link `https://t.me/BadBuddhas_bubbles_bot/breathe`).

### Вход через Mini App
- При открытии Mini App Telegram передаёт `initData` (подписанные данные пользователя).
- Оригинал: `POST /api/auth/telegram-sync` — upsert пользователя по `telegram_id`. **HMAC не проверяется** (доверяет клиенту — это упрощение, которое стоит усилить).
- В Chatium: принять `initData` серверным обработчиком и **верифицировать HMAC-SHA256** по `TELEGRAM_BOT_TOKEN` (алгоритм из офиц. доки Telegram). Найти/создать запись в Heap `users`. Уточнить у Chatium, есть ли нативная интеграция с Telegram-ботами — тогда часть делается платформой.

### Вход через Telegram Login Widget (веб, вне Telegram)
- Оригинал: `POST /api/auth/telegram` — **проверяет HMAC-SHA256** по токену бота, требует `auth_date < 24ч`, upsert, ставит сессию.

### Bot API (нотификации)
- Оригинал: `lib/telegram-bot.ts` — `sendTelegramMessage()` (с inline URL-кнопкой; ошибка 403 = бот заблокирован пользователем), `answerCallbackQuery()`.
- Callback от кнопок бота: `POST /api/webhooks/telegram` (валидирует `TELEGRAM_WEBHOOK_SECRET`, отмечает `clicked_at`).
- В Chatium: исходящие вызовы Telegram Bot API по HTTP + приём вебхука бота.

## GetCourse (оплата и подписки)

GetCourse — российская LMS/платёжка (`online.badbuddhas.ru`). Сейчас так реализованы платежи.

- **Виджет оплаты:** iframe `public/gc-widget.html` (script id `1619747`), встроен в `/subscribe`.
- **Проверка оплаты:** `POST /api/getcourse/check-subscription` — двухшаговый polling Export API (экспорт пользователей → экспорт сделок со `status=payed`), кэширует в `subscriptions`, ставит `users.is_premium`. Ключ `GETCOURSE_API_KEY`.
- **Вебхук оплаты:** `POST /api/webhooks/getcourse` — коллбэк об оплате (form-urlencoded/JSON/query), валидирует `GETCOURSE_WEBHOOK_SECRET`, апсертит подписку active/expired, атрибутирует конверсию в `notification_log`. Запись данных — `GETCOURSE_WRITE_API_KEY`.

> **Решение отложено (см. `00-README.md`):** в Chatium возможны два пути — (а) перейти на **встроенный биллинг Chatium** (разовые покупки/подписки/триалы) или (б) **оставить GetCourse** и звать его по HTTP. Уточнить возможности встроенного биллинга у Chatium и выбрать. Логическая модель одна: успешная оплата → `subscriptions.status=active` + `users.is_premium=true`, с поддержкой оплаты до регистрации (pending по email).

## Yandex Metrika + Varioqub (аналитика и A/B)

- Счётчик **107703259** (эталон — `lib/analytics.ts`).
- `ymEvent(name, params)` → `reachGoal`; `ymIdentify(userId, params)` привязывает ClientID к пользователю (для сегментации по `is_premium`, платформе).
- Varioqub — A/B-эксперименты (подключены в корневом layout).
- В Chatium: подключить счётчик Metrika на клиенте и слать те же события; серверные события — через Measurement Protocol по HTTP. Полный список целей — в `docs/analytics-events.docx` оригинала.

## AddEvent (расписание эфиров)

- Оригинал: `GET /api/schedule` — прокси к календарю AddEvent (`ADDEVENT_API_TOKEN`), кэш 1 час. Питает экран `/schedule`.
- В Chatium: исходящий HTTP-запрос к AddEvent из серверного кода, кэш на час.

## Email (сброс пароля) — Resend

- Оригинал: `RESEND_API_KEY`, используется в `/api/auth/forgot-password`.
- В Chatium: если используется **нативная авторизация Chatium** (email/SMS-коды), собственная отправка писем и сброс пароля, скорее всего, **не нужны** — платформа берёт это на себя. Иначе — исходящий вызов почтового провайдера.

## Сводка: что заменяется чем

| Оригинал | В Chatium |
|---|---|
| Кастомный JWT + 3 пути входа | Нативная авторизация + связка Telegram |
| Supabase Storage (аудио/картинки) | Медиасервис Chatium |
| Vercel Cron → нотификации | Отложенные задачи Chatium |
| Resend (письма) | Встроенная авторизация Chatium (пароли могут отпасть) |
| GetCourse | Встроенный биллинг Chatium **или** GetCourse по HTTP |
| Yandex Metrika / Varioqub | Тот же счётчик + события |
| AddEvent | Исходящий HTTP из Chatium |
