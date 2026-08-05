(async () => {
  "use strict";

  const rawCatalog = await window.loadAtlasCatalog();

  const normalizeCollection = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).map(([key, item]) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return { id: item.id ?? key, ...item };
      }
      return { id: key, title: String(item ?? key) };
    });
  };

  const clusters = normalizeCollection(rawCatalog.clusters);
  const nodes = normalizeCollection(rawCatalog.nodes);
  const curricula = normalizeCollection(rawCatalog.curricula);
  const paths = normalizeCollection(rawCatalog.paths);

  const DOMAIN_LABELS = { math: "纯数学", cs: "计算机科学", ai: "人工智能" };
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
    searchInput: document.getElementById("searchInput"),
    searchResults: document.getElementById("searchResults"),
    viewport: document.getElementById("mapViewport"),
    world: document.getElementById("graphTransform"),
    graphSvg: document.getElementById("knowledgeGraph"),
    edgeLayer: document.getElementById("edgeLayer"),
    detailContent: document.getElementById("detailContent"),
    closeDetail: document.getElementById("closeDetail"),
    detailTemplate: document.getElementById("nodeDetailTemplate"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
    resetView: document.getElementById("resetView"),
  };

  for (const [name, element] of Object.entries(elements)) {
    if (!element) throw new Error(`页面元素缺失：${name}`);
  }

  const state = {
    domain: "all",
    stages: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
    curriculum: "all",
    path: null,
    selected: null,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    panStartX: 0,
    panStartY: 0,
  };

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

  function createNodeCard(node, pathSet) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `knowledge-node ${node.domain} ${node.type || "course"}`;
    button.dataset.nodeId = String(node.id);
    if (state.selected === String(node.id)) button.classList.add("selected");
    if (pathSet?.has(String(node.id))) button.classList.add("path-node");
    if (pathSet && !pathSet.has(String(node.id))) button.classList.add("path-dimmed");

    const title = document.createElement("strong");
    title.textContent = nodeTitle(node);
    const meta = document.createElement("span");
    meta.textContent = stageLabel(Number(node.stage));
    button.append(title, meta);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNode(String(node.id), true);
    });
    return button;
  }

  function renderAtlas({ fit = false } = {}) {
    const visibleNodes = nodes.filter(isVisible);
    const pathSet = selectedPathSet();
    elements.world.replaceChildren();

    for (const domain of ["math", "cs", "ai"]) {
      const domainNodes = visibleNodes.filter((node) => node.domain === domain);
      if (!domainNodes.length) continue;

      const domainRegion = document.createElement("section");
      domainRegion.className = `domain-region ${domain}`;

      const domainHeader = document.createElement("header");
      domainHeader.className = "domain-header";
      const titleWrap = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = domainLabel(domain);
      const subtitle = document.createElement("p");
      subtitle.textContent = `${domainNodes.length} 个知识节点`;
      titleWrap.append(title, subtitle);
      domainHeader.appendChild(titleWrap);
      domainRegion.appendChild(domainHeader);

      const clusterList = document.createElement("div");
      clusterList.className = "cluster-list";
      const domainClusters = clusters
        .filter((cluster) => cluster.domain === domain)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || Number(a.stage ?? 0) - Number(b.stage ?? 0));

      for (const cluster of domainClusters) {
        const clusterNodes = domainNodes
          .filter((node) => String(node.cluster) === String(cluster.id))
          .sort((a, b) => Number(a.stage) - Number(b.stage) || nodeTitle(a).localeCompare(nodeTitle(b), "zh-CN"));
        if (!clusterNodes.length) continue;

        const group = document.createElement("section");
        group.className = `cluster-group ${domain}`;
        group.dataset.clusterId = String(cluster.id);

        const header = document.createElement("header");
        header.className = "cluster-header";
        const heading = document.createElement("h3");
        heading.textContent = clusterTitle(cluster);
        const meta = document.createElement("span");
        const stageValues = clusterNodes.map((node) => Number(node.stage));
        const minStage = Math.min(...stageValues);
        const maxStage = Math.max(...stageValues);
        meta.textContent = `${minStage === maxStage ? `第${minStage}层` : `第${minStage}—${maxStage}层`} · ${clusterNodes.length} 个节点`;
        header.append(heading, meta);
        if (cluster.summary) {
          const summary = document.createElement("p");
          summary.textContent = zhText(cluster.summary);
          header.appendChild(summary);
        }

        const grid = document.createElement("div");
        grid.className = "cluster-node-grid";
        clusterNodes.forEach((node) => grid.appendChild(createNodeCard(node, pathSet)));
        group.append(header, grid);
        clusterList.appendChild(group);
      }

      domainRegion.appendChild(clusterList);
      elements.world.appendChild(domainRegion);
    }

    elements.visibleCount.textContent = `${visibleNodes.length} 个节点`;
    elements.catalogStats.textContent = `${nodes.length} 个知识节点 · ${clusters.length} 个学科群`;

    requestAnimationFrame(() => {
      sizeWorld();
      drawEdges();
      if (fit) fitView();
    });
  }

  function elementCenter(element) {
    let x = element.offsetLeft + element.offsetWidth / 2;
    let y = element.offsetTop + element.offsetHeight / 2;
    let current = element.offsetParent;
    while (current && current !== elements.world) {
      x += current.offsetLeft;
      y += current.offsetTop;
      current = current.offsetParent;
    }
    return { x, y };
  }

  function sizeWorld() {
    const width = Math.max(elements.world.scrollWidth, elements.world.offsetWidth, 1);
    const height = Math.max(elements.world.scrollHeight, elements.world.offsetHeight, 1);
    elements.graphSvg.setAttribute("width", String(width));
    elements.graphSvg.setAttribute("height", String(height));
    elements.graphSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    elements.graphSvg.style.width = `${width}px`;
    elements.graphSvg.style.height = `${height}px`;
  }

  function edgePath(source, target) {
    const dx = target.x - source.x;
    const bend = Math.max(34, Math.abs(dx) * 0.36);
    const direction = dx >= 0 ? 1 : -1;
    return `M ${source.x} ${source.y} C ${source.x + bend * direction} ${source.y}, ${target.x - bend * direction} ${target.y}, ${target.x} ${target.y}`;
  }

  function drawEdges() {
    const nodeElements = new Map(
      Array.from(elements.world.querySelectorAll("[data-node-id]")).map((element) => [element.dataset.nodeId, element]),
    );
    elements.edgeLayer.replaceChildren();

    const selected = state.selected ? nodeById.get(state.selected) : null;
    const neighbors = new Set();
    if (selected) {
      (selected.prerequisites || []).map(String).forEach((id) => neighbors.add(id));
      (selected.recommended || []).map(String).forEach((id) => neighbors.add(id));
      nextNodeIds(state.selected).forEach((id) => neighbors.add(id));
    }

    const addEdge = (sourceId, targetId, type) => {
      const sourceElement = nodeElements.get(String(sourceId));
      const targetElement = nodeElements.get(String(targetId));
      if (!sourceElement || !targetElement) return;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", edgePath(elementCenter(sourceElement), elementCenter(targetElement)));
      path.setAttribute("class", `graph-edge ${type}`);
      path.setAttribute("marker-end", "url(#arrow)");
      if (state.selected && (state.selected === String(sourceId) || state.selected === String(targetId))) {
        path.classList.add("highlighted");
      } else if (state.selected) {
        path.classList.add("dimmed");
      }
      elements.edgeLayer.appendChild(path);
    };

    for (const target of nodes) {
      if (!nodeElements.has(String(target.id))) continue;
      (target.prerequisites || []).forEach((sourceId) => addEdge(sourceId, target.id, "prerequisite"));
      (target.recommended || []).forEach((sourceId) => addEdge(sourceId, target.id, "recommended"));
    }

    for (const [id, element] of nodeElements) {
      element.classList.toggle("neighbor", Boolean(state.selected && neighbors.has(id)));
      element.classList.toggle("unrelated", Boolean(state.selected && id !== state.selected && !neighbors.has(id)));
    }
  }

  function fillChips(container, ids) {
    container.replaceChildren();
    const validNodes = (Array.isArray(ids) ? ids : []).map((id) => nodeById.get(String(id))).filter(Boolean);
    if (!validNodes.length) {
      const empty = document.createElement("span");
      empty.className = "empty-chip";
      empty.textContent = "无明确要求";
      container.appendChild(empty);
      return;
    }
    validNodes.forEach((node) => {
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
    const topicList = Array.isArray(node.topics) ? node.topics : [];
    (topicList.length ? topicList : ["核心内容正在整理。"]).forEach((topic) => {
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
    elements.world.querySelectorAll(".knowledge-node").forEach((element) => {
      element.classList.toggle("selected", element.dataset.nodeId === state.selected);
    });
    drawEdges();
    renderDetail(node);
    if (openPanel) elements.workspace.classList.add("detail-open");
  }

  function focusNode(id) {
    const node = nodeById.get(String(id));
    if (!node) return;
    if (!isVisible(node)) {
      state.domain = "all";
      state.curriculum = "all";
      state.stages.add(Number(node.stage));
      updateControlStates();
      renderAtlas();
    }
    requestAnimationFrame(() => {
      const element = elements.world.querySelector(`[data-node-id="${CSS.escape(String(id))}"]`);
      if (!element) return;
      const center = elementCenter(element);
      state.scale = Math.max(state.scale, 0.72);
      state.x = elements.viewport.clientWidth / 2 - center.x * state.scale;
      state.y = elements.viewport.clientHeight / 2 - center.y * state.scale;
      applyTransform();
      selectNode(String(id), true);
    });
  }

  function renderSearch(query) {
    const normalized = query.trim().toLowerCase();
    elements.searchResults.replaceChildren();
    if (!normalized) {
      elements.searchResults.hidden = true;
      return;
    }

    const matches = nodes.filter((node) => {
      const haystack = [nodeTitle(node), node.summary, ...(node.tags || []), ...(node.topics || [])]
        .map(zhText).join(" ").toLowerCase();
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

  function applyTransform() {
    const transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    elements.world.style.transform = transform;
    elements.graphSvg.style.transform = transform;
  }

  function fitView() {
    requestAnimationFrame(() => {
      sizeWorld();
      const width = elements.world.scrollWidth || 1;
      const height = elements.world.scrollHeight || 1;
      const availableWidth = Math.max(300, elements.viewport.clientWidth - 44);
      const availableHeight = Math.max(300, elements.viewport.clientHeight - 44);
      state.scale = Math.max(0.18, Math.min(1, availableWidth / width, availableHeight / height));
      state.x = (elements.viewport.clientWidth - width * state.scale) / 2;
      state.y = 22;
      applyTransform();
    });
  }

  function zoomAt(factor, clientX, clientY) {
    const rect = elements.viewport.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const oldScale = state.scale;
    const newScale = Math.max(0.16, Math.min(1.9, oldScale * factor));
    const worldX = (x - state.x) / oldScale;
    const worldY = (y - state.y) / oldScale;
    state.scale = newScale;
    state.x = x - worldX * newScale;
    state.y = y - worldY * newScale;
    applyTransform();
  }

  elements.domainFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-domain]");
    if (!button) return;
    state.domain = button.dataset.domain;
    state.selected = null;
    updateControlStates();
    renderAtlas({ fit: true });
  });

  elements.stageFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stage]");
    if (!button) return;
    const stage = Number(button.dataset.stage);
    if (state.stages.has(stage) && state.stages.size > 1) state.stages.delete(stage);
    else state.stages.add(stage);
    state.selected = null;
    updateControlStates();
    renderAtlas({ fit: true });
  });

  elements.curriculumSelect.addEventListener("change", () => {
    state.curriculum = elements.curriculumSelect.value;
    state.selected = null;
    updateCurriculumDescription();
    renderAtlas({ fit: true });
  });

  elements.pathButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-path]");
    if (!button) return;
    state.path = state.path === button.dataset.path ? null : button.dataset.path;
    updateControlStates();
    renderAtlas();
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
    elements.world.querySelectorAll(".knowledge-node").forEach((element) => {
      element.classList.remove("selected", "neighbor", "unrelated");
    });
    drawEdges();
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
    renderAtlas({ fit: true });
  });

  elements.zoomIn.addEventListener("click", () => {
    const rect = elements.viewport.getBoundingClientRect();
    zoomAt(1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  elements.zoomOut.addEventListener("click", () => {
    const rect = elements.viewport.getBoundingClientRect();
    zoomAt(1 / 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  elements.resetView.addEventListener("click", fitView);

  elements.viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX, event.clientY);
  }, { passive: false });

  elements.viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".knowledge-node, button, input, select, a")) return;
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
    applyTransform();
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
  window.addEventListener("resize", () => {
    sizeWorld();
    drawEdges();
  });

  renderControls();
  updateControlStates();
  renderAtlas({ fit: true });
})().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:32px;color:#e7f1f7;background:#071018;min-height:100vh;font-family:system-ui"><h1>知识图谱加载失败</h1><p>${String(error.message || error)}</p></main>`;
});