require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors({ origin: ["http://localhost:5173", "https://blood-connect-blue.vercel.app", "https://blood-connect-3pcy5svos-yazhini6.vercel.app"] }));
app.use(express.json());

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["donor", "hospital"], required: true },
  age: Number,
  bloodGroup: String,
  phone: String,
  city: String,
  address: String,
  lastDonationDate: String,
  latitude: Number,
  longitude: Number,
  eligible: { type: Boolean, default: false }
}, { timestamps: true });

const requestSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  hospitalName: { type: String, required: true },
  patientName: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  units: { type: Number, required: true, min: 1 },
  location: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  emergencyLevel: { type: String, enum: ["High", "Medium", "Low"], required: true },
  status: { type: String, enum: ["Pending", "Fulfilled"], default: "Pending" }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const BloodRequest = mongoose.model("BloodRequest", requestSchema);

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || "bloodconnect-dev-secret",
    { expiresIn: "1d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Please log in first." });
  }

  try {
    req.auth = jwt.verify(
      token,
      process.env.JWT_SECRET || "bloodconnect-dev-secret"
    );
    next();
  } catch {
    return res.status(401).json({
      message: "Session expired. Please log in again."
    });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth.role !== role) {
      return res.status(403).json({
        message: "You do not have permission for this action."
      });
    }
    next();
  };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    age: user.age,
    bloodGroup: user.bloodGroup,
    phone: user.phone,
    city: user.city,
    address: user.address,
    lastDonationDate: user.lastDonationDate,
    latitude: user.latitude,
    longitude: user.longitude,
    eligible: user.eligible
  };
}

// Basic health checks
app.get("/", (req, res) => {
  res.json({ message: "BloodConnect MongoDB backend is running" });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected"
  });
});

// Register donor or hospital
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name, email, password, role, age, bloodGroup, phone, city,
      address, lastDonationDate, latitude, longitude
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password and account type are required."
      });
    }

    if (!["donor", "hospital"].includes(role)) {
      return res.status(400).json({
        message: "Choose Donor or Hospital account."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    if (role === "donor" && (!age || !bloodGroup || !phone || !city)) {
      return res.status(400).json({
        message: "Please complete all required donor fields."
      });
    }

    if (role === "hospital" && (!phone || !city || !address)) {
      return res.status(400).json({
        message: "Please complete all required hospital fields."
      });
    }

    const existing = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists. Please log in."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email,
      passwordHash,
      role,
      age: role === "donor" ? Number(age) : undefined,
      bloodGroup: role === "donor" ? bloodGroup : undefined,
      phone,
      city,
      address: role === "hospital" ? address : undefined,
      lastDonationDate: role === "donor" ? (lastDonationDate || "") : undefined,
      latitude: latitude == null ? undefined : Number(latitude),
      longitude: longitude == null ? undefined : Number(longitude),
      eligible: role === "donor" && Number(age) >= 18
    });

    return res.status(201).json({
      message: "Registration successful.",
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    return res.status(500).json({
      message: "Could not register. Please check the backend terminal."
    });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password and account type are required."
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        message: "Email or password is incorrect for this account type."
      });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Could not log in. Please check the backend terminal."
    });
  }
});

// Current logged-in user
app.get("/api/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Could not load account." });
  }
});

// List eligible donors
app.get("/api/donors", async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    const filter = { role: "donor", eligible: true };

    if (bloodGroup) filter.bloodGroup = bloodGroup;

    if (city) {
      filter.city = {
        $regex: String(city).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i"
      };
    }

    const donors = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(donors.map(publicUser));
  } catch (error) {
    res.status(500).json({ message: "Could not load donors." });
  }
});

// NEW: List registered hospitals
app.get("/api/hospitals", async (req, res) => {
  try {
    const hospitals = await User.find({ role: "hospital" })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(hospitals.map(publicUser));
  } catch (error) {
    console.error("Load hospitals error:", error.message);
    res.status(500).json({ message: "Could not load hospitals." });
  }
});

// Create a blood request
app.post("/api/blood-requests", auth, requireRole("hospital"), async (req, res) => {
  try {
    const {
      patientName, bloodGroup, units, location,
      emergencyLevel, latitude, longitude
    } = req.body;

    if (
      !patientName || !bloodGroup || !units ||
      Number(units) < 1 || !location || !emergencyLevel
    ) {
      return res.status(400).json({
        message: "Please complete all blood request fields."
      });
    }

    const hospital = await User.findById(req.auth.id);

    if (!hospital || hospital.role !== "hospital") {
      return res.status(404).json({ message: "Hospital account not found." });
    }

    const request = await BloodRequest.create({
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      patientName,
      bloodGroup,
      units: Number(units),
      location,
      emergencyLevel,
      latitude: latitude == null ? undefined : Number(latitude),
      longitude: longitude == null ? undefined : Number(longitude)
    });

    res.status(201).json({
      message: "Emergency blood request created.",
      request
    });
  } catch (error) {
    console.error("Blood request error:", error.message);
    res.status(500).json({
      message: "Could not create blood request."
    });
  }
});

// List blood requests
app.get("/api/blood-requests", async (req, res) => {
  try {
    const requests = await BloodRequest.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Could not load blood requests." });
  }
});

// Dashboard statistics
app.get("/api/dashboard", async (req, res) => {
  try {
    const [donors, hospitals, requests, pendingRequests] = await Promise.all([
      User.countDocuments({ role: "donor" }),
      User.countDocuments({ role: "hospital" }),
      BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: "Pending" })
    ]);

    res.json({ donors, hospitals, requests, pendingRequests });
  } catch (error) {
    res.status(500).json({ message: "Could not load dashboard." });
  }
});

const PORT = process.env.PORT || 5000;

mongoose.connect(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bloodconnect"
)
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(PORT, () => {
      console.log(`BloodConnect API running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    console.error("Check MongoDB service and MONGODB_URI in backend/.env");
    process.exit(1);
  });



