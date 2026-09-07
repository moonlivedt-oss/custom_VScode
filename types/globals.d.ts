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
        live?: string;
    } | null;
    /** Живые данные от компаньона: ветка, ошибки, язык файла, папка (см. extension/live.js). */
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
    /** Узкий мост для интеграционного теста; в реальном воркбенче не создаётся. */
    __mlbgTest?: {
        setBlur(v: number): void;
        selectorHealth(): unknown;
        readability(): unknown;
        loader(): unknown;
        live(): { branch: string, source: string };
    };
    /** Префиксный AudioContext: в Electron есть, в типах — нет. */
    webkitAudioContext?: typeof AudioContext;
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
