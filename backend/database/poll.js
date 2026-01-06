const { DataTypes } = require("sequelize");
const db = require("./db");
const crypto = require("crypto");

const Poll = db.define("poll", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("draft", "published", "closed"),
    defaultValue: "draft",
    allowNull: false,
  },
  shareLink: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
});

// Generate unique shareable link
Poll.prototype.generateShareLink = function () {
  if (!this.shareLink) {
    this.shareLink = crypto.randomBytes(16).toString("hex");
  }
  return this.shareLink;
};

// Before create hook to generate share link when status is published
Poll.beforeCreate((poll) => {
  if (poll.status === "published" && !poll.shareLink) {
    poll.shareLink = crypto.randomBytes(16).toString("hex");
  }
});

module.exports = Poll;

