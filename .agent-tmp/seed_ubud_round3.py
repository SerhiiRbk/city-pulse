#!/usr/bin/env python3
"""Seed 10 additional Ubud events for May-June 2026 (round 3)."""
import ssl, os, json, sys, urllib.request
from datetime import datetime, timedelta

ssl._create_default_https_context = ssl._create_unverified_context
with open('.env.local') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, _, val = line.partition('=')
            os.environ[key.strip()] = val.strip()

url = os.environ['NEXT_PUBLIC_SUPABASE_URL']
key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'Prefer': 'return=representation'}

CITY_ID = 'f5e6394d-0803-42d7-9f37-0bba8932a41f'
SYSTEM_ORGANIZER_ID = 'acbb238e-f24f-4534-b92a-fa4bcfc7e07e'
CAT = {
    'yoga': 'd6602677-7e65-40a6-80c5-08500586edc3',
    'cooking': '69bd018c-a7fc-4af9-a9b5-1dcaa655d582',
    'music': '87186d0a-5631-4b30-863f-fabd5d8f74e4',
    'guided-tours': '77d52bca-998b-4edd-bfb0-e71d5ee264c0',
    'networking': '71835799-4ffd-46b1-b6e5-f7fd9ebc11b6',
    'dancing': 'a265eff9-ce91-417f-8780-493d024a9e85',
    'photography': 'a588fd1c-bff3-4270-90af-10dd2ed83a18',
    'other': '0f106ec4-baaf-4274-9d60-b059771a4f67',
}
LANG_ORDER = ['en', 'de', 'ru', 'uk', 'es']
LANG_LABEL = {'en': 'English', 'de': 'Deutsch', 'ru': 'Русский', 'uk': 'Українська', 'es': 'Español'}

def t_text(s, marks=None):
    node = {'type': 'text', 'text': s}
    if marks: node['marks'] = marks
    return node
def t_link(label, href): return t_text(label, [{'type': 'link', 'attrs': {'href': href}}])
def t_h2(s): return {'type': 'heading', 'attrs': {'level': 2}, 'content': [t_text(s)]}
def t_h3(s): return {'type': 'heading', 'attrs': {'level': 3}, 'content': [t_text(s)]}
def t_para(*nodes): return {'type': 'paragraph', 'content': list(nodes)}

def build_desc(titles, bodies, when, venue, src_url, src_label):
    blocks = []
    for lang in LANG_ORDER:
        blocks.append(t_h2(f'{LANG_LABEL[lang]} \u2014 {titles[lang]}'))
        blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f'\U0001f4c5 {when} \u00b7 \U0001f4cd {venue}'))
    blocks.append(t_para(t_text('Source: '), t_link(src_label, src_url)))
    return {'type': 'doc', 'content': blocks}

def to_utc(iso_local):
    dt = datetime.strptime(iso_local, '%Y-%m-%d %H:%M')
    return (dt - timedelta(hours=8)).strftime('%Y-%m-%dT%H:%M:%SZ')

def human(iso_local):
    date_part, time_part = iso_local.split(' ')
    y, mo, d = (int(x) for x in date_part.split('-'))
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return f'{d:02d} {months[mo-1]} {y}, {time_part}'

EVENTS = [
    {'iso': '2026-05-24 08:00', 'dur': 120, 'cat': 'yoga', 'addr': 'Ubud Yoga House, Jl. Sukma, Ubud', 'venue': 'Ubud Yoga House', 'lat': -8.508, 'lng': 115.263, 'free': False, 'price': 170000, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80', 'src': 'https://www.ubudyogahouse.com', 'src_l': 'ubudyogahouse.com',
     'titles': {'en': 'Kundalini Awakening \u2014 Morning Practice', 'de': 'Kundalini-Erweckung \u2014 Morgenpraxis', 'ru': 'Пробуждение Кундалини \u2014 утренняя практика', 'uk': 'Пробудження Кундалiнi \u2014 ранкова практика', 'es': 'Despertar Kundalini \u2014 Pr\u00e1ctica matutina'},
     'bodies': {'en': 'Awaken your energy with a Kundalini yoga class combining breathwork, mantras, and dynamic movement. Suitable for all levels. Includes herbal tea ceremony after class in the garden.', 'de': 'Erwecke deine Energie mit einer Kundalini-Yoga-Klasse, die Atemarbeit, Mantras und dynamische Bewegung kombiniert. F\u00fcr alle Level geeignet. Inklusive Kr\u00e4utertee-Zeremonie nach dem Kurs.', 'ru': 'Пробудите свою энергию на классе Кундалини-йоги, сочетающем дыхательные практики, мантры и динамическое движение. Подходит для всех уровней. Включает чайную церемонию с травами после класса.', 'uk': 'Пробудiть свою енергiю на класi Кундалiнi-йоги, що поєднує дихальнi практики, мантри та динамiчний рух. Пiдходить для всiх рiвнiв. Включає чайну церемонiю з травами пiсля класу.', 'es': 'Despierta tu energ\u00eda con una clase de yoga Kundalini que combina respiraci\u00f3n, mantras y movimiento din\u00e1mico. Para todos los niveles. Incluye ceremonia de t\u00e9 herbal despu\u00e9s de la clase.'}},
    {'iso': '2026-05-26 16:00', 'dur': 180, 'cat': 'cooking', 'addr': 'Casa Luna Cooking School, Jl. Bisma, Ubud', 'venue': 'Casa Luna', 'lat': -8.505, 'lng': 115.260, 'free': False, 'price': 500000, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80', 'src': 'https://www.casalunabali.com', 'src_l': 'casalunabali.com',
     'titles': {'en': 'Balinese Desserts Workshop \u2014 Klepon & Dadar Gulung', 'de': 'Balinesische Desserts Workshop \u2014 Klepon & Dadar Gulung', 'ru': 'Мастер-класс балийских десертов \u2014 Клепон и Дадар Гулунг', 'uk': 'Майстер-клас балiйських десертiв \u2014 Клепон та Дадар Гулунг', 'es': 'Taller de postres balineses \u2014 Klepon y Dadar Gulung'},
     'bodies': {'en': 'Learn to make traditional Balinese sweets \u2014 klepon (pandan rice balls with palm sugar) and dadar gulung (coconut crepes). Hands-on class with local ingredients, recipes to take home, and tasting of all creations.', 'de': 'Lerne traditionelle balinesische S\u00fc\u00dfigkeiten zu machen \u2014 Klepon (Pandan-Reisb\u00e4llchen mit Palmzucker) und Dadar Gulung (Kokos-Cr\u00eapes). Praxiskurs mit lokalen Zutaten, Rezepte zum Mitnehmen.', 'ru': 'Научитесь готовить традиционные балийские сладости \u2014 клепон (рисовые шарики с панданом и пальмовым сахаром) и дадар гулунг (кокосовые блинчики). Практический класс с местными ингредиентами и рецептами.', 'uk': 'Навчiться готувати традицiйнi балiйськi солодощi \u2014 клепон (рисовi кульки з панданом та пальмовим цукром) та дадар гулунг (кокосовi млинцi). Практичний клас з мiсцевими iнгредiєнтами та рецептами.', 'es': 'Aprende a hacer dulces balineses tradicionales \u2014 klepon (bolas de arroz con pand\u00e1n y az\u00facar de palma) y dadar gulung (crepes de coco). Clase pr\u00e1ctica con ingredientes locales y recetas para llevar.'}},
    {'iso': '2026-05-28 19:00', 'dur': 120, 'cat': 'music', 'addr': 'Laughing Buddha Bar, Jl. Monkey Forest, Ubud', 'venue': 'Laughing Buddha', 'lat': -8.510, 'lng': 115.262, 'free': True, 'price': None, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', 'src': 'https://www.meetup.com/ubud-music', 'src_l': 'meetup.com',
     'titles': {'en': 'Open Mic Night \u2014 Laughing Buddha', 'de': 'Open Mic Night \u2014 Laughing Buddha', 'ru': 'Открытый микрофон \u2014 Laughing Buddha', 'uk': 'Вiдкритий мiкрофон \u2014 Laughing Buddha', 'es': 'Noche de micr\u00f3fono abierto \u2014 Laughing Buddha'},
     'bodies': {'en': 'Sing, play, recite poetry, or just enjoy the show at Ubud\'s friendliest open mic night. Acoustic sets, spoken word, comedy \u2014 all welcome. Sign up at the bar or just grab a drink and listen under the stars.', 'de': 'Singe, spiele, trage Gedichte vor oder genie\u00dfe einfach die Show bei Ubuds freundlichster Open Mic Night. Akustik-Sets, Spoken Word, Comedy \u2014 alle willkommen.', 'ru': 'Пойте, играйте, читайте стихи или просто наслаждайтесь шоу на самом дружелюбном открытом микрофоне Убуда. Акустика, spoken word, комедия \u2014 все приветствуются.', 'uk': 'Спiвайте, грайте, читайте вiршi або просто насолоджуйтесь шоу на найдружнiшому вiдкритому мiкрофонi Убуда. Акустика, spoken word, комедiя \u2014 всi вiтаються.', 'es': 'Canta, toca, recita poes\u00eda o simplemente disfruta del show en la noche de micr\u00f3fono abierto m\u00e1s amigable de Ubud. Sets ac\u00fasticos, spoken word, comedia \u2014 todos bienvenidos.'}},
    {'iso': '2026-06-02 07:00', 'dur': 240, 'cat': 'guided-tours', 'addr': 'Sidemen Village, Karangasem, Bali', 'venue': 'Sidemen Valley', 'lat': -8.470, 'lng': 115.400, 'free': False, 'price': 400000, 'langs': ['en', 'id'], 'photo': 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80', 'src': 'https://www.meetup.com/ubud-hikers', 'src_l': 'meetup.com',
     'titles': {'en': 'Sidemen Valley Trek \u2014 Off the Beaten Path', 'de': 'Sidemen-Tal-Trekking \u2014 Abseits der Touristenpfade', 'ru': 'Трек по долине Сидемен \u2014 вдали от туристов', 'uk': 'Трек по долинi Сiдемен \u2014 далеко вiд туристiв', 'es': 'Trekking por el Valle de Sidemen \u2014 Fuera de ruta'},
     'bodies': {'en': 'Explore the stunning Sidemen Valley \u2014 Bali\'s best-kept secret. Trek through rice terraces, cross rivers, visit a traditional weaving village, and enjoy Mount Agung views without the crowds. Includes transport from Ubud and local lunch.', 'de': 'Erkunde das atemberaubende Sidemen-Tal \u2014 Balis bestgeh\u00fctetes Geheimnis. Wandere durch Reisterrassen, \u00fcberquere Fl\u00fcsse, besuche ein traditionelles Weberdorf und genie\u00dfe den Blick auf den Mount Agung ohne Menschenmassen.', 'ru': 'Исследуйте потрясающую долину Сидемен \u2014 лучший секрет Бали. Трек через рисовые террасы, переправы через реки, визит в деревню ткачей и виды на гору Агунг без толп. Включает трансфер из Убуда и обед.', 'uk': 'Дослiдiть приголомшливу долину Сiдемен \u2014 найкращий секрет Балi. Трек через рисовi тераси, переправи через рiчки, вiзит до села ткачiв та види на гору Агунг без натовпiв. Включає трансфер з Убуда та обiд.', 'es': 'Explora el impresionante Valle de Sidemen \u2014 el secreto mejor guardado de Bali. Trek por terrazas de arroz, cruza r\u00edos, visita un pueblo de tejedores y disfruta vistas del Monte Agung sin multitudes.'}},
    {'iso': '2026-06-04 18:00', 'dur': 150, 'cat': 'networking', 'addr': 'Kafe, Jl. Hanoman 44B, Ubud', 'venue': 'Kafe Ubud', 'lat': -8.509, 'lng': 115.263, 'free': True, 'price': None, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80', 'src': 'https://www.meetup.com/ubud-creators', 'src_l': 'meetup.com',
     'titles': {'en': 'Creative Entrepreneurs Meetup \u2014 Ubud', 'de': 'Kreative Unternehmer Meetup \u2014 Ubud', 'ru': 'Встреча креативных предпринимателей \u2014 Убуд', 'uk': 'Зустрiч креативних пiдприємцiв \u2014 Убуд', 'es': 'Meetup de emprendedores creativos \u2014 Ubud'},
     'bodies': {'en': 'Monthly meetup for creators, artists, and entrepreneurs building from Bali. Share projects, find collaborators, and get feedback over healthy food and smoothies. Designers, writers, coaches, makers \u2014 all creative souls welcome.', 'de': 'Monatliches Treffen f\u00fcr Kreative, K\u00fcnstler und Unternehmer, die von Bali aus arbeiten. Projekte teilen, Mitstreiter finden und Feedback bei gesundem Essen und Smoothies bekommen.', 'ru': 'Ежемесячная встреча для креаторов, художников и предпринимателей, строящих бизнес с Бали. Делитесь проектами, находите коллабораторов и получайте обратную связь за здоровой едой и смузи.', 'uk': 'Щомiсячна зустрiч для креаторiв, художникiв та пiдприємцiв, що будують бiзнес з Балi. Дiлiться проектами, знаходьте колабораторiв та отримуйте зворотний зв\'язок за здоровою їжею та смузi.', 'es': 'Meetup mensual para creadores, artistas y emprendedores construyendo desde Bali. Comparte proyectos, encuentra colaboradores y recibe feedback con comida saludable y smoothies.'}},
    {'iso': '2026-06-06 20:00', 'dur': 90, 'cat': 'dancing', 'addr': 'Pura Dalem Ubud, Jl. Raya Ubud', 'venue': 'Pura Dalem Ubud', 'lat': -8.506, 'lng': 115.262, 'free': False, 'price': 100000, 'langs': ['id', 'en'], 'photo': 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80', 'src': 'https://www.ubudpalace.com', 'src_l': 'ubudpalace.com',
     'titles': {'en': 'Barong Dance \u2014 Pura Dalem Ubud', 'de': 'Barong-Tanz \u2014 Pura Dalem Ubud', 'ru': 'Танец Баронг \u2014 Пура Далем Убуд', 'uk': 'Танець Баронг \u2014 Пура Далем Убуд', 'es': 'Danza Barong \u2014 Pura Dalem Ubud'},
     'bodies': {'en': 'Watch the mythical Barong dance \u2014 a battle between good and evil in Balinese Hindu mythology. Colorful costumes, live gamelan orchestra, and trance-like kris dance. Performed at the atmospheric Pura Dalem temple at dusk.', 'de': 'Erlebe den mythischen Barong-Tanz \u2014 ein Kampf zwischen Gut und B\u00f6se in der balinesisch-hinduistischen Mythologie. Farbenfrohe Kost\u00fcme, Live-Gamelan-Orchester und tranceartiger Kris-Tanz am Pura Dalem Tempel.', 'ru': 'Посмотрите мифический танец Баронг \u2014 битву добра и зла в балийской индуистской мифологии. Красочные костюмы, живой оркестр гамелан и трансовый танец крис. Исполняется в атмосферном храме Пура Далем на закате.', 'uk': 'Подивiться мiфiчний танець Баронг \u2014 битву добра i зла в балiйськiй iндуїстськiй мiфологiї. Барвистi костюми, живий оркестр гамелан та трансовий танець крiс. Виконується в атмосферному храмi Пура Далем на заходi.', 'es': 'Contempla la m\u00edtica danza Barong \u2014 una batalla entre el bien y el mal en la mitolog\u00eda hind\u00fa balinesa. Trajes coloridos, orquesta gamelan en vivo y danza kris en trance. En el atmosf\u00e9rico templo Pura Dalem al atardecer.'}},
    {'iso': '2026-06-10 09:00', 'dur': 180, 'cat': 'other', 'addr': 'Bali Bird Park, Gianyar, Bali', 'venue': 'Bali Bird Park', 'lat': -8.540, 'lng': 115.290, 'free': False, 'price': 385000, 'langs': ['en', 'id'], 'photo': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80', 'src': 'https://www.balibirdpark.com', 'src_l': 'balibirdpark.com',
     'titles': {'en': 'Bali Bird Park \u2014 Tropical Wildlife Morning', 'de': 'Bali Bird Park \u2014 Tropischer Wildtier-Morgen', 'ru': 'Парк птиц Бали \u2014 утро с тропической фауной', 'uk': 'Парк птахiв Балi \u2014 ранок з тропiчною фауною', 'es': 'Parque de Aves de Bali \u2014 Ma\u00f1ana de fauna tropical'},
     'bodies': {'en': 'Visit Bali Bird Park with 1,000+ birds from 250 species in lush tropical gardens. See Bali starlings, birds of paradise, and free-flying aviaries. Great for photography and a peaceful morning away from Ubud\'s bustle.', 'de': 'Besuche den Bali Bird Park mit \u00fcber 1.000 V\u00f6geln aus 250 Arten in \u00fcppigen tropischen G\u00e4rten. Sieh Bali-Stare, Paradiesv\u00f6gel und freifliegende Volieren. Toll f\u00fcr Fotografie und einen ruhigen Morgen.', 'ru': 'Посетите Парк птиц Бали с 1000+ птицами 250 видов в пышных тропических садах. Увидьте балийских скворцов, райских птиц и свободно летающие вольеры. Отлично для фотографии и спокойного утра.', 'uk': 'Вiдвiдайте Парк птахiв Балi з 1000+ птахами 250 видiв у пишних тропiчних садах. Побачте балiйських шпакiв, райських птахiв та вiльно лiтаючi вольєри. Чудово для фотографiї та спокiйного ранку.', 'es': 'Visita el Parque de Aves de Bali con m\u00e1s de 1.000 aves de 250 especies en exuberantes jardines tropicales. Ve estorninos de Bali, aves del para\u00edso y aviarios de vuelo libre.'}},
    {'iso': '2026-06-14 17:00', 'dur': 120, 'cat': 'yoga', 'addr': 'Ubud Wellness Retreat, Jl. Tirta Tawar, Ubud', 'venue': 'Wellness Retreat', 'lat': -8.500, 'lng': 115.265, 'free': False, 'price': 200000, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=80', 'src': 'https://www.meetup.com/ubud-breathwork', 'src_l': 'meetup.com',
     'titles': {'en': 'Breathwork & Ice Bath \u2014 Wim Hof Method', 'de': 'Atemarbeit & Eisbad \u2014 Wim Hof Methode', 'ru': 'Дыхательные практики и ледяная ванна \u2014 метод Вим Хофа', 'uk': 'Дихальнi практики та крижана ванна \u2014 метод Вiм Хофа', 'es': 'Respiraci\u00f3n y ba\u00f1o de hielo \u2014 M\u00e9todo Wim Hof'},
     'bodies': {'en': 'Experience the Wim Hof Method \u2014 guided breathwork followed by a cold plunge in an ice bath. Build resilience, reduce stress, and feel incredibly alive. No experience needed. Towel and warm tea provided after.', 'de': 'Erlebe die Wim Hof Methode \u2014 gef\u00fchrte Atemarbeit gefolgt von einem Eisbad. Baue Resilienz auf, reduziere Stress und f\u00fchle dich unglaublich lebendig. Keine Erfahrung n\u00f6tig.', 'ru': 'Испытайте метод Вим Хофа \u2014 направленные дыхательные практики с последующим погружением в ледяную ванну. Развивайте устойчивость, снижайте стресс и чувствуйте себя невероятно живым. Опыт не нужен.', 'uk': 'Вiдчуйте метод Вiм Хофа \u2014 направленi дихальнi практики з подальшим зануренням у крижану ванну. Розвивайте стiйкiсть, знижуйте стрес та вiдчувайте себе неймовiрно живим. Досвiд не потрiбен.', 'es': 'Experimenta el M\u00e9todo Wim Hof \u2014 respiraci\u00f3n guiada seguida de inmersi\u00f3n en ba\u00f1o de hielo. Construye resiliencia, reduce estr\u00e9s y si\u00e9ntete incre\u00edblemente vivo. Sin experiencia necesaria.'}},
    {'iso': '2026-06-18 10:00', 'dur': 150, 'cat': 'photography', 'addr': 'Tirta Gangga Water Palace, Karangasem', 'venue': 'Tirta Gangga', 'lat': -8.410, 'lng': 115.520, 'free': False, 'price': 50000, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', 'src': 'https://www.meetup.com/ubud-photography', 'src_l': 'meetup.com',
     'titles': {'en': 'Photography Excursion \u2014 Tirta Gangga Water Palace', 'de': 'Foto-Ausflug \u2014 Tirta Gangga Wasserpalast', 'ru': 'Фотоэкскурсия \u2014 водный дворец Тирта Гангга', 'uk': 'Фотоекскурсiя \u2014 водний палац Тiрта Гангга', 'es': 'Excursi\u00f3n fotogr\u00e1fica \u2014 Palacio del Agua Tirta Gangga'},
     'bodies': {'en': 'Photograph the stunning Tirta Gangga water palace \u2014 ornamental pools, fountains, stone carvings, and koi fish with Mount Agung as backdrop. Tips on reflection photography, symmetry, and golden light. Transport from Ubud included.', 'de': 'Fotografiere den atemberaubenden Tirta Gangga Wasserpalast \u2014 Zierbecken, Brunnen, Steinschnitzereien und Koi-Fische mit dem Mount Agung im Hintergrund. Tipps zu Reflexionsfotografie und Symmetrie.', 'ru': 'Фотографируйте потрясающий водный дворец Тирта Гангга \u2014 декоративные бассейны, фонтаны, каменные резные фигуры и карпы кои на фоне горы Агунг. Советы по фотографии отражений и симметрии. Трансфер из Убуда включён.', 'uk': 'Фотографуйте приголомшливий водний палац Тiрта Гангга \u2014 декоративнi басейни, фонтани, кам\'янi рiзьблення та коi на фонi гори Агунг. Поради щодо фотографiї вiдображень та симетрiї. Трансфер з Убуда включений.', 'es': 'Fotograf\u00eda el impresionante palacio del agua Tirta Gangga \u2014 piscinas ornamentales, fuentes, tallas de piedra y peces koi con el Monte Agung de fondo. Consejos de fotograf\u00eda de reflejos y simetr\u00eda.'}},
    {'iso': '2026-06-24 18:30', 'dur': 180, 'cat': 'other', 'addr': 'Alchemy, Jl. Penestanan Kelod 75, Ubud', 'venue': 'Alchemy Ubud', 'lat': -8.502, 'lng': 115.255, 'free': False, 'price': 350000, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80', 'src': 'https://www.alchemybali.com', 'src_l': 'alchemybali.com',
     'titles': {'en': 'Raw Food & Fermentation Workshop \u2014 Alchemy', 'de': 'Rohkost & Fermentations-Workshop \u2014 Alchemy', 'ru': 'Мастер-класс по сыроедению и ферментации \u2014 Alchemy', 'uk': 'Майстер-клас з сироїдiння та ферментацiї \u2014 Alchemy', 'es': 'Taller de comida cruda y fermentaci\u00f3n \u2014 Alchemy'},
     'bodies': {'en': 'Learn to make raw vegan cheese, kombucha, kimchi, and energy balls at Ubud\'s legendary raw food restaurant. Understand fermentation science, gut health benefits, and take home starter cultures. All ingredients organic and locally sourced.', 'de': 'Lerne rohen veganen K\u00e4se, Kombucha, Kimchi und Energy Balls in Ubuds legend\u00e4rem Rohkost-Restaurant zu machen. Verstehe Fermentationswissenschaft, Darmgesundheit und nimm Starterkulturen mit nach Hause.', 'ru': 'Научитесь готовить сыроедческий сыр, комбучу, кимчи и энергетические шарики в легендарном ресторане сыроедения Убуда. Узнайте о науке ферментации, здоровье кишечника и заберите стартовые культуры домой.', 'uk': 'Навчiться готувати сироїдний сир, комбучу, кiмчi та енергетичнi кульки в легендарному ресторанi сироїдiння Убуда. Дiзнайтесь про науку ферментацiї, здоров\'я кишечника та заберiть стартовi культури додому.', 'es': 'Aprende a hacer queso vegano crudo, kombucha, kimchi y bolas de energ\u00eda en el legendario restaurante de comida cruda de Ubud. Entiende la ciencia de la fermentaci\u00f3n y ll\u00e9vate cultivos iniciadores a casa.'}},
]

# Check existing
check_url = f'{url}/rest/v1/events?is_system=eq.true&select=title&limit=1000'
req = urllib.request.Request(check_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    existing = json.loads(resp.read())
skip_titles = {row['title'] for row in existing}
print(f'Existing: {len(skip_titles)}')

inserted = 0
for ev in EVENTS:
    title_en = ev['titles']['en']
    if title_en in skip_titles:
        print(f'[=] skip: {title_en}'); continue
    starts_at = to_utc(ev['iso'])
    when_human = human(ev['iso'])
    desc_doc = build_desc(ev['titles'], ev['bodies'], when_human, ev['venue'], ev['src'], ev['src_l'])
    row = {
        'title': title_en, 'description': ev['bodies']['en'], 'description_json': desc_doc,
        'title_translations': {k: v for k, v in ev['titles'].items() if k != 'en'},
        'description_translations': {k: v for k, v in ev['bodies'].items() if k != 'en'},
        'starts_at': starts_at, 'duration_minutes': ev['dur'],
        'city': 'Ubud', 'city_id': CITY_ID, 'country': 'ID',
        'address': ev['addr'], 'lat': ev['lat'], 'lng': ev['lng'],
        'is_online': False, 'is_free': ev['free'], 'price': ev['price'], 'currency': 'IDR',
        'max_attendees': None, 'photos': [ev['photo']],
        'organizer_id': SYSTEM_ORGANIZER_ID, 'category_id': CAT[ev['cat']],
        'languages': ev['langs'], 'is_private': False, 'is_system': True,
        'status': 'published', 'source_url': ev['src'], 'safety_tags': [], 'allow_crews': True,
    }
    data = json.dumps(row, ensure_ascii=False).encode()
    req = urllib.request.Request(f'{url}/rest/v1/events', data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            eid = result[0]['id'] if isinstance(result, list) and result else '?'
            print(f'[+] {title_en} -> {eid}'); inserted += 1
    except urllib.error.HTTPError as e:
        print(f'[!] {title_en}: {e.code} {e.read().decode()[:80]}')

print(f'\nDone: inserted={inserted}')
