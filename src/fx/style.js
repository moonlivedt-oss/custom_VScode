// ===== Применение стиля: переменные, инъекция, троттлинг =====
// Стиль разделён надвое: текст правил (buildCSS) меняется только при смене набора, темы или
// набора эффектов, а числа живут в CSS-переменных и обновляются точечно. Поэтому движение
// ползунка не заставляет браузер заново разбирать лист.

// В переменные уходят только ЧИСЛА. Всё, что меняет НАБОР правил (тумблеры эффектов, смена
// набора, тема), по-прежнему пересобирает лист — иначе новые правила просто не появятся.
// Пересборка идёт по ревизии: bumpStyle() отмечает изменение, ensureStyle собирает CSS,
// только когда ревизия сдвинулась или наш <style> пропал (VS Code перестроил DOM).
function editorOpFactor() {
    // Множители прозрачности редактора, зависящие не от ползунка: авто-дим под светлую
    // картинку и режим чтения. Повторяет логику buildCSS, чтобы переменная совпадала с ней.
    try {
        var idx = activeIndex();
        var libEd = null;
        try { if (typeof libraryActive === "function" && libraryActive()) libEd = libraryEditorUrl(); } catch (e) {}
        var edIsGen = !libEd && (isGrad(idx, "editor") || isProc(idx, "editor"));
        var edUrl = libEd || zoneUrl(idx, "editor");
        var dim = (!edIsGen && cfg.autoDim) ? lumaDimFactor(probeImage(edUrl).luma) : 1;
        return dim * (cfg.fx && cfg.fx.reading ? 0.12 : 1);
    } catch (e) { return 1; }
}
function buildVars() {
    var op = getOp(), f = cfg.imgfx || {}, fxp = cfg.fxp || {}, v = {};
    v["--mlbg-switch"] = String(switchMul);
    v["--mlbg-op-editor"] = String(clampNum(op.editor, 0, 1, 0.06) * editorOpFactor());
    v["--mlbg-op-side"] = String(clampNum(op.side, 0, 1, 0.30));
    v["--mlbg-op-panel"] = String(clampNum(op.panel, 0, 1, 0.11));
    var zones = ["editor", "side", "panel"], i, z, zf;
    for (i = 0; i < zones.length; i++) {
        z = zones[i]; zf = f[z] || {};
        v["--mlbg-br-" + z] = String(clampNum(zf.brightness, 0.3, 1.5, 1));
        v["--mlbg-sa-" + z] = String(clampNum(zf.saturate, 0, 2, 1));
        v["--mlbg-bl-" + z] = clampNum(zf.blur, 0, 12, 0) + "px";
    }
    v["--mlbg-blur"] = clampNum(fxp.blur, 0, 20, 8) + "px";
    v["--mlbg-vig"] = String(clampNum(fxp.vignette, 0, 1, 0.32));
    v["--mlbg-tint"] = String(clampNum(fxp.tintStrength, 0, 0.6, 0.18));
    v["--mlbg-spot"] = clampNum(fxp.spotRadius, 120, 600, 320) + "px";
    v["--mlbg-kb-scale"] = String(clampNum(fxp.kbScale, 1, 1.4, 1.08));
    v["--mlbg-kb-speed"] = clampNum(fxp.kbSpeed, 10, 240, 60) + "s";
    v["--mlbg-aurora-speed"] = clampNum(fxp.auroraSpeed, 6, 120, 24) + "s";
    return v;
}
var _varsApplied = {};
function ensureVars() {
    try {
        var v = buildVars(), st = document.documentElement && document.documentElement.style, k;
        if (!st) return;
        for (k in v) {
            if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
            if (_varsApplied[k] === v[k]) continue; // не трогаем то, что не изменилось
            st.setProperty(k, v[k]);
            _varsApplied[k] = v[k];
        }
    } catch (e) {}
}

var STYLE_ID = "moonlight-custom-bg";
var _styleRev = 0, _appliedRev = -1, _buildErrLogged = false;
function bumpStyle() { _styleRev++; }
// Безопасный минимум CSS, если основная сборка упала (обычно из-за сломанной ручной правки
// исходника): только акцент-переменная и стили кнопки BG/фокуса. Кнопка остаётся видимой, а
// панель — открываемой, где есть «Сбросить к дефолту» и диагностика, чтобы восстановиться,
// а не остаться с наглухо сломанным редактором. Сам fallback тоже под try — если и он не
// собрался, отдаём голую переменную акцента.
function safeFallbackCSS() {
    try {
        var ac = safeColor((typeof getAccent === "function" ? getAccent() : null), DEFAULTS.accent);
        return ":root { --mlbg-accent: " + ac + "; --mlbg-accent-rgb: " + accentRGB() + "; }\n" + switcherCSS();
    } catch (e) { return ":root { --mlbg-accent: " + DEFAULTS.accent + "; }"; }
}
function ensureStyle() {
    var el = null;
    ensureVars(); // числовые параметры — отдельно от текста стиля
    try {
        el = document.getElementById(STYLE_ID);
        if (el && el.textContent && _appliedRev === _styleRev) return; // ничего не менялось, стиль на месте
        var css;
        try { css = buildCSS(); }
        catch (buildErr) {
            // Сборка CSS упала — не оставляем редактор без кнопки/панели: ставим безопасный
            // минимум и ОДИН раз громко пишем в консоль (чтобы «копавшийся» увидел причину).
            if (!_buildErrLogged) {
                _buildErrLogged = true;
                try { console.error("[MoonLight custom-bg] Сборка CSS упала — включён безопасный режим (видна только кнопка BG). Проверьте правки в src/ или откройте панель → Система → «Сбросить к дефолту».", buildErr); } catch (e2) {}
            }
            css = safeFallbackCSS();
        }
        if (!el) { el = document.createElement("style"); el.id = STYLE_ID; document.head.appendChild(el); }
        if (el.textContent !== css) el.textContent = css;
        _appliedRev = _styleRev;
    } catch (e) {}
}
function apply() { saveCfg(); bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
// «Живое» применение БЕЗ записи в localStorage — для непрерывных изменений во время
// перетаскивания слайдера или выбора цвета. Раньше каждый такой кадр звал apply() ->
// saveCfg(), то есть до ~60 синхронных записей в localStorage в секунду (джанк + износ).
// Теперь во время движения только пересобираем CSS/виджеты, а cfg пишем один раз —
// по событию change (отпускание ползунка / фиксация цвета), см. makeSlider/цветовые контролы.
function applyNoSave() { bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
// Живое перетаскивание ползунка: сразу двигаем только CSS-переменные (setProperty — это
// пересчёт значений, без переразбора листа), а полную пересборку (виджеты, подписи, те
// правила, что зависят от чисел структурно) делаем один раз после паузы в движении.
var _liveFullTimer = 0;
function applyThrottledLive() {
    ensureVars();
    if (_liveFullTimer) clearTimeout(_liveFullTimer);
    _liveFullTimer = setTimeout(function () { _liveFullTimer = 0; applyNoSave(); }, 120);
}
// Плавная смена фона: гасим оверлеи зон (switchMul=0), затем в следующем кадре
// возвращаем (switchMul=1). У оверлеев есть transition:opacity, поэтому новый набор
// не «прыгает», а мягко проступает. Только CSS — без saveCfg/подписей; используется
// и сменой набора (applyFade), и предпросмотром при наведении (previewSet/previewEnd).
// switchMul влияет на CSS -> бампим ревизию на каждой фазе, иначе fade-in не пересоберётся.
function fadeSwap() {
    switchMul = 0; bumpStyle(); ensureStyle();
    requestAnimationFrame(function () { switchMul = 1; ensureVars(); });
}
function applyFade() {
    saveCfg(); updateLabel(); syncWidgets();
    fadeSwap();
}
