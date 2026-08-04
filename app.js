(async () => {
  "use strict";
  const encoded = (window.__ATLAS_APP_PARTS || []).join("");
  if (!encoded) throw new Error("Atlas 运行时代码未加载。");
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const source = await new Response(stream).text();
  (0, eval)(source);
})().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:32px;color:#e7f1f7;background:#071018;min-height:100vh;font-family:system-ui"><h1>Atlas 加载失败</h1><p>${error.message}</p></main>`;
});
