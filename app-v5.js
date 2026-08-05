(async () => {
  "use strict";

  const response = await fetch("./app-v4.js?v=20260806-0232", { cache: "no-store" });
  if (!response.ok) throw new Error(`基础运行时代码加载失败：${response.status}`);
  let source = await response.text();

  const configReplacement = `  const CONFIG = {
    domainWidth: 1600,
    domainGap: 0,
    domainGapY: 104,
    worldPadding: 78,
    domainBottomPadding: 84,
    stageGap: 18,
    stageHeaderHeight: 58,
    stagePadding: 16,
    routeGutter: 48,
    routeLaneGap: 7,
    nodeWidth: 188,
    nodeHeight: 44,
    nodeGapX: 10,
    nodeGapY: 0,
    preloadMargin: 620,
    maxMountedStages: 13,
    minScale: 0.12,
    maxScale: 1.7,
  };`;

  const previousConfig = source;
  source = source.replace(/  const CONFIG = \{[\s\S]*?\n  \};/, configReplacement);
  if (source === previousConfig) throw new Error("无法替换知识塔布局参数");

  const buildLayoutReplacement = `  function buildLayout() {
    const visibleNodes = nodes.filter(isVisible);

    // 页面自上而下为：人工智能、计算机科学、纯数学。
    // 因而从页面底部向上探索时，顺序正好是：纯数学 → 计算机科学 → 人工智能。
    const verticalDomainOrder = ["ai", "cs", "math"];
    const activeDomains = verticalDomainOrder.filter((domain) => visibleNodes.some((node) => node.domain === domain));
    const domains = [];
    const stageChunks = [];
    const stageById = new Map();
    const stageByNodeId = new Map();
    const nodeBoxes = new Map();

    const domainSpecs = activeDomains.map((domain) => {
      const domainNodes = visibleNodes.filter((node) => node.domain === domain);
      const stageSpecs = [];

      // 每个领域内部是自下而上的塔：L0 在底部，L8 在顶部。
      // 页面坐标从上向下增长，所以按 L8 → L0 构建。
      for (let stage = 8; stage >= 0; stage -= 1) {
        const stageNodes = domainNodes
          .filter((node) => Number(node.stage) === stage)
          .sort((a, b) => {
            const clusterDiff = (clusterOrder.get(String(a.cluster)) ?? 0) - (clusterOrder.get(String(b.cluster)) ?? 0);
            return clusterDiff || nodeTitle(a).localeCompare(nodeTitle(b), "zh-CN");
          });
        if (!stageNodes.length) continue;

        // 一层严格只有一行，绝不换行；节点多时只向水平方向延伸。
        // 节点行上下预留专用连线通道，供同层关系绕行。
        const width = CONFIG.stagePadding * 2
          + stageNodes.length * CONFIG.nodeWidth
          + Math.max(0, stageNodes.length - 1) * CONFIG.nodeGapX;
        const height = CONFIG.stageHeaderHeight
          + CONFIG.stagePadding * 2
          + CONFIG.routeGutter * 2
          + CONFIG.nodeHeight;
        stageSpecs.push({
          domain,
          stage,
          nodes: stageNodes,
          width,
          columns: stageNodes.length,
          actualNodeWidth: CONFIG.nodeWidth,
          height,
        });
      }

      const widestStage = Math.max(760, ...stageSpecs.map((spec) => spec.width));
      const domainWidth = widestStage + 44;
      const domainHeight = stageSpecs.reduce((sum, spec) => sum + spec.height, 0)
        + Math.max(0, stageSpecs.length - 1) * CONFIG.stageGap
        + CONFIG.domainBottomPadding;

      return { domain, domainNodes, stageSpecs, domainWidth, domainHeight };
    });

    const worldWidth = CONFIG.worldPadding * 2 + Math.max(760, ...domainSpecs.map((spec) => spec.domainWidth));
    let cursorY = CONFIG.worldPadding;

    domainSpecs.forEach((domainSpec) => {
      const baseX = (worldWidth - domainSpec.domainWidth) / 2;
      const domainY = cursorY;
      let stageY = domainY;

      domainSpec.stageSpecs.forEach((spec) => {
        const x = baseX + (domainSpec.domainWidth - spec.width) / 2;
        const y = stageY;
        const id = spec.domain + "-stage-" + spec.stage;
        const chunk = { id, x, y, w: spec.width, h: spec.height, ...spec };
        stageChunks.push(chunk);
        stageById.set(id, chunk);

        spec.nodes.forEach((node, index) => {
          const localX = CONFIG.stagePadding + index * (CONFIG.nodeWidth + CONFIG.nodeGapX);
          const localY = CONFIG.stageHeaderHeight + CONFIG.stagePadding + CONFIG.routeGutter;
          const box = {
            id: String(node.id),
            stageId: id,
            domain: spec.domain,
            x: x + localX,
            y: y + localY,
            localX,
            localY,
            w: CONFIG.nodeWidth,
            h: CONFIG.nodeHeight,
          };
          nodeBoxes.set(String(node.id), box);
          stageByNodeId.set(String(node.id), id);
        });

        stageY += spec.height + CONFIG.stageGap;
      });

      domains.push({
        domain: domainSpec.domain,
        x: baseX,
        y: domainY,
        w: domainSpec.domainWidth,
        h: domainSpec.domainHeight,
        count: domainSpec.domainNodes.length,
      });

      cursorY += domainSpec.domainHeight + CONFIG.domainGapY;
    });

    const worldHeight = Math.max(1, cursorY - CONFIG.domainGapY + CONFIG.worldPadding);
    layout = {
      worldWidth,
      worldHeight,
      visibleNodes,
      domains,
      stages: stageChunks,
      stageById,
      stageByNodeId,
      nodeBoxes,
    };
    elements.world.style.width = String(worldWidth) + "px";
    elements.world.style.height = String(worldHeight) + "px";
    elements.visibleCount.textContent = String(visibleNodes.length) + " 个节点";

    domains.forEach((domain) => {
      const shell = document.createElement("section");
      shell.className = "tower-domain " + domain.domain;
      shell.style.left = String(domain.x) + "px";
      shell.style.top = String(domain.y) + "px";
      shell.style.width = String(domain.w) + "px";
      shell.style.height = String(domain.h) + "px";
      const title = document.createElement("div");
      title.className = "tower-domain-title";
      title.textContent = domainLabel(domain.domain) + " · " + String(domain.count) + " 个节点";
      shell.appendChild(title);
      elements.world.appendChild(shell);
    });
  }`;

  const buildPattern = /  function buildLayout\(\) \{[\s\S]*?\n  \}\n\n  function renderControls\(\)/;
  const previousBuild = source;
  source = source.replace(buildPattern, buildLayoutReplacement + "\n\n  function renderControls()");
  if (source === previousBuild) throw new Error("无法替换知识塔布局算法");

  const routingReplacement = `  function drawArrow(ctx, x, y, angle, color, size) {
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

  function stageRouteBounds(box) {
    const chunk = layout.stageById.get(box.stageId);
    if (!chunk) {
      return {
        top: box.y - CONFIG.routeGutter,
        bottom: box.y + box.h + CONFIG.routeGutter,
      };
    }
    return {
      top: chunk.y + CONFIG.stageHeaderHeight + CONFIG.stagePadding,
      bottom: chunk.y + chunk.h - CONFIG.stagePadding,
    };
  }

  function crossStagePorts(sourceBox, targetBox) {
    const sourceCenterX = sourceBox.x + sourceBox.w / 2;
    const targetCenterX = targetBox.x + targetBox.w / 2;
    const targetAbove = targetBox.y + targetBox.h / 2 < sourceBox.y + sourceBox.h / 2;
    const horizontalDirection = targetCenterX >= sourceCenterX ? 1 : -1;
    const sourceX = sourceCenterX + horizontalDirection * Math.min(sourceBox.w * 0.18, 30);
    const targetX = targetCenterX - horizontalDirection * Math.min(targetBox.w * 0.18, 30);

    return {
      source: {
        x: sourceX,
        y: targetAbove ? sourceBox.y : sourceBox.y + sourceBox.h,
      },
      target: {
        x: targetX,
        y: targetAbove ? targetBox.y + targetBox.h : targetBox.y,
      },
      targetAbove,
    };
  }

  function sameStagePorts(sourceBox, targetBox, route) {
    const sourceCenterX = sourceBox.x + sourceBox.w / 2;
    const targetCenterX = targetBox.x + targetBox.w / 2;
    const toRight = targetCenterX >= sourceCenterX;
    const sourceRatio = toRight ? 0.72 : 0.28;
    const targetRatio = toRight ? 0.28 : 0.72;
    const sourceY = route.side === "top" ? sourceBox.y : sourceBox.y + sourceBox.h;
    const targetY = route.side === "top" ? targetBox.y : targetBox.y + targetBox.h;
    const bounds = stageRouteBounds(sourceBox);
    const laneOffset = 12 + route.lane * CONFIG.routeLaneGap;
    const railY = route.side === "top"
      ? Math.max(bounds.top + 3, sourceBox.y - laneOffset)
      : Math.min(bounds.bottom - 3, sourceBox.y + sourceBox.h + laneOffset);

    return {
      source: { x: sourceBox.x + sourceBox.w * sourceRatio, y: sourceY },
      target: { x: targetBox.x + targetBox.w * targetRatio, y: targetY },
      railY,
      side: route.side,
      toRight,
    };
  }

  function drawSameStageConnection(ctx, sourceBox, targetBox, route, style) {
    const ports = sameStagePorts(sourceBox, targetBox, route);
    const source = screenPoint(ports.source);
    const target = screenPoint(ports.target);
    const railY = state.y + ports.railY * state.scale;
    const corner = Math.max(5, 9 * state.scale);
    const direction = ports.toRight ? 1 : -1;

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.alpha;
    if (style.dashed) ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);

    const sourceRailX = source.x + direction * corner;
    const targetRailX = target.x - direction * corner;
    ctx.bezierCurveTo(source.x, railY, source.x, railY, sourceRailX, railY);
    ctx.lineTo(targetRailX, railY);
    ctx.bezierCurveTo(target.x, railY, target.x, railY, target.x, target.y);
    ctx.stroke();

    const angle = ports.side === "top" ? Math.PI / 2 : -Math.PI / 2;
    drawArrow(ctx, target.x, target.y, angle, style.color, Math.max(5, 6 * Math.min(1.1, state.scale + 0.25)));
    ctx.restore();
  }

  function drawCrossStageConnection(ctx, sourceBox, targetBox, style) {
    const ports = crossStagePorts(sourceBox, targetBox);
    const source = screenPoint(ports.source);
    const target = screenPoint(ports.target);
    const deltaY = target.y - source.y;
    const control = Math.max(34, Math.abs(deltaY) * 0.42);
    const direction = ports.targetAbove ? -1 : 1;

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.alpha;
    if (style.dashed) ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.bezierCurveTo(
      source.x,
      source.y + direction * control,
      target.x,
      target.y - direction * control,
      target.x,
      target.y,
    );
    ctx.stroke();

    const angle = ports.targetAbove ? -Math.PI / 2 : Math.PI / 2;
    drawArrow(ctx, target.x, target.y, angle, style.color, Math.max(5, 6 * Math.min(1.1, state.scale + 0.25)));
    ctx.restore();
  }

  function drawConnection(ctx, sourceBox, targetBox, route, style) {
    if (route.kind === "same-stage") {
      drawSameStageConnection(ctx, sourceBox, targetBox, route, style);
      return;
    }
    drawCrossStageConnection(ctx, sourceBox, targetBox, style);
  }

  function intervalFits(lane, interval, margin) {
    return lane.every((occupied) => occupied.end + margin < interval.start || occupied.start - margin > interval.end);
  }

  function firstAvailableLane(lanes, interval) {
    const margin = 22;
    for (let index = 0; index < lanes.length; index += 1) {
      if (intervalFits(lanes[index], interval, margin)) return index;
    }
    return lanes.length;
  }

  function assignEdgeRoutes(edges) {
    const sameStageGroups = new Map();

    edges.forEach((edge) => {
      edge.sourceBox = layout.nodeBoxes.get(edge.sourceId);
      edge.targetBox = layout.nodeBoxes.get(edge.targetId);
      if (!edge.sourceBox || !edge.targetBox) return;

      if (edge.sourceBox.stageId !== edge.targetBox.stageId) {
        edge.route = { kind: "cross-stage" };
        return;
      }

      const stageId = edge.sourceBox.stageId;
      if (!sameStageGroups.has(stageId)) sameStageGroups.set(stageId, []);
      sameStageGroups.get(stageId).push(edge);
    });

    sameStageGroups.forEach((group) => {
      const topLanes = [];
      const bottomLanes = [];

      group
        .sort((a, b) => {
          const aStart = Math.min(a.sourceBox.x, a.targetBox.x);
          const aEnd = Math.max(a.sourceBox.x + a.sourceBox.w, a.targetBox.x + a.targetBox.w);
          const bStart = Math.min(b.sourceBox.x, b.targetBox.x);
          const bEnd = Math.max(b.sourceBox.x + b.sourceBox.w, b.targetBox.x + b.targetBox.w);
          return (aEnd - aStart) - (bEnd - bStart);
        })
        .forEach((edge, index) => {
          const interval = {
            start: Math.min(edge.sourceBox.x + edge.sourceBox.w / 2, edge.targetBox.x + edge.targetBox.w / 2),
            end: Math.max(edge.sourceBox.x + edge.sourceBox.w / 2, edge.targetBox.x + edge.targetBox.w / 2),
          };
          const topLane = firstAvailableLane(topLanes, interval);
          const bottomLane = firstAvailableLane(bottomLanes, interval);

          let side;
          let lane;
          if (topLane < bottomLane) {
            side = "top";
            lane = topLane;
          } else if (bottomLane < topLane) {
            side = "bottom";
            lane = bottomLane;
          } else {
            side = index % 2 === 0 ? "top" : "bottom";
            lane = side === "top" ? topLane : bottomLane;
          }

          const laneCollection = side === "top" ? topLanes : bottomLanes;
          if (!laneCollection[lane]) laneCollection[lane] = [];
          laneCollection[lane].push(interval);
          edge.route = { kind: "same-stage", side, lane };
        });
    });

    return edges;
  }`;

  const routingPattern = /  function nodePorts\(sourceBox, targetBox\) \{[\s\S]*?\n  function resizeCanvas\(\) \{/;
  const previousRouting = source;
  source = source.replace(routingPattern, routingReplacement + "\n\n  function resizeCanvas() {");
  if (source === previousRouting) throw new Error("无法替换知识塔连线路由器");

  const drawEdgesReplacement = `  function drawEdges(ctx) {
    const selected = state.selected;
    const pathSet = selectedPathSet();
    if (!selected && !pathSet) return;

    const edges = [];
    const edgeKeys = new Set();
    const addEdge = (sourceId, targetId, type) => {
      const source = String(sourceId);
      const target = String(targetId);
      const key = source + "→" + target + ":" + type;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ sourceId: source, targetId: target, type });
    };

    if (selected) {
      const selectedNode = nodeById.get(selected);
      (selectedNode?.prerequisites || []).forEach((sourceId) => addEdge(sourceId, selected, "prerequisite"));
      (selectedNode?.recommended || []).forEach((sourceId) => addEdge(sourceId, selected, "recommended"));
      nextNodeIds(selected).forEach((targetId) => addEdge(selected, targetId, "prerequisite"));
    } else if (pathSet) {
      for (const target of layout.visibleNodes) {
        const targetId = String(target.id);
        if (!pathSet.has(targetId)) continue;
        (target.prerequisites || []).forEach((sourceId) => {
          const source = String(sourceId);
          if (pathSet.has(source)) addEdge(source, targetId, "prerequisite");
        });
      }
    }

    assignEdgeRoutes(edges).slice(0, 80).forEach((edge) => {
      if (!edge.sourceBox || !edge.targetBox || !edge.route) return;
      drawConnection(ctx, edge.sourceBox, edge.targetBox, edge.route, {
        color: edge.type === "recommended" ? "rgba(159,190,207,.9)" : "rgba(114,213,187,.96)",
        width: edge.type === "recommended" ? 1.45 : 2,
        alpha: 1,
        dashed: edge.type === "recommended",
      });
    });
  }`;

  const drawEdgesPattern = /  function drawEdges\(ctx\) \{[\s\S]*?\n  \}\n\n  function updateNodeStates\(\)/;
  const previousDrawEdges = source;
  source = source.replace(drawEdgesPattern, drawEdgesReplacement + "\n\n  function updateNodeStates()");
  if (source === previousDrawEdges) throw new Error("无法替换知识塔连线绘制逻辑");

  source = source.replace(
    /    const domainTargetWidth = state\.domain === "all" \? layout\.worldWidth : Math\.min\(layout\.worldWidth, CONFIG\.domainWidth \+ CONFIG\.worldPadding \* 2\);/,
    "    const domainTargetWidth = layout.worldWidth;",
  );
  source = source.replace(
    /    state\.scale = Math\.max\(0\.42, Math\.min\(0\.82, availableWidth \/ domainTargetWidth\)\);/,
    "    state.scale = Math.max(CONFIG.minScale, Math.min(0.82, availableWidth / domainTargetWidth));",
  );

  new Function(source + "\n//# sourceURL=app-v5-generated.js")();
})().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:32px;color:#e7f1f7;background:#071018;min-height:100vh;font-family:system-ui"><h1>知识塔加载失败</h1><p>${String(error.message || error)}</p></main>`;
});
