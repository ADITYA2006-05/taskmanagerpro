/**
 * auth.js — Login & Signup Forms
 */

const Auth = {
    showLogin() {
        const card = document.getElementById('auth-card');
        card.innerHTML = `
            <h2>Welcome Back</h2>
            <p class="subtitle">Sign in to manage your tasks</p>
            <form class="auth-form" id="login-form">
                <div class="form-group">
                    <label for="login-username">Username or Email</label>
                    <input type="text" id="login-username" placeholder="Enter username or email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" placeholder="Enter password" required>
                </div>
                <div class="auth-error" id="login-error"></div>
                <button type="submit" class="btn btn-primary">Sign In</button>
            </form>
            <p class="auth-switch">Don't have an account? <a id="show-signup">Sign Up</a></p>
        `;
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('show-signup').addEventListener('click', () => this.showSignup());
    },

    showSignup() {
        const card = document.getElementById('auth-card');
        card.innerHTML = `
            <h2>Create Account</h2>
            <p class="subtitle">Start organizing your tasks today</p>
            <form class="auth-form" id="signup-form">
                <div class="form-group">
                    <label for="signup-username">Username</label>
                    <input type="text" id="signup-username" placeholder="Choose a username" required>
                </div>
                <div class="form-group">
                    <label for="signup-email">Email</label>
                    <input type="email" id="signup-email" placeholder="Enter your email" required>
                </div>
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" placeholder="Min 6 characters" required minlength="6">
                </div>
                <div class="auth-error" id="signup-error"></div>
                <button type="submit" class="btn btn-primary">Create Account</button>
            </form>
            <p class="auth-switch">Already have an account? <a id="show-login">Sign In</a></p>
        `;
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('show-login').addEventListener('click', () => this.showLogin());
    },

    async handleLogin(e) {
        e.preventDefault();
        const errEl = document.getElementById('login-error');
        errEl.textContent = '';
        try {
            const data = await App.api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: document.getElementById('login-username').value.trim(),
                    password: document.getElementById('login-password').value
                })
            });
            App.user = data.user;
            App.showApp();
            App.toast('Welcome back, ' + data.user.username + '!', 'success');
        } catch (err) {
            errEl.textContent = err.message;
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        const errEl = document.getElementById('signup-error');
        errEl.textContent = '';
        try {
            const data = await App.api('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({
                    username: document.getElementById('signup-username').value.trim(),
                    email: document.getElementById('signup-email').value.trim(),
                    password: document.getElementById('signup-password').value
                })
            });
            App.user = data.user;
            App.showApp();
            App.toast('Account created! Welcome, ' + data.user.username + '!', 'success');
        } catch (err) {
            errEl.textContent = err.message;
        }
    }
};
