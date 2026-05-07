    // ===== SIMPLE LOGIN SCRIPT =====
    // This script handles the login form submission and other functions
    
    // Wait for page to load
    document.addEventListener('DOMContentLoaded', function() {
        
        // ===== GET ALL HTML ELEMENTS =====
        const loginForm = document.getElementById('loginForm');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorAlert = document.getElementById('errorAlert');
        const successAlert = document.getElementById('successAlert');
        const loginBtn = document.getElementById('loginBtn');
        
        // ===== HELPER FUNCTIONS =====
        
        // Hide all alert messages
        function hideAlerts() {
            if (errorAlert) errorAlert.style.display = 'none';
            if (successAlert) successAlert.style.display = 'none';
        }

        // Show error message in red box
        function showError(message) {
            if (errorAlert) {
                errorAlert.textContent = message;
                errorAlert.style.display = 'block';
                successAlert.style.display = 'none';
                
                // Auto hide after 3 seconds
                setTimeout(() => {
                    errorAlert.style.display = 'none';
                }, 3000);
            }
        }

        // Show success message in green box
        function showSuccess(message) {
            if (successAlert) {
                successAlert.textContent = message;
                successAlert.style.display = 'block';
                errorAlert.style.display = 'none';
            }
        }

        // Show loading spinner on button
        function setLoading(isLoading) {
            if (isLoading) {
                loginBtn.innerHTML = '<span class="spinner-sm"></span> Logging in...';
                loginBtn.disabled = true;
                usernameInput.disabled = true;
                passwordInput.disabled = true;
            } else {
                loginBtn.innerHTML = 'Login';
                loginBtn.disabled = false;
                usernameInput.disabled = false;
                passwordInput.disabled = false;
            }
        }

        // ===== LOGIN FORM SUBMIT HANDLER =====
        loginForm.addEventListener('submit', async function(e) {
            // Stop form from submitting normally
            e.preventDefault();
            
            // Hide old alerts
            hideAlerts();
            
            // Get form values
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            // Check if fields are empty
            if (!username || !password) {
                showError('Please fill in all fields');
                return;
            }
            
            // Show loading state
            setLoading(true);
            
            try {
                // Send login request to server
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                // Get response from server
                const data = await response.json();
                
                // Check if login successful
                if (response.ok && data.success) {
                    showSuccess('Login successful! Redirecting...');
                    
                    // Redirect to dashboard after 1 second
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    // Show error message
                    showError(data.error || 'Invalid username or password');
                    setLoading(false);
                    
                    // Clear password field and focus
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (error) {
                // Show network error
                showError('Network error. Please try again.');
                setLoading(false);
            }
        });

        // ===== CHECK IF USER IS ALREADY LOGGED IN =====
        async function checkAuth() {
            try {
                const response = await fetch('/api/check-auth');
                const data = await response.json();
                
                // If already logged in, go to dashboard
                if (data.authenticated) {
                    showSuccess('Already logged in! Redirecting...');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                }
            } catch (error) {
                console.log('Auth check failed');
            }
        }

        // ===== KEYBOARD SHORTCUTS FOR DEMO =====
        document.addEventListener('keydown', function(e) {
            // Press Ctrl+1 to fill admin credentials
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                usernameInput.value = 'admin';
                passwordInput.value = 'admin123';
                showSuccess('✓ Admin credentials loaded');
            }
            // Press Ctrl+2 to fill cashier credentials
            if (e.ctrlKey && e.key === '2') {
                e.preventDefault();
                usernameInput.value = 'cashier';
                passwordInput.value = 'cashier123';
                showSuccess('✓ Cashier credentials loaded');
            }
        });

        // ===== HIDE ALERTS WHEN USER STARTS TYPING =====
        usernameInput.addEventListener('input', hideAlerts);
        passwordInput.addEventListener('input', hideAlerts);
        
        // ===== AUTO FOCUS ON USERNAME FIELD =====
        usernameInput.focus();
        
        // ===== CHECK AUTH STATUS ON PAGE LOAD =====
        checkAuth();
        
        console.log('✅ Login script loaded successfully');
    });
