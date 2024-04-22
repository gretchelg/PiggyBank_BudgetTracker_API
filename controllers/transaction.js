const Transaction = require("../schemas/Transaction");

// NEW TRANSACTION
const newTransaction = async (req, res) => {
    try {
        const {
            category_name,
            tran_description,
            tran_amount,
            tran_sign,
            tran_currency,
            tran_date,
            tran_id,
        } = req.body

        const user = req.user._id;

        const newTransaction = await Transaction.create({
            category_name, // HOUSE, TRANSPORTATION
            tran_description,
            tran_amount,
            tran_sign, //DR (income) or CR(expense)
            tran_currency,
            tran_date,
            user,
            tran_id,
        });
        
        res.status(201).json({success: true, data: newTransaction });

    } catch (error) {
        res.status(500).json({msg : error });
    }
};

// DELETE TRANSACTION
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTransaction = await Transaction.findByIdAndDelete(id);
        
        if (!deletedTransaction) {
            return res.status(400).json({ error: "Transaction not found" });
        }

        res.status(200).json( { success: true, data: deletedTransaction });
    } catch (error) {
        res.status(500).json({ error });
    }
};

// DELETE ALL TRANSACTIONS
const deleteAllTransactions = async (req, res) => {
    try {
        const deletedTransaction = await Transaction.deleteMany({
            tran_amount: { $gte: 0 },  
        });
        
        if (!deletedTransaction) {
            return res.status(400).json( { error: "Delete failed" });
        }
        
        res.status(200).json({
            success: true,
            msg: "Successfully deleted all transactions",
        });
    } catch (error) {
        res.status(500).json({error});
    }
};

// GET TRANSACTIONS / FILTER TRANSACTION BY TIMEPERIOD
const getAllTransactions = async (req, res) => {
    try {
        const { timeperiod } = req.query;
        const user = req.user._id;

    // GET ALL TRANSACTIONS
        if (timeperiod === "all" ) {
            const user = req.user._id;
            const transactions = await Transaction.find({ user });
            res.status(200).json(transactions);
        } else {
            
            const user = req.user._id;
            let query = {};
            const currentDate = new Date();
    // FILTER CURRENT MONTH
            if (timeperiod === "month") {
                const startOfMonth = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    1
                );
                query = { user, tran_date: { $gte: startOfMonth, $lte: currentDate }};
    
    // FILTER BY 3MONTHS
            } else if (timeperiod === "3months") {
                const last3Months = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 3,
                    1
                );
                query = { user, tran_date: { $gte: last3Months, $lte: currentDate }};
    // FILTER BY 6MONTHS        
            } else if (timeperiod === "6months") {
                const last6Months = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 6,
                    1
                );
                query = { user, tran_date: { $gte: last6Months, $lte: currentDate }};
    // FILTER WHOLE YEAR
            } else if (timeperiod === "year") {
                const startOfYear = new Date(
                    currentDate.getFullYear(),
                    1,
                    1
                );
                query = { tran_date: { $gte: startOfYear, $lte: currentDate}};
    // FILTER BY LASTWEEK        
            } else if (timeperiod === "week") {
                const lastWeek = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDate.getDate() - 7
                );
                const currentDay = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDate.getDate()
                );
                query = { user, tran_date: { $gte: lastWeek, $lte: currentDay}};
            }

            const transactions = await Transaction.find(query);
            res.status(200).json(transactions)
        } 
    } catch (error) {
        res.status(500).json({ msg: error });
    }
};

// UPDATE TRANSACTION
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_name,
            tran_description,
            tran_amount,
            tran_currency,
            tran_date,
            tran_id,
        } = req.body;
        const updatedTransaction = await Transaction.findByIdAndUpdate(id, {
            category_name,
            tran_description,
            tran_amount,
            tran_currency,
            tran_date,
            tran_id,
        });

        if (!updatedTransaction) {
            return res.status(404).json({error});
        }
        
        res.status(200).json({success: true, data: updatedTransaction });
    } catch (error) {
        res.status(500).json({ msg: error });
    }
};

module.exports = {
    newTransaction,
    getAllTransactions,
    deleteTransaction,
    updateTransaction,
    deleteAllTransactions,
};