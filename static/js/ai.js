/**
 * ai.js — AI Insights Page
 * Displays productivity score, completion rate, overdue risks, and smart suggestions.
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
        await this.loadSuggestions();
    },

    async loadInsights() {
        try {
            const data = await App.api('/api/ai/insights');
            const scoreColor = (v) => v >= 70 ? 'score-good' : v >= 40 ? 'score-ok' : 'score-bad';

            document.getElementById('ai-scores').innerHTML = `
                <div class="ai-score-card">
                    <div class="score-circle ${scoreColor(data.productivity_score)}">
                        <span>${data.productivity_score}</span>
                    </div>
                    <div class="score-label">Productivity Score</div>
                </div>
                <div class="ai-score-card">
                    <div class="score-circle ${scoreColor(data.completion_pct)}">
                        <span>${data.completion_pct}%</span>
                    </div>
                    <div class="score-label">Completion Rate</div>
                </div>
                <div class="ai-score-card">
                    <div class="score-circle ${scoreColor(data.on_time_rate)}">
                        <span>${data.on_time_rate}%</span>
                    </div>
                    <div class="score-label">On-Time Rate</div>
                </div>
                <div class="ai-score-card">
                    <div class="score-circle score-good">
                        <span>${data.streak_days}</span>
                    </div>
                    <div class="score-label">Day Streak 🔥</div>
                </div>
            `;

            // Risks
            const risksEl = document.getElementById('ai-risks');
            if (data.overdue_risks.length === 0) {
                risksEl.innerHTML = '<div class="empty-state"><h3>No at-risk tasks!</h3><p>Everything is on track 🎯</p></div>';
            } else {
                risksEl.innerHTML = data.overdue_risks.map(r => {
                    const color = r.risk_score >= 75 ? 'var(--danger)' : r.risk_score >= 40 ? 'var(--warning)' : 'var(--accent)';
                    return `
                    <div class="risk-item">
                        <div class="risk-bar"><div class="risk-bar-fill" style="width:${r.risk_score}%;background:${color}"></div></div>
                        <div class="task-body">
                            <div class="task-title">${this.esc(r.task.title)}</div>
                            <div class="task-meta"><span class="priority-badge ${r.task.priority}">${r.task.priority}</span><span>${r.risk_label}</span><span>${r.days_until_due < 0 ? Math.abs(r.days_until_due) + 'd overdue' : r.days_until_due + 'd left'}</span></div>
                        </div>
                        <span style="font-weight:700;color:${color}">${r.risk_score}%</span>
                    </div>`;
                }).join('');
            }
        } catch (err) { App.toast(err.message, 'error'); }
    },

    async loadSuggestions() {
        try {
            const data = await App.api('/api/ai/suggestions');
            const el = document.getElementById('ai-suggestions');
            if (data.suggestions.length === 0) {
                el.innerHTML = '<div class="empty-state"><h3>No pending tasks</h3><p>All caught up! 🎉</p></div>';
                return;
            }
            el.innerHTML = data.suggestions.map(s => {
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
        } catch (err) { console.error(err); }
    },

    esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
};
