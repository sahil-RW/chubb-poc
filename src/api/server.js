const multer = require("multer");
const pdfParse = require("pdf-parse");
const cors = require("cors");

// Create a memory storage instance for multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Wrapping multer in a promise for serverless compatibility
const multerMiddleware = (req, res) =>
  new Promise((resolve, reject) => {
    upload.single("claimFile")(req, res, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });

export default async function handler(req, res) {
  // Enable CORS
  cors()(req, res, () => {});

  if (req.method === "POST") {
    try {
      await multerMiddleware(req, res);

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const pdfBuffer = req.file.buffer;

      // Extract text using pdf-parse
      const data = await pdfParse(pdfBuffer);
      const fullText = data.text;
      console.log(fullText);

      res.json({ text: fullText });
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      res.status(500).json({ error: "Error extracting text from PDF" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
