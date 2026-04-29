/**
 * app.js — Core SPA Logic
 * Handles navigation, theme toggle, auth state, toasts, and initialization.
 */

const App = {
    currentPage: 'dashboard',
    user: null,

    /** Initialize the application */
    async init() {
        this.bindEvents();
        this.loadTheme();
        await this.checkAuth();
    },

    /** Bind global event listeners */
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(item.dataset.page);
            });
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Mobile menu
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
        document.getElementById('sidebar-close-btn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Search
        let searchTimeout;
        document.getElementById('search-input').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (this.currentPage === 'tasks') Tasks.loadTasks();
            }, 300);
        });
    },

    /** Check if user is authenticated */
    async checkAuth() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                this.user = data.user;
                this.showApp();
            } else {
                this.showAuth();
            }
        } catch {
            this.showAuth();
        }
    },

    /** Show the auth screens */
    showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        Auth.showLogin();
    },

    /** Show the main app */
    showApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        // Update user info in sidebar
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');
        if (this.user) {
            avatar.textContent = this.user.username.charAt(0).toUpperCase();
            name.textContent = this.user.username;
        }

        this.navigate('dashboard');
        this.checkDueNotifications();
    },

    /** Navigate to a page */
    navigate(page) {
        this.currentPage = page;

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update title
        const titles = { dashboard: 'Dashboard', tasks: 'Tasks', calendar: 'Calendar', ai: 'AI Insights' };
        document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

        // Show/hide search
        const searchBox = document.getElementById('search-box');
        searchBox.style.display = page === 'tasks' ? 'flex' : 'none';

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');

        // Render page
        const content = document.getElementById('page-content');
        switch (page) {
            case 'dashboard': Dashboard.render(content); break;
            case 'tasks': Tasks.render(content); break;
            case 'calendar': Calendar.render(content); break;
            case 'ai': AI.render(content); break;
        }
    },

    /** Logout */
    async logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        this.user = null;
        this.showAuth();
        App.toast('Logged out', 'info');
    },

    /** Toggle dark/light theme */
    toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    },

    /** Load saved theme */
    loadTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    },

    /** Show a toast notification */
    toast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-msg">${message}</span>
            <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /** Check for tasks due today and notify */
    async checkDueNotifications() {
        try {
            const res = await fetch('/api/dashboard/stats');
            if (!res.ok) return;
            const data = await res.json();
            if (data.todays_count > 0) {
                this.toast(`You have ${data.todays_count} task(s) due today!`, 'warning', 6000);
            }
            if (data.overdue > 0) {
                this.toast(`${data.overdue} task(s) are overdue!`, 'error', 6000);
            }
        } catch {}
    },

    /** API helper */
    async api(url, options = {}) {
        const defaults = { headers: { 'Content-Type': 'application/json' } };
        const res = await fetch(url, { ...defaults, ...options });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
