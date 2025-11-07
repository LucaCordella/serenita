// diario-humor.js - Lógica completa do Diário de Humor com navegação universal

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
  const userInitialsEl = document.getElementById('userInitials');
  if (userInitialsEl && currentUser.firstName) {
    const initials = currentUser.firstName.charAt(0).toUpperCase() +
      (currentUser.lastName ? currentUser.lastName.charAt(0).toUpperCase() : '');
    userInitialsEl.textContent = initials;
  }

  // ===== ELEMENTOS DO DOM =====
  const moodForm = document.getElementById('moodForm');
  const emojiDisplay = document.getElementById('emojiDisplay');
  const moodNameEl = document.getElementById('moodName');
  const moodLevelEl = document.getElementById('moodLevel');
  const intensitySlider = document.getElementById('intensitySlider');
  const observationsEl = document.getElementById('observations');
  const charCountEl = document.getElementById('charCount');
  const historyList = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyState');
  const toast = document.getElementById('toast');
  const emojiBtns = document.querySelectorAll('.emoji-btn');

  // Estado atual do humor
  let currentMood = {
    emoji: '😐',
    name: 'Neutro',
    value: 3,
    intensity: 3,
    observations: ''
  };

  // ===== FUNÇÕES DE MOOD =====
  
  // Atualizar display do emoji
  function updateEmojiDisplay() {
    const emojiLarge = emojiDisplay.querySelector('.emoji-large');
    if (emojiLarge) {
      emojiLarge.textContent = currentMood.emoji;
    }
    moodNameEl.textContent = currentMood.name;
    moodLevelEl.textContent = currentMood.intensity;
    
    // Atualizar cor do círculo baseado na intensidade
    const colors = {
      1: 'rgba(248,113,113,0.3)',
      2: 'rgba(251,146,60,0.3)',
      3: 'rgba(251,191,36,0.3)',
      4: 'rgba(96,165,250,0.3)',
      5: 'rgba(52,211,153,0.3)'
    };
    
    const borderColors = {
      1: 'rgba(248,113,113,0.5)',
      2: 'rgba(251,146,60,0.5)',
      3: 'rgba(251,191,36,0.5)',
      4: 'rgba(96,165,250,0.5)',
      5: 'rgba(52,211,153,0.5)'
    };
    
    emojiDisplay.style.background = `linear-gradient(135deg, ${colors[currentMood.intensity]}, ${colors[currentMood.intensity]})`;
    emojiDisplay.style.borderColor = borderColors[currentMood.intensity];
  }

  // Event listeners para emoji buttons
  emojiBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active de todos
      emojiBtns.forEach(b => b.classList.remove('active'));
      
      // Adiciona active no clicado
      this.classList.add('active');
      
      // Atualiza estado
      currentMood.emoji = this.dataset.emoji;
      currentMood.name = this.dataset.name;
      currentMood.value = parseInt(this.dataset.value);
      currentMood.intensity = parseInt(this.dataset.value);
      
      // Sincroniza slider
      intensitySlider.value = currentMood.intensity;
      
      // Atualiza display
      updateEmojiDisplay();
    });
  });

  // Event listener para intensity slider
  intensitySlider.addEventListener('input', function() {
    currentMood.intensity = parseInt(this.value);
    moodLevelEl.textContent = currentMood.intensity;
    
    // Atualiza cor do círculo
    updateEmojiDisplay();
    
    // Sincronizar emoji com o slider
    syncEmojiWithSlider(currentMood.intensity);
  });

  // Sincronizar emoji picker com slider
  function syncEmojiWithSlider(value) {
    // Remove active de todos os botões
    emojiBtns.forEach(btn => btn.classList.remove('active'));
    
    // Encontra e ativa o botão correspondente ao valor
    const targetBtn = Array.from(emojiBtns).find(btn => 
      parseInt(btn.dataset.value) === value
    );
    
    if (targetBtn) {
      targetBtn.classList.add('active');
      currentMood.emoji = targetBtn.dataset.emoji;
      currentMood.name = targetBtn.dataset.name;
      currentMood.value = value;
    }
  }

  // Event listener para textarea (contador de caracteres)
  observationsEl.addEventListener('input', function() {
    const length = this.value.length;
    charCountEl.textContent = length;
    currentMood.observations = this.value;
    
    // Muda cor quando próximo do limite
    if (length > 450) {
      charCountEl.style.color = '#f87171';
    } else {
      charCountEl.style.color = 'var(--text-muted)';
    }
  });

  // ===== SALVAR REGISTRO =====
  moodForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Criar objeto de registro
    const moodEntry = {
      id: Date.now(),
      emoji: currentMood.emoji,
      name: currentMood.name,
      intensity: currentMood.intensity,
      observations: currentMood.observations,
      date: new Date().toISOString(),
      userId: currentUser.id || currentUser.email
    };
    
    // Salvar no localStorage
    saveMoodEntry(moodEntry);
    
    // Mostrar toast de sucesso
    showToast('Humor registrado com sucesso!');
    
    // Resetar formulário
    resetForm();
    
    // Recarregar histórico
    loadHistory();
  });

  // Salvar no localStorage
  function saveMoodEntry(entry) {
    let entries = JSON.parse(localStorage.getItem('moodEntries') || '[]');
    entries.unshift(entry); // Adiciona no início
    
    // Limita a 30 registros
    if (entries.length > 30) {
      entries = entries.slice(0, 30);
    }
    
    localStorage.setItem('moodEntries', JSON.stringify(entries));
  }

  // Resetar formulário
  function resetForm() {
    observationsEl.value = '';
    charCountEl.textContent = '0';
    
    // Voltar para neutro
    currentMood = {
      emoji: '😐',
      name: 'Neutro',
      value: 3,
      intensity: 3,
      observations: ''
    };
    
    // Resetar seleção de emojis
    emojiBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === '3') {
        btn.classList.add('active');
      }
    });
    
    intensitySlider.value = 3;
    updateEmojiDisplay();
  }

  // ===== TOAST =====
  function showToast(message) {
    const toastMessage = toast.querySelector('.toast-message');
    if (toastMessage) {
      toastMessage.textContent = message;
    }
    
    toast.removeAttribute('hidden');
    
    // Auto-hide após 3 segundos
    setTimeout(() => {
      toast.setAttribute('hidden', '');
    }, 3000);
    
    // Recriar ícones após mostrar toast
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ===== HISTÓRICO =====
  function loadHistory() {
    const entries = JSON.parse(localStorage.getItem('moodEntries') || '[]');
    
    if (entries.length === 0) {
      // Mostrar empty state
      historyList.innerHTML = `
        <div class="empty-state" id="emptyState">
          <i data-lucide="smile" class="empty-icon"></i>
          <p class="empty-text">Nenhum registro ainda</p>
          <p class="empty-hint">Registre seu primeiro humor!</p>
        </div>
      `;
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
      return;
    }
    
    // Mostrar registros
    historyList.innerHTML = entries.map(entry => {
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short' 
      });
      const timeStr = date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      return `
        <div class="history-item">
          <div class="history-emoji" data-intensity="${entry.intensity}">
            ${entry.emoji}
          </div>
          <div class="history-content">
            <div class="history-header">
              <span class="history-date">${dateStr}</span>
              <span class="history-time">${timeStr}</span>
            </div>
            <p class="history-note">${entry.observations || 'Sem observações'}</p>
          </div>
        </div>
      `;
    }).join('');
  }

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

    // Fechar dropdown ao clicar fora
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

  // ===== MODAL DE NOTIFICAÇÕES =====
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationModal = document.getElementById('notificationModal');
  const notificationOverlay = document.getElementById('notificationOverlay');
  const closeNotification = document.getElementById('closeNotification');

  function openNotificationModal() {
    if (notificationModal) {
      notificationModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      
      // Remove badge
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
    }
  });

  // ===== ALERTAS "EM DESENVOLVIMENTO" =====
  function showDevelopmentAlert(featureName) {
    alert(`Ainda estamos desenvolvendo essa funcionalidade: ${featureName} 🚧\n\nEm breve estará disponível!`);
  }

  // ===== SISTEMA DE NAVEGAÇÃO UNIVERSAL =====
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-feature]');
  
  // Mapa de rotas das funcionalidades
  const routeMap = {
    'inicio': '../pages/hub.html',
    'diario-humor': '../pages/diario-humor.html',
    'sintomas': '../pages/sintomas.html',
    'tendencias': null, // em desenvolvimento
    'avaliacoes': null, // em desenvolvimento
    'autocuidado': null, // em desenvolvimento
    'configuracoes': null, // em desenvolvimento
    'perfil': null // em desenvolvimento
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

  // ===== DROPDOWN DO PERFIL - LINKS =====
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
      
      const confirm = window.confirm('Deseja realmente sair?');
      if (confirm) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../pages/landing.html';
      }
    });
  }

  // Link de configurações no modal de emergência
  const emergencySettingsLink = document.getElementById('emergencySettingsLink');
  if (emergencySettingsLink) {
    emergencySettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeEmergencyModal();
      showDevelopmentAlert('Configurações');
    });
  }

  // ===== INICIALIZAÇÃO =====
  loadHistory();
  updateEmojiDisplay();
  
  // Inicializar ícones Lucide
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  console.log('🎉 Diário de Humor carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);

})();