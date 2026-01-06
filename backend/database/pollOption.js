const { DataTypes } = require("sequelize");
const db = require("./db");

const PollOption = db.define("pollOption", {
  text: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
});

module.exports = PollOption;

