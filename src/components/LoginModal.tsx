'use client';

import React, { useState } from 'react';
import { Lock, User, KeyRound, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin-hhc');
  const [password, setPassword] = useState('humanhcc123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mbg login-overlay">
      <div className="modal login-modal">
        <div className="login-header">
          <div className="login-logo-wrap">
            <img src="/logo.png" alt="HHC Logo" className="login-logo" />
          </div>
          <h2>Human Healthcare (HHC)</h2>
          <p>Internal Admin Portal Access</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-username">
              <User size={14} /> Username
            </label>
            <div className="login-input-wrap">
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (admin-hhc)"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">
              <KeyRound size={14} /> Password
            </label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-login-submit" disabled={loading}>
            {loading ? (
              'Authenticating…'
            ) : (
              <>
                <LogIn size={15} /> Sign In to System
              </>
            )}
          </button>

          <div className="login-footer-note">
            <ShieldCheck size={13} />
            <span>Authorized HHC Admin Staff Only</span>
          </div>
        </form>
      </div>
    </div>
  );
};
