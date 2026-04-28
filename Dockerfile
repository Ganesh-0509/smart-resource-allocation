# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# We point to the same host for the API since it's unified
ENV VITE_API_URL=/
RUN npm run build

# Stage 2: Build Backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and Tesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend from Stage 1 to backend's static folder
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
