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
let projectiles; // Grupo para los proyectiles
let lastFireTime = 0; // Para controlar la frecuencia de disparo
let lastDirection = 'down'; // Nueva variable para guardar la última dirección
const FIRE_DELAY = 500; // Delay entre disparos en milisegundos
const PROJECTILE_SPEED = 200; // Velocidad del proyectil
let orc; // Nueva variable para el orco
let isOrcAlive = true; // Nueva variable para rastrear si el orco está vivo
const DETECTION_RADIUS = 150; // Radio de detección del orco
const ORC_SPEED = 80; // Velocidad del orco

// Configuración del mapa
const TILE_SIZE = 32;
const MAP_WIDTH = 50;  // Hacemos el mapa más grande
const MAP_HEIGHT = 50; // Hacemos el mapa más grande

// Variables de vida
const MAX_HEALTH = 100;
let playerHealth = MAX_HEALTH;
let orcHealth = MAX_HEALTH;
let playerHealthBar;
let orcHealthBar;

function preload() {
    // Cargar assets básicos
    this.load.image('wall', 'assets/images/wall.png');  // Tile para paredes
    this.load.image('floor', 'assets/images/floor.png'); // Tile para piso
    this.load.image('projectile', 'assets/images/projectile.png'); // Necesitaremos crear esta imagen
    
    // Cargar el spritesheet de explosión
    this.load.spritesheet('explosion', 'assets/images/explosion.png', {
        frameWidth: 32,  // Ajusta esto al tamaño de cada frame en tu spritesheet
        frameHeight: 32  // Ajusta esto al tamaño de cada frame en tu spritesheet
    });
    
    // Cargar el sprite sheet
    this.load.spritesheet('player', 'assets/images/player.png', {
        frameWidth: 98,    // Ancho de cada frame
        frameHeight: 102,   // Alto de cada frame
        spacing: 0
    });

    // Cargar el sprite del orco
    this.load.spritesheet('orc', 'assets/images/orc.png', {
        frameWidth: 140,    // Ajustado al tamaño real de tu sprite
        frameHeight: 150,   // Ajustado al tamaño real de tu sprite
        spacing: 0     // Espacio entre frames si existe
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
    for (let i = 0; i < 8; i++) {
        const centerX = Phaser.Math.Between(5, MAP_WIDTH - 6);
        const centerY = Phaser.Math.Between(5, MAP_HEIGHT - 6);
        
        for (let j = 0; j < 4; j++) {
            const offsetX = Phaser.Math.Between(-2, 2);
            const offsetY = Phaser.Math.Between(-2, 2);
            const wallX = centerX + offsetX;
            const wallY = centerY + offsetY;
            
            let canPlace = true;
            walls.getChildren().forEach(wall => {
                const dx = Math.abs(wall.x / TILE_SIZE - wallX);
                const dy = Math.abs(wall.y / TILE_SIZE - wallY);
                if (dx < 4 && dy < 4) {
                    canPlace = false;
                }
            });
            
            if (canPlace) {
                walls.create(wallX * TILE_SIZE, wallY * TILE_SIZE, 'wall');
            }
        }
    }

    // Crear grupo de proyectiles
    projectiles = this.physics.add.group({
        defaultKey: 'projectile',
        maxSize: 10 // Máximo número de proyectiles simultáneos
    });

    // Encontrar posición válida para el jugador
    const playerPos = findValidPosition(walls);
    player = this.physics.add.sprite(playerPos.x, playerPos.y, 'player');
    player.setCollideWorldBounds(true);
    player.setScale(0.5);
    
    // Ajustar el hitbox del jugador
    player.body.setSize(32, 32);
    player.body.setOffset(33, 50);

    // Configurar la cámara
    camera = this.cameras.main;
    camera.startFollow(player);
    camera.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    camera.setZoom(1.0);

    // Agregar colisión entre jugador y paredes
    this.physics.add.collider(player, walls);

    // Agregar colisión entre proyectiles y paredes
    this.physics.add.collider(projectiles, walls, destroyProjectile, null, this);

    // Texto para debug (fijado a la cámara)
    debugText = this.add.text(16, 16, '', { 
        font: '16px Arial', 
        fill: '#ffffff',
        backgroundColor: '#000000'
    });
    debugText.setScrollFactor(0);

    // Configurar controles
    cursors = this.input.keyboard.createCursorKeys();

    // Configurar las animaciones
    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 0,
            end: 5
        }),
        frameRate: 8,
        repeat: -1
    });

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 6,
            end: 11
        }),
        frameRate: 8,
        repeat: -1
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 12,
            end: 17
        }),
        frameRate: 8,
        repeat: -1
    });

    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { 
            start: 18,
            end: 23
        }),
        frameRate: 8,
        repeat: -1
    });

    // Crear animaciones idle para cada dirección
    this.anims.create({
        key: 'idle-down',
        frames: this.anims.generateFrameNumbers('player', { 
            frames: [0, 1]  // Usar los dos primeros frames de la animación hacia abajo
        }),
        frameRate: 2,
        repeat: -1
    });

    this.anims.create({
        key: 'idle-left',
        frames: this.anims.generateFrameNumbers('player', { 
            frames: [6, 7]  // Usar los dos primeros frames de la animación hacia la izquierda
        }),
        frameRate: 2,
        repeat: -1
    });

    this.anims.create({
        key: 'idle-right',
        frames: this.anims.generateFrameNumbers('player', { 
            frames: [12, 13]  // Usar los dos primeros frames de la animación hacia la derecha
        }),
        frameRate: 2,
        repeat: -1
    });

    this.anims.create({
        key: 'idle-up',
        frames: this.anims.generateFrameNumbers('player', { 
            frames: [18, 19]  // Usar los dos primeros frames de la animación hacia arriba
        }),
        frameRate: 2,
        repeat: -1
    });

    // Crear la animación de explosión
    this.anims.create({
        key: 'explode',
        frames: this.anims.generateFrameNumbers('explosion', {
            start: 0,
            end: 5  // Ajusta esto según el número de frames en tu spritesheet
        }),
        frameRate: 15,
        repeat: 0  // La animación se reproduce solo una vez
    });

    // Tecla para cambiar de ropa
    this.input.keyboard.on('keydown-C', function() {
        playerClothes = playerClothes === 'red' ? 'black' : 'red';
    });

    // Configurar tecla de disparo (SPACE)
    this.input.keyboard.on('keydown-SPACE', fireProjectile, this);

    // Encontrar posición válida para el orco (alejada del jugador)
    let orcPos;
    let attempts = 0;
    const minDistance = 10 * TILE_SIZE; // Mínimo 10 tiles de distancia
    let validPositionFound = false;
    
    while (!validPositionFound && attempts < 200) {
        orcPos = findValidPosition(walls);
        const distanceToPlayer = Phaser.Math.Distance.Between(
            playerPos.x, playerPos.y,
            orcPos.x, orcPos.y
        );
        
        if (distanceToPlayer >= minDistance && isValidPosition(orcPos.x, orcPos.y, walls)) {
            validPositionFound = true;
        }
        attempts++;
    }

    if (!validPositionFound) {
        console.warn('No se pudo encontrar una posición válida para el orco');
        // Colocar al orco en una posición segura por defecto
        orcPos = {
            x: playerPos.x + minDistance,
            y: playerPos.y
        };
        // Verificar que la posición por defecto sea válida
        if (!isValidPosition(orcPos.x, orcPos.y, walls)) {
            // Si no es válida, buscar una posición alternativa
            for (let angle = 0; angle < 360; angle += 45) {
                const rad = Phaser.Math.DegToRad(angle);
                orcPos.x = playerPos.x + Math.cos(rad) * minDistance;
                orcPos.y = playerPos.y + Math.sin(rad) * minDistance;
                if (isValidPosition(orcPos.x, orcPos.y, walls)) {
                    break;
                }
            }
        }
    }

    orc = this.physics.add.sprite(orcPos.x, orcPos.y, 'orc');
    orc.setCollideWorldBounds(true);
    orc.setScale(0.6);
    
    // Ajustar el hitbox del orco
    orc.body.setSize(52, 52);
    orc.body.setOffset(26, 36);

    // Variables para el comportamiento del orco
    orc.patrolPoint = new Phaser.Math.Vector2(orc.x, orc.y);
    orc.isChasing = false;
    orc.patrolTimer = 0;
    orc.currentDirection = 'left'; // Mirando hacia el jugador inicialmente

    // Crear animaciones para el orco
    console.log('Creando animaciones del orco...');
    
    // Verificar que el sprite sheet existe
    if (!this.textures.exists('orc')) {
        console.error('El sprite sheet "orc" no existe!');
    } else {
        console.log('Sprite sheet "orc" encontrado:', this.textures.get('orc'));
    }

    // Crear animaciones con verificación
    try {
        this.anims.create({
            key: 'orc-down',
            frames: this.anims.generateFrameNumbers('orc', { 
                start: 0,
                end: 2
            }),
            frameRate: 8,
            repeat: -1
        });
        console.log('Animación orc-down creada');

        this.anims.create({
            key: 'orc-left',
            frames: this.anims.generateFrameNumbers('orc', { 
                start: 3,
                end: 5
            }),
            frameRate: 8,
            repeat: -1
        });
        console.log('Animación orc-left creada');

        this.anims.create({
            key: 'orc-right',
            frames: this.anims.generateFrameNumbers('orc', { 
                start: 6,
                end: 8
            }),
            frameRate: 8,
            repeat: -1
        });
        console.log('Animación orc-right creada');

        this.anims.create({
            key: 'orc-up',
            frames: this.anims.generateFrameNumbers('orc', { 
                start: 6,
                end: 8
            }),
            frameRate: 8,
            repeat: -1
        });
        console.log('Animación orc-up creada');

        // Animaciones idle
        this.anims.create({
            key: 'orc-idle-down',
            frames: [{ key: 'orc', frame: 0 }],
            frameRate: 1,
            repeat: 0
        });
        console.log('Animación orc-idle-down creada');

        this.anims.create({
            key: 'orc-idle-left',
            frames: [{ key: 'orc', frame: 3 }],
            frameRate: 1,
            repeat: 0
        });
        console.log('Animación orc-idle-left creada');

        this.anims.create({
            key: 'orc-idle-right',
            frames: [{ key: 'orc', frame: 6 }],
            frameRate: 1,
            repeat: 0
        });
        console.log('Animación orc-idle-right creada');

        this.anims.create({
            key: 'orc-idle-up',
            frames: [{ key: 'orc', frame: 9 }],
            frameRate: 1,
            repeat: 0
        });
        console.log('Animación orc-idle-up creada');
    } catch (error) {
        console.error('Error al crear animaciones:', error);
    }

    // Agregar colisiones
    this.physics.add.collider(orc, walls);
    this.physics.add.collider(player, orc);
    
    // Agregar colisión entre proyectiles y orco
    this.physics.add.collider(projectiles, orc, (projectile, orc) => {
        takeDamage(orc, 10); // El orco recibe 10 de daño
        projectile.destroy();
    });

    // Crear barras de vida
    // Barra de vida del jugador
    playerHealthBar = this.add.graphics();
    
    // Barra de vida del orco
    orcHealthBar = this.add.graphics();
}

function destroyProjectile(projectile, target) {
    if (target === orc) {
        takeDamage(orc, 10); // El orco recibe 10 de daño
    } else if (target === player) {
        takeDamage(player, 10); // El jugador recibe 10 de daño
    }
    projectile.destroy();
}

function fireProjectile() {
    const currentTime = this.time.now;
    
    if (currentTime - lastFireTime < FIRE_DELAY) {
        return;
    }

    const projectile = projectiles.get(player.x, player.y);
    
    if (projectile) {
        projectile.setActive(true);
        projectile.setVisible(true);
        projectile.setScale(0.2);

        let velocityX = 0;
        let velocityY = 0;
        let rotation = 0;

        // Usar lastDirection en lugar de la animación actual
        switch(lastDirection) {
            case 'left':
                velocityX = -PROJECTILE_SPEED;
                rotation = Math.PI;
                break;
            case 'right':
                velocityX = PROJECTILE_SPEED;
                rotation = 0;
                break;
            case 'up':
                velocityY = -PROJECTILE_SPEED;
                rotation = -Math.PI / 2;
                break;
            case 'down':
                velocityY = PROJECTILE_SPEED;
                rotation = Math.PI / 2;
                break;
        }

        projectile.setVelocity(velocityX, velocityY);
        projectile.setRotation(rotation);
        projectile.rotation_speed = 5;
        lastFireTime = currentTime;

        // Destruir el proyectil después de 2 segundos si no colisiona
        this.time.delayedCall(2000, () => {
            if (projectile.active) {
                projectile.destroy();
            }
        });
    }
}

function updateOrc() {
    // Si el orco no está vivo, no actualizamos su estado
    if (!isOrcAlive) return;

    const distanceToPlayer = Phaser.Math.Distance.Between(
        orc.x, orc.y,
        player.x, player.y
    );

    // Detectar si el jugador está en rango
    if (distanceToPlayer < DETECTION_RADIUS) {
        orc.isChasing = true;
    } else if (distanceToPlayer > DETECTION_RADIUS * 1.5) {
        orc.isChasing = false;
    }

    let isMoving = false;
    let newDirection = orc.currentDirection;
    let velocityX = 0;
    let velocityY = 0;

    if (orc.isChasing) {
        // Calcular las diferencias en X y Y con el jugador
        const dx = player.x - orc.x;
        const dy = player.y - orc.y;
        
        // Determinar la dirección principal basada en la mayor diferencia
        if (Math.abs(dx) > Math.abs(dy)) {
            // Movimiento horizontal
            velocityX = dx > 0 ? ORC_SPEED : -ORC_SPEED;
            velocityY = 0;
            newDirection = dx > 0 ? 'right' : 'left';
        } else {
            // Movimiento vertical
            velocityX = 0;
            velocityY = dy > 0 ? ORC_SPEED : -ORC_SPEED;
            newDirection = dy > 0 ? 'down' : 'up';
        }
        
        isMoving = true;
    } else {
        // Comportamiento de patrulla
        orc.patrolTimer += 1;
        
        if (orc.patrolTimer > 180) {
            orc.patrolTimer = 0;
            // Elegir una dirección aleatoria (0: derecha, 1: izquierda, 2: arriba, 3: abajo)
            const randomDirection = Phaser.Math.Between(0, 3);
            switch (randomDirection) {
                case 0:
                    velocityX = ORC_SPEED * 0.5;
                    velocityY = 0;
                    newDirection = 'right';
                    break;
                case 1:
                    velocityX = -ORC_SPEED * 0.5;
                    velocityY = 0;
                    newDirection = 'left';
                    break;
                case 2:
                    velocityX = 0;
                    velocityY = -ORC_SPEED * 0.5;
                    newDirection = 'up';
                    break;
                case 3:
                    velocityX = 0;
                    velocityY = ORC_SPEED * 0.5;
                    newDirection = 'down';
                    break;
            }
            isMoving = true;
        } else {
            // Continuar en la misma dirección
            switch (orc.currentDirection) {
                case 'right':
                    velocityX = ORC_SPEED * 0.5;
                    velocityY = 0;
                    break;
                case 'left':
                    velocityX = -ORC_SPEED * 0.5;
                    velocityY = 0;
                    break;
                case 'up':
                    velocityX = 0;
                    velocityY = -ORC_SPEED * 0.5;
                    break;
                case 'down':
                    velocityX = 0;
                    velocityY = ORC_SPEED * 0.5;
                    break;
            }
            isMoving = Math.abs(velocityX) > 0 || Math.abs(velocityY) > 0;
        }
    }

    // Aplicar velocidad
    orc.setVelocity(velocityX, velocityY);

    // Actualizar la dirección actual
    orc.currentDirection = newDirection;

    // Reproducir la animación correspondiente
    if (isMoving) {
        const animationKey = `orc-${newDirection}`;
        if (!orc.anims.isPlaying || orc.anims.currentAnim.key !== animationKey) {
            orc.anims.play(animationKey, true);
        }
    } else {
        const idleKey = `orc-idle-${newDirection}`;
        if (!orc.anims.isPlaying || orc.anims.currentAnim.key !== idleKey) {
            orc.anims.play(idleKey, true);
        }
    }
}

function update() {
    const speed = 160;
    player.setVelocity(0);
    let isMoving = false;

    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
        player.anims.play('left', true);
        player.setFlipX(false);
        lastDirection = 'left';
        isMoving = true;
    } else if (cursors.right.isDown) {
        player.setVelocityX(speed);
        player.anims.play('right', true);
        player.setFlipX(false);
        lastDirection = 'right';
        isMoving = true;
    } else if (cursors.up.isDown) {
        player.setVelocityY(-speed);
        player.anims.play('up', true);
        player.setFlipX(false);
        lastDirection = 'up';
        isMoving = true;
    } else if (cursors.down.isDown) {
        player.setVelocityY(speed);
        player.anims.play('down', true);
        player.setFlipX(false);
        lastDirection = 'down';
        isMoving = true;
    }

    // Si no se está moviendo, reproducir la animación idle correspondiente
    if (!isMoving) {
        player.anims.play(`idle-${lastDirection}`, true);
    }

    // Actualizar la rotación de los proyectiles activos
    projectiles.getChildren().forEach(projectile => {
        if (projectile.active) {
            projectile.rotation += projectile.rotation_speed * 0.01;
        }
    });

    // Actualizar el orco solo si está vivo
    if (isOrcAlive) {
        updateOrc();
    }

    // Actualizar posición de las barras de vida
    // Limpiar las barras de vida
    playerHealthBar.clear();
    orcHealthBar.clear();

    // Dibujar fondo de las barras
    playerHealthBar.fillStyle(0x000000);
    playerHealthBar.fillRect(player.x - 25, player.y - 40, 50, 10);
    
    orcHealthBar.fillStyle(0x000000);
    orcHealthBar.fillRect(orc.x - 25, orc.y - 40, 50, 10);

    // Dibujar la vida actual
    playerHealthBar.fillStyle(0xff0000);
    playerHealthBar.fillRect(player.x - 25, player.y - 40, (playerHealth / MAX_HEALTH) * 50, 10);

    orcHealthBar.fillStyle(0xff0000);
    orcHealthBar.fillRect(orc.x - 25, orc.y - 40, (orcHealth / MAX_HEALTH) * 50, 10);

    // Actualizar texto de debug con información de vida
    debugText.setText([
        `Player X: ${Math.floor(player.x)}`,
        `Player Y: ${Math.floor(player.y)}`,
        `Player Health: ${playerHealth}`,
        `Orc Health: ${isOrcAlive ? orcHealth : 'DEAD'}`,
        `Camera X: ${Math.floor(camera.scrollX)}`,
        `Camera Y: ${Math.floor(camera.scrollY)}`,
        `Active Projectiles: ${projectiles.countActive()}`,
        `Last Shot: ${Math.floor((this.time.now - lastFireTime) / 1000)}s ago`,
        `Last Direction: ${lastDirection}`,
        `Orc State: ${isOrcAlive ? (orc.isChasing ? 'Chasing' : 'Patrolling') : 'DEAD'}`,
        `Distance to Player: ${isOrcAlive ? Math.floor(Phaser.Math.Distance.Between(orc.x, orc.y, player.x, player.y)) : 'N/A'}`
    ]);
}

// Función para recibir daño
function takeDamage(entity, amount) {
    if (entity === player) {
        playerHealth = Math.max(0, playerHealth - amount);
        if (playerHealth <= 0) {
            // Game Over
            console.log('Game Over!');
            playerHealthBar.clear();
        }
    } else if (entity === orc) {
        orcHealth = Math.max(0, orcHealth - amount);
        if (orcHealth <= 0) {
            // Orc muerto
            isOrcAlive = false;
            orc.destroy();
            orcHealthBar.clear();
        }
    }
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

// Función para verificar si una posición es válida (no hay paredes)
function isValidPosition(x, y, walls) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    // Verificar si la posición está dentro de los límites del mapa
    if (tileX <= 1 || tileX >= MAP_WIDTH - 2 || tileY <= 1 || tileY >= MAP_HEIGHT - 2) {
        return false;
    }
    
    // Verificar si hay paredes en las posiciones adyacentes
    for (let wall of walls.getChildren()) {
        const wallX = Math.floor(wall.x / TILE_SIZE);
        const wallY = Math.floor(wall.y / TILE_SIZE);
        
        // Verificar si hay una pared en la misma posición o adyacente (radio de 2 tiles)
        if (Math.abs(wallX - tileX) <= 2 && Math.abs(wallY - tileY) <= 2) {
            return false;
        }
    }
    
    return true;
}

// Función para encontrar una posición válida aleatoria
function findValidPosition(walls) {
    let x, y;
    let attempts = 0;
    const maxAttempts = 200; // Aumentamos el número de intentos
    
    do {
        // Aseguramos que la posición esté lejos de los bordes
        x = Phaser.Math.Between(3, MAP_WIDTH - 4) * TILE_SIZE;
        y = Phaser.Math.Between(3, MAP_HEIGHT - 4) * TILE_SIZE;
        attempts++;
    } while (!isValidPosition(x, y, walls) && attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
        console.warn('No se pudo encontrar una posición válida después de', maxAttempts, 'intentos');
        // Retornar una posición por defecto en el centro del mapa
        return {
            x: (MAP_WIDTH / 2) * TILE_SIZE,
            y: (MAP_HEIGHT / 2) * TILE_SIZE
        };
    }
    
    return { x, y };
} 
