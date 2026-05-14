const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H, started = false, paused = false, shake = 0;
let score = 0, wave = 1, currentWeapon = 0;

let player = { x:0, y:0, vx:0, vy:0, size:22, hp:100, maxHp:100, angle:0 };
let bullets = [], enemies = [], particles = [], keys = {}, mouse = {x:0, y:0, down:false};

const weapons = [
  {name:"NEON-9", dmg:25, rate:130, speed:18, color:"#0ff", ammo:Infinity},
  {name:"SLAUGHTER", dmg:15, rate:400, speed:12, color:"#f0f", ammo:12},
  {name:"BOLT-RAIL", dmg:150, rate:800, speed:30, color:"#ff0", ammo:5}
];

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W; canvas.height = H;
}
window.addEventListener('resize', resize);
resize();

document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', () => mouse.down = true);
canvas.addEventListener('mouseup', () => mouse.down = false);

function createParticles(x, y, color, count=10, size=3) {
  for (let i = 0; i < count; i++) {
    particles.push({ 
      x, y, 
      vx: Math.random()*8-4, 
      vy: Math.random()*8-4, 
      life: 30, color, 
      size: Math.random()*size+1 
    });
  }
}

function spawnEnemy(boss = false) {
  const side = Math.floor(Math.random()*4);
  let ex = side%2===0 ? Math.random()*W : (side===1 ? W+50 : -50);
  let ey = side%2!==0 ? Math.random()*H : (side===0 ? -50 : H+50);
  enemies.push({ 
    x:ex, y:ey, size:boss?45:20, hp:boss?400:40, 
    maxHp:boss?400:40, speed:boss?1.5:2.5, 
    color:boss?"#800":"#f00", flash:0, boss 
  });
}

function startGame() {
  document.getElementById('startmenu').style.display = 'none';
  player.x = W/2; player.y = H/2;
  player.hp = 100; score = 0; wave = 1; started = true;
  enemies = []; bullets = [];
  for(let i=0; i<8; i++) spawnEnemy();
}

function update() {
  if (!started || paused) return;

  // Movimiento con Inercia
  let dx = (keys['d']?1:0)-(keys['a']?1:0);
  let dy = (keys['s']?1:0)-(keys['w']?1:0);
  player.vx = player.vx * 0.85 + dx * 0.8;
  player.vy = player.vy * 0.85 + dy * 0.8;
  player.x += player.vx; player.y += player.vy;
  
  player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  // Disparo
  if (mouse.down) {
    const w = weapons[currentWeapon];
    if (Date.now() - (w.lastShot || 0) > w.rate && w.ammo > 0) {
      w.lastShot = Date.now();
      shake = w.dmg / 5;
      bullets.push({ 
        x: player.x, y: player.y, 
        vx: Math.cos(player.angle)*w.speed, 
        vy: Math.sin(player.angle)*w.speed, 
        dmg: w.dmg, color: w.color 
      });
    }
  }

  // Enemigos e IA de Separación
  enemies.forEach((e, i) => {
    let dist = Math.hypot(player.x - e.x, player.y - e.y);
    e.x += (player.x - e.x)/dist * e.speed;
    e.y += (player.y - e.y)/dist * e.speed;

    if (dist < player.size + e.size) {
      player.hp -= 0.4;
      shake = 8;
      if (player.hp <= 0) {
        started = false;
        document.getElementById('gameover').style.display = 'block';
        document.getElementById('finalscore').innerText = score;
      }
    }

    bullets.forEach((b, bi) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
        e.hp -= b.dmg;
        e.flash = 3;
        bullets.splice(bi, 1);
        if (e.hp <= 0) {
          score += e.boss ? 1000 : 100;
          createParticles(e.x, e.y, "#f00", 20, 5);
          enemies.splice(i, 1);
        }
      }
    });
  });

  bullets.forEach((b, i) => {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) bullets.splice(i, 1);
  });

  particles.forEach((p, i) => {
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  });

  if (enemies.length < 5) { 
    wave++; 
    for(let i=0; i<5+wave; i++) spawnEnemy(wave%5===0 && i===0); 
  }
  if (shake > 0) shake *= 0.9;
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.translate(Math.random()*shake, Math.random()*shake);

  // Dibujar Jugador
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = "#0ff";
  ctx.beginPath();
  ctx.moveTo(20,0); ctx.lineTo(-12, -12); ctx.lineTo(-12, 12);
  ctx.fill();
  ctx.restore();

  // Dibujar Enemigos
  enemies.forEach(e => {
    ctx.fillStyle = e.flash > 0 ? "#fff" : e.color;
    if (e.flash > 0) e.flash--;
    ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
  });

  bullets.forEach(b => { 
    ctx.fillStyle = b.color; 
    ctx.fillRect(b.x-3, b.y-3, 6, 6); 
  });
  
  particles.forEach(p => { 
    ctx.fillStyle = p.color; 
    ctx.globalAlpha = p.life/30; 
    ctx.fillRect(p.x, p.y, p.size, p.size); 
  });
  ctx.globalAlpha = 1;

  ctx.restore();

  // Actualizar UI
  document.getElementById('hp').innerText = Math.ceil(player.hp);
  document.getElementById('score').innerText = score;
  document.getElementById('wave').innerText = wave;
}

function loop() { 
    update(); 
    draw(); 
    requestAnimationFrame(loop); 
}

document.getElementById('startmenu').style.display = 'block';
loop();