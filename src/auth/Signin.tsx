import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../env/supabase.client';
import { TextField, Button } from '../builder/components/list';
import './index.css';

const Signin = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      // 회원가입
      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('회원가입이 완료되었습니다. 이메일을 확인해주세요.');
        setEmail('');
        setPassword('');
      }
    } else {
      // 로그인
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {isSignUp ? '회원가입' : '로그인'}
          </h1>
          <p className="auth-subtitle">
            {isSignUp ? '새 계정을 만들어보세요' : '계정에 로그인하세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field-group">
            <TextField
              label="이메일 주소"
              type="email"
              value={email}
              onChange={setEmail}
              isRequired={true}
              description="로그인에 사용할 이메일 주소입니다."
            />
          </div>

          <div className="form-field-group">
            <TextField
              label="비밀번호"
              type="password"
              value={password}
              onChange={setPassword}
              isRequired={true}
              description={isSignUp ? "8자 이상의 안전한 비밀번호를 입력하세요." : "계정 비밀번호를 입력하세요."}
            />
          </div>

          {error && (
            <div className="error-message">
              <p className="error-text">
                {error}
              </p>
            </div>
          )}

          {message && (
            <div className="success-message">
              <p className="success-text">
                {message}
              </p>
            </div>
          )}

          <Button
            type="submit"
            isDisabled={loading}
            className="primary-button"
          >
            {loading
              ? (isSignUp ? '가입 중...' : '로그인 중...')
              : (isSignUp ? '회원가입' : '로그인')
            }
          </Button>

          <div className="helper-text">
            {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-link"
            >
              {isSignUp ? '로그인하기' : '회원가입하기'}
            </button>
          </div>

          {!isSignUp && (
            <div className="helper-text">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="link-button"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          )}
        </form>


      </div>
    </main>
  );
};

export default Signin;
