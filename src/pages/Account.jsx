import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import './Account.css';

export default function Account() {
  const { user, updateUserMetadata } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company: '',
    role: '',
    linkedin: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  // Pre-fill form when user object loads
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.name || '',
        phone: user.phone || '',
        company: user.company || '',
        role: user.role || '',
        linkedin: user.linkedin || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setStatus(null); // Clear status when typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      await updateUserMetadata({
        full_name: formData.full_name,
        phone: formData.phone,
        company: formData.company,
        role: formData.role,
        linkedin: formData.linkedin
      });
      setStatus({ type: 'success', message: 'Account settings saved successfully!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Account Settings</h1>
          <p>Update your personal details and professional information.</p>
        </div>

        <div className="account-card">
          <form className="account-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email"
                value={user?.email || ''} 
                disabled 
                title="Email cannot be changed here"
              />
            </div>

            <div className="form-group">
              <label htmlFor="full_name">Display Name</label>
              <input 
                type="text" 
                id="full_name" 
                name="full_name"
                value={formData.full_name} 
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input 
                type="tel" 
                id="phone" 
                name="phone"
                value={formData.phone} 
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="company">Current Company</label>
              <input 
                type="text" 
                id="company" 
                name="company"
                value={formData.company} 
                onChange={handleChange}
                placeholder="Google"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Current Role</label>
              <input 
                type="text" 
                id="role" 
                name="role"
                value={formData.role} 
                onChange={handleChange}
                placeholder="Solutions Engineer"
              />
            </div>

            <div className="form-group">
              <label htmlFor="linkedin">LinkedIn Profile URL</label>
              <input 
                type="url" 
                id="linkedin" 
                name="linkedin"
                value={formData.linkedin} 
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            {status && (
              <div className={`save-status ${status.type}`}>
                {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {status.message}
              </div>
            )}

            <div className="account-actions">
              <button type="submit" className="btn-save" disabled={isSaving}>
                {isSaving ? 'Saving...' : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
