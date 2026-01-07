import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import VotePoll from "../VotePoll";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

describe("VotePoll", () => {
  const mockNavigate = jest.fn();
  const mockShareLink = "test-share-link-123";

  const mockPoll = {
    id: 1,
    title: "Test Poll",
    description: "Test Description",
    status: "published",
    options: [
      { id: 1, text: "Option A" },
      { id: 2, text: "Option B" },
      { id: 3, text: "Option C" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ shareLink: mockShareLink });
    useNavigate.mockReturnValue(mockNavigate);
  });

  test("renders loading state initially", () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    expect(screen.getByText(/loading poll/i)).toBeInTheDocument();
  });

  test("displays poll information", async () => {
    axios.get.mockResolvedValue({ data: mockPoll });

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Poll")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
      expect(screen.getByText("Option C")).toBeInTheDocument();
    });
  });

  test("allows ranking options", async () => {
    axios.get.mockResolvedValue({ data: mockPoll });

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Option A")).toBeInTheDocument();
    });

    const selects = screen.getAllByDisplayValue(/select rank/i);
    expect(selects.length).toBe(3);

    // Select ranks
    fireEvent.change(selects[0], { target: { value: "1" } });
    fireEvent.change(selects[1], { target: { value: "2" } });
    fireEvent.change(selects[2], { target: { value: "3" } });

    expect(selects[0].value).toBe("1");
    expect(selects[1].value).toBe("2");
    expect(selects[2].value).toBe("3");
  });

  test("prevents duplicate ranks", async () => {
    axios.get.mockResolvedValue({ data: mockPoll });

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Option A")).toBeInTheDocument();
    });

    const selects = screen.getAllByDisplayValue(/select rank/i);
    fireEvent.change(selects[0], { target: { value: "1" } });
    fireEvent.change(selects[1], { target: { value: "1" } }); // Try to duplicate

    // The second select should be disabled for rank 1
    const option = selects[1].querySelector('option[value="1"]');
    expect(option).toBeDisabled();
  });

  test("validates all options are ranked", async () => {
    axios.get.mockResolvedValue({ data: mockPoll });
    axios.post.mockResolvedValue({ data: { message: "Success" } });

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Option A")).toBeInTheDocument();
    });

    const selects = screen.getAllByDisplayValue(/select rank/i);
    fireEvent.change(selects[0], { target: { value: "1" } });
    // Don't rank all options

    const submitButton = screen.getByText(/submit vote/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/rank all options/i)).toBeInTheDocument();
    });
  });

  test("submits valid vote", async () => {
    axios.get.mockResolvedValue({ data: mockPoll });
    axios.post.mockResolvedValue({ data: { message: "Vote submitted successfully" } });
    window.alert = jest.fn();

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Option A")).toBeInTheDocument();
    });

    // Fill in voter info (optional)
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "John Doe" } });

    // Rank all options
    const selects = screen.getAllByDisplayValue(/select rank/i);
    fireEvent.change(selects[0], { target: { value: "1" } });
    fireEvent.change(selects[1], { target: { value: "2" } });
    fireEvent.change(selects[2], { target: { value: "3" } });

    const submitButton = screen.getByText(/submit vote/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/api/polls/public/${mockShareLink}/vote`),
        expect.objectContaining({
          voterName: "John Doe",
          rankings: expect.arrayContaining([
            expect.objectContaining({ rank: 1 }),
            expect.objectContaining({ rank: 2 }),
            expect.objectContaining({ rank: 3 }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  test("does not allow voting on closed polls", async () => {
    const closedPoll = { ...mockPoll, status: "closed" };
    axios.get.mockResolvedValue({ data: closedPoll });

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no longer accepting votes/i)).toBeInTheDocument();
    });
  });

  test("displays error for invalid poll", async () => {
    axios.get.mockRejectedValue({
      response: { status: 404, data: { error: "Poll not found" } },
    });

    render(
      <BrowserRouter>
        <VotePoll />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/poll not found/i)).toBeInTheDocument();
    });
  });
});

