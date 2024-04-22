const Transaction = require("../schemas/Transaction");
const { Configuration, PlaidEnvironments, PlaidApi } = require("plaid");

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || "sandbox";
// const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || "";
const TEST_MODE = process.env.TEST_MODE || false

let ACCESS_TOKEN = null;
let PUBLIC_TOKEN = null;
let ITEM_ID = null;

const configuration = new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV],
    baseOptions: {
    headers: {
        "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
        "PLAID-SECRET": PLAID_SECRET,
        "Plaid-Version": "2020-09-14",
        },
    },
});

const client = new PlaidApi(configuration);

//==============================================================================================
// Create a link token with configs which we can then use to initialize Plaid Link client-side.
//===============================================================================================

const createLinkToken = async function (req, res) {

    const { _id } = req.params;

    const configs = {
        user: {
            // This should correspond to a unique id for the current user.
            client_user_id: _id,
        },
        client_name: "Plaid Test App",
        products: ["transactions","auth"],
        language: "en",
        webhook: "https://webhook.example.com",
        country_codes: ["DE"],
    };
    try {
        const createTokenResponse = await client.linkTokenCreate(configs);
        res.status(200).json(createTokenResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//==============================================================================================
// Exchange token flow - exchange a Link public_token for an API access_token
//==============================================================================================

const setAccessToken = async function (req, res, next) {
    PUBLIC_TOKEN = req.body.public_token;

    try {
        const tokenResponse = await client.itemPublicTokenExchange({
            public_token: PUBLIC_TOKEN,
        });

        ACCESS_TOKEN = tokenResponse.data.access_token;
        ITEM_ID = tokenResponse.data.item_id;

        res.status(200).json({
            item_id: ITEM_ID,
            message: "Public token exchange is successful",
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//============================================================================================== 
// Retrieve Transactions for an Item
//==============================================================================================

const syncTransactions = async function (req, res, next) {
    const { id } = req.params;
    try {
        // Set cursor to empty to receive all historical updates
        let cursor = null;

        // New transaction updates since "cursor". These are accumulators.
        let added = [];
        let modified = [];

        // Removed transaction ids. These are accumulators.
        let removed = [];
        let hasMore = true;

        // Iterate through each page of new transaction updates for item
        while (hasMore) {
            const request = {
                access_token: ACCESS_TOKEN,
                cursor: cursor,
            };

            // fetch transactions from plaid
            let data
            if (TEST_MODE === 'true') {
                data = getStaticPlaidTransactions()
            } else {
                data = await fetchTransactionsFromPlaid(request)
            }

            // Add the fetched transaction to the accumulators
            added = added.concat(data.added);
            modified = modified.concat(data.modified);
            removed = removed.concat(data.removed);
            hasMore = data.has_more;

            // Update cursor to the next cursor
            cursor = data.next_cursor;
        }


        const compareTxnsByDateAscending = (a, b) =>
            (a.date > b.date) - (a.date < b.date);

        // Return the 8 most recent transactions
        const recently_added = [...added]
            .sort(compareTxnsByDateAscending)
            .slice(-8);
        
        // convert plaid transactions to our own schema, and update/insert them to db
        recently_added.map(async addedTransaction => {
            const newTransaction = getTransactionFromImportedTxn(addedTransaction, id)

            newTransaction.category_name = mapCategoryFromBank(addedTransaction.category)

            await updateOrInsertTxn(newTransaction)  
        })

        res.status(200).json({ latest_transactions: recently_added });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// fetch plaid transactions with retry on failure
async function fetchTransactionsFromPlaid(request) {

        const SLEEP_TIME = 10000;
        const MAX_RETRY = 3;

        var retries = MAX_RETRY;
        while (retries > 0) {

            // get transactions from plaid; return data on success
            try {
                const response = await client.transactionsSync(request);
                if (response.data.added.length > 0) {
                    return response.data;
                }
            } catch (e) {
                console.error("ERROR: transactionsSync failed:", e);
            }

            // failed to get plaid txns; sleep before next retry
            await new Promise((resolve) => {
                setTimeout((_) => {
                resolve();
                }, SLEEP_TIME); // sleep for N seconds
            });

            // proceed to next retry
            retries = retries - 1;
        }
    }

    // update/insert the plaid transaction to our DB
    async function updateOrInsertTxn(newTransaction) {
        const foundTxn = await findTransactionByTranID(newTransaction.tran_id)
    
        if (foundTxn == null){
            insertTransaction(newTransaction)
            return
        }

        updateTransaction(newTransaction)
    }

    async function findTransactionByTranID(tranID){
        try {
            const foundTransaction = await Transaction.findOne({ tran_id: tranID });
            if (!foundTransaction) {
                return null;
            }

        } catch (error) {
        }
    }

    async function updateTransaction(newTransaction){
        try {
            const updatedTransaction = await Transaction.findOneAndUpdate(
                { tran_id: newTransaction.tran_id }, // Query to find the document by its ID
                { $set: newTransaction }, // Updated data to be applied using the $set operator
                { new: true } // Options: returns the modified document after update
            );

            if (!updatedTransaction) {
                console.log('Transaction not found');
                return;
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
        }
    }

    async function insertTransaction(newTransaction){
        try {
            const newTran = await Transaction.create(newTransaction);
        } catch (error) {
            console.error('Error adding transaction:', error);
        }  
    }


    function mapCategoryFromBank(category){
        if (category.length == 0) {
            return "others"
        }

        // TODO lowercase the category
        const lowercasedCategory = category[0]

        switch (lowercasedCategory){
        case "Food and Drink":
            return "eatingout"
        case "Travel":
            return "transport"  
        case "Payment":
            return "bills" 
        default:
            return "others"
        }
    }
    // reformat the plaid transaction to our own transaction schema
    function getTransactionFromImportedTxn(importedTxn, id) {
        const txn = {
            category_name: importedTxn.category,
            tran_description: importedTxn.name,
            tran_amount: Math.abs(importedTxn.amount),
            tran_sign: importedTxn.tran_sign ? importedTxn.tran_sign : "DR", 
            tran_currency: importedTxn.tran_currency ? importedTxn.tran_currency : "DE", 
            tran_date: importedTxn.authorized_date ? importedTxn.authorized_date : new Date(),
            user: id, 
            tran_id: importedTxn.transaction_id,
        }
        return txn
    }
    // for test purpose static data only
    function getStaticPlaidTransactions(){

        data = {
            added: [
            {
                category: ["medicine", "health"],
                name: "KOENIGIN LUISE APOTHEK/BERLIN/DE",
                amount: 26.37, 
                tran_sign: "DR", 
                tran_currency: "DE",
                authorized_date: "2024-04-16T00:00:00.000Z",
                transaction_id: "4673956022",
            },
            {
                category: ["deposits", "transfer"],
                name: "SEPA-Payment Transfer",
                amount: 400.00, 
                tran_sign: "CR", 
                tran_currency: "DE",
                authorized_date: "2024-04-20T00:00:00.000Z",
                transaction_id: "21005000",
            },
            {
                category: ["work", "shopping"],
                name: "AMZN Mktp DE.H21I86JR5//800-279-6620/LU",
                amount: 22.58, 
                tran_sign: "DR", 
                tran_currency: "DE",
                authorized_date: "2024-04-15T00:00:00.000Z",
                transaction_id: "AZxVGdvjJxtwREJjnKWAspNwLR5WMau9D4A3V",
            },
            {
                category: ["savings", "transfer"],
                name: "SEPA-Payment Transfer",
                amount: 200.00, 
                tran_sign: "CR", 
                tran_currency: "DE",
                authorized_date: "2024-04-14T00:00:00.000Z",
                transaction_id: "rGgDae4bvgS9LyjwoGxZIv9mpag1Wlc74d6No",
            },
            {
                category: ["communication", "bills"],
                name: "Gebuehr fuer o2 my Prepaid S fuer Ihr Prepaid-Konto",
                amount: 9.99, 
                tran_sign: "DR", 
                tran_currency: "DE",
                authorized_date: "2024-04-09T00:00:00.000Z",
                transaction_id: "W7LMQber3Liz9JQwEk46CqMAy4gGRwU68P1q5",
            },
            {
                category: ["insurance", "health"],
                name: "SEPA-Direct Debit Feather by Stripe via PPRO",
                amount: 9.00, 
                tran_sign: "DR", 
                tran_currency: "DE",
                authorized_date: "2024-04-06T00:00:00.000Z",
                transaction_id: "13005000",
            },
            ],
            modified: [],
            removed: [],
            hasMore: false,
            next_cursor: null
        }
        return data
    }

module.exports = {
createLinkToken,
setAccessToken,
syncTransactions,
};
