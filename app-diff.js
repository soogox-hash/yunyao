/* 云遥 · 差异化能力模块（训练解读 / 体能仪表盘 / 同路段 PK / 个人纪录墙）
 * 依据《骑行App产品方案》：不做好友广场与排行榜为核心，做"骑完就懂"的个体训练解读。
 * 依赖 app-ui.js 的全局状态与 localStorage，沿用深色 + 橙色主题，不使用绿色。 */
(function () {
  'use strict';

  const REC_KEY = 'cloudRideHistoryRecords';
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const has = (id) => document.getElementById(id);

  /* ---------------- 基础读取 ---------------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const value = JSON.parse(raw);
      return value == null ? fallback : value;
    } catch (error) { return fallback; }
  }

  function records() {
    const list = readJSON(REC_KEY, []);
    if (!Array.isArray(list)) return [];
    return list.filter((r) => r && Number.isFinite(Number(r.distance)) && Number(r.distance) > 0);
  }

  function parseClock(value) {
    if (Number.isFinite(Number(value))) return Number(value);
    if (typeof value !== 'string') return 0;
    const parts = value.split(':').map(Number);
    if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0;
    return parts.reduce((total, part, index) => total + part * Math.pow(60, parts.length - 1 - index), 0);
  }

  function secondsOf(record) {
    const value = Number(record.durationSeconds);
    if (Number.isFinite(value) && value > 0) return value;
    return parseClock(record.duration);
  }

  function kmOf(record) { return Number(record.distance) || 0; }

  function avgOf(record) {
    const avg = Number(record.average);
    if (Number.isFinite(avg) && avg > 0) return avg;
    const sec = secondsOf(record);
    return sec > 0 ? kmOf(record) / (sec / 3600) : 0;
  }

  function ascentOf(record) { return Math.max(0, Number(record.ascent) || 0); }

  function dateOf(record) {
    const source = record.createdAt || (record.date ? record.date + 'T12:00:00' : '');
    const date = source ? new Date(source) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }

  function formatClock(total) {
    const sec = Math.max(0, Math.round(Number(total) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (v) => String(v).padStart(2, '0');
    return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }

  function formatDelta(seconds) {
    if (!Number.isFinite(seconds) || seconds === 0) return '持平';
    const abs = Math.abs(Math.round(seconds));
    return (seconds > 0 ? '慢 ' : '快 ') + formatClock(abs);
  }

  function sign(value, digits) {
    const n = Number(value) || 0;
    return (n > 0 ? '+' : '') + n.toFixed(digits);
  }

  /* ---------------- 训练引擎：功率 / NP / IF / TSS 估算 ---------------- */
  function context() {
    let weight = 70, ftp = 0, maxHeartRate = 0;
    try {
      if (typeof profileInfo !== 'undefined' && profileInfo) {
        weight = Number(profileInfo.weight) || 70;
        ftp = Number(profileInfo.ftp) || 0;
        maxHeartRate = Number(profileInfo.maxHeartRate) || 0;
      }
    } catch (error) {}
    const mass = weight + 9;
    return {
      weight: weight, mass: mass,
      ftp: ftp || Math.max(120, Math.round(weight * 3.2)),
      maxHeartRate: maxHeartRate || Math.round(190 - weight * 0.2)
    };
  }

  function zoneWeights(ifValue, grade, surge) {
    let w;
    if (ifValue < 0.7) w = [0.30, 0.46, 0.17, 0.05, 0.02];
    else if (ifValue < 0.8) w = [0.16, 0.42, 0.28, 0.11, 0.03];
    else if (ifValue < 0.9) w = [0.09, 0.30, 0.33, 0.22, 0.06];
    else w = [0.05, 0.22, 0.30, 0.27, 0.16];
    if (grade > 0.02) { w[2] += 0.10; w[3] += 0.06; w[0] -= 0.05; w[1] -= 0.07; }
    if (surge > 1.4) { w[4] += 0.06; w[1] -= 0.04; w[0] -= 0.02; }
    const total = w.reduce((sum, item) => sum + Math.max(0, item), 0) || 1;
    return w.map((item) => Math.max(0, item) / total);
  }

  function analyze(record, ctx) {
    const km = kmOf(record);
    const sec = Math.max(1, secondsOf(record));
    const hours = sec / 3600;
    const avg = avgOf(record);
    const v = avg / 3.6;
    const ascent = ascentOf(record);
    const grade = km > 0 ? clamp(ascent / (km * 1000), 0, 0.15) : 0;

    // 物理模型估算功率：滚阻 + 坡度 + 风阻（无功率计时也能算负荷）
    const rolling = ctx.mass * 9.8 * v * (0.005 + grade);
    const aero = 0.5 * 1.225 * 0.32 * v * v * v;
    const power = clamp(rolling + aero, 20, 700);

    const maxSpeed = Number(record.maxSpeed) || avg * 1.25;
    const surge = avg > 0 ? maxSpeed / avg : 1;
    const variability = clamp(1 + Math.max(0, surge - 1) * 0.28 + (grade > 0.02 ? 0.03 : 0), 1.02, 1.3);
    const np = power * variability;
    const ifValue = np / ctx.ftp;
    const tss = (sec * np * ifValue) / ((ctx.ftp || 200) * 3600) * 100;
    const zones = zoneWeights(ifValue, grade, surge);
    const vam = hours > 0 ? ascent / hours : 0;

    return {
      record: record, km: km, sec: sec, hours: hours, avg: avg, ascent: ascent,
      grade: grade, power: power, np: np, ifValue: ifValue, tss: tss,
      zones: zones, vam: vam, ftp: ctx.ftp, surge: surge
    };
  }

  function trainingType(a) {
    if (a.km < 8 && a.tss < 25) return '恢复溜腿';
    if (a.ifValue < 0.68) return '轻松有氧骑';
    if (a.ifValue < 0.78) return '有氧耐力骑';
    if (a.ifValue < 0.88) return '节奏骑';
    if (a.ifValue < 0.96) return '阈值训练';
    return '高强度间歇';
  }

  function verdict(a, tsbAfter) {
    let sentence;
    if (a.tss < 25) sentence = '负荷很轻，作用主要是促进恢复和保持骑行习惯。';
    else if (a.tss < 55) sentence = '一次干净的有氧刺激，能稳住基础耐力，几乎不影响明天的状态。';
    else if (a.tss < 90) sentence = '负荷适中偏上，对耐力是明确的正向推动，今晚补碳水和睡眠就能吸收。';
    else if (a.tss < 130) sentence = '这是一次高质量训练，身体需要 24–48 小时来消化，明天不要再堆强度。';
    else sentence = '高负荷的一天，接下来两天请主动恢复，否则后面很难练出质量。';

    let advice;
    if (tsbAfter < -22) advice = '明天休息或 30 分钟溜腿，不要安排爬坡和阈值。';
    else if (tsbAfter < -8) advice = '明天轻松骑 45 分钟，心率压在 Z2 以下。';
    else if (tsbAfter < 8) advice = '明天可安排 60–90 分钟节奏骑，保持踏频稳定。';
    else advice = '状态很新鲜，明天适合一次质量课（阈值或爬坡）。';

    const tags = [];
    tags.push(a.ifValue < 0.8 ? '有氧为主' : a.ifValue < 0.92 ? '节奏刺激' : '高强刺激');
    tags.push(a.tss < 55 ? '负荷偏轻' : a.tss < 100 ? '负荷适中' : '负荷偏高');
    tags.push(tsbAfter < -15 ? '优先恢复' : tsbAfter > 8 ? '可以加码' : '正常推进');
    return { sentence: sentence, advice: advice, tags: tags };
  }

  /* ---------------- 分段与后程掉速 ---------------- */
  function haversine(a, b) {
    const R = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function splitSpeeds(record) {
    const track = Array.isArray(record.track) ? record.track : [];
    const points = [];
    track.forEach((p) => {
      if (Array.isArray(p)) {
        const lng = Number(p[0]), lat = Number(p[1]);
        if (Number.isFinite(lng) && Number.isFinite(lat)) points.push({ lat: lat, lng: lng, t: 0 });
        return;
      }
      if (!p) return;
      const lat = Number(p.latitude), lng = Number(p.longitude), t = Number(p.timestamp);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(t)) points.push({ lat: lat, lng: lng, t: t });
    });
    if (points.length < 8 || !points.every((p) => p.t > 0)) return null;

    let total = 0;
    const cum = [0];
    for (let i = 1; i < points.length; i += 1) {
      total += haversine(points[i - 1], points[i]);
      cum.push(total);
    }
    if (total < 500) return null;
    const totalTime = (points[points.length - 1].t - points[0].t) / 1000;
    if (totalTime <= 0) return null;

    let mid = 1;
    while (mid < points.length && cum[mid] < total / 2) mid += 1;
    const timeMid = (points[mid].t - points[0].t) / 1000;
    if (timeMid <= 0 || totalTime - timeMid <= 0) return null;

    const first = (cum[mid] / timeMid) * 3.6;
    const second = ((total - cum[mid]) / (totalTime - timeMid)) * 3.6;
    if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0) return null;
    return { first: first, second: second, drift: (second - first) / first * 100 };
  }

  /* ---------------- 体能负荷模型 CTL / ATL / TSB ---------------- */
  function buildPmc(ctx) {
    const list = records();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const span = 210;
    const start = new Date(today);
    start.setDate(start.getDate() - (span - 1));

    const daily = new Map();
    list.forEach((record) => {
      const date = dateOf(record);
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      if (date < start || date > today) return;
      const key = date.toDateString();
      daily.set(key, (daily.get(key) || 0) + analyze(record, ctx).tss);
    });

    let ctl = 0, atl = 0;
    const series = [];
    for (let i = span - 1; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const tss = daily.get(day.toDateString()) || 0;
      ctl += (tss - ctl) / 42;
      atl += (tss - atl) / 7;
      if (i <= 59) series.push({ date: day, ctl: ctl, atl: atl, tsb: ctl - atl, tss: tss });
    }

    let weekTss = 0, prevWeekTss = 0, weekCount = 0, weekSeconds = 0;
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      weekTss += daily.get(day.toDateString()) || 0;
    }
    for (let i = 7; i < 14; i += 1) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      prevWeekTss += daily.get(day.toDateString()) || 0;
    }
    list.forEach((record) => {
      const date = dateOf(record);
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      const diff = (today - date) / 86400000;
      if (diff >= 0 && diff < 7) { weekCount += 1; weekSeconds += secondsOf(record); }
    });

    return {
      ctl: ctl, atl: atl, tsb: ctl - atl, series: series,
      weekTss: weekTss, prevWeekTss: prevWeekTss, weekCount: weekCount,
      weekSeconds: weekSeconds
    };
  }

  function readiness(tsb) {
    if (tsb >= 15) return { key: 'peak', label: '状态巅峰', advice: '身体油量充足，适合安排一次质量课（阈值或爬坡）。', color: '#ff7925' };
    if (tsb >= 5) return { key: 'fresh', label: '状态良好', advice: '可以正常训练，想突破就安排节奏骑或短爬坡。', color: '#ff9a4d' };
    if (tsb >= -8) return { key: 'normal', label: '正常训练', advice: '负荷与恢复基本平衡，按计划训练即可。', color: '#4aa8ff' };
    if (tsb >= -20) return { key: 'tired', label: '有些疲劳', advice: '今天别再堆强度，轻松骑或干脆休息。', color: '#ffb066' };
    return { key: 'over', label: '负荷透支', advice: '连续高负荷，优先睡眠和补给，至少休息一天。', color: '#ff4d4f' };
  }

  function fuelPercent(tsb) { return Math.round(clamp((tsb + 35) / 55 * 100, 5, 100)); }

  /* ---------------- 首页：今日身体状态 ---------------- */
  function renderHome() {
    const body = document.querySelector('#page-home .home-body');
    if (!body) return;
    const ctx = context();
    const pmc = buildPmc(ctx);
    const stateInfo = readiness(pmc.tsb);
    let root = has('dHomeRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'dHomeRoot';
      const homeRoot = has('xHomeRoot');
      if (homeRoot && homeRoot.parentNode === body) body.insertBefore(root, homeRoot);
      else body.appendChild(root);
    }

    const list = records().sort((a, b) => (dateOf(b) || 0) - (dateOf(a) || 0));
    const last = list[0];
    const lastDays = last && dateOf(last) ? Math.floor((new Date().setHours(0, 0, 0, 0) - dateOf(last).setHours(0, 0, 0, 0)) / 86400000) : -1;

    root.innerHTML =
      '<div class="d-card d-ready-card">' +
        '<div class="d-ready-head"><span>今日身体状态 · TSB</span><b style="color:' + stateInfo.color + '">' + stateInfo.label + '</b></div>' +
        '<div class="d-fuel"><i style="width:' + fuelPercent(pmc.tsb) + '%;background:linear-gradient(90deg,#b34d12,' + stateInfo.color + ')"></i></div>' +
        '<div class="d-fuel-meta"><span>身体油量 ' + fuelPercent(pmc.tsb) + '%</span><span>CTL ' + Math.round(pmc.ctl) + ' · ATL ' + Math.round(pmc.atl) + ' · TSB ' + Math.round(pmc.tsb) + '</span></div>' +
        '<p class="d-ready-advice">' + stateInfo.advice + '</p>' +
        '<div class="d-ready-foot"><span>' + (last ? '最近一次：' + (lastDays <= 0 ? '今天' : lastDays + ' 天前') + ' · ' + kmOf(last).toFixed(1) + ' km' : '还没有骑行记录，开始第一趟吧') + '</span><button data-page="profile-ability">体能趋势 ›</button></div>' +
      '</div>';
  }

  /* ---------------- 骑行报告：人话解读 ---------------- */
  function reportRecord() {
    const list = records().sort((a, b) => (dateOf(b) || 0) - (dateOf(a) || 0));
    if (list.length) return list[0];
    const km = Number((has('reportDistance') || {}).textContent) || 0;
    if (!km) return null;
    const duration = (has('reportDuration') || {}).textContent || '0:00:00';
    return {
      distance: km,
      duration: duration,
      durationSeconds: parseClock(duration),
      average: Number(String((has('reportAverage') || {}).textContent || '').replace(/[^\d.]/g, '')) || 0,
      maxSpeed: (typeof state !== 'undefined' && state.maxSpeed) ? state.maxSpeed : 0,
      ascent: (typeof state !== 'undefined' && state.totalAscent) ? state.totalAscent : 0,
      track: (typeof state !== 'undefined' && Array.isArray(state.rideTrack)) ? state.rideTrack : []
    };
  }

  function zoneLegend(zones) {
    const names = [['Z1', '恢复'], ['Z2', '耐力'], ['Z3', '节奏'], ['Z4', '阈值'], ['Z5', '无氧']];
    const colors = ['#3b4654', '#4aa8ff', '#ffb066', '#ff7925', '#ff4d4f'];
    let rest = 100, html = '', bar = '';
    zones.forEach((ratio, index) => {
      const pct = index === zones.length - 1 ? rest : Math.round(ratio * 100);
      rest -= pct;
      bar += '<i style="width:' + Math.max(0, pct) + '%;background:' + colors[index] + '"></i>';
      html += '<div><i style="background:' + colors[index] + '"></i><b>' + names[index][0] + ' ' + names[index][1] + '</b><span>' + Math.max(0, pct) + '%</span></div>';
    });
    return { bar: bar, legend: html };
  }

  function renderReport() {
    const content = document.querySelector('#page-report .report-content');
    if (!content) return;
    const record = reportRecord();
    if (!record) return;

    const ctx = context();
    const a = analyze(record, ctx);
    const split = splitSpeeds(record);
    const pmc = buildPmc(ctx);
    const v = verdict(a, pmc.tsb);
    const type = trainingType(a);
    const z = zoneLegend(a.zones);

    let block = has('dHumanReport');
    if (!block) {
      block = document.createElement('div');
      block.id = 'dHumanReport';
      const anchor = content.querySelector('.report-section-title');
      if (anchor) content.insertBefore(block, anchor); else content.appendChild(block);
    }

    const splitRow = split
      ? '<div><span>前半程 / 后半程</span><b>' + split.first.toFixed(1) + ' → ' + split.second.toFixed(1) + ' <small>km/h</small></b><em class="' + (split.drift < -3 ? 'down' : 'up') + '">' + sign(split.drift, 1) + '%</em></div>'
      : '<div><span>前半程 / 后半程</span><b>本次无分段轨迹</b><em>—</em></div>';

    block.innerHTML =
      '<div class="d-verdict">' +
        '<small>骑完就懂 · 训练解读</small>' +
        '<h2>今天是一次 <span>' + type + '</span></h2>' +
        '<p>共 ' + a.km.toFixed(1) + ' km / ' + formatClock(a.sec) + '，训练负荷 <b>TSS ' + Math.round(a.tss) + '</b>，强度 <b>IF ' + a.ifValue.toFixed(2) + '</b>。</p>' +
        '<div class="d-tags">' + v.tags.map((tag) => '<span>' + tag + '</span>').join('') + '</div>' +
      '</div>' +
      '<div class="d-zone-card">' +
        '<div class="d-zone-head"><b>强度结构</b><span>按估算功率划分 · 无功率计也能看</span></div>' +
        '<div class="d-zone-bar">' + z.bar + '</div>' +
        '<div class="d-zone-legend">' + z.legend + '</div>' +
      '</div>' +
      '<div class="d-kv3">' +
        '<div><b>' + a.ifValue.toFixed(2) + '</b><small>强度系数 IF</small></div>' +
        '<div><b>' + Math.round(a.tss) + '</b><small>训练负荷 TSS</small></div>' +
        '<div><b>' + Math.round(a.np) + '<em>W</em></b><small>标准化功率 NP · 估算</small></div>' +
      '</div>' +
      '<div class="d-insight-list">' +
        splitRow +
        '<div><span>爬升效率 VAM</span><b>' + Math.round(a.vam) + ' <small>m/h</small></b><em>' + (a.vam > 600 ? '偏强' : a.vam > 300 ? '正常' : a.km < 20 ? '路段平缓' : '偏弱') + '</em></div>' +
        '<div><span>训练结论</span><b>' + v.sentence + '</b></div>' +
        '<div><span>明天建议</span><b>' + v.advice + '</b></div>' +
      '</div>' +
      '<button class="d-link" data-page="profile-ability">查看 42 天体能趋势 ›</button>' +
      '<small class="d-disclaimer">功率与区间为模型估算（速度 + 爬升 + 体重），用于判断负荷与强度；接入功率计后自动采用实测数据。云遥不把你和别人比，只和你的过去比。</small>';
  }

  /* ---------------- 我的：体能仪表盘 ---------------- */
  function drawPmc(canvas, series) {
    if (!canvas || !series.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 172;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bandH = 30;
    const plotBottom = h - bandH - 16;
    const top = 10;
    const maxValue = Math.max(20, ...series.map((s) => Math.max(s.ctl, s.atl)));

    ctx.strokeStyle = 'rgba(37,45,55,.85)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i += 1) {
      const y = top + (plotBottom - top) * i / 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const xAt = (index) => index / (series.length - 1) * w;
    const yAt = (value) => plotBottom - (value / maxValue) * (plotBottom - top);

    // CTL 体能曲线：橙色面积
    ctx.beginPath();
    series.forEach((point, index) => {
      const x = xAt(index), y = yAt(point.ctl);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, plotBottom);
    ctx.lineTo(0, plotBottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, top, 0, plotBottom);
    gradient.addColorStop(0, 'rgba(255,121,37,.45)');
    gradient.addColorStop(1, 'rgba(255,121,37,.04)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#ff7925';
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((point, index) => {
      const x = xAt(index), y = yAt(point.ctl);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // ATL 疲劳曲线：蓝色
    ctx.strokeStyle = '#4aa8ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    series.forEach((point, index) => {
      const x = xAt(index), y = yAt(point.atl);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // TSB 状态柱：正橙负红
    const zero = plotBottom + bandH / 2 + 2;
    const maxAbs = Math.max(10, ...series.map((s) => Math.abs(s.tsb)));
    const slot = w / series.length;
    series.forEach((point, index) => {
      const height = Math.abs(point.tsb) / maxAbs * (bandH / 2 - 1);
      ctx.fillStyle = point.tsb >= 0 ? '#ff9a4d' : 'rgba(255,77,79,.75)';
      ctx.fillRect(index * slot + slot * 0.2, point.tsb >= 0 ? zero - height : zero, Math.max(1.5, slot * 0.6), height);
    });
    ctx.strokeStyle = 'rgba(113,128,148,.4)';
    ctx.beginPath();
    ctx.moveTo(0, zero);
    ctx.lineTo(w, zero);
    ctx.stroke();

    ctx.fillStyle = '#718094';
    ctx.font = '9px -apple-system,PingFang SC,sans-serif';
    ctx.fillText((series[0].date.getMonth() + 1) + '/' + series[0].date.getDate(), 2, h - 2);
    ctx.textAlign = 'right';
    const last = series[series.length - 1];
    ctx.fillText((last.date.getMonth() + 1) + '/' + last.date.getDate(), w - 2, h - 2);
    ctx.textAlign = 'left';
  }

  function renderAbility() {
    const page = document.getElementById('page-profile-ability');
    const host = page && page.querySelector('.profile-feature-content');
    if (!host) return;
    const ctx = context();
    const pmc = buildPmc(ctx);
    const info = readiness(pmc.tsb);
    const weekHours = pmc.weekSeconds / 3600;
    const weekDelta = pmc.weekTss - pmc.prevWeekTss;

    host.innerHTML =
      '<div class="d-card d-pmc-hero">' +
        '<div class="d-ready-head"><span>今日身体状态 · TSB ' + Math.round(pmc.tsb) + '</span><b style="color:' + info.color + '">' + info.label + '</b></div>' +
        '<div class="d-pmc-nums">' +
          '<div><b>' + Math.round(pmc.ctl) + '</b><small>CTL 长期体能</small></div>' +
          '<div><b>' + Math.round(pmc.atl) + '</b><small>ATL 短期疲劳</small></div>' +
          '<div><b>' + Math.round(pmc.tsb) + '</b><small>TSB 状态</small></div>' +
        '</div>' +
        '<div class="d-fuel"><i style="width:' + fuelPercent(pmc.tsb) + '%;background:linear-gradient(90deg,#b34d12,' + info.color + ')"></i></div>' +
        '<div class="d-fuel-meta"><span>身体油量 ' + fuelPercent(pmc.tsb) + '%</span><span>' + (pmc.weekCount ? '本周已骑 ' + pmc.weekCount + ' 次' : '本周还没骑') + '</span></div>' +
        '<p class="d-ready-advice">' + info.advice + '</p>' +
      '</div>' +
      '<div class="d-card d-pmc-chart">' +
        '<div class="d-zone-head"><b>体能趋势 · 最近 42 天</b><span>CTL / ATL / TSB</span></div>' +
        '<canvas id="dPmcChart" width="320" height="172"></canvas>' +
        '<div class="d-legend"><span><i class="ctl"></i>CTL 体能</span><span><i class="atl"></i>ATL 疲劳</span><span><i class="tsb"></i>TSB 状态</span></div>' +
      '</div>' +
      '<div class="d-card">' +
        '<div class="d-zone-head"><b>本周训练账本</b><span>' + (pmc.weekCount ? '已记录 ' + pmc.weekCount + ' 次' : '暂无') + '</span></div>' +
        '<div class="d-kv3 d-kv3-tight">' +
          '<div><b>' + Math.round(pmc.weekTss) + '</b><small>7 天负荷 TSS</small></div>' +
          '<div><b>' + weekHours.toFixed(1) + '<em>h</em></b><small>本周骑行时长</small></div>' +
          '<div><b class="' + (weekDelta > 0 ? 'up' : 'down') + '">' + sign(weekDelta, 0) + '</b><small>较上周负荷变化</small></div>' +
        '</div>' +
      '</div>' +
      '<div class="d-card d-plan-card">' +
        '<div class="d-zone-head"><b>接下来怎么练</b><span>按你的状态自动生成</span></div>' +
        '<div class="d-plan-row"><em>今天</em><span>' + info.advice + '</span></div>' +
        '<div class="d-plan-row"><em>本周</em><span>' + (pmc.tsb < -10 ? '先恢复再上强度，目标负荷比上周低 20%。' : '保持 2 次有氧 + 1 次质量课，负荷比上周提升不超过 10%。') + '</span></div>' +
        '<div class="d-plan-row"><em>长期</em><span>CTL 每周增长控制在 3–5 点，涨得快不如涨得稳。</span></div>' +
      '</div>' +
      '<div class="d-card d-param-card">' +
        '<div class="d-zone-head"><b>计算参数</b><span>估算依据</span></div>' +
        '<div class="d-param-grid">' +
          '<div><span>体重</span><b>' + ctx.weight.toFixed(0) + ' kg</b></div>' +
          '<div><span>FTP</span><b>' + ctx.ftp + ' W' + (ctx.ftp === Math.round(ctx.weight * 3.2) ? ' · 估算' : '') + '</b></div>' +
          '<div><span>最大心率</span><b>' + ctx.maxHeartRate + ' bpm</b></div>' +
        '</div>' +
        '<button class="d-link" data-page="personal-home">完善体重 / FTP / 最大心率 ›</button>' +
      '</div>' +
      '<div class="d-moat">' +
        '<b>为什么云遥不一样</b>' +
        '<div><span>不用功率计</span>速度 + 爬升 + 体重估算负荷，人人可用</div>' +
        '<div><span>骑完就懂</span>每条记录都有一句人话结论和明天该怎么做</div>' +
        '<div><span>只和自己比</span>不做点赞广场，只做同路段历史 PK 与个人纪录</div>' +
      '</div>';

    drawPmc(has('dPmcChart'), pmc.series);
  }

  /* ---------------- 骑行记录：同路段 PK + 个人纪录墙 ---------------- */
  function renderRoutePk() {
    const page = document.getElementById('page-profile-records');
    const host = page && page.querySelector('.profile-feature-content');
    if (!host) return;
    const xRoot = has('xRecordsRoot');
    let root = has('dRecordsRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'dRecordsRoot';
      if (xRoot && xRoot.parentNode === host) host.insertBefore(root, xRoot.nextSibling);
      else host.appendChild(root);
    }

    const list = records().slice().sort((a, b) => (dateOf(b) || 0) - (dateOf(a) || 0));
    if (list.length < 2) {
      root.innerHTML = '<div class="d-card"><div class="d-zone-head"><b>同路段 PK</b><span>需要至少 2 条记录</span></div><p class="d-empty">再完成一次骑行，就能把同一条路和过去的自己对比。</p></div>';
      return;
    }

    // 先按"同路段"分组：里程 5 km 档 + 爬升 100 m 档
    const groups = new Map();
    list.forEach((record) => {
      const km = kmOf(record), ascent = ascentOf(record);
      const key = Math.round(km / 5) * 5 + '_' + Math.round(ascent / 100);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });
    let pool = null, label = '';
    const repeated = [...groups.values()].filter((group) => group.length >= 2).sort((a, b) => b.length - a.length);
    if (repeated.length) {
      pool = repeated[0];
      const km = kmOf(pool[0]);
      label = '同路段 · 约 ' + Math.round(km / 5) * 5 + ' km / 爬升 ' + Math.round(ascentOf(pool[0]) / 100) * 100 + ' m';
    } else {
      const latest = list[0];
      const base = kmOf(latest);
      pool = list.filter((record) => Math.abs(kmOf(record) - base) <= Math.max(2, base * 0.15)).slice(0, 5);
      label = '同里程段 · 约 ' + base.toFixed(0) + ' km（±15%）';
    }

    const best = pool.reduce((winner, record) => (!winner || avgOf(record) > avgOf(winner)) ? record : winner, null);
    const latest = list[0];
    const bestSec = secondsOf(best), latestSec = secondsOf(latest);
    const bestAvg = avgOf(best), latestAvg = avgOf(latest);
    const split = splitSpeeds(latest);
    const timeDelta = latestSec - bestSec;
    const avgDelta = latestAvg - bestAvg;
    const bestDate = dateOf(best), latestDate = dateOf(latest);

    function row(name, record, mark) {
      const date = dateOf(record);
      const splitInfo = mark === '最近一次' && split ? ' · 后程 ' + sign(split.drift, 1) + '%' : '';
      return '<div class="d-pk-row' + (mark === '个人最佳' ? ' best' : '') + '">' +
        '<span>' + mark + '<small>' + (date ? (date.getMonth() + 1) + '月' + date.getDate() + '日' : '') + '</small></span>' +
        '<b>' + formatClock(secondsOf(record)) + '</b>' +
        '<em>' + avgOf(record).toFixed(1) + ' km/h · ' + kmOf(record).toFixed(1) + ' km' + splitInfo + '</em></div>';
    }

    root.innerHTML =
      '<div class="d-card d-pk-card">' +
        '<div class="d-zone-head"><b>同路段 PK</b><span>' + label + '</span></div>' +
        row('个人最佳', best, '个人最佳') +
        row('最近一次', latest, '最近一次') +
        '<div class="d-pk-delta">' +
          '<span class="' + (timeDelta > 0 ? 'down' : 'up') + '">' + formatDelta(timeDelta) + '</span>' +
          '<span class="' + (avgDelta > 0 ? 'up' : 'down') + '">均速 ' + sign(avgDelta, 1) + ' km/h</span>' +
          '<span>爬升 ' + Math.round(ascentOf(latest)) + ' / ' + Math.round(ascentOf(best)) + ' m</span>' +
        '</div>' +
        '<small class="d-note">' + (repeated.length ? '同一路段内只和你自己的历史成绩比，实时更新个人最佳。' : '暂无完全重复的路段，先按相近里程对比；再骑一次同一条路即可进入同路段 PK。') + '</small>' +
      '</div>' +
      '<div class="d-card d-pr-card">' +
        '<div class="d-zone-head"><b>个人纪录墙</b><span>' + list.length + ' 条记录</span></div>' +
        '<div class="d-pr-grid">' + renderPrItems(list) + '</div>' +
      '</div>';
  }

  function renderPrItems(list) {
    const longest = list.reduce((best, r) => (!best || kmOf(r) > kmOf(best)) ? r : best, null);
    const climb = list.reduce((best, r) => (!best || ascentOf(r) > ascentOf(best)) ? r : best, null);
    const fastest = list.reduce((best, r) => (!best || avgOf(r) > avgOf(best)) ? r : best, null);
    const maxDuration = list.reduce((best, r) => (!best || secondsOf(r) > secondsOf(best)) ? r : best, null);

    const windows = [5, 10, 20].map((threshold) => {
      const candidates = list.filter((r) => kmOf(r) >= threshold && avgOf(r) > 0);
      let bestSec = Infinity;
      candidates.forEach((r) => { bestSec = Math.min(bestSec, threshold / avgOf(r) * 3600); });
      return { km: threshold, sec: Number.isFinite(bestSec) ? bestSec : 0 };
    });

    const cell = (value, unit, title) => '<div><b>' + value + (unit ? '<em>' + unit + '</em>' : '') + '</b><small>' + title + '</small></div>';
    return (
      cell(longest ? kmOf(longest).toFixed(1) : '—', 'km', '最长单次') +
      cell(climb ? Math.round(ascentOf(climb)) : '—', 'm', '单次最大爬升') +
      cell(fastest ? avgOf(fastest).toFixed(1) : '—', 'km/h', '最高均速') +
      cell(maxDuration ? formatClock(secondsOf(maxDuration)) : '—', '', '最长骑行时间') +
      windows.map((item) => cell(item.sec ? formatClock(item.sec) : '—', '', '最快 ' + item.km + ' km · 推算')).join('')
    );
  }

  /* ---------------- 最佳纪录页：PR 进度 ---------------- */
  function renderCareer() {
    const page = document.getElementById('page-profile-career');
    const host = page && page.querySelector('.profile-feature-content');
    if (!host) return;
    if (has('dCareerRoot')) {
      const old = has('dCareerRoot');
      if (old) old.remove();
    }
    const list = records().slice().sort((a, b) => (dateOf(b) || 0) - (dateOf(a) || 0));
    if (!list.length) return;
    const root = document.createElement('div');
    root.id = 'dCareerRoot';
    host.appendChild(root);
    const latest = list[0];
    const bestKm = list.reduce((best, r) => (!best || kmOf(r) > kmOf(best)) ? r : best, null);
    const pct = bestKm ? Math.round(kmOf(latest) / kmOf(bestKm) * 100) : 0;
    root.innerHTML =
      '<div class="d-card d-career-card">' +
        '<div class="d-zone-head"><b>离个人最佳还有多远</b><span>最近一次 vs 最长单次</span></div>' +
        '<div class="d-career-nums"><b>' + kmOf(latest).toFixed(1) + '<em>km</em></b><span>/ ' + kmOf(bestKm).toFixed(1) + ' km</span></div>' +
        '<div class="d-fuel"><i style="width:' + clamp(pct, 2, 100) + '%"></i></div>' +
        '<div class="d-fuel-meta"><span>已达最长单次的 ' + pct + '%</span><span>' + (pct >= 100 ? '刷新了个人纪录' : '再骑 ' + (kmOf(bestKm) - kmOf(latest)).toFixed(1) + ' km 即可刷新') + '</span></div>' +
        '<small class="d-note">PR 仅统计本机已保存的骑行记录；同路段 PK 在骑行记录页查看。</small>' +
      '</div>';
  }

  /* ---------------- 发现页：不做社交广场的定位说明 ---------------- */
  function renderDiscovery() {
    const body = document.querySelector('#page-discovery .discovery-body');
    if (!body) return;
    let root = has('dDiscoveryRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'dDiscoveryRoot';
      body.insertBefore(root, body.firstChild);
    }
    const ctx = context();
    const pmc = buildPmc(ctx);
    const info = readiness(pmc.tsb);
    root.innerHTML =
      '<div class="d-card d-moat-banner">' +
        '<div class="d-moat-title"><b>云遥不做“点赞排行榜”</b><span style="color:' + info.color + '">' + info.label + '</span></div>' +
        '<p>这里首先是你的训练账本：每条骑行都会被翻译成负荷、强度、后程掉速和明天怎么练。骑友动态只是附带的分享窗口。</p>' +
        '<div class="d-moat-tags">' +
          '<span>TSB ' + Math.round(pmc.tsb) + '</span>' +
          '<span>7 天负荷 ' + Math.round(pmc.weekTss) + '</span>' +
          '<span>本周 ' + pmc.weekCount + ' 次</span>' +
        '</div>' +
        '<button class="d-link" data-page="profile-ability">打开我的体能仪表盘 ›</button>' +
      '</div>';
  }

  /* ---------------- 页面分发与挂载 ---------------- */
  function renderPage(id) {
    if (id === 'home') renderHome();
    if (id === 'report') renderReport();
    if (id === 'profile-ability') renderAbility();
    if (id === 'profile-records') renderRoutePk();
    if (id === 'profile-career') renderCareer();
    if (id === 'discovery') renderDiscovery();
  }

  function boot() {
    if (typeof window.showPage === 'function' && !window.showPage.__dDiff) {
      const base = window.showPage;
      const wrapped = function (id) {
        base(id);
        try { renderPage(id); } catch (error) { console.error('[云遥差异化]', error); }
      };
      wrapped.__dDiff = true;
      window.showPage = wrapped;
    }
    const current = (typeof state !== 'undefined' && state.page) ? state.page : null;
    if (current) { try { renderPage(current); } catch (error) { console.error('[云遥差异化]', error); } }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
