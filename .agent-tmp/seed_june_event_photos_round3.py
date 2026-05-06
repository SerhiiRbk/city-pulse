#!/usr/bin/env python3
"""
Round 3: targeted fixes for the 6 events whose round-2 photos were
clearly off-topic. Forces overwrite.

Map of UUID -> hand-picked Wikimedia Commons File: title.
"""

from __future__ import annotations
import json, os, re, ssl, subprocess, sys, tempfile, urllib.parse, urllib.request

UA = "LocalisioSystemSeed/1.0 (https://localisio.com; admin@localisio.com)"
WIKI_API = "https://commons.wikimedia.org/w/api.php"
SSL_CTX = ssl._create_unverified_context()
BUCKET = "event-photos"
PUBLIC_TPL = "{url}/storage/v1/object/public/{bucket}/{path}"

# uuid -> File: title (validated by hand via Wikimedia search)
FIXES = [
    # Bohemia JazzFest -> actual festival photo on Old Town Square
    ("c22d524b-2566-4e8b-a741-0f88d3d5341b",
     "Bohemia JazzFest",
     "File:Bohemia Jazz Fest na Staroměstském náměstí v Praze.jpg"),
    # United Islands Day 2 Karlin -> Karlin embankment view
    ("7272eea0-7a2f-406c-b3d7-0c107c777d74",
     "Karlin embankment",
     "File:Karlin z Bubenskeho nabrezi Praha.jpg"),
    # Aerofilms Letna -> Hanavsky pavilion + Letna pond at night (atmospheric)
    ("f88da085-99bb-4173-bd8e-7a24e474f2a1",
     "Letna outdoor cinema (Hanavsky pavilon at night)",
     "File:Letenský rybník a Hanavský pavilón v noci.jpg"),
    # Letna flea market -> Letenské sady wide
    ("d5f1fa33-db7e-42d5-8a53-53d8f1c3e540",
     "Letna flea market (Letenske sady view)",
     "File:Praha, Letenské sady, výhled.jpg"),
    # Stromovka yoga -> actual Stromovka park lake
    ("f3c96795-f804-4c4d-b123-7f005e61e071",
     "Stromovka park lake",
     "File:Stromovka, jezírko u Místodržitelského letohrádku.jpg"),
    # Standup comedy -> a real stand-up performer photo
    ("f25fcda6-cf9b-4340-93e4-d3fe131735ce",
     "Stand-up comedian on stage",
     "File:Comedian Chad Daniels performing live.jpg"),
]


def http_get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def http_download(url: str, dest: str) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=60) as r:
        data = r.read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def imageinfo(file_title: str) -> dict | None:
    url = (
        f"{WIKI_API}?action=query&format=json&prop=imageinfo"
        f"&iiprop=url|size|mime|extmetadata&iiurlwidth=1600"
        f"&titles={urllib.parse.quote(file_title)}"
    )
    data = http_get_json(url)
    pages = data.get("query", {}).get("pages", {})
    for p in pages.values():
        if "missing" in p:
            return None
        infos = p.get("imageinfo") or []
        if infos:
            return {"title": p.get("title", ""), **infos[0]}
    return None


def env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        sys.exit(f"missing env var: {name}")
    return v.strip()


def upload(supabase_url: str, key: str, local: str, dest: str) -> str:
    full = f"{supabase_url}/storage/v1/object/{BUCKET}/{dest}"
    subprocess.run(
        ["curl", "-sS", "-X", "DELETE", "-H", f"apikey: {key}", full],
        capture_output=True, text=True,
    )
    subprocess.run(
        [
            "curl", "-sS", "-X", "POST",
            "-H", f"apikey: {key}",
            "-H", "Content-Type: image/jpeg",
            "-H", "Cache-Control: max-age=2592000",
            full,
            "--data-binary", f"@{local}",
        ],
        check=True, capture_output=True, text=True,
    )
    return PUBLIC_TPL.format(url=supabase_url.rstrip("/"), bucket=BUCKET, path=dest)


def fetch_event(supabase_url: str, key: str, uuid: str) -> dict | None:
    out = subprocess.run(
        [
            "curl", "-sS",
            "-H", f"apikey: {key}",
            "-H", f"Authorization: Bearer {key}",
            f"{supabase_url}/rest/v1/events?id=eq.{uuid}&select=id,description_json&limit=1",
        ],
        check=True, capture_output=True, text=True,
    )
    rows = json.loads(out.stdout)
    return rows[0] if rows else None


def patch_event(supabase_url: str, key: str, uuid: str, payload: dict) -> bool:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(payload, f, ensure_ascii=False)
        tmp = f.name
    try:
        out = subprocess.run(
            [
                "curl", "-sS", "-X", "PATCH",
                "-H", f"apikey: {key}",
                "-H", f"Authorization: Bearer {key}",
                "-H", "Content-Type: application/json",
                "-H", "Prefer: return=minimal",
                f"{supabase_url}/rest/v1/events?id=eq.{uuid}",
                "--data-binary", f"@{tmp}",
            ],
            check=True, capture_output=True, text=True,
        )
    finally:
        os.unlink(tmp)
    return out.returncode == 0


def strip_credit(doc: dict) -> dict:
    new = []
    for block in doc.get("content", []):
        cont = block.get("content") or []
        if any((n.get("text") or "").startswith("Photo:") for n in cont):
            continue
        new.append(block)
    doc["content"] = new
    return doc


def append_credit(doc: dict, author_html: str, lic: str, page_url: str) -> dict:
    cleaned = re.sub(r"<[^>]+>", " ", author_html or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip() or "Unknown"
    lic = (lic or "").strip() or "Wikimedia Commons"
    doc.setdefault("content", []).append({
        "type": "paragraph",
        "content": [
            {"type": "text", "text": f"Photo: {cleaned} · {lic} · "},
            {"type": "text", "text": "Wikimedia Commons", "marks": [
                {"type": "link", "attrs": {"href": page_url}},
            ]},
        ],
    })
    return doc


def main() -> None:
    supabase_url = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    ok = 0
    fail = []

    for uuid, hint, file_title in FIXES:
        print(f"\n=== {hint} ({uuid})")
        info = imageinfo(file_title)
        if not info:
            fail.append((hint, f"missing on Commons: {file_title}"))
            continue
        url = info.get("thumburl") or info.get("url")
        print(f"  picked: {info['title']} ({info.get('width')}x{info.get('height')})")

        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "raw.bin")
            jpg = os.path.join(tmp, "cover.jpg")
            try:
                http_download(url, raw)
                subprocess.run(
                    ["sips", "-s", "format", "jpeg", "-Z", "1280", raw, "--out", jpg],
                    check=True, capture_output=True,
                )
                public_url = upload(
                    supabase_url, key, jpg,
                    f"system/{uuid}/cover.jpg",
                )
            except Exception as e:
                fail.append((hint, f"processing: {e}"))
                continue

        meta = info.get("extmetadata") or {}
        author = (meta.get("Artist", {}) or {}).get("value", "Unknown")
        lic = (meta.get("LicenseShortName", {}) or {}).get("value", "Wikimedia Commons")
        descr_url = info.get("descriptionurl", "")

        row = fetch_event(supabase_url, key, uuid) or {}
        doc = row.get("description_json") or {"type": "doc", "content": []}
        doc = strip_credit(doc)
        doc = append_credit(doc, author, lic, descr_url)

        if patch_event(supabase_url, key, uuid, {"photos": [public_url], "description_json": doc}):
            ok += 1
            print(f"  saved -> {public_url}")
        else:
            fail.append((hint, "PATCH failed"))

    print(f"\nDone: ok={ok}, failed={len(fail)}")
    for h, r in fail:
        print(f"  - {h}: {r}")


if __name__ == "__main__":
    main()
