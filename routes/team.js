const express = require('express');
const Team = require('../models/Team');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Create a team (only for participants)
router.post('/create', authMiddleware, async (req, res) => {
    const { teamName, members } = req.body;

    try {
        const user = await User.findById(req.user.userId);

        if (user.role !== 'participant') {
            return res.status(403).json({ msg: 'Only participants can create teams' });
        }

        if (members.length > 4) {
            return res.status(400).json({ msg: 'Team cannot have more than 5 players' });
        }

        const existingTeam = await Team.findOne({ createdBy: user._id });

        if (existingTeam) {
            return res.status(400).json({ msg: 'You have already created a team' });
        }

        const team = new Team({
            teamName,
            members: [...members, user.username], // Add the creator's username to the team
            createdBy: user._id
        });

        await team.save();

        user.team = team._id; // Link team to user
        await user.save();

        res.json(team);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
