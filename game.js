const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = 1200;
canvas.height = 800;

const STATE_MENU = 'menu';
const STATE_GAME = 'game';
const STATE_GAMEOVER = 'gameover';

const baseAssets = {
    sky: 'sky.png',
    mountains: 'mountains.png',
    thirdPlanBg: 'third_plan.png',
    menuImg: 'menu.png',
    gameOverImg: 'gameover.png',
    gift: 'gift.png',
    firework: 'firework.png'
};

let images = {};

let bgMusic = new Audio('music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

let fireworkSound = new Audio('firework_sound.mp3');
fireworkSound.volume = 0.7;

let giftDropSound = new Audio('gift_drop_sound.mp3');
giftDropSound.volume = 0.8;

let hohohoSound = new Audio('hohoho.mp3');
let boomSound = new Audio('boom.mp3');

let isSantaAnimated = false;
let santaFrames = 1;
let santaFrameWidth = 0, santaFrameHeight = 0;
let santaFrame = 0, santaFrameTimer = 0, santaFrameInterval = 10;
let santaImage = null;

let isBalloonAnimated = false;
let balloonFrames = 1;
let balloonFrameWidth = 0, balloonFrameHeight = 0;
let balloonFrameInterval = 8;
let balloonImage = null;

let houseImages = [];
let firstPlanImages = [];
let secondPlanNonActiveImages = [];
let thirdPlanImages = [];
let balloonSetImages = [];
let cloudImages = [];

let gameState = STATE_MENU;
let nextState = null;

let santa = { x: 100, y: 200, speed: 5 };
let santaState = 'normal'; // normal, hit, exploding
let santaVy = 0;
let santaGravity = 0;

let gifts = [];
let fireworks = [];
let balloons = [];
let snowflakes = [];
let thirdPlanLine = [];
let cloudObjects = [];
let secondPlanLine = [];
let firstPlanLine = [];
let flyingGifts = [];

let score = 0;
let unhappyElves = 0; 
let isGameOver = false;
let canDropGift = true;
let gameStarted = false;
let highScore = 0;
let unhappyChildrenHouses = 0;

let mountainsX = 0;
let thirdPlanX = 0;
const CLOUDS_SPEED = 0.002; 
const MOUNTAINS_SPEED = 0.5;
const THIRDPLAN_SPEED = 1;
const FOREGROUND_SPEED = 1.5;
const SECOND_PLAN_SPEED = 2; // скорость второго плана, нужна для сдвига взрыва и подарков

let fadeAlpha = 0;
let fadeDirection = 0;
let fadeSpeed = 0.02;

let santaExplosionImage = new Image();
santaExplosionImage.src = 'santa_explosion.png';
let santaExplosionFrame = 0;
let santaExplosionFrameCount = 8; 
let santaExplosionTimer = 0;
let explosionX = 0;
let explosionY = 0;

async function tryLoadSanta() {
    return new Promise((resolve) => {
        const testImg = new Image();
        testImg.src = 'santa_anim.png';
        testImg.onload = () => {
            isSantaAnimated = true;
            santaImage = testImg;
            santaFrames = 6;
            santaFrameWidth = testImg.width / santaFrames;
            santaFrameHeight = testImg.height;
            resolve();
        };
        testImg.onerror = () => {
            const staticImg = new Image();
            staticImg.src = 'santa.png';
            staticImg.onload = () => {
                isSantaAnimated = false;
                santaImage = staticImg;
                santaFrameWidth = staticImg.width;
                santaFrameHeight = staticImg.height;
                resolve();
            };
            staticImg.onerror = () => {
                console.error('Не удалось загрузить ни santa_anim.png, ни santa.png!');
                resolve();
            };
        };
    });
}

async function tryLoadBalloon() {
    return new Promise((resolve) => {
        const testImg = new Image();
        testImg.src = 'balloon_anim.png';
        testImg.onload = () => {
            isBalloonAnimated = true;
            balloonImage = testImg;
            balloonFrames = 8;
            balloonFrameWidth = testImg.width / balloonFrames;
            balloonFrameHeight = testImg.height;
            resolve();
        };
        testImg.onerror = () => {
            const staticImg = new Image();
            staticImg.src = 'balloon.png';
            staticImg.onload = () => {
                isBalloonAnimated = false;
                balloonImage = staticImg;
                balloonFrameWidth = staticImg.width;
                balloonFrameHeight = staticImg.height;
                resolve();
            };
            staticImg.onerror = () => {
                console.error('Не удалось загрузить ни balloon_anim.png, ни balloon.png!');
                resolve();
            };
        };
    });
}

function startFadeOut(toState) {
    nextState = toState;
    fadeDirection = 1;
}
function startFadeIn() {
    fadeDirection = -1;
}
function updateFade() {
    if (fadeDirection !== 0) {
        fadeAlpha += fadeDirection * fadeSpeed;
        if (fadeAlpha < 0) {
            fadeAlpha = 0;
            fadeDirection = 0;
        } else if (fadeAlpha > 1) {
            fadeAlpha = 1;
            fadeDirection = 0;
            if (nextState !== null) {
                gameState = nextState;
                nextState = null;
                if (gameState === STATE_GAME) {
                    startGame();
                } else if (gameState === STATE_MENU) {
                    backToMenu();
                }
                startFadeIn();
            }
        }
    }
}
function drawFade() {
    if (fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function startGame() {
    gameState = STATE_GAME;
    gameStarted = true;
    resetGameState();
    bgMusic.play();
}

function backToMenu() {
    gameState = STATE_MENU;
    gameStarted = false;
    bgMusic.pause();
    bgMusic.currentTime = 0;
    resetGameState();
}

const keys = {};
document.addEventListener('keydown', (e) => (keys[e.key] = true));
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === ' ') canDropGift = true;
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (fadeDirection === 0) {
            if (gameState === STATE_MENU) {
                startFadeOut(STATE_GAME);
            } else if (gameState === STATE_GAMEOVER) {
                startFadeOut(STATE_MENU);
            }
        }
    }
});

function dropGift() {
    if (canDropGift && santaState === 'normal') {
        gifts.push({
            x: santa.x + santaFrameWidth/2 - images.gift.width / 2,
            y: santa.y + santaFrameHeight/2 - images.gift.height/2,
            image: images.gift,
            vy: -3, 
            gravity: 0.2
        });
        canDropGift = false;
        giftDropSound.currentTime = 0;
        giftDropSound.play();
    }
}

function generateFirework(x, y) {
    fireworks.push({
        x: x,
        y: y,
        frame: 0,
        frameTimer: 0
    });
    fireworkSound.currentTime = 0;
    fireworkSound.play();
}

function generateSnowflakes() {
    snowflakes = [];
    for (let i = 0; i < 200; i++) {
        snowflakes.push({
            x: Math.random() * canvas.width,
            y: -Math.random() * 50,
            speedY: 1 + Math.random() * 1.5,
            size: 2 + Math.random() * 3
        });
    }
}
function updateSnowflakes() {
    snowflakes.forEach(flake => {
        flake.y += flake.speedY;
        flake.x -= FOREGROUND_SPEED;
        if (flake.y > canvas.height || flake.x < -flake.size) {
            flake.x = Math.random() * canvas.width;
            flake.y = -flake.size;
        }
    });
}

function updateFireworks() {
    fireworks.forEach((f) => {
        f.x -= 2;
        f.y -= 3;
        f.frameTimer++;
        if (f.frameTimer % 5 === 0 && f.frame < 9) {
            f.frame++;
        }
    });
    fireworks = fireworks.filter(f => f.frame < 9);
}

function loadImageSet(prefix, arrayToPush) {
    for (let i = 1; i <= 15; i++) {
        const img = new Image();
        const src = `${prefix}${i}.png`;
        img.onload = () => {
            arrayToPush.push(img);
        };
        img.onerror = () => {};
        img.src = src;
    }
}

function generateCloud() {
    if (cloudImages.length === 0) return;
    let img = cloudImages[Math.floor(Math.random() * cloudImages.length)];
    let yPos = Math.random() * (canvas.height / 2);
    let speed = 0.5 + Math.random() * 1;
    cloudObjects.push({
        x: canvas.width,
        y: yPos,
        image: img,
        speed: speed
    });
}
function updateClouds() {
    if (cloudImages.length > 0 && Math.random() < CLOUDS_SPEED && santaState === 'normal') {
        generateCloud();
    }
    for (let i = cloudObjects.length - 1; i >= 0; i--) {
        let c = cloudObjects[i];
        c.x -= c.speed;
        if (c.x + c.image.width < 0) {
            cloudObjects.splice(i, 1);
        }
    }
}
function drawClouds() {
    cloudObjects.forEach(c => {
        ctx.drawImage(c.image, c.x, c.y);
    });
}

let lastThirdPlanX = 0;
function initThirdPlanLine() {
    lastThirdPlanX = 0;
    thirdPlanLine = [];
    let currentX = 0;
    while (currentX < canvas.width * 1.5) {
        if (thirdPlanImages.length === 0) break;
        let img = thirdPlanImages[Math.floor(Math.random() * thirdPlanImages.length)];
        thirdPlanLine.push({
            x: currentX,
            y: canvas.height - img.height,
            image: img,
            speed: 1.5
        });
        currentX += img.width;
        lastThirdPlanX = currentX;
    }
}
function updateThirdPlanLine() {
    for (let i = thirdPlanLine.length - 1; i >= 0; i--) {
        let obj = thirdPlanLine[i];
        obj.x -= obj.speed;
        if (obj.x + obj.image.width < 0) {
            thirdPlanLine.splice(i, 1);
        }
    }
    if (thirdPlanLine.length > 0) {
        let lastObj = thirdPlanLine[thirdPlanLine.length - 1];
        if (lastObj.x + lastObj.image.width < canvas.width * 1.5) {
            if (thirdPlanImages.length > 0) {
                let img = thirdPlanImages[Math.floor(Math.random() * thirdPlanImages.length)];
                thirdPlanLine.push({
                    x: lastObj.x + lastObj.image.width,
                    y: canvas.height - img.height,
                    image: img,
                    speed: 1.5
                });
            }
        }
    } else {
        initThirdPlanLine();
    }
}
function drawThirdPlanLine() {
    thirdPlanLine.forEach(obj => {
        ctx.drawImage(obj.image, obj.x, obj.y);
    });
}

let lastSecondPlanX = 0;
function pickSecondPlanObject() {
    let houseCount = houseImages.length;
    let secondCount = secondPlanNonActiveImages.length;
    if (houseCount === 0 && secondCount === 0) return null;

    let useHouse = true;
    if (houseCount > 0 && secondCount > 0) {
        useHouse = Math.random() < 0.5;
    } else if (houseCount === 0) {
        useHouse = false;
    }

    let img = null;
    let type = 'object';
    let children = 0;
    if (useHouse && houseCount > 0) {
        img = houseImages[Math.floor(Math.random() * houseCount)];
        type = 'house';
        children = Math.floor(Math.random() * 4) + 1;
    } else if (!useHouse && secondCount > 0) {
        img = secondPlanNonActiveImages[Math.floor(Math.random() * secondCount)];
        type = 'object';
        children = 0;
    }
    if (!img) return null;
    return {img, type, children};
}

function initSecondPlanLine() {
    lastSecondPlanX = 0;
    secondPlanLine = [];
    let currentX = 0;
    while (currentX < canvas.width * 1.5) {
        let res = pickSecondPlanObject();
        if (!res) break;
        secondPlanLine.push({
            x: currentX,
            y: canvas.height - res.img.height,
            image: res.img,
            speed: 2,
            type: res.type,
            children: res.children,
            fireworkLaunched: false
        });
        currentX += res.img.width;
        lastSecondPlanX = currentX;
    }
}

function updateSecondPlanLine() {
    for (let i = secondPlanLine.length - 1; i >= 0; i--) {
        let obj = secondPlanLine[i];
        obj.x -= obj.speed;
        if (obj.x + obj.image.width < 0) {
            if (obj.type === 'house' && obj.children > 0) {
                unhappyChildrenHouses += obj.children;
                if (unhappyChildrenHouses > 50) {
                    endGame();
                }
            }
            secondPlanLine.splice(i, 1);
        }
    }
    if (secondPlanLine.length > 0) {
        let lastObj = secondPlanLine[secondPlanLine.length - 1];
        if (lastObj.x + lastObj.image.width < canvas.width * 1.5) {
            let res = pickSecondPlanObject();
            if (res) {
                secondPlanLine.push({
                    x: lastObj.x + lastObj.image.width,
                    y: canvas.height - res.img.height,
                    image: res.img,
                    speed: 2,
                    type: res.type,
                    children: res.children,
                    fireworkLaunched: false
                });
            }
        }
    } else {
        initSecondPlanLine();
    }
}

function drawSecondPlanLine() {
    secondPlanLine.forEach(obj => {
        ctx.drawImage(obj.image, obj.x, obj.y);
        if (obj.type === 'house' && obj.children > 0) {
            ctx.fillStyle = 'yellow';
            ctx.font = '20px Arial';
            ctx.fillText(obj.children, obj.x + obj.image.width / 2, obj.y - 10);
        }
    });
}

let lastFirstPlanX = 0;
function initFirstPlanLine() {
    lastFirstPlanX = 0;
    firstPlanLine = [];
    let currentX = 0;
    while (currentX < canvas.width * 1.5) {
        if (firstPlanImages.length === 0) break;
        let img = firstPlanImages[Math.floor(Math.random() * firstPlanImages.length)];
        firstPlanLine.push({
            x: currentX,
            y: canvas.height - img.height,
            image: img,
            speed: 3
        });
        currentX += img.width;
        lastFirstPlanX = currentX;
    }
}

function updateFirstPlanLine() {
    for (let i = firstPlanLine.length - 1; i >= 0; i--) {
        let obj = firstPlanLine[i];
        obj.x -= obj.speed;
        if (obj.x + obj.image.width < 0) {
            firstPlanLine.splice(i, 1);
        }
    }
    if (firstPlanLine.length > 0) {
        let lastObj = firstPlanLine[firstPlanLine.length - 1];
        if (lastObj.x + lastObj.image.width < canvas.width * 1.5) {
            if (firstPlanImages.length > 0) {
                let img = firstPlanImages[Math.floor(Math.random() * firstPlanImages.length)];
                firstPlanLine.push({
                    x: lastObj.x + lastObj.image.width,
                    y: canvas.height - img.height,
                    image: img,
                    speed: 3
                });
            }
        }
    } else {
        initFirstPlanLine();
    }
}

function updateGifts() {
    for (let i = gifts.length - 1; i >= 0; i--) {
        let gift = gifts[i];
        gift.vy += gift.gravity;
        gift.y += gift.vy;
        if (gift.y > canvas.height) {
            unhappyElves++;
            if (unhappyElves >= 30) endGame();
            gifts.splice(i, 1);
        }
    }

    // Обновляем летающие подарки при взрыве
    // Они тоже должны двигаться со скоростью второго плана: x -= 2
    for (let i = flyingGifts.length - 1; i >= 0; i--) {
        let fg = flyingGifts[i];
        fg.vy += 0.2; 
        fg.x += fg.vx - SECOND_PLAN_SPEED; // смещаем на vx и на -2, чтобы двигалось с фоном
        fg.y += fg.vy;
        if (fg.x < -fg.image.width || fg.x > canvas.width + fg.image.width ||
            fg.y > canvas.height + fg.image.height) {
            flyingGifts.splice(i, 1);
        }
    }
}

function updateBalloons() {
    for (let i = balloons.length - 1; i >= 0; i--) {
        let balloon = balloons[i];
        balloon.x -= balloon.speed;
        balloon.y += balloon.directionY * 0.5;
        if (balloon.y <= 50 || balloon.y >= canvas.height - balloonFrameHeight - 50) balloon.directionY *= -1;

        if (isBalloonAnimated) {
            balloon.frameTimer++;
            if (balloon.frameTimer > balloonFrameInterval) {
                balloon.frameTimer = 0;
                balloon.frame++;
                if (balloon.frame >= balloonFrames) balloon.frame = 0;
            }
        }

        if (balloon.x + balloonFrameWidth < 0) {
            balloons.splice(i, 1);
        }
    }

    if (balloonImage && Math.random() < 0.005 && santaState === 'normal') {
        balloons.push({
            x: canvas.width + Math.random() * 200,
            y: Math.random() * 300 + 100,
            frame: 0,
            frameTimer: 0,
            speed: 2,
            directionY: Math.random() < 0.3 ? -1 : 1
        });
    }
}

function onSantaCollision() {
    if (santaState === 'normal') {
        santaState = 'hit';
        hohohoSound.currentTime = 0;
        hohohoSound.play();
        santaVy = -10;
        santaGravity = 0.5;
    }
}

function endGame() {
    isGameOver = true;
    if (score > highScore) {
        highScore = score;
    }
    bgMusic.pause();
    bgMusic.currentTime = 0;
    startFadeOut(STATE_GAMEOVER);
}

function checkCollisions() {
    // Подарки → объекты второго плана
    for (let gIndex = gifts.length - 1; gIndex >= 0; gIndex--) {
        let gift = gifts[gIndex];
        for (let obj of secondPlanLine) {
            if (
                gift.x < obj.x + obj.image.width &&
                gift.x + images.gift.width > obj.x &&
                gift.y < obj.y + obj.image.height &&
                gift.y + images.gift.height > obj.y
            ) {
                gifts.splice(gIndex, 1);
                if (obj.type === 'house') {
                    if (obj.children > 0) {
                        obj.children--;
                        score++; 
                        if (obj.children === 0 && !obj.fireworkLaunched) {
                            generateFirework(obj.x + obj.image.width/2, obj.y);
                            obj.fireworkLaunched = true;
                        }
                    }
                } else {
                    unhappyElves++;
                    if (unhappyElves >= 30) endGame();
                }
                break;
            }
        }
    }

    if (santaState !== 'normal') return;

    let santaOffsetX = 20;
    let santaOffsetY = 10;
    let santaHitW = santaFrameWidth - santaOffsetX * 2;
    let santaHitH = santaFrameHeight - santaOffsetY * 2;

    for (let obj of secondPlanLine) {
        if (
            (santa.x + santaOffsetX) < obj.x + obj.image.width &&
            (santa.x + santaOffsetX + santaHitW) > obj.x &&
            (santa.y + santaOffsetY) < obj.y + obj.image.height &&
            (santa.y + santaOffsetY + santaHitH) > obj.y
        ) {
            onSantaCollision();
        }
    }

    let balloonW = balloonFrameWidth;
    let balloonH = balloonFrameHeight;
    for (let balloon of balloons) {
        if (
            (santa.x + santaOffsetX) < balloon.x + balloonW &&
            (santa.x + santaOffsetX + santaHitW) > balloon.x &&
            (santa.y + santaOffsetY) < balloon.y + balloonH &&
            (santa.y + santaOffsetY + santaHitH) > balloon.y
        ) {
            onSantaCollision();
        }
    }
}

function update() {
    updateFade();
    if (gameState !== STATE_GAME || !gameStarted || isGameOver) return;

    if (santaState === 'normal') {
        if (keys['ArrowUp'] && santa.y > 0) santa.y -= santa.speed;
        if (keys['ArrowDown'] && santa.y + santaFrameHeight < canvas.height) santa.y += santa.speed;
        if (keys['ArrowLeft'] && santa.x > 0) santa.x -= santa.speed;
        if (keys['ArrowRight'] && santa.x + santaFrameWidth < canvas.width) santa.x += santa.speed;
        if (keys[' ']) dropGift();
    } else if (santaState === 'hit') {
        santaVy += santaGravity;
        santa.y += santaVy;
        if (santa.y > canvas.height) {
            // Взрыв там, где Санта пересёк край
            explosionX = santa.x;
            explosionY = canvas.height; 
            santaState = 'exploding';
            boomSound.currentTime = 0;
            boomSound.play();
            santaExplosionFrame = 0;
            santaExplosionTimer = 0;

            // Превращаем все оставшиеся подарки в flyingGifts
            flyingGifts = [];
            for (let gift of gifts) {
                flyingGifts.push({
                    x: explosionX,
                    y: explosionY,
                    image: gift.image,
                    vx: (Math.random()-0.5)*6, 
                    vy: -3 - Math.random()*3
                });
            }
            gifts = [];
        }
    } else if (santaState === 'exploding') {
        // Замедляем анимацию взрыва: каждые 15 тиков
        santaExplosionTimer++;
        if (santaExplosionTimer > 8) {
            santaExplosionTimer = 0;
            santaExplosionFrame++;
            if (santaExplosionFrame >= santaExplosionFrameCount) {
                endGame();
            }
        }

        // Взрыв двигается со скоростью второго плана
        explosionX -= SECOND_PLAN_SPEED;

        // Летающие подарки тоже двигаются (уже учтено в updateGifts)
    }

    mountainsX -= MOUNTAINS_SPEED; if (mountainsX <= -canvas.width) mountainsX = 0;
    thirdPlanX -= THIRDPLAN_SPEED; if (thirdPlanX <= -canvas.width) thirdPlanX = 0;

    updateGifts();
    updateBalloons();
    updateClouds();
    updateThirdPlanLine();
    updateSecondPlanLine();
    updateFirstPlanLine();
    updateSnowflakes();
    updateFireworks();

    if (isSantaAnimated && santaState === 'normal') {
        santaFrameTimer++;
        if (santaFrameTimer > santaFrameInterval) {
            santaFrameTimer = 0;
            santaFrame++;
            if (santaFrame >= santaFrames) santaFrame = 0;
        }
    }

    if (santaState === 'normal') checkCollisions();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!images.sky || !images.mountains || !images.thirdPlanBg || !images.menuImg || !images.gameOverImg || !images.gift || !images.firework || !santaImage) {
        drawLoadingScreen();
        drawFade();
        return;
    }

    ctx.drawImage(images.sky, 0, 0, canvas.width, canvas.height);
    drawClouds();

    ctx.drawImage(images.mountains, mountainsX, 0, canvas.width, canvas.height);
    ctx.drawImage(images.mountains, mountainsX + canvas.width, 0, canvas.width, canvas.height);

    ctx.drawImage(images.thirdPlanBg, thirdPlanX, 0, canvas.width, canvas.height);
    ctx.drawImage(images.thirdPlanBg, thirdPlanX + canvas.width, 0, canvas.width, canvas.height);
    drawThirdPlanLine();

  balloons.forEach((balloon) => {
        if (isBalloonAnimated) {
            ctx.drawImage(
                balloonImage,
                balloon.frame * balloonFrameWidth, 0,
                balloonFrameWidth, balloonFrameHeight,
                balloon.x, balloon.y,
                balloonFrameWidth, balloonFrameHeight
            );
        } else {
            ctx.drawImage(balloonImage, balloon.x, balloon.y);
        }
    });

    drawSecondPlanLine();

    

  

    fireworks.forEach((firework) => {
        if (firework.frame < 9) {
            ctx.drawImage(
                images.firework,
                firework.frame * 128,
                0,
                128,
                128,
                firework.x - 64,
                firework.y - 64,
                128,
                128
            );
        }
    });

    if (santaState === 'exploding') {
        let frameW = santaExplosionImage.width / santaExplosionFrameCount;
        let frameH = santaExplosionImage.height;
        // Взрыв отрисовываем так, чтобы нижний край взрыва совпадал с explosionY
        ctx.drawImage(
            santaExplosionImage,
            santaExplosionFrame * frameW, 0,
            frameW, frameH,
            explosionX - frameW/2, explosionY - frameH, // нижний край в explosionY
            frameW, frameH
        );
    } else if (santaState !== 'exploding') {
        if (isSantaAnimated && santaState === 'normal') {
            ctx.drawImage(
                santaImage,
                santaFrame * santaFrameWidth, 0,
                santaFrameWidth, santaFrameHeight,
                santa.x, santa.y,
                santaFrameWidth, santaFrameHeight
            );
        } else {
            ctx.drawImage(santaImage, santa.x, santa.y);
        }
    }

// Обычные подарки
    gifts.forEach((gift) => {
        ctx.drawImage(gift.image, gift.x, gift.y);
    });

    // Летающие подарки
    for (let fg of flyingGifts) {
        ctx.drawImage(fg.image, fg.x, fg.y);
    }

    firstPlanLine.forEach(obj => {
        ctx.drawImage(obj.image, obj.x, obj.y);
    });

    if (gameState === STATE_GAME) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Happy Children: ${score}`, 10, 30);
        ctx.fillText(`Unhappy Elves: ${unhappyElves}`, 10, 60);
        ctx.fillText(`Дети без подарка: ${unhappyChildrenHouses}`, 10, 90);
    }

    ctx.fillStyle = 'white';
    snowflakes.forEach(flake => {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
    });

    if (gameState === STATE_MENU) {
        drawMenuScreen();
    }

    if (gameState === STATE_GAMEOVER) {
        drawGameOverScreen();
    }

    drawFade();
}

function drawLoadingScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Loading...', canvas.width / 2 - 50, canvas.height / 2);
}

function drawMenuScreen() {
    const img = images.menuImg;
    const centerX = canvas.width/2;
    const centerY = canvas.height/2;
    ctx.drawImage(img, centerX - img.width/2, centerY - img.height/2 );

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Use Arrow keys to move Santa', centerX - 130, centerY);
    ctx.fillText('Press Space to drop gifts', centerX - 120, centerY + 30);
    ctx.fillText('Press ENTER to start', centerX - 100, centerY + 60);
    if (highScore > 0) {
        ctx.fillText(`High Score: ${highScore}`, centerX - 70, centerY + 90);
    }
}

function drawGameOverScreen() {
    const img = images.gameOverImg;
    const centerX = canvas.width/2;
    const centerY = canvas.height/2;
    ctx.drawImage(img, centerX - img.width/2, centerY - img.height/2 );
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText(`Your Score: ${score}`, centerX - 80, centerY + 0);
    ctx.fillText(`High Score: ${highScore}`, centerX - 80, centerY + 30);

    ctx.font = '20px Arial';
    ctx.fillText('Press ENTER to return to menu', centerX - 130, centerY + 90);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Credits', centerX - 20, centerY + 280);
    ctx.font = '18px Arial';
    ctx.fillText('Alexander Bormotov', centerX - 65, centerY + 310);
    ctx.fillText('Iliya Bormotov', centerX - 40, centerY + 330);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('v.1.0.2024', centerX - 20, centerY + 390);
}

function resetGameState() {
    santa = { x: 100, y: 200, speed: 5 };
    santaState = 'normal';
    santaVy = 0;
    santaGravity = 0;

    gifts = [];
    fireworks = [];
    balloons = [];
    snowflakes = [];
    thirdPlanLine = [];
    cloudObjects = [];
    secondPlanLine = [];
    firstPlanLine = [];
    flyingGifts = [];

    mountainsX = 0;
    thirdPlanX = 0;

    score = 0;
    unhappyElves = 0;
    unhappyChildrenHouses = 0;
    isGameOver = false;
    canDropGift = true;

    generateSnowflakes();
    initThirdPlanLine();
    initSecondPlanLine();
    initFirstPlanLine();
}

function loadBaseAssets() {
    return new Promise((resolve) => {
        const keys = Object.keys(baseAssets);
        let loadedCount = 0;
        keys.forEach((key) => {
            const img = new Image();
            img.src = baseAssets[key];
            img.onload = () => {
                images[key] = img;
                loadedCount++;
                if (loadedCount === keys.length) resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load: ${baseAssets[key]}`);
                loadedCount++;
                if (loadedCount === keys.length) resolve();
            };
        });
    });
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

async function init() {
    drawLoadingScreen();
    await loadBaseAssets();
    await tryLoadSanta();
    await tryLoadBalloon();

    loadImageSet('house_', houseImages);
    loadImageSet('first_plan_obj', firstPlanImages);
    loadImageSet('second_plan_obj', secondPlanNonActiveImages);
    loadImageSet('third_plan_obj', thirdPlanImages);
    loadImageSet('balloon_', balloonSetImages);
    loadImageSet('cloud_', cloudImages);

    gameLoop();
}

init();
