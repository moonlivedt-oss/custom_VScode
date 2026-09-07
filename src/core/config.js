

// ===== Дефолты =====
// CFG_VERSION — версия схемы конфига. Растёт, когда меняется структура DEFAULTS так,
// что старый сохранённый конфиг нужно осознанно доработать (см. migrateCfg).
var CFG_VERSION = 1;
// APP_VERSION — отображаемая версия релиза (единый номер v14, v15, …), она же в package.json.
// Держим здесь одной строкой, чтобы баннер в консоли (boot.js) и диагностика (io.js) брали
// её из одного места, а не хардкодили порознь. При релизе меняется тут + в package.json.
var APP_VERSION = "v20";
var DEFAULTS = {
    version: CFG_VERSION,
    enabled: true,                                      // мастер-выключатель: false — фон и эффекты выключены, настройки сохранены
    lang: "auto",                                       // язык интерфейса панели: "auto" (по языку VS Code) | "ru" | "en"
    perfGuard: true,                                    // авто-бюджет производительности: при низком FPS приглушать тяжёлые эффекты
    imgBase: "",                                      // папка плагина для картинок; пусто — авто-определение (IMG). Переносимость без правки кода.
    allowRemoteImages: false,                           // разрешить http(s)-картинки. По умолчанию выкл: чужой конфиг не заставит редактор ходить в сеть.
    mode: "0",
    baseOp: { editor: 0.06, side: 0.30, panel: 0.11 },
    setOp: {},
    accent: DEFAULT_ACCENT,                             // глобальный акцент (запасной, если у набора нет своего)
    autoWorkspace: false,                               // фон по проекту: набор выбирается по имени открытой папки
    workspaceSets: {},                                  // закреплённые наборы по проектам: { "имя папки": "индекс" }
    autoBranch: false,                                  // фон по git-ветке: набор выбирается по имени текущей ветки
    branchSets: {},                                     // закреплённые наборы по веткам: { "имя ветки": "индекс" }
    autoRemote: false,                                  // фон по удалённому репозиторию (владелец/имя) — нужны живые данные компаньона
    remoteSets: {},                                     // закреплённые наборы по репозиториям: { "owner/repo": "индекс" }
    autoLang: false,                                    // фон по языку/расширению активного файла
    langSets: {},                                       // закреплённые наборы по расширениям: { "js": "индекс", "py": "индекс" }
    ambientBranch: false,                               // тонкая полоска-индикатор ветки git (main -> красная, фича -> зелёная)
    setAccent: {},                                      // переопределение акцента конкретного набора: { idx: "#rrggbb" }
    setName: {},                                        // пользовательское имя набора: { idx: "строка" }
    setImg: {},                                         // свои картинки набора по зонам: { idx: { editor?, sidebar?, panel? } }
    genSets: [],                                        // сгенерированные наборы (по seed/палитре): дозагружаются в хвост SETS
    shaderSrc: "",                                      // свой GLSL для шейдерного набора «Свой шейдер»; пусто — встроенный

    autoDim: true,                                      // авто-занижение яркости editor под светлые картинки (читаемость кода)
    fit: { editor: "cover", side: "cover", panel: "cover" }, // вписывание фоновой картинки по зонам: cover | contain
    // фильтры самой фоновой картинки — отдельно по зонам (редактор / сайдбар / панель)
    imgfx: {
        editor: { brightness: 1.0, saturate: 1.0, blur: 0 },
        side:   { brightness: 1.0, saturate: 1.0, blur: 0 },
        panel:  { brightness: 1.0, saturate: 1.0, blur: 0 }
    },
    slideshow: { on: false, min: 15 },                  // авто-смена набора по таймеру
    library: [],                                        // своя библиотека картинок (локальные пути) для слайдшоу в редакторе
    librarySlideshow: false,                            // крутить картинки из library в зоне редактора по таймеру слайдшоу
    screensaver: { on: false, min: 5 },                 // витрина/скринсейвер при простое: часы + набор поверх экрана
    // авто-набор по времени суток: днём — свой набор, ночью — свой. Границы дня настраиваются
    // (from/to, часы 0–23); поддерживается «через полночь» (to < from). mode: "hours" — по
    // фиксированным часам; "sun" — по реальному рассвету/закату для координат lat/lon (без сети,
    // считается локально из даты; при "sun" from/to игнорируются). lat/lon — широта/долгота.
    autoTime: { on: false, day: 0, night: 4, from: 8, to: 20, mode: "hours", lat: 0, lon: 0 },
    fxp: { blur: 8, kbScale: 1.08, kbSpeed: 60, vignette: 0.32, partCount: 40, pomoMin: 25, auroraSpeed: 24, spotRadius: 320, tintStrength: 0.18 },
    fx: {
        kenburns: true, glassTabs: true, vignette: true, glassSide: true,
        scrim: true, glassStatus: true, activeLine: true, groupRing: true,
        scrollbar: true, activityBg: true, tabAccent: true, rounded: true,
        cursorGlow: true, selection: true, splash: true,
        groupBorder: true, titlebar: true, clock: true, particles: true, pomodoro: false,
        dimOnType: false,                               // приглушать фон редактора, пока идёт набор текста
        dimOnBlur: false,                               // приглушать фон, когда окно VS Code теряет фокус
        groupBorderMono: false,                         // «Живой контур» одним акцентом (false — радужный перелив)
        paletteSync: false,                             // «живой контур» из палитры фоновой картинки, а не радужный
        parallax: false,                                // фон редактора чуть смещается за курсором (глубина)
        flow: false,                                    // «поток»: при долгом наборе фон плавно уходит сильнее
        // v16: новая пачка эффектов. Тонкие акцентные (findAccent/indentAccent/selectionMatch/
        // stickyGlass/glassCommand) включены по умолчанию — они лишь докрашивают уже видимые
        // элементы под палитру набора и совпадают по духу с уже включённым «стеклом». Заметно
        // меняющие поведение (dimInactive/minimapFade/reading) — по умолчанию выкл (opt-in).
        dimInactive: false,                             // тусклее неактивные группы редактора (фокус на активной)
        reading: false,                                 // режим чтения: фон редактора почти гаснет ради читаемости кода
        glassCommand: true,                             // матовое стекло палитры команд/автодополнения/подсказок
        findAccent: true,                               // акцент для виджета поиска/замены и подсветки совпадений
        minimapFade: false,                             // миникарта полупрозрачная (фон просвечивает сквозь неё)
        indentAccent: true,                             // акцент активной направляющей отступа и парной скобки
        selectionMatch: true,                           // подсветка совпадений выделенного слова акцентом
        stickyGlass: true,                              // матовое стекло закреплённой прокрутки (sticky scroll)
        // v18: живой фон + курсорные эффекты. Все три по умолчанию ВЫКЛ (opt-in): заметно
        // меняют вид/движение и стоят кадров (aurora/typingPulse — CSS-анимации, spotlight —
        // перерисовка полноэкранного градиента за курсором), поэтому включаются осознанно.
        aurora: false,                                  // «полярное сияние»: анимированный градиент-акцент за кодом
        spotlight: false,                               // радиальное затемнение вокруг курсора (фокус на месте правки)
        typingPulse: false,                             // активная вкладка мягко пульсирует акцентом, пока идёт набор
        // v19: тон/читаемость/реакция на ошибки. Все opt-in (заметно меняют вид или стоят
        // чтения DOM). tint — полноэкранная тонировка воркбенча в акцент (duotone); legible —
        // мягкая тень глифов кода для читаемости поверх картинки (НЕ трогает метрики Monaco,
        // поэтому курсор не сдвигается); errorReact — мягкая красная реакция при ошибках в коде.
        tint: false,                                    // тонировать весь воркбенч акцентом (mix-blend overlay)
        legible: false,                                 // тень глифов кода ради читаемости над фоном (без сдвига курсора)
        errorReact: false,                              // мягкая красная подсветка статусбара, когда в коде есть ошибки
        // v20: сценарии/доступность. present — «презентационный» режим (стрим/скринкаст/курс):
        // прячет визуальный шум (хлебные крошки, миникарта, экшены редактора) и крупнее/ярче
        // подаёт акценты. highContrast — a11y: плотная тень под кодом и подписями панелей +
        // толще фокус-обводка ради читаемости поверх картинки. Оба opt-in.
        present: false,                                 // режим Present: спокойный фон, крупнее акценты, скрыть шум
        highContrast: false,                            // контраст+: усиленная читаемость текста и фокуса (a11y)
        // Фокус-сессия: модификатор «Помидора». Пока идёт таймер (body.mlbg-focus), гасит
        // отвлекающее — неактивные группы/вкладки, миникарту, хлебные крошки — и приглушает
        // сайдбар/актив-бар/панель, чтобы взгляд держался на активном редакторе. Работает
        // ТОЛЬКО при включённом и запущенном «Помидоре»; на паузе/по завершении фокус спадает.
        focusSession: false,                            // затемнить всё, кроме активного файла, на время сессии
        // v21: «живой» фон + анимации интерфейса + акрил. Все opt-in (движение/размытие стоят
        // кадров или заметно меняют вид). liveBg — медленный пан фоновых градиентных/процедурных
        // зон (для фото-наборов уже есть Ken Burns/параллакс). uiAnim — плавные появления палитры
        // команд/подсказок, переходы вкладок/списков/тостов. acrylic — усиленное «матовое стекло»
        // на весь воркбенч (эстетика Acrylic/Mica; настоящая прозрачность до рабочего стола —
        // только через отдельное расширение vibrancy, см. подсказку).
        liveBg: false,                                  // «живой фон»: медленный пан градиентных/процедурных наборов
        uiAnim: false,                                  // анимации интерфейса: появление палитры/подсказок, вкладки, списки, тосты
        acrylic: false,                                 // акрил: усиленное матовое стекло на весь воркбенч
        cursorTrail: false,                             // шлейф курсора: тающий след за указателем мыши (canvas, v21)
        pet: false,                                     // питомец-компаньон: канвас-маскот в углу, реагирует на печать/ошибки
        stats: false,                                   // статистика сессии в статусбаре: время, файлы, нажатия, стрик потока
        // v20: движок читаемости и настоящая прозрачность.
        // autoRead — адаптивный скрим: фон гасится ТОЧЕЧНО в тех местах кадра, где он
        // светлее комфортного порога (карта яркости 8x8 из probeImage), а не целиком
        // ползунком. Включён по умолчанию: он только улучшает читаемость и почти ничего
        // не стоит (несколько CSS-градиентов, считается один раз на картинку).
        autoRead: true,
        // trueGlass — настоящая прозрачность до рабочего стола (Mica/Acrylic). Работает
        // только когда окно VS Code создано прозрачным (загрузчик custom-ui-style с
        // опциями Electron, см. панель «Стекло → Настоящая прозрачность»). Без этого
        // включение даст просто более прозрачные поверхности внутри окна. Opt-in.
        trueGlass: false
    },
    // Стиль летящих частиц (fx.particles). Категориальный (не числовой) — санитизируется
    // по белому списку PART_STYLES. dots — прежнее поведение (кружки), остальные меняют
    // форму/направление отрисовки в loopParticles (см. widgets/extras.js).
    partStyle: "dots",
    // Только совместимые по метрикам Nerd-шрифты, чтобы не ломать выравнивание терминала
    term: {
        font: "JetBrainsMono NF", ligatures: true, glow: 2, weight: 400,
        cursorGlow: true, cursorColor: "#f5e0dc", selColor: "#585b70",
        cursorSize: 1,                                  // ширина курсора (scaleX): 0 — скрыть, 1 — обычный, до 2.5
        cursorHeight: 1                                 // высота курсора (scaleY): 1 — обычная, до 2.5
    },
    // ui.hidden — скрытые секции панели (ключ — русский заголовок секции, как в collapsed);
    // ui.hiddenFx — скрытые эффекты в сетке «Эффекты» (ключ — key из FX_LIST). Настраивается в
    // «Система → Настройка меню» и кнопкой «скрыть» в режиме редактирования меню.
    // ui.favSec / ui.favFx — «Избранное»: закреплённые наверх панели секции и
    // эффекты (ключ — тот же, что у hidden/hiddenFx). Закрепить/открепить — звёздочкой в режиме
    // «Настроить». Зеркально к hidden: hidden прячет пункт, fav — поднимает его в блок «Избранное».
    // ui.width — ширина панели в px (перетаскивается за левый край); null — дефолт 380.
    ui: { collapsed: {}, hidden: {}, hiddenFx: {}, favSec: {}, favFx: {}, posX: null, posY: null, width: null, tab: 0 } // tab — активная вкладка панели (Набор/Вид/Терминал/Система/Данные)
};

var TERM_FONTS = [
    "JetBrainsMono NF", "JetBrainsMono NFM", "JetBrainsMono NFP",
    "JetBrainsMonoNL NF", "JetBrainsMonoNL NFM", "JetBrains Mono"
];

var FX_LIST = [
    ["kenburns", "Ken Burns"], ["glassTabs", "Стекло вкладок"],
    ["vignette", "Виньетка"], ["glassSide", "Стекло панелей"],
    ["scrim", "Скрим кода"], ["glassStatus", "Стекло статусбара"],
    ["activeLine", "Активная строка"], ["groupRing", "Контур группы"],
    ["groupBorder", "Живой контур"], ["scrollbar", "Скроллбар"],
    ["activityBg", "Фон актив-бара"], ["tabAccent", "Акцент вкладки"],
    ["rounded", "Скругления"], ["cursorGlow", "Свечение курсора"],
    ["selection", "Градиент выделения"], ["titlebar", "Титлбар"],
    ["splash", "Заставка"], ["clock", "Часы"],
    ["particles", "Частицы"], ["pomodoro", "Помидор"],
    ["dimOnType", "Тускнеть при печати"], ["dimOnBlur", "Тускнеть без фокуса"],
    ["groupBorderMono", "Контур: 1 цвет"], ["paletteSync", "Палитра из картинки"],
    ["parallax", "Параллакс фона"], ["flow", "Поток (глубокий дим)"],
    ["dimInactive", "Тускнеть неактивные"], ["reading", "Режим чтения"],
    ["glassCommand", "Стекло палитры"], ["findAccent", "Акцент поиска"],
    ["minimapFade", "Миникарта сквозь"], ["indentAccent", "Акцент отступов"],
    ["selectionMatch", "Совпадения слова"], ["stickyGlass", "Стекло sticky"],
    ["aurora", "Aurora фон"], ["spotlight", "Спотлайт"], ["typingPulse", "Пульс печати"],
    ["tint", "Тон акцентом"], ["legible", "Читаемость кода"], ["errorReact", "Реакция на ошибки"],
    ["present", "Режим Present"], ["highContrast", "Контраст+"],
    ["focusSession", "Фокус-сессия"],
    ["liveBg", "Живой фон"], ["uiAnim", "Анимации UI"], ["acrylic", "Акрил"],
    ["cursorTrail", "Шлейф курсора"], ["pet", "Питомец"], ["stats", "Статистика"],
    ["autoRead", "Адаптивный скрим"], ["trueGlass", "Настоящая прозрачность"]
];

// ===== Группировка эффектов по смыслу =====
// Сетка «Эффекты» разрослась до полусотни тумблеров — плоский список читается как стена.
// Раскладываем эффекты по категориям-подзаголовкам: порядок групп — FX_GROUP_ORDER, а
// принадлежность каждого эффекта — FX_GROUPS[key]. Это ЧИСТО презентационная раскладка
// панели (в конфиг не сохраняется). Линтер смоука проверяет, что у каждого эффекта из
// FX_LIST есть группа, а каждая группа из FX_GROUP_ORDER непуста, — чтобы при добавлении
// нового эффекта его нельзя было забыть отнести к категории (иначе он «утёк» бы в «Прочее»).
var FX_GROUP_ORDER = [
    ["glass",   "Стекло и поверхности"],
    ["code",    "Код и подсветка"],
    ["motion",  "Движение и фон"],
    ["focus",   "Фокус и чтение"],
    ["ambient", "Окружение и статус"],
    ["ui",      "Интерфейс"],
    ["fun",     "Приятное"]
];
var FX_GROUPS = {
    kenburns: "motion", glassTabs: "glass", vignette: "focus", glassSide: "glass", scrim: "focus",
    glassStatus: "glass", activeLine: "code", groupRing: "code", groupBorder: "code", scrollbar: "glass",
    activityBg: "glass", tabAccent: "code", rounded: "glass", cursorGlow: "code", selection: "code",
    titlebar: "glass", splash: "fun", clock: "ambient", particles: "motion", pomodoro: "ambient",
    dimOnType: "focus", dimOnBlur: "focus", groupBorderMono: "code", paletteSync: "code", parallax: "motion",
    flow: "focus", dimInactive: "focus", reading: "focus", glassCommand: "glass", findAccent: "code",
    minimapFade: "focus", indentAccent: "code", selectionMatch: "code", stickyGlass: "glass", aurora: "motion",
    spotlight: "focus", typingPulse: "motion", tint: "ui", legible: "focus", errorReact: "ambient",
    present: "focus", highContrast: "focus", focusSession: "focus", liveBg: "motion", uiAnim: "ui",
    acrylic: "glass", cursorTrail: "motion", pet: "fun", stats: "ambient",
    autoRead: "focus", trueGlass: "glass"
};

// Эффект, который без другого эффекта ничего не делает. Показываем такой пункт приглушённым
// и с подсказкой, вместо того чтобы дать включить тумблер «в никуда».
// Подпись эффекта по ключу (для сообщений вида «нужен эффект: Живой контур»).
function fxLabel(key) {
    for (var i = 0; i < FX_LIST.length; i++) if (FX_LIST[i][0] === key) return FX_LIST[i][1];
    return key;
}
var FX_REQUIRES = {
    groupBorderMono: "groupBorder",  // «контур одним цветом» — вариант живого контура
    focusSession: "pomodoro"         // фокус-сессия идёт по таймеру помидора
};
// Какой параметр «силы» имеет смысл только при включённых эффектах. Пустая запись — параметр
// нужен всегда. Ключи внутри массива объединяются по ИЛИ: размытие стекла важно, если включено
// хоть одно матовое стекло.
var PARAM_REQUIRES = {
    blur: ["glassTabs", "glassSide", "glassStatus", "glassCommand", "stickyGlass", "acrylic", "trueGlass"],
    kbScale: ["kenburns"],
    kbSpeed: ["kenburns"],
    vignette: ["vignette"],
    partCount: ["particles"],
    pomoMin: ["pomodoro"],
    auroraSpeed: ["aurora"],
    spotRadius: ["spotlight"],
    tintStrength: ["tint"]
};
// Влияет ли переключение эффекта на СОСТАВ панели (появится/исчезнет ползунок силы или
// изменится доступность пункта-надстройки). Если да — панель пересобирается после клика.
function fxAffectsPanel(key) {
    var k;
    for (k in PARAM_REQUIRES) {
        if (PARAM_REQUIRES[k].indexOf(key) >= 0) return true;
    }
    for (k in FX_REQUIRES) {
        if (FX_REQUIRES[k] === key) return true;
    }
    return key === "particles"; // стиль частиц показывается только при включённых частицах
}
// Нужен ли сейчас параметр силы: хотя бы один из эффектов-владельцев включён.
function paramNeeded(key) {
    var req = PARAM_REQUIRES[key];
    if (!req) return true;
    for (var i = 0; i < req.length; i++) if (cfg.fx[req[i]]) return true;
    return false;
}

// Стили частиц (fx.particles): ключ + подпись. dots — прежние кружки; stars — искры-звёздочки;
// snow — падающие светлые снежинки; sakura — падающие лепестки (цвет акцента); bubbles — контуры-пузыри;
// firefly — всплывающие «светлячки» с пульсацией яркости; rain — падающие полосы-струи;
// confetti — падающие вращающиеся прямоугольники в трёх цветах палитры (acc + два спутника).
// seasonal — не отдельная форма, а АВТО-выбор по времени года: зима — снег, весна — сакура,
// лето — светлячки, осень — дождь (разрешается в конкретный стиль в seasonStyle/partStyleNow).
var PART_STYLES = [
    ["dots", "Точки"], ["stars", "Звёзды"], ["snow", "Снег"], ["sakura", "Сакура"], ["bubbles", "Пузыри"],
    ["firefly", "Светлячки"], ["rain", "Дождь"], ["confetti", "Конфетти"], ["seasonal", "Сезон (авто)"]
];
function safePartStyle(s) {
    for (var i = 0; i < PART_STYLES.length; i++) if (PART_STYLES[i][0] === s) return s;
    return "dots";
}

// ===== Профили быстрого старта (улучшение 10: онбординг) =====
// Готовые «образы» вида одним кликом. patch накладывается ПОВЕРХ текущего конфига (см.
// applyProfile в io.js): трогаем только внешний вид (fx/fxp/baseOp/partStyle/enabled), а
// выбранный набор, картинки, привязки к проектам и язык остаются. Имена/описания — русские
// ключи, переводятся через t(). Задача — дать новичку 5 осмысленных пресетов вместо стены
// из четырёх десятков тумблеров. Ключи fx строго из DEFAULTS.fx (линтер смоука это проверяет).
var PROFILES = [
    {
        id: "calm", name: "Спокойный",
        desc: "Ровный тёмный фон, мягкое стекло, без движения — читаемость на первом месте.",
        patch: {
            enabled: true, partStyle: "dots", baseOp: { editor: 0.05, side: 0.26, panel: 0.10 },
            fx: {
                kenburns: false, particles: false, aurora: false, spotlight: false, parallax: false,
                typingPulse: false, flow: false, tint: false, present: false, dimInactive: false,
                glassTabs: true, glassSide: true, glassStatus: true, scrim: true, vignette: true,
                rounded: true, activeLine: true, reading: false
            }
        }
    },
    {
        id: "focus", name: "Фокус",
        desc: "Гаснет всё лишнее, спотлайт у курсора, приглушение при печати — только код.",
        patch: {
            enabled: true, partStyle: "dots", baseOp: { editor: 0.04, side: 0.24, panel: 0.09 },
            fx: {
                spotlight: true, dimOnType: true, dimInactive: true, minimapFade: true, reading: false,
                particles: false, aurora: false, kenburns: false, parallax: false, typingPulse: false,
                present: false, scrim: true, vignette: true, glassTabs: true, glassSide: true
            }
        }
    },
    {
        id: "present", name: "Презентация",
        desc: "Крупные акценты, спокойный фон, скрыт визуальный шум — для стрима и скринкаста.",
        patch: {
            enabled: true, partStyle: "dots", baseOp: { editor: 0.06, side: 0.28, panel: 0.11 },
            fx: {
                present: true, aurora: true, tabAccent: true, activeLine: true, cursorGlow: true,
                particles: false, spotlight: false, dimOnType: false, kenburns: false, parallax: false,
                glassTabs: true, glassSide: true, rounded: true, vignette: true
            }
        }
    },
    {
        id: "minimal", name: "Минимал",
        desc: "Почти ванильный VS Code: тонкий фон, без эффектов и частиц.",
        patch: {
            enabled: true, partStyle: "dots", baseOp: { editor: 0.03, side: 0.16, panel: 0.06 },
            fx: {
                kenburns: false, particles: false, aurora: false, spotlight: false, parallax: false,
                typingPulse: false, flow: false, tint: false, present: false, vignette: false,
                glassTabs: false, glassSide: false, glassStatus: false, scrim: false, groupBorder: false,
                rounded: true, activeLine: false
            }
        }
    },
    {
        id: "max", name: "Максимум",
        desc: "Всё включено: живой фон, частицы, свечения — витрина возможностей.",
        patch: {
            enabled: true, partStyle: "stars", baseOp: { editor: 0.08, side: 0.34, panel: 0.14 },
            fx: {
                kenburns: true, particles: true, aurora: true, cursorGlow: true, selection: true,
                glassTabs: true, glassSide: true, glassStatus: true, scrim: true, vignette: true,
                rounded: true, activeLine: true, groupBorder: true, tabAccent: true, typingPulse: true,
                parallax: true, spotlight: false, present: false
            }
        }
    }
];
function profileById(id) { for (var i = 0; i < PROFILES.length; i++) if (PROFILES[i].id === id) return PROFILES[i]; return null; }

// ключ, подпись, min, max, step, знаков после запятой
var PARAMS = [
    ["blur", "Размытие стекла", 0, 20, 1, 0],
    ["kbScale", "Ken Burns масштаб", 1, 1.2, 0.01, 2],
    ["kbSpeed", "Ken Burns сек", 20, 120, 5, 0],
    ["vignette", "Виньетка сила", 0, 0.6, 0.02, 2],
    ["partCount", "Частиц", 0, 120, 5, 0],
    ["pomoMin", "Помидор, мин", 5, 60, 5, 0],
    ["auroraSpeed", "Aurora сек", 8, 60, 2, 0],
    ["spotRadius", "Спот радиус", 120, 600, 20, 0],
    ["tintStrength", "Тон сила", 0, 0.6, 0.02, 2]
];

// Шрифт — строго из белого списка (там нет кавычек/;/{} — CSS-инъекция невозможна).
function safeFont(f) { return TERM_FONTS.indexOf(f) >= 0 ? f : DEFAULTS.term.font; }
// диапазоны параметров эффектов (ключ -> [min, max]) из PARAMS
var FXP_RANGE = {};
(function () { for (var i = 0; i < PARAMS.length; i++) FXP_RANGE[PARAMS[i][0]] = [PARAMS[i][2], PARAMS[i][3]]; })();

var sessionRandomIndex = null, switchMul = 1;

// Миграция сырого конфига к текущей схеме. Вызывается ДО mergeCfg — приводит объект,
// сохранённый старой версией плагина, к форме, которую понимает текущий mergeCfg.
// Пока версия одна (1), шагов нет; сюда добавляются блоки вида «if (v < 2) { ... }»,
// чтобы будущие изменения DEFAULTS не конфликтовали со старым localStorage/импортом.
function migrateCfg(p) {
    if (!p || typeof p !== "object") return p;
    var v = (typeof p.version === "number" && isFinite(p.version)) ? p.version : 0;
    // (будущие миграции здесь, по возрастанию v)
    p.version = CFG_VERSION;
    return p;
}

// Санитизация карты «строковый ключ -> строковый индекс существующего набора». Общая для
// branchSets (ключ — имя git-ветки) и langSets (ключ — расширение файла), по образцу
// workspaceSets: число и длина ключей ограничены, опасные ключи (отравители прототипа)
// отброшены, значения — только валидные индексы наборов (< SETS.length).
function _sanSetMap(src, maxKeyLen) {
    var out = {}, n = 0;
    if (src && typeof src === "object") {
        for (var k in src) {
            if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
            if (n >= 64 || typeof k !== "string" || !k.length || k.length > maxKeyLen) continue;
            if (DANGEROUS_KEYS.indexOf(k) >= 0) continue;
            var v = src[k];
            if (typeof v === "string" && /^\d+$/.test(v) && parseInt(v, 10) < SETS.length) { out[k] = v; n++; }
        }
    }
    return out;
}

// Санитизация карты «строковый ключ -> булево» (для ui.hidden / ui.hiddenFx — скрытые секции/
// эффекты панели). Ограничивает число и длину ключей, отбрасывает отравители прототипа.
function _sanBoolMap(src, maxKeyLen) {
    var out = {}, n = 0;
    if (src && typeof src === "object") {
        for (var k in src) {
            if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
            if (n >= 128 || typeof k !== "string" || k.length > maxKeyLen) continue;
            if (DANGEROUS_KEYS.indexOf(k) >= 0) continue;
            if (typeof src[k] === "boolean") { out[k] = src[k]; n++; }
        }
    }
    return out;
}

// Единственная точка входа для ЛЮБОГО внешнего конфига (localStorage и импорт файла).
// Принимает только значения известного типа/диапазона, остальное отбрасывает.
function mergeCfg(p) {
    var c = clone(DEFAULTS), k;
    p = migrateCfg(p);
    if (p && typeof p === "object") {
        c.version = CFG_VERSION; // после слияния конфиг всегда текущей версии
        // мастер-выключатель фона/эффектов: только булево
        if (typeof p.enabled === "boolean") c.enabled = p.enabled;
        // язык интерфейса: только из белого списка (auto/ru/en), иначе остаётся дефолт
        if (typeof p.lang === "string") c.lang = safeLang(p.lang);
        // авто-бюджет производительности: только булево
        if (typeof p.perfGuard === "boolean") c.perfGuard = p.perfGuard;
        // свой GLSL шейдерного фона: только строка, ограниченная длиной. Код исполняется на
        // GPU в песочнице драйвера (к DOM/файлам доступа нет), поэтому фильтровать содержимое
        // не нужно — достаточно не пускать мегабайтные строки в localStorage.
        if (typeof p.shaderSrc === "string") c.shaderSrc = p.shaderSrc.slice(0, 8000);
        // папка плагина для картинок: строка-URL, нормализуется safeBase (см. imgBase())
        if (typeof p.imgBase === "string") c.imgBase = safeBase(p.imgBase);
        // разрешение сетевых картинок: только булево (по умолчанию false — см. imgAllowed)
        if (typeof p.allowRemoteImages === "boolean") c.allowRemoteImages = p.allowRemoteImages;
        // фон по проекту: флаг + карта «имя папки -> индекс набора». Ключи (имена проектов)
        // и число записей ограничены, значения — только валидные индексы существующих наборов,
        // иначе подменённый конфиг мог бы раздуть объект и утечь в localStorage (как setOp/ui).
        if (typeof p.autoWorkspace === "boolean") c.autoWorkspace = p.autoWorkspace;
        if (p.workspaceSets && typeof p.workspaceSets === "object") {
            c.workspaceSets = {};
            var wc = 0;
            for (var wk in p.workspaceSets) {
                if (!p.workspaceSets.hasOwnProperty(wk)) continue;
                if (wc >= 64 || typeof wk !== "string" || wk.length > 120) continue;
                if (DANGEROUS_KEYS.indexOf(wk) >= 0) continue; // имя проекта не может отравить прототип

                var wv = p.workspaceSets[wk];
                if (typeof wv === "string" && /^\d+$/.test(wv) && parseInt(wv, 10) < SETS.length) { c.workspaceSets[wk] = wv; wc++; }
            }
        }
        // фон по git-ветке: флаг + карта «ветка -> индекс набора» (санитизация как workspaceSets)
        if (typeof p.autoBranch === "boolean") c.autoBranch = p.autoBranch;
        c.branchSets = _sanSetMap(p.branchSets, 120);
        // фон по языку/расширению активного файла: флаг + карта «расширение -> индекс набора»
        if (typeof p.autoRemote === "boolean") c.autoRemote = p.autoRemote;
        c.remoteSets = _sanSetMap(p.remoteSets, 140);
        if (typeof p.autoLang === "boolean") c.autoLang = p.autoLang;
        c.langSets = _sanSetMap(p.langSets, 32);
        // индикатор ветки: только булево
        if (typeof p.ambientBranch === "boolean") c.ambientBranch = p.ambientBranch;
        // mode: "random" или строковый индекс набора в допустимом диапазоне
        if (p.mode === "random") c.mode = "random";
        else if (typeof p.mode === "string" && /^\d+$/.test(p.mode)) {
            var mi = parseInt(p.mode, 10);
            if (mi >= 0 && mi < SETS.length) c.mode = p.mode;
        }
        // яркость по зонам: числа, зажатые в [0, 0.6]
        if (p.baseOp) for (k in c.baseOp) if (typeof p.baseOp[k] === "number") c.baseOp[k] = clampNum(p.baseOp[k], 0, 0.6, c.baseOp[k]);
        // setOp: пересобираем чистый объект — только числовые яркости по числовым индексам.
        // Индекс обязан указывать на СУЩЕСТВУЮЩИЙ набор (< SETS.length): иначе подделанный/
        // раздутый конфиг мог набить cfg тысячами записей для несуществующих наборов, которые
        // затем уходили в localStorage (getOp читает только валидные индексы — остальное балласт).
        if (p.setOp && typeof p.setOp === "object") {
            c.setOp = {};
            for (var idx in p.setOp) {
                if (!/^\d+$/.test(idx) || parseInt(idx, 10) >= SETS.length) continue;
                var o = p.setOp[idx]; if (!o || typeof o !== "object") continue;
                var clean = {};
                ["editor", "side", "panel"].forEach(function (kk) {
                    if (typeof o[kk] === "number") clean[kk] = clampNum(o[kk], 0, 0.6, 0);
                });
                c.setOp[idx] = clean;
            }
        }
        // сила эффектов: числа, зажатые в диапазоны PARAMS
        if (p.fxp) for (k in c.fxp) if (typeof p.fxp[k] === "number" && FXP_RANGE[k]) c.fxp[k] = clampNum(p.fxp[k], FXP_RANGE[k][0], FXP_RANGE[k][1], c.fxp[k]);
        // акцентный цвет: строго #rrggbb
        if (isColor(p.accent)) c.accent = p.accent;
        // акцент по набору: только #rrggbb по числовым индексам существующих наборов (как setOp)
        if (p.setAccent && typeof p.setAccent === "object") {
            c.setAccent = {};
            for (var ai in p.setAccent) {
                if (!/^\d+$/.test(ai) || parseInt(ai, 10) >= SETS.length) continue;
                if (isColor(p.setAccent[ai])) c.setAccent[ai] = p.setAccent[ai];
            }
        }
        // имя набора: строка (в textContent/title, НЕ в CSS — инъекция не грозит),
        // только по валидным индексам, длина ограничена. Пустая строка -> не сохраняем
        // (набор вернётся к «родному» имени из SETS).
        if (p.setName && typeof p.setName === "object") {
            c.setName = {};
            for (var ni in p.setName) {
                if (!/^\d+$/.test(ni) || parseInt(ni, 10) >= SETS.length) continue;
                var nv = p.setName[ni];
                if (typeof nv === "string" && nv.length && nv.length <= 40) c.setName[ni] = nv;
            }
        }
        // свои картинки набора по зонам: строка-путь (в url('...') — cssUrl экранирует
        // кавычки/слэши/переводы строк, инъекция не грозит), только валидные индексы,
        // длина ограничена. Пустая строка -> зона возвращается к картинке из SETS.
        if (p.setImg && typeof p.setImg === "object") {
            c.setImg = {};
            for (var ii in p.setImg) {
                if (!/^\d+$/.test(ii) || parseInt(ii, 10) >= SETS.length) continue;
                var zo = p.setImg[ii]; if (!zo || typeof zo !== "object") continue;
                var cleanZ = {};
                ["editor", "sidebar", "panel"].forEach(function (zk) {
                    if (typeof zo[zk] === "string" && zo[zk].length && zo[zk].length <= 1024) cleanZ[zk] = zo[zk];
                });
                c.setImg[ii] = cleanZ;
            }
        }
        // сгенерированные наборы: нормализуются как SETS, число ограничено GEN_MAX.
        // Дозагрузка в хвост SETS — в _appendGenSets (ниже), при старте.
        if (Array.isArray(p.genSets)) c.genSets = sanitizeUserSets(p.genSets);
        // авто-яркость editor: только булево
        if (typeof p.autoDim === "boolean") c.autoDim = p.autoDim;
        // вписывание по зонам: строго из белого списка cover|contain (в CSS — без кавычек)
        if (p.fit && typeof p.fit === "object") {
            ["editor", "side", "panel"].forEach(function (z) {
                if (p.fit[z] === "cover" || p.fit[z] === "contain") c.fit[z] = p.fit[z];
            });
        }
        // фильтры картинки по зонам: числа в допустимых диапазонах
        if (p.imgfx && typeof p.imgfx === "object") {
            ["editor", "side", "panel"].forEach(function (z) {
                var o = p.imgfx[z]; if (!o || typeof o !== "object") return;
                if (typeof o.brightness === "number") c.imgfx[z].brightness = clampNum(o.brightness, 0.3, 1.5, c.imgfx[z].brightness);
                if (typeof o.saturate === "number") c.imgfx[z].saturate = clampNum(o.saturate, 0, 2, c.imgfx[z].saturate);
                if (typeof o.blur === "number") c.imgfx[z].blur = clampNum(o.blur, 0, 12, c.imgfx[z].blur);
            });
        }
        // слайдшоу: флаг + интервал в минутах
        if (p.slideshow && typeof p.slideshow === "object") {
            if (typeof p.slideshow.on === "boolean") c.slideshow.on = p.slideshow.on;
            if (typeof p.slideshow.min === "number") c.slideshow.min = clampNum(p.slideshow.min, 1, 120, c.slideshow.min);
        }
        // библиотека картинок: массив строк-путей (разрешение сети — при рендере, imgAllowed),
        // ограничение числа и длины пути; librarySlideshow — только булево.
        if (Array.isArray(p.library)) {
            c.library = [];
            for (var _li = 0; _li < p.library.length && c.library.length < 64; _li++) {
                var _lv = p.library[_li];
                if (typeof _lv === "string" && _lv && _lv.length <= 1024) c.library.push(_lv);
            }
        }
        if (typeof p.librarySlideshow === "boolean") c.librarySlideshow = p.librarySlideshow;
        // скринсейвер/витрина при простое: флаг + минуты простоя до показа
        if (p.screensaver && typeof p.screensaver === "object") {
            if (typeof p.screensaver.on === "boolean") c.screensaver.on = p.screensaver.on;
            if (typeof p.screensaver.min === "number") c.screensaver.min = clampNum(p.screensaver.min, 1, 120, c.screensaver.min);
        }
        // авто-набор по времени: флаг + индексы наборов (день/ночь) + границы дня (часы 0–23)
        if (p.autoTime && typeof p.autoTime === "object") {
            if (typeof p.autoTime.on === "boolean") c.autoTime.on = p.autoTime.on;
            ["day", "night"].forEach(function (kk) {
                var vi = p.autoTime[kk];
                if (typeof vi === "number" && vi >= 0 && vi < SETS.length) c.autoTime[kk] = Math.floor(vi);
            });
            ["from", "to"].forEach(function (kk) {
                var hv = p.autoTime[kk];
                if (typeof hv === "number" && isFinite(hv)) c.autoTime[kk] = Math.min(23, Math.max(0, Math.floor(hv)));
            });
            // режим границ дня: по часам или по реальному рассвету/закату (координаты ниже)
            if (p.autoTime.mode === "sun" || p.autoTime.mode === "hours") c.autoTime.mode = p.autoTime.mode;
            if (typeof p.autoTime.lat === "number" && isFinite(p.autoTime.lat)) c.autoTime.lat = Math.min(90, Math.max(-90, p.autoTime.lat));
            if (typeof p.autoTime.lon === "number" && isFinite(p.autoTime.lon)) c.autoTime.lon = Math.min(180, Math.max(-180, p.autoTime.lon));
        }
        // эффекты: только булевы
        if (p.fx) for (k in c.fx) if (typeof p.fx[k] === "boolean") c.fx[k] = p.fx[k];
        // стиль частиц: только из белого списка PART_STYLES (иначе — дефолт "dots")
        if (typeof p.partStyle === "string") c.partStyle = safePartStyle(p.partStyle);
        // терминал: шрифт из белого списка, цвета строго #rrggbb, числа зажаты
        if (p.term && typeof p.term === "object") {
            if (typeof p.term.font === "string") c.term.font = safeFont(p.term.font);
            if (typeof p.term.ligatures === "boolean") c.term.ligatures = p.term.ligatures;
            if (typeof p.term.glow === "number") c.term.glow = clampNum(p.term.glow, 0, 6, c.term.glow);
            if (typeof p.term.weight === "number") c.term.weight = clampNum(p.term.weight, 400, 800, c.term.weight);
            if (typeof p.term.cursorGlow === "boolean") c.term.cursorGlow = p.term.cursorGlow;
            if (isColor(p.term.cursorColor)) c.term.cursorColor = p.term.cursorColor;
            if (isColor(p.term.selColor)) c.term.selColor = p.term.selColor;
            if (typeof p.term.cursorSize === "number") c.term.cursorSize = clampNum(p.term.cursorSize, 0, 2.5, c.term.cursorSize);
            if (typeof p.term.cursorHeight === "number") c.term.cursorHeight = clampNum(p.term.cursorHeight, 0, 2.5, c.term.cursorHeight);
        }
        // ui: свёрнутость (только булевы значения) + позиция (конечные числа)
        if (p.ui && typeof p.ui === "object") {
            if (p.ui.collapsed && typeof p.ui.collapsed === "object") {
                c.ui.collapsed = {};
                // Ключи — названия секций панели (их единицы). Ограничиваем число
                // и длину ключа, чтобы подменённый конфиг не раздул объект тысячами
                // записей и не утёк в saveCfg -> localStorage.
                var _cn = 0;
                for (var t2 in p.ui.collapsed) {
                    if (!p.ui.collapsed.hasOwnProperty(t2)) continue;
                    if (_cn >= 64) break;           // лимит числа записей — дальше не берём
                    if (t2.length > 64) continue;   // слишком длинный ключ — пропускаем ЕГО, не обрывая разбор
                    if (typeof p.ui.collapsed[t2] === "boolean") { c.ui.collapsed[t2] = p.ui.collapsed[t2]; _cn++; }
                }
            }
            // скрытые секции/эффекты панели: строго булевы карты, ключи ограничены
            c.ui.hidden = _sanBoolMap(p.ui.hidden, 64);
            c.ui.hiddenFx = _sanBoolMap(p.ui.hiddenFx, 40);
            // «Избранное»: закреплённые секции/эффекты — те же булевы карты (ключи как у hidden)
            c.ui.favSec = _sanBoolMap(p.ui.favSec, 64);
            c.ui.favFx = _sanBoolMap(p.ui.favFx, 40);
            if (typeof p.ui.posX === "number" && isFinite(p.ui.posX)) c.ui.posX = p.ui.posX;
            if (typeof p.ui.posY === "number" && isFinite(p.ui.posY)) c.ui.posY = p.ui.posY;
            // ширина панели: число в разумных пределах (иначе панель уехала бы за край/схлопнулась)
            if (typeof p.ui.width === "number" && isFinite(p.ui.width)) c.ui.width = Math.min(760, Math.max(320, Math.round(p.ui.width)));
            // активная вкладка панели: неотрицательное целое (реальный верх зажмёт togglePanel
            // под число вкладок; здесь просто небольшой безопасный потолок против мусора)
            if (typeof p.ui.tab === "number" && isFinite(p.ui.tab)) c.ui.tab = Math.min(15, Math.max(0, Math.floor(p.ui.tab)));
        }
    }
    return c;
}
// Любой ЧУЖОЙ конфиг (импорт файла, применённый пресет) принимаем с ПРИНУДИТЕЛЬНО
// выключенными сетевыми картинками: включить их можно только вручную тумблером. Иначе
// чужой файл сам поднимал бы allowRemoteImages=true и грузил удалённые картинки (маячок)
// ещё до того, как пользователь это увидел. Собственный сохранённый конфиг (loadCfg)
// проходит через mergeCfg НАПРЯМУЮ и своё согласие сохраняет.
function mergeForeign(p) {
    var c = mergeCfg(p);
    c.allowRemoteImages = false;
    return c;
}
function loadCfg() {
    try {
        var raw = localStorage.getItem(CFG_KEY);
        // Нормальный конфиг весит килобайты. Отсекаем заведомо раздутый/подменённый
        // localStorage до JSON.parse (тот же лимит, что и при импорте файла) — чтобы
        // огромная строка не била по старту разбором/памятью. Свыше лимита — дефолты.
        if (raw && raw.length <= 256 * 1024) return mergeCfg(safeParse(raw));
    } catch (e) {}
    // localStorage пуст (новая машина / переустановка / крупный апдейт VS Code почистил
    // хранилище). Если компаньон-расширение прокинуло базовый конфиг из settings.json
    // (window.__MLBG_SEED__ — едет через Settings Sync), берём его как отправную
    // точку: вид «переезжает» на новую машину сам. mergeCfg санитизирует чужой объект.
    var seed = seedConfig();
    if (seed) { try { return mergeCfg(seed); } catch (e) {} }
    return clone(DEFAULTS);
}
// Базовый конфиг из settings.json, проброшенный компаньоном как глобал window.__MLBG_SEED__
// (см. extension/extension.js). Возвращает объект или null. Мягко — глобала может не быть
// (плагин подключён вручную, без расширения) или он битый.
function seedConfig() {
    try {
        var s = (typeof window !== "undefined") ? window.__MLBG_SEED__ : null;
        if (s && typeof s === "object") return s;
    } catch (e) {}
    return null;
}
function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
    // Единая точка сохранения конфига — здесь же отмечаем изменение для истории Undo/Redo
    // (scheduleHistory определён в io.js; поднят по области IIFE). При старте (loadCfg) не
    // зовётся, поэтому лишнего шага истории на загрузке нет.
    try { scheduleHistory(); } catch (e) {}
    // Другие окна VS Code (общий localStorage, но свой рантайм) должны увидеть правку сразу,
    // а не через цикл самолечения. broadcastCfg объявлен в boot.js — доступен по области IIFE.
    try { if (typeof broadcastCfg === "function") broadcastCfg(); } catch (e) {}
}

// ===== Резерв конфига (защита от неудачной замены) =====
// Перед рискованным ПОЛНЫМ замещением cfg (импорт файла, сброс к дефолту, применение
// пресета) снимаем текущий cfg в отдельный ключ. Кнопка «Восстановить» возвращает его.
// ВАЖНО: это откат неудачного действия, а НЕ бэкап на диск — полную очистку localStorage
// (переустановка custom-css, крупное обновление VS Code) резерв не переживёт; от этого
// спасает только ручной экспорт в файл. Лимит длины — как у loadCfg/импорта.
function backupCfg() { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(cfg)); } catch (e) {} }
function hasBackup() { try { var r = localStorage.getItem(BACKUP_KEY); return !!(r && r.length <= 256 * 1024); } catch (e) { return false; } }
function readBackup() {
    try {
        var raw = localStorage.getItem(BACKUP_KEY);
        if (raw && raw.length <= 256 * 1024) return mergeCfg(safeParse(raw)); // та же санитизация, что и импорт
    } catch (e) {}
    return null;
}

var cfg = loadCfg();
