import fs from 'fs';
import path from 'path';

console.log('Building static assets...');

// Create dist directory if it doesn't exist
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist');
}

// Copy public directory to dist
if (fs.existsSync('./public')) {
  const copyRecursiveSync = (src: string, dest: string) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats && stats.isDirectory();
    
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  copyRecursiveSync('./public', './dist/public');
  console.log('✅ Static assets copied to dist/public');
}

console.log('✅ Build completed');