const { calculateIRV } = require("../irv");

describe("IRV Algorithm", () => {
  describe("Edge Cases", () => {
    test("returns error when no options provided", () => {
      const result = calculateIRV([], []);
      expect(result.error).toBe("No options available");
      expect(result.winner).toBeNull();
    });

    test("returns error when no ballots provided", () => {
      const options = [{ id: 1, text: "Option 1" }];
      const result = calculateIRV(options, []);
      expect(result.error).toBe("No ballots available");
      expect(result.winner).toBeNull();
    });

    test("returns error when null options provided", () => {
      const result = calculateIRV(null, []);
      expect(result.error).toBe("No options available");
    });
  });

  describe("Simple Cases", () => {
    test("single option wins automatically", () => {
      const options = [{ id: 1, text: "Option 1" }];
      const ballots = [
        {
          id: 1,
          rankings: [{ pollOptionId: 1, rank: 1 }],
        },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.winner.id).toBe(1);
      expect(result.rounds.length).toBe(0);
    });

    test("two options with clear winner", () => {
      const options = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ];
      const ballots = [
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }] },
        { id: 2, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }] },
        { id: 3, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }] },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.winner.id).toBe(1);
      expect(result.totalVotes).toBe(3);
      expect(result.rounds.length).toBe(1);
      expect(result.rounds[0].eliminated.id).toBe(2);
    });
  });

  describe("Majority Winner", () => {
    test("candidate wins with majority in first round", () => {
      const options = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
        { id: 3, text: "Option C" },
      ];
      const ballots = [
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
        { id: 2, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
        { id: 3, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
        { id: 4, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
        { id: 5, rankings: [{ pollOptionId: 3, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 2, rank: 3 }] },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.winner.id).toBe(1);
      expect(result.rounds.length).toBe(1);
      expect(result.rounds[0].majorityWinner).toBe(1);
      expect(result.rounds[0].voteCounts[1]).toBe(3);
      expect(result.majorityThreshold).toBe(3); // floor(5/2) + 1 = 3
    });

    test("calculates majority threshold correctly for even number of votes", () => {
      const options = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ];
      const ballots = [
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }] },
        { id: 2, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }] },
        { id: 3, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }] },
        { id: 4, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }] },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.majorityThreshold).toBe(3); // floor(4/2) + 1 = 3
      expect(result.winner.id).toBe(1);
    });
  });

  describe("Multi-Round Elimination", () => {
    test("eliminates candidate and redistributes votes correctly", () => {
      const options = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
        { id: 3, text: "Option C" },
      ];
      // Round 1: A=2, B=0, C=2 (eliminate B with 0 votes)
      // Round 2: A=3 (gets B's redistributed votes), C=2 (A wins with majority)
      const ballots = [
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 3, rank: 2 }, { pollOptionId: 2, rank: 3 }] },
        { id: 2, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 3, rank: 2 }, { pollOptionId: 2, rank: 3 }] },
        { id: 3, rankings: [{ pollOptionId: 3, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 2, rank: 3 }] },
        { id: 4, rankings: [{ pollOptionId: 3, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 2, rank: 3 }] },
        { id: 5, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.winner.id).toBe(1);
      expect(result.rounds.length).toBe(2);
      expect(result.rounds[0].eliminated.id).toBe(2);
      expect(result.rounds[1].eliminated.id).toBe(3);
    });

    test("handles three-round elimination", () => {
      const options = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
        { id: 3, text: "Option C" },
        { id: 4, text: "Option D" },
      ];
      // Round 1: A=1, B=1, C=1, D=1 (tie, eliminate all but one)
      // Actually, with equal votes, it should eliminate all tied last place
      const ballots = [
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 3, rank: 3 }, { pollOptionId: 4, rank: 4 }] },
        { id: 2, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 3, rank: 3 }, { pollOptionId: 4, rank: 4 }] },
        { id: 3, rankings: [{ pollOptionId: 3, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 2, rank: 3 }, { pollOptionId: 4, rank: 4 }] },
        { id: 4, rankings: [{ pollOptionId: 4, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 2, rank: 3 }, { pollOptionId: 3, rank: 4 }] },
      ];

      const result = calculateIRV(options, ballots);
      // All have 1 vote, so 3 will be eliminated, then 2, then winner between 1 and 4
      expect(result.winner).toBeTruthy();
      expect(result.rounds.length).toBeGreaterThan(0);
    });
  });

  describe("Tie Handling", () => {
    test("detects tie when all candidates have equal votes", () => {
      const options = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ];
      const ballots = [
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }] },
        { id: 2, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }] },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.tie).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.tiedOptions.length).toBe(2);
      expect(result.tiedOptions.map((o) => o.id).sort()).toEqual([1, 2]);
    });

    test("handles multiple candidates tied for last place", () => {
      const options = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
        { id: 3, text: "Option C" },
      ];
      const ballots = [
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
        { id: 2, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
        { id: 3, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 3, rank: 3 }] },
        { id: 4, rankings: [{ pollOptionId: 3, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 2, rank: 3 }] },
      ];

      const result = calculateIRV(options, ballots);
      // Round 1: A=2, B=1, C=1 (B and C tied for elimination)
      expect(result.rounds.length).toBeGreaterThan(0);
      expect(result.rounds[0].eliminatedMultiple).toBeTruthy();
      expect(result.rounds[0].eliminatedMultiple.length).toBe(2);
    });
  });

  describe("Complex Scenarios", () => {
    test("real-world scenario with 5 candidates and 10 voters", () => {
      const options = [
        { id: 1, text: "Alice" },
        { id: 2, text: "Bob" },
        { id: 3, text: "Charlie" },
        { id: 4, text: "Diana" },
        { id: 5, text: "Eve" },
      ];

      // Simulate realistic vote distribution
      const ballots = [
        // 3 votes for Alice first
        { id: 1, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 3, rank: 3 }, { pollOptionId: 4, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        { id: 2, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 3, rank: 2 }, { pollOptionId: 2, rank: 3 }, { pollOptionId: 4, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        { id: 3, rankings: [{ pollOptionId: 1, rank: 1 }, { pollOptionId: 4, rank: 2 }, { pollOptionId: 3, rank: 3 }, { pollOptionId: 2, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        // 2 votes for Bob first
        { id: 4, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 3, rank: 3 }, { pollOptionId: 4, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        { id: 5, rankings: [{ pollOptionId: 2, rank: 1 }, { pollOptionId: 3, rank: 2 }, { pollOptionId: 1, rank: 3 }, { pollOptionId: 4, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        // 2 votes for Charlie first
        { id: 6, rankings: [{ pollOptionId: 3, rank: 1 }, { pollOptionId: 2, rank: 2 }, { pollOptionId: 1, rank: 3 }, { pollOptionId: 4, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        { id: 7, rankings: [{ pollOptionId: 3, rank: 1 }, { pollOptionId: 4, rank: 2 }, { pollOptionId: 2, rank: 3 }, { pollOptionId: 1, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        // 2 votes for Diana first
        { id: 8, rankings: [{ pollOptionId: 4, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 3, rank: 3 }, { pollOptionId: 2, rank: 4 }, { pollOptionId: 5, rank: 5 }] },
        { id: 9, rankings: [{ pollOptionId: 4, rank: 1 }, { pollOptionId: 5, rank: 2 }, { pollOptionId: 1, rank: 3 }, { pollOptionId: 3, rank: 4 }, { pollOptionId: 2, rank: 5 }] },
        // 1 vote for Eve first
        { id: 10, rankings: [{ pollOptionId: 5, rank: 1 }, { pollOptionId: 1, rank: 2 }, { pollOptionId: 4, rank: 3 }, { pollOptionId: 3, rank: 4 }, { pollOptionId: 2, rank: 5 }] },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.totalVotes).toBe(10);
      expect(result.majorityThreshold).toBe(6); // floor(10/2) + 1 = 6
      expect(result.winner).toBeTruthy();
      expect(result.rounds.length).toBeGreaterThan(0);

      // Verify round structure
      result.rounds.forEach((round) => {
        expect(round.round).toBeGreaterThan(0);
        expect(round.voteCounts).toBeDefined();
        expect(round.percentages).toBeDefined();
        expect(round.remaining).toBeDefined();
        expect(Array.isArray(round.remaining)).toBe(true);
      });
    });
  });

  describe("Ballot Normalization", () => {
    test("handles ballots with pollOption object structure", () => {
      const options = [{ id: 1, text: "Option A" }, { id: 2, text: "Option B" }];
      const ballots = [
        {
          id: 1,
          rankings: [
            { pollOption: { id: 1, text: "Option A" }, rank: 1 },
            { pollOption: { id: 2, text: "Option B" }, rank: 2 },
          ],
        },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.winner.id).toBe(1);
    });

    test("handles ballots with unsorted rankings", () => {
      const options = [{ id: 1, text: "Option A" }, { id: 2, text: "Option B" }];
      const ballots = [
        {
          id: 1,
          rankings: [
            { pollOptionId: 2, rank: 2 },
            { pollOptionId: 1, rank: 1 },
          ],
        },
      ];

      const result = calculateIRV(options, ballots);
      expect(result.winner.id).toBe(1);
    });
  });
});

