const express = require("express");
const Bracket = require("../models/Bracket");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const generateMatchId = (roundNumber, matchCount) => {
    return `R${roundNumber}-M${String(matchCount).padStart(3, '0')}`; // Example: R1-M001
};

// Function to generate the next bracket ID (B001, B002, etc.)
const generateBracketId = async () => {
    const bracketCount = await Bracket.countDocuments();
    return `B${String(bracketCount + 1).padStart(3, '0')}`; // Generate ID like B001, B002, etc.
};

// Function to check if all matchups in a round are completed
const isRoundComplete = (round) => {
    return round.matchups.every(matchup => matchup.winner !== null);
};

// Function to create the next round
const createNextRound = (bracket, currentRoundNumber) => {
    const currentRound = bracket.rounds.find(round => round.roundNumber === currentRoundNumber);
    const nextRoundNumber = currentRoundNumber + 1;
    const nextRoundMatchups = [];

    for (let i = 0; i < currentRound.matchups.length; i += 2) {
        const newMatchup = {
            matchId: generateMatchId(nextRoundNumber, nextRoundMatchups.length + 1),
            team1: currentRound.matchups[i].winner,
            team2: currentRound.matchups[i + 1] ? currentRound.matchups[i + 1].winner : null,
            winner: null
        };
        nextRoundMatchups.push(newMatchup);
    }

    bracket.rounds.push({
        roundNumber: nextRoundNumber,
        matchups: nextRoundMatchups
    });

    return nextRoundNumber;
};

// Function to update winner and potentially create next round
const updateWinnerAndCreateNextRound = async (bracket, roundNumber, matchId, winnerName) => {
    const currentRound = bracket.rounds.find(round => round.roundNumber === roundNumber);
    const match = currentRound.matchups.find(m => m.matchId === matchId);
    
    if (!match) {
        throw new Error('Match not found');
    }

    match.winner = winnerName;

    if (isRoundComplete(currentRound)) {
        if (currentRound.matchups.length > 1) {
            createNextRound(bracket, roundNumber);
        }
    }

    await bracket.save();
};

// Admin initializes the bracket with round 1 matchups
router.post('/initialize', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Only admins can initialize brackets' });
        }

        const { matchups } = req.body;

        const bracketId = await generateBracketId(); // Get the next bracket ID

        const newBracket = new Bracket({
            bracketId,
            rounds: [
                {
                    roundNumber: 1,
                    matchups: matchups.map((matchup, index) => ({
                        matchId: generateMatchId(1, index + 1),
                        team1: matchup[0],
                        team2: matchup[1],
                        winner: null
                    }))
                }
            ]
        });

        await newBracket.save();

        res.status(201).json({ msg: 'Bracket initialized successfully', bracket: newBracket });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Admin updates the winner and potentially creates the next round
router.post('/update', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Only admins can update brackets' });
        }

        const { bracketId, roundNumber, matchId, winnerName } = req.body;

        const bracket = await Bracket.findOne({ bracketId });
        if (!bracket) {
            return res.status(404).json({ msg: 'Bracket not found' });
        }

        await updateWinnerAndCreateNextRound(bracket, roundNumber, matchId, winnerName);

        res.json({ msg: 'Match winner updated and next round created if necessary.', bracket });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Route to view a bracket by its ID
router.get('/:bracketId', authMiddleware, async (req, res) => {
    try {
        const { bracketId } = req.params;

        const bracket = await Bracket.findOne({ bracketId });

        if (!bracket) {
            return res.status(404).json({ msg: 'Bracket not found' });
        }

        res.status(200).json({ bracket });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

module.exports = router;
