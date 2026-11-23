// Loads the knowledge graph. The single source of truth is data/catalog.json.
window.loadAtlasCatalog = async function () {
  const response = await fetch("./data/catalog.json");
  if (!response.ok) throw new Error(`知识图谱数据加载失败：${response.status}`);
  return response.json();
};
