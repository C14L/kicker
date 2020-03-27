// DOM elements
const elTable = document.querySelector("#table");
const elBall = document.querySelector("#table > .ball");
const elsGoal = document.querySelectorAll("#table > .goal");
const elsBar = document.querySelectorAll("#table > .bar");
const elsPlayer = document.querySelectorAll("#table > .bar > .player");
const elNumbersVelocity = document.querySelector("#numbers > .velocity");
const elNumbersVelocity_t = elNumbersVelocity.querySelector(".t");
const elNumbersVelocity_x = elNumbersVelocity.querySelector(".x");
const elNumbersVelocity_y = elNumbersVelocity.querySelector(".y");

const mapBarPlayer = {
    0: [ 0],
    1: [ 1, 2],
    2: [ 3, 4, 5],
    3: [ 6, 7, 8, 9,10],
    4: [11,12,13,14,15],
    5: [16,17,18],
    6: [19,20],
    7: [21],
}
const table = elTable.getBoundingClientRect();
const playerMovement = { "up": -2, "down": 2 };
const playerBars = { "left": 0, "right": 1 } /* This player's own bars controlled with "left" and "right" hand. */

const goal = elsGoal[0].getBoundingClientRect();
const playerRadius = elsPlayer[0].offsetWidth / 2;
const ballRadius = elBall.offsetWidth / 2;

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

window.addEventListener("keyup", ev => {
    if (ev.key == "w") { clearInterval(leftMoveUpInterval); leftMoveUpInterval = false; playerMovementReset() }
    if (ev.key == "x") { clearInterval(leftMoveDownInterval); leftMoveDownInterval = false; playerMovementReset() }
    if (ev.key == "o") { clearInterval(rightMoveUpInterval); rightMoveUpInterval = false; playerMovementReset() }
    if (ev.key == "m") { clearInterval(rightMoveDownInterval); rightMoveDownInterval = false; playerMovementReset() }
});

window.addEventListener("keydown", ev => {
    if (ev.key == "w" && !leftMoveUpInterval) leftMoveUpInterval = setInterval(() => { barMove(playerBars.left, "up"); playerMovementIncr() });
    if (ev.key == "s") console.log("left kick");
    if (ev.key == "x" && !leftMoveDownInterval) leftMoveDownInterval = setInterval(() => { barMove(playerBars.left, "down"); playerMovementIncr() });
    if (ev.key == "o" && !rightMoveUpInterval) rightMoveUpInterval = setInterval(() => { barMove(playerBars.right, "up"); playerMovementIncr() });
    if (ev.key == "k") console.log("right kick");
    if (ev.key == "m" && !rightMoveDownInterval) rightMoveDownInterval = setInterval(() => { barMove(playerBars.right, "down"); playerMovementIncr() });
});

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
        this.v = [0, 0];
        this.a = 0.9991;  // 1=constant velocity
        this.d = 0; // drag from surface friction
    }
    start(team) {
        if (arguments.team == "black") {
            // black gets the inital ball
        } else if (arguments.team == "white") {
            // white gets the inital ball
        } else {
            // randomly throw the ball onto the field
            this.xVelocity = Math.random() * 20;
            this.yVelocity = Math.random() * 20;
            this.acceleration = 0.995;
        }
    }
    set acceleration(a) {
        this.a = a;
    }
    set xVelocity(v) {
        this.v[0] = v;
    }
    set yVelocity(v) {
        this.v[1] = v;
    }
    set drag(d) {
        this.d = d;
    }
    get vt() {
        let vt = Math.sqrt(this.v[0]**2 + this.v[1]**2);
        return vt
    }
    move() {
        if (this.goalHit) return;

        if (this.vt < 0.15) this.a = 0;
        this.v[0] *= this.a;
        this.v[1] *= this.a;

        this.x += this.v[0];
        this.y += this.v[1];
    }
    draw() {
        elBall.style.left = this.x - ballRadius + "px";
        elBall.style.top = this.y - ballRadius + "px";
    }
}

function barMove(barIndex, dir) {
    const newTop = elsBar[barIndex].getBoundingClientRect().top + playerMovement[dir];
    requestAnimationFrame(() => elsBar[barIndex].style.top = newTop + "px");
}

function getCenterXY(el) {
    const b = el.getBoundingClientRect()
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
                elNumbersVelocity_t.innerHTML = Math.round(ball.vt * 10000) / 10000;
                elNumbersVelocity_x.innerHTML = Math.round(ball.x * 10000) / 10000;
                elNumbersVelocity_y.innerHTML = Math.round(ball.y * 10000) / 10000;
                const pos = getCenterXY(elBall)
                elBall.innerHTML =  Math.round(pos[0]) + " " + Math.round(pos[1]);
                elsPlayer.forEach(p => {
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
    for ( let i = ft[0]; i <= ft[1]; i++ ) {
        const cx = getCenterXY(elsBar[i])[0];

        if ( ball.x + ballRadius > cx - playerRadius && ball.x - ballRadius < cx + playerRadius ) {
            elsBar[i].classList.add("impact");
            setTimeout(()=>{elsBar[i].classList.remove("impact")}, 100);

            mapBarPlayer[i].forEach(pi => {
                const cy = getCenterXY(elsPlayer[pi])[1];

                if ( ball.y + ballRadius > cy - playerRadius && ball.y - ballRadius < cy + playerRadius ) {
                    console.log("ball is in player range");
                    elsPlayer[pi].classList.add("impact");
                    setTimeout(()=>{elsPlayer[pi].classList.remove("impact")}, 100);
                    setDeflectionVelocities(ball, cx, cy);
                }
            });
        }
    }
}

function setDeflectionVelocities(ball, cx, cy) {
    /* TODO: Now do a more precise check taking curvature into account */
    if ( ball.x < cx && ball.y < cy ) {
        ball.v[0] *= -1;
        ball.v[1] *= -1;
    } else
    if ( ball.x < cx && ball.y >= cy ) {
        ball.v[0] *= -1;
        // ball.v[1] *= -1;
    } else
    if ( ball.x >= cx && ball.y > cy ) {
        ball.v[0] *= -1;
        // ball.v[1] *= -1;
    } else
    if ( ball.x >= cx && ball.y < cy ) {
        ball.v[0] *= -1;
        ball.v[1] *= -1;
    }
}

function isWallCollission(ball) {
    if (ball.x > ball.xMax && ball.v[0] > 0) { ball.v[0] *= -1; console.log("ball wall collission", ball); }
    if (ball.x < ball.xMin && ball.v[0] < 0) { ball.v[0] *= -1; console.log("ball wall collission", ball); }
    if (ball.y > ball.yMax && ball.v[1] > 0) { ball.v[1] *= -1; console.log("ball wall collission", ball); }
    if (ball.y < ball.yMin && ball.v[1] < 0) { ball.v[1] *= -1; console.log("ball wall collission", ball); }
}

play().then(result => { alert("Goal for " + result) });
