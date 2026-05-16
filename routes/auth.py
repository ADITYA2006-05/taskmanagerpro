"""
Authentication Routes
=====================
Only returns the current authenticated user via Firebase token.
"""

from flask import Blueprint, jsonify
from flask_login import login_required, current_user

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    """Return the currently authenticated user's profile."""
    return jsonify({
        "message": "User profile",
        "user": current_user.to_dict(),
    }), 200
