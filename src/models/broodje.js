import mongoose from 'mongoose';

const broodjeSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  broodje: String,
  chinese: Boolean,
}, { timestamps: true });

module.exports = mongoose.model('Broodje', broodjeSchema);
