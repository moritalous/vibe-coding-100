// Game constants
const GRAVITY = 0.5;
const GROUND_Y = 300;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const GAME_TIME = 30; // Game time in seconds

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
                kick: 'KeyE',
                block: 'KeyR',
                beam: 'KeyF'
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
                kick: 'Period',
                block: 'Slash',
                beam: 'ShiftRight'
            },
            name: 'Player 2',
            facingRight: false
        });
        
        // Game state
        this.gameOver = false;
        this.winner = null;
        this.timeRemaining = GAME_TIME * 1000; // Convert to milliseconds
        this.beams = []; // Array to store active beam projectiles
        
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
        // Update timer
        this.timeRemaining -= deltaTime;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.gameOver = true;
            // Determine winner based on health
            if (this.player1.health > this.player2.health) {
                this.winner = this.player1.name;
            } else if (this.player2.health > this.player1.health) {
                this.winner = this.player2.name;
            } else {
                this.winner = "Draw";
            }
        }
        
        // Update players
        this.player1.update(this.keys, deltaTime, this.player2);
        this.player2.update(this.keys, deltaTime, this.player1);
        
        // Update beams
        this.updateBeams();
        
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
    
    updateBeams() {
        // Update beam positions and check for collisions
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const beam = this.beams[i];
            
            // Move beam
            beam.x += beam.speed;
            
            // Check if beam is out of bounds
            if (beam.x < 0 || beam.x > this.width) {
                this.beams.splice(i, 1);
                continue;
            }
            
            // Check collision with players
            const target = beam.owner === this.player1 ? this.player2 : this.player1;
            if (this.checkBeamCollision(beam, target)) {
                // Apply damage if hit
                target.takeDamage(beam.damage);
                // Remove beam after hit
                this.beams.splice(i, 1);
            }
        }
    }
    
    checkBeamCollision(beam, player) {
        return (
            beam.x < player.x + player.width &&
            beam.x + beam.width > player.x &&
            beam.y < player.y + player.height &&
            beam.y + beam.height > player.y &&
            !player.isBlocking
        );
    }
    
    checkCollisions() {
        // Check if players are in attack range and if attacks hit
        if (this.player1.isAttacking && this.player1.attackCooldown === 0) {
            if (this.checkAttackCollision(this.player1, this.player2)) {
                // Check if player 2 is blocking and facing the right direction to block
                if (this.player2.isBlocking && 
                    ((this.player1.x < this.player2.x && !this.player2.facingRight) || 
                     (this.player1.x > this.player2.x && this.player2.facingRight))) {
                    // Attack blocked - reduced damage
                    this.player2.takeDamage(this.player1.attackDamage * 0.2);
                    // Reset combo on block
                    if (this.player1.attackType === 'punch') {
                        this.player1.comboCount = 0;
                    }
                } else {
                    // Normal damage
                    this.player2.takeDamage(this.player1.attackDamage);
                    
                    // If it was a kick, add extra knockback
                    if (this.player1.attackType === 'kick') {
                        const knockbackDirection = this.player1.facingRight ? 1 : -1;
                        this.player2.x += knockbackDirection * 20;
                    }
                }
                this.player1.attackHit = true;
                
                // Show happy expression on successful hit
                if (this.player1.attackType === 'kick') {
                    this.player1.expressionState = 'happy';
                }
            }
            this.player1.isAttacking = false;
        }
        
        if (this.player2.isAttacking && this.player2.attackCooldown === 0) {
            if (this.checkAttackCollision(this.player2, this.player1)) {
                // Check if player 1 is blocking and facing the right direction to block
                if (this.player1.isBlocking && 
                    ((this.player2.x < this.player1.x && !this.player1.facingRight) || 
                     (this.player2.x > this.player1.x && this.player1.facingRight))) {
                    // Attack blocked - reduced damage
                    this.player1.takeDamage(this.player2.attackDamage * 0.2);
                    // Reset combo on block
                    if (this.player2.attackType === 'punch') {
                        this.player2.comboCount = 0;
                    }
                } else {
                    // Normal damage
                    this.player1.takeDamage(this.player2.attackDamage);
                    
                    // If it was a kick, add extra knockback
                    if (this.player2.attackType === 'kick') {
                        const knockbackDirection = this.player2.facingRight ? 1 : -1;
                        this.player1.x += knockbackDirection * 20;
                    }
                }
                this.player2.attackHit = true;
                
                // Show happy expression on successful hit
                if (this.player2.attackType === 'kick') {
                    this.player2.expressionState = 'happy';
                }
            }
            this.player2.isAttacking = false;
        }
    }
    
    checkAttackCollision(attacker, defender) {
        // Calculate attack hitbox based on attack type
        let attackRange = 30; // Default attack range
        let attackHeight = attacker.height * 0.4; // Default attack height
        let attackY = attacker.y + attacker.height * 0.3; // Default attack Y position
        
        // Adjust hitbox based on attack type
        if (attacker.attackType === 'punch') {
            attackRange = 20; // Shorter range for punch
            attackHeight = attacker.height * 0.3;
            attackY = attacker.y + attacker.height * 0.25; // Upper body
        } else if (attacker.attackType === 'kick') {
            attackRange = 40; // Longer range for kick
            attackHeight = attacker.height * 0.5;
            attackY = attacker.y + attacker.height * 0.5; // Lower body
        }
        
        let attackBox = {
            x: attacker.facingRight ? attacker.x + attacker.width : attacker.x - attackRange,
            y: attackY,
            width: attackRange,
            height: attackHeight
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
        
        // Draw timer
        this.drawTimer();
        
        // Draw beams
        this.drawBeams();
        
        // Draw players
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);
        
        // Draw game over message if game is over
        if (this.gameOver) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            if (this.winner === "Draw") {
                this.ctx.fillText('Draw!', this.width / 2, this.height / 2);
            } else {
                this.ctx.fillText(`${this.winner} wins!`, this.width / 2, this.height / 2);
            }
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Refresh to play again', this.width / 2, this.height / 2 + 40);
        }
    }
    
    drawBeams() {
        for (const beam of this.beams) {
            this.ctx.fillStyle = beam.color;
            this.ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
        }
    }
    
    drawTimer() {
        // Convert milliseconds to seconds
        const seconds = Math.ceil(this.timeRemaining / 1000);
        
        // Draw timer background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.width / 2 - 30, 30, 60, 30);
        
        // Draw timer text
        this.ctx.fillStyle = seconds <= 10 ? 'red' : 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(seconds, this.width / 2, 55);
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
        this.attackType = null; // 'punch', 'kick', or 'beam'
        this.attackDamage = 0;
        this.attackCooldown = 0;
        this.attackHit = false;
        this.isBlocking = false;
        this.beamCooldown = 0;
        
        // New attack properties
        this.punchCooldown = 0;     // Shorter cooldown for punches
        this.kickCooldown = 0;      // Longer cooldown for kicks
        this.recoveryTime = 0;      // Recovery time after attacks (especially for kicks)
        this.comboCount = 0;        // For tracking punch combos
        this.lastPunchTime = 0;     // To track timing between punches for combos
        
        // Animation states
        this.state = 'idle'; // idle, walk, jump, crouch, punch, kick, hurt, block, beam
        this.frameCount = 0;
        
        // Visual elements for cuter appearance
        this.eyeSize = 8;
        this.mouthSize = 12;
        this.blushColor = this.color === 'blue' ? '#ADD8E6' : '#FFC0CB';
        this.expressionState = 'normal'; // normal, happy, angry, hurt
    }
    
    update(keys, deltaTime, opponent) {
        // Reset velocity X
        this.velocityX = 0;
        
        // Decrease cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        if (this.beamCooldown > 0) {
            this.beamCooldown--;
        }
        
        if (this.punchCooldown > 0) {
            this.punchCooldown--;
        }
        
        if (this.kickCooldown > 0) {
            this.kickCooldown--;
        }
        
        if (this.recoveryTime > 0) {
            this.recoveryTime--;
            this.expressionState = 'hurt'; // Show recovery expression
        } else if (this.state === 'hurt') {
            this.expressionState = 'normal';
        }
        
        // Reset combo count if too much time has passed since last punch
        if (this.comboCount > 0 && this.frameCount - this.lastPunchTime > 30) {
            this.comboCount = 0;
        }
        
        // Check for blocking first
        this.isBlocking = keys[this.controls.block];
        if (this.isBlocking) {
            this.state = 'block';
            this.expressionState = 'normal';
            // Can't move while blocking
            this.velocityX = 0;
        } else {
            // Handle movement only if not in recovery and not blocking
            if (this.recoveryTime === 0) {
                // Left movement
                if (keys[this.controls.left] && !this.isAttacking) {
                    this.velocityX = -MOVE_SPEED;
                    this.state = 'walk';
                    this.facingRight = false;
                }
                
                // Right movement
                if (keys[this.controls.right] && !this.isAttacking) {
                    this.velocityX = MOVE_SPEED;
                    this.state = 'walk';
                    this.facingRight = true;
                }
                
                // Jumping
                if (keys[this.controls.jump] && !this.isJumping && !this.isAttacking) {
                    this.velocityY = JUMP_FORCE;
                    this.isJumping = true;
                    this.state = 'jump';
                }
                
                // Crouching
                this.isCrouching = keys[this.controls.crouch] && !this.isJumping && !this.isAttacking;
                if (this.isCrouching) {
                    this.state = 'crouch';
                    this.velocityX = 0; // Can't move while crouching
                }
                
                // Attacking - Punch (fast, low damage, can combo)
                if (keys[this.controls.punch] && this.punchCooldown === 0 && !this.isAttacking) {
                    this.isAttacking = true;
                    this.attackType = 'punch';
                    
                    // Increase damage slightly with each combo hit (max 3 hits)
                    this.comboCount = Math.min(this.comboCount + 1, 3);
                    this.attackDamage = 5 + (this.comboCount * 2); // 7/9/11 damage based on combo
                    
                    this.punchCooldown = 10; // Very short cooldown for punch
                    this.attackCooldown = 10;
                    this.recoveryTime = 5; // Very short recovery
                    this.state = 'punch';
                    this.attackHit = false;
                    this.lastPunchTime = this.frameCount;
                    this.expressionState = 'angry';
                }
                
                // Attacking - Kick (slow, high damage, long recovery)
                if (keys[this.controls.kick] && this.kickCooldown === 0 && !this.isAttacking) {
                    this.isAttacking = true;
                    this.attackType = 'kick';
                    this.attackDamage = 20; // High damage
                    this.kickCooldown = 45; // Long cooldown
                    this.attackCooldown = 30;
                    this.recoveryTime = 25; // Long recovery time
                    this.state = 'kick';
                    this.attackHit = false;
                    this.comboCount = 0; // Reset combo count
                    this.expressionState = 'angry';
                }
                
                // Attacking - Beam
                if (keys[this.controls.beam] && this.beamCooldown === 0 && !this.isAttacking) {
                    this.attackType = 'beam';
                    this.state = 'beam';
                    this.beamCooldown = 60; // 60 frames cooldown for beam
                    this.recoveryTime = 15; // Medium recovery time
                    this.expressionState = 'angry';
                    
                    // Create a beam projectile
                    const beamWidth = 40;
                    const beamHeight = 10;
                    const beamY = this.y + this.height / 2 - beamHeight / 2;
                    const beamX = this.facingRight ? this.x + this.width : this.x - beamWidth;
                    const beamSpeed = this.facingRight ? 10 : -10;
                    
                    const beam = {
                        x: beamX,
                        y: beamY,
                        width: beamWidth,
                        height: beamHeight,
                        speed: beamSpeed,
                        damage: 20,
                        color: this.color === 'blue' ? '#00FFFF' : '#FF6347', // Cyan for blue player, tomato for red player
                        owner: this
                    };
                    
                    // Add beam to game's beam array
                    const game = window.game; // Access the game instance
                    if (game) {
                        game.beams.push(beam);
                    }
                }
                
                // Set to idle if no movement or action
                if (this.velocityX === 0 && !this.isJumping && !this.isCrouching && !this.isAttacking && !this.isBlocking && this.recoveryTime === 0) {
                    this.state = 'idle';
                    this.expressionState = 'normal';
                }
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
            this.expressionState = 'hurt';
        }
    }
    
    draw(ctx) {
        // Draw fighter body (rounded rectangle for cuter appearance)
        ctx.fillStyle = this.color;
        
        // Adjust height if crouching
        let drawHeight = this.height;
        let drawY = this.y;
        
        if (this.isCrouching) {
            drawHeight = this.height * 0.7;
            drawY = this.y + this.height * 0.3;
        }
        
        // Draw rounded rectangle body
        this.drawRoundedRect(ctx, this.x, drawY, this.width, drawHeight, 15);
        
        // Draw head (circle)
        const headRadius = this.width * 0.4;
        const headX = this.x + this.width / 2;
        const headY = drawY + headRadius;
        
        ctx.fillStyle = this.color === 'blue' ? '#6495ED' : '#FF6347'; // Lighter shade for head
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw face features based on expression state
        this.drawFace(ctx, headX, headY, headRadius);
        
        // Draw attack animation
        if (this.isAttacking) {
            if (this.attackType === 'punch') {
                // Draw punch (small, fast)
                ctx.fillStyle = 'yellow';
                const punchWidth = 20;
                const punchHeight = 15;
                const punchY = drawY + 30;
                
                if (this.facingRight) {
                    ctx.fillRect(this.x + this.width, punchY, punchWidth, punchHeight);
                } else {
                    ctx.fillRect(this.x - punchWidth, punchY, punchWidth, punchHeight);
                }
                
                // Draw punch effect (stars)
                ctx.fillStyle = 'white';
                if (this.facingRight) {
                    this.drawStar(ctx, this.x + this.width + punchWidth/2, punchY + punchHeight/2, 5, 3, 7);
                } else {
                    this.drawStar(ctx, this.x - punchWidth/2, punchY + punchHeight/2, 5, 3, 7);
                }
            } else if (this.attackType === 'kick') {
                // Draw kick (larger, stronger)
                ctx.fillStyle = 'orange';
                const kickWidth = 35;
                const kickHeight = 25;
                const kickY = drawY + 50;
                
                if (this.facingRight) {
                    ctx.fillRect(this.x + this.width, kickY, kickWidth, kickHeight);
                } else {
                    ctx.fillRect(this.x - kickWidth, kickY, kickWidth, kickHeight);
                }
                
                // Draw kick effect (impact lines)
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                if (this.facingRight) {
                    const impactX = this.x + this.width + kickWidth;
                    const impactY = kickY + kickHeight/2;
                    this.drawImpactLines(ctx, impactX, impactY);
                } else {
                    const impactX = this.x - kickWidth;
                    const impactY = kickY + kickHeight/2;
                    this.drawImpactLines(ctx, impactX, impactY);
                }
            }
        }
        
        // Draw blocking animation
        if (this.isBlocking) {
            ctx.fillStyle = 'white';
            ctx.globalAlpha = 0.5;
            const shieldWidth = 15;
            const shieldHeight = this.height * 0.8;
            const shieldY = this.y + this.height * 0.1;
            
            // Draw rounded shield
            if (this.facingRight) {
                this.drawRoundedRect(ctx, this.x + this.width, shieldY, shieldWidth, shieldHeight, 5);
            } else {
                this.drawRoundedRect(ctx, this.x - shieldWidth, shieldY, shieldWidth, shieldHeight, 5);
            }
            ctx.globalAlpha = 1.0;
        }
        
        // Draw combo counter if active
        if (this.comboCount > 1) {
            ctx.fillStyle = 'yellow';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.comboCount}x`, this.x + this.width / 2, this.y - 20);
        }
        
        // Draw state text for debugging (can be removed in final version)
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.state, this.x + this.width / 2, drawY - 10);
    }
    
    // Helper method to draw rounded rectangles
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
    
    // Helper method to draw face based on expression state
    drawFace(ctx, x, y, radius) {
        const eyeOffsetX = radius * 0.3;
        const eyeOffsetY = radius * 0.1;
        const eyeSize = this.eyeSize;
        
        // Draw blush
        ctx.fillStyle = this.blushColor;
        ctx.beginPath();
        ctx.arc(x - radius * 0.5, y + radius * 0.2, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + radius * 0.5, y + radius * 0.2, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes based on expression
        ctx.fillStyle = 'white';
        
        switch(this.expressionState) {
            case 'normal':
                // Normal eyes
                ctx.beginPath();
                ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeSize, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Eye pupils
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(x - eyeOffsetX + (this.facingRight ? 2 : -2), y - eyeOffsetY, eyeSize/2, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX + (this.facingRight ? 2 : -2), y - eyeOffsetY, eyeSize/2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'happy':
                // Happy eyes (closed, curved)
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeSize, Math.PI * 0.1, Math.PI * 0.9, false);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeSize, Math.PI * 0.1, Math.PI * 0.9, false);
                ctx.stroke();
                break;
                
            case 'angry':
                // Angry eyes (angled)
                ctx.beginPath();
                ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeSize, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Angry eyebrows
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - eyeOffsetX - eyeSize, y - eyeOffsetY - eyeSize);
                ctx.lineTo(x - eyeOffsetX + eyeSize, y - eyeOffsetY - eyeSize/2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + eyeOffsetX - eyeSize, y - eyeOffsetY - eyeSize/2);
                ctx.lineTo(x + eyeOffsetX + eyeSize, y - eyeOffsetY - eyeSize);
                ctx.stroke();
                
                // Red pupils
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(x - eyeOffsetX + (this.facingRight ? 2 : -2), y - eyeOffsetY, eyeSize/2, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX + (this.facingRight ? 2 : -2), y - eyeOffsetY, eyeSize/2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'hurt':
                // Hurt eyes (spiral)
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                this.drawSpiral(ctx, x - eyeOffsetX, y - eyeOffsetY, eyeSize);
                this.drawSpiral(ctx, x + eyeOffsetX, y - eyeOffsetY, eyeSize);
                break;
        }
        
        // Draw mouth based on expression
        switch(this.expressionState) {
            case 'normal':
                // Normal smile
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y + radius * 0.3, this.mouthSize, 0, Math.PI, false);
                ctx.stroke();
                break;
                
            case 'happy':
                // Big smile
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y + radius * 0.3, this.mouthSize * 1.5, 0, Math.PI, false);
                ctx.stroke();
                break;
                
            case 'angry':
                // Angry mouth (straight line)
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - this.mouthSize, y + radius * 0.4);
                ctx.lineTo(x + this.mouthSize, y + radius * 0.4);
                ctx.stroke();
                break;
                
            case 'hurt':
                // Hurt mouth (small 'o')
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(x, y + radius * 0.4, this.mouthSize/2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
    
    // Helper method to draw a star shape
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    // Helper method to draw impact lines
    drawImpactLines(ctx, x, y) {
        const lineLength = 15;
        
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const startX = x;
            const startY = y;
            const endX = x + Math.cos(angle) * lineLength;
            const endY = y + Math.sin(angle) * lineLength;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }
    
    // Helper method to draw spiral eyes
    drawSpiral(ctx, x, y, radius) {
        ctx.beginPath();
        let angle = 0;
        let r = radius;
        
        while (r > 0) {
            const newX = x + Math.cos(angle) * r;
            const newY = y + Math.sin(angle) * r;
            ctx.lineTo(newX, newY);
            angle += 0.5;
            r -= 0.5;
        }
        
        ctx.stroke();
    }
}

// Start the game when the page loads
window.onload = () => {
    window.game = new FightingGame();
};
