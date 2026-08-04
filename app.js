const DOMAIN_LABELS = {
  math: "纯数学",
  cs: "计算机科学",
  ai: "人工智能",
};

const LEVEL_LABELS = {
  foundation: "基础",
  core: "核心",
  advanced: "进阶",
  research: "研究方向",
};

const nodes = [
  // Pure mathematics
  node("proof", "证明与逻辑", "math", "foundation", 105, 150, 100, "建立集合、命题、量词与证明方法的共同语言。", ["命题逻辑", "量词与集合", "直接证明与反证法"], 45),
  node("calculus", "微积分", "math", "foundation", 105, 270, 100, "从极限出发理解变化率、累积与连续模型。", ["极限与连续", "微分", "积分与级数"], 120),
  node("linear-algebra", "线性代数", "math", "foundation", 105, 390, 100, "研究向量空间、线性映射、矩阵与谱结构。", ["向量空间", "线性映射", "特征值与 SVD"], 120),
  node("discrete-math", "离散数学", "math", "foundation", 105, 510, 100, "研究离散结构、组合对象、图与递归关系。", ["组合计数", "图论基础", "递推与生成函数"], 90),
  node("probability", "概率论", "math", "core", 325, 150, 100, "用测度化的随机性语言刻画不确定现象。", ["随机变量", "分布与期望", "大数定律与中心极限定理"], 110),
  node("analysis", "数学分析", "math", "core", 325, 270, 100, "严格建立微积分理论并训练证明与估计能力。", ["实数完备性", "函数列与级数", "多元微分与积分"], 180),
  node("abstract-algebra", "抽象代数", "math", "core", 325, 390, 100, "通过群、环、域研究运算结构与不变量。", ["群与作用", "环与理想", "域扩张"], 150),
  node("optimization", "最优化", "math", "core", 325, 510, 100, "研究如何在约束下寻找最优解及其算法。", ["凸集与凸函数", "对偶性", "梯度与近端方法"], 120),
  node("statistics", "数理统计", "math", "core", 325, 630, 100, "从样本推断总体并量化估计与决策的不确定性。", ["估计", "假设检验", "贝叶斯方法"], 110),
  node("real-analysis", "实分析", "math", "advanced", 545, 190, 100, "以测度与积分统一处理极限、函数空间和收敛。", ["测度", "Lebesgue 积分", "Lᵖ 空间"], 160),
  node("topology", "拓扑学", "math", "advanced", 545, 310, 100, "研究连续变形下保持不变的空间结构。", ["拓扑空间", "紧致与连通", "基本群直觉"], 140),
  node("numerical-analysis", "数值分析", "math", "advanced", 545, 430, 100, "研究连续数学问题的稳定、高效数值近似。", ["误差与稳定性", "插值与求积", "线性系统迭代法"], 120),
  node("stochastic-process", "随机过程", "math", "advanced", 545, 550, 100, "研究随时间演化的随机系统。", ["Markov 链", "Poisson 过程", "鞅与 Brown 运动"], 150),
  node("ode", "常微分方程", "math", "advanced", 545, 670, 100, "研究有限维连续动力系统的演化规律。", ["存在唯一性", "稳定性", "动力系统"], 110),
  node("pde", "偏微分方程", "math", "research", 765, 250, 100, "研究多变量场的传播、扩散与平衡。", ["椭圆型方程", "抛物型方程", "双曲型方程"], 180),
  node("sde", "随机微分方程", "math", "research", 765, 490, 100, "把微分动力系统与随机扰动结合起来。", ["Itô 积分", "Itô 公式", "扩散过程"], 160),

  // Computer science
  node("python", "Python", "cs", "foundation", 105, 790, 100, "快速表达算法、数据处理与科学计算流程。", ["语法与数据结构", "函数与模块", "调试与测试"], 60),
  node("cpp", "C++", "cs", "foundation", 105, 900, 100, "理解类型、内存与高性能程序设计。", ["类型系统", "资源管理", "STL 与泛型"], 100),
  node("data-structures", "数据结构", "cs", "core", 325, 790, 100, "组织数据并分析访问、更新与查询的复杂度。", ["表、栈与队列", "树与堆", "哈希与图"], 100),
  node("algorithms", "算法设计", "cs", "core", 545, 790, 100, "用分治、贪心、动态规划与随机化解决计算问题。", ["复杂度分析", "经典算法范式", "图算法"], 140),
  node("computer-architecture", "计算机组成", "cs", "core", 325, 900, 100, "从指令、处理器、存储层次理解程序如何运行。", ["ISA", "流水线", "缓存与存储"], 120),
  node("operating-systems", "操作系统", "cs", "advanced", 545, 900, 100, "理解进程、虚拟内存、文件系统与并发抽象。", ["进程与线程", "虚拟内存", "文件系统"], 140),
  node("networks", "计算机网络", "cs", "advanced", 765, 900, 100, "理解分层协议、可靠传输与互联网系统。", ["网络分层", "TCP/IP", "路由与拥塞"], 110),
  node("databases", "数据库", "cs", "advanced", 765, 790, 100, "研究数据模型、查询、事务与存储系统。", ["关系模型", "索引与查询优化", "事务与恢复"], 100),
  node("complexity", "计算复杂性", "cs", "advanced", 765, 670, 100, "研究问题所需时间、空间及可计算性的边界。", ["归约", "P 与 NP", "随机与近似复杂性"], 130),
  node("distributed", "分布式系统", "cs", "research", 985, 850, 100, "研究多节点系统中的一致性、容错与协调。", ["一致性", "共识", "复制与容错"], 150),
  node("compilers", "编译原理", "cs", "research", 985, 730, 100, "把高级语言转换为可执行程序并实施优化。", ["词法与语法", "中间表示", "代码生成与优化"], 150),
  node("software-engineering", "软件工程", "cs", "core", 985, 610, 100, "建立可维护、可测试、可协作交付的软件系统。", ["架构与模块化", "测试与 CI", "版本控制与协作"], 90),

  // Artificial intelligence
  node("machine-learning", "机器学习", "ai", "core", 985, 150, 112, "从数据中学习预测、表征与决策规律。", ["监督与无监督学习", "泛化与正则化", "模型评估"], 150),
  node("deep-learning", "深度学习", "ai", "core", 1195, 150, 112, "用多层神经网络学习复杂表征与端到端模型。", ["反向传播", "优化与归一化", "卷积与注意力"], 160),
  node("computer-vision", "计算机视觉", "ai", "advanced", 1405, 80, 112, "让机器理解图像与视频中的对象、结构与运动。", ["图像分类", "检测与分割", "视觉表征学习"], 140),
  node("nlp", "自然语言处理", "ai", "advanced", 1405, 200, 112, "研究文本与语言的表示、理解和生成。", ["语言建模", "序列建模", "评测与生成"], 140),
  node("reinforcement-learning", "强化学习", "ai", "advanced", 1195, 310, 112, "让智能体通过交互与回报学习序贯决策。", ["MDP", "价值与策略方法", "探索与离线 RL"], 160),
  node("generative-models", "生成模型", "ai", "advanced", 1195, 430, 112, "学习数据分布并生成新的高维样本。", ["VAE", "GAN", "扩散模型"], 150),
  node("transformer", "Transformer", "ai", "advanced", 1405, 350, 112, "以注意力机制构建可并行扩展的序列模型。", ["自注意力", "位置编码", "编码器与解码器"], 90),
  node("llm", "大语言模型", "ai", "research", 1405, 480, 112, "研究大规模语言模型的预训练、适配、推理与评估。", ["预训练与扩展规律", "指令微调与对齐", "推理、工具与评测"], 200),
  node("ai-systems", "AI 系统", "ai", "research", 1195, 550, 112, "研究训练与推理系统的性能、可靠性和工程化。", ["分布式训练", "推理优化", "数据与评测基础设施"], 170),
  node("agents", "AI Agent", "ai", "research", 1405, 610, 112, "让模型通过记忆、工具与反馈完成长程任务。", ["规划与工具调用", "记忆与反思", "多智能体协作"], 130),
  node("world-models", "世界模型", "ai", "research", 1405, 740, 112, "学习环境动力学并用于预测、规划和控制。", ["潜空间动力学", "预测式表征", "基于模型的决策"], 160),
  node("scientific-ml", "科学机器学习", "ai", "research", 1195, 680, 112, "把机器学习与微分方程、数值模拟和科学先验结合。", ["PINN", "神经算子", "可微分模拟"], 160),
];

const edges = [
  edge("proof", "analysis"), edge("calculus", "analysis"), edge("calculus", "probability", "recommended"),
  edge("proof", "abstract-algebra"), edge("linear-algebra", "abstract-algebra"), edge("discrete-math", "abstract-algebra", "recommended"),
  edge("analysis", "real-analysis"), edge("proof", "topology"), edge("analysis", "topology", "recommended"),
  edge("calculus", "optimization"), edge("linear-algebra", "optimization"), edge("probability", "statistics"),
  edge("analysis", "numerical-analysis"), edge("linear-algebra", "numerical-analysis"),
  edge("probability", "stochastic-process"), edge("real-analysis", "stochastic-process", "recommended"),
  edge("analysis", "ode"), edge("ode", "pde", "recommended"), edge("real-analysis", "pde"),
  edge("stochastic-process", "sde"), edge("ode", "sde", "recommended"),

  edge("python", "data-structures"), edge("cpp", "data-structures"), edge("data-structures", "algorithms"),
  edge("discrete-math", "algorithms"), edge("algorithms", "complexity"), edge("proof", "complexity", "recommended"),
  edge("cpp", "computer-architecture"), edge("computer-architecture", "operating-systems"),
  edge("operating-systems", "networks"), edge("data-structures", "databases"),
  edge("operating-systems", "distributed"), edge("networks", "distributed"), edge("databases", "distributed", "recommended"),
  edge("data-structures", "compilers"), edge("computer-architecture", "compilers"),
  edge("python", "software-engineering", "recommended"), edge("cpp", "software-engineering", "recommended"),

  edge("linear-algebra", "machine-learning"), edge("probability", "machine-learning"), edge("statistics", "machine-learning"), edge("optimization", "machine-learning"),
  edge("python", "machine-learning"), edge("algorithms", "machine-learning", "recommended"),
  edge("machine-learning", "deep-learning"), edge("optimization", "deep-learning", "recommended"),
  edge("deep-learning", "computer-vision"), edge("deep-learning", "nlp"),
  edge("probability", "reinforcement-learning"), edge("machine-learning", "reinforcement-learning"),
  edge("deep-learning", "generative-models"), edge("probability", "generative-models", "recommended"),
  edge("deep-learning", "transformer"), edge("nlp", "transformer", "recommended"),
  edge("transformer", "llm"), edge("nlp", "llm"),
  edge("operating-systems", "ai-systems", "recommended"), edge("distributed", "ai-systems"), edge("deep-learning", "ai-systems"),
  edge("llm", "agents"), edge("software-engineering", "agents", "recommended"),
  edge("reinforcement-learning", "world-models"), edge("generative-models", "world-models", "recommended"),
  edge("pde", "scientific-ml", "application"), edge("numerical-analysis", "scientific-ml"), edge("deep-learning", "scientific-ml"),
  edge("sde", "generative-models", "application"), edge("transformer", "computer-vision", "application"),
  edge("llm", "world-models", "application"), edge("ai-systems", "llm", "application"),
];

const regions = [
  { domain: "math", label: "PURE MATHEMATICS", x: 32, y: 62, width: 835, height: 680 },
  { domain: "cs", label: "COMPUTER SCIENCE", x: 32, y: 750, width: 1075, height: 210 },
  { domain: "ai", label: "ARTIFICIAL INTELLIGENCE", x: 900, y: 42, width: 650, height: 740 },
];

const graph = {
  svg: document.getElementById("knowledgeGraph"),
  transform: document.getElementById("graphTransform"),
  regionLayer: document.getElementById("regionLayer"),
  edgeLayer: document.getElementById("edgeLayer"),
  nodeLayer: document.getElementById("nodeLayer"),
  viewport: document.getElementById("mapViewport"),
};

const state = {
  domain: "all",
  selectedId: null,
  query: "",
  pathMode: false,
  scale: 0.82,
  panX: 80,
  panY: 35,
  dragging: false,
  dragStart: null,
};

const nodeById = new Map(nodes.map((item) => [item.id, item]));
const outgoing = adjacency(edges, "source", "target");
const incoming = adjacency(edges, "target", "source");
const llmPath = new Set(["proof", "calculus", "linear-algebra", "probability", "statistics", "optimization", "python", "data-structures", "algorithms", "machine-learning", "deep-learning", "nlp", "transformer", "llm"]);

renderRegions();
renderEdges();
renderNodes();
wireControls();
applyTransform();
applyVisibility();
selectFromHash();

function node(id, title, domain, level, x, y, width, summary, topics, hours) {
  return { id, title, domain, level, x, y, width, height: 60, summary, topics, hours };
}

function edge(source, target, type = "prerequisite") {
  return { id: `${source}--${target}`, source, target, type };
}

function adjacency(items, key, value) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item[key])) map.set(item[key], []);
    map.get(item[key]).push(item[value]);
  }
  return map;
}

function createSvg(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function renderRegions() {
  for (const region of regions) {
    const rect = createSvg("rect", {
      x: region.x, y: region.y, width: region.width, height: region.height,
      class: `region-box ${region.domain}`,
    });
    const label = createSvg("text", {
      x: region.x + 18, y: region.y + 30,
      class: `region-label ${region.domain}`,
    });
    label.textContent = region.label;
    graph.regionLayer.append(rect, label);
  }
}

function renderEdges() {
  for (const relation of edges) {
    const source = nodeById.get(relation.source);
    const target = nodeById.get(relation.target);
    const path = createSvg("path", {
      d: edgePath(source, target),
      class: `edge ${relation.type}`,
      "data-edge-id": relation.id,
      "data-source": relation.source,
      "data-target": relation.target,
      "marker-end": `url(#arrow-${relation.type})`,
    });
    graph.edgeLayer.appendChild(path);
  }
}

function edgePath(source, target) {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x - target.width / 2;
  const ty = target.y + target.height / 2;

  if (tx > sx + 25) {
    const bend = Math.max(50, Math.abs(tx - sx) * 0.42);
    return `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`;
  }

  const sourceBottom = source.y + source.height;
  const targetTop = target.y;
  const midY = (sourceBottom + targetTop) / 2;
  return `M ${source.x} ${sourceBottom} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${targetTop}`;
}

function renderNodes() {
  for (const item of nodes) {
    const group = createSvg("g", {
      class: `knowledge-node ${item.domain}`,
      transform: `translate(${item.x - item.width / 2} ${item.y})`,
      tabindex: "0",
      role: "button",
      "aria-label": `${item.title}，${DOMAIN_LABELS[item.domain]}，${LEVEL_LABELS[item.level]}`,
      "data-node-id": item.id,
      "data-domain": item.domain,
    });

    const card = createSvg("rect", { width: item.width, height: item.height, rx: 15, class: "node-card" });
    const accent = createSvg("rect", { x: 12, y: 10, width: 4, height: 40, rx: 2, class: "node-accent" });
    const title = createSvg("text", { x: item.width / 2 + 4, y: 27, class: "node-title" });
    title.textContent = item.title;
    const level = createSvg("text", { x: item.width / 2 + 4, y: 44, class: "node-level" });
    level.textContent = LEVEL_LABELS[item.level].toUpperCase();
    const dot = createSvg("circle", { cx: item.width - 12, cy: 12, r: 2.2, class: "node-dot" });

    group.append(card, accent, title, level, dot);
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNode(item.id, true);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode(item.id, true);
      }
    });
    graph.nodeLayer.appendChild(group);
  }
}

function wireControls() {
  document.getElementById("domainFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-domain]");
    if (!button) return;
    document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.domain = button.dataset.domain;
    applyVisibility();
  });

  document.getElementById("searchInput").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    applyVisibility();
    const exact = nodes.find((item) => item.title.toLowerCase() === state.query || item.id === state.query);
    if (exact) selectNode(exact.id, false);
  });

  document.getElementById("pathButton").addEventListener("click", (event) => {
    state.pathMode = !state.pathMode;
    event.currentTarget.classList.toggle("active", state.pathMode);
    event.currentTarget.textContent = state.pathMode ? "取消路径高亮" : "高亮「大语言模型」路径";
    applyVisibility();
  });

  document.getElementById("zoomIn").addEventListener("click", () => setScale(state.scale * 1.14));
  document.getElementById("zoomOut").addEventListener("click", () => setScale(state.scale / 1.14));
  document.getElementById("resetView").addEventListener("click", resetView);
  document.getElementById("closeDetail").addEventListener("click", closeDetail);

  graph.viewport.addEventListener("pointerdown", beginDrag);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  graph.viewport.addEventListener("wheel", zoomAtPointer, { passive: false });
  graph.svg.addEventListener("click", (event) => {
    if (!event.target.closest(".knowledge-node")) clearSelection();
  });
  window.addEventListener("hashchange", selectFromHash);
}

function beginDrag(event) {
  if (event.target.closest(".knowledge-node") || event.button !== 0) return;
  state.dragging = true;
  graph.viewport.classList.add("dragging");
  state.dragStart = { point: clientToSvg(event.clientX, event.clientY), panX: state.panX, panY: state.panY };
  graph.viewport.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
  if (!state.dragging || !state.dragStart) return;
  const point = clientToSvg(event.clientX, event.clientY);
  state.panX = state.dragStart.panX + point.x - state.dragStart.point.x;
  state.panY = state.dragStart.panY + point.y - state.dragStart.point.y;
  applyTransform();
}

function endDrag() {
  state.dragging = false;
  state.dragStart = null;
  graph.viewport.classList.remove("dragging");
}

function zoomAtPointer(event) {
  event.preventDefault();
  const cursor = clientToSvg(event.clientX, event.clientY);
  const oldScale = state.scale;
  const nextScale = clamp(oldScale * Math.exp(-event.deltaY * 0.00115), 0.45, 2.1);
  const graphX = (cursor.x - state.panX) / oldScale;
  const graphY = (cursor.y - state.panY) / oldScale;
  state.scale = nextScale;
  state.panX = cursor.x - graphX * nextScale;
  state.panY = cursor.y - graphY * nextScale;
  applyTransform();
}

function clientToSvg(clientX, clientY) {
  const point = graph.svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = graph.svg.getScreenCTM();
  return matrix ? point.matrixTransform(matrix.inverse()) : { x: clientX, y: clientY };
}

function setScale(nextScale) {
  state.scale = clamp(nextScale, 0.45, 2.1);
  applyTransform();
}

function resetView() {
  state.scale = window.innerWidth < 800 ? 0.56 : 0.82;
  state.panX = window.innerWidth < 800 ? 24 : 80;
  state.panY = 35;
  applyTransform();
}

function applyTransform() {
  graph.transform.setAttribute("transform", `translate(${state.panX} ${state.panY}) scale(${state.scale})`);
}

function applyVisibility() {
  const selectedNeighbors = neighborSet(state.selectedId);
  let visible = 0;

  document.querySelectorAll(".knowledge-node").forEach((element) => {
    const id = element.dataset.nodeId;
    const item = nodeById.get(id);
    const domainMatch = state.domain === "all" || item.domain === state.domain;
    const queryMatch = !state.query || `${item.title} ${item.id} ${item.summary} ${item.topics.join(" ")}`.toLowerCase().includes(state.query);
    const isVisible = domainMatch && queryMatch;
    element.classList.toggle("hidden", !isVisible);
    element.classList.toggle("selected", id === state.selectedId);
    element.classList.toggle("path-node", state.pathMode && llmPath.has(id));
    element.classList.toggle("dimmed", Boolean(state.selectedId) && !selectedNeighbors.has(id) && id !== state.selectedId);
    if (isVisible) visible += 1;
  });

  document.querySelectorAll(".edge").forEach((element) => {
    const source = nodeById.get(element.dataset.source);
    const target = nodeById.get(element.dataset.target);
    const domainMatch = state.domain === "all" || (source.domain === state.domain && target.domain === state.domain);
    const queryMatch = !state.query || (matchesQuery(source) && matchesQuery(target));
    const pathMatch = state.pathMode && llmPath.has(source.id) && llmPath.has(target.id);
    const selectedMatch = state.selectedId && (source.id === state.selectedId || target.id === state.selectedId);
    const shouldFade = (!domainMatch || !queryMatch) || (state.pathMode && !pathMatch) || (state.selectedId && !selectedMatch);
    element.classList.toggle("hidden", shouldFade);
    element.classList.toggle("highlighted", pathMatch || selectedMatch);
  });

  document.getElementById("visibleCount").textContent = `${visible} 个节点`;
}

function matchesQuery(item) {
  if (!state.query) return true;
  return `${item.title} ${item.id} ${item.summary} ${item.topics.join(" ")}`.toLowerCase().includes(state.query);
}

function neighborSet(id) {
  if (!id) return new Set();
  return new Set([...(incoming.get(id) || []), ...(outgoing.get(id) || [])]);
}

function selectNode(id, updateHash) {
  const item = nodeById.get(id);
  if (!item) return;
  state.selectedId = id;
  document.querySelector(".workspace").classList.add("detail-open");
  renderDetail(item);
  applyVisibility();
  if (updateHash && location.hash !== `#course/${id}`) history.pushState(null, "", `#course/${id}`);
}

function clearSelection() {
  state.selectedId = null;
  applyVisibility();
}

function closeDetail() {
  state.selectedId = null;
  document.querySelector(".workspace").classList.remove("detail-open");
  history.replaceState(null, "", `${location.pathname}${location.search}#home`);
  applyVisibility();
}

function selectFromHash() {
  const match = location.hash.match(/^#course\/(.+)$/);
  if (match && nodeById.has(match[1])) selectNode(match[1], false);
}

function renderDetail(item) {
  const template = document.getElementById("detailTemplate");
  const fragment = template.content.cloneNode(true);
  const domain = fragment.querySelector(".detail-domain");
  domain.textContent = DOMAIN_LABELS[item.domain];
  domain.classList.add(item.domain);
  fragment.querySelector(".detail-level").textContent = LEVEL_LABELS[item.level];
  fragment.querySelector(".detail-title").textContent = item.title;
  fragment.querySelector(".detail-summary").textContent = item.summary;
  fragment.querySelector(".detail-hours").textContent = `${item.hours} h`;

  const prereqs = incoming.get(item.id) || [];
  const next = outgoing.get(item.id) || [];
  fragment.querySelector(".detail-prereq-count").textContent = `${prereqs.length}`;

  const topicList = fragment.querySelector(".detail-topics");
  item.topics.forEach((topic) => {
    const li = document.createElement("li");
    li.textContent = topic;
    topicList.appendChild(li);
  });

  fillChips(fragment.querySelector(".detail-prerequisites"), prereqs, "无严格前置课程");
  fillChips(fragment.querySelector(".detail-next"), next, "当前暂无后续节点");

  fragment.querySelector(".course-button").addEventListener("click", () => {
    location.hash = `course/${item.id}`;
    document.querySelector(".detail-content").scrollTo({ top: 0, behavior: "smooth" });
  });

  const container = document.getElementById("detailContent");
  container.replaceChildren(fragment);
  container.scrollTop = 0;
}

function fillChips(container, ids, emptyText) {
  if (!ids.length) {
    const chip = document.createElement("span");
    chip.className = "chip empty";
    chip.textContent = emptyText;
    container.appendChild(chip);
    return;
  }

  ids.forEach((id) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = nodeById.get(id)?.title || id;
    chip.addEventListener("click", () => selectNode(id, true));
    container.appendChild(chip);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
