const Image = require('../schemas/Image');

// Get the pictures
const getImage = async (req, res) => {
    try {
        const image = await Image.find();
        return res.status(200).json({ image })
    }
    catch (error) {
        return res.status(500).json({ error });
    }
}

// Upload a picture
const uploadImage = async (req, res) => {
    console.log("starting upload")
    try {
        if(req.file && req.file.path) {
            const image = new Image({
            url : req.file.path,
            description: req.body.desc   
            });

            await image.save()
            return res.status(200).json({msg: "Image save successfully", url: image.url})
        
        } else {
            return res.status(422).json({ error })
        }
    } 
    catch (error) {
        return res.status(500).json({ error });

    }
}

module.exports = {
    getImage,
    uploadImage,
};