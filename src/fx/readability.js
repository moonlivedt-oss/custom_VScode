// ===== Читаемость кода поверх фона =====
// Три уровня одной задачи «код должен читаться»: авто-дим по средней яркости кадра,
// адаптивный скрим по карте яркости 8x8 (гасим только светлые участки) и метр контраста,
// который считает реальную подложку под кодом и умеет подобрать прозрачность сам.

// Коэффициент занижения яркости editor по средней светлоте картинки: тёмные/средние —
// как есть (1.0), почти белые — до ~0.4, чтобы код не «слепило». Плавно между.
function lumaDimFactor(luma) {
    if (luma == null || luma <= 0.55) return 1;
    var t = Math.min(1, (luma - 0.55) / 0.35); // 0.55..0.90 -> 0..1
    return 1 - 0.6 * t;                          // -> 1.0 .. 0.4
}

// ===== Адаптивный скрим: гасим фон ТОЧЕЧНО, где светло =====
// Обычный «ползунок прозрачности» — это компромисс на весь кадр: опустишь ради читаемости
// над ярким окном — и вся остальная картинка исчезнет. Здесь мы знаем карту яркости 8x8
// (probeImage -> st.grid) и подмешиваем поверх картинки несколько мягких тёмных пятен ровно
// в те ячейки, что светлее комфортного порога. Слой рисуется ВНУТРИ фонового оверлея зоны,
// то есть локально уменьшает вклад картинки — там, где он мешает, и только там.
var READ_TARGET = 0.22;   // комфортная яркость подложки под кодом (WCAG-яркость 0..1)
var READ_MAX_SPOTS = 4;   // больше пятен = длиннее CSS без заметной пользы
// Ячейки карты, попадающие в видимую область зоны, с позицией уже в координатах зоны.
// crop — [x,y,w,h] в процентах кадра (набор с мастер-картинкой) или null (видно весь кадр).
function _readSpots(grid, crop) {
    var G = 8, out = [], gx, gy, cx, cy, v;
    for (gy = 0; gy < G; gy++) {
        for (gx = 0; gx < G; gx++) {
            v = grid[gy * G + gx];
            if (typeof v !== "number" || v <= READ_TARGET) continue;
            cx = (gx + 0.5) / G * 100; cy = (gy + 0.5) / G * 100;
            if (crop) {
                if (cx < crop[0] || cx > crop[0] + crop[2] || cy < crop[1] || cy > crop[1] + crop[3]) continue;
                cx = (cx - crop[0]) / crop[2] * 100; cy = (cy - crop[1]) / crop[3] * 100;
            }
            out.push({ x: cx, y: cy, a: Math.min(0.85, (v - READ_TARGET) * 1.6) });
        }
    }
    out.sort(function (A, B) { return B.a - A.a; });
    return out.slice(0, READ_MAX_SPOTS);
}
// Слои-градиенты для background-shorthand (с запятой на конце) или "" — если гасить нечего.
// Цвет пятна — «в сторону подложки редактора»: на тёмной теме чёрный, на светлой белый.
function adaptiveLayers(url, crop, light) {
    try {
        if (!cfg.fx || !cfg.fx.autoRead) return "";
        var st = probeImage(url);
        if (!st || !st.grid || st.grid.length !== 64) return "";
        var spots = _readSpots(st.grid, crop);
        if (!spots.length) return "";
        var col = light ? "255,255,255" : "0,0,0", i, s, out = [];
        for (i = 0; i < spots.length; i++) {
            s = spots[i];
            out.push("radial-gradient(ellipse 26% 30% at " + s.x.toFixed(1) + "% " + s.y.toFixed(1) + "%, rgba(" +
                     col + "," + s.a.toFixed(2) + ") 0%, rgba(" + col + ",0) 100%)");
        }
        return out.join(", ") + ", ";
    } catch (e) { return ""; }
}

// ===== Метр читаемости =====
// Отвечает на прямой вопрос «читается ли код поверх этого фона» числом, а не на глаз.
// Яркость подложки под кодом — смесь темы и картинки в пропорции прозрачности оверлея;
// берём и среднюю ячейку, и САМУЮ СВЕТЛУЮ (худший случай — именно там код и теряется).
// Возвращает { fg, mean, worst, ratio, worstRatio, ok } или null, если мерить нечего.
function themeLuma(varName, fallback) {
    try {
        var v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) return relLuminance(v);
        var m = v.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
        if (m) return relLuminance(rgbArrToHex([+m[1], +m[2], +m[3]]));
    } catch (e) {}
    return fallback;
}
// Самая светлая ячейка кадра ПОСЛЕ адаптивного скрима: он гасит верхние по яркости пятна,
// поэтому без учёта этого метр показывал бы худший случай, которого на экране уже нет.
// Ячейки вне вырезов не различаем — оценка получается консервативной, и это нам на руку.
function worstCellLuma(grid, mean) {
    if (!grid || grid.length !== 64) return mean;
    var vals = grid.slice().sort(function (a, b) { return b - a; }), i, worst = 0, v;
    for (i = 0; i < vals.length; i++) {
        v = vals[i];
        // Гасятся только READ_MAX_SPOTS самых светлых ячеек — ровно те, что попадут в CSS.
        if (cfg.fx && cfg.fx.autoRead && i < READ_MAX_SPOTS && v > READ_TARGET) {
            v *= 1 - Math.min(0.85, (v - READ_TARGET) * 1.6);
        }
        if (v > worst) worst = v;
    }
    return worst;
}
function readability() {
    try {
        var idx = activeIndex();
        if (!cfg.enabled) return { off: true };
        var light = isLightTheme();
        var url = zoneUrl(idx, "editor");
        var st = url ? probeImage(url) : null;
        var mean = (st && typeof st.luma === "number") ? st.luma : null;
        // Генеративные/процедурные/шейдерные наборы: пикселей нет, берём светлоту подложки.
        if (mean == null) {
            var s = SETS[idx];
            var base = (s && s.grad && s.grad[0]) || (s && s.base) || null;
            if (isColor(base)) mean = relLuminance(base);
        }
        if (mean == null) return null;
        var worst = worstCellLuma(st && st.grid, mean);
        // Учитываем пользовательский фильтр яркости картинки.
        var br = clampNum(cfg.imgfx && cfg.imgfx.editor ? cfg.imgfx.editor.brightness : 1, 0.3, 1.5, 1);
        mean *= br; worst *= br;
        // Прозрачность берём той же функцией, что и CSS-переменная, — иначе метр показывал бы
        // не то, что реально нарисовано (авто-дим, режим чтения, картинка библиотеки).
        var op = Math.min(1, Math.max(0, getOp().editor * editorOpFactor()));
        var bgTheme = themeLuma("--vscode-editor-background", light ? 0.95 : 0.021);
        var fg = themeLuma("--vscode-editor-foreground", light ? 0.09 : 0.62);
        var mix = function (l) { return (1 - op) * bgTheme + op * l; };
        var r1 = contrastLum(fg, mix(mean)), r2 = contrastLum(fg, mix(worst));
        return {
            fg: fg, mean: mix(mean), worst: mix(worst),
            ratio: r1, worstRatio: r2, ok: r2 >= 4.5, op: op
        };
    } catch (e) { return null; }
}
// Подобрать прозрачность фона редактора так, чтобы худший случай дал контраст >= want.
// Меняем только прозрачность активного набора (setOpValue) — глобальный baseOp не трогаем,
// чтобы починка одной картинки не испортила остальные. Возвращает новую прозрачность.
var READ_OP_MIN = 0.02; // ниже этого фон уже не виден — дальше опускать бессмысленно
function fixReadability(want) {
    want = want || 4.5;
    var r = readability(); if (!r || r.off) return null;
    var cur = getOp().editor, step = 0.01, v = cur, i, best = cur;
    for (i = 0; i < 100 && v > READ_OP_MIN; i++) {
        setOpValue("editor", Math.round(v * 100) / 100);
        var rr = readability();
        if (rr && rr.worstRatio >= want) { best = Math.round(v * 100) / 100; break; }
        v -= step; best = Math.round(v * 100) / 100;
    }
    setOpValue("editor", Math.max(READ_OP_MIN, best));
    return getOp().editor;
}
