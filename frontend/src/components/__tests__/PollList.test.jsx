import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import PollList from "../PollList";

jest.mock("axios");

describe("PollList", () => {
  const mockUser = {
    id: 1,
    username: "testuser",
  };

  const mockPolls = [
    {
      id: 1,
      title: "Test Poll 1",
      description: "Description 1",
      status: "published",
      options: [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ],
      ballotCount: 5,
    },
    {
      id: 2,
      title: "Test Poll 2",
      status: "draft",
      options: [{ id: 3, text: "Option C" }],
      ballotCount: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state initially", () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <BrowserRouter>
        <PollList user={mockUser} />
      </BrowserRouter>
    );

    expect(screen.getByText(/loading polls/i)).toBeInTheDocument();
  });

  test("displays message when user is not logged in", () => {
    render(
      <BrowserRouter>
        <PollList user={null} />
      </BrowserRouter>
    );

    expect(screen.getByText(/please log in/i)).toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test("displays polls when loaded", async () => {
    axios.get.mockResolvedValue({ data: mockPolls });

    render(
      <BrowserRouter>
        <PollList user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Poll 1")).toBeInTheDocument();
      expect(screen.getByText("Test Poll 2")).toBeInTheDocument();
    });

    expect(screen.getByText("published")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText(/5 votes/i)).toBeInTheDocument();
  });

  test("displays empty state when no polls exist", async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(
      <BrowserRouter>
        <PollList user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/haven't created any polls/i)).toBeInTheDocument();
    });
  });

  test("displays error message on fetch failure", async () => {
    axios.get.mockRejectedValue(new Error("Network error"));

    render(
      <BrowserRouter>
        <PollList user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load polls/i)).toBeInTheDocument();
    });
  });

  test("shows create poll button", async () => {
    axios.get.mockResolvedValue({ data: mockPolls });

    render(
      <BrowserRouter>
        <PollList user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      const createButton = screen.getByText(/create new poll/i);
      expect(createButton).toBeInTheDocument();
      expect(createButton.closest("a")).toHaveAttribute("href", "/polls/create");
    });
  });

  test("displays poll statistics", async () => {
    axios.get.mockResolvedValue({ data: mockPolls });

    render(
      <BrowserRouter>
        <PollList user={mockUser} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/2.*options/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*options/i)).toBeInTheDocument();
    });
  });
});

