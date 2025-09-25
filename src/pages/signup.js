// signup.js - client validation + mock signup (consistent with login.js)

(function(){
  const form = document.getElementById('signupForm');
  const firstNameEl = document.getElementById('firstName');
  const lastNameEl = document.getElementById('lastName');
  const emailEl = document.getElementById('email');
  const pwdEl = document.getElementById('password');
  const confirmPwdEl = document.getElementById('confirmPassword');

  const toggleBtn = document.getElementById('togglePwd');
  const toggleBtnConfirm = document.getElementById('togglePwdConfirm');
  const submitBtn = document.getElementById('submitBtn');

  const firstNameError = document.getElementById('firstNameError');
  const lastNameError = document.getElementById('lastNameError');
  const emailError = document.getElementById('emailError');
  const pwdError = document.getElementById('pwdError');
  const confirmPwdError = document.getElementById('confirmPwdError');
  const feedback = document.getElementById('feedback');

  // toggle password visibility
  function toggleVisibility(inputEl, btnEl) {
    if (!inputEl || !btnEl) return;
    btnEl.addEventListener('click', () => {
      const type = inputEl.type === 'password' ? 'text' : 'password';
      inputEl.type = type;
      btnEl.setAttribute('aria-label', type === 'text' ? 'Ocultar senha' : 'Mostrar senha');
    });
  }
  toggleVisibility(pwdEl, toggleBtn);
  toggleVisibility(confirmPwdEl, toggleBtnConfirm);

  // validators
  function isValidEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isValidPwd(v){ return v && v.length >= 6; }
  function isNonEmpty(v){ return v && v.trim().length > 0; }

  function validate(){
    let ok = true;
    // clear
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    emailError.textContent = '';
    pwdError.textContent = '';
    confirmPwdError.textContent = '';
    feedback.textContent = '';

    if(!isNonEmpty(firstNameEl.value)){
      firstNameError.textContent = 'Informe seu nome';
      ok = false;
    }
    if(!isNonEmpty(lastNameEl.value)){
      lastNameError.textContent = 'Informe seu sobrenome';
      ok = false;
    }
    if(!isValidEmail(emailEl.value.trim())){
      emailError.textContent = 'Informe um e-mail válido';
      ok = false;
    }
    if(!isValidPwd(pwdEl.value)){
      pwdError.textContent = 'Senha deve ter pelo menos 6 caracteres';
      ok = false;
    }
    if(pwdEl.value !== confirmPwdEl.value){
      confirmPwdError.textContent = 'Senhas não coincidem';
      ok = false;
    }

    submitBtn.disabled = !ok;
    return ok;
  }

  // validate on input
  [firstNameEl, lastNameEl, emailEl, pwdEl, confirmPwdEl].forEach(el => {
    if(!el) return;
    el.addEventListener('input', validate);
  });

// --- submit handler (substituir o submit antigo) ---
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  // coleta valores (ajuste ids se forem diferentes)
  const payload = {
    firstName: (document.getElementById('firstName') || {}).value || '',
    lastName: (document.getElementById('lastName') || {}).value || '',
    email: (document.getElementById('email') || {}).value || '',
    password: (document.getElementById('password') || {}).value || ''
  };

  try {
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registrando...'; }

    const res = await fetch('http://localhost:4000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro no cadastro');

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // sucesso: redireciona para login (ou hub futuramente)
    setTimeout(()=> window.location.href = "../pages/login.html", 900);
  } catch (err) {
    console.error('Signup error:', err);
    const feedbackEl = document.getElementById('feedback');
    if (feedbackEl) { feedbackEl.style.color = '#ffb4c0'; feedbackEl.textContent = err.message || 'Erro no cadastro'; }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Criar conta'; }
  }
});



  // initial validation attempt
  validate();

})();
