const db = require("./db");
const { User, Poll, PollOption } = require("./index");

const seed = async () => {
  try {
    db.logging = false;
    await db.sync({ force: true }); // Drop and recreate tables

    const users = await User.bulkCreate([
      { username: "admin", passwordHash: User.hashPassword("admin123") },
      { username: "user1", passwordHash: User.hashPassword("user111") },
      { username: "user2", passwordHash: User.hashPassword("user222") },
    ]);

    console.log(`👤 Created ${users.length} users`);

    // Create polls for admin user
    const adminPoll1 = await Poll.create({
      title: "Best Programming Language 2024",
      description: "Which programming language do you think is the best for web development?",
      status: "published",
      creatorId: users[0].id,
    });
    adminPoll1.generateShareLink();
    await adminPoll1.save();

    await PollOption.bulkCreate([
      { text: "JavaScript", pollId: adminPoll1.id },
      { text: "Python", pollId: adminPoll1.id },
      { text: "TypeScript", pollId: adminPoll1.id },
      { text: "Java", pollId: adminPoll1.id },
      { text: "Go", pollId: adminPoll1.id },
    ]);

    const adminPoll2 = await Poll.create({
      title: "Favorite Framework",
      description: "What's your preferred frontend framework?",
      status: "draft",
      creatorId: users[0].id,
    });

    await PollOption.bulkCreate([
      { text: "React", pollId: adminPoll2.id },
      { text: "Vue", pollId: adminPoll2.id },
      { text: "Angular", pollId: adminPoll2.id },
      { text: "Svelte", pollId: adminPoll2.id },
    ]);

    // Create polls for user1
    const user1Poll1 = await Poll.create({
      title: "Team Lunch Location",
      description: "Where should we go for our team lunch this Friday?",
      status: "published",
      creatorId: users[1].id,
    });
    user1Poll1.generateShareLink();
    await user1Poll1.save();

    await PollOption.bulkCreate([
      { text: "Italian Restaurant", pollId: user1Poll1.id },
      { text: "Mexican Food", pollId: user1Poll1.id },
      { text: "Sushi Place", pollId: user1Poll1.id },
      { text: "BBQ Joint", pollId: user1Poll1.id },
    ]);

    const user1Poll2 = await Poll.create({
      title: "Project Deadline",
      description: "When should we schedule the project deadline?",
      status: "published",
      creatorId: users[1].id,
    });
    user1Poll2.generateShareLink();
    await user1Poll2.save();

    await PollOption.bulkCreate([
      { text: "End of this month", pollId: user1Poll2.id },
      { text: "Mid next month", pollId: user1Poll2.id },
      { text: "End of next month", pollId: user1Poll2.id },
    ]);

    // Create polls for user2
    const user2Poll1 = await Poll.create({
      title: "Office Temperature",
      description: "What temperature should we set the office thermostat to?",
      status: "draft",
      creatorId: users[2].id,
    });

    await PollOption.bulkCreate([
      { text: "68°F (20°C)", pollId: user2Poll1.id },
      { text: "70°F (21°C)", pollId: user2Poll1.id },
      { text: "72°F (22°C)", pollId: user2Poll1.id },
      { text: "74°F (23°C)", pollId: user2Poll1.id },
    ]);

    const user2Poll2 = await Poll.create({
      title: "Weekend Activity",
      description: "What should we do this weekend?",
      status: "published",
      creatorId: users[2].id,
    });
    user2Poll2.generateShareLink();
    await user2Poll2.save();

    await PollOption.bulkCreate([
      { text: "Hiking", pollId: user2Poll2.id },
      { text: "Movie Night", pollId: user2Poll2.id },
      { text: "Beach Day", pollId: user2Poll2.id },
      { text: "Game Night", pollId: user2Poll2.id },
      { text: "Restaurant Hopping", pollId: user2Poll2.id },
    ]);

    console.log(`📊 Created polls for users`);
    console.log(`   - Admin: 2 polls (1 published, 1 draft)`);
    console.log(`   - User1: 2 polls (both published)`);
    console.log(`   - User2: 2 polls (1 published, 1 draft)`);

    console.log("🌱 Seeded the database");
  } catch (error) {
    console.error("Error seeding database:", error);
    if (error.message.includes("does not exist")) {
      console.log("\n🤔🤔🤔 Have you created your database??? 🤔🤔🤔");
    }
  }
  db.close();
};

seed();
