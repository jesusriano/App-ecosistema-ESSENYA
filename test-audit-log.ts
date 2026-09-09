  app.post("/api/admin/audit-log", requireAuthOrUserContext, async (req, res) => {
    try {
      const verifiedUser = (req as any).user;
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: "No autorizado." });
      }

      const { userRole, userName, action, details } = req.body;
      const adminApp = await import("firebase-admin/app");
      const adminFirestore = await import("firebase-admin/firestore");
      const db = adminFirestore.getFirestore();

      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userRole,
        userName,
        action,
        details,
        actorId: verifiedUser.uid, // Strictly enforced from token
      };

      await db.collection("audit_logs").doc(newLog.id).set(newLog);

      res.json({ success: true, log: newLog });
    } catch (error) {
      console.error("Audit log error:", error);
      res.status(500).json({ success: false, error: "Error interno al guardar log." });
    }
  });
