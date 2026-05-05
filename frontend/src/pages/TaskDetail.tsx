import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, dbUser } = useAuthStore();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [teams, setTeams] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);

  const formatLocalDatetime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseLocalDatetimeToUTC = (localString: string) => {
    if (!localString) return '';
    const [datePart, timePart] = localString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes).toISOString();
  };

  useEffect(() => {
    const fetchTask = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const fetchPromises: Promise<Response>[] = [
          fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${id}`, { headers })
        ];

        if (dbUser?.orgId) {
          fetchPromises.push(
            fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/org/${dbUser.orgId}`, { headers }),
            fetch(`${import.meta.env.VITE_API_BASE_URL}/users/org/${dbUser.orgId}`, { headers })
          );
        }

        const responses = await Promise.all(fetchPromises);
        
        if (!responses[0].ok) {
          const text = await responses[0].text();
          throw new Error(`Error: ${responses[0].status} - ${text}`);
        }
        
        setTask(await responses[0].json());

        if (responses.length > 1) {
          const teamsData = await responses[1].json().catch(() => []);
          const usersData = await responses[2].json().catch(() => []);
          setTeams(Array.isArray(teamsData) ? teamsData : []);
          setOrgUsers(Array.isArray(usersData) ? usersData : []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id, token]);

  const updateTaskStatus = async (newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTask({ ...task, status: newStatus });
      } else {
        const errText = await res.text();
        throw new Error(errText);
      }
    } catch (err: any) {
      console.error('Failed to update status', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        setTask(editData);
        setIsEditing(false);
      } else {
        const errText = await res.text();
        throw new Error(errText);
      }
    } catch (err: any) {
      console.error('Failed to update task', err);
      alert('Failed to update task: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) navigate('/');
    } catch (err) {
      console.error('Failed to delete task');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--success-color)';
      case 'in-progress': return 'var(--primary-color)';
      case 'overdue': return 'var(--error-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getAssigneeName = () => {
    if (task.scope === 'organization') return 'All Organization Members';
    if (task.scope === 'team') {
      const team = teams.find(t => t.id === task.assigneeId);
      return team ? team.name : 'Unknown Team';
    }
    if (task.scope === 'user') {
      const user = orgUsers.find(u => u.id === task.assigneeId);
      return user ? `${user.name} (${user.email})` : 'Unknown User';
    }
    return 'Unknown';
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-primary)' }}>Loading task details...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--error-color)' }}>{error}</div>;
  if (!task) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <button 
        onClick={() => navigate('/')} 
        className="btn-secondary" 
        style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        ← Back to Dashboard
      </button>

      <div className="glass-panel">
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)' }}>Edit Task</h2>
            <div className="input-group">
              <label>Title</label>
              <input type="text" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
                <label>Status</label>
                <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
                <label>Priority</label>
                <select value={editData.priority} onChange={e => setEditData({...editData, priority: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
                <label>Due Date</label>
                <input 
                  type="datetime-local" 
                  value={formatLocalDatetime(editData.dueDate)} 
                  onChange={e => {
                    if (e.target.value) {
                      setEditData({...editData, dueDate: parseLocalDatetimeToUTC(e.target.value)});
                    }
                  }} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
                <label>Scope</label>
                <select value={editData.scope} onChange={e => setEditData({...editData, scope: e.target.value, assigneeId: ''})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <option value="organization">Organization</option>
                  <option value="team">Team</option>
                  <option value="user">User</option>
                </select>
              </div>
              
              {editData.scope === 'team' && (
                <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label>Assignee (Team)</label>
                  <select value={editData.assigneeId} onChange={e => setEditData({...editData, assigneeId: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <option value="">Select a team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              
              {editData.scope === 'user' && (
                <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label>Assignee (User)</label>
                  <select value={editData.assigneeId} onChange={e => setEditData({...editData, assigneeId: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <option value="">Select a user...</option>
                    {orgUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={editData.alertEnabled} onChange={e => setEditData({...editData, alertEnabled: e.target.checked})} id="editAlert" style={{ width: 'auto' }} />
                <label htmlFor="editAlert" style={{ margin: 0, cursor: 'pointer' }}>Enable Alert Notification</label>
              </div>
              {editData.alertEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                  <input type="number" value={editData.alertTimeMinutes} onChange={e => setEditData({...editData, alertTimeMinutes: parseInt(e.target.value)})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} min="1" />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>minutes before</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => setIsEditing(false)} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdate} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>Save Changes</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{task.title}</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : task.priority === 'low' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#22c55e' : '#3b82f6', border: `1px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#22c55e' : '#3b82f6'}` }}>
                    {task.priority?.toUpperCase()} PRIORITY
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    ID: {task.id.substring(0, 8)}...
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</span>
                <select 
                  value={task.status} 
                  onChange={(e) => updateTaskStatus(e.target.value)}
                  style={{ padding: '0.5rem 1rem', background: getStatusColor(task.status), color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <option value="pending" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>PENDING</option>
                  <option value="in-progress" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>IN PROGRESS</option>
                  <option value="completed" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>COMPLETED</option>
                  <option value="overdue" disabled={dbUser?.role !== 'admin'} hidden={dbUser?.role !== 'admin' && task.status !== 'overdue'} style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>OVERDUE</option>
                </select>
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: 'var(--box-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Description</h3>
              <p style={{ margin: 0, lineHeight: '1.6' }}>{task.description}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Due Date</span>
                <strong>{new Date(task.dueDate).toLocaleString()}</strong>
              </div>

              <div style={{ padding: '1rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assignment Scope</span>
                <strong style={{ textTransform: 'capitalize' }}>{task.scope}</strong>
              </div>

              <div style={{ padding: '1rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned To</span>
                <strong>{getAssigneeName()}</strong>
              </div>

              <div style={{ padding: '1rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Alert Configuration</span>
                {task.alertEnabled ? (
                  <strong>{task.alertTimeMinutes} minutes before</strong>
                ) : (
                  <strong style={{ color: 'var(--text-secondary)' }}>Disabled</strong>
                )}
              </div>
            </div>

            {task.scope === 'team' && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Team Members</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {(() => {
                    const team = teams.find(t => t.id === task.assigneeId);
                    if (!team || !team.memberIds || team.memberIds.length === 0) return <span style={{ color: 'var(--text-secondary)' }}>No members found.</span>;
                    return team.memberIds.map((mId: string) => {
                      const user = orgUsers.find(u => u.id === mId);
                      if (!user) return null;
                      return (
                        <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--box-bg)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                          <span style={{ fontSize: '0.9rem' }}>{user.name}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {dbUser?.role === 'admin' && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '1.2rem', background: 'transparent', border: 'none', boxShadow: 'none' }} title="Edit Task" onClick={() => { setEditData(task); setIsEditing(true); }}>
                  ✏️
                </button>
                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '1.2rem', background: 'transparent', border: 'none', boxShadow: 'none' }} title="Delete Task" onClick={handleDelete}>
                  🗑️
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
