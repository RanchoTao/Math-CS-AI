window.loadAtlasCatalog = async function () {
  const encoded = (window.__ATLAS_PARTS || []).join("");
  const binary = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
};
