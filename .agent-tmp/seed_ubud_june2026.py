#!/usr/bin/env python3
"""
Seed 10 system events in Ubud, Bali for June 2026.

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
  exec(open('.agent-tmp/seed_ubud_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
CITY_ID = "f5e6394d-0803-42d7-9f37-0bba8932a41f"
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
    # 1. Yoga Retreat — Morning Vinyasa
    {
        "iso_local": "2026-06-08 07:00",
        "duration_minutes": 90,
        "category": "yoga",
        "address": "Yoga Barn, Jl. Hanoman, Ubud",
        "venue_short": "Yoga Barn",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 150000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.theyogabarn.com",
        "source_label": "theyogabarn.com",
        "photos": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"],
        "titles": {
            "en": "Yoga Retreat — Morning Vinyasa at Yoga Barn",
            "de": "Yoga-Retreat — Morgen-Vinyasa im Yoga Barn",
            "ru": "Йога-ретрит — утренняя виньяса в Yoga Barn",
            "uk": "Йога-ретрит — ранкова віньяса в Yoga Barn",
            "es": "Retiro de yoga — Vinyasa matutino en Yoga Barn",
        },
        "bodies": {
            "en": "Start your day with a 90-minute vinyasa flow at Ubud's iconic Yoga Barn. Open-air shala surrounded by tropical gardens, experienced international teachers, and a post-class smoothie at the café. All levels.",
            "de": "Starte deinen Tag mit einem 90-minütigen Vinyasa Flow im ikonischen Yoga Barn in Ubud. Open-Air-Shala umgeben von tropischen Gärten, erfahrene internationale Lehrer und ein Smoothie nach dem Kurs.",
            "ru": "Начните день с 90-минутной виньяса-флоу в знаменитом Yoga Barn Убуда. Шала под открытым небом в окружении тропических садов, опытные международные преподаватели и смузи после класса в кафе.",
            "uk": "Почніть день з 90-хвилинної віньяса-флоу в знаменитому Yoga Barn Убуда. Шала під відкритим небом в оточенні тропічних садів, досвідчені міжнародні викладачі та смузі після класу в кафе.",
            "es": "Empieza tu día con un vinyasa flow de 90 minutos en el icónico Yoga Barn de Ubud. Shala al aire libre rodeada de jardines tropicales, profesores internacionales experimentados y smoothie post-clase.",
        },
    },
    # 2. Rice Terrace Walk — Tegallalang
    {
        "iso_local": "2026-06-10 08:00",
        "duration_minutes": 180,
        "category": "guided-tours",
        "address": "Tegallalang Rice Terrace, Ubud",
        "venue_short": "Tegallalang",
        "lat": -8.4310,
        "lng": 115.2790,
        "is_free": False,
        "price": 100000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.ubudtours.com",
        "source_label": "ubudtours.com",
        "photos": ["https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80"],
        "titles": {
            "en": "Rice Terrace Walk — Tegallalang Sunrise",
            "de": "Reisterrassen-Wanderung — Tegallalang Sonnenaufgang",
            "ru": "Прогулка по рисовым террасам — рассвет в Тегаллаланге",
            "uk": "Прогулянка рисовими терасами — світанок у Тегаллаланзі",
            "es": "Caminata por terrazas de arroz — Amanecer en Tegallalang",
        },
        "bodies": {
            "en": "Walk through the stunning Tegallalang rice terraces at sunrise before the crowds arrive. Learn about the traditional Balinese subak irrigation system, photograph emerald-green paddies, and enjoy fresh coconut water.",
            "de": "Wandere durch die atemberaubenden Tegallalang-Reisterrassen bei Sonnenaufgang, bevor die Massen kommen. Erfahre mehr über das traditionelle balinesische Subak-Bewässerungssystem und genieße frisches Kokoswasser.",
            "ru": "Прогуляйтесь по потрясающим рисовым террасам Тегаллаланга на рассвете до прихода толп. Узнайте о традиционной балийской системе орошения субак, фотографируйте изумрудные рисовые поля и пейте свежую кокосовую воду.",
            "uk": "Прогуляйтесь по приголомшливих рисових терасах Тегаллалангу на світанку до приходу натовпів. Дізнайтесь про традиційну балійську систему зрошення субак, фотографуйте смарагдові рисові поля та пийте свіжу кокосову воду.",
            "es": "Camina por las impresionantes terrazas de arroz de Tegallalang al amanecer antes de las multitudes. Aprende sobre el sistema de irrigación subak balinés, fotografía arrozales esmeralda y disfruta de agua de coco fresca.",
        },
    },
    # 3. Balinese Cooking Class
    {
        "iso_local": "2026-06-12 09:00",
        "duration_minutes": 240,
        "category": "cooking",
        "address": "Paon Bali Cooking Class, Jl. Raya Laplapan, Ubud",
        "venue_short": "Paon Bali",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 450000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.paon-bali.com",
        "source_label": "paon-bali.com",
        "photos": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"],
        "titles": {
            "en": "Balinese Cooking Class — Traditional Recipes",
            "de": "Balinesischer Kochkurs — Traditionelle Rezepte",
            "ru": "Кулинарный класс балийской кухни — традиционные рецепты",
            "uk": "Кулінарний клас балійської кухні — традиційні рецепти",
            "es": "Clase de cocina balinesa — Recetas tradicionales",
        },
        "bodies": {
            "en": "Learn to cook authentic Balinese dishes — nasi goreng, satay, lawar, and sambal — in a traditional open-air kitchen. Starts with a market visit to select fresh spices and ingredients. Includes full lunch.",
            "de": "Lerne authentische balinesische Gerichte zu kochen — Nasi Goreng, Satay, Lawar und Sambal — in einer traditionellen Open-Air-Küche. Beginnt mit einem Marktbesuch für frische Gewürze. Inklusive Mittagessen.",
            "ru": "Научитесь готовить аутентичные балийские блюда — наси горенг, сатай, лавар и самбал — на традиционной кухне под открытым небом. Начинается с визита на рынок за свежими специями. Включает обед.",
            "uk": "Навчіться готувати автентичні балійські страви — насі горенг, сатай, лавар та самбал — на традиційній кухні під відкритим небом. Починається з візиту на ринок за свіжими спеціями. Включає обід.",
            "es": "Aprende a cocinar platos balineses auténticos — nasi goreng, satay, lawar y sambal — en una cocina tradicional al aire libre. Comienza con visita al mercado para especias frescas. Incluye almuerzo completo.",
        },
    },
    # 4. Traditional Dance Performance — Legong
    {
        "iso_local": "2026-06-14 19:30",
        "duration_minutes": 90,
        "category": "dancing",
        "address": "Ubud Royal Palace (Puri Saren), Ubud",
        "venue_short": "Ubud Royal Palace",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 100000,
        "currency": "IDR",
        "languages": ["id", "en"],
        "source_url": "https://www.ubudpalace.com",
        "source_label": "ubudpalace.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Traditional Dance Performance — Legong at Royal Palace",
            "de": "Traditionelle Tanzaufführung — Legong im Königspalast",
            "ru": "Традиционное танцевальное представление — Легонг в Королевском дворце",
            "uk": "Традиційна танцювальна вистава — Легонг у Королівському палаці",
            "es": "Espectáculo de danza tradicional — Legong en el Palacio Real",
        },
        "bodies": {
            "en": "Watch a mesmerizing Legong dance performance at the Ubud Royal Palace. Graceful dancers in golden costumes tell ancient Hindu stories through intricate movements, accompanied by a live gamelan orchestra under the stars.",
            "de": "Erlebe eine faszinierende Legong-Tanzaufführung im Königspalast von Ubud. Anmutige Tänzerinnen in goldenen Kostümen erzählen alte hinduistische Geschichten durch kunstvolle Bewegungen, begleitet von einem Live-Gamelan-Orchester.",
            "ru": "Посмотрите завораживающее танцевальное представление Легонг в Королевском дворце Убуда. Грациозные танцовщицы в золотых костюмах рассказывают древние индуистские истории через изящные движения под живой оркестр гамелан.",
            "uk": "Подивіться зачаровуючу танцювальну виставу Легонг у Королівському палаці Убуда. Граціозні танцівниці в золотих костюмах розповідають давні індуїстські історії через витончені рухи під живий оркестр гамелан.",
            "es": "Contempla una hipnótica actuación de danza Legong en el Palacio Real de Ubud. Bailarinas gráciles en trajes dorados cuentan antiguas historias hindúes con movimientos intrincados, acompañadas por una orquesta gamelan en vivo.",
        },
    },
    # 5. Expat Meetup — Ubud Digital Nomads
    {
        "iso_local": "2026-06-17 17:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "Seniman Coffee Studio, Jl. Sriwedari 5, Ubud",
        "venue_short": "Seniman Coffee",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": True,
        "price": None,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/ubud-digital-nomads",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Ubud Digital Nomads",
            "de": "Expat-Treffen — Ubud Digital Nomads",
            "ru": "Встреча экспатов — цифровые кочевники Убуда",
            "uk": "Зустріч експатів — цифрові кочівники Убуда",
            "es": "Encuentro de expatriados — Nómadas digitales de Ubud",
        },
        "bodies": {
            "en": "Meet fellow digital nomads and expats living in Ubud at Seniman Coffee. Share coworking tips, explore collaboration opportunities, and enjoy specialty Indonesian coffee. A relaxed way to build your Bali network.",
            "de": "Triff andere digitale Nomaden und Expats in Ubud im Seniman Coffee. Teile Coworking-Tipps, erkunde Kooperationsmöglichkeiten und genieße indonesischen Spezialitätenkaffee. Entspannt dein Bali-Netzwerk aufbauen.",
            "ru": "Познакомьтесь с другими цифровыми кочевниками и экспатами в Убуде в Seniman Coffee. Делитесь советами по коворкингам, исследуйте возможности сотрудничества и наслаждайтесь индонезийским спешелти-кофе.",
            "uk": "Познайомтесь з іншими цифровими кочівниками та експатами в Убуді в Seniman Coffee. Діліться порадами щодо коворкінгів, досліджуйте можливості співпраці та насолоджуйтесь індонезійською спешелті-кавою.",
            "es": "Conoce a otros nómadas digitales y expatriados en Ubud en Seniman Coffee. Comparte tips de coworking, explora oportunidades de colaboración y disfruta de café indonesio de especialidad.",
        },
    },
    # 6. Morning Meditation — Sacred Monkey Forest
    {
        "iso_local": "2026-06-09 06:30",
        "duration_minutes": 60,
        "category": "yoga",
        "address": "Sacred Monkey Forest Sanctuary, Ubud",
        "venue_short": "Monkey Forest",
        "lat": -8.5180,
        "lng": 115.2590,
        "is_free": False,
        "price": 80000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.monkeyforestubud.com",
        "source_label": "monkeyforestubud.com",
        "photos": ["https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80"],
        "titles": {
            "en": "Morning Meditation — Sacred Monkey Forest",
            "de": "Morgenmeditation — Heiliger Affenwald",
            "ru": "Утренняя медитация — Священный лес обезьян",
            "uk": "Ранкова медитація — Священний ліс мавп",
            "es": "Meditación matutina — Bosque Sagrado de los Monos",
        },
        "bodies": {
            "en": "Guided meditation session at the edge of the Sacred Monkey Forest before it opens to visitors. Ancient banyan trees, temple energy, and morning birdsong create a profound setting. Bring a cushion or sit on provided mats.",
            "de": "Geführte Meditationssitzung am Rand des Heiligen Affenwaldes, bevor er für Besucher öffnet. Alte Banyan-Bäume, Tempelenergie und morgendlicher Vogelgesang schaffen eine tiefgreifende Atmosphäre.",
            "ru": "Сеанс медитации с гидом на краю Священного леса обезьян до открытия для посетителей. Древние баньяновые деревья, энергия храма и утреннее пение птиц создают глубокую атмосферу.",
            "uk": "Сеанс медитації з гідом на краю Священного лісу мавп до відкриття для відвідувачів. Давні баньянові дерева, енергія храму та ранковий спів птахів створюють глибоку атмосферу.",
            "es": "Sesión de meditación guiada al borde del Bosque Sagrado de los Monos antes de abrir al público. Árboles banyan antiguos, energía del templo y canto de pájaros matutino crean un entorno profundo.",
        },
    },
    # 7. Waterfall Hike — Tegenungan
    {
        "iso_local": "2026-06-15 08:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Tegenungan Waterfall, Gianyar, Bali",
        "venue_short": "Tegenungan Waterfall",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 50000,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.meetup.com/ubud-hikers",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&q=80"],
        "titles": {
            "en": "Waterfall Hike — Tegenungan & Hidden Falls",
            "de": "Wasserfall-Wanderung — Tegenungan & versteckte Fälle",
            "ru": "Поход к водопадам — Тегенунган и скрытые водопады",
            "uk": "Похід до водоспадів — Тегенунган та приховані водоспади",
            "es": "Caminata a cascadas — Tegenungan y cascadas ocultas",
        },
        "bodies": {
            "en": "Hike to the stunning Tegenungan waterfall and two hidden falls nearby. Swim in natural pools, walk through lush jungle paths, and enjoy the morning mist. Moderate difficulty — bring water shoes and swimwear.",
            "de": "Wandere zum atemberaubenden Tegenungan-Wasserfall und zwei versteckten Fällen in der Nähe. Schwimme in natürlichen Pools, wandere durch üppige Dschungelpfade und genieße den Morgennebel. Mittlere Schwierigkeit.",
            "ru": "Поход к потрясающему водопаду Тегенунган и двум скрытым водопадам поблизости. Купание в природных бассейнах, прогулка по пышным джунглевым тропам и утренний туман. Средняя сложность.",
            "uk": "Похід до приголомшливого водоспаду Тегенунган та двох прихованих водоспадів поблизу. Купання в природних басейнах, прогулянка пишними джунглевими стежками та ранковий туман. Середня складність.",
            "es": "Caminata a la impresionante cascada Tegenungan y dos cascadas ocultas cercanas. Nada en piscinas naturales, camina por senderos de jungla exuberante y disfruta de la niebla matutina. Dificultad moderada.",
        },
    },
    # 8. Art Gallery Walk — Ubud Art Market
    {
        "iso_local": "2026-06-18 10:00",
        "duration_minutes": 150,
        "category": "museums",
        "address": "Ubud Art Market, Jl. Raya Ubud, Ubud",
        "venue_short": "Ubud Art Market",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": True,
        "price": None,
        "currency": "IDR",
        "languages": ["en", "id"],
        "source_url": "https://www.ubudartmarket.com",
        "source_label": "ubudartmarket.com",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {
            "en": "Art Gallery Walk — Ubud Art Market & Studios",
            "de": "Galerie-Spaziergang — Ubud Kunstmarkt & Studios",
            "ru": "Прогулка по галереям — арт-рынок и студии Убуда",
            "uk": "Прогулянка галереями — арт-ринок та студії Убуда",
            "es": "Paseo por galerías — Mercado de arte y estudios de Ubud",
        },
        "bodies": {
            "en": "Explore Ubud's vibrant art scene — from the traditional Art Market to contemporary galleries and working artist studios. See Balinese painting, woodcarving, batik, and modern installations. A local artist guides the tour.",
            "de": "Erkunde Ubuds lebendige Kunstszene — vom traditionellen Kunstmarkt bis zu zeitgenössischen Galerien und Künstlerstudios. Sieh balinesische Malerei, Holzschnitzerei, Batik und moderne Installationen.",
            "ru": "Исследуйте яркую арт-сцену Убуда — от традиционного арт-рынка до современных галерей и действующих студий художников. Балийская живопись, резьба по дереву, батик и современные инсталляции.",
            "uk": "Дослідіть яскраву арт-сцену Убуда — від традиційного арт-ринку до сучасних галерей та діючих студій художників. Балійський живопис, різьба по дереву, батик та сучасні інсталяції.",
            "es": "Explora la vibrante escena artística de Ubud — desde el Mercado de Arte tradicional hasta galerías contemporáneas y estudios de artistas. Pintura balinesa, talla en madera, batik e instalaciones modernas.",
        },
    },
    # 9. Sound Healing — Crystal Bowls
    {
        "iso_local": "2026-06-20 17:00",
        "duration_minutes": 90,
        "category": "yoga",
        "address": "Pyramids of Chi, Ubud",
        "venue_short": "Pyramids of Chi",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 250000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.pyramidsofchi.com",
        "source_label": "pyramidsofchi.com",
        "photos": ["https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80"],
        "titles": {
            "en": "Sound Healing — Crystal Bowls at Pyramids of Chi",
            "de": "Klangtherapie — Kristallschalen bei Pyramids of Chi",
            "ru": "Звуковое исцеление — кристальные чаши в Pyramids of Chi",
            "uk": "Звукове зцілення — кришталеві чаші в Pyramids of Chi",
            "es": "Sanación sonora — Cuencos de cristal en Pyramids of Chi",
        },
        "bodies": {
            "en": "Experience deep relaxation through sound healing inside a golden pyramid. Crystal singing bowls, gongs, and overtone instruments create waves of vibration. Lie down, close your eyes, and let the frequencies wash over you.",
            "de": "Erlebe tiefe Entspannung durch Klangtherapie in einer goldenen Pyramide. Kristall-Klangschalen, Gongs und Obertoninstrumente erzeugen Vibrationswellen. Leg dich hin, schließe die Augen und lass die Frequenzen wirken.",
            "ru": "Испытайте глубокое расслабление через звуковое исцеление внутри золотой пирамиды. Кристальные поющие чаши, гонги и обертонные инструменты создают волны вибрации. Лягте, закройте глаза и позвольте частотам омыть вас.",
            "uk": "Відчуйте глибоке розслаблення через звукове зцілення всередині золотої піраміди. Кришталеві співочі чаші, гонги та обертонні інструменти створюють хвилі вібрації. Лягте, закрийте очі та дозвольте частотам омити вас.",
            "es": "Experimenta una relajación profunda a través de la sanación sonora dentro de una pirámide dorada. Cuencos de cristal, gongs e instrumentos de armónicos crean ondas de vibración. Acuéstate y deja que las frecuencias te envuelvan.",
        },
    },
    # 10. Cacao Ceremony
    {
        "iso_local": "2026-06-22 16:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "The Shala Bali, Jl. Penestanan Kelod, Ubud",
        "venue_short": "The Shala Bali",
        "lat": -8.5069,
        "lng": 115.2625,
        "is_free": False,
        "price": 200000,
        "currency": "IDR",
        "languages": ["en"],
        "source_url": "https://www.theshalabali.com",
        "source_label": "theshalabali.com",
        "photos": ["https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80"],
        "titles": {
            "en": "Cacao Ceremony — Heart Opening Circle",
            "de": "Kakao-Zeremonie — Herzöffnungskreis",
            "ru": "Какао-церемония — круг открытия сердца",
            "uk": "Какао-церемонія — коло відкриття серця",
            "es": "Ceremonia de cacao — Círculo de apertura del corazón",
        },
        "bodies": {
            "en": "Join a sacred cacao ceremony in a beautiful open-air space. Drink ceremonial-grade Balinese cacao, set intentions, share in circle, and connect with community. Includes guided meditation, ecstatic dance, and closing integration.",
            "de": "Nimm an einer heiligen Kakao-Zeremonie in einem wunderschönen Open-Air-Raum teil. Trinke zeremoniellen balinesischen Kakao, setze Intentionen, teile im Kreis und verbinde dich mit der Gemeinschaft.",
            "ru": "Присоединяйтесь к священной какао-церемонии в красивом пространстве под открытым небом. Пейте церемониальный балийский какао, ставьте намерения, делитесь в кругу и соединяйтесь с сообществом.",
            "uk": "Приєднуйтесь до священної какао-церемонії в красивому просторі під відкритим небом. Пийте церемоніальний балійський какао, ставте наміри, діліться в колі та з'єднуйтесь зі спільнотою.",
            "es": "Únete a una ceremonia sagrada de cacao en un hermoso espacio al aire libre. Bebe cacao ceremonial balinés, establece intenciones, comparte en círculo y conéctate con la comunidad. Incluye meditación guiada y danza extática.",
        },
    },
]


# ---- Time helpers ----------------------------------------------------

def local_to_utc(iso_local: str) -> str:
    """Convert YYYY-MM-DD HH:MM (WITA = UTC+8) to ISO 8601 UTC string."""
    from datetime import datetime, timedelta
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    utc_dt = dt - timedelta(hours=8)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def local_human(iso_local: str) -> str:
    """Format YYYY-MM-DD HH:MM as '06 Jun 2026, 09:00' for the closing h3."""
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
