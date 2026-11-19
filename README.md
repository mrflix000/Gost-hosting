# Gost Hosting

Control panel that **really runs Node.js and Python** projects on the same server.

## Real hosting

- **Node.js**: Start from panel → process runs → open `/run/:id/`
- **Python**: Start from panel → installs requirements → runs Flask → open `/run/:id/`
- **PHP**: removed (not supported)

## Flow

1. Create a Node or Python project
2. Upload your code (ZIP / files) or use the starter files
3. Click **Start**
4. Click **Open live** → your app is live at `/run/PROJECT_ID/`

## Deploy panel on Railway

```bash
# Required env
SESSION_SECRET=at-least-32-random-characters-here
ADMIN_USERNAME=owner
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=at-least-14-chars
# Optional Postgres — otherwise SQLite
# DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Attach a Volume to `/app/project-files` so project files survive redeploys.

## Notes

- Processes run on the same machine as the panel (trusted admin use).
- Each project gets its own port; the panel proxies `/run/:id` to it.
- Stop a project from the panel when finished.
- For heavy multi-tenant isolation, still prefer one Railway service per customer app.

