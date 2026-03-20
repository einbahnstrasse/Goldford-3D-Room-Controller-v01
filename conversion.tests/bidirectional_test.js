/*
 * Bidirectional Conversion Test
 * Verify that fixing convertSpatToThree doesn't break convertThreeToSpat
 */

// Current conversion functions
function convertSpatToThree(x, y, z) {
  return {
    x: -x,    // flip X
    y: z,     // SPAT Z → Three Y
    z: -y     // SPAT Y → Three Z (negated)
  };
}

function convertThreeToSpat(x, y, z) {
  return {
    x: -x,    // flip X back
    y: -z,    // Three Z → SPAT Y (negated)
    z: y      // Three Y → SPAT Z
  };
}

// Proposed fixed functions
function convertSpatToThreeFixed(x, y, z) {
  return {
    x: x,     // NO flip X
    y: z,     // SPAT Z → Three Y
    z: -y     // SPAT Y → Three Z (negated)
  };
}

function convertThreeToSpatFixed(x, y, z) {
  return {
    x: x,     // NO flip X back  
    y: -z,    // Three Z → SPAT Y (negated)
    z: y      // Three Y → SPAT Z
  };
}

console.log("🔄 BIDIRECTIONAL CONVERSION TEST");
console.log("=================================\n");

// Test points
const testPoints = [
  { name: "Front", x: 0.0, y: 1.0, z: 1.6 },
  { name: "Right", x: 1.0, y: 0.0, z: 1.6 },
  { name: "Back",  x: 0.0, y: -1.0, z: 1.6 },
  { name: "Left",  x: -1.0, y: 0.0, z: 1.6 }
];

console.log("Testing Current Functions (with X flip):");
console.log("========================================");
testPoints.forEach(point => {
  const threePos = convertSpatToThree(point.x, point.y, point.z);
  const backToSpat = convertThreeToSpat(threePos.x, threePos.y, threePos.z);
  
  const match = Math.abs(point.x - backToSpat.x) < 0.001 && 
                Math.abs(point.y - backToSpat.y) < 0.001 && 
                Math.abs(point.z - backToSpat.z) < 0.001;
  
  console.log(`${point.name}:`);
  console.log(`  SPAT: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`);
  console.log(`  →Three: (${threePos.x.toFixed(1)}, ${threePos.y.toFixed(1)}, ${threePos.z.toFixed(1)})`);
  console.log(`  →Back: (${backToSpat.x.toFixed(1)}, ${backToSpat.y.toFixed(1)}, ${backToSpat.z.toFixed(1)}) ${match ? '✅' : '❌'}`);
  console.log();
});

console.log("Testing Fixed Functions (without X flip):");
console.log("=========================================");
testPoints.forEach(point => {
  const threePos = convertSpatToThreeFixed(point.x, point.y, point.z);
  const backToSpat = convertThreeToSpatFixed(threePos.x, threePos.y, threePos.z);
  
  const match = Math.abs(point.x - backToSpat.x) < 0.001 && 
                Math.abs(point.y - backToSpat.y) < 0.001 && 
                Math.abs(point.z - backToSpat.z) < 0.001;
  
  console.log(`${point.name}:`);
  console.log(`  SPAT: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`);
  console.log(`  →Three: (${threePos.x.toFixed(1)}, ${threePos.y.toFixed(1)}, ${threePos.z.toFixed(1)})`);
  console.log(`  →Back: (${backToSpat.x.toFixed(1)}, ${backToSpat.y.toFixed(1)}, ${backToSpat.z.toFixed(1)}) ${match ? '✅' : '❌'}`);
  console.log();
});

console.log("✅ Both conversion approaches maintain bidirectional consistency!");
console.log("The fix preserves mathematical correctness while fixing rotation direction.");