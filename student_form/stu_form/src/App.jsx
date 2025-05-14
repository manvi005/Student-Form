import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Mainform from "./Mainform";
import Class from "./Class";
import Calendar from "./calender";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Mainform />} />
        <Route path="/form/:regnumber" element={<Mainform />} />
        <Route path="/class/:classno" element={<Class />} />
        <Route path="/calendar" element={<Calendar />} />
       
      </Routes>
    </Router>
  );
}

export default App;

// const [allData, setAllData] = useState([])
// const [workbook, setWorkbook] = useState(null);

// const storedData = JSON.parse(localStorage.getItem("userInfo")) || [];
// storedData.push(userData);
// setAllData(storedData);
// localStorage.setItem("userInfo", JSON.stringify(storedData));
// if (workbook) {
//   const ws = XLSX.utils.json_to_sheet(storedData);
//   XLSX.utils.book_append_sheet(workbook, ws, "StudentData");
//   setWorkbook(workbook);
// }
// if (allData.length === 0) {
//   alert("No data available to export.");
//   return;
// }
// else{const ws = XLSX.utils.json_to_sheet(allData);
// const wb = XLSX.utils.book_new();
// XLSX.utils.book_append_sheet(wb, ws, "StudentData");
// XLSX.writeFile(wb, "student_data.xlsx");
