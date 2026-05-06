#!/usr/bin/env python3
"""
Attach cover photos to the 30 June 2026 Prague system events.

Approach:
  * For each event UUID, try a curated list of candidate Wikimedia
    Commons File:Title.ext entries first (highest precision).
  * If none of the candidates resolves to a usable raster file, fall
    back to the Wikimedia Commons search API with a query string.
  * Only accept photos that are:
      - JPG or PNG (no SVG, no PDF, no GIF)
      - >= 1024px on the long edge
      - not obviously a pictogram / category icon (we filter on file
        size > 80kB after download)
  * Download, transcode to JPEG capped at 1280px on the long edge,
    upload to Supabase Storage (`event-photos/system/<uuid>/cover.jpg`).
  * PATCH events.photos = [public_url] so the event card picks it up.
  * Append a "Photo: <author> · <license> · Wikimedia Commons" line
    to the description_json for attribution.

Re-runnable: events that already have a non-empty `photos` array are
skipped, so partial successes don't get reprocessed.

Run with:
  set -a && . .env.local && set +a
  python3 .agent-tmp/seed_june_event_photos.py
"""

from __future__ import annotations

import json
import os
import ssl
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from typing import Any

# ---- Hand mapping: event UUID -> (candidate File:Title list, search query) ----
# UUIDs come from the seed insert run. Keep candidates in priority order.
PHOTOS: list[dict[str, Any]] = [
    {
        "uuid": "31af7f17-9d5d-4a44-afae-1a2eb22d83d0",
        "title_hint": "Children's Day at Prague Zoo",
        "candidates": [
            "File:Zoo Praha logo and entrance.jpg",
            "File:ZOO Praha Pavilon goril.jpg",
            "File:Praha, Troja, ZOO, vstup.jpg",
        ],
        "query": "Prague Zoo entrance gorilla",
    },
    {
        "uuid": "c4caab08-88d5-42c9-adfd-2752f1d1c869",
        "title_hint": "Vivaldi at Smetana Hall",
        "candidates": [
            "File:Smetana Hall, Municipal House.jpg",
            "File:Smetana Hall, Prague.jpg",
            "File:Praha, Náměstí Republiky, Obecní dům, Smetanova síň.jpg",
        ],
        "query": "Smetana Hall Municipal House Prague interior",
    },
    {
        "uuid": "c529fc4d-ca78-4f77-9763-617564ceecae",
        "title_hint": "Beethoven at Rudolfinum",
        "candidates": [
            "File:Prague Rudolfinum.jpg",
            "File:Rudolfinum, Praha.jpg",
            "File:Praha Rudolfinum 2.jpg",
        ],
        "query": "Rudolfinum Prague concert hall",
    },
    {
        "uuid": "485f803c-a5c1-4127-bb50-207dfb46d160",
        "title_hint": "Drink-up Cross Club",
        "candidates": [
            "File:Cross Club Prague.jpg",
            "File:Cross Club Praha.jpg",
            "File:Praha, Holešovice, Plynární, Cross Club.jpg",
        ],
        "query": "Cross Club Holesovice Prague nightclub",
    },
    {
        "uuid": "4319242f-21bf-47ba-aad8-39b0a6be2a46",
        "title_hint": "Noc kostelů",
        "candidates": [
            "File:St. Nicholas Church, Old Town Square, Prague - 8654.jpg",
            "File:Kostel sv. Mikuláše (Staré Město).jpg",
            "File:Praha, Staré Město - kostel sv. Mikuláše.jpg",
        ],
        "query": "Prague church interior baroque candle",
    },
    {
        "uuid": "c22d524b-2566-4e8b-a741-0f88d3d5341b",
        "title_hint": "Bohemia JazzFest Old Town Square",
        "candidates": [
            "File:Staromestske namesti Praha.jpg",
            "File:Staroměstské náměstí, Praha.jpg",
            "File:Old Town Square, Prague.jpg",
        ],
        "query": "Old Town Square Prague evening summer",
    },
    {
        "uuid": "08058f86-35a9-499f-824b-2457f689f528",
        "title_hint": "Náplavka farmers market",
        "candidates": [
            "File:Naplavka Prague.jpg",
            "File:Praha, Rašínovo nábřeží, náplavka.jpg",
            "File:Náplavka Praha.jpg",
        ],
        "query": "Naplavka farmers market Prague Rasinovo",
    },
    {
        "uuid": "cbc4f2aa-3328-49e8-aff3-7921a5c5cac8",
        "title_hint": "Mozart Mirror Chapel Klementinum",
        "candidates": [
            "File:Klementinum Zrcadlová kaple.jpg",
            "File:Mirror Chapel Klementinum Prague.jpg",
            "File:Praha, Klementinum, Zrcadlová kaple.jpg",
        ],
        "query": "Mirror Chapel Klementinum Prague interior",
    },
    {
        "uuid": "670d614f-41d6-4afc-ad44-8e46ae39a287",
        "title_hint": "U Fleků brewery",
        "candidates": [
            "File:Praha, U Fleku, exterior.jpg",
            "File:U Fleku Prague.jpg",
            "File:Pivovar U Fleků.jpg",
        ],
        "query": "U Fleku Prague brewery interior beer",
    },
    {
        "uuid": "d5fb1d11-d904-4ed5-902e-3634a670635b",
        "title_hint": "Open-air cinema Náplavka Smíchov",
        "candidates": [
            "File:Hořejší nábřeží, Praha.jpg",
            "File:Naplavka Smichov.jpg",
            "File:Praha, Smíchov, náplavka.jpg",
        ],
        "query": "Naplavka Smichov Prague evening",
    },
    {
        "uuid": "0647ddd1-88c2-4a26-ad9f-f04bba9ed448",
        "title_hint": "Royal Garden Prague Castle",
        "candidates": [
            "File:Belvedere Prague.jpg",
            "File:Letohrádek královny Anny.jpg",
            "File:Královská zahrada Pražského hradu.jpg",
        ],
        "query": "Royal Garden Prague Castle Belvedere summer palace",
    },
    {
        "uuid": "fce4b12f-e225-4620-8b01-3428e50522fa",
        "title_hint": "United Islands Day 1 Stvanice",
        "candidates": [
            "File:Štvanice (ostrov), Praha.jpg",
            "File:Štvanice island Prague.jpg",
            "File:Stvanice Prague aerial.jpg",
        ],
        "query": "Stvanice island Prague open air festival",
    },
    {
        "uuid": "7272eea0-7a2f-406c-b3d7-0c107c777d74",
        "title_hint": "United Islands Day 2 Karlin",
        "candidates": [
            "File:Karlín, Praha 2017.jpg",
            "File:Praha, Karlín.jpg",
            "File:Karlin embankment Prague.jpg",
        ],
        "query": "Karlin embankment Prague evening crowd",
    },
    {
        "uuid": "b73c7a36-e041-419d-92d4-9947e8ba8f5e",
        "title_hint": "Petrin observatory sunset",
        "candidates": [
            "File:Štefánikova hvězdárna.jpg",
            "File:Stefanik Observatory Prague.jpg",
            "File:Petrin sunset Prague.jpg",
        ],
        "query": "Stefanik observatory Petrin Prague telescope",
    },
    {
        "uuid": "3d074e36-b97f-461d-acbb-ad74a081039f",
        "title_hint": "Mlada Praha Liechtenstein Palace",
        "candidates": [
            "File:Lichtenštejnský palác Praha.jpg",
            "File:Liechtenstein Palace Prague.jpg",
            "File:Praha, Malá Strana, Lichtenštejnský palác.jpg",
        ],
        "query": "Liechtenstein Palace Mala Strana Prague",
    },
    {
        "uuid": "064cb275-bdf6-4567-8949-795cc36be204",
        "title_hint": "Tanec Praha New Stage",
        "candidates": [
            "File:Nová scéna ND.jpg",
            "File:New Stage National Theatre Prague.jpg",
            "File:Národní divadlo - Nová scéna.jpg",
        ],
        "query": "New Stage National Theatre Prague Nova scena",
    },
    {
        "uuid": "6e09cb2b-f301-4b98-96f4-25f41b49b518",
        "title_hint": "Vltava sunset cruise",
        "candidates": [
            "File:Vltava in Prague 001.JPG",
            "File:Vltava and Prague Castle at sunset.jpg",
            "File:Sunset over Vltava in Prague.jpg",
        ],
        "query": "Vltava river Prague sunset boat",
    },
    {
        "uuid": "f88da085-99bb-4173-bd8e-7a24e474f2a1",
        "title_hint": "Aerofilms Letna",
        "candidates": [
            "File:Letenská pláň, Praha.jpg",
            "File:Letenské sady Praha.jpg",
            "File:Letna Prague summer evening.jpg",
        ],
        "query": "Letna park Prague summer evening crowd",
    },
    {
        "uuid": "8ed3ee7a-3578-41dc-8d2d-2423d5a5ed28",
        "title_hint": "Vysehrad Verdi summer stage",
        "candidates": [
            "File:Vyšehrad, panoráma.JPG",
            "File:Bazilika svatého Petra a Pavla, Vyšehrad.jpg",
            "File:Vysehrad Prague basilica.jpg",
        ],
        "query": "Vysehrad Prague basilica fortress evening",
    },
    {
        "uuid": "d5f1fa33-db7e-42d5-8a53-53d8f1c3e540",
        "title_hint": "Letna flea market vintage",
        "candidates": [
            "File:Letenská pláň léto.jpg",
            "File:Letna Prague flea market.jpg",
            "File:Letenske sady, Praha 7.jpg",
        ],
        "query": "Letna Prague vintage flea market crowd",
    },
    {
        "uuid": "44a9f19f-1acb-4e78-9ce5-45e9aeb17a44",
        "title_hint": "Stvanice tennis padel",
        "candidates": [
            "File:I._ČLTK_Praha.jpg",
            "File:I CLTK Praha tennis court.jpg",
            "File:Tennis court Stvanice Prague.jpg",
        ],
        "query": "tennis court clay Prague Stvanice",
    },
    {
        "uuid": "d3a94722-96b5-4edf-b7a0-5c79a5728917",
        "title_hint": "Czech cooking goulash",
        "candidates": [
            "File:Goulash Czech.jpg",
            "File:Czech goulash with bread dumplings.jpg",
            "File:Hovězí guláš.jpg",
        ],
        "query": "Czech goulash bread dumplings cooking",
    },
    {
        "uuid": "f3c96795-f804-4c4d-b123-7f005e61e071",
        "title_hint": "Yoga Stromovka park",
        "candidates": [
            "File:Stromovka Praha.jpg",
            "File:Královská obora Stromovka.jpg",
            "File:Yoga in park sunrise.jpg",
        ],
        "query": "Stromovka park Prague meadow morning",
    },
    {
        "uuid": "f9d9a422-2c57-46f0-a80c-33782ba776a8",
        "title_hint": "Startup Drinks Impact Hub",
        "candidates": [
            "File:Impact Hub Prague.jpg",
            "File:Coworking space Prague.jpg",
            "File:Smichov Drtinova Impact Hub.jpg",
        ],
        "query": "coworking event Prague networking startup",
    },
    {
        "uuid": "49316da7-5351-41a0-a550-a1172793028a",
        "title_hint": "Charles Bridge sunrise",
        "candidates": [
            "File:Charles Bridge at dawn.jpg",
            "File:Charles Bridge sunrise.jpg",
            "File:Karlův most ráno.jpg",
        ],
        "query": "Charles Bridge Prague sunrise dawn",
    },
    {
        "uuid": "ae70c50e-1bdd-40c9-aeb2-e3f43942aeea",
        "title_hint": "Metronome Day 1 Vystaviste",
        "candidates": [
            "File:Průmyslový palác Praha.jpg",
            "File:Vystaviste Praha Holesovice.jpg",
            "File:Industrial Palace Prague.jpg",
        ],
        "query": "Vystaviste Holesovice Prague Industrial Palace",
    },
    {
        "uuid": "1c68b6dc-eace-48ac-b9bd-4c8b593f4b87",
        "title_hint": "Metronome Day 2 Vystaviste",
        "candidates": [
            "File:Music festival concert crowd stage.jpg",
            "File:Vystaviste Holesovice festival.jpg",
            "File:Open air concert Prague.jpg",
        ],
        "query": "music festival concert crowd stage night",
    },
    {
        "uuid": "e05095f9-8b30-4dc3-a3c4-94860e070d31",
        "title_hint": "Kafka tour Old Town",
        "candidates": [
            "File:Kafka monument Prague.jpg",
            "File:Franz Kafka monument.jpg",
            "File:Praha, Staré Město, Kafka.jpg",
        ],
        "query": "Kafka monument Prague Old Town",
    },
    {
        "uuid": "c1138334-876d-4849-9146-592ab5e58170",
        "title_hint": "Czech wine tasting Bokovka",
        "candidates": [
            "File:Wine tasting glasses red white.jpg",
            "File:Wine tasting flight glasses.jpg",
            "File:Moravian wine cellar.jpg",
        ],
        "query": "wine tasting glasses red white moravia",
    },
    {
        "uuid": "f25fcda6-cf9b-4340-93e4-d3fe131735ce",
        "title_hint": "Stand-up comedy open mic",
        "candidates": [
            "File:Stand up comedy microphone stage.jpg",
            "File:Stand up comedy show.jpg",
            "File:Microphone on stage spotlight.jpg",
        ],
        "query": "stand up comedy microphone stage spotlight",
    },
]


# ---- Wikimedia helpers ----------------------------------------------

UA = "LocalisioSystemSeed/1.0 (https://localisio.com; admin@localisio.com)"
WIKI_API = "https://commons.wikimedia.org/w/api.php"
SSL_CTX = ssl._create_unverified_context()


def http_get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_download(url: str, dest: str) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=60) as resp:
        data = resp.read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def wiki_query_imageinfo(file_titles: list[str]) -> dict[str, dict] | None:
    """Bulk-query imageinfo for several File: titles. Returns title->info."""
    titles_param = "|".join(file_titles)
    url = f"{WIKI_API}?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1600&titles={urllib.parse.quote(titles_param)}"
    data = http_get_json(url)
    pages = data.get("query", {}).get("pages", {})
    out = {}
    for p in pages.values():
        title = p.get("title", "")
        if "missing" in p:
            continue
        infos = p.get("imageinfo") or []
        if not infos:
            continue
        out[title] = infos[0]
    return out


def wiki_search_files(query: str, limit: int = 8) -> list[str]:
    """Search Commons file namespace, return list of File: titles."""
    url = f"{WIKI_API}?action=query&format=json&list=search&srsearch={urllib.parse.quote(query)}&srnamespace=6&srlimit={limit}&srprop="
    data = http_get_json(url)
    return [hit["title"] for hit in data.get("query", {}).get("search", [])]


def is_acceptable(info: dict) -> bool:
    mime = (info.get("mime") or "").lower()
    if mime not in ("image/jpeg", "image/png", "image/jpg"):
        return False
    width = info.get("width") or 0
    height = info.get("height") or 0
    if max(width, height) < 1024:
        return False
    return True


def extract_credit(info: dict) -> tuple[str, str, str]:
    meta = info.get("extmetadata") or {}
    author = (meta.get("Artist", {}) or {}).get("value", "Unknown")
    license_short = (meta.get("LicenseShortName", {}) or {}).get("value", "Wikimedia Commons")
    descr_url = info.get("descriptionurl", "")
    return author, license_short, descr_url


def resolve_image(candidates: list[str], query: str) -> dict | None:
    """Try each candidate File: title; fall back to a search query."""
    if candidates:
        results = wiki_query_imageinfo(candidates) or {}
        # honor candidate order
        for cand in candidates:
            info = results.get(cand)
            if info and is_acceptable(info):
                return {"title": cand, **info}

    # Fallback: search
    found = wiki_search_files(query)
    if not found:
        return None
    info_by_title = wiki_query_imageinfo(found) or {}
    for t in found:
        info = info_by_title.get(t)
        if info and is_acceptable(info):
            return {"title": t, **info}
    return None


# ---- Image processing -----------------------------------------------

def to_jpeg_capped(src: str, dst: str, max_edge: int = 1280) -> None:
    """sips: re-encode as JPEG, cap long edge."""
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-Z", str(max_edge), src, "--out", dst],
        check=True, capture_output=True,
    )


# ---- Supabase plumbing ----------------------------------------------

BUCKET = "event-photos"
PUBLIC_BASE_TPL = "{url}/storage/v1/object/public/{bucket}/{path}"


def env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"missing env var: {name}")
    return val.strip()


def upload_to_supabase(*, supabase_url: str, key: str, local_path: str, dest_path: str) -> str:
    full_url = f"{supabase_url}/storage/v1/object/{BUCKET}/{dest_path}"
    # delete any prior copy first; ignore errors.
    subprocess.run(
        [
            "curl", "-sS", "-X", "DELETE",
            "-H", f"apikey: {key}",
            full_url,
        ],
        capture_output=True, text=True,
    )
    out = subprocess.run(
        [
            "curl", "-sS", "-X", "POST",
            "-H", f"apikey: {key}",
            "-H", "Content-Type: image/jpeg",
            "-H", "Cache-Control: max-age=2592000",
            full_url,
            "--data-binary", f"@{local_path}",
        ],
        check=True, capture_output=True, text=True,
    )
    body = out.stdout.strip()
    if "Key" not in body and "Bucket" not in body:
        # parse error
        try:
            parsed = json.loads(body)
            if isinstance(parsed, dict) and parsed.get("error"):
                raise RuntimeError(f"upload failed: {parsed}")
        except json.JSONDecodeError:
            raise RuntimeError(f"upload returned non-JSON: {body!r}")
    return PUBLIC_BASE_TPL.format(
        url=supabase_url.rstrip("/"),
        bucket=BUCKET,
        path=dest_path,
    )


def fetch_event(supabase_url: str, key: str, uuid: str) -> dict | None:
    out = subprocess.run(
        [
            "curl", "-sS",
            "-H", f"apikey: {key}",
            "-H", f"Authorization: Bearer {key}",
            f"{supabase_url}/rest/v1/events?id=eq.{uuid}&select=id,title,photos,description_json&limit=1",
        ],
        check=True, capture_output=True, text=True,
    )
    try:
        rows = json.loads(out.stdout)
    except json.JSONDecodeError:
        return None
    return rows[0] if rows else None


def patch_event(supabase_url: str, key: str, uuid: str, payload: dict) -> bool:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(payload, f, ensure_ascii=False)
        tmp_path = f.name
    try:
        out = subprocess.run(
            [
                "curl", "-sS", "-X", "PATCH",
                "-H", f"apikey: {key}",
                "-H", f"Authorization: Bearer {key}",
                "-H", "Content-Type: application/json",
                "-H", "Prefer: return=minimal",
                f"{supabase_url}/rest/v1/events?id=eq.{uuid}",
                "--data-binary", f"@{tmp_path}",
            ],
            check=True, capture_output=True, text=True,
        )
    finally:
        os.unlink(tmp_path)
    return out.returncode == 0


# ---- Description credit append --------------------------------------

def has_photo_credit(doc: dict) -> bool:
    """Detect whether a Photo: ... line is already in the doc."""
    if not isinstance(doc, dict):
        return False
    for block in doc.get("content", []):
        for node in block.get("content", []) or []:
            text = node.get("text") or ""
            if text.startswith("Photo:"):
                return True
    return False


def append_credit(doc: dict, author_html: str, license_label: str, page_url: str) -> dict:
    # crude HTML-tag strip on author since extmetadata can return <a>..</a>
    cleaned = (
        author_html
        .replace("<", " <")
        .replace(">", "> ")
    )
    import re
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip() or "Unknown"
    license_label = (license_label or "").strip() or "Wikimedia Commons"

    new_para = {
        "type": "paragraph",
        "content": [
            {"type": "text", "text": f"Photo: {cleaned} · {license_label} · "},
            {"type": "text", "text": "Wikimedia Commons", "marks": [
                {"type": "link", "attrs": {"href": page_url}},
            ]},
        ],
    }
    doc.setdefault("content", []).append(new_para)
    return doc


# ---- Main -----------------------------------------------------------

def main() -> None:
    supabase_url = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    successes = 0
    skipped = 0
    failures: list[tuple[str, str]] = []

    for ev in PHOTOS:
        uuid = ev["uuid"]
        hint = ev["title_hint"]
        print(f"\n=== {hint} ({uuid})")

        row = fetch_event(supabase_url, key, uuid)
        if not row:
            print(f"  [!] event row not found")
            failures.append((hint, "row not found"))
            continue

        if row.get("photos"):
            print(f"  [=] already has photos: {row['photos']}")
            skipped += 1
            continue

        info = resolve_image(ev["candidates"], ev["query"])
        if not info:
            print(f"  [!] no acceptable image found")
            failures.append((hint, "no image"))
            continue

        title = info["title"]
        print(f"  [+] picked: {title}  ({info.get('width')}x{info.get('height')})")

        # Pull a thumbnail-rendered URL when offered, else the full URL.
        url = info.get("thumburl") or info.get("url")
        if not url:
            failures.append((hint, "no url in imageinfo"))
            continue

        with tempfile.TemporaryDirectory() as tmp:
            raw_path = os.path.join(tmp, "raw.bin")
            jpg_path = os.path.join(tmp, "cover.jpg")
            try:
                bytes_dl = http_download(url, raw_path)
                if bytes_dl < 80_000:
                    print(f"  [!] downloaded only {bytes_dl} bytes — likely an icon, skipping")
                    failures.append((hint, "too small"))
                    continue
                to_jpeg_capped(raw_path, jpg_path, max_edge=1280)
            except Exception as e:
                print(f"  [!] image processing failed: {e}")
                failures.append((hint, f"download/transcode: {e}"))
                continue

            try:
                public_url = upload_to_supabase(
                    supabase_url=supabase_url, key=key,
                    local_path=jpg_path,
                    dest_path=f"system/{uuid}/cover.jpg",
                )
            except Exception as e:
                print(f"  [!] upload failed: {e}")
                failures.append((hint, f"upload: {e}"))
                continue

        # Patch event row
        author, license_label, descr_url = extract_credit(info)
        doc = row.get("description_json") or {"type": "doc", "content": []}
        if not has_photo_credit(doc):
            doc = append_credit(doc, author, license_label, descr_url)

        ok = patch_event(supabase_url, key, uuid, {
            "photos": [public_url],
            "description_json": doc,
        })
        if not ok:
            failures.append((hint, "PATCH events failed"))
            continue
        print(f"  [✓] saved -> {public_url}")
        successes += 1

    print("\n=== Summary ===")
    print(f"  attached: {successes}")
    print(f"  skipped (already had photo): {skipped}")
    print(f"  failed: {len(failures)}")
    for hint, reason in failures:
        print(f"    - {hint}: {reason}")


if __name__ == "__main__":
    main()
