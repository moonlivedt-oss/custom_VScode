// ===== Наполнение вкладок панели =====
// Каркас панели (шапка, вкладки, поиск, перетаскивание) собирает togglePanel в
// src/ui/panel.js, а КАКИЕ секции лежат на каждой вкладке — здесь. Каждая функция получает
// готовую страницу-вкладку и наполняет её секциями.
//
// Простой режим (panelSimple(), по умолчанию) показывает только главное: наборы и своя
// картинка, яркость и акцент, стиль эффектов, образы. Остальное строится лишь в полном режиме.

// ===== «Что нового» =====
// Одна карточка после обновления: три строки и «Понятно». Показывается, пока cfg.ui.news не
// равен NEWS_ID; следующий выпуск — новый NEWS_ID и новый текст.
var NEWS_ID = "2026-09-27";
var NEWS_TEXT = [
    "Простой режим: на виду только главное, остальное — «Все настройки».",
    "Своя картинка или целая папка — кнопками ниже или перетаскиванием в панель.",
    "Стили эффектов в один клик и копии настроек по дням."
];
function makeNewsCard() {
    if (cfg.ui.news === NEWS_ID) return null;
    var card = el("div", null); card.className = "mlp-news";
    var ic = uiIcon("tab-fx", 28); if (ic) card.appendChild(ic);
    var body = el("div", "flex:1 1 auto; min-width:0;");
    body.appendChild(el("b", null, t("Что нового")));
    NEWS_TEXT.forEach(function (s) { body.appendChild(el("div", null, t(s))); });
    card.appendChild(body);
    var ok = el("div", null, t("Понятно")); ok.className = "mlp-hbtn";
    ok.addEventListener("click", function () { cfg.ui.news = NEWS_ID; saveCfg(); refreshPanel(); });
    keyActivate(ok, t("Понятно"));
    card.appendChild(ok);
    return card;
}

// ===== Один совет за раз =====
// Панель сама замечает типичную проблему и предлагает одно действие. Не больше одного совета
// одновременно; «Не показывать» запоминается (cfg.ui.tipsOff). Совет исчезает, как только
// проблема решена.
function currentTip() {
    var off = cfg.ui.tipsOff || {};
    try {
        var r = readability();
        if (!off.readable && r && !r.off && r.worstRatio < 4.5)
            return { id: "readable", text: "Код местами читается хуже: картинка слишком яркая под текстом.", btn: "Приглушить фон",
                act: function () { fixReadability(4.5); apply(); toast(t("Фон приглушён ровно настолько, чтобы код читался")); } };
        var st = probeImage(zoneUrl(activeIndex(), "editor"));
        if (!off.autodim && !cfg.autoDim && st && typeof st.luma === "number" && st.luma > 0.55)
            return { id: "autodim", text: "Картинка светлая — включить авто-яркость, чтобы код не терялся?", btn: "Включить",
                act: function () { cfg.autoDim = true; apply(); } };
    } catch (e) {}
    return null;
}
function makeTipCard() {
    var tip = currentTip(); if (!tip) return null;
    var card = el("div", null); card.className = "mlp-tip";
    card.appendChild(el("span", "flex:1 1 auto;", t(tip.text)));
    var go = el("div", null, t(tip.btn)); go.className = "mlp-hbtn on";
    go.addEventListener("click", function () { tip.act(); refreshPanel(); });
    keyActivate(go, t(tip.btn));
    var no = el("div", null, "\u2715"); no.className = "mlp-hbtn"; no.title = t("Не показывать этот совет");
    no.addEventListener("click", function () { if (!cfg.ui.tipsOff) cfg.ui.tipsOff = {}; cfg.ui.tipsOff[tip.id] = true; saveCfg(); refreshPanel(); });
    keyActivate(no, t("Не показывать этот совет"));
    card.appendChild(go); card.appendChild(no);
    return card;
}

// Вкладка «Набор»: какой фон показывать и откуда он берётся.
function buildTabSets(tSet) {
    var simple = panelSimple();
    var news = makeNewsCard(); if (news) tSet.appendChild(news);
    var secSet = collapsible(tSet, "Набор", "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске. Свою картинку можно выбрать кнопкой или перетащить в панель.");
    // Фильтр «Все / Любимые»: наборов 25+, любимые (звёздочка на карточке) удобно держать отдельно.
    // Активный набор показываем всегда — чтобы было видно, что выбрано.
    var favN = 0; for (var fi = 0; fi < SETS.length; fi++) if (isFavSet(fi)) favN++;
    var onlyFav = !!cfg.ui.favOnly;
    secSet.appendChild(makeSeg("", [["all", "Все"], ["fav", t("Любимые") + (favN ? " · " + favN : "")]],
        function () { return onlyFav ? "fav" : "all"; },
        function (v) {
            cfg.ui.favOnly = v === "fav"; saveCfg(); refreshPanel();
        }));
    var chips = el("div", null); chips.className = "mlp-sets";
    for (var i = 0; i < SETS.length; i++) {
        if (onlyFav && !isFavSet(i) && cfg.mode !== String(i)) continue;
        chips.appendChild(makeChip(String(i), String(i)));
    }
    if (onlyFav && !favN) secSet.appendChild(emptyState("Отметь наборы звёздочкой на карточке — они появятся здесь"));
    chips.appendChild(makeChip("random", "случайно"));
    secSet.appendChild(chips);
    secSet.appendChild(makeOwnImageRow()); // своя картинка / папка картинок
    if (!simple) secSet.appendChild(makeSetNameEdit()); // переименование активного набора

    if (simple) return;
    // Генератор набора по seed/палитре: бесконечные согласованные фоны без ассетов.
    var secGen = collapsible(tSet, "Генератор", "Создать согласованный набор из seed-строки или базового цвета (#rrggbb): тёмная подложка + акцент + гармоничный спутник. Один seed всегда даёт один и тот же набор — им можно делиться. Наборы сохраняются и добавляются в конец списка.");
    secGen.appendChild(makeGenerator());

    // Библиотека своих картинок: список локальных путей, крутится в редакторе по таймеру слайдшоу.
    var secLib = collapsible(tSet, "Библиотека", "Свои картинки списком: когда «Крутить библиотеку» включено, они по очереди показываются в редакторе и сменяются по таймеру слайдшоу (интервал — на вкладке «Авто-смена»). Пути локальные: file:/// или vscode-file://.");
    secLib.appendChild(makeLibraryUI());

    // Свой шейдер: тоже «свой источник фона», только считаемый на GPU.
    var secShader = collapsible(tSet, "Шейдер", "Свой GLSL-фон для набора «Свой шейдер»: тело функции render(vec2 p). Ошибка компиляции не ломает редактор — фон откатится на встроенный.");
    secShader.appendChild(makeShaderSrcUI());
}

// Карточка «Сейчас работает»: какой набор на экране и какое правило его выбрало.
function makeActiveRuleCard() {
    var r = activeRule();
    var card = el("div", null); card.className = "mlp-now";
    var pv = el("div", null); pv.className = "mlp-now-pv";
    try { paintSetPreview(pv, r.idx); } catch (e) {}
    card.appendChild(pv);
    var txt = el("div", null); txt.className = "mlp-now-t";
    var nm = setName(r.idx);
    txt.appendChild(el("b", null, t("Сейчас: набор ") + r.idx + (nm ? " · " + nm : "")));
    var WHY = {
        workspace: t("по проекту") + (r.key ? " «" + r.key + "»" : ""),
        remote: t("по репозиторию") + (r.key ? " «" + r.key + "»" : ""),
        branch: t("по ветке") + (r.key ? " «" + r.key + "»" : ""),
        lang: t("по языку файла") + (r.key ? " «" + r.key + "»" : ""),
        random: t("случайный при каждом запуске"),
        time: t("по времени суток"),
        slide: t("слайдшоу"),
        manual: t("выбран вручную — авто-смена выключена")
    };
    var why = WHY[r.why] || "";
    if (cfg.librarySlideshow) why += t("; в редакторе крутится библиотека");
    txt.appendChild(el("span", null, t("Правило: ") + why));
    card.appendChild(txt);
    return card;
}

// Вкладка «Авто-смена»: правила выбора набора в порядке старшинства (как в activeIndex):
// сработает верхнее включённое. Номер и «вкл» — прямо в заголовке секции.
function buildTabAuto(tAuto) {
    tAuto.appendChild(makeActiveRuleCard());
    tAuto.appendChild(el("div", "padding:6px 3px 0; font-size:11px; color:var(--mlp-faint);",
        t("Правила ниже — по старшинству: срабатывает верхнее включённое.")));
    function rule(n, title, on, info) { return collapsible(tAuto, title, info, { num: n, on: !!on }); }

    var secWs = rule(1, "По проекту", cfg.autoWorkspace, "Набор под открытый проект и полоска-индикатор git-ветки. Держатся на чтении заголовка и статусбара VS Code.");
    secWs.appendChild(makeWorkspaceUI());
    secWs.appendChild(makeAmbientBranchToggle());

    var secRemote = rule(2, "По репозиторию", cfg.autoRemote, "Набор под удалённый репозиторий (владелец/имя): один и тот же проект, склонированный в разные папки, получает один фон. Адрес репозитория берётся из git через компаньон-расширение — из вёрстки редактора его не достать.");
    secRemote.appendChild(makeRemoteAutoUI());

    var secBranch = rule(3, "По ветке", cfg.autoBranch, "Набор под текущую git-ветку: main/master — один, фиче-ветки — другой. Приоритетнее слайдшоу и времени суток, но уступает «по проекту». Ветка читается из статусбара VS Code.");
    secBranch.appendChild(makeBranchAutoUI());

    var secLang = rule(4, "По языку", cfg.autoLang, "Набор под язык активного файла (по расширению): напр. .py — один набор, .md — другой. Самый частый контекст (низший приоритет). Расширение читается из подписи активной вкладки.");
    secLang.appendChild(makeLangAutoUI());

    var secTime = rule(5, "По времени суток", cfg.autoTime && cfg.autoTime.on, "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».");
    secTime.appendChild(makeAutoTimeToggle());
    secTime.appendChild(makeSetPicker("day", "Дневной"));
    secTime.appendChild(makeSetPicker("night", "Ночной"));
    secTime.appendChild(makeAutoTimeMode());
    if (cfg.autoTime && cfg.autoTime.mode === "sun") {
        secTime.appendChild(makeObjSlider(cfg.autoTime, "lat", "Широта", -90, 90, 1, 0, INFO.autotime_lat, DEFAULTS.autoTime.lat));
        secTime.appendChild(makeObjSlider(cfg.autoTime, "lon", "Долгота", -180, 180, 1, 0, INFO.autotime_lon, DEFAULTS.autoTime.lon));
    } else {
        secTime.appendChild(makeObjSlider(cfg.autoTime, "from", "День с, ч", 0, 23, 1, 0, INFO.autotime_from, DEFAULTS.autoTime.from));
        secTime.appendChild(makeObjSlider(cfg.autoTime, "to", "День до, ч", 0, 23, 1, 0, INFO.autotime_to, DEFAULTS.autoTime.to));
    }

    var secSlide = rule(6, "Слайдшоу", cfg.slideshow && cfg.slideshow.on, "Автоматическая смена набора по кругу через заданный интервал.");
    secSlide.appendChild(makeSlideToggle());
    if (cfg.slideshow.on) secSlide.appendChild(makeObjSlider(cfg.slideshow, "min", "Интервал, мин", 1, 120, 1, 0, INFO.slide_min, DEFAULTS.slideshow.min));
}

// Вкладка «Вид»: как этот фон выглядит и не мешает ли он читать код.
function buildTabView(tView) {
    var simple = panelSimple();
    // Одна «Яркость фона» + раскрытие «по зонам»; авто-яркость и метр читаемости рядом.
    var secOp = collapsible(tView, "Яркость набора", "Насколько ярко проступает фон. Один ползунок двигает все зоны сразу; «по зонам» — тонкая настройка редактора, сайдбара и панели.");
    secOp.appendChild(makeOpMaster());
    if (!simple) secOp.appendChild(makeAutoDim());
    secOp.appendChild(makeReadabilityUI());

    // Картинка: акцент (+ палитры) и в полном режиме — точка фокуса и фильтры картинки.
    var secImg = collapsible(tView, "Картинка", "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.");
    secImg.appendChild(makeAccentColor());
    secImg.appendChild(makeAccentSafeUI());
    secImg.appendChild(makeImgLook());
    if (simple) return;
    secImg.appendChild(makeFocusPoint());
    secImg.appendChild(makeImgFilters());

    // Витрина/скринсейвер: после простоя — крупные часы и имя набора поверх экрана.
    var secSaver = collapsible(tView, "Витрина", "После нескольких минут простоя показывает крупные часы, дату и имя набора поверх экрана; любое действие возвращает редактор. Удобно для стрима и «настроения» рабочего стола.");
    secSaver.appendChild(makeScreensaverToggle());
    if (cfg.screensaver.on) secSaver.appendChild(makeObjSlider(cfg.screensaver, "min", "Простой, мин", 1, 60, 1, 0, INFO.screensaver_min, DEFAULTS.screensaver.min));
}

// Вкладка «Эффекты»: сверху стили (готовые профили — один клик вместо полусотни тумблеров),
// ниже в полном режиме — тонкая настройка каждого эффекта.
function buildTabFx(tFx) {
    var secStyle = collapsible(tFx, "Стили", "Готовые стили вида: спокойный, фокус, презентация, минимал, максимум. Один клик настраивает фон и эффекты целиком. Наведи — примерка без применения.");
    secStyle.appendChild(makeProfilesUI());
    if (panelSimple()) {
        var more = makeIoBtn("Тонкая настройка эффектов");
        more.style.marginTop = "10px";
        more.addEventListener("click", function () { cfg.ui.simple = false; cfg.ui.tab = tabIndex("Эффекты"); saveCfg(); refreshPanel(); });
        tFx.appendChild(more);
        return;
    }
    var secFx = collapsible(tFx, "Эффекты", "Включение/выключение визуальных эффектов и их сила. Наведи на пункт — пояснение и живой предпросмотр. Эффекты сгруппированы по смыслу; «только включённые» прячет выключенные. Конкретный эффект ищи полем поиска вверху панели.");
    buildEffectsSection(secFx);
}

// Образец терминала для вкладки «Терминал». _sync() перечитывает cfg.term.
function makeTermSample() {
    var box = el("div", null); box.className = "mlp-term";
    var l1 = el("div", null);
    l1.appendChild(el("span", "color:#a6e3a1;", "~/project"));
    l1.appendChild(el("span", "color:var(--mlbg-accent);", " git:(main) "));
    l1.appendChild(el("span", null, "npm run build"));
    var l2 = el("div", null);
    l2.appendChild(el("span", "color:#89b4fa;", "=> "));
    l2.appendChild(el("span", null, "const ok = a !== b && x >= 0;"));
    var l3 = el("div", null);
    l3.appendChild(el("span", "color:#f9e2af;", "$ "));
    var sel = el("span", null, "echo done"); l3.appendChild(sel);
    l3.appendChild(el("span", null, " "));
    var cur = el("span", null); cur.className = "mlp-term-cur"; l3.appendChild(cur);
    box.appendChild(l1); box.appendChild(l2); box.appendChild(l3);
    box._sync = function () {
        try {
            var tm = cfg.term, g = Number(tm.glow) || 0, cc = effTermColor("cursorColor");
            box.style.fontFamily = "'" + tm.font + "', var(--vscode-editor-font-family, monospace), monospace";
            box.style.fontWeight = String(tm.weight || 400);
            box.style.fontVariantLigatures = tm.ligatures ? "normal" : "none";
            box.style.fontFeatureSettings = tm.ligatures ? "normal" : "'liga' 0, 'calt' 0";
            box.style.textShadow = g > 0 ? "0 0 " + g + "px rgba(var(--mlbg-accent-rgb)," + Math.min(g * 0.1, 0.6).toFixed(2) + ")" : "none";
            sel.style.background = effTermColor("selColor"); sel.style.borderRadius = "2px";
            var cw = Math.max(1, Math.round(2 + (Number(tm.cursorSize) || 1) * 3)), ch = Math.max(0.6, Math.min(1.4, 0.6 + (Number(tm.cursorHeight) || 1) * 0.35));
            cur.style.width = cw + "px"; cur.style.height = ch.toFixed(2) + "em";
            cur.style.background = cc;
            cur.style.boxShadow = tm.cursorGlow ? "0 0 8px " + cc : "none";
        } catch (e) {}
    };
    box._sync();
    return box;
}

// Вкладка «Терминал»: типографика встроенного терминала.
function buildTabTerm(tTerm) {
    var secTerm = collapsible(tTerm, "Терминал", "Оформление интегрированного терминала: шрифт, лигатуры, свечение, курсор, выделение. Цвета курсора и выделения, пока их не меняли, следуют за акцентом набора.");
    // Живой образец: контролы секции меняют cfg.term без пересборки панели, поэтому образец
    // слушает их события сам (как образец текста в настройках cpp-docs-panel).
    var sample = makeTermSample();
    secTerm.appendChild(sample);
    ["input", "change", "click"].forEach(function (ev) { secTerm.addEventListener(ev, function () { setTimeout(sample._sync, 0); }); });
    secTerm.appendChild(makeTermSelect());
    var tgrid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px;");
    tgrid.appendChild(makeTermCheck("ligatures", "Лигатуры"));
    tgrid.appendChild(makeTermCheck("cursorGlow", "Свеч. курсора"));
    secTerm.appendChild(tgrid);
    secTerm.appendChild(makeTermSlider("glow", "Свечение", 0, 6, 0.5, 1));
    secTerm.appendChild(makeTermSlider("weight", "Жирность", 400, 800, 100, 0));
    secTerm.appendChild(makeTermSlider("cursorSize", "Кур. шир.", 0, 2.5, 0.1, 1));
    secTerm.appendChild(makeTermSlider("cursorHeight", "Кур. выс.", 0, 2.5, 0.1, 1));
    secTerm.appendChild(makeTermColor("cursorColor", "Курсор"));
    secTerm.appendChild(makeTermColor("selColor", "Выделение"));
}

// Что-то не так с установкой: картинка активного набора не грузится или не пишется резерв
// на диск. Тогда технические секции «Системы» показываются сами.
function installProblem() {
    try {
        var idx = activeIndex(), Z = ["editor", "sidebar", "panel"];
        for (var i = 0; i < Z.length; i++) {
            var u = zoneUrl(idx, Z[i]); if (!u) continue;
            var st = probeImage(u);
            if (st && st.resolved && !st.ok && !st.none) return true;
        }
        if (typeof _disk === "object" && _disk.lastErr) return true;
    } catch (e) {}
    return false;
}

// Вкладка «Система»: язык, горячие клавиши, знакомство; технические секции — по нужде.
function buildTabSys(tSys) {
    tSys.appendChild(makeLangSelect());
    // Горячие клавиши целиком: выключены — не перехватываются и не упоминаются в интерфейсе.
    tSys.appendChild(makeToggle(hotkeysOn, function (v) {
        cfg.ui.keys = v; saveCfg(); try { updateLabel(); } catch (e) {} refreshPanel();
    }, "Горячие клавиши", INFO.hotkeys));

    var btns = el("div", "display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;");
    var tourB = makeIoBtn("Показать знакомство с панелью");
    tourB.addEventListener("click", function () { try { startTour(); } catch (e) {} });
    btns.appendChild(tourB);
    var problem = installProblem();
    if (!panelShowTech && !problem) {
        // Всё работает — диагностика, загрузчик и папка плагина не нужны. Кнопка раскрывает их.
        var techB = makeIoBtn("Проблемы с фоном? Проверить установку");
        techB.addEventListener("click", function () { panelShowTech = true; refreshPanel(); });
        btns.appendChild(techB);
    }
    tSys.appendChild(btns);

    if (panelShowTech || problem) {
        if (problem) tSys.appendChild(el("div", "margin-top:8px; padding:7px 10px; border-radius:10px; font-size:11.5px; color:#f38ba8; background:rgba(243,139,168,0.10); border:1px solid rgba(243,139,168,0.3);",
            t("Похоже, картинки набора не грузятся — проверь «Папку плагина» и диагностику ниже.")));
        var secDiag = collapsible(tSys, "Диагностика", "Проверка установки: что плагин видит о себе (версия, тема, набор, папка и загрузка картинок, найден ли стиль). Отчёт копируется в буфер для issue. Загляни сюда, если фон не появился.");
        secDiag.appendChild(makeDiagnosticsUI());
        var secLoader = collapsible(tSys, "Загрузчик", "Каким путём внедрён плагин (Moon Core, Custom UI Style или Custom CSS and JS) и готово ли окно к настоящей прозрачности. Кнопки кладут в буфер нужные строки для settings.json.");
        secLoader.appendChild(makeLoaderUI());
        var secBase = collapsible(tSys, "Папка плагина", "Откуда брать картинки наборов. Меняй, если перенёс плагин и фон пропал. Пусто — путь определяется автоматически.");
        secBase.appendChild(makeImgBaseField());
        secBase.appendChild(makeRemoteImagesToggle());
    }

    // Справка по горячим клавишам — только когда они включены (сами хоткеи — boot.js, onHotkey).
    if (hotkeysOn()) {
        var secKeys = collapsible(tSys, "Горячие клавиши", "Быстрые действия без открытия панели. Работают на любой раскладке (RU/EN).");
        [
            ["Ctrl+Alt+B", "Открыть / закрыть панель"],
            ["Ctrl+Alt+P", "Быстрый переключатель (наборы, эффекты, команды)"],
            ["Ctrl+Alt+.", "Следующий набор"],
            ["Ctrl+Alt+,", "Предыдущий набор"],
            ["Ctrl+Alt+0", "Фон и эффекты вкл / выкл"],
            ["Ctrl+Alt+R", "Режим чтения вкл / выкл"],
            ["Ctrl+Alt+Z", "Отменить изменение вида"],
            ["Ctrl+Alt+Y", "Повторить отменённое"]
        ].forEach(function (k) {
            var row = el("div", "display:flex; align-items:center; gap:8px; padding:2px 3px;");
            row.appendChild(el("kbd", "flex:0 0 92px; font-family:var(--vscode-editor-font-family,monospace); font-size:10px; text-align:center; padding:2px 4px; border-radius:6px; background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3); color:var(--mlbg-accent);", k[0]));
            row.appendChild(el("span", "flex:1 1 auto; font-size:11px; color:var(--mlp-muted);", t(k[1])));
            secKeys.appendChild(row);
        });
    }

    // Настройка меню: тело заполняет buildMenuManager, когда созданы все секции всех вкладок.
    var secMenuBody = collapsible(tSys, "Настройка меню", "Показать/скрыть секции и эффекты панели, чтобы меню не разрасталось. Сними галочку — пункт исчезнет из панели (настройки не теряются), «Показать всё» вернёт всё. Быстро скрыть прямо в панели — кнопка «Настроить» в шапке.");
    return secMenuBody;
}

// Подзаголовок внутри секции (для «Образов», где под одной крышей несколько блоков).
function subHead(text) {
    return el("div", "margin:10px 2px 4px; font-size:11px; font-weight:700; color:var(--mlp-head);", t(text));
}

// Копии настроек за последние дни (Moon Core пишет по одной в день): клик — вернуть.
function makeDailyCopiesUI() {
    var list = dailyList();
    if (!list.length) return null;
    var box = el("div", null);
    box.appendChild(subHead("Копии настроек по дням"));
    var row = el("div", "display:flex; flex-wrap:wrap; gap:5px;");
    list.forEach(function (x) {
        var b = el("div", null, x.day.slice(5).split("-").reverse().join(".")); b.className = "mlp-chip";
        b.title = t("Вернуть настройки на ") + x.day;
        b.addEventListener("click", function () {
            backupCfg();
            var keepUi = cfg.ui;
            cfg = mergeCfg(x.cfg); cfg.ui = keepUi;
            syncGenSets(); apply(); refreshPanel();
            toast(t("Настройки возвращены на ") + x.day + t(" — отменить: «Восстановить прежние настройки»"));
        });
        keyActivate(b, b.title);
        row.appendChild(b);
    });
    box.appendChild(row);
    return box;
}

// Вкладка «Данные»: образы вида, обмен и управление конфигом.
function buildTabData(tData) {
    var simple = panelSimple();
    // «Образы»: сохранённые виды, обмен кодом и синхронизация — одна секция вместо четырёх.
    var secLooks = collapsible(tData, "Образы", "Сохранённые образы вида: весь вид под именем, переключение одним кликом (наведи — примерка). Ниже — обмен коротким кодом и перенос на другие машины.");
    secLooks.appendChild(makePresetsUI());
    secLooks.appendChild(subHead("Поделиться кодом"));
    secLooks.appendChild(makeShareUI());
    if (!simple) {
        secLooks.appendChild(subHead("Между машинами"));
        secLooks.appendChild(makeSyncUI());

        var secStats = collapsible(tData, "Статистика", "Сводка текущей сессии: время, тронутые файлы, нажатия, суммарное время в потоке и лучший стрик непрерывной печати. Копится, пока включён тумблер «Статистика» (вкладка «Эффекты»). Данные живут только в этой сессии.");
        secStats.appendChild(makeStatsUI());

        var secTheme = collapsible(tData, "Экспорт темы", "Собрать настоящую VS Code-тему (color-theme.json) из палитры активного набора: цвета интерфейса + подсветка синтаксиса. Работает там, где custom-фон недоступен. Как применить — в пояснении: задержи курсор на кнопке.");
        secTheme.appendChild(makeThemeExportUI());
    }

    // экспорт / импорт
    var io = el("div", "display:flex; gap:8px; margin-top:12px;");
    var expB = makeIoBtn("Экспорт"); expB.addEventListener("click", function () { exportCfg(); });
    var impB = makeIoBtn("Импорт"); impB.addEventListener("click", function () { importCfg(); });
    io.appendChild(expB); io.appendChild(impB);
    tData.appendChild(io);
    if (!simple) tData.appendChild(makeHistoryUI()); // те же кнопки есть в шапке панели

    // Опасная зона: копии по дням, восстановление из резерва и полный сброс (со второго клика).
    var danger = el("div", null); danger.className = "mlp-danger";
    var drow = el("div", "display:flex; gap:8px; flex-wrap:wrap;");
    if (hasBackup()) {
        var restB = makeIoBtn("Восстановить прежние настройки");
        restB.addEventListener("click", function () { restoreBackup(); });
        drow.appendChild(restB);
    }
    var reset = makeIoBtn("Сбросить к дефолту"), armed = 0;
    reset.addEventListener("click", function () {
        if (!armed) {
            reset.textContent = t("Точно сбросить? Нажми ещё раз");
            armed = setTimeout(function () { armed = 0; try { reset.textContent = t("Сбросить к дефолту"); } catch (e) {} }, 3500);
            return;
        }
        clearTimeout(armed); armed = 0;
        var keepMode = cfg.mode, keepUi = cfg.ui; // сброс дизайна, но не положения/свёрнутости панели
        backupCfg();                              // прежние настройки -> резерв (сброс можно откатить)
        cfg = clone(DEFAULTS); cfg.mode = keepMode; cfg.ui = keepUi;
        syncGenSets(); // дефолт без ген-наборов -> обрезать хвост SETS; keepMode на ген-набор зажмётся на 0
        apply(); refreshPanel();
    });
    drow.appendChild(reset);
    danger.appendChild(drow);
    var daily = makeDailyCopiesUI(); if (daily) danger.appendChild(daily);
    tData.appendChild(danger);
}

// Какая функция наполняет какую вкладку (ключ — имя из TABS в panel.js).
var PANEL_TAB_BUILDERS = {
    "Набор": buildTabSets, "Авто-смена": buildTabAuto, "Вид": buildTabView, "Эффекты": buildTabFx,
    "Терминал": buildTabTerm, "Данные": buildTabData, "Система": buildTabSys
};
