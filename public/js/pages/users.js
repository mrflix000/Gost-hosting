import { api } from "../api.js";
import { $, esc, toast, modal } from "../ui.js";

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
        </div>
        <button class="btn primary" id="addUser">＋ Add user</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            ${data.users.map(u => `
              <tr>
                <td>${u.id}</td>
                <td>${esc(u.username)}</td>
                <td>${esc(u.email)}</td>
                <td><span class="tag">${esc(u.role)}</span></td>
                <td><span class="tag ${u.status==='active'?'green':'orange'}">${esc(u.status)}</span></td>
                <td>
                  ${u.id !== user.id ? `
                    <button class="btn ghost sm" data-toggle="${u.id}" data-status="${u.status==='active'?'suspended':'active'}">
                      ${u.status==='active'?'Suspend':'Activate'}
                    </button>
                  ` : ""}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    $("#addUser").addEventListener("click", async () => {
      const result = await modal({
        title: "Add user",
        body: `
          <div style="display:flex;flex-direction:column;gap:0.8rem">
            <label>Username <input id="uName"></label>
            <label>Email <input id="uEmail" type="email"></label>
            <label>Password <input id="uPass" type="password"></label>
            <label>Role
              <select id="uRole"><option value="user">user</option><option value="admin">admin</option></select>
            </label>
          </div>
        `,
        confirmText: "Create",
        onConfirm: el => ({
          username: el.querySelector("#uName").value.trim(),
          email: el.querySelector("#uEmail").value.trim(),
          password: el.querySelector("#uPass").value,
          role: el.querySelector("#uRole").value
        })
      });
      if (!result?.username) return;
      try {
        await api("/api/admin/users", { method: "POST", body: result });
        toast("User created", "ok");
        load();
      } catch (e) { toast(e.message, "error"); }
    });

    $$("[data-toggle]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/admin/users/${btn.dataset.toggle}`, {
            method: "PATCH",
            body: { status: btn.dataset.status }
          });
          toast("Updated", "ok");
          load();
        } catch (e) { toast(e.message, "error"); }
      });
    });
  }

  await load();
}
