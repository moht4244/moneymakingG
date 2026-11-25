/* STEP 8 client.
 *
 * Auth: APP_TOKEN is stored in localStorage after a #t= link is opened.
 * Requests send Authorization: Bearer and X-App-Token.
 * EventSource cannot set headers, so /api/stream?token= is used.
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

  function setToken(value) {
    try {
      const v = String(value || "").trim();
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (_) {}
    snapKey = null;
    snapKeySig = "";
    snapCache = null;
    if (value && onHostedPages && onHostedPages()) loadSnap().catch(() => {});
  }

  function clearToken() {
    setToken("");
  }

  function captureTokenFromUrl() {
    const hash = location.hash || "";
    const qs = new URLSearchParams(location.search);
    let token = null;
    const m = hash.match(/^#t=([^&]+)/);
    if (m) token = decodeURIComponent(m[1]);
    if (!token && qs.get("t")) token = qs.get("t");
    if (token) {
      try { localStorage.setItem(TOKEN_KEY, token); } catch (_) {}
      if (m) {
        const rest = hash.slice(m[0].length).replace(/^&/, "");
        const next = rest.startsWith("/") ? "#" + rest : (rest ? "#" + rest : "#/home");
        history.replaceState(null, "", location.pathname + location.search + (next === "#" ? "#/home" : next));
      }
    }
    return getToken();
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
  let snapKeySig = "";
  let snapTimer = 0;
  let snapInflight = null;

  function onHostedPages() {
    return /\.github\.io$/i.test(location.hostname);
  }

  function b64ToBytes(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function snapDeriveKey(token, saltB64, iter) {
    const sig = token + "|" + saltB64 + "|" + String(iter);
    if (snapKey && snapKeySig === sig) return snapKey;
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", enc.encode(token), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: b64ToBytes(saltB64), iterations: iter || 100000 },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    snapKey = key;
    snapKeySig = sig;
    return key;
  }

  async function decryptSnap(env, token) {
    const key = await snapDeriveKey(token, env.salt, env.iter);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(env.iv) }, key, b64ToBytes(env.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  async function loadSnap() {
    if (snapInflight) return snapInflight;
    const token = getToken();
    if (!token) return null;
    snapInflight = (async () => {
      try {
        let env = null;
        try {
          const r = await fetch(SNAP_RAW + "?t=" + Date.now(), { cache: "no-store" });
          if (r.ok) env = await r.json();
        } catch (_) {}
        if (!env) {
          const r = await fetch(SNAP_API + "&t=" + Date.now(), { cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
          if (!r.ok) throw new Error("HTTP " + r.status);
          const j = await r.json();
          const text = atob(String(j.content || "").replace(/\n/g, ""));
          env = JSON.parse(text);
        }
        snapCache = await decryptSnap(env, token);
        return snapCache;
      } finally {
        snapInflight = null;
      }
    })();
    return snapInflight;
  }

  function startSnapRefresh() {
    if (snapTimer || !onHostedPages()) return;
    snapTimer = setInterval(() => { loadSnap().catch(() => {}); }, 60000);
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
    if (u === "/api/activity" || u === "api/activity") return s.activity || { items: [] };
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
    return null;
  }

  async function liveGet(path) {
    if (onHostedPages()) {
      startSnapRefresh();
      if (!snapCache) await loadSnap();
      const hit = fromSnap(path);
      if (hit != null) return hit;
      throw new Error("HTTP 404");
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
      const t = getToken();
      return apiUrl("/api/screen.jpg") + (t ? "?token=" + encodeURIComponent(t) : "") + "&_=" + Date.now();
    },

    openStream(handlers) {
      if (onHostedPages()) {
        startSnapRefresh();
        const id = setInterval(() => {
          loadSnap().then((s) => { if (s && handlers.state) handlers.state(s.state); if (s && handlers.tick) handlers.tick({ ts: Date.now() }); }).catch(() => {});
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
