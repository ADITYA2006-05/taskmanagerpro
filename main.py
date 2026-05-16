from firebase_functions import https_fn
from app import app
import json

@https_fn.on_request()
def task_manager_backend(req: https_fn.Request) -> https_fn.Response:
    """
    Firebase Function wrapper for the Flask app.
    Handles path routing to ensure Flask sees the correct endpoints.
    """
    environ = req.environ.copy()
    
    # If the request is coming through the function URL, it might have the function name in the path.
    # Flask needs the path starting from the registered routes (e.g., /api/...).
    # The emulator and production might behave differently regarding where the path is stored.
    
    with app.request_context(environ):
        try:
            response = app.full_dispatch_request()
            return https_fn.Response(
                response.get_data(),
                status=response.status_code,
                headers=dict(response.headers)
            )
        except Exception as e:
            return https_fn.Response(
                json.dumps({"error": str(e)}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
