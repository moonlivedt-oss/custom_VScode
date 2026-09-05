// ===== Локализация интерфейса (i18n) =====
// Проект писался по-русски, и русский остаётся «исходным» языком: строки в коде — русские,
// они же служат КЛЮЧАМИ словаря. t(ru) возвращает английский перевод, когда язык интерфейса
// английский, иначе — саму русскую строку. Такой подход не может сломать русский UI: при
// отсутствии перевода (или на русском языке) t() отдаёт исходную строку без изменений.
//
// Язык: cfg.lang ("auto" | "ru" | "en"). В «auto» берём язык интерфейса VS Code (атрибут lang
// у <html>, который VS Code выставляет по display-language; запасной — navigator.language).
// Если определить не удалось — русский (родной язык проекта). Пользователь всегда может явно
// переключить язык в панели («Система» → «Язык / Language»).

// Автоопределение — один раз при загрузке (потом только читаем cfg.lang). Возвращает "ru"/"en"/"".
var _autoLang = (function () {
    try {
        var l = "";
        if (typeof document !== "undefined" && document.documentElement && document.documentElement.getAttribute)
            l = document.documentElement.getAttribute("lang") || "";
        if (!l && typeof navigator !== "undefined") l = navigator.language || navigator.userLanguage || "";
        l = String(l).toLowerCase();
        if (l.indexOf("ru") === 0) return "ru";
        if (l.indexOf("en") === 0) return "en";
        return "";
    } catch (e) { return ""; }
})();

// Итоговый язык UI: явный выбор пользователя приоритетнее авто. cfg может ещё не существовать
// (t() зовётся и до создания cfg в теории) — тогда идём от авто.
function uiLang() {
    var v = (typeof cfg !== "undefined" && cfg && typeof cfg.lang === "string") ? cfg.lang : "auto";
    if (v === "ru" || v === "en") return v;
    return _autoLang === "en" ? "en" : "ru"; // auto: английский интерфейс -> en, иначе русский
}

// Перевод строки. На русском (или при отсутствии перевода) — исходная строка без изменений.
function t(s) {
    if (uiLang() !== "en") return s;
    var v = EN[s];
    return typeof v === "string" ? v : s;
}
// Список кодов языка для селектора в панели: код + подпись (подпись не переводится — она
// показывает язык на самом этом языке, как принято в переключателях).
var LANGS = [["auto", "Авто / Auto"], ["ru", "Русский"], ["en", "English"]];
function safeLang(v) { return (v === "auto" || v === "ru" || v === "en") ? v : "auto"; }

// ===== Английский словарь =====
// Ключ — точная русская строка из кода. Держим ПЛОСКИМ: так call-site просто оборачивается
// в t("…"), без выдумывания идентификаторов. Отсутствие ключа не ошибка — покажется русский.
var EN = {
    // -- Статусбар / заголовок панели --
    "⠿  Фон и дизайн": "⠿  Background & design",
    "Закрыть": "Close",
    "Перетаскивай окно за заголовок. Секции сворачиваются кликом по названию. У настроек «?» — клик показывает пояснение. Положение и свёрнутость запоминаются.":
        "Drag the window by its header. Sections collapse on a click of their title. Settings with a “?” show a hint on click. Position and collapsed state are remembered.",

    // -- Вкладки --
    "Набор": "Sets",
    "Вид": "View",
    "Терминал": "Terminal",
    "Система": "System",
    "Данные": "Data",

    // -- Названия секций --
    "Генератор": "Generator",
    "Слайдшоу": "Slideshow",
    "По времени суток": "By time of day",
    "По проекту": "By project",
    "Яркость набора": "Set brightness",
    "Картинка": "Image",
    "Эффекты": "Effects",
    "Диагностика": "Diagnostics",
    "Горячие клавиши": "Hotkeys",
    "Папка плагина": "Plugin folder",
    "Пресеты": "Presets",
    "Профили": "Profiles",
    "Поделиться": "Share",
    "Экспорт темы": "Theme export",
    "Язык / Language": "Language",
    "Производительность": "Performance",

    // -- Описания секций (info) --
    "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске.":
        "Choose a set of background images (editor / sidebar / panel). “random” picks a new set on each start.",
    "Создать согласованный набор из seed-строки или базового цвета (#rrggbb): тёмная подложка + акцент + гармоничный спутник. Один seed всегда даёт один и тот же набор — им можно делиться. Наборы сохраняются и добавляются в конец списка.":
        "Create a coherent set from a seed string or a base color (#rrggbb): dark backdrop + accent + a harmonious companion. The same seed always yields the same set — shareable. Sets are saved and appended to the list.",
    "Автоматическая смена набора по кругу через заданный интервал.":
        "Automatically cycles through sets on a timer.",
    "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».":
        "Day set by day, night set by night. Takes priority over the slideshow; does not run in “random” mode.",
    "Набор под открытый проект и полоска-индикатор git-ветки. Держатся на чтении заголовка и статусбара VS Code.":
        "A set per open project and a git-branch indicator strip. Both rely on reading the VS Code title and status bar.",
    "Насколько ярко проступают фоновые картинки в каждой зоне.":
        "How brightly the background images show through in each zone.",
    "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.":
        "Interface accent color and per-zone background image filters.",
    "Включение/выключение визуальных эффектов и их сила. Наведи на пункт — всплывёт пояснение. Поле поиска фильтрует тумблеры по названию, «только включённые» — прячет выключенные.":
        "Turn visual effects on/off and set their strength. Hover an item for a hint. The search field filters toggles by name; “only enabled” hides the disabled ones.",
    "Оформление интегрированного терминала: шрифт, лигатуры, свечение, курсор, выделение.":
        "Styling for the integrated terminal: font, ligatures, glow, cursor, selection.",
    "Проверка установки: что плагин видит о себе (версия, тема, набор, папка и загрузка картинок, активен ли custom-css). Отчёт копируется в буфер для issue. Загляни сюда, если фон не появился.":
        "Installation check: what the plugin sees about itself (version, theme, set, image folder and loading, whether custom-css is active). The report is copied to the clipboard for an issue. Look here if the background didn’t appear.",
    "Быстрые действия без открытия панели. Работают на любой раскладке (RU/EN).":
        "Quick actions without opening the panel. Work on any keyboard layout (RU/EN).",
    "Откуда брать картинки наборов. Меняй, если перенёс плагин и фон пропал. Пусто — путь определяется автоматически.":
        "Where to read set images from. Change it if you moved the plugin and the background vanished. Empty — the path is detected automatically.",
    "Сохранённые образы: весь вид под именем, переключение одним кликом.":
        "Saved looks: the whole appearance under a name, switch with one click.",
    "Короткий код всего образа для обмена: скопируй свой или примени чужой. Картинки и пути не входят.":
        "A short code of the whole look for sharing: copy yours or apply someone’s. Images and paths are not included.",
    "Собрать настоящую VS Code-тему (color-theme.json) из палитры активного набора: цвета интерфейса + подсветка синтаксиса. Работает там, где custom-фон недоступен. Как применить — в подсказке «?» рядом с кнопкой.":
        "Build a real VS Code theme (color-theme.json) from the active set’s palette: workbench colors + syntax highlighting. Works where the custom background isn’t available. See the “?” hint next to the button for how to apply it.",

    // -- Названия эффектов (FX_LIST) --
    "Ken Burns": "Ken Burns",
    "Стекло вкладок": "Glass tabs",
    "Виньетка": "Vignette",
    "Стекло панелей": "Glass panels",
    "Скрим кода": "Code scrim",
    "Стекло статусбара": "Glass status bar",
    "Активная строка": "Active line",
    "Контур группы": "Group ring",
    "Живой контур": "Living border",
    "Скроллбар": "Scrollbar",
    "Фон актив-бара": "Activity bar background",
    "Акцент вкладки": "Tab accent",
    "Скругления": "Rounded corners",
    "Свечение курсора": "Cursor glow",
    "Градиент выделения": "Selection gradient",
    "Титлбар": "Title bar",
    "Заставка": "Splash",
    "Часы": "Clock",
    "Частицы": "Particles",
    "Помидор": "Pomodoro",
    "Тускнеть при печати": "Dim while typing",
    "Тускнеть без фокуса": "Dim when unfocused",
    "Контур: 1 цвет": "Border: 1 color",
    "Палитра из картинки": "Palette from image",
    "Параллакс фона": "Background parallax",
    "Поток (глубокий дим)": "Flow (deep dim)",
    "Тускнеть неактивные": "Dim inactive",
    "Режим чтения": "Reading mode",
    "Стекло палитры": "Glass command palette",
    "Акцент поиска": "Find accent",
    "Миникарта сквозь": "See-through minimap",
    "Акцент отступов": "Indent accent",
    "Совпадения слова": "Word matches",
    "Стекло sticky": "Glass sticky scroll",
    "Aurora фон": "Aurora background",
    "Спотлайт": "Spotlight",
    "Пульс печати": "Typing pulse",
    "Тон акцентом": "Accent tint",
    "Читаемость кода": "Code legibility",
    "Реакция на ошибки": "Error reaction",
    "Режим Present": "Present mode",
    "Контраст+": "Contrast+",
    "Фокус-сессия": "Focus session",

    // -- Стили частиц (PART_STYLES) --
    "Точки": "Dots",
    "Звёзды": "Stars",
    "Снег": "Snow",
    "Сакура": "Sakura",
    "Пузыри": "Bubbles",
    "Светлячки": "Fireflies",
    "Дождь": "Rain",
    "Конфетти": "Confetti",
    "Сезон (авто)": "Season (auto)",

    // -- Параметры силы (PARAMS) --
    "Размытие стекла": "Glass blur",
    "Ken Burns масштаб": "Ken Burns scale",
    "Ken Burns сек": "Ken Burns sec",
    "Виньетка сила": "Vignette strength",
    "Частиц": "Particle count",
    "Помидор, мин": "Pomodoro, min",
    "Aurora сек": "Aurora sec",
    "Спот радиус": "Spotlight radius",
    "Тон сила": "Tint strength",

    // -- Кнопки / поля / прочее --
    "Сохранить": "Save",
    "Применить": "Apply",
    "Экспорт": "Export",
    "Импорт": "Import",
    "Сбросить к дефолту": "Reset to defaults",
    "Восстановить прежние настройки": "Restore previous settings",
    "Восстановить прежние настройки из резерва": "Restore previous settings from backup",
    "Проверить установку": "Check installation",
    "Скопировать код образа": "Copy look code",
    "↶ Отменить": "↶ Undo",
    "↷ Повторить": "↷ Redo",
    "только включённые": "only enabled",
    "Показывать только включённые эффекты": "Show only enabled effects",
    "Сила": "Strength",
    "Ничего не найдено": "Nothing found",
    "Ничего не найдено.": "Nothing found.",
    "Пресетов пока нет — сохрани текущий вид под именем.": "No presets yet — save the current look under a name.",
    "Поиск настроек…": "Search settings…",
    "Фильтр эффектов…": "Filter effects…",
    "Имя пресета": "Preset name",
    "Вставь код образа": "Paste look code",
    "Сохранить пресет": "Save preset",
    "Применить код образа": "Apply look code",

    // -- Горячие клавиши (описания) --
    "Открыть / закрыть панель": "Open / close panel",
    "Следующий набор": "Next set",
    "Предыдущий набор": "Previous set",
    "Фон и эффекты вкл / выкл": "Background & effects on / off",
    "Режим чтения вкл / выкл": "Reading mode on / off",
    "Отменить изменение вида": "Undo a look change",
    "Повторить отменённое": "Redo an undone change",

    // -- Тосты (boot.js / io.js) --
    "Фон включён": "Background on",
    "Фон выключен": "Background off",
    "Режим чтения включён": "Reading mode on",
    "Режим чтения выключен": "Reading mode off",
    "Введите имя пресета": "Enter a preset name",
    "Резерва нет": "No backup",
    "Восстановлены прежние настройки": "Previous settings restored",
    "Код не распознан": "Code not recognized",
    "Образ применён из кода": "Look applied from code",
    "Код образа скопирован в буфер": "Look code copied to clipboard",
    "Не удалось сформировать код": "Could not build the code",
    "Всё в порядке": "All good",
    "Всё в порядке · отчёт скопирован": "All good · report copied",
    "Есть проблемы · отчёт скопирован для issue": "Problems found · report copied for an issue",

    // -- Служебные фрагменты / метки --
    "Эффект: ": "Effect: ",
    "Включено: ": "Enabled: ",
    "Фон и эффекты включены": "Background & effects on",
    "Фон и эффекты выключены": "Background & effects off",
    "Включить": "Enable",
    "Стиль частиц": "Particle style",
    "Дневной": "Day",
    "Ночной": "Night",
    "Шрифт": "Font",
    "Курсор": "Cursor",
    "Выделение": "Selection",
    "Редактор": "Editor",
    "Сайдбар": "Sidebar",
    "Панель": "Panel",
    "Лигатуры": "Ligatures",
    "Свеч. курсора": "Cursor glow",
    "Свечение": "Glow",
    "Жирность": "Weight",
    "Кур. шир.": "Cur. width",
    "Кур. выс.": "Cur. height",
    "Интервал, мин": "Interval, min",
    "День с, ч": "Day from, h",
    "День до, ч": "Day to, h",
    "Папка (imgBase)": "Folder (imgBase)",

    // -- Тосты с именем (переводим фиксированные фрагменты; имя набора/пресета — как есть) --
    "Пресет «": "Preset ",
    "» сохранён": " saved",
    "» применён": " applied",
    "» удалён": " deleted",
    "Слишком много пресетов (макс. ": "Too many presets (max ",

    // -- Диагностика (ключи отчёта) --
    "MoonLight custom-bg — диагностика": "MoonLight custom-bg — diagnostics",
    "Версия": "Version",
    "Тема": "Theme",
    "Активный набор": "Active set",
    "Папка картинок": "Image folder",
    "Сетевые картинки": "Remote images",
    "Стиль в DOM": "Style in DOM",
    "Кнопка BG": "BG button",
    "Всего наборов": "Total sets",
    "Язык интерфейса": "UI language",
    "Чтение из DOM": "DOM reads",
    "да": "yes",
    "нет": "no",
    "разрешены": "allowed",
    "выключены": "off",
    "найден (custom-css активен)": "found (custom-css active)",
    "НЕ найден": "NOT found",
    "найдена": "found",
    "нет (статусбар ещё не готов?)": "no (status bar not ready yet?)",
    "нет (мастер-выключатель)": "no (master switch)",
    "редактор": "editor",
    "сайдбар": "sidebar",
    "панель": "panel",

    // -- Статусбар (кнопка BG + подсказка) --
    "Набор ": "Set ",
    "BG выкл": "BG off",
    "Фон и дизайн — настройки": "Background & design — settings",
    "Фон и дизайн — настройки (фон выключен, Ctrl+Alt+0 — включить)": "Background & design — settings (background off, Ctrl+Alt+0 to enable)",
    " · авто-набор по времени суток": " · auto set by time of day",
    " · слайдшоу вкл": " · slideshow on",
    " (набор: ": " (set: ",

    // -- Пресеты (aria / title) --
    "Удалить пресет": "Delete preset",
    "Применить пресет ": "Apply preset ",
    "Удалить пресет ": "Delete preset ",

    // -- Диагностика: составные ключи скрейпинга --
    "Картинка · ": "Image · ",
    "Чтение из DOM · ": "DOM read · ",
    "СБОЙ": "FAIL",
    "git-ветка": "git branch",
    "счётчик ошибок": "error count",
    "имя проекта": "project name",

    // -- Секция «Набор»: переименование / генератор --
    "Имя": "Name",
    "Сгенерировать": "Generate",
    "Создать набор из seed/цвета в поле": "Create a set from the seed/color in the field",
    "Случайный": "Random",
    "Случайный согласованный набор": "A random coherent set",
    "Убрать все сгенерированные наборы": "Remove all generated sets",
    "Seed или базовый цвет набора": "Seed or base color of the set",
    "Достигнут предел сгенерированных наборов (": "Reached the generated-sets limit (",
    "Не удалось создать набор": "Could not create the set",
    "Набор создан: ": "Set created: ",
    "Сгенерированные наборы убраны": "Generated sets removed",
    "Очистить (": "Clear (",

    // -- Секция «Картинка»: акцент + фильтры --
    "Акцент": "Accent",
    "Акцент HEX": "Accent HEX",
    "из картинки": "from image",
    "Взять акцент из фоновой картинки набора": "Take the accent from the set’s background image",
    "Акцент из картинки": "Accent from image",
    "Акцент из картинки: ": "Accent from image: ",
    "Не удалось взять цвет из картинки": "Could not take a color from the image",
    "Авто-яркость editor": "Auto-brightness (editor)",
    "Панель/терминал": "Panel/terminal",
    "Яркость": "Brightness",
    "Насыщенность": "Saturation",
    "Размытие": "Blur",
    "Зона": "Zone",
    "Вписывание": "Fit",
    "Заполнить (cover)": "Fill (cover)",
    "Целиком (contain)": "Contain",
    "Путь картинки": "Image path",

    // -- Папка / сеть / проект --
    "Папка": "Folder",
    "Разрешить сетевые картинки": "Allow remote images",
    "Полоска-индикатор ветки": "Branch indicator strip",
    "Проект: ": "Project: ",
    "Проект не определён — открыта ли папка?": "Project not detected — is a folder open?",
    "Закреплён набор ": "Pinned set ",
    "Забыть закрепление за проектом": "Forget the project pin",
    "Забыть закрепление набора за проектом": "Forget the set pin for this project",
    "Выбери набор выше — он закрепится за этим проектом.": "Pick a set above — it will be pinned to this project.",

    // -- Чипы наборов / слайдеры --
    "Двойной клик — сброс к значению по умолчанию": "Double-click — reset to default",
    "Не грузится: ": "Not loading: ",
    " (редактор · сайдбар · панель)": " (editor · sidebar · panel)",
    "Случайный набор": "Random set",

    // -- Онбординг / профили (улучшение 10) --
    "Быстрый старт": "Quick start",
    "Выбери готовый профиль — он настроит вид целиком. Потом всё можно поправить вручную.":
        "Pick a ready-made profile — it sets the whole look. You can fine-tune everything afterwards.",
    "Профиль": "Profile",
    "Применить профиль": "Apply profile",
    "Спокойный": "Calm",
    "Фокус": "Focus",
    "Презентация": "Presentation",
    "Минимал": "Minimal",
    "Максимум": "Maximum",
    "Ровный тёмный фон, мягкое стекло, без движения — читаемость на первом месте.":
        "Even dark background, soft glass, no motion — readability first.",
    "Гаснет всё лишнее, спотлайт у курсора, приглушение при печати — только код.":
        "Everything extra dims, a spotlight at the cursor, dim-on-type — code only.",
    "Крупные акценты, спокойный фон, скрыт визуальный шум — для стрима и скринкаста.":
        "Bold accents, calm background, visual noise hidden — for streams and screencasts.",
    "Почти ванильный VS Code: тонкий фон, без эффектов и частиц.":
        "Almost vanilla VS Code: a faint background, no effects or particles.",
    "Всё включено: живой фон, частицы, свечения — витрина возможностей.":
        "Everything on: living background, particles, glows — a showcase.",
    "Профиль применён: ": "Profile applied: ",
    "Показать при следующем запуске": "Show on next start",
    "Готовые профили вида: спокойный, фокус, презентация, минимал, максимум. Один клик настраивает фон и эффекты целиком — дальше можно править вручную.":
        "Ready-made look profiles: calm, focus, presentation, minimal, maximum. One click sets the background and effects entirely — then tweak by hand.",
    "MoonLight BG: открой панель кнопкой BG в статусбаре (Ctrl+Alt+B) и выбери профиль в «Система → Профили».":
        "MoonLight BG: open the panel from the BG button in the status bar (Ctrl+Alt+B) and pick a profile in “System → Profiles”.",

    // -- Производительность (улучшение 8) --
    "Авто-бюджет FPS": "Auto FPS budget",
    "Тяжёлые эффекты приглушаются при низком FPS": "Heavy effects dim when FPS drops",
    "Экономия ресурсов активна: часть эффектов приглушена": "Power-saving active: some effects dimmed",

    // -- Язык (улучшение 2) --
    "Язык панели": "Panel language",
    "Пояснение": "Info",

    // -- Синхронизация через settings.json (улучшение 5) --
    "Синхронизация": "Sync",
    "Через settings.json (едет с Settings Sync). Скопируй строку и вставь её в settings.json — вид перенесётся на другие машины. «Загрузить базу» подтянет синхронизированный образ сюда.":
        "Via settings.json (rides Settings Sync). Copy the line and paste it into settings.json — your look travels to other machines. “Load baseline” pulls the synced look here.",
    "Скопировать для settings.json": "Copy for settings.json",
    "Загрузить базу из settings.json": "Load baseline from settings.json",
    "Скопировано для settings.json": "Copied for settings.json",
    "Не удалось скопировать": "Could not copy",
    "Загружено из settings.json": "Loaded from settings.json",
    "Базовый конфиг из settings.json не найден (нужно расширение-компаньон)":
        "No baseline config from settings.json (companion extension required)",

    // -- Экспорт темы VS Code --
    "Экспорт VS Code-темы": "Export VS Code theme",
    "Тема соберётся из палитры активного набора: ": "The theme is built from the active set’s palette: ",
    "Тема «": "Theme ",
    "» сохранена в файл + в буфере": " saved to file + clipboard",
    "Тема сохранена в файл": "Theme saved to file",
    "Тема скопирована в буфер": "Theme copied to clipboard",
    "Не удалось выгрузить тему": "Could not export the theme",

    // -- Экспорт / импорт конфига (тосты) --
    "Экспорт: файл сохранён + в буфере обмена": "Export: file saved + on clipboard",
    "Экспорт: файл сохранён": "Export: file saved",
    "Экспорт: скопировано в буфер": "Export: copied to clipboard",
    "Не удалось выгрузить": "Could not export",
    "Файл слишком большой (>256 КБ)": "File too large (>256 KB)",
    "Импортировано. Заблокировано ": "Imported. Blocked ",
    " сетевых ссылок на картинки — редактор в сеть не пойдёт. Сетевые картинки остаются выключены; включи их вручную, только если доверяешь источнику.":
        " remote image links — the editor won’t go online. Remote images stay off; enable them manually only if you trust the source.",
    "Настройки импортированы": "Settings imported",
    "Ошибка: файл не читается как JSON": "Error: file can’t be read as JSON",
    "Не удалось прочитать файл": "Could not read the file",

    // -- История (Undo/Redo) тосты --
    "Нечего отменять": "Nothing to undo",
    "Отменено": "Undone",
    "Нечего повторить": "Nothing to redo",
    "Повторено": "Redone",

    // -- Помидор (виджет) --
    "Помидор: клик — старт/пауза, Alt+клик — сброс": "Pomodoro: click — start/pause, Alt+click — reset",
    "Помидор готов — перерыв!": "Pomodoro done — take a break!"
};
