// Owner login form.
const form = document.getElementById('login');
const err = document.getElementById('err');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.hidden = true;
  const btn = form.querySelector('button');
  btn.disabled = true; btn.textContent = 'Logging in…';
  try {
    const r = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BF-Admin': '1' },
      body: JSON.stringify({ username: form.username.value, password: form.password.value }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || 'Login failed.');
    location.href = '/admin';
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
    form.password.value = '';
    form.password.focus();
  } finally {
    btn.disabled = false; btn.textContent = 'Log in';
  }
});
