# GHOST HOSTING v0.2

Responsive dark hosting control-panel foundation (35+ separated source files).

## Deploy
1. Push this folder to a private/public GitHub repository.
2. Deploy the repository as a Railway service.
3. Add a PostgreSQL service and set `DATABASE_URL` to its private connection variable.
4. Set `SESSION_SECRET` to a long random value, `ADMIN_USERNAME`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD` (14+ characters), and `RAILWAY_API_TOKEN` as Railway variables.
5. Set `PROJECT_FILES_ROOT` to a persistent volume mount if you want uploaded project
   files to survive redeploys. Attach a Railway Volume at that mount path.
6. Deploy and open the generated Railway domain.

## Implemented in this starter
- Login, logout, environment-bootstrapped owner, PostgreSQL sessions.
- Admin user management and activity history.
- Internal modal/dialog UI (does not open Chrome for dialogs).
- Runtime choice (Node.js, Python, PHP) in project creation.
- Per-user project records and isolated server-side project directories.
- Upload, list, rename, edit, and delete text files inside each user's project directory.
- Railway API adapter kept server-side; project listing and service create/deploy/redeploy/delete.

## Important runtime distinction
Choosing Node.js/Python/PHP records the runtime and generates a starter manifest. It does
not execute arbitrary customer code inside the control-panel process. Real hosting is
provisioned as separate Railway services. The Railway API adapter must be verified against
your Railway account/API schema and permissions before production use.

## Not yet implemented / requires dedicated integration
True interactive PTY terminal, streamed Railway deployment/runtime logs, resource metrics,
automatic backups/restores, custom-domain provisioning, billing, enforced CPU/RAM quotas,
GitHub OAuth, ZIP import, malware scanning, and production-grade audit/retention policies.
The Console currently displays platform actions and project metadata; it does not fake live
runtime output. No browser popup or external Chrome window is used for in-app dialogs.

Never commit `.env` or secrets. Use a persistent Railway Volume for project files.
