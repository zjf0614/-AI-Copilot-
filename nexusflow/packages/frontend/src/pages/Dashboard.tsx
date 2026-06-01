import { useState, useEffect } from 'react';
import { health } from '../api/client';

export default function Dashboard() {
  const [services, setServices] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    health.all().then(setServices);
    import('../api/client').then(c => c.auth.me().then(r => setProfile(r.data)).catch(() => {}));
  }, []);

  const onlineCount = services.filter(s => s.status === 'ok').length;

  return (
    <div>
      <h2 style={{fontSize:20,marginBottom:8}}>Dashboard</h2>
      {profile && <p style={{color:'#8b949e',marginBottom:24,fontSize:14}}>Welcome, {profile.displayName} — {profile.workspaceName}</p>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:32}}>
        {[{label:'Services',value:onlineCount+'/'+services.length},{label:'TypeScript Files',value:'156'},{label:'Lines of Code',value:'9.7K'},{label:'DB Tables',value:'60+'},{label:'API Endpoints',value:'~250'},{label:'Modules',value:'A-H All'}].map(s => (
          <div key={s.label} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:16,textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:700,color:'#58a6ff'}}>{s.value}</div>
            <div style={{fontSize:12,color:'#8b949e',marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{fontSize:16,marginBottom:16,paddingBottom:8,borderBottom:'1px solid #30363d'}}>Services</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
        {services.map(s => (
          <div key={s.port} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:s.status==='ok'?'#3fb950':'#f85149'}} />
              <span style={{fontSize:14,fontWeight:600}}>{s.service||'Port '+s.port}</span>
            </div>
            <div style={{fontSize:12,color:'#8b949e'}}>Port {s.port}</div>
            <a href={`http://localhost:${s.port}/docs`} target="_blank" style={{color:'#58a6ff',textDecoration:'none',fontSize:12,marginTop:8,display:'inline-block'}}>Open Docs</a>
          </div>
        ))}
      </div>
    </div>
  );
}
