import { api } from "../api.js";
import { $, esc, consoleLog, logToConsole } from "../ui.js";

const HELP = [
  "Commands:",
  "  help              Show help",
  "  clear             Clear screen",
  "  status            Panel status",
  "  projects          List projects",
  "  running           List running bots/processes",
  "  logs <id>         Fetch recent process logs",
  "  start <id>        Start project process",
  "  stop <id>         Stop project process",
  "  whoami            Current user",
  "  echo <text>       Print text"
];

export async function renderConsole(user) {
  $("#content").innerHTML = `
    <div class="welcome" style="margin-bottom:1rem">
      <div>
        <div class="eyebrow">WORKSPACE</div>
        <h3>Terminal</h3>
        <div class="subtle">Logs for bots & tools appear here. Use start/stop/logs commands.</div>
      </div>
      <button class="btn outline sm" id="clearTerm">Clear</button>
    </div>
    <div class="terminal" id="term"></div>
    <div class="term-input-row">
      <span class="term-prompt">gost@hosting:~$</span>
      <input id="termInput" class="term-input" autocomplete="off" spellcheck="false" placeholder="help · running · start 1 · logs 1">
    </div>
  `;

  const term = $("#term");
  const input = $("#termInput");

  function print(cls, text) {
    const d = document.createElement("div");
    d.className = `line ${cls}`;
    d.textContent = text;
    term.appendChild(d);
    term.scrollTop = term.scrollHeight;
  }

  consoleLog.forEach(e => print(e.type, `[${e.time}] ${e.text}`));
  print("info", `Gost Hosting Terminal — bots & tools`);
  print("info", `User: ${user.username} (${user.role})`);
  print("cmd", "Type help · For Telegram bots: set BOT_TOKEN then start <id>");

  const onLog = (e) => {
    const { type, text, time } = e.detail;
    print(type, `[${time}] ${text}`);
  };
  window.addEventListener("ghost-console", onLog);

  async function run(cmd) {
    const raw = cmd.trim();
    if (!raw) return;
    print("cmd", `gost@hosting:~$ ${raw}`);
    const [name, ...args] = raw.split(/\s+/);
    const a0 = args[0];

    try {
      if (name === "help") HELP.forEach(l => print("info", l));
      else if (name === "clear") term.innerHTML = "";
      else if (name === "whoami") print("ok", `${user.username} [${user.role}]`);
      else if (name === "echo") print("ok", args.join(" "));
      else if (name === "status") {
        print("ok", "Control plane online");
        print("info", "Node & Python processes supported (Telegram bots, tools, jobs)");
      }
      else if (name === "projects") {
        const data = await api("/api/projects");
        if (!data.projects.length) print("info", "No projects");
        else data.projects.forEach(p => print("ok", `#${p.id}  ${p.name}  [${p.runtime}]`));
      }
      else if (name === "running") {
        const data = await api("/api/projects");
        let any = false;
        for (const p of data.projects) {
          try {
            const st = await api(`/api/projects/${p.id}/runtime`);
            if (st.running) {
              any = true;
              print("ok", `#${p.id} ${p.name} pid=${st.pid} port=${st.port} [${st.runtime}]`);
            }
          } catch {}
        }
        if (!any) print("info", "No running processes");
      }
      else if (name === "logs") {
        if (!a0) { print("err", "Usage: logs <projectId>"); return; }
        const st = await api(`/api/projects/${a0}/runtime`);
        if (!st.logs?.length) print("info", st.running ? "No logs yet" : "Not running");
        else st.logs.forEach(l => print(l.type === "err" ? "err" : "info", l.text));
      }
      else if (name === "start") {
        if (!a0) { print("err", "Usage: start <projectId>"); return; }
        print("info", "Starting… (npm/pip install may take a moment)");
        const st = await api(`/api/projects/${a0}/runtime/start`, { method: "POST" });
        print(st.running ? "ok" : "err", st.running ? `Running pid=${st.pid}` : "Failed");
        (st.logs || []).slice(-15).forEach(l => print(l.type === "err" ? "err" : "info", l.text));
        logToConsole(st.running ? "ok" : "err", `start #${a0}`);
      }
      else if (name === "stop") {
        if (!a0) { print("err", "Usage: stop <projectId>"); return; }
        await api(`/api/projects/${a0}/runtime/stop`, { method: "POST" });
        print("ok", `Stopped #${a0}`);
        logToConsole("ok", `stop #${a0}`);
      }
      else {
        print("err", `Unknown: ${name}. Type help.`);
      }
    } catch (e) {
      print("err", e.message || "Error");
      logToConsole("err", e.message || "Error");
    }
  }

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const v = input.value;
      input.value = "";
      run(v);
    }
  });
  $("#clearTerm").addEventListener("click", () => { term.innerHTML = ""; print("info", "Cleared"); });
  input.focus();
}
