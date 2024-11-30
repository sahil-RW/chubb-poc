const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors'); // Import cors middleware

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors());

// Set up file upload using multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/extract-text', upload.single('claimFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const pdfBuffer = req.file.buffer;

    // Extract text using pdf-parse
    const data = await pdfParse(pdfBuffer);
    const fullText = data.text;
    console.log(fullText)

    res.json({ text: fullText });
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    res.status(500).json({ error: 'Error extracting text from PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
