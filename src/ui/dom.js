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
