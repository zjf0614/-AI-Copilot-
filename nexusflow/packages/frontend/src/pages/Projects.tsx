import { useState, useEffect } from 'react';

const API = '/api/v1/workspaces/demo';

const STATUS_COLORS: Record<string,string> = {'todo':'#8b949e','in_progress':'#58a6ff','review':'#d29922','done':'#3fb950'};

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [view, setView] = useState<'list'|'kanban'>('kanban');

  useEffect(() => {
    fetch(API + '/projects', { headers: authHeader() })
      .then(r => r.json()).then(d => { if(d.data) setProjects(d.data); })
      .catch(() => {});
  }, []);

  const selectProject = async (id: string) => {
    const r = await fetch(API + `/projects/${id}`, { headers: authHeader() });
    const d = await r.json();
    setSelected(d.data);
    const tr = await fetch(API + `/projects/${id}/tasks?limit=100`, { headers: authHeader() });
    const td = await tr.json();
    setTasks(td.data || []);
  };

  const createTask = async () => {
    const title = prompt('Task title:');
    if (!title || !selected) return;
    await fetch(API + `/projects/${selected.id}/tasks`, { method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selected.id, title }) });
    selectProject(selected.id);
  };

  const moveTask = async (taskId: string, status: string) => {
    await fetch(API + `/projects/${selected.id}/tasks/${taskId}`, { method: 'PATCH', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    selectProject(selected.id);
  };

  const statuses = ['todo','in_progress','review','done'];

  return (
    <div style={{display:'flex',gap:16,height:'calc(100vh - 80px)'}}>
      <div style={{width:260,background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:12,overflow:'auto'}}>
        <h3 style={{fontSize:14,marginBottom:12}}>Projects</h3>
        <button onClick={async () => {
          const name = prompt('Project name:');
          if(name) { await fetch(API+'/projects',{method:'POST',headers:{...authHeader(),'Content-Type':'application/json'},body:JSON.stringify({name})}); window.location.reload(); }
        }} style={{width:'100%',background:'#58a6ff',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:12,marginBottom:12}}>+ New Project</button>
        {projects.map(p => (
          <div key={p.id} onClick={() => selectProject(p.id)}
            style={{padding:'8px 12px',borderRadius:6,cursor:'pointer',marginBottom:4,background:selected?.id===p.id?'#1c2129':'transparent',fontSize:13,color:selected?.id===p.id?'#58a6ff':'#c9d1d9'}}>
            📋 {p.name} <span style={{color:'#8b949e',fontSize:11,float:'right'}}>{p._count?.tasks||0}</span>
          </div>
        ))}
      </div>
      <div style={{flex:1,background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:16,overflow:'auto'}}>
        {selected ? (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 style={{fontSize:16,color:'#58a6ff'}}>{selected.name}</h3>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => setView('list')} style={{background:view==='list'?'#1c2129':'transparent',border:'1px solid #30363d',color:'#c9d1d9',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12}}>List</button>
                <button onClick={() => setView('kanban')} style={{background:view==='kanban'?'#1c2129':'transparent',border:'1px solid #30363d',color:'#c9d1d9',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12}}>Kanban</button>
                <button onClick={createTask} style={{background:'#58a6ff',color:'#fff',border:'none',padding:'4px 16px',borderRadius:6,cursor:'pointer',fontSize:12}}>+ Task</button>
              </div>
            </div>
            {view === 'kanban' ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                {statuses.map(status => (
                  <div key={status} style={{background:'#0d1117',borderRadius:8,padding:12}}>
                    <h4 style={{fontSize:12,textTransform:'uppercase',color:STATUS_COLORS[status]||'#8b949e',marginBottom:8}}>{status.replace('_',' ')} ({tasks.filter(t=>t.status===status).length})</h4>
                    {tasks.filter(t => t.status === status).map(t => (
                      <div key={t.id} style={{background:'#161b22',borderRadius:6,padding:10,marginBottom:6,cursor:'pointer'}} draggable>
                        <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{t.title}</div>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {statuses.filter(s => s !== status).map(s => (
                            <span key={s} onClick={() => moveTask(t.id, s)} style={{fontSize:10,color:STATUS_COLORS[s],cursor:'pointer',padding:'1px 6px',borderRadius:3,background:'#0d1117'}}>→{s}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {tasks.map(t => (
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'#0d1117',borderRadius:6}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLORS[t.status]||'#8b949e'}} />
                    <span style={{flex:1,fontSize:13}}>{t.title}</span>
                    <span style={{fontSize:11,color:'#8b949e'}}>{t.priority}</span>
                    <span style={{fontSize:11,color:'#8b949e'}}>{t.assignee?.displayName||''}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : <p style={{color:'#8b949e',textAlign:'center',padding:60}}>Select a project to view tasks</p>}
      </div>
    </div>
  );
}

function authHeader() { const t = localStorage.getItem('nf_token'); return t ? { Authorization: `Bearer ${t}` } : {}; }
