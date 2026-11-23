/* ==========================================================================
   Knowledge page renderer
   Classic script on purpose: tests execute it in a VM with stubbed fetch.
   ========================================================================== */
(async () => {
  "use strict";
  const root = document.getElementById("knowledgePage");
  const params = new URLSearchParams(location.search);
  const requestedTitle = (params.get("title") || "").trim();
  const requestedId = (params.get("id") || "").trim();

  const DOMAIN = { math: "纯数学", cs: "计算机科学", ai: "人工智能" };
  const DOMAIN_EN = { math: "Pure Mathematics", cs: "Computer Science", ai: "Artificial Intelligence" };
  const STAGES = ["初等基础", "语言与思维", "本科核心", "基础支柱", "经典分支", "桥梁学科", "高级核心", "统一框架", "研究前沿"];
  const TYPE = { course: "课程级知识", practice: "实践与规范", tool: "工具与环境", frontier: "研究前沿" };
  const STATUS = { draft: "草稿", validated: "已校验", reviewed: "已审阅", published: "已发布", active: "仍在开设", historical: "历史版本", unknown: "状态未知" };
  const TEMPLATE_SUMMARY = /的课程级知识模块，关注核心概念、典型方法、前置依赖与后续研究方向/;

  const normalize = (v) => (Array.isArray(v) ? v : Object.entries(v || {}).map(([id, item]) => ({ id, ...item })));
  const clean = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const safeUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try { const url = new URL(value, location.href); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
  };
  const ext = (url, label, cls = "ext") => {
    const safe = safeUrl(url);
    return safe ? `<a class="${cls}" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : "";
  };

  const catalog = await window.loadAtlasCatalog();
  const nodes = normalize(catalog.nodes);
  const clusters = normalize(catalog.clusters);
  const nodeById = new Map(nodes.map((n) => [String(n.id), n]));
  const clusterById = new Map(clusters.map((c) => [String(c.id), c]));

  let node = requestedId ? nodeById.get(requestedId) : null;
  if (!node && requestedTitle) node = nodes.find((n) => clean(n.title) === clean(requestedTitle));
  if (!node && requestedTitle) node = nodes.find((n) => clean(n.title).includes(clean(requestedTitle)) || clean(requestedTitle).includes(clean(n.title)));
  if (!node) {
    root.innerHTML = `<section class="kn-missing"><p class="eyebrow mono">404</p><h1 class="display">没有找到这个知识节点</h1><p>它可能改了名字。回到地图，用搜索找一找。</p><a class="btn btn-ink" href="./index.html">回到地图</a></section>`;
    return;
  }

  const manifest = await fetch("./content/manifest.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { pages: [] })).catch(() => ({ pages: [] }));
  const entry = (manifest.pages || []).find((p) => [p.title, ...(p.aliases || [])].some((x) => clean(x) === clean(node.title)));
  let page = null;
  if (entry) { try { page = await fetch(entry.path, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)); } catch { page = null; } }
  const loadCollection = async (manifestPath, key) => {
    try {
      const data = await fetch(manifestPath, { cache: "no-store" }).then((r) => (r.ok ? r.json() : { [key]: [] }));
      const items = (data[key] || []).filter((item) => clean(item.knowledgeNode) === clean(node.title));
      return (await Promise.all(items.map((item) => fetch(item.path, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)))).filter(Boolean);
    } catch { return []; }
  };
  const [courses, experiences] = await Promise.all([
    loadCollection("./content/courses/manifest.json", "courses"),
    loadCollection("./content/experiences/manifest.json", "experiences"),
  ]);

  const stage = Number(node.stage ?? 0);
  const cluster = clusterById.get(String(node.cluster));
  const nextNodes = nodes.filter((n) => (n.prerequisites || []).map(String).includes(String(node.id)));
  const relationNodes = (ids) => (ids || []).map((id) => nodeById.get(String(id))).filter(Boolean);
  const link = (n) => `./knowledge.html?id=${encodeURIComponent(n.id)}&title=${encodeURIComponent(n.title)}`;
  const nodeChip = (n) => `<a class="chip" href="${link(n)}"><i class="dot ${esc(n.domain)}"></i>${esc(n.title)}<span class="mono chip-l">L${esc(n.stage)}</span></a>`;
  const list = (items, cls = "") => `<ul class="${cls}">${(items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

  const fallback = {
    tier: "基础页", status: "draft", kind: node.type || "course",
    summary: TEMPLATE_SUMMARY.test(node.summary || "") ? "" : node.summary,
    why: "", learningObjectives: [], coreTopics: node.topics || [], syllabus: [], resources: [], exercises: [], projects: [],
    completion: { basic: "", proficient: "", researchReady: "" }, sources: [],
  };
  const content = { ...fallback, ...(page || {}), completion: { ...fallback.completion, ...(page?.completion || {}) } };
  document.title = `${node.title} · 知识节点`;
  const back = document.getElementById("backToMap");
  if (back) back.href = `./index.html?node=${encodeURIComponent(node.id)}`;

  /* ---------- sections ---------- */
  const sections = [];
  const add = (id, title, html, opts = {}) => { if (html) sections.push({ id, title, html, ...opts }); };

  if (content.why) add("why", "为什么学习", `<p class="lead-p">${esc(content.why)}</p>`);
  if (content.learningObjectives.length) add("objectives", "学习目标", `<ol class="objectives">${content.learningObjectives.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`);
  if (content.coreTopics.length) add("topics", "核心内容", `<div class="chip-row topics">${content.coreTopics.map((t, i) => `<span class="chip"><span class="mono chip-l">${String(i + 1).padStart(2, "0")}</span>${esc(t)}</span>`).join("")}</div>`);
  if ((content.syllabus || []).length) {
    add("syllabus", "章节大纲", `<p class="note">该知识领域稳定的教学核心，不复制任何一所学校的 syllabus。</p><ol class="syllabus">${content.syllabus.map((s, i) => `
      <li><span class="syl-n">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(s.title)}</h3>${(s.topics || []).map((t) => `<p>${esc(t)}</p>`).join("")}</div></li>`).join("")}</ol>`);
  }
  if ((content.exercises || []).length) {
    const exercise = (x, i) => {
      const lines = String(x.description || "").split("\n");
      const solIndex = lines.findIndex((l) => /^解析[:：]/.test(l));
      const prompt = solIndex < 0 ? lines : lines.slice(0, solIndex);
      const rest = solIndex < 0 ? [] : lines.slice(solIndex);
      return `<article class="exercise"><header><span class="ex-type">${esc(x.type)}</span><span class="mono ex-n">${String(i + 1).padStart(2, "0")}</span></header>
        ${prompt.map((line) => `<p>${esc(line)}</p>`).join("")}
        ${rest.length ? `<details><summary><span>先独立作答，再查看解析</span><span class="mono" aria-hidden="true">+</span></summary><div class="solution">${rest.map((line) => `<p>${esc(line)}</p>`).join("")}</div></details>` : ""}
      </article>`;
    };
    add("exercises", "练习", `<div class="exercises">${content.exercises.map(exercise).join("")}</div>`);
  }
  if ((content.projects || []).length) add("projects", "项目", content.projects.map((p) => `<article class="project"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>${p.deliverable ? `<p class="deliverable"><span class="mono">交付物</span>${esc(p.deliverable)}</p>` : ""}</article>`).join(""));
  if (content.completion.basic || content.completion.proficient || content.completion.researchReady) {
    add("completion", "完成标准", `<ol class="ladder">
      <li><span class="ld-k">基础完成</span><p>${esc(content.completion.basic)}</p></li>
      <li><span class="ld-k">熟练掌握</span><p>${esc(content.completion.proficient)}</p></li>
      <li><span class="ld-k">研究准备</span><p>${esc(content.completion.researchReady)}</p></li></ol>`);
  }
  if ((content.resources || []).length) {
    add("resources", "学习资源", `<ul class="refs">${content.resources.map((r) => `<li><div><strong>${esc(r.title)}</strong><small>${esc([r.type, r.author, r.institution].filter(Boolean).join(" · "))}</small></div><div class="ref-side">${r.verification ? `<span class="verify">${esc(r.verification)}</span>` : ""}${ext(r.url, "打开资源")}</div></li>`).join("")}</ul>`);
  }

  const dims = { theoryDepth: "理论深度", practiceIntensity: "实践强度", mathRequirement: "数学要求", programmingIntensity: "编程强度", resourceCompleteness: "资源完整度" };
  const courseCard = (c) => {
    const hours = c.workload?.estimatedHours;
    const official = safeUrl(c.officialUrl);
    return `<article class="course"><header><p class="eyebrow mono">课程实现 · ${esc(c.verification)}</p><h3>${esc(c.institution)} <span class="mono">${esc(c.courseCode)}</span></h3><p class="course-title">${esc(c.title)}</p></header>
      <dl class="course-meta"><div><dt>年份</dt><dd>${esc(c.academicYear)}</dd></div><div><dt>语言</dt><dd>${esc(c.language)}</dd></div><div><dt>状态</dt><dd><span class="sr-only">${esc(c.status)}</span>${esc(STATUS[c.status] || c.status)}</dd></div><div><dt>总投入</dt><dd>${hours ? `${esc(hours.min)}–${esc(hours.max)} 小时` : "待核验"}</dd></div></dl>
      <div class="dims">${Object.entries(dims).map(([k, label]) => { const v = Math.max(1, Math.min(5, Number(c.dimensions?.[k]) || 1)); return `<div class="dim"><span>${label}</span><span class="pips" role="img" aria-label="${v}/5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= v ? "on" : ""}"></i>`).join("")}</span></div>`; }).join("")}</div>
      ${(c.features || []).length ? `<div class="chip-row">${c.features.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>` : ""}
      ${official ? `<a class="ext" href="${esc(official)}" target="_blank" rel="noopener noreferrer">官方课程页</a>` : `<span class="muted">官方链接待核验</span>`}
    </article>`;
  };
  add("courses", "课程实现", `<p class="note">课程实现与知识节点分开记录；各维度描述课程取向，不汇总为总分或排名。</p>${courses.length ? `<div class="courses">${courses.map(courseCard).join("")}</div>` : `<div class="empty"><strong>还没有整理好的课程实现</strong><p>知识标准仍可以独立学习；课程候选会在一手来源核验后加入。</p></div>`}`, { always: true });

  const expCard = (x) => `<article class="exp"><header><span class="subjective">社区经验 · 主观</span><span class="mono">${esc(x.sourceType)} · ${esc(x.verification)}</span></header>
    ${x.workloadHours == null ? "" : `<p class="exp-hours"><b class="display">${esc(x.workloadHours)}</b> 小时 <span>（作者自述的投入）</span></p>`}
    ${x.hardestParts?.length ? `<h4>常见难点</h4>${list(x.hardestParts)}` : ""}
    ${x.recommendedPreparation?.length ? `<h4>建议前置</h4>${list(x.recommendedPreparation)}` : ""}
    ${x.mostValuableParts?.length ? `<h4>最有价值的部分</h4>${list(x.mostValuableParts)}` : ""}
    ${x.advice?.length ? `<h4>学习建议</h4>${list(x.advice)}` : ""}
    <p class="exp-src">来源：${ext(x.source?.url, x.source?.title || "未注明", "ext-inline") || esc(x.source?.title || "未注明")}</p></article>`;
  add("experiences", "学习经验", `<p class="note">以下内容是主观经验，不属于官方课程事实，也不会进入 canonical syllabus。</p>${experiences.length ? experiences.map(expCard).join("") : `<div class="empty"><strong>还没有学习经验</strong><p>这里不会用未经标注的主观评价填充课程信息。</p></div>`}`, { always: true });

  if ((content.sources || []).length) {
    add("sources", "参考来源", `<ul class="refs">${content.sources.map((s) => `<li><div><strong>${esc(s.title)}</strong><small>${esc([s.sourceType, s.institution].filter(Boolean).join(" · "))}</small></div><div class="ref-side"><span class="verify">${esc(s.verification || "待核验")}${s.checkedAt ? ` · ${esc(s.checkedAt)}` : ""}</span>${ext(s.url, "核对来源")}</div></li>`).join("")}</ul>`);
  }

  /* ---------- page ---------- */
  const prereqs = relationNodes(node.prerequisites);
  const recommended = relationNodes(node.recommended);
  const tierLabel = page ? content.tier : "基础页";
  const statusLabel = STATUS[content.status] || content.status;
  const basicNotice = page ? "" : `<aside class="unwritten"><div class="uw-mark" aria-hidden="true">…</div><div><h2>这一页还没有正文</h2><p>该节点已经拥有可访问页面，但目前只使用图谱元数据生成：核心内容、前置与后续都来自 <code>catalog.json</code>。正文会按<a href="https://github.com/RanchoTao/Math-CS-AI/blob/main/docs/CONTENT_STANDARD.md">内容标准</a>撰写、核验后升级为标准页。</p></div></aside>`;

  root.innerHTML = `
  <article class="kn" data-d="${esc(node.domain)}">
    <header class="kn-hero">
      <p class="kn-eyebrow"><span class="kn-dom"><i class="dot ${esc(node.domain)}"></i>${esc(DOMAIN[node.domain] || "跨学科")}</span><span class="mono">L${stage} · ${esc(STAGES[stage] || "")}</span><span>${esc(TYPE[content.kind] || TYPE[node.type] || "知识节点")}</span><span>${esc(cluster?.title || "")}</span></p>
      <h1>${esc(node.title)}</h1>
      ${content.summary ? `<p class="kn-summary">${esc(content.summary)}</p>` : ""}
      <dl class="kn-meta">
        <div><dt>页面</dt><dd><span class="tier ${page ? "is-written" : ""}">${esc(tierLabel)}</span></dd></div>
        <div><dt>状态</dt><dd><strong>${esc(statusLabel)}</strong><span class="meta-sub mono">${esc(content.status)}</span></dd></div>
        <div><dt>必要前置</dt><dd><strong class="display">${prereqs.length}</strong></dd></div>
        <div><dt>直接后续</dt><dd><strong class="display">${nextNodes.length}</strong></dd></div>
      </dl>
    </header>

    <section class="kn-position" aria-label="在地图中的位置">
      <div class="pos-col"><h2>必要前置 <span class="mono">${prereqs.length}</span></h2>${prereqs.length ? `<div class="pos-list">${prereqs.map(nodeChip).join("")}</div>` : `<p class="muted">无，可以直接开始</p>`}${recommended.length ? `<h2 class="pos-sub">推荐关联</h2><div class="pos-list">${recommended.map(nodeChip).join("")}</div>` : ""}</div>
      <div class="pos-here" aria-hidden="true"><span class="pos-arrow">→</span><span class="pos-node">${esc(node.title)}</span><span class="pos-arrow">→</span></div>
      <div class="pos-col"><h2>可继续进入 <span class="mono">${nextNodes.length}</span></h2>${nextNodes.length ? `<div class="pos-list">${nextNodes.slice(0, 10).map(nodeChip).join("")}</div>${nextNodes.length > 10 ? `<details class="pos-more"><summary>展开其余 ${nextNodes.length - 10} 个</summary><div class="pos-list">${nextNodes.slice(10).map(nodeChip).join("")}</div></details>` : ""}` : `<p class="muted">当前地图上的终点</p>`}</div>
    </section>

    ${basicNotice}

    <div class="kn-body">
      <nav class="toc" aria-label="本页目录"><p class="eyebrow mono">本页</p><ol>${sections.map((s) => `<li><a href="#${s.id}" data-toc="${s.id}">${esc(s.title)}</a></li>`).join("")}</ol></nav>
      <div class="kn-main">${sections.map((s, i) => `<section class="kn-sec" id="${s.id}"><h2><span class="mono sec-n">${String(i + 1).padStart(2, "0")}</span>${esc(s.title)}</h2>${s.html}</section>`).join("")}</div>
    </div>
  </article>`;

  /* ---------- progressive enhancements (browser only) ---------- */
  if (typeof document.querySelectorAll !== "function") return;
  const bar = document.getElementById("readProgress");
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (typeof IntersectionObserver === "function") {
    const links = new Map([...document.querySelectorAll("[data-toc]")].map((a) => [a.dataset.toc, a]));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { links.forEach((a) => a.classList.remove("is-active")); links.get(e.target.id)?.classList.add("is-active"); }
    }, { rootMargin: "-30% 0px -60% 0px" });
    document.querySelectorAll(".kn-sec").forEach((s) => io.observe(s));
    const reveal = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); reveal.unobserve(e.target); } }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".kn-sec, .kn-position, .unwritten").forEach((s) => { s.classList.add("will-reveal"); reveal.observe(s); });
  }
})().catch((err) => {
  console.error(err);
  const root = document.getElementById("knowledgePage");
  if (root) root.innerHTML = `<section class="kn-missing"><h1 class="display">知识页面加载失败</h1><p>${String(err.message || err).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</p></section>`;
});
