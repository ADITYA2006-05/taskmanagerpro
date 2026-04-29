"""
Task Model
==========
Stores individual tasks belonging to a user.
Includes priority, status, due date/time, and position for drag-and-drop ordering.
"""

from datetime import datetime, timezone
from extensions import db


class Task(db.Model):
    """A single task belonging to a user."""
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    due_time = db.Column(db.Time, nullable=True)
    priority = db.Column(db.String(10), nullable=False, default="medium")  # low, medium, high
    status = db.Column(db.String(20), nullable=False, default="pending")   # pending, completed
    position = db.Column(db.Integer, nullable=False, default=0)            # for drag-and-drop ordering
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        """Serialize task to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description or "",
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "due_time": self.due_time.strftime("%H:%M") if self.due_time else None,
            "priority": self.priority,
            "status": self.status,
            "position": self.position,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def __repr__(self):
        return f"<Task {self.title[:30]}>"
