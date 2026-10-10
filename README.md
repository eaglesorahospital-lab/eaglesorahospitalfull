# Eagle Sora Hospital Platform

A production-grade, enterprise healthcare and hospital management platform designed for patient appointments, clinical departments, doctor scheduling, and administrative operations.

---

## 1. Project Overview & Current Status

**Current Development Status: Phase 18 — Final Documentation, Quality Verification & Project Handoff (Completed)**

> [!NOTE]
> All project phases (**Phases 0 through 18**) are officially complete, fully verified, and ready for production handoff. The platform fulfills the master requirements defined in the **Hospital Platform Production Website Intern Assignment**.

The Eagle Sora Hospital Platform provides a reliable, secure digital backbone for modern hospital outpatient departments. The design and clinical workflow draw inspiration from venerable institutions (such as Bombay Hospital and Netralaya), prioritizing dignified clinical utility, robust concurrency safety, and patient data isolation over consumer startup aesthetics.

---

## 2. Core Features & Capabilities

- **Institutional Hospital Portal**: Public homepage, emergency banner, leadership/about page, clinical facility catalog, announcements, and institutional contact information.
- **Clinical Departments**: Department listings, specialized services, and clinical FAQs.
- **Doctor Directory & Schedules**: Doctor profiles, credentials, department affiliations, Cloudinary-hosted profile media, and real-time weekly schedule summaries.
- **Authoritative Booking Engine**: Deterministic slot generator, PostgreSQL row-level locking (`select_for_update()`), atomic transactions, double-booking prevention, and idempotency protection.
- **Patient Portal & Self-Service**: User registration, patient profile with Medical Record Number (MRN), appointment history, self-service cancellation, and rescheduling.
- **Administrative Oversight**: Admin portal for hospital profile, departments, facilities, announcements, doctor management, and audit log inspection.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across 4 distinct roles (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR_STAFF`, `PATIENT`) with strict object-level IDOR isolation.
- **Asynchronous Notifications**: Redis message broker with Celery workers for transaction-safe email confirmations, cancellations, reschedules, and staff alerts.
- **Periodic Appointment Reminders**: Celery Beat running an idempotent scanner every 30 minutes for appointments within the upcoming 24 hours.
- **Secure Media Storage**: Cloudinary integration with Pillow binary validation, MIME type whitelisting, 5MB file size limits, safe replacement, and masked API credentials.
- **Security Hardening**: Redis-backed rate limiting on sensitive endpoints, sanitized 500 error responses (`DEBUG=False`), and clickjacking/MIME security headers.
- **Containerized Orchestration**: 7-service Docker Compose stack with Gunicorn WSGI, Nginx reverse proxy, client IP preservation, and automated health checks.

---

## 3. Technology Stack

| Layer | Technologies | Role |
|---|---|---|
| **Frontend** | React 18, Bootstrap 5, Vanilla CSS, Vite 5 | Single Page Application (SPA) client interface |
| **Backend** | Django 5.1, Django REST Framework 3.17 | Authoritative REST API service & business logic |
| **Application Server** | Gunicorn 26 (gthread workers) | Production WSGI application server |
| **Web Gateway** | Nginx (Alpine) | Public reverse proxy, static server, SSL termination |
| **Primary Database** | PostgreSQL 16 (Alpine) | Relational database with row locks & constraints |
| **Cache & Queue Broker** | Redis 7 (Alpine) | In-memory cache, rate limiting, and Celery broker |
| **Background Processing** | Celery 5.6 & Celery Beat | Asynchronous task execution & periodic reminders |
| **Authentication** | djangorestframework-simplejwt 5.5 | JWT access/refresh tokens with token blacklisting |
| **Media Storage** | Cloudinary & Pillow | Validated cloud image asset storage |
| **Orchestration** | Docker & Docker Compose | Multi-container production deployment |
| **Testing** | Django test runner & SimpleTestCase | 9 specialized test suites (198 automated tests) |

---

## 4. Architecture Summary

```text
                                  PUBLIC INTERNET
                                         │
                                         ▼ (Port 80 / 443)
                             ┌───────────────────────┐
                             │  Nginx Reverse Proxy  │
                             └───────────┬───────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  │                      │                      │
                  ▼                      ▼                      ▼
          ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
          │ React Static  │      │   /api/ and   │      │ Static/Media  │
          │ Assets (SPA)  │      │    /admin/    │      │ Cache Volumes │
          └───────────────┘      └───────┬───────┘      └───────────────┘
                                         │
                                         ▼ (Port 8000 internal)
                             ┌───────────────────────┐
                             │    Gunicorn / WSGI    │
                             │     Django Backend    │
                             └───────┬───────┬───────┘
                                     │       │
                     ┌───────────────┘       └───────────────┐
                     ▼                                       ▼
         ┌───────────────────────┐               ┌───────────────────────┐
         │ PostgreSQL 16 (DB)    │               │ Redis 7 In-Memory     │
         │ - Row-level Locks     │               │ - Cache & Throttling  │
         │ - Relational Data     │               │ - Celery Task Broker  │
         └───────────────────────┘               └───────────┬───────────┘
                                                             │
                                             ┌───────────────┴───────────────┐
                                             ▼                               ▼
                                 ┌───────────────────────┐       ┌───────────────────────┐
                                 │ Celery Worker         │       │ Celery Beat           │
                                 │ - Async Notifications │       │ - Scheduled Reminders │
                                 └───────────────────────┘       └───────────────────────┘
```

---

## 5. Repository Structure

```text
hospital-platform/
├── backend/                    # Django & DRF Backend service
│   ├── apps/
│   │   ├── accounts/           # User model, Patient profiles, auth & RBAC
│   │   ├── hospital/           # Hospital info, facilities, announcements, media
│   │   ├── departments/        # Clinical departments & services
│   │   ├── doctors/            # Doctor profiles, specialties, schedules
│   │   ├── scheduling/         # Working days, shifts, breaks, leaves, overrides
│   │   ├── appointments/       # Booking engine, slot generator, concurrency locks
│   │   └── notifications/      # Notifications, audit logs, Celery tasks
│   ├── config/                 # Settings, URLs, WSGI, Celery configuration
│   ├── gunicorn.conf.py        # Production Gunicorn WSGI configuration
│   ├── manage.py               # Django management script
│   └── requirements.txt        # Backend Python dependencies
├── frontend/                   # React + Bootstrap 5 Frontend SPA
│   ├── public/                 # Static public files & institutional emblems
│   ├── src/                    # Components, pages, hooks, services, routes
│   ├── package.json            # Frontend npm scripts & dependencies
│   └── vite.config.js          # Vite build configuration
├── docker/                     # Container configurations
│   ├── backend/Dockerfile      # Production Python 3.12-slim backend image
│   ├── celery/Dockerfile       # Production Celery worker & Beat image
│   ├── frontend/Dockerfile     # Node 20-alpine frontend preview image
│   └── nginx/Dockerfile        # Multi-stage Nginx + compiled frontend image
├── nginx/
│   └── nginx.conf              # Production Nginx reverse proxy configuration
├── database/                   # Database seeds and SQL references
├── docs/                       # Technical & operational documentation
│   ├── API.md                  # Complete REST API specification
│   ├── ARCHITECTURE.md         # System architecture & Mermaid sequence flows
│   ├── DEPLOYMENT.md           # 20-topic production deployment & runbook
│   ├── ERD.md                  # Entity Relationship Diagram & model schemas
│   ├── TESTING.md              # Testing guide & security verification
│   └── FINAL_HANDOFF.md        # Comprehensive project handoff & checklist
├── tests/                      # Automated test suites (198 tests)
│   ├── test_foundation.py
│   ├── test_backend_foundation.py
│   ├── test_domain_models.py
│   ├── test_api_layer.py
│   ├── test_authentication_rbac.py
│   ├── test_appointment_booking.py
│   ├── test_celery_notifications.py
│   ├── test_cloudinary_media.py
│   └── test_security_hardening.py
├── docker-compose.yml          # Production 7-service orchestration
├── .env.example                # Safe environment configuration template
├── .gitignore                  # Git hygiene & secret exclusion rules
└── README.md                   # Project overview & documentation index
```

---

## 6. Prerequisites

- **Docker & Docker Compose**: Docker Engine 24.0+ & Docker Compose v2.20+ (recommended for full stack)
- **Python**: Python 3.12+ (for local host backend execution)
- **Node.js**: Node 18+ & npm 9+ (for local host frontend development)
- **PostgreSQL**: Version 14+ (if running locally without Docker)
- **Redis**: Version 7+ (if running locally without Docker)

---

## 7. Environment Configuration

1. Create a local `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```
2. Populate the required environment variables:
   - `DJANGO_SECRET_KEY`: Cryptographic signing secret.
   - `DJANGO_DEBUG`: Set to `False` for production, `True` for local debugging.
   - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`: Database credentials.
   - `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`: Cache & task broker URLs.
   - `CLOUDINARY_*`: Cloudinary storage credentials.
   - `EMAIL_*`: Transactional SMTP mail credentials.

> [!CAUTION]
> Never commit real secrets, private keys, or passwords to Git. The `.env` file is excluded via `.gitignore`.

---

## 8. Docker Deployment & Orchestration

### Starting the Production Stack
```bash
# Validate compose configuration
docker compose config

# Build and start all 7 services in background
docker compose up -d --build
```

### Checking Service Health
```bash
docker compose ps
```
All services (`db`, `redis`, `backend`, `celery_worker`, `celery_beat`, `frontend`, `nginx`) will report `Up (healthy)`.

### Collecting Django Static Files
```bash
docker compose exec backend python manage.py collectstatic --noinput
```

### Running Migrations Inside Docker
```bash
docker compose exec backend python manage.py migrate --noinput
```

### Creating Initial Admin Account
```bash
docker compose exec -e DJANGO_SUPERUSER_PASSWORD="AdminPassword123!" \
  backend python manage.py createsuperuser \
  --username hospital_admin \
  --email admin@hospital.example.com \
  --noinput
```

---

## 9. Local Development Setup (Without Docker)

### Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
source .venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations
python backend/manage.py migrate

# Start local server
python backend/manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 10. Automated Testing & Verification

The test suite consists of 198 automated regression tests executing against live PostgreSQL and Redis:

```powershell
# Run the complete test suite
.venv\Scripts\python.exe tests/test_foundation.py
.venv\Scripts\python.exe tests/test_backend_foundation.py
.venv\Scripts\python.exe tests/test_domain_models.py
.venv\Scripts\python.exe tests/test_api_layer.py
.venv\Scripts\python.exe tests/test_authentication_rbac.py
.venv\Scripts\python.exe tests/test_appointment_booking.py
.venv\Scripts\python.exe tests/test_celery_notifications.py
.venv\Scripts\python.exe tests/test_cloudinary_media.py
.venv\Scripts\python.exe tests/test_security_hardening.py
```

### Verification Summary
- **Foundation & Infrastructure**: 18 / 18 PASS
- **Domain Models & Validation**: 23 / 23 PASS
- **REST API Layer & Views**: 21 / 21 PASS
- **Authentication & RBAC**: 24 / 24 PASS
- **Booking & Concurrency**: 30 / 30 PASS
- **Celery Notifications**: 17 / 17 PASS
- **Cloudinary Media**: 30 / 30 PASS
- **Security Hardening**: 35 / 35 PASS
- **Total**: **198 / 198 PASS (100%)**

---

## 11. Documentation Directory Index

- [`docs/API.md`](docs/API.md) — Comprehensive REST API reference, endpoints, query parameters, payloads, and error codes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Full technical architecture, component topologies, and Mermaid sequence diagrams.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — 20-topic production deployment runbook, backup strategies, restoration, and rollback procedures.
- [`docs/ERD.md`](docs/ERD.md) — PostgreSQL Entity Relationship Diagram, schema constraints, choices, and foreign key relations.
- [`docs/TESTING.md`](docs/TESTING.md) — Quality assurance guide, security test suites, and regression procedures.
- [`docs/FINAL_HANDOFF.md`](docs/FINAL_HANDOFF.md) — Formal project handoff document, production readiness checklist, and operational guidelines.

---

## 12. Known Limitations & Production Prerequisites

1. **Transactional Email (SMTP)**: Local automated test suites execute against mock backends (`locmem`). Real outward dispatch requires valid SMTP credentials in `.env`.
2. **Cloudinary Media Storage**: Automated tests mock Cloudinary HTTP responses. Real image storage in the cloud requires valid Cloudinary credentials in `.env`.
3. **Public HTTPS / TLS**: Nginx is prepared for TLS termination on port 443 with modern ciphers, but requires mounting a real public certificate (e.g., Let's Encrypt) and public DNS routing.
