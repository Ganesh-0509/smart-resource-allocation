# Namma Connect

Namma Connect is an AI-assisted volunteer coordination platform for NGOs. It helps teams collect field needs, prioritize urgency, match volunteers, and monitor operations in real time.

## Why Namma Connect

- Faster intake of field requests through OCR-assisted survey uploads.
- Better prioritization using AI classification and urgency scoring.
- Smarter volunteer assignment based on skills and proximity.
- Clear live visibility for coordinators through dashboard stats, heatmaps, and activity feeds.
- Integrated SMS notifications for assignment and completion updates.

## Tech Stack

- Backend: FastAPI, Supabase (Postgres + Storage), Twilio, Google Gemini, OpenCV, Tesseract OCR
- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, React Leaflet
- Deployment: Render (backend), Vercel (frontend)

## Project Structure

```text
smart-resource-allocation/
|- backend/
|  |- app/
|  |  |- routers/        # API routes (tasks, volunteers, OCR, dashboard)
|  |  |- services/       # matching, OCR, notifications, NLP classification
|  |  |- db/             # Supabase client and DB helpers
|  |- requirements.txt
|  |- .env.example
|- frontend/
|  |- src/
|  |  |- pages/          # coordinator, volunteer, heatmap, survey flows
|  |  |- components/     # reusable UI components
|  |  |- api/            # typed HTTP clients
|  |- .env.example
|- render.yaml
|- README.md
```

## Core Features

- Volunteer registration with skills, location, and availability.
- Task lifecycle management: create, match, assign, complete.
- Assignment suggestions from the matching service.
- OCR upload and confirm flow that creates tasks from survey images.
- Dashboard endpoints for stats, activity feed, and need heatmap.
- Backend health indicator and resilient frontend error handling.

## Quick Start (Local Development)

### 1. Prerequisites

- Python 3.10+
- Node.js 20+
- npm 10+
- Supabase project with required tables

### 2. Clone

```bash
git clone https://github.com/Ganesh-0509/smart-resource-allocation.git
cd smart-resource-allocation
```

### 3. Backend Setup

```bash
cd backend
python -m venv ../venv
```

Activate virtual environment:

- Windows PowerShell:

```powershell
..\venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source ../venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Create environment file:

- Copy [backend/.env.example](backend/.env.example) to backend/.env
- Fill all required values

Run backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend health: http://127.0.0.1:8000/
Swagger docs: http://127.0.0.1:8000/docs

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create environment file:

- Copy [frontend/.env.example](frontend/.env.example) to frontend/.env
- Set VITE_API_URL, for local backend use:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

Run frontend:

```bash
npm run dev
```

App URL: http://localhost:5173

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| SUPABASE_URL | backend | Supabase project URL |
| SUPABASE_KEY | backend | Supabase anon/service key used by API |
| GEMINI_API_KEY | backend | Gemini API key for NLP classification |
| TWILIO_SID | backend | Twilio account SID |
| TWILIO_TOKEN | backend | Twilio auth token |
| TWILIO_FROM | backend | Twilio sender number in E.164 format |
| VITE_API_URL | frontend | Base URL for backend API |

## API Overview

Common routes:

- GET / -> API health
- POST /api/volunteers/register -> register volunteer
- GET /api/tasks/ -> list tasks
- GET /api/tasks/{task_id}/matches -> get match candidates
- POST /api/tasks/{id}/assign -> assign volunteer
- PATCH /api/tasks/{id}/complete -> complete task
- GET /api/dashboard/stats -> dashboard summary metrics
- GET /api/dashboard/heatmap -> map-ready task points
- GET /api/dashboard/activity -> recent activity feed
- POST /api/ocr/upload -> upload survey image
- POST /api/ocr/confirm/{upload_id} -> confirm OCR output and create task

## Deployment Notes

- Backend deployment can be configured using [render.yaml](render.yaml).
- Frontend is Vite-based and can be deployed to Vercel.
- Ensure production CORS and VITE_API_URL point to deployed backend.

## Troubleshooting

- Frontend looks unstyled or misaligned:
	- Confirm [frontend/src/index.css](frontend/src/index.css) includes Tailwind import.
	- Restart dev server after dependency or CSS pipeline changes.
- Backend fails at startup:
	- Verify backend/.env values, especially Supabase and API keys.
	- Run from [backend](backend) so imports resolve correctly.
- Dashboard data is empty:
	- Check Supabase table data and row-level permissions.
	- Verify frontend VITE_API_URL points to the running backend.

## Current Status

- Rebrand completed to Namma Connect across backend, frontend, and docs.
- Dashboard activity feed and heatmap endpoints are integrated and working.
- Frontend includes health status, query error handling, and retry UX.
