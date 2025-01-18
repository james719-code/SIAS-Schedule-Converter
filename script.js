// Make sure to include the SheetJS library to handle .xlsx files
// Add this script tag to your HTML
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>

// JavaScript for the drag-and-drop .xlsx file upload and conversion
const uploadInput = document.getElementById("xlsx-upload");
const dragDropArea = document.getElementById("drag-drop-area");
const excelPreview = document.getElementById("excel-preview");

// Trigger the file input dialog when the drag-and-drop area is clicked
dragDropArea.addEventListener("click", () => {
  uploadInput.click();
});

// Handle file selection through file input
uploadInput.addEventListener("change", handleFileSelect);

// Handle drag over event
dragDropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dragDropArea.style.backgroundColor = "#f4f4f4"; // Change background on hover
});

// Handle drag leave event
dragDropArea.addEventListener("dragleave", () => {
  dragDropArea.style.backgroundColor = ""; // Reset background
});

// Handle drop event
dragDropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  handleFileSelect({ target: { files: [file] } }); // Simulate file selection
  dragDropArea.style.backgroundColor = ""; // Reset background
});

// Function to handle file selection and parse .xlsx file
function handleFileSelect(event) {
  const file = event.target.files[0];

  if (file && file.name.endsWith(".xlsx")) {
    const reader = new FileReader();

    reader.onload = function () {
      const data = reader.result;

      // Parse the Excel file using SheetJS
      const workbook = XLSX.read(data, { type: "binary" });

      // Extract data from sheet 2
      const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
      if (sheet2) {
        const htmlContent = generateHTMLTable(sheet2);
        displayHTMLContent(htmlContent); // Display HTML content on the page
      } else {
        excelPreview.innerHTML = "<p>Sheet 2 not found in the Excel file.</p>";
      }
    };

    reader.readAsBinaryString(file); // Read the file as binary string
  } else {
    excelPreview.innerHTML = "<p>Please upload a valid .xlsx file.</p>";
  }
}

function convertTo24HourTime(time) {
  const [hourMin, period] = time.split(' ');
  let [hour, minute] = hourMin.split(':');
  
  hour = parseInt(hour);
  minute = minute ? parseInt(minute) : 0; // If no minute, assume 0

  console.log(period);

  if (period === 'pm' && hour !== 12) {
    hour = hour + 12;
    console.log(hour);
  }

  return hour * 60 + minute; // Return total minutes for easy comparison
}

// Function to generate HTML table from sheet data
function generateHTMLTable(sheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  let htmlContent = "";

  const subjectMap = {}; // Object to hold subjects, schedules, and rooms
  const daysMap = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };

  // Loop through rows and columns to group by subject and days
  for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
    const subjectCell = sheet[XLSX.utils.encode_cell({ r: rowNum, c: 2 })]; // Column 3 (index 2)
    const scheduleCell = sheet[XLSX.utils.encode_cell({ r: rowNum, c: 4 })]; // Column 5 (index 4)
    const roomCell = sheet[XLSX.utils.encode_cell({ r: rowNum, c: 5 })]; // Column 6 (index 5)
    
    if (subjectCell && scheduleCell && roomCell) {
      const subject = subjectCell.v;
      const schedule = scheduleCell.v;
      const room = roomCell.v;

      console.log(schedule);

      // Ensure the schedule is valid (not empty or undefined)
      if (schedule) {
        // Split the schedule into time and days
        let time, days;
if (schedule.includes('am')) {
    const parts = schedule.split('am'); // Split at 'AM'
    time = parts[0].trim() + ' am'; // Time part
    days = parts[1].trim(); // Days part after 'AM'
  } else if (schedule.includes('pm')) {
    const parts = schedule.split('pm'); // Split at 'PM'
    time = parts[0].trim() + ' pm'; // Time part
    days = parts[1].trim(); // Days part after 'PM'
  } // e.g., '10:30-11:30 am' and 'MWTh'

        // Add to subjectMap for grouped subjects
        if (subjectMap[subject]) {
          subjectMap[subject].schedules.push({ time, days, room });
        } else {
          subjectMap[subject] = {
            schedules: [{ time, days, room }]
          };
        }

        console.log(days);

        // Now, populate the daysMap for scheduling by days
        if (days.includes('M')) {
          daysMap.Monday.push({ subject, time, room });
          days = days.replace('M', ''); // Remove 'M' after processing
        }
        if (days.includes('Th')) {
          daysMap.Thursday.push({ subject, time, room });
          days = days.replace('Th', ''); // Remove 'Th' after processing
        }
        if (days.includes('T')) {
          daysMap.Tuesday.push({ subject, time, room });
          days = days.replace('T', ''); // Remove 'T' after processing
        }
        if (days.includes('W')) {
          daysMap.Wednesday.push({ subject, time, room });
          days = days.replace('W', ''); // Remove 'W' after processing
        }
        if (days.includes('F')) {
          daysMap.Friday.push({ subject, time, room });
          days = days.replace('F', ''); // Remove 'F' after processing
        }
        if (days.includes('S')) {
          daysMap.Saturday.push({ subject, time, room });
          days = days.replace('S', ''); // Remove 'S' after processing
        }
      }
    }
  }

  const sortByTime = (a, b) => {
    const timeA = convertTo24HourTime(a.time);
    const timeB = convertTo24HourTime(b.time);

    return timeA - timeB; // Compare start times
  };

  // Create the second table for days of the week and subjects
  htmlContent += "<h1 style='padding: 10px;'>Weekly Schedule</h1><table border='1' style='border-collapse: collapse; width: 100%;'>";
  htmlContent += "<tr><th>Day</th><th>Subjects with Time</th><th>Room</th></tr>";

  for (const day in daysMap) {
    const daySchedule = daysMap[day].sort(sortByTime);
    const daySubjects = daySchedule.map(item => `${item.subject} ${item.time}`).join("\n"); // Separate by newline
    const dayRooms = daySchedule.map(item => item.room).join("\n"); // Separate by newline
    htmlContent += `<tr><td style='padding: 5px; white-space: pre-line;'>${day}</td><td style='padding: 5px; white-space: pre-line;'>${daySubjects}</td><td style='padding: 5px; white-space: pre-line;'>${dayRooms}</td></tr>`;
  }

  htmlContent += "</table>";
  return htmlContent;
}





// Function to display the HTML content in a div on the page
function displayHTMLContent(htmlContent) {
  excelPreview.innerHTML = htmlContent; // Insert the table into the preview div
}
