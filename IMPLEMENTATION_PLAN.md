# City-Pulse — План реализации

> Социальная платформа для офлайн-сообществ экспатов и локальных жителей

## Стек технологий

| Слой | Технология |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, React 19 |
| UI | shadcn/ui + Tailwind CSS 4 + Radix UI |
| Backend/API | Next.js Route Handlers + Server Actions |
| База данных | Supabase (PostgreSQL) + Row Level Security |
| Аутентификация | Supabase Auth (Email + Google) |
| Real-time | Supabase Realtime (чат, уведомления) |
| Карты | Leaflet.js + OpenStreetMap + Nominatim API |
| Email | Resend (дайджесты, верификация) |
| Push-уведомления | Web Push API (service worker) |
| i18n | next-intl (EN, RU, UK, CS, DE) |
| Хостинг | Vercel |
| Файлы/фото | Supabase Storage |
| SEO | Next.js Metadata API + JSON-LD + Open Graph |
| Валидация | Zod |
| State management | Zustand (клиент) + React Server Components |
| Markdown | react-markdown + sanitization |
| Cron jobs | Vercel Cron Functions (дайджесты, напоминания) |

## Структура базы данных (основные таблицы)

```
profiles, interests, cities,
events, event_attendees, event_favorites, event_moderators, event_reviews, event_photos,
groups, group_members, group_subscriptions,
conversations, conversation_participants, messages,
notifications, push_subscriptions,
reports, activity_logs,
user_subscriptions, badges, user_badges,
analytics_events
```

---

## Фазы реализации

### Фаза 0: Инфраструктура и скелет проекта ✅

#### 0.1 — Инициализация проекта ✅
- [x] Next.js 15 + TypeScript + Tailwind CSS 4
- [x] ESLint + Prettier конфигурация
- [x] shadcn/ui инициализация + тема (светлая/тёмная)
- [x] Структура папок: `app/`, `components/`, `lib/`, `types/`, `hooks/`, `utils/`

#### 0.2 — Supabase ✅
- [x] Подключение `@supabase/ssr` для Server Components
- [x] Middleware для сессий (graceful при отсутствии env)
- [ ] Создание проекта в Supabase (требует ручной настройки)
- [ ] Row Level Security — базовые политики (будет в Фазе 1)
- [ ] Supabase Storage — бакеты (будет в Фазе 1)

#### 0.3 — i18n (мультиязычность) ✅
- [x] `next-intl` с routing: `/en/...`, `/ru/...`, `/uk/...`, `/cs/...`, `/de/...`
- [x] Файлы переводов: `messages/en.json`, `ru.json`, `uk.json`, `cs.json`, `de.json`
- [x] Автоопределение языка браузера
- [x] Переключатель языка в хедере
- [ ] Мультиязычная база интересов (будет в Фазе 1.3)

#### 0.4 — Layout и навигация ✅
- [x] Responsive layout (mobile-first)
- [x] Header: логотип, навигация, языки, уведомления, профиль
- [x] Footer: Terms & Conditions, Privacy Policy, инструкция
- [x] Mobile: бургер-меню (Sheet)
- [x] Тема: светлая/тёмная/системная
- [ ] Breadcrumbs (будет добавлено позже)

---

### Фаза 1: Аутентификация и профиль пользователя ✅

#### 1.1 — Auth ✅
- [x] Регистрация (email + пароль)
- [x] Вход (email + Google OAuth)
- [x] Email подтверждение (страница verify-email)
- [x] Восстановление пароля (forgot-password)
- [x] OAuth callback route
- [x] Сессия через cookies (SSR-совместимо, @supabase/ssr)
- [x] Server Actions для auth (signUp, signIn, signInWithGoogle, signOut, resetPassword)
- [x] Zod валидация форм

#### 1.2 — Профиль пользователя ✅
- [x] Таблица `profiles` с RLS (auto-create trigger на signup)
- [x] Страница профиля `/[locale]/profile/[id]` с SEO metadata
- [x] Форма редактирования профиля (все поля: имя, возраст, город, био, языки, соцсети, приватность)
- [x] Загрузка аватара (Supabase Storage, bucket с policies)
- [x] Приватный профиль — RLS: публичные vs приватные
- [x] Статистика: placeholder для мероприятий, рейтинга, бейджей
- [x] Header адаптируется: залогинен / не залогинен (UserMenu / кнопки Login+Register)

#### 1.3 — Система интересов ✅
- [x] Таблица `interests` с мультиязычными переводами
- [x] Multi-select в форме редактирования профиля (toggle badges)
- [x] Seed-скрипт с 60 категориями на 5 языках

#### 1.4 — System User ✅
- [x] Роль 'system' в таблице profiles (поддержка в schema)
- [ ] Создание аккаунта System — будет при первом запуске миграций

---

### Фаза 2: Мероприятия (Events) ✅

#### 2.1 — Модель данных ✅
- [x] Таблица `events` с полным набором полей + RLS + trigger updated_at
- [x] Таблица `event_attendees` + RLS
- [x] Таблица `event_favorites` + RLS
- [x] Таблица `event_moderators` + RLS
- [x] Таблица `event_reviews` (1-5, привязка к attendees) + RLS
- [x] Таблица `event_comments` (with parent_id, is_approved) + RLS
- [x] View `events_with_counts` (going_count, avg_rating, organizer info, category)
- [x] Storage bucket `event-photos`
- [x] Indexes на все ключевые поля

#### 2.2 — CRUD мероприятий ✅
- [x] Форма создания: все поля, категория (toggle badges), дата/время, тип/цена
- [x] Загрузка фото (до 5, Supabase Storage)
- [x] Приватные мероприятия — генерация unique token
- [x] Server Actions: createEvent, updateEvent, uploadEventPhoto

#### 2.3 — Карты и адреса ✅
- [x] Leaflet.js + OpenStreetMap тайлы (dynamic import, ssr: false)
- [x] Nominatim API: автокомплит с debounce
- [x] Клик на карту → reverse geocoding → автозаполнение
- [x] LocationPicker компонент (search + map + marker)

#### 2.4 — Страница мероприятия ✅
- [x] SSR с SEO (Open Graph, meta description, title)
- [x] Кнопка "Пойду"/"Не пойду" (оптимистичный UI + toast)
- [x] Кнопка "В избранное" (сердце, заливка, toast)
- [x] Кнопка "Поделиться" (Web Share API + fallback clipboard)
- [x] Счётчик участников / свободных мест
- [x] Комментарии (добавление + список)
- [x] Фотогалерея
- [x] Карта на странице
- [x] Sidebar: дата, время, длительность, место, участники, рейтинг

#### 2.5 — Листинг мероприятий ✅
- [x] Фильтры: город, страна, категория, дата (сегодня/завтра/выходные/диапазон), бесплатные, онлайн/офлайн
- [x] Карточки событий: фото, название, дата, место, участники, сердце, кнопка "Пойду"
- [x] SSR для SEO

#### 2.6 — QR-код подтверждения посещения ✅
- [x] QR-код компонент (qrcode.react) + download PNG
- [x] Route `/confirm-attendance/[eventId]` — подтверждение через redirect
- [x] Обновление event_attendees.confirmed + confirmed_at

---

### Фаза 3: Группы (Groups) ✅

#### 3.1 — Модель данных ✅
- [x] Таблица `groups` с RLS + trigger updated_at
- [x] Таблица `group_members` (role: member/moderator/admin) + RLS
- [x] Таблица `group_subscriptions` + RLS
- [x] Связь с `events` через `events.group_id` (FK)
- [x] View `groups_with_counts` (member_count, event_count, creator info)
- [x] Storage bucket `group-covers`
- [x] Indexes

#### 3.2 — Функциональность групп ✅
- [x] Создание группы (форма + обложка)
- [x] Страница группы: описание, участники, мероприятия
- [x] Вступление / выход (toggle membership)
- [x] Подписка на обновления (toggle subscription)
- [x] Листинг групп с карточками
- [ ] Модерация: назначение модераторов (будет в Фазе 9)

---

### Фаза 4: Discovery и лендинг ✅

#### 4.1 — Лендинг (главная) ✅
- [x] Автоопределение языка (browser `Accept-Language` через next-intl)
- [x] CTA "Найти людей по интересам" для незалогиненных
- [x] Секции: Сегодня / Завтра / Выходные / Популярные (SSR, реальные данные)
- [x] Топ-4 активных группы
- [x] Полная локализация feature-карточек (5 языков)
- [x] Адаптивный CTA блок (скрывается для залогиненных)
- [ ] Автоопределение региона (IP-based) — будущая фаза
- [ ] SEO: динамические метатеги для каждого города — будущая фаза

#### 4.2 — Поиск ⬜
- [ ] Full-text search (PostgreSQL `tsvector` + `tsquery`)
- [ ] Поиск по мероприятиям, группам, пользователям
- [ ] Debounced input с подсказками

---

### Фаза 5: Календарь ✅

#### 5.1 — Календарь региона ✅
- [x] Страница `/[locale]/calendar`
- [x] Календарная сетка (месяц) с навигацией вперёд/назад
- [x] Точки-индикаторы событий на днях
- [x] Клик на день → список событий (название, время, место, бейджи)
- [x] Переключение "Все события" / "Мои события" (Tabs)

#### 5.2 — Личный календарь ✅
- [x] События, на которые пользователь записался
- [x] API route `/api/calendar/[eventId]/ical` — генерация .ics файла
- [ ] Цветовая маркировка по категориям — будущее улучшение

---

### Фаза 6: Коммуникация ✅

#### 6.1 — Личные сообщения (чат) ✅
- [x] Таблица `conversations` (participant_1, participant_2, status: pending/active/blocked) + RLS
- [x] Таблица `messages` (conversation_id, sender_id, content, is_read) + RLS
- [x] Таблица `blocked_users` + RLS
- [x] View `conversations_with_details` (last message, unread count, participant info)
- [x] Запрос на переписку → одобрение (approve/decline)
- [x] Страница сообщений (список бесед) + страница чата (split layout)
- [x] Кнопка "Request to chat" на профиле пользователя
- [x] Блокировка пользователя
- [ ] Supabase Realtime: мгновенная доставка — будущее улучшение

#### 6.2 — Системные сообщения ⬜
- [ ] System User отправляет уведомления, дайджесты, новости
- [ ] Админ-панель: рассылка с фильтрами

---

### Фаза 7: Уведомления 🔄

#### 7.1 — Push-уведомления ⬜
- [ ] Service Worker (Web Push API)
- [ ] Таблица `push_subscriptions`: `user_id`, `subscription` (jsonb), `created_at`
- [ ] Триггеры: новое мероприятие, ответ на комментарий, сообщение, "2 места", напоминания
- [ ] Настройки уведомлений для пользователя

#### 7.2 — Email дайджест ⬜
- [ ] Vercel Cron → еженедельная рассылка через Resend
- [ ] HTML-шаблон (React Email)
- [ ] Отписка (one-click unsubscribe)

#### 7.3 — In-app уведомления ✅
- [x] Таблица `notifications` (type, title, body, data jsonb, is_read) + RLS
- [x] Иконка-колокольчик в хедере с badge (счётчик непрочитанных)
- [x] Popover со списком уведомлений + иконки по типу
- [x] "Отметить все прочитанными"
- [x] Server actions: getNotifications, getUnreadCount, markAsRead, markAllAsRead, createNotification
- [ ] Supabase Realtime для мгновенного обновления — будущее улучшение

---

### Фаза 8: Афиша города (System Events) ✅

#### 8.1 — Системные события ✅
- [x] Флаг `is_system` + `source_url` в `events` (уже было в схеме)
- [x] Роль `admin`/`moderator` в `profiles` (миграция 007)
- [x] Server Actions: `createSystemEvent`, `getSystemEvents`, `isAdmin`
- [x] Страница `/city-events` с листингом + бейдж "City event"
- [x] Навигация: ссылка "Афиша" в хедере и мобильном меню
- [ ] Парсинг открытых API городских афиш — будущая фаза

---

### Фаза 9: Trust & Safety ✅

#### 9.1 — Модерация и безопасность ✅
- [x] Таблица `reports` (reporter_id, target_type, target_id, reason, status, resolved_by) + RLS
- [x] Таблица `activity_logs` (user_id, action, metadata) + RLS (only admins)
- [x] `ReportDialog` компонент: причина (spam/harassment/inappropriate/fake/other) + описание
- [x] Кнопка "Report" на мероприятиях и профилях
- [x] Server Actions: `createReport`, `getReports`, `resolveReport`, `logActivity`
- [x] Переводы на 5 языков
- [ ] Rate limiting — будущее улучшение

---

### Фаза 10: Социальная динамика и репутация ✅

#### 10.1 — Подписки ✅
- [x] Таблица `user_subscriptions` + RLS
- [x] `FollowButton` компонент (follow/unfollow toggle)
- [x] Кнопка Follow на профиле пользователя

#### 10.2 — Репутационная система ✅
- [x] View `profile_stats` (events_created, events_attended, avg_rating, follower_count)
- [x] Таблица `badges` с 8 категориями и переводами на 5 языков
- [x] Таблица `user_badges` + RLS
- [x] Бейджи отображаются на профиле
- [x] Реальная статистика на профиле (вместо placeholder 0)
- [ ] Автоматическое присвоение бейджей (cron) — будущая фаза

---

### Фаза 11: Event Lifecycle ✅

#### 11.1 — Полный цикл мероприятия ✅
- [x] Статусы: `draft` → `published` → `completed` / `cancelled`
- [x] Управление организатором: Publish, Mark completed, Cancel, Duplicate
- [x] AlertDialog для подтверждения отмены
- [x] Duplicate: создаёт черновик с датой +7 дней
- [x] Форма отзыва (`EventReviewForm`): 1-5 звёзд + комментарий (для attendees после completed)
- [x] Server Actions: `cancelEvent`, `completeEvent`, `duplicateEvent`, `publishDraft`, `submitReview`, `getEventReviews`
- [x] Бейджи статуса (Cancelled / Completed / Draft) на странице мероприятия
- [ ] Push-напоминания за 24ч и 2ч — будущая фаза

---

### Фаза 12: SEO и Open Graph ✅

#### 12.1 — SEO ✅
- [x] Динамические `<title>`, `<meta description>` для каждой страницы (layout metadata)
- [x] Open Graph теги (type, siteName, images) в root layout
- [x] Twitter Cards (`summary_large_image`)
- [x] JSON-LD: `Event`, `Organization`, `Person` (на соотв. страницах)
- [x] Динамический `sitemap.xml` (события, группы, профили × 5 локалей)
- [x] `robots.txt` (disallow API, private pages)
- [x] Приватные мероприятия исключаются из sitemap

---

### Фаза 13: Метрики и аналитика ✅

#### 13.1 — Аналитика ✅
- [x] Таблица `analytics_events` для внутренних метрик
- [x] DAU / MAU (подсчёт через cron)
- [x] Таблица `daily_stats` для агрегированных метрик
- [x] Vercel Cron функция `/api/cron/daily-stats`
- [x] Server Actions: `trackEvent`, `getDashboardStats`, `getDailyStats`

---

### Фаза 14: Админ-панель ✅

#### 14.1 — Admin UI ✅
- [x] `/admin` — защищённый раздел (проверка роли `admin`)
- [x] Dashboard с KPI-карточками (пользователи, события, группы, отчёты)
- [x] Управление пользователями (`/admin/users`) с пагинацией
- [x] Управление событиями (`/admin/events`) с фильтром по статусу
- [x] Модерация жалоб (`/admin/reports`) с Resolve/Dismiss
- [x] Управление системными событиями (`/admin/system-events`)
- [x] Просмотр бейджей и их назначений (`/admin/badges`)
- [x] Ссылка «Admin» в user dropdown для админов

---

## Порядок реализации

| # | Фаза | Зависимости | Статус |
|---|---|---|---|
| 0 | Инфраструктура + скелет | — | ✅ |
| 1 | Auth + Профиль + Интересы | Фаза 0 | ✅ |
| 2 | Мероприятия (CRUD + карты + листинг) | Фаза 1 | ✅ |
| 3 | Группы | Фаза 1, 2 | ✅ |
| 4 | Discovery + Лендинг | Фаза 2, 3 | ✅ |
| 5 | Календарь | Фаза 2 | ✅ |
| 6 | Чат + Сообщения | Фаза 1 | ✅ |
| 7 | Уведомления (push + email + in-app) | Фаза 2, 6 | 🔄 |
| 8 | Афиша города | Фаза 2 | ✅ |
| 9 | Trust & Safety | Фаза 1, 2, 3 | ✅ |
| 10 | Социальная динамика + Репутация | Фаза 2, 9 | ✅ |
| 11 | Event Lifecycle | Фаза 2, 7 | ✅ |
| 12 | SEO + Open Graph | Фаза 2, 3, 4 | ✅ |
| 13 | Метрики | Фаза 2+ | ✅ |
| 14 | Админ-панель | Все фазы | ✅ |

**Легенда:** ⬜ Не начато · 🔄 В процессе · ✅ Завершено
