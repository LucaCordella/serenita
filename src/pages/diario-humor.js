// diario-humor.js - Lógica completa do Diário de Humor com API
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
  const moodForm = document.getElementById('moodForm');
  const emojiDisplay = document.getElementById('emojiDisplay');
  const moodNameEl = document.getElementById('moodName');
  const moodLevelEl = document.getElementById('moodLevel');
  const intensitySlider = document.getElementById('intensitySlider');
  const observationsEl = document.getElementById('observations');
  const charCountEl = document.getElementById('charCount');
  const historyList = document.getElementById('historyList');
  const toast = document.getElementById('toast');
  const emojiBtns = document.querySelectorAll('.emoji-btn');
  const btnSave = document.getElementById('btnSave'); // Botão Salvar

  // Estado atual do humor
  let currentMood = {
    emoji: '😐',
    name: 'Neutro',
    value: 3,
    intensity: 3,
    observations: '',
  };

  // ===== FUNÇÕES DE MOOD (Interface - Sem alterações) =====
  
  // Atualizar display do emoji
  function updateEmojiDisplay() {
    const emojiLarge = emojiDisplay.querySelector('.emoji-large');
    if (emojiLarge) {
      emojiLarge.textContent = currentMood.emoji;
    }
    moodNameEl.textContent = currentMood.name;
    moodLevelEl.textContent = currentMood.intensity;
    const colors = {
      1: 'rgba(248,113,113,0.3)',
      2: 'rgba(251,146,60,0.3)',
      3: 'rgba(251,191,36,0.3)',
      4: 'rgba(96,165,250,0.3)',
      5: 'rgba(52,211,153,0.3)',
    };
    const borderColors = {
      1: 'rgba(248,113,113,0.5)',
      2: 'rgba(251,146,60,0.5)',
      3: 'rgba(251,191,36,0.5)',
      4: 'rgba(96,165,250,0.5)',
      5: 'rgba(52,211,153,0.5)',
    };
    emojiDisplay.style.background = `linear-gradient(135deg, ${
      colors[currentMood.intensity]
    }, ${colors[currentMood.intensity]})`;
    emojiDisplay.style.borderColor = borderColors[currentMood.intensity];
  }
  
  // Event listeners para emoji buttons
  emojiBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      emojiBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      currentMood.emoji = this.dataset.emoji;
      currentMood.name = this.dataset.name;
      currentMood.value = parseInt(this.dataset.value);
      currentMood.intensity = parseInt(this.dataset.value);
      intensitySlider.value = currentMood.intensity;
      updateEmojiDisplay();
    });
  });

  // Event listener para intensity slider
  intensitySlider.addEventListener('input', function () {
    currentMood.intensity = parseInt(this.value);
    moodLevelEl.textContent = currentMood.intensity;
    updateEmojiDisplay();
    syncEmojiWithSlider(currentMood.intensity);
  });

  // Sincronizar emoji picker com slider
  function syncEmojiWithSlider(value) {
    emojiBtns.forEach((btn) => btn.classList.remove('active'));
    const targetBtn = Array.from(emojiBtns).find(
      (btn) => parseInt(btn.dataset.value) === value
    );
    if (targetBtn) {
      targetBtn.classList.add('active');
      currentMood.emoji = targetBtn.dataset.emoji;
      currentMood.name = targetBtn.dataset.name;
      currentMood.value = value;
    }
  }

  // Event listener para textarea (contador de caracteres)
  observationsEl.addEventListener('input', function () {
    const length = this.value.length;
    charCountEl.textContent = length;
    currentMood.observations = this.value;
    if (length > 450) {
      charCountEl.style.color = '#f87171';
    } else {
      charCountEl.style.color = 'var(--text-muted)';
    }
  });

  // ===== SALVAR REGISTRO (MODIFICADO PARA API) =====
  moodForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Salvando...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Criar objeto de registro
    const moodEntryData = {
      emoji: currentMood.emoji,
      name: currentMood.name,
      intensity: currentMood.intensity,
      observations: currentMood.observations,
    };

    try {
      // Salvar na API (Substitui localStorage.setItem)
      await saveMoodEntry(moodEntryData);

      showToast('Humor registrado com sucesso!');
      resetForm();
      await loadHistory(); // Recarregar histórico da API
      
    } catch (err) {
      console.error('Erro ao salvar humor:', err);
      showToast(err.message || 'Erro ao salvar registro', 'error');
    } finally {
      if (btnSave) {
          btnSave.disabled = false;
          btnSave.innerHTML = '<i data-lucide="save"></i> Salvar Registro de Humor';
          if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
  });

  // Salvar na API (Função MODIFICADA)
  async function saveMoodEntry(entryData) {
    // A rota /api/entries é protegida, precisamos enviar o token
    const res = await fetch('http://localhost:4000/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Envia o token de autenticação
      },
      body: JSON.stringify({
        type: 'mood', // Define o tipo da entrada [cite: 147]
        data: entryData  // Envia os dados do humor [cite: 147]
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Não foi possível salvar a entrada');
    }
    // Não precisa mais retornar dados, o backend cuidou disso
  }

  // Resetar formulário (Sem alterações)
  function resetForm() {
    observationsEl.value = '';
    charCountEl.textContent = '0';
    currentMood = {
      emoji: '😐',
      name: 'Neutro',
      value: 3,
      intensity: 3,
      observations: '',
    };
    emojiBtns.forEach((btn) => {
      btn.classList.remove('active');
      if (btn.dataset.value === '3') {
        btn.classList.add('active');
      }
    });
    intensitySlider.value = 3;
    updateEmojiDisplay();
  }

  // ===== TOAST (Sem alterações, mas adicionado tipo 'error') =====
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
      // Buscar entradas da API (Substitui localStorage.getItem)
      const res = await fetch('http://localhost:4000/api/entries?type=mood', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}` // Envia o token
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Não foi possível carregar o histórico');
      }

      const entries = await res.json(); // O backend já retorna em ordem [cite: 161]
      
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
      historyList.innerHTML = entries
        .map((entry) => {
          // Os dados do humor estão aninhados em 'entry.data' [cite: 167-168]
          const entryData = entry.data; 
          // A data está em 'entry.created_at' [cite: 161]
          const date = new Date(entry.created_at); 
          
          const dateStr = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
          });
          const timeStr = date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return `
            <div class="history-item">
              <div class="history-emoji" data-intensity="${entryData.intensity}">
                ${entryData.emoji}
              </div>
              <div class="history-content">
                <div class="history-header">
                  <span class="history-date">${dateStr}</span>
                  <span class="history-time">${timeStr}</span>
                </div>
                <p class="history-note">${
                  entryData.observations || 'Sem observações'
                }</p>
              </div>
            </div>
          `;
        })
        .join('');
        
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
    'sintomas': 'Sintomas',
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
  loadHistory(); // Carrega o histórico da API ao iniciar
  updateEmojiDisplay();
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  console.log('🎉 Diário de Humor (API) carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();