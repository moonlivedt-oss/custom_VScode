// ===== Секция «Эффекты» =====
// Полсотни тумблеров — это уже не список, а интерфейс: поиск по названию, фильтр «только
// включённые», группировка по смыслу, предпросмотр по наведению и пометка «отличается от
// значения по умолчанию». Всё это здесь, отдельно от каркаса панели.

// Состояние фильтра секции «Эффекты» (текст поиска + «только включённые»). Тоже модульное,
// как panelTab: переживает refreshPanel в пределах сессии, поэтому фоновая пересборка панели
// (слайдшоу/по времени) не сбрасывает набранный фильтр под руками пользователя.
// fxOnlyOn — фильтр «только включённые» секции «Эффекты» (переживает refreshPanel в пределах
// сессии). Отдельного текстового фильтра эффектов больше нет: его роль взял на себя единый поиск
// над баром вкладок. fxFocusKey — эффект, к которому нужно прокрутить и подсветить
// после перехода из поиска (одноразовый, гасится в buildEffectsSection). panelFxNodes — карта
// key -> строка-тумблер (для прокрутки к эффекту). panelStartFocus — секция, на которой открыть
// панель при первом запуске (онбординг); гасится после разворота.
var fxOnlyOn = false, fxFocusKey = "", panelStartFocus = "", panelFxNodes = {};
// Секция «Эффекты» (наполнение готового тела secFx). Вынесена из togglePanel: логика
// разрослась (счётчик включённых, фильтры поиск/«только включённые», сетка тумблеров,
// слайдеры «силы», стиль частиц), и держать её отдельно чище. Зависит только от secFx +
// модульного/глобального окружения (FX_LIST, PARAMS, cfg, makeCheck/makeParamSlider,
// makePartStyleSelect, fxOnlyOn), поэтому не тянет за собой локали togglePanel.
function buildEffectsSection(secFx) {
    // Шапка секции: счётчик включённых эффектов + быстрый фильтр «только включённые».
    // Помогает ориентироваться в полусотне тумблеров и одним кликом свернуть список
    // до активных. Счётчик пересчитывается при переключении любого тумблера (см. updateFxView).
    var onlyOn = fxOnlyOn; // восстановить состояние фильтра, переживающее refreshPanel
    var fxHead = el("div", "display:flex; align-items:center; gap:8px; margin-bottom:5px;");
    var fxCount = el("span", "flex:0 0 auto; font-size:11px; color:var(--mlp-muted,#a6adc8);", "");
    var onlyBtn = el("div", "flex:0 0 auto; margin-left:auto; padding:3px 9px; border-radius:6px; cursor:pointer; font-size:11px;", t("только включённые"));
    function styleOnlyBtn() {
        onlyBtn.style.color = onlyOn ? "var(--mlbg-accent)" : "var(--mlp-muted,#a6adc8)";
        onlyBtn.style.background = onlyOn ? "rgba(var(--mlbg-accent-rgb),0.18)" : "rgba(var(--mlbg-accent-rgb),0.06)";
        onlyBtn.style.border = "1px solid " + (onlyOn ? "rgba(var(--mlbg-accent-rgb),0.5)" : "var(--mlp-border-faint,rgba(205,214,244,0.12))");
        onlyBtn.setAttribute("aria-pressed", onlyOn ? "true" : "false");
    }
    fxHead.appendChild(fxCount); fxHead.appendChild(onlyBtn);
    // Отдельного текстового фильтра эффектов больше нет: его роль взял единый поиск
    // над баром вкладок — он находит эффект по имени и прокручивает прямо к нему. Здесь остаются
    // только счётчик и «только включённые», а сами эффекты сгруппированы по категориям (ниже).
    var fxEmpty = el("div", "padding:6px 3px; font-size:11px; color:var(--mlp-faint,#6c7086);", t("Ничего не найдено."));
    fxEmpty.hidden = true;
    secFx.appendChild(fxHead);

    // Одна строка-тумблер эффекта: чекбокс (makeCheck) + маркер «изменено» + в режиме
    // «Настроить» звезда «в избранное» и кнопка «скрыть/показать» + предпросмотр при наведении.
    var fxRows = [];
    function buildFxRow(o) {
        var key = o[0];
        var isHidden = !!(cfg.ui.hiddenFx && cfg.ui.hiddenFx[key]);
        if (isHidden && !panelEditMenu) return null; // скрытый эффект не показываем (вне режима настройки)
        var node = makeCheck(key, o[1]);
        // Эффект-надстройка над выключенным эффектом ничего не делает. Не прячем (иначе его
        // не найти поиском), но показываем приглушённым и объясняем, чего не хватает.
        var need = FX_REQUIRES[key];
        if (need && !cfg.fx[need]) {
            node.style.opacity = "0.5";
            node.title = t("Нужен эффект: ") + t(fxLabel(need));
        }
        // Маркер «изменено»: точка, если состояние отличается от дефолта — так
        // видно, что эффект трогали (особенно ценно для выключенного эффекта, включённого по
        // умолчанию: по снятой галочке этого не понять).
        if (cfg.fx[key] !== DEFAULTS.fx[key]) {
            var dot = el("span", "flex:0 0 auto; width:6px; height:6px; border-radius:50%; background:var(--mlbg-accent); opacity:0.7; margin-left:2px;", "");
            dot.title = t("Отличается от значения по умолчанию");
            node.appendChild(dot);
        }
        if (panelEditMenu) {
            // Звезда «в избранное»: закрепляет эффект в блоке «Избранное» вверху панели.
            var isFav = !!(cfg.ui.favFx && cfg.ui.favFx[key]);
            var star = el("span", "flex:0 0 auto; margin-left:4px; width:16px; text-align:center; cursor:pointer; font-size:12px; color:" + (isFav ? "var(--mlbg-accent)" : "var(--mlp-faint,#6c7086)") + ";", isFav ? "★" : "☆");
            star.title = isFav ? t("Убрать из избранного") : t("В избранное");
            star.addEventListener("click", function (e) {
                e.stopPropagation(); e.preventDefault();
                if (!cfg.ui.favFx) cfg.ui.favFx = {};
                if (isFav) delete cfg.ui.favFx[key]; else cfg.ui.favFx[key] = true;
                saveCfg(); try { refreshPanel(); } catch (er) {}
            });
            keyActivate(star, (isFav ? t("Убрать из избранного") : t("В избранное")) + ": " + t(o[1]));
            node.appendChild(star);
            // Кнопка «скрыть/показать» этого эффекта (без переключения самого эффекта).
            var eb = el("span", "flex:0 0 auto; margin-left:4px; padding:0 6px; border-radius:5px; font-size:10px; cursor:pointer; " +
                (isHidden ? "color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);"
                          : "color:#f38ba8; background:rgba(243,139,168,0.14); border:1px solid rgba(243,139,168,0.3);"),
                isHidden ? t("показать") : t("скрыть"));
            eb.addEventListener("click", function (e) {
                e.stopPropagation(); e.preventDefault();
                if (!cfg.ui.hiddenFx) cfg.ui.hiddenFx = {};
                if (isHidden) delete cfg.ui.hiddenFx[key]; else cfg.ui.hiddenFx[key] = true;
                saveCfg(); try { refreshPanel(); } catch (er) {}
            });
            keyActivate(eb, (isHidden ? t("показать") : t("скрыть")) + ": " + t(o[1]));
            node.appendChild(eb);
            if (isHidden) node.style.opacity = "0.5";
        }
        // Предпросмотр при наведении/фокусе: временно включает выключенный эффект.
        var pOn = function () { previewFx(key); }, pOff = function () { previewFxEnd(); };
        node.addEventListener("mouseenter", pOn);
        node.addEventListener("mouseleave", pOff);
        // Чекбокс — input внутри строки. Переключение фиксирует выбор (превью не откатывает) и
        // пересчитывает счётчик/фильтр без пересборки панели. Фокус/блюр — превью с клавиатуры.
        var cb = node.querySelector ? node.querySelector("input") : null;
        if (cb) {
            // Переключение фиксирует выбор (превью не откатывает) и пересчитывает счётчик. Если
            // эффект в избранном — пересобираем панель, чтобы его копия-тумблер вверху синхронизировалась.
            cb.addEventListener("change", function () { previewFxCancel(); updateFxView(); if (cfg.ui.favFx && cfg.ui.favFx[key]) { try { refreshPanel(); } catch (er) {} } });
            cb.addEventListener("focus", pOn);
            cb.addEventListener("blur", pOff);
        }
        panelFxNodes[key] = node; // для прокрутки к эффекту из единого поиска
        fxRows.push({ node: node, key: key, label: t(o[1]).toLowerCase(), group: FX_GROUPS[key] || "other" });
        return node;
    }

    // Раскладка по группам: у каждой категории свой подзаголовок и сетка 2×N.
    // Группа без единой видимой строки (все её эффекты скрыты) не рисуется. «other» — страховка
    // для эффекта, забытого в FX_GROUPS (линтер смоука следит, чтобы такого не было).
    var groups = {};
    function buildGroup(gkey, glabel) {
        var built = [];
        FX_LIST.forEach(function (o) { if ((FX_GROUPS[o[0]] || "other") === gkey) { var n = buildFxRow(o); if (n) built.push(n); } });
        if (!built.length) return;
        var header = el("div", "margin-top:7px; padding:3px 3px 1px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", t(glabel));
        var grid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px;");
        built.forEach(function (n) { grid.appendChild(n); });
        groups[gkey] = { header: header, grid: grid };
        secFx.appendChild(header); secFx.appendChild(grid);
    }
    FX_GROUP_ORDER.forEach(function (g) { buildGroup(g[0], g[1]); });
    buildGroup("other", "Прочее"); // эффекты без явной группы (обычно пусто)
    secFx.appendChild(fxEmpty);

    function updateFxView() {
        var shown = 0, on = 0, perGroup = {};
        fxRows.forEach(function (r) {
            var isOn = !!cfg.fx[r.key]; if (isOn) on++;
            var hide = (onlyOn && !isOn);
            r.node.hidden = hide; if (!hide) { shown++; perGroup[r.group] = (perGroup[r.group] || 0) + 1; }
        });
        for (var gk in groups) { var vis = perGroup[gk] > 0; groups[gk].header.hidden = !vis; groups[gk].grid.hidden = !vis; }
        fxCount.textContent = t("Включено: ") + on + " / " + fxRows.length;
        fxEmpty.hidden = shown > 0;
    }
    onlyBtn.addEventListener("click", function () { onlyOn = !onlyOn; fxOnlyOn = onlyOn; styleOnlyBtn(); updateFxView(); });
    keyActivate(onlyBtn, "Показывать только включённые эффекты");
    styleOnlyBtn(); updateFxView();

    // Числовая «сила» эффектов — под тумблерами. Параметры, зависящие от выключенного
    // эффекта, не показываем: «Частиц» — только когда включены «Частицы», «Помидор, мин» —
    // когда включён «Помидор» (тумблеры particles/pomodoro пересобирают панель, см. makeCheck).
    secFx.appendChild(el("div", "margin-top:8px; padding:3px 3px 1px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", t("Сила")));

    var shownParams = 0;
    PARAMS.forEach(function (d) {
        if (!paramNeeded(d[0])) return;   // ползунок без своего эффекта ничего не меняет
        shownParams++;
        secFx.appendChild(makeParamSlider(d));
    });
    if (!shownParams) secFx.appendChild(el("div", "padding:4px 4px 2px; font-size:11px; color:var(--mlp-muted,#a6adc8);",
        t("Ползунки силы появятся, когда включишь эффекты, к которым они относятся.")));
    if (cfg.fx.particles) secFx.appendChild(makePartStyleSelect()); // форма частиц — только когда частицы включены

    // Сброс всей секции к дефолту: тумблеры + сила + стиль частиц. Появляется,
    // только когда есть что сбрасывать (что-то отличается от DEFAULTS) — иначе кнопка-пустышка.
    if (fxDiffersFromDefault()) {
        var resetFx = el("div", "margin-top:8px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:#f38ba8; background:rgba(243,139,168,0.12); border:1px solid rgba(243,139,168,0.3);", t("Сбросить эффекты к дефолту"));
        resetFx.addEventListener("mouseenter", function () { resetFx.style.background = "rgba(243,139,168,0.22)"; });
        resetFx.addEventListener("mouseleave", function () { resetFx.style.background = "rgba(243,139,168,0.12)"; });
        resetFx.addEventListener("click", function () {
            cfg.fx = clone(DEFAULTS.fx); cfg.fxp = clone(DEFAULTS.fxp); cfg.partStyle = DEFAULTS.partStyle;
            apply(); refreshPanel();
            toast(t("Эффекты сброшены к значениям по умолчанию"));
        });
        keyActivate(resetFx, t("Сбросить эффекты к дефолту"));
        secFx.appendChild(resetFx);
    }
    secFx.appendChild(makePerfGuardToggle()); // авто-приглушение тяжёлых эффектов при низком FPS
    secFx.appendChild(makePerfStatus());      // живой индикатор FPS/эконом-режима
}
// Отличается ли что-то в эффектах (тумблеры/сила/стиль частиц) от значений по умолчанию —
// нужно, чтобы показывать кнопку «Сбросить эффекты» только когда она осмысленна.
function fxDiffersFromDefault() {
    try {
        var k;
        for (k in DEFAULTS.fx) if (cfg.fx[k] !== DEFAULTS.fx[k]) return true;
        for (k in DEFAULTS.fxp) if (cfg.fxp[k] !== DEFAULTS.fxp[k]) return true;
        if (cfg.partStyle !== DEFAULTS.partStyle) return true;
    } catch (e) {}
    return false;
}
