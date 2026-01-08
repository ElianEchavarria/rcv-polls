/**
 * Instant Runoff Voting (IRV) Algorithm Implementation
 * 
 * This algorithm:
 * 1. Counts first-choice votes for each candidate
 * 2. If a candidate has a majority (>50%), they win
 * 3. Otherwise, eliminates the candidate with the fewest votes
 * 4. Redistributes votes to the next choice
 * 5. Repeats until a winner is found
 */

/**
 * Calculate Instant Runoff Voting results
 * @param {Array} options - Array of poll options with id and text
 * @param {Array} ballots - Array of ballots, each with rankings array
 * @returns {Object} Results object with rounds and winner
 */
function calculateIRV(options, ballots) {
  if (!options || options.length === 0) {
    return {
      error: "No options available",
      rounds: [],
      winner: null,
    };
  }

  if (!ballots || ballots.length === 0) {
    return {
      error: "No ballots available",
      rounds: [],
      winner: null,
    };
  }

  const rounds = [];
  let remainingOptions = options.map((opt) => ({
    id: opt.id,
    text: opt.text,
  }));

  // Normalize ballots - ensure rankings are sorted and valid
  const normalizedBallots = ballots.map((ballot) => {
    // Sort rankings by rank (1, 2, 3, ...)
    const sortedRankings = [...ballot.rankings].sort((a, b) => a.rank - b.rank);
    return {
      id: ballot.id,
      rankings: sortedRankings.map((r) => ({
        pollOptionId: r.pollOption?.id || r.pollOptionId,
        rank: r.rank,
      })),
    };
  });

  const totalVotes = normalizedBallots.length;
  const majorityThreshold = Math.floor(totalVotes / 2) + 1;

  // Continue until we have a winner or one option remains
  while (remainingOptions.length > 1) {
    // Count first-choice votes for remaining options
    const voteCounts = {};
    remainingOptions.forEach((option) => {
      voteCounts[option.id] = 0;
    });

    // Count votes for each remaining option
    normalizedBallots.forEach((ballot) => {
      // Find the highest-ranked option that's still in the race
      for (const ranking of ballot.rankings) {
        if (remainingOptions.some((opt) => opt.id === ranking.pollOptionId)) {
          voteCounts[ranking.pollOptionId]++;
          break; // Count only the first valid choice
        }
      }
    });

    // Calculate percentages
    const percentages = {};
    remainingOptions.forEach((option) => {
      percentages[option.id] =
        totalVotes > 0 ? (voteCounts[option.id] / totalVotes) * 100 : 0;
    });

    // Check for majority winner (only matters with 3+ options)
    const majorityWinner = remainingOptions.length > 2
      ? remainingOptions.find((opt) => voteCounts[opt.id] >= majorityThreshold)
      : null;

    if (majorityWinner) {
      // We have a majority winner!
      rounds.push({
        round: rounds.length + 1,
        voteCounts: { ...voteCounts },
        percentages: { ...percentages },
        eliminated: null,
        remaining: remainingOptions.map((opt) => opt.id),
        majorityWinner: majorityWinner.id,
      });

      return {
        rounds,
        winner: majorityWinner,
        totalVotes,
        majorityThreshold,
      };
    }

    // If only 2 options remain, the one with fewer votes loses
    if (remainingOptions.length === 2) {
      const voteValues = Object.values(voteCounts);
      const minVotes = Math.min(...voteValues);

      // Check for tie with 2 options
      if (voteValues[0] === voteValues[1]) {
        rounds.push({
          round: rounds.length + 1,
          voteCounts: { ...voteCounts },
          percentages: { ...percentages },
          eliminated: null,
          remaining: remainingOptions.map((opt) => opt.id),
          tie: true,
        });

        return {
          rounds,
          winner: null,
          tie: true,
          tiedOptions: remainingOptions,
          totalVotes,
          majorityThreshold,
        };
      }

      // One option has fewer votes, eliminate it
      const eliminatedOption = remainingOptions.find(
        (opt) => voteCounts[opt.id] === minVotes
      );

      rounds.push({
        round: rounds.length + 1,
        voteCounts: { ...voteCounts },
        percentages: { ...percentages },
        eliminated: eliminatedOption,
        remaining: remainingOptions.map((opt) => opt.id),
      });

      // Return the winner (the other option)
      const winner = remainingOptions.find(
        (opt) => opt.id !== eliminatedOption.id
      );

      return {
        rounds,
        winner,
        totalVotes,
        majorityThreshold,
      };
    }

    // Find the option(s) with the fewest votes
    const voteValues = Object.values(voteCounts);
    const minVotes = Math.min(...voteValues);

    // Find all options with minimum votes
    const minVoteOptions = remainingOptions.filter(
      (opt) => voteCounts[opt.id] === minVotes
    );

    // Handle complete ties - if all remaining options have the same votes
    const allSame = voteValues.every((count) => count === minVotes);
    if (allSame && remainingOptions.length > 2) {
      // For a complete tie with 3+ candidates, eliminate the one with lowest ID (tie-breaking)
      const optionToEliminate = minVoteOptions.reduce((lowest, current) =>
        current.id < lowest.id ? current : lowest
      );

      rounds.push({
        round: rounds.length + 1,
        voteCounts: { ...voteCounts },
        percentages: { ...percentages },
        eliminated: optionToEliminate,
        remaining: remainingOptions.map((opt) => opt.id),
      });

      // Remove eliminated option
      remainingOptions = remainingOptions.filter(
        (opt) => opt.id !== optionToEliminate.id
      );

      continue; // Go to next round
    }

    // If only 2 options and they have equal votes, it's a tie
    if (remainingOptions.length === 2 && allSame) {
      rounds.push({
        round: rounds.length + 1,
        voteCounts: { ...voteCounts },
        percentages: { ...percentages },
        eliminated: null,
        remaining: remainingOptions.map((opt) => opt.id),
        tie: true,
      });

      return {
        rounds,
        winner: null,
        tie: true,
        tiedOptions: remainingOptions,
        totalVotes,
        majorityThreshold,
      };
    }

    // If multiple options tied for last place, eliminate all of them
    const eliminatedOptions = minVoteOptions.length > 1 ? minVoteOptions : [minVoteOptions[0]];

    // Store round data
    rounds.push({
      round: rounds.length + 1,
      voteCounts: { ...voteCounts },
      percentages: { ...percentages },
      eliminated: eliminatedOptions.length === 1 ? eliminatedOptions[0] : null,
      eliminatedMultiple: eliminatedOptions.length > 1 ? eliminatedOptions : undefined,
      remaining: remainingOptions.map((opt) => opt.id),
    });

    // Remove eliminated option(s)
    const eliminatedIds = eliminatedOptions.map((opt) => opt.id);
    remainingOptions = remainingOptions.filter(
      (opt) => !eliminatedIds.includes(opt.id)
    );

    // If no options remain, it's an error
    if (remainingOptions.length === 0) {
      return {
        rounds,
        winner: null,
        error: "All options eliminated - no winner",
        totalVotes,
        majorityThreshold,
      };
    }
  }

  // Final winner (last remaining option)
  const winner = remainingOptions[0];

  return {
    rounds,
    winner,
    totalVotes,
    majorityThreshold,
  };
}

module.exports = {
  calculateIRV,
};

