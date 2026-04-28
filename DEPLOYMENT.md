## Google Cloud Platform (GCP) Deployment (Recommended)

### Backend on Google Cloud Run
1. Ensure `backend/Dockerfile` and `cloudbuild.yaml` are in your repository.
2. Enable the **Cloud Run**, **Cloud Build**, and **Artifact Registry** APIs in your GCP Console.
3. Run the following command from your local terminal (ensure `gcloud` is installed):
   ```bash
   gcloud builds submit --config cloudbuild.yaml --substitutions _SUPABASE_URL="your_url",_SUPABASE_KEY="your_key",_GEMINI_API_KEY="your_key"
   ```
4. Once deployed, note the Service URL (e.g., `https://backend-xyz.a.run.app`).

### Frontend on Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase init hosting` in the `frontend` directory.
   - Choose your GCP project.
   - Set public directory to `dist`.
   - Configure as a single-page app: `Yes`.
3. Build the frontend: `npm run build` (ensure `VITE_API_URL` is set to your Cloud Run URL).
4. Deploy: `firebase deploy --only hosting`

---

## Backend deployment on Render (Legacy)

1. Push your latest code to GitHub and make sure the root contains render.yaml.
2. In Render, choose New + Blueprint and connect your repository.
3. Confirm the service name is namma-connect-api and root directory is backend.
4. In the service environment settings, set these variables:
SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM.
5. Deploy the service and wait until the build and start logs show success.
6. Open the backend health URL:
https://your-render-url.onrender.com/
and confirm it returns a healthy JSON response.

## Frontend deployment on Vercel (5 steps)

1. Import the frontend project in Vercel using the same GitHub repository.
2. Set project root directory to frontend.
3. Add environment variable VITE_API_URL with your Render backend URL.
4. Deploy and wait for the build to complete.
5. Open the frontend URL and verify routes load correctly, including direct route refresh (React Router rewrite to index.html).

## Environment variables by platform

Render backend service:
SUPABASE_URL
SUPABASE_KEY
GEMINI_API_KEY
TWILIO_SID
TWILIO_TOKEN
TWILIO_FROM
PYTHON_VERSION=3.11

Vercel frontend project:
VITE_API_URL=https://your-render-url.onrender.com

## Update CORS after you get your Vercel URL

1. Open backend/app/main.py.
2. In allow_origins, replace the placeholder https://your-vercel-url.vercel.app with your actual Vercel domain.
3. Keep localhost for local development.
4. Redeploy backend on Render after the change.

## Verification checklist

Backend health check:
https://your-render-url.onrender.com/

Backend docs:
https://your-render-url.onrender.com/docs

Frontend app:
https://your-frontend-app.vercel.app

End-to-end checks:
1. Open frontend and verify dashboard data loads from backend.
2. Confirm OCR upload reaches backend and creates a task.
3. Refresh a deep route in frontend to confirm rewrite behavior.
