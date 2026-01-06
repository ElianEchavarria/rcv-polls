const { DataTypes } = require("sequelize");
const db = require("./db");

const Ranking = db.define("ranking", {
  rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  },
});

module.exports = Ranking;

