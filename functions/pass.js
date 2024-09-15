"use strict";
let crypto = require("crypto");

let generateSalt = (rounds) => {
  if (rounds >= 15) {
    throw new Error(`${rounds} is greater than 15. Must be less than 15`);
  }
  if (typeof rounds !== "number")
    throw new Error("rounds param must be a number");
  if (rounds == null) rounds = 12;
  return crypto
    .randomBytes(Math.ceil(rounds / 2))
    .toString("hex")
    .slice(0, rounds);
};

let hasher = (password, salt) => {
  let hash = crypto.createHmac("sha256", salt);
  hash.update(password);
  let value = hash.digest("hex");
  return {
    password: password,
    salt: salt,
    hashedPass: value,
  };
};

let hash = (password, salt) => {
  if (password == null || salt == null)
    throw new Error("Must provid a password and a salt");
  if (typeof password !== "string" || typeof salt !== "string")
    throw new Error(
      "password must be a string and salt must either be a string or a number of rounds"
    );
  return hasher(password, salt);
};

let compare = (password, hash) => {
  if ((password == null || hash == null))
    throw new Error("password and hash required to compare");
  if (typeof password !== "string" || typeof hash !== "object")
    throw new Error("password must be a string and hash an object");
  let passwordData = hasher(password, hash.salt);
  if (passwordData.hashedPass === hash.hashedPass) return true;
  return false;
};

module.exports = {
  generateSalt,
  hash,
  compare,
};
