// tendencias.js - Lógica completa de Tendências com API
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

  // Charts
  let moodChart = null;
  let symptomsChart = null;

  // ===== NAVEGAÇÃO DE TABS (MODIFICADA para ser async) =====
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', async function () {
      const targetTab = this.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      tabContents.forEach((content) => content.classList.remove('active'));

      try {
        if (targetTab === 'humor') {
          document.getElementById('tabHumor').classList.add('active');
          // Só cria o gráfico se ele não existir
          if (!moodChart) await createMoodChart();
        } else if (targetTab === 'sintomas') {
          document.getElementById('tabSintomas').classList.add('active');
          if (!symptomsChart) await createSymptomsChart();
        } else if (targetTab === 'insights') {
          document.getElementById('tabInsights').classList.add('active');
          await loadInsights(); // Carrega os insights
        }
      } catch (err) {
        console.error("Erro ao trocar de aba e carregar dados:", err);
        // Pode adicionar um feedback visual de erro aqui se desejar
      }
    });
  });

  // ===== DADOS DA API (MODIFICADO) =====
  
  // Cache para evitar buscas repetidas na mesma sessão
  let moodDataCache = null;
  let symptomDataCache = null;

  async function getMoodData() {
    if (moodDataCache) return moodDataCache; // Retorna do cache se já buscou
    
    const res = await fetch('http://localhost:4000/api/entries?type=mood', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Falha ao buscar dados de humor');
    moodDataCache = await res.json();
    return moodDataCache;
  }

  async function getSymptomData() {
    if (symptomDataCache) return symptomDataCache; // Retorna do cache

    const res = await fetch('http://localhost:4000/api/entries?type=symptom', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Falha ao buscar dados de sintomas');
    symptomDataCache = await res.json();
    return symptomDataCache;
  }

  // ===== GRÁFICO DE HUMOR (MODIFICADO PARA API) =====
  async function createMoodChart() {
    const ctx = document.getElementById('moodChart');
    if (!ctx) return;

    let moodData;
    try {
      moodData = await getMoodData();
    } catch (err) {
      console.error(err);
      ctx.parentElement.innerHTML = `<div class="empty-state" style="padding: 60px 20px;"><p class="empty-text" style="color: #F87171;">${err.message}</p></div>`;
      return;
    }

    if (moodData.length === 0) {
      ctx.parentElement.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:60px 20px; color: var(--text-muted);">
          <i data-lucide="smile" style="width:64px; height:64px; opacity:0.5; margin:0 auto 16px;"></i>
          <p style="font-size:16px; font-weight:600; margin:0 0 6px;">Nenhum dado de humor ainda</p>
          <p style="font-size:14px; margin:0;">Registre seus humores para ver tendências!</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Pegar últimos 30 dias (do mais antigo para o mais novo)
    const last30Days = moodData.slice(0, 30).reverse();

    const labels = last30Days.map((entry) => {
      const date = new Date(entry.created_at); // Usar created_at
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    });

    // Os dados agora estão em 'entry.data.intensity'
    const data = last30Days.map((entry) => entry.data.intensity);

    if (moodChart) {
      moodChart.destroy(); // Destrói gráfico antigo se existir
    }
    
    moodChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
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
            fill: true,
          },
        ],
      },
      options: { // Opções do gráfico (sem alteração)
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20, 24, 36, 0.95)',
            titleColor: '#e6eef6',
            bodyColor: '#98a2b3',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function (context) {
                // Ajusta o array de labels para 1-5
                const labels = ['Terrível', 'Ruim', 'Ok', 'Bom', 'Ótimo'];
                const valueIndex = context.parsed.y - 1;
                if (valueIndex >= 0 && valueIndex < labels.length) {
                   return `Humor: ${labels[valueIndex]}`;
                }
                return `Humor: ${context.parsed.y}`;
              },
            },
          },
        },
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#94a3b8',
              callback: function (value) {
                const labels = ['', 'Terrível', 'Ruim', 'Ok', 'Bom', 'Ótimo'];
                return labels[value] || '';
              },
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false,
            },
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false, drawBorder: false },
          },
        },
      },
    });
  }

  // ===== GRÁFICO DE SINTOMAS (MODIFICADO PARA API) =====
  async function createSymptomsChart() {
    const ctx = document.getElementById('symptomsChart');
    if (!ctx) return;

    let symptomData;
    try {
      symptomData = await getSymptomData();
    } catch (err) {
      console.error(err);
      ctx.parentElement.innerHTML = `<div class="empty-state" style="padding: 60px 20px;"><p class="empty-text" style="color: #F87171;">${err.message}</p></div>`;
      return;
    }

    if (symptomData.length === 0) {
      ctx.parentElement.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:60px 20px; color: var(--text-muted);">
          <i data-lucide="heart" style="width:64px; height:64px; opacity:0.5; margin:0 auto 16px;"></i>
          <p style="font-size:16px; font-weight:600; margin:0 0 6px;">Nenhum sintoma registrado ainda</p>
          <p style="font-size:14px; margin:0;">Registre sintomas para ver frequências!</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Agrupar por semana (lógica helper foi atualizada)
    const weeklyData = groupSymptomsByWeek(symptomData);

    if (symptomsChart) {
      symptomsChart.destroy(); // Destrói gráfico antigo se existir
    }

    symptomsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyData.labels,
        datasets: [
          {
            label: 'Físico',
            data: weeklyData.fisico,
            backgroundColor: '#F87171',
            borderRadius: 6,
          },
          {
            label: 'Mental',
            data: weeklyData.mental,
            backgroundColor: '#A78BFA',
            borderRadius: 6,
          },
          {
            label: 'Sono',
            data: weeklyData.sono,
            backgroundColor: '#60A5FA',
            borderRadius: 6,
          },
          {
            label: 'Energia',
            data: weeklyData.energia,
            backgroundColor: '#FBBF24',
            borderRadius: 6,
          },
          {
            label: 'Outro',
            data: weeklyData.outro,
            backgroundColor: '#94A3B8',
            borderRadius: 6,
          }
        ],
      },
      options: { // Opções do gráfico (sem alteração)
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 15,
              font: { size: 13 },
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(20, 24, 36, 0.95)',
            titleColor: '#e6eef6',
            bodyColor: '#98a2b3',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8', stepSize: 1 },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false,
            },
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false, drawBorder: false },
          },
        },
      },
    });
  }

  // Helper: Agrupar sintomas por semana (MODIFICADO PARA API)
  function groupSymptomsByWeek(symptoms) {
    const weeks = {};
    const categories = ['fisico', 'mental', 'sono', 'energia', 'outro'];
    
    // Pega apenas as últimas 4 semanas de dados
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentSymptoms = symptoms.filter(s => new Date(s.created_at) > fourWeeksAgo);

    recentSymptoms.forEach((symptom) => {
      const date = new Date(symptom.created_at); // Usar created_at
      const weekNum = getWeekNumber(date);
      const weekKey = `Semana ${weekNum}`;

      if (!weeks[weekKey]) {
        weeks[weekKey] = { fisico: 0, mental: 0, sono: 0, energia: 0, outro: 0, weekStart: getStartOfWeek(date) };
      }

      const category = symptom.data.category; // Usar data.category
      if (categories.includes(category)) {
        weeks[weekKey][category]++;
      }
    });

    // Ordenar as chaves das semanas
    const sortedWeekKeys = Object.keys(weeks).sort((a, b) => {
        return weeks[a].weekStart - weeks[b].weekStart;
    });

    // Pegar apenas as últimas 4 semanas
    const labels = sortedWeekKeys.slice(-4);
    
    const fisico = labels.map((week) => weeks[week].fisico);
    const mental = labels.map((week) => weeks[week].mental);
    const sono = labels.map((week) => weeks[week].sono);
    const energia = labels.map((week) => weeks[week].energia);
    const outro = labels.map((week) => weeks[week].outro);

    return { labels, fisico, mental, sono, energia, outro };
  }

  // Helper: Calcular número da semana
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  // Helper: Pegar o início da semana (para ordenação)
  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // assume segunda como início da semana
    return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
  }


  // ===== INSIGHTS (MODIFICADO PARA API) =====
  async function loadInsights() {
    try {
      const moodData = await getMoodData();
      const symptomData = await getSymptomData();
      loadWeeklySummary(moodData, symptomData);
      
      // Carregar recomendações (lógica estática)
      // (aqui você poderia adicionar lógica de IA no futuro)
      loadRecommendations(moodData, symptomData);

    } catch (err) {
      console.error("Erro ao carregar insights:", err);
      const summaryList = document.getElementById('summaryList');
      if(summaryList) summaryList.innerHTML = `<div class="empty-state" style="padding: 20px;"><p class="empty-text" style="color: #F87171;">${err.message}</p></div>`;
    }
  }

  // Helper: Carregar Resumo Semanal (MODIFICADO PARA API)
  function loadWeeklySummary(moodData, symptomData) {
    const summaryList = document.getElementById('summaryList');
    if (!summaryList) return;

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    let html = '';

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = (i === 0) ? 'Hoje' : days[date.getDay()];
      const dateString = date.toISOString().split('T')[0];

      // Calcular média de humor do dia
      const dayMoods = moodData.filter((m) => {
        const moodDate = new Date(m.created_at).toISOString().split('T')[0];
        return moodDate === dateString;
      });
      
      // moodAvg usa m.data.intensity
      const moodAvg =
        dayMoods.length > 0
          ? dayMoods.reduce((sum, m) => sum + m.data.intensity, 0) / dayMoods.length
          : 0;
      const moodPercent = (moodAvg / 5) * 100;

      // Contar sintomas do dia
      const daySymptoms = symptomData.filter((s) => {
        const sympDate = new Date(s.created_at).toISOString().split('T')[0];
        return sympDate === dateString;
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
  
  // Helper: Carregar Recomendações (Lógica estática, sem alterações)
  function loadRecommendations(moodData, symptomData) {
      const recommendationsList = document.getElementById('recommendationsList');
      if (!recommendationsList) return;
      
      let html = '';
      
      // Lógica simples: se o humor médio da semana for bom
      const last7DaysMood = moodData.filter(m => {
          const date = new Date(m.created_at);
          const today = new Date();
          const sevenDaysAgo = new Date(today.setDate(today.getDate() - 7));
          return date > sevenDaysAgo;
      });
      
      const moodAvg = last7DaysMood.length > 0
          ? last7DaysMood.reduce((sum, m) => sum + m.data.intensity, 0) / last7DaysMood.length
          : 0;

      if (moodAvg > 3.5) {
          html += `
            <div class="recommendation-item positive">
              <i data-lucide="check-circle" class="recommendation-icon"></i>
              <div class="recommendation-content">
                <h4 class="recommendation-title">Seu humor está ótimo!</h4>
                <p class="recommendation-text">Seu humor médio da semana está alto. Continue fazendo o que está funcionando para você!</p>
              </div>
            </div>
          `;
      }

      // Lógica simples: se houver muitos sintomas de sono
      const sleepSymptoms = symptomData.filter(s => s.data.category === 'sono').length;
      if (sleepSymptoms > 2) {
           html += `
            <div class="recommendation-item warning">
              <i data-lucide="moon" class="recommendation-icon"></i>
              <div class="recommendation-content">
                <h4 class="recommendation-title">Foque na qualidade do sono</h4>
                <p class="recommendation-text">Notamos alguns registros de sono. Considere uma rotina de sono mais consistente.</p>
              </div>
            </div>
          `;
      }
      
      if (html === '') {
           html = `
            <div class="recommendation-item">
              <i data-lucide="list" class="recommendation-icon" style="color: #94A3B8;"></i>
              <div class="recommendation-content">
                <h4 class="recommendation-title">Continue Registrando</h4>
                <p class="recommendation-text">Continue registrando seus humores e sintomas diariamente para receber insights personalizados.</p>
              </div>
            </div>
           `;
      }
      
      recommendationsList.innerHTML = html;
      if (typeof lucide !== 'undefined') lucide.createIcons();
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
    // currentUser já foi carregado no topo do script
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
    avaliacoes: 'Autoavaliações',
    autocuidado: 'Autocuidado',
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
  // Criar gráfico de humor por padrão (primeira aba)
  (async () => {
    try {
      await createMoodChart();
    } catch (e) {
      console.error("Erro na inicialização do gráfico de humor:", e);
    }
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  })();
  
  console.log('🎉 Tendências e Relatórios carregado com sucesso!');
  console.log('👤 Usuário:', currentUser.firstName, currentUser.lastName);
})();