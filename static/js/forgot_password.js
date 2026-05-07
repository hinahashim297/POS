    // Optional: Show loading state on form submit
    document.getElementById('forgotForm').addEventListener('submit', function(e) {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        // Form will actually submit to backend; no fake setTimeout
    });
