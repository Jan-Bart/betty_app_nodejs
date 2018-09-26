import mongoose from 'mongoose';

const broodjeSchema = new mongoose.Schema({
  user: String,
  broodje: String,
}, { timestamps: true });

module.exports = mongoose.model('Broodje', broodjeSchema);
