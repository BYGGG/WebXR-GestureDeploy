import * as THREE from 'three';
import { HandJointNames } from './xrGestureTracker.js';

export class OnnxInference {

    constructor() {
        this.windowSize = 120; // Sliding window size
        this.stepSize = 20;    // Step size for sliding window
        this.windowBuffer = []; // Buffer to store frames

        this.meanSkeleton = 0.1026281; // Mean value for normalization
        this.stdSkeleton = 0.3661150;  // Standard deviation for normalization

        this.model = null;
        this.modelLoaded = false;
    }

    async loadModel() {
        // Update with the actual path to the ONNX model
        const modelUrl = './onnx/xxx.onnx';

        try {
            this.model = await ort.InferenceSession.create(modelUrl);
            this.modelLoaded = true;
            // console.log('ONNX model loaded successfully.');
        } catch (error) {
            // console.error('Failed to load ONNX model:', error);
        }
    }

    collectJointData(leftHand, rightHand) {
        const numJointsPerHand = 25;
        const processedRow = [];
    
        // Helper function to process one hand
        const processHand = (hand) => {
            if (hand) {
                for (let jointName of HandJointNames) {
                    const joint = hand.joints[jointName];
                    if (joint) {
                        // Get world position
                        const position = new THREE.Vector3();
                        joint.getWorldPosition(position);
    
                        // Get world quaternion
                        const quaternion = new THREE.Quaternion();
                        joint.getWorldQuaternion(quaternion);
    
                        // Append position and quaternion components
                        processedRow.push(position.x, position.y, position.z);
                        processedRow.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
                    } else {
                        // If joint is missing, append zeros
                        processedRow.push(0, 0, 0); // Position
                        processedRow.push(0, 0, 0, 0); // Quaternion
                    }
                }
            } else {
                // If hand is missing, append zeros for all joints
                for (let i = 0; i < numJointsPerHand; i++) {
                    processedRow.push(0, 0, 0);     // Position
                    processedRow.push(0, 0, 0, 0); // Quaternion
                }
            }
        };
    
        // Process both hands
        processHand(leftHand);
        processHand(rightHand);
    
        return processedRow;
    }

    // Quaternion conjugate function
    quatConjugate(quat) {
        const [w, x, y, z] = quat;
        return [w, -x, -y, -z];
    }

    // Quaternion multiplication function
    quatMultiply(q1, q2) {
        const [w1, x1, y1, z1] = q1;
        const [w2, x2, y2, z2] = q2;
        return [
            w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
            w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
            w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
            w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
        ];
    }

    // Convert to local coordinates for a single row
    convertToLocalRow(rawRow) {
        const indexOffset = 7; // 3 for position + 4 for rotation
        const numJointsPerHand = 25;
        const lhOffset = 0;
        const rhOffset = numJointsPerHand * indexOffset;

        // Extract wrist positions
        const lhWristPos = rawRow.slice(lhOffset, lhOffset + 3);
        const rhWristPos = rawRow.slice(rhOffset, rhOffset + 3);

        // Parent joints mapping
        const parentJoints = [-1, 0, 1, 2, 3, 0, 5, 6, 7, 8, 0, 10, 11, 12, 13, 0, 15, 16, 17, 18, 0, 20, 21, 22, 23];

        const rowLocal = rawRow.slice(); // Create a copy of the array

        for (let joint = 0; joint < numJointsPerHand; joint++) {
            const parentJoint = parentJoints[joint];

            // Left hand
            const lhBaseIdx = lhOffset + indexOffset * joint;
            const lhGlobalPos = rawRow.slice(lhBaseIdx, lhBaseIdx + 3);
            const lhLocalPos = [
                lhGlobalPos[0] - lhWristPos[0],
                lhGlobalPos[1] - lhWristPos[1],
                lhGlobalPos[2] - lhWristPos[2],
            ];
            rowLocal.splice(lhBaseIdx, 3, ...lhLocalPos);

            // Right hand
            const rhBaseIdx = rhOffset + indexOffset * joint;
            const rhGlobalPos = rawRow.slice(rhBaseIdx, rhBaseIdx + 3);
            const rhLocalPos = [
                rhGlobalPos[0] - rhWristPos[0],
                rhGlobalPos[1] - rhWristPos[1],
                rhGlobalPos[2] - rhWristPos[2],
            ];
            rowLocal.splice(rhBaseIdx, 3, ...rhLocalPos);

            if (parentJoint === -1) {
                continue;
            }

            // Indices for quaternion components
            const lhParentBaseIdx = lhOffset + indexOffset * parentJoint;
            const rhParentBaseIdx = rhOffset + indexOffset * parentJoint;

            const lhJointBaseIdx = lhBaseIdx;
            const rhJointBaseIdx = rhBaseIdx;

            // Extract quaternion components in the order [w, x, y, z]
            const lhParentQuat = [
                rawRow[lhParentBaseIdx + 6],
                rawRow[lhParentBaseIdx + 3],
                rawRow[lhParentBaseIdx + 4],
                rawRow[lhParentBaseIdx + 5],
            ];
            const rhParentQuat = [
                rawRow[rhParentBaseIdx + 6],
                rawRow[rhParentBaseIdx + 3],
                rawRow[rhParentBaseIdx + 4],
                rawRow[rhParentBaseIdx + 5],
            ];

            const lhGlobalQuat = [
                rawRow[lhJointBaseIdx + 6],
                rawRow[lhJointBaseIdx + 3],
                rawRow[lhJointBaseIdx + 4],
                rawRow[lhJointBaseIdx + 5],
            ];
            const rhGlobalQuat = [
                rawRow[rhJointBaseIdx + 6],
                rawRow[rhJointBaseIdx + 3],
                rawRow[rhJointBaseIdx + 4],
                rawRow[rhJointBaseIdx + 5],
            ];

            const lhLocalQuat = this.quatMultiply(this.quatConjugate(lhParentQuat), lhGlobalQuat);
            const rhLocalQuat = this.quatMultiply(this.quatConjugate(rhParentQuat), rhGlobalQuat);

            // Store the local quaternions back into rowLocal
            rowLocal[lhJointBaseIdx + 6] = lhLocalQuat[0];
            rowLocal[lhJointBaseIdx + 3] = lhLocalQuat[1];
            rowLocal[lhJointBaseIdx + 4] = lhLocalQuat[2];
            rowLocal[lhJointBaseIdx + 5] = lhLocalQuat[3];

            rowLocal[rhJointBaseIdx + 6] = rhLocalQuat[0];
            rowLocal[rhJointBaseIdx + 3] = rhLocalQuat[1];
            rowLocal[rhJointBaseIdx + 4] = rhLocalQuat[2];
            rowLocal[rhJointBaseIdx + 5] = rhLocalQuat[3];
        }

        return rowLocal;
    }

    processRow(row, selectedJoints, mode) {
        // Constants: 3 position + 4 rotation = 7 features per joint
        const totalFeaturesPerJoint = 7;
        const positionOffset = 3;
        const numJointsPerHand = 25;
        const processedRow = [];

        // Process both hands
        for (let handOffset of [0, numJointsPerHand * totalFeaturesPerJoint]) {
            for (let joint of selectedJoints) {
                const startIdx = handOffset + joint * totalFeaturesPerJoint;
                if (mode === 0) { // Position only
                    const positionData = row.slice(startIdx, startIdx + positionOffset);
                    processedRow.push(...positionData);
                } else if (mode === 1) { // Rotation only
                    const rotationData = row.slice(startIdx + positionOffset, startIdx + totalFeaturesPerJoint);
                    processedRow.push(...rotationData);
                } else { // Both Position and Rotation
                    const positionData = row.slice(startIdx, startIdx + positionOffset);
                    const rotationData = row.slice(startIdx + positionOffset, startIdx + totalFeaturesPerJoint);
                    processedRow.push(...positionData, ...rotationData);
                }
            }
        }
        return processedRow;
    }

    normalizeData(data) {
        // Normalize each element
        return data.map(value => (value - this.meanSkeleton) / this.stdSkeleton);
    }

    getTopIndices(array, n) {
        const indices = Array.from(array.keys());
        indices.sort((a, b) => array[b] - array[a]); // Descending order
        return indices.slice(0, n);
    }

    async infer() {
        if (!this.modelLoaded) {
            // console.error('ONNX model is not loaded.');
            return null;
        }

        if (this.windowBuffer.length >= this.windowSize) {
            // Prepare input tensor
            const windowData = this.windowBuffer.slice(0, this.windowSize);

            // Parameters for data processing
            const selectedJointsOption = 'Whole hand (25)'; // Adjust as needed
            const mode = 2; // 0: Position only, 1: Rotation only, 2: Both
            const jointSelectionMap = {
                'Whole hand (25)': [...Array(25).keys()], // Joints 0 to 24
                'Fingertips (5)': [4, 9, 14, 19, 24],
                'Palm (11)': [0, 1, 2, 5, 6, 10, 11, 15, 16, 20, 21],
                'Intermediate Phalanx (4)': [7, 12, 17, 22],
                'Distal Phalanx (5)': [3, 8, 13, 18, 23],
            };
            const selectedJoints = jointSelectionMap[selectedJointsOption];

            // Preprocess data
            let preprocessedWindow = windowData.map(row => this.processRow(row, selectedJoints, mode));

            // Normalize the window data
            preprocessedWindow = preprocessedWindow.map(row => this.normalizeData(row));

            // Flatten and create tensor
            const inputTensor = new ort.Tensor(
                'float32',
                Float32Array.from(preprocessedWindow.flat()),
                [1, this.windowSize, preprocessedWindow[0].length]
            );

            // Run inference
            try {
                const feeds = {};
                const inputName = this.model.inputNames[0];
                feeds[inputName] = inputTensor;
                const results = await this.model.run(feeds);
                const outputName = this.model.outputNames[0];
                const predictions = results[outputName];

                // Process predictions
                let averagedPredictions;
                if (predictions.dims.length === 3) {
                    // Predictions per time step
                    const [batchSize, sequenceLength, numClasses] = predictions.dims;
                    averagedPredictions = new Array(numClasses).fill(0);

                    for (let i = 0; i < numClasses; i++) {
                        let sum = 0;
                        for (let t = 0; t < sequenceLength; t++) {
                            sum += predictions.data[i + t * numClasses];
                        }
                        averagedPredictions[i] = sum / sequenceLength;
                    }
                } else if (predictions.dims.length === 2) {
                    // Predictions per sequence
                    averagedPredictions = Array.from(predictions.data);
                } else {
                    // console.error('Unexpected output dimensions:', predictions.dims);
                    return null;
                }

                // Get top 2 predictions
                const topIndices = this.getTopIndices(averagedPredictions, 2);
                const topProbabilities = topIndices.map(idx => averagedPredictions[idx]);

                // Slide the window
                this.windowBuffer = this.windowBuffer.slice(this.stepSize);

                return { topIndices, topProbabilities };
            } catch (error) {
                // console.error('ONNX inference failed:', error);
                return null;
            }
        }

        return null;
    }

    async onFrame(leftHand, rightHand) {
        // Collect joint data
        const rawRow = this.collectJointData(leftHand, rightHand);

        // Convert to local coordinates
        const rawRowLocal = this.convertToLocalRow(rawRow);

        // Add the new local row to the buffer
        this.windowBuffer.push(rawRowLocal);

        // Perform inference if ready
        if (this.windowBuffer.length >= this.windowSize) {
            // console.log('Performing inference...');
            const result = await this.infer();
            // console.log('Inference result:', result);
            return result;
        }

        return null;
    }

}
