import React from "react";
import { Link } from "react-router-dom";
import "./NavBarStyles.css";

const NavBar = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">🗳️ Ranked Choice Voting</Link>
      </div>

      <div className="nav-links">
        {user ? (
          <div className="nav-menu">
            <div className="menu-items">
              <Link to="/" className="nav-link">
                My Polls
              </Link>
              <Link to="/polls/create" className="nav-link">
                Create Poll
              </Link>
              <Link to="/discover" className="nav-link">
                Discover Polls
              </Link>
            </div>
            <div className="user-info">
              <span className="username">{user.username}</span>
              <button onClick={onLogout} className="nav-link btn-logout">
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-links">
            <Link to="/login" className="nav-link">
              Login
            </Link>
            <Link to="/signup" className="nav-link">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
