'use strict';

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const broodjeSchema = new _mongoose2.default.Schema({
  user: String,
  broodje: String
}, { timestamps: true });

module.exports = _mongoose2.default.model('Broodje', broodjeSchema);