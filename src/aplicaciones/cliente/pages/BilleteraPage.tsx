import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Gift, AlertCircle } from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { getBilleteraTotalBalance, redeemExternalGiftCard } from '../services/billeteraService';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

interface BilleteraPageProps {
  onGoToReservas?: () => void;
}

export const BilleteraPage: React.FC<BilleteraPageProps> = ({ onGoToReservas }) => {
  const { client } = useCliente();
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<any[]>([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const loadWallet = async () => {
    if (!client?.id) return;
    try {
      const total = await getBilleteraTotalBalance(client.id);
      setBalance(total);

      const q = query(collection(db, 'clientes', client.id, 'wallet_ledger'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setLedger(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error cargando billetera:', err);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [client?.id]);

  const handleRedeem = async () => {
    if (!client?.id) return;
    setRedeemLoading(true);
    setMessage(null);
    try {
      const res = await redeemExternalGiftCard(client.id, redeemCode);
      if (res.valid) {
        setMessage({ text: res.message, type: 'success' });
        setRedeemCode('');
        loadWallet(); // Reload balance and ledger
      } else {
        setMessage({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al canjear.', type: 'error' });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <div className="inline-flex items-center space-x-2 bg-[#C9A55B]/15 border border-[#C9A55B]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#806020] dark:text-[#C9A55B] mb-2">
            <Wallet className="w-3.5 h-3.5" />
            <span>Mi Billetera ESSENYA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)]">
            Billetera Virtual
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
            Aquí puedes consultar el saldo disponible en tu cuenta para ser utilizado en futuras reservas.
          </p>
        </div>
        
        {onGoToReservas && (
          <div className="flex flex-wrap items-center gap-2.5">
            <LuxuryButton variant="outline" size="sm" onClick={onGoToReservas}>
              <Calendar className="w-4 h-4 mr-1.5" />
              <span>Reservar Cita</span>
            </LuxuryButton>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-full border border-[#E5DFD3] dark:border-[#333333] flex items-center justify-center">
              <Wallet className="w-10 h-10 text-[#C9A55B]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">Saldo Disponible</p>
              <h2 className="text-5xl font-black font-serif text-[var(--text-primary)]">${balance.toLocaleString()} <span className="text-2xl text-[var(--text-muted)]">MXN</span></h2>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#C9A55B]" />
              Canjear Tarjeta de Regalo
            </h4>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="REGALO-ESS-1234" 
                className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C9A55B] text-[var(--text-primary)]"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
              />
              <LuxuryButton className="w-full" onClick={handleRedeem} disabled={redeemLoading || !redeemCode}>
                {redeemLoading ? 'Verificando...' : 'Canjear Código'}
              </LuxuryButton>
              {message && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600'}`}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{message.text}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-3xl p-6 shadow-sm border border-[var(--border-color)] h-[500px] flex flex-col">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 font-serif">Historial de Movimientos</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {ledger.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Wallet className="w-12 h-12 text-[#C9A55B]/30 mb-3" />
                <p className="text-sm text-[var(--text-muted)]">No hay movimientos registrados.</p>
              </div>
            ) : (
              ledger.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{tx.description}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{new Date(tx.timestamp).toLocaleString('es-MX')}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">Ref: {tx.referenceId}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${tx.type === 'CREDIT' ? 'text-[#C9A55B]' : 'text-[var(--text-primary)]'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}${Number(tx.amount || 0).toLocaleString()} MXN
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
