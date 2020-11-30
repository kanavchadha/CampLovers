const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: 'dzzb5loan',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'camplovers',
        allowedFormats: ['jpeg', 'png', 'jpg', 'gif']
    }
});

module.exports = {
    cloudinary,
    storage
}