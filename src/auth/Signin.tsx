import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAsyncMutation } from '../builder/hooks/useAsyncMutation';
import { supabase } from '../env/supabase.client';
import { TextField, Button } from '../builder/components/list';
import './index.css';
import '../builder/styles/1-theme/builder-system.css';

interface AuthCredentials {
  email: string;
  password: string;
}

const Signin = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up mutation
  const signUpMutation = useAsyncMutation<string, AuthCredentials>(
    async ({ email, password }) => {
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        throw error;
      }

      return '회원가입이 완료되었습니다. 이메일을 확인해주세요.';
    },
    {
      onSuccess: () => {
        setEmail('');
        setPassword('');
      },
    }
  );

  // Sign In mutation
  const signInMutation = useAsyncMutation<void, AuthCredentials>(
    async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }
    },
    {
      onSuccess: () => {
        navigate('/dashboard');
      },
    }
  );

  const loading = signUpMutation.isLoading || signInMutation.isLoading;
  const error = signUpMutation.error || signInMutation.error;
  const message = signUpMutation.data;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const credentials = { email, password };

    try {
      if (isSignUp) {
        await signUpMutation.execute(credentials);
      } else {
        await signInMutation.execute(credentials);
      }
    } catch (err) {
      // 에러는 mutation.error에 자동 저장됨
      console.error('[Signin] Auth failed:', err);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    signUpMutation.reset();
    signInMutation.reset();
    setEmail('');
    setPassword('');
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h1>
          <p className="auth-subtitle">
            {isSignUp ? 'Create a new account' : 'Log in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <TextField
            className="auth-form-field"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            isRequired={true}
            //description="로그인에 사용할 이메일 주소입니다."
            errorMessage={error ? error.message : undefined}
          />

          <TextField
            className="auth-form-field"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            isRequired={true}
            description={isSignUp ? "Enter a secure password with at least 8 characters." : "Enter your account password."}
          />
          {message && (
            <div className="success-message">
              <p className="success-text">
                {message}
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            isDisabled={loading}
            children={loading
              ? (isSignUp ? 'Signing Up...' : 'Signing In...')
              : (isSignUp ? 'Sign Up' : 'Sign In')
            }
          />

          <div className="helper-text">

            <Button
              variant="ghost"
              onClick={toggleMode}
              children={isSignUp ? 'Log In' : 'Sign Up'}
            />
            {!isSignUp ? (
              <Button
                variant="ghost"
                onClick={() => navigate('/forgot-password')}
                children="Forgot Password?"
              />
            ) : null}
          </div>


        </form>


      </div>
    </main>
  );
};

export default Signin;
