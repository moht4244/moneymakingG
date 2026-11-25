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
    regime: "#98989D",
    majors: "#FFB340",
    shadow: "#8E8E93",
    telegram: "#2AABEE",
    meme_test: "#FF7AD9",
    newsfeed: "#FFD60A",
    social: "#64D2FF",
    assets: "#FFD60A"
  };
  const BOT_META = {
    scanner: { label: "Scanner", emoji: "🔭" },
    analyst: { label: "Analyst", emoji: "🧪" },
    brain: { label: "Brain", emoji: "🧠" },
    executor: { label: "Executor", emoji: "🤝" },
    risk: { label: "Risk", emoji: "🛡️" },
    research: { label: "Research", emoji: "📚" },
    whale: { label: "Whale", emoji: "🐋" },
    sentiment: { label: "Sentiment", emoji: "🌡️" },
    rug_guard: { label: "Rug Guard", emoji: "🚨" },
    portfolio: { label: "Portfolio", emoji: "🥧" },
    reviewer: { label: "Reviewer", emoji: "📝" },
    regime: { label: "Marknadsläge", emoji: "🚦" },
    majors: { label: "Större coins", emoji: "🏛️" },
    shadow: { label: "Testspår", emoji: "👥" },
    telegram: { label: "Telegram", emoji: "📨" },
    assets: { label: "Tillgångar", emoji: "🥇" },
    meme_test: { label: "Meme-test", emoji: "🧪" },
    newsfeed: { label: "Nyhetsboten", emoji: "📰" },
    social: { label: "X-kollen", emoji: "📣" }
  };
  function botMeta(name) {
    const n = name || "";
    return BOT_META[n] || { label: n || "Bot", emoji: "🤖" };
  }
  const BOT_GROUPS = [
    { title: "Kärnan", names: ["scanner", "analyst", "brain", "executor", "risk", "meme_test"] },
    { title: "Marknaden", names: ["regime", "majors", "assets", "research", "whale", "sentiment", "newsfeed", "social"] },
    { title: "Skydd & portfölj", names: ["rug_guard", "portfolio", "reviewer", "shadow", "telegram"] }
  ];
  const MAJORS = new Set(["SOL", "JUP", "JTO", "BONK", "WIF", "PYTH", "RAY"]);
  const LANE_LABELS = { memecoins: "Memecoins", majors: "Större coins", gold: "Guld", commodities: "Råvaror", stocks: "Aktier", assets: "Tillgångar", meme_test: "Meme-test" };
  const APP_NAME = "Moneymaking G";
  const MOOD_LANE_KEY = "MMG_MOOD_LANE";
  const LOCAL_REQ_KEY = "MMG_WATCH_REQUESTS";

  function readSavedMoodLane() {
    try { return localStorage.getItem(MOOD_LANE_KEY) || "memecoin"; } catch (_) { return "memecoin"; }
  }
  function saveMoodLane(lane) {
    try { localStorage.setItem(MOOD_LANE_KEY, lane); } catch (_) {}
  }
  function readLocalRequests() {
    try {
      const arr = JSON.parse(localStorage.getItem(LOCAL_REQ_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }
  function writeLocalRequests(arr) {
    try { localStorage.setItem(LOCAL_REQ_KEY, JSON.stringify((arr || []).slice(0, 40))); } catch (_) {}
  }

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
    live: null,
    activityFilter: "all",
    liveBotFilter: "all",
    laneFilter: "all",
    mktFilter: "all",
    moodLane: readSavedMoodLane(),
    moods: null,
    universe: null,
    requests: null,
    coinTf: "1D",
    coinChart: null,
    coinStats: null,
    coinScrub: null,
    coinBack: "home",
    tradeLane: "all",
    tradeBot: "all",
    calMonth: null,
    calDay: null,
    reqFormType: "auto",
    reqFormSym: "",
    reqFormNote: "",
    reqFormAbove: "",
    reqFormBelow: "",
    reqEditId: null,
    reqBusy: false,
    reqError: "",
    liveQuotes: {},
    quotesLoading: false,
    chatter: null,
    coin: null,
    audit: null,
    bot: null,
    lbPeriod: "vecka",
    toast: "",
    lightbox: false
  };

  function parseRoute() {
    let hsh = (location.hash || "").replace(/^#/, "");
    if (hsh.startsWith("t=")) hsh = "";
    if (!hsh || hsh === "/") return { name: "home" };
    const parts = hsh.replace(/^\//, "").split("/").filter(Boolean);
    const a = parts[0];
    if (a === "home") return { name: "home" };
    if (a === "markets" || a === "marknad") return { name: "markets" };
    if (a === "watch" || a === "bevaka" || a === "requests") return { name: "watch" };
    if (a === "activity" || a === "live" || a === "handelser") return { name: "live" };
    if (a === "account" || a === "mer") return { name: "account" };
    if (a === "awards" || a === "topplista") return { name: "awards" };
    if (a === "bots" && parts[1]) return { name: "bot", bot: decodeURIComponent(parts[1]) };
    if (a === "bots") return { name: "bots" };
    if (a === "coin" && parts[1]) return { name: "coin", mint: decodeURIComponent(parts[1]) };
    if (a === "audit" && parts[1]) return { name: "audit", mint: decodeURIComponent(parts[1]) };
    if (a === "chat") return { name: "chat", bot: parts[1] ? decodeURIComponent(parts[1]) : null };
    if (a === "regler" || a === "rules") return { name: "regler" };
    if (a === "affarer" || a === "trades" || a === "historik") return { name: "affarer" };
    if (a === "ranking") return { name: "ranking" };
    if (a === "kalender" || a === "calendar") return { name: "kalender" };
    if (a === "live-krav" || a === "livekrav" || a === "step15") return { name: "livekrav" };
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

  function reasonText(s) {
    try { if (window.DeskAPI && DeskAPI.plainReason) return DeskAPI.plainReason(s); } catch (e) {}
    return s == null ? "" : String(s);
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
    if (opts && opts.cents) {
      return neg + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
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

  function parseTs(ts) {
    if (ts == null || ts === "") return null;
    if (typeof ts === "number" && isFinite(ts)) return new Date(ts < 1e12 ? ts * 1000 : ts);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  function sthlmStamp(ts) {
    const d = parseTs(ts);
    if (!d) return "";
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
    const day = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
    if (day === today) return d.toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" });
    return d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function relTime(ts) {
    const when = parseTs(ts);
    if (!when) return "";
    const s = Math.max(0, Math.round((Date.now() - when.getTime()) / 1000));
    if (s < 10) return "nyss";
    if (s < 60) return s + " s sedan";
    const m = Math.round(s / 60);
    if (m < 60) return m + " min sedan";
    const hr = Math.round(m / 60);
    if (hr < 24) return hr + " h sedan";
    const days = Math.round(hr / 24);
    return days + " d sedan";
  }

  function shortAddr(a) {
    if (!a) return "";
    if (a.length <= 12) return a;
    return a.slice(0, 8) + "…" + a.slice(-4);
  }

  function initials(sym) {
    return String(sym || "?").slice(0, 3).toUpperCase();
  }

  function hashHue(s) {
    let x = 0;
    for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return x % 360;
  }

  function tokenAvatar(symbol, mint, iconUrl) {
    const hue = hashHue(mint || symbol || "");
    const fb = `<div class="token-fallback" style="background:hsl(${hue} 32% 20%)">${h(initials(symbol))}</div>`;
    if (!iconUrl) return fb;
    const hiddenFb = `<div class="token-fallback" style="display:none;background:hsl(${hue} 32% 20%)">${h(initials(symbol))}</div>`;
    return `<div class="token-av"><img class="token-img" src="${h(iconUrl)}" alt="" width="32" height="32" onerror="this.style.display='none';var n=this.nextElementSibling;if(n)n.style.display='flex'">${hiddenFb}</div>`;
  }

  function pnlPill(pct) {
    return `<span class="pnl-pill ${chgClass(pct)} nums">${h(fmtPct(pct))}</span>`;
  }

  function pnlStack(pct, usd) {
    if (pct == null && usd == null) return "";
    const dollar = usd == null ? "" : `<div class="pnl-usd tiny nums chg ${chgClass(usd)}">${usd >= 0 ? "+" : ""}${h(fmtUsd(usd, { cents: true }))}</div>`;
    const pill = pct == null ? "" : pnlPill(pct);
    return `<div class="pnl-stack">${pill}${dollar}</div>`;
  }

  function heroPnlBlock(d) {
    const totU = Number(d.pnl_total_usd || 0);
    const totP = d.pnl_total_pct;
    const dayU = Number(d.pnl_today_usd || 0);
    const dayP = d.pnl_today_pct;
    return `<section class="hero">
      <div class="hero-kicker">Totalt värde</div>
      <p class="hero-equity nums">${h(fmtUsd(d.equity_usd, { exact: true }))}</p>
      <div class="hero-pnl">
        ${pnlPill(totP)}
        <span class="hero-pnl-usd chg ${chgClass(totU)} nums">${totU >= 0 ? "+" : ""}${h(fmtUsd(totU, { cents: true }))} sedan start</span>
      </div>
      <div class="hero-today">
        <span class="k">Idag</span>
        ${pnlPill(dayP)}
        <span class="chg ${chgClass(dayU)} nums">${dayU >= 0 ? "+" : ""}${h(fmtUsd(dayU, { cents: true }))}</span>
      </div>
    </section>`;
  }

  function lanePnlCard(lanes) {
    if (!lanes) return "";
    const keys = [
      ["memecoins", "Memecoins"],
      ["meme_test", "Meme-test"],
      ["majors", "Större coins"],
      ["assets", "Tillgångar"]
    ];
    const rows = keys.map(([id, lab]) => {
      const L = lanes[id] || {};
      const usdIn = L.usd;
      return `<div class="row">
        <div class="row-body">
          <div class="row-title">${h(lab)}</div>
          <div class="row-sub">${usdIn != null ? h(fmtUsd(usdIn, { exact: true })) + " i spel" : ""}</div>
        </div>
        <div class="row-meta">${pnlStack(L.pnl_pct, L.pnl_usd)}</div>
      </div>`;
    }).join("");
    return `<div class="card">
      <div class="card-h">Spår</div>
      ${rows}
    </div>`;
  }

  function laneOf(item) {
    if (!item) return null;
    const raw = String(item.lane || "").toLowerCase();
    if (raw === "meme_test" || raw === "meme-test") return "meme_test";
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
    const opts = [["all", "Alla"], ["memecoins", "Memecoins"], ["meme_test", "Meme-test"], ["majors", "Större coins"], ["assets", "Tillgångar"]];
    return `<div class="filters lane-filters">
      ${opts.map(([id, lab]) => `<button type="button" data-lane="${id}" class="${state.laneFilter === id ? "on" : ""}">${lab}</button>`).join("")}
    </div>`;
  }

  function svg(name) {
    const icons = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
      markets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="m7 14 4-4 3 3 5-6"/></svg>',
      activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      watch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/></svg>',
      account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
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
      ["markets", "Marknad", "markets"],
      ["live", "Live", "activity"],
      ["watch", "Bevaka", "watch"],
      ["account", "Mer", "account"]
    ];
    return `<nav class="tabbar">${tabs.map(([id, label, icon]) => `
      <a class="tab ${active === id ? "on" : ""}" href="#/${id}" data-nav="#/${id}">
        ${svg(icon)}<span>${label}</span>
      </a>`).join("")}</nav>`;
  }

  const PASS_LOCK_KEY = "MMG_PASS_LOCK";

  function readPassLock() {
    try {
      const d = JSON.parse(localStorage.getItem(PASS_LOCK_KEY) || "null");
      if (!d || typeof d !== "object") return { fails: 0, until: 0 };
      return { fails: Number(d.fails) || 0, until: Number(d.until) || 0 };
    } catch (_) {
      return { fails: 0, until: 0 };
    }
  }

  function writePassLock(fails, until) {
    try {
      if (!fails && !until) localStorage.removeItem(PASS_LOCK_KEY);
      else localStorage.setItem(PASS_LOCK_KEY, JSON.stringify({ fails, until }));
    } catch (_) {}
  }

  function passLockRemainingSec() {
    const rem = Math.ceil((readPassLock().until - Date.now()) / 1000);
    return rem > 0 ? rem : 0;
  }

  function recordPassFail() {
    const cur = readPassLock();
    const fails = cur.fails + 1;
    let waitSec = 0;
    if (fails >= 5) waitSec = Math.min(300, 30 * Math.pow(2, fails - 5));
    const until = waitSec ? Date.now() + waitSec * 1000 : 0;
    writePassLock(fails, until);
    return { fails, waitSec };
  }

  function clearPassLock() {
    writePassLock(0, 0);
  }

  function passcodeForm(err) {
    const rem = passLockRemainingSec();
    const shown = rem > 0 ? `För många fel försök. Vänta ${rem} sek och försök igen.` : err;
    const msg = shown ? `<p class="lock-error">${h(shown)}</p>` : "";
    return `<form data-pass-form class="token-form" autocomplete="off">
      <input type="password" name="code" minlength="8" autocomplete="current-password" spellcheck="false" placeholder="Din kod" aria-label="Din kod">
      <label class="remember"><input type="checkbox" name="remember"> Kom ihåg på den här enheten</label>
      ${msg}
      <button type="submit" class="btn btn-primary" data-pass-submit ${rem > 0 ? "disabled" : ""}>${rem > 0 ? `Låst (${rem}s)` : "Öppna"}</button>
    </form>`;
  }

  function buildLabel() {
    const raw = String(window.MMG_BUILD || "").trim() || "v15-20261125";
    const m = raw.match(/^(v\d+)-(\d{4})(\d{2})(\d{2})$/);
    if (!m) return raw;
    const months = ["jan", "feb", "mars", "apr", "maj", "juni", "juli", "aug", "sep", "okt", "nov", "dec"];
    const mon = months[Number(m[3]) - 1] || m[3];
    return m[1] + " · " + Number(m[4]) + " " + mon + " " + m[2];
  }

  function freshnessBlock() {
    const raw = (window.DeskAPI && DeskAPI.snapGeneratedAt && DeskAPI.snapGeneratedAt()) || "";
    if (!raw) return "";
    const d = parseTs(raw);
    if (!d) return "";
    let hhmm = "";
    try {
      hhmm = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    } catch (_) {
      hhmm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    const ageMin = (Date.now() - d.getTime()) / 60000;
    const stale = ageMin > 5;
    return `<div class="freshness ${stale ? "stale" : ""}">
      <span>Senast uppdaterad kl ${h(hhmm)}</span>
      ${stale ? `<span class="stale-note"> · gammal data — dra ner för att uppdatera</span>` : ""}
    </div>`;
  }

  function topbar(opts) {
    const o = opts || {};
    const left = o.back
      ? `<button class="back-btn" data-nav="${h(o.back)}">${svg("back")} ${h(o.backLabel || "Tillbaka")}</button>`
      : (o.left || "");
    const titleHtml = o.brand
      ? `<span class="mmg-brand"><span class="mmg-mark">G</span>${h(o.title || APP_NAME)}</span>`
      : h(o.title || APP_NAME);
    return `<header class="topbar">
      <div class="left">${left}</div>
      <h1>${titleHtml}</h1>
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

  function swedishLoadError(err) {
    const status = err && err.status;
    const code = err && (err.code || err.name);
    const raw = String((err && err.message) || err || "");
    if (status === 404) return "Inget hittades för den här skärmen.";
    if (status === 401 || code === "bad_passcode" || code === "decrypt_failed" || code === "OperationError") {
      return "Något gick fel när appen skulle öppnas. Logga in igen och försök på nytt.";
    }
    if (!raw) return "Något gick fel när appen skulle öppnas. Logga in igen och försök på nytt.";
    if (/operation failed|OperationError|TypeError|not allowed|undefined|HTTP\s|failed for an operation/i.test(raw)
        || (/^[A-Za-z0-9 .,'’\-():]+$/.test(raw) && !/[åäöÅÄÖ]/.test(raw) && !/Inget hittades|Något gick fel|Fel kod/.test(raw))) {
      return "Något gick fel när appen skulle öppnas. Logga in igen och försök på nytt.";
    }
    return raw;
  }

  function isUnlockError(err) {
    const code = err && (err.code || err.name);
    const raw = String((err && err.message) || "");
    return (err && err.status === 401) || code === "bad_passcode" || code === "decrypt_failed" || code === "OperationError"
      || /operation failed|OperationError|decrypt/i.test(raw);
  }

  function errorView(msg, back) {
    const safe = swedishLoadError(msg);
    return `${topbar({ title: APP_NAME, back: back || null, backLabel: "Tillbaka" })}
      <div class="screen"><div class="state">
        <div class="ico">⚠️</div>
        <h3>Kunde inte ladda</h3>
        <p>${h(safe || "Något gick fel när appen skulle öppnas. Logga in igen och försök på nytt.")}</p>
        <button class="btn btn-primary" data-action="login-again" style="margin-top:20px">Logga in igen</button>
      </div></div>`;
  }

  function emptyView(title, body) {
    return `<div class="state"><div class="ico">—</div><h3>${h(title)}</h3><p>${h(body)}</p></div>`;
  }

  const MOVERS_RANGE_SV = { today: "idag", "7d": "på 7 dagar", "30d": "på 30 dagar", month: "denna månad", year: "i år", start: "sedan start" };

  function assetLinkOf(item) {
    return (window.DeskAPI && DeskAPI.assetLink) ? DeskAPI.assetLink(item) : null;
  }

  function coinHrefOf(item) {
    return (window.DeskAPI && DeskAPI.coinHref) ? DeskAPI.coinHref(item) : "";
  }

  function backForCoin() {
    const prev = state.coinBack || "home";
    if (prev === "markets") return { hash: "#/markets", label: "Marknad" };
    if (prev === "watch") return { hash: "#/watch", label: "Bevaka" };
    if (prev === "live" || prev === "activity") return { hash: "#/live", label: "Live" };
    if (prev === "affarer") return { hash: "#/affarer", label: "Affärer" };
    if (prev === "ranking") return { hash: "#/ranking", label: "Ranking" };
    if (prev === "kalender") return { hash: "#/kalender", label: "Kalender" };
    if (prev === "livekrav") return { hash: "#/live-krav", label: "LIVE-krav" };
    return { hash: "#/home", label: "Hem" };
  }

  function rememberCoinBack(name) {
    if (["home", "markets", "watch", "live", "activity", "affarer", "ranking", "kalender", "livekrav"].includes(name)) {
      state.coinBack = name === "activity" ? "live" : name;
    }
  }

  function assetRow(item, inner, extraClass, extraAttr) {
    const cls = extraClass || "row";
    const attr = extraAttr ? " " + extraAttr : "";
    const href = coinHrefOf(item);
    if (href) {
      return `<a class="${cls}" href="${h(href)}" data-nav="${h(href)}"${attr}>${inner}</a>`;
    }
    return `<div class="${cls}"${attr}>${inner}</div>`;
  }

  function openMarketBtn(item) {
    const link = assetLinkOf(item);
    if (!link || !link.url) return "";
    return `<a class="btn btn-primary" href="${h(link.url)}" target="_blank" rel="noopener">${h(link.button || ("Öppna på " + link.label))}</a>`;
  }

  /* ---------- 1. HEM (Portfolio & Positions ONLY) ---------- */
  function renderHome() {
    const d = state.desk;
    if (state.loading && !d) return skeleton();
    if (state.error && !d) return errorView(state.error);
    const laneF = state.laneFilter || "all";
    const positions = (d.positions || []).filter((p) => matchesLane(p, laneF));
    const lanes = d.lanes || null;
    const eq = Number(d.equity_usd || 0);
    const cash = Number(d.cash_usd || 0);
    const inPlay = Number(d.positions_value_usd != null ? d.positions_value_usd : Math.max(0, eq - cash));
    const resPct = eq > 0 ? Math.max(0, Math.round((cash / eq) * 100)) : 0;

    return `${topbar({
      title: APP_NAME,
      brand: true,
      left: pillPaperOrLive(d.mode),
      right: `<span class="pill pill-muted"><span class="pill-dot pulse"></span>${h(d.schedule || "24/7")}</span>`
    })}
    <div class="screen"><div class="page">
      ${window.DeskFun ? DeskFun.ticker(state.ticker && state.ticker.items) : ""}

      <div class="hero-card">
        ${heroPnlBlock(d)}
        ${window.DeskFun && state.fun ? `<div style="margin-top:10px">${DeskFun.streakChip(state.fun.streak)}</div>` : ""}
        <div class="portfolio-strip">
          <div class="p-stat"><div class="k">Kassa</div><div class="v nums">${h(fmtUsd(cash, { exact: true }))}</div></div>
          <div class="p-stat"><div class="k">I spel</div><div class="v nums">${h(fmtUsd(inPlay, { exact: true }))}</div></div>
          <div class="p-stat"><div class="k">Reserv</div><div class="v nums">${h(resPct)}%</div></div>
        </div>
      </div>
      ${window.DeskPages && DeskPages.clockChip ? DeskPages.clockChip(state) : ""}

      <div class="segments segments-scroll" data-role="chart-range">
        ${chartRangeButtons()}
      </div>
      ${chartSummary(state.chart)}
      <div class="chart-wrap"><canvas id="equity-chart"></canvas></div>

      ${lanePnlCard(lanes)}

      ${laneFilterRow()}
      <div class="card">
        <div class="card-h">Öppna positioner <span class="tiny">${positions.length} st</span></div>
        ${positions.length ? positions.map((p) => assetRow(p, `
            ${tokenAvatar(p.symbol, p.mint, p.icon_url)}
            <div class="row-body">
              <div class="row-title">${h(p.symbol)}${laneChip(laneOf(p))}</div>
              <div class="row-sub">${h(p.name || "")}${p.name ? " · " : ""}entry ${h(fmtUsd(p.entry_usd))}</div>
            </div>
            <div class="row-meta">
              <div class="asset-val nums">${h(fmtUsd(p.value_usd || p.size_usd, { exact: true }))}</div>
              ${pnlStack(p.pnl_pct, p.pnl_usd)}
            </div>
            ${coinHrefOf(p) ? svg("chev") : ""}`, "row has-avatar asset-row", "")).join("") : `<div class="state" style="padding:26px 16px"><p>Inga öppna positioner i valt spår.</p></div>`}
      </div>
    </div></div>`;
  }

  /* ---------- 2. MARKNAD (Moods per lane, Regime, Movers, Universe) ---------- */
  function moversCard() {
    const side = state.moversSide === "worst" ? "worst" : "best";
    const raw = ((state.movers && state.movers.items) || []).filter((x) => x && x.change_pct != null);
    const items = (side === "worst" ? raw.slice().sort((a, b) => a.change_pct - b.change_pct) : raw.slice().sort((a, b) => b.change_pct - a.change_pct)).slice(0, 6);
    const rng = (state.movers && state.movers.range) || state.chartRange || "today";
    const lab = MOVERS_RANGE_SV[rng] || "perioden";
    const rows = items.length ? items.map((c) => {
      const href = coinHrefOf(c);
      const symCell = href
        ? `<a href="${h(href)}" data-nav="${h(href)}">${h(c.symbol)}${c.held ? " 💼" : ""}</a>`
        : `${h(c.symbol)}${c.held ? " 💼" : ""}`;
      return `<div class="mkt-row">
        <div class="mkt-info">
          <div class="mkt-sym">${symCell}</div>
          <div class="mkt-sub nums">${h(lab)}</div>
        </div>
        <div class="mkt-px nums">${h(fmtUsd(c.price, { exact: true }))}</div>
        <div class="mkt-act">
          ${pnlPill(c.change_pct)}
          <button type="button" class="mkt-add-btn" data-quick-watch="${h(c.symbol)}" data-quick-mint="${h(c.mint || "")}" data-quick-type="crypto" title="Be botarna kolla">+Koll</button>
        </div>
      </div>`;
    }).join("") : `<div class="state" style="padding:20px 16px"><p>Inga coins att jämföra för den här perioden än.</p></div>`;
    return `<div class="card" id="movers-card">
      <div class="card-h">Top Movers
        <div class="segments" data-role="movers-side" style="margin:0;width:140px">
          <button type="button" data-movers="best" class="${side === "best" ? "on" : ""}">Bästa</button>
          <button type="button" data-movers="worst" class="${side === "worst" ? "on" : ""}">Sämsta</button>
        </div>
      </div>
      ${items.length ? `<div class="mkt-table-head"><span class="h-name">Coin</span><span class="h-px">Pris</span><span class="h-chg">Utv · Koll</span></div>` : ""}
      ${rows}
    </div>`;
  }

  function universeCategoryKind(cat) {
    const c = String(cat || "").toLowerCase();
    if (["gold", "silver", "oil", "copper", "natgas", "platinum", "palladium", "commodity"].includes(c)) return "commodities";
    if (["equity", "index", "etf", "gold_miners", "fx", "stocks"].includes(c)) return "stocks";
    return "crypto";
  }

  function renderMarkets() {
    const d = state.desk;
    if (state.loading && !d) return `${topbar({ title: "Marknad" })}${skeleton()}`;
    if (state.error && !d) return errorView(state.error);
    const regimeRaw = (d && d.market && d.market.regime) || "GREEN";
    const regime = ({ GREEN: "RISK_ON", QUIET: "CAUTION", RED: "RISK_OFF" })[regimeRaw] || regimeRaw;
    const regimeLabel = regime === "RISK_OFF" ? "RÖTT · inga nya köp" : regime === "CAUTION" ? "LUGNT · max 1 position" : "GRÖNT · köper som vanligt";
    const regimeCls = regime === "RISK_OFF" ? "off" : regime === "CAUTION" ? "caution" : "on";
    const btc = (d && d.market && d.market.btc) || {};
    const sol = (d && d.market && d.market.sol) || {};

    const uniRaw = (state.universe && state.universe.items) || [];
    const perpsRaw = (state.universe && state.universe.perps) || [];
    const majorsRaw = ((d && d.positions) || []).filter((p) => laneOf(p) === "majors");
    const mktItems = [];
    const seenSym = new Set();
    uniRaw.forEach((u) => {
      if (!u || !u.symbol || seenSym.has(u.symbol)) return;
      seenSym.add(u.symbol);
      mktItems.push({
        symbol: u.symbol,
        name: u.name || u.category || "",
        category: u.category || "crypto",
        kind: universeCategoryKind(u.category),
        venue: u.venue || "solana",
        mint: u.mint || "",
        price: u.price
      });
    });
    perpsRaw.forEach((p) => {
      if (!p || !p.symbol || seenSym.has(p.symbol)) return;
      seenSym.add(p.symbol);
      mktItems.push({
        symbol: p.symbol,
        name: p.market || p.category || "",
        category: p.category || "equity",
        kind: universeCategoryKind(p.category),
        venue: "hyperliquid",
        mint: "",
        price: p.mark_price
      });
    });
    majorsRaw.forEach((m) => {
      if (!m || !m.symbol || seenSym.has(m.symbol)) return;
      seenSym.add(m.symbol);
      mktItems.push({
        symbol: m.symbol,
        name: m.name || "Major coin",
        category: "majors",
        kind: "crypto",
        venue: "solana",
        mint: m.mint || "",
        price: m.mark_usd
      });
    });
    const mktF = state.mktFilter || "all";
    const filteredMkt = mktItems.filter((x) => mktF === "all" || x.kind === mktF).slice(0, 30);
    const mktFilters = [["all", "Alla"], ["crypto", "Crypto"], ["commodities", "Guld & Råvaror"], ["stocks", "Aktier"]];

    return `${topbar({ title: "Marknad", right: pillPaperOrLive(d && d.mode) })}
    <div class="screen"><div class="page">
      ${window.DeskFun && DeskFun.moodLanes ? DeskFun.moodLanes(state.moods, state.moodLane) : ""}

      <div class="card market-card">
        <div class="regime">
          <div>
            <div class="tiny">Marknadsläge</div>
            <div class="regime-name ${regimeCls}">${h(regimeLabel)}</div>
          </div>
        </div>
        <div class="market-grid">
          <a class="market-pair" href="#/coin/BTC" data-nav="#/coin/BTC">
            <div class="k">BTC</div>
            <div class="v nums">${h(fmtUsd(btc.price, { exact: true }))}
              <span class="chg ${chgClass(btc.change_24h_pct)}">${h(fmtPct(btc.change_24h_pct))}</span>
            </div>
          </a>
          <a class="market-pair" href="#/coin/SOL" data-nav="#/coin/SOL">
            <div class="k">SOL</div>
            <div class="v nums">${h(fmtUsd(sol.price, { exact: true }))}
              <span class="chg ${chgClass(sol.change_24h_pct)}">${h(fmtPct(sol.change_24h_pct))}</span>
            </div>
          </a>
        </div>
        ${d && d.market && d.market.news ? `<div class="market-note">${h(d.market.news)}</div>` : ""}
      </div>

      ${moversCard()}

      <div class="card">
        <div class="card-h">Godkända marknader <a class="link" href="#/watch" data-nav="#/watch">Begär ny ›</a></div>
        <div class="filters" style="padding-top:0">
          ${mktFilters.map(([id, lab]) => `<button type="button" data-mkt-filter="${id}" class="${mktF === id ? "on" : ""}">${h(lab)}</button>`).join("")}
        </div>
        ${filteredMkt.length ? filteredMkt.map((item) => {
          const reqType = item.kind === "stocks" ? "stock" : item.kind === "commodities" ? "commodity" : "crypto";
          const href = coinHrefOf(item);
          return `<div class="mkt-row">
            <div class="mkt-info">
              <div class="mkt-sym">${href ? `<a href="${h(href)}" data-nav="${h(href)}">${h(item.symbol)}</a>` : h(item.symbol)} <span class="lane lane-assets">${h(item.category)}</span></div>
              <div class="mkt-sub">${h(item.name || item.venue)} · ${h(item.venue)}</div>
            </div>
            <div class="mkt-px nums">${item.price != null ? h(fmtUsd(item.price, { exact: true })) : "—"}</div>
            <div class="mkt-act">
              <button type="button" class="mkt-add-btn" data-quick-watch="${h(item.symbol)}" data-quick-mint="${h(item.mint || "")}" data-quick-type="${reqType}">+Bevaka</button>
            </div>
          </div>`;
        }).join("") : `<div class="state" style="padding:22px 16px"><p>Inga godkända marknader i denna kategori just nu.</p></div>`}
      </div>
    </div></div>`;
  }

  /* ---------- 3. BEVAKA (Live Coin & Stock Tracker + Price Alerts) ---------- */
  function reqStatusLabel(st) {
    return ({
      pending: "Väntar",
      watching: "Bevakas",
      evaluated: "Kollad",
      rejected: "Ej i auto",
      local: "Lokal kö"
    })[st] || st || "Väntar";
  }

  function reqTypeLabel(t) {
    return ({ auto: "Auto", crypto: "Coin", stock: "Aktie", commodity: "Guld/Råvara" })[t] || t;
  }

  function mergedWatchItems() {
    const remoteItems = (state.requests && state.requests.items) || [];
    const localItems = readLocalRequests();
    const merged = [];
    const remoteMap = new Map();
    remoteItems.forEach((r) => {
      const k = (r.mint || r.symbol || "").toUpperCase();
      if (k) remoteMap.set(k, r);
      merged.push(Object.assign({ origin: "server" }, r));
    });
    const keptLocal = [];
    localItems.forEach((r) => {
      const k = (r.mint || r.symbol || "").toUpperCase();
      const srv = k ? remoteMap.get(k) : null;
      if (srv) {
        if (r.pending_remove) {
          const idx = merged.findIndex((x) => x.origin === "server" && ((x.mint || x.symbol || "").toUpperCase() === k));
          if (idx >= 0) merged[idx] = Object.assign({}, merged[idx], { status: "pending", bot_reply: "Tar bort via Telegram…" });
          keptLocal.push(r);
          return;
        }
        const sameAlerts = (srv.alert_above ?? null) === (r.alert_above ?? null) && (srv.alert_below ?? null) === (r.alert_below ?? null);
        if (sameAlerts) return;
        const idx = merged.findIndex((x) => x.origin === "server" && ((x.mint || x.symbol || "").toUpperCase() === k));
        if (idx >= 0) {
          merged[idx] = Object.assign({}, merged[idx], {
            alert_above: r.alert_above, alert_below: r.alert_below, status: "pending"
          });
        }
        keptLocal.push(r);
        return;
      }
      if (!r.pending_remove) {
        merged.push(Object.assign({ origin: "local", status: "pending" }, r));
        keptLocal.push(r);
      }
    });
    if (keptLocal.length !== localItems.length) writeLocalRequests(keptLocal);
    return merged;
  }

  function telegramBotName() {
    return (state.desk && state.desk.telegram && state.desk.telegram.bot_username) || "MONEYMAKINgGGG_BOT";
  }

  function buildBevakaCmd(symbolOrMint, above, below) {
    let cmd = "/bevaka " + String(symbolOrMint || "").trim().replace(/^\$/, "");
    if (above != null && isFinite(above)) cmd += " over " + above;
    if (below != null && isFinite(below)) cmd += " under " + below;
    return cmd;
  }

  function openTelegramCmd(cmd) {
    const bot = telegramBotName();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd).catch(() => {});
      }
    } catch (_) {}
    const url = "https://t.me/" + encodeURIComponent(bot) + "?text=" + encodeURIComponent(cmd);
    try {
      const w = window.open(url, "_blank", "noopener");
      if (!w) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (_) {}
    return url;
  }

  function quoteForWatchItem(r) {
    const qMap = state.liveQuotes || {};
    const m = r.mint || r.resolved_mint;
    const sym = String(r.symbol || "").toUpperCase();
    const live = (m && qMap["M:" + m]) || qMap["S:" + sym] || null;
    if (live && live.price != null) return live;
    if (r.price != null) return { price: r.price, change_24h: r.change_24h, source: r.quote_source || "snapshot" };
    return null;
  }

  function renderWatch() {
    const d = state.desk || {};
    if (state.loading && !state.desk) return `${topbar({ title: "Bevaka" })}${skeleton()}`;
    const merged = mergedWatchItems();
    const canWrite = !!(DeskAPI.canWriteRemote && DeskAPI.canWriteRemote());
    const watching = (state.requests && state.requests.watching) || d.watching || [];
    const picks = d.copy_picks || [];
    const types = [["auto", "Auto"], ["crypto", "Coin"], ["stock", "Aktie"], ["commodity", "Guld & Råvara"]];
    const quick = [["BTC", "crypto"], ["ETH", "crypto"], ["SOL", "crypto"], ["BONK", "crypto"], ["NVDA", "stock"], ["TSLA", "stock"], ["AAPL", "stock"], ["PAXG", "commodity"], ["SLVx", "commodity"]];

    return `${topbar({ title: "Bevaka", right: pillPaperOrLive(d.mode) })}
    <div class="screen"><div class="page">
      <div class="card">
        <div class="card-h">Lägg till coin eller aktie i bevakningen</div>
        <form class="req-form" data-req-form>
          <div class="req-quick">
            <span class="tiny">Snabbval:</span>
            ${quick.map(([sym, tp]) => `<button type="button" class="req-quick-chip" data-fill-sym="${sym}" data-fill-type="${tp}">${sym}</button>`).join("")}
          </div>
          <input class="req-input" type="text" name="symbol" value="${h(state.reqFormSym)}" placeholder="Ticker eller Solana-mint (t.ex. BTC, SOL, NVDA)" autocomplete="off" spellcheck="false">
          <div class="req-type-row">
            ${types.map(([id, lab]) => `<button type="button" class="req-type-btn ${state.reqFormType === id ? "on" : ""}" data-req-type="${id}">${lab}</button>`).join("")}
          </div>
          <div class="req-alert-grid">
            <input class="req-input" type="number" step="any" min="0" inputmode="decimal" name="alert_above" value="${h(state.reqFormAbove)}" placeholder="Prislarm över ($)">
            <input class="req-input" type="number" step="any" min="0" inputmode="decimal" name="alert_below" value="${h(state.reqFormBelow)}" placeholder="Prislarm under ($)">
          </div>
          <input class="req-input" type="text" name="note" value="${h(state.reqFormNote)}" placeholder="Valfri kommentar (t.ex. Kolla volym / rapport)" autocomplete="off">
          ${state.reqError ? `<div class="lock-error" style="margin:0;text-align:left">${h(state.reqError)}</div>` : ""}
          <button type="submit" class="btn btn-gold" style="margin:2px 0 0" ${state.reqBusy ? "disabled" : ""}>${state.reqBusy ? "Sparar…" : "Lägg till & begär koll"}</button>
          <div class="tiny" style="line-height:1.4">Livepris & 24h-utveckling visas nedan. Prislarm skickas direkt via Telegram, och botarna använder listan som mjuk signal (säkerhetsregler går alltid först).</div>
        </form>
      </div>

      <div class="card">
        <div class="card-h">
          <span>Bevakade coins & aktier <span class="tiny">(${merged.length} st)</span></span>
          <button type="button" class="btn-small" data-refresh-quotes ${state.quotesLoading ? "disabled" : ""}>${state.quotesLoading ? "Uppdaterar…" : "↻ Priser"}</button>
        </div>
        ${merged.length ? merged.map((r) => {
          const st = r.status || "pending";
          const q = quoteForWatchItem(r);
          const pxStr = q && q.price != null ? fmtUsd(q.price, { exact: true }) : "—";
          const chg = q && q.change_24h != null ? Number(q.change_24h) : null;
          const isEditing = String(state.reqEditId || "") === String(r.id);
          const alertText = [
            r.alert_above != null ? `över $${r.alert_above}` : "",
            r.alert_below != null ? `under $${r.alert_below}` : ""
          ].filter(Boolean).join(" / ");
          const copyText = `Bevaka ${r.symbol} (${reqTypeLabel(r.asset_type)})${alertText ? " larm " + alertText : ""}${r.note ? ": " + r.note : ""}`;
          const href = coinHrefOf({ symbol: r.symbol, mint: r.mint || r.resolved_mint, venue: r.asset_type === "stock" ? "hyperliquid" : "solana" });
          return `<div class="req-item">
            <div class="req-top">
              <div>
                <div class="req-sym">${href ? `<a href="${h(href)}" data-nav="${h(href)}">${h(r.symbol)}</a>` : h(r.symbol)} <span class="lane lane-assets">${h(reqTypeLabel(r.asset_type))}</span> <span class="req-status ${h(st)}">${h(reqStatusLabel(st))}</span></div>
              </div>
              <div class="req-px-box">
                <div class="req-px-val nums">${h(pxStr)}</div>
                <div>${chg != null ? `<span class="pnl-pill ${chgClass(chg)} nums">${h(fmtPct(chg))}</span>` : `<span class="tiny">24h —</span>`}</div>
              </div>
            </div>
            ${(r.alert_above != null || r.alert_below != null || r.alert_triggered_at) ? `<div class="req-alert-row">
              ${r.alert_above != null ? `<span class="req-alert-pill">🔔 Över ${h(fmtUsd(r.alert_above, { exact: true }))}</span>` : ""}
              ${r.alert_below != null ? `<span class="req-alert-pill">🔔 Under ${h(fmtUsd(r.alert_below, { exact: true }))}</span>` : ""}
              ${r.alert_triggered_at ? `<span class="req-alert-pill hit">🚨 Utlöst ${h(sthlmStamp(r.alert_triggered_at))}</span>` : ""}
            </div>` : ""}
            ${r.note ? `<div class="row-sub" style="margin-top:4px;white-space:normal">Din notis: ${h(r.note)}</div>` : ""}
            ${r.bot_reply ? `<div class="req-reply">${r.bot_name ? `<b>${h(botMeta(r.bot_name).label)}:</b> ` : ""}${h(r.bot_reply)}</div>` : ""}
            ${isEditing ? `<form class="req-alert-edit" data-edit-alert-form="${h(r.id)}" data-req-origin="${h(r.origin || "server")}">
              <div class="req-alert-grid">
                <input class="req-input" type="number" step="any" min="0" inputmode="decimal" name="alert_above" value="${r.alert_above != null ? h(r.alert_above) : ""}" placeholder="Över ($)">
                <input class="req-input" type="number" step="any" min="0" inputmode="decimal" name="alert_below" value="${r.alert_below != null ? h(r.alert_below) : ""}" placeholder="Under ($)">
              </div>
              <div class="req-actions" style="justify-content:flex-end">
                <button type="button" class="btn-small" data-toggle-alert-edit="">Avbryt</button>
                <button type="submit" class="btn-small gold">Spara larm</button>
              </div>
            </form>` : ""}
            <div class="req-meta">
              <span>${h(sthlmStamp((q && q.ts) || r.quote_ts || r.updated_at || r.created_at) || "nyss")}${r.score != null ? ` · Betyg ${Math.round(r.score)}` : ""}</span>
              <div class="req-actions">
                <button type="button" class="btn-small" data-toggle-alert-edit="${h(r.id)}">🔔 Larm</button>
                <button type="button" class="btn-small" data-del-req="${h(r.id)}" data-req-origin="${h(r.origin || "server")}" data-req-sym="${h(r.symbol)}">Ta bort</button>
              </div>
            </div>
          </div>`;
        }).join("") : `<div class="state" style="padding:24px 16px"><p>Inga bevakningar än. Lägg till en coin eller aktie ovan för att se livepris, 24h % och sätta prislarm.</p></div>`}
      </div>

      ${watching.length ? `<div class="card">
        <div class="card-h">Botarnas aktiva bevakning</div>
        ${watching.map((w) => assetRow(w, `
            ${tokenAvatar(w.symbol, w.mint)}
            <div class="row-body">
              <div class="row-title">${h(w.symbol)}${laneChip(laneOf(w))}</div>
              <div class="row-sub">${h(reasonText(w.reason || w.name || ""))}</div>
            </div>
            <div class="row-meta"><div class="tiny">${w.score != null ? "Score " + h(w.score) : ""}</div></div>
            ${coinHrefOf(w) ? svg("chev") : ""}`, "row has-avatar")).join("")}
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
    </div></div>`;
  }

  /* ---------- 4. LIVE (Bot-to-Bot Q&A & Activity) ---------- */
  function liveChatItems() {
    const out = [];
    const seen = new Set();
    const push = (it) => {
      if (!it) return;
      const text = (it.text || it.title || it.body || "").trim();
      if (!text) return;
      const rawId = String(it.id != null ? it.id : "").replace(/^[ae]:/, "");
      const bot = it.from_bot || it.bot;
      const id = rawId || (bot + "|" + text + "|" + (it.ts || ""));
      if (seen.has(id) || seen.has(bot + "|" + text)) return;
      seen.add(id);
      seen.add(bot + "|" + text);
      out.push({
        id, ts: it.ts, kind: (it.kind || "system"),
        from_bot: bot, to_bot: it.to_bot, text,
        thread_id: it.thread_id, mint: it.mint, symbol: it.symbol, lane: it.lane,
        pnl_usd: it.pnl_usd, pnl_pct: it.pnl_pct
      });
    };
    ((state.chatter && state.chatter.items) || []).forEach(push);
    ((state.live && state.live.items) || []).forEach(push);
    if (!out.length) {
      ((state.activity && state.activity.items) || []).forEach(push);
      ((state.fun && state.fun.chat) || []).forEach(push);
    }
    return out;
  }

  function liveKindMatch(kind, filter) {
    const k = String(kind || "").toLowerCase();
    if (!filter || filter === "all") return true;
    if (filter === "chat") return k === "question" || k === "answer" || k === "checkin" || k === "decision";
    if (filter === "trades") return k === "buy" || k === "sell" || k === "bought" || k === "sold" || k === "decision";
    if (filter === "blocks") return k === "block" || k === "stop" || k === "stopped" || k === "rejected" || k === "guard";
    return true;
  }

  function liveKindTag(kind) {
    return ({
      question: "frågar", answer: "svarar", checkin: "koll", decision: "beslut",
      buy: "köp", sell: "sälj", stop: "stopp", block: "stopp", news: "nyhet"
    })[kind] || "";
  }

  function renderLiveMsg(it, reply) {
    const meta = botMeta(it.from_bot);
    const to = it.to_bot ? botMeta(it.to_bot).label : "";
    const tag = liveKindTag(it.kind);
    const who = to ? `${meta.label} → ${to}` : meta.label;
    const cls = `msg${reply ? " reply" : ""}${it.kind ? " k-" + h(it.kind) : ""}`;
    return `<div class="${cls}" data-bot="${h(it.from_bot || "")}">
      <span class="av" title="${h(meta.label)}">${meta.emoji}</span>
      <div class="bubble">
        <div class="who"><span class="who-name">${h(who)}</span>${tag ? `<span class="kind-tag">${h(tag)}</span>` : ""}<span class="when">${h(sthlmStamp(it.ts) || relTime(it.ts) || "")}</span></div>
        <div class="bubble-text">${h(it.text)}</div>
        ${coinHrefOf(it) && (it.symbol || it.mint) ? `<a class="coin-chip" href="${h(coinHrefOf(it))}" data-nav="${h(coinHrefOf(it))}">${h(it.symbol || "Coin")}</a>` : ""}
        ${it.pnl_usd != null && (it.kind === "sell" || it.kind === "stop") ? `<div class="chg ${chgClass(it.pnl_usd)} nums">${h(fmtUsd(it.pnl_usd, { exact: true }))}</div>` : ""}
      </div>
    </div>`;
  }

  function renderLive() {
    const raw = liveChatItems();
    if (state.loading && !raw.length) return `${topbar({ title: "Live" })}${skeleton()}`;
    if (state.error && !raw.length) return errorView(state.error);
    const filtered = raw.filter((it) => liveKindMatch(it.kind, state.activityFilter))
      .filter((it) => !state.liveBotFilter || state.liveBotFilter === "all" || it.from_bot === state.liveBotFilter || it.to_bot === state.liveBotFilter)
      .slice()
      .sort((x, y) => {
        const ta = parseTs(x && x.ts), tb = parseTs(y && y.ts);
        return (ta ? ta.getTime() : 0) - (tb ? tb.getTime() : 0);
      });
    const bots = [];
    const seen = new Set();
    raw.forEach((it) => {
      const b = it.from_bot;
      if (b && !seen.has(b)) { seen.add(b); bots.push(b); }
    });
    const order = ["newsfeed", "social", "analyst", "scanner", "whale", "risk", "meme_test", "majors", "assets"];
    bots.sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
    const kindFilters = [["all", "Alla"], ["chat", "Snack"], ["trades", "Affärer"]];
    const botChips = [["all", "Alla botar"], ...bots.map((b) => [b, botMeta(b).emoji + " " + botMeta(b).label])];
    const threads = new Map();
    const blocks = [];
    filtered.forEach((it) => {
      if (it.thread_id) {
        if (!threads.has(it.thread_id)) {
          const list = [];
          threads.set(it.thread_id, list);
          blocks.push({ type: "thread", id: it.thread_id, list });
        }
        threads.get(it.thread_id).push(it);
      } else {
        blocks.push({ type: "msg", it });
      }
    });
    const html = blocks.map((b) => {
      if (b.type === "msg") return renderLiveMsg(b.it, false);
      const list = b.list.slice().sort((x, y) => {
        const rank = (k) => k === "question" ? 0 : k === "answer" ? 1 : k === "decision" ? 2 : 3;
        const d = rank(x.kind) - rank(y.kind);
        if (d) return d;
        const ta = parseTs(x.ts), tb = parseTs(y.ts);
        return (ta ? ta.getTime() : 0) - (tb ? tb.getTime() : 0);
      });
      return `<div class="thread">${list.map((it, i) => renderLiveMsg(it, i > 0)).join("")}</div>`;
    }).join("");
    return `${topbar({ title: "Live", right: pillPaperOrLive(state.desk && state.desk.mode) })}
    <div class="screen"><div class="page live-page">
      <p class="live-lead">Botarna frågar varandra och svarar med riktig data. Uppdateras varje minut.</p>
      <div class="filters">
        ${kindFilters.map(([id, lab]) => `<button data-filter="${id}" class="${state.activityFilter === id ? "on" : ""}">${lab}</button>`).join("")}
      </div>
      <div class="filters bot-filters">
        ${botChips.map(([id, lab]) => `<button data-bot-filter="${h(id)}" class="${(state.liveBotFilter || "all") === id ? "on" : ""}">${h(lab)}</button>`).join("")}
      </div>
      ${filtered.length ? `<div class="live-chat" id="chat-feed">${html}</div>` : emptyView("Inget snack än", "När botarna kollar läget eller frågar varandra syns det här.")}
    </div></div>`;
  }

  /* ---------- 5. MER / KONTO, BOTAR, REGLER, AWARDS, COIN, AUDIT ---------- */
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
      <div class="card-h">Riskmätare</div>
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

  function renderAccount() {
    const d = state.desk;
    const wallet = (d && d.wallet) || { address: "—", label: "Phantom-plånbok (botens)" };
    const unlocked = DeskAPI.isUnlocked && DeskAPI.isUnlocked();
    const mode = (d && d.mode) || "PAPER";
    const botCount = ((d && d.bots) || []).length || 17;
    return `${topbar({ title: "Mer", right: pillPaperOrLive(mode) })}
    <div class="screen"><div class="page">
      <div class="account-hero">
        <div class="mark"><img src="apple-touch-icon.png" alt="Moneymaking G"></div>
        <h2>Moneymaking G</h2>
        <p>Körs dygnet runt · ${mode === "LIVE" ? "LIVE" : "PAPER"}-läge</p>
      </div>

      <div class="hub-grid">
        <a class="hub-tile" href="#/bots" data-nav="#/bots">
          <span class="ico">🤖</span>
          <span class="t">Botar (${botCount})</span>
          <span class="s">Status & beslut ›</span>
        </a>
        <a class="hub-tile" href="#/regler" data-nav="#/regler">
          <span class="ico">🛡️</span>
          <span class="t">Regler & Risk</span>
          <span class="s">Tak & LIVE-krav ›</span>
        </a>
        <a class="hub-tile" href="#/awards" data-nav="#/awards">
          <span class="ico">🏆</span>
          <span class="t">Topplista & Märken</span>
          <span class="s">Vinnare & meme ›</span>
        </a>
        <a class="hub-tile" href="#/watch" data-nav="#/watch">
          <span class="ico">🔎</span>
          <span class="t">Bevaka</span>
          <span class="s">Begär coin/aktie ›</span>
        </a>
        <a class="hub-tile" href="#/affarer" data-nav="#/affarer">
          <span class="ico">📜</span>
          <span class="t">Affärer</span>
          <span class="s">Stängda trades ›</span>
        </a>
        <a class="hub-tile" href="#/ranking" data-nav="#/ranking">
          <span class="ico">📊</span>
          <span class="t">Bot-ranking</span>
          <span class="s">Win rate & PnL ›</span>
        </a>
        <a class="hub-tile" href="#/kalender" data-nav="#/kalender">
          <span class="ico">📅</span>
          <span class="t">PnL-kalender</span>
          <span class="s">Dag för dag ›</span>
        </a>
        <a class="hub-tile" href="#/live-krav" data-nav="#/live-krav">
          <span class="ico">⏳</span>
          <span class="t">LIVE-krav</span>
          <span class="s">60 dagar & STEP 15 ›</span>
        </a>
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
        <div class="card-h">Inställningar</div>
        <div class="row"><div class="row-body"><div class="row-title">Läge</div></div><div class="row-meta">${pillPaperOrLive(mode)}</div></div>
        <div class="row"><div class="row-body"><div class="row-title">Schema</div></div><div class="row-meta">${h((d && d.schedule) || "24/7")}</div></div>
        <div class="row"><div class="row-body"><div class="row-title">Anslutning</div></div><div class="row-meta tiny">${unlocked ? "Inloggad" : "Utloggad"}</div></div>
        ${unlocked ? `<div class="row"><div class="row-body"><div class="row-title">Session</div><div class="row-sub">Koden sparas inte. Logga ut härifrån.</div></div><button type="button" class="copy-btn" data-action="logout">Logga ut</button></div>` : ""}
        <div class="row"><div class="row-body"><div class="row-title">Notiser</div><div class="row-sub">Notis vid köp, sälj och stopp</div></div>
          <button class="copy-btn" data-action="notify">Slå på</button>
        </div>
        ${window.DeskFun ? DeskFun.soundToggle() : ""}
        <div class="row"><div class="row-body"><div class="row-title">Version</div><div class="row-sub">${h(buildLabel())}</div></div></div>
      </div>

      <p class="tiny" style="text-align:center;margin:16px 8px 0;line-height:1.4">Appen frågar aldrig efter seed phrase, lösenord eller 2FA-kod. Botens plånbok är en separat Phantom-plånbok som bara Moneymaking G använder.</p>
    </div></div>`;
  }

  function renderAwards() {
    const f = state.fun || {};
    return `${topbar({ title: "Topplista & Märken", back: "#/account", backLabel: "Mer", right: pillPaperOrLive(state.desk && state.desk.mode) })}
    <div class="screen"><div class="page">
      ${window.DeskFun ? DeskFun.leaderboard(f.leaderboard, state.lbPeriod || "vecka") : ""}
      ${window.DeskFun ? DeskFun.week(f.week) : ""}
      ${window.DeskFun ? DeskFun.meme(f.meme) : ""}
      ${window.DeskFun ? DeskFun.badges(f.badges, f.mode) : ""}
    </div></div>`;
  }

  function renderBots() {
    if (state.loading && !state.desk) return skeleton();
    if (state.error && !state.desk) return errorView(state.error);
    const list = (state.desk && state.desk.bots) || [];
    const byName = Object.fromEntries(list.map((b) => [b.name, b]));
    return `${topbar({ title: "Botar", back: "#/account", backLabel: "Mer", right: pillPaperOrLive(state.desk && state.desk.mode) })}
    <div class="screen"><div class="page">
      <p class="muted" style="font-size:14px;margin:2px 0 8px">Alla botar jobbar ihop dygnet runt. Tryck på en bot för att se dess beslut.</p>
      ${BOT_GROUPS.map((g) => `
      <div class="card-h group-h">${h(g.title)}</div>
      <div class="card bots-list">
        ${g.names.map((name) => {
          const b = byName[name] || { name, label: botMeta(name).label, status: "idle", last: "" };
          const color = BOT_COLORS[name] || "var(--label)";
          return `<a class="row" href="#/bots/${name}" data-nav="#/bots/${name}">
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
          ${(() => { const L = assetLinkOf(d); const tag = L && L.url ? "a" : "div"; const href = L && L.url ? ` href="${h(L.url)}" target="_blank" rel="noopener"` : ""; return `
          <${tag} class="decision"${href}>
            <div class="when">${h(sthlmStamp(d.ts) || relTime(d.ts))}${d.symbol ? " · " + h(d.symbol) : ""}</div>
            <div class="act">${h(d.action || "")}</div>
            <p>${h(reasonText(d.reason || ""))}</p>
          </${tag}>`; })()}
        `).join("") : emptyView("Inga beslut än", "När boten gör något syns det här.")}
      </div>
    </div></div>`;
  }

  function renderChat() {
    const back = (state.route && state.route.bot) ? "#/bots" : "#/live";
    const page = window.DeskFun && DeskFun.chatPage
      ? DeskFun.chatPage((state.fun && state.fun.chat) || [], state.route && state.route.bot, back)
      : { title: "Botarnas chatt", back: back, html: "<div class=\"muted\" style=\"padding:24px\">Chatten kunde inte laddas.</div>" };
    return `${topbar({ title: page.title, back: page.back, backLabel: "Tillbaka" })}
    <div class="chat-screen">${page.html}</div>`;
  }

  function bindUI() {
    window.DeskUI = {
      h, fmtUsd, fmtPct, topbar, pillPaperOrLive, tokenAvatar, laneChip, laneOf,
      chgClass, pnlStack, svg, openMarketBtn, botMeta, emptyView, skeleton, errorView,
      ageLabel, assetLinkOf, coinHrefOf, backForCoin
    };
  }

  function renderCoin() {
    bindUI();
    if (window.DeskCoin && DeskCoin.render) return DeskCoin.render(state);
    if (state.loading && !state.coin) return `${topbar({ title: "Coin", back: "#/home" })}${skeleton()}`;
    if (state.error) return errorView(state.error, "#/home");
    const c = state.coin;
    if (!c) return errorView("Coinet hittades inte.", "#/home");
    const mint = c.mint;
    const pos = c.position;
    if (c.empty && !pos) {
      return `${topbar({ title: c.symbol || "Coin", back: "#/home", backLabel: "Hem", right: pillPaperOrLive(state.desk && state.desk.mode) })}
      <div class="screen"><div class="page">
        ${emptyView("Ingen data än", "Det finns ingen detalj för den här coinen i senaste uppdateringen.")}
        ${openMarketBtn(c)}
      </div></div>`;
    }
    return `${topbar({ title: c.symbol || "Coin", back: "#/home", backLabel: "Hem", right: pillPaperOrLive(state.desk && state.desk.mode) })}
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
        <div class="card-h">Din position</div>
        <div class="row"><div class="row-body"><div class="row-title">Värde</div></div><div class="row-meta nums">${h(fmtUsd(pos.value_usd || pos.size_usd, { exact: true }))}</div></div>
        <div class="row"><div class="row-body"><div class="row-title">Resultat</div></div><div class="row-meta">${pnlStack(pos.pnl_pct, pos.pnl_usd)}</div></div>
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

      ${openMarketBtn(c)}
      ${!c.empty && (c.layers || mint) ? `<a class="row card" style="margin-top:4px" href="#/audit/${encodeURIComponent(mint)}" data-nav="#/audit/${encodeURIComponent(mint)}">
        <div class="row-body"><div class="row-title">Visa säkerhetskoll</div><div class="row-sub">Rapport med 8 kontroller</div></div>
        ${svg("chev")}
      </a>` : ""}
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
    if (a.empty || !(a.layers || []).length) {
      return `${topbar({ title: "Säkerhetskoll", back: a.mint ? "#/coin/" + encodeURIComponent(a.mint) : "#/home", backLabel: a.symbol || "Tillbaka" })}
      <div class="screen"><div class="page">
        ${emptyView("Ingen data än", "Säkerhetskollen för den här coinen finns inte i senaste uppdateringen.")}
        ${openMarketBtn(a)}
      </div></div>`;
    }
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
      ${openMarketBtn(a)}
    </div></div>`;
  }

  function renderRegler() {
    const d = state.desk || {};
    const risk = d.risk || {};
    const lev = d.leverage || {};
    const grad = d.graduation || {};
    const lanes = d.lanes || {};
    const dailyLim = (risk.daily && risk.daily.limit_pct) || 5;
    const weekLim = (risk.weekly && risk.weekly.limit_pct) || 10;
    const ddLim = (risk.drawdown && risk.drawdown.limit_pct) || 20;
    const tradePct = risk.effective_risk_per_trade_pct || risk.risk_per_trade_pct_cap || 3;
    const hs = (state.lanes && state.lanes.health && state.lanes.health.split) || {};
    const split = {
      memecoin: hs.memecoin != null ? hs.memecoin : ((lanes.memecoins && lanes.memecoins.pct != null) ? lanes.memecoins.pct : 50),
      majors: hs.majors != null ? hs.majors : ((lanes.majors && lanes.majors.pct != null) ? lanes.majors.pct : 40),
      reserve: hs.reserve != null ? hs.reserve : 10
    };
    const mode = d.mode || "PAPER";
    const levLocked = lev.locked !== false && !lev.unlocked;
    const levCap = lev.allowed_leverage || (levLocked ? 1 : 3);
    const critLabel = {
      running_days: "Minst 90 dagar i gång",
      net_pnl: "Plusresultat totalt",
      max_drawdown: "Största backgång högst 20 %",
      win_rate: "Minst 50 % vinnande affärer, minst 30 affärer",
      no_guard_breaches: "Inga regelbrott senaste 30 dagarna",
      trades: "Minst 30 affärer"
    };
    const gradLabel = {
      running_days: "Minst 60 dagar i PAPER",
      net_pnl: "Plusresultat i spåret",
      max_drawdown: "Största backgång högst 20 %",
      win_rate: "Minst 50 % vinnande affärer, minst 20 affärer",
      no_guard_breaches: "Inga regelbrott senaste 30 dagarna"
    };
    const checks = (list, labels) => (list || []).map((c) => {
      const lab = labels[c.id] || c.label || c.id;
      return `<div class="rule-check ${c.met ? "ok" : ""}"><span class="mark">${c.met ? "✓" : "○"}</span><span>${h(lab)}</span></div>`;
    }).join("");
    const laneNames = { memecoin: "Memecoins", meme_test: "Meme-test", majors: "Större coins", gold: "Guld", commodities: "Råvaror", stocks: "Aktier" };
    const gradLanes = (grad.lanes || []).map((ln) => {
      const name = laneNames[ln.id] || ln.id;
      const pct = ln.progress_pct != null ? Math.round(ln.progress_pct) : null;
      return `<div class="rule-item">
        <div class="row-title">${h(name)}${ln.eligible ? " · klart för LIVE" : ""}</div>
        ${pct != null ? `<div class="row-sub">${h(pct)} % av bevisen i PAPER</div>` : ""}
        ${checks(ln.criteria, gradLabel)}
      </div>`;
    }).join("");
    const paused = d.entries_paused;
    return `${topbar({ title: "Regler & Risk", back: "#/account", backLabel: "Mer", right: pillPaperOrLive(mode) })}
    <div class="screen"><div class="page">
      <p class="rules-lead">Här är reglerna botarna följer just nu. De skyddar kontot. Inget ändras förrän du godkänner det i appen — aldrig i Telegram.</p>

      ${riskMeter(d.risk)}
      ${window.DeskFun ? DeskFun.laneGauge(state.lanes) : ""}

      ${paused ? `<div class="card"><div class="card-h">Köppaus</div><div class="rule-item"><div class="row-title">Nya köp är pausade</div><div class="row-sub">${h(d.entries_paused_reason || "Kontot är pausat just nu.")}</div></div></div>` : ""}

      <div class="card">
        <div class="card-h">Riskgränser</div>
        <div class="rule-item"><div class="row-title">Högst ${h(tradePct)} % per affär</div><div class="row-sub">Botarna får inte riskera mer än så av värdet i en enda trade.</div></div>
        <div class="rule-item"><div class="row-title">Dagen −${h(dailyLim)} %: stopp för nya köp</div><div class="row-sub">Om dagen går så mycket back stoppas nya köp resten av dagen.</div></div>
        <div class="rule-item"><div class="row-title">Veckan −${h(weekLim)} %: halv storlek</div><div class="row-sub">Om veckan går så mycket back handlar botarna med halv storlek.</div></div>
        <div class="rule-item"><div class="row-title">−${h(ddLim)} % från toppen: paus</div><div class="row-sub">Om värdet faller så mycket från toppen pausas nya köp.</div></div>
      </div>

      <div class="card">
        <div class="card-h">Fördelning</div>
        <div class="rule-item"><div class="row-title">Högst 50 % i ett spår eller en coin</div><div class="row-sub">Ingen marknad får ta mer än hälften av kontot.</div></div>
        <div class="rule-item"><div class="row-title">Minst 10 % i reserv</div><div class="row-sub">En tiondel ska alltid ligga undan.</div></div>
        <div class="rule-item"><div class="row-title">Högst 15 procentenheter per flytt, en gång per dygn</div><div class="row-sub">Botarna får inte flytta mer än så, och inte oftare än en gång på 24 timmar.</div></div>
        <div class="rule-item"><div class="row-title">Fördelning nu</div><div class="row-sub">${h(split.memecoin)} % memecoins · ${h(split.majors)} % större coins · ${h(split.reserve)} % reserv.</div></div>
      </div>

      ${window.DeskFun ? DeskFun.laneHistory(state.lanes) : ""}

      <div class="card">
        <div class="card-h">Hävstång</div>
        <div class="rule-item">
          <div class="row-title">${levLocked ? "Låst på 1×" : "Olåst, högst " + h(levCap) + "×"}</div>
          <div class="row-sub">Hävstången är låst tills alla villkor är uppfyllda. Max är 3× när den är olåst. Botarna kan inte höja taket.</div>
        </div>
        ${checks(lev.criteria, critLabel) || `<div class="rule-check"><span class="mark">○</span><span>Minst 90 dagar i gång</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Plusresultat totalt</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Största backgång högst 20 %</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Minst 30 affärer, minst 50 % vinnande</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Inga regelbrott senaste 30 dagarna</span></div>`}
      </div>

      <div class="card">
        <div class="card-h">Krav för LIVE</div>
        <div class="rule-item">
          <div class="row-title">Allt körs i PAPER tills du skriver LIVE</div>
          <div class="row-sub">Ett spår blir aktuellt för LIVE först efter bevis i PAPER. Du måste själv skriva LIVE — botarna kan inte slå på det.</div>
        </div>
        ${gradLanes || `<div class="rule-check"><span class="mark">○</span><span>Minst 60 dagar i PAPER</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Plusresultat i spåret</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Största backgång högst 20 %</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Minst 20 affärer, minst 50 % vinnande</span></div>
        <div class="rule-check"><span class="mark">○</span><span>Inga regelbrott senaste 30 dagarna</span></div>`}
      </div>
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
    const src = DeskAPI.screenUrl && DeskAPI.screenUrl();
    if (!src) { state.lightbox = false; return ""; }
    return `<div class="lightbox"><button class="close" data-action="close-lightbox">Stäng</button>
      <img src="${h(src)}" alt="">
    </div>`;
  }

  function tabFor(route) {
    if (route.name === "chat") return "";
    if (route.name === "markets") return "markets";
    if (route.name === "watch") return "watch";
    if (route.name === "activity" || route.name === "live") return "live";
    if (route.name === "account" || route.name === "bots" || route.name === "bot" || route.name === "regler" || route.name === "awards" || route.name === "affarer" || route.name === "ranking" || route.name === "kalender" || route.name === "livekrav") return "account";
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

  const PTR_THRESHOLD = 70;
  const PTR_CAP = 110;
  const PTR_HOLD = 60;
  const PTR_RESIST = 0.5;
  const $ptr = document.createElement("div");
  $ptr.className = "ptr";
  $ptr.setAttribute("aria-live", "polite");
  $ptr.innerHTML = '<div class="ptr-spin" aria-hidden="true"></div><div class="ptr-text"></div>';
  const $ptrSpin = $ptr.querySelector(".ptr-spin");
  const $ptrText = $ptr.querySelector(".ptr-text");
  const ptr = { startY: 0, startX: 0, pulling: false, armed: false, dy: 0, offset: 0, busy: false, hideTimer: 0, moveBound: false };

  function ensurePtr() {
    if ($app && $ptr.parentNode !== $app) $app.appendChild($ptr);
  }
  function atScrollTop() {
    if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) return false;
    const s = scroller();
    if (s && s.scrollTop > 0) return false;
    const feed = document.getElementById("chat-feed");
    if (feed && feed.scrollTop > 0) return false;
    return true;
  }
  function ptrSheetNodes() {
    if (!$app) return [];
    return Array.prototype.slice.call($app.querySelectorAll(":scope > .topbar, :scope > .screen"));
  }
  function ptrOffset(pull) {
    return Math.min(PTR_CAP, Math.max(0, pull) * PTR_RESIST);
  }
  function ptrSetSheet(y, animate) {
    const px = Math.max(0, y);
    ptr.offset = px;
    const trans = animate ? "transform 250ms ease-out" : "none";
    ptrSheetNodes().forEach((n) => {
      n.style.willChange = "transform";
      n.style.transition = trans;
      n.style.transform = "translate3d(0," + px + "px,0)";
    });
  }
  function ptrClearSheet() {
    ptrSheetNodes().forEach((n) => {
      n.style.willChange = "";
      n.style.transition = "";
      n.style.transform = "";
    });
    ptr.offset = 0;
  }
  function ptrWaitSettle() {
    return new Promise((resolve) => {
      const n = ptrSheetNodes()[0];
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      if (n) n.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 320);
    });
  }
  function ptrShowHint(text, mode) {
    ensurePtr();
    $ptr.classList.add("show");
    $ptr.classList.toggle("error", mode === "error");
    $ptr.classList.toggle("spinning", mode === "loading");
    $ptrText.textContent = text || "";
    if (mode === "loading" || mode === "error") $ptrSpin.style.transform = "";
  }
  function ptrHideHint() {
    if (ptr.hideTimer) { clearTimeout(ptr.hideTimer); ptr.hideTimer = 0; }
    $ptr.classList.remove("show", "error", "spinning");
    $ptrSpin.style.transform = "";
    $ptrText.textContent = "";
  }
  function ptrBindMove() {
    if (ptr.moveBound) return;
    document.addEventListener("touchmove", ptrOnMove, { passive: false });
    ptr.moveBound = true;
  }
  function ptrUnbindMove() {
    if (!ptr.moveBound) return;
    document.removeEventListener("touchmove", ptrOnMove);
    ptr.moveBound = false;
  }
  function ptrOnStart(e) {
    if (ptr.busy) return;
    if (!(DeskAPI.isUnlocked && DeskAPI.isUnlocked())) return;
    if (!e.touches || e.touches.length !== 1) return;
    if (!atScrollTop()) { ptr.armed = false; ptrUnbindMove(); return; }
    ptr.armed = true;
    ptr.pulling = false;
    ptr.startY = e.touches[0].clientY;
    ptr.startX = e.touches[0].clientX;
    ptr.dy = 0;
    ptrBindMove();
  }
  function ptrOnMove(e) {
    if (!ptr.armed || ptr.busy) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const dy = t.clientY - ptr.startY;
    const dx = t.clientX - ptr.startX;
    if (!ptr.pulling) {
      if (dy < 8) return;
      if (Math.abs(dx) > dy) { ptr.armed = false; ptrUnbindMove(); return; }
      if (!atScrollTop()) { ptr.armed = false; ptrUnbindMove(); return; }
      ptr.pulling = true;
    }
    if (ptr.pulling && dy > 0) {
      e.preventDefault();
      ptr.dy = dy;
      const offset = ptrOffset(dy);
      ptrSetSheet(offset, false);
      ensurePtr();
      $ptr.classList.add("show");
      $ptr.classList.remove("error", "spinning");
      $ptrSpin.style.transform = "rotate(" + ((offset / PTR_CAP) * 360) + "deg)";
      $ptrText.textContent = offset >= PTR_THRESHOLD ? "Släpp för att uppdatera" : "";
    } else if (ptr.pulling && dy <= 0) {
      ptr.dy = 0;
      ptrSetSheet(0, false);
      $ptrText.textContent = "";
    }
  }
  function ptrOnEnd() {
    ptrUnbindMove();
    if (!ptr.pulling) {
      ptr.armed = false;
      ptr.dy = 0;
      return;
    }
    const goPull = ptrOffset(ptr.dy) >= PTR_THRESHOLD;
    ptr.pulling = false;
    ptr.armed = false;
    ptr.dy = 0;
    if (goPull) pullRefresh();
    else ptrSnapBack();
  }
  async function ptrSnapBack() {
    ptrSetSheet(0, true);
    await ptrWaitSettle();
    ptrClearSheet();
    ptrHideHint();
  }
  async function pullRefresh() {
    if (ptr.busy) return;
    if (!(DeskAPI.isUnlocked && DeskAPI.isUnlocked())) return;
    ptr.busy = true;
    ptrSetSheet(PTR_HOLD, true);
    ptrShowHint("Uppdaterar...", "loading");
    try {
      if (typeof DeskAPI.refreshSnap === "function") await DeskAPI.refreshSnap();
      else if (typeof DeskAPI.loadSnap === "function") await DeskAPI.loadSnap();
      const [desk, live, act, ch, moods, reqs, uni] = await Promise.all([
        DeskAPI.getState().catch(() => null),
        DeskAPI.getLive ? DeskAPI.getLive().catch(() => null) : null,
        DeskAPI.getActivity({ kind: state.activityFilter }).catch(() => null),
        DeskAPI.getChatter ? DeskAPI.getChatter().catch(() => null) : null,
        DeskAPI.getMoods ? DeskAPI.getMoods().catch(() => null) : null,
        DeskAPI.getRequests ? DeskAPI.getRequests().catch(() => null) : null,
        DeskAPI.getUniverse ? DeskAPI.getUniverse().catch(() => null) : null
      ]);
      if (desk) state.desk = desk;
      if (live) state.live = live;
      if (act) state.activity = act;
      if (ch) state.chatter = ch;
      if (moods) state.moods = moods;
      if (reqs) state.requests = reqs;
      if (uni) state.universe = uni;
      await loadFun();
      render({ keepScroll: true });
      ptrSetSheet(PTR_HOLD, false);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await ptrSnapBack();
    } catch (e) {
      const code = e && (e.code || e.name);
      if (code === "decrypt_failed" || code === "bad_passcode" || code === "OperationError") {
        ptrClearSheet();
        ptrHideHint();
        state.lockError = "Något gick fel när appen skulle öppnas. Logga in igen och försök på nytt.";
        render({ keepScroll: false });
        return;
      }
      ptrShowHint("Kunde inte uppdatera", "error");
      await new Promise((r) => { ptr.hideTimer = setTimeout(r, 1600); });
      await ptrSnapBack();
    } finally {
      ptr.busy = false;
    }
  }

  function render(opts) {
    bindUI();
    const keep = !(opts && opts.keepScroll === false);
    const snap = keep ? captureScroll() : null;
    const route = state.route;
    const needsAuth = !(DeskAPI.isUnlocked && DeskAPI.isUnlocked());
    let body;
    if (needsAuth) body = renderLock();
    else if (route.name === "markets") body = renderMarkets();
    else if (route.name === "watch") body = renderWatch();
    else if (route.name === "awards") body = renderAwards();
    else if (route.name === "coin") body = renderCoin();
    else if (route.name === "audit") body = renderAudit();
    else if (route.name === "chat") body = renderChat();
    else if (route.name === "bots") body = renderBots();
    else if (route.name === "bot") body = renderBot();
    else if (route.name === "activity" || route.name === "live") body = renderLive();
    else if (route.name === "regler") body = renderRegler();
    else if (route.name === "affarer") { bindUI(); body = window.DeskPages ? DeskPages.renderTrades(state) : renderAccount(); }
    else if (route.name === "ranking") { bindUI(); body = window.DeskPages ? DeskPages.renderRanking(state) : renderAccount(); }
    else if (route.name === "kalender") { bindUI(); body = window.DeskPages ? DeskPages.renderCalendar(state) : renderAccount(); }
    else if (route.name === "livekrav") { bindUI(); body = window.DeskPages ? DeskPages.renderLiveKrav(state) : renderAccount(); }
    else if (route.name === "account") body = renderAccount();
    else body = renderHome();

    if (document.activeElement && document.activeElement !== document.body && typeof document.activeElement.blur === "function") {
      try { document.activeElement.blur(); } catch (_) {}
    }
    $app.className = "";
    if (body && body.indexOf('<div class="page">') >= 0) {
      body = body.replace('<div class="page">', '<div class="page">' + freshnessBlock());
    }
    $app.innerHTML = `${body}${needsAuth ? "" : tabbar(tabFor(route))}${lightbox()}<div class="toast ${state.toast ? "show" : ""}" id="toast">${h(state.toast)}</div>`;
    ensurePtr();
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
    if (feed && state.route.name === "live") feed.scrollTop = feed.scrollHeight;
    if (state.route.name === "coin" && window.DeskCoin && DeskCoin.mount) DeskCoin.mount(state);
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

  async function pollSnapshot() {
    if (document.hidden || !(DeskAPI.isUnlocked && DeskAPI.isUnlocked())) return;
    try {
      const [desk, live, act, moods, reqs] = await Promise.all([
        DeskAPI.getState().catch(() => null),
        DeskAPI.getLive ? DeskAPI.getLive().catch(() => null) : null,
        DeskAPI.getActivity({ kind: state.activityFilter }).catch(() => null),
        DeskAPI.getMoods ? DeskAPI.getMoods().catch(() => null) : null,
        DeskAPI.getRequests ? DeskAPI.getRequests().catch(() => null) : null
      ]);
      if (desk) state.desk = desk;
      if (live) state.live = live;
      if (act) state.activity = act;
      if (moods) state.moods = moods;
      if (reqs) state.requests = reqs;
      await loadFun();
      if (["home", "markets", "watch", "bots", "account", "chat", "regler", "awards", "activity", "live"].includes(state.route.name)) {
        render({ keepScroll: true });
      }
    } catch (_) {}
  }
  setInterval(pollSnapshot, 60000);

  async function loadRoute() {
    const r = state.route;
    state.error = null;
    if (!(DeskAPI.isUnlocked && DeskAPI.isUnlocked())) {
      state.loading = false;
      render({ keepScroll: false });
      return;
    }
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
        const [c] = await Promise.all([
          DeskAPI.getChart(state.chartRange)
        ]);
        state.chart = c;
        if (c && c.range && c.range !== state.chartRange) state.chartRange = c.range;
        state.loading = false;
        render({ keepScroll: false });
        return;
      }
      if (r.name === "markets") {
        state.loading = true;
        render();
        const [moods, mv, uni] = await Promise.all([
          DeskAPI.getMoods ? DeskAPI.getMoods().catch(() => null) : null,
          DeskAPI.getMovers ? DeskAPI.getMovers(state.chartRange).catch(() => null) : null,
          DeskAPI.getUniverse ? DeskAPI.getUniverse().catch(() => null) : null
        ]);
        if (moods) state.moods = moods;
        if (mv) state.movers = mv;
        if (uni) state.universe = uni;
        state.loading = false;
        render({ keepScroll: false });
        return;
      }
      if (r.name === "watch") {
        state.loading = true;
        render();
        const reqs = DeskAPI.getRequests ? await DeskAPI.getRequests().catch(() => null) : null;
        if (reqs) state.requests = reqs;
        state.loading = false;
        render({ keepScroll: false });
        refreshWatchQuotes(false);
        return;
      }
      if (r.name === "activity" || r.name === "live") {
        state.loading = true;
        render();
        const [act, live, ch] = await Promise.all([
          DeskAPI.getActivity({ kind: state.activityFilter }).catch(() => null),
          DeskAPI.getLive ? DeskAPI.getLive().catch(() => null) : null,
          DeskAPI.getChatter ? DeskAPI.getChatter().catch(() => null) : null
        ]);
        if (act) state.activity = act;
        if (live) state.live = live;
        if (ch) state.chatter = ch;
        state.loading = false;
        render({ keepScroll: false });
        return;
      }
      if (r.name === "coin") {
        state.loading = true;
        state.coin = null;
        state.coinChart = null;
        state.coinStats = null;
        state.coinScrub = null;
        render();
        state.coin = await DeskAPI.getCoin(r.mint);
        state.loading = false;
        render();
        if (window.DeskCoin && DeskCoin.loadChart) {
          await DeskCoin.loadChart(state);
          if (state.route.name === "coin") render({ keepScroll: true });
        }
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
      if (isUnlockError(err)) {
        if (DeskAPI.logout) DeskAPI.logout();
        state.desk = null;
        state.fun = null;
        state.chart = null;
        state.movers = null;
        state.live = null;
        state.activity = null;
        state.moods = null;
        state.requests = null;
        state.error = null;
        state.lockError = null;
        render({ keepScroll: false });
        return;
      }
      state.error = swedishLoadError(err);
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
    }, 1800);
  }

  function parseAlertVal(v) {
    const s = String(v == null ? "" : v).trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    if (!isFinite(n) || n <= 0) return NaN;
    return n;
  }

  async function refreshWatchQuotes(force) {
    const list = mergedWatchItems();
    if (!list.length || !DeskAPI.fetchPublicQuotes) return;
    if (state.quotesLoading && !force) return;
    state.quotesLoading = true;
    if (force && state.route.name === "watch") render({ keepScroll: true });
    try {
      if (force && DeskAPI.canWriteRemote && DeskAPI.canWriteRemote() && DeskAPI.refreshRequests) {
        try {
          const srv = await DeskAPI.refreshRequests();
          if (srv && srv.items) state.requests = Object.assign({}, state.requests || {}, { items: srv.items });
        } catch (_) {}
      }
      const quotes = await DeskAPI.fetchPublicQuotes(list);
      const nowIso = new Date().toISOString();
      Object.keys(quotes || {}).forEach((k) => {
        if (quotes[k]) state.liveQuotes[k] = Object.assign({ ts: nowIso }, quotes[k]);
      });
      // Update local items' cached price & check local visual alerts
      const locs = readLocalRequests();
      let changed = false;
      const updatedLocs = locs.map((it) => {
        const q = quoteForWatchItem(it);
        if (!q || q.price == null) return it;
        changed = true;
        const copy = Object.assign({}, it, { price: q.price, change_24h: q.change_24h, quote_ts: nowIso });
        if (!copy.alert_triggered_at) {
          if (copy.alert_above != null && q.price >= Number(copy.alert_above)) {
            copy.alert_triggered_at = nowIso;
            toast(`🔔 ${copy.symbol} nådde över $${copy.alert_above}!`);
          } else if (copy.alert_below != null && q.price <= Number(copy.alert_below)) {
            copy.alert_triggered_at = nowIso;
            toast(`🔔 ${copy.symbol} nådde under $${copy.alert_below}!`);
          }
        }
        return copy;
      });
      if (changed) writeLocalRequests(updatedLocs);
    } catch (_) {
    } finally {
      state.quotesLoading = false;
      if (state.route.name === "watch") render({ keepScroll: true });
    }
  }

  async function submitWatchRequest(symbol, assetType, note, alertAboveRaw, alertBelowRaw) {
    const clean = String(symbol || "").trim().replace(/^\$/, "");
    if (!clean) {
      state.reqError = "Skriv en symbol eller mint-adress först.";
      render({ keepScroll: true });
      return;
    }
    const above = parseAlertVal(alertAboveRaw);
    const below = parseAlertVal(alertBelowRaw);
    if (Number.isNaN(above) || Number.isNaN(below)) {
      state.reqError = "Ogiltigt larmpris — ange ett positivt tal i USD.";
      render({ keepScroll: true });
      return;
    }
    state.reqBusy = true;
    state.reqError = "";
    render({ keepScroll: true });
    try {
      const canWrite = !!(DeskAPI.canWriteRemote && DeskAPI.canWriteRemote());
      if (!canWrite) {
        const cmd = buildBevakaCmd(clean, above, below);
        const list = readLocalRequests();
        const item = {
          id: "loc-" + Date.now(),
          symbol: clean.length >= 32 ? clean.slice(0, 6).toUpperCase() : clean.toUpperCase(),
          mint: clean.length >= 32 ? clean : null,
          asset_type: assetType || "auto",
          note: String(note || "").trim(),
          alert_above: above,
          alert_below: below,
          alert_triggered_at: null,
          status: "pending",
          bot_reply: "Skicka i Telegram — synkas till botarna inom 1 min.",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        writeLocalRequests([item].concat(list.filter((x) => x.symbol !== item.symbol)));
        state.reqFormSym = "";
        state.reqFormNote = "";
        state.reqFormAbove = "";
        state.reqFormBelow = "";
        openTelegramCmd(cmd);
        toast(`Öppnar Telegram för ${item.symbol}…`);
      } else {
        const res = await DeskAPI.submitRequest({
          symbol: clean,
          asset_type: assetType || "auto",
          note: note || "",
          alert_above: above,
          alert_below: below
        });
        if (res && res.ok && res.item) {
          const cur = (state.requests && state.requests.items) || [];
          state.requests = Object.assign({}, state.requests || {}, {
            items: [res.item].concat(cur.filter((x) => x.id !== res.item.id))
          });
          state.reqFormSym = "";
          state.reqFormNote = "";
          state.reqFormAbove = "";
          state.reqFormBelow = "";
          toast(`${res.item.symbol} tillagd i bevakningen`);
        }
      }
      refreshWatchQuotes(true);
    } catch (e) {
      state.reqError = (e && e.message) ? String(e.message) : "Kunde inte skicka förfrågan.";
    } finally {
      state.reqBusy = false;
      render({ keepScroll: true });
    }
  }

  $app.addEventListener("submit", (e) => {
    const reqForm = e.target.closest("[data-req-form]");
    if (reqForm) {
      e.preventDefault();
      const symEl = reqForm.querySelector("[name=symbol]");
      const noteEl = reqForm.querySelector("[name=note]");
      const aboveEl = reqForm.querySelector("[name=alert_above]");
      const belowEl = reqForm.querySelector("[name=alert_below]");
      state.reqFormSym = symEl ? symEl.value : "";
      state.reqFormNote = noteEl ? noteEl.value : "";
      state.reqFormAbove = aboveEl ? aboveEl.value : "";
      state.reqFormBelow = belowEl ? belowEl.value : "";
      submitWatchRequest(state.reqFormSym, state.reqFormType, state.reqFormNote, state.reqFormAbove, state.reqFormBelow);
      return;
    }
    const editAlertForm = e.target.closest("[data-edit-alert-form]");
    if (editAlertForm) {
      e.preventDefault();
      const id = editAlertForm.getAttribute("data-edit-alert-form");
      const origin = editAlertForm.getAttribute("data-req-origin");
      const above = parseAlertVal((editAlertForm.querySelector("[name=alert_above]") || {}).value);
      const below = parseAlertVal((editAlertForm.querySelector("[name=alert_below]") || {}).value);
      if (Number.isNaN(above) || Number.isNaN(below)) {
        toast("Ogiltigt larmpris");
        return;
      }
      const canWrite = !!(DeskAPI.canWriteRemote && DeskAPI.canWriteRemote());
      if (origin === "local" || !canWrite) {
        const targetItem = mergedWatchItems().find((x) => String(x.id) === String(id));
        const symOrMint = (targetItem && (targetItem.mint || targetItem.symbol)) || "";
        const list = readLocalRequests();
        const exists = list.some((x) => String(x.id) === String(id) || (symOrMint && String(x.symbol || "").toUpperCase() === symOrMint.toUpperCase()));
        let upd;
        if (exists) {
          upd = list.map((x) => (String(x.id) === String(id) || (symOrMint && String(x.symbol || "").toUpperCase() === symOrMint.toUpperCase()))
            ? Object.assign({}, x, { alert_above: above, alert_below: below, alert_triggered_at: null, status: "pending", updated_at: new Date().toISOString() })
            : x);
        } else if (targetItem) {
          upd = [Object.assign({}, targetItem, { origin: "local", alert_above: above, alert_below: below, alert_triggered_at: null, status: "pending", updated_at: new Date().toISOString() })].concat(list);
        } else {
          upd = list;
        }
        writeLocalRequests(upd);
        state.reqEditId = null;
        if (symOrMint) openTelegramCmd(buildBevakaCmd(symOrMint, above, below));
        toast("Öppnar Telegram för prislarm…");
        render({ keepScroll: true });
      } else {
        DeskAPI.updateRequest(id, { alert_above: above, alert_below: below }).then((res) => {
          if (res && res.item && state.requests && state.requests.items) {
            state.requests.items = state.requests.items.map((x) => String(x.id) === String(id) ? res.item : x);
          }
          state.reqEditId = null;
          toast("Prislarm sparat");
          render({ keepScroll: true });
        }).catch(() => toast("Kunde inte spara prislarm"));
      }
      return;
    }
    const form = e.target.closest("[data-pass-form]");
    if (!form) return;
    e.preventDefault();
    const rem = passLockRemainingSec();
    if (rem > 0) {
      state.lockError = `För många fel försök. Vänta ${rem} sek och försök igen.`;
      render({ keepScroll: false });
      return;
    }
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
      clearPassLock();
      if (input) input.value = "";
      state.error = null;
      state.loading = true;
      state.lockError = null;
      render({ keepScroll: false });
      loadRoute();
    }).catch((err) => {
      if (err && err.code === "bad_passcode") {
        const res = recordPassFail();
        state.lockError = res.waitSec > 0
          ? `För många fel försök. Vänta ${res.waitSec} sek och försök igen.`
          : "Fel kod. Försök igen.";
      } else {
        state.lockError = "Kunde inte öppna just nu. Försök igen om en stund.";
      }
      render({ keepScroll: false });
    });
  });

  $app.addEventListener("input", (e) => {
    const reqForm = e.target.closest("[data-req-form]");
    if (!reqForm) return;
    if (e.target.name === "symbol") state.reqFormSym = e.target.value;
    if (e.target.name === "note") state.reqFormNote = e.target.value;
    if (e.target.name === "alert_above") state.reqFormAbove = e.target.value;
    if (e.target.name === "alert_below") state.reqFormBelow = e.target.value;
  });

  $app.addEventListener("click", (e) => {
    const logout = e.target.closest("[data-action=logout]");
    if (logout) {
      e.preventDefault();
      DeskAPI.logout();
      state.desk = null; state.fun = null; state.chart = null; state.movers = null;
      state.moods = null; state.requests = null; state.universe = null;
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
    const moodBtn = e.target.closest("[data-mood-lane]");
    if (moodBtn) {
      e.preventDefault();
      if (moodBtn.blur) moodBtn.blur();
      const ln = moodBtn.getAttribute("data-mood-lane") || "memecoin";
      state.moodLane = ln;
      saveMoodLane(ln);
      const card = document.getElementById("mood-lanes-card");
      if (card && window.DeskFun && DeskFun.moodLanes) card.outerHTML = DeskFun.moodLanes(state.moods, ln);
      else render({ keepScroll: true });
      return;
    }
    const coinTf = e.target.closest("[data-coin-tf]");
    if (coinTf) {
      e.preventDefault();
      const id = coinTf.getAttribute("data-coin-tf") || "1D";
      if (id === state.coinTf) return;
      state.coinTf = id;
      state.coinScrub = null;
      render({ keepScroll: true });
      if (window.DeskCoin && DeskCoin.loadChart) {
        DeskCoin.loadChart(state).then(() => {
          if (state.route.name === "coin") render({ keepScroll: true });
        });
      }
      return;
    }
    const tradeLane = e.target.closest("[data-trade-lane]");
    if (tradeLane) {
      e.preventDefault();
      state.tradeLane = tradeLane.getAttribute("data-trade-lane") || "all";
      render({ keepScroll: true });
      return;
    }
    const tradeBot = e.target.closest("[data-trade-bot]");
    if (tradeBot) {
      e.preventDefault();
      state.tradeBot = tradeBot.getAttribute("data-trade-bot") || "all";
      render({ keepScroll: true });
      return;
    }
    const calMonth = e.target.closest("[data-cal-month]");
    if (calMonth) {
      e.preventDefault();
      state.calMonth = calMonth.getAttribute("data-cal-month");
      state.calDay = null;
      render({ keepScroll: true });
      return;
    }
    const calDay = e.target.closest("[data-cal-day]");
    if (calDay) {
      e.preventDefault();
      state.calDay = calDay.getAttribute("data-cal-day");
      render({ keepScroll: true });
      return;
    }
    const mktFilter = e.target.closest("[data-mkt-filter]");
    if (mktFilter) {
      e.preventDefault();
      state.mktFilter = mktFilter.getAttribute("data-mkt-filter") || "all";
      render({ keepScroll: true });
      return;
    }
    const quickWatch = e.target.closest("[data-quick-watch]");
    if (quickWatch) {
      e.preventDefault();
      const sym = quickWatch.getAttribute("data-quick-mint") || quickWatch.getAttribute("data-quick-watch") || "";
      const tp = quickWatch.getAttribute("data-quick-type") || "auto";
      state.reqFormSym = quickWatch.getAttribute("data-quick-watch") || sym;
      state.reqFormType = tp;
      submitWatchRequest(sym, tp, "");
      return;
    }
    const fill = e.target.closest("[data-fill-sym]");
    if (fill) {
      e.preventDefault();
      state.reqFormSym = fill.getAttribute("data-fill-sym") || "";
      state.reqFormType = fill.getAttribute("data-fill-type") || "auto";
      state.reqError = "";
      render({ keepScroll: true });
      return;
    }
    const reqType = e.target.closest("[data-req-type]");
    if (reqType) {
      e.preventDefault();
      state.reqFormType = reqType.getAttribute("data-req-type") || "auto";
      render({ keepScroll: true });
      return;
    }
    const refreshBtn = e.target.closest("[data-refresh-quotes]");
    if (refreshBtn) {
      e.preventDefault();
      refreshWatchQuotes(true);
      return;
    }
    const editToggle = e.target.closest("[data-toggle-alert-edit]");
    if (editToggle) {
      e.preventDefault();
      const id = editToggle.getAttribute("data-toggle-alert-edit") || "";
      state.reqEditId = (!id || String(state.reqEditId || "") === String(id)) ? null : id;
      render({ keepScroll: true });
      return;
    }
    const copyReq = e.target.closest("[data-copy-req]");
    if (copyReq) {
      e.preventDefault();
      const txt = copyReq.getAttribute("data-copy-req") || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => toast("Förfrågan kopierad")).catch(() => toast(txt));
      } else { toast(txt); }
      return;
    }
    const delReq = e.target.closest("[data-del-req]");
    if (delReq) {
      e.preventDefault();
      const id = delReq.getAttribute("data-del-req");
      const origin = delReq.getAttribute("data-req-origin");
      const sym = delReq.getAttribute("data-req-sym") || "";
      const canWrite = !!(DeskAPI.canWriteRemote && DeskAPI.canWriteRemote());
      if (origin === "local") {
        writeLocalRequests(readLocalRequests().filter((x) => String(x.id) !== String(id)));
        toast("Borttagen");
        render({ keepScroll: true });
      } else if (!canWrite) {
        const list = readLocalRequests().filter((x) => String(x.symbol || "").toUpperCase() !== sym.toUpperCase());
        list.push({ id: "rm-" + Date.now(), symbol: sym, pending_remove: true, created_at: new Date().toISOString() });
        writeLocalRequests(list);
        openTelegramCmd("/sluta " + sym);
        toast("Öppnar Telegram för att ta bort…");
        render({ keepScroll: true });
      } else {
        DeskAPI.deleteRequest(id).then(() => {
          const cur = (state.requests && state.requests.items) || [];
          state.requests = Object.assign({}, state.requests || {}, { items: cur.filter((x) => String(x.id) !== String(id)) });
          toast("Borttagen");
          render({ keepScroll: true });
        }).catch(() => toast("Kunde inte ta bort just nu"));
      }
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
    const botFilter = e.target.closest("[data-bot-filter]");
    if (botFilter) {
      e.preventDefault();
      if (botFilter.blur) botFilter.blur();
      state.liveBotFilter = botFilter.getAttribute("data-bot-filter") || "all";
      render({ keepScroll: true });
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
      }).catch((err) => { state.loading = false; state.error = swedishLoadError(err); render({ keepScroll: true }); });
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
    if (act === "login-again" || act === "retry") {
      e.preventDefault();
      if (DeskAPI.logout) DeskAPI.logout();
      state.desk = null; state.fun = null; state.chart = null; state.movers = null;
      state.live = null; state.activity = null; state.chatter = null;
      state.moods = null; state.requests = null; state.universe = null;
      state.error = null; state.lockError = null;
      render({ keepScroll: false });
      return;
    }
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

  document.addEventListener("touchstart", ptrOnStart, { passive: true });
  document.addEventListener("touchend", ptrOnEnd);
  document.addEventListener("touchcancel", ptrOnEnd);

  window.addEventListener("hashchange", () => {
    rememberCoinBack(state.route && state.route.name);
    state.route = parseRoute();
    state.error = null;
    render({ keepScroll: false });
    loadRoute();
  });

  window.addEventListener("resize", () => afterPaint());

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((reg) => { try { reg.update(); } catch (_) {} }).catch(() => {});
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  }

  DeskAPI.captureTokenFromUrl();
  state.route = parseRoute();
  const boot = () => {
    render();
    loadRoute();
    DeskAPI.openStream({
      state(s) { state.desk = Object.assign(state.desk || {}, s); render({ keepScroll: true }); },
      activity(a) { if (a) { state.activity = a; if (state.route.name === "activity" || state.route.name === "live") render({ keepScroll: true }); } },
      live(a) { if (a) { state.live = a; if (state.route.name === "live") render({ keepScroll: true }); } },
      chatter(a) { if (a) { state.chatter = a; if (state.route.name === "live") render({ keepScroll: true }); } },
      moods(m) { if (m) { state.moods = m; if (state.route.name === "markets") render({ keepScroll: true }); } },
      requests(rq) { if (rq) { state.requests = rq; if (state.route.name === "watch") render({ keepScroll: true }); } },
      tick() { /* snapshot poll refreshes every minute */ }
    });
  };
  if (DeskAPI.tryRememberedUnlock) {
    DeskAPI.tryRememberedUnlock().catch(() => false).then(boot);
  } else {
    boot();
  }
})();
