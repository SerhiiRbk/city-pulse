#!/usr/bin/env python3
"""
Seed 10 system events in Brno (round 2) for June 2026.

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
  exec(open('.agent-tmp/seed_brno_round2.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
CITY_ID = "08c45881-9007-4307-a072-f01ca61c9fb4"
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
    # 1. Ignis Brunensis — International Fireworks Competition
    {
        "iso_local": "2026-06-06 22:30",
        "duration_minutes": 60,
        "category": "music",
        "address": "Brněnská přehrada, Brno",
        "venue_short": "Brno Reservoir",
        "lat": 49.2050,
        "lng": 16.6100,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.ignisbrunensis.cz",
        "source_label": "ignisbrunensis.cz",
        "photos": ["https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=800&q=80"],
        "titles": {
            "en": "Ignis Brunensis — International Fireworks Competition",
            "de": "Ignis Brunensis — Internationaler Feuerwerkswettbewerb",
            "ru": "Ignis Brunensis — международный конкурс фейерверков",
            "uk": "Ignis Brunensis — міжнародний конкурс феєрверків",
            "es": "Ignis Brunensis — Competición internacional de fuegos artificiales",
        },
        "bodies": {
            "en": "Watch world-class fireworks teams compete over the Brno Reservoir. Spectacular pyrotechnic shows synchronized to music, with food stalls and a festive atmosphere along the waterfront. A Brno summer highlight!",
            "de": "Sieh Weltklasse-Feuerwerk-Teams über der Brünner Talsperre konkurrieren. Spektakuläre Pyrotechnik-Shows synchronisiert zur Musik, mit Essensständen und festlicher Atmosphäre am Wasser. Ein Brünner Sommer-Highlight!",
            "ru": "Смотрите, как команды фейерверков мирового класса соревнуются над Брненским водохранилищем. Зрелищные пиротехнические шоу под музыку, фуд-корты и праздничная атмосфера на набережной.",
            "uk": "Дивіться, як команди феєрверків світового класу змагаються над Брненським водосховищем. Видовищні піротехнічні шоу під музику, фуд-корти та святкова атмосфера на набережній.",
            "es": "Mira a equipos de fuegos artificiales de clase mundial competir sobre el embalse de Brno. Espectaculares shows pirotécnicos sincronizados con música, puestos de comida y ambiente festivo junto al agua.",
        },
    },
    # 2. Craft Beer Tour — Brno Microbreweries
    {
        "iso_local": "2026-06-13 18:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "Pivovar Pegas, Jakubská 4, Brno",
        "venue_short": "Pivovar Pegas",
        "lat": 49.1951,
        "lng": 16.6068,
        "is_free": False,
        "price": 650,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.hotelpegas.cz",
        "source_label": "hotelpegas.cz",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tour — Brno Microbreweries",
            "de": "Craft-Bier-Tour — Brünner Mikrobrauereien",
            "ru": "Тур по крафтовому пиву — микропивоварни Брно",
            "uk": "Тур крафтовим пивом — мікропивоварні Брно",
            "es": "Tour de cerveza artesanal — Microcervecerías de Brno",
        },
        "bodies": {
            "en": "Discover Brno's thriving craft beer scene across 4 microbreweries. Sample Czech lagers, IPAs, and seasonal specialties from Pegas, Lucky Bastard, and more. Includes tastings, snack pairings, and brewery stories.",
            "de": "Entdecke Brünns blühende Craft-Bier-Szene in 4 Mikrobrauereien. Probiere tschechische Lager, IPAs und saisonale Spezialitäten von Pegas, Lucky Bastard und mehr. Inklusive Verkostungen und Snack-Pairings.",
            "ru": "Откройте процветающую крафтовую пивную сцену Брно в 4 микропивоварнях. Дегустация чешских лагеров, IPA и сезонных специалитетов от Pegas, Lucky Bastard и других. Включает дегустации и закуски.",
            "uk": "Відкрийте крафтову пивну сцену Брно, що процвітає, у 4 мікропивоварнях. Дегустація чеських лагерів, IPA та сезонних спеціалітетів від Pegas, Lucky Bastard та інших. Включає дегустації та закуски.",
            "es": "Descubre la floreciente escena cervecera artesanal de Brno en 4 microcervecerías. Degusta lagers checas, IPAs y especialidades de temporada de Pegas, Lucky Bastard y más. Incluye catas y maridajes.",
        },
    },
    # 3. Language Exchange — Brno Polyglots
    {
        "iso_local": "2026-06-11 18:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Café Pilát, Šilingrovo nám. 3, Brno",
        "venue_short": "Café Pilát",
        "lat": 49.1951,
        "lng": 16.6068,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-polyglots",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange — Brno Polyglots",
            "de": "Sprachaustausch — Brno Polyglots",
            "ru": "Языковой обмен — Brno Polyglots",
            "uk": "Мовний обмін — Brno Polyglots",
            "es": "Intercambio de idiomas — Brno Polyglots",
        },
        "bodies": {
            "en": "Practice Czech, English, German, and more at this friendly language exchange in the city center. Rotating tables every 15 minutes, name tags with flags, and a cozy café atmosphere. All levels welcome!",
            "de": "Übe Tschechisch, Englisch, Deutsch und mehr bei diesem freundlichen Sprachaustausch im Stadtzentrum. Rotierende Tische alle 15 Minuten, Namensschilder mit Flaggen und gemütliche Café-Atmosphäre.",
            "ru": "Практикуйте чешский, английский, немецкий и другие языки на этом дружеском языковом обмене в центре города. Ротация столов каждые 15 минут, бейджи с флагами и уютная атмосфера кафе.",
            "uk": "Практикуйте чеську, англійську, німецьку та інші мови на цьому дружньому мовному обміні в центрі міста. Ротація столів кожні 15 хвилин, бейджі з прапорами та затишна атмосфера кафе.",
            "es": "Practica checo, inglés, alemán y más en este amigable intercambio de idiomas en el centro. Mesas rotativas cada 15 minutos, etiquetas con banderas y ambiente acogedor de café. ¡Todos los niveles!",
        },
    },
    # 4. Expat Meetup — Brno Internationals
    {
        "iso_local": "2026-06-19 19:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Super Panda Circus, Štefánikova 4, Brno",
        "venue_short": "Super Panda Circus",
        "lat": 49.1951,
        "lng": 16.6068,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/brno-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Brno Internationals",
            "de": "Expat-Treffen — Brno Internationals",
            "ru": "Встреча экспатов — Brno Internationals",
            "uk": "Зустріч експатів — Brno Internationals",
            "es": "Encuentro de expatriados — Brno Internationals",
        },
        "bodies": {
            "en": "Meet fellow internationals living in Brno at the quirky Super Panda Circus bar. Craft cocktails, good music, and an easy way to expand your social circle in Moravia's capital. No registration needed!",
            "de": "Triff andere Internationale in Brno in der skurrilen Super Panda Circus Bar. Craft-Cocktails, gute Musik und eine einfache Möglichkeit, deinen Freundeskreis in Mährens Hauptstadt zu erweitern.",
            "ru": "Познакомьтесь с другими иностранцами в Брно в необычном баре Super Panda Circus. Крафтовые коктейли, хорошая музыка и простой способ расширить круг общения в столице Моравии!",
            "uk": "Познайомтесь з іншими іноземцями в Брно в незвичайному барі Super Panda Circus. Крафтові коктейлі, гарна музика та простий спосіб розширити коло спілкування в столиці Моравії!",
            "es": "Conoce a otros internacionales en Brno en el peculiar bar Super Panda Circus. Cócteles artesanales, buena música y una forma fácil de ampliar tu círculo social en la capital de Moravia. ¡Sin registro!",
        },
    },
    # 5. Morning Run in Lužánky Park
    {
        "iso_local": "2026-06-14 07:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Lužánky Park, Brno",
        "venue_short": "Lužánky Park",
        "lat": 49.2050,
        "lng": 16.6100,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Run in Lužánky Park",
            "de": "Morgenlauf im Lužánky-Park",
            "ru": "Утренняя пробежка в парке Лужанки",
            "uk": "Ранкова пробіжка в парку Лужанки",
            "es": "Carrera matutina en el parque Lužánky",
        },
        "bodies": {
            "en": "Join a friendly 5–8 km group run through Brno's largest and oldest park. Shaded paths, a lake loop, and morning calm. All paces welcome — we regroup at checkpoints. Coffee together after at a nearby café!",
            "de": "Schließe dich einem freundlichen 5–8 km Gruppenlauf durch Brünns größten und ältesten Park an. Schattige Wege, eine Seerunde und Morgenruhe. Alle Tempos willkommen — danach gemeinsam Kaffee!",
            "ru": "Присоединяйтесь к дружеской групповой пробежке 5–8 км по крупнейшему и старейшему парку Брно. Тенистые дорожки, круг вокруг озера и утренний покой. Любой темп приветствуется, потом кофе!",
            "uk": "Приєднуйтесь до дружньої групової пробіжки 5–8 км по найбільшому та найстарішому парку Брно. Тінисті доріжки, коло навколо озера та ранковий спокій. Будь-який темп вітається, потім кава!",
            "es": "Únete a una carrera grupal de 5–8 km por el parque más grande y antiguo de Brno. Caminos sombreados, vuelta al lago y calma matutina. ¡Todos los ritmos bienvenidos, café juntos después!",
        },
    },
    # 6. Photography Walk — Špilberk Castle
    {
        "iso_local": "2026-06-15 17:30",
        "duration_minutes": 120,
        "category": "photography",
        "address": "Špilberk Castle, Brno",
        "venue_short": "Špilberk Castle",
        "lat": 49.1940,
        "lng": 16.5990,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-photography",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80"],
        "titles": {
            "en": "Photography Walk — Špilberk Castle & City Views",
            "de": "Fotowalk — Burg Špilberk & Stadtblicke",
            "ru": "Фотопрогулка — замок Шпильберк и виды города",
            "uk": "Фотопрогулянка — замок Шпільберк та види міста",
            "es": "Paseo fotográfico — Castillo Špilberk y vistas de la ciudad",
        },
        "bodies": {
            "en": "Capture Brno's stunning panorama from Špilberk Castle during golden hour. Tips on cityscape photography, composition with the cathedral spires, and dramatic light. Walk through the castle grounds and park. All cameras welcome.",
            "de": "Fotografiere Brünns atemberaubendes Panorama von der Burg Špilberk zur goldenen Stunde. Tipps zu Stadtfotografie, Komposition mit den Kathedralentürmen und dramatischem Licht. Alle Kameratypen willkommen.",
            "ru": "Снимайте потрясающую панораму Брно с замка Шпильберк в золотой час. Советы по городской фотографии, композиции с шпилями собора и драматическому свету. Прогулка по территории замка и парку.",
            "uk": "Знімайте приголомшливу панораму Брно з замку Шпільберк в золоту годину. Поради щодо міської фотографії, композиції з шпилями собору та драматичного світла. Прогулянка територією замку та парком.",
            "es": "Captura el impresionante panorama de Brno desde el Castillo Špilberk durante la hora dorada. Consejos sobre fotografía urbana, composición con las agujas de la catedral y luz dramática. Todas las cámaras bienvenidas.",
        },
    },
    # 7. Czech Cooking Class — Svíčková & Knedlíky
    {
        "iso_local": "2026-06-17 17:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Chefparade Brno, Veveří 20, Brno",
        "venue_short": "Chefparade Brno",
        "lat": 49.1951,
        "lng": 16.6068,
        "is_free": False,
        "price": 1500,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.chefparade.cz",
        "source_label": "chefparade.cz",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Czech Cooking Class — Svíčková & Knedlíky",
            "de": "Tschechischer Kochkurs — Svíčková & Knedlíky",
            "ru": "Кулинарный класс — свичкова и кнедлики",
            "uk": "Кулінарний клас — свічкова та кнедліки",
            "es": "Clase de cocina checa — Svíčková y Knedlíky",
        },
        "bodies": {
            "en": "Learn to cook Czech classics — svíčková (marinated sirloin with cream sauce) and fluffy bread knedlíky from scratch. Hands-on class with a local chef, includes all ingredients, recipes, and a shared dinner with Moravian wine.",
            "de": "Lerne tschechische Klassiker zu kochen — Svíčková (mariniertes Rinderfilet mit Sahnesauce) und fluffige Brotknödel von Grund auf. Praxiskurs mit lokalem Koch, inklusive aller Zutaten und Abendessen mit mährischem Wein.",
            "ru": "Научитесь готовить чешскую классику — свичкову (маринованная вырезка со сливочным соусом) и пышные хлебные кнедлики с нуля. Практический класс с местным шефом, включая все ингредиенты и ужин с моравским вином.",
            "uk": "Навчіться готувати чеську класику — свічкову (мариновану вирізку з вершковим соусом) та пишні хлібні кнедліки з нуля. Практичний клас з місцевим шефом, включаючи всі інгредієнти та вечерю з моравським вином.",
            "es": "Aprende a cocinar clásicos checos — svíčková (solomillo marinado con salsa de crema) y esponjosos knedlíky de pan desde cero. Clase práctica con chef local, incluye ingredientes y cena con vino moravo.",
        },
    },
    # 8. Jazz Night — Metro Music Bar
    {
        "iso_local": "2026-06-12 20:30",
        "duration_minutes": 150,
        "category": "music",
        "address": "Metro Music Bar, Poštovská 6, Brno",
        "venue_short": "Metro Music Bar",
        "lat": 49.1951,
        "lng": 16.6068,
        "is_free": False,
        "price": 200,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.metromusicbar.cz",
        "source_label": "metromusicbar.cz",
        "photos": ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80"],
        "titles": {
            "en": "Jazz Night — Metro Music Bar Brno",
            "de": "Jazzabend — Metro Music Bar Brno",
            "ru": "Джазовый вечер — Metro Music Bar Brno",
            "uk": "Джазовий вечір — Metro Music Bar Brno",
            "es": "Noche de jazz — Metro Music Bar Brno",
        },
        "bodies": {
            "en": "Live jazz at Brno's premier music venue. Intimate underground setting with excellent acoustics, featuring local Czech jazz musicians and touring artists. Craft beer on tap and a warm, vibrant atmosphere.",
            "de": "Live-Jazz in Brünns erstklassigem Musikvenue. Intimes Underground-Setting mit exzellenter Akustik, lokale tschechische Jazzmusiker und tourende Künstler. Craft-Bier vom Fass und warme, lebendige Atmosphäre.",
            "ru": "Живой джаз в главном музыкальном заведении Брно. Камерная подземная площадка с отличной акустикой, местные чешские джазовые музыканты и гастролирующие артисты. Крафтовое пиво из крана и тёплая атмосфера.",
            "uk": "Живий джаз у головному музичному закладі Брно. Камерна підземна площадка з відмінною акустикою, місцеві чеські джазові музиканти та гастролюючі артисти. Крафтове пиво з крану та тепла атмосфера.",
            "es": "Jazz en vivo en el principal local musical de Brno. Ambiente underground íntimo con excelente acústica, músicos de jazz checos locales y artistas de gira. Cerveza artesanal de grifo y ambiente cálido y vibrante.",
        },
    },
    # 9. Board Games Night — Herna u Kulečníku
    {
        "iso_local": "2026-06-16 18:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Herna u Kulečníku, Kounicova 22, Brno",
        "venue_short": "Herna u Kulečníku",
        "lat": 49.1951,
        "lng": 16.6068,
        "is_free": False,
        "price": 100,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-board-games",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games Night — Brno",
            "de": "Brettspielabend — Brno",
            "ru": "Вечер настольных игр — Брно",
            "uk": "Вечір настільних ігор — Брно",
            "es": "Noche de juegos de mesa — Brno",
        },
        "bodies": {
            "en": "Over 300 board games to choose from at Brno's friendliest game café. Staff help you pick the perfect game for your group. Great for meeting new people over Catan, Wingspan, or Czech Games Edition titles.",
            "de": "Über 300 Brettspiele zur Auswahl in Brünns freundlichstem Spielcafé. Das Personal hilft bei der Spielauswahl. Perfekt um neue Leute bei Catan, Wingspan oder Czech Games Edition Titeln kennenzulernen.",
            "ru": "Более 300 настольных игр на выбор в самом дружелюбном игровом кафе Брно. Персонал поможет подобрать идеальную игру. Отлично для знакомств за Catan, Wingspan или играми Czech Games Edition.",
            "uk": "Понад 300 настільних ігор на вибір у найдружнішому ігровому кафе Брно. Персонал допоможе підібрати ідеальну гру. Чудово для знайомств за Catan, Wingspan або іграми Czech Games Edition.",
            "es": "Más de 300 juegos de mesa en el café de juegos más amigable de Brno. El personal te ayuda a elegir el juego perfecto. Ideal para conocer gente con Catan, Wingspan o títulos de Czech Games Edition.",
        },
    },
    # 10. Yoga in Lužánky Park
    {
        "iso_local": "2026-06-21 09:00",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Lužánky Park, main lawn, Brno",
        "venue_short": "Lužánky Park",
        "lat": 49.2050,
        "lng": 16.6100,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga in Lužánky Park — Sunday Morning",
            "de": "Yoga im Lužánky-Park — Sonntagmorgen",
            "ru": "Йога в парке Лужанки — воскресное утро",
            "uk": "Йога в парку Лужанки — недільний ранок",
            "es": "Yoga en el parque Lužánky — Domingo por la mañana",
        },
        "bodies": {
            "en": "Start your Sunday with outdoor yoga on the main lawn of Lužánky Park. Vinyasa flow suitable for all levels under mature trees. Bring your own mat and enjoy the morning calm in Brno's green heart.",
            "de": "Starte deinen Sonntag mit Outdoor-Yoga auf der Hauptwiese des Lužánky-Parks. Vinyasa Flow für alle Level unter alten Bäumen. Eigene Matte mitbringen und die Morgenruhe in Brünns grünem Herzen genießen.",
            "ru": "Начните воскресенье с йоги на свежем воздухе на главной поляне парка Лужанки. Виньяса-флоу для всех уровней под взрослыми деревьями. Принесите свой коврик и наслаждайтесь утренним покоем в зелёном сердце Брно.",
            "uk": "Почніть неділю з йоги на свіжому повітрі на головній галявині парку Лужанки. Віньяса-флоу для всіх рівнів під дорослими деревами. Принесіть свій килимок та насолоджуйтесь ранковим спокоєм у зеленому серці Брно.",
            "es": "Empieza tu domingo con yoga al aire libre en el césped principal del parque Lužánky. Vinyasa flow para todos los niveles bajo árboles maduros. Trae tu esterilla y disfruta de la calma matutina en el corazón verde de Brno.",
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
    """Format YYYY-MM-DD HH:MM as '06 Jun 2026, 22:30' for the closing h3."""
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
            "city": "Brno",
            "city_id": CITY_ID,
            "country": "CZ",
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
