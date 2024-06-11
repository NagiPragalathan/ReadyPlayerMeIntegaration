import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { W, A, S, D, ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, DIRECTIONS } from './utils';

export class CharacterControls {
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    orbitControl: OrbitControls;
    camera: THREE.Camera;
    currentAction: string;
    animationsMap: Map<string, THREE.AnimationAction>;

    // state
    toggleRun = false;
    isJumping = false;
    jumpStartTime = 0;
    initialJumpVelocity = 2;
    gravity = -10;

    // temporary data
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuaternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();
    jumpVelocity = new THREE.Vector3(0, 0, 0); // Define jumpVelocity

    // constants
    runVelocity = 5;
    walkVelocity = 2;

    constructor(model: THREE.Group, mixer: THREE.AnimationMixer, orbitControl: OrbitControls, camera: THREE.Camera, animationsMap: Map<string, THREE.AnimationAction>, currentAction: string) {
        this.model = model;
        this.mixer = mixer;
        this.orbitControl = orbitControl;
        this.camera = camera;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.playAnimation('Idle'); // Ensure initial animation is Idle
        this.updateCameraTarget(0, 0);
    }

    public update(delta: number, keysPressed: { [key: string]: boolean }) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        if (keysPressed[' ']) { // Space key for jump
            this.startJump();
        }

        if (this.isJumping) {
            this.updateJump(delta, keysPressed);
        } else if (directionPressed) {
            this.moveCharacter(delta, keysPressed);
        } else {
            if (this.currentAction !== 'Idle') {
                this.playAnimation('Idle');
            }
        }

        // Ensure character does not sink below the ground
        if (this.model.position.y < 0) {
            this.model.position.y = 0;
        }

        this.updateCameraTarget(0, 0);
    }

    private startJump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpStartTime = performance.now();
            this.jumpVelocity.y = this.initialJumpVelocity;
            this.playAnimation('Jump'); // Assumes a jump animation is available
        }
    }

    private updateJump(delta: number, keysPressed: { [key: string]: boolean }) {
        const elapsedTime = (performance.now() - this.jumpStartTime) / 1000;
        const displacement = (this.initialJumpVelocity * elapsedTime) + (0.5 * this.gravity * Math.pow(elapsedTime, 2));
        this.model.position.y += displacement;

        if (this.model.position.y <= 0) {
            this.model.position.y = 0;
            this.isJumping = false;
            const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);
            if (directionPressed) {
                this.moveCharacter(delta, keysPressed);
            } else {
                this.playAnimation('Idle'); // Go back to Idle after landing
            }
        } else {
            // Allow horizontal movement while jumping
            this.moveCharacter(delta, keysPressed);
        }
    }

    private moveCharacter(delta: number, keysPressed: { [key: string]: boolean }) {
        // Check if shift is pressed
        this.toggleRun = keysPressed['shift'] === true;

        // calculate towards camera direction
        const angleYCameraDirection = Math.atan2(
            (this.camera.position.x - this.model.position.x),
            (this.camera.position.z - this.model.position.z)
        );
        // diagonal movement angle offset
        const directionOffset = this.directionOffset(keysPressed);

        // rotate model
        this.rotateQuaternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
        this.model.quaternion.rotateTowards(this.rotateQuaternion, 0.2);

        // calculate direction
        this.camera.getWorldDirection(this.walkDirection);
        this.walkDirection.y = 0;
        this.walkDirection.normalize();
        this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

        // run/walk velocity
        const velocity = this.toggleRun ? this.runVelocity : this.walkVelocity;

        // move model & camera
        const moveX = -this.walkDirection.x * velocity * delta;
        const moveZ = -this.walkDirection.z * velocity * delta;

        this.model.position.x += moveX;
        this.model.position.z += moveZ;

        this.updateCameraTarget(moveX, moveZ);

        // Update animation based on run/walk
        if (!this.isJumping) {  // Only change to walk/run animation if not jumping
            const newAction = this.toggleRun ? 'Run' : 'Walk';
            if (this.currentAction !== newAction) {
                this.playAnimation(newAction);
            }
        }
    }

    public playAnimation(actionName: string) {
        const action = this.animationsMap.get(actionName);
        if (action) {
            const current = this.animationsMap.get(this.currentAction);
            if (current) {
                current.fadeOut(0.2); // Smooth transition from the current animation
            }
            action.reset().fadeIn(0.2).play();
            this.currentAction = actionName; // Update current action state
        }
    }

    private updateCameraTarget(moveX: number, moveZ: number) {
        // move camera
        this.camera.position.x += moveX;
        this.camera.position.z += moveZ;

        // update camera target
        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;
    }

    private directionOffset(keysPressed: { [key: string]: boolean }) {
        let directionOffset = 0;

        if (keysPressed[W] || keysPressed[ARROW_UP]) {
            if (keysPressed[D] || keysPressed[ARROW_RIGHT]) {
                directionOffset = Math.PI / 4 + Math.PI / 2;
            } else if (keysPressed[A] || keysPressed[ARROW_LEFT]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2;
            } else {
                directionOffset = Math.PI;
            }
        } else if (keysPressed[S] || keysPressed[ARROW_DOWN]) {
            if (keysPressed[D] || keysPressed[ARROW_RIGHT]) {
                directionOffset = Math.PI / 4;
            } else if (keysPressed[A] || keysPressed[ARROW_LEFT]) {
                directionOffset = -Math.PI / 4;
            }
        } else if (keysPressed[D] || keysPressed[ARROW_RIGHT]) {
            directionOffset = Math.PI / 2;
        } else if (keysPressed[A] || keysPressed[ARROW_LEFT]) {
            directionOffset = -Math.PI / 2;
        }

        return directionOffset;
    }
}
