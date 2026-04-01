const fs = require('fs');
const path = require('path');

const dirs = [
  'public',
  'src',
  'src/types',
  'src/storage',
  'src/components',
  'src/pages',
  'src/routes',
  'src/test',
  '.github',
  '.github/workflows'
];

dirs.forEach(dir => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } catch (e) {
    if (e.code === 'EEXIST') {
      console.log(`✓ ${dir} (already exists)`);
    } else {
      console.log(`✗ Failed to create ${dir}: ${e.message}`);
    }
  }
});

console.log('\nAll directories processed.');
