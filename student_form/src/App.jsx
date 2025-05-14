import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [students, setStudents] = useState([])

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await fetch('https://student-form-server.onrender.com/students')
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  return (
    <div className="App">
      <h1>Student Form</h1>
      <div className="student-list">
        {students.map(student => (
          <div key={student._id} className="student-card">
            <h3>{student.Name}</h3>
            <p>Registration No: {student.Regno}</p>
            <p>Class: {student.Classno}</p>
            <p>Email: {student.Email}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App 