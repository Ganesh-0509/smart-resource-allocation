import math
import re
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

def _normalize_text(text: str) -> str:
    if not text:
        return ""
    # Lowercase and remove non-alphanumeric characters
    return re.sub(r"[^a-zA-Z0-9\s]", "", text.lower()).strip()

def _get_keywords(text: str) -> set:
    normalized = _normalize_text(text)
    return set(normalized.split())

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c

def calculate_similarity(report1: dict, report2: dict) -> float:
    """
    Calculate similarity score between 0.0 and 1.0.
    Considers text keywords and geographic distance.
    """
    # 1. Title & Description Keyword Similarity (Jaccard)
    text1 = f"{report1.get('title', '')} {report1.get('description', '')}"
    text2 = f"{report2.get('title', '')} {report2.get('description', '')}"
    
    words1 = _get_keywords(text1)
    words2 = _get_keywords(text2)
    
    if not words1 or not words2:
        text_score = 0.0
    else:
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        text_score = len(intersection) / len(union)
    
    # 2. Location Similarity
    lat1, lng1 = report1.get("lat"), report1.get("lng")
    lat2, lng2 = report2.get("lat"), report2.get("lng")
    
    location_score = 0.0
    if lat1 is not None and lng1 is not None and lat2 is not None and lng2 is not None:
        dist = _haversine(lat1, lng1, lat2, lng2)
        if dist < 0.2: # 200 meters
            location_score = 1.0
        elif dist < 1.0: # 1 km
            location_score = 0.7
        elif dist < 5.0: # 5 km
            location_score = 0.3
    
    # 3. Category match bonus
    source_match = 1.0 if report1.get("source") == report2.get("source") else 0.5
    
    # Final Weighted Score
    # Give high weight to text if location is also similar
    final_score = (text_score * 0.6) + (location_score * 0.4)
    
    # Boost if sources match
    if source_match == 1.0:
        final_score = min(1.0, final_score * 1.1)
        
    return final_score

def find_possible_duplicate(new_report: dict, existing_reports: List[dict], threshold: float = 0.65) -> Tuple[Optional[str], float]:
    """
    Find the best matching duplicate from existing reports within a time window.
    Returns (duplicate_id, score)
    """
    best_id = None
    best_score = 0.0
    
    for report in existing_reports:
        # Basic check for same NGO
        if report.get("ngo_id") != new_report.get("ngo_id"):
            continue
            
        # Ignore already rejected reports
        if report.get("status") == "rejected":
            continue
            
        score = calculate_similarity(new_report, report)
        if score > best_score:
            best_score = score
            best_id = report.get("id")
            
    if best_score >= threshold:
        return best_id, best_score
    
    return None, 0.0
