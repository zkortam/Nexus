/***********************
 * Particle Background (Stars) *
 ***********************/
const starsCanvas = document.getElementById('stars-canvas');
const ctx = starsCanvas ? starsCanvas.getContext('2d') : null;
let particles = [];
const particleCount = 800; // Increased from 400 to 800 for more stars

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
    this.reset();
    this.x = Math.random() * starsCanvas.width;
    this.y = Math.random() * starsCanvas.height;
  }
  reset() {
    this.size = Math.random() * 2 + 1;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.brightness = Math.random() * 0.5 + 0.5;
    this.pulseSpeed = Math.random() * 0.02 + 0.01;
    this.pulseOffset = Math.random() * Math.PI * 2;
  }
  update() {
    // Pulsing effect
    this.brightness = 0.5 + Math.sin(Date.now() * this.pulseSpeed + this.pulseOffset) * 0.2;
    // Mouse interaction with increased sensitivity
    if (mouse.x && mouse.y) {
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 150) { // Increased threshold
        let force = (150 - distance) / 150;
        this.x -= dx * force * 0.1; // Increased multiplier
        this.y -= dy * force * 0.1;
      }
    }
    this.x += this.speedX;
    this.y += this.speedY;
    // Wrap around screen edges
    if (this.x < 0) this.x = starsCanvas.width;
    if (this.x > starsCanvas.width) this.x = 0;
    if (this.y < 0) this.y = starsCanvas.height;
    if (this.y > starsCanvas.height) this.y = 0;
  }
  draw() {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

class ShootingStar {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * starsCanvas.width;
    this.y = 0;
    this.length = Math.random() * 80 + 100;
    this.speed = Math.random() * 15 + 10;
    this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
    this.opacity = 0;
    this.fadeSpeed = 0.05;
    this.active = false;
    this.trail = [];
    this.color = Math.random() < 0.3 ? '#63b3ed' : '#ffffff';
  }
  update() {
    if (!this.active) {
      if (Math.random() < 0.005) {
        this.active = true;
        this.opacity = 1;
      }
      return;
    }
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    // Update trail with sparkle effect
    this.trail.unshift({ 
      x: this.x, 
      y: this.y, 
      opacity: this.opacity,
      sparkle: Math.random() > 0.7
    });
    if (this.trail.length > 20) this.trail.pop();
    // Fade out when off screen
    if (this.x > starsCanvas.width || this.y > starsCanvas.height) {
      this.opacity -= this.fadeSpeed;
      if (this.opacity <= 0) {
        this.reset();
      }
    }
  }
  draw() {
    if (!this.active) return;
    this.trail.forEach((point, index) => {
      const gradientOpacity = point.opacity * (1 - index / this.trail.length);
      ctx.strokeStyle = `rgba(255, 255, 255, ${gradientOpacity})`;
      ctx.lineWidth = point.sparkle ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      if (index < this.trail.length - 1) {
        ctx.lineTo(this.trail[index + 1].x, this.trail[index + 1].y);
      }
      ctx.stroke();
      if (point.sparkle) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

class BurningAsteroid {
  constructor() {
    this.reset();
    this.active = true; // Always active from the beginning
  }
  reset() {
    this.x = Math.random() * starsCanvas.width;
    this.y = -50;
    this.size = Math.random() * 5 + 10; // Start off larger
    this.speed = Math.random() * 2 + 1;
    this.particles = [];
  }
  update() {
    this.y += this.speed;
    this.size *= 0.995; // Gradually shrink
    if (Math.random() < 0.3) {
      this.particles.push({
        x: this.x,
        y: this.y,
        size: Math.random() * 2,
        speedX: (Math.random() - 0.5) * 2,
        speedY: -Math.random() * 2,
        life: 1,
        color: Math.random() < 0.7 ? '#ff4500' : '#ffd700'
      });
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.life -= 0.02;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.y > starsCanvas.height + 50 || this.size < 2) {
      this.reset();
    }
  }
  draw() {
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    this.particles.forEach(p => {
      ctx.fillStyle = `rgba(${p.color === '#ff4500' ? '255,69,0' : '255,215,0'},${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

// Reduce shooting stars and asteroids by 50%
const shootingStars = Array(3).fill().map(() => new ShootingStar());
const burningAsteroids = Array(3).fill().map(() => new BurningAsteroid());

function animateParticles() {
  if (ctx) {
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, starsCanvas.width, starsCanvas.height);
    particles.forEach(p => {
      const relativeY = p.y / starsCanvas.height;
      const densityFactor = Math.max(0, 1 - (scrollPercent + relativeY) * 0.5);
      p.update();
      ctx.globalAlpha = p.brightness * densityFactor;
      p.draw();
    });
    ctx.globalAlpha = 1;
    shootingStars.forEach(star => {
      star.update();
      star.draw();
    });
    burningAsteroids.forEach(asteroid => {
      asteroid.update();
      asteroid.draw();
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

window.addEventListener('scroll', () => {
  if (starsCanvas) {
    starsCanvas.style.top = window.scrollY + 'px';
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
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  const sunLight = new THREE.PointLight(0xffffcc, 1.5, 100);
  sunLight.position.set(20, 30, 20);
  scene.add(sunLight);
  const groundGeometry = new THREE.PlaneGeometry(120, 120, 128, 128);
  const positionAttribute = groundGeometry.attributes.position;
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    let z = 0;
    z += Math.sin(x * 0.1) * Math.cos(y * 0.1) * 3;
    z += Math.sin(x * 0.2 + 1.5) * Math.cos(y * 0.15) * 2;
    z += Math.sin(x * 0.4 + 0.5) * Math.cos(y * 0.3) * 1;
    z += (Math.random() - 0.5) * 0.5;
    positionAttribute.setZ(i, z);
  }
  positionAttribute.needsUpdate = true;
  groundGeometry.computeVertexNormals();
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228B22,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
    vertexColors: true
  });
  const colors = [];
  const positions = groundGeometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const height = positions[i + 2];
    const color = new THREE.Color();
    if (height > 2) {
      color.setHex(0x228B22);
    } else if (height > 1) {
      color.setHex(0x32CD32);
    } else if (height > 0) {
      color.setHex(0x90EE90);
    } else {
      color.setHex(0x228B22);
    }
    colors.push(color.r, color.g, color.b);
  }
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  scene.add(ground);
  // Enhanced tree creation – set tree.name = "tree" so that we can filter only tree groups later.
  function createTree(x, z, height, type = 'pine') {
    const tree = new THREE.Group();
    tree.name = "tree";
    let trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    switch(type) {
      case 'pine':
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, height * 0.7, 8);
        const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
        trunk.position.y = height * 0.35;
        tree.add(trunk);
        const foliageColor = new THREE.Color(0x005500).addScalar(Math.random() * 0.1);
        const foliageMaterial = new THREE.MeshStandardMaterial({
          color: foliageColor,
          roughness: 0.8,
          metalness: 0.2,
          flatShading: true
        });
        const layers = 5;
        for (let i = 0; i < layers; i++) {
          const layerSize = height * (0.8 - i * 0.15);
          const coneGeo = new THREE.ConeGeometry(layerSize * 0.5, layerSize, 8);
          const cone = new THREE.Mesh(coneGeo, foliageMaterial);
          cone.position.y = height * (0.4 + i * 0.15);
          tree.add(cone);
        }
        break;
      case 'oak':
        const oakTrunkGeo = new THREE.CylinderGeometry(0.6, 0.8, height * 0.6, 8);
        const oakTrunk = new THREE.Mesh(oakTrunkGeo, trunkMaterial);
        oakTrunk.position.y = height * 0.3;
        tree.add(oakTrunk);
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const branchGeo = new THREE.CylinderGeometry(0.2, 0.3, height * 0.4, 4);
          const branch = new THREE.Mesh(branchGeo, trunkMaterial);
          branch.position.set(
            Math.cos(angle) * 0.8,
            height * 0.5,
            Math.sin(angle) * 0.8
          );
          branch.rotation.z = Math.PI / 4 * Math.cos(angle);
          branch.rotation.x = Math.PI / 4 * Math.sin(angle);
          tree.add(branch);
        }
        const oakFoliageColor = new THREE.Color(0x228B22).addScalar(Math.random() * 0.1);
        const oakFoliageMaterial = new THREE.MeshStandardMaterial({
          color: oakFoliageColor,
          roughness: 0.8,
          metalness: 0.2,
          flatShading: true
        });
        for (let i = 0; i < 8; i++) {
          const cluster = new THREE.Group();
          const baseSize = height * 0.6;
          for (let j = 0; j < 3; j++) {
            const sphereSize = baseSize * (0.7 + Math.random() * 0.3);
            const sphereGeo = new THREE.SphereGeometry(sphereSize * 0.4, 8, 8);
            const sphere = new THREE.Mesh(sphereGeo, oakFoliageMaterial);
            sphere.position.set(
              (Math.random() - 0.5) * baseSize * 0.3,
              (Math.random() - 0.5) * baseSize * 0.3,
              (Math.random() - 0.5) * baseSize * 0.3
            );
            cluster.add(sphere);
          }
          const angle = (i / 8) * Math.PI * 2;
          cluster.position.set(
            Math.cos(angle) * baseSize * 0.3,
            height * 0.8,
            Math.sin(angle) * baseSize * 0.3
          );
          tree.add(cluster);
        }
        break;
      case 'birch':
        const birchTrunkMaterial = new THREE.MeshStandardMaterial({
          color: 0xE6E6E6,
          roughness: 0.7,
          metalness: 0.1,
          flatShading: true
        });
        const birchTrunkGeo = new THREE.CylinderGeometry(0.25, 0.35, height * 0.8, 8);
        const birchTrunk = new THREE.Mesh(birchTrunkGeo, birchTrunkMaterial);
        birchTrunk.position.y = height * 0.4;
        tree.add(birchTrunk);
        const birchFoliageColor = new THREE.Color(0x98FB98).addScalar(Math.random() * 0.1);
        const birchFoliageMaterial = new THREE.MeshStandardMaterial({
          color: birchFoliageColor,
          roughness: 0.8,
          metalness: 0.2,
          flatShading: true,
          transparent: true,
          opacity: 0.9
        });
        for (let i = 0; i < 12; i++) {
          const leafCluster = new THREE.Group();
          const clusterSize = height * 0.3;
          for (let j = 0; j < 4; j++) {
            const leafGeo = new THREE.SphereGeometry(clusterSize * 0.3, 6, 6);
            const leaf = new THREE.Mesh(leafGeo, birchFoliageMaterial);
            leaf.position.set(
              (Math.random() - 0.5) * clusterSize * 0.5,
              (Math.random() - 0.5) * clusterSize * 0.5,
              (Math.random() - 0.5) * clusterSize * 0.5
            );
            leaf.scale.y = 0.5;
            leafCluster.add(leaf);
          }
          const angle = (i / 12) * Math.PI * 2;
          const heightOffset = Math.random() * height * 0.3;
          leafCluster.position.set(
            Math.cos(angle) * clusterSize,
            height * 0.7 + heightOffset,
            Math.sin(angle) * clusterSize
          );
          tree.add(leafCluster);
        }
        break;
    }
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.rotation.x = (Math.random() - 0.5) * 0.1;
    tree.rotation.z = (Math.random() - 0.5) * 0.1;
    tree.position.set(x, 0, z);
    return tree;
  }
  function createForest() {
    // Remove only existing tree groups so that ground and other objects remain intact.
    scene.children = scene.children.filter(child => !(child.type === "Group" && child.name === "tree"));
    const clusters = 6;
    for (let c = 0; c < clusters; c++) {
      const clusterCenter = {
        x: (Math.random() - 0.5) * 80,
        z: (Math.random() - 0.5) * 80
      };
      const treesInCluster = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < treesInCluster; i++) {
        const radius = 5 + Math.random() * 10;
        const angle = (i / treesInCluster) * Math.PI * 2 + Math.random() * 0.5;
        const x = clusterCenter.x + Math.cos(angle) * radius;
        const z = clusterCenter.z + Math.sin(angle) * radius;
        const terrainHeight = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3;
        const height = 8 + Math.random() * 6 + terrainHeight;
        let treeType;
        if (height > 12) {
          treeType = 'pine';
        } else if (height > 10) {
          treeType = 'oak';
        } else {
          treeType = 'birch';
        }
        const tree = createTree(x, z, height, treeType);
        scene.add(tree);
      }
    }
  }
  createForest();
  // Enhanced Clouds
  const clouds = [];
  class Cloud {
    constructor() {
      this.mesh = new THREE.Group();
      const geometry = new THREE.SphereGeometry(2.5, 32, 32);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
      const puff1 = new THREE.Mesh(geometry, material);
      const puff2 = new THREE.Mesh(geometry, material);
      puff2.scale.set(0.9, 0.9, 0.9);
      puff2.position.set(-3, 0, 0);
      const puff3 = new THREE.Mesh(geometry, material);
      puff3.scale.set(1.1, 1.1, 1.1);
      puff3.position.set(3, 0, 0);
      this.mesh.add(puff1, puff2, puff3);
      this.mesh.position.set((Math.random()-0.5)*100, 12+Math.random()*10, (Math.random()-0.5)*30);
      this.baseScale = 1;
      scene.add(this.mesh);
    }
    update() {
      this.mesh.position.x += 0.15;
      if (this.mesh.position.x > 50) {
        this.mesh.position.x = -50;
        this.mesh.position.z = (Math.random()-0.5)*30;
      }
      this.baseScale = 1 + Math.sin(Date.now() * 0.0015) * 0.15;
      this.mesh.scale.set(this.baseScale, this.baseScale, this.baseScale);
    }
  }
  for (let i = 0; i < 10; i++) {
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
  // Enhanced Satellite
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
  satelliteGroup.position.set(-window.innerWidth / 2, 100, 0);
  scene.add(satelliteGroup);
  camera.position.set(0, 30, 50);
  camera.lookAt(0, 0, 0);
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
    satelliteGroup.position.x = -window.innerWidth / 2;
  });
  console.log("Enhanced Three.js scene setup complete");
}

/************************************
 * Aircraft Animation with Chemtrail *
 ************************************/
const aircraftCanvas = document.getElementById('aircraft-canvas');
let aCtx;
if (aircraftCanvas) {
  aCtx = aircraftCanvas.getContext('2d');
  // Use window.innerWidth to ensure full width
  aircraftCanvas.width = window.innerWidth;
  aircraftCanvas.height = 150;
} else {
  console.error("Aircraft canvas not found!");
}
let aircraft = {
  x: -100,
  y: 50,
  speed: 2,
  chemTrail: []
};
function updateAircraft() {
  aircraft.x += aircraft.speed;
  if (aircraft.x > aircraftCanvas.width + 100) {
    aircraft.x = -100;
    aircraft.chemTrail = [];
  }
  aircraft.chemTrail.push({
    x: aircraft.x - 40,
    y: aircraft.y,
    opacity: 1,
    time: Date.now()
  });
  aircraft.chemTrail = aircraft.chemTrail.map(p => {
    let age = (Date.now() - p.time) / 4000;
    return { ...p, opacity: Math.max(1 - age, 0) };
  }).filter(p => p.opacity > 0);
}
const planeImg = new Image();
planeImg.src = 'assets/airplane.png';
function drawAircraft() {
  if (!aCtx) return;
  aCtx.clearRect(0, 0, aircraftCanvas.width, aircraftCanvas.height);
  aircraft.chemTrail.forEach(p => {
    aCtx.save();
    aCtx.globalAlpha = p.opacity;
    aCtx.fillStyle = "#C0C0C0";
    aCtx.beginPath();
    aCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    aCtx.fill();
    aCtx.restore();
  });
  let planeWidth = 60;
  let planeHeight = 40;
  aCtx.drawImage(
    planeImg,
    aircraft.x - planeWidth / 2,
    aircraft.y - planeHeight / 2,
    planeWidth,
    planeHeight
  );
}
function animateAircraft() {
  if (aCtx) {
    updateAircraft();
    drawAircraft();
    requestAnimationFrame(animateAircraft);
  }
}
if (aircraftCanvas) {
  animateAircraft();
}

/************************************
 * Celebratory Confetti for Sandbox *
 ************************************/
let confettiParticles = [];
let confettiInitialized = false;
function initConfetti() {
  confettiParticles = [];
  for (let i = 0; i < 100; i++) {
    confettiParticles.push({
      x: robot.x,
      y: robot.y,
      radius: Math.random() * 3 + 2,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      speedX: (Math.random() - 0.5) * 5,
      speedY: Math.random() * -5 - 2,
      gravity: 0.2,
      opacity: 1
    });
  }
  confettiInitialized = true;
}
function updateConfetti() {
  for (let p of confettiParticles) {
    p.speedY += p.gravity;
    p.x += p.speedX;
    p.y += p.speedY;
    p.opacity -= 0.01;
  }
  confettiParticles = confettiParticles.filter(p => p.opacity > 0);
}
function drawConfetti() {
  confettiParticles.forEach(p => {
    sCtx.save();
    sCtx.globalAlpha = p.opacity;
    sCtx.fillStyle = p.color;
    sCtx.beginPath();
    sCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.restore();
  });
}
function drawCelebration() {
  sCtx.save();
  sCtx.font = "bold 48px Arial";
  sCtx.textAlign = "center";
  sCtx.fillStyle = "rgba(255, 255, 0, 0.9)";
  sCtx.shadowColor = "rgba(0, 0, 0, 0.7)";
  sCtx.shadowBlur = 10;
  sCtx.fillText("Congratulations!", sandboxCanvas.width / 2, sandboxCanvas.height / 2);
  sCtx.restore();
}

/************************************
 * Occupancy Grid and Chart Setup *
 ************************************/
const sandboxCanvas = document.getElementById('sandbox-canvas');
let sCtx;
if (sandboxCanvas) {
  sCtx = sandboxCanvas.getContext('2d');
  // Width set to align with charts below
  sandboxCanvas.width = 1100;
  sandboxCanvas.height = 400;
} else {
  console.error("Sandbox canvas not found!");
}
const speedSlider = document.getElementById('speed-slider');
// Allow speed slider up to 20x.
if (speedSlider) {
  speedSlider.max = "20";
}
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
      row.push(0);
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
  let encounteredDots = [];
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      // Only scan cells that haven't been scanned yet
      if (occupancyGrid[i][j] === 0) {
        let cellCenterX = j * cellSize + cellSize / 2;
        let cellCenterY = i * cellSize + cellSize / 2;
        let dx = cellCenterX - robot.x;
        let dy = cellCenterY - robot.y;
        let dCell = Math.sqrt(dx * dx + dy * dy);
        if (dCell < scanRadius) {
          // Use same condition as green (if distance from cell center to any obstacle is < 40)
          let encountered = false;
          for (let o of obstacles) {
            let d;
            if (o.shape === "rect" || o.shape === "square") {
              d = pointRectDistance(cellCenterX, cellCenterY, o);
            } else if (o.shape === "circle") {
              d = pointCircleDistance(cellCenterX, cellCenterY, o);
            } else {
              d = pointPolygonDistance(cellCenterX, cellCenterY, o);
            }
            if (d < 40) {
              encountered = true;
              break;
            }
          }
          occupancyGrid[i][j] = encountered ? 1 : 2;
          if (encountered) {
            encounteredDots.push({ x: cellCenterX, y: cellCenterY });
          } else {
            freeDots.push({ x: cellCenterX, y: cellCenterY });
          }
        }
      }
    }
  }
  if (mappingChart && mappingChart.data) {
    if (encounteredDots.length > 0) {
      mappingChart.data.datasets[0].data.push(...encounteredDots);
    }
    if (freeDots.length > 0) {
      mappingChart.data.datasets[1].data.push(...freeDots);
    }
    let totalCells = gridRows * gridCols;
    let scanned = 0;
    for (let i = 0; i < gridRows; i++) {
      for (let j = 0; j < gridCols; j++) {
        if (occupancyGrid[i][j] !== 0) scanned++;
      }
    }
    let progress = ((scanned / totalCells) * 100).toFixed(2);
    mappingChart.options.plugins.title.text = "Mapping Progress: " + progress + "%";
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
/********************************
 * New: Mapping-Based Obstacle Avoidance *
 ********************************/
// Compute a repulsion angle based on encountered (orange) cells in occupancyGrid.
function getMappingAvoidanceVector() {
  let repulseX = 0, repulseY = 0;
  let count = 0;
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (occupancyGrid[i][j] === 1) { // encountered cell
        let cellCenterX = j * cellSize + cellSize / 2;
        let cellCenterY = i * cellSize + cellSize / 2;
        let dx = cellCenterX - robot.x;
        let dy = cellCenterY - robot.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 80) { // threshold for avoidance from mapped obstacles
          repulseX -= (dx / distance);
          repulseY -= (dy / distance);
          count++;
        }
      }
    }
  }
  if (count > 0) {
    repulseX /= count;
    repulseY /= count;
    return Math.atan2(repulseY, repulseX);
  }
  return null;
}
// Helper: average two angles properly.
function averageAngles(a, b) {
  let x = Math.cos(a) + Math.cos(b);
  let y = Math.sin(a) + Math.sin(b);
  return Math.atan2(y, x);
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

/**********************************
 * Enhanced Sandbox Visuals *
 **********************************/
function drawRobot() {
  if (sCtx) {
    sCtx.save();
    sCtx.shadowColor = "rgba(30,144,255,0.7)";
    sCtx.shadowBlur = 20;
    sCtx.fillStyle = "#1e90ff";
    sCtx.beginPath();
    sCtx.arc(robot.x, robot.y, robot.size, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.restore();
  }
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
    sCtx.save();
    sCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    sCtx.shadowBlur = 10;
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
    sCtx.restore();
  });
  if (proximityCount > lastProximityCount) {
    collisionCount += proximityCount - lastProximityCount;
  }
  lastProximityCount = proximityCount;
}

/**********************************
 * Robot Intellect Overlays *
 **********************************/
function drawRobotIntellect() {
  if (!sCtx) return;
  // First, try to avoid obstacles using direct sensor readings.
  let avoidanceDir = avoidObstacle();
  if (avoidanceDir !== null) {
    let safeDir = findSafeDirection(avoidanceDir);
    robot.direction = safeDir;
  }
  // Now incorporate mapping-based avoidance: if the map indicates an encountered dot nearby, steer away.
  let mappingAvoidance = getMappingAvoidanceVector();
  if (mappingAvoidance !== null) {
    robot.direction = averageAngles(robot.direction, mappingAvoidance);
  }
  sCtx.save();
  sCtx.strokeStyle = "rgba(255,255,255,0.3)";
  sCtx.lineWidth = 1;
  sCtx.beginPath();
  sCtx.arc(robot.x, robot.y, 60, 0, Math.PI * 2);
  sCtx.stroke();
  sCtx.restore();
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
  // Mapping-based avoidance is applied in drawRobotIntellect
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
function animateSandbox() {
  if (sCtx) {
    sCtx.clearRect(0, 0, sandboxCanvas.width, sandboxCanvas.height);
    updateRobot();
    drawRobot();
    drawObstacles();
    drawRobotIntellect();
    drawFinishLine();
    if (finished) {
      if (!confettiInitialized) {
        initConfetti();
      }
      drawCelebration();
      updateConfetti();
      drawConfetti();
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
  // Dataset 0: encountered objects (orange); Dataset 1: free areas (blue)
  mappingChart = new Chart(mappingCtx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Encountered Objects',
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
        label: 'Mapping Efficiency (Scanned Cells / Distance)',
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
// Returns the number of scanned cells in the occupancy grid.
function getScannedCells() {
  let count = 0;
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (occupancyGrid[i][j] !== 0) count++;
    }
  }
  return count;
}
// Update dynamic charts 10× faster (every 100ms). simulationTime increases by 0.1 per update.
// The learning chart now tracks mapping efficiency = scannedCells / cumulativeDistance.
function updateDynamicCharts() {
  simulationTime += 0.1;
  if (obstacleChart) {
    obstacleChart.data.labels.push(simulationTime.toFixed(1));
    obstacleChart.data.datasets[0].data.push(collisionCount);
    obstacleChart.update();
  }
  if (learningChart) {
    let scanned = getScannedCells();
    let efficiency = cumulativeDistance > 0 ? scanned / cumulativeDistance : 0;
    learningChart.data.labels.push(simulationTime.toFixed(1));
    learningChart.data.datasets[0].data.push(efficiency);
    learningChart.update();
  }
}
window.addEventListener('load', () => {
  // Get the buttons by their class names
  const exploreBtn = document.querySelector('.explore-btn');
  const githubBtn = document.querySelector('.github-btn');
  const cadBtn = document.querySelector('.cad-btn');
  // When "Explore" is clicked, scroll to the video section
  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
      const videoSection = document.querySelector('.robot-video');
      if (videoSection) {
        videoSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  // When "GitHub" is clicked, navigate to your GitHub repo
  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      window.location.href = "https://github.com/zkortam/Nexus";
    });
  }
  // When "CAD" is clicked, navigate to your Onshape CAD document
  if (cadBtn) {
    cadBtn.addEventListener('click', () => {
      window.location.href = "https://cad.onshape.com/documents/c5fff8378d1fea5a3b263ec9/w/bb9f2df86fea4bee1c8a8af8/e/027c2a1c29cde35068e23da3";
    });
  }
  // Initialize charts and Three.js footer scene
  createCharts();
  initFooterScene();
  // Start updating the dynamic charts every 100ms
  setInterval(updateDynamicCharts, 100);
});
/***********************
 * Restart & Controls *
 ***********************/
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    explorationPhase = true;
    finished = false;
    // Do not reset mapping progress unless switching modes
    resetSimulation();
  });
}
// Reset simulation and charts on mode switch
diffSelect.addEventListener('change', () => {
  resetSimulation();
  if (mappingChart) {
    mappingChart.data.datasets.forEach(dataset => dataset.data = []);
    mappingChart.data.labels = [];
    mappingChart.update();
  }
  if (obstacleChart) {
    obstacleChart.data.datasets.forEach(dataset => dataset.data = []);
    obstacleChart.data.labels = [];
    obstacleChart.update();
  }
  if (learningChart) {
    learningChart.data.datasets.forEach(dataset => dataset.data = []);
    learningChart.data.labels = [];
    learningChart.update();
  }
});
function resetSimulation() {
  cumulativeDistance = 0;
  collisionCount = 0;
  turnCount = 0;
  simulationTime = 0;
  scanCounter = 0;
  lastProximityCount = 0;
  // Only reset occupancy grid on mode change (or restart)
  // When using arrow keys, mapping progress persists.
  robot = { x: 50, y: sandboxCanvas ? sandboxCanvas.height / 2 : 200, size: 20, speed: baseSpeed, direction: Math.random() * Math.PI * 2, inCollision: false };
  let mode = diffSelect ? diffSelect.value : "medium";
  initObstacles(mode);
  // Also reset occupancy grid only on simulation reset
  initOccupancyGrid();
}
// Scroll event for atmospheric effects in sandbox
window.addEventListener('scroll', () => {
  const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
  const root = document.documentElement;
  root.style.setProperty('--scroll-pos', `${scrollPercent * 100}%`);
  if (scrollPercent > 0.2 && scrollPercent < 0.5) {
    const entryProgress = (scrollPercent - 0.2) / 0.3;
    root.style.setProperty('--heat-blur', `${entryProgress * 3}px`);
    root.style.setProperty('--glow-opacity', Math.min(entryProgress * 1.5, 1));
    document.querySelectorAll('.landing-text, .btn').forEach(el => {
      el.classList.add('heat-ripple');
    });
  } else {
    root.style.setProperty('--heat-blur', '0px');
    root.style.setProperty('--glow-opacity', '0');
    document.querySelectorAll('.landing-text, .btn').forEach(el => {
      el.classList.remove('heat-ripple');
    });
  }
});
