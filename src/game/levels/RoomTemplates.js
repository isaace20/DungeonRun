/**
 * Plantillas de habitaciones para Dungeon Run.
 * Todas las posiciones (x, y, w, h) son RELATIVAS a la esquina superior
 * izquierda de la habitación (0, 0).
 *
 * Categorías:
 *  - small: 240 × 180
 *  - medium: 360 × 270
 *  - large: 480 × 360
 *
 * Cada plantilla define:
 *  - id: identificador único
 *  - width, height: dimensiones de la habitación
 *  - internalWalls: paredes y obstáculos dentro de la habitación
 *  - doors: bordes que tienen abertura hacia una habitación vecina
 *           ('top', 'right', 'bottom', 'left')
 *  - relicPositions: posiciones alcanzables para las reliquias (NO dentro de paredes)
 *  - exitPosition: posición de la salida si esta habitación la contiene
 *  - enemyPositions: posiciones iniciales de enemigos (NO dentro de paredes ni sobre el jugador)
 *  - playerStart: posición inicial del jugador (solo usa la del inicio)
 */

const RoomTemplates = {
  small: [
    {
      id: 'small-a',
      width: 240,
      height: 180,
      internalWalls: [],
      doors: ['right'],
      relicPositions: [
        { x: 60, y: 60 },
        { x: 180, y: 120 }
      ],
      exitPosition: { x: 220, y: 90 },
      enemyPositions: [
        { x: 200, y: 150 }
      ],
      playerStart: { x: 120, y: 90 }
    },
    {
      id: 'small-b',
      width: 240,
      height: 180,
      internalWalls: [
        { x: 100, y: 80, w: 40, h: 40 }
      ],
      doors: ['right', 'bottom'],
      relicPositions: [
        { x: 40, y: 140 },
        { x: 200, y: 40 }
      ],
      exitPosition: { x: 200, y: 160 },
      enemyPositions: [
        { x: 120, y: 40 }
      ],
      playerStart: { x: 120, y: 140 }
    }
  ],

  medium: [
    {
      id: 'medium-a',
      width: 360,
      height: 270,
      internalWalls: [
        { x: 160, y: 120, w: 60, h: 60 },
        { x: 240, y: 180, w: 40, h: 40 }
      ],
      doors: ['left', 'right', 'bottom'],
      relicPositions: [
        { x: 80, y: 80 },
        { x: 280, y: 60 },
        { x: 300, y: 200 }
      ],
      exitPosition: { x: 340, y: 135 },
      enemyPositions: [
        { x: 100, y: 200 },
        { x: 320, y: 100 }
      ],
      playerStart: { x: 80, y: 135 }
    },
    {
      id: 'medium-b',
      width: 360,
      height: 270,
      internalWalls: [
        { x: 60, y: 60, w: 80, h: 80 },
        { x: 220, y: 130, w: 80, h: 80 }
      ],
      doors: ['top', 'right'],
      relicPositions: [
        { x: 180, y: 60 },
        { x: 300, y: 60 },
        { x: 60, y: 200 }
      ],
      exitPosition: { x: 180, y: 250 },
      enemyPositions: [
        { x: 300, y: 60 },
        { x: 60, y: 200 }
      ],
      playerStart: { x: 180, y: 200 }
    }
  ],

  large: [
    {
      id: 'large-a',
      width: 480,
      height: 360,
      internalWalls: [
        { x: 200, y: 140, w: 80, h: 80 },
        { x: 320, y: 220, w: 60, h: 60 },
        { x: 100, y: 260, w: 60, h: 60 }
      ],
      doors: ['left', 'right', 'top', 'bottom'],
      relicPositions: [
        { x: 100, y: 100 },
        { x: 380, y: 80 },
        { x: 400, y: 280 },
        { x: 300, y: 300 },
        { x: 150, y: 300 }
      ],
      exitPosition: { x: 460, y: 180 },
      enemyPositions: [
        { x: 100, y: 100 },
        { x: 380, y: 100 },
        { x: 400, y: 300 }
      ],
      playerStart: { x: 240, y: 300 }
    },
    {
      id: 'large-b',
      width: 480,
      height: 360,
      internalWalls: [
        { x: 120, y: 100, w: 100, h: 100 },
        { x: 260, y: 200, w: 100, h: 100 }
      ],
      doors: ['top', 'bottom'],
      relicPositions: [
        { x: 60, y: 60 },
        { x: 420, y: 60 },
        { x: 60, y: 300 },
        { x: 420, y: 300 },
        { x: 240, y: 180 }
      ],
      exitPosition: { x: 240, y: 340 },
      enemyPositions: [
        { x: 100, y: 300 },
        { x: 380, y: 300 },
        { x: 240, y: 60 }
      ],
      playerStart: { x: 240, y: 60 }
    }
  ]
};

export default RoomTemplates;
