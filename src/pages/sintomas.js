// sintomas.js - Lógica completa do Registro de Sintomas com API
(function () {
  'use strict';

  let token = null; // Armazenará o token de autenticação
  let currentUser = null; // Armazenará os dados do usuário

  // ===== AUTENTICAÇÃO =====
  // ===== AUTENTICAÇÃO (VERSÃO CORRIGIDA) =====
  function checkAuth() {
    token = localStorage.getItem('token'); // Define o token global
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      window.location.href = '../pages/login.html';
      return false; // Retorna 'false' se falhar
    }

    try {
      currentUser = JSON.parse(userStr); // Define o currentUser global

      // ===== A CORREÇÃO ESTÁ AQUI =====
      // Garante que o contato de emergência (se vier como string do DB) 
      // seja convertido em objeto.
      if (currentUser.emergencyContact && typeof currentUser.emergencyContact === 'string') {
        currentUser.emergencyContact = JSON.parse(currentUser.emergencyContact);
      }
      // ==================================

      return true; // Retorna 'true' se sucesso
    } catch (err) {
      console.error('Erro ao parsear dados do usuário:', err);
      localStorage.clear();
      window.location.href = '../pages/login.html';
      return false;
    }
  }

  // Se checkAuth retornar false, interrompe a execução do script
  if (!checkAuth()) return;

  // ===== PERSONALIZAÇÃO DO USUÁRIO =====
  const userInitialsEl = document.getElementById('userInitials');
  if (userInitialsEl && currentUser.firstName) {
    const initials =
      currentUser.firstName.charAt(0).toUpperCase() +
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
  const btnSave = document.getElementById('btnSave'); // Botão Salvar
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
    observations: '',
  };

  // ===== NAVEGAÇÃO DE TABS (Sem alterações) =====
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      tabContents.forEach((content) => content.classList.remove('active'));

      if (targetTab === 'registrar') {
        document.getElementById('tabRegistrar').classList.add('active');
      } else if (targetTab === 'historico') {
        document.getElementById('tabHistorico').classList.add('active');
        loadHistory(); // Recarrega histórico ao trocar de aba
      }
    });
  });

  // ===== SELEÇÃO DE CATEGORIA (Sem alterações) =====
  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      categoryBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      currentSymptom.category = this.dataset.category;
    });
  });

  // ===== SEVERITY SLIDER (Sem alterações) =====
  const severityLabels = {
    1: 'Muito Leve',
    2: 'Leve',
    3: 'Moderado',
    4: 'Grave',
    5: 'Muito Grave',
  };
  const severityColors = {
    1: '#34D399',
    2: '#FBBF24',
    3: '#FB923C',
    4: '#F87171',
    5: '#DC2626',
  };
  severitySlider.addEventListener('input', function () {
    const value = parseInt(this.value);
    currentSymptom.severity = value;
    severityDisplay.textContent = severityLabels[value];
    severityDisplay.style.color = severityColors[value];
  });

  // ===== CONTADOR DE CARACTERES (Sem alterações) =====
  observationsEl.addEventListener('input', function () {
    const length = this.value.length;
    charCountEl.textContent = length;
    currentSymptom.observations = this.value;
    if (length > 450) {
      charCountEl.style.color = '#f87171';
    } else {
      charCountEl.style.color = 'var(--text-muted)';
    }
  });

  // ===== SALVAR SINTOMA (MODIFICADO PARA API) =====
  symptomForm.addEventListener('submit', async function (e) {
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
    
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Salvando...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Criar objeto de sintoma
    const symptomEntryData = {
      name: name,
      category: currentSymptom.category,
      severity: currentSymptom.severity,
      severityLabel: severityLabels[currentSymptom.severity],
      observations: currentSymptom.observations,
    };

    try {
      // Salvar na API
      await saveSymptomEntry(symptomEntryData);

      showToast('Sintoma registrado com sucesso!', 'success');
      resetForm();
      
      // Trocar para aba de histórico e recarregar
      document.querySelector('.tab-btn[data-tab="historico"]').click();
      // loadHistory() já é chamado ao clicar na tab

    } catch (err) {
      console.error('Erro ao salvar sintoma:', err);
      showToast(err.message || 'Erro ao salvar sintoma', 'error');
    } finally {
       if (btnSave) {
          btnSave.disabled = false;
          btnSave.innerHTML = '<i data-lucide="save"></i> Salvar Sintomas';
          if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
  });

  // ===== BOTÃO CANCELAR (Sem alterações) =====
  btnCancel.addEventListener('click', function () {
    resetForm();
  });

  // ===== FUNÇÕES AUXILIARES (MODIFICADAS) =====

  // Salvar na API (MODIFICADO)
  async function saveSymptomEntry(entryData) {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Envia o token
      },
      body: JSON.stringify({
        type: 'symptom', // Define o tipo da entrada
        data: entryData, // Envia os dados do sintoma
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Não foi possível salvar o sintoma');
    }
  }

  // Resetar formulário (Sem alterações)
  function resetForm() {
    symptomNameEl.value = '';
    observationsEl.value = '';
    charCountEl.textContent = '0';
    categoryBtns.forEach((btn) => btn.classList.remove('active'));
    severitySlider.value = 3;
    severityDisplay.textContent = 'Moderado';
    severityDisplay.style.color = severityColors[3];
    currentSymptom = {
      name: '',
      category: '',
      severity: 3,
      observations: '',
    };
  }

  // ===== TOAST (Sem alterações) =====
  function showToast(message, type = 'success') {
    if (!toast) return;
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    if (toastMessage) {
      toastMessage.textContent = message;
    }
    
    if (type === 'error') {
      toast.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))';
      if (toastIcon) toastIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
      toast.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))';
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

  // ===== HISTÓRICO (MODIFICADO PARA API) =====
  async function loadHistory() {
    try {
      // Buscar entradas da API
      const res = await fetch('/api/entries?type=symptom', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, // Envia o token
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Não foi possível carregar o histórico');
      }

      const entries = await res.json(); // O backend já retorna em ordem

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

      // Agrupar por data (função auxiliar do seu código original)
      const groupedEntries = groupByDate(entries);
      
      historyList.innerHTML = ''; // Limpa a lista
      
      // Renderizar grupos
      // Usando Object.keys para manter a ordem de inserção (datas mais recentes primeiro)
      const dateKeys = Object.keys(groupedEntries);

      dateKeys.forEach((dateKey) => {
        const group = groupedEntries[dateKey];
        const groupEl = document.createElement('div');
        groupEl.className = 'history-group';

        // Header da data
        const dateHeader = document.createElement('div');
        dateHeader.className = 'history-date-header';
        dateHeader.textContent = formatDateHeader(dateKey);
        groupEl.appendChild(dateHeader);

        // Items do grupo
        group.forEach((entry) => {
          // Passa o 'entry' completo, que inclui o ID principal
          const itemEl = createHistoryItem(entry); 
          groupEl.appendChild(itemEl);
        });

        historyList.appendChild(groupEl);
      });

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

    } catch (err) {
      console.error('Erro ao carregar histórico da API:', err);
       historyList.innerHTML = `<div class="empty-state" style="padding: 40px;">
        <i data-lucide="alert-circle" class="empty-icon" style="color: #f87171;"></i>
        <p class="empty-text">Erro ao carregar histórico</p>
        <p class="empty-hint">${err.message}</p>
      </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  // Agrupar sintomas por data (Função original - MODIFICADA para usar created_at)
  function groupByDate(entries) {
    const grouped = {};
    entries.forEach((entry) => {
      const date = new Date(entry.created_at); // Usar data do backend
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });
    return grouped;
  }

  // Formatar header de data (Função original - Sem alterações)
  function formatDateHeader(dateKey) {
    const date = new Date(dateKey); // dateKey já está em UTC, new Date() converte para local
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
      // Ajuste para garantir que a data local seja exibida corretamente
      const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      return localDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
      });
    }
  }

  // Criar item de histórico (Função original - MODIFICADA para usar entry.data)
  function createHistoryItem(entry) {
    const entryData = entry.data; // Dados aninhados
    const date = new Date(entry.created_at); // Data do backend
    const timeStr = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const categoryLabels = {
      'fisico': 'Físico',
      'mental': 'Mental',
      'sono': 'Sono',
      'energia': 'Energia',
      'outro': 'Outro',
    };

    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';
    // Adiciona data-id do 'entry' principal para o modal
    itemEl.setAttribute('data-entry-id', entry.id); 
    
    itemEl.innerHTML = `
      <div class="history-item-header">
        <span class="history-time">${timeStr}</span>
      </div>
      <div class="history-symptoms">
        <div class="symptom-row">
          <span class="symptom-category ${entryData.category}">
            ${categoryLabels[entryData.category]}
          </span>
          <span class="symptom-name">${entryData.name}</span>
          <span class="symptom-severity">${entryData.severityLabel}</span>
        </div>
      </div>
    `;

    // Adicionar evento de clique para abrir modal
    itemEl.addEventListener('click', () => {
      openSymptomModal(entry); // Passa o 'entry' completo
    });

    return itemEl;
  }

  // ===== MODAL DE DETALHES (MODIFICADO para usar entry.data) =====
  function openSymptomModal(entry) {
    const entryData = entry.data; // Dados aninhados
    const date = new Date(entry.created_at); // Data do backend
    
    const categoryLabels = {
      'fisico': 'Físico',
      'mental': 'Mental',
      'sono': 'Sono',
      'energia': 'Energia',
      'outro': 'Outro',
    };

    const dateStr = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    symptomModalContent.innerHTML = `
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Data e Hora</div>
        <div class="symptom-detail-value">${dateStr}</div>
      </div>
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Sintoma</div>
        <div class="symptom-detail-value">${entryData.name}</div>
      </div>
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Categoria</div>
        <div class="symptom-detail-value">
          <span class="symptom-category ${entryData.category}">
            ${categoryLabels[entryData.category]}
          </span>
        </div>
      </div>
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Gravidade</div>
        <div class="symptom-detail-value">${entryData.severityLabel} (${
      entryData.severity
    }/5)</div>
      </div>
      ${
        entryData.observations
          ? `
      <div class="symptom-detail-row">
        <div class="symptom-detail-label">Observações</div>
        <div class="symptom-detail-value">${entryData.observations}</div>
      </div>
      `
          : ''
      }
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
      if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.setAttribute('hidden', '');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ===== MODAL DE EMERGÊNCIA (Sem alterações) =====
  const emergencyBtn = document.getElementById('emergencyBtn');
  const emergencyModal = document.getElementById('emergencyModal');
  const emergencyOverlay = document.getElementById('emergencyOverlay');
  const closeEmergency = document.getElementById('closeEmergency');
  function openEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';

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
  if (emergencyBtn) emergencyBtn.addEventListener('click', openEmergencyModal);
  if (closeEmergency) closeEmergency.addEventListener('click', closeEmergencyModal);
  if (emergencyOverlay) emergencyOverlay.addEventListener('click', closeEmergencyModal);

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
      if (badge) badge.style.display = 'none';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
  function closeNotificationModal() {
    if (notificationModal) {
      notificationModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }
  if (notificationBtn) notificationBtn.addEventListener('click', openNotificationModal);
  if (closeNotification) closeNotification.addEventListener('click', closeNotificationModal);
  if (notificationOverlay) notificationOverlay.addEventListener('click', closeNotificationModal);

  // ===== FIX DO CONTATO DE EMERGÊNCIA =====
  function loadEmergencyContact() {
    const contact = currentUser.emergencyContact;
    const display = document.getElementById('emergencyPhoneDisplay');
    
    if (display) {
        if (contact && contact.name && contact.phone) {
            display.textContent = contact.phone;
        } else {
            display.textContent = 'Não cadastrado';
        }
    }
  }

  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEmergencyModal();
      closeNotificationModal();
      closeSymptomModalFunc();
    }
  });

  // ===== SISTEMA DE NAVEGAÇÃO UNIVERSAL (Sem alterações) =====
  function showDevelopmentAlert(featureName) {
    alert(
      `Ainda estamos desenvolvendo essa funcionalidade: ${featureName} 🚧\n\nEm breve estará disponível!`
    );
  }
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-feature]');
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
  const featureNames = {
    'tendencias': 'Tendências e Relatórios',
    'avaliacoes': 'Autoavaliações',
    'autocuidado': 'Autocuidado',
    'configuracoes': 'Configurações',
    'perfil': 'Perfil'
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
      const confirmLogout = window.confirm('Deseja realmente sair?');
      if (confirmLogout) {
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
  // Carrega o histórico da API ao iniciar (se a aba de histórico estiver ativa, o que não é o padrão)
  // O clique na aba 'historico' irá disparar o loadHistory()
  if (document.getElementById('tabHistorico').classList.contains('active')) {
      loadHistory();
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  console.log('🎉 Registro de Sintomas (API) carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();