import { icons } from "./icons.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  if (type === "error") el.style.borderColor = "var(--red)";
  if (type === "ok") el.style.borderColor = "var(--green)";
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export const consoleLog = [];
export function logToConsole(type, text) {
  const entry = { type, text, time: new Date().toLocaleTimeString() };
  consoleLog.push(entry);
  if (consoleLog.length > 400) consoleLog.shift();
  window.dispatchEvent(new CustomEvent("ghost-console", { detail: entry }));
}

export function injectIcons(root = document) {
  root.querySelectorAll("[data-ico]").forEach(el => {
    const key = el.dataset.ico;
    if (icons[key]) el.innerHTML = icons[key];
  });
  const loginLogo = $("#loginLogo");
  const brandLogo = $("#brandLogo");
  if (loginLogo) loginLogo.innerHTML = icons.spider || "G";
  if (brandLogo) brandLogo.innerHTML = icons.spider || "G";
}

export function dialog({ title, bodyHtml, confirmText = "Confirm", cancelText = "Cancel", danger = false }) {
  return new Promise(resolve => {
    const root = $("#dialogRoot");
    root.innerHTML = `
      <div class="modal-backdrop" id="dlgBackdrop">
        <div class="modal">
          <h3>${esc(title)}</h3>
          <div class="modal-body">${bodyHtml}</div>
          <div class="modal-actions">
            <button class="btn outline" data-act="cancel">${esc(cancelText)}</button>
            <button class="btn ${danger ? "danger" : "primary"}" data-act="ok">${esc(confirmText)}</button>
          </div>
        </div>
      </div>
    `;
    const backdrop = $("#dlgBackdrop");
    const close = (val) => { root.innerHTML = ""; resolve(val); };
    backdrop.addEventListener("click", e => {
      if (e.target === backdrop || e.target.dataset.act === "cancel") close(null);
      if (e.target.dataset.act === "ok") close(true);
    });
  });
}

export function dialogForm({ title, fields, confirmText = "Save" }) {
  const body = fields.map(f => {
    if (f.type === "select") {
      return `<label>${esc(f.label)}
        <select id="f_${f.id}">
          ${(f.options || []).map(o => `<option value="${esc(o.value)}" ${o.value === f.value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
        </select>
      </label>`;
    }
    return `<label>${esc(f.label)}
      <input id="f_${f.id}" type="${f.type || "text"}" value="${esc(f.value || "")}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""}>
    </label>`;
  }).join("");

  return new Promise(resolve => {
    const root = $("#dialogRoot");
    root.innerHTML = `
      <div class="modal-backdrop" id="dlgBackdrop">
        <div class="modal">
          <h3>${esc(title)}</h3>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:0.9rem">${body}</div>
          <div class="modal-actions">
            <button class="btn outline" data-act="cancel">Cancel</button>
            <button class="btn primary" data-act="ok">${esc(confirmText)}</button>
          </div>
        </div>
      </div>
    `;
    const backdrop = $("#dlgBackdrop");
    backdrop.addEventListener("click", e => {
      if (e.target === backdrop || e.target.dataset.act === "cancel") {
        root.innerHTML = "";
        resolve(null);
      }
      if (e.target.dataset.act === "ok") {
        const result = {};
        fields.forEach(f => {
          const el = document.getElementById("f_" + f.id);
          result[f.id] = el ? el.value.trim() : "";
        });
        root.innerHTML = "";
        resolve(result);
      }
    });
  });
}
