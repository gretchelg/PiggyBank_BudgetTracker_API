const User = require("../schemas/User")
const jwt = require("jsonwebtoken");

const createToken = (_id) => {
    return jwt.sign({_id}, process.env.SECRET, { expiresIn: "1d"});
};

// login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.status(200).json({ email, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

//signup user

const signupUser = async (req, res) => {
    const access_token = "";
    const { first_name, last_name, email, password, country_code } = req.body;
    
    try {
        const user = await User.signup(
        first_name,
        last_name,
        email,
        password,
        country_code,
        access_token
        );
        const token = createToken(user._id);
        res.status(200).json({ email, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// function updateUser
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = {};
        const {
            budgets,
        } = req.body;

    if (budgets) {
      // If budgets field is present in the request body, update the budgets array
        updateFields.budgets = budgets;
    }
    const user = await User.findOneAndUpdate({ _id: id }, updateFields, {
        new: true,
    });
    
    if (!user) {
        return res.status(404).json({ success: false, msg: "User not found" });
    }

    res
        .status(200)
        .json({ success: true, msg: "Your user has been updated", data: user.budgets });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};

// function deleteUser

const deleteOneUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
    
    if (!user) {
        res.status(404).json({ success: false, msg: "i don't know this user " });
    } else {
    res
        .status(200)
        .json({ success: true, msg: "your user has been deleted", data: user });
    }
    
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};

const budget = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

    if (!user) {
        return res.status(404).json({ success: false, msg: "user is not found" });
    }
    else {
        res.status(200).json(user.budgets);
    }

    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};

module.exports = {
    loginUser,
    signupUser,
    updateUser,
    deleteOneUser,
    budget,
};
