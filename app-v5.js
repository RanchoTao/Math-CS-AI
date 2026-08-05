(async () => {
  "use strict";

  const response = await fetch("./app-v4.js?v=20260806-0218", { cache: "no-store" });
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
    // 因此用户从页面底部向上探索时，顺序正好是：纯数学 → 计算机科学 → 人工智能。
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

      // 每个领域内部仍然是自下而上的塔：L0 在底部，L8 在顶部。
      // DOM 坐标从上向下增长，所以这里按 L8 → L0 排列。
      for (let stage = 8; stage >= 0; stage -= 1) {
        const stageNodes = domainNodes
          .filter((node) => Number(node.stage) === stage)
          .sort((a, b) => {
            const clusterDiff = (clusterOrder.get(String(a.cluster)) ?? 0) - (clusterOrder.get(String(b.cluster)) ?? 0);
            return clusterDiff || nodeTitle(a).localeCompare(nodeTitle(b), "zh-CN");
          });
        if (!stageNodes.length) continue;

        // 一层严格只有一行，绝不换行。节点多时让这一层向水平方向延伸。
        const width = CONFIG.stagePadding * 2
          + stageNodes.length * CONFIG.nodeWidth
          + Math.max(0, stageNodes.length - 1) * CONFIG.nodeGapX;
        const height = CONFIG.stageHeaderHeight + CONFIG.stagePadding * 2 + CONFIG.nodeHeight;
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
        const id = \\`\${spec.domain}-stage-\${spec.stage}\\`;
        const chunk = { id, x, y, w: spec.width, h: spec.height, ...spec };
        stageChunks.push(chunk);
        stageById.set(id, chunk);

        spec.nodes.forEach((node, index) => {
          const localX = CONFIG.stagePadding + index * (CONFIG.nodeWidth + CONFIG.nodeGapX);
          const localY = CONFIG.stageHeaderHeight + CONFIG.stagePadding;
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
    elements.world.style.width = \\`\${worldWidth}px\\`;
    elements.world.style.height = \\`\${worldHeight}px\\`;
    elements.visibleCount.textContent = \\`\${visibleNodes.length} 个节点\\`;

    domains.forEach((domain) => {
      const shell = document.createElement("section");
      shell.className = \\`tower-domain \${domain.domain}\\`;
      shell.style.left = \\`\${domain.x}px\\`;
      shell.style.top = \\`\${domain.y}px\\`;
      shell.style.width = \\`\${domain.w}px\\`;
      shell.style.height = \\`\${domain.h}px\\`;
      const title = document.createElement("div");
      title.className = "tower-domain-title";
      title.textContent = \\`\${domainLabel(domain.domain)} · \${domain.count} 个节点\\`;
      shell.appendChild(title);
      elements.world.appendChild(shell);
    });
  }`;

  const buildPattern = /  function buildLayout\(\) \{[\s\S]*?\n  \}\n\n  function renderControls\(\)/;
  const previousBuild = source;
  source = source.replace(buildPattern, `${buildLayoutReplacement}\n\n  function renderControls()`);
  if (source === previousBuild) throw new Error("无法替换知识塔布局算法");

  // 单领域筛选时按实际领域宽度缩放；全部领域时同样以真实世界宽度为准。
  source = source.replace(
    /    const domainTargetWidth = state\.domain === "all" \? layout\.worldWidth : Math\.min\(layout\.worldWidth, CONFIG\.domainWidth \+ CONFIG\.worldPadding \* 2\);/,
    "    const domainTargetWidth = layout.worldWidth;",
  );

  // 执行经过布局替换后的完整运行时。
  new Function(`${source}\n//# sourceURL=app-v5-generated.js`)();
})().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:32px;color:#e7f1f7;background:#071018;min-height:100vh;font-family:system-ui"><h1>知识塔加载失败</h1><p>${String(error.message || error)}</p></main>`;
});
