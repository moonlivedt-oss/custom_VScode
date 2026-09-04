#!/usr/bin/env bash
# Тонкая обёртка над install.js (macOS / Linux). Требует Node.js.
# Прописывает путь к custom-bg.js в settings.json найденных редакторов.
# Примеры:  ./install.sh            (все найденные)
#           ./install.sh --app code
#           ./install.sh --dry
set -e
if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js (node не найден в PATH). Установи Node и повтори." >&2
  exit 1
fi
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$DIR/install.js" "$@"
