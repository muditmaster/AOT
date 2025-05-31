// Define canvas and context
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 576;

// Gravity constant
const gravity = 0.7;

// Game state
let gameRunning = true;

// Preload images
function preloadImages(imagePaths, callback) {
  const images = {};
  let loadedImagesCount = 0;

  // Load each image
  imagePaths.forEach((path) => {
    const img = new Image();
    img.src = path.src;
    img.onload = () => {
      loadedImagesCount++;
      images[path.key] = img;

      // Call callback when all images are loaded
      if (loadedImagesCount === imagePaths.length) {
        callback(images);
      }
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${path.src}`);
      loadedImagesCount++;
      if (loadedImagesCount === imagePaths.length) {
        callback(images);
      }
    };
  });
}

// Fighter class
class Fighter {
  constructor({ position, velocity, animations, scale = 1, offset = { x: 0, y: 0 } }) {
    this.position = position;
    this.velocity = velocity;
    this.animations = animations;
    this.currentAnimation = "idleRight";
    this.scale = scale;
    this.offset = offset;

    this.width = 50;
    this.height = 150;

    this.health = 100;
    this.maxHealth = 100;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackDamage = 10;
    this.framesElapsed = 0;
    this.framesHold = 10; // Adjust frame switch speed
    this.currentFrame = 0; // Current animation frame index
    this.lastDirection = "right"; // Track last direction faced
  }

  setAnimation(animationKey) {
    if (this.currentAnimation !== animationKey) {
      this.currentAnimation = animationKey;
      this.currentFrame = 0; // Reset to the first frame
    }
  }

  draw(ctx) {
    const animation = this.animations[this.currentAnimation];
    if (!animation || !animation.frames[this.currentFrame]) {
      // Fallback to idle animation if current animation frame is missing
      const fallbackAnim = this.lastDirection === "right" ? "idleRight" : "idleLeft";
      const fallbackFrame = this.animations[fallbackAnim].frames[0];
      ctx.drawImage(
        fallbackFrame,
        this.position.x + this.offset.x,
        this.position.y + this.offset.y,
        fallbackFrame.width * this.scale,
        fallbackFrame.height * this.scale
      );
      return;
    }

    const frameImage = animation.frames[this.currentFrame];
    ctx.drawImage(
      frameImage,
      this.position.x + this.offset.x,
      this.position.y + this.offset.y,
      frameImage.width * this.scale,
      frameImage.height * this.scale
    );
  }

    update(ctx, playerRef) {
        this.draw(ctx);
        
        // Draw health bar
        ctx.fillStyle = this === playerRef ? 'red' : 'blue';
        ctx.fillRect(
            this.position.x + this.offset.x,
            this.position.y + this.offset.y - 20,
            (this.width * this.scale) * (this.health / this.maxHealth),
            5
        );

        // Update animation frames
        this.framesElapsed++;
        const animation = this.animations[this.currentAnimation];
        if (animation) {
            const frameDuration = animation.frameDuration || this.framesHold;
            if (this.framesElapsed % frameDuration === 0) {
                this.currentFrame = (this.currentFrame + 1) % animation.frames.length;
            }
        }

        // Apply gravity
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Screen boundaries
        if (this.position.x < 0) {
            this.position.x = 0;
        }
        if (this.position.x + this.width > canvas.width) {
            this.position.x = canvas.width - this.width;
        }

        // Stop falling at ground level
        if (this.position.y + this.height >= canvas.height) {
            this.velocity.y = 0;
            this.position.y = canvas.height - this.height;
        } else {
            this.velocity.y += gravity;
        }

    // Handle attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    } else if (this.isAttacking) {
      this.isAttacking = false;
    }
  }

    attack(target) {
        if (this.attackCooldown <= 0) {
            this.isAttacking = true;
            this.attackCooldown = 120; // 2 second cooldown (1 sec per attack frame)
            
            // Check if attack hits with extended range
            const attackRange = 100; // pixels
            const isFacingRight = this.lastDirection === "right";
            const attackStartX = isFacingRight 
                ? this.position.x + this.width 
                : this.position.x - attackRange;
            const attackEndX = isFacingRight
                ? this.position.x + this.width + attackRange
                : this.position.x;
                
            if (
                attackEndX > target.position.x &&
                attackStartX < target.position.x + target.width &&
                this.position.y < target.position.y + target.height &&
                this.position.y + this.height > target.position.y
            ) {
                target.health -= this.attackDamage;
                if (target.health < 0) target.health = 0;
            }
        }
    }
}

// Input keys
const keys = {
  player: { left: false, right: false, jump: false },
  enemy: { left: false, right: false, jump: false }
};

// Preload images and initialize game
preloadImages(
  [
    { key: "background", src: "background.jpg" },
    // Player animations
    { key: "eren_idleRight", src: "eren_idleRight.png" },
    { key: "eren_idleLeft", src: "eren_idleLeft.png" },
    { key: "eren_runRight1", src: "eren_runRight1.png" },
    { key: "eren_runRight2", src: "eren_runRight2.png" },
    { key: "eren_runLeft1", src: "eren_runLeft1.png" },
    { key: "eren_runLeft2", src: "eren_runLeft2.png" },
    { key: "eren_jumpRight", src: "eren_jumpRight.png" },
    { key: "eren_jumpLeft", src: "eren_jumpLeft.png" },
    { key: "eren_attackRight1", src: "eren_attackRight1.png" },
    { key: "eren_attackRight2", src: "eren_attackRight2.png" },
    { key: "eren_attackLeft1", src: "eren_attackLeft1.png" },
    { key: "eren_attackLeft2", src: "eren_attackLeft2.png" },
    // Enemy animations
    { key: "levi_idleRight", src: "levi_idleRight.png" },
    { key: "levi_idleLeft", src: "levi_idleLeft.png" },
    { key: "levi_runRight1", src: "levi_runRight1.png" },
    { key: "levi_runRight2", src: "levi_runRight2.png" },
    { key: "levi_runLeft1", src: "levi_runLeft1.png" },
    { key: "levi_runLeft2", src: "levi_runLeft2.png" },
    { key: "levi_jumpRight", src: "levi_jumpRight.png" },
    { key: "levi_jumpLeft", src: "levi_jumpLeft.png" },
    { key: "levi_attackRight1", src: "levi_attackRight1.png" },
    { key: "levi_attackRight2", src: "levi_attackRight2.png" },
    { key: "levi_attackLeft1", src: "levi_attackLeft1.png" },
    { key: "levi_attackLeft2", src: "levi_attackLeft2.png" }
  ],
  (loadedImages) => {
    const player = new Fighter({
      position: { x: 100, y: 426 }, // Adjust starting position (ground level)
      velocity: { x: 0, y: 0 },
      animations: {
        idleRight: { frames: [loadedImages["eren_idleRight"]] },
        idleLeft: { frames: [loadedImages["eren_idleLeft"]] },
        runRight: { frames: [loadedImages["eren_runRight1"], loadedImages["eren_runRight2"]] },
        runLeft: { frames: [loadedImages["eren_runLeft1"], loadedImages["eren_runLeft2"]] },
        jumpRight: { frames: [loadedImages["eren_jumpRight"]] },
        jumpLeft: { frames: [loadedImages["eren_jumpLeft"]] },
        attackRight: { 
            frames: [
                loadedImages["eren_attackRight1"], 
                loadedImages["eren_attackRight2"]
            ],
            frameDuration: 775 // Each frame shown for 75 frames (1.25 sec) - total 2.5 sec
        },
        attackLeft: { 
            frames: [
                loadedImages["eren_attackLeft1"],
                loadedImages["eren_attackLeft2"]
            ],
            frameDuration: 775 // Each frame shown for 75 frames (1.25 sec) - total 2.5 sec
        }
      },
      scale: 2
    });

    const enemy = new Fighter({
      position: { x: canvas.width - 200, y: 426 }, // Adjust starting position (ground level)
      velocity: { x: 0, y: 0 },
      animations: {
        idleRight: { frames: [loadedImages["levi_idleRight"]] },
        idleLeft: { frames: [loadedImages["levi_idleLeft"]] },
        runRight: { frames: [loadedImages["levi_runRight1"], loadedImages["levi_runRight2"]] },
        runLeft: { frames: [loadedImages["levi_runLeft1"], loadedImages["levi_runLeft2"]] },
        jumpRight: { frames: [loadedImages["levi_jumpRight"]] },
        jumpLeft: { frames: [loadedImages["levi_jumpLeft"]] },
        attackRight: { 
            frames: [
                loadedImages["levi_attackRight1"],
                loadedImages["levi_attackRight2"]
            ],
            frameDuration: 775 // Each frame shown for 75 frames (1.25 sec) - total 2.5 sec
        },
        attackLeft: { 
            frames: [
                loadedImages["levi_attackLeft1"],
                loadedImages["levi_attackLeft2"]
            ],
            frameDuration: 775 // Each frame shown for 75 frames (1.25 sec) - total 2.5 sec
        }
      },
      scale: 2
    });

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.drawImage(loadedImages["background"], 0, 0, canvas.width, canvas.height);

      player.update(ctx, player);
      enemy.update(ctx, player);

      // Player movement logic
      if (keys.player.left) {
        player.velocity.x = -5;
        player.setAnimation("runLeft");
        player.lastDirection = "left";
      } else if (keys.player.right) {
        player.velocity.x = 5;
        player.setAnimation("runRight");
        player.lastDirection = "right";
      } else {
        player.velocity.x = 0;
        player.setAnimation(player.lastDirection === "right" ? "idleRight" : "idleLeft");
      }

      // Enemy movement logic
      if (keys.enemy.left) {
        enemy.velocity.x = -5;
        enemy.setAnimation("runLeft");
        enemy.lastDirection = "left";
      } else if (keys.enemy.right) {
        enemy.velocity.x = 5;
        enemy.setAnimation("runRight");
        enemy.lastDirection = "right";
      } else {
        enemy.velocity.x = 0;
        enemy.setAnimation(enemy.lastDirection === "right" ? "idleRight" : "idleLeft");
      }
    }
    function drawGameOver(winner) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${winner} Wins!`, canvas.width/2, canvas.height/2);
      
      ctx.font = '30px Arial';
      ctx.fillText('Press F5 to restart', canvas.width/2, canvas.height/2 + 50);
    }

    function gameLoop() {
      if (!gameRunning) return;
      
      animate();
      
      // Check for game over
      if (player.health <= 0) {
        gameRunning = false;
        drawGameOver('Levi');
        return;
      }
      if (enemy.health <= 0) {
        gameRunning = false;
        drawGameOver('Eren');
        return;
      }
      
      requestAnimationFrame(gameLoop);
    }
    gameLoop();

    // Handle keydown events
    window.addEventListener("keydown", (event) => {
      switch (event.key) {
        // Player controls
        case "a":
          keys.player.left = true;
          break;
        case "d":
          keys.player.right = true;
          break;
        case "w":
          if (player.position.y + player.height >= canvas.height) {
            player.velocity.y = -20;
            player.setAnimation(player.lastDirection === "right" ? "jumpRight" : "jumpLeft");
          }
          break;
        case " ":
          player.attack(enemy);
          player.setAnimation(player.lastDirection === "right" ? "attackRight" : "attackLeft");
          break;

        // Enemy controls
        case "ArrowLeft":
          keys.enemy.left = true;
          break;
        case "ArrowRight":
          keys.enemy.right = true;
          break;
        case "ArrowUp":
          if (enemy.position.y + enemy.height >= canvas.height) {
            enemy.velocity.y = -20;
            enemy.setAnimation(enemy.lastDirection === "right" ? "jumpRight" : "jumpLeft");
          }
          break;
        case "k":
          enemy.attack(player);
          enemy.setAnimation(enemy.lastDirection === "right" ? "attackRight" : "attackLeft");
          break;
      }
    });

    // Handle keyup events
    window.addEventListener("keyup", (event) => {
      switch (event.key) {
        // Player controls
        case "a":
          keys.player.left = false;
          break;
        case "d":
          keys.player.right = false;
          break;

        // Enemy controls
        case "ArrowLeft":
          keys.enemy.left = false;
          break;
        case "ArrowRight":
          keys.enemy.right = false;
          break;
      }
    });
  }
);