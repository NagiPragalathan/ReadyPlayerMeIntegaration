import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { A, D, DIRECTIONS, S, W } from './utils';

export class CharacterControls {
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    orbitControl: OrbitControls;
    camera: THREE.Camera;
    currentAction: string;
    animationsMap: Map<string, THREE.AnimationAction>;

    // state
    toggleRun = true;
    
    // temporary data
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuaternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();
    
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
        this.updateCameraTarget(0, 0);
    }

    public update(delta: number, keysPressed: { [key: string]: boolean }) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        if (directionPressed) {
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

            if (this.currentAction !== 'Walk') {
                this.currentAction = 'Walk';
                this.playAnimation('Walk');
            }
        } else {
            if (this.currentAction !== 'Idle') {
                this.currentAction = 'Idle';
                this.playAnimation('Idle');
            }
        }
    }

    private playAnimation(actionName: string) {
        const action = this.animationsMap.get(actionName);
        if (action) {
            this.mixer.stopAllAction();
            action.reset().fadeIn(0.5).play();
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
        let directionOffset = 0; // w

        if (keysPressed[S]) {
            if (keysPressed[D]) {
                directionOffset = Math.PI / 4;
            } else if (keysPressed[A]) {
                directionOffset = - Math.PI / 4; 
            }
        } else if (keysPressed[W]) {
            if (keysPressed[D]) {
                directionOffset = Math.PI / 4 + Math.PI / 2; 
            } else if (keysPressed[A]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2; 
            } else {
                directionOffset = Math.PI; 
            }
        } else if (keysPressed[D]) {
            directionOffset = Math.PI / 2; 
        } else if (keysPressed[A]) {
            directionOffset = - Math.PI / 2; 
        }

        return directionOffset;
    }
}
