import type { Locale } from '@/i18n/config';

type HowToSection = {
  title: string;
  paragraphs: string[];
};

export type HowToContent = {
  title: string;
  description: string;
  introTitle: string;
  introBody: string;
  sections: HowToSection[];
};

const howToEn: HowToContent = {
  title: 'How to use Localisio',
  description:
    'A detailed guide to all features of Localisio — from finding events to building your own community.',
  introTitle: 'Your guide to Localisio',
  introBody:
    'Localisio helps you find events, meet people, and build lasting connections. This page explains every feature so you can get the most out of the platform.',
  sections: [
    {
      title: 'Finding events',
      paragraphs: [
        'The Events page shows all upcoming community events and curated city listings. Use filters to narrow by city, category, date, language, and price.',
        'The map view lets you see events geographically — zoom in to find what is happening near you.',
        'Each event card shows key info at a glance: date, location, number of attendees, and whether it is free. Click any card to see the full description, photos, and comments.',
      ],
    },
    {
      title: 'Creating your own event',
      paragraphs: [
        'Click "Create event" in the navigation. Fill in the title, description, date, time, location, and category.',
        'You can add up to 5 photos, set a maximum number of attendees, mark the event as free or paid, and choose which languages are spoken.',
        'Events can be created on behalf of a group you manage — this way all group members get notified automatically.',
        'Add translations for the title and description so people who speak other languages can find your event too.',
      ],
    },
    {
      title: 'Crews — going together',
      paragraphs: [
        'A crew is a small group of 2–10 people who attend a specific event together. Think of it as "I want to go but not alone."',
        'On any event page, look for the "Going together" section. You can create a new crew or join an existing one.',
        'When you create a crew, you set a name, an optional meeting point, and a group cap. A private chat is created automatically so you can coordinate details.',
        'Crews are temporary — they exist for one event. After the event, the chat stays so you can stay in touch or plan the next outing.',
        'You can also share a crew invite link with friends who are not yet on the platform.',
      ],
    },
    {
      title: 'Groups — permanent communities',
      paragraphs: [
        'Unlike crews, groups are permanent communities built around a shared interest: a weekly running club, a language exchange, a board games meetup.',
        'Groups have their own page with a description, member list, upcoming and past events, photo albums, and a discussion feed.',
        'As a group member you get notified about new events, can participate in discussions, and see photos from past meetups.',
        'Group admins can create events on behalf of the group, manage members, moderate comments, and publish posts and recaps.',
        'To create a group, click "Create group" in the navigation. Pick a name, description, city, languages, and interests.',
      ],
    },
    {
      title: 'Contacts and messaging',
      paragraphs: [
        'Met someone interesting at an event? Add them to your contacts. This lets you see their upcoming events and send direct messages.',
        'The Messages section shows all your conversations — both direct messages and crew/group chats.',
        'You can remove contacts at any time. Removing a contact does not delete message history but stops notifications from that person.',
      ],
    },
    {
      title: 'Calendar',
      paragraphs: [
        'The Calendar page shows all events you are attending or organizing on a monthly view.',
        'You can subscribe to your personal calendar feed in Google Calendar, Apple Calendar, or Outlook — events sync automatically.',
        'Download individual events as .ics files if you prefer to add them manually.',
      ],
    },
    {
      title: 'City filter and supported cities',
      paragraphs: [
        'Localisio works in multiple cities. The city filter on the events and groups pages lets you focus on what is happening in your area.',
        'If you set a city in your profile, it is used as the default filter everywhere. You can always switch to another city or view all cities at once.',
        'Supported cities have dedicated URL paths (e.g. /cities/prague/events) which are great for bookmarking or sharing.',
      ],
    },
    {
      title: 'Safety and audience tags',
      paragraphs: [
        'Events can be tagged with audience guardrails: Women only, 18+, LGBTQ+ friendly, Alcohol-free, Beginner friendly, Dog friendly, Kid friendly, Outdoor, and Healthy lifestyle.',
        'These tags help newcomers understand what to expect before they join.',
        'You can also choose to attend privately — your name will not appear on the public attendee list, but your RSVP still counts toward the headcount.',
      ],
    },
    {
      title: 'Profile and settings',
      paragraphs: [
        'Your profile shows your name, bio, city, languages, and interests. Other users see your public events and group memberships.',
        'In Settings you can change your password, manage email notifications, switch the interface language, and delete your account if needed.',
        'The onboarding flow helps you set up your profile when you first register — pick your city, languages, and a few interests so we can suggest relevant content.',
      ],
    },
    {
      title: 'Multilingual support',
      paragraphs: [
        'Localisio is available in English, Russian, Ukrainian, Czech, German, and Spanish. Switch the language from the footer or settings.',
        'Event organizers can add translations for titles and descriptions. The platform shows the version matching your language, falling back to the original if no translation exists.',
      ],
    },
  ],
};

const howToRu: HowToContent = {
  title: 'Как пользоваться Localisio',
  description:
    'Подробное руководство по всем возможностям Localisio — от поиска мероприятий до создания собственного сообщества.',
  introTitle: 'Ваш гид по Localisio',
  introBody:
    'Localisio помогает находить мероприятия, знакомиться с людьми и строить настоящие связи. На этой странице описаны все возможности платформы.',
  sections: [
    {
      title: 'Поиск мероприятий',
      paragraphs: [
        'На странице «Мероприятия» отображаются все предстоящие события сообщества и кураторские городские подборки. Используйте фильтры по городу, категории, дате, языку и цене.',
        'Режим карты позволяет видеть события географически — приближайте, чтобы найти то, что происходит рядом.',
        'Каждая карточка события показывает ключевую информацию: дату, место, количество участников и стоимость. Нажмите на карточку, чтобы увидеть полное описание, фото и комментарии.',
      ],
    },
    {
      title: 'Создание мероприятия',
      paragraphs: [
        'Нажмите «Создать мероприятие» в навигации. Заполните название, описание, дату, время, место и категорию.',
        'Можно добавить до 5 фотографий, установить максимальное количество участников, отметить событие как бесплатное или платное, и выбрать языки общения.',
        'Мероприятия можно создавать от имени группы, которой вы управляете — тогда все участники группы получат уведомление автоматически.',
        'Добавляйте переводы названия и описания, чтобы люди, говорящие на других языках, тоже могли найти ваше событие.',
      ],
    },
    {
      title: 'Компании — идём вместе',
      paragraphs: [
        'Компания — это небольшая группа из 2–10 человек, которые идут на конкретное мероприятие вместе. Это решение для тех, кто хочет пойти, но не один.',
        'На странице любого мероприятия найдите секцию «Идём вместе». Вы можете создать новую компанию или присоединиться к существующей.',
        'При создании компании вы задаёте название, опциональное место встречи и лимит участников. Приватный чат создаётся автоматически для координации деталей.',
        'Компании временные — они существуют для одного события. После мероприятия чат остаётся, чтобы вы могли оставаться на связи или планировать следующий выход.',
        'Вы также можете поделиться ссылкой-приглашением в компанию с друзьями, которых ещё нет на платформе.',
      ],
    },
    {
      title: 'Группы — постоянные сообщества',
      paragraphs: [
        'В отличие от компаний, группы — это постоянные сообщества, объединённые общим интересом: еженедельный беговой клуб, языковой обмен, настольные игры по вторникам.',
        'У группы есть своя страница с описанием, списком участников, предстоящими и прошедшими мероприятиями, фотоальбомами и лентой обсуждений.',
        'Как участник группы вы получаете уведомления о новых событиях, можете участвовать в обсуждениях и смотреть фото с прошлых встреч.',
        'Администраторы группы могут создавать мероприятия от имени группы, управлять участниками, модерировать комментарии и публиковать посты и отчёты.',
        'Чтобы создать группу, нажмите «Создать группу» в навигации. Выберите название, описание, город, языки и интересы.',
      ],
    },
    {
      title: 'Контакты и сообщения',
      paragraphs: [
        'Познакомились с кем-то интересным на мероприятии? Добавьте его в контакты. Это позволит видеть его предстоящие события и писать личные сообщения.',
        'Раздел «Сообщения» показывает все ваши переписки — как личные, так и чаты компаний и групп.',
        'Вы можете удалить контакт в любое время. Удаление контакта не удаляет историю сообщений, но прекращает уведомления от этого человека.',
      ],
    },
    {
      title: 'Календарь',
      paragraphs: [
        'Страница «Календарь» показывает все мероприятия, на которые вы идёте или которые организуете, в виде месячного обзора.',
        'Вы можете подписаться на свой персональный календарь в Google Calendar, Apple Calendar или Outlook — события синхронизируются автоматически.',
        'Скачивайте отдельные события как .ics файлы, если предпочитаете добавлять их вручную.',
      ],
    },
    {
      title: 'Фильтр по городу и поддерживаемые города',
      paragraphs: [
        'Localisio работает в нескольких городах. Фильтр по городу на страницах мероприятий и групп позволяет сфокусироваться на том, что происходит в вашем районе.',
        'Если вы указали город в профиле, он используется как фильтр по умолчанию везде. Вы всегда можете переключиться на другой город или посмотреть все города сразу.',
        'Поддерживаемые города имеют выделенные URL (например /cities/prague/events), которые удобно сохранять в закладки или делиться ими.',
      ],
    },
    {
      title: 'Безопасность и теги аудитории',
      paragraphs: [
        'Мероприятия можно отмечать тегами аудитории: Только для женщин, 18+, LGBTQ+ friendly, Без алкоголя, Для новичков, Можно с собакой, Подходит для детей, На открытом воздухе, Здоровый образ жизни.',
        'Эти теги помогают новичкам понять, чего ожидать, прежде чем присоединиться.',
        'Вы также можете участвовать приватно — ваше имя не появится в публичном списке участников, но ваш RSVP всё равно учитывается в общем количестве.',
      ],
    },
    {
      title: 'Профиль и настройки',
      paragraphs: [
        'Ваш профиль показывает имя, био, город, языки и интересы. Другие пользователи видят ваши публичные мероприятия и членство в группах.',
        'В настройках можно сменить пароль, управлять email-уведомлениями, переключить язык интерфейса и удалить аккаунт при необходимости.',
        'Онбординг помогает настроить профиль при первой регистрации — выберите город, языки и несколько интересов, чтобы мы могли предлагать релевантный контент.',
      ],
    },
    {
      title: 'Мультиязычность',
      paragraphs: [
        'Localisio доступен на английском, русском, украинском, чешском, немецком и испанском языках. Переключайте язык в подвале сайта или в настройках.',
        'Организаторы мероприятий могут добавлять переводы названий и описаний. Платформа показывает версию на вашем языке, а если перевода нет — оригинал.',
      ],
    },
  ],
};

const howToUk: HowToContent = {
  title: 'Як користуватися Localisio',
  description:
    'Детальний посібник з усіх можливостей Localisio — від пошуку подій до створення власної спільноти.',
  introTitle: 'Ваш гід по Localisio',
  introBody:
    'Localisio допомагає знаходити заходи, знайомитися з людьми та будувати справжні зв\'язки. На цій сторінці описані всі можливості платформи.',
  sections: [
    {
      title: 'Пошук подій',
      paragraphs: [
        'На сторінці «Заходи» відображаються всі майбутні події спільноти та кураторські міські підбірки. Використовуйте фільтри за містом, категорією, датою, мовою та ціною.',
        'Режим карти дозволяє бачити події географічно — наближайте, щоб знайти те, що відбувається поруч.',
        'Кожна картка події показує ключову інформацію: дату, місце, кількість учасників та вартість. Натисніть на картку, щоб побачити повний опис, фото та коментарі.',
      ],
    },
    {
      title: 'Створення заходу',
      paragraphs: [
        'Натисніть «Створити захід» у навігації. Заповніть назву, опис, дату, час, місце та категорію.',
        'Можна додати до 5 фотографій, встановити максимальну кількість учасників, позначити подію як безкоштовну або платну, та обрати мови спілкування.',
        'Заходи можна створювати від імені групи, якою ви керуєте — тоді всі учасники групи отримають сповіщення автоматично.',
        'Додавайте переклади назви та опису, щоб люди, які розмовляють іншими мовами, теж могли знайти вашу подію.',
      ],
    },
    {
      title: 'Компанії — йдемо разом',
      paragraphs: [
        'Компанія — це невелика група з 2–10 людей, які йдуть на конкретний захід разом. Це рішення для тих, хто хоче піти, але не наодинці.',
        'На сторінці будь-якого заходу знайдіть секцію «Йдемо разом». Ви можете створити нову компанію або приєднатися до існуючої.',
        'При створенні компанії ви задаєте назву, опціональне місце зустрічі та ліміт учасників. Приватний чат створюється автоматично для координації деталей.',
        'Компанії тимчасові — вони існують для однієї події. Після заходу чат залишається, щоб ви могли залишатися на зв\'язку або планувати наступний вихід.',
        'Ви також можете поділитися посиланням-запрошенням у компанію з друзями, яких ще немає на платформі.',
      ],
    },
    {
      title: 'Групи — постійні спільноти',
      paragraphs: [
        'На відміну від компаній, групи — це постійні спільноти, об\'єднані спільним інтересом: щотижневий біговий клуб, мовний обмін, настільні ігри по вівторках.',
        'У групи є своя сторінка з описом, списком учасників, майбутніми та минулими заходами, фотоальбомами та стрічкою обговорень.',
        'Як учасник групи ви отримуєте сповіщення про нові події, можете брати участь в обговореннях та переглядати фото з минулих зустрічей.',
        'Адміністратори групи можуть створювати заходи від імені групи, керувати учасниками, модерувати коментарі та публікувати пости й звіти.',
        'Щоб створити групу, натисніть «Створити групу» в навігації. Оберіть назву, опис, місто, мови та інтереси.',
      ],
    },
    {
      title: 'Контакти та повідомлення',
      paragraphs: [
        'Познайомилися з кимось цікавим на заході? Додайте його до контактів. Це дозволить бачити його майбутні події та писати особисті повідомлення.',
        'Розділ «Повідомлення» показує всі ваші переписки — як особисті, так і чати компаній та груп.',
        'Ви можете видалити контакт у будь-який час. Видалення контакту не видаляє історію повідомлень, але припиняє сповіщення від цієї людини.',
      ],
    },
    {
      title: 'Календар',
      paragraphs: [
        'Сторінка «Календар» показує всі заходи, на які ви йдете або які організовуєте, у вигляді місячного огляду.',
        'Ви можете підписатися на свій персональний календар у Google Calendar, Apple Calendar або Outlook — події синхронізуються автоматично.',
        'Завантажуйте окремі події як .ics файли, якщо бажаєте додавати їх вручну.',
      ],
    },
    {
      title: 'Фільтр за містом та підтримувані міста',
      paragraphs: [
        'Localisio працює в кількох містах. Фільтр за містом на сторінках заходів та груп дозволяє зосередитися на тому, що відбувається у вашому районі.',
        'Якщо ви вказали місто в профілі, воно використовується як фільтр за замовчуванням скрізь. Ви завжди можете переключитися на інше місто або переглянути всі міста одразу.',
        'Підтримувані міста мають виділені URL (наприклад /cities/prague/events), які зручно зберігати в закладки або ділитися ними.',
      ],
    },
    {
      title: 'Безпека та теги аудиторії',
      paragraphs: [
        'Заходи можна позначати тегами аудиторії: Тільки для жінок, 18+, LGBTQ+ friendly, Без алкоголю, Для новачків, Можна з собакою, Підходить для дітей, На відкритому повітрі, Здоровий спосіб життя.',
        'Ці теги допомагають новачкам зрозуміти, чого очікувати, перш ніж приєднатися.',
        'Ви також можете брати участь приватно — ваше ім\'я не з\'явиться у публічному списку учасників, але ваш RSVP все одно враховується в загальній кількості.',
      ],
    },
    {
      title: 'Профіль та налаштування',
      paragraphs: [
        'Ваш профіль показує ім\'я, біо, місто, мови та інтереси. Інші користувачі бачать ваші публічні заходи та членство в групах.',
        'У налаштуваннях можна змінити пароль, керувати email-сповіщеннями, переключити мову інтерфейсу та видалити акаунт за потреби.',
        'Онбординг допомагає налаштувати профіль при першій реєстрації — оберіть місто, мови та кілька інтересів, щоб ми могли пропонувати релевантний контент.',
      ],
    },
    {
      title: 'Мультимовність',
      paragraphs: [
        'Localisio доступний англійською, російською, українською, чеською, німецькою та іспанською мовами. Переключайте мову в підвалі сайту або в налаштуваннях.',
        'Організатори заходів можуть додавати переклади назв та описів. Платформа показує версію вашою мовою, а якщо перекладу немає — оригінал.',
      ],
    },
  ],
};

const howToCs: HowToContent = {
  title: 'Jak používat Localisio',
  description:
    'Podrobný průvodce všemi funkcemi Localisio — od hledání akcí po budování vlastní komunity.',
  introTitle: 'Váš průvodce Localisio',
  introBody:
    'Localisio vám pomáhá najít akce, poznat lidi a budovat skutečné vztahy. Na této stránce jsou popsány všechny funkce platformy.',
  sections: [
    {
      title: 'Hledání akcí',
      paragraphs: [
        'Na stránce „Akce" se zobrazují všechny nadcházející komunitní události a kurátorské městské výběry. Použijte filtry podle města, kategorie, data, jazyka a ceny.',
        'Mapový režim umožňuje vidět akce geograficky — přibližte si, abyste našli, co se děje ve vašem okolí.',
        'Každá karta akce ukazuje klíčové informace: datum, místo, počet účastníků a cenu. Klikněte na kartu pro úplný popis, fotky a komentáře.',
      ],
    },
    {
      title: 'Vytvoření akce',
      paragraphs: [
        'Klikněte na „Vytvořit akci" v navigaci. Vyplňte název, popis, datum, čas, místo a kategorii.',
        'Můžete přidat až 5 fotek, nastavit maximální počet účastníků, označit akci jako bezplatnou nebo placenou a vybrat jazyky.',
        'Akce lze vytvářet jménem skupiny, kterou spravujete — všichni členové skupiny pak dostanou oznámení automaticky.',
        'Přidejte překlady názvu a popisu, aby lidé mluvící jinými jazyky mohli vaši akci také najít.',
      ],
    },
    {
      title: 'Party — jdeme spolu',
      paragraphs: [
        'Parta je malá skupina 2–10 lidí, kteří jdou na konkrétní akci společně. Je to řešení pro ty, kdo chtějí jít, ale ne sami.',
        'Na stránce jakékoli akce najděte sekci „Jdeme spolu". Můžete vytvořit novou partu nebo se přidat k existující.',
        'Při vytváření party zadáte název, volitelné místo setkání a limit účastníků. Soukromý chat se vytvoří automaticky pro koordinaci detailů.',
        'Party jsou dočasné — existují pro jednu akci. Po akci chat zůstane, abyste mohli zůstat v kontaktu nebo naplánovat další výlet.',
        'Můžete také sdílet odkaz na pozvánku do party s přáteli, kteří ještě nejsou na platformě.',
      ],
    },
    {
      title: 'Skupiny — stálé komunity',
      paragraphs: [
        'Na rozdíl od part jsou skupiny stálé komunity spojené společným zájmem: týdenní běžecký klub, jazyková výměna, deskovky každé úterý.',
        'Skupina má vlastní stránku s popisem, seznamem členů, nadcházejícími a minulými akcemi, fotoalby a diskusní nástěnkou.',
        'Jako člen skupiny dostáváte oznámení o nových akcích, můžete se účastnit diskusí a prohlížet fotky z minulých setkání.',
        'Správci skupiny mohou vytvářet akce jménem skupiny, spravovat členy, moderovat komentáře a publikovat příspěvky a shrnutí.',
        'Pro vytvoření skupiny klikněte na „Vytvořit skupinu" v navigaci. Zvolte název, popis, město, jazyky a zájmy.',
      ],
    },
    {
      title: 'Kontakty a zprávy',
      paragraphs: [
        'Potkali jste někoho zajímavého na akci? Přidejte si ho do kontaktů. To vám umožní vidět jeho nadcházející akce a posílat přímé zprávy.',
        'Sekce „Zprávy" zobrazuje všechny vaše konverzace — přímé zprávy i chaty part a skupin.',
        'Kontakt můžete kdykoli odebrat. Odebrání kontaktu nesmaže historii zpráv, ale zastaví oznámení od dané osoby.',
      ],
    },
    {
      title: 'Kalendář',
      paragraphs: [
        'Stránka „Kalendář" zobrazuje všechny akce, na které jdete nebo které organizujete, v měsíčním přehledu.',
        'Můžete se přihlásit k odběru osobního kalendáře v Google Calendar, Apple Calendar nebo Outlook — akce se synchronizují automaticky.',
        'Stahujte jednotlivé akce jako .ics soubory, pokud je chcete přidávat ručně.',
      ],
    },
    {
      title: 'Filtr podle města a podporovaná města',
      paragraphs: [
        'Localisio funguje v několika městech. Filtr podle města na stránkách akcí a skupin vám umožní zaměřit se na to, co se děje ve vašem okolí.',
        'Pokud máte v profilu nastavené město, používá se jako výchozí filtr všude. Vždy můžete přepnout na jiné město nebo zobrazit všechna města najednou.',
        'Podporovaná města mají vyhrazené URL (např. /cities/prague/events), které se hodí pro záložky nebo sdílení.',
      ],
    },
    {
      title: 'Bezpečnost a štítky publika',
      paragraphs: [
        'Akce lze označit štítky publika: Pouze pro ženy, 18+, LGBTQ+ friendly, Bez alkoholu, Pro začátečníky, Psi vítáni, Vhodné pro děti, Venku, Zdravý životní styl.',
        'Tyto štítky pomáhají nováčkům pochopit, co očekávat, než se připojí.',
        'Můžete se také účastnit soukromě — vaše jméno se nezobrazí ve veřejném seznamu účastníků, ale vaše RSVP se stále počítá do celkového počtu.',
      ],
    },
    {
      title: 'Profil a nastavení',
      paragraphs: [
        'Váš profil zobrazuje jméno, bio, město, jazyky a zájmy. Ostatní uživatelé vidí vaše veřejné akce a členství ve skupinách.',
        'V nastavení můžete změnit heslo, spravovat e-mailová oznámení, přepnout jazyk rozhraní a v případě potřeby smazat účet.',
        'Onboarding vám pomůže nastavit profil při první registraci — vyberte město, jazyky a několik zájmů, abychom vám mohli navrhovat relevantní obsah.',
      ],
    },
    {
      title: 'Vícejazyčnost',
      paragraphs: [
        'Localisio je k dispozici v angličtině, ruštině, ukrajinštině, češtině, němčině a španělštině. Jazyk přepnete v patičce webu nebo v nastavení.',
        'Organizátoři akcí mohou přidávat překlady názvů a popisů. Platforma zobrazí verzi ve vašem jazyce, a pokud překlad neexistuje — originál.',
      ],
    },
  ],
};

const howToDe: HowToContent = {
  title: 'So nutzt du Localisio',
  description:
    'Ein ausführlicher Leitfaden zu allen Funktionen von Localisio — vom Finden von Events bis zum Aufbau deiner eigenen Community.',
  introTitle: 'Dein Guide für Localisio',
  introBody:
    'Localisio hilft dir, Events zu finden, Leute kennenzulernen und echte Verbindungen aufzubauen. Auf dieser Seite werden alle Funktionen der Plattform erklärt.',
  sections: [
    {
      title: 'Events finden',
      paragraphs: [
        'Auf der Seite „Events" werden alle kommenden Community-Veranstaltungen und kuratierte Stadtempfehlungen angezeigt. Nutze Filter nach Stadt, Kategorie, Datum, Sprache und Preis.',
        'Die Kartenansicht zeigt Events geografisch — zoome rein, um zu sehen, was in deiner Nähe passiert.',
        'Jede Event-Karte zeigt die wichtigsten Infos: Datum, Ort, Teilnehmerzahl und Preis. Klicke auf eine Karte für die vollständige Beschreibung, Fotos und Kommentare.',
      ],
    },
    {
      title: 'Ein Event erstellen',
      paragraphs: [
        'Klicke auf „Event erstellen" in der Navigation. Fülle Titel, Beschreibung, Datum, Uhrzeit, Ort und Kategorie aus.',
        'Du kannst bis zu 5 Fotos hinzufügen, eine maximale Teilnehmerzahl festlegen, das Event als kostenlos oder kostenpflichtig markieren und die Sprachen wählen.',
        'Events können im Namen einer Gruppe erstellt werden, die du verwaltest — dann werden alle Gruppenmitglieder automatisch benachrichtigt.',
        'Füge Übersetzungen für Titel und Beschreibung hinzu, damit auch Menschen, die andere Sprachen sprechen, dein Event finden können.',
      ],
    },
    {
      title: 'Crews — zusammen hingehen',
      paragraphs: [
        'Eine Crew ist eine kleine Gruppe von 2–10 Leuten, die gemeinsam zu einem bestimmten Event gehen. Die Lösung für alle, die hingehen wollen, aber nicht allein.',
        'Auf jeder Event-Seite findest du den Bereich „Zusammen hingehen". Du kannst eine neue Crew erstellen oder einer bestehenden beitreten.',
        'Beim Erstellen einer Crew legst du einen Namen, einen optionalen Treffpunkt und ein Teilnehmerlimit fest. Ein privater Chat wird automatisch erstellt.',
        'Crews sind temporär — sie existieren für ein Event. Nach dem Event bleibt der Chat bestehen, damit ihr in Kontakt bleiben oder den nächsten Ausflug planen könnt.',
        'Du kannst auch einen Einladungslink für die Crew mit Freunden teilen, die noch nicht auf der Plattform sind.',
      ],
    },
    {
      title: 'Gruppen — feste Communities',
      paragraphs: [
        'Im Gegensatz zu Crews sind Gruppen feste Communities rund um ein gemeinsames Interesse: ein wöchentlicher Laufclub, ein Sprachtandem, Brettspiele jeden Dienstag.',
        'Gruppen haben eine eigene Seite mit Beschreibung, Mitgliederliste, kommenden und vergangenen Events, Fotoalben und einem Diskussionsfeed.',
        'Als Gruppenmitglied wirst du über neue Events benachrichtigt, kannst an Diskussionen teilnehmen und Fotos vergangener Treffen ansehen.',
        'Gruppenadmins können Events im Namen der Gruppe erstellen, Mitglieder verwalten, Kommentare moderieren und Beiträge und Zusammenfassungen veröffentlichen.',
        'Um eine Gruppe zu erstellen, klicke auf „Gruppe erstellen" in der Navigation. Wähle Name, Beschreibung, Stadt, Sprachen und Interessen.',
      ],
    },
    {
      title: 'Kontakte und Nachrichten',
      paragraphs: [
        'Jemand Interessantes bei einem Event kennengelernt? Füge ihn zu deinen Kontakten hinzu. So siehst du seine kommenden Events und kannst Direktnachrichten senden.',
        'Der Bereich „Nachrichten" zeigt alle deine Unterhaltungen — Direktnachrichten sowie Crew- und Gruppenchats.',
        'Du kannst Kontakte jederzeit entfernen. Das Entfernen löscht nicht den Nachrichtenverlauf, stoppt aber Benachrichtigungen von dieser Person.',
      ],
    },
    {
      title: 'Kalender',
      paragraphs: [
        'Die Kalenderseite zeigt alle Events, an denen du teilnimmst oder die du organisierst, in einer Monatsansicht.',
        'Du kannst deinen persönlichen Kalender-Feed in Google Calendar, Apple Calendar oder Outlook abonnieren — Events werden automatisch synchronisiert.',
        'Lade einzelne Events als .ics-Dateien herunter, wenn du sie lieber manuell hinzufügen möchtest.',
      ],
    },
    {
      title: 'Stadtfilter und unterstützte Städte',
      paragraphs: [
        'Localisio funktioniert in mehreren Städten. Der Stadtfilter auf den Event- und Gruppenseiten hilft dir, dich auf das zu konzentrieren, was in deiner Gegend passiert.',
        'Wenn du eine Stadt in deinem Profil eingestellt hast, wird sie überall als Standardfilter verwendet. Du kannst jederzeit zu einer anderen Stadt wechseln oder alle Städte anzeigen.',
        'Unterstützte Städte haben eigene URLs (z.B. /cities/prague/events), die sich gut zum Bookmarken oder Teilen eignen.',
      ],
    },
    {
      title: 'Sicherheit und Zielgruppen-Tags',
      paragraphs: [
        'Events können mit Zielgruppen-Tags versehen werden: Nur für Frauen, 18+, LGBTQ+ friendly, Alkoholfrei, Anfängerfreundlich, Hundefreundlich, Kinderfreundlich, Draußen, Gesunder Lebensstil.',
        'Diese Tags helfen Neulingen zu verstehen, was sie erwartet, bevor sie teilnehmen.',
        'Du kannst auch privat teilnehmen — dein Name erscheint nicht in der öffentlichen Teilnehmerliste, aber dein RSVP zählt trotzdem zur Gesamtzahl.',
      ],
    },
    {
      title: 'Profil und Einstellungen',
      paragraphs: [
        'Dein Profil zeigt Name, Bio, Stadt, Sprachen und Interessen. Andere Nutzer sehen deine öffentlichen Events und Gruppenmitgliedschaften.',
        'In den Einstellungen kannst du dein Passwort ändern, E-Mail-Benachrichtigungen verwalten, die Sprache wechseln und bei Bedarf dein Konto löschen.',
        'Das Onboarding hilft dir, dein Profil bei der ersten Registrierung einzurichten — wähle Stadt, Sprachen und ein paar Interessen, damit wir dir relevante Inhalte vorschlagen können.',
      ],
    },
    {
      title: 'Mehrsprachigkeit',
      paragraphs: [
        'Localisio ist auf Englisch, Russisch, Ukrainisch, Tschechisch, Deutsch und Spanisch verfügbar. Wechsle die Sprache im Footer oder in den Einstellungen.',
        'Event-Organisatoren können Übersetzungen für Titel und Beschreibungen hinzufügen. Die Plattform zeigt die Version in deiner Sprache, und wenn keine Übersetzung existiert — das Original.',
      ],
    },
  ],
};

const howToEs: HowToContent = {
  title: 'Cómo usar Localisio',
  description:
    'Una guía detallada de todas las funciones de Localisio — desde encontrar eventos hasta crear tu propia comunidad.',
  introTitle: 'Tu guía de Localisio',
  introBody:
    'Localisio te ayuda a encontrar eventos, conocer gente y construir conexiones reales. En esta página se explican todas las funciones de la plataforma.',
  sections: [
    {
      title: 'Encontrar eventos',
      paragraphs: [
        'La página de Eventos muestra todos los próximos eventos comunitarios y selecciones curadas de la ciudad. Usa filtros por ciudad, categoría, fecha, idioma y precio.',
        'La vista de mapa te permite ver eventos geográficamente — acércate para encontrar lo que pasa cerca de ti.',
        'Cada tarjeta de evento muestra información clave: fecha, lugar, número de asistentes y precio. Haz clic en cualquier tarjeta para ver la descripción completa, fotos y comentarios.',
      ],
    },
    {
      title: 'Crear tu propio evento',
      paragraphs: [
        'Haz clic en "Crear evento" en la navegación. Completa el título, descripción, fecha, hora, lugar y categoría.',
        'Puedes agregar hasta 5 fotos, establecer un número máximo de asistentes, marcar el evento como gratuito o de pago, y elegir los idiomas.',
        'Los eventos se pueden crear en nombre de un grupo que administras — así todos los miembros del grupo reciben notificación automáticamente.',
        'Agrega traducciones del título y la descripción para que personas que hablan otros idiomas también puedan encontrar tu evento.',
      ],
    },
    {
      title: 'Crews — ir juntos',
      paragraphs: [
        'Un crew es un grupo pequeño de 2 a 10 personas que asisten juntas a un evento específico. Es la solución para quienes quieren ir pero no solos.',
        'En la página de cualquier evento, busca la sección "Ir juntos". Puedes crear un nuevo crew o unirte a uno existente.',
        'Al crear un crew, defines un nombre, un punto de encuentro opcional y un límite de participantes. Se crea un chat privado automáticamente para coordinar detalles.',
        'Los crews son temporales — existen para un evento. Después del evento, el chat permanece para que puedan seguir en contacto o planear la próxima salida.',
        'También puedes compartir un enlace de invitación al crew con amigos que aún no están en la plataforma.',
      ],
    },
    {
      title: 'Grupos — comunidades permanentes',
      paragraphs: [
        'A diferencia de los crews, los grupos son comunidades permanentes unidas por un interés común: un club de running semanal, un intercambio de idiomas, juegos de mesa cada martes.',
        'Los grupos tienen su propia página con descripción, lista de miembros, eventos próximos y pasados, álbumes de fotos y un feed de discusión.',
        'Como miembro de un grupo recibes notificaciones sobre nuevos eventos, puedes participar en discusiones y ver fotos de encuentros pasados.',
        'Los administradores del grupo pueden crear eventos en nombre del grupo, gestionar miembros, moderar comentarios y publicar posts y resúmenes.',
        'Para crear un grupo, haz clic en "Crear grupo" en la navegación. Elige nombre, descripción, ciudad, idiomas e intereses.',
      ],
    },
    {
      title: 'Contactos y mensajes',
      paragraphs: [
        '¿Conociste a alguien interesante en un evento? Agrégalo a tus contactos. Esto te permite ver sus próximos eventos y enviar mensajes directos.',
        'La sección de Mensajes muestra todas tus conversaciones — mensajes directos y chats de crews y grupos.',
        'Puedes eliminar contactos en cualquier momento. Eliminar un contacto no borra el historial de mensajes pero detiene las notificaciones de esa persona.',
      ],
    },
    {
      title: 'Calendario',
      paragraphs: [
        'La página de Calendario muestra todos los eventos a los que asistes u organizas en una vista mensual.',
        'Puedes suscribirte a tu calendario personal en Google Calendar, Apple Calendar u Outlook — los eventos se sincronizan automáticamente.',
        'Descarga eventos individuales como archivos .ics si prefieres agregarlos manualmente.',
      ],
    },
    {
      title: 'Filtro de ciudad y ciudades soportadas',
      paragraphs: [
        'Localisio funciona en varias ciudades. El filtro de ciudad en las páginas de eventos y grupos te permite enfocarte en lo que pasa en tu zona.',
        'Si configuraste una ciudad en tu perfil, se usa como filtro predeterminado en todas partes. Siempre puedes cambiar a otra ciudad o ver todas las ciudades a la vez.',
        'Las ciudades soportadas tienen URLs dedicadas (ej. /cities/prague/events) que son ideales para guardar en favoritos o compartir.',
      ],
    },
    {
      title: 'Seguridad y etiquetas de audiencia',
      paragraphs: [
        'Los eventos pueden etiquetarse con indicadores de audiencia: Solo mujeres, 18+, LGBTQ+ friendly, Sin alcohol, Para principiantes, Dog friendly, Kid friendly, Al aire libre, Estilo de vida saludable.',
        'Estas etiquetas ayudan a los nuevos a entender qué esperar antes de unirse.',
        'También puedes asistir de forma privada — tu nombre no aparecerá en la lista pública de asistentes, pero tu RSVP sigue contando en el total.',
      ],
    },
    {
      title: 'Perfil y configuración',
      paragraphs: [
        'Tu perfil muestra tu nombre, bio, ciudad, idiomas e intereses. Otros usuarios ven tus eventos públicos y membresías en grupos.',
        'En Configuración puedes cambiar tu contraseña, gestionar notificaciones por email, cambiar el idioma de la interfaz y eliminar tu cuenta si es necesario.',
        'El onboarding te ayuda a configurar tu perfil cuando te registras por primera vez — elige tu ciudad, idiomas y algunos intereses para que podamos sugerirte contenido relevante.',
      ],
    },
    {
      title: 'Soporte multilingüe',
      paragraphs: [
        'Localisio está disponible en inglés, ruso, ucraniano, checo, alemán y español. Cambia el idioma desde el pie de página o la configuración.',
        'Los organizadores de eventos pueden agregar traducciones de títulos y descripciones. La plataforma muestra la versión en tu idioma, y si no hay traducción — el original.',
      ],
    },
  ],
};

const HOW_TO: Record<Locale, HowToContent> = {
  en: howToEn,
  ru: howToRu,
  uk: howToUk,
  cs: howToCs,
  de: howToDe,
  es: howToEs,
};

export function getHowToContent(locale: Locale): HowToContent {
  return HOW_TO[locale] ?? HOW_TO.en;
}
