    // Activate Bootstrap tabs
    (function() {
        var triggerTabList = [].slice.call(document.querySelectorAll('#settings-tabs a'));
        triggerTabList.forEach(function(triggerEl) {
            new bootstrap.Tab(triggerEl);
        });
    })();

    // Toggle Password Visibility Function
    window.togglePassword = function(inputId, iconId) {
        var passwordInput = document.getElementById(inputId);
        var toggleIcon = document.getElementById(iconId);
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleIcon.classList.remove("fa-eye");
            toggleIcon.classList.add("fa-eye-slash");
        } else {
            passwordInput.type = "password";
            toggleIcon.classList.remove("fa-eye-slash");
            toggleIcon.classList.add("fa-eye");
        }
    };

    // REAL-TIME THEME CHANGE
    (function() {
        var themeSelect = document.getElementById('themeSelect');
        var previewMsg = document.getElementById('themePreviewMsg');
        
        if (themeSelect) {
            themeSelect.addEventListener('change', function() {
                var newTheme = this.value;
                
                if (newTheme === 'dark') {
                    document.body.classList.add('dark-mode');
                    if (previewMsg) {
                        previewMsg.innerHTML = '<i class="fas fa-moon me-1"></i> Dark mode activated! Click Save to keep this setting.';
                        previewMsg.style.color = '#a5b4fc';
                    }
                } else {
                    document.body.classList.remove('dark-mode');
                    if (previewMsg) {
                        previewMsg.innerHTML = '<i class="fas fa-sun me-1"></i> Light mode activated! Click Save to keep this setting.';
                        previewMsg.style.color = '#10b981';
                    }
                }
            });
        }
    })();

    // Form Submit Handler
    (function() {
        var form = document.getElementById('settingsForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                var newPass = document.getElementById('newPass');
                var confirmPass = document.getElementById('confirmPass');
                var currentPass = document.getElementById('currentPass');
                
                if ((newPass && newPass.value) || (confirmPass && confirmPass.value) || (currentPass && currentPass.value)) {
                    if (!currentPass || !currentPass.value) {
                        e.preventDefault();
                        alert('❌ Please enter current password to change password.');
                        if (currentPass) currentPass.focus();
                        return;
                    }
                    if (!newPass || !newPass.value) {
                        e.preventDefault();
                        alert('❌ Please enter new password.');
                        if (newPass) newPass.focus();
                        return;
                    }
                    if (newPass.value !== confirmPass.value) {
                        e.preventDefault();
                        alert('❌ New password and confirmation do not match!');
                        if (confirmPass) confirmPass.focus();
                        return;
                    }
                    if (newPass.value.length < 6) {
                        e.preventDefault();
                        alert('❌ New password must be at least 6 characters long.');
                        if (newPass) newPass.focus();
                        return;
                    }
                }
                
                // Show loading state
                var submitBtn = document.getElementById('saveSettingsBtn');
                if (submitBtn) {
                    var originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';
                    submitBtn.disabled = true;
                    
                    // Re-enable after form submit (just visual)
                    setTimeout(function() {
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }, 3000);
                }
            });
        }
    })();
