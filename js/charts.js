/* Hand-drawn charts on <canvas>. No libraries. */
(function (global) {
  const GREEN = "#30D158";
  const RED = "#FF453A";
  const GRID = "rgba(84,84,88,0.35)";
  const LABEL = "rgba(142,142,147,0.95)";

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

  function linePath(ctx, pts, x0, y0, x1, y1, key) {
    const { lo, hi } = minmax(pts, key);
    const n = pts.length;
    const path = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / Math.max(1, n - 1);
      const y = y1 - ((pts[i][key] - lo) / (hi - lo)) * (y1 - y0);
      path.push({ x, y });
    }
    return { path, lo, hi };
  }

  function strokeArea(ctx, path, x0, x1, y1, color, w, h) {
    if (path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.lineTo(path[path.length - 1].x, y1);
    ctx.lineTo(path[0].x, y1);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, y1);
    g.addColorStop(0, color.replace(")", ", 0.28)").replace("rgb", "rgba").replace("#", ""));
    // manual alpha fill
    const r = parseInt(color.slice(1, 3), 16);
    const gre = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const g2 = ctx.createLinearGradient(0, 0, 0, y1);
    g2.addColorStop(0, `rgba(${r},${gre},${b},0.28)`);
    g2.addColorStop(1, `rgba(${r},${gre},${b},0)`);
    ctx.fillStyle = g2;
    ctx.fill();
  }

  function grid(ctx, w, h, padL, padR, padT, padB, ticks) {
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 0.5;
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif";
    ctx.fillStyle = LABEL;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const innerH = h - padT - padB;
    for (let i = 0; i < ticks.length; i++) {
      const y = padT + (innerH * i) / (ticks.length - 1);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      if (ticks[i] != null) ctx.fillText(ticks[i], padL - 6, y);
    }
    ctx.restore();
  }

  function fmtTick(v, kind) {
    if (kind === "usd") {
      if (Math.abs(v) >= 10000) return "$" + (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
      if (Math.abs(v) >= 100) return "$" + Math.round(v).toLocaleString("en-US");
      if (Math.abs(v) >= 1) return "$" + v.toFixed(2);
      return "$" + v.toFixed(4);
    }
    if (Math.abs(v) >= 1) return v.toFixed(2);
    if (Math.abs(v) >= 0.01) return v.toFixed(4);
    return v.toPrecision(3);
  }

  function drawEquity(canvas, points) {
    if (!canvas) return;
    const { ctx, w, h } = setup(canvas);
    if (!points || points.length < 2) {
      ctx.fillStyle = LABEL;
      ctx.font = "13px -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No chart data", w / 2, h / 2);
      return;
    }
    const padL = 44, padR = 8, padT = 10, padB = 8;
    const { path, lo, hi } = linePath(ctx, points, padL, padT, w - padR, h - padB, "equity");
    const ticks = [];
    for (let i = 0; i < 4; i++) {
      const v = hi - ((hi - lo) * i) / 3;
      ticks.push(fmtTick(v, "usd"));
    }
    grid(ctx, w, h, padL, padR, padT, padB, ticks);
    const first = points[0].equity;
    const last = points[points.length - 1].equity;
    const color = last >= first ? GREEN : RED;
    strokeArea(ctx, path, padL, w - padR, h - padB, color, w, h);
    // end dot
    const end = path[path.length - 1];
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawPrice(canvas, points) {
    if (!canvas) return;
    const { ctx, w, h } = setup(canvas);
    if (!points || points.length < 2) {
      ctx.fillStyle = LABEL;
      ctx.font = "13px -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No chart data", w / 2, h / 2);
      return;
    }
    const padL = 52, padR = 8, padT = 10, padB = 8;
    const { path, lo, hi } = linePath(ctx, points, padL, padT, w - padR, h - padB, "p");
    const ticks = [];
    for (let i = 0; i < 4; i++) {
      const v = hi - ((hi - lo) * i) / 3;
      ticks.push(fmtTick(v, "px"));
    }
    grid(ctx, w, h, padL, padR, padT, padB, ticks);
    const first = points[0].p;
    const last = points[points.length - 1].p;
    const color = last >= first ? GREEN : RED;
    strokeArea(ctx, path, padL, w - padR, h - padB, color, w, h);
    const end = path[path.length - 1];
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  global.DeskCharts = { drawEquity, drawPrice };
})(window);
