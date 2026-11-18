import { api } from "./api.js";
import { $, toast } from "./ui.js";

let currentUser = null;

export function getUser() {
  return currentUser;
}

export async function bindAuth(onReady) {
  const form = $("#loginForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { username: fd.get("username"), password: fd.get("password") }
      });
      currentUser = data.user;
      $("#login").classList.add("hidden");
      $("#shell").classList.remove("hidden");
      $("#identity").textContent = `${currentUser.username} · ${currentUser.role}`;
      onReady(currentUser);
    } catch (err) {
      $("#loginError").textContent = err.message;
    }
  });

  $("#logout").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    location.reload();
  });

  // Check existing session
  try {
    const me = await api("/api/auth/me");
    if (me.user) {
      currentUser = me.user;
      $("#login").classList.add("hidden");
      $("#shell").classList.remove("hidden");
      $("#identity").textContent = `${currentUser.username} · ${currentUser.role}`;
      onReady(currentUser);
    }
  } catch {}
}
