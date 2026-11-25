/* Coin detail, market data, trade history, ranking, PnL calendar, LIVE countdown.
   Public feeds only. No secrets, no wallet URLs, no mock series. */
(function (global) {
  const TFS = [
    { id: "1H", label: "1H", ms: 3600 * 1000, bn: "1m", bnLimit: 60, gt: "minute", gtAgg: 1, ya: { range: "1d", interval: "1m" }, hl: "1m" },
    { id: "1D", label: "1D", ms: 86400 * 1000, bn: "15m", bnLimit: 96, gt: "minute", gtAgg: 15, ya: { range: "1d", interval: "15m" }, hl: "15m" },
    { id: "1V", label: "1V", ms: 7 * 86400 * 1000, bn: "1h", bnLimit: 168, gt: "hour", gtAgg: 1, ya: { range: "5d", interval: "1h" }, hl: "1h" },
    { id: "1M", label: "1M", ms: 30 * 86400 * 1000, bn: "4h", bnLimit: 180, gt: "hour", gtAgg: 4, ya: { range: "1mo", interval: "1h" }, hl: "4h" }
  ];

  const BN_SPOT = {
    BTC: "BTCUSDT", WBTC: "BTCUSDT", CBBTC: "BTCUSDT",
    ETH: "ETHUSDT", WETH: "ETHUSDT",
    SOL: "SOLUSDT", WSOL: "SOLUSDT",
    DOGE: "DOGEUSDT", XRP: "XRPUSDT", ADA: "ADAUSDT", AVAX: "AVAXUSDT",
    LINK: "LINKUSDT", DOT: "DOTUSDT", LTC: "LTCUSDT", BNB: "BNBUSDT",
    SUI: "SUIUSDT", BONK: "BONKUSDT", WIF: "WIFUSDT", PEPE: "PEPEUSDT",
    PAXG: "PAXGUSDT", SHIB: "SHIBUSDT", UNI: "UNIUSDT", AAVE: "AAVEUSDT",
    NEAR: "NEARUSDT", APT: "APTUSDT", ARB: "ARBUSDT", OP: "OPUSDT",
    TON: "TONUSDT", TRX: "TRXUSDT", ATOM: "ATOMUSDT", FIL: "FILUSDT"
  };
  const CG_ID = {
    BTC: "bitcoin", ETH: "ethereum", SOL: "solana", DOGE: "dogecoin", XRP: "ripple",
    ADA: "cardano", AVAX: "avalanche-2", LINK: "chainlink", DOT: "polkadot",
    LTC: "litecoin", BNB: "binancecoin", SUI: "sui", WBTC: "wrapped-bitcoin",
    WETH: "weth", PAXG: "pax-gold", BONK: "bonk"
  };
  const YA_SYM = {
    GOLD: "GC=F", XAU: "GC=F", XAUUSD: "GC=F", PAXG: "PAXG-USD",
    SILVER: "SI=F", XAG: "SI=F", SLVX: "SI=F",
    CL: "CL=F", BRENTOIL: "BZ=F", HO: "HO=F",
    COPPER: "HG=F", NATGAS: "NG=F", PLATINUM: "PL=F", PALLADIUM: "PA=F",
    XYZ100: "NQ=F", SP500: "^GSPC", SPX: "^GSPC", JP225: "^N225",
    EUR: "EURUSD=X", GBPUSD: "GBPUSD=X", USDJPY: "USDJPY=X",
    EWY: "EWY", EWJ: "EWJ", URNM: "URNM", TLT: "TLT", EWZ: "EWZ",
    EWT: "EWT", SMH: "SMH", XLE: "XLE", SOXL: "SOXL"
  };

  function tfOf(id) {
    return TFS.find((t) => t.id === id) || TFS[1];
  }

  function isMint(v) {
    const s = String(v || "");
    return s.length >= 32 && s.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
  }

  function tickOf(asset) {
    const raw = String((asset && (asset.symbol || asset.market || asset.ticker)) || "").trim();
    return raw.replace(/[-\/]?(PERP|USD)?$/i, "").toUpperCase();
  }

  async function getJSON(url, opts) {
    opts = opts || {};
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeout || 8000);
    try {
      const r = await fetch(url, {
        signal: ctrl.signal,
        cache: "no-store",
        method: opts.method || "GET",
        headers: opts.headers || {},
        body: opts.body || undefined
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  function ptsFromCloses(times, closes) {
    const out = [];
    for (let i = 0; i < times.length; i++) {
      const p = closes[i];
      const t = times[i];
      if (p == null || !isFinite(+p) || t == null) continue;
      const ms = +t > 1e12 ? +t : +t * 1000;
      out.push({ t: ms, p: +p });
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  function sliceTf(pts, tf) {
    if (!pts || !pts.length) return [];
    const end = pts[pts.length - 1].t;
    const start = end - tf.ms;
    const cut = pts.filter((p) => p.t >= start);
    return cut.length >= 2 ? cut : pts.slice(-Math.max(2, Math.min(pts.length, 8)));
  }

  async function fromBinance(symbol, tf) {
    const pair = BN_SPOT[symbol];
    if (!pair) return null;
    const url = "https://api.binance.com/api/v3/klines?symbol=" + encodeURIComponent(pair) +
      "&interval=" + encodeURIComponent(tf.bn) + "&limit=" + encodeURIComponent(tf.bnLimit);
    const rows = await getJSON(url);
    if (!Array.isArray(rows) || rows.length < 2) return null;
    return rows.map((r) => ({ t: +r[0], p: +r[4] })).filter((p) => isFinite(p.p));
  }

  async function fromGeckoTerminal(mint, tf) {
    const url = "https://api.geckoterminal.com/api/v2/networks/solana/tokens/" +
      encodeURIComponent(mint) + "/ohlcv/" + tf.gt +
      "?aggregate=" + encodeURIComponent(tf.gtAgg) + "&limit=200&currency=usd";
    const data = await getJSON(url, { headers: { Accept: "application/json" } });
    const list = data && data.data && data.data.attributes && data.data.attributes.ohlcv_list;
    if (!Array.isArray(list) || list.length < 2) return null;
    return list.map((r) => ({ t: (+r[0]) * 1000, p: +r[4] })).filter((p) => isFinite(p.p) && p.t).sort((a, b) => a.t - b.t);
  }

  async function fromYahoo(symbol, tf) {
    const y = YA_SYM[symbol] || (/^[A-Z]{1,5}$/.test(symbol) ? symbol : null);
    if (!y) return null;
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(y) +
      "?interval=" + encodeURIComponent(tf.ya.interval) + "&range=" + encodeURIComponent(tf.ya.range);
    const data = await getJSON(url);
    const res = data && data.chart && data.chart.result && data.chart.result[0];
    if (!res || !res.timestamp) return null;
    const closes = (res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [];
    return ptsFromCloses(res.timestamp, closes);
  }

  async function fromHyperliquid(symbol, tf) {
    const end = Date.now();
    const start = end - tf.ms;
    const body = JSON.stringify({
      type: "candleSnapshot",
      req: { coin: symbol, interval: tf.hl, startTime: start, endTime: end }
    });
    const data = await getJSON("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    if (!Array.isArray(data) || data.length < 2) return null;
    return data.map((r) => ({ t: +(r.t || r.T), p: +(r.c || r.C) })).filter((p) => isFinite(p.p) && p.t);
  }

  function fromSnapSeries(asset, tf) {
    const api = global.DeskAPI;
    const snap = api && api._snap ? api._snap() : null;
    const series = (snap && snap.series) || {};
    const mint = asset && (asset.mint || asset.id);
    const sym = tickOf(asset);
    let pts = (mint && series[mint]) || (sym && series[sym]) || null;
    if ((!pts || pts.length < 2) && asset && asset.chart && asset.chart.length >= 2) pts = asset.chart;
    if (!pts || pts.length < 2) return null;
    return sliceTf(pts.map((p) => ({ t: +p.t, p: +p.p })).filter((p) => isFinite(p.p) && p.t), tf);
  }

  const cache = new Map();

  async function ohlcv(asset, tfId) {
    const tf = tfOf(tfId);
    const mint = asset && (isMint(asset.mint) ? asset.mint : (isMint(asset.id) ? asset.id : ""));
    const sym = tickOf(asset);
    const key = (mint || sym || "") + "|" + tf.id;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 60000) return hit.data;
    const tries = [];
    if (sym && BN_SPOT[sym]) tries.push(() => fromBinance(sym, tf));
    if (mint) tries.push(() => fromGeckoTerminal(mint, tf));
    if (sym && (YA_SYM[sym] || (asset && (asset.lane === "stocks" || asset.category === "equity" || asset.venue === "hyperliquid")))) {
      tries.push(() => fromYahoo(sym, tf));
      tries.push(() => fromHyperliquid(sym, tf));
    } else if (sym && YA_SYM[sym]) {
      tries.push(() => fromYahoo(sym, tf));
    }
    let pts = null;
    let source = "";
    for (const fn of tries) {
      try {
        const got = await fn();
        if (got && got.length >= 2) { pts = got; source = fn.name || "feed"; break; }
      } catch (_) {}
    }
    if (!pts) {
      pts = fromSnapSeries(asset, tf);
      if (pts) source = "desk";
    }
    if (pts && pts.length >= 2) pts = sliceTf(pts, tf);
    const data = { points: pts && pts.length >= 2 ? pts : [], source, tf: tf.id };
    cache.set(key, { at: Date.now(), data });
    return data;
  }

  async function tokenStats(mint) {
    if (!isMint(mint)) return null;
    const out = {};
    try {
      const data = await getJSON("https://api.dexscreener.com/latest/dex/tokens/" + encodeURIComponent(mint));
      const pairs = (data && data.pairs) || [];
      const best = pairs.slice().sort((a, b) => (+(b.liquidity && b.liquidity.usd) || 0) - (+(a.liquidity && a.liquidity.usd) || 0))[0];
      if (best) {
        out.price_usd = best.priceUsd != null ? +best.priceUsd : null;
        out.change_1h = best.priceChange && best.priceChange.h1 != null ? +best.priceChange.h1 : null;
        out.change_24h = best.priceChange && best.priceChange.h24 != null ? +best.priceChange.h24 : null;
        out.volume_24h = best.volume && best.volume.h24 != null ? +best.volume.h24 : null;
        out.liq_usd = best.liquidity && best.liquidity.usd != null ? +best.liquidity.usd : null;
        out.fdv_usd = best.fdv != null ? +best.fdv : null;
        out.mc_usd = best.marketCap != null ? +best.marketCap : (out.fdv_usd);
        out.name = (best.baseToken && best.baseToken.name) || out.name;
        out.symbol = (best.baseToken && best.baseToken.symbol) || out.symbol;
        out.pair = best.pairAddress || null;
        out.source = "dex";
      }
    } catch (_) {}
    try {
      const data = await getJSON("https://api.geckoterminal.com/api/v2/networks/solana/tokens/" + encodeURIComponent(mint), { headers: { Accept: "application/json" } });
      const a = data && data.data && data.data.attributes;
      if (a) {
        if (out.mc_usd == null && a.market_cap_usd != null) out.mc_usd = +a.market_cap_usd;
        if (out.fdv_usd == null && a.fdv_usd != null) out.fdv_usd = +a.fdv_usd;
        if (out.liq_usd == null && a.total_reserve_in_usd != null) out.liq_usd = +a.total_reserve_in_usd;
        if (out.volume_24h == null && a.volume_usd && a.volume_usd.h24 != null) out.volume_24h = +a.volume_usd.h24;
        if (a.holders && a.holders.count != null) out.holders = +a.holders.count;
        if (!out.name && a.name) out.name = a.name;
        if (!out.symbol && a.symbol) out.symbol = a.symbol;
      }
    } catch (_) {}
    return Object.keys(out).length ? out : null;
  }

  const DeskMarket = { ohlcv, tokenStats, TFS, tickOf, isMint, cgId: (sym) => CG_ID[String(sym || "").toUpperCase()] || null };

  function ui() { return global.DeskUI || {}; }

  function snap() {
    return (global.DeskAPI && global.DeskAPI._snap && global.DeskAPI._snap()) || {};
  }

  function coinLinks(c) {
    const mint = c && (isMint(c.mint) ? c.mint : "");
    const sym = tickOf(c);
    const api = global.DeskAPI;
    const ext = (api && api.assetLink) ? api.assetLink(c) : null;
    const out = [];
    if (mint) {
      out.push({ href: "https://dexscreener.com/solana/" + mint, label: "DexScreener" });
      out.push({ href: "https://birdeye.so/token/" + mint + "?chain=solana", label: "Birdeye" });
      out.push({ href: "https://solscan.io/token/" + mint, label: "Solscan" });
    }
    const cg = DeskMarket.cgId(sym);
    if (cg) out.push({ href: "https://www.coingecko.com/en/coins/" + cg, label: "CoinGecko" });
    else if (mint) out.push({ href: "https://www.geckoterminal.com/solana/tokens/" + mint, label: "GeckoTerminal" });
    if (ext && ext.url && ext.kind === "tradingview") out.push({ href: ext.url, label: "TradingView" });
    else if (ext && ext.url && !mint && ext.kind !== "dexscreener") out.push({ href: ext.url, label: ext.label || "TradingView" });
    else if (!mint && ext && ext.url) out.push({ href: ext.url, label: ext.label || "Öppna" });
    // de-dupe href
    const seen = new Set();
    return out.filter((x) => {
      if (!x.href || seen.has(x.href) || /solscan\.io\/account/.test(x.href)) return false;
      seen.add(x.href);
      return true;
    });
  }

  function markersFor(c, s) {
    const id = c && (c.mint || c.symbol);
    const sym = tickOf(c);
    const marks = (s && s.markers) || [];
    return marks.filter((m) => (id && (m.mint === id || m.mint === c.mint)) || (sym && String(m.symbol || "").toUpperCase() === sym));
  }

  function reasonsFor(c, s) {
    const marks = markersFor(c, s);
    const out = [];
    marks.forEach((m) => {
      if (m.reason) out.push({ ts: m.t, side: m.side, bot: m.bot, text: m.reason });
    });
    const dec = (s && s.decisions) || {};
    const mint = c && c.mint;
    const sym = tickOf(c);
    Object.keys(dec).forEach((bot) => {
      (dec[bot] || []).forEach((d) => {
        if ((mint && d.mint === mint) || (sym && String(d.symbol || "").toUpperCase() === sym)) {
          if (d.reason) out.push({ ts: d.ts, side: d.action, bot: bot, text: d.reason });
        }
      });
    });
    if (c && c.thesis) out.push({ ts: null, side: "thesis", bot: "brain", text: c.thesis });
    const seen = new Set();
    return out.filter((r) => {
      const k = (r.bot || "") + "|" + String(r.text || "").slice(0, 80);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 6);
  }

  function changeOf(pts) {
    if (!pts || pts.length < 2) return null;
    const a = pts[0].p, b = pts[pts.length - 1].p;
    if (!a) return null;
    return 100 * (b / a - 1);
  }

  const DeskCoin = {
    render(state) {
      const u = ui();
      const h = u.h, fmtUsd = u.fmtUsd, fmtPct = u.fmtPct, topbar = u.topbar;
      const pill = u.pillPaperOrLive, tokenAvatar = u.tokenAvatar, laneChip = u.laneChip;
      const laneOf = u.laneOf, chgClass = u.chgClass, pnlStack = u.pnlStack;
      const skeleton = u.skeleton, errorView = u.errorView, emptyView = u.emptyView;
      const ageLabel = u.ageLabel;
      if (state.loading && !state.coin) return `${topbar({ title: "Coin", back: "#/home" })}${skeleton()}`;
      if (state.error && !state.coin) return errorView(state.error, "#/home");
      const c = state.coin;
      if (!c) return errorView("Coinet hittades inte.", "#/home");
      const back = (u.backForCoin && u.backForCoin()) || { hash: "#/home", label: "Hem" };
      const mode = (state.desk && state.desk.mode) || "PAPER";
      const tf = state.coinTf || "1D";
      const chart = state.coinChart || {};
      const pts = chart.points || [];
      const scrub = state.coinScrub;
      const livePx = (scrub && scrub.price != null) ? scrub.price : (c.price_usd != null ? c.price_usd : (pts.length ? pts[pts.length - 1].p : null));
      const chg = (scrub && scrub.price != null && pts.length)
        ? (pts[0].p ? 100 * (scrub.price / pts[0].p - 1) : null)
        : (changeOf(pts) != null ? changeOf(pts) : (tf === "1H" ? c.change_1h : c.change_24h));
      const stats = Object.assign({}, c, state.coinStats || {});
      const pos = c.position;
      const links = coinLinks(c);
      const reasons = (c.reasons && c.reasons.length ? c.reasons : reasonsFor(c, snap()));
      const hasAny = !c.empty || pos || pts.length || stats.price_usd != null || links.length;
      if (c.empty && !hasAny) {
        return `${topbar({ title: c.symbol || "Coin", back: back.hash, backLabel: back.label, right: pill(mode) })}
        <div class="screen"><div class="page">
          ${emptyView("Ingen data än", "Det finns ingen detalj för den här coinen i senaste uppdateringen.")}
        </div></div>`;
      }
      const noChart = !pts || pts.length < 2;
      return `${topbar({ title: c.symbol || "Coin", back: back.hash, backLabel: back.label, right: pill(mode) })}
      <div class="screen"><div class="page coin-page">
        <div class="coin-head">
          ${tokenAvatar(c.symbol || stats.symbol, c.mint)}
          <div>
            <div class="sym">${h(c.symbol || stats.symbol || "Coin")}${laneChip(laneOf(c))}</div>
            <div class="name">${h(c.name || stats.name || "")}</div>
          </div>
        </div>
        <div class="coin-price nums" id="coin-px">${h(fmtUsd(livePx))}</div>
        <div class="chg ${chgClass(chg)} nums" id="coin-chg">${h(fmtPct(chg))} <span class="sub muted">${h(tf)}</span></div>
        <div class="coin-tf" data-role="coin-tf">
          ${TFS.map((t) => `<button type="button" class="tf-btn ${tf === t.id ? "on" : ""}" data-coin-tf="${t.id}">${t.label}</button>`).join("")}
        </div>
        <div class="chart-wrap coin-chart ${noChart ? "is-empty" : ""}" style="height:260px;margin:8px 0 4px"><canvas id="price-chart"></canvas></div>
        ${noChart ? `<div class="tiny" style="text-align:center;margin-bottom:10px">Ingen data för den här tidsperioden.</div>` : ""}

        ${pos ? `<div class="card">
          <div class="card-h">Öppen position</div>
          <div class="row"><div class="row-body"><div class="row-title">Värde</div></div><div class="row-meta nums">${h(fmtUsd(pos.value_usd || pos.size_usd, { exact: true }))}</div></div>
          <div class="row"><div class="row-body"><div class="row-title">Resultat</div></div><div class="row-meta">${pnlStack(pos.pnl_pct, pos.pnl_usd)}</div></div>
          <div class="row"><div class="row-body"><div class="row-title">Entry</div></div><div class="row-meta nums">${h(fmtUsd(pos.entry_usd))}</div></div>
          ${pos.stop_usd != null ? `<div class="row"><div class="row-body"><div class="row-title">Stop-loss</div></div><div class="row-meta nums">${h(fmtUsd(pos.stop_usd))}</div></div>` : ""}
          ${pos.tp_usd != null ? `<div class="row"><div class="row-body"><div class="row-title">Take-profit${pos.tp_done ? " · tagen" : ""}</div></div><div class="row-meta nums">${h(fmtUsd(pos.tp_usd))}</div></div>` : ""}
        </div>` : ""}

        <div class="stats">
          <div class="stat"><div class="k">Börsvärde</div><div class="v nums">${h(fmtUsd(stats.mc_usd))}</div></div>
          <div class="stat"><div class="k">FDV</div><div class="v nums">${h(fmtUsd(stats.fdv_usd))}</div></div>
          <div class="stat"><div class="k">Likviditet</div><div class="v nums">${h(fmtUsd(stats.liq_usd))}</div></div>
          <div class="stat"><div class="k">Volym 24h</div><div class="v nums">${h(fmtUsd(stats.volume_24h))}</div></div>
          <div class="stat"><div class="k">Ägare</div><div class="v nums">${h(stats.holders != null ? stats.holders : "—")}</div></div>
          <div class="stat"><div class="k">Ålder</div><div class="v">${h(ageLabel ? ageLabel(c.age_min) : "—")}</div></div>
        </div>

        ${reasons.length ? `<div class="card thesis">
          <div class="card-h">Botarnas motivering</div>
          ${reasons.map((r) => `<div class="who">${h((r.bot || "bot") + (r.side ? " · " + r.side : ""))}</div><p>${h(r.text)}</p>`).join("")}
        </div>` : (c.thesis ? `<div class="card thesis"><div class="who">Brain · varför</div><p>${h(c.thesis)}</p></div>` : "")}

        ${links.length ? `<div class="ext-links">${links.map((l) => `<a class="ext-link" href="${h(l.href)}" target="_blank" rel="noopener">${h(l.label)}</a>`).join("")}</div>` : ""}

        ${c.mint && isMint(c.mint) ? `<a class="row card" style="margin-top:8px" href="#/audit/${encodeURIComponent(c.mint)}" data-nav="#/audit/${encodeURIComponent(c.mint)}">
          <div class="row-body"><div class="row-title">Visa säkerhetskoll</div><div class="row-sub">Rapport med 8 kontroller</div></div>
          ${u.svg ? u.svg("chev") : ""}
        </a>` : ""}
      </div></div>`;
    },

    mount(state) {
      const canvas = document.getElementById("price-chart");
      if (!canvas || !global.DeskCharts || !DeskCharts.drawCoin) return;
      const c = state.coin || {};
      const pts = (state.coinChart && state.coinChart.points) || c.chart || [];
      const marks = c.markers && c.markers.length ? c.markers : markersFor(c, snap());
      DeskCharts.drawCoin(canvas, pts, {
        markers: marks,
        onScrub: (info) => {
          state.coinScrub = info;
          const px = document.getElementById("coin-px");
          const ch = document.getElementById("coin-chg");
          const u = ui();
          if (!px || !u.fmtUsd) return;
          if (!info) {
            const last = pts.length ? pts[pts.length - 1].p : c.price_usd;
            const chg = changeOf(pts);
            px.textContent = u.fmtUsd(last);
            if (ch) {
              ch.textContent = (u.fmtPct(chg) || "—") + " " + (state.coinTf || "1D");
              ch.className = "chg " + (u.chgClass ? u.chgClass(chg) : "") + " nums";
            }
            return;
          }
          px.textContent = u.fmtUsd(info.price);
          const chg = info.first ? 100 * (info.price / info.first - 1) : null;
          if (ch) {
            const when = info.t ? new Date(info.t).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "";
            ch.textContent = (u.fmtPct(chg) || "—") + " · " + when;
            ch.className = "chg " + (u.chgClass ? u.chgClass(chg) : "") + " nums";
          }
        }
      });
    },

    async loadChart(state) {
      const c = state.coin;
      if (!c) return;
      const tf = state.coinTf || "1D";
      try {
        const [chart, stats] = await Promise.all([
          DeskMarket.ohlcv({ mint: c.mint, symbol: c.symbol, id: c.mint, lane: c.lane, category: c.lane, venue: c.venue, chart: c.chart }, tf),
          isMint(c.mint) ? DeskMarket.tokenStats(c.mint).catch(() => null) : null
        ]);
        state.coinChart = chart;
        if (stats) {
          state.coinStats = stats;
          if (c.price_usd == null && stats.price_usd != null) c.price_usd = stats.price_usd;
          if (c.change_1h == null && stats.change_1h != null) c.change_1h = stats.change_1h;
          if (c.change_24h == null && stats.change_24h != null) c.change_24h = stats.change_24h;
          if (c.liq_usd == null) c.liq_usd = stats.liq_usd;
          if (c.volume_24h == null) c.volume_24h = stats.volume_24h;
          if (c.mc_usd == null) c.mc_usd = stats.mc_usd;
          if (c.fdv_usd == null) c.fdv_usd = stats.fdv_usd;
          if (c.holders == null && stats.holders != null) c.holders = stats.holders;
          if (!c.name && stats.name) c.name = stats.name;
        }
      } catch (_) {
        state.coinChart = { points: fromSnapSeries(c, tfOf(tf)) || c.chart || [], source: "desk", tf };
      }
    }
  };

  function laneName(id) {
    return ({ memecoin: "Memecoins", meme_test: "Meme-test", majors: "Större coins", gold: "Guld",
      commodities: "Råvaror", stocks: "Aktier", assets: "Tillgångar", global: "Alla" })[id] || id || "—";
  }

  const DeskPages = {
    renderTrades(state) {
      const u = ui();
      const h = u.h, fmtUsd = u.fmtUsd, fmtPct = u.fmtPct, topbar = u.topbar, pill = u.pillPaperOrLive;
      const chgClass = u.chgClass, emptyView = u.emptyView, tokenAvatar = u.tokenAvatar, laneChip = u.laneChip;
      const items = (snap().trades) || state.trades || [];
      const laneF = state.tradeLane || "all";
      const botF = state.tradeBot || "all";
      const lanes = ["all"].concat(Array.from(new Set(items.map((t) => t.lane).filter(Boolean))));
      const bots = ["all"].concat(Array.from(new Set(items.flatMap((t) => [t.entry_bot, t.exit_bot]).filter(Boolean))));
      const rows = items.filter((t) => (laneF === "all" || t.lane === laneF) && (botF === "all" || t.entry_bot === botF || t.exit_bot === botF));
      const hrefOf = (t) => (global.DeskAPI && DeskAPI.coinHref) ? DeskAPI.coinHref(t) : (t.mint ? "#/coin/" + encodeURIComponent(t.mint) : "");
      const when = (ts) => {
        if (!ts) return "";
        return new Date(ts).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      };
      return `${topbar({ title: "Affärer", back: "#/account", backLabel: "Mer", right: pill(state.desk && state.desk.mode) })}
      <div class="screen"><div class="page">
        <div class="filters">
          ${lanes.map((id) => `<button type="button" data-trade-lane="${h(id)}" class="${laneF === id ? "on" : ""}">${h(id === "all" ? "Alla spår" : laneName(id))}</button>`).join("")}
        </div>
        <div class="filters">
          ${bots.map((id) => `<button type="button" data-trade-bot="${h(id)}" class="${botF === id ? "on" : ""}">${h(id === "all" ? "Alla botar" : ((u.botMeta && u.botMeta(id).label) || id))}</button>`).join("")}
        </div>
        ${rows.length ? `<div class="card">${rows.map((t) => {
          const href = hrefOf(t);
          const tag = href ? "a" : "div";
          const nav = href ? ` href="${h(href)}" data-nav="${h(href)}"` : "";
          return `<${tag} class="row has-avatar trade-row"${nav}>
            ${tokenAvatar(t.symbol, t.mint)}
            <div class="row-body">
              <div class="row-title">${h(t.symbol)}${laneChip(t.lane)}</div>
              <div class="row-sub">${h(when(t.closed_at))}${t.entry_bot || t.exit_bot ? " · " + h([t.entry_bot, t.exit_bot].filter(Boolean).join(" → ")) : ""}</div>
              <div class="row-sub" style="white-space:normal;margin-top:4px">${t.entry_reason ? `<b>Köp:</b> ${h(t.entry_reason)} ` : ""}${t.exit_reason ? `<b>Sälj:</b> ${h(t.exit_reason)}` : ""}</div>
            </div>
            <div class="row-meta">
              <div class="asset-val nums ${chgClass(t.pnl_usd)}">${h(fmtUsd(t.pnl_usd, { exact: true }))}</div>
              <div class="tiny nums ${chgClass(t.pnl_pct)}">${h(fmtPct(t.pnl_pct))}</div>
            </div>
          </${tag}>`;
        }).join("")}</div>` : emptyView("Inga stängda affärer än", "När botarna stänger en trade syns den här med orsak och resultat.")}
      </div></div>`;
    },

    renderRanking(state) {
      const u = ui();
      const h = u.h, fmtUsd = u.fmtUsd, fmtPct = u.fmtPct, topbar = u.topbar, pill = u.pillPaperOrLive;
      const chgClass = u.chgClass, emptyView = u.emptyView, botMeta = u.botMeta;
      const items = (snap().ranking) || state.ranking || [];
      return `${topbar({ title: "Bot-ranking", back: "#/account", backLabel: "Mer", right: pill(state.desk && state.desk.mode) })}
      <div class="screen"><div class="page">
        <p class="rules-lead">Resultat från stängda affärer, fördelat 50/50 mellan boten som köpte och boten som sålde. Riktiga trades, inga påhittade siffror.</p>
        ${items.length ? `<div class="card">${items.map((r, i) => {
          const meta = botMeta ? botMeta(r.bot) : { label: r.label || r.bot, emoji: r.emoji || "🤖" };
          return `<a class="row" href="#/bots/${encodeURIComponent(r.bot)}" data-nav="#/bots/${encodeURIComponent(r.bot)}">
            <div class="rank-n nums">${h(r.medal || (i + 1))}</div>
            <div class="row-body">
              <div class="row-title">${h(meta.emoji || r.emoji || "")} ${h(meta.label || r.label || r.bot)}</div>
              <div class="row-sub">${h(r.trades || 0)} affärer · vinstandel ${h(r.win_rate != null ? r.win_rate + " %" : "—")}</div>
            </div>
            <div class="row-meta">
              <div class="asset-val nums ${chgClass(r.pnl_usd)}">${h(fmtUsd(r.pnl_usd, { exact: true }))}</div>
              <div class="tiny nums ${chgClass(r.pnl_pct)}">${h(fmtPct(r.pnl_pct))}</div>
            </div>
          </a>`;
        }).join("")}</div>` : emptyView("Ingen ranking än", "Ranking visas när botarna har stängt minst en trade.")}
      </div></div>`;
    },

    renderCalendar(state) {
      const u = ui();
      const h = u.h, fmtUsd = u.fmtUsd, fmtPct = u.fmtPct, topbar = u.topbar, pill = u.pillPaperOrLive;
      const emptyView = u.emptyView, chgClass = u.chgClass;
      const cal = snap().calendar || state.calendar || { days: [] };
      const days = cal.days || [];
      const byDate = {};
      days.forEach((d) => { if (d && d.date) byDate[d.date] = d; });
      const now = new Date();
      const cursor = state.calMonth || (now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"));
      const [yy, mm] = cursor.split("-").map(Number);
      const first = new Date(Date.UTC(yy, mm - 1, 1));
      // Monday-start weekday of the 1st in Stockholm: use UTC date constructor for calendar grid
      const startWd = (new Date(yy, mm - 1, 1).getDay() + 6) % 7;
      const dim = new Date(yy, mm, 0).getDate();
      const monthLabel = new Date(yy, mm - 1, 1).toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
      const prev = new Date(yy, mm - 2, 1);
      const next = new Date(yy, mm, 1);
      const prevId = prev.getFullYear() + "-" + String(prev.getMonth() + 1).padStart(2, "0");
      const nextId = next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0");
      const picked = state.calDay || null;
      const pickedRow = picked && byDate[picked];
      const cells = [];
      for (let i = 0; i < startWd; i++) cells.push({ empty: true });
      for (let d = 1; d <= dim; d++) {
        const id = yy + "-" + String(mm).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        const row = byDate[id];
        cells.push({ date: id, day: d, row });
      }
      const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.pnl_usd || 0)));
      const cellHtml = cells.map((c) => {
        if (c.empty) return `<div class="cal-cell empty"></div>`;
        const row = c.row;
        let cls = "cal-cell";
        let style = "";
        if (!row || row.pnl_usd == null) cls += " mute";
        else {
          const tone = row.pnl_usd >= 0 ? "up" : "down";
          const a = Math.min(1, Math.abs(row.pnl_usd) / maxAbs);
          const alpha = 0.18 + a * 0.72;
          cls += " " + tone + (picked === c.date ? " on" : "");
          style = ` style="background:rgba(${row.pnl_usd >= 0 ? "14,203,129" : "246,70,93"},${alpha.toFixed(2)})"`;
        }
        return `<button type="button" class="${cls}" data-cal-day="${c.date}"${style}><span class="d">${c.day}</span>${row && row.pnl_usd != null ? `<span class="v nums">${row.pnl_usd >= 0 ? "+" : ""}${Math.round(row.pnl_usd)}</span>` : ""}</button>`;
      }).join("");
      return `${topbar({ title: "PnL-kalender", back: "#/account", backLabel: "Mer", right: pill(state.desk && state.desk.mode) })}
      <div class="screen"><div class="page">
        <div class="cal-nav">
          <button type="button" class="btn-small" data-cal-month="${prevId}">‹</button>
          <div class="cal-month">${h(monthLabel)}</div>
          <button type="button" class="btn-small" data-cal-month="${nextId}">›</button>
        </div>
        ${days.length ? `<div class="cal-grid">
          ${["må", "ti", "on", "to", "fr", "lö", "sö"].map((d) => `<div class="cal-wd">${d}</div>`).join("")}
          ${cellHtml}
        </div>
        <div class="card" style="margin-top:12px">
          ${pickedRow ? `<div class="card-h">${h(picked)}</div>
            <div class="row"><div class="row-body"><div class="row-title">Dagens resultat</div></div><div class="row-meta nums ${chgClass(pickedRow.pnl_usd)}">${h(fmtUsd(pickedRow.pnl_usd, { exact: true }))} · ${h(fmtPct(pickedRow.pnl_pct))}</div></div>
            <div class="row"><div class="row-body"><div class="row-title">Eget kapital</div></div><div class="row-meta nums">${h(fmtUsd(pickedRow.equity, { exact: true }))}</div></div>`
            : `<div class="state" style="padding:18px 16px"><p>${picked ? "Ingen data för den dagen." : "Tryck på en dag för att se resultatet."}</p></div>`}
        </div>` : emptyView("Ingen kalender än", "Dagsresultat visas när deskens balans har minst en dags historik.")}
      </div></div>`;
    },

    renderLiveKrav(state) {
      const u = ui();
      const h = u.h, topbar = u.topbar, pill = u.pillPaperOrLive;
      const d = state.desk || {};
      const clock = (snap().paper_clock) || {};
      const step = (snap().step15) || {};
      const grad = d.graduation || snap().graduation || {};
      const days = clock.running_days != null ? clock.running_days : 0;
      const need = clock.required_days || 60;
      const left = clock.days_left != null ? clock.days_left : Math.max(0, need - days);
      const pct = Math.max(0, Math.min(100, (days / need) * 100));
      const laneNames = { memecoin: "Memecoins", meme_test: "Meme-test", majors: "Större coins", gold: "Guld", commodities: "Råvaror", stocks: "Aktier" };
      const items = step.items || [];
      const lanes = grad.lanes || [];
      return `${topbar({ title: "LIVE-krav", back: "#/account", backLabel: "Mer", right: pill(d.mode) })}
      <div class="screen"><div class="page">
        <div class="card live-clock">
          <div class="card-h">Nedräkning till LIVE</div>
          <div class="clock-days nums">${h(Math.floor(days))} <span>av ${h(need)} dagar</span></div>
          <div class="clock-sub">${clock.required_met ? "60-dagarsregeln är klar." : h(left.toFixed(1).replace(".", ",")) + " dagar kvar i PAPER."}</div>
          <div class="mood-lane-track"><span class="mood-lane-fill ${clock.required_met ? "up" : "warn"}" style="width:${pct}%"></span></div>
          <p class="tiny" style="margin-top:10px;line-height:1.4">Appens egen regel: minst ${h(need)} dagar i PAPER. Inget går live förrän varje spår klarar bevisen och du själv skriver LIVE.</p>
        </div>
        <div class="card">
          <div class="card-h">STEP 15</div>
          ${items.map((it) => `<div class="rule-check ${it.ok ? "ok" : ""}"><span class="mark">${it.ok ? "✓" : "○"}</span><span>${h(it.label || it.id)}${it.why ? `<div class="row-sub">${h(it.why)}</div>` : ""}</span></div>`).join("") || `<div class="state" style="padding:16px"><p>Ingen checklista just nu.</p></div>`}
        </div>
        <div class="card">
          <div class="card-h">Bevis per spår</div>
          ${lanes.map((ln) => {
            const name = laneNames[ln.id] || ln.id;
            const p = ln.progress_pct != null ? Math.round(ln.progress_pct) : 0;
            return `<div class="rule-item">
              <div class="row-title">${h(name)}${ln.eligible ? " · klart för LIVE" : ""}</div>
              <div class="row-sub">${h(p)} % av bevisen i PAPER</div>
              ${(ln.criteria || []).map((c) => `<div class="rule-check ${c.met ? "ok" : ""}"><span class="mark">${c.met ? "✓" : "○"}</span><span>${h(c.label || c.id)}</span></div>`).join("")}
            </div>`;
          }).join("") || `<div class="state" style="padding:16px"><p>Ingen spårstatus än.</p></div>`}
        </div>
      </div></div>`;
    },

    clockChip(state) {
      const u = ui();
      const h = u.h;
      const clock = (snap().paper_clock) || {};
      const days = clock.running_days != null ? clock.running_days : null;
      if (days == null) return "";
      const need = clock.required_days || 60;
      const left = clock.days_left != null ? clock.days_left : Math.max(0, need - days);
      const lab = clock.required_met
        ? `60 dagar klara · STEP 15 kvar`
        : `Dag ${Math.floor(days) + 1} av ${need} · ${String(left.toFixed(0))} kvar till LIVE`;
      return `<a class="live-chip" href="#/live-krav" data-nav="#/live-krav"><span class="t">LIVE</span><span class="s">${h(lab)}</span></a>`;
    }
  };

  global.DeskMarket = DeskMarket;
  global.DeskCoin = DeskCoin;
  global.DeskPages = DeskPages;
})(window);
