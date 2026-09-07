// ===== Диагностика установки =====
// Главная боль плагинов через custom-css — «поставил, а фон не появился». Отчёт отвечает,
// что плагин видит о себе: версия, тема, набор, пути и загрузка картинок, активный
// загрузчик, здоровье селекторов вёрстки и читаемость кода. Ничего не меняет.

// ===== Диагностика установки =====
// Главная боль custom-css плагинов — «поставил, а фон не появился»: чаще всего не задан путь
// к картинкам (перенос папки) либо не перезапущен VS Code. Собираем короткий отчёт о том, что
// плагин видит о себе: версия, тема, активный набор, папка картинок, загрузились ли картинки
// активного набора, найден ли наш <style> и кнопка BG. Ничего не меняет — только читает
// состояние. Возвращает { lines, ok, text }: ok=false, если есть явная проблема.
function _zoneDiag(idx, zone) {
    if (isGrad(idx, zone)) return { s: "градиент (без картинки)", bad: false };
    if (typeof isShader === "function" && isShader(idx, zone)) return { s: "шейдер (без картинки)", bad: false };
    if (isProc(idx, zone)) return { s: "процедурная текстура (без картинки)", bad: false };
    var url = zoneUrl(idx, zone);
    if (!url) return { s: "путь не задан", bad: false }; // зона без своей картинки — это не ошибка
    var st = probeImage(url);
    if (!st.resolved) return { s: "загружается…", bad: false };
    return st.ok ? { s: "загружена", bad: false } : { s: "НЕ загружена (проверь путь)", bad: true };
}
function diagnostics() {
    var idx = activeIndex(), lines = [], bad = 0;
    function add(k, v) { lines.push(t(k) + ": " + v); }
    add("Версия", APP_VERSION + " (схема конфига v" + CFG_VERSION + ")");
    add("Тема", themeKind());
    add("Язык интерфейса", uiLang() + (cfg.lang === "auto" ? "  [авто]" : "  [" + cfg.lang + "]"));
    add("Фон включён", cfg.enabled ? t("да") : t("нет (мастер-выключатель)"));
    var kind = (typeof isShaderSet === "function" && isShaderSet(idx)) ? " (шейдер)"
        : isProcSet(idx) ? " (проц.)"
        : isGradSet(idx) ? " (град.)"
        : (SETS[idx] && SETS[idx].master) ? " (мастер-кадр)" : " (фото)";
    add("Активный набор", idx + " · " + (setName(idx) || "?") + kind);
    var base = imgBase();
    add("Папка картинок", (base || "(путь не определён)") + (cfg.imgBase ? "  [задана вручную]" : "  [авто]"));
    add("Сетевые картинки", cfg.allowRemoteImages ? t("разрешены") : t("выключены"));
    var styleFound = !!document.getElementById(STYLE_ID);
    add("Стиль в DOM", styleFound ? t("найден (custom-css активен)") : t("НЕ найден"));
    if (!styleFound) bad++;
    add("Кнопка BG", document.getElementById(SB_ID) ? t("найдена") : t("нет (статусбар ещё не готов?)"));
    ["editor", "sidebar", "panel"].forEach(function (z, i) {
        var r = _zoneDiag(idx, z);
        if (r.bad) bad++;
        lines.push(t("Картинка · ") + t(["редактор", "сайдбар", "панель"][i]) + ": " + r.s);
    });
    add("Всего наборов", SETS.length + (SETS_DROPPED > 0 ? "  (отброшено битых: " + SETS_DROPPED + " — проверь правки SETS)" : ""));
    // «Здоровье» DOM-скрейпинга (git-ветка / счётчик ошибок / имя проекта): если селектор под
    // текущую версию VS Code перестал находиться, показываем это явно — вместо тихой поломки.
    // scrapeHealth живёт в scrape.js (typeof-страховка на случай сборки без модуля).
    if (typeof scrapeHealth === "function") {
        var health = scrapeHealth();
        health.forEach(function (h) {
            if (!h.ok) bad++;
            lines.push(t("Чтение из DOM · ") + t(h.name) + ": " + (h.ok ? "" : t("СБОЙ") + " · ") + t(h.note));
        });
    }
    // Загрузчик: каким расширением внедрён скрипт. Компаньон кладёт это в
    // window.__MLBG_ENV__; без компаньона определяем по косвенным признакам (loaderKind).
    if (typeof loaderKind === "function") {
        var ld = loaderKind();
        add("Загрузчик", ld.title + (ld.version ? " " + ld.version : "") + (ld.sure ? "" : "  [" + t("определено косвенно") + "]"));
    }
    // «Здоровье» CSS-селекторов воркбенча: не читаем данные, а проверяем, что
    // элементы, на которые вешается оформление, вообще существуют в текущей версии VS Code.
    if (typeof selectorHealthSummary === "function") {
        var sh = selectorHealthSummary();
        add("Селекторы вёрстки", sh.found + "/" + sh.total + (sh.ok ? "" : "  " + t("СБОЙ") + ": " + sh.missingRequired.join(", ")));
        if (!sh.ok) {
            bad++;
            lines.push(t("Обязательные элементы вёрстки не найдены — скорее всего, обновление VS Code изменило разметку. Часть оформления не применится. Приложи этот отчёт к issue."));
        }
        // Необязательные промахи перечисляем справочно: они нормальны, когда панель закрыта
        // или файл не открыт, но в отчёте по багу помогают понять картину.
        var optMiss = sh.items.filter(function (h) { return !h.found && h.opt; }).map(function (h) { return h.sel; });
        if (optMiss.length) lines.push(t("Не найдено (норма, если элемент скрыт): ") + optMiss.join(" "));
    }
    // Читаемость: контраст кода к реальной подложке под ним.
    if (typeof readability === "function") {
        var rd = readability();
        if (rd && !rd.off) add("Читаемость кода", rd.ratio.toFixed(1) + ":1  " + t("худший участок") + " " + rd.worstRatio.toFixed(1) + ":1" + (rd.ok ? "" : "  " + t("(ниже 4.5 — фон мешает читать)")));
    }
    // Подсказка, если картинки набора не грузятся — почти всегда виноват путь.
    if (bad && styleFound) lines.push("", "Похоже, картинки набора не находятся. Проверь «Папка плагина» ниже: путь должен вести к папке с assets/. После правки фон появляется сразу.");
    return { lines: lines, ok: bad === 0, text: t("MoonLight custom-bg — диагностика") + "\n" + lines.join("\n") };
}
// UI секции «Диагностика»: кнопка «Проверить» заполняет блок-отчёт и копирует его в буфер
// (удобно вложить в issue). Отчёт остаётся на экране, чтобы прочитать без буфера обмена.
function makeDiagnosticsUI() {
    var box = el("div", null);
    var out = el("pre", "margin:6px 0 0; padding:8px 9px; border-radius:8px; white-space:pre-wrap; word-break:break-word; font-family:var(--vscode-editor-font-family,monospace); font-size:10.5px; line-height:1.5; color:var(--mlp-muted,#a6adc8); background:rgba(var(--mlbg-accent-rgb),0.06); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12)); max-height:220px; overflow:auto;");
    out.hidden = true;
    out.setAttribute("role", "status"); out.setAttribute("aria-live", "polite"); out.tabIndex = 0;
    var runB = makeIoBtn("Проверить установку");
    runB.addEventListener("click", function () {
        var d = diagnostics();
        out.textContent = d.text; out.hidden = false;
        var copied = copyText(d.text);
        toast(d.ok ? (copied ? t("Всё в порядке · отчёт скопирован") : t("Всё в порядке"))
                   : t("Есть проблемы · отчёт скопирован для issue"), d.ok);
    });
    box.appendChild(runB); box.appendChild(out);
    return box;
}
