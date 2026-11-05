# AGENTES.md

## Forma de trabajo (regla permanente)

1. Antes de implementar cualquier cambio, presentar primero un **plan resumido** de lo que se va a hacer.
2. **Esperar el OK del usuario** antes de tocar código.
3. Solo después de la aprobación, implementar, verificar y reportar el resultado.

---

## Plan completado: errores de spawn en Dungeon Run

**Problemas reportados**
- Al empezar el juego hay un enemigo justo enfrente / pegado al jugador.
- Hay objetos (reliquias/salida) que aparecen dentro de bloques/paredes por donde el personaje no puede pasar.

**Causas detectadas en el código**
- `src/game/scenes/Game.js`: las paredes internas se dibujan con `add.rectangle(ax + def.x, ay + def.y, ...)`, que en Phaser centra el rectángulo, mientras `LevelGenerator.isPositionBlocked` valida asumiendo `(x, y)` como esquina superior-izquierda. Lo validado como "libre" puede quedar dentro de la pared real dibujada.
- `LevelGenerator.js`: la validación es solo por punto (`margin = 4`), sin tener en cuenta el radio/tamaño del cuerpo (reliquia 24px, jugador 32px, enemigo 28px, salida 48px), ni el grosor de la pared perimetral (32px) de `Game.js`.
- `RoomTemplates.js`: varias `exitPosition` están pegadas al borde (ej. `x: 460` en habitación de 480, `x: 220` en una de 240, `y: 340` en una de 360), o sea dentro de la pared perimetral. La salida no se valida en absoluto en el generador.
- Enemigos: el filtro `onPlayer` solo descarta si están a menos de 20px en ambos ejes y no se excluyen enemigos de la habitación inicial; como parche en `Game.js` se mueve al jugador `+70, +70` de forma arbitraria (puede meterlo en una pared). Además `patrolEnd = start.x + 120` no se valida contra paredes ni bordes.

**Cambios implementados**
1. **Unificar coordenadas de paredes internas:** `Game.js` dibuja el centro real (`ax + def.x + def.w/2`, `ay + def.y + def.h/2`) para que coincida con la validación del generador.
2. **Validación por área, no por punto:** `isSpawnSafe(x, y, room, radio)` en `LevelGenerator.js` expande cada pared interna por el radio del objeto y respeta la pared perimetral (`WALL_THICKNESS = 32`, compartido con `Game.js`). Se aplica a reliquias, salida, enemigos, `playerStart` y extremos de patrulla.
3. **Corregir plantillas:** todas las `exitPosition`, `relicPosition`, `enemyPosition`, `playerStart` de `RoomTemplates.js` se movieron para quedar fuera de muros (verificado por script, no solo filtrado en runtime).
4. **Spawn seguro del jugador:** en la habitación inicial no spawnea ningún enemigo (la sala es pequeña y no había hueco a distancia segura), y se eliminó el desplazamiento arbitrario `+70, +70`. La regla también aplica al reaparecer tras recibir daño.
5. **Patrullas seguras:** `clampPatrolEnd` valida/recorta el extremo de patrulla para que no cruce paredes internas ni salga de la habitación; `Game.js` usa ese extremo validado (`room.enemyPatrols`).
6. **Verificación:** `scripts/verify-spawns.mjs` genera 500 niveles y confirma que ningún spawn (reliquia, salida, enemigo, jugador, patrulla) quede dentro de una pared expandida por su radio, además de validar las plantillas. `npm run build` y server dev OK.

**Nota de ejecución:** el proyecto se prueba con `npm run dev-nolog` (puerto 8080 según `vite/config.dev.mjs`), no con Live Server/`index.html` directo. Faltaba `style.css` (404): creado en `public/style.css`.
