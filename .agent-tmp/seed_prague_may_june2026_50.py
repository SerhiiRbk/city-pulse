#!/usr/bin/env python3
"""Seed 50 Prague system events for 23 May - 30 June 2026."""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
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
    "cycling": "2f479b11-7373-45f8-b7bd-155550b56a4b",
    "dancing": "a265eff9-ce91-417f-8780-493d024a9e85",
    "museums": "d9b20fbf-7a7e-466b-acf5-1c379e6b94d6",
    "craft-beer": "16d1baf1-d04e-40e0-b3fb-f791c071e6e3",
    "wine-tasting": "e6428a86-ac38-414a-988c-2ce103ae5b13",
    "food-tours": "c06ab503-5719-4c1c-bd8f-34828aa7ed5c",
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

SRC_MAY = "https://www.pragueexperience.com/events/events.asp?EventMonth=05&EventYear=2026"
SRC_JUN = "https://www.pragueexperience.com/events/events.asp?EventMonth=06&EventYear=2026"

PHOTO = {
    "music": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80",
    "classical": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80",
    "food": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    "beer": "https://images.unsplash.com/photo-1532635224-cf024e66d122?w=1200&q=80",
    "wine": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&q=80",
    "market": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80",
    "museum": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80",
    "sport": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80",
    "dance": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80",
    "city": "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1200&q=80",
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


def build_description(event):
    blocks = []
    when = human_date(event["iso_local"])
    for lang in LANG_ORDER:
        blocks.append(t_h2(f"{LANG_LABEL[lang]} — {event['titles'][lang]}"))
        blocks.append(t_para(t_text(event["bodies"][lang])))
    blocks.append(t_h3(f"📅 {when} · 📍 {event['venue']}"))
    blocks.append(t_para(t_text("Source: "), t_link(event["source_label"], event["source_url"])))
    return {"type": "doc", "content": blocks}


def local_to_utc(iso_local: str):
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    return (dt - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def human_date(iso_local: str):
    return datetime.strptime(iso_local, "%Y-%m-%d %H:%M").strftime("%d %b %Y, %H:%M")


def localized_titles(en: str, ru: str, uk: str, cs: str, de: str, es: str):
    return {"en": en, "ru": ru, "uk": uk, "cs": cs, "de": de, "es": es}


def localized_bodies(name: str, summary_en: str, venue: str):
    return {
        "en": f"{summary_en} A good pick for meeting people around a shared plan instead of scrolling for something to do alone. Venue: {venue}.",
        "ru": f"{name} пройдет в Праге: {summary_en} Хороший повод выбраться из дома и найти компанию вокруг понятного плана. Место: {venue}.",
        "uk": f"{name} відбудеться у Празі: {summary_en} Гарний привід вийти з дому й знайти компанію навколо зрозумілого плану. Місце: {venue}.",
        "cs": f"{name} se koná v Praze. {summary_en} Dobrá příležitost vyrazit ven a potkat lidi u konkrétního programu. Místo: {venue}.",
        "de": f"{name} findet in Prag statt. {summary_en} Eine gute Gelegenheit, rauszugehen und Menschen über einen klaren Plan zu treffen. Ort: {venue}.",
        "es": f"{name} se celebra en Praga. {summary_en} Una buena excusa para salir y encontrar compañía alrededor de un plan concreto. Lugar: {venue}.",
    }


def ev(en, ru, uk, cs, de, es, iso, dur, cat, address, venue, lat, lng, free, price, langs, source, source_label, photo_key, summary):
    titles = localized_titles(en, ru, uk, cs, de, es)
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
        "currency": "CZK",
        "languages": langs,
        "source_url": source,
        "source_label": source_label,
        "photo": PHOTO[photo_key],
        "titles": titles,
        "bodies": localized_bodies(en, summary, venue),
    }


EVENTS = [
    ev("Speedway FIM Grand Prix of Czech Republic", "Speedway FIM Grand Prix Чехии", "Speedway FIM Grand Prix Чехії", "Speedway FIM Grand Prix České republiky", "Speedway FIM Grand Prix Tschechien", "Speedway FIM Grand Prix de la República Checa", "2026-05-23 15:00", 300, "other", "Markéta Stadium, U Vojtěšky 11, Prague 6", "Markéta Stadium", 50.0854, 14.3547, False, None, ["cs", "en"], SRC_MAY, "Prague Experience", "sport", "International speedway racing returns to Markéta Stadium for a loud, fast afternoon of motorsport."),
    ev("Open House Prague 2026 — Saturday", "Open House Prague 2026 — суббота", "Open House Prague 2026 — субота", "Open House Prague 2026 — sobota", "Open House Prague 2026 — Samstag", "Open House Prague 2026 — sábado", "2026-05-23 10:00", 480, "guided-tours", "Various buildings in Prague", "Open House Prague venues", 50.0875, 14.4213, True, None, ["cs", "en"], SRC_MAY, "Prague Experience", "city", "Free access to normally closed buildings, rooftops and interiors across the city."),
    ev("Children's Day at Prague Castle", "Детский день в Пражском Граде", "Дитячий день у Празькому Граді", "Dětský den na Pražském hradě", "Kindertag auf der Prager Burg", "Día infantil en el Castillo de Praga", "2026-05-23 10:00", 420, "other", "Royal Garden and Stag Moat, Prague Castle, Prague 1", "Prague Castle", 50.0911, 14.4016, True, None, ["cs"], SRC_MAY, "Prague Experience", "city", "A family-friendly castle programme with folk crafts, theatre, historical characters and outdoor activities."),
    ev("Rumfest 2026 at Vnitroblock", "Rumfest 2026 во Vnitroblock", "Rumfest 2026 у Vnitroblock", "Rumfest 2026 ve Vnitroblocku", "Rumfest 2026 im Vnitroblock", "Rumfest 2026 en Vnitroblock", "2026-05-23 12:00", 540, "wine-tasting", "Vnitroblock, Tusarova 31, Prague 7", "Vnitroblock", 50.1023, 14.4505, False, None, ["cs", "en"], SRC_MAY, "Prague Experience", "wine", "A rum-focused drinks festival with tastings, cocktails, workshops, food and live Latin music."),
    ev("Swan Lake at Broadway Theatre — 23 May", "Лебединое озеро в Broadway Theatre — 23 мая", "Лебедине озеро в Broadway Theatre — 23 травня", "Labutí jezero v Broadway Theatre — 23. května", "Schwanensee im Broadway Theatre — 23. Mai", "El lago de los cisnes en Broadway Theatre — 23 de mayo", "2026-05-23 19:00", 120, "dancing", "Broadway Theatre, Na Příkopě 31, Prague 1", "Broadway Theatre", 50.0854, 14.4246, False, None, ["cs", "en"], SRC_MAY, "Prague Experience", "dance", "A shortened four-act production of Tchaikovsky's ballet in a central Prague theatre."),
    ev("Beer & Burger Festival at Karlín Square", "Beer & Burger Festival на Карлинской площади", "Beer & Burger Festival на Карлінській площі", "Beer & Burger Festival na Karlínském náměstí", "Beer & Burger Festival am Karlín-Platz", "Beer & Burger Festival en la plaza Karlín", "2026-05-24 10:30", 600, "food-tours", "Karlínské náměstí, Prague 8", "Karlínské náměstí", 50.0925, 14.4505, False, 150, ["cs", "en"], SRC_MAY, "Prague Experience", "food", "Craft breweries and Karlín restaurants join forces for burgers, beer and live music."),
    ev("Prague Fringe 2026 — Opening Monday", "Prague Fringe 2026 — первый понедельник", "Prague Fringe 2026 — перший понеділок", "Prague Fringe 2026 — první pondělí", "Prague Fringe 2026 — erster Montag", "Prague Fringe 2026 — primer lunes", "2026-05-25 19:00", 180, "standup", "Various venues in Lesser Town, Prague 1", "Lesser Town venues", 50.0886, 14.4030, False, None, ["en"], SRC_MAY, "Prague Experience", "city", "English-language theatre, comedy, music and dance in small venues around Malá Strana."),
    ev("Lesser Town Market — Tuesday", "Малостранский рынок — вторник", "Малостранський ринок — вівторок", "Malostranský trh — úterý", "Kleinseitner Markt — Dienstag", "Mercado de Malá Strana — martes", "2026-05-26 08:00", 660, "food-tours", "Malostranské náměstí, Prague 1", "Lesser Town Square", 50.0886, 14.4030, True, None, ["cs", "en"], SRC_MAY, "Prague Experience", "market", "A daytime food market with produce, pastries, cheeses, drinks and hot food on Lesser Town Square."),
    ev("Swan Lake at Broadway Theatre — 26 May", "Лебединое озеро в Broadway Theatre — 26 мая", "Лебедине озеро в Broadway Theatre — 26 травня", "Labutí jezero v Broadway Theatre — 26. května", "Schwanensee im Broadway Theatre — 26. Mai", "El lago de los cisnes en Broadway Theatre — 26 de mayo", "2026-05-26 19:00", 120, "dancing", "Broadway Theatre, Na Příkopě 31, Prague 1", "Broadway Theatre", 50.0854, 14.4246, False, None, ["cs", "en"], SRC_MAY, "Prague Experience", "dance", "A central evening ballet option with Tchaikovsky's famous score and a compact staging."),
    ev("Verdi Season at Prague State Opera — 27 May", "Сезон Верди в Пражской государственной опере — 27 мая", "Сезон Верді в Празькій державній опері — 27 травня", "Verdiho sezóna ve Státní opeře — 27. května", "Verdi-Saison in der Staatsoper Prag — 27. Mai", "Temporada Verdi en la Ópera Estatal de Praga — 27 de mayo", "2026-05-27 19:00", 180, "music", "Prague State Opera, Wilsonova 4, Prague 1", "Prague State Opera", 50.0808, 14.4326, False, 990, ["cs", "en"], SRC_MAY, "Prague Experience", "classical", "A night from the State Opera's Verdi programme, celebrating one of opera's essential composers."),
    ev("Best of Classics at Municipal House — 28 May", "Best of Classics в Municipal House — 28 мая", "Best of Classics у Municipal House — 28 травня", "Best of Classics v Obecním domě — 28. května", "Best of Classics im Gemeindehaus — 28. Mai", "Best of Classics en Municipal House — 28 de mayo", "2026-05-28 20:00", 100, "music", "Municipal House, Republic Square 5, Prague 1", "Municipal House", 50.0875, 14.4281, False, 1050, ["en", "cs"], SRC_MAY, "Prague Experience", "classical", "A polished programme of Mozart, Handel, Vivaldi, Brahms, Pachelbel, Dvořák and Strauss."),
    ev("Beth Hart at Prague Congress Centre", "Beth Hart в Prague Congress Centre", "Beth Hart у Prague Congress Centre", "Beth Hart v Kongresovém centru Praha", "Beth Hart im Prager Kongresszentrum", "Beth Hart en el Centro de Congresos de Praga", "2026-05-28 20:00", 120, "music", "Prague Congress Centre, 5. května 65, Prague 4", "Prague Congress Centre", 50.0623, 14.4289, False, 1890, ["en"], SRC_MAY, "Prague Experience", "music", "American singer Beth Hart brings a blues-rock concert to the Prague Congress Centre."),
    ev("Night of Churches in Prague", "Ночь церквей в Праге", "Ніч церков у Празі", "Noc kostelů v Praze", "Nacht der Kirchen in Prag", "Noche de las iglesias en Praga", "2026-05-29 18:00", 360, "museums", "Participating churches across Prague", "Prague churches", 50.0875, 14.4213, True, None, ["cs", "en"], SRC_MAY, "Prague Experience", "city", "Many Prague churches open for a special evening programme and night-time visits."),
    ev("Depeche Note Symphonic Tribute", "Depeche Note Symphonic Tribute", "Depeche Note Symphonic Tribute", "Depeche Note Symphonic Tribute", "Depeche Note Symphonic Tribute", "Depeche Note Symphonic Tribute", "2026-05-29 19:00", 120, "music", "Prague Congress Centre, 5. května 65, Prague 4", "Prague Congress Centre", 50.0623, 14.4289, False, 1190, ["cs", "en"], SRC_MAY, "Prague Experience", "classical", "A symphonic tribute that reimagines Depeche Mode songs with an orchestra."),
    ev("André Rieu at O2 Arena — 29 May", "André Rieu в O2 Arena — 29 мая", "André Rieu в O2 Arena — 29 травня", "André Rieu v O2 areně — 29. května", "André Rieu in der O2 Arena — 29. Mai", "André Rieu en O2 Arena — 29 de mayo", "2026-05-29 19:30", 150, "music", "O2 Arena, Českomoravská 17a, Prague 9", "O2 Arena", 50.1048, 14.4935, False, 1590, ["en", "cs"], SRC_MAY, "Prague Experience", "classical", "The Dutch violinist and his orchestra return to Prague for a large-scale arena concert."),
    ev("Swan Lake at Broadway Theatre — 29 May", "Лебединое озеро в Broadway Theatre — 29 мая", "Лебедине озеро в Broadway Theatre — 29 травня", "Labutí jezero v Broadway Theatre — 29. května", "Schwanensee im Broadway Theatre — 29. Mai", "El lago de los cisnes en Broadway Theatre — 29 de mayo", "2026-05-29 19:00", 120, "dancing", "Broadway Theatre, Na Příkopě 31, Prague 1", "Broadway Theatre", 50.0854, 14.4246, False, None, ["cs", "en"], SRC_MAY, "Prague Experience", "dance", "A compact evening version of the classic ballet in the centre of Prague."),
    ev("Strauss, Mozart & Dvořák at Municipal House — 30 May", "Strauss, Mozart & Dvořák в Municipal House — 30 мая", "Strauss, Mozart & Dvořák у Municipal House — 30 травня", "Strauss, Mozart & Dvořák v Obecním domě — 30. května", "Strauss, Mozart & Dvořák im Gemeindehaus — 30. Mai", "Strauss, Mozart & Dvořák en Municipal House — 30 de mayo", "2026-05-30 20:00", 100, "music", "Municipal House, Republic Square 5, Prague 1", "Municipal House", 50.0875, 14.4281, False, 1050, ["en", "cs"], SRC_MAY, "Prague Experience", "classical", "A concert programme of Strauss, Mozart and Dvořák in Smetana Hall."),
    ev("André Rieu at O2 Arena — 30 May", "André Rieu в O2 Arena — 30 мая", "André Rieu в O2 Arena — 30 травня", "André Rieu v O2 areně — 30. května", "André Rieu in der O2 Arena — 30. Mai", "André Rieu en O2 Arena — 30 de mayo", "2026-05-30 19:30", 150, "music", "O2 Arena, Českomoravská 17a, Prague 9", "O2 Arena", 50.1048, 14.4935, False, 1590, ["en", "cs"], SRC_MAY, "Prague Experience", "classical", "A second Prague date for André Rieu's arena concert with orchestra."),
    ev("Puccini Season at Prague State Opera — 30 May", "Сезон Пуччини в Праге — 30 мая", "Сезон Пуччіні в Празі — 30 травня", "Pucciniho sezóna v Praze — 30. května", "Puccini-Saison in Prag — 30. Mai", "Temporada Puccini en Praga — 30 de mayo", "2026-05-30 19:00", 180, "music", "Prague State Opera, Wilsonova 4, Prague 1", "Prague State Opera", 50.0808, 14.4326, False, 890, ["cs", "en"], SRC_MAY, "Prague Experience", "classical", "A Prague opera evening honouring Puccini with productions from the State Opera and National Theatre programme."),
    ev("Bubble Wine Festival at St. Wenceslas Vineyard", "Bubble Wine Festival на винограднике Святого Вацлава", "Bubble Wine Festival на винограднику Святого Вацлава", "Bubble Wine Festival na Svatováclavské vinici", "Bubble Wine Festival im St.-Wenzels-Weinberg", "Bubble Wine Festival en el viñedo de San Venceslao", "2026-05-30 12:00", 480, "wine-tasting", "St. Wenceslas Vineyard, Staré zámecké schody 6, Prague 1", "St. Wenceslas Vineyard", 50.0915, 14.4038, False, 250, ["cs", "en"], SRC_MAY, "Prague Experience", "wine", "Sparkling wine tastings, music and food on the vineyard slopes below Prague Castle."),
    ev("Prague Vineyards 2026 at Strahov Monastery", "Prague Vineyards 2026 в Страговском монастыре", "Prague Vineyards 2026 у Страговському монастирі", "Pražské vinice 2026 ve Strahovském klášteře", "Prague Vineyards 2026 im Kloster Strahov", "Prague Vineyards 2026 en el monasterio de Strahov", "2026-05-30 10:00", 480, "wine-tasting", "Strahov Monastery Vineyard, Strahovské nádvoří 1, Prague 1", "Strahov Monastery", 50.0861, 14.3890, True, None, ["cs", "en"], SRC_MAY, "Prague Experience", "wine", "An open weekend at Strahov's small vineyard with walks, guided visits and local wine tasting."),
    ev("Prague Vineyards 2026 at St. Wenceslas Vineyard", "Prague Vineyards 2026 на винограднике Святого Вацлава", "Prague Vineyards 2026 на винограднику Святого Вацлава", "Pražské vinice 2026 na Svatováclavské vinici", "Prague Vineyards 2026 im St.-Wenzels-Weinberg", "Prague Vineyards 2026 en el viñedo de San Venceslao", "2026-05-31 10:00", 480, "wine-tasting", "St. Wenceslas Vineyard, Staré zámecké schody 6, Prague 1", "St. Wenceslas Vineyard", 50.0915, 14.4038, True, None, ["cs", "en"], SRC_MAY, "Prague Experience", "wine", "A free open day at Prague Castle's oldest vineyard with views over the city."),
    ev("National Museum — Free Admission Day", "Национальный музей — день бесплатного входа", "Національний музей — день безкоштовного входу", "Národní muzeum — den volného vstupu", "Nationalmuseum — Tag mit freiem Eintritt", "Museo Nacional — día de entrada gratuita", "2026-06-01 09:00", 540, "museums", "National Museum, Wenceslas Square 68, Prague 1", "National Museum", 50.0796, 14.4309, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "museum", "A free-entry day for the Historical Building, New Building and Underground Corridor."),
    ev("Tanec Praha 2026 — Opening Day", "Tanec Praha 2026 — первый день", "Tanec Praha 2026 — перший день", "Tanec Praha 2026 — první den", "Tanec Praha 2026 — Eröffnungstag", "Tanec Praha 2026 — día inaugural", "2026-06-01 19:00", 180, "dancing", "Various venues in Prague", "Tanec Praha venues", 50.0875, 14.4213, False, None, ["cs", "en"], SRC_JUN, "Prague Experience", "dance", "The contemporary dance and movement festival opens its June run across Prague venues."),
    ev("Best of Classics at Municipal House — 2 June", "Best of Classics в Municipal House — 2 июня", "Best of Classics у Municipal House — 2 червня", "Best of Classics v Obecním domě — 2. června", "Best of Classics im Gemeindehaus — 2. Juni", "Best of Classics en Municipal House — 2 de junio", "2026-06-02 20:00", 100, "music", "Municipal House, Republic Square 5, Prague 1", "Municipal House", 50.0875, 14.4281, False, 1050, ["en", "cs"], SRC_JUN, "Prague Experience", "classical", "A Municipal House concert with classical favourites, soprano and ballet dancers."),
    ev("Le Nozze di Figaro at Estates Theatre — 2 June", "Le Nozze di Figaro в Estates Theatre — 2 июня", "Le Nozze di Figaro в Estates Theatre — 2 червня", "Figarova svatba ve Stavovském divadle — 2. června", "Le Nozze di Figaro im Ständetheater — 2. Juni", "Le Nozze di Figaro en Estates Theatre — 2 de junio", "2026-06-02 19:00", 180, "music", "Estates Theatre, Ovocný trh 1, Prague 1", "Estates Theatre", 50.0865, 14.4237, False, 1190, ["cs", "en"], SRC_JUN, "Prague Experience", "classical", "Mozart's comic opera in the historic Prague theatre closely linked with the composer."),
    ev("Swan Lake at Broadway Theatre — 5 June", "Лебединое озеро в Broadway Theatre — 5 июня", "Лебедине озеро в Broadway Theatre — 5 червня", "Labutí jezero v Broadway Theatre — 5. června", "Schwanensee im Broadway Theatre — 5. Juni", "El lago de los cisnes en Broadway Theatre — 5 de junio", "2026-06-05 19:00", 120, "dancing", "Broadway Theatre, Na Příkopě 31, Prague 1", "Broadway Theatre", 50.0854, 14.4246, False, None, ["cs", "en"], SRC_JUN, "Prague Experience", "dance", "A June performance of the classic ballet in a central Prague theatre."),
    ev("The Four Seasons at Municipal House — 3 June", "Времена года в Municipal House — 3 июня", "Пори року в Municipal House — 3 червня", "Čtvero ročních dob v Obecním domě — 3. června", "Die Vier Jahreszeiten im Gemeindehaus — 3. Juni", "Las cuatro estaciones en Municipal House — 3 de junio", "2026-06-03 20:00", 100, "music", "Municipal House, Republic Square 5, Prague 1", "Municipal House", 50.0875, 14.4281, False, 1050, ["en", "cs"], SRC_JUN, "Prague Experience", "classical", "Vivaldi's famous cycle performed alongside other classical works in Smetana Hall."),
    ev("Climbing World Cup 2026 — Opening Day", "Climbing World Cup 2026 — первый день", "Climbing World Cup 2026 — перший день", "Climbing World Cup 2026 — první den", "Climbing World Cup 2026 — erster Tag", "Climbing World Cup 2026 — primer día", "2026-06-04 10:00", 480, "other", "Letná Park, Prague 7", "Letná Park", 50.0968, 14.4214, False, 690, ["cs", "en"], SRC_JUN, "Prague Experience", "sport", "World-class climbing competition with bouldering and festival energy near the city centre."),
    ev("Prague: Heart of Nations Folklore Festival", "Prague: Heart of Nations — фольклорный фестиваль", "Prague: Heart of Nations — фольклорний фестиваль", "Praha srdce národů — folklorní festival", "Prague: Heart of Nations — Folklorefestival", "Prague: Heart of Nations — festival folclórico", "2026-06-04 17:00", 180, "dancing", "Old Town Square, Prague 1", "Old Town Square", 50.0875, 14.4213, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "dance", "International folklore groups perform music and dance on an open-air stage in Old Town Square."),
    ev("Verdi Season at Prague State Opera — 5 June", "Сезон Верди в Пражской государственной опере — 5 июня", "Сезон Верді в Празькій державній опері — 5 червня", "Verdiho sezóna ve Státní opeře — 5. června", "Verdi-Saison in der Staatsoper Prag — 5. Juni", "Temporada Verdi en la Ópera Estatal de Praga — 5 de junio", "2026-06-05 19:00", 180, "music", "Prague State Opera, Wilsonova 4, Prague 1", "Prague State Opera", 50.0808, 14.4326, False, 990, ["cs", "en"], SRC_JUN, "Prague Experience", "classical", "A June performance from the Prague State Opera's Verdi season."),
    ev("Canoe Slalom World Cup in Troja", "Кубок мира по гребному слалому в Трое", "Кубок світу з веслувального слалому в Трої", "Světový pohár ve vodním slalomu v Troji", "Kanu-Slalom-Weltcup in Troja", "Copa del Mundo de eslalon en canoa en Troja", "2026-06-05 10:00", 420, "other", "Troja Water Sports Area, Vodácká 8, Prague 7", "Troja Water Sports Area", 50.1148, 14.4216, False, None, ["cs", "en"], SRC_JUN, "Prague Experience", "sport", "The World Cup Canoe Slalom Series comes to Prague's Troja water sports area."),
    ev("Slavnost Cideru 2026 — Friday", "Slavnost Cideru 2026 — пятница", "Slavnost Cideru 2026 — п'ятниця", "Slavnost cideru 2026 — pátek", "Slavnost Cideru 2026 — Freitag", "Slavnost Cideru 2026 — viernes", "2026-06-05 12:00", 600, "food-tours", "Plynární 1096, Holešovice, Prague 7", "Plynární 1096", 50.1081, 14.4425, False, 150, ["cs", "en"], SRC_JUN, "Prague Experience", "food", "An annual cider festival with tastings, food, live music and workshops in Holešovice."),
    ev("MDA Ride on Wenceslas Square", "MDA Ride на Вацлавской площади", "MDA Ride на Вацлавській площі", "MDA Ride na Václavském náměstí", "MDA Ride am Wenzelsplatz", "MDA Ride en la plaza de Wenceslao", "2026-06-06 10:00", 420, "other", "Wenceslas Square, Prague 1", "Wenceslas Square", 50.0810, 14.4253, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "sport", "Motorcycles, classic cars, live bands and food stalls take over Wenceslas Square."),
    ev("Gala Concert + Opera & Ballet at Municipal House", "Гала-концерт с оперой и балетом в Municipal House", "Гала-концерт з оперою і балетом у Municipal House", "Gala koncert s operou a baletem v Obecním domě", "Galakonzert mit Oper und Ballett im Gemeindehaus", "Concierto de gala con ópera y ballet en Municipal House", "2026-06-08 20:00", 100, "music", "Municipal House, Republic Square 5, Prague 1", "Municipal House", 50.0875, 14.4281, False, 1050, ["en", "cs"], SRC_JUN, "Prague Experience", "classical", "A staged evening of Mozart, Dvořák, Strauss and other famous composers in Smetana Hall."),
    ev("Italian Wine Festival at Villa Richter", "Итальянский винный фестиваль в Villa Richter", "Італійський винний фестиваль у Villa Richter", "Italský vinný festival ve Ville Richter", "Italienisches Weinfestival in der Villa Richter", "Festival de vino italiano en Villa Richter", "2026-06-08 13:00", 420, "wine-tasting", "Villa Richter, Staré zámecké schody 6, Prague 1", "Villa Richter", 50.0915, 14.4038, False, 1300, ["cs", "en"], SRC_JUN, "Prague Experience", "wine", "A large tasting of Italian wines on St. Wenceslas Vineyard below Prague Castle."),
    ev("Puccini Season at Prague State Opera — 10 June", "Сезон Пуччини в Праге — 10 июня", "Сезон Пуччіні в Празі — 10 червня", "Pucciniho sezóna v Praze — 10. června", "Puccini-Saison in Prag — 10. Juni", "Temporada Puccini en Praga — 10 de junio", "2026-06-10 19:00", 180, "music", "Prague State Opera, Wilsonova 4, Prague 1", "Prague State Opera", 50.0808, 14.4326, False, 890, ["cs", "en"], SRC_JUN, "Prague Experience", "classical", "A June opera evening from Prague's Puccini-focused programme."),
    ev("Festival of Microbreweries at Prague Castle — Friday", "Фестиваль мини-пивоварен в Пражском Граде — пятница", "Фестиваль міні-пивоварень у Празькому Граді — п'ятниця", "Festival minipivovarů na Pražském hradě — pátek", "Festival der Mikrobrauereien auf der Prager Burg — Freitag", "Festival de microcervecerías en el Castillo de Praga — viernes", "2026-06-12 14:00", 360, "craft-beer", "Royal Garden, Prague Castle, Prague 1", "Royal Garden at Prague Castle", 50.0937, 14.4005, False, 475, ["cs", "en"], SRC_JUN, "Prague Experience", "beer", "Czech, Moravian and Slovak microbreweries present their beer in the Royal Garden."),
    ev("Strauss, Mozart & Dvořák at Municipal House — 13 June", "Strauss, Mozart & Dvořák в Municipal House — 13 июня", "Strauss, Mozart & Dvořák у Municipal House — 13 червня", "Strauss, Mozart & Dvořák v Obecním domě — 13. června", "Strauss, Mozart & Dvořák im Gemeindehaus — 13. Juni", "Strauss, Mozart & Dvořák en Municipal House — 13 de junio", "2026-06-13 20:00", 100, "music", "Municipal House, Republic Square 5, Prague 1", "Municipal House", 50.0875, 14.4281, False, 1050, ["en", "cs"], SRC_JUN, "Prague Experience", "classical", "A Saturday concert of Strauss, Mozart and Dvořák with soprano and ballet dancers."),
    ev("Prague Museum Night 2026", "Пражская музейная ночь 2026", "Празька музейна ніч 2026", "Pražská muzejní noc 2026", "Prager Museumsnacht 2026", "Noche de los museos de Praga 2026", "2026-06-13 19:00", 300, "museums", "Participating museums across Prague", "Prague museums", 50.0875, 14.4213, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "museum", "Museums across Prague open free of charge for a special night programme."),
    ev("Open Gardens Weekend — Saturday", "Open Gardens Weekend — суббота", "Open Gardens Weekend — субота", "Víkend otevřených zahrad — sobota", "Wochenende der offenen Gärten — Samstag", "Fin de semana de jardines abiertos — sábado", "2026-06-13 10:00", 480, "guided-tours", "Various gardens in Prague", "Open Gardens venues", 50.0911, 14.4016, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "city", "Private and historic gardens around Prague open their doors for the weekend."),
    ev("Dyzajn Summer Market — Saturday", "Dyzajn Summer Market — суббота", "Dyzajn Summer Market — субота", "Dyzajn Summer Market — sobota", "Dyzajn Summer Market — Samstag", "Dyzajn Summer Market — sábado", "2026-06-13 10:00", 480, "food-tours", "Výstaviště Praha, Výstaviště, Holešovice, Prague 7", "Prague Exhibition Grounds", 50.1066, 14.4296, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "market", "A large open-air design market with makers, jewellery, ceramics, fashion, workshops and live music."),
    ev("Mint Market at Náplavka", "Mint Market на Наплавке", "Mint Market на Наплавці", "Mint Market na Náplavce", "Mint Market an der Náplavka", "Mint Market en Náplavka", "2026-06-14 10:00", 420, "food-tours", "Náplavka, Rašínovo nábřeží, Prague 2", "Náplavka", 50.0714, 14.4144, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "market", "A riverside creative market with designers, handmade goods, cosmetics, porcelain, toys and food."),
    ev("Best of Classics at Municipal House — 15 June", "Best of Classics в Municipal House — 15 июня", "Best of Classics у Municipal House — 15 червня", "Best of Classics v Obecním domě — 15. června", "Best of Classics im Gemeindehaus — 15. Juni", "Best of Classics en Municipal House — 15 de junio", "2026-06-15 20:00", 100, "music", "Municipal House, Republic Square 5, Prague 1", "Municipal House", 50.0875, 14.4281, False, 1050, ["en", "cs"], SRC_JUN, "Prague Experience", "classical", "A classical programme of Mozart, Handel, Vivaldi, Brahms, Pachelbel, Bach, Dvořák and Strauss."),
    ev("Prague Philharmonia at Rudolfinum", "Prague Philharmonia в Рудольфинуме", "Prague Philharmonia у Рудольфінумі", "Prague Philharmonia v Rudolfinu", "Prague Philharmonia im Rudolfinum", "Prague Philharmonia en Rudolfinum", "2026-06-16 19:30", 120, "music", "Rudolfinum, Alšovo nábřeží 12, Prague 1", "Rudolfinum", 50.0909, 14.4155, False, 500, ["cs", "en"], SRC_JUN, "Prague Experience", "classical", "A concert by one of Czechia's leading orchestras in Dvořák Hall."),
    ev("Prague Relay — Team Run in Stromovka", "Prague Relay — командный забег в Стромовке", "Prague Relay — командний забіг у Стромовці", "Prague Relay — týmový běh ve Stromovce", "Prague Relay — Teamlauf in Stromovka", "Prague Relay — carrera por equipos en Stromovka", "2026-06-16 18:00", 240, "running", "Stromovka Park, Prague 7", "Stromovka Park", 50.1077, 14.4175, False, None, ["cs", "en"], SRC_JUN, "Prague Experience", "sport", "Four-person teams run 4 x 5 km races in Stromovka Park, with spectators along the route."),
    ev("Beer Festival at Náplavka — Friday", "Пивной фестиваль на Наплавке — пятница", "Пивний фестиваль на Наплавці — п'ятниця", "Pivo na Náplavce — pátek", "Bierfestival an der Náplavka — Freitag", "Festival de cerveza en Náplavka — viernes", "2026-06-19 14:00", 420, "craft-beer", "Náplavka, Rašínovo nábřeží, Prague 2", "Náplavka", 50.0714, 14.4144, True, None, ["cs", "en"], SRC_JUN, "Prague Experience", "beer", "More than 50 Czech microbreweries pour beer by the river with festival food and live bands."),
    ev("Metronome Prague 2026 — Friday", "Metronome Prague 2026 — пятница", "Metronome Prague 2026 — п'ятниця", "Metronome Prague 2026 — pátek", "Metronome Prague 2026 — Freitag", "Metronome Prague 2026 — viernes", "2026-06-19 15:00", 600, "music", "Letiště Praha Letňany, Prague 9", "Letňany Airport", 50.1292, 14.5160, False, 2490, ["en", "cs"], SRC_JUN, "Prague Experience", "music", "The international music and arts festival opens its 2026 Prague run in Letňany."),
    ev("L'Etape Czechia by Tour de France", "L'Etape Czechia by Tour de France", "L'Etape Czechia by Tour de France", "L'Etape Czechia by Tour de France", "L'Etape Czechia by Tour de France", "L'Etape Czechia by Tour de France", "2026-06-20 08:00", 540, "cycling", "Various places in Prague", "Prague cycling route", 50.0875, 14.4213, False, None, ["cs", "en"], SRC_JUN, "Prague Experience", "sport", "A public cycling event inspired by the Tour de France with routes starting and finishing in Prague."),
    ev("Polish Day in the Garden of the Polish Embassy", "Польский день в саду посольства Польши", "Польський день у саду посольства Польщі", "Polský den v zahradě Polského institutu", "Polnischer Tag im Garten der Polnischen Botschaft", "Día polaco en el jardín de la Embajada de Polonia", "2026-06-20 13:00", 420, "food-tours", "Valdštejnská 153/8, Prague 1", "Garden of the Polish Embassy", 50.0893, 14.4066, True, None, ["cs", "pl", "en"], SRC_JUN, "Prague Experience", "food", "Polish food, drinks, regional culture and a family programme in a garden below Prague Castle."),
]


def fetch_existing():
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/events?is_system=eq.true&city=eq.Prague&select=title,starts_at&limit=3000",
        headers=HEADERS,
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read())
    return {(row.get("title"), (row.get("starts_at") or "")[:10]) for row in rows}


def main():
    existing_keys = fetch_existing()
    print(f"[i] existing Prague system event date keys: {len(existing_keys)}")
    if len(EVENTS) != 50:
        raise RuntimeError(f"Expected exactly 50 events, got {len(EVENTS)}")
    inserted = skipped = 0
    inserted_ids = []

    for event in EVENTS:
        title_en = event["titles"]["en"]
        starts_at = local_to_utc(event["iso_local"])
        key = (title_en, starts_at[:10])
        if key in existing_keys:
            print(f"[=] skip duplicate: {starts_at[:10]} {title_en}")
            skipped += 1
            continue

        row = {
            "title": title_en,
            "description": event["bodies"]["en"],
            "description_json": build_description(event),
            "title_translations": {k: v for k, v in event["titles"].items() if k != "en"},
            "description_translations": {k: v for k, v in event["bodies"].items() if k != "en"},
            "starts_at": starts_at,
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
            inserted_ids.append(event_id)
            existing_keys.add(key)
            print(f"[+] {starts_at[:10]} {title_en} -> {event_id}")
            inserted += 1
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            print(f"[!] {title_en}: HTTP {exc.code} {detail}")

    out = PROJECT_ROOT / ".agent-tmp" / "seed_prague_may_june2026_50_inserted.json"
    out.write_text(json.dumps(inserted_ids, indent=2), encoding="utf-8")
    print(f"[done] inserted={inserted} skipped={skipped} ids_file={out}")


if __name__ == "__main__":
    main()
