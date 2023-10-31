const admin = require("firebase-admin");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.userData = decoded;
    next();
  } catch (error) {
    next();
  }
};
