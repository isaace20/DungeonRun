import { Scene, Input } from 'phaser';

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    preload ()
    {
        // Esta etapa no carga assets externos.
        // Todos los gráficos se generan mediante código en create().
    }

    create ()
    {
        this.width = this.game.config.width;
        this.height = this.game.config.height;

        // ===== Estado del juego =====
        this.currentStage = 1;
        this.lives = 3;
        this.relicsCollected = 0;
        this.totalRelics = 6;
        this.score = 0;
        this.relicValue = 100; // configurable para balance
        this.exitUnlocked = false;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.deathTimer = 0;
        this.gameOverFlag = false;

        // Objetos por etapa (se limpian y recrean en cada etapa)
        this.walls = [];
        this.relics = [];
        this.enemies = [];
        this.exit = null;

        // ===== HUD =====
        this.livesText = this.add.text(16, 16, 'Vidas: 3', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100);
        this.relicsText = this.add.text(16, 48, 'Reliquias: 0/6', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100);
        this.scoreText = this.add.text(16, 80, 'Puntuación: 0', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100);
        this.stageText = this.add.text(16, 112, 'Etapa: 1', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100);

        // ===== Entrada =====
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            W: Input.Keyboard.KeyCodes.W,
            A: Input.Keyboard.KeyCodes.A,
            S: Input.Keyboard.KeyCodes.S,
            D: Input.Keyboard.KeyCodes.D
        });

        this.speed = 180;

        // ===== Jugador =====
        this.player = this.add.rectangle(this.width / 2, this.height / 2, 32, 32, 0xffffff);
        this.physics.add.existing(this.player);
        this.player.body.setSize(32, 32);

        // ===== Primera etapa =====
        this.generateStage();
    }

    generateStage ()
    {
        // Limpiar etapa anterior (excepto jugador y HUD)
        this.clearStage();

        const width = this.width;
        const height = this.height;
        const wallColor = 0x4ecca3;
        const wallThickness = 32;

        // --- Paredes del recinto ---
        const topWall = this.add.rectangle(width / 2, wallThickness / 2, width, wallThickness, wallColor);
        const bottomWall = this.add.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, wallColor);
        const leftWall = this.add.rectangle(wallThickness / 2, height / 2, wallThickness, height, wallColor);
        const rightWall = this.add.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, wallColor);

        [topWall, bottomWall, leftWall, rightWall].forEach((wall) => {
            this.physics.add.existing(wall);
            wall.body.setImmovable(true);
            wall.body.allowGravity = false;
        });

        this.walls = [topWall, bottomWall, leftWall, rightWall];

        // --- Obstáculos internos (dificultad creciente) ---
        const obstacleCount = 1 + Math.floor((this.currentStage - 1) / 2);
        for (let i = 0; i < obstacleCount; i++) {
            const ox = 180 + i * 180;
            const oy = 200 + (i % 2) * 280;
            const obs = this.add.rectangle(ox, oy, 90, 90, 0x2a2a4e);
            this.physics.add.existing(obs);
            obs.body.setImmovable(true);
            obs.body.allowGravity = false;
            this.walls.push(obs);
        }

        // --- Colisiones jugador <-> paredes ---
        this.walls.forEach((wall) => {
            this.physics.add.collider(this.player, wall);
        });

        // --- Reliquias (6, accesibles) ---
        const relicColor = 0xffd700;
        const relicRadius = 12;
        const relicPositions = [
            { x: 200, y: 200 },
            { x: width - 200, y: 200 },
            { x: 200, y: height - 200 },
            { x: width - 200, y: height - 200 },
            { x: width / 2, y: height / 2 },
            { x: width / 2, y: 220 }
        ];

        this.relics = [];
        relicPositions.forEach((pos) => {
            const relic = this.add.circle(pos.x, pos.y, relicRadius, relicColor);
            this.physics.add.existing(relic);
            relic.body.setImmovable(true);
            relic.body.allowGravity = false;
            this.physics.add.overlap(this.player, relic, this.collectRelic, null, this);
            this.relics.push(relic);
        });

        // --- Salida (inicialmente bloqueada, cerca del borde inferior) ---
        this.exit = this.add.rectangle(width / 2, height - 80, 48, 48, 0x888888);
        this.physics.add.existing(this.exit);
        this.exit.body.setImmovable(true);
        this.exit.body.allowGravity = false;
        this.physics.add.overlap(this.player, this.exit, this.checkExit, null, this);

        // --- Enemigos (cantidad según etapa, persecución limitada) ---
        this.enemies = [];
        const enemyCount = this.currentStage;
        const detectionRadius = 160;
        const baseSpeed = 40 + (this.currentStage - 1) * 8;

        for (let i = 0; i < enemyCount; i++) {
            const ex = 180 + i * 220;
            const ey = 180 + (i % 2) * 260;
            const enemy = this.add.rectangle(ex, ey, 28, 28, 0xff0000);
            this.physics.add.existing(enemy);
            enemy.body.setImmovable(false);
            enemy.body.allowGravity = false;

            enemy.patrolStart = { x: ex, y: ey };
            enemy.patrolEnd = { x: ex + 120, y: ey };
            enemy.patrolDir = 1;
            enemy.speed = baseSpeed;
            enemy.detectionRadius = detectionRadius;

            this.physics.add.collider(enemy, this.walls);
            this.physics.add.collider(this.player, enemy, this.handleEnemyContact, null, this);

            this.enemies.push(enemy);
        }

        // Reposicionar jugador al centro y actualizar HUD
        this.player.setPosition(width / 2, height / 2);
        this.player.body.setVelocity(0, 0);
        this.player.setAlpha(1);
        this.invulnerable = false;

        this.updateHUD();
    }

    clearStage ()
    {
        // Destruir enemigos
        if (this.enemies) {
            this.enemies.forEach((e) => e.destroy());
            this.enemies = [];
        }
        // Destruir reliquias
        if (this.relics) {
            this.relics.forEach((r) => r.destroy());
            this.relics = [];
        }
        // Destruir salida
        if (this.exit) {
            this.exit.destroy();
            this.exit = null;
        }
        // Destruir paredes
        if (this.walls) {
            this.walls.forEach((w) => w.destroy());
            this.walls = [];
        }
    }

    updateHUD ()
    {
        this.livesText.setText(`Vidas: ${this.lives}`);
        this.relicsText.setText(`Reliquias: ${this.relicsCollected}/${this.totalRelics}`);
        this.scoreText.setText(`Puntuación: ${this.score}`);
        this.stageText.setText(`Etapa: ${this.currentStage}`);
    }

    collectRelic (player, relic)
    {
        if (this.gameOverFlag) return;
        if (!relic || !relic.active) return;

        relic.destroy();
        this.relicsCollected++;
        this.score += this.relicValue;
        this.updateHUD();

        if (this.relicsCollected >= this.totalRelics && !this.exitUnlocked) {
            this.exitUnlocked = true;
            this.exit.setFillStyle(0x00ff00); // verde = desbloqueada
        }
    }

    checkExit (player, exit)
    {
        if (this.gameOverFlag || !this.exitUnlocked) return;

        this.nextStage();
    }

    nextStage ()
    {
        this.currentStage++;
        this.relicsCollected = 0;
        this.exitUnlocked = false;
        this.generateStage();
    }

    handleEnemyContact (player, enemy)
    {
        if (this.gameOverFlag || this.invulnerable) return;

        this.takeDamage();
    }

    takeDamage ()
    {
        this.lives--;
        this.updateHUD();

        if (this.lives <= 0) {
            this.gameOverFlag = true;
            this.player.body.setVelocity(0, 0);
            this.player.setAlpha(0.5);
            this.deathTimer = 1000; // ms antes de mostrar GameOver
            return;
        }

        // Invulnerabilidad temporal
        this.invulnerable = true;
        this.invulnerabilityTimer = 2000; // 2 segundos
        this.player.setAlpha(0.5);

        // Reaparecer en posición segura (centro de la habitación)
        this.player.setPosition(this.width / 2, this.height / 2);
        this.player.body.setVelocity(0, 0);
    }

    update (time, delta)
    {
        if (this.gameOverFlag) {
            this.deathTimer -= delta;
            if (this.deathTimer <= 0) {
                this.scene.start('GameOver', { score: this.score });
            }
            return;
        }

        // ===== Movimiento del jugador =====
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

        const length = Math.sqrt(vx * vx + vy * vy);
        if (length > 0) {
            vx = (vx / length) * this.speed;
            vy = (vy / length) * this.speed;
        } else {
            vx = 0;
            vy = 0;
        }
        this.player.body.setVelocity(vx, vy);

        // ===== Invulnerabilidad (parpadeo visual) =====
        if (this.invulnerable) {
            this.invulnerabilityTimer -= delta;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
                this.invulnerabilityTimer = 0;
                this.player.setAlpha(1);
            } else {
                if (Math.floor(time / 100) % 2 === 0) {
                    this.player.setAlpha(0.3);
                } else {
                    this.player.setAlpha(0.7);
                }
            }
        }

        // ===== Enemigos =====
        this.enemies.forEach((enemy) => {
            const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
            const inRange = dist < enemy.detectionRadius;

            let targetX, targetY;

            if (inRange) {
                // Perseguir al jugador
                targetX = this.player.x;
                targetY = this.player.y;
            } else {
                // Patrulla entre dos puntos
                const start = enemy.patrolStart;
                const end = enemy.patrolEnd;
                const dEnd = Math.hypot(enemy.x - end.x, enemy.y - end.y);
                const dStart = Math.hypot(enemy.x - start.x, enemy.y - start.y);

                if (enemy.patrolDir === 1) {
                    targetX = end.x;
                    targetY = end.y;
                    if (dEnd < 5) enemy.patrolDir = -1;
                } else {
                    targetX = start.x;
                    targetY = start.y;
                    if (dStart < 5) enemy.patrolDir = 1;
                }
            }

            const dx = targetX - enemy.x;
            const dy = targetY - enemy.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);

            if (distToTarget > 5) {
                const vx = (dx / distToTarget) * enemy.speed;
                const vy = (dy / distToTarget) * enemy.speed;
                enemy.body.setVelocity(vx, vy);
            } else {
                enemy.body.setVelocity(0, 0);
            }
        });
    }
}
