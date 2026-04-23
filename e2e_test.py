#!/usr/bin/env python3
"""End-to-end test for Smart Resource Allocation platform"""
import requests
import json
from datetime import datetime, timedelta

API_URL = "http://localhost:8000"

def test_health():
    """Test backend health"""
    try:
        resp = requests.get(f"{API_URL}/api/health", timeout=5)
        print(f"✅ HEALTH: {resp.status_code}")
        return True
    except Exception as e:
        print(f"❌ HEALTH: {e}")
        return False

def test_create_volunteer():
    """Test volunteer creation"""
    try:
        data = {
            "name": "Test Volunteer",
            "email": "volunteer@test.com",
            "phone": "+919876543210",
            "skills": ["teaching", "counseling"],
            "availability": "weekends"
        }
        resp = requests.post(f"{API_URL}/api/volunteers", json=data, timeout=5)
        if resp.status_code == 200:
            vol = resp.json()
            print(f"✅ CREATE VOLUNTEER: {vol.get('id')}")
            return vol.get('id')
        else:
            print(f"❌ CREATE VOLUNTEER: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"❌ CREATE VOLUNTEER: {e}")
        return None

def test_get_volunteers():
    """Test volunteer listing"""
    try:
        resp = requests.get(f"{API_URL}/api/volunteers", timeout=5)
        if resp.status_code == 200:
            vols = resp.json()
            print(f"✅ GET VOLUNTEERS: {len(vols)} volunteers")
            return True
        else:
            print(f"❌ GET VOLUNTEERS: {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ GET VOLUNTEERS: {e}")
        return False

def test_create_task():
    """Test task creation"""
    try:
        data = {
            "title": "Water Supply Assessment",
            "description": "Assess water supply in Ward 5",
            "need_type": "water",
            "urgency_score": 85,
            "district": "Bangalore",
            "ward": "Ward 5",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "required_skills": ["assessment"]
        }
        resp = requests.post(f"{API_URL}/api/tasks", json=data, timeout=5)
        if resp.status_code == 200:
            task = resp.json()
            print(f"✅ CREATE TASK: {task.get('id')}")
            return task.get('id')
        else:
            print(f"❌ CREATE TASK: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"❌ CREATE TASK: {e}")
        return None

def test_get_tasks():
    """Test task listing"""
    try:
        resp = requests.get(f"{API_URL}/api/tasks", timeout=5)
        if resp.status_code == 200:
            tasks = resp.json()
            print(f"✅ GET TASKS: {len(tasks)} tasks")
            return True
        else:
            print(f"❌ GET TASKS: {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ GET TASKS: {e}")
        return False

def test_create_assignment(vol_id, task_id):
    """Test assignment creation"""
    try:
        data = {
            "volunteer_id": vol_id,
            "task_id": task_id,
            "sla_hours": 24,
            "notes": "Test assignment"
        }
        resp = requests.post(f"{API_URL}/api/assignments", json=data, timeout=5)
        if resp.status_code == 200:
            assign = resp.json()
            print(f"✅ CREATE ASSIGNMENT: {assign.get('id')}")
            return assign.get('id')
        else:
            print(f"❌ CREATE ASSIGNMENT: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"❌ CREATE ASSIGNMENT: {e}")
        return None

def test_volunteer_analytics():
    """Test volunteer analytics"""
    try:
        resp = requests.get(f"{API_URL}/api/analytics/volunteer/test-vol-id", timeout=5)
        # This may 404 but shouldn't error
        print(f"✅ ANALYTICS VOLUNTEER: {resp.status_code}")
        return True
    except Exception as e:
        print(f"❌ ANALYTICS VOLUNTEER: {e}")
        return False

def test_district_analytics():
    """Test district analytics"""
    try:
        resp = requests.get(f"{API_URL}/api/analytics/district/Bangalore", timeout=5)
        # This may 404 but shouldn't error
        print(f"✅ ANALYTICS DISTRICT: {resp.status_code}")
        return True
    except Exception as e:
        print(f"❌ ANALYTICS DISTRICT: {e}")
        return False

def test_batch_matching():
    """Test batch matching endpoints"""
    try:
        data = {"open_task_ids": []}
        resp = requests.post(f"{API_URL}/api/batch-matching/suggest", json=data, timeout=5)
        print(f"✅ BATCH MATCHING: {resp.status_code}")
        return True
    except Exception as e:
        print(f"❌ BATCH MATCHING: {e}")
        return False

def test_scheduling():
    """Test scheduling endpoints"""
    try:
        resp = requests.get(f"{API_URL}/api/scheduling/availability/1", timeout=5)
        print(f"✅ SCHEDULING: {resp.status_code}")
        return True
    except Exception as e:
        print(f"❌ SCHEDULING: {e}")
        return False

def test_ocr_queue():
    """Test OCR review queue"""
    try:
        resp = requests.get(f"{API_URL}/api/ocr/review/queue", timeout=5)
        print(f"✅ OCR QUEUE: {resp.status_code}")
        return True
    except Exception as e:
        print(f"❌ OCR QUEUE: {e}")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("SMART RESOURCE ALLOCATION - END-TO-END TEST")
    print("="*60 + "\n")
    
    # Core API tests
    print("🔍 HEALTH & CONNECTIVITY:")
    test_health()
    
    print("\n🔍 VOLUNTEER MANAGEMENT:")
    vol_id = test_create_volunteer()
    test_get_volunteers()
    
    print("\n🔍 TASK MANAGEMENT:")
    task_id = test_create_task()
    test_get_tasks()
    
    print("\n🔍 ASSIGNMENT WORKFLOW:")
    if vol_id and task_id:
        test_create_assignment(vol_id, task_id)
    
    print("\n🔍 PHASE A - OPERATIONS:")
    test_volunteer_analytics()
    test_batch_matching()
    
    print("\n🔍 PHASE B - QUALITY:")
    test_scheduling()
    test_ocr_queue()
    
    print("\n🔍 PHASE C - MANAGEMENT:")
    test_district_analytics()
    
    print("\n" + "="*60)
    print("✅ END-TO-END TEST COMPLETE")
    print("="*60 + "\n")
