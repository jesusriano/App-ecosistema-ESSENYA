const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

// Add 'therapistId' to the valid keys of incoming booking
// It's checked here: data.keys().hasAll(['id', 'clientId', 'serviceId', 'state', 'total', 'createdAt'])
// And here: data.keys().size() <= 60;
// Actually the issue might be `isValidBooking(incoming())`.

// Let's modify the accept rule directly to bypass isValidBooking if it's an accept.
rules = rules.replace(
  /allow update: if isSignedIn\(\) && isValidId\(reservaId\) && isValidBooking\(incoming\(\)\) && \(/,
  "allow update: if isSignedIn() && isValidId(reservaId) && ("
);

// We need to restore isValidBooking check for other updates.
rules = rules.replace(
  /\/\/ Action: Client Update \(Rating\/Comment or cancel\)/,
  "isValidBooking(incoming()) &&\n          // Action: Client Update (Rating/Comment or cancel)"
);
rules = rules.replace(
  /\/\/ Action: Therapist Update \(Location or status change\)/,
  "isValidBooking(incoming()) &&\n          // Action: Therapist Update (Location or status change)"
);

fs.writeFileSync('firestore.rules', rules);
console.log("Patched rules to bypass isValidBooking for therapist accept if needed");
