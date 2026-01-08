import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./DiscoverPollsStyles.css";
import { API_URL } from "../shared";

const DiscoverPolls = () => {
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPublicPolls();
    }, []);

    const fetchPublicPolls = async () => {
        try {
            setLoading(true);
            setError(null);
            // Fetch publicly published polls from the public endpoint
            const response = await axios.get(`${API_URL}/api/polls/public`);
            // Filter for published polls with share links
            const publishedPolls = response.data.filter(
                (poll) => poll.status === "published" && poll.shareLink
            );
            setPolls(publishedPolls);
        } catch (err) {
            console.error("Error fetching public polls:", err);
            setError("Failed to load polls. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVote = (shareLink) => {
        navigate(`/vote/${shareLink}`);
    };

    return (
        <div className="discover-polls">
            <div className="discover-polls-container">
                <h1>Discover Polls</h1>
                <p className="subtitle">Vote on published polls using instant runoff voting</p>

                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>Loading polls...</p>
                    </div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : polls.length === 0 ? (
                    <div className="no-polls">
                        <p>No published polls available yet.</p>
                        <p>Check back soon or create your own poll!</p>
                    </div>
                ) : (
                    <div className="polls-grid">
                        {polls.map((poll) => (
                            <div key={poll.id} className="poll-card">
                                <div className="poll-card-header">
                                    <h3>{poll.title}</h3>
                                    <span className="status-badge status-published">
                                        published
                                    </span>
                                </div>

                                <p className="poll-description">{poll.description || "No description"}</p>

                                <div className="poll-card-info">
                                    <span className="info-item">
                                        <strong>{poll.options?.length || 0}</strong> options
                                    </span>
                                    <span className="info-item">
                                        <strong>{poll.ballots?.length || 0}</strong> votes
                                    </span>
                                </div>

                                <div className="poll-card-actions">
                                    <button
                                        onClick={() => handleVote(poll.shareLink)}
                                        className="btn-primary"
                                    >
                                        Vote Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiscoverPolls;
