    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm').value;
        const role = document.getElementById('role').value;
        const message = document.getElementById('message');
        const registerBtn = document.getElementById('registerBtn');

        if (!username || !password || !confirm || !role) {
            message.style.display = 'flex';
            message.className = 'alert alert-error';
            message.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please fill in all fields';
            return;
        }

        if (password !== confirm) {
            message.style.display = 'flex';
            message.className = 'alert alert-error';
            message.innerHTML = '<i class="fas fa-times-circle"></i> Passwords do not match';
            return;
        }

        if (password.length < 4) {
            message.style.display = 'flex';
            message.className = 'alert alert-error';
            message.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Password must be at least 4 characters';
            return;
        }

        registerBtn.innerHTML = '<span class="spinner-sm"></span> Creating account...';
        registerBtn.disabled = true;

        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                message.style.display = 'flex';
                message.className = 'alert alert-success';
                message.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;

                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                document.getElementById('confirm').value = '';
                document.getElementById('role').value = 'cashier';

                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            } else {
                message.style.display = 'flex';
                message.className = 'alert alert-error';
                message.innerHTML = '<i class="fas fa-times-circle"></i> ' + (data.error || 'Registration failed');

                registerBtn.innerHTML = 'Register User';
                registerBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            message.style.display = 'flex';
            message.className = 'alert alert-error';
            message.innerHTML = '<i class="fas fa-network-wired"></i> Network error. Please try again.';

            registerBtn.innerHTML = 'Register User';
            registerBtn.disabled = false;
        });
    });
