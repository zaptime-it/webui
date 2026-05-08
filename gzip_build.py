"""
Re-compress dist/ into build_gz/www/ as gzipped assets so the firmware can
serve them straight off LittleFS with Content-Encoding: gzip.

Important: Vite emits content-hashed filenames (see vite.config.ts). If we
don't delete the previous output before gzipping a new build, stale hash
files accumulate and the LittleFS image size silently grows across rebuilds.
"""

import gzip
import os
import shutil
from pathlib import Path
from shutil import copyfileobj

SKIP_FILES = {".DS_Store", "swagger.yml"}


def gzip_file(input_file: str, output_file: str) -> None:
    with open(input_file, "rb") as f_in:
        with gzip.open(output_file, "wb") as f_out:
            copyfileobj(f_in, f_out)


def process_directory(input_dir: str, output_dir: str) -> None:
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