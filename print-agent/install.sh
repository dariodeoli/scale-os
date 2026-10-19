#!/usr/bin/env bash
set -euo pipefail
# No sudo, package download, remote shell, pairing-token output or service activation.
exec node "$(cd -- "$(dirname -- "$0")" && pwd)/install.mjs" "$@"
