import { useState, useEffect } from 'react';

const API = '/api/v1/workspaces/demo';

export default function Documents() {
  const [docs, setDocs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDocs = () => {
    fetch(API + '/docs', { headers: authHeader() })
      .then(r => r.json()).then(d => { if(d.data) setDocs(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); }, []);

  const createDoc = async () => {
    const title = prompt('Document title:');
    if (!title) return;
    await fetch(API + '/docs', { method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    loadDocs();
  };

  const openDoc = async (id: string) => {
    const r = await fetch(API + `/docs/${id}`, { headers: authHeader() });
    const d = await r.json();
    setSelected(d.data);
    setContent(JSON.stringify(d.data?.blocks||d.data?.content||{}, null, 2));
  };

  const saveDoc = async () => {
    if (!selected) return;
    try {
      const blocks = JSON.parse(content);
      await fetch(API + `/docs/${selected.id}`, { method: 'PATCH', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ blocks, content: { text: content.slice(0,200) } }) });
    } catch {}
  };

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#8b949e'}}>Loading...</div>;

  return (
    <div style={{display:'flex',gap:16,height:'calc(100vh - 80px)'}}>
      <div style={{width:260,background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:12,overflow:'auto'}}>
        <h3 style={{fontSize:14,marginBottom:12}}>Documents</h3>
        <button onClick={createDoc} style={{width:'100%',background:'#58a6ff',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:12,marginBottom:12}}>+ New Document</button>
        {docs.length === 0 && <p style={{color:'#8b949e',fontSize:12}}>No documents yet</p>}
        {docs.map(d => (
          <div key={d.id} onClick={() => openDoc(d.id)}
            style={{padding:'8px 12px',borderRadius:6,cursor:'pointer',marginBottom:4,background:selected?.id===d.id?'#1c2129':'transparent',fontSize:13,color:selected?.id===d.id?'#58a6ff':'#c9d1d9'}}>
            {d.icon||'📄'} {d.title}
          </div>
        ))}
      </div>
      <div style={{flex:1,background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:16,display:'flex',flexDirection:'column'}}>
        {selected ? (
          <>
            <div style={{marginBottom:12}}>
              <input value={selected.title} onChange={e => setSelected({...selected,title:e.target.value})} style={{background:'transparent',border:'none',color:'#58a6ff',fontSize:20,fontWeight:600,width:'100%'}} />
              <span style={{fontSize:11,color:'#8b949e'}}>Updated: {new Date(selected.updatedAt).toLocaleString()}</span>
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              style={{flex:1,background:'#0d1117',border:'1px solid #30363d',color:'#c9d1d9',padding:12,borderRadius:6,fontSize:13,fontFamily:'monospace',resize:'none'}} />
            <div style={{marginTop:12}}>
              <button onClick={saveDoc} style={{background:'#3fb950',color:'#fff',border:'none',padding:'8px 20px',borderRadius:6,cursor:'pointer',marginRight:8}}>Save</button>
              <button onClick={async () => {
                await fetch(API+'/docs/'+selected.id+'/versions',{method:'POST',headers:{...authHeader(),'Content-Type':'application/json'},body:JSON.stringify({blocks:JSON.parse(content),changeLog:'Manual save'})});
              }} style={{background:'#1c2129',color:'#c9d1d9',border:'1px solid #30363d',padding:'8px 20px',borderRadius:6,cursor:'pointer'}}>Save Version</button>
            </div>
          </>
        ) : <p style={{color:'#8b949e',textAlign:'center',padding:60}}>Select a document to start editing</p>}
      </div>
    </div>
  );
}

function authHeader() { const t = localStorage.getItem('nf_token'); return t ? { Authorization: `Bearer ${t}` } : {}; }
