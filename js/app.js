/* Moneymaking G iPhone web app */
(function () {
  const BOT_COLORS = {
    scanner: "#64D2FF",
    analyst: "#BF5AF2",
    brain: "#FFD60A",
    executor: "#30D158",
    risk: "#FF453A",
    research: "#5E5CE6",
    whale: "#00C7BE",
    sentiment: "#FF375F",
    rug_guard: "#FF9F0A",
    portfolio: "#0A84FF",
    reviewer: "#C7A068",
    rug_guard: "#FF9F0A",
    regime: "#98989D",
    majors: "#FFB340",
    shadow: "#8E8E93",
    telegram: "#2AABEE"
  };
  const BOT_ORDER = [
    "scanner", "analyst", "brain", "executor", "risk",
    "research", "whale", "sentiment",
    "rug_guard", "portfolio", "reviewer"
  ];
  const BOT_GROUPS = [
    { title: "Kärnan", names: ["scanner", "analyst", "brain", "executor", "risk"] },
    { title: "Marknaden", names: ["regime", "majors", "research", "whale", "sentiment"] },
    { title: "Skydd & portfölj", names: ["rug_guard", "portfolio", "reviewer", "shadow", "telegram"] }
  ];
  const MAJORS = new Set(["SOL", "JUP", "JTO", "BONK", "WIF", "PYTH", "RAY"]);
  const LANE_LABELS = { memecoins: "Memecoins", majors: "Större coins", gold: "Guld", commodities: "Råvaror", stocks: "Aktier", assets: "Tillgångar" };
  const APP_NAME = "Moneymaking G";

  const $app = document.getElementById("app");
  const state = {
    route: parseRoute(),
    loading: true,
    error: null,
    desk: null,
    chartRange: "today",
    moversSide: "best",
    movers: null,
    chart: null,
    activity: null,
    activityFilter: "all",
    laneFilter: "all",
    coin: null,
    audit: null,
    bot: null,
    toast: "",
    lightbox: false
  };

  function parseRoute() {
    let h = (location.hash || "").replace(/^#/, "");
    if (h.startsWith("t=")) h = "";
    if (!h || h === "/") return { name: "home" };
    const parts = h.replace(/^\//, "").split("/").filter(Boolean);
    const a = parts[0];
    if (a === "home") return { name: "home" };
    if (a === "activity") return { name: "activity" };
    if (a === "account") return { name: "account" };
    if (a === "bots" && parts[1]) return { name: "bot", bot: decodeURIComponent(parts[1]) };
    if (a === "bots") return { name: "bots" };
    if (a === "coin" && parts[1]) return { name: "coin", mint: decodeURIComponent(parts[1]) };
    if (a === "audit" && parts[1]) return { name: "audit", mint: decodeURIComponent(parts[1]) };
    if (a === "chat") return { name: "chat", bot: parts[1] ? decodeURIComponent(parts[1]) : null };
    return { name: "home" };
  }

  function go(hash) {
    const full = hash.startsWith("#") ? hash : "#" + hash;
    if (location.hash === full) {
      state.route = parseRoute();
      render({ keepScroll: false });
      loadRoute();
      return;
    }
    location.hash = full;
  }

  function h(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtUsd(n, opts) {
    if (n == null || !isFinite(n)) return "—";
    const neg = n < 0 ? "−" : "";
    const abs = Math.abs(n);
    if (abs >= 1000 && !(opts && opts.exact)) return neg + "$" + compact(abs);
    if (abs >= 100) {
      const d = Math.abs(abs - Math.round(abs)) < 0.005 ? 0 : 2;
      return neg + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    if (abs >= 1) {
      return neg + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (abs === 0) return "$0.00";
    let s = abs.toFixed(abs < 0.0001 ? 8 : abs < 0.01 ? 6 : 4);
    s = s.replace(/0+$/, "").replace(/\.$/, "");
    return neg + "$" + s;
  }

  function compact(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(Math.round(n));
  }

  function fmtPct(n) {
    if (n == null || !isFinite(n)) return "—";
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return sign + Math.abs(n).toFixed(Math.abs(n) < 1 ? 2 : 1) + "%";
  }

  function chgClass(n) {
    if (n > 0.0000001) return "up";
    if (n < -0.0000001) return "down";
    return "flat";
  }


  const CHART_RANGES = [["today", "Idag"], ["7d", "7 d"], ["30d", "30 d"], ["month", "Månad"], ["year", "År"], ["start", "Sedan start"]];

  function chartRangeButtons() {
    const avail = (state.chart && state.chart.ranges) || CHART_RANGES.map((x) => x[0]);
    const cur = avail.includes(state.chartRange) ? state.chartRange : (avail[0] || "today");
    return CHART_RANGES.filter(([id]) => avail.includes(id)).map(([id, lab]) =>
      `<button type="button" data-range="${id}" class="${cur === id ? "on" : ""}">${lab}</button>`
    ).join("");
  }

  function chartSummary(c) {
    if (!c || c.start_equity == null || c.end_equity == null) return "";
    const chg = c.change_usd, pct = c.change_pct;
    return `<div class="chart-summary">
      <div class="muted small">Start ${h(fmtUsd(c.start_equity, { exact: true }))} → nu ${h(fmtUsd(c.end_equity, { exact: true }))}</div>
      <div class="chg ${chgClass(chg)} nums">${chg >= 0 ? "+" : ""}${h(fmtUsd(chg, { exact: true }))} <span class="sub">(${h(fmtPct(pct))})</span></div>
    </div>`;
  }

  function relTime(ts) {
    if (!ts) return "";
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 10) return "nyss";
    if (s < 60) return s + " s sedan";
    const m = Math.round(s / 60);
    if (m < 60) return m + " min sedan";
    const hr = Math.round(m / 60);
    if (hr < 24) return hr + " h sedan";
    const d = Math.round(hr / 24);
    return d + " d sedan";
  }

  function shortAddr(a) {
    if (!a) return "";
    if (a.length <= 12) return a;
    return a.slice(0, 8) + "…" + a.slice(-4);
  }

  function initials(sym) {
    return String(sym || "?").slice(0, 3).toUpperCase();
  }

  function tokenAvatar(symbol, mint) {
    const hue = hashHue(mint || symbol || "");
    return `<div class="token-fallback" style="background:hsl(${hue} 28% 22%)">${h(initials(symbol))}</div>`;
  }

  function hashHue(s) {
    let x = 0;
    for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return x % 360;
  }

  function laneOf(item) {
    if (!item) return null;
    const raw = String(item.lane || "").toLowerCase();
    if (raw === "memecoin" || raw === "memecoins") return "memecoins";
    if (raw === "majors" || raw === "gold" || raw === "commodities" || raw === "stocks" || raw === "assets") return raw;
    if (item.symbol && MAJORS.has(String(item.symbol).toUpperCase())) return "majors";
    if (item.mint) return "memecoins";
    return null;
  }

  function matchesLane(item, filter) {
    if (!filter || filter === "all") return true;
    return laneOf(item) === filter;
  }

  function laneChip(lane) {
    if (!lane) return "";
    const id = laneOf({ lane }) || (lane === "majors" ? "majors" : "memecoins");
    return `<span class="lane lane-${id}">${h(LANE_LABELS[id] || id)}</span>`;
  }

  function laneFilterRow() {
    const opts = [["all", "Alla"], ["memecoins", "Memecoins"], ["majors", "Större coins"], ["gold", "Guld"]];
    return `<div class="filters lane-filters">
      ${opts.map(([id, lab]) => `<button type="button" data-lane="${id}" class="${state.laneFilter === id ? "on" : ""}">${lab}</button>`).join("")}
    </div>`;
  }

  function svg(name) {
    const icons = {
      home: '<svg viewBox="0 0 26 26" fill="currentColor"><path d="M12.2 3.2a1.3 1.3 0 0 1 1.6 0l8.2 6.6c.5.4.2 1.2-.4 1.2H20v9.1A1.9 1.9 0 0 1 18.1 22h-2.6a.9.9 0 0 1-.9-.9v-5.1h-3.2v5.1a.9.9 0 0 1-.9.9H8a1.9 1.9 0 0 1-1.9-1.9V11H4.4c-.6 0-.9-.8-.4-1.2l8.2-6.6z"/></svg>',
      bots: '<svg viewBox="0 0 26 26" fill="currentColor"><path d="M13 3.2a1.3 1.3 0 0 1 1.3 1.3v1.1h3.2A3.3 3.3 0 0 1 20.8 8.9v2.1h.9a1.3 1.3 0 0 1 0 2.6h-.9v2.1a3.3 3.3 0 0 1-3.3 3.3h-3.2v1.2a1.3 1.3 0 1 1-2.6 0v-1.2H8.5a3.3 3.3 0 0 1-3.3-3.3v-2.1h-.9a1.3 1.3 0 0 1 0-2.6h.9V8.9A3.3 3.3 0 0 1 8.5 5.6h3.2V4.5A1.3 1.3 0 0 1 13 3.2zm-3.2 8.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm6.4 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/></svg>',
      activity: '<svg viewBox="0 0 26 26" fill="currentColor"><path d="M4.2 13a1.2 1.2 0 0 1 1.2-1.2h3.1l2-5.4a1.2 1.2 0 0 1 2.26.08L15.3 16l1.3-3.1a1.2 1.2 0 0 1 1.1-.7h3.1a1.2 1.2 0 1 1 0 2.4h-2.3l-2.1 5.1a1.2 1.2 0 0 1-2.26-.06L11.6 9.9l-1.2 3.2a1.2 1.2 0 0 1-1.12.7H5.4A1.2 1.2 0 0 1 4.2 13z"/></svg>',
      account: '<svg viewBox="0 0 26 26" fill="currentColor"><path d="M13 3.2a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4zM13 15c4.8 0 8.8 2.4 8.8 5.3v1.1c0 .7-.6 1.4-1.4 1.4H5.6c-.8 0-1.4-.7-1.4-1.4v-1.1C4.2 17.4 8.2 15 13 15z"/></svg>',
      back: '<svg viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10l8 8"/></svg>',
      chev: '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 1l6 6-6 6"/></svg>'
    };
    return icons[name] || "";
  }

  function pillPaperOrLive(mode) {
    const isPaper = String(mode || "PAPER").toUpperCase() !== "LIVE";
    return isPaper
      ? `<span class="pill pill-paper">PAPER</span>`
      : `<span class="pill pill-live">LIVE</span>`;
  }

  function tabbar(active) {
    if (!active) return "";
    const tabs = [
      ["home", "Hem", "home"],
      ["bots", "Botar", "bots"],
      ["activity", "Händelser", "activity"],
      ["account", "Konto", "account"]
    ];
    return `<nav class="tabbar">${tabs.map(([id, label, icon]) => `
      <a class="tab ${active === id ? "on" : ""}" href="#/${id}" data-nav="#/${id}">
        ${svg(icon)}<span>${label}</span>
      </a>`).join("")}</nav>`;
  }

  function passcodeForm(err) {
    const msg = err ? `<p class="lock-error">${h(err)}</p>` : "";
    return `<form data-pass-form class="token-form" autocomplete="off">
      <input type="password" name="code" autocomplete="current-password" spellcheck="false" placeholder="Din kod" aria-label="Din kod">
      <label class="remember"><input type="checkbox" name="remember"> Kom ihåg på den här enheten</label>
      ${msg}
      <button type="submit" class="btn btn-primary" data-pass-submit>Öppna</button>
    </form>`;
  }

  function topbar(opts) {
    const o = opts || {};
    const left = o.back
      ? `<button class="back-btn" data-nav="${h(o.back)}">${svg("back")} ${h(o.backLabel || "Tillbaka")}</button>`
      : (o.left || "");
    return `<header class="topbar">
      <div class="left">${left}</div>
      <h1>${h(o.title || APP_NAME)}</h1>
      <div class="right">${o.right || ""}</div>
    </header>`;
  }

  function skeleton() {
    return `<div class="screen"><div class="page">
      <div class="skel skel-hero"></div>
      <div class="skel skel-line" style="width:40%"></div>
      <div class="skel skel-chart"></div>
      <div class="skel skel-card"></div>
      <div class="skel skel-card"></div>
    </div></div>`;
  }

  function errorView(msg, back) {
    return `${topbar({ title: APP_NAME, back: back || null, backLabel: "Tillbaka" })}
      <div class="screen"><div class="state">
        <div class="ico">⚠️</div>
        <h3>Kunde inte ladda</h3>
        <p>${h(msg || "Moneymaking G svarade inte.")}</p>
        <button class="btn btn-primary" data-action="retry" style="margin-top:20px">Försök igen</button>
      </div></div>`;
  }

  function emptyView(title, body) {
    return `<div class="state"><div class="ico">—</div><h3>${h(title)}</h3><p>${h(body)}</p></div>`;
  }

  /* ---------- screens ---------- */

  // ---- greeting banner (Europe/Stockholm, live clock) ----
  const TZ = "Europe/Stockholm";
  function sthlmParts(now) {
    const f = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const time = f.format(now);
    const hour = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now));
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(now);
    return { time, hour, date };
  }
  function greetingFor(hour) {
    if (hour >= 5 && hour < 10) return "God morgon bossen ☕";
    if (hour >= 10 && hour < 18) return "Tjena bossen 👑";
    if (hour >= 18 && hour < 23) return "God kväll bossen 🌆";
    return "Sent uppe, bossen? 🌙";
  }
  const FUN = {
    record: ["Nytt rekord, bossen! 🏆", "Högsta värdet hittills – snyggt 📈", "Rekordnivå! Botarna är på hugget 🚀",
             "Botarnas bästa läge hittills 🥇", "Ny topp – vi firar med en kaffe ☕", "Rekord! Men stop-lossen sitter kvar 🛡️",
             "Toppen är nådd… för idag 😎", "Ny högstanivå – lugnt och metodiskt 🧠"],
    bigGreen: ["Pengamaskinen rullar 💸", "Bossen vinner igen 👑", "Grön dag, glada botar 🍀", "Botarna är i form idag 💪",
               "Det här är en riktigt bra dag 🌞", "Allt går åt rätt håll just nu 📈", "Snygg dag – men vi håller i reglerna 🧠",
               "Kassan ler idag 😄", "Grönt så långt ögat når 🟢"],
    smallGreen: ["Lite plus är också plus ✅", "Stadigt framåt 🐢", "Små steg uppåt 👣", "Lugnt och grönt 🌱",
                 "Det tickar på i rätt riktning ⏱️", "Lite grönt i kanten 🍃", "Sakta men säkert 🧱", "Plus på kontot, lugn i magen 😌"],
    flat: ["Botarna letar efter nästa coin 🔎", "Lugn dag – vi väntar på rätt läge 🎣", "Inga affärer än, bara bevakning 👀",
           "Tålamod är också en strategi ⏳", "Radarn är på 📡", "Stilla vatten idag 🌊", "Vi köper bara när det känns rätt 🎯",
           "Kaffe och koll ☕", "Inget hast, inget slarv 🧘"],
    smallRed: ["Lite minus – helt normalt 🌦️", "Stop-lossen gjorde sitt jobb 🛡️", "En liten svacka, botarna håller koll 👀",
               "Inte varje dag kan vara grön 🍂", "Små förluster, stora lärdomar 📚", "Vi tar en kaffe och väntar ut det ☕",
               "Lugnt, reglerna gäller fortfarande 🧭", "Lite gråväder på marknaden ☁️"],
    bigRed: ["Aj aj, marknaden är sur idag 🥶 men botarna håller koll", "Vi tar en kaffe och väntar ut det ☕",
             "Stop-lossen gjorde sitt jobb 🛡️", "Tuff dag – skyddet är på 🧯", "Stormigt ute, botarna står kvar ⛈️",
             "Lugnt, botarna håller koll 🛡️", "Andas – vi följer planen 🧘", "Regnet går över, reglerna står kvar 🌧️",
             "Nu lär sig botarna något nytt 📚"],
    paused: ["Paus i köpen – botarna vaktar det som redan finns 🛡️", "Vi sitter still en stund ⏸️", "Köpen vilar, skyddet jobbar 🧯",
             "Andningspaus för botarna 🫁", "Säkerheten först – vi väntar ⏳", "Pausat, men inte sovande 👀",
             "Ny chans kommer – just nu väntar vi 🕰️", "Lugn paus, inga nya köp 🧊"],
  };
  function funLine(d) {
    if (!d) return "";
    const eq = Number(d.equity_usd || 0);
    const pnl = Number(d.pnl_today_usd || 0);
    const pct = eq ? (100 * pnl) / Math.max(1, eq - pnl) : 0;
    const m = d.market && d.market.regime;
    let k = "flat";
    if (d.entries_paused || m === "RED") k = "paused";
    else if (d.record_high) k = "record";
    else if (pct >= 3) k = "bigGreen";
    else if (pnl > 0) k = "smallGreen";
    else if (pct <= -3) k = "bigRed";
    else if (pnl < 0) k = "smallRed";
    const pool = FUN[k];
    return pool[Math.floor(Date.now() / 180000) % pool.length]; // byts var 3:e minut
  }
  function greetingBanner(d) {
    const p = sthlmParts(new Date());
    return `<section class="greet" aria-live="off">
      <div class="greet-top"><span class="greet-hi" id="greet-hi">${h(greetingFor(p.hour))}</span>
      <span class="greet-clock nums" id="greet-clock">${h(p.time)}</span></div>
      <div class="greet-sub"><span id="greet-date">${h(p.date)}</span><span class="greet-fun">${h(funLine(d))}</span></div>
    </section>`;
  }
  function tickGreeting() {
    const c = document.getElementById("greet-clock");
    if (!c) return;
    const p = sthlmParts(new Date());
    c.textContent = p.time;
    const hi = document.getElementById("greet-hi");
    const g = greetingFor(p.hour);
    if (hi && hi.textContent !== g) hi.textContent = g;
    const dt = document.getElementById("greet-date");
    if (dt && dt.textContent !== p.date) dt.textContent = p.date;
    const fn = document.querySelector(".greet-fun");
    const fl = funLine(state.desk);
    if (fn && fl && fn.textContent !== fl) fn.textContent = fl;
  }
  setInterval(tickGreeting, 1000);


  const MOVERS_RANGE_SV = { today: "idag", "7d": "på 7 dagar", "30d": "på 30 dagar", month: "denna månad", year: "i år", start: "sedan start" };

  function moversCard() {
    const side = state.moversSide === "worst" ? "worst" : "best";
    const raw = ((state.movers && state.movers.items) || []).filter((x) => x && x.change_pct != null);
    const items = (side === "worst" ? raw.slice().sort((a, b) => a.change_pct - b.change_pct) : raw.slice().sort((a, b) => b.change_pct - a.change_pct)).slice(0, 4);
    const rng = (state.movers && state.movers.range) || state.chartRange || "today";
    const lab = MOVERS_RANGE_SV[rng] || "perioden";
    const rows = items.length ? items.map((c) => `
      <a class="row has-avatar" href="#/coin/${encodeURIComponent(c.mint)}" data-nav="#/coin/${encodeURIComponent(c.mint)}">
        <div class="row-body">
          <div class="row-title">${h(c.symbol)}${c.held ? " 💼" : ""}</div>
          <div class="row-sub nums">${h(fmtUsd(c.price, { exact: true }))} · ${h(lab)}</div>
        </div>
        <div class="row-meta">
          <div class="chg ${chgClass(c.change_pct)} nums">${h(fmtPct(c.change_pct))}</div>
        </div>
        ${svg("chev")}
      </a>`).join("") : `<div class="state" style="padding:20px 16px"><p>Inga coins att jämföra för den här perioden än.</p></div>`;
    return `<div class="card" id="movers-card">
      <div class="card-h">Topp 4 coins
        <div class="segments" data-role="movers-side">
          <button type="button" data-movers="best" class="${side === "best" ? "on" : ""}">Bästa</button>
          <button type="button" data-movers="worst" class="${side === "worst" ? "on" : ""}">Sämsta</button>
        </div>
      </div>
      ${rows}
    </div>`;
  }


  function riskMeter(risk) {
    if (!risk || (!risk.daily && !risk.drawdown && !risk.weekly)) return "";
    const daily = risk.daily || {};
    const weekly = risk.weekly || {};
    const dd = risk.drawdown || {};
    const fill = (pct, lim) => {
      const p = Math.abs(Number(pct) || 0);
      const l = Math.max(0.01, Math.abs(Number(lim) || 1));
      return Math.max(0, Math.min(100, (p / l) * 100));
    };
    const tone = (pct, lim, stopped) => {
      if (stopped) return "bad";
      const p = Number(pct) || 0;
      const l = Math.abs(Number(lim) || 1);
      if (p <= -l * 0.8) return "bad";
      if (p <= -l * 0.4) return "warn";
      return "ok";
    };
    const note = risk.entries_blocked
      ? (daily.stopped ? "Nya köp är stoppade resten av dagen."
        : dd.paused ? "Nya köp är pausade efter ett större tapp från toppen."
        : "Nya köp är pausade just nu.")
      : weekly.half_size ? "Botarna handlar med halv storlek den här veckan."
      : "Allt rullar inom taken.";
    return `<div class="card" id="risk-meter">
      <div class="card-h">Risk</div>
      <div class="risk-rows">
        <div class="risk-row">
          <div class="risk-lab">Idag <span class="nums">${h(fmtPct(daily.pnl_pct))} av ${h(fmtPct(-(daily.limit_pct || 5)))}</span></div>
          <div class="risk-track"><span class="${tone(daily.pnl_pct, daily.limit_pct, daily.stopped)}" style="width:${fill(daily.pnl_pct, daily.limit_pct)}%"></span></div>
        </div>
        <div class="risk-row">
          <div class="risk-lab">Veckan <span class="nums">${h(fmtPct(weekly.pnl_pct))} · halv storlek vid ${h(fmtPct(-(weekly.limit_pct || 10)))}</span></div>
          <div class="risk-track"><span class="${tone(weekly.pnl_pct, weekly.limit_pct, weekly.half_size)}" style="width:${fill(weekly.pnl_pct, weekly.limit_pct)}%"></span></div>
        </div>
        <div class="risk-row">
          <div class="risk-lab">Från toppen <span class="nums">${h(fmtPct(dd.pct))} · paus vid ${h(fmtPct(-(dd.limit_pct || 20)))}</span></div>
          <div class="risk-track"><span class="${tone(-Math.abs(dd.pct || 0), dd.limit_pct, dd.paused)}" style="width:${fill(dd.pct, dd.limit_pct)}%"></span></div>
        </div>
      </div>
      <p class="risk-note">${h(note)}</p>
    </div>`;
  }

  function renderHome() {
    const d = state.desk;
    if (state.loading && !d) return skeleton();
    if (state.error && !d) return errorView(state.error);
    const pnl = d.pnl_today_usd || 0;
    const regimeRaw = (d.market && d.market.regime) || "GREEN";
    const regime = ({ GREEN: "RISK_ON", QUIET: "CAUTION", RED: "RISK_OFF" })[regimeRaw] || regimeRaw;
    const regimeLabel = regime === "RISK_OFF" ? "RÖTT · inga nya köp" : regime === "CAUTION" ? "LUGNT · max 1 position" : "GRÖNT · köper som vanligt";
    const regimeCls = regime === "RISK_OFF" ? "off" : regime === "CAUTION" ? "caution" : "on";
    const btc = (d.market && d.market.btc) || {};
    const sol = (d.market && d.market.sol) || {};
    const laneF = state.laneFilter || "all";
    const positions = (d.positions || []).filter((p) => matchesLane(p, laneF));
    const watching = (d.watching || []).filter((w) => matchesLane(w, laneF));
    const picks = d.copy_picks || [];
    const botList = d.bots || [];
    const byName = Object.fromEntries(botList.map((b) => [b.name, b]));
    const lanes = d.lanes || null;

    return `${topbar({
      title: APP_NAME,
      left: pillPaperOrLive(d.mode),
      right: `<span class="pill pill-muted"><span class="pill-dot pulse"></span>${h(d.schedule || "24/7")}</span>`
    })}
    <div class="screen"><div class="page">
      ${window.DeskFun ? DeskFun.ticker(state.ticker && state.ticker.items) : ""}
      ${greetingBanner(d)}
      ${window.DeskFun && state.fun ? DeskFun.streakChip(state.fun.streak) : ""}
      <section class="hero">
        <div class="hero-kicker">Värde${String((d.mode||"PAPER")).toUpperCase()==="LIVE" ? "" : " · PAPER"}</div>
        <p class="hero-equity nums">${h(fmtUsd(d.equity_usd, { exact: true }))}</p>
        <div class="hero-pnl">
          <span class="chg ${chgClass(pnl)} nums">${pnl >= 0 ? "+" : ""}${h(fmtUsd(pnl, { exact: true }))} idag</span>
          <span class="sub chg ${chgClass(d.pnl_today_pct)} nums">${h(fmtPct(d.pnl_today_pct))}</span>
        </div>
      </section>
      ${window.DeskFun && state.fun ? DeskFun.mood(state.fun.mood) : ""}
      ${window.DeskFun ? DeskFun.laneGauge(state.lanes) : ""}
      <div class="segments segments-scroll" data-role="chart-range">
        ${chartRangeButtons()}
      </div>
      ${chartSummary(state.chart)}
      <div class="chart-wrap"><canvas id="equity-chart"></canvas></div>
      ${moversCard()}

      <div class="card market-card">
        <div class="regime">
          <div>
            <div class="tiny">Marknadsläge</div>
            <div class="regime-name ${regimeCls}">${h(regimeLabel)}</div>
          </div>
        </div>
        <div class="market-grid">
          <div class="market-pair">
            <div class="k">BTC</div>
            <div class="v nums">${h(fmtUsd(btc.price, { exact: true }))}
              <span class="chg ${chgClass(btc.change_24h_pct)}">${h(fmtPct(btc.change_24h_pct))}</span>
            </div>
          </div>
          <div class="market-pair">
            <div class="k">SOL</div>
            <div class="v nums">${h(fmtUsd(sol.price, { exact: true }))}
              <span class="chg ${chgClass(sol.change_24h_pct)}">${h(fmtPct(sol.change_24h_pct))}</span>
            </div>
          </div>
        </div>
        ${d.market && d.market.news ? `<div class="market-note">${h(d.market.news)}</div>` : ""}
      </div>

      <div class="card-h" style="padding-left:0;padding-right:0">Bots</div>
      <div class="bot-carousel">
        ${BOT_ORDER.map((name) => {
          const b = byName[name] || { name, label: name, status: "idle", last: "" };
          const color = BOT_COLORS[name] || "var(--label)";
          return `<a class="bot-card" href="#/bots/${name}" data-nav="#/bots/${name}">
            <div class="name"><span class="bot-dot" style="background:${color}"></span>${h(b.label || name)}</div>
            <div class="last">${h(b.last || "Inga beslut än")}</div>
            <div class="st">${h(b.status || "")}</div>
          </a>`;
        }).join("")}
      </div>

      ${lanes ? `<div class="card">
        <div class="card-h">Spår</div>
        <div class="lane-bar"><span class="mem" style="width:${Number(lanes.memecoins && lanes.memecoins.pct) || 0}%"></span><span class="maj" style="width:${Number(lanes.majors && lanes.majors.pct) || 0}%"></span><span class="gold" style="width:${Number(lanes.gold && lanes.gold.pct) || 0}%"></span></div>
        <div class="lane-legend">
          <span><b>${h((lanes.memecoins && lanes.memecoins.pct) || 0)}%</b> Memecoins</span>
          <span><b>${h((lanes.majors && lanes.majors.pct) || 0)}%</b> Större coins</span>
          <span><b>${h((lanes.gold && lanes.gold.pct) || 0)}%</b> Guld</span>
        </div>
      </div>` : ""}
      ${riskMeter(d && d.risk)}

      ${laneFilterRow()}

      <div class="card">
        <div class="card-h">Öppna positioner</div>
        ${positions.length ? positions.map((p, i) => `
          <a class="row has-avatar" href="#/coin/${encodeURIComponent(p.mint)}" data-nav="#/coin/${encodeURIComponent(p.mint)}" style="${i === 0 ? "padding-top:14px" : ""}">
            ${tokenAvatar(p.symbol, p.mint)}
            <div class="row-body">
              <div class="row-title">${h(p.symbol)}${laneChip(laneOf(p))}</div>
              <div class="row-sub">${h(fmtUsd(p.value_usd || p.size_usd))} · entry ${h(fmtUsd(p.entry_usd))}</div>
            </div>
            <div class="row-meta">
              <div class="chg ${chgClass(p.pnl_usd)} nums">${h(fmtPct(p.pnl_pct))}</div>
              <div class="tiny nums">${p.pnl_usd >= 0 ? "+" : ""}${h(fmtUsd(p.pnl_usd, { exact: true }))}</div>
            </div>
            ${svg("chev")}
          </a>`).join("") : `<div class="state" style="padding:28px 16px"><p>Inga öppna positioner.</p></div>`}
      </div>

      ${window.DeskFun && state.fun ? DeskFun.week(state.fun.week) + DeskFun.meme(state.fun.meme) + DeskFun.chat(state.fun.chat, 8) : ""}
      ${watching.length ? `<div class="card">
        <div class="card-h">Bevakas</div>
        ${watching.map((w) => `
          <a class="row has-avatar" href="#/coin/${encodeURIComponent(w.mint)}" data-nav="#/coin/${encodeURIComponent(w.mint)}">
            ${tokenAvatar(w.symbol, w.mint)}
            <div class="row-body">
              <div class="row-title">${h(w.symbol)}${laneChip(laneOf(w))}</div>
              <div class="row-sub">${h(w.reason || w.name || "")}</div>
            </div>
            <div class="row-meta"><div class="tiny">Score ${h(w.score)}</div></div>
            ${svg("chev")}
          </a>`).join("")}
      </div>` : ""}

      ${picks.length ? `<div class="card">
        <div class="card-h">Whale-tips</div>
        ${picks.map((c) => `
          <div class="row">
            <div class="row-body">
              <div class="row-title">${h(c.label)}</div>
              <div class="row-sub">${h(c.last || shortAddr(c.wallet))}</div>
            </div>
          </div>`).join("")}
      </div>` : ""}

      <div class="card screen-card" data-action="lightbox">
        <div class="card-h">Live-skärm</div>
        <img id="desk-screen" alt="Live-skärm" src="${h(DeskAPI.screenUrl())}">
        <div class="caption">${d.last_action ? h(d.last_action.text) + " · " + h(relTime(d.last_action.ts)) : "Tryck för att förstora"}</div>
      </div>
    </div></div>`;
  }

  function renderCoin() {
    if (state.loading && !state.coin) return `${topbar({ title: "Coin", back: "#/home" })}${skeleton()}`;
    if (state.error) return errorView(state.error, "#/home");
    const c = state.coin;
    if (!c) return errorView("Coinet hittades inte.", "#/home");
    const mint = c.mint;
    const dex = (c.links && c.links.dexscreener) || ("https://dexscreener.com/solana/" + mint);
    const pos = c.position;
    return `${topbar({ title: c.symbol, back: "#/home", backLabel: "Hem", right: pillPaperOrLive(state.desk && state.desk.mode) })}
    <div class="screen"><div class="page">
      <div class="coin-head">
        ${tokenAvatar(c.symbol, c.mint)}
        <div>
          <div class="sym">${h(c.symbol)}${laneChip(laneOf(c))}</div>
          <div class="name">${h(c.name)}</div>
        </div>
      </div>
      <div class="coin-price nums">${h(fmtUsd(c.price_usd))}</div>
      <div class="chg ${chgClass(c.change_1h)} nums">${h(fmtPct(c.change_1h))} 1h
        <span class="sub muted"> · ${h(fmtPct(c.change_24h))} 24h</span>
      </div>
      <div class="chart-wrap" style="height:180px;margin-top:12px"><canvas id="price-chart"></canvas></div>

      ${pos ? `<div class="card">
        <div class="card-h">Din PAPER-position</div>
        <div class="row"><div class="row-body"><div class="row-title">Värde</div></div><div class="row-meta nums">${h(fmtUsd(pos.value_usd || pos.size_usd, { exact: true }))}</div></div>
        <div class="row"><div class="row-body"><div class="row-title">Resultat</div></div><div class="row-meta chg ${chgClass(pos.pnl_usd)} nums">${h(fmtPct(pos.pnl_pct))} · ${pos.pnl_usd >= 0 ? "+" : ""}${h(fmtUsd(pos.pnl_usd, { exact: true }))}</div></div>
        <div class="row"><div class="row-body"><div class="row-title">Köpt vid</div></div><div class="row-meta nums">${h(fmtUsd(pos.entry_usd))}</div></div>
      </div>` : ""}

      <div class="stats">
        <div class="stat"><div class="k">Börsvärde</div><div class="v nums">${h(fmtUsd(c.mc_usd))}</div></div>
        <div class="stat"><div class="k">Likviditet</div><div class="v nums">${h(fmtUsd(c.liq_usd))}</div></div>
        <div class="stat"><div class="k">Volym</div><div class="v nums">${h(fmtUsd(c.volume_24h))}</div></div>
        <div class="stat"><div class="k">Ägare</div><div class="v nums">${h(c.holders)}</div></div>
        <div class="stat"><div class="k">Ålder</div><div class="v">${h(ageLabel(c.age_min))}</div></div>
        <div class="stat"><div class="k">Betyg</div><div class="v nums">${h(c.score)}${c.decision ? ` <span class="chip chip-${String(c.decision).toLowerCase()}">${h(c.decision)}</span>` : ""}</div></div>
      </div>

      ${c.thesis ? `<div class="card thesis"><div class="who">Brain · varför</div><p>${h(c.thesis)}</p></div>` : ""}

      <a class="btn btn-primary" href="${h(dex)}" target="_blank" rel="noopener">Öppna på DexScreener</a>
      <a class="row card" style="margin-top:4px" href="#/audit/${encodeURIComponent(mint)}" data-nav="#/audit/${encodeURIComponent(mint)}">
        <div class="row-body"><div class="row-title">Visa säkerhetskoll</div><div class="row-sub">Rapport med 8 kontroller</div></div>
        ${svg("chev")}
      </a>
    </div></div>`;
  }

  function ageLabel(min) {
    if (min == null) return "—";
    if (min < 60) return min + "m";
    if (min < 60 * 24) return Math.round(min / 60) + "h";
    return Math.round(min / 60 / 24) + "d";
  }

  function renderAudit() {
    if (state.loading && !state.audit) return `${topbar({ title: "Säkerhetskoll", back: "#/home" })}${skeleton()}`;
    if (state.error) return errorView(state.error, state.route.mint ? "#/coin/" + encodeURIComponent(state.route.mint) : "#/home");
    const a = state.audit;
    if (!a) return errorView("Säkerhetskollen hittades inte.", "#/home");
    const back = "#/coin/" + encodeURIComponent(a.mint);
    const passed = (a.layers || []).filter((l) => l.pass).length;
    const total = (a.layers || []).length;
    return `${topbar({ title: "Säkerhetskoll", back, backLabel: a.symbol || "Coin" })}
    <div class="screen"><div class="page">
      <div class="coin-head">
        <div class="grade grade-${h(a.grade)}">${h(a.grade)}</div>
        <div>
          <div class="sym">${h(a.symbol)}</div>
          <div class="name">${h(passed)} av ${h(total)} kontroller godkända</div>
        </div>
      </div>
      ${a.notes ? `<p class="muted" style="font-size:14px;margin:4px 0 12px;line-height:1.4">${h(a.notes)}</p>` : ""}
      <div class="card">
        ${(a.layers || []).map((l) => {
          const st = l.pass ? "pass" : (l.status === "warn" ? "warn" : "fail");
          const mark = st === "pass" ? "✓" : st === "warn" ? "!" : "✕";
          return `<div class="layer">
            <div class="layer-ico ${st}">${mark}</div>
            <div class="row-body">
              <div class="layer-name"><span class="layer-n">${h(l.id)}.</span>${h(l.name)}</div>
              <div class="layer-detail">${h(l.detail)}</div>
            </div>
          </div>`;
        }).join("")}
      </div>
      <a class="btn btn-dex" href="https://dexscreener.com/solana/${encodeURIComponent(a.mint)}" target="_blank" rel="noopener">Öppna på DexScreener</a>
    </div></div>`;
  }


  function renderChat() {
    const back = (state.route && state.route.bot) ? "#/bots" : "#/home";
    const page = window.DeskFun && DeskFun.chatPage
      ? DeskFun.chatPage((state.fun && state.fun.chat) || [], state.route && state.route.bot, back)
      : { title: "Botarnas chatt", back: back, html: "<div class=\"muted\" style=\"padding:24px\">Chatten kunde inte laddas.</div>" };
    return `${topbar({ title: page.title, back: page.back, backLabel: "Tillbaka" })}
    <div class="chat-screen">${page.html}</div>`;
  }

  function renderBots() {
    if (state.loading && !state.desk) return skeleton();
    if (state.error && !state.desk) return errorView(state.error);
    const list = (state.desk && state.desk.bots) || [];
    const byName = Object.fromEntries(list.map((b) => [b.name, b]));
    return `${topbar({ title: "Botar", right: pillPaperOrLive(state.desk && state.desk.mode) })}
    <div class="screen"><div class="page">
      <p class="muted" style="font-size:14px;margin:2px 0 8px">Alla botar jobbar ihop dygnet runt. Tryck på en bot för att öppna chatten.</p>
      ${BOT_GROUPS.map((g) => `
      <div class="card-h group-h">${h(g.title)}</div>
      <div class="card bots-list">
        ${g.names.map((name) => {
          const b = byName[name] || { name, label: name[0].toUpperCase() + name.slice(1).replace("_", " "), status: "idle", last: "" };
          const color = BOT_COLORS[name] || "var(--label)";
          return `<a class="row" href="#/chat/${name}" data-nav="#/chat/${name}">
            <span class="bot-dot" style="background:${color}"></span>
            <div class="row-body">
              <div class="row-title">${h(b.label || name)}</div>
              <div class="row-sub">${h(b.last || "Inga beslut än")}</div>
            </div>
            <div class="row-meta"><div class="tiny">${h(({running:"jobbar",idle:"väntar",buying:"köper",paused:"pausad",degraded:"strular",error:"fel",stopped:"stoppad"})[b.status] || b.status)}${b.ts ? " · " + relTime(b.ts) : ""}</div></div>
            ${svg("chev")}
          </a>`;
        }).join("")}
      </div>`).join("")}
      ${window.DeskFun && state.fun ? DeskFun.leaderboard(state.fun.leaderboard, state.lbPeriod || "vecka") + DeskFun.chat(state.fun.chat, 30) + DeskFun.badges(state.fun.badges, state.fun.mode) : ""}
    </div></div>`;
  }

  function renderBot() {
    if (state.loading && !state.bot) return `${topbar({ title: "Bot", back: "#/bots" })}${skeleton()}`;
    if (state.error) return errorView(state.error, "#/bots");
    const b = state.bot;
    if (!b) return errorView("Boten hittades inte.", "#/bots");
    const color = BOT_COLORS[b.name] || "var(--label)";
    const dec = b.decisions || [];
    return `${topbar({ title: b.label || b.name, back: "#/bots", backLabel: "Botar" })}
    <div class="screen"><div class="page">
      <div class="bot-hero">
        <div class="swatch" style="background:${color}"></div>
        <div>
          <div class="row-title" style="font-size:22px;font-weight:720;letter-spacing:-0.5px">${h(b.label || b.name)}</div>
          <div class="row-sub bot-desc">${h(({running:"jobbar",idle:"väntar",buying:"köper",paused:"pausad",degraded:"strular",error:"fel",stopped:"stoppad"})[b.status] || b.status)} · ${h(b.description || "")}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-h">Beslut</div>
        ${dec.length ? dec.map((d) => `
          <${d.mint ? `a href="#/coin/${encodeURIComponent(d.mint)}" data-nav="#/coin/${encodeURIComponent(d.mint)}"` : "div"} class="decision">
            <div class="when">${h(relTime(d.ts))}${d.symbol ? " · " + h(d.symbol) : ""}</div>
            <div class="act">${h(d.action || "")}</div>
            <p>${h(d.reason || "")}</p>
          </${d.mint ? "a" : "div"}>
        `).join("") : emptyView("Inga beslut än", "När boten gör något syns det här.")}
      </div>
    </div></div>`;
  }

  function renderActivity() {
    if (state.loading && !state.activity) return `${topbar({ title: "Händelser" })}${skeleton()}`;
    if (state.error && !state.activity) return errorView(state.error);
    const items = ((state.activity && state.activity.items) || [])
      .filter((it) => matchesLane(it, state.laneFilter))
      .slice()
      .sort((x, y) => (y.ts || 0) - (x.ts || 0));
    const filters = [["all", "Alla"], ["trades", "Affärer"], ["blocks", "Stoppade"], ["lessons", "Lärdomar"]];
    return `${topbar({ title: "Händelser", right: pillPaperOrLive(state.desk && state.desk.mode) })}
    <div class="screen"><div class="page">
      <div class="filters">
        ${filters.map(([id, lab]) => `<button data-filter="${id}" class="${state.activityFilter === id ? "on" : ""}">${lab}</button>`).join("")}
      </div>
      ${laneFilterRow()}
      ${items.length ? `<div class="card">${items.map((it) => {
        const kind = it.kind || "system";
        const tag = ({ buy:"KÖP", sell:"SÄLJ", block:"STOPP", rejected:"SKIP", lesson:"LÄRD", scan:"SKAN", risk:"RISK", research:"RES", whale:"WHALE", sentiment:"STÄMN", guard:"VAKT", portfolio:"PORT", review:"REV", system:"INFO" })[kind] || "INFO";
        const inner = `
          <div class="event-kind ${h(kind)}">${tag}</div>
          <div class="row-body">
            <div class="row-title">${h(it.title)}${laneChip(laneOf(it))}</div>
            <div class="row-sub">${h(it.body || "")}</div>
          </div>
          <div class="row-meta">
            <div class="tiny">${h(relTime(it.ts))}</div>
            ${it.pnl_usd != null && it.kind === "sell" ? `<div class="chg ${chgClass(it.pnl_usd)} nums">${h(fmtUsd(it.pnl_usd, { exact: true }))}</div>` : ""}
          </div>
          ${it.mint ? svg("chev") : ""}`;
        return it.mint
          ? `<a class="row" href="#/coin/${encodeURIComponent(it.mint)}" data-nav="#/coin/${encodeURIComponent(it.mint)}">${inner}</a>`
          : `<div class="row">${inner}</div>`;
      }).join("")}</div>` : emptyView("Inget här än", "Köp, sälj, stopp och lärdomar dyker upp här.")}
    </div></div>`;
  }

  function renderAccount() {
    const d = state.desk;
    const wallet = (d && d.wallet) || { address: "—", label: "Phantom-plånbok (botens)" };
    const unlocked = DeskAPI.isUnlocked && DeskAPI.isUnlocked();
    const mode = (d && d.mode) || "PAPER";
    return `${topbar({ title: "Konto" })}
    <div class="screen"><div class="page">
      <div class="account-hero">
        <div class="mark"><img src="apple-touch-icon.png" alt="Moneymaking G"></div>
        <h2>Moneymaking G</h2>
        <p>Körs dygnet runt · ${mode === "LIVE" ? "LIVE" : "PAPER"}-läge</p>
      </div>

      <div class="card">
        <div class="card-h">Phantom-plånbok (botens)</div>
        <div class="row" style="align-items:flex-start">
          <div class="row-body">
            <div class="addr">${h(wallet.address)}</div>
            <button class="copy-btn" data-action="copy-wallet" data-addr="${h(wallet.address)}">Kopiera adress</button>
          </div>
        </div>
        ${wallet.sol != null ? `<div class="row"><div class="row-body"><div class="row-title">SOL</div></div><div class="row-meta nums">${h(Number(wallet.sol).toFixed(2))} SOL</div></div>` : ""}
      </div>

      <div class="card">
        <div class="row"><div class="row-body"><div class="row-title">Läge</div></div><div class="row-meta">${pillPaperOrLive(mode)}</div></div>
        <div class="row"><div class="row-body"><div class="row-title">Schema</div></div><div class="row-meta">${h((d && d.schedule) || "24/7")}</div></div>
        <div class="row"><div class="row-body"><div class="row-title">Anslutning</div></div><div class="row-meta tiny">${unlocked ? "Inloggad" : "Utloggad"}</div></div>
        ${unlocked ? `<div class="row"><div class="row-body"><div class="row-title">Session</div><div class="row-sub">Koden sparas inte. Du kan logga ut härifrån.</div></div><button type="button" class="copy-btn" data-action="logout">Logga ut</button></div>` : ""}
        <div class="row"><div class="row-body"><div class="row-title">Notiser</div><div class="row-sub">Notis vid köp, sälj och stopp</div></div>
          <button class="copy-btn" data-action="notify">Slå på</button>
        </div>
        ${window.DeskFun ? DeskFun.soundToggle() : ""}
        <a class="row" href="approve.html" data-keep><div class="row-body"><div class="row-title">Regler</div><div class="row-sub">Godkänn regelförslag och återuppta köp</div></div>${svg("chev")}</a>
      </div>

      ${window.DeskFun ? DeskFun.laneHistory(state.lanes) : ""}
      ${window.DeskFun && state.fun ? DeskFun.badges(state.fun.badges, state.fun.mode) : ""}
      <p class="tiny" style="text-align:center;margin:18px 8px 0;line-height:1.4">Appen frågar aldrig efter seed phrase, lösenord eller 2FA-kod. Botens plånbok är en separat Phantom-plånbok som bara Moneymaking G använder.</p>
    </div></div>`;
  }

  function renderLock() {
    return `<div class="lock">
      <div class="mark" style="width:72px;height:72px;border-radius:20px;overflow:hidden;border:0.5px solid var(--sep)"><img src="apple-touch-icon.png" alt="" width="72" height="72"></div>
      <h2>Logga in i Moneymaking G</h2>
      <p>Skriv din kod för att öppna appen.</p>
      ${passcodeForm(state.lockError)}
    </div>`;
  }

  function lightbox() {
    if (!state.lightbox) return "";
    return `<div class="lightbox"><button class="close" data-action="close-lightbox">Stäng</button>
      <img src="${h(DeskAPI.screenUrl())}" alt="Live-skärm">
    </div>`;
  }

  function tabFor(route) {
    if (route.name === "chat") return ""; // full-screen chat, no tab bar
    if (route.name === "bots" || route.name === "bot") return "bots";
    if (route.name === "activity") return "activity";
    if (route.name === "account") return "account";
    return "home";
  }

  function scroller() {
    return document.querySelector(".screen") || document.scrollingElement || document.documentElement;
  }
  function captureScroll() {
    const s = scroller();
    return { y: s ? s.scrollTop : 0, win: window.scrollY || 0 };
  }
  function restoreScroll(snap) {
    if (!snap) return;
    const apply = () => {
      const s = scroller();
      if (s) s.scrollTop = snap.y;
      if (typeof snap.win === "number") window.scrollTo(0, snap.win);
    };
    apply();
    requestAnimationFrame(apply);
  }

  function render(opts) {
    const keep = !(opts && opts.keepScroll === false);
    const snap = keep ? captureScroll() : null;
    const route = state.route;
    const needsAuth = !(DeskAPI.isUnlocked && DeskAPI.isUnlocked());
    let body;
    if (needsAuth) body = renderLock();
    else if (route.name === "coin") body = renderCoin();
    else if (route.name === "audit") body = renderAudit();
    else if (route.name === "chat") body = renderChat();
    else if (route.name === "bots") body = renderBots();
    else if (route.name === "bot") body = renderBot();
    else if (route.name === "activity") body = renderActivity();
    else if (route.name === "account") body = renderAccount();
    else body = renderHome();

    if (document.activeElement && document.activeElement !== document.body && typeof document.activeElement.blur === "function") {
      try { document.activeElement.blur(); } catch (_) {}
    }
    $app.className = "";
    $app.innerHTML = `${body}${tabbar(tabFor(route))}${lightbox()}<div class="toast ${state.toast ? "show" : ""}" id="toast">${h(state.toast)}</div>`;
    if (snap) restoreScroll(snap);
    requestAnimationFrame(() => {
      afterPaint();
      if (snap) restoreScroll(snap);
    });
  }

  function afterPaint() {
    const eq = document.getElementById("equity-chart");
    if (eq && state.chart && state.chart.points) DeskCharts.drawEquity(eq, state.chart.points);
    const feed = document.getElementById("chat-feed");
    if (feed) feed.scrollTop = feed.scrollHeight;
    const px = document.getElementById("price-chart");
    if (px && state.coin && state.coin.chart) DeskCharts.drawPrice(px, state.coin.chart);
  }

  function patchChartAndMovers() {
    const sum = document.querySelector(".chart-summary");
    if (sum) {
      const html = chartSummary(state.chart);
      if (html) sum.outerHTML = html;
    }
    document.querySelectorAll("[data-range]").forEach((b) => {
      b.classList.toggle("on", b.getAttribute("data-range") === state.chartRange);
    });
    const eq = document.getElementById("equity-chart");
    if (eq && state.chart && state.chart.points) DeskCharts.drawEquity(eq, state.chart.points);
    const card = document.getElementById("movers-card");
    if (card) card.outerHTML = moversCard();
  }

  async function updateChartRange(id) {
    state.chartRange = id;
    document.querySelectorAll("[data-range]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-range") === id));
    try {
      const [c, mv] = await Promise.all([DeskAPI.getChart(id), DeskAPI.getMovers ? DeskAPI.getMovers(id).catch(() => null) : null]);
      state.chart = c;
      if (c && c.range && c.range !== state.chartRange) state.chartRange = c.range;
      if (mv) state.movers = mv;
      if (document.getElementById("equity-chart")) patchChartAndMovers();
      else render({ keepScroll: true });
    } catch (_) {
      render({ keepScroll: true });
    }
  }

  async function loadFun() {
    if (!window.DeskFun || !DeskAPI.getFun) return;
    try {
      const [f, tk] = await Promise.all([DeskAPI.getFun(state.lbPeriod || "vecka"), DeskAPI.getTicker()]);
      state.fun = f; state.ticker = tk;
      try { state.lanes = await DeskAPI.getLanes(); } catch (_) {}
      DeskFun.checkWins(f.wins); DeskFun.checkBadges(f.badges);
    } catch (_) {}
  }
  window.DeskToast = (m) => toast(m);
  setInterval(() => { if (!document.hidden) loadFun().then(() => { if (["home", "bots", "account", "chat"].includes(state.route.name)) render({ keepScroll: true }); }); }, 60000);

  async function loadRoute() {
    const r = state.route;
    state.error = null;
    try {
      if (!state.desk) {
        state.loading = true;
        render();
        state.desk = await DeskAPI.getState();
      }
      if (!state.fun) await loadFun();
      if (r.name === "home") {
        state.loading = true;
        render();
        const [c, mv] = await Promise.all([DeskAPI.getChart(state.chartRange), DeskAPI.getMovers ? DeskAPI.getMovers(state.chartRange).catch(() => null) : null]);
        state.chart = c;
        if (c && c.range && c.range !== state.chartRange) state.chartRange = c.range;
        if (mv) state.movers = mv;
        state.loading = false;
        render({ keepScroll: false });
        return;
      }
      if (r.name === "activity") {
        state.loading = true;
        state.activity = null;
        render();
        state.activity = await DeskAPI.getActivity({ kind: state.activityFilter });
        state.loading = false;
        render();
        return;
      }
      if (r.name === "coin") {
        state.loading = true;
        state.coin = null;
        render();
        state.coin = await DeskAPI.getCoin(r.mint);
        state.loading = false;
        render();
        return;
      }
      if (r.name === "audit") {
        state.loading = true;
        state.audit = null;
        render();
        state.audit = await DeskAPI.getAudit(r.mint);
        state.loading = false;
        render();
        return;
      }
      if (r.name === "bot") {
        state.loading = true;
        state.bot = null;
        render();
        state.bot = await DeskAPI.getBotDecisions(r.bot);
        state.loading = false;
        render();
        return;
      }
      state.loading = false;
      render();
    } catch (err) {
      state.loading = false;
      state.error = err && err.status === 401 ? "Fel kod, eller så gick sessionen ut." :
        err && err.status === 404 ? "Inget hittades för den här skärmen." :
        (err && err.message) || "Nätverksfel.";
      render();
    }
  }

  function toast(msg) {
    state.toast = msg;
    const el = document.getElementById("toast");
    if (el) { el.textContent = msg; el.classList.add("show"); }
    setTimeout(() => {
      state.toast = "";
      const t = document.getElementById("toast");
      if (t) t.classList.remove("show");
    }, 1600);
  }

  $app.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-pass-form]");
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector("[name=code]");
    const remember = !!(form.querySelector("[name=remember]") && form.querySelector("[name=remember]").checked);
    const val = input && input.value ? String(input.value) : "";
    if (!val) {
      state.lockError = "Skriv din kod först.";
      render({ keepScroll: false });
      return;
    }
    const btn = form.querySelector("[data-pass-submit]");
    if (btn) { btn.disabled = true; btn.textContent = "Kollar koden…"; }
    state.lockError = null;
    DeskAPI.unlockWithPasscode(val, remember).then(() => {
      if (input) input.value = "";
      state.error = null;
      state.loading = true;
      state.lockError = null;
      render({ keepScroll: false });
      loadRoute();
    }).catch((err) => {
      state.lockError = (err && err.code === "bad_passcode")
        ? "Fel kod. Försök igen."
        : "Kunde inte öppna just nu. Försök igen om en stund.";
      render({ keepScroll: false });
    });
  });

  $app.addEventListener("click", (e) => {
    const logout = e.target.closest("[data-action=logout]");
    if (logout) {
      e.preventDefault();
      DeskAPI.logout();
      state.desk = null;
      state.fun = null;
      state.chart = null;
      state.movers = null;
      state.lockError = null;
      render({ keepScroll: false });
      return;
    }
    const rawHref = e.target.closest("a");
    if (rawHref && (rawHref.getAttribute("href") === "#" || rawHref.getAttribute("href") === "")) e.preventDefault();
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      go(nav.getAttribute("data-nav"));
      return;
    }
    const lb = e.target.closest("[data-lb]");
    if (lb) {
      e.preventDefault();
      if (lb.blur) lb.blur();
      state.lbPeriod = lb.getAttribute("data-lb");
      loadFun().then(() => render({ keepScroll: true }));
      return;
    }
    const undo = e.target.closest("[data-lane-undo]");
    if (undo) {
      e.preventDefault();
      if (!confirm("Ångra senaste ändringen av fördelningen?")) return;
      DeskAPI.undoLane(undo.getAttribute("data-lane-undo")).then(() => { toast("↩️ Fördelningen är återställd"); return loadFun(); }).then(() => render({ keepScroll: true })).catch(() => toast("Kunde inte ångra just nu"));
      return;
    }
    if (e.target.closest("[data-sound-toggle]")) {
      e.preventDefault();
      DeskFun.toggleSound(); render({ keepScroll: true });
      return;
    }
    const moversBtn = e.target.closest("[data-movers]");
    if (moversBtn) {
      e.preventDefault();
      if (moversBtn.blur) moversBtn.blur();
      state.moversSide = moversBtn.getAttribute("data-movers") === "worst" ? "worst" : "best";
      const card = document.getElementById("movers-card");
      if (card) card.outerHTML = moversCard();
      else render({ keepScroll: true });
      return;
    }
    const range = e.target.closest("[data-range]");
    if (range) {
      e.preventDefault();
      if (range.blur) range.blur();
      updateChartRange(range.getAttribute("data-range"));
      return;
    }
    const filter = e.target.closest("[data-filter]");
    if (filter) {
      e.preventDefault();
      if (filter.blur) filter.blur();
      state.activityFilter = filter.getAttribute("data-filter");
      state.loading = true;
      render({ keepScroll: true });
      DeskAPI.getActivity({ kind: state.activityFilter }).then((a) => {
        state.activity = a; state.loading = false; render({ keepScroll: true });
      }).catch((err) => { state.loading = false; state.error = err.message; render({ keepScroll: true }); });
      return;
    }
    const laneBtn = e.target.closest("[data-lane]");
    if (laneBtn) {
      e.preventDefault();
      if (laneBtn.blur) laneBtn.blur();
      state.laneFilter = laneBtn.getAttribute("data-lane");
      render({ keepScroll: true });
      return;
    }
    const action = e.target.closest("[data-action]");
    if (!action) return;
    const act = action.getAttribute("data-action");
    if (act === "retry") { loadRoute(); }
    if (act === "lightbox") { e.preventDefault(); state.lightbox = true; render({ keepScroll: true }); }
    if (act === "close-lightbox") { e.preventDefault(); state.lightbox = false; render({ keepScroll: true }); }
    if (act === "copy-wallet") {
      const addr = action.getAttribute("data-addr") || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(() => toast("Adressen kopierad")).catch(() => toast(addr));
      } else { toast(addr); }
    }
    if (act === "notify") {
      if (!("Notification" in window)) { toast("Notiser stöds inte"); return; }
      Notification.requestPermission().then((p) => toast(p === "granted" ? "Notiser på" : "Tillåtelse nekad"));
    }
  });

  window.addEventListener("hashchange", () => {
    state.route = parseRoute();
    state.error = null;
    render({ keepScroll: false });
    loadRoute();
  });

  window.addEventListener("resize", () => afterPaint());

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  DeskAPI.captureTokenFromUrl();
  state.route = parseRoute();
  const boot = () => {
    render();
    loadRoute();
    DeskAPI.openStream({
      state(s) { state.desk = Object.assign(state.desk || {}, s); render(); },
      activity() { /* stay put; user can refresh the feed */ },
      tick() {
        if (state.route.name === "home" && document.getElementById("desk-screen")) {
          document.getElementById("desk-screen").src = DeskAPI.screenUrl();
        }
      }
    });
  };
  if (DeskAPI.tryRememberedUnlock) {
    DeskAPI.tryRememberedUnlock().catch(() => false).then(boot);
  } else {
    boot();
  }
})();
