#!/usr/bin/env python3
"""
Seed 20 system events in Montevideo for May 22 – June 30, 2026.

Run after exporting NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:

  set -a && . .env.local && set +a
  python3 .agent-tmp/seed_montevideo_june2026.py

Re-running is idempotent: events are de-duplicated by exact title match.

NOTE: Montevideo is UTC-3 year-round (no DST). A local 20:00 = 23:00Z.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from typing import Any

# ---- Constants -------------------------------------------------------
# Montevideo city_id — must match the cities table row.
# If Montevideo doesn't exist yet, the script will look it up by name.
MONTEVIDEO_CITY_NAME = "Montevideo"
SYSTEM_ORGANIZER_ID = "acbb238e-f24f-4534-b92a-fa4bcfc7e07e"

CAT = {
    "music": "87186d0a-5631-4b30-863f-fabd5d8f74e4",
    "dancing": "a265eff9-ce91-417f-8780-493d024a9e85",
    "theater": "d98f41cf-ef9a-4472-b7cc-dc1f8c78f5e8",
    "museums": "d9b20fbf-7a7e-466b-acf5-1c379e6b94d6",
    "wine-tasting": "e6428a86-ac38-414a-988c-2ce103ae5b13",
    "food-tours": "c06ab503-5719-4c1c-bd8f-34828aa7ed5c",
    "guided-tours": "77d52bca-998b-4edd-bfb0-e71d5ee264c0",
    "networking": "71835799-4ffd-46b1-b6e5-f7fd9ebc11b6",
    "yoga": "d6602677-7e65-40a6-80c5-08500586edc3",
    "running": "eebf6066-7396-4c79-9b48-60ab375fd9e0",
    "cooking": "69bd018c-a7fc-4af9-a9b5-1dcaa655d582",
    "photography": "a588fd1c-bff3-4270-90af-10dd2ed83a18",
    "standup": "7a62f02d-63cc-4dba-a2b8-757c0adcc7a0",
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

LANG_ORDER = ["en", "es", "ru", "uk", "de"]
LANG_LABEL = {
    "en": "English",
    "es": "Español",
    "ru": "Русский",
    "uk": "Українська",
    "de": "Deutsch",
}

# ---- TipTap JSON helpers --------------------------------------------

def t_text(s: str, marks=None) -> dict:
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

def build_description(*, titles, bodies, when_local_label, venue, source_url, source_label):
    blocks = []
    for lang in LANG_ORDER:
        if lang in titles:
            blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
            blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_local_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}

# ---- Events catalog -------------------------------------------------
# Times are local Montevideo (UTC-3). iso_local is "YYYY-MM-DD HH:MM".

EVENTS: list[dict[str, Any]] = [
    {
        "iso_local": "2026-05-23 20:00",
        "duration_minutes": 120,
        "category": "dancing",
        "address": "El Milongón, Gaboto 1810, Montevideo",
        "venue_short": "El Milongón",
        "is_free": False,
        "price": 2500,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.elmilongon.com",
        "source_label": "elmilongon.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Tango & Candombe Dinner Show at El Milongón",
            "es": "Show de Tango y Candombe con Cena en El Milongón",
            "ru": "Шоу танго и кандомбе с ужином в El Milongón",
            "uk": "Шоу танго та кандомбе з вечерею в El Milongón",
            "de": "Tango & Candombe Dinner-Show im El Milongón",
        },
        "bodies": {
            "en": "Experience the soul of Uruguayan culture at El Milongón — a dinner show featuring professional tango, candombe, and milonga dancers. Enjoy a 3-course meal of traditional Uruguayan cuisine paired with local wines.",
            "es": "Vive el alma de la cultura uruguaya en El Milongón — un show con cena que presenta bailarines profesionales de tango, candombe y milonga. Disfruta de una cena de 3 platos de cocina tradicional uruguaya con vinos locales.",
            "ru": "Почувствуйте душу уругвайской культуры в El Milongón — шоу с ужином, где профессиональные танцоры исполняют танго, кандомбе и милонгу. Наслаждайтесь ужином из 3 блюд традиционной уругвайской кухни с местными винами.",
            "uk": "Відчуйте душу уругвайської культури в El Milongón — шоу з вечерею, де професійні танцюристи виконують танго, кандомбе та мілонгу. Насолоджуйтесь вечерею з 3 страв традиційної уругвайської кухні з місцевими винами.",
            "de": "Erleben Sie die Seele der uruguayischen Kultur im El Milongón — eine Dinner-Show mit professionellen Tango-, Candombe- und Milonga-Tänzern. Genießen Sie ein 3-Gänge-Menü der traditionellen uruguayischen Küche mit lokalen Weinen.",
        },
    },
    {
        "iso_local": "2026-05-24 10:00",
        "duration_minutes": 180,
        "category": "guided-tours",
        "address": "Plaza Independencia, Montevideo",
        "venue_short": "Plaza Independencia, Ciudad Vieja",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.guruwalk.com/walks/montevideo",
        "source_label": "guruwalk.com",
        "photos": ["https://images.unsplash.com/photo-1599413987323-b2b8c0d187a2?w=800&q=80"],
        "titles": {
            "en": "Free Walking Tour: Montevideo's Old City",
            "es": "Tour a pie gratuito: Ciudad Vieja de Montevideo",
            "ru": "Бесплатная пешеходная экскурсия: Старый город Монтевидео",
            "uk": "Безкоштовна пішохідна екскурсія: Старе місто Монтевідео",
            "de": "Kostenlose Stadtführung: Montevideos Altstadt",
        },
        "bodies": {
            "en": "Discover the historic heart of Montevideo on a free walking tour. Visit Plaza Independencia, Teatro Solís, the Metropolitan Cathedral, Mercado del Puerto, and the charming streets of Ciudad Vieja with a local guide.",
            "es": "Descubre el corazón histórico de Montevideo en un tour a pie gratuito. Visita la Plaza Independencia, el Teatro Solís, la Catedral Metropolitana, el Mercado del Puerto y las encantadoras calles de Ciudad Vieja con un guía local.",
            "ru": "Откройте историческое сердце Монтевидео на бесплатной пешеходной экскурсии. Посетите площадь Независимости, театр Солис, Кафедральный собор, рынок Меркадо-дель-Пуэрто и очаровательные улицы Старого города с местным гидом.",
            "uk": "Відкрийте історичне серце Монтевідео на безкоштовній пішохідній екскурсії. Відвідайте площу Незалежності, театр Соліс, Кафедральний собор, ринок Меркадо-дель-Пуерто та чарівні вулиці Старого міста з місцевим гідом.",
            "de": "Entdecken Sie das historische Herz von Montevideo auf einer kostenlosen Stadtführung. Besuchen Sie die Plaza Independencia, das Teatro Solís, die Kathedrale, den Mercado del Puerto und die charmanten Straßen der Ciudad Vieja.",
        },
    },
    {
        "iso_local": "2026-05-25 17:00",
        "duration_minutes": 150,
        "category": "wine-tasting",
        "address": "Bodega Bouza, Camino de la Redención 7658, Montevideo",
        "venue_short": "Bodega Bouza",
        "is_free": False,
        "price": 3200,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.bodegabouza.com",
        "source_label": "bodegabouza.com",
        "photos": ["https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80"],
        "titles": {
            "en": "Sunset Wine Tasting at Bodega Bouza",
            "es": "Degustación de vinos al atardecer en Bodega Bouza",
            "ru": "Дегустация вин на закате в Bodega Bouza",
            "uk": "Дегустація вин на заході сонця в Bodega Bouza",
            "de": "Weinverkostung bei Sonnenuntergang in der Bodega Bouza",
        },
        "bodies": {
            "en": "Tour the vineyards and cellars of Bodega Bouza, one of Montevideo's finest urban wineries. Taste 5 premium Tannat and Albariño wines while watching the sunset over the vines. Includes cheese and charcuterie pairing.",
            "es": "Recorre los viñedos y bodegas de Bodega Bouza, una de las mejores bodegas urbanas de Montevideo. Degusta 5 vinos premium Tannat y Albariño mientras contemplas el atardecer sobre las viñas. Incluye maridaje de quesos y embutidos.",
            "ru": "Экскурсия по виноградникам и погребам Bodega Bouza — одной из лучших городских виноделен Монтевидео. Дегустация 5 премиальных вин Таннат и Альбариньо на закате. Включает сырную и мясную тарелку.",
            "uk": "Екскурсія виноградниками та погребами Bodega Bouza — однієї з найкращих міських виноробень Монтевідео. Дегустація 5 преміальних вин Таннат та Альбаріньо на заході сонця. Включає сирну та м'ясну тарілку.",
            "de": "Besichtigen Sie die Weinberge und Keller der Bodega Bouza, einer der besten städtischen Weingüter Montevideos. Verkosten Sie 5 Premium-Tannat- und Albariño-Weine bei Sonnenuntergang. Inklusive Käse- und Wurst-Pairing.",
        },
    },
    {
        "iso_local": "2026-05-28 19:30",
        "duration_minutes": 90,
        "category": "theater",
        "address": "Teatro Solís, Buenos Aires s/n, Montevideo",
        "venue_short": "Teatro Solís",
        "is_free": False,
        "price": 1800,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.teatrosolis.org.uy",
        "source_label": "teatrosolis.org.uy",
        "photos": ["https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80"],
        "titles": {
            "en": "Contemporary Dance at Teatro Solís",
            "es": "Danza Contemporánea en el Teatro Solís",
            "ru": "Современный танец в театре Солис",
            "uk": "Сучасний танець у театрі Соліс",
            "de": "Zeitgenössischer Tanz im Teatro Solís",
        },
        "bodies": {
            "en": "The National Dance Company of Uruguay presents a contemporary dance programme at the historic Teatro Solís. A blend of modern choreography with traditional Uruguayan rhythms in the city's most iconic venue.",
            "es": "La Compañía Nacional de Danza del Uruguay presenta un programa de danza contemporánea en el histórico Teatro Solís. Una fusión de coreografía moderna con ritmos tradicionales uruguayos en el escenario más icónico de la ciudad.",
            "ru": "Национальная танцевальная компания Уругвая представляет программу современного танца в историческом театре Солис. Сочетание современной хореографии с традиционными уругвайскими ритмами на самой знаковой сцене города.",
            "uk": "Національна танцювальна компанія Уругваю представляє програму сучасного танцю в історичному театрі Соліс. Поєднання сучасної хореографії з традиційними уругвайськими ритмами на найзнаковішій сцені міста.",
            "de": "Die Nationale Tanzkompanie Uruguays präsentiert ein zeitgenössisches Tanzprogramm im historischen Teatro Solís. Eine Mischung aus moderner Choreografie und traditionellen uruguayischen Rhythmen.",
        },
    },
    {
        "iso_local": "2026-05-30 09:00",
        "duration_minutes": 60,
        "category": "running",
        "address": "Rambla de Montevideo, Parque Rodó",
        "venue_short": "Rambla, Parque Rodó",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Saturday Morning Run along the Rambla",
            "es": "Carrera matutina del sábado por la Rambla",
            "ru": "Субботняя утренняя пробежка по Рамбле",
            "uk": "Суботній ранковий забіг по Рамблі",
            "de": "Samstag-Morgenlauf entlang der Rambla",
        },
        "bodies": {
            "en": "Join a friendly group run along Montevideo's iconic Rambla — 22 km of waterfront promenade with stunning views of the Río de la Plata. All paces welcome. Meet at Parque Rodó entrance, 5K or 10K options.",
            "es": "Únete a una carrera grupal por la icónica Rambla de Montevideo — 22 km de paseo costero con vistas impresionantes del Río de la Plata. Todos los ritmos son bienvenidos. Punto de encuentro: entrada del Parque Rodó, opciones de 5K o 10K.",
            "ru": "Присоединяйтесь к дружеской групповой пробежке по знаменитой Рамбле Монтевидео — 22 км набережной с потрясающими видами на Рио-де-ла-Плата. Любой темп приветствуется. Встреча у входа в парк Родо, дистанции 5 или 10 км.",
            "uk": "Приєднуйтесь до дружнього групового забігу по знаменитій Рамблі Монтевідео — 22 км набережної з приголомшливими видами на Ріо-де-ла-Плата. Будь-який темп вітається. Зустріч біля входу в парк Родо, дистанції 5 або 10 км.",
            "de": "Schließen Sie sich einem freundlichen Gruppenlauf entlang der ikonischen Rambla von Montevideo an — 22 km Uferpromenade mit atemberaubendem Blick auf den Río de la Plata. Alle Tempos willkommen. Treffpunkt: Eingang Parque Rodó.",
        },
    },
    {
        "iso_local": "2026-05-31 12:00",
        "duration_minutes": 180,
        "category": "food-tours",
        "address": "Mercado del Puerto, Piedras y Pérez Castellano, Montevideo",
        "venue_short": "Mercado del Puerto",
        "is_free": False,
        "price": 2800,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.mercadodelpuerto.com.uy",
        "source_label": "mercadodelpuerto.com.uy",
        "photos": ["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80"],
        "titles": {
            "en": "Asado & Market Tour at Mercado del Puerto",
            "es": "Tour de Asado y Mercado en el Mercado del Puerto",
            "ru": "Тур по рынку и асадо в Меркадо-дель-Пуэрто",
            "uk": "Тур ринком та асадо в Меркадо-дель-Пуерто",
            "de": "Asado & Markttour im Mercado del Puerto",
        },
        "bodies": {
            "en": "Explore Montevideo's legendary Mercado del Puerto — a 19th-century iron market filled with parrilla restaurants. Taste traditional asado, choripán, and medio y medio (sparkling wine cocktail) while learning about Uruguayan food culture.",
            "es": "Explora el legendario Mercado del Puerto de Montevideo — un mercado de hierro del siglo XIX lleno de parrillas. Prueba el asado tradicional, choripán y medio y medio mientras aprendes sobre la cultura gastronómica uruguaya.",
            "ru": "Исследуйте легендарный Меркадо-дель-Пуэрто — железный рынок XIX века, полный ресторанов-парилья. Попробуйте традиционное асадо, чорипан и «медио-и-медио» (коктейль из игристого вина), узнавая о гастрономической культуре Уругвая.",
            "uk": "Дослідіть легендарний Меркадо-дель-Пуерто — залізний ринок XIX століття, повний ресторанів-парілья. Спробуйте традиційне асадо, чоріпан та «медіо-і-медіо» (коктейль з ігристого вина), дізнаючись про гастрономічну культуру Уругваю.",
            "de": "Erkunden Sie den legendären Mercado del Puerto — einen Eisenmarkt aus dem 19. Jahrhundert voller Parrilla-Restaurants. Probieren Sie traditionelles Asado, Choripán und Medio y Medio und lernen Sie die uruguayische Esskultur kennen.",
        },
    },
    {
        "iso_local": "2026-06-03 18:30",
        "duration_minutes": 120,
        "category": "networking",
        "address": "Sinergia Cowork, Gonzalo Ramírez 1676, Montevideo",
        "venue_short": "Sinergia Cowork",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80"],
        "titles": {
            "en": "Expat & Digital Nomad Meetup Montevideo",
            "es": "Encuentro de Expats y Nómadas Digitales en Montevideo",
            "ru": "Встреча экспатов и цифровых кочевников в Монтевидео",
            "uk": "Зустріч експатів та цифрових кочівників у Монтевідео",
            "de": "Expat & Digital Nomad Meetup Montevideo",
        },
        "bodies": {
            "en": "Monthly meetup for expats, remote workers, and digital nomads living in or passing through Montevideo. Casual networking, drinks, and conversation at Sinergia Cowork. All nationalities welcome.",
            "es": "Encuentro mensual para expats, trabajadores remotos y nómadas digitales que viven o pasan por Montevideo. Networking informal, bebidas y conversación en Sinergia Cowork. Todas las nacionalidades son bienvenidas.",
            "ru": "Ежемесячная встреча для экспатов, удалённых работников и цифровых кочевников, живущих в Монтевидео или проезжающих через него. Неформальный нетворкинг, напитки и общение в Sinergia Cowork.",
            "uk": "Щомісячна зустріч для експатів, віддалених працівників та цифрових кочівників, які живуть у Монтевідео або проїжджають через нього. Неформальний нетворкінг, напої та спілкування в Sinergia Cowork.",
            "de": "Monatliches Treffen für Expats, Remote-Arbeiter und digitale Nomaden in Montevideo. Lockeres Networking, Getränke und Gespräche im Sinergia Cowork. Alle Nationalitäten willkommen.",
        },
    },
    {
        "iso_local": "2026-06-05 20:30",
        "duration_minutes": 150,
        "category": "music",
        "address": "Antel Arena, Av. Dámaso A. Larrañaga, Montevideo",
        "venue_short": "Antel Arena",
        "is_free": False,
        "price": 3500,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.antelarena.com.uy",
        "source_label": "antelarena.com.uy",
        "photos": ["https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80"],
        "titles": {
            "en": "Jorge Drexler Live at Antel Arena",
            "es": "Jorge Drexler en vivo en Antel Arena",
            "ru": "Хорхе Дрекслер — живой концерт в Antel Arena",
            "uk": "Хорхе Дрекслер — живий концерт в Antel Arena",
            "de": "Jorge Drexler Live in der Antel Arena",
        },
        "bodies": {
            "en": "Oscar-winning Uruguayan singer-songwriter Jorge Drexler performs his latest album live at Montevideo's Antel Arena. An intimate evening of poetic lyrics and innovative acoustic arrangements.",
            "es": "El cantautor uruguayo ganador del Oscar Jorge Drexler presenta su último álbum en vivo en el Antel Arena de Montevideo. Una velada íntima de letras poéticas y arreglos acústicos innovadores.",
            "ru": "Уругвайский автор-исполнитель и лауреат «Оскара» Хорхе Дрекслер представляет свой последний альбом вживую в Antel Arena. Вечер поэтических текстов и инновационных акустических аранжировок.",
            "uk": "Уругвайський автор-виконавець та лауреат «Оскара» Хорхе Дрекслер представляє свій останній альбом наживо в Antel Arena. Вечір поетичних текстів та інноваційних акустичних аранжувань.",
            "de": "Der Oscar-prämierte uruguayische Singer-Songwriter Jorge Drexler präsentiert sein neuestes Album live in der Antel Arena. Ein intimer Abend mit poetischen Texten und innovativen akustischen Arrangements.",
        },
    },
    {
        "iso_local": "2026-06-07 16:00",
        "duration_minutes": 180,
        "category": "museums",
        "address": "Museo Nacional de Artes Visuales, Tomás Giribaldi 2283, Montevideo",
        "venue_short": "MNAV, Parque Rodó",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://mnav.gub.uy",
        "source_label": "mnav.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&q=80"],
        "titles": {
            "en": "Contemporary Art Exhibition: 'Río Adentro'",
            "es": "Exposición de Arte Contemporáneo: 'Río Adentro'",
            "ru": "Выставка современного искусства: «Río Adentro»",
            "uk": "Виставка сучасного мистецтва: «Río Adentro»",
            "de": "Zeitgenössische Kunstausstellung: 'Río Adentro'",
        },
        "bodies": {
            "en": "A new exhibition at the National Museum of Visual Arts exploring the relationship between Uruguayan identity and the Río de la Plata through painting, sculpture, and video installations by emerging local artists.",
            "es": "Una nueva exposición en el Museo Nacional de Artes Visuales que explora la relación entre la identidad uruguaya y el Río de la Plata a través de pintura, escultura e instalaciones de video de artistas locales emergentes.",
            "ru": "Новая выставка в Национальном музее изобразительных искусств, исследующая связь уругвайской идентичности с Рио-де-ла-Плата через живопись, скульптуру и видеоинсталляции молодых местных художников.",
            "uk": "Нова виставка в Національному музеї образотворчих мистецтв, що досліджує зв'язок уругвайської ідентичності з Ріо-де-ла-Плата через живопис, скульптуру та відеоінсталяції молодих місцевих художників.",
            "de": "Eine neue Ausstellung im Nationalmuseum für Bildende Künste, die die Beziehung zwischen uruguayischer Identität und dem Río de la Plata durch Malerei, Skulptur und Videoinstallationen aufstrebender lokaler Künstler erforscht.",
        },
    },
    {
        "iso_local": "2026-06-08 11:00",
        "duration_minutes": 240,
        "category": "cooking",
        "address": "Jacinto, Sarandí 349, Ciudad Vieja, Montevideo",
        "venue_short": "Jacinto, Ciudad Vieja",
        "is_free": False,
        "price": 4500,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.jacinto.com.uy",
        "source_label": "jacinto.com.uy",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Uruguayan Cooking Class: Asado & Empanadas",
            "es": "Clase de Cocina Uruguaya: Asado y Empanadas",
            "ru": "Кулинарный мастер-класс: уругвайское асадо и эмпанадас",
            "uk": "Кулінарний майстер-клас: уругвайське асадо та емпанадас",
            "de": "Uruguayischer Kochkurs: Asado & Empanadas",
        },
        "bodies": {
            "en": "Learn to prepare authentic Uruguayan asado and empanadas in a hands-on cooking class at Jacinto restaurant. Includes market visit, cooking session, and a shared meal with wine pairing. Small group (max 10).",
            "es": "Aprende a preparar auténtico asado y empanadas uruguayas en una clase de cocina práctica en el restaurante Jacinto. Incluye visita al mercado, sesión de cocina y comida compartida con maridaje de vinos. Grupo pequeño (máx. 10).",
            "ru": "Научитесь готовить настоящее уругвайское асадо и эмпанадас на практическом мастер-классе в ресторане Jacinto. Включает посещение рынка, кулинарную сессию и совместный обед с винным сопровождением. Малая группа (макс. 10).",
            "uk": "Навчіться готувати справжнє уругвайське асадо та емпанадас на практичному майстер-класі в ресторані Jacinto. Включає відвідування ринку, кулінарну сесію та спільний обід з винним супроводом. Мала група (макс. 10).",
            "de": "Lernen Sie, authentisches uruguayisches Asado und Empanadas in einem praktischen Kochkurs im Restaurant Jacinto zuzubereiten. Inklusive Marktbesuch, Kochsession und gemeinsames Essen mit Weinbegleitung. Kleine Gruppe (max. 10).",
        },
    },
    {
        "iso_local": "2026-06-10 21:00",
        "duration_minutes": 180,
        "category": "dancing",
        "address": "Milonga La Cumparsita, Bartolomé Mitre 1326, Montevideo",
        "venue_short": "Milonga La Cumparsita",
        "is_free": False,
        "price": 800,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.tangomontevideo.com",
        "source_label": "tangomontevideo.com",
        "photos": ["https://images.unsplash.com/photo-1545959570-a94084071b5d?w=800&q=80"],
        "titles": {
            "en": "Milonga Night: Social Tango Dancing",
            "es": "Noche de Milonga: Tango Social",
            "ru": "Вечер милонги: социальное танго",
            "uk": "Вечір мілонги: соціальне танго",
            "de": "Milonga-Abend: Gesellschaftliches Tango-Tanzen",
        },
        "bodies": {
            "en": "A traditional milonga evening where dancers of all levels come together for social tango. Live orchestra, cortinas between tandas, and a welcoming atmosphere. Beginners can join the pre-milonga class at 20:00.",
            "es": "Una velada de milonga tradicional donde bailarines de todos los niveles se reúnen para el tango social. Orquesta en vivo, cortinas entre tandas y un ambiente acogedor. Los principiantes pueden unirse a la clase pre-milonga a las 20:00.",
            "ru": "Традиционный вечер милонги, где танцоры всех уровней собираются для социального танго. Живой оркестр, кортины между тандами и гостеприимная атмосфера. Начинающие могут присоединиться к уроку перед милонгой в 20:00.",
            "uk": "Традиційний вечір мілонги, де танцюристи всіх рівнів збираються для соціального танго. Живий оркестр, кортіни між тандами та привітна атмосфера. Початківці можуть приєднатися до уроку перед мілонгою о 20:00.",
            "de": "Ein traditioneller Milonga-Abend, bei dem Tänzer aller Niveaus zum gesellschaftlichen Tango zusammenkommen. Live-Orchester, Cortinas zwischen den Tandas und eine einladende Atmosphäre. Anfänger können um 20:00 Uhr am Vor-Milonga-Kurs teilnehmen.",
        },
    },
    {
        "iso_local": "2026-06-12 18:00",
        "duration_minutes": 120,
        "category": "photography",
        "address": "Centro de Fotografía, San José 1360, Montevideo",
        "venue_short": "CdF, San José",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://cdf.montevideo.gub.uy",
        "source_label": "cdf.montevideo.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80"],
        "titles": {
            "en": "Photography Exhibition: 'Montevideo in Black & White'",
            "es": "Exposición Fotográfica: 'Montevideo en Blanco y Negro'",
            "ru": "Фотовыставка: «Монтевидео в чёрно-белом»",
            "uk": "Фотовиставка: «Монтевідео у чорно-білому»",
            "de": "Fotoausstellung: 'Montevideo in Schwarz-Weiß'",
        },
        "bodies": {
            "en": "The Centro de Fotografía presents a retrospective of Montevideo's urban landscape through black-and-white photography spanning five decades. Free admission, guided tours available.",
            "es": "El Centro de Fotografía presenta una retrospectiva del paisaje urbano de Montevideo a través de fotografía en blanco y negro que abarca cinco décadas. Entrada gratuita, visitas guiadas disponibles.",
            "ru": "Центр фотографии представляет ретроспективу городского пейзажа Монтевидео через чёрно-белую фотографию за пять десятилетий. Вход свободный, доступны экскурсии с гидом.",
            "uk": "Центр фотографії представляє ретроспективу міського пейзажу Монтевідео через чорно-білу фотографію за п'ять десятиліть. Вхід вільний, доступні екскурсії з гідом.",
            "de": "Das Centro de Fotografía präsentiert eine Retrospektive der Stadtlandschaft Montevideos durch Schwarz-Weiß-Fotografie aus fünf Jahrzehnten. Freier Eintritt, Führungen verfügbar.",
        },
    },
    {
        "iso_local": "2026-06-14 08:00",
        "duration_minutes": 90,
        "category": "yoga",
        "address": "Playa Pocitos, Rambla República del Perú, Montevideo",
        "venue_short": "Playa Pocitos",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Sunrise Yoga on Pocitos Beach",
            "es": "Yoga al amanecer en Playa Pocitos",
            "ru": "Йога на рассвете на пляже Поситос",
            "uk": "Йога на світанку на пляжі Поситос",
            "de": "Sonnenaufgangs-Yoga am Strand von Pocitos",
        },
        "bodies": {
            "en": "Start your Sunday with a gentle yoga session on Pocitos Beach as the sun rises over the Río de la Plata. All levels welcome. Bring your own mat. Hot mate shared afterwards.",
            "es": "Comienza tu domingo con una sesión de yoga suave en Playa Pocitos mientras el sol sale sobre el Río de la Plata. Todos los niveles son bienvenidos. Trae tu propia esterilla. Mate caliente compartido después.",
            "ru": "Начните воскресенье с мягкой йога-сессии на пляже Поситос на рассвете над Рио-де-ла-Плата. Все уровни приветствуются. Возьмите свой коврик. После — горячий мате в компании.",
            "uk": "Почніть неділю з м'якої йога-сесії на пляжі Поситос на світанку над Ріо-де-ла-Плата. Всі рівні вітаються. Візьміть свій килимок. Після — гарячий мате в компанії.",
            "de": "Beginnen Sie Ihren Sonntag mit einer sanften Yoga-Session am Strand von Pocitos bei Sonnenaufgang über dem Río de la Plata. Alle Niveaus willkommen. Eigene Matte mitbringen. Danach gemeinsamer heißer Mate.",
        },
    },
    {
        "iso_local": "2026-06-15 17:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "Barrio Sur, Isla de Flores y Cuareim, Montevideo",
        "venue_short": "Barrio Sur",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.montevideo.gub.uy/cultura",
        "source_label": "montevideo.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80"],
        "titles": {
            "en": "Candombe Drumming in Barrio Sur",
            "es": "Llamada de Candombe en Barrio Sur",
            "ru": "Кандомбе в Баррио-Сур: барабанное шествие",
            "uk": "Кандомбе в Барріо-Сур: барабанна хода",
            "de": "Candombe-Trommeln im Barrio Sur",
        },
        "bodies": {
            "en": "Experience the Afro-Uruguayan tradition of candombe drumming in its birthplace — Barrio Sur. Watch (or join!) the llamada as dozens of drummers parade through the streets with their tamboriles. A UNESCO Intangible Cultural Heritage.",
            "es": "Vive la tradición afrouruguaya del candombe en su lugar de nacimiento — Barrio Sur. Observa (¡o únete!) la llamada mientras decenas de tamborileros desfilan por las calles. Patrimonio Cultural Inmaterial de la UNESCO.",
            "ru": "Почувствуйте афро-уругвайскую традицию кандомбе в месте её рождения — Баррио-Сур. Наблюдайте (или присоединяйтесь!) за «льямадой», когда десятки барабанщиков шествуют по улицам со своими тамборилями. Нематериальное культурное наследие ЮНЕСКО.",
            "uk": "Відчуйте афро-уругвайську традицію кандомбе в місці її народження — Барріо-Сур. Спостерігайте (або приєднуйтесь!) за «льямадою», коли десятки барабанщиків крокують вулицями зі своїми тамборілями. Нематеріальна культурна спадщина ЮНЕСКО.",
            "de": "Erleben Sie die afro-uruguayische Tradition des Candombe-Trommelns an seinem Geburtsort — Barrio Sur. Beobachten Sie (oder machen Sie mit!) die Llamada, wenn Dutzende Trommler mit ihren Tamboriles durch die Straßen ziehen. UNESCO-Weltkulturerbe.",
        },
    },
    {
        "iso_local": "2026-06-17 19:00",
        "duration_minutes": 120,
        "category": "standup",
        "address": "Sala Zitarrosa, 18 de Julio 1012, Montevideo",
        "venue_short": "Sala Zitarrosa",
        "is_free": False,
        "price": 1200,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.salazitarrosa.montevideo.gub.uy",
        "source_label": "salazitarrosa.montevideo.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80"],
        "titles": {
            "en": "Stand-up Comedy Night at Sala Zitarrosa",
            "es": "Noche de Stand-up en Sala Zitarrosa",
            "ru": "Вечер стендапа в Sala Zitarrosa",
            "uk": "Вечір стендапу в Sala Zitarrosa",
            "de": "Stand-up Comedy Abend in der Sala Zitarrosa",
        },
        "bodies": {
            "en": "A lineup of Uruguay's best stand-up comedians perform at the iconic Sala Zitarrosa. Sharp humor about daily life in Montevideo, politics, and relationships. In Spanish.",
            "es": "Los mejores comediantes de stand-up de Uruguay se presentan en la icónica Sala Zitarrosa. Humor agudo sobre la vida cotidiana en Montevideo, política y relaciones.",
            "ru": "Лучшие стендап-комики Уругвая выступают в знаковом зале Zitarrosa. Острый юмор о повседневной жизни в Монтевидео, политике и отношениях. На испанском языке.",
            "uk": "Найкращі стендап-коміки Уругваю виступають у знаковому залі Zitarrosa. Гострий гумор про повсякденне життя в Монтевідео, політику та стосунки. Іспанською мовою.",
            "de": "Uruguays beste Stand-up-Comedians treten in der ikonischen Sala Zitarrosa auf. Scharfer Humor über den Alltag in Montevideo, Politik und Beziehungen. Auf Spanisch.",
        },
    },
    {
        "iso_local": "2026-06-19 18:00",
        "duration_minutes": 150,
        "category": "wine-tasting",
        "address": "Bodegas Carrau, César Mayo Gutiérrez 2556, Montevideo",
        "venue_short": "Bodegas Carrau",
        "is_free": False,
        "price": 2800,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.bodegascarrau.com",
        "source_label": "bodegascarrau.com",
        "photos": ["https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800&q=80"],
        "titles": {
            "en": "Tannat Wine Masterclass at Bodegas Carrau",
            "es": "Masterclass de Vino Tannat en Bodegas Carrau",
            "ru": "Мастер-класс по вину Таннат в Bodegas Carrau",
            "uk": "Майстер-клас з вина Таннат в Bodegas Carrau",
            "de": "Tannat-Wein-Masterclass bei Bodegas Carrau",
        },
        "bodies": {
            "en": "Deep-dive into Uruguay's signature grape — Tannat — at the historic Bodegas Carrau, the country's oldest family winery (est. 1752). Taste 6 vintages, learn about terroir, and tour the underground cellars.",
            "es": "Sumérgete en la uva insignia de Uruguay — Tannat — en la histórica Bodegas Carrau, la bodega familiar más antigua del país (est. 1752). Degusta 6 añadas, aprende sobre terroir y recorre las bodegas subterráneas.",
            "ru": "Погрузитесь в мир фирменного уругвайского винограда — Таннат — в исторической Bodegas Carrau, старейшей семейной винодельне страны (осн. 1752). Дегустация 6 урожаев, рассказ о терруаре и экскурсия по подземным погребам.",
            "uk": "Зануртесь у світ фірмового уругвайського винограду — Таннат — в історичній Bodegas Carrau, найстарішій сімейній виноробні країни (засн. 1752). Дегустація 6 урожаїв, розповідь про терруар та екскурсія підземними погребами.",
            "de": "Tauchen Sie ein in Uruguays Signatur-Traube — Tannat — bei der historischen Bodegas Carrau, dem ältesten Familienweingut des Landes (gegr. 1752). Verkosten Sie 6 Jahrgänge, lernen Sie über Terroir und besichtigen Sie die unterirdischen Keller.",
        },
    },
    {
        "iso_local": "2026-06-21 15:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Feria de Tristán Narvaja, Tristán Narvaja, Montevideo",
        "venue_short": "Feria de Tristán Narvaja",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.montevideo.gub.uy/ferias",
        "source_label": "montevideo.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80"],
        "titles": {
            "en": "Sunday Flea Market: Feria de Tristán Narvaja",
            "es": "Feria dominical de Tristán Narvaja",
            "ru": "Воскресный блошиный рынок Тристан Нарваха",
            "uk": "Недільний блошиний ринок Трістан Нарваха",
            "de": "Sonntagsflohmarkt: Feria de Tristán Narvaja",
        },
        "bodies": {
            "en": "Montevideo's legendary Sunday flea market stretches for 30+ blocks along Tristán Narvaja street. Antiques, vinyl records, books, crafts, street food, and live music. A must-visit local tradition since 1909.",
            "es": "El legendario mercado dominical de Montevideo se extiende por más de 30 cuadras a lo largo de la calle Tristán Narvaja. Antigüedades, vinilos, libros, artesanías, comida callejera y música en vivo. Una tradición local imperdible desde 1909.",
            "ru": "Легендарный воскресный блошиный рынок Монтевидео тянется более чем на 30 кварталов по улице Тристан Нарваха. Антиквариат, виниловые пластинки, книги, ремёсла, уличная еда и живая музыка. Местная традиция с 1909 года.",
            "uk": "Легендарний недільний блошиний ринок Монтевідео тягнеться понад 30 кварталів вулицею Трістан Нарваха. Антикваріат, вінілові платівки, книги, ремесла, вулична їжа та жива музика. Місцева традиція з 1909 року.",
            "de": "Montevideos legendärer Sonntagsflohmarkt erstreckt sich über 30+ Blocks entlang der Straße Tristán Narvaja. Antiquitäten, Schallplatten, Bücher, Kunsthandwerk, Street Food und Live-Musik. Eine lokale Tradition seit 1909.",
        },
    },
    {
        "iso_local": "2026-06-22 20:00",
        "duration_minutes": 120,
        "category": "music",
        "address": "Sala del Museo, Rambla 25 de Agosto 218, Montevideo",
        "venue_short": "Sala del Museo, Ciudad Vieja",
        "is_free": False,
        "price": 1500,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.saladelmuseo.com",
        "source_label": "saladelmuseo.com",
        "photos": ["https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80"],
        "titles": {
            "en": "Jazz Night at Sala del Museo",
            "es": "Noche de Jazz en Sala del Museo",
            "ru": "Джазовый вечер в Sala del Museo",
            "uk": "Джазовий вечір у Sala del Museo",
            "de": "Jazz-Abend in der Sala del Museo",
        },
        "bodies": {
            "en": "An intimate jazz evening in the atmospheric Sala del Museo, a converted warehouse in Ciudad Vieja. Local quartet performing standards and original compositions. Craft cocktails available.",
            "es": "Una velada de jazz íntima en la atmosférica Sala del Museo, un almacén reconvertido en Ciudad Vieja. Cuarteto local interpretando estándares y composiciones originales. Cócteles artesanales disponibles.",
            "ru": "Камерный джазовый вечер в атмосферном зале Sala del Museo — переоборудованном складе в Старом городе. Местный квартет исполняет стандарты и авторские композиции. Крафтовые коктейли.",
            "uk": "Камерний джазовий вечір в атмосферному залі Sala del Museo — переобладнаному складі в Старому місті. Місцевий квартет виконує стандарти та авторські композиції. Крафтові коктейлі.",
            "de": "Ein intimer Jazz-Abend in der atmosphärischen Sala del Museo, einem umgebauten Lagerhaus in der Ciudad Vieja. Lokales Quartett spielt Standards und Eigenkompositionen. Craft-Cocktails verfügbar.",
        },
    },
    {
        "iso_local": "2026-06-24 19:00",
        "duration_minutes": 90,
        "category": "theater",
        "address": "Teatro Solís, Buenos Aires s/n, Montevideo",
        "venue_short": "Teatro Solís",
        "is_free": False,
        "price": 2200,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.teatrosolis.org.uy",
        "source_label": "teatrosolis.org.uy",
        "photos": ["https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80"],
        "titles": {
            "en": "Philharmonic Orchestra of Montevideo: Winter Concert",
            "es": "Orquesta Filarmónica de Montevideo: Concierto de Invierno",
            "ru": "Филармонический оркестр Монтевидео: зимний концерт",
            "uk": "Філармонічний оркестр Монтевідео: зимовий концерт",
            "de": "Philharmonisches Orchester Montevideo: Winterkonzert",
        },
        "bodies": {
            "en": "The Philharmonic Orchestra of Montevideo performs a winter programme featuring Beethoven's Symphony No. 7 and Piazzolla's 'Invierno Porteño' at the magnificent Teatro Solís.",
            "es": "La Orquesta Filarmónica de Montevideo interpreta un programa de invierno con la Sinfonía No. 7 de Beethoven y 'Invierno Porteño' de Piazzolla en el magnífico Teatro Solís.",
            "ru": "Филармонический оркестр Монтевидео исполняет зимнюю программу: Симфония №7 Бетховена и «Зима в Буэнос-Айресе» Пьяццоллы в великолепном театре Солис.",
            "uk": "Філармонічний оркестр Монтевідео виконує зимову програму: Симфонія №7 Бетховена та «Зима в Буенос-Айресі» П'яццолли у чудовому театрі Соліс.",
            "de": "Das Philharmonische Orchester Montevideo spielt ein Winterprogramm mit Beethovens Symphonie Nr. 7 und Piazzollas 'Invierno Porteño' im prächtigen Teatro Solís.",
        },
    },
    {
        "iso_local": "2026-06-27 18:30",
        "duration_minutes": 120,
        "category": "networking",
        "address": "La Ronda, Ciudadela 1182, Montevideo",
        "venue_short": "La Ronda, Ciudad Vieja",
        "is_free": False,
        "price": 500,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80"],
        "titles": {
            "en": "Language Exchange: Spanish ↔ English",
            "es": "Intercambio de Idiomas: Español ↔ Inglés",
            "ru": "Языковой обмен: испанский ↔ английский",
            "uk": "Мовний обмін: іспанська ↔ англійська",
            "de": "Sprachtandem: Spanisch ↔ Englisch",
        },
        "bodies": {
            "en": "Practice your Spanish with native speakers while helping them with English. Structured conversation rounds at La Ronda bar in Ciudad Vieja. All levels welcome. Includes one drink.",
            "es": "Practica tu inglés con hablantes nativos mientras los ayudas con español. Rondas de conversación estructuradas en el bar La Ronda en Ciudad Vieja. Todos los niveles son bienvenidos. Incluye una bebida.",
            "ru": "Практикуйте испанский с носителями языка, помогая им с английским. Структурированные раунды разговоров в баре La Ronda в Старом городе. Все уровни приветствуются. Включает один напиток.",
            "uk": "Практикуйте іспанську з носіями мови, допомагаючи їм з англійською. Структуровані раунди розмов у барі La Ronda в Старому місті. Всі рівні вітаються. Включає один напій.",
            "de": "Üben Sie Ihr Spanisch mit Muttersprachlern und helfen Sie ihnen mit Englisch. Strukturierte Gesprächsrunden in der Bar La Ronda in der Ciudad Vieja. Alle Niveaus willkommen. Ein Getränk inklusive.",
        },
    },
]

# ---- Supabase insertion logic ----------------------------------------

def local_to_utc(iso_local: str) -> str:
    """Convert 'YYYY-MM-DD HH:MM' in Montevideo time (UTC-3) to ISO UTC."""
    from datetime import datetime, timedelta, timezone
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    # Montevideo is UTC-3 year-round
    utc_dt = dt + timedelta(hours=3)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
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

    # Resolve Montevideo city_id
    city_url = f"{url}/rest/v1/cities?name=eq.Montevideo&select=id"
    req = urllib.request.Request(city_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        cities = json.loads(resp.read())
    
    if not cities:
        print("ERROR: Montevideo not found in cities table. Add it first.")
        sys.exit(1)
    
    city_id = cities[0]["id"]
    print(f"Montevideo city_id: {city_id}")

    inserted = 0
    skipped = 0

    for ev in EVENTS:
        title_en = ev["titles"]["en"]

        # Check if already exists
        check_url = f"{url}/rest/v1/events?title=eq.{urllib.parse.quote(title_en)}&select=id"
        req = urllib.request.Request(check_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            existing = json.loads(resp.read())
        
        if existing:
            print(f"  SKIP (exists): {title_en}")
            skipped += 1
            continue

        starts_at = local_to_utc(ev["iso_local"])
        desc_doc = build_description(
            titles=ev["titles"],
            bodies=ev["bodies"],
            when_local_label=ev["iso_local"].replace("-", "."),
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
            "city": "Montevideo",
            "city_id": city_id,
            "country": "UY",
            "address": ev["address"],
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

        data = json.dumps(row).encode()
        insert_url = f"{url}/rest/v1/events"
        req = urllib.request.Request(insert_url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read())
                print(f"  OK: {title_en} (id={result[0]['id'][:8]}...)")
                inserted += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"  ERROR inserting '{title_en}': {e.code} {body}")

    print(f"\nDone. Inserted: {inserted}, Skipped: {skipped}")


if __name__ == "__main__":
    import urllib.parse
    main()
