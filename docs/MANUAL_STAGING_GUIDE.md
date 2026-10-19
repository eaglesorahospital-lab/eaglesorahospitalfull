# Manual Staging Setup Guide & Pre-Deployment Safety Runbook (Phase 25)

**Project:** EgleSora Hospital Platform  
**Target Architecture:**
* **Frontend:** React 18 + Vite SPA on **Netlify Free Tier**
* **Backend:** Django 5.1 + Django REST Framework on **Render Free Web Service**
* **Database:** **Neon Serverless PostgreSQL Free Tier**
* **Cache & Rate Limiting:** **Upstash Redis Free Tier** (TLS enforced)
* **Persistent Media Storage:** **Cloudinary Free Tier** (Server-side only)
* **Background Processing:** Synchronous Demo Mode (`CELERY_TASK_ALWAYS_EAGER=True`)
* **Data Policy:** **STRICTLY SYNTHETIC DEMONSTRATION DATA ONLY**

---

## 1. Mandatory Safeguards & Scope Authorization

> [!CAUTION]
> ### Strictly Prohibited Actions (Zero Automated Changes)
> This runbook is a **manual operator guide** for the human platform owner. The automated AI assistant is strictly prohibited from:
> 1. Creating, provisioning, or purchasing remote cloud resources or provider accounts.
> 2. Entering credentials into remote provider dashboards.
> 3. Connecting to, inspecting, migrating, or modifying any remote database.
> 4. Deploying or triggering remote builds on Netlify or Render.
> 5. Pushing commits, creating tags, or merging branches on GitHub.
> 6. Accessing, importing, or testing with real patient records or live Protected Health Information (PHI).
> 7. Modifying, redesigning, or changing permissions in the Super Admin Panel (`/admin/*`).
> 8. Printing, logging, or exposing secret keys, passwords, or connection credentials.

---

## 2. Technical Findings & Corrections

Before starting the setup, review these four architectural and operational requirements:

### A. Upstash Redis Connection URI Format
* **Requirement:** In hosted environments (Render), `REDIS_URL` must be configured with Upstash's TLS-encrypted connection string:
  ```text
  rediss://default:<password>@<endpoint>.upstash.io:6379
  ```
  *(Note the double `'s'` in `rediss://`, which signals Redis over TLS).*
* **Local vs. Hosted Distinction:** The local Docker Compose setting (`redis://redis:6379/1`) is valid **strictly inside local Docker networks**. It must never be used in Render environment settings.
* **Security & Fail-Fast Behavior:** When `DJANGO_DEBUG=False`, Django will fail fast on startup with `ImproperlyConfigured` if `REDIS_URL` is omitted. The fallback `ALLOW_IN_MEMORY_CACHE_FALLBACK=True` stores throttle counters in-memory per worker process and must **never** be used for hosted production with real credentials.

### B. Safe Rollback Instructions (Preserving Local Git History)
* **Pre-existing Local History:** The local `main` branch is **7 commits ahead** of `origin/main` (containing Phase 18–22 enhancements).
* **Command Warning:** **NEVER execute `git checkout origin/main -- ...` or `git reset --hard`!** Doing so will permanently wipe out all local commits ahead of `origin/main`.
* **Safe Reversal Procedure:** If you ever need to reverse Phase 24/25 changes without touching prior work:
  1. Inspect the working tree diff: `git diff HEAD`
  2. To discard unstaged changes in a specific file: `git restore <file>` (e.g., `git restore backend/config/settings.py`)
  3. To delete untracked test files: remove `tests/test_phase24_demo_configuration.py`.
  4. Always verify git status with `git status --short` before and after any reversal.

### C. Cloudinary Ephemeral Disk Policy on Render
* **Render Disk Behavior:** Render Web Services (both Free and Starter tiers) run on **ephemeral container filesystems**. Any files written to local disk (e.g., `backend/media/`) are **permanently wiped and lost** whenever Render restarts the service, deploys an update, or wakes from sleep.
* **Persistent Media Rule:** To persist doctor profile photos, department photographs, and hospital logos, valid Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) **must be supplied** in Render's environment settings.
* **Server-Side Scope:** Cloudinary credentials must be set exclusively in the Django backend. They must **never** be prefixed with `VITE_` or entered into Netlify.

### D. Synchronous Demo Notification Mode
* **Eager Execution:** Setting `CELERY_TASK_ALWAYS_EAGER=True` and `CELERY_TASK_EAGER_PROPAGATES=False` runs immediate notification tasks (appointment confirmation, cancellation, and rescheduling) in-process on the web worker upon database transaction commitment (`transaction.on_commit`).
* **Broker Isolation:** Celery broker defaults to `memory://` in eager mode, preventing unnecessary network calls and conserving Upstash Redis command credits.
* **SMTP Delivery Reality:** Successful task execution simply means the task code completed. Actual email delivery requires a working SMTP service (e.g., SendGrid, Brevo, Resend). If SMTP fails or times out, the error is recorded in PostgreSQL in the `Notification` table with status `FAILED`, and the appointment booking itself commits safely.
* **Scheduled Reminders Inactive:** Automated 24-hour advance appointment reminders (`process_appointment_reminders_task`) **do not run** in this demo configuration because no Celery Beat periodic scheduler or continuous background worker is deployed. Reminders require a separately funded and provisioned worker service.

---

## 3. Official Provider Documentation & Reference Sources

*Verified on: October 18, 2026*

| Provider | Component | Official Documentation Link | Verified Plan / Free-Tier Allowances |
|---|---|---|---|
| **Netlify** | Vite React SPA Deployment | [Netlify Redirects Documentation](https://docs.netlify.com/routing/redirects/) | **Free:** 100 GB monthly bandwidth, 300 build minutes/month. Single-page apps require `/* /index.html 200` rewrite rule. |
| **Render** | Django Web Service | [Render Deploy Django Guide](https://render.com/docs/deploy-django) | **Free Web Service:** 512 MB RAM, shared CPU. Spins down after 15 min idle. 750 free instance hours/month. |
| **Neon** | Serverless PostgreSQL | [Neon Connection Pooling Guide](https://neon.tech/docs/connect/connection-pooling) | **Free:** 1 GB SSD storage, 100 compute-unit hours/month. Scales to zero when idle; wakes in ~1s. SSL enforced (`sslmode=require`). Built-in PgBouncer on port 5432 with `-pooler` hostname. |
| **Upstash** | Serverless Redis (TLS) | [Upstash Redis TLS Docs](https://upstash.com/docs/redis/features/tls) | **Free:** 256 MB RAM, 500,000 commands/month, 10,000 req/sec limit. Enforces TLS (`rediss://...`). |
| **Cloudinary** | Django Media Storage | [Cloudinary Django Integration](https://cloudinary.com/documentation/django_integration) | **Free:** 25 monthly credits shared across storage, image transformations, and bandwidth. Server-side only. |

---

## 4. Step-by-Step Manual Operator Setup Guide

Follow these steps sequentially to deploy the demonstration platform.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      MANUAL DEPLOYMENT WORKFLOW                        │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Step 1: Readiness │ Step 2: Accounts  │ Step 3: Neon PostgreSQL        │
│ Run local checks  │ Register 5 clouds │ Copy DATABASE_URL (SSL req)    │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Step 4: Upstash   │ Step 5: Cloudinary│ Step 6: Render Backend         │
│ Copy TLS rediss://│ Copy API keys     │ Set env vars & build backend   │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Step 7: Netlify   │ Step 8: Smoke Test│ Step 9: Synthetic Verification │
│ Set API URL & SPA │ 10-point checklist│ Confirm no real patient data   │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

### Step 1 — Local Readiness Verification
Before configuring remote services, run the local verification suite on your workstation:

```bash
# 1. Verify Django system checks:
python backend/manage.py check

# 2. Verify deployment compatibility and demo configuration tests:
pytest tests/test_phase24_demo_configuration.py tests/test_phase22_deployment_compatibility.py

# 3. Verify core security and RBAC regression suites:
pytest tests/test_patient_login_admin_protection.py tests/test_doctor_admin_panel_isolation.py tests/test_authentication_rbac.py

# 4. Verify frontend production build:
npm --prefix frontend run build
```
*All tests must pass (100%) and the frontend build must complete with 0 errors before proceeding.*

---

### Step 2 — Create Provider Free-Tier Accounts (Manual Owner Action)
Register free accounts using your administrative email:
1. **Netlify:** [https://app.netlify.com/signup](https://app.netlify.com/signup) (Sign up via GitHub).
2. **Render:** [https://dashboard.render.com/register](https://dashboard.render.com/register) (Sign up via GitHub).
3. **Neon:** [https://console.neon.tech/signup](https://console.neon.tech/signup).
4. **Upstash:** [https://console.upstash.com/](https://console.upstash.com/).
5. **Cloudinary:** [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free).

---

### Step 3 — Neon PostgreSQL Setup
1. In the Neon Console, click **New Project**.
2. Name the project `eglesora-hospital-demo` and select your preferred region (e.g., `US East (Ohio)` or `AWS US East (N. Virginia)` to minimize latency to Render).
3. Under **Dashboard > Connection Details**, select:
   * **Connection string:** `PostgreSQL`
   * Check **Connection Pooling** (if you wish to use the pooled endpoint).
4. Copy the connection URI. It will look like:
   ```text
   postgres://<username>:<password>@<ep-endpoint>-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. **Important Configuration Notes:**
   * Ensure `sslmode=require` is present in the query string.
   * If your password contains special characters (`@`, `:`, `!`, `/`), ensure they are URL-encoded (`%40`, `%3A`, `%21`).
   * When using the `-pooler` pooled endpoint, set `DJANGO_DB_CONN_MAX_AGE=0` in Render.
6. **Database Migration:** Do **NOT** run migrations yet. Migrations are executed manually in Step 6 after the Render web service is initialized.

---

### Step 4 — Upstash Redis Setup
1. In the Upstash Console, click **Create Database**.
2. Name: `eglesora-cache-demo`.
3. Select **Primary Region** matching your Render region (e.g., `US-East-1`).
4. Select **Type:** Regional, **Eviction:** Enabled (LRU).
5. Once created, scroll to the **Connect to your database** section and select the **TCP** tab (not REST).
6. Copy the connection URI starting with `rediss://`:
   ```text
   rediss://default:<password>@<endpoint>.upstash.io:6379
   ```
7. This string will be pasted as `REDIS_URL` in Render.

---

### Step 5 — Cloudinary Media Storage Setup
1. In the Cloudinary Dashboard, navigate to **Programmable Media > Dashboard**.
2. Locate the **Account Details** card containing:
   * **Cloud Name:** (e.g., `hospital-demo-cloud`)
   * **API Key:** (15-digit number)
   * **API Secret:** (alphanumeric string)
3. These three values will be entered into Render environment variables.
4. **Security Notice:** Never prefix these variables with `VITE_` or enter them into Netlify.

---

### Step 6 — Render Backend Web Service Setup

1. In the Render Dashboard, click **New + > Web Service**.
2. Connect your GitHub repository: `eglesora-hospital-platform`.
3. Configure the service settings:
   * **Name:** `eglesora-hospital-backend`
   * **Region:** Matching Neon/Upstash (e.g., `Ohio (US East)`)
   * **Branch:** `main`
   * **Root Directory:** `backend` *(CRITICAL: Django application files reside in `backend/`)*
   * **Runtime:** `Python 3`
   * **Build Command:**
     ```bash
     pip install -r requirements.txt && python manage.py collectstatic --noinput
     ```
   * **Start Command:**
     ```bash
     gunicorn config.wsgi:application
     ```
   * **Plan:** `Free`
4. Expand **Advanced Settings**:
   * **Health Check Path:** `/api/health/` *(Lightweight probe returning HTTP 200)*
5. Add the following **Environment Variables** in Render's dashboard:

| Variable Name | Value / Placeholder | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | *(Generate a 50+ character random string)* | Cryptographic security key |
| `DJANGO_DEBUG` | `False` | Enforce production security |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,.onrender.com` | Host header validation |
| `DATABASE_URL` | `postgres://<user>:<password>@<ep-endpoint>.neon.tech/neondb?sslmode=require` | Neon connection URI |
| `DJANGO_DB_SSL_REQUIRE` | `True` | Enforce SSL on DB queries |
| `DJANGO_DB_CONN_MAX_AGE` | `0` | Prevent stale connections on pooler |
| `REDIS_URL` | `rediss://default:<password>@<endpoint>.upstash.io:6379` | Upstash TLS cache URI |
| `ALLOW_IN_MEMORY_CACHE_FALLBACK` | `False` | Reject insecure single-worker cache |
| `CELERY_TASK_ALWAYS_EAGER` | `True` | Run notifications in-process |
| `CELERY_TASK_EAGER_PROPAGATES` | `False` | Prevent SMTP errors from failing HTTP |
| `CORS_ALLOWED_ORIGINS` | `https://<your-netlify-app>.netlify.app` | Allow Netlify frontend requests |
| `CSRF_TRUSTED_ORIGINS` | `https://<your-netlify-app>.netlify.app` | Cross-site request forgery protection |
| `REST_FRAMEWORK_NUM_PROXIES` | `1` | Correct IP resolution behind Render proxy |
| `CLOUDINARY_CLOUD_NAME` | `<your-cloudinary-cloud-name>` | Cloudinary storage |
| `CLOUDINARY_API_KEY` | `<your-cloudinary-api-key>` | Cloudinary authentication |
| `CLOUDINARY_API_SECRET` | `<your-cloudinary-api-secret>` | Cloudinary authentication |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` | Transactional email |
| `EMAIL_HOST` | `<your-smtp-host>` (e.g. `smtp.sendgrid.net`) | SMTP provider |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_USE_TLS` | `True` | SMTP TLS encryption |
| `EMAIL_HOST_USER` | `<your-smtp-username>` | SMTP user |
| `EMAIL_HOST_PASSWORD` | `<your-smtp-password-or-api-key>` | SMTP secret |
| `DEFAULT_FROM_EMAIL` | `noreply@eglesorahospital.com` | Outgoing sender address |

6. Click **Create Web Service**.
7. **Run Database Migrations (MANDATORY PREREQUISITE BEFORE FRONTEND TESTING):**
   > [!IMPORTANT]
   > **DO NOT visit public frontend pages or attempt patient/staff login before running migrations!**
   > Public endpoints (`/api/hospital/`, `/api/departments/`, `/api/doctors/`) and authentication endpoints query PostgreSQL. If migrations have not been applied, these endpoints will encounter database relation errors (HTTP 500). The lightweight probe `/api/health/` will succeed, but database-dependent routes will fail.

   Once the initial build completes, open the **Shell** tab in the Render Dashboard and run:
   ```bash
   python manage.py migrate --noinput
   ```
   *(Wait until all migrations complete successfully: `Applying ... OK`).*

8. **Verify Database & Redis Connectivity (Post-Migration Prerequisite Check):**
   Immediately after running migrations, verify that both Neon PostgreSQL and Upstash Redis are connected:
   ```bash
   curl -s https://<your-backend-name>.onrender.com/api/health/?detailed=1
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "hospital-platform-api",
     "details": {
       "database": "connected",
       "redis": "connected"
     }
   }
   ```
   *Only proceed to Step 7 (Netlify Frontend) after confirming both services report `"connected"`.*

9. **Create Demonstration Admin Account (Optional):**
   In the Render Shell, create a synthetic administrator for demo operations:
   ```bash
   python manage.py createsuperuser
   ```
   *(Use synthetic demonstration credentials only, e.g., `demo_admin@hospital.local`).*

---

### Step 7 — Netlify Frontend Setup

1. In the Netlify Dashboard, click **Add new site > Import an existing project**.
2. Connect your GitHub repository: `eglesora-hospital-platform`.
3. Configure the build settings:
   * **Base directory:** `frontend`
   * **Build command:** `npm run build`
   * **Publish directory:** `dist` *(Netlify resolves this relative to the base directory, i.e., `frontend/dist`)*
4. Under **Site configuration > Environment variables**, add:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<your-backend-name>.onrender.com` | **CRITICAL:** Backend URL **WITHOUT** a trailing slash |
| `VITE_API_TIMEOUT_MS` | `60000` | 60-second timeout to survive Render cold starts |

5. Click **Deploy Site**.
6. **SPA Routing Verification:** The repository already contains `frontend/public/_redirects` (`/* /index.html 200`), which Vite copies into `dist/_redirects`. This ensures page reloads on deep URLs (e.g., `/doctors`, `/appointments`) work without HTTP 404 errors.

---

### Step 8 — Live Staging Smoke Test Checklist (Synthetic Data Only)

> [!NOTE]
> **Distinction Between Local Automated Suites and Live Staging Smoke Tests:**
> Automated unit/regression tests (`pytest`, `vitest`, `node --test`) run in offline test harnesses using mock transports or local Docker fixtures. The following checklist is designed for the human operator to manually validate **live end-to-end HTTPS staging behavior** on Render and Netlify.

Execute this 10-point test checklist using **synthetic accounts only**:

```
[ ] 1. FRONTEND PAGE LOAD (Netlify):
       Open https://<your-site>.netlify.app.
       Confirm homepage renders with styles, navigation bar, and facade imagery.

[ ] 2. API LIGHTWEIGHT HEALTH PROBE (Render):
       Open https://<your-backend>.onrender.com/api/health/ in browser.
       Confirm response: {"status": "ok", "service": "hospital-platform-api"}.

[ ] 3. DEEP DEPENDENCY HEALTH PROBE (Render + Neon + Upstash):
       Open https://<your-backend>.onrender.com/api/health/?detailed=1.
       Confirm: database is "connected" (Neon SSL) and redis is "connected" (Upstash TLS).

[ ] 4. COLD-START TIMEOUT RESILIENCE:
       Allow backend to sleep (15 min idle). Click "Find Doctors" on frontend.
       Confirm request completes cleanly within 60s without browser timeout error.

[ ] 5. PATIENT REGISTRATION & LOGIN:
       Register a synthetic patient (e.g. test_patient_01@hospital.local).
       Confirm SimpleJWT tokens are issued and stored in browser session.

[ ] 6. ROLE ISOLATION & ADMIN PROTECTION:
       Attempt to navigate to /admin/ or /api/administrators/ with patient token.
       Confirm HTTP 403 Forbidden / role restriction notice is displayed.

[ ] 7. APPOINTMENT BOOKING LIFECYCLE:
       Book an appointment with a doctor for an available slot.
       Confirm appointment reference is generated and slot is marked reserved.
       Attempt to book the exact same slot in another tab; confirm slot contention error.

[ ] 8. SYNCHRONOUS NOTIFICATION RESILIENCE:
       Check Render logs for [TASK_START] and [NOTIFICATION_SENT] (or [TASK_FAILURE] if SMTP is offline).
       Confirm appointment booking succeeds even if SMTP encounters connection error.
       Notice: Scheduled 24-hour advance appointment reminders remain inactive in demo mode (requires Celery Beat).

[ ] 9. PERSISTENT MEDIA UPLOAD (Cloudinary Integration):
       Prerequisite: Valid CLOUDINARY_* environment variables must be configured on Render;
       otherwise, media saved to local container disk will be wiped upon service sleep/restart.
       Test in UI: Navigate to Admin > Doctor Directory, click "Edit" on a doctor,
       select a JPEG/PNG/WebP headshot (<5MB), and click "Upload" or "Save Changes".
       Confirm photo preview refreshes and image URL resolves to https://res.cloudinary.com/.

[ ] 10. DISTRIBUTED RATE-LIMITING VERIFICATION:
        Make rapid requests to /api/auth/login/ (16+ attempts).
        Confirm HTTP 429 Too Many Requests is returned after 15 attempts.
```

---

## 5. Complete Environment Variable Reference Matrix

| Variable Name | Service | Required? | Purpose | Example Format (Placeholders Only) | Restart/Redeploy Required? |
|---|---|---|---|---|---|
| `DJANGO_SECRET_KEY` | Render | **Yes** | Cryptographic signing key | `django-insecure-prod-key-xyz123...` | Redeploy |
| `DJANGO_DEBUG` | Render | **Yes** | Toggle debug mode (`False` in prod) | `False` | Redeploy |
| `DJANGO_ALLOWED_HOSTS` | Render | **Yes** | Permitted Host headers | `localhost,127.0.0.1,.onrender.com` | Redeploy |
| `DATABASE_URL` | Render | **Yes** | Neon PostgreSQL connection URI | `postgres://usr:pwd@ep-xyz.neon.tech/neondb?sslmode=require` | Redeploy |
| `DJANGO_DB_SSL_REQUIRE` | Render | **Yes** | Require SSL for database connection | `True` | Redeploy |
| `DJANGO_DB_CONN_MAX_AGE` | Render | Optional | Connection pooling max age (seconds) | `0` (for pooler) or `600` (for direct) | Redeploy |
| `REDIS_URL` | Render | **Yes** | Upstash TLS Redis URI | `rediss://default:pwd@endpoint.upstash.io:6379` | Redeploy |
| `REDIS_CONNECT_TIMEOUT` | Render | Optional | Redis connection timeout (seconds) | `5` | Redeploy |
| `REDIS_SOCKET_TIMEOUT` | Render | Optional | Redis socket read timeout (seconds) | `5` | Redeploy |
| `ALLOW_IN_MEMORY_CACHE_FALLBACK` | Render | **Yes** | Prohibit insecure memory cache in prod | `False` | Redeploy |
| `CELERY_TASK_ALWAYS_EAGER` | Render | **Yes** | Run notifications in-process for demo | `True` | Redeploy |
| `CELERY_TASK_EAGER_PROPAGATES` | Render | **Yes** | Prevent SMTP errors from failing HTTP | `False` | Redeploy |
| `CORS_ALLOWED_ORIGINS` | Render | **Yes** | Whitelist Netlify frontend domain | `https://<site-name>.netlify.app` | Redeploy |
| `CSRF_TRUSTED_ORIGINS` | Render | **Yes** | Whitelist Netlify domain for CSRF | `https://<site-name>.netlify.app` | Redeploy |
| `REST_FRAMEWORK_NUM_PROXIES` | Render | **Yes** | Proxy count for IP resolution | `1` | Redeploy |
| `CLOUDINARY_CLOUD_NAME` | Render | Optional | Cloudinary cloud identifier | `eglesora-cloud` | Redeploy |
| `CLOUDINARY_API_KEY` | Render | Optional | Cloudinary API key | `123456789012345` | Redeploy |
| `CLOUDINARY_API_SECRET` | Render | Optional | Cloudinary API secret | `abc123secretXYZ` | Redeploy |
| `EMAIL_BACKEND` | Render | Optional | SMTP email backend | `django.core.mail.backends.smtp.EmailBackend` | Redeploy |
| `EMAIL_HOST` | Render | Optional | SMTP server hostname | `smtp.sendgrid.net` | Redeploy |
| `EMAIL_PORT` | Render | Optional | SMTP port | `587` | Redeploy |
| `EMAIL_USE_TLS` | Render | Optional | Enable TLS for SMTP | `True` | Redeploy |
| `EMAIL_HOST_USER` | Render | Optional | SMTP username | `apikey` | Redeploy |
| `EMAIL_HOST_PASSWORD` | Render | Optional | SMTP password or token | `SG.sample_key_token` | Redeploy |
| `DEFAULT_FROM_EMAIL` | Render | Optional | Sender address on outgoing emails | `noreply@hospital.example.com` | Redeploy |
| `VITE_API_BASE_URL` | Netlify | **Yes** | Backend URL without trailing slash | `https://<app-name>.onrender.com` | Rebuild site |
| `VITE_API_TIMEOUT_MS` | Netlify | Optional | Frontend HTTP timeout (milliseconds) | `60000` | Rebuild site |

---

## 6. Data Classification & Safety Policy

> [!IMPORTANT]
> ### Strictly Prohibited: Real Patient Data
> This staging deployment configuration is certified **exclusively for functional demonstrations using synthetic test data**.
> * **NO Protected Health Information (PHI):** Do not upload real patient medical records, diagnostic histories, or clinical notes.
> * **NO Real Patient Accounts:** Do not invite real patients or use personal email addresses or phone numbers.
> * **NO Live Hospital Operations:** This free-tier architecture does not provide the high-availability redundancy, automated failover, Point-in-Time Recovery (PITR), HIPAA Business Associate Agreements (BAAs), or immutable audit log shipping required for production healthcare institutions.
