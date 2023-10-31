module.exports = function (req, res, next) {
  if (req.session.email_verified) {
    next();
  } else {
    return res.status(401).send("EMAIL NOT VERIFIED!");
  }
};
