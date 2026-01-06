import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./PollListStyles.css";

const PollList = ({ user }) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPolls();
    }
  }, [user]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/polls`, {
        withCredentials: true,
      });
      setPolls(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching polls:", err);
      setError("Failed to load polls. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: "status-draft",
      published: "status-published",
      closed: "status-closed",
    };
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  if (!user) {
    return (
      <div className="poll-list">
        <div className="auth-required">
          <h2>Please log in to view your polls</h2>
          <Link to="/login" className="btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="poll-list">
        <div className="loading">Loading polls...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="poll-list">
        <div className="error">{error}</div>
        <button onClick={fetchPolls} className="btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="poll-list">
      <div className="poll-list-header">
        <h1>My Polls</h1>
        <Link to="/polls/create" className="btn-primary">
          Create New Poll
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any polls yet.</p>
          <Link to="/polls/create" className="btn-primary">
            Create Your First Poll
          </Link>
        </div>
      ) : (
        <div className="polls-grid">
          {polls.map((poll) => (
            <div key={poll.id} className="poll-card">
              <div className="poll-card-header">
                <h3>{poll.title}</h3>
                {getStatusBadge(poll.status)}
              </div>
              {poll.description && <p className="poll-description">{poll.description}</p>}
              <div className="poll-card-info">
                <span className="info-item">
                  <strong>{poll.options?.length || 0}</strong> options
                </span>
                <span className="info-item">
                  <strong>{poll.ballotCount || 0}</strong> votes
                </span>
              </div>
              <div className="poll-card-actions">
                <Link to={`/polls/${poll.id}`} className="btn-secondary">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PollList;

