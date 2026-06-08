#!/usr/bin/env bash
# img2datauri.sh - convert image(s) to base64 data URI

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 image1 [image2 ...]" >&2
  exit 1
fi

for img in "$@"; do
  if [ ! -f "$img" ]; then
    echo "Skipping '$img' (not a file)" >&2
    continue
  fi

  mime_type=$(file -b --mime-type "$img" 2>/dev/null)
  if [ -z "$mime_type" ]; then
    echo "Could not detect mime-type for '$img'" >&2
    continue
  fi

  # base64 with no line wrapping (-w0 on GNU base64, --wrap=0 alternative)
  b64=$(base64 "$img" 2>/dev/null || base64 --wrap=0 "$img" 2>/dev/null)
  if [ -z "$b64" ]; then
    echo "base64 failed for '$img'" >&2
    continue
  fi

  echo "# $img"
  echo "data:${mime_type};base64,${b64}"
  echo
done
