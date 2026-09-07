// ===== Настройка меню и «Избранное» =====
// Панель разрослась до пяти вкладок и полусотни эффектов, поэтому её состав настраивается:
// любой пункт можно скрыть (настройки при этом не теряются) или закрепить наверху. Здесь —
// две сборки, которые делаются ПОСЛЕ создания всех секций: список видимости в «Настройке
// меню» и блок «Избранное» в шапке.

// ===== Менеджер «Настройка меню» =====
// Заполняем ПОСЛЕ сборки всех секций (panelAllSections уже полон, включая скрытые):
// чекбоксы видимости по секциям (сгруппированы по вкладкам) + по эффектам сетки + «Показать всё».
function buildMenuManager(secMenuBody, tabPanes) {
        var body = secMenuBody; if (!body || !body.appendChild) return;
        var byPane = [];
        for (var i = 0; i < tabPanes.length; i++) byPane.push([]);
        panelAllSections.forEach(function (s) {
            if (s.title === "Настройка меню") return; // сам менеджер не прячем
            var pi = tabPanes.indexOf(s.parent); if (pi >= 0) byPane[pi].push(s);
        });
        // Строка менеджера: галочка = видно в панели; звёздочка = закреплено в «Избранное».
        // isFav/onFav необязательны (для секций/эффектов их передаём). Снятая галочка НЕ теряет
        // сами настройки пункта — он лишь исчезает из панели и возвращается галочкой обратно.
        function visRow(label, isVisible, onToggle, isFav, onFav) {
            var row = el("label", ST.toggleRow);
            var cb = el("input", ST.checkbox); cb.type = "checkbox"; cb.checked = isVisible;
            cb.addEventListener("change", function () { onToggle(cb.checked); });
            row.appendChild(cb); row.appendChild(el("span", ST.fill, label));
            if (onFav) {
                var star = el("span", "flex:0 0 auto; width:16px; text-align:center; cursor:pointer; font-size:12px; color:" + (isFav ? "var(--mlbg-accent)" : "var(--mlp-faint,#6c7086)") + ";", isFav ? "★" : "☆");
                star.title = isFav ? t("Убрать из избранного") : t("В избранное");
                star.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); onFav(!isFav); });
                keyActivate(star, (isFav ? t("Убрать из избранного") : t("В избранное")) + ": " + label);
                row.appendChild(star);
            }
            return row;
        }
        body.appendChild(el("div", "padding:2px 3px 6px; font-size:11px; line-height:1.4; color:var(--mlp-faint,#6c7086);",
            t("Галочка — показывать пункт в панели; звёздочка — закрепить его в «Избранное» вверху. Снятая галочка ничего не теряет — пункт вернётся, если поставить её снова.")));
        body.appendChild(el("div", "padding:2px 3px 2px; font-size:11px; color:var(--mlp-muted,#a6adc8);", t("Секции")));
        byPane.forEach(function (secs, pi) {
            if (!secs.length) return;
            body.appendChild(el("div", "margin-top:4px; padding:2px 3px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--mlp-head,#bac2de);", t(TABS[pi])));
            secs.forEach(function (s) {
                body.appendChild(visRow(s.label || s.title, !(cfg.ui.hidden && cfg.ui.hidden[s.title]), function (vis) {
                    if (!cfg.ui.hidden) cfg.ui.hidden = {};
                    if (vis) delete cfg.ui.hidden[s.title]; else cfg.ui.hidden[s.title] = true;
                    saveCfg(); refreshPanel();
                }, !!(cfg.ui.favSec && cfg.ui.favSec[s.title]), function (fav) {
                    if (!cfg.ui.favSec) cfg.ui.favSec = {};
                    if (fav) cfg.ui.favSec[s.title] = true; else delete cfg.ui.favSec[s.title];
                    saveCfg(); refreshPanel();
                }));
            });
        });
        body.appendChild(el("div", "margin-top:8px; padding:2px 3px 2px; font-size:11px; color:var(--mlp-muted,#a6adc8);", t("Эффекты в сетке")));
        var fxGrid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:0 10px;");
        FX_LIST.forEach(function (o) {
            fxGrid.appendChild(visRow(t(o[1]), !(cfg.ui.hiddenFx && cfg.ui.hiddenFx[o[0]]), function (vis) {
                if (!cfg.ui.hiddenFx) cfg.ui.hiddenFx = {};
                if (vis) delete cfg.ui.hiddenFx[o[0]]; else cfg.ui.hiddenFx[o[0]] = true;
                saveCfg(); refreshPanel();
            }, !!(cfg.ui.favFx && cfg.ui.favFx[o[0]]), function (fav) {
                if (!cfg.ui.favFx) cfg.ui.favFx = {};
                if (fav) cfg.ui.favFx[o[0]] = true; else delete cfg.ui.favFx[o[0]];
                saveCfg(); refreshPanel();
            }));
        });
        body.appendChild(fxGrid);
        var showAll = el("div", "margin-top:8px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", t("Показать всё"));
        showAll.addEventListener("click", function () { cfg.ui.hidden = {}; cfg.ui.hiddenFx = {}; saveCfg(); refreshPanel(); });
        keyActivate(showAll, t("Показать все секции и эффекты"));
        body.appendChild(showAll);
}

// ===== Наполнение блока «Избранное» =====
// Строим В КОНЦЕ: нужны и полный список секций (panelAllSections), и навигация (sectionByTitle/
// selectTab/flashSection). Секции показываем чипами-переходами (перенести их DOM в два места
// нельзя), а эффекты — реальными тумблерами (быстрое включение без прыжков по вкладкам).
function buildFavorites(favBox, panelBody) {
        var box = favBox; if (!box) return;
        box.textContent = ""; box.hidden = true;
        var favSecTitles = [], favFxItems = [];
        panelAllSections.forEach(function (s) {
            if (s.title === "Настройка меню") return;
            if (cfg.ui.favSec && cfg.ui.favSec[s.title] && favSecTitles.indexOf(s.title) < 0) favSecTitles.push(s.title);
        });
        FX_LIST.forEach(function (o) { if (cfg.ui.favFx && cfg.ui.favFx[o[0]]) favFxItems.push(o); });
        var has = favSecTitles.length || favFxItems.length;
        if (!has && !panelEditMenu) return; // пусто и не в режиме «Настроить» — блок скрыт целиком
        box.hidden = false;
        box.appendChild(el("div", "margin:4px 2px 2px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", t("★ Избранное")));
        if (!has) {
            box.appendChild(el("div", "padding:3px 3px 5px; font-size:11px; color:var(--mlp-faint,#6c7086);", t("Отметь звёздочкой секции и эффекты в режиме «Настроить» — они появятся здесь для быстрого доступа.")));
        } else {
            if (favSecTitles.length) {
                var chipRow = el("div", "display:flex; flex-wrap:wrap; gap:4px; padding:2px 2px 3px;");
                favSecTitles.forEach(function (title) {
                    var chip = el("div", "flex:0 0 auto; padding:3px 8px; border-radius:6px; cursor:pointer; font-size:10.5px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.10); border:1px solid rgba(var(--mlbg-accent-rgb),0.22);", t(title));
                    chip.addEventListener("mouseenter", function () { chip.style.background = "rgba(var(--mlbg-accent-rgb),0.2)"; });
                    chip.addEventListener("mouseleave", function () { chip.style.background = "rgba(var(--mlbg-accent-rgb),0.1)"; });
                    chip.addEventListener("click", function () {
                        var s = sectionByTitle(title); if (!s) return;
                        var ti = tabPanes.indexOf(s.parent); if (ti >= 0) selectTab(ti);
                        try { s.expand(); } catch (e) {} try { flashSection(s.head); } catch (e) {}
                    });
                    keyActivate(chip, t("Перейти к секции") + ": " + t(title));
                    chipRow.appendChild(chip);
                });
                box.appendChild(chipRow);
            }
            if (favFxItems.length) {
                var grid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px; padding:2px 0 3px;");
                favFxItems.forEach(function (o) {
                    var node = makeCheck(o[0], o[1]);
                    var pOn = function () { previewFx(o[0]); }, pOff = function () { previewFxEnd(); };
                    node.addEventListener("mouseenter", pOn); node.addEventListener("mouseleave", pOff);
                    var cb = node.querySelector ? node.querySelector("input") : null;
                    if (cb) {
                        cb.addEventListener("change", function () { previewFxCancel(); try { refreshPanel(); } catch (e) {} });
                        cb.addEventListener("focus", pOn); cb.addEventListener("blur", pOff);
                    }
                    grid.appendChild(node);
                });
                box.appendChild(grid);
            }
        }
        box.appendChild(el("div", "margin:5px 0 0; border-bottom:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));"));
}
