/*───────────────────────────────────────────────────────────────
 *  lg-spat-io.js  –  SPAT ↔ Three.js Messaging Utilities
 *  this version: sets up listener, sources, speakers + coordinate transforms
 *  © 2025 Louis Goldford — Licensed under the Creative Commons
 *  Attribution-NoDerivatives 4.0 International Licence (CC BY-ND 4.0)
 *  https://creativecommons.org/licenses/by-nd/4.0/
 *──────────────────────────────────────────────────────────────*/
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/*───────────────────────────────────────────────────────────────
 *  Coordinate Conversion Transforms + Utilities
 *  Conversion Between Three.js and SPAT
 *  These functions map positional data between SPAT (IRCAM) format
 *  and Three.js's world coordinate system for unified spatial scenes.
 *──────────────────────────────────────────────────────────────*/

/**
 * Converts a 3D position from Three.js world coordinates to SPAT format.
 * 
 * Coordinate mapping:
 *   - Three.js X (right) → SPAT X (left) — flipped via -x
 *   - Three.js Y (height) → SPAT Y (height) — unchanged
 *   - Three.js Z (forward) → SPAT Z (forward) — unchanged
 * 
 * @param {number} x - X position in Three.js (right/left)
 * @param {number} y - Y position in Three.js (vertical)
 * @param {number} z - Z position in Three.js (depth/forward)
 * @returns {{x: number, y: number, z: number}} - Position in SPAT coordinate space
 */
// export function convertThreeToSpat(x, y, z) {
//   return { x: -x, y: y, z: z };
// }
export function convertThreeToSpat(x, y, z) {
  return {
    x: -x,    // flip X
    // y: -z,    // Three Z (forward) → SPAT Y (front) ❌ PROBLEMATIC: Y-axis direction reversed
    y: z,     // Three Z (forward) → SPAT Y (front) ✅ FIX: Remove minus sign to correct Y-axis direction
    z: y      // Three Y (height) → SPAT Z (height)
  };
}


/**
 * Converts a 3D position from SPAT (IRCAM) coordinates to Three.js world coordinates.
 * 
 * Coordinate mapping:
 *   - SPAT X (left) → Three.js X (right) — flipped via -x
 *   - SPAT Y (height) → Three.js Y (height) — unchanged
 *   - SPAT Z (forward) → Three.js Z (forward) — unchanged
 * 
 * @param {number} x - X position in SPAT (left/right)
 * @param {number} y - Y position in SPAT (vertical)
 * @param {number} z - Z position in SPAT (depth/forward)
 * @returns {{x: number, y: number, z: number}} - Position in Three.js coordinate space
 */
// export function convertSpatToThree(x, y, z) {
//   return { x: -x, y: y, z: z };

// export function convertSpatToThree(x, y, z) {
//   return { x: -x, y: z, z: -y };

// // export function convertSpatToThree(x, y, z) {
// //   return { x: -x, y: y, z: -z };

// //  SPAT  X (L-R)  →  Three X           (negate so +right)
// //  SPAT  Y (height)  →  Three **Z**    (depth)       ← swap
// //  SPAT  Z (front)   →  Three **Y**    (height)      ← swap
// // export function convertSpatToThree(x, y, z) {
// //   return { x: -x, y: z, z: -y };
// }

// this one was sort-of working... 
// export function convertSpatToThree(x, y, z) {
//   return {
//     x: x,    // left-right
//     y: z,    // SPAT height becomes Three Y directly
//     z: -y    // back-front reversed to match camera
//   };
// }

export function convertSpatToThree(x, y, z) {
  return {
    x: -x,    // flip X (left becomes right)
    y: z,     // SPAT Z (height) → Three Y (height)
    // z: -y     // SPAT Y (front) → Three Z (negative is forward) ❌ PROBLEMATIC: Y-axis direction reversed
    z: y      // SPAT Y (front) → Three Z (positive is forward) ✅ FIX: Remove minus sign to correct Y-axis direction
  };
}


/**
 * Convert yaw, pitch, and roll angles (in degrees) into a quaternion.
 * Matches SPAT convention: yaw (Y axis), pitch (X axis), roll (Z axis).
 *
 * @param {number} yaw   - Yaw angle in degrees (pan left/right)
 * @param {number} pitch - Pitch angle in degrees (tilt up/down)
 * @param {number} roll  - Roll angle in degrees (tilt head sideways)
 * @returns {THREE.Quaternion}
 */
export function convertYawPitchRollToQuaternion(yaw, pitch, roll) {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(pitch),
    THREE.MathUtils.degToRad(yaw),
    THREE.MathUtils.degToRad(roll),
    'YXZ' // Intrinsic: yaw → pitch → roll
  );
  const quat = new THREE.Quaternion();
  quat.setFromEuler(euler);
  return quat;
}

/**
 * Converts AED (Azimuth, Elevation, Distance) to Cartesian XYZ
 * Note: Three.js relies exclusively on XYZ coords!
 * @param {number} azimuth - in degrees
 * @param {number} elevation - in degrees
 * @param {number} distance - in meters
 * @returns {{x: number, y: number, z: number}} Three.js-style XYZ
 */
export function convertAEDtoXYZ(azimuth, elevation, distance) {
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);

  const x = distance * Math.sin(az) * Math.cos(el);
  const y = distance * Math.sin(el);
  const z = distance * Math.cos(az) * Math.cos(el);

  return { x, y, z };
}

/**
 * Converts XYZ (Three.js-style) to AED (Azimuth, Elevation, Distance)
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{azimuth: number, elevation: number, distance: number}}
 */
export function convertXYZtoAED(x, y, z) {
  const distance = Math.sqrt(x * x + y * y + z * z);
  const azimuth = THREE.MathUtils.radToDeg(Math.atan2(x, z));
  const elevation = THREE.MathUtils.radToDeg(Math.asin(y / distance));
  return { azimuth, elevation, distance };
}

/**
 * Converts AED (Azimuth, Elevation, Distance) to Three.js XYZ coordinates.
 * This wraps `convertAEDtoXYZ` and `convertSpatToThree` to apply both
 * spherical → Cartesian and SPAT-to-Three.js remapping in one step.
 *
 * @param {number} azimuth - Azimuth in degrees (0° = front)
 * @param {number} elevation - Elevation in degrees (0° = horizontal)
 * @param {number} distance - Distance in meters
 * @returns {{x: number, y: number, z: number}} - Three.js-compatible XYZ coords
 */
export function convertAedToThree(azimuth, elevation, distance) {
  const { x, y, z } = convertAEDtoXYZ(-azimuth, elevation, distance);
  return convertSpatToThree(x, y, z);
}

/**
 * Computes a ring layout of speakers in SPAT coordinate space.
 * @param {number} count - Number of speakers to place
 * @param {number} radius - Radial distance from listener (in meters)
 * @param {number} earHeight - Z-coordinate for vertical height (usually listener's ear level)
 * @param {number} azimuthOffset - Degrees to rotate the ring (0 = front, positive = clockwise)
 * @returns {Array<{x:number, y:number, z:number}>}
 */
export function computeSpeakerRingLayout(count, radius = 1.0, earHeight = 1.3, azimuthOffset = 0) {
  const positions = [];
  const step = 360 / count;

  for (let i = 0; i < count; i++) {
    const az = (step * i + azimuthOffset) % 360;
    const azRad = THREE.MathUtils.degToRad(az);
    const x = Math.sin(azRad) * radius;
    const y = Math.cos(azRad) * radius;
    const z = earHeight;
    positions.push({ x, y, z });
  }

  return positions;
}

/**
 * Computes a ring layout of sources in SPAT coordinate space.
 * This reuses computeSpeakerRingLayout internally for consistency.
 * @param {number} count - Number of sources to place
 * @param {number} radius - Radial distance from listener
 * @param {number} earHeight - Z-coordinate for vertical height
 * @param {number} azimuthOffset - Degrees to rotate the ring
 * @returns {Array<{x:number, y:number, z:number}>}
 */
export function computeSourceRingLayout(count, radius = 1.0, earHeight = 1.3, azimuthOffset = 0) {
  return computeSpeakerRingLayout(count, radius, earHeight, azimuthOffset);
}

/*───────────────────────────────────────────────────────────────
 *  SPAT Classes (sources, speakers, audio, areas, etc.)
 *──────────────────────────────────────────────────────────────*/

// Base class for all scene entities
class SpatEntity {
  constructor(id, position = { x: 0, y: 0, z: 0 }, orientation = { x: 0, y: 0, z: 0, w: 1 }, options = {}) {
    this.id = id;
    this.position = position;
    this.orientation = orientation;
    this.visible = true;
    this.editable = true;
    this.yaw = options.yaw ?? 0.0;
    this.pitch = options.pitch ?? 0.0;
    this.roll = options.roll ?? 0.0;
    this.quaternion = new THREE.Quaternion();
    this.updateOrientationFromAngles();
  }

  setPosition(x, y, z) {
    this.position = { x, y, z };
  }

  setOrientation(x, y, z, w) {
    this.orientation = { x, y, z, w };
  }

  updateOrientationFromAngles() {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(-(this.pitch ?? 0)),
      THREE.MathUtils.degToRad(-(this.yaw ?? 0)), // flip yaw to make positive = turn right
      THREE.MathUtils.degToRad(this.roll ?? 0),
      'YXZ'
    );
    this.quaternion = new THREE.Quaternion().setFromEuler(euler); // assign as Quaternion
    this.orientation = {
      x: this.quaternion.x,
      y: this.quaternion.y,
      z: this.quaternion.z,
      w: this.quaternion.w
    };
  }
}

// Head/Listener class
export class Listener extends SpatEntity {
  constructor(
    position = { x: 0, y: 0, z: 0 },
    orientation = { x: 0, y: 0, z: 0, w: 1 },
    options = {}
  ) {
    super('listener', position, orientation, options); // options now defined and passed
    this.headphonesVisible = false;
    this.lookAt = options.lookAt ?? { x: 0, y: 1, z: 0 };
    this.proportion = options.proportion ?? 1.0;
  }
}

// Audio sources
export class Source extends SpatEntity {
  constructor(id, position = { x: 0, y: 0, z: 1 }, orientation = { x: 0, y: 0, z: 1 }, options = {}) {
    super(id, position, orientation, options);
    this.label = options.label ?? `${id}`;
    // this.color = options.color ?? { r: 0.49, g: 1.0, b: 0.0, a: 1.0 };
    this.color = { r: 0.490196, g: 1.0, b: 0.0, a: 1.0 };
    this.labelColor = options.labelColor ?? { ...this.color };
    this.vumeterLevel = options.vumeterLevel ?? -60.0;
    this.aperture = options.aperture ?? 80.0;
    this.radius = options.radius ?? 1.0;
    this.lookAt = options.lookAt ?? { x: 0, y: 0, z: 0 };
    this.proportion = options.proportion ?? 1.0;
  }

  setLabel(label) {
    this.label = label;
    console.log(`[Source] Set label for source ${this.id}: "${label}"`);
  }

  setLabelColor(r, g, b, a) {
    this.labelColor = { r, g, b, a };
    console.log(`[Source] Set label color for source ${this.id}: (${r}, ${g}, ${b}, ${a})`);
  }

  setProportion(proportion) {
    this.proportion = proportion;
    console.log(`[Source] Set proportion for source ${this.id}: ${proportion}`);
  }

  setColor(r, g, b, a) {
    this.color = { r, g, b, a };
    console.log(`[Source] Set color for source ${this.id}: (${r}, ${g}, ${b}, ${a})`);
  }
}

// Speakers
export class Speaker extends SpatEntity {
  constructor(id, position = { x: 0, y: 0, z: 1 }, orientation = { x: 0, y: 0, z: 1 }, options = {}) {
    super(id, position, orientation, options);
    this.label = options.label ?? `${id}`;
    this.color = options.color ?? { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
    this.labelColor = options.labelColor ?? { r: 1.0, g: 0.0, b: 0.0, a: 1.0 }; // default red labels
    this.lookAt = options.lookAt ?? { x: 0, y: 0, z: 0 };
    this.proportion = options.proportion ?? 1.0;

    // Default dimensions of Genelec 8010A in meters (W, H, D)
    this.size = options.size ?? {
      x: 0.121, // width
      y: 0.195, // height
      z: 0.115  // depth
    };
  }
}

// Area (bounding box or user-defined zone)
export class Area {
  constructor(id = 1, vertices = [], options = {}) {
    this.id = id;
    this.vertices = vertices; // array of {x,y,z} vertices
    this.visible = options.visible ?? true;
    this.fill = options.fill ?? true;
    this.fillColor = options.fillColor ?? { r: 0.16, g: 0.62, b: 0.65, a: 0.4 };
    this.borderColor = options.borderColor ?? { r: 0.16, g: 0.62, b: 0.65, a: 0.62 };
    this.borderThickness = options.borderThickness ?? 2.0;
    this.label = options.label ?? `area ${id}`;
    this.labelVisible = options.labelVisible ?? true;
    this.labelColor = options.labelColor ?? { r: 0, g: 0, b: 0, a: 1.0 };
  }

  setVertices(vertexArray) {
    this.vertices = vertexArray;
  }

  addVertex(x, y, z) {
    this.vertices.push({ x, y, z });
  }
}

/*───────────────────────────────────────────────────────────────
 *  Initial default scene setup
 *──────────────────────────────────────────────────────────────*/

export function createDefaultScene() {
  const listener = new Listener(
    convertSpatToThree(0, 0, 0),
    { x: 0, y: 0, z: 0, w: 1 }
  );

  const source = new Source(
    1,
    convertSpatToThree(0.0, 0.0, 1.0), // SPAT: (x=0, y=0, z=1)
    { x: 0, y: 0, z: 0, w: 1 }
  );

  const speaker1 = new Speaker(
    1,
    convertSpatToThree(-1.5, 0.0, 2.0), // SPAT: (x=-1.5, y=0, z=2)
    { x: 0, y: 0, z: 0, w: 1 }
  );

  const speaker2 = new Speaker(
    2,
    convertSpatToThree(1.5, 0.0, 2.0), // SPAT: (x=1.5, y=0, z=2)
    { x: 0, y: 0, z: 0, w: 1 }
  );

  const area = new Area(1, [], {}); // Empty vertices by default; can be populated later

  return {
    listener,
    sources: [source],
    speakers: [speaker1, speaker2],
    areas: [area],
  };
}
