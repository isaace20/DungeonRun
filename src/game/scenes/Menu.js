import { Scene } from 'phaser';
import { EN, ES, FR } from '../../enums/languages';
import { KEYS } from '../../enums/keys';
import { getPhrase, getTranslations } from '../../services/translations';

export class Menu extends Scene
{
    constructor ()
    {
        super('Menu');
    }

    init (data)
    {
        this.language = (data && data.language) || ES;
    }

    create ()
    {
        const width = this.game.config.width;
        const height = this.game.config.height;

        // Título (no traducible: es el nombre del juego)
        this.add.text(width / 2, height / 3, 'DUNGEON RUN', {
            fontSize: '56px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Selector de idioma
        this.languageButtons = [];
        [
            { code: ES, label: 'ES' },
            { code: EN, label: 'EN' },
            { code: FR, label: 'FR' }
        ].forEach(({ code, label }, index) => {
            const button = this.add.text(width / 2 + (index - 1) * 80, height * 0.18, label, {
                fontSize: '20px',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 12, y: 6 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            button.on('pointerdown', () => this.changeLanguage(code));
            this.languageButtons.push({ code, button });
        });

        // Botón iniciar
        this.startButton = this.add.text(width / 2, height / 2, '', {
            fontSize: '32px',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.startButton.on('pointerdown', () => {
            this.scene.start('Game', { language: this.language });
        });

        // Instrucciones
        this.instructionTexts = [
            this.add.text(width / 2, height * 0.62, '', {
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5),
            this.add.text(width / 2, height * 0.68, '', {
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5),
            this.add.text(width / 2, height * 0.74, '', {
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5),
            this.add.text(width / 2, height * 0.82, '', {
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5)
        ];

        this.refreshTexts();
        this.updateLanguageButtons();
    }

    async changeLanguage (language)
    {
        if (language === this.language) {
            return;
        }

        this.language = language;
        await getTranslations(language);

        this.refreshTexts();
        this.updateLanguageButtons();
    }

    refreshTexts ()
    {
        this.startButton.setText(getPhrase(KEYS.INICIAR_PARTIDA));
        this.instructionTexts[0].setText(getPhrase(KEYS.WASD_O_FLECHAS_MOVERSE));
        this.instructionTexts[1].setText(getPhrase(KEYS.RECOLECTA_6_RELIQUIAS_PARA_DESBLOQUEAR_LA_SALIDA));
        this.instructionTexts[2].setText(getPhrase(KEYS.EVITA_A_LOS_ENEMIGOS_ROJOS_NO_HAY_COMBATE));
        this.instructionTexts[3].setText(getPhrase(KEYS.TRES_VIDAS_POR_PARTIDA_SUPERA_ETAPAS_CON_DIFICULTAD_CRECIENTE));
    }

    updateLanguageButtons ()
    {
        this.languageButtons.forEach(({ code, button }) => {
            button.setColor(code === this.language ? '#00ff00' : '#ffffff');
        });
    }
}
