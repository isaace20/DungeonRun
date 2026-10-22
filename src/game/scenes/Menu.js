import { Scene } from 'phaser';

export class Menu extends Scene
{
    constructor ()
    {
        super('Menu');
    }

    create ()
    {
        const width = this.game.config.width;
        const height = this.game.config.height;

        // Título
        this.add.text(width / 2, height / 3, 'DUNGEON RUN', {
            fontSize: '56px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Botón iniciar
        const btnStart = this.add.text(width / 2, height / 2, 'INICIAR PARTIDA', {
            fontSize: '32px',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnStart.on('pointerdown', () => {
            this.scene.start('Game');
        });

        // Instrucciones
        this.add.text(width / 2, height * 0.62, 'WASD o flechas: moverse', {
            fontSize: '20px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.68, 'Recolecta 6 reliquias para desbloquear la salida', {
            fontSize: '20px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.74, 'Evita a los enemigos (rojos). No hay combate.', {
            fontSize: '20px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.82, 'Tres vidas por partida. Supera etapas con dificultad creciente.', {
            fontSize: '20px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }
}
