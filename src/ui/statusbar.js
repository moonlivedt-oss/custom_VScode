// ===== Кнопка статусбара =====
var SB_ID = "moonlight-bg-switcher", PANEL_ID = "moonlight-bg-panel";
function updateLabel() {
    var item = document.getElementById(SB_ID); if (!item) return;
    var a = item.querySelector("a"); if (!a) return;
    var idx = activeIndex(), nm = setName(idx);
    a.textContent = "BG " + idx + (nm ? " · " + nm : "") + (cfg.mode === "random" ? " ~" : "");
    var t = "Фон и дизайн — настройки" + (nm ? " (набор: " + nm + ")" : "");
    item.title = t; item.setAttribute("aria-label", t);
}
function ensureStatusBar() {
    try {
        var right = document.querySelector(".statusbar .right-items") || document.querySelector(".right-items");
        if (!right) return;
        var item = document.getElementById(SB_ID);
        if (!item) {
            item = document.createElement("div");
            item.id = SB_ID; item.className = "statusbar-item right"; item.title = "Фон и дизайн — настройки";
            item.setAttribute("role", "button");
            item.setAttribute("tabindex", "0");
            item.setAttribute("aria-label", "Фон и дизайн — настройки");
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
