import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./CreatePollStyles.css";

const CreatePoll = ({ user }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!title.trim()) {
      setError("Poll title is required");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setError("At least 2 options are required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/api/polls`,
        {
          title: title.trim(),
          description: description.trim() || null,
          options: validOptions,
        },
        {
          withCredentials: true,
        }
      );

      // Navigate to the poll detail page
      navigate(`/polls/${response.data.id}`);
    } catch (err) {
      console.error("Error creating poll:", err);
      setError(err.response?.data?.error || "Failed to create poll. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="create-poll">
        <div className="auth-required">
          <h2>Please log in to create a poll</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="create-poll">
      <div className="create-poll-container">
        <h1>Create New Poll</h1>

        <form onSubmit={handleSubmit} className="poll-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Poll Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter poll title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter poll description"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Poll Options *</label>
            <p className="form-help">Add at least 2 options. Voters will rank these options.</p>
            {options.map((option, index) => (
              <div key={index} className="option-input-group">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required={index < 2}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="btn-remove"
                    aria-label="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addOption} className="btn-add-option">
              + Add Option
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Poll"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePoll;

