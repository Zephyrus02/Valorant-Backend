const express = require('express');
const User = require('../models/User');
const Team = require('../models/Team');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// View user profile (including team info if exists)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // Find the user by ID and populate the team details
        const user = await User.findById(req.user.userId).populate('team', 'teamName members');
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Send user profile with team info
        res.json({
            username: user.username,
            email: user.email,
            role: user.role,
            team: user.team ? {
                teamName: user.team.teamName,
                members: user.team.members
            } : null
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update user profile
router.put('/me', authMiddleware, async (req, res) => {
    const { username, email, password, teamName, teamMembers } = req.body;

    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update user profile data
        if (username) user.username = username;
        if (email) user.email = email;

        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        // Check if user has a team and they are allowed to update it (only team creator)
        if (teamName || teamMembers) {
            if (!user.team) {
                return res.status(400).json({ msg: 'You do not have a team to update' });
            }

            const team = await Team.findById(user.team);
            if (!team) {
                return res.status(404).json({ msg: 'Team not found' });
            }

            // Only the team creator can update the team name or members
            if (String(team.createdBy) !== String(user._id)) {
                return res.status(403).json({ msg: 'Only the team creator can update the team' });
            }

            // Update team name
            if (teamName) {
                team.teamName = teamName;
            }

            // Update team members (ensure there are no more than 5 members)
            if (teamMembers) {
                if (teamMembers.length > 5) {
                    return res.status(400).json({ msg: 'Team cannot have more than 5 members' });
                }

                // Update only specified members and keep other members intact
                for (let i = 0; i < teamMembers.length; i++) {
                    if (teamMembers[i]) {
                        team.members[i] = teamMembers[i];  // Update the respective index with new member name
                    }
                }

                // Ensure the team creator (user) remains part of the team
                if (!team.members.includes(user.username)) {
                    team.members.push(user.username);
                }
            }

            // Save updated team
            await team.save();
        }

        // Save updated user
        await user.save();

        res.json({
            msg: 'Profile updated successfully',
            user: {
                username: user.username,
                email: user.email
            },
            team: user.team ? {
                teamName: teamName || user.team.teamName,
                members: teamMembers || user.team.members
            } : null
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// View user team
router.get('/me/team', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('team');

        if (!user.team) {
            return res.status(404).json({ msg: 'You are not part of any team' });
        }

        const team = await Team.findById(user.team);

        if (!team) {
            return res.status(404).json({ msg: 'Team not found' });
        }

        res.json({
            teamName: team.teamName,
            members: team.members
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
