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

  // mock auth on submit
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';
    feedback.textContent = '';

    const payload = { email: emailEl.value.trim(), password: pwdEl.value };

    // mock server latency
    setTimeout(() => {
      // mock success when email contains "demo" or any valid non-empty creds
      if(payload.email.includes('demo') || payload.email.length>5){
        feedback.style.color = 'var(--teal-300)';
        feedback.textContent = 'Login realizado com sucesso. Redirecionando...';
        // redirect (mock)
        setTimeout(()=>{ window.location.href = "../index.html"; }, 900);
      } else {
        feedback.style.color = '#ffb4c0';
        feedback.textContent = 'E-mail ou senha inválidos.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
      }
    }, 700);
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
