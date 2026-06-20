/* server.js - Wormate.io Full Clone Sunucusu (Statik Dosyaları Tanıtan) */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// CORS Ayarları (Bulut ortamı için)
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- STATİK DOSYALARI TANIT (HTML, JS, Resimler) ---
app.use(express.static(path.join(__dirname, '/')));

const WORLD_SIZE = 8000;
const FOOD_COUNT = 1500;
const PLAYER_RADIUS = 18;

let foods = [];
let players = {};

// Yem üretme
function spawnFood() {
    return {
        x: Math.random() * WORLD_SIZE - WORLD_SIZE/2,
        y: Math.random() * WORLD_SIZE - WORLD_SIZE/2,
        color: Math.floor(Math.random() * 16777215)
    };
}
for (let i = 0; i < FOOD_COUNT; i++) foods.push(spawnFood());

// Yeni oyuncu bağlandığında
io.on('connection', (socket) => {
    console.log(`Oyuncu bağlandı: ${socket.id}`);

    // Yeni yılan verisi
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 1000 - 500,
        y: Math.random() * 1000 - 500,
        angle: 0,
        length: 15,
        segments: [],
        speed: 3,
        color: Math.floor(Math.random() * 16777215)
    };

    // İlk gövde parçaları
    for (let i = 0; i < 15; i++) {
        players[socket.id].segments.push({
            x: players[socket.id].x - i * players[socket.id].speed,
            y: players[socket.id].y
        });
    }

    // Hareket Verisi
    socket.on('move', (data) => {
        let p = players[socket.id];
        if (!p) return;

        p.angle = data.angle;
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Dünya sınırları
        if (p.x > WORLD_SIZE/2) p.x = -WORLD_SIZE/2;
        if (p.x < -WORLD_SIZE/2) p.x = WORLD_SIZE/2;
        if (p.y > WORLD_SIZE/2) p.y = -WORLD_SIZE/2;
        if (p.y < -WORLD_SIZE/2) p.y = WORLD_SIZE/2;

        // Yem yeme
        for (let i = 0; i < foods.length; i++) {
            let dist = Math.hypot(p.x - foods[i].x, p.y - foods[i].y);
            if (dist < PLAYER_RADIUS) {
                foods.splice(i, 1);
                foods.push(spawnFood());
                p.length += 1.5;
            }
        }

        // Kuyruk güncellemesi
        p.segments.push({x: p.x, y: p.y});
        if (p.segments.length > p.length) {
            p.segments.shift();
        }

        // Çarpışma (Diğer oyuncular)
        for (let id in players) {
            if (id === socket.id) continue;
            let other = players[id];
            let dist = Math.hypot(p.x - other.x, p.y - other.y);
            if (dist < PLAYER_RADIUS * 2) {
                delete players[socket.id];
                socket.emit('dead');
                return;
            }
        }
    });

    // Oyuncu çıkışı
    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log(`Oyuncu çıktı: ${socket.id}`);
    });
});

// Sunucu döngüsü (60 FPS)
setInterval(() => {
    io.emit('game_update', { players, foods });
}, 1000 / 60);

// PORT AYARI (Bulut ve Local için)
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Wormate Clone Sunucusu ${PORT} portunda çalışıyor!`);
});