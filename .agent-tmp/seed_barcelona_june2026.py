#!/usr/bin/env python3
"""
Seed 30 system events in Barcelona for May 22 – June 30, 2026.

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
  exec(open('.agent-tmp/seed_barcelona_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
BARCELONA_CITY_ID = "bb3849b7-17ae-450f-93ab-12b2c8a0765d"
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

LANG_ORDER = ["en", "es", "de", "ru", "uk"]
LANG_LABEL = {
    "en": "English",
    "es": "Español",
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
    # 1. Primavera Sound 2026 — Day 1
    {
        "iso_local": "2026-06-04 16:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Parc del Fòrum, Sant Adrià de Besòs, Barcelona",
        "venue_short": "Parc del Fòrum",
        "lat": 41.4100,
        "lng": 2.2280,
        "is_free": False,
        "price": 85,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.primaverasound.com",
        "source_label": "primaverasound.com",
        "photos": ["https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80"],
        "titles": {
            "en": "Primavera Sound 2026 — Day 1",
            "es": "Primavera Sound 2026 — Día 1",
            "de": "Primavera Sound 2026 — Tag 1",
            "ru": "Primavera Sound 2026 — день 1",
            "uk": "Primavera Sound 2026 — день 1",
        },
        "bodies": {
            "en": "Opening day of Primavera Sound at Parc del Fòrum with headliners across multiple stages. Europe's premier indie and alternative music festival kicks off with a stellar lineup and Mediterranean sea breeze.",
            "es": "Día inaugural del Primavera Sound en el Parc del Fòrum con cabezas de cartel en múltiples escenarios. El principal festival indie y alternativo de Europa arranca con un cartel estelar y brisa mediterránea.",
            "de": "Eröffnungstag des Primavera Sound im Parc del Fòrum mit Headlinern auf mehreren Bühnen. Europas führendes Indie- und Alternative-Festival startet mit einem erstklassigen Line-up und Meeresbrise.",
            "ru": "Первый день Primavera Sound в Parc del Fòrum — хедлайнеры на нескольких сценах. Главный инди- и альтернативный фестиваль Европы стартует со звёздным лайнапом и средиземноморским бризом.",
            "uk": "Перший день Primavera Sound у Parc del Fòrum — хедлайнери на кількох сценах. Головний інді- та альтернативний фестиваль Європи стартує із зірковим лайнапом і середземноморським бризом.",
        },
    },
    # 2. Primavera Sound 2026 — Day 2
    {
        "iso_local": "2026-06-05 16:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Parc del Fòrum, Sant Adrià de Besòs, Barcelona",
        "venue_short": "Parc del Fòrum",
        "lat": 41.4100,
        "lng": 2.2280,
        "is_free": False,
        "price": 85,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.primaverasound.com",
        "source_label": "primaverasound.com",
        "photos": ["https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80"],
        "titles": {
            "en": "Primavera Sound 2026 — Day 2",
            "es": "Primavera Sound 2026 — Día 2",
            "de": "Primavera Sound 2026 — Tag 2",
            "ru": "Primavera Sound 2026 — день 2",
            "uk": "Primavera Sound 2026 — день 2",
        },
        "bodies": {
            "en": "Day two of Primavera Sound features electronic and hip-hop acts on the night stages, plus daytime sessions with emerging artists. Food trucks, vinyl market, and chill-out zones by the waterfront.",
            "es": "El segundo día del Primavera Sound presenta actos electrónicos y de hip-hop en los escenarios nocturnos, además de sesiones diurnas con artistas emergentes. Food trucks, mercado de vinilos y zonas chill junto al mar.",
            "de": "Tag zwei des Primavera Sound bietet Electronic- und Hip-Hop-Acts auf den Nachtbühnen sowie Tagessessions mit aufstrebenden Künstlern. Food Trucks, Vinyl-Markt und Chill-out-Zonen am Wasser.",
            "ru": "Второй день Primavera Sound — электроника и хип-хоп на ночных сценах, дневные сессии с начинающими артистами. Фуд-траки, виниловый маркет и зоны отдыха у воды.",
            "uk": "Другий день Primavera Sound — електроніка та хіп-хоп на нічних сценах, денні сесії з початківцями. Фуд-траки, вініловий маркет і зони відпочинку біля води.",
        },
    },
    # 3. Primavera Sound 2026 — Day 3
    {
        "iso_local": "2026-06-06 16:00",
        "duration_minutes": 600,
        "category": "music",
        "address": "Parc del Fòrum, Sant Adrià de Besòs, Barcelona",
        "venue_short": "Parc del Fòrum",
        "lat": 41.4100,
        "lng": 2.2280,
        "is_free": False,
        "price": 85,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.primaverasound.com",
        "source_label": "primaverasound.com",
        "photos": ["https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80"],
        "titles": {
            "en": "Primavera Sound 2026 — Day 3",
            "es": "Primavera Sound 2026 — Día 3",
            "de": "Primavera Sound 2026 — Tag 3",
            "ru": "Primavera Sound 2026 — день 3",
            "uk": "Primavera Sound 2026 — день 3",
        },
        "bodies": {
            "en": "Closing day of Primavera Sound 2026 — surprise headliner, acoustic sessions at the Auditori stage, and a grand finale set overlooking the Mediterranean at sunrise.",
            "es": "Día de clausura del Primavera Sound 2026 — cabeza de cartel sorpresa, sesiones acústicas en el escenario Auditori y un set final con vistas al Mediterráneo al amanecer.",
            "de": "Abschlusstag des Primavera Sound 2026 — Überraschungs-Headliner, Akustik-Sessions auf der Auditori-Bühne und ein großes Finale mit Blick aufs Mittelmeer bei Sonnenaufgang.",
            "ru": "Заключительный день Primavera Sound 2026 — сюрприз-хедлайнер, акустические сессии на сцене Auditori и грандиозный финальный сет с видом на Средиземное море на рассвете.",
            "uk": "Заключний день Primavera Sound 2026 — сюрприз-хедлайнер, акустичні сесії на сцені Auditori та грандіозний фінальний сет з видом на Середземне море на світанку.",
        },
    },
    # 4. Sónar Festival — Day
    {
        "iso_local": "2026-06-18 12:00",
        "duration_minutes": 540,
        "category": "music",
        "address": "Fira Montjuïc, Avinguda de la Reina Maria Cristina, Barcelona",
        "venue_short": "Fira Montjuïc",
        "lat": 41.3720,
        "lng": 2.1530,
        "is_free": False,
        "price": 65,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://sonar.es",
        "source_label": "sonar.es",
        "photos": ["https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80"],
        "titles": {
            "en": "Sónar Festival — Day",
            "es": "Sónar Festival — Día",
            "de": "Sónar Festival — Tag",
            "ru": "Sónar Festival — дневная программа",
            "uk": "Sónar Festival — денна програма",
        },
        "bodies": {
            "en": "Sónar by Day at Fira Montjuïc — showcases, talks, and live performances exploring the intersection of music, creativity, and technology. Interactive installations and emerging artist showcases.",
            "es": "Sónar de Día en Fira Montjuïc — showcases, charlas y actuaciones en vivo que exploran la intersección de música, creatividad y tecnología. Instalaciones interactivas y artistas emergentes.",
            "de": "Sónar by Day in der Fira Montjuïc — Showcases, Talks und Live-Performances an der Schnittstelle von Musik, Kreativität und Technologie. Interaktive Installationen und aufstrebende Künstler.",
            "ru": "Sónar by Day в Fira Montjuïc — шоукейсы, лекции и живые выступления на стыке музыки, креативности и технологий. Интерактивные инсталляции и начинающие артисты.",
            "uk": "Sónar by Day у Fira Montjuïc — шоукейси, лекції та живі виступи на перетині музики, креативності й технологій. Інтерактивні інсталяції та початківці.",
        },
    },
    # 5. Sónar Festival — Night
    {
        "iso_local": "2026-06-18 22:00",
        "duration_minutes": 480,
        "category": "music",
        "address": "Fira Gran Via, Av. Joan Carles I, L'Hospitalet de Llobregat",
        "venue_short": "Fira Gran Via, L'Hospitalet",
        "lat": 41.3560,
        "lng": 2.1270,
        "is_free": False,
        "price": 75,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://sonar.es",
        "source_label": "sonar.es",
        "photos": ["https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80"],
        "titles": {
            "en": "Sónar Festival — Night",
            "es": "Sónar Festival — Noche",
            "de": "Sónar Festival — Nacht",
            "ru": "Sónar Festival — ночная программа",
            "uk": "Sónar Festival — нічна програма",
        },
        "bodies": {
            "en": "Sónar by Night at Fira Gran Via — massive electronic music stages with world-class DJs and live acts. Techno, house, bass music, and experimental sounds until dawn.",
            "es": "Sónar de Noche en Fira Gran Via — escenarios masivos de música electrónica con DJs y actos en vivo de primer nivel. Techno, house, bass music y sonidos experimentales hasta el amanecer.",
            "de": "Sónar by Night in der Fira Gran Via — riesige Bühnen für elektronische Musik mit erstklassigen DJs und Live-Acts. Techno, House, Bass Music und experimentelle Klänge bis zum Morgengrauen.",
            "ru": "Sónar by Night в Fira Gran Via — масштабные сцены электронной музыки с мировыми диджеями и лайв-актами. Техно, хаус, бас-музыка и экспериментальные звуки до рассвета.",
            "uk": "Sónar by Night у Fira Gran Via — масштабні сцени електронної музики зі світовими діджеями та лайв-актами. Техно, хаус, бас-музика та експериментальні звуки до світанку.",
        },
    },
    # 6. Sant Joan Night — Bonfires on the Beach
    {
        "iso_local": "2026-06-23 21:00",
        "duration_minutes": 360,
        "category": "other",
        "address": "Platja de la Barceloneta, Passeig Marítim, Barcelona",
        "venue_short": "Barceloneta Beach",
        "lat": 41.3780,
        "lng": 2.1920,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.barcelona.cat/culturapopular/en/festivals-and-traditions/sant-joan",
        "source_label": "barcelona.cat",
        "photos": ["https://images.unsplash.com/photo-1475738198235-4b30fc29c7e3?w=800&q=80"],
        "titles": {
            "en": "Sant Joan Night — Bonfires on the Beach",
            "es": "Noche de Sant Joan — Hogueras en la playa",
            "de": "Sant-Joan-Nacht — Lagerfeuer am Strand",
            "ru": "Ночь Сан-Жоан — костры на пляже",
            "uk": "Ніч Сан-Жоан — вогнища на пляжі",
        },
        "bodies": {
            "en": "Barcelona's most magical night — bonfires, fireworks, and celebrations on Barceloneta Beach to welcome the summer solstice. Bring cava, jump over flames, and swim at midnight. A city-wide tradition.",
            "es": "La noche más mágica de Barcelona — hogueras, fuegos artificiales y celebraciones en la playa de la Barceloneta para dar la bienvenida al solsticio de verano. Trae cava, salta las llamas y báñate a medianoche.",
            "de": "Barcelonas magischste Nacht — Lagerfeuer, Feuerwerk und Feiern am Strand der Barceloneta zur Sommersonnenwende. Cava mitbringen, über Flammen springen und um Mitternacht schwimmen.",
            "ru": "Самая волшебная ночь Барселоны — костры, фейерверки и празднования на пляже Барселонета в честь летнего солнцестояния. Берите каву, прыгайте через огонь и купайтесь в полночь.",
            "uk": "Найчарівніша ніч Барселони — вогнища, феєрверки та святкування на пляжі Барселонета на честь літнього сонцестояння. Беріть каву, стрибайте через вогонь і купайтеся опівночі.",
        },
    },
    # 7. Grec Festival Opening — Teatre Grec
    {
        "iso_local": "2026-06-28 21:30",
        "duration_minutes": 120,
        "category": "theater",
        "address": "Teatre Grec, Passeig de Santa Madrona 36, Montjuïc",
        "venue_short": "Teatre Grec, Montjuïc",
        "lat": 41.3680,
        "lng": 2.1590,
        "is_free": False,
        "price": 25,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.barcelona.cat/grec",
        "source_label": "barcelona.cat/grec",
        "photos": ["https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80"],
        "titles": {
            "en": "Grec Festival Opening — Teatre Grec",
            "es": "Inauguración del Festival Grec — Teatre Grec",
            "de": "Grec Festival Eröffnung — Teatre Grec",
            "ru": "Открытие фестиваля Grec — Teatre Grec",
            "uk": "Відкриття фестивалю Grec — Teatre Grec",
        },
        "bodies": {
            "en": "Opening night of Barcelona's summer performing arts festival at the open-air Greek amphitheatre on Montjuïc hill. Dance, theater, and music under the stars in a stunning ancient-style venue.",
            "es": "Noche inaugural del festival de artes escénicas de verano de Barcelona en el anfiteatro griego al aire libre en la colina de Montjuïc. Danza, teatro y música bajo las estrellas.",
            "de": "Eröffnungsabend von Barcelonas Sommer-Performing-Arts-Festival im griechischen Freilichtamphitheater auf dem Montjuïc. Tanz, Theater und Musik unter den Sternen.",
            "ru": "Открытие летнего фестиваля исполнительских искусств Барселоны в греческом амфитеатре под открытым небом на холме Монжуик. Танец, театр и музыка под звёздами.",
            "uk": "Відкриття літнього фестивалю виконавських мистецтв Барселони у грецькому амфітеатрі просто неба на пагорбі Монжуїк. Танець, театр і музика під зірками.",
        },
    },
    # 8. Balloon Story — Immersive Exhibition
    {
        "iso_local": "2026-06-01 10:00",
        "duration_minutes": 480,
        "category": "museums",
        "address": "Espacio Inmersa, Carrer de Pallars 85, Poblenou, Barcelona",
        "venue_short": "Espacio Inmersa, Poblenou",
        "lat": 41.4030,
        "lng": 2.2160,
        "is_free": False,
        "price": 16,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.espacioinmersa.com",
        "source_label": "espacioinmersa.com",
        "photos": ["https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80"],
        "titles": {
            "en": "Balloon Story — Immersive Exhibition",
            "es": "Balloon Story — Exposición inmersiva",
            "de": "Balloon Story — Immersive Ausstellung",
            "ru": "Balloon Story — иммерсивная выставка",
            "uk": "Balloon Story — імерсивна виставка",
        },
        "bodies": {
            "en": "Walk through rooms filled with thousands of illuminated balloons in this Instagram-worthy immersive art experience. Light, color, and sound installations create dreamlike environments across 10 themed spaces.",
            "es": "Recorre salas llenas de miles de globos iluminados en esta experiencia artística inmersiva. Instalaciones de luz, color y sonido crean ambientes oníricos en 10 espacios temáticos.",
            "de": "Durchschreiten Sie Räume voller tausender beleuchteter Ballons in diesem immersiven Kunsterlebnis. Licht-, Farb- und Klanginstallationen schaffen traumhafte Umgebungen in 10 thematischen Räumen.",
            "ru": "Пройдите через залы с тысячами подсвеченных воздушных шаров в этом иммерсивном арт-опыте. Инсталляции света, цвета и звука создают сказочные пространства в 10 тематических залах.",
            "uk": "Пройдіть через зали з тисячами підсвічених повітряних кульок у цьому імерсивному арт-досвіді. Інсталяції світла, кольору та звуку створюють казкові простори у 10 тематичних залах.",
        },
    },
    # 9. Steve McCurry Photography Exhibition
    {
        "iso_local": "2026-05-30 10:00",
        "duration_minutes": 480,
        "category": "photography",
        "address": "Centre de Cultura Contemporània de Barcelona (CCCB), Montalegre 5",
        "venue_short": "CCCB, El Raval",
        "lat": 41.3850,
        "lng": 2.1750,
        "is_free": False,
        "price": 14,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.cccb.org",
        "source_label": "cccb.org",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {
            "en": "Steve McCurry Photography Exhibition",
            "es": "Exposición de fotografía de Steve McCurry",
            "de": "Steve McCurry Fotoausstellung",
            "ru": "Фотовыставка Стива Маккарри",
            "uk": "Фотовиставка Стіва Маккаррі",
        },
        "bodies": {
            "en": "Retrospective exhibition of Steve McCurry's iconic photojournalism — from the Afghan Girl to vibrant street scenes across Asia. Over 150 large-format prints in the stunning CCCB courtyard galleries.",
            "es": "Exposición retrospectiva del icónico fotoperiodismo de Steve McCurry — desde la Niña Afgana hasta vibrantes escenas callejeras de Asia. Más de 150 impresiones de gran formato en las galerías del CCCB.",
            "de": "Retrospektive Ausstellung von Steve McCurrys ikonischem Fotojournalismus — vom Afghanischen Mädchen bis zu lebhaften Straßenszenen in Asien. Über 150 Großformatdrucke in den CCCB-Galerien.",
            "ru": "Ретроспективная выставка культовой фотожурналистики Стива Маккарри — от «Афганской девочки» до ярких уличных сцен Азии. Более 150 крупноформатных отпечатков в галереях CCCB.",
            "uk": "Ретроспективна виставка культової фотожурналістики Стіва Маккаррі — від «Афганської дівчинки» до яскравих вуличних сцен Азії. Понад 150 великоформатних відбитків у галереях CCCB.",
        },
    },
    # 10. Nit dels Museus — Night of Museums
    {
        "iso_local": "2026-05-24 19:00",
        "duration_minutes": 360,
        "category": "museums",
        "address": "Various museums, Barcelona",
        "venue_short": "Various museums, Barcelona",
        "lat": 41.3874,
        "lng": 2.1686,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.barcelona.cat/museus",
        "source_label": "barcelona.cat",
        "photos": ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80"],
        "titles": {
            "en": "Nit dels Museus — Night of Museums",
            "es": "Nit dels Museus — Noche de los Museos",
            "de": "Nit dels Museus — Nacht der Museen",
            "ru": "Nit dels Museus — Ночь музеев",
            "uk": "Nit dels Museus — Ніч музеїв",
        },
        "bodies": {
            "en": "Barcelona's museums open their doors for free after dark with special exhibitions, live performances, and guided tours. Over 70 participating venues across the city — from Picasso Museum to MACBA.",
            "es": "Los museos de Barcelona abren sus puertas gratis por la noche con exposiciones especiales, actuaciones en vivo y visitas guiadas. Más de 70 espacios participantes — del Museo Picasso al MACBA.",
            "de": "Barcelonas Museen öffnen nach Einbruch der Dunkelheit kostenlos mit Sonderausstellungen, Live-Performances und Führungen. Über 70 teilnehmende Orte — vom Picasso-Museum bis zum MACBA.",
            "ru": "Музеи Барселоны бесплатно открывают двери после наступления темноты — специальные выставки, живые выступления и экскурсии. Более 70 площадок — от Музея Пикассо до MACBA.",
            "uk": "Музеї Барселони безкоштовно відчиняють двері після настання темряви — спеціальні виставки, живі виступи та екскурсії. Понад 70 майданчиків — від Музею Пікассо до MACBA.",
        },
    },
    # 11. Feria de Abril at Parc del Fòrum
    {
        "iso_local": "2026-05-22 18:00",
        "duration_minutes": 420,
        "category": "dancing",
        "address": "Parc del Fòrum, Sant Adrià de Besòs, Barcelona",
        "venue_short": "Parc del Fòrum",
        "lat": 41.4100,
        "lng": 2.2280,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es"],
        "source_url": "https://www.feriadeabrilbcn.com",
        "source_label": "feriadeabrilbcn.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Feria de Abril at Parc del Fòrum",
            "es": "Feria de Abril en el Parc del Fòrum",
            "de": "Feria de Abril im Parc del Fòrum",
            "ru": "Feria de Abril в Parc del Fòrum",
            "uk": "Feria de Abril у Parc del Fòrum",
        },
        "bodies": {
            "en": "Barcelona's Andalusian fair — flamenco dancing, sevillanas, tapas, rebujito, and casetas (decorated tents). A vibrant celebration of southern Spanish culture with live music and horse parades.",
            "es": "La feria andaluza de Barcelona — flamenco, sevillanas, tapas, rebujito y casetas decoradas. Una vibrante celebración de la cultura del sur de España con música en vivo y desfiles de caballos.",
            "de": "Barcelonas andalusische Messe — Flamenco, Sevillanas, Tapas, Rebujito und Casetas (dekorierte Zelte). Eine lebhafte Feier südspanischer Kultur mit Live-Musik und Pferdeparaden.",
            "ru": "Андалусская ярмарка Барселоны — фламенко, севильяны, тапас, ребухито и касетас (украшенные шатры). Яркий праздник южноиспанской культуры с живой музыкой и конными парадами.",
            "uk": "Андалуська ярмарка Барселони — фламенко, севільяни, тапас, ребухіто та касетас (прикрашені намети). Яскраве свято південноіспанської культури з живою музикою та кінними парадами.",
        },
    },
    # 12. Primavera a la Ciutat — Free Concerts
    {
        "iso_local": "2026-06-01 20:00",
        "duration_minutes": 180,
        "category": "music",
        "address": "Various venues, Barcelona",
        "venue_short": "Various venues, Barcelona",
        "lat": 41.3874,
        "lng": 2.1686,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.primaverasound.com/ciutat",
        "source_label": "primaverasound.com",
        "photos": ["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80"],
        "titles": {
            "en": "Primavera a la Ciutat — Free Concerts",
            "es": "Primavera a la Ciutat — Conciertos gratuitos",
            "de": "Primavera a la Ciutat — Gratiskonzerte",
            "ru": "Primavera a la Ciutat — бесплатные концерты",
            "uk": "Primavera a la Ciutat — безкоштовні концерти",
        },
        "bodies": {
            "en": "Free concerts across Barcelona's venues as part of Primavera Sound's city programme. Discover emerging artists in intimate settings — bars, cultural centres, and open-air plazas throughout the week.",
            "es": "Conciertos gratuitos en locales de Barcelona como parte del programa urbano del Primavera Sound. Descubre artistas emergentes en espacios íntimos — bares, centros culturales y plazas al aire libre.",
            "de": "Gratiskonzerte in Barcelonas Venues als Teil des Stadtprogramms von Primavera Sound. Entdecken Sie aufstrebende Künstler in intimen Settings — Bars, Kulturzentren und Freiluftplätze die ganze Woche.",
            "ru": "Бесплатные концерты по всей Барселоне в рамках городской программы Primavera Sound. Откройте начинающих артистов в камерных пространствах — барах, культурных центрах и площадях.",
            "uk": "Безкоштовні концерти по всій Барселоні в рамках міської програми Primavera Sound. Відкрийте початківців у камерних просторах — барах, культурних центрах і площах.",
        },
    },
    # 13. Beach Volleyball Tournament — Barceloneta
    {
        "iso_local": "2026-06-07 10:00",
        "duration_minutes": 480,
        "category": "other",
        "address": "Platja de la Barceloneta, Barcelona",
        "venue_short": "Barceloneta Beach",
        "lat": 41.3780,
        "lng": 2.1920,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.barcelona.cat/esports",
        "source_label": "barcelona.cat",
        "photos": ["https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80"],
        "titles": {
            "en": "Beach Volleyball Tournament — Barceloneta",
            "es": "Torneo de vóley playa — Barceloneta",
            "de": "Beachvolleyball-Turnier — Barceloneta",
            "ru": "Турнир по пляжному волейболу — Барселонета",
            "uk": "Турнір з пляжного волейболу — Барселонета",
        },
        "bodies": {
            "en": "Open beach volleyball tournament on Barceloneta Beach — teams of all levels welcome. Sign up on-site or come watch the matches with music, food stalls, and a festive beach atmosphere.",
            "es": "Torneo abierto de vóley playa en la Barceloneta — equipos de todos los niveles bienvenidos. Inscríbete en el lugar o ven a ver los partidos con música, puestos de comida y ambiente festivo.",
            "de": "Offenes Beachvolleyball-Turnier am Barceloneta-Strand — Teams aller Niveaus willkommen. Vor Ort anmelden oder Spiele anschauen mit Musik, Essensständen und festlicher Strandatmosphäre.",
            "ru": "Открытый турнир по пляжному волейболу на Барселонете — команды любого уровня. Регистрация на месте или приходите смотреть матчи с музыкой, едой и праздничной атмосферой.",
            "uk": "Відкритий турнір з пляжного волейболу на Барселонеті — команди будь-якого рівня. Реєстрація на місці або приходьте дивитися матчі з музикою, їжею та святковою атмосферою.",
        },
    },
    # 14. Yoga at Sunrise — Barceloneta Beach
    {
        "iso_local": "2026-05-25 06:30",
        "duration_minutes": 75,
        "category": "yoga",
        "address": "Platja de la Barceloneta, Barcelona",
        "venue_short": "Barceloneta Beach",
        "lat": 41.3780,
        "lng": 2.1920,
        "is_free": False,
        "price": 12,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.meetup.com/barcelona-yoga",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga at Sunrise — Barceloneta Beach",
            "es": "Yoga al amanecer — Playa de la Barceloneta",
            "de": "Yoga bei Sonnenaufgang — Barceloneta-Strand",
            "ru": "Йога на рассвете — пляж Барселонета",
            "uk": "Йога на світанку — пляж Барселонета",
        },
        "bodies": {
            "en": "Start your Sunday with a vinyasa flow session on the sand as the sun rises over the Mediterranean. All levels welcome. Bring your own mat or rent one on-site. Ends with a guided meditation.",
            "es": "Empieza tu domingo con una sesión de vinyasa flow en la arena mientras el sol sale sobre el Mediterráneo. Todos los niveles. Trae tu esterilla o alquila una. Termina con meditación guiada.",
            "de": "Starten Sie Ihren Sonntag mit einer Vinyasa-Flow-Session im Sand bei Sonnenaufgang über dem Mittelmeer. Alle Niveaus willkommen. Eigene Matte mitbringen oder vor Ort mieten.",
            "ru": "Начните воскресенье с виньяса-флоу на песке на рассвете над Средиземным морем. Все уровни. Принесите свой коврик или арендуйте на месте. Завершение — медитация.",
            "uk": "Почніть неділю з віньяса-флоу на піску на світанку над Середземним морем. Усі рівні. Принесіть свій килимок або орендуйте на місці. Завершення — медитація.",
        },
    },
    # 15. Language Exchange at Travel Bar
    {
        "iso_local": "2026-06-03 20:00",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Travel Bar, Carrer de Boqueria 27, El Gòtic, Barcelona",
        "venue_short": "Travel Bar, El Gòtic",
        "lat": 41.3830,
        "lng": 2.1770,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "es", "de"],
        "source_url": "https://www.meetup.com/barcelona-language-exchange",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange at Travel Bar",
            "es": "Intercambio de idiomas en Travel Bar",
            "de": "Sprachtandem in der Travel Bar",
            "ru": "Языковой обмен в Travel Bar",
            "uk": "Мовний обмін у Travel Bar",
        },
        "bodies": {
            "en": "Weekly language exchange in the Gothic Quarter — practice Spanish, English, German, French, and more over drinks. Colour-coded tables by language. Friendly international crowd, no sign-up needed.",
            "es": "Intercambio de idiomas semanal en el Barrio Gótico — practica español, inglés, alemán, francés y más tomando algo. Mesas por colores según idioma. Ambiente internacional, sin inscripción.",
            "de": "Wöchentlicher Sprachtandem im Gotischen Viertel — Spanisch, Englisch, Deutsch, Französisch und mehr bei Drinks üben. Farbcodierte Tische nach Sprache. Internationales Publikum, keine Anmeldung nötig.",
            "ru": "Еженедельный языковой обмен в Готическом квартале — практикуйте испанский, английский, немецкий, французский за напитками. Столы по цветам для каждого языка. Без регистрации.",
            "uk": "Щотижневий мовний обмін у Готичному кварталі — практикуйте іспанську, англійську, німецьку, французьку за напоями. Столи за кольорами для кожної мови. Без реєстрації.",
        },
    },
    # 16. Tapas & Wine Walking Tour — El Born
    {
        "iso_local": "2026-05-29 19:00",
        "duration_minutes": 180,
        "category": "food-tours",
        "address": "Plaça de Santa Maria, El Born, Barcelona",
        "venue_short": "El Born district",
        "lat": 41.3850,
        "lng": 2.1830,
        "is_free": False,
        "price": 45,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.devourbarcelonafoodtours.com",
        "source_label": "devourbarcelonafoodtours.com",
        "photos": ["https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80"],
        "titles": {
            "en": "Tapas & Wine Walking Tour — El Born",
            "es": "Ruta de tapas y vinos — El Born",
            "de": "Tapas- & Wein-Rundgang — El Born",
            "ru": "Тапас и вино — пешая экскурсия по Эль-Борн",
            "uk": "Тапас і вино — пішохідна екскурсія по Ель-Борн",
        },
        "bodies": {
            "en": "Guided walking tour through El Born's best tapas bars — sample patatas bravas, jamón ibérico, croquetas, and local wines. Visit 4 authentic spots with a local foodie guide. Small group, max 12.",
            "es": "Ruta guiada por los mejores bares de tapas de El Born — prueba patatas bravas, jamón ibérico, croquetas y vinos locales. Visita 4 locales auténticos con un guía gastronómico. Grupo reducido, máx. 12.",
            "de": "Geführter Rundgang durch El Borns beste Tapas-Bars — Patatas Bravas, Jamón Ibérico, Kroketten und lokale Weine probieren. 4 authentische Lokale mit einem Food-Guide. Kleine Gruppe, max. 12.",
            "ru": "Пешая экскурсия по лучшим тапас-барам Эль-Борна — пататас бравас, хамон иберико, крокеты и местные вина. 4 аутентичных заведения с гидом-гурманом. Малая группа, макс. 12.",
            "uk": "Пішохідна екскурсія найкращими тапас-барами Ель-Борна — пататас бравас, хамон іберіко, крокети та місцеві вина. 4 автентичні заклади з гідом-гурманом. Мала група, макс. 12.",
        },
    },
    # 17. Flamenco Night at Tablao Cordobés
    {
        "iso_local": "2026-06-10 21:00",
        "duration_minutes": 90,
        "category": "dancing",
        "address": "Tablao Cordobés, La Rambla 35, Barcelona",
        "venue_short": "Tablao Cordobés, La Rambla",
        "lat": 41.3810,
        "lng": 2.1740,
        "is_free": False,
        "price": 49,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.tablaocordobes.com",
        "source_label": "tablaocordobes.com",
        "photos": ["https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800&q=80"],
        "titles": {
            "en": "Flamenco Night at Tablao Cordobés",
            "es": "Noche de flamenco en Tablao Cordobés",
            "de": "Flamenco-Abend im Tablao Cordobés",
            "ru": "Вечер фламенко в Tablao Cordobés",
            "uk": "Вечір фламенко в Tablao Cordobés",
        },
        "bodies": {
            "en": "Authentic flamenco show on La Rambla — passionate guitar, cante jondo singing, and mesmerizing dance by award-winning performers. Optional tapas dinner before the show. An unforgettable Andalusian experience.",
            "es": "Espectáculo de flamenco auténtico en La Rambla — guitarra apasionada, cante jondo y baile hipnótico de artistas premiados. Cena de tapas opcional antes del show. Una experiencia andaluza inolvidable.",
            "de": "Authentische Flamenco-Show auf der Rambla — leidenschaftliche Gitarre, Cante Jondo und fesselnder Tanz preisgekrönter Künstler. Optionales Tapas-Dinner vor der Show.",
            "ru": "Аутентичное фламенко-шоу на Рамбле — страстная гитара, канте хондо и завораживающий танец отмеченных наградами артистов. Опциональный тапас-ужин перед шоу.",
            "uk": "Автентичне фламенко-шоу на Рамблі — пристрасна гітара, канте хондо та зачаровуючий танець нагороджених артистів. Опціональна тапас-вечеря перед шоу.",
        },
    },
    # 18. Rooftop Cinema at Hotel Pulitzer
    {
        "iso_local": "2026-06-12 21:30",
        "duration_minutes": 150,
        "category": "cinema",
        "address": "Hotel Pulitzer, Carrer de Bergara 8, Barcelona",
        "venue_short": "Hotel Pulitzer rooftop",
        "lat": 41.3880,
        "lng": 2.1680,
        "is_free": False,
        "price": 18,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.hotelpulitzer.es",
        "source_label": "hotelpulitzer.es",
        "photos": ["https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80"],
        "titles": {
            "en": "Rooftop Cinema at Hotel Pulitzer",
            "es": "Cine en la azotea del Hotel Pulitzer",
            "de": "Dachkino im Hotel Pulitzer",
            "ru": "Кино на крыше Hotel Pulitzer",
            "uk": "Кіно на даху Hotel Pulitzer",
        },
        "bodies": {
            "en": "Open-air cinema on the Hotel Pulitzer rooftop terrace — classic film screening with city skyline views. Includes a welcome drink and popcorn. Limited to 50 seats, book in advance.",
            "es": "Cine al aire libre en la terraza del Hotel Pulitzer — proyección de película clásica con vistas al skyline. Incluye bebida de bienvenida y palomitas. Limitado a 50 plazas, reserva con antelación.",
            "de": "Open-Air-Kino auf der Dachterrasse des Hotel Pulitzer — Filmvorführung mit Blick auf die Skyline. Willkommensgetränk und Popcorn inklusive. Begrenzt auf 50 Plätze, Voranmeldung nötig.",
            "ru": "Кино под открытым небом на крыше Hotel Pulitzer — показ классического фильма с видом на город. Включает приветственный напиток и попкорн. Лимит 50 мест, бронируйте заранее.",
            "uk": "Кіно просто неба на даху Hotel Pulitzer — показ класичного фільму з видом на місто. Включає вітальний напій і попкорн. Ліміт 50 місць, бронюйте заздалегідь.",
        },
    },
    # 19. Expat Meetup at Dow Jones Bar
    {
        "iso_local": "2026-06-05 20:30",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Dow Jones Bar, Carrer del Bruc 97, Eixample, Barcelona",
        "venue_short": "Dow Jones Bar, Eixample",
        "lat": 41.3830,
        "lng": 2.1770,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.meetup.com/barcelona-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup at Dow Jones Bar",
            "es": "Encuentro de expatriados en Dow Jones Bar",
            "de": "Expat-Treffen in der Dow Jones Bar",
            "ru": "Встреча экспатов в Dow Jones Bar",
            "uk": "Зустріч експатів у Dow Jones Bar",
        },
        "bodies": {
            "en": "Casual networking event for Barcelona's international community — meet fellow expats, digital nomads, and locals over drinks. Fluctuating drink prices based on demand (stock-market themed bar). No sign-up needed.",
            "es": "Evento de networking informal para la comunidad internacional de Barcelona — conoce a otros expatriados, nómadas digitales y locales. Precios de bebidas fluctuantes (bar temático de bolsa). Sin inscripción.",
            "de": "Lockeres Networking-Event für Barcelonas internationale Community — Expats, digitale Nomaden und Einheimische bei Drinks treffen. Schwankende Getränkepreise (Börsen-Themenbar). Keine Anmeldung nötig.",
            "ru": "Неформальная встреча международного сообщества Барселоны — экспаты, цифровые кочевники и местные за напитками. Цены на напитки колеблются как на бирже (тематический бар). Без регистрации.",
            "uk": "Неформальна зустріч міжнародної спільноти Барселони — експати, цифрові кочівники та місцеві за напоями. Ціни на напої коливаються як на біржі (тематичний бар). Без реєстрації.",
        },
    },
    # 20. Sailing Experience — Port Olímpic
    {
        "iso_local": "2026-06-14 10:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Port Olímpic, Moll de Gregal, Barcelona",
        "venue_short": "Port Olímpic",
        "lat": 41.3870,
        "lng": 2.2010,
        "is_free": False,
        "price": 55,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.sailingbarcelona.com",
        "source_label": "sailingbarcelona.com",
        "photos": ["https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=800&q=80"],
        "titles": {
            "en": "Sailing Experience — Port Olímpic",
            "es": "Experiencia de navegación — Port Olímpic",
            "de": "Segelerlebnis — Port Olímpic",
            "ru": "Парусный опыт — Port Olímpic",
            "uk": "Вітрильний досвід — Port Olímpic",
        },
        "bodies": {
            "en": "Three-hour sailing trip from Port Olímpic along the Barcelona coastline. Learn basic sailing skills, enjoy the skyline from the sea, and swim in a secluded cove. Includes drinks and snacks on board.",
            "es": "Paseo en velero de tres horas desde el Port Olímpic por la costa de Barcelona. Aprende navegación básica, disfruta del skyline desde el mar y báñate en una cala. Incluye bebidas y snacks a bordo.",
            "de": "Dreistündiger Segeltörn vom Port Olímpic entlang der Küste Barcelonas. Grundlagen des Segelns lernen, Skyline vom Meer genießen und in einer Bucht schwimmen. Getränke und Snacks an Bord inklusive.",
            "ru": "Трёхчасовая прогулка на яхте из Port Olímpic вдоль побережья Барселоны. Основы парусного спорта, вид на город с моря и купание в уединённой бухте. Напитки и снеки на борту.",
            "uk": "Тригодинна прогулянка на яхті з Port Olímpic вздовж узбережжя Барселони. Основи вітрильного спорту, вид на місто з моря та купання у затишній бухті. Напої та снеки на борту.",
        },
    },
    # 21. Paella Cooking Class — La Boqueria area
    {
        "iso_local": "2026-06-08 11:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Espai Boqueria, La Rambla 91, Barcelona",
        "venue_short": "Espai Boqueria, La Rambla",
        "lat": 41.3820,
        "lng": 2.1720,
        "is_free": False,
        "price": 65,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.espaiboqueria.com",
        "source_label": "espaiboqueria.com",
        "photos": ["https://images.unsplash.com/photo-1515516969-d4008cc6241a?w=800&q=80"],
        "titles": {
            "en": "Paella Cooking Class — La Boqueria area",
            "es": "Clase de paella — zona de La Boqueria",
            "de": "Paella-Kochkurs — La Boqueria Gegend",
            "ru": "Мастер-класс по паэлье — район La Boqueria",
            "uk": "Майстер-клас з паельї — район La Boqueria",
        },
        "bodies": {
            "en": "Learn to cook authentic Valencian paella with a local chef — market visit to La Boqueria for fresh ingredients, hands-on cooking, and a shared meal with sangria. Vegetarian option available.",
            "es": "Aprende a cocinar una auténtica paella valenciana con un chef local — visita al mercado de La Boqueria, cocina práctica y comida compartida con sangría. Opción vegetariana disponible.",
            "de": "Lernen Sie authentische valencianische Paella mit einem lokalen Koch — Marktbesuch in La Boqueria, praktisches Kochen und gemeinsames Essen mit Sangría. Vegetarische Option verfügbar.",
            "ru": "Научитесь готовить аутентичную валенсийскую паэлью с местным шефом — визит на рынок La Boqueria, практика и совместный обед с сангрией. Вегетарианский вариант доступен.",
            "uk": "Навчіться готувати автентичну валенсійську паелью з місцевим шефом — візит на ринок La Boqueria, практика та спільний обід із сангрією. Вегетаріанський варіант доступний.",
        },
    },
    # 22. Running Group — Montjuïc Hill
    {
        "iso_local": "2026-05-31 07:30",
        "duration_minutes": 75,
        "category": "running",
        "address": "Plaça d'Espanya (meeting point), Montjuïc, Barcelona",
        "venue_short": "Montjuïc Hill",
        "lat": 41.3640,
        "lng": 2.1580,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.meetup.com/barcelona-running",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Running Group — Montjuïc Hill",
            "es": "Grupo de running — Montjuïc",
            "de": "Laufgruppe — Montjuïc-Hügel",
            "ru": "Беговая группа — холм Монжуик",
            "uk": "Бігова група — пагорб Монжуїк",
        },
        "bodies": {
            "en": "Saturday morning trail run up Montjuïc — 8 km route past the castle, Olympic stadium, and botanical gardens with panoramic city views. All paces welcome, meet at Plaça d'Espanya fountain at 7:30.",
            "es": "Carrera matutina de trail por Montjuïc — ruta de 8 km pasando por el castillo, el estadio olímpico y los jardines botánicos con vistas panorámicas. Todos los ritmos, quedada en la fuente de Plaça d'Espanya.",
            "de": "Samstag-Morgen-Trailrun auf den Montjuïc — 8 km Route vorbei an Burg, Olympiastadion und Botanischem Garten mit Panoramablick. Alle Tempos willkommen, Treffpunkt Brunnen Plaça d'Espanya.",
            "ru": "Субботняя утренняя трейл-пробежка на Монжуик — 8 км мимо замка, Олимпийского стадиона и ботанического сада с панорамными видами. Любой темп, встреча у фонтана Plaça d'Espanya.",
            "uk": "Суботній ранковий трейл-забіг на Монжуїк — 8 км повз замок, Олімпійський стадіон і ботанічний сад з панорамними видами. Будь-який темп, зустріч біля фонтану Plaça d'Espanya.",
        },
    },
    # 23. Gaudí Architecture Tour
    {
        "iso_local": "2026-06-01 10:00",
        "duration_minutes": 180,
        "category": "guided-tours",
        "address": "Casa Batlló, Passeig de Gràcia 43, Barcelona",
        "venue_short": "Passeig de Gràcia",
        "lat": 41.4036,
        "lng": 2.1744,
        "is_free": False,
        "price": 35,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.casabatllo.es",
        "source_label": "casabatllo.es",
        "photos": ["https://images.unsplash.com/photo-1583779457711-ab081da03a4a?w=800&q=80"],
        "titles": {
            "en": "Gaudí Architecture Tour",
            "es": "Tour de arquitectura de Gaudí",
            "de": "Gaudí-Architektur-Tour",
            "ru": "Архитектурный тур по Гауди",
            "uk": "Архітектурний тур по Гауді",
        },
        "bodies": {
            "en": "Walking tour of Gaudí's masterpieces — Casa Batlló, Casa Milà (La Pedrera), and the Sagrada Família exterior. Expert guide explains modernisme, symbolism, and construction techniques. Skip-the-line at Casa Batlló.",
            "es": "Ruta a pie por las obras maestras de Gaudí — Casa Batlló, Casa Milà (La Pedrera) y exterior de la Sagrada Família. Guía experto explica modernismo, simbolismo y técnicas constructivas. Sin colas en Casa Batlló.",
            "de": "Rundgang zu Gaudís Meisterwerken — Casa Batlló, Casa Milà (La Pedrera) und Sagrada Família von außen. Expertenführung zu Modernisme, Symbolik und Bautechniken. Ohne Anstehen bei Casa Batlló.",
            "ru": "Пешая экскурсия по шедеврам Гауди — Casa Batlló, Casa Milà (La Pedrera) и Sagrada Família снаружи. Гид-эксперт расскажет о модернизме, символизме и строительных техниках. Без очереди в Casa Batlló.",
            "uk": "Пішохідна екскурсія шедеврами Гауді — Casa Batlló, Casa Milà (La Pedrera) та Sagrada Família ззовні. Гід-експерт розповість про модернізм, символізм і будівельні техніки. Без черги в Casa Batlló.",
        },
    },
    # 24. Craft Beer Crawl — Poblenou
    {
        "iso_local": "2026-06-15 18:00",
        "duration_minutes": 210,
        "category": "craft-beer",
        "address": "Rambla del Poblenou, Barcelona",
        "venue_short": "Poblenou district",
        "lat": 41.3970,
        "lng": 2.2010,
        "is_free": False,
        "price": 35,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.craftbeerbarcelona.com",
        "source_label": "craftbeerbarcelona.com",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Crawl — Poblenou",
            "es": "Ruta de cerveza artesanal — Poblenou",
            "de": "Craft-Beer-Tour — Poblenou",
            "ru": "Крафтовый пивной тур — Побленоу",
            "uk": "Крафтовий пивний тур — Побленоу",
        },
        "bodies": {
            "en": "Guided craft beer crawl through Poblenou's best breweries and taprooms — taste 8 local beers, learn about Barcelona's booming craft scene, and enjoy tapas pairings. Visit 4 venues in the creative district.",
            "es": "Ruta guiada de cerveza artesanal por las mejores cervecerías de Poblenou — prueba 8 cervezas locales, conoce la escena craft de Barcelona y disfruta de maridajes con tapas. 4 locales en el distrito creativo.",
            "de": "Geführte Craft-Beer-Tour durch Poblenous beste Brauereien — 8 lokale Biere probieren, Barcelonas boomende Craft-Szene kennenlernen und Tapas-Pairings genießen. 4 Lokale im Kreativviertel.",
            "ru": "Крафтовый пивной тур по лучшим пивоварням Побленоу — 8 местных сортов, знакомство с крафтовой сценой Барселоны и тапас-пейринги. 4 заведения в креативном районе.",
            "uk": "Крафтовий пивний тур найкращими пивоварнями Побленоу — 8 місцевих сортів, знайомство з крафтовою сценою Барселони та тапас-пейринги. 4 заклади у креативному районі.",
        },
    },
    # 25. Sunset DJ Session — W Hotel Terrace
    {
        "iso_local": "2026-06-20 19:00",
        "duration_minutes": 240,
        "category": "music",
        "address": "W Barcelona, Plaça de la Rosa dels Vents 1, Barcelona",
        "venue_short": "W Hotel terrace",
        "lat": 41.3680,
        "lng": 2.1890,
        "is_free": False,
        "price": 20,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.marriott.com/w-barcelona",
        "source_label": "w-barcelona.com",
        "photos": ["https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"],
        "titles": {
            "en": "Sunset DJ Session — W Hotel Terrace",
            "es": "Sesión DJ al atardecer — Terraza W Hotel",
            "de": "Sunset-DJ-Session — W Hotel Terrasse",
            "ru": "DJ-сессия на закате — терраса W Hotel",
            "uk": "DJ-сесія на заході — тераса W Hotel",
        },
        "bodies": {
            "en": "Sunset DJ session on the W Hotel's iconic terrace overlooking Barceloneta Beach. Deep house and balearic beats as the sun dips into the Mediterranean. Cocktails, sea breeze, and golden hour vibes.",
            "es": "Sesión DJ al atardecer en la icónica terraza del W Hotel con vistas a la playa de la Barceloneta. Deep house y ritmos baleáricos mientras el sol se pone en el Mediterráneo. Cócteles y brisa marina.",
            "de": "Sunset-DJ-Session auf der ikonischen Terrasse des W Hotels mit Blick auf den Barceloneta-Strand. Deep House und Balearic Beats bei Sonnenuntergang über dem Mittelmeer. Cocktails und Meeresbrise.",
            "ru": "DJ-сессия на закате на культовой террасе W Hotel с видом на пляж Барселонета. Дип-хаус и балеарские биты, пока солнце садится в Средиземное море. Коктейли и морской бриз.",
            "uk": "DJ-сесія на заході на культовій терасі W Hotel з видом на пляж Барселонета. Діп-хаус і балеарські біти, поки сонце сідає в Середземне море. Коктейлі та морський бриз.",
        },
    },
    # 26. Open-Air Salsa at Plaça Reial
    {
        "iso_local": "2026-06-22 20:00",
        "duration_minutes": 180,
        "category": "dancing",
        "address": "Plaça Reial, Barri Gòtic, Barcelona",
        "venue_short": "Plaça Reial",
        "lat": 41.3800,
        "lng": 2.1750,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/barcelona-salsa",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&q=80"],
        "titles": {
            "en": "Open-Air Salsa at Plaça Reial",
            "es": "Salsa al aire libre en Plaça Reial",
            "de": "Open-Air-Salsa auf der Plaça Reial",
            "ru": "Сальса под открытым небом на Plaça Reial",
            "uk": "Сальса просто неба на Plaça Reial",
        },
        "bodies": {
            "en": "Free open-air salsa dancing in Barcelona's most beautiful square — beginner lesson at 20:00, then social dancing until 23:00. Live band, palm trees, and Gaudí lampposts. No partner needed.",
            "es": "Salsa al aire libre gratis en la plaza más bonita de Barcelona — clase para principiantes a las 20:00, luego baile social hasta las 23:00. Banda en vivo, palmeras y farolas de Gaudí. Sin pareja necesaria.",
            "de": "Kostenlose Open-Air-Salsa auf Barcelonas schönstem Platz — Anfängerkurs um 20:00, dann Social Dancing bis 23:00. Live-Band, Palmen und Gaudí-Laternen. Kein Partner nötig.",
            "ru": "Бесплатная сальса под открытым небом на самой красивой площади Барселоны — урок для начинающих в 20:00, затем социальные танцы до 23:00. Живая группа, пальмы и фонари Гауди. Без пары.",
            "uk": "Безкоштовна сальса просто неба на найгарнішій площі Барселони — урок для початківців о 20:00, потім соціальні танці до 23:00. Жива група, пальми та ліхтарі Гауді. Без пари.",
        },
    },
    # 27. Barcelona Tech Meetup — Pier01
    {
        "iso_local": "2026-06-11 19:00",
        "duration_minutes": 150,
        "category": "startups",
        "address": "Pier01, Barcelona Tech City, Plaça de Pau Vila 1, Barcelona",
        "venue_short": "Pier01, Barceloneta",
        "lat": 41.3810,
        "lng": 2.1860,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/barcelona-tech",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"],
        "titles": {
            "en": "Barcelona Tech Meetup — Pier01",
            "es": "Meetup tecnológico de Barcelona — Pier01",
            "de": "Barcelona Tech Meetup — Pier01",
            "ru": "Технологический митап Барселоны — Pier01",
            "uk": "Технологічний мітап Барселони — Pier01",
        },
        "bodies": {
            "en": "Monthly tech meetup at Pier01 (Barcelona Tech City) — three lightning talks on AI, fintech, and sustainability startups, followed by networking with pizza and drinks. Open to founders, developers, and investors.",
            "es": "Meetup tecnológico mensual en Pier01 (Barcelona Tech City) — tres charlas relámpago sobre IA, fintech y startups de sostenibilidad, seguido de networking con pizza y bebidas. Abierto a fundadores, desarrolladores e inversores.",
            "de": "Monatliches Tech-Meetup im Pier01 (Barcelona Tech City) — drei Lightning Talks zu KI, Fintech und Nachhaltigkeits-Startups, danach Networking mit Pizza und Drinks. Offen für Gründer, Entwickler und Investoren.",
            "ru": "Ежемесячный технологический митап в Pier01 (Barcelona Tech City) — три блиц-доклада об ИИ, финтехе и стартапах устойчивого развития, затем нетворкинг с пиццей и напитками.",
            "uk": "Щомісячний технологічний мітап у Pier01 (Barcelona Tech City) — три бліц-доповіді про ШІ, фінтех і стартапи сталого розвитку, потім нетворкінг з піцою та напоями.",
        },
    },
    # 28. Skateboarding Workshop — MACBA
    {
        "iso_local": "2026-05-28 17:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "Plaça dels Àngels (MACBA), El Raval, Barcelona",
        "venue_short": "MACBA plaza, El Raval",
        "lat": 41.3830,
        "lng": 2.1670,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/barcelona-skate",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1564429238961-bf8f8be2a4c5?w=800&q=80"],
        "titles": {
            "en": "Skateboarding Workshop — MACBA",
            "es": "Taller de skate — MACBA",
            "de": "Skateboard-Workshop — MACBA",
            "ru": "Скейтборд-воркшоп — MACBA",
            "uk": "Скейтборд-воркшоп — MACBA",
        },
        "bodies": {
            "en": "Free skateboarding workshop at Barcelona's legendary MACBA plaza — learn basics or improve your tricks with local skaters. Boards available to borrow. All ages and levels welcome in this iconic skate spot.",
            "es": "Taller gratuito de skate en la legendaria plaza del MACBA — aprende lo básico o mejora tus trucos con skaters locales. Tablas disponibles para prestar. Todas las edades y niveles en este spot icónico.",
            "de": "Kostenloser Skateboard-Workshop auf dem legendären MACBA-Platz — Grundlagen lernen oder Tricks verbessern mit lokalen Skatern. Boards zum Ausleihen. Alle Altersgruppen und Niveaus willkommen.",
            "ru": "Бесплатный скейтборд-воркшоп на легендарной площади MACBA — основы или улучшение трюков с местными скейтерами. Доски можно взять напрокат. Все возрасты и уровни.",
            "uk": "Безкоштовний скейтборд-воркшоп на легендарній площі MACBA — основи або покращення трюків з місцевими скейтерами. Дошки можна взяти напрокат. Усі віки та рівні.",
        },
    },
    # 29. Outdoor Photography Walk — Gothic Quarter
    {
        "iso_local": "2026-06-16 18:00",
        "duration_minutes": 150,
        "category": "photography",
        "address": "Plaça de Sant Jaume (meeting point), Barri Gòtic, Barcelona",
        "venue_short": "Gothic Quarter",
        "lat": 41.3830,
        "lng": 2.1770,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.meetup.com/barcelona-photography",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80"],
        "titles": {
            "en": "Outdoor Photography Walk — Gothic Quarter",
            "es": "Paseo fotográfico — Barrio Gótico",
            "de": "Foto-Spaziergang — Gotisches Viertel",
            "ru": "Фотопрогулка — Готический квартал",
            "uk": "Фотопрогулянка — Готичний квартал",
        },
        "bodies": {
            "en": "Golden-hour photography walk through the Gothic Quarter — capture medieval architecture, hidden courtyards, and street life. Tips on composition, light, and street photography from a professional photographer.",
            "es": "Paseo fotográfico en la hora dorada por el Barrio Gótico — captura arquitectura medieval, patios escondidos y vida callejera. Consejos de composición, luz y fotografía urbana de un fotógrafo profesional.",
            "de": "Golden-Hour-Fotospaziergang durch das Gotische Viertel — mittelalterliche Architektur, versteckte Innenhöfe und Straßenleben einfangen. Tipps zu Komposition, Licht und Straßenfotografie von einem Profi.",
            "ru": "Фотопрогулка в золотой час по Готическому кварталу — средневековая архитектура, скрытые дворики и уличная жизнь. Советы по композиции, свету и стрит-фотографии от профессионала.",
            "uk": "Фотопрогулянка в золоту годину Готичним кварталом — середньовічна архітектура, приховані подвір'я та вуличне життя. Поради з композиції, світла та стріт-фотографії від професіонала.",
        },
    },
    # 30. Acoustic Music Night — Jamboree Jazz Club
    {
        "iso_local": "2026-06-25 21:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "Jamboree Jazz Club, Plaça Reial 17, Barcelona",
        "venue_short": "Jamboree Jazz Club, Plaça Reial",
        "lat": 41.3800,
        "lng": 2.1750,
        "is_free": False,
        "price": 15,
        "currency": "EUR",
        "languages": ["en", "es"],
        "source_url": "https://www.masimas.com/jamboree",
        "source_label": "masimas.com/jamboree",
        "photos": ["https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80"],
        "titles": {
            "en": "Acoustic Music Night — Jamboree Jazz Club",
            "es": "Noche de música acústica — Jamboree Jazz Club",
            "de": "Akustik-Musikabend — Jamboree Jazz Club",
            "ru": "Вечер акустической музыки — Jamboree Jazz Club",
            "uk": "Вечір акустичної музики — Jamboree Jazz Club",
        },
        "bodies": {
            "en": "Intimate acoustic music night in Barcelona's legendary jazz cellar beneath Plaça Reial. Singer-songwriters, jazz trios, and folk acts in a vaulted stone basement. Two sets with a break for drinks at the bar.",
            "es": "Noche íntima de música acústica en la legendaria bodega de jazz bajo la Plaça Reial. Cantautores, tríos de jazz y folk en un sótano abovedado de piedra. Dos pases con descanso para copas en el bar.",
            "de": "Intimer Akustik-Musikabend in Barcelonas legendärem Jazz-Keller unter der Plaça Reial. Singer-Songwriter, Jazz-Trios und Folk-Acts in einem Gewölbekeller. Zwei Sets mit Pause an der Bar.",
            "ru": "Камерный вечер акустической музыки в легендарном джаз-подвале под Plaça Reial. Авторы-исполнители, джаз-трио и фолк в каменном сводчатом подвале. Два сета с перерывом на напитки.",
            "uk": "Камерний вечір акустичної музики в легендарному джаз-підвалі під Plaça Reial. Автори-виконавці, джаз-тріо та фолк у кам'яному склепінчастому підвалі. Два сети з перервою на напої.",
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
            "city": "Barcelona",
            "city_id": BARCELONA_CITY_ID,
            "country": "ES",
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
