import * as THREE from "three";

export const HandJointNames = [
    'wrist',
    'thumb-metacarpal',
    'thumb-phalanx-proximal',
    'thumb-phalanx-distal',
    'thumb-tip',
    'index-finger-metacarpal',
    'index-finger-phalanx-proximal',
    'index-finger-phalanx-intermediate',
    'index-finger-phalanx-distal',
    'index-finger-tip',
    'middle-finger-metacarpal',
    'middle-finger-phalanx-proximal',
    'middle-finger-phalanx-intermediate',
    'middle-finger-phalanx-distal',
    'middle-finger-tip',
    'ring-finger-metacarpal',
    'ring-finger-phalanx-proximal',
    'ring-finger-phalanx-intermediate',
    'ring-finger-phalanx-distal',
    'ring-finger-tip',
    'pinky-finger-metacarpal',
    'pinky-finger-phalanx-proximal',
    'pinky-finger-phalanx-intermediate',
    'pinky-finger-phalanx-distal',
    'pinky-finger-tip'
]

export class XrGestureTracker {

    constructor(context, hand, handSide, jointAxis = false) {  
        this.context = context ;
        this.hand = hand ;
        this.handSide = handSide ;

        this._debugAxis = [];
        if (jointAxis) {
            for (let name of HandJointNames) {
                const joint = this.hand.joints[name];
                if (joint) {
                    const axis = new THREE.AxesHelper(0.015);
                    this._debugAxis.push(axis);
                    joint.add(axis);
                }
            }
        }
    }

}
