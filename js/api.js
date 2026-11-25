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
  const BRIDGE_URL_KEY = "MMG_BRIDGE_URL";
  const BRIDGE_TOK_KEY = "MMG_BRIDGE_TOKEN";

  function getBridge() {
    try {
      const url = String(localStorage.getItem(BRIDGE_URL_KEY) || "").trim().replace(/\/+$/, "");
      const token = String(localStorage.getItem(BRIDGE_TOK_KEY) || "").trim();
      return { url, token };
    } catch (_) {
      return { url: "", token: "" };
    }
  }

  function setBridge(url, token) {
    try {
      const u = String(url || "").trim().replace(/\/+$/, "");
      const t = String(token || "").trim();
      if (u) localStorage.setItem(BRIDGE_URL_KEY, u);
      else localStorage.removeItem(BRIDGE_URL_KEY);
      if (t) localStorage.setItem(BRIDGE_TOK_KEY, t);
      else localStorage.removeItem(BRIDGE_TOK_KEY);
    } catch (_) {}
  }

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

  // raw.githubusercontent.com 404s in some browsers (Chrome/iOS). Prefer CORS CDNs.
  const SNAP_URLS = [
    "https://cdn.jsdelivr.net/gh/moht4244/moneymakingG@data/snap.enc",
    "https://fastly.jsdelivr.net/gh/moht4244/moneymakingG@data/snap.enc",
    "https://gcore.jsdelivr.net/gh/moht4244/moneymakingG@data/snap.enc",
    "https://cdn.jsdmirror.com/gh/moht4244/moneymakingG@data/snap.enc",
    "https://raw.githack.com/moht4244/moneymakingG/data/snap.enc"
  ];
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

  function isSnapshotOnly() {
    return onHostedPages() || (usesSnapshot() && !getToken());
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

  async function fetchJsonCors(url, opts) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, 12000) : 0;
    try {
      const r = await fetch(url, Object.assign({ cache: "no-store", mode: "cors", signal: ctrl && ctrl.signal }, opts || {}));
      return r;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function looksLikeSnap(env) {
    return !!(env && env.v && env.ct && env.iv && env.salt);
  }

  const REF_API = "https://api.github.com/repos/moht4244/moneymakingG/git/refs/heads/data";

  async function envFromGithubContents(url) {
    const r = await fetchJsonCors(url + (url.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now(), {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!r || !r.ok) return null;
    const j = await r.json();
    const text = atob(String(j.content || "").replace(/\n/g, ""));
    const env = JSON.parse(text);
    return looksLikeSnap(env) ? env : null;
  }

  async function fetchSnapEnv() {
    const bust = "t=" + Date.now();
    // 1) GitHub Contents API — not cached for 12h like jsDelivr @data
    try {
      const env = await envFromGithubContents(SNAP_API);
      if (env) return env;
    } catch (_) {}
    // 2) jsDelivr pinned to the current data-branch commit SHA
    try {
      const r = await fetchJsonCors(REF_API + "?" + bust, { headers: { Accept: "application/vnd.github+json" } });
      if (r && r.ok) {
        const ref = await r.json();
        const sha = (ref && ref.object && ref.object.sha) || "";
        if (sha) {
          const r2 = await fetchJsonCors("https://cdn.jsdelivr.net/gh/moht4244/moneymakingG@" + sha + "/snap.enc?" + bust);
          if (r2 && r2.ok) {
            const env = await r2.json();
            if (looksLikeSnap(env)) return env;
          }
        }
      }
    } catch (_) {}
    // 3) CDN fallbacks (may be stale — the app flags generated_at > 5 min)
    for (let i = 0; i < SNAP_URLS.length; i++) {
      try {
        const base = SNAP_URLS[i];
        const r = await fetchJsonCors(base + (base.indexOf("?") >= 0 ? "&" : "?") + bust);
        if (!r || !r.ok) continue;
        const env = await r.json();
        if (looksLikeSnap(env)) return env;
      } catch (_) {}
    }
    const err = new Error("HTTP 404");
    err.status = 404;
    throw err;
  }

  function snapGeneratedAt() {
    return (snapCache && snapCache.generated_at) || null;
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
        let env;
        try {
          env = await fetchSnapEnv();
        } catch (e) {
          const err = new Error("refresh_failed");
          err.code = "refresh_failed";
          if (e) err.cause = e;
          throw err;
        }
        try {
          snapCache = await decryptWithKey(env, snapKey);
          return snapCache;
        } catch (e) {
          // Salt rotation, stale key, or iOS OperationError — ask for the code again.
          logout();
          throw decryptFailed(e);
        }
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
    if (u === "/api/state" || u === "api/state") return s.state || {};
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
    if (u === "/api/chatter" || u === "api/chatter") return s.chatter || { items: [] };
    if (u === "/api/moods" || u === "api/moods") return s.moods || {};
    if (u === "/api/requests" || u === "api/requests") return { items: s.requests || [], watching: (s.state && s.state.watching) || [] };
    if (u === "/api/universe" || u === "api/universe") return { items: (s.assets && s.assets.universe) || [], perps: (s.assets && s.assets.perps) || [] };
    if (u === "/api/trades" || u === "api/trades") return { items: s.trades || [] };
    if (u === "/api/ranking" || u === "api/ranking") return { items: s.ranking || [] };
    if (u === "/api/calendar" || u === "api/calendar") return s.calendar || { days: [] };
    if (u === "/api/paper-clock" || u === "api/paper-clock") return { clock: s.paper_clock || {}, step15: s.step15 || {} };
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
    for (const it of (s.trades || [])) hits.push(it);
    for (const it of (s.markers || [])) hits.push(it);
    for (const it of ((s.majors && s.majors.coins) || [])) hits.push(it);
    for (const it of ((s.majors && s.majors.universe) || [])) hits.push(it);
    const want = String(id || "");
    const wantU = want.toUpperCase();
    return hits.find((x) => x && (x.mint === want || x.market === want || x.symbol === want || String(x.symbol || "").toUpperCase() === wantU)) || null;
  }

  function coinFromSnap(id) {
    const s = snapCache || {};
    const st = s.state || {};
    const wantId = String(id || "");
    const tickerOnly = /^[A-Z0-9.]{1,12}$/.test(wantId.toUpperCase()) && !isSolanaMint(wantId);
    const tickU0 = wantId.toUpperCase();
    const MAJOR_TICKS = { BTC:1, ETH:1, SOL:1, DOGE:1, XRP:1, ADA:1, AVAX:1, LINK:1, DOT:1, LTC:1, BNB:1, SUI:1, WBTC:1, WETH:1, PAXG:1 };
    const pos = (st.positions || []).find((p) => {
      if (p.mint === id) return true;
      if (!tickerOnly) return false;
      if (String(p.symbol || "").toUpperCase() !== tickU0) return false;
      if (MAJOR_TICKS[tickU0] && (p.lane || "").indexOf("meme") === 0) return false;
      return true;
    }) || null;
    const found = snapFindAsset(id);
    let symbol = (pos && pos.symbol) || (found && found.symbol) || (tickerOnly ? tickU0 : null);
    let name = (pos && pos.name) || (found && found.name) || symbol;
    let lane = (pos && pos.lane) || (found && found.lane) || (found && found.category) || null;
    let price = (pos && (pos.mark_usd || pos.price_usd)) || (found && (found.price || found.price_usd || found.mark_usd)) || null;
    let change = found && (found.change_pct != null ? found.change_pct : found.change_24h);
    const mkt = st.market || {};
    const tickU = String(symbol || wantId).toUpperCase();
    if (price == null && (tickU === "BTC" || tickU === "SOL") && mkt[tickU.toLowerCase()]) {
      price = mkt[tickU.toLowerCase()].price;
      if (change == null) change = mkt[tickU.toLowerCase()].change_24h_pct;
    }
    let resolvedMint = (pos && pos.mint) || (found && found.mint) || id;
    if (tickerOnly && MAJOR_TICKS[tickU]) {
      lane = (pos && pos.lane === "majors") ? "majors" : (lane === "majors" ? "majors" : "majors");
      const official = ((s.majors && (s.majors.coins || s.majors.universe)) || []).find((c) => String(c.symbol || "").toUpperCase() === tickU);
      // ticker pages (e.g. #/coin/BTC) stay on the major — don't inherit a memecoin mint or its stats
      if (official && official.mint) resolvedMint = official.mint;
      else resolvedMint = tickU;
      if (!name || name === symbol) name = ({ BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", WBTC: "Wrapped Bitcoin", WETH: "Wrapped Ethereum", PAXG: "PAX Gold" })[tickU] || name;
    }
    const known = !!MAJOR_TICKS[tickU] || /^(BONK|GOLD|AAPL|MSFT|NVDA|TSLA)$/.test(tickU);
    const empty = !pos && !found && !symbol && !known;
    const links = assetLink({ mint: id, symbol, lane, category: found && found.category, venue: found && found.venue });
    const wantU = String((symbol || id) || "").toUpperCase();
    const markers = ((s.markers) || []).filter((m) => m && (m.mint === id || m.mint === (pos && pos.mint) || String(m.symbol || "").toUpperCase() === wantU));
    const series = (s.series || {})[id] || (pos && s.series && s.series[pos.mint]) || [];
    const reasons = [];
    markers.forEach((m) => { if (m.reason) reasons.push({ ts: m.t, side: m.side, bot: m.bot, text: m.reason }); });
    if (found && (found.thesis || found.reason)) reasons.push({ ts: null, side: "thesis", bot: "brain", text: found.thesis || found.reason });
    const coinObj = {
      mint: resolvedMint,
      symbol: symbol || null, name: name || null, lane, venue: found && found.venue,
      price_usd: price, change_1h: found && found.change_1h, change_24h: change,
      mc_usd: found && found.mc_usd, fdv_usd: found && found.fdv_usd, liq_usd: found && found.liq_usd,
      volume_24h: found && found.volume_24h, holders: found && found.holders,
      age_min: found && found.age_min, thesis: found && (found.thesis || found.reason) || null,
      score: found && found.score, decision: found && found.decision,
      chart: series, markers: markers, reasons: reasons,
      position: pos, links: links ? { open: links.url, label: links.label, button: links.button } : {},
      empty: !!empty
    };
    coinObj.safety = safetyOf(id, coinObj);
    return coinObj;
  }

  function safetyOf(id, coin) {
    const pack = (snapCache && snapCache.safety) || {};
    const mint = (coin && coin.mint) || id;
    const sym = String((coin && coin.symbol) || "").toUpperCase();
    const idU = String(id || "").toUpperCase();
    return (pack.by_mint && mint && pack.by_mint[mint])
      || (pack.by_symbol && sym && pack.by_symbol[sym])
      || (pack.by_symbol && pack.by_symbol[idU])
      || (pack.by_symbol && pack.by_symbol[id])
      || null;
  }

  function auditFromSnap(id) {
    const coin = coinFromSnap(id);
    const safety = (coin && coin.safety) || safetyOf(id, coin);
    const checks = (safety && safety.checks) || [];
    const layers = checks.map((ch, i) => ({
      id: ch.id || String(i + 1),
      name: ch.name,
      explain: ch.explain,
      pass: ch.status === "pass" ? true : (ch.status === "fail" ? false : null),
      status: ch.status,
      detail: ch.detail,
      source: ch.source
    }));
    const empty = !safety || (!checks.length && !safety.summary && !safety.score && !safety.scan && !(safety.signals || []).length);
    return {
      mint: (coin && coin.mint) || id,
      symbol: coin && coin.symbol, name: coin && coin.name,
      grade: safety && safety.verdict,
      notes: safety && safety.summary,
      layers: layers,
      passed: !!(safety && safety.verdict === "godkänd"),
      empty: !!empty,
      safety: safety || null,
      min_score: (safety && safety.min_score) || packMinScore(),
      links: (coin && coin.links) || {}
    };
  }

  function packMinScore() {
    const pack = (snapCache && snapCache.safety) || {};
    return pack.min_score != null ? pack.min_score : 70;
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

  function coinIdOf(item) {
    item = item || {};
    const mint = item.mint || item.address || item.resolved_mint || item.market || "";
    if (mint && isSolanaMint(mint) && !isWalletAddress(mint)) return mint;
    if (mint && !isSolanaMint(mint) && String(mint).length <= 24) return String(mint);
    const tick = tickerOf(item);
    if (tick) return tick;
    if (mint && !isWalletAddress(mint)) return String(mint);
    return "";
  }

  function coinHref(item) {
    const id = coinIdOf(item);
    return id ? "#/coin/" + encodeURIComponent(id) : "";
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

  function emptyFromSnap(path) {
    const u = String(path || "").split("?")[0];
    const coinM = u.match(/^(?:\/)?api\/coin\/(.+)$/);
    if (coinM) return coinFromSnap(decodeURIComponent(coinM[1]));
    const auditM = u.match(/^(?:\/)?api\/audit\/(.+)$/);
    if (auditM) return auditFromSnap(decodeURIComponent(auditM[1]));
    if (u.indexOf("/api/bots/") === 0 || u.indexOf("api/bots/") === 0) {
      const parts = u.split("/").filter(Boolean);
      const name = decodeURIComponent(parts[parts.indexOf("bots") + 1] || "");
      return { name, label: name, status: "idle", description: "", decisions: [] };
    }
    if (u.indexOf("chart") >= 0) return { range: "today", points: [] };
    if (u.indexOf("movers") >= 0) return { range: "today", items: [] };
    if (u.indexOf("activity") >= 0 || u.indexOf("live") >= 0) return { items: [] };
    if (u.indexOf("ticker") >= 0) return { items: [] };
    if (u.indexOf("fun") >= 0) return { mode: "PAPER", leaderboard: [], streak: { current: 0, best: 0 }, badges: [], week: {}, meme: null, chat: [], mood: null, wins: [] };
    if (u.indexOf("lanes") >= 0) return { health: null, history: [] };
    if (u.indexOf("requests") >= 0) return { items: [], watching: [] };
    if (u.indexOf("universe") >= 0) return { items: [], perps: [] };
    if (u.indexOf("moods") >= 0) return {};
    if (u.indexOf("trades") >= 0) return { items: [] };
    if (u.indexOf("ranking") >= 0) return { items: [] };
    if (u.indexOf("calendar") >= 0) return { days: [] };
    if (u.indexOf("paper-clock") >= 0) return { clock: {}, step15: {} };
    return {};
  }

  async function liveGet(path) {
    // Hosted GitHub Pages has no /api/* — never fetch it (that is a real 404).
    if (onHostedPages() || isUnlocked()) {
      if (onHostedPages() && !isUnlocked()) {
        const err = new Error("HTTP 401");
        err.status = 401;
        throw err;
      }
      startSnapRefresh();
      if (!snapCache) await loadSnap();
      const hit = fromSnap(path);
      if (hit != null) return hit;
      return emptyFromSnap(path);
    }
    const res = await fetch(apiUrl(path), { headers: headers(), cache: "no-store" });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }


  function plainReason(s) {
    if (s == null) return s;
    let out = String(s);
    if (!out) return out;
    const exact = {
      "price_glitch_voided": "Felaktigt pris – affären räknades inte",
      "price_glitch": "Felaktigt pris",
      "would_have_stopped": "Skulle ha stoppats",
      "dead money": "Stillastående – ingen rörelse",
      "pulled": "LP försvann",
      "lp pulled": "LP försvann",
      "dev dumping": "Skaparen sålde",
      "emergency exit (rug guard)": "Nödsälj (rug guard)",
      "emergency exit": "Nödsälj",
      "hard blockers ok": "Klarade hard blockers",
      "meme_test hard blockers ok": "Klarade hard blockers",
      "no price": "Inget pris",
      "ema cross down": "EMA-trend vände ner",
      "rebalance": "Omfördelning",
      "stop-loss": "Stop-loss",
      "stop": "Stop-loss",
      "tp": "Take-profit",
      "owner_override": "Du tog över",
      "beyond_stop": "Gick förbi stop-loss"
    };
    const key = out.trim();
    if (exact[key] || exact[key.toLowerCase()]) return exact[key] || exact[key.toLowerCase()];
    out = out.replace(/price_glitch_voided/ig, "Felaktigt pris – affären räknades inte");
    out = out.replace(/^price_glitch:\s*/i, "Felaktigt pris: ");
    out = out.replace(/\bprice_glitch\b/ig, "Felaktigt pris");
    out = out.replace(/^would_have_stopped(?::\s*(.*))?$/i, function (_, rest) {
      return "Skulle ha stoppats" + (rest ? " (" + rest.trim() + ")" : "");
    });
    out = out.replace(/\bwould_have_stopped\b/ig, "Skulle ha stoppats");
    out = out.replace(/^stop\s*-?\s*(\d+(?:[.,]\d+)?)\s*%$/i, function (_, n) { return "Stop-loss −" + n.replace(".", ",") + " %"; });
    out = out.replace(/^time stop\s+(\d+)\s*h$/i, "Tidsstopp efter $1 h");
    out = out.replace(/^take profit\s+\+?(\d+(?:[.,]\d+)?)\s*%$/i, function (_, n) { return "Take-profit +" + n.replace(".", ",") + " %"; });
    out = out.replace(/^take profit\s+(\d+(?:[.,]\d+)?)\s*x$/i, function (_, n) { return "Take-profit " + n.replace(".", ",") + "×"; });
    out = out.replace(/^trail\s+(\d+(?:[.,]\d+)?)\s*%$/i, function (_, n) { return "Trailing stop " + n.replace(".", ",") + " %"; });
    out = out.replace(/^owner resumed\s+(.+?)\s+buy$/i, function (_, sym) { return "Du återupptog köpet av " + sym.trim(); });
    out = out.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, function (tok) {
      const words = {
        price_glitch_voided: "Felaktigt pris – affären räknades inte",
        price_glitch: "Felaktigt pris",
        would_have_stopped: "Skulle ha stoppats",
        lane_daily: "spårets dagsgräns",
        max_drawdown: "största nedgång",
        eval_error: "kunde inte utvärderas",
        owner_override: "du tog över",
        beyond_stop: "gick förbi stop-loss",
        whale_buy: "whale-köp",
        meme_test: "meme-test",
        take_profit: "take-profit",
        stop_loss: "stop-loss"
      };
      return words[tok] || tok.replace(/_/g, " ");
    });
    return out;
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
    snapGeneratedAt,
    loadSnap,
    refreshSnap: loadSnap,
    plainReason,

    async getFun(period) {
      return liveGet("/api/fun?period=" + encodeURIComponent(period || "vecka"));
    },
    async getLanes() {
      return liveGet("/api/lanes");
    },
    async undoLane(id) {
      if (onHostedPages()) return { ok: false, reason: "hosted" };
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
    async getTrades() {
      return liveGet("/api/trades");
    },
    async getRanking() {
      return liveGet("/api/ranking");
    },
    async getCalendar() {
      return liveGet("/api/calendar");
    },
    async getPaperClock() {
      return liveGet("/api/paper-clock");
    },
    _snap() { return snapCache; },
    coinHref,
    coinIdOf,

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

    async getChatter() {
      return liveGet("/api/chatter");
    },

    async getMoods() {
      return liveGet("/api/moods");
    },

    async getUniverse() {
      return liveGet("/api/universe");
    },

    async getRequests() {
      return liveGet("/api/requests");
    },

    canWriteRemote() {
      return !isSnapshotOnly() && !!getToken();
    },

    async submitRequest(payload) {
      if (isSnapshotOnly()) return { ok: false, mode: "hosted_local" };
      const res = await fetch(apiUrl("/api/requests"), {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headers()),
        body: JSON.stringify(payload || {})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.detail || ("HTTP " + res.status));
        err.status = res.status;
        throw err;
      }
      return data;
    },

    async deleteRequest(id) {
      if (isSnapshotOnly()) return { ok: false, mode: "hosted_local" };
      const res = await fetch(apiUrl("/api/requests/" + encodeURIComponent(id)), { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    },

    async updateRequest(id, payload) {
      if (isSnapshotOnly()) return { ok: false, mode: "hosted_local" };
      const res = await fetch(apiUrl("/api/requests/" + encodeURIComponent(id)), {
        method: "PATCH",
        headers: Object.assign({ "Content-Type": "application/json" }, headers()),
        body: JSON.stringify(payload || {})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.detail || ("HTTP " + res.status));
        err.status = res.status;
        throw err;
      }
      return data;
    },

    async refreshRequests() {
      if (isSnapshotOnly()) return { ok: false, mode: "hosted_local" };
      const res = await fetch(apiUrl("/api/requests/refresh"), { method: "POST", headers: headers() });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    },

    async fetchPublicQuotes(items) {
      const list = Array.isArray(items) ? items : [];
      if (!list.length) return {};
      const out = {};
      const mints = [];
      list.forEach((it) => {
        const m = it && (it.mint || it.resolved_mint);
        if (m && mints.indexOf(m) < 0) mints.push(m);
      });
      if (mints.length) {
        try {
          const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + encodeURIComponent(mints.slice(0, 25).join(",")), { cache: "no-store" });
          if (r.ok) {
            const j = await r.json();
            const byMint = {};
            ((j && j.pairs) || []).forEach((p) => {
              const addr = p && p.baseToken && p.baseToken.address;
              const px = p && p.priceUsd ? Number(p.priceUsd) : 0;
              if (!addr || !px) return;
              const liq = Number((p.liquidity && p.liquidity.usd) || 0);
              if (!byMint[addr] || liq > byMint[addr].liq) {
                const chg = p.priceChange && p.priceChange.h24 != null ? Number(p.priceChange.h24) : null;
                byMint[addr] = { price: px, change_24h: isFinite(chg) ? chg : null, source: "dexscreener", liq: liq, mint: addr };
              }
            });
            Object.keys(byMint).forEach((m) => { out["M:" + m] = byMint[m]; });
          }
        } catch (_) {}
      }
      const needSym = list.filter((it) => {
        const m = it && (it.mint || it.resolved_mint);
        return !(m && out["M:" + m]);
      });
      let hlMap = {};
      if (needSym.length) {
        const hlReqs = [{ type: "metaAndAssetCtxs" }, { type: "metaAndAssetCtxs", dex: "xyz" }];
        await Promise.all(hlReqs.map(async (body) => {
          try {
            const r = await fetch("https://api.hyperliquid.xyz/info", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            });
            if (!r.ok) return;
            const d = await r.json();
            if (!Array.isArray(d) || d.length < 2) return;
            const univ = (d[0] && d[0].universe) || [];
            const ctxs = d[1] || [];
            univ.forEach((u, i) => {
              const nm = String((u && u.name) || "").toUpperCase().split(":").pop();
              const c = ctxs[i];
              if (!nm || !c) return;
              const px = Number(c.markPx || c.midPx || 0);
              if (!isFinite(px) || px <= 0) return;
              const prev = Number(c.prevDayPx || 0);
              const chg = prev > 0 ? ((px - prev) / prev) * 100 : null;
              hlMap[nm] = { price: px, change_24h: isFinite(chg) ? chg : null, source: "hyperliquid" };
            });
          } catch (_) {}
        }));
        const unresolved = [];
        needSym.forEach((it) => {
          const sym = String((it && it.symbol) || "").toUpperCase();
          if (!sym) return;
          if (hlMap[sym]) {
            out["S:" + sym] = hlMap[sym];
          } else if ((it.asset_type || "auto") !== "stock" && unresolved.indexOf(sym) < 0) {
            unresolved.push(sym);
          }
        });
        await Promise.all(unresolved.slice(0, 6).map(async (sym) => {
          try {
            const r = await fetch("https://api.dexscreener.com/latest/dex/search?q=" + encodeURIComponent(sym), { cache: "no-store" });
            if (!r.ok) return;
            const j = await r.json();
            const matches = ((j && j.pairs) || []).filter((p) =>
              p && p.baseToken && String(p.baseToken.symbol || "").toUpperCase() === sym && Number(p.priceUsd) > 0
            );
            if (!matches.length) return;
            matches.sort((a, b) => {
              const sa = (a.chainId === "solana" ? 1 : 0) - (b.chainId === "solana" ? 1 : 0);
              if (sa !== 0) return -sa;
              return Number((b.liquidity && b.liquidity.usd) || 0) - Number((a.liquidity && a.liquidity.usd) || 0);
            });
            const p = matches[0];
            const chg = p.priceChange && p.priceChange.h24 != null ? Number(p.priceChange.h24) : null;
            out["S:" + sym] = {
              price: Number(p.priceUsd),
              change_24h: isFinite(chg) ? chg : null,
              source: "dexscreener",
              mint: p.chainId === "solana" && p.baseToken ? p.baseToken.address : null
            };
          } catch (_) {}
        }));
      }
      return out;
    },

    assetLink,
    coinHref,
    coinIdOf,

    openStream(handlers) {
      if (isUnlocked() || isSnapshotOnly()) {
        if (!isUnlocked()) return { close() {} };
        startSnapRefresh();
        const id = setInterval(() => {
          loadSnap().then((s) => {
            if (!s) return;
            if (handlers.state) handlers.state(s.state);
            if (handlers.activity && s.activity) handlers.activity(s.activity);
            if (handlers.live && (s.live || s.activity)) handlers.live(s.live || s.activity);
            if (handlers.chatter && s.chatter) handlers.chatter(s.chatter);
            if (handlers.moods && s.moods) handlers.moods(s.moods);
            if (handlers.requests && s.requests) handlers.requests({ items: s.requests, watching: (s.state && s.state.watching) || [] });
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
