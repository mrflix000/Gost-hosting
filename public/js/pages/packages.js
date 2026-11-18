import { api } from "../api.js";
import { $, esc, toast } from "../ui.js";

export async function renderPackages(user) {
  const projects = (await api("/api/projects")).projects;
  let currentId = sessionStorage.getItem("ghost_project") || (projects[0]?.id ?? null);

  $("#content").innerHTML = `
    <div class="welcome" style="margin-bottom:1.2rem">
      <div>
        <div class="eyebrow">WORKSPACE</div>
        <h3>Packages</h3>
        <div class="subtle">Install libraries from curated safe lists for each runtime.</div>
      </div>
      <select id="projSelect" style="width:auto;min-width:180px">
        ${projects.map(p => `<option value="${p.id}" ${String(p.id)===String(currentId)?"selected":""}>${esc(p.name)}</option>`).join("")}
      </select>
    </div>
    <div id="pkgContent"></div>
  `;

  if (!projects.length) {
    $("#pkgContent").innerHTML = `<div class="empty"><h3>No projects</h3></div>`;
    return;
  }

  async function load() {
    currentId = $("#projSelect").value;
    sessionStorage.setItem("ghost_project", currentId);
    const data = await api(`/api/projects/${currentId}/packages`);

    $("#pkgContent").innerHTML = `
      <div class="card" style="margin-bottom:1.2rem">
        <div class="card-head">
          <h3>Installed packages</h3>
          <span class="tag">${esc(data.runtime)}</span>
        </div>
        ${data.installed.length === 0 ? `<p class="subtle">No packages installed yet.</p>` : `
          <div class="file-list">
            ${data.installed.map(p => `
              <div class="file-row">
                <div>
                  <span class="name">${esc(p.name)}</span>
                  <span class="meta">${esc(p.manager)} · ${esc(p.version)}</span>
                </div>
                <button class="btn danger sm" data-remove="${p.id}">Remove</button>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <div class="card">
        <div class="card-head">
          <h3>Catalog</h3>
          <span class="tag cyan">Curated</span>
        </div>
        <div class="pkg-grid">
          ${data.catalog.map(p => `
            <div class="pkg-card">
              <b>${esc(p.name)}</b>
              <small>${esc(p.description)}</small>
              <button class="btn primary sm" style="margin-top:0.5rem;align-self:flex-start" data-add="${esc(p.name)}" data-mgr="${esc(p.manager)}">
                Install
              </button>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    $("#pkgContent").querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          toast("Installing " + btn.dataset.add + "…", "info");
          const res = await api(`/api/projects/${currentId}/packages`, {
            method: "POST",
            body: { name: btn.dataset.add, manager: btn.dataset.mgr }
          });
          const inst = res.install;
          if (inst && inst.ok === false) toast("Recorded but install issue: " + (inst.message || "").slice(0, 80), "error");
          else toast("Installed " + btn.dataset.add, "ok");
          load();
        } catch (e) { toast(e.message, "error"); }
      });
    });

    $("#pkgContent").querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/projects/${currentId}/packages/${btn.dataset.remove}`, { method: "DELETE" });
          toast("Removed", "ok");
          load();
        } catch (e) { toast(e.message, "error"); }
      });
    });
  }

  $("#projSelect").addEventListener("change", load);
  await load();
}
