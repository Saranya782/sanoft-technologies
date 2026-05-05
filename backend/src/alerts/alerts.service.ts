import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FirebaseService } from '../firebase/firebase.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private collection = 'alerts';

  constructor(private firebaseService: FirebaseService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkTaskAlerts() {
    this.logger.debug('Running task alert check cron job');
    const db = this.firebaseService.getFirestore();
    if (!db) return;

    const now = new Date();
    
    // We fetch pending/in-progress tasks first, then filter alertEnabled in memory
    // to avoid requiring a custom Firestore composite index.
    const snapshot = await db.collection('tasks')
      .where('status', 'in', ['pending', 'in-progress'])
      .get();

    for (const doc of snapshot.docs) {
      const task = doc.data();
      if (!task.alertEnabled || !task.dueDate) continue;

      const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
      const alertTimeMs = task.alertTimeMinutes * 60 * 1000;
      
      const timeUntilDue = dueDate.getTime() - now.getTime();
      
      // If time until due is less than 0, it's overdue!
      if (timeUntilDue < 0) {
        if (task.status !== 'overdue') {
          await db.collection('tasks').doc(task.id).update({ status: 'overdue' });
          this.logger.log(`Marked task ${task.id} as overdue`);
        }
        
        if (!task.overdueAlertFired) {
          const alertId = randomUUID();
          await db.collection(this.collection).doc(alertId).set({
            id: alertId,
            taskId: task.id,
            orgId: task.orgId || '',
            userId: task.scope === 'organization' ? task.orgId : task.assigneeId, 
            scope: task.scope,
            message: `Task "${task.title}" is OVERDUE!`,
            isRead: false,
            triggerTime: now,
            type: 'overdue'
          });
          await db.collection('tasks').doc(task.id).update({ overdueAlertFired: true });
        }
      } 
      // If time until due is within the alert window, and not already fired
      else if (timeUntilDue > 0 && timeUntilDue <= alertTimeMs && !task.alertFired) {
        const alertId = randomUUID();
        // Generate an alert
        await db.collection(this.collection).doc(alertId).set({
          id: alertId,
          taskId: task.id,
          orgId: task.orgId || '',
          userId: task.scope === 'organization' ? task.orgId : task.assigneeId, 
          scope: task.scope,
          message: `Task "${task.title}" is due soon!`,
          isRead: false,
          triggerTime: now,
          type: 'upcoming'
        });

        // Mark task alert as fired
        await db.collection('tasks').doc(task.id).update({ alertFired: true });
        this.logger.log(`Generated upcoming alert for task ${task.id}`);
      }
    }
  }

  async getUserAlerts(userId: string) {
    const db = this.firebaseService.getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) return [];

    const allDocs = [];

    if (userData.role === 'admin') {
      // Admins see all alerts in their organization
      const snapshot = await db.collection(this.collection).where('orgId', '==', userData.orgId).get();
      allDocs.push(...snapshot.docs);
    } else {
      // Regular users see alerts targeted to them, their teams, or the whole organization
      const targetIds = [userId, userData.orgId, ...(userData.teamIds || [])].filter(Boolean);
      for (let i = 0; i < targetIds.length; i += 10) {
        const chunk = targetIds.slice(i, i + 10);
        const snapshot = await db.collection(this.collection).where('userId', 'in', chunk).get();
        allDocs.push(...snapshot.docs);
      }
    }

    return allDocs.map(d => {
      const data = d.data();
      if (data.triggerTime && data.triggerTime.toDate) {
        data.triggerTime = data.triggerTime.toDate();
      }
      return data;
    });
  }

  async markAsRead(alertId: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).doc(alertId).update({ isRead: true });
    return { success: true };
  }
}
