/**
 * Generador procedural de niveles para Dungeon Run.
 *
 * Crea una cuadrícula lógica de habitaciones (4 columnas × 2 filas por defecto),
 * asigna plantillas de RoomTemplates, calcula posiciones absolutas y determina
 * conexiones físicas (puertas) entre habitaciones vecinas mediante DFS, garantizando
 * que todas las habitaciones sean accesibles desde la inicial.
 */

import RoomTemplates from './RoomTemplates.js';

const TOTAL_RELICS = 6;

/**
 * Verifica si un punto (px, py) está dentro de un rectángulo (rx, ry, rw, rh)
 * con un pequeño margen de seguridad.
 */
function pointInRect(px, py, rx, ry, rw, rh, margin = 4) {
  return px > rx + margin && px < rx + rw - margin && py > ry + margin && py < ry + rh - margin;
}

/**
 * Verifica si una posición está dentro de alguna pared interna.
 */
function isPositionBlocked(x, y, internalWalls, margin = 4) {
  return internalWalls.some((w) => pointInRect(x, y, w.x, w.y, w.w, w.h, margin));
}

class LevelGenerator {
  constructor({
    cols = 4,
    rows = 2,
    cellWidth = 500,
    cellHeight = 400,
    gap = 40
  } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.gap = gap;
  }

  generate() {
    const totalCells = this.cols * this.rows;
    const categories = ['small', 'medium', 'large'];

    // 1. Asignar plantillas a cada celda (rotar categorías para variedad de tamaños)
    const cellTemplates = [];
    for (let i = 0; i < totalCells; i++) {
      const category = categories[i % categories.length];
      const templates = RoomTemplates[category];
      const template = templates[Math.floor(Math.random() * templates.length)];
      cellTemplates.push(template);
    }

    // 2. Calcular posiciones absolutas y construir objetos de habitación
    const rooms = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const index = row * this.cols + col;
        const template = cellTemplates[index];
        const absX = col * (this.cellWidth + this.gap);
        const absY = row * (this.cellHeight + this.gap);

        rooms.push({
          id: template.id || `room-${index}`,
          index,
          col,
          row,
          absX,
          absY,
          template,
          width: template.width,
          height: template.height,
          doors: new Set(), // bordes con abertura física hacia vecinos
          connections: [], // índices de habitaciones conectadas
          internalWalls: template.internalWalls.map(w => ({ ...w })),
          relicPositions: template.relicPositions.map(r => ({ ...r })),
          exitPosition: template.exitPosition ? { ...template.exitPosition } : null,
          enemyPositions: template.enemyPositions.map(e => ({ ...e })),
          playerStart: template.playerStart ? { ...template.playerStart } : null
        });
      }
    }

    // 3. DFS para crear conexiones válidas entre habitaciones vecinas
    const visited = new Set();
    const connections = [];

    const getNeighbors = (index) => {
      const room = rooms[index];
      const neighbors = [];
      if (room.row > 0) {
        neighbors.push({ index: index - this.cols, edge: 'top', otherEdge: 'bottom' });
      }
      if (room.row < this.rows - 1) {
        neighbors.push({ index: index + this.cols, edge: 'bottom', otherEdge: 'top' });
      }
      if (room.col > 0) {
        neighbors.push({ index: index - 1, edge: 'left', otherEdge: 'right' });
      }
      if (room.col < this.cols - 1) {
        neighbors.push({ index: index + 1, edge: 'right', otherEdge: 'left' });
      }
      return neighbors;
    };

    const dfs = (currentIndex) => {
      visited.add(currentIndex);
      const neighbors = getNeighbors(currentIndex);
      neighbors.sort(() => Math.random() - 0.5);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.index)) {
          rooms[currentIndex].doors.add(neighbor.edge);
          rooms[currentIndex].connections.push(neighbor.index);
          rooms[neighbor.index].doors.add(neighbor.otherEdge);
          rooms[neighbor.index].connections.push(currentIndex);
          connections.push([currentIndex, neighbor.index]);
          dfs(neighbor.index);
        }
      }
    };

    dfs(0);

    // 4. Elegir salida aleatoria en una habitación distinta de la inicial
    const exitRoomIndex = Math.floor(Math.random() * (totalCells - 1)) + 1;

    // 5. Seleccionar exactamente 6 reliquias en total, evitando posiciones bloqueadas
    const allRelicCandidates = [];
    rooms.forEach((room) => {
      room.relicPositions.forEach((pos) => {
        const blocked = isPositionBlocked(pos.x, pos.y, room.internalWalls);
        if (!blocked) {
          allRelicCandidates.push({
            roomIndex: room.index,
            x: room.absX + pos.x,
            y: room.absY + pos.y
          });
        }
      });
    });

    // Mezclar candidatos para variabilidad
    allRelicCandidates.sort(() => Math.random() - 0.5);

    // Seleccionar hasta TOTAL_RELICS, priorizando habitaciones diferentes
    const selectedRelics = [];
    const usedRooms = new Set();
    // Primera pasada: una reliquia por habitación si es posible
    for (const candidate of allRelicCandidates) {
      if (selectedRelics.length >= TOTAL_RELICS) break;
      if (!usedRooms.has(candidate.roomIndex)) {
        selectedRelics.push(candidate);
        usedRooms.add(candidate.roomIndex);
      }
    }
    // Segunda pasada: completar con el resto si hace falta
    for (const candidate of allRelicCandidates) {
      if (selectedRelics.length >= TOTAL_RELICS) break;
      if (!selectedRelics.some((r) => r.x === candidate.x && r.y === candidate.y)) {
        selectedRelics.push(candidate);
      }
    }

    // 6. Validar y limpiar posiciones de enemigos (eliminar las que estén bloqueadas o sobre el jugador)
    rooms.forEach((room) => {
      const validEnemies = [];
      room.enemyPositions.forEach((pos) => {
        const blocked = isPositionBlocked(pos.x, pos.y, room.internalWalls);
        const onPlayer = room.playerStart &&
          Math.abs(pos.x - room.playerStart.x) < 20 &&
          Math.abs(pos.y - room.playerStart.y) < 20;
        if (!blocked && !onPlayer) {
          validEnemies.push({ ...pos });
        }
      });
      room.enemyPositions = validEnemies;
    });

    // 7. Validar playerStart no esté bloqueado
    rooms.forEach((room) => {
      if (room.playerStart && isPositionBlocked(room.playerStart.x, room.playerStart.y, room.internalWalls)) {
        room.playerStart = { x: room.width / 2, y: room.height / 2 };
      }
    });

    // 8. Dimensiones totales del mundo
    const maxAbsX = Math.max(...rooms.map(r => r.absX + r.width));
    const maxAbsY = Math.max(...rooms.map(r => r.absY + r.height));

    return {
      rooms,
      connections,
      exitRoomIndex,
      startRoomIndex: 0,
      worldWidth: maxAbsX + this.gap,
      worldHeight: maxAbsY + this.gap,
      cols: this.cols,
      rows: this.rows,
      selectedRelics // reliquias validadas, exactamente TOTAL_RELICS o menos si no hay suficientes candidatas
    };
  }
}

export default LevelGenerator;
