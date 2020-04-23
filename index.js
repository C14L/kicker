// DOM elements
const elems = {
    bars: document.querySelectorAll("#table > .bar"),
    goals: document.querySelectorAll("#table > .goal"),
    players: document.querySelectorAll("#table > .bar > .player"),
    table: document.querySelector("#table"),
    ball: document.querySelector("#table > .ball"),
    numbers: {
        websocket: document.querySelector("#numbers > .websocket"),
        players: document.querySelector("#numbers > .players"),
        velocity: {
            t: document.querySelector("#numbers > .velocity > .t"),
            x: document.querySelector("#numbers > .velocity > .x"),
            y: document.querySelector("#numbers > .velocity > .y"),
        },
    },
};

const settings = {
    gameId: location.pathname.substr(1).split('/')[0],
    userId: location.pathname.substr(1).split('/')[1],
    isServer: false,
    drag: 0.8,
    ballReset: { vx: 0, vy: 0, ax: 1.0, ay: 0 },
    ball: { vx: Math.random() * 20, vy: Math.random() * 20, ax: 0.995, ay: 0.995 },
};

let syncOkCount = 0;
ws = new WebSocket("ws://localhost:8000/");
ws.addEventListener('open', handleWebsocketOpen);
ws.addEventListener('message', handleWebsocketMessage);

function handleWebsocketOpen(event) {
    // console.log(event.data);
    elems.numbers.websocket.style.backgroundColor = 'yellow';
    ws.send(JSON.stringify({
        "action": "register",
        "game": settings.gameId,
        "user": settings.userId,
    }));
}

function handleWebsocketMessage(event) {
    // console.log(event.data);
    let response = JSON.parse(event.data);

    if (response.action == "sync") {
        settings.ball = response.ball;
        settings.players = response.players;
        ws.send(JSON.stringify({"action": "syncok"}));
    }

    if (response.action == "syncok") {
        syncOkCount++;
        elems.numbers.websocket.style.innerHTML = syncOkCount;
        if (settings.isServer && syncOkCount == 4) {
            ws.send(JSON.stringify({"action": "play"}));
        }
    }

    if (response.action == "play") {
        elems.numbers.websocket.style.backgroundColor = 'green';
        play().then(result => { alert("Goal for " + result); });
    }

    if (response.action == "playerlist") {
        elems.numbers.players.innerHTML = response.playerlist.join(", ");
        if (response.playerlist.length == 1) {
            settings.isServer = true;
        } else if (response.playerlist.length == 4) {
            if (settings.isServer) {
                ws.send(JSON.stringify({
                    "action": "sync",
                    "ball": settings.ball,
                    "players": {},  // TODO
                }));
            }
        } else {
            console.log("Waiting for more players:", response.playerlist);
        }
    }
}

const table = elems.table.getBoundingClientRect();
const goal = elems.goals[0].getBoundingClientRect();
const mapBarPlayer = {
    0: [0],
    1: [1, 2],
    2: [3, 4, 5],
    3: [6, 7, 8, 9,10],
    4: [11, 12, 13, 14, 15],
    5: [16, 17, 18],
    6: [19, 20],
    7: [21],
};

const barsLimits = [
    [
        table.top - elems.players[mapBarPlayer[0][0]].getBoundingClientRect().top,
        table.bottom - elems.players[mapBarPlayer[0][mapBarPlayer[0].length-1]].getBoundingClientRect().bottom,
    ],
    [
        table.top - elems.players[mapBarPlayer[1][0]].getBoundingClientRect().top,
        table.bottom - elems.players[mapBarPlayer[1][mapBarPlayer[1].length-1]].getBoundingClientRect().bottom,
    ],
    [
        table.top - elems.players[mapBarPlayer[2][0]].getBoundingClientRect().top,
        table.bottom - elems.players[mapBarPlayer[2][mapBarPlayer[2].length-1]].getBoundingClientRect().bottom,
    ],
];


/* Activate a kick against a close ball. */
const kickBars = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
const kickSpeed = [10, 10];

const playerMovement = { "up": -2, "down": 2 };
const playerBars = { "left": 0, "right": 1 }; /* This player's own bars controlled with "left" and "right" hand. */

const playerRadius = elems.players[0].offsetWidth / 2;
const ballRadius = elems.ball.offsetWidth / 2;

let leftMoveUpInterval = false;
let leftMoveDownInterval = false;
let rightMoveUpInterval = false;
let rightMoveDownInterval = false;

function playerMovementIncr() {
    playerMovement.up *= 1.01;
    playerMovement.down *= 1.01;
}

function playerMovementReset() {
    playerMovement.up = -2;
    playerMovement.down = 2;
}

function handleKeyUp(event) {
    if (event.key == "w") { clearInterval(leftMoveUpInterval); leftMoveUpInterval = false; playerMovementReset(); }
    if (event.key == "x") { clearInterval(leftMoveDownInterval); leftMoveDownInterval = false; playerMovementReset(); }
    if (event.key == "o") { clearInterval(rightMoveUpInterval); rightMoveUpInterval = false; playerMovementReset(); }
    if (event.key == "m") { clearInterval(rightMoveDownInterval); rightMoveDownInterval = false; playerMovementReset(); }
}

function handleKeyDown(event) {
    if (event.key == "w" && !leftMoveUpInterval) leftMoveUpInterval = setInterval(() => { moveBar(playerBars.left, "up"); playerMovementIncr(); });
    if (event.key == "s") { kickBars[playerBars.left] = 1; setTimeout(() => { kickBars[playerBars.left] = 0; }, 200); }
    if (event.key == "x" && !leftMoveDownInterval) leftMoveDownInterval = setInterval(() => { moveBar(playerBars.left, "down"); playerMovementIncr(); });
    if (event.key == "o" && !rightMoveUpInterval) rightMoveUpInterval = setInterval(() => { moveBar(playerBars.right, "up"); playerMovementIncr(); });
    if (event.key == "k") { kickBars[playerBars.right] = 1; setTimeout(() => { kickBars[playerBars.right] = 0; }, 200); }
    if (event.key == "m" && !rightMoveDownInterval) rightMoveDownInterval = setInterval(() => { moveBar(playerBars.right, "down"); playerMovementIncr(); });
}

window.addEventListener("keyup", handleKeyUp);
window.addEventListener("keydown", handleKeyDown);

class Ball {
    constructor() {
        this.reset();
    }
    reset() {
        this.goalHit = false;
        this.stop = false;
        this.x = table.left + ballRadius;
        this.y = table.top + ballRadius;
        this.xMin = table.left + ballRadius;
        this.yMin = table.top + ballRadius;
        this.xMax = table.right - ballRadius;
        this.yMax = table.bottom - ballRadius;
        this.vx = settings.ballReset.vx;
        this.vy = settings.ballReset.vy;
        this.ax = settings.ballReset.ax;  // 1=constant velocity
        this.ay = settings.ballReset.ay;  // 1=constant velocity
    }
    start(team) {
        // randomly throw the ball onto the field
        this.vx = settings.ball.vx;
        this.vy = settings.ball.vy;
        this.ax = settings.ball.ax;
        this.ay = settings.ball.ay;
    }
    get vt() {
        let vt = Math.sqrt(this.vx**2 + this.vy**2);
        return vt;
    }
    move() {
        if (this.goalHit) return;
        if (this.vt < 0.15) { this.ax = 0; this.ay = 0; }
        this.vx *= this.ax;
        this.vy *= this.ay;
        this.x += this.vx;
        this.y += this.vy;
    }
    draw() {
        elems.ball.style.left = this.x - ballRadius + "px";
        elems.ball.style.top = this.y - ballRadius + "px";
    }
}

function moveBar(barIndex, dir) {
    const newTop = elems.bars[barIndex].getBoundingClientRect().top + playerMovement[dir];
    if (dir == "up" && newTop < barsLimits[barIndex][0]) return;
    if (dir == "down" && newTop > barsLimits[barIndex][1]) return;
    requestAnimationFrame(() => elems.bars[barIndex].style.top = newTop + "px");
}

function getCenterXY(el) {
    const b = el.getBoundingClientRect();
    return [b.left + (b.width / 2), b.top + (b.height / 2)];
}

function play() {
    return new Promise((resolve, reject) => {
        let ball = new Ball();
        let animationInterval = null;
        let collission = null;

        ball.start();

        animationInterval = setInterval(() => {
            if ( ball.stop ) {
                clearInterval(animationInterval);
                animationInterval = null;
            }

            requestAnimationFrame(() => {
                elems.numbers.velocity.t.innerHTML = Math.round(ball.vt * 10000) / 10000;
                elems.numbers.velocity.x.innerHTML = Math.round(ball.x * 10000) / 10000;
                elems.numbers.velocity.y.innerHTML = Math.round(ball.y * 10000) / 10000;

                const pos = getCenterXY(elems.ball);
                elems.ball.innerHTML =  Math.round(pos[0]) + " " + Math.round(pos[1]);
                elems.players.forEach(p => {
                    const pos = getCenterXY(p);
                    p.innerHTML = Math.round(pos[0]) + " " + Math.round(pos[1]);
                });

                ball.move();
                ball.draw();
                collission = getGoalCollission(ball);

                if (!ball.stop && collission) {
                    ball.goalHit = true;
                    ball.stop = true;
                    console.log("Goal hit, interval canceled.");
                    resolve(collission);
                }

                if ( !ball.stop && isPlayerCollission(ball) ) {
                    // ball.stop = true;
                    console.log("Player hit, interval canceled.");
                    resolve(collission);
                }

                if ( !ball.stop ) {
                    isWallCollission(ball);
                }
            });
        }, 10);
    });
}

function getGoalCollission(ball) {
    if (ball.y > goal.top && ball.y < goal.bottom) {
        if (ball.x >= ball.xMax) return "right";
        if (ball.x <= ball.xMin) return "left";
    }
    return null;
}

function isPlayerCollission(ball) {
    const ft = ( ball.x <= table.width / 2 + table.left ) ? [0,3] : [4,7];
    const c = Math.pow(ballRadius + playerRadius, 2);
    console.log("c is always", c);

    for ( let i = ft[0]; i <= ft[1]; i++ ) {
        const barx = getCenterXY(elems.bars[i])[0];

        if ( ball.x + ballRadius > barx - playerRadius && ball.x - ballRadius < barx + playerRadius ) {
            elems.bars[i].classList.add("impact");
            /* jshint -W083 */
            setTimeout(() => { elems.bars[i].classList.remove("impact"); }, 100);

            mapBarPlayer[i].forEach(pi => {
                /* jshint +W083 */
                const [playerx, playery] = getCenterXY(elems.players[pi]);
                const ab = Math.pow(ball.x - playerx, 2) + Math.pow(ball.y - playery, 2);
                console.log("ab", ab);

                if (ab <= c) {
                    elems.players[pi].classList.add("impact");
                    setTimeout(() => { elems.players[pi].classList.remove("impact"); }, 100);
                    console.log("ball is in player range");
                    setDeflectionVelocities(ball, playerx, playery);

                    if ( kickBars[pi] ) {
                        ball.vx = kickSpeed[0];
                        ball.vy = kickSpeed[0];
                    }
                }
            });
        }
    }
}

function setDeflectionVelocities(ball, cx, cy) {
    /* TODO: Now do a more precise check taking curvature into account */
    if ( ball.x < cx && ball.y < cy ) {
        ball.vx *= -1;
        ball.vy *= -1;
    } else
    if ( ball.x < cx && ball.y >= cy ) {
        ball.vx *= -1;
        // ball.vy *= -1;
    } else
    if ( ball.x >= cx && ball.y > cy ) {
        ball.vx *= -1;
        // ball.vy *= -1;
    } else
    if ( ball.x >= cx && ball.y < cy ) {
        ball.vx *= -1;
        ball.vy *= -1;
    }
}

function isWallCollission(ball) {
    if (ball.x > ball.xMax && ball.vx > 0) { ball.vx *= -1; console.log("ball wall collission", ball); }
    if (ball.x < ball.xMin && ball.vx < 0) { ball.vx *= -1; console.log("ball wall collission", ball); }
    if (ball.y > ball.yMax && ball.vy > 0) { ball.vy *= -1; console.log("ball wall collission", ball); }
    if (ball.y < ball.yMin && ball.vy < 0) { ball.vy *= -1; console.log("ball wall collission", ball); }
}
