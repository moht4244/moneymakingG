/* Hand-drawn charts on <canvas>. Points are placed by real timestamps (no fake smoothing). */
(function (global) {
  const GREEN = "#30D158";
  const RED = "#FF453A";
  const GRID = "rgba(84,84,88,0.35)";
  const LABEL = "rgba(142,142,147,0.95)";
  const TZ = "Europe/Stockholm";
  const SV = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
  const MON = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

  function cssSize(canvas) {
    const w = canvas.clientWidth || canvas.width || 320;
    const h = canvas.clientHeight || canvas.height || 160;
    return { w, h };
  }

  function setup(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const { w, h } = cssSize(canvas);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function minmax(points, key) {
    let lo = Infinity, hi = -Infinity;
    for (const p of points) {
      const v = p[key];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!isFinite(lo) || !isFinite(hi)) return { lo: 0, hi: 1 };
    if (lo === hi) {
      const pad = Math.abs(lo) * 0.04 || 1;
      return { lo: lo - pad, hi: hi + pad };
    }
    const pad = (hi - lo) * 0.12;
    return { lo: lo - pad, hi: hi + pad };
  }

  function tOf(p, i, n) {
    if (p && p.t != null) return +p.t;
    return i;
  }

  /* Place each point on the x-axis by its timestamp so uneven gaps stay honest. */
  function linePath(pts, x0, y0, x1, y1, key) {
    const { lo, hi } = minmax(pts, key);
    const n = pts.length;
    const t0 = tOf(pts[0], 0, n);
    const t1 = tOf(pts[n - 1], n - 1, n);
    const span = Math.max(1, t1 - t0);
    const path = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + ((tOf(pts[i], i, n) - t0) / span) * (x1 - x0);
      const y = y1 - ((pts[i][key] - lo) / (hi - lo)) * (y1 - y0);
      path.push({ x, y, i });
    }
    return { path, lo, hi, t0, t1 };
  }

  function strokeArea(ctx, path, y1, color) {
    if (path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y); // straight segments, never a bezier
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "miter";
    ctx.miterLimit = 2;
    ctx.lineCap = "butt";
    ctx.stroke();

    ctx.lineTo(path[path.length - 1].x, y1);
    ctx.lineTo(path[0].x, y1);
    ctx.closePath();
    const r = parseInt(color.slice(1, 3), 16);
    const gre = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const g2 = ctx.createLinearGradient(0, 0, 0, y1);
    g2.addColorStop(0, `rgba(${r},${gre},${b},0.22)`);
    g2.addColorStop(1, `rgba(${r},${gre},${b},0)`);
    ctx.fillStyle = g2;
    ctx.fill();
  }

  function fmtTick(v, kind) {
    if (kind === "usd") {
      if (Math.abs(v) >= 10000) return "$" + (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
      if (Math.abs(v) >= 100) return "$" + Math.round(v).toLocaleString("sv-SE");
      if (Math.abs(v) >= 1) return "$" + v.toFixed(2);
      return "$" + v.toFixed(4);
    }
    if (Math.abs(v) >= 1) return v.toFixed(2);
    if (Math.abs(v) >= 0.01) return v.toFixed(4);
    return v.toPrecision(3);
  }

  function parts(ms) {
    const d = new Date(ms);
    const f = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false
    });
    const o = {};
    for (const p of f.formatToParts(d)) o[p.type] = p.value;
    o.monthName = MON[(Number(o.month) || 1) - 1];
    return o;
  }

  function fmtTimeLabel(ms, span) {
    const p = parts(ms);
    if (span <= 36 * 3600 * 1000) return p.hour + ":" + p.minute;
    if (span <= 10 * 24 * 3600 * 1000) return (p.weekday || "").replace(".", "") + " " + p.day;
    if (span <= 45 * 24 * 3600 * 1000) return p.day + " " + p.monthName;
    return p.monthName + " " + p.year;
  }

  function fmtTipTime(ms, span) {
    const p = parts(ms);
    if (span <= 36 * 3600 * 1000) return p.hour + ":" + p.minute;
    return (p.weekday || "").replace(".", "") + " " + p.day + " " + p.monthName + " " + p.hour + ":" + p.minute;
  }

  function xTicks(t0, t1, n) {
    const span = Math.max(1, t1 - t0);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = t0 + (span * i) / (n - 1);
      out.push({ t, label: fmtTimeLabel(t, span) });
    }
    // de-dupe identical labels
    return out.filter((x, i, a) => i === 0 || x.label !== a[i - 1].label);
  }

  function grid(ctx, w, h, padL, padR, padT, padB, yTicks, xLabels) {
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 0.5;
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif";
    ctx.fillStyle = LABEL;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const innerH = h - padT - padB;
    const innerW = w - padL - padR;
    for (let i = 0; i < yTicks.length; i++) {
      const y = padT + (innerH * i) / Math.max(1, yTicks.length - 1);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      if (yTicks[i] != null) ctx.fillText(yTicks[i], padL - 6, y);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    (xLabels || []).forEach((lab, i, a) => {
      const x = padL + (innerW * i) / Math.max(1, a.length - 1);
      if (i === 0) ctx.textAlign = "left";
      else if (i === a.length - 1) ctx.textAlign = "right";
      else ctx.textAlign = "center";
      ctx.fillText(lab.label, x, h - padB + 4);
    });
    ctx.restore();
  }

  function ensureTip(canvas) {
    const wrap = canvas.parentElement;
    if (!wrap) return null;
    let tip = wrap.querySelector(".chart-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tip";
      wrap.appendChild(tip);
    }
    return tip;
  }

  function bindTip(canvas, pts, path, key, kind, t0, t1) {
    const tip = ensureTip(canvas);
    if (!tip) return;
    const span = Math.max(1, t1 - t0);
    const find = (ev) => {
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left;
      let best = 0, bd = Infinity;
      for (let i = 0; i < path.length; i++) {
        const d = Math.abs(path[i].x - x);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };
    const show = (ev) => {
      if (!pts.length) return;
      const i = find(ev);
      const p = pts[i];
      const pt = path[i];
      const r = canvas.getBoundingClientRect();
      tip.innerHTML = `<b>${fmtTick(p[key], kind)}</b><span>${fmtTipTime(tOf(p, i, pts.length), span)}</span>`;
      tip.classList.add("on");
      const left = Math.max(8, Math.min(r.width - 8, pt.x));
      tip.style.left = left + "px";
      tip.style.top = Math.max(8, pt.y - 8) + "px";
    };
    const hide = () => tip.classList.remove("on");
    if (canvas._chartOff) canvas._chartOff();
    canvas.addEventListener("pointerdown", show);
    canvas.addEventListener("pointermove", show);
    canvas.addEventListener("pointerleave", hide);
    canvas.addEventListener("pointerup", hide);
    canvas._chartOff = () => {
      canvas.removeEventListener("pointerdown", show);
      canvas.removeEventListener("pointermove", show);
      canvas.removeEventListener("pointerleave", hide);
      canvas.removeEventListener("pointerup", hide);
    };
  }

  function draw(canvas, points, key, kind) {
    if (!canvas) return;
    const { ctx, w, h } = setup(canvas);
    if (!points || points.length < 2) {
      ctx.fillStyle = LABEL;
      ctx.font = "13px -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Ingen graf än", w / 2, h / 2);
      return;
    }
    const padL = kind === "usd" ? 44 : 52, padR = 10, padT = 10, padB = 22;
    const { path, lo, hi, t0, t1 } = linePath(points, padL, padT, w - padR, h - padB, key);
    const yTicks = [];
    for (let i = 0; i < 4; i++) yTicks.push(fmtTick(hi - ((hi - lo) * i) / 3, kind));
    grid(ctx, w, h, padL, padR, padT, padB, yTicks, xTicks(t0, t1, 4));
    const first = points[0][key];
    const last = points[points.length - 1][key];
    const color = last >= first ? GREEN : RED;
    strokeArea(ctx, path, h - padB, color);
    const end = path[path.length - 1];
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    bindTip(canvas, points, path, key, kind, t0, t1);
  }

  function drawEquity(canvas, points) { draw(canvas, points, "equity", "usd"); }
  function drawPrice(canvas, points) { draw(canvas, points, "p", "px"); }

  const COIN_GREEN = "#0ECB81";
  const COIN_RED = "#F6465D";

  function drawCoin(canvas, points, opts) {
    if (!canvas) return;
    opts = opts || {};
    const key = opts.key || "p";
    const markers = (opts.markers || []).filter((m) => m && m.t != null && isFinite(+m.t));
    const onScrub = typeof opts.onScrub === "function" ? opts.onScrub : null;
    const { ctx, w, h } = setup(canvas);
    const empty = !points || points.length < 2;
    if (empty) {
      ctx.fillStyle = LABEL;
      ctx.font = "14px -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Ingen data", w / 2, h / 2);
      if (canvas._chartOff) canvas._chartOff();
      if (onScrub) onScrub(null);
      return;
    }
    const padL = 8, padR = 12, padT = 16, padB = 24;
    const { path, lo, hi, t0, t1 } = linePath(points, padL, padT, w - padR, h - padB, key);
    const first = points[0][key];
    const last = points[points.length - 1][key];
    const up = last >= first;
    const color = up ? COIN_GREEN : COIN_RED;
    // light time labels only (Phantom-style: no heavy price axis)
    grid(ctx, w, h, padL, padR, padT, padB, [null, null, null, null], xTicks(t0, t1, 4));
    strokeArea(ctx, path, h - padB, color);
    const end = path[path.length - 1];
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const span = Math.max(1, t1 - t0);
    const markPts = [];
    markers.forEach((m) => {
      const t = +m.t;
      if (t < t0 - span * 0.02 || t > t1 + span * 0.02) return;
      const x = padL + ((t - t0) / span) * (w - padR - padL);
      // place y on the path if possible, else at price
      let y = null;
      if (m.price != null && isFinite(+m.price) && hi !== lo) {
        y = (h - padB) - ((+m.price - lo) / (hi - lo)) * ((h - padB) - padT);
      }
      if (y == null) {
        let best = 0, bd = Infinity;
        for (let i = 0; i < path.length; i++) {
          const d = Math.abs(tOf(points[i], i, points.length) - t);
          if (d < bd) { bd = d; best = i; }
        }
        y = path[best].y;
      }
      const buy = String(m.side || "").toLowerCase() === "buy";
      const mc = buy ? COIN_GREEN : COIN_RED;
      ctx.beginPath();
      if (buy) {
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x - 5.5, y + 3);
        ctx.lineTo(x + 5.5, y + 3);
      } else {
        ctx.moveTo(x, y + 7);
        ctx.lineTo(x - 5.5, y - 3);
        ctx.lineTo(x + 5.5, y - 3);
      }
      ctx.closePath();
      ctx.fillStyle = mc;
      ctx.fill();
      ctx.strokeStyle = "rgba(11,14,17,0.7)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      markPts.push({ x, y, m });
    });

    const tip = ensureTip(canvas);
    const find = (ev) => {
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left;
      let best = 0, bd = Infinity;
      for (let i = 0; i < path.length; i++) {
        const d = Math.abs(path[i].x - x);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };
    const nearMark = (x) => {
      let best = null, bd = 14;
      for (const mp of markPts) {
        const d = Math.abs(mp.x - x);
        if (d < bd) { bd = d; best = mp.m; }
      }
      return best;
    };
    const clearXhair = () => {
      // redraw without hair: cheap full redraw is fine for these series sizes
    };
    const show = (ev) => {
      const i = find(ev);
      const p = points[i];
      const pt = path[i];
      const r = canvas.getBoundingClientRect();
      const mk = nearMark(pt.x);
      const price = p[key];
      const when = fmtTipTime(tOf(p, i, points.length), span);
      if (tip) {
        let html = `<b>${fmtTick(price, "usd")}</b><span>${when}</span>`;
        if (mk) {
          const lab = String(mk.side).toLowerCase() === "buy" ? "Köp" : "Sälj";
          html += `<span>${lab}${mk.bot ? " · " + mk.bot : ""}${mk.reason ? " · " + String(mk.reason).slice(0, 80) : ""}</span>`;
        }
        tip.innerHTML = html;
        tip.classList.add("on");
        tip.style.left = Math.max(8, Math.min(r.width - 8, pt.x)) + "px";
        tip.style.top = Math.max(8, pt.y - 8) + "px";
      }
      // vertical hair
      const { ctx: c2, w: w2, h: h2 } = setup(canvas);
      grid(c2, w2, h2, padL, padR, padT, padB, [null, null, null, null], xTicks(t0, t1, 4));
      strokeArea(c2, path, h2 - padB, color);
      c2.beginPath();
      c2.arc(end.x, end.y, 3.4, 0, Math.PI * 2);
      c2.fillStyle = color;
      c2.fill();
      markPts.forEach((mp) => {
        const buy = String(mp.m.side || "").toLowerCase() === "buy";
        const mc = buy ? COIN_GREEN : COIN_RED;
        c2.beginPath();
        if (buy) {
          c2.moveTo(mp.x, mp.y - 7);
          c2.lineTo(mp.x - 5.5, mp.y + 3);
          c2.lineTo(mp.x + 5.5, mp.y + 3);
        } else {
          c2.moveTo(mp.x, mp.y + 7);
          c2.lineTo(mp.x - 5.5, mp.y - 3);
          c2.lineTo(mp.x + 5.5, mp.y - 3);
        }
        c2.closePath();
        c2.fillStyle = mc;
        c2.fill();
      });
      c2.save();
      c2.strokeStyle = "rgba(234,236,239,0.55)";
      c2.lineWidth = 1;
      c2.setLineDash([3, 3]);
      c2.beginPath();
      c2.moveTo(pt.x, padT);
      c2.lineTo(pt.x, h2 - padB);
      c2.stroke();
      c2.beginPath();
      c2.moveTo(padL, pt.y);
      c2.lineTo(w2 - padR, pt.y);
      c2.stroke();
      c2.restore();
      c2.beginPath();
      c2.arc(pt.x, pt.y, 4.2, 0, Math.PI * 2);
      c2.fillStyle = "#EAECEF";
      c2.fill();
      c2.beginPath();
      c2.arc(pt.x, pt.y, 2.4, 0, Math.PI * 2);
      c2.fillStyle = color;
      c2.fill();
      if (onScrub) onScrub({ price, t: tOf(p, i, points.length), marker: mk, first, last });
    };
    const hide = () => {
      if (tip) tip.classList.remove("on");
      // restore unscoped chart
      const keep = onScrub;
      const o = Object.assign({}, opts, { onScrub: null });
      // redraw base (avoid recursion via onScrub)
      const { ctx: c2, w: w2, h: h2 } = setup(canvas);
      grid(c2, w2, h2, padL, padR, padT, padB, [null, null, null, null], xTicks(t0, t1, 4));
      strokeArea(c2, path, h2 - padB, color);
      c2.beginPath();
      c2.arc(end.x, end.y, 3.4, 0, Math.PI * 2);
      c2.fillStyle = color;
      c2.fill();
      markPts.forEach((mp) => {
        const buy = String(mp.m.side || "").toLowerCase() === "buy";
        const mc = buy ? COIN_GREEN : COIN_RED;
        c2.beginPath();
        if (buy) {
          c2.moveTo(mp.x, mp.y - 7);
          c2.lineTo(mp.x - 5.5, mp.y + 3);
          c2.lineTo(mp.x + 5.5, mp.y + 3);
        } else {
          c2.moveTo(mp.x, mp.y + 7);
          c2.lineTo(mp.x - 5.5, mp.y - 3);
          c2.lineTo(mp.x + 5.5, mp.y - 3);
        }
        c2.closePath();
        c2.fillStyle = mc;
        c2.fill();
      });
      if (keep) keep(null);
    };
    if (canvas._chartOff) canvas._chartOff();
    canvas.addEventListener("pointerdown", show);
    canvas.addEventListener("pointermove", show);
    canvas.addEventListener("pointerleave", hide);
    canvas.addEventListener("pointerup", hide);
    canvas._chartOff = () => {
      canvas.removeEventListener("pointerdown", show);
      canvas.removeEventListener("pointermove", show);
      canvas.removeEventListener("pointerleave", hide);
      canvas.removeEventListener("pointerup", hide);
    };
  }

  global.DeskCharts = { drawEquity, drawPrice, drawCoin };
})(window);
