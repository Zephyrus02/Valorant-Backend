const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        length: 6
    },
    admin: {
        type: String,
        ref: 'User',
        required: true
    },
    participants: [{
        type: String,
        ref: 'User'
    }],
    titles: {
        type: [String],
        default: ["Ascent", "Pearl", "Split", "Haven", "Bind", "Breeze", "Icebox"]
    },
    currentTurn: {
        type: Number,
        default: 0 // 0 for participant 1, 1 for participant 2, etc.
    },
    gameStarted: {
        type: Boolean,
        default: false
    },
    T2Choice: {
        type: String,
        enum: ['attacking', 'defending'],
        default: null
    },
    winner: {
        type: String,
        ref: 'Team',
        default: null
    },
    bracketId: {
        type: String,  // Reference to the bracket ID
        required: true
    },
    matchId: {
        type: String,  // Reference to the matchup ID in the bracket
        required: true
    }
});

module.exports = mongoose.model('Room', RoomSchema);
