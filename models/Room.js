const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        length: 6
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
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
        enum: ['attacker', 'defender'], // Choice can be either 'attacker' or 'defender'
        default: null
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId, // To reference the winning team
        ref: 'Team',
        default: null
    }
});

module.exports = mongoose.model('Room', RoomSchema);
