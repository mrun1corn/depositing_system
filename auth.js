
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const passwordInput = document.getElementById('password');
    const loginButton = document.querySelector('.login-button');

    const handleLogin = async () => {
        errorMessage.textContent = ''; // Clear previous error messages
        const username = document.getElementById('username').value;
        const password = passwordInput.value;

        loginButton.disabled = true;
        loginButton.classList.add('loading');
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing In...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                errorMessage.textContent = 'Invalid username or password';
                return;
            }

            const { token } = await response.json();
            
            // Decode the token to get user payload
            const payload = JSON.parse(atob(token.split('.')[1]));

            // Store the token and user info in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('loggedInUser', JSON.stringify({ username: payload.username, role: payload.role }));

            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Error connecting to the server.';
        } finally {
            loginButton.disabled = false;
            loginButton.classList.remove('loading');
            loginButton.innerHTML = 'Sign In';
        }
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });
});
