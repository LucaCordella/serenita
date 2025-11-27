// avaliacoes.js - Lógica completa de Autoavaliações com API
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

  // Se checkAuth retornar null, interrompe a execução do script
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
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const historyList = document.getElementById('historyList');

  // Modal de Avaliação
  const assessmentModal = document.getElementById('assessmentModal');
  const assessmentOverlay = document.getElementById('assessmentOverlay');
  const closeAssessmentModalBtn = document.getElementById(
    'closeAssessmentModal'
  );
  const assessmentModalContent = document.getElementById(
    'assessmentModalContent'
  );

  // Botões de Ação
  const detailsBtns = document.querySelectorAll('.btn-details');
  const startBtns = document.querySelectorAll('.btn-start');

  // ===== ESTADO DA AVALIAÇÃO =====
  let currentAssessmentKey = null;
  let currentQuestionIndex = 0;
  let userAnswers = [];
  let apiHistoryCache = []; // Cache para guardar os dados da API
  
  // ===== DADOS DAS AVALIAÇÕES (Definições) =====
  // (Este objeto define as perguntas e a lógica de pontuação)
  const answerOptions = [
    { text: 'De modo algum', value: 0 },
    { text: 'Vários dias', value: 1 },
    { text: 'Mais da metade dos dias', value: 2 },
    { text: 'Quase todos os dias', value: 3 },
  ];

  // Opções para a PSS-10 (Estresse) - 0-3
  const pssOptions = [
    { text: 'Nunca', value: 0 },
    { text: 'Quase nunca', value: 1 },
    { text: 'Às vezes', value: 2 },
    { text: 'Quase sempre', value: 3 },
  ];

  const assessmentsData = {
    ansiedade: {
      title: 'Triagem de Ansiedade (GAD-7)',
      category: 'Ansiedade',
      duration: '3–5 min',
      questions: 7,
      color: '#FB923C', // Laranja
      description:
        'Esta triagem é baseada no GAD-7 e avalia sintomas comuns de ansiedade nas últimas 2 semanas.',
      instructions:
        'Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos seguintes problemas?',
      options: answerOptions,
      items: [
        { text: 'Sentir-se nervoso(a), ansioso(a) ou "com os nervos à flor da pele"' },
        { text: 'Não ser capaz de parar ou controlar as preocupações' },
        { text: 'Preocupar-se muito com coisas diferentes' },
        { text: 'Dificuldade para relaxar' },
        { text: 'Ficar tão inquieto(a) que é difícil ficar parado(a)' },
        { text: 'Ficar facilmente aborrecido(a) ou irritado(a)' },
        { text: 'Sentir medo como se algo horrível fosse acontecer' },
      ],
      scoring: {
        min: {
          max: 4,
          interpretation: 'Ansiedade Mínima',
          color: '#10B981',
          desc: 'Seus resultados sugerem um nível mínimo de ansiedade. Continue monitorando seu bem-estar.',
        },
        leve: {
          max: 9,
          interpretation: 'Ansiedade Leve',
          color: '#FBBF24',
          desc: 'Seus resultados sugerem sintomas leves de ansiedade. Práticas de autocuidado podem ajudar.',
        },
        moderada: {
          max: 14,
          interpretation: 'Ansiedade Moderada',
          color: '#FB923C',
          desc: 'Seus resultados sugerem sintomas moderados de ansiedade. Considere conversar com alguém de confiança ou um profissional.',
        },
        grave: {
          max: 21, // 7 * 3 = 21
          interpretation: 'Ansiedade Grave',
          color: '#EF4444',
          desc: 'Seus resultados sugerem sintomas graves de ansiedade. É altamente recomendável procurar apoio profissional.',
        },
      },
    },
    estresse: {
      title: 'Avaliação de Estresse (PSS-10)',
      category: 'Estresse',
      duration: '5–7 min',
      questions: 5, // Mantendo 5 perguntas como no seu JS original
      color: '#F87171', // Vermelho
      description:
        'Esta avaliação é baseada na Escala de Estresse Percebido (PSS-10) e mede o quão estressante você considerou sua vida no último mês.',
      instructions:
        'No último mês, com que frequência você se sentiu ou pensou de determinada maneira?',
      options: pssOptions, // Usando as opções 0-3
      items: [
         { text: 'No último mês, com que frequência você esteve chateado(a) por causa de algo que aconteceu inesperadamente?' },
        { text: 'No último mês, com que frequência você sentiu que foi incapaz de controlar as coisas importantes em sua vida?' },
        { text: 'No último mês, com que frequência você se sentiu nervoso(a) ou estressado(a)?' },
        { text: 'No último mês, com que frequência você sentiu dificuldade em lidar com todas as coisas que tinha para fazer?' },
        { text: 'No último mês, com que frequência você sentiu que as dificuldades estavam se acumulando tanto que você não poderia superá-las?' },
      ],
      scoring: {
        min: {
          max: 4,
          interpretation: 'Nível Baixo de Estresse',
          color: '#10B981',
          desc: 'Seus níveis de estresse percebido estão baixos. Ótimo trabalho gerenciando as pressões.',
        },
        moderado: {
          max: 9,
          interpretation: 'Nível Moderado de Estresse',
          color: '#FBBF24',
          desc: 'Você está experienciando um nível moderado de estresse. Técnicas de relaxamento podem ser úteis.',
        },
        alto: {
          max: 15, // 5 * 3 = 15
          interpretation: 'Nível Alto de Estresse',
          color: '#EF4444',
          desc: 'Seus níveis de estresse percebido estão altos. É importante identificar as fontes de estresse e buscar estratégias de enfrentamento.',
        },
      },
    },
    autocuidado: {
      title: 'Autocuidado Emocional',
      category: 'Autocuidado',
      duration: '4–6 min',
      questions: 9,
      color: '#A78BFA', // Roxo
      description:
        'Avalie suas práticas de autocuidado e bem-estar emocional recentes.',
      instructions:
        'Nas últimas 2 semanas, com que frequência você tem praticado as seguintes ações?',
      options: answerOptions,
      items: [
        { text: 'Dediquei tempo para atividades que me dão prazer' },
        { text: 'Dormi o suficiente para me sentir descansado(a)' },
        { text: 'Mantive contato com amigos ou familiares que me apoiam' },
        { text: 'Pratiquei exercícios físicos' },
        { text: 'Consegui expressar meus sentimentos de forma saudável' },
        { text: 'Tive momentos de relaxamento ou meditação' },
        { text: 'Cuidei da minha alimentação de forma equilibrada' },
        { text: 'Reconheci e respeitei meus limites (disse "não" quando precisei)' },
        { text: 'Fiz algo gentil por mim mesmo(a)' },
      ],
      scoring: {
        min: {
          max: 8,
          interpretation: 'Autocuidado Precisa de Atenção',
          color: '#EF4444',
          desc: 'Suas práticas de autocuidado estão baixas. Tente incorporar pequenas ações de autocuidado em sua rotina.',
        },
        em_desenvolvimento: {
          max: 17,
          interpretation: 'Autocuidado em Desenvolvimento',
          color: '#FBBF24',
          desc: 'Você está no caminho certo! Continue a desenvolver e priorizar suas práticas de autocuidado.',
        },
        bom: {
          max: 27, // 9 * 3 = 27
          interpretation: 'Bom Nível de Autocuidado',
          color: '#10B981',
          desc: 'Excelente! Você está ativamente engajado(a) em cuidar do seu bem-estar emocional. Continue assim!',
        },
      },
    },
  };
  
  // ===== NAVEGAÇÃO DE TABS (Sem alterações) =====
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      tabContents.forEach((content) => content.classList.remove('active'));

      if (targetTab === 'disponiveis') {
        document.getElementById('tabDisponiveis').classList.add('active');
      } else if (targetTab === 'historico') {
        document.getElementById('tabHistorico').classList.add('active');
        loadHistory(); // Carrega o histórico ao trocar para a aba
      }
    });
  });

  // ===== MODAL DE DETALHES (Sem alterações) =====
  detailsBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const assessmentKey = this.dataset.assessment;
      openDetailsModal(assessmentKey);
    });
  });

  function openDetailsModal(assessmentKey) {
    const data = assessmentsData[assessmentKey];
    if (!data) return;

    assessmentModalContent.innerHTML = `
      <div class="details-modal-header" style="text-align: left; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <span class="category-badge ${assessmentKey}">${data.category}</span>
        <h2 class="details-modal-title" style="font-size: 24px; margin: 12px 0 8px;">${data.title}</h2>
        <p class="details-modal-subtitle" style="font-size: 14px; color: var(--text-muted);">${data.description}</p>
      </div>
      <div class="details-section" style="margin-top: 24px;">
        <h3 class="details-section-title" style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: var(--text-secondary);">O que será avaliado</h3>
        <p class="details-section-content" style="font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0;">
          ${data.instructions}
        </p>
        <ul style="margin: 8px 0 0 20px; padding: 0; color: var(--text-muted); font-size: 14px;">
          ${data.items.map((item) => `<li style="margin-bottom: 6px;">${item.text}</li>`).join('')}
        </ul>
      </div>
      <button class="btn-start-from-modal" data-assessment="${assessmentKey}" style="width: 100%; padding: 14px; border-radius: 10px; background: linear-gradient(135deg, var(--teal-500), var(--teal-300)); border: none; color: #001; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 6px 16px rgba(20,184,166,0.2); margin-top: 24px;">
        Começar Avaliação
      </button>
    `;

    const modalStartBtn = assessmentModalContent.querySelector(
      '.btn-start-from-modal'
    );
    if (modalStartBtn) {
      modalStartBtn.addEventListener('click', function () {
        const assessment = this.dataset.assessment;
        startAssessment(assessment);
      });
    }

    assessmentModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ===== INICIAR AVALIAÇÃO (Sem alterações na lógica interna) =====
  startBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const assessmentKey = this.dataset.assessment;
      startAssessment(assessmentKey);
    });
  });

  function startAssessment(assessmentKey) {
    currentAssessmentKey = assessmentKey;
    currentQuestionIndex = 0;
    const data = assessmentsData[assessmentKey];
    userAnswers = new Array(data.items.length).fill(null); 
    renderQuestion();
    assessmentModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function renderQuestion() {
    const data = assessmentsData[currentAssessmentKey];
    const question = data.items[currentQuestionIndex];
    const options = data.options || answerOptions; // Usa as opções corretas
    const totalQuestions = data.items.length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
    const selectedValue = userAnswers[currentQuestionIndex];

    assessmentModalContent.innerHTML = `
      <div class="assessment-modal-header">
        <h2 class="assessment-modal-title">${data.title}</h2>
        <p class="assessment-modal-subtitle">${data.instructions}</p>
      </div>
      
      <div class="assessment-question-container">
        <div class="question-header">
          <span class="question-number">Pergunta ${currentQuestionIndex + 1} de ${totalQuestions}</span>
        </div>
        <p class="question-text">${question.text}</p>
        
        <div class="answer-options" style="flex-direction: column; gap: 12px;">
          ${options
            .map(
              (option, index) => `
            <button 
              class="answer-option ${selectedValue === option.value ? 'selected' : ''}" 
              data-value="${option.value}">
              ${option.text}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="assessment-actions">
        <button class="btn-assessment btn-previous" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
          <i data-lucide="arrow-left"></i>
          Anterior
        </button>
        <button class="btn-assessment btn-next" ${selectedValue === null ? 'disabled' : ''}>
          ${isLastQuestion ? 'Finalizar' : 'Próximo'}
          <i data-lucide="${isLastQuestion ? 'check' : 'arrow-right'}"></i>
        </button>
      </div>
    `;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Event listener delegado para o modal (Sem alterações)
  assessmentModal.addEventListener('click', function (e) {
    if (!currentAssessmentKey) return; 
    const data = assessmentsData[currentAssessmentKey];
    if (!data) return;

    // Delegação para 'answer-option'
    if (e.target.closest('.answer-option')) {
      const btn = e.target.closest('.answer-option');
      const selectedValue = parseInt(btn.dataset.value);
      userAnswers[currentQuestionIndex] = selectedValue; 
      assessmentModal
        .querySelectorAll('.answer-option')
        .forEach((btn) => btn.classList.remove('selected'));
      btn.classList.add('selected');
      assessmentModal.querySelector('.btn-next').disabled = false;
    }

    // Delegação para 'btn-next'
    if (e.target.closest('.btn-next') && !e.target.closest('.btn-next').disabled) {
      const isLastQuestion = currentQuestionIndex === data.items.length - 1;
      if (isLastQuestion) {
        handleFinishAssessment();
      } else {
        currentQuestionIndex++;
        renderQuestion();
      }
    }

    // Delegação para 'btn-previous'
    if (e.target.closest('.btn-previous') && !e.target.closest('.btn-previous').disabled) {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
      }
    }
  });

  // Fechar Modal (Sem alterações)
  if (closeAssessmentModalBtn) {
    closeAssessmentModalBtn.addEventListener('click', closeAssessmentModal);
  }
  if (assessmentOverlay) {
    assessmentOverlay.addEventListener('click', closeAssessmentModal);
  }

  function closeAssessmentModal() {
    assessmentModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    currentAssessmentKey = null;
    currentQuestionIndex = 0;
    userAnswers = [];
  }

  // ===== CÁLCULO E SALVAMENTO (MODIFICADO PARA API) =====
  async function handleFinishAssessment() {
    const data = assessmentsData[currentAssessmentKey];
    
    // 1. Calcular o resultado
    const totalScore = userAnswers.reduce((sum, value) => sum + (value || 0), 0);
    
    // 2. Calcular a pontuação máxima corretamente
    const options = data.options || answerOptions;
    const maxScorePerQuestion = options[options.length - 1].value;
    const maxScore = maxScorePerQuestion * data.items.length;

    // 3. Encontrar interpretação
    let resultInterpretation = {};
    for (const key in data.scoring) {
      if (totalScore <= data.scoring[key].max) {
        resultInterpretation = data.scoring[key];
        break;
      }
    }

    // 4. Criar objeto de resultado (apenas os dados)
    const resultData = {
      assessmentKey: currentAssessmentKey,
      title: data.title,
      category: data.category,
      score: totalScore,
      maxScore: maxScore,
      color: resultInterpretation.color || '#10B981',
      interpretation: resultInterpretation.interpretation || 'Resultado Concluído',
      description: resultInterpretation.desc || 'Sua avaliação foi concluída.',
      answers: userAnswers,
    };

    try {
      // 5. Salvar na API
      // Mostra o loader no botão "Finalizar"
      const finishBtn = assessmentModal.querySelector('.btn-next');
      if (finishBtn) {
          finishBtn.disabled = true;
          finishBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Salvando...';
          if (typeof lucide !== 'undefined') lucide.createIcons();
      }
      
      await saveAssessmentResult(resultData);

      // 6. Renderizar tela de resultado
      renderResult(resultData);

      // 7. Recarregar o histórico (para a próxima vez que a aba for aberta)
      // Não precisa "await" aqui, pode carregar em segundo plano
      loadHistory(); 

    } catch (err) {
        console.error("Erro ao salvar avaliação:", err);
        // Se falhar, mostre o resultado mesmo assim, mas avise do erro
        renderResult(resultData); 
        // Adiciona um aviso de erro ao modal
        const descEl = assessmentModalContent.querySelector('.result-description');
        if(descEl) {
            descEl.innerHTML += `<br><br><strong style="color: #F87171;">Aviso: Não foi possível salvar este resultado no seu histórico. Erro: ${err.message}</strong>`;
        }
    }
  }

  // Salvar na API (MODIFICADO)
  async function saveAssessmentResult(resultData) {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Envia o token
      },
      body: JSON.stringify({
        type: 'assessment', // Define o tipo
        data: resultData, // Envia os dados
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Não foi possível salvar a avaliação');
    }
  }

  // Renderiza a tela de resultado no modal (Sem alterações)
  function renderResult(result) {
    assessmentModalContent.innerHTML = `
      <div class="assessment-result">
        <div class="result-icon" style="background: ${result.color}30; border: 2px solid ${result.color};">
          <i data-lucide="check" style="color: ${result.color};"></i>
        </div>
        <div class="result-score" style="color: ${result.color};">
          ${result.score} <span style="font-size: 24px; color: var(--text-muted);">/ ${result.maxScore}</span>
        </div>
        <h3 class="result-interpretation">${result.interpretation}</h3>
        <p class="result-description">${result.description}</p>
        <div class="assessment-actions" style="border-top: none; padding-top: 0; margin-top: 16px;">
          <button class="btn-assessment btn-next" id="finishAndCloseBtn" style="flex: 1;">
            Fechar
          </button>
        </div>
      </div>
    `;

    document
      .getElementById('finishAndCloseBtn')
      .addEventListener('click', () => {
        closeAssessmentModal();
        // Manda o usuário para a aba de histórico para ver o resultado salvo
        document.querySelector('.tab-btn[data-tab="historico"]').click();
      });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ===== HISTÓRICO (MODIFICADO PARA API) =====
  async function loadHistory() {
    try {
      // 1. Buscar dados da API
      const res = await fetch('/api/entries?type=assessment', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Erro ao buscar histórico');
      }
      
      apiHistoryCache = await res.json(); // Salva no cache da API

      // 2. Renderizar
      if (apiHistoryCache.length === 0) {
        historyList.innerHTML = `
          <div class="empty-state" id="emptyState">
            <i data-lucide="check-square" class="empty-icon"></i>
            <p class="empty-text">Nenhuma avaliação realizada ainda</p>
            <p class="empty-hint">Faça sua primeira avaliação para ver o histórico!</p>
          </div>
        `;
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
        return;
      }

      const categoryColors = {
        Ansiedade: 'ansiedade',
        Estresse: 'estresse',
        Autocuidado: 'autocuidado',
      };

      historyList.innerHTML = apiHistoryCache
        .map((item) => {
          const itemData = item.data; // Dados aninhados
          const date = new Date(item.created_at); // Data do backend

          const dateStr = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          const daysAgo = Math.floor(
            (new Date() - date) / (1000 * 60 * 60 * 24)
          );
          const timeStr =
            daysAgo === 0
              ? 'Hoje'
              : `há ${daysAgo} ${daysAgo === 1 ? 'dia' : 'dias'}`;

          const percentage = (itemData.score / itemData.maxScore) * 100;

          return `
          <div class="history-assessment-card" data-id="${item.id}">
            <div class="history-card-header">
              <div class="history-card-title">
                <span class="category-badge ${categoryColors[itemData.category] || 'ansiedade'}">${
            itemData.category
          }</span>
                <h3 class="history-assessment-name">${itemData.title}</h3>
              </div>
              <span class="history-date">${timeStr}</span>
            </div>
            <div class="history-score">
              <span class="score-label">Pontuação: ${itemData.score}/${
            itemData.maxScore
          }</span>
              <span class="score-value">${dateStr}</span>
            </div>
            <div class="history-progress-bar">
              <div class="history-progress-fill" style="width: ${percentage}%; background: ${
            itemData.color
          };"></div>
            </div>
            <p class="history-interpretation">${itemData.interpretation}</p>
            <button class="btn-view-details" data-action="view-details" data-id="${
              item.id
            }">
              <i data-lucide="external-link"></i>
              Ver Detalhes
            </button>
          </div>
        `;
        })
        .join('');

      // 3. Adicionar eventos de clique
      historyList.querySelectorAll('.btn-view-details').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation(); // Impede que o card todo seja clicado
          const id = this.dataset.id;
          // Usa o cache 'apiHistoryCache'
          const item = apiHistoryCache.find((h) => h.id === parseInt(id));
          if (item) {
            showAssessmentDetails(item);
          }
        });
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

  // Mostrar detalhes (MODIFICADO para ler 'entry.data' e 'entry.created_at')
  function showAssessmentDetails(assessment) {
    // 'assessment' é o objeto completo da API: { id, type, data, created_at }
    const assessmentData = assessment.data; 
    // 'data' é o objeto de definições (perguntas, opções)
    const data = assessmentsData[assessmentData.assessmentKey]; 
    
    if (!data) {
        console.error("Definição da avaliação não encontrada para:", assessmentData.assessmentKey);
        return;
    }

    const date = new Date(assessment.created_at); // Data do backend
    const optionsSource = data.options || answerOptions; // Garante que estamos usando as opções corretas

    assessmentModalContent.innerHTML = `
      <div class="details-modal-header" style="text-align: left; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <span class="category-badge ${assessmentData.assessmentKey}">${
      assessmentData.category
    }</span>
        <h2 class="details-modal-title" style="font-size: 24px; margin: 12px 0 8px;">${
          assessmentData.title
        }</h2>
        <p class="details-modal-subtitle" style="font-size: 14px; color: var(--text-muted);">
          Realizada em ${date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div class="details-section" style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px;">
        <h3 class="details-section-title" style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: var(--text-secondary);">Seu Resultado</h3>
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted); font-size: 14px;">Pontuação</span>
            <span style="color: var(--text-primary); font-weight: 600;">${
              assessmentData.score
            }/${assessmentData.maxScore}</span>
          </div>
          <div class="history-progress-bar" style="margin-bottom: 0;">
            <div class="history-progress-fill" style="width: ${
              (assessmentData.score / assessmentData.maxScore) * 100
            }%; background: ${assessmentData.color};"></div>
          </div>
        </div>
        <p style="margin: 12px 0 0; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
          <strong style="color: var(--text-primary);">Interpretação:</strong> ${
            assessmentData.interpretation
          }
        </p>
        <p style="margin: 12px 0 0; color: var(--text-muted); font-size: 14px; line-height: 1.6;">
          ${assessmentData.description}
        </p>
      </div>

      <div class="details-section" style="margin-top: 24px;">
        <h3 class="details-section-title" style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: var(--text-secondary);">Suas Respostas</h3>
        <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
          ${data.items
            .map(
              (item, index) => {
                const answerValue = assessmentData.answers[index];
                // Encontra a resposta no array de opções correto
                const answer = optionsSource.find(opt => opt.value === answerValue);
                
                return `
                  <li style="font-size: 14px; color: var(--text-muted); background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${
                    answerValue > 1 
                      ? assessmentData.color
                      : 'var(--border-primary)'
                  };">
                    ${item.text}
                    <br>
                    <strong style="color: var(--text-primary);">${
                      answer ? answer.text : 'Não respondido'
                    }</strong>
                  </li>
                `
              }
            )
            .join('')}
        </ul>
      </div>

      <button class="btn-start-from-modal" id="closeDetailsViewBtn" style="width: 100%; padding: 14px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; box-shadow: none; margin-top: 24px;">
        Fechar Detalhes
      </button>
    `;

    // Adiciona listener ao botão de fechar detalhes
    const closeDetailsBtn = document.getElementById('closeDetailsViewBtn');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            closeAssessmentModal();
            // Garante que a aba de histórico esteja ativa
            document.querySelector('.tab-btn[data-tab="historico"]').click();
        });
    }

    assessmentModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
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
      closeAssessmentModal();
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
    'tendencias': 'Tendências',
    'autocuidado': 'Autocuidado',
    'configuracoes': 'Configurações',
    'perfil': 'Perfil',
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
  // Carrega o histórico da API ao iniciar
  loadHistory();
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  console.log('🎉 Autoavaliações (API) carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();