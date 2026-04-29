"""
AI Insights Routes
==================
Rule-based "AI" engine that provides:
  - Completion percentage and trend analysis
  - Smart task suggestions for today
  - Overdue risk scoring
  - Productivity score
No external API keys needed — all computed server-side.
"""

from datetime import datetime, date, timedelta, timezone
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.task import Task

ai_bp = Blueprint("ai", __name__)


def _priority_weight(priority):
    """Map priority to numeric weight."""
    return {"high": 3, "medium": 2, "low": 1}.get(priority, 1)


@ai_bp.route("/insights", methods=["GET"])
@login_required
def insights():
    """
    Compute AI insights:
      - completion_pct: overall completion percentage
      - productivity_score: 0-100 score based on multiple factors
      - overdue_risks: tasks at risk of becoming overdue
      - streak: consecutive days with at least one completion
    """
    all_tasks = Task.query.filter_by(user_id=current_user.id).all()
    today = date.today()

    total = len(all_tasks)
    completed = sum(1 for t in all_tasks if t.status == "completed")
    pending = total - completed
    completion_pct = round((completed / total) * 100, 1) if total > 0 else 0

    # ─── Overdue Risk Analysis ───
    overdue_risks = []
    for task in all_tasks:
        if task.status == "completed" or not task.due_date:
            continue

        days_until_due = (task.due_date - today).days
        priority_w = _priority_weight(task.priority)

        # Risk score: higher priority + closer deadline = higher risk
        if days_until_due < 0:
            risk = 100  # already overdue
            risk_label = "Overdue"
        elif days_until_due == 0:
            risk = 90
            risk_label = "Due Today"
        elif days_until_due == 1:
            risk = 75
            risk_label = "Due Tomorrow"
        elif days_until_due <= 3:
            risk = max(30, 60 - (days_until_due * 10) + (priority_w * 10))
            risk_label = "Approaching"
        else:
            risk = max(5, 30 - (days_until_due * 2) + (priority_w * 5))
            risk_label = "Low Risk"

        risk = min(100, risk)
        overdue_risks.append({
            "task": task.to_dict(),
            "risk_score": risk,
            "risk_label": risk_label,
            "days_until_due": days_until_due,
        })

    # Sort by risk score descending
    overdue_risks.sort(key=lambda x: x["risk_score"], reverse=True)

    # ─── Productivity Score ───
    # Factors: completion rate, on-time rate, recent activity
    on_time = 0
    completed_with_due = 0
    for task in all_tasks:
        if task.status == "completed" and task.due_date and task.completed_at:
            completed_with_due += 1
            if task.completed_at.date() <= task.due_date:
                on_time += 1

    on_time_rate = (on_time / completed_with_due * 100) if completed_with_due > 0 else 50
    completion_rate = completion_pct

    # Recent activity bonus: tasks completed in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_completions = sum(
        1 for t in all_tasks
        if t.status == "completed" and t.completed_at and t.completed_at >= week_ago
    )
    activity_bonus = min(20, recent_completions * 4)

    productivity_score = min(100, round(
        (completion_rate * 0.4) + (on_time_rate * 0.4) + activity_bonus
    ))

    # ─── Streak calculation ───
    streak = 0
    check_date = today
    completed_dates = set()
    for t in all_tasks:
        if t.status == "completed" and t.completed_at:
            completed_dates.add(t.completed_at.date())

    while check_date in completed_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return jsonify({
        "completion_pct": completion_pct,
        "total": total,
        "completed": completed,
        "pending": pending,
        "productivity_score": productivity_score,
        "on_time_rate": round(on_time_rate, 1),
        "overdue_risks": overdue_risks[:10],  # top 10 risks
        "streak_days": streak,
        "recent_completions_7d": recent_completions,
    }), 200


@ai_bp.route("/suggestions", methods=["GET"])
@login_required
def suggestions():
    """
    AI suggests which tasks to complete today.
    Scoring: priority weight + due-date urgency + task age.
    Returns the top tasks sorted by suggestion score.
    """
    today = date.today()
    pending_tasks = Task.query.filter_by(
        user_id=current_user.id, status="pending"
    ).all()

    scored = []
    for task in pending_tasks:
        score = 0

        # Priority weight (high=30, medium=20, low=10)
        score += _priority_weight(task.priority) * 10

        # Due date urgency
        if task.due_date:
            days_until = (task.due_date - today).days
            if days_until < 0:
                score += 50  # overdue — highest urgency
            elif days_until == 0:
                score += 40  # due today
            elif days_until == 1:
                score += 30  # due tomorrow
            elif days_until <= 3:
                score += 20
            elif days_until <= 7:
                score += 10
        else:
            score += 5  # no due date gets a small base score

        # Task age bonus (older pending tasks get a nudge)
        if task.created_at:
            age_days = (datetime.now(timezone.utc) - task.created_at).days
            score += min(15, age_days * 1)  # cap at 15

        reason_parts = []
        if task.due_date and (task.due_date - today).days < 0:
            reason_parts.append("Overdue")
        elif task.due_date and (task.due_date - today).days == 0:
            reason_parts.append("Due today")
        elif task.due_date and (task.due_date - today).days == 1:
            reason_parts.append("Due tomorrow")

        if task.priority == "high":
            reason_parts.append("High priority")

        if task.created_at and (datetime.now(timezone.utc) - task.created_at).days > 7:
            reason_parts.append("Pending for over a week")

        scored.append({
            "task": task.to_dict(),
            "score": score,
            "reason": ", ".join(reason_parts) if reason_parts else "General recommendation",
        })

    # Sort by score descending, return top suggestions
    scored.sort(key=lambda x: x["score"], reverse=True)

    return jsonify({
        "suggestions": scored[:8],
        "total_pending": len(pending_tasks),
    }), 200
