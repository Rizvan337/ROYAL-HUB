const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    alert('Passwords do not match!');
    return;
  }

  // Further form submission logic (send to server, etc.)
  alert('Signup successful!');
});
