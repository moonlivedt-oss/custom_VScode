// ===== Построители контролов панели =====
// Каждая функция make* возвращает готовый DOM-контрол (слайдер / чекбокс / селект / чип),
// привязанный к соответствующему полю cfg. Изменения применяются через apply / applyThrottled
// (мгновенно/троттлингом) или applyFade (со сменой набора). Тексты подсказок берутся из INFO.

// ===== Базовые фабрики контролов =====
// Тумблеры и слайдеры панели различались только источником cfg и колбэком, а разметка/
// стиль/hover/«?» повторялись в каждом. Свели к двум фабрикам: makeToggle и makeSlider.

// Строка-тумблер: hover-подсветка + чекбокс + подпись + «?».
// get() -> текущее булево; onChange(checked) -> применить изменение.
function makeToggle(get, onChange, label, info) {
    var row = el("label", ST.toggleRow);
    row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
    row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
    var cb = el("input", ST.checkbox); cb.type = "checkbox"; cb.checked = !!get();
    cb.addEventListener("change", function () { onChange(cb.checked); });
    row.appendChild(cb);
    row.appendChild(el("span", ST.fill, label));
    var d = infoDot(info); if (d) row.appendChild(d);
    return row;
}

// Слайдер: метка + ползунок + значение + «?». opts:
//   label, min, max, step, dec (знаков после запятой), get()->число, onInput(v)->записать,
//   info, labelW (ширина метки, 92), valW (ширина значения, 34), ellipsis (обрезать метку, true).
// Все слайдеры пишут значение и зовут applyThrottled (коалесинг в один apply за кадр).
// На возвращённом узле есть _refresh() — пересинхронизировать ползунок/значение с cfg
// (нужно, когда один набор слайдеров переключается между зонами, см. makeImgFilters).
function makeSlider(opts) {
    var labelW = opts.labelW || 92, valW = opts.valW || 34, ell = opts.ellipsis !== false;
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(labelW, ell), opts.label));
    var sl = el("input", ST.range);
    sl.type = "range"; sl.min = String(opts.min); sl.max = String(opts.max); sl.step = String(opts.step); sl.value = String(opts.get());
    var val = el("span", "flex:0 0 " + valW + "px; text-align:right; color:var(--mlp-muted,#a6adc8);", Number(opts.get()).toFixed(opts.dec));
    // input — «живое» применение без записи (коалесинг в кадр); change (отпускание ползунка)
    // — единственная запись в localStorage. Раньше saveCfg дёргался на каждый кадр перетаскивания.
    sl.addEventListener("input", function () { var v = parseFloat(sl.value); opts.onInput(v); val.textContent = v.toFixed(opts.dec); applyThrottledLive(); });
    sl.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
    wrap.appendChild(sl); wrap.appendChild(val);
    var d = infoDot(opts.info); if (d) wrap.appendChild(d);
    wrap._refresh = function () { sl.value = String(opts.get()); val.textContent = Number(opts.get()).toFixed(opts.dec); };
    return wrap;
}

// ===== Предпросмотр набора при наведении =====
// Наведение на чип «примеряет» его набор к фону и акценту, не сохраняя cfg. Работает
// через previewMode (см. state.js): activeIndex начинает возвращать превью-набор, поэтому
// сохранённый cfg.mode не трогается, а превью работает и в «случайно», и при «фоне по
// проекту». Смена мягкая (fadeSwap — фон проступает плавно, не прыгает).
//
// Наведение дебаунсим (_previewDelay): пока курсор просто проезжает по ряду чипов, превью
// не дёргается на каждом; оно включается, только если задержаться на чипе. previewCancel
// снимает и отложенное, и активное превью (нужно на клике и при закрытии панели, т.к.
// удалённый из DOM чип не всегда шлёт mouseleave — иначе превью «залипло» бы).
var _previewTimer = 0, _previewDelay = 70;
function previewSet(idx) {
    if (!cfg.enabled) return;                 // фон выключен — превью не видно, не дёргаем CSS
    if (previewMode === idx) return;          // уже показываем этот набор
    if (_previewTimer) clearTimeout(_previewTimer);
    _previewTimer = setTimeout(function () {
        _previewTimer = 0; previewMode = idx; fadeSwap();
    }, _previewDelay);
}
function previewEnd() {
    if (_previewTimer) { clearTimeout(_previewTimer); _previewTimer = 0; }
    if (previewMode === null) return;
    previewMode = null; fadeSwap();
}
// Снять превью без плавного возврата (курсор ушёл с чипа насовсем): используется на
// клике (фиксируем выбор — mouseleave после клика не должен ничего откатывать) и при
// закрытии панели. applyFade/refreshPanel далее сами перерисуют фон под выбранный набор.
function previewCancel() {
    if (_previewTimer) { clearTimeout(_previewTimer); _previewTimer = 0; }
    previewMode = null;
}

// health-check: помечаем чип, если картинка набора не грузится. Не грузим картинки сами —
// подписываемся на общую пробу (onImage), которую использует и генерация CSS: один Image на URL.
function probeSet(idx, chip) {
    ["editor", "sidebar", "panel"].forEach(function (zone) {
        onImage(zoneUrl(idx, zone), function (st) {
            if (st.ok) return;
            chip.style.border = "1px solid #f38ba8";
            chip.style.boxShadow = "inset 0 0 0 1px rgba(243,139,168,0.55)";
            chip.title = "Не грузится: " + setImage(idx, zone);
            var b = chip.querySelector(".mlbg-bad"); if (!b) { b = el("span", "position:absolute; top:1px; left:3px; color:#f38ba8; font-weight:700;", "!"); b.className = "mlbg-bad"; chip.appendChild(b); }
        });
    });
}

// чип набора с превью-миниатюрой (мини-триптих зон)
function makeChip(mode, label) {
    var active = cfg.mode === mode, isSet = mode !== "random";
    var css = isSet
        ? "position:relative; width:48px; height:32px; border-radius:7px; overflow:hidden; cursor:pointer;" +
          "background-position:center; background-size:cover;" +
          "border:2px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-soft,rgba(205,214,244,0.16))") + ";" +
          (active ? "box-shadow:0 0 0 2px rgba(var(--mlbg-accent-rgb),0.35);" : "")
        : "min-width:24px; padding:4px 10px; border-radius:7px; cursor:pointer; user-select:none; text-align:center;" +
          "font-weight:" + (active ? "600" : "400") + ";" +
          "border:1px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-soft,rgba(205,214,244,0.16))") + ";" +
          "background:" + (active ? "rgba(var(--mlbg-accent-rgb),0.28)" : "transparent") + "; color:" + (active ? "#f2e6ff" : "var(--mlp-fg,#cdd6f4)") + ";";
    var c = el("div", css, isSet ? null : label);
    if (isSet) {
        var idx = parseInt(mode, 10);
        var s = SETS[idx];
        // Мини-триптих: три вертикальные полоски с превью зон (редактор / сайдбар / панель),
        // чтобы собирать наборы на глаз. Полоски — фон chip как запасной вариант (editor).
        // Генеративный набор — рисуем полоски градиентом (нет картинок и 404-проверки).
        var grad = isGradSet(idx);
        var ZK = ["editor", "sidebar", "panel"];
        // Чип 48×32 не должен держать полноразмерный JPEG фоновым слоем (100–250 КБ × зоны ×
        // наборы = мегабайты, и всё заново при каждой пересборке панели). Кладём акцентный
        // плейсхолдер, а как только проба картинки готова — подставляем компактный data-URL
        // из probeImage.thumb (второй загрузки нет). Сетевая/битая картинка -> остаётся плейсхолдер.
        function paintZone(node, zone) {
            var url = zoneUrl(idx, zone);
            node.style.background = "rgba(var(--mlbg-accent-rgb),0.14)";
            node.style.backgroundPosition = "center"; node.style.backgroundSize = "cover";
            onImage(url, function (st) { if (st && st.thumb) node.style.backgroundImage = cssUrl(st.thumb); });
        }
        if (grad) c.style.background = gradFor(idx, "editor");
        else paintZone(c, "editor");
        for (var zi = 0; zi < 3; zi++) {
            var strip = el("div",
                "position:absolute; top:0; bottom:0; width:33.34%; left:" + (zi * 33.33) + "%;" +
                "background-position:center; background-size:cover;" +
                (zi ? "box-shadow:inset 1px 0 0 rgba(0,0,0,0.35);" : ""));
            if (grad) strip.style.background = gradFor(idx, ZK[zi]);
            else paintZone(strip, ZK[zi]);
            c.appendChild(strip);
        }
        var num = el("span", "position:absolute; right:3px; bottom:1px; z-index:2; font-size:11px; font-weight:700; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.95);", label);
        c.appendChild(num);
        var nm = setName(idx); if (nm) c.title = idx + " · " + nm + " (редактор · сайдбар · панель)";
        if (!grad) probeSet(idx, c);
        if (!active) {
            c.addEventListener("mouseenter", function () { c.style.borderColor = "rgba(var(--mlbg-accent-rgb),0.6)"; previewSet(idx); });
            c.addEventListener("mouseleave", function () { c.style.borderColor = "var(--mlp-border-soft,rgba(205,214,244,0.16))"; previewEnd(); });
        }
    } else if (!active) {
        c.addEventListener("mouseenter", function () { c.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
        c.addEventListener("mouseleave", function () { c.style.background = "transparent"; });
    }
    c.addEventListener("click", function () {
        previewCancel(); // фиксируем выбор: mouseleave после клика не откатит фон обратно
        if (mode === "random") sessionRandomIndex = pickRandom();
        cfg.mode = mode;
        // «Фон по проекту» включён и выбран конкретный набор — закрепляем его за текущей папкой,
        // чтобы этот проект и дальше открывался с этим набором.
        if (cfg.autoWorkspace && /^\d+$/.test(mode)) {
            var wn = workspaceName();
            if (wn && DANGEROUS_KEYS.indexOf(wn) < 0) { if (!cfg.workspaceSets) cfg.workspaceSets = {}; cfg.workspaceSets[wn] = mode; }
        }
        applyFade(); refreshPanel();
    });
    keyActivate(c, isSet ? ("Набор " + label + (setName(parseInt(mode, 10)) ? " — " + setName(parseInt(mode, 10)) : "")) : "Случайный набор");
    c.setAttribute("aria-pressed", active ? "true" : "false"); // какой набор выбран — для скринридера
    return c;
}

// Переименование АКТИВНОГО набора (cfg.setName[idx]). Имя уходит в textContent/title
// (кнопка BG, чипы, списки), поэтому CSS-инъекция не грозит — только ограничение длины.
function makeSetNameEdit() {
    var wrap = el("div", ST.row + " margin-top:6px;");
    wrap.appendChild(el("span", mutedLabel(56), "Имя"));
    var ip = el("input", fieldStyle(" padding:3px 6px;"));
    ip.type = "text"; ip.maxLength = 40;
    var idx = activeIndex();
    ip.value = setName(idx);
    ip.placeholder = "Набор " + idx;
    function commit() {
        var v = ip.value.trim().slice(0, 40);
        var i = activeIndex();
        if (!cfg.setName) cfg.setName = {};
        if (v) cfg.setName[i] = v; else delete cfg.setName[i]; // пусто -> вернуть родное имя
        apply();
        // Обновляем только зависимые подписи, панель не пересобираем — иначе поле
        // потеряет фокус на каждом Enter. Чипы обновятся при следующем открытии панели.
    }
    ip.addEventListener("change", commit);
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commit(); ip.blur(); } });
    wrap.appendChild(ip);
    var d = infoDot(INFO.set_name); if (d) wrap.appendChild(d);
    return wrap;
}

function makeOpSlider(key, label) {
    return makeSlider({
        label: label, min: 0, max: 0.6, step: 0.01, dec: 2, labelW: 56, valW: 30, ellipsis: false,
        get: function () { return getOp()[key]; }, onInput: function (v) { setOpValue(key, v); }, info: INFO["op_" + key]
    });
}
function makeParamSlider(def) {
    var key = def[0];
    return makeSlider({
        label: def[1], min: def[2], max: def[3], step: def[4], dec: def[5],
        get: function () { return cfg.fxp[key]; }, onInput: function (v) { cfg.fxp[key] = v; }, info: INFO["fxp_" + key]
    });
}
function makeCheck(key, label) {
    return makeToggle(function () { return cfg.fx[key]; }, function (v) {
        cfg.fx[key] = v; apply();
        // «Частицы»/«Помидор» управляют показом зависимых контролов (стиль/число частиц,
        // длительность помидора) — пересобираем панель, чтобы они появились/исчезли.
        // refreshPanel сохраняет вкладку/прокрутку/фокус (см. panel.js).
        if (key === "particles" || key === "pomodoro") { try { refreshPanel(); } catch (e) {} }
    }, label, INFO["fx_" + key]);
}

// ==== Контролы секции «Терминал» (работают с cfg.term) ====
function makeTermSelect() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(56), "Шрифт"));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    TERM_FONTS.forEach(function (f) {
        var o = el("option", null, f); o.value = f; if (f === cfg.term.font) o.selected = true; sel.appendChild(o);
    });
    sel.addEventListener("change", function () { cfg.term.font = sel.value; apply(); });
    wrap.appendChild(sel);
    var d = infoDot(INFO["term_font"]); if (d) wrap.appendChild(d);
    return wrap;
}
function makeTermCheck(key, label) {
    return makeToggle(function () { return cfg.term[key]; }, function (v) { cfg.term[key] = v; apply(); }, label, INFO["term_" + key]);
}
function makeTermSlider(key, label, min, max, step, dec) {
    return makeSlider({
        label: label, min: min, max: max, step: step, dec: dec, labelW: 56, ellipsis: false,
        get: function () { return cfg.term[key]; }, onInput: function (v) { cfg.term[key] = v; }, info: INFO["term_" + key]
    });
}
function makeTermColor(key, label) {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(56), label));
    var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
    ip.type = "color"; ip.value = cfg.term[key];
    var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
    hex.type = "text"; hex.value = cfg.term[key]; hex.maxLength = 7; hex.setAttribute("aria-label", label + " HEX");
    ip.addEventListener("input", function () { cfg.term[key] = ip.value; hex.value = ip.value; applyThrottledLive(); });
    ip.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
    function commitTermHex() {
        var v = hex.value.trim();
        if (isColor(v)) { cfg.term[key] = v; ip.value = v; hex.value = v; apply(); }
        else hex.value = ip.value; // невалидно -> вернуть текущий цвет
    }
    hex.addEventListener("change", commitTermHex);
    hex.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commitTermHex(); hex.blur(); } });
    wrap.appendChild(ip); wrap.appendChild(hex);
    var d = infoDot(INFO["term_" + key]); if (d) wrap.appendChild(d);
    return wrap;
}

// ==== Контролы для картинки / слайдшоу (работают с произвольным разделом cfg) ====
// Универсальный слайдер над obj[key] — используется для cfg.imgfx и cfg.slideshow.
function makeObjSlider(obj, key, label, min, max, step, dec, info) {
    return makeSlider({
        label: label, min: min, max: max, step: step, dec: dec,
        get: function () { return obj[key]; }, onInput: function (v) { obj[key] = v; }, info: info
    });
}
function makeAccentColor() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), "Акцент"));
    var cur = getAccent();
    var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
    ip.type = "color"; ip.value = cur;
    // HEX редактируемый: можно вписать/вставить #rrggbb, а не только тыкать в палитру.
    var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
    hex.type = "text"; hex.value = cur; hex.maxLength = 7; hex.setAttribute("aria-label", "Акцент HEX");
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
        var pick = el("div", "flex:0 0 auto; padding:3px 8px; border-radius:6px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", "из картинки");
        pick.title = "Взять акцент из фоновой картинки набора";
        pick.addEventListener("click", function () {
            onImage(zoneUrl(activeIndex(), "editor"), function (st) {
                if (st.ok && st.accent) {
                    setAccentValue(st.accent); ip.value = st.accent; hex.value = st.accent;
                    apply(); refreshPanel(); toast("Акцент из картинки: " + st.accent);
                } else { toast("Не удалось взять цвет из картинки", false); }
            });
        });
        keyActivate(pick, "Акцент из картинки");
        wrap.appendChild(pick);
    }
    var d = infoDot(INFO.accent); if (d) wrap.appendChild(d);
    return wrap;
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
    selWrap.appendChild(el("span", mutedLabel(92), "Зона"));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    ZONES.forEach(function (z) { var o = el("option", null, z[1]); o.value = z[0]; sel.appendChild(o); });
    selWrap.appendChild(sel);
    var zd = infoDot(INFO.img_zone); if (zd) selWrap.appendChild(zd);
    box.appendChild(selWrap);

    // вписывание фоновой картинки выбранной зоны: cover (заполнить) | contain (целиком)
    var fitWrap = el("div", ST.row);
    fitWrap.appendChild(el("span", mutedLabel(92), "Вписывание"));
    var fitSel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    [["cover", "Заполнить (cover)"], ["contain", "Целиком (contain)"]].forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; fitSel.appendChild(op); });
    fitSel.addEventListener("change", function () { if (!cfg.fit) cfg.fit = {}; cfg.fit[cur] = fitSel.value; apply(); });
    fitWrap.appendChild(fitSel);
    var fd = infoDot(INFO.img_fit); if (fd) fitWrap.appendChild(fd);
    box.appendChild(fitWrap);
    function refreshFit() { fitSel.value = (cfg.fit && cfg.fit[cur] === "contain") ? "contain" : "cover"; }

    // Свой путь картинки для выбранной зоны активного набора (cfg.setImg[idx][zone]).
    // Ключи зон здесь — cfg.imgfx ("side"), у SETS/setImg — "sidebar"; маппим через IMGZONE.
    var IMGZONE = { editor: "editor", side: "sidebar", panel: "panel" };
    var pathWrap = el("div", ST.row);
    pathWrap.appendChild(el("span", mutedLabel(92), "Путь картинки"));
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
            get: function () { return cfg.imgfx[cur][key]; }, onInput: function (v) { cfg.imgfx[cur][key] = v; }, info: d[6]
        });
        box.appendChild(w);
        return w._refresh;
    });

    function refresh() { refreshFit(); refreshPath(); rows.forEach(function (fn) { fn(); }); }
    sel.addEventListener("change", function () { cur = sel.value; refresh(); });
    refresh();
    return box;
}
function makeSlideToggle() {
    return makeToggle(function () { return cfg.slideshow.on; }, function (v) { cfg.slideshow.on = v; slideReset(); apply(); }, "Включить", INFO.slide_on);
}

// Поле «Папка плагина» (cfg.imgBase): база для относительных путей картинок набора.
// Позволяет перенести плагин без правки исходника и пересборки. Пусто -> авто-путь (IMG),
// показанный в placeholder. Значение уходит в url('...') через cssUrl (инъекция исключена).
function makeImgBaseField() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), "Папка"));
    var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
    ip.type = "text"; ip.maxLength = 512;
    ip.value = cfg.imgBase || "";
    ip.placeholder = IMG; // авто-определённый путь как подсказка
    function commit() {
        cfg.imgBase = safeBase(ip.value);
        ip.value = cfg.imgBase; // показать нормализованный вид (с завершающим слэшем)
        apply(); refreshPanel(); // плитки наборов перепроверят загрузку по новому пути
    }
    ip.addEventListener("change", commit);
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commit(); ip.blur(); } });
    wrap.appendChild(ip);
    var d = infoDot(INFO.img_base); if (d) wrap.appendChild(d);
    return wrap;
}
// Тумблер «Разрешить сетевые картинки» (cfg.allowRemoteImages). По умолчанию выкл —
// защита от того, что импортированный/чужой конфиг заставит редактор ходить в сеть.
function makeRemoteImagesToggle() {
    return makeToggle(function () { return !!cfg.allowRemoteImages; },
        function (v) { cfg.allowRemoteImages = v; apply(); refreshPanel(); }, "Разрешить сетевые картинки", INFO.allow_remote);
}

// ==== Фон по проекту (cfg.autoWorkspace / cfg.workspaceSets) ====
// Тумблер + имя текущего проекта + возможность «забыть» закрепление. Само закрепление
// набора за проектом происходит кликом по набору, когда режим включён (см. makeChip).
function makeWorkspaceUI() {
    var box = el("div", null);
    box.appendChild(makeToggle(function () { return !!cfg.autoWorkspace; },
        function (v) { cfg.autoWorkspace = v; apply(); refreshPanel(); }, "Включить", INFO.workspace_on));
    var name = workspaceName();
    box.appendChild(el("div", "padding:4px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
        name ? ("Проект: " + name) : "Проект не определён — открыта ли папка?"));
    var pinned = (name && cfg.workspaceSets) ? cfg.workspaceSets[name] : null;
    if (name && pinned != null) {
        box.appendChild(el("div", "padding:2px 3px 4px; color:var(--mlp-muted,#a6adc8); font-size:11px;",
            "Закреплён набор " + pinned + (setName(parseInt(pinned, 10)) ? " · " + setName(parseInt(pinned, 10)) : "")));
        var forget = el("div", "margin-top:2px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", "Забыть закрепление за проектом");
        forget.addEventListener("click", function () { if (cfg.workspaceSets) delete cfg.workspaceSets[name]; apply(); refreshPanel(); });
        keyActivate(forget, "Забыть закрепление набора за проектом");
        box.appendChild(forget);
    } else if (name && cfg.autoWorkspace) {
        box.appendChild(el("div", "padding:2px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
            "Выбери набор выше — он закрепится за этим проектом."));
    }
    return box;
}
// Тумблер полоски-индикатора git-ветки (cfg.ambientBranch). ensureBranchStrip — из boot.js
// (в общей области видимости после склейки), зовём для мгновенной реакции на переключение.
function makeAmbientBranchToggle() {
    return makeToggle(function () { return !!cfg.ambientBranch; },
        function (v) { cfg.ambientBranch = v; apply(); try { ensureBranchStrip(); } catch (e) {} }, "Полоска-индикатор ветки", INFO.ambient_branch);
}

// ==== Мастер-выключатель фона и эффектов (cfg.enabled) ====
// Заметный тумблер вверху панели: выкл — «ванильный» VS Code, настройки сохранены.
function makeMasterToggle() {
    var row = el("label",
        "display:flex; align-items:center; gap:8px; padding:8px 10px; margin:2px 2px 4px; border-radius:8px; cursor:pointer;" +
        "background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);");
    var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer; transform:scale(1.15);");
    cb.type = "checkbox"; cb.checked = cfg.enabled !== false;
    var txt = el("span", "flex:1 1 auto; font-weight:700; letter-spacing:0.2px;", cfg.enabled !== false ? "Фон и эффекты включены" : "Фон и эффекты выключены");
    cb.addEventListener("change", function () {
        cfg.enabled = cb.checked;
        txt.textContent = cb.checked ? "Фон и эффекты включены" : "Фон и эффекты выключены";
        apply();
    });
    row.appendChild(cb); row.appendChild(txt);
    var d = infoDot(INFO.enabled); if (d) row.appendChild(d);
    return row;
}

// ==== Авто-набор по времени суток (cfg.autoTime) ====
// Тумблер «включить» + два выпадающих списка: набор для дня и для ночи.
// Днём (8:00–20:00) активируется дневной набор, ночью — ночной (см. timeTick).
function makeAutoTimeToggle() {
    return makeToggle(
        function () { return !!(cfg.autoTime && cfg.autoTime.on); },
        function (v) {
            if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4, from: 8, to: 20 };
            cfg.autoTime.on = v; apply();
            if (v) { try { timeTick(); } catch (e) {} } // сразу применить нужный набор
        },
        "Включить", INFO.autotime_on
    );
}
// Выпадающий список наборов (для выбора дневного/ночного). which — "day" | "night".
function makeSetPicker(which, label) {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), label));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    for (var i = 0; i < SETS.length; i++) {
        var o = el("option", null, i + " · " + setName(i)); o.value = String(i);
        if (cfg.autoTime && cfg.autoTime[which] === i) o.selected = true;
        sel.appendChild(o);
    }
    sel.addEventListener("change", function () {
        if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4, from: 8, to: 20 };
        cfg.autoTime[which] = parseInt(sel.value, 10); apply();
        if (cfg.autoTime.on) { try { timeTick(); } catch (e) {} }
    });
    wrap.appendChild(sel);
    return wrap;
}

// Выбор стиля летящих частиц (cfg.partStyle). Категориальный — селект из PART_STYLES.
// syncWidgets пересоздаёт частицы под новый стиль (см. ensureParticles).
function makePartStyleSelect() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), "Стиль частиц"));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    var cur = safePartStyle(cfg.partStyle);
    PART_STYLES.forEach(function (o) {
        var op = el("option", null, o[1]); op.value = o[0]; if (o[0] === cur) op.selected = true; sel.appendChild(op);
    });
    sel.addEventListener("change", function () { cfg.partStyle = safePartStyle(sel.value); apply(); });
    wrap.appendChild(sel);
    var d = infoDot(INFO.part_style); if (d) wrap.appendChild(d);
    return wrap;
}

// ===== Сворачиваемая секция =====
function collapsible(parent, title, info) {
    var collapsed = !!(cfg.ui.collapsed && cfg.ui.collapsed[title]);
    var wrap = el("div", "margin-top:8px;");
    var head = el("div", "display:flex; align-items:center; gap:7px; padding:5px 7px; cursor:pointer; border-radius:7px; background:rgba(var(--mlbg-accent-rgb),0.08);");
    var chev = el("span", "flex:0 0 auto; width:10px; text-align:center; color:var(--mlbg-accent); font-size:9px; transition:transform 0.15s;", "▶");
    chev.style.transform = collapsed ? "rotate(0deg)" : "rotate(90deg)";
    head.appendChild(chev);
    head.appendChild(el("div", "flex:1 1 auto; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", title));
    var idot = infoDot(info); if (idot) head.appendChild(idot);
    var body = el("div", "padding:6px 3px 2px;");
    body.style.display = collapsed ? "none" : "block";
    head.addEventListener("mouseenter", function () { head.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
    head.addEventListener("mouseleave", function () { head.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; });
    head.addEventListener("click", function () {
        var show = body.style.display === "none";
        body.style.display = show ? "block" : "none";
        chev.style.transform = show ? "rotate(90deg)" : "rotate(0deg)";
        head.setAttribute("aria-expanded", show ? "true" : "false");
        if (!cfg.ui.collapsed) cfg.ui.collapsed = {};
        cfg.ui.collapsed[title] = !show; saveCfg();
    });
    keyActivate(head, title);
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    wrap.appendChild(head); wrap.appendChild(body);
    parent.appendChild(wrap);
    return body;
}
