const express = require("express");
const Room = require("../models/Room");
const User = require("../models/User");
const Team = require("../models/Team");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Utility function to generate a 6-digit room code
const generateRoomCode = () =>
	Math.floor(100000 + Math.random() * 900000).toString();

// Admin creates a new room
router.post("/create", authMiddleware, async (req, res) => {
	try {
		// Check if user is admin or moderator
		if (req.user.role !== "admin" && req.user.role !== "moderator") {
			return res.status(403).json({ msg: "Only admins can create rooms" });
		}

		// Generate a 6-digit room code
		const roomCode = generateRoomCode();

		// Create a new room
		const newRoom = new Room({
			roomCode: roomCode,
			admin: req.user.userId,
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
		// Find the room by code
		const room = await Room.findOne({ roomCode });
		if (!room) {
			return res.status(404).json({ msg: "Room not found" });
		}

		// Check if the room is already full (2 participants)
		if (room.participants.length >= 2) {
			return res.status(400).json({ msg: "Room is full" });
		}

		// Check if the user is already in the room
		if (room.participants.includes(req.user.userId)) {
			return res.status(400).json({ msg: "You are already in this room" });
		}

		// Add user to the room
		room.participants.push(req.user.userId);
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
	const { roomCode, winnerUsername } = req.body;

	try {
		// Check if user is admin or moderator
		if (req.user.role !== "admin" && req.user.role !== "moderator") {
			return res.status(403).json({ msg: "Only admins can update the winner" });
		}

		// Find the room by code
		const room = await Room.findOne({ roomCode });
		if (!room) {
			return res.status(404).json({ msg: "Room not found" });
		}

		// Find the user by their username
		const winnerUser = await User.findOne({ username: winnerUsername });
		if (!winnerUser) {
			return res.status(404).json({ msg: "User not found" });
		}

		// Find the team of the user (assuming they are part of a team)
		const winnerTeam = await Team.findOne({ createdBy: winnerUser._id });
		if (!winnerTeam) {
			return res.status(404).json({ msg: "Team not found for this user" });
		}

		// Update the room's winner with the team's ID
		room.winner = winnerTeam._id;
		await room.save();

		res.json({ msg: `Winner updated successfully`, room });
	} catch (err) {
		res.status(500).json({ msg: "Server error", error: err.message });
	}
});

module.exports = router;
