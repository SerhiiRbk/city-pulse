#!/usr/bin/env python3
"""
Seed 20 additional system events in Ubud, Bali for May-June 2026 (round 2).
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request
from typing import Any

CITY_ID = "f5e6394d-0803-42d7-9f37-0bba8932a41f"
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
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

LANG_ORDER = ["en", "de", "ru", "uk", "es"]
LANG_LABEL = {"en": "English", "de": "Deutsch", "ru": "Русский", "uk": "Українська", "es": "Español"}


def t_text(s, marks=None):
    node = {"type": "text", "text": s}
    if marks:
        node["marks"] = marks
    return node

def t_link(label, href):
    return t_text(label, [{"type": "link", "attrs": {"href": href}}])

def t_h2(s):
    return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(s)]}

def t_h3(s):
    return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(s)]}

def t_para(*nodes):
    return {"type": "paragraph", "content": list(nodes)}

def build_description(*, titles, bodies, when_local_label, venue, source_url, source_label):
    blocks = []
    for lang in LANG_ORDER:
        blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
        blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_local_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}


EVENTS = [
    # 1
    {
        "iso_local": "2026-05-23 07:30",
        "duration_minutes": 90,
        "category": "yoga",
        "address": "Radiantly Alive, Jl. Pengosekan, Ubud",
        "venue_short": "Radiantly Alive",
        "lat": -8.5120,
        "lng": 115.2580,
        "is_free": False,
        "price": 180000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.radiantlyalive.com",
        "source_label": "radiantlyalive.com",
        "photos": ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80"],
        "titles": {
            "en": "Power Yoga — Radiantly Alive Studio",
            "de": "Power Yoga — Radiantly Alive Studio",
            "ru": "Силовая йога — студия Radiantly Alive",
            "uk": "Силова йога — студія Radiantly Alive",
            "es": "Power Yoga — Estudio Radiantly Alive",
        },
        "bodies": {
            "en": "Dynamic power yoga class in one of Ubud's top studios. Open-air bamboo shala, experienced teachers, and a challenging flow to energize your morning. Suitable for intermediate and advanced practitioners.",
            "de": "Dynamischer Power-Yoga-Kurs in einem der besten Studios Ubuds. Open-Air-Bambus-Shala, erfahrene Lehrer und ein herausfordernder Flow für deinen Morgen. Für Fortgeschrittene geeignet.",
            "ru": "Динамичный класс силовой йоги в одной из лучших студий Убуда. Бамбуковая шала под открытым небом, опытные преподаватели и энергичный флоу для утра. Для среднего и продвинутого уровня.",
            "uk": "Динамічний клас силової йоги в одній з найкращих студій Убуда. Бамбукова шала під відкритим небом, досвідчені викладачі та енергійний флоу для ранку. Для середнього та просунутого рівня.",
            "es": "Clase dinámica de power yoga en uno de los mejores estudios de Ubud. Shala de bambú al aire libre, profesores experimentados y un flujo desafiante para energizar tu mañana. Nivel intermedio-avanzado.",
        },
    },
    # 2
    {
        "iso_local": "2026-05-25 09:00",
        "duration_minutes": 240,
        "category": "cycling",
        "address": "Jl. Raya Campuhan, Ubud",
        "venue_short": "Campuhan Ridge",
        "lat": -8.5030,
        "lng": 115.2500,
        "is_free": False,
        "price": 350000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.balibiketours.com",
        "source_label": "balibiketours.com",
        "photos": ["https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80"],
        "titles": {
            "en": "Downhill Cycling Tour — Rice Paddies & Villages",
            "de": "Downhill-Radtour — Reisfelder & Dörfer",
            "ru": "Велотур с горы — рисовые поля и деревни",
            "uk": "Велотур з гори — рисові поля та села",
            "es": "Tour en bicicleta cuesta abajo — Arrozales y pueblos",
        },
        "bodies": {
            "en": "Coast downhill through Bali's stunning countryside on a guided cycling tour. Pass rice terraces, traditional villages, temples, and coffee plantations. Mostly downhill — suitable for all fitness levels. Includes bike, helmet, and lunch.",
            "de": "Rolle bergab durch Balis atemberaubende Landschaft auf einer geführten Radtour. Vorbei an Reisterrassen, traditionellen Dörfern, Tempeln und Kaffeeplantagen. Meist bergab — für alle Fitnesslevel. Inklusive Rad, Helm und Mittagessen.",
            "ru": "Спускайтесь на велосипеде по потрясающей сельской местности Бали. Проезжайте рисовые террасы, традиционные деревни, храмы и кофейные плантации. В основном спуск — подходит для любого уровня. Включает велосипед, шлем и обед.",
            "uk": "Спускайтесь на велосипеді по приголомшливій сільській місцевості Балі. Проїжджайте рисові тераси, традиційні села, храми та кавові плантації. Переважно спуск — підходить для будь-якого рівня. Включає велосипед, шолом та обід.",
            "es": "Desciende en bicicleta por el impresionante campo de Bali en un tour guiado. Pasa por terrazas de arroz, pueblos tradicionales, templos y plantaciones de café. Mayormente cuesta abajo — para todos los niveles. Incluye bici, casco y almuerzo.",
        },
    },
    # 3
    {
        "iso_local": "2026-05-27 18:00",
        "duration_minutes": 120,
        "category": "music",
        "address": "Jazz Café Ubud, Jl. Sukma 2, Ubud",
        "venue_short": "Jazz Café",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 75000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.jazzcafebali.com",
        "source_label": "jazzcafebali.com",
        "photos": ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80"],
        "titles": {
            "en": "Live Jazz Night — Jazz Café Ubud",
            "de": "Live-Jazzabend — Jazz Café Ubud",
            "ru": "Живой джаз — Jazz Café Ubud",
            "uk": "Живий джаз — Jazz Café Ubud",
            "es": "Noche de jazz en vivo — Jazz Café Ubud",
        },
        "bodies": {
            "en": "Enjoy live jazz in Ubud's legendary Jazz Café. Local and international musicians play smooth jazz, bossa nova, and fusion in a tropical garden setting. Great food, cocktails, and a relaxed evening vibe.",
            "de": "Genieße Live-Jazz im legendären Jazz Café Ubud. Lokale und internationale Musiker spielen Smooth Jazz, Bossa Nova und Fusion in einem tropischen Garten. Tolles Essen, Cocktails und entspannte Abendstimmung.",
            "ru": "Наслаждайтесь живым джазом в легендарном Jazz Café Убуда. Местные и международные музыканты играют смуз-джаз, босса-нову и фьюжн в тропическом саду. Отличная еда, коктейли и расслабленная вечерняя атмосфера.",
            "uk": "Насолоджуйтесь живим джазом у легендарному Jazz Café Убуда. Місцеві та міжнародні музиканти грають смуз-джаз, боса-нову та ф'южн у тропічному саду. Чудова їжа, коктейлі та розслаблена вечірня атмосфера.",
            "es": "Disfruta de jazz en vivo en el legendario Jazz Café de Ubud. Músicos locales e internacionales tocan smooth jazz, bossa nova y fusión en un jardín tropical. Buena comida, cócteles y ambiente relajado.",
        },
    },
    # 4
    {
        "iso_local": "2026-05-29 06:00",
        "duration_minutes": 300,
        "category": "guided-tours",
        "address": "Mount Batur, Kintamani, Bali",
        "venue_short": "Mount Batur",
        "lat": -8.2420,
        "lng": 115.3750,
        "is_free": False,
        "price": 600000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.mountbaturtrekking.com",
        "source_label": "mountbaturtrekking.com",
        "photos": ["https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80"],
        "titles": {
            "en": "Mount Batur Sunrise Trek",
            "de": "Mount Batur Sonnenaufgangs-Trekking",
            "ru": "Восхождение на гору Батур на рассвете",
            "uk": "Сходження на гору Батур на світанку",
            "es": "Trekking al amanecer en el Monte Batur",
        },
        "bodies": {
            "en": "Trek to the summit of Mount Batur (1,717m) for a spectacular sunrise over the caldera and Lake Batur. Guided hike starts at 4am, moderate difficulty. Includes breakfast cooked by volcanic steam, transport from Ubud, and hot springs visit.",
            "de": "Wandere zum Gipfel des Mount Batur (1.717m) für einen spektakulären Sonnenaufgang über der Caldera und dem Batur-See. Geführte Wanderung ab 4 Uhr, mittlere Schwierigkeit. Inklusive Frühstück, Transport und Thermalquellen.",
            "ru": "Поднимитесь на вершину горы Батур (1717 м) ради зрелищного рассвета над кальдерой и озером Батур. Поход с гидом начинается в 4 утра, средняя сложность. Включает завтрак, трансфер из Убуда и горячие источники.",
            "uk": "Піднімайтесь на вершину гори Батур (1717 м) заради видовищного світанку над кальдерою та озером Батур. Похід з гідом починається о 4 ранку, середня складність. Включає сніданок, трансфер з Убуда та гарячі джерела.",
            "es": "Sube a la cima del Monte Batur (1.717m) para un espectacular amanecer sobre la caldera y el Lago Batur. Caminata guiada desde las 4am, dificultad moderada. Incluye desayuno, transporte desde Ubud y aguas termales.",
        },
    },
    # 5
    {
        "iso_local": "2026-05-31 10:00",
        "duration_minutes": 180,
        "category": "photography",
        "address": "Campuhan Ridge Walk, Ubud",
        "venue_short": "Campuhan Ridge",
        "lat": -8.5030,
        "lng": 115.2500,
        "is_free": True,
        "price": None,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/ubud-photography",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80"],
        "titles": {
            "en": "Photography Walk — Campuhan Ridge",
            "de": "Fotowalk — Campuhan Ridge",
            "ru": "Фотопрогулка — хребет Кампухан",
            "uk": "Фотопрогулянка — хребет Кампухан",
            "es": "Paseo fotográfico — Campuhan Ridge",
        },
        "bodies": {
            "en": "Capture Ubud's most iconic landscape on the Campuhan Ridge Walk. Tips on golden-hour light, composition with palm trees and valleys, and smartphone photography tricks. Meet at the trailhead, all cameras welcome.",
            "de": "Fotografiere Ubuds ikonischste Landschaft auf dem Campuhan Ridge Walk. Tipps zu Golden-Hour-Licht, Komposition mit Palmen und Tälern und Smartphone-Fotografie-Tricks. Treffpunkt am Wanderweg-Eingang.",
            "ru": "Снимайте самый знаковый пейзаж Убуда на хребте Кампухан. Советы по свету золотого часа, композиции с пальмами и долинами, трюки мобильной фотографии. Встреча у начала тропы, любые камеры приветствуются.",
            "uk": "Знімайте найзнаковіший пейзаж Убуда на хребті Кампухан. Поради щодо світла золотої години, композиції з пальмами та долинами, трюки мобільної фотографії. Зустріч на початку стежки, будь-які камери вітаються.",
            "es": "Captura el paisaje más icónico de Ubud en el Campuhan Ridge Walk. Consejos sobre luz de hora dorada, composición con palmeras y valles, y trucos de fotografía con smartphone. Todas las cámaras bienvenidas.",
        },
    },
    # 6
    {
        "iso_local": "2026-06-01 16:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "Tirta Empul Temple, Tampaksiring, Bali",
        "venue_short": "Tirta Empul",
        "lat": -8.4150,
        "lng": 115.3150,
        "is_free": False,
        "price": 50000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.bali.com/tirta-empul",
        "source_label": "bali.com",
        "photos": ["https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80"],
        "titles": {
            "en": "Water Purification Ceremony — Tirta Empul Temple",
            "de": "Wasserreinigungszeremonie — Tirta Empul Tempel",
            "ru": "Церемония очищения водой — храм Тирта Эмпул",
            "uk": "Церемонія очищення водою — храм Тірта Емпул",
            "es": "Ceremonia de purificación — Templo Tirta Empul",
        },
        "bodies": {
            "en": "Experience the sacred water purification ritual at Tirta Empul, a 1000-year-old Balinese Hindu temple. Walk through holy spring pools, learn about the spiritual significance, and participate in the melukat ceremony. Sarong provided.",
            "de": "Erlebe das heilige Wasserreinigungsritual in Tirta Empul, einem 1000 Jahre alten balinesisch-hinduistischen Tempel. Gehe durch heilige Quellbecken, erfahre mehr über die spirituelle Bedeutung und nimm an der Melukat-Zeremonie teil.",
            "ru": "Испытайте священный ритуал очищения водой в Тирта Эмпул — 1000-летнем балийском индуистском храме. Пройдите через священные бассейны, узнайте о духовном значении и примите участие в церемонии мелукат. Саронг предоставляется.",
            "uk": "Відчуйте священний ритуал очищення водою в Тірта Емпул — 1000-річному балійському індуїстському храмі. Пройдіть через священні басейни, дізнайтесь про духовне значення та візьміть участь у церемонії мелукат. Саронг надається.",
            "es": "Experimenta el ritual sagrado de purificación en Tirta Empul, un templo hindú balinés de 1000 años. Camina por las piscinas sagradas, aprende sobre su significado espiritual y participa en la ceremonia melukat. Sarong incluido.",
        },
    },
    # 7
    {
        "iso_local": "2026-06-03 08:00",
        "duration_minutes": 180,
        "category": "food-tours",
        "address": "Ubud Traditional Market, Jl. Raya Ubud, Ubud",
        "venue_short": "Ubud Market",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 300000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.ubudfoodtours.com",
        "source_label": "ubudfoodtours.com",
        "photos": ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"],
        "titles": {
            "en": "Ubud Food Tour — Market to Table",
            "de": "Ubud Food Tour — Vom Markt auf den Tisch",
            "ru": "Фуд-тур по Убуду — от рынка до стола",
            "uk": "Фуд-тур по Убуду — від ринку до столу",
            "es": "Tour gastronómico de Ubud — Del mercado a la mesa",
        },
        "bodies": {
            "en": "Explore Ubud's morning market with a local food guide. Taste exotic tropical fruits, traditional jamu drinks, babi guling, and street snacks. Learn about Balinese ingredients and end with a warung lunch. 8+ tastings included.",
            "de": "Erkunde Ubuds Morgenmarkt mit einem lokalen Food-Guide. Probiere exotische tropische Früchte, traditionelle Jamu-Getränke, Babi Guling und Straßensnacks. Erfahre mehr über balinesische Zutaten. 8+ Verkostungen inklusive.",
            "ru": "Исследуйте утренний рынок Убуда с местным фуд-гидом. Попробуйте экзотические тропические фрукты, традиционные напитки джаму, баби гулинг и уличные закуски. Узнайте о балийских ингредиентах. 8+ дегустаций включено.",
            "uk": "Дослідіть ранковий ринок Убуда з місцевим фуд-гідом. Спробуйте екзотичні тропічні фрукти, традиційні напої джаму, бабі гулінг та вуличні закуски. Дізнайтесь про балійські інгредієнти. 8+ дегустацій включено.",
            "es": "Explora el mercado matutino de Ubud con un guía gastronómico local. Prueba frutas tropicales exóticas, bebidas jamu tradicionales, babi guling y snacks callejeros. 8+ degustaciones incluidas.",
        },
    },
    # 8
    {
        "iso_local": "2026-06-05 17:30",
        "duration_minutes": 90,
        "category": "yoga",
        "address": "Intuitive Flow, Jl. Pengosekan, Ubud",
        "venue_short": "Intuitive Flow",
        "lat": -8.5120,
        "lng": 115.2580,
        "is_free": False,
        "price": 160000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.intuitiveflow.com",
        "source_label": "intuitiveflow.com",
        "photos": ["https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=80"],
        "titles": {
            "en": "Yin Yoga & Meditation — Sunset Session",
            "de": "Yin Yoga & Meditation — Sonnenuntergangs-Session",
            "ru": "Инь-йога и медитация — вечерняя сессия на закате",
            "uk": "Інь-йога та медитація — вечірня сесія на заході",
            "es": "Yin Yoga y meditación — Sesión al atardecer",
        },
        "bodies": {
            "en": "Wind down with a gentle yin yoga and meditation class as the sun sets over the rice fields. Deep stretches held for 3-5 minutes, breathwork, and guided relaxation. Perfect for releasing tension after a day of exploring Ubud.",
            "de": "Entspanne mit einer sanften Yin-Yoga- und Meditationsklasse, während die Sonne über den Reisfeldern untergeht. Tiefe Dehnungen für 3-5 Minuten, Atemarbeit und geführte Entspannung. Perfekt nach einem Tag in Ubud.",
            "ru": "Расслабьтесь с мягким классом инь-йоги и медитации на закате над рисовыми полями. Глубокие растяжки по 3-5 минут, дыхательные практики и направленная релаксация. Идеально после дня исследования Убуда.",
            "uk": "Розслабтесь з м'яким класом інь-йоги та медитації на заході над рисовими полями. Глибокі розтяжки по 3-5 хвилин, дихальні практики та направлена релаксація. Ідеально після дня дослідження Убуда.",
            "es": "Relájate con una clase suave de yin yoga y meditación mientras el sol se pone sobre los arrozales. Estiramientos profundos de 3-5 minutos, respiración y relajación guiada. Perfecto después de un día explorando Ubud.",
        },
    },
    # 9
    {
        "iso_local": "2026-06-07 09:00",
        "duration_minutes": 240,
        "category": "other",
        "address": "Bali Swing, Jl. Dewi Saraswati 7, Bongkasa Pertiwi",
        "venue_short": "Bali Swing",
        "lat": -8.4800,
        "lng": 115.2400,
        "is_free": False,
        "price": 400000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.baliswing.com",
        "source_label": "baliswing.com",
        "photos": ["https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=800&q=80"],
        "titles": {
            "en": "Bali Swing & Jungle Adventure",
            "de": "Bali Swing & Dschungel-Abenteuer",
            "ru": "Качели Бали и джунглевое приключение",
            "uk": "Гойдалки Балі та джунглева пригода",
            "es": "Columpio de Bali y aventura en la jungla",
        },
        "bodies": {
            "en": "Swing over the jungle canopy on Bali's famous giant swings. Multiple swing heights (10-78m), bird nest photo spots, and stunning valley views. Includes all swings, photo spots, welcome drink, and shuttle from Ubud center.",
            "de": "Schwinge über das Dschungeldach auf Balis berühmten Riesenschaukeln. Verschiedene Schaukelhöhen (10-78m), Vogelnest-Fotospots und atemberaubende Talblicke. Inklusive aller Schaukeln, Fotospots und Shuttle aus Ubud.",
            "ru": "Качайтесь над джунглями на знаменитых гигантских качелях Бали. Разные высоты (10-78 м), фотоспоты «птичье гнездо» и потрясающие виды на долину. Включает все качели, фотоспоты, напиток и трансфер из Убуда.",
            "uk": "Гойдайтесь над джунглями на знаменитих гігантських гойдалках Балі. Різні висоти (10-78 м), фотоспоти «пташине гніздо» та приголомшливі види на долину. Включає всі гойдалки, фотоспоти, напій та трансфер з Убуда.",
            "es": "Colúmpiate sobre la selva en los famosos columpios gigantes de Bali. Múltiples alturas (10-78m), spots de fotos nido de pájaro y vistas impresionantes del valle. Incluye todos los columpios, fotos y shuttle desde Ubud.",
        },
    },
    # 10
    {
        "iso_local": "2026-06-09 19:00",
        "duration_minutes": 90,
        "category": "dancing",
        "address": "Arma Museum, Jl. Raya Pengosekan, Ubud",
        "venue_short": "ARMA Museum",
        "lat": -8.5120,
        "lng": 115.2580,
        "is_free": False,
        "price": 100000,
        "currency": "IDR",
        "languages": ["id", "en"],
        "source_url": "https://www.armabali.com",
        "source_label": "armabali.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Kecak Fire Dance — ARMA Museum",
            "de": "Kecak-Feuertanz — ARMA Museum",
            "ru": "Танец огня Кечак — музей ARMA",
            "uk": "Танець вогню Кечак — музей ARMA",
            "es": "Danza del fuego Kecak — Museo ARMA",
        },
        "bodies": {
            "en": "Watch the mesmerizing Kecak fire dance at ARMA Museum's open-air stage. Dozens of men chanting 'cak-cak-cak' tell the Ramayana story while a fire dancer performs in the center. A powerful Balinese cultural experience under the stars.",
            "de": "Erlebe den faszinierenden Kecak-Feuertanz auf der Open-Air-Bühne des ARMA Museums. Dutzende Männer chanten 'cak-cak-cak' und erzählen die Ramayana-Geschichte, während ein Feuertänzer in der Mitte performt.",
            "ru": "Посмотрите завораживающий танец огня Кечак на открытой сцене музея ARMA. Десятки мужчин скандируют «чак-чак-чак», рассказывая историю Рамаяны, пока танцор огня выступает в центре. Мощный культурный опыт.",
            "uk": "Подивіться зачаровуючий танець вогню Кечак на відкритій сцені музею ARMA. Десятки чоловіків скандують «чак-чак-чак», розповідаючи історію Рамаяни, поки танцюрист вогню виступає в центрі. Потужний культурний досвід.",
            "es": "Contempla la hipnótica danza del fuego Kecak en el escenario al aire libre del Museo ARMA. Decenas de hombres cantan 'cak-cak-cak' narrando el Ramayana mientras un bailarín de fuego actúa en el centro.",
        },
    },
    # 11
    {
        "iso_local": "2026-06-11 07:00",
        "duration_minutes": 120,
        "category": "running",
        "address": "Campuhan Ridge Walk, Ubud",
        "venue_short": "Campuhan Ridge",
        "lat": -8.5030,
        "lng": 115.2500,
        "is_free": True,
        "price": None,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/ubud-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Trail Run — Campuhan Ridge",
            "de": "Morgen-Trailrun — Campuhan Ridge",
            "ru": "Утренний трейл-ран — хребет Кампухан",
            "uk": "Ранковий трейл-ран — хребет Кампухан",
            "es": "Carrera matutina por sendero — Campuhan Ridge",
        },
        "bodies": {
            "en": "Join a group trail run along the scenic Campuhan Ridge at sunrise. 5-8 km on grassy paths between two river valleys with panoramic views. All paces welcome — we regroup at viewpoints. Fresh juice together after!",
            "de": "Schließe dich einem Gruppen-Trailrun entlang des malerischen Campuhan Ridge bei Sonnenaufgang an. 5-8 km auf Graspfaden zwischen zwei Flusstälern mit Panoramablick. Alle Tempos willkommen, frischer Saft danach!",
            "ru": "Присоединяйтесь к групповому трейл-рану по живописному хребту Кампухан на рассвете. 5-8 км по травяным тропам между двумя речными долинами с панорамными видами. Любой темп приветствуется, свежий сок потом!",
            "uk": "Приєднуйтесь до групового трейл-рану по мальовничому хребту Кампухан на світанку. 5-8 км по трав'яних стежках між двома річковими долинами з панорамними видами. Будь-який темп вітається, свіжий сік потім!",
            "es": "Únete a una carrera grupal por el sendero del pintoresco Campuhan Ridge al amanecer. 5-8 km por caminos de hierba entre dos valles con vistas panorámicas. ¡Todos los ritmos bienvenidos, jugo fresco después!",
        },
    },
    # 12
    {
        "iso_local": "2026-06-13 10:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Bali Silent Retreat, Desa Karanganyar, Tabanan",
        "venue_short": "Bali Silent Retreat",
        "lat": -8.4500,
        "lng": 115.2200,
        "is_free": False,
        "price": 500000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.balisilentretreat.com",
        "source_label": "balisilentretreat.com",
        "photos": ["https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80"],
        "titles": {
            "en": "Half-Day Silent Retreat — Digital Detox",
            "de": "Halbtages-Stille-Retreat — Digital Detox",
            "ru": "Полудневный ретрит тишины — цифровой детокс",
            "uk": "Піводенний ретрит тиші — цифровий детокс",
            "es": "Retiro de silencio de medio día — Desintoxicación digital",
        },
        "bodies": {
            "en": "Disconnect from screens and noise in a half-day silent retreat surrounded by rice paddies. Guided walking meditation, journaling, plant-based lunch, and time in nature. No phones, no talking — just presence. Perfect for digital nomads needing a reset.",
            "de": "Trenne dich von Bildschirmen und Lärm in einem halbtägigen Stille-Retreat umgeben von Reisfeldern. Geführte Gehmeditation, Journaling, pflanzliches Mittagessen und Zeit in der Natur. Keine Handys, kein Reden — nur Präsenz.",
            "ru": "Отключитесь от экранов и шума на полудневном ретрите тишины среди рисовых полей. Медитация при ходьбе, журналинг, растительный обед и время на природе. Без телефонов, без разговоров — только присутствие.",
            "uk": "Відключіться від екранів та шуму на піводенному ретриті тиші серед рисових полів. Медитація при ходьбі, журналінг, рослинний обід та час на природі. Без телефонів, без розмов — тільки присутність.",
            "es": "Desconéctate de pantallas y ruido en un retiro de silencio de medio día rodeado de arrozales. Meditación caminando, journaling, almuerzo vegetal y tiempo en la naturaleza. Sin teléfonos, sin hablar — solo presencia.",
        },
    },
    # 13
    {
        "iso_local": "2026-06-15 14:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Threads of Life, Jl. Kajeng 24, Ubud",
        "venue_short": "Threads of Life",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 350000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.threadsoflife.com",
        "source_label": "threadsoflife.com",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {
            "en": "Batik Workshop — Traditional Textile Art",
            "de": "Batik-Workshop — Traditionelle Textilkunst",
            "ru": "Мастер-класс по батику — традиционное текстильное искусство",
            "uk": "Майстер-клас з батику — традиційне текстильне мистецтво",
            "es": "Taller de batik — Arte textil tradicional",
        },
        "bodies": {
            "en": "Learn the ancient art of batik at Threads of Life gallery. Apply hot wax patterns to fabric, dye with natural plant colors, and create your own unique piece. Understand the cultural symbolism behind traditional Javanese and Balinese motifs.",
            "de": "Lerne die alte Kunst des Batik in der Threads of Life Galerie. Trage heiße Wachsmuster auf Stoff auf, färbe mit natürlichen Pflanzenfarben und kreiere dein eigenes Stück. Verstehe die kulturelle Symbolik hinter traditionellen Motiven.",
            "ru": "Изучите древнее искусство батика в галерее Threads of Life. Наносите горячий воск на ткань, окрашивайте натуральными растительными красителями и создайте своё уникальное изделие. Узнайте о культурной символике мотивов.",
            "uk": "Вивчіть давнє мистецтво батику в галереї Threads of Life. Наносіть гарячий віск на тканину, фарбуйте натуральними рослинними барвниками та створіть свій унікальний виріб. Дізнайтесь про культурну символіку мотивів.",
            "es": "Aprende el antiguo arte del batik en la galería Threads of Life. Aplica patrones de cera caliente en tela, tiñe con colores vegetales naturales y crea tu pieza única. Comprende el simbolismo cultural de los motivos tradicionales.",
        },
    },
    # 14
    {
        "iso_local": "2026-06-16 18:00",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Outpost Coworking, Jl. Raya Nyuh Kuning, Ubud",
        "venue_short": "Outpost Coworking",
        "lat": -8.5150,
        "lng": 115.2600,
        "is_free": True,
        "price": None,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.outpost-asia.com",
        "source_label": "outpost-asia.com",
        "photos": ["https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80"],
        "titles": {
            "en": "Nomad Networking — Outpost Coworking",
            "de": "Nomaden-Networking — Outpost Coworking",
            "ru": "Нетворкинг кочевников — Outpost Coworking",
            "uk": "Нетворкінг кочівників — Outpost Coworking",
            "es": "Networking nómada — Outpost Coworking",
        },
        "bodies": {
            "en": "Weekly networking event for digital nomads at Outpost's jungle coworking space. Lightning intros, skill-sharing, and collaboration opportunities over sunset drinks. Freelancers, founders, and remote workers all welcome.",
            "de": "Wöchentliches Networking-Event für digitale Nomaden im Dschungel-Coworking von Outpost. Blitz-Vorstellungen, Skill-Sharing und Kooperationsmöglichkeiten bei Sonnenuntergangs-Drinks. Freelancer, Gründer und Remote-Worker willkommen.",
            "ru": "Еженедельный нетворкинг для цифровых кочевников в джунглевом коворкинге Outpost. Блиц-знакомства, обмен навыками и возможности сотрудничества за напитками на закате. Фрилансеры, основатели и удалёнщики приветствуются.",
            "uk": "Щотижневий нетворкінг для цифрових кочівників у джунглевому коворкінгу Outpost. Бліц-знайомства, обмін навичками та можливості співпраці за напоями на заході. Фрілансери, засновники та віддалені працівники вітаються.",
            "es": "Evento semanal de networking para nómadas digitales en el coworking selvático de Outpost. Presentaciones rápidas, intercambio de habilidades y oportunidades de colaboración con drinks al atardecer. Freelancers, fundadores y remotos bienvenidos.",
        },
    },
    # 15
    {
        "iso_local": "2026-06-19 08:00",
        "duration_minutes": 300,
        "category": "guided-tours",
        "address": "Jatiluwih Rice Terraces, Tabanan, Bali",
        "venue_short": "Jatiluwih",
        "lat": -8.3700,
        "lng": 115.1300,
        "is_free": False,
        "price": 250000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.jatiluwih-bali.com",
        "source_label": "jatiluwih-bali.com",
        "photos": ["https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80"],
        "titles": {
            "en": "Jatiluwih Rice Terraces — UNESCO Heritage Walk",
            "de": "Jatiluwih Reisterrassen — UNESCO-Welterbe-Wanderung",
            "ru": "Рисовые террасы Джатилувих — прогулка по наследию ЮНЕСКО",
            "uk": "Рисові тераси Джатілувіх — прогулянка спадщиною ЮНЕСКО",
            "es": "Terrazas de arroz Jatiluwih — Caminata Patrimonio UNESCO",
        },
        "bodies": {
            "en": "Explore the UNESCO-listed Jatiluwih rice terraces — Bali's largest and most spectacular. Guided trek through emerald paddies, learn about the subak system, visit a local farmer's home, and enjoy a traditional lunch with volcano views.",
            "de": "Erkunde die UNESCO-gelisteten Jatiluwih-Reisterrassen — Balis größte und spektakulärste. Geführte Wanderung durch smaragdgrüne Felder, erfahre mehr über das Subak-System, besuche ein Bauernhaus und genieße ein traditionelles Mittagessen.",
            "ru": "Исследуйте рисовые террасы Джатилувих из списка ЮНЕСКО — крупнейшие и самые зрелищные на Бали. Поход с гидом по изумрудным полям, знакомство с системой субак, визит к местному фермеру и традиционный обед с видом на вулкан.",
            "uk": "Дослідіть рисові тераси Джатілувіх зі списку ЮНЕСКО — найбільші та найвидовищніші на Балі. Похід з гідом по смарагдових полях, знайомство з системою субак, візит до місцевого фермера та традиційний обід з видом на вулкан.",
            "es": "Explora las terrazas de arroz Jatiluwih, Patrimonio UNESCO — las más grandes y espectaculares de Bali. Trek guiado por arrozales esmeralda, aprende sobre el sistema subak, visita a un agricultor local y almuerzo tradicional con vistas al volcán.",
        },
    },
    # 16
    {
        "iso_local": "2026-06-21 15:00",
        "duration_minutes": 120,
        "category": "cooking",
        "address": "Bali Pulina Agro Tourism, Tegallalang, Ubud",
        "venue_short": "Bali Pulina",
        "lat": -8.4310,
        "lng": 115.2790,
        "is_free": False,
        "price": 200000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.balipulina.com",
        "source_label": "balipulina.com",
        "photos": ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80"],
        "titles": {
            "en": "Luwak Coffee Tasting & Spice Garden Tour",
            "de": "Luwak-Kaffee-Verkostung & Gewürzgarten-Tour",
            "ru": "Дегустация кофе лювак и тур по саду специй",
            "uk": "Дегустація кави лювак та тур по саду спецій",
            "es": "Degustación de café Luwak y tour por el jardín de especias",
        },
        "bodies": {
            "en": "Visit a traditional coffee plantation and taste Bali's famous luwak coffee. Tour the spice garden (vanilla, cinnamon, cacao, cloves), learn about processing, and sample 10+ teas and coffees with rice terrace views.",
            "de": "Besuche eine traditionelle Kaffeeplantage und probiere Balis berühmten Luwak-Kaffee. Tour durch den Gewürzgarten (Vanille, Zimt, Kakao, Nelken), erfahre mehr über die Verarbeitung und probiere 10+ Tees und Kaffees mit Reisterrassen-Blick.",
            "ru": "Посетите традиционную кофейную плантацию и попробуйте знаменитый балийский кофе лювак. Тур по саду специй (ваниль, корица, какао, гвоздика), знакомство с обработкой и дегустация 10+ чаёв и кофе с видом на рисовые террасы.",
            "uk": "Відвідайте традиційну кавову плантацію та спробуйте знаменитий балійський каву лювак. Тур по саду спецій (ваніль, кориця, какао, гвоздика), знайомство з обробкою та дегустація 10+ чаїв та кав з видом на рисові тераси.",
            "es": "Visita una plantación de café tradicional y prueba el famoso café luwak de Bali. Tour por el jardín de especias (vainilla, canela, cacao, clavo), aprende sobre el procesamiento y degusta 10+ tés y cafés con vistas a terrazas de arroz.",
        },
    },
    # 17
    {
        "iso_local": "2026-06-23 09:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Ubud Bodyworks Centre, Jl. Hanoman 25, Ubud",
        "venue_short": "Ubud Bodyworks",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 450000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.ubudbodyworkscentre.com",
        "source_label": "ubudbodyworkscentre.com",
        "photos": ["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80"],
        "titles": {
            "en": "Balinese Massage Workshop — Learn Traditional Techniques",
            "de": "Balinesische Massage-Workshop — Traditionelle Techniken lernen",
            "ru": "Мастер-класс балийского массажа — традиционные техники",
            "uk": "Майстер-клас балійського масажу — традиційні техніки",
            "es": "Taller de masaje balinés — Aprende técnicas tradicionales",
        },
        "bodies": {
            "en": "Learn the fundamentals of traditional Balinese massage in a hands-on workshop. Techniques include long strokes, acupressure, and aromatherapy with local oils. Practice on a partner and take home skills you can use anywhere.",
            "de": "Lerne die Grundlagen der traditionellen balinesischen Massage in einem praktischen Workshop. Techniken umfassen lange Striche, Akupressur und Aromatherapie mit lokalen Ölen. Übe an einem Partner und nimm Fähigkeiten mit nach Hause.",
            "ru": "Изучите основы традиционного балийского массажа на практическом мастер-классе. Техники включают длинные поглаживания, акупрессуру и ароматерапию с местными маслами. Практика на партнёре и навыки, которые можно использовать везде.",
            "uk": "Вивчіть основи традиційного балійського масажу на практичному майстер-класі. Техніки включають довгі погладжування, акупресуру та ароматерапію з місцевими оліями. Практика на партнері та навички, які можна використовувати будь-де.",
            "es": "Aprende los fundamentos del masaje balinés tradicional en un taller práctico. Técnicas incluyen movimientos largos, acupresión y aromaterapia con aceites locales. Practica con un compañero y llévate habilidades que puedes usar en cualquier lugar.",
        },
    },
    # 18
    {
        "iso_local": "2026-06-25 06:00",
        "duration_minutes": 180,
        "category": "guided-tours",
        "address": "Gunung Kawi Temple, Tampaksiring, Bali",
        "venue_short": "Gunung Kawi",
        "lat": -8.4220,
        "lng": 115.3120,
        "is_free": False,
        "price": 50000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.bali.com/gunung-kawi",
        "source_label": "bali.com",
        "photos": ["https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80"],
        "titles": {
            "en": "Gunung Kawi Temple — Ancient Rock Carvings",
            "de": "Gunung Kawi Tempel — Antike Felsgravuren",
            "ru": "Храм Гунунг Кави — древние наскальные рельефы",
            "uk": "Храм Гунунг Каві — давні наскельні рельєфи",
            "es": "Templo Gunung Kawi — Tallas rupestres antiguas",
        },
        "bodies": {
            "en": "Visit the 11th-century Gunung Kawi temple complex early morning before crowds. Descend 300 steps through jungle to see 10 rock-cut shrines (candi) carved into cliff faces. Learn about Balinese Hindu history and the ancient Udayana dynasty.",
            "de": "Besuche den Gunung Kawi Tempelkomplex aus dem 11. Jahrhundert am frühen Morgen. Steige 300 Stufen durch den Dschungel hinab zu 10 in Felsen gehauenen Schreinen (Candi). Erfahre mehr über balinesisch-hinduistische Geschichte.",
            "ru": "Посетите храмовый комплекс Гунунг Кави XI века ранним утром до толп. Спуститесь по 300 ступеням через джунгли к 10 высеченным в скалах святилищам (чанди). Узнайте об истории балийского индуизма и древней династии Удаяна.",
            "uk": "Відвідайте храмовий комплекс Гунунг Каві XI століття рано вранці до натовпів. Спустіться по 300 сходинках через джунглі до 10 висічених у скелях святилищ (чанді). Дізнайтесь про історію балійського індуїзму та давню династію Удаяна.",
            "es": "Visita el complejo del templo Gunung Kawi del siglo XI temprano por la mañana. Desciende 300 escalones por la jungla para ver 10 santuarios tallados en roca (candi). Aprende sobre la historia hindú balinesa y la antigua dinastía Udayana.",
        },
    },
    # 19
    {
        "iso_local": "2026-06-27 17:00",
        "duration_minutes": 150,
        "category": "startups",
        "address": "Hubud Coworking, Jl. Monkey Forest 88x, Ubud",
        "venue_short": "Hubud",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": True,
        "price": None,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.hubud.org",
        "source_label": "hubud.org",
        "photos": ["https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80"],
        "titles": {
            "en": "Startup Pitch Night — Hubud Coworking",
            "de": "Startup Pitch Night — Hubud Coworking",
            "ru": "Стартап-питч — Hubud Coworking",
            "uk": "Стартап-пітч — Hubud Coworking",
            "es": "Noche de pitch de startups — Hubud Coworking",
        },
        "bodies": {
            "en": "Watch 5 founders pitch their startups to a panel of mentors and fellow nomads at Hubud's bamboo coworking space. Q&A, feedback, and networking over drinks. Open to entrepreneurs, investors, and curious minds building from Bali.",
            "de": "Sieh 5 Gründer ihre Startups vor einem Panel aus Mentoren und Nomaden im Hubud Bambus-Coworking pitchen. Q&A, Feedback und Networking bei Drinks. Offen für Unternehmer, Investoren und Neugierige, die von Bali aus bauen.",
            "ru": "Смотрите, как 5 основателей питчат свои стартапы перед панелью менторов и кочевников в бамбуковом коворкинге Hubud. Вопросы, обратная связь и нетворкинг за напитками. Открыто для предпринимателей и инвесторов.",
            "uk": "Дивіться, як 5 засновників пітчать свої стартапи перед панеллю менторів та кочівників у бамбуковому коворкінгу Hubud. Питання, зворотний зв'язок та нетворкінг за напоями. Відкрито для підприємців та інвесторів.",
            "es": "Mira a 5 fundadores presentar sus startups ante un panel de mentores y nómadas en el coworking de bambú Hubud. Q&A, feedback y networking con drinks. Abierto a emprendedores, inversores y mentes curiosas construyendo desde Bali.",
        },
    },
    # 20
    {
        "iso_local": "2026-06-29 07:00",
        "duration_minutes": 120,
        "category": "yoga",
        "address": "Taksu Yoga, Jl. Goutama Selatan, Ubud",
        "venue_short": "Taksu Yoga",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 150000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.taksuspa.com",
        "source_label": "taksuspa.com",
        "photos": ["https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=80"],
        "titles": {
            "en": "Ashtanga Yoga — Mysore Style at Taksu",
            "de": "Ashtanga Yoga — Mysore-Stil bei Taksu",
            "ru": "Аштанга-йога — стиль Майсор в Taksu",
            "uk": "Аштанга-йога — стиль Майсор у Taksu",
            "es": "Ashtanga Yoga — Estilo Mysore en Taksu",
        },
        "bodies": {
            "en": "Practice Ashtanga yoga Mysore-style at Taksu's intimate garden shala. Self-paced practice with individual adjustments from an experienced teacher. Open to all levels — beginners receive extra guidance. Followed by herbal tea in the garden.",
            "de": "Praktiziere Ashtanga Yoga im Mysore-Stil in Taksus intimem Garten-Shala. Selbstbestimmte Praxis mit individuellen Korrekturen von einem erfahrenen Lehrer. Alle Level willkommen — Anfänger erhalten extra Anleitung. Danach Kräutertee im Garten.",
            "ru": "Практикуйте аштанга-йогу в стиле Майсор в камерной садовой шале Taksu. Самостоятельная практика с индивидуальными корректировками от опытного преподавателя. Все уровни — начинающие получают дополнительное руководство. Затем травяной чай в саду.",
            "uk": "Практикуйте аштанга-йогу в стилі Майсор у камерній садовій шалі Taksu. Самостійна практика з індивідуальними корекціями від досвідченого викладача. Всі рівні — початківці отримують додаткове керівництво. Потім трав'яний чай у саду.",
            "es": "Practica Ashtanga yoga estilo Mysore en la íntima shala jardín de Taksu. Práctica a tu ritmo con ajustes individuales de un profesor experimentado. Todos los niveles — principiantes reciben guía extra. Seguido de té herbal en el jardín.",
        },
    },
]


def local_to_utc(iso_local):
    from datetime import datetime, timedelta
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    utc_dt = dt - timedelta(hours=8)  # WITA = UTC+8
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

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
        print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

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
            print(f"[=] skip: {title_en}")
            skipped += 1
            continue

        starts_at = local_to_utc(ev["iso_local"])
        when_human = local_human(ev["iso_local"])
        desc_doc = build_description(
            titles=ev["titles"], bodies=ev["bodies"],
            when_local_label=when_human, venue=ev["venue_short"],
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
            "city": "Ubud",
            "city_id": CITY_ID,
            "country": "ID",
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
