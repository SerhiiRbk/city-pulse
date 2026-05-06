#!/usr/bin/env python3
"""
Seed 5 system events in Brno for May 2026.

Uses Wikimedia Commons images (CC-licensed) as event covers,
uploads them to Supabase Storage, then inserts events.

Run:
  set -a && . .env.local && set +a
  python3 .agent-tmp/seed_brno_may2026.py
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import uuid
import urllib.request
import urllib.error
from typing import Any

# Disable SSL verification (macOS Python often lacks certs)
ssl._create_default_https_context = ssl._create_unverified_context

# ---- Config ---------------------------------------------------------
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Organizer = Serhii (system organizer used in prior seeds)
SYSTEM_ORGANIZER_ID = "acbb238e-f24f-4534-b92a-fa4bcfc7e07e"

# Category IDs (from existing seed)
CAT = {
    "museums": "d9b20fbf-7a7e-466b-acf5-1c379e6b94d6",
    "history": "a0b1552a-879c-4e96-b2ae-798dc9988926",
    "other": "0f106ec4-baaf-4274-9d60-b059771a4f67",
}

STORAGE_BUCKET = "event-photos"

# ---- Wikimedia Commons image URLs (direct file links) ---------------
# These are CC-BY-SA licensed images from Wikimedia Commons
IMAGES = {
    "muzejni_noc": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Brno%2C_Jan%C3%A1%C4%8Dek_Theatre_illuminated_in_November_2015_%288675%29.jpg",
    "legiovlak": "https://upload.wikimedia.org/wikipedia/commons/4/4a/Brno_Spilberk_142.JPG",
    "vecernicek": "https://upload.wikimedia.org/wikipedia/commons/a/a0/Hrad_%C5%A0pilberk_%28Brno%29_%287%29.jpg",
    "boskovice": "https://upload.wikimedia.org/wikipedia/commons/e/e3/Hrad_%C5%A0pilberk_I.jpg",
    "favu": "https://upload.wikimedia.org/wikipedia/commons/8/8e/Brno_Montage_IV.png",
}

# ---- Events data ----------------------------------------------------
LANG_ORDER = ["en", "cs", "de", "ru", "uk"]
LANG_LABEL = {
    "en": "English", "cs": "Čeština", "de": "Deutsch",
    "ru": "Русский", "uk": "Українська",
}


def t_text(s: str, marks=None):
    node: dict[str, Any] = {"type": "text", "text": s}
    if marks:
        node["marks"] = marks
    return node


def t_link(label: str, href: str):
    return t_text(label, [{"type": "link", "attrs": {"href": href}}])


def t_h2(s: str):
    return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(s)]}


def t_h3(s: str):
    return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(s)]}


def t_para(*nodes):
    return {"type": "paragraph", "content": list(nodes)}


def build_description(titles, bodies, when_label, venue, source_url, source_label):
    blocks = []
    for lang in LANG_ORDER:
        if lang in titles:
            blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
            blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {when_label} · 📍 {venue}"))
    blocks.append(t_para(t_text("Source: "), t_link(source_label, source_url)))
    return {"type": "doc", "content": blocks}


EVENTS = [
    {
        "image_key": "muzejni_noc",
        "iso_utc": "2026-05-16T16:00:00Z",  # 18:00 CEST
        "duration_minutes": 360,
        "category": "museums",
        "address": "Moravská galerie, Husova 18, 662 26 Brno",
        "venue_short": "Moravská galerie & 30+ institutions, Brno",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.kudyznudy.cz/akce/brnenska-muzejni-noc-2013",
        "source_label": "kudyznudy.cz",
        "when_label": "16. května 2026, 18:00–24:00",
        "titles": {
            "en": "Brno Museum Night 2026",
            "cs": "Brněnská muzejní noc 2026",
            "de": "Brünner Museumsnacht 2026",
            "ru": "Брненская музейная ночь 2026",
            "uk": "Брненська музейна ніч 2026",
        },
        "bodies": {
            "en": "The 22nd edition of Brno Museum Night takes place on May 16, 2026 from 18:00 to midnight. Over 30 cultural institutions open their doors with special programmes, guided tours, concerts and workshops. Free transport provided by Brno public transit.",
            "cs": "22. ročník Brněnské muzejní noci se uskuteční 16. května 2026 v čase 18:00 až 24:00. Třicítka kulturních institucí otevře dveře se speciálním programem, komentovanými prohlídkami, koncerty a workshopy. Bezplatnou dopravu zajistí DPMB.",
            "de": "Die 22. Brünner Museumsnacht findet am 16. Mai 2026 von 18:00 bis Mitternacht statt. Über 30 Kulturinstitutionen öffnen ihre Türen mit Sonderprogrammen, Führungen, Konzerten und Workshops. Kostenloser Transport durch den Brünner Nahverkehr.",
            "ru": "22-й выпуск Брненской музейной ночи пройдёт 16 мая 2026 с 18:00 до полуночи. Более 30 культурных учреждений откроют двери со специальными программами, экскурсиями, концертами и мастер-классами. Бесплатный транспорт от DPMB.",
            "uk": "22-й випуск Брненської музейної ночі відбудеться 16 травня 2026 з 18:00 до півночі. Понад 30 культурних закладів відкриють двері зі спеціальними програмами, екскурсіями, концертами та воркшопами. Безкоштовний транспорт від DPMB.",
        },
    },
    {
        "image_key": "legiovlak",
        "iso_utc": "2026-05-05T07:00:00Z",  # 09:00 CEST
        "duration_minutes": 480,
        "category": "history",
        "address": "Brno hlavní nádraží, Nádražní 1, Brno",
        "venue_short": "Brno hlavní nádraží",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs"],
        "source_url": "https://www.kudyznudy.cz/akce/legiovlak-2015",
        "source_label": "kudyznudy.cz",
        "when_label": "5.–17. května 2026",
        "titles": {
            "en": "Legiovlak 2026 — Legion Train Museum in Brno",
            "cs": "Legiovlak 2026 — legionářské muzeum na kolejích v Brně",
            "de": "Legiovlak 2026 — Legionärszug-Museum in Brünn",
            "ru": "Легиовлак 2026 — музей легионеров на рельсах в Брно",
            "uk": "Легіовлак 2026 — музей легіонерів на рейках у Брно",
        },
        "bodies": {
            "en": "A unique railway museum of 15 historical wagons presenting the history of Czechoslovak legions and 20th-century military history. Free entry, guided tours in period uniforms. Stops in Brno May 5–17.",
            "cs": "Unikátní legionářské muzeum na kolejích — 15 historických vagonů přibližujících historii československých legií a vojenské dějiny 20. století. Vstup zdarma, průvodci v dobových uniformách. V Brně 5.–17. května.",
            "de": "Ein einzigartiges Eisenbahnmuseum mit 15 historischen Waggons zur Geschichte der tschechoslowakischen Legionen und der Militärgeschichte des 20. Jahrhunderts. Eintritt frei, Führungen in Zeitkostümen. In Brünn 5.–17. Mai.",
            "ru": "Уникальный железнодорожный музей из 15 исторических вагонов, рассказывающий об истории чехословацких легионов и военной истории XX века. Вход свободный, экскурсии в форме эпохи. В Брно 5–17 мая.",
            "uk": "Унікальний залізничний музей із 15 історичних вагонів, що розповідає про історію чехословацьких легіонів та військову історію XX століття. Вхід вільний, екскурсії у формі епохи. У Брно 5–17 травня.",
        },
    },
    {
        "image_key": "vecernicek",
        "iso_utc": "2026-05-06T08:00:00Z",  # 10:00 CEST
        "duration_minutes": 480,
        "category": "other",
        "address": "Moravské zemské muzeum, Zelný trh 6, Brno",
        "venue_short": "Moravské zemské muzeum, Brno",
        "is_free": False,
        "price": 150,
        "currency": "CZK",
        "languages": ["cs"],
        "source_url": "https://www.kudyznudy.cz/akce/vecernicek-60-let-vystava-plna-pohadek-v-brne",
        "source_label": "kudyznudy.cz",
        "when_label": "13. února – 17. května 2026",
        "titles": {
            "en": "Večerníček 60 Years — Exhibition of Czech Fairy Tales in Brno",
            "cs": "Večerníček 60 let — výstava plná pohádek v Brně",
            "de": "Večerníček 60 Jahre — Märchenausstellung in Brünn",
            "ru": "Вечерничек 60 лет — выставка чешских сказок в Брно",
            "uk": "Вечерничек 60 років — виставка чеських казок у Брно",
        },
        "bodies": {
            "en": "An interactive exhibition celebrating 60 years of Večerníček — the beloved Czech bedtime cartoon series. Original puppets, drawings, and multimedia installations at the Moravian Museum.",
            "cs": "Interaktivní výstava k 60. výročí Večerníčku — oblíbeného českého pohádkového pořadu. Originální loutky, kresby a multimediální instalace v Moravském zemském muzeu.",
            "de": "Eine interaktive Ausstellung zum 60. Jubiläum von Večerníček — der beliebten tschechischen Gute-Nacht-Zeichentrickserie. Originalpuppen, Zeichnungen und Multimedia-Installationen im Mährischen Landesmuseum.",
            "ru": "Интерактивная выставка к 60-летию «Вечерничка» — любимого чешского мультсериала перед сном. Оригинальные куклы, рисунки и мультимедийные инсталляции в Моравском земском музее.",
            "uk": "Інтерактивна виставка до 60-річчя «Вечерничка» — улюбленого чеського мультсеріалу перед сном. Оригінальні ляльки, малюнки та мультимедійні інсталяції в Моравському земському музеї.",
        },
    },
    {
        "image_key": "boskovice",
        "iso_utc": "2026-05-16T08:00:00Z",  # 10:00 CEST
        "duration_minutes": 600,
        "category": "history",
        "address": "Hrad Boskovice, Boskovice (30 km from Brno)",
        "venue_short": "Hrad Boskovice",
        "is_free": False,
        "price": 200,
        "currency": "CZK",
        "languages": ["cs"],
        "source_url": "https://www.kudyznudy.cz/akce/ozivly-hrad-boskovice-ix",
        "source_label": "kudyznudy.cz",
        "when_label": "16.–17. května 2026",
        "titles": {
            "en": "Living Castle Boskovice 2026 — Medieval Festival near Brno",
            "cs": "Oživlý hrad Boskovice 2026",
            "de": "Lebendige Burg Boskovice 2026 — Mittelalterfest bei Brünn",
            "ru": "Ожившая крепость Босковице 2026 — средневековый фестиваль под Брно",
            "uk": "Ожила фортеця Босковіце 2026 — середньовічний фестиваль під Брно",
        },
        "bodies": {
            "en": "A two-day medieval festival at the ruins of Boskovice Castle (30 km from Brno). Knights' tournaments, period crafts, falconry shows, fire performances and medieval cuisine. A family-friendly event with activities for children.",
            "cs": "Dvoudenní středověký festival na zřícenině hradu Boskovice (30 km od Brna). Rytířské turnaje, dobová řemesla, sokolnické ukázky, ohňové show a středověká kuchyně. Akce vhodná pro rodiny s dětmi.",
            "de": "Ein zweitägiges Mittelalterfest auf der Burgruine Boskovice (30 km von Brünn). Ritterturniere, historisches Handwerk, Falknerei, Feuershows und mittelalterliche Küche. Familienfreundlich mit Kinderprogramm.",
            "ru": "Двухдневный средневековый фестиваль на руинах замка Босковице (30 км от Брно). Рыцарские турниры, ремёсла эпохи, соколиная охота, огненные шоу и средневековая кухня. Подходит для семей с детьми.",
            "uk": "Дводенний середньовічний фестиваль на руїнах замку Босковіце (30 км від Брно). Лицарські турніри, ремесла епохи, соколине полювання, вогняні шоу та середньовічна кухня. Підходить для сімей з дітьми.",
        },
    },
    {
        "image_key": "favu",
        "iso_utc": "2026-05-06T08:00:00Z",  # 10:00 CEST
        "duration_minutes": 480,
        "category": "other",
        "address": "Galerie FaVU VUT, Údolní 19, Brno",
        "venue_short": "Galerie FaVU VUT, Brno",
        "is_free": True,
        "price": None,
        "currency": "CZK",
        "languages": ["cs", "en"],
        "source_url": "https://www.kudyznudy.cz/akce/favu-vut-plochy-prostory",
        "source_label": "kudyznudy.cz",
        "when_label": "18. dubna – 15. července 2026",
        "titles": {
            "en": "FaVU VUT — Surfaces & Spaces (Contemporary Art Exhibition)",
            "cs": "FaVU VUT — Plochy & Prostory",
            "de": "FaVU VUT — Flächen & Räume (Zeitgenössische Kunst)",
            "ru": "FaVU VUT — Плоскости и пространства (выставка современного искусства)",
            "uk": "FaVU VUT — Площини та простори (виставка сучасного мистецтва)",
        },
        "bodies": {
            "en": "An exhibition by students and graduates of the Faculty of Fine Arts at Brno University of Technology exploring the relationship between flat surfaces and three-dimensional spaces through painting, sculpture and installation.",
            "cs": "Výstava studentů a absolventů Fakulty výtvarných umění VUT v Brně zkoumající vztah plochých povrchů a trojrozměrných prostorů prostřednictvím malby, sochařství a instalace.",
            "de": "Eine Ausstellung von Studierenden und Absolventen der Fakultät für Bildende Künste der TU Brünn, die das Verhältnis von Flächen und dreidimensionalen Räumen durch Malerei, Skulptur und Installation erforscht.",
            "ru": "Выставка студентов и выпускников Факультета изобразительных искусств Технического университета Брно, исследующая взаимосвязь плоских поверхностей и трёхмерных пространств через живопись, скульптуру и инсталляцию.",
            "uk": "Виставка студентів та випускників Факультету образотворчих мистецтв Технічного університету Брно, що досліджує взаємозв'язок площин та тривимірних просторів через живопис, скульптуру та інсталяцію.",
        },
    },
]


# ---- Helpers --------------------------------------------------------

def api_request(method: str, path: str, body=None, extra_headers=None):
    """Make a request to Supabase REST API."""
    url = f"{SUPABASE_URL}{path}"
    headers = {**HEADERS}
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        print(f"  HTTP {e.code}: {err_body[:300]}")
        return None


def upload_image(image_url: str, event_id: str) -> str | None:
    """Download image from URL and upload to Supabase Storage."""
    print(f"  Downloading image: {image_url[:80]}...")
    try:
        req = urllib.request.Request(image_url, headers={
            "User-Agent": "Mozilla/5.0 (seed-script; localisio.com)"
        })
        with urllib.request.urlopen(req) as resp:
            image_data = resp.read()
            content_type = resp.headers.get("Content-Type", "image/jpeg")
    except Exception as e:
        print(f"  ERROR downloading image: {e}")
        return None

    # Determine extension
    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"

    file_path = f"events/{event_id}/{uuid.uuid4().hex[:12]}.{ext}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{file_path}"

    print(f"  Uploading to storage: {file_path}")
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    req = urllib.request.Request(upload_url, data=image_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        print(f"  ERROR uploading: HTTP {e.code}: {err_body[:200]}")
        return None

    # Return public URL
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{file_path}"
    print(f"  ✓ Uploaded: {public_url[:80]}...")
    return public_url


def resolve_brno_city_id() -> str | None:
    """Find Brno city_id from the cities table."""
    url = f"{SUPABASE_URL}/rest/v1/cities?name=eq.Brno&country=eq.CZ&select=id"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            if data:
                return data[0]["id"]
    except Exception as e:
        print(f"  ERROR resolving Brno city: {e}")
    return None


# ---- Main -----------------------------------------------------------

def main():
    print("=" * 60)
    print("Seeding 5 Brno events for May 2026")
    print("=" * 60)

    # Resolve Brno city_id
    brno_city_id = resolve_brno_city_id()
    if not brno_city_id:
        print("ERROR: Could not find Brno in cities table. Trying without city_id...")

    print(f"Brno city_id: {brno_city_id or 'NOT FOUND'}")
    print(f"Organizer: {SYSTEM_ORGANIZER_ID}")
    print()

    created = 0
    skipped = 0

    for ev in EVENTS:
        title = ev["titles"]["cs"]
        print(f"--- {title} ---")

        # Check if already exists
        check_url = (
            f"{SUPABASE_URL}/rest/v1/events"
            f"?title=eq.{urllib.parse.quote(title)}"
            f"&select=id"
        )
        headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
        req = urllib.request.Request(check_url, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                existing = json.loads(resp.read().decode())
                if existing:
                    print(f"  SKIP: already exists (id={existing[0]['id']})")
                    skipped += 1
                    continue
        except Exception:
            pass

        # Generate event ID
        event_id = str(uuid.uuid4())

        # Upload image
        image_url = IMAGES.get(ev["image_key"])
        photo_url = None
        if image_url:
            photo_url = upload_image(image_url, event_id)

        # Build description_json
        desc_json = build_description(
            ev["titles"], ev["bodies"],
            ev["when_label"], ev["venue_short"],
            ev["source_url"], ev["source_label"],
        )

        # Plain text description (first 2 languages)
        plain_desc = ev["bodies"]["en"] + "\n\n" + ev["bodies"]["cs"]

        # Insert event
        row = {
            "id": event_id,
            "title": title,
            "description": plain_desc,
            "description_json": desc_json,
            "photos": [photo_url] if photo_url else [],
            "category_id": CAT[ev["category"]],
            "starts_at": ev["iso_utc"],
            "duration_minutes": ev["duration_minutes"],
            "is_online": False,
            "is_free": ev["is_free"],
            "price": ev["price"],
            "currency": ev["currency"],
            "max_attendees": None,
            "country": "CZ",
            "city": "Brno",
            "city_id": brno_city_id,
            "address": ev["address"],
            "lat": 49.1951,
            "lng": 16.6068,
            "organizer_id": SYSTEM_ORGANIZER_ID,
            "group_id": None,
            "is_private": False,
            "is_system": True,
            "source_url": ev["source_url"],
            "status": "published",
            "languages": ev["languages"],
            "safety_tags": [],
        }

        result = api_request("POST", "/rest/v1/events", row)
        if result:
            print(f"  ✓ Created: {result[0]['id'] if isinstance(result, list) else event_id}")
            created += 1
        else:
            print(f"  ✗ Failed to create event")

    print()
    print("=" * 60)
    print(f"Done! Created: {created}, Skipped: {skipped}")
    print("=" * 60)


if __name__ == "__main__":
    import urllib.parse
    main()
