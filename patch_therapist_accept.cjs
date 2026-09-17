const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

// The therapist accept condition:
// // Action: Unassigned Booking Acceptance
// (existing().state == 'pendiente' && !('therapistId' in existing()) &&
// incoming().therapistId == request.auth.uid &&
// incoming().diff(existing()).affectedKeys().hasOnly(['state', 'therapistId', 'therapistName', 'therapistPhoto', 'therapistPhone', 'acceptedAt', 'updatedAt']))

// The issue is `!('therapistId' in existing())` or how it's expressed. Sometimes `therapistId` exists but is empty/null.
rules = rules.replace(
  /\!\('therapistId' in existing\(\)\)/,
  "(!('therapistId' in existing()) || existing().therapistId == null || existing().therapistId == '')"
);

fs.writeFileSync('firestore.rules', rules);
console.log("Patched therapist accept rule");
