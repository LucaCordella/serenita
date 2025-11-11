// tendencias.js - Lógica completa de Tendências e Relatórios

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
  
  // Charts
  let moodChart = null;
  let symptomsChart = null;

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
      if (targetTab === 'humor') {
        document.getElementById('tabHumor').classList.add('active');
        if (!moodChart) createMoodChart();
      } else if (targetTab === 'sintomas') {
        document.getElementById('tabSintomas').classList.add('active');
        if (!symptomsChart) createSymptomsChart();
      } else if (targetTab === 'insights') {
        document.getElementById('tabInsights').classList.add('active');
        loadInsights();
      }
    });
  });

  // ===== DADOS DO LOCALSTORAGE =====
  function getMoodData() {
    return JSON.parse(localStorage.getItem('moodEntries') || '[]');
  }

  function getSymptomData() {
    return JSON.parse(localStorage.getItem('symptomEntries') || '[]');
  }

  // ===== GRÁFICO DE HUMOR =====
  function createMoodChart() {
    const ctx = document.getElementById('moodChart');
    if (!ctx) return;

    const moodData = getMoodData();
    
    // Se não houver dados, mostra mensagem
    if (moodData.length === 0) {
      ctx.parentElement.innerHTML = `
        <div style="text-align:center; padding:60px 20px; color: var(--text-muted);">
          <i data-lucide="smile" style="width:64px; height:64px; opacity:0.5; margin:0 auto 16px;"></i>
          <p style="font-size:16px; font-weight:600; margin:0 0 6px;">Nenhum dado de humor ainda</p>
          <p style="font-size:14px; margin:0;">Registre seus humores para ver tendências!</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Pegar últimos 30 dias
    const last30Days = moodData.slice(0, 30).reverse();
    
    const labels = last30Days.map(entry => {
      const date = new Date(entry.date);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    });
    
    const data = last30Days.map(entry => entry.intensity);

    moodChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nível de Humor',
          data: data,
          borderColor: '#60A5FA',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#60A5FA',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(20, 24, 36, 0.95)',
            titleColor: '#e6eef6',
            bodyColor: '#98a2b3',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context) {
                const labels = ['Terrível', 'Ruim', 'Ok', 'Bom', 'Ótimo'];
                return `Humor: ${labels[context.parsed.y - 1]}`;
              }
            }
          }
        },
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#94a3b8',
              callback: function(value) {
                const labels = ['', 'Terrível', 'Ruim', 'Ok', 'Bom', 'Ótimo'];
                return labels[value] || '';
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: '#94a3b8',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              display: false,
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // ===== GRÁFICO DE SINTOMAS =====
  function createSymptomsChart() {
    const ctx = document.getElementById('symptomsChart');
    if (!ctx) return;

    const symptomData = getSymptomData();
    
    // Se não houver dados, mostra mensagem
    if (symptomData.length === 0) {
      ctx.parentElement.innerHTML = `
        <div style="text-align:center; padding:60px 20px; color: var(--text-muted);">
          <i data-lucide="heart" style="width:64px; height:64px; opacity:0.5; margin:0 auto 16px;"></i>
          <p style="font-size:16px; font-weight:600; margin:0 0 6px;">Nenhum sintoma registrado ainda</p>
          <p style="font-size:14px; margin:0;">Registre sintomas para ver frequências!</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Agrupar por semana
    const weeklyData = groupSymptomsByWeek(symptomData);
    
    symptomsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyData.labels,
        datasets: [
          {
            label: 'Físico',
            data: weeklyData.fisico,
            backgroundColor: '#F87171',
            borderRadius: 6
          },
          {
            label: 'Mental',
            data: weeklyData.mental,
            backgroundColor: '#A78BFA',
            borderRadius: 6
          },
          {
            label: 'Sono',
            data: weeklyData.sono,
            backgroundColor: '#60A5FA',
            borderRadius: 6
          },
          {
            label: 'Energia',
            data: weeklyData.energia,
            backgroundColor: '#FBBF24',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 15,
              font: {
                size: 13
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(20, 24, 36, 0.95)',
            titleColor: '#e6eef6',
            bodyColor: '#98a2b3',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#94a3b8',
              stepSize: 1
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: '#94a3b8'
            },
            grid: {
              display: false,
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // Agrupar sintomas por semana
  function groupSymptomsByWeek(symptoms) {
    const weeks = {};
    const categories = ['fisico', 'mental', 'sono', 'energia'];
    
    symptoms.forEach(symptom => {
      const date = new Date(symptom.date);
      const weekNum = getWeekNumber(date);
      const weekKey = `Semana ${weekNum}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { fisico: 0, mental: 0, sono: 0, energia: 0 };
      }
      
      if (categories.includes(symptom.category)) {
        weeks[weekKey][symptom.category]++;
      }
    });
    
    const labels = Object.keys(weeks).slice(-4); // Últimas 4 semanas
    const fisico = labels.map(week => weeks[week].fisico);
    const mental = labels.map(week => weeks[week].mental);
    const sono = labels.map(week => weeks[week].sono);
    const energia = labels.map(week => weeks[week].energia);
    
    return { labels, fisico, mental, sono, energia };
  }

  // Calcular número da semana
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  // ===== INSIGHTS =====
  function loadInsights() {
    const moodData = getMoodData();
    const symptomData = getSymptomData();
    
    // Carregar resumo semanal
    loadWeeklySummary(moodData, symptomData);
  }

  function updateInsightCards(moodData, symptomData) {
    // Calcular tendência de humor
    if (moodData.length >= 14) {
      const recent = moodData.slice(0, 7);
      const previous = moodData.slice(7, 14);
      const recentAvg = recent.reduce((sum, e) => sum + e.intensity, 0) / recent.length;
      const prevAvg = previous.reduce((sum, e) => sum + e.intensity, 0) / previous.length;
      const change = ((recentAvg - prevAvg) / prevAvg * 100).toFixed(0);
      
      const insightMood = document.getElementById('insightMood');
      if (insightMood) {
        const isPositive = change > 0;
        insightMood.className = `insight-card ${isPositive ? 'positive' : 'negative'}`;
        insightMood.querySelector('.insight-title').textContent = 
          isPositive ? 'Melhoria no Humor' : 'Declínio no Humor';
        insightMood.querySelector('.insight-text').textContent = 
          `Seu humor médio ${isPositive ? 'melhorou' : 'diminuiu'} ${Math.abs(change)}% nas últimas 2 semanas`;
      }
    }
    
    // Calcular sintomas mais frequentes
    if (symptomData.length > 0) {
      const recent = symptomData.slice(0, 7);
      const categoryCounts = {};
      recent.forEach(s => {
        categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
      });
      
      const mostFrequent = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      if (mostFrequent) {
        const categoryNames = {
          'fisico': 'Sintomas Físicos',
          'mental': 'Ansiedade',
          'sono': 'Problemas de Sono',
          'energia': 'Fadiga'
        };
        
        const insightAnxiety = document.getElementById('insightAnxiety');
        if (insightAnxiety) {
          insightAnxiety.querySelector('.insight-title').textContent = 
            `${categoryNames[mostFrequent[0]]} em Alta`;
          insightAnxiety.querySelector('.insight-text').textContent = 
            `Você relatou ${mostFrequent[1]} casos esta semana`;
        }
      }
    }
  }

  function loadWeeklySummary(moodData, symptomData) {
    const summaryList = document.getElementById('summaryList');
    if (!summaryList) return;
    
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    
    let html = '';
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      
      // Calcular média de humor do dia
      const dayMoods = moodData.filter(m => {
        const moodDate = new Date(m.date);
        return moodDate.toDateString() === date.toDateString();
      });
      const moodAvg = dayMoods.length > 0 
        ? dayMoods.reduce((sum, m) => sum + m.intensity, 0) / dayMoods.length 
        : 0;
      const moodPercent = (moodAvg / 5) * 100;
      
      // Contar sintomas do dia
      const daySymptoms = symptomData.filter(s => {
        const sympDate = new Date(s.date);
        return sympDate.toDateString() === date.toDateString();
      });
      const symptomsCount = daySymptoms.length;
      const symptomsPercent = Math.min((symptomsCount / 5) * 100, 100);
      
      html += `
        <div class="summary-item">
          <div class="summary-header">
            <span class="summary-day">${dayName}</span>
          </div>
          <div class="summary-bars">
            <div class="summary-bar-group">
              <div class="summary-bar-label">Humor: ${moodAvg > 0 ? moodAvg.toFixed(1) : '-'}/5</div>
              <div class="summary-bar">
                <div class="summary-bar-fill mood" style="width: ${moodPercent}%"></div>
              </div>
            </div>
            <div class="summary-bar-group">
              <div class="summary-bar-label">Sintomas: ${symptomsCount}</div>
              <div class="summary-bar">
                <div class="summary-bar-fill symptoms" style="width: ${symptomsPercent}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    summaryList.innerHTML = html;
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
    'avaliacoes': 'Autoavaliações',
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
  // Criar gráfico de humor por padrão (primeira aba)
  createMoodChart();
  
  // Inicializar ícones Lucide
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  console.log('🎉 Tendências e Relatórios carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);

})();