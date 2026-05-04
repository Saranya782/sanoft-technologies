import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const { token, dbUser } = useAuthStore();
  const [teamName, setTeamName] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !dbUser?.orgId) return;
    const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orgId: dbUser.orgId, name: teamName })
    });
    if (res.ok) {
      navigate('/');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>← Back to Dashboard</button>
      <div className="glass-panel">
        <h2 style={{ color: 'var(--primary-color)', margin: '0 0 1.5rem 0' }}>Create New Team</h2>
        <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <label>Team Name</label>
            <input type="text" placeholder="e.g. Engineering" value={teamName} onChange={e => setTeamName(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Create Team</button>
        </form>
      </div>
    </div>
  );
};
