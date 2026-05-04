import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, dbUser } = useAuthStore();
  const [team, setTeam] = useState<any>(null);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const fetchData = async () => {
    if (!token || !dbUser?.orgId) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [teamsRes, usersRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/org/${dbUser.orgId}`, { headers }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/users/org/${dbUser.orgId}`, { headers })
      ]);
      const teams = await teamsRes.json();
      const users = await usersRes.json();
      const currentTeam = teams.find((t: any) => t.id === id);
      setTeam(currentTeam);
      setOrgUsers(users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, token, dbUser]);

  const handleUpdateTeam = async () => {
    if (!token || !id) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editName })
    });
    if (res.ok) {
      setIsEditing(false);
      fetchData();
    }
  };

  const handleDeleteTeam = async () => {
    if (!token || !id) return;
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/${id}`, { 
      method: 'DELETE', 
      headers: { Authorization: `Bearer ${token}` } 
    });
    if (res.ok) navigate('/');
  };

  const handleAssignMember = async (userId: string) => {
    if (!token || !id) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId })
    });
    if (res.ok) fetchData();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !id) return;
    if (!window.confirm("Are you sure you want to remove this user from the team?")) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/teams/${id}/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) fetchData();
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-primary)' }}>Loading team details...</div>;
  if (!team) return <div style={{ padding: '2rem', color: 'var(--error-color)' }}>Team not found.</div>;

  // Filter users not in the team, and match search query
  const availableUsers = orgUsers
    .filter(u => !team.memberIds?.includes(u.id))
    .filter(u => (u.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()));

  // Resolve team members
  const teamMembers = (team.memberIds || []).map((mId: string) => orgUsers.find(u => u.id === mId)).filter(Boolean);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <button 
        onClick={() => navigate('/')} 
        className="btn-secondary" 
        style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        ← Back to Dashboard
      </button>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, maxWidth: '500px' }}>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              <button className="btn-primary" onClick={handleUpdateTeam}>Save</button>
              <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          ) : (
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{team.name}</h1>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ID: {team.id.substring(0, 8)}...</span>
            </div>
          )}

          {!isEditing && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '1.2rem', background: 'transparent', border: 'none', boxShadow: 'none' }} title="Edit Team" onClick={() => { setEditName(team.name); setIsEditing(true); }}>
                ✏️
              </button>
              <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '1.2rem', background: 'transparent', border: 'none', boxShadow: 'none' }} title="Delete Team" onClick={handleDeleteTeam}>
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Current Members */}
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Team Members ({teamMembers.length})</h3>
          {teamMembers.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No members in this team yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {teamMembers.map((user: any) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '1rem' }}>{user.name}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.email}</span>
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--error-color)', borderColor: 'var(--error-color)' }} onClick={() => handleRemoveMember(user.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Add Members (Searchable) */}
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 1rem 0' }}>Add Members</h3>
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {availableUsers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>{searchQuery ? 'No matching users found.' : 'All users are already in this team.'}</p>
            ) : (
              availableUsers.map((user: any) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{user.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</span>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleAssignMember(user.id)}>
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
