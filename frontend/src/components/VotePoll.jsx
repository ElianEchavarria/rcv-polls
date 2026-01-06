import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./VotePollStyles.css";

const VotePoll = () => {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rankings, setRankings] = useState({});
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPoll();
  }, [shareLink]);

  const fetchPoll = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/polls/public/${shareLink}`);
      setPoll(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching poll:", err);
      setError(err.response?.data?.error || "Poll not found or no longer available");
    } finally {
      setLoading(false);
    }
  };

  const handleRankChange = (optionId, rank) => {
    const newRankings = { ...rankings };

    // Remove the rank from any other option that had it
    Object.keys(newRankings).forEach((id) => {
      if (newRankings[id] === rank && id !== optionId) {
        delete newRankings[id];
      }
    });

    // Set the new rank
    if (rank === "") {
      delete newRankings[optionId];
    } else {
      newRankings[optionId] = parseInt(rank);
    }

    setRankings(newRankings);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate that all options are ranked
    if (!poll || poll.options.length === 0) {
      setError("No options available");
      return;
    }

    const rankedOptions = Object.keys(rankings).length;
    if (rankedOptions < poll.options.length) {
      setError("Please rank all options");
      return;
    }

    // Validate rankings are sequential (1, 2, 3, ...)
    const ranks = Object.values(rankings).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        setError("Rankings must be sequential (1, 2, 3, etc.)");
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      // Convert rankings to array format
      const rankingArray = Object.entries(rankings).map(([pollOptionId, rank]) => ({
        pollOptionId: parseInt(pollOptionId),
        rank,
      }));

      await axios.post(
        `${API_URL}/api/polls/public/${shareLink}/vote`,
        {
          voterName: voterName.trim() || null,
          voterEmail: voterEmail.trim() || null,
          rankings: rankingArray,
        }
      );

      // Show success message and redirect
      alert("Thank you for voting! Your ballot has been submitted.");
      navigate("/");
    } catch (err) {
      console.error("Error submitting vote:", err);
      setError(err.response?.data?.error || "Failed to submit vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="vote-poll">
        <div className="loading">Loading poll...</div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="vote-poll">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  if (poll.status !== "published") {
    return (
      <div className="vote-poll">
        <div className="error">
          {poll.status === "closed"
            ? "This poll has been closed and is no longer accepting votes."
            : "This poll is not yet published."}
        </div>
      </div>
    );
  }

  // Sort options by current ranking
  const sortedOptions = [...poll.options].sort((a, b) => {
    const rankA = rankings[a.id] || 999;
    const rankB = rankings[b.id] || 999;
    return rankA - rankB;
  });

  return (
    <div className="vote-poll">
      <div className="vote-poll-container">
        <h1>{poll.title}</h1>
        {poll.description && <p className="poll-description">{poll.description}</p>}

        <form onSubmit={handleSubmit} className="vote-form">
          {error && <div className="error-message">{error}</div>}

          <div className="voter-info">
            <h2>Your Information (Optional)</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="voterName">Name</label>
                <input
                  type="text"
                  id="voterName"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="Your name (optional)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="voterEmail">Email</label>
                <input
                  type="email"
                  id="voterEmail"
                  value={voterEmail}
                  onChange={(e) => setVoterEmail(e.target.value)}
                  placeholder="Your email (optional)"
                />
              </div>
            </div>
          </div>

          <div className="ranking-section">
            <h2>Rank the Options</h2>
            <p className="help-text">
              Rank all options from 1 (your first choice) to {poll.options.length} (your last choice).
              Each rank can only be used once.
            </p>

            <div className="options-list">
              {sortedOptions.map((option) => (
                <div key={option.id} className="option-item">
                  <div className="option-text">{option.text}</div>
                  <select
                    value={rankings[option.id] || ""}
                    onChange={(e) => handleRankChange(option.id, e.target.value)}
                    className="rank-select"
                    required
                  >
                    <option value="">Select rank...</option>
                    {poll.options.map((_, index) => (
                      <option
                        key={index + 1}
                        value={index + 1}
                        disabled={
                          rankings[option.id] !== index + 1 &&
                          Object.values(rankings).includes(index + 1)
                        }
                      >
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Vote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VotePoll;

