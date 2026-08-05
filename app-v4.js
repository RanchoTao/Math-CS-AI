(async () => {
  "use strict";

  const catalog = await window.loadAtlasCatalog();
  const normalize = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).map(([id, item]) => ({ id: item?.id ?? id, ...(item || {}) }));
  };

  const clusters = normalize(catalog.clusters);
  const nodes = normalize(catalog.nodes);
  const curricula = normalize(catalog.curricula);
  const paths = normalize(catalog.paths);

  const DOMAIN_ORDER = ["math", "cs", "ai"];
  const DOMAIN_LABELS = { math: "纯数学", cs: "计算机科学", ai: "人工智能" };
  const TYPE_LABELS = { course: "课程级知识", practice: "实践与规范", tool: "工具与环境", frontier: "研究方向" };
  const STAGE_LABELS = ["初等基础", "语言与思维", "本科核心", "基础支柱", "经典分支", "桥梁学科", "高级核心", "统一框架", "研究前沿"];
  const TITLE_BY_ID = {
    python: "程序设计基础", cpp: "系统程序设计", transformer: "注意力变换器", llm: "大语言模型",
    agents: "人工智能体", "ai-agent": "人工智能体", "ai-systems": "人工智能系统",
    "scientific-ml": "科学机器学习", nlp: "自然语言处理", "computer-vision": "计算机视觉",
    "reinforcement-learning": "强化学习", "world-models": "世界模型",
  };
  const REPLACEMENTS = [
    [/Artificial Intelligence/gi, "人工智能"], [/Computer Science/gi, "计算机科学"], [/Pure Mathematics/gi, "纯数学"],
    [/Machine Learning/gi, "机器学习"], [/Deep Learning/gi, "深度学习"], [/World Models?/gi, "世界模型"],
    [/AI Agents?/gi, "人工智能体"], [/AI Systems?/gi, "人工智能系统"], [/Transformer/gi, "注意力变换器"],
    [/Large Language Models?/gi, "大语言模型"], [/\bLLM\b/g, "大语言模型"], [/\bNLP\b/g, "自然语言处理"],
    [/\bCV\b/g, "计算机视觉"], [/\bRL\b/g, "强化学习"], [/\bRAG\b/g, "检索增强生成"],
    [/\bMLOps\b/g, "机器学习工程运维"], [/Bayesian/gi, "贝叶斯"], [/Monte Carlo/gi, "蒙特卡洛"],
    [/Markov/gi, "马尔可夫"], [/Serverless/gi, "无服务器计算"],
  ];

  const CONFIG = {
    domainWidth: 760,
    domainGap: 92,
    worldPadding: 76,
    domainBottomPadding: 82,
    stageGap: 24,
    stageHeaderHeight: 58,
    stagePadding: 16,
    nodeWidth: 220,
    nodeHeight: 44,
    nodeGapX: 12,
    nodeGapY: 8,
    preloadMargin: 460,
    maxMountedStages: 12,
    minScale: 0.18,
    maxScale: 1.55,
  };

  const nodeById = new Map(nodes.map((node) => [String(node.id), node]));
  const clusterById = new Map(clusters.map((cluster) => [String(cluster.id), cluster]));
  const clusterOrder = new Map(clusters.map((cluster, index) => [String(cluster.id), Number(cluster.order ?? index)]));

  const elements = {
    workspace: document.getElementById("workspace"),
    homeButton: document.getElementById("homeButton"),
    domainFilters: document.getElementById("domainFilters"),
    curriculumSelect: document.getElementById("curriculumSelect"),
    curriculumDescription: document.getElementById("curriculumDescription"),
    stageFilters: document.getElementById("stageFilters"),
    pathButtons: document.getElementById("pathButtons"),
    catalogStats: document.getElementById("catalogStats"),
    visibleCount: document.getElementById("visibleCount"),
    chunkStats: document.getElementById("chunkStats"),
    searchInput: document.getElementById("searchInput"),
    searchResults: document.getElementById("searchResults"),
    viewport: document.getElementById("mapViewport"),
    world: document.getElementById("graphTransform"),
    canvas: document.getElementById("edgeCanvas"),
    detailContent: document.getElementById("detailContent"),
    closeDetail: document.getElementById("closeDetail"),
    detailTemplate: document.getElementById("nodeDetailTemplate"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
    resetView: document.getElementById("resetView"),
  };

  for (const [name, element] of Object.entries(elements)) {
    if (name === "chunkStats") continue;
    if (!element) throw new Error(`页面元素缺失：${name}`);
  }

  const state = {
    domain: "all",
    stages: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
    curriculum: "all",
    path: null,
    selected: null,
    scale: 0.72,
    x: 0,
    y: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    panStartX: 0,
    panStartY: 0,
    raf: 0,
  };

  let layout = {
    worldWidth: 1,
    worldHeight: 1,
    visibleNodes: [],
    domains: [],
    stages: [],
    stageById: new Map(),
    stageByNodeId: new Map(),
    nodeBoxes: new Map(),
  };
  const mountedStages = new Map();

  function zh(value) {
    if (value === null || value === undefined) return "";
    let text = String(value);
    for (const [pattern, replacement] of REPLACEMENTS) text = text.replace(pattern, replacement);
    return text;
  }

  const nodeTitle = (node) => TITLE_BY_ID[node.id] || zh(node.title);
  const clusterTitle = (cluster) => zh(cluster?.title || "未分类知识");
  const domainLabel = (domain) => DOMAIN_LABELS[domain] || "跨学科知识";
  const stageLabel = (stage) => `第${stage}层 · ${STAGE_LABELS[stage] || "专业知识"}`;
  const typeLabel = (type) => TYPE_LABELS[type] || "知识节点";

  function extractIds(item) {
    if (!item || typeof item !== "object") return [];
    for (const candidate of [item.nodes, item.nodeIds, item.requiredNodes, item.required, item.members, item.ids, item.path]) {
      if (!Array.isArray(candidate)) continue;
      return candidate.map((entry) => typeof entry === "string" ? entry : entry?.id || entry?.nodeId).filter(Boolean).map(String);
    }
    return [];
  }

  function curriculumTitle(item) {
    const raw = `${item?.id || ""} ${item?.title || item?.name || ""}`.toLowerCase();
    if (raw.includes("public") || raw.includes("all") || raw.includes("公共")) return "公共知识图谱";
    if (raw.includes("common") || raw.includes("core") || raw.includes("共同")) return "共同核心路线";
    if (raw.includes("personal") || raw.includes("research") || raw.includes("个人")) return "个人研究主线";
    return zh(item?.title || item?.name || "自定义培养方案");
  }

  function pathTitle(item, index) {
    const raw = `${item?.id || ""} ${item?.title || item?.name || ""}`.toLowerCase();
    if (raw.includes("llm") || raw.includes("language")) return "大语言模型主干";
    if (raw.includes("system")) return "计算机系统主干";
    if (raw.includes("pure") || raw.includes("modern-math") || raw.includes("现代纯数学")) return "现代纯数学主干";
    if (raw.includes("life") || raw.includes("digital")) return "数字生命研究主干";
    return zh(item?.title || item?.name || `示例路线${index + 1}`);
  }

  function selectedCurriculumSet() {
    if (state.curriculum === "all") return null;
    const item = curricula.find((entry) => String(entry.id) === state.curriculum);
    const ids = extractIds(item);
    return ids.length ? new Set(ids) : null;
  }

  function selectedPathSet() {
    if (!state.path) return null;
    const item = paths.find((entry) => String(entry.id) === state.path);
    const ids = extractIds(item);
    return ids.length ? new Set(ids) : null;
  }

  function isVisible(node) {
    if (state.domain !== "all" && node.domain !== state.domain) return false;
    if (!state.stages.has(Number(node.stage))) return false;
    const curriculum = selectedCurriculumSet();
    return !curriculum || curriculum.has(String(node.id));
  }

  function nextNodeIds(id) {
    return nodes
      .filter((node) => Array.isArray(node.prerequisites) && node.prerequisites.map(String).includes(String(id)))
      .map((node) => String(node.id));
  }

  function stageWidth(stage) {
    const factor = 0.62 + (8 - stage) * 0.0475;
    return Math.round(CONFIG.domainWidth * Math.min(1, factor));
  }

  function buildLayout() {
    const visibleNodes = nodes.filter(isVisible);
    const activeDomains = DOMAIN_ORDER.filter((domain) => visibleNodes.some((node) => node.domain === domain));
    const domains = [];
    const stageChunks = [];
    const stageById = new Map();
    const stageByNodeId = new Map();
    const nodeBoxes = new Map();
    let maxHeight = 0;

    activeDomains.forEach((domain, domainIndex) => {
      const domainNodes = visibleNodes.filter((node) => node.domain === domain);
      const baseX = CONFIG.worldPadding + domainIndex * (CONFIG.domainWidth + CONFIG.domainGap);
      const stageSpecs = [];

      for (let stage = 8; stage >= 0; stage -= 1) {
        const stageNodes = domainNodes
          .filter((node) => Number(node.stage) === stage)
          .sort((a, b) => {
            const clusterDiff = (clusterOrder.get(String(a.cluster)) ?? 0) - (clusterOrder.get(String(b.cluster)) ?? 0);
            return clusterDiff || nodeTitle(a).localeCompare(nodeTitle(b), "zh-CN");
          });
        if (!stageNodes.length) continue;

        const width = stageWidth(stage);
        const usable = width - CONFIG.stagePadding * 2;
        const columns = Math.max(1, Math.min(3, Math.floor((usable + CONFIG.nodeGapX) / (CONFIG.nodeWidth + CONFIG.nodeGapX))));
        const actualNodeWidth = (usable - (columns - 1) * CONFIG.nodeGapX) / columns;
        const rows = Math.ceil(stageNodes.length / columns);
        const height = CONFIG.stageHeaderHeight + CONFIG.stagePadding * 2 + rows * CONFIG.nodeHeight + Math.max(0, rows - 1) * CONFIG.nodeGapY;
        stageSpecs.push({ domain, stage, nodes: stageNodes, width, columns, actualNodeWidth, height });
      }

      const towerHeight = stageSpecs.reduce((sum, spec) => sum + spec.height, 0) + Math.max(0, stageSpecs.length - 1) * CONFIG.stageGap + CONFIG.domainBottomPadding;
      maxHeight = Math.max(maxHeight, towerHeight);
      let cursorY = CONFIG.worldPadding;

      stageSpecs.forEach((spec) => {
        const x = baseX + (CONFIG.domainWidth - spec.width) / 2;
        const y = cursorY;
        const id = `${domain}-stage-${spec.stage}`;
        const chunk = { id, x, y, w: spec.width, h: spec.height, ...spec };
        stageChunks.push(chunk);
        stageById.set(id, chunk);

        spec.nodes.forEach((node, index) => {
          const col = index % spec.columns;
          const row = Math.floor(index / spec.columns);
          const box = {
            id: String(node.id),
            stageId: id,
            domain,
            x: x + CONFIG.stagePadding + col * (spec.actualNodeWidth + CONFIG.nodeGapX),
            y: y + CONFIG.stageHeaderHeight + CONFIG.stagePadding + row * (CONFIG.nodeHeight + CONFIG.nodeGapY),
            localX: CONFIG.stagePadding + col * (spec.actualNodeWidth + CONFIG.nodeGapX),
            localY: CONFIG.stageHeaderHeight + CONFIG.stagePadding + row * (CONFIG.nodeHeight + CONFIG.nodeGapY),
            w: spec.actualNodeWidth,
            h: CONFIG.nodeHeight,
          };
          nodeBoxes.set(String(node.id), box);
          stageByNodeId.set(String(node.id), id);
        });

        cursorY += spec.height + CONFIG.stageGap;
      });

      domains.push({
        domain,
        x: baseX,
        y: CONFIG.worldPadding,
        w: CONFIG.domainWidth,
        h: towerHeight,
        count: domainNodes.length,
      });
    });

    const worldWidth = CONFIG.worldPadding * 2 + activeDomains.length * CONFIG.domainWidth + Math.max(0, activeDomains.length - 1) * CONFIG.domainGap;
    const worldHeight = CONFIG.worldPadding * 2 + maxHeight;
    layout = { worldWidth, worldHeight, visibleNodes, domains, stages: stageChunks, stageById, stageByNodeId, nodeBoxes };
    elements.world.style.width = `${worldWidth}px`;
    elements.world.style.height = `${worldHeight}px`;
    elements.visibleCount.textContent = `${visibleNodes.length} 个节点`;

    domains.forEach((domain) => {
      const shell = document.createElement("section");
      shell.className = `tower-domain ${domain.domain}`;
      shell.style.left = `${domain.x}px`;
      shell.style.top = `${domain.y}px`;
      shell.style.width = `${domain.w}px`;
      shell.style.height = `${domain.h}px`;
      const title = document.createElement("div");
      title.className = "tower-domain-title";
      title.textContent = `${domainLabel(domain.domain)} · ${domain.count} 个节点`;
      shell.appendChild(title);
      elements.world.appendChild(shell);
    });
  }

  function renderControls() {
    elements.stageFilters.replaceChildren();
    for (let stage = 0; stage <= 8; stage += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stage-button active";
      button.dataset.stage = String(stage);
      button.textContent = `第${stage}层`;
      button.title = STAGE_LABELS[stage];
      elements.stageFilters.appendChild(button);
    }

    elements.curriculumSelect.replaceChildren();
    elements.curriculumSelect.add(new Option("公共知识图谱", "all"));
    curricula.forEach((item, index) => elements.curriculumSelect.add(new Option(curriculumTitle(item), String(item.id || `curriculum-${index}`))));

    elements.pathButtons.replaceChildren();
    paths.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "path-button";
      button.dataset.path = String(item.id || `path-${index}`);
      button.textContent = pathTitle(item, index);
      elements.pathButtons.appendChild(button);
    });
    updateCurriculumDescription();
  }

  function updateCurriculumDescription() {
    if (state.curriculum === "all") {
      elements.curriculumDescription.textContent = "显示全部公共知识节点。";
      return;
    }
    const item = curricula.find((entry) => String(entry.id) === state.curriculum);
    elements.curriculumDescription.textContent = zh(item?.description || item?.summary || "仅显示该培养方案覆盖的知识节点。");
  }

  function createNodeCard(node) {
    const box = layout.nodeBoxes.get(String(node.id));
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tower-node ${node.domain} ${node.type || "course"}`;
    button.dataset.nodeId = String(node.id);
    button.style.left = `${box.localX}px`;
    button.style.top = `${box.localY}px`;
    button.style.width = `${box.w}px`;
    button.style.height = `${box.h}px`;

    const pathSet = selectedPathSet();
    if (pathSet?.has(String(node.id))) button.classList.add("path-node");
    if (pathSet && !pathSet.has(String(node.id))) button.classList.add("path-dimmed");

    const title = document.createElement("strong");
    title.textContent = nodeTitle(node);
    const meta = document.createElement("span");
    meta.className = "tower-cluster-tag";
    meta.textContent = `${clusterTitle(clusterById.get(String(node.cluster)))} · ${typeLabel(node.type)}`;
    button.append(title, meta);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNode(String(node.id), true);
    });
    return button;
  }

  function mountStage(chunk) {
    const section = document.createElement("section");
    section.className = `tower-stage ${chunk.domain}`;
    section.dataset.stageId = chunk.id;
    section.style.left = `${chunk.x}px`;
    section.style.top = `${chunk.y}px`;
    section.style.width = `${chunk.w}px`;
    section.style.height = `${chunk.h}px`;

    const header = document.createElement("header");
    header.className = "tower-stage-header";
    const index = document.createElement("span");
    index.className = "tower-stage-index";
    index.textContent = `L${chunk.stage}`;
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = STAGE_LABELS[chunk.stage];
    const description = document.createElement("p");
    description.textContent = `同层节点并列排列；由此向上进入更高阶段。`;
    titleWrap.append(title, description);
    const count = document.createElement("span");
    count.className = "tower-stage-count";
    count.textContent = `${chunk.nodes.length} 个节点`;
    header.append(index, titleWrap, count);
    section.appendChild(header);
    chunk.nodes.forEach((node) => section.appendChild(createNodeCard(node)));
    elements.world.appendChild(section);
    mountedStages.set(chunk.id, section);
  }

  function unmountStage(id) {
    mountedStages.get(id)?.remove();
    mountedStages.delete(id);
  }

  function worldRect(margin = 0) {
    const scale = Math.max(state.scale, 0.001);
    return {
      left: (-state.x) / scale - margin,
      top: (-state.y) / scale - margin,
      right: (elements.viewport.clientWidth - state.x) / scale + margin,
      bottom: (elements.viewport.clientHeight - state.y) / scale + margin,
    };
  }

  function intersects(a, b) {
    return !(b.x + b.w < a.left || b.x > a.right || b.y + b.h < a.top || b.y > a.bottom);
  }

  function forcedStageIds() {
    const ids = new Set();
    if (state.selected) {
      const node = nodeById.get(state.selected);
      const related = [state.selected, ...(node?.prerequisites || []), ...(node?.recommended || []), ...nextNodeIds(state.selected)];
      related.forEach((id) => {
        const stageId = layout.stageByNodeId.get(String(id));
        if (stageId) ids.add(stageId);
      });
    }
    const pathSet = selectedPathSet();
    pathSet?.forEach((id) => {
      const stageId = layout.stageByNodeId.get(String(id));
      if (stageId) ids.add(stageId);
    });
    return ids;
  }

  function updateVirtualStages() {
    const rect = worldRect(CONFIG.preloadMargin);
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;
    const forced = forcedStageIds();
    const candidates = layout.stages
      .filter((chunk) => intersects(rect, chunk) || forced.has(chunk.id))
      .sort((a, b) => {
        const af = forced.has(a.id) ? -1 : 0;
        const bf = forced.has(b.id) ? -1 : 0;
        if (af !== bf) return af - bf;
        const ad = (a.x + a.w / 2 - cx) ** 2 + (a.y + a.h / 2 - cy) ** 2;
        const bd = (b.x + b.w / 2 - cx) ** 2 + (b.y + b.h / 2 - cy) ** 2;
        return ad - bd;
      })
      .slice(0, CONFIG.maxMountedStages);

    const wanted = new Set(candidates.map((chunk) => chunk.id));
    [...mountedStages.keys()].forEach((id) => { if (!wanted.has(id)) unmountStage(id); });
    candidates.forEach((chunk) => { if (!mountedStages.has(chunk.id)) mountStage(chunk); });

    elements.catalogStats.textContent = `${nodes.length} 个知识节点 · ${layout.stages.length} 个阶段区块`;
    if (elements.chunkStats) elements.chunkStats.textContent = `当前加载 ${mountedStages.size}/${layout.stages.length} 个阶段区块`;
  }

  function applyTransform() {
    elements.world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function screenPoint(point) {
    return { x: state.x + point.x * state.scale, y: state.y + point.y * state.scale };
  }

  function nodePorts(sourceBox, targetBox) {
    const sourceCenterX = sourceBox.x + sourceBox.w / 2;
    const targetCenterX = targetBox.x + targetBox.w / 2;
    const deltaX = targetCenterX - sourceCenterX;
    if (Math.abs(deltaX) > 28) {
      const leftToRight = deltaX > 0;
      return {
        source: { x: leftToRight ? sourceBox.x + sourceBox.w : sourceBox.x, y: sourceBox.y + sourceBox.h / 2 },
        target: { x: leftToRight ? targetBox.x : targetBox.x + targetBox.w, y: targetBox.y + targetBox.h / 2 },
        mode: "horizontal",
        direction: leftToRight ? 1 : -1,
      };
    }
    return {
      source: { x: sourceBox.x + sourceBox.w, y: sourceBox.y + sourceBox.h / 2 },
      target: { x: targetBox.x + targetBox.w, y: targetBox.y + targetBox.h / 2 },
      mode: "right-rail",
      direction: -1,
    };
  }

  function drawArrow(ctx, x, y, angle, color, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.62);
    ctx.lineTo(-size, size * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawConnection(ctx, sourceBox, targetBox, style) {
    const ports = nodePorts(sourceBox, targetBox);
    const source = screenPoint(ports.source);
    const target = screenPoint(ports.target);
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.alpha;
    if (style.dashed) ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);

    let angle;
    if (ports.mode === "horizontal") {
      const dx = target.x - source.x;
      const bend = Math.max(36, Math.abs(dx) * 0.38);
      ctx.bezierCurveTo(source.x + bend * ports.direction, source.y, target.x - bend * ports.direction, target.y, target.x, target.y);
      angle = ports.direction > 0 ? 0 : Math.PI;
    } else {
      const railX = Math.max(source.x, target.x) + 54 * state.scale;
      ctx.bezierCurveTo(railX, source.y, railX, target.y, target.x, target.y);
      angle = Math.PI;
    }
    ctx.stroke();
    drawArrow(ctx, target.x, target.y, angle, style.color, Math.max(5, 6 * Math.min(1.1, state.scale + 0.25)));
    ctx.restore();
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, elements.viewport.clientWidth);
    const height = Math.max(1, elements.viewport.clientHeight);
    elements.canvas.width = Math.floor(width * dpr);
    elements.canvas.height = Math.floor(height * dpr);
    elements.canvas.style.width = `${width}px`;
    elements.canvas.style.height = `${height}px`;
    const ctx = elements.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawEdges(ctx) {
    const selected = state.selected;
    const pathSet = selectedPathSet();
    if (!selected && !pathSet) return;

    const edges = [];
    if (selected) {
      const selectedNode = nodeById.get(selected);
      (selectedNode?.prerequisites || []).forEach((sourceId) => edges.push({ sourceId: String(sourceId), targetId: selected, type: "prerequisite" }));
      (selectedNode?.recommended || []).forEach((sourceId) => edges.push({ sourceId: String(sourceId), targetId: selected, type: "recommended" }));
      nextNodeIds(selected).forEach((targetId) => edges.push({ sourceId: selected, targetId, type: "prerequisite" }));
    } else if (pathSet) {
      for (const target of layout.visibleNodes) {
        const targetId = String(target.id);
        if (!pathSet.has(targetId)) continue;
        (target.prerequisites || []).forEach((sourceId) => {
          const source = String(sourceId);
          if (pathSet.has(source)) edges.push({ sourceId: source, targetId, type: "prerequisite" });
        });
      }
    }

    edges.slice(0, 80).forEach((edge) => {
      const sourceBox = layout.nodeBoxes.get(edge.sourceId);
      const targetBox = layout.nodeBoxes.get(edge.targetId);
      if (!sourceBox || !targetBox) return;
      drawConnection(ctx, sourceBox, targetBox, {
        color: edge.type === "recommended" ? "rgba(159,190,207,.9)" : "rgba(114,213,187,.96)",
        width: edge.type === "recommended" ? 1.45 : 2,
        alpha: 1,
        dashed: edge.type === "recommended",
      });
    });
  }

  function updateNodeStates() {
    const neighbors = new Set();
    if (state.selected) {
      const node = nodeById.get(state.selected);
      (node?.prerequisites || []).map(String).forEach((id) => neighbors.add(id));
      (node?.recommended || []).map(String).forEach((id) => neighbors.add(id));
      nextNodeIds(state.selected).forEach((id) => neighbors.add(id));
    }
    elements.world.querySelectorAll(".tower-node").forEach((element) => {
      const id = element.dataset.nodeId;
      element.classList.toggle("selected", id === state.selected);
      element.classList.toggle("neighbor", Boolean(state.selected && neighbors.has(id)));
      element.classList.toggle("unrelated", Boolean(state.selected && id !== state.selected && !neighbors.has(id)));
    });
  }

  function renderFrame() {
    state.raf = 0;
    applyTransform();
    updateVirtualStages();
    updateNodeStates();
    const ctx = resizeCanvas();
    ctx.clearRect(0, 0, elements.viewport.clientWidth, elements.viewport.clientHeight);
    drawEdges(ctx);
  }

  function scheduleFrame() {
    if (!state.raf) state.raf = requestAnimationFrame(renderFrame);
  }

  function resetViewToBase() {
    const availableWidth = Math.max(340, elements.viewport.clientWidth - 48);
    const domainTargetWidth = state.domain === "all" ? layout.worldWidth : Math.min(layout.worldWidth, CONFIG.domainWidth + CONFIG.worldPadding * 2);
    state.scale = Math.max(0.42, Math.min(0.82, availableWidth / domainTargetWidth));
    state.x = (elements.viewport.clientWidth - layout.worldWidth * state.scale) / 2;
    const scaledHeight = layout.worldHeight * state.scale;
    state.y = scaledHeight > elements.viewport.clientHeight
      ? elements.viewport.clientHeight - scaledHeight - 22
      : (elements.viewport.clientHeight - scaledHeight) / 2;
    scheduleFrame();
  }

  function zoomAt(factor, clientX, clientY) {
    const rect = elements.viewport.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const oldScale = state.scale;
    const nextScale = Math.max(CONFIG.minScale, Math.min(CONFIG.maxScale, oldScale * factor));
    const worldX = (x - state.x) / oldScale;
    const worldY = (y - state.y) / oldScale;
    state.scale = nextScale;
    state.x = x - worldX * nextScale;
    state.y = y - worldY * nextScale;
    scheduleFrame();
  }

  function fillChips(container, ids) {
    container.replaceChildren();
    const valid = (Array.isArray(ids) ? ids : []).map((id) => nodeById.get(String(id))).filter(Boolean);
    if (!valid.length) {
      const empty = document.createElement("span");
      empty.className = "empty-chip";
      empty.textContent = "无明确要求";
      container.appendChild(empty);
      return;
    }
    valid.forEach((node) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "detail-chip";
      button.textContent = nodeTitle(node);
      button.addEventListener("click", () => focusNode(String(node.id)));
      container.appendChild(button);
    });
  }

  function renderDetail(node) {
    const fragment = elements.detailTemplate.content.cloneNode(true);
    const domain = fragment.querySelector(".detail-domain");
    domain.textContent = domainLabel(node.domain);
    domain.classList.add(node.domain);
    fragment.querySelector(".detail-stage").textContent = stageLabel(Number(node.stage));
    fragment.querySelector(".detail-type").textContent = typeLabel(node.type);
    fragment.querySelector(".detail-title").textContent = nodeTitle(node);
    fragment.querySelector(".detail-cluster").textContent = `所属学科群：${clusterTitle(clusterById.get(String(node.cluster)))}`;
    fragment.querySelector(".detail-summary").textContent = zh(node.summary || "该节点的课程说明正在补充。");
    const topics = fragment.querySelector(".detail-topics");
    const list = Array.isArray(node.topics) && node.topics.length ? node.topics : ["核心内容正在整理。"];
    list.forEach((topic) => {
      const item = document.createElement("li");
      item.textContent = zh(topic);
      topics.appendChild(item);
    });
    fillChips(fragment.querySelector(".detail-prerequisites"), node.prerequisites);
    fillChips(fragment.querySelector(".detail-recommended"), node.recommended);
    fillChips(fragment.querySelector(".detail-next"), nextNodeIds(node.id));
    elements.detailContent.replaceChildren(fragment);
  }

  function selectNode(id, openPanel) {
    const node = nodeById.get(String(id));
    if (!node) return;
    state.selected = String(id);
    renderDetail(node);
    if (openPanel) elements.workspace.classList.add("detail-open");
    scheduleFrame();
  }

  function focusNode(id) {
    const node = nodeById.get(String(id));
    if (!node) return;
    if (!isVisible(node)) {
      state.domain = "all";
      state.curriculum = "all";
      state.stages.add(Number(node.stage));
      rebuildLayout(false);
      updateControlStates();
    }
    const box = layout.nodeBoxes.get(String(id));
    if (!box) return;
    state.scale = Math.max(state.scale, 0.72);
    state.x = elements.viewport.clientWidth / 2 - (box.x + box.w / 2) * state.scale;
    state.y = elements.viewport.clientHeight / 2 - (box.y + box.h / 2) * state.scale;
    selectNode(String(id), true);
  }

  function renderSearch(query) {
    const normalized = query.trim().toLowerCase();
    elements.searchResults.replaceChildren();
    if (!normalized) {
      elements.searchResults.hidden = true;
      return;
    }
    const matches = nodes.filter((node) => {
      const haystack = [nodeTitle(node), node.summary, ...(node.tags || []), ...(node.topics || [])].map(zh).join(" ").toLowerCase();
      return haystack.includes(normalized);
    }).slice(0, 12);

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.textContent = "没有找到匹配的知识节点";
      elements.searchResults.appendChild(empty);
    } else {
      matches.forEach((node) => {
        const button = document.createElement("button");
        button.type = "button";
        const strong = document.createElement("strong");
        strong.textContent = nodeTitle(node);
        const meta = document.createElement("span");
        meta.textContent = `${domainLabel(node.domain)} · ${clusterTitle(clusterById.get(String(node.cluster)))}`;
        button.append(strong, meta);
        button.addEventListener("click", () => {
          elements.searchResults.hidden = true;
          elements.searchInput.value = nodeTitle(node);
          focusNode(String(node.id));
        });
        elements.searchResults.appendChild(button);
      });
    }
    elements.searchResults.hidden = false;
  }

  function updateControlStates() {
    elements.domainFilters.querySelectorAll("[data-domain]").forEach((button) => button.classList.toggle("active", button.dataset.domain === state.domain));
    elements.stageFilters.querySelectorAll("[data-stage]").forEach((button) => button.classList.toggle("active", state.stages.has(Number(button.dataset.stage))));
    elements.curriculumSelect.value = state.curriculum;
    elements.pathButtons.querySelectorAll("[data-path]").forEach((button) => button.classList.toggle("active", button.dataset.path === state.path));
  }

  function rebuildLayout(resetPosition = true) {
    [...mountedStages.keys()].forEach(unmountStage);
    elements.world.replaceChildren();
    buildLayout();
    if (resetPosition) resetViewToBase();
    else scheduleFrame();
  }

  elements.domainFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-domain]");
    if (!button) return;
    state.domain = button.dataset.domain;
    state.selected = null;
    updateControlStates();
    rebuildLayout(true);
  });

  elements.stageFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stage]");
    if (!button) return;
    const stage = Number(button.dataset.stage);
    if (state.stages.has(stage) && state.stages.size > 1) state.stages.delete(stage);
    else state.stages.add(stage);
    state.selected = null;
    updateControlStates();
    rebuildLayout(true);
  });

  elements.curriculumSelect.addEventListener("change", () => {
    state.curriculum = elements.curriculumSelect.value;
    state.selected = null;
    updateCurriculumDescription();
    rebuildLayout(true);
  });

  elements.pathButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-path]");
    if (!button) return;
    state.path = state.path === button.dataset.path ? null : button.dataset.path;
    updateControlStates();
    [...mountedStages.keys()].forEach(unmountStage);
    scheduleFrame();
  });

  elements.searchInput.addEventListener("input", () => renderSearch(elements.searchInput.value));
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      elements.searchInput.value = "";
      renderSearch("");
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrap")) elements.searchResults.hidden = true;
  });

  elements.closeDetail.addEventListener("click", () => {
    elements.workspace.classList.remove("detail-open");
    state.selected = null;
    scheduleFrame();
  });

  elements.homeButton.addEventListener("click", () => {
    state.domain = "all";
    state.curriculum = "all";
    state.path = null;
    state.selected = null;
    state.stages = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    elements.workspace.classList.remove("detail-open");
    updateControlStates();
    updateCurriculumDescription();
    rebuildLayout(true);
  });

  elements.zoomIn.addEventListener("click", () => {
    const rect = elements.viewport.getBoundingClientRect();
    zoomAt(1.18, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  elements.zoomOut.addEventListener("click", () => {
    const rect = elements.viewport.getBoundingClientRect();
    zoomAt(1 / 1.18, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  elements.resetView.addEventListener("click", resetViewToBase);

  elements.viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? 1.09 : 1 / 1.09, event.clientX, event.clientY);
  }, { passive: false });

  elements.viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".tower-node, button, input, select, a")) return;
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.panStartX = state.x;
    state.panStartY = state.y;
    elements.viewport.classList.add("dragging");
    elements.viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  elements.viewport.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.x = state.panStartX + event.clientX - state.dragStartX;
    state.y = state.panStartY + event.clientY - state.dragStartY;
    scheduleFrame();
  });

  function stopDragging(event) {
    if (!state.dragging) return;
    state.dragging = false;
    elements.viewport.classList.remove("dragging");
    if (event?.pointerId !== undefined && elements.viewport.hasPointerCapture(event.pointerId)) elements.viewport.releasePointerCapture(event.pointerId);
  }

  elements.viewport.addEventListener("pointerup", stopDragging);
  elements.viewport.addEventListener("pointercancel", stopDragging);
  window.addEventListener("resize", scheduleFrame);

  renderControls();
  updateControlStates();
  buildLayout();
  resetViewToBase();
})().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:32px;color:#e7f1f7;background:#071018;min-height:100vh;font-family:system-ui"><h1>知识图谱加载失败</h1><p>${String(error.message || error)}</p></main>`;
});
