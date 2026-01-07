const express = require("express");
const router = express.Router();
const { Poll, PollOption, Ballot, Ranking, User, db } = require("../database");
const { authenticateJWT } = require("../auth");
const { calculateIRV } = require("../utils/irv");

// PUBLIC ROUTES (no authentication required) - Must come before parameterized routes!

// GET /api/polls/public/:shareLink - Get poll by share link (for voting)
router.get("/public/:shareLink", async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: {
        shareLink: req.params.shareLink,
        status: "published",
      },
      include: [
        {
          model: PollOption,
          as: "options",
          attributes: ["id", "text"],
        },
      ],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found or no longer accepting votes" });
    }

    // Sort options by ID
    if (poll.options) {
      poll.options.sort((a, b) => a.id - b.id);
    }

    res.json(poll);
  } catch (error) {
    console.error("Error fetching public poll:", error);
    res.status(500).json({ error: "Failed to fetch poll" });
  }
});

// POST /api/polls/public/:shareLink/vote - Submit a vote (no authentication required)
router.post("/public/:shareLink/vote", async (req, res) => {
  try {
    const { voterName, voterEmail, rankings } = req.body;

    // Find the poll
    const poll = await Poll.findOne({
      where: {
        shareLink: req.params.shareLink,
        status: "published",
      },
      include: [
        {
          model: PollOption,
          as: "options",
        },
      ],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found or no longer accepting votes" });
    }

    // Validate rankings
    if (!rankings || !Array.isArray(rankings) || rankings.length !== poll.options.length) {
      return res.status(400).json({ error: "All options must be ranked" });
    }

    // Validate that each option is ranked exactly once
    const optionIds = poll.options.map((opt) => opt.id);
    const rankedOptionIds = rankings.map((r) => r.pollOptionId);
    const uniqueRankedIds = [...new Set(rankedOptionIds)];

    if (uniqueRankedIds.length !== optionIds.length) {
      return res.status(400).json({ error: "Each option must be ranked exactly once" });
    }

    // Validate that all option IDs are valid
    for (const ranking of rankings) {
      if (!optionIds.includes(ranking.pollOptionId)) {
        return res.status(400).json({ error: "Invalid option ID" });
      }
    }

    // Validate rankings are sequential (1, 2, 3, ...)
    const ranks = rankings.map((r) => r.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        return res.status(400).json({ error: "Rankings must be sequential (1, 2, 3, etc.)" });
      }
    }

    // Create ballot and rankings in a transaction
    const ballot = await db.transaction(async (t) => {
      const newBallot = await Ballot.create(
        {
          pollId: poll.id,
          voterName: voterName?.trim() || null,
          voterEmail: voterEmail?.trim() || null,
        },
        { transaction: t }
      );

      // Create rankings
      await Promise.all(
        rankings.map((ranking) =>
          Ranking.create(
            {
              ballotId: newBallot.id,
              pollOptionId: ranking.pollOptionId,
              rank: ranking.rank,
            },
            { transaction: t }
          )
        )
      );

      return newBallot;
    });

    res.status(201).json({ message: "Vote submitted successfully", ballotId: ballot.id });
  } catch (error) {
    console.error("Error submitting vote:", error);
    res.status(500).json({ error: "Failed to submit vote" });
  }
});

// PROTECTED ROUTES (authentication required)

// GET /api/polls - Get all polls for the authenticated user
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const polls = await Poll.findAll({
      where: { creatorId: req.user.id },
      include: [
        {
          model: PollOption,
          as: "options",
          attributes: ["id", "text"],
        },
        {
          model: Ballot,
          as: "ballots",
          attributes: ["id"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Add ballot count to each poll
    const pollsWithCounts = polls.map((poll) => {
      const pollData = poll.toJSON();
      pollData.ballotCount = pollData.ballots.length;
      delete pollData.ballots;
      return pollData;
    });

    res.json(pollsWithCounts);
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.status(500).json({ error: "Failed to fetch polls" });
  }
});

// GET /api/polls/:id - Get a specific poll by ID (only if user is creator)
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: {
        id: req.params.id,
        creatorId: req.user.id,
      },
      include: [
        {
          model: PollOption,
          as: "options",
          attributes: ["id", "text"],
        },
        {
          model: Ballot,
          as: "ballots",
          include: [
            {
              model: Ranking,
              as: "rankings",
              include: [
                {
                  model: PollOption,
                  as: "pollOption",
                  attributes: ["id", "text"],
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
        },
      ],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    res.json(poll);
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).json({ error: "Failed to fetch poll" });
  }
});

// POST /api/polls - Create a new poll
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { title, description, options } = req.body;

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        error: "Title and at least 2 options are required",
      });
    }

    // Validate options
    const validOptions = options.filter(
      (opt) => opt && typeof opt === "string" && opt.trim().length > 0
    );

    if (validOptions.length < 2) {
      return res.status(400).json({
        error: "At least 2 valid options are required",
      });
    }

    // Create poll with options in a transaction
    const poll = await db.transaction(async (t) => {
      const newPoll = await Poll.create(
        {
          title: title.trim(),
          description: description?.trim() || null,
          status: "draft",
          creatorId: req.user.id,
        },
        { transaction: t }
      );

      // Create poll options
      const pollOptions = await Promise.all(
        validOptions.map((text) =>
          PollOption.create(
            {
              text: text.trim(),
              pollId: newPoll.id,
            },
            { transaction: t }
          )
        )
      );

      return { poll: newPoll, options: pollOptions };
    });

    // Fetch the poll with options
    const pollWithOptions = await Poll.findByPk(poll.poll.id, {
      include: [
        {
          model: PollOption,
          as: "options",
          attributes: ["id", "text"],
        },
      ],
    });

    res.status(201).json(pollWithOptions);
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

// PUT /api/polls/:id - Update a poll (only if user is creator)
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: {
        id: req.params.id,
        creatorId: req.user.id,
      },
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    // Can't update closed polls
    if (poll.status === "closed") {
      return res.status(400).json({ error: "Cannot update a closed poll" });
    }

    const { title, description, status } = req.body;

    if (title) poll.title = title.trim();
    if (description !== undefined) poll.description = description?.trim() || null;
    if (status) {
      if (!["draft", "published", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      poll.status = status;

      // Generate share link when publishing
      if (status === "published" && !poll.shareLink) {
        poll.generateShareLink();
      }
    }

    await poll.save();

    const updatedPoll = await Poll.findByPk(poll.id, {
      include: [
        {
          model: PollOption,
          as: "options",
          attributes: ["id", "text"],
        },
      ],
    });

    res.json(updatedPoll);
  } catch (error) {
    console.error("Error updating poll:", error);
    res.status(500).json({ error: "Failed to update poll" });
  }
});

// POST /api/polls/:id/close - Close a poll
router.post("/:id/close", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: {
        id: req.params.id,
        creatorId: req.user.id,
      },
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    if (poll.status === "closed") {
      return res.status(400).json({ error: "Poll is already closed" });
    }

    poll.status = "closed";
    await poll.save();

    res.json({ message: "Poll closed successfully", poll });
  } catch (error) {
    console.error("Error closing poll:", error);
    res.status(500).json({ error: "Failed to close poll" });
  }
});

// GET /api/polls/:id/results - Get poll results with IRV calculation (only if user is creator)
router.get("/:id/results", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: {
        id: req.params.id,
        creatorId: req.user.id,
      },
      include: [
        {
          model: PollOption,
          as: "options",
          attributes: ["id", "text"],
        },
        {
          model: Ballot,
          as: "ballots",
          include: [
            {
              model: Ranking,
              as: "rankings",
              include: [
                {
                  model: PollOption,
                  as: "pollOption",
                  attributes: ["id", "text"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    // Sort options and rankings for consistent processing
    const sortedOptions = [...poll.options].sort((a, b) => a.id - b.id);
    const sortedBallots = poll.ballots.map((ballot) => ({
      ...ballot.toJSON(),
      rankings: [...ballot.rankings].sort((a, b) => a.rank - b.rank),
    }));

    // Calculate IRV results
    const irvResults = calculateIRV(sortedOptions, sortedBallots);

    // Return poll data with calculated results
    res.json({
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        status: poll.status,
        options: sortedOptions,
        ballotCount: poll.ballots.length,
      },
      results: irvResults,
    });
  } catch (error) {
    console.error("Error fetching poll results:", error);
    res.status(500).json({ error: "Failed to fetch poll results" });
  }
});

module.exports = router;

