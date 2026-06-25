import { useState } from 'react';
import LoginView from '../components/LoginView';

export default function LoginContainer({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const url = 'http://a656ac224048247fea9c6268aeb2bd00-1393924712.us-east-1.elb.amazonaws.com:8080' + endpoint;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          ...(isRegister ? { role: 'ROLE_CLIENTE' } : {})
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error del servidor');
      }

      const data = await response.json();

      if (isRegister) {
        setSuccess('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
        setError(null);
        setIsRegister(false);
        setUsername('');
        setPassword('');
        return;
      }

      localStorage.setItem('smartlogix_token', data.token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsRegister(!isRegister);
    setError(null);
    setSuccess(null);
    setUsername('');
    setPassword('');
  };

  return (
    <LoginView
      username={username}
      setUsername={setUsername}
      password={password}
      setPassword={setPassword}
      error={error}
      success={success}
      loading={loading}
      onSubmit={handleSubmit}
      isRegister={isRegister}
      onToggle={handleToggle}
    />
  );
}

