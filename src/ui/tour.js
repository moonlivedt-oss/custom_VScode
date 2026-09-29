// ===== Знакомство с панелью в 3 шага =====
// Как тур в cpp-docs-panel: подсвечиваем НАСТОЯЩИЕ элементы (а не картинки с ними) —
// затемнение вокруг, рамка и подсказка рядом. «Дальше» / «Пропустить» / Esc. Показывается
// при первом открытии панели (cfg.ui.tour), повторить — кнопкой во вкладке «Система».
// Слой не ловит мышь (pointer-events:none), кроме самой подсказки: панель под ним работает.
var TOUR_ID = "moonlight-bg-tour";
var TOUR_STEPS = [
    { sel: "#" + "moonlight-bg-panel .mlp-nav", title: "1. Вкладки",
      text: "Здесь только главное. Число на вкладке — сколько там включено. Кнопка «Все настройки» в шапке открывает остальное, а поиск вверху находит любой пункт." },
    { sel: "#" + "moonlight-bg-panel .mlp-hbtn", all: true, title: "2. Кнопки в шапке",
      text: "Быстрый переключатель наборов и эффектов, отмена и повтор, «Все настройки» и булавка: закреплённая панель не закрывается кликом мимо. Свою картинку можно просто перетащить в панель." },
    { sel: "#" + "moonlight-bg-switcher", title: "3. Кнопка BG",
      text: "Клик — эта панель. Колесо мыши над кнопкой листает наборы. Правый клик — любимые наборы, закрепление набора за проектом и частые действия." }
];
var _tourI = 0;
function tourActive() { return !!document.getElementById(TOUR_ID); }
function startTour() {
    if (window.__MLBG_NO_TOUR__ === true) return; // тесты: снимки не должны ловить затемнение
    if (!document.getElementById(PANEL_ID)) return;
    endTour(false);
    _tourI = 0;
    var light = false; try { light = isLightTheme(); } catch (e) {}
    var root = /** @type {any} */ (el("div", "position:fixed; inset:0; z-index:100003; pointer-events:none;"));
    root.id = TOUR_ID;
    var hole = el("div", "position:fixed; border-radius:12px; border:2px solid var(--mlbg-accent); box-shadow:0 0 0 9999px rgba(0,0,0,0.5); transition:all .18s ease;");
    hole.className = "mlbg-tour-hole";
    var tip = el("div",
        "position:fixed; width:290px; box-sizing:border-box; padding:12px 14px; border-radius:14px; pointer-events:auto;" +
        "font-family:var(--vscode-font-family,sans-serif); font-size:12px; line-height:1.45;" +
        "background:" + (light ? "rgba(245,245,250,0.99)" : "rgba(24,24,37,0.99)") + "; color:" + (light ? "#1e1e2e" : "#cdd6f4") + ";" +
        "border:1px solid rgba(var(--mlbg-accent-rgb),0.45); box-shadow:0 16px 40px rgba(0,0,0,0.5);");
    tip.className = "mlbg-tour-tip";
    tip.setAttribute("role", "dialog"); tip.setAttribute("aria-live", "polite");
    var tt = el("div", "font-weight:700; font-size:13px; margin-bottom:4px; color:var(--mlbg-accent);");
    var tx = el("div", null);
    var nav = el("div", "display:flex; align-items:center; gap:8px; margin-top:10px;");
    var num = el("span", "flex:1 1 auto; font-size:11px; opacity:0.65;");
    var skip = el("div", "padding:4px 10px; border-radius:8px; cursor:pointer; font-size:11.5px; opacity:0.8;", t("Пропустить"));
    var next = el("div", "padding:4px 12px; border-radius:8px; cursor:pointer; font-size:11.5px; font-weight:600; color:#1e1e2e; background:var(--mlbg-accent);", t("Дальше"));
    keyActivate(skip, t("Пропустить")); keyActivate(next, t("Дальше"));
    skip.addEventListener("click", function (e) { e.stopPropagation(); endTour(true); });
    next.addEventListener("click", function (e) { e.stopPropagation(); _tourI++; showTourStep(); });
    tip.addEventListener("mousedown", function (e) { e.stopPropagation(); }, true); // не «клик мимо» панели
    tip.addEventListener("click", function (e) { e.stopPropagation(); });
    tip.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); endTour(true); } });
    nav.appendChild(num); nav.appendChild(skip); nav.appendChild(next);
    tip.appendChild(tt); tip.appendChild(tx); tip.appendChild(nav);
    root.appendChild(hole); root.appendChild(tip);
    root._p = { hole: hole, tip: tip, tt: tt, tx: tx, num: num, next: next };
    document.body.appendChild(root);
    showTourStep();
}
// Рамка цели: для all — общий прямоугольник всех совпавших элементов (ряд кнопок шапки).
function _tourRect(st) {
    var nodes = st.all ? document.querySelectorAll(st.sel) : [document.querySelector(st.sel)];
    var r = null;
    for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i]; if (!n || !n.getBoundingClientRect) continue;
        var b = n.getBoundingClientRect(); if (!b.width && !b.height) continue;
        r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) }
              : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    }
    return r;
}
function showTourStep() {
    var root = /** @type {any} */ (document.getElementById(TOUR_ID)); if (!root) return;
    var P = root._p, st = null, r = null;
    // шаг, чья цель не видна (панель узкая, кнопки BG нет), пропускаем
    while (_tourI < TOUR_STEPS.length) {
        st = TOUR_STEPS[_tourI]; r = _tourRect(st);
        if (r) break;
        _tourI++;
    }
    if (_tourI >= TOUR_STEPS.length || !r) { endTour(true); return; }
    var pad = 5, W = window.innerWidth || 800, H = window.innerHeight || 600;
    P.hole.style.left = (r.left - pad) + "px"; P.hole.style.top = (r.top - pad) + "px";
    P.hole.style.width = (r.right - r.left + pad * 2) + "px"; P.hole.style.height = (r.bottom - r.top + pad * 2) + "px";
    P.tt.textContent = t(st.title); P.tx.textContent = t(st.text);
    P.num.textContent = (_tourI + 1) + " " + t("из") + " " + TOUR_STEPS.length;
    P.next.textContent = _tourI === TOUR_STEPS.length - 1 ? t("Понятно") : t("Дальше");
    // Подсказка: слева от цели, если там есть место (панель прижата к правому краю), иначе
    // над/под целью. По краям окна — зажимаем.
    var tw = 290, th = P.tip.offsetHeight || 150, x, y;
    if (r.left - tw - 16 > 8) { x = r.left - tw - 16; y = Math.min(Math.max(8, r.top), H - th - 8); }
    else {
        x = Math.min(Math.max(8, r.left), W - tw - 8);
        y = (r.top - th - 14 > 8) ? r.top - th - 14 : Math.min(r.bottom + 14, H - th - 8);
    }
    P.tip.style.left = x + "px"; P.tip.style.top = y + "px";
    try { P.next.focus(); } catch (e) {}
}
// done=true — пройдено/пропущено (больше сам не покажется); false — просто убрать слой.
function endTour(done) {
    var root = document.getElementById(TOUR_ID); if (root && root.remove) root.remove();
    if (done) { cfg.ui.tour = true; try { saveCfg(); } catch (e) {} }
}
