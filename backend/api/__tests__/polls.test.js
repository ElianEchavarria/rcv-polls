const request = require("supertest");
const app = require("../../app");
const { db, User, Poll, PollOption, Ballot, Ranking } = require("../../database");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

describe("Polls API Routes", () => {
  let authToken;
  let testUser;
  let testPoll;

  beforeAll(async () => {
    await db.sync({ force: true });
    
    // Create test user
    testUser = await User.create({
      username: "testuser",
      passwordHash: User.hashPassword("testpass123"),
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        id: testUser.id,
        username: testUser.username,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up polls before each test
    await Ranking.destroy({ where: {} });
    await Ballot.destroy({ where: {} });
    await PollOption.destroy({ where: {} });
    await Poll.destroy({ where: {} });
  });

  describe("GET /api/polls", () => {
    test("requires authentication", async () => {
      const response = await request(app)
        .get("/api/polls")
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test("returns empty array when user has no polls", async () => {
      const response = await request(app)
        .get("/api/polls")
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test("returns user's polls", async () => {
      // Create test poll
      const poll = await Poll.create({
        title: "Test Poll",
        description: "Test Description",
        status: "draft",
        creatorId: testUser.id,
      });

      await PollOption.bulkCreate([
        { text: "Option 1", pollId: poll.id },
        { text: "Option 2", pollId: poll.id },
      ]);

      const response = await request(app)
        .get("/api/polls")
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe("Test Poll");
      expect(response.body[0].options).toBeDefined();
      expect(response.body[0].ballotCount).toBe(0);
    });

    test("does not return other users' polls", async () => {
      // Create another user
      const otherUser = await User.create({
        username: "otheruser",
        passwordHash: User.hashPassword("testpass123"),
      });

      // Create poll for other user
      await Poll.create({
        title: "Other User's Poll",
        status: "draft",
        creatorId: otherUser.id,
      });

      // Create poll for test user
      await Poll.create({
        title: "My Poll",
        status: "draft",
        creatorId: testUser.id,
      });

      const response = await request(app)
        .get("/api/polls")
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe("My Poll");
    });
  });

  describe("POST /api/polls", () => {
    test("requires authentication", async () => {
      const response = await request(app)
        .post("/api/polls")
        .send({
          title: "Test Poll",
          options: ["Option 1", "Option 2"],
        })
        .expect(401);
    });

    test("creates poll with options", async () => {
      const response = await request(app)
        .post("/api/polls")
        .set("Cookie", [`token=${authToken}`])
        .send({
          title: "New Poll",
          description: "Poll Description",
          options: ["Option A", "Option B", "Option C"],
        })
        .expect(201);

      expect(response.body.title).toBe("New Poll");
      expect(response.body.description).toBe("Poll Description");
      expect(response.body.options).toBeDefined();
      expect(response.body.options.length).toBe(3);
      expect(response.body.status).toBe("draft");
    });

    test("validates minimum 2 options", async () => {
      const response = await request(app)
        .post("/api/polls")
        .set("Cookie", [`token=${authToken}`])
        .send({
          title: "Test Poll",
          options: ["Option 1"],
        })
        .expect(400);

      expect(response.body.error).toContain("at least 2");
    });

    test("validates title is required", async () => {
      const response = await request(app)
        .post("/api/polls")
        .set("Cookie", [`token=${authToken}`])
        .send({
          options: ["Option 1", "Option 2"],
        })
        .expect(400);
    });
  });

  describe("GET /api/polls/:id", () => {
    beforeEach(async () => {
      testPoll = await Poll.create({
        title: "Test Poll",
        description: "Test Description",
        status: "draft",
        creatorId: testUser.id,
      });

      await PollOption.bulkCreate([
        { text: "Option 1", pollId: testPoll.id },
        { text: "Option 2", pollId: testPoll.id },
      ]);
    });

    test("requires authentication", async () => {
      await request(app)
        .get(`/api/polls/${testPoll.id}`)
        .expect(401);
    });

    test("returns poll details", async () => {
      const response = await request(app)
        .get(`/api/polls/${testPoll.id}`)
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body.title).toBe("Test Poll");
      expect(response.body.options).toBeDefined();
      expect(Array.isArray(response.body.options)).toBe(true);
      expect(response.body.options.length).toBe(2);
    });

    test("returns 404 for non-existent poll", async () => {
      await request(app)
        .get("/api/polls/99999")
        .set("Cookie", [`token=${authToken}`])
        .expect(404);
    });

    test("does not return other users' polls", async () => {
      const otherUser = await User.create({
        username: "anotheruser",
        passwordHash: User.hashPassword("testpass123"),
      });

      const otherPoll = await Poll.create({
        title: "Other Poll",
        status: "draft",
        creatorId: otherUser.id,
      });

      await request(app)
        .get(`/api/polls/${otherPoll.id}`)
        .set("Cookie", [`token=${authToken}`])
        .expect(404);
    });
  });

  describe("PUT /api/polls/:id", () => {
    beforeEach(async () => {
      testPoll = await Poll.create({
        title: "Test Poll",
        status: "draft",
        creatorId: testUser.id,
      });
    });

    test("updates poll status", async () => {
      const response = await request(app)
        .put(`/api/polls/${testPoll.id}`)
        .set("Cookie", [`token=${authToken}`])
        .send({
          status: "published",
        })
        .expect(200);

      expect(response.body.status).toBe("published");
      expect(response.body.shareLink).toBeDefined();
    });

    test("generates share link when publishing", async () => {
      const response = await request(app)
        .put(`/api/polls/${testPoll.id}`)
        .set("Cookie", [`token=${authToken}`])
        .send({
          status: "published",
        })
        .expect(200);

      expect(response.body.shareLink).toBeTruthy();
      expect(typeof response.body.shareLink).toBe("string");
    });

    test("cannot update closed poll", async () => {
      await testPoll.update({ status: "closed" });

      const response = await request(app)
        .put(`/api/polls/${testPoll.id}`)
        .set("Cookie", [`token=${authToken}`])
        .send({
          title: "Updated Title",
        })
        .expect(400);

      expect(response.body.error).toContain("closed");
    });
  });

  describe("POST /api/polls/:id/close", () => {
    beforeEach(async () => {
      testPoll = await Poll.create({
        title: "Test Poll",
        status: "published",
        creatorId: testUser.id,
      });
    });

    test("closes published poll", async () => {
      const response = await request(app)
        .post(`/api/polls/${testPoll.id}/close`)
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body.message).toContain("closed");

      // Verify poll is closed
      const updatedPoll = await Poll.findByPk(testPoll.id);
      expect(updatedPoll.status).toBe("closed");
    });

    test("cannot close already closed poll", async () => {
      await testPoll.update({ status: "closed" });

      const response = await request(app)
        .post(`/api/polls/${testPoll.id}/close`)
        .set("Cookie", [`token=${authToken}`])
        .expect(400);

      expect(response.body.error).toContain("already closed");
    });
  });

  describe("GET /api/polls/:id/results", () => {
    beforeEach(async () => {
      testPoll = await Poll.create({
        title: "Test Poll",
        status: "closed",
        creatorId: testUser.id,
      });

      const options = await PollOption.bulkCreate([
        { text: "Option A", pollId: testPoll.id },
        { text: "Option B", pollId: testPoll.id },
      ]);

      // Create ballots
      const ballot1 = await Ballot.create({ pollId: testPoll.id });
      const ballot2 = await Ballot.create({ pollId: testPoll.id });
      const ballot3 = await Ballot.create({ pollId: testPoll.id });

      // Create rankings
      await Ranking.bulkCreate([
        { ballotId: ballot1.id, pollOptionId: options[0].id, rank: 1 },
        { ballotId: ballot1.id, pollOptionId: options[1].id, rank: 2 },
        { ballotId: ballot2.id, pollOptionId: options[0].id, rank: 1 },
        { ballotId: ballot2.id, pollOptionId: options[1].id, rank: 2 },
        { ballotId: ballot3.id, pollOptionId: options[1].id, rank: 1 },
        { ballotId: ballot3.id, pollOptionId: options[0].id, rank: 2 },
      ]);
    });

    test("returns calculated IRV results", async () => {
      const response = await request(app)
        .get(`/api/polls/${testPoll.id}/results`)
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body.poll).toBeDefined();
      expect(response.body.results).toBeDefined();
      expect(response.body.results.winner).toBeDefined();
      expect(response.body.results.rounds).toBeDefined();
      expect(Array.isArray(response.body.results.rounds)).toBe(true);
      expect(response.body.results.totalVotes).toBe(3);
    });
  });
});

