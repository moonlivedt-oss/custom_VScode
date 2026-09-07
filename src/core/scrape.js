// ===== Чтение данных из DOM и здоровье селекторов =====
// Загрузчик не даёт API к git-ветке, счётчику ошибок и имени проекта — их приходится читать
// прямо из вёрстки воркбенча. Вёрстка меняется от версии к версии, и сломавшийся селектор
// молча возвращает пусто: фича «отваливается» без единой ошибки. Поэтому всё чтение собрано
// здесь, и по каждому ключу считается «сколько раз спрашивали / сколько раз нашли» —
// диагностика показывает, что именно перестало находиться.

// Реестр скрейперов: имя для отчёта и счётчики. hits===0 при tries>=SCRAPE_MIN_TRIES —
// селектор, скорее всего, не подходит текущей версии редактора.
var SCRAPE = {
    gitBranch: { name: "git-ветка", tries: 0, hits: 0 },
    problems:  { name: "счётчик ошибок", tries: 0, hits: 0 },
    workspace: { name: "имя проекта", tries: 0, hits: 0 },
    editorFile: { name: "язык файла", tries: 0, hits: 0 }
};
var SCRAPE_MIN_TRIES = 8; // ниже этого порога «0 попаданий» ещё не показатель (просто рано/нет данных)

// Отметить попытку скрейпа: tries++ всегда, hits++ только при успехе. hit — «нашли валидное».
function scrapeMark(key, hit) {
    var s = SCRAPE[key]; if (!s) return hit;
    s.tries++; if (hit) s.hits++;
    return hit;
}

// Найти статусбар-элемент по codicon-иконке и вернуть текст его .statusbar-item (или "").
// Общий путь для git-ветки и счётчика ошибок — оба висят на иконке в статусбаре. Вынесено,
// чтобы селектор статусбара правился в одном месте, если VS Code поменяет разметку.
function scrapeStatusItem(iconClass) {
    try {
        var wb = document.querySelector(".monaco-workbench"); if (!wb) return "";
        var ico = wb.querySelector(".statusbar-item ." + iconClass);
        if (!ico) return "";
        var item = ico.closest ? ico.closest(".statusbar-item") : null;
        return (item && item.textContent) || "";
    } catch (e) { return ""; }
}

// Расширение активного файла (для «фон по языку файла»). API к языку редактора в custom-css
// нет, поэтому берём имя файла из подписи АКТИВНОЙ вкладки и вырезаем расширение. aria-label
// вкладки надёжнее textContent (там бывают значки-точки «изменён»): формат обычно
// «file.ts» или «file.ts, изменён» — берём первый токен и хвост после последней точки.
// Нормализуем к [a-z0-9_], ограничиваем длину. Пусто -> "" (тогда langIndex не сработает).
function editorFileExt() {
    try {
        var wb = document.querySelector(".monaco-workbench");
        if (!wb) { scrapeMark("editorFile", false); return ""; }
        var tab = wb.querySelector(".editor-group-container.active .tab.active .tab-label")
               || wb.querySelector(".tab.active .tab-label")
               || wb.querySelector(".tabs-container .tab.active");
        var name = (tab && tab.getAttribute && tab.getAttribute("aria-label")) || (tab && tab.textContent) || "";
        var base = String(name).trim().split(/[\s,]/)[0] || "";
        var dot = base.lastIndexOf(".");
        var ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16) : "";
        scrapeMark("editorFile", !!ext);
        return ext;
    } catch (e) { return ""; }
}

// ===== Здоровье CSS-селекторов воркбенча =====
// Скрейперы выше отвечают за ЧТЕНИЕ данных из DOM. Но у плагина, который живёт на чужой
// вёрстке, главный режим отказа другой: VS Code переименовал класс — и правило перестало
// на что-либо попадать. Ошибки нет, исключения нет, просто «стекло куда-то пропало».
// Здесь перечислены ключевые селекторы, на которых держится оформление; проверка ищет
// каждый в живом DOM и показывает, какие не находятся. Это превращает молчаливую поломку
// после обновления редактора в конкретный список «что чинить».
//
// opt: true — элемента может не быть по нормальным причинам (панель закрыта, ни один файл
// не открыт, титлбар нативный). Такие промахи НЕ считаются поломкой, но видны в отчёте.
var UI_SELECTORS = [
    { sel: ".monaco-workbench", name: "корень воркбенча" },
    { sel: ".part.editor", name: "часть: редактор" },
    { sel: ".part.sidebar", name: "часть: сайдбар" },
    { sel: ".part.panel", name: "часть: панель", opt: true },
    { sel: ".part.activitybar", name: "часть: актив-бар", opt: true },
    { sel: ".part.statusbar", name: "часть: статусбар" },
    { sel: ".part.titlebar", name: "часть: титлбар", opt: true },
    { sel: ".statusbar-item", name: "элемент статусбара" },
    { sel: ".monaco-editor", name: "редактор Monaco", opt: true },
    { sel: ".monaco-editor .overflow-guard > .monaco-scrollable-element", name: "холст фона редактора", opt: true },
    { sel: ".monaco-editor .view-lines", name: "строки кода", opt: true },
    { sel: ".editor-group-container", name: "группа редактора", opt: true },
    { sel: ".tabs-container", name: "полоса вкладок", opt: true },
    { sel: ".monaco-scrollable-element > .scrollbar > .slider", name: "ползунок скроллбара", opt: true },
    { sel: ".part.sidebar .monaco-list-row", name: "строка списка сайдбара", opt: true },
    { sel: ".monaco-workbench .pane-header", name: "заголовок секции", opt: true },
    { sel: ".xterm", name: "терминал xterm", opt: true },
    { sel: ".minimap", name: "миникарта", opt: true },
    { sel: ".quick-input-widget", name: "палитра команд", opt: true },
    { sel: ".monaco-editor .cursors-layer > .cursor", name: "курсор редактора", opt: true }
];
// Снимок: [{ name, sel, found, opt }]. Ничего не меняет — только читает DOM. Зовётся по
// требованию (диагностика в панели), а не в цикле: 20 querySelector — это дёшево, но
// бессмысленно делать каждую секунду.
function selectorHealth() {
    var out = [], i, s, found;
    for (i = 0; i < UI_SELECTORS.length; i++) {
        s = UI_SELECTORS[i];
        found = false;
        try { found = !!document.querySelector(s.sel); } catch (e) { found = false; }
        out.push({ name: s.name, sel: s.sel, found: found, opt: !!s.opt });
    }
    return out;
}
// Сводка одной строкой + признак «есть обязательные промахи» (тогда вёрстка, скорее всего,
// изменилась и оформление частично не применяется).
function selectorHealthSummary() {
    var h = selectorHealth(), found = 0, missReq = [], i;
    for (i = 0; i < h.length; i++) {
        if (h[i].found) found++;
        else if (!h[i].opt) missReq.push(h[i].name);
    }
    return { total: h.length, found: found, missingRequired: missReq, ok: missReq.length === 0, items: h };
}

// Health-снимок для диагностики: массив { name, ok, tries, hits, note } по каждому скрейперу.
// ok=false только когда попыток достаточно (>=SCRAPE_MIN_TRIES), а попаданий ноль — тогда
// селектор, скорее всего, устарел под новую версию VS Code. При малом числе попыток статус
// «нейтральный» (рано судить). Ничего не меняет — только читает счётчики.
function scrapeHealth() {
    var out = [];
    for (var k in SCRAPE) {
        if (!Object.prototype.hasOwnProperty.call(SCRAPE, k)) continue;
        var s = SCRAPE[k];
        var enough = s.tries >= SCRAPE_MIN_TRIES;
        var broken = enough && s.hits === 0;
        out.push({
            key: k, name: s.name, tries: s.tries, hits: s.hits,
            ok: !broken,
            note: broken ? "ни разу не нашёл за " + s.tries + " попыток — вероятно, изменилась вёрстка VS Code"
                : !enough ? "мало данных (" + s.hits + "/" + s.tries + ")"
                : "работает (" + s.hits + "/" + s.tries + ")"
        });
    }
    return out;
}
