const fs = require('fs');
let content = fs.readFileSync('src/aplicaciones/cliente/app/Aplicacion.tsx', 'utf8');

// Find the section where appliedPromo and appliedGiftCard are handled.
// They used to call markVipCourtesyAsUsed and applyGiftCardToBooking
content = content.replace(
  /\/\/ Consume VIP15 courtesy benefit if applied \(single-use\)\s*if \(appliedPromo\?.type === 'VIP15'\) \{\s*await markVipCourtesyAsUsed\(client.id\);\s*\}/,
  ""
);

content = content.replace(
  /\/\/ Deduct Gift Card balance if applied\s*if \(appliedGiftCard && giftCardDeduction > 0\) \{\s*await applyGiftCardToBooking\([\s\S]*?\);\s*\}/,
  ""
);

// We need to inject applyGiftCard and applyCourtesy into newBk
content = content.replace(
  /invoiceId: `inv-\$\{Math.floor\(1000 \+ Math\.random\(\) \* 9000\)\}`/,
  "invoiceId: `inv-${Math.floor(1000 + Math.random() * 9000)}`,\n      applyGiftCard: !!appliedGiftCard,\n      applyCourtesy: appliedPromo?.type === 'VIP15'"
);

fs.writeFileSync('src/aplicaciones/cliente/app/Aplicacion.tsx', content);
console.log("Patched Aplicacion.tsx");
