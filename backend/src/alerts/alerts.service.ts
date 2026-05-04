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
      
      // If time until due is less than or equal to alert time, and not already fired
      // To prevent duplicate alerts, we can check a 'alertFired' flag on the task
      if (timeUntilDue > 0 && timeUntilDue <= alertTimeMs && !task.alertFired) {
        
        const alertId = randomUUID();
        // Generate an alert
        await db.collection(this.collection).doc(alertId).set({
          id: alertId,
          taskId: task.id,
          userId: task.scope === 'organization' ? task.orgId : task.assigneeId, 
          scope: task.scope,
          message: `Task "${task.title}" is due soon!`,
          isRead: false,
          triggerTime: now
        });

        // Mark task alert as fired
        await db.collection('tasks').doc(task.id).update({ alertFired: true });
        this.logger.log(`Generated alert for task ${task.id}`);
      }
    }
  }

  async getUserAlerts(userId: string) {
    const db = this.firebaseService.getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) return [];

    const targetIds = [userId, userData.orgId, ...(userData.teamIds || [])].filter(Boolean);
    const allDocs = [];
    
    for (let i = 0; i < targetIds.length; i += 10) {
      const chunk = targetIds.slice(i, i + 10);
      const snapshot = await db.collection(this.collection).where('userId', 'in', chunk).get();
      allDocs.push(...snapshot.docs);
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
