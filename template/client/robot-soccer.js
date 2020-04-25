//Special thanks to Johnathon Selstad, Stemkoski

import * as THREE from '/client/threejs/three.module.js';
import { FirstPersonControls } from '/client/threejs/FirstPersonControls.js';

var container, controls;
var camera, scene, renderer, light;
const clock = new THREE.Clock();
const socket = io();

socket.emit('new player');

// Creates a scene and adds light to the scene.
function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);//0xa0a0a0
    var spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( 0, 1000, 0 );
    spotLight.castShadow = true;
    spotLight.decay = 0.9;
    spotLight.penumbra = 0.99;
    scene.add(spotLight);
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

// Uses our window size to create a renderer and attach it to our container.
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

// Resizes the renderer and adjusts camera to fit in the new window size
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Creates new first person controls based on user input
function createControls() {
    controls = new FirstPersonControls(camera, renderer.domElement);
    controls.movementSpeed = 300;
    controls.lookSpeed = 0.2;
}

// Creates a new perspective camera 
function createCamera() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.rotation.order = 'YXZ';
    camera.position.set(50, 40, 250);
}

function init() {
    container = document.getElementById('container');
    createCamera();
    createScene();
    createGround();
    createRenderer();
    createControls();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update(clock.getDelta());
}

init();
animate();