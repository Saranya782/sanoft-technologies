import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token, dbUser } = useAuthStore();
  const { activeTab, setActiveTab, setUnreadAlertsCount } = useUiStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // Task Filters
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('All Statuses');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('All Priorities');

  const fetchData = async () => {
    if (!token) return;
    try {
      const fetches = [
        fetch(import.meta.env.VITE_API_BASE_URL + '/tasks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(import.meta.env.VITE_API_BASE_URL + '/alerts', { headers: { Authorization: `Bearer ${token}` } })
      ];

      if (dbUser?.orgId) {
        fetches.push(fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/org/${dbUser.orgId}`, { headers: { Authorization: `Bearer ${token}` } }));
        fetches.push(fetch(`${import.meta.env.VITE_API_BASE_URL}/users/org/${dbUser.orgId}`, { headers: { Authorization: `Bearer ${token}` } }));
      }

      const [tasksRes, alertsRes, teamsRes, usersRes] = await Promise.all(fetches);
      const tasksData = await tasksRes.json();
      const alertsData = await alertsRes.json();
      setTasks(tasksData);
      setAlerts(alertsData);
      setUnreadAlertsCount(alertsData.filter((a: any) => !a.isRead).length);

      if (teamsRes && teamsRes.ok) {
        const orgTeams = await teamsRes.json();
        const myTeams = orgTeams.filter((t: any) => t.memberIds && t.memberIds.includes(dbUser?.id));
        setTeams(myTeams);
      }

      if (usersRes && usersRes.ok) {
        setOrgUsers(await usersRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData(); // initial fetch
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId); // cleanup on unmount
  }, [token, dbUser?.orgId, dbUser?.id]);

  useEffect(() => {
    if (dbUser && !dbUser.orgId && dbUser.role !== 'admin' && activeTab === 'overview') {
      setActiveTab('alerts');
    }
  }, [dbUser, activeTab, setActiveTab]);

  const markAlertRead = async (alertId: string) => {
    if (!token) return;
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/alerts/${alertId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    const newAlerts = alerts.map(a => a.id === alertId ? { ...a, isRead: true } : a);
    setAlerts(newAlerts);
    setUnreadAlertsCount(newAlerts.filter((a: any) => !a.isRead).length);
  };

  const acceptInvite = async (alertId: string, orgId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertId, orgId })
      });
      if (res.ok) {
        window.location.reload(); // Reload to fetch user's new org data and get access
      }
    } catch (err) {
      console.error('Failed to accept invite', err);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!token) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--success-color)';
      case 'in-progress': return 'var(--primary-color)';
      case 'overdue': return 'var(--error-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
                          (task.description || '').toLowerCase().includes(taskSearch.toLowerCase());
    const matchesStatus = taskStatusFilter === 'All Statuses' || task.status === taskStatusFilter;
    const matchesPriority = taskPriorityFilter === 'All Priorities' || task.priority === taskPriorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div style={{ marginTop: '2rem' }}>
      {activeTab === 'overview' && dbUser?.orgId && (
        <div className="glass-panel">
          <h2>Dashboard Overview</h2>
          <p>Here's a quick summary of your workload.</p>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px', borderLeft: '4px solid var(--text-secondary)' }}>
              <h4>Pending</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasks.filter(t => t.status === 'pending').length}</p>
            </div>
            <div style={{ flex: 1, minWidth: '150px', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
              <h4>In Progress</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasks.filter(t => t.status === 'in-progress').length}</p>
            </div>
            <div style={{ flex: 1, minWidth: '150px', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px', borderLeft: '4px solid var(--success-color)' }}>
              <h4>Completed</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasks.filter(t => t.status === 'completed').length}</p>
            </div>
            <div style={{ flex: 1, minWidth: '150px', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px', borderLeft: '4px solid var(--error-color)' }}>
              <h4>Overdue</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasks.filter(t => t.status === 'overdue').length}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && dbUser?.orgId && (
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>My Tasks</h2>
            <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} View`}>
              {viewMode === 'grid' ? '📄 List View' : '🔲 Grid View'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={taskSearch} 
                onChange={e => setTaskSearch(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <select value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                <option value="All Statuses">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <select value={taskPriorityFilter} onChange={e => setTaskPriorityFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                <option value="All Priorities">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div style={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex', 
            flexDirection: viewMode === 'grid' ? undefined : 'column', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined, 
            gap: '1rem', 
            marginTop: '1.5rem' 
          }}>
            {filteredTasks.length === 0 ? (
              <p>No tasks match your filters.</p>
            ) : (
              filteredTasks.map(task => (
                <div key={task.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--box-bg)', cursor: 'pointer', transition: 'all 0.2s', minHeight: viewMode === 'grid' ? '130px' : 'auto', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/task/${task.id}`)}>
                  <div style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', justifyContent: 'space-between', alignItems: viewMode === 'grid' ? 'flex-start' : 'center', gap: viewMode === 'grid' ? '1rem' : '0', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: viewMode === 'grid' ? '100%' : 'auto', justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-start' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{task.title}</h3>
                      {task.priority && (
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : task.priority === 'low' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#22c55e' : '#3b82f6', border: `1px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#22c55e' : '#3b82f6'}` }}>
                          {task.priority.toUpperCase()}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                        {task.scope === 'organization' ? 'ORG' : task.scope === 'team' ? 'TEAM' : 'PERSONAL'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: viewMode === 'grid' ? '100%' : 'auto', justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-end', marginTop: viewMode === 'grid' ? 'auto' : '0' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(task.dueDate).toLocaleDateString()}</span>
                      <select 
                        value={task.status} 
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', background: getStatusColor(task.status), color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        <option value="pending" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>PENDING</option>
                        <option value="in-progress" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>IN PROGRESS</option>
                        <option value="completed" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>COMPLETED</option>
                        <option value="overdue" disabled={dbUser?.role !== 'admin'} hidden={dbUser?.role !== 'admin' && task.status !== 'overdue'} style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>OVERDUE</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'teams' && dbUser?.orgId && (
        <div className="glass-panel">
          <h2>My Teams</h2>
          <p>Teams you are currently a member of.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', alignItems: 'start' }}>
            {teams.length === 0 ? (
              <p>You are not assigned to any teams yet.</p>
            ) : (
              teams.map(team => (
                <div 
                  key={team.id} 
                  style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--box-bg)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                  onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedTeamId === team.id ? '1rem' : '0', paddingBottom: expandedTeamId === team.id ? '1rem' : '0', borderBottom: expandedTeamId === team.id ? '1px solid var(--border-color)' : 'none', transition: 'all 0.2s ease' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>{team.name}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{team.memberIds.length} Members</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', transform: expandedTeamId === team.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                      ▼
                    </div>
                  </div>
                  
                  {expandedTeamId === team.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
                      {team.memberIds.map((mId: string) => {
                        const user = orgUsers.find(u => u.id === mId);
                        if (!user) return null;
                        return (
                          <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: user.id === dbUser?.id ? 'bold' : 'normal' }}>
                                {user.name} {user.id === dbUser?.id ? '(You)' : ''}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="glass-panel">
          <h2>Notifications & Alerts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {alerts.length === 0 ? (
              <p>You have no notifications.</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="alert" style={{ backgroundColor: alert.isRead ? 'var(--panel-bg)' : 'rgba(239, 68, 68, 0.2)', border: alert.isRead ? '1px solid var(--border-color)' : '1px solid #ef4444', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div>
                      <strong style={{ color: alert.isRead ? 'var(--text-secondary)' : '#ef4444' }}>{alert.isRead ? 'Read' : 'New Alert'}:</strong> {alert.message}
                    </div>
                    {alert.triggerTime && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(alert.triggerTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div>
                    {!alert.isRead && (
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => markAlertRead(alert.id)}>Mark Read</button>
                    )}
                    {alert.type === 'invitation' && (
                      <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', marginLeft: '0.5rem' }} onClick={() => acceptInvite(alert.id, alert.orgId)}>Accept</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="glass-panel">
          <h2>My Profile</h2>
          <p>Your account information and settings.</p>
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--box-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                {dbUser?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{dbUser?.name}</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{dbUser?.email}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Role</p>
                <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'capitalize' }}>{dbUser?.role}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Organization</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{dbUser?.orgId ? 'Sanoft Technologies' : 'Guest / No Organization'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
