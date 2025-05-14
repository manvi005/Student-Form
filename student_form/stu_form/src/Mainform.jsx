import { useState, useEffect } from "react";
import myImage from "./assets/bookimg.png";
import { useParams, Link } from "react-router-dom";
import "./App.css";
import { QRCodeSVG } from 'qrcode.react';
import config from './config';

function Mainform() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [number, setNumber] = useState("");
  const [classno, setClassno] = useState("");
  const [regno, setRegno] = useState("");
  const [data, setData] = useState(false);
  const [status, setStatus] = useState("pending");
  const [editData, setEditData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalRegno, setOriginalRegno] = useState("");
  const { regnumber } = useParams();
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [showQR, setShowQR] = useState(false);

  // Generate QR code data
  const getQRCodeData = () => {
    if (!userInfo || !userInfo.Regno) return '';
    return `${config.SERVER_URL}/students/${userInfo.Regno}/qr`;
  };

  // Calculate age based on date of birth with validation
  useEffect(() => {
    if (dob) {
      console.log("Calculating age for DOB:", dob);
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      console.log("Initial calculated age:", calculatedAge);
      console.log("Month difference:", monthDiff);
      
      if (
        monthDiff < 0 || 
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        calculatedAge--;
      }
      
      console.log("Final calculated age:", calculatedAge);
      
      // Age validation (3 to 100)
      if (calculatedAge < 3 || calculatedAge > 100) {
        console.log("Age validation failed. Age must be between 3 and 100");
        setError("Age must be between 3 and 100 years old");
        setAge("");
      } else {
        console.log("Age validation passed. Setting age to:", calculatedAge);
        setError("");
        setAge(calculatedAge.toString());  // Convert to string for consistency
      }
    }
  }, [dob]);

  // Maximum date for DOB (100 years ago)
  const getMaxDobDate = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  // Minimum date for DOB (3 years ago)
  const getMinDobDate = () => {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    return minDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (regnumber) {
      fetch(`${config.SERVER_URL}/students/${regnumber}`, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      })
        .then((res) => res.json())
        .then((result) => {
          if (result) {
            setName(result.Name);
            setEmail(result.Email);
            setDob(result.Dob ? result.Dob.split('T')[0] : '');
            setRegno(result.Regno);
            setNumber(result.Number);
            setClassno(result.Classno);
            setStatus(result.status || "pending")
            setEditData(true);
            setIsEditing(true);
            setOriginalRegno(result.Regno);
            setUserInfo(result);
          } else {
            alert("Student not found");
          }
        })
        .catch((err) => console.error("Error loading student:", err));
    }
  }, [regnumber]);

  function submission() {
    console.log("Submitting form with DOB:", dob);
    console.log("Submitting form with age:", age);
    
    // Check if we have all required fields
    if (!name || !regno || !classno || !dob) {
      alert("Please fill in all required fields (Name, Registration Number, Class, Date of Birth)");
      return;
    }

    // Double check age calculation and validation
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (
      monthDiff < 0 || 
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      calculatedAge--;
    }

    // Validate age before submission
    if (calculatedAge < 3 || calculatedAge > 100) {
      alert("Age must be between 3 and 100 years old");
      return;
    }

    const formData = new FormData();
    if (photo) {
      formData.append("photo", photo);
    }
    
    formData.append("Name", name);
    formData.append("Email", email);
    formData.append("Dob", dob);
    formData.append("Age", calculatedAge.toString());  // Explicitly include calculated age
    formData.append("Number", number);
    formData.append("Regno", regno);
    formData.append("Classno", classno);
    formData.append("status", status);

    console.log("Sending form data with age:", calculatedAge);

    fetch(`${config.SERVER_URL}/students`, {
      method: "POST",
      body: formData
    })
    .then((res) => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.error || "Failed to save student");
        });
      }
      return res.json();
    })
    .then((data) => {
      alert(data.message || "Student saved successfully!");
      // Clear all form fields and states
      setAllNull();
      setPhoto(null);
      setEditData(false);
      setUserInfo(null); // Clear the user info from right box
      setIsEditing(false); // Reset editing state
      setShowQR(false); // Hide QR code if visible
    })
    .catch((err) => {
      console.error("Error:", err);
      alert(err.message || "Error saving student");
    });
  }

  function updateUser() {
    if (error) {
      alert(error);
      return;
    }

    const formData = new FormData();
    formData.append("Name", name);
    formData.append("Email", email);
    formData.append("Dob", dob);
    formData.append("Number", number);
    formData.append("Regno", regno);
    formData.append("Classno", classno);
    if (photo) {
      formData.append("photo", photo);
    }

    fetch(`${config.SERVER_URL}/students/${originalRegno}`, {
      method: "PUT",
      body: formData
    })
    .then((res) => res.text())
    .then((msg) => {
      alert(msg);
      setAllNull();
      setEditData(false);
      setIsEditing(false);
      setPhoto(null);
    })
    .catch((err) => console.error(err));
  }

  function updateStatus(newStatus) {
    fetch(`${config.SERVER_URL}/students/${userInfo.Regno}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ status: newStatus }),
    })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    })
    .then((data) => {
      alert(`Status updated to ${newStatus}`);
      setStatus(newStatus);
      setUserInfo({...userInfo, status: newStatus});
    })
    .catch((err) => console.error("Error updating status:", err));
  }

  function deleteStudent() {
    if (!userInfo?.Regno) {
      alert("No student selected to delete.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this student?"))
      return;

    fetch(`${config.SERVER_URL}/students/${originalRegno}`, {
      method: "DELETE",
    })
    .then((res) => {
      if (!res.ok) throw new Error("Delete failed");
      return res.text();
    })
    .then((msg) => {
      alert(msg);
      setAllNull();
      setEditData(false);
      setUserInfo(null);
      setIsEditing(false);
    })
    .catch((err) => {
      console.error(err);
      alert("Cannot delete this student. Check if the student exists.");
    });
  }

  function handleSearch() {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery) {
      alert("Please enter a registration number to search");
      return;
    }

    fetch(`${config.SERVER_URL}/students/${normalizedQuery}`, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
      .then((res) => res.json())
      .then((result) => {
        if (result && !result.error) {  // Check if result exists and is not an error
          console.log("Search result:", result); // Add logging to debug
          setUserInfo(result);
          setName(result.Name || "");
          setEmail(result.Email || "");
          setDob(result.Dob ? result.Dob.split('T')[0] : '');
          setRegno(result.Regno || "");
          setNumber(result.Number || "");
          setClassno(result.Classno || "");
          setStatus(result.status || "pending");
          setEditData(true);
          setIsEditing(true);
          setOriginalRegno(result.Regno);
          setShowQR(false); // Reset QR code display
        } else {
          alert("No matching data found!");
          setUserInfo(null);
          setAllNull();
          setEditData(false);
          setIsEditing(false);
        }
        setSearchQuery("");
      })
      .catch((err) => {
        console.error("Search error:", err);
        alert("Error searching for student");
        setUserInfo(null);
        setAllNull();
      });
  }

  function setAllNull() {
    setName("");
    setEmail("");
    setDob("");
    setNumber("");
    setRegno("");
    setClassno("");
    setStatus("pending");
    setError("");
  }

  const getStatusBadgeClass = (statusValue) => {
    return statusValue === "approved"
      ? "status-badge approved"
      : "status-badge pending";
  };

  return (
    <div className="background">
      <div className="box">
        <div className="left-box">
          <h1>
            Student Record <img className="book1" src={myImage} alt="book" />
          </h1>
          {userInfo && userInfo.Photo && (
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <img
                src={`${config.SERVER_URL}${userInfo.Photo}`}
                alt="Student"
                style={{
                  width: "150px",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }}
              />
            </div>
          )}

          {/* Error message display */}
          {error && (
            <div style={{ 
              color: 'red', 
              marginBottom: '10px', 
              fontWeight: 'bold' 
            }}>
              {error}
            </div>
          )}

          {[
            ["Name", name, setName],
            ["Email", email, setEmail],
            ["Registration no", regno, setRegno],
            ["Class no.", classno, setClassno],
            ["Contact no.", number, setNumber],
          ].map(([label, value, setter], i) => (
            <div key={label}>
              <label htmlFor={label.toLowerCase().replace(/ /g, "")}>
                {label}
              </label>
              <input
                type={label.includes("no.") ? "number" : "text"}
                name={label.toLowerCase().replace(/ /g, "")}
                placeholder={`Enter your ${label}`}
                onChange={(e) => {
                  if (!editData) {
                    alert(
                      "Please click 'Enter Data' to start filling the form."
                    );
                    return;
                  }
                  setter(e.target.value);
                }}
                value={editData ? value : ""}
              />
            </div>
          ))}
          
          {/* Date of Birth Input with Min and Max Dates */}
          <div>
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={dob}
              min={getMaxDobDate()} // 100 years ago
              max={getMinDobDate()} // 3 years ago
              onChange={(e) => {
                if (!editData) {
                  alert(
                    "Please click 'Enter Data' to start filling the form."
                  );
                  return;
                }
                setDob(e.target.value);
              }}
              disabled={!editData}
            />
          </div>

          {/* Read-only Age Display */}
          <div>
            <label htmlFor="age">Age</label>
            <input
              type="text"
              name="age"
              value={age || ""}
              readOnly
              disabled
            />
          </div>

          <div>
            <label htmlFor="status">Form Status</label>
            <select 
              name="status" 
              value={status}
              onChange={(e) => {
                if (!editData) {
                  alert("Please click 'Enter Data' before filling the form");
                  return;
                }
                setStatus(e.target.value);
              }}
              disabled={!editData}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          <div>
            {isEditing ? (
              <button style={{ marginRight: "5px" }} onClick={updateUser}>
                Update
              </button>
            ) : (
              <button style={{ marginRight: "5px" }} onClick={submission}>
                Submit
              </button>
            )}
            <button onClick={() => localStorage.clear()}>Clear Storage</button>
          </div>
        </div>

        <div className="right-box" style={{ textAlign: "center" }}>
          <br />
          <button style={{ marginRight: "5px" }} onClick={deleteStudent}>
            Delete Response
          </button>
          <button
            onClick={() => {
              setEditData(true);
              setAllNull();
            }}
          >
            Enter Data
          </button>

          <br />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter registration no."
            style={{ width: "200px" }}
          />
          <button style={{ marginLeft: "5px" }} onClick={handleSearch}>
            Search
          </button>

          {userInfo && (
            <div className="data">
              <div>Name - {userInfo.Name}</div>
              <div>Email - {userInfo.Email}</div>
              <div>Date of Birth - {userInfo.Dob ? new Date(userInfo.Dob).toLocaleDateString() : 'N/A'}</div>
              <div>Age - {age}</div>
              <div>Reg no. - {userInfo.Regno}</div>
              <div>Contact no. - {userInfo.Number}</div>
              <div>
                Status - <span className={getStatusBadgeClass(userInfo.status || "pending")}>
                  {userInfo.status || "pending"}
                </span>
              </div>
          
              <div style={{marginTop:"10px"}}>
                <button 
                  onClick={() => updateStatus("approved")}
                  className="status-button approve"
                  disabled={userInfo.status === "approved"}
                >
                  Approve
                </button>
                <button 
                  onClick={() => updateStatus("pending")}
                  className="status-button pending"
                  disabled={userInfo.status === "pending"}
                >
                  Mark as pending
                </button>
                <button 
                  onClick={() => setShowQR(!showQR)}
                  className="status-button"
                  style={{ marginLeft: '5px', marginTop:'5px' }}
                >
                  {showQR ? 'Hide QR Code' : 'Generate QR Code'}
                </button>
              </div>

              {showQR && userInfo && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <QRCodeSVG
                    value={getQRCodeData()}
                    size={256}
                    level="H"
                    includeMargin={true}
                    style={{ 
                      padding: '15px', 
                      background: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div style={{ 
                    marginTop: '10px', 
                    backgroundColor: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    <p style={{ margin: '0 0 5px 0' }}>
                      Scan with your phone's camera to view student details
                    </p>
                    <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>
                      URL: {getQRCodeData()}
                    </p>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
                      Note: This QR code will only work on devices connected to your local network
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setData(false);
              setUserInfo(null);
              setEditData(false);
              setAllNull();
              setSearchQuery("");
              setIsEditing(false);
            }}
          >
            Close Response
          </button>

          <Link to="/class/:classno" style={{ textDecoration: "none", marginLeft:"5px" }}>
            <button>View by class</button>
          </Link>

          <label htmlFor="photo">Student Photo</label>
          <input
            type="file"
            name="photo"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
          />
          
          <Link to="/calendar" style={{ textDecoration: "none" }}>
            <button>View Calendar</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Mainform;