#!/usr/bin/env python3
"""Seed 10 Belgrade system events for 23 May - 30 June 2026."""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

ssl._create_default_https_context = ssl._create_unverified_context

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env.local"

if ENV_PATH.exists():
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

CITY_ID = "e1d3ce16-9094-4ac1-a8fa-7c57cf0fe6ca"
SYSTEM_ORGANIZER_ID = "acbb238e-f24f-4534-b92a-fa4bcfc7e07e"

CAT = {
    "music": "87186d0a-5631-4b30-863f-fabd5d8f74e4",
    "dancing": "a265eff9-ce91-417f-8780-493d024a9e85",
    "museums": "d9b20fbf-7a7e-466b-acf5-1c379e6b94d6",
    "networking": "71835799-4ffd-46b1-b6e5-f7fd9ebc11b6",
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

LANG_ORDER = ["en", "ru", "uk", "cs", "de", "es"]
LANG_LABEL = {
    "en": "English",
    "ru": "Русский",
    "uk": "Українська",
    "cs": "Čeština",
    "de": "Deutsch",
    "es": "Español",
}


def t_text(text: str, marks=None):
    node = {"type": "text", "text": text}
    if marks:
        node["marks"] = marks
    return node


def t_link(label: str, href: str):
    return t_text(label, [{"type": "link", "attrs": {"href": href}}])


def t_h2(text: str):
    return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(text)]}


def t_h3(text: str):
    return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(text)]}


def t_para(*nodes):
    return {"type": "paragraph", "content": list(nodes)}


def build_description(titles, bodies, when_label, venue, source_url, source_label):
    blocks = []
    for lang in LANG_ORDER:
        blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
        blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}


def local_to_utc(iso_local: str):
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    return (dt - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def human_date(iso_local: str):
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    return dt.strftime("%d %b %Y, %H:%M")


EVENTS = [
    {
        "iso_local": "2026-05-29 19:00",
        "duration_minutes": 180,
        "category": "other",
        "address": "Belgrade city centre, Belgrade",
        "venue": "Belgrade city centre",
        "lat": 44.8171,
        "lng": 20.4592,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["sr", "en"],
        "source_url": "https://belgrade-beat.com/events/festival-sola",
        "source_label": "belgrade-beat.com",
        "photo": "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=1200&q=80",
        "titles": {
            "en": "Festival SOLA — Contemporary Dance Weekend",
            "ru": "Festival SOLA — уикенд современного танца",
            "uk": "Festival SOLA — вікенд сучасного танцю",
            "cs": "Festival SOLA — víkend současného tance",
            "de": "Festival SOLA — Wochenende für zeitgenössischen Tanz",
            "es": "Festival SOLA — fin de semana de danza contemporánea",
        },
        "bodies": {
            "en": "A contemporary dance festival bringing solo performances, experimental movement and international artists to Belgrade. A good pick for anyone who wants a cultured evening and an easy reason to meet people before or after the show.",
            "ru": "Фестиваль современного танца с сольными перформансами, экспериментальным движением и международными артистами в Белграде. Хороший выбор для культурного вечера и повода познакомиться до или после показа.",
            "uk": "Фестиваль сучасного танцю з сольними перформансами, експериментальним рухом і міжнародними артистами в Белграді. Гарний вибір для культурного вечора та приводу познайомитися до чи після показу.",
            "cs": "Festival současného tance se sólovými performancemi, experimentálním pohybem a mezinárodními umělci v Bělehradě. Dobrá volba pro kulturní večer i setkání před nebo po představení.",
            "de": "Ein Festival für zeitgenössischen Tanz mit Solo-Performances, experimenteller Bewegung und internationalen Künstlern in Belgrad. Ideal für einen kulturellen Abend und ein Treffen vor oder nach der Show.",
            "es": "Festival de danza contemporánea con solos, movimiento experimental y artistas internacionales en Belgrado. Una buena opción para una noche cultural y para quedar con gente antes o después.",
        },
    },
    {
        "iso_local": "2026-05-29 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "OpenAir Corner, Luka Beograd, Belgrade",
        "venue": "OpenAir Corner",
        "lat": 44.8250,
        "lng": 20.4770,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["en"],
        "source_url": "https://new.gigstix.com/event/anthrax-beograd-29-maj-2026/",
        "source_label": "gigstix.com",
        "photo": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80",
        "titles": {
            "en": "Anthrax Live in Belgrade",
            "ru": "Anthrax в Белграде",
            "uk": "Anthrax у Белграді",
            "cs": "Anthrax živě v Bělehradě",
            "de": "Anthrax live in Belgrad",
            "es": "Anthrax en vivo en Belgrado",
        },
        "bodies": {
            "en": "Thrash metal legends Anthrax bring a loud open-air night to Belgrade. Expect heavy riffs, a high-energy crowd and a perfect event for gathering a rock or metal crew.",
            "ru": "Легенды трэш-метала Anthrax привезут в Белград мощный open-air вечер. Ждите тяжёлые риффы, энергичную публику и отличный повод собрать rock/metal crew.",
            "uk": "Легенди треш-металу Anthrax привезуть до Белграда гучний open-air вечір. Очікуйте важкі рифи, енергійну публіку й чудовий привід зібрати rock/metal crew.",
            "cs": "Legendy thrash metalu Anthrax přivezou do Bělehradu hlasitý open-air večer. Čekejte těžké riffy, energické publikum a ideální akci pro rockovou partu.",
            "de": "Thrash-Metal-Legenden Anthrax bringen einen lauten Open-Air-Abend nach Belgrad. Schwere Riffs, viel Energie und ein perfekter Anlass für eine Rock- oder Metal-Crew.",
            "es": "Las leyendas del thrash metal Anthrax llegan a Belgrado con una noche open-air potente. Riffs pesados, mucha energía y una ocasión perfecta para reunir una crew rockera.",
        },
    },
    {
        "iso_local": "2026-05-30 21:00",
        "duration_minutes": 180,
        "category": "music",
        "address": "New Zappa Barka, Belgrade",
        "venue": "New Zappa Barka",
        "lat": 44.8210,
        "lng": 20.4490,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["sr"],
        "source_url": "https://belgrade-beat.com/events/belgrade-poselo",
        "source_label": "belgrade-beat.com",
        "photo": "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80",
        "titles": {
            "en": "Belgrade Poselo — Local Folk Party",
            "ru": "Belgrade Poselo — локальная folk-вечеринка",
            "uk": "Belgrade Poselo — локальна folk-вечірка",
            "cs": "Belgrade Poselo — místní folk party",
            "de": "Belgrade Poselo — lokale Folk-Party",
            "es": "Belgrade Poselo — fiesta folk local",
        },
        "bodies": {
            "en": "A lively local party format with Balkan folk energy, dancing and a river-club atmosphere. Great for newcomers who want to feel Belgrade from the inside rather than just visit another tourist spot.",
            "ru": "Живой локальный формат с балканской folk-энергией, танцами и атмосферой клуба на воде. Отлично для тех, кто хочет почувствовать Белград изнутри, а не просто сходить в туристическое место.",
            "uk": "Живий локальний формат із балканською folk-енергією, танцями та атмосферою клубу на воді. Добре для тих, хто хоче відчути Белград зсередини, а не просто піти в туристичне місце.",
            "cs": "Živý lokální formát s balkánskou folk energií, tancem a atmosférou klubu na vodě. Skvělé pro nově příchozí, kteří chtějí zažít Bělehrad zevnitř.",
            "de": "Ein lebendiges lokales Format mit Balkan-Folk-Energie, Tanz und River-Club-Atmosphäre. Gut für alle, die Belgrad von innen erleben möchten.",
            "es": "Una fiesta local con energía folk balcánica, baile y ambiente de club junto al río. Ideal para quienes quieren sentir Belgrado desde dentro.",
        },
    },
    {
        "iso_local": "2026-06-05 20:00",
        "duration_minutes": 90,
        "category": "music",
        "address": "Residence of Princess Ljubica, Kneza Sime Markovića 8, Belgrade",
        "venue": "Residence of Princess Ljubica",
        "lat": 44.8176,
        "lng": 20.4523,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["sr", "en"],
        "source_url": "https://belgrade-beat.com/events/night-of-musical-lanterns",
        "source_label": "belgrade-beat.com",
        "photo": "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=1200&q=80",
        "titles": {
            "en": "Night of Musical Lanterns — Piano Concert",
            "ru": "Night of Musical Lanterns — фортепианный концерт",
            "uk": "Night of Musical Lanterns — фортепіанний концерт",
            "cs": "Night of Musical Lanterns — klavírní koncert",
            "de": "Night of Musical Lanterns — Klavierkonzert",
            "es": "Night of Musical Lanterns — concierto de piano",
        },
        "bodies": {
            "en": "An atmospheric piano evening in one of Belgrade's historic residences. A calm, elegant event for a small crew, especially if you prefer culture and conversation over crowded nightlife.",
            "ru": "Атмосферный фортепианный вечер в одной из исторических резиденций Белграда. Спокойное и элегантное событие для небольшой компании, если вам ближе культура и разговоры, чем шумные вечеринки.",
            "uk": "Атмосферний фортепіанний вечір в одній з історичних резиденцій Белграда. Спокійна й елегантна подія для невеликої компанії, якщо вам ближчі культура та розмови, ніж гучні вечірки.",
            "cs": "Atmosférický klavírní večer v jedné z historických bělehradských rezidencí. Klidná a elegantní akce pro menší skupinu, pokud máte raději kulturu a rozhovor než hlučný noční život.",
            "de": "Ein atmosphärischer Klavierabend in einer historischen Residenz Belgrads. Ruhig, elegant und passend für eine kleine Crew, die Kultur und Gespräche mag.",
            "es": "Una noche de piano con mucha atmósfera en una residencia histórica de Belgrado. Tranquila y elegante, perfecta para una crew pequeña que prefiere cultura y conversación.",
        },
    },
    {
        "iso_local": "2026-06-06 23:00",
        "duration_minutes": 360,
        "category": "dancing",
        "address": "Kult, Čumićevo sokače 3, Belgrade",
        "venue": "Kult",
        "lat": 44.8132,
        "lng": 20.4626,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["en", "sr"],
        "source_url": "https://ra.co/events/2435806",
        "source_label": "ra.co",
        "photo": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
        "titles": {
            "en": "KULT pres. Guy J",
            "ru": "KULT представляет Guy J",
            "uk": "KULT представляє Guy J",
            "cs": "KULT uvádí Guy J",
            "de": "KULT präsentiert Guy J",
            "es": "KULT presenta a Guy J",
        },
        "bodies": {
            "en": "Progressive house night with Guy J at Kult, one of Belgrade's central club spots. A strong option for electronic music fans who want to meet people before heading into a late night.",
            "ru": "Ночь progressive house с Guy J в Kult, одном из центральных клубных мест Белграда. Хороший вариант для поклонников электронной музыки, которые хотят найти компанию перед поздней ночью.",
            "uk": "Ніч progressive house з Guy J у Kult, одному з центральних клубних місць Белграда. Гарний варіант для фанів електронної музики, які хочуть знайти компанію перед довгою ніччю.",
            "cs": "Progressive house noc s Guy J v Kultu, jednom z centrálních klubových míst Bělehradu. Silná volba pro fanoušky elektroniky, kteří chtějí potkat lidi před dlouhou nocí.",
            "de": "Progressive-House-Nacht mit Guy J im Kult, einem zentralen Clubspot in Belgrad. Eine gute Option für Fans elektronischer Musik, die vorher Leute treffen möchten.",
            "es": "Noche de progressive house con Guy J en Kult, uno de los clubs céntricos de Belgrado. Buena opción para fans de la electrónica que quieren quedar antes de salir.",
        },
    },
    {
        "iso_local": "2026-06-12 22:00",
        "duration_minutes": 420,
        "category": "dancing",
        "address": "New Tekstil, Dunavska 86, Belgrade",
        "venue": "New Tekstil",
        "lat": 44.8210,
        "lng": 20.4800,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["en", "sr"],
        "source_url": "https://ra.co/events/2404497",
        "source_label": "ra.co",
        "photo": "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=1200&q=80",
        "titles": {
            "en": "Holy Priest Open Air at New Tekstil",
            "ru": "Holy Priest Open Air в New Tekstil",
            "uk": "Holy Priest Open Air у New Tekstil",
            "cs": "Holy Priest Open Air v New Tekstil",
            "de": "Holy Priest Open Air im New Tekstil",
            "es": "Holy Priest Open Air en New Tekstil",
        },
        "bodies": {
            "en": "A hard techno open-air night at New Tekstil with Holy Priest. Best for night owls and electronic music fans looking for a high-intensity Belgrade weekend plan.",
            "ru": "Hard techno open-air в New Tekstil с Holy Priest. Подойдёт ночным людям и поклонникам электронной музыки, которые ищут интенсивный план на белградский уикенд.",
            "uk": "Hard techno open-air у New Tekstil з Holy Priest. Підійде нічним людям і фанам електронної музики, які шукають інтенсивний план на белградський вікенд.",
            "cs": "Hard techno open-air v New Tekstil s Holy Priest. Pro noční typy a fanoušky elektroniky, kteří hledají intenzivní víkendový plán v Bělehradě.",
            "de": "Hard-Techno-Open-Air im New Tekstil mit Holy Priest. Für Nachteulen und Fans elektronischer Musik, die ein intensives Belgrad-Wochenende suchen.",
            "es": "Open-air de hard techno en New Tekstil con Holy Priest. Para noctámbulos y fans de la electrónica que buscan un plan intenso de fin de semana en Belgrado.",
        },
    },
    {
        "iso_local": "2026-06-13 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "New Tekstil, Dunavska 86, Belgrade",
        "venue": "New Tekstil",
        "lat": 44.8210,
        "lng": 20.4800,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["ru"],
        "source_url": "https://howtobelgrade.com/events/noize-mc-new-tekst%E2%80%8B%E2%80%8Bil-13-jun-2026/",
        "source_label": "howtobelgrade.com",
        "photo": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80",
        "titles": {
            "en": "Noize MC at New Tekstil",
            "ru": "Noize MC в New Tekstil",
            "uk": "Noize MC у New Tekstil",
            "cs": "Noize MC v New Tekstil",
            "de": "Noize MC im New Tekstil",
            "es": "Noize MC en New Tekstil",
        },
        "bodies": {
            "en": "Noize MC comes to New Tekstil for a major Belgrade show. A strong event for the Russian-speaking community, music fans and anyone who wants a social concert night with a ready-made crowd.",
            "ru": "Noize MC выступит в New Tekstil с большим белградским концертом. Сильное событие для русскоязычного сообщества, поклонников музыки и всех, кто хочет концертный вечер с готовой компанией.",
            "uk": "Noize MC виступить у New Tekstil з великим белградським концертом. Сильна подія для російськомовної спільноти, фанів музики та всіх, хто хоче концертний вечір з готовою компанією.",
            "cs": "Noize MC přijede do New Tekstil s velkým bělehradským koncertem. Silná akce pro ruskojazyčnou komunitu, hudební fanoušky i každého, kdo chce společenský koncertní večer.",
            "de": "Noize MC kommt mit einer großen Belgrad-Show ins New Tekstil. Ein starkes Event für die russischsprachige Community, Musikfans und alle, die einen sozialen Konzertabend suchen.",
            "es": "Noize MC llega a New Tekstil con un gran concierto en Belgrado. Un evento potente para la comunidad rusohablante, fans de la música y quienes buscan una noche de concierto social.",
        },
    },
    {
        "iso_local": "2026-06-14 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "New Tekstil, Dunavska 86, Belgrade",
        "venue": "New Tekstil",
        "lat": 44.8210,
        "lng": 20.4800,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["en"],
        "source_url": "https://ra.co/events/2420322",
        "source_label": "ra.co",
        "photo": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80",
        "titles": {
            "en": "Parov Stelar at New Tekstil",
            "ru": "Parov Stelar в New Tekstil",
            "uk": "Parov Stelar у New Tekstil",
            "cs": "Parov Stelar v New Tekstil",
            "de": "Parov Stelar im New Tekstil",
            "es": "Parov Stelar en New Tekstil",
        },
        "bodies": {
            "en": "Electro swing pioneer Parov Stelar brings a danceable live show to New Tekstil. Expect brass, beats and a friendly international crowd — a very easy event to invite people to.",
            "ru": "Пионер electro swing Parov Stelar привезёт танцевальное live-шоу в New Tekstil. Ждите духовые, биты и дружелюбную международную публику — событие, на которое легко позвать компанию.",
            "uk": "Піонер electro swing Parov Stelar привезе танцювальне live-шоу в New Tekstil. Очікуйте духові, біти й дружню міжнародну публіку — подія, на яку легко запросити компанію.",
            "cs": "Průkopník electro swingu Parov Stelar přiveze do New Tekstil taneční live show. Dechy, beaty a přátelské mezinárodní publikum — velmi snadná akce pro pozvání party.",
            "de": "Electro-Swing-Pionier Parov Stelar bringt eine tanzbare Live-Show ins New Tekstil. Bläser, Beats und ein internationales Publikum machen es leicht, Leute einzuladen.",
            "es": "El pionero del electro swing Parov Stelar trae un show en vivo muy bailable a New Tekstil. Metales, beats y público internacional: fácil para invitar a una crew.",
        },
    },
    {
        "iso_local": "2026-06-16 20:30",
        "duration_minutes": 120,
        "category": "music",
        "address": "Kula Plaza, Belgrade Waterfront, Belgrade",
        "venue": "Kula Plaza",
        "lat": 44.8070,
        "lng": 20.4492,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["en", "es"],
        "source_url": "https://www.belgradewaterfront.com/en/events/ricky-martin-belgrade-river-fest-2026/",
        "source_label": "belgradewaterfront.com",
        "photo": "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80",
        "titles": {
            "en": "Ricky Martin — Belgrade River Fest",
            "ru": "Ricky Martin — Belgrade River Fest",
            "uk": "Ricky Martin — Belgrade River Fest",
            "cs": "Ricky Martin — Belgrade River Fest",
            "de": "Ricky Martin — Belgrade River Fest",
            "es": "Ricky Martin — Belgrade River Fest",
        },
        "bodies": {
            "en": "A major open-air pop concert by the river as part of Belgrade River Fest. Big production, familiar hits and a festive waterfront setting make it one of the most accessible social events of June.",
            "ru": "Большой open-air pop-концерт у реки в рамках Belgrade River Fest. Масштабная постановка, знакомые хиты и праздничная набережная делают это одним из самых доступных социальных событий июня.",
            "uk": "Великий open-air pop-концерт біля річки в межах Belgrade River Fest. Масштабна постановка, знайомі хіти й святкова набережна роблять це однією з найдоступніших соціальних подій червня.",
            "cs": "Velký open-air pop koncert u řeky v rámci Belgrade River Fest. Velká produkce, známé hity a slavnostní nábřeží z něj dělají jednu z nejdostupnějších společenských akcí června.",
            "de": "Ein großes Open-Air-Popkonzert am Fluss im Rahmen des Belgrade River Fest. Große Produktion, bekannte Hits und Waterfront-Atmosphäre machen es zu einem sehr zugänglichen Juni-Event.",
            "es": "Gran concierto pop al aire libre junto al río dentro de Belgrade River Fest. Producción grande, éxitos conocidos y ambiente festivo en la ribera: uno de los eventos sociales más accesibles de junio.",
        },
    },
    {
        "iso_local": "2026-06-30 20:00",
        "duration_minutes": 150,
        "category": "music",
        "address": "New Tekstil, Dunavska 86, Belgrade",
        "venue": "New Tekstil",
        "lat": 44.8210,
        "lng": 20.4800,
        "is_free": False,
        "price": None,
        "currency": "RSD",
        "languages": ["en"],
        "source_url": "https://provedi.se/en/activities/bg/new-tekstil-30-jun-2026-breaking-benjamin-koncert-uzivo-duckqkaynzhkifarfp5cz7",
        "source_label": "provedi.se",
        "photo": "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80",
        "titles": {
            "en": "Breaking Benjamin Live at New Tekstil",
            "ru": "Breaking Benjamin в New Tekstil",
            "uk": "Breaking Benjamin у New Tekstil",
            "cs": "Breaking Benjamin živě v New Tekstil",
            "de": "Breaking Benjamin live im New Tekstil",
            "es": "Breaking Benjamin en vivo en New Tekstil",
        },
        "bodies": {
            "en": "Breaking Benjamin close June with a big alternative rock show at New Tekstil. A strong crowd-puller for rock fans, expats and anyone who wants an easy plan to join with a crew.",
            "ru": "Breaking Benjamin закрывают июнь большим alternative rock концертом в New Tekstil. Сильный магнит для рок-фанов, экспатов и всех, кому нужен понятный план для выхода с компанией.",
            "uk": "Breaking Benjamin закривають червень великим alternative rock концертом у New Tekstil. Сильний магніт для рок-фанів, експатів і всіх, кому потрібен зрозумілий план для виходу з компанією.",
            "cs": "Breaking Benjamin uzavírají červen velkým alternative rock koncertem v New Tekstil. Silný tahák pro rockové fanoušky, expaty i každého, kdo chce snadný plán s partou.",
            "de": "Breaking Benjamin schließen den Juni mit einer großen Alternative-Rock-Show im New Tekstil ab. Ein starker Anziehungspunkt für Rockfans, Expats und alle, die einen einfachen Crew-Plan suchen.",
            "es": "Breaking Benjamin cierra junio con un gran concierto de alternative rock en New Tekstil. Un evento fuerte para fans del rock, expats y cualquiera que quiera un plan fácil con crew.",
        },
    },
]


def fetch_existing():
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/events?is_system=eq.true&city=eq.Belgrade&select=title,source_url,starts_at&limit=2000",
        headers=HEADERS,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read())
    titles = {row.get("title") for row in rows if row.get("title")}
    sources = {row.get("source_url") for row in rows if row.get("source_url")}
    return titles, sources


def main():
    existing_titles, existing_sources = fetch_existing()
    print(f"[i] existing Belgrade system events: titles={len(existing_titles)}, sources={len(existing_sources)}")

    inserted = skipped = 0
    for ev in EVENTS:
        title_en = ev["titles"]["en"]
        if title_en in existing_titles or ev["source_url"] in existing_sources:
            print(f"[=] skip duplicate: {title_en}")
            skipped += 1
            continue

        row = {
            "title": title_en,
            "description": ev["bodies"]["en"],
            "description_json": build_description(
                ev["titles"],
                ev["bodies"],
                human_date(ev["iso_local"]),
                ev["venue"],
                ev["source_url"],
                ev["source_label"],
            ),
            "title_translations": {k: v for k, v in ev["titles"].items() if k != "en"},
            "description_translations": {k: v for k, v in ev["bodies"].items() if k != "en"},
            "starts_at": local_to_utc(ev["iso_local"]),
            "duration_minutes": ev["duration_minutes"],
            "city": "Belgrade",
            "city_id": CITY_ID,
            "country": "RS",
            "address": ev["address"],
            "lat": ev["lat"],
            "lng": ev["lng"],
            "is_online": False,
            "is_free": ev["is_free"],
            "price": ev["price"],
            "currency": ev["currency"],
            "max_attendees": None,
            "photos": [ev["photo"]],
            "organizer_id": SYSTEM_ORGANIZER_ID,
            "category_id": CAT[ev["category"]],
            "languages": ev["languages"],
            "is_private": False,
            "is_system": True,
            "status": "published",
            "source_url": ev["source_url"],
            "safety_tags": [],
            "allow_crews": True,
            "editorial_status": "published",
            "editorial_pitch": "Curated Belgrade event for people looking for company to go with.",
        }
        data = json.dumps(row, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/events",
            data=data,
            headers=HEADERS,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            event_id = result[0]["id"] if isinstance(result, list) and result else "?"
            print(f"[+] {title_en} -> {event_id}")
            inserted += 1
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            print(f"[!] {title_en}: HTTP {exc.code} {detail}")

    print(f"\nDone: inserted={inserted}, skipped={skipped}, total={len(EVENTS)}")


if __name__ == "__main__":
    main()
