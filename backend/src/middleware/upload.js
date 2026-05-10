const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/appError');

// Store in memory for Cloudinary upload
const storage = multer.memoryStorage();

const fileFilter = (allowedMimeTypes) => (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(`File type ${file.mimetype} not allowed`, 400), false);
    }
};

// Image-only upload
const uploadImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
});

// Document upload (images + PDFs)
const uploadDocument = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
});

// Generic upload handler wrapper
const handleUpload = (upload) => (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new AppError('File too large', 400));
            }
            return next(new AppError(err.message, 400));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

module.exports = { uploadImage, uploadDocument, handleUpload };