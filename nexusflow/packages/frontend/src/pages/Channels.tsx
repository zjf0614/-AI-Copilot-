import { useState, useEffect } from 'react';

const API = '/api/v1/workspaces/demo';

export default function Channels() {
  const [channels, setChannels] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API + '/channels', { headers: authHeader() })
      .then(r => r.json()).then(d => { if(d.data) setChannels(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectChannel = async (id: string) => {
    setSelected(id);
    try {
      const r = await fetch(API + `/channels/${id}/messages?limit=30`, { headers: authHeader() });
      const d = await r.json();
      setMessages(d.data || []);
    } catch { setMessages([]); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected) return;
    try {
      await fetch(API + `/channels/${selected}/messages`, {
        method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageType: 'TEXT', content: { text: newMsg } })
      });
      setNewMsg('');
      selectChannel(selected);
    } catch {}
  };

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#8b949e'}}>Loading...</div>;

  return (
    <div style={{display:'flex',gap:16,height:'calc(100vh - 80px)'}}>
      <div style={{width:260,background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:12,overflow:'auto'}}>
        <h3 style={{fontSize:14,marginBottom:12}}>Channels</h3>
        <button onClick={async () => {
          const name = prompt('Channel name:');
          if(name) { await fetch(API+'/channels',{method:'POST',headers:{...authHeader(),'Content-Type':'application/json'},body:JSON.stringify({name,channelType:'PUBLIC'})}); window.location.reload(); }
        }} style={{width:'100%',background:'#58a6ff',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:12,marginBottom:12}}>+ New Channel</button>
        {channels.length === 0 && <p style={{color:'#8b949e',fontSize:12}}>No channels yet. Create one!</p>}
        {channels.map(c => (
          <div key={c.id} onClick={() => selectChannel(c.id)}
            style={{padding:'8px 12px',borderRadius:6,cursor:'pointer',marginBottom:4,background:selected===c.id?'#1c2129':'transparent',fontSize:13,color:selected===c.id?'#58a6ff':'#c9d1d9'}}>
            # {c.name} <span style={{color:'#8b949e',fontSize:11,float:'right'}}>{c._count?.members||0}</span>
          </div>
        ))}
      </div>
      <div style={{flex:1,background:'#161b22',border:'1px solid #30363d',borderRadius:8,display:'flex',flexDirection:'column'}}>
        {selected ? (
          <>
            <div style={{flex:1,padding:16,overflow:'auto',display:'flex',flexDirection:'column',gap:8}}>
              {messages.length === 0 && <p style={{color:'#8b949e',textAlign:'center',padding:40}}>No messages yet</p>}
              {messages.map(m => (
                <div key={m.id} style={{padding:'8px 12px',borderRadius:6,background:'#0d1117'}}>
                  <span style={{fontSize:12,fontWeight:600,color:'#58a6ff'}}>{m.user?.displayName||'User'}</span>
                  <span style={{fontSize:11,color:'#8b949e',marginLeft:8}}>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  <p style={{fontSize:13,marginTop:4}}>{(m.content as any)?.text||JSON.stringify(m.content)}</p>
                </div>
              ))}
            </div>
            <div style={{padding:12,borderTop:'1px solid #30363d',display:'flex',gap:8}}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key==='Enter'&&sendMessage()}
                placeholder="Type a message..." style={{flex:1,background:'#0d1117',border:'1px solid #30363d',color:'#c9d1d9',padding:'8px 12px',borderRadius:6,fontSize:13}} />
              <button onClick={sendMessage} style={{background:'#58a6ff',color:'#fff',border:'none',padding:'8px 16px',borderRadius:6,cursor:'pointer'}}>Send</button>
            </div>
          </>
        ) : <p style={{color:'#8b949e',textAlign:'center',padding:60}}>Select a channel to start chatting</p>}
      </div>
    </div>
  );
}

function authHeader() { const t = localStorage.getItem('nf_token'); return t ? { Authorization: `Bearer ${t}` } : {}; }
