import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const { token, dbUser } = useAuthStore();
  
  const [teams, setTeams] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState({
    title: '', description: '', scope: 'organization', assigneeId: '',
    dueDate: '', alertEnabled: true, alertTimeMinutes: 30, priority: 'medium'
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !dbUser?.orgId) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [teamsRes, usersRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/org/${dbUser.orgId}`, { headers }),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/org/${dbUser.orgId}`, { headers })
        ]);
        setTeams(await teamsRes.json());
        setOrgUsers(await usersRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, dbUser]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !dbUser?.orgId) return;
    const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newTask, orgId: dbUser.orgId })
    });
    if (res.ok) {
      navigate('/');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-primary)' }}>Loading form...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>← Back to Dashboard</button>
      <div className="glass-panel">
        <h2 style={{ color: 'var(--primary-color)', margin: '0 0 1.5rem 0' }}>Create New Task</h2>
        
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group"><label>Title</label><input type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required /></div>
          <div className="input-group"><label>Description</label><textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '100px', fontFamily: 'inherit' }} /></div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: 1, minWidth: '200px' }}><label>Due Date</label><input type="datetime-local" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} required /></div>
            
            <div className="input-group" style={{ flex: 1, minWidth: '200px' }}><label>Priority</label>
              <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="input-group" style={{ flex: 1, minWidth: '200px' }}><label>Scope</label>
              <select value={newTask.scope} onChange={e => setNewTask({...newTask, scope: e.target.value, assigneeId: ''})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <option value="organization">Organization</option>
                <option value="team">Team</option>
                <option value="user">User</option>
              </select>
            </div>

            {newTask.scope === 'team' && (
              <div className="input-group" style={{ flex: 1, minWidth: '200px' }}><label>Assignee (Team)</label>
                <select value={newTask.assigneeId} onChange={e => setNewTask({...newTask, assigneeId: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} required>
                  <option value="">Select a team...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            {newTask.scope === 'user' && (
              <div className="input-group" style={{ flex: 1, minWidth: '200px' }}><label>Assignee (User)</label>
                <select value={newTask.assigneeId} onChange={e => setNewTask({...newTask, assigneeId: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} required>
                  <option value="">Select a user...</option>
                  {orgUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={newTask.alertEnabled} onChange={e => setNewTask({...newTask, alertEnabled: e.target.checked})} id="alertEnabled" style={{ width: 'auto' }} />
              <label htmlFor="alertEnabled" style={{ marginBottom: 0, cursor: 'pointer' }}>Enable Alert</label>
            </div>
            {newTask.alertEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <input type="number" value={newTask.alertTimeMinutes} onChange={e => setNewTask({...newTask, alertTimeMinutes: parseInt(e.target.value)})} required min="1" style={{ width: '80px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>minutes before due date</span>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Create Task</button>
        </form>
      </div>
    </div>
  );
};
