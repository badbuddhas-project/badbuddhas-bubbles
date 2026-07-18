# 02. Модель данных (под Heap)

Оригинал — Supabase Postgres (17 миграций в `supabase/migrations/`). Ниже — логическая модель для воспроизведения в Heap-таблицах Chatium. Типы указаны абстрактно (string / int / bool / datetime / uuid).

> **Важно:** в оригинале безопасность на уровне строк (RLS) отключена по смыслу — `auth.uid()` всегда NULL, политики разрешают всё, а изоляция по пользователю сделана **в коде** (каждый запрос фильтруется по `user_id`). В Chatium используйте роли/авторизацию платформы и так же фильтруйте по текущему пользователю в коде.

## Таблицы

### users — единая идентичность
Один пользователь может прийти из Telegram и/или по email — всё сходится в одну запись.

| Поле | Тип | Назначение |
|---|---|---|
| id | uuid (PK) | идентификатор |
| telegram_id | int, unique, nullable | ID из Telegram |
| username | string | TG username |
| first_name / last_name | string | имя |
| email | string, unique, nullable | email |
| verified_email | string | подтверждённый email |
| password_hash | string | только для email/пароль (в Chatium может не понадобиться) |
| supabase_user_id | uuid | связка со старой Supabase Auth (для миграции) |
| email_confirmed_at | datetime | подтверждение email |
| reset_token / reset_token_expires_at | string / datetime | сброс пароля |
| auth_provider | string (default 'telegram') | откуда пришёл |
| is_premium | bool (default false) | признак премиума |
| trial_ends_at | datetime | конец 14-дневного триала |
| created_at | datetime | создание |

### practices — каталог практик (наполняется вручную)
| Поле | Тип | Назначение |
|---|---|---|
| id | uuid (PK) | |
| title / title_ru | string | название (EN/RU) |
| duration_seconds | int | длительность |
| category | enum: relax / balance / energize | категория |
| language | string (default 'ru') | язык практики |
| instructor_name | string | инструктор |
| instructor_avatar_url | string | аватар инструктора (URL медиасервиса) |
| audio_url | string | аудио (URL медиасервиса Chatium) |
| preview_image_url | string | обложка |
| is_premium | bool (default false) | платная ли практика |
| sort_order | int | порядок в каталоге |

### user_practices — история прослушиваний
| Поле | Тип | Назначение |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid → users | кто |
| practice_id | uuid → practices | что |
| completed_at | datetime (default now) | когда |
| listened_seconds | int | сколько прослушано |

### user_stats — агрегаты пользователя (1:1 с users)
Создаётся автоматически при создании пользователя (в оригинале — триггер `on_user_created`; в Chatium — создавать вместе с users).

| Поле | Тип | Назначение |
|---|---|---|
| user_id | uuid (PK) → users | |
| current_streak | int | текущий стрик (дней подряд) |
| longest_streak | int | рекорд |
| total_practices | int | всего практик |
| total_minutes | int | всего минут |
| last_practice_date | date | дата последней практики |
| streak_lives | int (default 3) | «жизни» стрика (задел на будущее) |

### favorites — избранное
| Поле | Тип | Назначение |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid → users | |
| practice_id | uuid → practices | |
| created_at | datetime | |
| — | unique(user_id, practice_id) | не дублировать |

### subscriptions — подписки
Может содержать **pending-строки по email** (user_id ещё не известен — оплата до регистрации).

| Поле | Тип | Назначение |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid → users, nullable | владелец (может быть NULL для pending) |
| email | string | email плательщика |
| status | enum: active / expired | статус |
| expires_at | datetime | до когда активна |
| gc_deal_id | string | ID сделки GetCourse |
| telegram_id | int | TG для привязки |
| tg_username | string | |
| created_at / updated_at | datetime | |

### notification_log — леджер нотификаций (идемпотентность + A/B)
| Поле | Тип | Назначение |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid → users | |
| trigger | string | тип нотификации (напр. `trial_expired`) |
| group_ | string | ветка A/B (treatment / holdout) |
| sent_at | datetime | |
| message_id | string | ID сообщения TG |
| delivered / bot_blocked | bool | доставлено / бот заблокирован |
| clicked_at / converted_at | datetime | клик / конверсия |
| — | unique(user_id, trigger) | одна нотификация каждого типа на пользователя |

## Стрик — как считать (критично)

В оригинале это SQL-функция `recalc_user_streak` (`supabase/migrations/017_streak_recalc.sql`). **Перепишите её на серверном TypeScript Chatium.** Логика:

1. Взять все `user_practices` пользователя.
2. Получить **множество уникальных дат** практик в таймзоне **Europe/Moscow** (`completed_at` → дата по МСК).
3. Найти длину непрерывных серий подряд идущих дней (классический приём gaps-and-islands: группируем по `дата − порядковый_номер`).
4. `current_streak` = длина серии, заканчивающейся на **самую позднюю** дату. `longest_streak` = максимальная длина среди всех серий.
5. `total_practices` = число записей, `total_minutes` = сумма `listened_seconds` / 60.
6. Записать в `user_stats`, при этом **никогда не уменьшать** `longest_streak`, `total_practices`, `total_minutes` (беречь легаси-значения): берём `max(старое, новое)`.
7. Функция **идемпотентна**: пересчёт из истории всегда даёт корректный результат. Вызывать после каждой завершённой практики (эталон — `hooks/usePracticeCompletion.ts`). Если вызов потерялся — следующая практика само-исправит стрик.

> Почему так: раньше стрик считали инкрементально (вставка практики + отдельный не-транзакционный апдейт), и при потере второго запроса `last_practice_date` отставал, а следующая сессия видела «разрыв» и обнуляла стрик. Пересчёт из истории убирает этот баг.
