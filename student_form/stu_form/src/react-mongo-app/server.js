const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require('os');
require("dotenv").config();


// Use environment variables for server configuration
const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

const app = express();

// Configure CORS with specific options
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Ensure uploads folder exists - update for production compatibility
const uploadDir = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), "uploads")
  : path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure data folder exists for local storage
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Serve static files from uploads
app.use("/uploads", express.static(uploadDir));

// Flag for whether we're using MongoDB or local storage
let useLocalStorage = false;
let students = [];
let holidays = [];

// Try to connect to MongoDB - updated with environment variable
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/student_form", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 5 seconds timeout for MongoDB connection attempts
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log("Connected to MongoDB");
  
  // Load data from local storage if available
  try {
    const studentsFile = path.join(dataDir, "students.json");
    if (fs.existsSync(studentsFile)) {
      const data = fs.readFileSync(studentsFile, 'utf8');
      const savedStudents = JSON.parse(data);
      // Import local data to MongoDB
      if (savedStudents && savedStudents.length > 0) {
        Student.insertMany(savedStudents)
          .then(() => console.log("Imported local students to MongoDB"))
          .catch(err => console.log("Error importing students:", err));
      }
    }
  } catch (err) {
    console.error("Error reading local data:", err);
  }
})
.catch(err => {
  console.error("MongoDB connection error:", err);
  console.log("Using local storage mode");
  useLocalStorage = true;
  
  // Load data from local storage if available
  try {
    const studentsFile = path.join(dataDir, "students.json");
    const holidaysFile = path.join(dataDir, "holidays.json");
    
    if (fs.existsSync(studentsFile)) {
      const data = fs.readFileSync(studentsFile, 'utf8');
      students = JSON.parse(data);
      console.log(`Loaded ${students.length} students from local storage`);
    }
    
    if (fs.existsSync(holidaysFile)) {
      const data = fs.readFileSync(holidaysFile, 'utf8');
      holidays = JSON.parse(data);
      console.log(`Loaded ${holidays.length} holidays from local storage`);
    }
  } catch (err) {
    console.error("Error reading local data:", err);
  }
});

// Helper function to save data to local storage
function saveLocalData() {
  if (useLocalStorage) {
    try {
      fs.writeFileSync(path.join(dataDir, "students.json"), JSON.stringify(students, null, 2));
      fs.writeFileSync(path.join(dataDir, "holidays.json"), JSON.stringify(holidays, null, 2));
    } catch (err) {
      console.error("Error saving local data:", err);
    }
  }
}

// Mongoose schema
const studentSchema = new mongoose.Schema({
  Name: String,
  Email: String,
  Age: Number,
  Number: String,
  Regno: { type: String, required: true, unique: true },
  Classno: String,
  Photo: String, // URL path to photo
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Student = mongoose.model("Student", studentSchema);

// Mongoose schema for holidays
const holidaySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Holiday = mongoose.model("Holiday", holidaySchema);

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // timestamp.jpg
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  }
}).single("photo");

// Add SERVER_URL to response locals for use in templates
app.use((req, res, next) => {
  res.locals.serverUrl = SERVER_URL;
  next();
});

// Create student with photo
app.post("/students", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Upload error in create:", err);
      return res.status(400).json({ error: err.message });
    }
    
    try {
      console.log("Create student request body:", req.body);
      console.log("Create student file:", req.file);
      
      const studentData = {
        Name: req.body.Name,
        Email: req.body.Email,
        Age: req.body.Age ? Number(req.body.Age) : undefined,
        Number: req.body.Number,
        Regno: req.body.Regno,
        Classno: req.body.Classno,
        status: req.body.status || 'pending',
        createdAt: new Date()
      };
      
      // Add photo path if a file was uploaded
      if (req.file) {
        studentData.Photo = `/uploads/${req.file.filename}`;
        console.log("Added photo path in create:", studentData.Photo);
      }
      
      console.log("Final student data for creation:", studentData);
      
      // Validate required fields
      if (!studentData.Regno) {
        return res.status(400).json({ error: "Registration number is required" });
      }
      
      if (useLocalStorage) {
        // Check if student already exists in local storage
        const existingStudentIndex = students.findIndex(s => s.Regno === studentData.Regno);
        if (existingStudentIndex !== -1) {
          return res.status(409).json({ error: "Student with this registration number already exists" });
        }
        
        // Add ID to the student data
        studentData._id = Date.now().toString();
        
        // Add to the students array
        students.push(studentData);
        
        // Save to local storage
        saveLocalData();
        
        res.status(201).json({
          message: "Student created successfully",
          student: studentData
        });
      } else {
        // Using MongoDB
        // Check if student with registration number already exists
        const existingStudent = await Student.findOne({ Regno: studentData.Regno });
        if (existingStudent) {
          return res.status(409).json({ error: "Student with this registration number already exists" });
        }
        
        // Create and save new student
        const student = new Student(studentData);
        const savedStudent = await student.save();
        
        console.log("Student created successfully:", savedStudent);
        res.status(201).json({ 
          message: "Student created successfully", 
          student: savedStudent 
        });
      }
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(500).json({ error: `Error creating student: ${error.message}` });
    }
  });
});

// Get all students
app.get("/students", async (req, res) => {
  try {
    if (useLocalStorage) {
      // Sort by creation date, newest first
      const sortedStudents = [...students].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      res.json(sortedStudents);
    } else {
      const students = await Student.find().sort({ createdAt: -1 });
      res.json(students);
    }
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Error fetching students" });
  }
});

// Get students by class
app.get("/students/class/:classno", async (req, res) => {
  try {
    if (useLocalStorage) {
      // Filter students by class and sort by name
      const classStudents = students
        .filter(s => s.Classno === req.params.classno)
        .sort((a, b) => a.Name.localeCompare(b.Name));
      res.json(classStudents);
    } else {
      const students = await Student.find({ Classno: req.params.classno }).sort({ Name: 1 });
      res.json(students);
    }
  } catch (error) {
    console.error("Error fetching students by class:", error);
    res.status(500).json({ error: "Error fetching students by class" });
  }
});

// Read single student - IMPORTANT: Place this after the class route to avoid conflict
app.get("/students/:regno", async (req, res) => {
  try {
    console.log("Searching for student with regno:", req.params.regno);
    // Convert the search query to lowercase
    const searchRegno = req.params.regno.toLowerCase();
    
    if (useLocalStorage) {
      // Find student with case-insensitive regno
      const student = students.find(s => 
        s.Regno.toLowerCase() === searchRegno
      );
      
      if (student) {
        console.log("Found student:", student);
        res.json(student);
      } else {
        console.log("No student found with regno:", req.params.regno);
        res.status(404).json({ error: "Student not found" });
      }
    } else {
      // Use case-insensitive regex for search in MongoDB
      const student = await Student.findOne({ 
        Regno: { $regex: new RegExp(`^${searchRegno}$`, 'i') }
      });
      
      if (student) {
        console.log("Found student:", student);
        res.json(student);
      } else {
        console.log("No student found with regno:", req.params.regno);
        res.status(404).json({ error: "Student not found" });
      }
    }
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ error: "Error fetching student" });
  }
});

// Update student (with optional photo)
app.put("/students/:regno", (req, res) => {
  console.log("Update request received for regno:", req.params.regno);
  console.log("Headers:", req.headers);
  
  upload(req, res, async (err) => {
    if (err) {
      console.error("Upload error in update:", err);
      return res.status(400).json({ error: err.message });
    }
    
    try {
      console.log("Raw request body:", req.body);
      
      // Create an update object with all fields directly from form
      const updateData = {};
      
      // Process all fields from the form
      if (req.body.Name !== undefined) updateData.Name = req.body.Name;
      if (req.body.Email !== undefined) updateData.Email = req.body.Email;
      if (req.body.Age !== undefined) updateData.Age = Number(req.body.Age);
      if (req.body.Number !== undefined) updateData.Number = req.body.Number;
      if (req.body.Classno !== undefined) updateData.Classno = req.body.Classno;
      
      if (useLocalStorage) {
        // Find student in the array
        const studentIndex = students.findIndex(s => 
          s.Regno.toLowerCase() === req.params.regno.toLowerCase()
        );
        
        if (studentIndex === -1) {
          console.log("Student not found with Regno:", req.params.regno);
          return res.status(404).json({ error: "Student not found" });
        }
        
        // Add photo path if a file was uploaded
        if (req.file) {
          updateData.Photo = `/uploads/${req.file.filename}`;
          console.log("New photo path:", updateData.Photo);
          
          // Delete old photo if it exists
          if (students[studentIndex].Photo) {
            try {
              const oldPhotoPath = path.join(__dirname, students[studentIndex].Photo);
              if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                console.log("Deleted old photo:", students[studentIndex].Photo);
              }
            } catch (photoErr) {
              console.error("Error deleting old photo:", photoErr);
              // Continue with update even if photo deletion fails
            }
          }
        }
        
        // Update the student in the array
        students[studentIndex] = {
          ...students[studentIndex],
          ...updateData
        };
        
        // Save to local storage
        saveLocalData();
        
        console.log("Update result:", students[studentIndex]);
        res.json({ 
          message: "Student updated successfully", 
          student: students[studentIndex] 
        });
      } else {
        // Add photo path if a file was uploaded
        if (req.file) {
          updateData.Photo = `/uploads/${req.file.filename}`;
          console.log("New photo path:", updateData.Photo);
          
          // Find old photo to delete it
          const oldStudent = await Student.findOne({ Regno: req.params.regno });
          if (oldStudent && oldStudent.Photo) {
            try {
              const oldPhotoPath = path.join(__dirname, oldStudent.Photo);
              if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                console.log("Deleted old photo:", oldStudent.Photo);
              }
            } catch (photoErr) {
              console.error("Error deleting old photo:", photoErr);
              // Continue with update even if photo deletion fails
            }
          }
        }
        
        console.log("Final update data:", updateData);
        
        // Check if student exists before updating
        const existingStudent = await Student.findOne({ Regno: req.params.regno });
        if (!existingStudent) {
          console.log("Student not found with Regno:", req.params.regno);
          return res.status(404).json({ error: "Student not found" });
        }
        
        // Perform the update with $set to update only specified fields
        const result = await Student.findOneAndUpdate(
          { Regno: req.params.regno },
          { $set: updateData },
          { new: true } // Return the updated document
        );
        
        console.log("Update result:", result);
        res.json({ 
          message: "Student updated successfully", 
          student: result 
        });
      }
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ error: `Error updating student: ${error.message}` });
    }
  });
});

// Delete specific student
app.delete("/students/:regno", async (req, res) => {
  try {
    if (useLocalStorage) {
      // Find the student index
      const studentIndex = students.findIndex(s => 
        s.Regno.toLowerCase() === req.params.regno.toLowerCase()
      );
      
      if (studentIndex === -1) {
        return res.status(404).json({ error: "Student not found" });
      }
      
      // Delete student's photo if it exists
      if (students[studentIndex].Photo) {
        const photoPath = path.join(__dirname, students[studentIndex].Photo);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }
      
      // Remove the student from the array
      students.splice(studentIndex, 1);
      
      // Save to local storage
      saveLocalData();
      
      res.json({ message: "Student deleted successfully" });
    } else {
      const student = await Student.findOne({ Regno: req.params.regno });
      
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      
      // Delete student's photo if it exists
      if (student.Photo) {
        const photoPath = path.join(__dirname, student.Photo);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }
      
      await Student.deleteOne({ _id: student._id });
      res.json({ message: "Student deleted successfully" });
    }
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Error deleting student" });
  }
});

// Delete all students
app.delete("/students", async (req, res) => {
  try {
    // Delete all photos from uploads directory
    const files = fs.readdirSync(uploadDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(uploadDir, file));
    });
    
    // Delete all student records
    await Student.deleteMany({});
    res.json({ message: "All students deleted successfully" });
  } catch (error) {
    console.error("Error deleting all students:", error);
    res.status(500).json({ error: "Error deleting all students" });
  }
});

// Holiday routes - add these routes to your server.js file

// Create a new holiday
app.post("/holidays", async (req, res) => {
  try {
    const { date, description } = req.body;
    
    if (!date || !description) {
      return res.status(400).json({ error: "Date and description are required" });
    }
    
    if (useLocalStorage) {
      const newHoliday = {
        _id: Date.now().toString(),
        date: new Date(date),
        description,
        createdAt: new Date()
      };
      
      holidays.push(newHoliday);
      saveLocalData();
      
      res.status(201).json({ 
        message: "Holiday created successfully", 
        holiday: newHoliday 
      });
    } else {
      const newHoliday = new Holiday({
        date: new Date(date),
        description
      });
      
      const savedHoliday = await newHoliday.save();
      res.status(201).json({ 
        message: "Holiday created successfully", 
        holiday: savedHoliday 
      });
    }
  } catch (error) {
    console.error("Error creating holiday:", error);
    res.status(500).json({ error: "Error creating holiday" });
  }
});

// Get all holidays
app.get("/holidays", async (req, res) => {
  try {
    if (useLocalStorage) {
      // Sort by date
      const sortedHolidays = [...holidays].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      res.json(sortedHolidays);
    } else {
      const holidays = await Holiday.find().sort({ date: 1 });
      res.json(holidays);
    }
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({ error: "Error fetching holidays" });
  }
});

// Update a holiday
app.put("/holidays/:id", async (req, res) => {
  try {
    const { date, description } = req.body;
    
    if (!date || !description) {
      return res.status(400).json({ error: "Date and description are required" });
    }
    
    if (useLocalStorage) {
      const holidayIndex = holidays.findIndex(h => h._id === req.params.id);
      
      if (holidayIndex === -1) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      
      holidays[holidayIndex] = {
        ...holidays[holidayIndex],
        date: new Date(date),
        description
      };
      
      saveLocalData();
      
      res.json({ 
        message: "Holiday updated successfully", 
        holiday: holidays[holidayIndex] 
      });
    } else {
      const updatedHoliday = await Holiday.findByIdAndUpdate(
        req.params.id,
        { 
          date: new Date(date),
          description 
        },
        { new: true }
      );
      
      if (!updatedHoliday) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      
      res.json({ 
        message: "Holiday updated successfully", 
        holiday: updatedHoliday 
      });
    }
  } catch (error) {
    console.error("Error updating holiday:", error);
    res.status(500).json({ error: "Error updating holiday" });
  }
});

// Delete a holiday
app.delete("/holidays/:id", async (req, res) => {
  try {
    if (useLocalStorage) {
      const holidayIndex = holidays.findIndex(h => h._id === req.params.id);
      
      if (holidayIndex === -1) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      
      holidays.splice(holidayIndex, 1);
      saveLocalData();
      
      res.json({ message: "Holiday deleted successfully" });
    } else {
      const deletedHoliday = await Holiday.findByIdAndDelete(req.params.id);
      
      if (!deletedHoliday) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      
      res.json({ message: "Holiday deleted successfully" });
    }
  } catch (error) {
    console.error("Error deleting holiday:", error);
    res.status(500).json({ error: "Error deleting holiday" });
  }
});

app.patch("/students/:regno/status", async (req, res)=>{
  try{
    const{status} = req.body;
    if (!status ||!['pending', 'approved'].includes(status)){
      return res.status(400).json({
        error:"Valid status is required"
      });
    }

    if (useLocalStorage) {
      // Find student in the array
      const studentIndex = students.findIndex(s => 
        s.Regno.toLowerCase() === req.params.regno.toLowerCase()
      );
      
      if(studentIndex === -1){
        return res.status(404).json({error:"Student not found"});
      }
      
      // Update the student status
      students[studentIndex].status = status;
      
      // Save to local storage
      saveLocalData();
      
      res.json(students[studentIndex]);
    } else {
      const updateStudent = await Student.findOneAndUpdate(
        {Regno:req.params.regno},
        {$set:{status}},
        {new: true}
      );
      
      if(!updateStudent){
        return res.status(404).json({error:"Student not found"});
      }
      
      res.json(updateStudent);
    }
  } catch(error){
    console.error("Error updating student status:", error);
    res.status(500).json({error:"Error updating student status"});
  }
});

// QR code endpoint for student info
app.get("/students/:regno/qr", async (req, res) => {
  try {
    console.log("QR Code request for regno:", req.params.regno);
    
    // Add caching headers
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.set('Access-Control-Allow-Origin', '*'); // Ensure CORS is enabled
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('X-Frame-Options', 'ALLOWALL'); // Allow embedding in iframes
    
    let student;
    
    if (useLocalStorage) {
      // Find student in local storage (case-insensitive search)
      const searchRegno = req.params.regno.toLowerCase();
      student = students.find(s => s.Regno.toLowerCase() === searchRegno);
    } else {
      // Find student in MongoDB
      student = await Student.findOne(
        { Regno: { $regex: new RegExp(`^${req.params.regno}$`, 'i') } },
        {
          Name: 1,
          Regno: 1,
          Number: 1,
          Photo: 1,
          status: 1,
          Classno: 1,
          _id: 0
        }
      );
    }
    
    if (!student) {
      console.log("Student not found for QR code");
      return res.status(404).send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: system-ui; padding: 20px; text-align: center; }
              .error { color: #dc3545; }
            </style>
          </head>
          <body>
            <h2 class="error">Student Not Found</h2>
            <p>No student found with registration number: ${req.params.regno}</p>
          </body>
        </html>
      `);
    }

    // Always return HTML for QR code scans
    console.log("Sending HTML response for QR code");
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>${student.Name} - Student Information</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="theme-color" content="#ffffff">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 16px;
            background-color: #f8f9fa;
            line-height: 1.5;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
          }
          .photo-container {
            width: 100%;
            text-align: center;
            margin-bottom: 24px;
            background: #f8f9fa;
            padding: 16px;
            border-radius: 12px;
          }
          .student-photo {
            width: 180px;
            height: 180px;
            border-radius: 12px;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .info-row {
            padding: 16px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            transition: background-color 0.2s;
          }
          .info-row:hover {
            background-color: #f8f9fa;
          }
          .label {
            font-weight: 600;
            color: #495057;
            width: 140px;
          }
          .value {
            flex: 1;
            color: #212529;
          }
          h1 {
            color: #212529;
            text-align: center;
            margin: 0 0 24px;
            font-size: 24px;
            font-weight: 600;
          }
          .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 500;
            font-size: 14px;
            text-transform: capitalize;
          }
          .status.approved {
            background-color: #d4edda;
            color: #155724;
          }
          .status.pending {
            background-color: #fff3cd;
            color: #856404;
          }
          @media (max-width: 480px) {
            body { 
              padding: 12px;
            }
            .container {
              padding: 16px;
            }
            h1 {
              font-size: 20px;
            }
            .student-photo {
              width: 150px;
              height: 150px;
            }
            .info-row {
              padding: 12px;
            }
            .label {
              width: 100px;
              font-size: 14px;
            }
            .value {
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Student Information</h1>
          ${student.Photo ? `
            <div class="photo-container">
              <img 
                src="${student.Photo.startsWith('http') ? student.Photo : SERVER_URL + student.Photo}" 
                alt="${student.Name}'s Photo"
                class="student-photo"
                loading="lazy"
                onerror="this.style.display='none';this.parentElement.innerHTML='<p style=\\"color:#666;\\">Photo not available</p>'"
              />
            </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">${student.Name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Reg No:</span>
            <span class="value">${student.Regno || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Class:</span>
            <span class="value">${student.Classno || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Contact:</span>
            <span class="value">${student.Number || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Status:</span>
            <span class="value">
              <span class="status ${student.status === 'approved' ? 'approved' : 'pending'}">
                ${student.status || 'pending'}
              </span>
            </span>
          </div>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(html);
  } catch (error) {
    console.error("Error in QR code endpoint:", error);
    res.status(500).send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Error</h2>
          <p>Unable to fetch student information. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', '..', 'public');
  app.use(express.static(publicPath));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/students') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${SERVER_URL}`);
  console.log(`QR Code endpoint: ${SERVER_URL}/students/{regno}/qr`);
});
