#!/usr/bin/env python3
"""
Seed 30 system events in Berlin for May 22 – June 30, 2026.

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
  exec(open('.agent-tmp/seed_berlin_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
BERLIN_CITY_ID = "1acd225d-96a1-443c-9e5a-06de53e421c2"
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
    # 1. Fête de la Musique Berlin
    {
        "iso_local": "2026-06-21 16:00",
        "duration_minutes": 480,
        "category": "music",
        "address": "Citywide — various stages across Berlin",
        "venue_short": "Citywide, Berlin",
        "lat": 52.5200,
        "lng": 13.4050,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.fetedelamusique.de",
        "source_label": "fetedelamusique.de",
        "photos": ["https://images.unsplash.com/photo-1501386761578-0a55d938946b?w=800&q=80"],
        "titles": {
            "en": "Fête de la Musique Berlin",
            "de": "Fête de la Musique Berlin",
            "ru": "Fête de la Musique — Берлин",
            "uk": "Fête de la Musique — Берлін",
            "es": "Fête de la Musique Berlín",
        },
        "bodies": {
            "en": "Free music everywhere on the longest day of the year. Hundreds of stages across Berlin — from jazz in courtyards to techno on bridges. No tickets, no barriers, just music.",
            "de": "Kostenlose Musik überall am längsten Tag des Jahres. Hunderte Bühnen in ganz Berlin — von Jazz in Hinterhöfen bis Techno auf Brücken. Keine Tickets, keine Barrieren, nur Musik.",
            "ru": "Бесплатная музыка повсюду в самый длинный день года. Сотни сцен по всему Берлину — от джаза во дворах до техно на мостах. Без билетов, без барьеров, только музыка.",
            "uk": "Безкоштовна музика скрізь у найдовший день року. Сотні сцен по всьому Берліну — від джазу у дворах до техно на мостах. Без квитків, без бар'єрів, лише музика.",
            "es": "Música gratuita en todas partes en el día más largo del año. Cientos de escenarios por todo Berlín — desde jazz en patios hasta techno en puentes. Sin entradas, sin barreras, solo música.",
        },
    },
    # 2. Karneval der Kulturen — Parade
    {
        "iso_local": "2026-06-07 12:00",
        "duration_minutes": 360,
        "category": "other",
        "address": "Hermannplatz to Yorckstraße, Kreuzberg, Berlin",
        "venue_short": "Kreuzberg",
        "lat": 52.4870,
        "lng": 13.4200,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.karneval-berlin.de",
        "source_label": "karneval-berlin.de",
        "photos": ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"],
        "titles": {
            "en": "Karneval der Kulturen — Parade",
            "de": "Karneval der Kulturen — Umzug",
            "ru": "Карнавал культур — парад",
            "uk": "Карнавал культур — парад",
            "es": "Carnaval de las Culturas — Desfile",
        },
        "bodies": {
            "en": "Berlin's biggest multicultural parade through Kreuzberg — over 4,000 performers with floats, costumes, and music from every continent. A celebration of diversity and community spirit.",
            "de": "Berlins größter multikultureller Umzug durch Kreuzberg — über 4.000 Teilnehmer mit Wagen, Kostümen und Musik von jedem Kontinent. Ein Fest der Vielfalt und Gemeinschaft.",
            "ru": "Крупнейший мультикультурный парад Берлина через Кройцберг — более 4 000 участников с платформами, костюмами и музыкой со всех континентов. Праздник разнообразия и единства.",
            "uk": "Найбільший мультикультурний парад Берліна через Кройцберг — понад 4 000 учасників із платформами, костюмами та музикою з усіх континентів. Свято різноманіття та єдності.",
            "es": "El mayor desfile multicultural de Berlín por Kreuzberg — más de 4.000 participantes con carrozas, disfraces y música de todos los continentes. Una celebración de la diversidad.",
        },
    },
    # 3. Karneval der Kulturen — Street Festival Day 1
    {
        "iso_local": "2026-06-05 15:00",
        "duration_minutes": 420,
        "category": "other",
        "address": "Blücherplatz, Kreuzberg, Berlin",
        "venue_short": "Kreuzberg",
        "lat": 52.4870,
        "lng": 13.4200,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.karneval-berlin.de",
        "source_label": "karneval-berlin.de",
        "photos": ["https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80"],
        "titles": {
            "en": "Karneval der Kulturen — Street Festival Day 1",
            "de": "Karneval der Kulturen — Straßenfest Tag 1",
            "ru": "Карнавал культур — уличный фестиваль, день 1",
            "uk": "Карнавал культур — вуличний фестиваль, день 1",
            "es": "Carnaval de las Culturas — Festival callejero Día 1",
        },
        "bodies": {
            "en": "Opening day of the four-day street festival around Blücherplatz — world food stalls, live music stages, and artisan crafts from Berlin's diverse communities.",
            "de": "Eröffnungstag des viertägigen Straßenfests rund um den Blücherplatz — Essenstände aus aller Welt, Live-Musik-Bühnen und Kunsthandwerk aus Berlins vielfältigen Communities.",
            "ru": "Первый день четырёхдневного уличного фестиваля у Blücherplatz — еда со всего мира, живая музыка и ремесленные изделия от разнообразных сообществ Берлина.",
            "uk": "Перший день чотириденного вуличного фестивалю біля Blücherplatz — їжа з усього світу, жива музика та ремісничі вироби від різноманітних спільнот Берліна.",
            "es": "Primer día del festival callejero de cuatro días en Blücherplatz — puestos de comida del mundo, escenarios de música en vivo y artesanía de las diversas comunidades de Berlín.",
        },
    },
    # 4. Berlin Philharmonic — Open-Air Concert
    {
        "iso_local": "2026-06-14 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "Waldbühne, Glockenturmstraße 1, Berlin",
        "venue_short": "Waldbühne",
        "lat": 52.5150,
        "lng": 13.2300,
        "is_free": False,
        "price": 45,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.berliner-philharmoniker.de",
        "source_label": "berliner-philharmoniker.de",
        "photos": ["https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80"],
        "titles": {
            "en": "Berlin Philharmonic — Open-Air Concert",
            "de": "Berliner Philharmoniker — Open-Air-Konzert",
            "ru": "Берлинская филармония — концерт под открытым небом",
            "uk": "Берлінська філармонія — концерт просто неба",
            "es": "Filarmónica de Berlín — Concierto al aire libre",
        },
        "bodies": {
            "en": "The legendary Berlin Philharmonic performs under the stars at the Waldbühne amphitheater. A summer tradition with world-class orchestral music in a stunning forest setting for 22,000 guests.",
            "de": "Die legendären Berliner Philharmoniker spielen unter den Sternen in der Waldbühne. Eine Sommertradition mit Weltklasse-Orchestermusik in einzigartiger Waldkulisse für 22.000 Gäste.",
            "ru": "Легендарный Берлинский филармонический оркестр выступает под звёздами в амфитеатре Вальдбюне. Летняя традиция с оркестровой музыкой мирового класса в лесном окружении на 22 000 зрителей.",
            "uk": "Легендарний Берлінський філармонічний оркестр виступає під зірками в амфітеатрі Вальдбюне. Літня традиція зі світовою оркестровою музикою в лісовому оточенні на 22 000 глядачів.",
            "es": "La legendaria Filarmónica de Berlín actúa bajo las estrellas en el anfiteatro Waldbühne. Una tradición veraniega con música orquestal de primer nivel en un entorno boscoso para 22.000 asistentes.",
        },
    },
    # 5. Berghain — Klubnacht
    {
        "iso_local": "2026-05-24 00:00",
        "duration_minutes": 1080,
        "category": "music",
        "address": "Berghain, Am Wriezener Bahnhof, Friedrichshain, Berlin",
        "venue_short": "Berghain, Friedrichshain",
        "lat": 52.5110,
        "lng": 13.4430,
        "is_free": False,
        "price": 25,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.berghain.berlin",
        "source_label": "berghain.berlin",
        "photos": ["https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80"],
        "titles": {
            "en": "Berghain — Klubnacht",
            "de": "Berghain — Klubnacht",
            "ru": "Berghain — Klubnacht",
            "uk": "Berghain — Klubnacht",
            "es": "Berghain — Klubnacht",
        },
        "bodies": {
            "en": "The world's most iconic techno club opens its doors for a marathon Klubnacht session. Expect relentless techno on the main floor and house in Panorama Bar until well past sunrise.",
            "de": "Der ikonischste Techno-Club der Welt öffnet seine Türen für eine Marathon-Klubnacht. Unerbittlicher Techno auf dem Mainfloor und House in der Panorama Bar bis weit nach Sonnenaufgang.",
            "ru": "Самый культовый техно-клуб мира открывает двери для марафонской Klubnacht. Безостановочное техно на основном танцполе и хаус в Panorama Bar далеко за рассвет.",
            "uk": "Найкультовіший техно-клуб світу відчиняє двері для марафонської Klubnacht. Безупинне техно на основному танцполі та хаус у Panorama Bar далеко за світанок.",
            "es": "El club de techno más icónico del mundo abre sus puertas para una sesión maratón Klubnacht. Techno implacable en la pista principal y house en Panorama Bar hasta bien pasado el amanecer.",
        },
    },
    # 6. Sprachcafé — German Practice at Café Babel
    {
        "iso_local": "2026-06-03 19:00",
        "duration_minutes": 120,
        "category": "networking",
        "address": "Café Babel, Körnerstraße 7, Neukölln, Berlin",
        "venue_short": "Café Babel, Neukölln",
        "lat": 52.4810,
        "lng": 13.4350,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en", "es", "ru"],
        "source_url": "https://www.meetup.com/berlin-sprachcafe",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80"],
        "titles": {
            "en": "Sprachcafé — German Practice at Café Babel",
            "de": "Sprachcafé — Deutsch üben im Café Babel",
            "ru": "Sprachcafé — практика немецкого в Café Babel",
            "uk": "Sprachcafé — практика німецької в Café Babel",
            "es": "Sprachcafé — Práctica de alemán en Café Babel",
        },
        "bodies": {
            "en": "Casual language exchange evening — practice German with native speakers over coffee and cake. Tables organized by level (A1–C2). A welcoming space for newcomers to Berlin.",
            "de": "Gemütlicher Sprachaustausch-Abend — Deutsch üben mit Muttersprachlern bei Kaffee und Kuchen. Tische nach Niveau (A1–C2) organisiert. Ein einladender Ort für Neuankömmlinge in Berlin.",
            "ru": "Непринуждённый языковой обмен — практикуйте немецкий с носителями за кофе и пирожными. Столы по уровням (A1–C2). Гостеприимное место для новичков в Берлине.",
            "uk": "Невимушений мовний обмін — практикуйте німецьку з носіями за кавою та тістечками. Столи за рівнями (A1–C2). Привітне місце для новачків у Берліні.",
            "es": "Intercambio de idiomas informal — practica alemán con hablantes nativos tomando café y pastel. Mesas organizadas por nivel (A1–C2). Un espacio acogedor para recién llegados a Berlín.",
        },
    },
    # 7. Street Food Thursday at Markthalle Neun
    {
        "iso_local": "2026-05-22 17:00",
        "duration_minutes": 300,
        "category": "food-tours",
        "address": "Markthalle Neun, Eisenbahnstraße 42/43, Kreuzberg, Berlin",
        "venue_short": "Markthalle Neun, Kreuzberg",
        "lat": 52.5010,
        "lng": 13.4340,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://markthalleneun.de",
        "source_label": "markthalleneun.de",
        "photos": ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"],
        "titles": {
            "en": "Street Food Thursday at Markthalle Neun",
            "de": "Street Food Thursday in der Markthalle Neun",
            "ru": "Street Food Thursday в Markthalle Neun",
            "uk": "Street Food Thursday у Markthalle Neun",
            "es": "Street Food Thursday en Markthalle Neun",
        },
        "bodies": {
            "en": "Berlin's beloved weekly street food market in a historic 19th-century market hall. Dozens of vendors serving cuisines from around the world — from Korean BBQ to Neapolitan pizza. Entry free, pay per dish.",
            "de": "Berlins beliebter wöchentlicher Street-Food-Markt in einer historischen Markthalle aus dem 19. Jahrhundert. Dutzende Stände mit Küchen aus aller Welt — von Korean BBQ bis neapolitanischer Pizza. Eintritt frei.",
            "ru": "Любимый берлинский еженедельный стрит-фуд-маркет в историческом рыночном зале XIX века. Десятки продавцов с кухнями со всего мира — от корейского BBQ до неаполитанской пиццы. Вход свободный.",
            "uk": "Улюблений берлінський щотижневий стріт-фуд-маркет в історичній ринковій залі XIX століття. Десятки продавців із кухнями з усього світу — від корейського BBQ до неаполітанської піци. Вхід вільний.",
            "es": "El querido mercado semanal de street food de Berlín en un mercado histórico del siglo XIX. Decenas de puestos con cocinas de todo el mundo — desde BBQ coreano hasta pizza napolitana. Entrada gratuita.",
        },
    },
    # 8. Tempelhof Field Running Group
    {
        "iso_local": "2026-05-25 09:00",
        "duration_minutes": 90,
        "category": "running",
        "address": "Tempelhofer Feld, Eingang Oderstraße, Berlin",
        "venue_short": "Tempelhofer Feld, Tempelhof",
        "lat": 52.4730,
        "lng": 13.4010,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/berlin-running",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Tempelhof Field Running Group",
            "de": "Laufgruppe auf dem Tempelhofer Feld",
            "ru": "Беговая группа на Темпельхофском поле",
            "uk": "Бігова група на Темпельхофському полі",
            "es": "Grupo de running en Tempelhof Field",
        },
        "bodies": {
            "en": "Sunday morning group run on Berlin's iconic former airport runway. 5K and 10K options, all paces welcome. Meet at the Oderstraße entrance — flat terrain, wide open sky, and great community vibes.",
            "de": "Sonntagmorgen-Gruppenlauf auf der ikonischen ehemaligen Startbahn des Flughafens. 5K- und 10K-Optionen, alle Tempos willkommen. Treffpunkt Eingang Oderstraße — flaches Gelände, weiter Himmel und tolle Community.",
            "ru": "Воскресная утренняя пробежка на легендарной бывшей взлётной полосе аэропорта. Дистанции 5 и 10 км, любой темп. Встреча у входа Oderstraße — ровная местность, открытое небо и отличная атмосфера.",
            "uk": "Недільна ранкова пробіжка на легендарній колишній злітній смузі аеропорту. Дистанції 5 та 10 км, будь-який темп. Зустріч біля входу Oderstraße — рівна місцевість, відкрите небо та чудова атмосфера.",
            "es": "Carrera grupal dominical en la icónica pista del antiguo aeropuerto. Opciones de 5K y 10K, todos los ritmos bienvenidos. Punto de encuentro en la entrada Oderstraße — terreno plano y gran ambiente.",
        },
    },
    # 9. Museum Island Night — Long Night of Museums
    {
        "iso_local": "2026-06-06 18:00",
        "duration_minutes": 480,
        "category": "museums",
        "address": "Museumsinsel, Bodestraße, Mitte, Berlin",
        "venue_short": "Museum Island, Mitte",
        "lat": 52.5210,
        "lng": 13.3970,
        "is_free": False,
        "price": 18,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.lange-nacht-der-museen.de",
        "source_label": "lange-nacht-der-museen.de",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Museum Island Night — Long Night of Museums",
            "de": "Museumsinsel — Lange Nacht der Museen",
            "ru": "Музейный остров — Длинная ночь музеев",
            "uk": "Музейний острів — Довга ніч музеїв",
            "es": "Isla de los Museos — Larga Noche de los Museos",
        },
        "bodies": {
            "en": "One ticket, five world-class museums open until 2 AM. Special exhibitions, live music in the courtyards, and guided tours by flashlight. Berlin's UNESCO World Heritage museum complex at its most magical.",
            "de": "Ein Ticket, fünf Weltklasse-Museen geöffnet bis 2 Uhr. Sonderausstellungen, Live-Musik in den Innenhöfen und Taschenlampen-Führungen. Berlins UNESCO-Welterbe-Museumskomplex in seiner magischsten Form.",
            "ru": "Один билет — пять музеев мирового класса открыты до 2 ночи. Специальные выставки, живая музыка во дворах и экскурсии с фонариками. Музейный комплекс ЮНЕСКО Берлина в самом волшебном виде.",
            "uk": "Один квиток — п'ять музеїв світового класу відкриті до 2 ночі. Спеціальні виставки, жива музика у дворах та екскурсії з ліхтариками. Музейний комплекс ЮНЕСКО Берліна у найчарівнішому вигляді.",
            "es": "Un ticket, cinco museos de clase mundial abiertos hasta las 2 AM. Exposiciones especiales, música en vivo en los patios y visitas guiadas con linterna. El complejo museístico UNESCO de Berlín en su forma más mágica.",
        },
    },
    # 10. Startup Meetup at Factory Berlin
    {
        "iso_local": "2026-06-10 19:00",
        "duration_minutes": 150,
        "category": "startups",
        "address": "Factory Berlin, Rheinsberger Straße 76/77, Mitte, Berlin",
        "venue_short": "Factory Berlin, Mitte",
        "lat": 52.5230,
        "lng": 13.4120,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "de"],
        "source_url": "https://www.factoryberlin.com",
        "source_label": "factoryberlin.com",
        "photos": ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"],
        "titles": {
            "en": "Startup Meetup at Factory Berlin",
            "de": "Startup-Meetup in der Factory Berlin",
            "ru": "Стартап-митап в Factory Berlin",
            "uk": "Стартап-мітап у Factory Berlin",
            "es": "Meetup de startups en Factory Berlin",
        },
        "bodies": {
            "en": "Monthly startup meetup at Factory Berlin — pitch sessions from early-stage founders, panel on AI in climate tech, and networking with Berlin's vibrant tech ecosystem. Free drinks and snacks.",
            "de": "Monatliches Startup-Meetup in der Factory Berlin — Pitch-Sessions von Early-Stage-Gründern, Panel zu KI in Climate Tech und Networking mit Berlins lebhaftem Tech-Ökosystem. Gratis Getränke und Snacks.",
            "ru": "Ежемесячный стартап-митап в Factory Berlin — питч-сессии начинающих основателей, панель об ИИ в климатических технологиях и нетворкинг с технологической экосистемой Берлина. Бесплатные напитки и закуски.",
            "uk": "Щомісячний стартап-мітап у Factory Berlin — пітч-сесії початківців-засновників, панель про ШІ в кліматичних технологіях та нетворкінг з технологічною екосистемою Берліна. Безкоштовні напої та закуски.",
            "es": "Meetup mensual de startups en Factory Berlin — sesiones de pitch de fundadores en fase inicial, panel sobre IA en tecnología climática y networking con el ecosistema tech de Berlín. Bebidas y snacks gratis.",
        },
    },
    # 11. Open-Air Cinema at Freiluftkino Kreuzberg
    {
        "iso_local": "2026-06-12 21:30",
        "duration_minutes": 150,
        "category": "cinema",
        "address": "Freiluftkino Kreuzberg, Mariannenplatz 2, Berlin",
        "venue_short": "Freiluftkino Kreuzberg",
        "lat": 52.4950,
        "lng": 13.4180,
        "is_free": False,
        "price": 9,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.freiluftkino-kreuzberg.de",
        "source_label": "freiluftkino-kreuzberg.de",
        "photos": ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"],
        "titles": {
            "en": "Open-Air Cinema at Freiluftkino Kreuzberg",
            "de": "Open-Air-Kino im Freiluftkino Kreuzberg",
            "ru": "Кино под открытым небом — Freiluftkino Kreuzberg",
            "uk": "Кіно просто неба — Freiluftkino Kreuzberg",
            "es": "Cine al aire libre en Freiluftkino Kreuzberg",
        },
        "bodies": {
            "en": "Watch films under the stars in one of Berlin's most charming outdoor cinemas. Surrounded by old trees in a Kreuzberg park — bring a blanket, grab a beer, and enjoy the summer night screening.",
            "de": "Filme unter den Sternen in einem der charmantesten Open-Air-Kinos Berlins. Umgeben von alten Bäumen in einem Kreuzberger Park — Decke mitbringen, Bier holen und die Sommernacht genießen.",
            "ru": "Кино под звёздами в одном из самых очаровательных открытых кинотеатров Берлина. В окружении старых деревьев в парке Кройцберга — возьмите плед, пиво и наслаждайтесь летним вечером.",
            "uk": "Кіно під зірками в одному з найчарівніших відкритих кінотеатрів Берліна. В оточенні старих дерев у парку Кройцберга — візьміть плед, пиво та насолоджуйтесь літнім вечором.",
            "es": "Películas bajo las estrellas en uno de los cines al aire libre más encantadores de Berlín. Rodeado de árboles antiguos en un parque de Kreuzberg — trae una manta, coge una cerveza y disfruta la noche de verano.",
        },
    },
    # 12. Mauerpark Karaoke
    {
        "iso_local": "2026-05-25 15:00",
        "duration_minutes": 180,
        "category": "music",
        "address": "Mauerpark Amphitheater, Prenzlauer Berg, Berlin",
        "venue_short": "Mauerpark, Prenzlauer Berg",
        "lat": 52.5430,
        "lng": 13.4020,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.mauerpark.info",
        "source_label": "mauerpark.info",
        "photos": ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"],
        "titles": {
            "en": "Mauerpark Karaoke",
            "de": "Mauerpark Karaoke",
            "ru": "Караоке в Мауэрпарке",
            "uk": "Караоке в Мауерпарку",
            "es": "Karaoke en Mauerpark",
        },
        "bodies": {
            "en": "Berlin's legendary Sunday open-air karaoke in the Mauerpark amphitheater. Brave souls sing to a crowd of thousands — from power ballads to punk. A quintessential Berlin experience, rain or shine.",
            "de": "Berlins legendäres Sonntags-Open-Air-Karaoke im Mauerpark-Amphitheater. Mutige singen vor Tausenden — von Powerballaden bis Punk. Ein typisches Berlin-Erlebnis bei jedem Wetter.",
            "ru": "Легендарное воскресное караоке под открытым небом в амфитеатре Мауэрпарка. Смельчаки поют перед тысячами зрителей — от баллад до панка. Квинтэссенция берлинского духа в любую погоду.",
            "uk": "Легендарне недільне караоке просто неба в амфітеатрі Мауерпарку. Сміливці співають перед тисячами глядачів — від балад до панку. Квінтесенція берлінського духу за будь-якої погоди.",
            "es": "El legendario karaoke dominical al aire libre de Berlín en el anfiteatro de Mauerpark. Valientes cantan ante miles — desde baladas hasta punk. Una experiencia berlinesa por excelencia, llueva o haga sol.",
        },
    },
    # 13. Mauerpark Flea Market
    {
        "iso_local": "2026-06-01 10:00",
        "duration_minutes": 420,
        "category": "other",
        "address": "Mauerpark, Bernauer Straße 63-64, Prenzlauer Berg, Berlin",
        "venue_short": "Mauerpark, Prenzlauer Berg",
        "lat": 52.5430,
        "lng": 13.4020,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.mauerpark.info",
        "source_label": "mauerpark.info",
        "photos": ["https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80"],
        "titles": {
            "en": "Mauerpark Flea Market",
            "de": "Mauerpark Flohmarkt",
            "ru": "Блошиный рынок в Мауэрпарке",
            "uk": "Блошиний ринок у Мауерпарку",
            "es": "Mercado de pulgas de Mauerpark",
        },
        "bodies": {
            "en": "Berlin's most famous Sunday flea market — vintage clothing, vinyl records, antiques, and handmade crafts. Browse hundreds of stalls, grab street food, and soak up the buzzing Prenzlauer Berg atmosphere.",
            "de": "Berlins berühmtester Sonntags-Flohmarkt — Vintage-Kleidung, Vinyl, Antiquitäten und Handgemachtes. Hunderte Stände durchstöbern, Street Food genießen und die lebhafte Prenzlauer-Berg-Atmosphäre aufsaugen.",
            "ru": "Самый знаменитый воскресный блошиный рынок Берлина — винтажная одежда, виниловые пластинки, антиквариат и хендмейд. Сотни прилавков, стрит-фуд и бурлящая атмосфера Пренцлауэр-Берга.",
            "uk": "Найвідоміший недільний блошиний ринок Берліна — вінтажний одяг, вінілові платівки, антикваріат та хендмейд. Сотні прилавків, стріт-фуд та бурхлива атмосфера Пренцлауер-Берга.",
            "es": "El mercado de pulgas dominical más famoso de Berlín — ropa vintage, vinilos, antigüedades y artesanía. Cientos de puestos, comida callejera y el vibrante ambiente de Prenzlauer Berg.",
        },
    },
    # 14. Yoga in Tiergarten
    {
        "iso_local": "2026-05-27 07:30",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Großer Tiergarten, Straße des 17. Juni (Rosengarten), Berlin",
        "venue_short": "Tiergarten, Rosengarten",
        "lat": 52.5140,
        "lng": 13.3500,
        "is_free": False,
        "price": 10,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/berlin-yoga-outdoors",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80"],
        "titles": {
            "en": "Yoga in Tiergarten",
            "de": "Yoga im Tiergarten",
            "ru": "Йога в Тиргартене",
            "uk": "Йога в Тіргартені",
            "es": "Yoga en Tiergarten",
        },
        "bodies": {
            "en": "Morning vinyasa flow in Berlin's central park — practice among rose gardens and ancient trees. All levels welcome. Bring your own mat. The session ends with guided meditation by the pond.",
            "de": "Morgendlicher Vinyasa Flow in Berlins zentralem Park — Praxis zwischen Rosengärten und alten Bäumen. Alle Niveaus willkommen. Eigene Matte mitbringen. Die Stunde endet mit geführter Meditation am Teich.",
            "ru": "Утренняя виньяса-флоу в центральном парке Берлина — практика среди розовых садов и вековых деревьев. Все уровни. Свой коврик. Завершение — медитация у пруда.",
            "uk": "Ранкова віньяса-флоу в центральному парку Берліна — практика серед трояндових садів та вікових дерев. Усі рівні. Свій килимок. Завершення — медитація біля ставка.",
            "es": "Vinyasa flow matutino en el parque central de Berlín — práctica entre rosales y árboles centenarios. Todos los niveles bienvenidos. Trae tu propia esterilla. La sesión termina con meditación guiada junto al estanque.",
        },
    },
    # 15. Berlin Art Week Preview — Gallery Walk
    {
        "iso_local": "2026-06-15 14:00",
        "duration_minutes": 240,
        "category": "museums",
        "address": "Auguststraße, Mitte, Berlin",
        "venue_short": "Auguststraße galleries, Mitte",
        "lat": 52.5250,
        "lng": 13.3960,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.berlinartweek.de",
        "source_label": "berlinartweek.de",
        "photos": ["https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&q=80"],
        "titles": {
            "en": "Berlin Art Week Preview — Gallery Walk",
            "de": "Berlin Art Week Vorschau — Galerierundgang",
            "ru": "Превью Berlin Art Week — прогулка по галереям",
            "uk": "Прев'ю Berlin Art Week — прогулянка галереями",
            "es": "Avance de Berlin Art Week — Paseo por galerías",
        },
        "bodies": {
            "en": "Self-guided gallery walk along Auguststraße — Berlin's gallery mile opens doors for a preview of upcoming exhibitions. Contemporary art, installations, and artist talks in over 20 galleries.",
            "de": "Selbstgeführter Galerierundgang entlang der Auguststraße — Berlins Galeriemeile öffnet die Türen für eine Vorschau kommender Ausstellungen. Zeitgenössische Kunst, Installationen und Künstlergespräche in über 20 Galerien.",
            "ru": "Самостоятельная прогулка по галереям Auguststraße — галерейная миля Берлина открывает двери для превью предстоящих выставок. Современное искусство, инсталляции и беседы с художниками в более чем 20 галереях.",
            "uk": "Самостійна прогулянка галереями Auguststraße — галерейна миля Берліна відчиняє двері для прев'ю майбутніх виставок. Сучасне мистецтво, інсталяції та бесіди з художниками у понад 20 галереях.",
            "es": "Paseo autoguiado por las galerías de Auguststraße — la milla de galerías de Berlín abre sus puertas para un avance de próximas exposiciones. Arte contemporáneo, instalaciones y charlas con artistas en más de 20 galerías.",
        },
    },
    # 16. Craft Beer Tour — Kreuzberg Breweries
    {
        "iso_local": "2026-05-30 16:00",
        "duration_minutes": 180,
        "category": "craft-beer",
        "address": "Meeting point: U-Bhf Kottbusser Tor, Kreuzberg, Berlin",
        "venue_short": "Kreuzberg breweries",
        "lat": 52.4950,
        "lng": 13.4180,
        "is_free": False,
        "price": 35,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/berlin-craft-beer",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tour — Kreuzberg Breweries",
            "de": "Craft-Beer-Tour — Kreuzberger Brauereien",
            "ru": "Крафтовый пивной тур — пивоварни Кройцберга",
            "uk": "Крафтовий пивний тур — пивоварні Кройцберга",
            "es": "Tour de cerveza artesanal — Cervecerías de Kreuzberg",
        },
        "bodies": {
            "en": "Guided tour of three Kreuzberg microbreweries — taste 8 different craft beers, learn about Berlin's brewing renaissance, and meet the brewers. Includes tasting notes and a pretzel at each stop.",
            "de": "Geführte Tour durch drei Kreuzberger Mikrobrauereien — 8 verschiedene Craft-Biere probieren, Berlins Brau-Renaissance kennenlernen und die Brauer treffen. Inklusive Verkostungsnotizen und Brezel an jeder Station.",
            "ru": "Экскурсия по трём микропивоварням Кройцберга — дегустация 8 сортов крафтового пива, рассказ о пивном ренессансе Берлина и знакомство с пивоварами. Включает заметки и брецель на каждой остановке.",
            "uk": "Екскурсія трьома мікропивоварнями Кройцберга — дегустація 8 сортів крафтового пива, розповідь про пивний ренесанс Берліна та знайомство з пивоварами. Включає нотатки та брецель на кожній зупинці.",
            "es": "Tour guiado por tres microcervecerías de Kreuzberg — degusta 8 cervezas artesanales diferentes, conoce el renacimiento cervecero de Berlín y a los cerveceros. Incluye notas de cata y pretzel en cada parada.",
        },
    },
    # 17. Salsa Open Air at Monbijoupark
    {
        "iso_local": "2026-06-08 19:00",
        "duration_minutes": 240,
        "category": "dancing",
        "address": "Monbijoupark, Oranienburger Straße, Mitte, Berlin",
        "venue_short": "Monbijoupark, Mitte",
        "lat": 52.5230,
        "lng": 13.3960,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en", "es"],
        "source_url": "https://www.meetup.com/berlin-salsa",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Salsa Open Air at Monbijoupark",
            "de": "Salsa Open Air im Monbijoupark",
            "ru": "Сальса на открытом воздухе в Монбижупарке",
            "uk": "Сальса просто неба в Монбіжупарку",
            "es": "Salsa al aire libre en Monbijoupark",
        },
        "bodies": {
            "en": "Free open-air salsa dancing by the Spree river — beginner lesson at 19:00, then social dancing until 23:00. Bring your dancing shoes and enjoy the sunset over Museum Island. No partner needed.",
            "de": "Kostenlose Open-Air-Salsa an der Spree — Anfängerkurs um 19:00, dann Social Dancing bis 23:00. Tanzschuhe mitbringen und den Sonnenuntergang über der Museumsinsel genießen. Kein Partner nötig.",
            "ru": "Бесплатная сальса на открытом воздухе у Шпрее — урок для начинающих в 19:00, затем социальные танцы до 23:00. Берите танцевальную обувь и наслаждайтесь закатом над Музейным островом. Без пары.",
            "uk": "Безкоштовна сальса просто неба біля Шпрее — урок для початківців о 19:00, потім соціальні танці до 23:00. Беріть танцювальне взуття та насолоджуйтесь заходом сонця над Музейним островом. Без пари.",
            "es": "Salsa gratuita al aire libre junto al río Spree — clase para principiantes a las 19:00, luego baile social hasta las 23:00. Trae tus zapatos de baile y disfruta el atardecer sobre la Isla de los Museos. Sin pareja necesaria.",
        },
    },
    # 18. Expat Meetup at St. Oberholz
    {
        "iso_local": "2026-06-04 19:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "St. Oberholz, Rosenthaler Straße 72a, Mitte, Berlin",
        "venue_short": "St. Oberholz, Mitte",
        "lat": 52.5290,
        "lng": 13.4100,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "de"],
        "source_url": "https://www.meetup.com/berlin-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup at St. Oberholz",
            "de": "Expat-Meetup im St. Oberholz",
            "ru": "Встреча экспатов в St. Oberholz",
            "uk": "Зустріч експатів у St. Oberholz",
            "es": "Meetup de expatriados en St. Oberholz",
        },
        "bodies": {
            "en": "Casual networking evening for internationals in Berlin — meet fellow expats, freelancers, and digital nomads at the iconic St. Oberholz café. Icebreaker games, free first drink, and good conversations.",
            "de": "Lockerer Networking-Abend für Internationale in Berlin — andere Expats, Freelancer und digitale Nomaden im ikonischen St. Oberholz treffen. Icebreaker-Spiele, erstes Getränk gratis und gute Gespräche.",
            "ru": "Непринуждённый нетворкинг для иностранцев в Берлине — знакомьтесь с экспатами, фрилансерами и цифровыми кочевниками в культовом кафе St. Oberholz. Игры-айсбрейкеры, первый напиток бесплатно.",
            "uk": "Невимушений нетворкінг для іноземців у Берліні — знайомтесь з експатами, фрілансерами та цифровими кочівниками в культовому кафе St. Oberholz. Ігри-айсбрейкери, перший напій безкоштовно.",
            "es": "Networking informal para internacionales en Berlín — conoce a otros expatriados, freelancers y nómadas digitales en el icónico café St. Oberholz. Juegos para romper el hielo, primera bebida gratis y buenas conversaciones.",
        },
    },
    # 19. Cooking Class — Turkish Cuisine in Kreuzberg
    {
        "iso_local": "2026-06-09 18:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Kochhaus Kreuzberg, Bergmannstraße 20, Berlin",
        "venue_short": "Kochhaus, Kreuzberg",
        "lat": 52.4950,
        "lng": 13.4180,
        "is_free": False,
        "price": 55,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.kochhaus.de",
        "source_label": "kochhaus.de",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Cooking Class — Turkish Cuisine in Kreuzberg",
            "de": "Kochkurs — Türkische Küche in Kreuzberg",
            "ru": "Кулинарный мастер-класс — турецкая кухня в Кройцберге",
            "uk": "Кулінарний майстер-клас — турецька кухня в Кройцберзі",
            "es": "Clase de cocina — Cocina turca en Kreuzberg",
        },
        "bodies": {
            "en": "Hands-on Turkish cooking class in the heart of Little Istanbul — learn to make lahmacun, manti, and baklava from scratch. Includes all ingredients, recipes to take home, and a shared dinner with wine.",
            "de": "Praktischer türkischer Kochkurs im Herzen von Klein-Istanbul — Lahmacun, Manti und Baklava von Grund auf lernen. Inklusive aller Zutaten, Rezepte zum Mitnehmen und gemeinsames Abendessen mit Wein.",
            "ru": "Практический мастер-класс турецкой кухни в сердце Маленького Стамбула — лахмаджун, манты и пахлава с нуля. Все ингредиенты, рецепты с собой и совместный ужин с вином.",
            "uk": "Практичний майстер-клас турецької кухні в серці Маленького Стамбула — лахмаджун, манти та пахлава з нуля. Усі інгредієнти, рецепти з собою та спільна вечеря з вином.",
            "es": "Clase práctica de cocina turca en el corazón del Pequeño Estambul — aprende a hacer lahmacun, manti y baklava desde cero. Incluye todos los ingredientes, recetas para llevar y cena compartida con vino.",
        },
    },
    # 20. Boat Tour — Spree River Sunset
    {
        "iso_local": "2026-06-14 19:30",
        "duration_minutes": 120,
        "category": "guided-tours",
        "address": "Anlegestelle East Side Gallery, Mühlenstraße, Friedrichshain, Berlin",
        "venue_short": "East Side Gallery pier, Friedrichshain",
        "lat": 52.5020,
        "lng": 13.4490,
        "is_free": False,
        "price": 22,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.stern-und-kreisschiffahrt.de",
        "source_label": "stern-und-kreisschiffahrt.de",
        "photos": ["https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80"],
        "titles": {
            "en": "Boat Tour — Spree River Sunset",
            "de": "Bootstour — Sonnenuntergang auf der Spree",
            "ru": "Прогулка на катере — закат на Шпрее",
            "uk": "Прогулянка на катері — захід сонця на Шпрее",
            "es": "Paseo en barco — Atardecer en el río Spree",
        },
        "bodies": {
            "en": "Evening boat cruise along the Spree — pass the Reichstag, Museum Island, and Berlin Cathedral as the sun sets. Drinks available on board. A relaxing way to see Berlin's landmarks from the water.",
            "de": "Abendliche Bootsfahrt auf der Spree — vorbei am Reichstag, der Museumsinsel und dem Berliner Dom bei Sonnenuntergang. Getränke an Bord. Eine entspannte Art, Berlins Wahrzeichen vom Wasser aus zu sehen.",
            "ru": "Вечерний круиз по Шпрее — мимо Рейхстага, Музейного острова и Берлинского собора на закате. Напитки на борту. Расслабляющий способ увидеть достопримечательности Берлина с воды.",
            "uk": "Вечірній круїз Шпрее — повз Рейхстаг, Музейний острів та Берлінський собор на заході сонця. Напої на борту. Розслаблюючий спосіб побачити визначні місця Берліна з води.",
            "es": "Crucero nocturno por el río Spree — pasa por el Reichstag, la Isla de los Museos y la Catedral de Berlín al atardecer. Bebidas disponibles a bordo. Una forma relajante de ver los monumentos de Berlín desde el agua.",
        },
    },
    # 21. Photography Walk — East Side Gallery
    {
        "iso_local": "2026-05-28 17:00",
        "duration_minutes": 150,
        "category": "photography",
        "address": "East Side Gallery, Mühlenstraße, Friedrichshain, Berlin",
        "venue_short": "East Side Gallery, Friedrichshain",
        "lat": 52.5050,
        "lng": 13.4390,
        "is_free": False,
        "price": 12,
        "currency": "EUR",
        "languages": ["en", "de"],
        "source_url": "https://www.meetup.com/berlin-photography-walks",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1560968292-2e48b48a5b1e?w=800&q=80"],
        "titles": {
            "en": "Photography Walk — East Side Gallery",
            "de": "Fotospaziergang — East Side Gallery",
            "ru": "Фотопрогулка — East Side Gallery",
            "uk": "Фотопрогулянка — East Side Gallery",
            "es": "Paseo fotográfico — East Side Gallery",
        },
        "bodies": {
            "en": "Golden-hour photography walk along the longest remaining section of the Berlin Wall. Capture iconic murals, Spree river reflections, and urban street art. Tips on composition and storytelling from a local photographer.",
            "de": "Golden-Hour-Fotospaziergang entlang des längsten erhaltenen Abschnitts der Berliner Mauer. Ikonische Wandbilder, Spree-Reflexionen und urbane Street Art einfangen. Tipps zu Komposition und Storytelling von einem lokalen Fotografen.",
            "ru": "Фотопрогулка в золотой час вдоль самого длинного сохранившегося участка Берлинской стены. Культовые муралы, отражения Шпрее и уличное искусство. Советы по композиции и сторителлингу от местного фотографа.",
            "uk": "Фотопрогулянка в золоту годину вздовж найдовшої збереженої ділянки Берлінського муру. Культові мурали, відображення Шпрее та вуличне мистецтво. Поради з композиції та сторітелінгу від місцевого фотографа.",
            "es": "Paseo fotográfico en la hora dorada a lo largo de la sección más larga del Muro de Berlín. Captura murales icónicos, reflejos del río Spree y arte urbano. Consejos de composición de un fotógrafo local.",
        },
    },
    # 22. Board Games at Spielwiese
    {
        "iso_local": "2026-06-11 19:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Spielwiese, Kopernikusstraße 24, Friedrichshain, Berlin",
        "venue_short": "Spielwiese, Friedrichshain",
        "lat": 52.5130,
        "lng": 13.4540,
        "is_free": False,
        "price": 5,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.spielwiese-berlin.de",
        "source_label": "spielwiese-berlin.de",
        "photos": ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80"],
        "titles": {
            "en": "Board Games at Spielwiese",
            "de": "Brettspiele in der Spielwiese",
            "ru": "Настольные игры в Spielwiese",
            "uk": "Настільні ігри в Spielwiese",
            "es": "Juegos de mesa en Spielwiese",
        },
        "bodies": {
            "en": "Board game night at Berlin's coziest game café — over 2,000 games to choose from. Staff recommendations for groups of any size. Grab a craft beer, find your table, and play until closing time.",
            "de": "Brettspielabend in Berlins gemütlichstem Spielecafé — über 2.000 Spiele zur Auswahl. Empfehlungen vom Personal für Gruppen jeder Größe. Craft Beer holen, Tisch finden und bis zur Sperrstunde spielen.",
            "ru": "Вечер настольных игр в самом уютном игровом кафе Берлина — более 2 000 игр на выбор. Рекомендации персонала для групп любого размера. Крафтовое пиво, свой столик и игры до закрытия.",
            "uk": "Вечір настільних ігор у найзатишнішому ігровому кафе Берліна — понад 2 000 ігор на вибір. Рекомендації персоналу для груп будь-якого розміру. Крафтове пиво, свій столик та ігри до закриття.",
            "es": "Noche de juegos de mesa en el café de juegos más acogedor de Berlín — más de 2.000 juegos para elegir. Recomendaciones del personal para grupos de cualquier tamaño. Cerveza artesanal y juegos hasta el cierre.",
        },
    },
    # 23. Jazz at A-Trane Club
    {
        "iso_local": "2026-06-18 21:00",
        "duration_minutes": 180,
        "category": "music",
        "address": "A-Trane, Bleibtreustraße 1, Charlottenburg, Berlin",
        "venue_short": "A-Trane, Charlottenburg",
        "lat": 52.5070,
        "lng": 13.3250,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.a-trane.de",
        "source_label": "a-trane.de",
        "photos": ["https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80"],
        "titles": {
            "en": "Jazz at A-Trane Club",
            "de": "Jazz im A-Trane Club",
            "ru": "Джаз в клубе A-Trane",
            "uk": "Джаз у клубі A-Trane",
            "es": "Jazz en el Club A-Trane",
        },
        "bodies": {
            "en": "Live jazz at Berlin's legendary A-Trane club in Charlottenburg — intimate venue with world-class musicians. Two sets of modern jazz, bebop, and improvisation in a classic smoky-bar atmosphere.",
            "de": "Live-Jazz in Berlins legendärem A-Trane Club in Charlottenburg — intimer Veranstaltungsort mit Weltklasse-Musikern. Zwei Sets Modern Jazz, Bebop und Improvisation in klassischer Bar-Atmosphäre.",
            "ru": "Живой джаз в легендарном берлинском клубе A-Trane в Шарлоттенбурге — камерная площадка с музыкантами мирового класса. Два сета современного джаза, бибопа и импровизации в классической атмосфере.",
            "uk": "Живий джаз у легендарному берлінському клубі A-Trane в Шарлоттенбурзі — камерний майданчик зі світовими музикантами. Два сети сучасного джазу, бібопу та імпровізації в класичній атмосфері.",
            "es": "Jazz en vivo en el legendario club A-Trane de Berlín en Charlottenburg — local íntimo con músicos de clase mundial. Dos sets de jazz moderno, bebop e improvisación en una atmósfera clásica de bar.",
        },
    },
    # 24. Stand-Up Comedy in English at Comedy Café
    {
        "iso_local": "2026-06-17 20:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "Comedy Café Berlin, Rosenthaler Straße 9, Mitte, Berlin",
        "venue_short": "Comedy Café, Mitte",
        "lat": 52.5250,
        "lng": 13.4050,
        "is_free": False,
        "price": 12,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.comedycafeberlin.com",
        "source_label": "comedycafeberlin.com",
        "photos": ["https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80"],
        "titles": {
            "en": "Stand-Up Comedy in English at Comedy Café",
            "de": "Stand-Up-Comedy auf Englisch im Comedy Café",
            "ru": "Стендап на английском в Comedy Café",
            "uk": "Стендап англійською в Comedy Café",
            "es": "Stand-Up Comedy en inglés en Comedy Café",
        },
        "bodies": {
            "en": "English-language stand-up comedy night — five international comedians perform sets about life in Berlin, dating disasters, and cultural misunderstandings. The perfect midweek laugh for the expat crowd.",
            "de": "Englischsprachiger Stand-Up-Comedy-Abend — fünf internationale Comedians mit Sets über das Leben in Berlin, Dating-Katastrophen und kulturelle Missverständnisse. Der perfekte Mittwochslacher für die Expat-Szene.",
            "ru": "Вечер стендапа на английском — пять международных комиков с номерами о жизни в Берлине, провалах на свиданиях и культурных недоразумениях. Идеальный смех посреди недели для экспатов.",
            "uk": "Вечір стендапу англійською — п'ять міжнародних коміків із номерами про життя в Берліні, провали на побаченнях та культурні непорозуміння. Ідеальний сміх посеред тижня для експатів.",
            "es": "Noche de stand-up en inglés — cinco comediantes internacionales con sets sobre la vida en Berlín, desastres en citas y malentendidos culturales. La risa perfecta entre semana para la comunidad expatriada.",
        },
    },
    # 25. Tempelhofer Feld Kite Festival
    {
        "iso_local": "2026-06-21 11:00",
        "duration_minutes": 360,
        "category": "other",
        "address": "Tempelhofer Feld, Eingang Columbiadamm, Berlin",
        "venue_short": "Tempelhofer Feld, Tempelhof",
        "lat": 52.4730,
        "lng": 13.4010,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.gruen-berlin.de/tempelhofer-feld",
        "source_label": "gruen-berlin.de",
        "photos": ["https://images.unsplash.com/photo-1601550934748-0b0c2e0e3e0e?w=800&q=80"],
        "titles": {
            "en": "Tempelhofer Feld Kite Festival",
            "de": "Drachenfest auf dem Tempelhofer Feld",
            "ru": "Фестиваль воздушных змеев на Темпельхофском поле",
            "uk": "Фестиваль повітряних зміїв на Темпельхофському полі",
            "es": "Festival de cometas en Tempelhofer Feld",
        },
        "bodies": {
            "en": "Annual kite festival on Berlin's former airport field — giant art kites, stunt kite demonstrations, and workshops for kids. Bring your own kite or build one on site. Food trucks and live music.",
            "de": "Jährliches Drachenfest auf dem ehemaligen Flughafengelände — riesige Kunstdrachen, Stunt-Kite-Vorführungen und Workshops für Kinder. Eigenen Drachen mitbringen oder vor Ort bauen. Food Trucks und Live-Musik.",
            "ru": "Ежегодный фестиваль воздушных змеев на бывшем аэродроме — гигантские арт-змеи, демонстрации трюковых змеев и мастер-классы для детей. Свой змей или сборка на месте. Фуд-траки и живая музыка.",
            "uk": "Щорічний фестиваль повітряних зміїв на колишньому аеродромі — гігантські арт-змії, демонстрації трюкових зміїв та майстер-класи для дітей. Свій змій або збірка на місці. Фуд-траки та жива музика.",
            "es": "Festival anual de cometas en el antiguo aeródromo — cometas artísticas gigantes, demostraciones de cometas acrobáticas y talleres para niños. Trae tu propia cometa o construye una allí. Food trucks y música en vivo.",
        },
    },
    # 26. Badeschiff — Swimming & DJ Session
    {
        "iso_local": "2026-06-20 14:00",
        "duration_minutes": 420,
        "category": "music",
        "address": "Badeschiff, Eichenstraße 4, Treptow, Berlin",
        "venue_short": "Badeschiff, Treptow",
        "lat": 52.4960,
        "lng": 13.4530,
        "is_free": False,
        "price": 8,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.arena.berlin/badeschiff",
        "source_label": "arena.berlin",
        "photos": ["https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80"],
        "titles": {
            "en": "Badeschiff — Swimming & DJ Session",
            "de": "Badeschiff — Schwimmen & DJ-Session",
            "ru": "Badeschiff — купание и DJ-сет",
            "uk": "Badeschiff — купання та DJ-сет",
            "es": "Badeschiff — Natación y sesión DJ",
        },
        "bodies": {
            "en": "Swim in a floating pool on the Spree river while DJs spin house and disco. Berlin's most unique summer spot — lounge on the sandy beach, cool off in the pool, and dance as the sun goes down.",
            "de": "Schwimmen im schwimmenden Pool auf der Spree, während DJs House und Disco auflegen. Berlins einzigartigster Sommerspot — am Sandstrand loungen, im Pool abkühlen und tanzen bis zum Sonnenuntergang.",
            "ru": "Купание в плавучем бассейне на Шпрее под хаус и диско от диджеев. Самое уникальное летнее место Берлина — лаунж на песчаном пляже, бассейн и танцы до заката.",
            "uk": "Купання в плавучому басейні на Шпрее під хаус та диско від діджеїв. Найунікальніше літнє місце Берліна — лаунж на піщаному пляжі, басейн та танці до заходу сонця.",
            "es": "Nada en una piscina flotante en el río Spree mientras los DJs ponen house y disco. El lugar de verano más único de Berlín — relájate en la playa de arena, refréscate en la piscina y baila al atardecer.",
        },
    },
    # 27. Botanical Garden Night — Illuminated Walk
    {
        "iso_local": "2026-06-13 21:00",
        "duration_minutes": 150,
        "category": "other",
        "address": "Botanischer Garten, Königin-Luise-Straße 6-8, Dahlem, Berlin",
        "venue_short": "Botanischer Garten, Dahlem",
        "lat": 52.4540,
        "lng": 13.3040,
        "is_free": False,
        "price": 20,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.bgbm.org",
        "source_label": "bgbm.org",
        "photos": ["https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80"],
        "titles": {
            "en": "Botanical Garden Night — Illuminated Walk",
            "de": "Botanische Nacht — Illuminierter Rundgang",
            "ru": "Ночь в Ботаническом саду — иллюминированная прогулка",
            "uk": "Ніч у Ботанічному саду — ілюмінована прогулянка",
            "es": "Noche en el Jardín Botánico — Paseo iluminado",
        },
        "bodies": {
            "en": "Magical evening walk through Berlin's Botanical Garden illuminated by thousands of lights. Live music at garden stages, tropical greenhouse tours, and cocktails among exotic plants. A midsummer night's dream.",
            "de": "Magischer Abendspaziergang durch den Botanischen Garten, illuminiert von Tausenden Lichtern. Live-Musik auf Gartenbühnen, Tropenhaus-Führungen und Cocktails zwischen exotischen Pflanzen. Ein Mittsommernachtstraum.",
            "ru": "Волшебная вечерняя прогулка по Ботаническому саду Берлина в тысячах огней. Живая музыка на садовых сценах, экскурсии по тропическим оранжереям и коктейли среди экзотических растений.",
            "uk": "Чарівна вечірня прогулянка Ботанічним садом Берліна в тисячах вогнів. Жива музика на садових сценах, екскурсії тропічними оранжереями та коктейлі серед екзотичних рослин.",
            "es": "Paseo nocturno mágico por el Jardín Botánico de Berlín iluminado por miles de luces. Música en vivo en escenarios del jardín, tours por invernaderos tropicales y cócteles entre plantas exóticas.",
        },
    },
    # 28. Currywurst Tour — Berlin's Iconic Snack
    {
        "iso_local": "2026-05-29 12:00",
        "duration_minutes": 150,
        "category": "food-tours",
        "address": "Meeting point: U-Bhf Stadtmitte, Mitte, Berlin",
        "venue_short": "Mitte / Kreuzberg",
        "lat": 52.5070,
        "lng": 13.3810,
        "is_free": False,
        "price": 28,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.meetup.com/berlin-food-tours",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=80"],
        "titles": {
            "en": "Currywurst Tour — Berlin's Iconic Snack",
            "de": "Currywurst-Tour — Berlins ikonischer Snack",
            "ru": "Тур по карривурсту — культовый берлинский перекус",
            "uk": "Тур по карівурсту — культовий берлінський перекус",
            "es": "Tour de Currywurst — El snack icónico de Berlín",
        },
        "bodies": {
            "en": "Walking food tour visiting Berlin's best currywurst stands — taste five different styles from classic to gourmet. Learn the history of Berlin's most famous street food and the secret behind the perfect sauce.",
            "de": "Kulinarischer Spaziergang zu Berlins besten Currywurst-Ständen — fünf verschiedene Stile von klassisch bis Gourmet probieren. Die Geschichte von Berlins berühmtestem Street Food und das Geheimnis der perfekten Soße.",
            "ru": "Пешая гастрономическая экскурсия по лучшим точкам карривурста в Берлине — пять стилей от классики до гурме. История самого знаменитого стрит-фуда Берлина и секрет идеального соуса.",
            "uk": "Піша гастрономічна екскурсія найкращими точками карівурсту в Берліні — п'ять стилів від класики до гурме. Історія найвідомішого стріт-фуду Берліна та секрет ідеального соусу.",
            "es": "Tour gastronómico a pie por los mejores puestos de currywurst de Berlín — prueba cinco estilos diferentes, del clásico al gourmet. Conoce la historia del street food más famoso de Berlín y el secreto de la salsa perfecta.",
        },
    },
    # 29. Techno Yoga at Sisyphos
    {
        "iso_local": "2026-06-22 10:00",
        "duration_minutes": 120,
        "category": "yoga",
        "address": "Sisyphos, Hauptstraße 15, Rummelsburg, Berlin",
        "venue_short": "Sisyphos, Rummelsburg",
        "lat": 52.4930,
        "lng": 13.4960,
        "is_free": False,
        "price": 18,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.sisyphos-berlin.net",
        "source_label": "sisyphos-berlin.net",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Techno Yoga at Sisyphos",
            "de": "Techno Yoga im Sisyphos",
            "ru": "Техно-йога в Sisyphos",
            "uk": "Техно-йога в Sisyphos",
            "es": "Techno Yoga en Sisyphos",
        },
        "bodies": {
            "en": "Yoga meets Berlin techno culture — a vinyasa flow session set to deep, minimal beats in the outdoor garden of legendary club Sisyphos. Move, breathe, and find your flow in this uniquely Berlin experience.",
            "de": "Yoga trifft Berliner Techno-Kultur — eine Vinyasa-Flow-Session zu tiefen, minimalen Beats im Außengarten des legendären Clubs Sisyphos. Bewegen, atmen und den Flow finden in diesem einzigartigen Berlin-Erlebnis.",
            "ru": "Йога встречает берлинскую техно-культуру — виньяса-флоу под глубокие минимальные биты в саду легендарного клуба Sisyphos. Двигайтесь, дышите и найдите свой поток в этом уникальном берлинском опыте.",
            "uk": "Йога зустрічає берлінську техно-культуру — віньяса-флоу під глибокі мінімальні біти в саду легендарного клубу Sisyphos. Рухайтесь, дихайте та знайдіть свій потік у цьому унікальному берлінському досвіді.",
            "es": "El yoga se encuentra con la cultura techno de Berlín — una sesión de vinyasa flow con beats profundos y minimalistas en el jardín del legendario club Sisyphos. Muévete, respira y encuentra tu flow.",
        },
    },
    # 30. Pergamon Museum — Guided Tour
    {
        "iso_local": "2026-06-16 11:00",
        "duration_minutes": 120,
        "category": "museums",
        "address": "Pergamonmuseum, Bodestraße 1-3, Museumsinsel, Berlin",
        "venue_short": "Pergamon Museum, Museum Island",
        "lat": 52.5210,
        "lng": 13.3970,
        "is_free": False,
        "price": 19,
        "currency": "EUR",
        "languages": ["de", "en"],
        "source_url": "https://www.smb.museum/museen-einrichtungen/pergamonmuseum",
        "source_label": "smb.museum",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Pergamon Museum — Guided Tour",
            "de": "Pergamonmuseum — Führung",
            "ru": "Пергамский музей — экскурсия с гидом",
            "uk": "Пергамський музей — екскурсія з гідом",
            "es": "Museo de Pérgamo — Visita guiada",
        },
        "bodies": {
            "en": "Expert-led guided tour of the Pergamon Museum — explore the Ishtar Gate, the Market Gate of Miletus, and ancient Near Eastern artifacts. One of the world's most important archaeological collections on Museum Island.",
            "de": "Expertenführung durch das Pergamonmuseum — das Ischtar-Tor, das Markttor von Milet und altorientalische Artefakte erkunden. Eine der wichtigsten archäologischen Sammlungen der Welt auf der Museumsinsel.",
            "ru": "Экскурсия с экспертом по Пергамскому музею — ворота Иштар, Рыночные ворота Милета и артефакты Древнего Востока. Одна из важнейших археологических коллекций мира на Музейном острове.",
            "uk": "Екскурсія з експертом Пергамським музеєм — ворота Іштар, Ринкові ворота Мілета та артефакти Стародавнього Сходу. Одна з найважливіших археологічних колекцій світу на Музейному острові.",
            "es": "Visita guiada por expertos del Museo de Pérgamo — explora la Puerta de Ishtar, la Puerta del Mercado de Mileto y artefactos del Antiguo Oriente. Una de las colecciones arqueológicas más importantes del mundo.",
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
            "city": "Berlin",
            "city_id": BERLIN_CITY_ID,
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
