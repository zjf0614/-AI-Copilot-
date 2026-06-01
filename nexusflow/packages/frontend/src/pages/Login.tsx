import { useState } from 'react';
import { setToken, auth } from '../api/client';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin123!');
  const [displayName, setDisplayName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('demo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await auth.login({ email, password, workspaceSlug });
      } else {
        res = await auth.register({ email, password, displayName, workspaceSlug: workspaceSlug + Date.now(), workspaceName: displayName + "'s Workspace" });
      }
      if (res.data?.accessToken) { setToken(res.data.accessToken); onLogin(); }
      else if (res.data?.mfaRequired) setError('MFA required - complete MFA challenge first');
      else setError('Login failed');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#0d1117'}}>
      <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:12,padding:40,width:420}}>
        <h1 style={{color:'#58a6ff',marginBottom:4,fontSize:24}}>NexusFlow</h1>
        <p style={{color:'#8b949e',marginBottom:24,fontSize:14}}>AI-Native Enterprise Collaboration Platform</p>
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          <button onClick={() => setMode('login')} style={{flex:1,padding:'8px 0',border:'1px solid '+ (mode==='login'?'#58a6ff':'#30363d'),borderRadius:6,background:mode==='login'?'#1c2129':'transparent',color:mode==='login'?'#58a6ff':'#8b949e',cursor:'pointer'}}>Sign In</button>
          <button onClick={() => setMode('register')} style={{flex:1,padding:'8px 0',border:'1px solid '+ (mode==='register'?'#58a6ff':'#30363d'),borderRadius:6,background:mode==='register'?'#1c2129':'transparent',color:mode==='register'?'#58a6ff':'#8b949e',cursor:'pointer'}}>Register</button>
        </div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{width:'100%',background:'#0d1117',border:'1px solid #30363d',color:'#c9d1d9',padding:'10px 14px',borderRadius:8,fontSize:14,marginBottom:12}} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={{width:'100%',background:'#0d1117',border:'1px solid #30363d',color:'#c9d1d9',padding:'10px 14px',borderRadius:8,fontSize:14,marginBottom:12}} />
        {mode === 'register' && <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name" style={{width:'100%',background:'#0d1117',border:'1px solid #30363d',color:'#c9d1d9',padding:'10px 14px',borderRadius:8,fontSize:14,marginBottom:12}} />}
        {mode === 'login' && <input value={workspaceSlug} onChange={e => setWorkspaceSlug(e.target.value)} placeholder="Workspace Slug" style={{width:'100%',background:'#0d1117',border:'1px solid #30363d',color:'#c9d1d9',padding:'10px 14px',borderRadius:8,fontSize:14,marginBottom:12}} />}
        <button onClick={handleSubmit} disabled={loading} style={{width:'100%',background:'#58a6ff',color:'#fff',border:'none',padding:12,borderRadius:8,fontSize:15,cursor:'pointer',opacity:loading?.7:1}}>{loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
        {error && <p style={{color:'#f85149',fontSize:13,marginTop:12}}>{error}</p>}
      </div>
    </div>
  );
}
