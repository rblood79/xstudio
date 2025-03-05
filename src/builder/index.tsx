import React from 'react';
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
      <h1>Welcome to the Builder Page</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Builder;
