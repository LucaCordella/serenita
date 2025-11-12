// autocuidado.js – Lógica completa do Autocuidado com API
(function () {
  'use strict';

  let token = null; // Armazenará o token de autenticação
  let currentUser = null; // Armazenará os dados do usuário
  let apiTaskCache = []; // Cache das tarefas carregadas pela API

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
  let selectedCategory = 'social'; // categoria padrão [cite: 4802-4803]
  let breathingTimer = null;
  let breathingState = 'ready';

  // ===== NAVEGAÇÃO DE TABS (Sem alterações) =====
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      tabContents.forEach((content) => content.classList.remove('active'));

      if (targetTab === 'tarefas') {
        document.getElementById('tabTarefas').classList.add('active');
        loadTasks(); // Recarrega tarefas
      } else if (targetTab === 'praticas') {
        document.getElementById('tabPraticas').classList.add('active');
      }
    });
  });

  // ===== SELEÇÃO DE CATEGORIA (Sem alterações) =====
  categoryQuickBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      categoryQuickBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      selectedCategory = this.dataset.category;
    });
  });

  // ===== ADICIONAR TAREFA (MODIFICADO PARA API) =====

  // Adicionar ao pressionar Enter
  taskInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita submit de formulário (caso exista)
      addTask();
    }
  });

  // Adicionar ao clicar no botão
  addTaskBtn.addEventListener('click', addTask);

  async function addTask() {
    const taskName = taskInput.value.trim();

    if (!taskName) {
      showToast('Por favor, digite uma tarefa', 'error');
      return;
    }

    // Desabilita o botão para evitar cliques duplos
    addTaskBtn.disabled = true;
    taskInput.disabled = true;

    // Criar objeto de tarefa (apenas os dados)
    const taskData = {
      name: taskName,
      category: selectedCategory,
      completed: false,
    };

    try {
      // Salvar na API
      await saveTask(taskData);
      
      // Limpar input
      taskInput.value = '';
      
      // Recarregar lista (já atualizada do banco)
      await loadTasks();
      
      showToast('Tarefa adicionada com sucesso!', 'success');

    } catch (err) {
      console.error("Erro ao adicionar tarefa:", err);
      showToast(err.message || 'Erro ao salvar tarefa', 'error');
    } finally {
      // Reabilita o botão
      addTaskBtn.disabled = false;
      taskInput.disabled = false;
    }
  }

  // ===== FUNÇÕES DE TAREFAS (MODIFICADAS PARA API) =====

  // Carregar tarefas (MODIFICADO)
  async function loadTasks() {
    try {
      const res = await fetch('http://localhost:4000/api/entries?type=task', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Erro ao carregar tarefas');
      }

      const allTasks = await res.json();
      
      // Filtra tarefas do dia (A API retorna todas, o frontend filtra)
      const today = new Date().toISOString().split('T')[0];
      const todayTasks = allTasks.filter(entry => {
        const taskDate = new Date(entry.created_at).toISOString().split('T')[0];
        return taskDate === today;
      });

      // Salva no cache para funções de toggle/delete
      apiTaskCache = todayTasks;

      if (todayTasks.length === 0) {
        tasksList.innerHTML = '';
        tasksEmptyState.style.display = 'block';
        tasksProgress.style.display = 'none';
        return;
      }

      tasksEmptyState.style.display = 'none';
      tasksProgress.style.display = 'block';

      // Renderizar tarefas
      tasksList.innerHTML = todayTasks.map(entry => createTaskElement(entry)).join('');

      // Calcular progresso
      updateProgress(todayTasks);

      // Adicionar event listeners
      attachTaskListeners();

    } catch (err) {
      console.error("Erro ao carregar tarefas:", err);
      tasksList.innerHTML = `<div class="empty-state" style="padding: 20px;"><p class="empty-text" style="color: #F87171;">${err.message}</p></div>`;
      tasksEmptyState.style.display = 'none';
      tasksProgress.style.display = 'none';
    }
  }

  // Criar elemento HTML de tarefa (MODIFICADO)
  // Agora recebe o 'entry' (com id, type, data, created_at)
  function createTaskElement(entry) {
    const task = entry.data; // Dados da tarefa estão aninhados
    const categoryLabels = {
      fisico: 'Físico',
      mental: 'Mental',
      social: 'Social',
    };
    const categoryIcons = {
      fisico: 'activity',
      mental: 'brain',
      social: 'users',
    };

    return `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${entry.id}">
        <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle">
          <i data-lucide="check"></i>
        </button>
        <div class="task-content">
          <div class="task-text">${task.name}</div>
          <span class="task-category-badge ${task.category}">
            <i data-lucide="${categoryIcons[task.category] || 'tag'}"></i>
            ${categoryLabels[task.category] || 'Geral'}
          </span>
        </div>
        <button class="task-delete" data-action="delete">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
  }

  // Adicionar event listeners nas tarefas (MODIFICADO)
  function attachTaskListeners() {
    tasksList.querySelectorAll('.task-item').forEach(item => {
      // Usamos o ID da "entry", não o ID de dentro do JSON
      const entryId = parseInt(item.dataset.taskId); 
      
      const checkbox = item.querySelector('[data-action="toggle"]');
      const deleteBtn = item.querySelector('[data-action="delete"]');

      if (checkbox) {
        checkbox.addEventListener('click', () => toggleTask(entryId, item));
      }
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteTask(entryId, item));
      }
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Marcar/desmarcar tarefa (MODIFICADO PARA API PUT)
  async function toggleTask(entryId, itemElement) {
    // 1. Encontrar a tarefa no cache
    const entry = apiTaskCache.find(t => t.id === entryId);
    if (!entry) {
      console.error("Tarefa não encontrada no cache:", entryId);
      return;
    }

    // 2. Criar o objeto de dados atualizado
    const updatedData = {
      ...entry.data, // Pega os dados existentes (name, category)
      completed: !entry.data.completed // Inverte o 'completed'
    };

    // 3. Otimistic UI: Atualiza a UI imediatamente
    itemElement.classList.toggle('completed');
    itemElement.querySelector('.task-checkbox').classList.toggle('checked');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Atualiza o cache localmente
    entry.data.completed = updatedData.completed;
    updateProgress(apiTaskCache); // Atualiza a barra de progresso

    try {
      // 4. Enviar para a API (PUT /api/entries/:id)
      const res = await fetch(`http://localhost:4000/api/entries/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: updatedData }) // Envia apenas os dados atualizados [cite: 83-84]
      });

      if (!res.ok) {
        throw new Error('Falha ao atualizar a tarefa');
      }
      // Se deu certo, a UI já está atualizada (otimistic)
      
    } catch (err) {
      console.error("Erro ao atualizar tarefa:", err);
      showToast(err.message, 'error');
      
      // 5. Rollback: Se falhar, desfaz a alteração na UI
      entry.data.completed = !updatedData.completed; // Reverte no cache
      itemElement.classList.toggle('completed');
      itemElement.querySelector('.task-checkbox').classList.toggle('checked');
      if (typeof lucide !== 'undefined') lucide.createIcons();
      updateProgress(apiTaskCache); // Reverte a barra de progresso
    }
  }

  // Deletar tarefa (MODIFICADO PARA API DELETE)
  async function deleteTask(entryId, itemElement) {
    if (!confirm('Deseja realmente excluir esta tarefa?')) {
      return;
    }

    // 1. Otimistic UI: Remove da UI
    itemElement.style.opacity = '0';
    itemElement.style.transform = 'translateX(50px)';
    
    // Remove do cache local
    apiTaskCache = apiTaskCache.filter(t => t.id !== entryId);
    updateProgress(apiTaskCache);

    setTimeout(() => {
        itemElement.remove();
        if(apiTaskCache.length === 0) {
            tasksEmptyState.style.display = 'block';
            tasksProgress.style.display = 'none';
        }
    }, 300); // Espera a animação CSS

    try {
      // 2. Enviar para a API (DELETE /api/entries/:id)
      const res = await fetch(`http://localhost:4000/api/entries/${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Falha ao excluir a tarefa');
      }
      
      showToast('Tarefa excluída!', 'success');

    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
      showToast(err.message, 'error');
      // 3. Rollback: Se falhar, recarrega tudo do banco
      await loadTasks(); 
    }
  }

  // Atualizar barra de progresso (MODIFICADO)
  function updateProgress(tasks) {
    const total = tasks.length;
    // tasks agora é a lista de 'entries', os dados estão em 'entry.data'
    const completed = tasks.filter(entry => entry.data.completed).length; 
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    progressText.textContent = `${completed} de ${total} tarefas concluídas`;
    progressPercent.textContent = `${percentage}% completo`;
    progressBarFill.style.width = `${percentage}%`;
  }

  // ===== PRÁTICAS DE BEM-ESTAR (MODIFICADO) =====

  practiceBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const practice = this.dataset.practiceAction;
      openPracticeModal(practice);
    });
  });

  function openPracticeModal(practice) {
    let content = '';

    switch (practice) {
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
    
    // Adicionar listener para o botão de gratidão
    if (practice === 'gratidao') {
        const saveGratitudeBtn = document.getElementById('saveGratitudeBtn');
        if(saveGratitudeBtn) {
            saveGratitudeBtn.addEventListener('click', handleSaveGratitude);
        }
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

  // ===== EXERCÍCIO DE RESPIRAÇÃO 4-7-8 (Sem alterações) =====

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
    const timerEl = document.getElementById('breathingTimer');
    const instruction = document.getElementById('breathingInstruction');

    let totalSeconds = 300; // 5 minutos
    let cycleInterval = null; // Para o ciclo de 4-7-8
    let timerInterval = null; // Para o relógio de 5 minutos
    let currentStepTime = 0;
    
    // Estados: ready, inhale, hold, exhale, paused
    breathingState = 'ready'; 

    const instructions = {
      inhale: 'Inspire lentamente pelo nariz...',
      hold: 'Segure a respiração...',
      exhale: 'Expire devagar pela boca...',
      ready: 'Inspire lentamente pelo nariz...',
      paused: 'Pausado'
    };

    function startTimer() {
        if(timerInterval) clearInterval(timerInterval); // Limpa timer anterior
        timerInterval = setInterval(() => {
            if (totalSeconds > 0) {
              totalSeconds--;
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            } else {
              completedBreathing();
            }
        }, 1000);
    }

    function runBreathingCycle() {
        if (breathingState === 'paused' || breathingState === 'ready') return;

        // Fase 1: Inspirar (4 segundos)
        breathingState = 'inhale';
        instruction.textContent = instructions.inhale;
        circle.className = 'breathing-circle inhale'; // Adiciona classe de animação
        currentStepTime = 4;

        cycleInterval = setTimeout(() => {
          if (breathingState !== 'inhale') return;
          // Fase 2: Segurar (7 segundos)
          breathingState = 'hold';
          instruction.textContent = instructions.hold;
          circle.className = 'breathing-circle hold'; // Adiciona classe
          currentStepTime = 7;

          cycleInterval = setTimeout(() => {
            if (breathingState !== 'hold') return;
            // Fase 3: Expirar (8 segundos)
            breathingState = 'exhale';
            instruction.textContent = instructions.exhale;
            circle.className = 'breathing-circle exhale'; // Adiciona classe
            currentStepTime = 8;

            cycleInterval = setTimeout(() => {
                if (breathingState !== 'exhale') return;
                // Reinicia o ciclo
                if (totalSeconds > 0) {
                   runBreathingCycle();
                } else {
                   completedBreathing();
                }
            }, 8000); // 8s
          }, 7000); // 7s
        }, 4000); // 4s
    }

    function pauseBreathing() {
        breathingState = 'paused';
        if(cycleInterval) clearTimeout(cycleInterval);
        if(timerInterval) clearInterval(timerInterval);
        cycleInterval = null;
        timerInterval = null;
        instruction.textContent = instructions.paused;
        circle.className = 'breathing-circle'; // Remove classes de animação
        startBtn.innerHTML = '<i data-lucide="play"></i> Continuar';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    function resetBreathing() {
        pauseBreathing();
        breathingState = 'ready';
        totalSeconds = 300;
        timerEl.textContent = '05:00';
        instruction.textContent = instructions.ready;
        startBtn.innerHTML = '<i data-lucide="play"></i> Iniciar';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    function completedBreathing() {
        resetBreathing(); // Limpa tudo
        instruction.textContent = '✨ Exercício concluído! Parabéns!';
        showToast('Exercício de respiração concluído!', 'success');
        savePracticeCompletion('respiracao');
    }

    startBtn.addEventListener('click', function () {
      if (breathingState === 'ready' || breathingState === 'paused') {
        startTimer();
        runBreathingCycle();
        this.innerHTML = '<i data-lucide="pause"></i> Pausar';
      } else {
        pauseBreathing();
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    resetBtn.addEventListener('click', resetBreathing);
  }

  // ===== MEDITAÇÃO GUIADA (Sem alterações) =====

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
        <button class="btn-control btn-control-primary" id="finishMeditationBtn">
          <i data-lucide="check"></i>
          Concluir Meditação
        </button>
      </div>
    `;
  }
  
  // Listener para o botão de concluir meditação
  document.addEventListener('click', function(e) {
      if (e.target && e.target.id === 'finishMeditationBtn') {
          savePracticeCompletion('meditacao');
          showToast('Meditação concluída!', 'success');
          closePracticeModal();
      }
  });


  // ===== GRATIDÃO DO DIA (HTML CORRIGIDO) =====

  function createGratitudeContent() {
    return `
      <div class="practice-modal-header">
        <h2 class="practice-modal-title">Gratidão do Dia</h2>
        <p class="practice-modal-subtitle">Registre 3 coisas boas de hoje</p>
      </div>
      
      <div style="padding: 20px 0;">
        <div class="form-group" style="margin-bottom: 20px;">
          <label for="gratitude1" class="form-label" style="font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
            1. Algo que te fez sorrir hoje
          </label>
          <input type="text" id="gratitude1" placeholder="Digite aqui..." class="form-input" style="width: 100%;" />
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label for="gratitude2" class="form-label" style="font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
            2. Alguém especial que você agradece
          </label>
          <input type="text" id="gratitude2" placeholder="Digite aqui..." class="form-input" style="width: 100%;" />
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label for="gratitude3" class="form-label" style="font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
            3. Uma conquista ou aprendizado de hoje
          </label>
          <input type="text" id="gratitude3" placeholder="Digite aqui..." class="form-input" style="width: 100%;" />
        </div>
      </div>
      
      <div class="practice-controls">
        <button class="btn-save-gratitude" id="saveGratitudeBtn">
          <i data-lucide="heart"></i>
          Salvar Gratidão
        </button>
      </div>
    `;
  }
  
  // Handler para salvar gratidão (chamado pelo listener)
  async function handleSaveGratitude(e) {
      const btn = e.currentTarget;
      const g1 = document.getElementById('gratitude1')?.value.trim();
      const g2 = document.getElementById('gratitude2')?.value.trim();
      const g3 = document.getElementById('gratitude3')?.value.trim();

      if (!g1 || !g2 || !g3) {
        showToast('Por favor, preencha todos os campos', 'error');
        return;
      }
      
      btn.disabled = true;

      const gratitudeData = {
        items: [g1, g2, g3],
      };

      try {
        // Salva como uma 'entry' do tipo 'gratitude'
        await saveEntryAPI('gratitude', gratitudeData);
        // Salva também como uma 'prática' concluída para estatísticas
        savePracticeCompletion('gratidao');
        
        showToast('Gratidão registrada com sucesso! ❤️', 'success');
        closePracticeModal();
        
      } catch (err) {
        console.error("Erro ao salvar gratidão:", err);
        showToast(err.message || 'Erro ao salvar gratidão', 'error');
        btn.disabled = false;
      }
  }
  
  // Salva "práticas" concluídas no localStorage (para estatísticas rápidas)
  function savePracticeCompletion(practiceType) {
    const completion = {
      id: Date.now(),
      type: practiceType,
      date: new Date().toISOString(),
      userId: currentUser.id || currentUser.email,
    };
    let completions = JSON.parse(localStorage.getItem('practiceCompletions') || '[]');
    completions.unshift(completion);
    if (completions.length > 50) {
      completions = completions.slice(0, 50);
    }
    localStorage.setItem('practiceCompletions', JSON.stringify(completions));
  }

  // Função genérica para salvar uma 'entry' (gratidão, prática, etc.)
  async function saveEntryAPI(type, data) {
    const res = await fetch('http://localhost:4000/api/entries', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, data })
    });
    
    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Erro ao salvar ${type}`);
    }
    return await res.json();
  }

  // Salvar tarefa (tipo 'task') na API (Refatorada de 'addTask')
  async function saveTask(taskData) {
      return saveEntryAPI('task', taskData);
  }


  // ===== TOAST (Sem alterações) =====
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
      closePracticeModal();
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
    tendencias: 'Tendências e Relatórios',
    avaliacoes: 'Autoavaliações',
    configuracoes: 'Configurações',
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
  const emergencySettingsLink = document.getElementById(
    'emergencySettingsLink'
  );
  if (emergencySettingsLink) {
    emergencySettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeEmergencyModal();
      window.location.href = '../pages/configuracoes.html';
    });
  }

  // ===== INICIALIZAÇÃO =====
  loadTasks(); // Carrega as tarefas da API ao iniciar
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  console.log('🎉 Autocuidado e Hábitos carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();