/**
 * Generador procedural de niveles para Dungeon Run.
 *
 * Crea una cuadrícula lógica de habitaciones (4 columnas × 2 filas por defecto),
 * asigna plantillas de RoomTemplates, calcula posiciones absolutas y determina
 * conexiones físicas (puertas) entre habitaciones vecinas mediante DFS, garantizando
 * que todas las habitaciones sean accesibles desde la inicial.
 */

import RoomTemplates from './RoomTemplates.js';

export const TOTAL_RELICS = 6;

// Grosor de la pared perimetral dibujada en Game.js, en píxeles.
export const WALL_THICKNESS = 32;

// Radios/tamaños de los cuerpos usados en Game.js (mitad del tamaño del sprite).
export const SPAWN_RADII = {
  player: 16, // 32x32
  enemy: 14, // 28x28
  relic: 12, // radio 12
  exit: 24, // 48x48
  patrol: 14 // extremo de patrulla, mismo cuerpo que el enemigo
};

// Distancia mínima aceptable entre el jugador y cualquier enemigo al generar.
export const SAFE_PLAYER_DISTANCE = 180;

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

/**
 * Devuelve true si un cuerpo de radio `r` centrado en (x, y) dentro de una
 * habitación de `width × height` no intersectada con ninguna pared.
 *
 * Considera:
 *  - la pared perimetral de grosor `WALL_THICKNESS` (Game.js 32px)
 *  - cada pared interna, expandida por el radio del cuerpo
 *
 * La habitación usa el origen (0, 0) en su esquina superior-izquierda y las
 * paredes internas se definen por su esquina superior-izquierda y su tamaño,
 * igual que en RoomTemplates. Game.js debe dibujar el centro real de cada
 * pared interna (`x + w/2`, `y + h/2`) para que coincida con esta validación.
 */
export function isSpawnSafe(x, y, room, radius, wallThickness = WALL_THICKNESS) {
  // Fuera del área jugable (dentro de la pared perimetral, expandida por el radio).
  if (
    x - radius < wallThickness ||
    y - radius < wallThickness ||
    x + radius > room.width - wallThickness ||
    y + radius > room.height - wallThickness
  ) {
    return false;
  }

  // Dentro (o tocando, por expansión) de alguna pared interna.
  return !room.internalWalls.some((w) =>
    x + radius > w.x && x - radius < w.x + w.w &&
    y + radius > w.y && y - radius < w.y + w.h
  );
}

/**
 * Busca la primera posición libre cercana a (x, y) recorriendo un patrón de
 * anillos (spiral) dentro de la habitación. Devuelve null si no se encuentra.
 */
export function findNearestSafePosition(preferred, room, radius, step = 20) {
  if (isSpawnSafe(preferred.x, preferred.y, room, radius)) {
    return { ...preferred };
  }
  const maxRadius = Math.max(room.width, room.height);
  for (let ring = step; ring <= maxRadius; ring += step) {
    for (let dx = -ring; dx <= ring; dx += step) {
      for (let dy = -ring; dy <= ring; dy += step) {
        // Solo el borde exterior de cada anillo, para no repetir posiciones.
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const candidate = { x: preferred.x + dx, y: preferred.y + dy };
        if (isSpawnSafe(candidate.x, candidate.y, room, radius)) {
          return candidate;
        }
      }
    }
  }
  return null;
}

/**
 * Valida un extremo de patrulla: si está bloqueado, lo recorta hacia el inicio
 * hasta el último punto seguro (revisando paso a paso cada `step` píxeles).
 * Siempre devuelve un punto seguro (al menos el inicio, que ya fue validado).
 */
export function clampPatrolEnd(start, end, room, radius, step = 10) {
  if (isSpawnSafe(end.x, end.y, room, radius)) {
    return { ...end };
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { ...start };
  const ux = dx / length;
  const uy = dy / length;
  let lastSafe = { ...start };
  for (let d = step; d <= length; d += step) {
    const candidate = { x: start.x + ux * d, y: start.y + uy * d };
    if (!isSpawnSafe(candidate.x, candidate.y, room, radius)) break;
    lastSafe = candidate;
  }
  return lastSafe;
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
          patrolLength: 120,
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
        if (isSpawnSafe(pos.x, pos.y, room, SPAWN_RADII.relic)) {
          allRelicCandidates.push({
            roomIndex: room.index,
            x: room.absX + pos.x,
            y: room.absY + pos.y,
            local: { ...pos }
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

    // 6. Validar playerStart: si está bloqueado, buscar la posición libre más cercana.
    rooms.forEach((room) => {
      const preferred = room.playerStart || { x: room.width / 2, y: room.height / 2 };
      if (!isSpawnSafe(preferred.x, preferred.y, room, SPAWN_RADII.player)) {
        const alternative = findNearestSafePosition(preferred, room, SPAWN_RADII.player);
        if (alternative) room.playerStart = alternative;
      }
    });

    // 7. Validar posiciones de enemigos: ninguna dentro de una pared.
    // En la habitación inicial NO spawnea ningún enemigo: así el juego
    // arranca sin un enemigo pegado al jugador. La reubicación se hace
    // siempre en la habitación del enemigo; nunca se mueve al jugador.
    const startRoom = rooms[0];
    rooms.forEach((room) => {
      if (room.index === startRoom.index) {
        room.enemyPositions = [];
        return;
      }
      const validEnemies = [];
      room.enemyPositions.forEach((pos) => {
        let candidate = { ...pos };
        if (!isSpawnSafe(candidate.x, candidate.y, room, SPAWN_RADII.enemy)) {
          candidate = findNearestSafePosition(candidate, room, SPAWN_RADII.enemy);
          if (!candidate) return; // sin espacio libre en esta habitación: se elimina el enemigo
        }
        validEnemies.push(candidate);
      });
      room.enemyPositions = validEnemies;
    });

    // 8. Validar extremo de patrulla de cada enemigo (no debe cruzar paredes ni salir de la habitación).
    rooms.forEach((room) => {
      room.enemyPatrols = room.enemyPositions.map((start) => {
        const preferredEnd = { x: start.x + (room.patrolLength || 120), y: start.y };
        const end = clampPatrolEnd(start, preferredEnd, room, SPAWN_RADII.patrol);
        return { start: { ...start }, end };
      });
    });

    // 9. Validar posición de la salida de TODAS las habitaciones, no solo de la elegida.
    rooms.forEach((room) => {
      if (!room.exitPosition) return;
      if (!isSpawnSafe(room.exitPosition.x, room.exitPosition.y, room, SPAWN_RADII.exit)) {
        const alternative = findNearestSafePosition(room.exitPosition, room, SPAWN_RADII.exit);
        if (alternative) room.exitPosition = alternative;
      }
    });

    // 10. Dimensiones totales del mundo
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
