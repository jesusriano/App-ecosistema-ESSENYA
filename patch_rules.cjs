const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

// The pending therapist test succeeds because they can update the booking since `true` allows anyone.
// Wait, we need to ensure ONLY ACTIVE therapists can accept it!
// Oh! Active therapist check: `get(/databases/$(database)/documents/terapeutas/$(request.auth.uid)).data.estado == 'activo'`

rules = rules.replace(
  /\/\/ Action: Unassigned Booking Acceptance\n\s*\(existing\(\)\.state == 'pendiente' && true &&/,
  "// Action: Unassigned Booking Acceptance\n          (existing().state == 'pendiente' && get(/databases/$(database)/documents/terapeutas/$(request.auth.uid)).data.estado == 'activo' &&"
);

fs.writeFileSync('firestore.rules', rules);
console.log("Patched therapist accept rule for active therapists");
