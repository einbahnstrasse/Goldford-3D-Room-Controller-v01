/*
 * Simple coordinate conversion test
 * Test SPAT vs Three.js coordinate mappings
 */

// Copy the conversion function from lg.spat.io.v01.js
function convertSpatToThree(x, y, z) {
  return {
    x: -x,    // flip X (left becomes right)
    y: z,     // SPAT Z (height) → Three Y (height)
    z: -y     // SPAT Y (front) → Three Z (negative is forward)
  };
}

console.log("=== COORDINATE CONVERSION TEST ===");
console.log("Testing convertSpatToThree() function\n");

// Test cases representing a clockwise movement in SPAT
const spatTestPoints = [
  { name: "Front", x: 0.0, y: 1.0, z: 1.6 },     // Front of listener
  { name: "Right", x: 1.0, y: 0.0, z: 1.6 },     // Right side
  { name: "Back",  x: 0.0, y: -1.0, z: 1.6 },    // Back of listener
  { name: "Left",  x: -1.0, y: 0.0, z: 1.6 }     // Left side
];

console.log("SPAT Coordinate System (assumed):");
console.log("  X: Left(-) ↔ Right(+)");
console.log("  Y: Back(-) ↔ Front(+)");  
console.log("  Z: Down(-) ↔ Up(+)");
console.log("");

console.log("Three.js Coordinate System:");
console.log("  X: Left(-) ↔ Right(+)");
console.log("  Y: Down(-) ↔ Up(+)");
console.log("  Z: Forward(-) ↔ Back(+)");
console.log("");

console.log("Conversion Results:");
console.log("SPAT Position → Three.js Position");
console.log("================================");

spatTestPoints.forEach(point => {
  const threePos = convertSpatToThree(point.x, point.y, point.z);
  console.log(`${point.name.padEnd(6)}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)}) → (${threePos.x.toFixed(1)}, ${threePos.y.toFixed(1)}, ${threePos.z.toFixed(1)})`);
});

console.log("");
console.log("Expected clockwise rotation in Three.js (looking down from above):");
console.log("Front → Right → Back → Left → Front");
console.log("");

// Check if the conversion produces clockwise motion
console.log("Analysis of rotation direction:");
const threePositions = spatTestPoints.map(p => convertSpatToThree(p.x, p.y, p.z));

console.log("Three.js positions (X, Z plane - ignoring Y for rotation analysis):");
threePositions.forEach((pos, i) => {
  console.log(`${spatTestPoints[i].name}: X=${pos.x.toFixed(1)}, Z=${pos.z.toFixed(1)}`);
});

console.log("\nIf this represents clockwise motion when viewed from above:");
console.log("Front (0, -1) → Right (-1, 0) → Back (0, 1) → Left (1, 0)");
console.log("This would be COUNTERCLOCKWISE in standard math coordinates!");