import { Scene } from 'phaser';

export class Victory extends Scene
{
    constructor ()
    {
        super('Victory');
    }

    init (data)
    {
        this.finalScore = data && data.score !== undefined ? data.score : 0;
        this.finalRelics = data && data.relics !== undefined ? data.relics : 0;
    }

    create ()
    {
        const width = this.game.config.width;
        const height = this.game.config.height;

        // Fondo oscuro semitransparente (opcional, se puede mejorar con un rectangle)
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setAlpha(0.6).setDepth(90);

        // Título de victoria
        this.add.text(width / 2, height / 4, '¡VICTORIA!', {
            fontSize: '64px',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(100);

        // Mensaje de objetivo cumplido
        this.add.text(width / 2, height / 4 + 60, 'Has reunido suficientes reliquias y escapado de la mazmorra.', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(100);

        // Estadísticas finales
        this.add.text(width / 2, height / 2 - 20, `Reliquias totales: ${this.finalRelics}`, {
            fontSize: '32px',
            fill: '#ffff00'
        }).setOrigin(0.5).setDepth(100);

        this.add.text(width / 2, height / 2 + 20, `Puntuación final: ${this.finalScore}`, {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(100);

        // Botón volver a jugar (inicia una partida nueva con todo resetado)
        const btnRestart = this.add.text(width / 2, height * 0.75, 'JUGAR NUEVAMENTE', {
            fontSize: '32px',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });

        btnRestart.on('pointerdown', () => {
            this.scene.start('Game');
        });

        // Instrucción adicional
        this.add.text(width / 2, height * 0.88, 'Presiona el botón para comenzar una nueva partida.', {
            fontSize: '16px',
            fill: '#aaaaaa'
        }).setOrigin(0.5).setDepth(100);
    }
}
