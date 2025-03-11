"use strict";

function formatId(/** @type {string} */value) {
  if (value) {
    value = value.toLowerCase().replaceAll(/[\s\.]/g, '-');
  }

  return value;
}

function setTheme(mode) {
  if (!mode) {
    mode = localStorage.getItem('bs-theme') || 'auto';
  }

  let icon = '🤖';

  if (mode === 'auto') {
    localStorage.removeItem('bs-theme');
    mode = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } else {
    localStorage.setItem('bs-theme', mode);
    icon = mode === 'dark' ? '🌘' : '☀️';
  }

  if (mode !== 'light') {
    mode = 'dark'; // just making sure
  }

  document.documentElement.setAttribute('data-bs-theme', mode);
  document.getElementById('theme-picker').textContent = icon;
}

setTheme();
document.querySelectorAll('.mode-switch li a').forEach(e => e.addEventListener('click', () => setTheme(e.id)));
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => setTheme());