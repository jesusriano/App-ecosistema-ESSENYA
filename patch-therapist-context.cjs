const fs = require('fs');
let code = fs.readFileSync('src/shared/context/TherapistContext.tsx', 'utf8');

const helper = `
  const syncPublicProfile = async (id: string, fullProfile: any) => {
    try {
      const publicData = {
        id: fullProfile.id,
        nombre: fullProfile.nombre,
        fotografia: fullProfile.fotografia || '',
        especialidades: fullProfile.especialidades || [],
        experienciaAnos: fullProfile.experienciaAnos || 0,
        puntuacion: fullProfile.puntuacion || 5.0,
        resenasCount: fullProfile.resenasCount || 0,
        serviciosCompletados: fullProfile.serviciosCompletados || 0,
        idiomas: fullProfile.idiomas || [],
        zonasCobertura: fullProfile.zonasCobertura || [],
        disponibilidad: fullProfile.disponibilidad || '',
        vehiculo: fullProfile.vehiculo || '',
        estado: fullProfile.estado || 'pendiente'
      };
      await setDoc(doc(db, 'terapeutas_publicos', id), publicData, { merge: true });
    } catch(e) {
      console.error("Failed to sync public profile", e);
    }
  };
`;

// Insert the helper after `const logAudit = ...`
code = code.replace("const logAudit = async (", helper + "\n  const logAudit = async (");

// Now inject syncPublicProfile into updateTherapist, updateSelfProfile, changeTherapistStatus, deleteTherapist, reviewDocument, etc.
// The easiest way is to find all `setTherapists(prev => prev.map(t => {` and patch it to also call syncPublicProfile.
// Actually, it's better to just do it where `updatePayload` is saved.

function patchFunction(funcName) {
    const search = `await updateDoc(doc(db, 'terapeutas', `;
    // Wait, it's easier to just find the `setTherapists` calls and run sync on the result.
}
