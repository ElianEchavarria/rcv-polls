const request = require("supertest");
const app = require("../../app");
const { db, User, Poll, PollOption, Ballot, Ranking } = require("../../database");

describe("Public Polls API Routes", () => {
  let testUser;
  let testPoll;
  let shareLink;

  beforeAll(async () => {
    await db.sync({ force: true });

    // Create test user
    testUser = await User.create({
      username: "testuser",
      passwordHash: User.hashPassword("testpass123"),
    });
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await Ranking.destroy({ where: {} });
    await Ballot.destroy({ where: {} });
    await PollOption.destroy({ where: {} });
    await Poll.destroy({ where: {} });

    // Create published poll
    testPoll = await Poll.create({
      title: "Public Poll",
      description: "Public Description",
      status: "published",
      creatorId: testUser.id,
    });

    // Generate share link
    shareLink = testPoll.generateShareLink();
    await testPoll.save();

    await PollOption.bulkCreate([
      { text: "Option 1", pollId: testPoll.id },
      { text: "Option 2", pollId: testPoll.id },
      { text: "Option 3", pollId: testPoll.id },
    ]);
  });

  describe("GET /api/polls/public/:shareLink", () => {
    test("returns published poll by share link", async () => {
      const response = await request(app)
        .get(`/api/polls/public/${shareLink}`)
        .expect(200);

      expect(response.body.title).toBe("Public Poll");
      expect(response.body.status).toBe("published");
      expect(response.body.options).toBeDefined();
      expect(response.body.options.length).toBe(3);
    });

    test("returns 404 for invalid share link", async () => {
      await request(app)
        .get("/api/polls/public/invalid-link")
        .expect(404);
    });

    test("does not return draft polls", async () => {
      const draftPoll = await Poll.create({
        title: "Draft Poll",
        status: "draft",
        creatorId: testUser.id,
      });
      // Draft polls don't have shareLinks, but if we generate one for testing
      const draftShareLink = draftPoll.generateShareLink();
      await draftPoll.save();

      await request(app)
        .get(`/api/polls/public/${draftShareLink || "invalid"}`)
        .expect(404);
    });

    test("does not return closed polls", async () => {
      await testPoll.update({ status: "closed" });

      await request(app)
        .get(`/api/polls/public/${shareLink}`)
        .expect(404);
    });
  });

  describe("POST /api/polls/public/:shareLink/vote", () => {
    test("submits valid vote", async () => {
      const poll = await Poll.findByPk(testPoll.id, {
        include: [{ model: PollOption, as: "options" }],
      });

      const response = await request(app)
        .post(`/api/polls/public/${shareLink}/vote`)
        .send({
          voterName: "John Doe",
          voterEmail: "john@example.com",
          rankings: [
            { pollOptionId: poll.options[0].id, rank: 1 },
            { pollOptionId: poll.options[1].id, rank: 2 },
            { pollOptionId: poll.options[2].id, rank: 3 },
          ],
        })
        .expect(201);

      expect(response.body.message).toContain("successfully");
      expect(response.body.ballotId).toBeDefined();

      // Verify ballot was created
      const ballot = await Ballot.findByPk(response.body.ballotId, {
        include: [{ model: Ranking, as: "rankings" }],
      });
      expect(ballot).toBeTruthy();
      expect(ballot.voterName).toBe("John Doe");
      expect(ballot.rankings.length).toBe(3);
    });

    test("validates all options are ranked", async () => {
      const poll = await Poll.findByPk(testPoll.id, {
        include: [{ model: PollOption, as: "options" }],
      });

      const response = await request(app)
        .post(`/api/polls/public/${shareLink}/vote`)
        .send({
          rankings: [
            { pollOptionId: poll.options[0].id, rank: 1 },
            { pollOptionId: poll.options[1].id, rank: 2 },
          ],
        })
        .expect(400);

      expect(response.body.error).toContain("All options must be ranked");
    });

    test("validates rankings are sequential", async () => {
      const poll = await Poll.findByPk(testPoll.id, {
        include: [{ model: PollOption, as: "options" }],
      });

      const response = await request(app)
        .post(`/api/polls/public/${shareLink}/vote`)
        .send({
          rankings: [
            { pollOptionId: poll.options[0].id, rank: 1 },
            { pollOptionId: poll.options[1].id, rank: 3 },
            { pollOptionId: poll.options[2].id, rank: 2 },
          ],
        })
        .expect(400);

      expect(response.body.error).toContain("sequential");
    });

    test("validates each option ranked exactly once", async () => {
      const poll = await Poll.findByPk(testPoll.id, {
        include: [{ model: PollOption, as: "options" }],
      });

      const response = await request(app)
        .post(`/api/polls/public/${shareLink}/vote`)
        .send({
          rankings: [
            { pollOptionId: poll.options[0].id, rank: 1 },
            { pollOptionId: poll.options[0].id, rank: 2 },
            { pollOptionId: poll.options[2].id, rank: 3 },
          ],
        })
        .expect(400);

      expect(response.body.error).toContain("exactly once");
    });

    test("cannot vote on closed poll", async () => {
      await testPoll.update({ status: "closed" });

      const poll = await Poll.findByPk(testPoll.id, {
        include: [{ model: PollOption, as: "options" }],
      });

      await request(app)
        .post(`/api/polls/public/${shareLink}/vote`)
        .send({
          rankings: [
            { pollOptionId: poll.options[0].id, rank: 1 },
            { pollOptionId: poll.options[1].id, rank: 2 },
            { pollOptionId: poll.options[2].id, rank: 3 },
          ],
        })
        .expect(404);
    });

    test("accepts vote without name or email", async () => {
      const poll = await Poll.findByPk(testPoll.id, {
        include: [{ model: PollOption, as: "options" }],
      });

      const response = await request(app)
        .post(`/api/polls/public/${shareLink}/vote`)
        .send({
          rankings: [
            { pollOptionId: poll.options[0].id, rank: 1 },
            { pollOptionId: poll.options[1].id, rank: 2 },
            { pollOptionId: poll.options[2].id, rank: 3 },
          ],
        })
        .expect(201);

      const ballot = await Ballot.findByPk(response.body.ballotId);
      expect(ballot.voterName).toBeNull();
      expect(ballot.voterEmail).toBeNull();
    });
  });
});

