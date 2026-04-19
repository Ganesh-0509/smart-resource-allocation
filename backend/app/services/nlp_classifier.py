import asyncio
import json
import logging
import os
import re
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_ALLOWED_NEED_TYPES = {
    "nutrition",
    "medical",
    "shelter",
    "education",
    "water",
    "livelihood",
    "other",
}

_ALLOWED_SKILLS = {
    "nutrition",
    "medical",
    "education",
    "logistics",
    "counselling",
    "construction",
    "water_sanitation",
    "livelihood",
}

_BASE_PROMPT = """Extract from the following community field report:
1. need_type: one of [nutrition, medical, shelter, education, water, livelihood, other]
2. urgency_score: integer 0-100 (100=life threatening, 50=moderate, 0=non-urgent)
3. required_skills: list from [nutrition, medical, education, logistics, counselling, construction, water_sanitation, livelihood]
4. household_count: number of affected families (integer, default 1 if not mentioned)
5. ward: location/ward/village name if mentioned (string or null)
6. summary: one sentence describing the need in English

Always respond in valid JSON only. No markdown. No explanation.
"""

_DEFAULT_RESULT = {
    "need_type": "other",
    "urgency_score": 50,
    "required_skills": [],
    "household_count": 1,
    "ward": None,
    "summary": "Need report could not be classified automatically.",
}


def _fallback_result(text: str) -> dict[str, Any]:
    summary = text.strip().replace("\n", " ")
    if not summary:
        summary = _DEFAULT_RESULT["summary"]
    else:
        summary = summary[:140].strip()
    return {
        "need_type": "other",
        "urgency_score": 50,
        "required_skills": [],
        "household_count": 1,
        "ward": None,
        "summary": summary,
    }


def _extract_json(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in Gemini response")

    return json.loads(cleaned[start : end + 1])


def _sanitize_result(payload: dict[str, Any]) -> dict[str, Any]:
    result = dict(_DEFAULT_RESULT)

    need_type = str(payload.get("need_type", "other")).strip().lower()
    if need_type in _ALLOWED_NEED_TYPES:
        result["need_type"] = need_type

    urgency_raw = payload.get("urgency_score", 50)
    try:
        urgency = int(urgency_raw)
    except (TypeError, ValueError):
        urgency = 50
    result["urgency_score"] = max(0, min(100, urgency))

    skills_raw = payload.get("required_skills", [])
    if isinstance(skills_raw, list):
        cleaned_skills = []
        for skill in skills_raw:
            skill_name = str(skill).strip().lower()
            if skill_name in _ALLOWED_SKILLS:
                cleaned_skills.append(skill_name)
        result["required_skills"] = cleaned_skills

    household_raw = payload.get("household_count", 1)
    try:
        household_count = int(household_raw)
        if household_count < 1:
            household_count = 1
    except (TypeError, ValueError):
        household_count = 1
    result["household_count"] = household_count

    ward_raw = payload.get("ward", None)
    if ward_raw is None:
        result["ward"] = None
    else:
        ward_cleaned = str(ward_raw).strip()
        result["ward"] = ward_cleaned if ward_cleaned and ward_cleaned.lower() != "null" else None

    summary_raw = payload.get("summary", "")
    summary = str(summary_raw).strip()
    if summary:
        result["summary"] = summary

    return result


async def classify_need(text: str) -> dict[str, Any]:
    """Classify a single field report into structured task metadata using Gemini."""
    if not isinstance(text, str) or not text.strip():
        return _fallback_result("")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found. Returning fallback classification.")
        return _fallback_result(text)

    prompt = f"{_BASE_PROMPT}\nCommunity field report:\n{text.strip()}"

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        response = await asyncio.to_thread(model.generate_content, prompt)
        response_text = getattr(response, "text", "") or ""
        parsed = _extract_json(response_text)
        return _sanitize_result(parsed)
    except Exception as exc:
        logger.exception("Gemini classification failed: %s", exc)
        return _fallback_result(text)


async def batch_classify(texts: list[str]) -> list[dict[str, Any]]:
    """Classify multiple field reports concurrently."""
    if not texts:
        return []
    return await asyncio.gather(*(classify_need(text) for text in texts))
