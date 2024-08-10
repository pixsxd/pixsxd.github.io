const socket = io('https://gun-x0y0.onrender.com'); // Replace with your Render URL
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
let players = {};
let projectiles = [];
let leaderboard = {};
let playerName = null;
let mousePosition = { x: 0, y: 0 };

document.getElementById('playButton').onclick = () => {
    playerName = document.getElementById('nameInput').value;
    if (playerName) {
        socket.emit('newPlayer', playerName);
        document.getElementById('nameScreen').style.display = 'none';
        canvas.style.display = 'block';
    }
};

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mousePosition.x = event.clientX - rect.left;
    mousePosition.y = event.clientY - rect.top;
});

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    socket.emit('moveTo', { x, y });
});

document.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
        event.preventDefault();
        socket.emit('attack', { x: mousePosition.x, y: mousePosition.y });
    }
});

socket.on('updatePlayers', (serverPlayers) => {
    players = serverPlayers;
});

socket.on('updateLeaderboard', (serverLeaderboard) => {
    leaderboard = serverLeaderboard;
});

socket.on('projectileAttack', (data) => {
    const bullet = {
        id: data.attacker.id,
        currentX: data.attacker.x,
        currentY: data.attacker.y,
        targetX: data.targetX,
        targetY: data.targetY,
        speed: 7,
        dx: (data.targetX - data.attacker.x) / Math.hypot(data.targetX - data.attacker.x, data.targetY - data.attacker.y),
        dy: (data.targetY - data.attacker.y) / Math.hypot(data.targetX - data.attacker.x, data.targetY - data.attacker.y),
        createdAt: Date.now(),
    };
    projectiles.push(bullet);
});

function drawPlayers() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let id in players) {
        const player = players[id];
        context.fillStyle = player.color; // Use the player's unique color
        context.beginPath();
        context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
        context.fill();

        // Draw health bar
        context.fillStyle = 'red';
        context.fillRect(player.x - 20, player.y - 30, 40, 5);
        context.fillStyle = 'green';
        context.fillRect(player.x - 20, player.y - 30, (player.health / 100) * 40, 5);

        // Draw player name centered above health bar
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.fillText(player.name, player.x, player.y - 40);
    }
}

function drawProjectiles() {
    const now = Date.now();
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const bullet = projectiles[i];

        // Check if the bullet has existed for more than 5 seconds
        if (now - bullet.createdAt > 5000) {
            projectiles.splice(i, 1); // Remove the bullet
            continue;
        }

        bullet.currentX += bullet.dx * bullet.speed;
        bullet.currentY += bullet.dy * bullet.speed;

        context.beginPath();
        context.moveTo(bullet.currentX, bullet.currentY);
        context.lineTo(bullet.currentX + bullet.dx * 10, bullet.currentY + bullet.dy * 10);
        context.strokeStyle = 'brown';
        context.lineWidth = 2;
        context.stroke();

        // Check if any player is hit
        for (let id in players) {
            const player = players[id];
            if (id !== bullet.id) { // Avoid hitting the shooter
                const hitDistance = Math.hypot(bullet.currentX - player.x, bullet.currentY - player.y);
                if (hitDistance < 10) {
                    socket.emit('playerHit', id); // Notify server of hit
                    projectiles.splice(i, 1); // Remove the bullet after hit
                    break;
                }
            }
        }
    }
}

function drawLeaderboard() {
    context.font = '16px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'right';

    const sortedLeaderboard = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    let yOffset = 20;

    context.fillText('Leaderboard', canvas.width - 20, yOffset);
    yOffset += 20;

    sortedLeaderboard.forEach(([playerId, points]) => {
        const playerName = players[playerId]?.name || 'Unknown';
        context.fillText(`${playerName}: ${points} points`, canvas.width - 20, yOffset);
        yOffset += 20;
    });
}

function movePlayer() {
    drawPlayers();
    drawProjectiles();
    drawLeaderboard();
    requestAnimationFrame(movePlayer);
}

requestAnimationFrame(movePlayer);
