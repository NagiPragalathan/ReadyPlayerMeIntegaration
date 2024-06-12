import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// WebSocket connection
const socket = new WebSocket('ws://localhost:8080');

// Function to send the character's state to the server
let lastSentTime = 0;
function sendCharacterState(): void {
    const now = Date.now();
    if (now - lastSentTime < 100) return; // Throttle to send every 100ms

    if (!characterControls) return;

    const state = {
        position: characterControls.model.position,
        quaternion: characterControls.model.quaternion,
        currentAction: characterControls.currentAction,
    };
    console.log('Sending state:', state);
    socket.send(JSON.stringify(state));
    lastSentTime = now;
}

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 5;
camera.position.x = 0;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();

// LIGHTS
light();

// FLOOR
generateFloor();

// MODEL
let characterControls: CharacterControls;
const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
let mixer: THREE.AnimationMixer;

// Store other players and their mixers
const otherPlayers: { [id: string]: THREE.Group } = {};
const otherMixers: { [id: string]: THREE.AnimationMixer } = {};
const otherActions: { [id: string]: { current: THREE.AnimationAction | null, map: Map<string, THREE.AnimationAction> } } = {};

gltfLoader.load('https://models.readyplayer.me/65893b0514f9f5f28e61d783.glb', function (gltf) {
    const model = gltf.scene;
    model.position.y = 0; // Set initial position closer to the ground
    model.traverse(function (object) {
        if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = true;
    });
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);

    // Load Walking Animation
    fbxLoader.load('models/Walking.fbx', function (walkFbx) {
        const walkAction = mixer.clipAction(walkFbx.animations[0]);

        // Load Idle Animation
        fbxLoader.load('models/Idle.fbx', function (idleFbx) {
            const idleAction = mixer.clipAction(idleFbx.animations[0]);

            // Load Run Animation
            fbxLoader.load('models/Run.fbx', function (runFbx) {
                const runAction = mixer.clipAction(runFbx.animations[0]);

                // Load Jump Animation
                fbxLoader.load('models/Jump.fbx', function (jumpFbx) {
                    const jumpAction = mixer.clipAction(jumpFbx.animations[0]);

                    const animationsMap = new Map<string, THREE.AnimationAction>();
                    animationsMap.set('Walk', walkAction);
                    animationsMap.set('Idle', idleAction);
                    animationsMap.set('Run', runAction);
                    animationsMap.set('Jump', jumpAction);

                    characterControls = new CharacterControls(model, mixer, orbitControls, camera, animationsMap, 'Idle');
                    characterControls.playAnimation('Idle');  // Start with Idle animation
                }, undefined, function (error) {
                    console.error('Error loading Jump animation:', error);
                });
            }, undefined, function (error) {
                console.error('Error loading Run animation:', error);
            });
        }, undefined, function (error) {
            console.error('Error loading Idle animation:', error);
        });
    }, undefined, function (error) {
        console.error('Error loading Walk animation:', error);
    });
}, undefined, function (error) {
    console.error('Error loading model:', error);
});

// CONTROL KEYS
const keysPressed: { [key: string]: boolean } = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    keysPressed[event.key.toLowerCase()] = true;
    keysPressed[event.key] = true;
    sendCharacterState();
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false;
    keysPressed[event.key] = false;
    sendCharacterState();
}, false);

const clock = new THREE.Clock();
// ANIMATE
function animate(): void {
    const delta = clock.getDelta();
    if (characterControls) {
        characterControls.update(delta, keysPressed);
    }
    if (mixer) {
        mixer.update(delta);
    }

    // Update other players
    for (const clientId in otherPlayers) {
        const otherPlayer = otherPlayers[clientId];
        if (otherMixers[clientId]) {
            otherMixers[clientId].update(delta);
        }
    }

    orbitControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    keyDisplayQueue.updatePosition();
}
window.addEventListener('resize', onWindowResize);

function generateFloor(): void {
    // TEXTURES
    const textureLoader = new THREE.TextureLoader();
    const sandBaseColor = textureLoader.load("./textures/sand/Sand 002_COLOR.jpg");
    const sandNormalMap = textureLoader.load("./textures/sand/Sand 002_NRM.jpg");
    const sandHeightMap = textureLoader.load("./textures/sand/Sand 002_DISP.jpg");
    const sandAmbientOcclusion = textureLoader.load("./textures/sand/Sand 002_OCC.jpg");

    const WIDTH = 80;
    const LENGTH = 80;

    const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
    const material = new THREE.MeshStandardMaterial({
        map: sandBaseColor, normalMap: sandNormalMap,
        displacementMap: sandHeightMap, displacementScale: 0.1,
        aoMap: sandAmbientOcclusion
    });
    wrapAndRepeatTexture(material.map);
    wrapAndRepeatTexture(material.normalMap);
    wrapAndRepeatTexture(material.displacementMap);
    wrapAndRepeatTexture(material.aoMap);

    const floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;
    floor.rotation.x = - Math.PI / 2;
    scene.add(floor);
}

function wrapAndRepeatTexture(map: THREE.Texture): void {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.x = map.repeat.y = 10;
}

function light(): void {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(- 60, 100, - 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = - 50;
    dirLight.shadow.camera.left = - 50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    scene.add(dirLight);
    // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}

// Handle incoming messages
socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log('Received data:', data);
    if (data.disconnected) {
        // Remove disconnected player
        if (otherPlayers[data.clientId]) {
            scene.remove(otherPlayers[data.clientId]);
            delete otherPlayers[data.clientId];
            delete otherMixers[data.clientId];
            delete otherActions[data.clientId];
        }
    } else if (otherPlayers[data.clientId]) {
        // Update existing player
        const player = otherPlayers[data.clientId];
        player.position.set(data.position.x, data.position.y, data.position.z);
        player.quaternion.set(data.quaternion._x, data.quaternion._y, data.quaternion._z, data.quaternion._w);

        // Update animation
        const mixer = otherMixers[data.clientId];
        const actionsData = otherActions[data.clientId];
        const action = actionsData.map.get(data.currentAction);
        if (action) {
            const current = actionsData.current;
            if (current !== action) {
                if (current) {
                    current.fadeOut(0.2);
                }
                action.reset().fadeIn(0.2).play();
                actionsData.current = action;
            }
        }
    } else {
        // Add new player
        const gltfLoader = new GLTFLoader();
        gltfLoader.load('https://models.readyplayer.me/65893b0514f9f5f28e61d783.glb', function (gltf) {
            const model = gltf.scene;
            model.position.y = 0; // Set initial position closer to the ground
            model.traverse(function (object) {
                if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = true;
            });
            scene.add(model);
            otherPlayers[data.clientId] = model;

            // Create and store animation mixer
            const otherMixer = new THREE.AnimationMixer(model);
            otherMixers[data.clientId] = otherMixer;

            // Initialize animation actions
            const actionsMap = new Map<string, THREE.AnimationAction>();
            fbxLoader.load('models/Walking.fbx', (walkFbx) => {
                actionsMap.set('Walk', otherMixer.clipAction(walkFbx.animations[0]));
            });
            fbxLoader.load('models/Idle.fbx', (idleFbx) => {
                actionsMap.set('Idle', otherMixer.clipAction(idleFbx.animations[0]));
            });
            fbxLoader.load('models/Run.fbx', (runFbx) => {
                actionsMap.set('Run', otherMixer.clipAction(runFbx.animations[0]));
            });
            fbxLoader.load('models/Jump.fbx', (jumpFbx) => {
                actionsMap.set('Jump', otherMixer.clipAction(jumpFbx.animations[0]));
            });

            // Store actions map and current action
            otherActions[data.clientId] = { current: null, map: actionsMap };

            // Update animation
            const action = actionsMap.get(data.currentAction);
            if (action) {
                action.reset().fadeIn(0.2).play();
                otherActions[data.clientId].current = action;
            }
        });
    }
};

// Animations map for other players
const animationsMap = new Map<string, THREE.AnimationClip>();
fbxLoader.load('models/Walking.fbx', (walkFbx) => {
    animationsMap.set('Walk', walkFbx.animations[0]);
});
fbxLoader.load('models/Idle.fbx', (idleFbx) => {
    animationsMap.set('Idle', idleFbx.animations[0]);
});
fbxLoader.load('models/Run.fbx', (runFbx) => {
    animationsMap.set('Run', runFbx.animations[0]);
});
fbxLoader.load('models/Jump.fbx', (jumpFbx) => {
    animationsMap.set('Jump', jumpFbx.animations[0]);
});
