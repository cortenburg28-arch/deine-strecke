import re

# Read backup file
with open('src/main.js.backup', 'r') as f:
    backup_content = f.read()

# Find createStation in backup
station_match = re.search(r'function createStation\(\)', backup_content)
if station_match:
    create_station_code = backup_content[station_match.start():]

# Read corrupted main.js
with open('src/main.js', 'r') as f:
    lines = f.readlines()

# Keep only first 798 lines
new_content = ''.join(lines[:798])

# Add complete createLuminescentTrees
new_content += '''function createLuminescentTrees(group) {
  const treeMat = new THREE.MeshStandardMaterial({ 
    color: 0x3d2850, 
    roughness: 0.9,
    metalness: 0.4
  });
  
  const leafMat = new THREE.MeshStandardMaterial({ 
    color: 0x7a5c9e,
    emissive: 0x4a326e,
    emissiveIntensity: 0.4,
    roughness: 0.7
  });
  
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 300;
    const z = (Math.random() - 0.5) * 300 + 30;
    
    if (Math.abs(x - 10) < 50 && Math.abs(z - 3) < 30) continue;
    
    const tree = new THREE.Group();
    
    // Stamm mit leuchtender Rinde
    const trunkHeight = 3 + Math.random() * 4;
    const trunkMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a1a35,
      roughness: 0.95,
      metalness: 0.6
    });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, trunkHeight, 6), trunkMat);
    tree.add(trunk);
    
    // Leuchtende Rinde-Accents
    for (let j = 0; j < 4 + Math.floor(Math.random() * 3); j++) {
      const barkLineMat = new THREE.MeshStandardMaterial({ 
        color: 0x6a3c87,
        emissive: 0x4a2e6e,
        emissiveIntensity: 0.3 + Math.random() * 0.2,
        metalness: 0.8
      });
      const barkLine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, trunkHeight * 0.6, 5),
        barkLineMat
      );
      const angle = (j / 6) * Math.PI * 2;
      barkLine.position.set(
        Math.cos(angle) * 0.3,
        (Math.random() - 0.5) * trunkHeight * 0.8,
        Math.sin(angle) * 0.3
      );
      barkLine.rotation.z = angle + Math.PI / 2;
      tree.add(barkLine);
    }
    
    // Krone mit leuchtenden Blättern
    const canopySize = 2.5 + Math.random() * 1.5;
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(canopySize, 1), leafMat);
    leaves.position.y = trunkHeight + canopySize * 0.7;
    leaves.castShadow = true;
    tree.add(leaves);
    
    // Kleine leuchtende Punkte in der Krone
    for (let j = 0; j < 6 + Math.floor(Math.random() * 4); j++) {
      const glowMat = new THREE.MeshStandardMaterial({ 
        color: 0x9b7fbf,
        emissive: 0x6a4c8e,
        emissiveIntensity: 0.5 + Math.random() * 0.4
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), glowMat);
      const angle = Math.random() * Math.PI * 2;
      const radius = canopySize * (0.5 + Math.random() * 0.4);
      glow.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * canopySize * 0.8,
        Math.sin(angle) * radius
      );
      glow.position.y += trunkHeight + canopySize * 0.3;
      tree.add(glow);
    }
    
    // Positionieren
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * 0.4;
    
    group.add(tree);
  }
}

'''

# Find createFascinatingRocks in backup
with open('src/main.js.backup', 'r') as f:
    backup_lines = f.readlines()

first_rock_idx = None
for i, line in enumerate(backup_lines):
    if 'function createFascinatingRocks(group)' in line:
        first_rock_idx = i
        break

if first_rock_idx is not None:
    brace_count = 0
    end_idx = first_rock_idx
    for i in range(first_rock_idx, len(backup_lines)):
        line = backup_lines[i]
        for char in line:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
        if brace_count == 0 and '{' in backup_lines[i]:
            end_idx = i
            break
    
    new_content += ''.join(backup_lines[first_rock_idx:end_idx + 1])
    new_content += '\n'

# Add createStation
new_content += create_station_code

# Write the fixed file
with open('src/main.js', 'w') as f:
    f.write(new_content)

print("File fixed successfully!")
