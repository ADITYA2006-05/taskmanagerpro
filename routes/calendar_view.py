"""
Calendar View Routes
====================
Returns tasks grouped by date for a given month/year.
Data from Firebase Firestore.
"""

from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

calendar_bp = Blueprint("calendar", __name__)

def get_db():
    return firestore.client()

@calendar_bp.route("/tasks", methods=["GET"])
@login_required
def calendar_tasks():
    """
    Return tasks grouped by date for a given month.
    Query params:
      - month: 1–12 (default: current month)
      - year: e.g. 2026 (default: current year)
    """
    today = date.today()
    try:
        month = int(request.args.get("month", today.month))
        year = int(request.args.get("year", today.year))
    except (ValueError, TypeError):
        month, year = today.month, today.year

    # Clamp values
    month = max(1, min(12, month))
    year = max(2000, min(2100, year))

    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)

    first_day_str = first_day.isoformat()
    last_day_str = last_day.isoformat()

    db = get_db()
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).stream()
    
    tasks = []
    for doc in docs:
        task = doc.to_dict()
        task["id"] = doc.id
        due_date = task.get("due_date")
        if due_date and first_day_str <= due_date <= last_day_str:
            tasks.append(task)

    # Sort by due_date, then due_time
    def sort_key(t):
        return (t.get("due_date", ""), t.get("due_time", ""))
        
    tasks.sort(key=sort_key)

    # Group by date
    grouped = {}
    for task in tasks:
        key = task.get("due_date")
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(task)

    return jsonify({
        "month": month,
        "year": year,
        "month_name": first_day.strftime("%B"),
        "first_day_weekday": first_day.weekday(),  # 0=Mon, 6=Sun
        "days_in_month": (last_day - first_day).days + 1,
        "tasks_by_date": grouped,
    }), 200
