"""
Task Manager Web App — Flask Application Factory
"""

import os
from flask import Flask, send_from_directory, render_template
from extensions import db, login_manager, migrate


def create_app():
    """Create and configure the Flask application."""
    app = Flask(
        __name__,
        static_folder="static",
        template_folder="templates",
    )

    # ─── Configuration ───
    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", "task-manager-dev-secret-key-change-in-prod"
    )
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_url = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'instance', 'taskmanager.db')}")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Ensure instance directory exists
    os.makedirs(os.path.join(basedir, "instance"), exist_ok=True)

    # ─── Initialize extensions ───
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    # ─── User loader for Flask-Login ───
    from models.user import User

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # Return 401 JSON for unauthorized API requests
    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
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
    @app.route("/")
    @app.route("/<path:path>")
    def serve_spa(path=""):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return render_template("index.html")

    # ─── Create database tables on first run ───
    with app.app_context():
        import models  # noqa: F401
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
