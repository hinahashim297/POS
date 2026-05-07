    document.getElementById('passwordForm')?.addEventListener('submit', function(e) {
        const newPass = document.querySelector('input[name="new_password"]');
        const confirmPass = document.querySelector('input[name="confirm_password"]');
        if (newPass.value !== confirmPass.value) {
            e.preventDefault();
            alert('New password and confirmation do not match!');
            confirmPass.focus();
        } else if (newPass.value.length < 6) {
            e.preventDefault();
            alert('Password must be at least 6 characters long.');
            newPass.focus();
        }
    });
