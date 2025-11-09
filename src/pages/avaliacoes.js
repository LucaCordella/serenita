// avaliacoes.js - Lógica completa de Autoavaliações

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
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const detailsModal = document.getElementById('detailsModal');
  const detailsOverlay = document.getElementById('detailsOverlay');
  const closeDetails = document.getElementById('closeDetails');
  const detailsContent = document.getElementById('detailsContent');
  const historyList = document.getElementById('historyList');

  // ===== DADOS DAS AVALIAÇÕES =====
  const assessmentsData = {
    ansiedade: {
      title: 'Triagem de Ansiedade',
      category: 'Ansiedade',
      duration: '3-5 min',
      questions: 7,
      description: 'Esta avaliação ajuda a identificar sintomas de ansiedade e seu nível de intensidade. Baseada em escalas psicológicas validadas, ela fornece insights sobre possíveis preocupações relacionadas à ansiedade.',
      what: 'Sintomas físicos e emocionais de ansiedade, preocupações excessivas, nervosismo, e dificuldade de relaxar.',
      how: 'Você responderá 7 perguntas sobre como tem se sentido nas últimas 2 semanas. Cada resposta será pontuada para gerar um resultado final.',
      benefits: [
        'Identificar níveis de ansiedade',
        'Reconhecer padrões de preocupação',
        'Obter recomendações personalizadas',
        'Acompanhar progresso ao longo do tempo'
      ]
    },
    estresse: {
      title: 'Avaliação de Estresse',
      category: 'Estresse',
      duration: '5-7 min',
      questions: 10,
      description: 'Uma avaliação completa dos seus níveis de estresse atual, ajudando a identificar fontes de tensão e como elas estão afetando seu bem-estar físico e mental.',
      what: 'Níveis de tensão, sobrecarga, irritabilidade, dificuldade de concentração e sintomas físicos relacionados ao estresse.',
      how: 'Responda 10 perguntas sobre situações e sintomas recentes. O sistema calculará seu nível de estresse e fornecerá orientações.',
      benefits: [
        'Medir níveis de estresse',
        'Identificar principais estressores',
        'Receber estratégias de enfrentamento',
        'Prevenir burnout'
      ]
    },
    sono: {
      title: 'Índice de Qualidade do Sono',
      category: 'Sono',
      duration: '3-5 min',
      questions: 8,
      description: 'Avalie a qualidade do seu sono e identifique possíveis problemas que podem estar afetando seu descanso e recuperação.',
      what: 'Qualidade do sono, dificuldade para dormir, despertares noturnos, sensação de descanso ao acordar e sonolência diurna.',
      how: '8 perguntas sobre seus padrões de sono nas últimas 4 semanas. O resultado indicará a qualidade geral do seu sono.',
      benefits: [
        'Avaliar qualidade do sono',
        'Identificar problemas de sono',
        'Receber dicas de higiene do sono',
        'Melhorar descanso e energia'
      ]
    },
    mindfulness: {
      title: 'Avaliação de Atenção Plena',
      category: 'Mindfulness',
      duration: '6-8 min',
      questions: 12,
      description: 'Meça seu nível atual de atenção plena e consciência presente. Esta avaliação ajuda a entender como você se relaciona com o momento presente.',
      what: 'Consciência do momento presente, capacidade de observar pensamentos sem julgamento, atenção ao corpo e experiências sensoriais.',
      how: '12 perguntas sobre como você experiencia diferentes situações do dia a dia. Suas respostas revelarão seu nível de mindfulness.',
      benefits: [
        'Medir consciência presente',
        'Identificar áreas para prática',
        'Acompanhar desenvolvimento de mindfulness',
        'Reduzir reatividade emocional'
      ]
    },
    autocuidado: {
      title: 'Autocuidado Emocional',
      category: 'Autocuidado',
      duration: '4-6 min',
      questions: 9,
      description: 'Avalie suas práticas de autocuidado e bem-estar emocional. Identifique áreas que precisam de mais atenção para manter seu equilíbrio.',
      what: 'Práticas de autocuidado físico, emocional, social e espiritual. Equilíbrio entre demandas e cuidado pessoal.',
      how: '9 perguntas sobre diferentes aspectos do autocuidado. O resultado mostrará onde você está indo bem e onde pode melhorar.',
      benefits: [
        'Avaliar práticas de autocuidado',
        'Identificar necessidades não atendidas',
        'Criar plano de autocuidado',
        'Prevenir esgotamento emocional'
      ]
    }
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
      if (targetTab === 'disponiveis') {
        document.getElementById('tabDisponiveis').classList.add('active');
      } else if (targetTab === 'historico') {
        document.getElementById('tabHistorico').classList.add('active');
        loadHistory();
      }
    });
  });

  // ===== BOTÕES "DETALHES" =====
  const detailsBtns = document.querySelectorAll('.btn-details');
  
  detailsBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const assessment = this.dataset.assessment;
      openDetailsModal(assessment);
    });
  });

  // ===== BOTÕES "FAZER AVALIAÇÃO" =====
  const startBtns = document.querySelectorAll('.btn-start');
  
  startBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const assessment = this.dataset.assessment;
      startAssessment(assessment);
    });
  });

  // ===== MODAL DE DETALHES =====
  function openDetailsModal(assessmentKey) {
    const data = assessmentsData[assessmentKey];
    if (!data) return;

    const categoryColors = {
      'Ansiedade': 'ansiedade',
      'Estresse': 'estresse',
      'Sono': 'sono',
      'Mindfulness': 'mindfulness',
      'Autocuidado': 'autocuidado'
    };

    const benefitsList = data.benefits.map(b => `<li>${b}</li>`).join('');

    detailsContent.innerHTML = `
      <div class="details-modal-header">
        <span class="category-badge ${categoryColors[data.category]}">${data.category}</span>
        <h2 class="details-modal-title">${data.title}</h2>
        <p class="details-modal-subtitle">${data.description}</p>
      </div>

      <div class="details-section">
        <h3 class="details-section-title">O que será avaliado</h3>
        <p class="details-section-content">${data.what}</p>
      </div>

      <div class="details-section">
        <h3 class="details-section-title">Como funciona</h3>
        <p class="details-section-content">${data.how}</p>
      </div>

      <div class="details-section">
        <h3 class="details-section-title">Benefícios</h3>
        <div class="details-section-content">
          <ul>${benefitsList}</ul>
        </div>
      </div>

      <button class="btn-start-from-modal" data-assessment="${assessmentKey}">
        Começar Avaliação
      </button>
    `;

    // Adicionar evento ao botão do modal
    const modalStartBtn = detailsContent.querySelector('.btn-start-from-modal');
    if (modalStartBtn) {
      modalStartBtn.addEventListener('click', function() {
        const assessment = this.dataset.assessment;
        closeDetailsModal();
        startAssessment(assessment);
      });
    }

    detailsModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function closeDetailsModal() {
    if (detailsModal) {
      detailsModal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }

  if (closeDetails) {
    closeDetails.addEventListener('click', closeDetailsModal);
  }

  if (detailsOverlay) {
    detailsOverlay.addEventListener('click', closeDetailsModal);
  }

  // ===== INICIAR AVALIAÇÃO =====
  function startAssessment(assessmentKey) {
    const data = assessmentsData[assessmentKey];
    alert(`🚧 Funcionalidade em Desenvolvimento\n\nA avaliação "${data.title}" será implementada em breve!\n\nEm breve você poderá responder as ${data.questions} perguntas e receber seu resultado personalizado.`);
  }

  // ===== HISTÓRICO =====
  function loadHistory() {
    // Dados mock para exemplo
    const mockHistory = [
      {
        id: 1,
        assessment: 'ansiedade',
        title: 'Triagem de Ansiedade',
        category: 'Ansiedade',
        date: new Date(),
        score: 8,
        maxScore: 21,
        interpretation: 'Sintomas leves de ansiedade',
        color: '#FB923C'
      },
      {
        id: 2,
        assessment: 'estresse',
        title: 'Avaliação de Estresse',
        category: 'Estresse',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
        score: 6,
        maxScore: 27,
        interpretation: 'Sintomas mínimos de estresse',
        color: '#F87171'
      }
    ];

    if (mockHistory.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
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
      'Ansiedade': 'ansiedade',
      'Estresse': 'estresse',
      'Sono': 'sono',
      'Mindfulness': 'mindfulness',
      'Autocuidado': 'autocuidado'
    };

    historyList.innerHTML = mockHistory.map(item => {
      const dateStr = item.date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short',
        year: 'numeric'
      });
      
      const daysAgo = Math.floor((new Date() - item.date) / (1000 * 60 * 60 * 24));
      const timeStr = daysAgo === 0 ? 'Hoje' : `${daysAgo} dias atrás`;
      
      const percentage = (item.score / item.maxScore) * 100;

      return `
        <div class="history-assessment-card">
          <div class="history-card-header">
            <div class="history-card-title">
              <span class="category-badge ${categoryColors[item.category]}">${item.category}</span>
              <h3 class="history-assessment-name">${item.title}</h3>
            </div>
            <span class="history-date">${timeStr}</span>
          </div>

          <div class="history-score">
            <span class="score-label">Pontuação: ${item.score}/${item.maxScore}</span>
            <span class="score-value">${dateStr}</span>
          </div>

          <div class="history-progress-bar">
            <div class="history-progress-fill" style="width: ${percentage}%; background: ${item.color};"></div>
          </div>

          <p class="history-interpretation">${item.interpretation}</p>

          <button class="btn-view-details" data-id="${item.id}">
            <i data-lucide="external-link"></i>
            Ver Detalhes
          </button>
        </div>
      `;
    }).join('');

    // Adicionar eventos aos botões de detalhes
    const viewDetailsBtns = document.querySelectorAll('.btn-view-details');
    viewDetailsBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.dataset.id;
        const item = mockHistory.find(h => h.id === parseInt(id));
        if (item) {
          alert(`📊 Detalhes da Avaliação\n\n${item.title}\nData: ${item.date.toLocaleDateString('pt-BR')}\nPontuação: ${item.score}/${item.maxScore}\nResultado: ${item.interpretation}\n\n✨ Funcionalidade completa em breve!`);
        }
      });
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ===== BOTÃO EXPORTAR =====
  const btnExport = document.querySelector('.btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      alert('🚧 Funcionalidade em Desenvolvimento\n\nA exportação de resultados será implementada em breve!\n\nVocê poderá exportar seus resultados em PDF ou CSV.');
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
      closeDetailsModal();
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

  console.log('🎉 Autoavaliações carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);

})();