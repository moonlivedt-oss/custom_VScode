#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Перевод картинок документации в WebP: клон репозитория весит впятеро меньше.

Скриншоты панели и галерея наборов занимали 20 МБ — четыре пятых веса всего репозитория, и
каждый пересъём скриншотов добавлял в историю ещё по мегабайту. WebP решает это без потери
качества там, где оно важно:

  * скриншоты интерфейса (мелкий текст, резкие границы) кодируются БЕЗ ПОТЕРЬ — lossless WebP
    почти всегда меньше PNG на такой картинке и не мылит подписи;
  * фотографии наборов и превью — с потерями, качество 88: на глаз неотличимо, а вес падает
    на порядок.

Что не трогаем: extension/icon.png (маркетплейс требует PNG) и social-preview.png (GitHub
принимает превью репозитория только PNG/JPG).

Запуск:
    python scripts/optimize_docs.py --dry     показать, что получится
    python scripts/optimize_docs.py           переписать файлы и ссылки в markdown
"""

import argparse
import io
import os
import re
import sys

try:
    from PIL import Image
except ImportError:  # noqa: BLE001
    sys.exit("нужен Pillow: pip install -r requirements-dev.txt")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "docs", "screenshots")
# Файлы, которым формат PNG нужен по требованию площадок.
KEEP_PNG = {"social-preview.png"}
# Скриншоты интерфейса: мелкий текст, кодируем без потерь.
LOSSLESS_RE = re.compile(r"^(menu-|panel-)")
MD_FILES = [
    "README.md",
    "README.en.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "SECURITY.md",
]


def convert(path, dry):
    """PNG -> WebP. Возвращает (старый размер, новый размер) или None, если конвертация не выгодна."""
    name = os.path.basename(path)
    lossless = bool(LOSSLESS_RE.match(name))
    im = Image.open(path).convert("RGBA" if lossless else "RGB")
    out = os.path.splitext(path)[0] + ".webp"
    buf = io.BytesIO()
    if lossless:
        im.save(buf, "WEBP", lossless=True, quality=100, method=6)
    else:
        im.save(buf, "WEBP", quality=88, method=6)
    old, new = os.path.getsize(path), buf.tell()
    if new >= old:
        return None  # не выгодно — оставляем как есть
    if not dry:
        io.open(out, "wb").write(buf.getvalue())
        os.remove(path)
    return (old, new)


def retarget_markdown(renamed, dry):
    """Переписать ссылки в markdown на новые имена файлов."""
    changed = []
    for md in MD_FILES:
        p = os.path.join(ROOT, md)
        if not os.path.exists(p):
            continue
        s = io.open(p, encoding="utf-8", newline="").read()
        orig = s
        for old_name, new_name in renamed.items():
            s = s.replace(old_name, new_name)
        if s != orig:
            changed.append(md)
            if not dry:
                io.open(p, "w", encoding="utf-8", newline="").write(s)
    return changed


def main():
    ap = argparse.ArgumentParser(description="перевод картинок документации в WebP")
    ap.add_argument("--dry", action="store_true", help="только показать результат")
    args = ap.parse_args()

    if not os.path.isdir(IMG_DIR):
        sys.exit("нет папки " + IMG_DIR)

    total_old = total_new = 0
    renamed = {}
    for name in sorted(os.listdir(IMG_DIR)):
        if not name.lower().endswith(".png") or name in KEEP_PNG:
            continue
        res = convert(os.path.join(IMG_DIR, name), args.dry)
        if not res:
            print("  %-28s пропущен (WebP не меньше)" % name)
            continue
        old, new = res
        total_old += old
        total_new += new
        renamed[name] = os.path.splitext(name)[0] + ".webp"
        print(
            "  %-28s %7.0f КБ -> %6.0f КБ  (-%2.0f%%)%s"
            % (
                name,
                old / 1024,
                new / 1024,
                (1 - new / old) * 100,
                "  без потерь" if LOSSLESS_RE.match(name) else "",
            )
        )

    if not renamed:
        print("\nНечего конвертировать.")
        return 0

    md = retarget_markdown(renamed, args.dry)
    print(
        "\nИтого: %.1f МБ -> %.1f МБ (-%.0f%%)"
        % (total_old / 1048576, total_new / 1048576, (1 - total_new / total_old) * 100)
    )
    print("Ссылки обновлены в: %s" % (", ".join(md) if md else "нигде"))
    if args.dry:
        print("(сухой прогон — файлы не тронуты)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
