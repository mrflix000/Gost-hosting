import { api } from "../api.js";
import { $, esc, toast, dialog, dialogForm, logToConsole, injectIcons } from "../ui.js";
import { icons } from "../icons.js";

export async function renderProjects(user) {
  const data = await api("/api/projects");
  const projects = data.projects;

  $("#content").innerHTML = `
    <div class="welcome" style="margin-bottom:1.4rem">
      <div>
        <div class="eyebrow">WORKSPACE</div>
        <h3>Projects</h3>
        <div class="subtle">Create and manage your runtime projects.</div>
      </div>
      <button class="btn primary" id="newProject">
        <span style="display:inline-flex;vertical-align:middle">${icons.plus}</span>
        New project
      </button>
    </div>

    <div id="projectGrid" class="grid-2">
      ${projects.length === 0 ? `
        <div class="empty" style="grid-column:1/-1">
          <h3>No projects yet</h3>
          <p>Create your first project to get started.</p>
        </div>
      ` : projects.map(p => `
        <div class="project-card" data-id="${p.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem">
            <h4>${esc(p.name)}</h4>
            <span class="tag ${p.runtime === 'node' ? 'cyan' : p.runtime === 'python' ? 'green' : 'orange'}">${esc(p.runtime)}</span>
          </div>
          <div class="subtle" style="font-size:0.8rem">
            ${p.owner_name ? `Owner: ${esc(p.owner_name)} · ` : ""}ID #${p.id}
          </div>
          <div class="project-actions">
            <button class="btn primary sm" data-act="start">Start</button>
            <button class="btn outline sm" data-act="stop">Stop</button>
            <a class="btn outline sm" href="/run/${p.id}/" target="_blank" rel="noopener">Open live</a>
            <button class="btn outline sm" data-act="files">Files</button>
            <button class="btn outline sm" data-act="settings">Settings</button>
            <button class="btn danger sm" data-act="delete">${icons.trash}</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  $("#newProject").addEventListener("click", async () => {
    const result = await dialogForm({
      title: "Create project",
      confirmText: "Create",
      fields: [
        { id: "name", label: "Name", placeholder: "my-api" },
        { id: "runtime", label: "Runtime", type: "select", value: "node", options: [
          { value: "node", label: "Node.js" },
          { value: "python", label: "Python" },
          
        ]},
        { id: "description", label: "Description", placeholder: "Optional" }
      ]
    });
    if (!result?.name) return;
    try {
      await api("/api/projects", { method: "POST", body: result });
      toast("Project created", "ok");
      logToConsole("ok", `Project created: ${result.name}`);
      renderProjects(user);
    } catch (e) {
      toast(e.message, "error");
      logToConsole("err", e.message);
    }
  });

  $("#projectGrid").addEventListener("click", async e => {
    const card = e.target.closest(".project-card");
    if (!card) return;
    const id = card.dataset.id;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;

    if (act === "files") {
      sessionStorage.setItem("ghost_project", id);
      document.querySelector('[data-page="files"]').click();
    }
    if (act === "packages") {
      sessionStorage.setItem("ghost_project", id);
      document.querySelector('[data-page="packages"]').click();
    }
    if (act === "delete") {
      const ok = await dialog({
        title: "Delete project",
        bodyHtml: `<p>Are you sure you want to permanently delete this project and its files?</p>`,
        confirmText: "Delete",
        danger: true
      });
      if (!ok) return;
      try {
        await api(`/api/projects/${id}`, { method: "DELETE" });
        toast("Project deleted", "ok");
        logToConsole("ok", `Project #${id} deleted`);
        renderProjects(user);
      } catch (err) {
        toast(err.message, "error");
        logToConsole("err", err.message);
      }
    }
    
    if (act === "start") {
      try {
        const st = await api(`/api/projects/${id}/runtime/start`, { method: "POST" });
        toast(st.running ? "Project started" : "Start failed", st.running ? "ok" : "error");
        logToConsole(st.running ? "ok" : "err", st.running ? `Started project #${id} on port ${st.port}` : "Start failed");
      } catch (err) {
        toast(err.message, "error");
        logToConsole("err", err.message);
      }
    }
    if (act === "stop") {
      try {
        await api(`/api/projects/${id}/runtime/stop`, { method: "POST" });
        toast("Project stopped", "ok");
        logToConsole("ok", `Stopped project #${id}`);
      } catch (err) {
        toast(err.message, "error");
        logToConsole("err", err.message);
      }
    }

    if (act === "settings") {
      sessionStorage.setItem("ghost_project", id);
      document.querySelector('[data-page="settings"]').click();
    }
  });
}
