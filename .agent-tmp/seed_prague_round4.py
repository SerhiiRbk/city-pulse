#!/usr/bin/env python3
"""Seed 10 additional Prague events for May-June 2026 (round 4)."""
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

CITY_ID = '46837694-6917-48cc-843b-338c297394ec'
SYSTEM_ORGANIZER_ID = 'acbb238e-f24f-4534-b92a-fa4bcfc7e07e'
CAT = {
    'music': '87186d0a-5631-4b30-863f-fabd5d8f74e4',
    'guided-tours': '77d52bca-998b-4edd-bfb0-e71d5ee264c0',
    'running': 'eebf6066-7396-4c79-9b48-60ab375fd9e0',
    'cycling': '2f479b11-7373-45f8-b7bd-155550b56a4b',
    'yoga': 'd6602677-7e65-40a6-80c5-08500586edc3',
    'dancing': 'a265eff9-ce91-417f-8780-493d024a9e85',
    'museums': 'd9b20fbf-7a7e-466b-acf5-1c379e6b94d6',
    'cooking': '69bd018c-a7fc-4af9-a9b5-1dcaa655d582',
    'wine-tasting': 'e6428a86-ac38-414a-988c-2ce103ae5b13',
    'craft-beer': '16d1baf1-d04e-40e0-b3fb-f791c071e6e3',
    'food-tours': 'c06ab503-5719-4c1c-bd8f-34828aa7ed5c',
    'networking': '71835799-4ffd-46b1-b6e5-f7fd9ebc11b6',
    'standup': '7a62f02d-63cc-4dba-a2b8-757c0adcc7a0',
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
    return (dt - timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ')

def human(iso_local):
    date_part, time_part = iso_local.split(' ')
    y, mo, d = (int(x) for x in date_part.split('-'))
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return f'{d:02d} {months[mo-1]} {y}, {time_part}'

EVENTS = [
    {'iso': '2026-05-24 10:00', 'dur': 180, 'cat': 'food-tours', 'addr': 'Naplavka Farmers Market, Rasinovo nabrezi, Praha 2', 'venue': 'Naplavka Market', 'lat': 50.0720, 'lng': 14.4180, 'free': True, 'price': None, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', 'src': 'https://www.farmarsketrziste.cz', 'src_l': 'farmarsketrziste.cz',
     'titles': {'en': 'Naplavka Farmers Market \u2014 Saturday Morning', 'de': 'N\u00e1plavka Bauernmarkt \u2014 Samstagmorgen', 'ru': 'Фермерский рынок Наплавка \u2014 субботнее утро', 'uk': 'Фермерський ринок Наплавка \u2014 суботнiй ранок', 'es': 'Mercado de agricultores N\u00e1plavka \u2014 S\u00e1bado por la ma\u00f1ana'},
     'bodies': {'en': 'Browse Prague\'s best farmers market along the Vltava riverbank. Fresh produce, artisan cheeses, homemade pastries, craft coffee, and local wines. Live music, river views, and a relaxed Saturday morning vibe. Bring a tote bag!', 'de': 'St\u00f6bere auf Prags bestem Bauernmarkt entlang des Moldau-Ufers. Frische Produkte, handwerklicher K\u00e4se, hausgemachtes Geb\u00e4ck, Craft-Kaffee und lokale Weine. Live-Musik, Flussblick und entspannte Samstagsmorgen-Stimmung.', 'ru': 'Прогуляйтесь по лучшему фермерскому рынку Праги на набережной Влтавы. Свежие продукты, ремесленные сыры, домашняя выпечка, крафтовый кофе и местные вина. Живая музыка, виды на реку и расслабленная субботняя атмосфера.', 'uk': 'Прогуляйтесь найкращим фермерським ринком Праги на набережнiй Влтави. Свiжi продукти, ремiсничi сири, домашня випiчка, крафтова кава та мiсцевi вина. Жива музика, види на рiчку та розслаблена суботня атмосфера.', 'es': 'Recorre el mejor mercado de agricultores de Praga junto al r\u00edo Moldava. Productos frescos, quesos artesanales, pasteler\u00eda casera, caf\u00e9 artesanal y vinos locales. M\u00fasica en vivo, vistas al r\u00edo y ambiente relajado de s\u00e1bado.'}},
    {'iso': '2026-05-27 19:00', 'dur': 120, 'cat': 'standup', 'addr': 'Underdogs Ballroom, Novy Svet 5, Praha 1', 'venue': 'Underdogs', 'lat': 50.0900, 'lng': 14.3950, 'free': False, 'price': 300, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80', 'src': 'https://www.praguecitycomedy.com', 'src_l': 'praguecitycomedy.com',
     'titles': {'en': 'Prague City Comedy \u2014 English Standup Night', 'de': 'Prague City Comedy \u2014 Englische Stand-up-Nacht', 'ru': 'Prague City Comedy \u2014 стендап на английском', 'uk': 'Prague City Comedy \u2014 стендап англiйською', 'es': 'Prague City Comedy \u2014 Noche de stand-up en ingl\u00e9s'},
     'bodies': {'en': 'Prague\'s top English-language comedy night featuring international headliners and local expat comedians. Sharp, uncensored humor in an intimate castle-district venue. Two-drink minimum, book early \u2014 sells out fast!', 'de': 'Prags beste englischsprachige Comedy-Nacht mit internationalen Headlinern und lokalen Expat-Comedians. Scharfer, unzensierter Humor in einem intimen Venue im Burgviertel. Zwei-Getr\u00e4nke-Minimum, fr\u00fch buchen!', 'ru': 'Лучший англоязычный стендап-вечер Праги с международными хедлайнерами и местными комиками-экспатами. Острый, нецензурный юмор в камерном зале в районе замка. Минимум два напитка, бронируйте заранее!', 'uk': 'Найкращий англомовний стендап-вечiр Праги з мiжнародними хедлайнерами та мiсцевими комiками-експатами. Гострий, нецензурний гумор у камерному залi в районi замку. Мiнiмум два напої, бронюйте заздалегiдь!', 'es': 'La mejor noche de comedia en ingl\u00e9s de Praga con headliners internacionales y comediantes expatriados locales. Humor agudo y sin censura en un lugar \u00edntimo del barrio del castillo.'}},
    {'iso': '2026-05-30 09:00', 'dur': 150, 'cat': 'guided-tours', 'addr': 'Vysehrad, V Pevnosti 159/5b, Praha 2', 'venue': 'Vysehrad', 'lat': 50.0640, 'lng': 14.4200, 'free': True, 'price': None, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80', 'src': 'https://www.meetup.com/prague-walks', 'src_l': 'meetup.com',
     'titles': {'en': 'Vysehrad Morning Walk \u2014 Legends & River Views', 'de': 'Vysehrad Morgenspaziergang \u2014 Legenden & Flussblicke', 'ru': 'Утренняя прогулка по Вышеграду \u2014 легенды и виды на реку', 'uk': 'Ранкова прогулянка по Вишеграду \u2014 легенди та види на рiчку', 'es': 'Paseo matutino por Vysehrad \u2014 Leyendas y vistas al r\u00edo'},
     'bodies': {'en': 'Explore Vysehrad fortress before the crowds \u2014 ancient walls, the stunning neo-Gothic basilica, Slavin cemetery (Dvorak, Mucha, Smetana), and panoramic Vltava views. A local history buff shares legends of Princess Libuse and the founding of Prague.', 'de': 'Erkunde die Festung Vysehrad vor den Massen \u2014 alte Mauern, die atemberaubende neogotische Basilika, den Slavin-Friedhof (Dvorak, Mucha, Smetana) und Panoramablicke auf die Moldau. Ein lokaler Geschichtskenner teilt Legenden.', 'ru': 'Исследуйте крепость Вышеград до прихода толп \u2014 древние стены, потрясающая неоготическая базилика, кладбище Славин (Дворжак, Муха, Сметана) и панорамные виды на Влтаву. Местный знаток истории расскажет легенды о княгине Либуше.', 'uk': 'Дослiдiть фортецю Вишеград до приходу натовпiв \u2014 давнi стiни, приголомшлива неоготична базилiка, кладовище Славiн (Дворжак, Муха, Сметана) та панорамнi види на Влтаву. Мiсцевий знавець iсторiї розповiсть легенди про княгиню Лiбуше.', 'es': 'Explora la fortaleza de Vysehrad antes de las multitudes \u2014 muros antiguos, la impresionante bas\u00edlica neog\u00f3tica, el cementerio Slav\u00edn (Dvorak, Mucha, Smetana) y vistas panor\u00e1micas del Moldava.'}},
    {'iso': '2026-06-01 18:00', 'dur': 120, 'cat': 'craft-beer', 'addr': 'BeerGeek Bar, Vinohradska 62, Praha 3', 'venue': 'BeerGeek Bar', 'lat': 50.0750, 'lng': 14.4400, 'free': False, 'price': 500, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80', 'src': 'https://www.beergeek.cz', 'src_l': 'beergeek.cz',
     'titles': {'en': 'Czech Craft Beer Tasting \u2014 BeerGeek Vinohrady', 'de': 'Tschechische Craft-Bier-Verkostung \u2014 BeerGeek Vinohrady', 'ru': 'Дегустация чешского крафтового пива \u2014 BeerGeek Vinohrady', 'uk': 'Дегустацiя чеського крафтового пива \u2014 BeerGeek Vinohrady', 'es': 'Cata de cerveza artesanal checa \u2014 BeerGeek Vinohrady'},
     'bodies': {'en': 'Taste 8 Czech craft beers with a certified cicerone at BeerGeek\'s Vinohrady taproom. Learn about Czech brewing traditions, new-wave microbreweries, and hop varieties. Includes tasting notes, snack pairings, and a souvenir glass.', 'de': 'Probiere 8 tschechische Craft-Biere mit einem zertifizierten Cicerone in BeerGeeks Vinohrady-Taproom. Erfahre mehr \u00fcber tschechische Brautraditionen, New-Wave-Mikrobrauereien und Hopfensorten. Inklusive Verkostungsnotizen und Souvenir-Glas.', 'ru': 'Попробуйте 8 чешских крафтовых сортов пива с сертифицированным цицероне в тапруме BeerGeek в Виноградах. Узнайте о чешских пивоваренных традициях, микропивоварнях нового поколения и сортах хмеля. Включает дегустационные заметки и сувенирный бокал.', 'uk': 'Спробуйте 8 чеських крафтових сортiв пива з сертифiкованим цiцероне в тапрумi BeerGeek у Виноградах. Дiзнайтесь про чеськi пивовернi традицiї, мiкропивоварнi нового поколiння та сорти хмелю. Включає дегустацiйнi нотатки та сувенiрний келих.', 'es': 'Degusta 8 cervezas artesanales checas con un cicerone certificado en el taproom de BeerGeek en Vinohrady. Aprende sobre tradiciones cerveceras checas, microcervecer\u00edas de nueva ola y variedades de l\u00fapulo.'}},
    {'iso': '2026-06-05 07:00', 'dur': 60, 'cat': 'running', 'addr': 'Letna Park, Praha 7', 'venue': 'Letna Park', 'lat': 50.0960, 'lng': 14.4200, 'free': True, 'price': None, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80', 'src': 'https://www.meetup.com/prague-runners', 'src_l': 'meetup.com',
     'titles': {'en': 'Morning Run \u2014 Letna Park with Castle Views', 'de': 'Morgenlauf \u2014 Letna Park mit Burgblick', 'ru': 'Утренняя пробежка \u2014 Летенские сады с видом на замок', 'uk': 'Ранкова пробiжка \u2014 Летенськi сади з видом на замок', 'es': 'Carrera matutina \u2014 Parque Letna con vistas al castillo'},
     'bodies': {'en': 'Join a friendly 5-8 km group run through Letna Park with stunning views of Prague Castle, the Vltava, and Old Town bridges. Flat paths through beer gardens and tree-lined alleys. All paces welcome, coffee together after at the Metronome viewpoint!', 'de': 'Schlie\u00dfe dich einem freundlichen 5-8 km Gruppenlauf durch den Letna Park an mit atemberaubendem Blick auf die Prager Burg, die Moldau und die Altstadt-Br\u00fccken. Flache Wege durch Bierg\u00e4rten und Baumalleen. Alle Tempos willkommen!', 'ru': 'Присоединяйтесь к дружеской групповой пробежке 5-8 км по Летенским садам с потрясающими видами на Пражский Град, Влтаву и мосты Старого города. Плоские дорожки через пивные сады и аллеи. Любой темп приветствуется, потом кофе у Метронома!', 'uk': 'Приєднуйтесь до дружньої групової пробiжки 5-8 км по Летенських садах з приголомшливими видами на Празький Град, Влтаву та мости Старого мiста. Плоскi дорiжки через пивнi сади та алеї. Будь-який темп вiтається, потiм кава у Метронома!', 'es': '\u00danete a una carrera grupal de 5-8 km por el Parque Letna con impresionantes vistas del Castillo de Praga, el Moldava y los puentes del casco antiguo. Caminos planos por jardines cerveceros y alamedas. \u00a1Todos los ritmos bienvenidos!'}},
    {'iso': '2026-06-07 11:00', 'dur': 180, 'cat': 'cooking', 'addr': 'Chefparade Prague, Klimentska 52, Praha 1', 'venue': 'Chefparade', 'lat': 50.0900, 'lng': 14.4300, 'free': False, 'price': 2200, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80', 'src': 'https://www.chefparade.cz', 'src_l': 'chefparade.cz',
     'titles': {'en': 'Czech Cooking Class \u2014 Trdelnik & Kolache', 'de': 'Tschechischer Kochkurs \u2014 Trdelnik & Kolache', 'ru': 'Кулинарный класс \u2014 трдельник и колаче', 'uk': 'Кулiнарний клас \u2014 трдельнiк та колаче', 'es': 'Clase de cocina checa \u2014 Trdelnik y Kolache'},
     'bodies': {'en': 'Learn to bake traditional Czech pastries \u2014 trdelnik (chimney cake) fresh from the spit and kolache (fruit-filled buns). Hands-on class with a local pastry chef, includes all ingredients, recipes, and a box of your creations to take home.', 'de': 'Lerne traditionelles tschechisches Geb\u00e4ck zu backen \u2014 Trdelnik (Baumkuchen) frisch vom Spie\u00df und Kolache (fruchtgef\u00fcllte Br\u00f6tchen). Praxiskurs mit lokalem Konditor, inklusive aller Zutaten, Rezepte und einer Box zum Mitnehmen.', 'ru': 'Научитесь печь традиционную чешскую выпечку \u2014 трдельник (трубочку) прямо с вертела и колаче (булочки с фруктовой начинкой). Практический класс с местным кондитером, включая все ингредиенты, рецепты и коробку ваших творений с собой.', 'uk': 'Навчiться пекти традицiйну чеську випiчку \u2014 трдельнiк (трубочку) прямо з вертела та колаче (булочки з фруктовою начинкою). Практичний клас з мiсцевим кондитером, включаючи всi iнгредiєнти, рецепти та коробку ваших творiнь з собою.', 'es': 'Aprende a hornear pasteler\u00eda checa tradicional \u2014 trdelnik (pastel de chimenea) reci\u00e9n hecho y kolache (bollos rellenos de fruta). Clase pr\u00e1ctica con pastelero local, incluye ingredientes, recetas y una caja para llevar.'}},
    {'iso': '2026-06-12 20:00', 'dur': 120, 'cat': 'music', 'addr': 'Jazz Dock, Janackovo nabrezi 2, Praha 5', 'venue': 'Jazz Dock', 'lat': 50.0720, 'lng': 14.4050, 'free': False, 'price': 350, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80', 'src': 'https://www.jazzdock.cz', 'src_l': 'jazzdock.cz',
     'titles': {'en': 'Jazz Night \u2014 Jazz Dock on the River', 'de': 'Jazzabend \u2014 Jazz Dock am Fluss', 'ru': 'Джазовый вечер \u2014 Jazz Dock на реке', 'uk': 'Джазовий вечiр \u2014 Jazz Dock на рiчцi', 'es': 'Noche de jazz \u2014 Jazz Dock junto al r\u00edo'},
     'bodies': {'en': 'Live jazz at Prague\'s most atmospheric venue \u2014 a floating club on the Vltava with floor-to-ceiling windows and river views. World-class musicians, craft cocktails, and an intimate setting where every seat is the best seat.', 'de': 'Live-Jazz in Prags atmosph\u00e4rischstem Venue \u2014 ein schwimmender Club auf der Moldau mit raumhohen Fenstern und Flussblick. Weltklasse-Musiker, Craft-Cocktails und ein intimes Setting, wo jeder Platz der beste ist.', 'ru': 'Живой джаз в самом атмосферном месте Праги \u2014 плавучий клуб на Влтаве с панорамными окнами и видами на реку. Музыканты мирового класса, крафтовые коктейли и камерная обстановка, где каждое место \u2014 лучшее.', 'uk': 'Живий джаз у найатмосфернiшому мiсцi Праги \u2014 плавучий клуб на Влтавi з панорамними вiкнами та видами на рiчку. Музиканти свiтового класу, крафтовi коктейлi та камерна обстановка, де кожне мiсце \u2014 найкраще.', 'es': 'Jazz en vivo en el lugar m\u00e1s atmosf\u00e9rico de Praga \u2014 un club flotante en el Moldava con ventanales y vistas al r\u00edo. M\u00fasicos de clase mundial, c\u00f3cteles artesanales y un ambiente \u00edntimo donde cada asiento es el mejor.'}},
    {'iso': '2026-06-15 10:00', 'dur': 120, 'cat': 'cycling', 'addr': 'Stromovka Park, Praha 7', 'venue': 'Stromovka', 'lat': 50.1050, 'lng': 14.4100, 'free': True, 'price': None, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80', 'src': 'https://www.meetup.com/prague-cycling', 'src_l': 'meetup.com',
     'titles': {'en': 'Cycling Tour \u2014 Stromovka to Troja Chateau', 'de': 'Radtour \u2014 Stromovka zum Schloss Troja', 'ru': 'Велотур \u2014 Стромовка до замка Троя', 'uk': 'Велотур \u2014 Стромовка до замку Троя', 'es': 'Tour en bicicleta \u2014 Stromovka al Castillo de Troja'},
     'bodies': {'en': 'Easy 15 km cycling loop from Stromovka park through the botanical garden to Troja Chateau and back along the Vltava. Flat bike paths, beautiful scenery, and a coffee stop at the chateau garden. Bring your own bike or rent at the park entrance.', 'de': 'Einfache 15 km Radtour-Schleife vom Stromovka-Park durch den Botanischen Garten zum Schloss Troja und zur\u00fcck entlang der Moldau. Flache Radwege, sch\u00f6ne Landschaft und Kaffeestopp im Schlossgarten.', 'ru': 'Лёгкий велотур 15 км от парка Стромовка через ботанический сад до замка Троя и обратно вдоль Влтавы. Плоские велодорожки, красивые пейзажи и остановка на кофе в саду замка. Свой велосипед или аренда у входа в парк.', 'uk': 'Легкий велотур 15 км вiд парку Стромовка через ботанiчний сад до замку Троя та назад вздовж Влтави. Плоскi велодорiжки, красивi пейзажi та зупинка на каву в саду замку. Свiй велосипед або оренда бiля входу в парк.', 'es': 'Ruta ciclista f\u00e1cil de 15 km desde el parque Stromovka por el jard\u00edn bot\u00e1nico hasta el Castillo de Troja y vuelta por el Moldava. Carriles bici planos, paisajes hermosos y parada para caf\u00e9 en el jard\u00edn del castillo.'}},
    {'iso': '2026-06-20 17:00', 'dur': 150, 'cat': 'wine-tasting', 'addr': 'Vinicni Altan, Havlickovy sady, Praha 2', 'venue': 'Vinicni Altan', 'lat': 50.0680, 'lng': 14.4350, 'free': False, 'price': 800, 'langs': ['cs', 'en'], 'photo': 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80', 'src': 'https://www.vinicnialtan.cz', 'src_l': 'vinicnialtan.cz',
     'titles': {'en': 'Wine Tasting in the Vineyard \u2014 Havlickovy Sady', 'de': 'Weinverkostung im Weinberg \u2014 Havlickovy Sady', 'ru': 'Дегустация вина на винограднике \u2014 Гавличковы сады', 'uk': 'Дегустацiя вина на виноградникy \u2014 Гавлiчковi сади', 'es': 'Cata de vinos en el vi\u00f1edo \u2014 Havlickovy Sady'},
     'bodies': {'en': 'Taste Moravian and Bohemian wines at Prague\'s only working vineyard in Havlickovy Sady park. Guided tasting of 6 wines with a sommelier, cheese board, and sunset views over the city from the historic gazebo. A hidden gem most tourists never find.', 'de': 'Probiere m\u00e4hrische und b\u00f6hmische Weine in Prags einzigem aktiven Weinberg im Havlickovy Sady Park. Gef\u00fchrte Verkostung von 6 Weinen mit Sommelier, K\u00e4seplatte und Sonnenuntergangsblick \u00fcber die Stadt.', 'ru': 'Попробуйте моравские и богемские вина на единственном действующем винограднике Праги в парке Гавличковы сады. Дегустация 6 вин с сомелье, сырная тарелка и виды на закат над городом из исторической беседки. Скрытая жемчужина, которую не находят туристы.', 'uk': 'Спробуйте моравськi та богемськi вина на єдиному дiючому виноградникy Праги в парку Гавлiчковi сади. Дегустацiя 6 вин з сомельє, сирна тарiлка та види на захiд над мiстом з iсторичної альтанки. Прихована перлина, яку не знаходять туристи.', 'es': 'Degusta vinos moravos y bohemios en el \u00fanico vi\u00f1edo activo de Praga en el parque Havlickovy Sady. Cata guiada de 6 vinos con sommelier, tabla de quesos y vistas del atardecer sobre la ciudad desde el mirador hist\u00f3rico.'}},
    {'iso': '2026-06-25 19:30', 'dur': 180, 'cat': 'networking', 'addr': 'Manifest Market, Florenc, Praha 8', 'venue': 'Manifest Market', 'lat': 50.0920, 'lng': 14.4400, 'free': True, 'price': None, 'langs': ['en'], 'photo': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80', 'src': 'https://www.meetup.com/prague-expats', 'src_l': 'meetup.com',
     'titles': {'en': 'Expat Summer Meetup \u2014 Manifest Market', 'de': 'Expat-Sommertreffen \u2014 Manifest Market', 'ru': 'Летняя встреча экспатов \u2014 Manifest Market', 'uk': 'Лiтня зустрiч експатiв \u2014 Manifest Market', 'es': 'Encuentro de verano para expatriados \u2014 Manifest Market'},
     'bodies': {'en': 'Kick off summer at Prague\'s coolest outdoor food market. Meet fellow internationals over street food, craft drinks, and live DJ sets. No registration needed \u2014 look for the Localisio flag near the main bar. 100+ people expected!', 'de': 'Starte den Sommer auf Prags coolstem Outdoor-Food-Markt. Triff andere Internationale bei Street Food, Craft-Drinks und Live-DJ-Sets. Keine Anmeldung n\u00f6tig \u2014 suche die Localisio-Flagge an der Hauptbar. 100+ Leute erwartet!', 'ru': 'Начните лето на самом крутом уличном фуд-маркете Праги. Познакомьтесь с другими иностранцами за стрит-фудом, крафтовыми напитками и живыми DJ-сетами. Регистрация не нужна \u2014 ищите флаг Localisio у главного бара. Ожидается 100+ человек!', 'uk': 'Почнiть лiто на найкрутiшому вуличному фуд-маркетi Праги. Познайомтесь з iншими iноземцями за стрiт-фудом, крафтовими напоями та живими DJ-сетами. Реєстрацiя не потрiбна \u2014 шукайте прапор Localisio бiля головного бару. Очiкується 100+ людей!', 'es': 'Empieza el verano en el mercado de comida al aire libre m\u00e1s cool de Praga. Conoce a otros internacionales con street food, bebidas artesanales y DJ sets en vivo. Sin registro \u2014 busca la bandera de Localisio en el bar principal. \u00a1Se esperan 100+ personas!'}},
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
        'city': 'Prague', 'city_id': CITY_ID, 'country': 'CZ',
        'address': ev['addr'], 'lat': ev['lat'], 'lng': ev['lng'],
        'is_online': False, 'is_free': ev['free'], 'price': ev['price'], 'currency': 'CZK',
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
