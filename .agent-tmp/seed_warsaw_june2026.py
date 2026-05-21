#!/usr/bin/env python3
"""
Seed 15 system events in Warsaw for June 2026.

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
  exec(open('.agent-tmp/seed_warsaw_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
WARSAW_CITY_ID = "8dc97188-f92e-4f24-83d8-61a6c191b5af"
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
    # 1. Open'er Festival Warm-Up Party
    {
        "iso_local": "2026-06-20 21:00",
        "duration_minutes": 240,
        "category": "music",
        "address": "Progresja Music Zone, Fort Wola 22, Warsaw",
        "venue_short": "Progresja",
        "lat": 52.2320,
        "lng": 20.9680,
        "is_free": False,
        "price": 60,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://opener.pl",
        "source_label": "opener.pl",
        "photos": ["https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80"],
        "titles": {
            "en": "Open'er Festival Warm-Up Party",
            "de": "Open'er Festival Warm-Up-Party",
            "ru": "Разогрев перед фестивалем Open'er",
            "uk": "Розігрів перед фестивалем Open'er",
            "es": "Fiesta de calentamiento del Festival Open'er",
        },
        "bodies": {
            "en": "Get hyped for Open'er Festival with a warm-up party featuring DJs and indie acts from this year's lineup. Electronic beats, live visuals, and festival merch available.",
            "de": "Mach dich bereit für das Open'er Festival mit einer Warm-Up-Party mit DJs und Indie-Acts aus dem diesjährigen Line-up. Elektronische Beats, Live-Visuals und Festival-Merch.",
            "ru": "Настройтесь на фестиваль Open'er на разогревающей вечеринке с диджеями и инди-артистами из лайнапа этого года. Электронные биты, живые визуалы и фестивальный мерч.",
            "uk": "Налаштуйтесь на фестиваль Open'er на розігрівальній вечірці з діджеями та інді-артистами з лайнапу цього року. Електронні біти, живі візуали та фестивальний мерч.",
            "es": "Prepárate para el Festival Open'er con una fiesta de calentamiento con DJs y actos indie del cartel de este año. Beats electrónicos, visuales en vivo y merchandising del festival.",
        },
    },
    # 2. Rooftop Bars — Warsaw Skyline Night
    {
        "iso_local": "2026-06-13 19:00",
        "duration_minutes": 240,
        "category": "networking",
        "address": "The View Warsaw, Al. Jerozolimskie 44, Warsaw",
        "venue_short": "The View Warsaw",
        "lat": 52.2290,
        "lng": 21.0030,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://www.theviewwarsaw.com",
        "source_label": "theviewwarsaw.com",
        "photos": ["https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80"],
        "titles": {
            "en": "Rooftop Bars — Warsaw Skyline Night",
            "de": "Rooftop-Bars — Warschauer Skyline-Nacht",
            "ru": "Руфтоп-бары — ночь с видом на Варшаву",
            "uk": "Руфтоп-бари — ніч з видом на Варшаву",
            "es": "Bares en azotea — Noche del skyline de Varsovia",
        },
        "bodies": {
            "en": "Enjoy panoramic views of Warsaw's skyline from the city's best rooftop bars. Craft cocktails, sunset vibes, and networking with the international community. Dress smart casual.",
            "de": "Genieße Panoramablicke auf Warschaus Skyline von den besten Rooftop-Bars der Stadt. Craft-Cocktails, Sonnenuntergangs-Vibes und Networking mit der internationalen Community.",
            "ru": "Наслаждайтесь панорамными видами на горизонт Варшавы из лучших руфтоп-баров города. Крафтовые коктейли, закатные вайбы и нетворкинг с международным сообществом.",
            "uk": "Насолоджуйтесь панорамними видами на горизонт Варшави з найкращих руфтоп-барів міста. Крафтові коктейлі, закатні вайби та нетворкінг з міжнародною спільнотою.",
            "es": "Disfruta de vistas panorámicas del skyline de Varsovia desde los mejores bares en azotea. Cócteles artesanales, vibras de atardecer y networking con la comunidad internacional.",
        },
    },
    # 3. Polish Cooking Class — Pierogi & Bigos
    {
        "iso_local": "2026-06-08 16:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Polish Your Cooking, Miodowa 10, Warsaw",
        "venue_short": "Polish Your Cooking",
        "lat": 52.2480,
        "lng": 21.0100,
        "is_free": False,
        "price": 200,
        "currency": "PLN",
        "languages": ["en"],
        "source_url": "https://www.polishyourcooking.com",
        "source_label": "polishyourcooking.com",
        "photos": ["https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80"],
        "titles": {
            "en": "Polish Cooking Class — Pierogi & Bigos",
            "de": "Polnischer Kochkurs — Pierogi & Bigos",
            "ru": "Кулинарный класс — пироги и бигос",
            "uk": "Кулінарний клас — пироги та бігос",
            "es": "Clase de cocina polaca — Pierogi y Bigos",
        },
        "bodies": {
            "en": "Learn to make authentic Polish pierogi (dumplings) and bigos (hunter's stew) from scratch. Hands-on class with a local chef, includes all ingredients and a shared feast with Polish vodka tasting.",
            "de": "Lerne authentische polnische Pierogi und Bigos (Jägereintopf) von Grund auf zu kochen. Praxiskurs mit lokalem Koch, inklusive aller Zutaten und gemeinsamem Festmahl mit polnischer Wodka-Verkostung.",
            "ru": "Научитесь готовить настоящие польские пироги (вареники) и бигос (охотничье рагу) с нуля. Практический класс с местным шефом, включая все ингредиенты и совместный пир с дегустацией польской водки.",
            "uk": "Навчіться готувати справжні польські пироги (вареники) та бігос (мисливське рагу) з нуля. Практичний клас з місцевим шефом, включаючи всі інгредієнти та спільний бенкет з дегустацією польської горілки.",
            "es": "Aprende a hacer auténticos pierogi polacos y bigos (estofado del cazador) desde cero. Clase práctica con chef local, incluye todos los ingredientes y un festín compartido con degustación de vodka polaco.",
        },
    },
    # 4. Chopin Concert in Łazienki Park
    {
        "iso_local": "2026-06-14 12:00",
        "duration_minutes": 90,
        "category": "music",
        "address": "Łazienki Park, Chopin Monument, Warsaw",
        "venue_short": "Łazienki Park",
        "lat": 52.2150,
        "lng": 21.0350,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["pl", "en"],
        "source_url": "https://www.lazienki-krolewskie.pl",
        "source_label": "lazienki-krolewskie.pl",
        "photos": ["https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80"],
        "titles": {
            "en": "Chopin Concert in Łazienki Park",
            "de": "Chopin-Konzert im Łazienki-Park",
            "ru": "Концерт Шопена в парке Лазенки",
            "uk": "Концерт Шопена в парку Лазенки",
            "es": "Concierto de Chopin en el Parque Łazienki",
        },
        "bodies": {
            "en": "Free open-air Chopin piano recital at the iconic Chopin Monument in Łazienki Park. A beloved Warsaw summer tradition since 1959. Bring a blanket and enjoy world-class pianists in a stunning garden setting.",
            "de": "Kostenloses Open-Air-Chopin-Klavierrezital am ikonischen Chopin-Denkmal im Łazienki-Park. Eine beliebte Warschauer Sommertradition seit 1959. Decke mitbringen und Weltklasse-Pianisten im Garten genießen.",
            "ru": "Бесплатный концерт фортепианной музыки Шопена под открытым небом у культового памятника Шопену в парке Лазенки. Любимая варшавская летняя традиция с 1959 года. Возьмите плед и наслаждайтесь.",
            "uk": "Безкоштовний концерт фортепіанної музики Шопена просто неба біля культового пам'ятника Шопену в парку Лазенки. Улюблена варшавська літня традиція з 1959 року. Візьміть плед та насолоджуйтесь.",
            "es": "Recital gratuito de piano de Chopin al aire libre junto al icónico Monumento a Chopin en el Parque Łazienki. Una querida tradición veraniega de Varsovia desde 1959. Trae una manta y disfruta.",
        },
    },
    # 5. Language Exchange — Warsaw Polyglot Meetup
    {
        "iso_local": "2026-06-11 18:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Café Kulturalna, Plac Defilad 1, Warsaw",
        "venue_short": "Café Kulturalna",
        "lat": 52.2320,
        "lng": 21.0060,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["en", "pl", "de"],
        "source_url": "https://www.meetup.com/warsaw-polyglot",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange — Warsaw Polyglot Meetup",
            "de": "Sprachaustausch — Warschau Polyglot Meetup",
            "ru": "Языковой обмен — Warsaw Polyglot Meetup",
            "uk": "Мовний обмін — Warsaw Polyglot Meetup",
            "es": "Intercambio de idiomas — Warsaw Polyglot Meetup",
        },
        "bodies": {
            "en": "Practice Polish, English, German, and more at this friendly polyglot meetup in the iconic Palace of Culture. Rotating tables every 15 minutes, name tags with flags, and a relaxed café atmosphere.",
            "de": "Übe Polnisch, Englisch, Deutsch und mehr bei diesem freundlichen Polyglot-Treffen im ikonischen Kulturpalast. Rotierende Tische alle 15 Minuten, Namensschilder mit Flaggen und entspannte Café-Atmosphäre.",
            "ru": "Практикуйте польский, английский, немецкий и другие языки на этой дружеской полиглот-встрече в культовом Дворце культуры. Ротация столов каждые 15 минут, бейджи с флагами.",
            "uk": "Практикуйте польську, англійську, німецьку та інші мови на цій дружній поліглот-зустрічі в культовому Палаці культури. Ротація столів кожні 15 хвилин, бейджі з прапорами.",
            "es": "Practica polaco, inglés, alemán y más en este encuentro políglota amigable en el icónico Palacio de la Cultura. Mesas rotativas cada 15 minutos, etiquetas con banderas y ambiente relajado de café.",
        },
    },
    # 6. Expat Meetup — Warsaw Internationals
    {
        "iso_local": "2026-06-18 19:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Pawilony, Nowy Świat 22/28, Warsaw",
        "venue_short": "Pawilony",
        "lat": 52.2310,
        "lng": 21.0180,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/warsaw-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Warsaw Internationals",
            "de": "Expat-Treffen — Warsaw Internationals",
            "ru": "Встреча экспатов — Warsaw Internationals",
            "uk": "Зустріч експатів — Warsaw Internationals",
            "es": "Encuentro de expatriados — Warsaw Internationals",
        },
        "bodies": {
            "en": "Meet fellow internationals living in Warsaw at the legendary Pawilony bar complex. Cheap drinks, great vibes, and an easy way to expand your social circle. No registration needed!",
            "de": "Triff andere Internationale in Warschau im legendären Pawilony-Barkomplex. Günstige Drinks, tolle Stimmung und eine einfache Möglichkeit, deinen Freundeskreis zu erweitern. Keine Anmeldung nötig!",
            "ru": "Познакомьтесь с другими иностранцами, живущими в Варшаве, в легендарном барном комплексе Павилоны. Дешёвые напитки, отличная атмосфера и простой способ расширить круг общения!",
            "uk": "Познайомтесь з іншими іноземцями, що живуть у Варшаві, в легендарному барному комплексі Павільйони. Дешеві напої, чудова атмосфера та простий спосіб розширити коло спілкування!",
            "es": "Conoce a otros internacionales que viven en Varsovia en el legendario complejo de bares Pawilony. Bebidas baratas, buen ambiente y una forma fácil de ampliar tu círculo social. ¡Sin registro!",
        },
    },
    # 7. Morning Run in Łazienki Park
    {
        "iso_local": "2026-06-15 07:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Łazienki Park, Main Entrance, Warsaw",
        "venue_short": "Łazienki Park",
        "lat": 52.2150,
        "lng": 21.0350,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://www.meetup.com/warsaw-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Run in Łazienki Park",
            "de": "Morgenlauf im Łazienki-Park",
            "ru": "Утренняя пробежка в парке Лазенки",
            "uk": "Ранкова пробіжка в парку Лазенки",
            "es": "Carrera matutina en el Parque Łazienki",
        },
        "bodies": {
            "en": "Join a friendly 5–8 km group run through Warsaw's most beautiful park. Past peacocks, the Palace on the Isle, and the Chopin Monument. All paces welcome, coffee after at a nearby café.",
            "de": "Schließe dich einem freundlichen 5–8 km Gruppenlauf durch Warschaus schönsten Park an. Vorbei an Pfauen, dem Palast auf der Insel und dem Chopin-Denkmal. Alle Tempos willkommen!",
            "ru": "Присоединяйтесь к дружеской групповой пробежке 5–8 км по самому красивому парку Варшавы. Мимо павлинов, Дворца на острове и памятника Шопену. Любой темп приветствуется!",
            "uk": "Приєднуйтесь до дружньої групової пробіжки 5–8 км найкрасивішим парком Варшави. Повз павлінів, Палац на острові та пам'ятник Шопену. Будь-який темп вітається!",
            "es": "Únete a una carrera grupal amigable de 5–8 km por el parque más hermoso de Varsovia. Pasa por pavos reales, el Palacio en la Isla y el Monumento a Chopin. ¡Todos los ritmos bienvenidos!",
        },
    },
    # 8. Photography Walk — Old Town Warsaw
    {
        "iso_local": "2026-06-16 17:30",
        "duration_minutes": 120,
        "category": "photography",
        "address": "Castle Square, Plac Zamkowy, Warsaw",
        "venue_short": "Old Town",
        "lat": 52.2500,
        "lng": 21.0120,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/warsaw-photography",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=800&q=80"],
        "titles": {
            "en": "Photography Walk — Old Town Warsaw",
            "de": "Fotowalk — Warschauer Altstadt",
            "ru": "Фотопрогулка — Старый город Варшавы",
            "uk": "Фотопрогулянка — Старе місто Варшави",
            "es": "Paseo fotográfico — Casco antiguo de Varsovia",
        },
        "bodies": {
            "en": "Capture Warsaw's beautifully reconstructed Old Town during golden hour. From Castle Square to the Barbican, learn composition tips and street photography techniques. All camera types welcome.",
            "de": "Fotografiere Warschaus wunderschön rekonstruierte Altstadt zur goldenen Stunde. Vom Schlossplatz bis zur Barbakane — Kompositionstipps und Straßenfotografie-Techniken. Alle Kameratypen willkommen.",
            "ru": "Снимайте красиво восстановленный Старый город Варшавы в золотой час. От Замковой площади до Барбакана — советы по композиции и уличной фотографии. Любые камеры приветствуются.",
            "uk": "Знімайте красиво відновлене Старе місто Варшави в золоту годину. Від Замкової площі до Барбакану — поради щодо композиції та вуличної фотографії. Будь-які камери вітаються.",
            "es": "Captura el hermoso casco antiguo reconstruido de Varsovia durante la hora dorada. Desde la Plaza del Castillo hasta la Barbacana, aprende consejos de composición y fotografía callejera.",
        },
    },
    # 9. Craft Beer Tour — Warsaw Breweries
    {
        "iso_local": "2026-06-19 18:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "Kufle i Kapsle, Nowogrodzka 25, Warsaw",
        "venue_short": "Kufle i Kapsle",
        "lat": 52.2270,
        "lng": 21.0100,
        "is_free": False,
        "price": 120,
        "currency": "PLN",
        "languages": ["en"],
        "source_url": "https://www.kufleikapsel.pl",
        "source_label": "kufleikapsel.pl",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tour — Warsaw Breweries",
            "de": "Craft-Bier-Tour — Warschauer Brauereien",
            "ru": "Тур по крафтовому пиву — пивоварни Варшавы",
            "uk": "Тур крафтовим пивом — пивоварні Варшави",
            "es": "Tour de cerveza artesanal — Cervecerías de Varsovia",
        },
        "bodies": {
            "en": "Discover Poland's thriving craft beer scene across 4 taprooms in central Warsaw. Sample IPAs, Baltic porters, and experimental brews from local microbreweries with a beer sommelier guide.",
            "de": "Entdecke Polens blühende Craft-Bier-Szene in 4 Taprooms im Zentrum Warschaus. Probiere IPAs, Baltische Porter und experimentelle Biere von lokalen Mikrobrauereien mit einem Bier-Sommelier.",
            "ru": "Откройте для себя процветающую крафтовую пивную сцену Польши в 4 тапрумах центральной Варшавы. Дегустация IPA, балтийских портеров и экспериментальных сортов с пивным сомелье.",
            "uk": "Відкрийте для себе крафтову пивну сцену Польщі, що процвітає, у 4 тапрумах центральної Варшави. Дегустація IPA, балтійських портерів та експериментальних сортів з пивним сомельє.",
            "es": "Descubre la floreciente escena cervecera artesanal de Polonia en 4 bares del centro de Varsovia. Degusta IPAs, porters bálticos y cervezas experimentales de microcervecerías locales con un sommelier.",
        },
    },
    # 10. Jazz at Tygmont Club
    {
        "iso_local": "2026-06-12 20:30",
        "duration_minutes": 150,
        "category": "music",
        "address": "Tygmont Jazz Club, Mazowiecka 6/8, Warsaw",
        "venue_short": "Tygmont Jazz Club",
        "lat": 52.2370,
        "lng": 21.0150,
        "is_free": False,
        "price": 50,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://www.tygmont.com.pl",
        "source_label": "tygmont.com.pl",
        "photos": ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80"],
        "titles": {
            "en": "Jazz Night at Tygmont Club",
            "de": "Jazzabend im Tygmont Club",
            "ru": "Джазовый вечер в клубе Tygmont",
            "uk": "Джазовий вечір у клубі Tygmont",
            "es": "Noche de jazz en el Club Tygmont",
        },
        "bodies": {
            "en": "Live jazz performance at Warsaw's legendary Tygmont Club. Intimate venue with excellent acoustics, featuring Polish jazz musicians and occasional international guests. Doors open at 20:00.",
            "de": "Live-Jazz-Auftritt im legendären Tygmont Club Warschaus. Intimes Venue mit exzellenter Akustik, polnische Jazzmusiker und gelegentlich internationale Gäste. Einlass ab 20:00.",
            "ru": "Живое джазовое выступление в легендарном варшавском клубе Tygmont. Камерная площадка с отличной акустикой, польские джазовые музыканты и международные гости. Двери открываются в 20:00.",
            "uk": "Живий джазовий виступ у легендарному варшавському клубі Tygmont. Камерна площадка з чудовою акустикою, польські джазові музиканти та міжнародні гості. Двері відчиняються о 20:00.",
            "es": "Actuación de jazz en vivo en el legendario Club Tygmont de Varsovia. Lugar íntimo con excelente acústica, músicos de jazz polacos e invitados internacionales ocasionales. Puertas abren a las 20:00.",
        },
    },
    # 11. Stand-Up Comedy in English
    {
        "iso_local": "2026-06-17 20:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "Klub Komediowy, Marszałkowska 8, Warsaw",
        "venue_short": "Klub Komediowy",
        "lat": 52.2310,
        "lng": 21.0120,
        "is_free": False,
        "price": 40,
        "currency": "PLN",
        "languages": ["en"],
        "source_url": "https://www.standupwarsaw.com",
        "source_label": "standupwarsaw.com",
        "photos": ["https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80"],
        "titles": {
            "en": "Stand-Up Comedy in English — Warsaw",
            "de": "Stand-Up-Comedy auf Englisch — Warschau",
            "ru": "Стендап-комедия на английском — Варшава",
            "uk": "Стендап-комедія англійською — Варшава",
            "es": "Comedia stand-up en inglés — Varsovia",
        },
        "bodies": {
            "en": "International comedians perform stand-up in English at Warsaw's comedy club. Sharp humor about expat life in Poland, cultural differences, and everyday absurdities. Two-drink minimum.",
            "de": "Internationale Comedians performen Stand-Up auf Englisch in Warschaus Comedy-Club. Scharfer Humor über Expat-Leben in Polen, kulturelle Unterschiede und alltägliche Absurditäten.",
            "ru": "Международные комики выступают со стендапом на английском в варшавском комедийном клубе. Острый юмор о жизни экспатов в Польше, культурных различиях и повседневных абсурдах.",
            "uk": "Міжнародні коміки виступають зі стендапом англійською у варшавському комедійному клубі. Гострий гумор про життя експатів у Польщі, культурні відмінності та повсякденні абсурди.",
            "es": "Comediantes internacionales hacen stand-up en inglés en el club de comedia de Varsovia. Humor agudo sobre la vida de expatriados en Polonia, diferencias culturales y absurdos cotidianos.",
        },
    },
    # 12. Board Games Night — Planszówkowa Café
    {
        "iso_local": "2026-06-09 18:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Planszówkowa Café, Chmielna 26, Warsaw",
        "venue_short": "Planszówkowa Café",
        "lat": 52.2310,
        "lng": 21.0100,
        "is_free": False,
        "price": 20,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://www.planszowkowa.pl",
        "source_label": "planszowkowa.pl",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games Night — Planszówkowa Café",
            "de": "Brettspielabend — Planszówkowa Café",
            "ru": "Вечер настольных игр — Planszówkowa Café",
            "uk": "Вечір настільних ігор — Planszówkowa Café",
            "es": "Noche de juegos de mesa — Planszówkowa Café",
        },
        "bodies": {
            "en": "Over 800 board games to choose from at Warsaw's best game café. Staff help you pick the perfect game for your group. Great for meeting new people over Catan, Wingspan, or Codenames.",
            "de": "Über 800 Brettspiele zur Auswahl in Warschaus bestem Spielecafé. Das Personal hilft bei der Spielauswahl. Perfekt um neue Leute bei Catan, Wingspan oder Codenames kennenzulernen.",
            "ru": "Более 800 настольных игр на выбор в лучшем игровом кафе Варшавы. Персонал поможет подобрать идеальную игру. Отлично для знакомств за Catan, Wingspan или Codenames.",
            "uk": "Понад 800 настільних ігор на вибір у найкращому ігровому кафе Варшави. Персонал допоможе підібрати ідеальну гру. Чудово для знайомств за Catan, Wingspan або Codenames.",
            "es": "Más de 800 juegos de mesa para elegir en el mejor café de juegos de Varsovia. El personal te ayuda a elegir el juego perfecto. Ideal para conocer gente nueva con Catan, Wingspan o Codenames.",
        },
    },
    # 13. Yoga in Pole Mokotowskie Park
    {
        "iso_local": "2026-06-21 09:00",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Pole Mokotowskie Park, Warsaw",
        "venue_short": "Pole Mokotowskie",
        "lat": 52.2120,
        "lng": 20.9980,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://www.meetup.com/warsaw-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga in Pole Mokotowskie Park",
            "de": "Yoga im Pole-Mokotowskie-Park",
            "ru": "Йога в парке Поле Мокотовске",
            "uk": "Йога в парку Поле Мокотовське",
            "es": "Yoga en el Parque Pole Mokotowskie",
        },
        "bodies": {
            "en": "Start your Sunday with outdoor yoga in Warsaw's beloved Pole Mokotowskie park. Vinyasa flow suitable for all levels on the green lawns. Bring your own mat and water bottle.",
            "de": "Starte deinen Sonntag mit Outdoor-Yoga im beliebten Pole-Mokotowskie-Park. Vinyasa Flow für alle Level auf den grünen Wiesen. Eigene Matte und Wasserflasche mitbringen.",
            "ru": "Начните воскресенье с йоги на свежем воздухе в любимом варшавском парке Поле Мокотовске. Виньяса-флоу для всех уровней на зелёных лужайках. Принесите свой коврик и воду.",
            "uk": "Почніть неділю з йоги на свіжому повітрі в улюбленому варшавському парку Поле Мокотовське. Віньяса-флоу для всіх рівнів на зелених галявинах. Принесіть свій килимок та воду.",
            "es": "Empieza tu domingo con yoga al aire libre en el querido parque Pole Mokotowskie de Varsovia. Vinyasa flow para todos los niveles en los prados verdes. Trae tu propia esterilla y botella de agua.",
        },
    },
    # 14. Night of Museums — Warsaw
    {
        "iso_local": "2026-06-27 18:00",
        "duration_minutes": 480,
        "category": "museums",
        "address": "National Museum, Al. Jerozolimskie 3, Warsaw",
        "venue_short": "National Museum",
        "lat": 52.2320,
        "lng": 21.0240,
        "is_free": False,
        "price": 1,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://www.nocmuzeow.pl",
        "source_label": "nocmuzeow.pl",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Night of Museums — Warsaw",
            "de": "Lange Nacht der Museen — Warschau",
            "ru": "Ночь музеев — Варшава",
            "uk": "Ніч музеїв — Варшава",
            "es": "Noche de los Museos — Varsovia",
        },
        "bodies": {
            "en": "Over 150 museums, galleries, and cultural institutions open their doors until dawn. One symbolic ticket grants access to all locations with special exhibitions, concerts, and performances throughout the night.",
            "de": "Über 150 Museen, Galerien und Kultureinrichtungen öffnen ihre Türen bis zum Morgengrauen. Ein symbolisches Ticket gewährt Zugang zu allen Orten mit Sonderausstellungen, Konzerten und Aufführungen.",
            "ru": "Более 150 музеев, галерей и культурных учреждений открывают двери до рассвета. Один символический билет даёт доступ ко всем локациям со специальными выставками, концертами и перформансами.",
            "uk": "Понад 150 музеїв, галерей та культурних закладів відчиняють двері до світанку. Один символічний квиток дає доступ до всіх локацій зі спеціальними виставками, концертами та перформансами.",
            "es": "Más de 150 museos, galerías e instituciones culturales abren sus puertas hasta el amanecer. Un ticket simbólico da acceso a todas las ubicaciones con exposiciones especiales, conciertos y actuaciones.",
        },
    },
    # 15. Vistula River Party — Beach Bar Edition
    {
        "iso_local": "2026-06-26 17:00",
        "duration_minutes": 360,
        "category": "dancing",
        "address": "Poniatówka Beach, Wybrzeże Kościuszkowskie, Warsaw",
        "venue_short": "Poniatówka Beach",
        "lat": 52.2400,
        "lng": 21.0450,
        "is_free": True,
        "price": None,
        "currency": "PLN",
        "languages": ["en", "pl"],
        "source_url": "https://www.warsawbeachbar.pl",
        "source_label": "warsawbeachbar.pl",
        "photos": ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"],
        "titles": {
            "en": "Vistula River Party — Beach Bar Edition",
            "de": "Weichsel-Flussparty — Beach-Bar-Edition",
            "ru": "Вечеринка на Висле — пляжный бар",
            "uk": "Вечірка на Віслі — пляжний бар",
            "es": "Fiesta del río Vístula — Edición bar de playa",
        },
        "bodies": {
            "en": "Dance barefoot on the sandy banks of the Vistula River at Warsaw's wildest summer party. DJs spinning house and techno, food trucks, bonfire at sunset, and the city skyline as your backdrop.",
            "de": "Tanze barfuß am Sandstrand der Weichsel bei Warschaus wildester Sommerparty. DJs mit House und Techno, Food Trucks, Lagerfeuer bei Sonnenuntergang und die Skyline als Kulisse.",
            "ru": "Танцуйте босиком на песчаных берегах Вислы на самой дикой летней вечеринке Варшавы. Диджеи с хаусом и техно, фуд-траки, костёр на закате и городской горизонт как фон.",
            "uk": "Танцюйте босоніж на піщаних берегах Вісли на найдикішій літній вечірці Варшави. Діджеї з хаусом та техно, фуд-траки, вогнище на заході сонця та міський горизонт як фон.",
            "es": "Baila descalzo en las orillas arenosas del río Vístula en la fiesta de verano más salvaje de Varsovia. DJs con house y techno, food trucks, hoguera al atardecer y el skyline como telón de fondo.",
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
            "city": "Warsaw",
            "city_id": WARSAW_CITY_ID,
            "country": "PL",
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
