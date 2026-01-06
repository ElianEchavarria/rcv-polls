import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./PollDetailStyles.css";

const PollDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [closing, setClosing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPoll();
    }
  }, [user, id]);

  const fetchPoll = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/polls/${id}`, {
        withCredentials: true,
      });
      setPoll(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching poll:", err);
      setError(err.response?.data?.error || "Failed to load poll");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const response = await axios.put(
        `${API_URL}/api/polls/${id}`,
        { status: "published" },
        { withCredentials: true }
      );
      setPoll(response.data);
    } catch (err) {
      console.error("Error publishing poll:", err);
      alert(err.response?.data?.error || "Failed to publish poll");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm("Are you sure you want to close this poll? This action cannot be undone.")) {
      return;
    }

    try {
      setClosing(true);
      await axios.post(`${API_URL}/api/polls/${id}/close`, {}, { withCredentials: true });
      await fetchPoll();
    } catch (err) {
      console.error("Error closing poll:", err);
      alert(err.response?.data?.error || "Failed to close poll");
    } finally {
      setClosing(false);
    }
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/vote/${poll.shareLink}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Share link copied to clipboard!");
    });
  };

  if (!user) {
    return (
      <div className="poll-detail">
        <div className="auth-required">
          <h2>Please log in to view poll details</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="poll-detail">
        <div className="loading">Loading poll...</div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="poll-detail">
        <div className="error">{error || "Poll not found"}</div>
        <button onClick={() => navigate("/")} className="btn-secondary">
          Back to Polls
        </button>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/vote/${poll.shareLink}`;

  return (
    <div className="poll-detail">
      <div className="poll-detail-container">
        <div className="poll-detail-header">
          <button onClick={() => navigate("/")} className="btn-back">
            ← Back to Polls
          </button>
          <div className="status-badge-container">
            <span className={`status-badge status-${poll.status}`}>{poll.status}</span>
          </div>
        </div>

        <div className="poll-content">
          <h1>{poll.title}</h1>
          {poll.description && <p className="poll-description">{poll.description}</p>}

          <div className="poll-info-section">
            <h2>Poll Options</h2>
            <ul className="options-list">
              {poll.options?.map((option) => (
                <li key={option.id}>{option.text}</li>
              ))}
            </ul>
          </div>

          <div className="poll-stats">
            <div className="stat-item">
              <strong>{poll.options?.length || 0}</strong>
              <span>Options</span>
            </div>
            <div className="stat-item">
              <strong>{poll.ballots?.length || 0}</strong>
              <span>Votes</span>
            </div>
          </div>

          {poll.status === "published" && (
            <div className="share-section">
              <h2>Share Your Poll</h2>
              <p>Share this link with voters to let them rank the options:</p>
              <div className="share-link-container">
                <input type="text" value={shareUrl} readOnly className="share-link-input" />
                <button onClick={copyShareLink} className="btn-copy">
                  Copy Link
                </button>
              </div>
            </div>
          )}

          {poll.status === "closed" && (
            <div className="results-section">
              <h2>Poll Closed</h2>
              <p>This poll has been closed. View results below.</p>
              <button onClick={() => navigate(`/polls/${id}/results`)} className="btn-primary">
                View Results
              </button>
            </div>
          )}

          <div className="poll-actions">
            {poll.status === "draft" && (
              <button onClick={handlePublish} className="btn-primary" disabled={publishing}>
                {publishing ? "Publishing..." : "Publish Poll"}
              </button>
            )}
            {poll.status === "published" && (
              <button onClick={handleClose} className="btn-danger" disabled={closing}>
                {closing ? "Closing..." : "Close Poll"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollDetail;

