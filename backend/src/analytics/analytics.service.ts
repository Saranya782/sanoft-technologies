import { Injectable, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AnalyticsService {
  constructor(private firebaseService: FirebaseService) {}

  async getTaskStats(userId: string) {
    const db = this.firebaseService.getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admins can view analytics');
    }

    const orgId = userDoc.data()?.orgId;
    
    // Fetch all tasks for the org
    const snapshot = await db.collection('tasks').where('orgId', '==', orgId).get();
    const tasks = snapshot.docs.map(doc => doc.data());

    // 1. Task distribution by status (Pie Chart data)
    const statusCount: Record<string, number> = {
      pending: 0,
      'in-progress': 0,
      completed: 0,
      overdue: 0
    };

    tasks.forEach(t => {
      if (statusCount[t.status] !== undefined) {
        statusCount[t.status]++;
      }
    });

    // 2. Task completion over time (Line Chart data)
    // Simplify by grouping completions by month/day. For MVP, let's just group by status.
    // In a real scenario, you'd check a 'completedAt' timestamp.

    return {
      statusDistribution: Object.keys(statusCount).map(key => ({
        name: key,
        value: statusCount[key]
      })),
      totalTasks: tasks.length
    };
  }
}
