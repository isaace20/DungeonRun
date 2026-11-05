import { Scene, Input } from 'phaser';
import LevelGenerator, { WALL_THICKNESS } from '../levels/LevelGenerator.js';

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
        this.currentLevel = 1;
        this.lives = 3;
        this.relicsCollectedThisLevel = 0; // Reliquias del nivel actual (se resetea por nivel)
        this.relicsCollectedGlobal = 0; // Reliquias totales de la partida (persiste entre niveles)
        this.totalRelicsPerLevel = 6; // Reliquias necesarias por nivel para desbloquear salida
        this.totalRelicsGlobal = 25; // Objetivo de victoria global
        this.score = 0;
        this.relicValue = 100; // configurable para balance
        this.exitUnlocked = false;
        this.victoryAchieved = false; // ¿Se alcanzó el objetivo de 25?
        this.victoryFlag = false; // ¿Se ganó la partida definitiva?
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.deathTimer = 0;
        this.gameOverFlag = false;

        // Datos del nivel generado (habitaciones, conexiones, mundo)
        this.levelData = null;

        // Objetos por etapa (se limpian y recrean en cada nivel)
        this.walls = [];
        this.relics = [];
        this.enemies = [];
        this.exit = null;

        // Colliders de física para limpieza al cambiar de nivel
        this.colliders = [];

        // ===== HUD =====
        this.livesText = this.add.text(16, 16, 'Vidas: 3', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100).setScrollFactor(0);
        this.relicsText = this.add.text(16, 48, 'Reliquias: 0/6 | Global: 0/25', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100).setScrollFactor(0);
        this.scoreText = this.add.text(16, 80, 'Puntuación: 0', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100).setScrollFactor(0);
        this.stageText = this.add.text(16, 112, 'Nivel: 1', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setDepth(100).setScrollFactor(0);
        // Aviso de objetivo cumplido (se muestra al alcanzar 25 reliquias)
        this.objectiveText = this.add.text(16, 144, '', {
            fontSize: '20px',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setDepth(100).setScrollFactor(0);

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

        // ===== Cámara con límites del mundo =====
        // Se configurará completamente después de generar el nivel.

        // ===== Generar primer nivel =====
        this.generateLevel();
    }

    generateLevel ()
    {
        // Limpiar nivel anterior (excepto jugador y HUD)
        this.clearLevel();

        const width = this.width;
        const height = this.height;
        const wallColor = 0x4ecca3;
        const wallThickness = WALL_THICKNESS;

        // --- Generar mapa procedural (8 habitaciones, cuadrícula 4×2) ---
        const generator = new LevelGenerator({
            cols: 4,
            rows: 2,
            cellWidth: 500,
            cellHeight: 400,
            gap: 40
        });

        this.levelData = generator.generate();
        const { rooms, connections, exitRoomIndex, startRoomIndex, worldWidth, worldHeight, selectedRelics } = this.levelData;

        // Configurar límites físicos del mundo para evitar que el jugador escape
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.player.body.setCollideWorldBounds(true);

        // Configurar cámara para recorrer el mundo completo
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // --- Dibujar paredes de todas las habitaciones ---
        this.walls = [];

        // Paredes perimetrales de cada habitación (salvo donde hay puerta)
        rooms.forEach((room) => {
            const ax = room.absX;
            const ay = room.absY;
            const w = room.width;
            const h = room.height;

            // Pared superior (si no hay puerta 'top')
            if (!room.doors.has('top')) {
                const top = this.add.rectangle(ax + w / 2, ay + wallThickness / 2, w, wallThickness, wallColor);
                this.physics.add.existing(top);
                top.body.setImmovable(true);
                top.body.allowGravity = false;
                this.walls.push(top);
            }

            // Pared inferior (si no hay puerta 'bottom')
            if (!room.doors.has('bottom')) {
                const bottom = this.add.rectangle(ax + w / 2, ay + h - wallThickness / 2, w, wallThickness, wallColor);
                this.physics.add.existing(bottom);
                bottom.body.setImmovable(true);
                bottom.body.allowGravity = false;
                this.walls.push(bottom);
            }

            // Pared izquierda (si no hay puerta 'left')
            if (!room.doors.has('left')) {
                const left = this.add.rectangle(ax + wallThickness / 2, ay + h / 2, wallThickness, h, wallColor);
                this.physics.add.existing(left);
                left.body.setImmovable(true);
                left.body.allowGravity = false;
                this.walls.push(left);
            }

            // Pared derecha (si no hay puerta 'right')
            if (!room.doors.has('right')) {
                const right = this.add.rectangle(ax + w - wallThickness / 2, ay + h / 2, wallThickness, h, wallColor);
                this.physics.add.existing(right);
                right.body.setImmovable(true);
                right.body.allowGravity = false;
                this.walls.push(right);
            }

            // Paredes internas (obstáculos dentro de la habitación)
            // Las plantillas definen (x, y) como esquina superior-izquierda;
            // Phaser centra el rectángulo, así que hay que sumar w/2 y h/2
            // para dibujar la pared en el mismo lugar que validó LevelGenerator.
            room.internalWalls.forEach((def) => {
                const obs = this.add.rectangle(ax + def.x + def.w / 2, ay + def.y + def.h / 2, def.w, def.h, 0x2a2a4e);
                this.physics.add.existing(obs);
                obs.body.setImmovable(true);
                obs.body.allowGravity = false;
                this.walls.push(obs);
            });
        });

        // --- Colisiones jugador <-> todas las paredes ---
        this.walls.forEach((wall) => {
            const collider = this.physics.add.collider(this.player, wall);
            this.colliders.push(collider);
        });

        // --- Reliquias (exactamente 6, validadas y en posiciones transitables) ---
        const relicColor = 0xffd700;
        const relicRadius = 12;

        this.relics = [];
        (selectedRelics || []).forEach((relicData) => {
            const relic = this.add.circle(relicData.x, relicData.y, relicRadius, relicColor);
            this.physics.add.existing(relic);
            relic.body.setImmovable(true);
            relic.body.allowGravity = false;
            const overlap = this.physics.add.overlap(this.player, relic, this.collectRelic, null, this);
            this.colliders.push(overlap);
            this.relics.push(relic);
        });

        // --- Salida (aleatoriamente en una habitación distinta de la inicial) ---
        const exitRoom = rooms[exitRoomIndex];
        const exitPos = exitRoom.exitPosition || { x: exitRoom.width / 2, y: exitRoom.height / 2 };

        this.exit = this.add.rectangle(exitRoom.absX + exitPos.x, exitRoom.absY + exitPos.y, 48, 48, 0x888888);
        this.physics.add.existing(this.exit);
        this.exit.body.setImmovable(true);
        this.exit.body.allowGravity = false;
        this.physics.add.overlap(this.player, this.exit, this.checkExit, null, this);

        // --- Enemigos (cantidad según nivel, posiciones definidas por plantilla) ---
        this.enemies = [];
        const detectionRadius = 160;
        const baseSpeed = 40 + (this.currentLevel - 1) * 8;

        rooms.forEach((room) => {
            const enemyCountForRoom = Math.min(this.currentLevel, room.enemyPositions.length);
            for (let i = 0; i < enemyCountForRoom; i++) {
                const start = room.enemyPositions[i];
                // La patrulla ya viene validada por LevelGenerator (no cruza paredes ni sale de la habitación).
                const patrol = (room.enemyPatrols && room.enemyPatrols[i]) || null;
                const enemy = this.add.rectangle(room.absX + start.x, room.absY + start.y, 28, 28, 0xff0000);
                this.physics.add.existing(enemy);
                enemy.body.setImmovable(false);
                enemy.body.allowGravity = false;

                enemy.patrolStart = { x: room.absX + start.x, y: room.absY + start.y };
                enemy.patrolEnd = patrol
                    ? { x: room.absX + patrol.end.x, y: room.absY + patrol.end.y }
                    : { x: room.absX + start.x + 120, y: room.absY + start.y };
                enemy.patrolDir = 1;
                enemy.speed = baseSpeed;
                enemy.detectionRadius = detectionRadius;
                enemy.homeRoom = room.index;

                const enemyWallCollider = this.physics.add.collider(enemy, this.walls);
                const enemyPlayerCollider = this.physics.add.collider(this.player, enemy, this.handleEnemyContact, null, this);
                this.colliders.push(enemyWallCollider, enemyPlayerCollider);

                this.enemies.push(enemy);
            }
        });

        // --- Reposicionar jugador en la habitación inicial ---
        const startRoom = rooms[startRoomIndex];
        const ps = startRoom.playerStart || { x: startRoom.width / 2, y: startRoom.height / 2 };
        this.player.setPosition(startRoom.absX + ps.x, startRoom.absY + ps.y);
        this.player.body.setVelocity(0, 0);
        this.player.setAlpha(1);
        this.invulnerable = false;

        // El generador ya garantiza que ningún enemigo quede a menos de
        // SAFE_PLAYER_DISTANCE del jugador en la habitación inicial, y que
        // ningún spawn quede dentro de una pared. No se mueve al jugador
        // de forma arbitraria (eso podía meterlo dentro de un bloque).

        // Resetear solo el contador del nivel actual; el global persiste entre niveles
        this.relicsCollectedThisLevel = 0;
        this.exitUnlocked = false;
        this.victoryAchieved = this.relicsCollectedGlobal >= this.totalRelicsGlobal;

        // Mostrar aviso si ya se alcanzó el objetivo global en niveles previos
        if (this.victoryAchieved && !this.victoryFlag) {
            this.objectiveText.setText('¡Objetivo cumplido! Encontrá la salida para ganar');
        } else if (!this.victoryAchieved) {
            this.objectiveText.setText('');
        }

        this.updateHUD();
    }

    clearLevel ()
    {
        // Destruir colliders de física para evitar acumulación entre niveles
        if (this.colliders) {
            this.colliders.forEach((c) => {
                if (c && c.destroy) {
                    c.destroy();
                }
            });
            this.colliders = [];
        }

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
        this.relicsText.setText(`Reliquias: ${this.relicsCollectedThisLevel}/${this.totalRelicsPerLevel} | Global: ${this.relicsCollectedGlobal}/${this.totalRelicsGlobal}`);
        this.scoreText.setText(`Puntuación: ${this.score}`);
        this.stageText.setText(`Nivel: ${this.currentLevel}`);
    }

    collectRelic (player, relic)
    {
        if (this.gameOverFlag) return;
        if (!relic || !relic.active) return;

        relic.destroy();
        this.relicsCollectedThisLevel++;
        this.relicsCollectedGlobal++;
        this.score += this.relicValue;
        this.updateHUD();

        // Aviso cuando se alcanza el objetivo global de 25 reliquias
        if (this.relicsCollectedGlobal >= this.totalRelicsGlobal && !this.victoryAchieved) {
            this.victoryAchieved = true;
            this.objectiveText.setText('¡Objetivo cumplido! Encontrá la salida para ganar');
        }

        // La puerta se abre solo al completar las 6 reliquias del nivel actual
        if (this.relicsCollectedThisLevel >= this.totalRelicsPerLevel && !this.exitUnlocked) {
            this.exitUnlocked = true;
            this.exit.setFillStyle(0x00ff00); // verde = desbloqueada
        }
    }

    checkExit (player, exit)
    {
        if (this.gameOverFlag || this.victoryFlag) return;

        // La puerta solo se puede usar si el nivel está completado (6 reliquias del nivel)
        if (!this.exitUnlocked) return;

        // Victoria definitiva: nivel completado Y contador global >= 25
        if (this.relicsCollectedGlobal >= this.totalRelicsGlobal) {
            this.victoryFlag = true;
            this.scene.start('Victory', { score: this.score, relics: this.relicsCollectedGlobal });
            return;
        }

        // Si el nivel está completado pero faltan reliquias globales, avanzar al siguiente
        this.nextLevel();
    }

    nextLevel ()
    {
        this.currentLevel++;
        this.generateLevel();
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

        // Reaparecer en posición segura (habitación inicial del nivel actual)
        const startRoom = this.levelData.rooms[this.levelData.startRoomIndex];
        const ps = startRoom.playerStart || { x: startRoom.width / 2, y: startRoom.height / 2 };
        this.player.setPosition(startRoom.absX + ps.x, startRoom.absY + ps.y);
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
