"""
Task Routes
===========
Full CRUD for tasks, plus search, filter, sort, and drag-and-drop reorder.
All endpoints are scoped to the currently authenticated user.
"""

from datetime import datetime, date, time, timezone
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.task import Task

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.route("", methods=["GET"])
@login_required
def list_tasks():
    """
    List all tasks for the current user.
    Query params:
      - search: search title & description
      - priority: filter by low/medium/high
      - status: filter by pending/completed
      - sort: due_date, priority, created_at, status (prefix with - for desc)
      - date_from / date_to: filter by due date range
    """
    query = Task.query.filter_by(user_id=current_user.id)

    # ─── Search ───
    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Task.title.ilike(like)) | (Task.description.ilike(like))
        )

    # ─── Filter by priority ───
    priority = request.args.get("priority", "").strip().lower()
    if priority in ("low", "medium", "high"):
        query = query.filter_by(priority=priority)

    # ─── Filter by status ───
    status = request.args.get("status", "").strip().lower()
    if status in ("pending", "completed"):
        query = query.filter_by(status=status)

    # ─── Filter by date range ───
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    if date_from:
        try:
            query = query.filter(Task.due_date >= date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            query = query.filter(Task.due_date <= date.fromisoformat(date_to))
        except ValueError:
            pass

    # ─── Sort ───
    sort = request.args.get("sort", "position").strip()
    descending = sort.startswith("-")
    sort_field = sort.lstrip("-")

    sort_map = {
        "due_date": Task.due_date,
        "priority": Task.priority,
        "created_at": Task.created_at,
        "status": Task.status,
        "position": Task.position,
        "title": Task.title,
    }
    col = sort_map.get(sort_field, Task.position)
    query = query.order_by(col.desc() if descending else col.asc())

    tasks = [t.to_dict() for t in query.all()]
    return jsonify({"tasks": tasks}), 200


@tasks_bp.route("", methods=["POST"])
@login_required
def create_task():
    """Create a new task."""
    data = request.get_json()

    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Task title is required"}), 400

    # Get the next position value
    max_pos = db.session.query(db.func.max(Task.position)).filter_by(
        user_id=current_user.id
    ).scalar() or 0

    task = Task(
        user_id=current_user.id,
        title=title,
        description=data.get("description", "").strip(),
        priority=data.get("priority", "medium").lower(),
        status="pending",
        position=max_pos + 1,
    )

    # Parse due date
    due_date_str = data.get("due_date")
    if due_date_str:
        try:
            task.due_date = date.fromisoformat(due_date_str)
        except ValueError:
            return jsonify({"error": "Invalid due_date format. Use YYYY-MM-DD"}), 400

    # Parse due time
    due_time_str = data.get("due_time")
    if due_time_str:
        try:
            task.due_time = time.fromisoformat(due_time_str)
        except ValueError:
            return jsonify({"error": "Invalid due_time format. Use HH:MM"}), 400

    db.session.add(task)
    db.session.commit()

    return jsonify({"message": "Task created", "task": task.to_dict()}), 201


@tasks_bp.route("/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    """Update an existing task."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json()

    if "title" in data:
        title = data["title"].strip()
        if not title:
            return jsonify({"error": "Task title cannot be empty"}), 400
        task.title = title

    if "description" in data:
        task.description = data["description"].strip()

    if "priority" in data and data["priority"].lower() in ("low", "medium", "high"):
        task.priority = data["priority"].lower()

    if "status" in data and data["status"].lower() in ("pending", "completed"):
        old_status = task.status
        task.status = data["status"].lower()
        if task.status == "completed" and old_status != "completed":
            task.completed_at = datetime.now(timezone.utc)
        elif task.status == "pending":
            task.completed_at = None

    if "due_date" in data:
        if data["due_date"]:
            try:
                task.due_date = date.fromisoformat(data["due_date"])
            except ValueError:
                return jsonify({"error": "Invalid due_date format"}), 400
        else:
            task.due_date = None

    if "due_time" in data:
        if data["due_time"]:
            try:
                task.due_time = time.fromisoformat(data["due_time"])
            except ValueError:
                return jsonify({"error": "Invalid due_time format"}), 400
        else:
            task.due_time = None

    db.session.commit()
    return jsonify({"message": "Task updated", "task": task.to_dict()}), 200


@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    """Delete a task."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted"}), 200


@tasks_bp.route("/<int:task_id>/toggle", methods=["PATCH"])
@login_required
def toggle_task(task_id):
    """Toggle a task between pending and completed."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    if task.status == "completed":
        task.status = "pending"
        task.completed_at = None
    else:
        task.status = "completed"
        task.completed_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({"message": "Task toggled", "task": task.to_dict()}), 200


@tasks_bp.route("/reorder", methods=["PUT"])
@login_required
def reorder_tasks():
    """
    Update task positions after drag-and-drop.
    Expects: { "order": [task_id_1, task_id_2, ...] }
    """
    data = request.get_json()
    order = data.get("order", [])

    if not order:
        return jsonify({"error": "Order list is required"}), 400

    for position, task_id in enumerate(order):
        task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
        if task:
            task.position = position

    db.session.commit()
    return jsonify({"message": "Tasks reordered"}), 200
