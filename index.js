require("colors");
require("dotenv").config();
const express = require('express');
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 8080;
const connectDB = require("./dbinit");
const bodyParser = require("body-parser");

const userRoutes = require("./routes/user");
const transactionRoutes = require("./routes/transaction");
const upload = require("./routes/upload");
const plaid = require("./routes/plaid");


connectDB();

//middlewares
app.use(cors())
// app.use(express.json())
// app.use(express.urlencoded({extended: true}))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use("/user", userRoutes);
app.use("/transaction", transactionRoutes);
app.use("/api", upload);
app.use("/api", plaid);

app.get("/", (req, res) => {
    res.send("Welcome to PiggyBank API");
});

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`.america);
});