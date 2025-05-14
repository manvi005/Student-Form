import React, { useState, useEffect } from "react";
import "./calender.css";
import { Link } from "react-router-dom";
import config from './config';

const SERVER_URL = config.apiBaseUrl;

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ date: "", description: "" });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [holidayListVisible, setHolidayListVisible] = useState(true);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = () => {
    fetch(`${SERVER_URL}/holidays`)
      .then((res) => res.json())
      .then((data) => {
        setHolidays(data);
      })
      .catch((err) => {
        console.error("Error fetching holidays:", err);
      });
  };

  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.description) {
      alert("Please enter both date and description");
      return;
    }

    if (editMode) {
      // Update existing holiday
      fetch(`${SERVER_URL}/holidays/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newHoliday),
      })
        .then((res) => res.json())
        .then(() => {
          fetchHolidays();
          setNewHoliday({ date: "", description: "" });
          setEditMode(false);
          setEditId(null);
        })
        .catch((err) => console.error(err));
    } else {
      // Add new holiday
      fetch(`${SERVER_URL}/holidays`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newHoliday),
      })
        .then((res) => res.json())
        .then(() => {
          fetchHolidays();
          setNewHoliday({ date: "", description: "" });
        })
        .catch((err) => console.error(err));
    }
  };

  const deleteHoliday = (id) => {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      fetch(`${SERVER_URL}/holidays/${id}`, {
        method: "DELETE",
      })
        .then(() => {
          fetchHolidays();
        })
        .catch((err) => console.error(err));
    }
  };

  const editHoliday = (holiday) => {
    setNewHoliday({
      date: new Date(holiday.date).toISOString().split("T")[0],
      description: holiday.description,
    });
    setEditMode(true);
    setEditId(holiday._id);
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const toggleHolidayList = () => {
    setHolidayListVisible(!holidayListVisible);
  };

  // Get current month holidays
  const getCurrentMonthHolidays = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    // Get the first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get day of week for the first day (0 = Sunday, 6 = Saturday)
    const startingDay = firstDayOfMonth.getDay();
    
    const monthName = firstDayOfMonth.toLocaleString('default', { month: 'long' });
    
    // Create calendar cells
    let days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Check if this day is a holiday
      const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate.getFullYear() === year && 
               holidayDate.getMonth() === month && 
               holidayDate.getDate() === day;
      });
      
      // Get holiday description if it's a holiday
      let holidayInfo = null;
      if (isHoliday) {
        const holiday = holidays.find(h => {
          const hDate = new Date(h.date);
          return hDate.getFullYear() === year && 
                 hDate.getMonth() === month && 
                 hDate.getDate() === day;
        });
        if (holiday) {
          holidayInfo = holiday.description;
        }
      }
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isHoliday ? 'holiday' : ''}`}
          title={holidayInfo || ''}
        >
          <span className="day-number">{day}</span>
          {isHoliday && <div className="holiday-marker">{holidayInfo}</div>}
        </div>
      );
    }
    
    return (
      <div className="calendar">
        <div className="calendar-header">
          <button onClick={prevMonth}>&lt;</button>
          <h2>{monthName} {year}</h2>
          <button onClick={nextMonth}>&gt;</button>
        </div>
        <div className="calendar-weekdays">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        <div className="calendar-days">
          {days}
        </div>
      </div>
    );
  };

  // Render current month holidays box
  const renderCurrentMonthHolidays = () => {
    const currentMonthHolidays = getCurrentMonthHolidays();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    
    return (
      <div className="current-month-holidays">
        <h3>Holidays in {monthName} {year}</h3>
        <div className="current-month-holidays-list">
          {currentMonthHolidays.length > 0 ? (
            currentMonthHolidays.map((holiday) => (
              <div key={holiday._id} className="current-month-holiday-item">
                <div className="holiday-date">
                  {new Date(holiday.date).getDate()}
                </div>
                <div className="holiday-description">
                  {holiday.description}
                </div>
              </div>
            ))
          ) : (
            <p className="no-holidays">No holidays this month</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-container">
      <h1>Calendar</h1>
      
      <div className="calendar-content">
        <div className="calendar-left-section">
          <div className="calendar-view">
            {renderCalendar()}
          </div>
          {renderCurrentMonthHolidays()}
        </div>
        
        <div className="holiday-management">
          <h3>{editMode ? "Edit Holiday" : "Add Holiday"}</h3>
          <div className="form-group">
            <label>Date:</label>
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <input
              type="text"
              value={newHoliday.description}
              onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})}
              placeholder="Holiday description"
            />
          </div>
          <div className="form-actions">
            <button onClick={addHoliday}>
              {editMode ? "Update Holiday" : "Add Holiday"}
            </button>
            {editMode && (
              <button 
                onClick={() => {
                  setNewHoliday({ date: "", description: "" });
                  setEditMode(false);
                  setEditId(null);
                }}
              >
                Cancel
              </button>
            )}
          </div>
          
          <div className="holiday-list-header">
            <h3>All Holidays</h3>
            <button 
              className="toggle-button" 
              onClick={toggleHolidayList}
              aria-label={holidayListVisible ? "Collapse holiday list" : "Expand holiday list"}
            >
              {holidayListVisible ? '▼' : '►'}
            </button>
          </div>
          
          {holidayListVisible && (
            <div className="holiday-list">
              {holidays.length > 0 ? (
                holidays.sort((a, b) => new Date(a.date) - new Date(b.date)).map((holiday) => (
                  <div key={holiday._id} className="holiday-item">
                    <div>
                      <strong>{new Date(holiday.date).toLocaleDateString()}</strong>: {holiday.description}
                    </div>
                    <div className="holiday-actions">
                      <button onClick={() => editHoliday(holiday)} className="edit-btn">Edit</button>
                      <button onClick={() => deleteHoliday(holiday._id)} className="delete-btn">Delete</button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No holidays added yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="nav-buttons">
        <Link to="/">
          <button>Back to Main Form</button>
        </Link>
        <Link to="/class/:classno">
          <button>View Students by Class</button>
        </Link>
      </div>
    </div>
  );
}

export default Calendar;