//Special thanks to Johnathon Selstad, Stemkoski

var container, stats, controls;
var camera, scene, renderer, light;
var draggableObjects = [];
var boxGeometry = new THREE.BoxBufferGeometry(100, 100, 100);
var white = new THREE.MeshLambertMaterial({ color: 0x888888 });
var clock = new THREE.Clock();
var socket = io();
socket.emit('new player');

socket.on('testing socket', function (test) {
    console.log(test)
})

setInterval(function () {
    socket.emit('new player');
}, 100)

class Robot {
    constructor(offsetX) {
        this.endEffector = null;
        this.IKJoints = [];
        this.init(offsetX);
    }
    init(offsetX) {
        var base = this.addJoint(scene, [0 + offsetX, 0, 0], [0, 1, 0], [0, 0], [0.05, 0.1, 0.05], [0, 5, 0]);
        var firstJoint = this.addJoint(base, [0, 11.52001, 0], [0, 1, 0], [-180, 180], [0.1, 0.1, 0.1], [0, 2.5, 0]);
        var secondJoint = this.addJoint(firstJoint, [-6.55, 4.6, 0.0], [1, 0, 0], [-90, 90], [0.1, 0.45, 0.1], [-3.450041, 14.7, 0]);
        var thirdJoint = this.addJoint(secondJoint, [1.247041, 32.02634, -0.0739485], [1, 0, 0], [-150, 150], [0.05, 0.35, 0.05], [2.8, 15.14, 0]);
        var fourthJoint = this.addJoint(thirdJoint, [2.984276, 30.01859, 0.0], [1, 0, 0], [-90, 90], [0.05, 0.05, 0.05], [4.8, 0.17, 0]);
        var fifthJoint = this.addJoint(fourthJoint, [4.333822, 4.200262, 0.0], [0, 1, 0], [-180, 180], [0.1, 0.035, 0.035], [3.156178, 0.3, 0]);
        this.endEffector = new THREE.Group();
        fifthJoint.add(this.endEffector);
        this.endEffector.position.set(8.3, 1.0, 0.0);
    }
    addJoint(base, position, axis, limits, size, graphicsOffset) {
        var loader = new THREE.TextureLoader();
        var texture = loader.load('./images/smile.jpg');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(size[0] / size[1], size[0] / size[1]);
        var joint = new THREE.Group();
        base.add(joint);
        joint.position.set(position[0], position[1], position[2]);
        joint.axis = new THREE.Vector3(axis[0], axis[1], axis[2]);
        joint.minLimit = limits[0] * 0.0174533;
        joint.maxLimit = limits[1] * 0.0174533;
        this.IKJoints.push(joint);
        var box = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ map: texture }));
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
}

class ParticleCloud {
    constructor() {
        this.particleGroup = new THREE.Object3D();
        this.init();
    }
    init() {
        var particleAttributes = { startSize: [], startPosition: [], randomness: [] };
        var loader = new THREE.TextureLoader();
        var particleTexture = loader.load('./images/spark.png');
        var totalParticles = 200;
        var radiusRange = 25;
        for (var i = 0; i < totalParticles; i++) {
            var spriteMaterial = new THREE.SpriteMaterial({ map: particleTexture, color: 0xffffff });

            var sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(10, 10, 1.0); // imageWidth, imageHeight
            sprite.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
            // for a cube:
            // sprite.position.multiplyScalar( radiusRange );
            // for a solid sphere:
            // sprite.position.setLength( radiusRange * Math.random() );
            // for a spherical shell:
            sprite.position.setLength(radiusRange * (Math.random() * 0.1 + 0.9));

            // sprite.color.setRGB( Math.random(),  Math.random(),  Math.random() ); 
            sprite.material.color.setHSL(Math.random(), 0.9, 0.7);

            // sprite.opacity = 0.80; // translucent particles
            sprite.material.blending = THREE.AdditiveBlending; // "glowing" particles

            this.particleGroup.add(sprite);
            // add variable qualities to arrays, if they need to be accessed later
            particleAttributes.startPosition.push(sprite.position.clone());
            particleAttributes.randomness.push(Math.random());
        }
        this.particleGroup.position.y = 75;
        this.particleGroup.position.x = -200;
        scene.add(this.particleGroup);
    }
    update() {
        var time = 4 * clock.getElapsedTime();
        var pGroup = this.particleGroup;
        for (var c = 0; c < pGroup.length; c++) {
            var sprite = pGroup.children[c];

            // particle wiggle
            var wiggleScale = 20;
            sprite.position.x += wiggleScale * (Math.random() - 0.5);
            sprite.position.y += wiggleScale * (Math.random() - 0.5);
            sprite.position.z += wiggleScale * (Math.random() - 0.5);

            // pulse away/towards center
            // individual rates of movement
            var a = particleAttributes.randomness[c] + 1;
            var pulseFactor = Math.tan(a * time);
            sprite.position.x = particleAttributes.startPosition[c].x * pulseFactor;
            sprite.position.y = particleAttributes.startPosition[c].y * pulseFactor;
            sprite.position.z = particleAttributes.startPosition[c].z * pulseFactor;
        }

        // rotate the entire group
        // particleGroup.rotation.x = time * 0.5;
        this.particleGroup.rotation.x = time * 0.75;
        this.particleGroup.rotation.y = time * 0.75;
        this.particleGroup.rotation.z = time * 0.75;
        // particleGroup.rotation.z = time * 1.0;
    }
}

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(50, 100, 250);

    createControls();
    createScene();
    createGround();
    createRenderer();
    scene.add(THREEx.SportBalls.createFootball())
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
    controls = new THREE.OrbitControls(camera);
    controls.target.set(0, 45, 0);
    controls.update();
}

// Creates a mesh grid for our ground. 
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

var angle = 0.01;
function animate() {
    robot1.solveIK(cloud.particleGroup.position);
    robot2.solveIK(cloud.particleGroup.position);
    cloud.update();
    // cloud.particleGroup.position.x += 2 * Math.sin(angle+=0.01);
    // cloud.particleGroup.position.y += 2 * Math.sin(angle+=0.01);
    cloud.particleGroup.position.x += 10 * Math.sin(angle += 0.05);
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

init();
let robot1 = new Robot(-150);
let robot2 = new Robot(150);
let cloud = new ParticleCloud();
animate();