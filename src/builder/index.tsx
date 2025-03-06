//import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Builder() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Error logging out');
    } else {
      alert('Logged out successfully');
      navigate('/');
    }
  };

  return (
    <div>
      <div>
        <main>main</main>
        <aside>sidebar</aside>
        <aside>inspector</aside>
        <nav>header</nav>
        <footer>footer</footer>
        <h1>Welcome to the Builder Page</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}

export default Builder;
