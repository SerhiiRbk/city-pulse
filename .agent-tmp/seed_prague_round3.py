#!/usr/bin/env python3
"""
Seed 30 system events in Prague for May 22 – June 30, 2026 (Round 3).

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
  exec(open('.agent-tmp/seed_prague_round3.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
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
    # 1. Metronome Prague 2026 — Day 1
    {
        "iso_local": "2026-06-19 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Letiště Letňany, Prague 18",
        "venue_short": "Letňany Airport",
        "lat": 50.1280,
        "lng": 14.5160,
        "is_free": False,
        "price": 1990,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.metronomefestival.cz/en",
        "source_label": "metronomefestival.cz",
        "photos": ["https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80"],
        "titles": {
            "en": "Metronome Prague 2026 — Day 1",
            "cs": "Metronome Prague 2026 — 1. den",
            "de": "Metronome Prague 2026 — Tag 1",
            "ru": "Metronome Prague 2026 — день 1",
            "uk": "Metronome Prague 2026 — день 1",
        },
        "bodies": {
            "en": "Opening day of Metronome Prague at Letňany Airport featuring Nick Cave & The Bad Seeds and Sting. Three stages, food court, and art installations across the airfield.",
            "cs": "Zahajovací den festivalu Metronome Prague na letišti Letňany s Nick Cave & The Bad Seeds a Stingem. Tři pódia, food court a umělecké instalace po celém letišti.",
            "de": "Eröffnungstag des Metronome Prague am Flughafen Letňany mit Nick Cave & The Bad Seeds und Sting. Drei Bühnen, Food Court und Kunstinstallationen auf dem Flugfeld.",
            "ru": "Первый день фестиваля Metronome Prague на аэродроме Летняны — Nick Cave & The Bad Seeds и Sting. Три сцены, фуд-корт и арт-инсталляции по всему лётному полю.",
            "uk": "Перший день фестивалю Metronome Prague на аеродромі Летняни — Nick Cave & The Bad Seeds та Sting. Три сцени, фуд-корт та арт-інсталяції по всьому льотному полю.",
        },
    },
    # 2. Metronome Prague 2026 — Day 2
    {
        "iso_local": "2026-06-20 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Letiště Letňany, Prague 18",
        "venue_short": "Letňany Airport",
        "lat": 50.1280,
        "lng": 14.5160,
        "is_free": False,
        "price": 1990,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.metronomefestival.cz/en",
        "source_label": "metronomefestival.cz",
        "photos": ["https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80"],
        "titles": {
            "en": "Metronome Prague 2026 — Day 2",
            "cs": "Metronome Prague 2026 — 2. den",
            "de": "Metronome Prague 2026 — Tag 2",
            "ru": "Metronome Prague 2026 — день 2",
            "uk": "Metronome Prague 2026 — день 2",
        },
        "bodies": {
            "en": "Day two of Metronome Prague with Tom Odell, Lykke Li and electronic acts on the night stage. Daytime workshops, vinyl market, and a dedicated kids' zone.",
            "cs": "Druhý den Metronome Prague s Tomem Odellem, Lykke Li a elektronickými akty na noční scéně. Denní workshopy, vinylový trh a dětská zóna.",
            "de": "Tag zwei des Metronome Prague mit Tom Odell, Lykke Li und Electronic-Acts auf der Nachtbühne. Tagesworkshops, Vinyl-Markt und Kinderzone.",
            "ru": "Второй день Metronome Prague — Tom Odell, Lykke Li и электронные акты на ночной сцене. Дневные воркшопы, виниловый маркет и детская зона.",
            "uk": "Другий день Metronome Prague — Tom Odell, Lykke Li та електронні акти на нічній сцені. Денні воркшопи, вініловий маркет і дитяча зона.",
        },
    },
    # 3. Metronome Prague 2026 — Day 3
    {
        "iso_local": "2026-06-21 14:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Letiště Letňany, Prague 18",
        "venue_short": "Letňany Airport",
        "lat": 50.1280,
        "lng": 14.5160,
        "is_free": False,
        "price": 1990,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.metronomefestival.cz/en",
        "source_label": "metronomefestival.cz",
        "photos": ["https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80"],
        "titles": {
            "en": "Metronome Prague 2026 — Day 3",
            "cs": "Metronome Prague 2026 — 3. den",
            "de": "Metronome Prague 2026 — Tag 3",
            "ru": "Metronome Prague 2026 — день 3",
            "uk": "Metronome Prague 2026 — день 3",
        },
        "bodies": {
            "en": "Closing day of Metronome Prague 2026 — surprise headliner announcement, acoustic sessions at the hangar stage, and a grand fireworks finale over the airfield at midnight.",
            "cs": "Závěrečný den Metronome Prague 2026 — překvapivý headliner, akustické sessions na hangárové scéně a velkolepý ohňostroj nad letištěm o půlnoci.",
            "de": "Abschlusstag des Metronome Prague 2026 — Überraschungs-Headliner, Akustik-Sessions auf der Hangarbühne und großes Feuerwerk über dem Flugfeld um Mitternacht.",
            "ru": "Заключительный день Metronome Prague 2026 — сюрприз-хедлайнер, акустические сессии на ангарной сцене и грандиозный фейерверк над лётным полем в полночь.",
            "uk": "Заключний день Metronome Prague 2026 — сюрприз-хедлайнер, акустичні сесії на ангарній сцені та грандіозний феєрверк над льотним полем опівночі.",
        },
    },
    # 4. Prague Spring Festival — Dvořák's New World
    {
        "iso_local": "2026-05-23 20:00",
        "duration_minutes": 105,
        "category": "music",
        "address": "Rudolfinum, Dvořákova síň, Alšovo nábřeží 12, Prague 1",
        "venue_short": "Dvořák Hall, Rudolfinum",
        "lat": 50.0895,
        "lng": 14.4145,
        "is_free": False,
        "price": 1490,
        "currency": "CZK",
        "languages": ["cs", "en", "de"],
        "source_url": "https://festival.cz/en/program",
        "source_label": "festival.cz",
        "photos": ["https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80"],
        "titles": {
            "en": "Prague Spring Festival — Dvořák's New World Symphony",
            "cs": "Pražské jaro — Dvořákova Novosvětská",
            "de": "Prager Frühling — Dvořáks Sinfonie «Aus der Neuen Welt»",
            "ru": "«Пражская весна» — Симфония Дворжака «Из Нового Света»",
            "uk": "«Празька весна» — Симфонія Дворжака «З Нового Світу»",
        },
        "bodies": {
            "en": "The Czech Philharmonic performs Dvořák's Symphony No. 9 'From the New World' in the neo-Renaissance Dvořák Hall of the Rudolfinum as part of the 81st Prague Spring International Music Festival.",
            "cs": "Česká filharmonie uvádí Dvořákovu 9. symfonii «Z Nového světa» v neorenesanční Dvořákově síni Rudolfina v rámci 81. ročníku festivalu Pražské jaro.",
            "de": "Die Tschechische Philharmonie spielt Dvořáks 9. Sinfonie «Aus der Neuen Welt» im neorenaissance Dvořák-Saal des Rudolfinums beim 81. Prager Frühling.",
            "ru": "Чешская филармония исполняет 9-ю симфонию Дворжака «Из Нового Света» в неоренессансном зале Дворжака Рудольфинума в рамках 81-го фестиваля «Пражская весна».",
            "uk": "Чеська філармонія виконує 9-ту симфонію Дворжака «З Нового Світу» в неоренесансній залі Дворжака Рудольфінума в рамках 81-го фестивалю «Празька весна».",
        },
    },
    # 5. Prague Spring Festival — Piano Recital
    {
        "iso_local": "2026-05-26 19:30",
        "duration_minutes": 90,
        "category": "music",
        "address": "Rudolfinum, Dvořákova síň, Alšovo nábřeží 12, Prague 1",
        "venue_short": "Dvořák Hall, Rudolfinum",
        "lat": 50.0895,
        "lng": 14.4145,
        "is_free": False,
        "price": 1290,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://festival.cz/en/program",
        "source_label": "festival.cz",
        "photos": ["https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80"],
        "titles": {
            "en": "Prague Spring Festival — Piano Recital",
            "cs": "Pražské jaro — klavírní recitál",
            "de": "Prager Frühling — Klavierrezital",
            "ru": "«Пражская весна» — фортепианный концерт",
            "uk": "«Празька весна» — фортепіанний концерт",
        },
        "bodies": {
            "en": "An evening piano recital at the Rudolfinum featuring works by Chopin, Liszt, and Janáček. Part of the Prague Spring International Music Festival programme.",
            "cs": "Večerní klavírní recitál v Rudolfinu s díly Chopina, Liszta a Janáčka. Součást programu Mezinárodního hudebního festivalu Pražské jaro.",
            "de": "Ein Klavierabend im Rudolfinum mit Werken von Chopin, Liszt und Janáček. Teil des Programms des Prager Frühling Musikfestivals.",
            "ru": "Вечерний фортепианный концерт в Рудольфинуме — произведения Шопена, Листа и Яначека. Часть программы фестиваля «Пражская весна».",
            "uk": "Вечірній фортепіанний концерт у Рудольфінумі — твори Шопена, Ліста та Яначека. Частина програми фестивалю «Празька весна».",
        },
    },
    # 6. Khamoro World Roma Festival
    {
        "iso_local": "2026-05-24 18:00",
        "duration_minutes": 300,
        "category": "music",
        "address": "Divadlo Archa, Na Poříčí 26, Prague 1",
        "venue_short": "Divadlo Archa & various venues",
        "lat": 50.0870,
        "lng": 14.4210,
        "is_free": False,
        "price": 450,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.khamoro.cz/en",
        "source_label": "khamoro.cz",
        "photos": ["https://images.unsplash.com/photo-1504680177321-2e4f7a712b7d?w=800&q=80"],
        "titles": {
            "en": "Khamoro World Roma Festival 2026",
            "cs": "Khamoro — Světový romský festival 2026",
            "de": "Khamoro — Welt-Roma-Festival 2026",
            "ru": "Khamoro — Всемирный фестиваль ромской культуры 2026",
            "uk": "Khamoro — Всесвітній фестиваль ромської культури 2026",
        },
        "bodies": {
            "en": "The world's largest Romani culture festival returns to Prague with concerts, dance performances, film screenings, and a colourful parade through the Old Town. Multiple venues across the city.",
            "cs": "Největší světový festival romské kultury se vrací do Prahy — koncerty, taneční vystoupení, filmové projekce a barevný průvod Starým Městem. Více míst po celé Praze.",
            "de": "Das weltweit größte Roma-Kulturfestival kehrt nach Prag zurück — Konzerte, Tanzaufführungen, Filmvorführungen und eine bunte Parade durch die Altstadt. Mehrere Veranstaltungsorte.",
            "ru": "Крупнейший в мире фестиваль ромской культуры возвращается в Прагу — концерты, танцевальные шоу, кинопоказы и красочный парад по Старому Городу. Несколько площадок по всему городу.",
            "uk": "Найбільший у світі фестиваль ромської культури повертається до Праги — концерти, танцювальні шоу, кінопокази та барвистий парад Старим Містом. Кілька майданчиків по всьому місту.",
        },
    },
    # 7. Prague Beer Festival at Náplavka
    {
        "iso_local": "2026-06-05 15:00",
        "duration_minutes": 420,
        "category": "craft-beer",
        "address": "Náplavka, Rašínovo nábřeží, Prague 2",
        "venue_short": "Náplavka Embankment",
        "lat": 50.0740,
        "lng": 14.4150,
        "is_free": False,
        "price": 350,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.pivnifestival.cz",
        "source_label": "pivnifestival.cz",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Prague Beer Festival at Náplavka",
            "cs": "Pivní festival Praha na Náplavce",
            "de": "Prager Bierfestival an der Náplavka",
            "ru": "Пражский пивной фестиваль на Наплавке",
            "uk": "Празький пивний фестиваль на Наплавці",
        },
        "bodies": {
            "en": "Three-day craft beer festival on the Vltava embankment with 40+ Czech microbreweries, street food stalls, and live music. Entry includes a tasting glass and three tokens.",
            "cs": "Třídenní festival řemeslného piva na vltavské náplavce — 40+ českých minipivovarů, street food a živá hudba. Vstupné zahrnuje degustační sklenici a tři žetony.",
            "de": "Dreitägiges Craft-Beer-Festival am Moldau-Kai mit 40+ tschechischen Mikrobrauereien, Streetfood und Live-Musik. Eintritt inkl. Verkostungsglas und drei Wertmarken.",
            "ru": "Трёхдневный фестиваль крафтового пива на набережной Влтавы — 40+ чешских мини-пивоварен, стритфуд и живая музыка. Входной билет включает дегустационный бокал и три жетона.",
            "uk": "Триденний фестиваль крафтового пива на набережній Влтави — 40+ чеських міні-пивоварень, стрітфуд і жива музика. Вхідний квиток включає дегустаційний келих і три жетони.",
        },
    },
    # 8. Paul Simon at Congress Centre
    {
        "iso_local": "2026-05-28 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "Prague Congress Centre, 5. května 65, Prague 4",
        "venue_short": "Prague Congress Centre",
        "lat": 50.0610,
        "lng": 14.4290,
        "is_free": False,
        "price": 2990,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.kfrfrankfurt.com/paul-simon-tour-2026",
        "source_label": "kfrfrankfurt.com",
        "photos": ["https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80"],
        "titles": {
            "en": "Paul Simon — Live at Prague Congress Centre",
            "cs": "Paul Simon — koncert v Kongresovém centru Praha",
            "de": "Paul Simon — Live im Prager Kongresszentrum",
            "ru": "Paul Simon — концерт в Конгресс-центре Праги",
            "uk": "Paul Simon — концерт у Конгрес-центрі Праги",
        },
        "bodies": {
            "en": "Legendary singer-songwriter Paul Simon performs a career-spanning set at the Prague Congress Centre. Expect classics from Graceland, Still Crazy After All These Years, and Simon & Garfunkel.",
            "cs": "Legendární písničkář Paul Simon vystoupí v Kongresovém centru Praha s průřezem celé kariéry — od Graceland přes Still Crazy After All These Years po Simon & Garfunkel.",
            "de": "Der legendäre Singer-Songwriter Paul Simon spielt ein karriereumspannendes Set im Prager Kongresszentrum — Klassiker von Graceland, Still Crazy After All These Years und Simon & Garfunkel.",
            "ru": "Легендарный автор-исполнитель Paul Simon выступает в Конгресс-центре Праги с программой, охватывающей всю карьеру — от Graceland до Simon & Garfunkel.",
            "uk": "Легендарний автор-виконавець Paul Simon виступає в Конгрес-центрі Праги з програмою, що охоплює всю кар'єру — від Graceland до Simon & Garfunkel.",
        },
    },
    # 9. Eric Clapton at O2 Arena
    {
        "iso_local": "2026-06-10 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "O2 Arena, Českomoravská 2345/17, Prague 9",
        "venue_short": "O2 Arena",
        "lat": 50.1040,
        "lng": 14.4900,
        "is_free": False,
        "price": 2490,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.o2arena.cz/en",
        "source_label": "o2arena.cz",
        "photos": ["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80"],
        "titles": {
            "en": "Eric Clapton — Live at O2 Arena Prague",
            "cs": "Eric Clapton — koncert v O2 areně Praha",
            "de": "Eric Clapton — Live in der O2 Arena Prag",
            "ru": "Eric Clapton — концерт в O2 Arena Прага",
            "uk": "Eric Clapton — концерт в O2 Arena Прага",
        },
        "bodies": {
            "en": "Guitar legend Eric Clapton brings his farewell tour to Prague's O2 Arena. A night of blues, rock, and timeless hits including Layla, Wonderful Tonight, and Tears in Heaven.",
            "cs": "Kytarová legenda Eric Clapton přiváží své rozlučkové turné do pražské O2 areny. Večer blues, rocku a nadčasových hitů — Layla, Wonderful Tonight, Tears in Heaven.",
            "de": "Gitarrenlegende Eric Clapton bringt seine Abschiedstournee in die O2 Arena Prag. Ein Abend voller Blues, Rock und zeitloser Hits — Layla, Wonderful Tonight, Tears in Heaven.",
            "ru": "Гитарная легенда Eric Clapton привозит прощальный тур в O2 Arena Праги. Вечер блюза, рока и вечных хитов — Layla, Wonderful Tonight, Tears in Heaven.",
            "uk": "Гітарна легенда Eric Clapton привозить прощальний тур до O2 Arena Праги. Вечір блюзу, року та вічних хітів — Layla, Wonderful Tonight, Tears in Heaven.",
        },
    },
    # 10. Kunsthalle Praha — William Kentridge Exhibition
    {
        "iso_local": "2026-06-01 10:00",
        "duration_minutes": 480,
        "category": "museums",
        "address": "Kunsthalle Praha, Klárov 5, Prague 1",
        "venue_short": "Kunsthalle Praha",
        "lat": 50.0880,
        "lng": 14.4070,
        "is_free": False,
        "price": 300,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.kunsthallepraha.org/en",
        "source_label": "kunsthallepraha.org",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {
            "en": "Kunsthalle Praha — William Kentridge Exhibition",
            "cs": "Kunsthalle Praha — výstava Williama Kentridge",
            "de": "Kunsthalle Prag — William-Kentridge-Ausstellung",
            "ru": "Kunsthalle Praha — выставка Уильяма Кентриджа",
            "uk": "Kunsthalle Praha — виставка Вільяма Кентріджа",
        },
        "bodies": {
            "en": "A major retrospective of South African artist William Kentridge at Kunsthalle Praha — animated drawings, tapestries, and immersive video installations exploring memory, time, and colonialism.",
            "cs": "Velká retrospektiva jihoafrického umělce Williama Kentridge v Kunsthalle Praha — animované kresby, tapisérie a imerzivní videoinstalace zkoumající paměť, čas a kolonialismus.",
            "de": "Eine große Retrospektive des südafrikanischen Künstlers William Kentridge in der Kunsthalle Prag — animierte Zeichnungen, Tapisserien und immersive Videoinstallationen zu Erinnerung, Zeit und Kolonialismus.",
            "ru": "Большая ретроспектива южноафриканского художника Уильяма Кентриджа в Kunsthalle Praha — анимированные рисунки, гобелены и иммерсивные видеоинсталляции о памяти, времени и колониализме.",
            "uk": "Велика ретроспектива південноафриканського художника Вільяма Кентріджа в Kunsthalle Praha — анімовані малюнки, гобелени та імерсивні відеоінсталяції про пам'ять, час і колоніалізм.",
        },
    },
    # 11. Signal Festival Preview — Light Art Walk
    {
        "iso_local": "2026-06-14 21:00",
        "duration_minutes": 180,
        "category": "museums",
        "address": "Staré Město (Old Town), Prague 1",
        "venue_short": "Old Town, Prague",
        "lat": 50.0870,
        "lng": 14.4210,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.signalfestival.com/en",
        "source_label": "signalfestival.com",
        "photos": ["https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800&q=80"],
        "titles": {
            "en": "Signal Festival Preview — Light Art Walk",
            "cs": "Signal Festival Preview — procházka světelným uměním",
            "de": "Signal Festival Preview — Lichtkunst-Spaziergang",
            "ru": "Signal Festival Preview — прогулка по световому искусству",
            "uk": "Signal Festival Preview — прогулянка світловим мистецтвом",
        },
        "bodies": {
            "en": "A preview evening of Prague's Signal light-art festival with three installations in the Old Town — projection mapping on the Klementinum wall, an interactive LED tunnel, and a kinetic light sculpture at Mariánské náměstí.",
            "cs": "Předpremiérový večer pražského festivalu Signal se třemi instalacemi ve Starém Městě — videomapping na zdi Klementina, interaktivní LED tunel a kinetická světelná socha na Mariánském náměstí.",
            "de": "Ein Vorschau-Abend des Prager Signal-Lichtkunstfestivals mit drei Installationen in der Altstadt — Videomapping an der Klementinum-Wand, ein interaktiver LED-Tunnel und eine kinetische Lichtskulptur am Mariánské náměstí.",
            "ru": "Превью-вечер пражского фестиваля Signal с тремя инсталляциями в Старом Городе — видеомэппинг на стене Клементинума, интерактивный LED-тоннель и кинетическая световая скульптура на Марианской площади.",
            "uk": "Прев'ю-вечір празького фестивалю Signal із трьома інсталяціями у Старому Місті — відеомеппінг на стіні Клементинума, інтерактивний LED-тунель і кінетична світлова скульптура на Маріанській площі.",
        },
    },
    # 12. Prague Food Festival
    {
        "iso_local": "2026-05-23 11:00",
        "duration_minutes": 540,
        "category": "food-tours",
        "address": "Výstaviště Praha, Prague 7",
        "venue_short": "Výstaviště, Holešovice",
        "lat": 50.1050,
        "lng": 14.4320,
        "is_free": False,
        "price": 590,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.praguefoodfestival.cz",
        "source_label": "praguefoodfestival.cz",
        "photos": ["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80"],
        "titles": {
            "en": "Prague Food Festival 2026",
            "cs": "Prague Food Festival 2026",
            "de": "Prague Food Festival 2026",
            "ru": "Prague Food Festival 2026",
            "uk": "Prague Food Festival 2026",
        },
        "bodies": {
            "en": "Three-day gastronomy event at Výstaviště featuring top Czech restaurants, cooking demos by Michelin-starred chefs, wine pavilion, and a farmers' market. Entry includes a tasting plate.",
            "cs": "Třídenní gastronomická akce na Výstavišti — špičkové české restaurace, cooking show michelinských šéfkuchařů, vinný pavilon a farmářský trh. Vstupné zahrnuje degustační talíř.",
            "de": "Dreitägiges Gastronomieevent auf dem Výstaviště — Top-Restaurants, Kochshows von Michelin-Köchen, Weinpavillon und Bauernmarkt. Eintritt inkl. Verkostungsteller.",
            "ru": "Трёхдневный гастрономический фестиваль на Výstaviště — лучшие чешские рестораны, кулинарные шоу мишленовских шефов, винный павильон и фермерский рынок. Входной билет включает дегустационную тарелку.",
            "uk": "Триденний гастрономічний фестиваль на Výstaviště — найкращі чеські ресторани, кулінарні шоу мішленівських шефів, винний павільйон і фермерський ринок. Вхідний квиток включає дегустаційну тарілку.",
        },
    },
    # 13. Night of Museums
    {
        "iso_local": "2026-06-06 18:00",
        "duration_minutes": 420,
        "category": "museums",
        "address": "Various museums across Prague",
        "venue_short": "Museums across Prague",
        "lat": 50.0790,
        "lng": 14.4300,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.prazskamuzejninoc.cz",
        "source_label": "prazskamuzejninoc.cz",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Night of Museums — Prague 2026",
            "cs": "Pražská muzejní noc 2026",
            "de": "Nacht der Museen — Prag 2026",
            "ru": "Ночь музеев — Прага 2026",
            "uk": "Ніч музеїв — Прага 2026",
        },
        "bodies": {
            "en": "Over 60 Prague museums, galleries, and cultural institutions open their doors for free from 18:00 to 01:00. Special programmes, guided tours, concerts, and shuttle buses between venues.",
            "cs": "Přes 60 pražských muzeí, galerií a kulturních institucí otevírá zdarma od 18:00 do 01:00. Speciální programy, komentované prohlídky, koncerty a kyvadlové autobusy mezi místy.",
            "de": "Über 60 Prager Museen, Galerien und Kultureinrichtungen öffnen kostenlos von 18:00 bis 01:00. Sonderprogramme, Führungen, Konzerte und Shuttlebusse zwischen den Orten.",
            "ru": "Более 60 пражских музеев, галерей и культурных учреждений открывают двери бесплатно с 18:00 до 01:00. Специальные программы, экскурсии, концерты и шаттлы между площадками.",
            "uk": "Понад 60 празьких музеїв, галерей та культурних установ відкривають двері безкоштовно з 18:00 до 01:00. Спеціальні програми, екскурсії, концерти та шатли між майданчиками.",
        },
    },
    # 14. Open-Air Cinema at Kasárna Karlín
    {
        "iso_local": "2026-06-12 21:00",
        "duration_minutes": 120,
        "category": "cinema",
        "address": "Kasárna Karlín, Prvního pluku 20/2, Prague 8",
        "venue_short": "Kasárna Karlín",
        "lat": 50.0920,
        "lng": 14.4550,
        "is_free": False,
        "price": 150,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.kasarnakarlin.cz",
        "source_label": "kasarnakarlin.cz",
        "photos": ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"],
        "titles": {
            "en": "Open-Air Cinema at Kasárna Karlín",
            "cs": "Letní kino v Kasárnách Karlín",
            "de": "Open-Air-Kino in der Kasárna Karlín",
            "ru": "Кинотеатр под открытым небом в Kasárna Karlín",
            "uk": "Кінотеатр просто неба в Kasárna Karlín",
        },
        "bodies": {
            "en": "Outdoor film screening in the courtyard of the former Karlín barracks. Indie European cinema with English subtitles, bean bags, craft beer bar, and food trucks. Doors open at 20:00.",
            "cs": "Venkovní filmová projekce na nádvoří bývalých karlínských kasáren. Nezávislé evropské kino s anglickými titulky, sedací vaky, craft beer bar a food trucky. Otevřeno od 20:00.",
            "de": "Freiluft-Filmvorführung im Hof der ehemaligen Karlíner Kaserne. Europäisches Indie-Kino mit englischen Untertiteln, Sitzsäcke, Craft-Beer-Bar und Food Trucks. Einlass ab 20:00.",
            "ru": "Кинопоказ под открытым небом во дворе бывших карлинских казарм. Европейское независимое кино с английскими субтитрами, бинбэги, крафтовый бар и фуд-траки. Двери открываются в 20:00.",
            "uk": "Кінопоказ просто неба у дворі колишніх карлінських казарм. Європейське незалежне кіно з англійськими субтитрами, бінбеги, крафтовий бар і фуд-траки. Двері відкриваються о 20:00.",
        },
    },
    # 15. Jazz on the Old Town Square
    {
        "iso_local": "2026-06-07 18:00",
        "duration_minutes": 180,
        "category": "music",
        "address": "Staroměstské náměstí, Prague 1",
        "venue_short": "Old Town Square",
        "lat": 50.0870,
        "lng": 14.4210,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.bohemiajazzfest.cz/en",
        "source_label": "bohemiajazzfest.cz",
        "photos": ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80"],
        "titles": {
            "en": "Jazz on the Old Town Square",
            "cs": "Jazz na Staroměstském náměstí",
            "de": "Jazz auf dem Altstädter Ring",
            "ru": "Джаз на Староместской площади",
            "uk": "Джаз на Староміській площі",
        },
        "bodies": {
            "en": "Free open-air jazz concert on Prague's Old Town Square as part of Bohemia JazzFest. International quartet performs standards and original compositions under the Astronomical Clock.",
            "cs": "Bezplatný open-air jazzový koncert na Staroměstském náměstí v rámci Bohemia JazzFest. Mezinárodní kvartet hraje standardy i autorské skladby pod Orlojem.",
            "de": "Kostenloses Open-Air-Jazzkonzert auf dem Altstädter Ring im Rahmen des Bohemia JazzFest. Internationales Quartett spielt Standards und Eigenkompositionen unter der Astronomischen Uhr.",
            "ru": "Бесплатный open-air джазовый концерт на Староместской площади в рамках Bohemia JazzFest. Международный квартет играет стандарты и авторские композиции под Орлоем.",
            "uk": "Безкоштовний open-air джазовий концерт на Староміській площі в рамках Bohemia JazzFest. Міжнародний квартет грає стандарти та авторські композиції під Орлоєм.",
        },
    },
    # 16. Vyšehrad Summer Music — Chamber Concert
    {
        "iso_local": "2026-06-15 19:00",
        "duration_minutes": 90,
        "category": "music",
        "address": "Bazilika sv. Petra a Pavla, Vyšehrad, Prague 2",
        "venue_short": "Basilica of St Peter and Paul, Vyšehrad",
        "lat": 50.0650,
        "lng": 14.4180,
        "is_free": False,
        "price": 590,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.praha-vysehrad.cz",
        "source_label": "praha-vysehrad.cz",
        "photos": ["https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80"],
        "titles": {
            "en": "Vyšehrad Summer Music — Chamber Concert",
            "cs": "Vyšehradská letní hudba — komorní koncert",
            "de": "Vyšehrad Sommermusik — Kammerkonzert",
            "ru": "Летняя музыка Вышеграда — камерный концерт",
            "uk": "Літня музика Вишеграда — камерний концерт",
        },
        "bodies": {
            "en": "Chamber ensemble performs Dvořák and Smetana in the neo-Gothic Basilica of St Peter and Paul at Vyšehrad. Stunning acoustics and views of the Vltava valley at sunset.",
            "cs": "Komorní soubor hraje Dvořáka a Smetanu v novogotické Bazilice sv. Petra a Pavla na Vyšehradě. Úchvatná akustika a výhledy na údolí Vltavy při západu slunce.",
            "de": "Kammerensemble spielt Dvořák und Smetana in der neugotischen Basilika St. Peter und Paul auf dem Vyšehrad. Atemberaubende Akustik und Blick ins Moldautal bei Sonnenuntergang.",
            "ru": "Камерный ансамбль исполняет Дворжака и Сметану в неоготической базилике Св. Петра и Павла на Вышеграде. Потрясающая акустика и виды на долину Влтавы на закате.",
            "uk": "Камерний ансамбль виконує Дворжака та Сметану в неоготичній базиліці Св. Петра і Павла на Вишеграді. Вражаюча акустика та краєвиди на долину Влтави на заході сонця.",
        },
    },
    # 17. Prague Pride Warm-Up Party
    {
        "iso_local": "2026-06-28 20:00",
        "duration_minutes": 300,
        "category": "dancing",
        "address": "Kasárna Karlín, Prvního pluku 20/2, Prague 8",
        "venue_short": "Kasárna Karlín",
        "lat": 50.0920,
        "lng": 14.4550,
        "is_free": False,
        "price": 250,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.praguepride.cz/en",
        "source_label": "praguepride.cz",
        "photos": ["https://images.unsplash.com/photo-1562887250-9a52d844ad30?w=800&q=80"],
        "titles": {
            "en": "Prague Pride Warm-Up Party",
            "cs": "Prague Pride Warm-Up Party",
            "de": "Prague Pride Warm-Up Party",
            "ru": "Prague Pride Warm-Up Party",
            "uk": "Prague Pride Warm-Up Party",
        },
        "bodies": {
            "en": "Kick off Prague Pride week early with a warm-up dance party at Kasárna Karlín. DJs, drag performances, open-air dance floor, and rainbow cocktails. All are welcome.",
            "cs": "Zahajte týden Prague Pride předčasně na warm-up taneční party v Kasárnách Karlín. DJs, drag show, venkovní taneční parket a duhové koktejly. Všichni jsou vítáni.",
            "de": "Starten Sie die Prague-Pride-Woche früh mit einer Warm-Up-Tanzparty in der Kasárna Karlín. DJs, Drag-Shows, Open-Air-Tanzfläche und Regenbogen-Cocktails. Alle willkommen.",
            "ru": "Начните неделю Prague Pride заранее на warm-up танцевальной вечеринке в Kasárna Karlín. DJ-сеты, дрэг-шоу, танцпол под открытым небом и радужные коктейли. Все приглашены.",
            "uk": "Розпочніть тиждень Prague Pride завчасно на warm-up танцювальній вечірці в Kasárna Karlín. DJ-сети, дрег-шоу, танцпол просто неба та веселкові коктейлі. Усі запрошені.",
        },
    },
    # 18. Craft Beer Walk — Žižkov Pubs
    {
        "iso_local": "2026-05-30 18:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "Meeting point: Jiřího z Poděbrad metro, Prague 3",
        "venue_short": "Žižkov, Prague 3",
        "lat": 50.0870,
        "lng": 14.4530,
        "is_free": False,
        "price": 490,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.praguebeertours.com",
        "source_label": "praguebeertours.com",
        "photos": ["https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Walk — Žižkov Pubs",
            "cs": "Pivní procházka — žižkovské hospody",
            "de": "Craft-Beer-Walk — Žižkov-Kneipen",
            "ru": "Крафтовая пивная прогулка — пабы Жижкова",
            "uk": "Крафтова пивна прогулянка — паби Жижкова",
        },
        "bodies": {
            "en": "Guided pub crawl through Prague's legendary Žižkov district — four craft beer stops, local snacks at each, and stories about the neighbourhood's bohemian history. English-speaking guide.",
            "cs": "Komentovaná procházka po hospodách legendárního Žižkova — čtyři zastávky na řemeslné pivo, lokální občerstvení a příběhy o bohémské historii čtvrti. Průvodce v angličtině.",
            "de": "Geführte Kneipentour durch Prags legendäres Žižkov — vier Craft-Beer-Stopps, lokale Snacks und Geschichten über die Bohème-Geschichte des Viertels. Englischsprachiger Guide.",
            "ru": "Экскурсия по пабам легендарного Жижкова — четыре остановки на крафтовое пиво, местные закуски и истории о богемном прошлом района. Гид на английском.",
            "uk": "Екскурсія пабами легендарного Жижкова — чотири зупинки на крафтове пиво, місцеві закуски та історії про богемне минуле району. Гід англійською.",
        },
    },
    # 19. Vegan Food Market at Manifesto
    {
        "iso_local": "2026-06-01 11:00",
        "duration_minutes": 420,
        "category": "food-tours",
        "address": "Manifesto Market Florenc, Na Florenci 23, Prague 1",
        "venue_short": "Manifesto Florenc",
        "lat": 50.0910,
        "lng": 14.4400,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.manifestomarket.com",
        "source_label": "manifestomarket.com",
        "photos": ["https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80"],
        "titles": {
            "en": "Vegan Food Market at Manifesto Florenc",
            "cs": "Veganský food market v Manifestu Florenc",
            "de": "Veganer Food Market im Manifesto Florenc",
            "ru": "Веганский фуд-маркет в Manifesto Florenc",
            "uk": "Веганський фуд-маркет у Manifesto Florenc",
        },
        "bodies": {
            "en": "All-day vegan food market at Manifesto Florenc with 15+ plant-based vendors, cooking workshops, and live acoustic music. Free entry, pay for food. Dog-friendly.",
            "cs": "Celodenní veganský food market v Manifestu Florenc — 15+ rostlinných stánků, kuchařské workshopy a živá akustická hudba. Vstup zdarma, jídlo za úplatu. Psi vítáni.",
            "de": "Ganztägiger veganer Food Market im Manifesto Florenc — 15+ pflanzliche Anbieter, Kochworkshops und Live-Akustikmusik. Eintritt frei, Essen kostenpflichtig. Hundefreundlich.",
            "ru": "Целодневный веганский фуд-маркет в Manifesto Florenc — 15+ растительных вендоров, кулинарные воркшопы и живая акустическая музыка. Вход свободный, еда за деньги. С собаками можно.",
            "uk": "Цілоденний веганський фуд-маркет у Manifesto Florenc — 15+ рослинних вендорів, кулінарні воркшопи та жива акустична музика. Вхід вільний, їжа за гроші. З собаками можна.",
        },
    },
    # 20. Letná Park Sunset Picnic
    {
        "iso_local": "2026-05-24 18:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Letná Park, Letenské sady, Prague 7",
        "venue_short": "Letná Park",
        "lat": 50.0970,
        "lng": 14.4200,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.meetup.com/prague-international-meetup",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Letná Park Sunset Picnic — International Meetup",
            "cs": "Piknik při západu slunce v Letenských sadech",
            "de": "Letná-Park Sonnenuntergangs-Picknick — Internationales Treffen",
            "ru": "Пикник на закате в парке Летна — международная встреча",
            "uk": "Пікнік на заході сонця в парку Летна — міжнародна зустріч",
        },
        "bodies": {
            "en": "Bring a blanket and something to share for a sunset picnic at Letná Park with views over Prague's bridges. Open to everyone — expats, locals, and visitors. BYO drinks and snacks.",
            "cs": "Přineste deku a něco k sdílení na piknik při západu slunce v Letenských sadech s výhledem na pražské mosty. Otevřeno všem — expati, místní i návštěvníci. Vlastní pití a svačiny.",
            "de": "Bringen Sie eine Decke und etwas zum Teilen zum Sonnenuntergangs-Picknick im Letná-Park mit Blick auf Prags Brücken. Offen für alle — Expats, Einheimische und Besucher. Getränke und Snacks mitbringen.",
            "ru": "Берите плед и что-нибудь вкусное на пикник при закате в парке Летна с видом на пражские мосты. Открыто для всех — экспаты, местные и гости города. Напитки и закуски с собой.",
            "uk": "Беріть плед і щось смачне на пікнік при заході сонця в парку Летна з видом на празькі мости. Відкрито для всіх — експати, місцеві та гості міста. Напої та закуски з собою.",
        },
    },
    # 21. CrossCafe Language Exchange
    {
        "iso_local": "2026-06-04 19:00",
        "duration_minutes": 120,
        "category": "networking",
        "address": "CrossCafe, Vinohradská 66, Prague 3",
        "venue_short": "CrossCafe Vinohrady",
        "lat": 50.0750,
        "lng": 14.4400,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs", "de", "ru"],
        "source_url": "https://www.meetup.com/prague-language-exchange",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80"],
        "titles": {
            "en": "CrossCafe Language Exchange — Vinohrady",
            "cs": "Jazyková výměna v CrossCafe — Vinohrady",
            "de": "CrossCafe Sprachaustausch — Vinohrady",
            "ru": "Языковой обмен в CrossCafe — Винограды",
            "uk": "Мовний обмін у CrossCafe — Виногради",
        },
        "bodies": {
            "en": "Weekly language exchange at CrossCafe Vinohrady. Tables organized by language — Czech, English, German, Russian, and more. Free entry, just buy a drink. All levels welcome.",
            "cs": "Týdenní jazyková výměna v CrossCafe Vinohrady. Stoly podle jazyků — čeština, angličtina, němčina, ruština a další. Vstup zdarma, stačí si koupit nápoj. Všechny úrovně vítány.",
            "de": "Wöchentlicher Sprachaustausch im CrossCafe Vinohrady. Tische nach Sprachen — Tschechisch, Englisch, Deutsch, Russisch u.a. Eintritt frei, einfach ein Getränk bestellen. Alle Niveaus willkommen.",
            "ru": "Еженедельный языковой обмен в CrossCafe Винограды. Столы по языкам — чешский, английский, немецкий, русский и другие. Вход свободный, просто закажите напиток. Любой уровень.",
            "uk": "Щотижневий мовний обмін у CrossCafe Виногради. Столи за мовами — чеська, англійська, німецька, російська та інші. Вхід вільний, просто замовте напій. Будь-який рівень.",
        },
    },
    # 22. Board Games Night at Palác Akropolis
    {
        "iso_local": "2026-06-04 19:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Palác Akropolis, Kubelíkova 27, Prague 3",
        "venue_short": "Palác Akropolis, Žižkov",
        "lat": 50.0870,
        "lng": 14.4530,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.palacakropolis.cz",
        "source_label": "palacakropolis.cz",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games Night at Palác Akropolis",
            "cs": "Deskovky v Paláci Akropolis",
            "de": "Brettspielabend im Palác Akropolis",
            "ru": "Вечер настольных игр в Palác Akropolis",
            "uk": "Вечір настільних ігор у Palác Akropolis",
        },
        "bodies": {
            "en": "Bring your own games or pick from the house collection at Palác Akropolis café bar. Casual, English-friendly atmosphere. Great for meeting new people over Catan, Codenames, or chess.",
            "cs": "Přineste vlastní hry nebo si vyberte z místní sbírky v kavárně Paláce Akropolis. Neformální atmosféra, angličtina vítána. Skvělé pro seznámení nad Catanem, Krycími jmény nebo šachy.",
            "de": "Bringen Sie eigene Spiele mit oder wählen Sie aus der Haussammlung in der Café-Bar des Palác Akropolis. Lockere, englischfreundliche Atmosphäre. Ideal zum Kennenlernen bei Catan, Codenames oder Schach.",
            "ru": "Приносите свои игры или выбирайте из коллекции кафе-бара Palác Akropolis. Непринуждённая атмосфера, английский приветствуется. Отличный способ познакомиться за Catan, Codenames или шахматами.",
            "uk": "Приносьте свої ігри або обирайте з колекції кафе-бару Palác Akropolis. Невимушена атмосфера, англійська вітається. Чудовий спосіб познайомитися за Catan, Codenames або шахами.",
        },
    },
    # 23. Salsa Night at Lucerna Music Bar
    {
        "iso_local": "2026-06-06 21:00",
        "duration_minutes": 240,
        "category": "dancing",
        "address": "Lucerna Music Bar, Vodičkova 36, Prague 1",
        "venue_short": "Lucerna Music Bar",
        "lat": 50.0810,
        "lng": 14.4250,
        "is_free": False,
        "price": 200,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.musicbar.cz",
        "source_label": "musicbar.cz",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Salsa Night at Lucerna Music Bar",
            "cs": "Salsa Night v Lucerna Music Baru",
            "de": "Salsa-Nacht in der Lucerna Music Bar",
            "ru": "Сальса-вечер в Lucerna Music Bar",
            "uk": "Сальса-вечір у Lucerna Music Bar",
        },
        "bodies": {
            "en": "Weekly salsa party at the iconic Lucerna Music Bar. Beginner lesson at 21:00, open dancing from 22:00 until late. Live DJ spinning Cuban and Colombian rhythms. No partner needed.",
            "cs": "Týdenní salsa party v ikonickém Lucerna Music Baru. Lekce pro začátečníky ve 21:00, volný tanec od 22:00 do pozdních hodin. Živý DJ s kubánskými a kolumbijskými rytmy. Partner není potřeba.",
            "de": "Wöchentliche Salsa-Party in der ikonischen Lucerna Music Bar. Anfängerkurs um 21:00, freies Tanzen ab 22:00 bis spät. Live-DJ mit kubanischen und kolumbianischen Rhythmen. Kein Partner nötig.",
            "ru": "Еженедельная сальса-вечеринка в легендарном Lucerna Music Bar. Урок для начинающих в 21:00, свободные танцы с 22:00 до поздна. Живой DJ с кубинскими и колумбийскими ритмами. Партнёр не нужен.",
            "uk": "Щотижнева сальса-вечірка в легендарному Lucerna Music Bar. Урок для початківців о 21:00, вільні танці з 22:00 до пізна. Живий DJ з кубинськими та колумбійськими ритмами. Партнер не потрібен.",
        },
    },
    # 24. Startup Grind Prague
    {
        "iso_local": "2026-06-11 18:30",
        "duration_minutes": 150,
        "category": "startups",
        "address": "HubHub, Na Příkopě 583/15, Prague 1",
        "venue_short": "HubHub, Na Příkopě",
        "lat": 50.0870,
        "lng": 14.4210,
        "is_free": False,
        "price": 150,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.startupgrind.com/prague",
        "source_label": "startupgrind.com",
        "photos": ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"],
        "titles": {
            "en": "Startup Grind Prague — Fireside Chat",
            "cs": "Startup Grind Prague — fireside chat",
            "de": "Startup Grind Prague — Fireside Chat",
            "ru": "Startup Grind Prague — fireside chat",
            "uk": "Startup Grind Prague — fireside chat",
        },
        "bodies": {
            "en": "Monthly Startup Grind event at HubHub featuring a fireside chat with a local founder, networking drinks, and lightning pitches. Open to founders, investors, and tech enthusiasts.",
            "cs": "Měsíční Startup Grind v HubHubu — fireside chat s lokálním zakladatelem, networking drinks a bleskové pitche. Otevřeno zakladatelům, investorům a tech nadšencům.",
            "de": "Monatliches Startup-Grind-Event im HubHub — Fireside Chat mit einem lokalen Gründer, Networking-Drinks und Lightning Pitches. Offen für Gründer, Investoren und Tech-Enthusiasten.",
            "ru": "Ежемесячный Startup Grind в HubHub — fireside chat с локальным фаундером, networking drinks и блиц-питчи. Открыто для фаундеров, инвесторов и tech-энтузиастов.",
            "uk": "Щомісячний Startup Grind у HubHub — fireside chat з локальним фаундером, networking drinks та бліц-пітчі. Відкрито для фаундерів, інвесторів та tech-ентузіастів.",
        },
    },
    # 25. Outdoor Fitness Bootcamp — Riegrovy Sady
    {
        "iso_local": "2026-05-27 07:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Riegrovy sady, Prague 2",
        "venue_short": "Riegrovy Sady park",
        "lat": 50.0790,
        "lng": 14.4400,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.meetup.com/prague-outdoor-fitness",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80"],
        "titles": {
            "en": "Outdoor Fitness Bootcamp — Riegrovy Sady",
            "cs": "Venkovní fitness bootcamp — Riegrovy sady",
            "de": "Outdoor-Fitness-Bootcamp — Riegrovy Sady",
            "ru": "Фитнес-буткемп на свежем воздухе — Ригровы Сады",
            "uk": "Фітнес-буткемп на свіжому повітрі — Рігрови Сади",
        },
        "bodies": {
            "en": "Free morning bootcamp in Riegrovy Sady park — bodyweight circuits, partner drills, and a cool-down stretch with views of Prague Castle. All fitness levels, no equipment needed.",
            "cs": "Bezplatný ranní bootcamp v Riegrových sadech — cvičení s vlastní vahou, párové drily a závěrečný strečink s výhledem na Pražský hrad. Všechny úrovně, žádné vybavení.",
            "de": "Kostenloses Morgen-Bootcamp in den Riegrovy Sady — Bodyweight-Zirkel, Partner-Drills und Cool-Down-Stretching mit Blick auf die Prager Burg. Alle Fitnesslevel, keine Ausrüstung nötig.",
            "ru": "Бесплатный утренний буткемп в парке Ригровы Сады — круговая тренировка с собственным весом, парные упражнения и растяжка с видом на Пражский Град. Любой уровень, оборудование не нужно.",
            "uk": "Безкоштовний ранковий буткемп у парку Рігрови Сади — кругове тренування з власною вагою, парні вправи та розтяжка з видом на Празький Град. Будь-який рівень, обладнання не потрібне.",
        },
    },
    # 26. Prague Castle Night Tour
    {
        "iso_local": "2026-06-13 21:00",
        "duration_minutes": 90,
        "category": "guided-tours",
        "address": "Prague Castle, Hradčanské náměstí, Prague 1",
        "venue_short": "Prague Castle",
        "lat": 50.0910,
        "lng": 14.4010,
        "is_free": False,
        "price": 490,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.hrad.cz/en",
        "source_label": "hrad.cz",
        "photos": ["https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80"],
        "titles": {
            "en": "Prague Castle Night Tour",
            "cs": "Noční prohlídka Pražského hradu",
            "de": "Prager Burg — Nachtführung",
            "ru": "Ночная экскурсия по Пражскому Граду",
            "uk": "Нічна екскурсія Празьким Градом",
        },
        "bodies": {
            "en": "Guided evening tour of Prague Castle after closing hours — St. Vitus Cathedral illuminated from within, the Old Royal Palace by torchlight, and Golden Lane without the crowds. English-only, max 15 people.",
            "cs": "Komentovaná večerní prohlídka Pražského hradu po zavírací době — Katedrála sv. Víta osvětlená zevnitř, Starý královský palác při pochodních a Zlatá ulička bez davů. Pouze anglicky, max 15 osob.",
            "de": "Geführte Abendtour durch die Prager Burg nach Schließung — Veitsdom von innen beleuchtet, Alter Königspalast im Fackelschein und Goldenes Gässchen ohne Menschenmassen. Nur Englisch, max. 15 Personen.",
            "ru": "Экскурсия по Пражскому Граду после закрытия — собор Св. Вита, подсвеченный изнутри, Старый королевский дворец при факелах и Золотая улочка без толп. Только на английском, макс. 15 человек.",
            "uk": "Екскурсія Празьким Градом після закриття — собор Св. Віта, підсвічений зсередини, Старий королівський палац при факелах і Золота вуличка без натовпів. Лише англійською, макс. 15 осіб.",
        },
    },
    # 27. Farmers Market at Jiřák
    {
        "iso_local": "2026-05-31 08:00",
        "duration_minutes": 360,
        "category": "food-tours",
        "address": "Náměstí Jiřího z Poděbrad, Prague 3",
        "venue_short": "Jiřího z Poděbrad square",
        "lat": 50.0780,
        "lng": 14.4500,
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.farmarsketrziste.cz",
        "source_label": "farmarsketrziste.cz",
        "photos": ["https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80"],
        "titles": {
            "en": "Farmers Market at Jiřák",
            "cs": "Farmářský trh na Jiřáku",
            "de": "Bauernmarkt am Jiřák",
            "ru": "Фермерский рынок на Иржаке",
            "uk": "Фермерський ринок на Їржаку",
        },
        "bodies": {
            "en": "Saturday farmers market at Jiřího z Poděbrad square — organic vegetables, artisan cheeses, sourdough bread, honey, flowers, and hot food stalls. One of Prague's most popular weekend markets.",
            "cs": "Sobotní farmářský trh na náměstí Jiřího z Poděbrad — bio zelenina, řemeslné sýry, kváskový chléb, med, květiny a stánky s teplým jídlem. Jeden z nejoblíbenějších víkendových trhů v Praze.",
            "de": "Samstags-Bauernmarkt am Jiřího z Poděbrad — Bio-Gemüse, handwerkliche Käse, Sauerteigbrot, Honig, Blumen und warme Speisen. Einer der beliebtesten Wochenendmärkte Prags.",
            "ru": "Субботний фермерский рынок на площади Иржиго з Подебрад — органические овощи, ремесленные сыры, хлеб на закваске, мёд, цветы и горячая еда. Один из самых популярных выходных рынков Праги.",
            "uk": "Суботній фермерський ринок на площі Їржіго з Подебрад — органічні овочі, ремісничі сири, хліб на заквасці, мед, квіти та гаряча їжа. Один із найпопулярніших вихідних ринків Праги.",
        },
    },
    # 28. DOX Centre — New Media Art Exhibition
    {
        "iso_local": "2026-06-08 10:00",
        "duration_minutes": 480,
        "category": "museums",
        "address": "DOX Centre for Contemporary Art, Poupětova 1, Prague 7",
        "venue_short": "DOX Centre, Holešovice",
        "lat": 50.1050,
        "lng": 14.4450,
        "is_free": False,
        "price": 250,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.dox.cz/en",
        "source_label": "dox.cz",
        "photos": ["https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80"],
        "titles": {
            "en": "DOX Centre — New Media Art Exhibition",
            "cs": "DOX — výstava nových médií",
            "de": "DOX Centre — Neue-Medien-Kunstausstellung",
            "ru": "DOX Centre — выставка нового медиаискусства",
            "uk": "DOX Centre — виставка нового медіамистецтва",
        },
        "bodies": {
            "en": "Interactive new media art exhibition at DOX Centre featuring AI-generated installations, VR experiences, and data-driven sculptures by Czech and international artists. The Gulliver Airship gallery hosts a sound art piece.",
            "cs": "Interaktivní výstava nových médií v DOXu — AI instalace, VR zážitky a datové sochy českých i zahraničních umělců. Galerie ve vzducholodi Gulliver hostí zvukovou instalaci.",
            "de": "Interaktive Neue-Medien-Ausstellung im DOX Centre — KI-generierte Installationen, VR-Erlebnisse und datengetriebene Skulpturen tschechischer und internationaler Künstler. Die Gulliver-Luftschiff-Galerie zeigt eine Klanginstallation.",
            "ru": "Интерактивная выставка нового медиаискусства в DOX Centre — AI-инсталляции, VR-опыты и дата-скульптуры чешских и международных художников. Галерея в дирижабле «Гулливер» представляет звуковую инсталляцию.",
            "uk": "Інтерактивна виставка нового медіамистецтва в DOX Centre — AI-інсталяції, VR-досвіди та дата-скульптури чеських і міжнародних художників. Галерея в дирижаблі «Гулівер» представляє звукову інсталяцію.",
        },
    },
    # 29. Stand-Up Comedy in English at Underdogs
    {
        "iso_local": "2026-06-17 20:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "Underdogs' Ballroom, Nádražní 3, Prague 5",
        "venue_short": "Underdogs, Smíchov",
        "lat": 50.0870,
        "lng": 14.4530,
        "is_free": False,
        "price": 250,
        "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.underdogs.cz",
        "source_label": "underdogs.cz",
        "photos": ["https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80"],
        "titles": {
            "en": "Stand-Up Comedy in English at Underdogs",
            "cs": "Stand-up v angličtině v Underdogs",
            "de": "Stand-Up Comedy auf Englisch bei Underdogs",
            "ru": "Стендап на английском в Underdogs",
            "uk": "Стендап англійською в Underdogs",
        },
        "bodies": {
            "en": "English-language stand-up comedy night at Underdogs' Ballroom in Smíchov. Six comics from Prague's international scene plus a surprise guest. Two-drink minimum, doors at 19:30.",
            "cs": "Večer anglického stand-upu v Underdogs' Ballroom na Smíchově. Šest komiků z pražské mezinárodní scény plus překvapivý host. Minimum dva nápoje, dveře v 19:30.",
            "de": "Englischsprachiger Stand-Up-Abend im Underdogs' Ballroom in Smíchov. Sechs Comedians der internationalen Prager Szene plus Überraschungsgast. Zwei-Getränke-Minimum, Einlass 19:30.",
            "ru": "Вечер англоязычного стендапа в Underdogs' Ballroom на Смихове. Шесть комиков из международной пражской сцены плюс сюрприз-гость. Минимум два напитка, двери в 19:30.",
            "uk": "Вечір англомовного стендапу в Underdogs' Ballroom на Сміхові. Шість коміків із міжнародної празької сцени плюс сюрприз-гість. Мінімум два напої, двері о 19:30.",
        },
    },
    # 30. Kampa Island Pottery Workshop
    {
        "iso_local": "2026-06-22 14:00",
        "duration_minutes": 150,
        "category": "cooking",
        "address": "Kampa Island, Na Kampě, Prague 1",
        "venue_short": "Kampa Island",
        "lat": 50.0840,
        "lng": 14.4080,
        "is_free": False,
        "price": 890,
        "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.kampaisland.cz",
        "source_label": "kampaisland.cz",
        "photos": ["https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80"],
        "titles": {
            "en": "Kampa Island Pottery Workshop",
            "cs": "Keramický workshop na Kampě",
            "de": "Töpferworkshop auf der Kampa-Insel",
            "ru": "Гончарный мастер-класс на острове Кампа",
            "uk": "Гончарний майстер-клас на острові Кампа",
        },
        "bodies": {
            "en": "Hands-on pottery workshop on Kampa Island — learn wheel-throwing basics, glaze your piece, and pick it up fired the following week. Materials included. Small group, max 8 participants.",
            "cs": "Praktický keramický workshop na Kampě — naučte se základy točení na kruhu, glazujte svůj výrobek a vyzvedněte ho vypálený příští týden. Materiál v ceně. Malá skupina, max 8 účastníků.",
            "de": "Praktischer Töpferworkshop auf der Kampa-Insel — Grundlagen des Drehens auf der Scheibe, Glasieren und Abholen des gebrannten Stücks in der Folgewoche. Material inklusive. Kleine Gruppe, max. 8 Teilnehmer.",
            "ru": "Практический гончарный мастер-класс на острове Кампа — основы работы на гончарном круге, глазурование и получение обожжённого изделия через неделю. Материалы включены. Малая группа, макс. 8 участников.",
            "uk": "Практичний гончарний майстер-клас на острові Кампа — основи роботи на гончарному крузі, глазурування та отримання випаленого виробу через тиждень. Матеріали включені. Мала група, макс. 8 учасників.",
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
            "city": "Prague",
            "city_id": PRAGUE_CITY_ID,
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
