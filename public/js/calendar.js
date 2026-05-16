/**
 * calendar.js — Calendar Page
 * Monthly calendar grid with task dots and day detail view.
 */

const Calendar = {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    tasksByDate: {},

    async render(container) {
        container.innerHTML = `
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button class="btn-icon" id="cal-prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                    <h2 id="cal-title"></h2>
                    <button class="btn-icon" id="cal-next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
                </div>
                <button class="btn btn-secondary btn-sm" id="cal-today">Today</button>
            </div>
            <div class="calendar-grid" id="cal-grid"></div>
            <div id="day-detail"></div>
        `;
        document.getElementById('cal-prev').addEventListener('click', () => { this.month--; if (this.month < 1) { this.month = 12; this.year--; } this.loadTasks(); });
        document.getElementById('cal-next').addEventListener('click', () => { this.month++; if (this.month > 12) { this.month = 1; this.year++; } this.loadTasks(); });
        document.getElementById('cal-today').addEventListener('click', () => { this.month = new Date().getMonth() + 1; this.year = new Date().getFullYear(); this.loadTasks(); });
        await this.loadTasks();
    },

    async loadTasks() {
        try {
            const firstDay = new Date(this.year, this.month - 1, 1);
            const lastDay = new Date(this.year, this.month, 0);
            const firstStr = firstDay.toISOString().split('T')[0];
            const lastStr = lastDay.toISOString().split('T')[0];

            const allTasks = await Firestore.getTasks();
            const filtered = allTasks.filter(t => t.due_date && t.due_date >= firstStr && t.due_date <= lastStr);
            
            this.tasksByDate = {};
            filtered.forEach(t => {
                if (!this.tasksByDate[t.due_date]) this.tasksByDate[t.due_date] = [];
                this.tasksByDate[t.due_date].push(t);
            });

            document.getElementById('cal-title').textContent = `${new Date(this.year, this.month - 1).toLocaleString('default', { month: 'long' })} ${this.year}`;
            this.renderGrid();
        } catch (err) {
            console.error('Calendar load error:', err);
        }
    },

    renderGrid() {
        const grid = document.getElementById('cal-grid');
        const today = new Date().toISOString().split('T')[0];
        const daysInMonth = new Date(this.year, this.month, 0).getDate();
        const firstDayWeekday = (new Date(this.year, this.month - 1, 1).getDay() + 6) % 7;

        // Day headers
        let html = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(n => `<div class="calendar-day-header">${n}</div>`).join('');

        // Empty cells before first day
        const offset = d.first_day_weekday; // 0=Mon
        for (let i = 0; i < offset; i++) html += `<div class="calendar-day other-month"></div>`;

        // Days
        for (let day = 1; day <= d.days_in_month; day++) {
            const dateStr = `${d.year}-${String(d.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = dateStr === today;
            const tasks = d.tasks_by_date[dateStr] || [];
            const dots = tasks.slice(0, 4).map(t =>
                `<div class="calendar-dot ${t.status === 'completed' ? 'completed' : t.priority}"></div>`
            ).join('');
            const extra = tasks.length > 4 ? `<div style="font-size:.7rem;color:var(--text3)">+${tasks.length - 4} more</div>` : '';

            html += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                <div class="day-num">${day}</div>
                <div class="day-tasks">${dots}${extra}</div>
            </div>`;
        }

        grid.innerHTML = html;
        grid.querySelectorAll('.calendar-day[data-date]').forEach(el => {
            el.addEventListener('click', () => this.showDayDetail(el.dataset.date));
        });
    },

    showDayDetail(dateStr) {
        const detail = document.getElementById('day-detail');
        const tasks = this.data.tasks_by_date[dateStr] || [];
        const formatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        if (tasks.length === 0) {
            detail.innerHTML = `<div class="day-detail"><h3>${formatted}</h3><p style="color:var(--text3);margin-top:8px">No tasks scheduled</p></div>`;
            return;
        }

        const esc = (s) => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
        const taskItems = tasks.map(t => `
            <div class="task-item ${t.status === 'completed' ? 'completed' : ''}" style="padding:10px 14px;margin-top:6px">
                <span class="priority-badge ${t.priority}">${t.priority}</span>
                <div class="task-body">
                    <div class="task-title">${esc(t.title)}</div>
                    ${t.due_time ? `<div class="task-meta"><span>🕐 ${t.due_time}</span></div>` : ''}
                </div>
                <span style="font-size:.8rem;color:${t.status === 'completed' ? 'var(--accent)' : 'var(--warning)'}">${t.status}</span>
            </div>
        `).join('');

        detail.innerHTML = `<div class="day-detail"><h3>📅 ${formatted}</h3>${taskItems}</div>`;
    }
};
