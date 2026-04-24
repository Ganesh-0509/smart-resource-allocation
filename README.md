# <p align="center"><img src="frontend/public/brand-logo.svg" width="80" height="80" alt="Namma Connect Logo" /><br/>Namma Connect</p>

<p align="center">
  <b>The Unified Digital Infrastructure for Hyper-Local Community Impact across Bharat.</b><br/>
  <i>Bridging the gap between field reports and volunteer action with AI and Multi-Tenancy.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production--Ready-0D9488?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Architecture-Multi--Tenant-114B3B?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Gemini_|_OCR_|_Matching-emerald?style=for-the-badge" />
</p>

---

## 🌿 The Vision
In the heart of community service, logistics often becomes the bottleneck for impact. **Namma Connect** is an enterprise-grade, multi-tenant platform designed to empower NGOs to coordinate volunteer efforts with surgical precision. By combining **Geospatial Intelligence**, **Automated SMS Dispatch**, and **LLM-driven scoring**, we ensure that the right help reaches the right place in minutes, not days.

---

## ✨ Core Pillars

| Pillar | Capability | Technology |
| :--- | :--- | :--- |
| **🏢 Multi-Tenancy** | Data isolation per NGO with secure registration & login. | Supabase RLS + JWT |
| **🚨 Urgent Dispatch** | Auto-broadcast tasks (Urgency ≥ 60) to top 5 local volunteers. | Parallel SMS (Twilio) |
| **📷 Vision AI Entry** | Transform handwritten field surveys into digital tasks instantly. | Tesseract + OpenCV |
| **🧠 Smart Matching** | Weighted ranking by skills, distance, and historical performance. | Custom Matching Hub |
| **🗺️ Impact Insights** | Live geospatial heatmaps and cross-NGO platform statistics. | React Leaflet |

---

## 🛠️ Technological Stack

### **Frontend (Vite + React)**
- **UI/UX:** Custom "Grounded Trust" design system with Tailwind CSS.
- **State:** TanStack Query for high-performance data fetching and caching.
- **Security:** JWT-based Auth Guard protecting sensitive coordinator routes.
- **Visuals:** Timeline-based activity streams and pulsing urgent-need badges.

### **Backend (FastAPI)**
- **Engine:** Asynchronous Python with FastAPI for concurrent request handling.
- **Auth:** NGO-specific authentication with unique `ngo_id` isolation.
- **Geocoding:** Native integration with **Nominatim API** for real-time ward/district to coordinate mapping.
- **Logic:** Background tasks for SMS broadcasts and matching calculations.

---

## 🚀 Experience the Demo

The platform comes pre-configured with three realistic demo NGOs, each operating in a different Indian hub:

*   **Aarogya Seva (Chennai)**: Medical focus, coordinating health camps in Adyar and Mylapore.
*   **Vidya Jyothi (Bengaluru)**: Education focus, tutoring youth in Koramangala and Whitefield.
*   **Anna Daan Trust (Madurai)**: Nutrition focus, managing food relief in Anna Nagar and KK Nagar.

### Quick Start
1.  **Clone & Install**:
    ```bash
    git clone https://github.com/Ganesh-0509/smart-resource-allocation.git
    cd smart-resource-allocation
    pip install -r backend/requirements.txt
    cd frontend && npm install
    ```
2.  **Seed Data**:
    ```bash
    # Set dev flag
    $env:ALLOW_DEV_SEED="true"
    python backend/seed_data.py
    ```
3.  **Launch**:
    - Backend: `uvicorn app.main:app --reload`
    - Frontend: `npm run dev`

---

## 🎨 Design Philosophy: "Grounded Trust"
Namma Connect uses a custom palette designed for clarity and authority:
- **Bone (#F9F7F2)**: Soft, human-centric background for prolonged usage.
- **Forest (#114B3B)**: Deep green representing growth and institutional trust.
- **Cinnabar (#E8712A)**: Strategic highlight for urgent action points.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built for <b>Bharat</b> 🇮🇳 with ❤️ by the Namma Connect Team.
</p>
