import { Scene } from 'phaser';

const STORAGE_KEY = 'dungeonRun_scores';

export class GameOver extends Scene
{
    constructor ()
    {
        super('GameOver');
    }

    init (data)
    {
        this.finalScore = data && data.score !== undefined ? data.score : 0;
    }

    create ()
    {
        const width = this.game.config.width;
        const height = this.game.config.height;

        // Guardar puntuación y obtener récords
        const bestScores = this.saveScore(this.finalScore);

        // Título
        this.add.text(width / 2, height / 5, 'FIN DE PARTIDA', {
            fontSize: '56px',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Puntuación final
        this.add.text(width / 2, height / 2 - 60, `Puntuación final: ${this.finalScore}`, {
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Récords locales
        this.add.text(width / 2, height / 2, 'Mejores resultados (local)', {
            fontSize: '24px',
            fill: '#ffff00'
        }).setOrigin(0.5);

        bestScores.forEach((score, index) => {
            this.add.text(width / 2, height / 2 + 40 + index * 30, `${index + 1}. ${score}`, {
                fontSize: '24px',
                fill: '#ffffff'
            }).setOrigin(0.5);
        });

        // Botón volver a jugar
        const btnRestart = this.add.text(width / 2, height * 0.82, 'VOLVER A JUGAR', {
            fontSize: '32px',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnRestart.on('pointerdown', () => {
            this.scene.start('Game');
        });
    }

    saveScore (score)
    {
        let scores = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        scores.push(score);
        scores.sort((a, b) => b - a);
        scores = scores.slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
        return scores;
    }
}
