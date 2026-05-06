import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { randomUUID } from 'crypto';

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

  async getUserByEmail(email: string) {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as any;
  }

  async updateUserOrg(userId: string, orgId: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).doc(userId).update({ orgId });
  }

  async getGuestUsers() {
    const db = this.firebaseService.getFirestore();
    const [usersSnapshot, alertsSnapshot] = await Promise.all([
      db.collection(this.collection).get(),
      db.collection('alerts').where('type', '==', 'invitation').get()
    ]);
    
    const invitedUserIds = new Set(alertsSnapshot.docs.map(doc => doc.data().userId));

    return usersSnapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as any))
      .filter(user => !user.orgId && user.role !== 'admin')
      .map(user => ({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        createdAt: user.createdAt,
        hasPendingInvite: invitedUserIds.has(user.id) 
      }));
  }

  async inviteUser(email: string, adminOrgId: string, adminName: string) {
    const user = await this.getUserByEmail(email);
    if (!user) throw new Error('User not found');
    if (user.orgId) throw new Error('User is already in an organization');
    
    const db = this.firebaseService.getFirestore();
    const alertId = randomUUID();
    await db.collection('alerts').doc(alertId).set({
      id: alertId,
      userId: user.id,
      orgId: adminOrgId,
      message: `${adminName} has invited you to join their organization.`,
      isRead: false,
      triggerTime: new Date(),
      type: 'invitation',
      inviterOrgId: adminOrgId
    });
    return { success: true };
  }
}
