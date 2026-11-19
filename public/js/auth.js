import { api } from "./api.js";
import { $, toast } from "./ui.js";

let currentUser = null;
export function getUser() { return currentUser; }

function showApp(user, onReady) {
  currentUser = user;
  const login = document.getElementById("login");
  const shell = document.getElementById("shell");
  if (login) login.classList.add("hidden");
  if (shell) shell.classList.remove("hidden");
  const id = document.getElementById("identity");
  if (id) id.textContent = `${user.username} · ${user.role}`;
  try {
    onReady(user);
  } catch (e) {
    console.error(e);
    toast("UI error: " + e.message, "error");
  }
}

export async function bindAuth(onReady) {
  const form = document.getElementById("loginForm");
  const errEl = document.getElementById("loginError");
  const regForm = document.getElementById("registerForm");

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (errEl) errEl.textContent = "";
      const fd = new FormData(form);
      const username = String(fd.get("username") || "").trim();
      const password = String(fd.get("password") || "");
      const btn = form.querySelector("button[type=submit]");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Signing in…";
      }
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data.error || ("Login failed (" + res.status + ")");
          if (errEl) errEl.textContent = msg;
          toast(msg, "error");
          return;
        }
        if (!data.user) {
          if (errEl) errEl.textContent = "Login response missing user";
          return;
        }
        showApp(data.user, onReady);
      } catch (err) {
        const msg = err.message || "Network error";
        if (errEl) errEl.textContent = msg;
        toast(msg, "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Sign in";
        }
      }
    });
  }

  if (regForm) {
    regForm.addEventListener("submit", async e => {
      e.preventDefault();
      const box = document.getElementById("registerError");
      if (box) box.textContent = "";
      const fd = new FormData(regForm);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            username: fd.get("username"),
            email: fd.get("email"),
            password: fd.get("password")
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (box) {
            box.style.color = "var(--red)";
            box.textContent = data.error || "Register failed";
          }
          return;
        }
        if (box) {
          box.style.color = "var(--green)";
          box.textContent = data.message || "Registered — wait for admin approval";
        }
        toast(data.message || "Registered", "ok");
        regForm.reset();
      } catch (err) {
        if (box) {
          box.style.color = "var(--red)";
          box.textContent = err.message || "Register failed";
        }
      }
    });
  }

  document.getElementById("showRegister")?.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("loginPanel")?.classList.add("hidden");
    document.getElementById("registerPanel")?.classList.remove("hidden");
  });
  document.getElementById("showLogin")?.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("registerPanel")?.classList.add("hidden");
    document.getElementById("loginPanel")?.classList.remove("hidden");
  });

  document.getElementById("logout")?.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {}
    location.reload();
  });

  // restore session
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (data.user) showApp(data.user, onReady);
  } catch {}
}
