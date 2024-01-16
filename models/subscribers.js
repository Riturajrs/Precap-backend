const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema({
  name: { type: String },
  newsletter: { type: Boolean, required: true },
  messages: [{ type: String }],
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  timestamp: [{ type: String }],
});

module.exports = mongoose.model("Subscriber", schema);
