const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require('cors');

// Initialize dotenv for environment variables
dotenv.config();

// Initialize express app
const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));


// Middleware to parse JSON
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

// MongoDB connection
mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("MongoDB Connected"))
	.catch((err) => console.log(err));

// Routes
const authRoutes = require("./routes/auth");
const teamRoutes = require("./routes/team");
const roomRoutes = require("./routes/room");
const profileRoute = require('./routes/profile');
const bracketRoutes = require("./routes/bracket");

// Use routes
app.use("/auth", authRoutes);
app.use("/team", teamRoutes);
app.use("/room", roomRoutes);
app.use('/profile', profileRoute);
app.use("/bracket", bracketRoutes);

app.get("/", (req, res) => {
	res.send("API is running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
	console.log(`Server running on http://localhost:${PORT}/`)
);
