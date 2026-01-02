const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const API_URL = 'http://localhost:8000'; 

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('role').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_role', data.role);
                localStorage.setItem('user_name', data.username);
                localStorage.setItem('user_email', data.email);

                window.location.href = 'dashboard.html';
            } else {
                showError(data.detail || 'Login failed');
            }
        } catch (err) {
            showError('Network error. Ensure backend is running.');
            console.error(err);
        }
    });
}

function showError(msg) {
    if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    } else {
        alert(msg);
    }
}

function requireAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Global Navbar Management
function initNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    
    let navLinks = `
        <a href="index.html">Home</a>
        <a href="verify.html">Verify</a>
    `;

    if (token) {
        if (role === 'institution') {
            navLinks += `<a href="issue.html">Issue</a>`;
        }
        navLinks += `<a href="dashboard.html">Dashboard</a>`;
    }

    const authHtml = token 
        ? `<button onclick="logout()" class="btn btn-outline" style="margin-left: 10px; padding: 5px 15px;">Logout</button>`
        : `<a href="login.html" class="btn btn-primary" style="margin-left: 10px; padding: 5px 15px;">Sign In</a>`;

    nav.innerHTML = `
        <div class="logo">BlockCert</div>
        <div class="nav-links">
            ${navLinks}
            ${authHtml}
            <button id="themeToggle" class="theme-toggle" style="margin-left: 10px;">🌙</button>
        </div>
    `;

    // Re-attach theme toggle listener if it exists on the new button
    const themeBtn = nav.querySelector('#themeToggle');
    if (themeBtn && typeof toggleTheme === 'function') {
        themeBtn.onclick = toggleTheme;
    }
}

// Auto-init navbar on DOM load
document.addEventListener('DOMContentLoaded', initNavbar);
