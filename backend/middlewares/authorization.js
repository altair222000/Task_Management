const { getUserIdFromToken } = require("../config/jwtProvider");
const User = require("../models/user");
const wrapAsync = require("./wrapAsync");

const authorization = wrapAsync(async (req, res, next) => {
  // Acepta únicamente tokens enviados como Bearer.
  const header = req.headers.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).send({ message: "Token not found" });
  }

  let userId;
  try {
    userId = getUserIdFromToken(token);
  } catch {
    return res.status(401).send({ message: "Invalid token" });
  }

  if (!userId) {
    return res.status(401).send({ message: "Invalid token" });
  }

  const user = await User.findById(userId).select("-password");
  if (!user) {
    return res.status(401).send({ message: "User not found" });
  }

  req.user = user;
  next();
});

module.exports = { authorization };
