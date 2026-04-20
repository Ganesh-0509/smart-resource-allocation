import logging
import re
from typing import Any

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

from app.services.nlp_classifier import classify_need

logger = logging.getLogger(__name__)


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
            "district": "",
            "lat": 0.0,
            "lng": 0.0,
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
            "summary": "Need report could not be classified automatically.",
        }

    summary = str(classification.get("summary") or "Community need report")
    ward = classification.get("ward")
    district = classification.get("district") if isinstance(classification, dict) else None

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
        "district": str(district) if district else "Madurai",
        "lat": 0.0,
        "lng": 0.0,
        "required_skills": required_skills,
        "household_count": household_count,
        "source": "ocr",
        "summary": summary,
    }
