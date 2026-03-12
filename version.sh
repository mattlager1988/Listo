#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_CSPROJ="$SCRIPT_DIR/listo/listo-api/Listo.Api.csproj"
WEB_PKG="$SCRIPT_DIR/listo/listo-web/package.json"
MOBILE_PKG="$SCRIPT_DIR/listo/listo-mobile/package.json"

get_api_version() {
  grep -oP '(?<=<Version>)[^<]+' "$API_CSPROJ"
}

get_web_version() {
  grep -oP '(?<="version": ")[^"]+' "$WEB_PKG"
}

get_mobile_version() {
  grep -oP '(?<="version": ")[^"]+' "$MOBILE_PKG"
}

set_api_version() {
  sed -i "s|<Version>[^<]*</Version>|<Version>$1</Version>|" "$API_CSPROJ"
}

set_web_version() {
  sed -i "s|\"version\": \"[^\"]*\"|\"version\": \"$1\"|" "$WEB_PKG"
}

set_mobile_version() {
  sed -i "s|\"version\": \"[^\"]*\"|\"version\": \"$1\"|" "$MOBILE_PKG"
}

print_versions() {
  printf "  api:    %s\n" "$(get_api_version)"
  printf "  web:    %s\n" "$(get_web_version)"
  printf "  mobile: %s\n" "$(get_mobile_version)"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [args]

Commands:
  show                        Print all versions
  set-all <version>           Set api, web, and mobile to the same version
  set-api <version>           Set api version
  set-web <version>           Set web version
  set-mobile <version>        Set mobile version

Examples:
  $(basename "$0") show
  $(basename "$0") set-all 7.0.0
  $(basename "$0") set-api 6.1.0
EOF
}

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

case "$1" in
  show)
    print_versions
    ;;
  set-all)
    [[ $# -lt 2 ]] && { echo "Error: version required"; exit 1; }
    set_api_version "$2"
    set_web_version "$2"
    set_mobile_version "$2"
    echo "All versions set to $2"
    print_versions
    ;;
  set-api)
    [[ $# -lt 2 ]] && { echo "Error: version required"; exit 1; }
    set_api_version "$2"
    echo "API version set to $2"
    print_versions
    ;;
  set-web)
    [[ $# -lt 2 ]] && { echo "Error: version required"; exit 1; }
    set_web_version "$2"
    echo "Web version set to $2"
    print_versions
    ;;
  set-mobile)
    [[ $# -lt 2 ]] && { echo "Error: version required"; exit 1; }
    set_mobile_version "$2"
    echo "Mobile version set to $2"
    print_versions
    ;;
  *)
    echo "Unknown command: $1"
    usage
    exit 1
    ;;
esac
