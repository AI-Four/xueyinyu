import { _decorator, Component, Node, Sprite, SpriteFrame, resources, Label, Button, Vec3, tween, UITransform, Layers, Color, director, Canvas, Graphics } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    private _snowballFrames: { [key: string]: SpriteFrame } = {};
    private _throwCount: number = 0;
    private _snowballs: Node[] = [];
    private _successLabel: Label | null = null;
    private _throwBtnNode: Node | null = null;

    private _kidNode: Node | null = null;
    private _kidArmNode: Node | null = null;
    
    private _snowmanParts: Node[] = []; // Store snowman parts [Head, Middle, Bottom]
    private _snowmanHitCount: number = 0; // Track how many times snowman has been hit

    start() {
        this.loadAssets();
    }

    loadAssets() {
        // Only load background image, snowman will be drawn by code
        resources.load('winter_background/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (err) {
                 resources.load('winter_background', SpriteFrame, (err2, spriteFrame2) => {
                    if (!err2) {
                        this._snowballFrames['winter_background'] = spriteFrame2!;
                    }
                    this.setupUI();
                 });
                 return;
            }
            this._snowballFrames['winter_background'] = spriteFrame!;
            this.setupUI();
        });
    }

    setupUI() {
        const canvas = director.getScene()?.getComponentInChildren(Canvas)?.node;
        if (!canvas) return;
        
        // Cleanup old UI
        const nodesToHide = ['TipsLabel', 'PalyButton', 'OptionBtn1', 'OptionBtn2', 'OptionBtn3', 'Label']; 
        nodesToHide.forEach(name => {
            const node = canvas.getChildByName(name);
            if (node) node.active = false;
        });
        
        canvas.children.forEach(c => {
            if (c.name.startsWith('OptionBtn') || c.name === 'TipsLabel' || c.name === 'PalyButton') {
                c.active = false;
            }
        });

        // Add Background
        if (this._snowballFrames['winter_background']) {
            let bgNode = canvas.getChildByName('GameBackground');
            if (!bgNode) {
                bgNode = new Node('GameBackground');
                canvas.insertChild(bgNode, 0); 
            }
            const sprite = bgNode.getComponent(Sprite) || bgNode.addComponent(Sprite);
            sprite.spriteFrame = this._snowballFrames['winter_background'];
            bgNode.layer = Layers.Enum.UI_2D;
            bgNode.setScale(1.5, 1.5, 1); 
        }

        // Create Kid Character
        this.createKid(canvas);

        // Create Full Snowman (Blocking the Path)
        this.createFullSnowman(canvas);

        // Create Throw Button
        if (!this._throwBtnNode) {
            this._throwBtnNode = new Node('ThrowButton');
            this._throwBtnNode.layer = Layers.Enum.UI_2D;
            this._throwBtnNode.setPosition(500, 300); // Top-Right
            canvas.addChild(this._throwBtnNode);

            const btnLabelNode = new Node('Label');
            btnLabelNode.layer = Layers.Enum.UI_2D;
            const btnLabel = btnLabelNode.addComponent(Label);
            btnLabel.string = 'Throw Snowball';
            btnLabel.fontSize = 40;
            btnLabel.lineHeight = 50;
            btnLabel.color = Color.BLACK; 
            this._throwBtnNode.addChild(btnLabelNode);

            const btnComp = this._throwBtnNode.addComponent(Button);
            btnComp.transition = Button.Transition.SCALE;
            this._throwBtnNode.on(Button.EventType.CLICK, this.onThrow, this);
        }

        // Create Success Label
        if (!this._successLabel) {
            const successNode = new Node('SuccessLabel');
            successNode.layer = Layers.Enum.UI_2D;
            successNode.setPosition(0, 200);
            canvas.addChild(successNode);
            
            this._successLabel = successNode.addComponent(Label);
            this._successLabel.string = '成功了，太棒了!';
            this._successLabel.fontSize = 60;
            this._successLabel.color = Color.RED; 
            successNode.active = false;
        }
    }

    createKid(parent: Node) {
        if (this._kidNode) return;

        this._kidNode = new Node('Kid');
        this._kidNode.layer = Layers.Enum.UI_2D;
        this._kidNode.setPosition(-400, -200); // Bottom Left
        parent.addChild(this._kidNode);

        const g = this._kidNode.addComponent(Graphics);
        g.lineWidth = 2;
        g.strokeColor = Color.BLACK;

        // Legs
        g.fillColor = new Color(50, 50, 150); // Blue pants
        g.rect(-20, -100, 15, 60);
        g.rect(5, -100, 15, 60);
        g.fill();
        g.stroke();

        // Body (Coat)
        g.fillColor = new Color(200, 50, 50); // Red coat
        g.roundRect(-30, -40, 60, 70, 10);
        g.fill();
        g.stroke();

        // Head
        g.fillColor = new Color(255, 220, 180); // Skin
        g.circle(0, 50, 30);
        g.fill();
        g.stroke();

        // Eyes
        g.fillColor = Color.BLACK;
        g.circle(10, 55, 3); // Looking right
        g.fill();

        // Hat
        g.fillColor = new Color(50, 50, 150); // Blue hat
        g.moveTo(-32, 65);
        g.lineTo(32, 65);
        g.lineTo(0, 100);
        g.close();
        g.fill();
        g.stroke();

        // Scarf
        g.fillColor = new Color(50, 150, 50); // Green scarf
        g.rect(-25, 20, 50, 15);
        g.fill();
        g.stroke();

        // Arm (Separate Node for rotation)
        this._kidArmNode = new Node('KidArm');
        this._kidArmNode.layer = Layers.Enum.UI_2D;
        this._kidArmNode.setPosition(20, 10); // Shoulder position
        this._kidNode.addChild(this._kidArmNode);

        const armG = this._kidArmNode.addComponent(Graphics);
        armG.lineWidth = 2;
        armG.strokeColor = Color.BLACK;
        
        // Arm shape (drawn relative to pivot at 0,0)
        armG.fillColor = new Color(200, 50, 50); // Red sleeve
        armG.roundRect(-5, -5, 40, 15, 5); // Arm pointing right
        armG.fill();
        armG.stroke();

        // Hand
        armG.fillColor = new Color(255, 220, 180); // Skin
        armG.circle(40, 2, 8);
        armG.fill();
        armG.stroke();
    }

    onThrow() {
        // Can't throw if snowman is already destroyed
        if (this._snowmanHitCount >= 3) {
             this.resetGame();
             return;
        }

        // Animate Throw
        if (this._kidArmNode) {
            // Wind up
            tween(this._kidArmNode)
                .to(0.2, { angle: 45 }) // Raise arm
                .to(0.1, { angle: -20 }) // Throw forward
                .call(() => {
                    this.throwProjectileSnowball();
                })
                .to(0.2, { angle: 0 }) // Return to idle
                .start();
        } else {
            this.throwProjectileSnowball();
        }
    }

    createFullSnowman(parent: Node) {
        // Create complete snowman in the center-right of screen
        const snowmanX = 200;
        
        // Bottom part
        const bottom = this.createSnowmanPart('bottom');
        bottom.setPosition(snowmanX, -150);
        parent.addChild(bottom);
        
        // Middle part
        const middle = this.createSnowmanPart('middle');
        middle.setPosition(snowmanX, -50);
        parent.addChild(middle);
        
        // Head part
        const head = this.createSnowmanPart('head');
        head.setPosition(snowmanX, 30);
        parent.addChild(head);
        
        // Store parts for destruction (destroy from top to bottom)
        this._snowmanParts = [head, middle, bottom];
    }

    throwProjectileSnowball() {
        const canvas = director.getScene()?.getComponentInChildren(Canvas)?.node;
        if (!canvas) return;
        if (this._snowmanParts.length === 0) return;

        // Create a small projectile snowball
        const projectile = new Node('Projectile');
        projectile.layer = Layers.Enum.UI_2D;
        const g = projectile.addComponent(Graphics);
        g.fillColor = Color.WHITE;
        g.strokeColor = new Color(200, 200, 255);
        g.lineWidth = 2;
        g.circle(0, 0, 15); // Small snowball
        g.fill();
        g.stroke();
        
        // Start from kid's hand
        projectile.setPosition(-340, -190);
        canvas.addChild(projectile);

        // Target the next snowman part to destroy
        const targetPart = this._snowmanParts[0];
        const targetPos = targetPart.getPosition();
        
        // Animate projectile flying to target
        tween(projectile)
            .to(0.6, { position: new Vec3(targetPos.x, targetPos.y, 0) }, { easing: 'quadOut' })
            .call(() => {
                // Hit the snowman!
                this.onSnowballHit();
                projectile.destroy();
            })
            .start();
    }

    onSnowballHit() {
        if (this._snowmanParts.length === 0) return;
        
        // Destroy the next part (from top to bottom)
        const partToDestroy = this._snowmanParts.shift()!;
        this.shatterNode(partToDestroy);
        
        this._snowmanHitCount++;
        
        // Check if all parts destroyed
        if (this._snowmanParts.length === 0) {
            this.onLevelPass();
        }
    }

    shatterNode(targetNode: Node) {
        const pos = targetNode.getPosition();
        const parent = targetNode.parent;
        
        // Hide the original node
        targetNode.active = false;
        
        // Create shards
        const shardCount = 10;
        for (let i = 0; i < shardCount; i++) {
            const shard = new Node(`Shard_${i}`);
            shard.layer = Layers.Enum.UI_2D;
            shard.setPosition(pos.x, pos.y);
            parent?.addChild(shard);
            
            const g = shard.addComponent(Graphics);
            g.fillColor = Color.WHITE;
            g.strokeColor = new Color(200, 200, 255);
            g.lineWidth = 1;
            
            // Random irregular shape
            const size = 10 + Math.random() * 15;
            g.moveTo(0, 0);
            g.lineTo(size, size * 0.3);
            g.lineTo(size * 0.7, size);
            g.close();
            g.fill();
            g.stroke();
            
            // Random velocity
            const angle = (Math.PI * 2 * i / shardCount) + (Math.random() - 0.5) * 0.5;
            const speed = 80 + Math.random() * 60;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Animate: fly out, fall down, fade out
            tween(shard)
                .by(0.8, { 
                    position: new Vec3(vx, vy - 100, 0) // Gravity effect
                }, { easing: 'quadOut' })
                .start();
            
            // Rotate randomly
            tween(shard)
                .by(0.8, { angle: (Math.random() - 0.5) * 360 })
                .start();
            
            // Fade out and destroy
            const sprite = shard.addComponent(Sprite);
            tween(sprite)
                .to(0.8, { color: new Color(255, 255, 255, 0) })
                .call(() => shard.destroy())
                .start();
        }
        
        // Destroy original node after delay
        this.scheduleOnce(() => {
            targetNode.destroy();
        }, 1);
    }

    onLevelPass() {
        if (this._successLabel) {
            this._successLabel.node.active = true;
        }
        const label = this._throwBtnNode?.getComponentInChildren(Label);
        if (label) label.string = 'Play Again';
    }

    createSnowmanPart(type: string): Node {
        const node = new Node(`Snowman_${type}`);
        node.layer = Layers.Enum.UI_2D;
        const g = node.addComponent(Graphics);
        g.lineWidth = 2;
        g.strokeColor = new Color(200, 200, 255); // Light blue stroke
        g.fillColor = Color.WHITE;

        if (type === 'bottom') {
            // Big circle
            g.circle(0, 0, 80);
            g.fill();
            g.stroke();
        } else if (type === 'middle') {
            // Medium circle
            g.circle(0, 0, 60);
            g.fill();
            g.stroke();

            // Buttons
            g.fillColor = Color.BLACK;
            g.circle(0, 20, 5);
            g.circle(0, 0, 5);
            g.circle(0, -20, 5);
            g.fill();
        } else if (type === 'head') {
            // Small circle
            g.circle(0, 0, 45);
            g.fillColor = Color.WHITE;
            g.fill();
            g.stroke();

            // Eyes
            g.fillColor = Color.BLACK;
            g.circle(-15, 10, 4);
            g.circle(15, 10, 4);
            g.fill();

            // Nose (Orange Triangle)
            g.fillColor = new Color(255, 165, 0); // Orange
            g.moveTo(-5, 0);
            g.lineTo(15, -5); // Pointing right
            g.lineTo(-5, -10);
            g.close();
            g.fill();

            // Mouth (Arc)
            g.strokeColor = Color.BLACK;
            g.lineWidth = 2;
            g.arc(0, -10, 15, Math.PI, 2 * Math.PI, true); // Smile
            g.stroke();
        }

        return node;
    }



    resetGame() {
        // Destroy old snowman parts if any
        this._snowmanParts.forEach(n => n.destroy());
        this._snowmanParts = [];
        this._snowmanHitCount = 0;
        
        // Recreate snowman
        const canvas = director.getScene()?.getComponentInChildren(Canvas)?.node;
        if (canvas) {
            this.createFullSnowman(canvas);
        }
        
        if (this._successLabel) this._successLabel.node.active = false;
        
        const label = this._throwBtnNode?.getComponentInChildren(Label);
        if (label) label.string = 'Throw Snowball';
    }
}
