const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema({
  issuerId: {type: String, required: true},
  title: { type: String, required: true },
  speakers: [{ type: String, required: true }],
  icon_image: { type: String, required: true },
  bg_image: { type: String, required: true },
  reg_link: { type: String, required: true  },
  timing: {type: String, required: true },
  description: { type: String, required: true },
  deadline: { type: String, required: true },
  timestamp: { type: String, required: true },
});

module.exports = mongoose.model("Webinar", schema);
