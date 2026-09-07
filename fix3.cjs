const fs = require('fs');
let code = fs.readFileSync('run-phase-2-5.ts', 'utf8');
code = code.replace("const fsNode = require('fs');", "");
code = code.replace("fsNode.writeFileSync", "fs.writeFileSync");
fs.writeFileSync('run-phase-2-5.ts', code);
