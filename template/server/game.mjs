class Player {
    constructor() {

    }
}

class Soccer {
    constructor(scale, pos) {
        this.topSpeed = 5;
        this.speed = 0;
        this.angle = 0;
        this.scale = 0.99;
        this.ball = { scale: scale, pos: pos };
    }
}

export default class Game {
    constructor() {
        this.soccer = new Soccer({ x: 20, y: 20, z: 20 }, { x: 0, y: 10, z: 0 });
        this.players = {};
        this.state = {};
    }
    getState(){
        return {
            ball: this.soccer.ball
        }
    }
}