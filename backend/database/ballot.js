const { DataTypes } = require("sequelize");
const db = require("./db");

const Ballot = db.define("ballot", {
  voterName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  voterEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
});

module.exports = Ballot;

