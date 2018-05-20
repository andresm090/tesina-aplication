var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TramaSchema = new Schema({
	trama: {type: String, required: true},
	topico: {type: String, required: true}
})

module.exports = mongoose.model('trama', TramaSchema);