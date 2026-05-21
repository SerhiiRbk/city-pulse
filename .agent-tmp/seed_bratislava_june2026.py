#!/usr/bin/env python3
"""
Seed 10 system events in Bratislava for June 2026.

Run:
  python3 -c "
  import ssl, os
  ssl._create_default_https_context = ssl._create_unverified_context
  with open('.env.local') as f:
      for line in f:
          line = line.strip()
          if line and not line.startswith('#') and '=' in line:
              key, _, val = line.partition('=')
              os.environ[key.strip()] = val.strip()
  exec(open('.agent-tmp/seed_bratislava_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
CITY_ID = "85eabd49-4c84-4dc2-a729-c6a93df77fa3"
SYSTEM_ORGANIZER_ID = "acbb238e-f24f-4534-b92a-fa4bcfc7e07e"

CAT = {
    "music": "87186d0a-5631-4b30-863f-fabd5d8f74e4",
    "cinema": "49580e61-7407-4ce5-b230-acca5504b6c3",
    "guided-tours": "77d52bca-998b-4edd-bfb0-e71d5ee264c0",
    "history": "a0b1552a-879c-4e96-b2ae-798dc9988926",
    "running": "eebf6066-7396-4c79-9b48-60ab375fd9e0",
    "cycling": "2f479b11-7373-45f8-b7bd-155550b56a4b",
    "yoga": "d6602677-7e65-40a6-80c5-08500586edc3",
    "tennis": "76c42fb9-fa88-4db8-b8eb-653671264b73",
    "dancing": "a265eff9-ce91-417f-8780-493d024a9e85",
    "theater": "d98f41cf-ef9a-4472-b7cc-dc1f8c78f5e8",
    "museums": "d9b20fbf-7a7e-466b-acf5-1c379e6b94d6",
    "photography": "a588fd1c-bff3-4270-90af-10dd2ed83a18",
    "cooking": "69bd018c-a7fc-4af9-a9b5-1dcaa655d582",
    "wine-tasting": "e6428a86-ac38-414a-988c-2ce103ae5b13",
    "craft-beer": "16d1baf1-d04e-40e0-b3fb-f791c071e6e3",
    "food-tours": "c06ab503-5719-4c1c-bd8f-34828aa7ed5c",
    "standup": "7a62f02d-63cc-4dba-a2b8-757c0adcc7a0",
    "networking": "71835799-4ffd-46b1-b6e5-f7fd9ebc11b6",
    "startups": "8a45fced-9e00-46be-90c9-96606dc1515e",
    "astronomy": "b7c44fe9-32f4-45b8-9dd8-d9b287d82213",
    "pets": "682f758a-5b37-4692-b595-5a69f4724db2",
    "parenting": "307b8dfe-1fc9-4445-80ac-a39cffd9d386",
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

LANG_ORDER = ["en", "de", "ru", "uk", "es"]
LANG_LABEL = {
    "en": "English",
    "de": "Deutsch",
    "ru": "Русский",
    "uk": "Українська",
    "es": "Español",
}

# ---- TipTap JSON helpers ---------------------------------------------


def t_text(s: str, marks: list[dict] | None = None) -> dict:
    node: dict[str, Any] = {"type": "text", "text": s}
    if marks:
        node["marks"] = marks
    return node


def t_link(label: str, href: str) -> dict:
    return t_text(label, [{"type": "link", "attrs": {"href": href}}])


def t_h2(s: str) -> dict:
    return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(s)]}


def t_h3(s: str) -> dict:
    return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(s)]}


def t_para(*nodes: dict) -> dict:
    return {"type": "paragraph", "content": list(nodes)}


def build_description(
    *,
    titles: dict[str, str],
    bodies: dict[str, str],
    when_local_label: str,
    venue: str,
    source_url: str,
    source_label: str,
) -> dict:
    blocks: list[dict] = []
    for lang in LANG_ORDER:
        blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
        blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_local_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}


# ---- Event catalog ---------------------------------------------------

EVENTS: list[dict[str, Any]] = [
    # 1. Danube River Party
    {
        "iso_local": "2026-06-06 19:00",
        "duration_minutes": 240,
        "category": "music",
        "address": "Tyršovo nábrežie, Bratislava",
        "venue_short": "Danube Embankment",
        "lat": 48.1380,
        "lng": 17.1100,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["sk", "en"],
        "source_url": "https://www.visitbratislava.com",
        "source_label": "visitbratislava.com",
        "photos": ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"],
        "titles": {
            "en": "Danube River Party — Bratislava Summer",
            "de": "Donau-Flussparty — Bratislava Sommer",
            "ru": "Вечеринка на Дунае — лето в Братиславе",
            "uk": "Вечірка на Дунаї — літо в Братиславі",
            "es": "Fiesta en el Danubio — Verano en Bratislava",
        },
        "bodies": {
            "en": "Dance the evening away on the Danube embankment with DJs, food trucks, and cold drinks. A summer tradition bringing together locals and expats along the river with views of the UFO Bridge and castle.",
            "de": "Tanze den Abend am Donauufer mit DJs, Food Trucks und kalten Getränken. Eine Sommertradition, die Einheimische und Expats am Fluss mit Blick auf die UFO-Brücke und die Burg zusammenbringt.",
            "ru": "Танцуйте весь вечер на набережной Дуная с диджеями, фуд-траками и холодными напитками. Летняя традиция, объединяющая местных и экспатов у реки с видом на мост UFO и замок.",
            "uk": "Танцюйте весь вечір на набережній Дунаю з діджеями, фуд-траками та холодними напоями. Літня традиція, що об'єднує місцевих та експатів біля річки з видом на міст UFO та замок.",
            "es": "Baila toda la noche en el paseo del Danubio con DJs, food trucks y bebidas frías. Una tradición veraniega que reúne a locales y expatriados junto al río con vistas al Puente UFO y el castillo.",
        },
    },
    # 2. Old Town Walking Tour
    {
        "iso_local": "2026-06-08 10:00",
        "duration_minutes": 120,
        "category": "guided-tours",
        "address": "Hlavné námestie, Bratislava",
        "venue_short": "Main Square",
        "lat": 48.1450,
        "lng": 17.1070,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.freetour.com/bratislava",
        "source_label": "freetour.com",
        "photos": ["https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80"],
        "titles": {
            "en": "Old Town Walking Tour — Bratislava Highlights",
            "de": "Altstadtführung — Bratislava Highlights",
            "ru": "Пешеходная экскурсия по Старому городу — Братислава",
            "uk": "Пішохідна екскурсія Старим містом — Братислава",
            "es": "Tour a pie por el casco antiguo — Bratislava",
        },
        "bodies": {
            "en": "Discover Bratislava's charming Old Town on a free walking tour. Visit Michael's Gate, the Old Town Hall, quirky street statues, and learn about the city's rich history from Habsburg times to the present.",
            "de": "Entdecke Bratislavas charmante Altstadt bei einer kostenlosen Führung. Besuche das Michaelertor, das Alte Rathaus, skurrile Straßenstatuen und erfahre mehr über die reiche Geschichte der Stadt.",
            "ru": "Откройте очаровательный Старый город Братиславы на бесплатной пешеходной экскурсии. Посетите Михайловские ворота, Старую ратушу, забавные уличные статуи и узнайте об истории города.",
            "uk": "Відкрийте чарівне Старе місто Братислави на безкоштовній пішохідній екскурсії. Відвідайте Михайлівські ворота, Стару ратушу, кумедні вуличні статуї та дізнайтесь про історію міста.",
            "es": "Descubre el encantador casco antiguo de Bratislava en un tour gratuito a pie. Visita la Puerta de Miguel, el Ayuntamiento Viejo, estatuas callejeras peculiares y aprende sobre la rica historia de la ciudad.",
        },
    },
    # 3. Slovak Cooking Class — Bryndzové Halušky
    {
        "iso_local": "2026-06-10 17:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Slovak Cooking Academy, Obchodná 52, Bratislava",
        "venue_short": "Slovak Cooking Academy",
        "lat": 48.1450,
        "lng": 17.1070,
        "is_free": False,
        "price": 55,
        "currency": "EUR",
        "languages": ["sk", "en"],
        "source_url": "https://www.slovakcooking.com",
        "source_label": "slovakcooking.com",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Slovak Cooking Class — Bryndzové Halušky",
            "de": "Slowakischer Kochkurs — Bryndzové Halušky",
            "ru": "Кулинарный класс — брынзовые галушки",
            "uk": "Кулінарний клас — бриндзові галушки",
            "es": "Clase de cocina eslovaca — Bryndzové Halušky",
        },
        "bodies": {
            "en": "Learn to make Slovakia's national dish — bryndzové halušky (potato dumplings with sheep cheese and bacon). Hands-on class with a local chef, includes all ingredients and a shared dinner with Slovak wine.",
            "de": "Lerne Slowakeis Nationalgericht zu kochen — Bryndzové Halušky (Kartoffelnocken mit Schafskäse und Speck). Praxiskurs mit lokalem Koch, inklusive aller Zutaten und gemeinsamem Abendessen mit slowakischem Wein.",
            "ru": "Научитесь готовить национальное блюдо Словакии — брынзовые галушки (картофельные клёцки с овечьим сыром и беконом). Практический класс с местным шефом, включая все ингредиенты и ужин со словацким вином.",
            "uk": "Навчіться готувати національну страву Словаччини — бриндзові галушки (картопляні кльоцки з овечим сиром та беконом). Практичний клас з місцевим шефом, включаючи всі інгредієнти та вечерю зі словацьким вином.",
            "es": "Aprende a preparar el plato nacional de Eslovaquia — bryndzové halušky (ñoquis de patata con queso de oveja y bacon). Clase práctica con chef local, incluye ingredientes y cena con vino eslovaco.",
        },
    },
    # 4. Language Exchange — Bratislava Polyglots
    {
        "iso_local": "2026-06-11 18:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Urban House, Laurinská 14, Bratislava",
        "venue_short": "Urban House",
        "lat": 48.1450,
        "lng": 17.1070,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["sk", "en", "de"],
        "source_url": "https://www.meetup.com/bratislava-polyglots",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange — Bratislava Polyglots",
            "de": "Sprachaustausch — Bratislava Polyglots",
            "ru": "Языковой обмен — Bratislava Polyglots",
            "uk": "Мовний обмін — Bratislava Polyglots",
            "es": "Intercambio de idiomas — Bratislava Polyglots",
        },
        "bodies": {
            "en": "Practice Slovak, English, German, and more at this friendly language exchange in the Old Town. Rotating tables every 15 minutes, name tags with flags, and a relaxed café atmosphere. All levels welcome!",
            "de": "Übe Slowakisch, Englisch, Deutsch und mehr bei diesem freundlichen Sprachaustausch in der Altstadt. Rotierende Tische alle 15 Minuten, Namensschilder mit Flaggen und entspannte Café-Atmosphäre.",
            "ru": "Практикуйте словацкий, английский, немецкий и другие языки на этом дружеском языковом обмене в Старом городе. Ротация столов каждые 15 минут, бейджи с флагами и расслабленная атмосфера кафе.",
            "uk": "Практикуйте словацьку, англійську, німецьку та інші мови на цьому дружньому мовному обміні в Старому місті. Ротація столів кожні 15 хвилин, бейджі з прапорами та розслаблена атмосфера кафе.",
            "es": "Practica eslovaco, inglés, alemán y más en este amigable intercambio de idiomas en el casco antiguo. Mesas rotativas cada 15 minutos, etiquetas con banderas y ambiente relajado de café.",
        },
    },
    # 5. Expat Meetup — Bratislava Internationals
    {
        "iso_local": "2026-06-18 19:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Sky Bar, Hviezdoslavovo nám. 7, Bratislava",
        "venue_short": "Sky Bar",
        "lat": 48.1450,
        "lng": 17.1070,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/bratislava-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Bratislava Internationals",
            "de": "Expat-Treffen — Bratislava Internationals",
            "ru": "Встреча экспатов — Bratislava Internationals",
            "uk": "Зустріч експатів — Bratislava Internationals",
            "es": "Encuentro de expatriados — Bratislava Internationals",
        },
        "bodies": {
            "en": "Meet fellow internationals living in Bratislava at the rooftop Sky Bar with panoramic views of the castle and Danube. Drinks, snacks, and an easy way to expand your social circle. No registration needed!",
            "de": "Triff andere Internationale in Bratislava in der Rooftop Sky Bar mit Panoramablick auf die Burg und die Donau. Drinks, Snacks und eine einfache Möglichkeit, deinen Freundeskreis zu erweitern.",
            "ru": "Познакомьтесь с другими иностранцами в Братиславе в руфтоп-баре Sky Bar с панорамным видом на замок и Дунай. Напитки, закуски и простой способ расширить круг общения!",
            "uk": "Познайомтесь з іншими іноземцями в Братиславі в руфтоп-барі Sky Bar з панорамним видом на замок та Дунай. Напої, закуски та простий спосіб розширити коло спілкування!",
            "es": "Conoce a otros internacionales en Bratislava en el Sky Bar con vistas panorámicas del castillo y el Danubio. Bebidas, aperitivos y una forma fácil de ampliar tu círculo social. ¡Sin registro!",
        },
    },
    # 6. Morning Run along the Danube
    {
        "iso_local": "2026-06-14 07:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Most SNP (UFO Bridge), Bratislava",
        "venue_short": "Danube Promenade",
        "lat": 48.1380,
        "lng": 17.1100,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["sk", "en"],
        "source_url": "https://www.meetup.com/bratislava-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Run along the Danube",
            "de": "Morgenlauf entlang der Donau",
            "ru": "Утренняя пробежка вдоль Дуная",
            "uk": "Ранкова пробіжка вздовж Дунаю",
            "es": "Carrera matutina a lo largo del Danubio",
        },
        "bodies": {
            "en": "Join a friendly 5–8 km group run along the Danube promenade. Flat route past the UFO Bridge, Old Town views, and the Aupark area. All paces welcome, coffee together after at a riverside café!",
            "de": "Schließe dich einem freundlichen 5–8 km Gruppenlauf entlang der Donaupromenade an. Flache Strecke am UFO-Brücke vorbei, Altstadtblick und Aupark-Gebiet. Alle Tempos willkommen, danach Kaffee!",
            "ru": "Присоединяйтесь к дружеской групповой пробежке 5–8 км вдоль набережной Дуная. Плоский маршрут мимо моста UFO, виды на Старый город и район Аупарк. Любой темп приветствуется, потом кофе!",
            "uk": "Приєднуйтесь до дружньої групової пробіжки 5–8 км вздовж набережної Дунаю. Плоский маршрут повз міст UFO, види на Старе місто та район Аупарк. Будь-який темп вітається, потім кава!",
            "es": "Únete a una carrera grupal amigable de 5–8 km a lo largo del paseo del Danubio. Ruta plana pasando el Puente UFO, vistas al casco antiguo y la zona Aupark. ¡Todos los ritmos bienvenidos, café después!",
        },
    },
    # 7. Craft Beer Tour — Bratislava Microbreweries
    {
        "iso_local": "2026-06-20 18:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "Bratislavský Meštiansky Pivovar, Drevená 8, Bratislava",
        "venue_short": "Meštiansky Pivovar",
        "lat": 48.1450,
        "lng": 17.1070,
        "is_free": False,
        "price": 35,
        "currency": "EUR",
        "languages": ["sk", "en"],
        "source_url": "https://www.mestianskypivovar.sk",
        "source_label": "mestianskypivovar.sk",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tour — Bratislava Microbreweries",
            "de": "Craft-Bier-Tour — Bratislava Mikrobrauereien",
            "ru": "Тур по крафтовому пиву — микропивоварни Братиславы",
            "uk": "Тур крафтовим пивом — мікропивоварні Братислави",
            "es": "Tour de cerveza artesanal — Microcervecerías de Bratislava",
        },
        "bodies": {
            "en": "Discover Bratislava's growing craft beer scene across 4 taprooms. Sample Slovak IPAs, lagers, and seasonal specialties from local microbreweries with a beer expert. Includes tastings and snack pairings.",
            "de": "Entdecke Bratislavas wachsende Craft-Bier-Szene in 4 Taprooms. Probiere slowakische IPAs, Lager und saisonale Spezialitäten von lokalen Mikrobrauereien mit einem Bierexperten.",
            "ru": "Откройте растущую крафтовую пивную сцену Братиславы в 4 тапрумах. Дегустация словацких IPA, лагеров и сезонных специалитетов от местных микропивоварен с пивным экспертом.",
            "uk": "Відкрийте крафтову пивну сцену Братислави, що зростає, у 4 тапрумах. Дегустація словацьких IPA, лагерів та сезонних спеціалітетів від місцевих мікропивоварень з пивним експертом.",
            "es": "Descubre la creciente escena cervecera artesanal de Bratislava en 4 bares. Degusta IPAs eslovacas, lagers y especialidades de temporada de microcervecerías locales con un experto cervecero.",
        },
    },
    # 8. Jazz Night — Nu Spirit Club
    {
        "iso_local": "2026-06-12 20:30",
        "duration_minutes": 150,
        "category": "music",
        "address": "Nu Spirit Club, Biskupice, Bratislava",
        "venue_short": "Nu Spirit Club",
        "lat": 48.1450,
        "lng": 17.1070,
        "is_free": False,
        "price": 12,
        "currency": "EUR",
        "languages": ["sk", "en"],
        "source_url": "https://www.nuspiritclub.com",
        "source_label": "nuspiritclub.com",
        "photos": ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80"],
        "titles": {
            "en": "Jazz Night — Nu Spirit Club",
            "de": "Jazzabend — Nu Spirit Club",
            "ru": "Джазовый вечер — Nu Spirit Club",
            "uk": "Джазовий вечір — Nu Spirit Club",
            "es": "Noche de jazz — Nu Spirit Club",
        },
        "bodies": {
            "en": "Live jazz at Bratislava's legendary Nu Spirit Club. Intimate venue with excellent acoustics, featuring local Slovak jazz musicians and touring artists. Craft cocktails and a warm, underground atmosphere.",
            "de": "Live-Jazz im legendären Nu Spirit Club Bratislavas. Intimes Venue mit exzellenter Akustik, lokale slowakische Jazzmusiker und tourende Künstler. Craft-Cocktails und warme Underground-Atmosphäre.",
            "ru": "Живой джаз в легендарном Nu Spirit Club Братиславы. Камерная площадка с отличной акустикой, местные словацкие джазовые музыканты и гастролирующие артисты. Крафтовые коктейли и тёплая андеграунд-атмосфера.",
            "uk": "Живий джаз у легендарному Nu Spirit Club Братислави. Камерна площадка з відмінною акустикою, місцеві словацькі джазові музиканти та гастролюючі артисти. Крафтові коктейлі та тепла андеграунд-атмосфера.",
            "es": "Jazz en vivo en el legendario Nu Spirit Club de Bratislava. Lugar íntimo con excelente acústica, músicos de jazz eslovacos locales y artistas de gira. Cócteles artesanales y ambiente underground cálido.",
        },
    },
    # 9. Board Games Night — Boardová Kaviareň
    {
        "iso_local": "2026-06-16 18:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Boardová Kaviareň, Štefánikova 16, Bratislava",
        "venue_short": "Boardová Kaviareň",
        "lat": 48.1450,
        "lng": 17.1070,
        "is_free": False,
        "price": 5,
        "currency": "EUR",
        "languages": ["sk", "en"],
        "source_url": "https://www.boardovakaviarenbratislava.sk",
        "source_label": "boardovakaviarenbratislava.sk",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games Night — Bratislava",
            "de": "Brettspielabend — Bratislava",
            "ru": "Вечер настольных игр — Братислава",
            "uk": "Вечір настільних ігор — Братислава",
            "es": "Noche de juegos de mesa — Bratislava",
        },
        "bodies": {
            "en": "Over 400 board games to choose from at Bratislava's coziest board game café. Staff help you pick the perfect game for your group. Great for meeting new people over Catan, Azul, or Codenames.",
            "de": "Über 400 Brettspiele zur Auswahl in Bratislavas gemütlichstem Brettspiel-Café. Das Personal hilft bei der Spielauswahl. Perfekt um neue Leute bei Catan, Azul oder Codenames kennenzulernen.",
            "ru": "Более 400 настольных игр на выбор в самом уютном настольном кафе Братиславы. Персонал поможет подобрать идеальную игру. Отлично для знакомств за Catan, Azul или Codenames.",
            "uk": "Понад 400 настільних ігор на вибір у найзатишнішому настільному кафе Братислави. Персонал допоможе підібрати ідеальну гру. Чудово для знайомств за Catan, Azul або Codenames.",
            "es": "Más de 400 juegos de mesa en el café de juegos más acogedor de Bratislava. El personal te ayuda a elegir el juego perfecto. Ideal para conocer gente nueva con Catan, Azul o Codenames.",
        },
    },
    # 10. Yoga in Sad Janka Kráľa Park
    {
        "iso_local": "2026-06-21 09:00",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Sad Janka Kráľa, Petržalka, Bratislava",
        "venue_short": "Sad Janka Kráľa",
        "lat": 48.1370,
        "lng": 17.1020,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["sk", "en"],
        "source_url": "https://www.meetup.com/bratislava-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga in Sad Janka Kráľa Park",
            "de": "Yoga im Sad Janka Kráľa Park",
            "ru": "Йога в парке Сад Янка Краля",
            "uk": "Йога в парку Сад Янка Краля",
            "es": "Yoga en el parque Sad Janka Kráľa",
        },
        "bodies": {
            "en": "Start your Sunday with outdoor yoga in Bratislava's oldest park. Vinyasa flow suitable for all levels under ancient trees with Danube views. Bring your own mat and enjoy the morning calm.",
            "de": "Starte deinen Sonntag mit Outdoor-Yoga in Bratislavas ältestem Park. Vinyasa Flow für alle Level unter alten Bäumen mit Donau-Blick. Eigene Matte mitbringen und die Morgenruhe genießen.",
            "ru": "Начните воскресенье с йоги на свежем воздухе в старейшем парке Братиславы. Виньяса-флоу для всех уровней под вековыми деревьями с видом на Дунай. Принесите свой коврик!",
            "uk": "Почніть неділю з йоги на свіжому повітрі в найстарішому парку Братислави. Віньяса-флоу для всіх рівнів під віковими деревами з видом на Дунай. Принесіть свій килимок!",
            "es": "Empieza tu domingo con yoga al aire libre en el parque más antiguo de Bratislava. Vinyasa flow para todos los niveles bajo árboles centenarios con vistas al Danubio. Trae tu propia esterilla.",
        },
    },
]


# ---- Time helpers ----------------------------------------------------

def local_to_utc(iso_local: str) -> str:
    """Convert YYYY-MM-DD HH:MM (CEST = UTC+2) to ISO 8601 UTC string."""
    from datetime import datetime, timedelta
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    utc_dt = dt - timedelta(hours=2)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def local_human(iso_local: str) -> str:
    """Format YYYY-MM-DD HH:MM as '06 Jun 2026, 19:00' for the closing h3."""
    date_part, time_part = iso_local.split(" ")
    y, mo, d = (int(x) for x in date_part.split("-"))
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d:02d} {months[mo-1]} {y}, {time_part}"


# ---- Main ------------------------------------------------------------

def main() -> None:
    ssl._create_default_https_context = ssl._create_unverified_context

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    # Check existing system events to de-duplicate
    check_url = f"{url}/rest/v1/events?is_system=eq.true&select=title&limit=1000"
    req = urllib.request.Request(check_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        existing = json.loads(resp.read())
    skip_titles = {row["title"] for row in existing}
    print(f"[i] {len(skip_titles)} existing system events found")

    inserted = 0
    skipped = 0

    for ev in EVENTS:
        title_en = ev["titles"]["en"]
        if title_en in skip_titles:
            print(f"[=] skip (already exists): {title_en}")
            skipped += 1
            continue

        starts_at = local_to_utc(ev["iso_local"])
        when_human = local_human(ev["iso_local"])
        desc_doc = build_description(
            titles=ev["titles"],
            bodies=ev["bodies"],
            when_local_label=when_human,
            venue=ev["venue_short"],
            source_url=ev["source_url"],
            source_label=ev["source_label"],
        )

        row = {
            "title": title_en,
            "description": ev["bodies"]["en"],
            "description_json": desc_doc,
            "title_translations": {k: v for k, v in ev["titles"].items() if k != "en"},
            "description_translations": {k: v for k, v in ev["bodies"].items() if k != "en"},
            "starts_at": starts_at,
            "duration_minutes": ev["duration_minutes"],
            "city": "Bratislava",
            "city_id": CITY_ID,
            "country": "SK",
            "address": ev["address"],
            "lat": ev["lat"],
            "lng": ev["lng"],
            "is_online": False,
            "is_free": ev["is_free"],
            "price": ev["price"],
            "currency": ev["currency"],
            "max_attendees": None,
            "photos": ev.get("photos", []),
            "organizer_id": SYSTEM_ORGANIZER_ID,
            "category_id": CAT.get(ev["category"]),
            "languages": ev["languages"],
            "is_private": False,
            "is_system": True,
            "status": "published",
            "source_url": ev["source_url"],
            "safety_tags": [],
            "allow_crews": True,
        }

        data = json.dumps(row, ensure_ascii=False).encode()
        insert_url = f"{url}/rest/v1/events"
        req = urllib.request.Request(insert_url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read())
                eid = result[0]["id"] if isinstance(result, list) and result else "?"
                print(f"[+] {title_en}  ->  {eid}")
                inserted += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"[!] ERROR: {title_en}: {e.code} {body}")

    print(f"\nDone: inserted={inserted}, skipped={skipped}, total_attempted={len(EVENTS)}")


if __name__ == "__main__":
    main()
