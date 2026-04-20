# Project Context - Namma Connect

Last updated: 2026-04-20
Repository: smart-resource-allocation
Branch: main
Remote: origin (GitHub)

## 1. Project Snapshot

Namma Connect is an AI-assisted volunteer coordination platform for NGO operations in India.

Primary workflow:
- Field need intake (manual + OCR-assisted)
- AI classification and urgency scoring
- Volunteer matching and assignment
- Dashboard operations visibility (stats, heatmap, activity)
- SMS notifications for assignment and completion

## 2. What Was Completed

### 2.1 Backend Integration and Reliability Fixes

1. Fixed activity logging compatibility with deployed Supabase schema in backend/app/routers/tasks.py.
- Added robust activity insert helper using current columns: action_type, actor_id, details, created_at.
- Added fallback insert logic so activity logging does not break request flow.
- Added details parser for backward/alternate payload forms.

2. Fixed dashboard activity endpoint behavior in backend/app/routers/tasks.py.
- Added schema-aware activity fetch path.
- Added fallback query path for alternate table shapes.
- Added task title mapping fallback when relation payload is incomplete.

3. Improved volunteer matching quality in backend/app/routers/tasks.py.
- Match candidates now filter only availability=true volunteers before scoring.

4. Improved heatmap payload in backend/app/routers/tasks.py.
- Dashboard heatmap now returns ward and need_type along with geo and urgency fields.

5. Added OCR-to-task activity trail in backend/app/routers/ocr.py.
- Confirm survey upload flow logs Submitted activity via _log_activity.

### 2.2 Frontend Stability and UX Work

1. Added backend health visibility in navigation in frontend/src/App.tsx.
- Health poll query every 30 seconds.
- Online/offline indicator in navbar for mobile and desktop.

2. Strengthened route shell and error experience.
- Global error boundary integrated at app root.
- Better not-found and route-level UX behavior retained.

3. Dashboard query resilience improvements.
- Query retry/error handling paths improved in dashboard surfaces.

### 2.3 Full Rebrand: JanaNaadi -> Namma Connect

1. Updated app branding text and identity.
- frontend/src/App.tsx
- frontend/src/pages/VolunteerRegister.tsx
- backend/app/services/notifier.py
- README.md
- frontend/index.html

2. Added and wired new logo assets.
- Added frontend/src/assets/namma-connect-logo.svg
- Replaced frontend/public/favicon.svg
- Updated title and header branding usage

3. Verified source scan has no remaining JanaNaadi references in key source paths.

### 2.4 Frontend CSS Pipeline Restoration

Issue observed:
- UI appeared unstyled and misaligned due to missing Tailwind utility generation path.

Fix applied:
- Replaced stale starter CSS with Tailwind entrypoint in frontend/src/index.css.
- Added minimal base rules only (html/body/root height and body defaults).
- Preserved class-driven styling from component code.

### 2.5 Documentation and Repo Hygiene

1. README rewritten in professional format.
- Product positioning
- Architecture and project structure
- Setup and run instructions
- Environment variable table
- API overview
- Deployment notes
- Troubleshooting and current status

2. Root .gitignore was added earlier and retained.

## 3. Validation Performed

All validations below were run during the implementation cycle.

1. Frontend production build
- Command: npm run build (from frontend)
- Result: Success

2. Backend syntax/compile check
- Command: python -m compileall app (from backend, with venv python)
- Result: Success

3. Backend endpoint smoke test (FastAPI TestClient)
- Routes checked:
  - /
  - /api/dashboard/activity
  - /api/dashboard/heatmap
- Result: All returned 200

4. Backend runtime startup
- Command: uvicorn app.main:app --port 8000
- Result: Startup successful and Supabase connection verified

5. Frontend runtime startup
- Command: npm run dev (from frontend)
- Result: Startup successful (if 5173 in use, Vite can auto-shift to another port)

## 4. Git History and Push Status

Latest commits on main:
1. 6951585 - feat: rebrand to Namma Connect and polish README
2. 3f53b1d - chore: add project files, docs update, and gitignore

Push status:
- main pushed to origin successfully
- origin/main currently at 6951585

## 5. Key Files Updated in Recent Work

Backend:
- backend/app/routers/tasks.py
- backend/app/routers/ocr.py
- backend/app/services/notifier.py

Frontend:
- frontend/src/App.tsx
- frontend/src/pages/VolunteerRegister.tsx
- frontend/src/index.css
- frontend/src/assets/namma-connect-logo.svg
- frontend/public/favicon.svg
- frontend/index.html

Docs:
- README.md

## 6. Current API Surface (Important Routes)

Health:
- GET /

Tasks:
- POST /api/tasks/
- GET /api/tasks/
- GET /api/tasks/{id}
- GET /api/tasks/{task_id}/matches
- POST /api/tasks/{id}/assign
- PATCH /api/tasks/{id}/complete

Dashboard:
- GET /api/dashboard/stats
- GET /api/dashboard/heatmap
- GET /api/dashboard/activity

Volunteers:
- POST /api/volunteers/register
- GET /api/volunteers/
- GET /api/volunteers/{id}
- PATCH /api/volunteers/{id}/availability
- GET /api/volunteers/{id}/tasks
- DELETE /api/volunteers/{id}

OCR:
- POST /api/ocr/upload
- POST /api/ocr/confirm/{upload_id}

## 7. Environment and Runbook

### 7.1 Backend

Working directory: backend

1. Activate venv
- Windows PowerShell: ..\venv\Scripts\Activate.ps1

2. Install deps
- pip install -r requirements.txt

3. Configure env
- Copy backend/.env.example to backend/.env
- Fill SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM

4. Run API
- uvicorn app.main:app --reload --port 8000

### 7.2 Frontend

Working directory: frontend

1. Install deps
- npm install

2. Configure env
- Copy frontend/.env.example to frontend/.env
- Set VITE_API_URL=http://127.0.0.1:8000 (for local)

3. Run dev server
- npm run dev

4. Build for production
- npm run build

## 8. Known Caveats and Notes

1. If npm run dev is executed from repository root, it fails because package.json is inside frontend.
- Always run frontend commands from frontend directory.

2. If UI appears unstyled, verify frontend/src/index.css still contains:
- @import "tailwindcss";

3. Runtime warning currently observed in backend:
- google.generativeai package shows deprecation warning and suggests migration to google.genai.
- This is non-blocking for current behavior but should be planned as a dependency upgrade task.

## 9. Recommended Next Steps

1. Add automated API tests for dashboard activity schema compatibility and OCR confirm flow.
2. Add CI pipeline for backend lint/test and frontend build checks.
3. Plan migration from google.generativeai to google.genai.
4. Add screenshots and optional architecture diagram to README for portfolio/demo quality.

## 10. Resume-Work Checklist

When resuming development:
1. Pull latest main.
2. Start backend and frontend using section 7 runbook.
3. Check /docs and frontend landing route.
4. Verify dashboard activity and heatmap endpoints return data.
5. Continue feature work from the latest commit 6951585.
