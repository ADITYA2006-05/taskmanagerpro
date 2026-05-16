/**
 * ai.js — AI Insights Page
 * Displays productivity score, completion rate, overdue risks, and smart suggestions using client-side Firestore data.
 */

const AI = {
    async render(container) {
        container.innerHTML = `
            <div class="ai-header"><h2>🧠 AI Insights</h2><p>Smart analysis of your task patterns and productivity</p></div>
            <div class="ai-scores" id="ai-scores"></div>
            <div class="ai-section"><h3>💡 Suggested Tasks for Today</h3><div id="ai-suggestions"></div></div>
            <div class="ai-section"><h3>⚠️ Overdue Risk Analysis</h3><div id="ai-risks"></div></div>
        `;
        await this.loadInsights();
    },

    async loadInsights() {
        try {
            const tasks = await Firestore.getTasks();
            const today = new Date().toISOString().split('T')[0];
            
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const completion_pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            // Simple logic for on-time rate and productivity
            const on_time_rate = completion_pct; // Placeholder logic
            const productivity_score = completion_pct; // Placeholder logic
            const streak_days = 0; // Placeholder logic

            const scoreColor = (v) => v >= 70 ? 'score-good' : v >= 40 ? 'score-ok' : 'score-bad';

            document.getElementById('ai-scores').innerHTML = `
                <div class="ai-score-card">
                    <div class="score-circle ${scoreColor(productivity_score)}"><span>${productivity_score}</span></div>
                    <div class="score-label">Productivity Score</div>
                </div>
                <div class="ai-score-card">
                    <div class="score-circle ${scoreColor(completion_pct)}"><span>${completion_pct}%</span></div>
                    <div class="score-label">Completion Rate</div>
                </div>
                <div class="ai-score-card">
                    <div class="score-circle ${scoreColor(on_time_rate)}"><span>${on_time_rate}%</span></div>
                    <div class="score-label">On-Time Rate</div>
                </div>
                <div class="ai-score-card">
                    <div class="score-circle score-good"><span>${streak_days}</span></div>
                    <div class="score-label">Day Streak 🔥</div>
                </div>
            `;

            // Overdue Risks
            const risks = tasks.filter(t => t.status === 'pending' && t.due_date).map(t => {
                let label = 'Low Risk';
                let score = 20;
                let diff = (new Date(t.due_date) - new Date(today)) / (1000 * 60 * 60 * 24);
                
                if (diff < 0) { label = 'Overdue'; score = 100; }
                else if (diff === 0) { label = 'Due Today'; score = 90; }
                else if (diff <= 2) { label = 'High Risk'; score = 70; }
                
                return { task: t, risk_label: label, risk_score: score, days_diff: diff };
            }).sort((a,b) => b.risk_score - a.risk_score);

            const risksEl = document.getElementById('ai-risks');
            if (risks.length === 0) {
                risksEl.innerHTML = '<div class="empty-state"><h3>No at-risk tasks!</h3><p>Everything is on track 🎯</p></div>';
            } else {
                risksEl.innerHTML = risks.slice(0, 5).map(r => {
                    const color = r.risk_score >= 75 ? 'var(--danger)' : r.risk_score >= 40 ? 'var(--warning)' : 'var(--accent)';
                    return `
                    <div class="risk-item">
                        <div class="risk-bar"><div class="risk-bar-fill" style="width:${r.risk_score}%;background:${color}"></div></div>
                        <div class="task-body">
                            <div class="task-title">${this.esc(r.task.title)}</div>
                            <div class="task-meta"><span class="priority-badge ${r.task.priority}">${r.task.priority}</span><span>${r.risk_label}</span></div>
                        </div>
                        <span style="font-weight:700;color:${color}">${r.risk_score}%</span>
                    </div>`;
                }).join('');
            }

            // Suggestions
            const suggestions = tasks.filter(t => t.status === 'pending').map(t => {
                let score = 0;
                if (t.priority === 'high') score += 40;
                if (t.due_date === today) score += 50;
                return { task: t, score, reason: t.due_date === today ? 'Due today' : t.priority === 'high' ? 'High priority' : 'Important task' };
            }).sort((a,b) => b.score - a.score);

            const sugEl = document.getElementById('ai-suggestions');
            if (suggestions.length === 0) {
                sugEl.innerHTML = '<div class="empty-state"><h3>No pending tasks</h3><p>All caught up! 🎉</p></div>';
            } else {
                sugEl.innerHTML = suggestions.slice(0, 5).map(s => {
                    const color = s.score >= 50 ? 'var(--danger)' : s.score >= 30 ? 'var(--warning)' : 'var(--accent)';
                    return `
                    <div class="suggestion-item">
                        <div class="suggestion-score" style="background:${color}20;color:${color}">${s.score}</div>
                        <div class="suggestion-body">
                            <div class="suggestion-title">${this.esc(s.task.title)}</div>
                            <div class="suggestion-reason">${this.esc(s.reason)}</div>
                        </div>
                        <span class="priority-badge ${s.task.priority}">${s.task.priority}</span>
                    </div>`;
                }).join('');
            }

        } catch (err) {
            console.error('AI load error:', err);
        }
    },

    esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
};
