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
import { registerAdminInFirestore } from '../shared/services/adminAuthService';

export const FirebaseAdminSetupComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState('essenya222@gmail.com');
  const [password, setPassword] = useState('AdminEssenya2026!');

  const createAdminUser = async () => {
    setLoading(true);
    setStatus(null);

    try {
      // 1. Create user in Firebase Authentication or use existing
      let uid: string;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        uid = userCredential.user.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use' && auth.currentUser) {
          uid = auth.currentUser.uid;
        } else {
          throw authErr;
        }
      }

      // 2. Register administrator in 'administradores' collection in Firestore
      const res = await registerAdminInFirestore({
        uid,
        correo: email.trim(),
        nombre: 'Administrador Principal',
        apellidos: 'ESSENYA',
        nivelAcceso: 'superadmin'
      });

      if (res.success) {
        setStatus(`¡Administrador guardado exitosamente en la colección 'administradores'! UID: ${uid}`);
      } else {
        setStatus(`Error al guardar en 'administradores': ${res.error}`);
      }
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
        Alta de Administrador en Firestore
      </h3>
      <p className="text-[11px] text-[#888888]">
        Registra el rol de admin en la colección <code className="text-[#C9A55B] font-mono">administradores</code>.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@ejemplo.com"
        className="w-full px-3 py-1.5 text-xs bg-black/60 border border-white/10 rounded-lg text-white"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        className="w-full px-3 py-1.5 text-xs bg-black/60 border border-white/10 rounded-lg text-white"
      />
      <button
        type="button"
        onClick={createAdminUser}
        disabled={loading}
        className="w-full py-2.5 bg-[#C9A55B] hover:bg-[#D8B46B] text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
      >
        {loading ? 'Registrando en Firestore...' : 'Guardar en Colección administradores'}
      </button>
      {status && (
        <p className="text-[10px] font-mono p-2 rounded-lg bg-black/80 border border-[#333333] text-emerald-400">
          {status}
        </p>
      )}
    </div>
  );
};
