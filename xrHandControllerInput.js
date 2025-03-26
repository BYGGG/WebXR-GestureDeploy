import * as THREE from 'three';
import { XrGestureTracker } from './xrGestureTracker.js';

export class XrHandControllerInput {

    constructor(context, hand, handSide) {
        this.gesture = new XrGestureTracker(context, hand, handSide);
        this.context = context;
        this.hand = hand;
        this.handSide = handSide;
        this.hasHand = true;

        this._worldPosition = new THREE.Vector3();
        this._worldRotation = new THREE.Quaternion();
        this._lastUpdate = -1;
        this._wristAxis = new THREE.AxesHelper(0.1);
    }

    /*
     * Position of the wrist in world coordinates
     */
    get wristWPos() {
        this.refresh();
        return this._worldPosition;
    }

    /*
     * Rotation of the wrist in world orientation
     */
    get wristWQuat() {
        this.refresh();
        return this._worldRotation;
    }

    /**
     * Called when the controller is connected
     */
    onConnect() {
        this.context.scene.add(this._wristAxis);
    }    

    /**
     * Called on each animation frame
     */
    onAnimate() {
        this._wristAxis.position.copy(this.wristWPos);
        this._wristAxis.quaternion.copy(this.wristWQuat);
    }

    /**
     * Called when the controller is disconnected
     */
    onDisconnect() {
        this._wristAxis?.removeFromParent();
    }

    /*
     * Refreshes the wrist position and rotation based on hand data.
     */
    refresh() {
        if (this._lastUpdate == this.context.frame) return; // Already updated for this frame
        this._lastUpdate = this.context.frame;

        const wrist = this.hand.joints["wrist"];
        if (!wrist) return;

        // Position and Rotation
        wrist.getWorldPosition(this._worldPosition);
        wrist.getWorldQuaternion(this._worldRotation);
    }

}
