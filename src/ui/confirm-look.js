// ===== «Что изменится»: предпросмотр чужого конфига до применения =====
// Импорт файла, чужой код образа и база из settings.json раньше применялись сразу: понять, что
// именно поменялось, можно было только глазами, а откатить — кнопкой «Восстановить». Теперь
// сначала показывается окно со списком изменений и кнопкой «Примерить» (вид меняется без
// записи, «Вернуть» откатывает), а применяется всё только по «Применить».

var CONFIRM_ID = "mlbg-confirm";
var _confirm = null;   // { next, onApply, snap, cleanup }

function _pct(v) { return Math.round((typeof v === "number" ? v : 0) * 100) + "%"; }
function _modeLabel(c) {
    if (c.mode === "random") return t("случайно");
    var i = parseInt(c.mode, 10);
    return isNaN(i) ? String(c.mode) : (t("Набор ") + i + (setNameIn(c, i) ? " | " + setNameIn(c, i) : ""));
}
// Имя набора в конфиге c (его setName и его ген-наборы), а не в текущем.
function setNameIn(c, i) {
    var o = c.setName && c.setName[i];
    if (typeof o === "string" && o) return o;
    if (i >= GEN_BASE) { var g = c.genSets && c.genSets[i - GEN_BASE]; return (g && g.name) || ""; }
    var s = SETS[i]; return (s && s.name) || "";
}
function _same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function _count(o) { return (o && typeof o === "object") ? Object.keys(o).length : 0; }

// Список изменений a -> b человеческим языком (уже переведённый). Пусто — ничего не изменится.
function lookDiff(a, b) {
    var out = [], k, i;
    if (!a || !b) return out;
    if (a.enabled !== b.enabled) out.push(t("Фон: ") + (b.enabled ? t("вкл") : t("выкл")));
    if (a.mode !== b.mode) out.push(_modeLabel(a) + " → " + _modeLabel(b));
    var ga = (a.genSets || []).length, gb = (b.genSets || []).length;
    if (ga !== gb || !_same(a.genSets, b.genSets)) out.push(t("Свои наборы: ") + ga + " → " + gb);
    if (a.accent !== b.accent) out.push(t("Акцент: ") + a.accent + " → " + b.accent);
    if (!_same(a.setAccent, b.setAccent)) out.push(t("Акценты наборов: ") + _count(a.setAccent) + " → " + _count(b.setAccent));
    var zones = [["editor", "Яркость: редактор"], ["side", "Яркость: сайдбар"], ["panel", "Яркость: панель"]];
    for (i = 0; i < zones.length; i++) {
        var z = zones[i][0];
        if (a.baseOp && b.baseOp && a.baseOp[z] !== b.baseOp[z]) out.push(t(zones[i][1]) + " " + _pct(a.baseOp[z]) + " → " + _pct(b.baseOp[z]));
    }
    if (!_same(a.setOp, b.setOp)) out.push(t("Яркость отдельных наборов"));
    var on = [], off = [];
    for (k in b.fx) if (Object.prototype.hasOwnProperty.call(b.fx, k) && a.fx && a.fx[k] !== b.fx[k]) (b.fx[k] ? on : off).push(t(fxLabel(k)));
    if (on.length) out.push(t("Эффекты включатся: ") + on.join(", "));
    if (off.length) out.push(t("Эффекты выключатся: ") + off.join(", "));
    for (i = 0; i < PARAMS.length; i++) {
        var pk = PARAMS[i][0];
        if (a.fxp && b.fxp && a.fxp[pk] !== b.fxp[pk]) out.push(t(PARAMS[i][1]) + ": " + a.fxp[pk] + " → " + b.fxp[pk]);
    }
    if (a.partStyle !== b.partStyle) out.push(t("Стиль частиц") + ": " + a.partStyle + " → " + b.partStyle);
    if (!_same(a.imgfx, b.imgfx) || !_same(a.fit, b.fit)) out.push(t("Фильтры картинки"));
    if (!_same(a.term, b.term)) out.push(t("Терминал"));
    if (!_same(a.slideshow, b.slideshow)) out.push(t("Слайдшоу: ") + (b.slideshow.on ? t("вкл") : t("выкл")) + (b.slideshow.on ? ", " + b.slideshow.min + t(" мин") : ""));
    if (!_same(a.autoTime, b.autoTime)) out.push(t("По времени суток: ") + (b.autoTime.on ? t("вкл") : t("выкл")));
    if (!_same(a.setImg, b.setImg) || !_same(a.setPos, b.setPos) || !_same(a.library, b.library)) out.push(t("Свои картинки"));
    if (!_same(a.workspaceSets, b.workspaceSets) || !_same(a.branchSets, b.branchSets) || !_same(a.langSets, b.langSets) || !_same(a.remoteSets, b.remoteSets) ||
        a.autoWorkspace !== b.autoWorkspace || a.autoBranch !== b.autoBranch || a.autoLang !== b.autoLang || a.autoRemote !== b.autoRemote)
        out.push(t("Привязки наборов к проектам, веткам и языкам"));
    if (a.lang !== b.lang) out.push(t("Язык панели: ") + a.lang + " → " + b.lang);
    if (a.imgBase !== b.imgBase) out.push(t("Папка плагина"));
    if (a.shaderSrc !== b.shaderSrc) out.push(t("Свой шейдер"));
    return out;
}

// Примерка: вид кандидата без записи (applyNoSave). Повторный вызов с false — вернуть свой.
function confirmPreview(on) {
    if (!_confirm) return;
    if (on && !_confirm.snap) {
        _confirm.snap = cfg;
        cfg = clone(_confirm.next); syncGenSets(); applyNoSave();
    } else if (!on && _confirm.snap) {
        cfg = _confirm.snap; _confirm.snap = null; syncGenSets(); applyNoSave();
    }
}
function _confirmClose() {
    if (!_confirm) return;
    confirmPreview(false);
    try { if (_confirm.cleanup) _confirm.cleanup(); } catch (e) {}
    var n = document.getElementById(CONFIRM_ID); if (n) n.remove();
    _confirm = null;
}
function confirmCancel() { _confirmClose(); }
function confirmAccept() {
    if (!_confirm) return;
    var fn = _confirm.onApply;
    _confirmClose();
    try { fn(); } catch (e) { logErr("применение образа", e); }
}

// Показать окно «что изменится». next — готовый кандидат (candidateCfg), onApply — применение.
function confirmLook(title, next, onApply) {
    _confirmClose();
    var diff = lookDiff(cfg, next);
    _confirm = { next: next, onApply: onApply, snap: null, cleanup: null };
    var box = el("div",
        "position:fixed; left:50%; top:18%; transform:translateX(-50%); z-index:100010; width:min(440px,92vw);" +
        "padding:14px 16px; border-radius:12px; background:var(--mlp-bg,rgba(24,24,37,0.97)); color:var(--mlp-fg,#cdd6f4);" +
        "border:1px solid rgba(var(--mlbg-accent-rgb),0.4); box-shadow:0 18px 48px rgba(0,0,0,0.55);" +
        "font-family:var(--vscode-font-family,sans-serif); font-size:12px;");
    box.id = CONFIRM_ID;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", title);
    box.appendChild(el("div", "font-weight:700; font-size:13px; margin-bottom:8px; color:var(--mlbg-accent);", title));
    box.appendChild(el("div", "color:var(--mlp-muted,#a6adc8); margin-bottom:6px;",
        diff.length ? t("Что изменится:") : t("Ничего не изменится — вид такой же.")));
    var list = el("div", "max-height:40vh; overflow:auto; display:flex; flex-direction:column; gap:3px; margin-bottom:12px;");
    var SHOW = 14;
    diff.slice(0, SHOW).forEach(function (s) { list.appendChild(el("div", "padding:3px 7px; border-radius:6px; background:rgba(var(--mlbg-accent-rgb),0.08); line-height:1.35;", s)); });
    if (diff.length > SHOW) list.appendChild(el("div", "padding:3px 7px; color:var(--mlp-faint,#6c7086);", t("и ещё ") + (diff.length - SHOW)));
    box.appendChild(list);
    var row = el("div", "display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;");
    var btnCss = "padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:600; border:1px solid rgba(var(--mlbg-accent-rgb),0.32);";
    var tryB = el("div", btnCss + " color:var(--mlp-fg,#cdd6f4);", t("Примерить"));
    tryB.addEventListener("click", function () {
        var on = !_confirm.snap;
        confirmPreview(on);
        tryB.textContent = on ? t("Вернуть как было") : t("Примерить");
    });
    keyActivate(tryB, t("Примерить"));
    var noB = el("div", btnCss + " color:var(--mlp-muted,#a6adc8);", t("Отмена"));
    noB.addEventListener("click", confirmCancel);
    keyActivate(noB, t("Отмена"));
    var okB = el("div", btnCss + " color:#181825; background:var(--mlbg-accent);", t("Применить"));
    okB.addEventListener("click", confirmAccept);
    keyActivate(okB, t("Применить"));
    if (diff.length) row.appendChild(tryB);
    row.appendChild(noB); row.appendChild(okB);
    box.appendChild(row);
    function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); confirmCancel(); }
    }
    document.addEventListener("keydown", onKey, true);
    _confirm.cleanup = function () { document.removeEventListener("keydown", onKey, true); };
    (document.body || document.documentElement).appendChild(box);
    try { okB.setAttribute("tabindex", "0"); okB.focus(); } catch (e) {}
    return diff;
}
