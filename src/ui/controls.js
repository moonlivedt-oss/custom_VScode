

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
    row.appendChild(el("span", ST.fill, t(label)));
    var d = infoDot(info); if (d) row.appendChild(d);
    return row;
}

// Слайдер: метка + ползунок + значение + «?». opts:
//   label, min, max, step, dec (знаков после запятой), get()->число, onInput(v)->записать,
//   info, labelW (ширина метки, 92), valW (ширина значения, 34), ellipsis (обрезать метку, true),
//   def (значение по умолчанию для сброса двойным кликом; число ИЛИ функция ()->число для
//   контролов, чья зона/цель меняется, напр. фильтры картинки по зонам — см. makeImgFilters).
// Все слайдеры пишут значение и зовут applyThrottled (коалесинг в один apply за кадр).
// На возвращённом узле есть _refresh() — пересинхронизировать ползунок/значение с cfg
// (нужно, когда один набор слайдеров переключается между зонами, см. makeImgFilters).
function makeSlider(opts) {
    var labelW = opts.labelW || 92, valW = opts.valW || 34, ell = opts.ellipsis !== false;
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(labelW, ell), t(opts.label)));
    var sl = el("input", ST.range);
    sl.type = "range"; sl.min = String(opts.min); sl.max = String(opts.max); sl.step = String(opts.step); sl.value = String(opts.get());
    var val = el("span", "flex:0 0 " + valW + "px; text-align:right; color:var(--mlp-muted,#a6adc8);", Number(opts.get()).toFixed(opts.dec));
    // «Изменено» + встроенный сброс. Когда текущее значение отличается от
    // дефолта (def), значение красится акцентом, а справа появляется кнопка «⟲» — клик по ней
    // сбрасывает к дефолту (видимая и доступная альтернатива двойному клику по ползунку). Так
    // сразу видно, какие контролы ты трогал, и любой из них откатывается одним кликом. def может
    // быть функцией — для слайдеров с зонозависимым дефолтом (фильтры картинки по зонам).
    function defVal() { return (typeof opts.def === "function") ? opts.def() : opts.def; }
    var reset = null;
    if (opts.def != null) {
        reset = el("span", "flex:0 0 auto; width:15px; height:15px; line-height:14px; text-align:center; border-radius:50%; font-size:11px; cursor:pointer; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.4);", "↺");
        reset.title = t("Сбросить к значению по умолчанию");
        keyActivate(reset, t("Сбросить к значению по умолчанию"));
    }
    // Отражает состояние «изменено»: цвет значения + видимость кнопки сброса. Сравнение
    // с допуском (float), чтобы 0.32 против 0.32 не считалось изменением из-за представления.
    function syncChanged() {
        if (!reset) return;
        var changed = Math.abs(Number(opts.get()) - Number(defVal())) > 1e-9;
        reset.hidden = !changed;
        val.style.color = changed ? "var(--mlbg-accent)" : "var(--mlp-muted,#a6adc8)";
    }
    function doReset() {
        var dv = defVal();
        opts.onInput(dv);
        sl.value = String(dv); val.textContent = Number(dv).toFixed(opts.dec);
        apply(); syncChanged();
    }
    // input — «живое» применение без записи (коалесинг в кадр); change (отпускание ползунка)
    // — единственная запись в localStorage. Раньше saveCfg дёргался на каждый кадр перетаскивания.
    sl.addEventListener("input", function () { var v = parseFloat(sl.value); opts.onInput(v); val.textContent = v.toFixed(opts.dec); syncChanged(); applyThrottledLive(); });
    sl.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
    // Двойной клик по ползунку — тот же сброс к дефолту (одно дискретное действие -> apply).
    if (reset) {
        sl.title = t("Двойной клик — сброс к значению по умолчанию");
        sl.addEventListener("dblclick", doReset);
        reset.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); doReset(); });
    }
    wrap.appendChild(sl); wrap.appendChild(val);
    if (reset) wrap.appendChild(reset);
    var d = infoDot(opts.info); if (d) wrap.appendChild(d);
    wrap._refresh = function () { sl.value = String(opts.get()); val.textContent = Number(opts.get()).toFixed(opts.dec); syncChanged(); };
    syncChanged();
    return wrap;
}

function makeParamSlider(def) {
    var key = def[0];
    return makeSlider({
        label: def[1], min: def[2], max: def[3], step: def[4], dec: def[5],
        get: function () { return cfg.fxp[key]; }, onInput: function (v) { cfg.fxp[key] = v; }, info: INFO["fxp_" + key],
        def: DEFAULTS.fxp[key]
    });
}
function makeCheck(key, label) {
    return makeToggle(function () { return cfg.fx[key]; }, function (v) {
        cfg.fx[key] = v; apply();
        // Тумблеры с зависимыми контролами (число/стиль частиц, длительность помидора,
        // скорость Aurora, радиус спотлайта) — пересобираем панель, чтобы соответствующий
        // слайдер силы появился/исчез. refreshPanel сохраняет вкладку/прокрутку/фокус (panel.js).
        // Панель пересобираем, если от этого тумблера зависит показ других контролов:
        // ползунка силы (PARAM_REQUIRES) или пунктов-надстроек (FX_REQUIRES).
        if (fxAffectsPanel(key)) { try { refreshPanel(); } catch (e) {} }
    }, label, INFO["fx_" + key]);
}

// ==== Контролы для картинки / слайдшоу (работают с произвольным разделом cfg) ====
// Универсальный слайдер над obj[key] — используется для cfg.slideshow и cfg.autoTime.
// def (необязателен) — значение сброса по двойному клику (обычно из DEFAULTS).
function makeObjSlider(obj, key, label, min, max, step, dec, info, def) {
    return makeSlider({
        label: label, min: min, max: max, step: step, dec: dec,
        get: function () { return obj[key]; }, onInput: function (v) { obj[key] = v; }, info: info, def: def
    });
}
// ===== Сворачиваемая секция =====
// Настройка меню: каждую секцию регистрируем в panelAllSections (для менеджера «Настройка
// меню» — он должен видеть и скрытые тоже). Скрытую секцию ВНЕ режима «Настроить» не строим и
// не аппендим — отдаём открепленный body, чтобы .appendChild вызывающих был безвреден. В режиме
// «Настроить» скрытая секция показывается ПРИГЛУШЁННОЙ с кнопкой «показать» — чтобы скрытие было
// обратимым прямо на месте (а не только через менеджер). Сам менеджер «Настройка меню» скрыть нельзя.
function collapsible(parent, title, info) {
    try { if (typeof panelAllSections !== "undefined" && panelAllSections && panelAllSections.push) panelAllSections.push({ title: title, label: t(title), parent: parent }); } catch (e) {}
    var canHide = title !== "Настройка меню";
    var editing = (typeof panelEditMenu !== "undefined" && panelEditMenu);
    var isHidden = !!(canHide && cfg.ui && cfg.ui.hidden && cfg.ui.hidden[title]);
    if (isHidden && !editing) return el("div", null); // скрыта и не настраиваем — не строим
    var collapsed = !!(cfg.ui.collapsed && cfg.ui.collapsed[title]);
    var wrap = el("div", "margin-top:8px;");
    if (isHidden) wrap.style.opacity = "0.55"; // «скрыто, но показано для настройки»
    var head = el("div", "display:flex; align-items:center; gap:7px; padding:5px 7px; cursor:pointer; border-radius:7px; background:rgba(var(--mlbg-accent-rgb),0.08);");
    var chev = el("span", "flex:0 0 auto; width:10px; text-align:center; color:var(--mlbg-accent); font-size:9px; transition:transform 0.15s;", "▶");
    chev.style.transform = collapsed ? "rotate(0deg)" : "rotate(90deg)";
    head.appendChild(chev);
    head.appendChild(el("div", "flex:1 1 auto; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", t(title)));
    var idot = infoDot(info); if (idot) head.appendChild(idot); // перевод подписи секции — внутри infoDot (infoText)
    // Режим «Настроить»: звезда «в избранное» + обратимая кнопка «скрыть/показать» в шапке.
    if (canHide && editing) {
        var isFav = !!(cfg.ui.favSec && cfg.ui.favSec[title]);
        var star = el("span", "flex:0 0 auto; width:16px; text-align:center; cursor:pointer; font-size:12px; color:" + (isFav ? "var(--mlbg-accent)" : "var(--mlp-faint,#6c7086)") + ";", isFav ? "★" : "☆");
        star.title = isFav ? t("Убрать из избранного") : t("В избранное");
        star.addEventListener("click", function (e) {
            e.stopPropagation(); e.preventDefault();
            if (!cfg.ui.favSec) cfg.ui.favSec = {};
            if (isFav) delete cfg.ui.favSec[title]; else cfg.ui.favSec[title] = true;
            saveCfg(); try { refreshPanel(); } catch (er) {}
        });
        keyActivate(star, (isFav ? t("Убрать из избранного") : t("В избранное")) + ": " + t(title));
        head.appendChild(star);

        var hideB = el("span", "flex:0 0 auto; padding:1px 7px; border-radius:5px; font-size:10px; cursor:pointer; " +
            (isHidden ? "color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);"
                      : "color:#f38ba8; background:rgba(243,139,168,0.14); border:1px solid rgba(243,139,168,0.3);"),
            isHidden ? t("показать") : t("скрыть"));
        hideB.addEventListener("click", function (e) {
            e.stopPropagation(); e.preventDefault();
            if (!cfg.ui.hidden) cfg.ui.hidden = {};
            if (isHidden) delete cfg.ui.hidden[title]; else cfg.ui.hidden[title] = true;
            saveCfg(); try { refreshPanel(); } catch (er) {}
        });
        keyActivate(hideB, (isHidden ? t("Показать секцию") : t("Скрыть секцию")) + ": " + t(title));
        head.appendChild(hideB);
    }
    var body = el("div", "padding:6px 3px 2px;");
    body.style.display = collapsed ? "none" : "block";
    // Единая смена состояния секции (используется и кликом, и разворотом из поиска по панели).
    function setOpen(show) {
        body.style.display = show ? "block" : "none";
        chev.style.transform = show ? "rotate(90deg)" : "rotate(0deg)";
        head.setAttribute("aria-expanded", show ? "true" : "false");
        if (!cfg.ui.collapsed) cfg.ui.collapsed = {};
        cfg.ui.collapsed[title] = !show; saveCfg();
    }
    head.addEventListener("mouseenter", function () { head.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
    head.addEventListener("mouseleave", function () { head.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; });
    head.addEventListener("click", function () { setOpen(body.style.display === "none"); });
    keyActivate(head, t(title));
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    wrap.appendChild(head); wrap.appendChild(body);
    parent.appendChild(wrap);
    // Регистрируем секцию для поиска по панели (panelSections живёт в panel.js и обнуляется
    // в начале togglePanel). Храним, к какой вкладке-родителю секция принадлежит, её head для
    // прокрутки/подсветки и expand() для разворота. typeof-страховка — collapsible может быть
    // вызван и вне панели (тогда индекса просто нет).
    try {
        if (typeof panelSections !== "undefined" && panelSections && panelSections.push) {
            // title — стабильный русский ключ (sectionByTitle ищет по нему, cfg.ui.collapsed
            // хранит по нему); label — переведённый текст для отображения и поиска по панели.
            panelSections.push({ title: title, label: t(title), parent: parent, head: head, expand: function () { setOpen(true); }, setOpen: setOpen });
        }
    } catch (e) {}
    return body;
}
