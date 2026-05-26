const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  togglePassword.className = type === 'password' ? 'ph ph-eye' : 'ph ph-eye-slash';
});

const registerUser = async () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const btn = document.getElementById('signupBtn');

  if (!name || !email || !password || !confirmPassword) {
    showAlert('alertBox', 'Please fill in all fields', 'error');
    return;
  }
  if (password !== confirmPassword) {
    showAlert('alertBox', 'Passwords do not match', 'error');
    return;
  }
  if (password.length < 6) {
    showAlert('alertBox', 'Password must be at least 6 characters', 'error');
    return;
  }

  btn.innerHTML = '<span>Creating account...</span>';
  btn.disabled = true;

  try {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert('alertBox', data.message || 'Registration failed', 'error');
      btn.innerHTML = '<span>Create Account</span><i class="ph ph-arrow-right"></i>';
      btn.disabled = false;
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
      id: data._id,
      name: data.name,
      email: data.email
    }));

    window.location.href = 'dashboard.html';
  } catch (error) {
    showAlert('alertBox', 'Something went wrong', 'error');
    btn.innerHTML = '<span>Create Account</span><i class="ph ph-arrow-right"></i>';
    btn.disabled = false;
  }
};

const showAlert = (id, message, type) => {
  const box = document.getElementById(id);
  box.textContent = message;
  box.className = `alert alert-${type}`;
  setTimeout(() => box.className = 'alert', 4000);
};