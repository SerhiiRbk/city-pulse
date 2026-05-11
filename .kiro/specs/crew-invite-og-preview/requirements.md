# Requirements Document

## Introduction

Когда пользователь делится ссылкой-приглашением в компанию (crew invite link) через мессенджеры (Viber, Telegram, WhatsApp, Instagram) или социальные сети, превью ссылки должно отображаться красиво и информативно. Текущая реализация передаёт URL фотографии события напрямую в OG-теги, но мессенджеры часто не отображают такие превью корректно — изображение может быть обрезано, текст не виден, или превью выглядит как generic ссылка. Решение — генерировать специальное OG-изображение (1200×630) с наложением текста (имя компании и имя события) поверх фотографии события, а также обеспечить корректные OG-метатеги для всех целевых платформ.

## Glossary

- **OG_Image_Generator**: Серверный компонент (Next.js Image Response API), который генерирует PNG-изображение размером 1200×630 пикселей для использования в Open Graph метатегах
- **Crew_Invite_Page**: Страница по маршруту `/invite/crew/[token]`, которая отображается при переходе по ссылке-приглашению в компанию
- **Messenger_Preview**: Визуальное превью ссылки, которое автоматически генерируется мессенджерами (Viber, Telegram, WhatsApp, Instagram) при вставке URL в сообщение
- **Event_Cover**: Первая фотография из массива `photos` события в базе данных
- **Crew_Name**: Название компании (crew) из таблицы `event_crews`
- **Event_Title**: Название события из таблицы `events`

## Requirements

### Requirement 1: Генерация OG-изображения

**User Story:** Как пользователь, я хочу чтобы при отправке ссылки-приглашения в мессенджер отображалось красивое превью с изображением события и текстом, чтобы получатель сразу понимал о чём приглашение.

#### Acceptance Criteria

1. WHEN a crawler or messenger requests the OG image URL for a crew invite link, THE OG_Image_Generator SHALL return a PNG image with dimensions 1200×630 pixels
2. WHEN the event has a cover photo, THE OG_Image_Generator SHALL render the Event_Cover as the background of the generated image, scaled to fill the 1200×630 canvas while maintaining aspect ratio
3. THE OG_Image_Generator SHALL overlay the Crew_Name text on the generated image
4. THE OG_Image_Generator SHALL overlay the Event_Title text on the generated image, positioned below the Crew_Name
5. WHEN the event has no cover photo, THE OG_Image_Generator SHALL render a branded gradient background with the Crew_Name and Event_Title text
6. WHEN the event has a cover photo, THE OG_Image_Generator SHALL apply a semi-transparent dark overlay with opacity between 40% and 60% between the background image and the text layer
7. THE OG_Image_Generator SHALL render text in white color with a minimum contrast ratio of 4.5:1 against the background layer
8. IF the Event_Cover image cannot be fetched or fails to load, THEN THE OG_Image_Generator SHALL fall back to the branded gradient background with the Crew_Name and Event_Title text

### Requirement 2: OG-метатеги для Crew Invite Page

**User Story:** Как пользователь, я хочу чтобы мессенджеры корректно распознавали метаданные ссылки-приглашения, чтобы превью отображалось на всех платформах.

#### Acceptance Criteria

1. WHEN a valid crew invite token is provided, THE Crew_Invite_Page SHALL include an `og:title` meta tag containing the Crew_Name and the Event_Title in a human-readable phrase
2. WHEN a valid crew invite token is provided, THE Crew_Invite_Page SHALL include an `og:description` meta tag containing the Event_Title
3. WHEN a valid crew invite token is provided, THE Crew_Invite_Page SHALL include an `og:image` meta tag with an absolute URL pointing to the OG_Image_Generator route for the given token
4. WHEN a valid crew invite token is provided and the OG image URL is set, THE Crew_Invite_Page SHALL include an `og:image:width` meta tag with value 1200
5. WHEN a valid crew invite token is provided and the OG image URL is set, THE Crew_Invite_Page SHALL include an `og:image:height` meta tag with value 630
6. THE Crew_Invite_Page SHALL include a `twitter:card` meta tag with value `summary_large_image`
7. WHEN a valid crew invite token is provided, THE Crew_Invite_Page SHALL include a `twitter:image` meta tag with an absolute URL pointing to the same OG_Image_Generator route as the `og:image` tag
8. IF the crew invite token is invalid or expired, THEN THE Crew_Invite_Page SHALL return fallback metadata with a generic title and no `og:image` tag, without exposing crew or event details

### Requirement 3: Совместимость с платформами

**User Story:** Как пользователь, я хочу чтобы превью ссылки красиво отображалось в Viber, Telegram, WhatsApp и Instagram, чтобы приглашение выглядело привлекательно на всех платформах.

#### Acceptance Criteria

1. THE OG_Image_Generator SHALL return the image with Content-Type `image/png`
2. THE OG_Image_Generator SHALL generate the image within 10 seconds to avoid messenger crawler timeouts
3. THE OG_Image_Generator SHALL return a Cache-Control header allowing caching for at least 1 hour to reduce repeated generation
4. IF the invite token is invalid or expired, THEN THE Crew_Invite_Page SHALL return fallback OG meta tags containing the application name as `og:title`, a static invitation description as `og:description`, and the generic branded fallback image as `og:image`, without exposing internal error details
5. THE Crew_Invite_Page SHALL include `og:type` meta tag with value `website`
6. THE OG_Image_Generator SHALL return an image with file size not exceeding 1 MB to remain within messenger crawler download limits

### Requirement 4: Обработка данных для OG-изображения

**User Story:** Как разработчик, я хочу чтобы генератор OG-изображений получал данные без аутентификации, чтобы краулеры мессенджеров могли запросить превью.

#### Acceptance Criteria

1. THE OG_Image_Generator SHALL fetch crew and event data by invite token without requiring user authentication
2. WHEN the Crew_Name exceeds 40 characters, THE OG_Image_Generator SHALL truncate the text with an ellipsis ("…")
3. WHEN the Event_Title exceeds 60 characters, THE OG_Image_Generator SHALL truncate the text with an ellipsis ("…")
4. IF the database query fails, THEN THE OG_Image_Generator SHALL return a generic branded fallback image with HTTP status 200
5. IF the invite token does not exist in the database, THEN THE OG_Image_Generator SHALL return a generic branded fallback image with HTTP status 200

### Requirement 5: Маршрутизация OG-изображения

**User Story:** Как разработчик, я хочу чтобы OG-изображение генерировалось по предсказуемому URL, чтобы мессенджеры могли его запросить и закешировать.

#### Acceptance Criteria

1. THE OG_Image_Generator SHALL be accessible at the route path `[locale]/invite/crew/[token]/opengraph-image` following the Next.js App Router opengraph-image file convention
2. THE OG_Image_Generator SHALL accept the invite token as a dynamic route segment parameter named `token`
3. WHEN the same token is requested multiple times with unchanged underlying crew and event data, THE OG_Image_Generator SHALL return a visually identical image
4. WHEN the underlying crew or event data changes between requests for the same token, THE OG_Image_Generator SHALL return an updated image reflecting the current data
