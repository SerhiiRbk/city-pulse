#!/usr/bin/env python3
"""
Seed 30 system events in Prague for June 2026.

Format mirrors the May batch already in production:
  - is_system=true, editorial_status='published', status='published'
  - description_json is a TipTap doc with one h2/paragraph per language,
    a closing h3 with date+venue, and a final source-link paragraph.
  - city_id resolves to the Prague city row already used by prior seed.
  - organizer_id reuses the existing system organizer profile.

Times are stored in UTC. Czechia in June is on CEST (UTC+2), so a local
19:00 maps to 17:00Z.

Run after exporting NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY,
e.g.:

  set -a && . .env.local && set +a
  python3 .agent-tmp/seed_prague_june2026.py

Re-running is idempotent: events are de-duplicated against existing rows
by exact title match (skipped if already present).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from typing import Any

# ---- Constants resolved from prior batch ----------------------------
PRAGUE_CITY_ID = "46837694-6917-48cc-843b-338c297394ec"
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

LANG_ORDER = ["en", "cs", "de", "ru", "uk"]
LANG_LABEL = {
    "en": "English",
    "cs": "Čeština",
    "de": "Deutsch",
    "ru": "Русский",
    "uk": "Українська",
}

# ---- TipTap JSON helpers --------------------------------------------

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


# ---- Event catalog --------------------------------------------------
#
# Each entry is a Python dict the script translates into one row in
# `public.events`. Times are local (CEST = UTC+2 in June 2026) — they
# are converted to UTC just before sending. `iso_local` is "YYYY-MM-DD HH:MM"
# in Prague time. `duration_minutes` controls ends_at via DB trigger.
#
EVENTS: list[dict[str, Any]] = [
    # ---------- Week 1 -----------------------------------------------
    {
        "iso_local": "2026-06-01 10:00",
        "duration_minutes": 480,
        "category": "parenting",
        "address": "Zoo Praha, U Trojského zámku 120/3, Prague 7",
        "venue_short": "Zoo Praha, Troja",
        "is_free": False,
        "price": 250,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.kudyznudy.cz/akce/den-deti-v-zoo-praha",
        "source_label": "kudyznudy.cz",
        "partner_name": "Zoo Praha",
        "partner_url": "https://www.zoopraha.cz",
        "titles": {
            "en": "Children's Day at Prague Zoo",
            "cs": "Den dětí v Zoo Praha",
            "de": "Kindertag im Prager Zoo",
            "ru": "День детей в Пражском зоопарке",
            "uk": "День дітей у Празькому зоопарку",
        },
        "bodies": {
            "en": "A full day of family programming at Prague Zoo to mark Children's Day: keeper talks, animal feedings, themed quests around the pavilions and live music near the lower entrance.",
            "cs": "Celodenní program pro rodiny ke Dni dětí v Zoo Praha — komentovaná krmení, ošetřovatelské povídání, soutěže napříč pavilony a doprovodná hudba u dolního vstupu.",
            "de": "Ein ganzer Familientag im Prager Zoo zum Kindertag — Tierfütterungen mit Kommentar, Pfleger-Talks, Stationen-Rallye durch die Pavillons und Live-Musik am unteren Eingang.",
            "ru": "Семейный день в Пражском зоопарке к Дню защиты детей: показательные кормления, рассказы смотрителей, квесты по павильонам и живая музыка у нижнего входа.",
            "uk": "Сімейний день у Празькому зоопарку до Дня захисту дітей: показові годівлі, розповіді доглядачів, квести павільйонами та жива музика біля нижнього входу.",
        },
    },
    {
        "iso_local": "2026-06-02 19:00",
        "duration_minutes": 75,
        "category": "music",
        "address": "Obecní dům, Smetanova síň, náměstí Republiky 5, Prague 1",
        "venue_short": "Smetana Hall, Municipal House",
        "is_free": False,
        "price": 1050,
        "currency": "CZK",
        "languages": ["en", "cs", "de"],
        "source_url": "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventYear=2026&EventMonth=06",
        "source_label": "pragueexperience.com",
        "partner_name": "Obecní dům (Municipal House)",
        "partner_url": "https://www.obecnidum.cz",
        "titles": {
            "en": "Vivaldi & Friends — Baroque Night at Smetana Hall",
            "cs": "Vivaldi & přátelé — barokní večer ve Smetanově síni",
            "de": "Vivaldi & Friends — Barocknacht im Smetana-Saal",
            "ru": "Вивальди и друзья — барочный вечер в зале Сметаны",
            "uk": "Вівальді та друзі — бароковий вечір у залі Сметани",
        },
        "bodies": {
            "en": "Antonio Vivaldi's Four Seasons performed by Prague Royal Orchestra in the Art-Nouveau Smetana Hall of the Municipal House. Bach and Albinoni round out the programme.",
            "cs": "Vivaldiho Čtvero ročních dob v podání Prague Royal Orchestra v secesní Smetanově síni Obecního domu. Program doplňuje Bach a Albinoni.",
            "de": "Vivaldis Vier Jahreszeiten — gespielt vom Prague Royal Orchestra im Jugendstil-Smetana-Saal des Repräsentationshauses. Ergänzt durch Bach und Albinoni.",
            "ru": "«Времена года» Вивальди в исполнении Prague Royal Orchestra в модерновом зале Сметаны Общественного дома. В программе также Бах и Альбинони.",
            "uk": "«Пори року» Вівальді у виконанні Prague Royal Orchestra в модерновій залі Сметани Громадського дому. Доповнюють програму Бах та Альбіноні.",
        },
    },
    {
        "iso_local": "2026-06-03 20:00",
        "duration_minutes": 105,
        "category": "music",
        "address": "Rudolfinum, Dvořákova síň, Alšovo nábřeží 12, Prague 1",
        "venue_short": "Dvořák Hall, Rudolfinum",
        "is_free": False,
        "price": 1490,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://festival.cz/en/program",
        "source_label": "festival.cz",
        "partner_name": "Pražské jaro / Prague Spring International Music Festival",
        "partner_url": "https://festival.cz",
        "titles": {
            "en": "Prague Spring Closing Concert — Beethoven's Ninth",
            "cs": "Závěrečný koncert Pražského jara — Beethovenova Devátá",
            "de": "Abschlusskonzert Prager Frühling — Beethovens Neunte",
            "ru": "Закрытие «Пражской весны» — Девятая Бетховена",
            "uk": "Закриття «Празької весни» — Дев'ята Бетховена",
        },
        "bodies": {
            "en": "The closing night of the 81st Prague Spring International Music Festival: the Czech Philharmonic and the Prague Philharmonic Choir perform Beethoven's Symphony No. 9 \"Ode to Joy\" in the Dvořák Hall of the Rudolfinum.",
            "cs": "Závěrečný večer 81. ročníku festivalu Pražské jaro: Česká filharmonie a Pražský filharmonický sbor uvádějí Beethovenovu 9. symfonii „Óda na radost\" v Dvořákově síni Rudolfina.",
            "de": "Abschlussabend des 81. Festivals Prager Frühling: Tschechische Philharmonie und Prager Philharmonischer Chor spielen Beethovens 9. Sinfonie «Ode an die Freude» im Dvořák-Saal des Rudolfinums.",
            "ru": "Закрытие 81-го Международного музыкального фестиваля «Пражская весна»: Чешская филармония и Пражский филармонический хор исполняют 9-ю симфонию Бетховена «Ода к радости» в зале Дворжака Рудольфинума.",
            "uk": "Закриття 81-го Міжнародного музичного фестивалю «Празька весна»: Чеська філармонія та Празький філармонійний хор виконують 9-ту симфонію Бетховена «Ода до радості» в залі Дворжака Рудольфінума.",
        },
    },
    {
        "iso_local": "2026-06-04 19:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Drinkup.cz HQ — Cross Club, Plynární 23, Prague 7",
        "venue_short": "Cross Club, Holešovice",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/prague-international-meetup",
        "source_label": "meetup.com",
        "partner_name": "Prague International Meetup",
        "partner_url": "https://www.meetup.com/prague-international-meetup",
        "titles": {
            "en": "Prague International Drink-up — Expat Networking",
            "cs": "Prague International Drink-up — networking pro expaty",
            "de": "Prague International Drink-up — Expat-Networking",
            "ru": "Prague International Drink-up — нетворкинг для экспатов",
            "uk": "Prague International Drink-up — нетворкінг для експатів",
        },
        "bodies": {
            "en": "Casual after-work mingle for the international community in Prague at the Cross Club Holešovice. Bring a friend, name-tags provided. Free entry, drinks pay-as-you-go.",
            "cs": "Neformální after-work setkání mezinárodní komunity v Praze v Cross Clubu Holešovice. Vstup zdarma, jmenovky na místě, nápoje na vlastní účet.",
            "de": "Lockeres After-Work-Treffen der internationalen Community in Prag im Cross Club Holešovice. Eintritt frei, Namensschilder vor Ort, Getränke selbst.",
            "ru": "Неформальная вечерняя встреча международного сообщества Праги в Cross Club Holešovice. Вход свободный, бейджи на месте, напитки за свой счёт.",
            "uk": "Неформальна вечірня зустріч міжнародної спільноти Праги у Cross Club Holešovice. Вхід вільний, бейджі на місці, напої за свій рахунок.",
        },
    },
    {
        "iso_local": "2026-06-05 18:00",
        "duration_minutes": 360,
        "category": "history",
        "address": "Multiple churches across Prague (start: Old Town Square)",
        "venue_short": "Churches across Prague",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.nockostelu.cz",
        "source_label": "nockostelu.cz",
        "partner_name": "Noc kostelů (Night of Churches)",
        "partner_url": "https://www.nockostelu.cz",
        "titles": {
            "en": "Noc kostelů — Night of Churches",
            "cs": "Noc kostelů",
            "de": "Nacht der Kirchen",
            "ru": "Ночь церквей",
            "uk": "Ніч церков",
        },
        "bodies": {
            "en": "More than 200 churches and chapels across Prague open their doors for one evening with concerts, guided tours of the towers and crypts, organ recitals and candlelight programmes. Free entry everywhere; printed map available at every venue.",
            "cs": "Více než 200 pražských kostelů a kaplí otevírá na jeden večer dveře — koncerty, prohlídky věží a krypt, varhanní recitály a programy při svíčkách. Vstup všude zdarma, mapa k dispozici v každém kostele.",
            "de": "Über 200 Prager Kirchen und Kapellen öffnen einen Abend lang ihre Türen — Konzerte, Turm- und Kryptenführungen, Orgelmatineen und Kerzenlicht-Programme. Eintritt überall frei, Faltplan an jedem Veranstaltungsort.",
            "ru": "Более 200 пражских церквей и часовен открывают двери на один вечер: концерты, экскурсии на колокольни и в крипты, органные программы и музыка при свечах. Вход везде бесплатный, карта — в каждом храме.",
            "uk": "Понад 200 празьких церков та каплиць відкривають двері на один вечір: концерти, екскурсії на дзвіниці та до крипт, органні програми, музика при свічках. Вхід усюди безкоштовний, мапа — у кожному храмі.",
        },
    },
    {
        "iso_local": "2026-06-06 17:00",
        "duration_minutes": 300,
        "category": "music",
        "address": "Staroměstské náměstí (Old Town Square), Prague 1",
        "venue_short": "Old Town Square",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.bohemiajazzfest.cz/en",
        "source_label": "bohemiajazzfest.cz",
        "partner_name": "Bohemia JazzFest",
        "partner_url": "https://www.bohemiajazzfest.cz",
        "titles": {
            "en": "Bohemia JazzFest — Opening Night on Old Town Square",
            "cs": "Bohemia JazzFest — zahajovací večer na Staroměstském náměstí",
            "de": "Bohemia JazzFest — Eröffnung auf dem Altstädter Ring",
            "ru": "Bohemia JazzFest — открытие на Староместской площади",
            "uk": "Bohemia JazzFest — відкриття на Староміській площі",
        },
        "bodies": {
            "en": "Open-air opening of Europe's largest free jazz festival. International headliners take the stage on Prague's Old Town Square — bring a friend, picnic blankets welcome.",
            "cs": "Open-air zahájení největšího bezplatného jazzového festivalu v Evropě. Mezinárodní hvězdy na pódiu na Staroměstském náměstí — pikniková deka vítána.",
            "de": "Open-Air-Eröffnung des größten kostenlosen Jazzfestivals Europas. Internationale Headliner spielen auf dem Altstädter Ring — Picknickdecken ausdrücklich willkommen.",
            "ru": "Open-air открытие крупнейшего в Европе бесплатного джазового фестиваля. Хедлайнеры — на сцене на Староместской площади. Пледы для пикника приветствуются.",
            "uk": "Open-air відкриття найбільшого в Європі безкоштовного джазового фестивалю. Хедлайнери — на сцені на Староміській площі. Пледи для пікніка вітаються.",
        },
    },
    {
        "iso_local": "2026-06-07 08:00",
        "duration_minutes": 360,
        "category": "food-tours",
        "address": "Náplavka, Rašínovo nábřeží, Prague 2",
        "venue_short": "Rašínovo nábřeží",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.farmarsketrziste.cz/farmarske-trziste/farmarske-trziste-naplavka",
        "source_label": "farmarsketrziste.cz",
        "partner_name": "Farmářské tržiště Náplavka",
        "partner_url": "https://www.farmarsketrziste.cz/farmarske-trziste/farmarske-trziste-naplavka",
        "titles": {
            "en": "Náplavka Farmers' Market on the Vltava Embankment",
            "cs": "Farmářský trh Náplavka na Rašínově nábřeží",
            "de": "Náplavka-Bauernmarkt am Vltava-Kai",
            "ru": "Фермерский рынок «Наплавка» на набережной Влтавы",
            "uk": "Фермерський ринок «Наплавка» на набережній Влтави",
        },
        "bodies": {
            "en": "Saturday-morning farmers' market on the Rašínovo embankment with seasonal produce, cheeses, sourdough, flowers and street food. Cash and card both accepted at most stalls.",
            "cs": "Sobotní farmářský trh na Rašínově nábřeží — sezónní zelenina, sýry, kváskové pečivo, květiny a street food. Většina stánků přijímá hotovost i karty.",
            "de": "Samstäglicher Bauernmarkt am Rašín-Kai — saisonales Gemüse, Käse, Sauerteigbrot, Blumen und Streetfood. Die meisten Stände nehmen Bargeld und Karte.",
            "ru": "Субботний фермерский рынок на набережной Рашина — сезонные овощи, сыры, хлеб на закваске, цветы и стритфуд. Большинство палаток принимают и наличные, и карты.",
            "uk": "Суботній фермерський ринок на набережній Рашина — сезонні овочі, сири, хліб на заквасці, квіти та стрітфуд. Більшість лотків приймають готівку і картки.",
        },
    },

    # ---------- Week 2 -----------------------------------------------
    {
        "iso_local": "2026-06-08 20:00",
        "duration_minutes": 60,
        "category": "music",
        "address": "Zrcadlová kaple Klementina, Karlova 1, Prague 1",
        "venue_short": "Mirror Chapel, Klementinum",
        "is_free": False,
        "price": 690,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventYear=2026&EventMonth=06",
        "source_label": "pragueexperience.com",
        "partner_name": "Klementinum",
        "partner_url": "https://www.klementinum.com/en",
        "titles": {
            "en": "Mozart — A Little Night Music in the Mirror Chapel",
            "cs": "Mozart — Malá noční hudba v Zrcadlové kapli",
            "de": "Mozart — Eine kleine Nachtmusik in der Spiegelkapelle",
            "ru": "Моцарт — «Маленькая ночная серенада» в Зеркальной капелле",
            "uk": "Моцарт — «Маленька нічна серенада» в Дзеркальній каплиці",
        },
        "bodies": {
            "en": "Chamber recital under the baroque ceiling frescoes of the Klementinum Mirror Chapel. Mozart's Eine kleine Nachtmusik plus selected pieces by Vivaldi and Bach. Single-set evening, ~60 minutes without interval.",
            "cs": "Komorní recitál pod barokními freskami Zrcadlové kaple Klementina. Mozartova Malá noční hudba a vybrané kusy Vivaldiho a Bacha. Jednoblokový večer, ~60 minut bez přestávky.",
            "de": "Kammer-Recital unter den barocken Deckenfresken der Klementinum-Spiegelkapelle. Mozarts Eine kleine Nachtmusik plus ausgewählte Stücke von Vivaldi und Bach. Ein Block, ca. 60 Minuten ohne Pause.",
            "ru": "Камерный концерт под барочными фресками Зеркальной капеллы Клементинума. Mozart — «Eine kleine Nachtmusik» и избранное Вивальди и Баха. Один блок, около 60 минут без антракта.",
            "uk": "Камерний концерт під бароковими фресками Дзеркальної каплиці Клементинума. Моцарт «Eine kleine Nachtmusik» та вибране Вівальді і Баха. Один блок, близько 60 хвилин без антракту.",
        },
    },
    {
        "iso_local": "2026-06-09 19:00",
        "duration_minutes": 120,
        "category": "craft-beer",
        "address": "U Fleků, Křemencova 11, Prague 1",
        "venue_short": "U Fleků brewery",
        "is_free": False,
        "price": 690,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.eventbrite.com/d/czech-republic--prague/beer-tasting/",
        "source_label": "eventbrite.com",
        "partner_name": "Pivovar U Fleků",
        "partner_url": "https://www.ufleku.cz/en",
        "titles": {
            "en": "Czech Beer Tasting Tour — U Fleků Brewery",
            "cs": "Ochutnávka českého piva — pivovar U Fleků",
            "de": "Czech Beer Tasting Tour — Brauerei U Fleků",
            "ru": "Чешская дегустация пива — пивоварня U Fleků",
            "uk": "Чеська дегустація пива — пивоварня U Fleků",
        },
        "bodies": {
            "en": "Guided tasting through five Czech beer styles in the historic 1499 brewery U Fleků. Includes a short tour of the malt house and traditional Czech snacks. Tickets via Eventbrite.",
            "cs": "Komentovaná ochutnávka pěti českých pivních stylů v historickém pivovaru U Fleků (1499). Součástí je krátká prohlídka sladovny a tradiční české občerstvení. Vstupenky na Eventbrite.",
            "de": "Geführte Verkostung durch fünf tschechische Bierstile in der Brauerei U Fleků aus dem Jahr 1499. Inklusive Kurzführung durchs Mälzhaus und traditionelles tschechisches Knabberzeug. Tickets über Eventbrite.",
            "ru": "Дегустация с гидом — пять чешских пивных стилей в исторической пивоварне U Fleků (с 1499). С короткой экскурсией по солодовне и традиционными чешскими закусками. Билеты на Eventbrite.",
            "uk": "Дегустація з гідом — п'ять чеських пивних стилів в історичній пивоварні U Fleků (з 1499). З короткою екскурсією солодовнею і традиційними чеськими закусками. Квитки на Eventbrite.",
        },
    },
    {
        "iso_local": "2026-06-10 21:00",
        "duration_minutes": 120,
        "category": "cinema",
        "address": "Náplavka Smíchov, Hořejší nábřeží, Prague 5",
        "venue_short": "Náplavka Smíchov",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs"],
        "source_url": "https://www.kudyznudy.cz/akce/letni-kino-naplavka",
        "source_label": "kudyznudy.cz",
        "partner_name": "Letní kino Náplavka",
        "partner_url": "https://www.praha-naplavka.cz",
        "titles": {
            "en": "Open-Air Cinema at Náplavka Smíchov",
            "cs": "Letní kino na Náplavce Smíchov",
            "de": "Open-Air-Kino an der Náplavka Smíchov",
            "ru": "Летний кинотеатр под открытым небом на Наплавке Смихов",
            "uk": "Літній кінотеатр під відкритим небом на Наплавці Сміхов",
        },
        "bodies": {
            "en": "Free open-air screening on the Smíchov riverbank with views of the Vltava and Vyšehrad cliff. Czech indie programme; deck chairs first-come first-served, picnic welcome.",
            "cs": "Bezplatná open-air projekce na smíchovské náplavce s výhledem na Vltavu a Vyšehradskou skálu. Český nezávislý program; lehátka jak kdo přijde, piknik vítán.",
            "de": "Kostenlose Open-Air-Vorführung am Smíchov-Ufer mit Blick auf Moldau und Vyšehrad-Felsen. Tschechisches Independent-Programm; Liegestühle nach Eintreffen, Picknick willkommen.",
            "ru": "Бесплатный показ под открытым небом на смиховской набережной с видом на Влтаву и Вышеградскую скалу. Чешское независимое кино; лежаки — кто первый, тот и сел, пикник приветствуется.",
            "uk": "Безкоштовний показ просто неба на смиховській набережній з видом на Влтаву й Вишеградську скелю. Чеське незалежне кіно; шезлонги — хто перший, той і сів, пікнік вітається.",
        },
    },
    {
        "iso_local": "2026-06-11 11:00",
        "duration_minutes": 90,
        "category": "guided-tours",
        "address": "Královská zahrada Pražského hradu, U Prašného mostu, Prague 1",
        "venue_short": "Royal Garden, Prague Castle",
        "is_free": False,
        "price": 350,
        "currency": "CZK",
        "languages": ["en", "cs", "de"],
        "source_url": "https://www.hrad.cz/en",
        "source_label": "hrad.cz",
        "partner_name": "Správa Pražského hradu",
        "partner_url": "https://www.hrad.cz/en",
        "titles": {
            "en": "Prague Castle Royal Garden — Guided Walk",
            "cs": "Královská zahrada Pražského hradu — komentovaná procházka",
            "de": "Königlicher Garten der Prager Burg — Führung",
            "ru": "Королевский сад Пражского Града — экскурсия",
            "uk": "Королівський сад Празького Граду — екскурсія",
        },
        "bodies": {
            "en": "An hour and a half through the Renaissance Royal Garden with the Belvedere Summer Palace, the Singing Fountain and the Ball Game Hall. English / Czech / German guides on rotation.",
            "cs": "Devadesát minut renesanční Královskou zahradou s letohrádkem Belveder, Zpívající fontánou a Míčovnou. Průvodci v angličtině, češtině i němčině v pravidelné rotaci.",
            "de": "Anderthalb Stunden durch den Königlichen Renaissance-Garten mit dem Belvedere, dem Singenden Brunnen und dem Ballspielhaus. Führungen auf Englisch, Tschechisch und Deutsch im Wechsel.",
            "ru": "Полтора часа по ренессансному Королевскому саду — с Бельведером, Поющим фонтаном и Мячным залом. Гиды на английском, чешском и немецком — по очереди.",
            "uk": "Півтори години ренесансним Королівським садом — з Бельведером, Співаючим фонтаном і Залою для гри в м'яч. Екскурсоводи англійською, чеською та німецькою — по черзі.",
        },
    },
    {
        "iso_local": "2026-06-12 16:00",
        "duration_minutes": 480,
        "category": "music",
        "address": "Štvanice Island & Karlín Embankment, Prague",
        "venue_short": "Štvanice Island, Karlín",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.unitedislands.cz/en",
        "source_label": "unitedislands.cz",
        "partner_name": "United Islands of Prague",
        "partner_url": "https://www.unitedislands.cz",
        "titles": {
            "en": "United Islands of Prague — Day 1",
            "cs": "United Islands of Prague — 1. den",
            "de": "United Islands of Prague — Tag 1",
            "ru": "United Islands of Prague — день 1",
            "uk": "United Islands of Prague — день 1",
        },
        "bodies": {
            "en": "Opening day of Prague's flagship free open-air music festival. Czech and international acts on multiple stages around Štvanice Island and the Karlín embankment, plus food trucks and DJ tents until midnight.",
            "cs": "Zahajovací den vlajkového bezplatného open-air festivalu v Praze. České i zahraniční kapely na pódiích kolem ostrova Štvanice a karlínské náplavky, food-trucky a DJ stany až do půlnoci.",
            "de": "Eröffnungstag des kostenlosen Open-Air-Flaggschiffs von Prag. Tschechische und internationale Acts auf mehreren Bühnen rund um die Insel Štvanice und das Karlín-Ufer, Food Trucks und DJ-Zelte bis Mitternacht.",
            "ru": "Стартовый день флагманского бесплатного open-air фестиваля Праги. Чешские и зарубежные группы на нескольких сценах вокруг острова Штванице и набережной Карлин, фуд-траки и DJ-шатры до полуночи.",
            "uk": "Стартовий день флагманського безкоштовного open-air фестивалю Праги. Чеські та міжнародні гурти на кількох сценах навколо острова Штванице та набережної Карлін, фуд-траки і DJ-шатри до півночі.",
        },
    },
    {
        "iso_local": "2026-06-13 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Štvanice Island & Karlín Embankment, Prague",
        "venue_short": "Štvanice Island, Karlín",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.unitedislands.cz/en",
        "source_label": "unitedislands.cz",
        "partner_name": "United Islands of Prague",
        "partner_url": "https://www.unitedislands.cz",
        "titles": {
            "en": "United Islands of Prague — Day 2",
            "cs": "United Islands of Prague — 2. den",
            "de": "United Islands of Prague — Tag 2",
            "ru": "United Islands of Prague — день 2",
            "uk": "United Islands of Prague — день 2",
        },
        "bodies": {
            "en": "Saturday line-up: indie, electronic and world-music headliners across the Štvanice and Karlín stages. Family zone open from 14:00, late-night sets at the river cinema barge until 02:00.",
            "cs": "Sobotní lineup: indie, elektronika a world-music hlavičky na pódiích Štvanice i Karlín. Rodinná zóna od 14:00, noční sety na říčním kině do 02:00.",
            "de": "Samstags-Programm: Indie, Electronic und World-Music-Headliner auf den Bühnen Štvanice und Karlín. Familienzone ab 14:00, Late-Night-Sets auf dem Kino-Lastkahn bis 02:00.",
            "ru": "Субботний lineup: инди, электроника и world-music на сценах Штванице и Карлин. Семейная зона с 14:00, ночные сеты на речном кинобарже до 02:00.",
            "uk": "Суботній lineup: інді, електроніка та world-music на сценах Штванице й Карлін. Сімейна зона з 14:00, нічні сети на річковому кінобаржі до 02:00.",
        },
    },
    {
        "iso_local": "2026-06-14 18:00",
        "duration_minutes": 180,
        "category": "astronomy",
        "address": "Štefánikova hvězdárna, Strahovská 205, Petřín, Prague 1",
        "venue_short": "Štefánik Observatory, Petřín",
        "is_free": False,
        "price": 120,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.planetum.cz/en/observatories/stefanik-observatory",
        "source_label": "planetum.cz",
        "partner_name": "Štefánikova hvězdárna",
        "partner_url": "https://www.planetum.cz/en/observatories/stefanik-observatory",
        "titles": {
            "en": "Sunset Observation Walk on Petřín Hill",
            "cs": "Pozorování při západu slunce na Petříně",
            "de": "Sonnenuntergangs-Beobachtung auf dem Petřín-Hügel",
            "ru": "Наблюдения на закате на холме Петршин",
            "uk": "Спостереження на заході сонця на пагорбі Петршин",
        },
        "bodies": {
            "en": "Three-hour guided astronomy walk: sunset view from the Petřín Tower terrace, then telescope observations of Venus and the lunar terminator at the Štefánik Observatory. Dress warm even in June.",
            "cs": "Tříhodinová komentovaná astro-procházka: západ slunce z ochozu Petřínské rozhledny, poté pozorování Venuše a měsíčního terminátoru dalekohledem na Štefánikově hvězdárně. I v červnu se hodí teplejší vrstva.",
            "de": "Dreistündiger Astronomie-Spaziergang: Sonnenuntergang vom Aussichtsumgang des Petřín-Turms, danach Teleskop-Beobachtung von Venus und Mondterminator an der Štefánik-Sternwarte. Auch im Juni warm anziehen.",
            "ru": "Трёхчасовая астрономическая прогулка с гидом: закат с обзорной площадки Петршинской башни, затем — наблюдения Венеры и лунного терминатора в телескоп на обсерватории Штефаника. Даже в июне стоит одеться теплее.",
            "uk": "Тригодинна астрономічна прогулянка з гідом: захід сонця з оглядового майданчика Петршинської вежі, потім — спостереження Венери та місячного термінатора в телескоп на обсерваторії Штефаника. Навіть у червні варто вдягнутися тепліше.",
        },
    },

    # ---------- Week 3 -----------------------------------------------
    {
        "iso_local": "2026-06-15 19:30",
        "duration_minutes": 90,
        "category": "music",
        "address": "Lichtenštejnský palác, U Sovových mlýnů 506/4, Prague 1",
        "venue_short": "Liechtenstein Palace, Malá Strana",
        "is_free": False,
        "price": 450,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.mladapraha.cz",
        "source_label": "mladapraha.cz",
        "partner_name": "Mladá Praha",
        "partner_url": "https://www.mladapraha.cz",
        "titles": {
            "en": "Mladá Praha — Chamber Music at Liechtenstein Palace",
            "cs": "Mladá Praha — komorní hudba v Lichtenštejnském paláci",
            "de": "Mladá Praha — Kammermusik im Liechtenstein-Palais",
            "ru": "Mladá Praha — камерный концерт в Лихтенштейнском дворце",
            "uk": "Mladá Praha — камерний концерт у Ліхтенштейнському палаці",
        },
        "bodies": {
            "en": "Annual chamber-music showcase by graduates of the Prague conservatories. This evening: a Janáček quartet, a Schubert lieder cycle and an early-Mahler chamber arrangement.",
            "cs": "Tradiční přehlídka komorní hudby absolventů pražských konzervatoří. Dnes večer: Janáčkův kvartet, Schubertův cyklus písní a komorní úprava raného Mahlera.",
            "de": "Traditionelle Kammermusikreihe der Absolventen Prager Konservatorien. Heute Abend: Janáček-Quartett, Schubert-Liederzyklus und eine frühe Mahler-Kammerfassung.",
            "ru": "Ежегодная программа камерной музыки от выпускников пражских консерваторий. Сегодня — квартет Яначека, цикл песен Шуберта и камерная редакция раннего Малера.",
            "uk": "Щорічна програма камерної музики від випускників празьких консерваторій. Сьогодні — квартет Яначека, цикл пісень Шуберта і камерна редакція раннього Малера.",
        },
    },
    {
        "iso_local": "2026-06-16 20:00",
        "duration_minutes": 90,
        "category": "dancing",
        "address": "Nová scéna ND, Národní 4, Prague 1",
        "venue_short": "New Stage, National Theatre",
        "is_free": False,
        "price": 590,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.tanecpraha.org/en",
        "source_label": "tanecpraha.org",
        "partner_name": "Tanec Praha",
        "partner_url": "https://www.tanecpraha.org",
        "titles": {
            "en": "Tanec Praha — International Dance Festival at the New Stage",
            "cs": "Tanec Praha — mezinárodní festival současného tance na Nové scéně",
            "de": "Tanec Praha — Internationales Tanzfestival auf der Neuen Bühne",
            "ru": "Tanec Praha — международный фестиваль танца на Новой сцене",
            "uk": "Tanec Praha — міжнародний фестиваль танцю на Новій сцені",
        },
        "bodies": {
            "en": "Headline night of the international Tanec Praha festival of contemporary dance, on the New Stage of the National Theatre. Single-piece evening followed by an artist Q&A.",
            "cs": "Hlavní večer mezinárodního festivalu současného tance Tanec Praha na Nové scéně Národního divadla. Jednodílný program, po představení Q&A s tvůrci.",
            "de": "Hauptabend des internationalen Festivals für zeitgenössischen Tanz Tanec Praha auf der Neuen Bühne des Nationaltheaters. Abendfüllendes Stück, danach Q&A mit den Künstlern.",
            "ru": "Главный вечер международного фестиваля современного танца Tanec Praha на Новой сцене Национального театра. Одно крупное произведение и Q&A с авторами после показа.",
            "uk": "Головний вечір міжнародного фестивалю сучасного танцю Tanec Praha на Новій сцені Національного театру. Один великий твір і Q&A з авторами після показу.",
        },
    },
    {
        "iso_local": "2026-06-17 19:00",
        "duration_minutes": 180,
        "category": "food-tours",
        "address": "Čechův most pier, Dvořákovo nábřeží, Prague 1",
        "venue_short": "Čechův most boat pier",
        "is_free": False,
        "price": 1290,
        "currency": "CZK",
        "languages": ["en", "de"],
        "source_url": "https://www.eventbrite.com/d/czech-republic--prague/dinner-cruise/",
        "source_label": "eventbrite.com",
        "partner_name": "Prague Boats",
        "partner_url": "https://www.prague-boats.cz/en",
        "titles": {
            "en": "Vltava Sunset Dinner Cruise",
            "cs": "Večerní plavba po Vltavě s večeří",
            "de": "Moldau-Sonnenuntergangs-Dinnerkreuzfahrt",
            "ru": "Вечерний круиз по Влтаве с ужином на закате",
            "uk": "Вечірній круїз Влтавою з вечерею на заході сонця",
        },
        "bodies": {
            "en": "Three-hour cruise from Čechův most pier upstream to Vyšehrad and back, with a four-course Czech-Mediterranean menu, soft drinks included and live piano on the upper deck.",
            "cs": "Tříhodinová plavba od mola u Čechova mostu proti proudu k Vyšehradu a zpět — čtyřchodové česko-středomořské menu, nealko v ceně, na horní palubě klavír naživo.",
            "de": "Dreistündige Fahrt vom Steg an der Čech-Brücke flussaufwärts bis Vyšehrad und zurück — viergängiges tschechisch-mediterranes Menü, alkoholfreie Getränke inklusive, Live-Klavier auf dem Oberdeck.",
            "ru": "Трёхчасовой круиз от причала у моста Чеха вверх по реке до Вышеграда и обратно — меню из четырёх блюд (чешско-средиземноморская кухня), безалкогольные напитки в стоимости, на верхней палубе фортепиано вживую.",
            "uk": "Тригодинний круїз від причалу біля моста Чеха вгору рікою до Вишеграда і назад — меню з чотирьох страв (чесько-середземноморська кухня), безалкогольні напої у вартості, на верхній палубі фортепіано наживо.",
        },
    },
    {
        "iso_local": "2026-06-18 21:30",
        "duration_minutes": 120,
        "category": "cinema",
        "address": "Letenské sady (Letná Park), Letohradská, Prague 7",
        "venue_short": "Letná Park",
        "is_free": False,
        "price": 220,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://kinoaero.cz/en",
        "source_label": "kinoaero.cz",
        "partner_name": "Aerofilms / Kino Aero",
        "partner_url": "https://kinoaero.cz",
        "titles": {
            "en": "Aerofilms Open-Air Cinema in Letná Park",
            "cs": "Letní kino Aerofilms v Letenských sadech",
            "de": "Aerofilms Open-Air-Kino im Letná-Park",
            "ru": "Кинотеатр под открытым небом Aerofilms в парке Летна",
            "uk": "Кінотеатр просто неба Aerofilms у парку Летна",
        },
        "bodies": {
            "en": "Aerofilms returns to Letná with their summer programme of European arthouse picks shown after dark on the panoramic terrace overlooking the Old Town. Original-language with Czech subtitles.",
            "cs": "Aerofilms se vrací na Letnou s letním programem evropského artu — projekce za tmy z panoramatické pláně nad Starým Městem. Originální znění s českými titulky.",
            "de": "Aerofilms ist mit ihrem Sommerprogramm europäischer Arthouse-Filme zurück auf der Letná — Vorführungen nach Einbruch der Dunkelheit auf der Panorama-Wiese über der Altstadt. Originalfassung mit tschechischen Untertiteln.",
            "ru": "Aerofilms возвращается на Летну с летней программой европейского артхауса — показы после заката на панорамной площадке над Старым Городом. Оригинальная озвучка, чешские субтитры.",
            "uk": "Aerofilms повертається на Летну з літньою програмою європейського артхаусу — покази після заходу сонця на панорамному майданчику над Старим Містом. Оригінальне озвучення, чеські субтитри.",
        },
    },
    {
        "iso_local": "2026-06-19 20:00",
        "duration_minutes": 150,
        "category": "theater",
        "address": "Letní scéna Vyšehrad, V pevnosti, Prague 2",
        "venue_short": "Vyšehrad Summer Stage",
        "is_free": False,
        "price": 690,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.praha-vysehrad.cz/akce",
        "source_label": "praha-vysehrad.cz",
        "partner_name": "Národní kulturní památka Vyšehrad",
        "partner_url": "https://www.praha-vysehrad.cz",
        "titles": {
            "en": "Open-Air Verdi at the Vyšehrad Summer Stage",
            "cs": "Verdi pod širým nebem na Letní scéně Vyšehrad",
            "de": "Verdi unter freiem Himmel auf der Vyšehrad-Sommerbühne",
            "ru": "Верди под открытым небом на Летней сцене Вышеграда",
            "uk": "Верді просто неба на Літній сцені Вишеграда",
        },
        "bodies": {
            "en": "Open-air staging of Verdi's La Traviata on the Vyšehrad fortress lawn, with the spires of St Peter and Paul as the backdrop. Surtitles in Czech and English. Bring a cushion — the seating is wooden.",
            "cs": "Open-air provedení Verdiho La Traviaty na vyšehradské pevnosti, jako kulisa věže baziliky sv. Petra a Pavla. Titulky v češtině i angličtině. Polštářek se hodí — sedáky jsou dřevěné.",
            "de": "Open-Air-Inszenierung von Verdis La Traviata auf der Vyšehrader Festungswiese, mit den Türmen von St. Peter und Paul als Kulisse. Übertitel in Tschechisch und Englisch. Sitzkissen empfohlen — die Bänke sind aus Holz.",
            "ru": "Open-air постановка «Травиаты» Верди на лугу Вышеградской крепости — с башнями базилики Петра и Павла как декорацией. Титры на чешском и английском. Возьмите подушку — сиденья деревянные.",
            "uk": "Open-air постановка «Травіати» Верді на лужку Вишеградської фортеці — з вежами базиліки Петра і Павла як декорацією. Титри чеською та англійською. Візьміть подушку — сидіння дерев'яні.",
        },
    },
    {
        "iso_local": "2026-06-20 10:00",
        "duration_minutes": 480,
        "category": "other",
        "address": "Letenské sady, Letenská pláň, Prague 7",
        "venue_short": "Letná Plain",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.kudyznudy.cz/akce/letni-blesi-trh-na-letne",
        "source_label": "kudyznudy.cz",
        "partner_name": "Letenský bleší trh",
        "partner_url": "https://www.facebook.com/blesaknaletne",
        "titles": {
            "en": "Letná Vintage & Flea Market",
            "cs": "Letenský bleší a vintage trh",
            "de": "Letná Vintage- und Flohmarkt",
            "ru": "Винтажный и блошиный рынок на Летне",
            "uk": "Вінтажний і блошиний ринок на Летні",
        },
        "bodies": {
            "en": "Eight-hour Saturday flea market on the Letná Plain — vintage clothes, mid-century furniture, vinyl, books and a long row of food trucks. Cash preferred at the stalls.",
            "cs": "Osmihodinový sobotní blešák na Letenské pláni — retro oblečení, nábytek z poloviny století, vinyl, knihy a dlouhá řada food trucků. U stánků se doporučuje hotovost.",
            "de": "Achtstündiger Samstags-Flohmarkt auf der Letná-Wiese — Vintage-Kleidung, Mid-Century-Möbel, Vinyl, Bücher und eine lange Reihe Foodtrucks. Bargeld an den Ständen bevorzugt.",
            "ru": "Восьмичасовая субботняя барахолка на Летенской равнине — винтажная одежда, мебель середины века, винил, книги и длинная аллея фуд-траков. На прилавках предпочитают наличные.",
            "uk": "Восьмигодинна суботня барахолка на Летенській рівнині — вінтажний одяг, меблі середини століття, вініл, книги та довга алея фуд-траків. На прилавках надають перевагу готівці.",
        },
    },
    {
        "iso_local": "2026-06-21 09:00",
        "duration_minutes": 360,
        "category": "tennis",
        "address": "I. ČLTK Praha, Štvanice 1, Prague 7",
        "venue_short": "I. ČLTK Praha, Štvanice",
        "is_free": False,
        "price": 350,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.cltk.cz",
        "source_label": "cltk.cz",
        "partner_name": "I. ČLTK Praha",
        "partner_url": "https://www.cltk.cz",
        "titles": {
            "en": "Štvanice Open Day — Tennis & Padel",
            "cs": "Den otevřených kurtů — tenis a padel na Štvanici",
            "de": "Štvanice Open Day — Tennis & Padel",
            "ru": "День открытых кортов — теннис и падел на Штванице",
            "uk": "День відкритих кортів — теніс і падел на Штванице",
        },
        "bodies": {
            "en": "All-day open courts at the historic I. ČLTK club on Štvanice Island. Free intro lessons every hour, drop-in mini-tournaments and a coach-on-call corner. Rackets available to borrow.",
            "cs": "Celodenní otevřené kurty v historickém I. ČLTK na Štvanici. Bezplatné úvodní lekce každou hodinu, miniturnaje s otevřenou účastí a koutek s trenérem. Rakety si lze zapůjčit.",
            "de": "Ganztags offene Plätze im historischen I. ČLTK auf der Insel Štvanice. Kostenlose Einsteigerlektionen zu jeder vollen Stunde, offene Mini-Turniere und Trainer-Ecke. Schläger leihweise vor Ort.",
            "ru": "Корт-день в историческом клубе I. ČLTK на острове Штванице. Каждый час — бесплатные вводные занятия, мини-турниры с участием с улицы, уголок с тренером. Ракетки выдают на месте.",
            "uk": "День відкритих кортів в історичному клубі I. ČLTK на острові Штванице. Щогодини — безкоштовні вступні заняття, міні-турніри з участю з вулиці, куток з тренером. Ракетки видають на місці.",
        },
    },

    # ---------- Week 4 -----------------------------------------------
    {
        "iso_local": "2026-06-22 18:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Chefparade Cooking School, Jáchymova 4, Prague 1",
        "venue_short": "Chefparade, Old Town",
        "is_free": False,
        "price": 1990,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.chefparade.cz/en",
        "source_label": "chefparade.cz",
        "partner_name": "Chefparade Cooking School",
        "partner_url": "https://www.chefparade.cz/en",
        "titles": {
            "en": "Czech Cooking Class — Goulash, Knedlíky & Pilsner",
            "cs": "Kurz vaření českých klasik — guláš, knedlíky a pilsner",
            "de": "Tschechischer Kochkurs — Gulasch, Knödel & Pilsner",
            "ru": "Мастер-класс по чешской кухне — гуляш, кнедлики и пилзнер",
            "uk": "Майстер-клас з чеської кухні — гуляш, кнедлики та пілзнер",
        },
        "bodies": {
            "en": "Three-hour hands-on class with a Czech chef: cook beef goulash from scratch, master fluffy bread knedlíky, and finish with apple štrúdl. One Pilsner Urquell included with dinner.",
            "cs": "Tříhodinový workshop s českým šéfkuchařem: hovězí guláš od základu, nadýchané houskové knedlíky a jablečný štrúdl na závěr. K večeři jeden Pilsner Urquell v ceně.",
            "de": "Dreistündiger Hands-on-Kurs mit tschechischem Chefkoch: Rindergulasch von Grund auf, lockere Knödel und zum Abschluss Apfel-Strudel. Ein Pilsner Urquell zum Essen inklusive.",
            "ru": "Трёхчасовой практический мастер-класс с чешским шеф-поваром: говяжий гуляш с нуля, пышные кнедлики и яблочный штрудль на десерт. Один Pilsner Urquell к ужину в стоимости.",
            "uk": "Тригодинний практичний майстер-клас з чеським шеф-кухарем: яловичий гуляш з нуля, пишні кнедлики та яблучний штрудель на десерт. Один Pilsner Urquell до вечері у вартості.",
        },
    },
    {
        "iso_local": "2026-06-23 07:30",
        "duration_minutes": 60,
        "category": "yoga",
        "address": "Park Stromovka, Královská obora, Prague 7",
        "venue_short": "Stromovka Park",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.kudyznudy.cz/akce/jogou-do-rana",
        "source_label": "kudyznudy.cz",
        "partner_name": "Yoga in the Park Prague",
        "partner_url": "https://www.facebook.com/yogainparkprague",
        "titles": {
            "en": "Sunrise Yoga in Stromovka Park",
            "cs": "Ranní jóga v parku Stromovka",
            "de": "Sunrise-Yoga im Stromovka-Park",
            "ru": "Утренняя йога в парке Стромовка",
            "uk": "Ранкова йога у парку Стромовка",
        },
        "bodies": {
            "en": "60-minute hatha class on the central meadow of Stromovka Park, just after sunrise. Free, donation-based, all levels welcome — bring your own mat (a few spares on site).",
            "cs": "Šedesátiminutová hatha lekce na hlavní louce Stromovky hned po východu slunce. Zdarma, na bázi dobrovolného vstupného, vhodné pro všechny úrovně — vlastní podložka s sebou (pár náhradních na místě).",
            "de": "60-minütige Hatha-Stunde auf der Hauptwiese im Stromovka-Park kurz nach Sonnenaufgang. Kostenlos, freiwillige Spende, für alle Level geeignet — eigene Matte mitbringen (ein paar Ersatz vor Ort).",
            "ru": "60-минутная хатха-йога на главной поляне парка Стромовка сразу после восхода солнца. Бесплатно, по донейту, для всех уровней — берите свой коврик (несколько запасных на месте).",
            "uk": "60-хвилинна хатха-йога на головній галявині парку Стромовка одразу після світанку. Безкоштовно, за донейтом, для всіх рівнів — беріть свій килимок (кілька запасних на місці).",
        },
    },
    {
        "iso_local": "2026-06-24 19:00",
        "duration_minutes": 180,
        "category": "startups",
        "address": "Impact Hub Prague, Drtinova 10, Prague 5",
        "venue_short": "Impact Hub Prague, Smíchov",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/prague-startup-meetup",
        "source_label": "meetup.com",
        "partner_name": "Prague Startup Drinks",
        "partner_url": "https://impacthub.cz/en/prague",
        "titles": {
            "en": "Prague Startup Drinks — Founders & Builders Mixer",
            "cs": "Prague Startup Drinks — neformální setkání zakladatelů a tvůrců",
            "de": "Prague Startup Drinks — Founder & Builder Mixer",
            "ru": "Prague Startup Drinks — встреча основателей и строителей",
            "uk": "Prague Startup Drinks — зустріч засновників і будівничих",
        },
        "bodies": {
            "en": "Open mixer at Impact Hub Prague for founders, engineers, designers and product folks. Five 90-second pitch slots from the audience, then unstructured drinks until late.",
            "cs": "Otevřený mixer v Impact Hubu Praha pro zakladatele, inženýry, designéry a produkťáky. Pět 90sekundových pitch slotů z publika, poté volný networking dlouho do noci.",
            "de": "Offener Mixer im Impact Hub Prag für Gründer, Engineers, Designer und Produktleute. Fünf 90-Sekunden-Pitch-Slots aus dem Publikum, danach freies Networking bis spät.",
            "ru": "Открытый mixer в Impact Hub Praha для фаундеров, инженеров, дизайнеров и продуктовиков. Пять питч-слотов по 90 секунд из зала, дальше — свободный нетворкинг до поздна.",
            "uk": "Відкритий mixer в Impact Hub Praha для фаундерів, інженерів, дизайнерів і продуктовиків. П'ять пітч-слотів по 90 секунд із зали, далі — вільний нетворкінг до пізна.",
        },
    },
    {
        "iso_local": "2026-06-25 05:30",
        "duration_minutes": 120,
        "category": "photography",
        "address": "Charles Bridge, east tower meeting point, Křižovnické náměstí, Prague 1",
        "venue_short": "Charles Bridge, east tower",
        "is_free": False,
        "price": 590,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.eventbrite.com/d/czech-republic--prague/photography-walk/",
        "source_label": "eventbrite.com",
        "partner_name": "Prague Photography Walks",
        "partner_url": "https://praguephotowalk.com",
        "titles": {
            "en": "Sunrise Photo Walk on Charles Bridge",
            "cs": "Fotoprocházka při východu slunce na Karlově mostě",
            "de": "Sonnenaufgangs-Fotospaziergang auf der Karlsbrücke",
            "ru": "Фотопрогулка на восходе на Карловом мосту",
            "uk": "Фотопрогулянка на світанку на Карловому мості",
        },
        "bodies": {
            "en": "Two-hour guided walk along the empty Charles Bridge at sunrise: composition tips, the best statue angles in low light, then a coffee stop in Mostecká street. DSLR or phone, both welcome.",
            "cs": "Dvouhodinová komentovaná procházka prázdným Karlovým mostem za rozbřesku — kompozice, nejlepší úhly soch v měkkém světle a pak pauza na kávu v Mostecké. Zrcadlovka i telefon vítány.",
            "de": "Zweistündiger geführter Spaziergang über die leere Karlsbrücke bei Sonnenaufgang — Komposition, die besten Statuen-Winkel im weichen Licht, danach Kaffeepause in der Mostecká. DSLR und Smartphone willkommen.",
            "ru": "Двухчасовая прогулка с гидом по пустому Карлову мосту на рассвете — композиция, лучшие ракурсы статуй в мягком свете, потом кофе на улице Mostecká. Зеркалка или смартфон — оба варианта.",
            "uk": "Двогодинна прогулянка з гідом порожнім Карловим мостом на світанку — композиція, найкращі ракурси скульптур у м'якому світлі, потім кава на вулиці Mostecká. Дзеркалка або смартфон — обидва варіанти.",
        },
    },
    {
        "iso_local": "2026-06-26 18:00",
        "duration_minutes": 480,
        "category": "music",
        "address": "Výstaviště Holešovice, U Výstaviště 67, Prague 7",
        "venue_short": "Výstaviště Holešovice",
        "is_free": False,
        "price": 1990,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.metronomefestival.cz/en",
        "source_label": "metronomefestival.cz",
        "partner_name": "Metronome Prague",
        "partner_url": "https://www.metronomefestival.cz",
        "titles": {
            "en": "Metronome Prague — Day 1 at Výstaviště",
            "cs": "Metronome Prague — 1. den na Výstavišti",
            "de": "Metronome Prague — Tag 1 auf dem Výstaviště",
            "ru": "Metronome Prague — день 1 на Výstaviště",
            "uk": "Metronome Prague — день 1 на Výstaviště",
        },
        "bodies": {
            "en": "Opening day of the Metronome city festival at Výstaviště Holešovice — international rock/pop headliners on three stages, the food court inside Křižík's Industrial Palace and after-parties in the side hall until 02:00.",
            "cs": "Zahajovací den městského festivalu Metronome na Výstavišti Holešovice — mezinárodní rockové a popové hlavičky na třech pódiích, food court v Průmyslovém paláci a after-party v boční hale do 02:00.",
            "de": "Eröffnungstag des Stadtfestivals Metronome auf dem Výstaviště Holešovice — internationale Rock- und Pop-Headliner auf drei Bühnen, Foodcourt im Industriepalast und After-Party in der Seitenhalle bis 02:00.",
            "ru": "Стартовый день городского фестиваля Metronome на Výstaviště Holešovice — международные рок- и поп-хедлайнеры на трёх сценах, фуд-корт в Промышленном дворце и афтерпати в боковом зале до 02:00.",
            "uk": "Стартовий день міського фестивалю Metronome на Výstaviště Holešovice — міжнародні рок- і поп-хедлайнери на трьох сценах, фуд-корт у Промисловому палаці й афтерпаті в боковому залі до 02:00.",
        },
    },
    {
        "iso_local": "2026-06-27 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Výstaviště Holešovice, U Výstaviště 67, Prague 7",
        "venue_short": "Výstaviště Holešovice",
        "is_free": False,
        "price": 1990,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.metronomefestival.cz/en",
        "source_label": "metronomefestival.cz",
        "partner_name": "Metronome Prague",
        "partner_url": "https://www.metronomefestival.cz",
        "titles": {
            "en": "Metronome Prague — Day 2 at Výstaviště",
            "cs": "Metronome Prague — 2. den na Výstavišti",
            "de": "Metronome Prague — Tag 2 auf dem Výstaviště",
            "ru": "Metronome Prague — день 2 на Výstaviště",
            "uk": "Metronome Prague — день 2 на Výstaviště",
        },
        "bodies": {
            "en": "Saturday at Metronome — daytime jazz and electronic stages opens at 14:00, evening rock/pop headliners on the main stage from 19:30. Late-night sets at the after-stage until 04:00.",
            "cs": "Sobota na Metronome — denní jazzová a elektronická pódia od 14:00, večerní rockové a popové hlavičky na hlavním pódiu od 19:30. Noční sety na after-stage do 04:00.",
            "de": "Samstag beim Metronome — Tages-Jazz- und Electronic-Bühnen ab 14:00, abendliche Rock-/Pop-Headliner auf der Hauptbühne ab 19:30. Late-Night-Sets auf der After-Stage bis 04:00.",
            "ru": "Суббота на Metronome — дневные джазовые и электронные сцены с 14:00, вечерние рок- и поп-хедлайнеры на главной сцене с 19:30. Ночные сеты на after-stage до 04:00.",
            "uk": "Субота на Metronome — денні джазові та електронні сцени з 14:00, вечірні рок- і поп-хедлайнери на головній сцені з 19:30. Нічні сети на after-stage до 04:00.",
        },
    },
    {
        "iso_local": "2026-06-28 14:00",
        "duration_minutes": 90,
        "category": "history",
        "address": "Old Town Hall, Staroměstské náměstí 1, Prague 1",
        "venue_short": "Old Town Hall",
        "is_free": False,
        "price": 350,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.prague.eu/en/things-to-do/jewish-prague-and-kafka",
        "source_label": "prague.eu",
        "partner_name": "Prague City Tourism",
        "partner_url": "https://www.prague.eu/en",
        "titles": {
            "en": "Kafka in Prague — Literary Walking Tour",
            "cs": "Kafka v Praze — literární vycházka",
            "de": "Kafka in Prag — literarischer Stadtspaziergang",
            "ru": "Кафка в Праге — литературная прогулка",
            "uk": "Кафка у Празі — літературна прогулянка",
        },
        "bodies": {
            "en": "Ninety-minute walking tour from the Old Town Hall through Jewish Prague, the houses where Franz Kafka was born, lived and wrote, and a coffee at Café Louvre — one of his haunts. English-only.",
            "cs": "Devadesátiminutová vycházka od Staroměstské radnice židovskou Prahou, kolem domů, kde se Franz Kafka narodil, žil a psal, a se zastávkou na kávu v Café Louvre — jedné z jeho oblíbených kaváren. Pouze anglicky.",
            "de": "Neunzigminütiger Stadtspaziergang vom Altstädter Rathaus durch das jüdische Prag, vorbei an den Häusern, in denen Franz Kafka geboren wurde, lebte und schrieb, mit Kaffeepause im Café Louvre — einem seiner Stammlokale. Nur auf Englisch.",
            "ru": "Девяностоминутная прогулка от Староместской ратуши по еврейской Праге, мимо домов, где Франц Кафка родился, жил и писал, с остановкой на кофе в Café Louvre — одном из его любимых мест. Только на английском.",
            "uk": "Дев'яностохвилинна прогулянка від Староміської ратуші єврейською Прагою, повз будинки, де Франц Кафка народився, жив і писав, із зупинкою на каву в Café Louvre — одному з його улюблених місць. Лише англійською.",
        },
    },

    # ---------- Week 5 -----------------------------------------------
    {
        "iso_local": "2026-06-29 19:00",
        "duration_minutes": 120,
        "category": "wine-tasting",
        "address": "Bokovka Wine Bar, Dlouhá 37, Prague 1",
        "venue_short": "Bokovka Wine Bar",
        "is_free": False,
        "price": 890,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.bokovka.com",
        "source_label": "bokovka.com",
        "partner_name": "Bokovka Wine Bar",
        "partner_url": "https://www.bokovka.com",
        "titles": {
            "en": "Czech Wine Tasting at Bokovka",
            "cs": "Ochutnávka českých vín v Bokovce",
            "de": "Tschechische Weinverkostung in der Bokovka",
            "ru": "Дегустация чешских вин в Bokovce",
            "uk": "Дегустація чеських вин у Bokovce",
        },
        "bodies": {
            "en": "Two-hour flight through six small-batch Moravian wines at Bokovka — Pálava, Ryzlink, a barrel-aged Pinot Noir and three surprise picks from the sommelier's cellar. Cheese board included.",
            "cs": "Dvouhodinová degustace šesti vín od malých moravských vinařů v Bokovce — Pálava, Ryzlink, sudově zrálý Pinot Noir a tři překvapení ze sklepa sommeliéra. K vínu sýrový talíř.",
            "de": "Zweistündige Verkostung von sechs Mährischen Weinen kleiner Winzer in der Bokovka — Pálava, Riesling, fassgereifter Pinot Noir und drei Überraschungen aus dem Sommelier-Keller. Käseteller inklusive.",
            "ru": "Двухчасовая дегустация шести моравских вин малых виноделен в Bokovce — Pálava, Рислинг, выдержанный в бочке Pinot Noir и три сюрприза из погреба сомелье. Сырная доска в стоимости.",
            "uk": "Двогодинна дегустація шести моравських вин малих виноробів у Bokovce — Pálava, Рислінг, витриманий у бочці Pinot Noir і три сюрпризи з льоху сомельє. Сирна тарілка у вартості.",
        },
    },
    {
        "iso_local": "2026-06-30 20:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "Nadruhou, Křižíkova 18, Prague 8",
        "venue_short": "Nadruhou Comedy Club",
        "is_free": False,
        "price": 250,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.facebook.com/PragueComedy",
        "source_label": "facebook.com/PragueComedy",
        "partner_name": "Prague Comedy",
        "partner_url": "https://www.facebook.com/PragueComedy",
        "titles": {
            "en": "Prague Comedy — English Stand-Up Open Mic",
            "cs": "Prague Comedy — open mic stand-up v angličtině",
            "de": "Prague Comedy — Englisches Stand-up Open Mic",
            "ru": "Prague Comedy — стендап open mic на английском",
            "uk": "Prague Comedy — стендап open mic англійською",
        },
        "bodies": {
            "en": "Two-hour open-mic night at Nadruhou Comedy Club in Karlín. A dozen comics, mostly the city's English-language regulars plus 3-4 sign-up slots at the door. Drinks bar in the room.",
            "cs": "Dvouhodinový open mic v Nadruhou Comedy Clubu v Karlíně — tucet komiků, převážně anglicky mluvících rezidentů Prahy plus 3-4 sign-up sloty na místě. Bar v sále.",
            "de": "Zweistündiger Open-Mic-Abend im Nadruhou Comedy Club in Karlín — ein Dutzend Comedians, vor allem die englischsprachigen Stammkräfte der Stadt plus 3-4 Sign-Up-Slots vor Ort. Bar im Saal.",
            "ru": "Двухчасовой open mic в комеди-клубе Nadruhou в Карлине — десяток комиков, в основном англоязычные резиденты Праги, плюс 3-4 sign-up слота на месте. Бар в зале.",
            "uk": "Двогодинний open mic у комеді-клубі Nadruhou у Карліні — десяток коміків, переважно англомовні резиденти Праги, плюс 3-4 sign-up слоти на місці. Бар у залі.",
        },
    },
]


# ---- Time helpers ----------------------------------------------------

def local_to_utc_iso(iso_local: str) -> str:
    """Convert YYYY-MM-DD HH:MM (CEST = UTC+2) to YYYY-MM-DDTHH:MM:00Z."""
    date_part, time_part = iso_local.split(" ")
    h, m = (int(x) for x in time_part.split(":"))
    # CEST = UTC+2, so UTC = local - 2h
    h_utc = h - 2
    if h_utc < 0:
        # would underflow into previous day; ensure none of our local times do
        raise ValueError(f"local time {iso_local} crosses date boundary in UTC")
    return f"{date_part}T{h_utc:02d}:{m:02d}:00Z"


def local_human(iso_local: str) -> str:
    """Format YYYY-MM-DD HH:MM as '01 Jun 2026, 10:00' for the closing h3."""
    date_part, time_part = iso_local.split(" ")
    y, mo, d = (int(x) for x in date_part.split("-"))
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d:02d} {months[mo-1]} {y}, {time_part}"


# ---- Supabase plumbing ----------------------------------------------

def env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"missing env var: {name}")
    return val.strip()


def existing_titles(supabase_url: str, key: str) -> set[str]:
    out = subprocess.run(
        [
            "curl", "-sS",
            "-H", f"apikey: {key}",
            "-H", f"Authorization: Bearer {key}",
            f"{supabase_url}/rest/v1/events?is_system=eq.true&select=title&limit=1000",
        ],
        check=True, capture_output=True, text=True,
    )
    return {row["title"] for row in json.loads(out.stdout)}


def insert_event(*, supabase_url: str, key: str, payload: dict) -> dict | None:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(payload, f, ensure_ascii=False)
        tmp_path = f.name
    try:
        out = subprocess.run(
            [
                "curl", "-sS", "-X", "POST",
                "-H", f"apikey: {key}",
                "-H", f"Authorization: Bearer {key}",
                "-H", "Content-Type: application/json",
                "-H", "Prefer: return=representation",
                f"{supabase_url}/rest/v1/events",
                "--data-binary", f"@{tmp_path}",
            ],
            check=True, capture_output=True, text=True,
        )
    finally:
        os.unlink(tmp_path)

    body = out.stdout.strip()
    if not body:
        return None
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        print(f"[!] non-JSON response: {body!r}")
        return None
    if isinstance(parsed, dict) and "code" in parsed:
        print(f"[!] insert failed: {parsed}")
        return None
    return parsed[0] if isinstance(parsed, list) and parsed else None


def main() -> None:
    supabase_url = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    skip_titles = existing_titles(supabase_url, key)
    print(f"[i] {len(skip_titles)} existing system events found")

    inserted = 0
    skipped = 0

    for ev in EVENTS:
        title_en = ev["titles"]["en"]
        if title_en in skip_titles:
            print(f"[=] skip (already exists): {title_en}")
            skipped += 1
            continue

        starts_at_utc = local_to_utc_iso(ev["iso_local"])
        when_human = local_human(ev["iso_local"])
        description_json = build_description(
            titles=ev["titles"],
            bodies=ev["bodies"],
            when_local_label=when_human,
            venue=ev["venue_short"],
            source_url=ev["source_url"],
            source_label=ev["source_label"],
        )

        editorial_pitch = ev["bodies"]["en"][:200]

        payload = {
            "title": title_en,
            "description_json": description_json,
            "starts_at": starts_at_utc,
            "duration_minutes": ev["duration_minutes"],
            "is_online": False,
            "is_free": ev["is_free"],
            "price": ev["price"],
            "currency": ev["currency"],
            "country": "CZ",
            "city": "Prague",
            "city_id": PRAGUE_CITY_ID,
            "address": ev["address"],
            "category_id": CAT[ev["category"]],
            "organizer_id": SYSTEM_ORGANIZER_ID,
            "is_private": False,
            "is_system": True,
            "source_url": ev["source_url"],
            "partner_name": ev["partner_name"],
            "partner_url": ev["partner_url"],
            "editorial_pitch": editorial_pitch,
            "editorial_status": "published",
            "status": "published",
            "languages": ev["languages"],
        }

        row = insert_event(supabase_url=supabase_url, key=key, payload=payload)
        if row:
            inserted += 1
            print(f"[+] {title_en}  ->  {row['id']}")
        else:
            print(f"[!] failed: {title_en}")

    print(f"\nDone: inserted={inserted}, skipped={skipped}, total_attempted={len(EVENTS)}")


if __name__ == "__main__":
    main()
