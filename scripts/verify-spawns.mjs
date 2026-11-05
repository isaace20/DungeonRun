/**
 * Verificación de spawns para Dungeon Run.
 *
 * Genera N niveles con muchas semillas (aleatorias) y confirma que ningún
 * spawn (reliquia, salida, enemigo, jugador, extremo de patrulla) quede
 * dentro de una pared interna expandida por su radio ni dentro de la
 * pared perimetral. También verifica la distancia segura jugador-enemigo.
 *
 * Ejecutar desde la raíz del proyecto: node scripts/verify-spawns.mjs
 */
import LevelGenerator, {
  isSpawnSafe,
  SPAWN_RADII,
  SAFE_PLAYER_DISTANCE,
  WALL_THICKNESS,
  TOTAL_RELICS
} from '../src/game/levels/LevelGenerator.js';

const ITERATIONS = 500;
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

for (let iter = 0; iter < ITERATIONS; iter++) {
  const generator = new LevelGenerator({
    cols: 4,
    rows: 2,
    cellWidth: 500,
    cellHeight: 400,
    gap: 40
  });
  const data = generator.generate();
  const { rooms, exitRoomIndex, startRoomIndex, selectedRelics } = data;
  const tag = `iter ${iter}`;

  // Reliquias: exactamente 6 y todas seguras.
  check(selectedRelics.length === TOTAL_RELICS, `${tag}: reliquias ${selectedRelics.length} !== ${TOTAL_RELICS}`);
  selectedRelics.forEach((relic, i) => {
    const room = rooms[relic.roomIndex];
    const localX = relic.x - room.absX;
    const localY = relic.y - room.absY;
    check(
      isSpawnSafe(localX, localY, room, SPAWN_RADII.relic, WALL_THICKNESS),
      `${tag}: reliquia ${i} en ${room.id} (${localX},${localY}) dentro de pared o de la pared perimetral`
    );
  });

  // Salida: segura en la habitación elegida.
  const exitRoom = rooms[exitRoomIndex];
  check(
    isSpawnSafe(exitRoom.exitPosition.x, exitRoom.exitPosition.y, exitRoom, SPAWN_RADII.exit, WALL_THICKNESS),
    `${tag}: salida en ${exitRoom.id} (${exitRoom.exitPosition.x},${exitRoom.exitPosition.y}) dentro de pared`
  );

  // Jugador, enemigos y patrullas en todas las habitaciones.
  const startRoom = rooms[startRoomIndex];
  rooms.forEach((room) => {
    check(
      isSpawnSafe(room.playerStart.x, room.playerStart.y, room, SPAWN_RADII.player, WALL_THICKNESS),
      `${tag}: playerStart en ${room.id} (${room.playerStart.x},${room.playerStart.y}) dentro de pared`
    );
    room.enemyPositions.forEach((enemy, i) => {
      check(
        isSpawnSafe(enemy.x, enemy.y, room, SPAWN_RADII.enemy, WALL_THICKNESS),
        `${tag}: enemigo ${i} en ${room.id} (${enemy.x},${enemy.y}) dentro de pared`
      );
      if (room.index === startRoom.index) {
        const dist = Math.hypot(enemy.x - startRoom.playerStart.x, enemy.y - startRoom.playerStart.y);
        check(dist >= SAFE_PLAYER_DISTANCE, `${tag}: enemigo ${i} a ${dist.toFixed(1)}px del jugador en la habitación inicial (mínimo ${SAFE_PLAYER_DISTANCE})`);
      }
    });
    (room.enemyPatrols || []).forEach((patrol, i) => {
      check(
        isSpawnSafe(patrol.end.x, patrol.end.y, room, SPAWN_RADII.patrol, WALL_THICKNESS),
        `${tag}: patrulla ${i} end en ${room.id} (${patrol.end.x},${patrol.end.y}) dentro de pared`
      );
    });
  });

  if (failures.length > 20) break;
}

if (failures.length) {
  console.error(`FALLÓ — ${failures.length} problema(s) en ${ITERATIONS} niveles:`);
  failures.slice(0, 20).forEach((f) => console.error(' -', f));
  process.exit(1);
}

console.log(`OK — ${ITERATIONS} niveles verificados: ningún spawn dentro de pared, distancia segura jugador-enemigo cumplida.`);

/**
 * Verificación de plantillas: cada posición definida en RoomTemplates debe ser
 * segura tal cual (sin depender de la reubicación en runtime).
 */
import RoomTemplates from '../src/game/levels/RoomTemplates.js';

const templateFailures = [];
Object.entries(RoomTemplates).forEach(([category, templates]) => {
  templates.forEach((template) => {
    const room = {
      width: template.width,
      height: template.height,
      internalWalls: template.internalWalls
    };
    const checkPos = (pos, radius, label) => {
      if (!isSpawnSafe(pos.x, pos.y, room, radius, WALL_THICKNESS)) {
        templateFailures.push(`${category}/${template.id}: ${label} (${pos.x},${pos.y}) dentro de pared`);
      }
    };
    template.relicPositions.forEach((pos) => checkPos(pos, SPAWN_RADII.relic, 'relic'));
    template.enemyPositions.forEach((pos) => checkPos(pos, SPAWN_RADII.enemy, 'enemy'));
    if (template.playerStart) checkPos(template.playerStart, SPAWN_RADII.player, 'playerStart');
    if (template.exitPosition) checkPos(template.exitPosition, SPAWN_RADII.exit, 'exit');
  });
});

if (templateFailures.length) {
  console.error(`FALLÓ plantillas — ${templateFailures.length} problema(s):`);
  templateFailures.forEach((f) => console.error(' -', f));
  process.exit(1);
}

console.log('OK — todas las plantillas tienen sus posiciones fuera de paredes (según tamaño de cada objeto).');
