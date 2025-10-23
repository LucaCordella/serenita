// hub.js - lógica do hub principal

(function() {
  'use strict';

  // ========== AUTENTICAÇÃO ==========
  // Verifica se usuário está autenticado
  function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      // Redireciona para login se não autenticado
      window.location.href = '../pages/login.html';
      return null;
    }

    try {
      return JSON.parse(user);
    } catch (err) {
      console.error('Erro ao parsear dados do usuário:', err);
      localStorage.clear();
      window.location.href = '../pages/login.html';
      return null;
    }
  }

  // Executa verificação ao carregar
  const currentUser = checkAuth();
  if (!currentUser) return;

  // ========== PERSONALIZAÇÃO DO USUÁRIO ==========
  // Nome do usuário no card de boas-vindas
  const userNameEl = document.getElementById('userName');
  if (userNameEl && currentUser.firstName) {
    userNameEl.textContent = currentUser.firstName;
  }

  // Iniciais no avatar do perfil
  const userInitialsEl = document.getElementById('userInitials');
  if (userInitialsEl && currentUser.firstName) {
    const initials = currentUser.firstName.charAt(0).toUpperCase() + 
                    (currentUser.lastName ? currentUser.lastName.charAt(0).toUpperCase() : '');
    userInitialsEl.textContent = initials;
  }

  // ========== HORA ATUAL ==========
  // Atualiza hora em tempo real
  function updateTime() {
    const timeEl = document.getElementById('currentTime');
    if (!timeEl) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}`;
  }

  // Atualiza a cada minuto
  updateTime();
  setInterval(updateTime, 60000);

  // ========== DROPDOWN DO PERFIL ==========
  const profileBtn = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');

  if (profileBtn && profileDropdown) {
    // Toggle dropdown
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

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.setAttribute('hidden', '');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ========== MODAL DE EMERGÊNCIA ==========
  const emergencyBtn = document.getElementById('emergencyBtn');
  const emergencyModal = document.getElementById('emergencyModal');
  const emergencyOverlay = document.getElementById('emergencyOverlay');
  const closeEmergency = document.getElementById('closeEmergency');

  function openEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden'; // Previne scroll
    }
  }

  function closeEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.setAttribute('hidden', '');
      document.body.style.overflow = ''; // Restaura scroll
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

  // Link para configurações no modal de emergência
  const emergencySettingsLink = document.getElementById('emergencySettingsLink');
  if (emergencySettingsLink) {
    emergencySettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeEmergencyModal();
      showDevelopmentAlert('Configurações');
    });
  }

  // Fechar modal com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEmergencyModal();
      closeNotificationModal();
    }
  });

  // ========== MODAL DE NOTIFICAÇÕES ==========
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationModal = document.getElementById('notificationModal');
  const notificationOverlay = document.getElementById('notificationOverlay');
  const closeNotification = document.getElementById('closeNotification');

  function openNotificationModal() {
    if (notificationModal) {
      notificationModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      
      // Remove badge após abrir
      const badge = document.querySelector('.notification-badge');
      if (badge) {
        badge.style.display = 'none';
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

  // ========== ALERTAS "EM DESENVOLVIMENTO" ==========
  function showDevelopmentAlert(featureName) {
    alert(`Ainda estamos desenvolvendo essa funcionalidade: ${featureName} 🚧\n\nEm breve estará disponível!`);
  }

  // ========== NAVEGAÇÃO DA SIDEBAR ==========
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-feature]');
  
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const feature = link.getAttribute('data-feature');
      
      // Remove active de todos
      sidebarLinks.forEach(l => l.classList.remove('active'));
      
      // Adiciona active no clicado
      link.classList.add('active');

      // Se for "início", não mostra alerta
      if (feature === 'inicio') {
        return;
      }

      // Mapeia nomes amigáveis
      const featureNames = {
        'diario-humor': 'Diário de Humor',
        'sintomas': 'Registro de Sintomas',
        'tendencias': 'Tendências e Relatórios',
        'avaliacoes': 'Autoavaliações',
        'autocuidado': 'Autocuidado',
        'configuracoes': 'Configurações',
        'perfil': 'Perfil'
      };

      showDevelopmentAlert(featureNames[feature] || feature);
    });
  });

  // ========== CARDS DE FUNCIONALIDADES ==========
  const featureButtons = document.querySelectorAll('.btn-feature[data-feature]');
  
  featureButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const feature = button.getAttribute('data-feature');
      
      const featureNames = {
        'diario-humor': 'Diário de Humor',
        'sintomas': 'Registro de Sintomas',
        'autocuidado': 'Autocuidado',
        'tendencias': 'Tendências e Relatórios',
        'avaliacoes': 'Autoavaliações'
      };

      showDevelopmentAlert(featureNames[feature] || feature);
    });
  });

  // ========== BOTÃO "REGISTRAR HUMOR DE HOJE" ==========
  const registerMoodBtn = document.getElementById('registerMoodBtn');
  if (registerMoodBtn) {
    registerMoodBtn.addEventListener('click', () => {
      showDevelopmentAlert('Diário de Humor');
    });
  }

  // ========== DROPDOWN DO PERFIL - LINKS ==========
  const profileLink = document.getElementById('profileLink');
  const settingsLink = document.getElementById('settingsLink');
  const logoutLink = document.getElementById('logoutLink');

  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      showDevelopmentAlert('Perfil');
    });
  }

  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      showDevelopmentAlert('Configurações');
    });
  }

  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Confirma logout
      const confirm = window.confirm('Deseja realmente sair?');
      if (confirm) {
        // Limpa dados de autenticação
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redireciona para landing page
        window.location.href = '../pages/landing.html';
      }
    });
  }

  // ========== INICIALIZAÇÃO DOS ÍCONES LUCIDE ==========
  // Já está no HTML, mas garantir que funcione
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  console.log('🎉 Hub carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);

})();