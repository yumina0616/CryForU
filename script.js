// ===================================================
// 설정
// ===================================================
const GRID = 120;
const HOLD_DURATION = 3000;

const desktop = document.getElementById('desktop');

// ===================================================
// 사운드
// ===================================================
const soundTissue = new Audio('assets/sounds/tissue.mp3');
const soundTrash  = new Audio('assets/sounds/trash.mp3');

function playSound(audio){
  audio.currentTime = 0;
  audio.play();
}

// ===================================================
// 그리드 스냅 드래그 (쓰레기통, 휴지박스)
// ===================================================
function makeGridDraggable(el){
  function applyInitialPosition(el){
    if(el.id === 'tissueBoxIcon'){
      el.style.left = '27vw';
      el.style.top  = '48vh';
    } else if(el.id === 'trashIcon'){
      el.style.left = '27vw';
      el.style.top  = '60vh';
    }
  }
  applyInitialPosition(el);

  let dragging = false;
  let startX = 0, startY = 0;
  let originLeft = 0, originTop = 0;

  el.addEventListener('pointerdown', (e)=>{
    dragging = true;
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    originLeft = el.offsetLeft;
    originTop  = el.offsetTop;
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const snappedDx = Math.round(dx / GRID) * GRID;
    const snappedDy = Math.round(dy / GRID) * GRID;
    el.style.left = (originLeft + snappedDx) + 'px';
    el.style.top  = (originTop + snappedDy) + 'px';
  });

  window.addEventListener('pointerup', ()=>{
    if(!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    el.dataset.gx = Math.round(el.offsetLeft / GRID);
    el.dataset.gy = Math.round(el.offsetTop / GRID);
  });
}

makeGridDraggable(document.getElementById('trashIcon'));
makeGridDraggable(document.getElementById('tissueBoxIcon'));

// ===================================================
// 휴지박스: 더블클릭 -> 새 휴지 한 장 뽑기
// ===================================================
const tissueBox = document.getElementById('tissueBoxIcon');

let activeTissue = null;
let currentMouseX = 0;
let currentMouseY = 0;

// 마우스 위치 항상 추적 + 활성 휴지 따라다니기
window.addEventListener('pointermove', (e)=>{
  currentMouseX = e.clientX;
  currentMouseY = e.clientY;

  if(activeTissue){
    const desktopRect = desktop.getBoundingClientRect();
    activeTissue.style.left = (e.clientX - desktopRect.left - 50) + 'px';
    activeTissue.style.top  = (e.clientY - desktopRect.top - 50) + 'px';
  }
});

tissueBox.addEventListener('dblclick', (e)=>{
  pullTissue(e);
});

window.addEventListener('pointerup', ()=>{
  if(activeTissue){
    dropTissue(activeTissue);
    activeTissue = null;
  }
});

window.addEventListener('pointercancel', ()=>{
  if(activeTissue){
    dropTissue(activeTissue);
    activeTissue = null;
  }
});

// ===================================================
// 휴지 생성
// ===================================================
function pullTissue(e){
  const tissue = document.createElement('div');
  tissue.className = 'tissue-item';
  tissue.dataset.wetness = '0';
  tissue.innerHTML = `<img src="assets/tissues/tissue0.png" alt="tissue">`;

  const desktopRect = desktop.getBoundingClientRect();
  const x = e ? e.clientX - desktopRect.left - 50 : 100;
  const y = e ? e.clientY - desktopRect.top - 50 : 100;

  tissue.style.left = x + 'px';
  tissue.style.top  = y + 'px';
  tissue.style.transition = 'none';

  desktop.appendChild(tissue);
  activeTissue = tissue;
  playSound(soundTissue);
}

// ===================================================
// 중력 낙하 후 제거
// ===================================================
function dropTissue(tissue){
  const fallTo = window.innerHeight + 200;
  const currentTop = parseFloat(tissue.style.top) || 0;
  const distance = fallTo - currentTop;
  const duration = Math.max(2.0, distance / 300);

  tissue.style.transition = `top ${duration}s cubic-bezier(0.4, 0.0, 0.6, 1.0), opacity 0.6s ease ${duration - 0.6}s`;
  tissue.style.top = fallTo + 'px';

  const trashEl = document.getElementById('trashIcon');
  let collisionRAF;

  function checkTrashCollision(){
    if(!tissue.isConnected) return;
    if(isOverElement(tissue, trashEl)){
      playSound(soundTrash);
      tissue.remove();
      cancelAnimationFrame(collisionRAF);
      return;
    }
    collisionRAF = requestAnimationFrame(checkTrashCollision);
  }
  collisionRAF = requestAnimationFrame(checkTrashCollision);

  setTimeout(()=>{
    if(tissue.isConnected) tissue.remove();
    cancelAnimationFrame(collisionRAF);
  }, (duration + 0.2) * 1000);
}

// ===================================================
// 쓰레기통 클릭 시 들고 있는 휴지 즉시 제거
// ===================================================
document.getElementById('trashIcon').addEventListener('click', ()=>{
  if(activeTissue){
    playSound(soundTrash);
    activeTissue.remove();
    activeTissue = null;
  }
});

function isOverElement(a, b){
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  const ax = ra.left + ra.width/2;
  const ay = ra.top + ra.height/2;
  return ax >= rb.left && ax <= rb.right && ay >= rb.top && ay <= rb.bottom;
}

// ===================================================
// 눈물방울 생성 시스템
// ===================================================
const faceFrame = document.querySelector('.face-frame');

const EYE_POSITIONS = [
  { x: 0.35, y: 0.48 },
  { x: 0.62, y: 0.48 }
];

let tearInterval = null;

function spawnTear(eye){
  const tear = document.createElement('div');
  tear.className = 'tear';

  const size = 6 + Math.random() * 12;
  tear.style.width = size + 'px';
  tear.style.height = size + 'px';

  const frameRect = faceFrame.getBoundingClientRect();
  const startX = frameRect.width * eye.x;
  const startY = frameRect.height * eye.y;

  tear.style.left = startX + 'px';
  tear.style.top  = startY + 'px';

  const fallDistance = frameRect.height * (0.4 + Math.random() * 0.25);
  const sway = (Math.random() - 0.5) * 16;
  const duration = 1.0 + Math.random() * 0.6;

  tear.style.setProperty('--fall', fallDistance + 'px');
  tear.style.setProperty('--sway', sway + 'px');
  tear.style.setProperty('--duration', duration + 's');

  faceFrame.appendChild(tear);
  requestAnimationFrame(()=> tear.classList.add('falling'));

  let absorbed = false;
  function checkCollision(){
    if(absorbed) return;
    if(!tear.isConnected) return;

    const tearRect = tear.getBoundingClientRect();
    const tissues = document.querySelectorAll('.tissue-item');

    tissues.forEach(tissue => {
      if(absorbed) return;
      const wetness = parseInt(tissue.dataset.wetness || '0', 10);
      if(wetness >= 9) return;

      const tissueRect = tissue.getBoundingClientRect();
      const overlap =
        tearRect.left < tissueRect.right &&
        tearRect.right > tissueRect.left &&
        tearRect.top < tissueRect.bottom &&
        tearRect.bottom > tissueRect.top;

      if(overlap){
        absorbed = true;
        tear.remove();
        const newWetness = wetness + 1;
        tissue.dataset.wetness = newWetness;
        tissue.querySelector('img').src = `assets/tissues/tissue${newWetness}.png`;
      }
    });

    if(!absorbed) requestAnimationFrame(checkCollision);
  }
  requestAnimationFrame(checkCollision);

  setTimeout(()=> { if(tear.isConnected) tear.remove(); }, duration * 1000 + 50);
}

function startCrying(){
  if(tearInterval) return;

  function tick(){
    EYE_POSITIONS.forEach(eye=>{
      if(Math.random() < 0.8) spawnTear(eye);
    });
    tearInterval = setTimeout(tick, 150 + Math.random() * 150);
  }
  tick();
}

function stopCrying(){
  clearTimeout(tearInterval);
  tearInterval = null;
}

// ===================================================
// 재생/일시정지 버튼
// ===================================================
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
let isPlaying = false;

playBtn.addEventListener('click', ()=>{
  isPlaying = !isPlaying;
  playIcon.src = isPlaying
    ? 'assets/icons/pause.png'
    : 'assets/icons/play.png';

  if(isPlaying){
    startCrying();
    scheduleNextBlink();
  } else {
    stopCrying();
    stopBlink();
    faceImg.src = 'assets/faces/face-neutral.png';
  }
});

// ===================================================
// 깜박임 애니메이션
// ===================================================
const BLINK_FRAME_COUNT = 24;
const BLINK_FPS = 8;
const faceImg = document.getElementById('faceImg');
let blinkTimeout = null;
let blinkTicker = null;

function playBlink(){
  if(!isPlaying) return;
  let frame = 0;
  const interval = 1000 / BLINK_FPS;

  blinkTicker = setInterval(()=>{
    if(!isPlaying){
      clearInterval(blinkTicker);
      return;
    }
    faceImg.src = `assets/blink_frames/blink_${String(frame).padStart(3,'0')}.png`;
    frame++;

    if(frame >= BLINK_FRAME_COUNT){
      clearInterval(blinkTicker);
      faceImg.src = 'assets/faces/face-neutral.png';
      scheduleNextBlink();
    }
  }, interval);
}

function scheduleNextBlink(){
  if(!isPlaying) return;
  const delay = 1000 + Math.random() * 4000;
  blinkTimeout = setTimeout(playBlink, delay);
}

function stopBlink(){
  clearTimeout(blinkTimeout);
  clearInterval(blinkTicker);
  blinkTimeout = null;
  blinkTicker = null;
}