const VALORANT_MAPS = ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture'];

exports.banMap = async (req, res) => {
  try {
    const { map } = req.body;
    if (!VALORANT_MAPS.includes(map)) {
      return res.status(400).json({ message: 'Invalid map' });
    }
    // Here you would typically update the match or tournament state
    // For simplicity, we're just returning the banned map
    res.json({ bannedMap: map });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAvailableMaps = async (req, res) => {
  try {
    // Here you would typically fetch the current match or tournament state
    // and return only the maps that haven't been banned yet
    // For simplicity, we're returning all maps
    res.json({ availableMaps: VALORANT_MAPS });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};