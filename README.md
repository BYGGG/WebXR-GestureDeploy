# Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Usage](#usage)

## Overview
This repository provides an online inference WebXR backend for [GestureTrainer](https://github.com/BYGGG/GestureTrainer). It hosts a local server to visualize and infer gestures in real-time using a Mixed Reality (MR) headset.

## Features
- **Accessible:** Easily accessed via the headset’s built-in browser.  
- **Online Inference:** Real-time gesture recognition through WebXR.

## Prerequisites
- Node.js  
- Three.js
- onnxruntime-web
- A WebXR-enabled headset (e.g., Meta Quest 3)

## Usage

1. **Installation**  
   - Clone this repository.  
   - In the project’s root directory, install the required dependencies:  
     ```bash
     npm install
     ```
   
2. **Enable Localhost HTTPS**  
   - Hand tracking in WebXR requires HTTPS.  
   - Use a tool (e.g., [mkcert](https://github.com/FiloSottile/mkcert) or another method) to create and enable HTTPS for localhost.  
   - Follow the instructions from the relevant tool to set up local HTTPS certificates.

3. **Setup Before Inference**  
   - In `onnxInference.js`, define the following based on your dataset:
     - **Window size**  
     - **Step size**  
     - **Model directory**  
     - **Mean and standard deviation** values  
   - In `xrInput.js`, define the **gesture class names** corresponding to your dataset so the correct gesture class will be displayed during inference.

4. **Launch WebXR Locally**  
   - Once everything is configured, connect your headset to your PC.  
   - Host the webpage locally, for example:
     ```bash
     http-server -S -C localhost.pem -K localhost-key.pem -p 3000
     ```
     This starts an HTTPS server at port 3000.  
   - To share this local server with your headset, enable port forwarding. For example, in Chrome, navigate to `chrome://inspect/#devices` and forward port 3000 to match your localhost:  
     ```
     localhost:3000  ->  3000
     ```
   - On your headset’s browser, open `https://localhost:3000`. You should see a button labeled **Enter VR** at the bottom of the scene. Enter VR mode to begin online gesture inference.  
   - A successful run should look like this:  
     
     ![image](https://github.com/user-attachments/assets/568fdf85-61c1-4b58-ab2f-81d2014eed6a)

### Reference
This project builds upon work from [threejs-webxr-hands-example](https://github.com/vrmeup/threejs-webxr-hands-example) to create the virtual scene. Many thanks to the contributors of that project!
