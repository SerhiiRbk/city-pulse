#!/usr/bin/env python3
"""Seed 20 Prague system events for 23 May - 30 June 2026 (round 5)."""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

ssl._create_default_https_context = ssl._create_unverified_context

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env.local"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

CITY_ID = "46837694-6917-48cc-843b-338c297394ec"
SYSTEM_ORGANIZER_ID = "acbb238e-f24f-4534-b92a-fa4bcfc7e07e"

CAT = {
    "music": "87186d0a-5631-4b30-863f-fabd5d8f74e4",
    "guided-tours": "77d52bca-998b-4edd-bfb0-e71d5ee264c0",
    "running": "eebf6066-7396-4c79-9b48-60ab375fd9e0",
    "dancing": "a265eff9-ce91-417f-8780-493d024a9e85",
    "museums": "d9b20fbf-7a7e-466b-acf5-1c379e6b94d6",
    "craft-beer": "16d1baf1-d04e-40e0-b3fb-f791c071e6e3",
    "wine-tasting": "e6428a86-ac38-414a-988c-2ce103ae5b13",
    "food-tours": "c06ab503-5719-4c1c-bd8f-34828aa7ed5c",
    "networking": "71835799-4ffd-46b1-b6e5-f7fd9ebc11b6",
    "standup": "7a62f02d-63cc-4dba-a2b8-757c0adcc7a0",
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

LANG_ORDER = ["en", "ru", "uk", "cs", "de", "es"]
LANG_LABEL = {
    "en": "English",
    "ru": "Русский",
    "uk": "Українська",
    "cs": "Čeština",
    "de": "Deutsch",
    "es": "Español",
}


def t_text(text: str, marks=None):
    node = {"type": "text", "text": text}
    if marks:
        node["marks"] = marks
    return node


def t_link(label: str, href: str):
    return t_text(label, [{"type": "link", "attrs": {"href": href}}])


def t_h2(text: str):
    return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(text)]}


def t_h3(text: str):
    return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(text)]}


def t_para(*nodes):
    return {"type": "paragraph", "content": list(nodes)}


def build_description(titles, bodies, when_label, venue, source_url, source_label):
    blocks = []
    for lang in LANG_ORDER:
        blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
        blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}


def local_to_utc(iso_local: str):
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    return (dt - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def human_date(iso_local: str):
    return datetime.strptime(iso_local, "%Y-%m-%d %H:%M").strftime("%d %b %Y, %H:%M")


def ev(iso, dur, cat, address, venue, lat, lng, free, price, langs, source, source_label, photo, titles, bodies, currency="CZK"):
    return {
        "iso_local": iso,
        "duration_minutes": dur,
        "category": cat,
        "address": address,
        "venue": venue,
        "lat": lat,
        "lng": lng,
        "is_free": free,
        "price": price,
        "currency": currency,
        "languages": langs,
        "source_url": source,
        "source_label": source_label,
        "photo": photo,
        "titles": titles,
        "bodies": bodies,
    }


EVENTS = [
    ev(
        "2026-05-23 11:00", 240, "other", "Malá sportovní hala, Výstaviště 67, Praha 7",
        "Malá sportovní hala", 50.1066, 14.4296, False, None, ["cs", "en"],
        "https://www.ticketmaster.cz/event/tattoo-convention-prague-2026-saturday-23-5-2026-tickets/924674703?language=en-us",
        "ticketmaster.cz", "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80",
        {
            "en": "Tattoo Convention Prague 2026 — Saturday",
            "ru": "Tattoo Convention Prague 2026 — суббота",
            "uk": "Tattoo Convention Prague 2026 — субота",
            "cs": "Tattoo Convention Prague 2026 — sobota",
            "de": "Tattoo Convention Prague 2026 — Samstag",
            "es": "Tattoo Convention Prague 2026 — sábado",
        },
        {
            "en": "A full day of tattoo artists, live shows and alternative culture at Výstaviště. It is easy to walk around in a small group, compare styles and meet people who share the same visual tastes.",
            "ru": "Целый день тату-мастеров, шоу и альтернативной культуры на Výstaviště. Удобно прийти небольшой компанией, смотреть стили и знакомиться с людьми со схожим вкусом.",
            "uk": "Цілий день тату-майстрів, шоу та альтернативної культури на Výstaviště. Зручно прийти невеликою компанією, дивитися стилі й знайомитися з людьми зі схожим смаком.",
            "cs": "Celý den tatérů, live show a alternativní kultury na Výstavišti. Ideální akce pro malou partu, prohlížení stylů a potkávání lidí s podobným vkusem.",
            "de": "Ein ganzer Tag mit Tattoo-Künstlern, Shows und alternativer Kultur auf dem Výstaviště. Gut für eine kleine Gruppe, um Stile zu vergleichen und Gleichgesinnte zu treffen.",
            "es": "Un día completo de tatuadores, shows y cultura alternativa en Výstaviště. Fácil para ir en grupo pequeño, comparar estilos y conocer gente con gustos parecidos.",
        },
    ),
    ev(
        "2026-05-23 18:00", 240, "dancing", "Czech Boat, Dvořákovo nábřeží, Praha 1",
        "Czech Boat", 50.0920, 14.4169, False, None, ["en", "cs"],
        "https://ra.co/events/2402567", "ra.co",
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
        {
            "en": "Mikro Boat 2026 — Sunset Cruise",
            "ru": "Mikro Boat 2026 — вечерний круиз",
            "uk": "Mikro Boat 2026 — вечірній круїз",
            "cs": "Mikro Boat 2026 — večerní plavba",
            "de": "Mikro Boat 2026 — Sunset Cruise",
            "es": "Mikro Boat 2026 — crucero al atardecer",
        },
        {
            "en": "A four-hour Vltava sunset cruise with minimal, house and tech house sounds. Limited capacity makes it a good pick for a small crew that wants music, views and an afterparty option.",
            "ru": "Четырёхчасовой круиз по Влтаве на закате с minimal, house и tech house. Ограниченная вместимость делает событие хорошим выбором для небольшой компании.",
            "uk": "Чотиригодинний круїз Влтавою на заході сонця з minimal, house і tech house. Обмежена місткість робить подію гарним вибором для невеликої компанії.",
            "cs": "Čtyřhodinová plavba po Vltavě při západu slunce s minimal, house a tech house hudbou. Omezená kapacita je ideální pro menší partu.",
            "de": "Vier Stunden auf der Moldau bei Sonnenuntergang mit Minimal, House und Tech House. Die begrenzte Kapazität passt gut für eine kleine Crew.",
            "es": "Crucero de cuatro horas por el Moldava al atardecer con minimal, house y tech house. La capacidad limitada lo hace perfecto para una crew pequeña.",
        },
    ),
    ev(
        "2026-05-24 12:00", 300, "food-tours", "Karlínské náměstí, Praha 8",
        "Karlínské náměstí", 50.0925, 14.4505, True, None, ["cs", "en"],
        "https://www.pragueexperience.com/events/events.asp?EventMonth=05&EventYear=2026",
        "pragueexperience.com", "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80",
        {
            "en": "Beer & Burger Festival at Karlín Square",
            "ru": "Beer & Burger Festival на Карлинской площади",
            "uk": "Beer & Burger Festival на Карлінській площі",
            "cs": "Beer & Burger Festival na Karlínském náměstí",
            "de": "Beer & Burger Festival am Karlín-Platz",
            "es": "Beer & Burger Festival en la plaza de Karlín",
        },
        {
            "en": "Street food, craft beer and music in Karlín. A low-pressure daytime plan where a crew can meet, try different stands and stay as long as the mood is good.",
            "ru": "Стрит-фуд, крафтовое пиво и музыка в Карлине. Ненапряжённый дневной план: встретиться компанией, попробовать разные стенды и остаться сколько захочется.",
            "uk": "Стрит-фуд, крафтове пиво й музика в Карліні. Невимушений денний план: зустрітися компанією, спробувати різні стенди й залишитися скільки хочеться.",
            "cs": "Street food, craft beer a hudba v Karlíně. Nenáročný denní plán, kde se parta může potkat, ochutnávat a zůstat podle nálady.",
            "de": "Streetfood, Craft Beer und Musik in Karlín. Ein entspannter Tagesplan, bei dem eine Crew verschiedene Stände ausprobieren kann.",
            "es": "Street food, cerveza artesanal y música en Karlín. Un plan diurno relajado para quedar, probar puestos y quedarse mientras haya buen ambiente.",
        },
    ),
    ev(
        "2026-05-25 19:30", 120, "standup", "Malá Strana, Praha 1",
        "Malá Strana", 50.0870, 14.4047, False, None, ["en"],
        "https://www.praguefringe.com/", "praguefringe.com",
        "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&q=80",
        {
            "en": "Prague Fringe — Opening Night",
            "ru": "Prague Fringe — вечер открытия",
            "uk": "Prague Fringe — вечір відкриття",
            "cs": "Prague Fringe — zahajovací večer",
            "de": "Prague Fringe — Eröffnungsabend",
            "es": "Prague Fringe — noche inaugural",
        },
        {
            "en": "English-language theatre, comedy and performance across intimate Malá Strana venues. Great for expats because the shows are short, social and easy to discuss afterwards.",
            "ru": "Англоязычный театр, комедия и перформанс на камерных площадках Малой Страны. Хорошо для экспатов: шоу короткие, социальные и их легко обсудить после.",
            "uk": "Англомовний театр, комедія та перформанс на камерних майданчиках Малої Страни. Добре для експатів: шоу короткі, соціальні й їх легко обговорити після.",
            "cs": "Anglickojazyčné divadlo, komedie a performance v komorních prostorech Malé Strany. Skvělé pro expaty i následnou debatu po představení.",
            "de": "Englischsprachiges Theater, Comedy und Performance in kleinen Venues auf der Kleinseite. Gut für Expats und Gespräche nach der Show.",
            "es": "Teatro, comedia y performance en inglés en espacios íntimos de Malá Strana. Ideal para expats: shows cortos, sociales y fáciles de comentar después.",
        },
    ),
    ev(
        "2026-05-29 18:00", 240, "guided-tours", "Various churches, Prague",
        "Various churches", 50.0875, 14.4213, True, None, ["cs", "en"],
        "https://www.nockostelu.cz/", "nockostelu.cz",
        "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1200&q=80",
        {
            "en": "Night of Churches — Prague Evening Route",
            "ru": "Ночь костёлов — вечерний маршрут по Праге",
            "uk": "Ніч костелів — вечірній маршрут Прагою",
            "cs": "Noc kostelů — večerní trasa Prahou",
            "de": "Nacht der Kirchen — Abendroute durch Prag",
            "es": "Noche de las Iglesias — ruta nocturna por Praga",
        },
        {
            "en": "A free evening route through churches and chapels that are usually hard to visit at night. Perfect for a slow walking crew, photography and quiet conversations between stops.",
            "ru": "Бесплатный вечерний маршрут по храмам и часовням, куда обычно сложно попасть ночью. Идеально для неспешной прогулки, фото и разговоров между остановками.",
            "uk": "Безкоштовний вечірній маршрут храмами й каплицями, куди зазвичай складно потрапити вночі. Ідеально для повільної прогулянки, фото та розмов між зупинками.",
            "cs": "Bezplatná večerní trasa po kostelech a kaplích, kam se v noci běžně nedostanete. Ideální pro pomalou procházku, focení a klidné rozhovory.",
            "de": "Eine kostenlose Abendroute durch Kirchen und Kapellen, die nachts sonst schwer zugänglich sind. Perfekt für eine ruhige Walking-Crew.",
            "es": "Ruta nocturna gratuita por iglesias y capillas que normalmente no se visitan de noche. Perfecta para una crew tranquila, fotos y conversación.",
        },
    ),
    ev(
        "2026-05-30 14:00", 240, "wine-tasting", "Svatováclavská vinice, Staré zámecké schody 6, Praha 1",
        "St. Wenceslas Vineyard", 50.0921, 14.4037, False, None, ["cs", "en"],
        "https://www.villarichter.cz/", "villarichter.cz",
        "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&q=80",
        {
            "en": "Bubble Wine Festival at St. Wenceslas Vineyard",
            "ru": "Bubble Wine Festival на винограднике Святого Вацлава",
            "uk": "Bubble Wine Festival на винограднику Святого Вацлава",
            "cs": "Bubble Wine Festival na Svatováclavské vinici",
            "de": "Bubble Wine Festival im St.-Wenzels-Weinberg",
            "es": "Bubble Wine Festival en el viñedo de San Wenceslao",
        },
        {
            "en": "Sparkling wines, castle views and a relaxed vineyard atmosphere above the city. A polished social event for a small crew that wants something festive but not too loud.",
            "ru": "Игристые вина, виды на замок и расслабленная атмосфера виноградника над городом. Элегантное событие для небольшой компании без слишком шумной вечеринки.",
            "uk": "Ігристі вина, види на замок і розслаблена атмосфера виноградника над містом. Елегантна подія для невеликої компанії без надто гучної вечірки.",
            "cs": "Šumivá vína, výhledy na hrad a uvolněná atmosféra vinice nad městem. Elegantní společenská akce pro menší partu.",
            "de": "Schaumweine, Burgblick und entspannte Weinberg-Atmosphäre über der Stadt. Ein stilvolles Social Event für eine kleine Crew.",
            "es": "Vinos espumosos, vistas al castillo y ambiente relajado en un viñedo sobre la ciudad. Evento social elegante para una crew pequeña.",
        },
    ),
    ev(
        "2026-06-01 10:00", 180, "museums", "National Museum, Václavské náměstí 68, Praha 1",
        "National Museum", 50.0796, 14.4301, True, None, ["cs", "en"],
        "https://www.pragueexperience.com/events/events.asp?EventMonth=06&EventYear=2026",
        "pragueexperience.com", "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=1200&q=80",
        {
            "en": "National Museum — Free Admission Day",
            "ru": "Национальный музей — день бесплатного входа",
            "uk": "Національний музей — день безкоштовного входу",
            "cs": "Národní muzeum — den vstupu zdarma",
            "de": "Nationalmuseum — Tag mit freiem Eintritt",
            "es": "Museo Nacional — día de entrada gratuita",
        },
        {
            "en": "A free chance to explore the National Museum buildings and exhibitions. Easy daytime plan for newcomers, students and anyone who prefers a quiet cultural meetup.",
            "ru": "Бесплатная возможность посмотреть здания и экспозиции Национального музея. Удобный дневной план для новичков, студентов и тех, кто любит спокойные культурные встречи.",
            "uk": "Безкоштовна можливість побачити будівлі та експозиції Національного музею. Зручний денний план для новачків, студентів і тих, хто любить спокійні культурні зустрічі.",
            "cs": "Bezplatná příležitost projít budovy a expozice Národního muzea. Snadný denní plán pro nově příchozí, studenty i klidné kulturní setkání.",
            "de": "Eine kostenlose Gelegenheit, die Gebäude und Ausstellungen des Nationalmuseums zu erkunden. Guter Tagesplan für Neuankömmlinge und Kulturfans.",
            "es": "Oportunidad gratuita para explorar los edificios y exposiciones del Museo Nacional. Plan diurno fácil para recién llegados, estudiantes y amantes de la cultura tranquila.",
        },
    ),
    ev(
        "2026-06-03 19:30", 120, "music", "Riegrovy sady, Praha 2",
        "Riegrovy sady", 50.0805, 14.4419, False, None, ["cs"],
        "https://goout.net/en/wohnout/szynsgy/", "goout.net",
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80",
        {
            "en": "Wohnout — Prague Open Air",
            "ru": "Wohnout — Prague Open Air",
            "uk": "Wohnout — Prague Open Air",
            "cs": "Wohnout — Prague Open Air",
            "de": "Wohnout — Prague Open Air",
            "es": "Wohnout — Prague Open Air",
        },
        {
            "en": "A Czech rock evening in Riegrovy sady as part of Prague Open Air. Good for locals and expats who want to discover a well-known Czech band in a summer park setting.",
            "ru": "Вечер чешского рока в Риегровых садах в рамках Prague Open Air. Хорошо для местных и экспатов, которые хотят открыть известную чешскую группу в летнем парке.",
            "uk": "Вечір чеського року в Ріегрових садах у межах Prague Open Air. Добре для місцевих і експатів, які хочуть відкрити відомий чеський гурт у літньому парку.",
            "cs": "Český rockový večer v Riegrových sadech v rámci Prague Open Air. Skvělé pro místní i expaty, kteří chtějí zažít známou českou kapelu v letním parku.",
            "de": "Ein tschechischer Rockabend in den Riegrovy sady im Rahmen von Prague Open Air. Gut für Locals und Expats, die eine bekannte tschechische Band entdecken möchten.",
            "es": "Noche de rock checo en Riegrovy sady dentro de Prague Open Air. Buena para locales y expats que quieren descubrir una banda checa conocida en un parque de verano.",
        },
    ),
    ev(
        "2026-06-04 18:00", 240, "running", "Letná Park, Praha 7",
        "Letná Park", 50.0960, 14.4200, False, None, ["cs", "en"],
        "https://www.climbingworldcup.cz/", "climbingworldcup.cz",
        "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&q=80",
        {
            "en": "Climbing World Cup — Letná Park",
            "ru": "Climbing World Cup в Летенских садах",
            "uk": "Climbing World Cup у Летенських садах",
            "cs": "Climbing World Cup v Letenských sadech",
            "de": "Climbing World Cup im Letná-Park",
            "es": "Climbing World Cup en Letná Park",
        },
        {
            "en": "World-class sport climbing in an open-air Prague setting. A lively spectator event with food, music and plenty of space to meet friends between rounds.",
            "ru": "Скалолазание мирового уровня в пражском open-air формате. Живое спортивное событие с едой, музыкой и пространством для встреч между раундами.",
            "uk": "Скелелазіння світового рівня у празькому open-air форматі. Жива спортивна подія з їжею, музикою та простором для зустрічей між раундами.",
            "cs": "Světové sportovní lezení pod širým nebem v Praze. Živá divácká akce s jídlem, hudbou a prostorem pro setkávání mezi koly.",
            "de": "Sportklettern auf Weltklasse-Niveau unter freiem Himmel in Prag. Lebendiges Zuschauer-Event mit Essen, Musik und viel Platz zum Treffen.",
            "es": "Escalada deportiva de nivel mundial al aire libre en Praga. Evento animado para espectadores con comida, música y espacio para quedar entre rondas.",
        },
    ),
    ev(
        "2026-06-05 17:00", 300, "food-tours", "Holešovice Market, Bubenské nábřeží, Praha 7",
        "Holešovice Market", 50.1036, 14.4474, False, None, ["cs", "en"],
        "https://slavnostcideru.cz/", "slavnostcideru.cz",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
        {
            "en": "Slavnost Cideru — Cider Festival",
            "ru": "Slavnost Cideru — фестиваль сидра",
            "uk": "Slavnost Cideru — фестиваль сидру",
            "cs": "Slavnost Cideru — festival cideru",
            "de": "Slavnost Cideru — Cider-Festival",
            "es": "Slavnost Cideru — festival de sidra",
        },
        {
            "en": "Cider tastings, street food and a relaxed market atmosphere in Holešovice. A friendly plan for people who want a social evening without committing to one fixed table.",
            "ru": "Дегустации сидра, стрит-фуд и расслабленная рыночная атмосфера в Голешовице. Дружелюбный план для вечера без необходимости сидеть весь вечер за одним столом.",
            "uk": "Дегустації сидру, стрит-фуд і розслаблена ринкова атмосфера в Голешовіце. Дружній план для вечора без потреби сидіти весь час за одним столом.",
            "cs": "Ochutnávky cideru, street food a uvolněná tržní atmosféra v Holešovicích. Přátelský plán pro společenský večer bez pevného sezení.",
            "de": "Cider-Tastings, Streetfood und entspannte Markt-Atmosphäre in Holešovice. Ein freundlicher Abendplan ohne festen Tisch.",
            "es": "Catas de sidra, street food y ambiente relajado de mercado en Holešovice. Plan social fácil sin tener que quedarse en una sola mesa.",
        },
    ),
    ev(
        "2026-06-06 23:00", 360, "dancing", "Cross Club, Plynární 23, Praha 7",
        "Cross Club", 50.1098, 14.4439, False, None, ["cs", "en"],
        "https://ra.co/events/2435163", "ra.co",
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
        {
            "en": "Rolling Deeper at Cross Club",
            "ru": "Rolling Deeper в Cross Club",
            "uk": "Rolling Deeper у Cross Club",
            "cs": "Rolling Deeper v Cross Clubu",
            "de": "Rolling Deeper im Cross Club",
            "es": "Rolling Deeper en Cross Club",
        },
        {
            "en": "A drum and bass / jungle night at one of Prague's most iconic clubs. Strong choice for late-night people who want a high-energy crew plan.",
            "ru": "Drum and bass / jungle ночь в одном из самых узнаваемых клубов Праги. Сильный вариант для ночных людей, которым нужен энергичный план с компанией.",
            "uk": "Drum and bass / jungle ніч в одному з найвідоміших клубів Праги. Сильний варіант для нічних людей, яким потрібен енергійний план із компанією.",
            "cs": "Drum and bass / jungle noc v jednom z nejikoničtějších pražských klubů. Silná volba pro noční typy a energickou partu.",
            "de": "Drum-and-Bass/Jungle-Nacht in einem der ikonischsten Clubs Prags. Gute Wahl für Nachteulen und eine energievolle Crew.",
            "es": "Noche de drum and bass / jungle en uno de los clubs más icónicos de Praga. Buena opción para noctámbulos y una crew con energía.",
        },
    ),
    ev(
        "2026-06-07 10:00", 180, "music", "Municipal House, náměstí Republiky 5, Praha 1",
        "Municipal House", 50.0876, 14.4287, False, None, ["en"],
        "https://www.encoretours.com/festivals/encore-voices-prague/", "encoretours.com",
        "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80",
        {
            "en": "Encore Voices Prague Festival",
            "ru": "Encore Voices Prague Festival",
            "uk": "Encore Voices Prague Festival",
            "cs": "Encore Voices Prague Festival",
            "de": "Encore Voices Prague Festival",
            "es": "Encore Voices Prague Festival",
        },
        {
            "en": "An international choir week in Prague, culminating in Brahms' German Requiem at Smetana Hall. A beautiful event for classical music lovers and singers visiting the city.",
            "ru": "Международная хоровая неделя в Праге с кульминацией в виде Немецкого реквиема Брамса в Smetana Hall. Красивое событие для любителей классики и певцов.",
            "uk": "Міжнародний хоровий тиждень у Празі з кульмінацією у вигляді Німецького реквієму Брамса в Smetana Hall. Гарна подія для любителів класики та співаків.",
            "cs": "Mezinárodní sborový týden v Praze vrcholící Brahmsovým Německým requiem ve Smetanově síni. Krásná akce pro milovníky klasiky i zpěváky.",
            "de": "Eine internationale Chorwoche in Prag mit Brahms' Deutschem Requiem im Smetana-Saal als Höhepunkt. Schön für Klassikfans und Sänger.",
            "es": "Semana coral internacional en Praga que culmina con el Réquiem alemán de Brahms en la Sala Smetana. Evento precioso para amantes de la música clásica y cantantes.",
        },
    ),
    ev(
        "2026-06-11 09:00", 480, "networking", "PVA Expo Praha, Beranových 667, Praha 9",
        "PVA Expo Praha", 50.1299, 14.5140, False, None, ["en"],
        "https://btcprague.com/", "btcprague.com",
        "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&q=80",
        {
            "en": "BTC Prague 2026",
            "ru": "BTC Prague 2026",
            "uk": "BTC Prague 2026",
            "cs": "BTC Prague 2026",
            "de": "BTC Prague 2026",
            "es": "BTC Prague 2026",
        },
        {
            "en": "A large Bitcoin conference with talks, expo booths and side events. Useful for founders, developers and curious newcomers who want a networking-heavy plan.",
            "ru": "Большая Bitcoin-конференция с лекциями, стендами и сайд-ивентами. Подходит фаундерам, разработчикам и новичкам, которые хотят нетворкинга.",
            "uk": "Велика Bitcoin-конференція з лекціями, стендами та side events. Підходить фаундерам, розробникам і новачкам, які хочуть нетворкінгу.",
            "cs": "Velká bitcoinová konference s přednáškami, expo stánky a doprovodnými akcemi. Vhodné pro foundery, vývojáře i zvědavé nováčky.",
            "de": "Große Bitcoin-Konferenz mit Talks, Expo-Ständen und Side Events. Nützlich für Gründer, Entwickler und neugierige Neueinsteiger.",
            "es": "Gran conferencia de Bitcoin con charlas, stands y eventos paralelos. Útil para founders, desarrolladores y curiosos que buscan networking.",
        },
    ),
    ev(
        "2026-06-12 14:00", 240, "craft-beer", "Royal Garden, Prague Castle, Praha 1",
        "Royal Garden", 50.0917, 14.4009, False, None, ["cs", "en"],
        "https://www.minipivo.cz/", "minipivo.cz",
        "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80",
        {
            "en": "Festival of Microbreweries at Prague Castle",
            "ru": "Фестиваль мини-пивоварен у Пражского Града",
            "uk": "Фестиваль міні-пивоварень біля Празького Граду",
            "cs": "Festival minipivovarů na Pražském hradě",
            "de": "Festival der Mikrobrauereien auf der Prager Burg",
            "es": "Festival de microcervecerías en el Castillo de Praga",
        },
        {
            "en": "Dozens of Czech microbreweries in the Royal Garden of Prague Castle. A strong social tasting event with a beautiful setting and many natural conversation starters.",
            "ru": "Десятки чешских мини-пивоварен в Королевском саду Пражского Града. Отличное дегустационное событие с красивым местом и множеством тем для разговора.",
            "uk": "Десятки чеських міні-пивоварень у Королівському саду Празького Граду. Чудова дегустаційна подія з гарним місцем і багатьма темами для розмови.",
            "cs": "Desítky českých minipivovarů v Královské zahradě Pražského hradu. Silná degustační akce s krásným prostředím a spoustou témat k hovoru.",
            "de": "Dutzende tschechische Mikrobrauereien im Königlichen Garten der Prager Burg. Ein starkes Tasting-Event mit schöner Kulisse.",
            "es": "Decenas de microcervecerías checas en el Jardín Real del Castillo de Praga. Evento social de cata con un entorno precioso.",
        },
    ),
    ev(
        "2026-06-13 13:00", 420, "music", "Štvanice Island, Praha 7",
        "Štvanice Island", 50.0956, 14.4390, False, None, ["en", "cs"],
        "https://goout.net/en/respect-festival-open-air-2026/szjcdhy/", "goout.net",
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80",
        {
            "en": "Respect Festival Open Air 2026",
            "ru": "Respect Festival Open Air 2026",
            "uk": "Respect Festival Open Air 2026",
            "cs": "Respect Festival Open Air 2026",
            "de": "Respect Festival Open Air 2026",
            "es": "Respect Festival Open Air 2026",
        },
        {
            "en": "A world music open-air on Štvanice Island with an international crowd and relaxed festival rhythm. Great for people who want music discovery rather than a mainstream concert.",
            "ru": "World music open-air на острове Штванице с международной публикой и расслабленным фестивальным ритмом. Хорошо для тех, кто хочет музыкальных открытий.",
            "uk": "World music open-air на острові Штванице з міжнародною публікою та розслабленим фестивальним ритмом. Добре для тих, хто хоче музичних відкриттів.",
            "cs": "World music open-air na ostrově Štvanice s mezinárodním publikem a uvolněným festivalovým rytmem. Skvělé pro hudební objevování.",
            "de": "World-Music-Open-Air auf der Insel Štvanice mit internationalem Publikum und entspanntem Festivalrhythmus. Gut für musikalische Entdeckungen.",
            "es": "Open-air de world music en la isla Štvanice con público internacional y ritmo relajado. Perfecto para descubrir música fuera del mainstream.",
        },
    ),
    ev(
        "2026-06-13 19:00", 300, "museums", "Various museums, Prague",
        "Various museums", 50.0875, 14.4213, True, None, ["cs", "en"],
        "https://www.prazskamuzejninoc.cz/", "prazskamuzejninoc.cz",
        "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80",
        {
            "en": "Prague Museum Night",
            "ru": "Пражская музейная ночь",
            "uk": "Празька музейна ніч",
            "cs": "Pražská muzejní noc",
            "de": "Prager Museumsnacht",
            "es": "Noche de los Museos de Praga",
        },
        {
            "en": "A citywide evening of museums, galleries and special night programmes. One of the easiest events to turn into a walking route with friends.",
            "ru": "Городской вечер музеев, галерей и специальных ночных программ. Одно из самых удобных событий, чтобы сделать маршрут с друзьями.",
            "uk": "Міський вечір музеїв, галерей і спеціальних нічних програм. Одна з найзручніших подій, щоб зробити маршрут з друзями.",
            "cs": "Městský večer muzeí, galerií a speciálních nočních programů. Jedna z nejsnazších akcí pro společnou trasu s přáteli.",
            "de": "Ein stadtweiter Abend mit Museen, Galerien und speziellen Nachtprogrammen. Sehr einfach als Route mit Freunden zu planen.",
            "es": "Noche urbana de museos, galerías y programas especiales. Una de las formas más fáciles de crear una ruta con amigos.",
        },
    ),
    ev(
        "2026-06-14 10:00", 420, "food-tours", "Náplavka, Rašínovo nábřeží, Praha 2",
        "Náplavka", 50.0720, 14.4180, True, None, ["cs", "en"],
        "https://www.mintmarket.cz/", "mintmarket.cz",
        "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1200&q=80",
        {
            "en": "Mint Market at Náplavka",
            "ru": "Mint Market на Наплавке",
            "uk": "Mint Market на Наплавці",
            "cs": "Mint Market na Náplavce",
            "de": "Mint Market an der Náplavka",
            "es": "Mint Market en Náplavka",
        },
        {
            "en": "Local designers, handmade goods, vegan food and riverside drinks on Náplavka. A light weekend plan for browsing, snacking and meeting people without pressure.",
            "ru": "Локальные дизайнеры, handmade, vegan food и напитки у реки на Наплавке. Лёгкий план выходного дня для прогулки, еды и знакомств без давления.",
            "uk": "Локальні дизайнери, handmade, vegan food і напої біля річки на Наплавці. Легкий план вихідного дня для прогулянки, їжі та знайомств без тиску.",
            "cs": "Lokální designéři, handmade věci, vegan food a nápoje u řeky na Náplavce. Lehký víkendový plán na procházení, jídlo a setkání.",
            "de": "Lokale Designer, Handmade-Produkte, veganes Essen und Drinks am Fluss. Ein leichter Wochenendplan zum Schlendern und Kennenlernen.",
            "es": "Diseñadores locales, handmade, comida vegana y bebidas junto al río. Plan ligero de fin de semana para mirar, comer y conocer gente.",
        },
    ),
    ev(
        "2026-06-16 18:00", 180, "music", "Lucerna Music Bar, Vodičkova 36, Praha 1",
        "Lucerna Music Bar", 50.0812, 14.4256, False, None, ["en"],
        "https://rfpconcerts.cz/en/concert/__trashed/", "rfpconcerts.cz",
        "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80",
        {
            "en": "P.O.D. — Rock for People Afterparty",
            "ru": "P.O.D. — Rock for People Afterparty",
            "uk": "P.O.D. — Rock for People Afterparty",
            "cs": "P.O.D. — Rock for People Afterparty",
            "de": "P.O.D. — Rock for People Afterparty",
            "es": "P.O.D. — Rock for People Afterparty",
        },
        {
            "en": "Hard rock, hip-hop and reggae crossover from P.O.D. in Lucerna Music Bar. A compact club show for people who missed the festival or want one more loud night.",
            "ru": "Hard rock, hip-hop и reggae crossover от P.O.D. в Lucerna Music Bar. Камерный клубный концерт для тех, кто пропустил фестиваль или хочет ещё один громкий вечер.",
            "uk": "Hard rock, hip-hop і reggae crossover від P.O.D. у Lucerna Music Bar. Камерний клубний концерт для тих, хто пропустив фестиваль або хоче ще один гучний вечір.",
            "cs": "Hard rock, hip-hop a reggae crossover od P.O.D. v Lucerna Music Baru. Kompaktní klubový koncert pro ty, kdo chtějí ještě jeden hlasitý večer.",
            "de": "Hard Rock, Hip-Hop und Reggae-Crossover von P.O.D. im Lucerna Music Bar. Kompakte Clubshow für alle, die noch eine laute Nacht wollen.",
            "es": "Hard rock, hip-hop y reggae crossover de P.O.D. en Lucerna Music Bar. Show de club compacto para quien quiere otra noche potente.",
        },
    ),
    ev(
        "2026-06-17 18:00", 150, "running", "Stromovka Park, Praha 7",
        "Stromovka Park", 50.1050, 14.4100, False, None, ["cs", "en"],
        "https://www.runczech.com/", "runczech.com",
        "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80",
        {
            "en": "Prague Relay — Team Run in Stromovka",
            "ru": "Prague Relay — командный забег в Стромовке",
            "uk": "Prague Relay — командний забіг у Стромовці",
            "cs": "Prague Relay — týmový běh ve Stromovce",
            "de": "Prague Relay — Teamlauf in Stromovka",
            "es": "Prague Relay — carrera por equipos en Stromovka",
        },
        {
            "en": "A 4x5 km relay in Stromovka that is practically built for crews. Come to run, cheer or meet a team for an active summer evening.",
            "ru": "Эстафета 4×5 км в Стромовке буквально создана для crews. Можно бежать, болеть или найти команду для активного летнего вечера.",
            "uk": "Естафета 4×5 км у Стромовці буквально створена для crews. Можна бігти, вболівати або знайти команду для активного літнього вечора.",
            "cs": "Štafeta 4×5 km ve Stromovce je prakticky stvořená pro party. Přijďte běžet, fandit nebo najít tým na aktivní letní večer.",
            "de": "Eine 4x5-km-Staffel in Stromovka, fast gemacht für Crews. Zum Laufen, Anfeuern oder Teamfinden.",
            "es": "Relevo de 4x5 km en Stromovka, prácticamente hecho para crews. Para correr, animar o encontrar equipo.",
        },
    ),
    ev(
        "2026-06-19 14:00", 420, "craft-beer", "Náplavka, Rašínovo nábřeží, Praha 2",
        "Náplavka", 50.0720, 14.4180, True, None, ["cs", "en"],
        "https://www.pivonanaplavce.cz/", "pivonanaplavce.cz",
        "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80",
        {
            "en": "Beer Festival at Náplavka",
            "ru": "Пивной фестиваль на Наплавке",
            "uk": "Пивний фестиваль на Наплавці",
            "cs": "Pivo na Náplavce",
            "de": "Bierfestival an der Náplavka",
            "es": "Festival de cerveza en Náplavka",
        },
        {
            "en": "Czech microbreweries, riverside food and free-entry summer atmosphere on Náplavka. One of the easiest places to join a crew and keep the evening flexible.",
            "ru": "Чешские мини-пивоварни, еда у реки и летняя атмосфера с бесплатным входом на Наплавке. Одно из самых простых мест, чтобы присоединиться к компании.",
            "uk": "Чеські міні-пивоварні, їжа біля річки й літня атмосфера з безкоштовним входом на Наплавці. Одне з найпростіших місць, щоб приєднатися до компанії.",
            "cs": "České minipivovary, jídlo u řeky a letní atmosféra s volným vstupem na Náplavce. Jedno z nejsnazších míst pro setkání s partou.",
            "de": "Tschechische Mikrobrauereien, Essen am Fluss und freier Eintritt an der Náplavka. Sehr einfach für eine flexible Crew.",
            "es": "Microcervecerías checas, comida junto al río y ambiente de verano con entrada libre. Muy fácil para unirse a una crew.",
        },
    ),
    ev(
        "2026-06-20 10:00", 420, "food-tours", "Výstaviště Praha, Praha 7",
        "Výstaviště Praha", 50.1066, 14.4296, False, None, ["cs", "en"],
        "https://goout.net/en/prague-ice-cream-festival-2026/ezpycji/", "goout.net",
        "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=1200&q=80",
        {
            "en": "Prague Ice Cream Festival 2026",
            "ru": "Prague Ice Cream Festival 2026",
            "uk": "Prague Ice Cream Festival 2026",
            "cs": "Prague Ice Cream Festival 2026",
            "de": "Prague Ice Cream Festival 2026",
            "es": "Prague Ice Cream Festival 2026",
        },
        {
            "en": "Ice cream, desserts, family-friendly activities and a relaxed day at Výstaviště. A sweet, low-barrier meetup for new people and small crews.",
            "ru": "Мороженое, десерты, активности и расслабленный день на Výstaviště. Сладкий и простой формат встречи для новых людей и небольших компаний.",
            "uk": "Морозиво, десерти, активності та розслаблений день на Výstaviště. Солодкий і простий формат зустрічі для нових людей і невеликих компаній.",
            "cs": "Zmrzlina, dezerty, aktivity a pohodový den na Výstavišti. Sladký a nenáročný meetup pro nové lidi i menší party.",
            "de": "Eis, Desserts, Aktivitäten und ein entspannter Tag auf dem Výstaviště. Süßer, niedrigschwelliger Treffpunkt für neue Leute.",
            "es": "Helados, postres, actividades y un día relajado en Výstaviště. Meetup dulce y fácil para gente nueva y crews pequeñas.",
        },
    ),
    ev(
        "2026-06-20 23:00", 360, "dancing", "Ankali, Lopuchová 58/6, Praha 10",
        "Ankali", 50.0647, 14.4476, False, None, ["en", "cs"],
        "https://ra.co/events/2376592", "ra.co",
        "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=1200&q=80",
        {
            "en": "Gegen Prague at Ankali",
            "ru": "Gegen Prague в Ankali",
            "uk": "Gegen Prague в Ankali",
            "cs": "Gegen Prague v Ankali",
            "de": "Gegen Prague im Ankali",
            "es": "Gegen Prague en Ankali",
        },
        {
            "en": "A queer techno night at Ankali with a strong community atmosphere. Best for people who want a late, expressive and music-focused Prague night.",
            "ru": "Queer techno ночь в Ankali с сильной комьюнити-атмосферой. Подойдёт тем, кто хочет позднюю, выразительную и музыкальную ночь в Праге.",
            "uk": "Queer techno ніч в Ankali з сильною ком’юніті-атмосферою. Підійде тим, хто хоче пізню, виразну й музичну ніч у Празі.",
            "cs": "Queer techno noc v Ankali se silnou komunitní atmosférou. Pro ty, kdo chtějí pozdní, výraznou a hudebně zaměřenou noc v Praze.",
            "de": "Queere Techno-Nacht im Ankali mit starker Community-Atmosphäre. Für eine späte, expressive und musikfokussierte Prager Nacht.",
            "es": "Noche queer techno en Ankali con fuerte ambiente comunitario. Para quienes buscan una noche tardía, expresiva y centrada en la música.",
        },
    ),
    ev(
        "2026-06-24 20:00", 120, "music", "O2 arena, Českomoravská 2345/17, Praha 9",
        "O2 arena", 50.1048, 14.4936, False, None, ["en"],
        "https://www.ticketmaster.cz/artist/duran-duran-tickets/82?language=en-us",
        "ticketmaster.cz", "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80",
        {
            "en": "Duran Duran at O2 arena",
            "ru": "Duran Duran в O2 arena",
            "uk": "Duran Duran в O2 arena",
            "cs": "Duran Duran v O2 areně",
            "de": "Duran Duran in der O2 arena",
            "es": "Duran Duran en O2 arena",
        },
        {
            "en": "The legendary British band returns to Prague's O2 arena. A big nostalgic pop-rock night that is easy to plan with friends and perfect for a pre-show meetup.",
            "ru": "Легендарная британская группа возвращается на пражскую O2 arena. Большой ностальгический pop-rock вечер, который легко планировать с друзьями.",
            "uk": "Легендарний британський гурт повертається на празьку O2 arena. Великий ностальгійний pop-rock вечір, який легко планувати з друзями.",
            "cs": "Legendární britská kapela se vrací do pražské O2 areny. Velký nostalgický pop-rock večer, který se snadno plánuje s přáteli.",
            "de": "Die legendäre britische Band kehrt in die O2 arena Prag zurück. Ein großer nostalgischer Pop-Rock-Abend für Freunde und Pre-Show-Treffen.",
            "es": "La legendaria banda británica vuelve a la O2 arena de Praga. Gran noche pop-rock nostálgica, fácil para planear con amigos.",
        },
    ),
    ev(
        "2026-06-27 20:00", 120, "music", "O2 arena, Českomoravská 2345/17, Praha 9",
        "O2 arena", 50.1048, 14.4936, False, None, ["en"],
        "https://www.onerepublic.com/", "onerepublic.com",
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80",
        {
            "en": "OneRepublic at O2 arena",
            "ru": "OneRepublic в O2 arena",
            "uk": "OneRepublic в O2 arena",
            "cs": "OneRepublic v O2 areně",
            "de": "OneRepublic in der O2 arena",
            "es": "OneRepublic en O2 arena",
        },
        {
            "en": "A large arena pop concert with OneRepublic. Familiar hits and a big crowd make it an easy event for expats to join a crew and not go alone.",
            "ru": "Большой arena pop концерт OneRepublic. Знакомые хиты и большая публика делают событие удобным для экспатов, которые не хотят идти одни.",
            "uk": "Великий arena pop концерт OneRepublic. Знайомі хіти й велика публіка роблять подію зручною для експатів, які не хочуть іти самі.",
            "cs": "Velký arena pop koncert OneRepublic. Známé hity a velké publikum z něj dělají snadnou akci pro expaty, kteří nechtějí jít sami.",
            "de": "Großes Arena-Popkonzert mit OneRepublic. Bekannte Hits und ein großes Publikum machen es leicht, mit einer Crew zu gehen.",
            "es": "Gran concierto pop de arena con OneRepublic. Hits conocidos y mucho público: fácil para expats que no quieren ir solos.",
        },
    ),
    ev(
        "2026-06-29 20:00", 120, "music", "O2 arena, Českomoravská 2345/17, Praha 9",
        "O2 arena", 50.1048, 14.4936, False, None, ["en", "es"],
        "https://www.rickymartinmusic.com/", "rickymartinmusic.com",
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80",
        {
            "en": "Ricky Martin at O2 arena",
            "ru": "Ricky Martin в O2 arena",
            "uk": "Ricky Martin в O2 arena",
            "cs": "Ricky Martin v O2 areně",
            "de": "Ricky Martin in der O2 arena",
            "es": "Ricky Martin en O2 arena",
        },
        {
            "en": "A bright Latin pop arena show with Ricky Martin. A danceable, social concert and an easy reason to gather an international crew.",
            "ru": "Яркое Latin pop arena show с Ricky Martin. Танцевальный, социальный концерт и простой повод собрать международную компанию.",
            "uk": "Яскраве Latin pop arena show з Ricky Martin. Танцювальний, соціальний концерт і простий привід зібрати міжнародну компанію.",
            "cs": "Zářivá latin pop arena show s Rickym Martinem. Taneční, společenský koncert a snadný důvod dát dohromady mezinárodní partu.",
            "de": "Eine helle Latin-Pop-Arena-Show mit Ricky Martin. Tanzbar, sozial und ein einfacher Anlass für eine internationale Crew.",
            "es": "Show de latin pop en arena con Ricky Martin. Bailable, social y perfecto para reunir una crew internacional.",
        },
    ),
    ev(
        "2026-06-30 20:00", 120, "music", "Municipal House, náměstí Republiky 5, Praha 1",
        "Municipal House", 50.0876, 14.4287, False, 1050, ["cs", "en"],
        "https://www.pragueexperience.com/events/events.asp?EventMonth=06&EventYear=2026",
        "pragueexperience.com", "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&q=80",
        {
            "en": "Best of Classics at Municipal House",
            "ru": "Best of Classics в Общественном доме",
            "uk": "Best of Classics у Громадському домі",
            "cs": "Best of Classics v Obecním domě",
            "de": "Best of Classics im Gemeindehaus",
            "es": "Best of Classics en la Casa Municipal",
        },
        {
            "en": "A classical evening in Smetana Hall with well-known pieces by Mozart, Vivaldi, Dvořák and Strauss. A polished cultural plan for a quieter crew night.",
            "ru": "Классический вечер в Smetana Hall с известными произведениями Моцарта, Вивальди, Дворжака и Штрауса. Элегантный культурный план для спокойной компании.",
            "uk": "Класичний вечір у Smetana Hall з відомими творами Моцарта, Вівальді, Дворжака та Штрауса. Елегантний культурний план для спокійної компанії.",
            "cs": "Klasický večer ve Smetanově síni se známými skladbami Mozarta, Vivaldiho, Dvořáka a Strausse. Elegantní kulturní plán pro klidnější partu.",
            "de": "Klassischer Abend im Smetana-Saal mit bekannten Werken von Mozart, Vivaldi, Dvořák und Strauss. Ein eleganter Kulturplan für eine ruhigere Crew.",
            "es": "Noche clásica en la Sala Smetana con obras conocidas de Mozart, Vivaldi, Dvořák y Strauss. Plan cultural elegante para una crew tranquila.",
        },
    ),
]

OMIT_FROM_THIS_ROUND = {
    "Beer & Burger Festival at Karlín Square",
    "Night of Churches — Prague Evening Route",
    "National Museum — Free Admission Day",
    "Mint Market at Náplavka",
    "Beer Festival at Náplavka",
    "Best of Classics at Municipal House",
}

EVENTS = [event for event in EVENTS if event["titles"]["en"] not in OMIT_FROM_THIS_ROUND]


def fetch_existing():
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/events?is_system=eq.true&city=eq.Prague&select=title,source_url,starts_at&limit=3000",
        headers=HEADERS,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read())
    titles = {row.get("title") for row in rows if row.get("title")}
    sources = {row.get("source_url") for row in rows if row.get("source_url")}
    return titles, sources


def main():
    existing_titles, existing_sources = fetch_existing()
    print(f"[i] existing Prague system events: titles={len(existing_titles)}, sources={len(existing_sources)}")
    inserted = skipped = 0

    for event in EVENTS:
        title_en = event["titles"]["en"]
        if title_en in existing_titles or event["source_url"] in existing_sources:
            print(f"[=] skip duplicate: {title_en}")
            skipped += 1
            continue

        row = {
            "title": title_en,
            "description": event["bodies"]["en"],
            "description_json": build_description(
                event["titles"],
                event["bodies"],
                human_date(event["iso_local"]),
                event["venue"],
                event["source_url"],
                event["source_label"],
            ),
            "title_translations": {k: v for k, v in event["titles"].items() if k != "en"},
            "description_translations": {k: v for k, v in event["bodies"].items() if k != "en"},
            "starts_at": local_to_utc(event["iso_local"]),
            "duration_minutes": event["duration_minutes"],
            "city": "Prague",
            "city_id": CITY_ID,
            "country": "CZ",
            "address": event["address"],
            "lat": event["lat"],
            "lng": event["lng"],
            "is_online": False,
            "is_free": event["is_free"],
            "price": event["price"],
            "currency": event["currency"],
            "max_attendees": None,
            "photos": [event["photo"]],
            "organizer_id": SYSTEM_ORGANIZER_ID,
            "category_id": CAT[event["category"]],
            "languages": event["languages"],
            "is_private": False,
            "is_system": True,
            "status": "published",
            "source_url": event["source_url"],
            "safety_tags": [],
            "allow_crews": True,
            "editorial_status": "published",
            "editorial_pitch": "Curated Prague event for people looking for company to go with.",
        }
        data = json.dumps(row, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/events", data=data, headers=HEADERS, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            event_id = result[0]["id"] if isinstance(result, list) and result else "?"
            print(f"[+] {title_en} -> {event_id}")
            inserted += 1
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            print(f"[!] {title_en}: HTTP {exc.code} {detail}")

    print(f"\nDone: inserted={inserted}, skipped={skipped}, total={len(EVENTS)}")


if __name__ == "__main__":
    main()
