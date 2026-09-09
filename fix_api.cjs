const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf-8');

// Replace async function startServer() { with just app declaration
content = content.replace(/async function startServer\(\) \{\n\s*const app = express\(\);\n\s*const PORT = 3000;/g, 'const app = express();');

// Find the vite middleware comment and replace everything from there to the end
const viteIndex = content.indexOf('// Vite middleware for development');
if (viteIndex !== -1) {
  content = content.substring(0, viteIndex) + 'export default app;\n';
}

fs.writeFileSync('api/index.ts', content);
