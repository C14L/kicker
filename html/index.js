
// TODO: asign each player their pair of bars
// TODO: sync bar movement between tables
// TODO: ball physics: speed and drag
// TODO: ball physics: collisions with players

const elems = {
    bars: [...document.querySelectorAll("#table > .bar")],
    goals: [...document.querySelectorAll("#table > .goal")],
    players: [...document.querySelectorAll("#table > .bar > .player")],
    table: document.querySelector("#table"),
    ball: document.querySelector("#table > .ball"),
    numbers: {
        score: {
            left: document.querySelector("#numbers > .score > .left"),
            right: document.querySelector("#numbers > .score > .right"),
        },
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
    table: { width: 1600, height: 800 },
    gameId: location.pathname.substr(1).split('/')[1],
    userId: location.pathname.substr(1).split('/')[2],
    isServer: false,
    playerLimit: 4,
    drag: 0.8,
    mapBarPlayer: [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18], [19, 20], [21]], // mapping of "player" objects onto "bar" objects
    kickSpeed: [10, 10], // default "kick" acceleration
    debugShowNumbers: true,
};

const items = {
    table: saneDOMRect(elems.table),
    goals: [saneDOMRect(elems.goals[0]), saneDOMRect(elems.goals[1])],
    ball: { radius: elems.ball.offsetWidth / 2, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, vvec: 0, avec: 0 },
    barsBottomLimits: [],
    player: { radius: elems.players[0].offsetWidth / 2 },
    players: elems.players.map((elem) => [saneDOMRect(elem).x, saneDOMRect(elem).y]),
};

const status = {
    hold: true,
    gameOver: false,
    goalHit: false,
    playerlist: [],  // list of connected players
    syncOk: [],  // list of sync'ed players
    offsetBars: [0, 0, 0, 0, 0, 0, 0, 0], // bar moved this much up/down from center
    kickBars: [0, 0, 0, 0, 0, 0, 0, 0], // activate a bar to kick against a ball
    playerMovement: { "up": -2, "down": 2 }, // currenct bar speec
    playerBars: { "left": 0, "right": 1 }, // this player's own bars controlled with "left" and "right" hand
    score: { "left": 0, "right": 0 },

    leftMoveUpInterval: null,
    leftMoveDownInterval: null,
    rightMoveUpInterval: null,
    rightMoveDownInterval: null,
    animationInterval: null,
    ballSyncInterval: null,
};

////////////////////////////////////////////////////////////////////////////////////////

function handleKeyUp(event) {
    if (event.key == "w") barClearInterval("leftMoveUpInterval");
    if (event.key == "x") barClearInterval("leftMoveDownInterval");
    if (event.key == "o") barClearInterval("rightMoveUpInterval");
    if (event.key == "m") barClearInterval("rightMoveDownInterval");
}

function handleKeyDown(event) {
    if (event.key == "s") {
        status.kickBars[status.playerBars.left] = 1;
        setTimeout(() => { status.kickBars[status.playerBars.left] = 0; }, 200);
    }
    if (event.key == "k") {
        status.kickBars[status.playerBars.right] = 1;
        setTimeout(() => { status.kickBars[status.playerBars.right] = 0; }, 200);
    }
    if (event.key == "w") barSetInterval("leftMoveUpInterval", "left", "up");
    if (event.key == "x") barSetInterval("leftMoveDownInterval", "left", "down");
    if (event.key == "o") barSetInterval("rightMoveUpInterval", "right", "up");
    if (event.key == "m") barSetInterval("rightMoveDownInterval", "right", "down");
}

function handleKeyPress(event) {
    if (event.key == "p") { // Pause game
        status.hold = !status.hold;
        wsSend("statusupdate", { "key": "hold", "val": status.hold });
    }
    if (event.key == "b") { // Add random velocity to ball
        randomizeBall();
        wsSend("playstart", { "ball": items.ball });
    }
}

(function initKeyboardEvents() {
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keypress", handleKeyPress);

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keypress", handleKeyPress);
})();

////////////////////////////////////////////////////////////////////////////////////////

ws = new WebSocket(`ws://${window.location.host}/kicker/ws`);
ws.addEventListener('open', handleWebsocketOpen);
ws.addEventListener('close', handleWebsocketClose);
ws.addEventListener('message', handleWebsocketMessage);

function wsSend(action, data) {
    data = data || {};
    data.action = action;
    ws.send(JSON.stringify(data));
}

function wsSyncBall() {
    if (settings.isServer && !status.hold) {
        wsSend("ballsync", { "ball": items.ball });
    }
}

function handleWebsocketOpen(event) {
    console.log("handleWebsocketOpen", event.data);
    elems.numbers.websocket.style.backgroundColor = 'yellow';
    wsSend("register", { "game": settings.gameId, "user": settings.userId });
}

function handleWebsocketClose(event) {
    console.log("handleWebsocketClose", event.data);
    writeWsStatus('black');
    // TODO: is this needed?? wsSend("register", { "game": settings.gameId, "user": settings.userId });
}

function handleWebsocketMessage(event) {
    console.log("handleWebsocketMessage", event.data);
    writeWsStatus('blue');
    let response = JSON.parse(event.data);
    console.log("Parsed response.action:", response.action);
    if (response.action == "playerlist") handleWebsocketActionPlayerlist(response);
    else if (response.action == "gamesync") handleWebsocketActionGameSync(response);
    else if (response.action == "syncok") handleWebsocketActionSyncOk(response);
    else if (response.action == "playprepare") handleWebsocketActionPlayPrepare(response);
    else if (response.action == "playstart") handleWebsocketActionPlayStart(response);
    else if (response.action == "ballsync") handleWebsocketActionBallSync(response);
    else if (response.action == "newgoal") handleWebsocketActionNewGoal(response);
    else if (response.action == "statusupdate") handleWebsocketActionStatusUpdate(response);
    else if (response.action == "finish") handleWebsocketActionFinish(response);
    writeWsStatus('yellow');
}

function handleWebsocketActionPlayerlist(response) {
    status.hold = true;
    status.playerlist = response.playerlist;
    writePlayers();
    console.log("Players:", response.playerlist);

    if (response.playerlist.length == 1) {
        settings.isServer = true;
        console.log("You are the first player, setting as server:", settings.isServer);
    }
    else if (response.playerlist.length < settings.playerLimit) {
        console.log("Waiting for more players:", response.playerlist);
    }
    else if (response.playerlist.length == settings.playerLimit && settings.isServer) {
        console.log("Calling resetGame to start game");
        resetGame();
    }
    else if (response.playerlist.length > settings.playerLimit) {
        alert("Error, too many players. How did that happen?! o.O");
    }
    else {
        console.log("Enough players, but I am not server, so wait for the server to start the game.");
    }
}

function handleWebsocketActionGameSync(response) {
    console.log("Received 'gamesync' action with 'items' being: ", items);
    items.ball = response.ball;
    items.player = response.player;
    items.players = response.players;
    console.log("Updated items due to 'gamesync' action to: ", items);
    wsSend("syncok", { "player": settings.userId });
}

function handleWebsocketActionSyncOk(response) {
    // A sync was finished, count players ready
    // TODO: check if every player is registered only once and that registered and sync'ed players match
    if (status.syncOk.indexOf(response.player) == -1) status.syncOk.push(response.player);
    if (settings.isServer && status.syncOk.length == settings.playerLimit) wsSend("playprepare");
    writeWsConnectCount();
}

function handleWebsocketActionPlayPrepare(response) {
    writeWsStatus('green');
    writeScore();
    if (settings.isServer) {
        randomizeBall();
        wsSend("playstart", { "ball": items.ball });
    }
}

function handleWebsocketActionPlayStart(response) {
    items.ball = response.ball;
    gamePlay();
}

function handleWebsocketActionBallSync(response) {
    items.ball = response.ball;
}

function handleWebsocketActionNewGoal(response) {
    status.goalHit = true;
    clearInterval(status.animationInterval);
    clearInterval(status.ballSyncInterval);
    status.animationInterval = null;
    status.ballSyncInterval = null;

    if (settings.isServer) {
        status.score[response.goalfor]++;
        wsSend("statusupdate", { "key": "score", "val": status.score });
        if (status.score.left < 8 && status.score.rigth < 8) resetGame();
        else wsSend("finish", { "winner": response.goalfor });
    }
}

function handleWebsocketActionStatusUpdate(response) {
    status[response.key] = response.val;
    writeNumbers();
}

function handleWebsocketActionFinish(response) {
    alert("Winner is: ", response.winner);
    status.gameOver = true;
}

////////////////////////////////////////////////////////////////////////////////////////

function playerMovementIncr() {
    status.playerMovement.up *= 1.01;
    status.playerMovement.down *= 1.01;
}

function playerMovementReset() {
    status.playerMovement.up = -2;
    status.playerMovement.down = 2;
}

function barClearInterval(intv) {
    clearInterval(status[intv]);
    status[intv] = null;
    playerMovementReset();
}

function barSetInterval(intv, leftright, updown) {
    if (status[intv]) return;
    status[intv] = setInterval(() => {
        moveBar(status.playerBars[leftright], updown);
        playerMovementIncr();
    }, 20);
}

function gamePlay() {
    console.log("gamePlay() called");
    let goalCollission = null;

    if (status.ballSyncInterval) clearInterval(status.ballSyncInterval);
    if (status.animationInterval) clearInterval(status.animationInterval);

    status.ballSyncInterval = setInterval(() => wsSyncBall(), 1000);

    status.animationInterval = setInterval(() => {
        try {
            if (!status.hold) {
                moveBall();
                handlePlayerCollission();
                handleWallCollission();

                if (settings.isServer) {
                    goalCollission = getGoalCollission();
                    if (goalCollission) wsSend("newgoal", { "goalfor": goalCollission });
                }
            }

            window.requestAnimationFrame(() => {
                try {
                    drawBall();
                    // drawBars();
                    writeNumbers();
                    writeNumbersInBall();
                    writeNumbersInPlayers();
                } catch (e) {
                    console.log("An error occured:", e);
                }
            });
        } catch (e) {
            console.log("An outer error occured:", e);
            clearInterval(status.animationInterval);
        }
    }, 100);
}

function getGoalCollission(ball) {
    if (items.ball.y > items.goals[0].top && items.ball.y < items.goals[0].bottom) {
        if (items.ball.x >= (items.table.right - items.ball.radius)) return "right";
        if (items.ball.x <= (items.table.left + items.ball.radius)) return "left";
    }
    return null;
}

function handlePlayerCollission() {
    // console.log("handlePlayerCollission() called.");
    const ft = (items.ball.x <= items.table.x) ? [0, 3] : [4, 7];
    const c = Math.pow(items.ball.radius + items.player.radius, 2);

    for (let i = ft[0]; i <= ft[1]; i++) {
        const barx = saneDOMRect(elems.bars[i]).x;

        if (items.ball.x + items.ball.radius > barx - items.player.radius && items.ball.x - items.ball.radius < barx + items.player.radius) {
            elems.bars[i].classList.add("impact");
            /* jshint -W083 */
            setTimeout(() => { elems.bars[i].classList.remove("impact"); }, 100);

            settings.mapBarPlayer[i].forEach(pi => {
                /* jshint +W083 */
                const player = saneDOMRect(elems.players[pi]);
                const ab = Math.pow(items.ball.x - player.x, 2) + Math.pow(items.ball.y - player.y, 2);
                // console.log("ab", ab);

                if (ab <= c) {
                    elems.players[pi].classList.add("impact");
                    setTimeout(() => { elems.players[pi].classList.remove("impact"); }, 100);
                    // console.log("ball is in player range");
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
    if (items.ball.vx < 0 && items.ball.x < (items.table.left + items.ball.radius)) {
        items.ball.vx *= -1;
    }
    if (items.ball.vy < 0 && items.ball.y < (items.table.top + items.ball.radius)) {
        items.ball.vy *= -1;
    }
    if (items.ball.vx > 0 && items.ball.x > (items.table.right - items.ball.radius)) {
        items.ball.vx *= -1;
    }
    if (items.ball.vy > 0 && items.ball.y > (items.table.bottom - items.ball.radius)) {
        items.ball.vy *= -1;
    }
}

function saneDOMRect(elem) {
    const domRect = elem.getBoundingClientRect();
    return {
        top: domRect.top,
        right: domRect.right,
        bottom: domRect.bottom,
        left: domRect.left,
        width: domRect.width,
        height: domRect.height,
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

function moveBar(barIdx, dir) {
    const newTop = status.offsetBars[barIdx] + status.playerMovement[dir];
    if (dir == "up" && newTop < -500) return;
    if (dir == "down" && newTop > 500) return;
    status.offsetBars[barIdx] = newTop;
}

function drawBars() {
    elems.players.forEach((elem, idx) => {
        elems.players[idx].style.left = items.players[idx].x - items.player.radius + "px";
        elems.players[idx].style.top = items.players[idx].y - items.player.radius + "px";
    });
    window.requestAnimationFrame(() => {
        elems.bars.forEach((_, idx) => elems.bars[idx].style.top = status.offsetBars[idx] + "px");
    });
}

function resetGame() {
    console.log("resetGame() called");
    // After a goal, reset some status and item properties
    status.goalHit = false;
    items.ball.x = items.table.x;
    items.ball.y = items.table.y;
    items.ball.vx = 0;
    items.ball.vy = 0;
    items.ball.ax = 0;
    items.ball.ay = 0;

    const msg = {
        "hold": status.hold,
        // "table": items.table, // now has a default size+position
        // "goals": items.goals, // now has a default size+position
        "ball": items.ball,
        "bars": items.bars,
        "player": items.player,
        "players": items.players,
    };
    console.log("Now sending gamesync message:", msg);
    wsSend("gamesync", msg);
}

function randomizeBall() {
    items.ball.vx = Math.random() * 20;
    items.ball.vy = Math.random() * 20;
    items.ball.ax = 0.995;
    items.ball.ay = 0.995;
}

function writeScore() {
    elems.numbers.score.left.innerHTML = status.score.left;
    elems.numbers.score.right.innerHTML = status.score.right;
}

function writePlayers() {
    let li = [...status.playerlist];
    const gameId = settings.gameId;
    while (li.length < 4) li.push('___');
    elems.numbers.players.innerHTML = `${gameId}: ( ${li[0]} + ${li[1]} ) vs ( ${li[2]} + ${li[3]} )`;
}

function writeNumbers() {
    elems.numbers.velocity.t.innerHTML = Math.round(ballVVec() * 1000) / 1000;
    elems.numbers.velocity.x.innerHTML = Math.round(items.ball.x * 1000) / 1000;
    elems.numbers.velocity.y.innerHTML = Math.round(items.ball.y * 1000) / 1000;
}

function writeWsConnectCount() {
    elems.numbers.websocket.innerHTML = status.syncOk.length;
}

function writeWsStatus(s) {
    elems.numbers.websocket.style.backgroundColor = s;
    if (settings.isServer) {
        elems.numbers.websocket.style.border = "2px solid white";
    }
}

function writeNumbersInPlayers() {
    elems.players.forEach(p => {
        const pos = saneDOMRect(p);
        p.innerHTML = Math.round(pos.x) + " " + Math.round(pos.y);
    });
}

function writeNumbersInBall() {
    if (settings.debugShowNumbers) {
        const pos = saneDOMRect(elems.ball);
        elems.ball.innerHTML = Math.round(pos.x) + " " + Math.round(pos.y);
    }
}