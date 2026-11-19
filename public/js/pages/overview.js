import { api } from "../api.js";
import { $, esc } from "../ui.js";

export async function renderOverview(user) {
  const p = await api("/api/projects");
  let usersCount = "—";
  if (user.role === "admin") {
    try {
      const u = await api("/api/admin/users");
      usersCount = u.users.length;
    } catch {}
  }

  $("#content").innerHTML = `
    <div class="welcome">
      <div>
        <div class="eyebrow">YOUR INFRASTRUCTURE</div>
        <h3>Welcome back, ${esc(user.username)}</h3>
        <div class="subtle">Manage projects, files, packages and deployments from one control plane.</div>
      </div>
      <button class="btn primary" id="goProjects">＋ New project</button>
    </div>

    <div class="stats">
      <div class="card stat">
        <span class="ico">♙</span>
        <strong>${usersCount}</strong>
        <small>Users</small>
      </div>
      <div class="card stat">
        <span class="ico">▣</span>
        <strong>${p.projects.length}</strong>
        <small>Projects</small>
      </div>
      <div class="card stat">
        <span class="ico">⌁</span>
        <strong>Railway</strong>
        <small>Infrastructure</small>
      </div>
      <div class="card stat">
        <span class="ico">◉</span>
        <strong>Online</strong>
        <small>Control panel</small>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>Quick status</h3>
        <span class="tag green">Control plane online</span>
      </div>
      <p class="subtle">
        Create projects, upload ZIP archives, manage files and install packages from curated lists.
        Real customer workloads are provisioned as separate Railway services.
      </p>
    </div>
  `;

  $("#goProjects")?.addEventListener("click", () => {
    document.querySelector('[data-page="projects"]').click();
  });
}
