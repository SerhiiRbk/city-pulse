import type { Locale } from '@/i18n/config';

export type FaqEntry = {
  question: string;
  /** Plain text answer; renders as a `<p>` per paragraph. */
  paragraphs: string[];
};

export type HelpContent = {
  title: string;
  description: string;
  introTitle: string;
  introBody: string;
  faqs: FaqEntry[];
  contactCta: {
    title: string;
    body: string;
    email: string;
  };
};

const helpEn: HelpContent = {
  title: 'Help & FAQ',
  description:
    'Answers to the most common questions about Localisio — how to register, how to find events, what makes a good organizer, and how we keep the platform safe.',
  introTitle: 'Need help fast?',
  introBody:
    'Look through the questions below first — most situations are covered. If you do not find what you need, write to us at info@localisio.com.',
  faqs: [
    {
      question: 'How do I register for Localisio?',
      paragraphs: [
        'Click "Sign up" in the header, choose an email and a password, and confirm your email through the link we send. After that you go through a short onboarding step where you pick your city, languages, and a few interests so we can suggest relevant events and groups.',
      ],
    },
    {
      question: 'Is Localisio free?',
      paragraphs: [
        'Yes — creating an account, joining communities, and attending free events costs nothing. Some curated city events have ticket prices set by the venue or organizer; in that case we link directly to the partner page where you buy the ticket.',
      ],
    },
    {
      question: 'How do I find events near me?',
      paragraphs: [
        'Open the "City events" page from the header — it shows curated picks for the city we are featuring, with filters for date (today, tomorrow, this weekend, next weekend, next week) and country. You can also browse the community-organized events on the "Events" page or open the map view to see everything that is happening in your area.',
      ],
    },
    {
      question: 'How do I create an event or a group?',
      paragraphs: [
        'Sign in, then click "Create event" or "Create group" in the header. Provide a title, a description, the date/time and location, the categories and languages, and optional photos. New users are limited to a few events per day so the platform stays high quality; that limit lifts as soon as you build a small organizing track record.',
      ],
    },
    {
      question: 'What is the difference between an Event and a Group?',
      paragraphs: [
        'An Event is a one-time get-together with a specific date and place. A Group is an ongoing community that organizes recurring events under one umbrella — for example, a weekly running club, a Czech language exchange, or a board games meetup that meets every Tuesday.',
      ],
    },
    {
      question: 'What is "Афиша" / city events?',
      paragraphs: [
        'These are listings curated by our editorial team — concerts, exhibitions, festivals, and other events from official sources like venue websites, kudyznudy.cz, and goout.net. Each system event links back to its original source so you always know where the information comes from.',
      ],
    },
    {
      question: 'What is a Crew and how do I use it?',
      paragraphs: [
        'A Crew is a small group (2–10 people) that you create to attend an event together. Think of it as "going with friends" — you pick an event, create a crew, give it a name, and invite people via the platform or by sharing an invite link through any messenger.',
        'Anyone can create a crew for events that allow it. Once created, crew members get a private group chat, see who else is coming, and can coordinate meeting details. You can also join an existing public crew if there are open spots.',
        'Invite links make it easy to bring friends who are not yet on the platform — they register, click the link, and land directly in your crew.',
      ],
    },
    {
      question: 'How do I add an event to my calendar?',
      paragraphs: [
        'Open any event page and click "Add to calendar". You can pick Google Calendar, Apple Calendar, or download a generic .ics file. There is also a personal subscription URL on your "My events" page — paste it once into your calendar app and every new RSVP shows up automatically without any further clicks.',
      ],
    },
    {
      question: 'How do I message another user?',
      paragraphs: [
        'Open their profile and click "Message". For privacy reasons we use a request-first model: the first message goes into a request queue and the recipient decides whether to accept the chat. Once accepted, the conversation works like any other messenger.',
      ],
    },
    {
      question: 'Is Localisio safe? How do you handle reports?',
      paragraphs: [
        'Every user goes through onboarding before they can publish or comment. Each event, group, post, comment, and profile has a "Report" button. Reports are reviewed by a person within 24 hours. We block accounts that violate our community rules, including no-shows that look like spam or harassment.',
      ],
    },
    {
      question: 'Which languages does Localisio support?',
      paragraphs: [
        'The interface is fully translated into English, Russian, Ukrainian, Czech, and German. Events keep the language the organizer wrote them in; curated city events are usually translated by our editorial team into all five.',
      ],
    },
    {
      question: 'Can I delete my account?',
      paragraphs: [
        'Yes — open Settings → Account → Delete account. We anonymize your profile and remove your private content right away; events you organized stay published unless you delete them first, because attendees rely on them.',
      ],
    },
    {
      question: 'How can I contact the team?',
      paragraphs: [
        'Write to info@localisio.com. We try to reply within two business days. If your message is about a specific page (an event, a group, an account), please include the URL — it makes investigation an order of magnitude faster.',
      ],
    },
  ],
  contactCta: {
    title: 'Did not find what you needed?',
    body: 'Send us a note and we will get back to you within two business days.',
    email: 'info@localisio.com',
  },
};

const helpRu: HelpContent = {
  title: 'Помощь и FAQ',
  description:
    'Ответы на самые частые вопросы о Localisio: как зарегистрироваться, как найти мероприятия, что делает хорошего организатора и как мы держим платформу безопасной.',
  introTitle: 'Нужна помощь быстро?',
  introBody:
    'Сначала посмотрите вопросы ниже — большинство ситуаций уже описаны. Если не нашли нужного, напишите на info@localisio.com.',
  faqs: [
    {
      question: 'Как зарегистрироваться на Localisio?',
      paragraphs: [
        'Нажмите «Регистрация» в шапке, укажите почту и пароль, подтвердите её по ссылке. Затем — короткий онбординг: выберите город, языки и пару интересов, чтобы мы подсказывали релевантные события и группы.',
      ],
    },
    {
      question: 'Localisio бесплатный?',
      paragraphs: [
        'Да — регистрация, участие в сообществах и бесплатные мероприятия ничего не стоят. У некоторых кураторских событий есть цена билета, установленная площадкой или организатором; в этом случае мы даём прямую ссылку на партнёра, где можно купить билет.',
      ],
    },
    {
      question: 'Как найти мероприятия рядом со мной?',
      paragraphs: [
        'Откройте «Афишу» в шапке — там кураторская подборка для текущего города, с фильтрами по датам (сегодня, завтра, эти выходные, следующие выходные, следующая неделя) и стране. Также можно посмотреть события сообщества на странице «Мероприятия» или открыть карту, чтобы увидеть всё, что происходит рядом.',
      ],
    },
    {
      question: 'Как создать событие или группу?',
      paragraphs: [
        'Войдите в аккаунт и нажмите «Создать событие» или «Создать группу» в шапке. Укажите название, описание, дату/время и место, категории и языки, при желании добавьте фото. Новые пользователи ограничены несколькими событиями в день для качества платформы; ограничение снимается, как только сформируется минимальный «трек-рекорд» организатора.',
      ],
    },
    {
      question: 'В чём разница между Событием и Группой?',
      paragraphs: [
        'Событие — это разовая встреча с конкретными датой и местом. Группа — постоянное сообщество, которое организует регулярные события под одним зонтиком: например, еженедельный клуб бега, чешский языковой обмен, настольные игры по вторникам.',
      ],
    },
    {
      question: 'Что такое «Афиша» / Городские события?',
      paragraphs: [
        'Это подборка нашей редакции — концерты, выставки, фестивали и другие события из официальных источников (сайты площадок, kudyznudy.cz, goout.net и др.). Каждое системное событие ссылается на оригинальный источник, чтобы всегда было понятно, откуда информация.',
      ],
    },
    {
      question: 'Что такое Компания (Crew) и как ей пользоваться?',
      paragraphs: [
        'Компания — это небольшая группа (2–10 человек), которую вы создаёте, чтобы пойти на мероприятие вместе. Это как «пойти с друзьями»: выбираете событие, создаёте компанию, даёте ей название и приглашаете людей через платформу или по ссылке-приглашению в любом мессенджере.',
        'Создать компанию может любой зарегистрированный пользователь для событий, где это разрешено. После создания участники получают приватный групповой чат, видят кто ещё идёт и могут договориться о деталях встречи. Также можно присоединиться к существующей публичной компании, если есть свободные места.',
        'Ссылки-приглашения позволяют легко позвать друзей, которых ещё нет на платформе — они регистрируются, переходят по ссылке и сразу попадают в вашу компанию.',
      ],
    },
    {
      question: 'Как добавить событие в календарь?',
      paragraphs: [
        'Откройте страницу события и нажмите «Добавить в календарь». Можно выбрать Google Calendar, Apple Calendar или скачать .ics-файл. На странице «Мои события» есть личная ссылка для подписки — вставьте её один раз в календарь, и все новые RSVP будут появляться автоматически.',
      ],
    },
    {
      question: 'Как написать другому пользователю?',
      paragraphs: [
        'Откройте его профиль и нажмите «Написать». Из соображений приватности первое сообщение уходит как запрос — получатель решает, принять ли чат. После принятия переписка работает как в любом мессенджере.',
      ],
    },
    {
      question: 'Localisio безопасен? Как вы рассматриваете жалобы?',
      paragraphs: [
        'Каждый пользователь проходит онбординг до того, как сможет публиковать и комментировать. У каждого события, группы, поста, комментария и профиля есть кнопка «Пожаловаться». Жалобы рассматривает человек в течение 24 часов. Мы блокируем аккаунты, которые нарушают правила сообщества — включая систематические неявки и преследования.',
      ],
    },
    {
      question: 'Какие языки поддерживает Localisio?',
      paragraphs: [
        'Интерфейс полностью переведён на английский, русский, украинский, чешский и немецкий. Описания событий хранятся на языке организатора; кураторские городские события обычно переведены редакцией сразу на все пять.',
      ],
    },
    {
      question: 'Можно ли удалить аккаунт?',
      paragraphs: [
        'Да — Настройки → Аккаунт → Удалить аккаунт. Мы анонимизируем профиль и сразу удаляем приватный контент; события, которые вы создавали, остаются опубликованными, если вы не удалите их сами — на них рассчитывают участники.',
      ],
    },
    {
      question: 'Как связаться с командой?',
      paragraphs: [
        'Пишите на info@localisio.com. Стараемся отвечать в течение двух рабочих дней. Если речь о конкретной странице (событие, группа, аккаунт), приложите URL — это ускоряет разбирательство на порядок.',
      ],
    },
  ],
  contactCta: {
    title: 'Не нашли нужного?',
    body: 'Напишите нам — ответим в течение двух рабочих дней.',
    email: 'info@localisio.com',
  },
};

const helpUk: HelpContent = {
  title: 'Допомога та FAQ',
  description:
    'Відповіді на найчастіші питання про Localisio: як зареєструватися, як знаходити події, що робить хорошого організатора і як ми тримаємо платформу безпечною.',
  introTitle: 'Потрібна допомога швидко?',
  introBody:
    'Спочатку перегляньте питання нижче — більшість ситуацій уже описані. Якщо не знайшли потрібного, напишіть на info@localisio.com.',
  faqs: [
    {
      question: 'Як зареєструватися на Localisio?',
      paragraphs: [
        'Натисніть «Реєстрація» у шапці, вкажіть пошту та пароль, підтвердіть її через посилання. Потім короткий онбординг: оберіть місто, мови та кілька інтересів, щоб ми пропонували релевантні події та групи.',
      ],
    },
    {
      question: 'Localisio безкоштовний?',
      paragraphs: [
        'Так — реєстрація, участь у спільнотах і безкоштовні події нічого не коштують. У деяких редакційних подій є ціна квитка, встановлена майданчиком або організатором; у такому разі ми даємо пряме посилання на партнера, де можна купити квиток.',
      ],
    },
    {
      question: 'Як знайти події поруч?',
      paragraphs: [
        'Відкрийте «Афішу» у шапці — там добірка нашої редакції для поточного міста, з фільтрами за датою (сьогодні, завтра, ці вихідні, наступні вихідні, наступний тиждень) та країною. Також можна переглянути події спільноти на сторінці «Події» або відкрити карту.',
      ],
    },
    {
      question: 'Як створити подію чи групу?',
      paragraphs: [
        'Увійдіть в акаунт і натисніть «Створити подію» чи «Створити групу» у шапці. Вкажіть назву, опис, дату/час і місце, категорії та мови, за бажанням додайте фото. Нові користувачі обмежені кількома подіями на день заради якості платформи; обмеження знімається, щойно сформується мінімальна історія організатора.',
      ],
    },
    {
      question: 'У чому різниця між Подією та Групою?',
      paragraphs: [
        'Подія — разова зустріч із конкретними датою і місцем. Група — постійна спільнота, що організовує регулярні події: наприклад, щотижневий клуб бігу, чеський мовний обмін, настільні ігри щовівторка.',
      ],
    },
    {
      question: 'Що таке «Афіша» / Міські події?',
      paragraphs: [
        'Це добірка нашої редакції — концерти, виставки, фестивалі та інші події з офіційних джерел (сайти майданчиків, kudyznudy.cz, goout.net та ін.). Кожна системна подія посилається на оригінальне джерело, щоб завжди було зрозуміло, звідки інформація.',
      ],
    },
    {
      question: 'Що таке Компанія (Crew) і як нею користуватися?',
      paragraphs: [
        'Компанія — це невелика група (2–10 осіб), яку ви створюєте, щоб піти на подію разом. Це як «піти з друзями»: обираєте подію, створюєте компанію, даєте їй назву та запрошуєте людей через платформу або за посиланням-запрошенням у будь-якому месенджері.',
        'Створити компанію може будь-який зареєстрований користувач для подій, де це дозволено. Після створення учасники отримують приватний груповий чат, бачать хто ще йде та можуть домовитися про деталі зустрічі. Також можна приєднатися до існуючої публічної компанії, якщо є вільні місця.',
        'Посилання-запрошення дозволяють легко покликати друзів, яких ще немає на платформі — вони реєструються, переходять за посиланням і одразу потрапляють у вашу компанію.',
      ],
    },
    {
      question: 'Як додати подію в календар?',
      paragraphs: [
        'Відкрийте сторінку події та натисніть «Додати в календар». Можна обрати Google Calendar, Apple Calendar або завантажити .ics-файл. На сторінці «Мої події» є особисте посилання для підписки — вставте його один раз у календар, і всі нові RSVP з’являтимуться автоматично.',
      ],
    },
    {
      question: 'Як написати іншому користувачу?',
      paragraphs: [
        'Відкрийте його профіль і натисніть «Написати». Заради приватності перше повідомлення йде як запит — одержувач вирішує, чи приймати чат. Після прийняття листування працює як у будь-якому месенджері.',
      ],
    },
    {
      question: 'Localisio безпечний? Як ви розглядаєте скарги?',
      paragraphs: [
        'Кожен користувач проходить онбординг до того, як зможе публікувати і коментувати. У кожної події, групи, посту, коментаря і профілю є кнопка «Поскаржитися». Скарги розглядає людина протягом 24 годин. Ми блокуємо акаунти, що порушують правила спільноти.',
      ],
    },
    {
      question: 'Які мови підтримує Localisio?',
      paragraphs: [
        'Інтерфейс повністю перекладено англійською, російською, українською, чеською та німецькою. Описи подій зберігаються мовою організатора; редакційні міські події зазвичай перекладено одразу всіма п’ятьма мовами.',
      ],
    },
    {
      question: 'Чи можна видалити акаунт?',
      paragraphs: [
        'Так — Налаштування → Акаунт → Видалити акаунт. Ми анонімізуємо профіль і одразу видаляємо приватний контент; події, які ви створювали, залишаються опублікованими, якщо ви не видалите їх самі — на них розраховують учасники.',
      ],
    },
    {
      question: 'Як зв’язатися з командою?',
      paragraphs: [
        'Пишіть на info@localisio.com. Намагаємося відповідати протягом двох робочих днів. Якщо мова про конкретну сторінку (подія, група, акаунт), додайте URL — це прискорює розбір на порядок.',
      ],
    },
  ],
  contactCta: {
    title: 'Не знайшли потрібного?',
    body: 'Напишіть нам — відповімо протягом двох робочих днів.',
    email: 'info@localisio.com',
  },
};

const helpCs: HelpContent = {
  title: 'Nápověda a FAQ',
  description:
    'Odpovědi na nejčastější otázky o Localisiu: jak se zaregistrovat, jak najít akce, co dělá dobrého organizátora a jak udržujeme platformu bezpečnou.',
  introTitle: 'Potřebujete pomoc rychle?',
  introBody:
    'Nejdříve se podívejte na otázky níže — většina situací je popsaná. Pokud nenajdete co potřebujete, napište nám na info@localisio.com.',
  faqs: [
    {
      question: 'Jak se zaregistrovat na Localisio?',
      paragraphs: [
        'Klikněte na "Registrace" v záhlaví, zvolte e-mail a heslo a potvrďte ho přes odkaz, který vám pošleme. Poté projdete krátkým onboardingem, kde si vyberete město, jazyky a několik zájmů, abychom mohli doporučovat relevantní akce a skupiny.',
      ],
    },
    {
      question: 'Je Localisio zdarma?',
      paragraphs: [
        'Ano — vytvoření účtu, zapojení do komunit a účast na bezplatných akcích nic nestojí. Některé redakční městské akce mají vstupné stanovené pořadatelem nebo místem konání; v takovém případě vás přímo odkážeme na partnerskou stránku, kde si vstupenku koupíte.',
      ],
    },
    {
      question: 'Jak najít akce ve svém okolí?',
      paragraphs: [
        'Otevřete "Afišu" v záhlaví — najdete tam redakční výběr pro aktuální město, s filtry podle data (dnes, zítra, tento víkend, příští víkend, příští týden) a země. Můžete také procházet komunitní akce na stránce "Akce" nebo otevřít mapu, kde uvidíte vše ve svém okolí.',
      ],
    },
    {
      question: 'Jak vytvořit akci nebo skupinu?',
      paragraphs: [
        'Přihlaste se a klikněte na "Vytvořit akci" nebo "Vytvořit skupinu" v záhlaví. Vyplňte název, popis, datum/čas a místo, kategorie a jazyky a volitelně fotografie. Noví uživatelé mají denní limit počtu akcí kvůli kvalitě platformy; limit zmizí, jakmile si vybudujete minimální organizátorskou historii.',
      ],
    },
    {
      question: 'Jaký je rozdíl mezi Akcí a Skupinou?',
      paragraphs: [
        'Akce je jednorázové setkání s konkrétním datem a místem. Skupina je trvalá komunita, která organizuje opakující se akce pod jednou střechou: například týdenní běžecký klub, česko-anglickou jazykovou výměnu nebo deskové hry každé úterý.',
      ],
    },
    {
      question: 'Co je "Афиша" / Městské akce?',
      paragraphs: [
        'Jsou to listingy připravené naší redakcí — koncerty, výstavy, festivaly a další akce z oficiálních zdrojů (weby míst konání, kudyznudy.cz, goout.net a další). Každá systémová akce odkazuje na původní zdroj, abyste vždy věděli odkud informace pochází.',
      ],
    },
    {
      question: 'Co je to Crew (parta) a jak ji používat?',
      paragraphs: [
        'Crew je malá skupina (2–10 lidí), kterou vytvoříte, abyste šli na akci společně. Představte si to jako „jít s přáteli": vyberete akci, vytvoříte partu, pojmenujete ji a pozvete lidi přes platformu nebo sdílením odkazu v jakémkoli messengeru.',
        'Partu může vytvořit kdokoli pro akce, které to umožňují. Po vytvoření členové získají soukromý skupinový chat, vidí kdo další jde a mohou se domluvit na detailech setkání. Můžete se také připojit k existující veřejné partě, pokud jsou volná místa.',
        'Pozvánkové odkazy usnadňují přivedení přátel, kteří ještě nejsou na platformě — zaregistrují se, kliknou na odkaz a rovnou se ocitnou ve vaší partě.',
      ],
    },
    {
      question: 'Jak přidat akci do kalendáře?',
      paragraphs: [
        'Otevřete stránku akce a klikněte na "Přidat do kalendáře". Můžete zvolit Google Calendar, Apple Calendar nebo stáhnout obecný .ics soubor. Na stránce "Moje akce" je také osobní URL pro odběr — vložíte ji jednou do své kalendářové aplikace a všechna nová RSVP se objeví automaticky.',
      ],
    },
    {
      question: 'Jak napsat jinému uživateli?',
      paragraphs: [
        'Otevřete jeho profil a klikněte na "Napsat". Z důvodu soukromí používáme model "nejprve žádost": první zpráva jde do fronty žádostí a příjemce rozhodne, zda chat přijme. Po přijetí konverzace funguje jako jakýkoli jiný messenger.',
      ],
    },
    {
      question: 'Je Localisio bezpečné? Jak řešíte hlášení?',
      paragraphs: [
        'Každý uživatel projde onboardingem před tím, než může publikovat nebo komentovat. Každá akce, skupina, příspěvek, komentář i profil má tlačítko "Nahlásit". Hlášení posuzuje člověk do 24 hodin. Účty, které porušují pravidla komunity, blokujeme.',
      ],
    },
    {
      question: 'Jaké jazyky Localisio podporuje?',
      paragraphs: [
        'Rozhraní je plně přeloženo do angličtiny, ruštiny, ukrajinštiny, češtiny a němčiny. Popisy akcí zůstávají v jazyce organizátora; redakční městské akce obvykle překládáme do všech pěti.',
      ],
    },
    {
      question: 'Mohu smazat svůj účet?',
      paragraphs: [
        'Ano — Nastavení → Účet → Smazat účet. Profil anonymizujeme a soukromý obsah ihned odstraníme; akce, které jste vytvořili, zůstávají publikované, pokud je nesmažete sami — účastníci s nimi počítají.',
      ],
    },
    {
      question: 'Jak nás kontaktovat?',
      paragraphs: [
        'Napište na info@localisio.com. Snažíme se odpovědět do dvou pracovních dnů. Pokud se zpráva týká konkrétní stránky (akce, skupiny, účtu), přiložte URL — výrazně to urychlí řešení.',
      ],
    },
  ],
  contactCta: {
    title: 'Nenašli jste co jste hledali?',
    body: 'Napište nám a my se ozveme do dvou pracovních dnů.',
    email: 'info@localisio.com',
  },
};

const helpDe: HelpContent = {
  title: 'Hilfe & FAQ',
  description:
    'Antworten auf die häufigsten Fragen zu Localisio — wie Sie sich registrieren, wie Sie Veranstaltungen finden, was eine gute Organisator:in ausmacht und wie wir die Plattform sicher halten.',
  introTitle: 'Brauchen Sie schnell Hilfe?',
  introBody:
    'Schauen Sie zuerst die Fragen unten durch — die meisten Situationen sind abgedeckt. Wenn Sie nicht finden, was Sie brauchen, schreiben Sie an info@localisio.com.',
  faqs: [
    {
      question: 'Wie registriere ich mich bei Localisio?',
      paragraphs: [
        'Klicken Sie oben auf "Registrieren", wählen Sie E-Mail und Passwort und bestätigen Sie die Adresse über den Link, den wir senden. Danach durchlaufen Sie ein kurzes Onboarding, in dem Sie Ihre Stadt, Sprachen und einige Interessen wählen, damit wir relevante Veranstaltungen und Gruppen vorschlagen können.',
      ],
    },
    {
      question: 'Ist Localisio kostenlos?',
      paragraphs: [
        'Ja — Konto erstellen, Communities beitreten und an kostenlosen Veranstaltungen teilnehmen kostet nichts. Einige redaktionelle Stadtveranstaltungen haben Ticketpreise, die vom Veranstalter oder Ort festgelegt werden; in diesem Fall verlinken wir direkt auf die Partnerseite, auf der Sie das Ticket kaufen.',
      ],
    },
    {
      question: 'Wie finde ich Veranstaltungen in meiner Nähe?',
      paragraphs: [
        'Öffnen Sie oben "Stadtveranstaltungen" — dort sehen Sie redaktionelle Tipps für die aktuelle Stadt, mit Filtern nach Datum (heute, morgen, dieses Wochenende, nächstes Wochenende, nächste Woche) und Land. Sie können auch die Community-Veranstaltungen auf der Seite "Veranstaltungen" durchstöbern oder die Karte öffnen, um alles in Ihrer Nähe zu sehen.',
      ],
    },
    {
      question: 'Wie erstelle ich eine Veranstaltung oder Gruppe?',
      paragraphs: [
        'Melden Sie sich an und klicken Sie oben auf "Veranstaltung erstellen" oder "Gruppe erstellen". Geben Sie Titel, Beschreibung, Datum/Uhrzeit und Ort, Kategorien und Sprachen sowie optional Fotos an. Neue Nutzer:innen sind aus Qualitätsgründen auf wenige Veranstaltungen pro Tag begrenzt; das Limit fällt, sobald Sie eine kleine Organisator:innen-Historie aufgebaut haben.',
      ],
    },
    {
      question: 'Was ist der Unterschied zwischen Veranstaltung und Gruppe?',
      paragraphs: [
        'Eine Veranstaltung ist ein einmaliges Treffen mit konkretem Datum und Ort. Eine Gruppe ist eine fortlaufende Community, die wiederkehrende Veranstaltungen unter einem Dach organisiert — zum Beispiel ein wöchentlicher Laufclub, ein tschechischer Sprach­tandem oder Brettspielabende jeden Dienstag.',
      ],
    },
    {
      question: 'Was ist "Афиша" / Stadtveranstaltungen?',
      paragraphs: [
        'Das sind von unserer Redaktion kuratierte Listings — Konzerte, Ausstellungen, Festivals und andere Veranstaltungen aus offiziellen Quellen (Veranstalter-Websites, kudyznudy.cz, goout.net usw.). Jede Systemveranstaltung verlinkt auf die Originalquelle, damit immer klar ist, woher die Informationen stammen.',
      ],
    },
    {
      question: 'Was ist eine Crew und wie nutze ich sie?',
      paragraphs: [
        'Eine Crew ist eine kleine Gruppe (2–10 Personen), die Sie erstellen, um gemeinsam eine Veranstaltung zu besuchen. Stellen Sie es sich als „mit Freunden hingehen" vor: Sie wählen ein Event, erstellen eine Crew, geben ihr einen Namen und laden Leute über die Plattform oder per Einladungslink in einem beliebigen Messenger ein.',
        'Jede registrierte Person kann für Events, die es erlauben, eine Crew erstellen. Nach der Erstellung erhalten die Mitglieder einen privaten Gruppenchat, sehen wer noch kommt und können Treffpunkt-Details absprechen. Sie können auch einer bestehenden öffentlichen Crew beitreten, wenn noch Plätze frei sind.',
        'Einladungslinks machen es einfach, Freunde mitzubringen, die noch nicht auf der Plattform sind — sie registrieren sich, klicken auf den Link und landen direkt in Ihrer Crew.',
      ],
    },
    {
      question: 'Wie füge ich eine Veranstaltung zu meinem Kalender hinzu?',
      paragraphs: [
        'Öffnen Sie eine Veranstaltung und klicken Sie auf "Zum Kalender hinzufügen". Sie können Google Calendar, Apple Calendar wählen oder eine generische .ics-Datei herunterladen. Auf der Seite "Meine Veranstaltungen" gibt es zudem eine persönliche Abonnement-URL — fügen Sie sie einmal in Ihre Kalender-App ein und alle neuen RSVPs erscheinen automatisch.',
      ],
    },
    {
      question: 'Wie schreibe ich einer anderen Nutzerin / einem anderen Nutzer?',
      paragraphs: [
        'Öffnen Sie das Profil und klicken Sie auf "Nachricht". Aus Datenschutzgründen verwenden wir ein Anfrage-Modell: Die erste Nachricht landet in einer Anfrage-Warteschlange und der Empfänger entscheidet, ob er den Chat annimmt. Nach der Annahme funktioniert die Konversation wie bei jedem anderen Messenger.',
      ],
    },
    {
      question: 'Ist Localisio sicher? Wie behandeln Sie Meldungen?',
      paragraphs: [
        'Jede Nutzerin und jeder Nutzer durchläuft das Onboarding, bevor sie publizieren oder kommentieren können. Jede Veranstaltung, Gruppe, jeder Beitrag, Kommentar und jedes Profil hat einen "Melden"-Button. Meldungen prüft ein Mensch innerhalb von 24 Stunden. Konten, die unsere Community-Regeln verletzen, sperren wir.',
      ],
    },
    {
      question: 'Welche Sprachen unterstützt Localisio?',
      paragraphs: [
        'Die Oberfläche ist vollständig auf Englisch, Russisch, Ukrainisch, Tschechisch und Deutsch übersetzt. Veranstaltungen behalten die Sprache der Organisator:in; redaktionelle Stadtveranstaltungen sind meist in alle fünf Sprachen übersetzt.',
      ],
    },
    {
      question: 'Kann ich mein Konto löschen?',
      paragraphs: [
        'Ja — Einstellungen → Konto → Konto löschen. Wir anonymisieren Ihr Profil und entfernen privaten Inhalt sofort; Veranstaltungen, die Sie organisiert haben, bleiben publiziert, sofern Sie sie nicht zuerst löschen — die Teilnehmenden verlassen sich darauf.',
      ],
    },
    {
      question: 'Wie erreiche ich das Team?',
      paragraphs: [
        'Schreiben Sie an info@localisio.com. Wir antworten in der Regel innerhalb von zwei Werktagen. Wenn es um eine konkrete Seite geht (Veranstaltung, Gruppe, Konto), fügen Sie bitte die URL hinzu — das beschleunigt die Untersuchung um eine Größenordnung.',
      ],
    },
  ],
  contactCta: {
    title: 'Nicht gefunden, was Sie brauchten?',
    body: 'Schreiben Sie uns — wir antworten innerhalb von zwei Werktagen.',
    email: 'info@localisio.com',
  },
};

const HELP: Record<Locale, HelpContent> = {
  en: helpEn,
  ru: helpRu,
  uk: helpUk,
  cs: helpCs,
  de: helpDe,
  es: helpEn, // Falls back to English; Spanish help content can be added later
};

export function getHelpContent(locale: Locale): HelpContent {
  return HELP[locale] ?? helpEn;
}
