#!/usr/bin/env python3
"""Seed 7 REAL verified Montevideo concerts (May-June 2026) from Songkick."""
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

CITY_ID = 'e91b6d9d-8855-4161-873b-759b9658e92a'
SYSTEM_ORGANIZER_ID = 'acbb238e-f24f-4534-b92a-fa4bcfc7e07e'
MUSIC_CAT = '87186d0a-5631-4b30-863f-fabd5d8f74e4'

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
    return (dt - timedelta(hours=-3)).strftime('%Y-%m-%dT%H:%M:%SZ')  # UYT = UTC-3

def human(iso_local):
    date_part, time_part = iso_local.split(' ')
    y, mo, d = (int(x) for x in date_part.split('-'))
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return f'{d:02d} {months[mo-1]} {y}, {time_part}'

# Venue coordinates (real)
VENUES = {
    'Sala del Museo del Carnaval': {'lat': -34.9065, 'lng': -56.2100, 'addr': 'Rambla 25 de Agosto de 1825 218, Montevideo'},
    'Espacio Cultural El Chamuyo': {'lat': -34.9080, 'lng': -56.1900, 'addr': 'Espacio Cultural El Chamuyo, Montevideo'},
    'Auditorio Nacional del SODRE': {'lat': -34.9060, 'lng': -56.1990, 'addr': 'Andes 1451, Montevideo'},
    'Antel Arena': {'lat': -34.8910, 'lng': -56.1530, 'addr': 'Av. Dra. América Ricaldoni s/n, Montevideo'},
}

EVENTS = [
    {
        'iso': '2026-05-23 21:00', 'dur': 150, 'venue_key': 'Sala del Museo del Carnaval',
        'source_url': 'https://detour.songkick.com/concerts/43062912-guasones-at-sala-del-museo-del-carnaval',
        'photo': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        'titles': {
            'en': 'Guasones \u2014 Live at Sala del Museo del Carnaval',
            'de': 'Guasones \u2014 Live in der Sala del Museo del Carnaval',
            'ru': 'Guasones \u2014 концерт в Sala del Museo del Carnaval',
            'uk': 'Guasones \u2014 концерт у Sala del Museo del Carnaval',
            'es': 'Guasones \u2014 En vivo en Sala del Museo del Carnaval',
        },
        'bodies': {
            'en': 'Argentine rock band Guasones performs live in Montevideo at the Sala del Museo del Carnaval. Known for their energetic shows blending rock nacional with indie influences.',
            'de': 'Die argentinische Rockband Guasones tritt live in Montevideo in der Sala del Museo del Carnaval auf. Bekannt f\u00fcr ihre energiegeladenen Shows, die Rock Nacional mit Indie-Einfl\u00fcssen verbinden.',
            'ru': 'Аргентинская рок-группа Guasones выступает вживую в Монтевидео в Sala del Museo del Carnaval. Известны энергичными шоу, сочетающими рок-насьональ с инди-влияниями.',
            'uk': 'Аргентинський рок-гурт Guasones виступає наживо в Монтевiдео в Sala del Museo del Carnaval. Вiдомi енергiйними шоу, що поєднують рок-насьональ з iндi-впливами.',
            'es': 'La banda de rock argentina Guasones se presenta en vivo en Montevideo en la Sala del Museo del Carnaval. Conocidos por sus shows energ\u00e9ticos que mezclan rock nacional con influencias indie.',
        },
    },
    {
        'iso': '2026-05-23 22:00', 'dur': 120, 'venue_key': 'Espacio Cultural El Chamuyo',
        'source_url': 'https://detour.songkick.com/concerts/43211118-excelentes-nadadores-at-espacio-cultural-el-chamuyo',
        'photo': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        'titles': {
            'en': 'Excelentes Nadadores \u2014 Cosas Raras Pasar\u00e1n',
            'de': 'Excelentes Nadadores \u2014 Cosas Raras Pasar\u00e1n',
            'ru': 'Excelentes Nadadores \u2014 Cosas Raras Pasar\u00e1n',
            'uk': 'Excelentes Nadadores \u2014 Cosas Raras Pasar\u00e1n',
            'es': 'Excelentes Nadadores \u2014 Cosas Raras Pasar\u00e1n',
        },
        'bodies': {
            'en': 'Uruguayan indie band Excelentes Nadadores presents their show "Cosas Raras Pasar\u00e1n" at Espacio Cultural El Chamuyo in Montevideo. An intimate venue for local alternative music.',
            'de': 'Die uruguayische Indie-Band Excelentes Nadadores pr\u00e4sentiert ihre Show "Cosas Raras Pasar\u00e1n" im Espacio Cultural El Chamuyo in Montevideo. Ein intimes Venue f\u00fcr lokale alternative Musik.',
            'ru': 'Уругвайская инди-группа Excelentes Nadadores представляет шоу "Cosas Raras Pasar\u00e1n" в Espacio Cultural El Chamuyo в Монтевидео. Камерная площадка для местной альтернативной музыки.',
            'uk': 'Уругвайський iндi-гурт Excelentes Nadadores представляє шоу "Cosas Raras Pasar\u00e1n" в Espacio Cultural El Chamuyo в Монтевiдео. Камерна площадка для мiсцевої альтернативної музики.',
            'es': 'La banda indie uruguaya Excelentes Nadadores presenta su show "Cosas Raras Pasar\u00e1n" en el Espacio Cultural El Chamuyo en Montevideo. Un lugar \u00edntimo para m\u00fasica alternativa local.',
        },
    },
    {
        'iso': '2026-05-26 21:00', 'dur': 120, 'venue_key': 'Auditorio Nacional del SODRE',
        'source_url': 'https://detour.songkick.com/concerts/42843816-natalia-lafourcade-at-auditorio-nacional-del-sodre-dra-adela-reta',
        'photo': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        'titles': {
            'en': 'Natalia Lafourcade \u2014 Live at Auditorio del SODRE',
            'de': 'Natalia Lafourcade \u2014 Live im Auditorio del SODRE',
            'ru': 'Наталия Лафуркаде \u2014 концерт в Auditorio del SODRE',
            'uk': 'Наталiя Лафуркаде \u2014 концерт в Auditorio del SODRE',
            'es': 'Natalia Lafourcade \u2014 En vivo en el Auditorio del SODRE',
        },
        'bodies': {
            'en': 'Grammy-winning Mexican singer-songwriter Natalia Lafourcade performs at the prestigious Auditorio Nacional del SODRE in Montevideo. Known for her blend of Latin folk, pop, and traditional Mexican music.',
            'de': 'Die Grammy-preisgekr\u00f6nte mexikanische Singer-Songwriterin Natalia Lafourcade tritt im prestigetr\u00e4chtigen Auditorio Nacional del SODRE in Montevideo auf. Bekannt f\u00fcr ihre Mischung aus Latin Folk, Pop und traditioneller mexikanischer Musik.',
            'ru': 'Обладательница Грэмми, мексиканская певица и автор песен Наталия Лафуркаде выступает в престижном Auditorio Nacional del SODRE в Монтевидео. Известна сочетанием латинского фолка, попа и традиционной мексиканской музыки.',
            'uk': 'Володарка Гремi, мексиканська спiвачка та авторка пiсень Наталiя Лафуркаде виступає в престижному Auditorio Nacional del SODRE в Монтевiдео. Вiдома поєднанням латинського фолку, попу та традицiйної мексиканської музики.',
            'es': 'La cantautora mexicana ganadora del Grammy Natalia Lafourcade se presenta en el prestigioso Auditorio Nacional del SODRE en Montevideo. Conocida por su mezcla de folk latino, pop y m\u00fasica tradicional mexicana.',
        },
    },
    {
        'iso': '2026-06-06 21:00', 'dur': 150, 'venue_key': 'Antel Arena',
        'source_url': 'https://detour.songkick.com/concerts/42839275-jorge-drexler-at-antel-arena',
        'photo': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        'titles': {
            'en': 'Jorge Drexler \u2014 Live at Antel Arena',
            'de': 'Jorge Drexler \u2014 Live in der Antel Arena',
            'ru': 'Хорхе Дрекслер \u2014 концерт в Antel Arena',
            'uk': 'Хорхе Дрекслер \u2014 концерт в Antel Arena',
            'es': 'Jorge Drexler \u2014 En vivo en Antel Arena',
        },
        'bodies': {
            'en': 'Oscar and Grammy-winning Uruguayan singer-songwriter Jorge Drexler returns home for a concert at Antel Arena. One of Latin America\'s most celebrated artists, known for poetic lyrics and innovative sound.',
            'de': 'Der Oscar- und Grammy-preisgekr\u00f6nte uruguayische Singer-Songwriter Jorge Drexler kehrt f\u00fcr ein Konzert in der Antel Arena nach Hause zur\u00fcck. Einer der gefeiertsten K\u00fcnstler Lateinamerikas.',
            'ru': 'Обладатель Оскара и Грэмми, уругвайский певец и автор песен Хорхе Дрекслер возвращается домой на концерт в Antel Arena. Один из самых известных артистов Латинской Америки, известный поэтичными текстами и инновационным звучанием.',
            'uk': 'Володар Оскара та Гремi, уругвайський спiвак та автор пiсень Хорхе Дрекслер повертається додому на концерт в Antel Arena. Один з найвiдомiших артистiв Латинської Америки.',
            'es': 'El cantautor uruguayo ganador del Oscar y Grammy Jorge Drexler vuelve a casa para un concierto en Antel Arena. Uno de los artistas m\u00e1s celebrados de Am\u00e9rica Latina, conocido por sus letras po\u00e9ticas y sonido innovador.',
        },
    },
    {
        'iso': '2026-06-07 21:00', 'dur': 150, 'venue_key': 'Antel Arena',
        'source_url': 'https://detour.songkick.com/concerts/43108810-jorge-drexler-at-antel-arena',
        'photo': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        'titles': {
            'en': 'Jorge Drexler \u2014 Live at Antel Arena (2nd show)',
            'de': 'Jorge Drexler \u2014 Live in der Antel Arena (2. Show)',
            'ru': 'Хорхе Дрекслер \u2014 концерт в Antel Arena (2-й день)',
            'uk': 'Хорхе Дрекслер \u2014 концерт в Antel Arena (2-й день)',
            'es': 'Jorge Drexler \u2014 En vivo en Antel Arena (2da funci\u00f3n)',
        },
        'bodies': {
            'en': 'Second night of Jorge Drexler at Antel Arena. Due to high demand, the Oscar-winning Uruguayan artist added a second show in his hometown Montevideo.',
            'de': 'Zweiter Abend von Jorge Drexler in der Antel Arena. Aufgrund der hohen Nachfrage hat der Oscar-preisgekr\u00f6nte uruguayische K\u00fcnstler eine zweite Show in seiner Heimatstadt Montevideo hinzugef\u00fcgt.',
            'ru': 'Второй вечер Хорхе Дрекслера в Antel Arena. Из-за высокого спроса обладатель Оскара добавил второй концерт в родном Монтевидео.',
            'uk': 'Другий вечiр Хорхе Дрекслера в Antel Arena. Через високий попит володар Оскара додав другий концерт у рiдному Монтевiдео.',
            'es': 'Segunda noche de Jorge Drexler en Antel Arena. Debido a la alta demanda, el artista uruguayo ganador del Oscar agreg\u00f3 una segunda funci\u00f3n en su Montevideo natal.',
        },
    },
    {
        'iso': '2026-06-25 21:00', 'dur': 120, 'venue_key': 'Sala del Museo del Carnaval',
        'source_url': 'https://detour.songkick.com/concerts/43113223-usted-senalemelo-at-sala-del-museo-del-carnaval',
        'photo': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        'titles': {
            'en': 'Usted Se\u00f1alemelo \u2014 Live at Sala del Museo del Carnaval',
            'de': 'Usted Se\u00f1alemelo \u2014 Live in der Sala del Museo del Carnaval',
            'ru': 'Usted Se\u00f1alemelo \u2014 концерт в Sala del Museo del Carnaval',
            'uk': 'Usted Se\u00f1alemelo \u2014 концерт у Sala del Museo del Carnaval',
            'es': 'Usted Se\u00f1alemelo \u2014 En vivo en Sala del Museo del Carnaval',
        },
        'bodies': {
            'en': 'Argentine indie-pop band Usted Se\u00f1alemelo brings their energetic live show to Montevideo\'s Sala del Museo del Carnaval. Known for catchy melodies and danceable rhythms that blend pop, funk, and Latin grooves.',
            'de': 'Die argentinische Indie-Pop-Band Usted Se\u00f1alemelo bringt ihre energiegeladene Live-Show in die Sala del Museo del Carnaval in Montevideo. Bekannt f\u00fcr eingängige Melodien und tanzbare Rhythmen.',
            'ru': 'Аргентинская инди-поп группа Usted Se\u00f1alemelo привозит своё энергичное живое шоу в Sala del Museo del Carnaval в Монтевидео. Известны запоминающимися мелодиями и танцевальными ритмами, сочетающими поп, фанк и латинские грувы.',
            'uk': 'Аргентинський iндi-поп гурт Usted Se\u00f1alemelo привозить своє енергiйне живе шоу до Sala del Museo del Carnaval в Монтевiдео. Вiдомi запам\'ятовуваними мелодiями та танцювальними ритмами.',
            'es': 'La banda de indie-pop argentina Usted Se\u00f1alemelo trae su energ\u00e9tico show en vivo a la Sala del Museo del Carnaval de Montevideo. Conocidos por melod\u00edas pegadizas y ritmos bailables que mezclan pop, funk y grooves latinos.',
        },
    },
    {
        'iso': '2026-06-27 21:00', 'dur': 120, 'venue_key': 'Sala del Museo del Carnaval',
        'source_url': 'https://detour.songkick.com/concerts/43099110-gilsons-at-sala-del-museo-del-carnaval',
        'photo': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        'titles': {
            'en': 'Gilsons \u2014 Live at Sala del Museo del Carnaval',
            'de': 'Gilsons \u2014 Live in der Sala del Museo del Carnaval',
            'ru': 'Gilsons \u2014 концерт в Sala del Museo del Carnaval',
            'uk': 'Gilsons \u2014 концерт у Sala del Museo del Carnaval',
            'es': 'Gilsons \u2014 En vivo en Sala del Museo del Carnaval',
        },
        'bodies': {
            'en': 'Brazilian duo Gilsons (sons of Gilberto Gil) perform at Sala del Museo del Carnaval in Montevideo. Their music blends MPB, bossa nova, and contemporary Brazilian pop with a fresh, youthful energy.',
            'de': 'Das brasilianische Duo Gilsons (S\u00f6hne von Gilberto Gil) tritt in der Sala del Museo del Carnaval in Montevideo auf. Ihre Musik verbindet MPB, Bossa Nova und zeitgen\u00f6ssischen brasilianischen Pop mit frischer, jugendlicher Energie.',
            'ru': 'Бразильский дуэт Gilsons (сыновья Жилберту Жила) выступает в Sala del Museo del Carnaval в Монтевидео. Их музыка сочетает MPB, босса-нову и современный бразильский поп со свежей молодёжной энергией.',
            'uk': 'Бразильський дует Gilsons (сини Жiлберту Жiла) виступає в Sala del Museo del Carnaval в Монтевiдео. Їхня музика поєднує MPB, боса-нову та сучасний бразильський поп зi свiжою молодiжною енергiєю.',
            'es': 'El d\u00fao brasile\u00f1o Gilsons (hijos de Gilberto Gil) se presenta en la Sala del Museo del Carnaval en Montevideo. Su m\u00fasica mezcla MPB, bossa nova y pop brasile\u00f1o contempor\u00e1neo con una energ\u00eda fresca y juvenil.',
        },
    },
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

    venue_info = VENUES[ev['venue_key']]
    starts_at = to_utc(ev['iso'])
    when_human = human(ev['iso'])
    desc_doc = build_desc(ev['titles'], ev['bodies'], when_human, ev['venue_key'], ev['source_url'], 'songkick.com')

    row = {
        'title': title_en, 'description': ev['bodies']['en'], 'description_json': desc_doc,
        'title_translations': {k: v for k, v in ev['titles'].items() if k != 'en'},
        'description_translations': {k: v for k, v in ev['bodies'].items() if k != 'en'},
        'starts_at': starts_at, 'duration_minutes': ev['dur'],
        'city': 'Montevideo', 'city_id': CITY_ID, 'country': 'UY',
        'address': venue_info['addr'], 'lat': venue_info['lat'], 'lng': venue_info['lng'],
        'is_online': False, 'is_free': False, 'price': None, 'currency': 'UYU',
        'max_attendees': None, 'photos': [ev['photo']],
        'organizer_id': SYSTEM_ORGANIZER_ID, 'category_id': MUSIC_CAT,
        'languages': ['es'], 'is_private': False, 'is_system': True,
        'status': 'published', 'source_url': ev['source_url'], 'safety_tags': [], 'allow_crews': True,
    }
    data = json.dumps(row, ensure_ascii=False).encode()
    req = urllib.request.Request(f'{url}/rest/v1/events', data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            eid = result[0]['id'] if isinstance(result, list) and result else '?'
            print(f'[+] {title_en} -> {eid}'); inserted += 1
    except urllib.error.HTTPError as e:
        print(f'[!] {title_en}: {e.code} {e.read().decode()[:100]}')

print(f'\nDone: inserted={inserted}')
