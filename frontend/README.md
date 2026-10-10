# Hospital Platform — Frontend (React + Vite)

## Overview
This application provides the client-side user interface for the Eagle Sora Hospital Platform. Built with React 18, Bootstrap 5, and Vite, it delivers a clean, responsive, and accessible experience modeled after dignified healthcare institutions.

---

## 1. Technology Stack
- **Framework**: React 18+ (JavaScript)
- **Styling**: Bootstrap 5 + Vanilla CSS Design Tokens
- **Build Tool**: Vite 5.x
- **Icons**: SVG / Bootstrap Icons (no Lucide or trendy icon sets)
- **State & Storage**: React Context + SessionStorage (for client auth and demo states)

---

## 2. Project Directory Structure
```text
frontend/
├── public/                 # Static public assets and emblems
├── src/
│   ├── assets/             # Institutional imagery and icons
│   ├── components/
│   │   ├── common/         # Buttons, Modals, Badges, Alert components
│   │   ├── layout/         # Header, Navbar, Footer, Emergency Banner
│   │   ├── hospital/       # Facility cards, Announcement feed, FAQs
│   │   ├── departments/    # Department service lists and specialty filters
│   │   ├── doctors/        # Doctor profile cards and schedule summaries
│   │   ├── appointments/   # Slot picker, Booking wizard, Confirmation modal
│   │   └── admin/          # Admin management tables and action panels
│   ├── pages/
│   │   ├── public/         # Home, About, Contact, Facilities, Announcements
│   │   ├── doctors/        # Doctors directory and Doctor detail page
│   │   ├── appointments/   # Appointment booking flow
│   │   ├── patient/        # Patient portal, appointments list, profile
│   │   └── admin/          # Admin oversight dashboard
│   ├── services/           # API clients and HTTP wrappers
│   ├── data/               # Default institutional data & mock fallbacks
│   ├── routes/             # App routing table
│   ├── styles/             # Global CSS and clinical design variables
│   ├── App.jsx             # Main router provider
│   └── main.jsx            # React root mount
├── package.json
└── vite.config.js
```

---

## 3. Environment Configuration
Environment variables are configured in `.env` or injected at container build time:

| Variable | Description | Default / Fallback |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for Django REST API calls | `/api` (relative, via Nginx) or `http://localhost:8000/api` |

When deployed behind Nginx in Docker, `VITE_API_BASE_URL` defaults to `/api`, directing traffic through the Nginx reverse proxy without requiring CORS cross-origin headers.

---

## 4. Setup & Commands

### 4.1 Local Development
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The development server starts at `http://localhost:3000`.

### 4.2 Production Build
```bash
# Compile and bundle for production
npm run build
```
Build output is generated into the `dist/` directory:
- `dist/index.html`
- `dist/assets/index-[hash].js`
- `dist/assets/index-[hash].css`

### 4.3 Preview Production Build
```bash
npm run preview
```
Serves the compiled production bundle locally at `http://localhost:3000`.

---

## 5. Routing Overview

| Path | Description | Access Control |
|---|---|---|
| `/` | Hospital Homepage with emergency notices | Public |
| `/about` | Institutional background and leadership | Public |
| `/departments` | Clinical departments catalog | Public |
| `/departments/:slug` | Department detail and specialized services | Public |
| `/doctors` | Doctor directory with specialty filter | Public |
| `/doctors/:slug` | Doctor profile, credentials, and schedule | Public |
| `/book-appointment` | Interactive appointment booking flow | Public / Patient |
| `/facilities` | Hospital diagnostic & clinical facilities | Public |
| `/announcements` | Public clinical bulletins and updates | Public |
| `/contact` | Hospital contact, emergency, and address | Public |
| `/patient/login` | Patient authentication login | Unauthenticated |
| `/patient/register` | Patient registration with MRN generation | Unauthenticated |
| `/patient/appointments` | Patient appointment portal | Authenticated (`PATIENT`) |
| `/patient/profile` | Patient medical profile | Authenticated (`PATIENT`) |
| `/admin` | Administrative dashboard | Authenticated (`HOSPITAL_ADMIN`, `SUPER_ADMIN`) |

---

## 6. Client-Side Storage & Demo Mode Behavior
- **Authentication**: JWT access and refresh tokens are stored in `sessionStorage` for active session persistence.
- **Session Reset**: Closing the browser window clears the active session for patient security.
- **Demo / Fallback Mode**: If the backend API is temporarily offline, the frontend provides informative error states and diagnostic fallbacks rather than crashing.

---

## 7. Design & Accessibility Compliance
The frontend enforces strict clinical aesthetics and rejects consumer startup design trends:
- **Prohibited**: Harsh gradients, Lucide icons, glassmorphism, emojis, floating orb decorations, bento grids, neon colors, and excessive bounce animations.
- **Enforced**: Dignified healthcare palette (deep clinical navy, muted slate, hospital white), WCAG AA contrast compliance, responsive table layouts, and keyboard accessibility.
