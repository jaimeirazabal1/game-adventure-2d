# RPG Game con Phaser.js

Este es un juego RPG 2D desarrollado con Phaser.js, un framework de juegos HTML5. El juego presenta un personaje que puede moverse en un mundo con paredes y obstáculos, con una cámara que sigue al jugador.

## Características Principales

- Personaje animado con movimiento en 4 direcciones
- Mundo grande con generación procedural de obstáculos
- Sistema de colisiones
- Cámara que sigue al jugador
- Modo debug para visualizar hitboxes y posiciones

## Estructura del Proyecto

```
rpg_game/
├── src/
│   └── game.js       # Código principal del juego
├── assets/
│   └── images/
│       ├── player.png    # Sprite sheet del jugador
│       ├── wall.png      # Textura de las paredes
│       └── floor.png     # Textura del suelo
└── index.html        # Archivo HTML principal
```

## Explicación Detallada del Código

### Configuración Inicial (game.js)

```javascript
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};
```

Esta configuración establece:
- Dimensiones de la ventana del juego (800x600)
- Modo píxel art para mejor renderizado de sprites
- Sistema de física arcade sin gravedad
- Modo debug activado para ver hitboxes

### Constantes y Variables Globales

```javascript
const TILE_SIZE = 32;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 50;

let player;
let cursors;
let debugText;
let walls;
let camera;
```

- `TILE_SIZE`: Tamaño de cada tile (32x32 píxeles)
- `MAP_WIDTH/HEIGHT`: Dimensiones del mapa (50x50 tiles)
- Variables para almacenar objetos importantes del juego

### Carga de Recursos (función preload)

```javascript
function preload() {
    this.load.image('wall', 'assets/images/wall.png');
    this.load.image('floor', 'assets/images/floor.png');
    this.load.spritesheet('player', 'assets/images/player.png', {
        frameWidth: 98,
        frameHeight: 102
    });
}
```

Carga todos los recursos necesarios:
- Texturas para paredes y suelo
- Sprite sheet del jugador con dimensiones específicas

### Creación del Mundo (función create)

El mundo se genera con varios componentes:

1. **Suelo Base**:
```javascript
for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
        this.add.image(x * TILE_SIZE, y * TILE_SIZE, 'floor');
    }
}
```

2. **Generación de Paredes**:
```javascript
// Paredes del borde
for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
        if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
            walls.create(x * TILE_SIZE, y * TILE_SIZE, 'wall');
        }
    }
}

// Grupos de paredes interiores
for (let i = 0; i < 8; i++) {
    // Código para generar grupos de paredes con espacios
}
```

3. **Configuración del Jugador**:
```javascript
player = this.physics.add.sprite(centerX, centerY, 'player');
player.setCollideWorldBounds(true);
player.setScale(0.5);
```

### Animaciones del Jugador

Se han configurado 4 animaciones principales:
- `down`: Frames 0-5 (caminando hacia abajo)
- `left`: Frames 6-11 (caminando hacia la izquierda)
- `right`: Frames 12-17 (caminando hacia la derecha)
- `up`: Frames 18-23 (caminando hacia arriba)

### Sistema de Movimiento (función update)

```javascript
function update() {
    const speed = 160;
    player.setVelocity(0);

    // Control de movimiento con las flechas del teclado
    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
        player.anims.play('left', true);
    }
    // ... código similar para otras direcciones
}
```

## Características Técnicas

1. **Sistema de Física**:
   - Colisiones entre jugador y paredes
   - Hitbox ajustado para el jugador
   - Velocidad de movimiento constante

2. **Sistema de Cámara**:
   - Sigue al jugador suavemente
   - Límites establecidos al tamaño del mundo
   - Zoom ajustable

3. **Debug y Desarrollo**:
   - Información en pantalla sobre posición y frames
   - Visualización de hitboxes
   - Contador de FPS y estadísticas

## Próximas Mejoras Planificadas

- [ ] Sistema de inventario
- [ ] NPCs y diálogos
- [ ] Sistema de misiones
- [ ] Más variedad de tiles y decoraciones
- [ ] Efectos de sonido y música

## Cómo Ejecutar el Juego

1. Asegúrate de tener todos los archivos en la estructura correcta
2. Abre el archivo index.html en un servidor web local
3. El juego debería cargar automáticamente

## Controles

- Flechas de dirección: Mover al personaje
- La cámara seguirá automáticamente al jugador

## Notas de Desarrollo

- El tamaño del mapa es de 1600x1600 píxeles (50x50 tiles)
- Cada tile mide 32x32 píxeles
- El hitbox del jugador está ajustado para permitir movimiento fluido
- Los grupos de paredes se generan con espacios amplios para facilitar el movimiento 