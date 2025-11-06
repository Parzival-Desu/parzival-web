let currentGame = null;

// ===== GLOBAL CONTROL =====
function showMenu() {
    document.getElementById('mainMenu').style.display = 'block';
    document.getElementById('flappyGame').classList.remove('active');
    document.getElementById('fpsGame').classList.remove('active');
    if (currentGame === 'flappy') stopFlappy();
    if (currentGame === 'fps') stopFPS();
    currentGame = null;
}

function startGame(game) {
    document.getElementById('mainMenu').style.display = 'none';
    if (game === 'flappy') {
        document.getElementById('flappyGame').classList.add('active');
        initFlappy();
        currentGame = 'flappy';
    } else if (game === 'fps') {
        document.getElementById('fpsGame').classList.add('active');
        initFPS();
        currentGame = 'fps';
    }
}

// ===== FLAPPY BIRD =====
let flappyCanvas, flappyCtx, flappyAnimFrame;
let flappyBird = { x: 80, y: 250, width: 30, height: 30, velocity: 0, gravity: 0.5, jump: -8 };
let flappyPipes = [], flappyScore = 0, flappyBestScore = 0, flappyGameOver = false, flappyFrameCount = 0;

function initFlappy() {
    flappyCanvas = document.getElementById('flappyCanvas');
    flappyCtx = flappyCanvas.getContext('2d');
    flappyBird = { x: 80, y: 250, width: 30, height: 30, velocity: 0, gravity: 0.5, jump: -8 };
    flappyPipes = []; flappyScore = 0; flappyFrameCount = 0; flappyGameOver = false;
    document.getElementById('flappyScore').textContent = '0';
    document.getElementById('flappyBest').textContent = flappyBestScore;
    if (flappyAnimFrame) cancelAnimationFrame(flappyAnimFrame);
    flappyAnimFrame = requestAnimationFrame(flappyGameLoop);
}

function stopFlappy() {
    if (flappyAnimFrame) cancelAnimationFrame(flappyAnimFrame);
}

function drawFlappyBird() {
    flappyCtx.fillStyle = '#FFD700';
    flappyCtx.fillRect(flappyBird.x, flappyBird.y, flappyBird.width, flappyBird.height);
    flappyCtx.fillStyle = '#333';
    flappyCtx.fillRect(flappyBird.x + 20, flappyBird.y + 8, 5, 5);
    flappyCtx.fillStyle = '#FF6347';
    flappyCtx.fillRect(flappyBird.x + 28, flappyBird.y + 12, 8, 5);
}

function drawFlappyPipes() {
    flappyCtx.fillStyle = '#32CD32';
    flappyPipes.forEach(pipe => {
        flappyCtx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
        flappyCtx.fillRect(pipe.x, pipe.topHeight + pipe.gap, pipe.width, flappyCanvas.height - (pipe.topHeight + pipe.gap));
    });
}

function updateFlappyBird() {
    if (flappyGameOver) return;
    flappyBird.velocity += flappyBird.gravity;
    flappyBird.y += flappyBird.velocity;
    if (flappyBird.y + flappyBird.height > flappyCanvas.height || flappyBird.y < 0) endFlappyGame();

    flappyFrameCount++;
    if (flappyFrameCount % 90 === 0) {
        const gap = 150;
        const minHeight = 50;
        const maxHeight = flappyCanvas.height - gap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        flappyPipes.push({ x: flappyCanvas.width, width: 50, topHeight, gap, scored: false });
    }

    flappyPipes = flappyPipes.filter(pipe => pipe.x + pipe.width > 0);
    flappyPipes.forEach(pipe => {
        pipe.x -= 3;
        if (!pipe.scored && pipe.x + pipe.width < flappyBird.x) {
            flappyScore++;
            pipe.scored = true;
            document.getElementById('flappyScore').textContent = flappyScore;
        }
        if (flappyBird.x < pipe.x + pipe.width && flappyBird.x + flappyBird.width > pipe.x &&
            (flappyBird.y < pipe.topHeight || flappyBird.y + flappyBird.height > pipe.topHeight + pipe.gap)) {
            endFlappyGame();
        }
    });
}

function drawFlappyGame() {
    flappyCtx.fillStyle = '#87CEEB';
    flappyCtx.fillRect(0, 0, flappyCanvas.width, flappyCanvas.height);
    drawFlappyPipes();
    drawFlappyBird();
    if (flappyGameOver) {
        flappyCtx.fillStyle = 'rgba(0,0,0,0.7)';
        flappyCtx.fillRect(0, 0, flappyCanvas.width, flappyCanvas.height);
        flappyCtx.fillStyle = '#fff';
        flappyCtx.font = 'bold 30px Poppins';
        flappyCtx.textAlign = 'center';
        flappyCtx.fillText('Game Over!', flappyCanvas.width / 2, flappyCanvas.height / 2 - 20);
        flappyCtx.font = '20px Poppins';
        flappyCtx.fillText('Click Restart to play again', flappyCanvas.width / 2, flappyCanvas.height / 2 + 20);
    }
}

function flappyGameLoop() {
    updateFlappyBird();
    drawFlappyGame();
    flappyAnimFrame = requestAnimationFrame(flappyGameLoop);
}

function flappyJump() {
    if (!flappyGameOver && currentGame === 'flappy') flappyBird.velocity = flappyBird.jump;
}

function endFlappyGame() {
    flappyGameOver = true;
    if (flappyScore > flappyBestScore) {
        flappyBestScore = flappyScore;
        document.getElementById('flappyBest').textContent = flappyBestScore;
    }
}

function restartFlappy() { initFlappy(); }

document.addEventListener('click', e => {
    if (currentGame === 'flappy' && e.target.id === 'flappyCanvas') flappyJump();
});
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && currentGame === 'flappy') { e.preventDefault(); flappyJump(); }
});

// ===== FPS: Maze Hunter
let fpsCanvas, ctx, animId;
let player = { x: 200, y: 200, angle: 0, health: 100, speed: 4 };
let keys = {}, score = 0, gameOver = false, victory = false;
let enemies = [], bullets = [], particles = [], wave = 1;
let isPointerLocked = false;

// Config
const CELL = 50, FOV = Math.PI / 3, RAYS = 800, DEPTH = 800;
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,0,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
];

function spawnWave() {
    enemies = [];
    const count = 3 + wave * 2;
    const minDist = 350;

    for (let i = 0; i < count; i++) {
        let x, y, dist;
        do {
            x = Math.random() * (map[0].length - 2) * CELL + CELL;
            y = Math.random() * (map.length - 2) * CELL + CELL;
            dist = Math.hypot(x - player.x, y - player.y);
        } while (
            map[Math.floor(y / CELL)][Math.floor(x / CELL)] !== 0 ||
            dist < minDist
        );
        enemies.push({ x, y, alive: true, speed: 0.5 + wave * 0.1 });
    }

    document.getElementById('fpsWave').textContent = wave;
}

function fps_documentMouseDown(e) {
    if (e.button !== 0) return;
    if (!isPointerLocked) return;
    if (currentGame !== 'fps') return;
    shoot();
}

function initFPS() {
    fpsCanvas = document.getElementById('fpsCanvas');
    ctx = fpsCanvas.getContext('2d');
    player = { x: 200, y: 200, angle: 0, health: 100, speed: 4 };
    keys = {}; score = 0; wave = 1; gameOver = false; victory = false;
    enemies = []; bullets = []; particles = []; isPointerLocked = false;
    spawnWave();
    document.getElementById('fpsScore').textContent = '0';
    document.getElementById('fpsHealth').textContent = '100';

    if (animId) cancelAnimationFrame(animId);

    fpsCanvas.onclick = null;
    fpsCanvas.addEventListener('click', function canvasClickForPointerLock(e) {
        if (gameOver || victory || currentGame !== 'fps') return;
        if (!document.pointerLockElement) {
            fpsCanvas.requestPointerLock();
        } else {
            shoot();
        }
    });

   document.removeEventListener('pointerlockchange', fps_pointerLockChange);
    document.addEventListener('pointerlockchange', fps_pointerLockChange);

    animId = requestAnimationFrame(loop);
}

function stopFPS() {
    if (animId) cancelAnimationFrame(animId);
    try { if (document.pointerLockElement === fpsCanvas) document.exitPointerLock(); } catch (e) {}
    document.removeEventListener('pointerlockchange', fps_pointerLockChange);
    document.removeEventListener('mousedown', fps_documentMouseDown);
    if (fpsCanvas) {
        fpsCanvas.onclick = null;
        fpsCanvas.removeEventListener('click', null);
    }
}

function fps_pointerLockChange() {
    isPointerLocked = (document.pointerLockElement === fpsCanvas);
    if (isPointerLocked) {
        document.addEventListener('mousedown', fps_documentMouseDown);
    } else {
        document.removeEventListener('mousedown', fps_documentMouseDown);
    }
}

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

document.addEventListener('mousemove', e => {
    if (isPointerLocked && currentGame === 'fps') {
        player.angle += (e.movementX || 0) * 0.002;
    }
});

function shoot() {
    if (gameOver || victory) return;
    bullets.push({ x: player.x, y: player.y, angle: player.angle, life: 30 });
    particles.push({ x: player.x + Math.cos(player.angle)*40, y: player.y + Math.sin(player.angle)*40, life: 10, color: '#ffff00' });

    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = e.x - player.x, dy = e.y - player.y;
        const dist = Math.hypot(dx, dy);
        const angleToEnemy = Math.atan2(dy, dx);
        const angleDiff = Math.abs(((angleToEnemy - player.angle + Math.PI) % (2*Math.PI)) - Math.PI);
        if (dist < 80 && angleDiff < 0.5) {
            e.alive = false;
            score++;
            document.getElementById('fpsScore').textContent = score;
            for (let i = 0; i < 20; i++) {
                particles.push({ x: e.x, y: e.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 25, color: '#ff0000' });
            }
            if (enemies.every(en => !en.alive)) { wave++; setTimeout(spawnWave, 1500); }
        }
    });
}

function movePlayer() {
    if (gameOver || victory || currentGame !== 'fps') return;
    let dx = 0, dy = 0;
    if (keys['w']) { dx += Math.cos(player.angle)*player.speed; dy += Math.sin(player.angle)*player.speed; }
    if (keys['s']) { dx -= Math.cos(player.angle)*player.speed; dy -= Math.sin(player.angle)*player.speed; }
    if (keys['a']) { dx += Math.cos(player.angle-Math.PI/2)*player.speed; dy += Math.sin(player.angle-Math.PI/2)*player.speed; }
    if (keys['d']) { dx += Math.cos(player.angle+Math.PI/2)*player.speed; dy += Math.sin(player.angle+Math.PI/2)*player.speed; }
    const nx = player.x + dx, ny = player.y + dy;
    const mx = Math.floor(nx/CELL), my = Math.floor(ny/CELL);
    if (map[my] && map[my][mx] === 0) { player.x = nx; player.y = ny; }
}

function castRay(a) {
    let x = player.x, y = player.y, dist = 0;
    const c = Math.cos(a)*3, s = Math.sin(a)*3;
    while (dist < DEPTH) {
        x += c; y += s; dist += 3;
        const mx = Math.floor(x/CELL), my = Math.floor(y/CELL);
        if (map[my] && map[my][mx] === 1) return {dist, offset: (x%CELL)/CELL};
    }
    return {dist: DEPTH, offset: 0};
}

function update() {
    if (currentGame !== 'fps') return;
    movePlayer();

    // Peluru
    bullets.forEach(b => { 
        b.x += Math.cos(b.angle) * 15; 
        b.y += Math.sin(b.angle) * 15; 
        b.life--; 
    });
    bullets = bullets.filter(b => b.life > 0);

    // Musuh
    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = player.x - e.x, dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);

        // Serang player kalau deket
        if (dist < 40) {
            player.health -= 0.8;
            document.getElementById('fpsHealth').textContent = Math.floor(player.health);
        }

        // Gerakan musuh ke arah player
        if (dist > 20) {
            e.x += (dx / dist) * e.speed;
            e.y += (dy / dist) * e.speed;
        }
    });

    // Partikel efek
    particles.forEach(p => { 
        if (p.vx) { 
            p.x += p.vx; 
            p.y += p.vy; 
            p.vy += 0.3; 
        } 
        p.life--; 
    });
    particles = particles.filter(p => p.life > 0);

    if (player.health <= 0) gameOver = true;
}


function draw() {
    const grad = ctx.createLinearGradient(0, 0, 0, fpsCanvas.height);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.5, '#98D8C8');
    grad.addColorStop(1, '#8B7355');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, fpsCanvas.width, fpsCanvas.height);

    // ===== WALL RAYCAST =====
    for (let i = 0; i < RAYS; i++) {
        const a = player.angle - FOV / 2 + (i / RAYS) * FOV;
        const { dist, offset } = castRay(a);
        const corr = dist * Math.cos(a - player.angle);
        const h = (CELL * 400) / (corr + 0.001);
        const bright = 255 * (1 - corr / DEPTH);
        ctx.fillStyle = offset > 0.7
            ? `rgb(${bright * 0.6}, ${bright * 0.4}, ${bright * 0.3})`
            : `rgb(${bright * 0.8}, ${bright * 0.6}, ${bright * 0.4})`;
        ctx.fillRect(i, (fpsCanvas.height - h) / 2, 1, h);
    }

    // ===== ENEMIES =====
    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = e.x - player.x, dy = e.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1500) return; 

        const angle = Math.atan2(dy, dx) - player.angle;
        const norm = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
        const visible = Math.abs(norm) <= FOV / 2 + 0.3;
        const screenX = (norm / FOV + 0.5) * fpsCanvas.width;
        const size = Math.max(20, (CELL * 300) / dist);

        let alpha = 1 - dist / 1200;
        if (!visible) alpha *= 0.3;
        ctx.globalAlpha = Math.max(0, alpha);

        const isClose = dist < 40;
        ctx.fillStyle = isClose ? '#8B0000' : '#C41E3A';
        ctx.fillRect(screenX - size / 2, (fpsCanvas.height - size) / 2, size, size);

        ctx.fillStyle = isClose ? '#FF3333' : '#FFF';
        ctx.fillRect(screenX - size / 3, (fpsCanvas.height - size) / 2 + size * 0.25, size / 8, size / 8);
        ctx.fillRect(screenX + size / 6, (fpsCanvas.height - size) / 2 + size * 0.25, size / 8, size / 8);

        ctx.fillStyle = '#000';
        ctx.fillRect(screenX - size / 3 + size / 25, (fpsCanvas.height - size) / 2 + size * 0.27, size / 16, size / 16);
        ctx.fillRect(screenX + size / 6 + size / 25, (fpsCanvas.height - size) / 2 + size * 0.27, size / 16, size / 16);

        ctx.fillStyle = '#000';
        ctx.fillRect(screenX - size / 4, (fpsCanvas.height - size) / 2 + size * 0.6, size / 2, size / 12);

        ctx.globalAlpha = 1;
    });

    // ===== PARTICLE EFFECT =====
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 25;
        ctx.fillRect(p.x - player.x + fpsCanvas.width / 2, p.y - player.y + fpsCanvas.height / 2, 5, 5);
    });
    ctx.globalAlpha = 1;

    // Crosshair
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fpsCanvas.width / 2 - 15, fpsCanvas.height / 2);
    ctx.lineTo(fpsCanvas.width / 2 + 15, fpsCanvas.height / 2);
    ctx.moveTo(fpsCanvas.width / 2, fpsCanvas.height / 2 - 15);
    ctx.lineTo(fpsCanvas.width / 2, fpsCanvas.height / 2 + 15);
    ctx.stroke();

    // ===== STATUS / TEXT =====
    if (enemies.every(e => !e.alive) && enemies.length > 0 && !victory) {
        victory = true;
        setTimeout(() => victory = false, 2000);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, fpsCanvas.width, fpsCanvas.height);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 50px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('WAVE CLEARED!', fpsCanvas.width / 2, fpsCanvas.height / 2);
        ctx.font = '30px Poppins';
        ctx.fillText(`Wave ${wave} Complete!`, fpsCanvas.width / 2, fpsCanvas.height / 2 + 50);
    }

    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, fpsCanvas.width, fpsCanvas.height);
        ctx.fillStyle = '#ff4757';
        ctx.font = 'bold 60px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', fpsCanvas.width / 2, fpsCanvas.height / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '25px Poppins';
        ctx.fillText(`Score: ${score} | Wave: ${wave}`, fpsCanvas.width / 2, fpsCanvas.height / 2 + 50);
    }
}


function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
}

function restartFPS() { stopFPS(); initFPS(); }
