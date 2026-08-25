// ===== Базовые DOM-хелперы =====
// Общие для всех UI-модулей: создание элемента, заголовок секции, доступность div-кнопок.

// el(tag, css, text) — создать элемент с инлайновым стилем и текстом (оба необязательны).
function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
}

// Заголовок секции (мелкий, uppercase, приглушённый).
function section(t) {
    return el("div", "margin:12px 2px 6px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.7px; color:#7f849c;", t);
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
