// perfil.js – Lógica completa da Página de Perfil com API
(function () {
  'use strict';

  let token = null; // Armazenará o token de autenticação
  let currentUser = null; // Armazenará os dados do usuário (do localStorage)

  // ===== AUTENTICAÇÃO =====
  function checkAuth() {
    token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      window.location.href = '../pages/login.html';
      return false;
    }

    try {
      currentUser = JSON.parse(userStr);
      // Garante que o contato de emergência (se existir) seja um objeto
      if (typeof currentUser.emergencyContact === 'string') {
        currentUser.emergencyContact = JSON.parse(currentUser.emergencyContact);
      }
      return true;
    } catch (err) {
      console.error('Erro ao parsear dados do usuário:', err);
      localStorage.clear();
      window.location.href = '../pages/login.html';
      return false;
    }
  }

  if (!checkAuth()) return; // Para a execução

  // ===== ELEMENTOS DO DOM =====

  // Header
  const userInitialsEl = document.getElementById('userInitials');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Visão Geral - Profile
  const profileAvatarLarge = document.getElementById('profileAvatarLarge');
  const profileInitialsLarge = document.getElementById('profileInitialsLarge');
  const avatarEditBtn = document.getElementById('avatarEditBtn');
  const avatarInput = document.getElementById('avatarInput');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileAge = document.getElementById('profileAge');
  const memberSince = document.getElementById('memberSince');

  // Bio
  const profileBioDisplay = document.getElementById('profileBioDisplay');
  const profileBioEdit = document.getElementById('profileBioEdit');
  const profileBioText = document.getElementById('profileBioText');
  const editBioBtn = document.getElementById('editBioBtn');
  const bioTextarea = document.getElementById('bioTextarea');
  const bioCharCount = document.getElementById('bioCharCount');
  const cancelBioBtn = document.getElementById('cancelBioBtn');
  const saveBioBtn = document.getElementById('saveBioBtn');

  // Estatísticas
  const statMoodEntries = document.getElementById('statMoodEntries');
  const statSymptomEntries = document.getElementById('statSymptomEntries');
  const statTasksCompleted = document.getElementById('statTasksCompleted');
  const statPractices = document.getElementById('statPractices');

  // Configurações - Settings Tab
  const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
  const settingsInitials = document.getElementById('settingsInitials');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const avatarInputSettings = document.getElementById('avatarInputSettings');
  const profileSettingsForm = document.getElementById('profileSettingsForm');
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  const emailInput = document.getElementById('email');
  const biographyInput = document.getElementById('biography');
  const biographyCharCount = document.getElementById('biographyCharCount');
  const reminderTimeInput = document.getElementById('reminderTime');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

  // Toast
  const toast = document.getElementById('toast');
  
  // Modal de Emergência (para o fix)
  const emergencyPhoneDisplay = document.getElementById('emergencyPhoneDisplay');

  // Estado
  let isEditingBio = false;
  let userAvatar = currentUser.avatar || null; // Armazena base64 da imagem

  // ===== INICIALIZAÇÃO =====
  function initializeProfile() {
    // Carregar dados do usuário (do currentUser)
    updateInitials(currentUser);
    updateProfileView(currentUser);
    updateSettingsForm(currentUser);
    updateAvatarDisplay(userAvatar);
    
    // Carregar estatísticas (lendo dos outros 'entries' no localStorage)
    loadStatistics();
  }

  // Helper para atualizar Iniciais (Header, Perfil, Config)
  function updateInitials(data) {
    const initials = (
      (data.firstName ? data.firstName.charAt(0) : '') +
      (data.lastName ? data.lastName.charAt(0) : '')
    ).toUpperCase();
    
    if (userInitialsEl) userInitialsEl.textContent = initials;
    if (profileInitialsLarge) profileInitialsLarge.textContent = initials;
    if (settingsInitials) settingsInitials.textContent = initials;
  }

  // Helper para calcular idade (usado na visão geral)
  function calculateAge(birthDate) {
    if (!birthDate) return null;
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    } catch (e) {
      console.error("Data de nascimento inválida:", e);
      return null;
    }
  }

// Helper para atualizar "Visão Geral"
  function updateProfileView(data) {
    if (profileName) {
      profileName.textContent = `${data.firstName} ${data.lastName}`.trim();
    }
    if (profileEmail) {
      profileEmail.textContent = data.email;
    }
    if (profileAge) {
      const age = calculateAge(data.birthDate);
      profileAge.textContent = age ? `${age} anos` : 'Idade não informada';
    }
    if (memberSince) {
      const date = new Date(data.memberSince || new Date());
      const formatted = date.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      });
      memberSince.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    if (profileBioText) {
      if (data.biography && data.biography.trim()) {
        profileBioText.textContent = data.biography;
        profileBioText.style.color = 'var(--text-secondary)';
      } else {
        profileBioText.textContent = 'Adicione uma breve descrição sobre você...';
        profileBioText.style.color = 'var(--text-muted)';
      }
    }
  }

  // Helper para atualizar "Formulário de Configurações"
  function updateSettingsForm(data) {
    if (firstNameInput) firstNameInput.value = data.firstName || '';
    if (lastNameInput) lastNameInput.value = data.lastName || '';
    if (emailInput) emailInput.value = data.email || '';
    if (biographyInput) {
      biographyInput.value = data.biography || '';
      updateBiographyCharCount(); // Atualiza contador
    }
    if (reminderTimeInput) reminderTimeInput.value = data.reminderTime || '20:00';
  }
  
  // ===== NAVEGAÇÃO DE TABS (Sem alterações) =====
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      tabContents.forEach((content) => content.classList.remove('active'));

      if (targetTab === 'visao-geral') {
        document.getElementById('tabVisaoGeral').classList.add('active');
        // Recarregar dados caso tenham sido alterados na outra aba
        updateProfileView(currentUser);
      } else if (targetTab === 'configuracoes') {
        document.getElementById('tabConfiguracoes').classList.add('active');
         // Recarregar dados caso tenham sido alterados na outra aba
        updateSettingsForm(currentUser);
      }
    });
  });
  
  // ===== LÓGICA DE ATUALIZAÇÃO (API) =====
  
  // Função helper principal para salvar CADA mudança na API
  async function updateProfileOnAPI(updatedUser) {
    try {
      const res = await fetch(`http://localhost:4000/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedUser) // Envia o objeto de usuário *completo*
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Falha ao atualizar o perfil');
      }
      
      // Se sucesso, atualizar o localStorage com os novos dados
      localStorage.setItem('user', JSON.stringify(updatedUser));
      currentUser = updatedUser; // Atualiza o cache local
      
      // Atualiza também as iniciais no header global
      updateInitials(currentUser);

      return true; // Indica sucesso

    } catch (err) {
      showToast(err.message, 'error');
      console.error("Erro ao salvar perfil na API:", err);
      return false; // Indica falha
    }
  }


  // ===== AVATAR (Visão Geral) =====
  if (avatarEditBtn && avatarInput) {
    avatarEditBtn.addEventListener('click', () => {
      avatarInput.click();
    });
    avatarInput.addEventListener('change', handleAvatarChange);
  }

  // ===== AVATAR (Configurações) =====
  if (changeAvatarBtn && avatarInputSettings) {
    changeAvatarBtn.addEventListener('click', () => {
      avatarInputSettings.click();
    });
    avatarInputSettings.addEventListener('change', handleAvatarChange);
  }

  // Handler unificado para mudança de avatar
  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione uma imagem válida', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // Limite de 2MB
      showToast('A imagem deve ter no máximo 2MB', 'error');
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = async function (event) {
      userAvatar = event.target.result;
      
      // 1. Atualiza a UI imediatamente (Otimistic)
      updateAvatarDisplay(userAvatar);

      // 2. Prepara dados para a API
      const updatedUser = {
        ...currentUser,
        avatar: userAvatar
      };
      
      // 3. Salva na API
      const success = await updateProfileOnAPI(updatedUser);
      
      if (success) {
        showToast('Avatar atualizado com sucesso!', 'success');
      } else {
        // 4. Rollback se falhar
        userAvatar = currentUser.avatar; // Volta ao avatar antigo
        updateAvatarDisplay(userAvatar);
      }
    };
    reader.readAsDataURL(file);
  }

  // Helper para mostrar avatar em todos os lugares
  function updateAvatarDisplay(avatarBase64) {
    const avatarURL = avatarBase64 ? `url(${avatarBase64})` : 'none';
    const displayInitials = avatarBase64 ? 'none' : 'flex';

    // Atualizar avatar grande (visão geral)
    if (profileAvatarLarge && profileInitialsLarge) {
      profileAvatarLarge.style.backgroundImage = avatarURL;
      profileAvatarLarge.style.backgroundSize = 'cover';
      profileAvatarLarge.style.backgroundPosition = 'center';
      profileInitialsLarge.style.display = displayInitials;
    }
    // Atualizar preview (configurações)
    if (settingsAvatarPreview && settingsInitials) {
      settingsAvatarPreview.style.backgroundImage = avatarURL;
      settingsAvatarPreview.style.backgroundSize = 'cover';
      settingsAvatarPreview.style.backgroundPosition = 'center';
      settingsInitials.style.display = displayInitials;
    }
  }
  
  // ===== EDIÇÃO DE BIOGRAFIA (Visão Geral) =====
  if (editBioBtn) {
    editBioBtn.addEventListener('click', enterBioEditMode);
  }
  if (cancelBioBtn) {
    cancelBioBtn.addEventListener('click', exitBioEditMode);
  }
  if (saveBioBtn) {
    saveBioBtn.addEventListener('click', saveBioChanges);
  }
  if (bioTextarea) {
    bioTextarea.addEventListener('input', updateBioCharCount);
  }

  function enterBioEditMode() {
    isEditingBio = true;
    bioTextarea.value = currentUser.biography || '';
    updateBioCharCount();
    profileBioDisplay.style.display = 'none';
    profileBioEdit.style.display = 'flex';
    bioTextarea.focus();
  }

  function exitBioEditMode() {
    isEditingBio = false;
    profileBioDisplay.style.display = 'block';
    profileBioEdit.style.display = 'none';
  }

  async function saveBioChanges() {
    const newBio = bioTextarea.value.trim();
    
    const updatedUser = {
      ...currentUser,
      biography: newBio
    };

    // Salva na API
    const success = await updateProfileOnAPI(updatedUser);
    
    if (success) {
      // Atualiza a UI da Visão Geral
      updateProfileView(currentUser);
      exitBioEditMode();
      showToast('Biografia atualizada com sucesso!', 'success');
    }
    // Se falhar, o `updateProfileOnAPI` já mostrou o toast de erro
  }

  function updateBioCharCount() {
    const length = bioTextarea.value.length;
    bioCharCount.textContent = length;
    if (length > 270) {
      bioCharCount.style.color = '#f87171';
    } else {
      bioCharCount.style.color = 'var(--text-muted)';
    }
  }

  // ===== CONTADOR DE CARACTERES (Configurações) =====
  if (biographyInput) {
    biographyInput.addEventListener('input', updateBiographyCharCount);
  }
  function updateBiographyCharCount() {
    if(!biographyInput || !biographyCharCount) return;
    const length = biographyInput.value.length;
    biographyCharCount.textContent = length;
    if (length > 270) {
      biographyCharCount.style.color = '#f87171';
    } else {
      biographyCharCount.style.color = 'var(--text-muted)';
    }
  }
  
  // ===== ESTATÍSTICAS (MODIFICADO para ler da API) =====
  async function loadStatistics() {
    try {
      // 1. Carregar Registros de Humor (da API)
      const moodRes = await fetch('http://localhost:4000/api/entries?type=mood', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const moodEntries = await moodRes.json();
      if (statMoodEntries) {
        statMoodEntries.textContent = moodEntries.length;
      }

      // 2. Carregar Sintomas (da API)
      const sympRes = await fetch('http://localhost:4000/api/entries?type=symptom', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const symptomEntries = await sympRes.json();
      if (statSymptomEntries) {
        statSymptomEntries.textContent = symptomEntries.length;
      }

      // 3. Carregar Tarefas (da API)
      const taskRes = await fetch('http://localhost:4000/api/entries?type=task', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const taskEntries = await taskRes.json();
      // Filtra apenas as concluídas (os dados estão em entry.data)
      const completedTasks = taskEntries.filter(entry => entry.data.completed).length;
      if (statTasksCompleted) {
        statTasksCompleted.textContent = completedTasks;
      }

      // 4. Carregar Práticas (ainda do localStorage, como planejado)
      const practices = JSON.parse(localStorage.getItem('practiceCompletions') || '[]');
      if (statPractices) {
        statPractices.textContent = practices.length;
      }
      
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
      if (statMoodEntries) statMoodEntries.textContent = 'Erro';
      if (statSymptomEntries) statSymptomEntries.textContent = 'Erro';
      if (statTasksCompleted) statTasksCompleted.textContent = 'Erro';
    }
  }

// ===== FORMULÁRIO DE CONFIGURAÇÕES (SUBMIT) =====
  if (profileSettingsForm) {
    profileSettingsForm.addEventListener('submit', handleSettingsSubmit);
  }
  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener('click', () => {
      // Recarrega o formulário com os dados do cache (currentUser)
      updateSettingsForm(currentUser);
      showToast('Alterações descartadas', 'error');
    });
  }

  async function handleSettingsSubmit(e) {
    e.preventDefault();

    // Validações
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const biography = biographyInput.value.trim();
    const reminderTime = reminderTimeInput.value;

    if (!firstName) {
      showToast('Por favor, informe seu nome', 'error');
      firstNameInput.focus();
      return;
    }
    if (!lastName) {
      showToast('Por favor, informe seu sobrenome', 'error');
      lastNameInput.focus();
      return;
    }
    if (!email || !isValidEmail(email)) {
      showToast('Por favor, informe um e-mail válido', 'error');
      emailInput.focus();
      return;
    }

    // Prepara o objeto de usuário atualizado
    const updatedUser = {
      ...currentUser,
      firstName: firstName,
      lastName: lastName,
      email: email,
      biography: biography,
      reminderTime: reminderTime,
      // O avatar e o contato de emergência já foram atualizados
    };

    // Salva na API
    const success = await updateProfileOnAPI(updatedUser);

    if (success) {
      // Atualiza a UI da Visão Geral
      updateProfileView(currentUser);
      showToast('Perfil atualizado com sucesso!', 'success');
      // Volta para aba de visão geral
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="visao-geral"]');
        if (btn) btn.click();
      }, 1000);
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ===== TOAST =====
  function showToast(message, type = 'success') {
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    if (toastMessage) {
      toastMessage.textContent = message;
    }
    if (type === 'error') {
      toast.style.background =
        'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))';
      if (toastIcon) toastIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
      toast.style.background =
        'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))';
      if (toastIcon) toastIcon.setAttribute('data-lucide', 'check-circle');
    }
    toast.removeAttribute('hidden');
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    setTimeout(() => {
      toast.setAttribute('hidden', '');
    }, 3000);
  }
  
  // ===== FIX DO CONTATO DE EMERGÊNCIA =====
  // Esta função é chamada ao abrir o modal de emergência
  function loadEmergencyContact() {
    const contact = currentUser.emergencyContact;
    if (emergencyPhoneDisplay) {
        if (contact && contact.name && contact.phone) {
            emergencyPhoneDisplay.textContent = contact.phone;
        } else {
            emergencyPhoneDisplay.textContent = 'Não cadastrado';
        }
    }
  }

  // ===== DROPDOWN DO PERFIL (Sem alterações) =====
  const profileBtn = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = profileDropdown.hasAttribute('hidden');
      if (isHidden) {
        profileDropdown.removeAttribute('hidden');
        profileBtn.setAttribute('aria-expanded', 'true');
      } else {
        profileDropdown.setAttribute('hidden', '');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', (e) => {
      if (
        !profileBtn.contains(e.target) &&
        !profileDropdown.contains(e.target)
      ) {
        profileDropdown.setAttribute('hidden', '');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ===== MODAL DE EMERGÊNCIA (COM FIX) =====
  const emergencyBtn = document.getElementById('emergencyBtn');
  const emergencyModal = document.getElementById('emergencyModal');
  const emergencyOverlay = document.getElementById('emergencyOverlay');
  const closeEmergency = document.getElementById('closeEmergency');
  
  function openEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      
      // *** ESTA É A CORREÇÃO ***
      // Atualiza o display do contato *antes* de abrir o modal
      loadEmergencyContact(); 
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }
  function closeEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }
  if (emergencyBtn) {
    emergencyBtn.addEventListener('click', openEmergencyModal);
  }
  if (closeEmergency) {
    closeEmergency.addEventListener('click', closeEmergencyModal);
  }
  if (emergencyOverlay) {
    emergencyOverlay.addEventListener('click', closeEmergencyModal);
  }

  // ===== MODAL DE NOTIFICAÇÕES (Sem alterações) =====
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationModal = document.getElementById('notificationModal');
  const notificationOverlay = document.getElementById('notificationOverlay');
  const closeNotification = document.getElementById('closeNotification');
  
  function openNotificationModal() {
    if (notificationModal) {
      notificationModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      const badge = document.querySelector('.notification-badge');
      if (badge) {
        badge.style.display = 'none';
      }
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }
  function closeNotificationModal() {
    if (notificationModal) {
      notificationModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }
  if (notificationBtn) {
    notificationBtn.addEventListener('click', openNotificationModal);
  }
  if (closeNotification) {
    closeNotification.addEventListener('click', closeNotificationModal);
  }
  if (notificationOverlay) {
    notificationOverlay.addEventListener('click', closeNotificationModal);
  }

  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEmergencyModal();
      closeNotificationModal();
      if (isEditingBio) {
        exitBioEditMode();
      }
    }
  });

  // ===== NAVEGAÇÃO UNIVERSAL (Sem alterações) =====
  function showDevelopmentAlert(featureName) {
    alert(
      `Ainda estamos desenvolvendo essa funcionalidade: ${featureName} 🚧\n\nEm breve estará disponível!`
    );
  }
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-feature]');
  const routeMap = {
    inicio: '../pages/hub.html',
    'diario-humor': '../pages/diario-humor.html',
    sintomas: '../pages/sintomas.html',
    tendencias: '../pages/tendencias.html',
    avaliacoes: '../pages/avaliacoes.html',
    autocuidado: '../pages/autocuidado.html',
    configuracoes: '../pages/configuracoes.html',
    perfil: '../pages/perfil.html',
  };
  const featureNames = {
    tendencias: 'Tendências e Relatórios',
    avaliacoes: 'Autoavaliações',
    configuracoes: 'Configurações',
  };
  function navigateToFeature(feature) {
    const route = routeMap[feature];
    if (route) {
      window.location.href = route;
    } else {
      showDevelopmentAlert(featureNames[feature] || feature);
    }
  }
  sidebarLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const feature = link.getAttribute('data-feature');
      navigateToFeature(feature);
    });
  });

  // ===== DROPDOWN DO PERFIL - LINKS (Sem alterações) =====
  const profileLinkDropdown = document.getElementById('profileLink');
  const settingsLink = document.getElementById('settingsLink');
  const logoutLink = document.getElementById('logoutLink');
  
  if (profileLinkDropdown) {
    profileLinkDropdown.addEventListener('click', (e) => {
      e.preventDefault();
      if (profileDropdown) {
        profileDropdown.setAttribute('hidden', '');
      }
      // Garante que estamos na aba de visão geral
      const btn = document.querySelector('.tab-btn[data-tab="visao-geral"]');
      if (btn) btn.click();
    });
  }
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '../pages/configuracoes.html';
    });
  }
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      const confirm = window.confirm('Deseja realmente sair?');
      if (confirm) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../pages/landing.html';
      }
    });
  }
  const emergencySettingsLink = document.getElementById(
    'emergencySettingsLink'
  );
  if (emergencySettingsLink) {
    emergencySettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeEmergencyModal();
      window.location.href = '../pages/configuracoes.html';
    });
  }

  // ===== CHAMADA DE INICIALIZAÇÃO (Modificada para async) =====
  (async () => {
    // Chama a função principal que agora pode conter chamadas 'await'
    await initializeProfile(); 
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    console.log('🎉 Página de Perfil carregada com sucesso!');
    console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
  })();
})();