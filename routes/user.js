const express = require("express");

const {
    updateUser,
    deleteOneUser,
    loginUser,
    signupUser,
    budget,
} = require("../controllers/user");

const api = express.Router();

//login
api.post("/login", loginUser);

//signup
api.post("/signup", signupUser);

// Path to update or to delete user
api
.route("/:id")
.put(updateUser)
.delete(deleteOneUser)
.get(budget);

module.exports = api;