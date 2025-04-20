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
            debug: true  // Activamos el debug
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let playerClothes = 'red'; // 'red' o 'black'
let debugText;
let walls;
let camera;

// Configuración del mapa
const TILE_SIZE = 32;
const MAP_WIDTH = 50;  // Hacemos el mapa más grande
const MAP_HEIGHT = 50; // Hacemos el mapa más grande

function preload() {
    // Cargar assets básicos
    this.load.image('wall', 'assets/images/wall.png');  // Tile para paredes
    this.load.image('floor', 'assets/images/floor.png'); // Tile para piso
    
    // Cargar el sprite sheet
    this.load.spritesheet('player', 'assets/images/player.png', {
        frameWidth: 98,    // Ancho de cada frame
        frameHeight: 102,   // Alto de cada frame
        spacing: 0
    });
}

function create() {
    // Configurar el tamaño del mundo
    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    // Crear piso
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            this.add.image(x * TILE_SIZE, y * TILE_SIZE, 'floor');
        }
    }

    // Crear grupo de paredes con física
    walls = this.physics.add.staticGroup();

    // Crear paredes del borde
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
                walls.create(x * TILE_SIZE, y * TILE_SIZE, 'wall');
            }
        }
    }

    // Crear grupos de paredes con más espacio entre ellos
    for (let i = 0; i < 8; i++) {  // Reducimos el número de grupos
        // Elegir un punto central para el grupo
        const centerX = Phaser.Math.Between(5, MAP_WIDTH - 6);
        const centerY = Phaser.Math.Between(5, MAP_HEIGHT - 6);
        
        // Crear un grupo de paredes
        for (let j = 0; j < 4; j++) {  // 4 paredes por grupo
            const offsetX = Phaser.Math.Between(-2, 2);
            const offsetY = Phaser.Math.Between(-2, 2);
            const wallX = centerX + offsetX;
            const wallY = centerY + offsetY;
            
            // Verificar que no haya paredes cercanas
            let canPlace = true;
            walls.getChildren().forEach(wall => {
                const dx = Math.abs(wall.x / TILE_SIZE - wallX);
                const dy = Math.abs(wall.y / TILE_SIZE - wallY);
                if (dx < 4 && dy < 4) {  // Aumentamos la distancia mínima entre paredes
                    canPlace = false;
                }
            });
            
            if (canPlace) {
                walls.create(wallX * TILE_SIZE, wallY * TILE_SIZE, 'wall');
            }
        }
    }

    // Crear jugador en el centro del mapa
    const centerX = MAP_WIDTH * TILE_SIZE / 2;
    const centerY = MAP_HEIGHT * TILE_SIZE / 2;
    player = this.physics.add.sprite(centerX, centerY, 'player');
    player.setCollideWorldBounds(true);
    player.setScale(0.5);
    
    // Ajustar el hitbox del jugador para que sea más pequeño
    player.body.setSize(32, 32); // Tamaño del hitbox
    player.body.setOffset(33, 50); // Ajustar la posición del hitbox dentro del sprite

    // Configurar la cámara
    camera = this.cameras.main;
    camera.startFollow(player);
    camera.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    camera.setZoom(1.0);

    // Agregar colisión entre jugador y paredes
    this.physics.add.collider(player, walls);

    // Texto para debug (fijado a la cámara)
    debugText = this.add.text(16, 16, '', { 
        font: '16px Arial', 
        fill: '#ffffff',
        backgroundColor: '#000000'
    });
    debugText.setScrollFactor(0);

    // Configurar controles
    cursors = this.input.keyboard.createCursorKeys();

    // Animaciones
    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 0,    // Primera fila - mirando abajo
            end: 5
        }),
        frameRate: 8,
        repeat: -1
    });

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 6,    // Tercera fila - mirando al lado
            end: 11
        }),
        frameRate: 8,
        repeat: -1
    });

    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 18,   // Segunda fila - mirando arriba
            end: 23
        }),
        frameRate: 8,
        repeat: -1
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 12,   // Cuarta fila
            end: 17
        }),
        frameRate: 8,
        repeat: -1
    });

    // Animación idle
    this.anims.create({
        key: 'idle',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1
    });

    // Tecla para cambiar de ropa
    this.input.keyboard.on('keydown-C', function() {
        playerClothes = playerClothes === 'red' ? 'black' : 'red';
    });
}

function update() {
    const speed = 160;
    player.setVelocity(0);

    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
        player.anims.play('left', true);
        player.setFlipX(false);
    } else if (cursors.right.isDown) {
        player.setVelocityX(speed);
        player.anims.play('right', true);
        player.setFlipX(false);
    } else if (cursors.up.isDown) {
        player.setVelocityY(-speed);
        player.anims.play('up', true);
        player.setFlipX(false);
    } else if (cursors.down.isDown) {
        player.setVelocityY(speed);
        player.anims.play('down', true);
        player.setFlipX(false);
    } else {
        player.anims.play('idle', true);
        player.setFlipX(false);
    }

    // Actualizar texto de debug
    debugText.setText([
        `Player X: ${Math.floor(player.x)}`,
        `Player Y: ${Math.floor(player.y)}`,
        `Camera X: ${Math.floor(camera.scrollX)}`,
        `Camera Y: ${Math.floor(camera.scrollY)}`,
        `World Width: ${MAP_WIDTH * TILE_SIZE}`,
        `World Height: ${MAP_HEIGHT * TILE_SIZE}`
    ]);
}

// Función para crear la estructura de la ciudad
function createCity(scene) {
    // Crear calles principales horizontales
    for (let y = 10; y < MAP_HEIGHT; y += 10) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (x % 3 !== 1) { // Dejar espacios para pasar
                walls.create(x * TILE_SIZE, y * TILE_SIZE, 'wall');
            }
        }
    }

    // Crear calles principales verticales
    for (let x = 10; x < MAP_WIDTH; x += 10) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            if (y % 3 !== 1) { // Dejar espacios para pasar
                walls.create(x * TILE_SIZE, y * TILE_SIZE, 'wall');
            }
        }
    }

    // Crear edificios en los cuadrantes
    for (let blockY = 0; blockY < MAP_HEIGHT; blockY += 10) {
        for (let blockX = 0; blockX < MAP_WIDTH; blockX += 10) {
            createBuilding(blockX + 2, blockY + 2, 6, 6);
        }
    }
}

// Función para crear un edificio individual
function createBuilding(startX, startY, width, height) {
    // Crear paredes del edificio con entradas
    for (let y = startY; y < startY + height; y++) {
        for (let x = startX; x < startX + width; x++) {
            // Crear entrada en el edificio
            if (x === startX + Math.floor(width/2) && y === startY) {
                continue; // Dejar un espacio para la entrada
            }
            walls.create(x * TILE_SIZE, y * TILE_SIZE, 'wall');
        }
    }
} 
