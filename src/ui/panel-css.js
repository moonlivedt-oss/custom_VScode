// ===== Таблица стилей панели =====
// Внешний вид панели в духе окна настроек cpp-docs-panel: карточка с мягким акцентным
// отблеском, вкладки колонкой слева со значками, заголовок страницы с подписью, секции-карточки,
// свитчи вместо чекбоксов, сегменты вместо коротких селектов, ползунки с заливкой.
// Раньше каждый контрол нёс весь стиль инлайном; общие элементы (поля, чекбоксы, ползунки)
// теперь оформляет этот лист по тегу/классу внутри панели, так что старые фабрики тоже
// выглядят по-новому без переписывания. Цвета — из --mlp-* (их задаёт togglePanel под тему)
// и --mlbg-accent / --mlbg-accent-rgb (акцент активного набора).
var PANEL_CSS_ID = "moonlight-bg-panel-css";
function panelCss() {
    var P = "#moonlight-bg-panel", Q = "#moonlight-bg-qmenu";
    var A = "rgba(var(--mlbg-accent-rgb,203,166,247),";   // + "0.2)" — акцент с прозрачностью
    var T = "rgba(var(--mlp-tint,205,214,244),";          // + "0.06)" — нейтральный оттенок темы
    return [
        "@keyframes mlp-pop{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}",
        "@keyframes mlp-page{from{opacity:0;transform:translateX(4px)}to{opacity:1;transform:none}}",
        P + "{display:flex;flex-direction:column;overflow:hidden;padding:0;border-radius:16px;animation:mlp-pop .18s cubic-bezier(.2,.9,.3,1.2);" +
            "box-shadow:0 24px 70px rgba(0,0,0,.45),0 0 0 1px " + A + "0.10);}",
        P + "::before{content:'';position:absolute;inset:0 0 auto 0;height:130px;pointer-events:none;" +
            "background:radial-gradient(120% 100% at 0% 0%," + A + "0.22),transparent 70%);}",
        // шапка
        P + " .mlp-head{position:relative;display:flex;align-items:center;gap:10px;padding:12px 12px 10px 14px;cursor:move;user-select:none;}",
        P + " .mlp-hic{flex:0 0 auto;width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;" +
            "background:" + A + "0.16);border:1px solid " + A + "0.35);}",
        P + " .mlp-hic img{width:26px;height:26px;border-radius:6px;}",
        P + " .mlp-ht{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px;}",
        P + " .mlp-ht b{font-size:14px;font-weight:700;letter-spacing:.2px;color:var(--mlp-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
        P + ".mlp-narrow .mlp-ht span{display:none;}",
        P + " .mlp-ht span{font-size:11px;color:var(--mlp-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
        P + " .mlp-hbtn{flex:0 0 auto;min-width:28px;height:28px;padding:0 8px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:5px;" +
            "border-radius:9px;cursor:pointer;font-size:12px;color:var(--mlp-muted);background:" + T + "0.05);border:1px solid var(--mlp-border-faint);transition:background .12s,border-color .12s,color .12s;}",
        P + " .mlp-hbtn:hover{color:var(--mlp-fg);background:" + A + "0.18);border-color:" + A + "0.45);}",
        P + " .mlp-hbtn.on{color:var(--mlbg-accent);background:" + A + "0.18);border-color:" + A + "0.5);}",
        P + " .mlp-hbtn.off{opacity:.4;cursor:default;}",
        // верхняя полоса: мастер-выключатель + поиск
        P + " .mlp-top{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 14px 10px;}",
        P + " .mlp-master{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:6px 11px;border-radius:11px;cursor:pointer;" +
            "background:" + A + "0.12);border:1px solid " + A + "0.3);font-weight:600;}",
        P + " .mlp-master.off{background:" + T + "0.05);border-color:var(--mlp-border-faint);color:var(--mlp-muted);}",
        P + " .mlp-search{position:relative;flex:1 1 180px;min-width:0;}",
        P + " .mlp-fav{padding:0 14px 8px;}",
        // тело: вкладки слева + страница
        P + " .mlp-body{position:relative;flex:1 1 auto;min-height:0;display:flex;border-top:1px solid var(--mlp-border-faint);}",
        P + " .mlp-nav{flex:0 0 164px;box-sizing:border-box;padding:10px 8px;display:flex;flex-direction:column;gap:3px;overflow-y:auto;" +
            "border-right:1px solid var(--mlp-border-faint);background:" + T + "0.025);}",
        P + " .mlp-tab{position:relative;display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:11px;cursor:pointer;" +
            "font-size:12px;font-weight:600;color:var(--mlp-muted);border:1px solid transparent;transition:background .12s,color .12s;}",
        P + " .mlp-tab:hover{color:var(--mlp-fg);background:" + T + "0.06);}",
        P + " .mlp-tab.on{color:var(--mlp-fg);background:linear-gradient(90deg," + A + "0.24)," + A + "0.08));border-color:" + A + "0.45);box-shadow:inset 3px 0 0 var(--mlbg-accent);}",
        P + " .mlp-tic{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:" + T + "0.06);}",
        P + " .mlp-tab.on .mlp-tic{background:" + A + "0.2);}",
        P + " .mlp-tic img{width:21px;height:21px;}",
        P + " .mlp-tl{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
        P + " .mlp-badge{flex:0 0 auto;min-width:16px;height:16px;line-height:14px;padding:0 4px;box-sizing:border-box;border-radius:8px;font-size:9.5px;font-weight:700;text-align:center;" +
            "color:var(--mlbg-accent);background:" + A + "0.18);border:1px solid " + A + "0.45);}",
        P + " .mlp-pages{flex:1 1 auto;min-width:0;overflow-y:auto;overflow-x:hidden;padding:12px 14px 16px;}",
        P + " .mlp-page{animation:mlp-page .16s ease-out;}",
        P + " .mlp-ph{display:flex;flex-direction:column;gap:2px;margin:0 2px 4px;}",
        P + " .mlp-ph b{font-size:15px;font-weight:700;color:var(--mlp-fg);}",
        P + " .mlp-ph span{font-size:11px;color:var(--mlp-faint);}",
        // узкая панель: вкладки только значками
        P + ".mlp-narrow .mlp-nav{flex-basis:50px;padding:10px 6px;}",
        P + ".mlp-narrow .mlp-tl{display:none;}",
        P + ".mlp-narrow .mlp-tab{justify-content:center;padding:6px 4px;}",
        P + ".mlp-narrow .mlp-badge{position:absolute;top:-3px;right:-3px;}",
        // секции-карточки
        P + " .mlp-sec{margin-top:10px;border-radius:13px;background:" + T + "0.035);border:1px solid var(--mlp-border-faint);overflow:hidden;}",
        P + " .mlp-sec.hid{opacity:.55;}",
        P + " .mlp-sec-h{display:flex;align-items:center;gap:8px;padding:9px 11px;cursor:pointer;border-radius:13px;transition:background .12s;}",
        P + " .mlp-sec-h:hover{background:" + A + "0.08);}",
        P + " .mlp-sec-t{flex:1 1 auto;min-width:0;font-size:12.5px;font-weight:700;color:var(--mlp-head);}",
        P + " .mlp-chev{flex:0 0 auto;width:14px;text-align:center;color:var(--mlp-faint);font-size:10px;transition:transform .15s;}",
        P + " .mlp-sec.open .mlp-chev{transform:rotate(90deg);color:var(--mlbg-accent);}",
        P + " .mlp-sec-b{padding:0 10px 10px;}",
        // кнопки
        P + " .mlp-btn{flex:1 1 0;padding:7px 10px;text-align:center;border-radius:10px;cursor:pointer;font-weight:600;font-size:12px;" +
            "color:var(--mlp-fg);background:" + T + "0.06);border:1px solid var(--mlp-border-soft);transition:background .12s,border-color .12s;}",
        P + " .mlp-btn:hover{background:" + A + "0.18);border-color:" + A + "0.45);}",
        P + " .mlp-btn.off{opacity:.45;cursor:default;}",
        P + " .mlp-danger{margin-top:14px;padding:10px;border-radius:13px;border:1px solid rgba(243,139,168,.3);background:rgba(243,139,168,.06);}",
        P + " .mlp-danger .mlp-btn{color:#f38ba8;border-color:rgba(243,139,168,.35);background:rgba(243,139,168,.10);}",
        P + " .mlp-danger .mlp-btn:hover{background:rgba(243,139,168,.2);}",
        // сегменты
        P + " .mlp-seg{display:inline-flex;flex:0 1 auto;flex-wrap:wrap;gap:2px;padding:2px;border-radius:10px;background:var(--mlp-field);border:1px solid var(--mlp-border-soft);}",
        P + " .mlp-seg button{all:unset;box-sizing:border-box;padding:4px 11px;border-radius:8px;cursor:pointer;font-size:11.5px;color:var(--mlp-muted);white-space:nowrap;}",
        P + " .mlp-seg button:hover{color:var(--mlp-fg);background:" + T + "0.08);}",
        P + " .mlp-seg button.on{color:var(--mlp-on-accent,#1e1e2e);background:var(--mlbg-accent);font-weight:600;}",
        P + " .mlp-seg button:focus-visible{outline:2px solid var(--mlbg-accent);outline-offset:1px;}",
        // поля
        P + " input[type=text]," + P + " input:not([type])," + P + " textarea," + P + " select{border-radius:8px !important;padding:5px 8px !important;outline:none;}",
        P + " input[type=text]:focus," + P + " textarea:focus," + P + " select:focus{border-color:" + A + "0.6) !important;box-shadow:0 0 0 2px " + A + "0.18);}",
        // свитч вместо чекбокса
        P + " input[type=checkbox]{-webkit-appearance:none;appearance:none;flex:0 0 auto;position:relative;width:30px;height:17px;margin:0 2px 0 0;border-radius:9px;cursor:pointer;" +
            "background:" + T + "0.2);border:1px solid var(--mlp-border-soft);transition:background .15s,border-color .15s;}",
        P + " input[type=checkbox]::after{content:'';position:absolute;top:1px;left:1px;width:13px;height:13px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .15s;}",
        P + " input[type=checkbox]:checked{background:var(--mlbg-accent);border-color:var(--mlbg-accent);}",
        P + " input[type=checkbox]:checked::after{transform:translateX(13px);}",
        P + " input[type=checkbox]:focus-visible{outline:2px solid var(--mlbg-accent);outline-offset:2px;}",
        // ползунок с заливкой до значения (--p ставит makeSlider)
        P + " input[type=range]{-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;cursor:pointer;margin:0 2px;" +
            "background:linear-gradient(90deg,var(--mlbg-accent) var(--p,50%)," + T + "0.18) var(--p,50%));}",
        P + " input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--mlbg-accent);box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.4);}",
        P + " input[type=range]:focus-visible{outline:2px solid " + A + "0.6);outline-offset:3px;}",
        // карточки наборов
        P + " .mlp-sets{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;}",
        P + " .mlp-set{position:relative;display:flex;flex-direction:column;border-radius:11px;overflow:hidden;cursor:pointer;background:" + T + "0.04);" +
            "border:1px solid var(--mlp-border-soft);transition:border-color .12s,transform .12s;}",
        P + " .mlp-set:hover{border-color:" + A + "0.6);transform:translateY(-1px);}",
        P + " .mlp-set.on{border-color:var(--mlbg-accent);box-shadow:0 0 0 2px " + A + "0.35);}",
        P + " .mlp-set-pv{position:relative;height:52px;overflow:hidden;}",
        P + " .mlp-set-nm{display:flex;align-items:center;gap:4px;padding:5px 7px 6px;font-size:11px;color:var(--mlp-fg);white-space:nowrap;overflow:hidden;}",
        P + " .mlp-set-nm span{overflow:hidden;text-overflow:ellipsis;}",
        P + " .mlp-set.on .mlp-set-nm{font-weight:700;}",
        P + " .mlp-set-no{flex:0 0 auto;font-size:10px;font-weight:700;color:var(--mlp-faint);}",
        P + " .mlp-set.on .mlp-set-no{color:var(--mlbg-accent);}",
        P + " .mlp-set-rand{align-items:center;justify-content:center;}",
        P + " .mlp-set-rand .mlp-set-pv{display:flex;align-items:center;justify-content:center;background:" + A + "0.10);}",
        P + " .mlp-set-rand img{width:36px;height:36px;}",
        P + " .mlp-set-star{position:absolute;top:3px;right:4px;z-index:3;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;font-size:12px;cursor:pointer;" +
            "color:#fff;background:rgba(0,0,0,.45);opacity:0;transition:opacity .12s;}",
        P + " .mlp-set:hover .mlp-set-star," + P + " .mlp-set-star.on," + P + " .mlp-set-star:focus-visible{opacity:1;}",
        P + " .mlp-set-star.on{color:#f9e2af;}",
        P + " .mlp-hbtn img{width:16px;height:16px;}",
        // «Сейчас работает» на вкладке «Авто-смена»
        P + " .mlp-now{display:flex;align-items:center;gap:11px;margin:8px 0 2px;padding:9px 11px;border-radius:13px;" +
            "background:" + A + "0.10);border:1px solid " + A + "0.35);}",
        P + " .mlp-now-pv{flex:0 0 auto;width:64px;height:38px;border-radius:8px;}",
        P + " .mlp-now-t{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;}",
        P + " .mlp-now-t b{font-size:12.5px;color:var(--mlp-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
        P + " .mlp-now-t span{font-size:11px;color:var(--mlp-muted);}",
        // образец терминала
        P + " .mlp-term{margin:2px 0 8px;padding:10px 12px;border-radius:10px;background:#11111b;color:#cdd6f4;font-size:12.5px;line-height:1.6;" +
            "border:1px solid var(--mlp-border-soft);white-space:pre;overflow:hidden;}",
        P + " .mlp-term-cur{display:inline-block;vertical-align:text-bottom;animation:mlp-blink 1.1s steps(1) infinite;}",
        "@keyframes mlp-blink{50%{opacity:0}}",
        // образцы цвета
        P + " .mlp-sw-box{display:flex;flex-direction:column;gap:4px;padding:3px 2px 6px;}",
        P + " .mlp-sw-row{display:flex;flex-wrap:wrap;align-items:center;gap:5px;}",
        P + " .mlp-sw-row>span{flex:0 0 86px;font-size:10.5px;color:var(--mlp-faint);}",
        P + " .mlp-sw-row>span:empty{display:none;}",
        P + " .mlp-sw{width:18px;height:18px;border-radius:50%;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);transition:transform .1s;}",
        P + " .mlp-sw:hover{transform:scale(1.15);}",
        P + " .mlp-sw.on{box-shadow:0 0 0 2px var(--mlp-bg),0 0 0 4px var(--mlp-fg);}",
        // группы эффектов — карточки
        P + " .mlp-fxg{margin-top:6px;border-radius:10px;border:1px solid var(--mlp-border-faint);background:" + T + "0.025);}",
        P + " .mlp-fxg-h{display:flex;align-items:center;gap:7px;padding:6px 9px;cursor:pointer;border-radius:10px;font-size:11px;font-weight:700;color:var(--mlp-head);}",
        P + " .mlp-fxg-h:hover{background:" + A + "0.08);}",
        P + " .mlp-fxg.open .mlp-chev{transform:rotate(90deg);color:var(--mlbg-accent);}",
        P + " .mlp-fxg-n{flex:0 0 auto;font-size:10px;font-weight:600;padding:1px 7px;border-radius:8px;color:var(--mlp-faint);background:" + T + "0.06);}",
        P + " .mlp-fxg-n.on{color:var(--mlbg-accent);background:" + A + "0.16);}",
        P + " .mlp-fxg-b{padding:0 6px 6px;}",
        P + " .mlp-empty{display:flex;align-items:center;gap:10px;padding:8px 6px;font-size:11.5px;color:var(--mlp-muted);}",
        P + " .mlp-empty img{flex:0 0 auto;width:44px;height:44px;opacity:.9;}",
        P + " .mlp-news{display:flex;align-items:flex-start;gap:10px;margin:8px 0 2px;padding:10px 11px;border-radius:13px;font-size:11.5px;line-height:1.5;color:var(--mlp-muted);" +
            "background:linear-gradient(135deg," + A + "0.16)," + A + "0.05));border:1px solid " + A + "0.4);}",
        P + " .mlp-news b{display:block;margin-bottom:2px;font-size:12.5px;color:var(--mlp-fg);}",
        P + " .mlp-news img{flex:0 0 auto;width:28px;height:28px;}",
        P + " .mlp-tip{display:flex;align-items:center;gap:8px;padding:7px 8px 7px 11px;border-radius:11px;font-size:11.5px;color:var(--mlp-fg);" +
            "background:rgba(249,226,175,.10);border:1px solid rgba(249,226,175,.35);}",
        P + ".mlp-drop{box-shadow:0 0 0 3px var(--mlbg-accent),0 24px 70px rgba(0,0,0,.45);}",
        P + " .mlp-rule-n{flex:0 0 auto;width:18px;height:18px;line-height:18px;border-radius:50%;text-align:center;font-size:10px;font-weight:700;color:var(--mlp-faint);background:" + T + "0.08);}",
        P + " .mlp-rule-n.on{color:var(--mlp-on-accent,#1e1e2e);background:var(--mlbg-accent);}",
        P + " .mlp-rule-s{flex:0 0 auto;font-size:10px;font-weight:600;padding:1px 7px;border-radius:8px;color:var(--mlp-faint);background:" + T + "0.06);}",
        P + " .mlp-rule-s.on{color:var(--mlbg-accent);background:" + A + "0.16);}",
        P + " .mlp-inl{grid-column:1/-1;margin:0 0 4px 26px;padding:2px 6px 4px;border-left:2px solid " + A + "0.35);}",
        P + " .mlp-focus{position:relative;width:100%;aspect-ratio:16/9;max-height:150px;margin:0 auto;border-radius:9px;cursor:crosshair;background-size:100% 100%;background-color:" + T + "0.06);border:1px solid var(--mlp-border-soft);}",
        P + " .mlp-focus-dot{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #fff;background:var(--mlbg-accent);box-shadow:0 0 0 2px rgba(0,0,0,.4);pointer-events:none;}",
        P + " .mlp-chip{padding:3px 9px;border-radius:8px;cursor:pointer;font-size:11px;color:var(--mlp-fg);background:" + T + "0.06);border:1px solid var(--mlp-border-soft);}",
        P + " .mlp-chip:hover{border-color:" + A + "0.55);background:" + A + "0.14);}",
        // быстрое меню у кнопки BG
        Q + "{animation:mlp-pop .14s ease-out;}",
        Q + " .mlp-qsets{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:3px 6px 6px;}",
        Q + " .mlp-qset{position:relative;height:34px;border-radius:7px;cursor:pointer;border:1px solid rgba(255,255,255,.14);transition:transform .1s;}",
        Q + " .mlp-qset:hover{transform:translateY(-1px);border-color:rgba(var(--mlbg-accent-rgb),.7);}",
        Q + " .mlp-qset.on{border:2px solid var(--mlbg-accent);}",
        "@media (prefers-reduced-motion: reduce){" + P + "," + P + " .mlp-page," + P + " .mlp-term-cur," + Q + "{animation:none !important;}" + P + " *{transition:none !important;}}"
    ].join("\n");
}
function ensurePanelCss() {
    try {
        var s = document.getElementById(PANEL_CSS_ID);
        if (s) return;
        s = document.createElement("style"); s.id = PANEL_CSS_ID;
        s.textContent = panelCss();
        (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
}
