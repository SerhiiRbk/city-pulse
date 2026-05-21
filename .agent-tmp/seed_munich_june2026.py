#!/usr/bin/env python3
"""
Seed 15 system events in Munich for June 2026.

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
  exec(open('.agent-tmp/seed_munich_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
MUNICH_CITY_ID = "acc6dc2c-e557-44ee-bebd-38765cec2a2a"
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
    # 1. Tollwood Festival — Summer Edition
    {
        "iso_local": "2026-06-18 16:00",
        "duration_minutes": 480,
        "category": "music",
        "address": "Olympiapark Süd, Munich",
        "venue_short": "Olympiapark",
        "lat": 48.1750,
        "lng": 11.5520,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.tollwood.de",
        "source_label": "tollwood.de",
        "photos": ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"],
        "titles": {
            "en": "Tollwood Festival — Summer Edition",
            "de": "Tollwood Festival — Sommerfestival",
            "ru": "Фестиваль Tollwood — летняя программа",
            "uk": "Фестиваль Tollwood — літня програма",
            "es": "Festival Tollwood — Edición de verano",
        },
        "bodies": {
            "en": "Munich's beloved Tollwood summer festival in Olympiapark — free open-air concerts, international food stalls, art installations, and a vibrant market. A cultural highlight running through June.",
            "de": "Münchens beliebtes Tollwood-Sommerfestival im Olympiapark — kostenlose Open-Air-Konzerte, internationale Essensstände, Kunstinstallationen und ein lebhafter Markt. Ein kulturelles Highlight den ganzen Juni.",
            "ru": "Любимый мюнхенский летний фестиваль Tollwood в Олимпийском парке — бесплатные концерты под открытым небом, международные фуд-корты, арт-инсталляции и яркий рынок.",
            "uk": "Улюблений мюнхенський літній фестиваль Tollwood в Олімпійському парку — безкоштовні концерти просто неба, міжнародні фуд-корти, арт-інсталяції та яскравий ринок.",
            "es": "El querido festival de verano Tollwood de Múnich en el Olympiapark — conciertos gratuitos al aire libre, puestos de comida internacional, instalaciones artísticas y un mercado vibrante.",
        },
    },
    # 2. Beer Garden Evening — Englischer Garten
    {
        "iso_local": "2026-06-06 17:00",
        "duration_minutes": 240,
        "category": "craft-beer",
        "address": "Chinesischer Turm, Englischer Garten 3, Munich",
        "venue_short": "Chinesischer Turm",
        "lat": 48.1640,
        "lng": 11.6050,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.chinaturm.de",
        "source_label": "chinaturm.de",
        "photos": ["https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80"],
        "titles": {
            "en": "Beer Garden Evening — Englischer Garten",
            "de": "Biergarten-Abend — Englischer Garten",
            "ru": "Вечер в пивном саду — Английский сад",
            "uk": "Вечір у пивному саду — Англійський сад",
            "es": "Noche en cervecería al aire libre — Englischer Garten",
        },
        "bodies": {
            "en": "Join fellow expats and locals for a classic Munich beer garden evening at the Chinesischer Turm. Traditional Bavarian food, Maß beer, and live brass band music under the chestnut trees.",
            "de": "Triff Expats und Einheimische beim klassischen Münchner Biergartenabend am Chinesischen Turm. Traditionelles bayerisches Essen, Maß Bier und Live-Blasmusik unter den Kastanien.",
            "ru": "Присоединяйтесь к экспатам и местным жителям на классический мюнхенский вечер в пивном саду у Китайской башни. Традиционная баварская еда, литровые кружки пива и живая духовая музыка под каштанами.",
            "uk": "Приєднуйтесь до експатів та місцевих на класичний мюнхенський вечір у пивному саду біля Китайської вежі. Традиційна баварська їжа, літрові кухлі пива та жива духова музика під каштанами.",
            "es": "Únete a expatriados y locales para una clásica noche de cervecería muniquesa en la Chinesischer Turm. Comida bávara tradicional, cerveza Maß y música de banda en vivo bajo los castaños.",
        },
    },
    # 3. Bavarian Cooking Class — Knödel & Schweinebraten
    {
        "iso_local": "2026-06-10 17:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Münchner Kochschule, Schleißheimer Str. 159, Munich",
        "venue_short": "Münchner Kochschule",
        "lat": 48.1620,
        "lng": 11.5670,
        "is_free": False,
        "price": 75,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.muenchner-kochschule.de",
        "source_label": "muenchner-kochschule.de",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Bavarian Cooking Class — Knödel & Schweinebraten",
            "de": "Bayerischer Kochkurs — Knödel & Schweinebraten",
            "ru": "Кулинарный класс — кнёдли и швайнебратен",
            "uk": "Кулінарний клас — кньодлі та швайнебратен",
            "es": "Clase de cocina bávara — Knödel y Schweinebraten",
        },
        "bodies": {
            "en": "Learn to cook authentic Bavarian Knödel (dumplings) and Schweinebraten (roast pork) from scratch. Hands-on class with a local chef, includes all ingredients, recipes, and a shared dinner with beer.",
            "de": "Lerne authentische bayerische Knödel und Schweinebraten von Grund auf zu kochen. Praxiskurs mit lokalem Koch, inklusive aller Zutaten, Rezepte und gemeinsamem Abendessen mit Bier.",
            "ru": "Научитесь готовить настоящие баварские кнёдли и швайнебратен (жаркое из свинины) с нуля. Практический класс с местным шефом, включая все ингредиенты, рецепты и совместный ужин с пивом.",
            "uk": "Навчіться готувати справжні баварські кньодлі та швайнебратен (печеню зі свинини) з нуля. Практичний клас з місцевим шефом, включаючи всі інгредієнти, рецепти та спільну вечерю з пивом.",
            "es": "Aprende a cocinar auténticos Knödel bávaros y Schweinebraten (cerdo asado) desde cero. Clase práctica con chef local, incluye todos los ingredientes, recetas y cena compartida con cerveza.",
        },
    },
    # 4. Language Exchange — Sprachcafé Munich
    {
        "iso_local": "2026-06-11 18:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Lost Weekend, Schellingstr. 3, Munich",
        "venue_short": "Lost Weekend",
        "lat": 48.1520,
        "lng": 11.5790,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/munich-sprachcafe",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange — Sprachcafé Munich",
            "de": "Sprachaustausch — Sprachcafé München",
            "ru": "Языковой обмен — Sprachcafé München",
            "uk": "Мовний обмін — Sprachcafé München",
            "es": "Intercambio de idiomas — Sprachcafé Múnich",
        },
        "bodies": {
            "en": "Practice German, English, Spanish, and more at this friendly Sprachcafé in the university quarter. Rotating tables every 15 minutes, name tags with flags, and a cozy bookshop-café atmosphere.",
            "de": "Übe Deutsch, Englisch, Spanisch und mehr bei diesem freundlichen Sprachcafé im Universitätsviertel. Rotierende Tische alle 15 Minuten, Namensschilder mit Flaggen und gemütliche Buchhandlungs-Café-Atmosphäre.",
            "ru": "Практикуйте немецкий, английский, испанский и другие языки в этом дружеском Sprachcafé в университетском квартале. Ротация столов каждые 15 минут, бейджи с флагами и уютная атмосфера книжного кафе.",
            "uk": "Практикуйте німецьку, англійську, іспанську та інші мови в цьому дружньому Sprachcafé в університетському кварталі. Ротація столів кожні 15 хвилин, бейджі з прапорами та затишна атмосфера книжкового кафе.",
            "es": "Practica alemán, inglés, español y más en este amigable Sprachcafé en el barrio universitario. Mesas rotativas cada 15 minutos, etiquetas con banderas y ambiente acogedor de librería-café.",
        },
    },
    # 5. Expat Meetup — Munich Internationals
    {
        "iso_local": "2026-06-19 19:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Augustiner Keller, Arnulfstr. 52, Munich",
        "venue_short": "Augustiner Keller",
        "lat": 48.1430,
        "lng": 11.5530,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/munich-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Munich Internationals",
            "de": "Expat-Treffen — Munich Internationals",
            "ru": "Встреча экспатов — Munich Internationals",
            "uk": "Зустріч експатів — Munich Internationals",
            "es": "Encuentro de expatriados — Munich Internationals",
        },
        "bodies": {
            "en": "Meet fellow internationals living in Munich at the legendary Augustiner Keller beer garden. Great beer, Bavarian pretzels, and an easy way to expand your social circle. No registration needed!",
            "de": "Triff andere Internationale in München im legendären Augustiner Keller Biergarten. Tolles Bier, bayerische Brezn und eine einfache Möglichkeit, deinen Freundeskreis zu erweitern. Keine Anmeldung nötig!",
            "ru": "Познакомьтесь с другими иностранцами, живущими в Мюнхене, в легендарном пивном саду Augustiner Keller. Отличное пиво, баварские брецели и простой способ расширить круг общения!",
            "uk": "Познайомтесь з іншими іноземцями, що живуть у Мюнхені, в легендарному пивному саду Augustiner Keller. Чудове пиво, баварські брецелі та простий спосіб розширити коло спілкування!",
            "es": "Conoce a otros internacionales que viven en Múnich en el legendario Augustiner Keller. Gran cerveza, pretzels bávaros y una forma fácil de ampliar tu círculo social. ¡Sin registro!",
        },
    },
    # 6. Morning Run in Englischer Garten
    {
        "iso_local": "2026-06-14 07:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Englischer Garten, Monopteros, Munich",
        "venue_short": "Englischer Garten",
        "lat": 48.1640,
        "lng": 11.6050,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/munich-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Run in Englischer Garten",
            "de": "Morgenlauf im Englischen Garten",
            "ru": "Утренняя пробежка в Английском саду",
            "uk": "Ранкова пробіжка в Англійському саду",
            "es": "Carrera matutina en el Englischer Garten",
        },
        "bodies": {
            "en": "Join a friendly 5–10 km group run through Munich's sprawling Englischer Garten. Past the Monopteros, along the Eisbach, and through shaded forest paths. All paces welcome, coffee after!",
            "de": "Schließe dich einem freundlichen 5–10 km Gruppenlauf durch den weitläufigen Englischen Garten an. Am Monopteros vorbei, entlang des Eisbachs und durch schattige Waldwege. Alle Tempos willkommen!",
            "ru": "Присоединяйтесь к дружеской групповой пробежке 5–10 км по обширному Английскому саду Мюнхена. Мимо Моноптероса, вдоль Айсбаха и по тенистым лесным тропам. Любой темп приветствуется!",
            "uk": "Приєднуйтесь до дружньої групової пробіжки 5–10 км по обширному Англійському саду Мюнхена. Повз Моноптерос, вздовж Айсбаху та тінистими лісовими стежками. Будь-який темп вітається!",
            "es": "Únete a una carrera grupal amigable de 5–10 km por el extenso Englischer Garten de Múnich. Pasa por el Monopteros, a lo largo del Eisbach y por senderos forestales sombreados. ¡Todos los ritmos bienvenidos!",
        },
    },
    # 7. Photography Walk — Marienplatz & Altstadt
    {
        "iso_local": "2026-06-15 17:30",
        "duration_minutes": 120,
        "category": "photography",
        "address": "Marienplatz, Munich",
        "venue_short": "Marienplatz",
        "lat": 48.1374,
        "lng": 11.5755,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/munich-photography",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80"],
        "titles": {
            "en": "Photography Walk — Marienplatz & Altstadt",
            "de": "Fotowalk — Marienplatz & Altstadt",
            "ru": "Фотопрогулка — Мариенплац и Старый город",
            "uk": "Фотопрогулянка — Марієнплац та Старе місто",
            "es": "Paseo fotográfico — Marienplatz y casco antiguo",
        },
        "bodies": {
            "en": "Capture Munich's stunning Neues Rathaus, Frauenkirche, and historic Altstadt during golden hour. Tips on architecture photography, leading lines, and light. All camera types welcome.",
            "de": "Fotografiere Münchens atemberaubendes Neues Rathaus, die Frauenkirche und die historische Altstadt zur goldenen Stunde. Tipps zu Architekturfotografie, Führungslinien und Licht. Alle Kameratypen willkommen.",
            "ru": "Снимайте потрясающую Новую ратушу Мюнхена, Фрауэнкирхе и исторический Старый город в золотой час. Советы по архитектурной фотографии, направляющим линиям и свету. Любые камеры приветствуются.",
            "uk": "Знімайте приголомшливу Нову ратушу Мюнхена, Фрауенкірхе та історичне Старе місто в золоту годину. Поради щодо архітектурної фотографії, напрямних ліній та світла. Будь-які камери вітаються.",
            "es": "Captura el impresionante Neues Rathaus de Múnich, la Frauenkirche y el casco antiguo histórico durante la hora dorada. Consejos sobre fotografía de arquitectura, líneas guía y luz.",
        },
    },
    # 8. Craft Beer Tour — Munich Microbreweries
    {
        "iso_local": "2026-06-20 18:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "Tap House, Rosenheimer Str. 12, Munich",
        "venue_short": "Tap House",
        "lat": 48.1280,
        "lng": 11.5900,
        "is_free": False,
        "price": 45,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.tap-house.de",
        "source_label": "tap-house.de",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tour — Munich Microbreweries",
            "de": "Craft-Bier-Tour — Münchner Mikrobrauereien",
            "ru": "Тур по крафтовому пиву — микропивоварни Мюнхена",
            "uk": "Тур крафтовим пивом — мікропивоварні Мюнхена",
            "es": "Tour de cerveza artesanal — Microcervecerías de Múnich",
        },
        "bodies": {
            "en": "Beyond the big six — discover Munich's thriving craft beer scene across 4 taprooms. Sample IPAs, wheat beer innovations, and barrel-aged specialties from local microbreweries with a beer expert.",
            "de": "Jenseits der großen Sechs — entdecke Münchens blühende Craft-Bier-Szene in 4 Taprooms. Probiere IPAs, Weißbier-Innovationen und fassgereifte Spezialitäten von lokalen Mikrobrauereien mit einem Bierexperten.",
            "ru": "За пределами большой шестёрки — откройте процветающую крафтовую пивную сцену Мюнхена в 4 тапрумах. Дегустация IPA, инноваций пшеничного пива и бочковых специалитетов с пивным экспертом.",
            "uk": "За межами великої шістки — відкрийте крафтову пивну сцену Мюнхена, що процвітає, у 4 тапрумах. Дегустація IPA, інновацій пшеничного пива та бочкових спеціалітетів з пивним експертом.",
            "es": "Más allá de las seis grandes — descubre la floreciente escena cervecera artesanal de Múnich en 4 bares. Degusta IPAs, innovaciones de cerveza de trigo y especialidades envejecidas en barril con un experto.",
        },
    },
    # 9. Jazz at Jazzbar Vogler
    {
        "iso_local": "2026-06-12 20:30",
        "duration_minutes": 150,
        "category": "music",
        "address": "Jazzbar Vogler, Rumfordstr. 17, Munich",
        "venue_short": "Jazzbar Vogler",
        "lat": 48.1340,
        "lng": 11.5810,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.jazzbar-vogler.com",
        "source_label": "jazzbar-vogler.com",
        "photos": ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80"],
        "titles": {
            "en": "Jazz Night at Jazzbar Vogler",
            "de": "Jazzabend in der Jazzbar Vogler",
            "ru": "Джазовый вечер в Jazzbar Vogler",
            "uk": "Джазовий вечір у Jazzbar Vogler",
            "es": "Noche de jazz en Jazzbar Vogler",
        },
        "bodies": {
            "en": "Live jazz in Munich's coziest jazz bar. Intimate candlelit venue with world-class acoustics, featuring local and touring musicians. Classic cocktails and a warm, smoky atmosphere. Doors at 20:00.",
            "de": "Live-Jazz in Münchens gemütlichster Jazzbar. Intimes Kerzenlicht-Venue mit Weltklasse-Akustik, lokale und tourende Musiker. Klassische Cocktails und warme, rauchige Atmosphäre. Einlass ab 20:00.",
            "ru": "Живой джаз в самом уютном джаз-баре Мюнхена. Камерная площадка при свечах с акустикой мирового класса, местные и гастролирующие музыканты. Классические коктейли и тёплая атмосфера.",
            "uk": "Живий джаз у найзатишнішому джаз-барі Мюнхена. Камерна площадка при свічках з акустикою світового класу, місцеві та гастролюючі музиканти. Класичні коктейлі та тепла атмосфера.",
            "es": "Jazz en vivo en el bar de jazz más acogedor de Múnich. Lugar íntimo con velas y acústica de clase mundial, músicos locales y de gira. Cócteles clásicos y ambiente cálido. Puertas a las 20:00.",
        },
    },
    # 10. Stand-Up Comedy in English
    {
        "iso_local": "2026-06-17 20:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "Vereinsheim, Occamstr. 8, Munich",
        "venue_short": "Vereinsheim",
        "lat": 48.1580,
        "lng": 11.5870,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.munichcomedyclub.com",
        "source_label": "munichcomedyclub.com",
        "photos": ["https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80"],
        "titles": {
            "en": "Stand-Up Comedy in English — Munich",
            "de": "Stand-Up-Comedy auf Englisch — München",
            "ru": "Стендап-комедия на английском — Мюнхен",
            "uk": "Стендап-комедія англійською — Мюнхен",
            "es": "Comedia stand-up en inglés — Múnich",
        },
        "bodies": {
            "en": "International comedians perform stand-up in English at Munich's Vereinsheim. Sharp humor about German bureaucracy, Bavarian culture, and expat life. Great lineup of local and touring comics.",
            "de": "Internationale Comedians performen Stand-Up auf Englisch im Münchner Vereinsheim. Scharfer Humor über deutsche Bürokratie, bayerische Kultur und Expat-Leben. Tolles Line-up lokaler und tourender Comics.",
            "ru": "Международные комики выступают со стендапом на английском в мюнхенском Vereinsheim. Острый юмор о немецкой бюрократии, баварской культуре и жизни экспатов.",
            "uk": "Міжнародні коміки виступають зі стендапом англійською в мюнхенському Vereinsheim. Гострий гумор про німецьку бюрократію, баварську культуру та життя експатів.",
            "es": "Comediantes internacionales hacen stand-up en inglés en el Vereinsheim de Múnich. Humor agudo sobre la burocracia alemana, la cultura bávara y la vida de expatriados.",
        },
    },
    # 11. Board Games Night — Café Nerd
    {
        "iso_local": "2026-06-09 18:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Café Nerd, Brienner Str. 20, Munich",
        "venue_short": "Café Nerd",
        "lat": 48.1460,
        "lng": 11.5680,
        "is_free": False,
        "price": 5,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.cafe-nerd.de",
        "source_label": "cafe-nerd.de",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games Night — Café Nerd",
            "de": "Brettspielabend — Café Nerd",
            "ru": "Вечер настольных игр — Café Nerd",
            "uk": "Вечір настільних ігор — Café Nerd",
            "es": "Noche de juegos de mesa — Café Nerd",
        },
        "bodies": {
            "en": "Over 600 board games to choose from at Munich's geekiest café. Staff help you pick the perfect game for your group. Great for meeting new people over Catan, Terraforming Mars, or Codenames.",
            "de": "Über 600 Brettspiele zur Auswahl in Münchens nerdigstem Café. Das Personal hilft bei der Spielauswahl. Perfekt um neue Leute bei Catan, Terraforming Mars oder Codenames kennenzulernen.",
            "ru": "Более 600 настольных игр на выбор в самом гиковском кафе Мюнхена. Персонал поможет подобрать идеальную игру. Отлично для знакомств за Catan, Terraforming Mars или Codenames.",
            "uk": "Понад 600 настільних ігор на вибір у найгіковішому кафе Мюнхена. Персонал допоможе підібрати ідеальну гру. Чудово для знайомств за Catan, Terraforming Mars або Codenames.",
            "es": "Más de 600 juegos de mesa para elegir en el café más geek de Múnich. El personal te ayuda a elegir el juego perfecto. Ideal para conocer gente nueva con Catan, Terraforming Mars o Codenames.",
        },
    },
    # 12. Yoga in Olympiapark
    {
        "iso_local": "2026-06-21 09:00",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Olympiapark, Olympiasee, Munich",
        "venue_short": "Olympiapark",
        "lat": 48.1750,
        "lng": 11.5520,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/munich-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga in Olympiapark",
            "de": "Yoga im Olympiapark",
            "ru": "Йога в Олимпийском парке",
            "uk": "Йога в Олімпійському парку",
            "es": "Yoga en el Olympiapark",
        },
        "bodies": {
            "en": "Start your Sunday with outdoor yoga by the Olympiasee lake. Vinyasa flow suitable for all levels with views of the Olympic Tower. Bring your own mat and enjoy the morning calm.",
            "de": "Starte deinen Sonntag mit Outdoor-Yoga am Olympiasee. Vinyasa Flow für alle Level mit Blick auf den Olympiaturm. Eigene Matte mitbringen und die Morgenruhe genießen.",
            "ru": "Начните воскресенье с йоги на свежем воздухе у озера Олимпиазее. Виньяса-флоу для всех уровней с видом на Олимпийскую башню. Принесите свой коврик и наслаждайтесь утренним покоем.",
            "uk": "Почніть неділю з йоги на свіжому повітрі біля озера Олімпіазее. Віньяса-флоу для всіх рівнів з видом на Олімпійську вежу. Принесіть свій килимок та насолоджуйтесь ранковим спокоєм.",
            "es": "Empieza tu domingo con yoga al aire libre junto al lago Olympiasee. Vinyasa flow para todos los niveles con vistas a la Torre Olímpica. Trae tu propia esterilla y disfruta de la calma matutina.",
        },
    },
    # 13. Surfing at Eisbach Wave
    {
        "iso_local": "2026-06-13 10:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "Eisbachwelle, Prinzregentenstr., Munich",
        "venue_short": "Eisbach Wave",
        "lat": 48.1435,
        "lng": 11.5870,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.eisbachwelle.de",
        "source_label": "eisbachwelle.de",
        "photos": ["https://images.unsplash.com/photo-1502680390049-dc4466855e72?w=800&q=80"],
        "titles": {
            "en": "Surfing at Eisbach Wave",
            "de": "Surfen an der Eisbachwelle",
            "ru": "Сёрфинг на волне Айсбах",
            "uk": "Серфінг на хвилі Айсбах",
            "es": "Surf en la ola del Eisbach",
        },
        "bodies": {
            "en": "Watch or join Munich's famous river surfers at the Eisbach standing wave. Experienced surfers welcome to ride; beginners can watch and learn. A unique Munich experience in the heart of the Englischer Garten.",
            "de": "Zuschauen oder mitmachen bei Münchens berühmten Flusssurfern an der Eisbachwelle. Erfahrene Surfer willkommen; Anfänger können zuschauen und lernen. Ein einzigartiges München-Erlebnis im Herzen des Englischen Gartens.",
            "ru": "Смотрите или присоединяйтесь к знаменитым мюнхенским речным сёрферам на стоячей волне Айсбах. Опытные сёрферы приглашаются кататься; новички могут наблюдать и учиться. Уникальный мюнхенский опыт.",
            "uk": "Дивіться або приєднуйтесь до знаменитих мюнхенських річкових серферів на стоячій хвилі Айсбах. Досвідчені серфери запрошуються кататися; новачки можуть спостерігати та вчитися. Унікальний мюнхенський досвід.",
            "es": "Mira o únete a los famosos surfistas de río de Múnich en la ola estacionaria del Eisbach. Surfistas experimentados bienvenidos; principiantes pueden observar y aprender. Una experiencia única de Múnich.",
        },
    },
    # 14. Open-Air Cinema — Kino am Olympiasee
    {
        "iso_local": "2026-06-25 21:00",
        "duration_minutes": 150,
        "category": "cinema",
        "address": "Kino am Olympiasee, Olympiapark, Munich",
        "venue_short": "Kino am Olympiasee",
        "lat": 48.1730,
        "lng": 11.5500,
        "is_free": False,
        "price": 14,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.kino-am-olympiasee.de",
        "source_label": "kino-am-olympiasee.de",
        "photos": ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"],
        "titles": {
            "en": "Open-Air Cinema — Kino am Olympiasee",
            "de": "Open-Air-Kino — Kino am Olympiasee",
            "ru": "Кино под открытым небом — Kino am Olympiasee",
            "uk": "Кіно просто неба — Kino am Olympiasee",
            "es": "Cine al aire libre — Kino am Olympiasee",
        },
        "bodies": {
            "en": "Watch a film under the stars at Munich's most scenic open-air cinema by the Olympic lake. Bring a blanket, grab food from the vendors, and enjoy the summer night atmosphere. Films in OV with subtitles.",
            "de": "Film unter den Sternen in Münchens schönstem Open-Air-Kino am Olympiasee. Decke mitbringen, Essen von den Ständen holen und die Sommernacht-Atmosphäre genießen. Filme in OV mit Untertiteln.",
            "ru": "Смотрите фильм под звёздами в самом живописном кинотеатре под открытым небом Мюнхена у Олимпийского озера. Возьмите плед, купите еду у продавцов и наслаждайтесь летней ночью. Фильмы в оригинале с субтитрами.",
            "uk": "Дивіться фільм під зірками в найживописнішому кінотеатрі просто неба Мюнхена біля Олімпійського озера. Візьміть плед, купіть їжу у продавців та насолоджуйтесь літньою ніччю. Фільми в оригіналі з субтитрами.",
            "es": "Mira una película bajo las estrellas en el cine al aire libre más pintoresco de Múnich junto al lago Olímpico. Trae una manta, compra comida y disfruta del ambiente nocturno de verano. Películas en VO con subtítulos.",
        },
    },
    # 15. Pinakothek Museum Night
    {
        "iso_local": "2026-06-27 18:00",
        "duration_minutes": 360,
        "category": "museums",
        "address": "Alte Pinakothek, Barer Str. 27, Munich",
        "venue_short": "Alte Pinakothek",
        "lat": 48.1483,
        "lng": 11.5700,
        "is_free": False,
        "price": 1,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.pinakothek.de",
        "source_label": "pinakothek.de",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Pinakothek Museum Night",
            "de": "Lange Nacht der Pinakotheken",
            "ru": "Ночь Пинакотек",
            "uk": "Ніч Пінакотек",
            "es": "Noche de los Museos Pinakothek",
        },
        "bodies": {
            "en": "All three Pinakothek museums open until midnight with special exhibitions, live music, and guided tours. One ticket covers Alte, Neue, and Pinakothek der Moderne. A cultural highlight of Munich's summer.",
            "de": "Alle drei Pinakotheken bis Mitternacht geöffnet mit Sonderausstellungen, Live-Musik und Führungen. Ein Ticket für Alte, Neue und Pinakothek der Moderne. Ein kulturelles Highlight des Münchner Sommers.",
            "ru": "Все три Пинакотеки открыты до полуночи со специальными выставками, живой музыкой и экскурсиями. Один билет на Старую, Новую и Пинакотеку современности. Культурный хайлайт мюнхенского лета.",
            "uk": "Усі три Пінакотеки відчинені до півночі зі спеціальними виставками, живою музикою та екскурсіями. Один квиток на Стару, Нову та Пінакотеку сучасності. Культурний хайлайт мюнхенського літа.",
            "es": "Los tres museos Pinakothek abiertos hasta medianoche con exposiciones especiales, música en vivo y visitas guiadas. Un ticket cubre Alte, Neue y Pinakothek der Moderne. Un punto cultural del verano muniqués.",
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
    """Format YYYY-MM-DD HH:MM as '23 May 2026, 20:00' for the closing h3."""
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
            "city": "Munich",
            "city_id": MUNICH_CITY_ID,
            "country": "DE",
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
