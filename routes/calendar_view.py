"""
Calendar View Routes
====================
Returns tasks grouped by date for a given month/year,
suitable for rendering a calendar grid in the frontend.
"""

from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.task import Task

calendar_bp = Blueprint("calendar", __name__)


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

    # Calculate date range for the month
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)

    # Fetch tasks in this date range
    tasks = Task.query.filter_by(user_id=current_user.id).filter(
        Task.due_date >= first_day,
        Task.due_date <= last_day,
    ).order_by(Task.due_date, Task.due_time).all()

    # Group by date
    grouped = {}
    for task in tasks:
        key = task.due_date.isoformat()
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(task.to_dict())

    return jsonify({
        "month": month,
        "year": year,
        "month_name": first_day.strftime("%B"),
        "first_day_weekday": first_day.weekday(),  # 0=Mon, 6=Sun
        "days_in_month": (last_day - first_day).days + 1,
        "tasks_by_date": grouped,
    }), 200
