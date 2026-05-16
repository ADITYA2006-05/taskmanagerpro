/**
 * app.js — Core SPA Logic
 * Handles navigation, theme toggle, auth state, toasts, and initialization.
 */

const App = {
    currentPage: 'dashboard',
    user: null,

    /** Initialize the application */
    init() {
        this.bindEvents();
        this.loadTheme();
        this.setupFirebaseAuth();
    },

    /** Listen to Firebase Auth state changes */
    async setupFirebaseAuth() {
        console.log("Initializing Auth...");
        
        // Handle the result of a redirect sign-in
        try {
            const result = await firebase.auth().getRedirectResult();
            if (result.user) {
                console.log("Redirect login successful:", result.user.email);
            }
        } catch (err) {
            console.error("Auth redirect error:", err);
            this.toast("Login failed: " + err.message, 'error');
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            console.log("Auth state changed. User:", user ? user.email : "null");
            if (user) {
                this.user = { 
                    id: user.uid, 
                    email: user.email, 
                    username: user.displayName || user.email.split('@')[0] 
                };
                this.showApp();
            } else {
                this.user = null;
                this.showAuth();
            }
        });
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

    /** Show the auth screens */
    showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        Auth.showLogin();
    },

    /** Show the main app */
    showApp() {
        console.log("Showing App UI...");
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        // Update user info in sidebar
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');
        
        const displayName = this.user?.username || firebase.auth().currentUser?.displayName || 'User';
        
        if (avatar) avatar.textContent = displayName.charAt(0).toUpperCase();
        if (name) name.textContent = displayName;

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
        await firebase.auth().signOut();
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
            const tasks = await Firestore.getTasks();
            const today = new Date().toISOString().split('T')[0];
            const todaysCount = tasks.filter(t => t.due_date === today).length;
            const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status === 'pending').length;

            if (todaysCount > 0) {
                this.toast(`You have ${todaysCount} task(s) due today!`, 'warning', 6000);
            }
            if (overdue > 0) {
                this.toast(`${overdue} task(s) are overdue!`, 'error', 6000);
            }
        } catch (err) {
            console.error("Notification check failed", err);
        }
    },

    /** API helper */
    async api(url, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        
        // Add Firebase ID Token if user is logged in
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            const token = await currentUser.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
        }

        const defaults = { headers };
        const res = await fetch(url, { ...defaults, ...options });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
