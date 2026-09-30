/**
 * Validates a file for profile photo upload.
 * Limits: Max 2MB, Type: image/jpeg or image/png.
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateProfilePhoto(file: File): FileValidationResult {
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

  if (!file) {
    return { isValid: false, error: 'No se seleccionó ningún archivo.' };
  }

  if (file.size > MAX_SIZE) {
    return { 
      isValid: false, 
      error: `La imagen supera el límite de 2MB (Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)}MB).` 
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Formato no permitido. Solo se aceptan archivos JPEG y PNG.' 
    };
  }

  return { isValid: true };
}
