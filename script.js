// script.js
const target = document.getElementById("target");
const bomb = document.getElementById("bomb");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const maxComboEl = document.getElementById("maxCombo");
const timeEl = document.getElementById("time");
const lifeEl = document.getElementById("life");
const restartBtn = document.getElementById("restartBtn");
const scene = document.getElementById("scene");
const bgm = document.getElementById("bgm");
const muteBtn = document.getElementById("muteBtn");
const volumeSlider = document.getElementById("volume");
const volumeIcon = document.getElementById("volumeIcon");
const volumeValue = document.getElementById("volumeValue");

// 안내 패널
const infoPanel = document.getElementById("infoPanel");
const infoToggle = document.getElementById("infoToggle");

// 결과 오버레이
const resultOverlay = document.getElementById("resultOverlay");
const finalScoreEl = document.getElementById("finalScore");
const finalLifeEl = document.getElementById("finalLife");
const finalMaxComboEl = document.getElementById("finalMaxCombo");
const finalRankEl = document.getElementById("finalRank");
const finalCommentEl = document.getElementById("finalComment");
const resultRestartBtn = document.getElementById("resultRestart");

let score = 0;
let timeLeft = 30;
let life = 5;
let timerId = null;
let gameOver = false;
let isPaused = false;

let combo = 0;
let maxCombo = 0;

let bgmStarted = false;

function updateMuteButton() {
  muteBtn.textContent = bgm.muted ? "🔇 UNMUTE" : "🔊 MUTE";
}

function updateVolumeUI() {
  const vol = parseFloat(volumeSlider ? volumeSlider.value : bgm.volume);
  const effectiveVol = bgm.muted ? 0 : vol;
  if (volumeValue) volumeValue.textContent = `${Math.round(effectiveVol * 100)}%`;
  if (volumeIcon) {
    let icon = "🔊";
    if (effectiveVol === 0) icon = "🔇";
    else if (effectiveVol < 0.34) icon = "🔈";
    else if (effectiveVol < 0.67) icon = "🔉";
    else icon = "🔊";
    volumeIcon.textContent = icon;
  }
}

function ensureBgmPlaying() {
  if (gameOver) return;
  if (!bgm.muted) {
    bgm.play().catch(() => {});
    bgmStarted = true;
  }
}

// 안내 패널 토글 + 일시정지
infoToggle.addEventListener("click", () => {
  if (!gameOver && !bgm.muted) ensureBgmPlaying();
  const willCollapse = !infoPanel.classList.contains("collapsed"); // 지금은 열려있는가?

  infoPanel.classList.toggle("collapsed");

  if (willCollapse) {
    // 지금 열려 있었고 → 접히는 중 = 게임 재개
    resumeTimer();
  } else {
    // 지금 접혀 있었고 → 열리는 중 = 게임 일시정지
    pauseTimer();
  }
});

muteBtn.addEventListener("click", () => {
  bgm.muted = !bgm.muted;
  updateMuteButton();
  updateVolumeUI();
  if (bgm.muted) {
    bgm.pause();
  } else if (!isPaused && !gameOver) {
    ensureBgmPlaying();
  }
});

// 타겟 위치
function moveTargetRandom() {
  const padding = 40;
  const sceneRect = scene.getBoundingClientRect();

  const targetWidth = 90;
  const targetHeight = 90;

  const maxX = sceneRect.width - padding - targetWidth;
  const maxY = sceneRect.height - padding - targetHeight;

  const x = padding + Math.random() * maxX;
  const y = padding + Math.random() * maxY * 0.6;

  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
}

// 폭탄 위치
function moveBombRandom() {
  const padding = 40;
  const sceneRect = scene.getBoundingClientRect();

  const bombWidth = 60;
  const bombHeight = 80;

  const maxX = sceneRect.width - padding - bombWidth;
  const maxY = sceneRect.height - padding - bombHeight;

  let x, y;
  let tries = 0;
  do {
    x = padding + Math.random() * maxX;
    y = padding + Math.random() * maxY * 0.6;
    tries++;
  } while (isCloseToTarget(x, y) && tries < 20);

  bomb.style.left = `${x}px`;
  bomb.style.top = `${y}px`;
}

function isCloseToTarget(bx, by) {
  const tx = parseFloat(target.style.left || "200");
  const ty = parseFloat(target.style.top || "40");

  const dx = bx - tx;
  const dy = by - ty;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < 80;
}

// 과녁 클릭: 콤보 + 헤드샷 + 보너스
target.addEventListener("click", (e) => {
  if (gameOver || isPaused) return;
  ensureBgmPlaying();

  combo++;
  if (combo > maxCombo) maxCombo = combo;

  const rect = target.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const dist = Math.hypot(x - cx, y - cy);

  let base = 1;
  if (dist < 15) base = 3; // 헤드샷

  let comboBonus = 0;
  if (combo >= 20) comboBonus = 2;
  else if (combo >= 10) comboBonus = 1;

  const gained = base + comboBonus
  score += gained;

  scoreEl.textContent = score;
  comboEl.textContent = combo;
  maxComboEl.textContent = maxCombo;

  target.classList.remove("hit");
  void target.offsetWidth;
  target.classList.add("hit");

  moveTargetRandom();
  moveBombRandom();

  e.stopPropagation();
});

// 폭탄 클릭: 점수 30% 감소 + HP -1 + 콤보 리셋
bomb.addEventListener("click", (e) => {
  if (gameOver || isPaused) return;
  ensureBgmPlaying();

  const penalty = Math.floor(score * 0.3);
  score -= penalty;
  if (score < 0) score = 0;

  life--;
  if (life < 0) life = 0;

  combo = 0;

  scoreEl.textContent = score;
  lifeEl.textContent = life;
  comboEl.textContent = combo;

  bomb.classList.remove("hit");
  void bomb.offsetWidth;
  bomb.classList.add("hit");

  moveBombRandom();

  if (life <= 0) {
    endGame("폭탄에 너무 많이 맞았습니다!");
  }

  e.stopPropagation();
});

// 빗맞추면 콤보 리셋
scene.addEventListener("click", () => {
  if (gameOver || isPaused) return;
  ensureBgmPlaying();
  combo = 0;
  comboEl.textContent = combo;
});

// 타이머
function startTimer() {
  if (timerId) clearInterval(timerId);
  isPaused = false;

  timerId = setInterval(() => {
    if (isPaused || gameOver) return;

    timeLeft--;
    timeEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerId);
      endGame("시간이 다 되었습니다!");
    }
  }, 1000);
}

function pauseTimer() {
  isPaused = true;
}

function resumeTimer() {
  if (gameOver) return;
  isPaused = false;
  if (!bgm.muted) ensureBgmPlaying();
}

// 랭크 & 코멘트 (비선형 간격)
function getRankAndComment(score, maxCombo, life) {
  let rank = "D";
  let comment =
    "연습을 좀 더 해봅시다. 아직은 사격장 청소 담당 수준이네요.";

  // 점수 기준: S 200+, A 150+, B 100+, C 50+
  if (score >= 200) {
    rank = "S";
    comment = "전설의 총잡이! 서부 전역에 이름이 퍼질 실력입니다.";
  } else if (score >= 150) {
    rank = "A";
    comment = "베테랑 총잡이! 누구도 쉽게 덤비지 못하겠군요.";
  } else if (score >= 100) {
    rank = "B";
    comment = "꽤 실력 있는 사수입니다. 조금만 더 연습하면 전설이 보입니다.";
  } else if (score >= 50) {
    rank = "C";
    comment = "기본기는 잡혔습니다. 이제 실전 감각을 끌어올려 보죠.";
  }

  // 콤보 보정 (10콤보 이상이면 한 단계 상향, 단 S 이상은 유지)
  if (maxCombo >= 25 && rank !== "S") {
    if (rank === "D") rank = "C";
    else if (rank === "C") rank = "B";
    else if (rank === "B") rank = "A";
    comment += " 콤보가 훌륭해 추가로 평가를 올려 드리죠.";
  }

  // HP 0 패널티 멘트
  if (life === 0) {
    comment += " 하지만 생명력 관리는 조금 더 신경 써야겠습니다.";
  }

  return { rank, comment };
}


function endGame(reason) {
  if (gameOver) return;
  gameOver = true;
  isPaused = true;
  target.style.pointerEvents = "none";
  bomb.style.pointerEvents = "none";
  clearInterval(timerId);

  finalScoreEl.textContent = score;
  finalLifeEl.textContent = life;
  finalMaxComboEl.textContent = maxCombo;

  const { rank, comment } = getRankAndComment(score, maxCombo, life);
  finalRankEl.textContent = rank;
  finalCommentEl.textContent = comment + "\n(" + reason + ")";

  if (rank === "S") {
    finalRankEl.style.color = "#ffeb3b";
  } else if (rank === "A") {
    finalRankEl.style.color = "#4caf50";
  } else if (rank === "B") {
    finalRankEl.style.color = "#29b6f6";
  } else if (rank === "C") {
    finalRankEl.style.color = "#9575cd";
  } else {
    finalRankEl.style.color = "#ef5350";
  }

  resultOverlay.classList.remove("hidden");
  bgm.pause();
}

function resetState() {
  score = 0;
  timeLeft = 30;
  life = 5;
  combo = 0;
  maxCombo = 0;

  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  lifeEl.textContent = life;
  comboEl.textContent = combo;
  maxComboEl.textContent = maxCombo;

  gameOver = false;
  isPaused = false;
  target.style.pointerEvents = "auto";
  bomb.style.pointerEvents = "auto";

  moveTargetRandom();
  moveBombRandom();
}

function initGame() {
  resetState();
  resultOverlay.classList.add("hidden");
  startTimer();
  updateMuteButton();
  if (volumeSlider) bgm.volume = parseFloat(volumeSlider.value || "1");
  updateVolumeUI();
}

restartBtn.addEventListener("click", () => {
  initGame();
  ensureBgmPlaying();
});

resultRestartBtn.addEventListener("click", () => {
  initGame();
  ensureBgmPlaying();
});

initGame();
if (volumeSlider) {
  bgm.volume = parseFloat(volumeSlider.value);
  volumeSlider.addEventListener("input", () => {
    bgm.volume = parseFloat(volumeSlider.value);
    updateVolumeUI();
  });
}
