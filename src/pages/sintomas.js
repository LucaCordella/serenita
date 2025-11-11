// sintomas.js - Lógica completa do Registro de Sintomas

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
  const symptomForm = document.getElementById('symptomForm');
  const symptomNameEl = document.getElementById('symptomName');
  const categoryBtns = document.querySelectorAll('.category-btn');
  const severitySlider = document.getElementById('severitySlider');
  const severityDisplay = document.getElementById('severityDisplay');
  const observationsEl = document.getElementById('observations');
  const charCountEl = document.getElementById('charCount');
  const btnCancel = document.getElementById('btnCancel');
  const historyList = document.getElementById('historyList');
  const toast = document.getElementById('toast');
  
  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Modal de detalhes
  const symptomModal = document.getElementById('symptomModal');
  const symptomOverlay = document.getElementById('symptomOverlay');
  const closeSymptomModal = document.getElementById('closeSymptomModal');
  const symptomModalContent = document.getElementById('symptomModalContent');

  // Estado atual do sintoma
  let currentSymptom = {
    name: '',
    category: '',
    severity: 3,
    observations: ''
  };

  // ===== NAVEGAÇÃO DE TABS =====
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      
      // Remove active de todos os botões
      tabBtns.forEach(b => b.classList.remove('active'));
      
      // Adiciona active no clicado
      this.classList.add('active');
      
      // Esconde todos os conteúdos
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Mostra o conteúdo correspondente
      if (targetTab === 'registrar') {
        document.getElementById('tabRegistrar').classList.add('active');
      } else if (targetTab === 'historico') {
        document.getElementById('tabHistorico').classList.add('active');
        loadHistory(); // Recarrega histórico ao trocar de aba
      }
    });
  });

  // ===== SELEÇÃO DE CATEGORIA =====
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active de todos
      categoryBtns.forEach(b => b.classList.remove('active'));
      
      // Adiciona active no clicado
      this.classList.add('active');
      
      // Atualiza estado
      currentSymptom.category = this.dataset.category;
    });
  });

  // ===== SEVERITY SLIDER =====
  const severityLabels = {
    1: 'Muito Leve',
    2: 'Leve',
    3: 'Moderado',
    4: 'Grave',
    5: 'Muito Grave'
  };

  const severityColors = {
    1: '#34D399',
    2: '#FBBF24',
    3: '#FB923C',
    4: '#F87171',
    5: '#DC2626'
  };

  severitySlider.addEventListener('input', function() {
    const value = parseInt(this.value);
    currentSymptom.severity = value;
    severityDisplay.textContent = severityLabels[value];
    
    // Atualizar cor do display
    severityDisplay.setAttribute('data-level', value);
    severityDisplay.style.color = severityColors[value];
  });

  // ===== CONTADOR DE CARACTERES =====
  observationsEl.addEventListener('input', function() {
    const length = this.value.length;
    charCountEl.textContent = length;
    currentSymptom.observations = this.value;
    
    // Muda cor quando próximo do limite
    if (length > 450) {
      charCountEl.style.color = '#f87171';
    } else {
      charCountEl.style.color = 'var(--text-muted)';
    }
  });

  // ===== SALVAR SINTOMA =====
  symptomForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validações
    const name = symptomNameEl.value.trim();
    
    if (!name) {
      showToast('Por favor, informe o nome do sintoma', 'error');
      return;
    }
    
    if (!currentSymptom.category) {
      showToast('Por favor, selecione uma categoria', 'error');
      return;
    }
    
    // Criar objeto de sintoma
    const symptomEntry = {
      id: Date.now(),
      name: name,
      category: currentSymptom.category,
      severity: currentSymptom.severity,
      severityLabel: severityLabels[currentSymptom.severity],
      observations: currentSymptom.observations,
      date: new Date().toISOString(),
      userId: currentUser.id || currentUser.email
    };
    
    // Salvar no localStorage
    saveSymptomEntry(symptomEntry);
    
    // Mostrar toast de sucesso
    showToast('Sintoma registrado com sucesso!', 'success');
    
    // Resetar formulário
    resetForm();
    
    // Trocar para aba de histórico
    setTimeout(() => {
      document.querySelector('.tab-btn[data-tab="historico"]').click();
    }, 1000);
  });

  // ===== BOTÃO CANCELAR =====
  btnCancel.addEventListener('click', function() {
    resetForm();
  });

  // ===== FUNÇÕES AUXILIARES =====
  
  // Salvar no localStorage
  function saveSymptomEntry(entry) {
    let entries = JSON.parse(localStorage.getItem('symptomEntries') || '[]');
    entries.unshift(entry); // Adiciona no início
    
    // Limita a 50 registros
    if (entries.length > 50) {
      entries = entries.slice(0, 50);
    }
    
    localStorage.setItem('symptomEntries', JSON.stringify(entries));
  }

  // Resetar formulário
  function resetForm() {
    symptomNameEl.value = '';
    observationsEl.value = '';
    charCountEl.textContent = '0';
    
    // Resetar categoria
    categoryBtns.forEach(btn => btn.classList.remove('active'));
    
    // Resetar slider
    severitySlider.value = 3;
    severityDisplay.textContent = 'Moderado';
    severityDisplay.style.color = severityColors[3];
    severityDisplay.setAttribute('data-level', '3');
    
    // Resetar estado
    currentSymptom = {
      name: '',
      category: '',
      severity: 3,
      observations: ''
    };
  }

  // ===== TOAST =====
  function showToast(message, type = 'success') {
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    if (toastMessage) {
      toastMessage.textContent = message;
    }
    
    // Mudar cor baseado no tipo
    if (type === 'error') {
      toast.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))';
      if (toastIcon) {
        toastIcon.setAttribute('data-lucide', 'alert-circle');
      }
    } else {
      toast.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))';
      if (toastIcon) {
        toastIcon.setAttribute('data-lucide', 'check-circle');
      }
    }
    
    toast.removeAttribute('hidden');
    
    // Recriar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    // Auto-hide após 3 segundos
    setTimeout(() => {
      toast.setAttribute('hidden', '');
    }, 3000);
  }

  // ===== HISTÓRICO =====
  function loadHistory() {
    const entries = JSON.parse(localStorage.getItem('symptomEntries') || '[]');
    
    if (entries.length === 0) {
      // Mostrar empty state
      historyList.innerHTML = `
        <div class="empty-state" id="emptyState">
          <i data-lucide="heart" class="empty-icon"></i>
          <p class="empty-text">Nenhum sintoma registrado ainda</p>
          <p class="empty-hint">Registre seu primeiro sintoma!</p>
        </div>
      `;
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
      return;
    }
    
    // Agrupar por data
    const groupedEntries = groupByDate(entries);
    
    // Renderizar grupos
    historyList.innerHTML = '';
    
    Object.keys(groupedEntries).forEach(dateKey => {
      const group = groupedEntries[dateKey];
      
      const groupEl = document.createElement('div');
      groupEl.className = 'history-group';
      
      // Header da data
      const dateHeader = document.createElement('div');
      dateHeader.className = 'history-date-header';
      dateHeader.textContent = formatDateHeader(dateKey);
      groupEl.appendChild(dateHeader);
      
      // Items do grupo
      group.forEach(entry => {
        const itemEl = createHistoryItem(entry);
        groupEl.appendChild(itemEl);
      });
      
      historyList.appendChild(groupEl);
    });
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Agrupar sintomas por data
  function groupByDate(entries) {
    const grouped = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(entry);
    });
    
    return grouped;
  }

  // Formatar header de data
  function formatDateHeader(dateKey) {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) {
      return 'Hoje';
    } else if (dateStr === yesterdayStr) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      });
    }
  }

  // Criar item de histórico
  function createHistoryItem(entry) {
    const date = new Date(entry.date);
    const timeStr = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const categoryLabels = {
      'fisico': 'Físico',
      'mental': 'Mental',
      'sono': 'Sono',
      'energia': 'Energia',
      'outro': 'Outro'
    };
    
    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';
    itemEl.innerHTML = `
      <div class="history-item-header">
        <span class="history-time">${timeStr}</span>
      </div>
      <div class="history-symptoms">
        <div class="symptom-row">
          <span class="symptom-category ${entry.category}">
            ${categoryLabels[entry.category]}
          </span>
          <span class="symptom-name">${entry.name}</span>
          <span class="symptom-severity">${entry.severityLabel}</span>
        </div>
      </div>
    `;
    
    // Adicionar evento de clique para abrir modal
    itemEl.addEventListener('click', () => {
      openSymptomModal(entry);
    });
    
    return itemEl;
  }

  // ===== MODAL DE DETALHES =====
  function openSymptomModal(entry) {
    const categoryLabels = {
      'fisico': 'Físico',
      'mental': 'Mental',
      'sono': 'Sono',
      'energia': 'Energia',
      'outro': 'Outro'
    };
    
    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    symptomModalContent.innerHTML = `
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Data e Hora</div>
        <div class="symptom-detail-value">${dateStr}</div>
      </div>
      
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Sintoma</div>
        <div class="symptom-detail-value">${entry.name}</div>
      </div>
      
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Categoria</div>
        <div class="symptom-detail-value">
          <span class="symptom-category ${entry.category}">
            ${categoryLabels[entry.category]}
          </span>
        </div>
      </div>
      
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Gravidade</div>
        <div class="symptom-detail-value">${entry.severityLabel} (${entry.severity}/5)</div>
      </div>
      
      ${entry.observations ? `
        <div class="symptom-detail-row">
          <div class="symptom-detail-label">Observações</div>
          <div class="symptom-detail-value">${entry.observations}</div>
        </div>
      ` : ''}
    `;
    
    symptomModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function closeSymptomModalFunc() {
    symptomModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  if (closeSymptomModal) {
    closeSymptomModal.addEventListener('click', closeSymptomModalFunc);
  }

  if (symptomOverlay) {
    symptomOverlay.addEventListener('click', closeSymptomModalFunc);
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
      closeSymptomModalFunc();
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

  const emergencySettingsLink = document.getElementById('emergencySettingsLink');
  if (emergencySettingsLink) {
    emergencySettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeEmergencyModal();
      window.location.href = '../pages/configuracoes.html';
    });
  }

  // ===== INICIALIZAÇÃO =====
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  console.log('🎉 Registro de Sintomas carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);

})();