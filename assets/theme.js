/* Theme: applied before first paint (load this synchronously in <head>). */
(function () {
  "use strict";
  var KEY = "atlas.theme.v1";
  var THEMES = [
    { id: "auto", name: "跟随系统", note: "白天纸本，夜里夜航" },
    { id: "paper", name: "纸本", note: "暖白纸面，墨色文字" },
    { id: "night", name: "夜航", note: "深墨底色，亮色节点" },
    { id: "chalk", name: "黑板", note: "板岩绿底，粉笔色调" },
    { id: "blueprint", name: "蓝图", note: "工程蓝底，网格坐标" },
  ];
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function stored() { try { return localStorage.getItem(KEY) || "auto"; } catch (e) { return "auto"; } }
  function resolve(choice) { return choice === "auto" ? (media && media.matches ? "night" : "paper") : choice; }
  function apply(choice) {
    var theme = resolve(choice);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme === "paper" ? "light" : "dark";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#f2efe7");
    document.dispatchEvent(new CustomEvent("atlas:theme", { detail: { theme: theme, choice: choice } }));
  }
  var params = new URLSearchParams(location.search);
  var forced = params.get("theme");
  if (forced && THEMES.some(function (t) { return t.id === forced; })) { try { localStorage.setItem(KEY, forced); } catch (e) {} }
  apply(stored());
  if (media && media.addEventListener) media.addEventListener("change", function () { if (stored() === "auto") apply("auto"); });

  function set(choice) { try { localStorage.setItem(KEY, choice); } catch (e) {} apply(choice); render(); }

  var menu, button;
  function render() {
    if (!menu) return;
    var current = stored();
    menu.innerHTML = '<p class="theme-menu-title">外观</p>' + THEMES.map(function (t) {
      var swatch = t.id === "auto" ? "auto" : t.id;
      return '<button type="button" role="menuitemradio" aria-checked="' + (t.id === current) + '" data-theme-choice="' + t.id + '">' +
        '<span class="swatch sw-' + swatch + '" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="theme-text"><b>' + t.name + '</b><small>' + t.note + "</small></span>" +
        '<span class="theme-check" aria-hidden="true">' + (t.id === current ? "✓" : "") + "</span></button>";
    }).join("");
  }
  function open() { menu.hidden = false; button.setAttribute("aria-expanded", "true"); render(); var b = menu.querySelector('[aria-checked="true"]'); if (b) b.focus(); }
  function close() { if (!menu || menu.hidden) return; menu.hidden = true; button.setAttribute("aria-expanded", "false"); }
  document.addEventListener("DOMContentLoaded", function () {
    button = document.getElementById("themeButton");
    if (!button) return;
    menu = document.createElement("div");
    menu.className = "theme-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    document.body.appendChild(menu);
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", function (e) { e.stopPropagation(); if (menu.hidden) open(); else close(); });
    menu.addEventListener("click", function (e) { var b = e.target.closest("[data-theme-choice]"); if (b) { set(b.getAttribute("data-theme-choice")); } e.stopPropagation(); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
      if (!menu.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        var items = Array.prototype.slice.call(menu.querySelectorAll("button"));
        var i = items.indexOf(document.activeElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });
  });
  window.AtlasTheme = { set: set, get: stored, themes: THEMES };
})();
