// ===== Кнопка статусбара =====
var SB_ID = "moonlight-bg-switcher", PANEL_ID = "moonlight-bg-panel";

// ===== Быстрое меню по правому клику на кнопке BG =====
// Частые действия без открытия всей панели: листать наборы, вкл/выкл фон, режим чтения, открыть
// панель. Всё это есть хоткеями, но контекст-меню — видимый и мышиный путь. Закрывается кликом
// мимо, Esc и после выбора. cycleSet/togglePanel/apply/toast/refreshPanel — из общей области IIFE.
var QMENU_ID = "moonlight-bg-qmenu";
function closeQuickMenu() {
    var m = document.getElementById(QMENU_ID); if (m && m.remove) m.remove();
    document.removeEventListener("mousedown", _qmOutside, true);
    document.removeEventListener("keydown", _qmKey, true);
}
function _qmOutside(e) { var m = document.getElementById(QMENU_ID); if (m && !m.contains(e.target)) closeQuickMenu(); }
function _qmKey(e) { if (e.key === "Escape") { e.stopPropagation(); closeQuickMenu(); } }
function showQuickMenu(anchor) {
    if (document.getElementById(QMENU_ID)) { closeQuickMenu(); return; } // повторный вызов — закрыть
    var light = false; try { light = isLightTheme(); } catch (e) {}
    var bg = light ? "rgba(245,245,250,0.98)" : "rgba(24,24,37,0.98)";
    var fg = light ? "#1e1e2e" : "#cdd6f4";
    var m = el("div",
        "position:fixed; z-index:100005; min-width:214px; padding:5px; border-radius:10px;" +
        "background:" + bg + "; color:" + fg + "; font-family:var(--vscode-font-family,sans-serif); font-size:12px;" +
        "border:1px solid rgba(var(--mlbg-accent-rgb),0.4); box-shadow:0 12px 34px rgba(0,0,0,0.5);" +
        "backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);");
    m.id = QMENU_ID; m.setAttribute("role", "menu");
    m.addEventListener("click", function (e) { e.stopPropagation(); });
    function item(label, act, sub) {
        var r = el("div", "display:flex; align-items:center; gap:8px; padding:6px 9px; border-radius:7px; cursor:pointer;");
        r.appendChild(el("span", "flex:1 1 auto;", t(label)));
        if (sub) r.appendChild(el("span", "flex:0 0 auto; font-size:10px; color:var(--mlbg-accent); font-family:var(--vscode-editor-font-family,monospace);", sub));
        r.addEventListener("mouseenter", function () { r.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
        r.addEventListener("mouseleave", function () { r.style.background = "transparent"; });
        r.addEventListener("click", function () { closeQuickMenu(); try { act(); } catch (e) {} });
        r.setAttribute("role", "menuitem");
        keyActivate(r, t(label));
        m.appendChild(r);
    }
    function sep() { m.appendChild(el("div", "margin:4px 6px; border-top:1px solid var(--mlp-border-faint,rgba(205,214,244,0.14));")); }
    item("Следующий набор", function () { cycleSet(1); }, "Ctrl+Alt+.");
    item("Предыдущий набор", function () { cycleSet(-1); }, "Ctrl+Alt+,");
    sep();
    item(cfg.enabled ? "Выключить фон и эффекты" : "Включить фон и эффекты", function () {
        cfg.enabled = !cfg.enabled; apply();
        try { toast(cfg.enabled ? t("Фон включён") : t("Фон выключен")); } catch (e) {}
        if (document.getElementById(PANEL_ID)) { try { refreshPanel(); } catch (e) {} }
    }, "Ctrl+Alt+0");
    item(cfg.fx.reading ? "Выключить режим чтения" : "Включить режим чтения", function () {
        cfg.fx.reading = !cfg.fx.reading; apply();
        try { toast(cfg.fx.reading ? t("Режим чтения включён") : t("Режим чтения выключен")); } catch (e) {}
        if (document.getElementById(PANEL_ID)) { try { refreshPanel(); } catch (e) {} }
    }, "Ctrl+Alt+R");
    sep();
    item("Открыть панель…", function () { togglePanel({ stopPropagation: function () {} }); }, "Ctrl+Alt+B");
    document.body.appendChild(m);
    // Позиционируем над кнопкой BG (правый нижний угол окна); не влезло сверху — под ней.
    try {
        var r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
        var left = Math.max(6, Math.min(r.right - mw, window.innerWidth - mw - 6));
        var top = r.top - mh - 6; if (top < 6) top = r.bottom + 6;
        m.style.left = left + "px"; m.style.top = top + "px";
    } catch (e) {}
    setTimeout(function () {
        document.addEventListener("mousedown", _qmOutside, true);
        document.addEventListener("keydown", _qmKey, true);
    }, 0);
}
function updateLabel() {
    var item = document.getElementById(SB_ID); if (!item) return;
    var a = item.querySelector("a"); if (!a) return;
    var idx = activeIndex(), nm = setName(idx);
    // Мастер-выключатель: когда фон выключен — короткая подпись «BG выкл», без индикаторов.
    if (!cfg.enabled) {
        a.textContent = t("BG выкл");
        var od = item.querySelector(".mlbg-mode-dot"); if (od) od.remove();
        var t0 = t("Фон и дизайн — настройки (фон выключен, Ctrl+Alt+0 — включить)");
        item.title = t0; item.setAttribute("aria-label", t0);
        return;
    }
    a.textContent = "BG " + idx + (nm ? " · " + nm : "") + (cfg.mode === "random" ? " ~" : "");

    // Индикатор активного авто-режима: маленькая точка перед подписью.
    // авто-по-времени — кольцо (акцентная рамка), слайдшоу — залитая точка.
    // Приоритет у авто-по-времени (оно перебивает слайдшоу, см. slideTick).
    var auto = !!(cfg.autoTime && cfg.autoTime.on);
    var slide = !auto && !!(cfg.slideshow && cfg.slideshow.on);
    var dot = /** @type {HTMLElement} */ (item.querySelector(".mlbg-mode-dot"));
    var mode = auto ? "auto" : (slide ? "slide" : "");
    if (mode) {
        if (!dot) {
            dot = document.createElement("span"); dot.className = "mlbg-mode-dot";
            dot.style.cssText = "display:inline-block; width:6px; height:6px; border-radius:50%; margin:0 5px 0 1px; vertical-align:middle; box-sizing:border-box;";
            a.insertBefore(dot, a.firstChild);
        }
        if (mode === "auto") { dot.style.background = "transparent"; dot.style.border = "2px solid var(--mlbg-accent)"; }
        else { dot.style.background = "var(--mlbg-accent)"; dot.style.border = "none"; }
    } else if (dot) { dot.remove(); }

    var modeTxt = auto ? t(" · авто-набор по времени суток") : (slide ? t(" · слайдшоу вкл") : "");
    var title = t("Фон и дизайн — настройки") + (nm ? t(" (набор: ") + nm + ")" : "") + modeTxt;
    item.title = title; item.setAttribute("aria-label", title);
}
function ensureStatusBar() {
    try {
        var right = document.querySelector(".statusbar .right-items") || document.querySelector(".right-items");
        if (!right) return;
        var item = document.getElementById(SB_ID);
        if (!item) {
            item = document.createElement("div");
            item.id = SB_ID; item.className = "statusbar-item right"; item.title = t("Фон и дизайн — настройки");
            item.setAttribute("role", "button");
            item.setAttribute("tabindex", "0");
            item.setAttribute("aria-label", t("Фон и дизайн — настройки"));
            var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px";
            item.appendChild(a);
            item.addEventListener("click", togglePanel);
            // Правый клик — быстрое меню действий, не открывая всю панель.
            item.addEventListener("contextmenu", function (e) { e.preventDefault(); e.stopPropagation(); try { showQuickMenu(item); } catch (er) {} });
            item.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); togglePanel(e); }
            });
            right.insertBefore(item, right.firstChild);
        }
        updateLabel();
    } catch (e) {}
}
