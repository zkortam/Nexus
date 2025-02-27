/***********************
 * Particle Background *
 ***********************/
const starsCanvas = document.getElementById('stars-canvas');
const ctx = starsCanvas.getContext('2d');
let particles = [];
const particleCount = 400;  // Denser star field
starsCanvas.width = window.innerWidth;
starsCanvas.height = window.innerHeight;

let mouse = { x: null, y: null };
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

class Particle {
  constructor() {
    this.x = Math.random() * starsCanvas.width;
    this.y = Math.random() * starsCanvas.height;
    this.size = Math.random() * 2 + 1;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
  }
  update() {
    let dx = mouse.x - this.x;
    let dy = mouse.y - this.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 100) {  // More intense displacement
      this.x -= dx * 0.1;
      this.y -= dy * 0.1;
    }
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x < 0) this.x = starsCanvas.width;
    if (this.x > starsCanvas.width) this.x = 0;
    if (this.y < 0) this.y = starsCanvas.height;
    if (this.y > starsCanvas.height) this.y = 0;
  }
  draw() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

window.addEventListener('resize', () => {
  starsCanvas.width = window.innerWidth;
  starsCanvas.height = window.innerHeight;
  initParticles();
});

/************************************
 * Occupancy Grid and Chart Setup *
 ************************************/
const sandboxCanvas = document.getElementById('sandbox-canvas');
const sCtx = sandboxCanvas.getContext('2d');
sandboxCanvas.width = 1100;
sandboxCanvas.height = 400;
const speedSlider = document.getElementById('speed-slider');
const baseSpeed = 3;

const cellSize = 20;
const gridCols = Math.floor(sandboxCanvas.width / cellSize);
const gridRows = Math.floor(sandboxCanvas.height / cellSize);
let occupancyGrid = [];
function initOccupancyGrid() {
  occupancyGrid = [];
  for (let i = 0; i < gridRows; i++) {
    let row = [];
    for (let j = 0; j < gridCols; j++) {
      row.push(0); // 0 = unknown
    }
    occupancyGrid.push(row);
  }
}
initOccupancyGrid();

let mappingChart, obstacleChart, learningChart;

/****************************
 * Scanning & Frontier Code *
 ****************************/
function scanEnvironment() {
  const scanRadius = 50;
  let freeDots = [];
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (occupancyGrid[i][j] === 0) {
        let cellCenterX = j * cellSize + cellSize / 2;
        let cellCenterY = i * cellSize + cellSize / 2;
        let dx = cellCenterX - robot.x;
        let dy = cellCenterY - robot.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d < scanRadius) {
          let occupied = false;
          for (let o of obstacles) {
            if (
              cellCenterX > o.x &&
              cellCenterX < o.x + o.w &&
              cellCenterY > o.y &&
              cellCenterY < o.y + o.h
            ) {
              occupied = true;
              break;
            }
          }
          occupancyGrid[i][j] = occupied ? 1 : 2;
          if (!occupied) {
            freeDots.push({ x: cellCenterX, y: cellCenterY });
          }
        }
      }
    }
  }
  if (freeDots.length > 0 && mappingChart) {
    mappingChart.data.datasets[1].data.push(...freeDots);
    mappingChart.update();
  }
}

function findFrontier() {
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (occupancyGrid[i][j] === 0) {
        let neighbors = [];
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            let ni = i + di, nj = j + dj;
            if (ni >= 0 && ni < gridRows && nj >= 0 && nj < gridCols) {
              neighbors.push(occupancyGrid[ni][nj]);
            }
          }
        }
        if (neighbors.some(val => val === 1 || val === 2)) {
          return { x: j * cellSize + cellSize / 2, y: i * cellSize + cellSize / 2 };
        }
      }
    }
  }
  return null;
}

function computeMappingPercentage() {
  let scanned = 0;
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (occupancyGrid[i][j] !== 0) scanned++;
    }
  }
  return (scanned / (gridRows * gridCols)) * 100;
}

/********************************
 * Collision and Distance Helpers *
 ********************************/
function circleRectCollision(cx, cy, r, rect) {
  let distX = Math.abs(cx - (rect.x + rect.w / 2));
  let distY = Math.abs(cy - (rect.y + rect.h / 2));
  if (distX > (rect.w / 2 + r)) return false;
  if (distY > (rect.h / 2 + r)) return false;
  if (distX <= (rect.w / 2)) return true;
  if (distY <= (rect.h / 2)) return true;
  let dx = distX - rect.w / 2;
  let dy = distY - rect.h / 2;
  return (dx * dx + dy * dy <= (r * r));
}

function willCollide(x, y) {
  for (let o of obstacles) {
    if (circleRectCollision(x, y, robot.size, o)) return true;
  }
  return false;
}

function pointRectDistance(px, py, rect) {
  let dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  let dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.sqrt(dx * dx + dy * dy);
}

/*****************************
 * Obstacle Avoidance Helpers *
 *****************************/
function avoidObstacle() {
  const detectionThreshold = 60;
  let closestObs = null;
  let minDist = Infinity;
  for (let o of obstacles) {
    let d = pointRectDistance(robot.x, robot.y, o);
    if (d < minDist) {
      minDist = d;
      closestObs = o;
    }
  }
  if (minDist < detectionThreshold && closestObs) {
    let obsCenterX = closestObs.x + closestObs.w / 2;
    let obsCenterY = closestObs.y + closestObs.h / 2;
    return Math.atan2(robot.y - obsCenterY, robot.x - obsCenterX);
  }
  return null;
}

function simulateDistance(candidateAngle) {
  let simulatedX = robot.x;
  let simulatedY = robot.y;
  let total = 0;
  for (let i = 0; i < 5; i++) {
    simulatedX += Math.cos(candidateAngle) * robot.speed;
    simulatedY += Math.sin(candidateAngle) * robot.speed;
    if (willCollide(simulatedX, simulatedY)) break;
    total += robot.speed;
  }
  return total;
}

function findSafeDirection(currentAngle) {
  let bestAngle = currentAngle;
  let bestDistance = 0;
  for (let offset = -0.52; offset <= 0.52; offset += 0.0873) {
    let candidateAngle = currentAngle + offset;
    let candidateX = robot.x + Math.cos(candidateAngle) * robot.speed;
    let candidateY = robot.y + Math.sin(candidateAngle) * robot.speed;
    if (!willCollide(candidateX, candidateY)) {
      let dist = simulateDistance(candidateAngle);
      if (dist > bestDistance) {
        bestDistance = dist;
        bestAngle = candidateAngle;
      }
    }
  }
  return bestAngle;
}

/**********************************
 * Difficulty Modes & Finish Line *
 **********************************/
let obstacles = [];
let finished = false;
function initObstacles(mode) {
  if (mode === "easy") {
    obstacles = [
      { x: 200, y: 150, w: 50, h: 150 },
      { x: 400, y: 100, w: 50, h: 100 },
      { x: 600, y: 200, w: 50, h: 150 }
    ];
  } else if (mode === "medium") {
    obstacles = [
      { x: 150, y: 100, w: 50, h: 150 },
      { x: 300, y: 200, w: 50, h: 100 },
      { x: 450, y: 50,  w: 50, h: 120 },
      { x: 600, y: 180, w: 50, h: 80 },
      { x: 750, y: 130, w: 50, h: 150 }
    ];
  } else if (mode === "hard") {
    obstacles = [
      { x: 100, y: 100, w: 40, h: 150 },
      { x: 220, y: 50,  w: 50, h: 100 },
      { x: 350, y: 180, w: 60, h: 150 },
      { x: 480, y: 80,  w: 40, h: 120 },
      { x: 600, y: 200, w: 50, h: 100 },
      { x: 730, y: 100, w: 60, h: 150 },
      { x: 860, y: 150, w: 50, h: 100 },
      { x: 980, y: 80,  w: 40, h: 120 }
    ];
  }
}

function drawFinishLine() {
  sCtx.strokeStyle = "#FFFFFF";
  sCtx.lineWidth = 5;
  sCtx.beginPath();
  sCtx.moveTo(sandboxCanvas.width - 5, 0);
  sCtx.lineTo(sandboxCanvas.width - 5, sandboxCanvas.height);
  sCtx.stroke();
}

function drawCelebration() {
  sCtx.fillStyle = "rgba(255,255,0,0.8)";
  sCtx.font = "48px Arial";
  sCtx.textAlign = "center";
  sCtx.fillText("Congratulations!", sandboxCanvas.width / 2, sandboxCanvas.height / 2);
}

/**********************************
 * Robot Navigation and Update *
 **********************************/
const diffSelect = document.getElementById("difficulty");
const restartBtn = document.getElementById("restart");

let explorationPhase = true;
let robot = { x: 50, y: sandboxCanvas.height / 2, size: 20, speed: baseSpeed, direction: Math.random() * Math.PI * 2, inCollision: false };

let cumulativeDistance = 0;
let collisionCount = 0;
let turnCount = 0;
let simulationTime = 0;
let scanCounter = 0;

function updateRobot() {
  if (finished) return;
  
  let speedMultiplier = Number(speedSlider.value);
  robot.speed = baseSpeed * speedMultiplier;
  
  scanCounter++;
  if (scanCounter % 20 === 0) {
    scanEnvironment();
  }
  
  if (explorationPhase) {
    let frontier = findFrontier();
    if (frontier) {
      robot.direction = Math.atan2(frontier.y - robot.y, frontier.x - robot.x);
    } else {
      explorationPhase = false;
    }
  }
  
  let avoidanceDir = avoidObstacle();
  if (avoidanceDir !== null) {
    let safeDir = findSafeDirection(avoidanceDir);
    robot.direction = safeDir;
  }
  
  let proposedX = robot.x + Math.cos(robot.direction) * robot.speed;
  let proposedY = robot.y + Math.sin(robot.direction) * robot.speed;
  
  if (proposedX < robot.size) {
    proposedX = robot.size;
    robot.direction = Math.PI - robot.direction;
    turnCount++;
  }
  if (proposedX > sandboxCanvas.width - robot.size) {
    proposedX = sandboxCanvas.width - robot.size;
    robot.direction = Math.PI - robot.direction;
    turnCount++;
  }
  if (proposedY < robot.size) {
    proposedY = robot.size;
    robot.direction = -robot.direction;
    turnCount++;
  }
  if (proposedY > sandboxCanvas.height - robot.size) {
    proposedY = sandboxCanvas.height - robot.size;
    robot.direction = -robot.direction;
    turnCount++;
  }
  
  let attempts = 0;
  while (attempts < 5 && willCollide(proposedX, proposedY)) {
    for (let o of obstacles) {
      if (circleRectCollision(robot.x, robot.y, robot.size, o)) {
        let diffX = robot.x - (o.x + o.w / 2);
        let diffY = robot.y - (o.y + o.h / 2);
        if (Math.abs(diffX) > Math.abs(diffY)) {
          robot.direction = Math.PI - robot.direction;
        } else {
          robot.direction = -robot.direction;
        }
        break;
      }
    }
    proposedX = robot.x + Math.cos(robot.direction) * robot.speed;
    proposedY = robot.y + Math.sin(robot.direction) * robot.speed;
    attempts++;
  }
  
  if (willCollide(proposedX, proposedY)) {
    collisionCount++;
    let kickDir = Math.random() * Math.PI * 2;
    robot.x += Math.cos(kickDir) * robot.speed;
    robot.y += Math.sin(kickDir) * robot.speed;
    robot.direction = kickDir;
  } else {
    let dx = proposedX - robot.x;
    let dy = proposedY - robot.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    cumulativeDistance += dist;
    robot.x = proposedX;
    robot.y = proposedY;
  }
  
  if (robot.x + robot.size >= sandboxCanvas.width - 10) {
    finished = true;
  }
}

function drawRobot() {
  sCtx.fillStyle = "#1e90ff";
  sCtx.beginPath();
  sCtx.arc(robot.x, robot.y, robot.size, 0, Math.PI * 2);
  sCtx.fill();
}

function drawObstacles() {
  obstacles.forEach(o => {
    let d = pointRectDistance(robot.x, robot.y, o);
    if (d < 60) {
      sCtx.fillStyle = "#00FF00";
    } else {
      sCtx.fillStyle = "#ff6347";
    }
    sCtx.fillRect(o.x, o.y, o.w, o.h);
  });
}

function animateSandbox() {
  sCtx.clearRect(0, 0, sandboxCanvas.width, sandboxCanvas.height);
  updateRobot();
  drawRobot();
  drawObstacles();
  drawFinishLine();
  if (finished) {
    drawCelebration();
  }
  requestAnimationFrame(animateSandbox);
}

animateSandbox();

/*****************************
 * Dynamic Chart.js Updates  *
 *****************************/
function createCharts() {
  const mappingCtx = document.getElementById('chart1').getContext('2d');
  const obstacleCtx = document.getElementById('chart2').getContext('2d');
  const learningCtx = document.getElementById('chart3').getContext('2d');
  
  mappingChart = new Chart(mappingCtx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Collision Points',
          data: [],
          backgroundColor: '#FF4500',
          pointRadius: 5
        },
        {
          label: 'Mapped Free Areas',
          data: [],
          backgroundColor: '#00BFFF',
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, min: 0, max: sandboxCanvas.width },
        y: { beginAtZero: true, min: 0, max: sandboxCanvas.height, reverse: true }
      },
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: "Mapping Progress: 0%" }
      }
    }
  });
  
  obstacleChart = new Chart(obstacleCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Obstacle Encounters',
        data: [],
        borderColor: '#ff6347',
        backgroundColor: 'rgba(255,99,71,0.2)',
        pointBackgroundColor: '#FFA500',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
  
  learningChart = new Chart(learningCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Learning Curve',
        data: [],
        borderColor: '#63b3ed',
        backgroundColor: 'rgba(99,179,237,0.2)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

window.addEventListener('load', () => {
  createCharts();
  
  setInterval(() => {
    simulationTime += 0.5;
    let efficiencyMetric = cumulativeDistance / (collisionCount + turnCount + 1);
    
    obstacleChart.data.labels.push(simulationTime.toFixed(1));
    obstacleChart.data.datasets[0].data.push(collisionCount);
    obstacleChart.update();
    
    learningChart.data.labels.push(simulationTime.toFixed(1));
    learningChart.data.datasets[0].data.push(efficiencyMetric.toFixed(1));
    learningChart.update();
    
    let mappingPercent = computeMappingPercentage();
    mappingChart.options.plugins.title.text = "Mapping Progress: " + mappingPercent.toFixed(1) + "%";
    mappingChart.update();
  }, 500);
});

/***********************
 * Restart & Controls  *
 ***********************/
restartBtn.addEventListener("click", () => {
  explorationPhase = true;
  finished = false;
  initOccupancyGrid();
  resetSimulation();
});

function resetSimulation() {
  cumulativeDistance = 0;
  collisionCount = 0;
  turnCount = 0;
  simulationTime = 0;
  scanCounter = 0;
  robot = { x: 50, y: sandboxCanvas.height / 2, size: 20, speed: baseSpeed, direction: Math.random() * Math.PI * 2, inCollision: false };
  let mode = diffSelect.value;
  initObstacles(mode);
}