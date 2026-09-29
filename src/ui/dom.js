// ===== Базовые DOM-хелперы =====
// Общие для всех UI-модулей: создание элемента, заголовок секции, доступность div-кнопок.

// el(tag, css, text) — создать элемент с инлайновым стилем и текстом (оба необязательны).
function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
}

// ===== Общие фрагменты инлайн-стилей контролов =====
// Повторяются в controls.js / io.js / panel.js — вынесены сюда, чтобы правка внешнего
// вида (отступы, цвета полей) делалась в одном месте, а не в двух десятках строк.
var ST = {
    row: "display:flex; align-items:center; gap:8px; padding:2px 2px;",                                   // строка «метка + контрол»
    toggleRow: "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;", // строка-тумблер (с hover-подсветкой)
    range: "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;",                // ползунок <input type=range>
    checkbox: "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;",                          // <input type=checkbox>
    fill: "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"                   // растягивающаяся подпись (обрезается «…»)
};
// Приглушённая метка контрола фиксированной ширины (слева от слайдера/поля).
// w — ширина в px; ellipsis — обрезать длинный текст «…» (для узких меток широких секций).
function mutedLabel(w, ellipsis) {
    return "flex:0 0 " + w + "px; color:var(--mlp-muted,#a6adc8);" + (ellipsis ? " white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" : "");
}
// База стиля текстового поля / селекта панели; extra дописывает частности (padding, font-size, cursor).
function fieldStyle(extra) {
    return "flex:1 1 auto; min-width:0; background:var(--mlp-field,rgba(30,30,46,0.6)); color:var(--mlp-fg,#cdd6f4);" +
        " border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px;" + (extra || "");
}

// Делает div-«кнопку» доступной с клавиатуры: фокусируется и активируется Enter/Space
// (клик-логика переиспользуется через node.click()). role/aria — для скринридеров.
function keyActivate(node, label) {
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    if (label) node.setAttribute("aria-label", label);
    node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); node.click(); }
    });
    return node;
}

// Пустое состояние: наклейка + одна строка «что сюда добавится». sticker — ключ UI_ICONS.
function emptyState(text, sticker) {
    var box = el("div", null); box.className = "mlp-empty";
    var ic = uiIcon(sticker || "empty", 48); if (ic) box.appendChild(ic);
    box.appendChild(el("span", null, t(text)));
    return box;
}

// Сетка образцов цвета: группы [подпись, [#hex, ...]]; текущий цвет — с кольцом. Клик -> pick(hex).
// Живёт под полем цвета (акцент, курсор, выделение терминала): hex вручную остаётся рядом.
var SWATCH_CATPPUCCIN = ["#cba6f7", "#f5c2e7", "#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#94e2d5", "#89dceb", "#89b4fa", "#b4befe"];
function makeSwatches(groups, cur, pick) {
    var box = el("div", null); box.className = "mlp-sw-box";
    var curL = String(cur || "").toLowerCase();
    groups.forEach(function (g) {
        var cols = (g[1] || []).filter(function (c, i, a) { return isColor(c) && a.indexOf(c) === i; });
        if (!cols.length) return;
        var row = el("div", null); row.className = "mlp-sw-row";
        row.appendChild(el("span", null, t(g[0])));
        cols.forEach(function (hex) {
            var sw = el("div", null); sw.className = "mlp-sw" + (hex.toLowerCase() === curL ? " on" : "");
            sw.style.background = hex; sw.title = hex;
            sw.addEventListener("click", function (e) { e.stopPropagation(); pick(hex); });
            keyActivate(sw, t(g[0]) + " " + hex);
            row.appendChild(sw);
        });
        box.appendChild(row);
    });
    return box;
}

// Сегмент-переключатель «А | Б | В» вместо короткого селекта (как в настройках cpp-docs-panel):
// все варианты видны сразу, выбор — один клик. options — [[значение, подпись], ...];
// get() -> текущее значение; set(v) -> применить. label (необязательна) — метка слева.
function makeSeg(label, options, get, set, info) {
    var wrap = el("div", ST.row + " flex-wrap:wrap;");
    if (label) wrap.appendChild(el("span", mutedLabel(92, true), t(label)));
    var seg = el("div", null); seg.className = "mlp-seg"; seg.setAttribute("role", "radiogroup");
    if (label) seg.setAttribute("aria-label", t(label));
    var btns = [];
    function sync() {
        var cur = get();
        btns.forEach(function (b) {
            var on = b._v === cur;
            b.className = on ? "on" : "";
            b.setAttribute("aria-checked", on ? "true" : "false");
            b.tabIndex = on ? 0 : -1;
        });
    }
    options.forEach(function (o) {
        var b = el("button", null, t(o[1])); b.type = "button"; b._v = o[0];
        b.setAttribute("role", "radio");
        b.addEventListener("click", function (e) { e.stopPropagation(); if (get() === o[0]) return; set(o[0]); sync(); });
        btns.push(b); seg.appendChild(b);
    });
    seg.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var i = -1; for (var k = 0; k < btns.length; k++) if (btns[k] === document.activeElement) i = k;
        if (i < 0) return;
        e.preventDefault(); e.stopPropagation();
        var n = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
        n.click(); try { n.focus(); } catch (er) {}
    });
    sync();
    wrap.appendChild(seg);
    var d = info ? infoDot(info) : null; if (d) wrap.appendChild(d);
    wrap._sync = sync;
    return wrap;
}
