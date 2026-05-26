const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  togglePassword.className = type === 'password' ? 'ph ph-eye' : 'ph ph-eye-slash';
});

const loginUser = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    showAlert('alertBox', 'Please fill in all fields', 'error');
    return;
  }

  btn.innerHTML = '<span>Logging in...</span>';
  btn.disabled = true;

  try {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert('alertBox', data.message || 'Login failed', 'error');
      btn.innerHTML = '<span>Login</span><i class="ph ph-arrow-right"></i>';
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
    btn.innerHTML = '<span>Login</span><i class="ph ph-arrow-right"></i>';
    btn.disabled = false;
  }
};

const showAlert = (id, message, type) => {
  const box = document.getElementById(id);
  box.textContent = message;
  box.className = `alert alert-${type}`;
  setTimeout(() => box.className = 'alert', 4000);
};