// ============================================================
// BEAR JUMP - 自嘲熊跳跃
// ============================================================

// ----- Configuration -----
const CONFIG = {
    WIDTH: 800,
    HEIGHT: 450,
    GROUND_Y: 380,
    BEAR_X: 100,
    BEAR_W: 70,
    BEAR_H: 70,
    GRAVITY: 1550,
    JUMP_VELOCITY: -960,
    INITIAL_SPEED: 120,
    MAX_HEALTH: 3,
    INVINCIBLE_S: 1.0,
    FLASH_S: 0.2,
    SHAKE_S: 0.15,
    SHAKE_INTENSITY: 8,
    DODGE_STREAK_FOR_HEAL: 5,
    SPEED_INCREASE_PER_S: 12,
    SPEED_INCREASE_INTERVAL: 10,
    SPAWN_INTERVAL_INITIAL: 2.5,
    SPAWN_INTERVAL_MIN: 1.15,
    SPAWN_INTERVAL_DECREASE: 0.08,
    SPAWN_INTERVAL_DECREASE_EVERY: 8,
    MOLE_SPAWN_INTERVAL: 4.5,
    COFFEE_SPAWN_INTERVAL: 5.5,
    DOUBLE_SPAWN_CHANCE: 0.10,
    FLYING_OBSTACLE_CHANCE: 0.25,
    OBSTACLE_Y_GROUND: 312,
    OBSTACLE_Y_FLYING_MIN: 200,
    OBSTACLE_Y_FLYING_MAX: 250,
    COLLECTIBLE_Y_MIN: 160,
    COLLECTIBLE_Y_MAX: 300,
};

// ----- Audio System -----
class SoundManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.ctx = null;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    _play(freqStart, freqEnd, duration, type, volume, freq2Start, freq2End) {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const g = this.ctx.createGain();
        g.connect(this.ctx.destination);
        g.gain.setValueAtTime(volume, t);
        g.gain.linearRampToValueAtTime(0.001, t + duration);

        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.connect(g);
        if (freqEnd !== freqStart) {
            osc.frequency.setValueAtTime(freqStart, t);
            osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
        } else {
            osc.frequency.setValueAtTime(freqStart, t);
        }
        osc.start(t);
        osc.stop(t + duration);

        if (freq2Start) {
            const osc2 = this.ctx.createOscillator();
            const g2 = this.ctx.createGain();
            osc2.type = type;
            osc2.connect(g2);
            g2.connect(this.ctx.destination);
            g2.gain.setValueAtTime(volume, t + duration * 0.4);
            g2.gain.linearRampToValueAtTime(0.001, t + duration * 0.4 + duration);
            if (freq2End !== freq2Start) {
                osc2.frequency.setValueAtTime(freq2Start, t + duration * 0.4);
                osc2.frequency.linearRampToValueAtTime(freq2End, t + duration * 0.4 + duration);
            } else {
                osc2.frequency.setValueAtTime(freq2Start, t + duration * 0.4);
            }
            osc2.start(t + duration * 0.4);
            osc2.stop(t + duration * 0.4 + duration);
        }
    }

    jump()       { this._play(400, 700, 0.12, 'square', 0.12); }
    doubleJump() { this._play(600, 1100, 0.1, 'square', 0.1); }
    land()       { this._play(80, 50, 0.06, 'triangle', 0.08); }
    hit()        { this._play(150, 60, 0.25, 'sawtooth', 0.15); }
    collect()    { this._play(660, 880, 0.1, 'square', 0.1, 880, 1100); }
    heal()       { this._play(440, 660, 0.12, 'triangle', 0.1, 660, 880); }
    gameOver()   { this._play(300, 60, 0.6, 'sawtooth', 0.15); }

    startGame()  { this._play(200, 500, 0.15, 'square', 0.08); }
}

const sound = new SoundManager();

// ----- Particle System -----
class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = 2 + Math.random() * 3;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 400 * dt;
        this.life -= dt;
    }

    get alive() { return this.life > 0; }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, color, spread, life) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * spread;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 100;
            this.particles.push(new Particle(x, y, vx, vy, color, life));
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].alive) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }

    clear() {
        this.particles.length = 0;
    }
}

// ----- Entity Base Class -----
class Entity {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }

    get right()  { return this.x + this.width; }
    get bottom() { return this.y + this.height; }
    get cx()     { return this.x + this.width / 2; }
    get cy()     { return this.y + this.height / 2; }

    collidesWith(other, margin) {
        const m = margin || 0;
        return (
            this.x + m < other.right - m &&
            this.right - m > other.x + m &&
            this.y + m < other.bottom - m &&
            this.bottom - m > other.y + m
        );
    }

    isOffScreen() {
        return this.right < -10;
    }

    update(dt) {
        this.x -= state.gameSpeed * dt;
    }

    draw(ctx) {}
}

// ----- Clouds -----
class Cloud {
    constructor(x) {
        this.x = x || CONFIG.WIDTH + 50;
        this.y = Math.random() * 100 + 30;
        this.speed = 40 + Math.random() * 30;
    }

    update(dt) {
        this.x -= this.speed * dt;
        if (this.x < -100) {
            this.x = CONFIG.WIDTH + 50;
            this.y = Math.random() * 100 + 30;
        }
    }

    draw(ctx) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';

        const x = this.x, y = this.y;
        const circles = [
            [x, y, 20],
            [x + 25, y - 5, 25],
            [x + 55, y, 20],
            [x + 35, y + 10, 18],
        ];
        for (const [cx, cy, r] of circles) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
}

// ----- Obstacles -----
class Obstacle extends Entity {
    constructor(x, y, w, h) {
        super(x, y, w, h);
    }
}

class BrokenAlarm extends Obstacle {
    constructor(y) {
        super(CONFIG.WIDTH, y || CONFIG.OBSTACLE_Y_GROUND, 50, 50);
    }

    draw(ctx) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';

        ctx.beginPath();
        ctx.roundRect(this.x + 5, this.y + 15, 40, 35, 5);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x + 10, this.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.x + 40, this.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.x + 25, this.y + 5);
        ctx.lineTo(this.x + 20, this.y - 10);
        ctx.lineTo(this.x + 25, this.y - 5);
        ctx.lineTo(this.x + 30, this.y - 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x + 18, this.y + 32, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + 24, this.y + 32);
        ctx.lineTo(this.x + 35, this.y + 28);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x + 35, this.y + 38, 4, 0, Math.PI * 2);
        ctx.stroke();
    }
}

class FlyingAlarm extends Obstacle {
    constructor(y) {
        super(CONFIG.WIDTH, y, 50, 50);
        this.baseY = y;
        this.bobPhase = Math.random() * Math.PI * 2;
    }

    update(dt) {
        super.update(dt);
        this.bobPhase += dt * 4;
        this.y = this.baseY + Math.sin(this.bobPhase) * 15;
    }

    draw(ctx) {
        BrokenAlarm.prototype.draw.call(this, ctx);
    }
}

class DeadlinePapers extends Obstacle {
    constructor(y) {
        super(CONFIG.WIDTH, y || CONFIG.OBSTACLE_Y_GROUND, 50, 55);
    }

    draw(ctx) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';

        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.rect(this.x + 5 - i * 3, this.y + 10 + i * 8, 40 + i * 5, 45);
            ctx.fill();
            ctx.stroke();
        }

        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Comic Sans MS, Microsoft YaHei, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DEAD', this.x + 25, this.y + 35);
        ctx.fillText('LINE', this.x + 25, this.y + 48);
    }
}

// ----- Collectibles -----
class Collectible extends Entity {
    constructor(x, y, w, h) {
        super(x, y, w, h);
    }
}

class Mole extends Collectible {
    constructor() {
        const y = CONFIG.COLLECTIBLE_Y_MIN + Math.random() * (CONFIG.COLLECTIBLE_Y_MAX - CONFIG.COLLECTIBLE_Y_MIN);
        super(CONFIG.WIDTH, y, 40, 40);
    }

    draw(ctx) {
        ctx.drawImage(processedMole || moleImage, this.x, this.y, this.width, this.height);
    }
}

class CoffeeCup extends Collectible {
    constructor() {
        const y = CONFIG.COLLECTIBLE_Y_MIN + Math.random() * (CONFIG.COLLECTIBLE_Y_MAX - CONFIG.COLLECTIBLE_Y_MIN);
        super(CONFIG.WIDTH, y, 35, 45);
    }

    draw(ctx) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';

        ctx.beginPath();
        ctx.moveTo(this.x + 6, this.y);
        ctx.lineTo(this.x + 8, this.y + 40);
        ctx.lineTo(this.x + 28, this.y + 40);
        ctx.lineTo(this.x + 30, this.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.x + 30, this.y + 8);
        ctx.quadraticCurveTo(this.x + 40, this.y + 12, this.x + 38, this.y + 22);
        ctx.quadraticCurveTo(this.x + 35, this.y + 30, this.x + 30, this.y + 28);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 8, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 18, this.y + 8, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 24, this.y + 8, 3, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// ----- Bear -----
class Bear {
    constructor() {
        this.width = CONFIG.BEAR_W;
        this.height = CONFIG.BEAR_H;
        this.x = CONFIG.BEAR_X;
        this.y = CONFIG.GROUND_Y - this.height;
        this.dy = 0;
        this.isGrounded = true;
        this.doubleJumpCount = 0;
        this.wasInAir = false;
    }

    get right()  { return this.x + this.width; }
    get bottom() { return this.y + this.height; }
    get cx()     { return this.x + this.width / 2; }
    get cy()     { return this.y + this.height / 2; }

    reset() {
        this.y = CONFIG.GROUND_Y - this.height;
        this.dy = 0;
        this.isGrounded = true;
        this.doubleJumpCount = 0;
        this.wasInAir = false;
    }

    jump() {
        if (this.isGrounded) {
            this.dy = CONFIG.JUMP_VELOCITY;
            this.isGrounded = false;
            this.wasInAir = true;
            sound.jump();
        } else if (this.doubleJumpCount > 0) {
            this.dy = CONFIG.JUMP_VELOCITY;
            this.doubleJumpCount--;
            sound.doubleJump();
        }
    }

    update(dt) {
        const wasGrounded = this.isGrounded;

        this.dy += CONFIG.GRAVITY * dt;
        this.y += this.dy * dt;

        const groundLevel = CONFIG.GROUND_Y - this.height;
        if (this.y >= groundLevel) {
            if (!wasGrounded && this.wasInAir) {
                sound.land();
            }
            this.y = groundLevel;
            this.dy = 0;
            this.isGrounded = true;
            this.wasInAir = false;
        } else {
            this.isGrounded = false;
        }
    }

    draw(ctx, isGameOver, isInvincible, invincibleTimer) {
        if (isGameOver) {
            this._drawDead(ctx);
        } else if (!this.isGrounded) {
            this._drawJumping(ctx, isInvincible, invincibleTimer);
        } else {
            this._drawIdle(ctx, isInvincible, invincibleTimer);
        }
    }

    _drawIdle(ctx, isInvincible, invincibleTimer) {
        if (isInvincible && Math.floor(invincibleTimer / 0.06) % 2 === 0) return;
        ctx.drawImage(processedBear || bearImage, this.x, this.y, this.width, this.height);
        if (isInvincible) {
            ctx.fillStyle = 'rgba(255, 150, 150, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + 30, 8, 0, Math.PI * 2);
            ctx.arc(this.x + 55, this.y + 30, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawJumping(ctx, isInvincible, invincibleTimer) {
        if (isInvincible && Math.floor(invincibleTimer / 0.06) % 2 === 0) return;
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(-0.2);
        ctx.drawImage(processedBear || bearImage, -this.width / 2, -this.height / 2, this.width, this.height);
        if (isInvincible) {
            ctx.fillStyle = 'rgba(255, 150, 150, 0.6)';
            ctx.beginPath();
            ctx.arc(-15, -5, 8, 0, Math.PI * 2);
            ctx.arc(15, -5, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawDead(ctx) {
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(processedBear || bearImage, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

// ----- Image Loading & Processing -----
function removeWhiteBg(sourceImg, threshold = 210) {
    const w = sourceImg.width;
    const h = sourceImg.height;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(sourceImg, 0, 0, w, h);

    const imageData = offCtx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Make near-white pixels transparent, be lenient with edge pixels
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0;
        }
    }
    offCtx.putImageData(imageData, 0, 0);
    return offCanvas;
}

const bearImage = new Image();
bearImage.src = 'picture/xiong2.jpg';
const moleImage = new Image();
moleImage.src = 'picture/shu.jpg';

let processedBear = null;
let processedMole = null;

bearImage.onload = () => {
    processedBear = removeWhiteBg(bearImage);
    if (state.isTitleScreen) drawTitleScreen();
};

moleImage.onload = () => {
    processedMole = removeWhiteBg(moleImage);
    if (state.isTitleScreen) drawTitleScreen();
};

// ----- Game State -----
const state = {
    score: 0,
    highScore: parseInt(localStorage.getItem('bearJumpHiScore')) || 0,
    isGameOver: false,
    isPaused: false,
    isTitleScreen: true,
    gameSpeed: CONFIG.INITIAL_SPEED,
    embarrassment: CONFIG.MAX_HEALTH,
    isInvincible: false,
    invincibleTimer: 0,
    screenFlash: 0,
    screenShake: 0,
    dodgeStreak: 0,

    spawnTimer: 0,
    spawnInterval: CONFIG.SPAWN_INTERVAL_INITIAL,
    moleTimer: 0,
    coffeeTimer: 0,
    speedTimer: 0,
    difficultyTimer: 0,
};

// ----- Game Objects -----
const bear = new Bear();
const obstacles = [];
const collectibles = [];
const clouds = [];
const particles = new ParticleSystem();

for (let i = 0; i < 3; i++) {
    clouds.push(new Cloud(i * 300));
}

// ----- Helpers -----
function drawGround(ctx) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.GROUND_Y);
    ctx.lineTo(CONFIG.WIDTH, CONFIG.GROUND_Y);
    ctx.stroke();
}

function drawHeart(ctx, x, y, size, filled) {
    const r = size * 0.25;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x - r, y, r, Math.PI, 0, false);
    ctx.arc(x + r, y, r, Math.PI, 0, false);
    ctx.lineTo(x, y + size * 0.75);
    ctx.closePath();
    if (filled) {
        ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
}

function drawHearts(ctx) {
    const heartSize = 16;
    const startX = 30;
    const y = 75;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';

    for (let i = 0; i < CONFIG.MAX_HEALTH; i++) {
        ctx.fillStyle = i < state.embarrassment ? '#e74c3c' : '#fff';
        drawHeart(ctx, startX + i * (heartSize + 8), y, heartSize, true);
    }
}

function drawUI(ctx) {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${String(state.score).padStart(5, '0')}`, CONFIG.WIDTH - 30, 50);
    ctx.fillText(`HI-SCORE: ${String(state.highScore).padStart(5, '0')}`, CONFIG.WIDTH - 30, 85);

    ctx.textAlign = 'left';
    if (bear.doubleJumpCount > 0) {
        ctx.fillStyle = '#e74c3c';
    }
    ctx.fillText(`二段跳: x${bear.doubleJumpCount}`, 30, 50);

    drawHearts(ctx);
}

// ----- Canvas -----
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ----- Input -----
function handleAction() {
    sound.init();
    sound.resume();

    if (state.isTitleScreen) {
        state.isTitleScreen = false;
        sound.startGame();
        startLoop();
    } else if (state.isGameOver) {
        resetGame();
    } else if (state.isPaused) {
        resetGame();
    } else {
        bear.jump();
    }
}

function handlePause() {
    if (state.isTitleScreen || state.isGameOver) return;
    state.isPaused = !state.isPaused;
    if (!state.isPaused) {
        startLoop();
    } else {
        drawPauseScreen();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleAction();
    } else if (e.code === 'Escape') {
        e.preventDefault();
        handlePause();
    }
});

canvas.addEventListener('click', (e) => {
    e.preventDefault();
    handleAction();
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleAction();
}, { passive: false });

// Prevent double-tap zoom on canvas
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
}, { passive: false });

// ----- Spawning -----
function spawnGroundObstacle() {
    const y = CONFIG.OBSTACLE_Y_GROUND;
    if (Math.random() < 0.5) {
        obstacles.push(new BrokenAlarm(y));
    } else {
        obstacles.push(new DeadlinePapers(y));
    }
}

function spawnFlyingObstacle() {
    const y = CONFIG.OBSTACLE_Y_FLYING_MIN + Math.random() * (CONFIG.OBSTACLE_Y_FLYING_MAX - CONFIG.OBSTACLE_Y_FLYING_MIN);
    obstacles.push(new FlyingAlarm(y));
}

function spawnObstacle() {
    // Dynamic gap guard: don't spawn if an obstacle is too close to the right edge.
    // Minimum gap = time for one full jump (~1.07s) * current speed
    const minGapPx = state.gameSpeed * 1.15;
    for (const obs of obstacles) {
        if (obs.x > CONFIG.WIDTH - minGapPx) return;
    }

    if (Math.random() < CONFIG.FLYING_OBSTACLE_CHANCE) {
        spawnFlyingObstacle();
    } else {
        spawnGroundObstacle();
    }

    // Double spawn only when safe — skip if the first spawn already triggered the gap guard
    if (Math.random() < CONFIG.DOUBLE_SPAWN_CHANCE) {
        if (Math.random() < 0.5) {
            spawnGroundObstacle();
        } else {
            spawnFlyingObstacle();
        }
    }
}

function handleSpawning(dt) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
        spawnObstacle();
        state.spawnTimer = state.spawnInterval;
    }

    state.moleTimer -= dt;
    if (state.moleTimer <= 0) {
        collectibles.push(new Mole());
        state.moleTimer = CONFIG.MOLE_SPAWN_INTERVAL;
    }

    state.coffeeTimer -= dt;
    if (state.coffeeTimer <= 0) {
        collectibles.push(new CoffeeCup());
        state.coffeeTimer = CONFIG.COFFEE_SPAWN_INTERVAL;
    }
}

function handleDifficulty(dt) {
    state.speedTimer += dt;
    if (state.speedTimer >= CONFIG.SPEED_INCREASE_INTERVAL) {
        state.speedTimer -= CONFIG.SPEED_INCREASE_INTERVAL;
        state.gameSpeed += CONFIG.SPEED_INCREASE_PER_S;
    }

    state.difficultyTimer += dt;
    if (state.difficultyTimer >= CONFIG.SPAWN_INTERVAL_DECREASE_EVERY) {
        state.difficultyTimer -= CONFIG.SPAWN_INTERVAL_DECREASE_EVERY;
        state.spawnInterval = Math.max(
            CONFIG.SPAWN_INTERVAL_MIN,
            state.spawnInterval - CONFIG.SPAWN_INTERVAL_DECREASE
        );
    }
}

// ----- Collision & Updates -----
function updateObstacles(dt) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update(dt);

        if (obs.isOffScreen()) {
            obstacles.splice(i, 1);
            state.score += 10;
            state.dodgeStreak++;
            if (state.dodgeStreak >= CONFIG.DODGE_STREAK_FOR_HEAL) {
                state.dodgeStreak = 0;
                if (state.embarrassment < CONFIG.MAX_HEALTH) {
                    state.embarrassment++;
                    sound.heal();
                }
            }
        } else if (!state.isInvincible && obs.collidesWith(bear, 10)) {
            hitObstacle();
            obstacles.splice(i, 1);
        }
    }
}

function updateCollectibles(dt) {
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        c.update(dt);

        if (c.isOffScreen()) {
            collectibles.splice(i, 1);
        } else if (c.collidesWith(bear, 5)) {
            if (c instanceof Mole) {
                bear.doubleJumpCount++;
                particles.emit(c.cx, c.cy, 8, '#f1c40f', 120, 0.4);
                sound.collect();
            } else if (c instanceof CoffeeCup) {
                if (state.embarrassment < CONFIG.MAX_HEALTH) {
                    state.embarrassment++;
                    particles.emit(c.cx, c.cy, 10, '#2ecc71', 100, 0.5);
                    sound.heal();
                }
            }
            collectibles.splice(i, 1);
        }
    }
}

function hitObstacle() {
    state.embarrassment--;
    state.screenFlash = CONFIG.FLASH_S;
    state.screenShake = CONFIG.SHAKE_S;
    state.isInvincible = true;
    state.invincibleTimer = CONFIG.INVINCIBLE_S;
    state.dodgeStreak = 0;
    particles.emit(bear.cx, bear.cy, 15, '#e74c3c', 200, 0.5);
    sound.hit();

    if (state.embarrassment <= 0) {
        triggerGameOver();
    }
}

function updateTimers(dt) {
    if (state.isInvincible) {
        state.invincibleTimer -= dt;
        if (state.invincibleTimer <= 0) {
            state.isInvincible = false;
        }
    }

    if (state.screenShake > 0) {
        state.screenShake -= dt;
    }

    if (state.screenFlash > 0) {
        state.screenFlash -= dt;
    }
}

// ----- Game Loop -----
let lastTime = 0;
let animFrameId = null;

function startLoop() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    lastTime = 0;
    animFrameId = requestAnimationFrame(tick);
}

function tick(timestamp) {
    if (state.isGameOver || state.isPaused) {
        animFrameId = null;
        return;
    }

    if (lastTime === 0) lastTime = timestamp;
    const rawDt = (timestamp - lastTime) / 1000;
    const dt = Math.min(rawDt, 0.1);
    lastTime = timestamp;

    update(dt);

    if (state.isGameOver) {
        drawGameOverScreen();
        return;
    }

    render(dt);

    animFrameId = requestAnimationFrame(tick);
}

function update(dt) {
    bear.update(dt);

    handleSpawning(dt);
    handleDifficulty(dt);
    updateObstacles(dt);
    updateCollectibles(dt);
    updateTimers(dt);

    for (const cloud of clouds) {
        cloud.update(dt);
    }

    particles.update(dt);
}

function render(dt) {
    ctx.save();

    if (state.screenShake > 0) {
        const intensity = (state.screenShake / CONFIG.SHAKE_S) * CONFIG.SHAKE_INTENSITY;
        ctx.translate(
            (Math.random() - 0.5) * intensity * 2,
            (Math.random() - 0.5) * intensity * 2
        );
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -10, CONFIG.WIDTH + 20, CONFIG.HEIGHT + 20);

    for (const cloud of clouds) {
        cloud.draw(ctx);
    }

    drawGround(ctx);

    for (const obs of obstacles) {
        obs.draw(ctx);
    }

    for (const c of collectibles) {
        c.draw(ctx);
    }

    bear.draw(ctx, state.isGameOver, state.isInvincible, state.invincibleTimer);

    particles.draw(ctx);

    if (state.screenFlash > 0) {
        const alpha = state.screenFlash / CONFIG.FLASH_S;
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.5})`;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    }

    drawUI(ctx);

    ctx.restore();
}

// ----- Screens -----
function drawTitleScreen() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    for (const c of clouds) {
        c.update(0.016);
        c.draw(ctx);
    }

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.font = 'bold 72px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEAR JUMP', CONFIG.WIDTH / 2, 160);

    ctx.strokeStyle = '#e74c3c';
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(CONFIG.WIDTH / 2 + 100, 130, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    bear.x = 370;
    bear.y = CONFIG.GROUND_Y - bear.height;
    bear._drawIdle(ctx, false, 0);

    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.font = 'bold 28px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.fillText('按【空格键】开始', CONFIG.WIDTH / 2, 400);

    drawGround(ctx);
}

function drawPauseScreen() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.fillText('PAUSED', CONFIG.WIDTH / 2, 180);

    ctx.font = 'bold 28px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.fillText(`当前得分: ${state.score}`, CONFIG.WIDTH / 2, 240);

    ctx.font = 'bold 26px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.fillText('按【ESC】继续', CONFIG.WIDTH / 2, 310);
    ctx.fillText('按【空格键】重新开始', CONFIG.WIDTH / 2, 350);

    drawGround(ctx);
}

function triggerGameOver() {
    state.isGameOver = true;
    animFrameId = null;
    sound.gameOver();

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('bearJumpHiScore', state.highScore);
    }
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, 180);

    ctx.font = 'bold 28px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.fillText(`得分: ${state.score}`, CONFIG.WIDTH / 2, 240);

    if (state.score >= state.highScore && state.score > 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('🏆 新纪录！', CONFIG.WIDTH / 2, 285);
    }

    ctx.fillStyle = '#000';
    ctx.font = 'bold 26px "Comic Sans MS", "Microsoft YaHei", sans-serif';
    ctx.fillText('按【空格键】重新开始', CONFIG.WIDTH / 2, 330);

    drawGround(ctx);
}

function resetGame() {
    obstacles.length = 0;
    collectibles.length = 0;
    particles.clear();

    state.score = 0;
    state.gameSpeed = CONFIG.INITIAL_SPEED;
    state.embarrassment = CONFIG.MAX_HEALTH;
    state.isInvincible = false;
    state.invincibleTimer = 0;
    state.screenFlash = 0;
    state.screenShake = 0;
    state.dodgeStreak = 0;
    state.spawnTimer = 0;
    state.spawnInterval = CONFIG.SPAWN_INTERVAL_INITIAL;
    state.moleTimer = 0;
    state.coffeeTimer = 0;
    state.speedTimer = 0;
    state.difficultyTimer = 0;
    state.isGameOver = false;

    bear.reset();
    startLoop();
}

// ----- Init -----
function init() {
    sound.init();
    drawTitleScreen();
}

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
    };
}

init();
