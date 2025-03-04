/***********************
 * Particle Background (Stars) *
 ***********************/
const starsCanvas = document.getElementById('stars-canvas');
const ctx = starsCanvas.getContext('2d');
let particles = [];
const particleCount = 400;

if (starsCanvas) {
  starsCanvas.width = window.innerWidth;
  starsCanvas.height = window.innerHeight;
} else {
  console.error("Stars canvas not found!");
}

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
    if (distance < 100) {
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
  if (ctx) {
    ctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animateParticles);
  }
}

if (starsCanvas && ctx) {
  initParticles();
  animateParticles();
}

window.addEventListener('resize', () => {
  if (starsCanvas) {
    starsCanvas.width = window.innerWidth;
    starsCanvas.height = window.innerHeight;
    initParticles();
  }
});

/************************************
 * Enhanced Three.js Footer Scene *
 ************************************/
function initFooterScene() {
  const earthContainer = document.getElementById('earth');
  if (!earthContainer) {
    console.error("Earth container not found! Check if #earth exists in the DOM.");
    return;
  }

  if (typeof THREE === 'undefined') {
    console.error("Three.js library not loaded! Check assets/three.min.js.");
    return;
  }

  console.log("Initializing enhanced Three.js footer scene...");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 350, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, 350);
  renderer.setPixelRatio(window.devicePixelRatio);

  earthContainer.insertBefore(renderer.domElement, earthContainer.querySelector('.footer-text'));
  console.log("Three.js renderer appended to #earth successfully");

  const gl = renderer.getContext();
  if (!gl) {
    console.error("WebGL context not available!");
    return;
  }

  // Enhanced Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  const sunLight = new THREE.PointLight(0xffffcc, 1.5, 100);
  sunLight.position.set(20, 30, 20);
  scene.add(sunLight);

  // Ground with Solid Color
  const groundGeometry = new THREE.PlaneGeometry(120, 120, 64, 64);
  const positionAttribute = groundGeometry.attributes.position;
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = (Math.sin(x * 0.1) + Math.cos(y * 0.1)) * 3;
    positionAttribute.setZ(i, z);
  }
  positionAttribute.needsUpdate = true;
  groundGeometry.computeVertexNormals();
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228B22, // Green
    roughness: 0.8,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0; // Centered in view
  scene.add(ground);
  console.log("Ground added to scene at position:", ground.position);

  // More Trees
  function createTree(x, z, height) {
    const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, height * 0.4, 12);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, height * 0.2, z);

    const foliageGeometry = new THREE.SphereGeometry(height * 0.4, 16, 16);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.9 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(x, height * 0.6, z);
    foliage.scale.set(1.5, 1.2, 1.5);

    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(foliage);
    scene.add(tree);
  }
  createTree(-15, 5, 10);
  createTree(10, -10, 12);
  createTree(-5, 15, 8);
  createTree(-25, -5, 11);
  createTree(20, 10, 9);
  createTree(-10, -20, 13);
  createTree(15, 20, 10);
  createTree(0, 0, 12);

  // Enhanced Clouds
  const clouds = [];
  class Cloud {
    constructor() {
      this.mesh = new THREE.Group();
      const geometry = new THREE.SphereGeometry(2, 16, 16);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
      const puff1 = new THREE.Mesh(geometry, material);
      const puff2 = new THREE.Mesh(geometry, material);
      puff2.scale.set(0.8, 0.8, 0.8);
      puff2.position.set(-2, 0, 0);
      const puff3 = new THREE.Mesh(geometry, material);
      puff3.scale.set(0.9, 0.9, 0.9);
      puff3.position.set(2, 0, 0);
      this.mesh.add(puff1, puff2, puff3);
      this.mesh.position.set(-50, 12 + Math.random() * 5, (Math.random() - 0.5) * 20);
      this.baseScale = 1;
      scene.add(this.mesh);
    }
    update() {
      this.mesh.position.x += 0.1;
      if (this.mesh.position.x > 50) {
        this.mesh.position.x = -50;
        this.mesh.position.z = (Math.random() - 0.5) * 20;
      }
      this.baseScale = 1 + Math.sin(Date.now() * 0.001) * 0.1;
      this.mesh.scale.set(this.baseScale, this.baseScale, this.baseScale);
    }
  }
  for (let i = 0; i < 6; i++) {
    clouds.push(new Cloud());
  }

  // Enhanced Moon with Glow
  const moonGeometry = new THREE.SphereGeometry(5, 32, 32);
  const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xD3D3D3, roughness: 0.7, emissive: 0x333333 });
  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(30, 25, -25);
  scene.add(moon);
  const moonGlow = new THREE.PointLight(0xaaaaaa, 0.5, 50);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);

  // Enhanced Satellite (Higher, Bigger, Full Width)
  const satelliteBody = new THREE.BoxGeometry(2, 1, 4);
  const satelliteMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const satellite = new THREE.Mesh(satelliteBody, satelliteMaterial);
  const panelGeometry = new THREE.PlaneGeometry(5, 3);
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
  const panelLeft = new THREE.Mesh(panelGeometry, panelMaterial);
  panelLeft.position.set(-3.5, 0, 0);
  panelLeft.rotation.y = Math.PI / 2;
  const panelRight = new THREE.Mesh(panelGeometry, panelMaterial);
  panelRight.position.set(3.5, 0, 0);
  panelRight.rotation.y = Math.PI / 2;
  const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 });
  const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
  antenna.position.set(0, 2, 0);
  const satelliteGroup = new THREE.Group();
  satelliteGroup.add(satellite, panelLeft, panelRight, antenna);
  satelliteGroup.position.set(-window.innerWidth / 2, 100, 0); // High in black area
  scene.add(satelliteGroup);

  // Camera to Ensure Ground Visibility
  camera.position.set(0, 30, 50); // Focused on ground
  camera.lookAt(0, 0, 0); // Center of scene

  function animateFooter() {
    requestAnimationFrame(animateFooter);
    clouds.forEach(cloud => cloud.update());
    satelliteGroup.position.x += 1;
    if (satelliteGroup.position.x > window.innerWidth / 2) {
      satelliteGroup.position.x = -window.innerWidth / 2;
    }
    satelliteGroup.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
  animateFooter();

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, 350);
    camera.aspect = window.innerWidth / 350;
    camera.updateProjectionMatrix();
    satelliteGroup.position.x = -window.innerWidth / 2; // Reset satellite
  });

  console.log("Enhanced Three.js scene setup complete");
}

// Button Event Listeners and Scene Init
window.addEventListener('load', () => {
  console.log("DOM fully loaded, scheduling footer scene initialization...");
  setTimeout(() => {
    initFooterScene();
  }, 100);

  // Explore Button: Scroll to #robots
  const exploreBtn = document.getElementById('explore-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
      document.getElementById('robots').scrollIntoView({ behavior: 'smooth' });
    });
  } else {
    console.error("Explore button not found!");
  }

  // GitHub Button: Open GitHub link
  const githubBtn = document.getElementById('github-btn');
  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      window.open('https://github.com/zkortam/Nexus', '_blank');
    });
  } else {
    console.error("GitHub button not found!");
  }
});

/************************************
 * Occupancy Grid and Chart Setup *
 ************************************/
const sandboxCanvas = document.getElementById('sandbox-canvas');
let sCtx;
if (sandboxCanvas) {
  sCtx = sandboxCanvas.getContext('2d');
  sandboxCanvas.width = 1100;
  sandboxCanvas.height = 400;
} else {
  console.error("Sandbox canvas not found!");
}

const speedSlider = document.getElementById('speed-slider');
const baseSpeed = 3;

const cellSize = 20;
const gridCols = Math.floor(sandboxCanvas ? sandboxCanvas.width / cellSize : 0);
const gridRows = Math.floor(sandboxCanvas ? sandboxCanvas.height / cellSize : 0);
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
if (sandboxCanvas) initOccupancyGrid();

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
            if (pointInObstacle(cellCenterX, cellCenterY, o)) {
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
  if (freeDots.length > 0 && mappingChart && mappingChart.data) {
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

function circleCircleCollision(cx1, cy1, r1, cx2, cy2, r2) {
  let dx = cx1 - cx2;
  let dy = cy1 - cy2;
  let distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (r1 + r2);
}

function pointInTriangle(px, py, tri) {
  const [x1, y1] = tri.points[0];
  const [x2, y2] = tri.points[1];
  const [x3, y3] = tri.points[2];
  const area = 0.5 * (-y2 * x3 + y1 * (-x2 + x3) + x1 * (y2 - y3) + x2 * y3);
  const s = 1 / (2 * area) * (y1 * x3 - x1 * y3 + (y3 - y1) * px + (x1 - x3) * py);
  const t = 1 / (2 * area) * (x1 * y2 - y1 * x2 + (y1 - y2) * px + (x2 - x1) * py);
  return s > 0 && t > 0 && (1 - s - t) > 0;
}

function pointInHexagon(px, py, hex) {
  let inside = false;
  for (let i = 0, j = 5; i < 6; i++) {
    const [xi, yi] = hex.points[i];
    const [xj, yj] = hex.points[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

function pointInTrapezoid(px, py, trap) {
  const [x1, y1] = trap.points[0];
  const [x2, y2] = trap.points[1];
  const [x3, y3] = trap.points[2];
  const [x4, y4] = trap.points[3];
  const area = 0.5 * ((x1 * y2 - x2 * y1) + (x2 * y3 - x3 * y2) + (x3 * y4 - x4 * y3) + (x4 * y1 - x1 * y4));
  const s = 1 / (2 * area) * ((y1 * x2 - x1 * y2) + (y2 - y1) * px + (x1 - x2) * py);
  const t = 1 / (2 * area) * ((y2 * x3 - x2 * y3) + (y3 - y2) * px + (x2 - x3) * py);
  return s > 0 && t > 0 && (s + t) < 1;
}

function willCollide(x, y) {
  for (let o of obstacles) {
    if (o.shape === "rect" && circleRectCollision(x, y, robot.size, o)) return true;
    if (o.shape === "circle" && circleCircleCollision(x, y, robot.size, o.cx, o.cy, o.r)) return true;
    if (o.shape === "triangle" && pointInTriangle(x, y, o)) return true;
    if (o.shape === "hexagon" && pointInHexagon(x, y, o)) return true;
    if (o.shape === "square" && circleRectCollision(x, y, robot.size, o)) return true;
    if (o.shape === "trapezoid" && pointInTrapezoid(x, y, o)) return true;
  }
  return false;
}

function pointRectDistance(px, py, rect) {
  let dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  let dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.sqrt(dx * dx + dy * dy);
}

function pointCircleDistance(px, py, circle) {
  let dx = px - circle.cx;
  let dy = py - circle.cy;
  return Math.sqrt(dx * dx + dy * dy) - circle.r;
}

function pointPolygonDistance(px, py, poly) {
  let minDist = Infinity;
  for (let i = 0; i < poly.points.length; i++) {
    const [x1, y1] = poly.points[i];
    const [x2, y2] = poly.points[(i + 1) % poly.points.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    minDist = Math.min(minDist, dist);
  }
  return minDist;
}

function pointInObstacle(px, py, o) {
  if (o.shape === "rect") {
    return px > o.x && px < o.x + o.w && py > o.y && py < o.y + o.h;
  } else if (o.shape === "circle") {
    return Math.sqrt((px - o.cx) ** 2 + (py - o.cy) ** 2) < o.r;
  } else if (o.shape === "triangle") {
    return pointInTriangle(px, py, o);
  } else if (o.shape === "hexagon") {
    return pointInHexagon(px, py, o);
  } else if (o.shape === "square") {
    return px > o.x && px < o.x + o.w && py > o.y && py < o.y + o.w;
  } else if (o.shape === "trapezoid") {
    return pointInTrapezoid(px, py, o);
  }
  return false;
}

/*****************************
 * Obstacle Avoidance Helpers *
 *****************************/
function avoidObstacle() {
  const detectionThreshold = 40;
  let closestObs = null;
  let minDist = Infinity;
  for (let o of obstacles) {
    let d = o.shape === "rect" || o.shape === "square" ? pointRectDistance(robot.x, robot.y, o) :
            o.shape === "circle" ? pointCircleDistance(robot.x, robot.y, o) :
            pointPolygonDistance(robot.x, robot.y, o);
    if (d < minDist) {
      minDist = d;
      closestObs = o;
    }
  }
  if (minDist < detectionThreshold && closestObs) {
    let obsCenterX = closestObs.shape === "rect" || closestObs.shape === "square" ? closestObs.x + closestObs.w / 2 :
                     closestObs.shape === "circle" ? closestObs.cx :
                     closestObs.points.reduce((sum, p) => sum + p[0], 0) / closestObs.points.length;
    let obsCenterY = closestObs.shape === "rect" || closestObs.shape === "square" ? closestObs.y + closestObs.h / 2 :
                     closestObs.shape === "circle" ? closestObs.cy :
                     closestObs.points.reduce((sum, p) => sum + p[1], 0) / closestObs.points.length;
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
  obstacles = [];
  if (mode === "easy") {
    obstacles = [
      { x: 200, y: 150, w: 50, h: 150, shape: "rect" },
      { x: 400, y: 100, cx: 425, cy: 125, r: 25, shape: "circle" },
      { x: 600, y: 200, points: [[600, 200], [650, 200], [625, 250]], shape: "triangle" }
    ];
  } else if (mode === "medium") {
    obstacles = [
      { x: 150, y: 100, w: 50, h: 150, shape: "rect" },
      { x: 300, y: 200, cx: 325, cy: 225, r: 30, shape: "circle" },
      { x: 450, y: 50, points: [[450, 50], [510, 50], [510, 110], [450, 110]], shape: "square" },
      { x: 600, y: 180, points: [[600, 180], [650, 180], [640, 230], [610, 230]], shape: "trapezoid" },
      { x: 750, y: 130, points: [[750, 130], [780, 110], [810, 130], [810, 170], [780, 190], [750, 170]], shape: "hexagon" }
    ];
  } else if (mode === "hard") {
    obstacles = [
      { x: 100, y: 100, w: 40, h: 150, shape: "rect" },
      { x: 220, y: 50, cx: 245, cy: 75, r: 25, shape: "circle" },
      { x: 350, y: 180, points: [[350, 180], [410, 180], [380, 240]], shape: "triangle" },
      { x: 480, y: 80, points: [[480, 80], [520, 80], [520, 120], [480, 120]], shape: "square" },
      { x: 600, y: 200, points: [[600, 200], [650, 200], [640, 250], [610, 250]], shape: "trapezoid" },
      { x: 730, y: 100, points: [[730, 100], [760, 80], [790, 100], [790, 140], [760, 160], [730, 140]], shape: "hexagon" },
      { x: 860, y: 150, w: 50, h: 100, shape: "rect" },
      { x: 980, y: 80, cx: 1000, cy: 110, r: 20, shape: "circle" }
    ];
  }
}

if (sandboxCanvas) initObstacles("medium");

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

let lastProximityCount = 0;
function drawObstacles() {
  let proximityCount = 0;
  obstacles.forEach(o => {
    let d = o.shape === "rect" || o.shape === "square" ? pointRectDistance(robot.x, robot.y, o) :
            o.shape === "circle" ? pointCircleDistance(robot.x, robot.y, o) :
            pointPolygonDistance(robot.x, robot.y, o);
    if (d < 40) {
      sCtx.fillStyle = "#00FF00";
      proximityCount++;
    } else {
      sCtx.fillStyle = "#ff6347";
    }
    if (o.shape === "rect" || o.shape === "square") {
      sCtx.fillRect(o.x, o.y, o.w, o.shape === "square" ? o.w : o.h);
    } else if (o.shape === "circle") {
      sCtx.beginPath();
      sCtx.arc(o.cx, o.cy, o.r, 0, Math.PI * 2);
      sCtx.fill();
    } else if (o.shape === "triangle" || o.shape === "hexagon" || o.shape === "trapezoid") {
      sCtx.beginPath();
      sCtx.moveTo(o.points[0][0], o.points[0][1]);
      for (let i = 1; i < o.points.length; i++) {
        sCtx.lineTo(o.points[i][0], o.points[i][1]);
      }
      sCtx.closePath();
      sCtx.fill();
    }
  });
  if (proximityCount > lastProximityCount) {
    collisionCount += proximityCount - lastProximityCount;
  }
  lastProximityCount = proximityCount;
}

/**********************************
 * Robot Navigation and Update *
 **********************************/
const diffSelect = document.getElementById("difficulty");
const restartBtn = document.getElementById("restart");

let explorationPhase = true;
let robot = { x: 50, y: sandboxCanvas ? sandboxCanvas.height / 2 : 200, size: 20, speed: baseSpeed, direction: Math.random() * Math.PI * 2, inCollision: false };

let cumulativeDistance = 0;
let collisionCount = 0;
let turnCount = 0;
let simulationTime = 0;
let scanCounter = 0;

function updateRobot() {
  if (finished || !sCtx) return;
  
  let speedMultiplier = speedSlider ? Number(speedSlider.value) : 1;
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
      if (willCollide(robot.x, robot.y)) {
        let centerX = o.shape === "rect" || o.shape === "square" ? o.x + o.w / 2 :
                       o.shape === "circle" ? o.cx :
                       o.points.reduce((sum, p) => sum + p[0], 0) / o.points.length;
        let centerY = o.shape === "rect" ? o.y + o.h / 2 :
                       o.shape === "square" ? o.y + o.w / 2 :
                       o.shape === "circle" ? o.cy :
                       o.points.reduce((sum, p) => sum + p[1], 0) / o.points.length;
        let diffX = robot.x - centerX;
        let diffY = robot.y - centerY;
        robot.direction = Math.atan2(diffY, diffX) + Math.PI;
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
  if (sCtx) {
    sCtx.fillStyle = "#1e90ff";
    sCtx.beginPath();
    sCtx.arc(robot.x, robot.y, robot.size, 0, Math.PI * 2);
    sCtx.fill();
  }
}

function animateSandbox() {
  if (sCtx) {
    sCtx.clearRect(0, 0, sandboxCanvas.width, sandboxCanvas.height);
    updateRobot();
    drawRobot();
    drawObstacles();
    drawFinishLine();
    if (finished) {
      drawCelebration();
    }
    requestAnimationFrame(animateSandbox);
  } else {
    console.error("Sandbox context not available for animation!");
  }
}

if (sandboxCanvas && sCtx) {
  animateSandbox();
}

/*****************************
 * Dynamic Chart.js Updates *
 *****************************/
function createCharts() {
  const chart1 = document.getElementById('chart1');
  const chart2 = document.getElementById('chart2');
  const chart3 = document.getElementById('chart3');
  
  if (!chart1 || !chart2 || !chart3) {
    console.error("One or more chart canvases not found!");
    return;
  }

  const mappingCtx = chart1.getContext('2d');
  const obstacleCtx = chart2.getContext('2d');
  const learningCtx = chart3.getContext('2d');
  
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
        label: 'Obstacle Encounters (Collisions + Proximity)',
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
    
    if (obstacleChart) {
      obstacleChart.data.labels.push(simulationTime.toFixed(1));
      obstacleChart.data.datasets[0].data.push(collisionCount);
      obstacleChart.update();
    }
    
    if (learningChart) {
      learningChart.data.labels.push(simulationTime.toFixed(1));
      learningChart.data.datasets[0].data.push(efficiencyMetric.toFixed(1));
      learningChart.update();
    }
    
    if (mappingChart) {
      let mappingPercent = computeMappingPercentage();
      mappingChart.options.plugins.title.text = "Mapping Progress: " + mappingPercent.toFixed(1) + "%";
      mappingChart.update();
    }
  }, 500);
});

/***********************
 * Restart & Controls *
 ***********************/
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    explorationPhase = true;
    finished = false;
    initOccupancyGrid();
    resetSimulation();
  });
}

function resetSimulation() {
  cumulativeDistance = 0;
  collisionCount = 0;
  turnCount = 0;
  simulationTime = 0;
  scanCounter = 0;
  lastProximityCount = 0;
  robot = { x: 50, y: sandboxCanvas ? sandboxCanvas.height / 2 : 200, size: 20, speed: baseSpeed, direction: Math.random() * Math.PI * 2, inCollision: false };
  let mode = diffSelect ? diffSelect.value : "medium";
  initObstacles(mode);
}