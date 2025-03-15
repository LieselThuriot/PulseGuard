"use strict";

/**
 * Sets the theme of the application.
 *
 * This function sets the theme based on the provided mode or retrieves it from localStorage.
 * If the mode is "auto", it will determine the theme based on the user's system preferences.
 * It also updates the theme icon accordingly.
 *
 * @param {string} [mode] - The theme mode to set. Can be "light", "dark", or "auto". If not provided, it defaults to "auto".
 * @returns {void}
 */
function setTheme(mode) {
  if (!mode) {
    mode = localStorage.getItem("bs-theme") || "auto";
  }

  let icon = "🤖";

  if (mode === "auto") {
    localStorage.removeItem("bs-theme");
    mode = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } else {
    localStorage.setItem("bs-theme", mode);
    icon = mode === "dark" ? "🌘" : "☀️";
  }

  if (mode !== "light") {
    mode = "dark"; // just making sure
  }

  document.documentElement.setAttribute("data-bs-theme", mode);
  document.getElementById("theme-picker").textContent = icon;
}

setTheme();

document
  .querySelectorAll(".mode-switch li a")
  .forEach((e) => e.addEventListener("click", () => setTheme(e.id)));

window
  .matchMedia("(prefers-color-scheme: light)")
  .addEventListener("change", () => setTheme());
