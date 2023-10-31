const requestIp = require("request-ip");

module.exports = function (req, res, next) {
  req.userIp = requestIp.getClientIp(req);
  next();
};
