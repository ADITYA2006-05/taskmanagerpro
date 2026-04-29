"""
User Model
==========
Stores user credentials and profile info.
Passwords are hashed with bcrypt for security.
"""

from datetime import datetime, timezone
import bcrypt
from flask_login import UserMixin
from extensions import db


class User(UserMixin, db.Model):
    """Application user with authentication support."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship: one user has many tasks
    tasks = db.relationship("Task", backref="owner", lazy="dynamic", cascade="all, delete-orphan")

    def set_password(self, password):
        """Hash and store the user's password."""
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, password):
        """Verify a password against the stored hash."""
        return bcrypt.checkpw(
            password.encode("utf-8"),
            self.password_hash.encode("utf-8"),
        )

    def to_dict(self):
        """Serialize user to dictionary (excludes password)."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User {self.username}>"
