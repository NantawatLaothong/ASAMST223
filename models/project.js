const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// create a Schema for User 
const userSchema = new Schema({
    title: String,
    body: String,
    editCode: String,
    imageURL: {
        url: String,
        filename: String
    },
    author: String
}, { timestamps: true });

module.exports = mongoose.model('Project', userSchema);