// ===================================================
// 설정
// ===================================================
const GRID = 120;          // 그리드 셀 크기 (px)
const HOLD_DURATION = 3000; // 휴지 뽑기 hold 시간 (ms)

const desktop = document.getElementById('desktop');

// ===================================================
// 그리드 스냅 드래그 (쓰레기통, 휴지박스)
// ===================================================
function makeGridDraggable(el){
  // 초기 위치: data-gx, data-gy (그리드 좌표) -> px로 변환해서 배치
  function applyGridPosition(gx, gy){
    el.style.left = (gx * GRID) + 'px';
    el.style.top  = (gy * GRID) + 'px';
    el.dataset.gx = gx;
    el.dataset.gy = gy;
  }
  applyGridPosition(
    parseInt(el.dataset.gx || '0', 10),
    parseInt(el.dataset.gy || '0', 10)
  );

  let dragging = false;
  let startX = 0, startY = 0;       // 포인터 시작 위치
  let originLeft = 0, originTop = 0; // 드래그 시작 시 el의 px 위치

  el.addEventListener('pointerdown', (e)=>{
    // 휴지박스는 hold 로직과 별도로 처리 (hold-logic.js 참고)
    if(el.id === 'tissueBoxIcon' && e.target.closest('.hold-loader')) return;

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

    // 자석 스냅: 이동 거리를 그리드 단위로 끊어서 적용 (연속이동 X, 칸 단위로 뚝뚝)
    const snappedDx = Math.round(dx / GRID) * GRID;
    const snappedDy = Math.round(dy / GRID) * GRID;

    el.style.left = (originLeft + snappedDx) + 'px';
    el.style.top  = (originTop + snappedDy) + 'px';
  });

  window.addEventListener('pointerup', (e)=>{
    if(!dragging) return;
    dragging = false;
    el.classList.remove('dragging');

    // 최종 위치를 그리드 좌표로 저장
    const finalGx = Math.round(el.offsetLeft / GRID);
    const finalGy = Math.round(el.offsetTop / GRID);
    el.dataset.gx = finalGx;
    el.dataset.gy = finalGy;
  });
}

makeGridDraggable(document.getElementById('trashIcon'));
makeGridDraggable(document.getElementById('tissueBoxIcon'));


// ===================================================
// 휴지박스: hold(1초) -> 새 휴지 한 장 뽑기
// ===================================================
const tissueBox = document.getElementById('tissueBoxIcon');
const holdLoader = document.getElementById('holdLoader');

let holdTimer = null;
let holdStart = 0;
let holdRAF = null;

function startHold(e){
  // 드래그가 시작된 경우(이동) hold는 무시
  if(tissueBox.classList.contains('dragging')) return;

  holdStart = Date.now();
  holdLoader.classList.add('active');

  function updateLoader(){
    const elapsed = Date.now() - holdStart;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);
    const deg = progress * 360;
    holdLoader.style.background =
      `conic-gradient(var(--ink) ${deg}deg, transparent ${deg}deg)`;

    if(progress < 1){
      holdRAF = requestAnimationFrame(updateLoader);
    }
  }
  holdRAF = requestAnimationFrame(updateLoader);

  holdTimer = setTimeout(()=>{
    pullTissue();
    cancelHold();
  }, HOLD_DURATION);
}

function cancelHold(){
  clearTimeout(holdTimer);
  cancelAnimationFrame(holdRAF);
  holdTimer = null;
  holdLoader.classList.remove('active');
  holdLoader.style.background = 'conic-gradient(var(--ink) 0deg, transparent 0deg)';
}

// 현재 홀드 중 마우스를 따라다니는 휴지
let activeTissue = null;
let currentMouseX = 0;
let currentMouseY = 0;

// 마우스 위치 항상 추적
window.addEventListener('pointermove', (e)=>{
  currentMouseX = e.clientX;
  currentMouseY = e.clientY;

  // 홀드 중 휴지가 생성돼 있으면 마우스 따라다님
  if(activeTissue){
    const desktopRect = desktop.getBoundingClientRect();
    activeTissue.style.left = (e.clientX - desktopRect.left - 30) + 'px';
    activeTissue.style.top  = (e.clientY - desktopRect.top - 30) + 'px';
  }
});

function startHold(e){
  if(tissueBox.classList.contains('dragging')) return;

  holdStart = Date.now();
  holdLoader.classList.add('active');

  function updateLoader(){
    const elapsed = Date.now() - holdStart;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);
    const deg = progress * 360;
    holdLoader.style.background =
      `conic-gradient(var(--ink) ${deg}deg, transparent ${deg}deg)`;

    if(progress < 1){
      holdRAF = requestAnimationFrame(updateLoader);
    }
  }
  holdRAF = requestAnimationFrame(updateLoader);

  holdTimer = setTimeout(()=>{
    pullTissue();
    cancelHold();
  }, HOLD_DURATION);
}

function cancelHold(){
  clearTimeout(holdTimer);
  cancelAnimationFrame(holdRAF);
  holdTimer = null;
  holdLoader.classList.remove('active');
  holdLoader.style.background = 'conic-gradient(var(--ink) 0deg, transparent 0deg)';
}

tissueBox.addEventListener('dblclick', (e)=>{
  pullTissue(e);
});

window.addEventListener('pointerup', ()=>{
  // 홀드 완료 전에 떼면 취소
  if(holdTimer) cancelHold();

  // 홀드 완료 후 휴지를 들고 있던 중 손을 놓으면 → 중력 낙하
  if(activeTissue){
    dropTissue(activeTissue);
    activeTissue = null;
  }
});

window.addEventListener('pointercancel', ()=>{
  if(holdTimer) cancelHold();
  if(activeTissue){
    dropTissue(activeTissue);
    activeTissue = null;
  }
});


// ===================================================
// 휴지 생성 (마우스에 붙어서 생성)
// ===================================================
function pullTissue(e){
  const tissue = document.createElement('div');
  tissue.className = 'tissue-item';
  tissue.dataset.wetness = '0';
  tissue.innerHTML = `<img src="assets/tissues/tissue0.png" alt="tissue">`;

  const desktopRect = desktop.getBoundingClientRect();
  const x = e ? e.clientX - desktopRect.left - 30 : 100;
  const y = e ? e.clientY - desktopRect.top - 30 : 100;

  tissue.style.left = x + 'px';
  tissue.style.top  = y + 'px';
  tissue.style.transition = 'none';

  desktop.appendChild(tissue);
  activeTissue = tissue;
}

// 중력 낙하 후 제거
function dropTissue(tissue){
  const fallTo = window.innerHeight + 200;
  const currentTop = parseFloat(tissue.style.top) || 0;
  const distance = fallTo - currentTop;
  // 거리에 비례한 낙하 시간 (느리게)
  const duration = Math.max(2.0, distance / 300);

  tissue.style.transition = `top ${duration}s cubic-bezier(0.4, 0.0, 0.6, 1.0), opacity 0.6s ease ${duration - 0.6}s`;
  tissue.style.top = fallTo + 'px';

  // 낙하 중 쓰레기통 충돌 감지
  const trashEl = document.getElementById('trashIcon');
  let collisionRAF;

  function checkTrashCollision(){
    if(!tissue.isConnected) return;
    if(isOverElement(tissue, trashEl)){
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

// 쓰레기통 클릭 시 들고 있는 휴지 즉시 제거
document.getElementById('trashIcon').addEventListener('click', ()=>{
  if(activeTissue){
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

// 얼굴 프레임 기준 눈 위치 (퍼센트 좌표) - 이미지에 맞춰 조정
const EYE_POSITIONS = [
  { x: 0.35, y: 0.48 }, // 왼쪽 눈
  { x: 0.62, y: 0.48 }  // 오른쪽 눈
];

let tearInterval = null;

function spawnTear(eye){
  const tear = document.createElement('div');
  tear.className = 'tear';

  const size = 6 + Math.random() * 12; // 6px ~ 18px 랜덤
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

  // 충돌 감지: 매 프레임마다 뽑힌 휴지와 겹치는지 체크
  let absorbed = false;
  function checkCollision(){
    if(absorbed) return;
    if(!tear.isConnected) return;

    const tearRect = tear.getBoundingClientRect();
    const tissues = document.querySelectorAll('.tissue-item');

    tissues.forEach(tissue => {
      if(absorbed) return;
      const wetness = parseInt(tissue.dataset.wetness || '0', 10);
      if(wetness >= 9) return; // 완전히 젖은 휴지는 무시

      const tissueRect = tissue.getBoundingClientRect();
      const overlap =
        tearRect.left < tissueRect.right &&
        tearRect.right > tissueRect.left &&
        tearRect.top < tissueRect.bottom &&
        tearRect.bottom > tissueRect.top;

      if(overlap){
        absorbed = true;
        // 눈물 즉시 제거
        tear.remove();
        // 휴지 젖음 단계 +1
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

  // 양쪽 눈에서 일정 간격으로 눈물 생성 (간격에 약간의 랜덤)
  function tick(){
    EYE_POSITIONS.forEach(eye=>{
      // 매 tick마다 한쪽만 또는 양쪽 다 생성될 수 있도록 확률 부여
      if(Math.random() < 0.8) spawnTear(eye);
    });
    tearInterval = setTimeout(tick, 500 + Math.random() * 400);
  }
  tick();
}

function stopCrying(){
  clearTimeout(tearInterval);
  tearInterval = null;
}


// ===================================================
// 재생/일시정지 버튼 (얼굴 전환은 추후 단계에서 연결)
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
  } else {
    stopCrying();
  }
});