// ===== Контролы вкладки «Вид» =====
// Яркость зон и читаемость кода, акцент и палитра картинки, фильтры изображения, стиль
// частиц, бюджет производительности и сводка сессии. Здесь же предпросмотр эффекта при
// наведении: тумблер показывает результат до клика.

// ===== Предпросмотр эффекта при наведении =====
// Наведение на строку ВЫКЛЮЧЕННОГО эффекта временно включает его (applyNoSave — без записи в
// localStorage и без шага истории), уход курсора / потеря фокуса — возвращает прежнее значение.
// Так десятки эффектов с непонятными названиями можно «примерить», не запоминая, что включил.
// Дебаунс, как у previewSet: пока курсор просто проезжает по сетке, ничего не мигает.
// previewFxCancel фиксирует выбор на клике (mouseleave после переключения не должен откатить
// уже сохранённое значение). Превью для уже включённого эффекта не делаем — примерять нечего.
var _fxPrevTimer = 0, _fxPrevKey = null, _fxPrevVal = null, _fxPrevDelay = 90;
function previewFx(key) {
    if (!cfg.enabled) return;                 // фон выключен — эффекты не видно, не дёргаем CSS
    if (_fxPrevKey === key) return;           // уже примеряем этот
    if (cfg.fx[key] && _fxPrevKey === null) return; // эффект и так включён — примерять нечего
    if (_fxPrevTimer) clearTimeout(_fxPrevTimer);
    _fxPrevTimer = setTimeout(function () {
        _fxPrevTimer = 0;
        if (_fxPrevKey !== null && _fxPrevKey !== key) cfg.fx[_fxPrevKey] = _fxPrevVal; // сменили строку — вернуть прошлую
        _fxPrevKey = key; _fxPrevVal = cfg.fx[key];
        cfg.fx[key] = true; applyNoSave();
    }, _fxPrevDelay);
}
function previewFxEnd() {
    if (_fxPrevTimer) { clearTimeout(_fxPrevTimer); _fxPrevTimer = 0; }
    if (_fxPrevKey === null) return;
    cfg.fx[_fxPrevKey] = _fxPrevVal; _fxPrevKey = null; _fxPrevVal = null;
    applyNoSave();
}
// Снять превью БЕЗ отката (пользователь кликнул тумблер — значение зафиксировано change-хендлером).
function previewFxCancel() {
    if (_fxPrevTimer) { clearTimeout(_fxPrevTimer); _fxPrevTimer = 0; }
    _fxPrevKey = null; _fxPrevVal = null;
}

// ==== Статистика сессии (fx.stats) — сводка в панели ====
// Показывает снимок statsState на момент открытия панели (переоткрой/переключи вкладку для
// обновления). Значения копятся, только пока включён тумблер «Статистика».
function makeStatsUI() {
    var box = el("div", null);
    function line(label, val) {
        var r = el("div", "display:flex; justify-content:space-between; padding:2px 3px; font-size:11px;");
        r.appendChild(el("span", "color:var(--mlp-muted,#a6adc8);", t(label)));
        r.appendChild(el("span", "color:var(--mlp-fg,#cdd6f4); font-variant-numeric:tabular-nums;", val));
        box.appendChild(r);
    }
    line("В сессии", fmtDur(Date.now() - statsState.start));
    line("Нажатий", String(statsState.keys));
    line("Файлов", String(statsState.fileCount));
    line("В потоке", fmtDur(statsState.flowMs));
    line("Лучший стрик", fmtDur(statsState.bestMs));
    var rb = el("div", "margin-top:8px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", t("Сбросить статистику"));
    rb.addEventListener("click", function () { try { statsReset(); } catch (e) {} apply(); refreshPanel(); });
    keyActivate(rb, t("Сбросить статистику"));
    box.appendChild(rb);
    return box;
}

function makeOpSlider(key, label) {
    return makeSlider({
        label: label, min: 0, max: 0.6, step: 0.01, dec: 2, labelW: 56, valW: 30, ellipsis: false,
        get: function () { return getOp()[key]; }, onInput: function (v) { setOpValue(key, v); }, info: INFO["op_" + key],
        def: DEFAULTS.baseOp[key]
    });
}
function makeAccentColor() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), t("Акцент")));
    var cur = getAccent();
    var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
    ip.type = "color"; ip.value = cur;
    // HEX редактируемый: можно вписать/вставить #rrggbb, а не только тыкать в палитру.
    var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
    hex.type = "text"; hex.value = cur; hex.maxLength = 7; hex.setAttribute("aria-label", t("Акцент HEX"));
    // акцент правится для АКТИВНОГО набора (setAccentValue), у каждого набора свой
    ip.addEventListener("input", function () { setAccentValue(ip.value); hex.value = ip.value; applyThrottledLive(); });
    ip.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
    function commitAccentHex() {
        var v = hex.value.trim();
        if (isColor(v)) { setAccentValue(v); ip.value = v; hex.value = v; apply(); }
        else hex.value = ip.value; // невалидно -> вернуть текущий цвет
    }
    hex.addEventListener("change", commitAccentHex);
    hex.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commitAccentHex(); hex.blur(); } });
    wrap.appendChild(ip); wrap.appendChild(hex);
    // «из картинки»: берём доминирующий цвет фоновой картинки редактора набора как акцент.
    // У генеративного набора картинки нет (зона рисуется градиентом) — там кнопку не
    // показываем (иначе клик всегда упирался бы в «Не удалось взять цвет из картинки»).
    // Если в зону редактора подложена своя картинка (isGrad ложно), кнопка снова доступна.
    if (!isGrad(activeIndex(), "editor")) {
        var pick = el("div", "flex:0 0 auto; padding:3px 8px; border-radius:6px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", t("из картинки"));
        pick.title = t("Взять акцент из фоновой картинки набора");
        pick.addEventListener("click", function () {
            onImage(zoneUrl(activeIndex(), "editor"), function (st) {
                if (!st.ok || !st.accent) { toast(t("Не удалось взять цвет из картинки"), false); return; }
                // Доминирующий цвет тёмной картинки сам бывает тёмным — на подложке набора он
                // сольётся. Поднимаем светлоту до контраста 3:1 (порог WCAG для крупных
                // элементов), сохраняя оттенок и цветность.
                var acc = accentForContrast(st.accent, accentContrastRef(), 3);
                setAccentValue(acc); ip.value = acc; hex.value = acc;
                apply(); refreshPanel();
                toast(t("Акцент из картинки: ") + acc);
            });
        });
        keyActivate(pick, t("Акцент из картинки"));
        wrap.appendChild(pick);
    }
    var d = infoDot(INFO.accent); if (d) wrap.appendChild(d);
    return wrap;
}
// ==== Дальтоник-безопасные акценты + проверка контраста ====
// Быстрый выбор акцента из палитры Окабэ-Ито (различимой при основных типах дальтонизма) и
// строка контраста акцента к тёмной подложке набора (WCAG): помогает не выбрать акцент,
// который сольётся с фоном или будет плохо различим. Клик по образцу красит активный набор.
var CB_SAFE = ["#e69f00", "#56b4e9", "#009e73", "#f0e442", "#0072b2", "#d55e00", "#cc79a7"];
function makeAccentSafeUI() {
    var box = el("div", null);
    var head = el("div", ST.row);
    head.appendChild(el("span", mutedLabel(92, true), t("Безопасные акценты")));
    var d = infoDot(INFO.accent_safe); if (d) head.appendChild(d);
    box.appendChild(head);
    var row = el("div", "display:flex; flex-wrap:wrap; gap:5px; padding:2px 3px 4px;");
    CB_SAFE.forEach(function (hex) {
        var sw = el("div", "width:20px; height:20px; border-radius:5px; cursor:pointer; background:" + hex + "; border:1px solid rgba(205,214,244,0.25);");
        sw.title = hex;
        sw.addEventListener("click", function () { setAccentValue(hex); apply(); refreshPanel(); });
        keyActivate(sw, t("Акцент") + " " + hex);
        row.appendChild(sw);
    });
    box.appendChild(row);
    // строка контраста: акцент против тёмной подложки набора
    var cr = 1; try { cr = contrastRatio(getAccent(), accentContrastRef()); } catch (e) {}
    var lvl = cr >= 7 ? "AAA" : cr >= 4.5 ? "AA" : cr >= 3 ? t("AA (крупный)") : t("низкий");
    var warn = cr < 3;
    box.appendChild(el("div", "padding:2px 3px; font-size:11px; color:" + (warn ? "#f38ba8" : "var(--mlp-muted,#a6adc8)") + ";",
        t("Контраст к фону: ") + cr.toFixed(1) + " (" + lvl + ")"));
    return box;
}

// Чекбокс «Авто-яркость editor» (cfg.autoDim). Отдельно, т.к. не входит в FX_LIST.
function makeAutoDim() {
    return makeToggle(function () { return cfg.autoDim; }, function (v) { cfg.autoDim = v; apply(); }, "Авто-яркость editor", INFO.autoDim);
}
// Фильтры картинки с выбором зоны: один селектор + 3 слайдера, которые
// перенастраиваются на выбранную зону (cfg.imgfx.editor / .side / .panel).
function makeImgFilters() {
    var box = el("div", null);
    var cur = "editor";
    var ZONES = [["editor", "Редактор"], ["side", "Сайдбар"], ["panel", "Панель/терминал"]];
    var DEFS = [
        ["brightness", "Яркость", 0.3, 1.5, 0.05, 2, INFO.img_brightness],
        ["saturate", "Насыщенность", 0, 2, 0.05, 2, INFO.img_saturate],
        ["blur", "Размытие", 0, 12, 0.5, 1, INFO.img_blur]
    ];

    // селектор зоны
    var selWrap = el("div", ST.row);
    selWrap.appendChild(el("span", mutedLabel(92), t("Зона")));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    ZONES.forEach(function (z) { var o = el("option", null, t(z[1])); o.value = z[0]; sel.appendChild(o); });
    selWrap.appendChild(sel);
    var zd = infoDot(INFO.img_zone); if (zd) selWrap.appendChild(zd);
    box.appendChild(selWrap);

    // вписывание фоновой картинки выбранной зоны: cover (заполнить) | contain (целиком)
    var fitWrap = el("div", ST.row);
    fitWrap.appendChild(el("span", mutedLabel(92), t("Вписывание")));
    var fitSel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    [["cover", "Заполнить (cover)"], ["contain", "Целиком (contain)"]].forEach(function (o) { var op = el("option", null, t(o[1])); op.value = o[0]; fitSel.appendChild(op); });
    fitSel.addEventListener("change", function () { if (!cfg.fit) cfg.fit = {}; cfg.fit[cur] = fitSel.value; apply(); });
    fitWrap.appendChild(fitSel);
    var fd = infoDot(INFO.img_fit); if (fd) fitWrap.appendChild(fd);
    box.appendChild(fitWrap);
    function refreshFit() { fitSel.value = (cfg.fit && cfg.fit[cur] === "contain") ? "contain" : "cover"; }

    // Свой путь картинки для выбранной зоны активного набора (cfg.setImg[idx][zone]).
    // Ключи зон здесь — cfg.imgfx ("side"), у SETS/setImg — "sidebar"; маппим через IMGZONE.
    var IMGZONE = { editor: "editor", side: "sidebar", panel: "panel" };
    var pathWrap = el("div", ST.row);
    pathWrap.appendChild(el("span", mutedLabel(92), t("Путь картинки")));
    var pathIp = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
    pathIp.type = "text"; pathIp.maxLength = 1024;
    function commitPath() {
        var z = IMGZONE[cur], i = activeIndex(), v = pathIp.value.trim().slice(0, 1024);
        if (!cfg.setImg) cfg.setImg = {};
        if (!cfg.setImg[i]) cfg.setImg[i] = {};
        if (v) cfg.setImg[i][z] = v; else delete cfg.setImg[i][z]; // пусто -> вернуть картинку набора
        apply();
    }
    pathIp.addEventListener("change", commitPath);
    pathIp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commitPath(); pathIp.blur(); } });
    pathWrap.appendChild(pathIp);
    var pd = infoDot(INFO.img_path); if (pd) pathWrap.appendChild(pd);
    box.appendChild(pathWrap);
    function refreshPath() {
        var z = IMGZONE[cur], i = activeIndex(), o = cfg.setImg && cfg.setImg[i];
        pathIp.value = (o && o[z]) ? o[z] : "";
        pathIp.placeholder = setImage(i, z); // дефолтная картинка набора как подсказка
    }

    // слайдеры, читающие/пишущие cfg.imgfx[cur]; cur меняется селектором зоны, поэтому
    // get/onInput всегда смотрят на текущую зону, а refresh() дёргает _refresh при смене.
    var rows = DEFS.map(function (d) {
        var key = d[0];
        var w = makeSlider({
            label: d[1], min: d[2], max: d[3], step: d[4], dec: d[5],
            get: function () { return cfg.imgfx[cur][key]; }, onInput: function (v) { cfg.imgfx[cur][key] = v; }, info: d[6],
            // дефолт зонозависимый: сбрасываем к DEFAULTS для ТЕКУЩЕЙ выбранной зоны (cur)
            def: function () { return DEFAULTS.imgfx[cur][key]; }
        });
        box.appendChild(w);
        return w._refresh;
    });

    function refresh() { refreshFit(); refreshPath(); rows.forEach(function (fn) { fn(); }); }
    sel.addEventListener("change", function () { cur = sel.value; refresh(); });
    refresh();
    return box;
}
// ===== Метр читаемости =====
// Главный вопрос любого фона за кодом — «а читать-то можно?». Раньше на него отвечали
// глазами и ползунком наугад. Здесь он отвечен числом: контраст цвета кода к РЕАЛЬНОЙ
// подложке под ним (смесь темы и картинки в пропорции прозрачности), причём и в среднем,
// и на самом светлом участке кадра — именно там код обычно и теряется. Кнопка «Исправить»
// подбирает прозрачность этого набора так, чтобы худший участок дал 4.5:1 (порог WCAG AA).
function makeReadabilityUI() {
    var box = el("div", "padding:3px 4px;");
    var row = el("div", ST.row);
    var lab = el("span", "flex:1 1 auto; font-size:11px; color:var(--mlp-muted,#a6adc8);");
    var btn = el("span", "flex:0 0 auto; padding:2px 8px; border-radius:6px; cursor:pointer; font-size:11px;" +
        " background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.35);", t("Исправить"));
    keyActivate(btn, t("Подобрать прозрачность фона ради читаемости кода"));
    function paint() {
        var r = null;
        try { r = readability(); } catch (e) {}
        if (r && r.off) { lab.textContent = t("Читаемость: фон выключен"); btn.hidden = true; return; }
        if (!r) { lab.textContent = t("Читаемость: нет данных (картинка ещё грузится)"); btn.hidden = true; return; }
        var good = r.worstRatio >= 4.5;
        lab.textContent = t("Читаемость кода") + ": " + r.ratio.toFixed(1) + ":1, " +
            t("худший участок") + " " + r.worstRatio.toFixed(1) + ":1" + (good ? "  " + t("— норма") : "");
        lab.style.color = good ? "var(--mlp-muted,#a6adc8)" : "#f38ba8";
        btn.hidden = good;
    }
    btn.addEventListener("click", function () {
        var v = null;
        try { v = fixReadability(4.5); } catch (e) {}
        if (v == null) { toast(t("Не удалось измерить читаемость")); return; }
        apply(); paint();
        toast(t("Прозрачность фона редактора для этого набора") + ": " + v.toFixed(2));
        try { refreshPanel(); } catch (e) {}
    });
    row.appendChild(lab); row.appendChild(btn);
    box.appendChild(row);
    box.appendChild(makeCheck("autoRead", "Адаптивный скрим"));
    paint();
    // Картинка могла ещё не догрузиться — обновим строку, когда метрики появятся.
    try {
        var url = zoneUrl(activeIndex(), "editor");
        if (url) onImage(url, function () { try { paint(); } catch (e) {} });
    } catch (e) {}
    return box;
}

// ==== Авто-бюджет производительности (cfg.perfGuard) ====
// Тумблер: при устойчиво низком FPS автоматически приглушать тяжёлые эффекты (см. perf.js /
// perfTick в widgets). Метка/подсказка переводятся централизованно в makeToggle.
function makePerfGuardToggle() {
    return makeToggle(function () { return cfg.perfGuard !== false; },
        function (v) { cfg.perfGuard = v; apply(); }, "Авто-бюджет FPS", INFO.perf_guard);
}
// ==== Живой индикатор производительности ====
// Показывает текущий FPS и активен ли эконом-режим (perf в widgets/extras.js). Раньше эффекты
// «сами приглушались» без объяснения — теперь это видно. Обновляется раз в секунду, пока строка
// в DOM (self-terminating: как только панель закрыта/пересобрана — интервал снимается).
function makePerfStatus() {
    var line = el("div", "padding:3px 3px 0; font-size:10.5px; color:var(--mlp-faint,#6c7086);", "");
    function paint() {
        var txt;
        if (cfg.perfGuard === false) txt = t("Авто-бюджет FPS выключен — эффекты не приглушаются");
        else if (typeof perfShouldRun === "function" && !perfShouldRun()) txt = t("FPS не измеряется (нет тяжёлых эффектов)");
        else {
            var fps = Math.round((typeof perf !== "undefined" && perf.fps) ? perf.fps : 60);
            var save = !!(typeof perf !== "undefined" && perf.save);
            txt = t("Производительность: ~") + fps + t(" FPS · эконом-режим: ") + (save ? t("вкл") : t("выкл"));
            line.style.color = save ? "#f9e2af" : "var(--mlp-faint,#6c7086)";
        }
        line.textContent = txt;
    }
    paint();
    try {
        var id = setInterval(function () {
            if (!line.isConnected) { clearInterval(id); return; }
            paint();
        }, 1000);
    } catch (e) {}
    return line;
}

// Выбор стиля летящих частиц (cfg.partStyle). Категориальный — селект из PART_STYLES.
// syncWidgets пересоздаёт частицы под новый стиль (см. ensureParticles).
function makePartStyleSelect() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), t("Стиль частиц")));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    var cur = safePartStyle(cfg.partStyle);
    PART_STYLES.forEach(function (o) {
        var op = el("option", null, t(o[1])); op.value = o[0]; if (o[0] === cur) op.selected = true; sel.appendChild(op);
    });
    sel.addEventListener("change", function () { cfg.partStyle = safePartStyle(sel.value); apply(); });
    wrap.appendChild(sel);
    var d = infoDot(INFO.part_style); if (d) wrap.appendChild(d);
    return wrap;
}
