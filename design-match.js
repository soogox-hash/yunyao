const screens = [
  { file: '01欢迎页面.png', title: '欢迎', zones: [{ x: 0, y: 0, w: 100, h: 100, next: 1, label: '进入登录页面' }] },
  { file: '02登录页面.png', title: '登录', zones: [
    { x: 7, y: 8, w: 10, h: 6, next: 0, label: '返回' },
    { x: 8, y: 27.5, w: 84, h: 7, type: 'phone' },
    { x: 8, y: 34.3, w: 84, h: 7, type: 'password' },
    { x: 8, y: 47.2, w: 84, h: 7, next: 2, label: '登录' },
    { x: 8, y: 55, w: 36, h: 5, next: 2, label: '短信验证登录' },
    { x: 70, y: 55, w: 22, h: 5, next: 2, label: '忘记密码' },
    { x: 8, y: 61.3, w: 84, h: 7, next: 2, label: '注册新帐号' },
    { x: 8, y: 69, w: 84, h: 7, next: 2, label: '通过 Apple 登录' },
    { x: 18, y: 85, w: 64, h: 10, next: 2, label: '社交账号登录' }
  ] },
  { file: '03首页页面.png', title: '首页', zones: [
    { x: 3, y: 67, w: 94, h: 8, next: 4, label: '出发' },
    { x: 4, y: 87, w: 18, h: 10, next: 2, label: '首页' },
    { x: 22, y: 87, w: 18, h: 10, next: 3, label: '消息' },
    { x: 41, y: 87, w: 18, h: 10, next: 4, label: '骑行' },
    { x: 61, y: 87, w: 18, h: 10, next: 5, label: '发现' },
    { x: 80, y: 87, w: 17, h: 10, next: 6, label: '我的' }
  ] },
  { file: '04消息页面.png', title: '消息', zones: [
    { x: 4, y: 87, w: 18, h: 10, next: 2, label: '首页' },
    { x: 22, y: 87, w: 18, h: 10, next: 3, label: '消息' },
    { x: 41, y: 87, w: 18, h: 10, next: 4, label: '骑行' },
    { x: 61, y: 87, w: 18, h: 10, next: 5, label: '发现' },
    { x: 80, y: 87, w: 17, h: 10, next: 6, label: '我的' }
  ] },
  { file: '05骑行页面.png', title: '骑行', zones: [
    { x: 5, y: 78, w: 90, h: 8, next: 8, label: '开始骑行' },
    { x: 4, y: 87, w: 18, h: 10, next: 2, label: '首页' },
    { x: 22, y: 87, w: 18, h: 10, next: 3, label: '消息' },
    { x: 41, y: 87, w: 18, h: 10, next: 4, label: '骑行' },
    { x: 61, y: 87, w: 18, h: 10, next: 5, label: '发现' },
    { x: 80, y: 87, w: 17, h: 10, next: 6, label: '我的' }
  ] },
  { file: '06发现页面.png', title: '发现', zones: [
    { x: 4, y: 87, w: 18, h: 10, next: 2, label: '首页' },
    { x: 22, y: 87, w: 18, h: 10, next: 3, label: '消息' },
    { x: 41, y: 87, w: 18, h: 10, next: 4, label: '骑行' },
    { x: 61, y: 87, w: 18, h: 10, next: 5, label: '发现' },
    { x: 80, y: 87, w: 17, h: 10, next: 6, label: '我的' }
  ] },
  { file: '07我的页面.png', title: '我的', zones: [
    { x: 85, y: 8, w: 10, h: 7, next: 7, label: '骑行设置' },
    { x: 4, y: 87, w: 18, h: 10, next: 2, label: '首页' },
    { x: 22, y: 87, w: 18, h: 10, next: 3, label: '消息' },
    { x: 41, y: 87, w: 18, h: 10, next: 4, label: '骑行' },
    { x: 61, y: 87, w: 18, h: 10, next: 5, label: '发现' },
    { x: 80, y: 87, w: 17, h: 10, next: 6, label: '我的' }
  ] },
  { file: '08设置页面.png', title: '骑行设置', zones: [
    { x: 7, y: 7, w: 12, h: 6, next: 6, label: '返回' },
    { x: 82, y: 18.5, w: 12, h: 4.8, type: 'switch', checked: true, label: '自动暂停开关' },
    { x: 82, y: 55.2, w: 12, h: 4.8, type: 'switch', checked: true, label: '出发读秒开关' },
    { x: 82, y: 63, w: 12, h: 4.8, type: 'switch', checked: true, label: '震动反馈开关' },
    { x: 82, y: 84.2, w: 12, h: 4.8, type: 'switch', checked: false, label: '自动计圈开关' },
    { x: 82, y: 92.4, w: 12, h: 4.8, type: 'switch', checked: true, label: '崩溃自动保存开关' }
  ] },
  { file: '09准备出发页面.png', title: '准备出发', zones: [{ x: 0, y: 0, w: 100, h: 100, next: 9, label: '进入骑行中' }] },
  { file: '10骑行中页面.png', title: '骑行中', zones: [
    { x: 8, y: 89, w: 41, h: 8, next: 10, label: '暂停' },
    { x: 51, y: 89, w: 41, h: 8, next: 11, label: '结束' }
  ] },
  { file: '11已暂停页面.png', title: '已暂停', zones: [
    { x: 8, y: 89, w: 41, h: 8, next: 9, label: '继续' },
    { x: 51, y: 89, w: 41, h: 8, next: 11, label: '结束' }
  ] },
  { file: '12结束本次骑行页面.png', title: '结束本次骑行', zones: [
    { x: 7, y: 83, w: 86, h: 7, next: 2, label: '查看报告' },
    { x: 7, y: 90, w: 42, h: 8, next: 2, label: '结束骑行' },
    { x: 51, y: 90, w: 42, h: 8, next: 9, label: '继续骑行' }
  ] }
];

const image = document.getElementById('screenImage');
const hotspots = document.getElementById('hotspots');
let current = 0;

function showScreen(index) {
  current = Math.max(0, Math.min(screens.length - 1, index));
  const screen = screens[current];
  image.src = `designs/${screen.file}`;
  image.alt = `${screen.title}页面`;
  document.title = `云遥骑行 - ${screen.title}`;
  hotspots.replaceChildren();
  screen.zones.forEach(zone => {
    if (zone.type === 'phone' || zone.type === 'password') {
      const field = document.createElement('input');
      field.className = 'field';
      field.type = zone.type === 'password' ? 'password' : 'tel';
      field.autocomplete = zone.type === 'password' ? 'current-password' : 'username';
      field.setAttribute('aria-label', zone.type === 'phone' ? '手机或邮箱' : '请输入密码');
      field.style.cssText = `left:${zone.x}%;top:${zone.y}%;width:${zone.w}%;height:${zone.h}%;`;
      hotspots.append(field);
      continue;
    }
    const button = document.createElement('button');
    button.className = 'hotspot';
    button.type = 'button';
    button.setAttribute('aria-label', zone.label || screen.title);
    button.style.cssText = `left:${zone.x}%;top:${zone.y}%;width:${zone.w}%;height:${zone.h}%;`;
    if (zone.type === 'switch') {
      let checked = zone.checked;
      button.classList.add('switch-control');
      button.addEventListener('click', () => {
        checked = !checked;
        button.classList.add('changed');
        button.classList.toggle('is-off', !checked);
      });
    } else {
      button.addEventListener('click', () => {
        if (Number.isInteger(zone.next)) showScreen(zone.next);
      });
    }
    hotspots.append(button);
  });
}

window.addEventListener('keydown', event => { if (event.key === 'Escape') showScreen(2); });
showScreen(0);
window.setTimeout(() => { if (current === 0) showScreen(1); }, 2600);
