import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../env/supabase.client';

const Signin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <main>
      <div className='flex flex-col justify-center items-center h-screen'>
      <h2 className='title'>SIGN IN</h2>
      <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? '로딩 중...' : '로그인'}
        </button>
      </form>
      {error && <p>{error}</p>}
      </div>
    </main>
  );
};

export default Signin;
