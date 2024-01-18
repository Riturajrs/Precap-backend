const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema({
  issuerId: { type: String, required: true },
  image: { type: String, required: true },
  links: [{ type: String }],
  content: { type: String, required: true },
  timestamp: { type: String, required: true },
});

module.exports = mongoose.model("Posts", schema);
