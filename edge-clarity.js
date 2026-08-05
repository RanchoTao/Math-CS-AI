(() => {
  "use strict";

  const originalStroke = CanvasRenderingContext2D.prototype.stroke;
  const originalFill = CanvasRenderingContext2D.prototype.fill;

  function isAtlasEdgeCanvas(ctx) {
    return ctx?.canvas?.id === "edgeCanvas";
  }

  function normalizedStyle(value) {
    return String(value || "").replaceAll(" ", "").toLowerCase();
  }

  function isBackgroundDependencyStyle(value) {
    const style = normalizedStyle(value);
    return style.includes("rgba(116,146,164,0.34)")
      || style.includes("rgba(116,146,164,.34)")
      || style.includes("rgb(116,146,164)");
  }

  CanvasRenderingContext2D.prototype.stroke = function patchedStroke(...args) {
    if (isAtlasEdgeCanvas(this) && isBackgroundDependencyStyle(this.strokeStyle)) {
      return undefined;
    }
    return originalStroke.apply(this, args);
  };

  CanvasRenderingContext2D.prototype.fill = function patchedFill(...args) {
    if (isAtlasEdgeCanvas(this) && isBackgroundDependencyStyle(this.fillStyle)) {
      return undefined;
    }
    return originalFill.apply(this, args);
  };
})();
