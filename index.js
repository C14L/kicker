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
    playerLimit: 2,
    drag: 0.8,
    mapBarPlayer: [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18], [19, 20], [21]], // mapping of "player" objects onto "bar" objects
    kickSpeed: [10, 10], // default "kick" acceleration
};

const items = {
    ball: { radius: elems.ball.offsetWidth / 2, vx: 0, vy: 0, ax: 0, ay: 0, vvec: 0, avec: 0, },
    table: resizeTableAndGetBoundingClientRect(),
    goals: resizeGoalsAndGetBoundingClientRect(),
    bars: {
        players: [],
        limits: [],
    },
    player: {
        radius: elems.players[0].offsetWidth / 2,
    },
    //players: elems.players.forEach((player, i) => {{x: 0,y: 0,},}),
};
elems.bars.forEach((elem, idx) => {
    items.bars.players = settings.mapBarPlayer[idx];
    items.bars.limits = barMovementLimits(idx);
});

const status = {
    gameOver: false,
    goalHit: false,
    syncOkCount: 0,
    kickBars: [0, 0, 0, 0, 0, 0, 0, 0], // activate a bar to kick against a ball
    playerMovement: { "up": -2, "down": 2 },
    playerBars: { "left": 0, "right": 1 }, // this player's own bars controlled with "left" and "right" hand
    goalCount: { "left": 0, "right": 0 },
    leftMoveUpInterval: false,
    leftMoveDownInterval: false,
    rightMoveUpInterval: false,
    rightMoveDownInterval: false,
};


ws = new WebSocket("ws://localhost:8000/");
ws.addEventListener('open', handleWebsocketOpen);
ws.addEventListener('close', handleWebsocketClose);
ws.addEventListener('message', handleWebsocketMessage);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("keydown", handleKeyDown);

function handleWebsocketOpen(event) {
    console.log("handleWebsocketOpen", event.data);
    elems.numbers.websocket.style.backgroundColor = 'yellow';
    ws.send(JSON.stringify({
        "action": "register",
        "game": settings.gameId,
        "user": settings.userId,
    }));
}

function handleWebsocketClose(event) {
    elems.numbers.websocket.style.backgroundColor = 'black';
    console.log("handleWebsocketClose", event.data);
    ws.send(JSON.stringify({
        "action": "register",
        "game": settings.gameId,
        "user": settings.userId,
    }));
}

function handleWebsocketMessage(event) {
    elems.numbers.websocket.style.backgroundColor = 'blue';
    console.log("handleWebsocketMessage", event.data);
    let response = JSON.parse(event.data);

    if (response.action == "playerlist") {
        elems.numbers.players.innerHTML = response.playerlist.join(", ");
        if (response.playerlist.length == 1) {
            // This player was the first to join, so this is the master player
            settings.isServer = true;
        }
        if (response.playerlist.length == settings.playerLimit) {
            // All four players have joined the game
            if (settings.isServer) {
                // If this is the master player, tell others to sync items
                resetGame();
                ws.send(JSON.stringify({
                    "action": "sync",
                    "table": items.table,
                    "goals": items.goals,
                    "ball": items.ball,
                    "player": items.player,
                    "bars": items.bars,
                    "players": {},  // TODO
                }));
            }
        }
        if (response.playerlist.length < settings.playerLimit) {
            console.log("Waiting for more players:", response.playerlist);
        }
        if (response.playerlist.length > settings.playerLimit) {
            alert("Error, too many players. How did that happen?! o.O");
        }
    }

    if (response.action == "sync") {
        console.log("Received 'sync' action with 'items' being: ", items);
        // Request to sync with master
        items.table = response.table;
        items.goals = response.goals;
        items.ball = response.ball;
        items.player = response.player;
        items.bars = response.bars;
        //items.players = response.players;
        console.log("Updated items due to 'sync' action to: ", items);

        elems.table.style.right = "auto";
        elems.table.style.bottom = "auto";
        elems.table.style.top = items.table.top + "px";
        elems.table.style.left = items.table.left + "px";
        elems.table.style.width = items.table.width + "px";
        elems.table.style.height = items.table.height + "px";

        elems.goals.forEach((elG, i) => {
            elems.goals[i].style.right = "auto";
            elems.goals[i].style.bottom = "auto";
            elems.goals[i].style.top = items.goals[i].top + "px";
            elems.goals[i].style.left = items.goals[i].left + "px";
            elems.goals[i].style.width = items.goals[i].width + "px";
            elems.goals[i].style.height = items.goals[i].height + "px";
        });

        // Sync finished!
        ws.send(JSON.stringify({ "action": "syncok" }));
    }

    if (response.action == "syncok") {
        // A sync was finished, count players ready
        status.syncOkCount++;
        elems.numbers.websocket.style.innerHTML = status.syncOkCount;
        if (settings.isServer && status.syncOkCount == settings.playerLimit) {
            // If master and all 4 players are ready, start the game
            ws.send(JSON.stringify({ "action": "play" }));
        }
    }

    if (response.action == "play") {
        elems.numbers.websocket.style.backgroundColor = 'green';
        gamePlay().then(result => {
            if (settings.isServer) {
                ws.send(JSON.stringify({ "action": "newgoal", "goalfor": result }));
            }
        });
    }

    if (response.action == "newgoal") {
        status.goalCount[response.goalfor]++;

        if (settings.isServer) {
            if (status.goalCount.left >= 8 || status.goalCount.rigth >= 8) {
                ws.send(JSON.stringify({ "action": "finish", "winner": response.goalfor }));
            } else {
                resetGame();
                ws.send(JSON.stringify({
                    "action": "sync",
                    "table": items.table,
                    "goals": items.goals,
                    "ball": items.ball,
                    "player": items.player,
                    "bars": items.bars,
                    "players": {},  // TODO
                }));
            }
        }
    }

    if (response.action == "finish") {
        // End of game by goal count
        alert("Winner is: ", result.winner);
        status.gameOver = true;
    }
}

function barMovementLimits(barIdx) {
    return [
        items.table.top - elems.players[settings.mapBarPlayer[barIdx][0]].getBoundingClientRect().top,
        items.table.bottom - elems.players[settings.mapBarPlayer[barIdx][settings.mapBarPlayer[barIdx].length - 1]].getBoundingClientRect().bottom,
    ];
}

function playerMovementIncr() {
    status.playerMovement.up *= 1.01;
    status.playerMovement.down *= 1.01;
}

function playerMovementReset() {
    status.playerMovement.up = -2;
    status.playerMovement.down = 2;
}

function handleKeyUp(event) {
    if (event.key == "w") { clearInterval(status.leftMoveUpInterval); status.leftMoveUpInterval = false; playerMovementReset(); }
    if (event.key == "x") { clearInterval(status.leftMoveDownInterval); status.leftMoveDownInterval = false; playerMovementReset(); }
    if (event.key == "o") { clearInterval(status.rightMoveUpInterval); status.rightMoveUpInterval = false; playerMovementReset(); }
    if (event.key == "m") { clearInterval(status.rightMoveDownInterval); status.rightMoveDownInterval = false; playerMovementReset(); }
}

function handleKeyDown(event) {
    if (event.key == "w" && !status.leftMoveUpInterval) status.leftMoveUpInterval = setInterval(() => { moveBar(status.playerBars.left, "up"); playerMovementIncr(); });
    if (event.key == "s") { status.kickBars[status.playerBars.left] = 1; setTimeout(() => { status.kickBars[status.playerBars.left] = 0; }, 200); }
    if (event.key == "x" && !status.leftMoveDownInterval) status.leftMoveDownInterval = setInterval(() => { moveBar(status.playerBars.left, "down"); playerMovementIncr(); });
    if (event.key == "o" && !status.rightMoveUpInterval) status.rightMoveUpInterval = setInterval(() => { moveBar(status.playerBars.right, "up"); playerMovementIncr(); });
    if (event.key == "k") { status.kickBars[status.playerBars.right] = 1; setTimeout(() => { status.kickBars[status.playerBars.right] = 0; }, 200); }
    if (event.key == "m" && !status.rightMoveDownInterval) status.rightMoveDownInterval = setInterval(() => { moveBar(status.playerBars.right, "down"); playerMovementIncr(); });
}

function moveBar(barIndex, dir) {
    const newTop = elems.bars[barIndex].getBoundingClientRect().top + status.playerMovement[dir];
    if (dir == "up" && newTop < items.bars.limits[barIndex][0]) return;
    if (dir == "down" && newTop > items.bars.limits[barIndex][1]) return;
    window.requestAnimationFrame(() => elems.bars[barIndex].style.top = newTop + "px");
}

function getCenterXY(elem) {
    const b = saneDOMRect(elem);
    return [b.x, b.y];
}

function writeNumbers() {
    elems.numbers.velocity.t.innerHTML = Math.round(ballVVec() * 1000) / 1000;
    elems.numbers.velocity.x.innerHTML = Math.round(items.ball.x * 1000) / 1000;
    elems.numbers.velocity.y.innerHTML = Math.round(items.ball.y * 1000) / 1000;
}

function gamePlay() {
    return new Promise((resolve, reject) => {
        let animationInterval = null;
        let goalCollission = null;

        gameInit();

        animationInterval = setInterval(() => {
            window.requestAnimationFrame(() => {
                writeNumbers();

                const pos = getCenterXY(elems.ball);
                elems.ball.innerHTML = Math.round(pos[0]) + " " + Math.round(pos[1]);

                elems.players.forEach(p => {
                    const pos = getCenterXY(p);
                    p.innerHTML = Math.round(pos[0]) + " " + Math.round(pos[1]);
                });

                moveBall();
                drawBall();
            });

            goalCollission = getGoalCollission();
            if (goalCollission) {
                status.goalHit = true;
                clearInterval(animationInterval);
                animationInterval = null;
                console.log("Goal hit, interval canceled.");
                return goalCollission;
            }

            handlePlayerCollission();
            handleWallCollission();
        }, 10);
    });
}

function getGoalCollission(ball) {
    if (items.ball.y > items.goals[0].top && items.ball.y < items.goals[0].bottom) {
        if (items.ball.x >= items.ball.xMax) return "right";
        if (items.ball.x <= items.ball.xMin) return "left";
    }
    return null;
}

function handlePlayerCollission() {
    console.log("handlePlayerCollission() called.");
    const ft = (items.ball.x <= items.table.x) ? [0, 3] : [4, 7];
    const c = Math.pow(items.ball.radius + items.player.radius, 2);

    for (let i = ft[0]; i <= ft[1]; i++) {
        const barx = getCenterXY(elems.bars[i])[0];

        if (items.ball.x + items.ball.radius > barx - items.player.radius && items.ball.x - items.ball.radius < barx + items.player.radius) {
            elems.bars[i].classList.add("impact");
            /* jshint -W083 */
            setTimeout(() => { elems.bars[i].classList.remove("impact"); }, 100);

            settings.mapBarPlayer[i].forEach(pi => {
                /* jshint +W083 */
                const player = saneDOMRect(elems.players[pi]);
                const ab = Math.pow(items.ball.x - player.x, 2) + Math.pow(items.ball.y - player.y, 2);
                console.log("ab", ab);

                if (ab <= c) {
                    elems.players[pi].classList.add("impact");
                    setTimeout(() => { elems.players[pi].classList.remove("impact"); }, 100);
                    console.log("ball is in player range");
                    handleBallDeflection(player);

                    if (status.kickBars[pi]) {
                        items.ball.vx = settings.kickSpeed[0];
                        items.ball.vy = settings.kickSpeed[1];
                    }
                }
            });
        }
    }
}

function handleBallDeflection(player) {
    /* TODO: Now do a more precise check taking curvature into account */
    if (items.ball.x < player.x && items.ball.y < player.y) {
        items.ball.vx *= -1;
        items.ball.vy *= -1;
    } else if (items.ball.x < player.x && items.ball.y >= player.y) {
        items.ball.vx *= -1;
        // items.ball.vy *= -1;
    } else if (items.ball.x >= player.x && items.ball.y > player.y) {
        items.ball.vx *= -1;
        // items.ball.vy *= -1;
    } else if (items.ball.x >= player.x && items.ball.y < player.y) {
        items.ball.vx *= -1;
        items.ball.vy *= -1;
    }
}

function handleWallCollission() {
    if (items.ball.x < items.ball.xMin && items.ball.vx < 0) { items.ball.vx *= -1; console.log("ball wall collission", items.ball); }
    if (items.ball.y < items.ball.yMin && items.ball.vy < 0) { items.ball.vy *= -1; console.log("ball wall collission", items.ball); }
    if (items.ball.x > items.ball.xMax && items.ball.vx > 0) { items.ball.vx *= -1; console.log("ball wall collission", items.ball); }
    if (items.ball.y > items.ball.yMax && items.ball.vy > 0) { items.ball.vy *= -1; console.log("ball wall collission", items.ball); }
}

function resizeTableAndGetBoundingClientRect() {
    let table = elems.table.getBoundingClientRect();
    elems.table.style.top = table.top + "px";
    elems.table.style.left = table.left + "px";
    elems.table.style.width = table.width + "px";
    elems.table.style.height = table.height + "px";
    return saneDOMRect(elems.table);
}

function resizeGoalsAndGetBoundingClientRect() {
    elems.goals.forEach((elG, i) => {
        let goal = elG.getBoundingClientRect();
        elems.goals[i].style.top = goal.top + "px";
        elems.goals[i].style.left = goal.left + "px";
        elems.goals[i].style.width = goal.width + "px";
        elems.goals[i].style.height = goal.height + "px";
    });
    return [
        saneDOMRect(elems.goals[0]),
        saneDOMRect(elems.goals[1]),
    ];
}

function saneDOMRect(elem) {
    const domRect = elem.getBoundingClientRect();
    return {
        top: domRect.top,
        right: domRect.right,
        bottom: domRect.bottom,
        left: domRect.left,
        width: domRect.width,
        height: domRect.heigh,
        x: domRect.width / 2 + domRect.left, // Center point of the object
        y: domRect.height / 2 + domRect.top, // Center point of the object
    };
}

function ballVVec() {
    // Ball's velocity vector length
    return Math.sqrt(items.ball.vx ** 2 + items.ball.vy ** 2);
}

function ballAVec() {
    // Ball's acceleration vector length
    return Math.sqrt(items.ball.ax ** 2 + items.ball.ay ** 2);
}

function moveBall() {
    if (status.goalHit) return;
    if (ballVVec() < 0.15) { items.ball.ax = 0; items.ball.ay = 0; }
    items.ball.vx *= items.ball.ax;
    items.ball.vy *= items.ball.ay;
    items.ball.x += items.ball.vx;
    items.ball.y += items.ball.vy;
}

function drawBall() {
    elems.ball.style.left = items.ball.x - items.ball.radius + "px";
    elems.ball.style.top = items.ball.y - items.ball.radius + "px";
}

function resetGame() {
    // After a goal, reset some status and item properties
    status.goalHit = false;

    items.ball.x = items.table.left + items.ball.radius;
    items.ball.y = items.table.top + items.ball.radius;

    items.ball.xMin = items.table.left + items.ball.radius;
    items.ball.yMin = items.table.top + items.ball.radius;
    items.ball.xMax = items.table.right - items.ball.radius;
    items.ball.yMax = items.table.bottom - items.ball.radius;

    items.ball.vx = 0;
    items.ball.vy = 0;
    items.ball.ax = 0;
    items.ball.ay = 0;
}

function gameInit() {
    items.ball.vx = Math.random() * 20;
    items.ball.vy = Math.random() * 20;
    items.ball.ax = 0.995;
    items.ball.ay = 0.995;
}
