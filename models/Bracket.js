const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Matchup schema
const matchupSchema = new Schema({
    matchId: String,
    team1: String,
    team2: String,
    winner: String
});

// Round schema
const roundSchema = new Schema({
    roundNumber: Number,
    matchups: [matchupSchema]
});

// Bracket schema
const bracketSchema = new Schema({
    bracketId: String,
    rounds: [roundSchema] // Contains multiple rounds, each with its matchups
});

module.exports = mongoose.model('Bracket', bracketSchema);
