# Goldford-3D-Room-Controller-v01

**Real-time acoustic room mode calculator, resonance export system, SPAT visualizer, and audio source controller with a procedural skybox environment**

![License](https://img.shields.io/badge/license-CC%20BY--ND%204.0-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Max/MSP-orange)

# 3D Room Mode Calculator & Spatial Audio Interface

## Overview
A web-based toolset for modeling, analyzing, and interacting with spatial audio environments. It includes a 3D room mode calculator, resonance exporter, audio source controller, and SPAT visualizer (SPAT is an audio spatialization engine from IRCAM-Centre pompidou), deployed as a progressive web application.

## Live Demo
https://lg-3d-room-v01.vercel.app/

## What it does
- Calculates room modes and resonance behavior in a navigable 3D acoustic space  
- Exports resonance data for use in audio and synthesis workflows  
- Provides an interface for controlling and positioning virtual audio sources  
- Visualizes spatial audio configurations using SPAT-based models  
- Supports interactive exploration of audio source parameters, which can be demonstrated on a local copy of a MaxMSP patch and rendered as an binaural audio file  

## Technologies
- JavaScript / Web-based front-end (PWA architecture)  
- Vercel (deployment)  
- Three.js    
- Node.js    
- MaxMSP    
- SPAT (a Max library)   

## Context
Developed as part of ongoing work in audio systems design, spatialization, and interactive front-end tools for music technology. This project reflects a focus on user interface design for intricate audio environments and real-time user interaction.

## Notes
This project is currently in beta and under active development. It serves as a prototype for testing and refining workflows in spatial audio modeling and control.

## [Contents](#contents)  

1. [Overview](#overview)  
    1. [Key Features](#key-features)  
2. [Quick Start](#quick-start)  
    1. [Prerequisites](#prerequisites)  
    2. [Installation](#installation)  
    3. [System Architecture](#system-architecture)  
    4. [Communication Flow](#communication-flow)  
3. [Usage Guide](#usage-guide)  
    1. [Basic Controls](#basic-controls)  
    2. [GUI Sections](#gui-sections)  
      1. [Room Dimensions](#room-dimensions)  
      2. [Mode Selector](#mode-selector)  
      3. [Animation + Voxel Grid](#animation--voxel-grid)  
      4. [Heat Map Colors](#heat-map-colors)  
      5. [SPAT Visibility](#spat-visibility)  
      6. [Environment](#environment)  
    3. [Export Options](#export-options)  
3. [OSC Message Reference](#osc-message-reference)  
    1. [Listener Messages](#listener-messages)  
    2. [Source Messages](#source-messages)  
    3. [Speaker Messages](#speaker-messages)  
    4. [Ring Layout Messages](#ring-layout-messages)  
4. [Room Mode Theory](#room-mode-theory)  
    1. [Standing Wave Patterns](#standing-wave-patterns)  
    2. [Mode Classification](#mode-classification)  
    3. [Schroeder Frequency](#schroeder-frequency)  
5. [Technical Implementation](#technical-implementation)  
    1. [Coordinate Systems](#coordinate-systems)  
    2. [File Structure](#file-structure)  
6. [Key Technologies](#key-technologies)  
7. [Development](#development)  
    1. [Running in Development Mode](#running-in-development-mode)  
    2. [Adding New OSC Messages](#adding-new-osc-messages)  
    3. [Custom 3D Models](#custom-3d-models)  
8. [Use Cases](#use-cases)  
    1. [Educational](#educational)  
    2. [Professional](#professional)  
    3. [Creative](#creative)  
9. [Troubleshooting](#troubleshooting)  
    1. [Common Issues](#common-issues)  
    2. [Performance Optimization](#performance-optimization)  
10. [References](#references)  
11. [License](#license)  
    1. [3D Model Attributions](#3d-model-attributions)  
12. [Author](#author)  

## [Overview](#Overview)  

This interactive 3D visualization tool calculates and displays acoustic room modes for any rectangular space. It features real-time integration with Max/MSP SPAT (Spatial Audio Processing Toolbox) for spatial audio visualization, complete with animated listener head tracking, procedural skybox environments, and comprehensive export capabilities.

### [Key Features](#Key-Features)   

- **Interactive 3D room mode visualization** with customizable dimensions
- **Real-time SPAT integration** via OSC over WebSocket
- **Animated listener head** with aircraft-style orientation lights
- **Dynamic speaker and source positioning** with 3D models
- **Procedural skybox environment** with gradient sky and sunset effects
- **Room mode table** with frequency, pitch, and family classification
- **Export capabilities** for JSON resonance data and Max/MSP collections
- **Real-time parameter control** via dat.GUI interface

## [Quick Start](#Quick-Start)  

### [Prerequisites](#Prerequisites)  

- **Node.js** (v14 or higher)
- **Max/MSP** (v8 or higher)
- **Modern web browser** with WebGL support

### [Installation](#Installation)  

1. **Clone the repository:**
   ```bash
   git clone https://github.com/einbahnstrasse/Goldford-3D-Room-Controller-v01.git
   cd Goldford-3D-Room-Controller-v01
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Launch Max/MSP and open the bridge patch:**
   ```
   File → Open → udp_ws_bridge.v01.maxpat
   ```

4. **Start the WebSocket bridge in Max** (click the toggle or bang in the patch)

5. **Open the visualization in your browser:**
   ```
   Open index.html in your browser
   ```

## [System Architecture](#System-Architecture)  

```
┌─────────────────┐    UDP 9001     ┌─────────────────┐    WS 8081      ┌─────────────────┐
│                 │ ──────────────> │                 │ ──────────────> │                 │
│   SPAT / Max    │                 │  Node.js Bridge │                 │   Browser GUI   │
│                 │ <────────────── │                 │ <────────────── │                 │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
      OSC Data          udp_ws_bridge.v03.js           Three.js Scene
```

### [Communication Flow](#Communication-Flow)  

1. **SPAT** sends OSC messages via UDP to port 9001
2. **Node.js bridge** (running in Max) converts UDP to WebSocket
3. **Browser** receives real-time updates on port 8081
4. **3D visualization** updates positions, orientations, and parameters

## [Usage Guide](#Usage-Guide)  

### [Basic Controls](#Basic-Controls)  

- **Mouse**: Orbit around the scene (click + drag)
- **Scroll**: Zoom in/out
- **GUI Panel**: Adjust all parameters in real-time

### [GUI Sections](#GUI-Sections)  

#### [Room Dimensions](#Room-Dimensions)  
- **Length (x)**: 3-60m room length
- **Width (y)**: 2.5-40m room width  
- **Height (z)**: 2.3-25m room height
- **RT60**: Reverb decay time (0.2-2.5s)

#### [Mode Selector](#Mode-Selector)  
- **mx, my, mz**: Room mode orders (0-16)
- Preview any standing wave pattern

#### [Animation + Voxel Grid](#Animation-Voxel-Grid)  
- **Pulse Hz**: Breathing rate of pressure field (0.05-2 Hz)
- **Grid dx**: Voxel spacing (0.02-1m)
- **Point Size**: Visual size of grid points
- **Alpha**: Field transparency

#### [Heat Map Colors](#Heat-Map-Colors)  
- **Hue**: Base color tint
- **Gamma**: Brightness curve adjustment
- **L min/max**: Lightness range

#### [SPAT Visibility](#SPAT-Visibility)  
- **Speaker/Source/Head Opacity**: Control visibility of 3D elements
- **Aircraft Lights**: Blinking intensity on listener ears
- **Blinking On/Off**: Toggle orientation lights

#### [Environment](#Environment)  
- **Enable Skybox**: Toggle procedural sky environment
- **Sky Intensity**: Overall brightness (0-2.0)
- **Sunset Position**: Vertical glow position (0-1.0)
- **Sky Colors**: RGB controls for top/horizon/bottom

### [Export Options](#Export-Options)  

- **Download .txt**: Max/MSP collection format for coll objects
- **Download .json**: Complete resonance data with antinode coordinates

## [OSC Message Reference](#OSC-Message-Reference)  

### [Listener Messages](#Listener-Messages)  

```osc
/listener/aed [azimuth] [elevation] [distance]
/listener/xyz [x] [y] [z]
/listener/ear/height [height]
```

**Examples:**
```osc
/listener/aed 90.0 0.0 0.0    # Face right (+X direction in SPAT)
/listener/xyz 0.0 -0.67 0.0     # Position at origin, -0.67m backwards 
/listener/ear/height 1.3      # Set ear height for speakers/sources*
```
*NOTE: In SPAT, the position of the head & ears is always a horizontal reference of zero (i.e., Z=0). Although SPAT itself does not support an ear height message, we have freely adapted it here to easily position SPAT elements. Because we are orienting around a 3D room in our system, we've established a default value of 1.3m above room floor level (i.e., typical of a seated adult listener), and this does not need to be specified. However, by adjusting this to any other value, the sources, speakers, and listener postiions should adjust automatically in the three.js scene. 

### [Source Messages](#Source-Messages)  

```osc
/source/number [count]        # Set total number of sources
/source/[N]/aed [az] [el] [d] # Position source N
/source/[N]/xyz [x] [y] [z]   # Position source N (Cartesian)
/source/[N]/label "[text]"    # Set source label
/source/[N]/color [r] [g] [b] [a]  # Set source color
```

**Examples:**
```osc
/source/number 3              # Create 3 sources
/source/1/aed 0.0 0.0 1.0    # Source 1 in front of listener
/source/2/xyz 0.8 0.0 0.2    # Source 2 at specific coordinates
/source/1/label "vocals"      # Label first source
/source/1/color 0.49 1.0 0.0 1.0  # Bright green source
```

### [Speaker Messages](#Speaker-Messages)  

```osc
/speaker/number [count]       # Set total number of speakers
/speaker/[N]/aed [az] [el] [d] # Position speaker N
/speaker/[N]/xyz [x] [y] [z]  # Position speaker N (Cartesian)
/speaker/[N]/label "[text]"   # Set speaker label
```

**Examples:**
```osc
/speaker/number 8             # Create 8-speaker ring
/speaker/1/aed 45.0 0.0 1.5  # Speaker 1 at 45° right
/speaker/5/xyz -1.0 -1.0 0.0  # Speaker 5 behind-left
```

### [Ring Layout Messages](#Ring-Layout-Messages)  

```osc
/speakers/azimuth/offset [degrees]  # Rotate entire speaker ring
/sources/azimuth/offset [degrees]   # Rotate entire source ring
```

**Examples:**
```osc
/speakers/azimuth/offset 22.5    # Rotate speakers 22.5° clockwise
/sources/azimuth/offset -15.0    # Rotate sources 15° counter-clockwise
```

## [Room Mode Theory](#Room-Mode-Theory)  

### [Standing Wave Patterns](#Standing-Wave-Patterns)  

Room modes are standing wave patterns that occur at specific frequencies in rectangular enclosures (i.e., "ideal rooms"). Each mode is characterized by three integers (nx, ny, nz) representing the number of half-wavelengths along each axis.

### [Mode Classification](#Mode-Classification)  

- **Axial (1,0,0)**: Between parallel walls only
- **Tangential (1,1,0)**: Involving two pairs of walls  
- **Oblique (1,1,1)**: Involving all six room surfaces

### [Schroeder Frequency](#Schroeder-Frequency)  

The transition point where modal behavior gives way to statistical reverberation:

```
fs = 2000 * √(T60 / Volume)
```

Above this frequency, the room behaves more like a statistical reverberant space, and is more efficiently modeled with reverb software baseed on time-series filters and other algorithms. Below Schroeder, however, some interesting tonal behaviors emerge, so we've modeled those here based on the physicality of a so-called "real" or "ideal" space. 

## [Technical Implementation](#Technical-Implementation)  

### [Coordinate Systems](#Coordinate-Systems)  

The visualization handles coordinate conversion between three systems:

- **SPAT**: Left-handed, Y-forward, Z-up
- **Three.js**: Right-handed, Y-up, Z-forward  
- **Room**: Origin at room center, Y-up

### [File Structure](#File-Structure)  

```
Goldford-3D-Room-Controller-v01/
├── index.html                 # Main HTML file
├── lg.scene.render.v04.js     # Core 3D visualization
├── lg.spat.io.v01.js         # SPAT coordinate utilities
├── lg.spatOscBridge.v03.js   # OSC message parsing
├── udp_ws_bridge.v03.js      # Node.js WebSocket bridge
├── udp_ws_bridge.v01.maxpat  # Max/MSP patch
├── style.v06.css             # Styling
├── assets/                   # 3D models
│   ├── male_head.glb         # Listener head model
│   └── yamaha_hs5_studio_monitor.glb  # Speaker model
└── package.json              # Dependencies
```

### [Key Technologies](#key-technologies)  

- **Three.js**: 3D rendering and scene management
- **dat.GUI**: Real-time parameter controls
- **OSC.js**: OSC message parsing
- **WebSocket**: Real-time communication
- **GLSL Shaders**: Procedural skybox rendering

## [Development](#development)  

### [Running in Development Mode](#running-in-development-mode)  

1. Start the Max/MSP bridge patch
2. Make changes to JavaScript/CSS files
3. Refresh browser to see updates
4. Use browser dev tools for debugging

### [Adding New OSC Messages](#adding-new-osc-messages)  

1. **Add parsing logic** in `lg.spatOscBridge.v03.js`
2. **Implement handler** in `lg.scene.render.v04.js`  
3. **Register callback** in OSC bridge configuration
4. **Test** with Max/MSP or OSC debugging tools

### [Custom 3D Models](#custom-3d-models)  

Replace models in `/assets/` directory:
- Use **.glb** format for best compatibility
- Scale models appropriately (head ~0.1, speakers ~0.7)
- Ensure proper materials for transparency effects

## [Use Cases](#use-cases)  

### [Educational](#educational)  

- **Room acoustics courses**: Visualize standing wave theory
- **Audio engineering**: Understand modal behavior
- **Architecture**: Room design implications

### [Professional](#professional)  

- **Studio design**: Optimize room dimensions
- **Spatial audio**: SPAT workflow integration
- **Research**: Room mode analysis and export

### [Creative](#creative)  

- **Audio-visual performances**: Real-time spatial visualization
- **Installation art**: Interactive acoustic environments
- **Sound design**: Spatial audio experimentation

## [Troubleshooting](#troubleshooting)  

### [Common Issues](#common-issues)  

**"WebSocket connection failed"**
- Ensure Max/MSP bridge patch is running
- Check that port 8081 is not blocked by firewall
- Verify Node.js dependencies are installed

**"Models not loading"**  
- Check that `/assets/` directory contains .glb files
- Verify correct file paths in network tab
- Ensure models are properly formatted

**"OSC messages not received"**
- Confirm UDP port 9001 is available
- Check Max/MSP patch for error messages  
- Verify OSC message format matches specifications

### [Performance Optimization](#performance-optimization)  

- Reduce voxel grid resolution (`dx` parameter)
- Lower point count for complex room modes
- Disable skybox if frame rate drops
- Use fewer sources/speakers for older hardware

## [References](#references)  

- [SPAT Documentation](https://forum.ircam.fr/projects/detail/spat/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Room Acoustics Theory](https://en.wikipedia.org/wiki/Room_acoustics)
- [OSC Specification](http://opensoundcontrol.org/)

## [License](#license)  

This project is licensed under the **Creative Commons Attribution-NoDerivatives 4.0 International License** (CC BY-ND 4.0).

### [3D Model Attributions](#3d-model-attributions)  

- **"Male Head"** by Alexander Antipov ([Sketchfab](https://skfb.ly/6uKGM)) - CC BY 4.0
- **"Yamaha HS5 Studio Monitor"** by Ivan_WSK ([Sketchfab](https://skfb.ly/osqu7)) - CC BY 4.0

## [Author](#author)  

© 2025-2026 **Louis Goldford. All rights reserved.** 

For questions, issues, or contributions, please contact the author and refer to the project repository.

---

