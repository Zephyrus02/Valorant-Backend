const mongoose = require('mongoose');

const BracketSchema = new mongoose.Schema({
    bracketId: { type: String, unique: true }, // Custom bracket ID (e.g., B001, B002)
    matchups: [
        {
            matchId: { type: String, unique: true }, // Custom match ID (e.g., M001)
            team1: { type: String, required: true }, // First team in the matchup
            team2: { type: String, default: null },  // Second team in the matchup (optional if only one team)
            winner: { type: String, default: null }  // Winner of the match (team name)
        }
    ]
});

module.exports = mongoose.model('Bracket', BracketSchema);
