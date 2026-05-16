"""
Dashboard Routes
================
Provides aggregated statistics for the dashboard.
Data is read from Firebase Firestore.
"""

from datetime import datetime, date, timedelta, timezone
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

dashboard_bp = Blueprint("dashboard", __name__)

def get_db():
    return firestore.client()

@dashboard_bp.route("/stats", methods=["GET"])
@login_required
def stats():
    """Return overall task statistics and today's tasks."""
    db = get_db()
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).stream()
    
    tasks = []
    for doc in docs:
        task = doc.to_dict()
        task["id"] = doc.id
        tasks.append(task)

    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("status") == "completed")
    pending = total - completed
    completion_pct = round((completed / total) * 100, 1) if total > 0 else 0

    today_str = date.today().isoformat()
    
    # Get today's tasks
    todays_tasks = [t for t in tasks if t.get("due_date") == today_str]
    todays_tasks.sort(key=lambda t: t.get("position", 0))

    # Overdue count
    overdue = sum(1 for t in tasks if t.get("due_date") and t.get("due_date") < today_str and t.get("status") == "pending")

    return jsonify({
        "total": total,
        "completed": completed,
        "pending": pending,
        "completion_pct": completion_pct,
        "overdue": overdue,
        "todays_tasks": todays_tasks,
        "todays_count": len(todays_tasks),
    }), 200


@dashboard_bp.route("/weekly", methods=["GET"])
@login_required
def weekly():
    """Return day-by-day task completion data for the current week (Mon–Sun)."""
    db = get_db()
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).stream()
    tasks = [doc.to_dict() for doc in docs]

    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    days = []

    for i in range(7):
        d = start_of_week + timedelta(days=i)
        d_str = d.isoformat()
        
        day_tasks = [t for t in tasks if t.get("due_date") == d_str]
        total = len(day_tasks)
        completed = sum(1 for t in day_tasks if t.get("status") == "completed")
        
        days.append({
            "date": d_str,
            "day_name": d.strftime("%a"),
            "total": total,
            "completed": completed,
            "pending": total - completed,
        })

    return jsonify({"week_start": start_of_week.isoformat(), "days": days}), 200


@dashboard_bp.route("/monthly", methods=["GET"])
@login_required
def monthly():
    """Return day-by-day task data for the current month."""
    db = get_db()
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).stream()
    tasks = [doc.to_dict() for doc in docs]

    today = date.today()
    first_day = today.replace(day=1)

    if today.month == 12:
        last_day = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        last_day = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    days = []
    current = first_day
    while current <= last_day:
        current_str = current.isoformat()
        day_tasks = [t for t in tasks if t.get("due_date") == current_str]
        
        total = len(day_tasks)
        completed = sum(1 for t in day_tasks if t.get("status") == "completed")
        
        days.append({
            "date": current_str,
            "total": total,
            "completed": completed,
        })
        current += timedelta(days=1)

    return jsonify({
        "month": today.strftime("%B %Y"),
        "days": days,
    }), 200
