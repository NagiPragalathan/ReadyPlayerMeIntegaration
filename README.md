# threejs-character-controls-example

This project demonstrates character controls using Three.js, integrated with Ready Player Me avatars.

## Installation and Setup

1. Clone the repository:

    `git clone https://github.com/NagiPragalathan/ReadyPlayerMeIntegaration.git
    cd ReadyPlayerMeIntegaration` 
    
2. Install dependencies:

    `npm install` 
    
3. Start the development server:
    
    `npm run start` 
    
4. Open your browser and navigate to `http://localhost:3000` to see the example in action.
    

## Key Features

- **Character Controls**: Implemented in `characterControls.ts`, includes movement and interaction logic.
- **Ready Player Me Integration**: Integrates Ready Player Me avatars for 3D character representation.

## Usage

- Modify `characterControls.ts` for custom character control logic.
- Integrate different Ready Player Me avatars by modifying the avatar loading logic.

## Integration Code

Here's a snippet for integrating Ready Player Me avatars and animations:

`gltfLoader.load('https://models.readyplayer.me/65893b0514f9f5f28e61d783.glb', function (gltf) {
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
});` 

# Steps
 - Replace your link For : `https://models.readyplayer.me/65893b0514f9f5f28e61d783.glb`
 - And default models which is in models. for example models/Idle.fbx
   
## Try it Online

- Explore the example on [Stackblitz](https://stackblitz.com/github/tamani-coding/threejs-character-controls-example).

## Ready Player Me

Ready Player Me is a platform that allows the creation of customizable 3D avatars for use in various applications, including games and virtual environments. For more information, visit [Ready Player Me](https://readyplayer.me/).

## License

This project is licensed under the MIT License.
