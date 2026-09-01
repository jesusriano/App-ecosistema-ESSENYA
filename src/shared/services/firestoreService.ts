import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  SetOptions,
  UpdateData,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreDebug';

/**
 * Safe wrapper around setDoc that logs detailed query structure and field errors.
 */
export async function safeSetDoc<T extends DocumentData>(
  docRef: DocumentReference<T>,
  data: T,
  options?: SetOptions
): Promise<void> {
  try {
    if (options) {
      await setDoc(docRef, data, options);
    } else {
      await setDoc(docRef, data);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docRef.path, data);
    throw error;
  }
}

/**
 * Safe wrapper around updateDoc that logs detailed query structure and field errors.
 */
export async function safeUpdateDoc<T extends DocumentData>(
  docRef: DocumentReference<T>,
  data: UpdateData<T>
): Promise<void> {
  try {
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docRef.path, data);
    throw error;
  }
}

/**
 * Safe wrapper around deleteDoc.
 */
export async function safeDeleteDoc<T extends DocumentData>(
  docRef: DocumentReference<T>
): Promise<void> {
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docRef.path);
    throw error;
  }
}

/**
 * Safe wrapper around getDoc.
 */
export async function safeGetDoc<T extends DocumentData>(
  docRef: DocumentReference<T>
) {
  try {
    return await getDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docRef.path);
    throw error;
  }
}

/**
 * Safe wrapper around getDocs.
 */
export async function safeGetDocs<T extends DocumentData>(
  queryOrCol: Query<T> | CollectionReference<T>,
  pathName?: string
) {
  try {
    return await getDocs(queryOrCol);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathName || 'collection_query');
    throw error;
  }
}

/**
 * Safe wrapper around onSnapshot with automatic permission & structure debugging.
 */
export function safeOnSnapshot<T extends DocumentData>(
  target: DocumentReference<T> | Query<T> | CollectionReference<T>,
  pathName: string,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): Unsubscribe {
  return onSnapshot(
    target as any,
    onNext,
    (error) => {
      handleFirestoreError(error, OperationType.GET, pathName);
      if (onError) {
        onError(error);
      }
    }
  );
}

export { db };
