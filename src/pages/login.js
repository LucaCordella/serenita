// login.js - simple client validation + mock auth

(function(){
  const form = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const pwdEl = document.getElementById('password');
  const toggleBtn = document.getElementById('togglePwd');
  const submitBtn = document.getElementById('submitBtn');
  const emailError = document.getElementById('emailError');
  const pwdError = document.getElementById('pwdError');
  const feedback = document.getElementById('feedback');

  // show/hide password
  toggleBtn.addEventListener('click', () => {
    const type = pwdEl.type === 'password' ? 'text' : 'password';
    pwdEl.type = type;
    toggleBtn.setAttribute('aria-label', type === 'text' ? 'Ocultar senha' : 'Mostrar senha');
  });

  // simple validators
  function isValidEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isValidPwd(v){ return v && v.length >= 6; }

  function validate(){
    let ok = true;
    emailError.textContent = '';
    pwdError.textContent = '';
    feedback.textContent = '';

    if(!isValidEmail(emailEl.value.trim())){
      emailError.textContent = 'Informe um e-mail válido';
      ok = false;
    }
    if(!isValidPwd(pwdEl.value)){
      pwdError.textContent = 'Senha deve ter pelo menos 6 caracteres';
      ok = false;
    }
    submitBtn.disabled = !ok;
    return ok;
  }

  // validate on input
  emailEl.addEventListener('input', validate);
  pwdEl.addEventListener('input', validate);

// --- submit handler (substituir o submit antigo) ---
form.addEventListener('submit', async function(e){
  e.preventDefault();
  // se você tiver uma função validate() mantenha-a, caso contrário comente a linha abaixo
  if (typeof validate === 'function' && !validate()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Entrando...';
  if (feedback) feedback.textContent = '';

  const payload = { email: (emailEl && emailEl.value || '').trim(), password: (pwdEl && pwdEl.value || '') };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro no login');

    // salvar token + user
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    if (feedback) { feedback.style.color = 'var(--teal-300)'; feedback.textContent = 'Login realizado com sucesso. Redirecionando...'; }
    setTimeout(()=>{ window.location.href = "hub.html"; }, 900);
  } catch(err) {
    if (feedback) { feedback.style.color = '#ffb4c0'; feedback.textContent = err.message || 'E-mail ou senha inválidos.'; }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
    console.error('Login error:', err);
  }
});



  // initial validation attempt
  validate();

  // forgot password link placeholder behavior
  const forgotLink = document.getElementById('forgotLink');
  forgotLink.addEventListener('click', function(e){
    e.preventDefault();
    alert('Funcionalidade de recuperação de senha será implementada em breve.');
  });

})();
