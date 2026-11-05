import { Scene } from 'phaser';
import { getLanguageConfig, getTranslations } from '../../services/translations';

export class Preload extends Scene
{
    constructor ()
    {
        super('Preload');
    }

    create ()
    {
        const language = getLanguageConfig();

        // Cargar las traducciones antes de crear cualquier texto visible.
        getTranslations(language, () => {
            this.scene.start('Menu', { language });
        });
    }
}
