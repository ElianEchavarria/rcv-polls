import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./PollResultsStyles.css";

const PollResults = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPollAndResults();
    }
  }, [user, id]);

  const fetchPollAndResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/polls/${id}/results`, {
        withCredentials: true,
      });
      setPoll(response.data.poll);
      setResults(response.data.results);
      setError(null);
    } catch (err) {
      console.error("Error fetching poll results:", err);
      setError(err.response?.data?.error || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="poll-results">
        <div className="auth-required">
          <h2>Please log in to view poll results</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="poll-results">
        <div className="loading">Loading results...</div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="poll-results">
        <div className="error">{error || "Poll not found"}</div>
        <button onClick={() => navigate("/")} className="btn-secondary">
          Back to Polls
        </button>
      </div>
    );
  }

  const hasVotes = poll && results && results.totalVotes > 0;

  return (
    <div className="poll-results">
      <div className="poll-results-container">
        <div className="results-header">
          <button onClick={() => navigate(`/polls/${id}`)} className="btn-back">
            ← Back to Poll
          </button>
          <h1>Poll Results: {poll.title}</h1>
        </div>

        {!hasVotes ? (
          <div className="no-votes">
            <p>No votes have been cast yet.</p>
          </div>
        ) : results.error ? (
          <div className="error">
            <p>{results.error}</p>
          </div>
        ) : (
          <>
            <div className="results-summary">
              <div className="summary-item">
                <strong>{results.totalVotes}</strong>
                <span>Total Votes</span>
              </div>
              <div className="summary-item">
                <strong>{poll.options.length}</strong>
                <span>Options</span>
              </div>
              <div className="summary-item">
                <strong>{results.majorityThreshold}</strong>
                <span>Majority Needed</span>
              </div>
            </div>

            {results.tie ? (
              <div className="winner-section">
                <h2>Tie Result</h2>
                <div className="winner-card">
                  <div className="winner-name">No Clear Winner</div>
                  <div className="winner-label">
                    The following options are tied:
                  </div>
                  <ul style={{ marginTop: "20px", textAlign: "left", display: "inline-block" }}>
                    {results.tiedOptions.map((opt) => (
                      <li key={opt.id} style={{ margin: "10px 0", fontSize: "1.2rem" }}>
                        {opt.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : results.winner ? (
              <>
                <div className="winner-section">
                  <h2>Winner</h2>
                  <div className="winner-card">
                    <div className="winner-name">
                      {poll.options.find((opt) => opt.id === results.winner.id)?.text}
                    </div>
                    <div className="winner-label">
                      Selected by Instant Runoff Voting
                      {results.rounds.some((r) => r.majorityWinner) && " (Majority Winner)"}
                    </div>
                  </div>
                </div>

                <div className="rounds-section">
                  <h2>Voting Rounds</h2>
                  {results.rounds.map((round) => (
                    <div key={round.round} className="round-card">
                      <h3>Round {round.round}</h3>
                      {round.majorityWinner && (
                        <div
                          style={{
                            background: "rgba(46, 125, 50, 0.1)",
                            padding: "10px",
                            borderRadius: "8px",
                            marginBottom: "15px",
                            color: "#2e7d32",
                            fontWeight: 600,
                          }}
                        >
                          ✓ Majority achieved in this round!
                        </div>
                      )}
                      <div className="round-results">
                        {poll.options
                          .filter((opt) => round.remaining.includes(opt.id))
                          .sort((a, b) => round.voteCounts[b.id] - round.voteCounts[a.id])
                          .map((option) => (
                            <div key={option.id} className="result-item">
                              <div className="result-option">{option.text}</div>
                              <div className="result-stats">
                                <span className="vote-count">
                                  {round.voteCounts[option.id]} votes
                                </span>
                                <span className="vote-percentage">
                                  {round.percentages[option.id].toFixed(1)}%
                                </span>
                              </div>
                              <div className="vote-bar-container">
                                <div
                                  className="vote-bar"
                                  style={{
                                    width: `${round.percentages[option.id]}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                      {round.eliminated && (
                        <div className="eliminated">
                          <strong>Eliminated:</strong>{" "}
                          {poll.options.find((opt) => opt.id === round.eliminated.id)?.text}
                        </div>
                      )}
                      {round.eliminatedMultiple && round.eliminatedMultiple.length > 0 && (
                        <div className="eliminated">
                          <strong>Eliminated:</strong>{" "}
                          {round.eliminatedMultiple
                            .map((opt) => poll.options.find((o) => o.id === opt.id)?.text)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="error">
                <p>Unable to determine winner</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PollResults;

