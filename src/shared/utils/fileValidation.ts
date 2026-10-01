/**
 * Validates a file for profile photo upload.
 * Limits: Max 20MB, Type: image/jpeg, image/png, image/webp.
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateProfilePhoto(file: File, maxMb = 20): FileValidationResult {
  const MAX_SIZE = maxMb * 1024 * 1024; // 20MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

  if (!file) {
    return { isValid: false, error: 'No se seleccionó ningún archivo.' };
  }

  if (file.size > MAX_SIZE) {
    return { 
      isValid: false, 
      error: `La imagen supera el límite de ${maxMb}MB (Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)}MB). Por favor selecciona una foto de menor peso.` 
    };
  }

  const isTypeAllowed = ALLOWED_TYPES.includes(file.type?.toLowerCase()) || 
    /\.(jpe?g|png|webp)$/i.test(file.name);

  if (!isTypeAllowed) {
    return { 
      isValid: false, 
      error: 'Formato no permitido. Solo se aceptan imágenes JPEG, PNG o WebP.' 
    };
  }

  return { isValid: true };
}
