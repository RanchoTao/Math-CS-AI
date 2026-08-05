(async () => {
  "use strict";

  const catalog = await window.loadAtlasCatalog();

  const normalize = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).map(([id, item]) => ({ id, ...(item || {}) }));
  };

  const clusters = normalize(catalog.clusters);
  const nodes = normalize(catalog.nodes);
  const curricula = normalize(catalog.curricula);
  const paths = normalize(catalog.paths);

  const DOMAIN_ORDER = ["math", "cs", "ai"];
  const DOMAIN_LABELS = { math: "纯数学", cs: "计算机科学", ai: "人工智能" };
  const DOMAIN_COLORS = { math: "#d8aa4e", cs: "#55a9d8", ai: "#a97ae7" };
  const TYPE_LABELS = {
    course: "课程级知识",
    practice: "实践与规范",
    tool: "工具与环境",
    frontier: "研究方向",
  };
  const STAGE_LABELS = [
    "初等基础", "语言与思维", "本科核心", "基础支柱", "经典分支",
    "桥梁学科", "高级核心", "统一框架", "研究前沿",
  ];
  const TITLE_BY_ID = {
    python: "程序设计基础",
    cpp: "系统程序设计",
    transformer: "注意力变换器",
    llm: "大语言模型",
    agents: "人工智能体",
    "ai-agent": "人工智能体",
    "ai-systems": "人工智能系统",
    "scientific-ml": "科学机器学习",
    nlp: "自然语言处理",
    "computer-vision": "计算机视觉",
    "reinforcement-learning": "强化学习",
    "world-models": "世界模型",
  };
  const TEXT_REPLACEMENTS = [
    [/Artificial Intelligence/gi, "人工智能"],
    [/Computer Science/gi, "计算机科学"],
    [/Pure Mathematics/gi, "纯数学"],
    [/Machine Learning/gi, "机器学习"],
    [/Deep Learning/gi, "深度学习"],
    [/World Models?/gi, "世界模型"],
    [/AI Agents?/gi, "人工智能体"],
    [/AI Systems?/gi, "人工智能系统"],
    [/Transformer/gi, "注意力变换器"],
    [/Large Language Models?/gi, "大语言模型"],
    [/\bLLM\b/g, "大语言模型"],
    [/\bNLP\b/g, "自然语言处理"],
    [/\bCV\b/g, "计算机视觉"],
    [/\bRL\b/g, "强化学习"],
    [/\bRAG\b/g, "检索增强生成"],
    [/\bMLOps\b/g, "机器学习工程运维"],
    [/\bGPU\b/g, "图形处理器"],
    [/Bayesian/gi, "贝叶斯"],
    [/Monte Carlo/gi, "蒙特卡洛"],
    [/Markov/gi, "马尔可夫"],
    [/Serverless/gi, "无服务器计算"],
  ];

  const CONFIG = {
    domainWidth: 390,
    domainGap: 72,
    worldPadding: 72,
    domainHeaderHeight: 82,
    clusterGap: 28,
    clusterPadding: 16,
    clusterHeaderHeight: 76,
    stageLabelHeight: 24,
    stageGap: 10,
    nodeHeight: 44,
    nodeGap: 7,
    preloadMargin: 520,
    maxMountedChunks: 14,
    maxEdges: 360,
  };

  const nodeById = new Map(nodes.map((node) => [String(node.id), node]));
  const clusterById = new Map(clusters.map((cluster) => [String(cluster.id), cluster]));

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
    scale: 0.8,
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
    chunks: [],
    chunkById: new Map(),
    chunkByNodeId: new Map(),
    nodeBoxes: new Map(),
  };
  const mountedChunks = new Map();

  function zhText(value) {
    if (value === null || value === undefined) return "";
    let text = String(value);
    for (const [pattern, replacement] of TEXT_REPLACEMENTS) text = text.replace(pattern, replacement);
    return text;
  }

  const nodeTitle = (node) => TITLE_BY_ID[node.id] || zhText(node.title);
  const clusterTitle = (cluster) => zhText(cluster?.title || "未分类知识");
  const domainLabel = (domain) => DOMAIN_LABELS[domain] || "跨学科知识";
  const stageLabel = (stage) => `第${stage}层 · ${STAGE_LABELS[stage] || "专业知识"}`;
  const typeLabel = (type) => TYPE_LABELS[type] || "知识节点";

  function extractIds(item) {
    if (!item || typeof item !== "object") return [];
    for (const candidate of [item.nodes, item.nodeIds, item.requiredNodes, item.required, item.members, item.ids, item.path]) {
      if (!Array.isArray(candidate)) continue;
      return candidate
        .map((entry) => typeof entry === "string" ? entry : entry?.id || entry?.nodeId)
        .filter(Boolean)
        .map(String);
    }
    return [];
  }

  function curriculumTitle(item) {
    const raw = `${item?.id || ""} ${item?.title || item?.name || ""}`.toLowerCase();
    if (raw.includes("public") || raw.includes("all") || raw.includes("公共")) return "公共知识图谱";
    if (raw.includes("common") || raw.includes("core") || raw.includes("共同")) return "共同核心路线";
    if (raw.includes("personal") || raw.includes("research") || raw.includes("个人")) return "个人研究主线";
    return zhText(item?.title || item?.name || "自定义培养方案");
  }

  function pathTitle(item, index) {
    const raw = `${item?.id || ""} ${item?.title || item?.name || ""}`.toLowerCase();
    if (raw.includes("llm") || raw.includes("language")) return "大语言模型主干";
    if (raw.includes("system")) return "计算机系统主干";
    if (raw.includes("pure") || raw.includes("modern-math") || raw.includes("现代纯数学")) return "现代纯数学主干";
    if (raw.includes("life") || raw.includes("digital")) return "数字生命研究主干";
    return zhText(item?.title || item?.name || `示例路线${index + 1}`);
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
    const curriculumSet = selectedCurriculumSet();
    return !curriculumSet || curriculumSet.has(String(node.id));
  }

  function nextNodeIds(id) {
    return nodes
      .filter((node) => Array.isArray(node.prerequisites) && node.prerequisites.map(String).includes(String(id)))
      .map((node) => String(node.id));
  }

  function buildLayout() {
    const visibleNodes = nodes.filter(isVisible);
    const chunks = [];
    const domains = [];
    const chunkById = new Map();
    const chunkByNodeId = new Map();
    const nodeBoxes = new Map();
    let maxBottom = CONFIG.worldPadding + CONFIG.domainHeaderHeight;

    DOMAIN_ORDER.forEach((domain, domainIndex) => {
      const domainNodes = visibleNodes.filter((node) => node.domain === domain);
      if (!domainNodes.length) return;

      const x = CONFIG.worldPadding + domainIndex * (CONFIG.domainWidth + CONFIG.domainGap);
      let y = CONFIG.worldPadding + CONFIG.domainHeaderHeight;
      const domainClusterIds = [];
      const domainClusters = clusters
        .filter((cluster) => cluster.domain === domain)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || Number(a.stage ?? 0) - Number(b.stage ?? 0));

      for (const cluster of domainClusters) {
        const clusterNodes = domainNodes
          .filter((node) => String(node.cluster) === String(cluster.id))
          .sort((a, b) => Number(a.stage) - Number(b.stage) || nodeTitle(a).localeCompare(nodeTitle(b), "zh-CN"));
        if (!clusterNodes.length) continue;

        const groups = [];
        const byStage = new Map();
        clusterNodes.forEach((node) => {
          const stage = Number(node.stage);
          if (!byStage.has(stage)) byStage.set(stage, []);
          byStage.get(stage).push(node);
        });

        let cursor = CONFIG.clusterHeaderHeight;
        for (const stage of [...byStage.keys()].sort((a, b) => a - b)) {
          cursor += CONFIG.stageLabelHeight;
          const stageNodes = byStage.get(stage);
          const group = { stage, labelY: cursor - CONFIG.stageLabelHeight, nodes: [] };
          for (const node of stageNodes) {
            const box = {
              id: String(node.id),
              chunkId: String(cluster.id),
              domain,
              x: x + CONFIG.clusterPadding,
              y: y + cursor,
              localY: cursor,
              w: CONFIG.domainWidth - CONFIG.clusterPadding * 2,
              h: CONFIG.nodeHeight,
            };
            nodeBoxes.set(String(node.id), box);
            chunkByNodeId.set(String(node.id), String(cluster.id));
            group.nodes.push(node);
            cursor += CONFIG.nodeHeight + CONFIG.nodeGap;
          }
          cursor += CONFIG.stageGap;
          groups.push(group);
        }

        const height = cursor + CONFIG.clusterPadding;
        const chunk = {
          id: String(cluster.id),
          domain,
          title: clusterTitle(cluster),
          summary: zhText(cluster.summary || ""),
          x,
          y,
          w: CONFIG.domainWidth,
          h: height,
          nodes: clusterNodes,
          groups,
        };
        chunks.push(chunk);
        chunkById.set(chunk.id, chunk);
        domainClusterIds.push(chunk.id);
        y += height + CONFIG.clusterGap;
      }

      const bottom = Math.max(CONFIG.worldPadding + CONFIG.domainHeaderHeight + 120, y - CONFIG.clusterGap + 22);
      domains.push({ domain, x, y: CONFIG.worldPadding, w: CONFIG.domainWidth, h: bottom - CONFIG.worldPadding, count: domainNodes.length, chunkIds: domainClusterIds });
      maxBottom = Math.max(maxBottom, bottom);
    });

    const activeDomainCount = Math.max(1, domains.length);
    const worldWidth = CONFIG.worldPadding * 2 + activeDomainCount * CONFIG.domainWidth + Math.max(0, activeDomainCount - 1) * CONFIG.domainGap;
    layout = {
      worldWidth,
      worldHeight: maxBottom + CONFIG.worldPadding,
      visibleNodes,
      domains,
      chunks,
      chunkById,
      chunkByNodeId,
      nodeBoxes,
    };
    elements.world.style.width = `${layout.worldWidth}px`;
    elements.world.style.height = `${layout.worldHeight}px`;
    elements.visibleCount.textContent = `${visibleNodes.length} 个节点`;
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
    curricula.forEach((item, index) => {
      elements.curriculumSelect.add(new Option(curriculumTitle(item), String(item.id || `curriculum-${index}`)));
    });

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
    elements.curriculumDescription.textContent = zhText(item?.description || item?.summary || "仅显示该培养方案覆盖的知识节点。");
  }

  function createNodeCard(node) {
    const box = layout.nodeBoxes.get(String(node.id));
    const button = document.createElement("button");
    button.type = "button";
    button.className = `virtual-node ${node.domain} ${node.type || "course"}`;
    button.dataset.nodeId = String(node.id);
    button.style.top = `${box.localY}px`;
    button.style.left = `${CONFIG.clusterPadding}px`;
    button.style.width = `${box.w}px`;
    button.style.height = `${box.h}px`;
    if (state.selected === String(node.id)) button.classList.add("selected");
    const pathSet = selectedPathSet();
    if (pathSet?.has(String(node.id))) button.classList.add("path-node");
    if (pathSet && !pathSet.has(String(node.id))) button.classList.add("path-dimmed");

    const title = document.createElement("strong");
    title.textContent = nodeTitle(node);
    const meta = document.createElement("span");
    meta.textContent = `${stageLabel(Number(node.stage))} · ${typeLabel(node.type)}`;
    button.append(title, meta);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNode(String(node.id), true);
    });
    return button;
  }

  function mountChunk(chunk) {
    const section = document.createElement("section");
    section.className = `virtual-chunk ${chunk.domain}`;
    section.dataset.chunkId = chunk.id;
    section.style.left = `${chunk.x}px`;
    section.style.top = `${chunk.y}px`;
    section.style.width = `${chunk.w}px`;
    section.style.height = `${chunk.h}px`;

    const header = document.createElement("header");
    header.className = "virtual-chunk-header";
    const title = document.createElement("h3");
    title.textContent = chunk.title;
    const count = document.createElement("span");
    count.textContent = `${chunk.nodes.length} 个节点`;
    header.append(title, count);
    if (chunk.summary) {
      const summary = document.createElement("p");
      summary.textContent = chunk.summary;
      header.appendChild(summary);
    }
    section.appendChild(header);

    for (const group of chunk.groups) {
      const label = document.createElement("div");
      label.className = "virtual-stage-label";
      label.style.top = `${group.labelY}px`;
      label.textContent = stageLabel(group.stage);
      section.appendChild(label);
      group.nodes.forEach((node) => section.appendChild(createNodeCard(node)));
    }

    elements.world.appendChild(section);
    mountedChunks.set(chunk.id, section);
  }

  function unmountChunk(id) {
    const element = mountedChunks.get(id);
    if (element) element.remove();
    mountedChunks.delete(id);
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

  function intersects(rect, item) {
    return !(item.x + item.w < rect.left || item.x > rect.right || item.y + item.h < rect.top || item.y > rect.bottom);
  }

  function chunkDistance(chunk, cx, cy) {
    const x = chunk.x + chunk.w / 2;
    const y = chunk.y + chunk.h / 2;
    return (x - cx) ** 2 + (y - cy) ** 2;
  }

  function forcedChunkIds() {
    const ids = new Set();
    if (state.selected) {
      const related = [state.selected, ...(nodeById.get(state.selected)?.prerequisites || []), ...(nodeById.get(state.selected)?.recommended || []), ...nextNodeIds(state.selected)];
      related.forEach((id) => {
        const chunkId = layout.chunkByNodeId.get(String(id));
        if (chunkId) ids.add(chunkId);
      });
    }
    const pathSet = selectedPathSet();
    if (pathSet) {
      pathSet.forEach((id) => {
        const chunkId = layout.chunkByNodeId.get(String(id));
        if (chunkId) ids.add(chunkId);
      });
    }
    return ids;
  }

  function updateVirtualChunks() {
    const rect = worldRect(CONFIG.preloadMargin);
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;
    const forced = forcedChunkIds();
    const candidates = layout.chunks
      .filter((chunk) => intersects(rect, chunk) || forced.has(chunk.id))
      .sort((a, b) => {
        const af = forced.has(a.id) ? -1 : 0;
        const bf = forced.has(b.id) ? -1 : 0;
        if (af !== bf) return af - bf;
        return chunkDistance(a, centerX, centerY) - chunkDistance(b, centerX, centerY);
      })
      .slice(0, CONFIG.maxMountedChunks);

    const wanted = new Set(candidates.map((chunk) => chunk.id));
    for (const id of [...mountedChunks.keys()]) {
      if (!wanted.has(id)) unmountChunk(id);
    }
    for (const chunk of candidates) {
      if (!mountedChunks.has(chunk.id)) mountChunk(chunk);
    }

    const stats = `${nodes.length} 个知识节点 · ${layout.chunks.length} 个区块 · 当前加载 ${mountedChunks.size} 个区块`;
    elements.catalogStats.textContent = stats;
    if (elements.chunkStats) elements.chunkStats.textContent = `已加载 ${mountedChunks.size}/${layout.chunks.length} 区块`;
  }

  function applyTransform() {
    elements.world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function screenPoint(point) {
    return { x: state.x + point.x * state.scale, y: state.y + point.y * state.scale };
  }

  function nodePorts(sourceBox, targetBox) {
    const horizontalGap = targetBox.x > sourceBox.x + sourceBox.w || sourceBox.x > targetBox.x + targetBox.w;
    if (horizontalGap) {
      const leftToRight = targetBox.x >= sourceBox.x;
      return {
        source: { x: leftToRight ? sourceBox.x + sourceBox.w : sourceBox.x, y: sourceBox.y + sourceBox.h / 2 },
        target: { x: leftToRight ? targetBox.x : targetBox.x + targetBox.w, y: targetBox.y + targetBox.h / 2 },
        horizontal: true,
      };
    }
    const downward = targetBox.y >= sourceBox.y;
    return {
      source: { x: sourceBox.x + sourceBox.w, y: sourceBox.y + sourceBox.h / 2 },
      target: { x: targetBox.x + targetBox.w, y: targetBox.y + targetBox.h / 2 },
      horizontal: false,
      downward,
    };
  }

  function drawArrow(ctx, x, y, angle, color, size = 5) {
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

  function drawCurve(ctx, sourceBox, targetBox, style) {
    const ports = nodePorts(sourceBox, targetBox);
    const source = screenPoint(ports.source);
    const target = screenPoint(ports.target);
    const scale = state.scale;
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.alpha;
    if (style.dashed) ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);

    let endAngle = 0;
    if (ports.horizontal) {
      const dx = target.x - source.x;
      const bend = Math.max(32, Math.abs(dx) * 0.42);
      const direction = dx >= 0 ? 1 : -1;
      ctx.bezierCurveTo(source.x + bend * direction, source.y, target.x - bend * direction, target.y, target.x, target.y);
      endAngle = direction > 0 ? 0 : Math.PI;
    } else {
      const railOffset = 34 * scale;
      const railX = Math.max(source.x, target.x) + railOffset;
      ctx.bezierCurveTo(railX, source.y, railX, target.y, target.x, target.y);
      endAngle = Math.atan2(target.y - source.y, target.x - railX);
    }
    ctx.stroke();
    drawArrow(ctx, target.x, target.y, endAngle, style.color, Math.max(4, 5.5 * Math.min(1, scale + 0.15)));
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

  function drawBackdrop(ctx) {
    const visibleRect = worldRect(80);
    for (const domain of layout.domains) {
      if (!intersects(visibleRect, domain)) continue;
      const p = screenPoint({ x: domain.x, y: domain.y });
      ctx.save();
      ctx.strokeStyle = `${DOMAIN_COLORS[domain.domain]}55`;
      ctx.fillStyle = `${DOMAIN_COLORS[domain.domain]}09`;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, domain.w * state.scale, domain.h * state.scale, 18 * state.scale);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = DOMAIN_COLORS[domain.domain];
      ctx.globalAlpha = 0.92;
      ctx.font = `700 ${Math.max(15, 24 * state.scale)}px system-ui`;
      ctx.fillText(domainLabel(domain.domain), p.x + 18 * state.scale, p.y + 34 * state.scale);
      ctx.globalAlpha = 0.65;
      ctx.font = `${Math.max(9, 11 * state.scale)}px system-ui`;
      ctx.fillText(`${domain.count} 个知识节点`, p.x + 18 * state.scale, p.y + 54 * state.scale);
      ctx.restore();
    }

    for (const chunk of layout.chunks) {
      if (mountedChunks.has(chunk.id) || !intersects(visibleRect, chunk)) continue;
      const p = screenPoint({ x: chunk.x, y: chunk.y });
      ctx.save();
      ctx.strokeStyle = `${DOMAIN_COLORS[chunk.domain]}3d`;
      ctx.fillStyle = "rgba(7,16,24,.56)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, chunk.w * state.scale, chunk.h * state.scale, 14 * state.scale);
      ctx.fill();
      ctx.stroke();
      if (state.scale > 0.34) {
        ctx.fillStyle = "rgba(226,238,245,.72)";
        ctx.font = `600 ${Math.max(9, 13 * state.scale)}px system-ui`;
        ctx.fillText(chunk.title, p.x + 14 * state.scale, p.y + 28 * state.scale);
      }
      ctx.restore();
    }
  }

  function drawEdges(ctx) {
    const mountedNodeIds = new Set();
    mountedChunks.forEach((_, chunkId) => {
      const chunk = layout.chunkById.get(chunkId);
      chunk?.nodes.forEach((node) => mountedNodeIds.add(String(node.id)));
    });

    const selected = state.selected;
    const pathSet = selectedPathSet();
    const edges = [];
    for (const target of layout.visibleNodes) {
      const targetId = String(target.id);
      if (!mountedNodeIds.has(targetId)) continue;
      for (const sourceIdRaw of target.prerequisites || []) {
        const sourceId = String(sourceIdRaw);
        if (!mountedNodeIds.has(sourceId)) continue;
        const sameChunk = layout.chunkByNodeId.get(sourceId) === layout.chunkByNodeId.get(targetId);
        const relevant = selected ? selected === sourceId || selected === targetId : pathSet ? pathSet.has(sourceId) && pathSet.has(targetId) : sameChunk;
        if (relevant) edges.push({ sourceId, targetId, type: "prerequisite", relevant: Boolean(selected || pathSet) });
      }
      for (const sourceIdRaw of target.recommended || []) {
        const sourceId = String(sourceIdRaw);
        if (!mountedNodeIds.has(sourceId)) continue;
        const relevant = selected ? selected === sourceId || selected === targetId : pathSet ? pathSet.has(sourceId) && pathSet.has(targetId) : false;
        if (relevant) edges.push({ sourceId, targetId, type: "recommended", relevant: true });
      }
    }

    edges.slice(0, CONFIG.maxEdges).forEach((edge) => {
      const sourceBox = layout.nodeBoxes.get(edge.sourceId);
      const targetBox = layout.nodeBoxes.get(edge.targetId);
      if (!sourceBox || !targetBox) return;
      const highlighted = edge.relevant;
      drawCurve(ctx, sourceBox, targetBox, {
        color: highlighted ? "rgba(114,213,187,.92)" : "rgba(116,146,164,.34)",
        width: highlighted ? 1.9 : 1,
        alpha: highlighted ? 1 : 0.72,
        dashed: edge.type === "recommended",
      });
    });
  }

  function updateNodeStates() {
    const selected = state.selected;
    const neighbors = new Set();
    if (selected) {
      const node = nodeById.get(selected);
      (node?.prerequisites || []).map(String).forEach((id) => neighbors.add(id));
      (node?.recommended || []).map(String).forEach((id) => neighbors.add(id));
      nextNodeIds(selected).forEach((id) => neighbors.add(id));
    }
    elements.world.querySelectorAll(".virtual-node").forEach((element) => {
      const id = element.dataset.nodeId;
      element.classList.toggle("selected", id === selected);
      element.classList.toggle("neighbor", Boolean(selected && neighbors.has(id)));
      element.classList.toggle("unrelated", Boolean(selected && id !== selected && !neighbors.has(id)));
    });
  }

  function renderFrame() {
    state.raf = 0;
    applyTransform();
    updateVirtualChunks();
    updateNodeStates();
    const ctx = resizeCanvas();
    ctx.clearRect(0, 0, elements.viewport.clientWidth, elements.viewport.clientHeight);
    drawBackdrop(ctx);
    drawEdges(ctx);
  }

  function scheduleFrame() {
    if (state.raf) return;
    state.raf = requestAnimationFrame(renderFrame);
  }

  function resetViewToTop() {
    const availableWidth = Math.max(320, elements.viewport.clientWidth - 52);
    state.scale = Math.max(0.52, Math.min(0.9, availableWidth / layout.worldWidth));
    state.x = (elements.viewport.clientWidth - layout.worldWidth * state.scale) / 2;
    state.y = 18;
    scheduleFrame();
  }

  function zoomAt(factor, clientX, clientY) {
    const rect = elements.viewport.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const oldScale = state.scale;
    const newScale = Math.max(0.2, Math.min(1.7, oldScale * factor));
    const worldX = (x - state.x) / oldScale;
    const worldY = (y - state.y) / oldScale;
    state.scale = newScale;
    state.x = x - worldX * newScale;
    state.y = y - worldY * newScale;
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
    fragment.querySelector(".detail-summary").textContent = zhText(node.summary || "该节点的课程说明正在补充。");
    const topics = fragment.querySelector(".detail-topics");
    const topicList = Array.isArray(node.topics) && node.topics.length ? node.topics : ["核心内容正在整理。"];
    topicList.forEach((topic) => {
      const item = document.createElement("li");
      item.textContent = zhText(topic);
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
    state.scale = Math.max(state.scale, 0.78);
    state.x = elements.viewport.clientWidth / 2 - (box.x + box.w / 2) * state.scale;
    state.y = elements.viewport.clientHeight / 2 - (box.y + box.h / 2) * state.scale;
    selectNode(String(id), true);
    scheduleFrame();
  }

  function renderSearch(query) {
    const normalized = query.trim().toLowerCase();
    elements.searchResults.replaceChildren();
    if (!normalized) {
      elements.searchResults.hidden = true;
      return;
    }
    const matches = nodes.filter((node) => {
      const haystack = [nodeTitle(node), node.summary, ...(node.tags || []), ...(node.topics || [])].map(zhText).join(" ").toLowerCase();
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
    elements.domainFilters.querySelectorAll("[data-domain]").forEach((button) => {
      button.classList.toggle("active", button.dataset.domain === state.domain);
    });
    elements.stageFilters.querySelectorAll("[data-stage]").forEach((button) => {
      button.classList.toggle("active", state.stages.has(Number(button.dataset.stage)));
    });
    elements.curriculumSelect.value = state.curriculum;
    elements.pathButtons.querySelectorAll("[data-path]").forEach((button) => {
      button.classList.toggle("active", button.dataset.path === state.path);
    });
  }

  function rebuildLayout(resetPosition = true) {
    for (const id of [...mountedChunks.keys()]) unmountChunk(id);
    elements.world.replaceChildren();
    buildLayout();
    if (resetPosition) resetViewToTop();
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
    for (const id of [...mountedChunks.keys()]) unmountChunk(id);
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
  elements.resetView.addEventListener("click", resetViewToTop);

  elements.viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? 1.09 : 1 / 1.09, event.clientX, event.clientY);
  }, { passive: false });

  elements.viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".virtual-node, button, input, select, a")) return;
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
    if (event?.pointerId !== undefined && elements.viewport.hasPointerCapture(event.pointerId)) {
      elements.viewport.releasePointerCapture(event.pointerId);
    }
  }

  elements.viewport.addEventListener("pointerup", stopDragging);
  elements.viewport.addEventListener("pointercancel", stopDragging);
  window.addEventListener("resize", scheduleFrame);

  renderControls();
  updateControlStates();
  buildLayout();
  resetViewToTop();
})().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:32px;color:#e7f1f7;background:#071018;min-height:100vh;font-family:system-ui"><h1>知识图谱加载失败</h1><p>${String(error.message || error)}</p></main>`;
});