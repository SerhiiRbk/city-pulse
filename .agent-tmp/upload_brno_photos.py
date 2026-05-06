#!/usr/bin/env python3
"""
Upload Wikimedia Commons images to existing Brno events.
Events were already created; this script downloads images and updates the photos[] array.

Run:
  set -a && . .env.local && set +a
  python3 .agent-tmp/upload_brno_photos.py
"""

import json
import os
import ssl
import sys
import time
import uuid
import urllib.request
import urllib.error
import urllib.parse

ssl._create_default_https_context = ssl._create_unverified_context

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Set env vars")
    sys.exit(1)

STORAGE_BUCKET = "event-photos"

# Event titles → Wikimedia image URLs (full-size originals)
EVENTS_IMAGES = [
    {
        "title": "Brněnská muzejní noc 2026",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Brno,_Jan%C3%A1%C4%8Dek_Theatre_illuminated_in_November_2015_(8675).jpg",
    },
    {
        "title": "Legiovlak 2026 — legionářské muzeum na kolejích v Brně",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Brno_Spilberk_142.JPG",
    },
    {
        "title": "Večerníček 60 let — výstava plná pohádek v Brně",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Hrad_%C5%A0pilberk_(Brno)_(7).jpg",
    },
    {
        "title": "Oživlý hrad Boskovice 2026",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Brno_-_panoramio.jpg",
    },
    {
        "title": "FaVU VUT — Plochy & Prostory",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Brno,_n%C3%A1m%C4%9Bst%C3%AD_Svobody.jpg",
    },
]


def find_event(title: str):
    """Find event by title."""
    url = f"{SUPABASE_URL}/rest/v1/events?title=eq.{urllib.parse.quote(title)}&select=id,photos"
    headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        return data[0] if data else None


def download_image(url: str) -> tuple[bytes, str] | None:
    """Download image, return (data, content_type)."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (localisio-seed-bot/1.0; https://localisio.com)"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read(), resp.headers.get("Content-Type", "image/jpeg")
    except Exception as e:
        print(f"  ERROR downloading: {e}")
        return None


def upload_to_storage(image_data: bytes, content_type: str, event_id: str) -> str | None:
    """Upload to Supabase Storage, return public URL."""
    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"

    file_path = f"events/{event_id}/{uuid.uuid4().hex[:12]}.{ext}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{file_path}"

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
        return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{file_path}"
    except urllib.error.HTTPError as e:
        err = e.read().decode() if e.fp else ""
        print(f"  ERROR uploading: HTTP {e.code}: {err[:200]}")
        return None


def update_event_photos(event_id: str, photos: list[str]):
    """Update event photos array."""
    url = f"{SUPABASE_URL}/rest/v1/events?id=eq.{event_id}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    data = json.dumps({"photos": photos}).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
        return True
    except urllib.error.HTTPError as e:
        err = e.read().decode() if e.fp else ""
        print(f"  ERROR updating: HTTP {e.code}: {err[:200]}")
        return False


def main():
    print("Uploading images to Brno events...")
    print()

    for item in EVENTS_IMAGES:
        title = item["title"]
        print(f"--- {title} ---")

        event = find_event(title)
        if not event:
            print("  SKIP: event not found")
            continue

        event_id = event["id"]
        existing_photos = event.get("photos") or []

        if existing_photos:
            print(f"  SKIP: already has {len(existing_photos)} photo(s)")
            continue

        # Download
        print(f"  Downloading from Wikimedia...")
        result = download_image(item["image_url"])
        if not result:
            continue

        image_data, content_type = result
        print(f"  Downloaded {len(image_data) / 1024:.0f} KB ({content_type})")

        # Upload to storage
        public_url = upload_to_storage(image_data, content_type, event_id)
        if not public_url:
            continue

        # Update event
        if update_event_photos(event_id, [public_url]):
            print(f"  ✓ Photo set: {public_url[:70]}...")
        else:
            print(f"  ✗ Failed to update event")

        # Rate limit courtesy
        time.sleep(1)

    print()
    print("Done!")


if __name__ == "__main__":
    main()
