const { UserFacingError } = require("./errors");

class BadRequestError extends UserFacingError {
  constructor(message, options = {}) {
    super(message);
    // You can attach relevant information to the error instance
    // (e.g.. the username)
    for (const [key, value] of Object.entries(options)) {
      this[key] = value;
    }
  }

  get statusCode() {
    return 400;
  }
}

class NotFoundError extends UserFacingError {
  constructor(message, options = {}) {
    super(message);

    // You can attach relevant information to the error instance
    // (e.g.. the username)

    for (const [key, value] of Object.entries(options)) {
      this[key] = value;
    }
  }
  get statusCode() {
    return 404;
  }
}
class NoAccessError extends UserFacingError {
  constructor(message, options = {}) {
    super(message);

    for (const [key, value] of Object.entries(options)) {
      this[key] = value;
    }
  }

  get statusCode() {
    return 403;
  }
}

module.exports = {
  BadRequestError,
  NotFoundError,
  NoAccessError,
};
