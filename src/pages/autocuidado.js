// autocuidado.js – Lógica completa do Autocuidado e Hábitos

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
    
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Tarefas
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const categoryQuickBtns = document.querySelectorAll('.category-quick-btn');
    const tasksList = document.getElementById('tasksList');
    const tasksEmptyState = document.getElementById('tasksEmptyState');
    const tasksProgress = document.getElementById('tasksProgress');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const progressBarFill = document.getElementById('progressBarFill');
    
    // Práticas
    const practiceBtns = document.querySelectorAll('[data-practice-action]');
    const practiceModal = document.getElementById('practiceModal');
    const practiceOverlay = document.getElementById('practiceOverlay');
    const closePractice = document.getElementById('closePractice');
    const practiceModalContent = document.getElementById('practiceModalContent');
    
    // Toast
    const toast = document.getElementById('toast');
    
    // Estado atual
    let selectedCategory = 'social'; // categoria padrão
    let breathingTimer = null;
    let breathingState = 'ready'; // ready, inhale, hold, exhale

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
            if (targetTab === 'tarefas') {
                document.getElementById('tabTarefas').classList.add('active');
                loadTasks(); // Recarrega tarefas
            } else if (targetTab === 'praticas') {
                document.getElementById('tabPraticas').classList.add('active');
            }
        });
    });

    // ===== SELEÇÃO DE CATEGORIA =====
    categoryQuickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active de todos
            categoryQuickBtns.forEach(b => b.classList.remove('active'));
            // Adiciona active no clicado
            this.classList.add('active');
            // Atualiza categoria selecionada
            selectedCategory = this.dataset.category;
        });
    });

    // ===== ADICIONAR TAREFA =====
    
    // Adicionar ao pressionar Enter
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Adicionar ao clicar no botão
    addTaskBtn.addEventListener('click', addTask);
    
    function addTask() {
        const taskName = taskInput.value.trim();
        
        if (!taskName) {
            showToast('Por favor, digite uma tarefa', 'error');
            return;
        }
        
        // Criar objeto de tarefa
        const task = {
            id: Date.now(),
            name: taskName,
            category: selectedCategory,
            completed: false,
            date: new Date().toISOString(),
            userId: currentUser.id || currentUser.email
        };
        
        // Salvar no localStorage
        saveTask(task);
        
        // Limpar input
        taskInput.value = '';
        
        // Recarregar lista
        loadTasks();
        
        // Mostrar toast
        showToast('Tarefa adicionada com sucesso!', 'success');
    }

    // ===== FUNÇÕES DE TAREFAS =====
    
    // Salvar tarefa no localStorage
    function saveTask(task) {
        let tasks = JSON.parse(localStorage.getItem('selfcareTasks') || '[]');
        tasks.unshift(task); // Adiciona no início
        
        // Limita a 100 tarefas
        if (tasks.length > 100) {
            tasks = tasks.slice(0, 100);
        }
        
        localStorage.setItem('selfcareTasks', JSON.stringify(tasks));
    }
    
    // Carregar tarefas
    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('selfcareTasks') || '[]');
        
        // Filtrar tarefas do dia atual
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(task => {
            const taskDate = new Date(task.date).toISOString().split('T')[0];
            return taskDate === today;
        });
        
        if (todayTasks.length === 0) {
            // Mostrar empty state
            tasksList.innerHTML = '';
            tasksEmptyState.style.display = 'block';
            tasksProgress.style.display = 'none';
            return;
        }
        
        // Esconder empty state
        tasksEmptyState.style.display = 'none';
        tasksProgress.style.display = 'block';
        
        // Renderizar tarefas
        tasksList.innerHTML = todayTasks.map(task => createTaskElement(task)).join('');
        
        // Calcular progresso
        updateProgress(todayTasks);
        
        // Adicionar event listeners
        attachTaskListeners();
    }
    
    // Criar elemento HTML de tarefa
    function createTaskElement(task) {
        const categoryLabels = {
            'fisico': 'Físico',
            'mental': 'Mental',
            'social': 'Social'
        };
        
        const categoryIcons = {
            'fisico': 'activity',
            'mental': 'brain',
            'social': 'users'
        };
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle">
                    <i data-lucide="check"></i>
                </button>
                <div class="task-content">
                    <div class="task-text">${task.name}</div>
                    <span class="task-category-badge ${task.category}">
                        <i data-lucide="${categoryIcons[task.category]}"></i>
                        ${categoryLabels[task.category]}
                    </span>
                </div>
                <button class="task-delete" data-action="delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
    }
    
    // Adicionar event listeners nas tarefas
    function attachTaskListeners() {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            const taskId = parseInt(item.dataset.taskId);
            
            // Toggle checkbox
            const checkbox = item.querySelector('[data-action="toggle"]');
            checkbox.addEventListener('click', () => toggleTask(taskId));
            
            // Delete task
            const deleteBtn = item.querySelector('[data-action="delete"]');
            deleteBtn.addEventListener('click', () => deleteTask(taskId));
        });
        
        // Recriar ícones
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    // Marcar/desmarcar tarefa como completa
    function toggleTask(taskId) {
        let tasks = JSON.parse(localStorage.getItem('selfcareTasks') || '[]');
        
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            localStorage.setItem('selfcareTasks', JSON.stringify(tasks));
            loadTasks();
            
            const action = tasks[taskIndex].completed ? 'concluída' : 'reaberta';
            showToast(`Tarefa ${action}!`, 'success');
        }
    }
    
    // Deletar tarefa
    function deleteTask(taskId) {
        if (!confirm('Deseja realmente excluir esta tarefa?')) {
            return;
        }
        
        let tasks = JSON.parse(localStorage.getItem('selfcareTasks') || '[]');
        tasks = tasks.filter(t => t.id !== taskId);
        localStorage.setItem('selfcareTasks', JSON.stringify(tasks));
        loadTasks();
        showToast('Tarefa excluída!', 'success');
    }
    
    // Atualizar barra de progresso
    function updateProgress(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        progressText.textContent = `${completed} de ${total} tarefas concluídas`;
        progressPercent.textContent = `${percentage}% completo`;
        progressBarFill.style.width = `${percentage}%`;
    }

    // ===== PRÁTICAS DE BEM-ESTAR =====
    
    practiceBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const practice = this.dataset.practiceAction;
            openPracticeModal(practice);
        });
    });
    
    function openPracticeModal(practice) {
        let content = '';
        
        switch(practice) {
            case 'respiracao':
                content = createBreathingContent();
                break;
            case 'meditacao':
                content = createMeditationContent();
                break;
            case 'gratidao':
                content = createGratitudeContent();
                break;
            default:
                content = '<p>Prática em desenvolvimento...</p>';
        }
        
        practiceModalContent.innerHTML = content;
        practiceModal.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
        
        // Inicializar funcionalidade específica
        if (practice === 'respiracao') {
            initBreathingExercise();
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    function closePracticeModal() {
        practiceModal.setAttribute('hidden', '');
        document.body.style.overflow = '';
        
        // Limpar timer se existir
        if (breathingTimer) {
            clearInterval(breathingTimer);
            breathingTimer = null;
        }
        breathingState = 'ready';
    }
    
    if (closePractice) {
        closePractice.addEventListener('click', closePracticeModal);
    }
    
    if (practiceOverlay) {
        practiceOverlay.addEventListener('click', closePracticeModal);
    }
    
    // ===== EXERCÍCIO DE RESPIRAÇÃO 4-7-8 =====
    
    function createBreathingContent() {
        return `
            <div class="practice-modal-header">
                <h2 class="practice-modal-title">Exercício de Respiração 4-7-8</h2>
                <p class="practice-modal-subtitle">Inspire por 4 segundos, segure por 7 segundos, expire por 8 segundos</p>
            </div>
            
            <div class="breathing-circle" id="breathingCircle">
                <div class="breathing-timer" id="breathingTimer">05:00</div>
            </div>
            
            <div class="breathing-instruction" id="breathingInstruction">
                Inspire lentamente pelo nariz...
            </div>
            
            <div class="practice-controls">
                <button class="btn-control btn-control-primary" id="startBreathingBtn">
                    <i data-lucide="play"></i>
                    Iniciar
                </button>
                <button class="btn-control btn-control-secondary" id="resetBreathingBtn">
                    Reiniciar
                </button>
            </div>
        `;
    }
    
    function initBreathingExercise() {
        const startBtn = document.getElementById('startBreathingBtn');
        const resetBtn = document.getElementById('resetBreathingBtn');
        const circle = document.getElementById('breathingCircle');
        const timer = document.getElementById('breathingTimer');
        const instruction = document.getElementById('breathingInstruction');
        
        let totalSeconds = 300; // 5 minutos
        let currentCycle = 0;
        const totalCycles = Math.floor(300 / 19); // 19 segundos por ciclo (4+7+8)
        
        const instructions = {
            'inhale': 'Inspire lentamente pelo nariz...',
            'hold': 'Segure a respiração...',
            'exhale': 'Expire devagar pela boca...',
            'ready': 'Inspire lentamente pelo nariz...'
        };
        
        startBtn.addEventListener('click', function() {
            if (breathingState === 'ready') {
                startBreathingCycle();
                this.innerHTML = '<i data-lucide="pause"></i> Pausar';
            } else {
                pauseBreathing();
                this.innerHTML = '<i data-lucide="play"></i> Continuar';
            }
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
        
        resetBtn.addEventListener('click', function() {
            resetBreathing();
        });
        
        function startBreathingCycle() {
            if (currentCycle >= totalCycles) {
                completedBreathing();
                return;
            }
            
            // Fase 1: Inspirar (4 segundos)
            breathingState = 'inhale';
            instruction.textContent = instructions.inhale;
            circle.className = 'breathing-circle inhale';
            
            setTimeout(() => {
                // Fase 2: Segurar (7 segundos)
                breathingState = 'hold';
                instruction.textContent = instructions.hold;
                circle.className = 'breathing-circle hold';
                
                setTimeout(() => {
                    // Fase 3: Expirar (8 segundos)
                    breathingState = 'exhale';
                    instruction.textContent = instructions.exhale;
                    circle.className = 'breathing-circle exhale';
                    
                    setTimeout(() => {
                        currentCycle++;
                        if (breathingState !== 'ready') {
                            startBreathingCycle();
                        }
                    }, 8000);
                }, 7000);
            }, 4000);
            
            // Countdown timer
            breathingTimer = setInterval(() => {
                if (totalSeconds > 0) {
                    totalSeconds--;
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                } else {
                    clearInterval(breathingTimer);
                    completedBreathing();
                }
            }, 1000);
        }
        
        function pauseBreathing() {
            breathingState = 'ready';
            circle.className = 'breathing-circle';
            if (breathingTimer) {
                clearInterval(breathingTimer);
                breathingTimer = null;
            }
        }
        
        function resetBreathing() {
            pauseBreathing();
            totalSeconds = 300;
            currentCycle = 0;
            timer.textContent = '05:00';
            instruction.textContent = instructions.ready;
            startBtn.innerHTML = '<i data-lucide="play"></i> Iniciar';
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
        
        function completedBreathing() {
            pauseBreathing();
            instruction.textContent = '✨ Exercício concluído! Parabéns!';
            showToast('Exercício de respiração concluído!', 'success');
            
            // Salvar no histórico (opcional)
            savePracticeCompletion('respiracao');
        }
    }
    
    // ===== MEDITAÇÃO GUIADA =====
    
    function createMeditationContent() {
    return `
        <div class="practice-modal-header">
        <h2 class="practice-modal-title">Meditação Guiada para Ansiedade</h2>
        <p class="practice-modal-subtitle">10 minutos de paz e mindfulness</p>
        </div>
        
        <div class="meditation-content">
        <div class="meditation-text">
            <p><strong>Preparação (1 minuto):</strong></p>
            <p>Encontre uma posição confortável, seja sentado ou deitado. Feche suavemente os olhos ou mantenha um olhar suave e relaxado. Permita que seu corpo se acomode, soltando qualquer tensão nos ombros, mandíbula e mãos.</p>
            
            <p><strong>Conexão com a Respiração (2 minutos):</strong></p>
            <p>Traga sua atenção para a respiração natural. Observe o ar entrando pelas narinas, enchendo seus pulmões, e depois saindo lentamente. Não force nada, apenas observe. Se sua mente divagar, gentilmente traga-a de volta para a respiração.</p>
            
            <p><strong>Reconhecendo a Ansiedade (2 minutos):</strong></p>
            <p>Observe se há alguma tensão ou desconforto no corpo. Onde a ansiedade se manifesta? No peito, na garganta, no estômago? Reconheça essa sensação sem julgamento. Diga para si mesmo: "Eu reconheço que estou ansioso, e está tudo bem sentir isso agora."</p>
            
            <p><strong>Ancorando no Presente (3 minutos):</strong></p>
            <p>Agora, conte mentalmente 5 coisas que você pode ver ao seu redor (mesmo de olhos fechados, imagine). Depois, 4 coisas que você pode ouvir. Em seguida, 3 coisas que você pode sentir tocando seu corpo. Depois, 2 aromas que você pode perceber. E por fim, 1 coisa pela qual você é grato neste momento.</p>
            
            <p><strong>Afirmações Calmas (1 minuto):</strong></p>
            <p>Repita mentalmente: "Eu estou seguro agora. Este momento é tudo o que existe. Eu escolho a paz. A ansiedade passa, e eu permaneço."</p>
            
            <p><strong>Retorno Gradual (1 minuto):</strong></p>
            <p>Lentamente, comece a movimentar os dedos das mãos e dos pés. Espreguice-se suavemente. Quando estiver pronto, abra os olhos. Observe como seu corpo se sente agora. Leve essa sensação de calma com você.</p>
        </div>
        </div>
        
        <div class="practice-controls" style="margin-top: 24px;">
        <button class="btn-control btn-control-primary" onclick="document.getElementById('closePractice').click()">
            <i data-lucide="check"></i>
            Concluir Meditação
        </button>
        </div>
    `;
    }
    
    // ===== GRATIDÃO DO DIA =====
    
    function createGratitudeContent() {
        return `
            <div class="practice-modal-header">
                <h2 class="practice-modal-title">Gratidão do Dia</h2>
                <p class="practice-modal-subtitle">Registre 3 coisas boas de hoje</p>
            </div>
            
            <div style="padding: 20px 0;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                        1. Algo que te fez sorrir hoje
                    </label>
                    <input type="text" id="gratitude1" placeholder="Digite aqui..." style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: var(--text-primary); font-size: 14px; font-family: inherit; box-sizing: border-box;" />
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                        2. Alguém especial que você agradece
                    </label>
                    <input type="text" id="gratitude2" placeholder="Digite aqui..." style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: var(--text-primary); font-size: 14px; font-family: inherit; box-sizing: border-box;" />
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                        3. Uma conquista ou aprendizado de hoje
                    </label>
                    <input type="text" id="gratitude3" placeholder="Digite aqui..." style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: var(--text-primary); font-size: 14px; font-family: inherit; box-sizing: border-box;" />
                </div>
            </div>
            
            <div class="practice-controls">
                <button class="btn-control btn-control-primary" id="saveGratitudeBtn">
                    <i data-lucide="heart"></i>
                    Salvar Gratidão
                </button>
            </div>
        `;
    }
    
    // Salvar conclusão de prática
    function savePracticeCompletion(practiceType) {
        const completion = {
            id: Date.now(),
            type: practiceType,
            date: new Date().toISOString(),
            userId: currentUser.id || currentUser.email
        };
        
        let completions = JSON.parse(localStorage.getItem('practiceCompletions') || '[]');
        completions.unshift(completion);
        
        // Limita a 50 registros
        if (completions.length > 50) {
            completions = completions.slice(0, 50);
        }
        
        localStorage.setItem('practiceCompletions', JSON.stringify(completions));
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
            closePracticeModal();
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

    // ===== DROPDOWN DO PERFIL – LINKS =====
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

    // ===== EVENTO DELEGADO PARA GRATIDÃO =====
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'saveGratitudeBtn') {
            const g1 = document.getElementById('gratitude1')?.value.trim();
            const g2 = document.getElementById('gratitude2')?.value.trim();
            const g3 = document.getElementById('gratitude3')?.value.trim();
            
            if (!g1 || !g2 || !g3) {
                showToast('Por favor, preencha todos os campos', 'error');
                return;
            }
            
            const gratitude = {
                id: Date.now(),
                items: [g1, g2, g3],
                date: new Date().toISOString(),
                userId: currentUser.id || currentUser.email
            };
            
            let gratitudes = JSON.parse(localStorage.getItem('gratitudeEntries') || '[]');
            gratitudes.unshift(gratitude);
            
            if (gratitudes.length > 50) {
                gratitudes = gratitudes.slice(0, 50);
            }
            
            localStorage.setItem('gratitudeEntries', JSON.stringify(gratitudes));
            
            showToast('Gratidão registrada com sucesso! ❤️', 'success');
            closePracticeModal();
            
            // Salvar como prática concluída
            savePracticeCompletion('gratidao');
        }
    });

    // ===== INICIALIZAÇÃO =====
    loadTasks();
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    console.log('🎉 Autocuidado e Hábitos carregado com sucesso!');
    console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();