import fs from 'fs';
import path from 'path';

const searchDir = './src';

const replacements = [
  { regex: /--amber-/g, replacement: '--lime-' },
  { regex: /--navy-/g, replacement: '--black-' },
  { regex: /rgba\(251,\s*191,\s*36/g, replacement: 'rgba(163, 230, 53' },
  { regex: /#fbbf24/ig, replacement: '#a3e635' },
  { regex: /#f59e0b/ig, replacement: '#84cc16' },
  { regex: /#d97706/ig, replacement: '#65a30d' },
  { regex: /#fcd34d/ig, replacement: '#bef264' },
  { regex: /#fde68a/ig, replacement: '#d9f99d' },
  { regex: /\.amber/g, replacement: '.lime' },
  { regex: /pill-amber/g, replacement: 'pill-lime' },
  { regex: /glow-amber/g, replacement: 'glow-lime' }
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let modified = false;
      
      for (const r of replacements) {
        if (r.regex.test(content)) {
          content = content.replace(r.regex, r.replacement);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(searchDir);
console.log('Theme update complete!');
