import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ServicesPage from './pages/Services';
import Channels from './pages/Channels';
import Documents from './pages/Documents';
import Projects from './pages/Projects';
import { getToken, setToken } from './api/client';

function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const location = useLocation();

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#c9d1d9'}}>
      <nav style={{display:'flex',alignItems:'center',gap:24,padding:'12px 24px',background:'#161b22',borderBottom:'1px solid #30363d',fontSize:14}}>
        <Link to="/" style={{color:'#58a6ff',fontWeight:700,fontSize:18,textDecoration:'none'}}>NexusFlow</Link>
        <Link to="/" style={{color:location.pathname==='/'?'#58a6ff':'#c9d1d9',textDecoration:'none'}}>Dashboard</Link>
        <Link to="/channels" style={{color:location.pathname==='/channels'?'#58a6ff':'#c9d1d9',textDecoration:'none'}}>Channels</Link>
        <Link to="/docs" style={{color:location.pathname==='/docs'?'#58a6ff':'#c9d1d9',textDecoration:'none'}}>Docs</Link>
        <Link to="/projects" style={{color:location.pathname==='/projects'?'#58a6ff':'#c9d1d9',textDecoration:'none'}}>Projects</Link>
        <Link to="/services" style={{color:location.pathname==='/services'?'#58a6ff':'#c9d1d9',textDecoration:'none'}}>Services</Link>
        <div style={{flex:1}} />
        <button onClick={() => { setToken(null); setLoggedIn(false); }} style={{background:'#f85149',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer'}}>Logout</button>
      </nav>
      <main style={{maxWidth:1200,margin:'0 auto',padding:24}}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/docs" element={<Documents />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/services" element={<ServicesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function Root() { return <BrowserRouter><App /></BrowserRouter>; }
