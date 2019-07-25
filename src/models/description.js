import mongoose from 'mongoose';

const descriptionSchema = new mongoose.Schema({
  afkorting: String,
  betekenis: String,
});


module.exports = mongoose.model('Description', descriptionSchema);