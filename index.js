require("colors");
require("dotenv").config();
const express = require('express');
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 8080;
const connectDB = require("./dbinit");

const userRoutes = require("./routes/user");
const transactionRoutes = require("./routes/transaction");
const upload = require("./routes/upload");

connectDB();

//middlewares
app.use(express.json())
app.use(cors())
app.use(express.urlencoded({extended: true}))

app.use("/user", userRoutes);
app.use("/transaction", transactionRoutes);
app.use("/api", upload);

app.get("/", (req, res) => {
    res.send("Welcome to PiggyBank API");
});

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`.america);
});