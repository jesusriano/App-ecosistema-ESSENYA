const fs = require('fs');
let content = fs.readFileSync('test-rules.js', 'utf8');

// The active therapist failed! Why? 
// Because I added get(/databases/...) and wait, maybe terapeuta isn't correctly set up in test?
// "Terapeuta activo acepta reserva pendiente"
