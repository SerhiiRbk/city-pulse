#!/usr/bin/env python3
"""
Seed 10 system events in Valencia for June 2026.

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
  exec(open('.agent-tmp/seed_valencia_june2026.py').read())
  "
"""

from __future__ import annotations
import json, os, ssl, sys, urllib.request, urllib.parse
from typing import Any

# ---- Constants -------------------------------------------------------
CITY_ID = "aa4ee6fd-9dfb-40f8-a627-7a21f6ad3eb2"
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
    # 1. Las Fallas Museum Visit
    {
        "iso_local": "2026-06-07 11:00",
        "duration_minutes": 120,
        "category": "museums",
        "address": "Museo Fallero, Plaza Monteolivete 4, Valencia",
        "venue_short": "Museo Fallero",
        "lat": 39.4540,
        "lng": -0.3500,
        "is_free": False,
        "price": 4,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.visitvalencia.com/museo-fallero",
        "source_label": "visitvalencia.com",
        "photos": ["https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80"],
        "titles": {
            "en": "Las Fallas Museum — Valencia's Fire Festival Heritage",
            "de": "Las Fallas Museum — Valencias Feuerfest-Erbe",
            "ru": "Музей Лас Фальяс — наследие огненного фестиваля Валенсии",
            "uk": "Музей Лас Фальяс — спадщина вогняного фестивалю Валенсії",
            "es": "Museo Fallero — Patrimonio de las Fallas de Valencia",
        },
        "bodies": {
            "en": "Explore the Museo Fallero and discover the ninots (figures) saved from the flames each year. Learn about Valencia's UNESCO-listed Fallas festival, its artistry, and centuries-old traditions of fire and satire.",
            "de": "Erkunde das Museo Fallero und entdecke die Ninots (Figuren), die jedes Jahr vor den Flammen gerettet werden. Erfahre mehr über Valencias UNESCO-gelistetes Fallas-Festival und seine jahrhundertealten Traditionen.",
            "ru": "Исследуйте Музей Фальяс и откройте нинотов (фигуры), спасённых от огня каждый год. Узнайте о фестивале Фальяс Валенсии, включённом в список ЮНЕСКО, его искусстве и вековых традициях огня и сатиры.",
            "uk": "Дослідіть Музей Фальяс та відкрийте нінотів (фігури), врятованих від вогню щороку. Дізнайтесь про фестиваль Фальяс Валенсії, включений до списку ЮНЕСКО, його мистецтво та вікові традиції вогню та сатири.",
            "es": "Explora el Museo Fallero y descubre los ninots indultados cada año. Conoce las Fallas de Valencia, declaradas Patrimonio de la Humanidad por la UNESCO, su arte y tradiciones centenarias de fuego y sátira.",
        },
    },
    # 2. Paella Cooking Class
    {
        "iso_local": "2026-06-10 11:00",
        "duration_minutes": 180,
        "category": "cooking",
        "address": "Escuela de Arroces, Calle del Conde de Altea 41, Valencia",
        "venue_short": "Escuela de Arroces",
        "lat": 39.4780,
        "lng": -0.3810,
        "is_free": False,
        "price": 65,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.escueladearroces.com",
        "source_label": "escueladearroces.com",
        "photos": ["https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80"],
        "titles": {
            "en": "Paella Cooking Class — Authentic Valencian Recipe",
            "de": "Paella-Kochkurs — Authentisches valencianisches Rezept",
            "ru": "Кулинарный класс паэльи — аутентичный валенсийский рецепт",
            "uk": "Кулінарний клас паельї — автентичний валенсійський рецепт",
            "es": "Clase de paella — Receta valenciana auténtica",
        },
        "bodies": {
            "en": "Learn to cook authentic Valencian paella from scratch with a local chef. Discover the secrets of socarrat, the right rice, and traditional ingredients. Includes market visit, cooking, and shared lunch with wine.",
            "de": "Lerne authentische valencianische Paella von Grund auf mit einem lokalen Koch zu kochen. Entdecke die Geheimnisse des Socarrat, den richtigen Reis und traditionelle Zutaten. Inklusive Marktbesuch und Mittagessen.",
            "ru": "Научитесь готовить аутентичную валенсийскую паэлью с нуля с местным шефом. Откройте секреты сокаррата, правильного риса и традиционных ингредиентов. Включает визит на рынок, готовку и обед с вином.",
            "uk": "Навчіться готувати автентичну валенсійську паелью з нуля з місцевим шефом. Відкрийте секрети сокаррату, правильного рису та традиційних інгредієнтів. Включає візит на ринок, готування та обід з вином.",
            "es": "Aprende a cocinar una auténtica paella valenciana desde cero con un chef local. Descubre los secretos del socarrat, el arroz adecuado y los ingredientes tradicionales. Incluye visita al mercado y almuerzo.",
        },
    },
    # 3. Beach Volleyball — Malvarrosa
    {
        "iso_local": "2026-06-13 17:00",
        "duration_minutes": 120,
        "category": "other",
        "address": "Playa de la Malvarrosa, Valencia",
        "venue_short": "Playa Malvarrosa",
        "lat": 39.4780,
        "lng": -0.3280,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/valencia-beach-sports",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80"],
        "titles": {
            "en": "Beach Volleyball — Malvarrosa",
            "de": "Beachvolleyball — Malvarrosa",
            "ru": "Пляжный волейбол — Мальварроса",
            "uk": "Пляжний волейбол — Мальварроса",
            "es": "Vóley playa — Malvarrosa",
        },
        "bodies": {
            "en": "Join a friendly beach volleyball session on Malvarrosa beach. Mixed levels welcome — we form teams on the spot. Bring water and sunscreen. Afterwards we cool off with drinks at a chiringuito!",
            "de": "Schließe dich einer freundlichen Beachvolleyball-Session am Malvarrosa-Strand an. Alle Level willkommen — Teams werden vor Ort gebildet. Wasser und Sonnencreme mitbringen. Danach Drinks am Chiringuito!",
            "ru": "Присоединяйтесь к дружеской игре в пляжный волейбол на пляже Мальварроса. Все уровни приветствуются — команды формируем на месте. Возьмите воду и солнцезащитный крем. Потом напитки в чирингито!",
            "uk": "Приєднуйтесь до дружньої гри в пляжний волейбол на пляжі Мальварроса. Всі рівні вітаються — команди формуємо на місці. Візьміть воду та сонцезахисний крем. Потім напої в чірінгіто!",
            "es": "Únete a una sesión amigable de vóley playa en la Malvarrosa. Todos los niveles bienvenidos — formamos equipos en el momento. Trae agua y protector solar. ¡Después nos refrescamos en un chiringuito!",
        },
    },
    # 4. Language Exchange — Valencia Polyglots
    {
        "iso_local": "2026-06-11 19:00",
        "duration_minutes": 150,
        "category": "networking",
        "address": "Café de las Horas, Calle del Conde de Almodóvar 1, Valencia",
        "venue_short": "Café de las Horas",
        "lat": 39.4780,
        "lng": -0.3810,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/valencia-language-exchange",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"],
        "titles": {
            "en": "Language Exchange — Valencia Polyglots",
            "de": "Sprachaustausch — Valencia Polyglots",
            "ru": "Языковой обмен — Valencia Polyglots",
            "uk": "Мовний обмін — Valencia Polyglots",
            "es": "Intercambio de idiomas — Valencia Polyglots",
        },
        "bodies": {
            "en": "Practice Spanish, English, Valenciano, and more at this friendly language exchange in El Carmen. Rotating tables every 15 minutes, name tags with flags, and a beautiful baroque café setting. All levels welcome!",
            "de": "Übe Spanisch, Englisch, Valenciano und mehr bei diesem freundlichen Sprachaustausch in El Carmen. Rotierende Tische alle 15 Minuten, Namensschilder mit Flaggen und ein wunderschönes barockes Café-Ambiente.",
            "ru": "Практикуйте испанский, английский, валенсийский и другие языки на этом дружеском языковом обмене в Эль Кармен. Ротация столов каждые 15 минут, бейджи с флагами и красивое барочное кафе.",
            "uk": "Практикуйте іспанську, англійську, валенсійську та інші мови на цьому дружньому мовному обміні в Ель Кармен. Ротація столів кожні 15 хвилин, бейджі з прапорами та красиве барокове кафе.",
            "es": "Practica español, inglés, valenciano y más en este amigable intercambio de idiomas en El Carmen. Mesas rotativas cada 15 minutos, etiquetas con banderas y un precioso café barroco. ¡Todos los niveles!",
        },
    },
    # 5. Expat Meetup — Valencia Internationals
    {
        "iso_local": "2026-06-19 20:00",
        "duration_minutes": 180,
        "category": "networking",
        "address": "La Fábrica de Hielo, Cabanyal, Valencia",
        "venue_short": "La Fábrica de Hielo",
        "lat": 39.4780,
        "lng": -0.3280,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/valencia-expats",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"],
        "titles": {
            "en": "Expat Meetup — Valencia Internationals",
            "de": "Expat-Treffen — Valencia Internationals",
            "ru": "Встреча экспатов — Valencia Internationals",
            "uk": "Зустріч експатів — Valencia Internationals",
            "es": "Encuentro de expatriados — Valencia Internationals",
        },
        "bodies": {
            "en": "Meet fellow internationals living in Valencia at the trendy La Fábrica de Hielo in Cabanyal. Craft beer, tapas, and an easy way to expand your social circle by the beach. No registration needed!",
            "de": "Triff andere Internationale in Valencia im trendigen La Fábrica de Hielo in Cabanyal. Craft-Bier, Tapas und eine einfache Möglichkeit, deinen Freundeskreis am Strand zu erweitern.",
            "ru": "Познакомьтесь с другими иностранцами в Валенсии в модном La Fábrica de Hielo в Кабаньяле. Крафтовое пиво, тапас и простой способ расширить круг общения у пляжа!",
            "uk": "Познайомтесь з іншими іноземцями у Валенсії в модному La Fábrica de Hielo в Кабаньялі. Крафтове пиво, тапас та простий спосіб розширити коло спілкування біля пляжу!",
            "es": "Conoce a otros internacionales en Valencia en La Fábrica de Hielo en el Cabanyal. Cerveza artesanal, tapas y una forma fácil de ampliar tu círculo social junto a la playa. ¡Sin registro!",
        },
    },
    # 6. Morning Run in Turia Gardens
    {
        "iso_local": "2026-06-14 07:30",
        "duration_minutes": 60,
        "category": "running",
        "address": "Jardín del Turia, Puente de las Flores, Valencia",
        "venue_short": "Jardín del Turia",
        "lat": 39.4750,
        "lng": -0.3700,
        "is_free": True,
        "price": None,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.meetup.com/valencia-runners",
        "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"],
        "titles": {
            "en": "Morning Run in Turia Gardens",
            "de": "Morgenlauf in den Turia-Gärten",
            "ru": "Утренняя пробежка в садах Турии",
            "uk": "Ранкова пробіжка в садах Турії",
            "es": "Carrera matutina en los Jardines del Turia",
        },
        "bodies": {
            "en": "Join a friendly 5–10 km group run through Valencia's stunning Turia Gardens — a 9 km park in a former riverbed. Shaded paths, fountains, and views of the City of Arts & Sciences. All paces welcome!",
            "de": "Schließe dich einem freundlichen 5–10 km Gruppenlauf durch Valencias atemberaubende Turia-Gärten an — ein 9 km Park in einem ehemaligen Flussbett. Schattige Wege, Brunnen und Blick auf die Stadt der Künste.",
            "ru": "Присоединяйтесь к дружеской групповой пробежке 5–10 км по потрясающим садам Турии Валенсии — 9-километровому парку в бывшем русле реки. Тенистые дорожки, фонтаны и виды на Город искусств и наук.",
            "uk": "Приєднуйтесь до дружньої групової пробіжки 5–10 км по приголомшливих садах Турії Валенсії — 9-кілометровому парку в колишньому руслі річки. Тінисті доріжки, фонтани та види на Місто мистецтв і наук.",
            "es": "Únete a una carrera grupal de 5–10 km por los impresionantes Jardines del Turia — un parque de 9 km en el antiguo cauce del río. Caminos sombreados, fuentes y vistas a la Ciudad de las Artes. ¡Todos los ritmos!",
        },
    },
    # 7. City of Arts & Sciences Tour
    {
        "iso_local": "2026-06-15 10:00",
        "duration_minutes": 150,
        "category": "guided-tours",
        "address": "Ciudad de las Artes y las Ciencias, Valencia",
        "venue_short": "City of Arts & Sciences",
        "lat": 39.4540,
        "lng": -0.3500,
        "is_free": False,
        "price": 38,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.cac.es",
        "source_label": "cac.es",
        "photos": ["https://images.unsplash.com/photo-1599832131519-05b0e4b0134f?w=800&q=80"],
        "titles": {
            "en": "City of Arts & Sciences — Guided Tour",
            "de": "Stadt der Künste und Wissenschaften — Führung",
            "ru": "Город искусств и наук — экскурсия с гидом",
            "uk": "Місто мистецтв і наук — екскурсія з гідом",
            "es": "Ciudad de las Artes y las Ciencias — Visita guiada",
        },
        "bodies": {
            "en": "Explore Valencia's iconic City of Arts & Sciences complex designed by Calatrava. Visit the Oceanogràfic, Hemisfèric, and Science Museum with an expert guide explaining the architecture and exhibitions.",
            "de": "Erkunde Valencias ikonischen Komplex der Stadt der Künste und Wissenschaften von Calatrava. Besuche das Oceanogràfic, Hemisfèric und Wissenschaftsmuseum mit einem Experten-Guide.",
            "ru": "Исследуйте знаковый комплекс Города искусств и наук Валенсии, спроектированный Калатравой. Посетите Океанографик, Хемисферик и Музей науки с экспертом-гидом.",
            "uk": "Дослідіть знаковий комплекс Міста мистецтв і наук Валенсії, спроектований Калатравою. Відвідайте Океанографік, Хемісферік та Музей науки з експертом-гідом.",
            "es": "Explora el icónico complejo de la Ciudad de las Artes y las Ciencias diseñado por Calatrava. Visita el Oceanogràfic, Hemisfèric y Museo de las Ciencias con un guía experto.",
        },
    },
    # 8. Tapas Tour — El Carmen
    {
        "iso_local": "2026-06-17 19:30",
        "duration_minutes": 180,
        "category": "food-tours",
        "address": "Plaza del Tossal, El Carmen, Valencia",
        "venue_short": "El Carmen",
        "lat": 39.4780,
        "lng": -0.3810,
        "is_free": False,
        "price": 50,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.valenciatapastour.com",
        "source_label": "valenciatapastour.com",
        "photos": ["https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80"],
        "titles": {
            "en": "Tapas Tour — El Carmen Quarter",
            "de": "Tapas-Tour — Viertel El Carmen",
            "ru": "Тапас-тур — квартал Эль Кармен",
            "uk": "Тапас-тур — квартал Ель Кармен",
            "es": "Ruta de tapas — Barrio del Carmen",
        },
        "bodies": {
            "en": "Discover Valencia's best tapas bars in the vibrant El Carmen quarter. Visit 4 local favorites for patatas bravas, jamón ibérico, croquetas, and fresh seafood. Includes drinks and a local food expert guide.",
            "de": "Entdecke Valencias beste Tapas-Bars im lebhaften Viertel El Carmen. Besuche 4 lokale Favoriten für Patatas Bravas, Jamón Ibérico, Kroketten und frische Meeresfrüchte. Inklusive Getränke und lokalem Food-Guide.",
            "ru": "Откройте лучшие тапас-бары Валенсии в оживлённом квартале Эль Кармен. Посетите 4 местных фаворита: пататас бравас, хамон иберико, крокеты и свежие морепродукты. Включает напитки и гида.",
            "uk": "Відкрийте найкращі тапас-бари Валенсії в жвавому кварталі Ель Кармен. Відвідайте 4 місцевих фаворити: пататас бравас, хамон іберіко, крокети та свіжі морепродукти. Включає напої та гіда.",
            "es": "Descubre los mejores bares de tapas de Valencia en el vibrante Barrio del Carmen. Visita 4 favoritos locales con patatas bravas, jamón ibérico, croquetas y marisco fresco. Incluye bebidas y guía local.",
        },
    },
    # 9. Sunset Sailing
    {
        "iso_local": "2026-06-20 18:30",
        "duration_minutes": 150,
        "category": "other",
        "address": "Marina Real Juan Carlos I, Valencia",
        "venue_short": "Marina Real",
        "lat": 39.4780,
        "lng": -0.3280,
        "is_free": False,
        "price": 55,
        "currency": "EUR",
        "languages": ["es", "en"],
        "source_url": "https://www.valenciasailing.com",
        "source_label": "valenciasailing.com",
        "photos": ["https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=800&q=80"],
        "titles": {
            "en": "Sunset Sailing — Valencia Coast",
            "de": "Segeln bei Sonnenuntergang — Küste von Valencia",
            "ru": "Парусная прогулка на закате — побережье Валенсии",
            "uk": "Вітрильна прогулянка на заході — узбережжя Валенсії",
            "es": "Navegación al atardecer — Costa de Valencia",
        },
        "bodies": {
            "en": "Sail along the Valencia coast at sunset on a catamaran. Watch the sun dip below the horizon with cava, snacks, and Mediterranean views. No sailing experience needed — just relax and enjoy the golden hour.",
            "de": "Segle entlang der Küste Valencias bei Sonnenuntergang auf einem Katamaran. Beobachte den Sonnenuntergang mit Cava, Snacks und Mittelmeerblick. Keine Segelerfahrung nötig — einfach entspannen und genießen.",
            "ru": "Плывите вдоль побережья Валенсии на закате на катамаране. Наблюдайте, как солнце опускается за горизонт с кавой, закусками и средиземноморскими видами. Опыт парусного спорта не нужен!",
            "uk": "Пливіть вздовж узбережжя Валенсії на заході на катамарані. Спостерігайте, як сонце опускається за горизонт з кавою, закусками та середземноморськими видами. Досвід вітрильного спорту не потрібен!",
            "es": "Navega por la costa de Valencia al atardecer en un catamarán. Contempla la puesta de sol con cava, aperitivos y vistas al Mediterráneo. No se necesita experiencia — solo relájate y disfruta.",
        },
    },
    # 10. Flamenco Night
    {
        "iso_local": "2026-06-22 21:00",
        "duration_minutes": 120,
        "category": "dancing",
        "address": "Café del Duende, Calle del Turia 62, Valencia",
        "venue_short": "Café del Duende",
        "lat": 39.4780,
        "lng": -0.3810,
        "is_free": False,
        "price": 20,
        "currency": "EUR",
        "languages": ["es"],
        "source_url": "https://www.cafedelduende.com",
        "source_label": "cafedelduende.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {
            "en": "Flamenco Night — Café del Duende",
            "de": "Flamenco-Abend — Café del Duende",
            "ru": "Вечер фламенко — Café del Duende",
            "uk": "Вечір фламенко — Café del Duende",
            "es": "Noche de flamenco — Café del Duende",
        },
        "bodies": {
            "en": "Experience authentic flamenco in an intimate tablao setting. Professional dancers, guitarists, and singers perform passionate cante jondo and alegría. Feel the duende — the soul of flamenco — up close.",
            "de": "Erlebe authentischen Flamenco in einem intimen Tablao. Professionelle Tänzer, Gitarristen und Sänger performen leidenschaftlichen Cante Jondo und Alegría. Spüre den Duende — die Seele des Flamenco — hautnah.",
            "ru": "Испытайте аутентичное фламенко в камерном таблао. Профессиональные танцоры, гитаристы и певцы исполняют страстное канте хондо и алегрию. Почувствуйте дуэнде — душу фламенко — вблизи.",
            "uk": "Відчуйте автентичне фламенко в камерному таблао. Професійні танцюристи, гітаристи та співаки виконують пристрасне канте хондо та алегрію. Відчуйте дуенде — душу фламенко — зблизька.",
            "es": "Vive el flamenco auténtico en un tablao íntimo. Bailaores, guitarristas y cantaores profesionales interpretan cante jondo y alegrías con pasión. Siente el duende — el alma del flamenco — de cerca.",
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
    """Format YYYY-MM-DD HH:MM as '06 Jun 2026, 19:00' for the closing h3."""
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
            "city": "Valencia",
            "city_id": CITY_ID,
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
