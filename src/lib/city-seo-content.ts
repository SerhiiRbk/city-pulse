export type CitySeoContent = {
  introText: string;
  faq: { question: string; answer: string }[];
  popularCategories: { label: string; slug: string }[];
};

type CityContent = Record<string, CitySeoContent>;
type ContentMap = Record<string, CityContent>;

const content: ContentMap = {
  prague: {
    ru: {
      introText:
        'Прага — один из самых активных городов для экспатов и местных, которые ищут компанию для мероприятий. Здесь проходят языковые обмены, прогулки по историческому центру, настольные вечера, концерты и фестивали. Localisio помогает найти людей, с которыми можно пойти вместе — создайте компанию или присоединитесь к существующей.',
      faq: [
        {
          question: 'Как найти мероприятия в Праге?',
          answer:
            'Используйте фильтры по категории и дате на этой странице. Также можно открыть карту событий, чтобы увидеть что происходит рядом.',
        },
        {
          question: 'Мероприятия бесплатные?',
          answer:
            'Многие мероприятия бесплатны — используйте фильтр по цене. Для платных событий мы даём ссылку на покупку билета.',
        },
        {
          question: 'Можно ли пойти с компанией?',
          answer:
            'Да! Создайте компанию из 2-10 человек или присоединитесь к существующей. Координируйте встречу в приватном чате.',
        },
      ],
      popularCategories: [
        { label: 'Языковые обмены', slug: 'language-exchange' },
        { label: 'Настольные игры', slug: 'board-games' },
        { label: 'Прогулки', slug: 'walks' },
        { label: 'Концерты', slug: 'concerts' },
        { label: 'Спорт', slug: 'sports' },
        { label: 'Кофе-встречи', slug: 'coffee-meetups' },
      ],
    },
    en: {
      introText:
        "Prague is one of the most active cities for expats and locals looking for company to attend events. From language exchanges and historic walks to board game nights, concerts, and festivals — there's always something happening. Localisio helps you find people to go with — create a crew or join one that's already going.",
      faq: [
        {
          question: 'How do I find events in Prague?',
          answer:
            'Use the category and date filters on this page. You can also open the map view to see what\'s happening nearby.',
        },
        {
          question: 'Are events free?',
          answer:
            'Many events are free — use the price filter. For paid events, we link directly to the ticket page.',
        },
        {
          question: 'Can I go with a group?',
          answer:
            'Yes! Create a crew of 2-10 people or join an existing one. Coordinate in a private group chat.',
        },
      ],
      popularCategories: [
        { label: 'Language exchanges', slug: 'language-exchange' },
        { label: 'Board games', slug: 'board-games' },
        { label: 'Walks', slug: 'walks' },
        { label: 'Concerts', slug: 'concerts' },
        { label: 'Sports', slug: 'sports' },
        { label: 'Coffee meetups', slug: 'coffee-meetups' },
      ],
    },
  },
  brno: {
    ru: {
      introText:
        'Брно — студенческий город с активным IT-сообществом и уютной атмосферой. Здесь легко найти компанию на крафтовые пивные вечера, хакатоны, студенческие вечеринки и культурные мероприятия. Localisio помогает объединяться — создайте компанию или присоединитесь к тем, кто уже идёт.',
      faq: [
        {
          question: 'Какие мероприятия популярны в Брно?',
          answer:
            'Студенческие события, IT-митапы, крафтовые пивные вечера и культурные фестивали. Используйте фильтры, чтобы найти то, что вам интересно.',
        },
        {
          question: 'Как найти IT-мероприятия?',
          answer:
            'Выберите категорию «Технологии» в фильтрах или используйте поиск. Многие митапы проходят в коворкингах и университетах.',
        },
        {
          question: 'Можно ли пойти с компанией?',
          answer:
            'Конечно! Создайте компанию из 2-10 человек или присоединитесь к существующей. Общайтесь в приватном чате перед встречей.',
        },
      ],
      popularCategories: [
        { label: 'IT-митапы', slug: 'tech-meetups' },
        { label: 'Крафтовое пиво', slug: 'craft-beer' },
        { label: 'Студенческие события', slug: 'student-events' },
        { label: 'Настольные игры', slug: 'board-games' },
        { label: 'Языковые обмены', slug: 'language-exchange' },
        { label: 'Концерты', slug: 'concerts' },
      ],
    },
    en: {
      introText:
        'Brno is a vibrant student city with a thriving IT community and a cozy atmosphere. From craft beer nights and hackathons to student parties and cultural festivals — there\'s always a reason to meet up. Localisio helps you find your crew — create one or join people who are already going.',
      faq: [
        {
          question: 'What events are popular in Brno?',
          answer:
            'Student events, IT meetups, craft beer nights, and cultural festivals. Use the filters to find what interests you.',
        },
        {
          question: 'How do I find tech meetups?',
          answer:
            'Select the "Tech" category in the filters or use the search. Many meetups take place in coworking spaces and universities.',
        },
        {
          question: 'Can I go with a group?',
          answer:
            'Absolutely! Create a crew of 2-10 people or join an existing one. Chat privately before you meet up.',
        },
      ],
      popularCategories: [
        { label: 'Tech meetups', slug: 'tech-meetups' },
        { label: 'Craft beer', slug: 'craft-beer' },
        { label: 'Student events', slug: 'student-events' },
        { label: 'Board games', slug: 'board-games' },
        { label: 'Language exchanges', slug: 'language-exchange' },
        { label: 'Concerts', slug: 'concerts' },
      ],
    },
  },
  berlin: {
    ru: {
      introText:
        'Берлин — город с невероятной культурной сценой, где каждый найдёт что-то по душе. Техно-вечеринки, Sprachcafé, арт-галереи, IT-митапы и уличные фестивали — здесь всегда есть куда пойти. Localisio помогает найти компанию для любого события — создайте группу или присоединитесь к существующей.',
      faq: [
        {
          question: 'Как найти мероприятия в Берлине?',
          answer:
            'Используйте фильтры по категории и дате. Откройте карту, чтобы увидеть события в вашем районе — от Кройцберга до Митте.',
        },
        {
          question: 'Есть ли языковые мероприятия?',
          answer:
            'Да! Sprachcafé и языковые тандемы проходят регулярно. Фильтруйте по категории «Языковые обмены» или ищите по ключевым словам.',
        },
        {
          question: 'Можно ли пойти с компанией?',
          answer:
            'Да! Создайте компанию из 2-10 человек или присоединитесь к существующей. Координируйте встречу в приватном чате.',
        },
      ],
      popularCategories: [
        { label: 'IT-митапы', slug: 'tech-meetups' },
        { label: 'Sprachcafé', slug: 'language-exchange' },
        { label: 'Арт-галереи', slug: 'art-galleries' },
        { label: 'Клубная культура', slug: 'nightlife' },
        { label: 'Уличная еда', slug: 'food-meetups' },
        { label: 'Велопрогулки', slug: 'cycling' },
      ],
    },
    en: {
      introText:
        "Berlin's cultural scene is unmatched — from techno nights and Sprachcafé to art galleries, tech meetups, and street festivals. There's always something happening in every Kiez. Localisio helps you find people to go with — create a crew or join one that's already heading out.",
      faq: [
        {
          question: 'How do I find events in Berlin?',
          answer:
            'Use the category and date filters. Open the map to discover events in your neighborhood — from Kreuzberg to Mitte.',
        },
        {
          question: 'Are there language exchange events?',
          answer:
            'Yes! Sprachcafé and language tandems happen regularly. Filter by "Language exchanges" or search by keyword.',
        },
        {
          question: 'Can I go with a group?',
          answer:
            'Yes! Create a crew of 2-10 people or join an existing one. Coordinate in a private group chat.',
        },
      ],
      popularCategories: [
        { label: 'Tech meetups', slug: 'tech-meetups' },
        { label: 'Sprachcafé', slug: 'language-exchange' },
        { label: 'Art galleries', slug: 'art-galleries' },
        { label: 'Club culture', slug: 'nightlife' },
        { label: 'Street food', slug: 'food-meetups' },
        { label: 'Cycling', slug: 'cycling' },
      ],
    },
  },
  vienna: {
    ru: {
      introText:
        'Вена — город классической музыки, музеев мирового уровня и многоязычного сообщества. Здесь проходят концерты, хайкинг-группы, мультиязычные встречи и культурные вечера. Localisio помогает найти компанию — создайте группу или присоединитесь к тем, кто уже идёт.',
      faq: [
        {
          question: 'Какие мероприятия популярны в Вене?',
          answer:
            'Классические концерты, посещение музеев, хайкинг в Венском лесу и мультиязычные встречи. Используйте фильтры для поиска.',
        },
        {
          question: 'Есть ли мероприятия на разных языках?',
          answer:
            'Да! Вена — многоязычный город. Фильтруйте по языку мероприятия, чтобы найти встречи на немецком, английском или других языках.',
        },
        {
          question: 'Можно ли пойти с компанией?',
          answer:
            'Конечно! Создайте компанию из 2-10 человек или присоединитесь к существующей. Общайтесь в приватном чате.',
        },
      ],
      popularCategories: [
        { label: 'Классическая музыка', slug: 'classical-music' },
        { label: 'Музеи', slug: 'museums' },
        { label: 'Хайкинг', slug: 'hiking' },
        { label: 'Мультиязычные встречи', slug: 'language-exchange' },
        { label: 'Кофейни', slug: 'coffee-meetups' },
        { label: 'Концерты', slug: 'concerts' },
      ],
    },
    en: {
      introText:
        "Vienna is a city of classical music, world-class museums, and a thriving multilingual community. From concerts and hiking groups to multilingual meetups and cultural evenings — there's always something to experience. Localisio helps you find people to go with — create a crew or join one.",
      faq: [
        {
          question: 'What events are popular in Vienna?',
          answer:
            'Classical concerts, museum visits, hiking in the Vienna Woods, and multilingual meetups. Use the filters to find your match.',
        },
        {
          question: 'Are there events in different languages?',
          answer:
            'Yes! Vienna is a multilingual city. Filter by event language to find meetups in German, English, or other languages.',
        },
        {
          question: 'Can I go with a group?',
          answer:
            'Of course! Create a crew of 2-10 people or join an existing one. Coordinate in a private chat.',
        },
      ],
      popularCategories: [
        { label: 'Classical music', slug: 'classical-music' },
        { label: 'Museums', slug: 'museums' },
        { label: 'Hiking', slug: 'hiking' },
        { label: 'Multilingual meetups', slug: 'language-exchange' },
        { label: 'Coffee culture', slug: 'coffee-meetups' },
        { label: 'Concerts', slug: 'concerts' },
      ],
    },
  },
  barcelona: {
    ru: {
      introText:
        'Барселона — город солнца, пляжей и яркой социальной жизни. Языковые тандемы, пляжный волейбол, тапас-встречи, концерты под открытым небом и арт-события — здесь всегда есть компания. Localisio помогает найти людей для совместных мероприятий — создайте группу или присоединитесь.',
      faq: [
        {
          question: 'Какие мероприятия популярны в Барселоне?',
          answer:
            'Пляжные активности, языковые тандемы, тапас-встречи и концерты. Используйте фильтры по категории и дате.',
        },
        {
          question: 'Есть ли бесплатные мероприятия?',
          answer:
            'Да, многие события бесплатны — особенно пляжные встречи и языковые обмены. Используйте фильтр по цене.',
        },
        {
          question: 'Можно ли пойти с компанией?',
          answer:
            'Да! Создайте компанию из 2-10 человек или присоединитесь к существующей. Координируйте встречу в приватном чате.',
        },
      ],
      popularCategories: [
        { label: 'Пляжные активности', slug: 'beach-activities' },
        { label: 'Языковые тандемы', slug: 'language-exchange' },
        { label: 'Тапас-встречи', slug: 'food-meetups' },
        { label: 'Концерты', slug: 'concerts' },
        { label: 'Йога', slug: 'yoga' },
        { label: 'Арт-события', slug: 'art-galleries' },
      ],
    },
    en: {
      introText:
        "Barcelona is a city of sun, beaches, and vibrant social life. Language tandems, beach volleyball, tapas meetups, open-air concerts, and art events — there's always a crew forming. Localisio helps you find people to go with — create a group or join one.",
      faq: [
        {
          question: 'What events are popular in Barcelona?',
          answer:
            'Beach activities, language tandems, tapas meetups, and concerts. Use the category and date filters to explore.',
        },
        {
          question: 'Are there free events?',
          answer:
            'Yes, many events are free — especially beach meetups and language exchanges. Use the price filter.',
        },
        {
          question: 'Can I go with a group?',
          answer:
            'Yes! Create a crew of 2-10 people or join an existing one. Coordinate in a private group chat.',
        },
      ],
      popularCategories: [
        { label: 'Beach activities', slug: 'beach-activities' },
        { label: 'Language tandems', slug: 'language-exchange' },
        { label: 'Tapas meetups', slug: 'food-meetups' },
        { label: 'Concerts', slug: 'concerts' },
        { label: 'Yoga', slug: 'yoga' },
        { label: 'Art events', slug: 'art-galleries' },
      ],
    },
  },
};

function getGenericContent(cityName: string, locale: string): CitySeoContent {
  if (locale === 'ru') {
    return {
      introText: `${cityName} — отличное место для поиска компании на мероприятия. Концерты, выставки, языковые обмены, прогулки и многое другое — Localisio помогает найти людей, с которыми можно пойти вместе.`,
      faq: [
        {
          question: `Как найти мероприятия в городе ${cityName}?`,
          answer:
            'Используйте фильтры по категории и дате на этой странице. Также можно открыть карту событий, чтобы увидеть что происходит рядом.',
        },
        {
          question: 'Мероприятия бесплатные?',
          answer:
            'Многие мероприятия бесплатны — используйте фильтр по цене. Для платных событий мы даём ссылку на покупку билета.',
        },
        {
          question: 'Можно ли пойти с компанией?',
          answer:
            'Да! Создайте компанию из 2-10 человек или присоединитесь к существующей. Координируйте встречу в приватном чате.',
        },
      ],
      popularCategories: [
        { label: 'Языковые обмены', slug: 'language-exchange' },
        { label: 'Концерты', slug: 'concerts' },
        { label: 'Прогулки', slug: 'walks' },
        { label: 'Настольные игры', slug: 'board-games' },
        { label: 'Спорт', slug: 'sports' },
      ],
    };
  }

  return {
    introText: `${cityName} is a great place to find company for events. Concerts, exhibitions, language exchanges, walks, and more — Localisio helps you find people to go with.`,
    faq: [
      {
        question: `How do I find events in ${cityName}?`,
        answer:
          'Use the category and date filters on this page. You can also open the map view to see what\'s happening nearby.',
      },
      {
        question: 'Are events free?',
        answer:
          'Many events are free — use the price filter. For paid events, we link directly to the ticket page.',
      },
      {
        question: 'Can I go with a group?',
        answer:
          'Yes! Create a crew of 2-10 people or join an existing one. Coordinate in a private group chat.',
      },
    ],
    popularCategories: [
      { label: 'Language exchanges', slug: 'language-exchange' },
      { label: 'Concerts', slug: 'concerts' },
      { label: 'Walks', slug: 'walks' },
      { label: 'Board games', slug: 'board-games' },
      { label: 'Sports', slug: 'sports' },
    ],
  };
}

/**
 * Returns localized SEO content blocks for a city events page.
 * Falls back to generic templated content for cities/locales without specific copy.
 */
export function getCitySeoContent(citySlug: string, locale: string): CitySeoContent {
  const normalizedSlug = citySlug.toLowerCase().replace(/\s+/g, '-');
  const cityData = content[normalizedSlug];

  if (cityData) {
    // Try exact locale, then fall back to English, then generic
    if (cityData[locale]) return cityData[locale];
    if (cityData.en) return cityData.en;
  }

  // Build a readable city name from the slug for generic content
  const cityName = normalizedSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return getGenericContent(cityName, locale);
}
