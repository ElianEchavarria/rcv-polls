import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import PollResults from "../PollResults";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

describe("PollResults", () => {
  const mockNavigate = jest.fn();
  const mockUser = { id: 1, username: "testuser" };
  const mockPollId = "123";

  const mockPoll = {
    id: 123,
    title: "Test Poll",
    description: "Test Description",
    status: "closed",
    options: [
      { id: 1, text: "Option A" },
      { id: 2, text: "Option B" },
      { id: 3, text: "Option C" },
    ],
    ballotCount: 10,
  };

  const mockResults = {
    totalVotes: 10,
    majorityThreshold: 6,
    winner: { id: 1, text: "Option A" },
    rounds: [
      {
        round: 1,
        voteCounts: { 1: 3, 2: 4, 3: 3 },
        percentages: { 1: 30, 2: 40, 3: 30 },
        eliminated: { id: 3 },
        remaining: [1, 2],
      },
      {
        round: 2,
        voteCounts: { 1: 6, 2: 4 },
        percentages: { 1: 60, 2: 40 },
        eliminated: { id: 2 },
        remaining: [1],
        majorityWinner: 1,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ id: mockPollId });
    useNavigate.mockReturnValue(mockNavigate);
  });

  test("requires authentication", () => {
    render(
      <BrowserRouter>
        <PollResults user={null} />
      </BrowserRouter>
    );

    expect(screen.getByText(/please log in/i)).toBeInTheDocument();
  });

  test("displays loading state", () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    expect(screen.getByText(/loading results/i)).toBeInTheDocument();
  });

  test("displays poll results", async () => {
    axios.get.mockResolvedValue({
      data: {
        poll: mockPoll,
        results: mockResults,
      },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/poll results: test poll/i)).toBeInTheDocument();
    });

    expect(screen.getByText("10")).toBeInTheDocument(); // Total votes
    expect(screen.getByText(/total votes/i)).toBeInTheDocument();
    expect(screen.getByText(/majority needed/i)).toBeInTheDocument();
  });

  test("displays winner", async () => {
    axios.get.mockResolvedValue({
      data: {
        poll: mockPoll,
        results: mockResults,
      },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/winner/i)).toBeInTheDocument();
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText(/instant runoff voting/i)).toBeInTheDocument();
    });
  });

  test("displays voting rounds", async () => {
    axios.get.mockResolvedValue({
      data: {
        poll: mockPoll,
        results: mockResults,
      },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/voting rounds/i)).toBeInTheDocument();
      expect(screen.getByText(/round 1/i)).toBeInTheDocument();
      expect(screen.getByText(/round 2/i)).toBeInTheDocument();
    });

    // Check round data
    expect(screen.getByText(/3 votes/i)).toBeInTheDocument();
    expect(screen.getByText(/4 votes/i)).toBeInTheDocument();
    expect(screen.getByText(/6 votes/i)).toBeInTheDocument();
  });

  test("displays eliminated candidates", async () => {
    axios.get.mockResolvedValue({
      data: {
        poll: mockPoll,
        results: mockResults,
      },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/eliminated:/i)).toBeInTheDocument();
      expect(screen.getByText(/option c/i)).toBeInTheDocument();
    });
  });

  test("displays no votes message", async () => {
    axios.get.mockResolvedValue({
      data: {
        poll: { ...mockPoll, ballotCount: 0 },
        results: {
          totalVotes: 0,
          winner: null,
          rounds: [],
        },
      },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no votes have been cast/i)).toBeInTheDocument();
    });
  });

  test("displays tie result", async () => {
    const tieResults = {
      totalVotes: 4,
      majorityThreshold: 3,
      winner: null,
      tie: true,
      tiedOptions: [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ],
      rounds: [
        {
          round: 1,
          voteCounts: { 1: 2, 2: 2 },
          percentages: { 1: 50, 2: 50 },
          remaining: [1, 2],
          tie: true,
        },
      ],
    };

    axios.get.mockResolvedValue({
      data: {
        poll: mockPoll,
        results: tieResults,
      },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/tie result/i)).toBeInTheDocument();
      expect(screen.getByText(/no clear winner/i)).toBeInTheDocument();
    });
  });

  test("displays error message", async () => {
    axios.get.mockRejectedValue({
      response: { data: { error: "Poll not found" } },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/poll not found/i)).toBeInTheDocument();
    });
  });

  test("navigates back to poll", async () => {
    axios.get.mockResolvedValue({
      data: {
        poll: mockPoll,
        results: mockResults,
      },
    });

    render(
      <BrowserRouter>
        <PollResults user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("← Back to Poll")).toBeInTheDocument();
    });

    const backButton = screen.getByText("← Back to Poll");
    backButton.click();

    expect(mockNavigate).toHaveBeenCalledWith(`/polls/${mockPollId}`);
  });
});

