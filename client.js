/* client.js - Wormate.io Full Clone Oyun Motoru (Orijinal Menü Entegrasyonu) */
const socket = io(`https://${window.location.hostname}:8000`);

let app = null;
let camera = { x: 0, y: 0 };
let myId = null;
let gameRunning = false;

// --- ORİJİNAL HTML MENÜSÜNDEKİ "PLAY" BUTONUNA TEPKİ ---
document.addEventListener('DOMContentLoaded', () => {
    // 'Play as guest' butonunu bul
    const playBtn = document.getElementById('mm-action-guest');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            startGame();
        });
    }
});

// Oyunu Başlatan Fonksiyon
function startGame() {
    if (gameRunning) return;
    gameRunning = true;

    // PixiJS motorunu başlat
    app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        antialias: true
    });
    
    // Oyunu #game-view div'inin içine yerleştir
    const gameView = document.getElementById('game-view');
    gameView.appendChild(app.view);

    // Menüyü gizle, oyunu göster
    document.getElementById('main-menu-view').style.display = 'none';
    document.getElementById('game-view').style.display = 'block';

    // Arka plan çizimi
    drawBackground();

    // Oyun döngüsünü başlat
    app.ticker.add(() => {
        if (!gameRunning) return;
        // Oyun verileri sunucudan geldiğinde çizim yapılacak
    });
}

// Arka plan petek deseni
function drawBackground() {
    let g = new PIXI.Graphics();
    g.lineStyle(1, 0x333333, 0.5);
    for(let x = -4000; x < 4000; x += 60) {
        g.moveTo(x - camera.x, -4000 - camera.y);
        g.lineTo(x - camera.x, 4000 - camera.y);
    }
    for(let y = -4000; y < 4000; y += 60) {
        g.moveTo(-4000 - camera.x, y - camera.y);
        g.lineTo(4000 - camera.x, y - camera.y);
    }
    app.stage.addChild(g);
}

// --- SUNUCUDAN VERİ GELDİĞİNDE ---
socket.on('game_update', (data) => {
    if (!gameRunning || !app) return;

    app.stage.removeChildren();
    drawBackground();

    // Yemleri Çiz
    let foodGraphics = new PIXI.Graphics();
    for (let f of data.foods) {
        foodGraphics.beginFill(f.color);
        foodGraphics.drawCircle(f.x - camera.x, f.y - camera.y, 5);
        foodGraphics.endFill();
    }
    app.stage.addChild(foodGraphics);

    // Oyuncuları ve Yılanları Çiz
    let sortedPlayers = Object.values(data.players).sort((a, b) => a.length - b.length);
    for (let p of sortedPlayers) {
        if (p.id === myId) {
            camera.x = p.x - app.screen.width / 2;
            camera.y = p.y - app.screen.height / 2;
        }

        let snakeGraphic = new PIXI.Graphics();
        for (let i = 0; i < p.segments.length; i++) {
            let seg = p.segments[i];
            let radius = 16 - (i * 0.15);
            if (i === 0) radius = 20;
            let color = p.id === myId ? 0xff66a5 : p.color;
            snakeGraphic.beginFill(color);
            snakeGraphic.drawCircle(seg.x - camera.x, seg.y - camera.y, radius);
            snakeGraphic.endFill();
        }

        // Kafaya Göz Çiz (Wormate.io stili)
        if (p.segments.length > 0) {
            let head = p.segments[0];
            let angle = p.angle;
            let eyeRadius = 6;
            let eyeOffset = 12;
            
            snakeGraphic.beginFill(0xffffff);
            snakeGraphic.drawCircle((head.x + Math.cos(angle - 0.5) * eyeOffset) - camera.x, (head.y + Math.sin(angle - 0.5) * eyeOffset) - camera.y, eyeRadius);
            snakeGraphic.endFill();
            snakeGraphic.beginFill(0x000000);
            snakeGraphic.drawCircle((head.x + Math.cos(angle - 0.5) * (eyeOffset + 3)) - camera.x, (head.y + Math.sin(angle - 0.5) * (eyeOffset + 3)) - camera.y, 2);
            snakeGraphic.endFill();

            snakeGraphic.beginFill(0xffffff);
            snakeGraphic.drawCircle((head.x + Math.cos(angle + 0.5) * eyeOffset) - camera.x, (head.y + Math.sin(angle + 0.5) * eyeOffset) - camera.y, eyeRadius);
            snakeGraphic.endFill();
            snakeGraphic.beginFill(0x000000);
            snakeGraphic.drawCircle((head.x + Math.cos(angle + 0.5) * (eyeOffset + 3)) - camera.x, (head.y + Math.sin(angle + 0.5) * (eyeOffset + 3)) - camera.y, 2);
            snakeGraphic.endFill();
        }
        app.stage.addChild(snakeGraphic);
    }
});

// Bağlantı ve Ölüm
socket.on('connect', () => { myId = socket.id; });
socket.on('dead', () => {
    alert('Bir yılana çarptın!');
    location.reload();
});

// Mouse Hareketi
document.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    let dx = e.clientX - app.screen.width / 2;
    let dy = e.clientY - app.screen.height / 2;
    let angle = Math.atan2(dy, dx);
    socket.emit('move', { angle: angle });
});

// Ekran Boyutu
window.addEventListener('resize', () => {
    if (app) app.renderer.resize(window.innerWidth, window.innerHeight);
});