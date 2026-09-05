// ===== Кнопка статусбара =====
var SB_ID = "moonlight-bg-switcher", PANEL_ID = "moonlight-bg-panel";
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
    var dot = item.querySelector(".mlbg-mode-dot");
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
            item.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); togglePanel(e); }
            });
            right.insertBefore(item, right.firstChild);
        }
        updateLabel();
    } catch (e) {}
}
