/* Moneymaking G · roliga delar (svenska): ticker, humörmätare, vinstsvit, veckans bästa/sämsta, dagens coin-meme,
 * bot-chatten, topplista, märken, vibration + ka-ching vid ny vinst. Allt bygger på riktig data från /api/fun. */
(function (global) {
  const h = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usd = (n) => (n == null ? "—" : (n < 0 ? "−" : "") + "$" + Math.abs(n).toFixed(Math.abs(n) >= 100 ? 0 : 2));
  const sUsd = (n) => (n == null ? "—" : (n >= 0 ? "+" : "−") + "$" + Math.abs(n).toFixed(2));
  const pct = (n) => (n == null ? "—" : (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(1) + "%");
  const cls = (n) => (n > 0 ? "up" : n < 0 ? "down" : "flat");
  const reduced = () => global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } },
               set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };

  function price(p) { return p >= 1000 ? "$" + Math.round(p).toLocaleString("sv-SE") : p >= 1 ? "$" + p.toFixed(2) : "$" + p.toPrecision(3); }

  function ticker(items) {
    if (!items || !items.length) return "";
    const row = items.map((t) => `<span class="tk"><b>${h(t.symbol)}</b> ${h(price(t.price))} <span class="chg ${cls(t.change_24h)}">${h(pct(t.change_24h))}</span>${t.held ? " 💼" : ""}</span>`).join("");
    return `<div class="ticker" aria-label="Priser senaste 24 h"><div class="ticker-track${reduced() ? " still" : ""}">${row}${reduced() ? "" : row}</div></div>`;
  }

  function mood(m) {
    if (!m) return "";
    const pos = Math.max(2, Math.min(98, m.score));
    return `<div class="card fun-card"><div class="card-h">Marknadens humör</div>
      <div class="mood-row"><span class="mood-emoji">${h(m.emoji)}</span><div><b>${h(m.label)}</b> <span class="muted">${h(m.score)}/100</span>
      <div class="muted small">${h(m.explain)}</div></div></div>
      <div class="mood-bar"><span style="left:${pos}%"></span></div>
      <div class="mood-scale"><span>😱 rädd</span><span>😐 neutral</span><span>😎 glad</span><span>🤑 girig</span></div></div>`;
  }

  function streakChip(s) {
    if (!s) return "";
    return `<div class="streak">${s.current > 0 ? "🔥" : "🧊"} <b>${h(s.current)}</b> vinster i rad <span class="muted">· bästa: ${h(s.best)}</span></div>`;
  }

  function week(w) {
    if (!w || (!w.best && !w.worst)) return `<div class="card fun-card"><div class="card-h">Veckans bästa och sämsta trade</div><div class="muted small">Inga stängda affärer den här veckan än.</div></div>`;
    const one = (x, lab) => x ? `<a class="row" href="#/coin/${encodeURIComponent(x.mint)}" data-nav="#/coin/${encodeURIComponent(x.mint)}">
      <div class="row-body"><div class="row-title">${lab} ${h(x.symbol)}</div><div class="row-sub">${h(x.reason || "")}</div></div>
      <div class="row-meta"><div class="chg ${cls(x.pnl_usd)} nums">${h(sUsd(x.pnl_usd))}</div><div class="tiny">${h(pct(x.pnl_pct))}</div></div></a>` : "";
    return `<div class="card fun-card"><div class="card-h">Veckans bästa och sämsta trade</div>${one(w.best, "🏆")}${one(w.worst, "📉")}</div>`;
  }

  function meme(m) {
    if (!m) return "";
    return `<div class="card fun-card meme"><div class="card-h">Dagens coin-meme</div><div class="meme-text">${h(m.text)}</div></div>`;
  }

  function chat(list, max) {
    const items = (list || []).slice(-(max || 12));
    if (!items.length) return `<div class="card fun-card"><div class="card-h">Bot-chatten</div><div class="muted small">Botarna är tysta än – här pratar de när något händer.</div></div>`;
    return `<div class="card fun-card"><div class="card-h">Bot-chatten</div><div class="chat">${items.map((c) =>
      `<div class="msg"><span class="av" title="${h(c.label)}">${h(c.emoji)}</span><div class="bubble"><div class="who">${h(c.label)}</div>${h(c.text)}</div></div>`).join("")}</div></div>`;
  }

  function leaderboard(list, period) {
    const tabs = [["idag", "Idag"], ["vecka", "Vecka"], ["allt", "Allt"]];
    const rows = (list || []).map((b, i) => `<div class="row"><span class="lb-rank">${b.medal || i + 1}</span><span class="av">${h(b.emoji)}</span>
      <div class="row-body"><div class="row-title">${h(b.label)}</div><div class="row-sub">${h(b.trades)} affärer · ${h(b.win_rate)}% vinster</div></div>
      <div class="row-meta"><div class="chg ${cls(b.pnl_usd)} nums">${h(sUsd(b.pnl_usd))}</div><div class="tiny">${h(pct(b.pnl_pct))}</div></div></div>`).join("");
    return `<div class="card-h group-h">Topplista</div>
      <div class="segments" data-role="lb-period">${tabs.map(([id, l]) => `<button data-lb="${id}" class="${period === id ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="card">${rows || `<div class="row"><div class="row-body"><div class="row-sub">Ingen bot har stängt någon affär under perioden än.</div></div></div>`}</div>
      <p class="muted small" style="margin:4px 4px 12px">Så räknas det: resultatet av varje sälj delas lika mellan boten som köpte och boten som sålde.</p>`;
  }

  function badges(list, mode) {
    if (!list) return "";
    return `<div class="card-h group-h">Märken <span class="pill pill-muted">${h(mode || "PAPER")}</span></div><div class="card badge-shelf">${list.map((b) =>
      `<div class="badge ${b.unlocked ? "on" : ""}" title="${h(b.desc)}"><div class="be">${b.unlocked ? h(b.emoji) : "🔒"}</div><div class="bn">${h(b.name)}</div><div class="bd">${h(b.desc)}</div></div>`).join("")}</div>`;
  }

  function soundToggle() {
    const on = LS.get("mmg_sound", "on") === "on";
    return `<div class="row"><div class="row-body"><div class="row-title">Ljud vid vinst</div><div class="row-sub">Ett kort ka-ching när en affär går med plus</div></div>
      <button class="btn btn-small" data-sound-toggle>${on ? "🔊 På" : "🔇 Av"}</button></div>`;
  }

  function laneGauge(L) {
    if (!L || !L.health) return "";
    const H = L.health, s = H.split || {};
    const bar = (lab, v, col) => `<div class="lh-row"><span class="lh-l">${lab}</span><div class="lh-bar"><span style="width:${Math.max(2, Math.min(100, v))}%;background:${col}"></span></div><span class="lh-v nums">${Math.round(v)}</span></div>`;
    return `<div class="card fun-card"><div class="card-h">Memecoins mot större coins</div>
      ${bar("🐸 Memecoins", H.memecoin, "#FF9F0A")}${bar("🏦 Större coins", H.majors, "#0A84FF")}
      <div class="muted small" style="margin-top:6px">${h(H.verdict)}. Hälsa 0–100, senaste ${h(H.window_days || 10)} dagarna.</div>
      <div class="small" style="margin-top:4px">Fördelning nu: memecoins ${h(s.memecoin)}% · större coins ${h(s.majors)}% · reserv ${h(s.reserve)}%</div></div>`;
  }

  function laneHistory(L) {
    if (!L) return "";
    const rows = (L.history || []).map((r, i) => `<div class="row"><div class="row-body">
        <div class="row-title">${h(r.from_meme)}/${h(r.from_majors)} → ${h(r.to_meme)}/${h(r.to_majors)} ${r.kind === "undo" ? "↩️" : "🔄"}</div>
        <div class="row-sub">${h(r.reason)} · ${h(String(r.ts).slice(0, 10))}${r.undone_at ? " · ångrad" : ""}</div></div>
        ${i === 0 && r.kind === "auto" && !r.undone_at ? `<button class="btn btn-small" data-lane-undo="${h(r.id)}">Ångra</button>` : ""}</div>`).join("");
    return `<div class="card-h group-h">Fördelning</div><div class="card">${rows || `<div class="row"><div class="row-body"><div class="row-sub">Botarna har inte flyttat några pengar mellan spåren än. De gör det själva om memecoins går svagt (eller starkt) flera dagar i rad – max 10 procentenheter åt gången, högst var tredje dag.</div></div></div>`}</div>`;
  }

  // ---- effects ----
  let audio = null, unlocked = false;
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    try { audio = new Audio("sounds/kaching.wav"); audio.preload = "auto"; audio.volume = 0.7; audio.load(); } catch (_) {}
  }
  ["touchstart", "click", "keydown"].forEach((ev) => global.addEventListener(ev, unlockAudio, { once: true, passive: true }));

  function celebrate(win) {
    if (navigator.vibrate) { try { navigator.vibrate([60, 40, 120]); } catch (_) {} }  // iOS Safari saknar vibrate -> bara ljud + toast
    if (LS.get("mmg_sound", "on") === "on" && audio && unlocked) { try { audio.currentTime = 0; audio.play().catch(() => {}); } catch (_) {} }
    if (global.DeskToast) global.DeskToast(`🎉 Vinst! ${win.symbol} ${sUsd(win.pnl_usd)}`);
  }

  // fire once per NEW win: first load only remembers the latest id
  function checkWins(wins) {
    if (!wins) return;
    const top = wins.length ? wins[0].id : 0;
    const seen = Number(LS.get("mmg_last_win", "-1"));
    if (seen < 0) { LS.set("mmg_last_win", String(top)); return; }
    const fresh = wins.filter((w) => w.id > seen);
    if (fresh.length) { LS.set("mmg_last_win", String(top)); celebrate(fresh[0]); }
  }

  function checkBadges(list) {
    if (!list) return;
    const seen = new Set(JSON.parse(LS.get("mmg_badges", "null") || "null") || []);
    const first = LS.get("mmg_badges", null) == null;
    const on = list.filter((b) => b.unlocked).map((b) => b.id);
    LS.set("mmg_badges", JSON.stringify(on));
    if (first) return;
    const fresh = list.filter((b) => b.unlocked && !seen.has(b.id));
    if (fresh.length && global.DeskToast) global.DeskToast(`🏅 Nytt märke: ${fresh[0].emoji} ${fresh[0].name}`);
  }

  global.DeskFun = { laneGauge, laneHistory, ticker, mood, streakChip, week, meme, chat, leaderboard, badges, soundToggle, checkWins, checkBadges, celebrate,
                     toggleSound() { LS.set("mmg_sound", LS.get("mmg_sound", "on") === "on" ? "off" : "on"); } };
})(window);
