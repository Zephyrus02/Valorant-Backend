const Playoff = require('../models/Playoff');

exports.createPlayoff = async (req, res) => {
  try {
    const playoff = await Playoff.create(req.body);
    res.status(201).json(playoff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPlayoffs = async (req, res) => {
  try {
    const playoffs = await Playoff.find().populate('matches.team1 matches.team2', 'name');
    res.json(playoffs);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePlayoff = async (req, res) => {
  try {
    const playoff = await Playoff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!playoff) {
      return res.status(404).json({ message: 'Playoff not found' });
    }
    res.json(playoff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePlayoff = async (req, res) => {
  try {
    const playoff = await Playoff.findByIdAndDelete(req.params.id);
    if (!playoff) {
      return res.status(404).json({ message: 'Playoff not found' });
    }
    res.json({ message: 'Playoff removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};