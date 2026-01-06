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
      const [pollResponse, resultsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/polls/${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/polls/${id}/results`, { withCredentials: true }),
      ]);
      setPoll(pollResponse.data);
      setResults(resultsResponse.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching poll results:", err);
      setError(err.response?.data?.error || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  // Calculate instant runoff results
  const calculateResults = () => {
    if (!poll || !poll.ballots || poll.ballots.length === 0) {
      return null;
    }

    const rounds = [];
    let remainingOptions = [...poll.options];
    let ballots = poll.ballots.map((ballot) => ({
      id: ballot.id,
      rankings: ballot.rankings.map((r) => ({
        pollOptionId: r.pollOption.id,
        rank: r.rank,
      })),
    }));

    while (remainingOptions.length > 1) {
      // Count first-choice votes for remaining options
      const voteCounts = {};
      remainingOptions.forEach((option) => {
        voteCounts[option.id] = 0;
      });

      ballots.forEach((ballot) => {
        // Find the highest-ranked option that's still in the race
        const sortedRankings = [...ballot.rankings].sort((a, b) => a.rank - b.rank);
        for (const ranking of sortedRankings) {
          if (remainingOptions.some((opt) => opt.id === ranking.pollOptionId)) {
            voteCounts[ranking.pollOptionId]++;
            break;
          }
        }
      });

      // Find the option with the fewest votes
      const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
      const percentages = {};
      remainingOptions.forEach((option) => {
        percentages[option.id] = totalVotes > 0 ? (voteCounts[option.id] / totalVotes) * 100 : 0;
      });

      const minVotes = Math.min(...Object.values(voteCounts));
      const eliminatedOption = remainingOptions.find((opt) => voteCounts[opt.id] === minVotes);

      rounds.push({
        round: rounds.length + 1,
        voteCounts: { ...voteCounts },
        percentages: { ...percentages },
        eliminated: eliminatedOption,
        remaining: remainingOptions.map((opt) => opt.id),
      });

      // Remove eliminated option
      remainingOptions = remainingOptions.filter((opt) => opt.id !== eliminatedOption.id);
    }

    const winner = remainingOptions[0];
    return { rounds, winner };
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

  const calculatedResults = calculateResults();
  const hasVotes = poll.ballots && poll.ballots.length > 0;

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
        ) : (
          <>
            <div className="results-summary">
              <div className="summary-item">
                <strong>{poll.ballots.length}</strong>
                <span>Total Votes</span>
              </div>
              <div className="summary-item">
                <strong>{poll.options.length}</strong>
                <span>Options</span>
              </div>
            </div>

            {calculatedResults && (
              <>
                <div className="winner-section">
                  <h2>Winner</h2>
                  <div className="winner-card">
                    <div className="winner-name">
                      {poll.options.find((opt) => opt.id === calculatedResults.winner.id)?.text}
                    </div>
                    <div className="winner-label">Selected by Instant Runoff Voting</div>
                  </div>
                </div>

                <div className="rounds-section">
                  <h2>Voting Rounds</h2>
                  {calculatedResults.rounds.map((round, index) => (
                    <div key={round.round} className="round-card">
                      <h3>Round {round.round}</h3>
                      <div className="round-results">
                        {poll.options
                          .filter((opt) => round.remaining.includes(opt.id))
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
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PollResults;

