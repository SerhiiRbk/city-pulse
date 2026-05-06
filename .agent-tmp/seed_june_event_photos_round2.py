#!/usr/bin/env python3
"""
Round-2 photo attach pass for June 2026 Prague events.

Targets only events that still have an empty `photos` array (16 events
after round 1) plus one explicit fix:
  - Mladá Praha — round 1 picked the *Vienna* Liechtenstein Palace; we
    deliberately overwrite that with a Prague Mala Strana shot.

Improvements over the first pass:
  * Broader & more specific search queries.
  * Lower size floor (800px on the long edge) — still good for cards.
  * Each event gets 2-4 search queries tried in order; we accept the
    first acceptable hit.
  * If still nothing, fall back to a generic Prague hero from a
    pre-vetted "safe pile" so no event ships without a cover.
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

UA = "LocalisioSystemSeed/1.0 (https://localisio.com; admin@localisio.com)"
WIKI_API = "https://commons.wikimedia.org/w/api.php"
SSL_CTX = ssl._create_unverified_context()
BUCKET = "event-photos"
PUBLIC_BASE_TPL = "{url}/storage/v1/object/public/{bucket}/{path}"
MIN_LONG_EDGE = 800

# Always-overwrite the Vienna mishap.
FORCE_OVERWRITE = {"3d074e36-b97f-461d-acbb-ad74a081039f"}

# Pre-vetted Prague hero used as last-resort fallback.
SAFE_FALLBACK = "File:Charles Bridge during a pink sunrise in Prague.jpg"


# Each entry: (uuid, hint, [search queries tried in order]).
TARGETS: list[dict[str, Any]] = [
    {
        "uuid": "31af7f17-9d5d-4a44-afae-1a2eb22d83d0",
        "hint": "Children's Day at Prague Zoo",
        "queries": [
            "Zoo Praha entrance",
            "Prague Zoo elephant pavilion",
            "Pavilon goril Praha",
            "Praha Troja zoo",
        ],
    },
    {
        "uuid": "485f803c-a5c1-4127-bb50-207dfb46d160",
        "hint": "Drink-up Cross Club Holesovice",
        "queries": [
            "Cross Club Praha",
            "Holesovice Plynarni Cross Club",
            "Prague nightclub interior",
            "Holesovice industrial Prague",
        ],
    },
    {
        "uuid": "c22d524b-2566-4e8b-a741-0f88d3d5341b",
        "hint": "Bohemia JazzFest Old Town Square",
        "queries": [
            "Old Town Square Prague concert",
            "Staromestske namesti Prague summer",
            "Prague Old Town Square panorama",
            "Praha Staromestske namesti",
        ],
    },
    {
        "uuid": "08058f86-35a9-499f-824b-2457f689f528",
        "hint": "Naplavka farmers market",
        "queries": [
            "Naplavka Prague riverbank",
            "Rasinovo nabrezi Prague farmers market",
            "Praha Naplavka rivers",
            "farmers market Prague stalls",
        ],
    },
    {
        "uuid": "fce4b12f-e225-4620-8b01-3428e50522fa",
        "hint": "United Islands Day 1 Stvanice",
        "queries": [
            "Stvanice island Prague",
            "Stvanice ostrov Praha aerial",
            "Prague Stvanice river view",
            "open air music festival Prague crowd",
        ],
    },
    {
        "uuid": "7272eea0-7a2f-406c-b3d7-0c107c777d74",
        "hint": "United Islands Day 2 Karlin",
        "queries": [
            "Karlin Prague waterfront",
            "Karlin Prague district panorama",
            "Praha Karlin nabrezi",
            "music festival outdoor crowd",
        ],
    },
    {
        "uuid": "f88da085-99bb-4173-bd8e-7a24e474f2a1",
        "hint": "Aerofilms Letna",
        "queries": [
            "Letenska plan Prague",
            "Letna park Prague summer",
            "Praha Letenske sady",
            "Letna outdoor cinema night",
        ],
    },
    {
        "uuid": "8ed3ee7a-3578-41dc-8d2d-2423d5a5ed28",
        "hint": "Vysehrad Verdi summer stage",
        "queries": [
            "Vysehrad basilica towers Prague",
            "Bazilika Petra Pavla Vysehrad",
            "Vysehrad fortress Prague evening",
            "Praha Vysehrad panorama",
        ],
    },
    {
        "uuid": "d5f1fa33-db7e-42d5-8a53-53d8f1c3e540",
        "hint": "Letna flea market vintage",
        "queries": [
            "Letenske sady Prague meadow",
            "vintage flea market stalls outdoor",
            "Prague Letna summer market",
            "Letna park crowd weekend",
        ],
    },
    {
        "uuid": "44a9f19f-1acb-4e78-9ce5-45e9aeb17a44",
        "hint": "Stvanice tennis padel",
        "queries": [
            "I CLTK tennis court clay",
            "Stvanice tennis Prague",
            "clay tennis court professional",
            "tennis padel court Europe",
        ],
    },
    {
        "uuid": "d3a94722-96b5-4edf-b7a0-5c79a5728917",
        "hint": "Czech cooking goulash",
        "queries": [
            "Czech goulash plate dumplings",
            "Hovezi gulas dumplings",
            "Czech cuisine goulash bread",
            "beef goulash Eastern European",
        ],
    },
    {
        "uuid": "f3c96795-f804-4c4d-b123-7f005e61e071",
        "hint": "Yoga Stromovka park",
        "queries": [
            "Stromovka Prague meadow trees",
            "Royal Game Park Prague summer",
            "yoga outdoor sunrise grass",
            "Praha Stromovka",
        ],
    },
    {
        "uuid": "f9d9a422-2c57-46f0-a80c-33782ba776a8",
        "hint": "Startup Drinks Impact Hub",
        "queries": [
            "coworking space modern people",
            "startup networking event Europe",
            "Smichov Prague office building",
            "coworking community meeting",
        ],
    },
    {
        "uuid": "ae70c50e-1bdd-40c9-aeb2-e3f43942aeea",
        "hint": "Metronome Day 1 Vystaviste",
        "queries": [
            "Prumyslovy palac Praha",
            "Vystaviste Holesovice exhibition Prague",
            "Industrial Palace Prague exterior",
            "Vystaviste Prague Holesovice fairgrounds",
        ],
    },
    {
        "uuid": "c1138334-876d-4849-9146-592ab5e58170",
        "hint": "Czech wine tasting Bokovka",
        "queries": [
            "wine tasting glasses red white",
            "Moravian wine cellar bottles",
            "wine bar interior Europe",
            "wine flight glasses sommelier",
        ],
    },
    {
        "uuid": "f25fcda6-cf9b-4340-93e4-d3fe131735ce",
        "hint": "Stand-up comedy open mic",
        "queries": [
            "stand up comedy microphone stage spotlight",
            "comedy club performer microphone",
            "open mic comedy night performer",
            "microphone spotlight stage dark",
        ],
    },
    # Vienna mishap fix ------------------------------------------------
    {
        "uuid": "3d074e36-b97f-461d-acbb-ad74a081039f",
        "hint": "Mlada Praha Liechtenstein Palace (Prague)",
        "queries": [
            "Lichtenstejnsky palac Praha",
            "Lichtenštejnský palác Praha Mala Strana",
            "Mala Strana baroque palace Prague",
            "Sovovy mlyny Mala Strana Praha",
        ],
    },
]


# ---- HTTP / Wikimedia ------------------------------------------------

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


def wiki_imageinfo(file_titles: list[str]) -> dict[str, dict]:
    if not file_titles:
        return {}
    titles_param = "|".join(file_titles)
    url = (
        f"{WIKI_API}?action=query&format=json&prop=imageinfo"
        f"&iiprop=url|size|mime|extmetadata&iiurlwidth=1600"
        f"&titles={urllib.parse.quote(titles_param)}"
    )
    try:
        data = http_get_json(url)
    except Exception as e:
        print(f"  [!] imageinfo error: {e}")
        return {}
    pages = data.get("query", {}).get("pages", {})
    out = {}
    for p in pages.values():
        if "missing" in p:
            continue
        infos = p.get("imageinfo") or []
        if infos:
            out[p.get("title", "")] = infos[0]
    return out


def wiki_search(query: str, limit: int = 10) -> list[str]:
    url = (
        f"{WIKI_API}?action=query&format=json&list=search"
        f"&srsearch={urllib.parse.quote(query)}&srnamespace=6&srlimit={limit}&srprop="
    )
    try:
        data = http_get_json(url)
    except Exception as e:
        print(f"  [!] search error: {e}")
        return []
    return [hit["title"] for hit in data.get("query", {}).get("search", [])]


def is_acceptable(info: dict) -> bool:
    mime = (info.get("mime") or "").lower()
    if mime not in ("image/jpeg", "image/png", "image/jpg"):
        return False
    width = info.get("width") or 0
    height = info.get("height") or 0
    if max(width, height) < MIN_LONG_EDGE:
        return False
    return True


def find_image(queries: list[str]) -> dict | None:
    for q in queries:
        results = wiki_search(q)
        if not results:
            continue
        infos = wiki_imageinfo(results)
        for t in results:
            info = infos.get(t)
            if info and is_acceptable(info):
                return {"title": t, **info}
    # Last resort: pre-vetted hero
    fallback_info = wiki_imageinfo([SAFE_FALLBACK]).get(SAFE_FALLBACK)
    if fallback_info and is_acceptable(fallback_info):
        return {"title": SAFE_FALLBACK, **fallback_info}
    return None


def extract_credit(info: dict) -> tuple[str, str, str]:
    meta = info.get("extmetadata") or {}
    author = (meta.get("Artist", {}) or {}).get("value", "Unknown")
    license_short = (meta.get("LicenseShortName", {}) or {}).get("value", "Wikimedia Commons")
    descr_url = info.get("descriptionurl", "")
    return author, license_short, descr_url


# ---- sips ------------------------------------------------------------

def to_jpeg_capped(src: str, dst: str, max_edge: int = 1280) -> None:
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-Z", str(max_edge), src, "--out", dst],
        check=True, capture_output=True,
    )


# ---- Supabase --------------------------------------------------------

def env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"missing env var: {name}")
    return val.strip()


def upload_to_supabase(*, supabase_url: str, key: str, local_path: str, dest_path: str) -> str:
    full_url = f"{supabase_url}/storage/v1/object/{BUCKET}/{dest_path}"
    subprocess.run(
        ["curl", "-sS", "-X", "DELETE", "-H", f"apikey: {key}", full_url],
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
    try:
        parsed = json.loads(body) if body else None
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, dict) and parsed.get("error"):
        raise RuntimeError(f"upload failed: {parsed}")
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


# ---- Description credit ----------------------------------------------

def has_photo_credit(doc: dict) -> bool:
    if not isinstance(doc, dict):
        return False
    for block in doc.get("content", []):
        for node in block.get("content", []) or []:
            text = node.get("text") or ""
            if text.startswith("Photo:"):
                return True
    return False


def strip_existing_credit(doc: dict) -> dict:
    if not isinstance(doc, dict):
        return doc
    new_content = []
    for block in doc.get("content", []):
        cont = block.get("content") or []
        is_credit = any(
            (n.get("text") or "").startswith("Photo:") for n in cont
        )
        if not is_credit:
            new_content.append(block)
    doc["content"] = new_content
    return doc


def append_credit(doc: dict, author_html: str, license_label: str, page_url: str) -> dict:
    import re
    cleaned = re.sub(r"<[^>]+>", " ", author_html or "")
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


# ---- Main ------------------------------------------------------------

def main() -> None:
    supabase_url = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    successes = 0
    skipped = 0
    failures: list[tuple[str, str]] = []

    for ev in TARGETS:
        uuid = ev["uuid"]
        hint = ev["hint"]
        print(f"\n=== {hint} ({uuid})")

        row = fetch_event(supabase_url, key, uuid)
        if not row:
            failures.append((hint, "row missing"))
            continue

        if row.get("photos") and uuid not in FORCE_OVERWRITE:
            print(f"  [=] already has photos, leaving alone")
            skipped += 1
            continue

        info = find_image(ev["queries"])
        if not info:
            failures.append((hint, "no image after retries"))
            continue

        title = info["title"]
        print(f"  [+] picked: {title}  ({info.get('width')}x{info.get('height')})")

        url = info.get("thumburl") or info.get("url")
        if not url:
            failures.append((hint, "no url"))
            continue

        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "raw.bin")
            jpg = os.path.join(tmp, "cover.jpg")
            try:
                bytes_dl = http_download(url, raw)
                if bytes_dl < 40_000:
                    failures.append((hint, f"image too small {bytes_dl}b"))
                    continue
                to_jpeg_capped(raw, jpg, max_edge=1280)
            except Exception as e:
                failures.append((hint, f"download/transcode: {e}"))
                continue

            try:
                public_url = upload_to_supabase(
                    supabase_url=supabase_url, key=key,
                    local_path=jpg,
                    dest_path=f"system/{uuid}/cover.jpg",
                )
            except Exception as e:
                failures.append((hint, f"upload: {e}"))
                continue

        author, license_label, descr_url = extract_credit(info)
        doc = row.get("description_json") or {"type": "doc", "content": []}
        # if we are overwriting, also clear any prior Photo: credit line
        if uuid in FORCE_OVERWRITE:
            doc = strip_existing_credit(doc)
        if not has_photo_credit(doc):
            doc = append_credit(doc, author, license_label, descr_url)

        ok = patch_event(supabase_url, key, uuid, {
            "photos": [public_url],
            "description_json": doc,
        })
        if not ok:
            failures.append((hint, "PATCH failed"))
            continue
        print(f"  [✓] saved -> {public_url}")
        successes += 1

    print("\n=== Summary ===")
    print(f"  attached: {successes}")
    print(f"  skipped: {skipped}")
    print(f"  failed: {len(failures)}")
    for hint, reason in failures:
        print(f"    - {hint}: {reason}")


if __name__ == "__main__":
    main()
