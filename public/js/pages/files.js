import { api } from "../api.js";
import { $, esc, toast, logToConsole, dialogForm } from "../ui.js";
import { icons } from "../icons.js";

export async function renderFiles(user) {
  const projects = (await api("/api/projects")).projects;
  let currentId = sessionStorage.getItem("ghost_project") || (projects[0]?.id ?? null);

  $("#content").innerHTML = `
    <div class="welcome" style="margin-bottom:1.2rem">
      <div>
        <div class="eyebrow">WORKSPACE</div>
        <h3>File Manager</h3>
      </div>
      <div style="display:flex;gap:0.6rem;align-items:center">
        <select id="projSelect" style="width:auto;min-width:180px">
          ${projects.map(p => `<option value="${p.id}" ${String(p.id)===String(currentId)?"selected":""}>${esc(p.name)}</option>`).join("")}
        </select>
        <button class="btn outline sm" id="refreshFiles">Refresh</button>
      </div>
    </div>

    <div class="toolbar">
      <button class="btn primary sm" id="newFile">${icons.plus} New file</button>
      <button class="btn outline sm" id="uploadFile">${icons.upload} Upload file</button>
      <button class="btn outline sm" id="uploadZip">${icons.upload} Upload ZIP</button>
      <span id="uploadStatus" class="subtle" style="font-size:0.8rem;margin-left:0.5rem"></span>
      <input type="file" id="fileInput" class="hidden">
      <input type="file" id="zipInput" accept=".zip,application/zip" class="hidden">
    </div>

    <div class="dropzone" id="dropzone">
      Drop a ZIP or file here — filename will appear above after selection
    </div>

    <div id="fileList" class="file-list" style="margin-top:1.2rem"></div>
    <div id="editorArea" class="hidden" style="margin-top:1.4rem">
      <div class="toolbar">
        <strong id="editName" style="margin-right:auto;font-family:monospace"></strong>
        <button class="btn primary sm" id="saveFile">Save</button>
        <button class="btn outline sm" id="closeEditor">Close</button>
      </div>
      <textarea class="editor" id="editor"></textarea>
    </div>
  `;

  if (!projects.length) {
    $("#fileList").innerHTML = `<div class="empty"><h3>No projects</h3><p>Create a project first.</p></div>`;
    return;
  }

  const status = $("#uploadStatus");

  async function loadFiles() {
    currentId = $("#projSelect").value;
    sessionStorage.setItem("ghost_project", currentId);
    try {
      const data = await api(`/api/projects/${currentId}/files`);
      if (!data.files.length) {
        $("#fileList").innerHTML = `<div class="empty"><p>No files yet. Upload a ZIP or create a file.</p></div>`;
        return;
      }
      $("#fileList").innerHTML = data.files.map(f => `
        <div class="file-row" data-name="${esc(f.name)}">
          <div>
            <span class="name">${esc(f.name)}</span>
            <span class="meta">${(f.size/1024).toFixed(1)} KB</span>
          </div>
          <div class="file-actions">
            <button class="btn ghost sm" data-act="edit">${icons.edit}</button>
            <button class="btn ghost sm" data-act="delete">${icons.trash}</button>
          </div>
        </div>
      `).join("");
    } catch (e) {
      toast(e.message, "error");
      logToConsole("err", e.message);
    }
  }

  await loadFiles();
  $("#projSelect").addEventListener("change", loadFiles);
  $("#refreshFiles").addEventListener("click", loadFiles);

  $("#newFile").addEventListener("click", async () => {
    const result = await dialogForm({
      title: "New file",
      confirmText: "Create",
      fields: [{ id: "name", label: "File name", placeholder: "index.js" }]
    });
    if (!result?.name) return;
    try {
      await api(`/api/projects/${currentId}/files/${encodeURIComponent(result.name)}`, {
        method: "PUT", body: { content: "" }
      });
      toast("File created: " + result.name, "ok");
      logToConsole("ok", "Created file: " + result.name);
      loadFiles();
    } catch (e) {
      toast(e.message, "error");
      logToConsole("err", e.message);
    }
  });

  $("#uploadFile").addEventListener("click", () => $("#fileInput").click());
  $("#uploadZip").addEventListener("click", () => $("#zipInput").click());

  $("#fileInput").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    status.textContent = `Selected: ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api(`/api/projects/${currentId}/upload`, { method: "POST", body: fd });
      toast(`Uploaded: ${file.name}`, "ok");
      logToConsole("ok", `Uploaded file: ${file.name}`);
      status.textContent = `Uploaded: ${file.name}`;
      loadFiles();
    } catch (err) {
      toast(err.message, "error");
      logToConsole("err", `Upload failed (${file.name}): ${err.message}`);
      status.textContent = `Error: ${err.message}`;
    }
    e.target.value = "";
  });

  $("#zipInput").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    status.textContent = `Selected ZIP: ${file.name} (${(file.size/1024).toFixed(1)} KB) — extracting…`;
    const fd = new FormData();
    fd.append("zip", file);
    try {
      const res = await api(`/api/projects/${currentId}/upload-zip`, { method: "POST", body: fd });
      toast(`Extracted ${res.extracted} files from ${file.name}`, "ok");
      logToConsole("ok", `ZIP extracted: ${file.name} → ${res.extracted} files`);
      status.textContent = `Extracted ${res.extracted} files from ${file.name}`;
      loadFiles();
    } catch (err) {
      toast(err.message, "error");
      logToConsole("err", `ZIP failed (${file.name}): ${err.message}`);
      status.textContent = `Error: ${err.message}`;
    }
    e.target.value = "";
  });

  const dz = $("#dropzone");
  dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", async e => {
    e.preventDefault();
    dz.classList.remove("drag");
    const file = e.dataTransfer.files[0];
    if (!file) return;
    status.textContent = `Dropped: ${file.name}`;
    const fd = new FormData();
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        fd.append("zip", file);
        const res = await api(`/api/projects/${currentId}/upload-zip`, { method: "POST", body: fd });
        toast(`Extracted ${res.extracted} files from ${file.name}`, "ok");
        logToConsole("ok", `ZIP extracted: ${file.name}`);
        status.textContent = `Extracted ${res.extracted} files from ${file.name}`;
      } else {
        fd.append("file", file);
        await api(`/api/projects/${currentId}/upload`, { method: "POST", body: fd });
        toast(`Uploaded: ${file.name}`, "ok");
        logToConsole("ok", `Uploaded: ${file.name}`);
        status.textContent = `Uploaded: ${file.name}`;
      }
      loadFiles();
    } catch (err) {
      toast(err.message, "error");
      logToConsole("err", err.message);
      status.textContent = `Error: ${err.message}`;
    }
  });

  $("#fileList").addEventListener("click", async e => {
    const row = e.target.closest(".file-row");
    if (!row) return;
    const name = row.dataset.name;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "delete") {
      try {
        await api(`/api/projects/${currentId}/files/${encodeURIComponent(name)}`, { method: "DELETE" });
        toast("Deleted: " + name, "ok");
        logToConsole("ok", "Deleted file: " + name);
        loadFiles();
      } catch (err) {
        toast(err.message, "error");
        logToConsole("err", err.message);
      }
    }
    if (act === "edit") {
      try {
        const data = await api(`/api/projects/${currentId}/files/${encodeURIComponent(name)}`);
        $("#editName").textContent = name;
        $("#editor").value = data.content;
        $("#editorArea").classList.remove("hidden");
        $("#editorArea").dataset.name = name;
      } catch (err) {
        toast(err.message, "error");
        logToConsole("err", err.message);
      }
    }
  });

  $("#saveFile").addEventListener("click", async () => {
    const name = $("#editorArea").dataset.name;
    try {
      await api(`/api/projects/${currentId}/files/${encodeURIComponent(name)}`, {
        method: "PUT", body: { content: $("#editor").value }
      });
      toast("Saved: " + name, "ok");
      logToConsole("ok", "Saved file: " + name);
    } catch (err) {
      toast(err.message, "error");
      logToConsole("err", err.message);
    }
  });

  $("#closeEditor").addEventListener("click", () => {
    $("#editorArea").classList.add("hidden");
  });
}
