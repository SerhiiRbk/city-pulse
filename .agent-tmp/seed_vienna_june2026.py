#!/usr/bin/env python3
"""
Seed 30 system events in Vienna for May 22 – June 30, 2026.

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
  exec(open('.agent-tmp/seed_vienna_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
VIENNA_CITY_ID = "9e1a830b-47ad-421c-8cff-54d2bf19df70"
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
    # 1. Vienna Philharmonic — Summer Night Concert
    {
        "iso_local": "2026-06-04 20:30",
        "duration_minutes": 120,
        "category": "music",
        "address": "Schönbrunn Palace, Schönbrunner Schloßstraße 47, Vienna",
        "venue_short": "Schönbrunn Palace",
        "lat": 48.1845,
        "lng": 16.3122,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.wienerphilharmoniker.at",
        "source_label": "wienerphilharmoniker.at",
        "photos": ["https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80"],
        "titles": {
            "en": "Vienna Philharmonic — Summer Night Concert",
            "de": "Wiener Philharmoniker — Sommernachtskonzert",
            "ru": "Венская филармония — Летний ночной концерт",
            "uk": "Віденська філармонія — Літній нічний концерт",
            "es": "Filarmónica de Viena — Concierto de noche de verano",
        },
        "bodies": {
            "en": "The Vienna Philharmonic performs its legendary open-air Summer Night Concert in the gardens of Schönbrunn Palace. Free admission for over 100,000 guests under the stars.",
            "de": "Die Wiener Philharmoniker spielen ihr legendäres Sommernachtskonzert im Schlosspark Schönbrunn. Freier Eintritt für über 100.000 Gäste unter dem Sternenhimmel.",
            "ru": "Венский филармонический оркестр исполняет легендарный летний концерт под открытым небом в садах дворца Шёнбрунн. Бесплатный вход для более 100 000 гостей под звёздами.",
            "uk": "Віденський філармонічний оркестр виконує легендарний літній концерт просто неба в садах палацу Шенбрунн. Безкоштовний вхід для понад 100 000 гостей під зірками.",
            "es": "La Filarmónica de Viena interpreta su legendario concierto de verano al aire libre en los jardines del Palacio de Schönbrunn. Entrada gratuita para más de 100.000 asistentes bajo las estrellas.",
        },
    },
    # 2. Donauinselfest — Day 1
    {
        "iso_local": "2026-06-26 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Donauinsel, Vienna",
        "venue_short": "Donauinsel",
        "lat": 48.2280,
        "lng": 16.4080,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.donauinselfest.at",
        "source_label": "donauinselfest.at",
        "photos": ["https://images.unsplash.com/photo-1501386761578-0a55d938946b?w=800&q=80"],
        "titles": {
            "en": "Donauinselfest — Day 1",
            "de": "Donauinselfest — Tag 1",
            "ru": "Донауинзельфест — День 1",
            "uk": "Донауінзельфест — День 1",
            "es": "Donauinselfest — Día 1",
        },
        "bodies": {
            "en": "Europe's largest open-air music festival kicks off on the Danube Island. Three days of free concerts across multiple stages — rock, pop, electronic, and world music for over 3 million visitors.",
            "de": "Europas größtes Open-Air-Musikfestival startet auf der Donauinsel. Drei Tage kostenlose Konzerte auf mehreren Bühnen — Rock, Pop, Elektronik und Weltmusik für über 3 Millionen Besucher.",
            "ru": "Крупнейший в Европе музыкальный фестиваль под открытым небом стартует на Дунайском острове. Три дня бесплатных концертов на множестве сцен — рок, поп, электроника и мировая музыка для более 3 миллионов посетителей.",
            "uk": "Найбільший в Європі музичний фестиваль просто неба стартує на Дунайському острові. Три дні безкоштовних концертів на багатьох сценах — рок, поп, електроніка та світова музика для понад 3 мільйонів відвідувачів.",
            "es": "El mayor festival de música al aire libre de Europa arranca en la Isla del Danubio. Tres días de conciertos gratuitos en múltiples escenarios — rock, pop, electrónica y música del mundo para más de 3 millones de visitantes.",
        },
    },
    # 3. Donauinselfest — Day 2
    {
        "iso_local": "2026-06-27 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Donauinsel, Vienna",
        "venue_short": "Donauinsel",
        "lat": 48.2280,
        "lng": 16.4080,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.donauinselfest.at",
        "source_label": "donauinselfest.at",
        "photos": ["https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80"],
        "titles": {
            "en": "Donauinselfest — Day 2",
            "de": "Donauinselfest — Tag 2",
            "ru": "Донауинзельфест — День 2",
            "uk": "Донауінзельфест — День 2",
            "es": "Donauinselfest — Día 2",
        },
        "bodies": {
            "en": "Day two of the Donauinselfest brings headliner acts and packed stages along the Danube Island. Dance, sing, and enjoy Vienna's biggest free party under the summer sky.",
            "de": "Tag zwei des Donauinselfests bringt Headliner-Acts und volle Bühnen entlang der Donauinsel. Tanzen, singen und Wiens größte Gratis-Party unter dem Sommerhimmel genießen.",
            "ru": "Второй день Донауинзельфеста — хедлайнеры и переполненные сцены вдоль Дунайского острова. Танцуйте, пойте и наслаждайтесь крупнейшей бесплатной вечеринкой Вены под летним небом.",
            "uk": "Другий день Донауінзельфесту — хедлайнери та переповнені сцени вздовж Дунайського острова. Танцюйте, співайте та насолоджуйтесь найбільшою безкоштовною вечіркою Відня під літнім небом.",
            "es": "El segundo día del Donauinselfest trae artistas principales y escenarios llenos a lo largo de la Isla del Danubio. Baila, canta y disfruta de la mayor fiesta gratuita de Viena bajo el cielo de verano.",
        },
    },
    # 4. Donauinselfest — Day 3
    {
        "iso_local": "2026-06-28 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Donauinsel, Vienna",
        "venue_short": "Donauinsel",
        "lat": 48.2280,
        "lng": 16.4080,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.donauinselfest.at",
        "source_label": "donauinselfest.at",
        "photos": ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"],
        "titles": {
            "en": "Donauinselfest — Day 3",
            "de": "Donauinselfest — Tag 3",
            "ru": "Донауинзельфест — День 3",
            "uk": "Донауінзельфест — День 3",
            "es": "Donauinselfest — Día 3",
        },
        "bodies": {
            "en": "The grand finale of the Donauinselfest — closing night with spectacular performances and fireworks over the Danube. A fitting end to three days of music and celebration.",
            "de": "Das große Finale des Donauinselfests — Abschlussnacht mit spektakulären Auftritten und Feuerwerk über der Donau. Ein würdiger Abschluss von drei Tagen Musik und Feier.",
            "ru": "Грандиозный финал Донауинзельфеста — заключительная ночь со зрелищными выступлениями и фейерверком над Дунаем. Достойное завершение трёх дней музыки и праздника.",
            "uk": "Грандіозний фінал Донауінзельфесту — заключна ніч із видовищними виступами та феєрверком над Дунаєм. Гідне завершення трьох днів музики та свята.",
            "es": "El gran final del Donauinselfest — noche de clausura con actuaciones espectaculares y fuegos artificiales sobre el Danubio. Un cierre digno de tres días de música y celebración.",
        },
    },
    # 5. Wiener Festwochen — Opening
    {
        "iso_local": "2026-05-23 20:00",
        "duration_minutes": 180,
        "category": "theater",
        "address": "Rathausplatz, Vienna",
        "venue_short": "Rathausplatz",
        "lat": 48.2108,
        "lng": 16.3575,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.festwochen.at",
        "source_label": "festwochen.at",
        "photos": ["https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80"],
        "titles": {
            "en": "Wiener Festwochen — Opening",
            "de": "Wiener Festwochen — Eröffnung",
            "ru": "Венский фестиваль — Открытие",
            "uk": "Віденський фестиваль — Відкриття",
            "es": "Wiener Festwochen — Inauguración",
        },
        "bodies": {
            "en": "The opening ceremony of Vienna's premier performing arts festival at Rathausplatz. A spectacular free outdoor event with music, theater, and dance to launch five weeks of world-class culture.",
            "de": "Die Eröffnungszeremonie von Wiens führendem Festival der darstellenden Künste am Rathausplatz. Ein spektakuläres kostenloses Open-Air-Event mit Musik, Theater und Tanz zum Start von fünf Wochen Weltklasse-Kultur.",
            "ru": "Церемония открытия главного фестиваля исполнительских искусств Вены на Ратхаусплац. Зрелищное бесплатное мероприятие под открытым небом с музыкой, театром и танцем — старт пяти недель мировой культуры.",
            "uk": "Церемонія відкриття головного фестивалю виконавських мистецтв Відня на Ратхаусплац. Видовищна безкоштовна подія просто неба з музикою, театром і танцем — старт п'яти тижнів світової культури.",
            "es": "La ceremonia de apertura del principal festival de artes escénicas de Viena en Rathausplatz. Un espectacular evento gratuito al aire libre con música, teatro y danza para inaugurar cinco semanas de cultura de primer nivel.",
        },
    },
    # 6. Long Night of Churches
    {
        "iso_local": "2026-05-23 18:00",
        "duration_minutes": 360,
        "category": "history",
        "address": "Citywide — various churches, Vienna",
        "venue_short": "Citywide, Vienna",
        "lat": 48.2082,
        "lng": 16.3738,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.langenachtderkirchen.at",
        "source_label": "langenachtderkirchen.at",
        "photos": ["https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=800&q=80"],
        "titles": {
            "en": "Long Night of Churches",
            "de": "Lange Nacht der Kirchen",
            "ru": "Длинная ночь церквей",
            "uk": "Довга ніч церков",
            "es": "Larga Noche de las Iglesias",
        },
        "bodies": {
            "en": "Over 100 churches across Vienna open their doors for a night of concerts, guided tours, and art installations. Discover hidden architectural gems and sacred spaces in a unique cultural evening.",
            "de": "Über 100 Kirchen in ganz Wien öffnen ihre Türen für eine Nacht voller Konzerte, Führungen und Kunstinstallationen. Entdecken Sie verborgene architektonische Schätze und sakrale Räume in einem einzigartigen Kulturabend.",
            "ru": "Более 100 церквей по всей Вене открывают двери для ночи концертов, экскурсий и арт-инсталляций. Откройте скрытые архитектурные жемчужины и сакральные пространства в уникальный культурный вечер.",
            "uk": "Понад 100 церков по всьому Відню відчиняють двері для ночі концертів, екскурсій та арт-інсталяцій. Відкрийте приховані архітектурні перлини та сакральні простори в унікальний культурний вечір.",
            "es": "Más de 100 iglesias en toda Viena abren sus puertas para una noche de conciertos, visitas guiadas e instalaciones artísticas. Descubre joyas arquitectónicas ocultas y espacios sagrados en una velada cultural única.",
        },
    },
    # 7. Naschmarkt Food Tour
    {
        "iso_local": "2026-05-24 11:00",
        "duration_minutes": 150,
        "category": "food-tours",
        "address": "Naschmarkt, Wienzeile, Vienna",
        "venue_short": "Naschmarkt",
        "lat": 48.1990,
        "lng": 16.3630,
        "is_free": False,
        "price": 35,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.viennafoodtours.com",
        "source_label": "viennafoodtours.com",
        "photos": ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"],
        "titles": {
            "en": "Naschmarkt Food Tour",
            "de": "Naschmarkt Kulinarische Tour",
            "ru": "Гастрономический тур по Нашмаркту",
            "uk": "Гастрономічний тур по Нашмаркту",
            "es": "Tour gastronómico por el Naschmarkt",
        },
        "bodies": {
            "en": "Guided walking tour through Vienna's most famous market — taste local cheeses, olives, Viennese pastries, and international delicacies from over 120 stalls. A feast for all senses.",
            "de": "Geführter Spaziergang durch Wiens berühmtesten Markt — lokale Käsesorten, Oliven, Wiener Gebäck und internationale Delikatessen von über 120 Ständen probieren. Ein Fest für alle Sinne.",
            "ru": "Пешая экскурсия по самому знаменитому рынку Вены — дегустация местных сыров, оливок, венской выпечки и международных деликатесов с более чем 120 прилавков. Праздник для всех чувств.",
            "uk": "Піша екскурсія найвідомішим ринком Відня — дегустація місцевих сирів, оливок, віденської випічки та міжнародних делікатесів з понад 120 прилавків. Свято для всіх почуттів.",
            "es": "Tour a pie guiado por el mercado más famoso de Viena — degusta quesos locales, aceitunas, pasteles vieneses y delicias internacionales de más de 120 puestos. Una fiesta para todos los sentidos.",
        },
    },
    # 8. Vienna Wine Hiking Day
    {
        "iso_local": "2026-05-31 10:00",
        "duration_minutes": 480,
        "category": "wine-tasting",
        "address": "Kahlenberg, Vienna",
        "venue_short": "Kahlenberg",
        "lat": 48.2770,
        "lng": 16.3340,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.wien.gv.at/freizeit/wandern/weinwandertag",
        "source_label": "wien.gv.at",
        "photos": ["https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80"],
        "titles": {
            "en": "Vienna Wine Hiking Day",
            "de": "Wiener Weinwandertag",
            "ru": "Венский день винного похода",
            "uk": "Віденський день винного походу",
            "es": "Día de senderismo vinícola de Viena",
        },
        "bodies": {
            "en": "Annual wine hiking event through Vienna's vineyards on the Kahlenberg. Walk scenic trails, stop at local Heurigen for wine tastings, and enjoy panoramic views of the city. Free entry, pay per glass.",
            "de": "Jährliches Weinwander-Event durch Wiens Weingärten am Kahlenberg. Malerische Wege wandern, bei lokalen Heurigen Wein verkosten und Panoramablicke auf die Stadt genießen. Freier Eintritt, Bezahlung pro Glas.",
            "ru": "Ежегодный винный поход по виноградникам Вены на Каленберге. Живописные тропы, остановки в местных хойригенах для дегустации вина и панорамные виды на город. Вход свободный, оплата за бокал.",
            "uk": "Щорічний винний похід виноградниками Відня на Каленберзі. Мальовничі стежки, зупинки в місцевих хойрігенах для дегустації вина та панорамні краєвиди на місто. Вхід вільний, оплата за келих.",
            "es": "Evento anual de senderismo vinícola por los viñedos de Viena en el Kahlenberg. Camina por senderos pintorescos, para en Heurigen locales para catas de vino y disfruta de vistas panorámicas de la ciudad. Entrada gratuita, pago por copa.",
        },
    },
    # 9. Museumsquartier Open-Air Cinema
    {
        "iso_local": "2026-06-12 21:00",
        "duration_minutes": 150,
        "category": "cinema",
        "address": "MuseumsQuartier, Museumsplatz 1, Vienna",
        "venue_short": "MuseumsQuartier",
        "lat": 48.2030,
        "lng": 16.3580,
        "is_free": False,
        "price": 12,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.mqw.at",
        "source_label": "mqw.at",
        "photos": ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"],
        "titles": {
            "en": "Museumsquartier Open-Air Cinema",
            "de": "MuseumsQuartier Open-Air-Kino",
            "ru": "Кинотеатр под открытым небом в Музейном квартале",
            "uk": "Кінотеатр просто неба в Музейному кварталі",
            "es": "Cine al aire libre en el MuseumsQuartier",
        },
        "bodies": {
            "en": "Watch international art-house films under the stars in Vienna's cultural courtyard. Bring a blanket, grab a drink from the bar, and settle into the iconic MQ Enzis for a summer cinema night.",
            "de": "Internationale Arthouse-Filme unter den Sternen in Wiens kulturellem Innenhof schauen. Decke mitbringen, Drink an der Bar holen und in die ikonischen MQ-Enzis für eine Sommer-Kinonacht einkuscheln.",
            "ru": "Смотрите международное арт-хаусное кино под звёздами в культурном дворе Вены. Возьмите плед, напиток из бара и устройтесь в культовых MQ Enzis для летней киноночи.",
            "uk": "Дивіться міжнародне арт-хаусне кіно під зірками в культурному дворі Відня. Візьміть ковдру, напій з бару та влаштуйтесь у культових MQ Enzis для літньої кіноночі.",
            "es": "Mira películas de cine de autor internacional bajo las estrellas en el patio cultural de Viena. Trae una manta, toma una bebida del bar y acomódate en los icónicos MQ Enzis para una noche de cine de verano.",
        },
    },
    # 10. Sprachcafé Vienna — German Practice
    {
        "iso_local": "2026-06-03 19:00",
        "duration_minutes": 120,
        "category": "networking",
        "address": "Café Prückel, Stubenring 24, Vienna",
        "venue_short": "Café Prückel",
        "lat": 48.2070,
        "lng": 16.3780,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en", "es", "ru"],
        "source_url": "https://www.meetup.com/vienna-sprachcafe",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80"],
        "titles": {
            "en": "Sprachcafé Vienna — German Practice",
            "de": "Sprachcafé Wien — Deutsch üben",
            "ru": "Sprachcafé Вена — практика немецкого",
            "uk": "Sprachcafé Відень — практика німецької",
            "es": "Sprachcafé Viena — Práctica de alemán",
        },
        "bodies": {
            "en": "Casual language exchange evening at the legendary Café Prückel — practice German with native speakers over Melange and Apfelstrudel. Tables by level (A1–C2). Perfect for newcomers to Vienna.",
            "de": "Gemütlicher Sprachaustausch-Abend im legendären Café Prückel — Deutsch üben mit Muttersprachlern bei Melange und Apfelstrudel. Tische nach Niveau (A1–C2). Perfekt für Neuankömmlinge in Wien.",
            "ru": "Непринуждённый языковой обмен в легендарном Café Prückel — практикуйте немецкий с носителями за меланжем и штруделем. Столы по уровням (A1–C2). Идеально для новичков в Вене.",
            "uk": "Невимушений мовний обмін у легендарному Café Prückel — практикуйте німецьку з носіями за меланжем та штруделем. Столи за рівнями (A1–C2). Ідеально для новачків у Відні.",
            "es": "Intercambio de idiomas informal en el legendario Café Prückel — practica alemán con hablantes nativos tomando Melange y Apfelstrudel. Mesas por nivel (A1–C2). Perfecto para recién llegados a Viena.",
        },
    },
    # 11. Expat Meetup at Das Möbel
    {
        "iso_local": "2026-06-05 19:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Das Möbel, Burggasse 10, Neubau, Vienna",
        "venue_short": "Das Möbel, Neubau",
        "lat": 48.2020,
        "lng": 16.3500,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "de"],
        "source_url": "https://www.meetup.com/vienna-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup at Das Möbel",
            "de": "Expat-Meetup im Das Möbel",
            "ru": "Встреча экспатов в Das Möbel",
            "uk": "Зустріч експатів у Das Möbel",
            "es": "Encuentro de expatriados en Das Möbel",
        },
        "bodies": {
            "en": "Casual networking evening for internationals in Vienna at the quirky designer furniture café Das Möbel. Meet fellow expats, share tips about life in Vienna, and make new connections over drinks.",
            "de": "Gemütlicher Networking-Abend für Internationale in Wien im ausgefallenen Designermöbel-Café Das Möbel. Andere Expats treffen, Tipps über das Leben in Wien austauschen und neue Kontakte bei Drinks knüpfen.",
            "ru": "Непринуждённый нетворкинг для иностранцев в Вене в необычном дизайнерском кафе Das Möbel. Знакомьтесь с другими экспатами, делитесь советами о жизни в Вене и заводите новые знакомства за напитками.",
            "uk": "Невимушений нетворкінг для іноземців у Відні в незвичайному дизайнерському кафе Das Möbel. Знайомтесь з іншими експатами, діліться порадами про життя у Відні та заводьте нові знайомства за напоями.",
            "es": "Velada informal de networking para internacionales en Viena en el peculiar café de muebles de diseño Das Möbel. Conoce a otros expatriados, comparte consejos sobre la vida en Viena y haz nuevas conexiones.",
        },
    },
    # 12. Sunset Yoga at Prater
    {
        "iso_local": "2026-05-27 19:00",
        "duration_minutes": 90,
        "category": "yoga",
        "address": "Prater Hauptallee, Vienna",
        "venue_short": "Prater",
        "lat": 48.2170,
        "lng": 16.3950,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/vienna-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Sunset Yoga at Prater",
            "de": "Sunset Yoga im Prater",
            "ru": "Йога на закате в Пратере",
            "uk": "Йога на заході сонця в Пратері",
            "es": "Yoga al atardecer en el Prater",
        },
        "bodies": {
            "en": "Free outdoor yoga session in Vienna's iconic Prater park as the sun sets over the chestnut trees. All levels welcome — bring your mat and enjoy a peaceful flow surrounded by nature in the heart of the city.",
            "de": "Kostenlose Outdoor-Yoga-Session in Wiens ikonischem Prater, während die Sonne über den Kastanienbäumen untergeht. Alle Levels willkommen — Matte mitbringen und einen friedlichen Flow inmitten der Natur im Herzen der Stadt genießen.",
            "ru": "Бесплатная йога на свежем воздухе в культовом парке Пратер, пока солнце садится за каштанами. Все уровни приветствуются — возьмите коврик и наслаждайтесь спокойным потоком среди природы в сердце города.",
            "uk": "Безкоштовна йога на свіжому повітрі в культовому парку Пратер, поки сонце сідає за каштанами. Усі рівні вітаються — візьміть килимок та насолоджуйтесь спокійним потоком серед природи в серці міста.",
            "es": "Sesión gratuita de yoga al aire libre en el icónico parque Prater de Viena mientras el sol se pone sobre los castaños. Todos los niveles bienvenidos — trae tu esterilla y disfruta de un flow tranquilo rodeado de naturaleza.",
        },
    },
    # 13. Danube Island Running Group
    {
        "iso_local": "2026-05-25 08:00",
        "duration_minutes": 90,
        "category": "running",
        "address": "Donauinsel, Reichsbrücke entrance, Vienna",
        "venue_short": "Donauinsel",
        "lat": 48.2280,
        "lng": 16.4080,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/vienna-running",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Danube Island Running Group",
            "de": "Laufgruppe auf der Donauinsel",
            "ru": "Беговая группа на Дунайском острове",
            "uk": "Бігова група на Дунайському острові",
            "es": "Grupo de running en la Isla del Danubio",
        },
        "bodies": {
            "en": "Sunday morning group run along the Danube Island — flat paths, river views, and great company. 5K and 10K options, all paces welcome. Meet at the Reichsbrücke entrance.",
            "de": "Sonntagmorgen-Gruppenlauf entlang der Donauinsel — flache Wege, Flussblick und tolle Gesellschaft. 5K- und 10K-Optionen, alle Tempos willkommen. Treffpunkt Eingang Reichsbrücke.",
            "ru": "Воскресная утренняя пробежка вдоль Дунайского острова — ровные дорожки, виды на реку и отличная компания. Дистанции 5 и 10 км, любой темп. Встреча у входа Reichsbrücke.",
            "uk": "Недільна ранкова пробіжка вздовж Дунайського острова — рівні доріжки, краєвиди на річку та чудова компанія. Дистанції 5 та 10 км, будь-який темп. Зустріч біля входу Reichsbrücke.",
            "es": "Carrera grupal dominical a lo largo de la Isla del Danubio — caminos planos, vistas al río y gran compañía. Opciones de 5K y 10K, todos los ritmos bienvenidos. Punto de encuentro en la entrada Reichsbrücke.",
        },
    },
    # 14. Vienna State Opera — Open-Air Screening
    {
        "iso_local": "2026-06-08 20:00",
        "duration_minutes": 180,
        "category": "music",
        "address": "Herbert-von-Karajan-Platz, Vienna",
        "venue_short": "Herbert-von-Karajan-Platz",
        "lat": 48.2030,
        "lng": 16.3690,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.wiener-staatsoper.at",
        "source_label": "wiener-staatsoper.at",
        "photos": ["https://images.unsplash.com/photo-1580809361436-42a7ec204889?w=800&q=80"],
        "titles": {
            "en": "Vienna State Opera — Open-Air Screening",
            "de": "Wiener Staatsoper — Open-Air-Übertragung",
            "ru": "Венская государственная опера — показ под открытым небом",
            "uk": "Віденська державна опера — показ просто неба",
            "es": "Ópera Estatal de Viena — Proyección al aire libre",
        },
        "bodies": {
            "en": "Live opera broadcast on a giant screen at Herbert-von-Karajan-Platz right next to the State Opera house. Experience world-class opera for free under the Viennese evening sky.",
            "de": "Live-Opernübertragung auf einer Riesenleinwand am Herbert-von-Karajan-Platz direkt neben der Staatsoper. Weltklasse-Oper kostenlos unter dem Wiener Abendhimmel erleben.",
            "ru": "Прямая трансляция оперы на гигантском экране на площади Герберта фон Караяна рядом с Государственной оперой. Мировая опера бесплатно под вечерним небом Вены.",
            "uk": "Пряма трансляція опери на гігантському екрані на площі Герберта фон Караяна поруч із Державною оперою. Світова опера безкоштовно під вечірнім небом Відня.",
            "es": "Transmisión en vivo de ópera en una pantalla gigante en Herbert-von-Karajan-Platz junto a la Ópera Estatal. Experimenta ópera de clase mundial gratis bajo el cielo nocturno vienés.",
        },
    },
    # 15. Albertina Museum — Monet to Picasso
    {
        "iso_local": "2026-06-01 10:00",
        "duration_minutes": 120,
        "category": "museums",
        "address": "Albertina, Albertinaplatz 1, Vienna",
        "venue_short": "Albertina",
        "lat": 48.2040,
        "lng": 16.3680,
        "is_free": False,
        "price": 18,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.albertina.at",
        "source_label": "albertina.at",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Albertina Museum — Monet to Picasso",
            "de": "Albertina — Von Monet bis Picasso",
            "ru": "Музей Альбертина — от Моне до Пикассо",
            "uk": "Музей Альбертіна — від Моне до Пікассо",
            "es": "Museo Albertina — De Monet a Picasso",
        },
        "bodies": {
            "en": "Explore the Albertina's world-renowned collection spanning Impressionism to Modernism — works by Monet, Renoir, Cézanne, and Picasso in one of Vienna's most elegant museum settings.",
            "de": "Die weltberühmte Sammlung der Albertina vom Impressionismus bis zur Moderne erkunden — Werke von Monet, Renoir, Cézanne und Picasso in einem der elegantesten Museen Wiens.",
            "ru": "Исследуйте всемирно известную коллекцию Альбертины от импрессионизма до модернизма — работы Моне, Ренуара, Сезанна и Пикассо в одном из самых элегантных музеев Вены.",
            "uk": "Досліджуйте всесвітньо відому колекцію Альбертіни від імпресіонізму до модернізму — роботи Моне, Ренуара, Сезанна та Пікассо в одному з найелегантніших музеїв Відня.",
            "es": "Explora la colección de renombre mundial de la Albertina desde el Impresionismo hasta el Modernismo — obras de Monet, Renoir, Cézanne y Picasso en uno de los museos más elegantes de Viena.",
        },
    },
    # 16. Heurigen Evening — Wine Tavern in Grinzing
    {
        "iso_local": "2026-06-07 18:00",
        "duration_minutes": 240,
        "category": "wine-tasting",
        "address": "Grinzing, Cobenzlgasse, Vienna",
        "venue_short": "Grinzing",
        "lat": 48.2550,
        "lng": 16.3400,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.heurigen.wien",
        "source_label": "heurigen.wien",
        "photos": ["https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800&q=80"],
        "titles": {
            "en": "Heurigen Evening — Wine Tavern in Grinzing",
            "de": "Heurigenabend in Grinzing",
            "ru": "Вечер в хойригене — винная таверна в Гринцинге",
            "uk": "Вечір у хойрігені — винна таверна в Грінцінгу",
            "es": "Velada en Heuriger — Taberna de vino en Grinzing",
        },
        "bodies": {
            "en": "Experience a traditional Viennese Heuriger evening in the wine village of Grinzing. Taste young local wines, enjoy cold buffet platters, and soak in the cozy atmosphere of a centuries-old wine tavern.",
            "de": "Einen traditionellen Wiener Heurigenabend im Weindorf Grinzing erleben. Junge lokale Weine verkosten, kalte Buffetplatten genießen und die gemütliche Atmosphäre einer jahrhundertealten Weintaverne aufsaugen.",
            "ru": "Проведите традиционный венский вечер в хойригене в винной деревне Гринцинг. Попробуйте молодые местные вина, насладитесь холодными закусками и уютной атмосферой вековой винной таверны.",
            "uk": "Проведіть традиційний віденський вечір у хойрігені у винному селі Грінцінг. Спробуйте молоді місцеві вина, насолодіться холодними закусками та затишною атмосферою вікової винної таверни.",
            "es": "Vive una velada tradicional vienesa en un Heuriger en el pueblo vinícola de Grinzing. Degusta vinos jóvenes locales, disfruta de buffet frío y sumérgete en el ambiente acogedor de una taberna centenaria.",
        },
    },
    # 17. Viennese Cooking Class — Schnitzel & Strudel
    {
        "iso_local": "2026-06-09 17:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Innere Stadt, Bäckerstraße 14, Vienna",
        "venue_short": "Innere Stadt",
        "lat": 48.2082,
        "lng": 16.3738,
        "is_free": False,
        "price": 75,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.viennacookingclass.com",
        "source_label": "viennacookingclass.com",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Viennese Cooking Class — Schnitzel & Strudel",
            "de": "Wiener Kochkurs — Schnitzel & Strudel",
            "ru": "Кулинарный мастер-класс — шницель и штрудель",
            "uk": "Кулінарний майстер-клас — шніцель та штрудель",
            "es": "Clase de cocina vienesa — Schnitzel y Strudel",
        },
        "bodies": {
            "en": "Learn to make the perfect Wiener Schnitzel and hand-pulled Apfelstrudel from a local chef. Hands-on class in a historic kitchen — includes all ingredients, recipes, and a full dinner with wine.",
            "de": "Das perfekte Wiener Schnitzel und handgezogenen Apfelstrudel von einem lokalen Koch lernen. Praxiskurs in einer historischen Küche — inklusive aller Zutaten, Rezepte und einem vollständigen Abendessen mit Wein.",
            "ru": "Научитесь готовить идеальный венский шницель и яблочный штрудель ручной работы у местного шеф-повара. Практический урок в исторической кухне — все ингредиенты, рецепты и полный ужин с вином включены.",
            "uk": "Навчіться готувати ідеальний віденський шніцель та яблучний штрудель ручної роботи від місцевого шеф-кухаря. Практичний урок в історичній кухні — усі інгредієнти, рецепти та повна вечеря з вином включені.",
            "es": "Aprende a preparar el Wiener Schnitzel perfecto y Apfelstrudel estirado a mano con un chef local. Clase práctica en una cocina histórica — incluye todos los ingredientes, recetas y una cena completa con vino.",
        },
    },
    # 18. Salsa Open Air at Schwedenplatz
    {
        "iso_local": "2026-06-14 19:00",
        "duration_minutes": 240,
        "category": "dancing",
        "address": "Schwedenplatz, Vienna",
        "venue_short": "Schwedenplatz",
        "lat": 48.2120,
        "lng": 16.3770,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en", "es"],
        "source_url": "https://www.meetup.com/vienna-salsa",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Salsa Open Air at Schwedenplatz",
            "de": "Salsa Open Air am Schwedenplatz",
            "ru": "Сальса под открытым небом на Шведенплац",
            "uk": "Сальса просто неба на Шведенплац",
            "es": "Salsa al aire libre en Schwedenplatz",
        },
        "bodies": {
            "en": "Free outdoor salsa dancing by the Danube Canal at Schwedenplatz. Beginner lesson at 19:00, open dancing from 20:00. No partner needed — just bring your dancing shoes and good energy.",
            "de": "Kostenlose Salsa unter freiem Himmel am Donaukanal beim Schwedenplatz. Anfängerkurs um 19:00, freies Tanzen ab 20:00. Kein Partner nötig — einfach Tanzschuhe und gute Laune mitbringen.",
            "ru": "Бесплатная сальса под открытым небом у Дунайского канала на Шведенплац. Урок для начинающих в 19:00, свободные танцы с 20:00. Партнёр не нужен — просто возьмите танцевальную обувь и хорошее настроение.",
            "uk": "Безкоштовна сальса просто неба біля Дунайського каналу на Шведенплац. Урок для початківців о 19:00, вільні танці з 20:00. Партнер не потрібен — просто візьміть танцювальне взуття та гарний настрій.",
            "es": "Salsa gratuita al aire libre junto al Canal del Danubio en Schwedenplatz. Clase para principiantes a las 19:00, baile libre desde las 20:00. No se necesita pareja — solo trae tus zapatos de baile y buena energía.",
        },
    },
    # 19. Board Games at Spielbar
    {
        "iso_local": "2026-06-11 19:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Spielbar, Lederergasse 26, Josefstadt, Vienna",
        "venue_short": "Spielbar, Josefstadt",
        "lat": 48.2110,
        "lng": 16.3490,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/vienna-boardgames",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games at Spielbar",
            "de": "Brettspiele in der Spielbar",
            "ru": "Настольные игры в Spielbar",
            "uk": "Настільні ігри в Spielbar",
            "es": "Juegos de mesa en Spielbar",
        },
        "bodies": {
            "en": "Weekly board game night at Vienna's coziest game café. Over 500 games available — from quick party games to epic strategy sessions. Beginners and veterans alike welcome. Drinks and snacks at the bar.",
            "de": "Wöchentlicher Brettspielabend in Wiens gemütlichstem Spielecafé. Über 500 Spiele verfügbar — von schnellen Partyspielen bis zu epischen Strategiesitzungen. Anfänger und Veteranen gleichermaßen willkommen.",
            "ru": "Еженедельный вечер настольных игр в самом уютном игровом кафе Вены. Более 500 игр — от быстрых вечериночных до эпических стратегий. Новички и ветераны одинаково приветствуются.",
            "uk": "Щотижневий вечір настільних ігор у найзатишнішому ігровому кафе Відня. Понад 500 ігор — від швидких вечіркових до епічних стратегій. Новачки та ветерани однаково вітаються.",
            "es": "Noche semanal de juegos de mesa en el café de juegos más acogedor de Viena. Más de 500 juegos disponibles — desde juegos rápidos de fiesta hasta sesiones épicas de estrategia. Principiantes y veteranos bienvenidos.",
        },
    },
    # 20. Jazz at Porgy & Bess
    {
        "iso_local": "2026-06-18 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "Porgy & Bess, Riemergasse 11, Innere Stadt, Vienna",
        "venue_short": "Porgy & Bess, Innere Stadt",
        "lat": 48.2050,
        "lng": 16.3750,
        "is_free": False,
        "price": 25,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.porgy.at",
        "source_label": "porgy.at",
        "photos": ["https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80"],
        "titles": {
            "en": "Jazz at Porgy & Bess",
            "de": "Jazz im Porgy & Bess",
            "ru": "Джаз в Porgy & Bess",
            "uk": "Джаз у Porgy & Bess",
            "es": "Jazz en Porgy & Bess",
        },
        "bodies": {
            "en": "Live jazz at Vienna's premier jazz club — an intimate evening of world-class improvisation in a beautifully converted cinema. One of Europe's top venues for contemporary jazz and creative music.",
            "de": "Live-Jazz in Wiens führendem Jazzclub — ein intimer Abend mit Weltklasse-Improvisation in einem wunderschön umgebauten Kino. Einer der Top-Veranstaltungsorte Europas für zeitgenössischen Jazz.",
            "ru": "Живой джаз в главном джаз-клубе Вены — камерный вечер импровизации мирового класса в красиво переоборудованном кинотеатре. Одна из лучших площадок Европы для современного джаза.",
            "uk": "Живий джаз у головному джаз-клубі Відня — камерний вечір імпровізації світового класу в красиво переобладнаному кінотеатрі. Одна з найкращих площадок Європи для сучасного джазу.",
            "es": "Jazz en vivo en el principal club de jazz de Viena — una velada íntima de improvisación de clase mundial en un cine bellamente reconvertido. Uno de los mejores locales de Europa para jazz contemporáneo.",
        },
    },
    # 21. Stand-Up Comedy in English at The Loft
    {
        "iso_local": "2026-06-17 20:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "The Loft, Lerchenfelder Gürtel 37, Leopoldstadt, Vienna",
        "venue_short": "The Loft, Leopoldstadt",
        "lat": 48.2160,
        "lng": 16.3830,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/vienna-comedy",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80"],
        "titles": {
            "en": "Stand-Up Comedy in English at The Loft",
            "de": "Stand-Up Comedy auf Englisch im The Loft",
            "ru": "Стендап на английском в The Loft",
            "uk": "Стендап англійською в The Loft",
            "es": "Stand-Up Comedy en inglés en The Loft",
        },
        "bodies": {
            "en": "English-language stand-up comedy night featuring local and touring comedians. A lively evening of laughs in Vienna's growing English comedy scene — perfect for expats and English speakers.",
            "de": "Englischsprachiger Stand-Up-Comedy-Abend mit lokalen und tourenden Comedians. Ein lebhafter Abend voller Lacher in Wiens wachsender englischer Comedy-Szene — perfekt für Expats und Englischsprachige.",
            "ru": "Вечер стендап-комедии на английском языке с местными и гастролирующими комиками. Живой вечер смеха в растущей англоязычной комедийной сцене Вены — идеально для экспатов.",
            "uk": "Вечір стендап-комедії англійською мовою з місцевими та гастролюючими коміками. Жвавий вечір сміху в зростаючій англомовній комедійній сцені Відня — ідеально для експатів.",
            "es": "Noche de stand-up comedy en inglés con comediantes locales y de gira. Una velada animada de risas en la creciente escena de comedia en inglés de Viena — perfecto para expatriados y angloparlantes.",
        },
    },
    # 22. Photography Walk — Ringstraße Architecture
    {
        "iso_local": "2026-05-28 16:00",
        "duration_minutes": 150,
        "category": "photography",
        "address": "Meeting point: Oper, Opernring, Innere Stadt, Vienna",
        "venue_short": "Innere Stadt",
        "lat": 48.2082,
        "lng": 16.3738,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/vienna-photography",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80"],
        "titles": {
            "en": "Photography Walk — Ringstraße Architecture",
            "de": "Fotowalk — Ringstraßen-Architektur",
            "ru": "Фотопрогулка — архитектура Рингштрассе",
            "uk": "Фотопрогулянка — архітектура Рінгштрассе",
            "es": "Paseo fotográfico — Arquitectura de la Ringstraße",
        },
        "bodies": {
            "en": "Guided photography walk along Vienna's grand Ringstraße boulevard — capture the Parliament, Rathaus, Burgtheater, and Opera in golden hour light. Tips on composition and architecture photography.",
            "de": "Geführter Fotowalk entlang der Wiener Ringstraße — Parlament, Rathaus, Burgtheater und Oper im goldenen Licht einfangen. Tipps zu Komposition und Architekturfotografie.",
            "ru": "Фотопрогулка с гидом по венской Рингштрассе — снимайте Парламент, Ратушу, Бургтеатр и Оперу в золотом свете. Советы по композиции и архитектурной фотографии.",
            "uk": "Фотопрогулянка з гідом віденською Рінгштрассе — знімайте Парламент, Ратушу, Бургтеатр та Оперу в золотому світлі. Поради з композиції та архітектурної фотографії.",
            "es": "Paseo fotográfico guiado por la gran Ringstraße de Viena — captura el Parlamento, el Rathaus, el Burgtheater y la Ópera en la luz dorada. Consejos sobre composición y fotografía de arquitectura.",
        },
    },
    # 23. Craft Beer Tour — Vienna Breweries
    {
        "iso_local": "2026-05-30 17:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "Meeting point: U-Bhf Josefstädter Straße, Vienna",
        "venue_short": "Various, Vienna",
        "lat": 48.2000,
        "lng": 16.3600,
        "is_free": False,
        "price": 40,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/vienna-craft-beer",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tour — Vienna Breweries",
            "de": "Craft-Beer-Tour — Wiener Brauereien",
            "ru": "Тур по крафтовому пиву — пивоварни Вены",
            "uk": "Тур крафтовим пивом — пивоварні Відня",
            "es": "Tour de cerveza artesanal — Cervecerías de Viena",
        },
        "bodies": {
            "en": "Walking tour visiting three of Vienna's best craft breweries — taste local IPAs, lagers, and seasonal brews. Learn about Vienna's brewing heritage and the new wave of independent brewers.",
            "de": "Spaziergang zu drei der besten Craft-Brauereien Wiens — lokale IPAs, Lager und saisonale Biere verkosten. Über Wiens Brautradition und die neue Welle unabhängiger Brauer erfahren.",
            "ru": "Пешая экскурсия по трём лучшим крафтовым пивоварням Вены — дегустация местных IPA, лагеров и сезонных сортов. Узнайте о пивоваренном наследии Вены и новой волне независимых пивоваров.",
            "uk": "Піша екскурсія трьома найкращими крафтовими пивоварнями Відня — дегустація місцевих IPA, лагерів та сезонних сортів. Дізнайтесь про пивоварну спадщину Відня та нову хвилю незалежних пивоварів.",
            "es": "Tour a pie visitando tres de las mejores cervecerías artesanales de Viena — degusta IPAs locales, lagers y cervezas de temporada. Conoce la herencia cervecera de Viena y la nueva ola de cerveceros independientes.",
        },
    },
    # 24. Belvedere Palace — Klimt Exhibition
    {
        "iso_local": "2026-06-15 10:00",
        "duration_minutes": 120,
        "category": "museums",
        "address": "Oberes Belvedere, Prinz-Eugen-Straße 27, Vienna",
        "venue_short": "Belvedere",
        "lat": 48.1910,
        "lng": 16.3810,
        "is_free": False,
        "price": 16,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.belvedere.at",
        "source_label": "belvedere.at",
        "photos": ["https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&q=80"],
        "titles": {
            "en": "Belvedere Palace — Klimt Exhibition",
            "de": "Schloss Belvedere — Klimt-Ausstellung",
            "ru": "Дворец Бельведер — выставка Климта",
            "uk": "Палац Бельведер — виставка Клімта",
            "es": "Palacio Belvedere — Exposición de Klimt",
        },
        "bodies": {
            "en": "See Gustav Klimt's iconic 'The Kiss' and the world's largest collection of his works at the Upper Belvedere. A must-visit for art lovers — Austrian Jugendstil masterpieces in a baroque palace setting.",
            "de": "Gustav Klimts ikonischen 'Kuss' und die weltweit größte Sammlung seiner Werke im Oberen Belvedere sehen. Ein Muss für Kunstliebhaber — österreichische Jugendstil-Meisterwerke in barocker Palastkulisse.",
            "ru": "Увидьте культовый «Поцелуй» Густава Климта и крупнейшую в мире коллекцию его работ в Верхнем Бельведере. Обязательно для ценителей искусства — шедевры австрийского модерна в барочном дворце.",
            "uk": "Побачте культовий «Поцілунок» Густава Клімта та найбільшу у світі колекцію його робіт у Верхньому Бельведері. Обов'язково для цінителів мистецтва — шедеври австрійського модерну в бароковому палаці.",
            "es": "Contempla 'El Beso' de Gustav Klimt y la mayor colección del mundo de sus obras en el Belvedere Superior. Imprescindible para amantes del arte — obras maestras del Jugendstil austriaco en un palacio barroco.",
        },
    },
    # 25. Startup Meetup at weXelerate
    {
        "iso_local": "2026-06-10 19:00",
        "duration_minutes": 150,
        "category": "startups",
        "address": "weXelerate, Praterstraße 1, Leopoldstadt, Vienna",
        "venue_short": "weXelerate, Leopoldstadt",
        "lat": 48.2160,
        "lng": 16.3830,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "de"],
        "source_url": "https://www.wexelerate.com",
        "source_label": "wexelerate.com",
        "photos": ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"],
        "titles": {
            "en": "Startup Meetup at weXelerate",
            "de": "Startup-Meetup im weXelerate",
            "ru": "Встреча стартапов в weXelerate",
            "uk": "Зустріч стартапів у weXelerate",
            "es": "Encuentro de startups en weXelerate",
        },
        "bodies": {
            "en": "Monthly startup networking event at Vienna's largest startup hub. Pitch sessions, founder talks, and casual networking with investors and fellow entrepreneurs. Free drinks and snacks included.",
            "de": "Monatliches Startup-Networking-Event in Wiens größtem Startup-Hub. Pitch-Sessions, Gründer-Talks und lockeres Networking mit Investoren und Unternehmern. Gratis Getränke und Snacks inklusive.",
            "ru": "Ежемесячный нетворкинг стартапов в крупнейшем стартап-хабе Вены. Питч-сессии, выступления основателей и неформальное общение с инвесторами и предпринимателями. Бесплатные напитки и закуски.",
            "uk": "Щомісячний нетворкінг стартапів у найбільшому стартап-хабі Відня. Пітч-сесії, виступи засновників та неформальне спілкування з інвесторами та підприємцями. Безкоштовні напої та закуски.",
            "es": "Evento mensual de networking de startups en el mayor hub de startups de Viena. Sesiones de pitch, charlas de fundadores y networking informal con inversores y emprendedores. Bebidas y snacks gratis incluidos.",
        },
    },
    # 26. Outdoor Fitness — Augarten Morning
    {
        "iso_local": "2026-05-26 07:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Augarten, Obere Augartenstraße, Vienna",
        "venue_short": "Augarten",
        "lat": 48.2250,
        "lng": 16.3720,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/vienna-fitness",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80"],
        "titles": {
            "en": "Outdoor Fitness — Augarten Morning",
            "de": "Outdoor-Fitness — Augarten Morgen",
            "ru": "Фитнес на свежем воздухе — утро в Аугартене",
            "uk": "Фітнес на свіжому повітрі — ранок в Аугартені",
            "es": "Fitness al aire libre — Mañana en Augarten",
        },
        "bodies": {
            "en": "Free morning bootcamp in the beautiful Augarten park — HIIT, bodyweight exercises, and stretching under the old chestnut trees. All fitness levels welcome. Start your day with energy and community.",
            "de": "Kostenloses Morgen-Bootcamp im wunderschönen Augarten — HIIT, Bodyweight-Übungen und Stretching unter den alten Kastanienbäumen. Alle Fitnesslevel willkommen. Den Tag mit Energie und Gemeinschaft starten.",
            "ru": "Бесплатная утренняя тренировка в красивом парке Аугартен — HIIT, упражнения с собственным весом и растяжка под старыми каштанами. Все уровни подготовки приветствуются.",
            "uk": "Безкоштовне ранкове тренування в красивому парку Аугартен — HIIT, вправи з власною вагою та розтяжка під старими каштанами. Усі рівні підготовки вітаються.",
            "es": "Bootcamp matutino gratuito en el hermoso parque Augarten — HIIT, ejercicios con peso corporal y estiramientos bajo los viejos castaños. Todos los niveles de fitness bienvenidos.",
        },
    },
    # 27. Flohmarkt am Naschmarkt
    {
        "iso_local": "2026-05-31 06:30",
        "duration_minutes": 360,
        "category": "other",
        "address": "Naschmarkt Flohmarkt, Wienzeile, Vienna",
        "venue_short": "Naschmarkt",
        "lat": 48.1990,
        "lng": 16.3630,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.wien.gv.at/freizeit/einkaufen/maerkte/flohmarkt",
        "source_label": "wien.gv.at",
        "photos": ["https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80"],
        "titles": {
            "en": "Flohmarkt am Naschmarkt",
            "de": "Flohmarkt am Naschmarkt",
            "ru": "Блошиный рынок на Нашмаркте",
            "uk": "Блошиний ринок на Нашмаркті",
            "es": "Mercado de pulgas en el Naschmarkt",
        },
        "bodies": {
            "en": "Vienna's legendary Saturday flea market at the Naschmarkt — vintage furniture, vinyl records, antiques, clothing, and curiosities. Arrive early for the best finds. A treasure hunter's paradise since 1977.",
            "de": "Wiens legendärer Samstags-Flohmarkt am Naschmarkt — Vintage-Möbel, Schallplatten, Antiquitäten, Kleidung und Kuriositäten. Früh kommen für die besten Funde. Ein Schatzsucher-Paradies seit 1977.",
            "ru": "Легендарный субботний блошиный рынок Вены на Нашмаркте — винтажная мебель, виниловые пластинки, антиквариат, одежда и курьёзы. Приходите рано за лучшими находками. Рай для охотников за сокровищами с 1977 года.",
            "uk": "Легендарний суботній блошиний ринок Відня на Нашмаркті — вінтажні меблі, вінілові платівки, антикваріат, одяг та курйози. Приходьте рано за найкращими знахідками. Рай для мисливців за скарбами з 1977 року.",
            "es": "El legendario mercado de pulgas sabatino de Viena en el Naschmarkt — muebles vintage, discos de vinilo, antigüedades, ropa y curiosidades. Llega temprano para los mejores hallazgos. Un paraíso para cazadores de tesoros desde 1977.",
        },
    },
    # 28. Danube Canal Street Art Tour
    {
        "iso_local": "2026-06-16 15:00",
        "duration_minutes": 120,
        "category": "guided-tours",
        "address": "Donaukanal, Schwedenplatz, Vienna",
        "venue_short": "Donaukanal",
        "lat": 48.2120,
        "lng": 16.3770,
        "is_free": False,
        "price": 20,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.viennastreetart.at",
        "source_label": "viennastreetart.at",
        "photos": ["https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80"],
        "titles": {
            "en": "Danube Canal Street Art Tour",
            "de": "Donaukanal Street-Art-Tour",
            "ru": "Тур по стрит-арту Дунайского канала",
            "uk": "Тур стріт-артом Дунайського каналу",
            "es": "Tour de arte urbano del Canal del Danubio",
        },
        "bodies": {
            "en": "Guided walking tour along the Danube Canal's vibrant street art scene — murals, graffiti, and urban art by local and international artists. Learn about Vienna's evolving urban culture and creative community.",
            "de": "Geführter Spaziergang entlang der lebendigen Street-Art-Szene am Donaukanal — Wandbilder, Graffiti und Urban Art von lokalen und internationalen Künstlern. Über Wiens urbane Kultur und kreative Community erfahren.",
            "ru": "Пешая экскурсия вдоль яркой стрит-арт-сцены Дунайского канала — муралы, граффити и городское искусство местных и международных художников. Узнайте о развивающейся городской культуре Вены.",
            "uk": "Піша екскурсія вздовж яскравої стріт-арт-сцени Дунайського каналу — мурали, графіті та міське мистецтво місцевих та міжнародних художників. Дізнайтесь про міську культуру Відня, що розвивається.",
            "es": "Tour a pie guiado por la vibrante escena de arte urbano del Canal del Danubio — murales, grafitis y arte urbano de artistas locales e internacionales. Conoce la cultura urbana en evolución de Viena.",
        },
    },
    # 29. Classical Concert at Musikverein
    {
        "iso_local": "2026-06-20 19:30",
        "duration_minutes": 120,
        "category": "music",
        "address": "Musikverein, Musikvereinsplatz 1, Vienna",
        "venue_short": "Musikverein",
        "lat": 48.2000,
        "lng": 16.3720,
        "is_free": False,
        "price": 55,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.musikverein.at",
        "source_label": "musikverein.at",
        "photos": ["https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80"],
        "titles": {
            "en": "Classical Concert at Musikverein",
            "de": "Klassisches Konzert im Musikverein",
            "ru": "Классический концерт в Музикферайне",
            "uk": "Класичний концерт у Музікферайні",
            "es": "Concierto clásico en el Musikverein",
        },
        "bodies": {
            "en": "An evening of classical music in the Golden Hall of the Musikverein — one of the world's finest concert halls with legendary acoustics. Experience the grandeur of Viennese musical tradition.",
            "de": "Ein Abend klassischer Musik im Goldenen Saal des Musikvereins — einer der besten Konzertsäle der Welt mit legendärer Akustik. Die Pracht der Wiener Musiktradition erleben.",
            "ru": "Вечер классической музыки в Золотом зале Музикферайна — одном из лучших концертных залов мира с легендарной акустикой. Ощутите величие венской музыкальной традиции.",
            "uk": "Вечір класичної музики в Золотому залі Музікферайну — одному з найкращих концертних залів світу з легендарною акустикою. Відчуйте велич віденської музичної традиції.",
            "es": "Una velada de música clásica en la Sala Dorada del Musikverein — una de las mejores salas de conciertos del mundo con acústica legendaria. Experimenta la grandeza de la tradición musical vienesa.",
        },
    },
    # 30. Prater Amusement Park — Riesenrad Sunset
    {
        "iso_local": "2026-06-22 19:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Wiener Prater, Riesenradplatz, Vienna",
        "venue_short": "Prater",
        "lat": 48.2170,
        "lng": 16.3950,
        "is_free": False,
        "price": 14,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.wienerriesenrad.com",
        "source_label": "wienerriesenrad.com",
        "photos": ["https://images.unsplash.com/photo-1570179538662-faa5e38a5e11?w=800&q=80"],
        "titles": {
            "en": "Prater Amusement Park — Riesenrad Sunset",
            "de": "Wiener Prater — Riesenrad bei Sonnenuntergang",
            "ru": "Парк Пратер — закат на колесе обозрения",
            "uk": "Парк Пратер — захід сонця на оглядовому колесі",
            "es": "Parque de atracciones Prater — Atardecer en la Riesenrad",
        },
        "bodies": {
            "en": "Ride the iconic Wiener Riesenrad at sunset for panoramic views over Vienna. The historic 1897 Ferris wheel offers a magical perspective of the city bathed in golden evening light. A quintessential Vienna experience.",
            "de": "Mit dem ikonischen Wiener Riesenrad bei Sonnenuntergang fahren und Panoramablicke über Wien genießen. Das historische Riesenrad von 1897 bietet eine magische Perspektive auf die Stadt im goldenen Abendlicht.",
            "ru": "Прокатитесь на культовом Венском колесе обозрения на закате с панорамными видами на Вену. Историческое колесо 1897 года дарит волшебную перспективу города в золотом вечернем свете.",
            "uk": "Прокатіться на культовому Віденському оглядовому колесі на заході сонця з панорамними краєвидами на Відень. Історичне колесо 1897 року дарує чарівну перспективу міста в золотому вечірньому світлі.",
            "es": "Sube a la icónica Riesenrad de Viena al atardecer para disfrutar de vistas panorámicas de la ciudad. La histórica noria de 1897 ofrece una perspectiva mágica de Viena bañada en luz dorada vespertina.",
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
            "city": "Vienna",
            "city_id": VIENNA_CITY_ID,
            "country": "AT",
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
