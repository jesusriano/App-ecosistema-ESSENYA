import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Expense } from '../types/finanzas';
import { Booking } from '../../../shared/types';

const EXPENSES_COLLECTION = 'gastos';

export async function getExpenses(): Promise<Expense[]> {
  try {
    const q = query(collection(db, EXPENSES_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
  } catch (e) {
    console.error('Error fetching expenses:', e);
    return [];
  }
}

export async function addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
      ...expense,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding expense:', e);
    throw e;
  }
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (e) {
    console.error('Error updating expense:', e);
    throw e;
  }
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting expense:', e);
    throw e;
  }
}

// Read existing bookings to calculate revenue without duplicating
export async function getBookingsRevenue(): Promise<Booking[]> {
  try {
    const snap = await getDocs(collection(db, 'reservas'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
  } catch (e) {
    console.error('Error fetching bookings revenue:', e);
    return [];
  }
}
