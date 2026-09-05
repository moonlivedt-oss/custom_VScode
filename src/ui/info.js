// ===== Подсказки «?»: тексты + всплывающий попап =====
// INFO — русские тексты пояснений по ключам (op_*, fx_*, fxp_*, term_*, img_* и отдельные).
// INFO_EN — их английские версии с ТЕМИ ЖЕ ключами (синхронность гарантирована ключом, а не
// ручным повтором строки). infoDot(text) строит кружок «?», а перевод делает в одной точке
// (infoText): в английском режиме подменяет русский текст на английский. Так переводятся и
// подсказки контролов (из INFO), и подписи секций (литералы из panel.js — через общий словарь).

var INFO = {
    perf_guard: "Авто-бюджет производительности: на слабой машине при устойчиво низком FPS часть тяжёлых эффектов (Aurora, пульс печати, лишние частицы) сама приглушается, а когда кадры восстанавливаются — возвращается. Оставь включённым для плавности; выключи, если хочешь всегда полный набор эффектов независимо от нагрузки.",
    accent: "Акцентный цвет всего интерфейса: курсор, скроллбар, активная вкладка, рамки, подсветки. У каждого набора свой — правка меняет только активный набор. Можно вписать HEX вручную или взять доминирующий цвет прямо из фоновой картинки кнопкой «из картинки».",
    set_name: "Имя активного набора — видно на кнопке BG, в подсказках и списках. Оставь поле пустым, чтобы вернуть исходное имя набора.",
    presets: "Сохранить ВЕСЬ текущий вид (набор, яркость, эффекты, терминал, акцент) под именем и потом переключаться между сохранёнными образами одним кликом. Это личные пресеты в браузере редактора — отдельно от файлов экспорта/импорта и от кода «Поделиться».",
    autoDim: "Если фоновая картинка редактора светлая, её яркость автоматически занижается, чтобы код оставался читаемым. Саму настройку «Яркость → Редактор» не меняет — просто подстраховка от засветки текста.",
    img_fit: "Как вписывать картинку в зону: «Заполнить» (cover) — обрезая по краям, без полей; «Целиком» (contain) — вся картинка, но могут остаться поля. Для портретных и «тушь на белом» обычно лучше «Целиком».",
    img_path: "Своя картинка для выбранной зоны активного набора вместо стандартной. Укажи путь вида file:///… (на Windows слэши прямые, буква диска строчная) или vscode-file://vscode-app/…. Пусто — вернётся картинка набора; текущий путь по умолчанию показан подсказкой в поле.",
    workspace_on: "Набор привязывается к открытому проекту (по имени папки в заголовке окна). Включи и выбери набор — он закрепится за этим проектом и вернётся при следующем открытии; в другом проекте закрепи свой. Приоритетнее слайдшоу и авто-набора по времени. Нужна открытая папка в VS Code.",
    ambient_branch: "Тонкая полоска у верхнего края окна показывает текущую git-ветку: на main/master — красноватая (ты на основной ветке — осторожнее с коммитами), на прочих — зеленоватая. Имя ветки читается из статусбара; без git-индикатора полоски нет.",
    allow_remote: "Разрешить фоновые картинки по ссылкам http(s). По умолчанию ВЫКЛ ради безопасности: иначе импортированный или чужой конфиг мог бы заставить редактор молча сходить в сеть за картинкой (утечка IP, факт использования плагина, возможный трекер). Включай, только если сам задаёшь адрес и доверяешь ему.",
    share_code: "Компактный код всего образа (набор, яркость, эффекты, терминал, палитра) — без картинок и путей. «Скопировать» кладёт код в буфер, чтобы поделиться; вставь чужой код в поле и «Применить», чтобы примерить его вид. Твои картинки, пути и привязки к проектам при этом не затрагиваются.",
    theme_export: "Собрать из палитры активного набора настоящую тему VS Code (color-theme.json): согласованные цвета интерфейса + подсветку синтаксиса, выведенные из акцента. Файл скачивается и копируется в буфер. Зачем: тема работает и там, где кастомный фон недоступен — в vscode.dev, по SSH, в Codespaces — и находится через поиск тем. Как применить: (1) быстро — вставь блок \"colors\" в settings.json под \"workbench.colorCustomizations\", а \"tokenColors\" — под \"editor.tokenColorCustomizations\".textMateRules (применяется сразу, без упаковки); (2) как полноценную тему — положи файл в папку themes/ theme-расширения. У фото-наборов подложка тёмная, выведена из акцента (саму картинку в тему перенести нельзя).",
    img_base: "Папка, откуда берутся картинки наборов. Пригодится, если перенёс плагин, а фон пропал (плитки набора помечены «!»). Укажи путь к папке с assets в виде vscode-file://vscode-app/… или file:///… (завершающий слэш добавится сам). Пусто — путь определяется автоматически и показан подсказкой в поле.",
    autotime_from: "С какого часа (0–23) начинается «день» и включается дневной набор.",
    autotime_to: "До какого часа (0–23) длится «день». Если «до» меньше, чем «с», интервал считается через полночь (например, день 20→6 — ночной набор днём, дневной вечером).",
    img_zone: "Для какой зоны настраиваются фильтры ниже — у каждой свои значения. «Панель/терминал» — это фон нижней панели за терминалом.",
    img_brightness: "Яркость самой фоновой картинки зоны (код и интерфейс не трогает). Меньше 1 — темнее, больше — светлее.",
    img_saturate: "Насыщенность цветов фоновой картинки: 0 — чёрно-белая, 1 — как есть, 2 — сочно.",
    img_blur: "Размытие самой фоновой картинки, пиксели. Помогает коду читаться поверх пёстрого фона.",
    slide_on: "Автоматически менять набор по кругу через заданный интервал.",
    slide_min: "Через сколько минут переключать набор в режиме слайдшоу.",
    autotime_on: "Переключать набор по времени суток: днём — дневной набор, ночью — ночной (границы дня задаются ниже). Не работает в режиме «случайно»; при включении отменяет слайдшоу.",
    enabled: "Главный выключатель: убирает весь фон и эффекты (получается обычный VS Code), но все настройки сохраняются и вернутся при повторном включении. Горячая клавиша — Ctrl+Alt+0.",
    op_editor: "Насколько ярко фоновая картинка проступает за кодом редактора. Ниже — код читается легче, выше — фон заметнее.",
    op_side: "Насколько ярко проступает фон сайдбара (проводник, поиск и пр.).",
    op_panel: "Насколько ярко проступает фон нижней панели (терминал, проблемы, вывод).",
    fxp_blur: "Сила размытия «матового стекла» на вкладках, панелях и статусбаре. 0 — стекло прозрачное без размытия.",
    fxp_kbScale: "Насколько сильно приближается фон в анимации Ken Burns (медленный зум). Ближе к 1 — почти незаметно.",
    fxp_kbSpeed: "Длительность одного цикла Ken Burns в секундах. Больше — медленнее и спокойнее.",
    fxp_vignette: "Сила затемнения по краям редактора (виньетка). Собирает взгляд к центру.",
    fxp_partCount: "Сколько летящих частиц рисовать (когда эффект «Частицы» включён). 0 — частиц нет.",
    fxp_pomoMin: "Длительность одного помидора (рабочего интервала) в минутах.",
    fxp_auroraSpeed: "Длительность одного цикла дрейфа «Aurora» в секундах. Больше — спокойнее и медленнее.",
    fxp_spotRadius: "Радиус светлого «окна» спотлайта вокруг курсора, пиксели. Меньше — уже луч и сильнее затемнение по краям.",
    fxp_tintStrength: "Сила тонировки воркбенча акцентом (эффект «Тон акцентом»). 0 — нет, больше — насыщеннее.",
    fx_kenburns: "Медленный плавный зум фоновой картинки редактора — фон «дышит», а не стоит статично.",
    fx_glassTabs: "Полупрозрачный матовый фон полосы вкладок (эффект матового стекла).",
    fx_vignette: "Затемнение по краям области редактора, чтобы взгляд держался на коде.",
    fx_glassSide: "Матовое стекло для сайдбара и нижней панели.",
    fx_scrim: "Лёгкая тень-подложка под кодом для читаемости поверх пёстрого фона.",
    fx_glassStatus: "Матовое стекло для нижнего статусбара.",
    fx_activeLine: "Подсветка текущей строки кода акцентным цветом набора.",
    fx_groupRing: "Тонкий внутренний контур активной группы редакторов — видно, где фокус, при сплите на колонки.",
    fx_groupBorder: "Анимированная «живая» рамка вокруг активной группы (радужный перелив или один цвет — см. «Контур: 1 цвет»).",
    fx_scrollbar: "Ползунок скроллбара красится акцентным цветом набора.",
    fx_activityBg: "Фоновая картинка проступает и за вертикальным актив-баром слева.",
    fx_tabAccent: "Акцентная полоска-подчёркивание под активной вкладкой.",
    fx_rounded: "Скруглённые углы у меню, подсказок, палитры команд и тостов.",
    fx_cursorGlow: "Мягкое свечение вокруг текстового курсора в редакторе.",
    fx_selection: "Градиентная акцентная заливка выделенного текста вместо плоской.",
    fx_titlebar: "Градиентная акцентная подсветка заголовка окна.",
    fx_splash: "Картинка-заставка из набора в пустой группе редактора (когда не открыт ни один файл).",
    fx_clock: "Часы с датой и днём недели в статусбаре.",
    fx_particles: "Летящие частицы поверх интерфейса (форма — в списке «Стиль частиц», число — ползунком «Частиц»).",
    fx_pomodoro: "Таймер-помидор в статусбаре: клик — старт/пауза, Alt+клик — сброс. Длительность — ползунком «Помидор, мин».",
    fx_focusSession: "Пока идёт «Помидор», редактор уходит в фокус: неактивные группы и вкладки, миникарта и хлебные крошки гаснут, сайдбар/панель/актив-бар приглушаются (проявляются при наведении), активный редактор обведён мягким акцентом. На паузе, по сбросу и по завершении фокус плавно спадает. Нужен включённый и запущенный «Помидор».",
    fx_dimOnType: "Пока печатаешь, фон редактора плавно тускнеет для читаемости и возвращается через короткую паузу после последней клавиши.",
    fx_dimOnBlur: "Когда окно VS Code теряет фокус (перешёл в браузер или мессенджер), фон редактора плавно тускнеет, чтобы не отвлекать; при возврате — возвращается.",
    fx_groupBorderMono: "«Живой контур» одним акцентным цветом набора вместо радужного перелива. Действует, когда включён сам «Живой контур».",
    fx_paletteSync: "«Живой контур» перекрашивается в палитру, извлечённую из фоновой картинки редактора (два цвета-спутника к акценту). Для картиночных наборов; на градиентных берётся поворот оттенка акцента.",
    fx_parallax: "Фон редактора едва заметно смещается вслед за курсором мыши — появляется ощущение глубины. Гаснет при системной настройке «уменьшить движение».",
    fx_flow: "«Поток»: чем дольше печатаешь без пауз, тем сильнее гаснет фон редактора (глубже, чем «Тускнеть при печати»), а на паузе для чтения — возвращается. Помогает удержаться в потоке.",
    fx_dimInactive: "Неактивные группы редактора становятся тусклее, чтобы взгляд держался на активной. Удобно при сплите на несколько колонок.",
    fx_reading: "Режим чтения: фон редактора почти гаснет — код виден максимально чётко, а фон сайдбара и панели остаётся. Горячая клавиша — Ctrl+Alt+R.",
    fx_glassCommand: "Матовое стекло (размытие + подложка темы) для палитры команд, автодополнения и всплывающих подсказок, чтобы они не были глухо-непрозрачными поверх фона.",
    fx_findAccent: "Виджет поиска/замены и подсветка найденных совпадений красятся акцентным цветом набора.",
    fx_minimapFade: "Миникарта (обзор кода справа) становится полупрозрачной, и сквозь неё просвечивает фон. Выключи, если по ней трудно ориентироваться.",
    fx_indentAccent: "Активная направляющая отступа и парная скобка подсвечиваются акцентным цветом набора — легче видеть вложенность.",
    fx_selectionMatch: "Все вхождения выделенного слова подсвечиваются лёгкой акцентной заливкой с контуром — видно, где ещё встречается имя.",
    fx_stickyGlass: "Матовое стекло для закреплённой прокрутки (sticky scroll — приклеенные сверху заголовки функций и классов), чтобы они читались поверх фона.",
    fx_aurora: "«Полярное сияние»: за кодом медленно дрейфует размытый градиент из палитры набора (акцент и два спутника). Лежит под текстом — читаемости не мешает. Скорость — ползунком «Aurora сек». Гаснет при системной настройке «уменьшить движение».",
    fx_spotlight: "Экран мягко затемняется по краям, а вокруг курсора остаётся светлое «окно» — взгляд держится на месте правки. Радиус — ползунком «Спот радиус». Следует за мышью.",
    fx_typingPulse: "Пока печатаешь, активная вкладка мягко пульсирует акцентным свечением; на паузе — затихает. Гаснет при системной настройке «уменьшить движение».",
    fx_tint: "Полупрозрачная тонировка всего воркбенча в цвет акцента (режим наложения overlay — как светофильтр). Сила — ползунком «Тон сила». Клики проходят сквозь неё.",
    fx_legible: "Мягкая тень под глифами кода, чтобы текст читался поверх яркой картинки. Ширину символов не меняет (метрики Monaco не трогаются), поэтому курсор и выделение не сдвигаются.",
    fx_errorReact: "Когда в коде есть ошибки (счётчик у иконки ошибок в статусбаре больше нуля), статусбар мягко подсвечивается красным. Счётчик читается из DOM статусбара — как и индикатор git-ветки.",
    fx_present: "Режим для стрима, скринкаста и записи курса: прячет визуальный шум (хлебные крошки, миникарту, экшены редактора — проявляются при наведении) и КРУПНЕЕ подаёт акценты (толще подчёркивание вкладки, ярче индикатор актив-бара и активная строка). Только оформление — ничего не двигает.",
    fx_highContrast: "Доступность: плотная тень под кодом и подписями сайдбара/панели ради читаемости поверх яркого фона (метрики Monaco не трогаются) и толще обводка фокуса для навигации с клавиатуры. Дополняет системные «уменьшить движение» и «уменьшить прозрачность», которые плагин учитывает сам.",
    part_style: "Форма летящих частиц: точки, звёзды-искры, снег, лепестки сакуры, контуры-пузыри, светлячки (пульсируют яркостью), дождь (струи) или конфетти (цветные прямоугольники). Снег, сакура, дождь и конфетти падают сверху вниз, остальные всплывают снизу вверх. «Сезон (авто)» сам выбирает форму по времени года: зима — снег, весна — сакура, лето — светлячки, осень — дождь.",
    term_font: "Шрифт терминала. В списке — совместимые по ширине Nerd-шрифты, чтобы не разъезжались колонки и сохранялись иконки oh-my-posh / powerline.",
    term_ligatures: "Слитное начертание пар символов: ->, =>, != и подобных.",
    term_cursorGlow: "Ореол-свечение вокруг курсора терминала.",
    term_glow: "Сила тени под текстом терминала для читаемости поверх фоновой картинки.",
    term_weight: "Толщина шрифта терминала. Жирный текст остаётся заметно жирнее базового.",
    term_cursorColor: "Цвет курсора терминала.",
    term_selColor: "Цвет выделения текста в терминале.",
    term_cursorSize: "Ширина курсора терминала: 0 — скрыть, 1 — обычная, больше — шире. Заметнее всего на курсоре-линии (cursorStyle: line).",
    term_cursorHeight: "Высота курсора терминала: 1 — обычная, меньше — короче, больше — выше ячейки."
};

// Английские версии подсказок — ТЕ ЖЕ ключи, что в INFO. Сопоставление RU->EN строится по
// ключу (см. _infoEN ниже), поэтому русские строки нигде не дублируются вручную и не рискуют
// разойтись. Ключа нет в INFO_EN -> в английском режиме останется русский текст (не сломается).
var INFO_EN = {
    perf_guard: "Auto performance budget: on a weak machine, when the FPS stays low, some heavy effects (Aurora, typing pulse, extra particles) dim themselves, and return once frames recover. Leave it on for smoothness; turn it off if you always want the full set of effects regardless of load.",
    accent: "Accent color for the whole interface: cursor, scrollbar, active tab, borders, highlights. Each set has its own — editing changes only the active set. Type a HEX value, or pull the dominant color straight from the background image with “from image”.",
    set_name: "Name of the active set — shown on the BG button, in tooltips and lists. Leave the field empty to restore the set’s original name.",
    presets: "Save the WHOLE current look (set, brightness, effects, terminal, accent) under a name, then switch between saved looks with one click. These are personal presets in the editor’s browser storage — separate from export/import files and from the “Share” code.",
    autoDim: "If the editor’s background image is light, its brightness is lowered automatically so code stays readable. It doesn’t change the “Brightness → Editor” setting itself — just a safeguard against washed-out text.",
    img_fit: "How the image fills the zone: “Fill” (cover) — cropped at the edges, no gaps; “Contain” — the whole image, but there may be margins. For portrait or “ink on white” art, “Contain” usually looks better.",
    img_path: "Your own image for the selected zone of the active set instead of the default. Use a path like file:///… (on Windows forward slashes, lowercase drive letter) or vscode-file://vscode-app/…. Empty — the set’s image returns; the current default path is shown as the field’s placeholder.",
    workspace_on: "The set is tied to the open project (by the folder name in the window title). Turn it on and pick a set — it gets pinned to this project and comes back next time; pin a different one in another project. Takes priority over the slideshow and time-of-day auto-set. Requires an open folder in VS Code.",
    ambient_branch: "A thin strip at the top edge of the window shows the current git branch: reddish on main/master (you’re on the main branch — commit with care), greenish otherwise. The branch name is read from the status bar; with no git indicator there’s no strip.",
    allow_remote: "Allow background images from http(s) links. OFF by default for safety: otherwise an imported or someone else’s config could make the editor silently fetch an image over the network (IP leak, the fact that you use the plugin, a possible tracker). Enable it only if you set the address yourself and trust it.",
    share_code: "A compact code of the whole look (set, brightness, effects, terminal, palette) — without images or paths. “Copy” puts the code on the clipboard to share; paste someone’s code into the field and “Apply” to try their look. Your images, paths and project pins are left untouched.",
    theme_export: "Build a real VS Code theme (color-theme.json) from the active set’s palette: coherent workbench colors + syntax highlighting derived from the accent. The file is downloaded and copied to the clipboard. Why: a theme works even where the custom background can’t — vscode.dev, over SSH, in Codespaces — and is found through theme search. How to apply: (1) quick — paste the \"colors\" block into settings.json under \"workbench.colorCustomizations\", and \"tokenColors\" under \"editor.tokenColorCustomizations\".textMateRules (applies instantly, no packaging); (2) as a full theme — drop the file into your theme extension’s themes/ folder. Photo sets get a dark backdrop derived from the accent (the image itself can’t be carried into a theme).",
    img_base: "The folder the set images are read from. Useful if you moved the plugin and the background vanished (set tiles marked with “!”). Point it at the folder that contains assets, as vscode-file://vscode-app/… or file:///… (a trailing slash is added automatically). Empty — the path is detected automatically and shown as the field’s placeholder.",
    autotime_from: "From which hour (0–23) “day” begins and the day set turns on.",
    autotime_to: "Until which hour (0–23) “day” lasts. If “to” is less than “from”, the interval wraps past midnight (e.g. day 20→6 — night set by day, day set in the evening).",
    img_zone: "Which zone the filters below apply to — each zone has its own values. “Panel/terminal” is the background of the bottom panel behind the terminal.",
    img_brightness: "Brightness of the zone’s background image itself (leaves code and UI alone). Below 1 — darker, above — lighter.",
    img_saturate: "Color saturation of the background image: 0 — black-and-white, 1 — as is, 2 — vivid.",
    img_blur: "Blur of the background image itself, pixels. Helps code read over a busy background.",
    slide_on: "Automatically cycle through sets on the given interval.",
    slide_min: "How many minutes between set switches in slideshow mode.",
    autotime_on: "Switch the set by time of day: the day set by day, the night set by night (day bounds set below). Doesn’t run in “random” mode; turning it on cancels the slideshow.",
    enabled: "Master switch: removes all background and effects (plain VS Code), but every setting is kept and returns when you switch it back on. Hotkey — Ctrl+Alt+0.",
    op_editor: "How brightly the background image shows through behind editor code. Lower — code reads easier, higher — the background is more visible.",
    op_side: "How brightly the sidebar background shows through (explorer, search, etc.).",
    op_panel: "How brightly the bottom panel background shows through (terminal, problems, output).",
    fxp_blur: "Blur strength of the “frosted glass” on tabs, panels and the status bar. 0 — glass is clear, no blur.",
    fxp_kbScale: "How far the background zooms in the Ken Burns animation (slow zoom). Near 1 — barely noticeable.",
    fxp_kbSpeed: "Length of one Ken Burns cycle in seconds. Larger — slower and calmer.",
    fxp_vignette: "Strength of the edge darkening of the editor (vignette). Draws the eye toward the center.",
    fxp_partCount: "How many flying particles to draw (when the “Particles” effect is on). 0 — no particles.",
    fxp_pomoMin: "Length of one pomodoro (work interval) in minutes.",
    fxp_auroraSpeed: "Length of one Aurora drift cycle in seconds. Larger — calmer and slower.",
    fxp_spotRadius: "Radius of the spotlight’s bright “window” around the cursor, pixels. Smaller — a tighter beam and stronger edge darkening.",
    fxp_tintStrength: "Strength of the accent tint over the workbench (the “Accent tint” effect). 0 — none, higher — richer.",
    fx_kenburns: "A slow, smooth zoom of the editor background image — the background “breathes” instead of sitting still.",
    fx_glassTabs: "Semi-transparent frosted background for the tab bar (frosted-glass effect).",
    fx_vignette: "Edge darkening of the editor area to keep the eye on the code.",
    fx_glassSide: "Frosted glass for the sidebar and the bottom panel.",
    fx_scrim: "A soft shadow scrim under the code for readability over a busy background.",
    fx_glassStatus: "Frosted glass for the bottom status bar.",
    fx_activeLine: "Highlights the current line of code with the set’s accent color.",
    fx_groupRing: "A thin inner outline of the active editor group — shows where focus is when you split into columns.",
    fx_groupBorder: "An animated “living” border around the active group (rainbow shift or a single color — see “Border: 1 color”).",
    fx_scrollbar: "The scrollbar thumb is tinted with the set’s accent color.",
    fx_activityBg: "The background image also shows through behind the vertical activity bar on the left.",
    fx_tabAccent: "An accent underline strip beneath the active tab.",
    fx_rounded: "Rounded corners on menus, tooltips, the command palette and toasts.",
    fx_cursorGlow: "A soft glow around the text cursor in the editor.",
    fx_selection: "A gradient accent fill for selected text instead of a flat one.",
    fx_titlebar: "A gradient accent highlight on the window title bar.",
    fx_splash: "A splash image from the set in an empty editor group (when no file is open).",
    fx_clock: "A clock with date and weekday in the status bar.",
    fx_particles: "Flying particles over the interface (shape in the “Particle style” list, count via the “Particle count” slider).",
    fx_pomodoro: "A pomodoro timer in the status bar: click — start/pause, Alt+click — reset. Length via the “Pomodoro, min” slider.",
    fx_focusSession: "While the pomodoro runs, the editor goes into focus: inactive groups and tabs, the minimap and breadcrumbs fade, the sidebar/panel/activity bar dim (revealed on hover), and the active editor gets a soft accent outline. On pause, reset and completion the focus fades away. Requires the pomodoro to be enabled and running.",
    fx_dimOnType: "While you type, the editor background gently dims for readability and returns after a short pause following the last keystroke.",
    fx_dimOnBlur: "When the VS Code window loses focus (you switched to a browser or messenger), the editor background gently dims so it won’t distract; it returns when focus comes back.",
    fx_groupBorderMono: "The “Living border” in a single accent color of the set instead of the rainbow shift. Active when the “Living border” itself is on.",
    fx_paletteSync: "The “Living border” is recolored from the palette extracted from the editor background image (two companion colors to the accent). For photo sets; gradient sets use an accent hue rotation.",
    fx_parallax: "The editor background shifts ever so slightly with the mouse cursor, adding a sense of depth. Disabled by the system “reduce motion” setting.",
    fx_flow: "“Flow”: the longer you type without pauses, the more the editor background dims (deeper than “Dim while typing”), returning on a reading pause. Helps you stay in the flow.",
    fx_dimInactive: "Inactive editor groups get dimmer so the eye stays on the active one. Handy when split into several columns.",
    fx_reading: "Reading mode: the editor background nearly fades out — code is as crisp as possible, while the sidebar and panel backgrounds stay. Hotkey — Ctrl+Alt+R.",
    fx_glassCommand: "Frosted glass (blur + theme backdrop) for the command palette, autocomplete and hover tooltips, so they aren’t flatly opaque over the background.",
    fx_findAccent: "The find/replace widget and matched-result highlights are tinted with the set’s accent color.",
    fx_minimapFade: "The minimap (code overview on the right) becomes semi-transparent and the background shows through it. Turn it off if it’s hard to navigate.",
    fx_indentAccent: "The active indent guide and the matching bracket are highlighted with the set’s accent color — nesting is easier to see.",
    fx_selectionMatch: "Every occurrence of the selected word is highlighted with a light accent fill and outline — you can see where the name recurs.",
    fx_stickyGlass: "Frosted glass for sticky scroll (the function/class headers pinned at the top) so they read over the background.",
    fx_aurora: "“Aurora”: a blurred gradient from the set’s palette (the accent and two companions) drifts slowly behind the code. It sits under the text — no harm to readability. Speed via the “Aurora sec” slider. Disabled by the system “reduce motion” setting.",
    fx_spotlight: "The screen softly darkens at the edges while a bright “window” stays around the cursor — the eye stays on the edit spot. Radius via the “Spotlight radius” slider. Follows the mouse.",
    fx_typingPulse: "While you type, the active tab gently pulses with an accent glow; on a pause it settles. Disabled by the system “reduce motion” setting.",
    fx_tint: "A semi-transparent tint of the whole workbench in the accent color (overlay blend — like a color filter). Strength via the “Tint strength” slider. Clicks pass through it.",
    fx_legible: "A soft shadow under code glyphs so text reads over a bright image. It doesn’t change glyph width (Monaco metrics untouched), so the cursor and selection don’t shift.",
    fx_errorReact: "When the code has errors (the count by the status-bar error icon is above zero), the status bar softly glows red. The count is read from the status-bar DOM — like the git-branch indicator.",
    fx_present: "A mode for streaming, screencasts and course recording: it hides visual noise (breadcrumbs, minimap, editor actions — revealed on hover) and presents accents LARGER (a thicker tab underline, a brighter activity-bar indicator and active line). Styling only — nothing is moved.",
    fx_highContrast: "Accessibility: a dense shadow under code and sidebar/panel labels for readability over a bright background (Monaco metrics untouched) and a thicker focus outline for keyboard navigation. Complements the system “reduce motion” and “reduce transparency”, which the plugin honors on its own.",
    part_style: "Shape of the flying particles: dots, spark-stars, snow, sakura petals, outline bubbles, fireflies (pulsing brightness), rain (streaks) or confetti (colored rectangles). Snow, sakura, rain and confetti fall top-down, the rest float bottom-up. “Season (auto)” picks the shape by season: winter — snow, spring — sakura, summer — fireflies, autumn — rain.",
    term_font: "Terminal font. The list holds width-compatible Nerd fonts so columns don’t drift and oh-my-posh / powerline icons stay intact.",
    term_ligatures: "Joined rendering of character pairs: ->, =>, != and the like.",
    term_cursorGlow: "A halo glow around the terminal cursor.",
    term_glow: "Strength of the shadow under terminal text for readability over the background image.",
    term_weight: "Terminal font weight. Bold text stays noticeably heavier than the base.",
    term_cursorColor: "Terminal cursor color.",
    term_selColor: "Color of selected text in the terminal.",
    term_cursorSize: "Terminal cursor width: 0 — hide, 1 — normal, higher — wider. Most visible on the line cursor (cursorStyle: line).",
    term_cursorHeight: "Terminal cursor height: 1 — normal, less — shorter, more — taller than the cell."
};

// Обратная карта «русский текст подсказки -> английский». Строится по общим ключам INFO/INFO_EN,
// поэтому русскую строку не приходится писать дважды и рассинхрон невозможен. Ключа нет в
// INFO_EN -> перевода нет -> останется русский текст.
var _infoEN = (function () {
    var m = {};
    for (var k in INFO) { if (INFO.hasOwnProperty(k) && typeof INFO_EN[k] === "string") m[INFO[k]] = INFO_EN[k]; }
    return m;
})();
// Перевод текста подсказки под язык панели. Английский: сначала карта подсказок контролов
// (_infoEN), затем общий словарь t() (для подписей секций — литералы из panel.js). Русский —
// строка как есть.
function infoText(s) {
    if (uiLang() !== "en") return s;
    if (_infoEN[s]) return _infoEN[s];
    return t(s);
}

// ===== Всплывающая подсказка «?» =====
var _infoPop = null, _infoAnchor = null;
function hideInfo() {
    if (_infoPop) { _infoPop.remove(); _infoPop = null; _infoAnchor = null; document.removeEventListener("mousedown", _infoOutside, true); }
}
function _infoOutside(e) { if (_infoPop && e.target !== _infoAnchor && !_infoPop.contains(e.target)) hideInfo(); }
function showInfo(anchor, text) {
    if (_infoAnchor === anchor) { hideInfo(); return; } // повторный клик — закрыть
    hideInfo();
    // Тема: подсказка живёт на body (вне панели с её --mlp-*), поэтому цвета подложки/текста
    // выбираем сами под светлую/тёмную тему. Акцент берём из :root (--mlbg-accent* глобальны).
    var light = false; try { light = isLightTheme(); } catch (e) {}
    var bg = light ? "rgba(248,248,251,0.95)" : "rgba(24,24,37,0.93)";
    var fg = light ? "#1e1e2e" : "#cdd6f4";
    var brd = "rgba(var(--mlbg-accent-rgb),0.4)";
    // «Уменьшить движение» — показываем сразу, без выезда/масштаба.
    var reduce = false; try { reduce = (typeof reduceMotion === "function") ? reduceMotion() : false; } catch (e) {}
    var pop = el("div",
        "position:fixed; z-index:100003; max-width:272px; padding:10px 13px 10px 14px; border-radius:11px;" +
        "background:" + bg + "; color:" + fg + "; font-size:11.5px; line-height:1.5; letter-spacing:0.1px;" +
        "font-family:var(--vscode-font-family, sans-serif);" +
        "border:1px solid " + brd + "; border-left:3px solid var(--mlbg-accent);" +
        "box-shadow:0 12px 34px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.28);" +
        "backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); opacity:0;", text);
    document.body.appendChild(pop);
    // Размеры берём через offset* (не зависят от transform, в отличие от getBoundingClientRect),
    // чтобы стартовый масштаб анимации не искажал позиционирование.
    var r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
    var below = true, top = r.bottom + 9;                       // по умолчанию — под кнопкой «?»
    if (top + ph > window.innerHeight - 8) { top = r.top - ph - 9; below = false; } // не влезло — над ней
    top = Math.max(8, top);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    pop.style.transformOrigin = below ? "top left" : "bottom left";
    // Стрелка-указатель к «?»: маленький повёрнутый квадрат у нужного края, с акцентными
    // сторонами, обращёнными наружу. Горизонтально — под центром кнопки (в пределах попапа).
    var arrow = el("div",
        "position:absolute; width:11px; height:11px; background:" + bg + "; transform:rotate(45deg);" +
        (below ? "top:-6px; border-left:1px solid " + brd + "; border-top:1px solid " + brd + ";"
               : "bottom:-6px; border-right:1px solid " + brd + "; border-bottom:1px solid " + brd + ";"));
    var ax = (r.left + r.width / 2) - left - 5.5;               // центр «?» в координатах попапа
    arrow.style.left = Math.max(12, Math.min(pw - 23, ax)) + "px";
    pop.appendChild(arrow);
    // Появление: мягкий выезд «от кнопки» + лёгкий масштаб. Двойной rAF — чтобы браузер успел
    // отрисовать стартовое состояние до перехода (иначе анимации не будет).
    if (reduce) {
        pop.style.opacity = "1";
    } else {
        pop.style.transform = "translateY(" + (below ? "-5px" : "5px") + ") scale(0.97)";
        pop.style.transition = "opacity 0.14s ease, transform 0.17s cubic-bezier(0.2,0.85,0.25,1)";
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                try { pop.style.opacity = "1"; pop.style.transform = "translateY(0) scale(1)"; } catch (e) {}
            });
        });
    }
    _infoPop = pop; _infoAnchor = anchor;
    setTimeout(function () { document.addEventListener("mousedown", _infoOutside, true); }, 0);
}
// Кружок «?» рядом с настройкой. null, если текста нет (тогда просто ничего не добавляем).
// Текст переводится в одной точке (infoText) — и подсказки контролов, и подписи секций.
function infoDot(text) {
    if (!text) return null;
    text = infoText(text);
    var d = el("span",
        "flex:0 0 auto; width:15px; height:15px; line-height:15px; text-align:center; border-radius:50%;" +
        "font-size:10px; font-weight:700; cursor:help; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16);" +
        "border:1px solid rgba(var(--mlbg-accent-rgb),0.4); user-select:none;", "?");
    d.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); showInfo(d, text); });
    keyActivate(d, t("Пояснение"));
    return d;
}
