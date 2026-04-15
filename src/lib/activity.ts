import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ActivityLog } from '../types';

export async function logActivity(
  type: ActivityLog['type'],
  description: string,
  userId: string,
  userName: string,
  metadata?: Record<string, any>
) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      type,
      description,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      metadata: metadata || {}
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
