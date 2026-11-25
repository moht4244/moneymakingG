/* STEP 8 client.
 *
 * Auth (hosted): the user types their app code on the lock screen. The code is
 * used only to derive an AES key (PBKDF2-SHA256) and is never written to storage.
 * Optional 'remember this device' stores the derived key, not the code.
 * Local /api requests may still send a bearer token if one is present.
 *
 * Endpoints (shapes the UI reads; extra fields are ignored):
 *
 * GET /api/state
 *   { mode:"PAPER"|"LIVE", running, schedule, equity_usd, cash_usd,
 *     positions_value_usd, pnl_today_usd, pnl_today_pct, pnl_total_usd,
 *     pnl_total_pct, market:{ regime, btc:{price,change_24h_pct},
 *     sol:{...}, news }, bots:[{name,label,status,last,ts}],
 *     positions:[{mint,symbol,name,qty,entry_usd,mark_usd,pnl_usd,pnl_pct,
 *     size_usd,value_usd,opened_at}], watching:[], copy_picks:[],
 *     last_action:{text,ts}, wallet:{address,sol,usd,label},
 *     screen:{url,updated_at}, updated_at }
 *
 * GET /api/chart?range=today|7d|30d
 *   { range, points:[{ t, equity }] }
 *
 * GET /api/activity?limit=&before=
 *   { items:[{ id,ts,kind,mint,symbol,title,body,pnl_usd,bot }], next }
 *
 * GET /api/coin/{mint}
 *   { mint,symbol,name,price_usd,change_5m,change_1h,change_24h,
 *     mc_usd,liq_usd,volume_24h,holders,age_min,thesis,score,decision,
 *     chart:[{t,p}], position, links? }
 *
 * GET /api/audit/{mint}
 *   { mint,symbol,name,grade,notes, layers:[{id,name,pass,status,detail}] }
 *
 * GET /api/bots/{name}/decisions?limit=
 *   { name,status,description, decisions:[{id,ts,mint,symbol,action,reason,confidence}] }
 *
 * GET /api/screen.jpg   — live desk JPEG
 * GET /api/stream       — SSE: event state | activity | tick
 */
(function (global) {
  const TOKEN_KEY = "APP_TOKEN";
  const REMEMBER_KEY = "MMG_SNAP_KEY_V2";

  function setToken(value) {
    try {
      const v = String(value || "").trim();
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (_) {}
  }

  function clearToken() {
    setToken("");
  }

  function captureTokenFromUrl() {
    // #t= is no longer a login secret; strip a leftover fragment so it does not linger in the URL.
    const hash = location.hash || "";
    const m = hash.match(/^#t=([^&]+)/);
    if (m) {
      const rest = hash.slice(m[0].length).replace(/^&/, "");
      const next = rest.startsWith("/") ? "#" + rest : (rest ? "#" + rest : "#/home");
      history.replaceState(null, "", location.pathname + location.search + (next === "#" ? "#/home" : next));
    }
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
  }

  function apiUrl(path) {
    const rel = String(path || "").replace(/^\//, "");
    const dir = location.pathname.replace(/[^/]+$/, "") || "/";
    return dir + rel;
  }

  function headers() {
    const h = { Accept: "application/json" };
    const t = getToken();
    if (t) {
      h["Authorization"] = "Bearer " + t;
      h["X-App-Token"] = t;
    }
    return h;
  }

  const SNAP_RAW = "https://raw.githubusercontent.com/moht4244/moneymakingG/data/snap.enc";
  const SNAP_API = "https://api.github.com/repos/moht4244/moneymakingG/contents/snap.enc?ref=data";
  let snapCache = null;
  let snapKey = null;
  let unlocked = false;
  let snapTimer = 0;
  let snapInflight = null;

  function onHostedPages() {
    return /\.github\.io$/i.test(location.hostname);
  }

  function usesSnapshot() {
    return onHostedPages() || /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  }

  function isUnlocked() {
    return unlocked && !!snapKey;
  }

  function b64ToBytes(s) {
    const clean = String(s || "").replace(/\s+/g, "");
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToB64(buf) {
    const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    const step = 0x8000;
    for (let i = 0; i < arr.length; i += step) {
      s += String.fromCharCode.apply(null, arr.subarray(i, i + step));
    }
    return btoa(s);
  }

  async function fetchSnapEnv() {
    try {
      const r = await fetch(SNAP_RAW + "?t=" + Date.now(), { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (_) {}
    const r = await fetch(SNAP_API + "&t=" + Date.now(), { cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) {
      const err = new Error("HTTP " + r.status);
      err.status = r.status;
      throw err;
    }
    const j = await r.json();
    const text = atob(String(j.content || "").replace(/\n/g, ""));
    return JSON.parse(text);
  }

  async function snapDeriveKey(secret, saltB64, iter) {
    // iOS Safari is picky: prefer deriveBits + raw import over deriveKey, and SHA-256 as a Hash object.
    const enc = new TextEncoder();
    const salt = b64ToBytes(saltB64);
    const rounds = Math.max(1, Number(iter) || 800000);
    const params = { name: "PBKDF2", hash: { name: "SHA-256" }, salt, iterations: rounds };
    try {
      const base = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits(params, base, 256);
      return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, true, ["decrypt"]);
    } catch (_) {
      const base = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey(params, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
    }
  }

  async function decryptWithKey(env, key) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(env.iv) }, key, b64ToBytes(env.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  async function unlockWithPasscode(secret, remember) {
    const env = await fetchSnapEnv();
    const key = await snapDeriveKey(secret, env.salt, env.iter);
    try {
      snapCache = await decryptWithKey(env, key);
    } catch (_) {
      const err = new Error("bad_passcode");
      err.code = "bad_passcode";
      throw err;
    }
    snapKey = key;
    unlocked = true;
    try {
      if (remember) {
        const raw = await crypto.subtle.exportKey("raw", key);
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({
          v: 2, kdf: "PBKDF2", iter: env.iter, salt: env.salt, raw: bytesToB64(raw)
        }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (_) {}
    startSnapRefresh();
    return snapCache;
  }

  async function importStoredKey(stored) {
    if (stored && stored.raw) {
      return crypto.subtle.importKey("raw", b64ToBytes(stored.raw), { name: "AES-GCM" }, true, ["decrypt"]);
    }
    if (stored && stored.key) {
      // leftover JWK from an older build — try, then fall back to asking for the code
      return crypto.subtle.importKey("jwk", stored.key, { name: "AES-GCM" }, true, ["decrypt"]);
    }
    throw new Error("no stored key");
  }

  async function tryRememberedUnlock() {
    if (onHostedPages()) {
      try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
    }
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(REMEMBER_KEY) || ""); } catch (_) { stored = null; }
    if (!stored || (!stored.raw && !stored.key)) return false;
    try {
      const env = await fetchSnapEnv();
      if (stored.salt !== env.salt || Number(stored.iter) !== Number(env.iter)) {
        localStorage.removeItem(REMEMBER_KEY);
        return false;
      }
      const key = await importStoredKey(stored);
      snapCache = await decryptWithKey(env, key);
      snapKey = key;
      unlocked = true;
      startSnapRefresh();
      return true;
    } catch (_) {
      try { localStorage.removeItem(REMEMBER_KEY); } catch (__) {}
      unlocked = false;
      snapKey = null;
      snapCache = null;
      return false;
    }
  }

  function logout() {
    unlocked = false;
    snapKey = null;
    snapCache = null;
    try { localStorage.removeItem(REMEMBER_KEY); } catch (_) {}
    if (onHostedPages()) {
      try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
    }
  }

  function decryptFailed(cause) {
    const err = new Error("decrypt_failed");
    err.code = "decrypt_failed";
    if (cause) err.cause = cause;
    return err;
  }

  async function loadSnap() {
    if (!snapKey) return null;
    if (snapInflight) return snapInflight;
    snapInflight = (async () => {
      try {
        const env = await fetchSnapEnv();
        snapCache = await decryptWithKey(env, snapKey);
        return snapCache;
      } catch (e) {
        // Salt rotation, stale key, or iOS OperationError — ask for the code again.
        logout();
        throw decryptFailed(e);
      } finally {
        snapInflight = null;
      }
    })();
    return snapInflight;
  }

  function startSnapRefresh() {
    if (snapTimer) return;
    snapTimer = setInterval(() => { if (isUnlocked()) loadSnap().catch(() => {}); }, 60000);
  }

  function fromSnap(path) {
    const s = snapCache;
    if (!s) return null;
    const u = path.split("?")[0];
    const q = {};
    const qi = path.indexOf("?");
    if (qi >= 0) new URLSearchParams(path.slice(qi + 1)).forEach((v, k) => { q[k] = v; });
    if (u === "/api/state" || u === "api/state") return s.state;
    if (u === "/api/fun" || u === "api/fun") return s.fun || {};
    if (u === "/api/ticker" || u === "api/ticker") return s.ticker || { items: [] };
    if (u === "/api/lanes" || u === "api/lanes") return s.lanes || {};
    if (u === "/api/activity" || u === "api/activity") {
      const all = s.activity || { items: [] };
      const kind = q.kind;
      if (!kind || kind === "all") return all;
      const items = (all.items || []).filter((it) => activityKindMatch(it.kind, kind));
      return { items, next: all.next || null };
    }
    if (u === "/api/chart" || u === "api/chart") {
      const r = q.range || "today";
      return (s.charts && (s.charts[r] || s.charts.today)) || { range: r, points: [] };
    }
    if (u === "/api/movers" || u === "api/movers") {
      const r = q.range || "today";
      return (s.movers && (s.movers[r] || s.movers.today)) || { range: r, items: [] };
    }
    if (u.indexOf("/api/bots/") === 0 || u.indexOf("api/bots/") === 0) {
      const parts = u.split("/").filter(Boolean);
      const name = decodeURIComponent(parts[parts.indexOf("bots") + 1] || "");
      const list = (s.decisions && s.decisions[name]) || [];
      const bot = ((s.state && s.state.bots) || []).find((b) => b.name === name) || {};
      return { name, label: bot.label || name, status: bot.status || "idle", description: bot.description || "", decisions: list };
    }
    if (u === "/api/regime" || u === "api/regime") return s.regime || {};
    if (u === "/api/majors" || u === "api/majors") return s.majors || {};
    if (u === "/api/shadow" || u === "api/shadow") return s.shadow || {};
    if (u === "/api/status" || u === "api/status") return { mode: s.mode, telegram: s.telegram, state: s.state };
    if (u === "/api/bots" || u === "api/bots") return { bots: (s.state && s.state.bots) || [] };
    if (u === "/api/gold" || u === "api/gold" || u === "/api/assets" || u === "api/assets") return s.gold || (s.state && s.state.gold) || {};
    if (u === "/api/leverage" || u === "api/leverage") return s.leverage || (s.state && s.state.leverage) || {};
    if (u === "/api/risk" || u === "api/risk") return s.risk || (s.state && s.state.risk) || {};
    if (u === "/api/graduation" || u === "api/graduation") return s.graduation || (s.state && s.state.graduation) || {};
    if (u === "/api/live" || u === "api/live") return s.live || s.activity || { items: [] };
    const coinM = u.match(/^(?:\/)?api\/coin\/(.+)$/);
    if (coinM) return coinFromSnap(decodeURIComponent(coinM[1]));
    const auditM = u.match(/^(?:\/)?api\/audit\/(.+)$/);
    if (auditM) return auditFromSnap(decodeURIComponent(auditM[1]));
    return null;
  }

  function activityKindMatch(kind, filter) {
    const k = String(kind || "").toLowerCase();
    if (filter === "trades") return k === "buy" || k === "sell" || k === "bought" || k === "sold";
    if (filter === "blocks") return k === "block" || k === "stop" || k === "stopped" || k === "rejected" || k === "guard";
    if (filter === "lessons") return k === "lesson" || k === "lessons";
    return true;
  }

  function snapFindAsset(id) {
    const s = snapCache || {};
    const st = s.state || {};
    const hits = [];
    for (const p of (st.positions || [])) hits.push(p);
    const movers = s.movers || {};
    for (const k of Object.keys(movers)) {
      for (const it of (movers[k] && movers[k].items) || []) hits.push(it);
    }
    for (const it of ((s.activity || {}).items || [])) hits.push(it);
    for (const it of ((s.live || {}).items || [])) hits.push(it);
    for (const it of (st.watching || [])) hits.push(it);
    const uni = (s.assets && s.assets.universe) || [];
    for (const it of uni) hits.push(it);
    const perps = (s.assets && s.assets.perps) || [];
    for (const it of perps) hits.push(Object.assign({ mint: it.market || it.symbol }, it));
    const dec = s.decisions || {};
    for (const name of Object.keys(dec)) {
      for (const it of dec[name] || []) hits.push(it);
    }
    const fun = s.fun || {};
    for (const key of ["best", "worst"]) {
      const w = fun.week && fun.week[key];
      if (w) hits.push(w);
    }
    return hits.find((x) => x && (x.mint === id || x.market === id || x.symbol === id)) || null;
  }

  function coinFromSnap(id) {
    const s = snapCache || {};
    const st = s.state || {};
    const pos = (st.positions || []).find((p) => p.mint === id) || null;
    const found = snapFindAsset(id);
    const symbol = (pos && pos.symbol) || (found && found.symbol) || null;
    const name = (pos && pos.name) || (found && found.name) || symbol;
    const lane = (pos && pos.lane) || (found && found.lane) || (found && found.category) || null;
    const price = (pos && (pos.mark_usd || pos.price_usd)) || (found && (found.price || found.price_usd || found.mark_usd)) || null;
    const change = found && (found.change_pct != null ? found.change_pct : found.change_24h);
    const empty = !pos && !found && !symbol;
    const links = assetLink({ mint: id, symbol, lane, category: found && found.category, venue: found && found.venue });
    return {
      mint: id, symbol: symbol || null, name: name || null, lane,
      price_usd: price, change_1h: found && found.change_1h, change_24h: change,
      mc_usd: found && found.mc_usd, liq_usd: found && found.liq_usd,
      volume_24h: found && found.volume_24h, holders: found && found.holders,
      age_min: found && found.age_min, thesis: found && (found.thesis || found.reason) || null,
      score: found && found.score, decision: found && found.decision, chart: [],
      position: pos, links: links ? { open: links.url, label: links.label, button: links.button } : {},
      empty: !!empty
    };
  }

  function auditFromSnap(id) {
    const coin = coinFromSnap(id);
    return {
      mint: id, symbol: coin.symbol, name: coin.name, grade: null, notes: null,
      layers: [], passed: false, empty: true,
      links: coin.links || {}
    };
  }


  function isSolanaMint(v) {
    const s = String(v || "");
    return s.length >= 32 && s.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
  }

  const TV_PERP = {
    GOLD: "XAUUSD", SILVER: "XAGUSD", BRENTOIL: "UKOIL", CL: "USOIL",
    COPPER: "COPPER", NATGAS: "NATGAS", PLATINUM: "XPTUSD", PALLADIUM: "XPDUSD",
    HO: "HO1!", EUR: "EURUSD", USDJPY: "USDJPY", GBP: "GBPUSD", GBPUSD: "GBPUSD",
    XYZ100: "NAS100", SP500: "SPX", KR200: "KOSPI200", JP225: "JPN225",
    NIFTY: "NIFTY", SPCX: "SPX",
    EWY: "AMEX-EWY", EWJ: "AMEX-EWJ", URNM: "AMEX-URNM", TLT: "NASDAQ-TLT",
    EWZ: "AMEX-EWZ", EWT: "AMEX-EWT", SMH: "NASDAQ-SMH", XLE: "AMEX-XLE", SOXL: "AMEX-SOXL"
  };
  const TV_CRYPTO = {
    BTC: "BTCUSD", ETH: "ETHUSD", SOL: "SOLUSD", DOGE: "DOGEUSD", XRP: "XRPUSD",
    ADA: "ADAUSD", AVAX: "AVAXUSD", LINK: "LINKUSD", DOT: "DOTUSD", LTC: "LTCUSD",
    BNB: "BNBUSD", SUI: "SUIUSD", WBTC: "BTCUSD", WETH: "ETHUSD"
  };
  const TV_STOCK = {
    AAPL: "NASDAQ-AAPL", MSFT: "NASDAQ-MSFT", NVDA: "NASDAQ-NVDA", TSLA: "NASDAQ-TSLA",
    AMZN: "NASDAQ-AMZN", GOOG: "NASDAQ-GOOG", GOOGL: "NASDAQ-GOOGL", META: "NASDAQ-META",
    NFLX: "NASDAQ-NFLX", AMD: "NASDAQ-AMD", INTC: "NASDAQ-INTC", AVGO: "NASDAQ-AVGO",
    COST: "NASDAQ-COST", ADBE: "NASDAQ-ADBE", PEP: "NASDAQ-PEP", CSCO: "NASDAQ-CSCO",
    QCOM: "NASDAQ-QCOM", TXN: "NASDAQ-TXN", AMAT: "NASDAQ-AMAT", INTU: "NASDAQ-INTU",
    AMGN: "NASDAQ-AMGN", HON: "NASDAQ-HON", SBUX: "NASDAQ-SBUX", BKNG: "NASDAQ-BKNG",
    ADP: "NASDAQ-ADP", ISRG: "NASDAQ-ISRG", GILD: "NASDAQ-GILD", MU: "NASDAQ-MU",
    LRCX: "NASDAQ-LRCX", PANW: "NASDAQ-PANW", KLAC: "NASDAQ-KLAC", CRWD: "NASDAQ-CRWD",
    JPM: "NYSE-JPM", V: "NYSE-V", MA: "NYSE-MA", UNH: "NYSE-UNH", JNJ: "NYSE-JNJ",
    WMT: "NYSE-WMT", PG: "NYSE-PG", XOM: "NYSE-XOM", HD: "NYSE-HD", BAC: "NYSE-BAC",
    KO: "NYSE-KO", DIS: "NYSE-DIS", VZ: "NYSE-VZ", NKE: "NYSE-NKE", MRK: "NYSE-MRK",
    CVX: "NYSE-CVX", ABBV: "NYSE-ABBV", ORCL: "NYSE-ORCL", IBM: "NYSE-IBM", GE: "NYSE-GE",
    CAT: "NYSE-CAT", GS: "NYSE-GS", MCD: "NYSE-MCD", BA: "NYSE-BA", RTX: "NYSE-RTX"
  };
  const PERP_SET = new Set(Object.keys(TV_PERP));
  const CRYPTO_SET = new Set(Object.keys(TV_CRYPTO));
  const STOCK_CAT = new Set(["equity", "stock", "stocks", "gold_miners"]);
  const PERP_CAT = new Set(["gold", "silver", "platinum", "palladium", "oil", "commodity", "commodities", "fx", "index", "etf", "indices"]);

  function tickerOf(item) {
    const raw = String((item && (item.symbol || item.market || (!isSolanaMint(item && item.mint) && item.mint))) || "").trim();
    return raw.replace(/[-\/]?(PERP|USD)?$/i, "").toUpperCase();
  }

  function isWalletAddress(v) {
    const s = String(v || "");
    if (!isSolanaMint(s)) return false;
    try {
      const w = (snapCache && snapCache.state && snapCache.state.wallet && snapCache.state.wallet.address) || "";
      if (w && s === w) return true;
      // masked snapshot wallets look like Abcd…Wxyz — never treat those as mints
      if (w && w.indexOf("…") >= 0) {
        const [a, b] = w.split("…");
        if (a && b && s.startsWith(a) && s.endsWith(b)) return true;
      }
    } catch (_) {}
    return false;
  }

  function tvUrl(sym) {
    const s = String(sym || "").replace(/^\//, "");
    if (!s) return "";
    return "https://www.tradingview.com/symbols/" + encodeURIComponent(s) + "/";
  }

  function assetLink(item) {
    item = item || {};
    const mint = item.mint || item.address || "";
    const cat = String(item.category || item.lane || "").toLowerCase();
    const venue = String(item.venue || "").toLowerCase();
    const tick = tickerOf(item);
    if (mint && isSolanaMint(mint) && !isWalletAddress(mint)) {
      return {
        url: "https://dexscreener.com/solana/" + mint,
        label: "DexScreener",
        button: "Öppna på DexScreener",
        kind: "dexscreener"
      };
    }
    if (tick && (PERP_SET.has(tick) || PERP_CAT.has(cat) || venue === "hyperliquid")) {
      const mapped = TV_PERP[tick] || tick;
      return { url: tvUrl(mapped), label: "TradingView", button: "Öppna på TradingView", kind: "tradingview" };
    }
    if (tick && (TV_STOCK[tick] || STOCK_CAT.has(cat))) {
      const mapped = TV_STOCK[tick] || ("NASDAQ-" + tick);
      return { url: tvUrl(mapped), label: "TradingView", button: "Öppna på TradingView", kind: "tradingview" };
    }
    if (tick && CRYPTO_SET.has(tick)) {
      return { url: tvUrl(TV_CRYPTO[tick]), label: "TradingView", button: "Öppna på TradingView", kind: "tradingview" };
    }
    if (tick && /^[A-Z0-9.]{1,12}$/.test(tick) && !isSolanaMint(tick)) {
      return { url: tvUrl(tick), label: "TradingView", button: "Öppna på TradingView", kind: "tradingview" };
    }
    return null;
  }

  async function liveGet(path) {
    if (isUnlocked()) {
      startSnapRefresh();
      if (!snapCache) await loadSnap();
      const hit = fromSnap(path);
      if (hit != null) return hit;
      if (onHostedPages()) {
        const err = new Error("HTTP 404");
        err.status = 404;
        throw err;
      }
    } else if (onHostedPages()) {
      const err = new Error("HTTP 401");
      err.status = 401;
      throw err;
    }
    const res = await fetch(apiUrl(path), { headers: headers(), cache: "no-store" });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  const api = {
    captureTokenFromUrl,
    getToken,
    setToken,
    clearToken,
    isUnlocked,
    unlockWithPasscode,
    tryRememberedUnlock,
    logout,
    onHostedPages,

    async getFun(period) {
      return liveGet("/api/fun?period=" + encodeURIComponent(period || "vecka"));
    },
    async getLanes() {
      return liveGet("/api/lanes");
    },
    async undoLane(id) {
      const res = await fetch(apiUrl("/api/lanes/" + id + "/undo"), { method: "POST", headers: headers() });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    },
    async getMovers(range) {
      const r = range || "today";
      return liveGet("/api/movers?range=" + encodeURIComponent(r));
    },

    async getTicker() {
      return liveGet("/api/ticker");
    },

    async getState() {
      return liveGet("/api/state");
    },

    async getChart(range) {
      const r = range || "today";
      return liveGet("/api/chart?range=" + encodeURIComponent(r));
    },

    async getActivity(opts) {
      opts = opts || {};
      const q = new URLSearchParams();
      if (opts.limit) q.set("limit", opts.limit);
      if (opts.before) q.set("before", opts.before);
      if (opts.kind) q.set("kind", opts.kind);
      const s = q.toString();
      return liveGet("/api/activity" + (s ? "?" + s : ""));
    },

    async getCoin(mint) {
      return liveGet("/api/coin/" + encodeURIComponent(mint));
    },

    async getAudit(mint) {
      return liveGet("/api/audit/" + encodeURIComponent(mint));
    },

    async getBotDecisions(name, opts) {
      opts = opts || {};
      const q = opts.limit ? "?limit=" + encodeURIComponent(opts.limit) : "";
      return liveGet("/api/bots/" + encodeURIComponent(name) + "/decisions" + q);
    },

    screenUrl() {
      if (onHostedPages()) return "";
      const t = getToken();
      return apiUrl("/api/screen.jpg") + (t ? "?token=" + encodeURIComponent(t) : "") + "&_=" + Date.now();
    },

    async getLive() {
      return liveGet("/api/live");
    },

    assetLink,

    openStream(handlers) {
      if (isUnlocked() || onHostedPages()) {
        if (!isUnlocked()) return { close() {} };
        startSnapRefresh();
        const id = setInterval(() => {
          loadSnap().then((s) => {
            if (!s) return;
            if (handlers.state) handlers.state(s.state);
            if (handlers.activity && s.activity) handlers.activity(s.activity);
            if (handlers.live && (s.live || s.activity)) handlers.live(s.live || s.activity);
            if (handlers.tick) handlers.tick({ ts: Date.now() });
          }).catch(() => {});
        }, 60000);
        return { close() { clearInterval(id); } };
      }
      const t = getToken();
      const url = apiUrl("/api/stream") + (t ? "?token=" + encodeURIComponent(t) : "");
      const es = new EventSource(url);
      ["state", "activity", "tick"].forEach((ev) => {
        es.addEventListener(ev, (e) => {
          let data = e.data;
          try { data = JSON.parse(e.data); } catch (_) {}
          if (handlers[ev]) handlers[ev](data);
        });
      });
      es.onmessage = (e) => {
        let data = e.data;
        try { data = JSON.parse(e.data); } catch (_) {}
        if (handlers.message) handlers.message(data);
      };
      return es;
    }
  };

  global.DeskAPI = api;
})(window);
