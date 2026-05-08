"""
Re-compress dist/ into build_gz/www/ as gzipped assets so the firmware can
serve them straight off LittleFS with Content-Encoding: gzip.

Why this script and not vite's compressor:
  * Vite's bundle filenames are content-hashed (vite.config.ts -> entryFileNames
    `[hash][extname]`). Without an explicit clean step a rebuild keeps the
    previous hash files around alongside the new ones, which doubled the
    size of build_gz/www/ across iterative builds and pushed the firmware
    image past the 4 MB v3 SPIFFS partition (411 KB). We rmtree the output
    dir before writing anything.
  * We skip `.DS_Store` (macOS metadata, useless on the device) and
    `openapi.yml` (the JSON form is what `/api.html` loads — see
    src/routes/api/+page.svelte; the YAML is the source-of-truth and only
    needs to live in static/). Every byte saved on the SPIFFS image
    translates directly into headroom for the bundle.
"""

import gzip
import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from shutil import copyfileobj

# Files we never want on the device. .DS_Store is macOS Finder metadata;
# openapi.yml duplicates openapi.json on-disk and isn't fetched by /api.html.
SKIP_FILES = {".DS_Store", "openapi.yml"}


def gzip_file(input_file: str, output_file: str) -> None:
    with open(input_file, "rb") as f_in:
        with gzip.open(output_file, "wb") as f_out:
            copyfileobj(f_in, f_out)


def process_directory(input_dir: str, output_dir: str) -> None:
    # Wipe stale hash-named bundles/CSS from prior builds. Without this,
    # iterative `pnpm build:gz` runs accumulate every previous bundle
    # alongside the current one and silently inflate the firmware image.
    out = Path(output_dir)
    if out.exists():
        shutil.rmtree(out)

    for root, _dirs, files in os.walk(input_dir):
        relative_path = os.path.relpath(root, input_dir)
        output_root = os.path.join(output_dir, relative_path)
        Path(output_root).mkdir(parents=True, exist_ok=True)

        for file in files:
            if file in SKIP_FILES:
                print(f"Skipped: {os.path.join(root, file)}")
                continue
            input_file_path = os.path.join(root, file)
            output_file_path = os.path.join(output_root, file + ".gz")
            gzip_file(input_file_path, output_file_path)
            print(f"Compressed: {input_file_path} -> {output_file_path}")


input_directory = "dist"
# Files must land under build_gz/www/ so the root of the LittleFS image
# created by `littlefs-python create data/build_gz …` matches the
# webserver's expectation at runtime (kWebRootBase = "/lfs/www" in
# components/webserver/control_server.cpp). Without the www/ prefix
# every static GET 404's against a fresh flash.
output_directory = "build_gz/www"

process_directory(input_directory, output_directory)


def webui_rev() -> str:
    # Full 40-char SHA of HEAD in the WebUI submodule, with `-dirty` appended
    # when the working tree has uncommitted changes. Matches the convention
    # the v3-era WebUI CI used (`echo "$GITHUB_SHA" > output/commit.txt`).
    # The firmware reads this at request time
    # (components/webserver/control_server.cpp) and exposes it as `fsRev`
    # in /api/settings. The frontend truncates for display.
    try:
        rev = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL
        ).decode().strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""
    try:
        dirty = subprocess.call(
            ["git", "diff", "--quiet", "HEAD"], stderr=subprocess.DEVNULL
        ) != 0
    except (subprocess.CalledProcessError, FileNotFoundError):
        dirty = False
    return f"{rev}-dirty" if dirty else rev


# `manifest.json` is the single source of truth for the WebUI/firmware
# compatibility contract. Its `minFirmware` field is read at WebUI
# build-time (src/lib/util/version.ts imports src/lib/manifest.json) AND
# baked into the LittleFS image here so a `curl /manifest.json` against
# the device exposes the same value for tooling. `commit` lets the
# firmware report `fsRev` in /api/settings independent of the firmware's
# own version stamp — i.e. an OTA-flashed LittleFS image is reflected
# immediately rather than tracking the firmware partition. The plain
# text is ~120 bytes; small enough that we ship it ungzipped to avoid
# forcing a gunzip path on the device.
manifest_src = Path("src/lib/manifest.json")
try:
    manifest_data = json.loads(manifest_src.read_text())
except FileNotFoundError:
    print(f"WARNING: {manifest_src} missing; using minFirmware=unknown")
    manifest_data = {"minFirmware": "unknown"}

rev = webui_rev()
manifest_out = {
    "commit": rev,
    "minFirmware": manifest_data.get("minFirmware", "unknown"),
    "buildTime": int(time.time()),
}
manifest_path = Path(output_directory) / "manifest.json"
manifest_path.write_text(json.dumps(manifest_out, indent="\t") + "\n")
print(f"Wrote: {manifest_path} ({manifest_out})")

# Backwards-compat: the firmware's first cut of fs_rev support read
# /lfs/www/commit.txt directly. Keep emitting it so older firmware
# flashed against a newer LittleFS image still surfaces fsRev. The
# firmware-side reader prefers manifest.json when present.
if rev:
    commit_path = Path(output_directory) / "commit.txt"
    commit_path.write_text(rev + "\n")
    print(f"Wrote: {commit_path} ({rev})")
