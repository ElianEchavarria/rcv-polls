import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CreatePoll from "../CreatePoll";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

describe("CreatePoll", () => {
  const mockNavigate = jest.fn();
  const mockUser = {
    id: 1,
    username: "testuser",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  test("renders create poll form", () => {
    render(
      <BrowserRouter>
        <CreatePoll user={mockUser} />
      </BrowserRouter>
    );

    expect(screen.getByText(/create new poll/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/poll title \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description \(optional\)/i)).toBeInTheDocument();
  });

  test("requires authentication", () => {
    render(
      <BrowserRouter>
        <CreatePoll user={null} />
      </BrowserRouter>
    );

    expect(screen.getByText(/please log in/i)).toBeInTheDocument();
  });

  test("allows adding options", () => {
    render(
      <BrowserRouter>
        <CreatePoll user={mockUser} />
      </BrowserRouter>
    );

    const addButton = screen.getByText(/add option/i);
    fireEvent.click(addButton);

    const inputs = screen.getAllByPlaceholderText(/option \d+/i);
    expect(inputs.length).toBeGreaterThan(2); // Should have more than default 2
  });

  test("allows removing options when more than 2", () => {
    render(
      <BrowserRouter>
        <CreatePoll user={mockUser} />
      </BrowserRouter>
    );

    // Add an option first (start with 2, add 1 = 3 total)
    const addButton = screen.getByText(/\+ add option/i);
    fireEvent.click(addButton);

    // Now we should have remove buttons (3 options = 3 remove buttons)
    const removeButtons = screen.getAllByRole("button", { name: /remove option/i });
    expect(removeButtons.length).toBe(3);

    // Remove one option
    fireEvent.click(removeButtons[0]);
    
    // Should be back to 2 options (minimum)
    const inputs = screen.getAllByPlaceholderText(/option \d+/i);
    expect(inputs.length).toBe(2);
  });

  test("validates required fields", async () => {
    axios.post.mockResolvedValue({ data: { id: 1 } });

    render(
      <BrowserRouter>
        <CreatePoll user={mockUser} />
      </BrowserRouter>
    );

    const submitButton = screen.getByText(/create poll/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/poll title is required/i)).toBeInTheDocument();
    });
  });

  test("validates minimum 2 options", async () => {
    render(
      <BrowserRouter>
        <CreatePoll user={mockUser} />
      </BrowserRouter>
    );

    const titleInput = screen.getByLabelText(/poll title \*/i);
    fireEvent.change(titleInput, { target: { value: "Test Poll" } });

    // Clear one option to leave only one valid option
    const optionInputs = screen.getAllByPlaceholderText(/option \d+/i);
    fireEvent.change(optionInputs[0], { target: { value: "" } });

    const submitButton = screen.getByText(/create poll/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/at least 2 options/i)).toBeInTheDocument();
    });
  });

  test("submits valid poll", async () => {
    const mockResponse = {
      data: {
        id: 1,
        title: "Test Poll",
        options: [
          { id: 1, text: "Option A" },
          { id: 2, text: "Option B" },
        ],
      },
    };
    axios.post.mockResolvedValue(mockResponse);

    render(
      <BrowserRouter>
        <CreatePoll user={mockUser} />
      </BrowserRouter>
    );

    // Fill in form
    fireEvent.change(screen.getByLabelText(/poll title/i), {
      target: { value: "Test Poll" },
    });
    fireEvent.change(screen.getByLabelText(/description \(optional\)/i), {
      target: { value: "Test Description" },
    });

    const optionInputs = screen.getAllByPlaceholderText(/option \d+/i);
    fireEvent.change(optionInputs[0], { target: { value: "Option A" } });
    fireEvent.change(optionInputs[1], { target: { value: "Option B" } });

    // Submit
    const submitButton = screen.getByText(/create poll/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/polls"),
        expect.objectContaining({
          title: "Test Poll",
          description: "Test Description",
          options: ["Option A", "Option B"],
        }),
        expect.any(Object)
      );
      expect(mockNavigate).toHaveBeenCalledWith("/polls/1");
    });
  });

  test("displays error on submission failure", async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: "Failed to create poll" } },
    });

    render(
      <BrowserRouter>
        <CreatePoll user={mockUser} />
      </BrowserRouter>
    );

    // Fill in form
    fireEvent.change(screen.getByLabelText(/poll title/i), {
      target: { value: "Test Poll" },
    });
    const optionInputs = screen.getAllByPlaceholderText(/option \d+/i);
    fireEvent.change(optionInputs[0], { target: { value: "Option A" } });
    fireEvent.change(optionInputs[1], { target: { value: "Option B" } });

    const submitButton = screen.getByText(/create poll/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create poll/i)).toBeInTheDocument();
    });
  });
});

