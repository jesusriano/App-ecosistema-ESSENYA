const fs = require('fs');
let code = fs.readFileSync('run-phase-2-5.ts', 'utf8');
code = code.replace("const report: any = {};", "Object.keys(report).forEach(key => delete report[key]);");
fs.writeFileSync('run-phase-2-5.ts', code);
