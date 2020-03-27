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

// Positions of fixed objects
const table_tl_x = elTable.offsetTop;
const table_tl_y = elTable.offsetLeft;
const table_br_x = elTable.offsetWidth + table_tl_x;
const table_br_y = elTable.offsetHeight + table_tl_y;
const goal_top = elsGoal[0].offsetTop;
const goal_bottom = elsGoal[0].offsetHeight + goal_top;
const player_radius = elsPlayer[0].offsetWidth / 2;
const ball_radius = elBall.offsetWidth / 2;

// TODO: Bar should not move, just their players!
let bars_y = [
    document.querySelector("#table > .bar-0").offsetTop,
    document.querySelector("#table > .bar-1").offsetTop,
    document.querySelector("#table > .bar-2").offsetTop,
    document.querySelector("#table > .bar-3").offsetTop,
    document.querySelector("#table > .bar-4").offsetTop,
    document.querySelector("#table > .bar-5").offsetTop,
    document.querySelector("#table > .bar-6").offsetTop,
    document.querySelector("#table > .bar-7").offsetTop];

let players = [];

function updatePlayers() {
    players = [];
    elsPlayer.forEach(o => {
        let r = o.getBoundingClientRect();
        players.push({"x": r.left + (r.width/2), "y": r.top + (r.height/2)});
    });
}
updatePlayers();

let leftMoveUpInterval = false;
let leftMoveDownInterval = false;
let rightMoveUpInterval = false;
let rightMoveDownInterval = false;

window.addEventListener("keyup", ev => {
    if (ev.key == "w") { clearInterval(leftMoveUpInterval); leftMoveUpInterval = false; }
    if (ev.key == "x") { clearInterval(leftMoveDownInterval); leftMoveDownInterval = false; }
    if (ev.key == "o") { clearInterval(rightMoveUpInterval); rightMoveUpInterval = false; }
    if (ev.key == "m") { clearInterval(rightMoveDownInterval); rightMoveDownInterval = false; }
});

function barMove(barIndex, dir) {
    requestAnimationFrame(() => {
        if ( dir == "up" ) {
            bars_y[barIndex] -= 1;
        }
        if ( dir == "down" ) {
            bars_y[barIndex] += 1;
        }
        elsBar[barIndex].style.top = bars_y[barIndex] + "px";
        updatePlayers();
    });
}

window.addEventListener("keydown", ev => {
    if (ev.key == "w" && !leftMoveUpInterval) {
        console.log("left move down started");
        leftMoveUpInterval = setInterval(() => requestAnimationFrame(() => { bars_y[0] -= 1; elsBar[0].style.top = bars_y[0] + "px"; }));
    }
    if (ev.key == "s") {
        console.log("left kick");
    }
    if (ev.key == "x" && !leftMoveDownInterval) {
        console.log("left move down");
        leftMoveDownInterval = setInterval(() => requestAnimationFrame(() => { bars_y[0] += 1; elsBar[0].style.top = bars_y[0] + "px"; }));
    }
    if (ev.key == "o" && !rightMoveUpInterval) {
        console.log("right move up");
        rightMoveUpInterval = setInterval(() => requestAnimationFrame(() => { bars_y[1] -= 1; elsBar[1].style.top = bars_y[1] + "px"; }));
    }
    if (ev.key == "k") {
        console.log("right kick");
    }
    if (ev.key == "m" && !rightMoveDownInterval) {
        console.log("right move down");
        rightMoveDownInterval = setInterval(() => requestAnimationFrame(() => { bars_y[1] += 1; elsBar[1].style.top = bars_y[1] + "px"; }));
    }
});

class Ball {
    constructor() {
        this.reset();
    }
    reset() {
        this.goalHit = false;
        this.stop = false;
        this.x = table_tl_x + ball_radius;
        this.y = table_tl_y + ball_radius;
        this.xMin = table_tl_x + ball_radius;
        this.yMin = table_tl_y + ball_radius;
        this.xMax = table_br_x - ball_radius;
        this.yMax = table_br_y - ball_radius;
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
            this.xVelocity = 10;
            this.yVelocity = 7;
            this.acceleration = 0.99;
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
        elBall.style.left = this.x - ball_radius + "px";
        elBall.style.top = this.y - ball_radius + "px";
        elBall.innerHTML = elBall.getBoundingClientRect().left + ", " + elBall.getBoundingClientRect().top;
    }
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

                elsPlayer.forEach(p => p.innerHTML = p.getBoundingClientRect().left + ", " + p.getBoundingClientRect().top);

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
    if (ball.y > goal_top && ball.y < goal_bottom) {
        if (ball.x >= ball.xMax) return "right";
        if (ball.x <= ball.xMin) return "left";
    }
    return null;
}

function isPlayerCollission(ball) {
    players.forEach((p, i) => {
        let pTop = p.y - player_radius;
        let pBotton = p.y + player_radius;
        let pLeft = p.x - player_radius;
        let pRight = p.x + player_radius;

        if ( ball.x > pLeft && ball.x < pRight ) {
            if ( ball.y > pTop && ball.y < pBotton ) {
                console.log(i, "ball is in player range", ball, p);
                elsPlayer[i].classList.add("impact");
                setTimeout(()=>{elsPlayer[i].classList.remove("impact")}, 100);
                ball.v[0] *= -1;
                ball.v[1] *= -1;
            }
        }
    });
    // return false;
}

function isWallCollission(ball) {
    if (ball.x > ball.xMax && ball.v[0] > 0) { ball.v[0] *= -1; console.log("ball wall collission", ball); }
    if (ball.x < ball.xMin && ball.v[0] < 0) { ball.v[0] *= -1; console.log("ball wall collission", ball); }
    if (ball.y > ball.yMax && ball.v[1] > 0) { ball.v[1] *= -1; console.log("ball wall collission", ball); }
    if (ball.y < ball.yMin && ball.v[1] < 0) { ball.v[1] *= -1; console.log("ball wall collission", ball); }
}

play().then(result => { alert("Goal for " + result) });
