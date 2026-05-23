#!/bin/sh
set -eu

OUT_DIR="${1:-pages-dist}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cp index.html "$OUT_DIR/"
cp script.js "$OUT_DIR/"
cp styles.css "$OUT_DIR/"

printf 'Built %s with:\n' "$OUT_DIR"
find "$OUT_DIR" -type f | sort
