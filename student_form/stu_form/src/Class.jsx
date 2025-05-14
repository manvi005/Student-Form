import React, { useState, useEffect } from "react";
import "./Class.css";
import { Link, useParams } from "react-router-dom";
import "./App.css";
import config from './config';

const SERVER_URL = config.SERVER_URL;

function Class() {
  const [classQuery, setClassQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const { classno } = useParams(); // Get class number from URL params

  // useEffect to fetch students if class number is in URL
  useEffect(() => {
    if (classno && classno !== ':classno') {
      setClassQuery(classno);
      fetchStudentsByClass(classno);
    }
  }, [classno]);

  // Function to calculate age from date of birth with validation
  const calculateAge = (dob) => {
    if (!dob) return '';
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (
      monthDiff < 0 || 
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    
    // Return the calculated age if it's valid, otherwise return the stored age
    return (age >= 3 && age <= 100) ? age.toString() : '';
  };

  const fetchStudentsByClass = (query) => {
    // Reset previous state
    setStudents([]);
    setError("");

    // Validate class query
    if (!query.trim()) {
      setError("Please enter a valid class number");
      return;
    }

    console.log(`Fetching students for class: ${query}`); // Debug log

    fetch(`${SERVER_URL}/students/class/${query.trim()}`)
      .then((res) => {
        console.log('Fetch response:', res); // Debug log
        if (!res.ok) {
          throw new Error("Failed to fetch students");
        }
        return res.json();
      })
      .then((data) => {
        console.log('Students data:', data); // Debug log

        if (data.length === 0) {
          setError(`No students found in class ${query}`);
          return;
        }

        // Map the students data to include calculated age
        const studentsWithAge = data.map(student => ({
          ...student,
          calculatedAge: calculateAge(student.Dob)
        }));

        // Filter out students with invalid ages only if they don't have a stored age
        const validStudents = studentsWithAge.filter(student => 
          student.calculatedAge !== '' || student.Age
        );

        if (validStudents.length === 0) {
          setError(`No students with valid age found in class ${query}`);
          return;
        }

        setStudents(validStudents);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError(err.message || "Error fetching students");
      });
  };

  const getStatusBadgeClass = (statusValue) => {
    return statusValue === "approved"
      ? "status-badge approved"
      : "status-badge pending";
  };

  return (
    <div className="class-view" style={{ display: "block", color: "black", padding: "20px" }}>
      <h2>View Students by Class</h2>
      
      {/* Error display */}
      {error && (
        <div 
          style={{ 
            color: 'red', 
            marginBottom: '15px', 
            padding: '10px', 
            backgroundColor: '#ffeeee', 
            borderRadius: '5px' 
          }}
        >
          {error}
        </div>
      )}

      <div style={{display:"flex", marginBottom:"20px"}}>
        <input
          type="text"
          placeholder="Enter class number"
          value={classQuery}
          onChange={(e) => {
            setClassQuery(e.target.value);
            // Clear error when user starts typing
            if (error) setError("");
          }}
          style={{ 
            marginRight: "10px", 
            padding: "5px", 
            flex: 1,
            borderColor: error ? 'red' : ''
          }}
        />
        <button 
          onClick={() => fetchStudentsByClass(classQuery)} 
          disabled={!classQuery.trim()} 
          style={{
            padding:"8px 16px", 
            backgroundColor: !classQuery.trim() ? '#cccccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !classQuery.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          Search
        </button>
        <Link to="/" style={{marginLeft:"10px"}}>
          <button style={{
            padding:"8px 16px",
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}>
            Back to Form
          </button>
        </Link>
      </div>

      {students.length > 0 && (
        <div className="table-container">
          <table
            border="1"
            style={{
              marginTop: "20px",
              width: "100%",
              textAlign: "center",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Email</th>
                <th>Date of Birth</th>
                <th>Age</th>
                <th>Reg No</th>
                <th>Contact</th>
                <th>Class No</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((stu) => {
                // Use stored Age if available, otherwise use calculated age
                const displayAge = stu.Age || calculateAge(stu.Dob);
                return (
                  <tr key={stu._id}>
                    <td className="photo-cell">
                      {stu.Photo ? (
                        <img 
                          className="photo-container"
                          src={`${SERVER_URL}${stu.Photo}`}
                          alt="Student"
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      ) : (
                        "No Photo"
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/form/${stu.Regno}`}
                        style={{
                          textDecoration: "none",
                          color: "#007BFF",
                          fontWeight: "bold",
                        }}
                      >
                        {stu.Name}
                      </Link>
                    </td>
                    <td>{stu.Email}</td>
                    <td>{stu.Dob ? new Date(stu.Dob).toLocaleDateString() : 'N/A'}</td>
                    <td>{displayAge}</td>
                    <td>{stu.Regno}</td>
                    <td>{stu.Number}</td>
                    <td>{stu.Classno}</td>
                    <td>
                      <span className={getStatusBadgeClass(stu.status || "pending")}>
                        {stu.status || "pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Class;