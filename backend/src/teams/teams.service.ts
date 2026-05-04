import { Injectable, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { randomUUID } from 'crypto';

@Injectable()
export class TeamsService {
  private collection = 'teams';

  constructor(private firebaseService: FirebaseService) {}

  async createTeam(orgId: string, name: string, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    if (!db) throw new Error('Firestore not initialized');

    const userDoc = await db.collection('users').doc(adminUserId).get();
    if (!userDoc.exists || userDoc.data()?.orgId !== orgId || userDoc.data()?.role !== 'admin') {
        throw new ForbiddenException('Only organization admins can create teams');
    }

    const teamId = randomUUID();
    
    await db.collection(this.collection).doc(teamId).set({
      id: teamId,
      orgId,
      name,
      memberIds: [],
      createdAt: new Date(),
    });

    return { id: teamId, orgId, name, memberIds: [] };
  }

  async getTeamsByOrg(orgId: string) {
    const db = this.firebaseService.getFirestore();
    if (!db) throw new Error('Firestore not initialized');

    const snapshot = await db.collection(this.collection).where('orgId', '==', orgId).get();
    return snapshot.docs.map(doc => doc.data());
  }

  async updateTeam(teamId: string, name: string, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    const teamRef = db.collection(this.collection).doc(teamId);
    const teamDoc = await teamRef.get();
    
    if (!teamDoc.exists) throw new ForbiddenException('Team not found');
    
    const userDoc = await db.collection('users').doc(adminUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admins can edit teams');
    }

    await teamRef.update({ name });
    return { id: teamId, name };
  }

  async deleteTeam(teamId: string, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    const userDoc = await db.collection('users').doc(adminUserId).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete teams');
    }

    await db.collection(this.collection).doc(teamId).delete();
    return { success: true };
  }

  async assignMember(teamId: string, targetUserId: string, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    const adminDoc = await db.collection('users').doc(adminUserId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admins can assign members');
    }

    const teamRef = db.collection(this.collection).doc(teamId);
    const targetUserRef = db.collection('users').doc(targetUserId);

    // Update Team doc
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) throw new ForbiddenException('Team not found');
    const memberIds = teamDoc.data()?.memberIds || [];
    if (!memberIds.includes(targetUserId)) {
      await teamRef.update({ memberIds: [...memberIds, targetUserId] });
    }

    // Update User doc
    const targetUserDoc = await targetUserRef.get();
    if (targetUserDoc.exists) {
      const teamIds = targetUserDoc.data()?.teamIds || [];
      if (!teamIds.includes(teamId)) {
        await targetUserRef.update({ teamIds: [...teamIds, teamId] });
      }
    }

    return { success: true };
  }

  async removeMember(teamId: string, targetUserId: string, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    const adminDoc = await db.collection('users').doc(adminUserId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admins can remove members');
    }

    const teamRef = db.collection(this.collection).doc(teamId);
    const targetUserRef = db.collection('users').doc(targetUserId);

    // Update Team doc
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) throw new ForbiddenException('Team not found');
    const memberIds = teamDoc.data()?.memberIds || [];
    if (memberIds.includes(targetUserId)) {
      await teamRef.update({ memberIds: memberIds.filter((id: string) => id !== targetUserId) });
    }

    // Update User doc
    const targetUserDoc = await targetUserRef.get();
    if (targetUserDoc.exists) {
      const teamIds = targetUserDoc.data()?.teamIds || [];
      if (teamIds.includes(teamId)) {
        await targetUserRef.update({ teamIds: teamIds.filter((id: string) => id !== teamId) });
      }
    }

    return { success: true };
  }
}
