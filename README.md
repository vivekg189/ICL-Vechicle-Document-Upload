# VehicleVault — Smart Vehicle Document & Expiry Manager

A full-stack platform to organize, monitor, and manage motor vehicle compliance documents —
Registration Certificates, Insurance Policies, PUC Certificates, Fitness & Permits, and more.

---

## Architecture

```
Browser
  ↓  (port 3000)
React  (Nginx container — serves static files, reverse-proxies /api/)
  ↓  (http://backend:5000)
Flask  (Gunicorn container — REST API, PDF upload/download)
  ↓  (postgres:5432)
PostgreSQL  (stores all metadata)
```

### Persistent Storage

| Volume              | Mounted to                 | Purpose                                       |
|---------------------|----------------------------|-----------------------------------------------|
| `postgres_data`     | `/var/lib/postgresql/data` | All database tables, rows, indexes            |
| `vehicle_documents` | `/app/uploads`             | Uploaded PDF files — survive container recreations |

---

## Why Docker Named Volumes Matter for PDFs

### Without a named volume (problem)

```
User uploads insurance.pdf
        |
Flask saves to container filesystem (/app/uploads inside the image layer)
        |
docker compose up -d --force-recreate backend
        |
Container layer is wiped — /app/uploads disappears
        |
PDF is lost. PostgreSQL still has the metadata row.
Result: broken download links + orphaned database records.
```

### With vehicle_documents named volume (solution)

```
User uploads insurance.pdf
        |
Flask saves to /app/uploads
        |
/app/uploads IS the vehicle_documents Docker Named Volume
(stored on the Docker host — outside the container layer)
        |
docker compose up -d --force-recreate backend
        |
New container mounts the same vehicle_documents volume at /app/uploads
        |
insurance.pdf is still there.
PostgreSQL metadata + physical PDF remain perfectly synchronized.
```

Named volumes live on the Docker host and persist independently of any container.
`docker compose down` does **NOT** remove named volumes.
Only `docker compose down -v` removes them (destructive).

---

## Directory Structure

```
VehicleVault/
├── backend/
│   ├── app.py                # Flask REST API (all endpoints)
│   ├── models.py             # SQLAlchemy models (Vehicle, Document)
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Backend container (python:3.11-slim + Gunicorn)
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/            # Dashboard, Vehicles, Documents, ExpiringSoon, Settings
│   │   ├── components/       # Sidebar, TopNavbar, AddVehicleModal
│   │   └── services/api.js   # REST client (reads VITE_API_URL)
│   ├── Dockerfile            # Multi-stage build: Node -> Nginx
│   ├── nginx.conf.template
│   └── .dockerignore
├── docker-compose.yml        # Full stack (3 services + 2 volumes)
├── .env                      # DB credentials and port configuration
└── README.md
```

---

## Quick Start — Docker Compose

### 1. Prerequisites

- Docker Desktop (Windows / macOS / Linux)
- Docker Compose v2

### 2. Start the full stack

```bash
docker compose up --build -d
```

### 3. Open VehicleVault

```
http://localhost:3000
```

### 4. Verify all services are running

```bash
docker compose ps
```

Expected:

```
NAME                     STATUS
vehiclevault-postgres    Up (healthy)
vehiclevault-backend     Up
vehiclevault-frontend    Up
```

---

## PDF Persistence Test

This test proves that uploaded PDFs survive a Flask container recreation.

### Step 1 — Start the application

```bash
docker compose up --build -d
```

### Step 2 — Upload a document

Open `http://localhost:3000`, navigate to Documents, and upload any PDF (e.g. `insurance.pdf`).

### Step 3 — Verify the file is in the volume

```bash
docker compose exec backend ls -lah /app/uploads
```

Expected:

```
-rw-r--r-- 1 root root 112K Oct 10 16:01 a1b2c3d4_insurance.pdf
```

### Step 4 — Recreate the Flask container

```bash
docker compose up -d --force-recreate backend
```

This destroys and replaces the backend container (simulates a redeploy or crash recovery).

### Step 5 — Verify the file survived

```bash
docker compose exec backend ls -lah /app/uploads
```

The same file is still listed — it was stored in the named volume, not the container layer.

### Step 6 — Verify through the browser

Refresh `http://localhost:3000` and open Documents.

The uploaded document still appears with its correct expiry status.
The Download and View buttons continue to work, confirming that
PostgreSQL metadata and the physical PDF remain synchronized.

---

## Local Development (without Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Flask starts at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts at `http://localhost:5173` with `/api` proxied to `http://localhost:5000`.

---

## API Reference

| Method | Endpoint                       | Description                            |
|--------|--------------------------------|----------------------------------------|
| GET    | `/api/health`                  | Backend + DB liveness check            |
| GET    | `/api/health/db`               | PostgreSQL SELECT 1 health check       |
| GET    | `/api/dashboard`               | Unified dashboard payload              |
| GET    | `/api/stats`                   | Document expiry statistics             |
| GET    | `/api/vehicles`                | List all vehicles                      |
| POST   | `/api/vehicles`                | Create vehicle                         |
| PUT    | `/api/vehicles/<id>`           | Update vehicle                         |
| DELETE | `/api/vehicles/<id>`           | Delete vehicle                         |
| GET    | `/api/documents`               | List documents (optional ?vehicle_id=) |
| POST   | `/api/documents`               | Upload PDF document (multipart)        |
| GET    | `/api/documents/<id>/download` | Download PDF                           |
| GET    | `/api/documents/<id>/view`     | View PDF inline                        |
| DELETE | `/api/documents/<id>`          | Delete document record + file          |

---

## Stopping the Stack

```bash
# Stop containers — volumes are preserved
docker compose down

# Stop containers AND permanently delete all data volumes
docker compose down -v
```

> **Warning**: `docker compose down -v` permanently deletes `postgres_data` and
> `vehicle_documents`. All database records and uploaded PDFs will be lost.

