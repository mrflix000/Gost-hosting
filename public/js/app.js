import { bindAuth, getUser } from "./auth.js";
import { $, injectIcons } from "./ui.js";
import { renderOverview } from "./pages/overview.js";
import { renderProjects } from "./pages/projects.js";
import { renderFiles } from "./pages/files.js";
import { renderPackages } from "./pages/packages.js";
import { renderConsole } from "./pages/console.js";
import { renderSettings } from "./pages/settings.js";
import { renderUsers } from "./pages/users.js";
import { renderRailway } from "./pages/railway.js";
import { renderActivity } from "./pages/activity.js";

const pages = {
  overview: { title: "Overview", render: renderOverview },
  projects: { title: "Projects", render: renderProjects },
  files: { title: "File Manager", render: renderFiles },
  packages: { title: "Packages", render: renderPackages },
  console: { title: "Terminal", render: renderConsole },
  settings: { title: "Settings", render: renderSettings },
  users: { title: "Users", render: renderUsers },
  railway: { title: "Railway Control", render: renderRailway },
  activity: { title: "Activity History", render: renderActivity }
};

function navigate(page) {
  if (!pages[page]) return;
  document.querySelectorAll(".nav").forEach(n => {
    n.classList.toggle("active", n.dataset.page === page);
  });
  $("#pageTitle").textContent = pages[page].title;
  const user = getUser();
  pages[page].render(user).catch(e => {
    $("#content").innerHTML = `<div class="empty"><h3>Error</h3><p>${e.message}</p></div>`;
  });
}

bindAuth(user => {
  injectIcons();
  if (user.role !== "admin") {
    document.querySelectorAll(".nav.admin").forEach(n => n.style.display = "none");
  }
  document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });
  navigate("overview");
});
