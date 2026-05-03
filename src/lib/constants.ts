export const SITE_NAME = 'Localisio';
export const SITE_DESCRIPTION = 'Social platform for offline communities of expats and locals';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localisio.com';

export const MAX_BIO_LENGTH = 500;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_EVENT_PHOTOS = 5;
export const MAX_EVENTS_PER_DAY_NEW_USER = 3;

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const INTEREST_CATEGORIES = [
  { id: 'social', en: 'Social & Networking', ru: 'Общение и нетворкинг', uk: 'Спілкування та нетворкінг', cs: 'Sociální aktivity', de: 'Soziales & Networking' },
  { id: 'sports', en: 'Sports & Outdoors', ru: 'Спорт и активный отдых', uk: 'Спорт та активний відпочинок', cs: 'Sport & outdoor', de: 'Sport & Outdoor' },
  { id: 'arts', en: 'Arts & Culture', ru: 'Искусство и культура', uk: 'Мистецтво та культура', cs: 'Umění a kultura', de: 'Kunst & Kultur' },
  { id: 'tech', en: 'Technology', ru: 'Технологии', uk: 'Технології', cs: 'Technologie', de: 'Technologie' },
  { id: 'food', en: 'Food & Drink', ru: 'Еда и напитки', uk: 'Їжа та напої', cs: 'Jídlo a pití', de: 'Essen & Trinken' },
  { id: 'games', en: 'Games & Entertainment', ru: 'Игры и развлечения', uk: 'Ігри та розваги', cs: 'Hry a zábava', de: 'Spiele & Unterhaltung' },
  { id: 'lifestyle', en: 'Lifestyle', ru: 'Образ жизни', uk: 'Спосіб життя', cs: 'Životní styl', de: 'Lebensstil' },
  { id: 'education', en: 'Education & Science', ru: 'Образование и наука', uk: 'Освіта та наука', cs: 'Vzdělávání a věda', de: 'Bildung & Wissenschaft' },
  { id: 'other', en: 'Other', ru: 'Другое', uk: 'Інше', cs: 'Ostatní', de: 'Sonstiges' },
] as const;

export const INTEREST_META: Record<string, { icon: string; category: string }> = {
  // Social & Networking
  'language-exchange': { icon: '🗣️', category: 'social' },
  'networking':        { icon: '🤝', category: 'social' },
  'expat-meetup':      { icon: '🌍', category: 'social' },
  'book-club':         { icon: '📚', category: 'social' },
  'coworking':         { icon: '💻', category: 'social' },

  // Sports & Outdoors
  'hiking':            { icon: '🥾', category: 'sports' },
  'running':           { icon: '🏃', category: 'sports' },
  'cycling':           { icon: '🚴', category: 'sports' },
  'yoga':              { icon: '🧘', category: 'sports' },
  'fitness':           { icon: '💪', category: 'sports' },
  'swimming':          { icon: '🏊', category: 'sports' },
  'climbing':          { icon: '🧗', category: 'sports' },
  'tennis':            { icon: '🎾', category: 'sports' },
  'football':          { icon: '⚽', category: 'sports' },
  'basketball':        { icon: '🏀', category: 'sports' },
  'volleyball':        { icon: '🏐', category: 'sports' },
  'skiing':            { icon: '⛷️', category: 'sports' },
  'skateboarding':     { icon: '🛹', category: 'sports' },
  'martial-arts':      { icon: '🥋', category: 'sports' },
  'dancing':           { icon: '💃', category: 'sports' },
  'yachting':          { icon: '⛵', category: 'sports' },

  // Arts & Culture
  'photography':       { icon: '📷', category: 'arts' },
  'painting':          { icon: '🎨', category: 'arts' },
  'music':             { icon: '🎵', category: 'arts' },
  'theater':           { icon: '🎭', category: 'arts' },
  'cinema':            { icon: '🎬', category: 'arts' },
  'museums':           { icon: '🏛️', category: 'arts' },
  'writing':           { icon: '✍️', category: 'arts' },
  'crafts':            { icon: '🧶', category: 'arts' },
  'calligraphy':       { icon: '🖋️', category: 'arts' },
  'japanese-culture':  { icon: '🏯', category: 'arts' },
  'anime':             { icon: '🎌', category: 'arts' },

  // Technology
  'programming':       { icon: '👨‍💻', category: 'tech' },
  'startups':          { icon: '🚀', category: 'tech' },
  'ai-ml':             { icon: '🤖', category: 'tech' },
  'web-development':   { icon: '🌐', category: 'tech' },
  'gamedev':           { icon: '🎮', category: 'tech' },
  'crypto':            { icon: '₿', category: 'tech' },

  // Food & Drink
  'cooking':           { icon: '👨‍🍳', category: 'food' },
  'wine-tasting':      { icon: '🍷', category: 'food' },
  'craft-beer':        { icon: '🍺', category: 'food' },
  'coffee':            { icon: '☕', category: 'food' },
  'vegan':             { icon: '🥗', category: 'food' },
  'food-tours':        { icon: '🍽️', category: 'food' },
  'tea-ceremony':      { icon: '🍵', category: 'food' },

  // Games & Entertainment
  'board-games':       { icon: '🎲', category: 'games' },
  'video-games':       { icon: '🕹️', category: 'games' },
  'trivia':            { icon: '❓', category: 'games' },
  'escape-rooms':      { icon: '🔐', category: 'games' },
  'karaoke':           { icon: '🎤', category: 'games' },
  'standup':           { icon: '😂', category: 'games' },

  // Lifestyle
  'travel':            { icon: '✈️', category: 'lifestyle' },
  'travel-adventures': { icon: '🧭', category: 'lifestyle' },
  'meditation':        { icon: '🧘‍♂️', category: 'lifestyle' },
  'volunteering':      { icon: '🤲', category: 'lifestyle' },
  'sustainability':    { icon: '♻️', category: 'lifestyle' },
  'parenting':         { icon: '👶', category: 'lifestyle' },
  'pets':              { icon: '🐾', category: 'lifestyle' },
  'fashion':           { icon: '👗', category: 'lifestyle' },
  'cars':              { icon: '🚗', category: 'lifestyle' },
  'gardening':         { icon: '🌱', category: 'lifestyle' },

  // Education & Science
  'languages':         { icon: '🗺️', category: 'education' },
  'science':           { icon: '🔬', category: 'education' },
  'history':           { icon: '🏰', category: 'education' },
  'history-deep':      { icon: '📜', category: 'education' },
  'philosophy':        { icon: '💭', category: 'education' },
  'psychology':        { icon: '🧠', category: 'education' },
  'guided-tours':      { icon: '🗺️', category: 'education' },
  'historical-reenactment': { icon: '⚔️', category: 'education' },

  // Other
  'astronomy':         { icon: '🔭', category: 'other' },
  'other':             { icon: '💡', category: 'other' },
};

export const COUNTRIES = [
  { code: 'CZ', en: 'Czech Republic', ru: 'Чехия', uk: 'Чехія', cs: 'Česko', de: 'Tschechien' },
  { code: 'DE', en: 'Germany', ru: 'Германия', uk: 'Німеччина', cs: 'Německo', de: 'Deutschland' },
  { code: 'AT', en: 'Austria', ru: 'Австрия', uk: 'Австрія', cs: 'Rakousko', de: 'Österreich' },
  { code: 'CH', en: 'Switzerland', ru: 'Швейцария', uk: 'Швейцарія', cs: 'Švýcarsko', de: 'Schweiz' },
  { code: 'PL', en: 'Poland', ru: 'Польша', uk: 'Польща', cs: 'Polsko', de: 'Polen' },
  { code: 'SK', en: 'Slovakia', ru: 'Словакия', uk: 'Словаччина', cs: 'Slovensko', de: 'Slowakei' },
  { code: 'NL', en: 'Netherlands', ru: 'Нидерланды', uk: 'Нідерланди', cs: 'Nizozemsko', de: 'Niederlande' },
  { code: 'BE', en: 'Belgium', ru: 'Бельгия', uk: 'Бельгія', cs: 'Belgie', de: 'Belgien' },
  { code: 'FR', en: 'France', ru: 'Франция', uk: 'Франція', cs: 'Francie', de: 'Frankreich' },
  { code: 'ES', en: 'Spain', ru: 'Испания', uk: 'Іспанія', cs: 'Španělsko', de: 'Spanien' },
  { code: 'PT', en: 'Portugal', ru: 'Португалия', uk: 'Португалія', cs: 'Portugalsko', de: 'Portugal' },
  { code: 'IT', en: 'Italy', ru: 'Италия', uk: 'Італія', cs: 'Itálie', de: 'Italien' },
  { code: 'GB', en: 'United Kingdom', ru: 'Великобритания', uk: 'Великобританія', cs: 'Spojené království', de: 'Vereinigtes Königreich' },
  { code: 'IE', en: 'Ireland', ru: 'Ирландия', uk: 'Ірландія', cs: 'Irsko', de: 'Irland' },
  { code: 'SE', en: 'Sweden', ru: 'Швеция', uk: 'Швеція', cs: 'Švédsko', de: 'Schweden' },
  { code: 'NO', en: 'Norway', ru: 'Норвегия', uk: 'Норвегія', cs: 'Norsko', de: 'Norwegen' },
  { code: 'DK', en: 'Denmark', ru: 'Дания', uk: 'Данія', cs: 'Dánsko', de: 'Dänemark' },
  { code: 'FI', en: 'Finland', ru: 'Финляндия', uk: 'Фінляндія', cs: 'Finsko', de: 'Finnland' },
  { code: 'US', en: 'United States', ru: 'США', uk: 'США', cs: 'USA', de: 'USA' },
  { code: 'CA', en: 'Canada', ru: 'Канада', uk: 'Канада', cs: 'Kanada', de: 'Kanada' },
  { code: 'AU', en: 'Australia', ru: 'Австралия', uk: 'Австралія', cs: 'Austrálie', de: 'Australien' },
  { code: 'JP', en: 'Japan', ru: 'Япония', uk: 'Японія', cs: 'Japonsko', de: 'Japan' },
  { code: 'KR', en: 'South Korea', ru: 'Южная Корея', uk: 'Південна Корея', cs: 'Jižní Korea', de: 'Südkorea' },
  { code: 'TR', en: 'Turkey', ru: 'Турция', uk: 'Туреччина', cs: 'Turecko', de: 'Türkei' },
  { code: 'UA', en: 'Ukraine', ru: 'Украина', uk: 'Україна', cs: 'Ukrajina', de: 'Ukraine' },
  { code: 'RU', en: 'Russia', ru: 'Россия', uk: 'Росія', cs: 'Rusko', de: 'Russland' },
  { code: 'BY', en: 'Belarus', ru: 'Беларусь', uk: 'Білорусь', cs: 'Bělorusko', de: 'Belarus' },
  { code: 'KZ', en: 'Kazakhstan', ru: 'Казахстан', uk: 'Казахстан', cs: 'Kazachstán', de: 'Kasachstan' },
  { code: 'GE', en: 'Georgia', ru: 'Грузия', uk: 'Грузія', cs: 'Gruzie', de: 'Georgien' },
  { code: 'AM', en: 'Armenia', ru: 'Армения', uk: 'Вірменія', cs: 'Arménie', de: 'Armenien' },
  { code: 'IL', en: 'Israel', ru: 'Израиль', uk: 'Ізраїль', cs: 'Izrael', de: 'Israel' },
  { code: 'AE', en: 'UAE', ru: 'ОАЭ', uk: 'ОАЕ', cs: 'SAE', de: 'VAE' },
  { code: 'TH', en: 'Thailand', ru: 'Таиланд', uk: 'Таїланд', cs: 'Thajsko', de: 'Thailand' },
  { code: 'BR', en: 'Brazil', ru: 'Бразилия', uk: 'Бразилія', cs: 'Brazílie', de: 'Brasilien' },
  { code: 'MX', en: 'Mexico', ru: 'Мексика', uk: 'Мексика', cs: 'Mexiko', de: 'Mexiko' },
  { code: 'AR', en: 'Argentina', ru: 'Аргентина', uk: 'Аргентина', cs: 'Argentina', de: 'Argentinien' },
  { code: 'IN', en: 'India', ru: 'Индия', uk: 'Індія', cs: 'Indie', de: 'Indien' },
  { code: 'CN', en: 'China', ru: 'Китай', uk: 'Китай', cs: 'Čína', de: 'China' },
  { code: 'HU', en: 'Hungary', ru: 'Венгрия', uk: 'Угорщина', cs: 'Maďarsko', de: 'Ungarn' },
  { code: 'RO', en: 'Romania', ru: 'Румыния', uk: 'Румунія', cs: 'Rumunsko', de: 'Rumänien' },
  { code: 'BG', en: 'Bulgaria', ru: 'Болгария', uk: 'Болгарія', cs: 'Bulharsko', de: 'Bulgarien' },
  { code: 'HR', en: 'Croatia', ru: 'Хорватия', uk: 'Хорватія', cs: 'Chorvatsko', de: 'Kroatien' },
  { code: 'RS', en: 'Serbia', ru: 'Сербия', uk: 'Сербія', cs: 'Srbsko', de: 'Serbien' },
  { code: 'GR', en: 'Greece', ru: 'Греция', uk: 'Греція', cs: 'Řecko', de: 'Griechenland' },
  { code: 'CY', en: 'Cyprus', ru: 'Кипр', uk: 'Кіпр', cs: 'Kypr', de: 'Zypern' },
  { code: 'EE', en: 'Estonia', ru: 'Эстония', uk: 'Естонія', cs: 'Estonsko', de: 'Estland' },
  { code: 'LV', en: 'Latvia', ru: 'Латвия', uk: 'Латвія', cs: 'Lotyšsko', de: 'Lettland' },
  { code: 'LT', en: 'Lithuania', ru: 'Литва', uk: 'Литва', cs: 'Litva', de: 'Litauen' },
] as const;

export const LANGUAGES = [
  { code: 'en', flag: 'GB', en: 'English', ru: 'Английский', uk: 'Англійська', cs: 'Angličtina', de: 'Englisch' },
  { code: 'ru', flag: 'RU', en: 'Russian', ru: 'Русский', uk: 'Російська', cs: 'Ruština', de: 'Russisch' },
  { code: 'uk', flag: 'UA', en: 'Ukrainian', ru: 'Украинский', uk: 'Українська', cs: 'Ukrajinština', de: 'Ukrainisch' },
  { code: 'cs', flag: 'CZ', en: 'Czech', ru: 'Чешский', uk: 'Чеська', cs: 'Čeština', de: 'Tschechisch' },
  { code: 'de', flag: 'DE', en: 'German', ru: 'Немецкий', uk: 'Німецька', cs: 'Němčina', de: 'Deutsch' },
  { code: 'fr', flag: 'FR', en: 'French', ru: 'Французский', uk: 'Французька', cs: 'Francouzština', de: 'Französisch' },
  { code: 'es', flag: 'ES', en: 'Spanish', ru: 'Испанский', uk: 'Іспанська', cs: 'Španělština', de: 'Spanisch' },
  { code: 'pt', flag: 'PT', en: 'Portuguese', ru: 'Португальский', uk: 'Португальська', cs: 'Portugalština', de: 'Portugiesisch' },
  { code: 'it', flag: 'IT', en: 'Italian', ru: 'Итальянский', uk: 'Італійська', cs: 'Italština', de: 'Italienisch' },
  { code: 'nl', flag: 'NL', en: 'Dutch', ru: 'Нидерландский', uk: 'Нідерландська', cs: 'Holandština', de: 'Niederländisch' },
  { code: 'pl', flag: 'PL', en: 'Polish', ru: 'Польский', uk: 'Польська', cs: 'Polština', de: 'Polnisch' },
  { code: 'sk', flag: 'SK', en: 'Slovak', ru: 'Словацкий', uk: 'Словацька', cs: 'Slovenština', de: 'Slowakisch' },
  { code: 'hu', flag: 'HU', en: 'Hungarian', ru: 'Венгерский', uk: 'Угорська', cs: 'Maďarština', de: 'Ungarisch' },
  { code: 'ro', flag: 'RO', en: 'Romanian', ru: 'Румынский', uk: 'Румунська', cs: 'Rumunština', de: 'Rumänisch' },
  { code: 'bg', flag: 'BG', en: 'Bulgarian', ru: 'Болгарский', uk: 'Болгарська', cs: 'Bulharština', de: 'Bulgarisch' },
  { code: 'hr', flag: 'HR', en: 'Croatian', ru: 'Хорватский', uk: 'Хорватська', cs: 'Chorvatština', de: 'Kroatisch' },
  { code: 'sr', flag: 'RS', en: 'Serbian', ru: 'Сербский', uk: 'Сербська', cs: 'Srbština', de: 'Serbisch' },
  { code: 'sv', flag: 'SE', en: 'Swedish', ru: 'Шведский', uk: 'Шведська', cs: 'Švédština', de: 'Schwedisch' },
  { code: 'no', flag: 'NO', en: 'Norwegian', ru: 'Норвежский', uk: 'Норвезька', cs: 'Norština', de: 'Norwegisch' },
  { code: 'da', flag: 'DK', en: 'Danish', ru: 'Датский', uk: 'Данська', cs: 'Dánština', de: 'Dänisch' },
  { code: 'fi', flag: 'FI', en: 'Finnish', ru: 'Финский', uk: 'Фінська', cs: 'Finština', de: 'Finnisch' },
  { code: 'el', flag: 'GR', en: 'Greek', ru: 'Греческий', uk: 'Грецька', cs: 'Řečtina', de: 'Griechisch' },
  { code: 'tr', flag: 'TR', en: 'Turkish', ru: 'Турецкий', uk: 'Турецька', cs: 'Turečtina', de: 'Türkisch' },
  { code: 'ja', flag: 'JP', en: 'Japanese', ru: 'Японский', uk: 'Японська', cs: 'Japonština', de: 'Japanisch' },
  { code: 'ko', flag: 'KR', en: 'Korean', ru: 'Корейский', uk: 'Корейська', cs: 'Korejština', de: 'Koreanisch' },
  { code: 'zh', flag: 'CN', en: 'Chinese', ru: 'Китайский', uk: 'Китайська', cs: 'Čínština', de: 'Chinesisch' },
  { code: 'ar', flag: 'SA', en: 'Arabic', ru: 'Арабский', uk: 'Арабська', cs: 'Arabština', de: 'Arabisch' },
  { code: 'hi', flag: 'IN', en: 'Hindi', ru: 'Хинди', uk: 'Гінді', cs: 'Hindština', de: 'Hindi' },
  { code: 'he', flag: 'IL', en: 'Hebrew', ru: 'Иврит', uk: 'Іврит', cs: 'Hebrejština', de: 'Hebräisch' },
  { code: 'ka', flag: 'GE', en: 'Georgian', ru: 'Грузинский', uk: 'Грузинська', cs: 'Gruzínština', de: 'Georgisch' },
  { code: 'hy', flag: 'AM', en: 'Armenian', ru: 'Армянский', uk: 'Вірменська', cs: 'Arménština', de: 'Armenisch' },
  { code: 'kk', flag: 'KZ', en: 'Kazakh', ru: 'Казахский', uk: 'Казахська', cs: 'Kazaština', de: 'Kasachisch' },
  { code: 'be', flag: 'BY', en: 'Belarusian', ru: 'Белорусский', uk: 'Білоруська', cs: 'Běloruština', de: 'Belarussisch' },
  { code: 'th', flag: 'TH', en: 'Thai', ru: 'Тайский', uk: 'Тайська', cs: 'Thajština', de: 'Thailändisch' },
] as const;
