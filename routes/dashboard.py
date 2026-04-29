"""
Dashboard Routes
================
Provides aggregated statistics for the dashboard:
  - Total, completed, pending counts and completion percentage
  - Today's tasks
  - Weekly progress (day-by-day)
  - Monthly progress
"""

from datetime import datetime, date, timedelta, timezone
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from sqlalchemy import func
from extensions import db
from models.task import Task

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/stats", methods=["GET"])
@login_required
def stats():
    """Return overall task statistics and today's tasks."""
    user_tasks = Task.query.filter_by(user_id=current_user.id)

    total = user_tasks.count()
    completed = user_tasks.filter_by(status="completed").count()
    pending = user_tasks.filter_by(status="pending").count()
    completion_pct = round((completed / total) * 100, 1) if total > 0 else 0

    today = date.today()
    todays_tasks = [
        t.to_dict()
        for t in user_tasks.filter(Task.due_date == today).order_by(Task.position).all()
    ]

    # Overdue count
    overdue = user_tasks.filter(
        Task.due_date < today,
        Task.status == "pending",
    ).count()

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
    today = date.today()
    # Monday of this week
    start_of_week = today - timedelta(days=today.weekday())
    days = []

    for i in range(7):
        d = start_of_week + timedelta(days=i)
        day_tasks = Task.query.filter_by(user_id=current_user.id).filter(
            Task.due_date == d
        )
        total = day_tasks.count()
        completed = day_tasks.filter_by(status="completed").count()
        days.append({
            "date": d.isoformat(),
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
    today = date.today()
    first_day = today.replace(day=1)

    # Get the last day of the month
    if today.month == 12:
        last_day = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        last_day = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    days = []
    current = first_day
    while current <= last_day:
        day_tasks = Task.query.filter_by(user_id=current_user.id).filter(
            Task.due_date == current
        )
        total = day_tasks.count()
        completed = day_tasks.filter_by(status="completed").count()
        days.append({
            "date": current.isoformat(),
            "total": total,
            "completed": completed,
        })
        current += timedelta(days=1)

    return jsonify({
        "month": today.strftime("%B %Y"),
        "days": days,
    }), 200
