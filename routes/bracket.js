const express = require('express');
const Bracket = require('../models/Bracket');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Helper function to generate custom match IDs
const generateMatchId = (bracketId, matchCount) => {
    return `${bracketId}-M${String(matchCount).padStart(3, '0')}`; // Example: "B001-M001"
};

// Helper function to generate bracket IDs
const generateBracketId = (bracketCount) => {
    return `B${String(bracketCount).padStart(3, '0')}`;
};

// Admin creates or updates the initial bracket
router.post('/initialize', authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Only admins can initialize brackets' });
        }

        const { matchups } = req.body; // matchups is an array of arrays with team names

        // Generate custom bracket ID based on the number of existing brackets
        const bracketCount = await Bracket.countDocuments();
        const bracketId = generateBracketId(bracketCount + 1); // "B001", "B002", etc.

        // Create matchups for this bracket
        const newMatchups = matchups.map((matchup, index) => ({
            matchId: generateMatchId(bracketId, index + 1), // Unique match ID
            team1: matchup[0],
            team2: matchup[1] || null, // team2 can be null if only one team is provided
            winner: null
        }));

        // Create the initial bracket
        const newBracket = new Bracket({
            bracketId,
            round: 1,
            matchups: newMatchups
        });

        await newBracket.save();

        res.status(201).json({ msg: 'Bracket initialized successfully', bracket: newBracket });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Admin updates the winner and creates/updates the next bracket if needed
router.post('/update', authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Only admins can update brackets' });
        }

        const { bracketId, matchId, winnerName } = req.body;

        // Find the current bracket using the custom bracketId
        const bracket = await Bracket.findOne({ bracketId });
        if (!bracket) {
            return res.status(404).json({ msg: 'Bracket not found' });
        }

        // Find the match by its custom matchId
        const match = bracket.matchups.find(m => m.matchId === matchId);
        if (!match) {
            return res.status(404).json({ msg: 'Match not found' });
        }

        // Update the winner for the current match
        match.winner = winnerName;
        await bracket.save();

        // Now we need to move the winner into the next round
        const nextRound = bracket.round + 1;

        // Check how many winners exist in this bracket
        const currentWinners = bracket.matchups.filter(m => m.winner).map(m => m.winner);

        // Only create the next bracket when there are enough winners to make matchups (pairs of winners)
        if (currentWinners.length % 2 === 0 && currentWinners.length > 0) {
            // First check if there's an existing next bracket for the next round
            let nextBracket = await Bracket.findOne({ round: nextRound });

            if (!nextBracket) {
                // If no bracket exists for the next round, create a new one for the first matchup
                const bracketCount = await Bracket.countDocuments();
                const newBracketId = generateBracketId(bracketCount + 1); // Generate the new bracket ID

                nextBracket = new Bracket({
                    bracketId: newBracketId,
                    round: nextRound,
                    matchups: []
                });
            }

            // Collect winners of matches from current bracket in pairs
            const winnerPairs = [];
            for (let i = 0; i < currentWinners.length; i += 2) {
                winnerPairs.push([currentWinners[i], currentWinners[i + 1]]);
            }

            // Now fill the next bracket's matchups with pairs of winners
            winnerPairs.forEach((pair, index) => {
                const [team1, team2] = pair;

                const matchCount = nextBracket.matchups.length + 1;
                const newMatchId = generateMatchId(nextBracket.bracketId, matchCount); // Generate new match ID

                nextBracket.matchups.push({
                    matchId: newMatchId,
                    team1,
                    team2: team2 || null, // Handle odd number of teams
                    winner: null
                });
            });

            // Save the updated next bracket
            await nextBracket.save();

            res.json({
                msg: 'Match winner updated and added to the next round.',
                nextBracket
            });
        } else {
            res.json({ msg: 'Match winner updated. Waiting for more winners to progress to the next round.' });
        }
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

module.exports = router;
