const express = require("express");
const Room = require("../models/Room");
const User = require("../models/User");
const Team = require("../models/Team");
const Bracket = require("../models/Bracket");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Utility function to generate a 6-digit room code
const generateRoomCode = () =>
	Math.floor(100000 + Math.random() * 900000).toString();

// Admin creates a new room
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const { bracketId, matchId } = req.body;

        // Check if user is admin
        if (req.user.role !== "admin" && req.user.role !== "moderator") {
            return res.status(403).json({ msg: "Only admins or moderators can create rooms" });
        }

        // Verify that the provided match exists in the bracket
        const bracket = await Bracket.findOne({ bracketId });
        if (!bracket) {
            return res.status(404).json({ msg: "Bracket not found" });
        }

        const roundContainingMatch = bracket.rounds.find(round =>
            round.matchups.some(match => match.matchId === matchId)
        );
        if (!roundContainingMatch) {
            return res.status(404).json({ msg: "Match not found in the bracket" });
        }

        // Fetch admin's username instead of using ObjectId
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser) {
            return res.status(404).json({ msg: "Admin user not found" });
        }

        // Generate a 6-digit room code
        const roomCode = generateRoomCode();

        // Create a new room associated with the bracket and matchup, and store the admin username
        const newRoom = new Room({
            roomCode: roomCode,
            admin: adminUser.username, // Store the admin's username
            bracketId: bracketId,
            matchId: matchId,
        });

        await newRoom.save();
        res.status(201).json({ roomCode });
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
});

// Participants join a room
router.post("/join", authMiddleware, async (req, res) => {
    const { roomCode } = req.body;

    try {
        // Find the room by room code
        const room = await Room.findOne({ roomCode });
        if (!room) {
            return res.status(404).json({ msg: "Room not found" });
        }

        // Check if the room is already full (2 participants)
        if (room.participants.length >= 2) {
            return res.status(400).json({ msg: "Room is full" });
        }

        // Check if the user is already in the room
        const currentUser = await User.findById(req.user.userId).populate('team');
        if (!currentUser.team || room.participants.includes(currentUser.team.teamName)) {
            return res.status(400).json({ msg: "You are already in this room or you have no team" });
        }

        // Add the user's team name to the room
        room.participants.push(currentUser.team.teamName);
        await room.save();

        // Check if exactly 2 participants have joined, if so, start the game automatically
        if (room.participants.length === 2) {
            room.gameStarted = true;
            await room.save();
            return res.json({
                msg: "Map selection started. Both participants have joined.",
                room,
            });
        }

        res.json({
            msg: "Successfully joined the room. Waiting for another participant.",
            room,
        });
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
});

// Participants select titles in turn
router.post("/mapban", authMiddleware, async (req, res) => {
	const { roomCode, title } = req.body;

	try {
		const room = await Room.findOne({ roomCode });

		if (!room) {
			return res.status(404).json({ msg: "Room not found" });
		}

		// Ensure the game has started
		if (!room.gameStarted) {
			return res.status(400).json({ msg: "Map selection has not started yet" });
		}

		// Ensure it's the user's turn
		const userIndex = room.participants.indexOf(req.user.userId);
		if (userIndex !== room.currentTurn) {
			return res.status(400).json({ msg: "It is not your turn" });
		}

		// Check if the title is available
		const titleIndex = room.titles.indexOf(title);
		if (titleIndex === -1) {
			return res.status(400).json({ msg: "Title not available" });
		}

		// Remove the selected title from the list
		room.titles.splice(titleIndex, 1);

		// Switch the turn
		room.currentTurn = (room.currentTurn + 1) % 2; // Toggle between 0 and 1 for participants

		// If only one title remains, end the game
		if (room.titles.length === 1) {
			const remainingTitle = room.titles[0];
			room.gameStarted = false;
			await room.save();

			return res.json({
				msg: `Selected map is: ${remainingTitle}`,
				room,
			});
		}

		await room.save();
		res.json({
			msg: "Title selected successfully",
			remainingTitles: room.titles,
		});
	} catch (err) {
		res.status(500).json({ msg: "Server error", error: err.message });
	}
});

// Player 2 selects attacker or defender
router.post("/side-select", authMiddleware, async (req, res) => {
	const { roomCode, choice } = req.body;

	try {
		const room = await Room.findOne({ roomCode });

		if (!room) {
			return res.status(404).json({ msg: "Room not found" });
		}

		// Ensure the game has ended
		if (room.titles.length > 1) {
			return res
				.status(400)
				.json({
					msg: "You can only make this choice after the title selection is complete.",
				});
		}

		// Ensure it's Player 2's turn to choose
		if (room.currentTurn !== 0) {
			return res.status(400).json({ msg: "It is not your turn to choose." });
		}

		// Validate choice
		if (!["attacking", "defending"].includes(choice)) {
			return res
				.status(400)
				.json({ msg: "Choice must be attacking or defending." });
		}

		// Save Player 2's choice
		room.T2Choice = choice;
		await room.save();

		res.json({ msg: `Player 2 has chosen: ${choice}`, room });
	} catch (err) {
		res.status(500).json({ msg: "Server error", error: err.message });
	}
});

// Update the winner (Admin/Moderator only)
router.post("/set-winner", authMiddleware, async (req, res) => {
    try {
        const { roomCode, winnerUsername } = req.body;

        // Find the room by its code
        const room = await Room.findOne({ roomCode });
        if (!room) {
            return res.status(404).json({ msg: "Room not found" });
        }

        // Check if the user is admin or moderator
        if (req.user.role !== "admin" && req.user.role !== "moderator") {
            return res.status(403).json({ msg: "Only admins or moderators can update the winner" });
        }

        // Fetch the user who won based on the winner's username
        const winnerUser = await User.findOne({ username: winnerUsername });
        if (!winnerUser) {
            return res.status(404).json({ msg: "Winner user not found" });
        }

        // Fetch the team associated with the winner user
        const winnerTeam = await Team.findById(winnerUser.team);
        if (!winnerTeam) {
            return res.status(404).json({ msg: "Winner's team not found" });
        }

        // Update the winner in the room with the team's name
        room.winner = winnerTeam.teamName;
        await room.save();

        // Find the bracket and match to update the winner
        const bracket = await Bracket.findOne({ bracketId: room.bracketId });
        if (!bracket) {
            return res.status(404).json({ msg: "Bracket not found" });
        }

        // Find the match in the bracket by the match ID
        const currentRound = bracket.rounds.find(round => 
            round.matchups.some(match => match.matchId === room.matchId)
        );
        if (!currentRound) {
            return res.status(404).json({ msg: "Match not found in bracket" });
        }

        const match = currentRound.matchups.find(m => m.matchId === room.matchId);
        if (!match) {
            return res.status(404).json({ msg: "Match not found" });
        }

        // Update the winner of the match in the bracket with the team's name
        match.winner = winnerTeam.teamName;
        await bracket.save();

        res.json({ 
            msg: "Room winner and bracket updated successfully", 
            room, 
            bracket 
        });
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
});

module.exports = router;
