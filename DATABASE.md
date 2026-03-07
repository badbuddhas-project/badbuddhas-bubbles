# DATABASE.md — Breathwork with BadBuddhas

PostgreSQL через Supabase. Расширение: `uuid-ossp`.

---

## 1. Таблицы

### `users`

Единая таблица для всех способов входа: Telegram Mini App, Telegram Login Widget, email/password.

| Колонка | Тип PostgreSQL | Тип TS | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `UUID` | `string` | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `telegram_id` | `BIGINT` | `number \| null` | YES | — | UNIQUE (partial, где NOT NULL) |
| `username` | `TEXT` | `string \| null` | YES | — | — |
| `first_name` | `TEXT` | `string \| null` | YES | — | — |
| `last_name` | `TEXT` | `string \| null` | YES | — | — |
| `is_premium` | `BOOLEAN` | `boolean` | NO | `FALSE` | — |
| `created_at` | `TIMESTAMPTZ` | `string` | NO | `NOW()` | — |
| `email` | `TEXT` | `string \| null` | YES | — | UNIQUE (`users_email_key`) |
| `password_hash` | `TEXT` | `string \| null` | YES | — | — |
| `auth_provider` | `TEXT` | `string` | NO | `'telegram'` | — |
| `supabase_user_id` | `UUID` | `string \| null` | YES | — | UNIQUE (partial, где NOT NULL) |
| `reset_token` | `TEXT` | `string \| null` | YES | — | — |
| `reset_token_expires_at` | `TIMESTAMPTZ` | `string \| null` | YES | — | — |
| `email_confirmed_at` | `TIMESTAMPTZ` | `string \| null` | YES | — | — |

**Индексы:**
- `idx_users_telegram_id` ON `(telegram_id)`
- `idx_users_email` ON `(email)`
- `idx_users_supabase_id` ON `(supabase_user_id)`
- `idx_users_supabase_user_id_unique` — UNIQUE partial ON `(supabase_user_id) WHERE supabase_user_id IS NOT NULL`
- `idx_users_reset_token` — partial ON `(reset_token) WHERE reset_token IS NOT NULL`

---

### `practices`

Каталог аудио-практик. Управляется вручную через Supabase Dashboard.

| Колонка | Тип PostgreSQL | Тип TS | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `UUID` | `string` | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `title` | `TEXT` | `string` | NO | — | NOT NULL |
| `title_ru` | `TEXT` | `string` | NO | — | NOT NULL |
| `duration_seconds` | `INTEGER` | `number` | NO | — | NOT NULL |
| `category` | `practice_category` | `'relax' \| 'balance' \| 'energize'` | NO | — | NOT NULL, ENUM |
| `language` | `TEXT` | `string` | NO | `'ru'` | NOT NULL |
| `instructor_name` | `TEXT` | `string` | NO | — | NOT NULL |
| `instructor_avatar_url` | `TEXT` | `string \| null` | YES | — | — |
| `audio_url` | `TEXT` | `string` | NO | — | NOT NULL |
| `preview_image_url` | `TEXT` | `string \| null` | YES | — | — |
| `is_premium` | `BOOLEAN` | `boolean` | NO | `FALSE` | — |
| `sort_order` | `INTEGER` | `number` | NO | `0` | — |
| `created_at` | `TIMESTAMPTZ` | `string` | NO | `NOW()` | — |

**Индексы:**
- `idx_practices_category` ON `(category)`
- `idx_practices_sort_order` ON `(sort_order)`
- `idx_practices_language` ON `(language)`

**Enum:**
```sql
CREATE TYPE practice_category AS ENUM ('relax', 'balance', 'energize');
```

---

### `favorites`

Избранные практики пользователя. Пара `(user_id, practice_id)` уникальна.

| Колонка | Тип PostgreSQL | Тип TS | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `UUID` | `string` | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | `UUID` | `string` | NO | — | FK → `users(id)` ON DELETE CASCADE |
| `practice_id` | `UUID` | `string` | NO | — | FK → `practices(id)` ON DELETE CASCADE |
| `created_at` | `TIMESTAMPTZ` | `string` | NO | `NOW()` | — |

**Constraints:** `UNIQUE(user_id, practice_id)`

**Индексы:**
- `idx_favorites_user_id` ON `(user_id)`

---

### `user_stats`

Агрегированная статистика пользователя. Строка создаётся автоматически триггером при вставке в `users`.

| Колонка | Тип PostgreSQL | Тип TS | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `user_id` | `UUID` | `string` | NO | — | PRIMARY KEY, FK → `users(id)` ON DELETE CASCADE |
| `current_streak` | `INTEGER` | `number` | NO | `0` | — |
| `longest_streak` | `INTEGER` | `number` | NO | `0` | — |
| `total_practices` | `INTEGER` | `number` | NO | `0` | — |
| `total_minutes` | `INTEGER` | `number` | NO | `0` | — |
| `last_practice_date` | `DATE` | `string \| null` | YES | — | — |
| `streak_lives` | `INTEGER` | `number` | NO | `3` | — |

> `user_id` — одновременно PRIMARY KEY и FK. Отношение 1:1 с `users`.

---

### `user_practices`

История прослушиваний (одна запись = один сеанс практики).

| Колонка | Тип PostgreSQL | Тип TS | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `UUID` | `string` | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | `UUID` | `string` | NO | — | FK → `users(id)` ON DELETE CASCADE |
| `practice_id` | `UUID` | `string` | NO | — | FK → `practices(id)` ON DELETE CASCADE |
| `completed_at` | `TIMESTAMPTZ` | `string` | NO | `NOW()` | — |
| `listened_seconds` | `INTEGER` | `number` | NO | `0` | NOT NULL |

**Индексы:**
- `idx_user_practices_user_id` ON `(user_id)`
- `idx_user_practices_completed_at` ON `(completed_at)`

---

## 2. Foreign Keys и связи

```
users (id)
  ├── favorites.user_id          ON DELETE CASCADE  (1:N)
  ├── user_stats.user_id         ON DELETE CASCADE  (1:1, PK)
  └── user_practices.user_id     ON DELETE CASCADE  (1:N)

practices (id)
  ├── favorites.practice_id      ON DELETE CASCADE  (1:N)
  └── user_practices.practice_id ON DELETE CASCADE  (1:N)
```

Все FK используют `ON DELETE CASCADE`: удаление пользователя или практики автоматически очищает все связанные записи.

---

## 3. Триггеры и функции

### `create_user_stats()` + `on_user_created`

```sql
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats();
```

При создании любого пользователя автоматически создаётся строка в `user_stats` с нулевыми значениями. Функция выполняется с `SECURITY DEFINER`.

> **Важно:** `usePracticeCompletion.ts` содержит fallback-вставку на случай, если триггер не отработал (`if (!stats) { INSERT INTO user_stats ... }`).

---

## 4. RLS политики

RLS включён на всех таблицах. Приложение использует **кастомную JWT-аутентификацию** (не Supabase Auth), поэтому `auth.uid()` всегда `NULL`. Изоляция данных по пользователям обеспечивается на уровне приложения (все запросы фильтруют по `user_id`).

Все политики — **разрешающие (`USING (TRUE)`)**, роли: `anon` и `authenticated`.

| Таблица | Операция | Политика | Роли |
|---|---|---|---|
| `users` | SELECT | `Allow select users` | anon, authenticated |
| `users` | INSERT | `Allow insert users` | anon, authenticated |
| `users` | UPDATE | `Allow update users` | anon, authenticated |
| `users` | DELETE | `Allow delete users` | anon, authenticated |
| `practices` | SELECT | `Anyone can view practices` | anon, authenticated |
| `practices` | INSERT/UPDATE/DELETE | *нет политики* — запись только через service role | — |
| `favorites` | SELECT | `Allow select favorites` | anon, authenticated |
| `favorites` | INSERT | `Allow insert favorites` | anon, authenticated |
| `favorites` | DELETE | `Allow delete favorites` | anon, authenticated |
| `user_stats` | SELECT | `Allow select user_stats` | anon, authenticated |
| `user_stats` | INSERT | `Allow insert user_stats` | anon, authenticated |
| `user_stats` | UPDATE | `Allow update user_stats` | anon, authenticated |
| `user_practices` | SELECT | `Allow select user_practices` | anon, authenticated |
| `user_practices` | INSERT | `Allow insert user_practices` | anon, authenticated |

> API routes используют `SUPABASE_SERVICE_ROLE_KEY` (обходит RLS). Клиентский код использует `NEXT_PUBLIC_SUPABASE_ANON_KEY` (подчиняется RLS).

---

## 5. История миграций

| № | Файл | Что изменено |
|---|---|---|
| 001 | `001_initial_schema.sql` | Создание таблиц `users`, `practices`, `favorites`, `user_stats`, `user_practices`; enum `practice_category`; все индексы; RLS политики; триггер `on_user_created` |
| 002 | `002_fix_rls_policies.sql` | Пересоздание RLS политик — удалены старые (auth.uid()-based), добавлены permissive для `anon`/`authenticated` |
| 003 | `003_add_practice_language.sql` | Добавлена колонка `practices.language TEXT NOT NULL DEFAULT 'ru'`; индекс `idx_practices_language` |
| 004 | `004_add_streak_lives.sql` | Добавлена колонка `user_stats.streak_lives INTEGER DEFAULT 3` |
| 005 | `005_add_web_auth.sql` | Добавлены `users.email UNIQUE`, `users.auth_provider DEFAULT 'telegram'`, `users.supabase_user_id UUID`; `telegram_id` стал nullable; индексы по email и supabase_user_id |
| 006 | `006_unique_supabase_user_id.sql` | Partial UNIQUE index на `users.supabase_user_id WHERE supabase_user_id IS NOT NULL` |
| 007 | `007_add_email_auth.sql` | Добавлена `users.password_hash TEXT`; UNIQUE constraint на `email` (idempotent); индекс по email |
| 008 | `008_add_reset_token.sql` | Добавлены `users.reset_token TEXT`, `users.reset_token_expires_at TIMESTAMPTZ`; partial индекс по reset_token |
| 009 | `009_add_email_confirmed.sql` | Добавлена `users.email_confirmed_at TIMESTAMPTZ` — момент подтверждения email после ConnectEmailModal |

---

## 6. Следующая миграция

Номер файла: **`010_описание.sql`**

Шаблон:

```sql
-- =============================================
-- Migration 010: <краткое описание>
-- =============================================

ALTER TABLE <таблица>
  ADD COLUMN IF NOT EXISTS <колонка> <тип>;
```

После применения миграции обновить `types/database.ts`.
