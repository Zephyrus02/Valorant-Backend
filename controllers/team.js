const Team = require('../models/Team');
const User = require('../models/User');

exports.createTeam = async (req, res) => {
  try {
    const { name, players } = req.body;
    const team = await Team.create({ name, players, captain: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { team: team._id });
    res.status(201).json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('players', 'email');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (team.captain.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this team' });
    }
    const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (team.captain.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this team' });
    }
    await team.remove();
    res.json({ message: 'Team removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};