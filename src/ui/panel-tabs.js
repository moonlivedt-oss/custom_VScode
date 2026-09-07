// ===== Наполнение вкладок панели =====
// Каркас панели (шапка, бар вкладок, поиск, перетаскивание) собирает togglePanel в
// src/ui/panel.js, а КАКИЕ секции лежат на каждой вкладке — здесь. Каждая функция получает
// готовую панель-вкладку и наполняет её секциями; порядок вызова = порядок вкладок.

// Вкладка «Набор»: какой фон показывать и по какому поводу он меняется.
function buildTabSets(tSet) {
    // ===== Вкладка «Набор»: какой фон и когда =====
    // Набор (превью-чипы)
    var secSet = collapsible(tSet, "Набор", "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске.");
    var chips = el("div", "display:flex; flex-wrap:wrap; gap:6px; align-items:center;");
    for (var i = 0; i < SETS.length; i++) chips.appendChild(makeChip(String(i), String(i)));
    chips.appendChild(makeChip("random", "случайно"));
    secSet.appendChild(chips);
    secSet.appendChild(makeSetNameEdit()); // переименование активного набора

    // Генератор набора по seed/палитре: бесконечные согласованные фоны без ассетов.
    var secGen = collapsible(tSet, "Генератор", "Создать согласованный набор из seed-строки или базового цвета (#rrggbb): тёмная подложка + акцент + гармоничный спутник. Один seed всегда даёт один и тот же набор — им можно делиться. Наборы сохраняются и добавляются в конец списка.");
    secGen.appendChild(makeGenerator());

    // Слайдшоу
    var secSlide = collapsible(tSet, "Слайдшоу", "Автоматическая смена набора по кругу через заданный интервал.");
    secSlide.appendChild(makeSlideToggle());
    // Интервал показываем только когда слайд-шоу включено: иначе это ползунок в никуда.
    if (cfg.slideshow.on) secSlide.appendChild(makeObjSlider(cfg.slideshow, "min", "Интервал, мин", 1, 120, 1, 0, INFO.slide_min, DEFAULTS.slideshow.min));

    // Свой шейдер: GLSL для набора «Свой шейдер». Рядом с библиотекой картинок —

    // это тоже «свой источник фона», только считаемый на GPU.

    var secShader = collapsible(tSet, "Шейдер", "Свой GLSL-фон для набора «Свой шейдер»: тело функции render(vec2 p). Ошибка компиляции не ломает редактор — фон откатится на встроенный.");

    secShader.appendChild(makeShaderSrcUI());


    // Библиотека своих картинок: список локальных путей, крутится в редакторе по таймеру слайдшоу.
    var secLib = collapsible(tSet, "Библиотека", "Свои картинки списком: когда «Крутить библиотеку» включено, они по очереди показываются в редакторе и сменяются по таймеру слайдшоу (интервал — выше). Пути локальные: file:/// или vscode-file://.");
    secLib.appendChild(makeLibraryUI());

    // Авто-набор по времени суток
    var secTime = collapsible(tSet, "По времени суток", "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».");
    secTime.appendChild(makeAutoTimeToggle());
    secTime.appendChild(makeSetPicker("day", "Дневной"));
    secTime.appendChild(makeSetPicker("night", "Ночной"));
    secTime.appendChild(makeAutoTimeMode());
    // Границы дня: по часам (from/to) или по реальному рассвету/закату (широта/долгота).
    if (cfg.autoTime && cfg.autoTime.mode === "sun") {
        secTime.appendChild(makeObjSlider(cfg.autoTime, "lat", "Широта", -90, 90, 1, 0, INFO.autotime_lat, DEFAULTS.autoTime.lat));
        secTime.appendChild(makeObjSlider(cfg.autoTime, "lon", "Долгота", -180, 180, 1, 0, INFO.autotime_lon, DEFAULTS.autoTime.lon));
    } else {
        secTime.appendChild(makeObjSlider(cfg.autoTime, "from", "День с, ч", 0, 23, 1, 0, INFO.autotime_from, DEFAULTS.autoTime.from));
        secTime.appendChild(makeObjSlider(cfg.autoTime, "to", "День до, ч", 0, 23, 1, 0, INFO.autotime_to, DEFAULTS.autoTime.to));
    }

    // Контекст: фон под открытый проект + индикатор git-ветки (оба читают заголовок/статусбар).
    var secWs = collapsible(tSet, "По проекту", "Набор под открытый проект и полоска-индикатор git-ветки. Держатся на чтении заголовка и статусбара VS Code.");
    secWs.appendChild(makeWorkspaceUI());
    secWs.appendChild(makeAmbientBranchToggle());

    // Фон по git-ветке: разный набор на main/master и на фиче-ветках (ветка из статусбара).
    var secRemote = collapsible(tSet, "По репозиторию", "Набор под удалённый репозиторий (владелец/имя): один и тот же проект, склонированный в разные папки, получает один фон. Адрес репозитория берётся из git через компаньон-расширение — из вёрстки редактора его не достать.");
    secRemote.appendChild(makeRemoteAutoUI());

    var secBranch = collapsible(tSet, "По ветке", "Набор под текущую git-ветку: main/master — один, фиче-ветки — другой. Приоритетнее слайдшоу и времени суток, но уступает «по проекту». Ветка читается из статусбара VS Code.");
    secBranch.appendChild(makeBranchAutoUI());

    // Фон по языку/расширению активного файла: напр. .py — один набор, .md — другой.
    var secLang = collapsible(tSet, "По языку", "Набор под язык активного файла (по расширению): напр. .py — один набор, .md — другой. Самый частый контекст (низший приоритет). Расширение читается из подписи активной вкладки.");
    secLang.appendChild(makeLangAutoUI());
}

// Вкладка «Вид»: как этот фон выглядит и не мешает ли он читать код.
function buildTabView(tView) {
    // ===== Вкладка «Вид»: как всё выглядит =====
    // Яркость набора
    var secOp = collapsible(tView, "Яркость набора", "Насколько ярко проступают фоновые картинки в каждой зоне.");
    [["editor", "Редактор"], ["side", "Сайдбар"], ["panel", "Панель"]].forEach(function (o) { secOp.appendChild(makeOpSlider(o[0], o[1])); });
    secOp.appendChild(makeAutoDim());
    // Метр читаемости — прямо под ползунками яркости: там, где эту величину
    // и крутят. Показывает контраст кода к реальной подложке и чинит прозрачность одним кликом.
    secOp.appendChild(makeReadabilityUI());

    // Картинка: акцентный цвет + фильтры фоновой картинки по зонам
    var secImg = collapsible(tView, "Картинка", "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.");
    secImg.appendChild(makeAccentColor());
    secImg.appendChild(makeAccentSafeUI()); // дальтоник-безопасные акценты + проверка контраста
    secImg.appendChild(makeImgFilters());

    // Эффекты (тумблеры + сила + стиль частиц — одной секцией, чтобы включение и сила
    // эффекта жили рядом). Эффектов за 30 — сверху поле-фильтр по названию (чистый UI).
    var secFx = collapsible(tView, "Эффекты", "Включение/выключение визуальных эффектов и их сила. Наведи на пункт — пояснение «?» и живой предпросмотр. Эффекты сгруппированы по смыслу; «только включённые» прячет выключенные. Конкретный эффект ищи полем поиска над вкладками.");
    buildEffectsSection(secFx);

    // Витрина/скринсейвер: после простоя — крупные часы и имя набора поверх экрана.
    var secSaver = collapsible(tView, "Витрина", "После нескольких минут простоя показывает крупные часы, дату и имя набора поверх экрана; любое действие возвращает редактор. Удобно для стрима и «настроения» рабочего стола.");
    secSaver.appendChild(makeScreensaverToggle());
    if (cfg.screensaver.on) secSaver.appendChild(makeObjSlider(cfg.screensaver, "min", "Простой, мин", 1, 60, 1, 0, INFO.screensaver_min, DEFAULTS.screensaver.min));
}

// Вкладка «Терминал»: типографика встроенного терминала.
function buildTabTerm(tTerm) {
    // ===== Вкладка «Терминал» =====
    var secTerm = collapsible(tTerm, "Терминал", "Оформление интегрированного терминала: шрифт, лигатуры, свечение, курсор, выделение.");
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

// Вкладка «Система»: работоспособность установки — диагностика, загрузчик, пути, хоткеи.
function buildTabSys(tSys) {
    // ===== Вкладка «Система»: установка, диагностика, справка =====
    // Осталась лёгкой: только то, что относится к работоспособности плагина, — а управление
    // образами и конфигом переехало в отдельную вкладку «Данные» (ниже), чтобы «Система» не
    // была стеной из секций и кнопок.
    // Язык панели — самой первой строкой (высокая заметность): переключение RU/EN/Авто.
    tSys.appendChild(makeLangSelect());

    // Диагностика установки — первой: если фон «не появился», сюда заглядывают в первую
    // очередь. Кнопка собирает отчёт (версия, тема, набор, пути картинок, найден ли стиль)
    // и копирует его в буфер — удобно приложить к issue. Ничего не меняет.
    var secDiag = collapsible(tSys, "Диагностика", "Проверка установки: что плагин видит о себе (версия, тема, набор, папка и загрузка картинок, активен ли custom-css). Отчёт копируется в буфер для issue. Загляни сюда, если фон не появился.");
    secDiag.appendChild(makeDiagnosticsUI());

    // Папка плагина: база для картинок набора. Нужна при переносе плагина (иначе фон
    // пропадает — плитки набора с «!»). Отдельная секция, чтобы не путать с путём картинки.
    // Загрузчик: каким расширением внедрён скрипт и готово ли окно к настоящей прозрачности.
    // Здесь же — готовые куски settings.json (плагин сам туда писать не может).
    var secLoader = collapsible(tSys, "Загрузчик", "Каким расширением внедряется плагин (be5invis.vscode-custom-css или subframe7536.custom-ui-style) и готово ли окно к настоящей прозрачности. Кнопки кладут в буфер нужные строки для settings.json.");
    secLoader.appendChild(makeLoaderUI());

    var secBase = collapsible(tSys, "Папка плагина", "Откуда брать картинки наборов. Меняй, если перенёс плагин и фон пропал. Пусто — путь определяется автоматически.");
    secBase.appendChild(makeImgBaseField());
    secBase.appendChild(makeRemoteImagesToggle());

    // Горячие клавиши: сами хоткеи заданы в boot.js (onHotkey) — здесь только напоминание,
    // чтобы их можно было узнать, не заглядывая в код/README. Свёрнуто по умолчанию.
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
        row.appendChild(el("kbd", "flex:0 0 92px; font-family:var(--vscode-editor-font-family,monospace); font-size:10px; text-align:center; padding:2px 4px; border-radius:5px; background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3); color:var(--mlbg-accent);", k[0]));
        row.appendChild(el("span", "flex:1 1 auto; font-size:11px; color:var(--mlp-muted,#a6adc8);", t(k[1])));
        secKeys.appendChild(row);
    });

    // Настройка меню: показать/скрыть секции и эффекты (тело заполняется в конце — нужен полный
    // список секций всех вкладок из panelAllSections). Саму эту секцию скрыть нельзя (collapsible).
    var secMenuBody = collapsible(tSys, "Настройка меню", "Показать/скрыть секции и эффекты панели, чтобы меню не разрасталось. Сними галочку — пункт исчезнет из панели (настройки не теряются), «Показать всё» вернёт всё. Быстро скрыть прямо в панели — кнопка «Настроить» в шапке.");
    return secMenuBody;
}

// Вкладка «Данные»: образы вида, обмен и управление конфигом.
function buildTabData(tData) {
    // ===== Вкладка «Данные»: образы, обмен, конфиг =====
    // Всё про сохранение/перенос/обмен образом вида + операции над конфигом (экспорт/импорт,
    // история, восстановление, сброс). Вынесено из «Системы» — этих пунктов много, вместе они
    // читаются как один смысловой блок и не мешают быстро найти диагностику/установку.

    // Профили-пресеты для быстрого старта: один клик настраивает весь вид (см. онбординг).
    var secProfiles = collapsible(tData, "Профили", "Готовые профили вида: спокойный, фокус, презентация, минимал, максимум. Один клик настраивает фон и эффекты целиком — дальше можно править вручную.");
    secProfiles.appendChild(makeProfilesUI());

    // Статистика сессии: время, файлы, нажатия, поток, стрик (копится при включённом тумблере «Статистика»).
    var secStats = collapsible(tData, "Статистика", "Сводка текущей сессии: время, тронутые файлы, нажатия, суммарное время в потоке и лучший стрик непрерывной печати. Копится, пока включён тумблер «Статистика» (вкладка «Вид» → «Эффекты»). Данные живут только в этой сессии.");
    secStats.appendChild(makeStatsUI());

    // Пресеты (сохранённые образы)
    var secPreset = collapsible(tData, "Пресеты", "Сохранённые образы: весь вид под именем, переключение одним кликом.");
    secPreset.appendChild(makePresetsUI());

    // Синхронизация через settings.json: перенос вида на другие машины (едет с Settings Sync).
    // Требует компаньон-расширение (оно прокидывает базовый конфиг как window.__MLBG_SEED__).
    var secSync = collapsible(tData, "Синхронизация", "Через settings.json (едет с Settings Sync). Скопируй строку и вставь её в settings.json — вид перенесётся на другие машины. «Загрузить базу» подтянет синхронизированный образ сюда.");
    secSync.appendChild(makeSyncUI());

    // Поделиться образом коротким кодом (без картинок/путей)
    var secShare = collapsible(tData, "Поделиться", "Короткий код всего образа для обмена: скопируй свой или примени чужой. Картинки и пути не входят.");
    secShare.appendChild(makeShareUI());

    // Экспорт цветовой темы VS Code из палитры активного набора: вид живёт и там, где
    // custom-фон недоступен (vscode.dev, SSH, Codespaces), и находится поиском тем.
    var secTheme = collapsible(tData, "Экспорт темы", "Собрать настоящую VS Code-тему (color-theme.json) из палитры активного набора: цвета интерфейса + подсветка синтаксиса. Работает там, где custom-фон недоступен. Как применить — в подсказке «?» рядом с кнопкой.");
    secTheme.appendChild(makeThemeExportUI());

    // экспорт / импорт
    var io = el("div", "display:flex; gap:8px; margin-top:12px;");
    var expB = makeIoBtn("Экспорт"); expB.addEventListener("click", function () { exportCfg(); });
    var impB = makeIoBtn("Импорт"); impB.addEventListener("click", function () { importCfg(); });
    io.appendChild(expB); io.appendChild(impB);
    tData.appendChild(io);

    // История изменений вида (Undo / Redo) в пределах сессии. Отдельно от авто-резерва ниже:
    // резерв — откат одной крупной замены (импорт/сброс/пресет), а история — пошаговая отмена
    // правок панели. Хоткеи: Ctrl+Alt+Z / Ctrl+Alt+Y.
    tData.appendChild(makeHistoryUI());

    // Восстановление из авто-резерва: появляется, когда резерв есть (после импорта/сброса/
    // пресета). Возвращает конфиг, бывший до последней такой замены (можно нажать повторно).
    if (hasBackup()) {
        var restB = el("div", "margin-top:8px; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", t("Восстановить прежние настройки"));
        restB.addEventListener("mouseenter", function () { restB.style.background = "rgba(137,180,250,0.26)"; });
        restB.addEventListener("mouseleave", function () { restB.style.background = "rgba(137,180,250,0.14)"; });
        restB.addEventListener("click", function () { restoreBackup(); });
        keyActivate(restB, t("Восстановить прежние настройки из резерва"));
        tData.appendChild(restB);
    }

    // сброс
    var reset = el("div", "margin-top:8px; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", t("Сбросить к дефолту"));
    reset.addEventListener("mouseenter", function () { reset.style.background = "rgba(var(--mlbg-accent-rgb),0.26)"; });
    reset.addEventListener("mouseleave", function () { reset.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
    reset.addEventListener("click", function () {
        var keepMode = cfg.mode, keepUi = cfg.ui; // сброс дизайна, но не положения/свёрнутости панели
        backupCfg();                              // прежние настройки -> резерв (сброс можно откатить)
        cfg = clone(DEFAULTS); cfg.mode = keepMode; cfg.ui = keepUi;
        syncGenSets(); // дефолт без ген-наборов -> обрезать хвост SETS; keepMode на ген-набор зажмётся на 0
        apply(); refreshPanel();
    });
    keyActivate(reset, t("Сбросить к дефолту"));
    tData.appendChild(reset);

    // Строка-указатель секций («Свернуть всё» + чип на каждую секцию) была здесь до v20.
    // Убрана: при 7-8 секциях на вкладке она занимала две строки над содержимым и мешала
    // больше, чем помогала. Быстрый доступ к секции остался поиском над вкладками (он умеет
    // раскрывать и подсвечивать нужную) и сворачиванием секций по клику на заголовок.
}
