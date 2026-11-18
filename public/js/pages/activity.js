import { api } from "../api.js";
import { $, esc } from "../ui.js";

export async function renderActivity(user) {
  if (user.role !== "admin") {
    $("#content").innerHTML = `<div class="empty"><h3>Admin only</h3></div>`;
    return;
  }

  const data = await api("/api/activity");
  $("#content").innerHTML = `
    <div class="welcome" style="margin-bottom:1.2rem">
      <div>
        <div class="eyebrow">ADMINISTRATION</div>
        <h3>Activity History</h3>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr>
        </thead>
        <tbody>
          ${data.logs.map(l => `
            <tr>
              <td style="white-space:nowrap;font-size:0.8rem">${esc(l.created_at)}</td>
              <td>${esc(l.username || "—")}</td>
              <td><span class="tag">${esc(l.action)}</span></td>
              <td style="font-size:0.8rem;color:var(--muted)">${esc(JSON.stringify(l.details || {}))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
