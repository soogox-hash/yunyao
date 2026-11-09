/* 云遥 · 移植功能模块（数据统计 / 社区动态 / 排行榜 / 徽章 / 目标环 / 周挑战）
 * 复用 app-ui.js 的全局状态与 localStorage 数据，配色沿用深色 + 橙色主题。 */
(function () {
  const REC_KEY = 'cloudRideHistoryRecords';
  const LIKE_KEY = 'cloudRideFeedLikes';
  const GOAL_KM = 300;
  const WEEK_TARGET = 100;

  /* ---------- 工具 ---------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const value = JSON.parse(raw);
      return value == null ? fallback : value;
    } catch (error) { return fallback; }
  }
  const num = (value, digits = 1) => Number(value || 0).toFixed(digits);
  const has = (id) => document.getElementById(id);

  function readRecords() {
    const list = readJSON(REC_KEY, []);
    if (!Array.isArray(list)) return [];
    return list.filter((r) => r && Number.isFinite(Number(r.distance)) && Number(r.distance) > 0);
  }
  function recTime(record) {
    const value = record.createdAt || record.date;
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }
  function recDuration(record) {
    if (Number.isFinite(Number(record.durationSeconds))) return Number(record.durationSeconds);
    if (record.duration) {
      const parts = String(record.duration).split(':').map(Number);
      if (parts.length >= 2) return parts.reduce((sum, part) => sum * 60 + part, 0);
    }
    return 0;
  }
  function startOfWeek(from = new Date()) {
    const date = new Date(from);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
  }
  function startOfMonth(from = new Date()) {
    const date = new Date(from.getFullYear(), from.getMonth(), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  function fmtClock(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (v) => String(v).padStart(2, '0');
    return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }
  function inFrom(record, from) { return recTime(record) >= from.getTime(); }
  function sumBy(list, pick) { return list.reduce((total, item) => total + Number(pick(item) || 0), 0); }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /* ---------- 柱状图 ---------- */
  function drawBars(canvas, labels, values) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 158;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const top = 6;
    const base = h - 15;
    const max = Math.max(1, ...values) * 1.18;
    ctx.strokeStyle = 'rgba(37,45,55,.85)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i += 1) {
      const y = top + (base - top) * i / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const count = Math.max(1, values.length);
    const slot = w / count;
    values.forEach((value, index) => {
      const barW = Math.min(slot * 0.58, 18);
      const x = index * slot + (slot - barW) / 2;
      const height = Math.max(value > 0 ? 4 : 2, (value / max) * (base - top));
      const y = base - height;
      if (value > 0) {
        const gradient = ctx.createLinearGradient(0, y, 0, base);
        gradient.addColorStop(0, '#ff9a4d');
        gradient.addColorStop(1, 'rgba(255,121,37,.18)');
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(255,121,37,.32)';
        ctx.shadowBlur = 7;
      } else {
        ctx.fillStyle = '#1b232d';
        ctx.shadowBlur = 0;
      }
      roundedRect(ctx, x, y, barW, height, Math.min(4, barW / 2));
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.fillStyle = '#718094';
    ctx.font = '9px -apple-system,PingFang SC,sans-serif';
    ctx.textAlign = 'center';
    const step = count <= 12 ? 1 : 5;
    for (let i = 0; i < count; i += step) ctx.fillText(labels[i] || '', i * slot + slot / 2, h - 3);
    ctx.textAlign = 'left';
  }

  /* ---------- 周期数据 ---------- */
  function bucketize(period) {
    const records = readRecords();
    const now = new Date();
    if (period === 'week') {
      const from = startOfWeek(now);
      const labels = ['一', '二', '三', '四', '五', '六', '日'];
      const values = [0, 0, 0, 0, 0, 0, 0];
      records.filter((r) => inFrom(r, from)).forEach((r) => {
        const date = new Date(recTime(r));
        values[(date.getDay() + 6) % 7] += Number(r.distance);
      });
      return { labels, values, from, to: now };
    }
    if (period === 'month') {
      const from = startOfMonth(now);
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const labels = Array.from({ length: days }, (_, i) => String(i + 1));
      const values = Array(days).fill(0);
      records.filter((r) => inFrom(r, from)).forEach((r) => {
        const date = new Date(recTime(r));
        if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) values[date.getDate() - 1] += Number(r.distance);
      });
      return { labels, values, from, to: now };
    }
    const from = new Date(now.getFullYear(), 0, 1);
    from.setHours(0, 0, 0, 0);
    const labels = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const values = Array(12).fill(0);
    records.filter((r) => inFrom(r, from)).forEach((r) => {
      const date = new Date(recTime(r));
      if (date.getFullYear() === now.getFullYear()) values[date.getMonth()] += Number(r.distance);
    });
    return { labels, values, from, to: now };
  }

  function periodRecords(period) {
    const records = readRecords();
    const now = new Date();
    const from = period === 'week' ? startOfWeek(now) : period === 'month' ? startOfMonth(now) : new Date(now.getFullYear(), 0, 1);
    return records.filter((r) => inFrom(r, from));
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    const body = document.querySelector('#page-home .home-body');
    if (!body) return;
    let root = has('xHomeRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'xHomeRoot';
      body.appendChild(root);
    }
    const records = readRecords();
    const week = periodRecords('week');
    const month = periodRecords('month');
    const weekKm = sumBy(week, (r) => r.distance);
    const monthKm = sumBy(month, (r) => r.distance);
    const pct = Math.min(100, Math.round(weekKm / WEEK_TARGET * 100));
    const recent = records.slice().sort((a, b) => recTime(b) - recTime(a)).slice(0, 3);

    root.innerHTML =
      '<div class="x-sec-head"><h2>骑行概览</h2><button data-page="profile-records">查看数据 ›</button></div>' +
      '<div class="x-stat-row">' +
        '<div class="x-stat hi"><span>本周里程</span><b>' + num(weekKm) + '<small>km</small></b></div>' +
        '<div class="x-stat"><span>本月累计</span><b>' + num(monthKm) + '<small>km</small></b></div>' +
        '<div class="x-stat"><span>骑行次数</span><b>' + records.length + '<small>次</small></b></div>' +
      '</div>' +
      '<div class="x-block">' +
        '<div class="x-sec-head"><h2>本周挑战</h2><span class="x-pct">' + pct + '%</span></div>' +
        '<div class="x-card x-challenge"><b>「破风 100」周里程挑战</b>' +
          '<div class="x-bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="x-bar-meta"><span>' + num(weekKm) + ' km</span><span>目标 ' + WEEK_TARGET + ' km</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="x-block">' +
        '<div class="x-sec-head"><h2>最近骑行</h2><button data-page="profile-records">全部 ›</button></div>' +
        '<div class="x-recent" id="xRecentList"></div>' +
      '</div>';

    const list = has('xRecentList');
    if (recent.length) {
      list.innerHTML = recent.map((record) => {
        const date = new Date(recTime(record));
        const label = (date.getMonth() + 1) + '月' + date.getDate() + '日 · ' + (record.time || '');
        return '<div class="x-recent-row" data-record="' + record.id + '">' +
          '<canvas width="92" height="92" data-track="' + record.id + '"></canvas>' +
          '<div class="x-recent-info"><b>' + label + '</b><span>均速 ' + num(record.average) + ' km/h · ' + fmtClock(recDuration(record)) + '</span></div>' +
          '<div class="x-recent-km">' + num(record.distance) + '<small> km</small></div>' +
        '</div>';
      }).join('');
      list.querySelectorAll('canvas[data-track]').forEach((canvas) => {
        const record = records.find((item) => item.id === canvas.dataset.track);
        drawMiniRoute(canvas, record);
      });
    } else {
      list.innerHTML = '<div class="x-empty">还没有骑行记录，出发骑一圈吧</div>';
    }
  }

  function drawMiniRoute(canvas, record) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    let points = [];
    if (record && Array.isArray(record.track) && record.track.length > 2) {
      points = record.track
        .map((p) => Array.isArray(p) ? p : [p.lng, p.lat])
        .filter((p) => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])));
    }
    if (points.length > 2) {
      const lngs = points.map((p) => Number(p[0]));
      const lats = points.map((p) => Number(p[1]));
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const spanLng = maxLng - minLng || 1e-6;
      const spanLat = maxLat - minLat || 1e-6;
      ctx.strokeStyle = '#ff9544';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255,121,37,.55)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      points.forEach((p, index) => {
        const x = 8 + ((Number(p[0]) - minLng) / spanLng) * (w - 16);
        const y = h - 8 - ((Number(p[1]) - minLat) / spanLat) * (h - 16);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }
    let seed = 0;
    for (const char of String(record ? record.id : 'ride')) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    ctx.strokeStyle = '#ff9544';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,121,37,.55)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    let x = 12 + rnd() * 18, y = 18 + rnd() * 18;
    ctx.moveTo(x, y);
    for (let i = 0; i < 4; i += 1) {
      const nx = 12 + rnd() * 66, ny = 12 + rnd() * 66;
      ctx.quadraticCurveTo(x + (rnd() - .5) * 52, y + (rnd() - .5) * 52, nx, ny);
      x = nx; y = ny;
    }
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff9544';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 7);
    ctx.fill();
  }

  /* ---------- 数据统计页（骑行记录页顶部） ---------- */
  let statsPeriod = 'week';

  function renderRecordsPage() {
    const page = document.getElementById('page-profile-records');
    const host = page && page.querySelector('.profile-feature-content');
    if (!host) return;
    let root = has('xRecordsRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'xRecordsRoot';
      host.insertBefore(root, host.firstChild);
    }
    const data = bucketize(statsPeriod);
    const pool = periodRecords(statsPeriod);
    const totalKm = sumBy(pool, (r) => r.distance);
    const totalTime = sumBy(pool, (r) => recDuration(r));
    const totalClimb = sumBy(pool, (r) => r.ascent);
    const best = pool.length ? Math.max(...pool.map((r) => Number(r.distance))) : 0;
    const calories = Math.round(totalKm * 32);

    root.innerHTML =
      '<h2 class="x-sec-head" style="margin-top:4px"><span style="font-size:14px;font-weight:800">骑行数据</span>常用统计</h2>' +
      '<div class="x-seg x-seg-sm" id="xPeriodSeg">' +
        '<button data-period="week" class="' + (statsPeriod === 'week' ? 'on' : '') + '">本周</button>' +
        '<button data-period="month" class="' + (statsPeriod === 'month' ? 'on' : '') + '">本月</button>' +
        '<button data-period="year" class="' + (statsPeriod === 'year' ? 'on' : '') + '">全年</button>' +
      '</div>' +
      '<div class="x-card x-chart-card">' +
        '<div class="x-chart-top"><b>里程趋势</b><em>' + num(totalKm) + '<small>km</small></em></div>' +
        '<canvas id="xChart" width="320" height="158"></canvas>' +
        '<div class="x-legend"><span><i></i>骑行里程 km</span></div>' +
      '</div>' +
      '<div class="x-summary">' +
        '<div><b>' + pool.length + '<small>次</small></b><span>骑行次数</span></div>' +
        '<div><b>' + fmtClock(totalTime) + '</b><span>总时长</span></div>' +
        '<div><b>' + calories + '<small>kcal</small></b><span>总消耗 · 约 ' + num(calories / 7700, 1) + ' kg 脂肪</span></div>' +
        '<div><b>' + num(totalClimb, 0) + '<small>m</small></b><span>累计爬升 · 最长单次 ' + num(best) + ' km</span></div>' +
      '</div>' +
      '<h2 class="x-sec-head" style="margin:16px 2px 8px"><span style="font-size:14px;font-weight:800">历史记录</span><span style="font-size:11px;color:var(--muted)">共 ' + pool.length + ' 条</span></h2>' +
      '<div id="xHistoryList"></div>';

    drawBars(has('xChart'), data.labels, data.values);

    const history = pool.slice().sort((a, b) => recTime(b) - recTime(a)).slice(0, 20);
    has('xHistoryList').innerHTML = history.length ? history.map((record) => {
      const date = new Date(recTime(record));
      return '<div class="x-hist-row">' +
        '<div class="x-hist-date"><b>' + date.getDate() + '</b><span>' + (date.getMonth() + 1) + '月</span></div>' +
        '<div class="x-hist-mid"><b>' + ((record.time || '').slice(0, 5) || '骑行') + ' · 均速 ' + num(record.average) + '</b>' +
        '<span>' + fmtClock(recDuration(record)) + ' · ' + Math.round(Number(record.distance) * 32) + ' kcal · 爬升 ' + Math.round(Number(record.ascent) || 0) + ' m</span></div>' +
        '<div class="x-hist-km">' + num(record.distance) + '<small> km</small></div>' +
      '</div>';
    }).join('') : '<div class="x-empty">该周期还没有骑行记录</div>';

    const seg = has('xPeriodSeg');
    if (seg) {
      seg.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-period]');
        if (!button) return;
        statsPeriod = button.dataset.period;
        renderRecordsPage();
      });
    }
  }

  /* ---------- 社区：动态流 + 排行榜 ---------- */
  const feedItems = [
    {
      id: 'f1', name: '林晚风', level: 'LV.12', time: '今天 21:04', avatar: 'assets/15.jpg', photo: 'assets/02.jpg',
      distance: 52.4, average: 28.3, calories: 1580, likes: 46, comments: 12,
      text: '今晚绕西湖拉了 52km，最后 5 公里逆风顶到 35 巡航，痛快！<em>#夜骑西湖#</em>'
    },
    {
      id: 'f2', name: '老周头', level: 'LV.15', time: '今天 18:32', avatar: 'assets/14.jpg', photo: 'assets/12.jpg',
      distance: 88.1, average: 24.6, calories: 2900, likes: 89, comments: 23,
      text: '龙井爬坡局圆满完成，爬升 900 米，腿已经不是自己的了。<em>#爬坡不推车#</em>'
    },
    {
      id: 'f3', name: '苏子衿', level: 'LV.7', time: '昨天 07:15', avatar: 'assets/13.jpg', photo: 'assets/03.jpg',
      distance: 31.2, average: 22.1, calories: 990, likes: 34, comments: 8,
      text: '晨骑西溪湿地，秋天的芦花开了，一路都是风景。新手求带～'
    },
    {
      id: 'f4', name: '铁蛋', level: 'LV.9', time: '昨天 22:47', avatar: 'assets/16.jpg', photo: 'assets/11.jpg',
      distance: 40.0, average: 30.2, calories: 1320, likes: 67, comments: 15,
      text: '城市夜穿 40km，均速终于破 30！感谢云遥的实时配速提醒。<em>#均速30俱乐部#</em>'
    }
  ];
  const rankRiders = [
    { name: '林晚风', km: 186.4, avatar: 'assets/15.jpg' },
    { name: '老周头', km: 172.8, avatar: 'assets/14.jpg' },
    { name: '铁蛋', km: 155.2, avatar: 'assets/16.jpg' },
    { name: '苏子衿', km: 128.6, avatar: 'assets/13.jpg' },
    { name: '陆行舟', km: 118.3, avatar: 'assets/11.jpg' },
    { name: '追风大爷', km: 102.5, avatar: 'assets/12.jpg' }
  ];
  let socialTab = 'feed';

  function readLikes() {
    const list = readJSON(LIKE_KEY, []);
    return Array.isArray(list) ? new Set(list) : new Set();
  }
  function writeLikes(set) { localStorage.setItem(LIKE_KEY, JSON.stringify([...set])); }

  function renderDiscovery() {
    const body = document.querySelector('#page-discovery .discovery-body');
    if (!body) return;
    let root = has('xSocialRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'xSocialRoot';
      body.appendChild(root);
    }
    root.innerHTML =
      '<div class="x-seg" id="xSocialSeg">' +
        '<button data-tab="feed" class="' + (socialTab === 'feed' ? 'on' : '') + '">骑友动态</button>' +
        '<button data-tab="rank" class="' + (socialTab === 'rank' ? 'on' : '') + '">周排行榜</button>' +
      '</div>' +
      '<div id="xFeedBox"></div>' +
      '<div id="xRankBox" ' + (socialTab === 'rank' ? '' : 'hidden') + '></div>';

    root.querySelector('#xSocialSeg').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      socialTab = button.dataset.tab;
      renderDiscovery();
    });

    const likes = readLikes();
    const commentStore = readJSON('cloudRideFeedComments', {});
    has('xFeedBox').innerHTML = feedItems.map((item) => {
      const liked = likes.has(item.id);
      return '<article class="x-feed-card">' +
        '<header class="x-feed-head"><img src="' + item.avatar + '" alt="' + item.name + '"><div class="x-feed-who"><b>' + item.name + '</b><span>' + item.time + '</span></div><span class="x-feed-lv">' + item.level + '</span></header>' +
        '<img class="x-feed-photo" src="' + item.photo + '" alt="骑行照片" loading="lazy">' +
        '<div class="x-feed-nums">' +
          '<div><b>' + num(item.distance) + '</b><span>里程 km</span></div>' +
          '<div><b>' + num(item.average) + '</b><span>均速 km/h</span></div>' +
          '<div><b>' + item.calories + '</b><span>千卡</span></div>' +
        '</div>' +
        '<p class="x-feed-cap">' + item.text + '</p>' +
        '<div class="x-feed-act">' +
          '<button data-like="' + item.id + '" class="' + (liked ? 'liked' : '') + '">▲ 顶 <span>' + (item.likes + (liked ? 1 : 0)) + '</span></button>' +
          '<button data-comment="' + item.id + '">✎ 评论 <span>' + (item.comments + Number(commentStore[item.id] || 0)) + '</span></button>' +
          '<button data-share="' + item.id + '">↗ 分享</button>' +
        '</div>' +
      '</article>';
    }).join('');

    renderRank();
  }

  function renderRank() {
    const box = has('xRankBox');
    if (!box) return;
    const myName = (typeof currentAccount !== 'undefined' && currentAccount.name) ? currentAccount.name + '（我）' : '我';
    const myAvatar = (typeof profileInfo !== 'undefined' && profileInfo.avatar) ? profileInfo.avatar : 'assets/male-avatar.png';
    const myKm = sumBy(periodRecords('week'), (r) => r.distance);
    const list = rankRiders.map((r) => ({ ...r })).concat([{ name: myName, km: myKm, avatar: myAvatar, me: true }])
      .sort((a, b) => b.km - a.km);
    const top = list.slice(0, 3);
    const rest = list.slice(3);
    const podiumOrder = [top[1], top[0], top[2]].filter(Boolean);
    const classes = ['second', 'first', 'third'];
    box.innerHTML =
      '<div class="x-podium">' + podiumOrder.map((rider, index) => {
        const rankNo = [2, 1, 3][index];
        return '<div class="x-pod ' + classes[index] + '">' +
          '<img src="' + rider.avatar + '" alt="' + rider.name + '">' +
          '<div class="x-pod-name">' + rider.name + '</div>' +
          '<div class="x-pod-km">' + num(rider.km) + '<small>km</small></div>' +
          '<div class="x-pod-block">' + rankNo + '</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="x-card" style="padding:4px 12px">' + rest.map((rider, index) =>
        '<div class="x-rank-row ' + (rider.me ? 'me' : '') + '">' +
          '<span class="x-rank-no">' + (index + 4) + '</span>' +
          '<img src="' + rider.avatar + '" alt="' + rider.name + '">' +
          '<div class="x-rank-nm">' + rider.name + '<span>本周骑行 ' + num(rider.km) + ' km</span></div>' +
          '<div class="x-rank-km">' + num(rider.km) + '<small>km</small></div>' +
        '</div>').join('') + '</div>' +
      '<div class="x-rank-note">榜单每周一 0 点重置 · 你的本周里程实时取自云遥记录</div>';
  }

  /* ---------- 我的：月度目标 + 成就徽章 ---------- */
  const badges = [
    { name: '初行者', desc: '完成首骑', path: '<path d="M13 3 4 14h6l-1 7 9-11h-6z"/>', ok: (records) => records.length >= 1 },
    { name: '百公里', desc: '单次100km', path: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', ok: (records) => records.some((r) => Number(r.distance) >= 100) },
    { name: '夜猫子', desc: '夜骑10次', path: '<path d="M20 13A8 8 0 1 1 11 4a6.5 6.5 0 0 0 9 9z"/>', ok: (records) => records.filter((r) => { const h = Number(String(r.time || '0').slice(0, 2)); return h >= 18 || h < 6; }).length >= 10 },
    { name: '破风手', desc: '均速破30', path: '<path d="M3 12h13M10 6l6 6-6 6"/><path d="M18 6l3 6-3 6"/>', ok: (records) => records.some((r) => Number(r.average) >= 30) },
    { name: '爬坡王', desc: '累计爬升5000m', path: '<path d="M3 20 10 7l4 6 3-4 4 11z"/>', ok: (records) => sumBy(records, (r) => r.ascent) >= 5000 },
    { name: '千公里', desc: '累计1000km', path: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>', ok: (records) => sumBy(records, (r) => r.distance) >= 1000 },
    { name: '月度狂人', desc: '本月20次', path: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>', ok: (records) => periodRecords('month').length >= 20 },
    { name: '传奇', desc: '累计5000km', path: '<path d="m12 3 2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/>', ok: (records) => sumBy(records, (r) => r.distance) >= 5000 }
  ];

  function renderProfile() {
    const body = document.querySelector('#page-profile .profile-body');
    if (!body) return;
    let root = has('xProfileRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'xProfileRoot';
      const stats = body.querySelector('.profile-stats');
      if (stats && stats.parentNode) stats.parentNode.insertBefore(root, stats.nextSibling);
      else body.appendChild(root);
    }
    const records = readRecords();
    const monthKm = sumBy(periodRecords('month'), (r) => r.distance);
    const percent = Math.min(100, Math.round(monthKm / GOAL_KM * 100));

    root.innerHTML =
      '<div class="x-sec-head" style="margin-top:16px"><h2>月度目标</h2><button data-page="profile-medals">勋章墙 ›</button></div>' +
      '<div class="x-card x-goal-card">' +
        '<canvas id="xGoalRing" width="192" height="192"></canvas>' +
        '<div class="x-goal-info"><b>' + (new Date().getMonth() + 1) + ' 月 ' + GOAL_KM + ' km 计划</b>' +
          '<em>' + num(monthKm, 0) + '<small> / ' + GOAL_KM + ' km</small></em>' +
          '<p>' + (percent >= 100 ? '目标已达成，继续保持这份状态！' : '还差 ' + num(Math.max(0, GOAL_KM - monthKm), 0) + ' km 完成月度目标，保持每周一次长距离即可达成。') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="x-sec-head" style="margin-top:16px"><h2>成就徽章</h2><span style="font-size:11px;color:var(--muted)">已解锁 ' + badges.filter((b) => b.ok(records)).length + ' / ' + badges.length + '</span></div>' +
      '<div class="x-badge-grid" id="xBadgeGrid"></div>';

    drawGoalRing(has('xGoalRing'), monthKm / GOAL_KM);
    has('xBadgeGrid').innerHTML = badges.map((badge) => {
      const unlocked = badge.ok(records);
      return '<div class="x-badge ' + (unlocked ? '' : 'lock') + '" data-badge="' + badge.name + '" title="' + badge.name + ' · ' + badge.desc + '">' +
        '<i><svg viewBox="0 0 24 24">' + badge.path + '</svg></i>' +
        '<b>' + badge.name + '</b><span>' + badge.desc + '</span></div>';
    }).join('');
  }

  function drawGoalRing(canvas, ratio) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth || 96;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const center = size / 2;
    const radius = size / 2 - 8;
    const value = Math.max(0, Math.min(1, ratio || 0));
    ctx.lineWidth = size / 12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1b242e';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (value > 0) {
      ctx.strokeStyle = '#ff7925';
      ctx.shadowColor = 'rgba(255,121,37,.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + value * Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#f4f6f9';
    ctx.font = '800 ' + Math.round(size / 4.4) + 'px -apple-system,PingFang SC,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(value * 100) + '%', center, center - size / 22);
    ctx.fillStyle = '#718094';
    ctx.font = Math.round(size / 9.5) + 'px -apple-system,PingFang SC,sans-serif';
    ctx.fillText('已完成', center, center + size / 6);
  }

  /* ---------- 报告页：补全消耗卡路里 ---------- */
  function patchReport() {
    const calories = has('reportCalories');
    const distance = has('reportDistance');
    if (!calories || !distance) return;
    const km = Number(distance.textContent) || 0;
    calories.textContent = Math.round(km * 32) + ' kcal';
    const climb = document.querySelector('#page-report .report-grid div:nth-child(1) b');
    if (climb && !climb.dataset.patched) {
      const ascent = (typeof state !== 'undefined' && Number(state.totalAscent)) ? Number(state.totalAscent) : Math.round(km * 8);
      climb.innerHTML = Math.round(ascent) + ' <em>m</em>';
      climb.dataset.patched = '1';
    }
  }

  /* ---------- 事件绑定 ---------- */
  function bindDelegates() {
    document.addEventListener('click', (event) => {
      const like = event.target.closest('[data-like]');
      if (like) {
        const set = readLikes();
        const id = like.dataset.like;
        if (set.has(id)) { set.delete(id); } else { set.add(id); }
        writeLikes(set);
        renderDiscovery();
        return;
      }
      const comment = event.target.closest('[data-comment]');
      if (comment) {
        const store = readJSON('cloudRideFeedComments', {});
        const id = comment.dataset.comment;
        store[id] = Number(store[id] || 0) + 1;
        localStorage.setItem('cloudRideFeedComments', JSON.stringify(store));
        renderDiscovery();
        if (typeof showToast === 'function') showToast('评论成功：太强了，带带我！');
        return;
      }
      const share = event.target.closest('[data-share]');
      if (share) {
        if (typeof showToast === 'function') showToast('已分享给骑友');
        return;
      }
      const badge = event.target.closest('[data-badge]');
      if (badge) {
        const item = badges.find((b) => b.name === badge.dataset.badge);
        if (item && typeof showToast === 'function') {
          showToast(item.name + ' · ' + item.desc + (item.ok(readRecords()) ? ' · 已解锁' : ' · 未解锁'));
        }
        return;
      }
      const recordRow = event.target.closest('[data-record]');
      if (recordRow) {
        const record = readRecords().find((r) => r.id === recordRow.dataset.record);
        if (record && typeof showToast === 'function') {
          showToast((record.date || '') + ' · ' + num(record.distance) + ' km · 均速 ' + num(record.average));
        }
      }
    });
  }

  /* ---------- 页面分发 ---------- */
  function renderPage(id) {
    if (id === 'home') renderHome();
    if (id === 'discovery') renderDiscovery();
    if (id === 'profile') renderProfile();
    if (id === 'profile-records') renderRecordsPage();
    if (id === 'report') patchReport();
  }

  function boot() {
    if (typeof window.showPage === 'function' && !window.showPage.__xPorted) {
      const baseShowPage = window.showPage;
      const wrapped = function (id) {
        baseShowPage(id);
        try { renderPage(id); } catch (error) { console.error('[云遥扩展]', error); }
      };
      wrapped.__xPorted = true;
      window.showPage = wrapped;
    }
    bindDelegates();
    const current = (typeof state !== 'undefined' && state.page) ? state.page : null;
    if (current) { try { renderPage(current); } catch (error) { console.error('[云遥扩展]', error); } }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
