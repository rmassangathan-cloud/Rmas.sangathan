# Production Readiness Checklist ✅

## 1) Local run & dev scripts 🔧
- npm install
- npm start  # should run `node index.js`
- npm run dev # runs `nodemon index.js` (optional)
- Confirm `package.json` has `start` set to `node index.js` and `dev` to `nodemon index.js`.

## 2) Environment variables & secrets 🔒
- Add `.env.example` to repository (do NOT commit real secrets)
- Ensure `.env` is in `.gitignore`
- Required vars (example):
  - PORT
  - MONGO_URI (if using DB)
  - SESSION_SECRET
  - ENABLE_CORS (optional)
  - ENABLE_METRICS (optional)
  - RATE_LIMIT_MAX

## 3) Server & health checks ❤️
- Ensure server reads `process.env.PORT || 3000` (or default) — DONE
- Add `/health` endpoint returning 200 OK (used for probes) — DONE
- Optionally add `/metrics` for Prometheus (enable with env var) — DONE (requires `prom-client`)

## 4) Security & middleware 🔐
- Add `helmet` for headers — DONE
- Add `cors` and enable via `ENABLE_CORS` env — DONE
- Add `express-rate-limit` and tune via env — INSTALLED
- Use input validation (e.g., `express-validator`) — INSTALLED
- Use `csurf` for forms (already present)

## 5) Logging & monitoring 📈
- Add structured logging (`winston`/`pino`) — `winston` added as dependency
- Configure external aggregator (e.g., Datadog, Papertrail)
- Add uptime monitoring (UptimeRobot)

## 6) Process manager & containerization 🐳
- PM2: `pm2 start index.js --name human-right` (script added)
- Dockerfile added (multi-step recommended for prod image)

## 7) CI/CD and deploy 🔁
- Add GitHub Actions to: install deps, run lint/tests, build Docker image, push to registry, deploy to host
- Store secrets in project CI secrets (DOCKERHUB_TOKEN, MONGO_URI, SESSION_SECRET, etc.)
- Choose deployment: Render/Heroku/Railway for simplicity; DigitalOcean/AWS for containers; Kubernetes for large-scale

## 8) DB migrations & backups 🗄️
- Use a migration tool appropriate to DB (migrate/knex/typeorm/mongoose-migrate)
- Ensure regular backups and tested restore

## 9) Testing & readiness ✅
- Add automated tests (unit/integration)
- Add smoke tests hitting `/health` post-deploy

---

If you want, I can:
- Add `prom-client` instrumentation fully and example Grafana dashboard
- Add `winston` config and log file rotation
- Create a GitHub Actions workflow template that builds Docker and pushes to GHCR/Docker Hub
- Add an example `docker-compose.yml` for local testing

Tell me which of the above you'd like me to implement next.

---

## Documents download flow (new)

- Removed background PDF and ID card generation that previously ran on role assignment by admins.
- Now, when a role is assigned, admins will *send a notification email* to the member with a link to request downloads.
- Public flow added:
  - Header link: "ID Card / Joining Letter" -> `/documents/request-download`
  - User provides name + email and receives an OTP via email
  - User verifies OTP and is redirected to a short-lived profile page with buttons to download ID Card or Joining Letter
  - PDFs are generated on-demand (server-side) and returned as downloads

Manual tests to run after deploy:
1) Assign a role in admin to an existing member with an email; verify an email is sent with a link containing their email.
2) Click header -> ID Card / Joining Letter -> enter the member's email and correct name if asked -> receive OTP in email.
3) Enter OTP -> confirm you see the profile page and can download both documents; verify file contents and that downloads complete.
4) Try invalid OTP and expired tokens to ensure proper error messages and no document access.

Notes:
- Ensure `PUPPETEER_EXECUTABLE_PATH` is set on the host or use the default bundled Chromium in environments that support it.
- Add `APP_BASE_URL` to .env for absolute links in emails.
- Optional: enable `RECAPTCHA_SECRET` and `RECAPTCHA_SITE_KEY` to protect the request form from abuse.