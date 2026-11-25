/* ==========================================================================
   Math · CS · AI Atlas — interactive map
   No build step. Plain ES module.
   ========================================================================== */

const DOMAINS = [
  { id: "math", name: "纯数学", en: "Pure Mathematics" },
  { id: "cs", name: "计算机科学", en: "Computer Science" },
  { id: "ai", name: "人工智能", en: "Artificial Intelligence" },
];
const DOMAIN = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
const STAGES = ["初等基础", "语言与思维", "本科核心", "基础支柱", "经典分支", "桥梁学科", "高级核心", "统一框架", "研究前沿"];
const TYPE = { course: "课程级知识", practice: "实践与规范", tool: "工具与环境", frontier: "研究前沿" };
const STATUS = { draft: "草稿", validated: "已校验", reviewed: "已审阅", published: "已发布" };
const TEMPLATE_SUMMARY = /的课程级知识模块，关注核心概念、典型方法、前置依赖与后续研究方向/;
const STORE_MASTERY = "atlas.mastery.v1";
const STORE_INTRO = "atlas.intro.v1";
const STORE_LANE = "atlas.lane.v1";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clean = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const storage = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
};

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */
const S = {
  nodes: [], byId: new Map(), children: new Map(), clusters: new Map(), paths: {}, curricula: {},
  pageByNode: new Map(), pageCache: new Map(),
  mode: "explore", selected: null, hovered: null, layer: "",
  route: { target: null, preset: null, steps: [], playing: false, timer: null },
  mastered: new Set(),
  cam: { x: 0, y: 0, s: 1 },
  L: null, // layout
  mobile: false, lane: "math",
  els: new Map(), capEls: [],
  anim: null,
};

const el = {
  body: document.body,
  viewport: $("#viewport"), world: $("#world"), nodes: $("#nodes"), edges: $("#edges"), bands: $("#bands"), axis: $("#axis"),
  lanesHead: $("#lanesHead"), laneSwitch: $("#laneSwitch"),
  altWindow: $("#altWindow"), altTicks: $("#altTicks"),
  drawer: $("#drawer"), drawerBody: $("#drawerBody"),
  tooltip: $("#tooltip"), toast: $("#toast"), hint: $("#mapHint"),
  palette: $("#palette"), paletteInput: $("#paletteInput"), paletteList: $("#paletteList"),
  routePanel: $("#routePanel"), minePanel: $("#minePanel"),
  layerSelect: $("#layerSelect"),
  intro: $("#intro"),
};

/* --------------------------------------------------------------------------
   Data
   -------------------------------------------------------------------------- */
async function loadData() {
  const [catalog, manifest] = await Promise.all([
    fetch("./data/catalog.json").then((r) => { if (!r.ok) throw new Error(`catalog ${r.status}`); return r.json(); }),
    fetch("./content/manifest.json").then((r) => (r.ok ? r.json() : { pages: [] })).catch(() => ({ pages: [] })),
  ]);
  S.nodes = catalog.nodes;
  S.paths = catalog.paths || {};
  S.curricula = catalog.curricula || {};
  for (const c of catalog.clusters) S.clusters.set(c.id, c);
  for (const n of S.nodes) { S.byId.set(n.id, n); S.children.set(n.id, []); }
  for (const n of S.nodes) for (const p of n.prerequisites || []) S.children.get(p)?.push(n.id);
  const byTitle = new Map(S.nodes.map((n) => [clean(n.title), n]));
  for (const page of manifest.pages || []) {
    const hit = [page.title, ...(page.aliases || [])].map((t) => byTitle.get(clean(t))).find(Boolean);
    if (hit) S.pageByNode.set(hit.id, page);
  }
  S.mastered = new Set((storage.get(STORE_MASTERY, {}).mastered || []).filter((id) => S.byId.has(id)));
}

function ancestors(id, acc = new Set()) {
  for (const p of S.byId.get(id)?.prerequisites || []) if (!acc.has(p)) { acc.add(p); ancestors(p, acc); }
  return acc;
}
const ancMemo = new Map();
function ancestorsMemo(id) { if (!ancMemo.has(id)) ancMemo.set(id, ancestors(id)); return ancMemo.get(id); }
/* Edge child→pre is redundant when pre is already reachable through another prerequisite of child. */
function isImplied(child, pre) {
  for (const q of S.byId.get(child)?.prerequisites || []) if (q !== pre && ancestorsMemo(q).has(pre)) return true;
  return false;
}
function descendants(id, acc = new Set()) {
  for (const c of S.children.get(id) || []) if (!acc.has(c)) { acc.add(c); descendants(c, acc); }
  return acc;
}
function depthMap(start, next) {
  const depth = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    for (const n of next(id)) if (!depth.has(n)) { depth.set(n, depth.get(id) + 1); queue.push(n); }
  }
  return depth;
}
const isTemplated = (n) => TEMPLATE_SUMMARY.test(n.summary || "");

/* --------------------------------------------------------------------------
   Layout — one shared vertical scale (L0 bottom → L8 top), one lane per domain
   -------------------------------------------------------------------------- */
const measureCtx = document.createElement("canvas").getContext("2d");
function textWidth(text, font) { measureCtx.font = font; return measureCtx.measureText(text).width; }

function computeLayout() {
  const vw = innerWidth;
  S.mobile = vw <= 860;
  const lanes = S.mobile ? [S.lane] : DOMAINS.map((d) => d.id);
  const axisW = S.mobile ? 66 : 148;
  const gap = S.mobile ? 0 : 52;
  const laneW = S.mobile ? Math.max(260, vw - axisW - 12) : 404;
  const rightPad = S.mobile ? 12 : 92;
  const NODE_H = 30, NODE_GAP = 8, ROW_GAP = 10, CAP_H = 18, CAP_GAP = 8, GROUP_GAP = 18, PAD_TOP = 40, PAD_BOTTOM = 34, MIN_H = 104;
  const fontFamily = getComputedStyle(document.body).getPropertyValue("--font-sans");
  const font = `500 13px ${fontFamily}`;

  const laneX = new Map(lanes.map((d, i) => [d, axisW + i * (laneW + gap)]));
  const pos = new Map();
  const caps = [];
  const stageH = new Array(9).fill(MIN_H);
  const cells = []; // relative layouts, y filled later

  for (let s = 0; s <= 8; s++) {
    let tallest = 0;
    for (const d of lanes) {
      const x0 = laneX.get(d);
      const members = S.nodes.filter((n) => n.domain === d && n.stage === s);
      if (!members.length) continue;
      const groups = new Map();
      for (const n of members) { if (!groups.has(n.cluster)) groups.set(n.cluster, []); groups.get(n.cluster).push(n); }
      const ordered = [...groups.entries()].sort((a, b) => (S.clusters.get(a[0])?.order ?? 99) - (S.clusters.get(b[0])?.order ?? 99));
      let y = 0;
      for (const [cid, list] of ordered) {
        // barycentre of already-placed prerequisites keeps dependency edges short
        const bary = (n) => {
          const xs = (n.prerequisites || []).map((p) => pos.get(p)).filter(Boolean).map((p) => p.x + p.w / 2);
          return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Infinity;
        };
        list.sort((a, b) => bary(a) - bary(b) || a.title.localeCompare(b.title, "zh-CN"));
        caps.push({ text: S.clusters.get(cid)?.title || cid, x: x0, ry: y, stage: s, domain: d });
        y += CAP_H + CAP_GAP;
        let x = 0;
        for (const n of list) {
          let w = Math.ceil(textWidth(n.title, font)) + 26;
          if (n.type === "frontier") w += 14;
          if (S.pageByNode.has(n.id)) w += 9;
          w = Math.max(48, Math.min(w, laneW));
          if (x > 0 && x + w > laneW) { x = 0; y += NODE_H + ROW_GAP; }
          pos.set(n.id, { x: x0 + x, ry: y, w, h: NODE_H, stage: s, domain: d });
          x += w + NODE_GAP;
        }
        y += NODE_H + GROUP_GAP;
      }
      tallest = Math.max(tallest, y - GROUP_GAP);
      cells.push({ s, d });
    }
    stageH[s] = Math.max(MIN_H, tallest + PAD_TOP + PAD_BOTTOM);
  }

  const TOP_MARGIN = 24, BOTTOM_MARGIN = 48;
  const stageTop = new Array(9);
  let acc = TOP_MARGIN;
  for (let s = 8; s >= 0; s--) { stageTop[s] = acc; acc += stageH[s]; }
  const height = acc + BOTTOM_MARGIN;
  const width = axisW + lanes.length * laneW + (lanes.length - 1) * gap + rightPad;
  for (const p of pos.values()) p.y = stageTop[p.stage] + PAD_TOP + p.ry;
  for (const c of caps) c.y = stageTop[c.stage] + PAD_TOP + c.ry;

  S.L = { lanes, laneX, laneW, axisW, width, height, stageTop, stageH, pos, caps, PAD_TOP };
}

/* --------------------------------------------------------------------------
   Render (DOM is built once; layout only moves things)
   -------------------------------------------------------------------------- */
function buildNodes() {
  const frag = document.createDocumentFragment();
  for (const n of S.nodes) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `node t-${n.type || "course"}`;
    b.dataset.id = n.id;
    b.dataset.d = n.domain;
    b.setAttribute("aria-label", `${n.title}，${DOMAIN[n.domain].name}，第 ${n.stage} 阶段 ${STAGES[n.stage]}，${TYPE[n.type] || "知识节点"}${S.pageByNode.has(n.id) ? "，已有知识页" : ""}`);
    b.innerHTML = `<span class="nt">${esc(n.title)}</span>${S.pageByNode.has(n.id) ? '<i class="pg" aria-hidden="true"></i>' : ""}`;
    S.els.set(n.id, b);
    frag.append(b);
  }
  el.nodes.append(frag);
}

function placeAll() {
  const { pos, width, height, stageTop, stageH, caps } = S.L;
  el.world.style.width = `${width}px`;
  el.world.style.height = `${height}px`;
  el.edges.setAttribute("width", width);
  el.edges.setAttribute("height", height);
  el.edges.setAttribute("viewBox", `0 0 ${width} ${height}`);

  for (const n of S.nodes) {
    const b = S.els.get(n.id);
    const p = pos.get(n.id);
    if (!p) { b.hidden = true; continue; }
    b.hidden = false;
    b.style.transform = "";
    b.style.left = `${p.x}px`;
    b.style.top = `${p.y}px`;
    b.style.width = `${p.w}px`;
  }

  for (const c of S.capEls) c.remove();
  S.capEls = caps.map((c) => {
    const d = document.createElement("div");
    d.className = "cap";
    d.textContent = c.text;
    d.style.left = `${c.x}px`;
    d.style.top = `${c.y}px`;
    d.dataset.stage = c.stage;
    el.nodes.append(d);
    return d;
  });

  el.bands.innerHTML = stageTop.map((t, s) => `<div class="band${s % 2 ? " alt" : ""}" data-stage="${s}" style="top:${t}px;height:${stageH[s]}px"></div>`).join("");

  // axis labels
  const counts = new Array(9).fill(0);
  for (const n of S.nodes) if (pos.has(n.id)) counts[n.stage]++;
  el.axis.innerHTML = STAGES.map((name, s) => `<div class="axis-stage" data-stage="${s}"><span class="ax-num"><sup>L</sup>${s}</span><span class="ax-name">${name}</span><span class="ax-count">${counts[s]} 个节点</span></div>`).join("");

  // lane headers
  el.lanesHead.innerHTML = S.L.lanes.map((d) => {
    const total = S.nodes.filter((n) => n.domain === d).length;
    const written = S.nodes.filter((n) => n.domain === d && S.pageByNode.has(n.id)).length;
    return `<button class="lane-head" data-d="${d}" type="button" title="聚焦${DOMAIN[d].name}"><span class="lh-name">${DOMAIN[d].name}</span><span class="lh-en">${DOMAIN[d].en}</span><span class="lh-count"><b>${total}</b> 节点 · ${written} 篇知识页</span></button>`;
  }).join("");

  // altimeter ticks
  el.altTicks.innerHTML = STAGES.map((name, s) => {
    const mid = (stageTop[s] + stageH[s] / 2) / height;
    return `<li style="top:${(mid * 100).toFixed(2)}%"><button type="button" data-stage="${s}" title="L${s} ${name}">${s}</button></li>`;
  }).join("");

  // mobile lane switch
  el.laneSwitch.innerHTML = DOMAINS.map((d) => `<button type="button" role="tab" data-lane="${d.id}" aria-selected="${d.id === S.lane}"><i class="dot ${d.id}"></i>${d.name}<span class="mono">${S.nodes.filter((n) => n.domain === d.id).length}</span></button>`).join("");

  refreshStates();
}

/* --------------------------------------------------------------------------
   Camera
   -------------------------------------------------------------------------- */
function insets() {
  const top = S.mobile ? 112 : 124;
  const right = S.mobile ? 0 : (el.drawer.classList.contains("is-open") ? 480 : 64);
  const left = !S.mobile && S.mode !== "explore" ? 372 : 0;
  const sheet = S.mobile && (el.drawer.classList.contains("is-open") ? el.drawer : S.mode !== "explore" ? (S.mode === "route" ? el.routePanel : el.minePanel) : null);
  const bottom = sheet ? sheet.offsetHeight || innerHeight * 0.6 : 0;
  return { top, right, left, bottom };
}

function clampCam(c) {
  const { width, height } = S.L;
  const vw = innerWidth, vh = innerHeight;
  const ins = insets();
  const w = width * c.s, h = height * c.s;
  const fit = (pos, lo, hi, size) => {
    const min = hi - size - 40, max = lo + 40;
    return min > max ? (lo + hi - size) / 2 : clamp(pos, min, max);
  };
  return { x: fit(c.x, ins.left, vw - ins.right, w), y: fit(c.y, ins.top, vh - ins.bottom, h), s: c.s };
}

function applyCam() {
  const { x, y, s } = S.cam;
  el.world.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  el.world.style.setProperty("--s", s);
  const far = s < 0.5;
  if (far !== el.world.classList.contains("lod-far")) { el.world.classList.toggle("lod-far", far); queueMicrotask(() => refreshStates({ animateEdges: false })); }
  el.world.classList.toggle("lod-mid", s >= 0.5 && s < 0.78);
  updateChrome();
}

function setCam(c, { animate = false, duration = 700 } = {}) {
  const target = clampCam(c);
  cancelAnimationFrame(S.anim);
  if (!animate || prefersReducedMotion()) { S.cam = target; applyCam(); return; }
  const from = { ...S.cam };
  const t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    const k = ease(t);
    S.cam = { x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k, s: from.s + (target.s - from.s) * k };
    applyCam();
    if (t < 1) S.anim = requestAnimationFrame(step);
  };
  S.anim = requestAnimationFrame(step);
}

function zoomAt(factor, sx, sy, opts) {
  hideHint();
  const s = clamp(S.cam.s * factor, minScale(), 1.8);
  const k = s / S.cam.s;
  setCam({ x: sx - (sx - S.cam.x) * k, y: sy - (sy - S.cam.y) * k, s }, opts);
}
function minScale() {
  const ins = insets();
  return Math.min(0.9, Math.max(0.12, Math.min((innerHeight - ins.top - 24) / S.L.height, (innerWidth - 40) / S.L.width)));
}
function fitWidthScale() {
  const ins = insets();
  return Math.min(1, (innerWidth - ins.left - ins.right - 8) / S.L.width);
}
function homeCam() {
  const s = fitWidthScale();
  return { x: 0, y: innerHeight - S.L.height * s - 8, s };
}
function overviewCam() {
  const s = minScale();
  return { x: (innerWidth - S.L.width * s) / 2, y: insets().top, s };
}
function flyToNode(id, { scale, duration = 750, force = false } = {}) {
  const p = S.L.pos.get(id);
  if (!p) return;
  const s = scale ?? Math.max(S.cam.s, Math.min(1, fitWidthScale()));
  const ins = insets();
  const vw = innerWidth, vh = innerHeight;
  const sx = S.cam.x + (p.x + p.w / 2) * S.cam.s, sy = S.cam.y + (p.y + p.h / 2) * S.cam.s;
  const comfy = sx > ins.left + 80 && sx < vw - ins.right - 80 && sy > ins.top + 60 && sy < vh - ins.bottom - 80 && Math.abs(s - S.cam.s) < 0.01;
  if (comfy && !force) return;
  const cx = ins.left + (vw - ins.left - ins.right) * 0.5;
  const cy = ins.top + (vh - ins.top - ins.bottom) * 0.45;
  setCam({ x: cx - (p.x + p.w / 2) * s, y: cy - (p.y + p.h / 2) * s, s }, { animate: true, duration });
}
function flyToStage(stage) {
  const { stageTop, stageH } = S.L;
  const s = S.cam.s;
  const ins = insets();
  const mid = stageTop[stage] + stageH[stage] / 2;
  setCam({ x: S.cam.x, y: ins.top + (innerHeight - ins.top) / 2 - mid * s, s }, { animate: true, duration: 800 });
}

/* Chrome that follows the camera: axis labels, lane headers, altimeter */
function updateChrome() {
  const { x, y, s } = S.cam;
  const { stageTop, stageH, height, laneX, laneW } = S.L;
  const ins = insets();
  const vh = innerHeight;
  const centerLine = ins.top + (vh - ins.top - ins.bottom) * 0.5;
  let current = 0;
  $$(".axis-stage", el.axis).forEach((node) => {
    const st = +node.dataset.stage;
    const top = y + stageTop[st] * s;
    const bottom = top + stageH[st] * s;
    const bandPx = stageH[st] * s;
    node.classList.toggle("is-compact", bandPx < 120);
    node.classList.toggle("is-tiny", bandPx < 62);
    const labelH = bandPx < 62 ? 22 : bandPx < 120 ? 40 : 84;
    const ty = clamp(top + (bandPx < 62 ? (bandPx - labelH) / 2 : 16), ins.top + 10, Math.max(top, bottom - labelH - 8));
    node.style.transform = `translate3d(0, ${ty}px, 0)`;
    node.style.opacity = bottom < ins.top + 30 || top > vh ? 0 : 1;
    if (top <= centerLine && bottom > centerLine) current = st;
  });
  $$(".axis-stage", el.axis).forEach((node) => node.classList.toggle("is-current", +node.dataset.stage === current));
  $$(".alt-ticks button", el.altTicks).forEach((b) => b.classList.toggle("is-current", +b.dataset.stage === current));

  $$(".lane-head", el.lanesHead).forEach((h) => {
    const lx = laneX.get(h.dataset.d);
    h.style.left = `${x + lx * s}px`;
    h.style.width = `${laneW * s}px`;
    h.classList.toggle("is-compact", laneW * s < 300);
    h.classList.toggle("is-tiny", laneW * s < 110);
  });

  const top = clamp((ins.top - y) / (height * s), 0, 1);
  const bottom = clamp((vh - y) / (height * s), 0, 1);
  el.altWindow.style.top = `${top * 100}%`;
  el.altWindow.style.height = `${Math.max(4, (bottom - top) * 100)}%`;
}

/* --------------------------------------------------------------------------
   Edges
   -------------------------------------------------------------------------- */
function edgeD(childId, preId) {
  const a = S.L.pos.get(childId), b = S.L.pos.get(preId);
  if (!a || !b) return null;
  const ax = a.x + a.w / 2, bx = b.x + b.w / 2;
  if (b.y >= a.y + a.h + 2) {
    const y1 = a.y + a.h, y2 = b.y, dy = Math.max(26, (y2 - y1) * 0.5);
    return { d: `M${ax} ${y1}C${ax} ${y1 + dy} ${bx} ${y2 - dy} ${bx} ${y2}`, ex: bx, ey: y2 };
  }
  if (Math.abs(b.y - a.y) < 4) {
    const lift = 22 + Math.abs(bx - ax) * 0.12;
    return { d: `M${ax} ${a.y}C${ax} ${a.y - lift} ${bx} ${b.y - lift} ${bx} ${b.y}`, ex: bx, ey: b.y };
  }
  const y1 = a.y, y2 = b.y + b.h, dy = Math.max(20, (y1 - y2) * 0.5);
  return { d: `M${ax} ${y1}C${ax} ${y1 - dy} ${bx} ${y2 + dy} ${bx} ${y2}`, ex: bx, ey: y2 };
}

function drawEdges(list, { animate = true } = {}) {
  // list: [{child, pre, cls, delay}]
  const parts = [];
  for (const e of list) {
    const g = edgeD(e.child, e.pre);
    if (!g) continue;
    const color = e.color ? ` style="--c:${e.color}"` : "";
    parts.push(`<path class="e ${e.cls}${animate && !prefersReducedMotion() ? " draw" : ""}" data-delay="${e.delay || 0}" d="${g.d}"${color}/>`);
    if (e.cls !== "web") parts.push(`<circle class="end" cx="${g.ex}" cy="${g.ey}" r="${2.4}"/>`);
  }
  el.edges.innerHTML = parts.join("");
  if (animate && !prefersReducedMotion()) {
    $$("path.draw", el.edges).forEach((p) => {
      p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 2);
      p.style.setProperty("--delay", `${p.dataset.delay}s`);
    });
  }
}

/* --------------------------------------------------------------------------
   States
   -------------------------------------------------------------------------- */
function availableSet() {
  const out = new Set();
  for (const n of S.nodes) {
    if (S.mastered.has(n.id)) continue;
    if ((n.prerequisites || []).every((p) => S.mastered.has(p))) out.add(n.id);
  }
  return out;
}

function refreshStates({ animateEdges = true } = {}) {
  const sel = S.selected;
  const anc = sel ? ancestors(sel) : null;
  const desc = sel ? descendants(sel) : null;
  const layerSet = S.layer ? new Set(S.curricula[S.layer]?.nodes || []) : null;
  const avail = S.mode === "mine" ? availableSet() : null;
  const route = S.mode === "route" && S.route.steps.length ? S.route : null;
  const stepIndex = route ? new Map(route.steps.map((id, i) => [id, i + 1])) : null;

  el.body.classList.toggle("has-layer", !!layerSet && !sel && !route && S.mode === "explore");
  el.body.classList.toggle("mode-mine", S.mode === "mine");

  let ringI = 0;
  for (const n of S.nodes) {
    const b = S.els.get(n.id);
    const c = b.classList;
    c.toggle("is-sel", n.id === sel);
    c.toggle("is-anc", !!anc?.has(n.id));
    c.toggle("is-desc", !!desc?.has(n.id));
    c.toggle("is-dim", (!!sel && n.id !== sel && !anc.has(n.id) && !desc.has(n.id)) || (!!route && !stepIndex.has(n.id) && n.id !== sel));
    c.toggle("in-layer", !!layerSet?.has(n.id));
    c.toggle("is-mastered", S.mode === "mine" && S.mastered.has(n.id));
    const av = !!avail?.has(n.id);
    c.toggle("is-available", av);
    if (av) b.style.setProperty("--ring-delay", `${(ringI++ % 7) * 0.35}s`);
    c.toggle("is-route", !!stepIndex?.has(n.id));
    c.toggle("is-route-target", !!route && route.target === n.id);
    if (stepIndex?.has(n.id)) b.dataset.step = stepIndex.get(n.id); else delete b.dataset.step;
    if (!route) c.remove("is-route-lit");
  }

  // edges
  const edges = [];
  if (sel) {
    const dAnc = depthMap(sel, (id) => S.byId.get(id).prerequisites || []);
    const closure = new Set([sel, ...anc]);
    for (const id of closure) for (const p of S.byId.get(id).prerequisites || []) if (closure.has(p) && !isImplied(id, p)) edges.push({ child: id, pre: p, cls: "anc", delay: Math.min(1.2, (dAnc.get(id) || 0) * 0.14) });
    const dDesc = depthMap(sel, (id) => S.children.get(id) || []);
    const dclosure = new Set([sel, ...desc]);
    const color = `var(--${S.byId.get(sel).domain})`;
    // successors: only the next two steps get drawn; the rest of the closure is highlighted without lines
    for (const id of desc) if ((dDesc.get(id) || 0) <= 2) for (const p of S.byId.get(id).prerequisites || []) if (dclosure.has(p) && (dDesc.get(p) ?? 0) < (dDesc.get(id) || 0) && !isImplied(id, p)) edges.push({ child: id, pre: p, cls: "desc", color, delay: 0.25 + (dDesc.get(id) || 0) * 0.12 });
  } else if (route) {
    const set = new Set(route.steps);
    for (const id of route.steps) for (const p of S.byId.get(id).prerequisites || []) if (set.has(p) && !isImplied(id, p)) edges.push({ child: id, pre: p, cls: "route", delay: Math.min(1.4, (stepIndex.get(id) || 0) * 0.04) });
  } else if (el.world.classList.contains("lod-far") && !S.hovered) {
    // overview: the whole dependency web, faint
    for (const n of S.nodes) if (S.L.pos.has(n.id)) for (const p of n.prerequisites || []) if (S.L.pos.has(p)) edges.push({ child: n.id, pre: p, cls: "web" });
  } else if (S.hovered && S.L.pos.has(S.hovered)) {
    const id = S.hovered;
    for (const p of S.byId.get(id).prerequisites || []) edges.push({ child: id, pre: p, cls: "hover" });
    for (const c of S.children.get(id) || []) edges.push({ child: c, pre: id, cls: "hover" });
  }
  drawEdges(edges, { animate: animateEdges && !S.hovered });
}

/* --------------------------------------------------------------------------
   Selection & drawer
   -------------------------------------------------------------------------- */
function select(id, { fly = true, updateUrl = true } = {}) {
  if (id && !S.byId.has(id)) return;
  hideHint();
  S.selected = id;
  S.hovered = null;
  if (id) {
    const n = S.byId.get(id);
    if (S.mobile && n.domain !== S.lane) switchLane(n.domain, { keepSelection: true });
    openDrawer(id);
  } else closeDrawer();
  refreshStates();
  if (id && fly) flyToNode(id);
  if (updateUrl) {
    const url = new URL(location.href);
    if (id) url.searchParams.set("node", id); else url.searchParams.delete("node");
    history.replaceState(null, "", url);
  }
}

function chip(id) {
  const n = S.byId.get(id);
  if (!n) return "";
  return `<button class="chip" type="button" data-go="${n.id}"><i class="dot ${n.domain}"></i>${esc(n.title)}<span class="mono" style="color:var(--ink-3);font-size:10px">L${n.stage}</span></button>`;
}

async function pageData(id) {
  const entry = S.pageByNode.get(id);
  if (!entry) return null;
  if (S.pageCache.has(id)) return S.pageCache.get(id);
  const p = fetch(entry.path).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  S.pageCache.set(id, p);
  return p;
}

function openDrawer(id) {
  const n = S.byId.get(id);
  const cluster = S.clusters.get(n.cluster);
  const page = S.pageByNode.get(id);
  const next = S.children.get(id) || [];
  const mastered = S.mastered.has(id);
  const summary = isTemplated(n) ? "" : n.summary;
  const link = `./knowledge.html?id=${encodeURIComponent(n.id)}`;
  el.drawer.style.setProperty("--c", `var(--${n.domain})`);
  el.drawerBody.innerHTML = `
    <div class="d-eyebrow"><span class="d-dom"><i class="dot ${n.domain}"></i>${DOMAIN[n.domain].name}</span><span class="mono">L${n.stage} · ${STAGES[n.stage]}</span><span>${TYPE[n.type] || "知识节点"}</span></div>
    <h2 id="drawerTitle" class="d-title">${esc(n.title)}</h2>
    <p class="d-cluster">${esc(cluster?.title || "")}</p>
    <p class="d-summary" id="drawerSummary"${summary ? "" : " hidden"}>${esc(summary)}</p>
    ${page
      ? `<div class="d-tier is-written"><span class="tier-mark">✓</span><div><b>${esc(page.tier || "标准页")} · <span id="drawerStatus">草稿</span></b><br />已有学习目标、章节、练习与一手来源。</div></div>`
      : `<div class="d-tier"><span class="tier-mark">…</span><div><b>基础页</b><br />正文尚未撰写，目前只显示图谱结构与依赖。</div></div>`}
    <section class="d-section"><h3>核心内容 <span class="mono">${(n.topics || []).length}</span></h3>
      ${(n.topics || []).length ? `<ul class="d-topics">${n.topics.map((t, i) => `<li><span class="mono">${String(i + 1).padStart(2, "0")}</span>${esc(t)}</li>`).join("")}</ul>` : `<p class="d-empty">尚未整理。</p>`}
    </section>
    <section class="d-section"><h3>必要前置 <span class="mono">${(n.prerequisites || []).length}</span></h3>
      ${(n.prerequisites || []).length ? `<div class="chip-row">${n.prerequisites.map(chip).join("")}</div>` : `<p class="d-empty">没有必要前置，可以直接开始。</p>`}
    </section>
    ${(n.recommended || []).length ? `<section class="d-section"><h3>推荐关联 <span class="mono">${n.recommended.length}</span></h3><div class="chip-row">${n.recommended.map(chip).join("")}</div></section>` : ""}
    <section class="d-section"><h3>可继续进入 <span class="mono">${next.length}</span></h3>
      ${next.length ? `<div class="chip-row">${next.map(chip).join("")}</div>` : `<p class="d-empty">这是当前地图上的一个终点。</p>`}
    </section>
    <div class="d-actions">
      <a class="btn btn-ink btn-primary" href="${link}">打开知识页 <span class="btn-arrow" aria-hidden="true">→</span></a>
      <button class="btn btn-ghost btn-sm" type="button" data-act="route">规划到这里</button>
      <button class="btn btn-ghost btn-sm${mastered ? " is-on" : ""}" type="button" data-act="master" aria-pressed="${mastered}">${mastered ? "✓ 已掌握" : "标记已掌握"}</button>
    </div>`;
  el.drawerBody.scrollTop = 0;
  if (!el.drawer.classList.contains("is-open")) {
    el.drawer.classList.add("is-open");
    el.drawer.setAttribute("aria-hidden", "false");
  }
  if (page) pageData(id).then((data) => {
    if (S.selected !== id || !data) return;
    const st = $("#drawerStatus");
    if (st) st.textContent = STATUS[data.status] || data.status;
    if (!summary && data.summary) { const p = $("#drawerSummary"); p.textContent = data.summary; p.hidden = false; }
  });
}

function closeDrawer() {
  el.drawer.classList.remove("is-open");
  el.drawer.setAttribute("aria-hidden", "true");
}

/* --------------------------------------------------------------------------
   Modes
   -------------------------------------------------------------------------- */
function setMode(mode) {
  if (S.mode === mode) return;
  stopRoute();
  S.mode = mode;
  $$(".mode").forEach((b) => { const on = b.dataset.mode === mode; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
  moveModeThumb();
  el.body.classList.toggle("has-panel", mode !== "explore");
  el.routePanel.hidden = mode !== "route";
  el.minePanel.hidden = mode !== "mine";
  if (mode !== "explore") { S.selected = null; closeDrawer(); }
  if (mode === "route") renderRoutePanel();
  if (mode === "mine") renderMinePanel();
  refreshStates();
  const cam = { ...S.cam };
  if (!S.mobile && mode !== "explore") cam.x = Math.max(cam.x, insets().left + 116 - S.L.axisW * cam.s);
  setCam(cam, { animate: true, duration: 600 });
}
function moveModeThumb() {
  const active = $(".mode.is-active");
  const thumb = $(".mode-thumb");
  if (!active || !thumb) return;
  thumb.style.width = `${active.offsetWidth}px`;
  thumb.style.transform = `translateX(${active.offsetLeft - 4}px)`;
}

/* Route ------------------------------------------------------------------ */
function computeRoute(target) {
  const known = new Set(S.mastered);
  for (const m of S.mastered) for (const a of ancestors(m)) known.add(a);
  const need = new Set([target, ...ancestors(target)].filter((id) => !known.has(id)));
  // Kahn's algorithm, lower stages first, then domain order math → cs → ai
  const order = [];
  const indeg = new Map([...need].map((id) => [id, (S.byId.get(id).prerequisites || []).filter((p) => need.has(p)).length]));
  const rank = (id) => { const n = S.byId.get(id); return n.stage * 10 + ["math", "cs", "ai"].indexOf(n.domain); };
  let ready = [...need].filter((id) => indeg.get(id) === 0);
  while (ready.length) {
    ready.sort((a, b) => rank(a) - rank(b));
    const id = ready.shift();
    order.push(id);
    for (const c of S.children.get(id) || []) if (need.has(c)) { indeg.set(c, indeg.get(c) - 1); if (indeg.get(c) === 0) ready.push(c); }
  }
  return order;
}

function setRouteTarget(id, { preset = null } = {}) {
  stopRoute();
  if (S.mode !== "route") { S.mode = "explore"; setMode("route"); }
  if (preset) {
    S.route = { target: S.paths[preset].nodes.at(-1), preset, steps: [...S.paths[preset].nodes], playing: false, timer: null };
  } else {
    S.route = { target: id, preset: null, steps: computeRoute(id), playing: false, timer: null };
  }
  S.selected = null;
  closeDrawer();
  renderRoutePanel();
  refreshStates();
  const first = S.route.steps[0];
  if (first) flyToNode(first, { force: true });
}

function renderRoutePanel() {
  const presets = $("#routePresets");
  const cards = Object.entries(S.paths).map(([key, p]) => `
    <button class="preset${S.route.preset === key ? " is-active" : ""}" type="button" data-preset="${key}">
      <b>${esc(p.title)}</b><span class="mono">${p.nodes.length} 步</span>
      <span class="preset-dots">${p.nodes.map((id) => `<i data-d="${S.byId.get(id)?.domain}"></i>`).join("")}</span>
    </button>`).join("");
  const active = S.route.steps.length || S.route.target;
  presets.innerHTML = active
    ? `<details class="presets-fold"><summary>换一条示例路线 <span class="mono" aria-hidden="true">+</span></summary><div class="route-presets-inner">${cards}</div></details>`
    : `<div class="route-presets-inner">${cards}</div><p class="panel-note" style="font-size:12.5px">或者：直接在地图上点任意节点，把它设为目标。</p>`;
  const box = $("#routeTarget");
  if (!S.route.steps.length && !S.route.target) { box.hidden = true; return; }
  box.hidden = false;
  const t = S.byId.get(S.route.target);
  const skipped = S.route.preset ? 0 : [t.id, ...ancestors(t.id)].length - S.route.steps.length;
  $("#routeSummary").innerHTML = `
    <span class="rs-label mono">${S.route.preset ? "示例路线" : "目标"}</span>
    <span class="rs-title">${esc(S.route.preset ? S.paths[S.route.preset].title : t.title)}</span>
    <span class="rs-meta">${S.route.steps.length ? `共 ${S.route.steps.length} 步，已掌握 ${S.route.steps.filter((id) => S.mastered.has(id)).length} 步${skipped > 0 ? `，已跳过你掌握的 ${skipped} 个节点` : ""}` : "你已经掌握了这条路线上的全部前置。"}</span>`;
  $("#routeSteps").innerHTML = S.route.steps.map((id, i) => {
    const n = S.byId.get(id);
    return `<li data-id="${id}"${S.mastered.has(id) ? ` class="is-mastered"` : ""}><button type="button" data-go="${id}"><span class="rs-n">${S.mastered.has(id) ? "✓" : String(i + 1).padStart(2, "0")}</span><span class="rs-t"><i class="dot ${n.domain}"></i>${esc(n.title)}</span><span class="rs-s">L${n.stage}</span></button></li>`;
  }).join("");
  $("#routePlay").textContent = "▶ 播放路线";
}

function playRoute() {
  if (S.route.playing) { stopRoute(); return; }
  if (!S.route.steps.length) return;
  S.route.playing = true;
  $("#routePlay").textContent = "❚❚ 暂停";
  S.route.steps.forEach((id) => S.els.get(id)?.classList.remove("is-route-lit"));
  $$("#routeSteps li").forEach((li) => li.classList.remove("is-lit"));
  let i = 0;
  const reduce = prefersReducedMotion();
  const tick = () => {
    if (!S.route.playing) return;
    if (i >= S.route.steps.length) { stopRoute(); toast("路线播放完毕"); return; }
    const id = S.route.steps[i];
    S.els.get(id)?.classList.add("is-route-lit");
    const li = $(`#routeSteps li[data-id="${CSS.escape(id)}"]`);
    li?.classList.add("is-lit");
    li?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    flyToNode(id, { duration: 520 });
    i++;
    S.route.timer = setTimeout(tick, reduce ? 160 : 620);
  };
  tick();
}
function stopRoute() {
  if (!S.route) return;
  clearTimeout(S.route.timer);
  S.route.playing = false;
  const b = $("#routePlay");
  if (b) b.textContent = "▶ 播放路线";
}

/* My map ----------------------------------------------------------------- */
function saveMastery() { storage.set(STORE_MASTERY, { version: 1, mastered: [...S.mastered], updatedAt: new Date().toISOString() }); }

function toggleMastery(id) {
  const n = S.byId.get(id);
  const before = availableSet();
  if (S.mastered.has(id)) { S.mastered.delete(id); toast(`已取消：${n.title}`); }
  else {
    S.mastered.add(id);
    const after = availableSet();
    const unlocked = [...after].filter((x) => !before.has(x));
    toast(unlocked.length ? `已掌握「${n.title}」· 解锁 ${unlocked.length} 个新节点` : `已掌握「${n.title}」`);
    const b = S.els.get(id);
    b.classList.remove("just-mastered"); void b.offsetWidth; b.classList.add("just-mastered");
  }
  saveMastery();
  refreshStates({ animateEdges: false });
  if (S.mode === "mine") renderMinePanel();
  if (S.selected === id) openDrawer(id);
}

function renderMinePanel() {
  const total = S.nodes.length;
  const rows = DOMAINS.map((d) => {
    const all = S.nodes.filter((n) => n.domain === d.id);
    const done = all.filter((n) => S.mastered.has(n.id)).length;
    return `<div class="mp-row" style="--c:var(--${d.id})"><span><i class="dot ${d.id}"></i> ${d.name}</span><span class="mp-n">${done} / ${all.length}</span><span class="mp-bar"><i style="width:${(done / all.length) * 100}%"></i></span></div>`;
  }).join("");
  $("#mineProgress").innerHTML = `<div class="mp-total"><b>${S.mastered.size}</b><span>/ ${total} 个节点已掌握</span></div>${rows}`;
  const avail = [...availableSet()].map((id) => S.byId.get(id)).sort((a, b) => a.stage - b.stage);
  $("#nextCount").textContent = avail.length;
  $("#mineNext").innerHTML = avail.slice(0, 24).map((n) => chip(n.id)).join("") + (avail.length > 24 ? `<span class="chip" style="color:var(--ink-3)">还有 ${avail.length - 24} 个</span>` : "");
}

/* --------------------------------------------------------------------------
   Search palette
   -------------------------------------------------------------------------- */
let paletteItems = [];
let paletteIndex = 0;
function openPalette() {
  el.palette.hidden = false;
  el.paletteInput.value = "";
  renderPalette("");
  requestAnimationFrame(() => el.paletteInput.focus());
}
function closePalette() { el.palette.hidden = true; }
function searchNodes(q) {
  const query = clean(q);
  if (!query) {
    const written = S.nodes.filter((n) => S.pageByNode.has(n.id));
    const frontier = S.nodes.filter((n) => n.type === "frontier").slice(0, 8);
    return [...written, ...frontier];
  }
  const scored = [];
  for (const n of S.nodes) {
    const t = clean(n.title);
    let score = 0;
    if (t === query) score = 100;
    else if (t.startsWith(query)) score = 80;
    else if (t.includes(query)) score = 60;
    else if ((n.topics || []).some((x) => clean(x).includes(query))) score = 35;
    else if (clean(S.clusters.get(n.cluster)?.title).includes(query)) score = 20;
    else if (clean(DOMAIN[n.domain].name).includes(query)) score = 10;
    if (score) scored.push([score - n.stage * 0.1, n]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 40).map((x) => x[1]);
}
function highlight(title, q) {
  const query = q.trim();
  if (!query) return esc(title);
  const i = title.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return esc(title);
  return `${esc(title.slice(0, i))}<mark>${esc(title.slice(i, i + query.length))}</mark>${esc(title.slice(i + query.length))}`;
}
function renderPalette(q) {
  paletteItems = searchNodes(q);
  paletteIndex = 0;
  if (!paletteItems.length) { el.paletteList.innerHTML = `<li class="pl-empty">没有找到“${esc(q)}”。试试主题词，比如“梯度”或“调度”。</li>`; return; }
  el.paletteList.innerHTML = (q ? "" : `<li class="pl-empty" style="padding:8px 12px 4px;text-align:left;font-size:11px;letter-spacing:.12em">已有知识页 · 研究前沿</li>`) + paletteItems.map((n, i) => `
    <li role="option" data-i="${i}" class="${i === 0 ? "is-active" : ""}" style="--c:var(--${n.domain})" aria-selected="${i === 0}">
      <i class="dot ${n.domain}"></i>
      <span><span class="pl-title">${highlight(n.title, q)}</span><span class="pl-sub">${(() => { const t = q && !clean(n.title).includes(clean(q)) ? (n.topics || []).find((x) => clean(x).includes(clean(q))) : null; return t ? `包含主题「${highlight(t, q)}」` : esc(S.clusters.get(n.cluster)?.title || ""); })()}${S.pageByNode.has(n.id) ? " · 已有知识页" : ""}</span></span>
      <span class="pl-meta">L${n.stage}</span>
    </li>`).join("");
}
function movePalette(delta) {
  if (!paletteItems.length) return;
  paletteIndex = (paletteIndex + delta + paletteItems.length) % paletteItems.length;
  $$("li[data-i]", el.paletteList).forEach((li) => { const on = +li.dataset.i === paletteIndex; li.classList.toggle("is-active", on); li.setAttribute("aria-selected", on); if (on) li.scrollIntoView({ block: "nearest" }); });
}
function choosePalette(i, asRoute = false) {
  const n = paletteItems[i];
  if (!n) return;
  closePalette();
  if (asRoute) { setRouteTarget(n.id); return; }
  if (S.mode !== "explore") setMode("explore");
  select(n.id);
}

/* --------------------------------------------------------------------------
   Misc UI
   -------------------------------------------------------------------------- */
let toastTimer;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("is-on"), 2400);
}
function hideHint() { el.hint.classList.add("is-gone"); }

function switchLane(lane, { keepSelection = false } = {}) {
  if (S.lane === lane) return;
  S.lane = lane;
  storage.set(STORE_LANE, lane);
  computeLayout();
  placeAll();
  if (!keepSelection) { S.selected = null; closeDrawer(); refreshStates(); }
  setCam(homeCam());
}

function buildLayerSelect() {
  const opts = [`<option value="">全部节点 · 公共图谱</option>`];
  for (const [key, c] of Object.entries(S.curricula)) if ((c.nodes || []).length) opts.push(`<option value="${key}">${esc(c.title)} · ${c.nodes.length}</option>`);
  el.layerSelect.innerHTML = opts.join("");
}

function entrance() {
  if (prefersReducedMotion()) return;
  el.world.classList.add("is-entering");
  requestAnimationFrame(() => {
    for (const n of S.nodes) {
      const b = S.els.get(n.id);
      b.style.setProperty("--rise-delay", `${(n.stage * 0.08 + Math.random() * 0.18).toFixed(3)}s`);
      b.classList.add("rise");
    }
    S.capEls.forEach((c) => { c.style.setProperty("--rise-delay", `${(+c.dataset.stage * 0.08).toFixed(3)}s`); c.classList.add("rise"); });
    $$(".band", el.bands).forEach((b) => { b.style.setProperty("--rise-delay", `${(+b.dataset.stage * 0.06).toFixed(3)}s`); b.classList.add("rise"); });
    el.world.classList.remove("is-entering");
    setTimeout(() => { $$(".rise", el.world).forEach((x) => x.classList.remove("rise")); }, 2200);
  });
}

function showIntro() {
  el.intro.hidden = false;
  el.intro.classList.remove("is-leaving");
  renderSkyline();
}
function renderSkyline() {
  // A data-true miniature of the map: one row per stage, one bar per domain, width ∝ node count.
  const box = $("#introFig");
  if (!box || box.dataset.done) return;
  const W = 460, rowH = 22, gap = 7, labelW = 34, colGap = 10;
  const colW = (W - labelW - colGap * 2) / 3;
  const max = Math.max(...DOMAINS.flatMap((d) => STAGES.map((_, s) => S.nodes.filter((n) => n.domain === d.id && n.stage === s).length)));
  const H = 9 * (rowH + gap);
  let svg = `<svg viewBox="0 0 ${W} ${H + 4}" role="img" aria-label="三个领域在九个阶段上的节点分布">`;
  for (let s = 0; s <= 8; s++) {
    const y = H - (s + 1) * (rowH + gap);
    svg += `<text class="sk-label" x="0" y="${y + rowH / 2 + 3}">L${s}</text><line class="sk-rule" x1="${labelW}" x2="${W}" y1="${y + rowH + gap / 2}" y2="${y + rowH + gap / 2}"/>`;
    DOMAINS.forEach((d, i) => {
      const count = S.nodes.filter((n) => n.domain === d.id && n.stage === s).length;
      if (!count) return;
      const w = Math.max(6, (count / max) * colW);
      const x = labelW + i * (colW + colGap);
      svg += `<rect class="sk-bar" style="--d:${(0.35 + s * 0.07 + i * 0.03).toFixed(2)}s" x="${x}" y="${y}" width="${w.toFixed(1)}" height="${rowH}" rx="5" fill="var(--${d.id})" opacity="${0.35 + 0.65 * (count / max)}"><title>${d.name} · L${s} · ${count} 个节点</title></rect>`;
    });
  }
  svg += `</svg><figcaption><span>每一行是一个阶段，每一条的长度是该领域的节点数</span><span class="mono">L0 → L8</span></figcaption>`;
  box.innerHTML = svg;
  box.dataset.done = "1";
}

function leaveIntro() {
  if (el.intro.hidden) return;
  storage.set(STORE_INTRO, true);
  el.intro.classList.add("is-leaving");
  setCam(homeCam());
  entrance();
  setTimeout(() => { el.intro.hidden = true; }, prefersReducedMotion() ? 0 : 1000);
}

/* --------------------------------------------------------------------------
   Input
   -------------------------------------------------------------------------- */
function bindInput() {
  const vp = el.viewport;
  const pointers = new Map();
  let drag = null; // {x, y, camX, camY, moved, t, vx, vy}
  let pinch = null;
  let inertia = null;

  vp.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    cancelAnimationFrame(inertia); cancelAnimationFrame(S.anim);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, camX: S.cam.x, camY: S.cam.y, moved: 0, t: performance.now(), vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, target: e.target.closest(".node") };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: S.cam.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, camX: S.cam.x, camY: S.cam.y };
      drag = null;
    }
  });
  vp.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === "mouse") hoverAt(e);
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = clamp(pinch.s * (d / pinch.d), minScale(), 1.8);
      const k = s / pinch.s;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      S.cam = clampCam({ x: cx - (pinch.cx - pinch.camX) * k, y: cy - (pinch.cy - pinch.camY) * k, s });
      applyCam();
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 5) {
      if (!vp.classList.contains("is-panning")) { vp.classList.add("is-panning"); vp.setPointerCapture(e.pointerId); hideTooltip(); }
      const now = performance.now();
      const dt = Math.max(1, now - drag.t);
      drag.vx = (e.clientX - drag.lx) / dt; drag.vy = (e.clientY - drag.ly) / dt;
      drag.t = now; drag.lx = e.clientX; drag.ly = e.clientY;
      S.cam = clampCam({ x: drag.camX + dx, y: drag.camY + dy, s: S.cam.s });
      applyCam();
      hideHint();
    }
  });
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
    if (!drag) return;
    const wasDrag = drag.moved > 5;
    vp.classList.remove("is-panning");
    if (!wasDrag && e.type === "pointerup") {
      const node = drag.target;
      if (node) onNodeClick(node.dataset.id, e);
      else if (S.selected) select(null);
    } else if (wasDrag && !prefersReducedMotion()) {
      let { vx, vy } = drag;
      const step = () => {
        vx *= 0.92; vy *= 0.92;
        if (Math.abs(vx) + Math.abs(vy) < 0.02) return;
        S.cam = clampCam({ x: S.cam.x + vx * 16, y: S.cam.y + vy * 16, s: S.cam.s });
        applyCam();
        inertia = requestAnimationFrame(step);
      };
      if (performance.now() - drag.t < 80) inertia = requestAnimationFrame(step);
    }
    drag = null;
  };
  vp.addEventListener("pointerup", end);
  vp.addEventListener("pointercancel", end);
  vp.addEventListener("pointerleave", () => { if (!drag) setHover(null); });

  vp.addEventListener("wheel", (e) => {
    e.preventDefault();
    cancelAnimationFrame(S.anim); cancelAnimationFrame(inertia);
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    if (e.ctrlKey || e.metaKey) {
      zoomAt(Math.exp(-e.deltaY * unit * 0.0045), e.clientX, e.clientY);
    } else {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      S.cam = clampCam({ x: S.cam.x - dx * unit, y: S.cam.y - dy * unit, s: S.cam.s });
      applyCam();
    }
    hideHint(); hideTooltip();
  }, { passive: false });

  // keyboard activation of nodes
  el.nodes.addEventListener("keydown", (e) => {
    const node = e.target.closest(".node");
    if (node && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onNodeClick(node.dataset.id, e); }
  });
  el.nodes.addEventListener("focusin", (e) => {
    const node = e.target.closest(".node");
    if (node && !e.target.matches(":hover")) flyToNode(node.dataset.id, { duration: 400 });
  });

  document.addEventListener("keydown", (e) => {
    if (!e.metaKey && !e.ctrlKey) hideHint();
    const typing = e.target.matches("input, textarea, select");
    if (!el.intro.hidden) { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); leaveIntro(); } return; }
    if (!el.palette.hidden) {
      if (e.key === "Escape") { e.preventDefault(); closePalette(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); movePalette(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); movePalette(-1); }
      else if (e.key === "Enter") { e.preventDefault(); choosePalette(paletteIndex, e.shiftKey); }
      return;
    }
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); openPalette(); return; }
    if (typing) return;
    if (e.key === "Escape") {
      if (S.route.playing) stopRoute();
      else if (S.selected) select(null);
      else if (S.mode !== "explore") setMode("explore");
    } else if (e.key === "1") setMode("explore");
    else if (e.key === "2") setMode("route");
    else if (e.key === "3") setMode("mine");
    else if (e.key === "0") setCam(overviewCam(), { animate: true });
    else if (e.key === "=" || e.key === "+") zoomAt(1.25, innerWidth / 2, innerHeight / 2, { animate: true, duration: 300 });
    else if (e.key === "-") zoomAt(0.8, innerWidth / 2, innerHeight / 2, { animate: true, duration: 300 });
    else if (e.key.startsWith("Arrow") && !e.target.closest(".node")) {
      const d = 120;
      const m = { ArrowUp: [0, d], ArrowDown: [0, -d], ArrowLeft: [d, 0], ArrowRight: [-d, 0] }[e.key];
      setCam({ x: S.cam.x + m[0], y: S.cam.y + m[1], s: S.cam.s }, { animate: true, duration: 260 });
    }
  });

  // clicks on chips / actions anywhere
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) {
      e.preventDefault();
      const id = go.dataset.go;
      if (S.mode === "route" && go.closest("#routeSteps")) { flyToNode(id, { force: true }); return; }
      if (S.mode !== "explore") setMode("explore");
      select(id);
      return;
    }
    const act = e.target.closest("[data-act]");
    if (act && S.selected) {
      if (act.dataset.act === "master") toggleMastery(S.selected);
      if (act.dataset.act === "route") setRouteTarget(S.selected);
      return;
    }
    const preset = e.target.closest("[data-preset]");
    if (preset) { setRouteTarget(null, { preset: preset.dataset.preset }); return; }
    const tick = e.target.closest(".alt-ticks button");
    if (tick) { flyToStage(+tick.dataset.stage); return; }
    const lh = e.target.closest(".lane-head");
    if (lh) {
      const s = Math.min(1, (innerWidth - insets().right - 40) / (S.L.laneW + S.L.axisW));
      const lx = S.L.laneX.get(lh.dataset.d);
      setCam({ x: (innerWidth - insets().right) / 2 - (lx + S.L.laneW / 2) * s, y: S.cam.y, s: Math.max(S.cam.s, s) }, { animate: true });
      return;
    }
    const lane = e.target.closest("[data-lane]");
    if (lane) { switchLane(lane.dataset.lane); refreshLaneTabs(); return; }
    const mode = e.target.closest(".mode");
    if (mode) { setMode(mode.dataset.mode); return; }
    if (e.target.closest("[data-close]")) closePalette();
  });

  $("#drawerClose").addEventListener("click", () => select(null));
  $("#searchTrigger").addEventListener("click", openPalette);
  $("#aboutButton").addEventListener("click", showIntro);
  $("#introEnter").addEventListener("click", leaveIntro);
  $("#zoomIn").addEventListener("click", () => zoomAt(1.3, innerWidth / 2, innerHeight / 2, { animate: true, duration: 320 }));
  $("#zoomOut").addEventListener("click", () => zoomAt(0.77, innerWidth / 2, innerHeight / 2, { animate: true, duration: 320 }));
  $("#zoomFit").addEventListener("click", () => {
    const o = overviewCam(), h = homeCam();
    setCam(Math.abs(S.cam.s - o.s) < 0.02 ? h : o, { animate: true, duration: 800 });
  });
  $("#routePlay").addEventListener("click", playRoute);
  $("#routeClear").addEventListener("click", () => { stopRoute(); S.route = { target: null, preset: null, steps: [], playing: false, timer: null }; renderRoutePanel(); refreshStates(); });
  el.paletteInput.addEventListener("input", () => renderPalette(el.paletteInput.value));
  el.paletteList.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) choosePalette(+li.dataset.i, e.shiftKey); });
  el.paletteList.addEventListener("pointermove", (e) => { const li = e.target.closest("li[data-i]"); if (li && +li.dataset.i !== paletteIndex) movePalette(+li.dataset.i - paletteIndex); });
  el.layerSelect.addEventListener("change", () => {
    S.layer = el.layerSelect.value;
    el.layerSelect.classList.toggle("is-on", !!S.layer);
    if (S.layer && S.mode !== "explore") setMode("explore");
    if (S.layer) { select(null); toast(`图层：${S.curricula[S.layer].title}`); }
    refreshStates();
  });

  $("#mineExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ format: "math-cs-ai-atlas/mastery", version: 1, exportedAt: new Date().toISOString(), mastered: [...S.mastered] }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `my-atlas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("已导出你的地图");
  });
  $("#mineImport").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const ids = (data.mastered || []).filter((id) => S.byId.has(id));
      S.mastered = new Set(ids);
      saveMastery(); renderMinePanel(); refreshStates({ animateEdges: false });
      toast(`已导入 ${ids.length} 个已掌握节点`);
    } catch { toast("文件无法读取，请选择导出的 JSON"); }
    e.target.value = "";
  });
  $("#mineReset").addEventListener("click", () => {
    if (!S.mastered.size) return;
    const backup = [...S.mastered];
    S.mastered.clear(); saveMastery(); renderMinePanel(); refreshStates({ animateEdges: false });
    toast("已清空 · 3 秒内按 Z 可撤销");
    const undo = (ev) => { if (ev.key === "z" || ev.key === "Z") { S.mastered = new Set(backup); saveMastery(); renderMinePanel(); refreshStates({ animateEdges: false }); toast("已撤销"); } };
    document.addEventListener("keydown", undo, { once: true });
    setTimeout(() => document.removeEventListener("keydown", undo), 3000);
  });

  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const wasMobile = S.mobile;
      const focus = S.selected;
      computeLayout(); placeAll(); moveModeThumb();
      if (focus) flyToNode(focus, { force: true, duration: 1 });
      else if (wasMobile !== S.mobile) setCam(homeCam());
      else setCam(S.cam);
    }, 120);
  });
}

function refreshLaneTabs() {
  $$("[data-lane]", el.laneSwitch).forEach((b) => b.setAttribute("aria-selected", b.dataset.lane === S.lane));
}

function onNodeClick(id, e) {
  hideHint();
  if (S.mode === "mine") { toggleMastery(id); return; }
  if (S.mode === "route") { setRouteTarget(id); return; }
  select(S.selected === id ? null : id);
}

function setHover(id) {
  if (S.hovered === id) return;
  S.hovered = id;
  if (!S.selected && !(S.mode === "route" && S.route.steps.length)) refreshStates({ animateEdges: false });
}
function hoverAt(e) {
  const node = e.target.closest?.(".node");
  setHover(node ? node.dataset.id : null);
  if (node && el.world.classList.contains("lod-far")) {
    const n = S.byId.get(node.dataset.id);
    el.tooltip.innerHTML = `${esc(n.title)}<small>${DOMAIN[n.domain].name} · L${n.stage}</small>`;
    el.tooltip.style.left = `${e.clientX}px`;
    el.tooltip.style.top = `${e.clientY}px`;
    el.tooltip.hidden = false;
  } else hideTooltip();
}
function hideTooltip() { el.tooltip.hidden = true; }

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
async function boot() {
  try { await loadData(); }
  catch (err) {
    console.error(err);
    el.viewport.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center"><div><h1 class="display" style="font-size:32px;margin:0 0 8px">地图加载失败</h1><p style="color:var(--ink-2)">${esc(err.message)}。请刷新重试。</p></div></div>`;
    el.body.classList.remove("is-loading");
    return;
  }
  const saved = storage.get(STORE_LANE, "math");
  S.lane = DOMAIN[saved] ? saved : "math";
  $("#introCount").textContent = S.nodes.length;
  $("#introMath").textContent = S.nodes.filter((n) => n.domain === "math").length;
  $("#introCs").textContent = S.nodes.filter((n) => n.domain === "cs").length;
  $("#introAi").textContent = S.nodes.filter((n) => n.domain === "ai").length;

  buildLayerSelect();
  computeLayout();
  buildNodes();
  placeAll();
  bindInput();
  moveModeThumb();
  document.fonts?.ready.then(moveModeThumb);
  el.body.classList.remove("is-loading");

  const params = new URLSearchParams(location.search);
  const deep = params.get("node");
  const mode = params.get("mode");
  setCam(homeCam());
  if (deep && S.byId.has(deep)) {
    select(deep, { updateUrl: false });
    flyToNode(deep, { force: true, duration: 1 });
  } else if (!storage.get(STORE_INTRO, false) && !params.has("nointro") && !params.has("path")) {
    showIntro();
  } else {
    entrance();
  }
  const pathKey = params.get("path");
  if (pathKey && S.paths[pathKey]) { setRouteTarget(null, { preset: pathKey }); }
  else if (mode === "route" || mode === "mine") setMode(mode);
  setTimeout(hideHint, 9000);
}

boot();
