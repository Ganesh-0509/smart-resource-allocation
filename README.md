# <p align="center"><img src="frontend/public/brand-logo.svg" width="60" height="60" alt="Namma Connect Logo" /><br/>Namma Connect</p>

<p align="center">
  <b>Empowering NGOs across Bharat with AI-assisted volunteer coordination and real-time community insights.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-0D9488?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-React_|_FastAPI_|_Gemini-114B3B?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Vision_|_Matching_|_LLM-emerald?style=for-the-badge" />
</p>

---

## 🌿 The Vision
In the heart of community service, logistics often becomes the bottleneck for impact. **Namma Connect** is the digital infrastructure built to move resources faster. By combining **Computer Vision**, **Large Language Models (Gemini)**, and **Geospatial Intelligence**, we transform analog field reports into organized, high-priority volunteer deployments in seconds.

---

## ✨ Key Capabilities

| Feature | Description | Tech |
| :--- | :--- | :--- |
| **📷 Vision AI Entry** | Transform handwritten field surveys into digital tasks instantly. | Tesseract + OpenCV |
| **🧠 Smart Prioritization** | LLM-driven urgency scoring ensures the most critical needs are met first. | Google Gemini 1.5 Pro |
| **🧭 Precision Matching** | Skills-based algorithm identifies the top 10 local volunteers by proximity. | Custom Scoring Hub |
| **🗺️ Impact Heatmaps** | Live geospatial visualization of community needs for coordinators. | React Leaflet |
| **📱 SMS Dispatch** | Automated volunteer notifications for rapid field deployment. | Twilio Integration |

---

## 🛠️ Technological Core

### **Frontend**
- **Architecture:** React 18 + TypeScript (Vite)
- **State Management:** TanStack Query (React Query)
- **UI System:** Custom 'Grounded Trust' Design (Tailwind CSS)
- **Maps:** Leaflet.js with dynamic cluster markers

### **Backend**
- **Engine:** FastAPI (High-performance Python)
- **Database:** Supabase (PostgreSQL + Row Level Security)
- **AI/ML:** 
  - **Gemini AI:** Task classification & priority scoring
  - **Vision Engine:** OCR pipeline for field log digitization
- **Communcations:** Twilio SMS API

---

## 🏗️ Project Architecture

```text
smart-resource-allocation/
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📂 routers/    # Domain-specific API endpoints
│   │   ├── 📂 services/   # AI Matching, Gemini NLP, OCR Hub
│   │   └── 📂 db/         # Supabase client & abstractions
│   └── 📄 requirements.txt
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 pages/      # Dashboard, Map, Coordinator Hub
│   │   ├── 📂 components/ # Glassmorphic UI components
│   │   └── 📂 api/        # Axios clients & Signal handlers
│   └── 📄 package.json
└── 📄 README.md
```

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- Node.js 20+
- Supabase Project (Tables schema provided in migration scripts)

### 2. Physical Setup
```bash
git clone https://github.com/Ganesh-0509/smart-resource-allocation.git
cd smart-resource-allocation
```

### 3. Backend Deployment
```bash
pip install -r requirements.txt
# Copy environment variables from .env.example
uvicorn app.main:app --reload
```

### 4. Frontend Launch
```bash
cd frontend
npm install
npm run dev
```

---

## 🎨 Design Philosophy: "Grounded Trust"
Namma Connect uses a custom design system built for institutional credibility.
- **Bone (#F9F7F2)**: To reduce eye strain and feel more human-centric.
- **Forest (#114B3B)**: For deep trustworthiness and authority.
- **Teal (#0D9488)**: Luminous action points to guide the user naturally.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built for <b>Bharat</b> 🇮🇳 with ❤️ by the Namma Connect Team.
</p>
