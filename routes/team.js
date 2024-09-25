const express = require('express');
const Team = require('../models/Team');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Create a team (only for participants)
router.post('/create', authMiddleware, async (req, res) => {
    const { teamName, members } = req.body; // members will be an array of in-game names

    try {
        const user = await User.findById(req.user.userId);

        // Ensure the user is a participant
        if (user.role !== 'participant') {
            return res.status(403).json({ msg: 'Only participants can create teams' });
        }

        // Ensure the team size does not exceed 5
        if (members.length > 5) {
            return res.status(400).json({ msg: 'Team cannot have more than 5 players' });
        }

        // Create the team with in-game names
        const team = new Team({
            teamName,
            members: [...members, user.username], // Include the leader's username
            createdBy: user._id
        });

        // Save the team
        await team.save();

        // Update user with team ID
        user.team = team._id; // Optional: if you want to link the team to the user
        await user.save();

        res.json(team);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get team data of logged-in user
router.get('/myteam', authMiddleware, async (req, res) => {
    try {
        // Find the user
        const user = await User.findById(req.user.userId).populate('team'); // Populate team info
        
        // Check if user has a team
        if (!user.team) {
            return res.status(404).json({ msg: 'No team found for this user' });
        }

        // Fetch the team data using the team ID
        const team = await Team.findById(user.team);
        
        if (!team) {
            return res.status(404).json({ msg: 'Team not found' });
        }

        res.json(team);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


module.exports = router;
