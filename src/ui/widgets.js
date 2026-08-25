// ===== Базовый конструктор элемента =====
function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
}
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

// health-check: помечаем чип, если картинка набора не грузится
function probeSet(idx, chip) {
    var s = SETS[idx];
    [s.editor, s.sidebar, s.panel].forEach(function (fn) {
        var im = new Image();
        im.onerror = function () {
            chip.style.border = "1px solid #f38ba8";
            chip.style.boxShadow = "inset 0 0 0 1px rgba(243,139,168,0.55)";
            chip.title = "Не грузится: " + fn;
            var b = chip.querySelector(".mlbg-bad"); if (!b) { b = el("span", "position:absolute; top:1px; left:3px; color:#f38ba8; font-weight:700;", "!"); b.className = "mlbg-bad"; chip.appendChild(b); }
        };
        im.src = IMG + fn;
    });
}

// чип набора с превью-миниатюрой
function makeChip(mode, label) {
    var active = cfg.mode === mode, isSet = mode !== "random";
    var css = isSet
        ? "position:relative; width:48px; height:32px; border-radius:7px; overflow:hidden; cursor:pointer;" +
          "background-position:center; background-size:cover;" +
          "border:2px solid " + (active ? "var(--mlbg-accent)" : "rgba(205,214,244,0.16)") + ";" +
          (active ? "box-shadow:0 0 0 2px rgba(var(--mlbg-accent-rgb),0.35);" : "")
        : "min-width:24px; padding:4px 10px; border-radius:7px; cursor:pointer; user-select:none; text-align:center;" +
          "font-weight:" + (active ? "600" : "400") + ";" +
          "border:1px solid " + (active ? "var(--mlbg-accent)" : "rgba(205,214,244,0.16)") + ";" +
          "background:" + (active ? "rgba(var(--mlbg-accent-rgb),0.28)" : "transparent") + "; color:" + (active ? "#f2e6ff" : "#cdd6f4") + ";";
    var c = el("div", css, isSet ? null : label);
    if (isSet) {
        var idx = parseInt(mode, 10);
        c.style.backgroundImage = cssUrl(IMG + SETS[idx].editor);
        var num = el("span", "position:absolute; right:3px; bottom:1px; font-size:11px; font-weight:700; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.9);", label);
        c.appendChild(num);
        var nm = setName(idx); if (nm) c.title = idx + " · " + nm;
        probeSet(idx, c);
        if (!active) {
            c.addEventListener("mouseenter", function () { c.style.borderColor = "rgba(var(--mlbg-accent-rgb),0.6)"; });
            c.addEventListener("mouseleave", function () { c.style.borderColor = "rgba(205,214,244,0.16)"; });
        }
    } else if (!active) {
        c.addEventListener("mouseenter", function () { c.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
        c.addEventListener("mouseleave", function () { c.style.background = "transparent"; });
    }
    c.addEventListener("click", function () {
        if (mode === "random") sessionRandomIndex = pickRandom();
        cfg.mode = mode; applyFade(); refreshPanel();
    });
    keyActivate(c, isSet ? ("Набор " + label + (setName(parseInt(mode, 10)) ? " — " + setName(parseInt(mode, 10)) : "")) : "Случайный набор");
    return c;
}

function makeOpSlider(key, label) {
    var op = getOp();
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", label));
    var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
    sl.type = "range"; sl.min = "0"; sl.max = "0.6"; sl.step = "0.01"; sl.value = String(op[key]);
    var val = el("span", "flex:0 0 30px; text-align:right; color:#a6adc8;", op[key].toFixed(2));
    sl.addEventListener("input", function () { var v = parseFloat(sl.value); setOpValue(key, v); val.textContent = v.toFixed(2); applyThrottled(); });
    wrap.appendChild(sl); wrap.appendChild(val);
    var d = infoDot(INFO["op_" + key]); if (d) wrap.appendChild(d);
    return wrap;
}
function makeParamSlider(def) {
    var key = def[0], min = def[2], max = def[3], step = def[4], dec = def[5];
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", def[1]));
    var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
    sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step); sl.value = String(cfg.fxp[key]);
    var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;", cfg.fxp[key].toFixed(dec));
    sl.addEventListener("input", function () { var v = parseFloat(sl.value); cfg.fxp[key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
    wrap.appendChild(sl); wrap.appendChild(val);
    var d = infoDot(INFO["fxp_" + key]); if (d) wrap.appendChild(d);
    return wrap;
}
function makeCheck(key, label) {
    var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
    row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
    row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
    var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
    cb.type = "checkbox"; cb.checked = !!cfg.fx[key];
    cb.addEventListener("change", function () { cfg.fx[key] = cb.checked; apply(); });
    row.appendChild(cb);
    row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", label));
    var d = infoDot(INFO["fx_" + key]); if (d) row.appendChild(d);
    return row;
}

// ==== Контролы секции «Терминал» (работают с cfg.term) ====
function makeTermSelect() {
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", "Шрифт"));
    var sel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
    TERM_FONTS.forEach(function (f) {
        var o = el("option", null, f); o.value = f; if (f === cfg.term.font) o.selected = true; sel.appendChild(o);
    });
    sel.addEventListener("change", function () { cfg.term.font = sel.value; apply(); });
    wrap.appendChild(sel);
    var d = infoDot(INFO["term_font"]); if (d) wrap.appendChild(d);
    return wrap;
}
function makeTermCheck(key, label) {
    var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
    row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
    row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
    var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
    cb.type = "checkbox"; cb.checked = !!cfg.term[key];
    cb.addEventListener("change", function () { cfg.term[key] = cb.checked; apply(); });
    row.appendChild(cb);
    row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", label));
    var d = infoDot(INFO["term_" + key]); if (d) row.appendChild(d);
    return row;
}
function makeTermSlider(key, label, min, max, step, dec) {
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", label));
    var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
    sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step); sl.value = String(cfg.term[key]);
    var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;", Number(cfg.term[key]).toFixed(dec));
    sl.addEventListener("input", function () { var v = parseFloat(sl.value); cfg.term[key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
    wrap.appendChild(sl); wrap.appendChild(val);
    var d = infoDot(INFO["term_" + key]); if (d) wrap.appendChild(d);
    return wrap;
}
function makeTermColor(key, label) {
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", label));
    var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid rgba(205,214,244,0.2); border-radius:6px; background:transparent; cursor:pointer;");
    ip.type = "color"; ip.value = cfg.term[key];
    var hex = el("span", "flex:1 1 auto; color:#6c7086; font-size:11px;", cfg.term[key]);
    ip.addEventListener("input", function () { cfg.term[key] = ip.value; hex.textContent = ip.value; applyThrottled(); });
    wrap.appendChild(ip); wrap.appendChild(hex);
    var d = infoDot(INFO["term_" + key]); if (d) wrap.appendChild(d);
    return wrap;
}

// ==== Контролы для картинки / слайдшоу (работают с произвольным разделом cfg) ====
// Универсальный слайдер над obj[key] — используется для cfg.imgfx и cfg.slideshow.
function makeObjSlider(obj, key, label, min, max, step, dec, info) {
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", label));
    var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
    sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step); sl.value = String(obj[key]);
    var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;", Number(obj[key]).toFixed(dec));
    sl.addEventListener("input", function () { var v = parseFloat(sl.value); obj[key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
    wrap.appendChild(sl); wrap.appendChild(val);
    var d = infoDot(info); if (d) wrap.appendChild(d);
    return wrap;
}
function makeAccentColor() {
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", "Акцент"));
    var cur = getAccent();
    var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid rgba(205,214,244,0.2); border-radius:6px; background:transparent; cursor:pointer;");
    ip.type = "color"; ip.value = cur;
    var hex = el("span", "flex:1 1 auto; color:#6c7086; font-size:11px;", cur);
    // акцент правится для АКТИВНОГО набора (setAccentValue), у каждого набора свой
    ip.addEventListener("input", function () { setAccentValue(ip.value); hex.textContent = ip.value; applyThrottled(); });
    wrap.appendChild(ip); wrap.appendChild(hex);
    var d = infoDot(INFO.accent); if (d) wrap.appendChild(d);
    return wrap;
}
// Чекбокс «Авто-яркость editor» (cfg.autoDim). Отдельно, т.к. не входит в FX_LIST.
function makeAutoDim() {
    var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
    row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
    row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
    var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
    cb.type = "checkbox"; cb.checked = !!cfg.autoDim;
    cb.addEventListener("change", function () { cfg.autoDim = cb.checked; apply(); });
    row.appendChild(cb);
    row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", "Авто-яркость editor"));
    var d = infoDot(INFO.autoDim); if (d) row.appendChild(d);
    return row;
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
    var selWrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    selWrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", "Зона"));
    var sel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
    ZONES.forEach(function (z) { var o = el("option", null, z[1]); o.value = z[0]; sel.appendChild(o); });
    selWrap.appendChild(sel);
    var zd = infoDot(INFO.img_zone); if (zd) selWrap.appendChild(zd);
    box.appendChild(selWrap);

    // вписывание фоновой картинки выбранной зоны: cover (заполнить) | contain (целиком)
    var fitWrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    fitWrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", "Вписывание"));
    var fitSel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
    [["cover", "Заполнить (cover)"], ["contain", "Целиком (contain)"]].forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; fitSel.appendChild(op); });
    fitSel.addEventListener("change", function () { if (!cfg.fit) cfg.fit = {}; cfg.fit[cur] = fitSel.value; apply(); });
    fitWrap.appendChild(fitSel);
    var fd = infoDot(INFO.img_fit); if (fd) fitWrap.appendChild(fd);
    box.appendChild(fitWrap);
    function refreshFit() { fitSel.value = (cfg.fit && cfg.fit[cur] === "contain") ? "contain" : "cover"; }

    // слайдеры, читающие/пишущие cfg.imgfx[cur]
    var rows = DEFS.map(function (d) {
        var key = d[0], min = d[2], max = d[3], step = d[4], dec = d[5];
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", d[1]));
        var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
        sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step);
        var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;");
        sl.addEventListener("input", function () { var v = parseFloat(sl.value); cfg.imgfx[cur][key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
        wrap.appendChild(sl); wrap.appendChild(val);
        var dot = infoDot(d[6]); if (dot) wrap.appendChild(dot);
        box.appendChild(wrap);
        return function () { var o = cfg.imgfx[cur]; sl.value = String(o[key]); val.textContent = Number(o[key]).toFixed(dec); };
    });

    function refresh() { refreshFit(); rows.forEach(function (fn) { fn(); }); }
    sel.addEventListener("change", function () { cur = sel.value; refresh(); });
    refresh();
    return box;
}
function makeSlideToggle() {
    var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
    row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
    row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
    var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
    cb.type = "checkbox"; cb.checked = !!cfg.slideshow.on;
    cb.addEventListener("change", function () { cfg.slideshow.on = cb.checked; slideReset(); apply(); });
    row.appendChild(cb);
    row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", "Включить"));
    var d = infoDot(INFO.slide_on); if (d) row.appendChild(d);
    return row;
}

// ==== Авто-набор по времени суток (cfg.autoTime) ====
// Тумблер «включить» + два выпадающих списка: набор для дня и для ночи.
// Днём (8:00–20:00) активируется дневной набор, ночью — ночной (см. timeTick).
function makeAutoTimeToggle() {
    var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
    row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
    row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
    var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
    cb.type = "checkbox"; cb.checked = !!(cfg.autoTime && cfg.autoTime.on);
    cb.addEventListener("change", function () {
        if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4 };
        cfg.autoTime.on = cb.checked; apply();
        if (cb.checked) { try { timeTick(); } catch (e) {} } // сразу применить нужный набор
    });
    row.appendChild(cb);
    row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", "Включить"));
    var d = infoDot(INFO.autotime_on); if (d) row.appendChild(d);
    return row;
}
// Выпадающий список наборов (для выбора дневного/ночного). which — "day" | "night".
function makeSetPicker(which, label) {
    var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
    wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", label));
    var sel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
    for (var i = 0; i < SETS.length; i++) {
        var o = el("option", null, i + " · " + setName(i)); o.value = String(i);
        if (cfg.autoTime && cfg.autoTime[which] === i) o.selected = true;
        sel.appendChild(o);
    }
    sel.addEventListener("change", function () {
        if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4 };
        cfg.autoTime[which] = parseInt(sel.value, 10); apply();
        if (cfg.autoTime.on) { try { timeTick(); } catch (e) {} }
    });
    wrap.appendChild(sel);
    return wrap;
}

// ===== Тексты подсказок («?») =====
var INFO = {
    accent: "Акцентный цвет интерфейса (курсор, скроллбар, вкладки, рамки…). Свой для каждого набора: правка применяется к активному набору, у остальных — их цвета.",
    autoDim: "Автоматически занижает яркость фоновой картинки редактора, если она светлая, чтобы код оставался читаемым. Не меняет саму настройку яркости.",
    img_fit: "Как вписывать фоновую картинку в зону: «Заполнить» (cover) — обрезая по краям; «Целиком» (contain) — вся картинка, могут быть поля. Для портретных/«тушь на белом» удобнее contain.",
    img_zone: "Для какой зоны настраиваются фильтры ниже. У каждой зоны свои значения. «Панель/терминал» — фон нижней панели за терминалом.",
    img_brightness: "Яркость самой фоновой картинки (не интерфейса).",
    img_saturate: "Насыщенность цветов фоновой картинки (0 — ч/б, 2 — сочно).",
    img_blur: "Размытие самой фоновой картинки, px.",
    slide_on: "Автоматически менять набор по кругу через заданный интервал.",
    slide_min: "Через сколько минут переключать набор в режиме слайдшоу.",
    autotime_on: "Автоматически переключать набор по времени суток: днём (8:00–20:00) — дневной набор, ночью — ночной. Не работает в режиме «случайно»; при включении отменяет слайдшоу.",
    op_editor: "Насколько ярко проступает фоновая картинка за кодом редактора.",
    op_side: "Прозрачность фоновой картинки сайдбара (проводник и пр.).",
    op_panel: "Прозрачность фоновой картинки нижней панели (терминал/проблемы/вывод).",
    fxp_blur: "Сила размытия «матового стекла» (вкладки, панели, статусбар).",
    fxp_kbScale: "Максимальный масштаб анимации Ken Burns (медленный зум фона).",
    fxp_kbSpeed: "Длительность одного цикла Ken Burns, секунды.",
    fxp_vignette: "Сила затемнения по краям редактора (виньетка).",
    fxp_partCount: "Сколько летящих частиц рисовать (если эффект «Частицы» включён).",
    fxp_pomoMin: "Длительность одного помидора (таймера), минуты.",
    fx_kenburns: "Медленный плавный зум фоновой картинки редактора.",
    fx_glassTabs: "Полупрозрачный матовый фон полосы вкладок.",
    fx_vignette: "Затемнение по краям области редактора.",
    fx_glassSide: "Матовое стекло для сайдбара и панели.",
    fx_scrim: "Лёгкая тень под текстом кода для читаемости поверх фона.",
    fx_glassStatus: "Матовое стекло для нижнего статусбара.",
    fx_activeLine: "Подсветка текущей строки акцентным цветом.",
    fx_groupRing: "Внутренний контур активной группы редакторов.",
    fx_groupBorder: "Анимированная «живая» рамка активной группы.",
    fx_scrollbar: "Акцентный цвет ползунка скроллбара.",
    fx_activityBg: "Фоновая картинка за вертикальным актив-баром.",
    fx_tabAccent: "Акцентная полоска под активной вкладкой.",
    fx_rounded: "Скруглённые углы у меню, подсказок и тостов.",
    fx_cursorGlow: "Свечение вокруг курсора в редакторе.",
    fx_selection: "Градиентная заливка выделенного текста.",
    fx_titlebar: "Градиентная подсветка заголовка окна.",
    fx_splash: "Картинка-заставка в пустой группе редактора.",
    fx_clock: "Часы с датой в статусбаре.",
    fx_particles: "Летящие частицы поверх интерфейса.",
    fx_pomodoro: "Таймер-помидор в статусбаре (клик — старт/пауза, Alt+клик — сброс).",
    term_font: "Шрифт терминала. В списке — совместимые по ширине Nerd-шрифты, чтобы не разъезжались колонки и сохранялись иконки oh-my-posh.",
    term_ligatures: "Слитное начертание пар символов (->, =>, != и т.п.).",
    term_cursorGlow: "Ореол-свечение вокруг курсора терминала.",
    term_glow: "Сила тени под текстом терминала для читаемости поверх фоновой картинки.",
    term_weight: "Толщина шрифта терминала. Жирный текст остаётся заметно жирнее базового.",
    term_cursorColor: "Цвет курсора терминала.",
    term_selColor: "Цвет выделения текста в терминале.",
    term_cursorSize: "Ширина курсора терминала: 0 — скрыть курсор, 1 — обычная, больше — шире. Заметнее всего на курсоре-линии (cursorStyle: line).",
    term_cursorHeight: "Высота курсора терминала: 1 — обычная, меньше — короче, больше — выше ячейки."
};

// ===== Всплывающая подсказка «?» =====
var _infoPop = null, _infoAnchor = null;
function hideInfo() {
    if (_infoPop) { _infoPop.remove(); _infoPop = null; _infoAnchor = null; document.removeEventListener("mousedown", _infoOutside, true); }
}
function _infoOutside(e) { if (_infoPop && e.target !== _infoAnchor && !_infoPop.contains(e.target)) hideInfo(); }
function showInfo(anchor, text) {
    if (_infoAnchor === anchor) { hideInfo(); return; } // повторный клик — закрыть
    hideInfo();
    var pop = el("div",
        "position:fixed; z-index:100003; max-width:250px; padding:8px 11px; border-radius:9px;" +
        "background:rgba(17,17,27,0.99); color:#cdd6f4; font-size:11px; line-height:1.45;" +
        "border:1px solid rgba(var(--mlbg-accent-rgb),0.45); box-shadow:0 10px 30px rgba(0,0,0,0.6);", text);
    document.body.appendChild(pop);
    var r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    var left = Math.min(r.left, window.innerWidth - pr.width - 8);
    var top = r.bottom + 6;
    if (top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 6;
    pop.style.left = Math.max(8, left) + "px";
    pop.style.top = Math.max(8, top) + "px";
    _infoPop = pop; _infoAnchor = anchor;
    setTimeout(function () { document.addEventListener("mousedown", _infoOutside, true); }, 0);
}
function infoDot(text) {
    if (!text) return null;
    var d = el("span",
        "flex:0 0 auto; width:15px; height:15px; line-height:15px; text-align:center; border-radius:50%;" +
        "font-size:10px; font-weight:700; cursor:help; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16);" +
        "border:1px solid rgba(var(--mlbg-accent-rgb),0.4); user-select:none;", "?");
    d.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); showInfo(d, text); });
    keyActivate(d, "Пояснение");
    return d;
}

// ===== Сворачиваемая секция =====
function collapsible(parent, title, info) {
    var collapsed = !!(cfg.ui.collapsed && cfg.ui.collapsed[title]);
    var wrap = el("div", "margin-top:8px;");
    var head = el("div", "display:flex; align-items:center; gap:7px; padding:5px 7px; cursor:pointer; border-radius:7px; background:rgba(var(--mlbg-accent-rgb),0.08);");
    var chev = el("span", "flex:0 0 auto; width:10px; text-align:center; color:var(--mlbg-accent); font-size:9px; transition:transform 0.15s;", "▶");
    chev.style.transform = collapsed ? "rotate(0deg)" : "rotate(90deg)";
    head.appendChild(chev);
    head.appendChild(el("div", "flex:1 1 auto; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.7px; color:#bac2de;", title));
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

// ===== Экспорт / импорт настроек =====
function toast(msg, ok) {
    var t = el("div",
        "position:fixed; bottom:44px; right:16px; z-index:100004; padding:9px 13px; border-radius:9px;" +
        "font-weight:600; font-family:var(--vscode-font-family,sans-serif); box-shadow:0 8px 24px rgba(0,0,0,0.5);", msg);
    t.style.background = ok === false ? "rgba(243,139,168,0.96)" : "rgba(166,227,161,0.96)";
    t.style.color = "#181825";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
}
function copyText(s) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s); return true; } } catch (e) {}
    try {
        var ta = document.createElement("textarea"); ta.value = s; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e) { return false; }
}
function exportCfg() {
    var json = JSON.stringify(cfg, null, 2);
    var saved = false;
    try {
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a"); a.href = url; a.download = "moonlight-bg-config.json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        saved = true;
    } catch (e) {}
    var copied = copyText(json);
    toast(saved && copied ? "Экспорт: файл сохранён + в буфере обмена"
        : saved ? "Экспорт: файл сохранён" : copied ? "Экспорт: скопировано в буфер" : "Не удалось выгрузить", (saved || copied));
}
function importCfg() {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json"; inp.style.display = "none";
    inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0]; if (!f) { inp.remove(); return; }
        // Конфиг весит килобайты — отсекаем заведомо чужие/огромные файлы до чтения в память.
        if (f.size > 256 * 1024) { toast("Файл слишком большой (>256 КБ)", false); inp.remove(); return; }
        var rd = new FileReader();
        rd.onload = function () {
            try {
                var parsed = safeParse(String(rd.result));
                cfg = mergeCfg(parsed); // mergeCfg санитизирует всё содержимое
                sessionRandomIndex = null; // сбросить выбор random из прошлой сессии — переберётся под новый конфиг
                apply(); refreshPanel();
                toast("Настройки импортированы");
            } catch (e) { toast("Ошибка: файл не читается как JSON", false); }
            inp.remove();
        };
        rd.onerror = function () { toast("Не удалось прочитать файл", false); inp.remove(); };
        rd.readAsText(f);
    });
    document.body.appendChild(inp); inp.click();
}
function makeIoBtn(text) {
    var b = el("div", "flex:1 1 0; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", text);
    b.addEventListener("mouseenter", function () { b.style.background = "rgba(137,180,250,0.26)"; });
    b.addEventListener("mouseleave", function () { b.style.background = "rgba(137,180,250,0.14)"; });
    keyActivate(b, text);
    return b;
}
