const fs = require('fs');
let content = fs.readFileSync('src/aplicaciones/cliente/pages/BilleteraPage.tsx', 'utf8');

// The file likely has a 'getGiftCards' and displays history.
// We should import the ledger.
content = content.replace(
  /import { (.*) } from '\.\.\/services\/billeteraService';/,
  "import { $1 } from '../services/billeteraService';\nimport { collection, query, orderBy, getDocs } from 'firebase/firestore';\nimport { db } from '../../../lib/firebase';"
);

// We need to fetch the ledger
const ledgerFetch = `
  const [ledger, setLedger] = useState<any[]>([]);
  useEffect(() => {
    const fetchLedger = async () => {
      if (!cliente?.id) return;
      try {
        const q = query(collection(db, 'clientes', cliente.id, 'wallet_ledger'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setLedger(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching ledger:', err);
      }
    };
    fetchLedger();
  }, [cliente?.id, cards]);
`;

// Insert the ledger fetch inside the component
content = content.replace(
  /const \[redeemError, setRedeemError\] = useState<string \| null>\(null\);/,
  "const [redeemError, setRedeemError] = useState<string | null>(null);\n" + ledgerFetch
);

// Add the ledger table to the UI
const ledgerUI = `
      <div className="bg-[var(--bg-card)] rounded-3xl p-6 shadow-sm border border-[var(--border-color)]">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 font-display">Historial de Movimientos</h3>
        {ledger.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No hay movimientos registrados.</p>
        ) : (
          <div className="space-y-4">
            {ledger.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{tx.description}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(tx.timestamp).toLocaleString()}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">Ref: {tx.referenceId}</p>
                </div>
                <div className="text-right">
                  <p className={\`text-sm font-bold \${tx.type === 'CREDIT' ? 'text-green-500' : 'text-red-500'}\`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}${(tx.amount || 0).toLocaleString()} MXN
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
`;

content = content.replace(
  /{cards\.length === 0 && !isGiftActive \? \(/,
  ledgerUI + "\n      {cards.length === 0 && !isGiftActive ? ("
);

fs.writeFileSync('src/aplicaciones/cliente/pages/BilleteraPage.tsx', content);
console.log("Patched BilleteraPage.tsx");
