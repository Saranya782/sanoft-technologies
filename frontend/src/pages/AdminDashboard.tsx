import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { dbUser, token } = useAuthStore();
  const { activeTab, setUnreadAlertsCount } = useUiStore();
  const [orgName, setOrgName] = useState('');
  const [org, setOrg] = useState<any>(null);
  
  // Organization Users
  const [orgUsers, setOrgUsers] = useState<any[]>([]);

  // Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');

  // Tasks State
  const [tasks, setTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskData, setEditTaskData] = useState<any>({});
  
  // Task Filters
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('All Statuses');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('All Priorities');
  const [taskScopeFilter, setTaskScopeFilter] = useState('All Scopes');

  const fetchOrgData = async () => {
    if (!token || !dbUser?.orgId) return;
    try {
      const [orgRes, teamsRes, tasksRes, usersRes, alertsRes] = await Promise.all([
        fetch(`http://localhost:3000/organizations/${dbUser.orgId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:3000/teams/org/${dbUser.orgId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:3000/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:3000/users/org/${dbUser.orgId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:3000/alerts`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setOrg(await orgRes.json());
      setTeams(await teamsRes.json());
      setTasks(await tasksRes.json());
      setOrgUsers(await usersRes.json());
      
      const alertsData = await alertsRes.json();
      setAlerts(alertsData);
      setUnreadAlertsCount(alertsData.filter((a: any) => !a.isRead).length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrgData();

    // Near-real-time polling
    const intervalId = setInterval(fetchOrgData, 5000);
    return () => clearInterval(intervalId);
  }, [dbUser, token]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('http://localhost:3000/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: orgName })
    });
    if (res.ok) window.location.reload(); 
  };

  // TEAM ACTIONS

  const handleUpdateTeam = async (id: string) => {
    if (!token) return;
    const res = await fetch(`http://localhost:3000/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editTeamName })
    });
    if (res.ok) { setEditingTeamId(null); fetchOrgData(); }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Delete this team?")) return;
    await fetch(`http://localhost:3000/teams/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchOrgData();
  };



  // TASK ACTIONS

  const handleUpdateTask = async (id: string) => {
    if (!token) return;
    const res = await fetch(`http://localhost:3000/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editTaskData)
    });
    if (res.ok) { setEditingTaskId(null); fetchOrgData(); }
  };

  const handleDeleteTask = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Delete this task?")) return;
    await fetch(`http://localhost:3000/tasks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchOrgData();
  };

  const markAlertRead = async (alertId: string) => {
    if (!token) return;
    await fetch(`http://localhost:3000/alerts/${alertId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    const newAlerts = alerts.map(a => a.id === alertId ? { ...a, isRead: true } : a);
    setAlerts(newAlerts);
    setUnreadAlertsCount(newAlerts.filter((a: any) => !a.isRead).length);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
                          (task.description || '').toLowerCase().includes(taskSearch.toLowerCase());
    const matchesStatus = taskStatusFilter === 'All Statuses' || task.status === taskStatusFilter;
    const matchesPriority = taskPriorityFilter === 'All Priorities' || task.priority === taskPriorityFilter;
    const matchesScope = taskScopeFilter === 'All Scopes' || task.scope === taskScopeFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesScope;
  });

  return (
    <div>
      {!dbUser?.orgId && !org ? (
        <div className="glass-panel" style={{ marginTop: '2rem' }}>
          <h2>Admin Setup</h2>
          <p>You need to create an organization to get started.</p>
          <form onSubmit={handleCreateOrg}>
            <div className="input-group">
              <label>Organization Name</label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Create Organization</button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
          
          {activeTab === 'overview' && (
            <div className="glass-panel">
              <h3>Organization Overview</h3>
              <p>Welcome to <strong>{org?.name}</strong>. Use the sidebar to navigate through your team, tasks, and analytics.</p>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem' }}>
                <div style={{ flex: 1, padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px' }}>
                  <h4>Total Teams</h4>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{teams.length}</p>
                </div>
                <div style={{ flex: 1, padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px' }}>
                  <h4>Total Tasks</h4>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{tasks.length}</p>
                </div>
                <div style={{ flex: 1, padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px' }}>
                  <h4>Total Members</h4>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{orgUsers.length}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Team Management</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.5rem', width: 'auto' }} onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} View`}>
                    {viewMode === 'grid' ? '📄 List View' : '🔲 Grid View'}
                  </button>
                  <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/team/new')}>
                    Create Team
                  </button>
                </div>
              </div>

              <div style={{ 
                display: viewMode === 'grid' ? 'grid' : 'flex', 
                flexDirection: viewMode === 'grid' ? undefined : 'column', 
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(250px, 1fr))' : undefined, 
                gap: '1rem' 
              }}>
                {teams.length === 0 && <p>No teams created yet.</p>}
                {teams.map(team => (
                  <div key={team.id} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', background: 'var(--panel-bg)', cursor: 'pointer', transition: 'all 0.2s', minHeight: viewMode === 'grid' ? '120px' : 'auto' }} onClick={() => navigate(`/team/${team.id}`)}>
                    <div style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', justifyContent: 'space-between', alignItems: viewMode === 'grid' ? 'flex-start' : 'center', gap: viewMode === 'grid' ? '1rem' : '0', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: viewMode === 'grid' ? '100%' : 'auto' }}>
                        <h4 style={{ margin: 0, fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: viewMode === 'grid' ? '100%' : 'auto', justifyContent: viewMode === 'grid' ? 'flex-start' : 'flex-end', marginTop: viewMode === 'grid' ? 'auto' : '0' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '0.3rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          {team.memberIds?.length || 0} Members
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Task Management</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.5rem', width: 'auto' }} onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} View`}>
                    {viewMode === 'grid' ? '📄 List View' : '🔲 Grid View'}
                  </button>
                  <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/task/new')}>
                    Create Task
                  </button>
                </div>
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
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <select value={taskScopeFilter} onChange={e => setTaskScopeFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                    <option value="All Scopes">All Scopes</option>
                    <option value="organization">Organization</option>
                    <option value="team">Team</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </div>

              <div style={{ 
                display: viewMode === 'grid' ? 'grid' : 'flex', 
                flexDirection: viewMode === 'grid' ? undefined : 'column', 
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined, 
                gap: '1rem' 
              }}>
                {filteredTasks.length === 0 && <p>No tasks match your filters.</p>}
                {filteredTasks.map(task => (
                  <div key={task.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', background: 'var(--panel-bg)', cursor: 'pointer', transition: 'all 0.2s', minHeight: viewMode === 'grid' ? '150px' : 'auto' }} onClick={() => navigate(`/task/${task.id}`)}>
                        <div style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', justifyContent: 'space-between', alignItems: viewMode === 'grid' ? 'flex-start' : 'center', gap: viewMode === 'grid' ? '1rem' : '0', height: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: viewMode === 'grid' ? '100%' : 'auto', justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-start' }}>
                            <h4 style={{ margin: 0, fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{task.title}</h4>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : task.priority === 'low' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#22c55e' : '#3b82f6', border: `1px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#22c55e' : '#3b82f6'}`, whiteSpace: 'nowrap' }}>
                              {task.priority?.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: viewMode === 'grid' ? '100%' : 'auto', justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-end', marginTop: viewMode === 'grid' ? 'auto' : '0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(task.dueDate).toLocaleDateString()}</span>
                              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--bg-color)', fontWeight: 'bold' }}>{task.status.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="glass-panel">
              <h3>Notifications & Alerts</h3>
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
                      {!alert.isRead && (
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => markAlertRead(alert.id)}>Mark Read</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && <AnalyticsDashboard tasks={tasks} teams={teams} orgUsers={orgUsers} />}
          
          {activeTab === 'settings' && (
            <div className="glass-panel">
              <h3>Settings</h3>
              <p>Settings panel coming soon.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
