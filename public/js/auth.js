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
                    <label for="login-email">Email</label>
                    <input type="email" id="login-email" placeholder="Enter email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" placeholder="Enter password" required>
                </div>
                <div class="auth-error" id="login-error"></div>
                <button type="submit" class="btn btn-primary">Sign In</button>
            </form>
            <div class="auth-divider"><span>OR</span></div>
            <button id="google-login-btn" class="btn btn-secondary google-btn">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18">
                Continue with Google
            </button>
            <p class="auth-switch">Don't have an account? <a id="show-signup">Sign Up</a></p>
            <div id="auth-status" style="margin-top:20px; font-size:10px; opacity:0.5; text-align:center;">Checking status...</div>
        `;
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('google-login-btn').addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('show-signup').addEventListener('click', () => this.showSignup());
        this.updateStatus();
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
            <div class="auth-divider"><span>OR</span></div>
            <button id="google-signup-btn" class="btn btn-secondary google-btn">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18">
                Continue with Google
            </button>
            <p class="auth-switch">Already have an account? <a id="show-login">Sign In</a></p>
        `;
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('google-signup-btn').addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('show-login').addEventListener('click', () => this.showLogin());
    },

    async handleLogin(e) {
        e.preventDefault();
        const errEl = document.getElementById('login-error');
        errEl.textContent = '';
        try {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            await firebase.auth().signInWithEmailAndPassword(email, password);
            App.toast('Welcome back!', 'success');
        } catch (err) {
            errEl.textContent = err.message;
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        const errEl = document.getElementById('signup-error');
        errEl.textContent = '';
        try {
            const username = document.getElementById('signup-username').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: username });
            
            App.toast('Account created! Welcome, ' + username + '!', 'success');
        } catch (err) {
            errEl.textContent = err.message;
        }
    },

    async handleGoogleLogin() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            // Now using Popup again with the new COOP security headers in firebase.json
            await firebase.auth().signInWithPopup(provider);
            App.toast('Logged in with Google!', 'success');
        } catch (err) {
            console.error("Google Auth Error:", err);
            App.toast(err.message, 'error');
        }
    },

    updateStatus() {
        const el = document.getElementById('auth-status');
        if (!el) return;
        firebase.auth().onAuthStateChanged(user => {
            el.textContent = user ? `Logged in as: ${user.email}` : "Not logged in";
        });
    }
};
