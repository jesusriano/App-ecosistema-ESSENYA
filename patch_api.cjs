const fs = require('fs');
const content = fs.readFileSync('api/index.ts', 'utf8');

// Insert new routes before `export default app;`
const newRoutes = `

// ==========================================
// NEW WALLET & BOOKING TRANSACTION LOGIC
// ==========================================

// Centralized Gift Card issuance
app.post("/api/wallet/purchase", requireAuth, async (req, res) => {
  try {
    const { recipientName, senderName, customMessage, paymentMethod } = req.body;
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = \`REGALO-ESS-\${randomSuffix}\`;

    const newGiftCard = {
      code,
      title: \`Tarjeta de Regalo ESSENYA $1,400 MXN para \${recipientName || 'alguien especial'}\`,
      initialAmount: 1400,
      purchasePrice: 1400,
      currentBalance: 1400,
      status: 'activa',
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      recipientName: (recipientName || '').trim(),
      senderName: (senderName || '').trim() || 'Un cliente distinguido',
      customMessage: (customMessage || '').trim(),
      paymentMethod,
      purchaserId: uid,
      isGiftForSomeoneElse: true,
      redeemed: false,
      history: []
    };

    // Store in centralized gift_cards collection
    const docRef = db.collection('gift_cards').doc();
    await docRef.set(newGiftCard);

    res.json({ success: true, card: { id: docRef.id, ...newGiftCard } });
  } catch (err) {
    console.error("Error en purchase gift card:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

app.post("/api/wallet/redeem", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return res.status(400).json({ error: "Código vacío" });

    // Transactional redeem
    const result = await db.runTransaction(async (t) => {
      const cardsQuery = await t.get(db.collection('gift_cards').where('code', '==', cleanCode).limit(1));
      if (cardsQuery.empty) {
        throw new Error("El código ingresado no existe o no es válido.");
      }
      
      const cardDoc = cardsQuery.docs[0];
      const cardData = cardDoc.data();

      if (cardData.redeemed || cardData.status !== 'activa') {
        throw new Error("Esta tarjeta de regalo ya ha sido canjeada o no está activa.");
      }

      if (cardData.expirationDate && cardData.expirationDate < new Date().toISOString().split('T')[0]) {
        throw new Error("Esta tarjeta de regalo ha vencido.");
      }

      // Mark as redeemed centrally
      t.update(cardDoc.ref, { 
        redeemed: true, 
        status: 'canjeada', 
        redeemedBy: uid, 
        redeemedAt: new Date().toISOString() 
      });

      // Add to user's personal wallet
      const newBilleteraCard = {
        code: cleanCode,
        title: cardData.title + ' (Canjeada)',
        initialAmount: cardData.initialAmount,
        currentBalance: cardData.currentBalance,
        status: 'activa',
        expirationDate: cardData.expirationDate,
        createdAt: new Date().toISOString(),
        isGiftForSomeoneElse: false,
        history: []
      };

      const userWalletRef = db.collection('clientes').doc(uid).collection('billetera').doc();
      t.set(userWalletRef, newBilleteraCard);
      
      // Add ledger entry
      const ledgerRef = db.collection('clientes').doc(uid).collection('wallet_ledger').doc();
      t.set(ledgerRef, {
        type: 'CREDIT',
        amount: cardData.currentBalance,
        source: 'REDEEM_GIFT_CARD',
        referenceId: cleanCode,
        timestamp: new Date().toISOString(),
        description: \`Canje de tarjeta de regalo \${cleanCode}\`
      });

      return { id: userWalletRef.id, ...newBilleteraCard };
    });

    res.json({ success: true, message: "Tarjeta canjeada exitosamente.", card: result });
  } catch (err: any) {
    console.error("Error en redeem gift card:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al canjear." });
  }
});

// We need to override the /api/bookings to use transactions.
// But instead of rewriting all 200 lines of it, we will add a new endpoint /api/bookings/atomic
// and let the client call that one.
`;

const modified = content.replace('export default app;', newRoutes + '\nexport default app;');
fs.writeFileSync('api/index.ts', modified);
console.log("Patched api/index.ts");
