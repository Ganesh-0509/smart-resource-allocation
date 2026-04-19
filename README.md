# JanaNaadi - Smart Resource Allocation

AI-powered volunteer coordination platform for NGOs in India, with task matching, OCR-based survey intake, and real-time operations dashboards.

## Tech Stack

- Backend: FastAPI, Supabase (Postgres + Storage), Twilio, Google Gemini, OpenCV, Tesseract OCR
- Frontend: React + TypeScript, Vite, TanStack Query, React Router, Tailwind CSS, React Leaflet
- Deployment: Render (backend), Vercel (frontend)

## Local Setup

1. Clone the repository and open it in your editor.
2. Backend setup: create and activate a virtual environment in [backend](backend), then install dependencies from [backend/requirements.txt](backend/requirements.txt).
3. Frontend setup: install dependencies in [frontend](frontend) with npm install.
4. Copy env templates and fill real values:
	- [backend/.env.example](backend/.env.example) -> backend/.env
	- [frontend/.env.example](frontend/.env.example) -> frontend/.env
5. Start services:
	- Backend: uvicorn app.main:app --reload --port 8000 (from [backend](backend))
	- Frontend: npm run dev (from [frontend](frontend))

## Current Integration Status

- Backend task assignment and completion now write activity events to the activity log table.
- Dashboard endpoint [backend/app/routers/tasks.py](backend/app/routers/tasks.py) exposes activity feed at /api/dashboard/activity and heatmap payload includes ward and need type.
- Volunteer matching query filters for available volunteers before scoring.
- OCR confirm flow creates tasks and writes Submitted activity events.
- Frontend app includes a global error boundary and a backend health indicator in the navbar.
- Dashboard pages include explicit error states and retry actions for failed queries.

## Quick Troubleshooting

- If backend exits immediately, verify [backend/.env](backend/.env) has valid Supabase and API keys and run command from [backend](backend).
- If frontend dev server fails, run npm install in [frontend](frontend) and confirm [frontend/.env](frontend/.env) contains VITE_API_URL.
- If map or dashboard data fails, confirm backend is reachable at VITE_API_URL and Supabase tables are provisioned.

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| SUPABASE_URL | backend | Supabase project URL |
| SUPABASE_KEY | backend | Supabase key used by API |
| GEMINI_API_KEY | backend | Gemini API access for NLP classification |
| TWILIO_SID | backend | Twilio account SID for SMS |
| TWILIO_TOKEN | backend | Twilio auth token |
| TWILIO_FROM | backend | Twilio sender phone number |
| VITE_API_URL | frontend | Public base URL for backend API |

## Live Demo Links

- Frontend (Vercel): https://your-frontend-app.vercel.app
- Backend (Render): https://your-backend-service.onrender.com
- API Docs (Swagger): https://your-backend-service.onrender.com/docs
