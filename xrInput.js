import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { XrHandControllerInput } from './xrHandControllerInput.js';
import { OnnxInference } from './onnxInference.js';

export class XrInput {

    constructor(context) {
        this.context = context;
        this._handModelFactory = new XRHandModelFactory();
        this._leftHandController = undefined;
        this._rightHandController = undefined;

        const xr = context.renderer.xr;
        const profile = 'mesh'; // 'spheres' | 'boxes' | 'mesh'
        this.setupHand(0, xr, profile);
        this.setupHand(1, xr, profile);

        // Initialize OnnxInference without loading the model
        this.onnxInference = new OnnxInference();

        // Add event listener for sessionstart
        xr.addEventListener('sessionstart', this.onSessionStart.bind(this));

        // Initialize variables
        this.predictionTextMesh = null;
    }

    onSessionStart() {
        // Load the model after the session starts
        this.onnxInference.loadModel();
    
        // Create text object to display predictions
        this.createPredictionTextMesh();
    }    

    onAnimate() {
        this._leftHandController?.onAnimate();
        this._rightHandController?.onAnimate();
    
        if (this.onnxInference) {
            // Collect hand data
            const leftHand = this._leftHandController?.hand;
            const rightHand = this._rightHandController?.hand;
    
            // Perform inference
            this.onnxInference.onFrame(leftHand, rightHand).then(result => {
                if (result) {
                    const { topIndices, topProbabilities } = result;

                    const classNames = [
                        'Null', 'Rock', 'Scissor', 'Paper'
                    ];
    
                    // Prepare prediction text
                    const topPredictions = topIndices.map((idx, i) => {
                        const className = classNames[idx];
                        const probability = topProbabilities[i];
                        return `${className} (${(probability * 100).toFixed(1)}%)`;
                    });
    
                    const message = topPredictions.join('\n');
    
                    // Update prediction text mesh
                    this.updatePredictionTextMesh(message);
                } else {
                    // console.log('Inference result is empty.');
                }
            })
        } else {
            // console.warn('OnnxInference is not initialized.');
        }
    }    

    createPredictionTextMesh() {
        const loader = new FontLoader();
    
        // Load the font
        loader.load('fonts/helvetiker_regular.typeface.json', (font) => {
            // Store the font for later use
            this.font = font;
    
            // Create initial text geometry with placeholder text
            const textGeometry = new TextGeometry('Loading...', {
                font: this.font,
                size: 0.1,
                height: 0.01,
            });
    
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White color
            this.predictionTextMesh = new THREE.Mesh(textGeometry, textMaterial);
    
            this.predictionTextMesh.position.set(-0.4, 1.6, -2.4);
    
            // Optional: Set render order and depth test
            this.predictionTextMesh.renderOrder = 999;
            this.predictionTextMesh.material.depthTest = false;
    
            this.context.scene.add(this.predictionTextMesh);
    
            // Now that the font is loaded and text mesh is created, update it with initial message
            this.updatePredictionTextMesh('Getting Model Ready');
        });
    }

    updatePredictionTextMesh(message) {
        if (this.predictionTextMesh && this.font) {
            // console.log('Updating text mesh with message:', message);
    
            // Dispose of old geometry
            this.predictionTextMesh.geometry.dispose();
    
            // Create new geometry using the stored font
            const textGeometry = new TextGeometry(message, {
                font: this.font,
                size: 0.1, // Adjust size as needed
                height: 0.01,
            });
    
            // Assign the new geometry to the mesh
            this.predictionTextMesh.geometry = textGeometry;
        } else {
            // console.warn('Prediction text mesh or font is not initialized.');
        }
    }    
 
    setupHand(index, xr, handProfile) {
        // Hand
        const controllerHand = xr.getHand(index);
        const handModel = this._handModelFactory.createHandModel(controllerHand, handProfile);

        controllerHand.add(handModel);
        this.context.scene.add(controllerHand);

        // Events
        controllerHand.addEventListener('connected', (event) => this.onHandConnect(event, controllerHand));
        controllerHand.addEventListener('disconnected', (event) => this.onHandDisconnect(event, controllerHand));
    }

    onHandConnect(event, hand) {
        const data = event.data;
        if (data.handedness == "right") {
            this._rightHandController = new XrHandControllerInput(this.context, hand, 'right');
            this._rightHandController.onConnect();
        }
        if (data.handedness == "left") {
            this._leftHandController = new XrHandControllerInput(this.context, hand, 'left');
            this._leftHandController.onConnect();
        }
    }

    onHandDisconnect(event) {
        const data = event.data;
        if (data.handedness == "right") {
            this._rightHandController?.onDisconnect();
            this._rightHandController = undefined;
        }
        if (data.handedness == "left") {
            this._leftHandController?.onDisconnect();
            this._leftHandController = undefined;
        }
    }

}
