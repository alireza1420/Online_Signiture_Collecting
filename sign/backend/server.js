const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3001;

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'files.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    // Create files table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      uuid TEXT UNIQUE NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      file_path TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      signature_data TEXT NOT NULL,
      signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
  }
});
const checkUser = (email, password) => {
  return new Promise((resolve,reject)=>{
    db.get('SELECT * FROM users WHERE email=? AND password=?',[email,password],(err,row)=>{
      if(err){
        reject(err);
      }else if(row){
        resolve(row);
      }else{
        resolve(null);
      }
    })
  })
}

// Create uploads directory if it doesn't exist
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Enable CORS for all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept, Accept-Encoding, Accept-Language, Content-Disposition');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Content-Disposition');
  next();
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and Word documents are allowed.'), false);
  }
};

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    // Create a sanitized filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizedFilename);
  }
});

// Create the multer instance with file size limits and file filter
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Define the /api/upload-pc route
app.post('/api/upload-pc', upload.single('file'), handleUploadError, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  // Generate UUID for the file
  const fileUuid = uuidv4();

  // Store file information in database
  db.run(
    'INSERT INTO files (filename, original_name, uuid, file_path) VALUES (?, ?, ?, ?)',
    [req.file.filename, req.file.originalname, fileUuid, req.file.path],
    function(err) {
      if (err) {
        console.error('Error storing file information:', err);
        return res.status(500).json({ error: 'Error storing file information' });
      }

      // Return success response with file details
      res.status(200).json({
        message: 'File uploaded successfully!',
        file: {
          id: this.lastID,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path,
          uuid: fileUuid
        }
      });
    }
  );
});

// Get all uploaded files
app.get('/api/files', (req, res) => {
  db.all('SELECT * FROM files ORDER BY upload_date DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching files:', err);
      return res.status(500).json({ error: 'Error fetching files' });
    }
    res.json(rows);
  });
});

// Get file by UUID
app.get('/api/files/:uuid', (req, res) => {
  db.get('SELECT * FROM files WHERE uuid = ?', [req.params.uuid], (err, row) => {
    if (err) {
      console.error('Error fetching file:', err);
      return res.status(500).json({ error: 'Error fetching file' });
    }
    if (!row) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(row);
  });
});

// Serve files directly from uploads directory
app.use('/uploads', express.static(uploadFolder));

// Serve file content by UUID
app.get('/api/files/:uuid/content', (req, res) => {
  db.get('SELECT * FROM files WHERE uuid = ?', [req.params.uuid], (err, row) => {
    if (err) {
      console.error('Error fetching file:', err);
      return res.status(500).json({ error: 'Error fetching file' });
    }
    if (!row) {
      console.error('File not found for UUID:', req.params.uuid);
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = row.file_path;
    console.log('Attempting to serve file:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File does not exist at path:', filePath);
      return res.status(404).json({ error: 'File not found on server' });
    }

    try {
      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const range = req.headers.range;

      // Set appropriate headers
      const contentType = getContentType(row.original_name);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.original_name)}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept, Accept-Encoding, Accept-Language, Content-Disposition');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Content-Disposition');
      res.setHeader('Accept-Ranges', 'bytes');

      // Handle range requests for PDF streaming
      if (range && contentType === 'application/pdf') {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunksize);
        
        const fileStream = fs.createReadStream(filePath, { start, end });
        fileStream.on('error', (error) => {
          console.error('Error streaming file:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file' });
          }
        });
        fileStream.pipe(res);
      } else {
        // For non-range requests or non-PDF files, stream the entire file
        res.setHeader('Content-Length', fileSize);
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (error) => {
          console.error('Error streaming file:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file' });
          }
        });
        fileStream.pipe(res);
      }
    } catch (error) {
      console.error('Error handling file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error processing file' });
      }
    }
  });
});

// Helper function to determine content type
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Add endpoint to handle consent submissions
app.post('/api/consent', express.json(), (req, res) => {
  const { firstName, lastName, dob, consent, documentId } = req.body;
  
  // Here you would typically save this to your database
  console.log('Received consent:', { firstName, lastName, dob, consent, documentId });
  
  res.json({ success: true, message: 'Consent recorded successfully' });
});

// Error handling for the entire app
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Upload directory: ${uploadFolder}`);
});