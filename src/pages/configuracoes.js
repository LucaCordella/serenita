// configuracoes.js – Lógica completa da página de Configurações com API
(function () {
  'use strict';

  let token = null; // Armazenará o token de autenticação
  let currentUser = null; // Armazenará os dados do usuário

  // ===== AUTENTICAÇÃO =====
  function checkAuth() {
    token = localStorage.getItem('token'); // Pega o token para usar no fetch
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      window.location.href = '../pages/login.html';
      return false;
    }

    try {
      currentUser = JSON.parse(userStr);
      // O contato de emergência pode vir como string JSON do DB
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

  if (!checkAuth()) return; // Para a execução se não estiver logado

  // ===== PERSONALIZAÇÃO DO USUÁRIO =====
  const userInitialsEl = document.getElementById('userInitials');
  if (userInitialsEl && currentUser.firstName) {
    const initials =
      currentUser.firstName.charAt(0).toUpperCase() +
      (currentUser.lastName ? currentUser.lastName.charAt(0).toUpperCase() : '');
    userInitialsEl.textContent = initials;
  }

  // ===== ELEMENTOS DO DOM =====
  // Botões principais
  const editProfileBtn = document.getElementById('editProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const manageEmergencyBtn = document.getElementById('manageEmergencyBtn');
  
  // Modal de contato de emergência
  const emergencyContactModal = document.getElementById('emergencyContactModal');
  const emergencyContactOverlay = document.getElementById('emergencyContactOverlay');
  const closeEmergencyContact = document.getElementById('closeEmergencyContact');
  const emergencyContactForm = document.getElementById('emergencyContactForm');
  const contactNameInput = document.getElementById('contactName');
  const contactPhoneInput = document.getElementById('contactPhone');
  const deleteContactBtn = document.getElementById('deleteContactBtn');
  const emergencyContactDisplay = document.getElementById('emergencyContactDisplay');
  
  // Display do contato no modal de emergência principal
  const emergencyPhoneDisplay = document.getElementById('emergencyPhoneDisplay');
  
  // Toast
  const toast = document.getElementById('toast');

  // ===== FUNÇÕES DE CONTATO DE EMERGÊNCIA (MODIFICADO) =====

  // Carregar contato de emergência (agora lê do currentUser)
  function loadEmergencyContact() {
    // currentUser já foi carregado e parseado no checkAuth()
    const contact = currentUser.emergencyContact; 

    if (contact && contact.name && contact.phone) {
      // Atualizar display na página de configurações
      emergencyContactDisplay.textContent = `${contact.name} - ${contact.phone}`;
      // Atualizar display no modal de emergência (se existir na página)
      if (emergencyPhoneDisplay) {
        emergencyPhoneDisplay.textContent = contact.phone;
      }
    } else {
      emergencyContactDisplay.textContent = 'Nenhum número cadastrado';
      if (emergencyPhoneDisplay) {
        emergencyPhoneDisplay.textContent = 'Não cadastrado';
      }
    }
  }

  // Abrir modal de gerenciamento de contato
  function openEmergencyContactModal() {
    const contact = currentUser.emergencyContact;

    if (contact && contact.name) {
      // Preencher formulário com dados existentes
      contactNameInput.value = contact.name;
      contactPhoneInput.value = contact.phone;
      deleteContactBtn.style.display = 'flex';
    } else {
      // Limpar formulário
      contactNameInput.value = '';
      contactPhoneInput.value = '';
      deleteContactBtn.style.display = 'none';
    }
    emergencyContactModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Fechar modal de contato de emergência
  function closeEmergencyContactModal() {
    emergencyContactModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // Máscara de telefone (Sem alterações)
  function phoneMask(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    value = value.substring(0, 11); // Limita a 11 dígitos
    
    // (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
       value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    } else {
       value = value.replace(/^(\d*)/, '($1');
    }
    return value;
  }
  
  if (contactPhoneInput) {
    contactPhoneInput.addEventListener('input', function (e) {
      e.target.value = phoneMask(e.target.value);
    });
  }

  // Salvar/Atualizar perfil na API
  async function updateProfileOnAPI(updatedUser) {
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
  }


  // Salvar contato de emergência (MODIFICADO)
  if (emergencyContactForm) {
    emergencyContactForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = contactNameInput.value.trim();
      const phone = contactPhoneInput.value.trim();

      if (!name) {
        showToast('Por favor, informe o nome do contato', 'error');
        return;
      }
      if (!phone || (phone.length < 14 && phone.length < 15)) { // (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
        showToast('Por favor, informe um número válido', 'error');
        return;
      }

      // Prepara o objeto de usuário atualizado
      const updatedUser = {
        ...currentUser, // Pega todos os dados atuais
        emergencyContact: { name, phone } // Atualiza apenas o contato
      };
      
      try {
        // Envia o usuário completo para a API
        await updateProfileOnAPI(updatedUser);
        
        loadEmergencyContact();
        closeEmergencyContactModal();
        showToast('Contato de emergência salvo com sucesso!', 'success');
        
      } catch (err) {
         showToast(err.message, 'error');
      }
    });
  }

  // Excluir contato de emergência (MODIFICADO)
  if (deleteContactBtn) {
    deleteContactBtn.addEventListener('click', async function () {
      if (confirm('Deseja realmente excluir o contato de emergência?')) {
        
        // Prepara o objeto de usuário atualizado
        const updatedUser = {
          ...currentUser,
          emergencyContact: null // Remove o contato
        };

        try {
          // Envia o usuário completo para a API
          await updateProfileOnAPI(updatedUser);
          
          loadEmergencyContact();
          closeEmergencyContactModal();
          showToast('Contato de emergência excluído', 'success');

        } catch (err) {
           showToast(err.message, 'error');
        }
      }
    });
  }

  // Event listeners do modal
  if (manageEmergencyBtn) {
    manageEmergencyBtn.addEventListener('click', openEmergencyContactModal);
  }
  if (closeEmergencyContact) {
    closeEmergencyContact.addEventListener('click', closeEmergencyContactModal);
  }
  if (emergencyContactOverlay) {
    emergencyContactOverlay.addEventListener('click', closeEmergencyContactModal);
  }

// ===== BOTÕES PRINCIPAIS =====

  // Editar Perfil (manda para a página de perfil)
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function () {
      window.location.href = '../pages/perfil.html';
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (confirm('Deseja realmente sair da sua conta?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../pages/landing.html';
      }
    });
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

  // ===== MODAL DE EMERGÊNCIA (Sem alterações) =====
  const emergencyBtn = document.getElementById('emergencyBtn');
  const emergencyModal = document.getElementById('emergencyModal');
  const emergencyOverlay = document.getElementById('emergencyOverlay');
  const closeEmergency = document.getElementById('closeEmergency');
  
  function openEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      // Atualizar display do contato
      loadEmergencyContact(); // Garante que o número está atualizado no modal
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
      closeEmergencyContactModal(); // Fecha também o modal de contato
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
    perfil: 'Perfil',
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
  const logoutLinkDropdown = document.getElementById('logoutLink');
  
  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '../pages/perfil.html';
    });
  }
  if (logoutLinkDropdown) {
    logoutLinkDropdown.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../pages/landing.html';
      }
    });
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

  // ===== INICIALIZAÇÃO =====
  loadEmergencyContact(); // Carregar contato de emergência ao iniciar
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  console.log('🎉 Configurações carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();