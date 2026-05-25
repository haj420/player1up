const canvas = document.getElementById("pinballCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

let lastTime = 0;

// -------------------- BALL --------------------
const ball = {
  x: W / 2,
  y: H * 0.25,
  r: 9,
  vx: 0,
  vy: 0,
  inShooter: true
};

const gravity = 300;
const damping = 0.995;

// -------------------- GAME STATE --------------------
let score = 0;
let balls = 3;
let gameOver = false;

// -------------------- NUDGE CONTROLS --------------------
let nudgeX = 0;
let nudgeY = 0;
const nudgeStrength = 40;

// -------------------- PLUNGER --------------------
let plungerPower = 0;
let plungerCharging = false;
const plungerMax = 420;
const plungerMin = 160;
const plungerChargeRate = 480;

// -------------------- FLIPPERS --------------------
const flipperLength = 90;
const flipperWidth = 14;

const leftPivotX = 50;
const rightPivotX = W - 70;
const flipperPivotY = H - 85;

// Inverted flip direction
const leftRest = 30 * Math.PI / 180;
const leftActive = -10 * Math.PI / 180;

const rightRest = 150 * Math.PI / 180;
const rightActive = 190 * Math.PI / 180;

let leftAngle = leftRest;
let rightAngle = rightRest;

let leftActiveState = false;
let rightActiveState = false;

// -------------------- BUMPERS --------------------
const bumpers = [
  { x: W * 0.22, y: H * 0.33, r: 18, score: 500, force: 260 },
  { x: W * 0.90, y: H * 0.14, r: 18, score: 500, force: 260 },
  { x: W * 0.42, y: H * 0.20, r: 20, score: 750, force: 300 }
];

//-------------------- SLINGSHOTS --------------------
const slingshots = [
  {
    x1: 15,
    y1: flipperPivotY - 35,
    x2: 50,
    y2: flipperPivotY - 15,
    force: 260,
    score: 150,
    flash: 1
  },
  {
    x1: W - 30,
    y1: flipperPivotY - 35,
    x2: W - 70,
    y2: flipperPivotY - 15,
    force: 260,
    score: 150,
    flash: 1
  }
];

// -------------------- INPUT --------------------
window.addEventListener("keydown", (e) => {
  if (gameOver) return;

  if (e.key === "a" || e.key === "A") leftActiveState = true;
  if (e.key === "d" || e.key === "D") rightActiveState = true;

  // Plunger charge (W)
  if ((e.key === "w" || e.key === "W") && ball.inShooter) {
    plungerCharging = true;
  }

  // Nudge controls (arrows)
  if (e.key === "ArrowLeft") nudgeX = -nudgeStrength;
  if (e.key === "ArrowRight") nudgeX = nudgeStrength;
  if (e.key === "ArrowUp") nudgeY = -nudgeStrength;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "a" || e.key === "A") leftActiveState = false;
  if (e.key === "d" || e.key === "D") rightActiveState = false;

  if ((e.key === "w" || e.key === "W") && plungerCharging) {
    plungerCharging = false;
    launchBallWithPower();
  }

  if (e.key === "ArrowLeft" || e.key === "ArrowRight") nudgeX = 0;
  if (e.key === "ArrowUp") nudgeY = 0;
});

// -------------------- RESET BUTTON --------------------
window.addEventListener("click", (e) => {
  if (e.target.id === "resetPinball") {
    resetGame();
  }
});

function resetGame() {
  score = 0;
  balls = 3;
  gameOver = false;
  plungerPower = 0;
  plungerCharging = false;
  nudgeX = 0;
  nudgeY = 0;
  loadBallIntoShooter();
}

// -------------------- BALL LAUNCH --------------------
function loadBallIntoShooter() {
  ball.x = W - 20;
  ball.y = H - 120;
  ball.vx = 0;
  ball.vy = 0;
  ball.inShooter = true;
}

function launchBallWithPower() {
  const power = Math.max(plungerMin, Math.min(plungerPower, plungerMax));

  ball.inShooter = false;
  ball.vx = -power * 0.15;
  ball.vy = -power * 2.5;

  plungerPower = 0;
}

// -------------------- FLIPPER MATH --------------------
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateFlippers(dt) {
  const t = Math.min(1, dt * 40);
  leftAngle = lerp(leftAngle, leftActiveState ? leftActive : leftRest, t);
  rightAngle = lerp(rightAngle, rightActiveState ? rightActive : rightRest, t);
}

function flipperEndpoints(px, py, angle) {
  const dx = Math.cos(angle) * flipperLength;
  const dy = Math.sin(angle) * flipperLength;
  return { x1: px, y1: py, x2: px + dx, y2: py + dy };
}

function reflectBallFromSegment(x1, y1, x2, y2, isActive) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = ball.x - x1;
  const wy = ball.y - y1;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return;

  let t = (wx * vx + wy * vy) / len2;
  t = Math.max(0, Math.min(1, t));

  const px = x1 + t * vx;
  const py = y1 + t * vy;

  const dx = ball.x - px;
  const dy = ball.y - py;
  const dist2 = dx * dx + dy * dy;

  if (dist2 < ball.r * ball.r) {
    const dist = Math.sqrt(dist2) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;

    const penetration = ball.r - dist;
    ball.x += nx * penetration;
    ball.y += ny * penetration;

    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;

    //if (isActive) {
      const boost = 260;
      ball.vx += nx * boost;
      ball.vy += ny * boost;
      score += 50;
   // }
  }
}

// -------------------- BUMPERS --------------------
function handleBumperCollisions() {
  for (const b of bumpers) {
    const dx = ball.x - b.x;
    const dy = ball.y - b.y;
    const dist2 = dx * dx + dy * dy;
    const rSum = ball.r + b.r;

    if (dist2 < rSum * rSum) {
      const dist = Math.sqrt(dist2) || 0.0001;
      const nx = dx / dist;
      const ny = dy / dist;

      const penetration = rSum - dist;
      ball.x += nx * penetration;
      ball.y += ny * penetration;

      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;

      ball.vx += nx * b.force;
      ball.vy += ny * b.force;

      score += b.score;
    }
  }
}

// -------------------- SLINGSHOTS --------------------
function handleSlingshotCollisions() {
  for (const s of slingshots) {
    const vx = s.x2 - s.x1;
    const vy = s.y2 - s.y1;
    const wx = ball.x - s.x1;
    const wy = ball.y - s.y1;

    const len2 = vx * vx + vy * vy;
    if (len2 === 0) continue;

    let t = (wx * vx + wy * vy) / len2;
    t = Math.max(0, Math.min(1, t));

    const px = s.x1 + t * vx;
    const py = s.y1 + t * vy;

    const dx = ball.x - px;
    const dy = ball.y - py;
    const dist2 = dx * dx + dy * dy;

    if (dist2 < ball.r * ball.r) {
      const dist = Math.sqrt(dist2) || 0.0001;
      const nx = dx / dist;
      const ny = dy / dist;

      const penetration = ball.r - dist;
      ball.x += nx * penetration;
      ball.y += ny * penetration;

      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;

      ball.vx += nx * s.force;
      ball.vy += ny * s.force;

      score += s.score;

      // LED flash
      s.flash = 1;
    }
  }
}

// -------------------- BALL DRAIN --------------------
function loseBall() {
  balls--;
  if (balls <= 0) {
    gameOver = true;
    return;
  }
  loadBallIntoShooter();
}

// -------------------- UPDATE --------------------
function update(dt) {
  if (gameOver) return;

  updateFlippers(dt);

  // Plunger charge
  if (plungerCharging && ball.inShooter) {
    plungerPower += plungerChargeRate * dt;
    if (plungerPower > plungerMax) plungerPower = plungerMax;
  }

  // Gravity only when in play
  if (!ball.inShooter) {
    ball.vy += gravity * dt;
  }

  // Apply velocity + nudge
  ball.x += ball.vx * dt + nudgeX * dt;
  ball.y += ball.vy * dt + nudgeY * dt;

  // Damping
  ball.vx *= damping;
  ball.vy *= damping;

  // Walls (only when in play)
  if (!ball.inShooter) {
    if (ball.x - ball.r < 10) {
      ball.x = 10 + ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.r > W - 10) {
      ball.x = W - 10 - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r < 50) {
      ball.y = 50 + ball.r;
      ball.vy = Math.abs(ball.vy);
    }
  }

  // Drain
  if (ball.y - ball.r > H + 40) {
    loseBall();
  }

  // Flipper collisions
  const leftSeg = flipperEndpoints(leftPivotX, flipperPivotY, leftAngle);
  const rightSeg = flipperEndpoints(rightPivotX, flipperPivotY, rightAngle);

  reflectBallFromSegment(
    leftSeg.x1,
    leftSeg.y1,
    leftSeg.x2,
    leftSeg.y2,
    leftActiveState
  );
  reflectBallFromSegment(
    rightSeg.x1,
    rightSeg.y1,
    rightSeg.x2,
    rightSeg.y2,
    rightActiveState
  );

  // Bumpers + slings
  handleBumperCollisions();
  handleSlingshotCollisions();

  // Fade slingshot LED flash
  for (const s of slingshots) {
    s.flash = Math.max(0, s.flash - dt * 4);
  }
}

// -------------------- DRAW --------------------
function drawDMD() {
  ctx.save();
  ctx.fillStyle = "rgba(20, 8, 0, 0.85)";
  ctx.fillRect(0, 0, W, 40);

  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#ff9b00";

  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${score.toString().padStart(6, "0")}`, 12, 26);
  ctx.textAlign = "right";
  ctx.fillText(`BALL: ${balls}`, W - 12, 26);

  if (ball.inShooter) {
    ctx.textAlign = "center";
    ctx.fillText(`PLUNGER: ${Math.floor(plungerPower)}`, W / 2 + 30, 26);
  }

  if (gameOver) {
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#ff2bd6";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", W / 2 + 30, 26);
  }

  ctx.restore();
}

function drawPlungerUI() {
  if (!ball.inShooter) return;

  const barX = W - 25;
  const barY = 60;
  const barWidth = 12;
  const barHeight = H - 120;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.restore();

  const fillRatio = Math.min(plungerPower / plungerMax, 1);
  const fillHeight = barHeight * fillRatio;

  ctx.save();
  const grad = ctx.createLinearGradient(0, barY + barHeight, 0, barY);
  grad.addColorStop(0, "#ff2bd6");
  grad.addColorStop(1, "#ff9b00");

  ctx.fillStyle = grad;
  ctx.shadowColor = "#ff2bd6";
  ctx.shadowBlur = 10;

  ctx.fillRect(barX, barY + (barHeight - fillHeight), barWidth, fillHeight);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  ctx.restore();
}

function drawSlingshots() {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  for (const s of slingshots) {
    const glow = s.flash > 0 ? s.flash : 0;

    ctx.strokeStyle = glow
      ? `rgba(255, 43, 214, ${glow})`
      : "rgba(255,255,255,0.25)";

    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = glow * 20;

    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFlipper(px, py, angle, isLeft) {
  const dx = Math.cos(angle) * flipperLength;
  const dy = Math.sin(angle) * flipperLength;
  const x2 = px + dx;
  const y2 = py + dy;

  ctx.save();
  ctx.strokeStyle = isLeft ? "#ff2bd6" : "#3df5ff";
  ctx.lineWidth = flipperWidth;
  ctx.lineCap = "round";
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawDMD();

  // Playfield border
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 4;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(8, 48, W - 16, H - 56, 18);
    ctx.stroke();
  } else {
    ctx.strokeRect(8, 48, W - 16, H - 56);
  }
  ctx.restore();

  drawSlingshots();
  drawPlungerUI();

  // Bumpers
  ctx.save();
  bumpers.forEach((b) => {
    const grad = ctx.createRadialGradient(
      b.x - 4,
      b.y - 4,
      2,
      b.x,
      b.y,
      b.r + 4
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#ff2bd6");
    ctx.fillStyle = grad;
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Ball
  ctx.save();
  const grad = ctx.createRadialGradient(
    ball.x - 3,
    ball.y - 3,
    2,
    ball.x,
    ball.y,
    ball.r + 2
  );
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#3df5ff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Flippers
  drawFlipper(leftPivotX, flipperPivotY, leftAngle, true);
  drawFlipper(rightPivotX, flipperPivotY, rightAngle, false);
}

// -------------------- LOOP --------------------
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

loadBallIntoShooter();
requestAnimationFrame(loop);
