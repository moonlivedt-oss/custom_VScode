// ===== Шейдерные наборы: живой фон на GPU =====
// Процедурный набор рисуется на canvas один раз и стоит неподвижно. Шейдерный — то же
// «ноль ассетов», но кадр считает видеокарта, поэтому фон может течь и дышать, не занимая CPU.
//
// Чтобы это не стало «ещё одной вечно крутящейся анимацией», слой дисциплинирован: стоит при
// скрытом окне, выключается при системном «уменьшить движение», подчиняется авто-бюджету FPS,
// считает в половину CSS-пикселей и при потере контекста молча уступает место обычному фону.

var SHADERS = {
    // Полярное сияние: несколько «лент» синусов с мягким свечением в акценте.
    aurora:
        "float band(vec2 p, float o, float sp){" +
        " float y = sin(p.x*1.7 + u_time*sp + o)*0.18 + sin(p.x*0.7 - u_time*sp*0.6 + o)*0.10;" +
        " return smoothstep(0.22, 0.0, abs(p.y - y));}" +
        "vec3 render(vec2 p){" +
        " float a = band(p, 0.0, 0.10)*0.9 + band(p, 2.1, 0.07)*0.6 + band(p, 4.2, 0.13)*0.45;" +
        " float glow = smoothstep(1.1, 0.0, length(p*vec2(0.6,1.4)));" +
        " return mix(u_base, u_accent, a*0.55*glow);}",
    // Плазма: классические пересекающиеся синусы, тонированные в палитру набора.
    plasma:
        "vec3 render(vec2 p){" +
        " float t = u_time*0.15;" +
        " float v = sin(p.x*2.2 + t) + sin(p.y*2.6 - t*1.3) + sin((p.x+p.y)*1.7 + t*0.7);" +
        " v = v/3.0*0.5 + 0.5;" +
        " vec3 c = mix(u_base, u_accent, smoothstep(0.35, 1.0, v)*0.5);" +
        " return c + u_accent*0.05*smoothstep(0.9, 1.0, v);}",
    // Туманность: два слоя «шумовых» облаков, медленно расходящихся в разные стороны.
    nebula:
        "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }" +
        "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);" +
        " return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }" +
        "float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<4;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; } return s; }" +
        "vec3 render(vec2 p){" +
        " float t = u_time*0.03;" +
        " float n = fbm(p*1.6 + vec2(t, -t*0.6));" +
        " float m = fbm(p*2.7 - vec2(t*0.7, t));" +
        " float v = smoothstep(0.35, 0.95, n*0.7 + m*0.4);" +
        " return mix(u_base, u_accent, v*0.42);}"
};

var VERT_SRC =
    "attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }";
// Общая обвязка фрагментного шейдера: нормализованные координаты с поправкой на пропорции,
// плюс лёгкий дизеринг — на больших тёмных градиентах он убирает полосатость (banding).
function fragSource(body) {
    return "precision mediump float;\n" +
        "uniform vec2 u_res; uniform float u_time; uniform vec3 u_accent; uniform vec3 u_base; uniform vec2 u_mouse;\n" +
        body + "\n" +
        "void main(){\n" +
        "  vec2 p = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;\n" +
        "  vec3 c = render(p);\n" +
        "  float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453);\n" +
        "  gl_FragColor = vec4(c + (d - 0.5)/255.0, 1.0);\n" +
        "}";
}

function isShaderSet(idx) { var s = SETS[idx]; return !!(s && s.shader && SHADERS[s.shader]); }
function isShader(idx, zone) { return isShaderSet(idx) && !hasUserImg(idx, zone); }

var shd = { canvas: null, gl: null, prog: null, raf: 0, t0: 0, last: 0, u: null, key: "", failed: false };

function shaderHost() {
    // Холст живёт внутри части «редактор»: так он лежит под кодом, но над фоном части, и
    // не перекрывает сайдбар/панель/статусбар. Контейнер редактора VS Code пересоздаёт при
    // смене раскладки — heal() раз в 3 секунды возвращает холст на место.
    return document.querySelector(".part.editor > .content") || document.querySelector(".part.editor");
}
function shaderActive() {
    if (!cfg.enabled || shd.failed) return false;
    if (typeof reduceMotion === "function" && reduceMotion()) return false;
    return isShader(activeIndex(), "editor");
}
function _compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        try { console.warn("[MoonLight custom-bg] шейдер не скомпилировался:", gl.getShaderInfoLog(s)); } catch (e) {}
        gl.deleteShader(s); return null;
    }
    return s;
}
// Собственный GLSL пользователя (cfg.shaderSrc) — «свой фон» без пересборки плагина.
// Ограничиваем только длиной: код исполняется на GPU в песочнице драйвера, к DOM и файлам
// доступа не имеет. В код «Поделиться» он не входит — чужой шейдер на своей машине не запустится.
function shaderBody(name) {
    if (name === "custom") {
        var src = (typeof cfg.shaderSrc === "string") ? cfg.shaderSrc : "";
        return src ? src.slice(0, 8000) : SHADERS.aurora;
    }
    return SHADERS[name] || SHADERS.aurora;
}
function ensureShader() {
    if (!shaderActive()) { shaderStop(); return; }
    var host = shaderHost(); if (!host) return;
    var idx = activeIndex(), s = SETS[idx], key = s.shader + "|" + getAccent() + "|" + (s.base || "");
    // Холст потерялся (VS Code пересобрал редактор) или сменился набор — пересоздаём.
    if (shd.canvas && (!shd.canvas.isConnected || shd.key !== key)) shaderStop();
    if (shd.canvas) { shaderStart(); return; }
    try {
        var c = document.createElement("canvas");
        c.id = "mlbg-shader";
        c.style.cssText = "position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; display:block;";
        var gl = c.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" })
              || c.getContext("experimental-webgl");
        if (!gl) { shd.failed = true; return; }
        var vs = _compile(gl, gl.VERTEX_SHADER, VERT_SRC);
        var fs = _compile(gl, gl.FRAGMENT_SHADER, fragSource(shaderBody(s.shader)));
        if (!vs || !fs) {
            // Свой шейдер не собрался — откатываемся на встроенный, а не гасим фон совсем.
            if (s.shader === "custom") fs = _compile(gl, gl.FRAGMENT_SHADER, fragSource(SHADERS.aurora));
            if (!vs || !fs) { shd.failed = true; return; }
        }
        var p = gl.createProgram();
        gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { shd.failed = true; return; }
        gl.useProgram(p);
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // один большой треугольник
        var loc = gl.getAttribLocation(p, "a_pos");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        shd.u = {
            res: gl.getUniformLocation(p, "u_res"), time: gl.getUniformLocation(p, "u_time"),
            accent: gl.getUniformLocation(p, "u_accent"), base: gl.getUniformLocation(p, "u_base"),
            mouse: gl.getUniformLocation(p, "u_mouse")
        };
        c.addEventListener("webglcontextlost", function (e) { e.preventDefault(); shaderStop(); shd.failed = true; }, false);
        host.insertBefore(c, host.firstChild);
        shd.canvas = c; shd.gl = gl; shd.prog = p; shd.key = key; shd.t0 = 0;
        shaderResize();
        shaderStart();
    } catch (e) { shd.failed = true; }
}
function shaderResize() {
    if (!shd.canvas || !shd.gl) return;
    try {
        // Половина CSS-пикселей: фон мягкий, разницы не видно, а работы GPU вчетверо меньше.
        var w = Math.max(2, Math.round(shd.canvas.clientWidth * 0.5));
        var h = Math.max(2, Math.round(shd.canvas.clientHeight * 0.5));
        if (shd.canvas.width !== w || shd.canvas.height !== h) {
            shd.canvas.width = w; shd.canvas.height = h;
            shd.gl.viewport(0, 0, w, h);
        }
    } catch (e) {}
}
function shaderFrame(ts) {
    shd.raf = 0;
    if (!shd.canvas || !shd.gl || !shaderActive()) return;
    if (document.hidden) return;                       // окно скрыто — кадры никому не нужны
    var save = (typeof perf === "object" && perf && perf.save);
    var minDt = save ? 66 : 33;                        // ~15 или ~30 кадров в секунду: фон медленный, больше не нужно
    if (!shd.t0) shd.t0 = ts;
    if (ts - shd.last >= minDt) {
        shd.last = ts;
        try {
            shaderResize();
            var gl = shd.gl, acc = hexToRgbArr(safeColor(getAccent(), DEFAULTS.accent));
            var s = SETS[activeIndex()], baseHex = isColor(s && s.base) ? s.base : "#11111b";
            var bas = hexToRgbArr(baseHex);
            gl.uniform2f(shd.u.res, shd.canvas.width, shd.canvas.height);
            gl.uniform1f(shd.u.time, (ts - shd.t0) / 1000);
            gl.uniform3f(shd.u.accent, acc[0] / 255, acc[1] / 255, acc[2] / 255);
            gl.uniform3f(shd.u.base, bas[0] / 255, bas[1] / 255, bas[2] / 255);
            gl.uniform2f(shd.u.mouse, mouseNorm.x, mouseNorm.y);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        } catch (e) { shaderStop(); shd.failed = true; return; }
    }
    shd.raf = requestAnimationFrame(shaderFrame);
}
var mouseNorm = { x: 0.5, y: 0.5 };
function shaderStart() {
    if (shd.raf || !shd.canvas) return;
    if (document.hidden || !shaderActive()) return;
    shd.last = 0;
    shd.raf = requestAnimationFrame(shaderFrame);
}
function shaderStop() {
    if (shd.raf) { try { cancelAnimationFrame(shd.raf); } catch (e) {} shd.raf = 0; }
    if (shd.canvas) { try { shd.canvas.remove(); } catch (e) {} }
    shd.canvas = null; shd.gl = null; shd.prog = null; shd.key = "";
}
