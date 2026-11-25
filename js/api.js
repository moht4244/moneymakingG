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

  function isMock() {
    return true; // published preview is always mock/låtsasdata
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

  function headers() {
    const h = { Accept: "application/json" };
    const t = getToken();
    if (t) {
      h["Authorization"] = "Bearer " + t;
      h["X-App-Token"] = t;
    }
    return h;
  }

  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function liveGet(path) {
    const res = await fetch(path, { headers: headers(), cache: "no-store" });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  const api = {
    isMock,
    captureTokenFromUrl,
    getToken,

    async getFun(period) {
      if (isMock()) return (global.DESK_MOCK && global.DESK_MOCK.fun) || { mode: "PAPER", leaderboard: [], streak: { current: 0, best: 0 }, badges: [], week: {}, meme: { text: "Exempel: botarna kollar 8 saker innan köp ✅" }, chat: [], mood: { score: 50, emoji: "😐", label: "Neutral", explain: "Exempeldata." }, wins: [] };
      return liveGet("/api/fun?period=" + encodeURIComponent(period || "vecka"));
    },
    async getLanes() {
      if (isMock()) return { health: { memecoin: 46, majors: 55, verdict: "Jämnt läge – ingen ändring (exempeldata)", split: { memecoin: 60, majors: 30, reserve: 10 }, detail: {} }, history: [] };
      return liveGet("/api/lanes");
    },
    async undoLane(id) {
      if (isMock()) return { ok: true };
      const res = await fetch("/api/lanes/" + id + "/undo", { method: "POST", headers: headers() });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    },
    async getTicker() {
      if (isMock()) return (global.DESK_MOCK && global.DESK_MOCK.ticker) || { items: [] };
      return liveGet("/api/ticker");
    },

    async getState() {
      if (isMock()) {
        await delay(220);
        return JSON.parse(JSON.stringify(global.DESK_MOCK.state));
      }
      return liveGet("/api/state");
    },

    async getChart(range) {
      const r = range || "today";
      if (isMock()) {
        await delay(160);
        const points = global.DESK_MOCK.charts[r] || global.DESK_MOCK.charts.today;
        return { range: r, points: JSON.parse(JSON.stringify(points)) };
      }
      return liveGet("/api/chart?range=" + encodeURIComponent(r));
    },

    async getActivity(opts) {
      opts = opts || {};
      if (isMock()) {
        await delay(180);
        let items = global.DESK_MOCK.activity.slice();
        if (opts.kind && opts.kind !== "all") {
          const map = { trades: ["buy", "sell"], blocks: ["block"], lessons: ["lesson"], bots: ["scan", "system", "risk"] };
          const allow = map[opts.kind] || [opts.kind];
          items = items.filter((i) => allow.includes(i.kind));
        }
        return { items: JSON.parse(JSON.stringify(items)), next: null };
      }
      const q = new URLSearchParams();
      if (opts.limit) q.set("limit", opts.limit);
      if (opts.before) q.set("before", opts.before);
      if (opts.kind) q.set("kind", opts.kind);
      const s = q.toString();
      return liveGet("/api/activity" + (s ? "?" + s : ""));
    },

    async getCoin(mint) {
      if (isMock()) {
        await delay(200);
        const c = global.DESK_MOCK.coins[mint];
        if (!c) { const e = new Error("HTTP 404"); e.status = 404; throw e; }
        const out = JSON.parse(JSON.stringify(c));
        out.links = { dexscreener: "https://dexscreener.com/solana/" + mint };
        return out;
      }
      return liveGet("/api/coin/" + encodeURIComponent(mint));
    },

    async getAudit(mint) {
      if (isMock()) {
        await delay(200);
        const a = global.DESK_MOCK.audits[mint];
        if (!a) { const e = new Error("HTTP 404"); e.status = 404; throw e; }
        return JSON.parse(JSON.stringify(a));
      }
      return liveGet("/api/audit/" + encodeURIComponent(mint));
    },

    async getBotDecisions(name, opts) {
      opts = opts || {};
      if (isMock()) {
        await delay(180);
        const key = String(name || "").toLowerCase();
        const list = global.DESK_MOCK.decisions[key];
        if (!list) { const e = new Error("HTTP 404"); e.status = 404; throw e; }
        const bot = (global.DESK_MOCK.state.bots || []).find((b) => b.name === key) || {};
        const meta = global.DESK_MOCK.botMeta[key] || {};
        return {
          name: key,
          label: bot.label || name,
          status: bot.status || "idle",
          description: meta.description || "",
          decisions: JSON.parse(JSON.stringify(list))
        };
      }
      const q = opts.limit ? "?limit=" + encodeURIComponent(opts.limit) : "";
      return liveGet("/api/bots/" + encodeURIComponent(name) + "/decisions" + q);
    },

    screenUrl() {
      if (isMock()) return "img/screen-mock.png";
      const t = getToken();
      return "/api/screen.jpg" + (t ? "?token=" + encodeURIComponent(t) : "") + "&_=" + Date.now();
    },

    openStream(handlers) {
      if (isMock()) {
        let n = 0;
        const id = setInterval(() => {
          n += 1;
          if (handlers.tick) handlers.tick({ ts: Date.now(), n });
        }, 8000);
        return { close() { clearInterval(id); } };
      }
      const t = getToken();
      const url = "/api/stream" + (t ? "?token=" + encodeURIComponent(t) : "");
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
