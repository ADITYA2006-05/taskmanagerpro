"""
Task Manager Web App — Flask Application Factory
"""

import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, firestore

# Load environment variables from .env file
load_dotenv()

login_manager = LoginManager()

# Simple User class for Flask-Login
class User:
    def __init__(self, uid, email):
        self.id = uid
        self.email = email
        self.is_active = True
        self.is_authenticated = True
        
    def to_dict(self):
        return {"id": self.id, "email": self.email}

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__, static_folder="public", static_url_path="/")
    CORS(app)  # Enable CORS for all routes

    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", "task-manager-dev-secret-key-change-in-prod"
    )

    login_manager.init_app(app)
    
    # ─── Initialize Firebase Admin ───
    if not firebase_admin._apps:
        try:
            # Explicitly pass the projectId so it works in environments without default credentials
            project_id = os.environ.get("FIREBASE_PROJECT_ID")
            if project_id:
                firebase_admin.initialize_app(options={'projectId': project_id})
            else:
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"Failed to initialize Firebase Admin: {e}")

    # Make Firestore client available globally or attach to app
    app.db = firestore.client()

    # ─── User loader for Flask-Login (via Firebase Token) ───
    @login_manager.request_loader
    def load_user_from_request(request):
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token.get('uid')
                email = decoded_token.get('email')
                return User(uid, email)
            except Exception as e:
                # Token invalid or expired
                return None
        return None

    # Return 401 JSON for unauthorized API requests
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Authentication required"}), 401

    # ─── Register blueprints ───
    from routes.auth import auth_bp
    from routes.tasks import tasks_bp
    from routes.dashboard import dashboard_bp
    from routes.ai import ai_bp
    from routes.calendar_view import calendar_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(calendar_bp, url_prefix="/api/calendar")

    # ─── Serve the SPA shell for all non-API routes ───
    from flask import send_from_directory
    @app.route("/")
    @app.route("/<path:path>")
    def serve_spa(path=""):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    return app

# Create global app instance for serverless deployments
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
