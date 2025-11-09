// hub.js - lógica do hub principal com navegação universal

(function() {
  'use strict';

  // ===== AUTENTICAÇÃO =====
  function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
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

  const currentUser = checkAuth();
  if (!currentUser) return;

  // ===== PERSONALIZAÇÃO DO USUÁRIO =====
  const userNameEl = document.getElementById('userName');
  if (userNameEl && currentUser.firstName) {
    userNameEl.textContent = currentUser.firstName;
  }

  const userInitialsEl = document.getElementById('userInitials');
  if (userInitialsEl && currentUser.firstName) {
    const initials = currentUser.firstName.charAt(0).toUpperCase() +
      (currentUser.lastName ? currentUser.lastName.charAt(0).toUpperCase() : '');
    userInitialsEl.textContent = initials;
  }

  // ===== HORA ATUAL =====
  function updateTime() {
    const timeEl = document.getElementById('currentTime');
    if (!timeEl) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}`;
  }

  updateTime();
  setInterval(updateTime, 60000);

  // ===== DROPDOWN DO PERFIL =====
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
      if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.setAttribute('hidden', '');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ===== MODAL DE EMERGÊNCIA =====
  const emergencyBtn = document.getElementById('emergencyBtn');
  const emergencyModal = document.getElementById('emergencyModal');
  const emergencyOverlay = document.getElementById('emergencyOverlay');
  const closeEmergency = document.getElementById('closeEmergency');

  function openEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
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

  const emergencySettingsLink = document.getElementById('emergencySettingsLink');
  if (emergencySettingsLink) {
    emergencySettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeEmergencyModal();
      window.location.href = '../pages/configuracoes.html';
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEmergencyModal();
      closeNotificationModal();
    }
  });

  // ===== MODAL DE NOTIFICAÇÕES =====
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

  // ===== ALERTAS "EM DESENVOLVIMENTO" =====
  function showDevelopmentAlert(featureName) {
    alert(`Ainda estamos desenvolvendo essa funcionalidade: ${featureName} 🚧\n\nEm breve estará disponível!`);
  }

  // ===== SISTEMA DE NAVEGAÇÃO UNIVERSAL =====
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-feature]');
  const featureButtons = document.querySelectorAll('.btn-feature[data-feature]');

  // Mapa de rotas das funcionalidades
  const routeMap = {
    'inicio': '../pages/hub.html',
    'diario-humor': '../pages/diario-humor.html',
    'sintomas': '../pages/sintomas.html',
    'tendencias': '../pages/tendencias.html', 
    'avaliacoes': '../pages/avaliacoes.html',
    'autocuidado': '../pages/autocuidado.html',
    'configuracoes': '../pages/configuracoes.html',
    'perfil': '../pages/perfil.html'
  };

  // Nomes amigáveis para alertas
  const featureNames = {
    'tendencias': 'Tendências e Relatórios',
    'avaliacoes': 'Autoavaliações',
    'autocuidado': 'Autocuidado',
    'configuracoes': 'Configurações',
    'perfil': 'Perfil'
  };

  // Função universal de navegação
  function navigateToFeature(feature) {
    const route = routeMap[feature];
    
    if (route) {
      // Redireciona para a página
      window.location.href = route;
    } else {
      // Mostra alerta "em desenvolvimento"
      showDevelopmentAlert(featureNames[feature] || feature);
    }
  }

  // Event listeners para sidebar
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const feature = link.getAttribute('data-feature');
      navigateToFeature(feature);
    });
  });

  // Event listeners para cards de funcionalidades
  featureButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const feature = button.getAttribute('data-feature');
      navigateToFeature(feature);
    });
  });

  // Botão "Registrar Humor de Hoje"
  const registerMoodBtn = document.getElementById('registerMoodBtn');
  if (registerMoodBtn) {
    registerMoodBtn.addEventListener('click', () => {
      navigateToFeature('diario-humor');
    });
  }

  // ===== DROPDOWN DO PERFIL - LINKS =====
  const profileLink = document.getElementById('profileLink');
  const settingsLink = document.getElementById('settingsLink');
  const logoutLink = document.getElementById('logoutLink');

  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '../pages/perfil.html';
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

  // ===== INICIALIZAÇÃO DOS ÍCONES LUCIDE =====
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  console.log('🎉 Hub carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();