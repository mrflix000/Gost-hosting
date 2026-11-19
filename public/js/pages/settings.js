import { api } from "../api.js";
import { $, esc, toast, dialog, dialogForm, logToConsole } from "../ui.js";
import { icons } from "../icons.js";

export async function renderSettings(user) {
  const projects = (await api("/api/projects")).projects;
  let currentId = sessionStorage.getItem("ghost_project") || (projects[0]?.id ?? null);

  $("#content").innerHTML = `
    <div class="welcome" style="margin-bottom:1.2rem">
      <div>
        <div class="eyebrow">WORKSPACE</div>
        <h3>Project Settings</h3>
        <div class="subtle">Rename, change runtime language, or delete a project.</div>
      </div>
      <select id="projSelect" style="width:auto;min-width:200px">
        ${projects.map(p => `<option value="${p.id}" ${String(p.id)===String(currentId)?"selected":""}>${esc(p.name)}</option>`).join("")}
      </select>
    </div>
    <div id="settingsBody"></div>
  `;

  if (!projects.length) {
    $("#settingsBody").innerHTML = `<div class="empty"><h3>No projects</h3><p>Create a project first.</p></div>`;
    return;
  }

  async function load() {
    currentId = $("#projSelect").value;
    sessionStorage.setItem("ghost_project", currentId);
    const p = projects.find(x => String(x.id) === String(currentId)) || (await api(`/api/projects/${currentId}`)).project;

    $("#settingsBody").innerHTML = `
      <div class="card" style="margin-bottom:1rem">
        <div class="card-head"><h3>General</h3></div>
        <div style="display:flex;flex-direction:column;gap:0.9rem;max-width:420px">
          <div>
            <div class="subtle" style="font-size:0.75rem;margin-bottom:0.25rem">Project name</div>
            <strong style="font-size:1.1rem">${esc(p.name)}</strong>
          </div>
          <div>
            <div class="subtle" style="font-size:0.75rem;margin-bottom:0.25rem">Runtime</div>
            <span class="tag ${p.runtime==='node'?'cyan':p.runtime==='python'?'green':'orange'}">${esc(p.runtime)}</span>
          </div>
          <div>
            <div class="subtle" style="font-size:0.75rem;margin-bottom:0.25rem">ID</div>
            <code>#${p.id}</code>
          </div>
        </div>
        <div class="project-actions" style="margin-top:1.2rem">
          <button class="btn outline" id="btnRename">Rename project</button>
          <button class="btn outline" id="btnRuntime">Change runtime</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:1rem">
        <div class="card-head"><h3>Live preview & deploy</h3></div>
        <p class="subtle" style="margin-bottom:0.8rem">
          <b>Preview</b> serves files from this project directly through Gost Hosting (static HTML/CSS/JS).
          Node.js & Python run for real on this server, deploy the project folder as a <b>separate Railway service</b>
          (each project already includes Dockerfile + start files).
        </p>
        <div class="project-actions">
          <button class="btn primary" id="btnStart">Start runtime</button>
          <button class="btn outline" id="btnStop">Stop</button>
          <a class="btn outline" href="/run/${p.id}/" target="_blank" rel="noopener">Open live URL</a>
        </div>
        <p class="subtle" style="margin-top:1rem;font-size:0.8rem">
          Start runs Node.js or Python for real on this server. Open live URL to visit the app.
        </p>
      </div>

      <div class="card" style="border-color:rgba(248,113,113,0.25)">
        <div class="card-head"><h3 style="color:var(--red)">Danger zone</h3></div>
        <p class="subtle" style="margin-bottom:1rem">Deleting a project removes its files and package records permanently.</p>
        <button class="btn danger" id="btnDelete">
          ${icons.trash} Delete this project
        </button>
      </div>
    `;

    $("#btnRename").addEventListener("click", async () => {
      const result = await dialogForm({
        title: "Rename project",
        confirmText: "Rename",
        fields: [{ id: "name", label: "New name", value: p.name }]
      });
      if (!result?.name || result.name === p.name) return;
      try {
        await api(`/api/projects/${currentId}`, { method: "PATCH", body: { name: result.name } });
        toast("Renamed successfully", "ok");
        logToConsole("ok", `Project #${currentId} renamed to ${result.name}`);
        // refresh list
        const all = await api("/api/projects");
        projects.length = 0;
        projects.push(...all.projects);
        $("#projSelect").innerHTML = projects.map(pr =>
          `<option value="${pr.id}" ${String(pr.id)===String(currentId)?"selected":""}>${esc(pr.name)}</option>`
        ).join("");
        load();
      } catch (e) {
        toast(e.message, "error");
        logToConsole("err", e.message);
      }
    });

    $("#btnRuntime").addEventListener("click", async () => {
      const result = await dialogForm({
        title: "Change runtime",
        confirmText: "Update",
        fields: [{
          id: "runtime", label: "Runtime / Language", type: "select", value: p.runtime,
          options: [
            { value: "node", label: "Node.js" },
            { value: "python", label: "Python" },
            
          ]
        }]
      });
      if (!result?.runtime || result.runtime === p.runtime) return;
      try {
        await api(`/api/projects/${currentId}`, { method: "PATCH", body: { runtime: result.runtime } });
        toast("Runtime updated", "ok");
        logToConsole("ok", `Project #${currentId} runtime → ${result.runtime}`);
        const all = await api("/api/projects");
        projects.length = 0;
        projects.push(...all.projects);
        load();
      } catch (e) {
        toast(e.message, "error");
        logToConsole("err", e.message);
      }
    });

    
    const btnStart = $("#btnStart");
    if (btnStart) btnStart.addEventListener("click", async () => {
      try {
        const st = await api(`/api/projects/${currentId}/runtime/start`, { method: "POST" });
        toast(st.running ? ("Started on port " + st.port) : "Failed", st.running ? "ok" : "error");
        logToConsole(st.running ? "ok" : "err", st.running ? (`Started #${currentId} :${st.port}`) : "start failed");
      } catch (e) { toast(e.message, "error"); logToConsole("err", e.message); }
    });
    const btnStop = $("#btnStop");
    if (btnStop) btnStop.addEventListener("click", async () => {
      try {
        await api(`/api/projects/${currentId}/runtime/stop`, { method: "POST" });
        toast("Stopped", "ok");
        logToConsole("ok", "Stopped #" + currentId);
      } catch (e) { toast(e.message, "error"); logToConsole("err", e.message); }
    });

    $("#btnDelete").addEventListener("click", async () => {
      const ok = await dialog({
        title: "Delete project",
        bodyHtml: `<p>This will permanently delete <strong>${esc(p.name)}</strong> and all its files.</p>`,
        confirmText: "Delete forever",
        danger: true
      });
      if (!ok) return;
      try {
        await api(`/api/projects/${currentId}`, { method: "DELETE" });
        toast("Project deleted", "ok");
        logToConsole("ok", `Project #${currentId} deleted`);
        sessionStorage.removeItem("ghost_project");
        document.querySelector('[data-page="projects"]').click();
      } catch (e) {
        toast(e.message, "error");
        logToConsole("err", e.message);
      }
    });
  }

  $("#projSelect").addEventListener("change", load);
  await load();
}
