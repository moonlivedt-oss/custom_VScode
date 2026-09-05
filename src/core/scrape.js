// ===== Централизованный DOM-скрейпинг + учёт «здоровья» селекторов =====
// custom-css не даёт API к git-ветке, счётчику ошибок и имени проекта, поэтому мы читаем их
// прямо из DOM/заголовка VS Code. Вёрстка воркбенча меняется от версии к версии — такой
// скрейпинг хрупок: селектор, работавший вчера, завтра молча вернёт пусто, и фича тихо
// «отваливается» без единой ошибки. Здесь всё чтение DOM собрано в одном месте и по каждому
// ключу ведётся счётчик «сколько раз спрашивали / сколько раз реально нашли». Диагностика
// показывает, какой скрейпер перестал находиться (кандидат на почин под новую версию), —
// вместо тихой поломки пользователь видит явный сигнал.
//
// Порядок в сборке: сразу после state.js. Тут только объявления + var-реестр; реальные
// вызовы scrape*/gitBranch/problemsCount/workspaceName происходят позже (тики/heal), когда
// реестр уже инициализирован.

// Реестр скрейперов: por ключу — человекочитаемое имя (для диагностики), CSS-селектор
// (или спец-значение) и счётчики. hits===0 при tries>=SCRAPE_MIN_TRIES => селектор, вероятно,
// не подходит текущей версии VS Code (вёрстка изменилась).
var SCRAPE = {
    gitBranch: { name: "git-ветка", tries: 0, hits: 0 },
    problems:  { name: "счётчик ошибок", tries: 0, hits: 0 },
    workspace: { name: "имя проекта", tries: 0, hits: 0 }
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
