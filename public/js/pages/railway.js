import { api } from "../api.js";
import { $, esc, toast } from "../ui.js";

export async function renderRailway(user) {
  if (user.role !== "admin") {
    $("#content").innerHTML = `<div class="empty"><h3>Admin only</h3></div>`;
    return;
  }

  $("#content").innerHTML = `
    <div class="welcome" style="margin-bottom:1.2rem">
      <div>
        <div class="eyebrow">ADMINISTRATION</div>
        <h3>Railway Control</h3>
        <div class="subtle">List and manage Railway projects via API token.</div>
      </div>
      <button class="btn outline sm" id="refreshRail">Refresh</button>
    </div>
    <div id="railContent" class="card">
      <p class="subtle">Loading…</p>
    </div>
  `;

  async function load() {
    try {
      const data = await api("/api/railway/projects");
      if (!data.projects.length) {
        $("#railContent").innerHTML = `<p class="subtle">No Railway projects found or token not configured.</p>`;
        return;
      }
      $("#railContent").innerHTML = `
        <div class="table-wrap" style="border:none">
          <table>
            <thead><tr><th>Name</th><th>ID</th><th>Created</th></tr></thead>
            <tbody>
              ${data.projects.map(p => `
                <tr>
                  <td>${esc(p.name)}</td>
                  <td style="font-family:monospace;font-size:0.8rem">${esc(p.id)}</td>
                  <td>${esc(p.createdAt || "—")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      $("#railContent").innerHTML = `<p class="error">${esc(e.message)}</p>
        <p class="subtle" style="margin-top:0.6rem">Set <code>RAILWAY_API_TOKEN</code> in environment variables.</p>`;
    }
  }

  $("#refreshRail").addEventListener("click", load);
  await load();
}
