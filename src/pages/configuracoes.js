// configuracoes.js – Lógica completa da página de Configurações
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

    // ===== FUNÇÕES DE CONTATO DE EMERGÊNCIA =====
    
    // Carregar contato de emergência
    function loadEmergencyContact() {
        const contact = JSON.parse(localStorage.getItem('emergencyContact') || 'null');
        
        if (contact) {
            // Atualizar display na página de configurações
            emergencyContactDisplay.textContent = `${contact.name} - ${contact.phone}`;
            
            // Atualizar display no modal de emergência
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
        const contact = JSON.parse(localStorage.getItem('emergencyContact') || 'null');
        
        if (contact) {
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

    // Máscara de telefone
    function phoneMask(value) {
        if (!value) return '';
        value = value.replace(/\D/g, '');
        value = value.substring(0, 11);
        if (value.length <= 10) {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        return value;
    }

    // Event listener para máscara de telefone
    if (contactPhoneInput) {
        contactPhoneInput.addEventListener('input', function(e) {
            e.target.value = phoneMask(e.target.value);
        });
    }

    // Salvar contato de emergência
    if (emergencyContactForm) {
        emergencyContactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = contactNameInput.value.trim();
            const phone = contactPhoneInput.value.trim();

            // Validações
            if (!name) {
                showToast('Por favor, informe o nome do contato', 'error');
                return;
            }

            if (!phone || phone.length < 14) {
                showToast('Por favor, informe um número válido', 'error');
                return;
            }

            // Salvar no localStorage
            const contact = { name, phone };
            localStorage.setItem('emergencyContact', JSON.stringify(contact));

            // Atualizar display
            loadEmergencyContact();

            // Fechar modal
            closeEmergencyContactModal();

            // Mostrar toast de sucesso
            showToast('Contato de emergência salvo com sucesso!', 'success');
        });
    }

    // Excluir contato de emergência
    if (deleteContactBtn) {
        deleteContactBtn.addEventListener('click', function() {
            if (confirm('Deseja realmente excluir o contato de emergência?')) {
                localStorage.removeItem('emergencyContact');
                loadEmergencyContact();
                closeEmergencyContactModal();
                showToast('Contato de emergência excluído', 'success');
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
    
    // Editar Perfil
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            window.location.href = '../pages/perfil.html';
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Deseja realmente sair da sua conta?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../pages/landing.html';
            }
        });
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
            // Atualizar display do contato
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
            closeEmergencyContactModal();
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

    // ===== DROPDOWN DO PERFIL – LINKS =====
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

    // ===== INICIALIZAÇÃO =====
    
    // Carregar contato de emergência ao iniciar
    loadEmergencyContact();

    // Inicializar ícones Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('🎉 Configurações carregado com sucesso!');
    console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();