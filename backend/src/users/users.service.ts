import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

export interface CreateUserDto {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'user';
  orgId?: string;
  teamIds?: string[];
}

@Injectable()
export class UsersService {
  private collection = 'users';

  constructor(private firebaseService: FirebaseService) {}

  async createUser(data: CreateUserDto) {
    const db = this.firebaseService.getFirestore();
    if (!db) throw new Error('Firestore not initialized');

    const userRef = db.collection(this.collection).doc(data.id);
    await userRef.set({
      ...data,
      createdAt: new Date(),
    });

    return { ...data, id: data.id };
  }

  async getUser(id: string) {
    const db = this.firebaseService.getFirestore();
    if (!db) throw new Error('Firestore not initialized');

    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data();
  }

  async getUsersByOrg(orgId: string) {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).where('orgId', '==', orgId).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, name: data.name, email: data.email, role: data.role, teamIds: data.teamIds || [] };
    });
  }
}
