# City-Pulse — Лог разработки

## Сессия 1 — 2026-03-01

### Обсуждение плана
- Проанализировано полное описание проекта City-Pulse
- Определён стек: Next.js 15 (App Router), TypeScript, shadcn/ui + Tailwind CSS 4, Supabase, Resend, Vercel
- Auth: Email/пароль + Google OAuth
- i18n: EN, RU, UK, CS, DE (с возможностью расширения)
- Платежи: отложены на будущее
- Real-time чат: Supabase Realtime
- Email: Resend
- Scope: полная реализация по описанию

### Решения по технологиям
| Вопрос | Решение |
|---|---|
| Фреймворк | Next.js 15 (App Router) |
| Язык | TypeScript |
| UI | shadcn/ui + Tailwind CSS 4 |
| Auth | Supabase Auth (Email + Google) |
| i18n | next-intl (EN, RU, UK, CS, DE) |
| Платежи | Отложено |
| Чат | Supabase Realtime |
| Email | Resend |

### Фаза 0: Инфраструктура — ЗАВЕРШЕНА ✅

#### 0.1 — Инициализация проекта ✅
- Создан Next.js 16.1.6 + TypeScript + Tailwind CSS 4
- ESLint + Prettier настроены (включая prettier-plugin-tailwindcss)
- shadcn/ui инициализирован (стиль new-york, 18 компонентов)
- Установленные компоненты: button, card, input, label, separator, sheet, dropdown-menu, avatar, badge, sonner, dialog, select, tabs, tooltip, skeleton, scroll-area, popover, command
- Структура папок создана

#### 0.2 — Supabase утилиты ✅
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client (cookies-based)
- `src/lib/supabase/middleware.ts` — session refresh (graceful при отсутствии env)
- `.env.local.example` — шаблон переменных окружения
- **Требует:** создание проекта в Supabase Dashboard и заполнение `.env.local`

#### 0.3 — i18n (мультиязычность) ✅
- next-intl с routing: `/en/`, `/ru/`, `/uk/`, `/cs/`, `/de/`
- Полные файлы переводов для всех 5 языков (nav, auth, events, groups, calendar, messages, notifications, footer)
- Автоопределение языка из браузера
- Переключатель языка в хедере (dropdown с флагами)
- **Протестировано:** переключение EN↔RU работает корректно

#### 0.4 — Layout и навигация ✅
- Responsive header: логотип, навигация (Events, Groups, Calendar), кнопки (Create event, Messages, Notifications, Login, Register)
- Mobile: Sheet (бургер-меню) с полной навигацией
- Footer: About, Legal (Terms, Privacy), Explore, Copyright
- ThemeProvider: светлая/тёмная/системная тема
- TooltipProvider + Toaster (sonner)

#### Лендинг (главная страница) ✅
- Hero секция с CTA
- 6 feature-карточек
- Placeholder для "Популярные события" (skeleton loading)
- Placeholder для "Активные группы" (skeleton loading)
- CTA секция "Ready to find your community?"

#### Страницы-заглушки ✅
- `/[locale]/events` — Мероприятия
- `/[locale]/groups` — Группы
- `/[locale]/calendar` — Календарь
- `/[locale]/messages` — Сообщения
- `/[locale]/login` — Вход
- `/[locale]/register` — Регистрация

#### Типы данных ✅
- `src/types/database.ts` — полные TypeScript интерфейсы для всех сущностей (Profile, Event, Group, Message, Notification, Report, Badge и др.)
- `src/lib/constants.ts` — константы приложения

#### Build ✅
- `npm run build` — успешно, 0 ошибок
- Все страницы SSG для 5 локалей
- Middleware: i18n + Supabase session refresh

---

### Фаза 1: Аутентификация и профиль пользователя — ЗАВЕРШЕНА ✅

#### SQL Миграции
- `supabase/migrations/001_initial_schema.sql`:
  - Таблицы: `profiles`, `interests`, `cities`
  - RLS policies для каждой таблицы
  - Trigger `handle_new_user` — автосоздание профиля при регистрации
  - Trigger `handle_updated_at` — автообновление updated_at
  - Storage bucket `avatars` с policies
  - Indexes для city, country, role, slug
- `supabase/migrations/002_seed_interests.sql`:
  - 60 категорий интересов на 5 языках (EN, RU, UK, CS, DE)
  - Категории: Sports, Arts, Tech, Food, Games, Lifestyle, Education и др.
- **Требует:** выполнить в Supabase SQL Editor

#### Auth (1.1) ✅
- Server Actions: `signUp`, `signIn`, `signInWithGoogle`, `signOut`, `resetPassword`
- Zod схемы валидации: `loginSchema`, `registerSchema`, `forgotPasswordSchema`
- OAuth callback: `src/app/[locale]/auth/callback/route.ts`
- API route: `src/app/api/auth/signout/route.ts`
- Формы:
  - `LoginForm` — email/пароль + Google OAuth + forgot password link
  - `RegisterForm` — имя + email + пароль + confirm + Google OAuth
  - `ForgotPasswordForm` — email + success state
- Страницы: `/login`, `/register`, `/forgot-password`, `/verify-email`

#### Профиль (1.2) ✅
- Страница профиля `/profile/[id]`:
  - Аватар, имя, город, возраст, био
  - Языки (badges), интересы (badges)
  - Социальные ссылки
  - Статистика (мероприятия, рейтинг)
  - Кнопки: Edit (свой) / Send message (чужой)
  - SEO metadata
- Редактирование `/profile/edit`:
  - Загрузка аватара (Supabase Storage)
  - Все поля: имя, возраст, город, страна, био
  - Языки (dynamic add/remove badges)
  - Интересы (toggle badges, мультиязычные)
  - Социальные сети (6 полей)
  - Приватность (switches: available, private, hide events)
- Server Actions: `getProfile`, `updateProfile`, `updateAvatar`, `getInterests`

#### Header обновлён ✅
- Показывает UserMenu (avatar dropdown) для залогиненных
- Показывает Login/Register кнопки для незалогиненных
- Mobile Nav адаптирован: полный профиль + logout для залогиненных

#### Build ✅
- `npm run build` — exit code 0
- Все роуты: `/[locale]`, `/[locale]/login`, `/[locale]/register`, `/[locale]/forgot-password`, `/[locale]/verify-email`, `/[locale]/auth/callback`, `/[locale]/profile/[id]`, `/[locale]/profile/edit`, `/api/auth/signout`

---

### Фаза 2: Мероприятия (Events) — ЗАВЕРШЕНА ✅

#### SQL Миграция (`003_events_schema.sql`)
- Таблицы: `events`, `event_attendees`, `event_favorites`, `event_moderators`, `event_reviews`, `event_comments`
- View: `events_with_counts` (агрегация going_count, avg_rating, organizer info)
- Storage bucket: `event-photos`
- RLS policies для каждой таблицы
- 12 индексов
- **Требует:** выполнить в Supabase SQL Editor

#### Зависимости
- `leaflet` + `react-leaflet` + `@types/leaflet` — карты
- `qrcode.react` — QR-коды

#### Server Actions (`src/lib/actions/events.ts`)
- `createEvent`, `updateEvent`, `getEvent`, `getEvents` (с фильтрами)
- `toggleAttendance`, `toggleFavorite`, `getUserAttendance`
- `getEventAttendees`, `addComment`, `getComments`
- `uploadEventPhoto`

#### Компоненты
- `CreateEventForm` — полная форма: название, описание, категория, дата/время, тип, цена, карта, фото
- `EventCard` — карточка с фото, badge (free/online), сердце, "Пойду", участники
- `EventActions` — "Пойду" + "Избранное" + "Поделиться" (оптимистичный UI)
- `EventComments` — список + добавление комментариев
- `EventsFilters` — фильтры: город, страна, категория, дата, free, online/offline
- `AttendanceQR` — генерация + download QR-кода
- `LocationPicker` — Nominatim autocomplete + Leaflet карта + click → reverse geocoding
- `MapView` — Leaflet обёртка (dynamic, ssr: false)
- `EventMap` — клиентский wrapper для SSR-страницы

#### Страницы
- `/events` — листинг с фильтрами
- `/events/create` — форма создания (auth required)
- `/events/[id]` — детали (SSR, SEO, карта, комментарии, sidebar)
- `/confirm-attendance/[eventId]` — QR подтверждение

#### Build ✅
- exit code 0, 17 роутов

---

## Сессия 2: Фазы 3–7

### Фаза 3: Группы ✅

#### SQL миграция (`supabase/migrations/004_groups_schema.sql`)
- `groups` — id, name, description, cover_url, created_by + RLS
- `group_members` — role (member/moderator/admin) + RLS
- `group_subscriptions` + RLS
- FK `events.group_id → groups.id`
- View `groups_with_counts` (member_count, event_count, creator info)
- Storage bucket `group-covers`

#### Server Actions (`src/lib/actions/groups.ts`)
- `createGroup`, `getGroup`, `getGroups`, `getGroupMembers`, `getGroupEvents`
- `toggleMembership`, `toggleSubscription`, `getUserGroupStatus`
- `uploadGroupCover`

#### Компоненты
- `GroupCard` — карточка группы (обложка, название, описание, участники, мероприятия)
- `CreateGroupForm` — форма создания с обложкой
- `GroupActions` — Join/Leave + Subscribe/Unsubscribe

#### Страницы
- `/groups` — листинг групп
- `/groups/create` — создание группы (auth required)
- `/groups/[id]` — страница группы (cover, описание, members sidebar, events)

### Фаза 4: Discovery и лендинг ✅

#### Server Actions (`src/lib/actions/landing.ts`)
- `getTodayEvents`, `getTomorrowEvents`, `getWeekendEvents`, `getPopularEvents`, `getTopGroups`

#### Обновления
- Лендинг перестроен: реальные данные из БД
- Секции: Today / Tomorrow / Weekend / Popular events + Top groups
- Полная локализация feature-карточек (5 языков)
- CTA скрывается для залогиненных пользователей
- Empty state при отсутствии данных

### Фаза 5: Календарь ✅

#### Server Actions (`src/lib/actions/calendar.ts`)
- `getCalendarEvents`, `getMyCalendarEvents`, `generateICalEvent`

#### Компоненты
- `CalendarView` — месячная сетка, навигация, точки-индикаторы, клик → список событий
- `CalendarPageClient` — Tabs (All/My events), навигация по месяцам

#### Маршруты
- `/calendar` — SSR + client-side навигация
- `/api/calendar/[eventId]/ical` — генерация .ics файлов

### Фаза 6: Личные сообщения ✅

#### SQL миграция (`supabase/migrations/005_messages_schema.sql`)
- `conversations` (participant_1, participant_2, status) + RLS
- `messages` (conversation_id, sender_id, content, is_read) + RLS
- `blocked_users` + RLS
- View `conversations_with_details` (last message, unread, participant info)

#### Server Actions (`src/lib/actions/messages.ts`)
- `getConversations`, `getConversation`, `getMessages`, `sendMessage`
- `requestChat`, `approveConversation`, `markMessagesRead`
- `blockUser`, `unblockUser`

#### Компоненты
- `ConversationList` — список бесед с аватарами, last message, unread badge
- `ChatView` — чат: сообщения (bubbles), input, approve/decline pending chats
- `RequestChatButton` — кнопка на профиле пользователя

#### Страницы
- `/messages` — список бесед
- `/messages/[id]` — чат (split layout: список + чат)

### Фаза 7: Уведомления (in-app) ✅

#### SQL миграция (`supabase/migrations/006_notifications_schema.sql`)
- `notifications` (user_id, type, title, body, data jsonb, is_read) + RLS + index

#### Server Actions (`src/lib/actions/notifications.ts`)
- `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `createNotification`

#### Компоненты
- `NotificationBell` — иконка в хедере с badge + Popover со списком
  - Иконки по типу (message, calendar, users, alert)
  - Ссылки на связанные страницы
  - "Mark all as read"
  - Relative time formatting

#### Build ✅
- exit code 0, 21 роут (включая 2 API routes)

### SQL миграции для выполнения в Supabase Dashboard:
1. `004_groups_schema.sql` — группы, участники, подписки
2. `005_messages_schema.sql` — беседы, сообщения, блокировки
3. `006_notifications_schema.sql` — уведомления

---

## Сессия 3: Фазы 8–12

### Фаза 8: Афиша города ✅
- Миграция `007_system_events.sql`: роль admin/moderator в profiles
- Server Actions: `createSystemEvent`, `getSystemEvents`, `isAdmin`
- Страница `/city-events` с бейджем "City event" на карточках
- Навигация: "Афиша" в хедере и мобильном меню (5 языков)

### Фаза 9: Trust & Safety ✅
- Миграция `008_reports_schema.sql`: reports + activity_logs + RLS
- `ReportDialog`: выбор причины (spam/harassment/inappropriate/fake/other) + описание
- Кнопка "Report" на мероприятиях и профилях
- Server Actions: createReport, getReports, resolveReport, logActivity
- Переводы report на 5 языков

### Фаза 10: Социальная динамика + Репутация ✅
- Миграция `009_reputation_schema.sql`: user_subscriptions, badges (8 шт.), user_badges, view profile_stats
- `FollowButton` (follow/unfollow) на профиле
- Реальная статистика (events_created, attended, avg_rating, followers)
- Бейджи на профиле с иконками и локализацией

### Фаза 11: Event Lifecycle ✅
- `EventManagement`: Publish draft, Mark completed, Cancel (AlertDialog), Duplicate
- `EventReviewForm`: 1-5 звёзд + комментарий (только для attendees completed events)
- Server Actions: cancelEvent, completeEvent, duplicateEvent, publishDraft, submitReview
- Бейджи статуса (Draft/Cancelled/Completed) на странице мероприятия

### Фаза 12: SEO + Open Graph ✅
- JSON-LD: Event (на /events/[id]), Organization (на /), Person (на /profile/[id])
- Динамический `sitemap.xml`: все публичные события, группы, профили × 5 локалей
- `robots.txt`: disallow API и приватные страницы
- Open Graph + Twitter Cards уже были настроены в root layout

### Build ✅
- exit code 0, 22+ роутов + /robots.txt (static) + /sitemap.xml (dynamic)

### Новые SQL миграции для Supabase Dashboard:
4. `007_system_events.sql` — роль admin в profiles
5. `008_reports_schema.sql` — жалобы и логи активности
6. `009_reputation_schema.sql` — подписки, бейджи, статистика

---

## Сессия 6: Фазы 13-14

### Фаза 13 — Метрики и аналитика ✅

Файлы:
- `supabase/migrations/010_analytics_schema.sql` — таблицы `analytics_events` и `daily_stats` с RLS
- `src/lib/actions/analytics.ts` — Server Actions: `trackEvent`, `getDashboardStats`, `getDailyStats`
- `src/app/api/cron/daily-stats/route.ts` — Vercel Cron для ежедневной агрегации метрик
- `vercel.json` — расписание cron (3:00 UTC ежедневно)

### Фаза 14 — Админ-панель ✅

Файлы:
- `src/app/[locale]/admin/layout.tsx` — layout с проверкой роли admin и навигацией
- `src/app/[locale]/admin/page.tsx` — Dashboard с KPI-карточками, последними регистрациями, топ-событиями, ожидающими жалобами
- `src/app/[locale]/admin/users/page.tsx` — список пользователей с пагинацией
- `src/app/[locale]/admin/events/page.tsx` — список событий с фильтром по статусу
- `src/app/[locale]/admin/reports/page.tsx` — модерация жалоб с кнопками Resolve/Dismiss
- `src/app/[locale]/admin/badges/page.tsx` — просмотр бейджей и их назначений
- `src/app/[locale]/admin/system-events/page.tsx` — управление городскими событиями
- `src/components/admin/report-actions.tsx` — клиентский компонент для модерации жалоб
- `src/components/layout/header.tsx` — добавлена ссылка Admin в dropdown для админов
- `src/types/database.ts` — обновлён тип Profile.role: `'user' | 'admin' | 'moderator'`

### Миграции для запуска в Supabase Dashboard

7. `010_analytics_schema.sql` — аналитика и ежедневная статистика

### Все 14 фаз завершены!
