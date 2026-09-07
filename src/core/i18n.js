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
    "По ветке": "By branch",
    "По языку": "By file type",
    "Библиотека": "Library",
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
    "Включение/выключение визуальных эффектов и их сила. Наведи на пункт — пояснение «?» и живой предпросмотр. Эффекты сгруппированы по смыслу; «только включённые» прячет выключенные. Конкретный эффект ищи полем поиска над вкладками.":
        "Turn visual effects on/off and set their strength. Hover an item for a “?” hint and a live preview. Effects are grouped by purpose; “only enabled” hides the disabled ones. Find a specific effect with the search field above the tabs.",
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
    "Живой фон": "Living background",
    "Анимации UI": "UI animations",
    "Акрил": "Acrylic",
    "Шлейф курсора": "Cursor trail",
    "Питомец": "Pet",
    "Статистика": "Stats",

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
    "Настроить": "Customize",
    "Настроить меню": "Customize menu",
    "Настроить меню: показать кнопки «скрыть» у секций и эффектов": "Customize the menu: show “hide” buttons on sections and effects",
    "скрыть": "hide",
    "показать": "show",
    "Скрыть секцию": "Hide section",
    "Настройка меню": "Menu setup",
    "Показать/скрыть секции и эффекты панели, чтобы меню не разрасталось. Сними галочку — пункт исчезнет из панели (настройки не теряются), «Показать всё» вернёт всё. Быстро скрыть прямо в панели — кнопка «Настроить» в шапке.":
        "Show/hide panel sections and effects so the menu doesn’t grow out of hand. Uncheck an item and it disappears from the panel (settings are kept); “Show all” brings everything back. To hide something right in the panel, use the “Customize” button in the header.",
    "Секции": "Sections",
    "Эффекты в сетке": "Effects in the grid",
    "Показать всё": "Show all",
    "Показать все секции и эффекты": "Show all sections and effects",
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
    "да": "yes",
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
    "Контраст к фону: ": "Contrast to background: ",
    "AA (крупный)": "AA (large)",
    "низкий": "low",
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

    // -- Фон по ветке / по языку --
    "Набор под текущую git-ветку: main/master — один, фиче-ветки — другой. Приоритетнее слайдшоу и времени суток, но уступает «по проекту». Ветка читается из статусбара VS Code.":
        "A set per current git branch: main/master one, feature branches another. Takes priority over the slideshow and time of day, but yields to “by project”. The branch is read from the VS Code status bar.",
    "Набор под язык активного файла (по расширению): напр. .py — один набор, .md — другой. Самый частый контекст (низший приоритет). Расширение читается из подписи активной вкладки.":
        "A set per active file language (by extension): e.g. .py one set, .md another. The most frequent context (lowest priority). The extension is read from the active tab label.",
    "Фон по ветке": "Background by branch",
    "Фон по языку файла": "Background by file type",
    "Ветка: ": "Branch: ",
    "Ветка не определена — открыт ли git-репозиторий?": "Branch not detected — is a git repository open?",
    "Расширение: .": "Extension: .",
    "Файл не определён — открыт ли редактор?": "File not detected — is an editor open?",
    "Набор для ветки": "Set for branch",
    "Набор для расширения": "Set for extension",
    "Границы дня": "Day bounds",
    "По часам": "Fixed hours",
    "Рассвет/закат": "Sunrise/sunset",
    "Широта": "Latitude",
    "Долгота": "Longitude",
    "Свои картинки списком: когда «Крутить библиотеку» включено, они по очереди показываются в редакторе и сменяются по таймеру слайдшоу (интервал — выше). Пути локальные: file:/// или vscode-file://.":
        "Your own images as a list: with “Cycle the library” on, they show one by one in the editor, switching on the slideshow timer (interval above). Local paths only: file:/// or vscode-file://.",
    "Крутить библиотеку в редакторе": "Cycle the library in the editor",
    "Добавить": "Add",
    "Удалить": "Delete",
    "Слишком много картинок (макс. 64)": "Too many images (max 64)",
    "Список пуст — добавь пути к своим картинкам.": "The list is empty — add paths to your images.",
    "Витрина": "Showcase",
    "После нескольких минут простоя показывает крупные часы, дату и имя набора поверх экрана; любое действие возвращает редактор. Удобно для стрима и «настроения» рабочего стола.":
        "After a few idle minutes it shows a large clock, date and the set name over the screen; any action brings the editor back. Nice for streaming and desk ambiance.",
    "Простой, мин": "Idle, min",
    "Любое действие — вернуться": "Any action returns",
    "Сводка текущей сессии: время, тронутые файлы, нажатия, суммарное время в потоке и лучший стрик непрерывной печати. Копится, пока включён тумблер «Статистика» (вкладка «Вид» → «Эффекты»). Данные живут только в этой сессии.":
        "A summary of the current session: time, files touched, keystrokes, total time in flow and the best continuous-typing streak. Collected while the “Stats” toggle is on (View → Effects). The data lives only in this session.",
    "Статистика сессии": "Session stats",
    "В сессии": "Session",
    "Нажатий": "Keystrokes",
    "Файлов": "Files",
    "В потоке": "In flow",
    "Лучший стрик": "Best streak",
    "Сбросить статистику": "Reset stats",

    // -- Чипы наборов / слайдеры --
    "Двойной клик — сброс к значению по умолчанию": "Double-click — reset to default",
    "Не грузится: ": "Not loading: ",
    " (редактор · сайдбар · панель)": " (editor · sidebar · panel)",
    "Случайный набор": "Random set",

    // -- Онбординг / профили --
    "Выбери готовый профиль — он настроит вид целиком. Потом всё можно поправить вручную.":
        "Pick a ready-made profile — it sets the whole look. You can fine-tune everything afterwards.",
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
    "Готовые профили вида: спокойный, фокус, презентация, минимал, максимум. Один клик настраивает фон и эффекты целиком — дальше можно править вручную.":
        "Ready-made look profiles: calm, focus, presentation, minimal, maximum. One click sets the background and effects entirely — then tweak by hand.",
    "MoonLight BG: открой панель кнопкой BG в статусбаре (Ctrl+Alt+B). Быстрый старт — «Данные → Профили»; правый клик по кнопке BG — быстрые действия.":
        "MoonLight BG: open the panel from the BG button in the status bar (Ctrl+Alt+B). Quick start — “Data → Profiles”; right-click the BG button for quick actions.",

    // -- Производительность --
    "Авто-бюджет FPS": "Auto FPS budget",
    "Экономия ресурсов активна: часть эффектов приглушена": "Power-saving active: some effects dimmed",

    // -- Язык --
    "Язык панели": "Panel language",
    "Пояснение": "Info",

    // -- Синхронизация через settings.json --
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
    "Помидор готов — перерыв!": "Pomodoro done — take a break!",

    // -- v22: избранное / группы эффектов / бейджи / сброс / быстрое меню --
    // Избранное + настройка меню
    "★ Избранное": "★ Favorites",
    "В избранное": "Add to favorites",
    "Убрать из избранного": "Remove from favorites",
    "Перейти к секции": "Go to section",
    "Показать секцию": "Show section",
    "Категории настроек": "Setting categories",
    "Отметь звёздочкой секции и эффекты в режиме «Настроить» — они появятся здесь для быстрого доступа.":
        "Star sections and effects in “Customize” mode — they’ll appear here for quick access.",
    "Галочка — показывать пункт в панели; звёздочка — закрепить его в «Избранное» вверху. Снятая галочка ничего не теряет — пункт вернётся, если поставить её снова.":
        "Checkbox — show the item in the panel; star — pin it to “Favorites” at the top. Unchecking loses nothing — the item returns when you check it again.",
    // Группы эффектов (FX_GROUP_ORDER)
    "Стекло и поверхности": "Glass & surfaces",
    "Код и подсветка": "Code & syntax",
    "Движение и фон": "Motion & background",
    "Фокус и чтение": "Focus & reading",
    "Окружение и статус": "Ambient & status",
    "Интерфейс": "Interface",
    "Приятное": "Delight",
    "Прочее": "Other",
    // «Изменено» / сброс
    "Отличается от значения по умолчанию": "Differs from the default",
    "Сбросить к значению по умолчанию": "Reset to default",
    "Сбросить эффекты к дефолту": "Reset effects to defaults",
    "Эффекты сброшены к значениям по умолчанию": "Effects reset to defaults",
    // Глубокий поиск: подписи каталога контролов
    "Яркость: редактор": "Brightness: editor",
    "Яркость: сайдбар": "Brightness: sidebar",
    "Яркость: панель": "Brightness: panel",
    "Авто-яркость": "Auto-brightness",
    "Акцентный цвет": "Accent color",
    "Безопасные акценты": "Safe accents",
    "Фильтры картинки": "Image filters",
    "Сила эффектов": "Effect strength",
    "Сброс эффектов": "Reset effects",
    "Шрифт терминала": "Terminal font",
    "Курсор терминала": "Terminal cursor",
    "Выделение терминала": "Terminal selection",
    "Свечение терминала": "Terminal glow",
    "Интервал слайдшоу": "Slideshow interval",
    "Экспорт настроек": "Export settings",
    "Импорт настроек": "Import settings",
    "Отменить / Повторить": "Undo / Redo",
    // Активный профиль
    "(сейчас: изменён вручную)": "(now: edited manually)",
    "✓ активен": "✓ active",
    "активен": "active",
    // Быстрое меню по правому клику
    "Выключить фон и эффекты": "Turn background & effects off",
    "Включить фон и эффекты": "Turn background & effects on",
    "Выключить режим чтения": "Turn reading mode off",
    "Включить режим чтения": "Turn reading mode on",
    "Открыть панель…": "Open panel…",
    "Режим чтения выключен": "Reading mode off",

    // -- v22.1: индикатор производительности / ресайз панели --
    "Авто-бюджет FPS выключен — эффекты не приглушаются": "Auto FPS budget off — effects aren’t dimmed",
    "FPS не измеряется (нет тяжёлых эффектов)": "FPS not measured (no heavy effects)",
    "Производительность: ~": "Performance: ~",
    " FPS · эконом-режим: ": " FPS · power-saving: ",
    "вкл": "on",
    "выкл": "off",
    "Потянуть — ширина панели": "Drag — panel width",
    "Адаптивный скрим": "Adaptive scrim",
    "Настоящая прозрачность": "True transparency",
    "худший участок": "worst spot",
    "— норма": "— fine",
    "Исправить": "Fix",
    "Подобрать прозрачность фона ради читаемости кода": "Pick a background opacity that keeps code readable",
    "Читаемость: нет данных (картинка ещё грузится)": "Readability: no data yet (image still loading)",
    "Не удалось измерить читаемость": "Could not measure readability",
    "Прозрачность фона редактора для этого набора": "Editor background opacity for this set",
    "(ниже 4.5 — фон мешает читать)": "(below 4.5 — the background hurts reading)",
    "Загрузчик": "Loader",
    "определено косвенно": "detected indirectly",
    "Окно создано прозрачным — эффект «Настоящая прозрачность» покажет рабочий стол сквозь редактор.": "The window is transparent — the “True transparency” effect will show the desktop through the editor.",
    "Окно непрозрачное. Настоящее стекло умеет только Custom UI Style: скопируй опции ниже в settings.json и перезапусти редактор.": "The window is opaque. Only Custom UI Style can do real glass: copy the options below into settings.json and restart the editor.",
    "Скопировать импорт": "Copy import",
    "Скопировать опции прозрачности": "Copy transparency options",
    "Скопировано в буфер — вставь в settings.json": "Copied — paste it into settings.json",
    "Скопировано в буфер — вставь в settings.json и перезапусти редактор": "Copied — paste into settings.json and restart the editor",
    "Селекторы вёрстки": "Workbench selectors",
    "Обязательные элементы вёрстки не найдены — скорее всего, обновление VS Code изменило разметку. Часть оформления не применится. Приложи этот отчёт к issue.": "Required workbench elements were not found — a VS Code update most likely changed the markup, so part of the styling will not apply. Attach this report to an issue.",
    "Не найдено (норма, если элемент скрыт): ": "Not found (normal when the element is hidden): ",
    "Быстрый переключатель": "Quick switcher",
    "Набор, эффект или команда…": "Set, effect or command…",
    "эффект": "effect",
    "команда": "command",
    "шейдер": "shader",
    "процедурный": "procedural",
    "градиент": "gradient",
    "фото": "photo",
    "Открыть панель": "Open panel",
    "Свой GLSL-шейдер": "Custom GLSL shader",
    "Применить шейдер": "Apply shader",
    "Очистить": "Clear",
    "Шейдер применён": "Shader applied",
    "Шейдер сброшен на встроенный": "Shader reset to the built-in one",
    "Тело фрагментного шейдера: функция vec3 render(vec2 p). Доступны u_time, u_res, u_accent, u_base, u_mouse. Выбери набор «Свой шейдер», чтобы увидеть результат.": "Fragment shader body: a vec3 render(vec2 p) function. u_time, u_res, u_accent, u_base and u_mouse are available. Pick the “Custom shader” set to see the result.",
    "Быстрый переключатель (наборы, эффекты, команды)": "Quick switcher (sets, effects, commands)",
    "Нужен эффект: ": "Requires effect: ",
    "Ползунки силы появятся, когда включишь эффекты, к которым они относятся.": "Strength sliders appear once you enable the effects they belong to.",
    "Шейдер рисуется только в наборе «Свой шейдер» — сейчас выбран другой.": "The shader is drawn only in the “Custom shader” set — another set is active right now.",
    "Выбрать": "Switch",
    "Выбрать набор «Свой шейдер»": "Switch to the “Custom shader” set",
    "Читаемость: фон выключен": "Readability: background is off",
    "Данные редактора": "Editor data",
    "хост расширений": "extension host",
    "DOM (компаньон не подключён)": "DOM (companion not connected)",
    "DOM (данные ещё не пришли)": "DOM (no data yet)",
    "Живые данные": "Live data",
    "ветка": "branch",
    "репозиторий": "repository",
    "язык": "language",
    "ошибок": "errors",
    "Фон по репозиторию": "Background per repository",
    "Репозиторий: ": "Repository: ",
    "Репозиторий не определён — нужен компаньон и git-remote": "Repository unknown — needs the companion and a git remote",
    "Набор для репо": "Set for repo"
};
