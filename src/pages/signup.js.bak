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

  // form submit (mock)
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!validate()) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Registrando...';
      feedback.textContent = '';

      const payload = {
        firstName: firstNameEl.value.trim(),
        lastName: lastNameEl.value.trim(),
        email: emailEl.value.trim(),
        password: pwdEl.value
      };

      // fallback behavior (mock server)
      setTimeout(() => {
        // success criteria: simple acceptance for testing
        feedback.style.color = 'var(--teal-300)';
        feedback.textContent = 'Cadastro realizado com sucesso. Você será redirecionado para entrar.';
        console.log('Signup payload (modo teste):', payload);

        setTimeout(() => {
          window.location.href = "../pages/login.html"; // volta para login (ajuste conforme estrutura)
        }, 900);
      }, 700);
    });
  }

  // initial validation attempt
  validate();

})();
