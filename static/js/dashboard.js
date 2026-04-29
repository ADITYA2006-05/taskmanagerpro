/**
 * dashboard.js — Dashboard Page
 * Renders stat cards, charts, and today's tasks.
 */

const Dashboard = {
    charts: {},

    async render(container) {
        container.innerHTML = `
            <div class="stats-grid" id="stats-grid"></div>
            <div class="charts-grid" id="charts-grid">
                <div class="chart-card"><h3>Weekly Progress</h3><canvas id="weekly-chart"></canvas></div>
                <div class="chart-card"><h3>Priority Distribution</h3><canvas id="priority-chart"></canvas></div>
            </div>
            <div class="today-section">
                <h3>📋 Today's Tasks</h3>
                <div id="today-tasks" class="task-list"></div>
            </div>
        `;
        await this.loadStats();
        await this.loadWeekly();
    },

    async loadStats() {
        try {
            const data = await App.api('/api/dashboard/stats');
            const grid = document.getElementById('stats-grid');
            grid.innerHTML = `
                <div class="stat-card total">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value">${data.total}</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-card completed">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${data.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card pending">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-value">${data.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card overdue">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-value">${data.overdue}</div>
                    <div class="stat-label">Overdue</div>
                </div>
                <div class="stat-card pct">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${data.completion_pct}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-card today">
                    <div class="stat-icon">📅</div>
                    <div class="stat-value">${data.todays_count}</div>
                    <div class="stat-label">Due Today</div>
                </div>
            `;

            // Render today's tasks
            const todayEl = document.getElementById('today-tasks');
            if (data.todays_tasks.length === 0) {
                todayEl.innerHTML = '<div class="empty-state"><h3>No tasks due today</h3><p>Enjoy your free time! 🎉</p></div>';
            } else {
                todayEl.innerHTML = data.todays_tasks.map(t => this.taskMini(t)).join('');
            }
        } catch (err) {
            console.error('Dashboard stats error:', err);
        }
    },

    async loadWeekly() {
        try {
            const data = await App.api('/api/dashboard/weekly');
            const labels = data.days.map(d => d.day_name);
            const completed = data.days.map(d => d.completed);
            const pending = data.days.map(d => d.pending);

            // Destroy old charts
            Object.values(this.charts).forEach(c => c.destroy());
            this.charts = {};

            const style = getComputedStyle(document.documentElement);
            const primary = style.getPropertyValue('--primary').trim() || '#7c5cfc';
            const accent = style.getPropertyValue('--accent').trim() || '#00d4aa';
            const text3 = style.getPropertyValue('--text3').trim() || '#6c6c88';

            const weeklyCtx = document.getElementById('weekly-chart');
            if (weeklyCtx) {
                this.charts.weekly = new Chart(weeklyCtx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [
                            { label: 'Completed', data: completed, backgroundColor: accent, borderRadius: 6 },
                            { label: 'Pending', data: pending, backgroundColor: primary, borderRadius: 6 }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { color: text3 } } },
                        scales: {
                            x: { ticks: { color: text3 }, grid: { display: false } },
                            y: { ticks: { color: text3, stepSize: 1 }, grid: { color: 'rgba(255,255,255,.05)' } }
                        }
                    }
                });
            }

            // Priority chart
            const allTasks = await App.api('/api/tasks');
            const counts = { high: 0, medium: 0, low: 0 };
            allTasks.tasks.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });

            const prioCtx = document.getElementById('priority-chart');
            if (prioCtx) {
                this.charts.priority = new Chart(prioCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['High', 'Medium', 'Low'],
                        datasets: [{
                            data: [counts.high, counts.medium, counts.low],
                            backgroundColor: ['#ff4d6a', '#ffb84d', '#00d4aa'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { color: text3 }, position: 'bottom' } },
                        cutout: '65%'
                    }
                });
            }
        } catch (err) {
            console.error('Weekly chart error:', err);
        }
    },

    taskMini(task) {
        const statusClass = task.status === 'completed' ? 'completed' : '';
        return `
            <div class="task-item ${statusClass}" style="padding:12px 16px">
                <span class="priority-badge ${task.priority}">${task.priority}</span>
                <div class="task-body">
                    <div class="task-title">${this.esc(task.title)}</div>
                    <div class="task-meta">
                        ${task.due_time ? `<span>🕐 ${task.due_time}</span>` : ''}
                    </div>
                </div>
                <span style="font-size:.8rem;color:var(--text3)">${task.status}</span>
            </div>
        `;
    },

    esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};
