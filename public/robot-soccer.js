//Special thanks to Johnathon Selstad, Stemkoski

import * as THREE from '/public/build/three.module.js';
import { FirstPersonControls } from './jsm/controls/FirstPersonControls.js';

var container, controls;
var camera, scene, renderer, light;
var boxGeometry = new THREE.BoxBufferGeometry(100, 100, 100);
var soccer = {};
var players = {};
const clock = new THREE.Clock();
const socket = io();

socket.emit('new player');

socket.on('state', function (state) {
    updateStates(state);
});

socket.on('new player', function (player) {
    players[player.id] = new Robot(player.basePos, player.id, player.color);
});

socket.on('remove player', function (id) {
    delete players[id];
});

setInterval(function () {
    if (players[socket.id]) socket.emit('state', getState());
}, 1000 / 60);

function getState() {
    let x = camera.position.x - Math.sin(camera.rotation.y) * 70;
    let z = camera.position.z - Math.cos(camera.rotation.y) * 70;
    return {
        id: socket.id,
        basePos: { x: x, y: 0, z: z }
    }
}

function updateStates(state) {
    let pStates = state.players;
    let pBall;
    for (let i in pStates) {
        let p = pStates[i];
        if (players[p.id] && p.id != socket.id) {
            players[p.id].IKJoints[0].position.x = p.basePos.x;
            players[p.id].IKJoints[0].position.y = p.basePos.y;
            players[p.id].IKJoints[0].position.z = p.basePos.z;
        } else if (!players[p.id]) {
            players[p.id] = new Robot(p.basePos, p.id, p.color);
        } else if (p.id === socket.id) {
            let x = camera.position.x - Math.sin(camera.rotation.y) * 70;
            let z = camera.position.z - Math.cos(camera.rotation.y) * 70;
            players[p.id].IKJoints[0].position.x = x;
            players[p.id].IKJoints[0].position.y = 0;
            players[p.id].IKJoints[0].position.z = z;
        }

    }
    pBall = state.ball.ball.position;
    soccer.ball.position.set(pBall.x, pBall.y, pBall.z);
}

class Robot {
    constructor(basePos, id, color) {
        this.id = id;
        this.color = color;
        this.endEffector = null;
        this.IKJoints = [];
        this.init(basePos);
    }
    init(basePos) {
        var base = this.addJoint(scene, [basePos.x, basePos.y, basePos.z], [0, 1, 0], [0, 0], [0.15, 0.1, 0.15], [0, 5, 0], 'black');
        var firstJoint = this.addJoint(base, [0, 11.52001, 0], [0, 1, 0], [-180, 180], [0.1, 0.1, 0.1], [0, 2.5, 0]);
        var secondJoint = this.addJoint(firstJoint, [-6.55, 4.6, 0.0], [1, 0, 0], [-90, 90], [0.1, 0.45, 0.1], [-3.450041, 14.7, 0]);
        var thirdJoint = this.addJoint(secondJoint, [1.247041, 32.02634, -0.0739485], [1, 0, 0], [-150, 150], [0.05, 0.35, 0.05], [2.8, 15.14, 0]);
        var fourthJoint = this.addJoint(thirdJoint, [2.984276, 30.01859, 0.0], [1, 0, 0], [-90, 90], [0.05, 0.05, 0.05], [4.8, 0.17, 0]);
        var fifthJoint = this.addJoint(fourthJoint, [4.333822, 4.200262, 0.0], [0, 1, 0], [-180, 180], [0.1, 0.035, 0.035], [3.156178, 0.3, 0]);
        this.endEffector = new THREE.Group();
        fifthJoint.add(this.endEffector);
        this.endEffector.position.set(8.3, 1.0, 0.0);
    }
    addJoint(base, position, axis, limits, size, graphicsOffset, color) {
        var joint = new THREE.Group();
        base.add(joint);
        joint.position.set(position[0], position[1], position[2]);
        joint.axis = new THREE.Vector3(axis[0], axis[1], axis[2]);
        joint.minLimit = limits[0] * 0.0174533;
        joint.maxLimit = limits[1] * 0.0174533;
        this.IKJoints.push(joint);
        var box = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ color: color || this.color, emissive: 0x000000 }));
        joint.add(box);
        box.scale.set(size[0], size[1], size[2]);
        box.position.set(graphicsOffset[0], graphicsOffset[1], graphicsOffset[2]);
        box.castShadow = true;
        return joint;
    }
    solveIK(targetPosition) {
        var tooltipPosition = new THREE.Vector3();
        for (var i = this.IKJoints.length - 1; i >= 0; i--) {
            let joint = this.IKJoints[i];

            joint.updateMatrixWorld();
            this.endEffector.getWorldPosition(tooltipPosition);

            //Rotate towards the Target
            //(Ideally this could be done entirely in worldspace (instead of local space))
            var toolDirection = joint.worldToLocal(tooltipPosition.clone()).normalize();
            var targetDirection = joint.worldToLocal(targetPosition.clone()).normalize();
            var fromToQuat = new THREE.Quaternion(0, 0, 0, 1).setFromUnitVectors(toolDirection, targetDirection);
            joint.quaternion.multiply(fromToQuat);

            //Find the rotation from here to the parent, and rotate the axis by it...
            //This ensures that you're always rotating with the hinge
            var invRot = joint.quaternion.clone().inverse();
            var parentAxis = joint.axis.clone().applyQuaternion(invRot);
            fromToQuat.setFromUnitVectors(joint.axis, parentAxis);
            joint.quaternion.multiply(fromToQuat);

            //Clamp to Joint Limits - Devious and relies on sensical computation of these values...
            //Seems like rotations range from -pi, pi... not the worst... but bad for clamps through there
            var clampedRot = joint.rotation.toVector3().clampScalar(joint.minLimit, joint.maxLimit);
            joint.rotation.setFromVector3(clampedRot);

            joint.updateMatrixWorld();
        }
    }
    update(ball) {
        this.solveIK(ball.position);
    }
}

class Soccer {
    constructor(scale, position) {
        this.ball = {};
        this.init(scale, position);
    }
    init(scale, position) {
        var geometry = new THREE.SphereGeometry(0.5, 32, 16);
        var material = new THREE.MeshPhongMaterial({
            color: 0xffaa00
        })
        this.ball = new THREE.Mesh(geometry, material);
        this.ball.scale.x = scale.x;
        this.ball.scale.y = scale.y;
        this.ball.scale.z = scale.z;
        this.ball.position.x = position.x;
        this.ball.position.x = position.x;
        this.ball.position.x = position.x;
        scene.add(this.ball);
    }
    update() {
        let playerX = camera.position.x // - Math.sin(camera.rotation.y) * this.offset.x;
        let playerZ = camera.position.z //- Math.cos(camera.rotation.y) * this.offset.z;
        if (Math.abs(this.ball.position.x - playerX) < 50 && Math.abs(this.ball.position.z - playerZ) < 50) {
            this.speed = this.topSpeed;
        }
        let ang = Math.atan2(this.ball.position.z - playerZ, this.ball.position.x - playerX);
        this.ball.position.z += Math.sin(ang) * this.speed;
        this.ball.position.x += Math.cos(ang) * this.speed;
        if (this.speed > 0) this.speed -= 0.4;
        else this.speed = 0;
    }
}

function init() {
    container = document.getElementById('container');
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.rotation.order = 'YXZ';
    camera.position.set(50, 40, 250);
    createScene();
    createGround();
    createRenderer();
    createControls();
    soccer = new Soccer({ x: 20, y: 20, z: 20 } ,{ x: 0, y: 0, z: 0 } );
}


// Creates and adds renderer to the dom, adds event listener for resize.
function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    container.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
}

// Creates new orbit controls based on camera. 
function createControls() {
    controls = new FirstPersonControls(camera, renderer.domElement);
    controls.movementSpeed = 300;
    controls.lookSpeed = 0.2;
}

// Creates a mesh & grid for our ground. 
function createGround() {
    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x00ff00, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    var grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);
}

// Creates a scene object and adds light to the scene.
function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);//0xa0a0a0
    light = new THREE.HemisphereLight(0xffffff, 0x444444);
    light.position.set(0, 200, 0);
    scene.add(light);
    light = new THREE.DirectionalLight(0xbbbbbb);
    light.position.set(100, 200, -100);
    light.castShadow = true;
    light.shadow.camera.top = 180;
    light.shadow.camera.bottom = - 100;
    light.shadow.camera.left = - 120;
    light.shadow.camera.right = 120;
    scene.add(light);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    console.log(socket.id);
    if (players[socket.id]) {
        for (let id in players) {
            let p = players[id];
            p.update(soccer.ball);
        }
        renderer.render(scene, camera);
        controls.update(clock.getDelta());
    }
}

init();
animate();