// ===== Активный набор и его яркость =====
function pickRandom() {
    var last = -1; try { last = parseInt(localStorage.getItem(LAST_KEY), 10); } catch (e) {}
    var idx;
    if (SETS.length <= 1) idx = 0;
    else { do { idx = Math.floor(Math.random() * SETS.length); } while (idx === last); }
    try { localStorage.setItem(LAST_KEY, String(idx)); } catch (e) {}
    return idx;
}
function activeIndex() {
    if (cfg.mode === "random") {
        if (sessionRandomIndex === null) sessionRandomIndex = pickRandom();
        return sessionRandomIndex;
    }
    var i = parseInt(cfg.mode, 10);
    if (isNaN(i) || i < 0 || i >= SETS.length) i = 0;
    return i;
}
// яркость активного набора (своя или базовая)
function getOp() {
    var idx = activeIndex(), o = cfg.setOp[idx] || {};
    return {
        editor: typeof o.editor === "number" ? o.editor : cfg.baseOp.editor,
        side: typeof o.side === "number" ? o.side : cfg.baseOp.side,
        panel: typeof o.panel === "number" ? o.panel : cfg.baseOp.panel
    };
}
function setOpValue(key, v) {
    var idx = activeIndex();
    if (!cfg.setOp[idx]) cfg.setOp[idx] = {};
    cfg.setOp[idx][key] = v;
}
// Акцент активного набора: приоритет — правка пользователя (cfg.setAccent[idx]),
// затем «родной» акцент набора (SETS[idx].accent), затем глобальный cfg.accent.
function getAccent() {
    var idx = activeIndex();
    var o = cfg.setAccent && cfg.setAccent[idx];
    if (isColor(o)) return o;
    var s = SETS[idx] && SETS[idx].accent;
    if (isColor(s)) return s;
    return safeColor(cfg.accent, DEFAULTS.accent);
}
function setAccentValue(v) {
    var idx = activeIndex();
    if (!cfg.setAccent) cfg.setAccent = {};
    cfg.setAccent[idx] = v;
}
