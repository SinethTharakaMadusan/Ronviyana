/**
 * Ronviana Admin Panel — Client Application
 * Handles authentication, client-side routing, full CRUD,
 * Canvas charting, file uploads, modals, notifications,
 * search debounce, pagination and responsive sidebar.
 */

// ─────────────────────────────────────────────────────────────
// STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────

const state = {
  token: localStorage.getItem('ronviana_token') || localStorage.getItem('wallora_token') || null,
  admin: null,

  currentView: 'dashboard',

  categories: [],

  wallpapersPage: 1,
  wallpapersLimit: 15,

  activityPage: 1,
  activityLimit: 15,

  selectedFile: null,

  deleteTarget: null,

  wallpaperSearchTimer: null,

  chartAnimationFrame: null
};


// ─────────────────────────────────────────────────────────────
// API BASE
// ─────────────────────────────────────────────────────────────

function getApiBase() {
  if (
    window.location.port === '5500' ||
    window.location.port === '5501' ||
    window.location.protocol === 'file:'
  ) {
    return 'http://127.0.0.1:8000';
  }

  if (
    window.location.port === '3000' ||
    window.location.port === '8000'
  ) {
    return '';
  }

  // WAMP / Localhost Subfolder Paths
  if (window.location.pathname.includes('/wallora/')) {
    return '/wallora';
  }

  if (window.location.pathname.includes('/ronviana/')) {
    return '/ronviana';
  }

  return '';
}


// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

function checkAuth() {
  if (!state.token) {
    window.location.replace('index.html');
    return false;
  }

  return true;
}


// ─────────────────────────────────────────────────────────────
// API CLIENT
// ─────────────────────────────────────────────────────────────

async function api(url, options = {}) {
  const headers = new Headers(options.headers || {});

  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
  }

  const isFormData = options.body instanceof FormData;

  if (options.body && !isFormData) {
    headers.set('Content-Type', 'application/json');

    if (
      typeof options.body === 'object' &&
      !(options.body instanceof Blob)
    ) {
      options.body = JSON.stringify(options.body);
    }
  }

  const finalUrl = url.startsWith('/api')
    ? getApiBase() + url
    : url;

  let res;

  try {
    res = await fetch(finalUrl, {
      ...options,
      headers
    });
  } catch (err) {
    throw new Error(
      'Cannot connect to backend server at ' + finalUrl
    );
  }

  if (res.status === 401) {
    localStorage.removeItem('ronviana_token');
    localStorage.removeItem('ronviana_admin');
    localStorage.removeItem('wallora_token');
    localStorage.removeItem('wallora_admin');

    window.location.replace('index.html');

    throw new Error('Unauthorized');
  }

  const rawText = await res.text();

  let data = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (err) {
    throw new Error(
      'Server returned invalid response: ' +
      (rawText.slice(0, 120) || 'Empty body')
    );
  }

  if (!res.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Server error (${res.status})`
    );
  }

  return data;
}


// ─────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');

  if (!container) {
    return;
  }

  const toast = document.createElement('div');

  toast.className = `toast toast--${type}`;

  let icon = '✓';

  if (type === 'error') {
    icon = '✕';
  }

  if (type === 'info') {
    icon = 'ℹ';
  }

  const iconEl = document.createElement('span');
  iconEl.style.fontWeight = '700';
  iconEl.style.fontSize = '1.1rem';
  iconEl.textContent = icon;

  const messageEl = document.createElement('span');
  messageEl.textContent = message;

  toast.appendChild(iconEl);
  toast.appendChild(messageEl);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}


// ─────────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────────

function openModal(modalId) {
  const el = document.getElementById(modalId);

  if (el) {
    el.classList.add('active');
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);

  if (el) {
    el.classList.remove('active');
  }
}


// ─────────────────────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────────────────────

function navigateTo(viewId) {
  const targetId =
    String(viewId || '')
      .replace(/^#/, '') ||
    'dashboard';

  state.currentView = targetId;

  if (window.location.hash !== `#${targetId}`) {
    window.location.hash = `#${targetId}`;
  }

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle(
      'active',
      item.dataset.view === targetId
    );
  });

  // Sections
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.remove('active');
  });

  const activeSection =
    document.getElementById(`view-${targetId}`);

  if (activeSection) {
    activeSection.classList.add('active');
  }

  // Breadcrumb
  const breadcrumb =
    document.getElementById('breadcrumbTitle');

  if (breadcrumb) {
    const readable = targetId
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());

    breadcrumb.textContent = readable;
  }

  // Mobile sidebar
  document
    .getElementById('adminSidebar')
    ?.classList.remove('mobile-open');

  document
    .getElementById('sidebarOverlay')
    ?.classList.remove('active');

  // Load data
  loadViewData(targetId);
}


window.addEventListener('hashchange', () => {
  const hash = window.location.hash || '#dashboard';

  navigateTo(hash);
});


// ─────────────────────────────────────────────────────────────
// VIEW DATA LOADER
// ─────────────────────────────────────────────────────────────

function loadViewData(view) {
  switch (view) {
    case 'dashboard':
      loadDashboard();
      break;

    case 'wallpapers':
      loadCategoriesDropdown();
      loadWallpapers();
      break;

    case 'add-wallpaper':
      loadCategoriesDropdown();
      break;

    case 'categories':
      loadCategories();
      break;

    case 'collections':
      loadCollections();
      break;

    case 'popular':
      loadPopularWallpapers();
      break;

    case 'new-releases':
      loadNewReleases();
      break;

    case 'users':
      loadUsers();
      break;

    case 'analytics':
      loadAnalyticsDeep();
      break;

    case 'homepage':
      loadHomepageSections();
      break;

    case 'settings':
      loadSettings();
      break;

    case 'profile':
      loadProfile();
      break;

    case 'activity':
      loadActivityLog();
      break;

    default:
      break;
  }
}


// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const data =
      await api('/api/analytics/dashboard');

    const {
      overview = {},
      recentWallpapers = [],
      recentActivity = []
    } = data;

    const totalWallpapers =
      Number(overview.totalWallpapers || 0);

    const totalDrafts =
      Number(overview.totalDrafts || 0);

    const totalDownloads =
      Number(overview.totalDownloads || 0);

    const todayDownloads =
      Number(overview.todayDownloads || 0);

    const totalViews =
      Number(overview.totalViews || 0);

    const todayViews =
      Number(overview.todayViews || 0);

    const totalCategories =
      Number(overview.totalCategories || 0);

    const totalUsers =
      Number(overview.totalUsers || 0);

    const totalStorageBytes =
      Number(overview.totalStorageBytes || 0);

    const statWallpapers =
      document.getElementById('statWallpapers');

    if (statWallpapers) {
      statWallpapers.textContent =
        (totalWallpapers + totalDrafts).toLocaleString();
    }

    const statPublishedDraft =
      document.getElementById('statPublishedDraft');

    if (statPublishedDraft) {
      statPublishedDraft.textContent =
        `${totalWallpapers} published • ${totalDrafts} drafts`;
    }

    const statDownloads =
      document.getElementById('statDownloads');

    if (statDownloads) {
      statDownloads.textContent =
        totalDownloads.toLocaleString();
    }

    const statTodayDownloads =
      document.getElementById('statTodayDownloads');

    if (statTodayDownloads) {
      statTodayDownloads.textContent =
        `+${todayDownloads.toLocaleString()} today`;
    }

    const statViews =
      document.getElementById('statViews');

    if (statViews) {
      statViews.textContent =
        totalViews.toLocaleString();
    }

    const statTodayViews =
      document.getElementById('statTodayViews');

    if (statTodayViews) {
      statTodayViews.textContent =
        `+${todayViews.toLocaleString()} today`;
    }

    const storageMb =
      (
        totalStorageBytes /
        (1024 * 1024)
      ).toFixed(1);

    const statCategoriesUsers =
      document.getElementById(
        'statCategoriesUsers'
      );

    if (statCategoriesUsers) {
      statCategoriesUsers.textContent =
        `${totalCategories} / ${totalUsers}`;
    }

    const statStorageUsed =
      document.getElementById(
        'statStorageUsed'
      );

    if (statStorageUsed) {
      statStorageUsed.textContent =
        `${storageMb} MB storage used`;
    }

    // Sidebar counts
    const sidebarWallpaperCount =
      document.getElementById(
        'sidebarWallpaperCount'
      );

    if (sidebarWallpaperCount) {
      sidebarWallpaperCount.textContent =
        totalWallpapers;
    }

    const sidebarCategoryCount =
      document.getElementById(
        'sidebarCategoryCount'
      );

    if (sidebarCategoryCount) {
      sidebarCategoryCount.textContent =
        totalCategories;
    }

    // Recent wallpapers
    const tbody =
      document.getElementById(
        'dashRecentWallpapersBody'
      );

    if (tbody) {
      if (recentWallpapers.length > 0) {
        tbody.innerHTML =
          recentWallpapers.map(w => {
            const thumbnail =
              safeImageUrl(
                w.thumbnail_url,
                getFallbackImage(200)
              );

            return `
              <tr>
                <td>
                  <div class="table-item-cell">
                    <img
                      src="${thumbnail}"
                      class="table-thumb"
                      alt="${escapeHtml(w.title)}"
                      onerror="this.src='${getFallbackImage(200)}'"
                    />

                    <div>
                      <div class="table-item-title">
                        ${escapeHtml(w.title)}
                      </div>

                      <div class="table-item-sub">
                        ${formatDate(w.created_at)}
                      </div>
                    </div>
                  </div>
                </td>

                <td>
                  <span
                    class="badge"
                    style="background: var(--surface-2);"
                  >
                    ${escapeHtml(
                      w.category_name ||
                      'Uncategorized'
                    )}
                  </span>
                </td>

                <td>
                  ${escapeHtml(w.resolution || 'HD')}
                </td>

                <td>
                  <span
                    style="
                      font-weight: 600;
                      color: var(--accent-2);
                    "
                  >
                    ${Number(
                      w.downloads || 0
                    ).toLocaleString()}
                  </span>
                </td>
              </tr>
            `;
          }).join('');
      } else {
        tbody.innerHTML = `
          <tr>
            <td
              colspan="4"
              style="
                text-align: center;
                color: var(--text-faint);
              "
            >
              No wallpapers added yet
            </td>
          </tr>
        `;
      }
    }

    // Recent activity
    const activityContainer =
      document.getElementById(
        'dashRecentActivityList'
      );

    if (activityContainer) {
      if (recentActivity.length > 0) {
        activityContainer.innerHTML =
          recentActivity.map(a => `
            <div
              style="
                display: flex;
                gap: 12px;
                align-items: flex-start;
                font-size: 0.84rem;
              "
            >
              <div
                style="
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: var(--accent);
                  margin-top: 6px;
                  flex-shrink: 0;
                "
              ></div>

              <div style="flex: 1;">
                <div
                  style="
                    font-weight: 600;
                    color: var(--text);
                  "
                >
                  ${escapeHtml(a.action)}
                </div>

                <div
                  style="
                    font-size: 0.78rem;
                    color: var(--text-dim);
                  "
                >
                  ${escapeHtml(a.details || '')}
                </div>
              </div>

              <div
                style="
                  font-size: 0.74rem;
                  color: var(--text-faint);
                  white-space: nowrap;
                "
              >
                ${formatTimeAgo(a.created_at)}
              </div>
            </div>
          `).join('');
      } else {
        activityContainer.innerHTML = `
          <div
            style="
              color: var(--text-faint);
              font-size: 0.85rem;
            "
          >
            No recent activities logged
          </div>
        `;
      }
    }

    await loadDashboardCharts();

  } catch (err) {
    console.error('Dashboard error:', err);

    showToast(
      'Failed to load dashboard metrics',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// DASHBOARD CHARTS
// ─────────────────────────────────────────────────────────────

async function loadDashboardCharts() {
  try {
    const trends =
      await api('/api/analytics/trends?days=14');

    renderTrafficChart(
      'trafficChart',
      trends.downloads || [],
      trends.views || []
    );

    const breakdown =
      await api('/api/analytics/breakdown');

    renderCategoryChart(
      'categoryChart',
      breakdown.categories || []
    );

  } catch (err) {
    console.error(
      'Chart load error:',
      err
    );
  }
}


// ─────────────────────────────────────────────────────────────
// TRAFFIC CHART
// ─────────────────────────────────────────────────────────────

function renderTrafficChart(
  canvasId,
  downloads,
  views
) {
  const canvas =
    document.getElementById(canvasId);

  if (!canvas) {
    return;
  }

  const ctx =
    canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  const dpr =
    window.devicePixelRatio || 1;

  const rect =
    canvas.getBoundingClientRect();

  const width =
    Math.max(rect.width, 1);

  const height =
    Math.max(rect.height, 1);

  canvas.width =
    Math.round(width * dpr);

  canvas.height =
    Math.round(height * dpr);

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  if (!downloads || downloads.length === 0) {
    return;
  }

  const padding = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 40
  };

  const chartW =
    Math.max(
      width -
      padding.left -
      padding.right,
      1
    );

  const chartH =
    Math.max(
      height -
      padding.top -
      padding.bottom,
      1
    );

  const labels =
    downloads.map(d =>
      String(d.date || '').slice(5)
    );

  const downloadValues =
    downloads.map(d =>
      Number(d.count || 0)
    );

  const viewMap = {};

  (views || []).forEach(v => {
    viewMap[v.date] =
      Number(v.count || 0);
  });

  const viewValues =
    downloads.map(d =>
      viewMap[d.date] || 0
    );

  const maxVal =
    Math.max(
      10,
      ...downloadValues,
      ...viewValues
    );

  // Grid
  ctx.strokeStyle =
    'rgba(255, 255, 255, 0.06)';

  ctx.lineWidth = 1;

  ctx.fillStyle = '#6c6c6c';

  ctx.font =
    '10px Inter, sans-serif';

  const gridSteps = 4;

  for (let i = 0; i <= gridSteps; i++) {
    const y =
      padding.top +
      (chartH / gridSteps) * i;

    const val =
      Math.round(
        maxVal -
        (maxVal / gridSteps) * i
      );

    ctx.beginPath();

    ctx.moveTo(
      padding.left,
      y
    );

    ctx.lineTo(
      width - padding.right,
      y
    );

    ctx.stroke();

    ctx.fillText(
      val,
      8,
      y + 3
    );
  }

  // Downloads
  drawLineSeries(
    ctx,
    downloadValues,
    chartW,
    chartH,
    padding,
    maxVal,
    '#7c5cff',
    'rgba(124, 92, 255, 0.25)'
  );

  // Views
  drawLineSeries(
    ctx,
    viewValues,
    chartW,
    chartH,
    padding,
    maxVal,
    '#3aa9ff',
    'rgba(58, 169, 255, 0.15)'
  );

  // Date labels
  ctx.fillStyle = '#6c6c6c';

  ctx.textAlign = 'center';

  const labelCount =
    labels.length;

  if (labelCount > 0) {
    const step =
      Math.max(
        1,
        Math.ceil(labelCount / 7)
      );

    labels.forEach((label, index) => {
      if (
        index % step === 0 ||
        index === labelCount - 1
      ) {
        const x =
          labelCount === 1
            ? padding.left + chartW / 2
            : padding.left +
              (
                chartW /
                (labelCount - 1)
              ) *
              index;

        ctx.fillText(
          label,
          x,
          height - 8
        );
      }
    });
  }
}


// ─────────────────────────────────────────────────────────────
// LINE SERIES
// ─────────────────────────────────────────────────────────────

function drawLineSeries(
  ctx,
  values,
  chartW,
  chartH,
  padding,
  maxVal,
  strokeColor,
  fillColor
) {
  if (!values || values.length === 0) {
    return;
  }

  const stepX =
    values.length === 1
      ? 0
      : chartW /
        (values.length - 1);

  ctx.beginPath();

  values.forEach((value, index) => {
    const x =
      values.length === 1
        ? padding.left + chartW / 2
        : padding.left +
          stepX * index;

    const y =
      padding.top +
      chartH -
      (value / maxVal) * chartH;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle =
    strokeColor;

  ctx.lineWidth = 2.5;

  ctx.stroke();

  // Area
  if (values.length >= 2) {
    ctx.lineTo(
      padding.left + chartW,
      padding.top + chartH
    );

    ctx.lineTo(
      padding.left,
      padding.top + chartH
    );

    ctx.closePath();

    const gradient =
      ctx.createLinearGradient(
        0,
        padding.top,
        0,
        padding.top + chartH
      );

    gradient.addColorStop(
      0,
      fillColor
    );

    gradient.addColorStop(
      1,
      'rgba(0, 0, 0, 0)'
    );

    ctx.fillStyle =
      gradient;

    ctx.fill();
  }
}


// ─────────────────────────────────────────────────────────────
// CATEGORY CHART
// ─────────────────────────────────────────────────────────────

function renderCategoryChart(
  canvasId,
  categories
) {
  const canvas =
    document.getElementById(canvasId);

  if (!canvas) {
    return;
  }

  const ctx =
    canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  const dpr =
    window.devicePixelRatio || 1;

  const rect =
    canvas.getBoundingClientRect();

  const width =
    Math.max(rect.width, 1);

  const height =
    Math.max(rect.height, 1);

  canvas.width =
    Math.round(width * dpr);

  canvas.height =
    Math.round(height * dpr);

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  if (
    !categories ||
    categories.length === 0
  ) {
    return;
  }

  const topCategories =
    categories.slice(0, 5);

  const maxCount =
    Math.max(
      1,
      ...topCategories.map(
        category =>
          Number(category.count || 0)
      )
    );

  const barH = 24;
  const gap = 16;
  const startY = 24;

  topCategories.forEach(
    (category, index) => {
      const y =
        startY +
        index *
          (barH + gap);

      const barAreaWidth =
        Math.max(
          width - 150,
          20
        );

      const barW =
        Math.max(
          10,
          (
            Number(category.count || 0) /
            maxCount
          ) *
          barAreaWidth
        );

      // Label
      ctx.fillStyle =
        '#ffffff';

      ctx.font =
        '500 12px Inter, sans-serif';

      ctx.textAlign =
        'left';

      ctx.fillText(
        String(category.name || ''),
        10,
        y + 16
      );

      // Background
      ctx.fillStyle =
        'rgba(255, 255, 255, 0.05)';

      ctx.beginPath();

      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(
          100,
          y,
          barAreaWidth,
          barH,
          6
        );
      } else {
        ctx.rect(
          100,
          y,
          barAreaWidth,
          barH
        );
      }

      ctx.fill();

      // Progress
      const gradient =
        ctx.createLinearGradient(
          100,
          0,
          100 + barW,
          0
        );

      gradient.addColorStop(
        0,
        '#7c5cff'
      );

      gradient.addColorStop(
        1,
        '#3aa9ff'
      );

      ctx.fillStyle =
        gradient;

      ctx.beginPath();

      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(
          100,
          y,
          barW,
          barH,
          6
        );
      } else {
        ctx.rect(
          100,
          y,
          barW,
          barH
        );
      }

      ctx.fill();

      // Count
      ctx.fillStyle =
        '#a0a0a0';

      ctx.font =
        '600 11px Inter, sans-serif';

      ctx.fillText(
        String(category.count || 0),
        Math.max(
          105,
          width - 38
        ),
        y + 16
      );
    }
  );
}


// ─────────────────────────────────────────────────────────────
// WALLPAPERS
// ─────────────────────────────────────────────────────────────

async function loadWallpapers() {
  const tbody =
    document.getElementById(
      'wallpapersTableBody'
    );

  if (!tbody) {
    return;
  }

  const search =
    document
      .getElementById(
        'filterWallpaperSearch'
      )
      ?.value
      .trim();

  const category =
    document.getElementById(
      'filterWallpaperCategory'
    )?.value;

  const device =
    document.getElementById(
      'filterWallpaperDevice'
    )?.value;

  const status =
    document.getElementById(
      'filterWallpaperStatus'
    )?.value;

  tbody.innerHTML = `
    <tr>
      <td
        colspan="7"
        style="
          text-align: center;
          color: var(--text-faint);
          padding: 32px;
        "
      >
        Loading catalog inventory...
      </td>
    </tr>
  `;

  try {
    const params =
      new URLSearchParams({
        page: state.wallpapersPage,
        limit: state.wallpapersLimit
      });

    if (search) {
      params.append(
        'search',
        search
      );
    }

    if (category) {
      params.append(
        'category',
        category
      );
    }

    if (device) {
      params.append(
        'device',
        device
      );
    }

    if (status) {
      params.append(
        'status',
        status
      );
    }

    const data =
      await api(
        `/api/wallpapers?${params.toString()}`
      );

    const wallpapers =
      data.wallpapers || [];

    const pagination =
      data.pagination || {
        page: state.wallpapersPage,
        limit: state.wallpapersLimit,
        total: wallpapers.length,
        totalPages: 1
      };

    // Update wallpapers count badge in sidebar
    const wpBadge = document.querySelector('a[href="#wallpapers"] .nav__badge') || 
    document.querySelector('a[href="#wallpapers"] span:last-child') || 
    document.getElementById('wallpapers-count');

    if (wpBadge) {
  wpBadge.textContent = pagination.total || wallpapers.length || 0;
}

    if (wallpapers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="7"
            style="
              text-align: center;
              padding: 48px;
              color: var(--text-dim);
            "
          >
            No wallpapers found matching your filters.
          </td>
        </tr>
      `;

      const info =
        document.getElementById(
          'wallpapersPaginationInfo'
        );

      if (info) {
        info.textContent =
          'Showing 0 of 0';
      }

      const controls =
        document.getElementById(
          'wallpapersPaginationControls'
        );

      if (controls) {
        controls.innerHTML = '';
      }

      return;
    }

    tbody.innerHTML =
      wallpapers.map(w => {
        const thumbnail =
          safeImageUrl(
            w.thumbnail_url,
            getFallbackImage(200)
          );

        return `
          <tr>
            <td>
              <div class="table-item-cell">
                <img
                  src="${thumbnail}"
                  class="table-thumb"
                  alt="${escapeHtml(w.title)}"
                  onerror="this.src='${getFallbackImage(200)}'"
                />

                <div>
                  <div class="table-item-title">
                    ${escapeHtml(w.title)}
                  </div>

                  <div class="table-item-sub">
                    ${escapeHtml(w.slug || '')}
                    •
                    ${Number(w.width || 0)}x${Number(w.height || 0)}
                  </div>
                </div>
              </div>
            </td>

            <td>
              <span
                class="badge"
                style="background: var(--surface-2);"
              >
                ${escapeHtml(
                  w.category_name || 'None'
                )}
              </span>
            </td>

            <td>
              <span
                style="
                  font-weight: 600;
                  color: var(--accent-2);
                "
              >
                ${escapeHtml(
                  w.resolution || 'HD'
                )}
              </span>
            </td>

            <td>
              ${escapeHtml(w.device || '-')}
            </td>

            <td>
              <div style="font-weight: 600;">
                ${Number(
                  w.downloads || 0
                ).toLocaleString()}
                <span
                  style="
                    color: var(--text-faint);
                    font-weight: 400;
                  "
                >
                  dl
                </span>
              </div>

              <div
                style="
                  font-size: 0.74rem;
                  color: var(--text-faint);
                "
              >
                ${Number(
                  w.views || 0
                ).toLocaleString()}
                views
              </div>
            </td>

            <td>
              <div
                style="
                  display: flex;
                  gap: 4px;
                  flex-wrap: wrap;
                "
              >
                <button
                  type="button"
                  class="badge ${
                    w.is_published
                      ? 'badge--published'
                      : 'badge--draft'
                  }"
                  onclick="
                    toggleWallpaperFlag(
                      ${Number(w.id)},
                      'is_published',
                      ${w.is_published ? 0 : 1}
                    )
                  "
                >
                  ${
                    w.is_published
                      ? 'Published'
                      : 'Draft'
                  }
                </button>

                ${
                  w.is_featured
                    ? '<span class="badge badge--featured">Featured</span>'
                    : ''
                }

                ${
                  w.is_popular
                    ? '<span class="badge badge--popular">Popular</span>'
                    : ''
                }
              </div>
            </td>

            <td style="text-align: right;">
              <div
                class="table-actions"
                style="justify-content: flex-end;"
              >
                ${
                  w.image_url
                    ? `
                      <a
                        href="${safeAttributeUrl(w.image_url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="action-btn"
                        title="View Full Res"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          class="ico"
                          width="15"
                          height="15"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </a>
                    `
                    : ''
                }

                <button
                  type="button"
                  class="action-btn"
                  onclick="
                    openEditWallpaperModal(
                      ${Number(w.id)}
                    )
                  "
                  title="Edit Metadata"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="ico"
                    width="15"
                    height="15"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>

                <button
                  type="button"
                  class="action-btn action-btn--delete"
                  onclick="
                    promptDelete(
                      'wallpaper',
                      ${Number(w.id)},
                      ${escapeHtml(JSON.stringify(String(w.title || 'Wallpaper')))}
                    )
                  "
                  title="Delete"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="ico"
                    width="15"
                    height="15"
                  >
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

    const page =
      Number(pagination.page || state.wallpapersPage);

    const limit =
      Number(pagination.limit || state.wallpapersLimit);

    const total =
      Number(pagination.total || wallpapers.length);

    const totalPages =
      Number(
        pagination.totalPages ||
        Math.ceil(total / limit) ||
        1
      );

    const start =
      total > 0
        ? (page - 1) * limit + 1
        : 0;

    const end =
      Math.min(
        total,
        page * limit
      );

    const info =
      document.getElementById(
        'wallpapersPaginationInfo'
      );

    if (info) {
      info.textContent =
        `Showing ${start} to ${end} of ${total} wallpapers`;
    }

    renderPaginationControls(
      'wallpapersPaginationControls',
      page,
      totalPages,
      newPage => {
        state.wallpapersPage = newPage;
        loadWallpapers();
      }
    );

  } catch (err) {
    console.error(
      'Wallpapers error:',
      err
    );

    showToast(
      err.message ||
      'Failed to load wallpapers',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// WALLPAPER STATUS
// ─────────────────────────────────────────────────────────────

async function toggleWallpaperFlag(
  id,
  flagName,
  newValue
) {
  try {
    await api(
      `/api/wallpapers/${id}/status`,
      {
        method: 'PUT',
        body: {
          [flagName]: newValue
        }
      }
    );

    showToast(
      'Status updated successfully'
    );

    await loadWallpapers();

  } catch (err) {
    showToast(
      err.message,
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// CATEGORIES DROPDOWN
// ─────────────────────────────────────────────────────────────

async function loadCategoriesDropdown() {
  try {
    const data =
      await api('/api/categories');

    state.categories =
      data.categories || [];

    const fillSelect =
      selectId => {
        const select =
          document.getElementById(
            selectId
          );

        if (!select) {
          return;
        }

        const current =
          select.value;

        const isFilter =
          selectId ===
          'filterWallpaperCategory';

        select.innerHTML =
          `<option value="">${
            isFilter
              ? 'All Categories'
              : 'Select Category'
          }</option>` +
          state.categories.map(
            category => `
              <option value="${Number(category.id)}">
                ${escapeHtml(category.name)}
              </option>
            `
          ).join('');

        if (current) {
          select.value =
            current;
        }
      };

    fillSelect(
      'wallpaperCategory'
    );

    fillSelect(
      'editCategory'
    );

    fillSelect(
      'filterWallpaperCategory'
    );

  } catch (err) {
    console.error(
      'Failed to load categories:',
      err
    );
  }
}


// ─────────────────────────────────────────────────────────────
// FILE UPLOAD / DROPZONE
// ─────────────────────────────────────────────────────────────

let dropzone = null;
let fileInput = null;
let previewBox = null;
let previewImg = null;
let previewName = null;
let previewMeta = null;
let removeFileBtn = null;


function setupDropzone() {
  dropzone =
    document.getElementById(
      'wallpaperDropzone'
    );

  fileInput =
    document.getElementById(
      'wallpaperFileInput'
    );

  previewBox =
    document.getElementById(
      'uploadPreviewBox'
    );

  previewImg =
    document.getElementById(
      'uploadPreviewImg'
    );

  previewName =
    document.getElementById(
      'uploadPreviewName'
    );

  previewMeta =
    document.getElementById(
      'uploadPreviewMeta'
    );

  removeFileBtn =
    document.getElementById(
      'btnRemoveFile'
    );

  if (!dropzone || !fileInput) {
    return;
  }

  dropzone.addEventListener(
    'dragover',
    event => {
      event.preventDefault();

      dropzone.classList.add(
        'drag-over'
      );
    }
  );

  dropzone.addEventListener(
    'dragleave',
    () => {
      dropzone.classList.remove(
        'drag-over'
      );
    }
  );

  dropzone.addEventListener(
    'drop',
    event => {
      event.preventDefault();

      dropzone.classList.remove(
        'drag-over'
      );

      if (
        event.dataTransfer &&
        event.dataTransfer.files &&
        event.dataTransfer.files.length > 0
      ) {
        handleFileSelected(
          event.dataTransfer.files[0]
        );
      }
    }
  );

  fileInput.addEventListener(
    'change',
    () => {
      if (
        fileInput.files &&
        fileInput.files.length > 0
      ) {
        handleFileSelected(
          fileInput.files[0]
        );
      }
    }
  );

  removeFileBtn?.addEventListener(
    'click',
    () => {
      state.selectedFile = null;

      fileInput.value = '';

      previewBox?.classList.remove(
        'active'
      );
    }
  );
}


function handleFileSelected(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    showToast(
      'Please select a valid image file (JPG, PNG, WebP)',
      'error'
    );

    return;
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  if (!allowedTypes.includes(file.type)) {
    showToast(
      'Supported formats: JPG, PNG, WebP or GIF',
      'error'
    );

    return;
  }

  state.selectedFile = file;

  if (previewName) {
    previewName.textContent =
      file.name;
  }

  const sizeMb =
    (
      file.size /
      (1024 * 1024)
    ).toFixed(2);

  const reader =
    new FileReader();

  reader.onload =
    event => {
      if (previewImg) {
        previewImg.src =
          event.target.result;
      }

      previewBox?.classList.add(
        'active'
      );

      const img =
        new Image();

      img.onload = () => {
        if (previewMeta) {
          previewMeta.textContent =
            `${sizeMb} MB • ${img.naturalWidth} x ${img.naturalHeight} px`;
        }

        const resolution =
          document.getElementById(
            'wallpaperResolution'
          );

        const device =
          document.getElementById(
            'wallpaperDevice'
          );

        if (
          resolution &&
          (
            img.naturalWidth >= 3840 ||
            img.naturalHeight >= 3840
          )
        ) {
          resolution.value = '4K';
        }

        if (device) {
          if (
            img.naturalHeight >
            img.naturalWidth
          ) {
            device.value =
              'Mobile';
          } else {
            device.value =
              'Desktop';
          }
        }

        const titleInput =
          document.getElementById(
            'wallpaperTitle'
          );

        if (
          titleInput &&
          !titleInput.value.trim()
        ) {
          const cleanName =
            file.name
              .replace(
                /\.[^/.]+$/,
                ''
              )
              .replace(
                /[-_]+/g,
                ' '
              )
              .trim();

          if (cleanName) {
            titleInput.value =
              cleanName
                .charAt(0)
                .toUpperCase() +
              cleanName.slice(1);
          }
        }
      };

      img.src =
        event.target.result;
    };

  reader.readAsDataURL(file);
}


// ─────────────────────────────────────────────────────────────
// ADD WALLPAPER
// ─────────────────────────────────────────────────────────────

function setupAddWallpaperForm() {
  const form =
    document.getElementById(
      'addWallpaperForm'
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      if (!state.selectedFile) {
        showToast(
          'Please select a wallpaper file to upload',
          'error'
        );

        return;
      }

      const categoryValue =
        document.getElementById(
          'wallpaperCategory'
        )?.value;

      const categoryId =
        Number(categoryValue);

      if (
        !Number.isInteger(categoryId) ||
        categoryId <= 0
      ) {
        showToast(
          'Please select a wallpaper category',
          'error'
        );

        return;
      }

      const submitBtn =
        document.getElementById(
          'btnSubmitAddWallpaper'
        );

      if (submitBtn) {
        submitBtn.disabled =
          true;

        submitBtn.innerHTML = `
          <span>
            Uploading & Processing Image...
          </span>
        `;
      }

      try {
        // Upload image
        const formData =
          new FormData();

        formData.append(
          'wallpaper',
          state.selectedFile
        );

        const uploadRes =
          await api(
            '/api/upload',
            {
              method: 'POST',
              body: formData
            }
          );

        if (
          !uploadRes ||
          !uploadRes.image_url
        ) {
          throw new Error(
            'Image upload failed: server did not return image URL'
          );
        }

        // Create database record
        const payload = {
          title:
            document
              .getElementById(
                'wallpaperTitle'
              )
              ?.value
              .trim() || '',

          category_id:
            categoryId,

          resolution:
            document
              .getElementById(
                'wallpaperResolution'
              )
              ?.value || 'HD',

          device:
            document
              .getElementById(
                'wallpaperDevice'
              )
              ?.value || 'Desktop',

          tags:
            document
              .getElementById(
                'wallpaperTags'
              )
              ?.value || '',

          description:
            document
              .getElementById(
                'wallpaperDescription'
              )
              ?.value || '',

          image_url:
            uploadRes.image_url,

          thumbnail_url:
            uploadRes.thumbnail_url,

          storage_key:
            uploadRes.storage_key,

          file_size:
            uploadRes.file_size,

          width:
            uploadRes.width,

          height:
            uploadRes.height,

          file_type:
            uploadRes.file_type,

          is_published:
            Boolean(
              document.getElementById(
                'addIsPublished'
              )?.checked
            ),

          is_featured:
            Boolean(
              document.getElementById(
                'addIsFeatured'
              )?.checked
            ),

          is_popular:
            Boolean(
              document.getElementById(
                'addIsPopular'
              )?.checked
            ),

          is_new:
            Boolean(
              document.getElementById(
                'addIsNew'
              )?.checked
            )
        };

        await api(
          '/api/wallpapers',
          {
            method: 'POST',
            body: payload
          }
        );

        showToast(
          'Wallpaper published successfully!'
        );

        form.reset();

        state.selectedFile =
          null;

        previewBox?.classList.remove(
          'active'
        );

        if (fileInput) {
          fileInput.value =
            '';
        }

        window.location.hash =
          '#wallpapers';

      } catch (err) {
        console.error(
          'Add wallpaper error:',
          err
        );

        showToast(
          err.message ||
          'Failed to publish wallpaper',
          'error'
        );

      } finally {
        if (submitBtn) {
          submitBtn.disabled =
            false;

          submitBtn.innerHTML = `
            <svg
              viewBox="0 0 24 24"
              class="ico"
            >
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>
              Save & Publish Wallpaper
            </span>
          `;
        }
      }
    }
  );
}


// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

async function loadCategories() {
  const grid =
    document.getElementById(
      'categoriesGrid'
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div
      style="
        color: var(--text-faint);
        padding: 32px;
      "
    >
      Loading categories...
    </div>
  `;

  try {
    const data =
      await api('/api/categories');

    state.categories =
      data.categories || [];

     
            const catBadge = document.querySelector('a[href="#categories"] .nav__badge') || 
            document.querySelector('a[href="#categories"] span:last-child') || 
            document.getElementById('categories-count');

if (catBadge) {
  catBadge.textContent = state.categories.length || 0;
}

    if (state.categories.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">
            No categories created yet
          </div>
        </div>
      `;

      return;
    }

    grid.innerHTML =
      state.categories.map(
        category => {
          const cover =
            safeImageUrl(
              category.cover_image,
              getFallbackImage(400)
            );

          return `
            <div class="category-card">
              <img
                src="${cover}"
                class="category-cover"
                alt="${escapeHtml(category.name)}"
                onerror="this.src='${getFallbackImage(400)}'"
              />

              <div class="category-card-body">
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                  "
                >
                  <div>
                    <div class="category-name">
                      ${escapeHtml(category.name)}
                    </div>

                    <div class="category-count">
                      ${Number(
                        category.wallpaper_count || 0
                      )}
                      wallpapers
                    </div>
                  </div>

                  <div class="table-actions">
                    <button
                      type="button"
                      class="action-btn"
                      onclick="
                        openEditCategoryModal(
                          ${Number(category.id)}
                        )
                      "
                      title="Edit"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        class="ico"
                        width="14"
                        height="14"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="action-btn action-btn--delete"
                      onclick="
                        promptDelete(
                          'category',
                          ${Number(category.id)},
                          ${escapeHtml(JSON.stringify(String(category.name || 'Category')))}
                        )
                      "
                      title="Delete"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        class="ico"
                        width="14"
                        height="14"
                      >
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }
      ).join('');

  } catch (err) {
    console.error(
      'Categories error:',
      err
    );

    showToast(
      'Failed to load categories',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// ADD CATEGORY MODAL
// ─────────────────────────────────────────────────────────────

function setupCategoryModal() {
  document
    .getElementById(
      'btnOpenAddCategoryModal'
    )
    ?.addEventListener(
      'click',
      () => {
        const title =
          document.getElementById(
            'categoryModalTitle'
          );

        if (title) {
          title.textContent =
            'Add Category';
        }

        document
          .getElementById(
            'categoryForm'
          )
          ?.reset();

        const id =
          document.getElementById(
            'categoryId'
          );

        if (id) {
          id.value = '';
        }

        openModal(
          'categoryModal'
        );
      }
    );

  document
    .getElementById(
      'categoryForm'
    )
    ?.addEventListener(
      'submit',
      handleCategorySubmit
    );
}


async function openEditCategoryModal(id) {
  try {
    const data =
      await api(
        `/api/categories/${id}`
      );

    const category =
      data.category;

    document.getElementById(
      'categoryModalTitle'
    ).textContent =
      'Edit Category';

    document.getElementById(
      'categoryId'
    ).value =
      category.id;

    document.getElementById(
      'catName'
    ).value =
      category.name || '';

    document.getElementById(
      'catCover'
    ).value =
      category.cover_image || '';

    document.getElementById(
      'catDesc'
    ).value =
      category.description || '';

    document.getElementById(
      'catIsActive'
    ).checked =
      Boolean(category.is_active);

    openModal(
      'categoryModal'
    );

  } catch (err) {
    showToast(
      err.message,
      'error'
    );
  }
}


async function handleCategorySubmit(event) {
  event.preventDefault();

  const id =
    document.getElementById(
      'categoryId'
    )?.value;

  const name =
    document.getElementById(
      'catName'
    )?.value
      .trim();

  if (!name) {
    showToast(
      'Category name is required',
      'error'
    );

    return;
  }

  const payload = {
    name,

    cover_image:
      document.getElementById(
        'catCover'
      )?.value
        .trim() || null,

    description:
      document.getElementById(
        'catDesc'
      )?.value
        .trim() || '',

    is_active:
      Boolean(
        document.getElementById(
          'catIsActive'
        )?.checked
      )
  };

  try {
    if (id) {
      await api(
        `/api/categories/${id}`,
        {
          method: 'PUT',
          body: payload
        }
      );

      showToast(
        'Category updated successfully'
      );

    } else {
      await api(
        '/api/categories',
        {
          method: 'POST',
          body: payload
        }
      );

      showToast(
        'Category created successfully'
      );
    }

    closeModal(
      'categoryModal'
    );

    await loadCategories();

    // Refresh dropdowns
    await loadCategoriesDropdown();

  } catch (err) {
    showToast(
      err.message,
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// COLLECTIONS
// ─────────────────────────────────────────────────────────────

async function loadCollections() {
  const grid =
    document.getElementById(
      'collectionsGrid'
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div
      style="
        color: var(--text-faint);
        padding: 32px;
      "
    >
      Loading collections...
    </div>
  `;

  try {
    const data =
      await api('/api/collections');

    const collections =
      data.collections || [];

    if (collections.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">
            No collections created yet
          </div>
        </div>
      `;

      return;
    }

    grid.innerHTML =
      collections.map(
        collection => `
          <div class="category-card">
            <div
              style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                height: 130px;
                overflow: hidden;
                background: var(--surface-2);
              "
            >
              ${
                collection.previews &&
                collection.previews.length > 0
                  ? collection.previews
                      .slice(0, 4)
                      .map(preview => `
                        <img
                          src="${safeImageUrl(
                            preview.thumbnail_url,
                            getFallbackImage(200)
                          )}"
                          style="
                            width: 100%;
                            height: 65px;
                            object-fit: cover;
                          "
                          alt="${escapeHtml(preview.title)}"
                          onerror="this.src='${getFallbackImage(200)}'"
                        />
                      `)
                      .join('')
                  : `
                    <div
                      style="
                        grid-column: span 2;
                        display: grid;
                        place-items: center;
                        color: var(--text-faint);
                      "
                    >
                      Empty Collection
                    </div>
                  `
              }
            </div>

            <div class="category-card-body">
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                "
              >
                <div>
                  <div class="category-name">
                    ${escapeHtml(collection.name)}
                  </div>

                  <div class="category-count">
                    ${Number(
                      collection.wallpaper_count || 0
                    )}
                    wallpapers
                  </div>
                </div>

                <button
                  type="button"
                  class="action-btn action-btn--delete"
                  onclick="
                    promptDelete(
                      'collection',
                      ${Number(collection.id)},
                      ${escapeHtml(JSON.stringify(String(collection.name || 'Collection')))}
                    )
                  "
                  title="Delete"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="ico"
                    width="14"
                    height="14"
                  >
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `
      ).join('');

  } catch (err) {
    console.error(
      'Collections error:',
      err
    );

    showToast(
      'Failed to load collections',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// POPULAR
// ─────────────────────────────────────────────────────────────

async function loadPopularWallpapers() {
  const tbody =
    document.getElementById(
      'popularTableBody'
    );

  if (!tbody) {
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td
        colspan="7"
        style="
          text-align: center;
          color: var(--text-faint);
        "
      >
        Loading rankings...
      </td>
    </tr>
  `;

  try {
    const data =
      await api(
        '/api/analytics/popular?limit=25'
      );

    const items =
      data.items || [];

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="7"
            style="
              text-align: center;
              padding: 40px;
              color: var(--text-faint);
            "
          >
            No popular wallpapers yet.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      items.map(
        (wallpaper, index) => `
          <tr>
            <td
              style="
                font-weight: 700;
                color: ${
                  index < 3
                    ? 'var(--accent-2)'
                    : 'var(--text-faint)'
                };
              "
            >
              #${index + 1}
            </td>

            <td>
              <div class="table-item-cell">
                <img
                  src="${safeImageUrl(
                    wallpaper.thumbnail_url,
                    getFallbackImage(200)
                  )}"
                  class="table-thumb"
                  alt="${escapeHtml(wallpaper.title)}"
                  onerror="this.src='${getFallbackImage(200)}'"
                />

                <div>
                  <div class="table-item-title">
                    ${escapeHtml(wallpaper.title)}
                  </div>

                  <div class="table-item-sub">
                    ${escapeHtml(
                      wallpaper.resolution || ''
                    )}
                  </div>
                </div>
              </div>
            </td>

            <td>
              ${escapeHtml(
                wallpaper.category_name ||
                'None'
              )}
            </td>

            <td
              style="
                font-weight: 600;
                color: var(--accent);
              "
            >
              ${Number(
                wallpaper.downloads || 0
              ).toLocaleString()}
            </td>

            <td>
              ${Number(
                wallpaper.views || 0
              ).toLocaleString()}
            </td>

            <td>
              ${Number(
                wallpaper.favorites || 0
              ).toLocaleString()}
            </td>

            <td>
              <span class="badge badge--popular">
                Hot
              </span>
            </td>
          </tr>
        `
      ).join('');

  } catch (err) {
    showToast(
      'Failed to load popular rankings',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// NEW RELEASES
// ─────────────────────────────────────────────────────────────

async function loadNewReleases() {
  const tbody =
    document.getElementById(
      'newReleasesTableBody'
    );

  if (!tbody) {
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td
        colspan="6"
        style="
          text-align: center;
          color: var(--text-faint);
        "
      >
        Loading new releases...
      </td>
    </tr>
  `;

  try {
    const data =
      await api(
        '/api/wallpapers?status=new&limit=25'
      );

    const wallpapers =
      data.wallpapers || [];

    if (wallpapers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="
              text-align: center;
              padding: 40px;
              color: var(--text-faint);
            "
          >
            No new releases found.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      wallpapers.map(
        wallpaper => `
          <tr>
            <td>
              <div class="table-item-cell">
                <img
                  src="${safeImageUrl(
                    wallpaper.thumbnail_url,
                    getFallbackImage(200)
                  )}"
                  class="table-thumb"
                  alt="${escapeHtml(wallpaper.title)}"
                  onerror="this.src='${getFallbackImage(200)}'"
                />

                <div class="table-item-title">
                  ${escapeHtml(wallpaper.title)}
                </div>
              </div>
            </td>

            <td>
              ${escapeHtml(
                wallpaper.category_name ||
                'None'
              )}
            </td>

            <td>
              ${formatDate(
                wallpaper.created_at
              )}
            </td>

            <td>
              ${Number(
                wallpaper.downloads || 0
              ).toLocaleString()}
            </td>

            <td>
              <span class="badge badge--featured">
                New
              </span>
            </td>

            <td style="text-align: right;">
              <button
                type="button"
                class="btn btn--secondary btn--sm"
                onclick="
                  toggleWallpaperFlag(
                    ${Number(wallpaper.id)},
                    'is_new',
                    0
                  )
                "
              >
                Remove New Badge
              </button>
            </td>
          </tr>
        `
      ).join('');

  } catch (err) {
    showToast(
      'Failed to load new releases',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────

async function loadUsers() {
  const tbody =
    document.getElementById(
      'usersTableBody'
    );

  if (!tbody) {
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td
        colspan="6"
        style="
          text-align: center;
          color: var(--text-faint);
        "
      >
        Loading registered users...
      </td>
    </tr>
  `;

  try {
    const data =
      await api('/api/users');

    const users =
      data.users || [];

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="
              text-align: center;
              padding: 40px;
              color: var(--text-faint);
            "
          >
            No registered users found.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      users.map(
        user => {
          const username =
            user.username ||
            'Member';

          const email =
            user.email ||
            '';

          const initial =
            (
              user.username ||
              user.email ||
              'U'
            )
              .charAt(0)
              .toUpperCase();

          return `
            <tr>
              <td>
                <div
                  style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                  "
                >
                  <div
                    class="admin-avatar"
                    style="
                      width: 32px;
                      height: 32px;
                      font-size: 0.8rem;
                    "
                  >
                    ${escapeHtml(initial)}
                  </div>

                  <div>
                    <div
                      style="
                        font-weight: 600;
                      "
                    >
                      ${escapeHtml(username)}
                    </div>

                    <div
                      style="
                        font-size: 0.78rem;
                        color: var(--text-faint);
                      "
                    >
                      ${escapeHtml(email)}
                    </div>
                  </div>
                </div>
              </td>

              <td>
                ${Number(
                  user.favorites_count || 0
                ).toLocaleString()}
              </td>

              <td>
                ${Number(
                  user.downloads_count || 0
                ).toLocaleString()}
              </td>

              <td>
                ${formatDate(
                  user.created_at
                )}
              </td>

              <td>
                <button
                  type="button"
                  class="badge ${
                    user.is_active
                      ? 'badge--active'
                      : 'badge--inactive'
                  }"
                  onclick="
                    toggleUserStatus(
                      ${Number(user.id)},
                      ${user.is_active ? 0 : 1}
                    )
                  "
                >
                  ${
                    user.is_active
                      ? 'Active'
                      : 'Disabled'
                  }
                </button>
              </td>

              <td style="text-align: right;">
                <button
                  type="button"
                  class="action-btn action-btn--delete"
                  onclick="
                    promptDelete(
                      'user',
                      ${Number(user.id)},
                      ${escapeHtml(JSON.stringify(email))}
                    )
                  "
                  title="Delete"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="ico"
                    width="14"
                    height="14"
                  >
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          `;
        }
      ).join('');

  } catch (err) {
    showToast(
      'Failed to load users',
      'error'
    );
  }
}


async function toggleUserStatus(
  id,
  is_active
) {
  try {
    await api(
      `/api/users/${id}/status`,
      {
        method: 'PUT',
        body: {
          is_active
        }
      }
    );

    showToast(
      'User status updated'
    );

    await loadUsers();

  } catch (err) {
    showToast(
      err.message,
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────

async function loadAnalyticsDeep() {
  try {
    const trends =
      await api(
        '/api/analytics/trends?days=30'
      );

    renderTrafficChart(
      'analyticsAreaChart',
      trends.downloads || [],
      trends.views || []
    );

    const breakdown =
      await api(
        '/api/analytics/breakdown'
      );

    renderCategoryChart(
      'analyticsDeviceChart',
      breakdown.devices || []
    );

  } catch (err) {
    showToast(
      'Failed to render deep analytics charts',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// HOMEPAGE
// ─────────────────────────────────────────────────────────────

async function loadHomepageSections() {
  const tbody =
    document.getElementById(
      'homepageSectionsBody'
    );

  if (!tbody) {
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td
        colspan="5"
        style="
          text-align: center;
          color: var(--text-faint);
        "
      >
        Loading layout...
      </td>
    </tr>
  `;

  try {
    const data =
      await api('/api/homepage');

    const sections =
      data.sections || [];

    if (sections.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="5"
            style="
              text-align: center;
              padding: 40px;
              color: var(--text-faint);
            "
          >
            No homepage sections configured.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      sections.map(
        section => `
          <tr>
            <td
              style="
                font-weight: 600;
                color: var(--accent-2);
              "
            >
              ${escapeHtml(
                section.section_key
              )}
            </td>

            <td>
              ${escapeHtml(
                section.title ||
                'Untitled'
              )}
            </td>

            <td
              style="
                color: var(--text-dim);
              "
            >
              ${escapeHtml(
                section.description ||
                '-'
              )}
            </td>

            <td>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  ${
                    section.is_enabled
                      ? 'checked'
                      : ''
                  }
                  onchange="
                    toggleHomepageSection(
                      ${Number(section.id)},
                      this.checked
                    )
                  "
                />

                <span class="toggle-slider"></span>
              </label>
            </td>

            <td style="text-align: right;">
              <span class="badge badge--published">
                Order:
                ${Number(
                  section.display_order || 0
                )}
              </span>
            </td>
          </tr>
        `
      ).join('');

  } catch (err) {
    showToast(
      'Failed to load homepage sections',
      'error'
    );
  }
}


async function toggleHomepageSection(
  id,
  is_enabled
) {
  try {
    await api(
      `/api/homepage/${id}`,
      {
        method: 'PUT',
        body: {
          is_enabled
        }
      }
    );

    showToast(
      'Homepage layout updated'
    );

  } catch (err) {
    showToast(
      err.message,
      'error'
    );

    await loadHomepageSections();
  }
}


// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────

async function loadSettings() {
  try {
    const data =
      await api('/api/settings');

    const settings =
      data.settings || {};

    const siteTitle =
      document.getElementById(
        'settingSiteTitle'
      );

    if (
      siteTitle &&
      settings.site_title !== undefined
    ) {
      siteTitle.value =
        settings.site_title;
    }

    const contactEmail =
      document.getElementById(
        'settingContactEmail'
      );

    if (
      contactEmail &&
      settings.contact_email !== undefined
    ) {
      contactEmail.value =
        settings.contact_email;
    }

    const siteDescription =
      document.getElementById(
        'settingSiteDesc'
      );

    if (
      siteDescription &&
      settings.site_description !== undefined
    ) {
      siteDescription.value =
        settings.site_description;
    }

    const maxUpload =
      document.getElementById(
        'settingMaxUpload'
      );

    if (
      maxUpload &&
      settings.max_upload_size !== undefined
    ) {
      maxUpload.value =
        settings.max_upload_size;
    }

    const itemsPerPage =
      document.getElementById(
        'settingItemsPerPage'
      );

    if (
      itemsPerPage &&
      settings.items_per_page !== undefined
    ) {
      itemsPerPage.value =
        settings.items_per_page;
    }

  } catch (err) {
    showToast(
      'Failed to load site settings',
      'error'
    );
  }
}


function setupSettingsForm() {
  document
    .getElementById(
      'settingsForm'
    )
    ?.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const payload = {
          site_title:
            document.getElementById(
              'settingSiteTitle'
            )?.value || '',

          contact_email:
            document.getElementById(
              'settingContactEmail'
            )?.value || '',

          site_description:
            document.getElementById(
              'settingSiteDesc'
            )?.value || '',

          max_upload_size:
            document.getElementById(
              'settingMaxUpload'
            )?.value || '',

          items_per_page:
            document.getElementById(
              'settingItemsPerPage'
            )?.value || ''
        };

        try {
          await api(
            '/api/settings',
            {
              method: 'PUT',
              body: payload
            }
          );

          showToast(
            'Settings saved successfully!'
          );

        } catch (err) {
          showToast(
            err.message,
            'error'
          );
        }
      }
    );
}


// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

async function loadProfile() {
  try {
    const data =
      await api('/api/auth/me');

    if (!data.admin) {
      return;
    }

    state.admin =
      data.admin;

    const profileName =
      document.getElementById(
        'profileName'
      );

    const profileEmail =
      document.getElementById(
        'profileEmail'
      );

    const sidebarAdminName =
      document.getElementById(
        'sidebarAdminName'
      );

    const sidebarAvatar =
      document.getElementById(
        'sidebarAvatar'
      );

    if (profileName) {
      profileName.value =
        data.admin.name || '';
    }

    if (profileEmail) {
      profileEmail.value =
        data.admin.email || '';
    }

    if (sidebarAdminName) {
      sidebarAdminName.textContent =
        data.admin.name ||
        'Admin';
    }

    if (sidebarAvatar) {
      sidebarAvatar.textContent =
        (
          data.admin.name ||
          'A'
        )
          .charAt(0)
          .toUpperCase();
    }

  } catch (err) {
    showToast(
      'Failed to load admin profile',
      'error'
    );
  }
}


function setupProfileForms() {
  document
    .getElementById(
      'profileInfoForm'
    )
    ?.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const name =
          document.getElementById(
            'profileName'
          )?.value
            .trim();

        const email =
          document.getElementById(
            'profileEmail'
          )?.value
            .trim();

        if (!name) {
          showToast(
            'Name is required',
            'error'
          );

          return;
        }

        if (!email) {
          showToast(
            'Email is required',
            'error'
          );

          return;
        }

        try {
          const data =
            await api(
              '/api/auth/profile',
              {
                method: 'PUT',
                body: {
                  name,
                  email
                }
              }
            );

          showToast(
            'Profile updated successfully'
          );

          const sidebarName =
            document.getElementById(
              'sidebarAdminName'
            );

          if (sidebarName) {
            sidebarName.textContent =
              data.admin?.name ||
              name;
          }

          const sidebarAvatar =
            document.getElementById(
              'sidebarAvatar'
            );

          if (sidebarAvatar) {
            sidebarAvatar.textContent =
              (
                data.admin?.name ||
                name
              )
                .charAt(0)
                .toUpperCase();
          }

        } catch (err) {
          showToast(
            err.message,
            'error'
          );
        }
      }
    );


  document
    .getElementById(
      'passwordChangeForm'
    )
    ?.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const currentPassword =
          document.getElementById(
            'currentPassword'
          )?.value || '';

        const newPassword =
          document.getElementById(
            'newPassword'
          )?.value || '';

        const confirm =
          document.getElementById(
            'confirmNewPassword'
          )?.value || '';

        if (!currentPassword) {
          showToast(
            'Current password is required',
            'error'
          );

          return;
        }

        if (!newPassword) {
          showToast(
            'New password is required',
            'error'
          );

          return;
        }

        if (newPassword !== confirm) {
          showToast(
            'New passwords do not match',
            'error'
          );

          return;
        }

        try {
          await api(
            '/api/auth/password',
            {
              method: 'PUT',
              body: {
                currentPassword,
                newPassword
              }
            }
          );

          showToast(
            'Password changed successfully'
          );

          document
            .getElementById(
              'passwordChangeForm'
            )
            ?.reset();

        } catch (err) {
          showToast(
            err.message,
            'error'
          );
        }
      }
    );
}


// ─────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────────────────────

async function loadActivityLog() {
  const tbody =
    document.getElementById(
      'activityTableBody'
    );

  if (!tbody) {
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td
        colspan="6"
        style="
          text-align: center;
          color: var(--text-faint);
        "
      >
        Loading audit trail...
      </td>
    </tr>
  `;

  try {
    const params =
      new URLSearchParams({
        page:
          state.activityPage,

        limit:
          state.activityLimit
      });

    const data =
      await api(
        `/api/activity?${params.toString()}`
      );

    const logs =
      data.logs || [];

    const pagination =
      data.pagination || {
        page: state.activityPage,
        limit: state.activityLimit,
        total: logs.length,
        totalPages: 1
      };

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="
              text-align: center;
              padding: 40px;
              color: var(--text-faint);
            "
          >
            No activity logs found.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML =
        logs.map(
          log => `
            <tr>
              <td
                style="
                  font-size: 0.8rem;
                  color: var(--text-dim);
                "
              >
                ${formatDate(
                  log.created_at,
                  true
                )}
              </td>

              <td
                style="
                  font-weight: 600;
                "
              >
                ${escapeHtml(
                  log.admin_name ||
                  'Admin'
                )}
              </td>

              <td>
                <span class="badge badge--featured">
                  ${escapeHtml(
                    log.action ||
                    ''
                  )}
                </span>
              </td>

              <td>
                <span
                  style="
                    font-size: 0.8rem;
                    color: var(--accent-2);
                  "
                >
                  ${escapeHtml(
                    log.entity ||
                    '-'
                  )}
                </span>
              </td>

              <td>
                ${escapeHtml(
                  log.details ||
                  '-'
                )}
              </td>

              <td
                style="
                  font-family: monospace;
                  font-size: 0.78rem;
                  color: var(--text-faint);
                "
              >
                ${escapeHtml(
                  log.ip_address ||
                  'localhost'
                )}
              </td>
            </tr>
          `
        ).join('');
    }

    const page =
      Number(
        pagination.page ||
        state.activityPage
      );

    const limit =
      Number(
        pagination.limit ||
        state.activityLimit
      );

    const total =
      Number(
        pagination.total ||
        logs.length
      );

    const totalPages =
      Number(
        pagination.totalPages ||
        Math.ceil(total / limit) ||
        1
      );

    const start =
      total > 0
        ? (page - 1) * limit + 1
        : 0;

    const end =
      Math.min(
        total,
        page * limit
      );

    const info =
      document.getElementById(
        'activityPaginationInfo'
      );

    if (info) {
      info.textContent =
        `Showing ${start} to ${end} of ${total} audit logs`;
    }

    renderPaginationControls(
      'activityPaginationControls',
      page,
      totalPages,
      newPage => {
        state.activityPage =
          newPage;

        loadActivityLog();
      }
    );

  } catch (err) {
    showToast(
      'Failed to load activity logs',
      'error'
    );
  }
}


// ─────────────────────────────────────────────────────────────
// EDIT WALLPAPER
// ─────────────────────────────────────────────────────────────

async function openEditWallpaperModal(id) {
  try {
    const data =
      await api(
        `/api/wallpapers/${id}`
      );

    const wallpaper =
      data.wallpaper;

    document.getElementById(
      'editWallpaperId'
    ).value =
      wallpaper.id;

    document.getElementById(
      'editTitle'
    ).value =
      wallpaper.title || '';

    document.getElementById(
      'editCategory'
    ).value =
      wallpaper.category_id || '';

    document.getElementById(
      'editResolution'
    ).value =
      wallpaper.resolution || '';

    document.getElementById(
      'editTags'
    ).value =
      Array.isArray(wallpaper.tags)
        ? wallpaper.tags
            .map(tag =>
              typeof tag === 'string'
                ? tag
                : tag.name
            )
            .filter(Boolean)
            .join(', ')
        : (
            wallpaper.tags || ''
          );

    document.getElementById(
      'editDescription'
    ).value =
      wallpaper.description || '';

    document.getElementById(
      'editIsPublished'
    ).checked =
      Boolean(
        wallpaper.is_published
      );

    document.getElementById(
      'editIsFeatured'
    ).checked =
      Boolean(
        wallpaper.is_featured
      );

    document.getElementById(
      'editIsPopular'
    ).checked =
      Boolean(
        wallpaper.is_popular
      );

    document.getElementById(
      'editIsNew'
    ).checked =
      Boolean(
        wallpaper.is_new
      );

    openModal(
      'editWallpaperModal'
    );

  } catch (err) {
    showToast(
      err.message,
      'error'
    );
  }
}


function setupEditWallpaperForm() {
  document
    .getElementById(
      'editWallpaperForm'
    )
    ?.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const id =
          document.getElementById(
            'editWallpaperId'
          )?.value;

        if (!id) {
          showToast(
            'Wallpaper ID is missing',
            'error'
          );

          return;
        }

        const categoryValue =
          document.getElementById(
            'editCategory'
          )?.value;

        const categoryId =
          Number(categoryValue);

        if (
          !Number.isInteger(categoryId) ||
          categoryId <= 0
        ) {
          showToast(
            'Please select a valid category',
            'error'
          );

          return;
        }

        const payload = {
          title:
            document.getElementById(
              'editTitle'
            )?.value
              .trim() || '',

          category_id:
            categoryId,

          resolution:
            document.getElementById(
              'editResolution'
            )?.value || '',

          tags:
            document.getElementById(
              'editTags'
            )?.value || '',

          description:
            document.getElementById(
              'editDescription'
            )?.value || '',

          is_published:
            Boolean(
              document.getElementById(
                'editIsPublished'
              )?.checked
            ),

          is_featured:
            Boolean(
              document.getElementById(
                'editIsFeatured'
              )?.checked
            ),

          is_popular:
            Boolean(
              document.getElementById(
                'editIsPopular'
              )?.checked
            ),

          is_new:
            Boolean(
              document.getElementById(
                'editIsNew'
              )?.checked
            )
        };

        try {
          await api(
            `/api/wallpapers/${id}`,
            {
              method: 'PUT',
              body: payload
            }
          );

          showToast(
            'Wallpaper updated successfully'
          );

          closeModal(
            'editWallpaperModal'
          );

          await loadWallpapers();

        } catch (err) {
          showToast(
            err.message,
            'error'
          );
        }
      }
    );
}


// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

function promptDelete(
  type,
  id,
  name
) {
  state.deleteTarget = {
    type,
    id,
    name
  };

  const message =
    document.getElementById(
      'deleteConfirmMessage'
    );

  if (message) {
    message.innerHTML =
      `Are you sure you want to permanently delete ` +
      `<strong>"${escapeHtml(name)}"</strong>? ` +
      `This action cannot be reversed.`;
  }

  openModal(
    'deleteConfirmModal'
  );
}


function setupDeleteButton() {
  document
    .getElementById(
      'btnExecuteDelete'
    )
    ?.addEventListener(
      'click',
      executeDelete
    );
}


async function executeDelete() {
  if (!state.deleteTarget) {
    return;
  }

  const {
    type,
    id
  } =
    state.deleteTarget;

  const button =
    document.getElementById(
      'btnExecuteDelete'
    );

  if (button) {
    button.disabled =
      true;
  }

  try {
    if (type === 'wallpaper') {
      await api(
        `/api/wallpapers/${id}`,
        {
          method: 'DELETE'
        }
      );

      showToast(
        'Wallpaper deleted'
      );

      await loadWallpapers();

    } else if (type === 'category') {
      await api(
        `/api/categories/${id}`,
        {
          method: 'DELETE'
        }
      );

      showToast(
        'Category deleted'
      );

      await loadCategories();

      await loadCategoriesDropdown();

    } else if (type === 'collection') {
      await api(
        `/api/collections/${id}`,
        {
          method: 'DELETE'
        }
      );

      showToast(
        'Collection deleted'
      );

      await loadCollections();

    } else if (type === 'user') {
      await api(
        `/api/users/${id}`,
        {
          method: 'DELETE'
        }
      );

      showToast(
        'User deleted'
      );

      await loadUsers();
    }

  } catch (err) {
    showToast(
      err.message,
      'error'
    );

  } finally {
    closeModal(
      'deleteConfirmModal'
    );

    state.deleteTarget =
      null;

    if (button) {
      button.disabled =
        false;
    }
  }
}


// ─────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────

function renderPaginationControls(
  containerId,
  currentPage,
  totalPages,
  onPageChange
) {
  const container =
    document.getElementById(
      containerId
    );

  if (!container) {
    return;
  }

  currentPage =
    Number(currentPage) || 1;

  totalPages =
    Number(totalPages) || 1;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const html = [];

  // Previous
  html.push(`
    <button
      type="button"
      class="page-btn"
      data-page="${currentPage - 1}"
      ${currentPage === 1 ? 'disabled' : ''}
      aria-label="Previous page"
    >
      ‹
    </button>
  `);

  const pages = [];

  if (totalPages <= 7) {
    for (
      let i = 1;
      i <= totalPages;
      i++
    ) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (currentPage > 4) {
      pages.push('ellipsis-left');
    }

    const start =
      Math.max(
        2,
        currentPage - 1
      );

    const end =
      Math.min(
        totalPages - 1,
        currentPage + 1
      );

    for (
      let i = start;
      i <= end;
      i++
    ) {
      pages.push(i);
    }

    if (
      currentPage <
      totalPages - 3
    ) {
      pages.push(
        'ellipsis-right'
      );
    }

    pages.push(
      totalPages
    );
  }

  pages.forEach(page => {
    if (
      page === 'ellipsis-left' ||
      page === 'ellipsis-right'
    ) {
      html.push(`
        <span
          style="
            color: var(--text-faint);
            padding: 0 4px;
          "
        >
          …
        </span>
      `);

      return;
    }

    html.push(`
      <button
        type="button"
        class="page-btn ${
          page === currentPage
            ? 'active'
            : ''
        }"
        data-page="${page}"
        ${
          page === currentPage
            ? 'aria-current="page"'
            : ''
        }
      >
        ${page}
      </button>
    `);
  });

  // Next
  html.push(`
    <button
      type="button"
      class="page-btn"
      data-page="${currentPage + 1}"
      ${
        currentPage === totalPages
          ? 'disabled'
          : ''
      }
      aria-label="Next page"
    >
      ›
    </button>
  `);

  container.innerHTML =
    html.join('');

  container
    .querySelectorAll(
      '[data-page]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          if (
            button.disabled
          ) {
            return;
          }

          const page =
            Number(
              button.dataset.page
            );

          if (
            !Number.isInteger(page) ||
            page < 1 ||
            page > totalPages ||
            page === currentPage
          ) {
            return;
          }

          onPageChange(page);
        }
      );
    });
}


// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}


function safeImageUrl(
  url,
  fallback = ''
) {
  if (!url) {
    return fallback;
  }

  try {
    const parsed =
      new URL(
        url,
        window.location.origin
      );

    if (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:'
    ) {
      return parsed.href;
    }
  } catch (err) {
    // Invalid URL
  }

  return fallback;
}


function safeAttributeUrl(url) {
  return escapeHtml(
    safeImageUrl(
      url,
      '#'
    )
  );
}


function getFallbackImage(
  width = 400
) {
  return (
    'https://images.unsplash.com/' +
    'photo-1618005182384-a83a8bd57fbe' +
    `?w=${width}&q=80`
  );
}


function formatDate(
  dateStr,
  includeTime = false
) {
  if (!dateStr) {
    return '-';
  }

  const date =
    new Date(dateStr);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-';
  }

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  if (includeTime) {
    options.hour =
      '2-digit';

    options.minute =
      '2-digit';
  }

  return new Intl.DateTimeFormat(
    'en-US',
    options
  ).format(date);
}


function formatTimeAgo(
  dateStr
) {
  if (!dateStr) {
    return '';
  }

  const date =
    new Date(dateStr);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const seconds =
    Math.floor(
      (
        Date.now() -
        date.getTime()
      ) / 1000
    );

  if (seconds < 60) {
    return 'Just now';
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  return `${days}d ago`;
}


// ─────────────────────────────────────────────────────────────
// SEARCH / FILTERS
// ─────────────────────────────────────────────────────────────

function setupWallpaperFilters() {
  const category =
    document.getElementById(
      'filterWallpaperCategory'
    );

  const device =
    document.getElementById(
      'filterWallpaperDevice'
    );

  const status =
    document.getElementById(
      'filterWallpaperStatus'
    );

  const search =
    document.getElementById(
      'filterWallpaperSearch'
    );

  category?.addEventListener(
    'change',
    () => {
      state.wallpapersPage =
        1;

      loadWallpapers();
    }
  );

  device?.addEventListener(
    'change',
    () => {
      state.wallpapersPage =
        1;

      loadWallpapers();
    }
  );

  status?.addEventListener(
    'change',
    () => {
      state.wallpapersPage =
        1;

      loadWallpapers();
    }
  );

  search?.addEventListener(
    'input',
    () => {
      clearTimeout(
        state.wallpaperSearchTimer
      );

      state.wallpaperSearchTimer =
        setTimeout(
          () => {
            state.wallpapersPage =
              1;

            loadWallpapers();
          },
          400
        );
    }
  );

  document
    .getElementById(
      'btnResetWallpaperFilters'
    )
    ?.addEventListener(
      'click',
      () => {
        if (search) {
          search.value = '';
        }

        if (category) {
          category.value = '';
        }

        if (device) {
          device.value = '';
        }

        if (status) {
          status.value = '';
        }

        state.wallpapersPage =
          1;

        clearTimeout(
          state.wallpaperSearchTimer
        );

        loadWallpapers();
      }
    );
}


// ─────────────────────────────────────────────────────────────
// GLOBAL SEARCH
// ─────────────────────────────────────────────────────────────

function setupGlobalSearch() {
  document
    .getElementById(
      'globalSearchInput'
    )
    ?.addEventListener(
      'keydown',
      event => {
        if (
          event.key !== 'Enter'
        ) {
          return;
        }

        const query =
          event.target.value.trim();

        if (!query) {
          return;
        }

        window.location.hash =
          '#wallpapers';

        const filterInput =
          document.getElementById(
            'filterWallpaperSearch'
          );

        if (filterInput) {
          filterInput.value =
            query;

          state.wallpapersPage =
            1;

          loadWallpapers();
        }
      }
    );
}


// ─────────────────────────────────────────────────────────────
// MODAL EVENTS
// ─────────────────────────────────────────────────────────────

function setupModalEvents() {
  document
    .querySelectorAll(
      '.modal-close'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const modalId =
            button.dataset.modal;

          if (modalId) {
            closeModal(
              modalId
            );
          }
        }
      );
    });

  
  document
    .querySelectorAll(
      '.admin-modal-backdrop'
    )
    .forEach(modal => {
      modal.addEventListener(
        'click',
        event => {
          if (
            event.target === modal
          ) {
            modal.classList.remove(
              'active'
            );
          }
        }
      );
    });

  // ESC Key press event
  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key !== 'Escape'
      ) {
        return;
      }

      document
        .querySelectorAll(
          '.admin-modal-backdrop.active'
        )
        .forEach(modal => {
          modal.classList.remove(
            'active'
          );
        });

      state.deleteTarget =
        null;
    }
  );

 
  document
    .getElementById('confirmDeleteBtn')
    ?.addEventListener('click', confirmDelete);
}


// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────

function setupSidebar() {
  const sidebar =
    document.getElementById(
      'adminSidebar'
    );

  const shell =
    document.getElementById(
      'adminShell'
    );

  const overlay =
    document.getElementById(
      'sidebarOverlay'
    );

  document
    .getElementById(
      'sidebarToggle'
    )
    ?.addEventListener(
      'click',
      () => {
        if (
          window.innerWidth <= 820
        ) {
          sidebar?.classList.toggle(
            'mobile-open'
          );

          overlay?.classList.toggle(
            'active'
          );
        } else {
          shell?.classList.toggle(
            'sidebar-collapsed'
          );
        }
      }
    );

  overlay?.addEventListener(
    'click',
    () => {
      sidebar?.classList.remove(
        'mobile-open'
      );

      overlay?.classList.remove(
        'active'
      );
    }
  );
}


// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────

function setupLogout() {
  document
    .getElementById(
      'logoutBtn'
    )
    ?.addEventListener(
      'click',
      () => {
        localStorage.removeItem(
          'ronviana_token'
        );

        localStorage.removeItem(
          'ronviana_admin'
        );

        localStorage.removeItem(
          'wallora_token'
        );

        localStorage.removeItem(
          'wallora_admin'
        );

        state.token =
          null;

        window.location.replace(
          'index.html'
        );
      }
    );
}


// ─────────────────────────────────────────────────────────────
// REFRESH
// ─────────────────────────────────────────────────────────────

function setupRefresh() {
  document
    .getElementById(
      'refreshDataBtn'
    )
    ?.addEventListener(
      'click',
      async () => {
        await loadViewData(
          state.currentView
        );

        showToast(
          'Data refreshed'
        );
      }
    );
}


// ─────────────────────────────────────────────────────────────
// RESIZE CHARTS
// ─────────────────────────────────────────────────────────────

let resizeTimer = null;

window.addEventListener(
  'resize',
  () => {
    clearTimeout(
      resizeTimer
    );

    resizeTimer =
      setTimeout(
        () => {
          if (
            state.currentView ===
            'dashboard'
          ) {
            loadDashboardCharts();
          }

          if (
            state.currentView ===
            'analytics'
          ) {
            loadAnalyticsDeep();
          }
        },
        250
      );
  }
);


// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    if (!checkAuth()) {
      return;
    }

    setupSidebar();

    setupLogout();

    setupGlobalSearch();

    setupRefresh();

    setupModalEvents();

    setupDropzone();

    setupAddWallpaperForm();

    setupCategoryModal();

    setupSettingsForm();

    setupProfileForms();

    setupEditWallpaperForm();

    setupDeleteButton();

    setupWallpaperFilters();

    window.addEventListener('resize', () => {
      if (state.currentView === 'dashboard') {
        loadDashboardCharts();
      }
    });

    // Profile can load independently
    loadProfile();

    // Initial route
    const initialView =
      window.location.hash
        ? window.location.hash.replace(
            /^#/,
            ''
          )
        : 'dashboard';

    navigateTo(
      initialView ||
      'dashboard'
    );
  }
);


// ─────────────────────────────────────────────────────────────
// GLOBAL FUNCTIONS
// ─────────────────────────────────────────────────────────────
// These are intentionally exposed because the existing HTML
// uses inline onclick handlers.

window.navigateTo =
  navigateTo;

window.openModal =
  openModal;

window.closeModal =
  closeModal;

window.toggleWallpaperFlag =
  toggleWallpaperFlag;

window.openEditWallpaperModal =
  openEditWallpaperModal;

window.openEditCategoryModal =
  openEditCategoryModal;

window.toggleUserStatus =
  toggleUserStatus;

window.toggleHomepageSection =
  toggleHomepageSection;

window.promptDelete =
  promptDelete;

