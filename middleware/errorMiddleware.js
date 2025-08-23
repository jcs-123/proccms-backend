const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Multer errors
  if (err.message === 'Invalid file type. Only images and documents are allowed.') {
    return res.status(400).json({ message: err.message });
  }

  // Default to 500 server error
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
};

export default errorHandler;