#!/usr/bin/env python3
"""Seed 15 additional system events in Brno for May-June 2026 (round 3)."""

from __future__ import annotations
import json, os, ssl, sys, urllib.request
from typing import Any

CITY_ID = "08c45881-9007-4307-a072-f01ca61c9fb4"
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
    "wine-tasting": "e6428a86-ac38-414a-988c-2ce103ae5b13",
    "craft-beer": "16d1baf1-d04e-40e0-b3fb-f791c071e6e3",
    "food-tours": "c06ab503-5719-4c1c-bd8f-34828aa7ed5c",
    "networking": "71835799-4ffd-46b1-b6e5-f7fd9ebc11b6",
    "startups": "8a45fced-9e00-46be-90c9-96606dc1515e",
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
        "iso_local": "2026-05-23 18:00", "duration_minutes": 120, "category": "wine-tasting",
        "address": "Moravian Wine Bar, Dvořákova 1, Brno", "venue_short": "Moravian Wine Bar",
        "lat": 49.1951, "lng": 16.6068, "is_free": False, "price": 800, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.moravianwinebar.cz", "source_label": "moravianwinebar.cz",
        "photos": ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80"],
        "titles": {"en": "Moravian Wine Tasting — South Moravia's Best", "de": "Mährische Weinverkostung — Das Beste Südmährens", "ru": "Дегустация моравских вин — лучшее Южной Моравии", "uk": "Дегустація моравських вин — найкраще Південної Моравії", "es": "Cata de vinos moravos — Lo mejor del sur de Moravia"},
        "bodies": {"en": "Discover South Moravia's wine region without leaving Brno. Taste 8 wines from local vineyards — Pálava, Grüner Veltliner, Frankovka, and more. A sommelier guides you through terroir, grape varieties, and food pairings with local cheese.", "de": "Entdecke Südmährens Weinregion ohne Brno zu verlassen. Probiere 8 Weine lokaler Weingüter — Pálava, Grüner Veltliner, Frankovka und mehr. Ein Sommelier führt durch Terroir, Rebsorten und Käse-Pairings.", "ru": "Откройте винный регион Южной Моравии, не покидая Брно. Попробуйте 8 вин местных виноградников — Палава, Грюнер Вельтлинер, Франковка и другие. Сомелье проведёт через терруар, сорта и сочетания с местным сыром.", "uk": "Відкрийте винний регіон Південної Моравії, не покидаючи Брно. Спробуйте 8 вин місцевих виноградників — Палава, Грюнер Вельтлінер, Франковка та інші. Сомельє проведе через терруар, сорти та поєднання з місцевим сиром.", "es": "Descubre la región vinícola del sur de Moravia sin salir de Brno. Degusta 8 vinos de viñedos locales — Pálava, Grüner Veltliner, Frankovka y más. Un sommelier te guía por terroir, variedades y maridajes con queso local."},
    },
    {
        "iso_local": "2026-05-25 10:00", "duration_minutes": 150, "category": "guided-tours",
        "address": "Ossuary beneath the Church of St. James, Jakubské nám., Brno", "venue_short": "Brno Ossuary",
        "lat": 49.1960, "lng": 16.6080, "is_free": False, "price": 200, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.ticbrno.cz/en/ossuary", "source_label": "ticbrno.cz",
        "photos": ["https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80"],
        "titles": {"en": "Brno Underground — Ossuary & Labyrinth Tour", "de": "Brno Underground — Beinhaus & Labyrinth Tour", "ru": "Подземное Брно — оссуарий и лабиринт", "uk": "Підземне Брно — осуарій та лабіринт", "es": "Brno subterráneo — Osario y laberinto"},
        "bodies": {"en": "Explore Brno's mysterious underground — the second-largest ossuary in Europe (50,000+ remains) and the medieval labyrinth beneath the Cabbage Market. Two sites, one ticket. Fascinating history of plague, war, and medieval city life below the streets.", "de": "Erkunde Brünns mysteriöses Untergrund — das zweitgrößte Beinhaus Europas (50.000+ Überreste) und das mittelalterliche Labyrinth unter dem Krautmarkt. Zwei Orte, ein Ticket. Faszinierende Geschichte von Pest, Krieg und mittelalterlichem Stadtleben.", "ru": "Исследуйте загадочное подземелье Брно — второй по величине оссуарий в Европе (50 000+ останков) и средневековый лабиринт под Капустным рынком. Два места, один билет. Увлекательная история чумы, войн и средневековой жизни.", "uk": "Дослідіть загадкове підземелля Брно — другий за величиною осуарій в Європі (50 000+ останків) та середньовічний лабіринт під Капустяним ринком. Два місця, один квиток. Захоплива історія чуми, воєн та середньовічного життя.", "es": "Explora el misterioso subterráneo de Brno — el segundo osario más grande de Europa (50.000+ restos) y el laberinto medieval bajo el Mercado de Coles. Dos sitios, un ticket. Historia fascinante de peste, guerra y vida medieval."},
    },
    {
        "iso_local": "2026-05-27 19:00", "duration_minutes": 120, "category": "standup",
        "address": "Kabinet Múz, Sukova 4, Brno", "venue_short": "Kabinet Múz",
        "lat": 49.1951, "lng": 16.6068, "is_free": False, "price": 250, "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.meetup.com/brno-comedy", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"],
        "titles": {"en": "English Standup Comedy Night — Brno", "de": "Englische Stand-up-Comedy — Brno", "ru": "Стендап на английском — Брно", "uk": "Стендап англійською — Брно", "es": "Noche de comedia stand-up en inglés — Brno"},
        "bodies": {"en": "Laugh out loud at Brno's English-language comedy night. Local expat comedians and touring acts deliver sharp humor in an intimate venue. Great way to meet fellow English speakers over drinks and laughs. Two-drink minimum.", "de": "Lache laut bei Brünns englischsprachigem Comedy-Abend. Lokale Expat-Comedians und tourende Acts liefern scharfen Humor in intimem Venue. Tolle Möglichkeit, andere Englischsprachige bei Drinks und Lachen kennenzulernen.", "ru": "Смейтесь от души на англоязычном стендап-вечере в Брно. Местные комики-экспаты и гастролирующие артисты с острым юмором в камерном зале. Отличный способ познакомиться с англоговорящими за напитками и смехом.", "uk": "Сміхайтесь від душі на англомовному стендап-вечорі в Брно. Місцеві коміки-експати та гастролюючі артисти з гострим гумором у камерному залі. Чудовий спосіб познайомитися з англомовними за напоями та сміхом.", "es": "Ríete a carcajadas en la noche de comedia en inglés de Brno. Comediantes expatriados locales y artistas de gira con humor agudo en un lugar íntimo. Gran forma de conocer angloparlantes entre risas y bebidas."},
    },
    {
        "iso_local": "2026-05-29 08:00", "duration_minutes": 180, "category": "cycling",
        "address": "Brno Dam (Brněnská přehrada), Brno", "venue_short": "Brno Dam",
        "lat": 49.2300, "lng": 16.5200, "is_free": True, "price": None, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-cycling", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80"],
        "titles": {"en": "Cycling Tour — Brno Dam & Surroundings", "de": "Radtour — Brünner Talsperre & Umgebung", "ru": "Велотур — Брненское водохранилище и окрестности", "uk": "Велотур — Брненське водосховище та околиці", "es": "Tour en bicicleta — Embalse de Brno y alrededores"},
        "bodies": {"en": "Ride around the scenic Brno Dam and through the surrounding forests. 25 km loop on paved bike paths, mostly flat with gentle hills. Stop for coffee at a lakeside café. Bring your own bike or rent one at the meeting point.", "de": "Fahre um die malerische Brünner Talsperre und durch die umliegenden Wälder. 25 km Rundkurs auf asphaltierten Radwegen, meist flach mit sanften Hügeln. Kaffeestopp am See-Café. Eigenes Rad oder Verleih am Treffpunkt.", "ru": "Прокатитесь вокруг живописного Брненского водохранилища и по окружающим лесам. 25 км по асфальтированным велодорожкам, в основном плоско с лёгкими холмами. Остановка на кофе в кафе у озера. Свой велосипед или аренда на месте.", "uk": "Прокатіться навколо мальовничого Брненського водосховища та по навколишніх лісах. 25 км по асфальтованих велодоріжках, переважно плоско з легкими пагорбами. Зупинка на каву в кафе біля озера. Свій велосипед або оренда на місці.", "es": "Pedalea alrededor del pintoresco embalse de Brno y por los bosques circundantes. Circuito de 25 km por carriles bici asfaltados, mayormente plano con suaves colinas. Parada para café en un bar junto al lago. Trae tu bici o alquila en el punto de encuentro."},
    },
    {
        "iso_local": "2026-05-31 17:00", "duration_minutes": 150, "category": "food-tours",
        "address": "Zelný trh (Cabbage Market), Brno", "venue_short": "Zelný trh",
        "lat": 49.1940, "lng": 16.6080, "is_free": False, "price": 600, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.brnofoodtours.cz", "source_label": "brnofoodtours.cz",
        "photos": ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"],
        "titles": {"en": "Brno Food Tour — Moravian Flavors", "de": "Brno Food Tour — Mährische Aromen", "ru": "Фуд-тур по Брно — моравские вкусы", "uk": "Фуд-тур по Брно — моравські смаки", "es": "Tour gastronómico de Brno — Sabores moravos"},
        "bodies": {"en": "Taste Brno's best food across 5 stops — from the historic Cabbage Market to hidden courtyards. Try trdelník fresh from the oven, Moravian wine, smažený sýr, craft beer, and local charcuterie. Stories of Brno's food culture included.", "de": "Probiere Brünns bestes Essen an 5 Stationen — vom historischen Krautmarkt bis zu versteckten Innenhöfen. Frischer Trdelník, mährischer Wein, Smažený sýr, Craft-Bier und lokale Wurst. Geschichten der Brünner Esskultur inklusive.", "ru": "Попробуйте лучшую еду Брно на 5 остановках — от исторического Капустного рынка до скрытых двориков. Свежий трдельник, моравское вино, смаженый сыр, крафтовое пиво и местные колбасы. Истории кулинарной культуры Брно.", "uk": "Спробуйте найкращу їжу Брно на 5 зупинках — від історичного Капустяного ринку до прихованих двориків. Свіжий трдельник, моравське вино, смажений сир, крафтове пиво та місцеві ковбаси. Історії кулінарної культури Брно.", "es": "Prueba la mejor comida de Brno en 5 paradas — desde el histórico Mercado de Coles hasta patios ocultos. Trdelník recién horneado, vino moravo, smažený sýr, cerveza artesanal y embutidos locales. Historias de la cultura gastronómica de Brno."},
    },
    {
        "iso_local": "2026-06-02 19:30", "duration_minutes": 120, "category": "music",
        "address": "Fléda Club, Štefánikova 24, Brno", "venue_short": "Fléda Club",
        "lat": 49.2000, "lng": 16.5950, "is_free": False, "price": 350, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.fleda.cz", "source_label": "fleda.cz",
        "photos": ["https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80"],
        "titles": {"en": "Live Music Night — Fléda Club", "de": "Live-Musik-Abend — Fléda Club", "ru": "Живая музыка — клуб Fléda", "uk": "Жива музика — клуб Fléda", "es": "Noche de música en vivo — Club Fléda"},
        "bodies": {"en": "Catch live indie and alternative bands at Brno's iconic Fléda Club. Two stages, great sound, and a packed dance floor. One of the best live music venues in the Czech Republic — a must for music lovers visiting Brno.", "de": "Erlebe Live-Indie- und Alternative-Bands im ikonischen Fléda Club Brno. Zwei Bühnen, toller Sound und volle Tanzfläche. Eines der besten Live-Musik-Venues in Tschechien — ein Muss für Musikliebhaber in Brno.", "ru": "Послушайте живые инди и альтернативные группы в знаменитом клубе Fléda Брно. Две сцены, отличный звук и полный танцпол. Одна из лучших площадок живой музыки в Чехии — обязательно для любителей музыки.", "uk": "Послухайте живі інді та альтернативні гурти в знаменитому клубі Fléda Брно. Дві сцени, чудовий звук та повний танцпол. Одна з найкращих площадок живої музики в Чехії — обов'язково для любителів музики.", "es": "Disfruta de bandas indie y alternativas en vivo en el icónico Club Fléda de Brno. Dos escenarios, gran sonido y pista de baile llena. Uno de los mejores locales de música en vivo de Chequia — imprescindible para amantes de la música."},
    },
    {
        "iso_local": "2026-06-04 18:00", "duration_minutes": 150, "category": "networking",
        "address": "Impact Hub Brno, Cyrilská 7, Brno", "venue_short": "Impact Hub",
        "lat": 49.1900, "lng": 16.6150, "is_free": True, "price": None, "currency": "CZK",
        "languages": ["en"],
        "source_url": "https://www.hubbrno.cz", "source_label": "hubbrno.cz",
        "photos": ["https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80"],
        "titles": {"en": "Startup Meetup — Brno Tech Community", "de": "Startup-Treffen — Brno Tech Community", "ru": "Стартап-митап — техническое сообщество Брно", "uk": "Стартап-мітап — технічна спільнота Брно", "es": "Meetup de startups — Comunidad tech de Brno"},
        "bodies": {"en": "Connect with Brno's growing tech and startup scene at Impact Hub. Lightning talks from local founders, networking over drinks, and collaboration opportunities. Brno is the Czech Republic's second tech hub — come meet the builders.", "de": "Verbinde dich mit Brünns wachsender Tech- und Startup-Szene im Impact Hub. Lightning Talks von lokalen Gründern, Networking bei Drinks und Kooperationsmöglichkeiten. Brno ist Tschechiens zweiter Tech-Hub.", "ru": "Подключитесь к растущей техно- и стартап-сцене Брно в Impact Hub. Блиц-доклады местных основателей, нетворкинг за напитками и возможности сотрудничества. Брно — второй технологический хаб Чехии.", "uk": "Підключіться до зростаючої техно- та стартап-сцени Брно в Impact Hub. Бліц-доповіді місцевих засновників, нетворкінг за напоями та можливості співпраці. Брно — другий технологічний хаб Чехії.", "es": "Conéctate con la creciente escena tech y startup de Brno en Impact Hub. Charlas relámpago de fundadores locales, networking con bebidas y oportunidades de colaboración. Brno es el segundo hub tech de Chequia."},
    },
    {
        "iso_local": "2026-06-06 09:00", "duration_minutes": 120, "category": "guided-tours",
        "address": "Villa Tugendhat, Černopolní 45, Brno", "venue_short": "Villa Tugendhat",
        "lat": 49.2070, "lng": 16.6160, "is_free": False, "price": 500, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.tugendhat.eu", "source_label": "tugendhat.eu",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {"en": "Villa Tugendhat — UNESCO Modernist Masterpiece", "de": "Villa Tugendhat — UNESCO-Meisterwerk der Moderne", "ru": "Вилла Тугендхат — шедевр модернизма ЮНЕСКО", "uk": "Вілла Тугендхат — шедевр модернізму ЮНЕСКО", "es": "Villa Tugendhat — Obra maestra modernista UNESCO"},
        "bodies": {"en": "Tour the UNESCO-listed Villa Tugendhat — Mies van der Rohe's 1930 functionalist masterpiece. See the iconic onyx wall, chrome columns, and revolutionary open floor plan. One of the most important buildings of 20th-century architecture. Book early — slots fill fast!", "de": "Besichtige die UNESCO-gelistete Villa Tugendhat — Mies van der Rohes funktionalistisches Meisterwerk von 1930. Sieh die ikonische Onyxwand, Chromsäulen und den revolutionären offenen Grundriss. Eines der wichtigsten Gebäude der Architektur des 20. Jahrhunderts.", "ru": "Экскурсия по вилле Тугендхат из списка ЮНЕСКО — функционалистский шедевр Мис ван дер Роэ 1930 года. Увидьте знаменитую ониксовую стену, хромированные колонны и революционную открытую планировку. Одно из важнейших зданий архитектуры XX века.", "uk": "Екскурсія по віллі Тугендхат зі списку ЮНЕСКО — функціоналістський шедевр Міс ван дер Рое 1930 року. Побачте знамениту оніксову стіну, хромовані колони та революційне відкрите планування. Одна з найважливіших будівель архітектури XX століття.", "es": "Visita la Villa Tugendhat, Patrimonio UNESCO — obra maestra funcionalista de Mies van der Rohe de 1930. Ve el icónico muro de ónix, columnas cromadas y planta abierta revolucionaria. Uno de los edificios más importantes de la arquitectura del siglo XX."},
    },
    {
        "iso_local": "2026-06-08 10:00", "duration_minutes": 180, "category": "other",
        "address": "Mendel Museum, Mendlovo nám. 1a, Brno", "venue_short": "Mendel Museum",
        "lat": 49.1910, "lng": 16.5930, "is_free": False, "price": 150, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.mendelmuseum.muni.cz", "source_label": "mendelmuseum.muni.cz",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {"en": "Mendel Museum — Father of Genetics Walk", "de": "Mendel Museum — Vater der Genetik Spaziergang", "ru": "Музей Менделя — прогулка по следам отца генетики", "uk": "Музей Менделя — прогулянка слідами батька генетики", "es": "Museo Mendel — Paseo del padre de la genética"},
        "bodies": {"en": "Visit the monastery garden where Gregor Mendel discovered the laws of heredity. See his original greenhouse, experimental plots, and the museum exhibition. A guided walk through the history of genetics — from pea plants to modern DNA science.", "de": "Besuche den Klostergarten, in dem Gregor Mendel die Vererbungsgesetze entdeckte. Sieh sein originales Gewächshaus, Versuchsfelder und die Museumsausstellung. Ein geführter Spaziergang durch die Geschichte der Genetik.", "ru": "Посетите монастырский сад, где Грегор Мендель открыл законы наследственности. Увидьте его оригинальную теплицу, экспериментальные участки и музейную экспозицию. Прогулка по истории генетики — от гороха до современной науки о ДНК.", "uk": "Відвідайте монастирський сад, де Грегор Мендель відкрив закони спадковості. Побачте його оригінальну теплицю, експериментальні ділянки та музейну експозицію. Прогулянка по історії генетики — від гороху до сучасної науки про ДНК.", "es": "Visita el jardín del monasterio donde Gregor Mendel descubrió las leyes de la herencia. Ve su invernadero original, parcelas experimentales y la exposición del museo. Un paseo guiado por la historia de la genética — desde guisantes hasta la ciencia del ADN moderna."},
    },
    {
        "iso_local": "2026-06-10 18:30", "duration_minutes": 120, "category": "dancing",
        "address": "Stará Pekárna, Štefánikova 8, Brno", "venue_short": "Stará Pekárna",
        "lat": 49.2000, "lng": 16.5950, "is_free": False, "price": 200, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-salsa", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80"],
        "titles": {"en": "Salsa & Bachata Night — Stará Pekárna", "de": "Salsa & Bachata Abend — Stará Pekárna", "ru": "Сальса и бачата — Stará Pekárna", "uk": "Сальса та бачата — Stará Pekárna", "es": "Noche de salsa y bachata — Stará Pekárna"},
        "bodies": {"en": "Dance salsa and bachata at Brno's beloved Stará Pekárna cultural center. Free beginner lesson at 6:30pm, open social dancing from 7:30pm. No partner needed — friendly rotation system. Latin DJs and a warm, welcoming crowd.", "de": "Tanze Salsa und Bachata im beliebten Kulturzentrum Stará Pekárna. Kostenlose Anfängerlektion um 18:30, offenes Social Dancing ab 19:30. Kein Partner nötig — freundliches Rotationssystem. Latin-DJs und eine warme, einladende Menge.", "ru": "Танцуйте сальсу и бачату в любимом культурном центре Брно Stará Pekárna. Бесплатный урок для начинающих в 18:30, свободные танцы с 19:30. Партнёр не нужен — дружеская система ротации. Латинские диджеи и тёплая публика.", "uk": "Танцюйте сальсу та бачату в улюбленому культурному центрі Брно Stará Pekárna. Безкоштовний урок для початківців о 18:30, вільні танці з 19:30. Партнер не потрібен — дружня система ротації. Латинські діджеї та тепла публіка.", "es": "Baila salsa y bachata en el querido centro cultural Stará Pekárna de Brno. Clase gratuita para principiantes a las 18:30, baile social abierto desde las 19:30. Sin pareja necesaria — sistema de rotación amigable. DJs latinos y público acogedor."},
    },
    {
        "iso_local": "2026-06-14 09:00", "duration_minutes": 240, "category": "other",
        "address": "Brno Exhibition Centre (BVV), Výstaviště 405/1, Brno", "venue_short": "BVV Brno",
        "lat": 49.1880, "lng": 16.5850, "is_free": False, "price": 300, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.bvv.cz", "source_label": "bvv.cz",
        "photos": ["https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80"],
        "titles": {"en": "Brno Flea Market — Vintage & Antiques", "de": "Brno Flohmarkt — Vintage & Antiquitäten", "ru": "Блошиный рынок Брно — винтаж и антиквариат", "uk": "Блошиний ринок Брно — вінтаж та антикваріат", "es": "Mercadillo de Brno — Vintage y antigüedades"},
        "bodies": {"en": "Browse hundreds of stalls at Brno's biggest flea market at the Exhibition Centre. Vintage clothing, vinyl records, antique furniture, retro electronics, and Czech glass. Arrive early for the best finds. Food trucks and coffee on site.", "de": "Stöbere durch Hunderte Stände auf Brünns größtem Flohmarkt im Messegelände. Vintage-Kleidung, Vinyl-Platten, antike Möbel, Retro-Elektronik und böhmisches Glas. Früh kommen für die besten Funde. Food Trucks und Kaffee vor Ort.", "ru": "Просмотрите сотни прилавков на крупнейшем блошином рынке Брно на выставочной площадке. Винтажная одежда, виниловые пластинки, антикварная мебель, ретро-электроника и чешское стекло. Приходите рано за лучшими находками.", "uk": "Перегляньте сотні прилавків на найбільшому блошиному ринку Брно на виставковій площадці. Вінтажний одяг, вінілові платівки, антикварні меблі, ретро-електроніка та чеське скло. Приходьте рано за найкращими знахідками.", "es": "Recorre cientos de puestos en el mercadillo más grande de Brno en el Centro de Exposiciones. Ropa vintage, vinilos, muebles antiguos, electrónica retro y cristal checo. Llega temprano para las mejores gangas. Food trucks y café en el lugar."},
    },
    {
        "iso_local": "2026-06-18 17:00", "duration_minutes": 120, "category": "craft-beer",
        "address": "Lucky Bastard Beerhouse, Dvořákova 1, Brno", "venue_short": "Lucky Bastard",
        "lat": 49.1951, "lng": 16.6068, "is_free": False, "price": 450, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.luckybastard.cz", "source_label": "luckybastard.cz",
        "photos": ["https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80"],
        "titles": {"en": "Craft Beer Masterclass — Lucky Bastard", "de": "Craft-Bier-Masterclass — Lucky Bastard", "ru": "Мастер-класс по крафтовому пиву — Lucky Bastard", "uk": "Майстер-клас з крафтового пива — Lucky Bastard", "es": "Masterclass de cerveza artesanal — Lucky Bastard"},
        "bodies": {"en": "Deep dive into craft beer with Lucky Bastard's head brewer. Learn about hop varieties, brewing techniques, and flavor profiles. Taste 6 beers including limited editions not available to the public. Includes snack pairings and a souvenir glass.", "de": "Tauche tief in Craft-Bier ein mit Lucky Bastards Chefbrauer. Erfahre mehr über Hopfensorten, Brautechniken und Geschmacksprofile. Probiere 6 Biere inklusive limitierter Editionen. Inklusive Snack-Pairings und Souvenir-Glas.", "ru": "Погрузитесь в крафтовое пиво с главным пивоваром Lucky Bastard. Узнайте о сортах хмеля, техниках пивоварения и вкусовых профилях. Дегустация 6 сортов включая лимитированные. Включает закуски и сувенирный бокал.", "uk": "Пориньте у крафтове пиво з головним пивоваром Lucky Bastard. Дізнайтесь про сорти хмелю, техніки пивоваріння та смакові профілі. Дегустація 6 сортів включаючи лімітовані. Включає закуски та сувенірний келих.", "es": "Sumérgete en la cerveza artesanal con el cervecero jefe de Lucky Bastard. Aprende sobre variedades de lúpulo, técnicas de elaboración y perfiles de sabor. Degusta 6 cervezas incluyendo ediciones limitadas. Incluye maridajes y vaso de recuerdo."},
    },
    {
        "iso_local": "2026-06-20 07:00", "duration_minutes": 90, "category": "yoga",
        "address": "Denis Gardens (Denisovy sady), Brno", "venue_short": "Denis Gardens",
        "lat": 49.1930, "lng": 16.6020, "is_free": True, "price": None, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.meetup.com/brno-yoga-outdoor", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80"],
        "titles": {"en": "Outdoor Yoga — Denis Gardens with Castle Views", "de": "Outdoor-Yoga — Denisovy sady mit Burgblick", "ru": "Йога на свежем воздухе — сады Дениса с видом на замок", "uk": "Йога на свіжому повітрі — сади Деніса з видом на замок", "es": "Yoga al aire libre — Jardines Denis con vistas al castillo"},
        "bodies": {"en": "Practice yoga in the beautiful Denis Gardens with views of Špilberk Castle. Morning hatha flow suitable for all levels on the grass terrace. Bring your own mat and water. Free and community-led — donations welcome.", "de": "Praktiziere Yoga in den schönen Denisovy sady mit Blick auf die Burg Špilberk. Morgen-Hatha-Flow für alle Level auf der Grasterrasse. Eigene Matte und Wasser mitbringen. Kostenlos und community-geführt — Spenden willkommen.", "ru": "Практикуйте йогу в красивых садах Дениса с видом на замок Шпильберк. Утренний хатха-флоу для всех уровней на травяной террасе. Принесите свой коврик и воду. Бесплатно, ведёт сообщество — пожертвования приветствуются.", "uk": "Практикуйте йогу в красивих садах Деніса з видом на замок Шпільберк. Ранковий хатха-флоу для всіх рівнів на трав'яній терасі. Принесіть свій килимок та воду. Безкоштовно, веде спільнота — пожертви вітаються.", "es": "Practica yoga en los hermosos Jardines Denis con vistas al Castillo Špilberk. Flujo de hatha matutino para todos los niveles en la terraza de césped. Trae tu esterilla y agua. Gratis y comunitario — donaciones bienvenidas."},
    },
    {
        "iso_local": "2026-06-22 15:00", "duration_minutes": 180, "category": "museums",
        "address": "Brno Technical Museum, Purkyňova 105, Brno", "venue_short": "Technical Museum",
        "lat": 49.2270, "lng": 16.5750, "is_free": False, "price": 200, "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.technicalmuseum.cz", "source_label": "technicalmuseum.cz",
        "photos": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80"],
        "titles": {"en": "Brno Technical Museum — Interactive Science Day", "de": "Brünner Technisches Museum — Interaktiver Wissenschaftstag", "ru": "Технический музей Брно — интерактивный день науки", "uk": "Технічний музей Брно — інтерактивний день науки", "es": "Museo Técnico de Brno — Día interactivo de ciencia"},
        "bodies": {"en": "Explore Brno's Technical Museum with hands-on exhibits — vintage cars, aircraft, printing presses, and a working blacksmith forge. Special interactive science demonstrations every Sunday. Great for curious minds of all ages.", "de": "Erkunde Brünns Technisches Museum mit interaktiven Exponaten — Oldtimer, Flugzeuge, Druckpressen und eine funktionierende Schmiede. Spezielle interaktive Wissenschaftsvorführungen jeden Sonntag. Toll für neugierige Köpfe jeden Alters.", "ru": "Исследуйте Технический музей Брно с интерактивными экспонатами — ретро-автомобили, самолёты, печатные станки и действующая кузница. Специальные интерактивные научные демонстрации каждое воскресенье. Для любознательных всех возрастов.", "uk": "Дослідіть Технічний музей Брно з інтерактивними експонатами — ретро-автомобілі, літаки, друкарські верстати та діюча кузня. Спеціальні інтерактивні наукові демонстрації щонеділі. Для допитливих усіх віків.", "es": "Explora el Museo Técnico de Brno con exhibiciones interactivas — coches vintage, aviones, imprentas y una fragua en funcionamiento. Demostraciones científicas interactivas especiales cada domingo. Genial para mentes curiosas de todas las edades."},
    },
    {
        "iso_local": "2026-06-25 19:00", "duration_minutes": 150, "category": "networking",
        "address": "Bar, který neexistuje, Dvořákova 1, Brno", "venue_short": "Bar který neexistuje",
        "lat": 49.1951, "lng": 16.6068, "is_free": True, "price": None, "currency": "CZK",
        "languages": ["en", "cs"],
        "source_url": "https://www.meetup.com/brno-internationals", "source_label": "meetup.com",
        "photos": ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80"],
        "titles": {"en": "International Drinks — Bar který neexistuje", "de": "Internationaler Stammtisch — Bar který neexistuje", "ru": "Международные напитки — Bar který neexistuje", "uk": "Міжнародні напої — Bar který neexistuje", "es": "Drinks internacionales — Bar který neexistuje"},
        "bodies": {"en": "Weekly casual meetup for internationals and locals at Brno's quirkiest speakeasy — 'The Bar That Doesn't Exist'. Find the hidden entrance, grab a craft cocktail, and meet new people in a relaxed atmosphere. No registration, just show up!", "de": "Wöchentliches lockeres Treffen für Internationale und Einheimische in Brünns skurrilster Speakeasy — 'Die Bar, die nicht existiert'. Finde den versteckten Eingang, schnapp dir einen Craft-Cocktail und triff neue Leute in entspannter Atmosphäre.", "ru": "Еженедельная неформальная встреча для иностранцев и местных в самом необычном спикизи Брно — «Бар, который не существует». Найдите скрытый вход, возьмите крафтовый коктейль и познакомьтесь с новыми людьми в расслабленной атмосфере.", "uk": "Щотижнева неформальна зустріч для іноземців та місцевих у найнезвичнішому спікізі Брно — «Бар, який не існує». Знайдіть прихований вхід, візьміть крафтовий коктейль та познайомтесь з новими людьми в розслабленій атмосфері.", "es": "Encuentro semanal casual para internacionales y locales en el speakeasy más peculiar de Brno — 'El Bar Que No Existe'. Encuentra la entrada oculta, toma un cóctel artesanal y conoce gente nueva en un ambiente relajado. ¡Sin registro!"},
    },
]

def local_to_utc(iso_local):
    from datetime import datetime, timedelta
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    return (dt - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")

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
            "city": "Brno", "city_id": CITY_ID, "country": "CZ",
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
