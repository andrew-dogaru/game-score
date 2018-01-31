var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var scoreSchema = Schema({
  name: String, 
  score: Number 
});

// set up a mongoose model
module.exports = mongoose.model('Score', scoreSchema);
