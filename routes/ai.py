"""
AI Insights Routes
==================
Rule-based "AI" engine. Data from Firebase Firestore.
"""

from datetime import datetime, date, timedelta, timezone
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

ai_bp = Blueprint("ai", __name__)

def get_db():
    return firestore.client()

def _priority_weight(priority):
    return {"high": 3, "medium": 2, "low": 1}.get(priority, 1)

@ai_bp.route("/insights", methods=["GET"])
@login_required
def insights():
    db = get_db()
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).stream()
    
    all_tasks = []
    for doc in docs:
        task = doc.to_dict()
        task["id"] = doc.id
        # Convert string dates back to date objects for calculation
        if task.get("due_date"):
            try: task["due_date_obj"] = date.fromisoformat(task["due_date"])
            except: task["due_date_obj"] = None
        else: task["due_date_obj"] = None
        
        if task.get("completed_at"):
            try: task["completed_at_obj"] = datetime.fromisoformat(task["completed_at"])
            except: task["completed_at_obj"] = None
        else: task["completed_at_obj"] = None
        
        all_tasks.append(task)

    today = date.today()

    total = len(all_tasks)
    completed = sum(1 for t in all_tasks if t.get("status") == "completed")
    pending = total - completed
    completion_pct = round((completed / total) * 100, 1) if total > 0 else 0

    # ─── Overdue Risk Analysis ───
    overdue_risks = []
    for task in all_tasks:
        if task.get("status") == "completed" or not task.get("due_date_obj"):
            continue

        days_until_due = (task["due_date_obj"] - today).days
        priority_w = _priority_weight(task.get("priority"))

        if days_until_due < 0:
            risk = 100
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
        # remove injected objects before returning
        clean_task = {k:v for k,v in task.items() if not k.endswith("_obj")}
        overdue_risks.append({
            "task": clean_task,
            "risk_score": risk,
            "risk_label": risk_label,
            "days_until_due": days_until_due,
        })

    overdue_risks.sort(key=lambda x: x["risk_score"], reverse=True)

    # ─── Productivity Score ───
    on_time = 0
    completed_with_due = 0
    for task in all_tasks:
        if task.get("status") == "completed" and task.get("due_date_obj") and task.get("completed_at_obj"):
            completed_with_due += 1
            if task["completed_at_obj"].date() <= task["due_date_obj"]:
                on_time += 1

    on_time_rate = (on_time / completed_with_due * 100) if completed_with_due > 0 else 50

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_completions = sum(
        1 for t in all_tasks
        if t.get("status") == "completed" and t.get("completed_at_obj") and t["completed_at_obj"] >= week_ago
    )
    activity_bonus = min(20, recent_completions * 4)

    productivity_score = min(100, round((completion_pct * 0.4) + (on_time_rate * 0.4) + activity_bonus))

    # ─── Streak calculation ───
    streak = 0
    check_date = today
    completed_dates = {t["completed_at_obj"].date() for t in all_tasks if t.get("status") == "completed" and t.get("completed_at_obj")}

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
        "overdue_risks": overdue_risks[:10],
        "streak_days": streak,
        "recent_completions_7d": recent_completions,
    }), 200


@ai_bp.route("/suggestions", methods=["GET"])
@login_required
def suggestions():
    db = get_db()
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).where(filter=FieldFilter("status", "==", "pending")).stream()
    
    pending_tasks = []
    for doc in docs:
        task = doc.to_dict()
        task["id"] = doc.id
        if task.get("due_date"):
            try: task["due_date_obj"] = date.fromisoformat(task["due_date"])
            except: task["due_date_obj"] = None
        else: task["due_date_obj"] = None
        
        if task.get("created_at"):
            try: task["created_at_obj"] = datetime.fromisoformat(task["created_at"])
            except: task["created_at_obj"] = None
        else: task["created_at_obj"] = None
        
        pending_tasks.append(task)

    today = date.today()
    scored = []
    for task in pending_tasks:
        score = 0
        score += _priority_weight(task.get("priority")) * 10

        if task.get("due_date_obj"):
            days_until = (task["due_date_obj"] - today).days
            if days_until < 0: score += 50
            elif days_until == 0: score += 40
            elif days_until == 1: score += 30
            elif days_until <= 3: score += 20
            elif days_until <= 7: score += 10
        else:
            score += 5

        if task.get("created_at_obj"):
            age_days = (datetime.now(timezone.utc) - task["created_at_obj"]).days
            score += min(15, age_days * 1)

        reason_parts = []
        if task.get("due_date_obj"):
            days_until = (task["due_date_obj"] - today).days
            if days_until < 0: reason_parts.append("Overdue")
            elif days_until == 0: reason_parts.append("Due today")
            elif days_until == 1: reason_parts.append("Due tomorrow")

        if task.get("priority") == "high":
            reason_parts.append("High priority")

        if task.get("created_at_obj") and (datetime.now(timezone.utc) - task["created_at_obj"]).days > 7:
            reason_parts.append("Pending for over a week")

        clean_task = {k:v for k,v in task.items() if not k.endswith("_obj")}
        scored.append({
            "task": clean_task,
            "score": score,
            "reason": ", ".join(reason_parts) if reason_parts else "General recommendation",
        })

    scored.sort(key=lambda x: x["score"], reverse=True)

    return jsonify({
        "suggestions": scored[:8],
        "total_pending": len(pending_tasks),
    }), 200
