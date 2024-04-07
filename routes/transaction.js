const express = require("express");
const requireAuth = require("../middlewares/requireAuth");

const {
    newTransaction,
    deleteTransaction,
    getAllTransactions,
    updateTransaction,
    deleteAllTransactions,
} = require("../controllers/transaction")

const api = express.Router();

api.use(requireAuth);

api
.route("/")
.get(getAllTransactions)
.post(newTransaction)
.delete(deleteAllTransactions);

api
.route("/:id")
.delete(deleteTransaction)
.put(updateTransaction);

module.exports = api;