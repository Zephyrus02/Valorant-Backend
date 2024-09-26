const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const availableMaps = [
    "Ascent",
    "Bind",
    "Icebox",
    "Pearl",
    "Lotus",
    "Haven",
    "Breeze"
];

// In-memory storage for tracking game state (Replace with DB storage in production)
let gameState = {
    maps: [...availableMaps],
    currentTurn: 0, // 0 for Player 1, 1 for Player 2
    player1: null,
    player2: null
};

// Initialize the title selection game
router.post('/lobby', authMiddleware, (req, res) => {
    const userId = req.user.userId;

    if (!gameState.player1) {
        gameState.player1 = userId;
        res.json({ msg: 'Player 1 has joined. Waiting for Player 2.' });
    } else if (!gameState.player2 && userId !== gameState.player1) {
        gameState.player2 = userId;
        res.json({ msg: 'Player 2 has joined. Game can start.' });
    } else {
        res.status(400).json({ msg: 'Both players have already joined.' });
    }
});

// Handle title selection
router.post('/banphase', authMiddleware, (req, res) => {
    const { title } = req.body;
    const userId = req.user.userId;

    // Ensure both players have joined
    if (!gameState.player1 || !gameState.player2) {
        return res.status(400).json({ msg: 'Both players need to join before starting the game.' });
    }

    // Ensure the game is not over
    if (gameState.maps.length <= 1) {
        return res.status(400).json({ msg: 'Game is over. No maps left to select.' });
    }

    // Check whose turn it is
    if ((gameState.currentTurn === 0 && userId !== gameState.player1) ||
        (gameState.currentTurn === 1 && userId !== gameState.player2)) {
        return res.status(400).json({ msg: 'Not your turn!' });
    }

    // Check if the title is available
    const titleIndex = gameState.maps.indexOf(title);
    if (titleIndex === -1) {
        return res.status(400).json({ msg: 'Title not available' });
    }

    // Remove the selected title
    gameState.maps.splice(titleIndex, 1);

    // Switch the turn
    gameState.currentTurn = (gameState.currentTurn + 1) % 2;

    // If one title remains, return the result
    if (gameState.maps.length === 1) {
        const remainingMap = gameState.maps[0];
        res.json({ msg: `Game over. The remaining title is: ${remainingMap}` });

        // Reset the game
        resetGameState();
    } else {
        res.json({ msg: 'Title selected successfully', remainingMaps: gameState.maps });
    }
});

// Reset game state when the game ends
function resetGameState() {
    gameState = {
        maps: [...availableMaps],
        currentTurn: 0, // Reset turn to player 1
        player1: null,
        player2: null
    };
}

module.exports = router;
