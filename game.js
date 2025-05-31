// Get canvas and context from HTML
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 576;

// Gravity constant
const gravity = 0.7;

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

    this.health = 200;  // Increased from 100
    this.maxHealth = 200;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackDamage = 15;
    this.isDodging = false;
    this.dodgeCooldown = 0;
    this.dodgeDuration = 15; // frames of invincibility
    this.dodgeSpeed = 12;
    this.canCombo = false;
    this.comboCount = 0;
    this.lastAttackTime = 0;
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

    // Handle cooldowns
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    
    // Reset attack state
    if (this.attackCooldown <= 0 && this.isAttacking) {
      this.isAttacking = false;
      this.canCombo = true; // Enable combo window
    }
    
    // Handle dodge
    if (this.isDodging) {
      this.dodgeDuration--;
      if (this.dodgeDuration <= 0) {
        this.isDodging = false;
        this.dodgeCooldown = 45;
        this.velocity.x = 0;
        this.setAnimation(this.lastDirection === "right" ? "idleRight" : "idleLeft");
      }
    }
  }

  attack(target) {
    const now = Date.now();
    const comboWindow = 500; // ms between attacks to continue combo
    
    if (this.attackCooldown <= 0 && !this.isDodging) {
      this.isAttacking = true;
      
      // Combo system
      if (now - this.lastAttackTime < comboWindow && this.canCombo) {
        this.comboCount = (this.comboCount + 1) % 3;
      } else {
        this.comboCount = 0;
      }
      
      // Faster attacks based on combo
      this.attackCooldown = 30 - (this.comboCount * 5);
      this.lastAttackTime = now;
            
            // Check if attack hits with extended range
            const attackRange = 120; // Slightly larger attack range
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

    // Enhanced AI Controller for Enemy
    class AIController {
      constructor(fighter, target) {
        this.fighter = fighter;
        this.target = target;
        this.nextActionTime = 0;
      this.difficulty = 4.0; // Maximum difficulty
        this.state = 'patrol'; // patrol, attack, defend
        this.comboStep = 0;
        this.attackPatterns = [
          {delay: 600, count: 1},  // Faster single attack
          {delay: 400, count: 2},  // Faster double attack
          {delay: 300, count: 3},  // Faster triple attack
          {delay: 200, count: 4}   // New: Quad attack
        ];
      this.fatigue = 0;
      this.attackCooldown = 0;
      }

      update() {
        const now = Date.now();
        if (now < this.nextActionTime) return;

        const distanceX = this.target.position.x - this.fighter.position.x;
        const distanceY = this.target.position.y - this.fighter.position.y;
        const absDistanceX = Math.abs(distanceX);
        const absDistanceY = Math.abs(distanceY);
        const direction = distanceX > 0 ? 'right' : 'left';

        // Enhanced attack system
        const inAttackRange = absDistanceX < 150 && absDistanceY < 100;
        const shouldAttack = inAttackRange || 
                          (absDistanceX < 200 && Math.random() < 0.3); // 30% chance to attack at extended range

        if (shouldAttack) {
          // Initialize attack animation properties
          const attackAnim = `attack${direction}`;
          this.fighter.setAnimation(attackAnim);
          
          // Ensure animation object exists
          if (!this.fighter.animations[attackAnim]) {
            this.fighter.animations[attackAnim] = {
              frames: [],
              frameDuration: 5
            };
          }
          // Set frame duration if not already set
          if (typeof this.fighter.animations[attackAnim].frameDuration !== 'number') {
            this.fighter.animations[attackAnim].frameDuration = 5;
          }
          
          // Enhanced attack with wider hitbox
          this.fighter.attack(this.target);
          
          // More aggressive pattern
          this.attackCooldown = 5;
          this.nextActionTime = now + 50;
          
          // Predictive movement during attack
          const predictX = this.target.position.x + this.target.velocity.x * 0.7;
          const predictDistance = predictX - this.fighter.position.x;
          this.fighter.velocity.x = predictDistance > 0 ? 3 : -3;
          
          return;
        }

        // Movement logic
        const chaseSpeed = 5;
        const edgeThreshold = 100;
        const nearLeftEdge = this.fighter.position.x < edgeThreshold;
        const nearRightEdge = this.fighter.position.x > canvas.width - this.fighter.width - edgeThreshold;

        // Avoid getting stuck in corners
        if ((nearLeftEdge && distanceX < 0) || (nearRightEdge && distanceX > 0)) {
          this.fighter.velocity.x = distanceX > 0 ? -chaseSpeed : chaseSpeed;
          if (this.fighter.position.y + this.fighter.height >= canvas.height) {
            this.fighter.velocity.y = -15;
          }
        } else {
          // Chase player with prediction
          const predictX = this.target.position.x + this.target.velocity.x * 0.5;
          const predictDistance = predictX - this.fighter.position.x;
          this.fighter.velocity.x = predictDistance > 0 ? chaseSpeed : -chaseSpeed;
        }

        this.fighter.setAnimation(
          this.fighter.velocity.x > 0 ? 'runRight' : 'runLeft'
        );
        this.fighter.lastDirection = direction;
        
        // Jump very aggressively to close distance
        if (this.fighter.position.y + this.fighter.height >= canvas.height) {
          const shouldJump = 
            (absDistanceX > 80) || // Jump when player is more than 80px away
            (nearLeftEdge || nearRightEdge) || // Always jump near edges
            (Math.random() < 0.4); // Very frequent random jumps (40% chance)
            
            if (shouldJump) {
            this.fighter.velocity.y = -22; // Even higher jump
            this.fighter.velocity.x *= 1.8; // Stronger horizontal boost during jump
            this.fighter.setAnimation(
              this.fighter.lastDirection === 'right' ? 'jumpRight' : 'jumpLeft'
            );
            this.nextActionTime = now + 30; // Very fast reaction after jump
          }
        }

        this.nextActionTime = now + 100;
      }
    }

    // Boss version of Levi
    const enemy = new Fighter({
      position: { x: canvas.width - 200, y: 426 },
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
            frameDuration: 15 // Faster attack animation
        },
        attackLeft: { 
            frames: [
                loadedImages["levi_attackLeft1"],
                loadedImages["levi_attackLeft2"]
            ],
            frameDuration: 15 // Faster attack animation
        }
      },
      scale: 2,
      health: 500,  // Increased from 300
      maxHealth: 500,
      attackDamage: 25  // Increased damage
    });

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

    // Initialize AI Controller before game loop
    const enemyAI = new AIController(enemy, player);

    // Reset game state when starting
    function resetGame() {
      player.health = player.maxHealth;
      enemy.health = enemy.maxHealth;
      player.position = { x: 100, y: 426 };
      enemy.position = { x: canvas.width - 200, y: 426 };
      player.velocity = { x: 0, y: 0 };
      enemy.velocity = { x: 0, y: 0 };
      player.setAnimation("idleRight");
      enemy.setAnimation("idleLeft");
    }

    // Game loop
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

      // Update AI controller
      enemyAI.update();
      
      // Enemy movement logic
      if (enemy.velocity.x === 0) {
        enemy.setAnimation(enemy.lastDirection === "right" ? "idleRight" : "idleLeft");
      }

      // Check for game over
      if (player.health <= 0) {
        drawGameOver('Levi');
        return;
      }
      if (enemy.health <= 0) {
        drawGameOver('Eren');
        return;
      }
      
      requestAnimationFrame(animate);
    }

    // Start game immediately
    resetGame();
    animate();

    // Handle keydown events (player only)
    window.addEventListener("keydown", (event) => {
      switch (event.key) {
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
          if (!player.isDodging) {
            player.attack(enemy);
            player.setAnimation(player.lastDirection === "right" ? "attackRight" : "attackLeft");
          }
          break;
        case "s":
          if (player.dodgeCooldown <= 0 && !player.isAttacking) {
            player.isDodging = true;
            player.dodgeDuration = 15;
            player.velocity.x = player.lastDirection === "right" ? 
              player.dodgeSpeed : -player.dodgeSpeed;
            player.setAnimation(player.lastDirection === "right" ? "runRight" : "runLeft");
          }
          break;
      }
    });

    // Handle keyup events (player only)
    window.addEventListener("keyup", (event) => {
      switch (event.key) {
        case "a":
          keys.player.left = false;
          break;
        case "d":
          keys.player.right = false;
          break;
      }
    });
  }
);