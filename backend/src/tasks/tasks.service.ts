import { Injectable, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { randomUUID } from 'crypto';

export class CreateTaskDto {
  orgId: string;
  title: string;
  description: string;
  scope: 'organization' | 'team' | 'user';
  assigneeId: string;
  dueDate: string;
  alertEnabled: boolean;
  alertTimeMinutes: number;
  priority: 'low' | 'medium' | 'high';
}

@Injectable()
export class TasksService {
  private collection = 'tasks';

  constructor(private firebaseService: FirebaseService) {}

  async createTask(data: CreateTaskDto, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    
    // Verify admin
    const userDoc = await db.collection('users').doc(adminUserId).get();
    const userData = userDoc.data();
    if (!userDoc.exists || userData?.orgId !== data.orgId || userData?.role !== 'admin') {
        throw new ForbiddenException('Only admins can create tasks for this organization');
    }

    const taskId = randomUUID();
    const task = {
      id: taskId,
      ...data,
      dueDate: new Date(data.dueDate),
      status: 'pending',
      createdBy: adminUserId,
      createdAt: new Date(),
    };

    await db.collection(this.collection).doc(taskId).set(task);
    return task;
  }

  async getTasks(userId: string) {
    const db = this.firebaseService.getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData || !userData.orgId) return [];

    const { orgId, teamIds, role } = userData;
    const tasksQuery = db.collection(this.collection).where('orgId', '==', orgId);

    const snapshot = await tasksQuery.get();
    const allTasks = snapshot.docs.map(doc => {
      const data = doc.data();
      // Firestore stores Dates as Timestamps, convert them back for the API
      if (data.dueDate && data.dueDate.toDate) {
        data.dueDate = data.dueDate.toDate();
      }
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate();
      }
      return data;
    });

    if (role !== 'admin') {
       return allTasks.filter(t => 
         t.scope === 'organization' ||
         (t.scope === 'team' && (teamIds || []).includes(t.assigneeId)) ||
         (t.scope === 'user' && t.assigneeId === userId)
       );
    }

    return allTasks;
  }

  async getTaskById(taskId: string, userId: string) {
    const db = this.firebaseService.getFirestore();
    const taskDoc = await db.collection(this.collection).doc(taskId).get();
    
    if (!taskDoc.exists) throw new ForbiddenException('Task not found');
    const taskData = taskDoc.data() as any;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) throw new ForbiddenException('User not found');

    if (userData.role !== 'admin') {
      const hasAccess = taskData.scope === 'organization' ||
                        (taskData.scope === 'team' && (userData.teamIds || []).includes(taskData.assigneeId)) ||
                        (taskData.scope === 'user' && taskData.assigneeId === userId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to view this task');
      }
    }

    if (taskData.dueDate && taskData.dueDate.toDate) taskData.dueDate = taskData.dueDate.toDate();
    if (taskData.createdAt && taskData.createdAt.toDate) taskData.createdAt = taskData.createdAt.toDate();

    return taskData;
  }

  async updateTask(taskId: string, updates: Partial<CreateTaskDto & { status: string }>, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    const taskRef = db.collection(this.collection).doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) throw new ForbiddenException('Task not found');
    
    const userDoc = await db.collection('users').doc(adminUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admins can edit tasks');
    }

    const cleanUpdates: any = { ...updates };
    delete cleanUpdates.id;
    delete cleanUpdates.createdAt;
    delete cleanUpdates.createdBy;
    delete cleanUpdates.orgId;

    if (cleanUpdates.dueDate) {
      cleanUpdates.dueDate = new Date(cleanUpdates.dueDate);
      
      const oldData = taskDoc.data() as any;
      const oldDueDate = oldData?.dueDate?.toDate ? oldData.dueDate.toDate() : new Date(oldData?.dueDate);
      
      if (oldDueDate && oldDueDate.getTime() !== cleanUpdates.dueDate.getTime()) {
        // Due date changed, reset alert flags so they can trigger again
        cleanUpdates.alertFired = false;
        cleanUpdates.overdueAlertFired = false;
        
        // If it was overdue but the new date is in the future, auto-revert to pending
        if (oldData.status === 'overdue' && cleanUpdates.dueDate.getTime() > Date.now()) {
          cleanUpdates.status = 'pending';
        }
      }
    }

    try {
      await taskRef.update(cleanUpdates);
    } catch (error) {
      console.error("Failed to update task in Firestore:", error);
      throw error;
    }
    
    return { id: taskId, ...updates };
  }

  async deleteTask(taskId: string, adminUserId: string) {
    const db = this.firebaseService.getFirestore();
    const userDoc = await db.collection('users').doc(adminUserId).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete tasks');
    }

    await db.collection(this.collection).doc(taskId).delete();
    return { success: true };
  }

  async updateTaskStatus(taskId: string, newStatus: string, userId: string) {
    const db = this.firebaseService.getFirestore();
    const taskRef = db.collection(this.collection).doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) throw new ForbiddenException('Task not found');
    const taskData = taskDoc.data() as any;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData) throw new ForbiddenException('User not found');

    // If they aren't admin, verify they have access to this task
    if (userData.role !== 'admin') {
       const hasAccess = taskData.scope === 'organization' ||
                         (taskData.scope === 'team' && (userData.teamIds || []).includes(taskData.assigneeId)) ||
                         (taskData.scope === 'user' && taskData.assigneeId === userId);
                         
       if (!hasAccess) {
         throw new ForbiddenException('You do not have permission to update this task');
       }
    }

    await taskRef.update({ status: newStatus });
    return { id: taskId, status: newStatus };
  }
}
