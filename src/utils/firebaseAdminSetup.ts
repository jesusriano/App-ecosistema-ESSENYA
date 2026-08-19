/**
 * INSTRUCCIONES DE USO:
 * 1. Importa este componente en tu archivo principal de la aplicación (ej. src/App.tsx o src/main.tsx):
 *    import { FirebaseAdminSetupComponent } from './utils/firebaseAdminSetup';
 * 
 * 2. Monta el componente dentro del JSX principal (ej. al final de tu App):
 *    <FirebaseAdminSetupComponent />
 * 
 * 3. Abre la aplicación en el navegador, haz clic en el botón "Crear Usuario Admin" 
 *    para registrar automáticamente a graphixglow.2024@gmail.com en Firebase Auth 
 *    y asignarle el rol 'admin' en la colección 'usuarios' de Firestore.
 * 
 * 4. Una vez creado el usuario, elimina la importación y el componente de tu App.
 */

import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const FirebaseAdminSetupComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const createAdminUser = async () => {
    setLoading(true);
    setStatus(null);

    const email = 'graphixglow.2024@gmail.com';
    const password = 'Solomillos1819';

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Set user document in 'usuarios' collection with rol: 'admin'
      await setDoc(doc(db, 'usuarios', user.uid), {
        uid: user.uid,
        correo: email,
        rol: 'admin',
        createdAt: new Date().toISOString()
      });

      setStatus(`¡Administrador creado con éxito! UID: ${user.uid}`);
    } catch (error: any) {
      console.error("Error creating admin user:", error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 p-6 max-w-sm bg-[#141414] border border-[#C9A55B] rounded-2xl text-center space-y-3 shadow-2xl text-white">
      <h3 className="font-serif font-bold text-sm text-[#C9A55B]">
        Setup Admin: graphixglow.2024@gmail.com
      </h3>
      <p className="text-[11px] text-[#888888]">
        Haz clic para registrar la cuenta de superadministrador en Auth y Firestore.
      </p>
      <button
        onClick={createAdminUser}
        disabled={loading}
        className="w-full py-2.5 bg-[#C9A55B] hover:bg-[#D8B46B] text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
      >
        {loading ? 'Creando Admin...' : 'Crear Usuario Admin'}
      </button>
      {status && (
        <p className="text-[10px] font-mono p-2 rounded-lg bg-black/80 border border-[#333333] text-emerald-400">
          {status}
        </p>
      )}
    </div>
  );
};
