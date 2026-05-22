#!/usr/bin/env python3
"""Scrape and seed 100 more confirmed Prague events, 23 May - 30 June 2026."""

from __future__ import annotations

import html
import json
import os
import re
import ssl
import sys
import urllib.error
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

CITY_ID = "46837694-6917-48cc-843b-338c297394ec"
SYSTEM_ORGANIZER_ID = "acbb238e-f24f-4534-b92a-fa4bcfc7e07e"

CAT = {
    "music": "87186d0a-5631-4b30-863f-fabd5d8f74e4",
    "dancing": "a265eff9-ce91-417f-8780-493d024a9e85",
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

SOURCES = [
    "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventMonth=05&EventYear=2026",
    "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventMonth=05&EventYear=2026&Offset=50",
    "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventMonth=06&EventYear=2026",
    "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventMonth=06&EventYear=2026&Offset=50",
    "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventMonth=06&EventYear=2026&Offset=100",
    "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventMonth=06&EventYear=2026&Offset=150",
    "https://www.pragueexperience.com/opera-concerts/opera-concerts.asp?EventMonth=06&EventYear=2026&Offset=200",
    "https://www.pragueexperience.com/theatre/theatre.asp?EventMonth=05&EventYear=2026",
    "https://www.pragueexperience.com/theatre/theatre.asp?EventMonth=06&EventYear=2026",
]

VENUES = {
    "St. Nicholas Church at Old Town Square": ("St. Nicholas Church, Old Town Square, Prague 1", 50.0870, 14.4209),
    "Klementinum": ("Klementinum, Mariánské náměstí 5, Prague 1", 50.0864, 14.4167),
    "St. Salvator Church at Charles Bridge": ("St. Salvator Church, Křižovnické náměstí, Prague 1", 50.0868, 14.4146),
    "Spanish Synagogue": ("Spanish Synagogue, Vězeňská 1, Prague 1", 50.0903, 14.4208),
    "Lobkowicz Palace at Prague Castle": ("Lobkowicz Palace, Jiřská 3, Prague Castle, Prague 1", 50.0917, 14.4037),
    "St. Giles Church": ("St. Giles Church, Husova 8, Prague 1", 50.0852, 14.4182),
    "Estates Theatre": ("Estates Theatre, Ovocný trh 1, Prague 1", 50.0865, 14.4237),
    "Broadway Theatre": ("Broadway Theatre, Na Příkopě 31, Prague 1", 50.0854, 14.4246),
    "St. Francis of Assisi Church": ("St. Francis of Assisi Church, Křižovnické náměstí, Prague 1", 50.0867, 14.4142),
    "Tyn Church": ("Church of Our Lady before Týn, Old Town Square, Prague 1", 50.0875, 14.4227),
    "St. Clement's Cathedral": ("St. Clement's Cathedral, Karlova 1, Prague 1", 50.0866, 14.4160),
    "Municipal House": ("Municipal House, Republic Square 5, Prague 1", 50.0875, 14.4281),
    "National Theatre": ("National Theatre, Národní 2, Prague 1", 50.0810, 14.4136),
    "Prague State Opera": ("Prague State Opera, Wilsonova 4, Prague 1", 50.0808, 14.4326),
    "St. Martin in the Wall Church": ("St. Martin in the Wall Church, Martinská 8, Prague 1", 50.0823, 14.4201),
    "Rudolfinum: Suk Hall": ("Rudolfinum, Alšovo nábřeží 12, Prague 1", 50.0909, 14.4155),
    "Srnec Theatre": ("Srnec Theatre, Na Příkopě 10, Prague 1", 50.0849, 14.4240),
    "Image Theatre": ("Image Theatre, Národní 25, Prague 1", 50.0819, 14.4176),
}

PHOTO = {
    "music": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80",
    "opera": "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80",
    "ballet": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80",
    "theatre": "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80",
}

MONTHS = {"May": 5, "June": 6}
KINDS = {"Classical Concert", "Opera", "Ballet", "Black Light"}
PRICE_RE = re.compile(r"^[0-9]+ CZK$")
DATE_RE = re.compile(r"^([0-9]{2}) (May|June) 2026$")
TIME_RE = re.compile(r"^[0-9]{2}:[0-9]{2}$")


def strip_page(raw: str):
    raw = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S | re.I)
    raw = re.sub(r"<[^>]+>", "\n", raw)
    lines = [re.sub(r"\s+", " ", html.unescape(line)).strip() for line in raw.splitlines()]
    return [line for line in lines if line]


def fetch_lines(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return strip_page(resp.read().decode("utf-8", errors="ignore"))


def parse_source(url: str):
    lines = fetch_lines(url)
    events = []
    i = 0
    while i < len(lines) - 4:
        if lines[i] not in KINDS or not DATE_RE.match(lines[i + 1]) or not TIME_RE.match(lines[i + 2]):
            i += 1
            continue
        kind, date_s, time_s, title, venue = lines[i : i + 5]
        if venue not in VENUES:
            i += 1
            continue
        j = i + 5
        price = None
        while j < len(lines) and PRICE_RE.match(lines[j]):
            price = int(lines[j].split()[0]) if price is None else min(price, int(lines[j].split()[0]))
            j += 1
        day, month_name = DATE_RE.match(date_s).groups()
        iso = f"2026-{MONTHS[month_name]:02d}-{int(day):02d} {time_s}"
        source_url = url
        events.append({"kind": kind, "iso_local": iso, "title": title, "venue": venue, "price": price, "source_url": source_url})
        i = j
    return events


def local_to_utc(iso_local: str):
    dt = datetime.strptime(iso_local, "%Y-%m-%d %H:%M")
    return (dt - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def human_date(iso_local: str):
    return datetime.strptime(iso_local, "%Y-%m-%d %H:%M").strftime("%d %b %Y, %H:%M")


def t_text(text: str, marks=None):
    node = {"type": "text", "text": text}
    if marks:
        node["marks"] = marks
    return node


def t_link(label: str, href: str):
    return t_text(label, [{"type": "link", "attrs": {"href": href}}])


def t_para(*nodes):
    return {"type": "paragraph", "content": list(nodes)}


def t_h2(text: str):
    return {"type": "heading", "attrs": {"level": 2}, "content": [t_text(text)]}


def t_h3(text: str):
    return {"type": "heading", "attrs": {"level": 3}, "content": [t_text(text)]}


def title_for(ev):
    return f"{ev['title']} at {ev['venue']} — {datetime.strptime(ev['iso_local'], '%Y-%m-%d %H:%M').strftime('%d %b')}"


def category(ev):
    if ev["kind"] == "Ballet":
        return "dancing"
    if ev["kind"] == "Black Light":
        return "other"
    return "music"


def photo(ev):
    if ev["kind"] == "Opera":
        return PHOTO["opera"]
    if ev["kind"] == "Ballet":
        return PHOTO["ballet"]
    if ev["kind"] == "Black Light":
        return PHOTO["theatre"]
    return PHOTO["music"]


def localized_titles(en):
    return {
        "en": en,
        "ru": en,
        "uk": en,
        "cs": en,
        "de": en,
        "es": en,
    }


def localized_bodies(en, ev):
    venue = ev["venue"]
    kind = ev["kind"].lower()
    return {
        "en": f"A confirmed Prague {kind} performance listed with date, time and venue by Prague Experience. It is a practical cultural plan for anyone who wants to go out with company rather than spend the evening alone. Venue: {venue}.",
        "ru": f"Подтвержденное мероприятие в Праге: {kind}, с датой, временем и площадкой в календаре Prague Experience. Хороший культурный план, чтобы выбраться вечером и найти компанию. Место: {venue}.",
        "uk": f"Підтверджена подія у Празі: {kind}, з датою, часом і майданчиком у календарі Prague Experience. Гарний культурний план, щоб вийти ввечері й знайти компанію. Місце: {venue}.",
        "cs": f"Potvrzená pražská akce typu {kind}, uvedená s datem, časem a místem v kalendáři Prague Experience. Dobrá kulturní příležitost vyrazit ven a potkat lidi. Místo: {venue}.",
        "de": f"Eine bestätigte Prager {kind}-Veranstaltung mit Datum, Uhrzeit und Ort im Kalender von Prague Experience. Ein guter Kulturplan, um auszugehen und Menschen zu treffen. Ort: {venue}.",
        "es": f"Evento confirmado en Praga: {kind}, con fecha, hora y lugar en el calendario de Prague Experience. Un buen plan cultural para salir y encontrar compañía. Lugar: {venue}.",
    }


def build_description(titles, bodies, ev):
    blocks = []
    for lang in LANG_ORDER:
        blocks.append(t_h2(f"{LANG_LABEL[lang]} — {titles[lang]}"))
        blocks.append(t_para(t_text(bodies[lang])))
    blocks.append(t_h3(f"📅 {human_date(ev['iso_local'])} · 📍 {ev['venue']}"))
    blocks.append(t_para(t_text("Source: "), t_link("Prague Experience", ev["source_url"])))
    return {"type": "doc", "content": blocks}


def fetch_existing():
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/events?select=title,starts_at,address&city=eq.Prague&is_system=eq.true&starts_at=gte.2026-05-22T22:00:00Z&starts_at=lte.2026-06-30T21:59:59Z&limit=500",
        headers=HEADERS,
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read())
    keys = set()
    for row in rows:
        starts = row.get("starts_at") or ""
        local_date = starts[:10]
        keys.add((row.get("title"), local_date))
        address = row.get("address") or ""
        keys.add((address.split(",")[0], starts[:16]))
    return keys


def main():
    scraped = []
    for source in SOURCES:
        try:
            found = parse_source(source)
            print(f"[i] {source} -> {len(found)} events")
            scraped.extend(found)
        except Exception as exc:
            print(f"[!] source failed {source}: {exc}")

    start = datetime(2026, 5, 23, 0, 0)
    end = datetime(2026, 6, 30, 23, 59)
    unique = {}
    for ev in scraped:
        dt = datetime.strptime(ev["iso_local"], "%Y-%m-%d %H:%M")
        if not (start <= dt <= end):
            continue
        key = (ev["iso_local"], ev["title"], ev["venue"])
        unique[key] = ev
    candidates = sorted(unique.values(), key=lambda x: (x["iso_local"], x["venue"], x["title"]))
    existing = fetch_existing()
    selected = []
    seen = set()
    for ev in candidates:
        title_en = title_for(ev)
        starts_at = local_to_utc(ev["iso_local"])
        address, _, _ = VENUES[ev["venue"]]
        if (title_en, starts_at[:10]) in existing:
            continue
        if (address.split(",")[0], starts_at[:16]) in existing:
            continue
        key = (starts_at, ev["venue"], ev["title"])
        if key in seen:
            continue
        seen.add(key)
        selected.append(ev)
        if len(selected) == 100:
            break
    if len(selected) < 100:
        raise RuntimeError(f"Only {len(selected)} usable events found")

    out_events = PROJECT_ROOT / ".agent-tmp" / "seed_prague_may_june2026_100_more_events.json"
    out_events.write_text(json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[i] selected={len(selected)} saved={out_events}")

    inserted = skipped = 0
    ids = []
    for ev in selected:
        title_en = title_for(ev)
        starts_at = local_to_utc(ev["iso_local"])
        address, lat, lng = VENUES[ev["venue"]]
        titles = localized_titles(title_en)
        bodies = localized_bodies(title_en, ev)
        row = {
            "title": title_en,
            "description": bodies["en"],
            "description_json": build_description(titles, bodies, ev),
            "title_translations": {k: v for k, v in titles.items() if k != "en"},
            "description_translations": {k: v for k, v in bodies.items() if k != "en"},
            "starts_at": starts_at,
            "duration_minutes": 120 if ev["kind"] != "Black Light" else 90,
            "city": "Prague",
            "city_id": CITY_ID,
            "country": "CZ",
            "address": address,
            "lat": lat,
            "lng": lng,
            "is_online": False,
            "is_free": False,
            "price": ev["price"],
            "currency": "CZK",
            "max_attendees": None,
            "photos": [photo(ev)],
            "organizer_id": SYSTEM_ORGANIZER_ID,
            "category_id": CAT[category(ev)],
            "languages": ["en", "cs"],
            "is_private": False,
            "is_system": True,
            "status": "published",
            "source_url": ev["source_url"],
            "safety_tags": [],
            "allow_crews": True,
            "editorial_status": "published",
            "editorial_pitch": "Confirmed Prague cultural listing with date, time and venue.",
        }
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/events",
            data=json.dumps(row, ensure_ascii=False).encode("utf-8"),
            headers=HEADERS,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            event_id = result[0]["id"] if isinstance(result, list) and result else "?"
            ids.append(event_id)
            inserted += 1
            print(f"[+] {starts_at[:10]} {title_en} -> {event_id}")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            skipped += 1
            print(f"[!] {title_en}: HTTP {exc.code} {detail}")

    out_ids = PROJECT_ROOT / ".agent-tmp" / "seed_prague_may_june2026_100_more_inserted.json"
    out_ids.write_text(json.dumps(ids, indent=2), encoding="utf-8")
    print(f"[done] inserted={inserted} skipped={skipped} ids_file={out_ids}")


if __name__ == "__main__":
    main()
