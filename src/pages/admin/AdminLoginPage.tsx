import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // No authentication - go straight to the orders dashboard
    navigate('/admin/orders', { replace: true });
  }, [navigate]);

  return null;
}
