#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Анализ мастер-кадров наборов: композиция, вырезы, читаемость, разнообразие палитры.

Зачем отдельный инструмент на Python. Рантайм плагина обязан быть лёгким: он меряет картинку
сеткой 32x32 прямо в браузере, и этого хватает, чтобы гасить фон под кодом. Но у ПОДГОТОВКИ
ассетов таких ограничений нет — здесь можно позволить себе полноразмерный анализ, которого
scripts/import-master.js (ffmpeg + средние по колонкам) дать не может:

  * карта «занятости» кадра по градиентам, а не по средней яркости: пёстрая, но тёмная
    листва мешает читать код не меньше, чем светлое пятно, и в колонках это не видно;
  * подбор вырезов перебором позиций под РЕАЛЬНУЮ раскладку окна, а не «левая/правая половина»;
  * проверка читаемости сразу по всем наборам каталога, а не по одному кадру;
  * разнообразие палитры: два набора с почти одинаковым акцентом — это два одинаковых набора;
  * контактный лист всех кадров одной картинкой для README и для беглого просмотра.

Конвертация и запись ассетов остаются за scripts/import-master.js — здесь только измерение
и советы, ни один файл проекта скрипт не меняет (кроме контактного листа по явному флагу).

Установка зависимостей:  pip install -r requirements-dev.txt
Запуск:
    python scripts/analyze_sets.py                 отчёт по всем наборам с мастер-кадром
    python scripts/analyze_sets.py --crops         + предложить вырезы перебором
    python scripts/analyze_sets.py --sheet         + собрать контактный лист
    python scripts/analyze_sets.py --json out.json машиночитаемый отчёт
"""

import argparse
import io
import json
import math
import os
import re
import sys

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # noqa: BLE001
    sys.exit("нужны Pillow и numpy: pip install -r requirements-dev.txt")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETS_JS = os.path.join(ROOT, "src", "core", "sets.js")

# Раскладка окна по умолчанию (доли ширины/высоты). Ровно те пропорции, из которых
# scripts/import-master.js делает вырезы, — держим их в одном месте с ним.
SIDEBAR_W = 0.16
EDITOR_W = 0.56
PANEL_H = 0.22

# Порог читаемости: контраст кода к подложке по WCAG AA для обычного текста.
WCAG_AA = 4.5
# Типовая прозрачность, при которой оценивается кадр (тёмная тема VS Code).
TYPICAL_OP = 0.35
THEME_BG_LUM = 0.021  # editor.background тёмной темы
THEME_FG_LUM = 0.62  # editor.foreground тёмной темы


# ---------------------------------------------------------------- чтение каталога наборов
def read_sets():
    """Достать из src/core/sets.js записи с мастер-кадром: имя, файл, акцент, вырезы, op.

    Разбираем текстом, а не через node: скрипт должен работать и без установленного проекта.
    Нас интересуют только поля, которые нужны анализу, поэтому регулярка простая и терпимая.
    """
    src = io.open(SETS_JS, encoding="utf-8").read()
    out = []
    for m in re.finditer(
        r"\{\s*name:\s*\"([^\"]+)\"([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}", src
    ):
        name, body = m.group(1), m.group(2)
        master = re.search(r"master:\s*\"([^\"]+)\"", body)
        if not master:
            continue
        accent = re.search(r"accent:\s*\"(#[0-9a-fA-F]{6})\"", body)
        op = re.search(r"op:\s*\{[^}]*editor:\s*([0-9.]+)", body)
        crops = {}
        for zone in ("editor", "sidebar", "panel"):
            c = re.search(zone + r":\s*\[([0-9.\s,]+)\]", body)
            if c:
                crops[zone] = [float(x) for x in c.group(1).split(",")]
        out.append(
            {
                "name": name,
                "master": master.group(1),
                "accent": accent.group(1) if accent else None,
                "op": float(op.group(1)) if op else None,
                "crops": crops,
            }
        )
    return out


# ---------------------------------------------------------------- метрики кадра
def srgb_to_lum(arr):
    """Относительная яркость по WCAG для массива RGB 0..255 -> (H, W) 0..1."""
    a = arr.astype(np.float64) / 255.0
    a = np.where(a <= 0.03928, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def busyness(lum):
    """«Занятость» кадра: локальная энергия градиента, сглаженная блоками.

    Средняя яркость не отвечает на вопрос «мешает ли фон читать»: мелкая пёстрая текстура
    сбивает глаз сильнее, чем ровное светлое пятно той же яркости. Считаем модуль градиента —
    это дешёвая и честная оценка мелкой детализации.
    """
    gy, gx = np.gradient(lum)
    return np.hypot(gx, gy)


def zone_cost(lum, busy, box):
    """Цена области под код: яркость + детализация. Меньше — спокойнее."""
    x0, y0, x1, y1 = box
    l = lum[y0:y1, x0:x1]
    b = busy[y0:y1, x0:x1]
    return float(l.mean() * 1.0 + b.mean() * 6.0 + l.std() * 0.8)


def readability(lum, box, op):
    """Контраст кода к подложке в области: среднее и худший участок (блок 8x8)."""
    x0, y0, x1, y1 = box
    part = lum[y0:y1, x0:x1]
    if part.size == 0:
        return (0.0, 0.0)
    h, w = part.shape
    bh, bw = max(1, h // 8), max(1, w // 8)
    worst = 0.0
    for r in range(8):
        for c in range(8):
            blk = part[r * bh : (r + 1) * bh, c * bw : (c + 1) * bw]
            if blk.size:
                worst = max(worst, float(blk.mean()))

    def ratio(l):
        mix = (1 - op) * THEME_BG_LUM + op * l
        hi, lo = max(THEME_FG_LUM, mix), min(THEME_FG_LUM, mix)
        return (hi + 0.05) / (lo + 0.05)

    return (ratio(float(part.mean())), ratio(worst))


# ---------------------------------------------------------------- подбор вырезов
def suggest_crops(lum, busy, current=None):
    """Перебрать позиции зон и выбрать те, где коду спокойнее всего.

    ffmpeg-версия сравнивает ровно две половины кадра. Здесь редактор двигается по всей
    ширине с шагом 2 %, а сайдбар ставится с противоположного края — туда, где сюжет.
    Панель берём снизу: в окне она всегда внизу, выбирать нечего.
    """
    H, W = lum.shape
    ew = int(W * EDITOR_W)
    # Текущую позицию обязательно кладём в кандидаты: шаг перебора может её перескочить,
    # и тогда «лучший» вариант окажется хуже того, что уже стоит в наборе.
    candidates = list(range(0, W - ew + 1, max(1, W // 50)))
    if current:
        cx = int(W * current[0] / 100)
        if 0 <= cx <= W - ew:
            candidates.append(cx)
    best = None
    for x in candidates:
        cost = zone_cost(lum, busy, (x, 0, x + ew, H))
        if best is None or cost < best[0]:
            best = (cost, x)
    _, ex = best
    editor = [round(ex / W * 100), 0, round(EDITOR_W * 100), 100]
    # Сайдбар — с той стороны, где редактора нет (там осталась «интересная» часть кадра).
    on_right = ex > (W - ew - ex)
    sb_x = 0 if on_right else round((1 - SIDEBAR_W) * 100)
    return {
        "editor": editor,
        "sidebar": [sb_x, 0, round(SIDEBAR_W * 100), 100],
        "panel": [0, round((1 - PANEL_H) * 100), 100, round(PANEL_H * 100)],
        "editor_side": "справа" if on_right else "слева",
    }


def box_from_crop(crop, W, H):
    x, y, w, h = crop
    return (
        int(W * x / 100),
        int(H * y / 100),
        int(W * (x + w) / 100),
        int(H * (y + h) / 100),
    )


# ---------------------------------------------------------------- палитра каталога
def hex_to_hue(hexstr):
    """Оттенок акцента в градусах — для проверки разнообразия каталога."""
    r, g, b = (int(hexstr[i : i + 2], 16) / 255 for i in (1, 3, 5))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return None
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60


def palette_diversity(sets):
    """Пары наборов, у которых акценты почти совпадают (< 20°): каталог теряет разнообразие."""
    hues = [(s["name"], hex_to_hue(s["accent"])) for s in sets if s.get("accent")]
    close = []
    for i in range(len(hues)):
        for j in range(i + 1, len(hues)):
            a, b = hues[i][1], hues[j][1]
            if a is None or b is None:
                continue
            d = abs(a - b) % 360
            d = min(d, 360 - d)
            if d < 20:
                close.append((hues[i][0], hues[j][0], round(d)))
    return close


# ---------------------------------------------------------------- контактный лист
def _label_font(size=13):
    """Шрифт с кириллицей: встроенный в PIL растровый её не умеет и рисует квадраты.
    Ищем системный TrueType, иначе честно откатываемся на дефолтный.
    """
    for name in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:  # noqa: BLE001
            continue
    return None


def contact_sheet(sets, out_path, cols=4, cell=(420, 180)):
    """Все мастер-кадры одной картинкой: удобно и для README, и чтобы увидеть каталог целиком."""
    rows = (len(sets) + cols - 1) // cols
    pad, label_h = 8, 22
    W = cols * (cell[0] + pad) + pad
    H = rows * (cell[1] + label_h + pad) + pad
    sheet = Image.new("RGB", (W, H), (24, 24, 37))
    draw = ImageDraw.Draw(sheet)
    font = _label_font()
    for n, s in enumerate(sets):
        path = os.path.join(ROOT, s["master"])
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert("RGB").resize(cell, Image.LANCZOS)
        cx = pad + (n % cols) * (cell[0] + pad)
        cy = pad + (n // cols) * (cell[1] + label_h + pad)
        sheet.paste(im, (cx, cy))
        label = s["name"] + "   " + (s["accent"] or "")
        draw.text((cx + 4, cy + cell[1] + 4), label, fill=(205, 214, 244), font=font)
        if s.get("accent"):
            draw.rectangle(
                [cx + cell[0] - 18, cy + 4, cx + cell[0] - 4, cy + 18],
                fill=tuple(int(s["accent"][i : i + 2], 16) for i in (1, 3, 5)),
            )
    sheet.save(out_path, quality=88)
    return out_path


# ---------------------------------------------------------------- отчёт
def analyze(s, want_crops):
    path = os.path.join(ROOT, s["master"])
    if not os.path.exists(path):
        return {"name": s["name"], "error": "файл не найден: " + s["master"]}
    im = Image.open(path).convert("RGB")
    small = im.resize((256, max(1, round(256 * im.height / im.width))), Image.LANCZOS)
    arr = np.asarray(small)
    lum = srgb_to_lum(arr)
    busy = busyness(lum)
    H, W = lum.shape

    op = s["op"] if s["op"] is not None else 0.06
    res = {
        "name": s["name"],
        "master": s["master"],
        "size": [im.width, im.height],
        "aspect": round(im.width / im.height, 2),
        "mean_luma": round(float(lum.mean()), 3),
        "busy": round(float(busy.mean()), 4),
        "accent": s["accent"],
    }
    if s["crops"].get("editor"):
        box = box_from_crop(s["crops"]["editor"], W, H)
        mean_r, worst_r = readability(lum, box, TYPICAL_OP)
        res["editor_ratio"] = round(mean_r, 1)
        res["editor_worst"] = round(worst_r, 1)
        mean_d, worst_d = readability(lum, box, op)
        res["default_worst"] = round(worst_d, 1)
        res["default_op"] = op
    if want_crops:
        res["suggested"] = suggest_crops(lum, busy, s["crops"].get("editor"))
        if s["crops"].get("editor"):
            cur = zone_cost(lum, busy, box_from_crop(s["crops"]["editor"], W, H))
            new = zone_cost(lum, busy, box_from_crop(res["suggested"]["editor"], W, H))
            res["cost_now"], res["cost_best"] = round(cur, 4), round(new, 4)
            # Советуем менять только при заметном выигрыше: сдвиг ради тысячных долей — шум.
            res["worth_changing"] = new < cur * 0.95
    return res


def main():
    ap = argparse.ArgumentParser(description="анализ мастер-кадров наборов")
    ap.add_argument(
        "--crops", action="store_true", help="предложить вырезы перебором позиций"
    )
    ap.add_argument(
        "--sheet",
        action="store_true",
        help="собрать контактный лист в docs/screenshots/",
    )
    ap.add_argument("--json", metavar="ФАЙЛ", help="записать отчёт машиночитаемо")
    args = ap.parse_args()

    sets = read_sets()
    if not sets:
        sys.exit("в src/core/sets.js нет наборов с мастер-кадром")
    print("Наборов с мастер-кадром: %d\n" % len(sets))

    report = []
    problems = 0
    for s in sets:
        r = analyze(s, args.crops)
        report.append(r)
        if "error" in r:
            problems += 1
            print("  %-22s %s" % (r["name"], r["error"]))
            continue
        flag = ""
        if r.get("default_worst") is not None and r["default_worst"] < WCAG_AA:
            flag = (
                "  <- худший участок ниже AA при стартовой прозрачности %.2f"
                % r["default_op"]
            )
            problems += 1
        print(
            "  %-22s  яркость %.3f · занятость %.4f · контраст при 0.35: %.1f (худший %.1f)%s"
            % (
                r["name"],
                r["mean_luma"],
                r["busy"],
                r.get("editor_ratio", 0),
                r.get("editor_worst", 0),
                flag,
            )
        )
        if args.crops and "suggested" in r:
            sg = r["suggested"]
            if r.get("worth_changing"):
                print("        вырез редактора: сейчас %s -> лучше %s (%s), цена %.4f -> %.4f"
                      % (s["crops"].get("editor"), sg["editor"], sg["editor_side"], r["cost_now"], r["cost_best"]))
            else:
                print("        вырез редактора: текущий близок к оптимуму (цена %.4f, лучшая найденная %.4f)"
                      % (r["cost_now"], r["cost_best"]))

    close = palette_diversity(sets)
    print(
        "\nРазнообразие палитры: %s"
        % ("все акценты разнесены" if not close else "%d близких пар" % len(close))
    )
    for a, b, d in close:
        print("  %s и %s — расхождение %d°" % (a, b, d))

    if args.sheet:
        out = os.path.join(ROOT, "docs", "screenshots", "sets-contact-sheet.jpg")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        contact_sheet(sets, out)
        print("\nКонтактный лист: %s" % os.path.relpath(out, ROOT))

    if args.json:
        io.open(args.json, "w", encoding="utf-8").write(
            json.dumps(report, ensure_ascii=False, indent=2)
        )
        print("Отчёт: %s" % args.json)

    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
