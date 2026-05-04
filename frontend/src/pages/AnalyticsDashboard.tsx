import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from 'recharts';

interface AnalyticsProps {
  tasks?: any[];
  teams?: any[];
  orgUsers?: any[];
}

const COLORS = {
  pending: '#eab308', // yellow
  'in-progress': '#3b82f6', // blue
  completed: '#22c55e', // green
  overdue: '#ef4444' // red
};

export const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ tasks = [], teams = [], orgUsers = [] }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    teamId: '',
    userId: '',
    scope: '',
    groupBy: 'Day'
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.startDate && new Date(task.dueDate) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(task.dueDate) > new Date(filters.endDate)) return false;
      if (filters.scope && task.scope !== filters.scope) return false;
      if (filters.userId && task.assigneeId !== filters.userId) return false;
      if (filters.teamId && task.assigneeId !== filters.teamId) return false;
      return true;
    });
  }, [tasks, filters]);

  // Summary Cards Data
  const summary = useMemo(() => {
    const counts = { pending: 0, 'in-progress': 0, completed: 0, overdue: 0, total: filteredTasks.length };
    filteredTasks.forEach(t => {
      if (counts[t.status as keyof typeof counts] !== undefined) {
        counts[t.status as keyof typeof counts]++;
      }
    });
    const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
    return { ...counts, completionRate };
  }, [filteredTasks]);

  // Data for Doughnut Chart
  const statusDistribution = useMemo(() => {
    return [
      { name: `Pending (${summary.pending})`, value: summary.pending, key: 'pending' },
      { name: `In Progress (${summary['in-progress']})`, value: summary['in-progress'], key: 'in-progress' },
      { name: `Completed (${summary.completed})`, value: summary.completed, key: 'completed' },
      { name: `Overdue (${summary.overdue})`, value: summary.overdue, key: 'overdue' }
    ].filter(item => item.value > 0);
  }, [summary]);

  // Data for Main Chart
  const completionOverTime = useMemo(() => {
    const groups: Record<string, { date: string, total: number, completed: number, remaining: number, completionPercent: number }> = {};
    
    const sortedTasks = [...filteredTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    sortedTasks.forEach(task => {
      const d = new Date(task.dueDate);
      let dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (filters.groupBy === 'Week') {
        const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6:1);
        const startOfWeek = new Date(d.setDate(diff));
        dateKey = `Week ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else if (filters.groupBy === 'Month') {
        dateKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, total: 0, completed: 0, remaining: 0, completionPercent: 0 };
      }
      groups[dateKey].total++;
      if (task.status === 'completed') {
        groups[dateKey].completed++;
      }
      groups[dateKey].remaining = groups[dateKey].total - groups[dateKey].completed;
      groups[dateKey].completionPercent = Math.round((groups[dateKey].completed / groups[dateKey].total) * 100);
    });

    return Object.values(groups);
  }, [filteredTasks, filters.groupBy]);

  // Data for Completion by Team
  const completionByTeam = useMemo(() => {
    const groups: Record<string, { name: string, total: number, completed: number }> = {};
    
    filteredTasks.forEach(task => {
      if (task.scope === 'team' && task.assigneeId) {
        const team = teams.find(t => t.id === task.assigneeId);
        const teamName = team ? team.name : 'Unknown Team';
        if (!groups[teamName]) {
          groups[teamName] = { name: teamName, total: 0, completed: 0 };
        }
        groups[teamName].total++;
        if (task.status === 'completed') {
          groups[teamName].completed++;
        }
      }
    });
    return Object.values(groups);
  }, [filteredTasks, teams]);

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Reports & Analytics</h2>
        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Task insights for your organization</p>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'flex-end', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Start Date</label>
          <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>End Date</label>
          <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Team</label>
          <select value={filters.teamId} onChange={e => setFilters({ ...filters, teamId: e.target.value, userId: '', scope: 'team' })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <option value="">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Group by</label>
          <select value={filters.groupBy} onChange={e => setFilters({ ...filters, groupBy: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <option value="Day">Day</option>
            <option value="Week">Week</option>
            <option value="Month">Month</option>
          </select>
        </div>
        
        {/* Preserved old features */}
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Scope</label>
          <select value={filters.scope} onChange={e => setFilters({ ...filters, scope: e.target.value, teamId: '', userId: '' })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <option value="">All Scopes</option>
            <option value="organization">Organization</option>
            <option value="team">Team</option>
            <option value="user">User</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>User</label>
          <select value={filters.userId} onChange={e => setFilters({ ...filters, userId: e.target.value, teamId: '', scope: 'user' })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <option value="">All Users</option>
            {orgUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>

        <div style={{ paddingBottom: '2px' }}>
          <button className="btn-secondary" style={{ padding: '0.5rem 1.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setFilters({ startDate: '', endDate: '', teamId: '', userId: '', scope: '', groupBy: 'Day' })}>
            Clear
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: `1px solid ${COLORS.pending}`, textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: COLORS.pending }}>{summary.pending}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pending</p>
        </div>
        <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: `1px solid ${COLORS['in-progress']}`, textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: COLORS['in-progress'] }}>{summary['in-progress']}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>In Progress</p>
        </div>
        <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: `1px solid ${COLORS.completed}`, textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: COLORS.completed }}>{summary.completed}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Completed</p>
        </div>
        <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: `1px solid ${COLORS.overdue}`, textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: COLORS.overdue }}>{summary.overdue}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Overdue</p>
        </div>
        <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--text-secondary)', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#6366f1' }}>{summary.completionRate}%</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Completion Rate</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass-panel" style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', margin: '0 0 1.5rem 0', fontSize: '1rem' }}>Task completion rate over time</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={completionOverTime} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" hide />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="left" dataKey="completed" name="Completed" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} />
              <Bar yAxisId="left" dataKey="remaining" name="Total (Pending)" stackId="a" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="completionPercent" name="Completion %" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row Charts */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>Distribution by status</h3>
          <div style={{ width: '100%', height: 250, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="30%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.key as keyof typeof COLORS] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {summary.total}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ flex: 1, minWidth: '400px', background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>Completion by team</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionByTeam} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={0}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} cursor={{ fill: 'var(--bg-color)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="total" name="Total" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
