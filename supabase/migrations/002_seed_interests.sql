-- ============================================================
-- City-Pulse: Seed Interests Data
-- Run this after 001_initial_schema.sql
-- ============================================================

insert into public.interests (slug, translations) values
  -- Social & Networking
  ('language-exchange', '{"en": "Language Exchange", "ru": "Языковой обмен", "uk": "Мовний обмін", "cs": "Jazyková výměna", "de": "Sprachaustausch"}'),
  ('networking', '{"en": "Networking", "ru": "Нетворкинг", "uk": "Нетворкінг", "cs": "Networking", "de": "Networking"}'),
  ('expat-meetup', '{"en": "Expat Meetup", "ru": "Встреча экспатов", "uk": "Зустріч експатів", "cs": "Setkání expatů", "de": "Expat-Treffen"}'),
  ('book-club', '{"en": "Book Club", "ru": "Книжный клуб", "uk": "Книжковий клуб", "cs": "Knižní klub", "de": "Buchclub"}'),
  ('coworking', '{"en": "Coworking", "ru": "Коворкинг", "uk": "Коворкінг", "cs": "Coworking", "de": "Coworking"}'),

  -- Sports & Outdoors
  ('hiking', '{"en": "Hiking", "ru": "Пешие прогулки", "uk": "Піші прогулянки", "cs": "Turistika", "de": "Wandern"}'),
  ('running', '{"en": "Running", "ru": "Бег", "uk": "Біг", "cs": "Běhání", "de": "Laufen"}'),
  ('cycling', '{"en": "Cycling", "ru": "Велоспорт", "uk": "Велоспорт", "cs": "Cyklistika", "de": "Radfahren"}'),
  ('yoga', '{"en": "Yoga", "ru": "Йога", "uk": "Йога", "cs": "Jóga", "de": "Yoga"}'),
  ('fitness', '{"en": "Fitness", "ru": "Фитнес", "uk": "Фітнес", "cs": "Fitness", "de": "Fitness"}'),
  ('swimming', '{"en": "Swimming", "ru": "Плавание", "uk": "Плавання", "cs": "Plavání", "de": "Schwimmen"}'),
  ('climbing', '{"en": "Climbing", "ru": "Скалолазание", "uk": "Скелелазіння", "cs": "Lezení", "de": "Klettern"}'),
  ('tennis', '{"en": "Tennis", "ru": "Теннис", "uk": "Теніс", "cs": "Tenis", "de": "Tennis"}'),
  ('football', '{"en": "Football", "ru": "Футбол", "uk": "Футбол", "cs": "Fotbal", "de": "Fußball"}'),
  ('basketball', '{"en": "Basketball", "ru": "Баскетбол", "uk": "Баскетбол", "cs": "Basketbal", "de": "Basketball"}'),
  ('volleyball', '{"en": "Volleyball", "ru": "Волейбол", "uk": "Волейбол", "cs": "Volejbal", "de": "Volleyball"}'),
  ('skiing', '{"en": "Skiing", "ru": "Лыжи", "uk": "Лижі", "cs": "Lyžování", "de": "Skifahren"}'),
  ('skateboarding', '{"en": "Skateboarding", "ru": "Скейтборд", "uk": "Скейтборд", "cs": "Skateboarding", "de": "Skateboarding"}'),
  ('martial-arts', '{"en": "Martial Arts", "ru": "Боевые искусства", "uk": "Бойові мистецтва", "cs": "Bojová umění", "de": "Kampfsport"}'),
  ('dancing', '{"en": "Dancing", "ru": "Танцы", "uk": "Танці", "cs": "Tanec", "de": "Tanzen"}'),

  -- Arts & Culture
  ('photography', '{"en": "Photography", "ru": "Фотография", "uk": "Фотографія", "cs": "Fotografie", "de": "Fotografie"}'),
  ('painting', '{"en": "Painting & Drawing", "ru": "Рисование", "uk": "Малювання", "cs": "Malování", "de": "Malen & Zeichnen"}'),
  ('music', '{"en": "Music", "ru": "Музыка", "uk": "Музика", "cs": "Hudba", "de": "Musik"}'),
  ('theater', '{"en": "Theater", "ru": "Театр", "uk": "Театр", "cs": "Divadlo", "de": "Theater"}'),
  ('cinema', '{"en": "Cinema", "ru": "Кино", "uk": "Кіно", "cs": "Kino", "de": "Kino"}'),
  ('museums', '{"en": "Museums & Galleries", "ru": "Музеи и галереи", "uk": "Музеї та галереї", "cs": "Muzea a galerie", "de": "Museen & Galerien"}'),
  ('writing', '{"en": "Creative Writing", "ru": "Писательство", "uk": "Писання", "cs": "Tvůrčí psaní", "de": "Kreatives Schreiben"}'),
  ('crafts', '{"en": "Crafts & DIY", "ru": "Рукоделие", "uk": "Рукоділля", "cs": "Ruční práce", "de": "Handwerk & DIY"}'),

  -- Technology
  ('programming', '{"en": "Programming", "ru": "Программирование", "uk": "Програмування", "cs": "Programování", "de": "Programmierung"}'),
  ('startups', '{"en": "Startups", "ru": "Стартапы", "uk": "Стартапи", "cs": "Startupy", "de": "Startups"}'),
  ('ai-ml', '{"en": "AI & Machine Learning", "ru": "ИИ и машинное обучение", "uk": "ШІ та машинне навчання", "cs": "AI & strojové učení", "de": "KI & Machine Learning"}'),
  ('web-development', '{"en": "Web Development", "ru": "Веб-разработка", "uk": "Веб-розробка", "cs": "Webový vývoj", "de": "Webentwicklung"}'),
  ('gamedev', '{"en": "Game Development", "ru": "Геймдев", "uk": "Геймдев", "cs": "Vývoj her", "de": "Spieleentwicklung"}'),
  ('crypto', '{"en": "Crypto & Web3", "ru": "Крипто и Web3", "uk": "Крипто та Web3", "cs": "Krypto & Web3", "de": "Krypto & Web3"}'),

  -- Food & Drink
  ('cooking', '{"en": "Cooking", "ru": "Кулинария", "uk": "Кулінарія", "cs": "Vaření", "de": "Kochen"}'),
  ('wine-tasting', '{"en": "Wine Tasting", "ru": "Дегустация вин", "uk": "Дегустація вин", "cs": "Degustace vína", "de": "Weinverkostung"}'),
  ('craft-beer', '{"en": "Craft Beer", "ru": "Крафтовое пиво", "uk": "Крафтове пиво", "cs": "Řemeslné pivo", "de": "Craft Beer"}'),
  ('coffee', '{"en": "Coffee Culture", "ru": "Кофейная культура", "uk": "Кавова культура", "cs": "Kávová kultura", "de": "Kaffeekultur"}'),
  ('vegan', '{"en": "Vegan & Plant-based", "ru": "Веган", "uk": "Веган", "cs": "Veganství", "de": "Vegan"}'),
  ('food-tours', '{"en": "Food Tours", "ru": "Гастрономические туры", "uk": "Гастрономічні тури", "cs": "Food tours", "de": "Food-Touren"}'),

  -- Games & Entertainment
  ('board-games', '{"en": "Board Games", "ru": "Настольные игры", "uk": "Настільні ігри", "cs": "Deskové hry", "de": "Brettspiele"}'),
  ('video-games', '{"en": "Video Games", "ru": "Видеоигры", "uk": "Відеоігри", "cs": "Videohry", "de": "Videospiele"}'),
  ('trivia', '{"en": "Trivia & Quiz", "ru": "Квизы", "uk": "Квізи", "cs": "Kvízy", "de": "Quiz & Trivia"}'),
  ('escape-rooms', '{"en": "Escape Rooms", "ru": "Квест-комнаты", "uk": "Квест-кімнати", "cs": "Únikové hry", "de": "Escape Rooms"}'),
  ('karaoke', '{"en": "Karaoke", "ru": "Караоке", "uk": "Караоке", "cs": "Karaoke", "de": "Karaoke"}'),

  -- Lifestyle
  ('travel', '{"en": "Travel", "ru": "Путешествия", "uk": "Подорожі", "cs": "Cestování", "de": "Reisen"}'),
  ('meditation', '{"en": "Meditation & Mindfulness", "ru": "Медитация", "uk": "Медитація", "cs": "Meditace", "de": "Meditation"}'),
  ('volunteering', '{"en": "Volunteering", "ru": "Волонтерство", "uk": "Волонтерство", "cs": "Dobrovolnictví", "de": "Freiwilligenarbeit"}'),
  ('sustainability', '{"en": "Sustainability & Ecology", "ru": "Экология", "uk": "Екологія", "cs": "Udržitelnost", "de": "Nachhaltigkeit"}'),
  ('parenting', '{"en": "Parenting", "ru": "Родительство", "uk": "Батьківство", "cs": "Rodičovství", "de": "Elternschaft"}'),
  ('pets', '{"en": "Pets & Animals", "ru": "Домашние животные", "uk": "Домашні тварини", "cs": "Domácí mazlíčci", "de": "Haustiere"}'),
  ('fashion', '{"en": "Fashion & Style", "ru": "Мода и стиль", "uk": "Мода та стиль", "cs": "Móda a styl", "de": "Mode & Stil"}'),

  -- Education
  ('languages', '{"en": "Learning Languages", "ru": "Изучение языков", "uk": "Вивчення мов", "cs": "Studium jazyků", "de": "Sprachen lernen"}'),
  ('science', '{"en": "Science & Education", "ru": "Наука и образование", "uk": "Наука та освіта", "cs": "Věda a vzdělávání", "de": "Wissenschaft & Bildung"}'),
  ('history', '{"en": "History & Architecture", "ru": "История и архитектура", "uk": "Історія та архітектура", "cs": "Historie a architektura", "de": "Geschichte & Architektur"}'),
  ('philosophy', '{"en": "Philosophy & Discussions", "ru": "Философия и дискуссии", "uk": "Філософія та дискусії", "cs": "Filozofie a diskuse", "de": "Philosophie & Diskussionen"}'),

  -- Other
  ('standup', '{"en": "Stand-up Comedy", "ru": "Стендап-комедия", "uk": "Стендап-комедія", "cs": "Stand-up komedie", "de": "Stand-up Comedy"}'),
  ('astronomy', '{"en": "Astronomy", "ru": "Астрономия", "uk": "Астрономія", "cs": "Astronomie", "de": "Astronomie"}'),
  ('gardening', '{"en": "Gardening", "ru": "Садоводство", "uk": "Садівництво", "cs": "Zahradnictví", "de": "Gärtnern"}'),
  ('other', '{"en": "Other", "ru": "Другое", "uk": "Інше", "cs": "Ostatní", "de": "Sonstiges"}'),

  -- Additional interests
  ('psychology', '{"en": "Psychology", "ru": "Психология", "uk": "Психологія", "cs": "Psychologie", "de": "Psychologie"}'),
  ('calligraphy', '{"en": "Calligraphy", "ru": "Каллиграфия", "uk": "Каліграфія", "cs": "Kaligrafie", "de": "Kalligraphie"}'),
  ('historical-reenactment', '{"en": "Historical Reenactment", "ru": "Историческая реконструкция", "uk": "Історична реконструкція", "cs": "Historický šerm", "de": "Historische Nachstellung"}'),
  ('tea-ceremony', '{"en": "Tea Ceremony", "ru": "Чаепитие", "uk": "Чаювання", "cs": "Čajový obřad", "de": "Teezeremonie"}'),
  ('guided-tours', '{"en": "Guided Tours", "ru": "Экскурсии", "uk": "Екскурсії", "cs": "Prohlídky s průvodcem", "de": "Führungen"}'),
  ('history-deep', '{"en": "History", "ru": "История", "uk": "Історія", "cs": "Historie", "de": "Geschichte"}'),
  ('japanese-culture', '{"en": "Japanese Culture", "ru": "Японская культура", "uk": "Японська культура", "cs": "Japonská kultura", "de": "Japanische Kultur"}'),
  ('anime', '{"en": "Anime & Manga", "ru": "Аниме и манга", "uk": "Аніме та манґа", "cs": "Anime a manga", "de": "Anime & Manga"}'),
  ('travel-adventures', '{"en": "Travel & Adventures", "ru": "Путешествия и приключения", "uk": "Подорожі та пригоди", "cs": "Cestování a dobrodružství", "de": "Reisen & Abenteuer"}'),
  ('yachting', '{"en": "Yachting & Sailing", "ru": "Яхтинг", "uk": "Яхтинг", "cs": "Jachting a plachtění", "de": "Segeln & Yachting"}'),
  ('cars', '{"en": "Cars & Automotive", "ru": "Автомобили", "uk": "Автомобілі", "cs": "Automobily", "de": "Autos & Automobil"}')
on conflict (slug) do nothing;
