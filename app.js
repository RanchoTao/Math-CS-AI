(async () => {
  "use strict";

  const catalog = await window.loadAtlasCatalog();
  const clusters = Array.isArray(catalog.clusters) ? catalog.clusters : [];
  const nodes = Array.isArray(catalog.nodes) ? catalog.nodes : [];
  const curricula = Array.isArray(catalog.curricula) ? catalog.curricula : [];
  const paths = Array.isArray(catalog.paths) ? catalog.paths : [];

  const DOMAIN_LABELS = {
    math: "纯数学",
    cs: "计算机科学",
    ai: "人工智能",
  };

  const TYPE_LABELS = {
    course: "课程级知识",
    practice: "实践与规范",
    tool: "工具与环境",
    frontier: "研究方向",
  };

  const STAGE_LABELS = [
    "初等基础",
    "语言与思维",
    "本科核心",
    "基础支柱",
    "经典分支",
    "桥梁学科",
    "高级核心",
    "统一框架",
    "研究前沿",
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

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));

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
    transform: document.getElementById("graphTransform"),
    canvas: document.getElementById("atlasCanvas"),
    edgeLayer: document.getElementById("edgeLayer"),
    detailPanel: document.getElementById("detailPanel"),
    detailContent: document.getElementById("detailContent"),
    closeDetail: document.getElementById("closeDetail"),
    detailTemplate: document.getElementById("nodeDetailTemplate"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
    resetView: document.getElementById("resetView"),
  };

  function zhText(value) {
    if (value === null || value === undefined) return "";
    let text = String(value);
    for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }
    return text;
  }

  function nodeTitle(node) {
    return TITLE_BY_ID[node.id] || zhText(node.title);
  }

  function clusterTitle(cluster) {
    return zhText(cluster?.title || "未分类知识");
  }

  function domainLabel(domain) {
    return DOMAIN_LABELS[domain] || "跨学科知识";
  }

  function stageLabel(stage) {
    return `第${stage}层 · ${STAGE_LABELS[stage] || "专业知识"}`;
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || "知识节点";
  }

  function extractIds(item) {
    if (!item || typeof item !== "object") return [];
    const candidates = [
      item.nodes,
      item.nodeIds,
      item.requiredNodes,
      item.required,
      item.members,
      item.ids,
      item.path,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .map((entry) => (typeof entry === "string" ? entry : entry?.id || entry?.nodeId))
          .filter(Boolean);
      }
    }
    return [];
  }

  function objectTitle(item, fallback) {
    return zhText(item?.title || item?.name || item?.label || fallback);
  }

  function curriculumTitle(item) {
    const raw = `${item?.id || ""} ${item?.title || item?.name || ""}`.toLowerCase();
    if (raw.includes("public") || raw.includes("all") || raw.includes("公共")) return "公共知识图谱";
    if (raw.includes("common") || raw.includes("core") || raw.includes("共同")) return "共同核心路线";
    if (raw.includes("personal") || raw.includes("research") || raw.includes("个人")) return "个人研究主线";
    return objectTitle(item, "自定义培养方案");
  }

  function pathTitle(item, index) {
    const raw = `${item?.id || ""} ${item?.title || item?.name || ""}`.toLowerCase();
    if (raw.includes("llm") || raw.includes("language")) return "大语言模型主干";
    if (raw.includes("system")) return "计算机系统主干";
    if (raw.includes("pure") || raw.includes("modern-math") || raw.includes("现代纯数学")) return "现代纯数学主干";
    if (raw.includes("life") || raw.includes("digital")) return "数字生命研究主干";
    return objectTitle(item, `示例路线${index + 1}`);
  }

  function curriculumSet() {
    if (state.curriculum === "all") return null;
    const curriculum = curricula.find((item) => String(item.id) === state.curriculum);
    const ids = extractIds(curriculum);
    return ids.length ? new Set(ids) : null;
  }

  function activePathSet() {
    if (!state.path) return null;
    const path = paths.find((item) => String(item.id) === state.path);
    const ids = extractIds(path);
    return ids.length ? new Set(ids) : null;
  }

  function isVisible(node) {
    if (state.domain !== "all" && node.domain !== state.domain) return false;
    if (!state.stages.has(Number(node.stage))) return false;
    const set = curriculumSet();
    if (set && !set.has(node.id)) return false;
    return true;
  }

  function nextNodeIds(id) {
    const result = [];
    for (const node of nodes) {
      const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
      if (prereqs.includes(id)) result.push(node.id);
    }
    return result;
  }

  function renderControls() {
    elements.stageFilters.innerHTML = "";
    for (let stage = 0; stage <= 8; stage += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stage-button active";
      button.dataset.stage = String(stage);
      button.textContent = `第${stage}层`;
      button.title = STAGE_LABELS[stage];
      elements.stageFilters.appendChild(button);
    }

    elements.curriculumSelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "公共知识图谱";
    elements.curriculumSelect.appendChild(allOption);

    curricula.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = String(item.id || `curriculum-${index}`);
      option.textContent = curriculumTitle(item);
      elements.curriculumSelect.appendChild(option);
    });

    elements.pathButtons.innerHTML = "";
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
    const curriculum = curricula.find((item) => String(item.id) === state.curriculum);
    elements.curriculumDescription.textContent = zhText(
      curriculum?.description || curriculum?.summary || "仅显示该培养方案覆盖的知识节点。",
    );
  }

  function createNodeCard(node, pathSet) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `knowledge-node ${node.domain} ${node.type || "course"}`;
    button.dataset.nodeId = node.id;
    if (state.selected === node.id) button.classList.add("selected");
    if (pathSet && pathSet.has(node.id)) button.classList.add("path-node");
    if (pathSet && !pathSet.has(node.id)) button.classList.add("path-dimmed");

    const title = document.createElement("strong");
    title.textContent = nodeTitle(node);

    const meta = document.createElement("span");
    meta.textContent = stageLabel(Number(node.stage));

    button.append(title, meta);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNode(node.id, true);
    });
    return button;
  }

  function renderAtlas() {
    const visibleNodes = nodes.filter(isVisible);
    const pathSet = activePathSet();
    elements.canvas.innerHTML = "";

    for (const domain of ["math", "cs", "ai"]) {
      const domainNodes = visibleNodes.filter((node) => node.domain === domain);
      if (!domainNodes.length) continue;

      const section = document.createElement("section");
      section.className = `domain-region ${domain}`;

      const header = document.createElement("header");
      header.className = "domain-header";
      const titleWrap = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = domainLabel(domain);
      const subtitle = document.createElement("p");
      subtitle.textContent = `${domainNodes.length} 个知识节点`;
      titleWrap.append(title, subtitle);
      header.append(titleWrap);
      section.appendChild(header);

      const clusterList = document.createElement("div");
      clusterList.className = "cluster-list";

      const domainClusters = clusters
        .filter((cluster) => cluster.domain === domain)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || Number(a.stage ?? 0) - Number(b.stage ?? 0));

      for (const cluster of domainClusters) {
        const clusterNodes = domainNodes
          .filter((node) => node.cluster === cluster.id)
          .sort((a, b) => Number(a.stage) - Number(b.stage) || nodeTitle(a).localeCompare(nodeTitle(b), "zh-CN"));
        if (!clusterNodes.length) continue;

        const group = document.createElement("section");
        group.className = `cluster-group ${domain}`;
        group.dataset.clusterId = cluster.id;

        const groupHeader = document.createElement("header");
        groupHeader.className = "cluster-header";
        const groupTitle = document.createElement("h3");
        groupTitle.textContent = clusterTitle(cluster);
        const groupMeta = document.createElement("span");
        const stages = clusterNodes.map((node) => Number(node.stage));
        const minStage = Math.min(...stages);
        const maxStage = Math.max(...stages);
        groupMeta.textContent = `${minStage === maxStage ? `第${minStage}层` : `第${minStage}—${maxStage}层`} · ${clusterNodes.length} 个节点`;
        groupHeader.append(groupTitle, groupMeta);

        if (cluster.summary) {
          const groupSummary = document.createElement("p");
          groupSummary.textContent = zhText(cluster.summary);
          groupHeader.appendChild(groupSummary);
        }

        const grid = document.createElement("div");
        grid.className = "cluster-node-grid";
        clusterNodes.forEach((node) => grid.appendChild(createNodeCard(node, pathSet)));

        group.append(groupHeader, grid);
        clusterList.appendChild(group);
      }

      const uncategorized = domainNodes.filter((node) => !clusterById.has(node.cluster));
      if (uncategorized.length) {
        const group = document.createElement("section");
        group.className = `cluster-group ${domain}`;
        const groupHeader = document.createElement("header");
        groupHeader.className = "cluster-header";
        groupHeader.innerHTML = `<h3>其他知识</h3><span>${uncategorized.length} 个节点</span>`;
        const grid = document.createElement("div");
        grid.className = "cluster-node-grid";
        uncategorized.forEach((node) => grid.appendChild(createNodeCard(node, pathSet)));
        group.append(groupHeader, grid);
        clusterList.appendChild(group);
      }

      section.appendChild(clusterList);
      elements.canvas.appendChild(section);
    }

    elements.visibleCount.textContent = `${visibleNodes.length} 个节点`;
    elements.catalogStats.textContent = `${nodes.length} 个知识节点 · ${clusters.length} 个学科群`;

    requestAnimationFrame(() => {
      sizeGraph();
      drawEdges();
    });
  }

  function elementCenter(element) {
    let x = element.offsetLeft + element.offsetWidth / 2;
    let y = element.offsetTop + element.offsetHeight / 2;
    let current = element.offsetParent;
    while (current && current !== elements.canvas) {
      x += current.offsetLeft;
      y += current.offsetTop;
      current = current.offsetParent;
    }
    return { x, y };
  }

  function sizeGraph() {
    const width = Math.max(elements.canvas.scrollWidth, elements.canvas.offsetWidth);
    const height = Math.max(elements.canvas.scrollHeight, elements.canvas.offsetHeight);
    elements.transform.style.width = `${width}px`;
    elements.transform.style.height = `${height}px`;
    elements.edgeLayer.setAttribute("width", String(width));
    elements.edgeLayer.setAttribute("height", String(height));
    elements.edgeLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  function edgePath(source, target) {
    const dx = target.x - source.x;
    const bend = Math.max(36, Math.abs(dx) * 0.38);
    const direction = dx >= 0 ? 1 : -1;
    const c1x = source.x + bend * direction;
    const c2x = target.x - bend * direction;
    return `M ${source.x} ${source.y} C ${c1x} ${source.y}, ${c2x} ${target.y}, ${target.x} ${target.y}`;
  }

  function drawEdges() {
    const nodeElements = new Map(
      Array.from(elements.canvas.querySelectorAll("[data-node-id]")).map((element) => [element.dataset.nodeId, element]),
    );
    elements.edgeLayer.querySelectorAll("path.graph-edge").forEach((path) => path.remove());

    const selectedNode = state.selected ? nodeById.get(state.selected) : null;
    const selectedNeighbors = new Set();
    if (selectedNode) {
      (selectedNode.prerequisites || []).forEach((id) => selectedNeighbors.add(id));
      (selectedNode.recommended || []).forEach((id) => selectedNeighbors.add(id));
      nextNodeIds(selectedNode.id).forEach((id) => selectedNeighbors.add(id));
    }

    for (const targetNode of nodes) {
      const targetElement = nodeElements.get(targetNode.id);
      if (!targetElement) continue;
      const prerequisites = Array.isArray(targetNode.prerequisites) ? targetNode.prerequisites : [];
      for (const sourceId of prerequisites) {
        const sourceElement = nodeElements.get(sourceId);
        if (!sourceElement) continue;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", edgePath(elementCenter(sourceElement), elementCenter(targetElement)));
        path.setAttribute("class", "graph-edge prerequisite");
        path.setAttribute("marker-end", "url(#arrow)");
        if (state.selected && (state.selected === sourceId || state.selected === targetNode.id)) {
          path.classList.add("highlighted");
        } else if (state.selected) {
          path.classList.add("dimmed");
        }
        elements.edgeLayer.appendChild(path);
      }
    }

    if (selectedNode) {
      const targetElement = nodeElements.get(selectedNode.id);
      if (targetElement) {
        for (const sourceId of selectedNode.recommended || []) {
          const sourceElement = nodeElements.get(sourceId);
          if (!sourceElement) continue;
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", edgePath(elementCenter(sourceElement), elementCenter(targetElement)));
          path.setAttribute("class", "graph-edge recommended highlighted");
          path.setAttribute("marker-end", "url(#arrow)");
          elements.edgeLayer.appendChild(path);
        }
      }
    }

    for (const [id, element] of nodeElements) {
      element.classList.toggle("neighbor", Boolean(state.selected && selectedNeighbors.has(id)));
      element.classList.toggle("unrelated", Boolean(state.selected && id !== state.selected && !selectedNeighbors.has(id)));
    }
  }

  function fillChips(container, ids) {
    container.innerHTML = "";
    const valid = (Array.isArray(ids) ? ids : []).map((id) => nodeById.get(id)).filter(Boolean);
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
      button.addEventListener("click", () => focusNode(node.id));
      container.appendChild(button);
    });
  }

  function selectNode(id, openPanel) {
    const node = nodeById.get(id);
    if (!node) return;
    state.selected = id;
    elements.canvas.querySelectorAll(".knowledge-node").forEach((element) => {
      element.classList.toggle("selected", element.dataset.nodeId === id);
    });
    drawEdges();
    renderDetail(node);
    if (openPanel) elements.workspace.classList.add("detail-open");
  }

  function renderDetail(node) {
    const fragment = elements.detailTemplate.content.cloneNode(true);
    const domain = fragment.querySelector(".detail-domain");
    domain.textContent = domainLabel(node.domain);
    domain.classList.add(node.domain);
    fragment.querySelector(".detail-stage").textContent = stageLabel(Number(node.stage));
    fragment.querySelector(".detail-type").textContent = typeLabel(node.type);
    fragment.querySelector(".detail-title").textContent = nodeTitle(node);
    fragment.querySelector(".detail-cluster").textContent = `所属学科群：${clusterTitle(clusterById.get(node.cluster))}`;
    fragment.querySelector(".detail-summary").textContent = zhText(node.summary || "该节点的课程说明正在补充。" );

    const topics = fragment.querySelector(".detail-topics");
    const topicList = Array.isArray(node.topics) ? node.topics : [];
    if (topicList.length) {
      topicList.forEach((topic) => {
        const item = document.createElement("li");
        item.textContent = zhText(topic);
        topics.appendChild(item);
      });
    } else {
      const item = document.createElement("li");
      item.textContent = "核心内容正在整理。";
      topics.appendChild(item);
    }

    fillChips(fragment.querySelector(".detail-prerequisites"), node.prerequisites);
    fillChips(fragment.querySelector(".detail-recommended"), node.recommended);
    fillChips(fragment.querySelector(".detail-next"), nextNodeIds(node.id));
    elements.detailContent.replaceChildren(fragment);
  }

  function focusNode(id) {
    const node = nodeById.get(id);
    if (!node) return;
    if (!isVisible(node)) {
      state.domain = "all";
      state.stages.add(Number(node.stage));
      state.curriculum = "all";
      updateControlStates();
      renderAtlas();
    }
    requestAnimationFrame(() => {
      const element = elements.canvas.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
      if (!element) return;
      const center = elementCenter(element);
      state.scale = Math.max(state.scale, 0.72);
      state.x = elements.viewport.clientWidth / 2 - center.x * state.scale;
      state.y = elements.viewport.clientHeight / 2 - center.y * state.scale;
      applyTransform();
      selectNode(id, true);
    });
  }

  function renderSearch(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      elements.searchResults.hidden = true;
      elements.searchResults.innerHTML = "";
      return;
    }
    const matches = nodes
      .filter((node) => {
        const haystack = [nodeTitle(node), node.summary, ...(node.tags || []), ...(node.topics || [])]
          .map(zhText)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 12);

    elements.searchResults.innerHTML = "";
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.textContent = "没有找到匹配的知识节点";
      elements.searchResults.appendChild(empty);
    } else {
      matches.forEach((node) => {
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = `<strong>${escapeHtml(nodeTitle(node))}</strong><span>${domainLabel(node.domain)} · ${escapeHtml(clusterTitle(clusterById.get(node.cluster)))}</span>`;
        button.addEventListener("click", () => {
          elements.searchResults.hidden = true;
          elements.searchInput.value = nodeTitle(node);
          focusNode(node.id);
        });
        elements.searchResults.appendChild(button);
      });
    }
    elements.searchResults.hidden = false;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
    elements.transform.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function fitView() {
    requestAnimationFrame(() => {
      sizeGraph();
      const width = elements.canvas.scrollWidth || 1;
      const height = elements.canvas.scrollHeight || 1;
      const availableWidth = Math.max(300, elements.viewport.clientWidth - 44);
      const availableHeight = Math.max(300, elements.viewport.clientHeight - 44);
      state.scale = Math.max(0.22, Math.min(1, availableWidth / width, availableHeight / height));
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
    const newScale = Math.max(0.18, Math.min(1.8, oldScale * factor));
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
    renderAtlas();
    fitView();
  });

  elements.stageFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stage]");
    if (!button) return;
    const stage = Number(button.dataset.stage);
    if (state.stages.has(stage) && state.stages.size > 1) state.stages.delete(stage);
    else state.stages.add(stage);
    state.selected = null;
    updateControlStates();
    renderAtlas();
    fitView();
  });

  elements.curriculumSelect.addEventListener("change", () => {
    state.curriculum = elements.curriculumSelect.value;
    state.selected = null;
    updateCurriculumDescription();
    renderAtlas();
    fitView();
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
    elements.canvas.querySelectorAll(".knowledge-node").forEach((element) => {
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
    renderAtlas();
    fitView();
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
    if (event.button !== 0 || event.target.closest(".knowledge-node")) return;
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.panStartX = state.x;
    state.panStartY = state.y;
    elements.viewport.classList.add("dragging");
    elements.viewport.setPointerCapture(event.pointerId);
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
    sizeGraph();
    drawEdges();
  });

  renderControls();
  renderAtlas();
  updateControlStates();
  fitView();
})().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:32px;color:#e7f1f7;background:#071018;min-height:100vh;font-family:system-ui"><h1>知识图谱加载失败</h1><p>${String(error.message || error)}</p></main>`;
});
