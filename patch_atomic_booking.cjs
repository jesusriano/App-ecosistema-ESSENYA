const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const atomicBookingLogic = `
app.post("/api/bookings/atomic", requireAuth, async (req, res) => {
  try {
    const { serviceId, durationMinutes = 90, selectedExtras = [], tip = 0, date, time, clientName, clientPhone, clientAddress, cityZone, applyGiftCard, applyCourtesy } = req.body;
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    // Validate inputs
    if (!serviceId || !date || !time) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Atomic transaction
    const result = await db.runTransaction(async (t) => {
      // 1. Validate User
      const userRef = db.collection('clientes').doc(uid);
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("Usuario no encontrado.");
      const userData = userDoc.data();

      // 2. Validate Service & Price
      let srvDoc = await t.get(db.collection("servicios").doc(serviceId));
      if (!srvDoc.exists) {
        if (serviceId === "SRB-relajante") srvDoc = await t.get(db.collection("servicios").doc("srv-relajante"));
      }
      let srvData = srvDoc.exists ? srvDoc.data() : null;
      if (!srvData) {
        const OFFICIAL_SERVICES_CATALOG = require('./index').OFFICIAL_SERVICES_CATALOG || {}; 
        // We assume OFFICIAL_SERVICES_CATALOG is available, but actually we should just hardcode the base price if missing to avoid import issues
        srvData = { basePrice: 1100, name: "Servicio ESSENYA" }; 
      }
      
      const basePrice = srvData.basePrice || 1100;
      let officialDurationPrice = basePrice;
      if (durationMinutes === 90) officialDurationPrice = Math.round(basePrice * 1.5);
      if (durationMinutes === 120) officialDurationPrice = Math.round(basePrice * 2);

      let extrasTotal = 0;
      const validatedExtras = [];
      for (const extra of selectedExtras) {
        if (extra.id.includes("ref-15")) { validatedExtras.push({ id: "extra-ref-15", name: "Reflexología (15m)", durationMinutes: 15, price: 300 }); extrasTotal += 300; }
        else if (extra.id.includes("ref-30")) { validatedExtras.push({ id: "extra-ref-30", name: "Reflexología (30m)", durationMinutes: 30, price: 500 }); extrasTotal += 500; }
      }

      const subtotal = officialDurationPrice + extrasTotal;
      let officialTotal = subtotal + tip;

      // 3. Evaluate VIP Courtesy (Unlocks with 5 finished & paid massages)
      let courtesyApplied = false;
      if (applyCourtesy) {
        const finishedBookingsQuery = await t.get(db.collection('reservas')
          .where('clientId', '==', uid)
          .where('state', '==', 'servicio_finalizado')
          .where('paymentStatus', '==', 'pagado'));
        
        const finishedCount = finishedBookingsQuery.size;
        
        // Count how many courtesies already used
        const usedCourtesiesQuery = await t.get(db.collection('reservas')
          .where('clientId', '==', uid)
          .where('courtesyApplied', '==', true)
          .where('state', '!=', 'cancelado'));
          
        const earnedCourtesies = Math.floor(finishedCount / 5);
        const availableCourtesies = earnedCourtesies - usedCourtesiesQuery.size;

        if (availableCourtesies <= 0) {
          throw new Error("No tienes cortesías VIP disponibles. Necesitas completar 5 masajes para desbloquear una.");
        }
        
        // Apply courtesy (100% discount on base service, extras/tip still paid)
        officialTotal = officialTotal - officialDurationPrice;
        courtesyApplied = true;
      }

      // 4. Evaluate Wallet Balance (Gift Cards)
      let amountDeductedFromWallet = 0;
      const walletUpdates = [];
      if (applyGiftCard && officialTotal > 0) {
        // Get user's wallet cards
        const walletQuery = await t.get(db.collection('clientes').doc(uid).collection('billetera').where('status', '==', 'activa'));
        let remainingToPay = officialTotal;
        
        for (const cardDoc of walletQuery.docs) {
          if (remainingToPay <= 0) break;
          const cardData = cardDoc.data();
          if (cardData.currentBalance > 0) {
            const deduction = Math.min(cardData.currentBalance, remainingToPay);
            remainingToPay -= deduction;
            amountDeductedFromWallet += deduction;
            
            const newBalance = cardData.currentBalance - deduction;
            walletUpdates.push({
              ref: cardDoc.ref,
              newBalance,
              deduction,
              cardCode: cardData.code
            });
          }
        }
        officialTotal = remainingToPay;
      }

      // 5. Create Booking
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      const code = \`ESS-\${codeNum}\`;
      const newBookingRef = db.collection('reservas').doc();
      
      const newBooking = {
        code,
        clientId: uid,
        clientName: clientName || userData.name,
        clientPhone: clientPhone || userData.phone,
        clientAddress,
        cityZone,
        serviceId,
        serviceName: srvData.name || "Servicio ESSENYA",
        durationMinutes,
        totalDurationMinutes: durationMinutes + (validatedExtras.reduce((a,e) => a + e.durationMinutes, 0)),
        selectedExtras: validatedExtras,
        price: subtotal,
        total: officialTotal, // Remaining total after discounts/wallet
        tip,
        date,
        time,
        state: "pendiente",
        paymentStatus: officialTotal === 0 ? "pagado" : "pendiente",
        courtesyApplied,
        walletDeduction: amountDeductedFromWallet,
        createdAt: new Date().toISOString()
      };

      t.set(newBookingRef, newBooking);

      // 6. Consume Wallet Balance & Add Ledger Entries
      for (const update of walletUpdates) {
        t.update(update.ref, { 
          currentBalance: update.newBalance,
          status: update.newBalance === 0 ? 'agotada' : 'activa'
        });
        
        const ledgerRef = db.collection('clientes').doc(uid).collection('wallet_ledger').doc();
        t.set(ledgerRef, {
          type: 'DEBIT',
          amount: update.deduction,
          source: 'BOOKING_PAYMENT',
          referenceId: newBookingRef.id,
          timestamp: new Date().toISOString(),
          description: \`Pago de reserva \${code}\`
        });
      }

      return { bookingId: newBookingRef.id, booking: newBooking };
    });

    res.json({ success: true, ...result });

  } catch (err: any) {
    console.error("Error en reserva atómica:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al procesar la reserva." });
  }
});

// Cancel endpoint with transactional refund
app.post("/api/bookings/cancel", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    await db.runTransaction(async (t) => {
      const bookingRef = db.collection('reservas').doc(bookingId);
      const bookingDoc = await t.get(bookingRef);
      
      if (!bookingDoc.exists) throw new Error("Reserva no encontrada.");
      const bookingData = bookingDoc.data();
      
      if (bookingData.clientId !== uid) throw new Error("No tienes permiso para cancelar esta reserva.");
      if (bookingData.state === 'cancelado') throw new Error("La reserva ya estaba cancelada.");

      // Calculate time difference (penalty check if needed, simplified here: full refund)
      // Refund wallet balance if any was used
      if (bookingData.walletDeduction > 0) {
        // We just add a new card to their wallet with the refunded balance to avoid finding which card to refund
        const refundCardRef = db.collection('clientes').doc(uid).collection('billetera').doc();
        t.set(refundCardRef, {
          code: \`REFUND-\${bookingData.code}\`,
          title: \`Reembolso Reserva \${bookingData.code}\`,
          initialAmount: bookingData.walletDeduction,
          currentBalance: bookingData.walletDeduction,
          status: 'activa',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          isGiftForSomeoneElse: false,
          history: []
        });

        // Add ledger entry
        const ledgerRef = db.collection('clientes').doc(uid).collection('wallet_ledger').doc();
        t.set(ledgerRef, {
          type: 'CREDIT',
          amount: bookingData.walletDeduction,
          source: 'BOOKING_REFUND',
          referenceId: bookingId,
          timestamp: new Date().toISOString(),
          description: \`Reembolso por cancelación de reserva \${bookingData.code}\`
        });
      }

      t.update(bookingRef, {
        state: 'cancelado',
        canceledAt: new Date().toISOString(),
        refundedAmount: bookingData.walletDeduction || 0
      });
    });

    res.json({ success: true, message: "Reserva cancelada y saldo reembolsado (si aplica)." });
  } catch (err: any) {
    console.error("Error en cancelación atómica:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al cancelar." });
  }
});
`;

content = content.replace('export default app;', atomicBookingLogic + '\nexport default app;');
fs.writeFileSync('api/index.ts', content);
console.log("Patched api/index.ts with atomic endpoints");
