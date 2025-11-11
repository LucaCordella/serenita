// avaliacoes.js - Lógica completa de Autoavaliações
(function () {
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
    const initials =
      currentUser.firstName.charAt(0).toUpperCase() +
      (currentUser.lastName ? currentUser.lastName.charAt(0).toUpperCase() : '');
    userInitialsEl.textContent = initials;
  }

  // ===== ELEMENTOS DO DOM =====
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const historyList = document.getElementById('historyList');

  // Modal de Avaliação (O principal para esta funcionalidade)
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

  // ===== DADOS DAS AVALIAÇÕES (Atualizado com perguntas e pontuação) =====
  // Adicionamos as opções de resposta e valores para o cálculo
  const answerOptions = [
    { text: 'De modo algum', value: 0 },
    { text: 'Vários dias', value: 1 },
    { text: 'Mais da metade dos dias', value: 2 },
    { text: 'Quase todos os dias', value: 3 },
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
      // Pontuação: 0-4 (Mínima), 5-9 (Leve), 10-14 (Moderada), 15-21 (Grave)
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
          max: 21,
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
      questions: 10,
      color: '#F87171', // Vermelho
      description:
        'Esta avaliação é baseada na Escala de Estresse Percebido (PSS-10) e mede o quão estressante você considerou sua vida no último mês.',
      instructions:
        'No último mês, com que frequência você se sentiu ou pensou de determinada maneira?',
      options: [
        { text: 'Nunca', value: 0 },
        { text: 'Quase nunca', value: 1 },
        { text: 'Às vezes', value: 2 },
        { text: 'Quase sempre', value: 3 },
        { text: 'Sempre', value: 4 },
      ],
      // Itens positivos (4, 5, 7, 8) têm pontuação invertida (0=4, 1=3, 2=2, 3=1, 4=0)
      // No nosso caso, vamos simplificar e usar perguntas diretas com pontuação 0-3
      items: [
         { text: 'No último mês, com que frequência você esteve chateado(a) por causa de algo que aconteceu inesperadamente?' },
        { text: 'No último mês, com que frequência você sentiu que foi incapaz de controlar as coisas importantes em sua vida?' },
        { text: 'No último mês, com que frequência você se sentiu nervoso(a) ou estressado(a)?' },
        { text: 'No último mês, com que frequência você sentiu dificuldade em lidar com todas as coisas que tinha para fazer?' },
        { text: 'No último mês, com que frequência você sentiu que as dificuldades estavam se acumulando tanto que você não poderia superá-las?' },
        // Vamos usar 5 perguntas para simplificar, com opções 0-3
      ],
      // Pontuação (para 5 perguntas, 0-3): Max 15
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
          max: 15,
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
      // Pontuação (0-3 por pergunta): Max 27
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
          max: 27,
          interpretation: 'Bom Nível de Autocuidado',
          color: '#10B981',
          desc: 'Excelente! Você está ativamente engajado(a) em cuidar do seu bem-estar emocional. Continue assim!',
        },
      },
    },
  };

  // ===== NAVEGAÇÃO DE TABS =====
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

  // ===== MODAL DE DETALHES (Placeholder/Info) =====
  // Esta função apenas mostra informações, não inicia o quiz.
  detailsBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const assessmentKey = this.dataset.assessment;
      openDetailsModal(assessmentKey);
    });
  });

  function openDetailsModal(assessmentKey) {
    const data = assessmentsData[assessmentKey];
    if (!data) return;

    // Usando o modal de avaliação para exibir detalhes (como no seu HTML)
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

    // Adiciona evento ao botão "Começar" dentro do modal
    const modalStartBtn = assessmentModalContent.querySelector(
      '.btn-start-from-modal'
    );
    if (modalStartBtn) {
      modalStartBtn.addEventListener('click', function () {
        const assessment = this.dataset.assessment;
        // Não fechamos, apenas iniciamos o quiz no mesmo modal
        startAssessment(assessment);
      });
    }

    assessmentModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ===== INICIAR AVALIAÇÃO (Passo 3 e 4) =====
  startBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const assessmentKey = this.dataset.assessment;
      startAssessment(assessmentKey);
    });
  });

  function startAssessment(assessmentKey) {
    // Configura o estado inicial do quiz
    currentAssessmentKey = assessmentKey;
    currentQuestionIndex = 0;
    const data = assessmentsData[assessmentKey];
    userAnswers = new Array(data.items.length).fill(null); // Array para armazenar respostas

    // Renderiza a primeira pergunta
    renderQuestion();

    // Abre o modal
    assessmentModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Renderiza a pergunta atual no modal
  function renderQuestion() {
    const data = assessmentsData[currentAssessmentKey];
    const question = data.items[currentQuestionIndex];
    const options = data.options;
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

    // Recriar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Adicionar event listeners delegados para o modal
  assessmentModal.addEventListener('click', function (e) {
    const data = assessmentsData[currentAssessmentKey];

    // Clicar em uma opção de resposta
    if (e.target.classList.contains('answer-option')) {
      const selectedValue = parseInt(e.target.dataset.value);
      userAnswers[currentQuestionIndex] = selectedValue; // Salva a resposta

      // Remove 'selected' de todos e adiciona no clicado
      assessmentModal
        .querySelectorAll('.answer-option')
        .forEach((btn) => btn.classList.remove('selected'));
      e.target.classList.add('selected');

      // Habilita o botão "Próximo"
      assessmentModal.querySelector('.btn-next').disabled = false;
    }

    // Clicar em "Próximo"
    if (e.target.classList.contains('btn-next')) {
      const isLastQuestion = currentQuestionIndex === data.items.length - 1;
      if (isLastQuestion) {
        // Finalizar
        handleFinishAssessment();
      } else {
        // Próxima pergunta
        currentQuestionIndex++;
        renderQuestion();
      }
    }

    // Clicar em "Anterior"
    if (e.target.classList.contains('btn-previous')) {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
      }
    }
  });

  // Fechar Modal
  if (closeAssessmentModalBtn) {
    closeAssessmentModalBtn.addEventListener('click', closeAssessmentModal);
  }
  if (assessmentOverlay) {
    assessmentOverlay.addEventListener('click', closeAssessmentModal);
  }

  function closeAssessmentModal() {
    assessmentModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    // Reseta o estado
    currentAssessmentKey = null;
    currentQuestionIndex = 0;
    userAnswers = [];
  }

  // ===== CÁLCULO E SALVAMENTO (Passo 4 e 5) =====
  function handleFinishAssessment() {
    const data = assessmentsData[currentAssessmentKey];

    // 1. Calcular o resultado
    const totalScore = userAnswers.reduce((sum, value) => sum + value, 0);
    const maxScore =
      data.options[data.options.length - 1].value * data.items.length;

    // 2. Encontrar interpretação
    let resultInterpretation = {};
    for (const key in data.scoring) {
      if (totalScore <= data.scoring[key].max) {
        resultInterpretation = data.scoring[key];
        break;
      }
    }

    // 3. Criar objeto de resultado
    const result = {
      id: Date.now(),
      assessmentKey: currentAssessmentKey,
      title: data.title,
      category: data.category,
      date: new Date().toISOString(),
      score: totalScore,
      maxScore: maxScore,
      color: resultInterpretation.color,
      interpretation: resultInterpretation.interpretation,
      description: resultInterpretation.desc,
      answers: userAnswers,
      userId: currentUser.id || currentUser.email,
    };

    // 4. Salvar no localStorage
    saveAssessmentResult(result);

    // 5. Renderizar tela de resultado
    renderResult(result);

    // 6. Recarregar o histórico em segundo plano (para a próxima vez que a aba for aberta)
    loadHistory();
  }

  function saveAssessmentResult(result) {
    let assessments = JSON.parse(
      localStorage.getItem('assessmentHistory') || '[]'
    );
    assessments.unshift(result); // Adiciona no início

    // Limita o histórico
    if (assessments.length > 20) {
      assessments = assessments.slice(0, 20);
    }

    localStorage.setItem('assessmentHistory', JSON.stringify(assessments));
  }

  // Renderiza a tela de resultado no modal
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

    // Adiciona evento ao botão de fechar
    document
      .getElementById('finishAndCloseBtn')
      .addEventListener('click', () => {
        closeAssessmentModal();
        // Mudar para a aba de histórico
        document.querySelector('.tab-btn[data-tab="historico"]').click();
      });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ===== HISTÓRICO (Atualizado para usar localStorage) =====
  function loadHistory() {
    const assessments = JSON.parse(
      localStorage.getItem('assessmentHistory') || '[]'
    );

    if (assessments.length === 0) {
      // Mostrar empty state
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

    historyList.innerHTML = assessments
      .map((item) => {
        const dateStr = new Date(item.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const daysAgo = Math.floor(
          (new Date() - new Date(item.date)) / (1000 * 60 * 60 * 24)
        );
        const timeStr =
          daysAgo === 0
            ? 'Hoje'
            : `há ${daysAgo} ${daysAgo === 1 ? 'dia' : 'dias'}`;

        const percentage = (item.score / item.maxScore) * 100;

        return `
        <div class="history-assessment-card" data-id="${item.id}">
          <div class="history-card-header">
            <div class="history-card-title">
              <span class="category-badge ${categoryColors[item.category]}">${
          item.category
        }</span>
              <h3 class="history-assessment-name">${item.title}</h3>
            </div>
            <span class="history-date">${timeStr}</span>
          </div>
          <div class="history-score">
            <span class="score-label">Pontuação: ${item.score}/${
          item.maxScore
        }</span>
            <span class="score-value">${dateStr}</span>
          </div>
          <div class="history-progress-bar">
            <div class="history-progress-fill" style="width: ${percentage}%; background: ${
          item.color
        };"></div>
          </div>
          <p class="history-interpretation">${item.interpretation}</p>
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

    // Adicionar eventos aos botões de detalhes do histórico
    historyList.querySelectorAll('.btn-view-details').forEach((btn) => {
      btn.addEventListener('click', function () {
        const id = this.dataset.id;
        const item = assessments.find((h) => h.id === parseInt(id));
        if (item) {
          showAssessmentDetails(item);
        }
      });
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Mostrar detalhes de um item do histórico (usa o mesmo modal)
  function showAssessmentDetails(assessment) {
    const data = assessmentsData[assessment.assessmentKey];

    assessmentModalContent.innerHTML = `
      <div class="details-modal-header" style="text-align: left; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <span class="category-badge ${assessment.assessmentKey}">${
      assessment.category
    }</span>
        <h2 class="details-modal-title" style="font-size: 24px; margin: 12px 0 8px;">${
          assessment.title
        }</h2>
        <p class="details-modal-subtitle" style="font-size: 14px; color: var(--text-muted);">
          Realizada em ${new Date(assessment.date).toLocaleDateString('pt-BR', {
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
              assessment.score
            }/${assessment.maxScore}</span>
          </div>
          <div class="history-progress-bar" style="margin-bottom: 0;">
            <div class="history-progress-fill" style="width: ${
              (assessment.score / assessment.maxScore) * 100
            }%; background: ${assessment.color};"></div>
          </div>
        </div>
        <p style="margin: 12px 0 0; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
          <strong style="color: var(--text-primary);">Interpretação:</strong> ${
            assessment.interpretation
          }
        </p>
        <p style="margin: 12px 0 0; color: var(--text-muted); font-size: 14px; line-height: 1.6;">
          ${assessment.description}
        </p>
      </div>

      <div class="details-section" style="margin-top: 24px;">
        <h3 class="details-section-title" style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: var(--text-secondary);">Suas Respostas</h3>
        <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
          ${data.items
            .map(
              (item, index) => `
            <li style="font-size: 14px; color: var(--text-muted); background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${
              data.options[assessment.answers[index]].value > 1
                ? assessment.color
                : 'var(--border-primary)'
            };">
              ${item.text}
              <br>
              <strong style="color: var(--text-primary);">${
                data.options[assessment.answers[index]].text
              }</strong>
            </li>
          `
            )
            .join('')}
        </ul>
      </div>

      <button class="btn-start-from-modal" id="closeDetailsViewBtn" style="width: 100%; padding: 14px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; box-shadow: none; margin-top: 24px;">
        Fechar Detalhes
      </button>
    `;

    // Adiciona evento ao botão de fechar
    document
      .getElementById('closeDetailsViewBtn')
      .addEventListener('click', () => {
        // Apenas renderiza a primeira pergunta de volta (ou fecha o modal)
        // Por simplicidade, vamos fechar o modal
        closeAssessmentModal();
        // E garantir que a aba de histórico esteja ativa
        document.querySelector('.tab-btn[data-tab="historico"]').click();
      });

    assessmentModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
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
      if (
        !profileBtn.contains(e.target) &&
        !profileDropdown.contains(e.target)
      ) {
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
      closeAssessmentModal(); // Fecha o modal de avaliação também
    }
  });

  // ===== ALERTAS "EM DESENVOLVIMENTO" =====
  function showDevelopmentAlert(featureName) {
    alert(
      `Ainda estamos desenvolvendo essa funcionalidade: ${featureName} 🚧\n\nEm breve estará disponível!`
    );
  }

  // ===== SISTEMA DE NAVEGAÇÃO UNIVERSAL =====
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
    autocuidado: 'Autocuidado',
    configuracoes: 'Configurações',
    perfil: 'Perfil',
    tendencias: 'Tendências', // Adicionado
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
  // Carrega o histórico na aba de histórico por padrão
  loadHistory();

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  console.log('🎉 Autoavaliações carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();