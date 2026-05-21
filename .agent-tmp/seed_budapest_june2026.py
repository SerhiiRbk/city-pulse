#!/usr/bin/env python3
"""
Seed 15 system events in Budapest for June 2026.

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
  exec(open('.agent-tmp/seed_budapest_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
BUDAPEST_CITY_ID = "ad86f0c9-1c5e-4aec-8385-d22c05a37547"
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
    # 1. Sziget Festival Warm-Up Party
    {
        "iso_local": "2026-06-20 20:00",
        "duration_minutes": 240,
        "category": "music",
        "address": "Hajógyári-sziget, Óbudai-sziget, Budapest",
        "venue_short": "Óbuda Island",
        "lat": 47.5530,
        "lng": 19.0480,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://szigetfestival.com",
        "source_label": "szigetfestival.com",
        "photos": ["https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80"],
        "titles": {
            "en": "Sziget Festival Warm-Up Party",
            "de": "Sziget Festival Warm-Up-Party",
            "ru": "Разогрев перед фестивалем Сигет",
            "uk": "Розігрів перед фестивалем Сігет",
            "es": "Fiesta de calentamiento del Festival Sziget",
        },
        "bodies": {
            "en": "Get a taste of Sziget before the main event! Live DJs, indie bands, and festival vibes on Óbuda Island. Dance under the stars and meet fellow festival-goers.",
            "de": "Erlebe einen Vorgeschmack auf Sziget! Live-DJs, Indie-Bands und Festival-Stimmung auf der Óbuda-Insel. Tanze unter den Sternen und triff andere Festivalbesucher.",
            "ru": "Почувствуйте атмосферу Сигета до начала основного фестиваля! Живые диджеи, инди-группы и фестивальное настроение на острове Обуда. Танцуйте под звёздами.",
            "uk": "Відчуйте атмосферу Сігету до початку основного фестивалю! Живі діджеї, інді-гурти та фестивальний настрій на острові Обуда. Танцюйте під зірками.",
            "es": "¡Prueba el ambiente de Sziget antes del evento principal! DJs en vivo, bandas indie y vibras festivaleras en la Isla Óbuda. Baila bajo las estrellas.",
        },
    },
    # 2. Ruin Bar Crawl — Szimpla Kert & Friends
    {
        "iso_local": "2026-06-06 20:00",
        "duration_minutes": 240,
        "category": "craft-beer",
        "address": "Szimpla Kert, Kazinczy u. 14, Budapest",
        "venue_short": "Szimpla Kert",
        "lat": 47.4960,
        "lng": 19.0620,
        "is_free": False,
        "price": 20,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://szimpla.hu",
        "source_label": "szimpla.hu",
        "photos": ["https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80"],
        "titles": {
            "en": "Ruin Bar Crawl — Szimpla Kert & Friends",
            "de": "Ruinenbar-Tour — Szimpla Kert & Freunde",
            "ru": "Тур по руин-барам — Szimpla Kert и друзья",
            "uk": "Тур руїн-барами — Szimpla Kert та друзі",
            "es": "Ruta de bares en ruinas — Szimpla Kert y amigos",
        },
        "bodies": {
            "en": "Explore Budapest's legendary ruin bars starting at Szimpla Kert. Visit 4 unique bars in the Jewish Quarter, each with its own eclectic decor and craft cocktails.",
            "de": "Entdecke Budapests legendäre Ruinenbars ab Szimpla Kert. Besuche 4 einzigartige Bars im Jüdischen Viertel, jede mit eigenem eklektischem Dekor und Craft-Cocktails.",
            "ru": "Исследуйте легендарные руин-бары Будапешта, начиная с Szimpla Kert. Посетите 4 уникальных бара в Еврейском квартале с эклектичным декором и крафтовыми коктейлями.",
            "uk": "Досліджуйте легендарні руїн-бари Будапешта, починаючи з Szimpla Kert. Відвідайте 4 унікальні бари в Єврейському кварталі з еклектичним декором та крафтовими коктейлями.",
            "es": "Explora los legendarios bares en ruinas de Budapest empezando por Szimpla Kert. Visita 4 bares únicos en el Barrio Judío, cada uno con su decoración ecléctica y cócteles artesanales.",
        },
    },
    # 3. Thermal Bath Party — Széchenyi Sparty
    {
        "iso_local": "2026-06-13 21:00",
        "duration_minutes": 300,
        "category": "dancing",
        "address": "Széchenyi Thermal Bath, Állatkerti krt. 9-11, Budapest",
        "venue_short": "Széchenyi Bath",
        "lat": 47.5185,
        "lng": 19.0820,
        "is_free": False,
        "price": 45,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://www.szechenyibath.hu",
        "source_label": "szechenyibath.hu",
        "photos": ["https://images.unsplash.com/photo-1545579133-99bb5ab189bd?w=800&q=80"],
        "titles": {
            "en": "Thermal Bath Party — Széchenyi Sparty",
            "de": "Thermalbad-Party — Széchenyi Sparty",
            "ru": "Вечеринка в термальных купальнях — Széchenyi Sparty",
            "uk": "Вечірка в термальних купальнях — Széchenyi Sparty",
            "es": "Fiesta en baños termales — Széchenyi Sparty",
        },
        "bodies": {
            "en": "Dance in the warm thermal waters of Széchenyi Bath at Budapest's famous Sparty night. DJs, laser shows, and cocktails in a stunning neo-baroque setting.",
            "de": "Tanze im warmen Thermalwasser des Széchenyi-Bads bei Budapests berühmter Sparty-Nacht. DJs, Lasershows und Cocktails in einem atemberaubenden neobarocken Ambiente.",
            "ru": "Танцуйте в тёплых термальных водах купален Сечени на знаменитой будапештской Sparty-ночи. Диджеи, лазерные шоу и коктейли в потрясающем необарочном антураже.",
            "uk": "Танцюйте в теплих термальних водах купалень Сечені на знаменитій будапештській Sparty-ночі. Діджеї, лазерні шоу та коктейлі у приголомшливому необароковому антуражі.",
            "es": "Baila en las cálidas aguas termales de Széchenyi en la famosa noche Sparty de Budapest. DJs, shows de láser y cócteles en un impresionante entorno neobarroco.",
        },
    },
    # 4. Danube Boat Cruise — Sunset Edition
    {
        "iso_local": "2026-06-07 19:00",
        "duration_minutes": 150,
        "category": "other",
        "address": "Vigadó tér Pier, Budapest",
        "venue_short": "Vigadó tér Pier",
        "lat": 47.4940,
        "lng": 19.0490,
        "is_free": False,
        "price": 30,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://www.budapestrivercruise.com",
        "source_label": "budapestrivercruise.com",
        "photos": ["https://images.unsplash.com/photo-1549877452-9c387954fbc2?w=800&q=80"],
        "titles": {
            "en": "Danube Boat Cruise — Sunset Edition",
            "de": "Donau-Bootsfahrt — Sonnenuntergang",
            "ru": "Круиз по Дунаю — закатный рейс",
            "uk": "Круїз Дунаєм — західний рейс",
            "es": "Crucero por el Danubio — Edición atardecer",
        },
        "bodies": {
            "en": "Sail past the illuminated Parliament, Buda Castle, and Chain Bridge as the sun sets over the Danube. Includes a welcome drink and live acoustic music on board.",
            "de": "Fahre am beleuchteten Parlament, der Budaer Burg und der Kettenbrücke vorbei, während die Sonne über der Donau untergeht. Inklusive Begrüßungsgetränk und Live-Akustikmusik an Bord.",
            "ru": "Проплывите мимо освещённого Парламента, Будайской крепости и Цепного моста на закате над Дунаем. Включает приветственный напиток и живую акустическую музыку на борту.",
            "uk": "Пропливіть повз освітлений Парламент, Будайську фортецю та Ланцюговий міст на заході сонця над Дунаєм. Включає вітальний напій та живу акустичну музику на борту.",
            "es": "Navega frente al Parlamento iluminado, el Castillo de Buda y el Puente de las Cadenas mientras el sol se pone sobre el Danubio. Incluye bebida de bienvenida y música acústica en vivo.",
        },
    },
    # 5. Hungarian Cooking Class — Goulash & Strudel
    {
        "iso_local": "2026-06-10 17:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Chefparade Cooking School, Sas u. 12, Budapest",
        "venue_short": "Chefparade",
        "lat": 47.5010,
        "lng": 19.0500,
        "is_free": False,
        "price": 55,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.chefparade.hu",
        "source_label": "chefparade.hu",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Hungarian Cooking Class — Goulash & Strudel",
            "de": "Ungarischer Kochkurs — Gulasch & Strudel",
            "ru": "Кулинарный класс — гуляш и штрудель",
            "uk": "Кулінарний клас — гуляш та штрудель",
            "es": "Clase de cocina húngara — Goulash y Strudel",
        },
        "bodies": {
            "en": "Learn to cook authentic Hungarian goulash and apple strudel from scratch. Hands-on class with local chef, includes all ingredients, recipes, and a shared dinner with wine.",
            "de": "Lerne authentisches ungarisches Gulasch und Apfelstrudel von Grund auf zu kochen. Praxiskurs mit lokalem Koch, inklusive aller Zutaten, Rezepte und gemeinsamem Abendessen mit Wein.",
            "ru": "Научитесь готовить настоящий венгерский гуляш и яблочный штрудель с нуля. Практический класс с местным шефом, включая все ингредиенты, рецепты и совместный ужин с вином.",
            "uk": "Навчіться готувати справжній угорський гуляш та яблучний штрудель з нуля. Практичний клас з місцевим шефом, включаючи всі інгредієнти, рецепти та спільну вечерю з вином.",
            "es": "Aprende a cocinar auténtico goulash húngaro y strudel de manzana desde cero. Clase práctica con chef local, incluye todos los ingredientes, recetas y cena compartida con vino.",
        },
    },
    # 6. Language Exchange — Budapest Polyglot Meetup
    {
        "iso_local": "2026-06-11 18:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Központ, Madách Imre út 5, Budapest",
        "venue_short": "Központ",
        "lat": 47.4980,
        "lng": 19.0590,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "hu", "de"],
        "source_url": "https://www.meetup.com/budapest-polyglot",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange — Budapest Polyglot Meetup",
            "de": "Sprachaustausch — Budapest Polyglot Meetup",
            "ru": "Языковой обмен — Budapest Polyglot Meetup",
            "uk": "Мовний обмін — Budapest Polyglot Meetup",
            "es": "Intercambio de idiomas — Budapest Polyglot Meetup",
        },
        "bodies": {
            "en": "Practice Hungarian, English, German, and more at this friendly polyglot meetup. Rotating tables every 15 minutes, name tags with flags, and a relaxed bar atmosphere.",
            "de": "Übe Ungarisch, Englisch, Deutsch und mehr bei diesem freundlichen Polyglot-Treffen. Rotierende Tische alle 15 Minuten, Namensschilder mit Flaggen und entspannte Bar-Atmosphäre.",
            "ru": "Практикуйте венгерский, английский, немецкий и другие языки на этой дружеской полиглот-встрече. Ротация столов каждые 15 минут, бейджи с флагами и расслабленная атмосфера бара.",
            "uk": "Практикуйте угорську, англійську, німецьку та інші мови на цій дружній поліглот-зустрічі. Ротація столів кожні 15 хвилин, бейджі з прапорами та розслаблена атмосфера бару.",
            "es": "Practica húngaro, inglés, alemán y más en este encuentro políglota amigable. Mesas rotativas cada 15 minutos, etiquetas con banderas y ambiente relajado de bar.",
        },
    },
    # 7. Expat Meetup — Budapest Internationals
    {
        "iso_local": "2026-06-18 19:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Morrison's 2, Szent István krt. 11, Budapest",
        "venue_short": "Morrison's 2",
        "lat": 47.5080,
        "lng": 19.0530,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/budapest-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Budapest Internationals",
            "de": "Expat-Treffen — Budapest Internationals",
            "ru": "Встреча экспатов — Budapest Internationals",
            "uk": "Зустріч експатів — Budapest Internationals",
            "es": "Encuentro de expatriados — Budapest Internationals",
        },
        "bodies": {
            "en": "Meet fellow internationals living in Budapest over drinks and good conversation. A welcoming space for newcomers and long-term residents alike. No registration needed, just show up!",
            "de": "Triff andere Internationale in Budapest bei Drinks und guten Gesprächen. Ein einladender Ort für Neuankömmlinge und Langzeitbewohner. Keine Anmeldung nötig, einfach vorbeikommen!",
            "ru": "Познакомьтесь с другими иностранцами, живущими в Будапеште, за напитками и приятной беседой. Гостеприимное место для новичков и давних жителей. Регистрация не нужна!",
            "uk": "Познайомтесь з іншими іноземцями, що живуть у Будапешті, за напоями та приємною розмовою. Привітне місце для новачків та давніх мешканців. Реєстрація не потрібна!",
            "es": "Conoce a otros internacionales que viven en Budapest tomando algo y conversando. Un espacio acogedor para recién llegados y residentes de largo plazo. ¡Sin registro, solo ven!",
        },
    },
    # 8. Morning Run Along the Danube
    {
        "iso_local": "2026-06-14 07:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Shoes on the Danube Bank, Budapest",
        "venue_short": "Danube Promenade",
        "lat": 47.5040,
        "lng": 19.0440,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://www.meetup.com/budapest-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Run Along the Danube",
            "de": "Morgenlauf entlang der Donau",
            "ru": "Утренняя пробежка вдоль Дуная",
            "uk": "Ранкова пробіжка вздовж Дунаю",
            "es": "Carrera matutina a lo largo del Danubio",
        },
        "bodies": {
            "en": "Join a friendly 5–10 km group run along the Pest-side Danube promenade. Pass the Parliament, Shoes memorial, and Chain Bridge. All paces welcome, coffee after!",
            "de": "Schließe dich einem freundlichen 5–10 km Gruppenlauf entlang der Donaupromenade auf der Pest-Seite an. Am Parlament, Schuhe-Denkmal und der Kettenbrücke vorbei. Alle Tempos willkommen!",
            "ru": "Присоединяйтесь к дружеской групповой пробежке 5–10 км вдоль набережной Дуная на стороне Пешта. Мимо Парламента, мемориала «Туфли» и Цепного моста. Любой темп приветствуется!",
            "uk": "Приєднуйтесь до дружньої групової пробіжки 5–10 км вздовж набережної Дунаю на стороні Пешта. Повз Парламент, меморіал «Черевики» та Ланцюговий міст. Будь-який темп вітається!",
            "es": "Únete a una carrera grupal amigable de 5–10 km por el paseo del Danubio en el lado de Pest. Pasa por el Parlamento, el memorial de los Zapatos y el Puente de las Cadenas. ¡Todos los ritmos bienvenidos!",
        },
    },
    # 9. Photography Walk — Parliament & Danube
    {
        "iso_local": "2026-06-15 17:30",
        "duration_minutes": 120,
        "category": "photography",
        "address": "Kossuth Lajos tér, Budapest",
        "venue_short": "Parliament Square",
        "lat": 47.5070,
        "lng": 19.0450,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/budapest-photography",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1551867633-194f125bddfa?w=800&q=80"],
        "titles": {
            "en": "Photography Walk — Parliament & Danube",
            "de": "Fotowalk — Parlament & Donau",
            "ru": "Фотопрогулка — Парламент и Дунай",
            "uk": "Фотопрогулянка — Парламент та Дунай",
            "es": "Paseo fotográfico — Parlamento y Danubio",
        },
        "bodies": {
            "en": "Capture Budapest's iconic Parliament building and Danube riverfront during golden hour. Tips on composition, long exposure, and night photography. All camera types welcome.",
            "de": "Fotografiere Budapests ikonisches Parlamentsgebäude und die Donauuferfront zur goldenen Stunde. Tipps zu Komposition, Langzeitbelichtung und Nachtfotografie. Alle Kameratypen willkommen.",
            "ru": "Снимайте культовое здание Парламента Будапешта и набережную Дуная в золотой час. Советы по композиции, длинной выдержке и ночной фотографии. Любые камеры приветствуются.",
            "uk": "Знімайте культову будівлю Парламенту Будапешта та набережну Дунаю в золоту годину. Поради щодо композиції, довгої витримки та нічної фотографії. Будь-які камери вітаються.",
            "es": "Captura el icónico edificio del Parlamento de Budapest y la ribera del Danubio durante la hora dorada. Consejos sobre composición, larga exposición y fotografía nocturna. Todas las cámaras bienvenidas.",
        },
    },
    # 10. Craft Beer Tour — Budapest Breweries
    {
        "iso_local": "2026-06-19 18:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "FIRST Craft Beer, Kazinczy u. 42, Budapest",
        "venue_short": "FIRST Craft Beer",
        "lat": 47.4970,
        "lng": 19.0640,
        "is_free": False,
        "price": 35,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.firstcraftbeer.com",
        "source_label": "firstcraftbeer.com",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tour — Budapest Breweries",
            "de": "Craft-Bier-Tour — Budapester Brauereien",
            "ru": "Тур по крафтовому пиву — пивоварни Будапешта",
            "uk": "Тур крафтовим пивом — пивоварні Будапешта",
            "es": "Tour de cerveza artesanal — Cervecerías de Budapest",
        },
        "bodies": {
            "en": "Taste Hungary's booming craft beer scene across 4 taprooms in the Jewish Quarter. Sample IPAs, sours, and stouts from local breweries with a knowledgeable guide.",
            "de": "Erlebe Ungarns boomende Craft-Bier-Szene in 4 Taprooms im Jüdischen Viertel. Probiere IPAs, Sours und Stouts von lokalen Brauereien mit einem sachkundigen Guide.",
            "ru": "Попробуйте бурно развивающуюся крафтовую пивную сцену Венгрии в 4 тапрумах Еврейского квартала. Дегустация IPA, сауров и стаутов от местных пивоварен с опытным гидом.",
            "uk": "Спробуйте крафтову пивну сцену Угорщини, що бурхливо розвивається, у 4 тапрумах Єврейського кварталу. Дегустація IPA, саурів та стаутів від місцевих пивоварень з досвідченим гідом.",
            "es": "Prueba la floreciente escena cervecera artesanal de Hungría en 4 bares del Barrio Judío. Degusta IPAs, sours y stouts de cervecerías locales con un guía experto.",
        },
    },
    # 11. Jazz Night at Budapest Jazz Club
    {
        "iso_local": "2026-06-12 20:30",
        "duration_minutes": 150,
        "category": "music",
        "address": "Budapest Jazz Club, Hollán Ernő u. 7, Budapest",
        "venue_short": "Budapest Jazz Club",
        "lat": 47.5120,
        "lng": 19.0560,
        "is_free": False,
        "price": 18,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://www.bjc.hu",
        "source_label": "bjc.hu",
        "photos": ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80"],
        "titles": {
            "en": "Jazz Night at Budapest Jazz Club",
            "de": "Jazzabend im Budapest Jazz Club",
            "ru": "Джазовый вечер в Budapest Jazz Club",
            "uk": "Джазовий вечір у Budapest Jazz Club",
            "es": "Noche de jazz en Budapest Jazz Club",
        },
        "bodies": {
            "en": "Live jazz performance featuring local Hungarian jazz musicians. Intimate venue with excellent acoustics, craft cocktails, and a warm atmosphere. Doors open at 20:00.",
            "de": "Live-Jazz-Auftritt mit lokalen ungarischen Jazzmusikern. Intimes Venue mit exzellenter Akustik, Craft-Cocktails und warmer Atmosphäre. Einlass ab 20:00.",
            "ru": "Живое джазовое выступление местных венгерских джазовых музыкантов. Камерная площадка с отличной акустикой, крафтовыми коктейлями и тёплой атмосферой. Двери открываются в 20:00.",
            "uk": "Живий джазовий виступ місцевих угорських джазових музикантів. Камерна площадка з чудовою акустикою, крафтовими коктейлями та теплою атмосферою. Двері відчиняються о 20:00.",
            "es": "Actuación de jazz en vivo con músicos húngaros locales. Lugar íntimo con excelente acústica, cócteles artesanales y ambiente cálido. Puertas abren a las 20:00.",
        },
    },
    # 12. Stand-Up Comedy in English
    {
        "iso_local": "2026-06-17 20:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "Dumaszínház, Nagymező u. 5, Budapest",
        "venue_short": "Dumaszínház",
        "lat": 47.5030,
        "lng": 19.0560,
        "is_free": False,
        "price": 12,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.budapestcomedy.com",
        "source_label": "budapestcomedy.com",
        "photos": ["https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80"],
        "titles": {
            "en": "Stand-Up Comedy in English",
            "de": "Stand-Up-Comedy auf Englisch",
            "ru": "Стендап-комедия на английском",
            "uk": "Стендап-комедія англійською",
            "es": "Comedia stand-up en inglés",
        },
        "bodies": {
            "en": "International comedians perform stand-up in English at Budapest's top comedy venue. Sharp observational humor about expat life, dating, and cultural clashes. Two-drink minimum.",
            "de": "Internationale Comedians performen Stand-Up auf Englisch in Budapests Top-Comedy-Venue. Scharfer Beobachtungshumor über Expat-Leben, Dating und kulturelle Zusammenstöße.",
            "ru": "Международные комики выступают со стендапом на английском в лучшем комедийном клубе Будапешта. Острый наблюдательный юмор о жизни экспатов, свиданиях и культурных столкновениях.",
            "uk": "Міжнародні коміки виступають зі стендапом англійською в найкращому комедійному клубі Будапешта. Гострий спостережливий гумор про життя експатів, побачення та культурні зіткнення.",
            "es": "Comediantes internacionales hacen stand-up en inglés en el mejor local de comedia de Budapest. Humor observacional agudo sobre la vida de expatriados, citas y choques culturales.",
        },
    },
    # 13. Board Games Night — Játékos Café
    {
        "iso_local": "2026-06-09 18:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Játékos Board Game Café, Rumbach S. u. 10, Budapest",
        "venue_short": "Játékos Café",
        "lat": 47.4975,
        "lng": 19.0600,
        "is_free": False,
        "price": 5,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://www.jatekos.hu",
        "source_label": "jatekos.hu",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games Night — Játékos Café",
            "de": "Brettspielabend — Játékos Café",
            "ru": "Вечер настольных игр — Játékos Café",
            "uk": "Вечір настільних ігор — Játékos Café",
            "es": "Noche de juegos de mesa — Játékos Café",
        },
        "bodies": {
            "en": "Over 500 board games to choose from at this cozy café. Staff help you pick the perfect game for your group. Great for meeting new people over Catan, Codenames, or Azul.",
            "de": "Über 500 Brettspiele zur Auswahl in diesem gemütlichen Café. Das Personal hilft bei der Spielauswahl. Perfekt um neue Leute bei Catan, Codenames oder Azul kennenzulernen.",
            "ru": "Более 500 настольных игр на выбор в этом уютном кафе. Персонал поможет подобрать идеальную игру для вашей группы. Отлично для знакомств за Catan, Codenames или Azul.",
            "uk": "Понад 500 настільних ігор на вибір у цьому затишному кафе. Персонал допоможе підібрати ідеальну гру для вашої групи. Чудово для знайомств за Catan, Codenames або Azul.",
            "es": "Más de 500 juegos de mesa para elegir en este acogedor café. El personal te ayuda a elegir el juego perfecto. Ideal para conocer gente nueva con Catan, Codenames o Azul.",
        },
    },
    # 14. Yoga in Margaret Island
    {
        "iso_local": "2026-06-21 08:00",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Margaret Island, Japanese Garden, Budapest",
        "venue_short": "Margaret Island",
        "lat": 47.5250,
        "lng": 19.0480,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://www.meetup.com/budapest-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga in Margaret Island",
            "de": "Yoga auf der Margareteninsel",
            "ru": "Йога на острове Маргит",
            "uk": "Йога на острові Маргіт",
            "es": "Yoga en la Isla Margarita",
        },
        "bodies": {
            "en": "Start your Sunday with outdoor yoga in the Japanese Garden on Margaret Island. Vinyasa flow suitable for all levels, surrounded by fountains and century-old trees. Bring your own mat.",
            "de": "Starte deinen Sonntag mit Outdoor-Yoga im Japanischen Garten auf der Margareteninsel. Vinyasa Flow für alle Level, umgeben von Brunnen und hundertjährigen Bäumen. Eigene Matte mitbringen.",
            "ru": "Начните воскресенье с йоги на свежем воздухе в Японском саду на острове Маргит. Виньяса-флоу для всех уровней, в окружении фонтанов и вековых деревьев. Принесите свой коврик.",
            "uk": "Почніть неділю з йоги на свіжому повітрі в Японському саду на острові Маргіт. Віньяса-флоу для всіх рівнів, в оточенні фонтанів та столітніх дерев. Принесіть свій килимок.",
            "es": "Empieza tu domingo con yoga al aire libre en el Jardín Japonés de la Isla Margarita. Vinyasa flow para todos los niveles, rodeado de fuentes y árboles centenarios. Trae tu propia esterilla.",
        },
    },
    # 15. Night of Museums — Budapest
    {
        "iso_local": "2026-06-27 18:00",
        "duration_minutes": 480,
        "category": "museums",
        "address": "Hungarian National Museum, Múzeum krt. 14-16, Budapest",
        "venue_short": "National Museum",
        "lat": 47.4920,
        "lng": 19.0620,
        "is_free": False,
        "price": 8,
        "currency": "EUR",
        "languages": ["en", "hu"],
        "source_url": "https://www.muzej.hu",
        "source_label": "muzej.hu",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Night of Museums — Budapest",
            "de": "Lange Nacht der Museen — Budapest",
            "ru": "Ночь музеев — Будапешт",
            "uk": "Ніч музеїв — Будапешт",
            "es": "Noche de los Museos — Budapest",
        },
        "bodies": {
            "en": "Over 200 museums, galleries, and cultural venues open their doors until 2 AM. One wristband grants access to all locations with special programs, concerts, and guided tours throughout the night.",
            "de": "Über 200 Museen, Galerien und Kulturstätten öffnen ihre Türen bis 2 Uhr morgens. Ein Armband gewährt Zugang zu allen Orten mit Sonderprogrammen, Konzerten und Führungen die ganze Nacht.",
            "ru": "Более 200 музеев, галерей и культурных площадок открывают двери до 2 часов ночи. Один браслет даёт доступ ко всем локациям со специальными программами, концертами и экскурсиями всю ночь.",
            "uk": "Понад 200 музеїв, галерей та культурних закладів відчиняють двері до 2-ї ночі. Один браслет дає доступ до всіх локацій зі спеціальними програмами, концертами та екскурсіями всю ніч.",
            "es": "Más de 200 museos, galerías y espacios culturales abren sus puertas hasta las 2 AM. Una pulsera da acceso a todas las ubicaciones con programas especiales, conciertos y visitas guiadas toda la noche.",
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
            "city": "Budapest",
            "city_id": BUDAPEST_CITY_ID,
            "country": "HU",
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
