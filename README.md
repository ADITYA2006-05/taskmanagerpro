# TaskFlow — Smart Task Manager

A full-stack task manager with AI insights, voice commands, and a premium dark-mode UI.

## Features

- **Authentication**: Signup, login, logout with bcrypt password hashing
- **Task Management**: CRUD, drag-and-drop ordering, priority, due dates
- **Dashboard**: Stats, Chart.js charts, today's tasks
- **Calendar**: Monthly grid with task dots and day detail
- **AI Insights**: Productivity score, overdue risk, smart suggestions
- **Voice Commands**: Web Speech API — "add task X", "complete task X", "delete task X"
- **Dark/Light Mode**: Toggle with localStorage persistence
- **Responsive**: Full mobile support with sidebar drawer

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the server
python app.py

# 3. Open in browser
# http://localhost:5000
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask + SQLAlchemy |
| Database | SQLite |
| Auth | Flask-Login + bcrypt |
| Frontend | Vanilla HTML/CSS/JS |
| Charts | Chart.js |
| Drag & Drop | SortableJS |
| Voice | Web Speech API |

## Project Structure

```
├── app.py              # Flask app factory
├── requirements.txt    # Python deps
├── models/             # SQLAlchemy models
├── routes/             # API blueprints
├── static/css/         # Styles
├── static/js/          # Frontend modules
└── templates/          # HTML shell
```
