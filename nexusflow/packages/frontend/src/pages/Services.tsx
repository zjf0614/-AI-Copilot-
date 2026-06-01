import { useState, useEffect } from 'react';
import { health } from '../api/client';

const DESCRIPTIONS: Record<number, { name: string; module: string; desc: string; endpoints: string[] }> = {
  3000: { name: 'BFF Gateway', module: 'All', desc: 'API Gateway & Dev Console', endpoints: ['/health', '/docs', '/api/v1/*'] },
  3001: { name: 'Auth Service', module: 'A', desc: 'Authentication, MFA, SSO', endpoints: ['POST /register','POST /login','GET /me','POST /mfa/enroll','POST /sso/authorize'] },
  3002: { name: 'Org Service', module: 'A', desc: 'Users, Roles, Departments, Audit', endpoints: ['GET /users','POST /roles','GET /departments/tree','GET /audit-logs'] },
  3003: { name: 'Chat Service', module: 'B', desc: 'Channels, DMs, Search, WebSocket', endpoints: ['POST /channels','POST /messages','GET /search','WS /ws'] },
  3004: { name: 'Doc Service', module: 'C', desc: 'Documents, Versions, Templates', endpoints: ['POST /docs','POST /versions','POST /templates','GET /backlinks'] },
  3005: { name: 'Project Service', module: 'D', desc: 'Projects, Tasks, Sprints, Time', endpoints: ['POST /projects','POST /tasks','POST /sprints','POST /time-entries'] },
  3006: { name: 'Workflow Service', module: 'E', desc: 'Workflow Engine, Executions', endpoints: ['POST /workflows','POST /execute','GET /executions'] },
  3007: { name: 'Notification Service', module: 'G', desc: 'Notifications, Integrations, Webhooks', endpoints: ['GET /notifications','POST /integrations','POST /webhooks'] },
  3008: { name: 'AI Copilot', module: 'F', desc: 'Conversations, Knowledge Bases', endpoints: ['POST /ai/conversations','POST /ai/query','GET /knowledge-bases'] },
  3009: { name: 'Analytics Service', module: 'H', desc: 'Dashboards, OKRs, Event Tracking', endpoints: ['GET /dashboards','POST /okrs','GET /insights'] },
};

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => { health.all().then(setServices); }, []);

  return (
    <div>
      <h2 style={{fontSize:20,marginBottom:16}}>Services</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
        {services.map(s => {
          const info = DESCRIPTIONS[s.port] || { name: 'Unknown', module: '-', desc: '', endpoints: [] };
          const ok = s.status === 'ok';
          return (
            <div key={s.port} style={{background:'#161b22',border:'1px solid '+(ok?'#30363d':'#f85149'),borderRadius:8,padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:8}}>
                <div>
                  <span style={{background:ok?'#1c3a2a':'#3a1c1c',color:ok?'#3fb950':'#f85149',padding:'2px 8px',borderRadius:12,fontSize:11,marginRight:8}}>{ok?'Online':'Offline'}</span>
                  <span style={{background:'#1c2129',color:'#58a6ff',padding:'2px 6px',borderRadius:4,fontSize:11}}>M{info.module}</span>
                </div>
                <span style={{color:'#8b949e',fontSize:12}}>:{s.port}</span>
              </div>
              <h3 style={{fontSize:15,color:ok?'#58a6ff':'#8b949e',marginBottom:4}}>{info.name}</h3>
              <p style={{fontSize:13,color:'#8b949e',marginBottom:12}}>{info.desc}</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {info.endpoints.map(e => (
                  <code key={e} style={{background:'#0d1117',padding:'3px 8px',borderRadius:4,fontSize:11,color:'#c9d1d9'}}>{e}</code>
                ))}
              </div>
              <a href={`http://localhost:${s.port}/docs`} target="_blank" style={{display:'inline-block',marginTop:12,color:'#58a6ff',fontSize:12,textDecoration:'none'}}>Swagger Docs</a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
