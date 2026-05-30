import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Edit2, CheckCircle, AlertCircle, Phone } from 'lucide-react';
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

  // Track original values to detect dirty state
  const originalRef = useRef({});

  // Pre-fill form when user object loads
  useEffect(() => {
    if (user) {
      const initial = {
        full_name: user.name || '',
        phone: user.phone || '',   // Reads from profiles.phone via context
        company: user.company || '',
        role: user.role || '',
        linkedin: user.linkedin || ''
      };
      setFormData(initial);
      originalRef.current = initial;
    }
  }, [user?.id]);

  // Whether the user has made any changes vs what's saved
  const isDirty = (
    formData.full_name !== (originalRef.current.full_name || '') ||
    formData.phone !== (originalRef.current.phone || '') ||
    formData.company !== (originalRef.current.company || '') ||
    formData.role !== (originalRef.current.role || '') ||
    formData.linkedin !== (originalRef.current.linkedin || '')
  );

  // Whether the user has any saved details at all
  const hasSavedDetails = !!(
    originalRef.current.phone ||
    originalRef.current.company ||
    originalRef.current.role ||
    originalRef.current.linkedin ||
    originalRef.current.full_name
  );

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty) return; // Nothing changed, don't submit
    
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
      // Update the ref so isDirty becomes false
      originalRef.current = { ...formData };
      setStatus({ type: 'success', message: 'Account details saved successfully!' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: err.message || 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Determine button label:
  // - "Saving..." while in progress
  // - "Save Changes" when form is dirty (user is editing)
  // - "Edit Details" when form matches saved data and details exist
  // - "Save Details" when no details saved yet
  const getButtonLabel = () => {
    if (isSaving) return 'Saving...';
    if (isDirty) return 'Save Changes';
    if (hasSavedDetails) return 'Edit Details';
    return 'Save Details';
  };

  const getButtonIcon = () => {
    if (isDirty || !hasSavedDetails) return <Save size={18} />;
    return <Edit2 size={18} />;
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Account Settings</h1>
          <p>Update your personal details and professional information.</p>
        </div>

        {/* Nudge banner: show when phone is missing */}
        {!formData.phone && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(163, 230, 53, 0.08)', border: '1px solid var(--lime-500)',
            borderRadius: '8px', padding: '0.9rem 1.25rem', marginBottom: '1.5rem'
          }}>
            <Phone size={18} style={{ color: 'var(--lime-500)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Add your phone number</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Get interview alerts and exclusive discount offers directly on WhatsApp.</div>
            </div>
          </div>
        )}

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
              <button 
                type="submit" 
                className={`btn-save ${isDirty ? 'btn-save--dirty' : ''}`}
                disabled={isSaving || (!isDirty && hasSavedDetails)}
              >
                {isSaving ? (
                  <>
                    <span className="spinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    {getButtonIcon()}
                    {getButtonLabel()}
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
