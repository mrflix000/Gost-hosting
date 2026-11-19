import { api } from "../api.js";
import { $, esc, toast, dialogForm, logToConsole } from "../ui.js";

export async function renderUsers(user) {
  if (user.role !== "admin") {
    $("#content").innerHTML = `<div class="empty"><h3>Admin only</h3></div>`;
    return;
  }

  async function load() {
    const data = await api("/api/admin/users");
    $("#content").innerHTML = `
      <div class="welcome" style="margin-bottom:1.2rem">
        <div>
          <div class="eyebrow">ADMINISTRATION</div>
          <h3>Users</h3>
          <div class="subtle">Approve pending accounts · manage roles</div>
        </div>
        <button class="btn primary" id="addUser">Add user</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${data.users.map(u => `
              <tr>
                <td>${u.id}</td>
                <td>${esc(u.username)}</td>
                <td>${esc(u.email)}</td>
                <td><span class="tag">${esc(u.role)}</span></td>
                <td><span class="tag ${u.status==='active'?'green':u.status==='pending'?'orange':'orange'}">${esc(u.status)}</span></td>
                <td style="display:flex;gap:0.35rem;flex-wrap:wrap">
                  ${u.status === "pending" ? `<button class="btn primary sm" data-approve="${u.id}">Approve</button>` : ""}
                  ${u.id !== user.id && u.status === "active" ? `<button class="btn outline sm" data-toggle="${u.id}" data-status="suspended">Suspend</button>` : ""}
                  ${u.id !== user.id && u.status === "suspended" ? `<button class="btn outline sm" data-toggle="${u.id}" data-status="active">Activate</button>` : ""}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    $("#addUser")?.addEventListener("click", async () => {
      const result = await dialogForm({
        title: "Add user",
        confirmText: "Create",
        fields: [
          { id: "username", label: "Username" },
          { id: "email", label: "Email", type: "email" },
          { id: "password", label: "Password", type: "password" },
          { id: "role", label: "Role", type: "select", value: "user", options: [
            { value: "user", label: "user" },
            { value: "admin", label: "admin" },
            { value: "demo", label: "demo (view only)" }
          ]}
        ]
      });
      if (!result?.username) return;
      try {
        await api("/api/admin/users", { method: "POST", body: result });
        toast("User created", "ok");
        load();
      } catch (e) { toast(e.message, "error"); }
    });

    document.querySelectorAll("[data-approve]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/admin/users/${btn.dataset.approve}`, { method: "PATCH", body: { status: "active" } });
          toast("Approved", "ok");
          load();
        } catch (e) { toast(e.message, "error"); }
      });
    });
    document.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/admin/users/${btn.dataset.toggle}`, { method: "PATCH", body: { status: btn.dataset.status } });
          toast("Updated", "ok");
          load();
        } catch (e) { toast(e.message, "error"); }
      });
    });
  }
  await load();
}
