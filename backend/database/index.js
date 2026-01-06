const db = require("./db");
const User = require("./user");
const Poll = require("./poll");
const PollOption = require("./pollOption");
const Ballot = require("./ballot");
const Ranking = require("./ranking");

// Define relationships
// User has many Polls
User.hasMany(Poll, { foreignKey: "creatorId", as: "polls" });
Poll.belongsTo(User, { foreignKey: "creatorId", as: "creator" });

// Poll has many PollOptions
Poll.hasMany(PollOption, { foreignKey: "pollId", as: "options", onDelete: "CASCADE" });
PollOption.belongsTo(Poll, { foreignKey: "pollId", as: "poll" });

// Poll has many Ballots
Poll.hasMany(Ballot, { foreignKey: "pollId", as: "ballots", onDelete: "CASCADE" });
Ballot.belongsTo(Poll, { foreignKey: "pollId", as: "poll" });

// Ballot has many Rankings
Ballot.hasMany(Ranking, { foreignKey: "ballotId", as: "rankings", onDelete: "CASCADE" });
Ranking.belongsTo(Ballot, { foreignKey: "ballotId", as: "ballot" });

// Ranking belongs to PollOption
Ranking.belongsTo(PollOption, { foreignKey: "pollOptionId", as: "pollOption" });
PollOption.hasMany(Ranking, { foreignKey: "pollOptionId", as: "rankings" });

module.exports = {
  db,
  User,
  Poll,
  PollOption,
  Ballot,
  Ranking,
};
