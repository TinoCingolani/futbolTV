/**
 * SportsHub Live - Core Application Logic
 * Consumes public JSON: https://raw.githubusercontent.com/tadeoallende/repos-web/refs/heads/main/datos.json
 */

const DEFAULT_JSON_URL = 'https://raw.githubusercontent.com/tadeoallende/repos-web/refs/heads/main/datos.json';

// State
let rawData = { events: [], channels: [] };
let currentJsonUrl = DEFAULT_JSON_URL;
let activeTab = 'events'; // 'events' | 'channels' | 'json'
let currentSearch = '';
let currentLeague = 'personalizada'; // Default to 'personalizada' as requested
let currentStatus = 'all'; // 'all' | 'live' | 'upcoming' | 'past'
let currentViewMode = 'grid'; // 'grid' | 'list'
let channelFilter = 'all'; // 'all' | 'featured'
let channelSearch = '';

// Active Player State
let currentModalContext = {
  title: '',
  subtitle: '',
  channels: [],
  selectedChannelIndex: 0,
  selectedOptionIndex: 0,
  currentStreamUrl: ''
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  fetchData();

  // Keyboard shortcut: Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePlayerModal();
      closeSourceModal();
    }
  });
});

// Update Local Clock Every Second
function initClock() {
  const clockEl = document.getElementById('current-clock');
  const update = () => {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };
  update();
  setInterval(update, 1000);
}

// ================= DATA FETCHING =================
async function fetchData(url = currentJsonUrl) {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  try {
    let response;
    try {
      response = await fetch(url, { cache: 'no-cache' });
    } catch (corsErr) {
      console.warn('Fetch directo falló, intentando con proxy local...', corsErr);
      response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
    }

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    rawData = {
      events: Array.isArray(data.events) ? data.events : [],
      channels: Array.isArray(data.channels) ? data.channels : []
    };

    updateGlobalStats();
    buildLeagueChips();
    renderEvents();
    renderChannels();
    renderJsonViewer();
  } catch (error) {
    console.error('Error cargando el JSON:', error);
    showNotification(`Error cargando datos: ${error.message}`, 'error');
    const container = document.getElementById('events-container');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full py-12 px-6 text-center bg-red-950/20 border border-red-500/20 rounded-2xl">
          <i data-lucide="alert-triangle" class="w-10 h-10 text-red-400 mx-auto mb-3"></i>
          <h3 class="text-base font-bold text-red-200">No se pudo cargar el archivo JSON</h3>
          <p class="text-xs text-red-300/80 mt-1 max-w-md mx-auto mb-4">${error.message}</p>
          <button onclick="fetchData()" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl text-xs transition">
            Intentar nuevamente
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  } finally {
    if (refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove('animate-spin'), 600);
    }
  }
}

function refreshData() {
  fetchData(currentJsonUrl);
}

// ================= STATS & COUNTERS =================
function updateGlobalStats() {
  const now = new Date();
  let liveCount = 0;
  let upcomingCount = 0;
  let pastCount = 0;

  rawData.events.forEach(evt => {
    const status = getEventStatus(evt.fecha, now);
    if (status === 'live') liveCount++;
    else if (status === 'upcoming') upcomingCount++;
    else if (status === 'past') pastCount++;
  });

  // Update badges & hero stats
  setText('stat-total-events', rawData.events.length);
  setText('stat-total-channels', rawData.channels.length);
  setText('stat-live-count', liveCount);
  setText('badge-events-count', rawData.events.length);
  setText('badge-channels-count', rawData.channels.length);

  setText('count-all', rawData.events.length);
  setText('count-live', liveCount);
  setText('count-upcoming', upcomingCount);
  setText('count-past', pastCount);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Determine if match is LIVE, UPCOMING or PAST
function getEventStatus(dateStr, now = new Date()) {
  if (!dateStr) return 'unknown';
  // Formato: "2026-10-24 11:00:00"
  const eventTime = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(eventTime.getTime())) return 'unknown';

  const diffMs = now.getTime() - eventTime.getTime();
  const matchDurationMs = 2.5 * 60 * 60 * 1000; // 2.5 horas

  if (diffMs >= 0 && diffMs <= matchDurationMs) {
    return 'live';
  } else if (diffMs < 0) {
    return 'upcoming';
  } else {
    return 'past';
  }
}

function formatEventTime(dateStr) {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${timeStr} hs`;
}

// ================= PERSONALIZADA CATEGORIZATION =================
/**
 * Clasifica eventos para la vista "Personalizada":
 * 1. Todo lo que NO es de fútbol arriba (F1, UFC, Tenis, Boxeo, MotoGP, MLB, NBA, etc.)
 * 2. Champions League
 * 3. Copa Libertadores
 * 4. Copa Sudamericana
 * 5. UEFA Europa League
 * 6. Liga Argentina
 * 7. Premier League
 * 8. Liga Italiana
 */
function getPersonalizadaCategory(evt) {
  const comp = (evt.competencia || '').toLowerCase();
  const title = (evt.evento || '').toLowerCase();
  const text = comp + ' ' + title;

  // 0. Todo lo que NO es de fútbol (Arriba)
  const nonFootballTerms = [
    'fórmula', 'formula', 'f1', 'motogp', 'moto', 'ufc', 'boxeo', 'boxing',
    'atp', 'wta', 'tenis', 'tennis', 'padel', 'mlb', 'béisbol', 'beisbol', 'baseball',
    'nba', 'baloncesto', 'basquet', 'basketball', 'nfl', 'nhl', 'golf', 'ciclismo',
    'indycar', 'nascar', 'rally', 'mma', 'wwe'
  ];
  if (nonFootballTerms.some(t => text.includes(t))) {
    return {
      rank: 0,
      id: 'no-futbol',
      name: 'Deportes (F1, UFC, Tenis, Boxeo, MLB...)',
      icon: 'flame',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    };
  }

  // 1. Champions League (distinguir de Championship)
  if (/\bchampions\b/i.test(text) && !/\bchampionship\b/i.test(text)) {
    return {
      rank: 1,
      id: 'champions',
      name: 'UEFA Champions League',
      icon: 'trophy',
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    };
  }

  // 2. Copa Libertadores
  if (text.includes('libertadores')) {
    return {
      rank: 2,
      id: 'libertadores',
      name: 'Copa Libertadores',
      icon: 'award',
      badgeClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    };
  }

  // 3. Copa Sudamericana
  if (text.includes('sudamericana')) {
    return {
      rank: 3,
      id: 'sudamericana',
      name: 'Copa Sudamericana',
      icon: 'shield',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    };
  }

  // 4. UEFA Europa League
  if (text.includes('europa league')) {
    return {
      rank: 4,
      id: 'europa-league',
      name: 'UEFA Europa League',
      icon: 'globe',
      badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30'
    };
  }

  // 5. Liga Argentina
  if (
    text.includes('profesional argentina') ||
    text.includes('liga argentina') ||
    text.includes('copa de la liga') ||
    text.includes('copa argentina') ||
    title.startsWith('liga profesional:') ||
    (comp.includes('argentina') && !text.includes('basquet') && !text.includes('tenis'))
  ) {
    return {
      rank: 5,
      id: 'liga-argentina',
      name: 'Liga Argentina',
      icon: 'flag',
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
    };
  }

  // 6. Premier League
  if (
    comp.includes('premier') ||
    title.startsWith('premier league:') ||
    (/\bpremier\b/i.test(text) && !text.includes('premium'))
  ) {
    return {
      rank: 6,
      id: 'premier',
      name: 'Premier League',
      icon: 'crown',
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
    };
  }

  // 7. Liga Italiana
  if (
    comp === 'serie a' ||
    comp.includes('italiana') ||
    title.startsWith('serie a:') ||
    text.includes('calcio') ||
    text.includes('copa italia')
  ) {
    return {
      rank: 7,
      id: 'serie-a',
      name: 'Liga Italiana (Serie A)',
      icon: 'shield-check',
      badgeClass: 'bg-green-500/15 text-green-300 border-green-500/30'
    };
  }

  return null;
}

// ================= COMPETITIONS FILTER CHIPS =================
function buildLeagueChips() {
  const container = document.getElementById('league-chips-container');
  if (!container) return;

  const personalEvents = rawData.events.filter(e => getPersonalizadaCategory(e) !== null);

  const counts = {};
  rawData.events.forEach(e => {
    const c = e.competencia || 'Otros';
    counts[c] = (counts[c] || 0) + 1;
  });

  const sortedLeagues = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  let html = `
    <!-- Filtro Personalizada (Por defecto) -->
    <button 
      onclick="setLeagueFilter('personalizada')" 
      class="chip-league ${currentLeague === 'personalizada' ? 'active-chip' : ''} px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border flex items-center gap-1.5 ${
        currentLeague === 'personalizada' 
          ? 'bg-gradient-to-r from-cyan-500/25 to-emerald-500/25 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/20' 
          : 'bg-slate-950/80 text-slate-300 hover:text-white border-white/10 hover:border-cyan-500/30'
      }"
    >
      <i data-lucide="sparkles" class="w-3.5 h-3.5 text-yellow-400"></i>
      <span>Personalizada (${personalEvents.length})</span>
    </button>

    <!-- Todas las ligas -->
    <button 
      onclick="setLeagueFilter('all')" 
      class="chip-league ${currentLeague === 'all' ? 'active-chip' : ''} px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
        currentLeague === 'all' 
          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
          : 'bg-slate-950/60 text-slate-400 hover:text-white border-white/5'
      }"
    >
      Todas (${rawData.events.length})
    </button>
  `;

  sortedLeagues.forEach(league => {
    const isAct = currentLeague === league;
    html += `
      <button 
        onclick="setLeagueFilter('${escapeAttr(league)}')" 
        class="chip-league ${isAct ? 'active-chip' : ''} px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
          isAct 
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
            : 'bg-slate-950/60 text-slate-400 hover:text-white border-white/5'
        }"
      >
        ${escapeHtml(league)} (${counts[league]})
      </button>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function setLeagueFilter(league) {
  currentLeague = league;
  buildLeagueChips();
  renderEvents();
}

// ================= EVENTOS DEPORTIVOS RENDER =================
function renderEvents() {
  const container = document.getElementById('events-container');
  const emptyState = document.getElementById('events-empty-state');
  const resultsText = document.getElementById('filtered-results-text');
  if (!container) return;

  const now = new Date();
  const q = currentSearch.toLowerCase().trim();

  // First filter by league and search
  const baseLeagueFiltered = rawData.events.filter(evt => {
    // 1. League filter
    if (currentLeague === 'personalizada') {
      if (!getPersonalizadaCategory(evt)) return false;
    } else if (currentLeague !== 'all' && (evt.competencia || 'Otros') !== currentLeague) {
      return false;
    }

    // 2. Search query
    if (q) {
      const titleMatch = (evt.evento || '').toLowerCase().includes(q);
      const compMatch = (evt.competencia || '').toLowerCase().includes(q);
      const channelMatch = (evt.canales || []).some(c => (c.name || '').toLowerCase().includes(q));
      if (!titleMatch && !compMatch && !channelMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate status counts for the currently selected filter view
  let subCountAll = baseLeagueFiltered.length;
  let subCountLive = 0;
  let subCountUpcoming = 0;
  let subCountPast = 0;

  baseLeagueFiltered.forEach(evt => {
    const s = getEventStatus(evt.fecha, now);
    if (s === 'live') subCountLive++;
    else if (s === 'upcoming') subCountUpcoming++;
    else if (s === 'past') subCountPast++;
  });

  setText('count-all', subCountAll);
  setText('count-live', subCountLive);
  setText('count-upcoming', subCountUpcoming);
  setText('count-past', subCountPast);

  // Apply status filter
  const filtered = baseLeagueFiltered.filter(evt => {
    if (currentStatus !== 'all') {
      const status = getEventStatus(evt.fecha, now);
      if (status !== currentStatus) return false;
    }
    return true;
  });

  // Sort events
  filtered.sort((a, b) => {
    // In Personalizada mode: Primary sort is category rank (0: No fútbol -> 7: Serie A)
    if (currentLeague === 'personalizada') {
      const catA = getPersonalizadaCategory(a);
      const catB = getPersonalizadaCategory(b);
      const rankA = catA ? catA.rank : 99;
      const rankB = catB ? catB.rank : 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
    }

    // Secondary sort: LIVE first, then UPCOMING (soonest first), then PAST
    const statA = getEventStatus(a.fecha, now);
    const statB = getEventStatus(b.fecha, now);
    const priority = { live: 1, upcoming: 2, past: 3, unknown: 4 };
    
    if (priority[statA] !== priority[statB]) {
      return priority[statA] - priority[statB];
    }
    return new Date(a.fecha.replace(' ', 'T')) - new Date(b.fecha.replace(' ', 'T'));
  });

  if (resultsText) {
    const filterName = currentLeague === 'personalizada' ? 'Personalizada' : (currentLeague === 'all' ? 'Todas' : currentLeague);
    resultsText.innerHTML = `Filtro activo: <b class="text-cyan-400">${escapeHtml(filterName)}</b> • Mostrando <b>${filtered.length}</b> de ${rawData.events.length} eventos`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  // Build HTML with category dividers in Personalizada mode
  let currentRenderRank = -1;
  const cardsHtml = [];

  filtered.forEach(evt => {
    if (currentLeague === 'personalizada') {
      const cat = getPersonalizadaCategory(evt);
      if (cat && cat.rank !== currentRenderRank) {
        currentRenderRank = cat.rank;
        const countInCat = filtered.filter(e => {
          const c = getPersonalizadaCategory(e);
          return c && c.rank === cat.rank;
        }).length;

        cardsHtml.push(`
          <div class="col-span-full pt-4 pb-2 mt-2 border-b border-white/10 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="p-1.5 rounded-lg ${cat.badgeClass} flex items-center justify-center border">
                <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
              </span>
              <div>
                <h3 class="text-xs sm:text-sm font-extrabold text-white tracking-wide uppercase">
                  ${escapeHtml(cat.name)}
                </h3>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-slate-400 bg-slate-900 border border-white/5 px-2.5 py-0.5 rounded-full">
              ${countInCat} ${countInCat === 1 ? 'evento' : 'eventos'}
            </span>
          </div>
        `);
      }
    }

    if (currentViewMode === 'list') {
      cardsHtml.push(renderEventListItem(evt, now));
    } else {
      cardsHtml.push(renderEventCard(evt, now));
    }
  });

  // Helpful banner at the bottom of Personalizada view to explore other leagues
  if (currentLeague === 'personalizada') {
    cardsHtml.push(`
      <div class="col-span-full mt-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-white/10 text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shadow-lg">
        <div class="flex items-center gap-2 text-left">
          <i data-lucide="info" class="w-5 h-5 text-cyan-400 shrink-0"></i>
          <span>Estás en la vista <b>Personalizada</b> (${filtered.length} eventos prioritarios). Puedes explorar el resto de las ligas (LaLiga, Brasileirão, MLS...) en cualquier momento.</span>
        </div>
        <button onclick="setLeagueFilter('all')" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition border border-white/10 flex items-center gap-2 shrink-0">
          <span>Ver todas las ligas (${rawData.events.length})</span>
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>
      </div>
    `);
  }

  if (currentViewMode === 'list') {
    container.className = 'flex flex-col gap-2.5';
  } else {
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  }

  container.innerHTML = cardsHtml.join('');

  if (window.lucide) lucide.createIcons();
}

// Card View Template
function renderEventCard(evt, now) {
  const status = getEventStatus(evt.fecha, now);
  const formattedTime = formatEventTime(evt.fecha);
  const parsedTeams = parseEventTeams(evt.evento);

  let statusBadge = '';
  if (status === 'live') {
    statusBadge = `
      <span class="badge-live inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
        <span class="w-2 h-2 rounded-full bg-red-500 live-indicator"></span>
        En Vivo
      </span>
    `;
  } else if (status === 'upcoming') {
    statusBadge = `
      <span class="badge-upcoming inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-white shrink-0">
        <i data-lucide="clock" class="w-4 h-4 text-white stroke-[2.5]"></i>
        ${formattedTime}
      </span>
    `;
  } else {
    statusBadge = `
      <span class="badge-past inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]">
        Finalizado
      </span>
    `;
  }

  // Channels count & names
  const channelsList = (evt.canales || []).map(c => `
    <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] border border-white/5 font-medium">
      ${escapeHtml(c.name)}
    </span>
  `).join('');

  const totalOptions = (evt.canales || []).reduce((acc, c) => acc + (c.options?.length || 0), 0);

  return `
    <div class="glass-card rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500/40 relative group">
      
      <!-- Top Bar: Competition Logo & Status -->
      <div class="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div class="flex items-center gap-2 min-w-0">
          ${evt.logoUrl ? `
            <img src="${escapeAttr(evt.logoUrl)}" alt="Logo" class="w-5 h-5 object-contain shrink-0" onerror="this.style.display='none'">
          ` : ''}
          <span class="text-xs font-semibold text-slate-300 truncate">${escapeHtml(evt.competencia || 'Deportes')}</span>
        </div>
        ${statusBadge}
      </div>

      <!-- Match / Event Body -->
      <div class="py-4 my-auto">
        ${parsedTeams.hasVs ? `
          <!-- VS Mode Teams -->
          <div class="flex items-center justify-between gap-2">
            <!-- Team 1 -->
            <div class="flex-1 flex flex-col items-center text-center">
              <div class="w-12 h-12 mb-2 flex items-center justify-center">
                ${evt.team1Logo ? `
                  <img src="${escapeAttr(evt.team1Logo)}" alt="${escapeAttr(parsedTeams.team1)}" class="max-h-12 max-w-12 object-contain" onerror="renderLogoFallback(this, '${escapeAttr(parsedTeams.team1)}')">
                ` : `
                  <div class="img-fallback w-11 h-11 text-xs">${getInitials(parsedTeams.team1)}</div>
                `}
              </div>
              <span class="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">${escapeHtml(parsedTeams.team1)}</span>
            </div>

            <!-- VS Badge -->
            <div class="px-2 flex flex-col items-center justify-center shrink-0">
              <span class="text-[11px] font-extrabold px-2 py-1 rounded-lg bg-slate-800/90 text-cyan-400 border border-white/10">VS</span>
            </div>

            <!-- Team 2 -->
            <div class="flex-1 flex flex-col items-center text-center">
              <div class="w-12 h-12 mb-2 flex items-center justify-center">
                ${evt.team2Logo ? `
                  <img src="${escapeAttr(evt.team2Logo)}" alt="${escapeAttr(parsedTeams.team2)}" class="max-h-12 max-w-12 object-contain" onerror="renderLogoFallback(this, '${escapeAttr(parsedTeams.team2)}')">
                ` : `
                  <div class="img-fallback w-11 h-11 text-xs">${getInitials(parsedTeams.team2)}</div>
                `}
              </div>
              <span class="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">${escapeHtml(parsedTeams.team2)}</span>
            </div>
          </div>
        ` : `
          <!-- Single Event / Motorsport / Combat -->
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-cyan-400">
              <i data-lucide="${getSportIcon(evt.competencia)}" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-white leading-snug line-clamp-2">${escapeHtml(evt.evento)}</h4>
              <p class="text-xs text-slate-400 mt-1">${formatEventTime(evt.fecha)}</p>
            </div>
          </div>
        `}
      </div>

      <!-- Bottom Bar: Channels & Watch Button -->
      <div class="pt-3 border-t border-white/5 space-y-3">
        <div class="flex flex-wrap items-center gap-1.5">
          ${channelsList || '<span class="text-[11px] text-slate-500">Sin canales definidos</span>'}
        </div>

        <button 
          onclick="openEventPlayer(${evt.id})" 
          class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition active:scale-[0.98]"
        >
          <i data-lucide="play" class="w-4 h-4 fill-black"></i>
          <span>Ver Transmisión (${totalOptions} opciones)</span>
        </button>
      </div>

    </div>
  `;
}

// List View Template
function renderEventListItem(evt, now) {
  const status = getEventStatus(evt.fecha, now);
  const formattedTime = formatEventTime(evt.fecha);
  const totalOptions = (evt.canales || []).reduce((acc, c) => acc + (c.options?.length || 0), 0);

  let statusBadge = '';
  if (status === 'live') {
    statusBadge = `<span class="badge-live px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0">En Vivo</span>`;
  } else {
    statusBadge = `<span class="text-xs sm:text-sm text-white font-semibold font-mono shrink-0">${formattedTime}</span>`;
  }

  const channelsBadges = (evt.canales || []).map(c => `
    <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">${escapeHtml(c.name)}</span>
  `).join(' ');

  return `
    <div class="glass-card rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        ${statusBadge}
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cyan-400">${escapeHtml(evt.competencia || '')}</span>
            <span class="text-slate-600">•</span>
            <h4 class="text-xs sm:text-sm font-semibold text-white truncate">${escapeHtml(evt.evento)}</h4>
          </div>
          <div class="flex items-center gap-1.5 mt-1 overflow-x-auto">
            ${channelsBadges}
          </div>
        </div>
      </div>

      <button 
        onclick="openEventPlayer(${evt.id})" 
        class="shrink-0 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition"
      >
        <i data-lucide="play" class="w-3.5 h-3.5 fill-black"></i>
        <span>Reproducir (${totalOptions})</span>
      </button>
    </div>
  `;
}

// Helper: parse team names from event string
function parseEventTeams(eventName = '') {
  // Ejemplos: "Premier League: Arsenal vs. Everton"
  let cleanName = eventName;
  if (cleanName.includes(':')) {
    cleanName = cleanName.substring(cleanName.indexOf(':') + 1).trim();
  }

  const vsRegex = /\s+(?:vs\.?|contra|v)\s+/i;
  if (vsRegex.test(cleanName)) {
    const parts = cleanName.split(vsRegex);
    if (parts.length >= 2) {
      return {
        hasVs: true,
        team1: parts[0].trim(),
        team2: parts[1].trim()
      };
    }
  }

  return { hasVs: false, team1: eventName, team2: '' };
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'EQ';
}

function renderLogoFallback(imgElement, teamName) {
  imgElement.outerHTML = `<div class="img-fallback w-11 h-11 text-xs">${getInitials(teamName)}</div>`;
}

function getSportIcon(comp = '') {
  const c = comp.toLowerCase();
  if (c.includes('fórmula') || c.includes('f1') || c.includes('moto')) return 'gauge';
  if (c.includes('ufc') || c.includes('boxeo')) return 'swords';
  if (c.includes('atp') || c.includes('wta') || c.includes('tenis')) return 'circle-dot';
  if (c.includes('nba') || c.includes('baloncesto')) return 'dribbble';
  return 'trophy';
}

// ================= CANALES 24/7 RENDER =================
function renderChannels() {
  const container = document.getElementById('channels-container');
  if (!container) return;

  const q = channelSearch.toLowerCase().trim();

  const filtered = rawData.channels.filter(ch => {
    if (channelFilter === 'featured' && !ch.featured) return false;
    if (q && !(ch.name || '').toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        No se encontraron canales con ese criterio.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((ch, idx) => {
    const isDiscord = ch.name?.toLowerCase().includes('discord') || Boolean(ch.url);
    const optionsCount = ch.options?.length || 0;

    return `
      <div class="glass-card rounded-2xl p-4 flex flex-col justify-between items-center text-center group">
        
        <!-- Logo / Icon -->
        <div class="w-16 h-16 rounded-xl bg-slate-950 p-2 flex items-center justify-center border border-white/5 mb-3 group-hover:scale-105 transition-transform">
          ${ch.logo ? `
            <img src="${escapeAttr(ch.logo)}" alt="${escapeAttr(ch.name)}" class="max-h-full max-w-full object-contain" onerror="this.outerHTML='<i data-lucide=\\'radio\\' class=\\'w-8 h-8 text-slate-400\\'></i>'">
          ` : `
            <i data-lucide="tv" class="w-8 h-8 text-cyan-400"></i>
          `}
        </div>

        <!-- Name & Badges -->
        <h4 class="text-sm font-bold text-white mb-1 line-clamp-1">${escapeHtml(ch.name)}</h4>
        
        <div class="flex items-center gap-1.5 mb-4">
          ${ch.featured ? `
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Destacado</span>
          ` : ''}
          <span class="text-[10px] text-slate-400">${isDiscord ? 'Enlace Directo' : `${optionsCount} opciones`}</span>
        </div>

        <!-- Action Button -->
        ${isDiscord ? `
          <a 
            href="${escapeAttr(ch.url || 'https://discord.gg/MVqmy6EACK')}" 
            target="_blank" 
            class="w-full py-2 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            <span>Unirse</span>
          </a>
        ` : `
          <button 
            onclick="openChannelPlayer(${idx})" 
            class="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-black text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-white/5"
          >
            <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
            <span>Sintonizar</span>
          </button>
        `}

      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// ================= STREAM PLAYER MODAL LOGIC =================
function openEventPlayer(eventId) {
  const evt = rawData.events.find(e => e.id === eventId);
  if (!evt || !evt.canales || evt.canales.length === 0) {
    showNotification('No hay transmisiones disponibles para este evento.', 'info');
    return;
  }

  currentModalContext = {
    title: evt.evento,
    subtitle: `${evt.competencia || 'Evento'} • ${formatEventTime(evt.fecha)}`,
    channels: evt.canales,
    selectedChannelIndex: 0,
    selectedOptionIndex: 0,
    currentStreamUrl: ''
  };

  showPlayerModal();
}

function openChannelPlayer(channelIdx) {
  const ch = rawData.channels[channelIdx];
  if (!ch || !ch.options || ch.options.length === 0) {
    showNotification('No hay opciones de reproducción para este canal.', 'info');
    return;
  }

  currentModalContext = {
    title: ch.name,
    subtitle: `Canal de Televisión 24/7 • ${ch.options.length} opciones disponibles`,
    channels: [{ name: ch.name, options: ch.options }],
    selectedChannelIndex: 0,
    selectedOptionIndex: 0,
    currentStreamUrl: ''
  };

  showPlayerModal();
}

let isAntiAdsActive = true;

function updateAntiAdsButtonUI() {
  const btn = document.getElementById('btn-anti-ads');
  const advisoryIcon = document.getElementById('anti-ads-advisory-icon');
  const advisoryText = document.getElementById('anti-ads-advisory-text');

  if (!btn) return;

  if (isAntiAdsActive) {
    btn.className = 'px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition';
    btn.title = 'Modo Anti-Popups activo: Popups y redirecciones bloqueados. Clic para desactivar si la señal no carga.';
    btn.innerHTML = `
      <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
      <span id="anti-ads-label" class="hidden sm:inline">Anti-Ads: ON</span>
    `;
    if (advisoryIcon) {
      advisoryIcon.setAttribute('data-lucide', 'shield-check');
      advisoryIcon.className = 'w-4 h-4 text-emerald-400 shrink-0';
    }
    if (advisoryText) {
      advisoryText.innerHTML = 'Protección <b>Anti-Popups activada</b> por defecto. Si una señal no reproduce, apaga el botón <b>Anti-Ads</b> o usa <b>Pestaña Nueva</b>.';
    }
  } else {
    btn.className = 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-white/5 font-semibold text-xs flex items-center gap-1.5 transition';
    btn.title = 'Modo Anti-Popups desactivado: Sin restricciones de sandbox. Clic para activar bloqueo de anuncios.';
    btn.innerHTML = `
      <i data-lucide="shield-off" class="w-3.5 h-3.5"></i>
      <span id="anti-ads-label" class="hidden sm:inline">Anti-Ads: OFF</span>
    `;
    if (advisoryIcon) {
      advisoryIcon.setAttribute('data-lucide', 'shield-alert');
      advisoryIcon.className = 'w-4 h-4 text-amber-400 shrink-0';
    }
    if (advisoryText) {
      advisoryText.innerHTML = 'Modo Anti-Popups <b>apagado</b>. El reproductor corre sin restricciones de sandbox.';
    }
  }

  if (window.lucide) lucide.createIcons();
}

function toggleAntiAds() {
  isAntiAdsActive = !isAntiAdsActive;
  updateAntiAdsButtonUI();
  showNotification(
    isAntiAdsActive ? 'Protección Anti-Popups activada' : 'Protección Anti-Popups desactivada',
    isAntiAdsActive ? 'success' : 'info'
  );
  loadCurrentStreamIntoPlayer();
}

function showPlayerModal() {
  const modal = document.getElementById('player-modal');
  setText('modal-event-title', currentModalContext.title);
  setText('modal-event-subtitle', currentModalContext.subtitle);

  // Iniciar activado por defecto cada vez que se abre el reproductor
  isAntiAdsActive = true;
  updateAntiAdsButtonUI();

  renderModalChannelsTabs();
  renderModalStreamOptions();
  loadCurrentStreamIntoPlayer();

  if (modal) modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function togglePlayerTheaterMode() {
  const modal = document.getElementById('player-modal');
  const btn = document.getElementById('btn-theater-mode');
  if (!modal) return;

  const isTheater = modal.classList.toggle('theater-active');
  if (btn) {
    btn.innerHTML = `<i data-lucide="${isTheater ? 'minimize' : 'maximize'}" class="w-4 h-4"></i>`;
    btn.title = isTheater ? 'Restaurar tamaño normal' : 'Modo teatro / Pantalla completa';
    if (window.lucide) lucide.createIcons();
  }
}

function closePlayerModal() {
  const modal = document.getElementById('player-modal');
  const iframe = document.getElementById('stream-iframe');
  const btn = document.getElementById('btn-theater-mode');

  if (modal && modal.classList.contains('theater-active')) {
    modal.classList.remove('theater-active');
    if (btn) {
      btn.innerHTML = '<i data-lucide="maximize" class="w-4 h-4"></i>';
      btn.title = 'Modo teatro / Pantalla completa';
      if (window.lucide) lucide.createIcons();
    }
  }

  if (iframe) iframe.src = '';
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderModalChannelsTabs() {
  const container = document.getElementById('modal-channel-tabs');
  if (!container) return;

  const channels = currentModalContext.channels;
  if (channels.length <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = channels.map((ch, idx) => {
    const isAct = idx === currentModalContext.selectedChannelIndex;
    return `
      <button 
        onclick="switchModalChannel(${idx})" 
        class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${isAct ? 'bg-cyan-500 text-black border-cyan-400 font-bold' : 'bg-slate-800 text-slate-300 border-white/5 hover:text-white'}"
      >
        ${escapeHtml(ch.name || `Canal ${idx + 1}`)}
      </button>
    `;
  }).join('');
}

function renderModalStreamOptions() {
  const container = document.getElementById('modal-stream-options');
  if (!container) return;

  const currentChannel = currentModalContext.channels[currentModalContext.selectedChannelIndex];
  const options = currentChannel?.options || [];

  if (options.length === 0) {
    container.innerHTML = '<span class="text-slate-400">Sin opciones</span>';
    return;
  }

  container.innerHTML = options.map((opt, idx) => {
    const isAct = idx === currentModalContext.selectedOptionIndex;
    return `
      <button 
        onclick="switchModalStreamOption(${idx})" 
        class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${isAct ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-slate-800 text-slate-300 border-white/5 hover:text-white'}"
      >
        ${escapeHtml(opt.name || `Opción ${idx + 1}`)}
      </button>
    `;
  }).join('');
}

function switchModalChannel(chIdx) {
  currentModalContext.selectedChannelIndex = chIdx;
  currentModalContext.selectedOptionIndex = 0;
  renderModalChannelsTabs();
  renderModalStreamOptions();
  loadCurrentStreamIntoPlayer();
}

function switchModalStreamOption(optIdx) {
  currentModalContext.selectedOptionIndex = optIdx;
  renderModalStreamOptions();
  loadCurrentStreamIntoPlayer();
}

function loadCurrentStreamIntoPlayer() {
  const iframe = document.getElementById('stream-iframe');
  const spinner = document.getElementById('player-loading-spinner');
  const hostLabel = document.getElementById('current-stream-host');

  const currentChannel = currentModalContext.channels[currentModalContext.selectedChannelIndex];
  const currentOption = currentChannel?.options?.[currentModalContext.selectedOptionIndex];

  if (!currentOption || !currentOption.iframe) {
    showNotification('Enlace de stream no disponible', 'error');
    return;
  }

  const streamUrl = currentOption.iframe;
  currentModalContext.currentStreamUrl = streamUrl;

  try {
    const host = new URL(streamUrl).hostname;
    if (hostLabel) hostLabel.textContent = `Servidor: ${host}`;
  } catch {
    if (hostLabel) hostLabel.textContent = '';
  }

  if (iframe) {
    if (isAntiAdsActive) {
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
    } else {
      iframe.removeAttribute('sandbox');
    }
  }

  if (spinner) spinner.style.display = 'flex';
  if (iframe) {
    iframe.onload = () => {
      if (spinner) spinner.style.display = 'none';
    };
    iframe.src = streamUrl;
  }
}

function reloadCurrentStream() {
  loadCurrentStreamIntoPlayer();
}

function openCurrentStreamExternal() {
  if (currentModalContext.currentStreamUrl) {
    window.open(currentModalContext.currentStreamUrl, '_blank', 'noopener,noreferrer');
  }
}

// ================= EXPLORADOR JSON & API RAW =================
function renderJsonViewer() {
  const viewer = document.getElementById('json-viewer-content');
  const sizeLabel = document.getElementById('json-size-label');
  if (!viewer) return;

  const jsonString = JSON.stringify(rawData, null, 2);
  const sizeKb = (new Blob([jsonString]).size / 1024).toFixed(1);
  if (sizeLabel) sizeLabel.textContent = `${sizeKb} KB (${rawData.events.length} eventos, ${rawData.channels.length} canales)`;

  viewer.textContent = jsonString;
}

function copyRawJson() {
  const jsonString = JSON.stringify(rawData, null, 2);
  navigator.clipboard.writeText(jsonString).then(() => {
    showNotification('¡JSON copiado al portapapeles!', 'success');
  }).catch(err => {
    showNotification('No se pudo copiar el JSON: ' + err.message, 'error');
  });
}

function downloadJsonFile() {
  const jsonString = JSON.stringify(rawData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `datos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadCustomJsonUrl() {
  const input = document.getElementById('custom-json-url');
  if (!input || !input.value.trim()) return;
  currentJsonUrl = input.value.trim();
  fetchData(currentJsonUrl);
}

function resetDefaultJsonUrl() {
  currentJsonUrl = DEFAULT_JSON_URL;
  const input = document.getElementById('custom-json-url');
  if (input) input.value = DEFAULT_JSON_URL;
  fetchData(currentJsonUrl);
}

// ================= SEARCH & FILTERS HANDLERS =================
function handleSearch(val) {
  currentSearch = val;
  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) {
    if (val) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }
  renderEvents();
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  handleSearch('');
}

function setStatusFilter(status) {
  currentStatus = status;
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/30');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`status-${status}-btn`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/30');
    activeBtn.classList.remove('text-slate-400');
  }

  renderEvents();
}

function setViewMode(mode) {
  currentViewMode = mode;
  const gridBtn = document.getElementById('view-grid-btn');
  const listBtn = document.getElementById('view-list-btn');

  if (mode === 'grid') {
    gridBtn?.classList.add('bg-slate-800', 'text-cyan-400');
    listBtn?.classList.remove('bg-slate-800', 'text-cyan-400');
    listBtn?.classList.add('text-slate-400');
  } else {
    listBtn?.classList.add('bg-slate-800', 'text-cyan-400');
    gridBtn?.classList.remove('bg-slate-800', 'text-cyan-400');
    gridBtn?.classList.add('text-slate-400');
  }

  renderEvents();
}

function resetFilters() {
  currentSearch = '';
  currentLeague = 'personalizada';
  currentStatus = 'all';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  buildLeagueChips();
  setStatusFilter('all');
}

// Channels Filters
function handleChannelsSearch(val) {
  channelSearch = val;
  renderChannels();
}

function setChannelFilter(filter) {
  channelFilter = filter;
  const btnAll = document.getElementById('btn-chan-all');
  const btnFeat = document.getElementById('btn-chan-featured');

  if (filter === 'all') {
    btnAll?.classList.add('bg-emerald-500/20', 'text-emerald-300', 'font-medium');
    btnAll?.classList.remove('text-slate-400');
    btnFeat?.classList.remove('bg-emerald-500/20', 'text-emerald-300', 'font-medium');
    btnFeat?.classList.add('text-slate-400');
  } else {
    btnFeat?.classList.add('bg-emerald-500/20', 'text-emerald-300', 'font-medium');
    btnFeat?.classList.remove('text-slate-400');
    btnAll?.classList.remove('bg-emerald-500/20', 'text-emerald-300', 'font-medium');
    btnAll?.classList.add('text-slate-400');
  }

  renderChannels();
}

// ================= TAB SWITCHING =================
function switchTab(tab) {
  activeTab = tab;

  // Sections
  const secEvents = document.getElementById('section-events');
  const secChannels = document.getElementById('section-channels');
  const secJson = document.getElementById('section-json');

  secEvents?.classList.toggle('hidden', tab !== 'events');
  secChannels?.classList.toggle('hidden', tab !== 'channels');
  secJson?.classList.toggle('hidden', tab !== 'json');

  // Desktop buttons styling
  const updateTabBtn = (btnId, isActive) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isActive) {
      btn.className = 'tab-btn active px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
    } else {
      btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5';
    }
  };

  updateTabBtn('tab-events-btn', tab === 'events');
  updateTabBtn('tab-channels-btn', tab === 'channels');
  updateTabBtn('tab-json-btn', tab === 'json');

  // Mobile buttons styling
  const updateMobTabBtn = (btnId, isActive) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isActive) {
      btn.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 text-center whitespace-nowrap';
    } else {
      btn.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 bg-slate-800/60 text-center whitespace-nowrap';
    }
  };

  updateMobTabBtn('mob-tab-events-btn', tab === 'events');
  updateMobTabBtn('mob-tab-channels-btn', tab === 'channels');
  updateMobTabBtn('mob-tab-json-btn', tab === 'json');

  if (tab === 'json') {
    renderJsonViewer();
  }

  if (window.lucide) lucide.createIcons();
}

// ================= SOURCE MODAL =================
function openJsonModal() {
  const modal = document.getElementById('source-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeSourceModal() {
  const modal = document.getElementById('source-modal');
  if (modal) modal.classList.add('hidden');
}

// ================= NOTIFICATIONS TOAST =================
function showNotification(msg, type = 'info') {
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-cyan-600';
  toast.className = `fixed bottom-5 right-5 z-50 ${bg} text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-200`;
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ================= UTILS =================
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str = '') {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
