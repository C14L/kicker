
// TODO: asign each player their pair of bars
// TODO: sync bar movement between tables
// TODO: ball physics: speed and drag
// TODO: ball physics: collisions with players

// Local HTML elements used to render the game
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

// Locally used constant values
const settings = {
    ballRadius: elems.ball.offsetWidth / 2,
    debugShowNumbers: true,
    drag: 0.8,
    gameId: location.pathname.substr(1).split('/')[1],
    goals: [tableDOMRect(elems.goals[0]), tableDOMRect(elems.goals[1])],
    isServer: false,
    kickSpeed: [10, 10], // default "kick" acceleration
    mapBarPlayer: [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18], [19, 20], [21]], // mapping of "player" objects onto "bar" objects
    playerLimit: 4, // number of human players per game
    playerRadius: elems.players[0].offsetWidth / 2 ,
    playersInit: elems.players.map((elem) => [tableDOMRect(elem).x, tableDOMRect(elem).y]),
    table: { top: 0, left: 0, right: 1600, bottom: 800, width: 1600, height: 800, x: 800, y: 400 },
    userId: location.pathname.substr(1).split('/')[2],
};

// Changing values shared with all other players by the Server
const items = {
    ball: { x: settings.table.x, y: settings.table.y, vx: 0, vy: 0, ax: 0, ay: 0, vvec: 0, avec: 0 },
    offsetBars: [0, 0, 0, 0, 0, 0, 0, 0], // bar moved this much up/down from middle
};

// Locally used changing values
const status = {
    isGamePlay: false,
    hold: true,
    gameOver: false,
    goalCollission: null,
    goalHit: false,
    playerlist: [],  // list of connected players
    syncOk: [],  // list of sync'ed players
    kickBars: [0, 0, 0, 0, 0, 0, 0, 0], // activate a bar to kick against a ball
    playerMovement: { "up": -2, "down": 2 }, // currenct bar speec
    playerBars: { "left": 2, "right": 4 }, // this player's own bars controlled with "left" and "right" hand
    score: { "left": 0, "right": 0 },

    leftMoveUpInterval: null,
    leftMoveDownInterval: null,
    rightMoveUpInterval: null,
    rightMoveDownInterval: null,
    animationInterval: null,
    ballSyncInterval: null,
};

// Return DOM rectangle relative to the table, not the DOM body.
function tableDOMRect(elem) {
    const domRect = elem.getBoundingClientRect();
    const tblRect = elems.table.getBoundingClientRect();
    return {
        top: domRect.top - tblRect.top,
        right: domRect.right - tblRect.left,
        bottom: domRect.bottom - tblRect.top,
        left: domRect.left - tblRect.left,
        width: domRect.width,
        height: domRect.height,
        x: (domRect.width / 2) + (domRect.left - tblRect.left), // Center point of the object
        y: (domRect.height / 2) + (domRect.top - tblRect.top), // Center point of the object
    };
}

function last(arr) {
    return arr[arr.length - 1];
}

////////////////////////////////////////////////////////////////////////////////////////
// Keyboard events
////////////////////////////////////////////////////////////////////////////////////////

console.log("Adding keyboard events...");
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keypress', handleKeyPress);

function handleKeyUp(event) {
    if (event.key == "w") barClearInterval("leftMoveUpInterval");
    if (event.key == "x") barClearInterval("leftMoveDownInterval");
    if (event.key == "o") barClearInterval("rightMoveUpInterval");
    if (event.key == "m") barClearInterval("rightMoveDownInterval");
}

function handleKeyDown(event) {
    if (event.key == "s") { // kick the ball
        status.kickBars[status.playerBars.left] = 1;
        setTimeout(() => { status.kickBars[status.playerBars.left] = 0; }, 200);
    }
    if (event.key == "k") { // kick the ball
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
        console.log("Key p pressed: pause/unpause game...");
        wsSend("statusupdate", { "key": "hold", "val": (!status.hold) });
    }
    if (event.key == "b") { // Add random velocity to ball
        console.log("Key b pressed: randomly kick the ball...");
        randomizeBall();
    }
    if (event.key == "g") { // Add random velocity to ball
        console.log("Key g pressed: start game...");
        wsSend("playstart", { "ball": items.ball });
        wsSend("statusupdate", { "key": "hold", "val": false });
    }
}

////////////////////////////////////////////////////////////////////////////////////////
// Websocket events
////////////////////////////////////////////////////////////////////////////////////////

console.log("Opening Websocket and adding Websocket event listeners...");
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
    if (settings.isServer) {
        console.log("wsSyncBall() called")
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
    // console.log("handleWebsocketMessage", event.data);
    writeWsStatus('blue');
    let response = JSON.parse(event.data);
    console.log("handleWebsocketMessage() - Parsed response.action:", response.action);
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
    console.log("handleWebsocketActionStatusUpdate() - Set status ", response.key, response.val);
    writeNumbers();
}

function handleWebsocketActionFinish(response) {
    alert("Winner is: ", response.winner);
    status.gameOver = true;
}

////////////////////////////////////////////////////////////////////////////////////////
// Ball and player
////////////////////////////////////////////////////////////////////////////////////////

function resetGamePlay() {
    if (status.ballSyncInterval) clearInterval(status.ballSyncInterval);
    if (status.animationInterval) clearInterval(status.animationInterval);
}

function gamePlay() {
    console.log("gamePlay() called");
    if (status.isGamePlay) {
        console.log("gamePlay() already active, ignore.");
        return;
    }
    resetGamePlay();
    status.isGamePlay = true;
    status.goalCollission = null;

    // Sync ball position via Websocket to others, if player is Server.
    // Each player calculates their ball's route independently. Usually,
    // the balls should have trajectories very close to each other.
    status.ballSyncInterval = setInterval(() => wsSyncBall(), 1000);

    status.animationInterval = setInterval(() => {
        try {
            if (!status.hold) {
                moveBall();
                handlePlayerCollission();
                handleWallCollission();

                if (settings.isServer) {
                    status.goalCollission = getGoalCollission();
                    if (status.goalCollission) wsSend("newgoal", { "goalfor": status.goalCollission });
                }
            }

            drawGame();
        } catch (e) {
            console.log("An outer error occured:", e);
            resetGamePlay();
        }
    }, 50);
}

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

function getGoalCollission(ball) {
    return
    if (items.ball.y > items.goals[0].top && items.ball.y < items.goals[0].bottom) {
        if (items.ball.x >= (settings.table.right - settings.ballRadius)) return "right";
        if (items.ball.x <= (settings.table.left + settings.ballRadius)) return "left";
    }
    return null;
}

function getBarIdxCloseToBall() {
    // finds the bar that is close enough to the ball to be able to
    // influence it. Tak ethe first player from each bar to find each
    // bar's x coord.
    let maxDist = settings.playerRadius + settings.ballRadius + 13;
    let firstPlayerOfBar = settings.mapBarPlayer.map(x => x[0]);

    for (let i = 0; i < elems.bars.length; i++) {
        let playerIdx = firstPlayerOfBar[i];
        let lowLim = settings.playersInit[playerIdx][0] - maxDist;
        let upLim = settings.playersInit[playerIdx][0] + maxDist;
        if ((items.ball.x > lowLim) && (items.ball.x < upLim)) return i;
    }

    return null;
}

function getPlayerIdxCloseToBall(closeBarIdx) {
    // finds the player from a given bar that is close enough to
    // the ball to be able to influence it
    let maxDist = settings.playerRadius + settings.ballRadius + 13;

    for (let i = 0; i < settings.mapBarPlayer[closeBarIdx].length; i++) {
        let playerIdx = settings.mapBarPlayer[closeBarIdx][i];
        let lowLim = settings.playersInit[playerIdx][1] - maxDist;
        let upLim = settings.playersInit[playerIdx][1] + maxDist;
        if ((items.ball.y > lowLim) && (items.ball.y < upLim)) return playerIdx;
    }

    return null;
}

function handlePlayerCollission() {
    let closeBarIdx = getBarIdxCloseToBall();
    if (!closeBarIdx) return;

    // marker the bar that is in the area of influence of the ball
    elems.bars[closeBarIdx].classList.add("impact");
    setTimeout(() => { elems.bars[closeBarIdx].classList.remove("impact"); }, 500);

    // find idx of player close to ball, if any
    let closePlayerIdx = getPlayerIdxCloseToBall(closeBarIdx);
    if (!closePlayerIdx) return;

    // marker the player that is in the area of influence of the ball
    elems.players[closePlayerIdx].classList.add("impact");
    setTimeout(() => { elems.players[closePlayerIdx].classList.remove("impact"); }, 500);

    // check if the player has any effect on the ball
    handleBallDeflection(closePlayerIdx);

    // handleBallImpulse(closePlayerIdx);
    // if (status.kickBars[pi]) {
    //     items.ball.vx = settings.kickSpeed[0];
    //     items.ball.vy = settings.kickSpeed[1];
    // }
}

// Return the index of the bar that the player is on
function getBarIdxOfPlayer(playerIdx) {
    for (let i = 0; i < settings.mapBarPlayer.length; i++) {
        if (settings.mapBarPlayer[i].indexOf(playerIdx) >= 0) {
            return i;
        }
    }
    return null;
}

function getPlayerPosXY(playerIdx) {
    let player = settings.playersInit[playerIdx];
    let barIdx = getBarIdxOfPlayer(playerIdx);
    let offsetY = items.offsetBars[barIdx];
    return {x: player[0], y: (player[1] + offsetY)};
}

/* TODO: Now do a more precise check taking curvature into account */
function handleBallDeflection(playerIdx) {
    let player = getPlayerPosXY(playerIdx);

    // current distance between ball and player
    let distBallPlayer = Math.round(Math.sqrt(Math.pow(items.ball.x - player.x, 2) + Math.pow(items.ball.y - player.y, 2)));

    // at this distance, the ball bounces off the player
    let minDist = settings.ballRadius + settings.playerRadius;

    // at this distance, the player must be kicking for the ball to bouce off
    let kickDist = minDist + 10 ;

    // TODO: here we need a bunch of tan and cot and sin and cos and
    // whatnot to calc the angle of the reflection surface and stuff
    // see notepad scribbles
    if (distBallPlayer <= minDist) {
        items.ball.vx *= -1;
        items.ball.vy *= -1;
    }

    // if (items.ball.x < player.x && items.ball.y < player.y) {
    //     items.ball.vx *= -1;
    //     items.ball.vy *= -1;
    // } else if (items.ball.x < player.x && items.ball.y >= player.y) {
    //     items.ball.vx *= -1;
    //     // items.ball.vy *= -1;
    // } else if (items.ball.x >= player.x && items.ball.y > player.y) {
    //     items.ball.vx *= -1;
    //     // items.ball.vy *= -1;
    // } else if (items.ball.x >= player.x && items.ball.y < player.y) {
    //     items.ball.vx *= -1;
    //     items.ball.vy *= -1;
    // }
}

function handleWallCollission() {
    if (items.ball.vx < 0 && items.ball.x < (settings.table.left + settings.ballRadius)) {
        items.ball.vx *= -1;
    }
    if (items.ball.vy < 0 && items.ball.y < (settings.table.top + settings.ballRadius)) {
        items.ball.vy *= -1;
    }
    if (items.ball.vx > 0 && items.ball.x > (settings.table.right - settings.ballRadius)) {
        items.ball.vx *= -1;
    }
    if (items.ball.vy > 0 && items.ball.y > (settings.table.bottom - settings.ballRadius)) {
        items.ball.vy *= -1;
    }
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
    // console.log("moveBall() - items.ball", items.ball);
    if (ballVVec() < 0.15) { items.ball.ax = 0; items.ball.ay = 0; }
    items.ball.vx *= items.ball.ax;
    items.ball.vy *= items.ball.ay;
    items.ball.x += items.ball.vx;
    items.ball.y += items.ball.vy;
}

function moveBar(barIdx, dir) {
    // console.log("moveBar() called:", barIdx, dir);
    let myPlayers = settings.mapBarPlayer[barIdx];
    let newOffset = items.offsetBars[barIdx] + status.playerMovement[dir];
    let playerIdx = (dir == "up") ? myPlayers[0] : last(myPlayers);
    let posY = Math.round(settings.playersInit[playerIdx][1] + newOffset);

    if (dir == "up" && posY - settings.playerRadius < settings.table.top) return;
    if (dir == "down" && posY + settings.playerRadius > settings.table.bottom) return;

    items.offsetBars[barIdx] = newOffset;
    console.log("new items.offsetBars[barIdx]:", barIdx, items.offsetBars[barIdx]);
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
    items.ball.vx = (10 + Math.random() * 10) * ((Math.random() < 0.5) ? 1 : -1);
    items.ball.vy = (10 + Math.random() * 10) * ((Math.random() < 0.5) ? 1 : -1);
    items.ball.ax = 0.995;
    items.ball.ay = 0.995;
    console.log("Ball randomized - items.ball", items.ball);
}

////////////////////////////////////////////////////////////////////////////////////////
// Draw stuff to DOM
////////////////////////////////////////////////////////////////////////////////////////

drawGame();

function drawGame() {
    // Wait for the next paint and re-draw all game objects
    // TODO: remember the last position of all objects and only re-draw changes. Or use built-in ShadowDOM.
    window.requestAnimationFrame(() => {
        try {
            drawBall();
            drawPlayers();
            writeNumbers();
        } catch (e) {
            console.log("drawGame() error", e);
        }
    });
}

function drawBall() {
    let posX = Math.round(items.ball.x + elems.table.style.left - settings.ballRadius);
    let posY = Math.round(items.ball.y + elems.table.style.top - settings.ballRadius);

    elems.ball.style.left = `${posX}px`;
    elems.ball.style.top =  `${posY}px`;

    if (settings.debugShowNumbers) {
        elems.ball.innerHTML = `${posX} ${posY}`;
    }
}

function drawPlayers() {
    items.offsetBars.forEach((offset, barIdx) => {
        settings.mapBarPlayer[barIdx].forEach((playerIdx) => {
            let posX = Math.round(settings.playersInit[playerIdx][0]);
            let posY = Math.round(settings.playersInit[playerIdx][1] + offset - settings.playerRadius);
            elems.players[playerIdx].style.top = `${posY}px`;

            if (settings.debugShowNumbers) {
                elems.players[playerIdx].innerHTML = `${posX} ${posY}`;
            }
        });
    });
}

////////////////////////////////////////////////////////////////////////////////////////
// Scoreboard
////////////////////////////////////////////////////////////////////////////////////////

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
