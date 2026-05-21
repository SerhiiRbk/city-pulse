#!/usr/bin/env python3
"""Seed 20 additional system events in Tel Aviv for May-June 2026 (round 2)."""

from __future__ import annotations
import json, os, ssl, sys, urllib.request
from typing import Any

CITY_ID = "7a919ae9-252b-4367-b1f4-32586c7e335c"
SYSTEM_ORGANIZER_ID = "acbb238e-f24f-4534-b92a-fa4bcfc7e07e"

CAT = {
    "music": "87186d0a-5631-4b30-863f-fabd5d8f74e4",
    "guided-tours": "77d52bca-998b-4edd-bfb0-e71d5ee264c0",
    "running": "eebf6066-7396-4c79-9b48-60ab375fd9e0",
    "cycling": "2f479b11-7373-45f8-b7bd-155550b56a4b",
    "yoga": "d6602677-7e65-40a6-80c5-08500586edc3",
    "dancing": "a265eff9-ce91-417f-8780-493d024a9e85",
    "museums": "d9b20fbf-7a7e-466b-acf5-1c379e6b94d6",
    "photography": "a588fd1c-bff3-4270-90af-10dd2ed83a18",
    "cooking": "69bd018c-a7fc-4af9-a9b5-1dcaa655d582",
    "food-tours": "c06ab503-5719-4c1c-bd8f-34828aa7ed5c",
    "networking": "71835799-4ffd-46b1-b6e5-f7fd9ebc11b6",
    "startups": "8a45fced-9e00-46be-90c9-96606dc1515e",
    "craft-beer": "16d1baf1-d04e-40e0-b3fb-f791c071e6e3",
    "wine-tasting": "e6428a86-ac38-414a-988c-2ce103ae5b13",
    "standup": "7a62f02d-63cc-4dba-a2b8-757c0adcc7a0",
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

LANG_ORDER = ["en", "de", "ru", "uk", "es"]
LANG_LABEL = {"en": "English", "de": "Deutsch", "ru": "Русский", "uk": "Українська", "es": "Español"}

def t_text(s, marks=None):
    node = {"type": "text", "text": s}
    if marks: node["marks"] = marks
    return node
def t_link(label, href): return t_text(label, [{"type": "link", "attrs": {"href": href}}])
def t_h2(s): return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(s)]}
def t_h3(s): return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(s)]}
def t_para(*nodes): return {"type": "paragraph", "content": list(nodes)}

def build_description(*, titles, bodies, when_local_label, venue, source_url, source_label):
    blocks = []
    for lang in LANG_ORDER:
        blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
        blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_local_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}

EVENTS = [
    {
        "iso_local": "2026-05-23 10:00", "duration_minutes": 180, "category": "food-tours",
        "address": "Jaffa Flea Market, Olei Zion St, Jaffa", "venue_short": "Jaffa Flea Market",
        "lat": 32.052, "lng": 34.752, "is_free": False, "price": 200, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-food", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"],
        "titles": {"en": "Jaffa Flea Market Food Tour", "de": "Jaffa Flohmarkt Food Tour", "ru": "Фуд-тур по блошиному рынку Яффо", "uk": "Фуд-тур по блошиному ринку Яффо", "es": "Tour gastronómico del Mercado de Jaffa"},
        "bodies": {"en": "Explore the vibrant Jaffa Flea Market with a local foodie. Taste fresh sabich, malabi, knafeh, and artisan cheeses. Discover hidden stalls, vintage shops, and the stories behind this ancient port neighborhood.", "de": "Erkunde den lebhaften Jaffa-Flohmarkt mit einem lokalen Foodie. Probiere frischen Sabich, Malabi, Knafeh und handwerklichen Käse. Entdecke versteckte Stände und die Geschichten hinter diesem alten Hafenviertel.", "ru": "Исследуйте оживлённый блошиный рынок Яффо с местным фуди. Попробуйте свежий сабих, малаби, кнафе и ремесленные сыры. Откройте скрытые лавки и истории этого древнего портового района.", "uk": "Дослідіть жвавий блошиний ринок Яффо з місцевим фуді. Спробуйте свіжий сабіх, малабі, кнафе та ремісничі сири. Відкрийте приховані лавки та історії цього давнього портового району.", "es": "Explora el vibrante Mercado de Pulgas de Jaffa con un foodie local. Prueba sabich fresco, malabi, knafeh y quesos artesanales. Descubre puestos ocultos y las historias de este antiguo barrio portuario."},
    },
    {
        "iso_local": "2026-05-25 11:00", "duration_minutes": 180, "category": "cooking",
        "address": "Cooking Studio TLV, Dizengoff 99, Tel Aviv", "venue_short": "Cooking Studio TLV",
        "lat": 32.078, "lng": 34.774, "is_free": False, "price": 250, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.cookingstudiotlv.com", "source_label": "cookingstudiotlv.com",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {"en": "Hummus Making Workshop — From Scratch", "de": "Hummus-Workshop — Von Grund auf", "ru": "Мастер-класс по хумусу — с нуля", "uk": "Майстер-клас з хумусу — з нуля", "es": "Taller de hummus — Desde cero"},
        "bodies": {"en": "Learn to make perfect Israeli hummus from scratch — soaking, cooking, and blending techniques for the creamiest result. Plus tahini, falafel, and fresh pita. Take home recipes and a jar of your own hummus.", "de": "Lerne perfekten israelischen Hummus von Grund auf zu machen — Einweich-, Koch- und Mixertechniken für das cremigste Ergebnis. Plus Tahini, Falafel und frisches Pita. Rezepte und ein Glas Hummus zum Mitnehmen.", "ru": "Научитесь готовить идеальный израильский хумус с нуля — техники замачивания, варки и смешивания для самого кремового результата. Плюс тахини, фалафель и свежая пита. Рецепты и банка хумуса с собой.", "uk": "Навчіться готувати ідеальний ізраїльський хумус з нуля — техніки замочування, варіння та змішування для найкремовішого результату. Плюс тахіні, фалафель та свіжа піта. Рецепти та банка хумусу з собою.", "es": "Aprende a hacer hummus israelí perfecto desde cero — técnicas de remojo, cocción y mezcla para el resultado más cremoso. Más tahini, falafel y pita fresca. Llévate recetas y un tarro de tu propio hummus."},
    },
    {
        "iso_local": "2026-05-27 17:00", "duration_minutes": 120, "category": "guided-tours",
        "address": "Florentin, Tel Aviv", "venue_short": "Florentin",
        "lat": 32.058, "lng": 34.770, "is_free": False, "price": 80, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.tlvstreetart.com", "source_label": "tlvstreetart.com",
        "photos": ["https://images.unsplash.com/photo-1569017388730-020b5f80a004?w=800&q=80"],
        "titles": {"en": "Graffiti & Street Art Tour — Florentin", "de": "Graffiti & Street Art Tour — Florentin", "ru": "Тур по граффити и стрит-арту — Флорентин", "uk": "Тур по графіті та стріт-арту — Флорентін", "es": "Tour de graffiti y arte urbano — Florentin"},
        "bodies": {"en": "Discover Tel Aviv's most vibrant street art neighborhood with a local artist guide. See works by Dede, Klone, and international muralists. Learn about the stories, politics, and techniques behind Florentin's ever-changing walls.", "de": "Entdecke Tel Avivs lebendigstes Street-Art-Viertel mit einem lokalen Künstler-Guide. Sieh Werke von Dede, Klone und internationalen Muralisten. Erfahre mehr über die Geschichten hinter Florentins sich ständig verändernden Wänden.", "ru": "Откройте самый яркий район стрит-арта Тель-Авива с местным художником-гидом. Увидьте работы Dede, Klone и международных муралистов. Узнайте истории, политику и техники за постоянно меняющимися стенами Флорентина.", "uk": "Відкрийте найяскравіший район стріт-арту Тель-Авіва з місцевим художником-гідом. Побачте роботи Dede, Klone та міжнародних муралістів. Дізнайтесь історії, політику та техніки за стінами Флорентіна, що постійно змінюються.", "es": "Descubre el barrio de arte urbano más vibrante de Tel Aviv con un artista local como guía. Ve obras de Dede, Klone y muralistas internacionales. Conoce las historias y técnicas detrás de los muros cambiantes de Florentin."},
    },
    {
        "iso_local": "2026-05-29 17:30", "duration_minutes": 90, "category": "other",
        "address": "Tel Aviv Marina, Tel Aviv", "venue_short": "TLV Marina",
        "lat": 32.088, "lng": 34.764, "is_free": False, "price": 150, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-paddle", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"],
        "titles": {"en": "Sunset Paddleboard — Tel Aviv Marina", "de": "Sonnenuntergangs-Paddleboard — Tel Aviv Marina", "ru": "Сапборд на закате — марина Тель-Авива", "uk": "Сапборд на заході — марина Тель-Авіва", "es": "Paddleboard al atardecer — Marina de Tel Aviv"},
        "bodies": {"en": "Glide across calm Mediterranean waters on a stand-up paddleboard as the sun sets over Tel Aviv's skyline. No experience needed — instruction included. Board, paddle, and life vest provided. Meet at the marina dock.", "de": "Gleite über ruhiges Mittelmeerwasser auf einem Stand-Up-Paddleboard, während die Sonne über Tel Avivs Skyline untergeht. Keine Erfahrung nötig — Anleitung inklusive. Board, Paddel und Schwimmweste gestellt.", "ru": "Скользите по спокойным водам Средиземного моря на сапборде на закате над горизонтом Тель-Авива. Опыт не нужен — инструктаж включён. Доска, весло и спасательный жилет предоставляются.", "uk": "Ковзайте по спокійних водах Середземного моря на сапборді на заході над горизонтом Тель-Авіва. Досвід не потрібен — інструктаж включений. Дошка, весло та рятувальний жилет надаються.", "es": "Deslízate por las aguas tranquilas del Mediterráneo en paddleboard mientras el sol se pone sobre el skyline de Tel Aviv. Sin experiencia necesaria — instrucción incluida. Tabla, remo y chaleco proporcionados."},
    },
    {
        "iso_local": "2026-05-30 19:00", "duration_minutes": 180, "category": "networking",
        "address": "Abraham Hostel, Levontin 21, Tel Aviv", "venue_short": "Abraham Hostel",
        "lat": 32.062, "lng": 34.772, "is_free": True, "price": None, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.abrahamhostels.com", "source_label": "abrahamhostels.com",
        "photos": ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80"],
        "titles": {"en": "Friday Night Shabbat Dinner — Community", "de": "Freitagabend Schabbat-Dinner — Gemeinschaft", "ru": "Шаббатний ужин в пятницу — сообщество", "uk": "Шабатня вечеря в п'ятницю — спільнота", "es": "Cena de Shabat del viernes — Comunidad"},
        "bodies": {"en": "Experience a traditional Shabbat dinner with travelers and locals at Abraham Hostel. Candle lighting, challah, wine, and a home-cooked Israeli meal. A warm, inclusive way to welcome the weekend — all backgrounds welcome.", "de": "Erlebe ein traditionelles Schabbat-Dinner mit Reisenden und Einheimischen im Abraham Hostel. Kerzenlicht, Challah, Wein und ein hausgemachtes israelisches Essen. Ein warmer, inklusiver Weg, das Wochenende zu begrüßen.", "ru": "Испытайте традиционный шаббатний ужин с путешественниками и местными в Abraham Hostel. Зажигание свечей, хала, вино и домашняя израильская еда. Тёплый, инклюзивный способ встретить выходные — все приветствуются.", "uk": "Відчуйте традиційну шабатню вечерю з мандрівниками та місцевими в Abraham Hostel. Запалювання свічок, хала, вино та домашня ізраїльська їжа. Теплий, інклюзивний спосіб зустріти вихідні — всі вітаються.", "es": "Experimenta una cena tradicional de Shabat con viajeros y locales en Abraham Hostel. Encendido de velas, jalá, vino y comida israelí casera. Una forma cálida e inclusiva de dar la bienvenida al fin de semana."},
    },
    {
        "iso_local": "2026-06-01 21:00", "duration_minutes": 180, "category": "dancing",
        "address": "Alma Beach, Tel Aviv", "venue_short": "Alma Beach",
        "lat": 32.055, "lng": 34.758, "is_free": True, "price": None, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-salsa", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {"en": "Salsa Night — Alma Beach", "de": "Salsa-Nacht — Alma Beach", "ru": "Сальса-вечер — пляж Альма", "uk": "Сальса-вечір — пляж Альма", "es": "Noche de salsa — Playa Alma"},
        "bodies": {"en": "Dance salsa barefoot on the sand at Alma Beach in Jaffa. Free beginner lesson at 9pm, open dancing until midnight. Live DJ spinning Cuban and Latin rhythms with the Mediterranean as your backdrop. No partner needed!", "de": "Tanze Salsa barfuß im Sand am Alma Beach in Jaffa. Kostenlose Anfängerlektion um 21 Uhr, offenes Tanzen bis Mitternacht. Live-DJ mit kubanischen und lateinamerikanischen Rhythmen am Mittelmeer. Kein Partner nötig!", "ru": "Танцуйте сальсу босиком на песке пляжа Альма в Яффо. Бесплатный урок для начинающих в 21:00, свободные танцы до полуночи. Живой DJ с кубинскими и латинскими ритмами на фоне Средиземного моря. Партнёр не нужен!", "uk": "Танцюйте сальсу босоніж на піску пляжу Альма в Яффо. Безкоштовний урок для початківців о 21:00, вільні танці до півночі. Живий DJ з кубинськими та латинськими ритмами на фоні Середземного моря. Партнер не потрібен!", "es": "Baila salsa descalzo en la arena de Playa Alma en Jaffa. Clase gratuita para principiantes a las 21h, baile libre hasta medianoche. DJ en vivo con ritmos cubanos y latinos con el Mediterráneo de fondo. ¡Sin pareja!"},
    },
    {
        "iso_local": "2026-06-03 09:30", "duration_minutes": 150, "category": "guided-tours",
        "address": "Old Jaffa, Clock Tower Square", "venue_short": "Old Jaffa",
        "lat": 32.052, "lng": 34.752, "is_free": False, "price": 60, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.sandemans.com/tel-aviv", "source_label": "sandemans.com",
        "photos": ["https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80"],
        "titles": {"en": "Old Jaffa Walking Tour — 4000 Years of History", "de": "Altstadt Jaffa Führung — 4000 Jahre Geschichte", "ru": "Пешеходная экскурсия по Старому Яффо — 4000 лет истории", "uk": "Пішохідна екскурсія по Старому Яффо — 4000 років історії", "es": "Tour a pie por el Viejo Jaffa — 4000 años de historia"},
        "bodies": {"en": "Walk through 4,000 years of history in Old Jaffa — from ancient Egyptian port to Ottoman alleys to today's artist quarter. Visit the wishing bridge, St. Peter's Church, and the famous flea market. Stories of Jonah, Napoleon, and modern Israel.", "de": "Wandere durch 4.000 Jahre Geschichte im alten Jaffa — vom ägyptischen Hafen über osmanische Gassen bis zum heutigen Künstlerviertel. Besuche die Wunschbrücke, die Peterskirche und den berühmten Flohmarkt.", "ru": "Пройдите через 4000 лет истории в Старом Яффо — от древнеегипетского порта через османские переулки до современного квартала художников. Посетите мост желаний, церковь Святого Петра и знаменитый блошиный рынок.", "uk": "Пройдіть через 4000 років історії в Старому Яффо — від давньоєгипетського порту через османські провулки до сучасного кварталу художників. Відвідайте міст бажань, церкву Святого Петра та знаменитий блошиний ринок.", "es": "Camina por 4.000 años de historia en el Viejo Jaffa — desde puerto egipcio antiguo hasta callejones otomanos y el barrio artístico actual. Visita el puente de los deseos, la Iglesia de San Pedro y el famoso mercadillo."},
    },
    {
        "iso_local": "2026-06-05 19:00", "duration_minutes": 150, "category": "other",
        "address": "Imperial Craft Cocktail Bar, HaYarkon 66, Tel Aviv", "venue_short": "Imperial Bar",
        "lat": 32.075, "lng": 34.768, "is_free": False, "price": 220, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.imperialbar.co.il", "source_label": "imperialbar.co.il",
        "photos": ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80"],
        "titles": {"en": "Craft Cocktail Workshop — Mixology Basics", "de": "Craft-Cocktail-Workshop — Mixologie-Grundlagen", "ru": "Мастер-класс по коктейлям — основы миксологии", "uk": "Майстер-клас з коктейлів — основи міксології", "es": "Taller de cócteles artesanales — Bases de mixología"},
        "bodies": {"en": "Learn to craft 3 signature cocktails with a professional bartender at one of Tel Aviv's top bars. Techniques include muddling, shaking, layering, and garnishing. Includes all drinks, snacks, and recipes to take home.", "de": "Lerne 3 Signature-Cocktails mit einem professionellen Barkeeper in einer der besten Bars Tel Avivs zu mixen. Techniken: Muddling, Shaking, Layering und Garnieren. Inklusive aller Drinks, Snacks und Rezepte.", "ru": "Научитесь готовить 3 авторских коктейля с профессиональным барменом в одном из лучших баров Тель-Авива. Техники: мадлинг, шейкинг, слоение и гарнирование. Включает все напитки, закуски и рецепты.", "uk": "Навчіться готувати 3 авторських коктейлі з професійним барменом в одному з найкращих барів Тель-Авіва. Техніки: мадлінг, шейкінг, шарування та гарнірування. Включає всі напої, закуски та рецепти.", "es": "Aprende a preparar 3 cócteles de autor con un bartender profesional en uno de los mejores bares de Tel Aviv. Técnicas: muddling, shaking, layering y garnishing. Incluye todas las bebidas, snacks y recetas."},
    },
    {
        "iso_local": "2026-06-07 20:30", "duration_minutes": 120, "category": "standup",
        "address": "Comedy Bar, Allenby 80, Tel Aviv", "venue_short": "Comedy Bar TLV",
        "lat": 32.068, "lng": 34.770, "is_free": False, "price": 50, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.comedybar.co.il", "source_label": "comedybar.co.il",
        "photos": ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"],
        "titles": {"en": "English Standup Comedy — Open Mic Night", "de": "Englische Stand-up-Comedy — Open Mic Night", "ru": "Стендап на английском — открытый микрофон", "uk": "Стендап англійською — відкритий мікрофон", "es": "Comedia stand-up en inglés — Noche de micrófono abierto"},
        "bodies": {"en": "Laugh the night away at Tel Aviv's English-language comedy open mic. Local expat comedians and visiting performers deliver sharp, uncensored humor. Sign up to perform or just enjoy the show. Two-drink minimum.", "de": "Lache die Nacht durch bei Tel Avivs englischsprachigem Comedy Open Mic. Lokale Expat-Comedians und Gastperformer liefern scharfen, unzensierten Humor. Melde dich zum Auftreten an oder genieße einfach die Show.", "ru": "Смейтесь всю ночь на англоязычном стендап-вечере с открытым микрофоном в Тель-Авиве. Местные комики-экспаты и гастролирующие артисты с острым, нецензурным юмором. Запишитесь выступить или просто наслаждайтесь шоу.", "uk": "Сміхайтесь всю ніч на англомовному стендап-вечорі з відкритим мікрофоном у Тель-Авіві. Місцеві коміки-експати та гастролюючі артисти з гострим, нецензурним гумором. Запишіться виступити або просто насолоджуйтесь шоу.", "es": "Ríete toda la noche en el open mic de comedia en inglés de Tel Aviv. Comediantes expatriados locales y artistas visitantes con humor agudo y sin censura. Inscríbete para actuar o simplemente disfruta del show."},
    },
    {
        "iso_local": "2026-06-08 08:00", "duration_minutes": 120, "category": "photography",
        "address": "Neve Tzedek, Tel Aviv", "venue_short": "Neve Tzedek",
        "lat": 32.060, "lng": 34.768, "is_free": True, "price": None, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/telaviv-photography", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80"],
        "titles": {"en": "Photography Walk — Neve Tzedek Morning Light", "de": "Fotowalk — Neve Tzedek Morgenlicht", "ru": "Фотопрогулка — утренний свет Неве-Цедек", "uk": "Фотопрогулянка — ранкове світло Неве-Цедек", "es": "Paseo fotográfico — Luz matutina en Neve Tzedek"},
        "bodies": {"en": "Capture Tel Aviv's most charming neighborhood in golden morning light. Pastel buildings, bougainvillea, narrow lanes, and Bauhaus details. Tips on composition, light, and street photography. All cameras and phones welcome.", "de": "Fotografiere Tel Avivs charmantestes Viertel im goldenen Morgenlicht. Pastellgebäude, Bougainvillea, enge Gassen und Bauhaus-Details. Tipps zu Komposition, Licht und Straßenfotografie. Alle Kameras willkommen.", "ru": "Снимайте самый очаровательный район Тель-Авива в золотом утреннем свете. Пастельные здания, бугенвиллея, узкие переулки и детали Баухауса. Советы по композиции, свету и уличной фотографии. Любые камеры приветствуются.", "uk": "Знімайте найчарівніший район Тель-Авіва в золотому ранковому світлі. Пастельні будівлі, бугенвілія, вузькі провулки та деталі Баухаусу. Поради щодо композиції, світла та вуличної фотографії. Будь-які камери вітаються.", "es": "Captura el barrio más encantador de Tel Aviv en la luz dorada de la mañana. Edificios pastel, buganvillas, callejones estrechos y detalles Bauhaus. Consejos de composición, luz y fotografía callejera. Todas las cámaras bienvenidas."},
    },
    {
        "iso_local": "2026-06-10 07:00", "duration_minutes": 90, "category": "other",
        "address": "Gordon Swimming Pool, Tel Aviv", "venue_short": "Gordon Pool",
        "lat": 32.083, "lng": 34.766, "is_free": False, "price": 60, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.gordon-pool.co.il", "source_label": "gordon-pool.co.il",
        "photos": ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"],
        "titles": {"en": "Morning Swim & Coffee — Gordon Pool", "de": "Morgenschwimmen & Kaffee — Gordon Pool", "ru": "Утреннее плавание и кофе — бассейн Гордон", "uk": "Ранкове плавання та кава — басейн Гордон", "es": "Natación matutina y café — Piscina Gordon"},
        "bodies": {"en": "Start your day with laps in the iconic Gordon Pool overlooking the Mediterranean, then coffee at the poolside café. Olympic-size saltwater pool, sunrise views, and a community of morning swimmers. The most Tel Aviv way to begin a day.", "de": "Starte deinen Tag mit Bahnen im ikonischen Gordon Pool mit Blick aufs Mittelmeer, dann Kaffee im Pool-Café. Olympisches Salzwasserbecken, Sonnenaufgangsblicke und eine Gemeinschaft von Morgenschwimmern.", "ru": "Начните день с заплывов в знаменитом бассейне Гордон с видом на Средиземное море, затем кофе в кафе у бассейна. Олимпийский бассейн с морской водой, виды рассвета и сообщество утренних пловцов.", "uk": "Почніть день із запливів у знаменитому басейні Гордон з видом на Середземне море, потім кава в кафе біля басейну. Олімпійський басейн з морською водою, види світанку та спільнота ранкових плавців.", "es": "Empieza tu día con largos en la icónica Piscina Gordon con vistas al Mediterráneo, luego café en el bar de la piscina. Piscina olímpica de agua salada, vistas del amanecer y comunidad de nadadores matutinos."},
    },
    {
        "iso_local": "2026-06-12 19:00", "duration_minutes": 120, "category": "wine-tasting",
        "address": "Jaja Wine Bar, Lilienblum 32, Tel Aviv", "venue_short": "Jaja Wine Bar",
        "lat": 32.062, "lng": 34.772, "is_free": False, "price": 180, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.jajawine.co.il", "source_label": "jajawine.co.il",
        "photos": ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80"],
        "titles": {"en": "Wine Tasting — Israeli Boutique Wines", "de": "Weinverkostung — Israelische Boutique-Weine", "ru": "Дегустация вин — израильские бутиковые вина", "uk": "Дегустація вин — ізраїльські бутикові вина", "es": "Cata de vinos — Vinos boutique israelíes"},
        "bodies": {"en": "Discover Israel's thriving wine scene with a guided tasting of 6 boutique wines from the Golan Heights, Judean Hills, and Negev. Learn about terroir, grape varieties, and food pairings. Cheese and charcuterie board included.", "de": "Entdecke Israels blühende Weinszene mit einer geführten Verkostung von 6 Boutique-Weinen aus den Golanhöhen, den Judäischen Hügeln und dem Negev. Erfahre mehr über Terroir, Rebsorten und Food-Pairings. Käse- und Wurstplatte inklusive.", "ru": "Откройте процветающую винную сцену Израиля с дегустацией 6 бутиковых вин из Голанских высот, Иудейских холмов и Негева. Узнайте о терруаре, сортах винограда и сочетаниях с едой. Сырная и мясная тарелка включена.", "uk": "Відкрийте винну сцену Ізраїлю, що процвітає, з дегустацією 6 бутикових вин з Голанських висот, Юдейських пагорбів та Негеву. Дізнайтесь про терруар, сорти винограду та поєднання з їжею. Сирна та м'ясна тарілка включена.", "es": "Descubre la floreciente escena vinícola de Israel con una cata guiada de 6 vinos boutique de los Altos del Golán, Colinas de Judea y Néguev. Aprende sobre terroir, variedades y maridajes. Tabla de quesos y embutidos incluida."},
    },
    {
        "iso_local": "2026-06-13 08:00", "duration_minutes": 120, "category": "cycling",
        "address": "Tel Aviv Port (Namal), Tel Aviv", "venue_short": "TLV Port",
        "lat": 32.097, "lng": 34.772, "is_free": False, "price": 100, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-cycling", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80"],
        "titles": {"en": "Cycling Tour — Tel Aviv Port to Jaffa", "de": "Radtour — Tel Aviv Hafen bis Jaffa", "ru": "Велотур — от порта Тель-Авива до Яффо", "uk": "Велотур — від порту Тель-Авіва до Яффо", "es": "Tour en bicicleta — Puerto de Tel Aviv a Jaffa"},
        "bodies": {"en": "Ride the full length of Tel Aviv's beachfront promenade from the Port to Old Jaffa (14 km round trip). Flat, scenic bike path along the Mediterranean. Stop for photos at the Hilton beach, Banana Beach, and Jaffa port. Bike rental included.", "de": "Fahre die gesamte Strandpromenade Tel Avivs vom Hafen bis nach Alt-Jaffa (14 km Rundfahrt). Flacher, malerischer Radweg am Mittelmeer. Fotostopps am Hilton Beach, Banana Beach und Jaffa-Hafen. Fahrradverleih inklusive.", "ru": "Проедьте всю набережную Тель-Авива от порта до Старого Яффо (14 км туда-обратно). Плоская живописная велодорожка вдоль Средиземного моря. Остановки для фото на пляже Хилтон, Банана Бич и в порту Яффо. Аренда велосипеда включена.", "uk": "Проїдьте всю набережну Тель-Авіва від порту до Старого Яффо (14 км туди-назад). Плоска мальовнича велодоріжка вздовж Середземного моря. Зупинки для фото на пляжі Хілтон, Банана Біч та в порту Яффо. Оренда велосипеда включена.", "es": "Recorre todo el paseo marítimo de Tel Aviv desde el Puerto hasta el Viejo Jaffa (14 km ida y vuelta). Carril bici plano y pintoresco junto al Mediterráneo. Paradas para fotos en Hilton Beach, Banana Beach y puerto de Jaffa. Alquiler de bici incluido."},
    },
    {
        "iso_local": "2026-06-15 11:00", "duration_minutes": 180, "category": "cooking",
        "address": "Vegan Kitchen TLV, Nahalat Binyamin 28, Tel Aviv", "venue_short": "Vegan Kitchen TLV",
        "lat": 32.064, "lng": 34.772, "is_free": False, "price": 200, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.vegankitchentlv.com", "source_label": "vegankitchentlv.com",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {"en": "Vegan Cooking Class — Israeli Plant-Based Cuisine", "de": "Veganer Kochkurs — Israelische pflanzliche Küche", "ru": "Веганский кулинарный класс — израильская растительная кухня", "uk": "Веганський кулінарний клас — ізраїльська рослинна кухня", "es": "Clase de cocina vegana — Cocina israelí a base de plantas"},
        "bodies": {"en": "Tel Aviv is the vegan capital of the world! Learn to make plant-based shakshuka, cashew labneh, mushroom shawarma, and tahini chocolate mousse. All ingredients provided, recipes to take home. Suitable for all diets.", "de": "Tel Aviv ist die vegane Hauptstadt der Welt! Lerne pflanzliche Shakshuka, Cashew-Labneh, Pilz-Shawarma und Tahini-Schokoladenmousse zu machen. Alle Zutaten gestellt, Rezepte zum Mitnehmen. Für alle Ernährungsweisen geeignet.", "ru": "Тель-Авив — веганская столица мира! Научитесь готовить растительную шакшуку, лабне из кешью, шаварму из грибов и шоколадный мусс с тахини. Все ингредиенты предоставляются, рецепты с собой.", "uk": "Тель-Авів — веганська столиця світу! Навчіться готувати рослинну шакшуку, лабне з кеш'ю, шаварму з грибів та шоколадний мус з тахіні. Всі інгредієнти надаються, рецепти з собою.", "es": "¡Tel Aviv es la capital vegana del mundo! Aprende a hacer shakshuka vegana, labneh de anacardos, shawarma de champiñones y mousse de chocolate con tahini. Ingredientes incluidos, recetas para llevar."},
    },
    {
        "iso_local": "2026-06-17 20:30", "duration_minutes": 120, "category": "other",
        "address": "Sarona Market, Kalman Magen St, Tel Aviv", "venue_short": "Sarona Market",
        "lat": 32.072, "lng": 34.786, "is_free": False, "price": 45, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.saronamarket.co.il", "source_label": "saronamarket.co.il",
        "photos": ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"],
        "titles": {"en": "Outdoor Cinema — Sarona Market", "de": "Open-Air-Kino — Sarona Market", "ru": "Кино под открытым небом — рынок Сарона", "uk": "Кіно під відкритим небом — ринок Сарона", "es": "Cine al aire libre — Mercado Sarona"},
        "bodies": {"en": "Watch a film under the stars in Sarona Market's courtyard. Bring a blanket or grab a beanbag. Popcorn, craft beer, and street food available. This week: a classic Israeli film with English subtitles. Gates open 8pm, film starts at sunset.", "de": "Schau einen Film unter den Sternen im Innenhof des Sarona Market. Bring eine Decke mit oder schnapp dir einen Sitzsack. Popcorn, Craft-Bier und Street Food verfügbar. Diese Woche: ein israelischer Klassiker mit englischen Untertiteln.", "ru": "Смотрите фильм под звёздами во дворе рынка Сарона. Принесите плед или возьмите бинбэг. Попкорн, крафтовое пиво и стрит-фуд. На этой неделе: классический израильский фильм с английскими субтитрами. Ворота в 20:00, фильм на закате.", "uk": "Дивіться фільм під зірками у дворі ринку Сарона. Принесіть плед або візьміть бінбег. Попкорн, крафтове пиво та стріт-фуд. Цього тижня: класичний ізраїльський фільм з англійськими субтитрами. Ворота о 20:00, фільм на заході.", "es": "Mira una película bajo las estrellas en el patio del Mercado Sarona. Trae una manta o agarra un puf. Palomitas, cerveza artesanal y street food disponibles. Esta semana: película israelí clásica con subtítulos en inglés."},
    },
    {
        "iso_local": "2026-06-20 22:00", "duration_minutes": 240, "category": "dancing",
        "address": "The Block, Shalma Rd 157, Tel Aviv", "venue_short": "The Block",
        "lat": 32.048, "lng": 34.770, "is_free": False, "price": 80, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.theblock.co.il", "source_label": "theblock.co.il",
        "photos": ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"],
        "titles": {"en": "Ecstatic Dance — Warehouse Party", "de": "Ecstatic Dance — Warehouse Party", "ru": "Экстатический танец — вечеринка на складе", "uk": "Екстатичний танець — вечірка на складі", "es": "Danza extática — Fiesta en almacén"},
        "bodies": {"en": "Move freely to a journey of electronic, world, and ambient music at The Block's industrial warehouse space. No alcohol, no talking on the dance floor — just pure movement and connection. DJ builds from slow to peak to cool-down.", "de": "Bewege dich frei zu einer Reise aus elektronischer, Welt- und Ambient-Musik im industriellen Lagerhaus The Block. Kein Alkohol, kein Reden auf der Tanzfläche — nur pure Bewegung und Verbindung.", "ru": "Двигайтесь свободно под путешествие из электронной, мировой и эмбиент-музыки в индустриальном пространстве The Block. Без алкоголя, без разговоров на танцполе — только чистое движение и связь.", "uk": "Рухайтесь вільно під подорож з електронної, світової та ембієнт-музики в індустріальному просторі The Block. Без алкоголю, без розмов на танцполі — тільки чистий рух та зв'язок.", "es": "Muévete libremente en un viaje de música electrónica, world y ambient en el espacio industrial de The Block. Sin alcohol, sin hablar en la pista — solo movimiento puro y conexión."},
    },
    {
        "iso_local": "2026-06-22 10:00", "duration_minutes": 180, "category": "other",
        "address": "Calligraphy Studio, Shabazi 40, Neve Tzedek", "venue_short": "Neve Tzedek Studio",
        "lat": 32.060, "lng": 34.768, "is_free": False, "price": 180, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-art", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {"en": "Hebrew Calligraphy Workshop", "de": "Hebräische Kalligraphie-Workshop", "ru": "Мастер-класс по еврейской каллиграфии", "uk": "Майстер-клас з єврейської каліграфії", "es": "Taller de caligrafía hebrea"},
        "bodies": {"en": "Learn the art of Hebrew calligraphy — from ancient biblical scripts to modern lettering. Practice with traditional reed pens and ink on quality paper. Create your own piece to take home. No Hebrew knowledge required — the beauty is in the shapes.", "de": "Lerne die Kunst der hebräischen Kalligraphie — von antiken biblischen Schriften bis zu modernem Lettering. Übe mit traditionellen Rohrfedern und Tinte auf Qualitätspapier. Erstelle dein eigenes Stück. Keine Hebräischkenntnisse nötig.", "ru": "Изучите искусство еврейской каллиграфии — от древних библейских шрифтов до современного леттеринга. Практика с традиционными тростниковыми перьями и тушью на качественной бумаге. Создайте своё произведение. Знание иврита не требуется.", "uk": "Вивчіть мистецтво єврейської каліграфії — від давніх біблійних шрифтів до сучасного летерінгу. Практика з традиційними очеретяними перами та тушшю на якісному папері. Створіть свій твір. Знання івриту не потрібне.", "es": "Aprende el arte de la caligrafía hebrea — desde escrituras bíblicas antiguas hasta lettering moderno. Practica con plumas de caña tradicionales y tinta en papel de calidad. Crea tu propia pieza. No se requiere conocimiento de hebreo."},
    },
    {
        "iso_local": "2026-06-24 20:00", "duration_minutes": 150, "category": "networking",
        "address": "Mike's Place, Herbert Samuel 90, Tel Aviv", "venue_short": "Mike's Place",
        "lat": 32.080, "lng": 34.766, "is_free": True, "price": None, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.mikesplacebars.com", "source_label": "mikesplacebars.com",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {"en": "Pub Quiz — English Trivia Night", "de": "Pub Quiz — Englischer Trivia-Abend", "ru": "Паб-квиз — вечер викторин на английском", "uk": "Паб-квіз — вечір вікторин англійською", "es": "Pub Quiz — Noche de trivia en inglés"},
        "bodies": {"en": "Test your knowledge at Tel Aviv's best English pub quiz! Teams of 2-6, categories from pop culture to science to Israeli trivia. Prizes for top 3 teams. Craft beer on tap, burgers, and a lively crowd of expats and locals.", "de": "Teste dein Wissen beim besten englischen Pub Quiz Tel Avivs! Teams von 2-6, Kategorien von Popkultur bis Wissenschaft bis israelische Trivia. Preise für die Top 3. Craft-Bier vom Fass, Burger und eine lebhafte Mischung aus Expats und Einheimischen.", "ru": "Проверьте свои знания на лучшем англоязычном паб-квизе Тель-Авива! Команды по 2-6 человек, категории от поп-культуры до науки и израильской тривии. Призы для топ-3 команд. Крафтовое пиво, бургеры и оживлённая публика.", "uk": "Перевірте свої знання на найкращому англомовному паб-квізі Тель-Авіва! Команди по 2-6 осіб, категорії від поп-культури до науки та ізраїльської тривії. Призи для топ-3 команд. Крафтове пиво, бургери та жвава публіка.", "es": "Pon a prueba tus conocimientos en el mejor pub quiz en inglés de Tel Aviv. Equipos de 2-6, categorías desde cultura pop hasta ciencia y trivia israelí. Premios para los 3 mejores equipos. Cerveza artesanal, hamburguesas y ambiente animado."},
    },
    {
        "iso_local": "2026-06-26 05:30", "duration_minutes": 60, "category": "yoga",
        "address": "Hilton Beach, Tel Aviv", "venue_short": "Hilton Beach",
        "lat": 32.088, "lng": 34.766, "is_free": True, "price": None, "currency": "ILS",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/telaviv-meditation", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80"],
        "titles": {"en": "Sunrise Meditation — Hilton Beach", "de": "Sonnenaufgangs-Meditation — Hilton Beach", "ru": "Медитация на рассвете — пляж Хилтон", "uk": "Медитація на світанку — пляж Хілтон", "es": "Meditación al amanecer — Playa Hilton"},
        "bodies": {"en": "Greet the sunrise with guided meditation on Hilton Beach. Breathwork, body scan, and mindfulness as the sun rises over the Mediterranean. Bring a towel to sit on. Free and open to all — beginners especially welcome.", "de": "Begrüße den Sonnenaufgang mit geführter Meditation am Hilton Beach. Atemarbeit, Body Scan und Achtsamkeit, während die Sonne über dem Mittelmeer aufgeht. Bring ein Handtuch zum Sitzen mit. Kostenlos und offen für alle.", "ru": "Встретьте рассвет с направленной медитацией на пляже Хилтон. Дыхательные практики, сканирование тела и осознанность, пока солнце встаёт над Средиземным морем. Принесите полотенце. Бесплатно и открыто для всех.", "uk": "Зустрічайте світанок з направленою медитацією на пляжі Хілтон. Дихальні практики, сканування тіла та усвідомленість, поки сонце встає над Середземним морем. Принесіть рушник. Безкоштовно та відкрито для всіх.", "es": "Saluda al amanecer con meditación guiada en Playa Hilton. Respiración, body scan y mindfulness mientras el sol sale sobre el Mediterráneo. Trae una toalla para sentarte. Gratis y abierto a todos — principiantes bienvenidos."},
    },
    {
        "iso_local": "2026-06-28 22:00", "duration_minutes": 240, "category": "music",
        "address": "Rooftop Bar, Florentin 10, Tel Aviv", "venue_short": "Florentin Rooftop",
        "lat": 32.058, "lng": 34.770, "is_free": False, "price": 60, "currency": "ILS",
        "languages": ["he", "en"],
        "source_url": "https://www.meetup.com/telaviv-nightlife", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80"],
        "titles": {"en": "DJ Set — Rooftop Party Florentin", "de": "DJ Set — Rooftop Party Florentin", "ru": "DJ-сет — руфтоп-вечеринка Флорентин", "uk": "DJ-сет — руфтоп-вечірка Флорентін", "es": "DJ Set — Fiesta en azotea Florentin"},
        "bodies": {"en": "Dance under the stars at a rooftop party in Florentin with resident DJs spinning house, disco, and Afrobeats. City skyline views, craft cocktails, and warm summer nights. The quintessential Tel Aviv Friday night experience.", "de": "Tanze unter den Sternen bei einer Rooftop-Party in Florentin mit Resident-DJs, die House, Disco und Afrobeats spielen. Skyline-Blick, Craft-Cocktails und warme Sommernächte. Das quintessentielle Tel Aviv Freitagabend-Erlebnis.", "ru": "Танцуйте под звёздами на руфтоп-вечеринке во Флорентине с резидент-диджеями, играющими хаус, диско и афробит. Виды на горизонт города, крафтовые коктейли и тёплые летние ночи. Квинтэссенция пятничного вечера в Тель-Авиве.", "uk": "Танцюйте під зірками на руфтоп-вечірці у Флорентіні з резидент-діджеями, що грають хаус, діско та афробіт. Види на горизонт міста, крафтові коктейлі та теплі літні ночі. Квінтесенція п'ятничного вечора в Тель-Авіві.", "es": "Baila bajo las estrellas en una fiesta en azotea en Florentin con DJs residentes poniendo house, disco y Afrobeats. Vistas del skyline, cócteles artesanales y noches cálidas de verano. La experiencia quintaesencial del viernes en Tel Aviv."},
    },
]

def local_to_utc(iso_local):
    from datetime import datetime, timedelta
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    return (dt - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")

def local_human(iso_local):
    date_part, time_part = iso_local.split(" ")
    y, mo, d = (int(x) for x in date_part.split("-"))
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return f"{d:02d} {months[mo-1]} {y}, {time_part}"

def main():
    ssl._create_default_https_context = ssl._create_unverified_context
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: Set env vars"); sys.exit(1)
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation"}

    check_url = f"{url}/rest/v1/events?is_system=eq.true&select=title&limit=1000"
    req = urllib.request.Request(check_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        existing = json.loads(resp.read())
    skip_titles = {row["title"] for row in existing}
    print(f"[i] {len(skip_titles)} existing system events")

    inserted = skipped = 0
    for ev in EVENTS:
        title_en = ev["titles"]["en"]
        if title_en in skip_titles:
            print(f"[=] skip: {title_en}"); skipped += 1; continue
        starts_at = local_to_utc(ev["iso_local"])
        when_human = local_human(ev["iso_local"])
        desc_doc = build_description(titles=ev["titles"], bodies=ev["bodies"], when_local_label=when_human, venue=ev["venue_short"], source_url=ev["source_url"], source_label=ev["source_label"])
        row = {
            "title": title_en, "description": ev["bodies"]["en"], "description_json": desc_doc,
            "title_translations": {k: v for k, v in ev["titles"].items() if k != "en"},
            "description_translations": {k: v for k, v in ev["bodies"].items() if k != "en"},
            "starts_at": starts_at, "duration_minutes": ev["duration_minutes"],
            "city": "Tel Aviv", "city_id": CITY_ID, "country": "IL",
            "address": ev["address"], "lat": ev["lat"], "lng": ev["lng"],
            "is_online": False, "is_free": ev["is_free"], "price": ev["price"], "currency": ev["currency"],
            "max_attendees": None, "photos": ev.get("photos", []),
            "organizer_id": SYSTEM_ORGANIZER_ID, "category_id": CAT.get(ev["category"]),
            "languages": ev["languages"], "is_private": False, "is_system": True,
            "status": "published", "source_url": ev["source_url"], "safety_tags": [], "allow_crews": True,
        }
        data = json.dumps(row, ensure_ascii=False).encode()
        req = urllib.request.Request(f"{url}/rest/v1/events", data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read())
                eid = result[0]["id"] if isinstance(result, list) and result else "?"
                print(f"[+] {title_en}  ->  {eid}"); inserted += 1
        except urllib.error.HTTPError as e:
            print(f"[!] ERROR: {title_en}: {e.code} {e.read().decode()}")
    print(f"\nDone: inserted={inserted}, skipped={skipped}, total={len(EVENTS)}")

if __name__ == "__main__":
    main()
