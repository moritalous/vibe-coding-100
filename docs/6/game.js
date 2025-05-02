// Game constants
const GRAVITY = 0.5;
const GROUND_Y = 300;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;

// Game class
class FightingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Create players
        this.player1 = new Fighter({
            x: 200,
            y: GROUND_Y,
            width: 60,
            height: 100,
            color: 'blue',
            controls: {
                left: 'KeyA',
                right: 'KeyD',
                jump: 'KeyW',
                crouch: 'KeyS',
                punch: 'KeyQ',
                kick: 'KeyE'
            },
            name: 'Player 1',
            facingRight: true
        });
        
        this.player2 = new Fighter({
            x: 600,
            y: GROUND_Y,
            width: 60,
            height: 100,
            color: 'red',
            controls: {
                left: 'ArrowLeft',
                right: 'ArrowRight',
                jump: 'ArrowUp',
                crouch: 'ArrowDown',
                punch: 'Comma',
                kick: 'Period'
            },
            name: 'Player 2',
            facingRight: false
        });
        
        // Game state
        this.gameOver = false;
        this.winner = null;
        
        // Background and stage elements
        this.background = {
            color: '#333',
            floorColor: '#555'
        };
        
        // Input handling
        this.keys = {};
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Start the game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    handleKeyDown(e) {
        this.keys[e.code] = true;
    }
    
    handleKeyUp(e) {
        this.keys[e.code] = false;
    }
    
    update(deltaTime) {
        // Update players
        this.player1.update(this.keys, deltaTime, this.player2);
        this.player2.update(this.keys, deltaTime, this.player1);
        
        // Check for collisions
        this.checkCollisions();
        
        // Check for game over
        if (this.player1.health <= 0) {
            this.gameOver = true;
            this.winner = this.player2.name;
        } else if (this.player2.health <= 0) {
            this.gameOver = true;
            this.winner = this.player1.name;
        }
    }
    
    checkCollisions() {
        // Check if players are in attack range and if attacks hit
        if (this.player1.isAttacking && this.player1.attackCooldown === 0) {
            if (this.checkAttackCollision(this.player1, this.player2)) {
                this.player2.takeDamage(this.player1.attackDamage);
                this.player1.attackHit = true;
            }
            this.player1.isAttacking = false;
        }
        
        if (this.player2.isAttacking && this.player2.attackCooldown === 0) {
            if (this.checkAttackCollision(this.player2, this.player1)) {
                this.player1.takeDamage(this.player2.attackDamage);
                this.player2.attackHit = true;
            }
            this.player2.isAttacking = false;
        }
    }
    
    checkAttackCollision(attacker, defender) {
        // Calculate attack hitbox
        const attackRange = 30; // Attack range beyond the player's width
        let attackBox = {
            x: attacker.facingRight ? attacker.x + attacker.width : attacker.x - attackRange,
            y: attacker.y + attacker.height * 0.3, // Attack at upper body level
            width: attackRange,
            height: attacker.height * 0.4
        };
        
        // Check if attack hitbox intersects with defender
        return (
            attackBox.x < defender.x + defender.width &&
            attackBox.x + attackBox.width > defender.x &&
            attackBox.y < defender.y + defender.height &&
            attackBox.y + attackBox.height > defender.y
        );
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = this.background.color;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw floor
        this.ctx.fillStyle = this.background.floorColor;
        this.ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);
        
        // Draw health bars
        this.drawHealthBars();
        
        // Draw players
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);
        
        // Draw game over message if game is over
        if (this.gameOver) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${this.winner} wins!`, this.width / 2, this.height / 2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Refresh to play again', this.width / 2, this.height / 2 + 40);
        }
    }
    
    drawHealthBars() {
        // Player 1 health bar
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(50, 30, 200, 20);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(50, 30, 200 * (this.player1.health / 100), 20);
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(50, 30, 200, 20);
        
        // Player 2 health bar
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.width - 250, 30, 200, 20);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(this.width - 250, 30, 200 * (this.player2.health / 100), 20);
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(this.width - 250, 30, 200, 20);
        
        // Player names
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.player1.name, 50, 25);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.player2.name, this.width - 50, 25);
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Update and draw
        if (!this.gameOver) {
            this.update(deltaTime);
        }
        this.draw();
        
        // Continue game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// Fighter class
class Fighter {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        this.color = config.color;
        this.controls = config.controls;
        this.name = config.name;
        this.facingRight = config.facingRight;
        
        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isCrouching = false;
        
        // Combat
        this.health = 100;
        this.isAttacking = false;
        this.attackType = null; // 'punch' or 'kick'
        this.attackDamage = 0;
        this.attackCooldown = 0;
        this.attackHit = false;
        this.isBlocking = false;
        
        // Animation states
        this.state = 'idle'; // idle, walk, jump, crouch, punch, kick, hurt, block
        this.frameCount = 0;
    }
    
    update(keys, deltaTime, opponent) {
        // Reset velocity X
        this.velocityX = 0;
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        // Handle movement only if not attacking
        if (!this.isAttacking) {
            // Left movement
            if (keys[this.controls.left]) {
                this.velocityX = -MOVE_SPEED;
                this.state = 'walk';
                this.facingRight = false;
            }
            
            // Right movement
            if (keys[this.controls.right]) {
                this.velocityX = MOVE_SPEED;
                this.state = 'walk';
                this.facingRight = true;
            }
            
            // Jumping
            if (keys[this.controls.jump] && !this.isJumping) {
                this.velocityY = JUMP_FORCE;
                this.isJumping = true;
                this.state = 'jump';
            }
            
            // Crouching
            this.isCrouching = keys[this.controls.crouch] && !this.isJumping;
            if (this.isCrouching) {
                this.state = 'crouch';
                this.velocityX = 0; // Can't move while crouching
            }
            
            // Attacking - Punch
            if (keys[this.controls.punch] && this.attackCooldown === 0) {
                this.isAttacking = true;
                this.attackType = 'punch';
                this.attackDamage = 10;
                this.attackCooldown = 20; // 20 frames cooldown
                this.state = 'punch';
                this.attackHit = false;
            }
            
            // Attacking - Kick
            if (keys[this.controls.kick] && this.attackCooldown === 0) {
                this.isAttacking = true;
                this.attackType = 'kick';
                this.attackDamage = 15;
                this.attackCooldown = 30; // 30 frames cooldown
                this.state = 'kick';
                this.attackHit = false;
            }
            
            // Set to idle if no movement or action
            if (this.velocityX === 0 && !this.isJumping && !this.isCrouching && !this.isAttacking) {
                this.state = 'idle';
            }
        }
        
        // Apply gravity
        this.velocityY += GRAVITY;
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Keep player within canvas bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 800) this.x = 800 - this.width;
        
        // Ground collision
        if (this.y > GROUND_Y) {
            this.y = GROUND_Y;
            this.velocityY = 0;
            this.isJumping = false;
        }
        
        // Simple collision with opponent (prevent overlap)
        if (this.x < opponent.x + opponent.width &&
            this.x + this.width > opponent.x &&
            this.y < opponent.y + opponent.height &&
            this.y + this.height > opponent.y) {
            
            // Push players apart
            if (this.x < opponent.x) {
                this.x = opponent.x - this.width;
            } else {
                this.x = opponent.x + opponent.width;
            }
        }
        
        // Animation frame counter
        this.frameCount++;
    }
    
    takeDamage(amount) {
        // Reduce damage if blocking
        if (this.isBlocking) {
            amount *= 0.5;
        }
        
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        
        // Set hurt state
        if (!this.isBlocking) {
            this.state = 'hurt';
        }
    }
    
    draw(ctx) {
        // Draw fighter
        ctx.fillStyle = this.color;
        
        // Adjust height if crouching
        let drawHeight = this.height;
        let drawY = this.y;
        
        if (this.isCrouching) {
            drawHeight = this.height * 0.7;
            drawY = this.y + this.height * 0.3;
        }
        
        ctx.fillRect(this.x, drawY, this.width, drawHeight);
        
        // Draw face direction (simple eyes)
        ctx.fillStyle = 'white';
        if (this.facingRight) {
            ctx.fillRect(this.x + this.width - 20, drawY + 20, 10, 5);
        } else {
            ctx.fillRect(this.x + 10, drawY + 20, 10, 5);
        }
        
        // Draw attack animation
        if (this.isAttacking) {
            ctx.fillStyle = 'yellow';
            const attackWidth = 30;
            const attackHeight = 20;
            const attackY = drawY + 30;
            
            if (this.facingRight) {
                ctx.fillRect(this.x + this.width, attackY, attackWidth, attackHeight);
            } else {
                ctx.fillRect(this.x - attackWidth, attackY, attackWidth, attackHeight);
            }
        }
        
        // Draw state text for debugging
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.state, this.x + this.width / 2, drawY - 10);
    }
}

// Start the game when the page loads
window.onload = () => {
    new FightingGame();
};
