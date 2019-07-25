import mongoose from 'mongoose';

const descriptionSchema = new mongoose.Schema({
  afkorting: String,
  betekening: String,
});


module.exports = mongoose.model('Description', descriptionSchema);