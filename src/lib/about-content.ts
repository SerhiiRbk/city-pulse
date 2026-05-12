import type { Locale } from '@/i18n/config';

type AboutSection = {
  title: string;
  paragraphs: string[];
};

export type AboutContent = {
  title: string;
  description: string;
  introTitle: string;
  introBody: string;
  sections: AboutSection[];
  contactEmail: string;
};

const aboutEn: AboutContent = {
  title: 'About Localisio',
  description:
    'Localisio is a social platform for offline communities. We help expats and locals find people who share their interests, join welcoming events, and turn cities into places where it is easy to make friends.',
  introTitle: 'Why Localisio exists',
  introBody:
    'Cities are full of interesting people, but it is hard to find them. Existing platforms either focus on dating, on professional networking, or on huge concerts that you go to alone. We built Localisio for the gap in the middle: small, recurring, friendly events where you can show up alone and leave with new acquaintances.',
  sections: [
    {
      title: 'What we do',
      paragraphs: [
        'We surface curated city events ("Афиша") for the cities we cover, and we make it easy for community organizers to publish their own meetups, walks, language exchanges, and clubs.',
        'Members can RSVP, see who else is coming, message organizers, save events to a personal calendar (with native subscriptions for Google Calendar, Apple Calendar, and Outlook), and follow recurring groups that match their interests.',
        'Our Crew feature lets you create a small group (2–10 people) to attend any event together. Invite friends via a shareable link, coordinate in a private group chat, and show up as a team. It is the easiest way to turn "I want to go but not alone" into an actual plan.',
      ],
    },
    {
      title: 'Who builds Localisio',
      paragraphs: [
        'Localisio is run by a small distributed team of expats who use the product themselves. We are based across Prague, Berlin, and Lisbon, and we ship updates almost every week.',
        'We are not VC-backed and we do not run ads. The product is funded by selective partnerships with cultural institutions that produce events you might want to know about anyway.',
      ],
    },
    {
      title: 'How we keep the platform safe',
      paragraphs: [
        'Every account passes through an onboarding step that asks for a profile photo, languages, and interests. Reports are reviewed by a human within 24 hours. Organizers who repeatedly host no-shows or get reported lose the ability to publish.',
        'We do not allow content that promotes violence, harassment, hate, illegal activity, or sexual material. We expect attendees to behave respectfully both online and at events.',
      ],
    },
    {
      title: 'Languages we support',
      paragraphs: [
        'The interface is fully translated into English, Russian, Ukrainian, Czech, and German. Event descriptions are stored in the language the organizer wrote them in; many curated city events are translated by our editorial team into all five.',
        'If your community would benefit from another language, write to us at info@localisio.com — we add new locales when there is a real audience for them.',
      ],
    },
    {
      title: 'How to get in touch',
      paragraphs: [
        'Press, partnerships, and media inquiries: info@localisio.com. We try to reply within two business days.',
        'For product feedback, the fastest path is to find an event you joined and use the in-app feedback link, or write to the same address with the URL of the page you are talking about.',
      ],
    },
  ],
  contactEmail: 'info@localisio.com',
};

const aboutRu: AboutContent = {
  title: 'О Localisio',
  description:
    'Localisio — социальная платформа для офлайн-сообществ. Мы помогаем экспатам и местным находить людей со схожими интересами, попадать на дружелюбные мероприятия и превращать город в место, где легко знакомиться.',
  introTitle: 'Зачем мы существуем',
  introBody:
    'В городе полно интересных людей, но найти их трудно. Существующие платформы либо про знакомства, либо про деловой нетворкинг, либо про гигантские концерты, куда идёшь один. Мы сделали Localisio про то, чего не хватает: маленькие, регулярные, дружелюбные встречи, на которые можно прийти одному и уйти с новыми знакомыми.',
  sections: [
    {
      title: 'Что мы делаем',
      paragraphs: [
        'Мы собираем кураторскую афишу мероприятий по городам, которые покрываем, и даём организаторам сообществ простой способ публиковать свои встречи, прогулки, языковые клубы и регулярные собрания.',
        'Участники могут отвечать на приглашения, видеть кто ещё идёт, писать организаторам, сохранять события в свой календарь (с подпиской через Google/Apple/Outlook) и подписываться на регулярные группы по интересам.',
        'Функция «Компания» позволяет собрать небольшую группу (2–10 человек) и пойти на любое мероприятие вместе. Пригласите друзей по ссылке, договоритесь в приватном чате и приходите командой. Это самый простой способ превратить «хочу пойти, но не один» в реальный план.',
      ],
    },
    {
      title: 'Кто делает Localisio',
      paragraphs: [
        'Localisio — это маленькая распределённая команда экспатов, которая сама пользуется продуктом. Мы работаем из Праги, Берлина и Лиссабона и выкатываем обновления почти каждую неделю.',
        'У нас нет венчурных инвесторов и мы не показываем рекламу. Продукт финансируется через избранные партнёрства с культурными институциями, чьи события и так интересно знать.',
      ],
    },
    {
      title: 'Как мы держим платформу безопасной',
      paragraphs: [
        'Каждый аккаунт проходит онбординг с фото, языками и интересами. Жалобы рассматриваются человеком в течение 24 часов. Организаторы, у которых много неявок или жалоб, теряют возможность публиковать события.',
        'Мы не разрешаем контент с насилием, харассментом, ненавистью, незаконными действиями или сексуальным содержимым. Мы ожидаем, что участники ведут себя уважительно и в чате, и на мероприятиях.',
      ],
    },
    {
      title: 'Какие языки поддерживаем',
      paragraphs: [
        'Интерфейс полностью переведён на английский, русский, украинский, чешский и немецкий. Описания мероприятий хранятся на языке организатора; многие кураторские события переводит редакционная команда сразу на все пять.',
        'Если вашему сообществу нужен другой язык — напишите на info@localisio.com. Мы добавляем новые локали там, где есть реальная аудитория.',
      ],
    },
    {
      title: 'Как с нами связаться',
      paragraphs: [
        'Пресса, партнёрства, медиа-запросы: info@localisio.com. Стараемся отвечать в течение двух рабочих дней.',
        'Для фидбека по продукту удобнее всего открыть конкретное мероприятие, использовать встроенную форму фидбека или написать по тому же адресу с ссылкой на страницу, о которой идёт речь.',
      ],
    },
  ],
  contactEmail: 'info@localisio.com',
};

const aboutUk: AboutContent = {
  title: 'Про Localisio',
  description:
    'Localisio — соціальна платформа для офлайн-спільнот. Ми допомагаємо експатам і місцевим знаходити людей зі схожими інтересами, потрапляти на дружні заходи та робити місто місцем, де легко знайомитися.',
  introTitle: 'Навіщо ми існуємо',
  introBody:
    'У місті багато цікавих людей, але знайти їх непросто. Існуючі платформи — це або про знайомства, або про діловий нетворкінг, або про гігантські концерти, куди ходять самі. Ми зробили Localisio про те, чого бракує: маленькі регулярні дружні зустрічі, на які можна прийти самому й піти з новими знайомими.',
  sections: [
    {
      title: 'Що ми робимо',
      paragraphs: [
        'Ми збираємо редакційну афішу подій у містах, які покриваємо, і даємо організаторам спільнот простий спосіб публікувати свої зустрічі, прогулянки, мовні клуби та регулярні зустрічі.',
        'Учасники можуть відповідати на запрошення, бачити хто ще йде, писати організаторам, зберігати події у власний календар (з підпискою через Google/Apple/Outlook) і підписуватися на регулярні групи за інтересами.',
        'Функція «Компанія» дозволяє зібрати невелику групу (2–10 осіб) і піти на будь-яку подію разом. Запросіть друзів за посиланням, домовтеся у приватному чаті та приходьте командою. Це найпростіший спосіб перетворити «хочу піти, але не сам» на реальний план.',
      ],
    },
    {
      title: 'Хто робить Localisio',
      paragraphs: [
        'Localisio — це маленька розподілена команда експатів, яка сама користується продуктом. Працюємо з Праги, Берліна та Лісабона і випускаємо оновлення майже щотижня.',
        'У нас немає венчурних інвесторів і ми не показуємо рекламу. Продукт фінансується через вибрані партнерства з культурними інституціями, події яких і так цікаво знати.',
      ],
    },
    {
      title: 'Як ми тримаємо платформу безпечною',
      paragraphs: [
        'Кожен акаунт проходить онбординг із фото, мовами та інтересами. Скарги розглядаються людиною протягом 24 годин. Організатори з багатьма неявками чи скаргами втрачають можливість публікувати події.',
        'Ми не дозволяємо контент із насильством, харасментом, ненавистю, незаконними діями чи сексуальним змістом. Очікуємо, що учасники поводяться шанобливо і в чаті, і на заходах.',
      ],
    },
    {
      title: 'Які мови підтримуємо',
      paragraphs: [
        'Інтерфейс повністю перекладено англійською, російською, українською, чеською та німецькою. Описи подій зберігаються мовою організатора; багато редакційних подій перекладає наша команда відразу на всі п’ять.',
        'Якщо вашій спільноті потрібна інша мова — напишіть на info@localisio.com. Додаємо нові локалі там, де є реальна аудиторія.',
      ],
    },
    {
      title: 'Як з нами зв’язатися',
      paragraphs: [
        'Преса, партнерства, медіа-запити: info@localisio.com. Намагаємося відповідати протягом двох робочих днів.',
        'Для фідбеку за продуктом найзручніше відкрити конкретну подію, скористатися вбудованою формою фідбеку або написати на ту ж адресу з посиланням на сторінку, про яку йдеться.',
      ],
    },
  ],
  contactEmail: 'info@localisio.com',
};

const aboutCs: AboutContent = {
  title: 'O Localisiu',
  description:
    'Localisio je sociální platforma pro offline komunity. Pomáháme expatům i místním najít lidi se stejnými zájmy, dostat se na vstřícné akce a proměnit město v místo, kde je snadné se seznámit.',
  introTitle: 'Proč Localisio existuje',
  introBody:
    'Ve městech je spousta zajímavých lidí, ale najít je je těžké. Existující platformy se zaměřují na seznamování, profesní networking nebo obří koncerty, kam jdete sami. Localisio jsme postavili pro mezeru mezi tím: malé, opakované, přátelské akce, na které můžete přijít sami a odejít s novými známostmi.',
  sections: [
    {
      title: 'Co děláme',
      paragraphs: [
        'Sestavujeme redakční afiši ("Афиша") pro města, která pokrýváme, a dáváme komunitním organizátorům jednoduchý způsob, jak publikovat vlastní setkání, procházky, jazykové výměny a kluby.',
        'Členové mohou potvrdit účast, vidět kdo další přijde, psát organizátorům, ukládat akce do osobního kalendáře (s nativní synchronizací do Google Calendar, Apple Calendar a Outlook) a sledovat opakující se skupiny podle zájmů.',
        'Funkce „Crew" (parta) umožňuje vytvořit malou skupinu (2–10 lidí) a jít na jakoukoli akci společně. Pozvěte přátele přes sdílený odkaz, domluvte se v soukromém skupinovém chatu a přijďte jako tým. Je to nejjednodušší způsob, jak proměnit „chci jít, ale ne sám" ve skutečný plán.',
      ],
    },
    {
      title: 'Kdo Localisio dělá',
      paragraphs: [
        'Localisio provozuje malý distribuovaný tým expatů, který produkt sám používá. Sídlíme v Praze, Berlíně a Lisabonu a aktualizace nasazujeme téměř každý týden.',
        'Nemáme rizikový kapitál a neukazujeme reklamy. Produkt financujeme prostřednictvím vybraných partnerství s kulturními institucemi, jejichž akce stojí za to znát.',
      ],
    },
    {
      title: 'Jak udržujeme platformu bezpečnou',
      paragraphs: [
        'Každý účet projde onboardingem s fotkou, jazyky a zájmy. Hlášení posuzuje člověk do 24 hodin. Organizátoři, na které opakovaně přicházejí stížnosti nebo mají spoustu absencí, ztrácejí možnost publikovat.',
        'Nepovolujeme obsah propagující násilí, obtěžování, nenávist, nezákonné aktivity ani sexuální materiál. Od účastníků očekáváme, že se budou chovat slušně online i na akcích.',
      ],
    },
    {
      title: 'Jaké jazyky podporujeme',
      paragraphs: [
        'Rozhraní je plně přeloženo do angličtiny, ruštiny, ukrajinštiny, češtiny a němčiny. Popisy akcí jsou v jazyce organizátora; mnoho redakčních akcí překládáme do všech pěti jazyků.',
        'Pokud by vaší komunitě prospěl další jazyk, napište na info@localisio.com — přidáváme nové lokalizace tam, kde je reálné publikum.',
      ],
    },
    {
      title: 'Jak nás kontaktovat',
      paragraphs: [
        'Tisk, partnerství a mediální dotazy: info@localisio.com. Snažíme se odpovědět do dvou pracovních dní.',
        'Pro zpětnou vazbu k produktu je nejrychlejší cesta otevřít konkrétní akci, použít vestavěný formulář zpětné vazby nebo napsat na stejnou adresu s URL stránky, o které mluvíte.',
      ],
    },
  ],
  contactEmail: 'info@localisio.com',
};

const aboutDe: AboutContent = {
  title: 'Über Localisio',
  description:
    'Localisio ist eine soziale Plattform für Offline-Communitys. Wir helfen Expats und Einheimischen, Menschen mit gemeinsamen Interessen zu finden, willkommene Veranstaltungen zu besuchen und Städte zu Orten zu machen, an denen es leicht ist, Kontakte zu knüpfen.',
  introTitle: 'Warum es Localisio gibt',
  introBody:
    'Städte sind voller interessanter Menschen, aber sie zu finden ist schwer. Bestehende Plattformen konzentrieren sich auf Dating, professionelles Networking oder riesige Konzerte, zu denen man allein geht. Localisio haben wir für die Lücke dazwischen gebaut: kleine, wiederkehrende, freundliche Veranstaltungen, zu denen man allein erscheinen und mit neuen Bekanntschaften gehen kann.',
  sections: [
    {
      title: 'Was wir tun',
      paragraphs: [
        'Wir kuratieren redaktionelle Stadtveranstaltungen ("Афиша") für die Städte, die wir abdecken, und ermöglichen Community-Organisatoren, ihre eigenen Treffen, Spaziergänge, Sprach­tandems und Clubs einfach zu veröffentlichen.',
        'Mitglieder können zusagen, sehen wer noch kommt, Organisatoren anschreiben, Events in ihren persönlichen Kalender speichern (mit nativer Anbindung an Google Calendar, Apple Calendar und Outlook) und wiederkehrenden Gruppen nach Interessen folgen.',
        'Unsere Crew-Funktion ermöglicht es, eine kleine Gruppe (2–10 Personen) zu erstellen und gemeinsam zu jeder Veranstaltung zu gehen. Laden Sie Freunde per teilbarem Link ein, koordinieren Sie sich im privaten Gruppenchat und erscheinen Sie als Team. Es ist der einfachste Weg, „Ich will hin, aber nicht allein" in einen konkreten Plan zu verwandeln.',
      ],
    },
    {
      title: 'Wer Localisio baut',
      paragraphs: [
        'Localisio wird von einem kleinen verteilten Team von Expats betrieben, das das Produkt selbst nutzt. Wir sitzen in Prag, Berlin und Lissabon und veröffentlichen fast jede Woche Updates.',
        'Wir haben kein Risikokapital und keine Werbung. Das Produkt wird über ausgewählte Partnerschaften mit Kulturinstitutionen finanziert, deren Veranstaltungen ohnehin sehenswert sind.',
      ],
    },
    {
      title: 'Wie wir die Plattform sicher halten',
      paragraphs: [
        'Jeder Account durchläuft ein Onboarding mit Profilfoto, Sprachen und Interessen. Meldungen werden binnen 24 Stunden von Menschen geprüft. Organisator:innen mit wiederholten No-Shows oder Beschwerden verlieren die Möglichkeit zu veröffentlichen.',
        'Wir erlauben keinen Inhalt, der Gewalt, Belästigung, Hass, illegale Aktivitäten oder sexuelles Material fördert. Wir erwarten respektvolles Verhalten — online und auf Veranstaltungen.',
      ],
    },
    {
      title: 'Welche Sprachen wir unterstützen',
      paragraphs: [
        'Die Oberfläche ist vollständig auf Englisch, Russisch, Ukrainisch, Tschechisch und Deutsch übersetzt. Eventbeschreibungen bleiben in der Sprache des Organisators; viele redaktionelle Stadtveranstaltungen übersetzt unser Team in alle fünf Sprachen.',
        'Wenn Ihre Community von einer weiteren Sprache profitieren würde, schreiben Sie an info@localisio.com — wir fügen neue Lokalisierungen hinzu, wo es ein reales Publikum gibt.',
      ],
    },
    {
      title: 'So erreichen Sie uns',
      paragraphs: [
        'Presse, Partnerschaften und Medienanfragen: info@localisio.com. Wir antworten in der Regel innerhalb von zwei Werktagen.',
        'Für Produktfeedback öffnen Sie am besten ein konkretes Event, nutzen das Inline-Feedback oder schreiben an dieselbe Adresse mit der URL der betroffenen Seite.',
      ],
    },
  ],
  contactEmail: 'info@localisio.com',
};

const ABOUT: Record<Locale, AboutContent> = {
  en: aboutEn,
  ru: aboutRu,
  uk: aboutUk,
  cs: aboutCs,
  de: aboutDe,
  es: {
    title: 'Sobre Localisio',
    description:
      'Localisio es una plataforma social para comunidades offline. Ayudamos a expatriados y locales a encontrar personas con intereses similares, unirse a eventos acogedores y convertir las ciudades en lugares donde es fácil hacer amigos.',
    introTitle: 'Por qué existe Localisio',
    introBody:
      'Las ciudades están llenas de personas interesantes, pero es difícil encontrarlas. Las plataformas existentes se centran en citas, networking profesional o grandes conciertos a los que vas solo. Construimos Localisio para el espacio intermedio: eventos pequeños, recurrentes y amigables donde puedes llegar solo y salir con nuevos conocidos.',
    sections: [
      {
        title: 'Qué hacemos',
        paragraphs: [
          'Mostramos eventos curados de la ciudad para las ciudades que cubrimos, y facilitamos a los organizadores de comunidades publicar sus propios encuentros, paseos, intercambios de idiomas y clubes.',
          'Los miembros pueden confirmar asistencia, ver quién más va, enviar mensajes a los organizadores, guardar eventos en su calendario personal y seguir grupos recurrentes que coincidan con sus intereses.',
          'Nuestra función Crew te permite crear un pequeño grupo (2–10 personas) para asistir juntos a cualquier evento. Invita amigos con un enlace, coordina en un chat grupal privado y preséntense como equipo.',
        ],
      },
      {
        title: 'Quién construye Localisio',
        paragraphs: [
          'Localisio es gestionado por un pequeño equipo distribuido de expatriados que usan el producto ellos mismos. Estamos basados entre Praga, Berlín y Lisboa, y publicamos actualizaciones casi cada semana.',
          'No tenemos respaldo de capital de riesgo y no mostramos anuncios. El producto se financia mediante asociaciones selectivas con instituciones culturales.',
        ],
      },
      {
        title: 'Cómo mantenemos la plataforma segura',
        paragraphs: [
          'Cada cuenta pasa por un paso de incorporación que solicita foto de perfil, idiomas e intereses. Los reportes son revisados por una persona en un plazo de 24 horas.',
          'No permitimos contenido que promueva violencia, acoso, odio, actividad ilegal o material sexual. Esperamos que los asistentes se comporten respetuosamente tanto en línea como en los eventos.',
        ],
      },
      {
        title: 'Idiomas que soportamos',
        paragraphs: [
          'La interfaz está completamente traducida al inglés, ruso, ucraniano, checo, alemán y español. Las descripciones de eventos se almacenan en el idioma en que el organizador las escribió.',
          'Si tu comunidad se beneficiaría de otro idioma, escríbenos a info@localisio.com.',
        ],
      },
      {
        title: 'Cómo contactarnos',
        paragraphs: [
          'Prensa, asociaciones y consultas de medios: info@localisio.com. Intentamos responder en dos días hábiles.',
          'Para comentarios sobre el producto, la vía más rápida es usar el enlace de feedback en la aplicación o escribir a la misma dirección con la URL de la página en cuestión.',
        ],
      },
    ],
    contactEmail: 'info@localisio.com',
  },
};

export function getAboutContent(locale: Locale): AboutContent {
  return ABOUT[locale] ?? aboutEn;
}
