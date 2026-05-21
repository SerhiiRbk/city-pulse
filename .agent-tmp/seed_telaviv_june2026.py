#!/usr/bin/env python3
"""
Seed 10 system events in Tel Aviv for June 2026.

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
  exec(open('.agent-tmp/seed_telaviv_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
CITY_ID = "7a919ae9-252b-4367-b1f4-32586c7e335c"
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
    # 1. White Night Festival
    {
        "iso_local": "2026-06-25 20:00",
        "duration_minutes": 360,
        "category": "music",
        "address": "Rothschild Boulevard, Tel Aviv",
        "venue_short": "Rothschild Blvd",
        "lat": 32.0640,
        "lng": 34.7750,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.tel-aviv.gov.il/whitenight",
        "source_label": "tel-aviv.gov.il",
        "photos": ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"],
        "titles": {
            "en": "White Night Festival — Tel Aviv Layla Lavan",
            "de": "White Night Festival — Tel Aviv Layla Lavan",
            "ru": "Фестиваль Белая ночь — Тель-Авив Лайла Лаван",
            "uk": "Фестиваль Біла ніч — Тель-Авів Лайла Лаван",
            "es": "Festival Noche Blanca — Tel Aviv Layla Lavan",
        },
        "bodies": {
            "en": "Tel Aviv's legendary White Night (Layla Lavan) — the city that never sleeps stays up all night with free concerts, art installations, street performances, and parties across Rothschild Boulevard and beyond.",
            "de": "Tel Avivs legendäre Weiße Nacht (Layla Lavan) — die Stadt, die nie schläft, bleibt die ganze Nacht wach mit kostenlosen Konzerten, Kunstinstallationen, Straßenperformances und Partys am Rothschild Boulevard.",
            "ru": "Легендарная Белая ночь Тель-Авива (Лайла Лаван) — город, который никогда не спит, бодрствует всю ночь с бесплатными концертами, арт-инсталляциями, уличными перформансами и вечеринками на бульваре Ротшильда.",
            "uk": "Легендарна Біла ніч Тель-Авіва (Лайла Лаван) — місто, яке ніколи не спить, не спить всю ніч з безкоштовними концертами, арт-інсталяціями, вуличними перформансами та вечірками на бульварі Ротшильда.",
            "es": "La legendaria Noche Blanca de Tel Aviv (Layla Lavan) — la ciudad que nunca duerme se queda despierta toda la noche con conciertos gratuitos, instalaciones artísticas, espectáculos callejeros y fiestas.",
        },
    },
    # 2. Beach Party — Gordon Beach
    {
        "iso_local": "2026-06-12 18:00",
        "duration_minutes": 300,
        "category": "music",
        "address": "Gordon Beach, Tel Aviv",
        "venue_short": "Gordon Beach",
        "lat": 32.0850,
        "lng": 34.7650,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-beach-parties",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"],
        "titles": {
            "en": "Beach Party — Gordon Beach Sunset",
            "de": "Strandparty — Gordon Beach Sonnenuntergang",
            "ru": "Пляжная вечеринка — закат на пляже Гордон",
            "uk": "Пляжна вечірка — захід на пляжі Гордон",
            "es": "Fiesta en la playa — Atardecer en Gordon Beach",
        },
        "bodies": {
            "en": "Dance barefoot on the sand at Gordon Beach as DJs spin house and techno into the Mediterranean sunset. Cold beer, good vibes, and the best sunset views in Tel Aviv. Free entry, all welcome!",
            "de": "Tanze barfuß im Sand am Gordon Beach, während DJs House und Techno zum Mittelmeer-Sonnenuntergang spielen. Kaltes Bier, gute Vibes und die besten Sonnenuntergangsblicke in Tel Aviv. Freier Eintritt!",
            "ru": "Танцуйте босиком на песке пляжа Гордон под хаус и техно диджеев на фоне средиземноморского заката. Холодное пиво, хорошие вайбы и лучшие виды заката в Тель-Авиве. Вход свободный!",
            "uk": "Танцюйте босоніж на піску пляжу Гордон під хаус і техно діджеїв на фоні середземноморського заходу. Холодне пиво, гарні вайби та найкращі види заходу в Тель-Авіві. Вхід вільний!",
            "es": "Baila descalzo en la arena de Gordon Beach mientras los DJs ponen house y techno con la puesta de sol mediterránea. Cerveza fría, buen ambiente y las mejores vistas del atardecer. ¡Entrada libre!",
        },
    },
    # 3. Carmel Market Food Tour
    {
        "iso_local": "2026-06-09 10:00",
        "duration_minutes": 180,
        "category": "food-tours",
        "address": "Shuk HaCarmel, Tel Aviv",
        "venue_short": "Carmel Market",
        "lat": 32.0680,
        "lng": 34.7700,
        "is_free": False,
        "price": 180,
        "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.deliciousisrael.com",
        "source_label": "deliciousisrael.com",
        "photos": ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"],
        "titles": {
            "en": "Carmel Market Food Tour — Taste of Tel Aviv",
            "de": "Carmel-Markt Food Tour — Geschmack von Tel Aviv",
            "ru": "Фуд-тур по рынку Кармель — вкус Тель-Авива",
            "uk": "Фуд-тур по ринку Кармель — смак Тель-Авіва",
            "es": "Tour gastronómico del Mercado Carmel — Sabor de Tel Aviv",
        },
        "bodies": {
            "en": "Explore the vibrant Carmel Market (Shuk HaCarmel) with a local food expert. Taste fresh hummus, halva, shakshuka, exotic fruits, and Middle Eastern spices. Learn about Israeli food culture and hidden gems.",
            "de": "Erkunde den lebhaften Carmel-Markt (Shuk HaCarmel) mit einem lokalen Food-Experten. Probiere frischen Hummus, Halva, Shakshuka, exotische Früchte und nahöstliche Gewürze. Erfahre mehr über israelische Esskultur.",
            "ru": "Исследуйте оживлённый рынок Кармель (Шук ХаКармель) с местным фуд-экспертом. Попробуйте свежий хумус, халву, шакшуку, экзотические фрукты и ближневосточные специи. Узнайте об израильской кухне.",
            "uk": "Дослідіть жвавий ринок Кармель (Шук ХаКармель) з місцевим фуд-експертом. Спробуйте свіжий хумус, халву, шакшуку, екзотичні фрукти та близькосхідні спеції. Дізнайтесь про ізраїльську кухню.",
            "es": "Explora el vibrante Mercado Carmel (Shuk HaCarmel) con un experto gastronómico local. Prueba hummus fresco, halva, shakshuka, frutas exóticas y especias de Oriente Medio. Descubre la cultura culinaria israelí.",
        },
    },
    # 4. Language Exchange — Hebrew & English
    {
        "iso_local": "2026-06-11 19:00",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Café Rothschild, Rothschild Blvd 45, Tel Aviv",
        "venue_short": "Café Rothschild",
        "lat": 32.0640,
        "lng": 34.7750,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-language-exchange",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange — Hebrew & English",
            "de": "Sprachaustausch — Hebräisch & Englisch",
            "ru": "Языковой обмен — иврит и английский",
            "uk": "Мовний обмін — іврит та англійська",
            "es": "Intercambio de idiomas — Hebreo e inglés",
        },
        "bodies": {
            "en": "Practice Hebrew and English at this friendly language exchange on Rothschild Boulevard. Rotating tables every 15 minutes, name tags, and a relaxed café atmosphere. Perfect for new olim and locals wanting to practice!",
            "de": "Übe Hebräisch und Englisch bei diesem freundlichen Sprachaustausch am Rothschild Boulevard. Rotierende Tische alle 15 Minuten, Namensschilder und entspannte Café-Atmosphäre. Perfekt für neue Olim!",
            "ru": "Практикуйте иврит и английский на этом дружеском языковом обмене на бульваре Ротшильда. Ротация столов каждые 15 минут, бейджи и расслабленная атмосфера кафе. Идеально для новых олим!",
            "uk": "Практикуйте іврит та англійську на цьому дружньому мовному обміні на бульварі Ротшильда. Ротація столів кожні 15 хвилин, бейджі та розслаблена атмосфера кафе. Ідеально для нових олім!",
            "es": "Practica hebreo e inglés en este amigable intercambio de idiomas en el Boulevard Rothschild. Mesas rotativas cada 15 minutos, etiquetas y ambiente relajado de café. ¡Perfecto para nuevos olim!",
        },
    },
    # 5. Expat Meetup — Tel Aviv Internationals
    {
        "iso_local": "2026-06-18 20:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "The Prince, Nahalat Binyamin 12, Tel Aviv",
        "venue_short": "The Prince",
        "lat": 32.0640,
        "lng": 34.7750,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/telaviv-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Tel Aviv Internationals",
            "de": "Expat-Treffen — Tel Aviv Internationals",
            "ru": "Встреча экспатов — Tel Aviv Internationals",
            "uk": "Зустріч експатів — Tel Aviv Internationals",
            "es": "Encuentro de expatriados — Tel Aviv Internationals",
        },
        "bodies": {
            "en": "Meet fellow internationals living in Tel Aviv at The Prince bar. Craft cocktails, good music, and an easy way to expand your social circle in the White City. No registration needed — just show up!",
            "de": "Triff andere Internationale in Tel Aviv in der Prince Bar. Craft-Cocktails, gute Musik und eine einfache Möglichkeit, deinen Freundeskreis in der Weißen Stadt zu erweitern. Keine Anmeldung nötig!",
            "ru": "Познакомьтесь с другими иностранцами в Тель-Авиве в баре The Prince. Крафтовые коктейли, хорошая музыка и простой способ расширить круг общения в Белом городе. Регистрация не нужна!",
            "uk": "Познайомтесь з іншими іноземцями в Тель-Авіві в барі The Prince. Крафтові коктейлі, гарна музика та простий спосіб розширити коло спілкування в Білому місті. Реєстрація не потрібна!",
            "es": "Conoce a otros internacionales en Tel Aviv en el bar The Prince. Cócteles artesanales, buena música y una forma fácil de ampliar tu círculo social en la Ciudad Blanca. ¡Sin registro!",
        },
    },
    # 6. Morning Run on the Promenade
    {
        "iso_local": "2026-06-14 06:30",
        "duration_minutes": 60,
        "category": "running",
        "address": "Tel Aviv Promenade (Tayelet), Gordon Beach",
        "venue_short": "Tayelet Promenade",
        "lat": 32.0850,
        "lng": 34.7650,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Run on the Promenade — Tel Aviv",
            "de": "Morgenlauf auf der Promenade — Tel Aviv",
            "ru": "Утренняя пробежка по набережной — Тель-Авив",
            "uk": "Ранкова пробіжка по набережній — Тель-Авів",
            "es": "Carrera matutina en el paseo marítimo — Tel Aviv",
        },
        "bodies": {
            "en": "Join a friendly 5–10 km group run along the Tel Aviv Tayelet (promenade). Mediterranean sea breeze, sunrise views, and flat beachfront path from Gordon to Jaffa. All paces welcome, iced coffee after!",
            "de": "Schließe dich einem freundlichen 5–10 km Gruppenlauf entlang der Tel Aviv Tayelet (Promenade) an. Mittelmeer-Brise, Sonnenaufgangsblicke und flacher Strandweg von Gordon bis Jaffa. Alle Tempos willkommen!",
            "ru": "Присоединяйтесь к дружеской групповой пробежке 5–10 км вдоль набережной Тель-Авива (Тайелет). Средиземноморский бриз, виды рассвета и плоская дорожка от Гордон до Яффо. Любой темп приветствуется!",
            "uk": "Приєднуйтесь до дружньої групової пробіжки 5–10 км вздовж набережної Тель-Авіва (Тайелет). Середземноморський бриз, види світанку та плоска доріжка від Гордон до Яффо. Будь-який темп вітається!",
            "es": "Únete a una carrera grupal de 5–10 km a lo largo del Tayelet de Tel Aviv. Brisa mediterránea, vistas del amanecer y camino plano desde Gordon hasta Jaffa. ¡Todos los ritmos bienvenidos, café helado después!",
        },
    },
    # 7. Bauhaus Architecture Tour
    {
        "iso_local": "2026-06-15 10:00",
        "duration_minutes": 120,
        "category": "guided-tours",
        "address": "Bauhaus Center, Dizengoff St 77, Tel Aviv",
        "venue_short": "Bauhaus Center",
        "lat": 32.0640,
        "lng": 34.7750,
        "is_free": False,
        "price": 80,
        "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.bauhaus-center.com",
        "source_label": "bauhaus-center.com",
        "photos": ["https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80"],
        "titles": {
            "en": "Bauhaus Architecture Tour — White City",
            "de": "Bauhaus-Architektur-Tour — Weiße Stadt",
            "ru": "Архитектурный тур Баухаус — Белый город",
            "uk": "Архітектурний тур Баухаус — Біле місто",
            "es": "Tour de arquitectura Bauhaus — Ciudad Blanca",
        },
        "bodies": {
            "en": "Explore Tel Aviv's UNESCO-listed White City with an architecture expert. Discover over 4,000 Bauhaus and International Style buildings, learn about the German-Jewish architects who fled Europe, and see iconic balconies and curves.",
            "de": "Erkunde Tel Avivs UNESCO-gelistete Weiße Stadt mit einem Architekturexperten. Entdecke über 4.000 Bauhaus- und Internationale-Stil-Gebäude und erfahre mehr über die deutsch-jüdischen Architekten, die aus Europa flohen.",
            "ru": "Исследуйте Белый город Тель-Авива, включённый в список ЮНЕСКО, с экспертом по архитектуре. Откройте более 4000 зданий в стиле Баухаус, узнайте о немецко-еврейских архитекторах, бежавших из Европы.",
            "uk": "Дослідіть Біле місто Тель-Авіва, включене до списку ЮНЕСКО, з експертом з архітектури. Відкрийте понад 4000 будівель у стилі Баухаус, дізнайтесь про німецько-єврейських архітекторів, що втекли з Європи.",
            "es": "Explora la Ciudad Blanca de Tel Aviv, Patrimonio de la UNESCO, con un experto en arquitectura. Descubre más de 4.000 edificios Bauhaus y aprende sobre los arquitectos judío-alemanes que huyeron de Europa.",
        },
    },
    # 8. Rooftop Bar — Sunset Drinks
    {
        "iso_local": "2026-06-19 19:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Suramare Rooftop, Herbert Samuel 10, Tel Aviv",
        "venue_short": "Suramare Rooftop",
        "lat": 32.0850,
        "lng": 34.7650,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-rooftop",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80"],
        "titles": {
            "en": "Rooftop Bar — Sunset Drinks Tel Aviv",
            "de": "Rooftop-Bar — Sonnenuntergangs-Drinks Tel Aviv",
            "ru": "Руфтоп-бар — напитки на закате Тель-Авив",
            "uk": "Руфтоп-бар — напої на заході Тель-Авів",
            "es": "Bar en la azotea — Drinks al atardecer Tel Aviv",
        },
        "bodies": {
            "en": "Watch the Mediterranean sunset from a rooftop bar with fellow expats and locals. Craft cocktails, sea views, and warm summer vibes. A relaxed way to meet new people and enjoy Tel Aviv's golden hour.",
            "de": "Beobachte den Mittelmeer-Sonnenuntergang von einer Rooftop-Bar mit Expats und Einheimischen. Craft-Cocktails, Meerblick und warme Sommer-Vibes. Eine entspannte Art, neue Leute kennenzulernen.",
            "ru": "Наблюдайте за средиземноморским закатом с руфтоп-бара с экспатами и местными. Крафтовые коктейли, виды на море и тёплые летние вайбы. Расслабленный способ познакомиться с новыми людьми.",
            "uk": "Спостерігайте за середземноморським заходом з руфтоп-бару з експатами та місцевими. Крафтові коктейлі, види на море та теплі літні вайби. Розслаблений спосіб познайомитися з новими людьми.",
            "es": "Contempla la puesta de sol mediterránea desde un bar en la azotea con expatriados y locales. Cócteles artesanales, vistas al mar y vibraciones veraniegas. Una forma relajada de conocer gente nueva.",
        },
    },
    # 9. Startup Meetup — TLV Tech
    {
        "iso_local": "2026-06-16 18:30",
        "duration_minutes": 150,
        "category": "startups",
        "address": "Google Campus TLV, Electra Tower, Tel Aviv",
        "venue_short": "Google Campus TLV",
        "lat": 32.0640,
        "lng": 34.7750,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/telaviv-startups",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80"],
        "titles": {
            "en": "Startup Meetup — TLV Tech Community",
            "de": "Startup-Treffen — TLV Tech Community",
            "ru": "Стартап-митап — TLV Tech Community",
            "uk": "Стартап-мітап — TLV Tech Community",
            "es": "Meetup de startups — TLV Tech Community",
        },
        "bodies": {
            "en": "Connect with Tel Aviv's vibrant startup ecosystem at Google Campus. Pitch sessions, networking, and talks from founders building in the Startup Nation. Open to entrepreneurs, developers, and investors.",
            "de": "Verbinde dich mit Tel Avivs lebendigem Startup-Ökosystem im Google Campus. Pitch-Sessions, Networking und Talks von Gründern in der Startup-Nation. Offen für Unternehmer, Entwickler und Investoren.",
            "ru": "Подключитесь к живой стартап-экосистеме Тель-Авива в Google Campus. Питч-сессии, нетворкинг и доклады основателей, строящих в Стартап-нации. Открыто для предпринимателей, разработчиков и инвесторов.",
            "uk": "Підключіться до живої стартап-екосистеми Тель-Авіва в Google Campus. Пітч-сесії, нетворкінг та доповіді засновників, що будують у Стартап-нації. Відкрито для підприємців, розробників та інвесторів.",
            "es": "Conéctate con el vibrante ecosistema startup de Tel Aviv en Google Campus. Sesiones de pitch, networking y charlas de fundadores en la Nación Startup. Abierto a emprendedores, desarrolladores e inversores.",
        },
    },
    # 10. Yoga on the Beach
    {
        "iso_local": "2026-06-21 06:30",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Frishman Beach, Tel Aviv",
        "venue_short": "Frishman Beach",
        "lat": 32.0850,
        "lng": 34.7650,
        "is_free": True,
        "price": None,
        "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga on the Beach — Sunrise Session",
            "de": "Yoga am Strand — Sonnenaufgangs-Session",
            "ru": "Йога на пляже — утренняя сессия на рассвете",
            "uk": "Йога на пляжі — ранкова сесія на світанку",
            "es": "Yoga en la playa — Sesión al amanecer",
        },
        "bodies": {
            "en": "Start your day with sunrise yoga on Frishman Beach. Vinyasa flow on the sand with the sound of waves and Mediterranean breeze. All levels welcome — bring your own mat and water. Pure Tel Aviv morning magic.",
            "de": "Starte deinen Tag mit Sonnenaufgangs-Yoga am Frishman Beach. Vinyasa Flow auf dem Sand mit Wellenrauschen und Mittelmeer-Brise. Alle Level willkommen — eigene Matte und Wasser mitbringen.",
            "ru": "Начните день с йоги на рассвете на пляже Фришман. Виньяса-флоу на песке под звук волн и средиземноморский бриз. Все уровни приветствуются — принесите свой коврик и воду. Утренняя магия Тель-Авива.",
            "uk": "Почніть день з йоги на світанку на пляжі Фрішман. Віньяса-флоу на піску під звук хвиль та середземноморський бриз. Всі рівні вітаються — принесіть свій килимок та воду. Ранкова магія Тель-Авіва.",
            "es": "Empieza tu día con yoga al amanecer en la playa Frishman. Vinyasa flow en la arena con el sonido de las olas y la brisa mediterránea. Todos los niveles — trae tu esterilla y agua. Magia matutina de Tel Aviv.",
        },
    },
]


# ---- Time helpers ----------------------------------------------------

def local_to_utc(iso_local: str) -> str:
    """Convert YYYY-MM-DD HH:MM (IDT = UTC+3) to ISO 8601 UTC string."""
    from datetime import datetime, timedelta
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    utc_dt = dt - timedelta(hours=3)
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
            "city": "Tel Aviv",
            "city_id": CITY_ID,
            "country": "IL",
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
