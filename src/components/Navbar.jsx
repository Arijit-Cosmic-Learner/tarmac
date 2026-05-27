import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, BarChart2, Building2, Library, Play, Menu, X } from 'lucide-react';
import './Navbar.css';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { to: '/track/solutions-engineer', label: 'Question Bank', icon: BookOpen },
  { to: '/mock', label: 'Mock Interview', icon: Play },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/resources', label: 'Resources', icon: Library },
];

export default function Navbar() {
  const { user, isPaid, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to={user ? '/dashboard' : '/'} className="navbar-logo">
          <img src="/tarmac-icon-transparent.svg" alt="Tarmac Logo" className="logo-icon" width="20" height="20" />
          <span>Tar<span className="logo-accent">mac</span></span>
        </Link>

        {user && (
          <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}

        <div className="navbar-right">
          {user ? (
            <div className="user-menu">
              <button className="user-avatar-btn" onClick={() => setDropdownOpen(o => !o)}>
                <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
                <span className={`plan-badge ${isPaid ? 'pro' : 'free'}`}>{isPaid ? 'Pro' : 'Free'}</span>
              </button>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-user-info">
                    <span className="dropdown-name">{user.name}</span>
                    <span className="dropdown-email">{user.email}</span>
                  </div>
                  {!isPaid && (
                    <Link to="/pricing" className="dropdown-upgrade" onClick={() => setDropdownOpen(false)}>
                      ⚡ Upgrade to Pro
                    </Link>
                  )}
                  <button className="dropdown-logout" onClick={handleLogout}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth-btns">
              <Link to="/login" className="btn-ghost-sm">Sign In</Link>
              <Link to="/login?tab=signup" className="btn-lime-sm">Get Started</Link>
            </div>
          )}
          {user && (
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
