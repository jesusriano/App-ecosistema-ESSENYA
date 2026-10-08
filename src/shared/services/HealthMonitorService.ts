import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, limit, query, orderBy } from 'firebase/firestore';

export interface HealthPingResult {
  timestamp: any;
  overallStatus: 'ok' | 'warning' | 'error';
  checks: {
    firestore: { status: 'ok' | 'error'; latencyMs: number; message: string };
    auth: { status: 'ok' | 'error'; message: string };
    stripe: { status: 'ok' | 'error'; latencyMs: number; message: string };
  };
}

export const HealthMonitorService = {
  /**
   * Performs controlled pings to critical endpoints (Firestore, Auth, Stripe)
   * and logs the health report into the 'system_health' Firestore collection.
   */
  async runHealthPing(): Promise<HealthPingResult> {
    const results: HealthPingResult = {
      timestamp: serverTimestamp(),
      overallStatus: 'ok',
      checks: {
        firestore: { status: 'ok', latencyMs: 0, message: 'Firestore respondió correctamente' },
        auth: { status: 'ok', message: 'Servicio de Autenticación activo' },
        stripe: { status: 'ok', latencyMs: 0, message: 'Pasarela Stripe operativa' }
      }
    };

    // 1. Ping Firestore
    const fsStart = performance.now();
    try {
      const q = query(collection(db, 'system_health'), orderBy('timestamp', 'desc'), limit(1));
      await getDocs(q);
      results.checks.firestore.latencyMs = Math.round(performance.now() - fsStart);
      results.checks.firestore.status = 'ok';
    } catch (err: any) {
      results.checks.firestore.latencyMs = Math.round(performance.now() - fsStart);
      results.checks.firestore.status = 'error';
      results.checks.firestore.message = err.message || 'Error de conexión con Firestore';
      results.overallStatus = 'error';
    }

    // 2. Check Auth
    try {
      const currentUser = auth.currentUser;
      if (auth.currentUser) {
        await currentUser.getIdToken(false);
        results.checks.auth.status = 'ok';
        results.checks.auth.message = `Usuario autenticado (${currentUser.email || currentUser.uid})`;
      } else {
        results.checks.auth.status = 'ok';
        results.checks.auth.message = 'Sesión de Auth lista (sin usuario activo)';
      }
    } catch (err: any) {
      results.checks.auth.status = 'error';
      results.checks.auth.message = err.message || 'Error en validación de Auth';
      results.overallStatus = results.overallStatus === 'error' ? 'error' : 'warning';
    }

    // 3. Ping Stripe / Backend Health API
    const stripeStart = performance.now();
    try {
      const res = await fetch('/api/admin/system/health-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      results.checks.stripe.latencyMs = Math.round(performance.now() - stripeStart);
      if (res.ok && data.success) {
        results.checks.stripe.status = 'ok';
        results.checks.stripe.message = data.message || 'Stripe y Backend operando con normalidad';
      } else {
        results.checks.stripe.status = 'error';
        results.checks.stripe.message = data.error || 'Respuesta no exitosa del servidor';
        results.overallStatus = 'error';
      }
    } catch (err: any) {
      results.checks.stripe.latencyMs = Math.round(performance.now() - stripeStart);
      results.checks.stripe.status = 'error';
      results.checks.stripe.message = err.message || 'Fallo de red al verificar endpoints';
      results.overallStatus = 'error';
    }

    // Save report in 'system_health' collection
    try {
      await addDoc(collection(db, 'system_health'), {
        ...results,
        timestamp: serverTimestamp(),
        createdAtISO: new Date().toISOString()
      });
    } catch (dbErr) {
      console.error('[HealthMonitorService] Error guardando reporte en system_health:', dbErr);
    }

    // Trigger UI notification / alert if error detected
    if (results.overallStatus === 'error') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('essenya-toast', {
          detail: {
            title: '⚠️ Alerta de Salud del Sistema',
            description: 'Se detectó una falla crítica en los servicios de ESSENYA (Pagos/Base de Datos).',
            type: 'error'
          }
        }));
      }
    }

    return results;
  },

  /**
   * Starts a background polling loop for system health checks.
   * Returns a cleanup function to stop the monitoring interval.
   */
  startMonitoring(intervalMs: number = 60000): () => void {
    const intervalId = setInterval(async () => {
      try {
        await this.runHealthPing();
      } catch (err) {
        console.error('[HealthMonitorService] Error en ciclo de monitoreo:', err);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }
};
