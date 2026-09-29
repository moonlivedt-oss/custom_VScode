// ============================================================
//  Описания того, чего нет в стандартных типах браузера.
//
//  Файл нужен ТОЛЬКО проверке типов (tsc --noEmit) и в сборку не попадает: в custom-bg.js
//  уходят лишь модули из списка FILES в build.js. Здесь два вида объявлений:
//
//    1. Глобалы-мостики, которые пробрасывает компаньон-расширение или тестовая фикстура.
//       Скрипт живёт внутри чужого окна и получает данные снаружи именно так.
//    2. Вендорные API, которых нет в lib.dom.d.ts: они реально существуют в Electron/
//       Chromium, но не описаны стандартом (или описаны только как устаревшие).
// ============================================================

interface Window {
    /** Образ конфига из settings.json — пишет компаньон, читает loadCfg(). */
    __MLBG_SEED__?: Record<string, unknown> | null;
    /** Среда: какой загрузчик внедрил скрипт и прозрачно ли окно (см. src/core/env.js). */
    __MLBG_ENV__?: {
        loader?: string;
        version?: string;
        vscode?: string;
        transparent?: boolean;
        script?: string;
    } | null;
    /** Живые данные вручную/в тестах; от компаньона они приходят событием "live" Moon Core (см. src/core/live.js). */
    __MLBG_LIVE__?: {
        rev?: number;
        branch?: string;
        remote?: string;
        dirty?: boolean;
        errors?: number;
        warnings?: number;
        languageId?: string;
        fileExt?: string;
        folder?: string;
    } | null;
    /** Дополнительные пути картинок для библиотеки — компаньон может отдать содержимое папки. */
    __MLBG_LIBRARY__?: string[] | null;
    /** Ставится только тестовой фикстурой: разрешает открыть мост window.__mlbgTest. */
    __MLBG_TEST_HOOKS__?: boolean;
    __MLBG_NO_TOUR__?: boolean;
    /** Узкий мост для интеграционного теста; в реальном воркбенче не создаётся. */
    __mlbgTest?: {
        setBlur(v: number): void;
        selectorHealth(): unknown;
        readability(): unknown;
        loader(): unknown;
        live(): { branch: string, source: string };
    };
    /** Флаг защиты от двойного запуска (ставит обёртка сборки, см. build.js GUARD). */
    __MLBG_RUNNING__?: string;
    /** Рантайм Moon Core: помощник модуля, если плагин встроен ядром (см. src/core/sets.js). */
    __MOONCORE__?: {
        version?: string;
        module?(id: string): MoonCoreModule | null;
    };
    /** Префиксный AudioContext: в Electron есть, в типах — нет. */
    webkitAudioContext?: typeof AudioContext;
}

/** Помощник модуля Moon Core (window.__MOONCORE__.module("mlbg")). */
interface MoonCoreModule {
    id: string;
    name: string;
    version: string;
    /** Адрес папки ресурсов модуля, со слэшем на конце. */
    base: string;
    on(event: string, fn: (data: any) => void): () => void;
    get(event: string): any;
    rpc(method: string, body?: unknown): Promise<{ ok: boolean, result?: unknown, error?: string }>;
    log(where: string, err?: unknown): void;
    connected(): boolean;
    /** Файл данных модуля: синхронно при старте. */
    data(): Record<string, any> | null;
    /** Сохранить файл данных модуля (через мост, пишет хост). */
    saveData(obj: object): Promise<{ ok: boolean, error?: string }>;
    /** Часть модуля в профилях вида Moon Core. */
    profile(hooks: { save(): object, apply(obj: any, name: string): void }): boolean;
    // ---- новое API Moon Core (у старого ядра этих полей нет — проверяй перед вызовом) ----
    /** Уборка модуля: выключение без перезагрузки окна и горячая перезагрузка. */
    onDispose?(fn: () => void): void;
    /** События VS Code своего окна (editor, git, diagnostics...). */
    vscode?: { on?(kind: string, fn: (data: any) => void): () => void };
    /** Общая шина модулей окна. */
    share?(key: string, value: unknown): boolean;
    shared?(key: string, fn: (value: any, from: string) => void): () => void;
    /** Команды модуля в «Moon Core: Команды модулей». */
    commands?: {
        register(list: { id: string, title: string, langs?: string[], context?: boolean }[]): number;
        on(id: string, fn: (ctx: any) => void): () => void;
    };
}

interface Navigator {
    /** Battery Status API: в Chromium/Electron доступен, в lib.dom.d.ts не описан. */
    getBattery?(): Promise<{
        charging: boolean;
        level: number;
        addEventListener(type: string, listener: () => void): void;
    }>;
    /** Старое имя navigator.language — оставлено как запасной путь определения языка. */
    userLanguage?: string;
}
