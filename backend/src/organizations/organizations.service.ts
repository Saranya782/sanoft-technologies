import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { randomUUID } from 'crypto';

@Injectable()
export class OrganizationsService {
  private collection = 'organizations';

  constructor(private firebaseService: FirebaseService) {}

  async createOrg(name: string, userId: string) {
    const db = this.firebaseService.getFirestore();
    if (!db) throw new Error('Firestore not initialized');

    const orgId = randomUUID();
    
    await db.collection(this.collection).doc(orgId).set({
      id: orgId,
      name,
      createdAt: new Date(),
    });

    await db.collection('users').doc(userId).update({
      orgId: orgId,
      role: 'admin'
    });

    return { id: orgId, name };
  }

  async getOrg(orgId: string) {
    const db = this.firebaseService.getFirestore();
    if (!db) throw new Error('Firestore not initialized');

    const doc = await db.collection(this.collection).doc(orgId).get();
    return doc.exists ? doc.data() : null;
  }
}
