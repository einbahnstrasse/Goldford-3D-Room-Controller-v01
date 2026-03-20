/*
 * Rotation Direction Analysis
 * Testing why SPAT clockwise appears as Three.js counterclockwise
 */

// Current conversion function
function convertSpatToThree(x, y, z) {
  return {
    x: -x,    // flip X (left becomes right)
    y: z,     // SPAT Z (height) → Three Y (height)
    z: -y     // SPAT Y (front) → Three Z (negative is forward)
  };
}

// Proposed fixed conversion  
function convertSpatToThreeFixed(x, y, z) {
  return {
    x: x,     // keep X the same (no flip)
    y: z,     // SPAT Z (height) → Three Y (height)
    z: -y     // SPAT Y (front) → Three Z (negative is forward)
  };
}

console.log("🔍 ROTATION DIRECTION ANALYSIS");
console.log("==============================\n");

// Test sequence: clockwise motion in SPAT coordinate system
const spatClockwiseSequence = [
  { step: 1, name: "Front", x: 0.0, y: 1.0, z: 1.6 },
  { step: 2, name: "Right", x: 1.0, y: 0.0, z: 1.6 },
  { step: 3, name: "Back",  x: 0.0, y: -1.0, z: 1.6 },
  { step: 4, name: "Left",  x: -1.0, y: 0.0, z: 1.6 }
];

console.log("SPAT Clockwise Sequence (Y forward, X right):");
spatClockwiseSequence.forEach(point => {
  console.log(`  ${point.step}. ${point.name}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`);
});

console.log("\n--- CURRENT CONVERSION RESULTS ---");
console.log("convertSpatToThree() with X flip:");
spatClockwiseSequence.forEach(point => {
  const result = convertSpatToThree(point.x, point.y, point.z);
  console.log(`  ${point.name} → Three.js (${result.x.toFixed(1)}, ${result.y.toFixed(1)}, ${result.z.toFixed(1)})`);
});

// Analyze the XZ plane motion (top-down view)
console.log("\n📍 XZ Motion Analysis (top-down view, Y=height ignored):");
console.log("Current conversion creates this sequence:");
spatClockwiseSequence.forEach(point => {
  const result = convertSpatToThree(point.x, point.y, point.z);
  console.log(`  ${point.name}: X=${result.x.toFixed(1)}, Z=${result.z.toFixed(1)}`);
});

console.log("\nThis traces: (0,-1) → (-1,0) → (0,1) → (1,0) → (0,-1)");
console.log("❌ In Three.js coordinates, this is COUNTERCLOCKWISE motion!");

console.log("\n--- PROPOSED FIX ---");
console.log("convertSpatToThreeFixed() without X flip:");
spatClockwiseSequence.forEach(point => {
  const result = convertSpatToThreeFixed(point.x, point.y, point.z);
  console.log(`  ${point.name} → Three.js (${result.x.toFixed(1)}, ${result.y.toFixed(1)}, ${result.z.toFixed(1)})`);
});

console.log("\n📍 Fixed XZ Motion Analysis:");
spatClockwiseSequence.forEach(point => {
  const result = convertSpatToThreeFixed(point.x, point.y, point.z);
  console.log(`  ${point.name}: X=${result.x.toFixed(1)}, Z=${result.z.toFixed(1)}`);
});

console.log("\nThis traces: (0,-1) → (1,0) → (0,1) → (-1,0) → (0,-1)");
console.log("✅ In Three.js coordinates, this is CLOCKWISE motion!");

console.log("\n🎯 CONCLUSION:");
console.log("The X-axis flip in convertSpatToThree() is causing the rotation direction mismatch.");
console.log("Remove the X flip to preserve rotation direction between SPAT and Three.js.");