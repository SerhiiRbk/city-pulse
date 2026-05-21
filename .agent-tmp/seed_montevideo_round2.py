#!/usr/bin/env python3
"""
Seed 20 MORE system events in Montevideo for May 22 – June 30, 2026 (Round 2).

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
  exec(open('.agent-tmp/seed_montevideo_round2.py').read())
  "
"""

from __future__ import annotations
import json, os, sys, urllib.request, urllib.parse
from typing import Any

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
    "cycling": "2f479b11-7373-45f8-b7bd-155550b56a4b",
    "cooking": "69bd018c-a7fc-4af9-a9b5-1dcaa655d582",
    "photography": "a588fd1c-bff3-4270-90af-10dd2ed83a18",
    "standup": "7a62f02d-63cc-4dba-a2b8-757c0adcc7a0",
    "craft-beer": "16d1baf1-d04e-40e0-b3fb-f791c071e6e3",
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

LANG_ORDER = ["en", "es", "ru", "uk", "de"]
LANG_LABEL = {"en": "English", "es": "Español", "ru": "Русский", "uk": "Українська", "de": "Deutsch"}

def t_text(s, marks=None):
    node = {"type": "text", "text": s}
    if marks: node["marks"] = marks
    return node

def t_link(label, href):
    return t_text(label, [{"type": "link", "attrs": {"href": href}}])

def t_h2(s): return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(s)]}
def t_h3(s): return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(s)]}
def t_para(*nodes): return {"type": "paragraph", "content": list(nodes)}

def build_description(*, titles, bodies, when_local_label, venue, source_url, source_label):
    blocks = []
    for lang in LANG_ORDER:
        if lang in titles:
            blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
            blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_local_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}

EVENTS = [
    {
        "iso_local": "2026-05-22 19:00",
        "duration_minutes": 120,
        "category": "craft-beer",
        "address": "Shannon Irish Pub, Bartolomé Mitre 1318, Montevideo",
        "venue_short": "Shannon Irish Pub, Ciudad Vieja",
        "is_free": False,
        "price": 600,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {
            "en": "Craft Beer Tasting: Uruguayan Microbreweries",
            "es": "Degustación de Cerveza Artesanal: Microcervecerías Uruguayas",
            "ru": "Дегустация крафтового пива: уругвайские микропивоварни",
            "uk": "Дегустація крафтового пива: уругвайські мікропивоварні",
            "de": "Craft-Bier-Verkostung: Uruguayische Mikrobrauereien",
        },
        "bodies": {
            "en": "Sample 6 craft beers from Uruguay's best microbreweries at Shannon Irish Pub. Learn about local brewing traditions, hop varieties, and food pairings. Casual atmosphere, great for meeting fellow beer enthusiasts.",
            "es": "Prueba 6 cervezas artesanales de las mejores microcervecerías de Uruguay en Shannon Irish Pub. Aprende sobre tradiciones cerveceras locales, variedades de lúpulo y maridajes. Ambiente casual, ideal para conocer otros entusiastas.",
            "ru": "Попробуйте 6 крафтовых сортов пива от лучших микропивоварен Уругвая в Shannon Irish Pub. Узнайте о местных пивоваренных традициях, сортах хмеля и гастрономических сочетаниях. Непринуждённая атмосфера для знакомств.",
            "uk": "Спробуйте 6 крафтових сортів пива від найкращих мікропивоварень Уругваю в Shannon Irish Pub. Дізнайтесь про місцеві пивоварні традиції, сорти хмелю та гастрономічні поєднання. Невимушена атмосфера для знайомств.",
            "de": "Probieren Sie 6 Craft-Biere der besten Mikrobrauereien Uruguays im Shannon Irish Pub. Erfahren Sie mehr über lokale Brautraditionen, Hopfensorten und Food-Pairings. Lockere Atmosphäre zum Kennenlernen.",
        },
    },
    {
        "iso_local": "2026-05-23 10:00",
        "duration_minutes": 150,
        "category": "cycling",
        "address": "Puerta de la Ciudadela, Plaza Independencia, Montevideo",
        "venue_short": "Puerta de la Ciudadela",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80"],
        "titles": {
            "en": "Bike Tour: Rambla Coastal Ride",
            "es": "Bicicleteada: Recorrido Costero por la Rambla",
            "ru": "Велотур: прибрежная поездка по Рамбле",
            "uk": "Велотур: прибережна поїздка по Рамблі",
            "de": "Fahrradtour: Küstenfahrt entlang der Rambla",
        },
        "bodies": {
            "en": "A relaxed 20km group bike ride along Montevideo's stunning Rambla — from Ciudad Vieja to Carrasco beach. Stops for photos and mate. Bring your own bike or rent one nearby. All fitness levels.",
            "es": "Una bicicleteada grupal relajada de 20km por la impresionante Rambla de Montevideo — desde Ciudad Vieja hasta la playa de Carrasco. Paradas para fotos y mate. Trae tu bici o alquila una cerca. Todos los niveles.",
            "ru": "Расслабленная групповая велопрогулка 20 км по потрясающей Рамбле Монтевидео — от Старого города до пляжа Карраско. Остановки для фото и мате. Свой велосипед или аренда рядом. Любой уровень подготовки.",
            "uk": "Розслаблена групова велопрогулянка 20 км по вражаючій Рамблі Монтевідео — від Старого міста до пляжу Карраско. Зупинки для фото та мате. Свій велосипед або оренда поруч. Будь-який рівень підготовки.",
            "de": "Eine entspannte 20-km-Gruppenradtour entlang der atemberaubenden Rambla von Montevideo — von der Ciudad Vieja bis zum Strand von Carrasco. Stopps für Fotos und Mate. Eigenes Rad oder Verleih vor Ort.",
        },
    },
    {
        "iso_local": "2026-05-26 20:00",
        "duration_minutes": 90,
        "category": "music",
        "address": "Auditorio Nacional del Sodre, Andes 1451, Montevideo",
        "venue_short": "Auditorio del Sodre",
        "is_free": False,
        "price": 2000,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.sodre.gub.uy",
        "source_label": "sodre.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80"],
        "titles": {
            "en": "National Symphony Orchestra: Latin American Composers",
            "es": "Orquesta Sinfónica Nacional: Compositores Latinoamericanos",
            "ru": "Национальный симфонический оркестр: латиноамериканские композиторы",
            "uk": "Національний симфонічний оркестр: латиноамериканські композитори",
            "de": "Nationales Symphonieorchester: Lateinamerikanische Komponisten",
        },
        "bodies": {
            "en": "The National Symphony Orchestra of Uruguay performs works by Ginastera, Villa-Lobos, and Piazzolla at the stunning Auditorio del Sodre. A celebration of Latin American classical music.",
            "es": "La Orquesta Sinfónica Nacional del Uruguay interpreta obras de Ginastera, Villa-Lobos y Piazzolla en el impresionante Auditorio del Sodre. Una celebración de la música clásica latinoamericana.",
            "ru": "Национальный симфонический оркестр Уругвая исполняет произведения Хинастеры, Вилла-Лобоса и Пьяццоллы в потрясающем Аудиторио-дель-Содре. Праздник латиноамериканской классической музыки.",
            "uk": "Національний симфонічний оркестр Уругваю виконує твори Хінастери, Вілла-Лобоса та П'яццолли у вражаючому Аудиторіо-дель-Содре. Свято латиноамериканської класичної музики.",
            "de": "Das Nationale Symphonieorchester Uruguays spielt Werke von Ginastera, Villa-Lobos und Piazzolla im beeindruckenden Auditorio del Sodre. Eine Feier lateinamerikanischer Klassik.",
        },
    },
    {
        "iso_local": "2026-05-27 17:30",
        "duration_minutes": 90,
        "category": "yoga",
        "address": "Parque Batlle, Av. Dr. Américo Ricaldoni, Montevideo",
        "venue_short": "Parque Batlle",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80"],
        "titles": {
            "en": "Outdoor Yoga in Parque Batlle",
            "es": "Yoga al Aire Libre en Parque Batlle",
            "ru": "Йога на свежем воздухе в парке Батлье",
            "uk": "Йога на свіжому повітрі в парку Батльє",
            "de": "Outdoor-Yoga im Parque Batlle",
        },
        "bodies": {
            "en": "A gentle Hatha yoga session in the green surroundings of Parque Batlle. Perfect for beginners and intermediate practitioners. Bring a mat and warm layers — autumn evenings can be cool. Free, donation-based.",
            "es": "Una sesión suave de Hatha yoga en el entorno verde del Parque Batlle. Perfecta para principiantes e intermedios. Trae esterilla y ropa abrigada — las tardes de otoño pueden ser frescas. Gratis, a voluntad.",
            "ru": "Мягкая сессия хатха-йоги в зелёном окружении парка Батлье. Подходит для начинающих и среднего уровня. Возьмите коврик и тёплую одежду — осенние вечера бывают прохладными. Бесплатно, по желанию.",
            "uk": "М'яка сесія хатха-йоги в зеленому оточенні парку Батльє. Підходить для початківців та середнього рівня. Візьміть килимок та теплий одяг — осінні вечори бувають прохолодними. Безкоштовно, за бажанням.",
            "de": "Eine sanfte Hatha-Yoga-Session in der grünen Umgebung des Parque Batlle. Perfekt für Anfänger und Fortgeschrittene. Matte und warme Kleidung mitbringen — Herbstabende können kühl sein. Kostenlos, auf Spendenbasis.",
        },
    },
    {
        "iso_local": "2026-05-29 12:30",
        "duration_minutes": 120,
        "category": "food-tours",
        "address": "Mercado Agrícola, José L. Terra 2220, Montevideo",
        "venue_short": "Mercado Agrícola de Montevideo",
        "is_free": False,
        "price": 1800,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.mam.com.uy",
        "source_label": "mam.com.uy",
        "photos": ["https://images.unsplash.com/photo-1488992783499-418eb1f62d08?w=800&q=80"],
        "titles": {
            "en": "Food Tour: Mercado Agrícola Tasting Trail",
            "es": "Tour Gastronómico: Ruta de Sabores del Mercado Agrícola",
            "ru": "Гастротур: дегустационный маршрут по Сельскохозяйственному рынку",
            "uk": "Гастротур: дегустаційний маршрут по Сільськогосподарському ринку",
            "de": "Food-Tour: Verkostungsroute im Mercado Agrícola",
        },
        "bodies": {
            "en": "Explore Montevideo's renovated Mercado Agrícola — a beautiful Art Deco market with artisan food stalls. Taste local cheeses, dulce de leche, empanadas, craft beer, and seasonal produce with a local foodie guide.",
            "es": "Explora el renovado Mercado Agrícola de Montevideo — un hermoso mercado Art Déco con puestos de comida artesanal. Prueba quesos locales, dulce de leche, empanadas, cerveza artesanal y productos de temporada con un guía gastronómico.",
            "ru": "Исследуйте обновлённый Сельскохозяйственный рынок Монтевидео — красивый рынок в стиле ар-деко с ремесленными продуктовыми лавками. Попробуйте местные сыры, дульсе-де-лече, эмпанадас, крафтовое пиво и сезонные продукты с гидом-гурманом.",
            "uk": "Дослідіть оновлений Сільськогосподарський ринок Монтевідео — красивий ринок у стилі ар-деко з ремісничими продуктовими лавками. Спробуйте місцеві сири, дульсе-де-лече, емпанадас, крафтове пиво та сезонні продукти з гідом-гурманом.",
            "de": "Erkunden Sie den renovierten Mercado Agrícola — einen wunderschönen Art-Déco-Markt mit handwerklichen Lebensmittelständen. Probieren Sie lokale Käse, Dulce de Leche, Empanadas, Craft-Bier und saisonale Produkte mit einem Food-Guide.",
        },
    },
    {
        "iso_local": "2026-06-01 15:00",
        "duration_minutes": 120,
        "category": "museums",
        "address": "Museo Torres García, Sarandí 683, Montevideo",
        "venue_short": "Museo Torres García, Ciudad Vieja",
        "is_free": False,
        "price": 400,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.torresgarcia.org.uy",
        "source_label": "torresgarcia.org.uy",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {
            "en": "Guided Visit: Torres García Museum",
            "es": "Visita Guiada: Museo Torres García",
            "ru": "Экскурсия: Музей Торреса Гарсии",
            "uk": "Екскурсія: Музей Торреса Гарсії",
            "de": "Führung: Torres García Museum",
        },
        "bodies": {
            "en": "Discover the work of Joaquín Torres García, Uruguay's most celebrated modern artist, in a guided tour of his dedicated museum. Explore constructive universalism, his Paris years, and influence on Latin American art.",
            "es": "Descubre la obra de Joaquín Torres García, el artista moderno más célebre de Uruguay, en una visita guiada por su museo dedicado. Explora el universalismo constructivo, sus años en París y su influencia en el arte latinoamericano.",
            "ru": "Откройте творчество Хоакина Торреса Гарсии — самого знаменитого уругвайского художника-модерниста — на экскурсии по его музею. Конструктивный универсализм, парижские годы и влияние на латиноамериканское искусство.",
            "uk": "Відкрийте творчість Хоакіна Торреса Гарсії — найвідомішого уругвайського художника-модерніста — на екскурсії по його музею. Конструктивний універсалізм, паризькі роки та вплив на латиноамериканське мистецтво.",
            "de": "Entdecken Sie das Werk von Joaquín Torres García, Uruguays berühmtestem modernen Künstler, bei einer Führung durch sein Museum. Konstruktiver Universalismus, seine Pariser Jahre und sein Einfluss auf die lateinamerikanische Kunst.",
        },
    },
    {
        "iso_local": "2026-06-02 20:00",
        "duration_minutes": 120,
        "category": "music",
        "address": "La Trastienda, Daniel Fernández Crespo 1763, Montevideo",
        "venue_short": "La Trastienda",
        "is_free": False,
        "price": 1800,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.latrastienda.com.uy",
        "source_label": "latrastienda.com.uy",
        "photos": ["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80"],
        "titles": {
            "en": "Indie Rock Night at La Trastienda",
            "es": "Noche de Rock Indie en La Trastienda",
            "ru": "Вечер инди-рока в La Trastienda",
            "uk": "Вечір інді-року в La Trastienda",
            "de": "Indie-Rock-Abend in La Trastienda",
        },
        "bodies": {
            "en": "Three of Uruguay's hottest indie bands perform at La Trastienda — Montevideo's premier live music venue. Expect guitar-driven melodies, energetic crowds, and a late-night afterparty.",
            "es": "Tres de las bandas indie más populares de Uruguay se presentan en La Trastienda — el principal escenario de música en vivo de Montevideo. Espera melodías de guitarra, público energético y after party.",
            "ru": "Три самые горячие инди-группы Уругвая выступают в La Trastienda — главной концертной площадке Монтевидео. Гитарные мелодии, энергичная публика и вечеринка после концерта.",
            "uk": "Три найгарячіші інді-гурти Уругваю виступають у La Trastienda — головному концертному майданчику Монтевідео. Гітарні мелодії, енергійна публіка та вечірка після концерту.",
            "de": "Drei der angesagtesten Indie-Bands Uruguays spielen in La Trastienda — Montevideos führender Live-Musik-Venue. Gitarrenmelodien, energiegeladenes Publikum und Late-Night-Afterparty.",
        },
    },
    {
        "iso_local": "2026-06-04 18:00",
        "duration_minutes": 90,
        "category": "networking",
        "address": "Café Brasilero, Ituzaingó 1447, Montevideo",
        "venue_short": "Café Brasilero, Ciudad Vieja",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=80"],
        "titles": {
            "en": "Book Club: Latin American Literature",
            "es": "Club de Lectura: Literatura Latinoamericana",
            "ru": "Книжный клуб: латиноамериканская литература",
            "uk": "Книжковий клуб: латиноамериканська література",
            "de": "Buchclub: Lateinamerikanische Literatur",
        },
        "bodies": {
            "en": "Monthly book club meeting at Montevideo's oldest café (est. 1877). This month: discussing Eduardo Galeano's 'Open Veins of Latin America'. Bilingual discussion in Spanish and English. Coffee included.",
            "es": "Reunión mensual del club de lectura en el café más antiguo de Montevideo (est. 1877). Este mes: discusión de 'Las venas abiertas de América Latina' de Eduardo Galeano. Discusión bilingüe en español e inglés. Café incluido.",
            "ru": "Ежемесячная встреча книжного клуба в старейшем кафе Монтевидео (осн. 1877). В этом месяце: обсуждение «Вскрытых вен Латинской Америки» Эдуардо Галеано. Двуязычная дискуссия на испанском и английском. Кофе включён.",
            "uk": "Щомісячна зустріч книжкового клубу в найстарішому кафе Монтевідео (засн. 1877). Цього місяця: обговорення «Розкритих вен Латинської Америки» Едуардо Галеано. Двомовна дискусія іспанською та англійською. Кава включена.",
            "de": "Monatliches Buchclub-Treffen im ältesten Café Montevideos (gegr. 1877). Diesen Monat: Diskussion von Eduardo Galeanos 'Die offenen Adern Lateinamerikas'. Zweisprachig Spanisch/Englisch. Kaffee inklusive.",
        },
    },
    {
        "iso_local": "2026-06-06 21:00",
        "duration_minutes": 180,
        "category": "dancing",
        "address": "Fun Fun Bar, Soriano 922, Montevideo",
        "venue_short": "Baar Fun Fun",
        "is_free": False,
        "price": 700,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.baarfunfun.com",
        "source_label": "baarfunfun.com",
        "photos": ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"],
        "titles": {
            "en": "Live Candombe & Dancing at Baar Fun Fun",
            "es": "Candombe en Vivo y Baile en Baar Fun Fun",
            "ru": "Живое кандомбе и танцы в Baar Fun Fun",
            "uk": "Живе кандомбе та танці в Baar Fun Fun",
            "de": "Live-Candombe & Tanzen im Baar Fun Fun",
        },
        "bodies": {
            "en": "One of Montevideo's most iconic bars hosts a live candombe night. Drums, dancing, and the authentic spirit of Uruguayan nightlife in a venue that's been open since 1895. Come ready to dance!",
            "es": "Uno de los bares más icónicos de Montevideo presenta una noche de candombe en vivo. Tambores, baile y el espíritu auténtico de la noche uruguaya en un local abierto desde 1895. ¡Ven preparado para bailar!",
            "ru": "Один из самых знаковых баров Монтевидео устраивает вечер живого кандомбе. Барабаны, танцы и подлинный дух уругвайской ночной жизни в заведении, работающем с 1895 года. Приходите танцевать!",
            "uk": "Один із найзнаковіших барів Монтевідео влаштовує вечір живого кандомбе. Барабани, танці та справжній дух уругвайського нічного життя в закладі, що працює з 1895 року. Приходьте танцювати!",
            "de": "Eine der ikonischsten Bars Montevideos veranstaltet einen Live-Candombe-Abend. Trommeln, Tanzen und der authentische Geist des uruguayischen Nachtlebens in einem Lokal, das seit 1895 geöffnet ist.",
        },
    },
    {
        "iso_local": "2026-06-09 10:00",
        "duration_minutes": 180,
        "category": "guided-tours",
        "address": "Estadio Centenario, Av. Dr. Américo Ricaldoni, Montevideo",
        "venue_short": "Estadio Centenario",
        "is_free": False,
        "price": 500,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.estadiocentenario.com.uy",
        "source_label": "estadiocentenario.com.uy",
        "photos": ["https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80"],
        "titles": {
            "en": "Estadio Centenario Tour & Football Museum",
            "es": "Tour del Estadio Centenario y Museo del Fútbol",
            "ru": "Экскурсия по стадиону Сентенарио и Музей футбола",
            "uk": "Екскурсія стадіоном Сентенаріо та Музей футболу",
            "de": "Estadio Centenario Tour & Fußballmuseum",
        },
        "bodies": {
            "en": "Visit the legendary Estadio Centenario — built for the first FIFA World Cup in 1930. Tour the pitch, locker rooms, VIP boxes, and the Football Museum with memorabilia from Uruguay's golden era.",
            "es": "Visita el legendario Estadio Centenario — construido para la primera Copa del Mundo FIFA en 1930. Recorre la cancha, vestuarios, palcos VIP y el Museo del Fútbol con memorabilia de la era dorada de Uruguay.",
            "ru": "Посетите легендарный стадион Сентенарио — построенный для первого чемпионата мира по футболу в 1930 году. Экскурсия по полю, раздевалкам, VIP-ложам и Музею футбола с памятными вещами золотой эры Уругвая.",
            "uk": "Відвідайте легендарний стадіон Сентенаріо — побудований для першого чемпіонату світу з футболу в 1930 році. Екскурсія полем, роздягальнями, VIP-ложами та Музеєм футболу з пам'ятними речами золотої ери Уругваю.",
            "de": "Besuchen Sie das legendäre Estadio Centenario — erbaut für die erste FIFA-Weltmeisterschaft 1930. Besichtigen Sie das Spielfeld, Umkleidekabinen, VIP-Logen und das Fußballmuseum mit Memorabilia aus Uruguays goldener Ära.",
        },
    },
    {
        "iso_local": "2026-06-11 19:30",
        "duration_minutes": 120,
        "category": "cooking",
        "address": "Espacio Serrano, José Ellauri 523, Montevideo",
        "venue_short": "Espacio Serrano, Pocitos",
        "is_free": False,
        "price": 3800,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.espacioserrano.com.uy",
        "source_label": "espacioserrano.com.uy",
        "photos": ["https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=800&q=80"],
        "titles": {
            "en": "Pasta Making Workshop: Fresh Ravioli & Gnocchi",
            "es": "Taller de Pastas: Ravioles y Ñoquis Frescos",
            "ru": "Мастер-класс по пасте: свежие равиоли и ньокки",
            "uk": "Майстер-клас з пасти: свіжі равіолі та ньоккі",
            "de": "Pasta-Workshop: Frische Ravioli & Gnocchi",
        },
        "bodies": {
            "en": "Learn to make fresh pasta from scratch — ravioli with ricotta & spinach filling and potato gnocchi with homemade tomato sauce. Hands-on class followed by a sit-down dinner with wine. Max 12 participants.",
            "es": "Aprende a hacer pasta fresca desde cero — ravioles con relleno de ricota y espinaca y ñoquis de papa con salsa de tomate casera. Clase práctica seguida de cena con vino. Máximo 12 participantes.",
            "ru": "Научитесь делать свежую пасту с нуля — равиоли с начинкой из рикотты и шпината и картофельные ньокки с домашним томатным соусом. Практический класс с последующим ужином с вином. Макс. 12 участников.",
            "uk": "Навчіться робити свіжу пасту з нуля — равіолі з начинкою з рікотти та шпинату та картопляні ньоккі з домашнім томатним соусом. Практичний клас з подальшою вечерею з вином. Макс. 12 учасників.",
            "de": "Lernen Sie, frische Pasta von Grund auf herzustellen — Ravioli mit Ricotta-Spinat-Füllung und Kartoffel-Gnocchi mit hausgemachter Tomatensauce. Praxiskurs mit anschließendem Abendessen mit Wein. Max. 12 Teilnehmer.",
        },
    },
    {
        "iso_local": "2026-06-13 16:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "Espacio de Arte Contemporáneo, Arenal Grande 1930, Montevideo",
        "venue_short": "EAC, Aguada",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://eac.gub.uy",
        "source_label": "eac.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80"],
        "titles": {
            "en": "Contemporary Art Space: Interactive Installation Opening",
            "es": "Espacio de Arte Contemporáneo: Inauguración de Instalación Interactiva",
            "ru": "Пространство современного искусства: открытие интерактивной инсталляции",
            "uk": "Простір сучасного мистецтва: відкриття інтерактивної інсталяції",
            "de": "Zeitgenössischer Kunstraum: Eröffnung einer interaktiven Installation",
        },
        "bodies": {
            "en": "Opening night of a new interactive installation at the Espacio de Arte Contemporáneo — a former prison turned art space. Immersive audiovisual experience exploring memory and urban transformation. Free entry, drinks available.",
            "es": "Noche de inauguración de una nueva instalación interactiva en el Espacio de Arte Contemporáneo — una antigua cárcel convertida en espacio artístico. Experiencia audiovisual inmersiva sobre memoria y transformación urbana. Entrada libre, bebidas disponibles.",
            "ru": "Открытие новой интерактивной инсталляции в Пространстве современного искусства — бывшей тюрьме, превращённой в арт-пространство. Иммерсивный аудиовизуальный опыт о памяти и городской трансформации. Вход свободный.",
            "uk": "Відкриття нової інтерактивної інсталяції в Просторі сучасного мистецтва — колишній в'язниці, перетвореній на арт-простір. Імерсивний аудіовізуальний досвід про пам'ять та міську трансформацію. Вхід вільний.",
            "de": "Eröffnungsabend einer neuen interaktiven Installation im Espacio de Arte Contemporáneo — einem ehemaligen Gefängnis, das zum Kunstraum wurde. Immersives audiovisuelles Erlebnis über Erinnerung und urbane Transformation. Freier Eintritt.",
        },
    },
    {
        "iso_local": "2026-06-16 19:00",
        "duration_minutes": 150,
        "category": "wine-tasting",
        "address": "Bodega Spinoglio, Cno. Cibils 4488, Montevideo",
        "venue_short": "Bodega Spinoglio",
        "is_free": False,
        "price": 2500,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.bodegaspinoglio.com",
        "source_label": "bodegaspinoglio.com",
        "photos": ["https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80"],
        "titles": {
            "en": "Wine & Cheese Evening at Bodega Spinoglio",
            "es": "Noche de Vinos y Quesos en Bodega Spinoglio",
            "ru": "Вечер вина и сыра в Bodega Spinoglio",
            "uk": "Вечір вина та сиру в Bodega Spinoglio",
            "de": "Wein- & Käseabend in der Bodega Spinoglio",
        },
        "bodies": {
            "en": "An intimate wine and cheese pairing evening at the family-run Bodega Spinoglio. Taste 5 wines (Tannat, Merlot, Sauvignon Blanc) paired with artisan Uruguayan cheeses. Cellar tour included.",
            "es": "Una velada íntima de maridaje de vinos y quesos en la bodega familiar Spinoglio. Degusta 5 vinos (Tannat, Merlot, Sauvignon Blanc) con quesos artesanales uruguayos. Incluye recorrido por la bodega.",
            "ru": "Камерный вечер вина и сыра в семейной винодельне Spinoglio. Дегустация 5 вин (Таннат, Мерло, Совиньон Блан) в сочетании с ремесленными уругвайскими сырами. Экскурсия по погребу включена.",
            "uk": "Камерний вечір вина та сиру в сімейній виноробні Spinoglio. Дегустація 5 вин (Таннат, Мерло, Совіньйон Блан) у поєднанні з ремісничими уругвайськими сирами. Екскурсія погребом включена.",
            "de": "Ein intimer Wein- und Käse-Pairing-Abend im familiengeführten Weingut Spinoglio. Verkosten Sie 5 Weine (Tannat, Merlot, Sauvignon Blanc) mit handwerklichen uruguayischen Käsesorten. Kellerführung inklusive.",
        },
    },
    {
        "iso_local": "2026-06-18 18:30",
        "duration_minutes": 90,
        "category": "networking",
        "address": "Cowork Latam, Rincón 487, Montevideo",
        "venue_short": "Cowork Latam, Ciudad Vieja",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80"],
        "titles": {
            "en": "Tech Meetup: Startups & Innovation in Uruguay",
            "es": "Meetup Tech: Startups e Innovación en Uruguay",
            "ru": "Tech-митап: стартапы и инновации в Уругвае",
            "uk": "Tech-мітап: стартапи та інновації в Уругваї",
            "de": "Tech-Meetup: Startups & Innovation in Uruguay",
        },
        "bodies": {
            "en": "Monthly tech meetup for founders, developers, and innovators in Montevideo. Lightning talks from 3 local startups, networking, and Q&A. Pizza and drinks provided. All tech backgrounds welcome.",
            "es": "Meetup tech mensual para fundadores, desarrolladores e innovadores en Montevideo. Charlas relámpago de 3 startups locales, networking y Q&A. Pizza y bebidas incluidas. Todos los perfiles tech son bienvenidos.",
            "ru": "Ежемесячный tech-митап для основателей, разработчиков и инноваторов в Монтевидео. Блиц-доклады от 3 местных стартапов, нетворкинг и Q&A. Пицца и напитки включены. Все tech-профили приветствуются.",
            "uk": "Щомісячний tech-мітап для засновників, розробників та інноваторів у Монтевідео. Бліц-доповіді від 3 місцевих стартапів, нетворкінг та Q&A. Піца та напої включені. Всі tech-профілі вітаються.",
            "de": "Monatliches Tech-Meetup für Gründer, Entwickler und Innovatoren in Montevideo. Lightning Talks von 3 lokalen Startups, Networking und Q&A. Pizza und Getränke inklusive. Alle Tech-Hintergründe willkommen.",
        },
    },
    {
        "iso_local": "2026-06-20 20:30",
        "duration_minutes": 90,
        "category": "theater",
        "address": "Teatro El Galpón, 18 de Julio 1618, Montevideo",
        "venue_short": "Teatro El Galpón",
        "is_free": False,
        "price": 900,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.teatroelgalpon.org.uy",
        "source_label": "teatroelgalpon.org.uy",
        "photos": ["https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80"],
        "titles": {
            "en": "Independent Theater: 'El Sur' at Teatro El Galpón",
            "es": "Teatro Independiente: 'El Sur' en Teatro El Galpón",
            "ru": "Независимый театр: «Юг» в Teatro El Galpón",
            "uk": "Незалежний театр: «Південь» у Teatro El Galpón",
            "de": "Unabhängiges Theater: 'El Sur' im Teatro El Galpón",
        },
        "bodies": {
            "en": "A new production at Uruguay's most important independent theater. 'El Sur' explores themes of migration, identity, and belonging through physical theater and live music. 90 minutes, no intermission.",
            "es": "Una nueva producción en el teatro independiente más importante de Uruguay. 'El Sur' explora temas de migración, identidad y pertenencia a través del teatro físico y música en vivo. 90 minutos, sin intervalo.",
            "ru": "Новая постановка в самом важном независимом театре Уругвая. «Юг» исследует темы миграции, идентичности и принадлежности через физический театр и живую музыку. 90 минут без антракта.",
            "uk": "Нова постановка в найважливішому незалежному театрі Уругваю. «Південь» досліджує теми міграції, ідентичності та належності через фізичний театр та живу музику. 90 хвилин без антракту.",
            "de": "Eine neue Produktion im wichtigsten unabhängigen Theater Uruguays. 'El Sur' erforscht Themen wie Migration, Identität und Zugehörigkeit durch physisches Theater und Live-Musik. 90 Minuten ohne Pause.",
        },
    },
    {
        "iso_local": "2026-06-23 09:30",
        "duration_minutes": 120,
        "category": "running",
        "address": "Parque Rodó, Av. Julio Herrera y Reissig, Montevideo",
        "venue_short": "Parque Rodó",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80"],
        "titles": {
            "en": "Trail Run in Parque Rodó",
            "es": "Carrera por Senderos en Parque Rodó",
            "ru": "Трейл-ран в парке Родо",
            "uk": "Трейл-ран у парку Родо",
            "de": "Trail-Run im Parque Rodó",
        },
        "bodies": {
            "en": "A fun trail run through the paths and hills of Parque Rodó — Montevideo's most beloved urban park. 5K loop with optional second lap. Followed by stretching and coffee at a nearby café. All paces welcome.",
            "es": "Una carrera divertida por los senderos y colinas del Parque Rodó — el parque urbano más querido de Montevideo. Circuito de 5K con segunda vuelta opcional. Seguida de estiramiento y café en un bar cercano. Todos los ritmos.",
            "ru": "Весёлый трейл-ран по тропинкам и холмам парка Родо — самого любимого городского парка Монтевидео. Круг 5 км с опциональным вторым. После — растяжка и кофе в ближайшем кафе. Любой темп.",
            "uk": "Веселий трейл-ран стежками та пагорбами парку Родо — найулюбленішого міського парку Монтевідео. Коло 5 км з опціональним другим. Після — розтяжка та кава в найближчому кафе. Будь-який темп.",
            "de": "Ein spaßiger Trail-Run durch die Wege und Hügel des Parque Rodó — Montevideos beliebtestem Stadtpark. 5-km-Runde mit optionaler zweiter Runde. Danach Stretching und Kaffee in einem nahen Café. Alle Tempos willkommen.",
        },
    },
    {
        "iso_local": "2026-06-25 19:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "Palacio Salvo, Plaza Independencia 848, Montevideo",
        "venue_short": "Palacio Salvo",
        "is_free": False,
        "price": 1200,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.palaciosalvo.com",
        "source_label": "palaciosalvo.com",
        "photos": ["https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80"],
        "titles": {
            "en": "Sunset Tour of Palacio Salvo",
            "es": "Tour al Atardecer del Palacio Salvo",
            "ru": "Экскурсия по Паласио Сальво на закате",
            "uk": "Екскурсія по Паласіо Сальво на заході сонця",
            "de": "Sonnenuntergangs-Tour im Palacio Salvo",
        },
        "bodies": {
            "en": "Explore Montevideo's iconic Palacio Salvo — once the tallest building in South America — with a guided sunset tour. Visit the lighthouse tower for panoramic views of the city and Río de la Plata as the sun sets.",
            "es": "Explora el icónico Palacio Salvo de Montevideo — alguna vez el edificio más alto de Sudamérica — con un tour guiado al atardecer. Visita la torre faro para vistas panorámicas de la ciudad y el Río de la Plata al caer el sol.",
            "ru": "Исследуйте знаковый Паласио Сальво — когда-то самое высокое здание Южной Америки — на экскурсии на закате. Поднимитесь на башню-маяк для панорамных видов города и Рио-де-ла-Плата в лучах заходящего солнца.",
            "uk": "Дослідіть знаковий Паласіо Сальво — колись найвищу будівлю Південної Америки — на екскурсії на заході сонця. Піднімітесь на вежу-маяк для панорамних видів міста та Ріо-де-ла-Плата в променях заходу.",
            "de": "Erkunden Sie den ikonischen Palacio Salvo — einst das höchste Gebäude Südamerikas — bei einer geführten Sonnenuntergangstour. Besuchen Sie den Leuchtturm für Panoramablicke auf die Stadt und den Río de la Plata.",
        },
    },
    {
        "iso_local": "2026-06-26 20:00",
        "duration_minutes": 120,
        "category": "music",
        "address": "Sala Camacuá, Camacuá 575, Montevideo",
        "venue_short": "Sala Camacuá, Ciudad Vieja",
        "is_free": False,
        "price": 1000,
        "currency": "UYU",
        "languages": ["es"],
        "source_url": "https://www.salacamacua.com",
        "source_label": "salacamacua.com",
        "photos": ["https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80"],
        "titles": {
            "en": "Murga Night: Uruguayan Carnival Music",
            "es": "Noche de Murga: Música de Carnaval Uruguayo",
            "ru": "Вечер мурги: уругвайская карнавальная музыка",
            "uk": "Вечір мурги: уругвайська карнавальна музика",
            "de": "Murga-Abend: Uruguayische Karnevalsmusik",
        },
        "bodies": {
            "en": "Experience murga — Uruguay's unique carnival art form combining satirical theater, choral singing, and percussion. A local murga group performs their latest show at the intimate Sala Camacuá. Deeply Uruguayan, deeply fun.",
            "es": "Vive la murga — la forma artística carnavalesca única de Uruguay que combina teatro satírico, canto coral y percusión. Un grupo de murga local presenta su último espectáculo en la íntima Sala Camacuá. Profundamente uruguayo, profundamente divertido.",
            "ru": "Почувствуйте мургу — уникальную уругвайскую карнавальную форму искусства, сочетающую сатирический театр, хоровое пение и перкуссию. Местная группа мурги представляет своё последнее шоу в камерном зале Camacuá. Глубоко уругвайское, невероятно весёлое.",
            "uk": "Відчуйте мургу — унікальну уругвайську карнавальну форму мистецтва, що поєднує сатиричний театр, хоровий спів та перкусію. Місцева група мурги представляє своє останнє шоу в камерному залі Camacuá. Глибоко уругвайське, неймовірно веселе.",
            "de": "Erleben Sie Murga — Uruguays einzigartige Karnevalskunstform, die satirisches Theater, Chorgesang und Perkussion vereint. Eine lokale Murga-Gruppe präsentiert ihre neueste Show in der intimen Sala Camacuá. Zutiefst uruguayisch, zutiefst unterhaltsam.",
        },
    },
    {
        "iso_local": "2026-06-28 11:00",
        "duration_minutes": 180,
        "category": "guided-tours",
        "address": "Palacio Legislativo, Av. de las Leyes, Montevideo",
        "venue_short": "Palacio Legislativo",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.parlamento.gub.uy",
        "source_label": "parlamento.gub.uy",
        "photos": ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80"],
        "titles": {
            "en": "Free Tour: Palacio Legislativo — Uruguay's Parliament",
            "es": "Tour Gratuito: Palacio Legislativo — Parlamento de Uruguay",
            "ru": "Бесплатная экскурсия: Паласио Легислативо — Парламент Уругвая",
            "uk": "Безкоштовна екскурсія: Паласіо Леґіслатіво — Парламент Уругваю",
            "de": "Kostenlose Tour: Palacio Legislativo — Uruguays Parlament",
        },
        "bodies": {
            "en": "Tour one of the most beautiful parliament buildings in the Americas. The Palacio Legislativo features 12 types of marble, stained glass, and murals depicting Uruguayan history. Free guided tours on Saturdays.",
            "es": "Recorre uno de los edificios parlamentarios más hermosos de las Américas. El Palacio Legislativo presenta 12 tipos de mármol, vitrales y murales que representan la historia uruguaya. Tours guiados gratuitos los sábados.",
            "ru": "Экскурсия по одному из красивейших парламентских зданий Америки. Паласио Легислативо украшен 12 видами мрамора, витражами и фресками, изображающими историю Уругвая. Бесплатные экскурсии по субботам.",
            "uk": "Екскурсія одним із найкрасивіших парламентських будівель Америки. Паласіо Леґіслатіво прикрашений 12 видами мармуру, вітражами та фресками, що зображують історію Уругваю. Безкоштовні екскурсії по суботах.",
            "de": "Besichtigen Sie eines der schönsten Parlamentsgebäude Amerikas. Der Palacio Legislativo besticht durch 12 Marmorsorten, Buntglasfenster und Wandgemälde zur uruguayischen Geschichte. Kostenlose Führungen samstags.",
        },
    },
    {
        "iso_local": "2026-06-29 17:00",
        "duration_minutes": 120,
        "category": "photography",
        "address": "Rambla de Pocitos, Montevideo",
        "venue_short": "Rambla de Pocitos",
        "is_free": True,
        "price": None,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/find/uy--montevideo/",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80"],
        "titles": {
            "en": "Golden Hour Photo Walk along the Rambla",
            "es": "Paseo Fotográfico en la Hora Dorada por la Rambla",
            "ru": "Фотопрогулка в золотой час по Рамбле",
            "uk": "Фотопрогулянка в золоту годину по Рамблі",
            "de": "Golden-Hour-Fotowalk entlang der Rambla",
        },
        "bodies": {
            "en": "Join fellow photographers for a golden hour walk along the Rambla de Pocitos. Capture the sunset over the Río de la Plata, silhouettes of fishermen, and the city skyline. All cameras welcome — phone to DSLR. Share tips and shots afterwards.",
            "es": "Únete a otros fotógrafos para un paseo en la hora dorada por la Rambla de Pocitos. Captura el atardecer sobre el Río de la Plata, siluetas de pescadores y el skyline de la ciudad. Todas las cámaras bienvenidas. Compartimos tips y fotos después.",
            "ru": "Присоединяйтесь к фотографам на прогулке в золотой час по Рамбле-де-Поситос. Снимайте закат над Рио-де-ла-Плата, силуэты рыбаков и городской горизонт. Любая камера — от телефона до зеркалки. Обмен советами и снимками после.",
            "uk": "Приєднуйтесь до фотографів на прогулянці в золоту годину по Рамблі-де-Поситос. Знімайте захід сонця над Ріо-де-ла-Плата, силуети рибалок та міський горизонт. Будь-яка камера — від телефону до дзеркалки. Обмін порадами та знімками після.",
            "de": "Schließen Sie sich Fotografen für einen Golden-Hour-Spaziergang entlang der Rambla de Pocitos an. Fangen Sie den Sonnenuntergang über dem Río de la Plata, Silhouetten von Fischern und die Skyline ein. Alle Kameras willkommen. Tipps und Fotos teilen danach.",
        },
    },
    {
        "iso_local": "2026-06-30 19:30",
        "duration_minutes": 150,
        "category": "food-tours",
        "address": "Mercado de la Abundancia, San José 1312, Montevideo",
        "venue_short": "Mercado de la Abundancia",
        "is_free": False,
        "price": 2200,
        "currency": "UYU",
        "languages": ["es", "en"],
        "source_url": "https://www.mercadodelaabundancia.com.uy",
        "source_label": "mercadodelaabundancia.com.uy",
        "photos": ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"],
        "titles": {
            "en": "Tapas & Tango: Evening at Mercado de la Abundancia",
            "es": "Tapas y Tango: Velada en el Mercado de la Abundancia",
            "ru": "Тапас и танго: вечер в Меркадо-де-ла-Абунданция",
            "uk": "Тапас і танго: вечір у Меркадо-де-ла-Абунданція",
            "de": "Tapas & Tango: Abend im Mercado de la Abundancia",
        },
        "bodies": {
            "en": "A unique evening combining food and dance at the historic Mercado de la Abundancia. Sample tapas from multiple stalls while watching live tango performances between courses. The market's Joventango milonga hosts dancing after 21:00.",
            "es": "Una velada única que combina gastronomía y baile en el histórico Mercado de la Abundancia. Prueba tapas de varios puestos mientras disfrutas de tango en vivo entre platos. La milonga Joventango del mercado ofrece baile después de las 21:00.",
            "ru": "Уникальный вечер, сочетающий еду и танец в историческом Меркадо-де-ла-Абунданция. Пробуйте тапас из разных лавок, наблюдая за живым танго между блюдами. Милонга Joventango в рынке приглашает танцевать после 21:00.",
            "uk": "Унікальний вечір, що поєднує їжу та танець в історичному Меркадо-де-ла-Абунданція. Пробуйте тапас з різних лавок, спостерігаючи за живим танго між стравами. Мілонга Joventango в ринку запрошує танцювати після 21:00.",
            "de": "Ein einzigartiger Abend, der Essen und Tanz im historischen Mercado de la Abundancia verbindet. Probieren Sie Tapas von verschiedenen Ständen und genießen Sie Live-Tango zwischen den Gängen. Die Joventango-Milonga im Markt lädt ab 21:00 zum Tanzen ein.",
        },
    },
]

def local_to_utc(iso_local):
    from datetime import datetime, timedelta
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
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
        print("ERROR: Montevideo not found in cities table.")
        sys.exit(1)
    city_id = cities[0]["id"]
    print(f"Montevideo city_id: {city_id}")

    inserted = 0
    skipped = 0

    for ev in EVENTS:
        title_en = ev["titles"]["en"]
        check_url = f"{url}/rest/v1/events?title=eq.{urllib.parse.quote(title_en)}&select=id"
        req = urllib.request.Request(check_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            existing = json.loads(resp.read())
        if existing:
            print(f"  SKIP: {title_en}")
            skipped += 1
            continue

        starts_at = local_to_utc(ev["iso_local"])
        desc_doc = build_description(
            titles=ev["titles"], bodies=ev["bodies"],
            when_local_label=ev["iso_local"].replace("-", "."),
            venue=ev["venue_short"],
            source_url=ev["source_url"], source_label=ev["source_label"],
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
                print(f"  OK: {title_en}")
                inserted += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"  ERROR: {title_en}: {e.code} {body}")

    print(f"\nDone. Inserted: {inserted}, Skipped: {skipped}")

if __name__ == "__main__":
    main()
