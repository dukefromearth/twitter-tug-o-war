
class Robot {
    constructor(map_size, id, color) {
        this.id = id;
        this.color = color;
        this.basePos = null;
        this.init(map_size);
    }
    init(map_size) {
        this.basePos = { x: Math.random() * map_size - map_size/2, y: 0, z: Math.random() * map_size - map_size/2};
    }
    getState() {
        return {
            id: this.id,
            basePos: this.basePos,
            color: this.color
        }
    }
    update(robot) {
        this.basePos = robot.basePos;
    }
}

class SoccerBall {
    constructor(pos, scale) {
        this.topSpeed = 5;
        this.speed = 0;
        this.angle = 0;
        this.scale = 20;
        this.decay = 0.99;
        this.ball = { scale: scale, position: pos };
        console.log(this.ball);
    }
    update() {
        this.ball.position.x += Math.cos(this.angle) * this.speed;
        this.ball.position.z += Math.sin(this.angle) * this.speed;
        if (this.speed > 0) this.speed *= this.decay;
        else this.speed = 0;
    }
    updateAng(pBasePos) {
        this.speed = this.topSpeed;
        let ang = Math.atan2(this.ball.position.z - pBasePos.z, this.ball.position.x - pBasePos.x);
        this.ball.position.z += Math.sin(ang) * this.speed;
        this.ball.position.x += Math.cos(ang) * this.speed;
        this.angle = ang;
    }
}
export default class Game {
    constructor() {
        this.players = {};
        this.ball = new SoccerBall({ x: 0, y: 0, z: 0 }, { x: 20, y: 20, z: 20 });
        this.state = {};
        this.map_size = 2000;
        this.next_team = 'red';
    }
    newPlayer(id) {
        this.players[id] = new Robot(this.map_size, id, this.next_team);
        if (this.next_team == 'red') this.next_team = 'blue';
        else this.next_team = 'red';
    }
    removePlayer(id) {
        delete this.players[id];
    }
    // Takes in a robot object with parameters {id, basePos}
    updatePlayerPos(robot) {
        this.players[robot.id].update(robot);
    }
    getCollisionID() {
        for (let id in this.players) {
            let p = this.players[id];
            if (
                Math.abs(this.ball.ball.position.x - p.basePos.x) < 50 &&
                Math.abs(this.ball.ball.position.z - p.basePos.z) < 50) {
                return p.id;
            }
        }
    }
    updateBall() {
        let pBasePos = null;
        if (this.getCollisionID()) {
            pBasePos = this.players[this.getCollisionID()].basePos;
        }
        if (pBasePos) {
            this.ball.updateAng(pBasePos);
        }
        this.ball.update();
    }
    getState() {
        let pStates = {};
        for (let id in this.players) {
            pStates[id] = this.players[id].getState();
        }
        return { players: pStates, ball: this.ball, score: this.score };
    }
    play() {
        this.updateBall();
    }
}
