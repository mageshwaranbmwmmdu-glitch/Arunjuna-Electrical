// admin/auth.js

// This function is called by the Google Sign-In script
async function handleGoogleSignInForAdmin(response) {
    const googleToken = response.credential;
    const loginMessage = document.getElementById('login-message');
    const API_URL = 'http://localhost:3000/api';

    try {
        const res = await fetch(`${API_URL}/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Decode JWT safely
        let decodedAppToken;
        try {
            decodedAppToken = JSON.parse(atob(data.token.split('.')[1]));
        } catch (err) {
            throw new Error('Invalid token received from server');
        }

        // IMPORTANT: Check if the user has the 'admin' role
        if (decodedAppToken.role !== 'admin') {
            throw new Error('Access denied. You do not have admin privileges.');
        }

        // If login is successful and user is an admin, store the token
        localStorage.setItem('admin-token', data.token);

        // Redirect to the main admin dashboard
        window.location.href = '/admin/index.html';

    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.color = 'red';
        console.error('Admin Login Error:', error);
    }
}
