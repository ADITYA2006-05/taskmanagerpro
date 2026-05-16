/**
 * dashboard.js — Dashboard Page
 * Renders stat cards, charts, and today's tasks using client-side Firestore data.
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
    },

    async loadStats() {
        try {
            const tasks = await Firestore.getTasks();
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const pending = total - completed;
            const completion_pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            const todayStr = new Date().toISOString().split('T')[0];
            const todaysTasks = tasks.filter(t => t.due_date === todayStr);
            const overdue = tasks.filter(t => t.due_date && t.due_date < todayStr && t.status === 'pending').length;

            const grid = document.getElementById('stats-grid');
            grid.innerHTML = `
                <div class="stat-card total">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value">${total}</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-card completed">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card pending">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-value">${pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card overdue">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-value">${overdue}</div>
                    <div class="stat-label">Overdue</div>
                </div>
                <div class="stat-card pct">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${completion_pct}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-card today">
                    <div class="stat-icon">📅</div>
                    <div class="stat-value">${todaysTasks.length}</div>
                    <div class="stat-label">Due Today</div>
                </div>
            `;

            const todayEl = document.getElementById('today-tasks');
            if (todaysTasks.length === 0) {
                todayEl.innerHTML = '<div class="empty-state"><h3>No tasks due today</h3><p>Enjoy your free time! 🎉</p></div>';
            } else {
                todayEl.innerHTML = todaysTasks.map(t => this.taskMini(t)).join('');
            }

            await this.renderCharts(tasks);
        } catch (err) {
            console.error('Dashboard stats error:', err);
        }
    },

    async renderCharts(tasks) {
        // Destroy old charts
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};

        const style = getComputedStyle(document.documentElement);
        const primary = style.getPropertyValue('--primary').trim() || '#7c5cfc';
        const accent = style.getPropertyValue('--accent').trim() || '#00d4aa';
        const text3 = style.getPropertyValue('--text3').trim() || '#6c6c88';

        // Weekly chart (Dummy labels for now or calculate actual week)
        const weeklyCtx = document.getElementById('weekly-chart');
        if (weeklyCtx) {
            this.charts.weekly = new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                        { label: 'Completed', data: [0,0,0,0,0,0,0], backgroundColor: accent, borderRadius: 6 },
                        { label: 'Pending', data: [0,0,0,0,0,0,0], backgroundColor: primary, borderRadius: 6 }
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
        const counts = { high: 0, medium: 0, low: 0 };
        tasks.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });

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
