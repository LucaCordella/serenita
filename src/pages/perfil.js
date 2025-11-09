// perfil.js – Lógica completa da Página de Perfil

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
    
    // Configurações - Settings
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
    
    // Estado
    let isEditingBio = false;
    let userAvatar = null; // Armazenará base64 da imagem

    // ===== PERSONALIZAÇÃO INICIAL =====
    function initializeProfile() {
        // Carregar dados do usuário do localStorage
        const profileData = getProfileData();
        
        // Atualizar iniciais no header
        updateInitials(profileData);
        
        // Atualizar visão geral
        updateProfileView(profileData);
        
        // Atualizar formulário de configurações
        updateSettingsForm(profileData);
        
        // Carregar estatísticas
        loadStatistics();
        
        // Carregar avatar se existir
        if (profileData.avatar) {
            userAvatar = profileData.avatar;
            updateAvatarDisplay(userAvatar);
        }
    }
    
    function getProfileData() {
        const saved = localStorage.getItem('profileData');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Erro ao carregar profileData:', e);
            }
        }
        
        // Dados padrão do usuário logado
        return {
            firstName: currentUser.firstName || 'Usuário',
            lastName: currentUser.lastName || '',
            email: currentUser.email || 'usuario@serenita.com',
            biography: '',
            avatar: null,
            birthDate: null,
            memberSince: currentUser.createdAt || new Date().toISOString(),
            reminderTime: '20:00'
        };
    }
    
    function saveProfileData(data) {
        localStorage.setItem('profileData', JSON.stringify(data));
        
        // Atualizar também o objeto user no localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.firstName = data.firstName;
        user.lastName = data.lastName;
        user.email = data.email;
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    function updateInitials(data) {
        const initials = (data.firstName.charAt(0) + (data.lastName.charAt(0) || '')).toUpperCase();
        if (userInitialsEl) {
            userInitialsEl.textContent = initials;
        }
        if (profileInitialsLarge) {
            profileInitialsLarge.textContent = initials;
        }
        if (settingsInitials) {
            settingsInitials.textContent = initials;
        }
    }
    
    function updateProfileView(data) {
        // Nome e Email
        if (profileName) {
            profileName.textContent = `${data.firstName} ${data.lastName}`.trim();
        }
        if (profileEmail) {
            profileEmail.textContent = data.email;
        }
        
        // Idade (calcular se tiver birthDate)
        if (profileAge) {
            if (data.birthDate) {
                const age = calculateAge(data.birthDate);
                profileAge.textContent = `${age} anos`;
            } else {
                profileAge.textContent = 'Não informado';
            }
        }
        
        // Membro desde
        if (memberSince) {
            const date = new Date(data.memberSince);
            const formatted = date.toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
            });
            memberSince.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        
        // Biografia
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
    
    function updateSettingsForm(data) {
        if (firstNameInput) firstNameInput.value = data.firstName || '';
        if (lastNameInput) lastNameInput.value = data.lastName || '';
        if (emailInput) emailInput.value = data.email || '';
        if (biographyInput) {
            biographyInput.value = data.biography || '';
            updateBiographyCharCount();
        }
        if (reminderTimeInput) reminderTimeInput.value = data.reminderTime || '20:00';
    }
    
    function calculateAge(birthDate) {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

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
            if (targetTab === 'visao-geral') {
                document.getElementById('tabVisaoGeral').classList.add('active');
            } else if (targetTab === 'configuracoes') {
                document.getElementById('tabConfiguracoes').classList.add('active');
            }
        });
    });

    // ===== AVATAR - VISÃO GERAL =====
    if (avatarEditBtn && avatarInput) {
        avatarEditBtn.addEventListener('click', () => {
            avatarInput.click();
        });
        
        avatarInput.addEventListener('change', handleAvatarChange);
    }
    
    // ===== AVATAR - CONFIGURAÇÕES =====
    if (changeAvatarBtn && avatarInputSettings) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarInputSettings.click();
        });
        
        avatarInputSettings.addEventListener('change', handleAvatarChange);
    }
    
    function handleAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione uma imagem válida', 'error');
            return;
        }
        
        // Validar tamanho (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('A imagem deve ter no máximo 2MB', 'error');
            return;
        }
        
        // Converter para base64
        const reader = new FileReader();
        reader.onload = function(event) {
            userAvatar = event.target.result;
            updateAvatarDisplay(userAvatar);
            
            // Salvar no localStorage
            const profileData = getProfileData();
            profileData.avatar = userAvatar;
            saveProfileData(profileData);
            
            showToast('Avatar atualizado com sucesso!', 'success');
        };
        reader.readAsDataURL(file);
    }
    
    function updateAvatarDisplay(avatarBase64) {
        // Atualizar avatar grande (visão geral)
        if (profileAvatarLarge && profileInitialsLarge) {
            if (avatarBase64) {
                profileAvatarLarge.style.backgroundImage = `url(${avatarBase64})`;
                profileAvatarLarge.style.backgroundSize = 'cover';
                profileAvatarLarge.style.backgroundPosition = 'center';
                profileInitialsLarge.style.display = 'none';
            } else {
                profileAvatarLarge.style.backgroundImage = 'none';
                profileInitialsLarge.style.display = 'flex';
            }
        }
        
        // Atualizar preview (configurações)
        if (settingsAvatarPreview && settingsInitials) {
            if (avatarBase64) {
                settingsAvatarPreview.style.backgroundImage = `url(${avatarBase64})`;
                settingsAvatarPreview.style.backgroundSize = 'cover';
                settingsAvatarPreview.style.backgroundPosition = 'center';
                settingsInitials.style.display = 'none';
            } else {
                settingsAvatarPreview.style.backgroundImage = 'none';
                settingsInitials.style.display = 'flex';
            }
        }
    }

    // ===== EDIÇÃO DE BIOGRAFIA (VISÃO GERAL) =====
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
        const profileData = getProfileData();
        
        bioTextarea.value = profileData.biography || '';
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
    
    function saveBioChanges() {
        const newBio = bioTextarea.value.trim();
        const profileData = getProfileData();
        
        profileData.biography = newBio;
        saveProfileData(profileData);
        
        updateProfileView(profileData);
        exitBioEditMode();
        
        showToast('Biografia atualizada com sucesso!', 'success');
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

    // ===== CONTADOR DE CARACTERES DA BIOGRAFIA (CONFIGURAÇÕES) =====
    if (biographyInput) {
        biographyInput.addEventListener('input', updateBiographyCharCount);
    }
    
    function updateBiographyCharCount() {
        const length = biographyInput.value.length;
        biographyCharCount.textContent = length;
        
        if (length > 270) {
            biographyCharCount.style.color = '#f87171';
        } else {
            biographyCharCount.style.color = 'var(--text-muted)';
        }
    }

    // ===== FORMULÁRIO DE CONFIGURAÇÕES =====
    if (profileSettingsForm) {
        profileSettingsForm.addEventListener('submit', handleSettingsSubmit);
    }
    
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', () => {
            const profileData = getProfileData();
            updateSettingsForm(profileData);
            showToast('Alterações descartadas', 'error');
        });
    }
    
    function handleSettingsSubmit(e) {
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
        
        // Salvar dados
        const profileData = getProfileData();
        profileData.firstName = firstName;
        profileData.lastName = lastName;
        profileData.email = email;
        profileData.biography = biography;
        profileData.reminderTime = reminderTime;
        
        saveProfileData(profileData);
        
        // Atualizar views
        updateInitials(profileData);
        updateProfileView(profileData);
        
        showToast('Perfil atualizado com sucesso!', 'success');
        
        // Voltar para aba de visão geral
        setTimeout(() => {
            document.querySelector('.tab-btn[data-tab="visao-geral"]').click();
        }, 1000);
    }
    
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ===== ESTATÍSTICAS =====
    function loadStatistics() {
        // Carregar registros de humor
        const moodEntries = JSON.parse(localStorage.getItem('moodEntries') || '[]');
        if (statMoodEntries) {
            statMoodEntries.textContent = moodEntries.length;
        }
        
        // Carregar sintomas
        const symptomEntries = JSON.parse(localStorage.getItem('symptomEntries') || '[]');
        if (statSymptomEntries) {
            statSymptomEntries.textContent = symptomEntries.length;
        }
        
        // Carregar tarefas concluídas
        const tasks = JSON.parse(localStorage.getItem('selfcareTasks') || '[]');
        const completedTasks = tasks.filter(t => t.completed).length;
        if (statTasksCompleted) {
            statTasksCompleted.textContent = completedTasks;
        }
        
        // Carregar práticas
        const practices = JSON.parse(localStorage.getItem('practiceCompletions') || '[]');
        if (statPractices) {
            statPractices.textContent = practices.length;
        }
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
            if (isEditingBio) {
                exitBioEditMode();
            }
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
        'configuracoes': 'Configurações'
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
    const profileLinkDropdown = document.getElementById('profileLink');
    const settingsLink = document.getElementById('settingsLink');
    const logoutLink = document.getElementById('logoutLink');
    
    if (profileLinkDropdown) {
        profileLinkDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            // Já está no perfil, apenas fecha o dropdown
            if (profileDropdown) {
                profileDropdown.setAttribute('hidden', '');
            }
        });
    }
    
    if (settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Trocar para aba de configurações
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
    initializeProfile();
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    console.log('🎉 Página de Perfil carregada com sucesso!');
    console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();