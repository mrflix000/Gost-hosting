export function manifest(runtime, projectName) {
  const safe = (projectName || "app").replace(/[^a-z0-9-_]/gi, "-").toLowerCase();

  if (runtime === "python") {
    return {
      "requirements.txt": "python-telegram-bot==21.6\npython-dotenv==1.0.1\n",
      "bot.py": `import os
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("gost")

TOKEN = os.environ.get("BOT_TOKEN") or os.environ.get("TELEGRAM_TOKEN") or ""

log.info("Gost Hosting · Python bot starting")
log.info("Project: %s", "${safe}")

if not TOKEN:
    log.warning("Set BOT_TOKEN or TELEGRAM_TOKEN in environment / .env")
    log.info("Idle mode — add your bot code in bot.py")
    # keep process alive for panel logs
    import time
    while True:
        log.info("waiting for BOT_TOKEN…")
        time.sleep(60)
else:
    from telegram import Update
    from telegram.ext import Application, CommandHandler, ContextTypes

    async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text("Hello from Gost Hosting · ${safe}")

    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    log.info("Telegram bot polling…")
    app.run_polling()
`,
      ".env.example": "BOT_TOKEN=123456:ABC-your-telegram-bot-token\n",
      "README.md": `# ${projectName}

Python Telegram bot on Gost Hosting.

1. Put token in \`.env\` as BOT_TOKEN=
2. Install packages from panel (or requirements.txt)
3. Press **Start** and watch **Terminal**
`
    };
  }

  return {
    "package.json": JSON.stringify({
      name: safe,
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: { start: "node bot.js" },
      dependencies: {
        telegraf: "^4.16.3",
        dotenv: "^16.4.5"
      }
    }, null, 2),
    "bot.js": `import "dotenv/config";
import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_TOKEN || "";
const name = "${safe}";

console.log("Gost Hosting · Node bot starting");
console.log("Project:", name);

if (!token) {
  console.warn("Set BOT_TOKEN or TELEGRAM_TOKEN in environment / .env");
  console.log("Idle mode — add your bot code in bot.js");
  setInterval(() => console.log("waiting for BOT_TOKEN…"), 60000);
} else {
  const bot = new Telegraf(token);
  bot.start((ctx) => ctx.reply("Hello from Gost Hosting · " + name));
  bot.command("ping", (ctx) => ctx.reply("pong"));
  bot.launch().then(() => console.log("Telegram bot polling…"));
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
`,
    ".env.example": "BOT_TOKEN=123456:ABC-your-telegram-bot-token\n",
    "README.md": `# ${projectName}

Node.js Telegram bot on Gost Hosting.

1. Set BOT_TOKEN in \`.env\`
2. Start from panel → watch Terminal logs
`
  };
}
