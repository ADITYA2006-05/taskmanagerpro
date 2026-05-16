"""
Task Routes
===========
Full CRUD for tasks, plus search, filter, sort, and drag-and-drop reorder.
All endpoints are scoped to the currently authenticated user.
Data is stored in Firebase Firestore.
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

tasks_bp = Blueprint("tasks", __name__)

def get_db():
    return firestore.client()

@tasks_bp.route("", methods=["GET"])
@login_required
def list_tasks():
    """
    List all tasks for the current user.
    """
    db = get_db()
    # Fetch all tasks for the user
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).stream()
    
    tasks = []
    for doc in docs:
        task = doc.to_dict()
        task["id"] = doc.id
        tasks.append(task)

    # ─── Search ───
    search = request.args.get("search", "").strip().lower()
    if search:
        tasks = [t for t in tasks if search in t.get("title", "").lower() or search in t.get("description", "").lower()]

    # ─── Filter by priority ───
    priority = request.args.get("priority", "").strip().lower()
    if priority in ("low", "medium", "high"):
        tasks = [t for t in tasks if t.get("priority") == priority]

    # ─── Filter by status ───
    status = request.args.get("status", "").strip().lower()
    if status in ("pending", "completed"):
        tasks = [t for t in tasks if t.get("status") == status]

    # ─── Filter by date range ───
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    if date_from:
        tasks = [t for t in tasks if t.get("due_date") and t.get("due_date") >= date_from]
    if date_to:
        tasks = [t for t in tasks if t.get("due_date") and t.get("due_date") <= date_to]

    # ─── Sort ───
    sort = request.args.get("sort", "position").strip()
    descending = sort.startswith("-")
    sort_field = sort.lstrip("-")
    
    def get_sort_key(t):
        val = t.get(sort_field)
        if val is None:
            # Return appropriate empty value based on sort field to avoid comparison errors
            if sort_field in ("position",): return 0
            return ""
        return val

    tasks.sort(key=get_sort_key, reverse=descending)

    return jsonify({"tasks": tasks}), 200


@tasks_bp.route("", methods=["POST"])
@login_required
def create_task():
    """Create a new task."""
    data = request.get_json()

    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Task title is required"}), 400

    db = get_db()
    
    # Get max position (in-memory for simplicity since n is small)
    docs = db.collection("tasks").where(filter=FieldFilter("user_id", "==", current_user.id)).stream()
    max_pos = -1
    for doc in docs:
        pos = doc.to_dict().get("position", 0)
        if pos > max_pos:
            max_pos = pos

    task_data = {
        "user_id": current_user.id,
        "title": title,
        "description": data.get("description", "").strip(),
        "priority": data.get("priority", "medium").lower(),
        "status": "pending",
        "position": max_pos + 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "due_date": data.get("due_date") or None,
        "due_time": data.get("due_time") or None
    }

    # Validate dates (just format check, keeping them as strings)
    if task_data["due_date"]:
        try:
            datetime.fromisoformat(task_data["due_date"])
        except ValueError:
            return jsonify({"error": "Invalid due_date format"}), 400
            
    if task_data["due_time"]:
        try:
            datetime.strptime(task_data["due_time"], "%H:%M")
        except ValueError:
            return jsonify({"error": "Invalid due_time format"}), 400

    _, doc_ref = db.collection("tasks").add(task_data)
    task_data["id"] = doc_ref.id

    return jsonify({"message": "Task created", "task": task_data}), 201


@tasks_bp.route("/<task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    """Update an existing task."""
    db = get_db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    
    if not doc.exists or doc.to_dict().get("user_id") != current_user.id:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json()
    task = doc.to_dict()
    updates = {}

    if "title" in data:
        title = data["title"].strip()
        if not title:
            return jsonify({"error": "Task title cannot be empty"}), 400
        updates["title"] = title

    if "description" in data:
        updates["description"] = data["description"].strip()

    if "priority" in data and data["priority"].lower() in ("low", "medium", "high"):
        updates["priority"] = data["priority"].lower()

    if "status" in data and data["status"].lower() in ("pending", "completed"):
        old_status = task.get("status")
        new_status = data["status"].lower()
        updates["status"] = new_status
        if new_status == "completed" and old_status != "completed":
            updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        elif new_status == "pending":
            updates["completed_at"] = None

    if "due_date" in data:
        updates["due_date"] = data["due_date"] or None

    if "due_time" in data:
        updates["due_time"] = data["due_time"] or None

    if updates:
        doc_ref.update(updates)
        task.update(updates)
        
    task["id"] = doc.id
    return jsonify({"message": "Task updated", "task": task}), 200


@tasks_bp.route("/<task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    """Delete a task."""
    db = get_db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    
    if not doc.exists or doc.to_dict().get("user_id") != current_user.id:
        return jsonify({"error": "Task not found"}), 404

    doc_ref.delete()
    return jsonify({"message": "Task deleted"}), 200


@tasks_bp.route("/<task_id>/toggle", methods=["PATCH"])
@login_required
def toggle_task(task_id):
    """Toggle a task between pending and completed."""
    db = get_db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    
    if not doc.exists or doc.to_dict().get("user_id") != current_user.id:
        return jsonify({"error": "Task not found"}), 404

    task = doc.to_dict()
    updates = {}
    
    if task.get("status") == "completed":
        updates["status"] = "pending"
        updates["completed_at"] = None
    else:
        updates["status"] = "completed"
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()

    doc_ref.update(updates)
    task.update(updates)
    task["id"] = doc.id
    
    return jsonify({"message": "Task toggled", "task": task}), 200


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

    db = get_db()
    batch = db.batch()
    
    for position, task_id in enumerate(order):
        # Using integer cast is incorrect for task_id because it's a string in Firestore
        task_id = str(task_id)
        doc_ref = db.collection("tasks").document(task_id)
        batch.update(doc_ref, {"position": position})

    batch.commit()
    return jsonify({"message": "Tasks reordered"}), 200
