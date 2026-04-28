import logging
import re
from typing import Any

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

from app.services.nlp_classifier import classify_need

logger = logging.getLogger(__name__)

_DISTRICT_COORDINATES: dict[str, tuple[float, float]] = {
    "Ariyalur": (11.1398, 79.0756),
    "Chengalpattu": (12.6819, 79.9888),
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Cuddalore": (11.7447, 79.7680),
    "Dharmapuri": (12.1277, 78.1579),
    "Dindigul": (10.3673, 77.9803),
    "Erode": (11.3410, 77.7172),
    "Kallakurichi": (11.7390, 78.9637),
    "Kanchipuram": (12.8342, 79.7036),
    "Kanyakumari": (8.0883, 77.5385),
    "Karur": (10.9601, 78.0766),
    "Krishnagiri": (12.5266, 78.2137),
    "Madurai": (9.9252, 78.1198),
    "Mayiladuthurai": (11.1035, 79.6550),
    "Nagapattinam": (10.7656, 79.8428),
    "Namakkal": (11.2189, 78.1674),
    "Nilgiris": (11.4064, 76.6932),
    "Perambalur": (11.2333, 78.8833),
    "Pudukkottai": (10.3833, 78.8000),
    "Ramanathapuram": (9.3639, 78.8395),
    "Ranipet": (12.9273, 79.3335),
    "Salem": (11.6643, 78.1460),
    "Sivaganga": (9.8470, 78.4836),
    "Tenkasi": (8.9592, 77.3152),
    "Thanjavur": (10.7867, 79.1378),
    "Theni": (10.0104, 77.4768),
    "Thoothukudi": (8.7642, 78.1348),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Tirunelveli": (8.7139, 77.7567),
    "Tirupattur": (12.4950, 78.5680),
    "Tiruppur": (11.1085, 77.3411),
    "Tiruvallur": (13.1439, 79.9089),
    "Tiruvannamalai": (12.2253, 79.0747),
    "Tiruvarur": (10.7713, 79.6368),
    "Vellore": (12.9165, 79.1325),
    "Viluppuram": (11.9390, 79.4861),
    "Virudhunagar": (9.5841, 77.9579),
}

_DEFAULT_COORDINATES = _DISTRICT_COORDINATES["Chennai"]


def _fallback_result() -> dict[str, Any]:
    return {
        "raw_text": "",
        "confidence": 0.0,
        "needs_review": True,
        "language": "eng",
        "language_detected": "eng",
        "ocr_failed": True,
    }


def _detect_language(text: str) -> str:
    tamil_chars = len(re.findall(r"[\u0B80-\u0BFF]", text))
    english_chars = len(re.findall(r"[A-Za-z]", text))
    if tamil_chars > english_chars:
        return "tam"
    return "eng"


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _resolve_coordinates(lat: Any, lng: Any, district: Any) -> tuple[float, float]:
    parsed_lat = _to_float(lat, 0.0)
    parsed_lng = _to_float(lng, 0.0)

    if abs(parsed_lat) > 0.0001 or abs(parsed_lng) > 0.0001:
        return parsed_lat, parsed_lng

    district_name = str(district or "").strip()
    if district_name in _DISTRICT_COORDINATES:
        return _DISTRICT_COORDINATES[district_name]

    return _DEFAULT_COORDINATES


def _deskew_with_hough(binary_image: np.ndarray) -> np.ndarray:
    edges = cv2.Canny(binary_image, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=80,
        minLineLength=80,
        maxLineGap=10,
    )

    if lines is None:
        return binary_image

    angles: list[float] = []
    for line in lines[:, 0]:
        x1, y1, x2, y2 = line
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if -45.0 <= angle <= 45.0:
            angles.append(float(angle))

    if not angles:
        return binary_image

    skew_angle = float(np.median(angles))
    if abs(skew_angle) < 0.2:
        return binary_image

    height, width = binary_image.shape[:2]
    center = (width // 2, height // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, -skew_angle, 1.0)

    return cv2.warpAffine(
        binary_image,
        rotation_matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Decode image bytes and preprocess for OCR: grayscale, Otsu, deskew, denoise."""
    np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image bytes")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    _, binary = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )

    deskewed = _deskew_with_hough(binary)

    denoised = cv2.medianBlur(deskewed, 3)
    return denoised


def extract_text(image_bytes: bytes) -> dict[str, Any]:
    """Extract OCR text and confidence metadata from an image."""
    try:
        processed = preprocess_image(image_bytes)

        ocr_data = pytesseract.image_to_data(
            processed,
            lang="tam+eng",
            output_type=Output.DICT,
            config="--oem 3 --psm 6",
        )

        tokens: list[str] = []
        confidences: list[float] = []

        for text, conf in zip(ocr_data.get("text", []), ocr_data.get("conf", [])):
            token = str(text).strip()
            if token:
                tokens.append(token)

            try:
                conf_value = float(conf)
            except (TypeError, ValueError):
                continue

            if conf_value >= 0:
                confidences.append(conf_value)

        raw_text = " ".join(tokens).strip()
        confidence = float(np.mean(confidences)) if confidences else 0.0
        language = _detect_language(raw_text) if raw_text else "eng"
        needs_review = confidence < 65.0 or not raw_text

        return {
            "raw_text": raw_text,
            "confidence": round(confidence, 2),
            "needs_review": needs_review,
            "language": language,
            "language_detected": language,
        }
    except Exception as exc:
        logger.error("OCR extraction failed: %s", exc, exc_info=True)
        return _fallback_result()


async def process_survey(image_bytes: bytes) -> dict[str, Any]:
    """Process survey image bytes into OCR metadata and task-prefill fields."""
    ocr_result = extract_text(image_bytes)

    if ocr_result.get("ocr_failed"):
        default_lat, default_lng = _DEFAULT_COORDINATES
        return {
            "raw_text": "",
            "confidence": 0.0,
            "needs_review": True,
            "language": "eng",
            "title": "",
            "need_type": "other",
            "description": "",
            "urgency_score": 0,
            "ward": "",
            "district": "Chennai",
            "lat": default_lat,
            "lng": default_lng,
            "required_skills": [],
            "household_count": 1,
            "source": "ocr",
            "summary": "",
        }

    raw_text = ocr_result.get("raw_text", "")

    try:
        classification = await classify_need(raw_text) if raw_text else await classify_need("")
    except Exception as exc:
        logger.error("NLP classification failed in process_survey: %s", exc, exc_info=True)
        classification = {
            "need_type": "other",
            "urgency_score": 50,
            "required_skills": [],
            "household_count": 1,
            "ward": None,
            "district": "Chennai",
            "summary": "Need report could not be classified automatically.",
        }

    summary = str(classification.get("summary") or "Community need report")
    ward = classification.get("ward")
    district = classification.get("district") if isinstance(classification, dict) else None
    resolved_lat, resolved_lng = _resolve_coordinates(
        lat=classification.get("lat") if isinstance(classification, dict) else None,
        lng=classification.get("lng") if isinstance(classification, dict) else None,
        district=district,
    )

    try:
        urgency_score = int(classification.get("urgency_score", 50))
    except (TypeError, ValueError):
        urgency_score = 50
    urgency_score = max(0, min(100, urgency_score))

    try:
        household_count = int(classification.get("household_count", 1))
    except (TypeError, ValueError):
        household_count = 1
    household_count = max(1, household_count)

    required_skills = classification.get("required_skills", [])
    if not isinstance(required_skills, list):
        required_skills = []

    return {
        "raw_text": ocr_result.get("raw_text", ""),
        "confidence": ocr_result.get("confidence", 0.0),
        "needs_review": bool(ocr_result.get("needs_review", True)),
        "language": ocr_result.get("language", "eng"),
        "title": summary[:120] if summary else "Community Need Report",
        "need_type": str(classification.get("need_type", "other")),
        "description": raw_text if raw_text else summary,
        "urgency_score": urgency_score,
        "ward": str(ward) if ward else "",
        "district": str(district) if district else "Chennai",
        "lat": resolved_lat,
        "lng": resolved_lng,
        "required_skills": required_skills,
        "household_count": household_count,
        "source": "ocr",
        "summary": summary,
    }
