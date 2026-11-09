const tabs = [
  { id: 'home', label: '首页', page: 'home', icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5v10h13v-10M9 19.5v-5h6v5"/>' },
  { id: 'messages', label: '消息', page: 'messages', icon: '<path d="M4 5.5h16v11H11l-5 4v-4H4z"/><path d="M8 9.5h8M8 13h5"/>' },
  { id: 'ride', label: '骑行', page: 'ride', icon: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="m6 17 4-7 4 7h4l-5-9h-3"/>' },
  { id: 'discovery', label: '洞察', page: 'discovery', icon: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 12l2.5-4 2.5 4-4 1z"/>' },
  { id: 'profile', label: '我的', page: 'profile', icon: '<circle cx="9" cy="7" r="3.5"/><path d="M3.5 20c.4-4 2.4-6 5.5-6 1.2 0 2.3.3 3.2.9M15 12l5-2v5c0 3-2 5-5 6-2.8-.9-4.3-2.8-4.8-5.5"/>' }
];

const statusTimes = {
  welcome: '12:52', login: '', home: '12:52', messages: '12:38',
  ride: '12:38', discovery: '12:38', profile: '12:38', settings: '',
  'social-wechat': '12:52', 'social-qq': '12:52', 'social-alipay': '12:52',
  weather: '12:52', 'expected-ride': '12:52', 'suggested-routes': '12:52', 'nearby-greenways': '12:52',
  'route-detail': '12:38', 'discovery-category': '12:38', 'add-friends': '12:38', 'people-more': '12:38', 'city-riders': '12:38', connections: '12:38', 'group-channel':'12:38', report:'12:38','real-name':'12:38','profile-detail':'12:38',terms: '', privacy: '',
  countdown: '12:34', live: '12:38'
};
const founderAccount = {id:'88888',name:'云遥骑友',registeredAt:'2026-10-01T00:00:00+08:00',phone:'13910231020',email:'29693237@qq.com',wechat:'29693237',qq:'29693237',alipay:'13911655250',points:0};
let currentAccount = founderAccount;
try{const saved=JSON.parse(localStorage.getItem('cloudRideCurrentAccount')||'null');if(saved&&saved.id)currentAccount={...founderAccount,...saved};}catch{}
const state = { page: 'welcome', paused: false, seconds: 8, restSeconds:0, timer: null, countTimer: null, speed: 21.8, location: null, locationPromise: null, following: new Set(JSON.parse(localStorage.getItem('cloudRideFollowing') || '[]')), activeConnections: 'following', totalDistance:0, rideDistance:0,levelDistance:0,verifiedOutdoorDistance:0,rideScene:localStorage.getItem("cloudRideRideScene")||"general",rideTrack:[],gpsWatchId:null,lastGpsSample:null,maxSpeed:0,altitude:null,maxAltitude:null,minAltitude:null,totalAscent:0,totalDescent:0,lastAltitude:null, channel:null, amap:null, agreementReturnPage:'login', activeMetricSlot:null, customDial:false };
const rideSettingDefaults={autoPause:true,threshold:3,judgementSeconds:10,recoverySeconds:2,countdown:false,vibration:true,autoLap:false,crashSave:true,gpsPrecision:'high'};
let rideSettings={...rideSettingDefaults};try{rideSettings={...rideSettingDefaults,...JSON.parse(localStorage.getItem('cloudRideSettings')||'{}')};}catch{}
const settingToggleKeys={'自动暂停':'autoPause','出发读秒':'countdown','震动反馈':'vibration','自动计圈':'autoLap','崩溃自动保存':'crashSave'};
const settingStepperKeys={'速度阈值':'threshold','判定时长':'judgementSeconds','恢复延迟':'recoverySeconds'};
function saveRideSettings(){localStorage.setItem('cloudRideSettings',JSON.stringify(rideSettings));}
function syncRideSettingsControls(){document.querySelectorAll('.settings .toggle').forEach(button=>{const key=settingToggleKeys[button.getAttribute('aria-label')];if(key)button.classList.toggle('on',Boolean(rideSettings[key]));});document.querySelectorAll('.settings .setting-row').forEach(row=>{const title=row.querySelector('.setting-row>div:first-child b')?.textContent.trim(),key=settingStepperKeys[title],value=row.querySelector('.stepper b span');if(key&&value)value.textContent=String(rideSettings[key]);});const gps=document.getElementById('gpsPrecisionButton');if(gps){const mode=rideSettings.gpsPrecision||'high';gps.textContent=({high:'高精度',balanced:'平衡',low:'省电'})[mode]||'高精度';const hint=gps.closest('.setting-row')?.querySelector('p');if(hint)hint.textContent=({high:'定位更精确，但更耗电',balanced:'兼顾定位精度与耗电',low:'优先省电，使用较新缓存位置'})[mode]||'定位更精确，但更耗电';}}
syncRideSettingsControls();
const defaultProfile={nickname:currentAccount.name,bio:'追风赴远，行见云遥',gender:'保密',realNameStatus:'未认证',realNameName:'',province:'',city:'',district:'',address:'',birthday:'',height:'',weight:'',ftp:'',maxHeartRate:'',avatar:currentAccount.id==='88888'?'assets/male-avatar.png':'assets/15.jpg'};
let profileInfo={...defaultProfile};try{profileInfo={...defaultProfile,...JSON.parse(localStorage.getItem('cloudRideProfile')||'{}')};}catch{}
if(currentAccount.id==='88888'&&localStorage.getItem('cloudRideFounderAvatarV3')!=='done'){profileInfo.avatar='assets/male-avatar.png';localStorage.setItem('cloudRideFounderAvatarV3','done');localStorage.setItem('cloudRideProfile',JSON.stringify(profileInfo));}
let registrationVerificationCode=null, registrationVerificationTarget='';
const statusbar = document.getElementById('statusbar');
const island = document.querySelector('.island');
const statusTime = document.getElementById('statusTime');
document.querySelectorAll('#page-terms .subpage-head>button,#page-terms article>button,#page-privacy .subpage-head>button,#page-privacy article>button').forEach(button=>button.dataset.page='agreement-back');
document.querySelector('#page-account-bindings').setAttribute('aria-label','账号安全');document.querySelector('#page-account-bindings .subpage-head h1').textContent='账号安全';
function renderProfileAccount(){document.getElementById('profileName').textContent=currentAccount.name;document.getElementById('profileUserId').textContent=currentAccount.id;const bindingId=document.getElementById('bindingUserId');if(bindingId)bindingId.textContent=currentAccount.id;document.getElementById('profilePoints').textContent=String(currentAccount.points);const accountLevel=calculateAccountLevel(state.levelDistance);document.querySelectorAll('.level-badge').forEach(badge=>{badge.textContent='LV.'+accountLevel.level;badge.dataset.tier=accountLevel.level===0?'lv0':accountLevel.level<=4?'beginner':accountLevel.level<=9?'mid':accountLevel.level<=14?'high':'max';badge.title='【'+accountLevel.title+' Lv'+accountLevel.level+'】 等级等效里程：'+state.levelDistance.toFixed(1)+' km '+accountLevel.slogan+(accountLevel.nextThreshold===null?' · 已达最高等级':' · 还需 '+accountLevel.remainingKm.toFixed(1)+' km');badge.setAttribute('aria-label','等级特权：LV.'+accountLevel.level+' '+accountLevel.title+'。'+accountLevel.slogan);});const avatarWrap=document.querySelector('.avatar-wrap'),savedFrame=localStorage.getItem('cloudRideAvatarFrame');if(avatarWrap){if(savedFrame)avatarWrap.dataset.avatarFrame=savedFrame;else delete avatarWrap.dataset.avatarFrame;}const levelTitle=document.getElementById('profileLevelTitle');if(levelTitle)levelTitle.textContent=accountLevel.title;const levelDistance=document.getElementById('profileLevelDistance');if(levelDistance)levelDistance.textContent=state.levelDistance.toFixed(1)+' km';const outdoorDistance=document.getElementById('profileOutdoorDistance');if(outdoorDistance)outdoorDistance.textContent=state.verifiedOutdoorDistance.toFixed(1)+' km';document.getElementById('profileDistance').innerHTML=state.totalDistance.toFixed(1)+'<small>km</small>'; document.querySelectorAll('[data-bound-account]').forEach(el=>{const key=el.dataset.boundAccount;el.textContent=currentAccount[key]?maskAccountField(key,currentAccount[key]):'未绑定';});document.querySelectorAll('[data-reveal-field]').forEach(el=>{el.dataset.shown='false';el.textContent='显示';});}

function renderProfileAccount(){document.getElementById('profileName').textContent=profileInfo.nickname||currentAccount.name;document.getElementById('profileBio').textContent=profileInfo.bio||'追风赴远，行见云遥';document.getElementById('profileUserId').textContent=currentAccount.id;const bindingId=document.getElementById('bindingUserId');if(bindingId)bindingId.textContent=currentAccount.id;currentAccount.points=getPointBalance();document.getElementById('profilePoints').textContent=String(currentAccount.points);const accountLevel=calculateAccountLevel(state.levelDistance);document.querySelectorAll('.level-badge').forEach(badge=>{badge.textContent='LV.'+accountLevel.level;badge.dataset.tier=accountLevel.level===0?'lv0':accountLevel.level<=4?'beginner':accountLevel.level<=9?'mid':accountLevel.level<=14?'high':'max';badge.title='【'+accountLevel.title+' Lv'+accountLevel.level+'】 等级等效里程：'+state.levelDistance.toFixed(1)+' km '+accountLevel.slogan+(accountLevel.nextThreshold===null?' · 已达最高等级':' · 还需 '+accountLevel.remainingKm.toFixed(1)+' km');badge.setAttribute('aria-label','等级特权：LV.'+accountLevel.level+' '+accountLevel.title+'。'+accountLevel.slogan);});const levelTitle=document.getElementById('profileLevelTitle');if(levelTitle)levelTitle.textContent=accountLevel.title;const levelDistance=document.getElementById('profileLevelDistance');if(levelDistance)levelDistance.textContent=state.levelDistance.toFixed(1)+' km';document.getElementById('profileDistance').innerHTML=state.totalDistance.toFixed(1)+'<small>km</small>';const completedRoutes=document.getElementById('profileCompletedRoutes');if(completedRoutes)completedRoutes.innerHTML=rideHistoryRecords.length+'<small>条</small>';const rideDays=document.getElementById('profileRideDays');if(rideDays)rideDays.innerHTML=new Set(rideHistoryRecords.map(record=>record.date)).size+'<small>天</small>';if(profileInfo.avatar)document.getElementById('profileAvatar').src=profileInfo.avatar;document.querySelectorAll('[data-bound-account]').forEach(el=>{const key=el.dataset.boundAccount;el.textContent=currentAccount[key]?maskAccountField(key,currentAccount[key]):'未绑定';});document.querySelectorAll('[data-reveal-field]').forEach(el=>{el.dataset.shown='false';el.textContent='显示';});}

function renderTabs() {
  document.querySelectorAll('.tabbar').forEach(nav => {
    const active = nav.dataset.active;
    nav.innerHTML = tabs.map(tab => `<button class="tab ${active === tab.id ? 'active' : ''}" data-page="${tab.page}" aria-label="${tab.label}"><svg viewBox="0 0 24 24" aria-hidden="true">${tab.icon}</svg><span>${tab.label}</span></button>`).join('');
  });
}

function showPage(id) {
  if (profileDetailData[id]) renderProfileDetail(id);
  const page = document.getElementById(`page-${id}`);
  if (!page) return;
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  page.classList.add('active');
  state.page = id;
  statusTime.textContent = statusTimes[id] || '12:38';
  statusbar.style.display = ['login', 'settings'].includes(id) ? 'none' : 'flex';
  island.style.display = 'block';
  if (id === 'live') renderLiveState();
  if (id === 'level-benefits') renderLevelBenefitsPage();
  if (id === 'weather') locateWeather();
  if (id === 'ride') { locateMap(); initializeAmap(); }
  if (id === 'expected-ride' || id === 'nearby-greenways') locateCurrentPosition().then(updateLocationLabels).catch(()=>{});
  if (id === 'add-friends') renderPeopleList(document.getElementById('peopleRecommendations'), peopleData.slice(0,2));
  if (id === 'people-more') renderPeopleList(document.getElementById('morePeopleContent'), peopleData);
  if (id === 'city-riders') renderPeopleList(document.getElementById('cityRidersContent'), peopleData.slice().reverse());
  if (id === 'connections') renderConnections(state.activeConnections);
  if (id==='personal-home') renderPersonalHome();
  if (id === 'profile' || id === 'account-bindings') renderProfileAccount();
}

const routeCatalog = {
  'lake-easy':{name:'环湖绿道轻骑线',desc:'12 km · 爬升 180 m · 轻松',image:'assets/02.jpg'},
  'city-night':{name:'城市夜骑',desc:'15 km · 夜景路线 · 适合夜骑',image:'assets/11.jpg'},
  'mountain-expedition':{name:'山野远征',desc:'38 km · 爬升 520 m · 进阶挑战',image:'assets/12.jpg'},
  'weekend-ride':{name:'周末团练',desc:'多人参与 · 周末活动',image:'assets/13.jpg'},
  'nearby-greenway':{name:'环城林荫绿道',desc:'8 km · 平缓 · 轻松休闲',image:'assets/14.jpg'}
};
const categoryData = {
  routes:{title:'路线',intro:'精选骑行路线',cards:[['city-night','城市夜骑','15 km · 夜景路线','assets/11.jpg'],['mountain-expedition','山野远征','38 km · 爬升 520 m','assets/12.jpg'],['nearby-greenway','附近绿道','8 km · 轻松休闲','assets/14.jpg']]},
  activities:{title:'活动',intro:'和附近骑友一起出发',cards:[['weekend-ride','周末团练','多人参与 · 周末活动','assets/13.jpg'],['city-night','城市夜骑活动','集合骑行 · 约 15 km','assets/11.jpg']]},
  riders:{title:'骑友',intro:'发现附近活跃骑友',cards:[['lake-easy','阿泽','本周骑行 128 km','assets/15.jpg'],['nearby-greenway','林小夏','环湖路线爱好者','assets/15.jpg']]},
  challenges:{title:'挑战',intro:'完成目标，解锁骑行成就',cards:[['mountain-expedition','山野爬升挑战','累计爬升 520 m','assets/12.jpg'],['weekend-ride','周末里程挑战','团练完成 30 km','assets/13.jpg']]},
  nearby:{title:'附近',intro:'当前位置周边的骑行选择',cards:[['nearby-greenway','环城林荫绿道','约 8 km · 休闲绿道','assets/14.jpg'],['lake-easy','环湖绿道轻骑线','约 12 km · 爬升 180 m','assets/02.jpg']]}
};
const peopleData=[{name:'阿泽',info:'共同骑友 3 位',avatar:'assets/15.jpg'},{name:'林小夏',info:'附近骑友 · 喜欢绿道',initial:'林',tone:'avatar-blue'},{name:'周宇',info:'本周骑行 96 km',initial:'周',tone:'avatar-green'},{name:'陈晨',info:'共同参加过 2 次活动',initial:'陈',tone:'avatar-orange'}];
const riderLevelTable=[
{level:0,title:'骑行萌新',km:0,benefit:'基础骑行统计卡片：距离、时长、均速',slogan:'蓄势待发，准备踏上第一程'},
{level:1,title:'初踏轮迹',km:10,benefit:'解锁第一枚彩色徽章，主页展示等级标识',slogan:'车轮初转，与风初次相逢'},
{level:2,title:'追风新手',km:30,benefit:'解锁 3 套基础分享海报模板',slogan:'轻骑漫游，感受沿途晚风'},
{level:3,title:'沿路观风',km:70,benefit:'路线收藏上限 +20',slogan:'且骑且停，捕捉路边风景'},
{level:4,title:'郊野行者',km:140,benefit:'解锁自定义主页签名铭牌样式',slogan:'奔赴郊野，解锁近郊路线'},
{level:5,title:'长路常客',km:250,benefit:'解锁进阶海报模板与水印自定义',slogan:'轮不停歇，习惯在路上'},
{level:6,title:'山道逐风',km:420,benefit:'路线收藏上限 +50，可创建私有路线合集',slogan:'勇攀山道，与逆风较量'},
{level:7,title:'轮下山河',km:670,benefit:'解锁专属骑行配色主题',slogan:'车轮碾过，揽阅山河底色'},
{level:8,title:'旷野驰者',km:1020,benefit:'官方线下活动优先抽选资格',slogan:'驰骋旷野，心随长路自由'},
{level:9,title:'远山赴约',km:1490,benefit:'解锁专属动态徽章',slogan:'向着远山，赴一场长久之约'},
{level:10,title:'长路赴野',km:2100,benefit:'解锁金属质感徽章与社区评论标识',slogan:'以轮为马，奔赴无尽旷野'},
{level:11,title:'纵横阡陌',km:2880,benefit:'可创建公开路线合集并置顶',slogan:'穿行阡陌，走遍四方路途'},
{level:12,title:'山河漫骑',km:3860,benefit:'解锁定制成就卡片与年度报告版式',slogan:'漫骑山河，阅尽人间风物'},
{level:13,title:'风途无疆',km:5070,benefit:'限量线上活动周边抽奖资格',slogan:'风无止境，前路没有边界'},
{level:14,title:'轮渡山海',km:6540,benefit:'官方骑友社群高阶身份与路线优先审核',slogan:'一轮渡山海，万里自逍遥'},
{level:15,title:'追风至境',km:8300,benefit:'解锁流光徽章、满级铭牌与荣誉墙展示',slogan:'追风至终境，不负每一寸路程'}
];
const pointExchangeCatalog=[{id:'frame-mint',name:'山野薄荷头像框',cost:50,description:'薄荷绿头像描边，永久使用'},{id:'frame-sky',name:'晴空蓝头像框',cost:120,description:'晴空蓝头像描边，永久使用'},{id:'frame-gold',name:'鎏金头像框',cost:300,description:'鎏金头像描边，永久使用'}];
function calculateAccountLevel(validKm){const score=Math.max(0,Number(validKm)||0);let current=riderLevelTable[0];for(const tier of riderLevelTable){if(score>=tier.km)current=tier;else break;}const next=riderLevelTable.find(tier=>tier.level===current.level+1)||null;return {...current,progressKm:score,nextThreshold:next?.km??null,nextTitle:next?.title??'',remainingKm:next?Math.max(0,next.km-score):0};}
function compressGpsTrack(track,maxPoints=1000){if(!Array.isArray(track)||track.length<=maxPoints)return track||[];const step=(track.length-1)/(maxPoints-1),result=[];for(let i=0;i<maxPoints;i++)result.push(track[Math.round(i*step)]);return result;}
function validateRideRecord(record){const reasons=[],track=Array.isArray(record.track)?record.track:[],duration=Math.max(0,Number(record.durationSeconds)||parseDuration(record.duration));if((record.rideMode||'outdoor')!=='outdoor')reasons.push('非户外 GPS 骑行');if(record.source!=='手机GPS定位')reasons.push('缺少手机 GPS 来源');if(track.length<2)reasons.push('GPS 轨迹点不足');let highSpeedRun=0,measured=0;for(let i=1;i<track.length;i++){const a=track[i-1],b=track[i],dt=(Number(b.timestamp)-Number(a.timestamp))/1000;if(!Number.isFinite(dt)||dt<=0){reasons.push('轨迹时间异常');highSpeedRun=0;continue;}if(Number(a.accuracy)>60||Number(b.accuracy)>60)reasons.push('GPS 精度不足');const meters=haversineMeters(a,b),speed=meters/dt*3.6,climb=Number.isFinite(a.altitude)&&Number.isFinite(b.altitude)?b.altitude-a.altitude:0,isClimb=meters>0&&climb/meters>=.03,limit=isClimb?60:50;measured+=meters;if(dt<=3&&meters>100)reasons.push('GPS 点位短时跳跃');if(speed>80)reasons.push('GPS 速度突跳');if(speed>limit)highSpeedRun++;else highSpeedRun=0;if(highSpeedRun>=3)reasons.push(isClimb?'持续速度超过爬坡校验阈值':'平路持续速度超过 50 km/h');}if(Number(record.distance)>=10&&duration>0&&duration<480)reasons.push('10 km 骑行用时少于 8 分钟');const distance=Number(record.distance)||0;if(track.length>=2&&Math.abs(measured/1000-distance)>Math.max(.5,distance*.2))reasons.push('轨迹长度与骑行里程不匹配');const unique=[...new Set(reasons)];return {valid:unique.length===0,eligibleDistance:unique.length===0?distance:0,reasons:unique,durationSeconds:duration};}
function isoWeekKey(dateValue){const date=new Date(dateValue+'T12:00:00');if(Number.isNaN(date.getTime()))return '';const day=(date.getDay()+6)%7;date.setDate(date.getDate()-day+3);const firstThursday=new Date(date.getFullYear(),0,4);const firstDay=(firstThursday.getDay()+6)%7;firstThursday.setDate(firstThursday.getDate()-firstDay+3);const week=1+Math.round((date-firstThursday)/604800000);return date.getFullYear()+'-W'+String(week).padStart(2,'0');}
function recalculateRideLedger(){const valid=rideHistoryRecords.map(record=>{const check=validateRideRecord(record);Object.assign(record,{rideMode:record.rideMode||'outdoor',validationStatus:check.valid?'valid':'excluded',levelEligible:check.valid,durationSeconds:check.durationSeconds,validationReasons:check.reasons,levelDistance:0,climbFactor:1,stabilityFactor:1,sceneFactor:1,sensorFactor:1});return record;}).filter(record=>record.levelEligible);const weeks=new Map(),days=new Map();valid.forEach(record=>{const week=isoWeekKey(record.date),day=record.date;weeks.set(week,(weeks.get(week)||0)+1);days.set(day,(days.get(day)||0)+Number(record.distance||0));});const dayUsed=new Map();valid.slice().sort((a,b)=>(a.createdAt||a.date).localeCompare(b.createdAt||b.date)).forEach(record=>{const ascent=Math.max(0,Number(record.ascent)||0),actual=Number(record.distance||0),climbFactor=1+Math.min(.4,Math.floor(ascent/1000)*.2),stabilityFactor=(weeks.get(isoWeekKey(record.date))||0)>=2?1.08:1,sceneFactor=record.scene==='offroad'||(days.get(record.date)||0)>=100?1.1:1,sensorFactor=record.sensorDataValid?1.05:1,raw=actual*climbFactor*stabilityFactor*sceneFactor*sensorFactor,capped=Math.min(raw,Number(record.distance||0)*1.5),remainingBonus=Math.max(0,150-(dayUsed.get(record.date)||0)),effective=Math.min(capped,actual+remainingBonus),bonus=Math.max(0,effective-actual);Object.assign(record,{climbFactor,stabilityFactor,sceneFactor,sensorFactor,effectiveUncapped:raw,levelDistance:effective});dayUsed.set(record.date,(dayUsed.get(record.date)||0)+bonus);});state.totalDistance=rideHistoryRecords.reduce((sum,record)=>sum+Number(record.distance||0),0);state.verifiedOutdoorDistance=valid.reduce((sum,record)=>sum+Number(record.distance||0),0);state.levelDistance=valid.reduce((sum,record)=>sum+Number(record.levelDistance||0),0);return {validDistance:state.verifiedOutdoorDistance,equivalentDistance:state.levelDistance};}function parseDuration(value){if(Number.isFinite(Number(value)))return Number(value);if(typeof value!=='string')return 0;const parts=value.split(':').map(Number);return parts.reduce((total,part)=>total*60+(part||0),0);}
function getPointBalance(){const earned=Math.floor(state.verifiedOutdoorDistance||0),spent=Math.max(0,Number(localStorage.getItem('cloudRidePointsSpent')||0));return Math.max(0,earned-spent);}function renderLevelBenefitsPage(){const current=calculateAccountLevel(state.levelDistance),hero=document.getElementById('levelHero');if(hero){const progress=current.nextThreshold===null?100:Math.max(0,Math.min(100,(state.levelDistance-current.km)/(current.nextThreshold-current.km)*100));hero.innerHTML='<div class="level-hero-badge" data-tier="'+(current.level===0?'lv0':current.level<=4?'beginner':current.level<=9?'mid':current.level<=14?'high':'max')+'">LV.'+current.level+'</div><div class="level-hero-info"><b>'+current.title+'</b><span>等级等效里程 '+state.levelDistance.toFixed(1)+' km · 校验户外 '+state.verifiedOutdoorDistance.toFixed(1)+' km</span><div class="level-progress"><i style="width:'+progress.toFixed(1)+'%"></i></div><small>'+(current.nextThreshold===null?'已达最高等级':`距 Lv.${current.level+1} ${current.nextTitle} 还差 ${current.remainingKm.toFixed(1)} km` )+'</small></div>';}document.getElementById('levelSystemList').innerHTML=riderLevelTable.map((tier,index)=>{const previous=riderLevelTable[index-1],increment=tier.level===0?0:tier.km-previous.km,status=tier.level<current.level?'已达成':tier.level===current.level?'当前等级':'未解锁';return '<article class="level-tier-card '+(tier.level===current.level?'current':'')+'"><div class="level-tier-top"><b>Lv.'+tier.level+' · '+tier.title+'</b><span>'+status+'</span></div><div class="level-tier-mileage">累计等效里程 <b>'+tier.km.toLocaleString('zh-CN')+' km</b>'+(tier.level?'<small>升级需 '+increment.toLocaleString('zh-CN')+' km</small>':'')+'</div><p>'+tier.benefit+'</p><div class="level-tier-slogan">'+tier.slogan+'</div></article>';}).join('');const balance=getPointBalance(),balanceEl=document.getElementById('pointBalance');balanceEl.textContent=String(balance);let owned=[];try{owned=JSON.parse(localStorage.getItem('cloudRidePointRewards')||'[]');}catch{}document.getElementById('pointExchangeList').innerHTML=pointExchangeCatalog.map(item=>{const has=owned.includes(item.id),can=balance>=item.cost;return '<article class="point-reward-card"><div><b>'+item.name+'</b><small>'+item.description+'</small><em>'+item.cost+' 积分</em></div><button type="button" data-redeem-reward="'+item.id+'" '+(has||!can?'disabled':'')+'>'+(has?'已兑换':can?'兑换':'积分不足')+'</button></article>';}).join('');}function maskAccountField(key,value){if(key==='phone'||key==='alipay')return value.slice(0,3)+'****'+value.slice(-4);if(key==='email')return value.slice(0,3)+'****'+value.slice(value.indexOf('@'));return value.slice(0,4)+'****';}
function nextUserId(){let next=Math.max(1,Number(localStorage.getItem('cloudRideNextUserId')||1));if(next===88888)next++;localStorage.setItem('cloudRideNextUserId',String(next+1));return String(next).padStart(5,'0');}
function locateCurrentPosition(force=false){
  if(state.location&&!force)return Promise.resolve(state.location);
  if(state.locationPromise&&!force)return state.locationPromise;
  state.locationPromise=new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('当前浏览器不支持定位'));return;}
    const precision=rideSettings.gpsPrecision||'high',options={enableHighAccuracy:precision==='high',timeout:precision==='high'?12000:8000,maximumAge:precision==='low'?120000:precision==='balanced'?30000:0};navigator.geolocation.getCurrentPosition(position=>{state.location={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy};resolve(state.location);},error=>reject(new Error(error.code===1?'请允许浏览器访问位置':'暂时无法获取当前位置')),options);
  }).finally(()=>{state.locationPromise=null;});
  return state.locationPromise;
}
function updateLocationLabels(){
  if(!state.location)return;
  const value=`当前位置 · ${state.location.latitude.toFixed(4)}, ${state.location.longitude.toFixed(4)}`;
  ['locationLabel','greenwayLocation'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=value;});
  const coord=document.getElementById('mapCoord');if(coord)coord.textContent=`${state.location.latitude.toFixed(4)}, ${state.location.longitude.toFixed(4)}`;
}
function locateMap(force=false){
  locateCurrentPosition(force).then(()=>{updateLocationLabels();}).catch(error=>{const coord=document.getElementById('mapCoord');if(coord)coord.textContent=error.message;});
}
function locateWeather(force=false){
  const desc=document.getElementById('weatherDesc');if(desc)desc.textContent='正在获取当前位置…';
  locateCurrentPosition(force).then(()=>{
    updateLocationLabels();
    document.getElementById('weatherTemp').textContent='--°C';
    document.getElementById('weatherDesc').textContent='当前位置已获取';
    const config=window.YUNYAO_CONFIG||{};
    document.getElementById('weatherDetails').textContent='正在请求中国天气网实时天气…';
    document.getElementById('homeWeatherTemp').textContent='天气待接入';
    document.getElementById('homeWeatherTip').textContent='已定位当前位置';
    document.getElementById('rideForecastTitle').textContent='已定位，天气数据待接入';
    document.getElementById('rideForecastText').textContent='接入天气服务后，可根据本地天气提供骑行建议。';
    if(typeof config.fetchChinaWeather==='function') config.fetchChinaWeather({...state.location}).then(renderChinaWeather).catch(()=>{document.getElementById('weatherDetails').textContent='中国天气网暂时不可用，请稍后重试';});
    else document.getElementById('weatherDetails').textContent='已获取坐标；中国天气网接口凭据尚未配置';
  }).catch(error=>{if(desc)desc.textContent=error.message;document.getElementById('weatherDetails').textContent='请检查定位权限后重试';});
}
function renderChinaWeather(data){
  if(!data)return;
  const temp=data.temperature??data.temp??data.temp1??'--';
  const condition=data.condition??data.text??data.weather??'天气已更新';
  const city=data.city??data.location??'当前位置';
  document.getElementById('weatherTemp').textContent=`${temp}°C`;
  document.getElementById('weatherDesc').textContent=condition;
  document.getElementById('weatherDetails').textContent=`${city}${data.wind?` · ${data.wind}`:''}`;
  document.getElementById('homeWeatherTemp').textContent=`${condition} ${temp}°C`;
  document.getElementById('homeWeatherTip').textContent=data.rideTip||'已更新当地天气';
  document.getElementById('rideForecastTitle').textContent=`${city} · ${condition}`;
  document.getElementById('rideForecastText').textContent=data.rideTip||'请根据实际天气和路况安排骑行。';
  const forecast=document.getElementById('forecastTemp');if(forecast)forecast.textContent=`${temp}°`;
}
function initializeAmap(){
  const cfg=window.YUNYAO_CONFIG?.amap;if(!cfg?.key||!cfg?.securityJsCode)return;
  if(!window.AMapLoader){if(!document.querySelector('script[data-amap-loader]')){const script=document.createElement('script');script.src='https://webapi.amap.com/loader.js';script.dataset.amapLoader='true';script.onload=initializeAmap;document.head.append(script);}return;}
  window._AMapSecurityConfig={securityJsCode:cfg.securityJsCode};
  window.AMapLoader.load({key:cfg.key,version:'2.0',plugins:['AMap.Geolocation']}).then(AMap=>{
    const node=document.getElementById('rideMap');if(!node||state.amap)return;
    node.querySelectorAll('.map-street,.map-park,.map-route,.map-place').forEach(el=>el.remove());
    state.amap=new AMap.Map(node,{zoom:15,viewMode:'2D',mapStyle:'amap://styles/dark'});
    locateCurrentPosition().then(pos=>AMap.convertFrom([pos.longitude,pos.latitude],'gps',(status,result)=>{
      if(status==='complete'&&result.info==='ok'){const point=result.locations[0];state.amap.setCenter(point);new AMap.Marker({position:point,map:state.amap,title:'当前位置'});}
    }));
  }).catch(()=>{});
}
function renderRouteDetail(id){
  const route=routeCatalog[id]||routeCatalog['lake-easy'];
  document.getElementById('routeDetailTitle').textContent=route.name;
  document.getElementById('routeDetailName').textContent=route.name;
  document.getElementById('routeDetailDescription').textContent=route.desc;
  document.getElementById('routeDetailImage').src=route.image;
  document.getElementById('routeDetailImage').alt=route.name;
  showPage('route-detail');
}
function renderDiscoveryCategory(category){
  const data=categoryData[category]||categoryData.routes;
  document.getElementById('categoryTitle').textContent=data.title;
  document.getElementById('categoryContent').innerHTML=`<p>${data.intro}</p>${data.cards.map(([id,title,description,image])=>`<div class="category-card" data-route-id="${id}"><img src="${image}" alt="${title}"><div><b>${title}</b><small>${description}</small></div><span>›</span></div>`).join('')}`;
}
function renderPeopleList(container,people){
  if(!container)return;
  container.innerHTML=people.map(person=>`<div class="people-row">${person.avatar?`<img src="${person.avatar}" alt="${person.name}">`:`<span class="person-avatar ${person.tone}">${person.initial}</span>`}<b>${person.name}</b><small>${person.info}</small><button class="follow-button ${state.following.has(person.name)?'following':''}">${state.following.has(person.name)?'已关注':'＋关注'}</button></div>`).join('');
}
function renderConnections(tab){
  state.activeConnections=tab;
  const content=document.getElementById('connectionsContent');if(!content)return;
  const people=tab==='following'?peopleData.filter(person=>state.following.has(person.name)):peopleData.slice(0,3);
  content.innerHTML=people.length?people.map(person=>`<div class="people-row">${person.avatar?`<img src="${person.avatar}" alt="${person.name}">`:`<span class="person-avatar ${person.tone}">${person.initial}</span>`}<b>${person.name}</b><small>${tab==='following'?'已关注':'关注了你'}</small><button class="follow-button ${state.following.has(person.name)?'following':''}">${state.following.has(person.name)?'已关注':'＋回关'}</button></div>`).join(''):'<p>还没有关注的骑友，去发现更多骑行伙伴吧。</p>';
  document.querySelectorAll('[data-connection-tab]').forEach(button=>button.classList.toggle('selected',button.dataset.connectionTab===tab));
  document.getElementById('followingCount').textContent=String(state.following.size);
}
const defaultMetricSelections={'primary-0':'distance','primary-1':'rideTime','primary-2':'avgSpeed','grid-0':'maxSpeed','grid-1':'totalAscent','grid-2':'power','grid-3':'cadence','grid-4':'heartRate','grid-5':'calories'};
let metricSelections={...defaultMetricSelections};try{metricSelections={...defaultMetricSelections,...JSON.parse(localStorage.getItem('cloudRideMetricSelections')||'{}')};}catch{}
const rideElapsed=()=>Math.max(0,state.seconds-8);
const rideAverageSpeed=()=>rideElapsed()>0?state.rideDistance/(rideElapsed()/3600):0;
const unavailableMetric=(unit='')=>`—${unit?`<small>${unit}</small>`:''}`;
const metricGroups=[
 {name:'速度',items:[['speed','速度',()=>`${state.paused?'0.0':state.speed.toFixed(1)}<small>km/h</small>`],['maxSpeed','极速',()=>`${state.maxSpeed.toFixed(1)}<small>km/h</small>`],['avgSpeed','均速',()=>`${rideAverageSpeed().toFixed(1)}<small>km/h</small>`]]},
 {name:'时间',items:[['rideTime','骑行时间',()=>formatTime(rideElapsed())],['totalTime','总时间',()=>formatTime(rideElapsed()+state.restSeconds)],['restTime','休息时间',()=>formatTime(state.restSeconds)]]},
 {name:'距离',items:[['distance','里程',()=>`${state.rideDistance.toFixed(2)}<small>km</small>`]]},
 {name:'高度',items:[['altitude','海拔',()=>state.altitude===null?unavailableMetric('m'):`${Math.round(state.altitude)}<small>m</small>`],['maxAltitude','最高海拔',()=>state.maxAltitude===null?unavailableMetric('m'):`${Math.round(state.maxAltitude)}<small>m</small>`],['minAltitude','最低海拔',()=>state.minAltitude===null?unavailableMetric('m'):`${Math.round(state.minAltitude)}<small>m</small>`],['totalAscent','累计攀升',()=>`${Math.round(state.totalAscent)}<small>m</small>`],['totalDescent','累计下降',()=>`${Math.round(state.totalDescent)}<small>m</small>`],['lapAscent','本段爬升',()=>unavailableMetric('m')],['lapDescent','本段下降',()=>unavailableMetric('m')],['prevLapAscent','上段爬升',()=>unavailableMetric('m')],['prevLapDescent','上段下降',()=>unavailableMetric('m')]]},
 {name:'踏频',items:[['cadence','踏频',()=>unavailableMetric('rpm')],['avgCadence','平均踏频',()=>unavailableMetric('rpm')],['maxCadence','最大踏频',()=>unavailableMetric('rpm')],['lapAvgCadence','本段平均踏频',()=>unavailableMetric('rpm')],['lapMaxCadence','本段最大踏频',()=>unavailableMetric('rpm')],['prevLapMaxCadence','上段最大踏频',()=>unavailableMetric('rpm')],['prevLapAvgCadence','上段平均踏频',()=>unavailableMetric('rpm')],['cadenceZone','踏频区间',()=>unavailableMetric()]]},
 {name:'心率',items:[['heartRate','心率',()=>unavailableMetric('bpm')],['avgHeartRate','平均心率',()=>unavailableMetric('bpm')],['maxHeartRate','最大心率',()=>unavailableMetric('bpm')],['maxHrPercent','%最大心率',()=>unavailableMetric('%')],['lthrPercent','%乳酸阈心率',()=>unavailableMetric('%')],['lapAvgHeartRate','本段平均心率',()=>unavailableMetric('bpm')],['lapMaxHeartRate','本段最大心率',()=>unavailableMetric('bpm')],['prevLapAvgHeartRate','上段平均心率',()=>unavailableMetric('bpm')],['prevLapMaxHeartRate','上段最大心率',()=>unavailableMetric('bpm')],['heartRateZone','心率区间',()=>unavailableMetric()]]},
 {name:'功率',items:[['power','功率',()=>unavailableMetric('W')],['avgPower','平均功率',()=>unavailableMetric('W')],['maxPower','最大功率',()=>unavailableMetric('W')],['balance','左右平衡',()=>unavailableMetric('%')],['power3','3s功率',()=>unavailableMetric('W')],['power10','10s功率',()=>unavailableMetric('W')],['power15','15s功率',()=>unavailableMetric('W')],['wattsKg5','5s瓦/千克',()=>unavailableMetric('W/kg')],['wattsKg10','10s瓦/千克',()=>unavailableMetric('W/kg')],['wattsKg15','15s瓦/千克',()=>unavailableMetric('W/kg')],['avgWattsKg','平均瓦/千克',()=>unavailableMetric('W/kg')],['workKj','功/千焦',()=>unavailableMetric('kJ')],['lapAvgPower','本段平均功率',()=>unavailableMetric('W')],['lapMaxPower','本段最大功率',()=>unavailableMetric('W')],['prevLapAvgPower','上段平均功率',()=>unavailableMetric('W')],['prevLapMaxPower','上段最大功率',()=>unavailableMetric('W')],['powerZone','功率区间',()=>unavailableMetric()]]},
 {name:'其他',items:[['calories','热量',()=>unavailableMetric('kcal')],['carbonReduction','减碳值',()=>unavailableMetric('kg')]]}
];
const metricCatalog=Object.fromEntries(metricGroups.flatMap(group=>group.items.map(([id,label,value])=>[id,{id,label,value,group:group.name}])));
function renderMetricSlots(){document.querySelectorAll('#page-live [data-metric-slot]').forEach(slot=>{const key=metricSelections[slot.dataset.metricSlot]||defaultMetricSelections[slot.dataset.metricSlot],metric=metricCatalog[key]||metricCatalog[defaultMetricSelections[slot.dataset.metricSlot]],label=slot.querySelector('label'),value=slot.querySelector('b');if(!label||!value)return;label.textContent=metric.label;value.innerHTML=metric.value();value.classList.toggle('orange',['maxSpeed','heartRate','maxHeartRate','power'].includes(key));let edit=slot.querySelector('.metric-edit-arrow');if(state.customDial&&!edit){edit=document.createElement('button');edit.type='button';edit.className='metric-edit-arrow';edit.dataset.openMetric=slot.dataset.metricSlot;edit.setAttribute('aria-label',`更改${metric.label}`);edit.textContent='▾';slot.append(edit);}else if(!state.customDial&&edit)edit.remove();});}
function renderMetricPicker(groupName){const group=metricGroups.find(item=>item.name===groupName)||metricGroups[0];document.getElementById('metricCategoryList').innerHTML=metricGroups.map(item=>`<button type="button" class="metric-category-option ${item.name===group.name?'active':''}" data-metric-category="${item.name}">${item.name}</button>`).join('');document.getElementById('metricOptionList').innerHTML=group.items.map(([id,label])=>`<button type="button" class="metric-value-option ${metricSelections[state.activeMetricSlot]===id?'selected':''}" data-metric-choice="${id}">${label}<span>${metricSelections[state.activeMetricSlot]===id?'✓':'›'}</span></button>`).join('');}
function openMetricPicker(slot){state.activeMetricSlot=slot;const current=metricCatalog[metricSelections[slot]]||metricCatalog[defaultMetricSelections[slot]];renderMetricPicker(current.group);document.getElementById('metricPickerMask').hidden=false;}
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(value => String(value).padStart(2, '0')).join(':');
}

function renderLiveState() {
  document.getElementById('liveStateText').textContent = state.paused ? '已暂停' : '骑行中';
  document.getElementById('liveSpeed').textContent = state.paused ? '0.0' : state.speed.toFixed(1);
  document.getElementById('liveTime').textContent = formatTime(rideElapsed());
  const gauge = document.getElementById('gaugeValue');
  gauge.style.strokeDashoffset = String(836 * (1 - Math.min(state.speed, 40) / 40));
  document.getElementById('pauseButton').textContent = state.paused ? '继续' : '暂停';
  document.getElementById('liveDistance').innerHTML = state.rideDistance.toFixed(2) + '<small>km</small>';
  document.getElementById('liveAverage').innerHTML = rideAverageSpeed().toFixed(1) + '<small>km/h</small>';
  document.getElementById('endTime').textContent = formatTime(rideElapsed()).replace(/^00:/, '');
  document.getElementById('endDistance').textContent = state.rideDistance.toFixed(2) + ' km';
  document.getElementById('livePower').innerHTML = unavailableMetric('W');
  document.getElementById('page-live').classList.toggle('paused', state.paused);
  renderMetricSlots();
}

function startRideCountdown() {
  clearInterval(state.countTimer);clearInterval(state.timer);state.paused=false;state.autoPaused=false;state.autoPauseLowSeconds=0;state.autoPauseResumeSeconds=0;
  if(!rideSettings.countdown){showPage('live');startRideGpsTracking();startClock();return;}
  showPage('countdown');const sequence=['3','2','1','GO'];let index=0;const count=document.getElementById('countNumber');count.textContent=sequence[0];count.classList.remove('count-go');if(rideSettings.vibration&&navigator.vibrate)navigator.vibrate(70);
  state.countTimer=setInterval(()=>{index+=1;if(index<sequence.length){count.textContent=sequence[index];count.classList.toggle('count-go',sequence[index]==='GO');if(rideSettings.vibration&&navigator.vibrate)navigator.vibrate(70);}else{clearInterval(state.countTimer);showPage('live');startRideGpsTracking();startClock();}},1000);
}
function beginRide() {state.seconds=8;state.restSeconds=0;state.rideDistance=0;state.rideTrack=[];state.lastGpsSample=null;state.speed=0;state.maxSpeed=0;state.altitude=null;state.maxAltitude=null;state.minAltitude=null;state.totalAscent=0;state.totalDescent=0;state.lastAltitude=null;state.lastAutoLapKm=0;startRideCountdown();}
function startClock() {
  clearInterval(state.timer);let telemetryTick=0;
  state.timer=setInterval(()=>{
    if(state.page!=='live')return;
    telemetryTick+=1;
    if(state.paused){state.restSeconds+=1;if(state.autoPaused&&rideSettings.autoPause){if(state.speed<rideSettings.threshold)state.autoPauseResumeSeconds=0;else if(++state.autoPauseResumeSeconds>=rideSettings.recoverySeconds){state.paused=false;state.autoPaused=false;state.autoPauseLowSeconds=0;state.autoPauseResumeSeconds=0;}}}
    else {state.seconds+=1;if(rideSettings.autoPause&&state.speed<rideSettings.threshold){state.autoPauseLowSeconds=(state.autoPauseLowSeconds||0)+1;if(state.autoPauseLowSeconds>=rideSettings.judgementSeconds){state.paused=true;state.autoPaused=true;state.autoPauseResumeSeconds=0;}}else state.autoPauseLowSeconds=0;
      if(rideSettings.autoLap&&state.rideDistance>=((state.lastAutoLapKm||0)+5)){state.lastAutoLapKm=Math.floor(state.rideDistance/5)*5;showToast('已完成 '+state.lastAutoLapKm+' km 自动计圈');}
    }
    if(rideSettings.crashSave)localStorage.setItem('cloudRideLastRide',JSON.stringify({seconds:state.seconds,restSeconds:state.restSeconds,distance:state.rideDistance,track:state.rideTrack,paused:true}));else localStorage.removeItem('cloudRideLastRide');
    renderLiveState();
  },1000);
}

function openEndSheet() {
  state.wasPaused = state.paused;
  state.paused = true;
  renderLiveState();
  document.getElementById('endSheet').classList.add('show');
  document.getElementById('endSheet').setAttribute('aria-hidden', 'false');
}

function closeEndSheet(shouldEnd) {
  document.getElementById('endSheet').classList.remove('show');
  document.getElementById('endSheet').setAttribute('aria-hidden', 'true');
  if (shouldEnd) {
    clearInterval(state.timer);
    stopRideGpsTracking();
    state.rideDistance=Number(state.rideDistance.toFixed(3));const previousLevel=calculateAccountLevel(state.levelDistance).level;if(state.rideDistance>0){const endedAt=new Date(),elapsed=Math.max(1,rideElapsed()),pad=n=>String(n).padStart(2,'0'),record={id:'ride-'+endedAt.getTime(),date:endedAt.getFullYear()+'-'+pad(endedAt.getMonth()+1)+'-'+pad(endedAt.getDate()),time:pad(endedAt.getHours())+':'+pad(endedAt.getMinutes()),month:endedAt.getFullYear()+'年'+pad(endedAt.getMonth()+1)+'月',distance:state.rideDistance,average:Number((state.rideDistance/(elapsed/3600)).toFixed(1)),duration:formatTime(elapsed),durationSeconds:elapsed,track:compressGpsTrack(state.rideTrack,1000),maxSpeed:state.maxSpeed,ascent:state.totalAscent,descent:state.totalDescent,rideMode:'outdoor',scene:state.rideScene||'general',sensorDataValid:false,source:'手机GPS定位',createdAt:endedAt.toISOString()};rideHistoryRecords.unshift(record);recalculateRideLedger();localStorage.setItem('cloudRideHistoryRecords',JSON.stringify(rideHistoryRecords));localStorage.setItem('cloudRideTotalDistance',String(state.totalDistance));currentAccount.points=getPointBalance();localStorage.setItem('cloudRideFounderPoints',String(currentAccount.points));const newLevel=calculateAccountLevel(state.levelDistance);if(newLevel.level>previousLevel)showToast('🎉恭喜升级【'+newLevel.title+' Lv'+newLevel.level+'】 '+newLevel.slogan,4500);else if(!record.levelEligible&&record.validationReasons?.length)showToast('记录已保存，但未计入等级：'+record.validationReasons[0],3500);}else{recalculateRideLedger();}    state.paused = false;
    localStorage.removeItem('cloudRideLastRide');
    renderProfileAccount();
    renderReport();
    return;
  }
  state.paused = Boolean(state.wasPaused);
  renderLiveState();
}
function renderReport(){
  const distance=state.rideDistance;
  if(rideHistoryRecords[0]&&!rideHistoryRecords[0].mapMatchStatus)matchRideRecord(rideHistoryRecords[0]);
  document.getElementById('reportDistance').textContent=distance.toFixed(1);
  document.getElementById('reportDuration').textContent=formatTime(rideElapsed());
  document.getElementById('reportAverage').textContent = rideAverageSpeed().toFixed(1) + ' km/h';
  document.getElementById('reportMax').textContent = state.maxSpeed.toFixed(1) + ' km/h';
  document.getElementById('reportCalories').textContent = '—';
  document.getElementById('reportPoints').textContent=String(Math.floor(distance));
  document.getElementById('reportDate').textContent=new Date().toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
  showPage('report');
}
const profileDetailData={'profile-records':'骑行记录','profile-routes':'我的路线','profile-medals':'骑行勋章','profile-favorites':'我的收藏','profile-career':'最佳纪录','profile-devices':'智能设备','profile-calendar':'运动日历','profile-ability':'运动能力','profile-heatmap':'运动热力','profile-bike':'我的爱车'};

const rideHistoryRecords=(()=>{try{const records=JSON.parse(localStorage.getItem("cloudRideHistoryRecords")||"[]");return Array.isArray(records)?records.filter(record=>record&&record.id&&typeof record.source==="string"&&Number.isFinite(Number(record.distance))).map(record=>{const normalized={...record,rideMode:record.rideMode||"outdoor"},check=validateRideRecord(normalized);return {...normalized,validationStatus:check.valid?"valid":"excluded",levelDistance:check.eligibleDistance,validationReasons:check.reasons,durationSeconds:check.durationSeconds}}):[]}catch{return []}})();
recalculateRideLedger();localStorage.setItem('cloudRideTotalDistance',String(state.totalDistance));currentAccount.points=getPointBalance();localStorage.setItem('cloudRideFounderPoints',String(currentAccount.points));
let bikePhotoDraft='';
function syncPayload(){const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}};return {profile:profileInfo,rides:rideHistoryRecords,pointsSpent:Number(localStorage.getItem('cloudRidePointsSpent')||0),pointRewards:read('cloudRidePointRewards',[]),avatarFrame:localStorage.getItem('cloudRideAvatarFrame')||'',bike:read('cloudRideBike',{}),settings:rideSettings,metrics:metricSelections,following:[...state.following]};}
let accountSyncTimer=null;
async function syncAccountData(restore=false){const account=currentAccount.id;try{if(restore){const response=await fetch('/api/sync?accountId='+encodeURIComponent(account),{cache:'no-store'});if(!response.ok)throw new Error('同步服务不可用');const result=await response.json();if(result.data){const remote=result.data,localHadSynced=Boolean(localStorage.getItem('cloudRideLastSyncAt'));if(!localHadSynced){profileInfo={...profileInfo,...remote.profile};localStorage.setItem('cloudRideProfile',JSON.stringify(profileInfo));currentAccount={...currentAccount,...remote.account};localStorage.setItem('cloudRideCurrentAccount',JSON.stringify(currentAccount));if(remote.bike)localStorage.setItem('cloudRideBike',JSON.stringify(remote.bike));if(remote.settings){rideSettings={...rideSettingDefaults,...remote.settings};saveRideSettings();syncRideSettingsControls();}if(remote.metrics){metricSelections={...defaultMetricSelections,...remote.metrics};localStorage.setItem('cloudRideMetricSelections',JSON.stringify(metricSelections));}if(Array.isArray(remote.following)){state.following=new Set([...state.following,...remote.following]);localStorage.setItem('cloudRideFollowing',JSON.stringify([...state.following]));}localStorage.setItem('cloudRidePointsSpent',String(remote.pointsSpent||0));localStorage.setItem('cloudRidePointRewards',JSON.stringify(remote.pointRewards||[]));if(remote.avatarFrame)localStorage.setItem('cloudRideAvatarFrame',remote.avatarFrame);}const merged=new Map([...(remote.rides||[]),...rideHistoryRecords].map(record=>[record.id,record]));rideHistoryRecords.splice(0,rideHistoryRecords.length,...merged.values());localStorage.setItem('cloudRideHistoryRecords',JSON.stringify(rideHistoryRecords));recalculateRideLedger();localStorage.setItem('cloudRideTotalDistance',String(state.totalDistance));currentAccount.points=getPointBalance();renderProfileAccount();if(state.page==='level-benefits')renderLevelBenefitsPage();}}const response=await fetch('/api/sync',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId:account,data:{account:{id:currentAccount.id,name:currentAccount.name,registeredAt:currentAccount.registeredAt},...syncPayload()}})});if(!response.ok)throw new Error('同步服务不可用');localStorage.setItem('cloudRideLastSyncAt',new Date().toISOString());document.querySelectorAll('[data-sync-status]').forEach(el=>el.textContent='已保存到此设备的预览服务（非跨设备云端）');return true;}catch(error){document.querySelectorAll('[data-sync-status]').forEach(el=>el.textContent='当前设备保存 · 预览同步服务未连接');return false;}}
function scheduleAccountSync(){clearTimeout(accountSyncTimer);accountSyncTimer=setTimeout(()=>syncAccountData(false),500);}
async function matchRideRecord(record){if(!record||!Array.isArray(record.track)||record.track.length<2)return;record.mapMatchStatus='processing';try{const response=await fetch('/api/map-match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({points:record.track})}),result=await response.json();if(!response.ok)throw new Error(result.error||'轨迹匹配失败');record.mapMatchedTrack=result.points;record.mapMatchStatus='matched';}catch(error){record.mapMatchStatus=error.message==='amap_key_not_configured'?'key-required':'unavailable';}localStorage.setItem('cloudRideHistoryRecords',JSON.stringify(rideHistoryRecords));scheduleAccountSync();if(state.page==='profile-records'){const content=document.querySelector('#page-profile-records .profile-feature-content');if(content)content.innerHTML=profilePageMarkup('profile-records');}}
function openRideAppeal(recordId){const record=rideHistoryRecords.find(item=>item.id===recordId);if(!record)return;document.querySelector('.ride-appeal-mask')?.remove();const mask=document.createElement('div');mask.className='ride-appeal-mask';mask.innerHTML='<form class="ride-appeal-dialog"><button type="button" class="appeal-close" aria-label="关闭">×</button><h2>申请轨迹复核</h2><p>提交后会把本条骑行的 GPS 轨迹和复核说明发送到云遥预览服务，进入待复核队列。</p><label>说明<textarea name="note" rows="4" maxlength="1000" placeholder="请说明轨迹情况或提供辅助信息"></textarea></label><button type="submit" class="info-primary">提交复核申请</button></form>';document.body.append(mask);mask.querySelector('.appeal-close').onclick=()=>mask.remove();mask.onclick=event=>{if(event.target===mask)mask.remove();};mask.querySelector('form').onsubmit=async event=>{event.preventDefault();const note=new FormData(event.currentTarget).get('note');try{const response=await fetch('/api/appeals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId:currentAccount.id,rideId:record.id,reason:(record.validationReasons||[]).join('、')||'用户申请复核',note,track:record.track,distance:record.distance})}),result=await response.json();if(!response.ok)throw new Error(result.error||'提交失败');record.appealId=result.appeal.id;record.appealStatus='待人工复核';localStorage.setItem('cloudRideHistoryRecords',JSON.stringify(rideHistoryRecords));scheduleAccountSync();mask.remove();showToast('已提交到预览服务复核队列');}catch(error){showToast('提交失败：'+error.message);}};}
function profilePageMarkup(id){
 if(id==='profile-bike')return `<form id="bikeProfileForm" class="bike-profile-form"><div class="bike-photo-control"><button type="button" class="bike-photo-picker" id="bikePhotoButton"><img id="bikePhotoPreview" src="assets/bike-default.png" alt="自行车照片"></button><button type="button" class="bike-photo-caption" id="bikePhotoCaption">更换车辆照片</button></div><input id="bikeGalleryInput" type="file" accept="image/*" hidden><input id="bikeCameraInput" type="file" accept="image/*" capture="environment" hidden><input id="bikeFileInput" type="file" accept="image/*" hidden><div class="bike-photo-menu" id="bikePhotoMenu" hidden><div class="bike-photo-sheet"><div class="bike-photo-grabber"></div><h3>更换车辆照片</h3><button type="button" data-photo-source="gallery">照片图库</button><button type="button" data-photo-source="camera">拍照</button><button type="button" data-photo-source="file">选取文件</button><button type="button" class="bike-photo-cancel" data-photo-dismiss>取消</button></div></div><label>品牌<input name="brand" id="bikeBrand" placeholder="请输入自行车品牌"></label><label>型号<input name="model" id="bikeModel" placeholder="请输入自行车型号"></label><label>类型<select name="type" id="bikeType"><option value="">请选择</option><option>公路车</option><option>山地车</option><option>砾石车</option><option>城市通勤车</option><option>折叠车</option><option>其他</option></select></label><label>车架尺寸<input name="size" id="bikeSize" placeholder="例如：M / 54cm"></label><label>轮胎规格<button type="button" class="bike-tire-select" id="bikeTireDisplay">请选择轮胎规格<span>⌄</span></button><input type="hidden" name="tireSpec" id="bikeTireSpec"><input type="hidden" name="tireCircumference" id="bikeTireCircumference"><div class="tire-spec-menu" id="tireSpecMenu" hidden><div class="tire-spec-sheet"><div class="bike-photo-grabber"></div><header><h3>选择轮胎规格</h3><button type="button" data-tire-dismiss aria-label="关闭">×</button></header><p>选择规格后会自动记录轮胎周长</p><div class="tire-spec-table-head"><span>ETRTO</span><span>轮胎尺寸</span><span>周长</span><span>操作</span></div><div class="tire-spec-list" id="tireSpecList"></div><button type="button" class="bike-photo-cancel" data-tire-dismiss>取消</button></div></div></label><label>购买年份<input name="purchaseYear" id="bikePurchaseYear" type="number" min="1970" max="2026" placeholder="例如：2024"></label><label>备注<textarea name="note" id="bikeNote" rows="3" placeholder="为爱车添加备注"></textarea></label><button class="info-primary" type="submit">保存爱车</button></form>`;
 if(id==='profile-records')return '<div class="ride-history-page">'+renderRideHistory()+'</div>';
 if(id==='profile-routes')return `<div class="profile-detail-card"><h2>我的路线</h2><p>收藏路线与自建路线会显示在这里。</p><button class="suggested-card" data-route-id="lake-easy"><img src="assets/02.jpg" alt="环湖绿道轻骑线"><div><b>环湖绿道轻骑线</b><small>12 km · 爬升 180 m</small></div><span>›</span></button></div>`;
 if(id==='profile-medals'){const total=rideHistoryRecords.reduce((sum,item)=>sum+Number(item.distance||0),0),ascent=rideHistoryRecords.reduce((sum,item)=>sum+Number(item.ascent||0),0),medals=[['🚴','初次出发',rideHistoryRecords.length>0,'完成首条骑行记录'],['🏅','百公里',total>=100,`累计里程 ${total.toFixed(1)} / 100 km`],['⛰','爬升挑战',ascent>=1000,`累计爬升 ${Math.round(ascent)} / 1000 m`],['🌅','早起骑士',rideHistoryRecords.some(item=>Number(String(item.time||'').slice(0,2))<6),'06:00 前出发']];return `<div class="profile-detail-card"><h2>骑行勋章</h2><div class="medal-grid">${medals.map(([icon,name,earned,description])=>`<div class="${earned?'earned':'unearned'}">${icon}<b>${name}</b><small>${earned?'已获得 · ':''}${description}</small></div>`).join('')}</div></div>`;}
 if(id==='profile-favorites')return `<div class="profile-detail-card"><h2>我的收藏</h2><button class="suggested-card" data-route-id="lake-easy"><img src="assets/02.jpg" alt="环湖绿道轻骑线"><div><b>环湖绿道轻骑线</b><small>精选路线</small></div><span>›</span></button></div>`;
 if(id==='profile-career'){const longest=rideHistoryRecords.reduce((best,item)=>!best||Number(item.distance)>Number(best.distance)?item:best,null),maxSpeed=rideHistoryRecords.reduce((max,item)=>Math.max(max,Number(item.maxSpeed)||0),0),maxAscent=rideHistoryRecords.reduce((max,item)=>Math.max(max,Number(item.ascent)||0),0),longestDuration=rideHistoryRecords.reduce((max,item)=>Math.max(max,Number(item.durationSeconds)||parseDuration(item.duration)),0),formatBestTime=seconds=>seconds?formatTime(seconds):'—';return `<div class="profile-detail-card"><h2>最佳纪录</h2><div class="profile-metrics"><div><b>${longest?Number(longest.distance).toFixed(2)+' km':'—'}</b><small>单次最长距离</small></div><div><b>${maxSpeed?maxSpeed.toFixed(1)+' km/h':'—'}</b><small>最高时速</small></div><div><b>${maxAscent?Math.round(maxAscent)+' m':'—'}</b><small>单次最高爬升</small></div><div><b>${formatBestTime(longestDuration)}</b><small>最长骑行时间</small></div></div><small>统计来源：本机保存的骑行记录；完成真实 GPS 骑行后更新。</small></div>`;}
 if(id==='profile-devices')return `<div class="profile-detail-card"><h2>智能设备</h2><p>连接设备后可同步心率、踏频和功率数据。</p><button class="device-connect" data-device="心率带">＋ 连接心率带</button><button class="device-connect" data-device="踏频器">＋ 连接踏频器</button><button class="device-connect" data-device="功率计">＋ 连接功率计</button><small>设备服务尚未接入。</small></div>`;
 if(id==='profile-calendar'){const now=new Date(),days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),recordedDays=new Set(rideHistoryRecords.filter(item=>String(item.date||'').startsWith(now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'))).map(item=>Number(String(item.date).slice(-2))));return `<div class="profile-detail-card"><h2>${now.getFullYear()}年${now.getMonth()+1}月</h2><div class="calendar-grid">${Array.from({length:days},(_,i)=>`<span class="${recordedDays.has(i+1)?'ride-day':''}">${i+1}</span>`).join('')}</div><p>本月骑行 ${recordedDays.size} 天 · 里程 ${rideHistoryRecords.filter(item=>String(item.date||'').startsWith(now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'))).reduce((sum,item)=>sum+Number(item.distance||0),0).toFixed(2)} km（来源：骑行记录）</p></div>`;}
 if(id==='profile-ability')return `<div class="profile-detail-card"><h2>运动能力</h2><div class="profile-metrics"><div><b>${profileInfo.ftp||'—'} W</b><small>FTP</small></div><div><b>${profileInfo.maxHeartRate||'—'} bpm</b><small>最大心率</small></div><div><b>${profileInfo.height||'—'} cm</b><small>身高</small></div><div><b>${profileInfo.weight||'—'} kg</b><small>体重</small></div></div><p>完善身体数据并完成骑行后，可用于训练分析。</p><button class="info-secondary" data-page="personal-home">完善个人资料</button></div>`;
 if(id==='profile-heatmap'){const points=rideHistoryRecords.flatMap(record=>record.track||[]).filter(point=>Number.isFinite(Number(point.latitude))&&Number.isFinite(Number(point.longitude)));if(!points.length)return `<div class="profile-detail-card"><h2>运动热力</h2><p>暂无包含 GPS 坐标的骑行记录，开始户外骑行并保存轨迹后，这里会按真实位置生成活动热区。</p></div>`;const minLat=Math.min(...points.map(point=>point.latitude)),maxLat=Math.max(...points.map(point=>point.latitude)),minLon=Math.min(...points.map(point=>point.longitude)),maxLon=Math.max(...points.map(point=>point.longitude)),project=point=>({x:10+(point.longitude-minLon)/(maxLon-minLon||1)*280,y:10+(maxLat-point.latitude)/(maxLat-minLat||1)*180}),dots=points.map(point=>{const p=project(point);return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8"/>`;}).join('');return `<div class="profile-detail-card"><h2>运动热力</h2><p>基于 ${points.length} 个已保存 GPS 轨迹点</p><svg class="activity-heatmap" viewBox="0 0 300 200" role="img" aria-label="根据历史 GPS 轨迹生成的活动热区"><rect width="300" height="200" rx="14"/><g>${dots}</g></svg></div>`;}
 return '';
}
function renderProfileDetail(id){const title=profileDetailData[id];if(!title)return;let page=document.getElementById(`page-${id}`);if(!page){page=document.createElement('section');page.className='page info-page';page.id=`page-${id}`;document.querySelector('.screen-shell').append(page);}page.setAttribute('aria-label',title);page.innerHTML=`<header class="subpage-head">${id==='profile-bike'?'<button data-page="profile" aria-label="返回我的页面"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"/></svg></button>':'<button data-page="profile"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"/></svg></button>'}<h1>${title}</h1><span></span></header><div class="profile-feature-content">${profilePageMarkup(id)}</div>`;if(id==='profile-bike')loadBikeProfile();}
function loadBikeProfile(){let bike={};try{bike=JSON.parse(localStorage.getItem('cloudRideBike')||'{}');}catch{};['brand','model','type','size','tireSpec','tireCircumference','purchaseYear','note'].forEach(key=>{const field=document.getElementById(`bike${key[0].toUpperCase()}${key.slice(1)}`);if(field)field.value=bike[key]||'';});bikePhotoDraft=bike.photo||'assets/bike-default.png';const preview=document.getElementById('bikePhotoPreview');if(preview){preview.src=bikePhotoDraft;preview.classList.toggle('placeholder',!bikePhotoDraft);}const tireDisplay=document.getElementById('bikeTireDisplay');if(tireDisplay){const spec=bike.tireSpec||'';tireDisplay.innerHTML=spec?spec+'<span>⌄</span>':'请选择轮胎规格<span>⌄</span>';document.getElementById('tireSpecList').innerHTML=tireSpecificationRows(spec);}}
function showToast(message,duration=2200){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),duration);}
const cityByProvince={'北京市':['北京市'],'天津市':['天津市'],'河北省':['石家庄市','唐山市','保定市'],'山西省':['太原市','大同市','运城市'],'内蒙古自治区':['呼和浩特市','包头市','鄂尔多斯市'],'辽宁省':['沈阳市','大连市','鞍山市'],'吉林省':['长春市','吉林市','延边朝鲜族自治州'],'黑龙江省':['哈尔滨市','齐齐哈尔市','大庆市'],'上海市':['上海市'],'江苏省':['南京市','苏州市','无锡市'],'浙江省':['杭州市','宁波市','温州市'],'安徽省':['合肥市','芜湖市','黄山市'],'福建省':['福州市','厦门市','泉州市'],'江西省':['南昌市','赣州市','九江市'],'山东省':['济南市','青岛市','烟台市'],'河南省':['郑州市','洛阳市','开封市'],'湖北省':['武汉市','宜昌市','襄阳市'],'湖南省':['长沙市','岳阳市','张家界市'],'广东省':['广州市','深圳市','珠海市'],'广西壮族自治区':['南宁市','桂林市','柳州市'],'海南省':['海口市','三亚市'],'重庆市':['重庆市'],'四川省':['成都市','绵阳市','乐山市'],'贵州省':['贵阳市','遵义市','六盘水市'],'云南省':['昆明市','大理白族自治州','丽江市'],'西藏自治区':['拉萨市','日喀则市'],'陕西省':['西安市','咸阳市','宝鸡市'],'甘肃省':['兰州市','天水市','敦煌市'],'青海省':['西宁市','海东市'],'宁夏回族自治区':['银川市','中卫市'],'新疆维吾尔自治区':['乌鲁木齐市','喀什地区','伊犁哈萨克自治州'],'台湾省':['台北市','高雄市'],'香港特别行政区':['香港特别行政区'],'澳门特别行政区':['澳门特别行政区']};
const districtsByCity={'北京市':['东城区','西城区','朝阳区','海淀区'],'天津市':['和平区','河西区','南开区'],'上海市':['黄浦区','徐汇区','浦东新区'],'重庆市':['渝中区','江北区','渝北区'],'广州市':['越秀区','天河区','海珠区'],'深圳市':['福田区','南山区','罗湖区'],'杭州市':['上城区','拱墅区','西湖区'],'南京市':['玄武区','秦淮区','鼓楼区'],'成都市':['锦江区','青羊区','武侯区'],'武汉市':['江岸区','武昌区','洪山区'],'西安市':['新城区','碑林区','雁塔区'],'苏州市':['姑苏区','吴中区','相城区'],'青岛市':['市南区','市北区','崂山区']};
const provinceList=Object.keys(cityByProvince);
function setSelectOptions(select,values,placeholder,current=''){select.replaceChildren(new Option(placeholder,''));values.forEach(value=>select.add(new Option(value,value)));if(values.includes(current))select.value=current;}
function populateCities(selected=''){const province=document.getElementById('regionProvince').value;const cities=cityByProvince[province]||[];setSelectOptions(document.getElementById('regionCity'),cities,'选择城市',selected);populateDistricts(profileInfo.district);}
function populateDistricts(selected=''){const city=document.getElementById('regionCity').value;const districts=districtsByCity[city]||['市辖区','其他区县'];setSelectOptions(document.getElementById('regionDistrict'),districts,'选择区县',selected);}
function formatMembershipDuration(value){const start=new Date(value);if(Number.isNaN(start.getTime()))return '注册时间未记录';const now=new Date();let months=(now.getFullYear()-start.getFullYear())*12+now.getMonth()-start.getMonth();if(now.getDate()<start.getDate())months--;months=Math.max(0,months);return '已加入云遥'+Math.floor(months/12)+'年'+(months%12)+'个月';}
function populateProfileEdit(){const form=document.getElementById('profileEditForm');const registration=document.getElementById('profileRegistration');if(registration)registration.textContent=formatMembershipDuration(currentAccount.registeredAt);const registrationDate=document.getElementById('profileRegistrationDate');if(registrationDate){const date=currentAccount.registeredAt?new Date(currentAccount.registeredAt):null;registrationDate.textContent=date&&!Number.isNaN(date.getTime())?date.getFullYear()+'.'+String(date.getMonth()+1).padStart(2,'0')+'.'+String(date.getDate()).padStart(2,'0'):'注册时间：未记录';}for(const [key,id] of Object.entries({nickname:'editNickname',bio:'editBio',gender:'editGender',address:'editAddress',birthday:'editBirthday',height:'editHeight',weight:'editWeight',ftp:'editFtp',maxHeartRate:'editMaxHeartRate'}))form.elements[key].value=profileInfo[key]||'';const status=document.getElementById('realNameStatus'),action=document.getElementById('realNameAction');if(profileInfo.realNameStatus==='已认证'&&profileInfo.realNameName){const shield=document.createElementNS('http://www.w3.org/2000/svg','svg');shield.setAttribute('viewBox','0 0 24 24');shield.setAttribute('aria-hidden','true');shield.innerHTML='<path d="M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5l8-3Z"/><path d="m8.5 12 2.3 2.3 4.8-5"/>';status.replaceChildren(shield,document.createTextNode(profileInfo.realNameName));status.classList.add('real-name-verified');action.textContent='已认证';}else{status.textContent='未认证';status.classList.remove('real-name-verified');action.textContent='开始认证';}document.getElementById('editAvatarPreview').src=profileInfo.avatar||'assets/15.jpg';setSelectOptions(document.getElementById('regionProvince'),provinceList,'选择省份',profileInfo.province);populateCities(profileInfo.city);populateDistricts(profileInfo.district);}
function renderPersonalHome(){populateProfileEdit();}

renderTabs();
const memberLevelLabel=document.getElementById('profileLevelTitle');if(memberLevelLabel){const memberLevelPill=document.createElement('span'),identity=memberLevelLabel.closest('.profile-identity');memberLevelPill.id='profileLevelTitle';memberLevelPill.className='member-level-pill';memberLevelPill.textContent=memberLevelLabel.textContent;memberLevelLabel.replaceWith(memberLevelPill);const tags=identity?.querySelectorAll(':scope > span');if(tags?.length>1)tags[tags.length-1].after(memberLevelPill);else identity?.append(memberLevelPill);}
showPage('welcome');
window.setTimeout(() => { if (state.page === 'welcome') showPage('login'); }, 6500);

const accountSyncStorageKeys=new Set(['cloudRideProfile','cloudRideCurrentAccount','cloudRideBike','cloudRideSettings','cloudRideMetricSelections','cloudRideFollowing','cloudRidePointsSpent','cloudRidePointRewards','cloudRideAvatarFrame','cloudRideHistoryRecords','cloudRideFounderPoints']);
const nativeStorageSetItem=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){nativeStorageSetItem.call(this,key,value);if(accountSyncStorageKeys.has(key))scheduleAccountSync();};
syncAccountData(true);
fetch('/api/health',{cache:'no-store'}).then(response=>response.json()).then(health=>{const note=document.querySelector('.level-validation-note');if(note)note.textContent='本机预览服务已连接：账号资料、积分及骑行记录可保存在此设备的服务端；跨设备云同步尚未部署。'+(health.mapMatchConfigured?'高德轨迹纠偏已配置（仅用于路线显示，不改原始里程）。':'高德轨迹纠偏待配置 Web 服务 Key。')+'申诉可提交到本机待复核队列，在线人工审核后台尚未接入。';}).catch(()=>{});

document.addEventListener('click',event=>{
  const messageDestination=event.target.closest('[data-message-destination="all"]');if(messageDestination){messageDestination.closest('.message-filters').querySelectorAll('[data-message-destination]').forEach(button=>button.classList.toggle('selected',button===messageDestination));return;}
  if(event.target.closest('#bikeTireDisplay')){document.getElementById('tireSpecMenu').hidden=false;return;}const tireOption=event.target.closest('[data-tire-index]');if(tireOption){const tire=tireSpecificationData[Number(tireOption.dataset.tireIndex)],value=tire.etrto+'（'+tire.size+'）';document.getElementById('bikeTireSpec').value=value;document.getElementById('bikeTireCircumference').value=String(tire.circumference);document.getElementById('bikeTireDisplay').innerHTML=value+'<span>⌄</span>';document.getElementById('tireSpecMenu').hidden=true;document.querySelectorAll('.tire-spec-option').forEach(row=>row.classList.toggle('selected',row===tireOption));return;}if(event.target.closest('[data-tire-dismiss]')||event.target.id==='tireSpecMenu'){const menu=document.getElementById('tireSpecMenu');if(menu)menu.hidden=true;return;}if(event.target.closest('#bikePhotoButton,#bikePhotoCaption')){document.getElementById('bikePhotoMenu').hidden=false;return;}
  const photoSource=event.target.closest('[data-photo-source]');if(photoSource){const inputId={gallery:'bikeGalleryInput',camera:'bikeCameraInput',file:'bikeFileInput'}[photoSource.dataset.photoSource];document.getElementById('bikePhotoMenu').hidden=true;document.getElementById(inputId)?.click();return;}if(event.target.closest('[data-photo-dismiss]')||event.target.id==='bikePhotoMenu'){const menu=document.getElementById('bikePhotoMenu');if(menu)menu.hidden=true;return;}
  const historyToggle=event.target.closest('.history-month-toggle');if(historyToggle){const group=historyToggle.closest('.history-month'),list=group.querySelector('.history-record-list'),expanded=group.classList.toggle('expanded');historyToggle.setAttribute('aria-expanded',String(expanded));list.hidden=!expanded;return;}const device=event.target.closest('.device-connect');if(device){const active=device.dataset.connected==='true';device.dataset.connected=String(!active);device.textContent=active?`＋ 连接${device.dataset.device}`:`✓ 已连接${device.dataset.device}`;return;}
  const route=event.target.closest('[data-route-id]');if(route){renderRouteDetail(route.dataset.routeId);return;}
  const category=event.target.closest('[data-category]');if(category){renderDiscoveryCategory(category.dataset.category);showPage('discovery-category');return;}
  const connection=event.target.closest('[data-connection-tab]');if(connection){renderConnections(connection.dataset.connectionTab);return;}
  const follow=event.target.closest('.follow-button');if(follow){const name=follow.closest('.people-row')?.querySelector('b')?.textContent;if(name){if(state.following.has(name))state.following.delete(name);else state.following.add(name);localStorage.setItem('cloudRideFollowing',JSON.stringify([...state.following]));follow.classList.toggle('following',state.following.has(name));follow.textContent=state.following.has(name)?'已关注':'＋关注';document.getElementById('followingCount').textContent=String(state.following.size);}return;}
  const rewardButton=event.target.closest('[data-redeem-reward]');if(rewardButton){const item=pointExchangeCatalog.find(entry=>entry.id===rewardButton.dataset.redeemReward);if(!item)return;let owned=[];try{owned=JSON.parse(localStorage.getItem('cloudRidePointRewards')||'[]');}catch{}if(owned.includes(item.id)){showToast('该外观已兑换');return;}const balance=getPointBalance();if(balance<item.cost){showToast('积分不足');return;}localStorage.setItem('cloudRidePointsSpent',String(Number(localStorage.getItem('cloudRidePointsSpent')||0)+item.cost));owned.push(item.id);localStorage.setItem('cloudRidePointRewards',JSON.stringify(owned));localStorage.setItem('cloudRideAvatarFrame',item.id);const avatarWrap=document.querySelector('.avatar-wrap');if(avatarWrap)avatarWrap.dataset.avatarFrame=item.id;currentAccount.points=getPointBalance();localStorage.setItem('cloudRideFounderPoints',String(currentAccount.points));renderProfileAccount();renderLevelBenefitsPage();showToast('兑换成功：'+item.name);return;}  const editAccount=event.target.closest('[data-edit-account]');if(editAccount){const key=editAccount.dataset.editAccount,labels={phone:'手机号',email:'邮箱',wechat:'微信号',qq:'QQ号',alipay:'支付宝账号'};state.activeAccountEdit=key;document.getElementById('accountEditTitle').textContent='修改'+labels[key];document.getElementById('accountEditLabel').textContent='新'+labels[key];const input=document.getElementById('accountEditValue');input.value=currentAccount[key]||'';input.type=key==='email'?'email':'text';document.getElementById('accountEditModal').hidden=false;input.focus();return;}if(event.target.closest('[data-account-edit-close]')||event.target.id==='accountEditModal'){document.getElementById('accountEditModal').hidden=true;return;}const reveal=event.target.closest('[data-reveal-field]');if(reveal){const key=reveal.dataset.revealField;const value=document.querySelector('[data-bound-account="'+key+'"]');const shown=reveal.dataset.shown==='true';value.textContent=shown?maskAccountField(key,currentAccount[key]):(currentAccount[key]||'未绑定');reveal.dataset.shown=String(!shown);reveal.textContent=shown?'显示':'隐藏';return;}
  const page=event.target.closest('[data-page]');if(page){if(['terms','privacy'].includes(page.dataset.page))state.agreementReturnPage=state.page;if(page.dataset.page==='agreement-back')showPage(state.agreementReturnPage);else showPage(page.dataset.page);return;}
  const toggle=event.target.closest('.toggle');if(toggle){const key=settingToggleKeys[toggle.getAttribute('aria-label')];if(key){rideSettings[key]=!rideSettings[key];toggle.classList.toggle('on',rideSettings[key]);if(key==='crashSave'&&!rideSettings[key])localStorage.removeItem('cloudRideLastRide');if(key==='autoPause'&&!rideSettings[key]&&state.autoPaused){state.autoPaused=false;state.paused=false;renderLiveState();}saveRideSettings();}return;}
  const step=event.target.closest('[data-step]');if(step){const value=step.parentElement.querySelector('span'),row=step.closest('.setting-row'),title=row?.querySelector('.setting-row>div:first-child b')?.textContent.trim(),key=settingStepperKeys[title],min=key==='threshold'?1:1,max=key==='threshold'?60:300,next=Math.max(min,Math.min(max,Number(value.textContent)+Number(step.dataset.step)));value.textContent=String(next);if(key){rideSettings[key]=next;saveRideSettings();}}
});
document.addEventListener('change',event=>{if(!['bikeGalleryInput','bikeCameraInput','bikeFileInput'].includes(event.target.id))return;const file=event.target.files?.[0];if(!file)return;const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas'),scale=Math.min(1,720/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);bikePhotoDraft=canvas.toDataURL('image/jpeg',.84);document.getElementById('bikePhotoPreview').src=bikePhotoDraft;document.getElementById('bikePhotoPreview').classList.remove('placeholder');URL.revokeObjectURL(image.src);};image.src=URL.createObjectURL(file);});
document.addEventListener('submit',event=>{if(event.target.id!=='bikeProfileForm')return;event.preventDefault();const form=new FormData(event.target);localStorage.setItem('cloudRideBike',JSON.stringify({brand:String(form.get('brand')||'').trim(),model:String(form.get('model')||'').trim(),type:String(form.get('type')||''),size:String(form.get('size')||'').trim(),tireSpec:String(form.get('tireSpec')||'').trim(),tireCircumference:String(form.get('tireCircumference')||'').trim(),purchaseYear:String(form.get('purchaseYear')||'').trim(),note:String(form.get('note')||'').trim(),photo:bikePhotoDraft}));showToast('爱车资料已保存');});

document.getElementById('sendRegisterCode').addEventListener('click',()=>{
  const target=document.getElementById('registerAccount').value.trim();
  const isPhone=/^1[3-9]\d{9}$/.test(target),isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  if(!isPhone&&!isEmail){showToast('请输入有效的手机号或邮箱地址');return;}
  registrationVerificationTarget=target;
  registrationVerificationCode=String(Math.floor(1000+Math.random()*9000));
  showToast(`本地演示验证码：${registrationVerificationCode}（短信/邮件服务未接入）`);
});
document.getElementById('registrationForm').addEventListener('submit',event=>{
  event.preventDefault();
  if(!document.getElementById('registerAgreement').checked){showToast('请先阅读并同意用户协议与隐私政策');return;}
  const form=new FormData(event.currentTarget);
  const account=String(form.get('account')||'').trim(),code=String(form.get('verificationCode')||'').trim();
  if(!registrationVerificationCode||registrationVerificationTarget!==account||registrationVerificationCode!==code){showToast('验证码错误或已失效，请重新获取');return;}
  const isPhone=/^1[3-9]\d{9}$/.test(account);
  currentAccount={id:nextUserId(),name:'云遥骑友',phone:isPhone?account:'',email:isPhone?'':account,wechat:'',qq:'',alipay:'',points:0,registeredAt:new Date().toISOString()};
  state.totalDistance=0;localStorage.setItem('cloudRideTotalDistance','0');rideHistoryRecords.splice(0);localStorage.removeItem('cloudRideHistoryRecords');localStorage.removeItem('cloudRidePointsSpent');localStorage.removeItem('cloudRidePointRewards');localStorage.removeItem('cloudRideAvatarFrame');state.levelDistance=0;state.verifiedOutdoorDistance=0;
  localStorage.setItem('cloudRideCurrentAccount',JSON.stringify(currentAccount));
  registrationVerificationCode=null;registrationVerificationTarget='';
  event.currentTarget.reset();
  document.getElementById('registerAgreement').checked=true;
  showPage('profile');
});
document.getElementById('regionProvince').addEventListener('change',()=>populateCities(''));
document.getElementById('regionCity').addEventListener('change',()=>populateDistricts(''));
document.getElementById('changeAvatar').addEventListener('click',()=>document.getElementById('avatarPicker').click());
document.getElementById('avatarPicker').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas'),size=512;canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d'),scale=Math.max(size/image.width,size/image.height),w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(size-w)/2,(size-h)/2,w,h);profileInfo.avatar=canvas.toDataURL('image/jpeg',.82);document.getElementById('editAvatarPreview').src=profileInfo.avatar;URL.revokeObjectURL(image.src);};image.src=URL.createObjectURL(file);});
document.getElementById('realNameAction').addEventListener('click',()=>{if(profileInfo.realNameStatus==='已认证'){showToast('您已实名认证',2000);return;}showPage('real-name');});
function validateIdentityNumber(value){const id=value.trim().toUpperCase();if(!/^\d{17}[\dX]$/.test(id)||id.slice(0,6)==='000000')return false;const birth=id.slice(6,14),date=new Date(Number(birth.slice(0,4)),Number(birth.slice(4,6))-1,Number(birth.slice(6,8)));if(date.getFullYear()!==Number(birth.slice(0,4))||date.getMonth()+1!==Number(birth.slice(4,6))||date.getDate()!==Number(birth.slice(6,8))||date>new Date())return false;const weights=[7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2],codes=['1','0','X','9','8','7','6','5','4','3','2'];const sum=weights.reduce((total,weight,index)=>total+Number(id[index])*weight,0);return codes[sum%11]===id[17];}
document.getElementById('realNameForm').addEventListener('submit',event=>{event.preventDefault();const name=document.getElementById('realNameInput').value.trim(),identity=document.getElementById('identityNumberInput').value;if(!/^[A-Za-z\u3400-\u9fff·]{2,30}$/.test(name)){showToast('请输入有效的真实姓名');return;}if(!validateIdentityNumber(identity)){showToast('身份证号码格式或校验码不正确');return;}profileInfo.realNameName=name;profileInfo.realNameStatus='已认证';localStorage.setItem('cloudRideProfile',JSON.stringify(profileInfo));event.currentTarget.reset();showPage('personal-home');showToast('实名认证成功');});
document.getElementById('profileEditForm').addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.currentTarget);for(const key of ['nickname','bio','gender','address','birthday','height','weight','ftp','maxHeartRate'])profileInfo[key]=String(data.get(key)||'').trim();profileInfo.province=document.getElementById('regionProvince').value;profileInfo.city=document.getElementById('regionCity').value;profileInfo.district=document.getElementById('regionDistrict').value; currentAccount.name=profileInfo.nickname||'云遥骑友';localStorage.setItem('cloudRideProfile',JSON.stringify(profileInfo));localStorage.setItem('cloudRideCurrentAccount',JSON.stringify(currentAccount));renderProfileAccount();showPage('personal-home');showToast('个人资料已保存');});
document.getElementById('loginForm').addEventListener('submit', event => {
  event.preventDefault();
  showPage('home');
});
document.getElementById('logoutButton').addEventListener('click',()=>{clearInterval(state.timer);clearInterval(state.countTimer);showPage('login');showToast('已退出登录');});
document.getElementById('gpsPrecisionButton').addEventListener('click',event=>{const modes=['high','balanced','low'],index=modes.indexOf(rideSettings.gpsPrecision||'high');rideSettings.gpsPrecision=modes[(index+1)%modes.length];saveRideSettings();syncRideSettingsControls();if(state.location){state.location=null;state.locationPromise=null;}showToast('GPS 精度：'+event.currentTarget.textContent);});
const rideSceneSelect=document.getElementById('rideSceneSelect');if(rideSceneSelect){rideSceneSelect.value=state.rideScene;rideSceneSelect.addEventListener('change',event=>{state.rideScene=event.target.value;localStorage.setItem('cloudRideRideScene',state.rideScene);});}
document.querySelector('.eye').addEventListener('click', event => {
  const button = event.currentTarget;
  const input = button.parentElement.querySelector('input');
  const showing = input.type === 'password';
  input.type = showing ? 'text' : 'password';
  button.setAttribute('aria-label', showing ? '隐藏密码' : '显示密码');
  button.setAttribute('aria-pressed', String(showing));
  button.innerHTML = showing
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/><path d="m4 4 16 16"/></svg>';
});
document.getElementById('startRide').addEventListener('click', beginRide);
if(document.getElementById('mapRecenter'))document.getElementById('mapRecenter').addEventListener('click',()=>locateMap(true));
function beginMapNavigation(){document.getElementById('routePreviewOverlay').hidden=true;locateCurrentPosition(true).then(()=>{updateLocationLabels();showToast('已定位，导航预览已开始');}).catch(error=>showToast(error.message));}
document.getElementById('startNavigation').addEventListener('click',beginMapNavigation);
document.getElementById('previewStartNavigation').addEventListener('click',beginMapNavigation);
document.getElementById('routePreviewButton').addEventListener('click',()=>{document.getElementById('mapLayerMenu').hidden=true;document.getElementById('routePreviewOverlay').hidden=false;});
document.getElementById('closeRoutePreview').addEventListener('click',()=>{document.getElementById('routePreviewOverlay').hidden=true;});
document.getElementById('routePreviewOverlay').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.hidden=true;});
document.getElementById('mapLayersButton').addEventListener('click',()=>{const menu=document.getElementById('mapLayerMenu');menu.hidden=!menu.hidden;});
document.getElementById('mapLayerMenu').addEventListener('click',event=>{const option=event.target.closest('[data-map-layer]');if(!option)return;const map=document.getElementById('rideMap'),layer=option.dataset.mapLayer;map.dataset.layer=layer;map.classList.remove('layer-satellite','layer-roadbook');if(layer!=='standard')map.classList.add(`layer-${layer}`);document.querySelectorAll('[data-map-layer]').forEach(button=>button.classList.toggle('selected',button===option));document.getElementById('mapLayerMenu').hidden=true;if(state.amap){state.amap.setMapStyle(layer==='satellite'?'amap://styles/dark':layer==='roadbook'?'amap://styles/whitesmoke':'amap://styles/normal');}showToast(`已切换${option.textContent.trim()}`);});
if(document.getElementById('locateWeather'))document.getElementById('locateWeather').addEventListener('click',()=>locateWeather(true));
if(document.getElementById('locateWeatherMain'))document.getElementById('locateWeatherMain').addEventListener('click',()=>locateWeather(true));
if(document.getElementById('locateGreenways'))document.getElementById('locateGreenways').addEventListener('click',()=>locateWeather(true));
if(document.getElementById('saveRoute'))document.getElementById('saveRoute').addEventListener('click',event=>{const saved=event.currentTarget.dataset.saved==='true';event.currentTarget.dataset.saved=String(!saved);event.currentTarget.textContent=saved?'☆ 收藏路线':'★ 已收藏';});
document.getElementById('musicButton').addEventListener('click',()=>document.getElementById('musicPicker').click());
document.getElementById('musicPicker').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;const audio=document.getElementById('rideAudio');audio.src=URL.createObjectURL(file);audio.play().then(()=>{document.getElementById('musicButton').textContent='♪';}).catch(()=>showToast('此音频无法播放'));});
document.getElementById('resumeLastRide').addEventListener('click',()=>{
  let saved;try{saved=JSON.parse(localStorage.getItem('cloudRideLastRide')||'null');}catch{}
  if(!saved){showToast('没有可续接的上次骑行');return;}
  state.seconds=Number(saved.seconds)||8;state.restSeconds=Number(saved.restSeconds)||0;state.rideDistance=Number(saved.distance)||0;state.rideTrack=Array.isArray(saved.track)?saved.track:[];state.lastAutoLapKm=Math.floor(state.rideDistance/5)*5;state.paused=false;renderLiveState();startRideCountdown();
});
const channelBus='BroadcastChannel' in window?new BroadcastChannel('yunyao-ride-channel'):null;
function joinChannel(code){state.channel=String(code).trim();if(!/^\d{4,8}$/.test(state.channel)){showToast('频道号需为 4 至 8 位数字');return false;}document.getElementById('channelCode').textContent=state.channel;document.getElementById('channelActive').hidden=false;document.getElementById('channelMessages').innerHTML='';if(channelBus)channelBus.postMessage({type:'join',code:state.channel,name:currentAccount.name});return true;}
document.getElementById('createChannel').addEventListener('click',()=>{const code=String(Math.floor(100000+Math.random()*900000));document.getElementById('channelCodeInput').value=code;joinChannel(code);});
document.getElementById('joinChannel').addEventListener('click',()=>joinChannel(document.getElementById('channelCodeInput').value));
document.getElementById('channelChatForm').addEventListener('submit',event=>{event.preventDefault();if(!state.channel){showToast('请先创建或加入频道');return;}const input=document.getElementById('channelMessageInput');const message=input.value.trim();if(!message)return;const packet={type:'message',code:state.channel,name:currentAccount.name,text:message,time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})};appendChannelMessage(packet);channelBus?.postMessage(packet);input.value='';});
if(channelBus)channelBus.onmessage=event=>{const packet=event.data;if(packet?.code===state.channel&&packet.type==='message')appendChannelMessage(packet);};
function appendChannelMessage(packet){const row=document.createElement('p');row.className='channel-message';row.textContent=`${packet.time||''} ${packet.name}：${packet.text}`;document.getElementById('channelMessages').append(row);}
document.getElementById('shareReport').addEventListener('click',()=>showToast('报告已准备好，可截图分享'));
document.querySelector('.countdown-tap').addEventListener('click', () => {
  clearInterval(state.countTimer);
  showPage('live');
  startClock();
});
document.getElementById('pauseButton').addEventListener('click', () => {
  state.paused = !state.paused;state.autoPaused=false;
  renderLiveState();
});
document.getElementById('dialCustomize').addEventListener('click',()=>{state.customDial=!state.customDial;const button=document.getElementById('dialCustomize');button.textContent=state.customDial?'完成自定义':'自定义表盘';document.getElementById('page-live').classList.toggle('customizing-dial',state.customDial);renderMetricSlots();});
document.getElementById('closeMetricPicker').addEventListener('click',()=>{document.getElementById('metricPickerMask').hidden=true;});
document.getElementById('metricPickerMask').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.hidden=true;});
document.getElementById('metricCategoryList').addEventListener('click',event=>{const button=event.target.closest('[data-metric-category]');if(button)renderMetricPicker(button.dataset.metricCategory);});
document.getElementById('metricOptionList').addEventListener('click',event=>{const button=event.target.closest('[data-metric-choice]');if(!button||!state.activeMetricSlot)return;metricSelections[state.activeMetricSlot]=button.dataset.metricChoice;localStorage.setItem('cloudRideMetricSelections',JSON.stringify(metricSelections));document.getElementById('metricPickerMask').hidden=true;renderLiveState();});
document.getElementById('page-live').addEventListener('click',event=>{const edit=event.target.closest('[data-open-metric]');if(edit)openMetricPicker(edit.dataset.openMetric);});
document.getElementById('endButton').addEventListener('click', openEndSheet);
document.getElementById('continueRide').addEventListener('click', () => closeEndSheet(false));
document.getElementById('confirmEnd').addEventListener('click', () => closeEndSheet(true));
document.getElementById('viewReport').addEventListener('click', () => closeEndSheet(true));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.getElementById('endSheet').classList.contains('show')) closeEndSheet(false);
    else showPage('home');
  }
});

const renderRideHistoryRaw=renderRideHistory;
renderRideHistory=function(){const records=rideHistoryRecords.slice().sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date))),rawTracks=records.map(record=>record.track);records.forEach(record=>{if(Array.isArray(record.mapMatchedTrack)&&record.mapMatchedTrack.length>1)record.track=record.mapMatchedTrack;});let index=0;const html=renderRideHistoryRaw().replace(/<\/small><\/div><\/article>/g,close=>{const record=records[index++];if(!record||record.levelEligible||!Array.isArray(record.track)||record.track.length<2)return close;const label=record.appealStatus||'申请复核';return '</small><button type="button" class="appeal-button" data-appeal-ride="'+record.id+'">'+label+'</button></div></article>';});records.forEach((record,i)=>{if(rawTracks[i])record.track=rawTracks[i];});return html;};
document.addEventListener('click',event=>{const button=event.target.closest('[data-appeal-ride]');if(button)openRideAppeal(button.dataset.appealRide);});
function haversineMeters(a,b){const rad=n=>n*Math.PI/180,R=6371000,dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude),x=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function startRideGpsTracking(){if(state.gpsWatchId!==null)return;if(!navigator.geolocation){showToast('此设备不支持 GPS 定位，无法记录真实里程');return;}const precision=rideSettings.gpsPrecision||'high';state.gpsWatchId=navigator.geolocation.watchPosition(position=>{const c=position.coords;if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||(Number.isFinite(c.accuracy)&&c.accuracy>60))return;const sample={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy||0,timestamp:position.timestamp||Date.now(),altitude:Number.isFinite(c.altitude)?c.altitude:null},previous=state.lastGpsSample;state.lastGpsSample=sample;if(sample.altitude!==null){state.altitude=sample.altitude;state.maxAltitude=state.maxAltitude===null?sample.altitude:Math.max(state.maxAltitude,sample.altitude);state.minAltitude=state.minAltitude===null?sample.altitude:Math.min(state.minAltitude,sample.altitude);if(state.lastAltitude!==null){const climb=sample.altitude-state.lastAltitude;if(Math.abs(climb)>=3){if(climb>0)state.totalAscent+=climb;else state.totalDescent+=Math.abs(climb);}}state.lastAltitude=sample.altitude;}if(previous){const meters=haversineMeters(previous,sample),elapsed=Math.max(.1,(sample.timestamp-previous.timestamp)/1000),gpsSpeed=meters/elapsed,speed=Number.isFinite(c.speed)&&c.speed>0?c.speed:gpsSpeed;if(!state.paused&&meters>=1){state.rideDistance+=meters/1000;state.speed=Math.min(speed*3.6,120);state.maxSpeed=Math.max(state.maxSpeed,state.speed);if(state.rideTrack.length<10000)state.rideTrack.push(sample);renderLiveState();}else if(!state.paused){state.speed=0;renderLiveState();}}else{state.rideTrack.push(sample);state.speed=0;renderLiveState();}},error=>{if(state.gpsWatchId!==null){showToast(error.code===1?'请允许定位权限以记录真实骑行':'GPS 信号不可用，本次不会生成虚构里程');stopRideGpsTracking();}}, {enableHighAccuracy:precision==='high',maximumAge:precision==='low'?30000:0,timeout:20000});}function stopRideGpsTracking(){if(state.gpsWatchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;state.lastGpsSample=null;}
function renderRideHistory(){const groups=new Map();rideHistoryRecords.slice().sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date))).forEach(record=>{const month=record.month||String(record.date||'').slice(0,7).replace('-','年')+'月';if(!groups.has(month))groups.set(month,[]);groups.get(month).push(record);});const recordedTotal=rideHistoryRecords.reduce((sum,record)=>sum+Number(record.distance||0),0),legacy=Math.max(0,state.totalDistance-recordedTotal),trackSvg=record=>{const points=Array.isArray(record.track)?record.track:[];if(points.length<2)return '<div class="record-no-track">无 GPS 轨迹</div>';const lats=points.map(p=>p.latitude),lons=points.map(p=>p.longitude),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons),path=points.map((p,i)=>{const x=5+(p.longitude-minLon)/(maxLon-minLon||1)*84,y=5+(maxLat-p.latitude)/(maxLat-minLat||1)*52;return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');return '<svg viewBox="0 0 94 62" preserveAspectRatio="none" aria-label="GPS 骑行轨迹"><path class="record-route" d="'+path+'"/></svg>';};const sections=Array.from(groups.entries()).map(([month,records],groupIndex)=>{const total=records.reduce((sum,item)=>sum+Number(item.distance||0),0),items=records.map(record=>'<article class="ride-record"><div class="ride-record-map">'+trackSvg(record)+'</div><div class="ride-record-data"><div class="ride-record-time"><span>时间</span><b>'+record.date+' '+record.time+'</b></div><div class="ride-record-distance"><span>里程</span><b>'+Number(record.distance).toFixed(2)+' <small>km</small></b></div><div class="ride-record-foot"><span>骑行时间 <b>'+record.duration+'</b></span><span>均速 <b>'+Number(record.average||0).toFixed(1)+' km/h</b></span></div><small class="ride-record-source">来源：'+(record.source||'手机 GPS')+'</small><small class="ride-record-source">'+(record.levelEligible?'等级有效 · 等效 '+Number(record.levelDistance||0).toFixed(2)+' km · 爬升×'+Number(record.climbFactor||1).toFixed(2)+' · 稳定×'+Number(record.stabilityFactor||1).toFixed(2)+' · 场景×'+Number(record.sceneFactor||1).toFixed(2)+' · 传感器×'+Number(record.sensorFactor||1).toFixed(2):'未计入等级 · '+(record.validationReasons||[]).join('、'))+'</small></div></article>').join('');return '<section class="history-month '+(groupIndex===0?'expanded':'')+'"><button type="button" class="history-month-toggle" aria-expanded="'+(groupIndex===0?'true':'false')+'"><span class="history-month-name">'+month+'</span><span class="history-month-count">本月骑行次数 <b>'+records.length+' 次</b></span><span class="history-month-distance">本月骑行总里程 <b>'+total.toFixed(2)+' km</b></span><i aria-hidden="true"></i></button><div class="history-record-list" '+(groupIndex===0?'':'hidden')+'>'+items+'</div></section>';}).join('');const legacyCard='';return '<div class="history-ledger">'+legacyCard+(sections||'<div class="history-legacy"><b>暂无已完成的 GPS 骑行记录</b><small>开始骑行并允许定位后，完成记录会按月份保存。</small></div>')+'</div>';}
document.getElementById('accountEditForm').addEventListener('submit',event=>{event.preventDefault();const key=state.activeAccountEdit,value=document.getElementById('accountEditValue').value.trim(),labels={phone:'手机号',email:'邮箱',wechat:'微信号',qq:'QQ号',alipay:'支付宝账号'},valid=key==='phone'?/^1[3-9]\d{9}$/.test(value):key==='email'?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value):key==='alipay'?/^(1[3-9]\d{9}|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(value):/^[A-Za-z0-9_-]{3,30}$/.test(value);if(!valid){showToast('请输入有效的'+(labels[key]||'账号'));return;}currentAccount={...currentAccount,[key]:value};localStorage.setItem('cloudRideCurrentAccount',JSON.stringify(currentAccount));renderProfileAccount();document.getElementById('accountEditModal').hidden=true;showToast('已保存到本机体验数据；正式绑定仍需验证');});
document.addEventListener('keydown',event=>{const modal=document.getElementById('accountEditModal');if(event.key==='Escape'&&modal&&!modal.hidden)modal.hidden=true;});
