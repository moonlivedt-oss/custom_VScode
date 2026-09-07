// ===== Перцептивный цвет: OKLab/OKLCH, палитра из картинки, контраст =====
// Раньше акцент и палитра считались в HSL. HSL «врёт» о светлоте: жёлтый с L=0.5 и синий
// с L=0.5 воспринимаются как разные по яркости, поэтому нормировка «S/L в читаемый диапазон»
// давала то ядовитый, то почти невидимый акцент. Здесь тот же приём, что у pywal/matugen/
// Material You, но без зависимостей: перевод в OKLab (перцептивно равномерное пространство),
// кластеризация по цветности, отбор по «оценке» и приведение к постоянной воспринимаемой
// светлоте. Формулы OKLab — Björn Ottosson (public domain).
//
// Порядок в сборке: ДО css.js (там эти функции зовутся из probeImage/buildCSS).

// ---- sRGB <-> линейное ----
function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linToSrgb(v) {
    v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
}
// ---- OKLab ----
function rgbToOklab(r, g, b) {
    var R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
    var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    ];
}
function oklabToRgb(L, a, b) {
    var l = L + 0.3963377774 * a + 0.2158037573 * b;
    var m = L - 0.1055613458 * a - 0.0638541728 * b;
    var s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [
        linToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    ];
}
// ---- OKLCH (полярная форма OKLab): L — светлота 0..1, C — цветность, h — оттенок в радианах ----
function rgbArrToHex(c) {
    function hx(v) { var t = Math.round(Math.min(255, Math.max(0, v))).toString(16); return t.length < 2 ? "0" + t : t; }
    return "#" + hx(c[0]) + hx(c[1]) + hx(c[2]);
}
function hexToRgbArr(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function oklchToHex(L, C, h) { return rgbArrToHex(oklabToRgb(L, Math.cos(h) * C, Math.sin(h) * C)); }
function hexToOklch(hex) {
    var c = hexToRgbArr(hex), lab = rgbToOklab(c[0], c[1], c[2]);
    return [lab[0], Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]), Math.atan2(lab[2], lab[1])];
}

// ---- Контраст (WCAG 2.1) ----
// Относительная яркость и коэффициент контраста 1..21. Живёт здесь, а не в css.js, чтобы
// весь цвет считался в одном месте (палитра, акцент и проверка читаемости — одна тема).
function relLuminance(hex) {
    var a = hexToRgbArr(hex), i, v, o = [];
    for (i = 0; i < 3; i++) { v = a[i] / 255; o.push(v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }
    return 0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2];
}
// Контраст между двумя ЯРКОСТЯМИ (0..1). Нужен «метру читаемости»: фон под кодом — это
// смесь темы и картинки, у которой нет одного hex-цвета, только измеренная светлота.
function contrastLum(l1, l2) {
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
}
function contrastRatio(h1, h2) { return contrastLum(relLuminance(h1), relLuminance(h2)); }
// Поднять/опустить светлоту акцента, пока контраст к подложке не достигнет want (обычно 3.0
// для крупных элементов интерфейса). Оттенок и цветность сохраняются — меняется только L,
// поэтому цвет остаётся «тем же», просто читаемым. Возвращает исходный hex, если уже хватает.
function accentForContrast(hex, bgHex, want) {
    try {
        if (contrastRatio(hex, bgHex) >= want) return hex;
        var lch = hexToOklch(hex), bgLum = relLuminance(bgHex);
        var up = bgLum < 0.18; // тёмная подложка -> осветляем акцент, светлая -> затемняем
        var best = hex, L = lch[0], i;
        for (i = 0; i < 24; i++) {
            L += up ? 0.02 : -0.02;
            if (L <= 0.05 || L >= 0.98) break;
            best = oklchToHex(L, lch[1], lch[2]);
            if (contrastRatio(best, bgHex) >= want) return best;
        }
        return best;
    } catch (e) { return hex; }
}

// ===== Палитра из картинки =====
// ACC_L / ACC_C — целевые светлота и цветность акцента в OKLab. Подобраны так, чтобы акцент
// был различим на тёмной подложке редактора и не «кислотил» на светлой теме. Все цвета
// палитры приводятся к ним — поэтому набор акцентов из любой картинки выглядит единым по
// силе, а не «один бледный, другой ядовитый».
var ACC_L = 0.78, ACC_C_MIN = 0.09, ACC_C_MAX = 0.17;
function normAccentLch(L, C, h) {
    return oklchToHex(ACC_L, Math.min(ACC_C_MAX, Math.max(ACC_C_MIN, C)), h);
}
// Кластеризация пикселей по оттенку в OKLab. Вес пикселя — цветность^2 (серые почти не
// влияют на оттенок) с поправкой на светлоту: почти чёрные и почти белые пиксели дают
// ненадёжный оттенок, поэтому их вклад гасится. Возвращает отсортированные по «оценке»
// корзины [{ h, C, L, w }]. BINS=24 (шаг 15°) — мельче различает соседние оттенки, чем
// прежние 12 корзин по HSL.
function _hueBins(d) {
    var BINS = 24, acc = [], i;
    for (i = 0; i < BINS; i++) acc.push({ x: 0, y: 0, c: 0, l: 0, w: 0 });
    for (i = 0; i < d.length; i += 4) {
        var lab = rgbToOklab(d[i], d[i + 1], d[i + 2]);
        var L = lab[0], C = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
        if (C < 0.012) continue;                               // почти серый — оттенка нет
        var trust = Math.max(0, 1 - Math.abs(L - 0.55) * 1.8); // доверие к оттенку по светлоте
        var w = C * C * trust;
        if (w <= 0) continue;
        var h = Math.atan2(lab[2], lab[1]);                    // -PI..PI
        var b = Math.floor(((h + Math.PI) / (2 * Math.PI)) * BINS) % BINS;
        var a = acc[b];
        a.x += Math.cos(h) * w; a.y += Math.sin(h) * w; a.c += C * w; a.l += L * w; a.w += w;
    }
    var out = [];
    for (i = 0; i < BINS; i++) {
        var g = acc[i]; if (g.w < 1e-5) continue;
        out.push({ h: Math.atan2(g.y, g.x), C: g.c / g.w, L: g.l / g.w, w: g.w });
    }
    // Оценка корзины — не только «сколько пикселей», но и насколько цвет выразителен:
    // редкий, но насыщенный неон важнее огромного блёклого неба (иначе акцентом любой
    // ночной картинки становился бы серо-синий). Это аналог color scoring в Material You.
    out.sort(function (A, B) { return (B.w * (0.35 + B.C)) - (A.w * (0.35 + A.C)); });
    return out;
}
// Доминирующий цвет как готовый акцент. d — ImageData.data уменьшенной картинки.
// Почти серая картинка -> берём среднее RGB и поднимаем цветность до минимума.
function dominantAccent(d) {
    if (!d || !d.length) return null;
    var bins = _hueBins(d);
    if (bins.length) return normAccentLch(bins[0].L, bins[0].C, bins[0].h);
    var r = 0, g = 0, b = 0, n = 0, i;
    for (i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    if (!n) return null;
    var lch = hexToOklch(rgbArrToHex([r / n, g / n, b / n]));
    return normAccentLch(lch[0], Math.max(ACC_C_MIN, lch[1]), lch[2]);
}
// Гармоничная палитра до 3 акцентов: топ-корзины с разносом по оттенку не меньше MIN_DH
// (иначе получались три почти одинаковых цвета и «радужный контур» выглядел одноцветным).
function dominantPalette(d) {
    if (!d || !d.length) return [];
    var MIN_DH = Math.PI / 6; // 30°
    var bins = _hueBins(d), out = [], hs = [], i, j, ok;
    for (i = 0; i < bins.length && out.length < 3; i++) {
        ok = true;
        for (j = 0; j < hs.length; j++) {
            var dh = Math.abs(bins[i].h - hs[j]);
            if (dh > Math.PI) dh = 2 * Math.PI - dh;
            if (dh < MIN_DH) { ok = false; break; }
        }
        if (!ok) continue;
        hs.push(bins[i].h);
        out.push(normAccentLch(bins[i].L, bins[i].C, bins[i].h));
    }
    return out;
}
// Поворот оттенка в OKLab (запасные accent2/accent3, когда палитры из картинки нет).
// dh — доля полного круга (0.33 = +120°). Светлота/цветность приводятся к акцентным.
function rotateHue(hex, dh) {
    var lch = hexToOklch(hex);
    return normAccentLch(lch[0], lch[1], lch[2] + dh * 2 * Math.PI);
}

// ===== HSL =====
// Осталось для генератора наборов по seed и экспорта темы: там оттенок задаётся вручную и
// удобнее крутить именно HSL. Палитра из картинки и акценты считаются в OKLab (выше).
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return [h, s, l];
}
function _hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}
function hslToHex(h, s, l) {
    var r, g, b;
    if (!s) { r = g = b = l; }
    else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        r = _hue2rgb(p, q, h + 1 / 3); g = _hue2rgb(p, q, h); b = _hue2rgb(p, q, h - 1 / 3);
    }
    function hx(v) { var t = Math.round(v * 255).toString(16); return t.length < 2 ? "0" + t : t; }
    return "#" + hx(r) + hx(g) + hx(b);
}
// Палитра, доминирующий акцент, поворот оттенка и WCAG-контраст переехали в src/fx/color.js
//: считаются в OKLab, а не в HSL. Имена функций прежние — dominantAccent,
// dominantPalette, rotateHue, contrastRatio, hexToRgbArr; здесь оставлены только
// HSL-хелперы, которыми пользуются генератор наборов по seed и экспорт тем.
