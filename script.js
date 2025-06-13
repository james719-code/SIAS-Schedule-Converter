
const uploadInput = document.getElementById("xlsx-upload");
const dragDropArea = document.getElementById("drag-drop-area");
const excelPreview = document.getElementById("excel-preview");
const exportButton = document.getElementById("export-image-btn");

let currentProcessedData = null; 

// --- Event Listeners ---
dragDropArea.addEventListener("click", () => uploadInput.click());
uploadInput.addEventListener("change", handleFileSelect);
dragDropArea.addEventListener("dragover", (e) => { e.preventDefault(); dragDropArea.style.backgroundColor = "#f4f4f4"; });
dragDropArea.addEventListener("dragleave", () => { dragDropArea.style.backgroundColor = ""; });
dragDropArea.addEventListener("drop", (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; handleFileSelect({ target: { files: [file] } }); dragDropArea.style.backgroundColor = ""; });

// --- Core File Handling ---
function handleFileSelect(event) {
  const file = event.target.files[0];
  currentProcessedData = null;
  excelPreview.innerHTML = "<p>Processing file...</p>";

  if (file && file.name.endsWith(".xlsx")) {
    const reader = new FileReader();
    reader.onload = function () {
      const data = reader.result;
      try {
        const workbook = XLSX.read(data, { type: "binary" });
        if (workbook.SheetNames.length < 2) { showError("The Excel file must have at least two sheets."); return; }
        const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
        if (sheet2) {
          currentProcessedData = processSheetData(sheet2);
          const webHtml = generateWebDisplayHTML(currentProcessedData.daysMapData);
          displayHTMLContent(webHtml);
          const hasData = currentProcessedData.daysMapData && Object.values(currentProcessedData.daysMapData).some(arr => arr.length > 0);
          if (exportButton) exportButton.disabled = !hasData;
          if (!hasData && !excelPreview.querySelector('p[style*="color:red"]')) {
             excelPreview.innerHTML = "<p>No schedule data found in Sheet 2 according to the expected format.</p>";
          }
        } else { showError("Sheet 2 could not be processed."); }
      } catch (error) { console.error("Error processing Excel file:", error); showError("Error processing the Excel file. Ensure it's valid and not corrupted."); }
    };
    reader.onerror = () => showError("Error reading the file.");
    reader.readAsBinaryString(file);
  } else { showError("Please upload a valid .xlsx file."); }
}

function showError(message) {
    excelPreview.innerHTML = `<p style="color:red; font-weight:bold;">${message}</p>`;
    if (exportButton) exportButton.disabled = true;
    currentProcessedData = null;
}

function processSheetData(sheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const daysMap = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
  let extractedSectionName = "";
  const lastColIndex = range.e.c; 

  // Attempt to get section name from the first data row (row after potential header)
  // Adjust 'range.s.r + 1' if your header structure is different or section name is elsewhere
  if (lastColIndex >= 0 && (range.s.r + 1) <= range.e.r) {
      const sectionCell = sheet[XLSX.utils.encode_cell({ r: range.s.r + 1, c: lastColIndex })];
      if (sectionCell && sectionCell.v) {
          extractedSectionName = String(sectionCell.v).trim();
      }
  }


  for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) { 
    const subjectCell = sheet[XLSX.utils.encode_cell({ r: rowNum, c: 2 })]; 
    const scheduleCell = sheet[XLSX.utils.encode_cell({ r: rowNum, c: 4 })]; 
    const roomCell = sheet[XLSX.utils.encode_cell({ r: rowNum, c: 5 })];    

    if (subjectCell?.v && scheduleCell?.v && roomCell?.v) {
      const subject = String(subjectCell.v).trim();
      const scheduleInput = String(scheduleCell.v).trim();
      const room = String(roomCell.v).trim();
      if (scheduleInput) {
        let time, daysString;
        const lowerSchedule = scheduleInput.toLowerCase();
        let timeMatch = lowerSchedule.match(/([\d\s\:\-]+(?:am|pm))/i);
        if (timeMatch) { time = timeMatch[0].trim(); daysString = scheduleInput.substring(timeMatch[0].length).trim(); }
        else {
          let amIndex = lowerSchedule.indexOf('am'), pmIndex = lowerSchedule.indexOf('pm'), splitIndex = -1;
          if (amIndex !== -1 && (pmIndex === -1 || amIndex < pmIndex)) splitIndex = amIndex; else if (pmIndex !== -1) splitIndex = pmIndex;
          if (splitIndex !== -1) { time = scheduleInput.substring(0, splitIndex + 2).trim(); daysString = scheduleInput.substring(splitIndex + 2).trim(); }
          else { time = scheduleInput; daysString = ""; }
        }
        if (daysString) {
          let tempDaysUpper = daysString.toUpperCase();
          if (tempDaysUpper.includes('TH')) { daysMap.Thursday.push({ subject, time, room }); tempDaysUpper = tempDaysUpper.replace('TH', ''); }
          if (tempDaysUpper.includes('M')) { daysMap.Monday.push({ subject, time, room }); tempDaysUpper = tempDaysUpper.replace('M', ''); }
          if (tempDaysUpper.includes('T')) { daysMap.Tuesday.push({ subject, time, room }); tempDaysUpper = tempDaysUpper.replace('T', ''); }
          if (tempDaysUpper.includes('W')) { daysMap.Wednesday.push({ subject, time, room }); tempDaysUndeclared = tempDaysUpper.replace('W', ''); }
          if (tempDaysUpper.includes('F')) { daysMap.Friday.push({ subject, time, room }); tempDaysUpper = tempDaysUpper.replace('F', ''); }
          if (tempDaysUpper.includes('S')) { daysMap.Saturday.push({ subject, time, room }); }
        }
      }
    }
  }
  return { daysMapData: daysMap, sectionName: extractedSectionName };
}

function convertTo24HourTime(time) { /* ... (same as before) ... */ 
  if (!time || typeof time !== 'string') return 0;
  const timeLower = time.toLowerCase();
  const parts = timeLower.split(' ');
  if (parts.length < 2) return 0;
  const hourMin = parts[0];
  const period = parts[1];
  let [hourStr, minuteStr] = hourMin.split(':');
  let hour = parseInt(hourStr);
  let minute = minuteStr ? parseInt(minuteStr) : 0;
  if (isNaN(hour) || isNaN(minute)) return 0;
  if (period === 'pm' && hour !== 12) hour += 12;
  else if (period === 'am' && hour === 12) hour = 0;
  return hour * 60 + minute;
}
const sortByTime = (a, b) => { /* ... (same as before) ... */ 
  const startTimeA = a.time.split('-')[0].trim();
  const startTimeB = b.time.split('-')[0].trim();
  return convertTo24HourTime(startTimeA) - convertTo24HourTime(startTimeB);
};

function generateWebDisplayHTML(daysMap) { /* ... (same as before, can be kept simple) ... */ 
  let htmlContent = "";
  htmlContent += "<div style='padding: 10px; background-color: #fff; border: 1px solid #e0e0e0; margin-top:10px;'>";
  htmlContent += "<h2 style='text-align: center; font-family: sans-serif; margin-bottom: 15px; color: #555;'>Weekly Schedule (Preview)</h2>";
  htmlContent += "<table style='width: 100%; margin: 0 auto; border-collapse: collapse; font-family: sans-serif; font-size: 13px;'>";
  htmlContent += "<thead style='background-color: #f8f8f8;'><tr>";
  htmlContent += "<th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Day</th>";
  htmlContent += "<th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Subject & Time</th>";
  htmlContent += "<th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Room</th>";
  htmlContent += "</tr></thead><tbody>";
  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const day of daysOrder) {
    const daySchedule = daysMap[day] ? [...daysMap[day]].sort(sortByTime) : [];
    const daySubjects = daySchedule.map(item => `${item.subject} (${item.time})`).join("<br>");
    const dayRooms = daySchedule.map(item => item.room).join("<br>");
    htmlContent += `<tr>
                        <td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee; font-weight: bold;'>${day}</td>
                        <td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee;'>${daySubjects || " "}</td>
                        <td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee;'>${dayRooms || " "}</td>
                    </tr>`;
  }
  htmlContent += "</tbody></table></div>";
  return htmlContent;
}

// ... (keep all the JavaScript from before, up to generateImageExportHTML) ...

// ... (keep all the JavaScript from before, up to exportScheduleToImage) ...

function generateImageExportHTML(daysMap, isPortrait, sectionName, targetWidthForStyles) {
  // targetWidthForStyles is the actual width we are designing the HTML for (e.g., phone's innerWidth)
  let htmlContent = "";
  const mainTitleText = "Weekly Schedule";
  const fullTitle = sectionName ? `${mainTitleText} of ${sectionName}` : mainTitleText;

  const fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const titleColor = "#2c3e50";
  const tableHeaderTextColor = "#34495e";
  const tableBodyTextColor = "#2c3e50";
  const borderColor = "#dadce0";
  const headerBgColor = "#f8f9fa";

  let containerPadding, titleFontSize, titleFontWeight, titleMarginBottom,
      tableFontSize, tableWidthPct, cellPadding, lineHeight, dayFontWeight,
      headerFontWeight, dayNameCellWidth, subjectCellWidth, roomCellWidth;

  // Base font size for calculations (e.g., for a ~390px wide phone screen)
  const basePortraitFontSize = 16; // px - this is a key value to adjust for phone readability
  const baseLandscapeFontSize = 15; // px

  if (isPortrait) {
    // Styles for Portrait (Dynamic Phone Dimensions)
    // Scale font sizes somewhat based on the targetWidthForStyles relative to a common phone width
    // This is a simple scaling, more complex logic might be needed for extreme differences.
    const fontScaleFactor = targetWidthForStyles / 390; // Assuming 390px is a common phone width

    containerPadding = `${Math.round(30 * fontScaleFactor)}px ${Math.round(10 * fontScaleFactor)}px`;
    titleFontSize = `${Math.round(22 * fontScaleFactor)}px`;
    titleFontWeight = '700';
    titleMarginBottom = `${Math.round(25 * fontScaleFactor)}px`;
    tableFontSize = `${Math.round(basePortraitFontSize * Math.min(fontScaleFactor, 1.2))}px`; // Cap scaling
    tableWidthPct = '98%';
    cellPadding = `${Math.round(10 * fontScaleFactor)}px ${Math.round(6 * fontScaleFactor)}px`;
    lineHeight = '1.6'; // Can be a fixed good value
    dayFontWeight = '700';
    headerFontWeight = '700';
    dayNameCellWidth = '25%'; // May need more space with potentially larger relative fonts
    subjectCellWidth = '45%';
    roomCellWidth = '30%';

  } else {
    // Styles for Landscape (1920x1080)
    containerPadding = '50px 70px';
    titleFontSize = '34px';
    titleFontWeight = '600';
    titleMarginBottom = '35px';
    tableFontSize = `${baseLandscapeFontSize}px`;
    tableWidthPct = '90%';
    cellPadding = '14px 18px';
    lineHeight = '1.6';
    dayFontWeight = '600';
    headerFontWeight = '600';
    dayNameCellWidth = '20%';
    subjectCellWidth = '50%';
    roomCellWidth = '30%';
  }

  htmlContent += `<div style='padding: ${containerPadding}; background-color: #ffffff; width: 100%; box-sizing: border-box; font-family: ${fontFamily};'>`;
  htmlContent += `<h1 style='text-align: center; font-size: ${titleFontSize}; margin-bottom: ${titleMarginBottom}; font-weight: ${titleFontWeight}; color: ${titleColor};'>${fullTitle}</h1>`;
  htmlContent += `<table style='width: ${tableWidthPct}; margin: 0 auto; border-collapse: collapse; font-size: ${tableFontSize}; border: 1px solid ${borderColor};'>`;
  htmlContent += `<thead style='background-color: ${headerBgColor};'><tr>`;
  htmlContent += `<th style='padding: ${cellPadding}; text-align: left; font-weight: ${headerFontWeight}; border: 1px solid ${borderColor}; color: ${tableHeaderTextColor}; width: ${dayNameCellWidth};'>Day</th>`;
  htmlContent += `<th style='padding: ${cellPadding}; text-align: left; font-weight: ${headerFontWeight}; border: 1px solid ${borderColor}; color: ${tableHeaderTextColor}; width: ${subjectCellWidth};'>Subject & Time</th>`;
  htmlContent += `<th style='padding: ${cellPadding}; text-align: left; font-weight: ${headerFontWeight}; border: 1px solid ${borderColor}; color: ${tableHeaderTextColor}; width: ${roomCellWidth};'>Room</th>`;
  htmlContent += "</tr></thead><tbody>";

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const day of daysOrder) {
    const daySchedule = daysMap[day] ? [...daysMap[day]].sort(sortByTime) : [];
    const daySubjects = daySchedule.map(item => `${item.subject} (${item.time})`).join("<br>");
    const dayRooms = daySchedule.map(item => item.room).join("<br>");
    htmlContent += `<tr>
                        <td style='padding: ${cellPadding}; vertical-align: top; font-weight: ${dayFontWeight}; border: 1px solid ${borderColor}; text-align: left; color: ${tableBodyTextColor};'>${day}</td>
                        <td style='padding: ${cellPadding}; vertical-align: top; border: 1px solid ${borderColor}; text-align: left; line-height: ${lineHeight}; color: ${tableBodyTextColor};'>${daySubjects || " "}</td>
                        <td style='padding: ${cellPadding}; vertical-align: top; border: 1px solid ${borderColor}; text-align: left; line-height: ${lineHeight}; color: ${tableBodyTextColor};'>${dayRooms || " "}</td>
                    </tr>`;
  }
  htmlContent += "</tbody></table></div>";
  return htmlContent;
}

function displayHTMLContent(htmlContent) { excelPreview.innerHTML = htmlContent; }

async function exportScheduleToImage() {
  if (!currentProcessedData || !currentProcessedData.daysMapData || Object.values(currentProcessedData.daysMapData).every(arr => arr.length === 0)) {
    alert("No schedule data to export. Please upload and process a file first."); return;
  }
  const currentSectionName = currentProcessedData.sectionName || "";
  let targetImageWidth, targetImageHeight, filenameSuffix, isPortraitView;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  if (screenHeight > screenWidth) { // Portrait-like view
    targetImageWidth = screenWidth;    // Use actual screen width
    targetImageHeight = screenHeight;  // Use actual screen height
    filenameSuffix = `${screenWidth}x${screenHeight}`; // Dynamic suffix
    isPortraitView = true;
  } else { // Landscape or square view
    targetImageWidth = 1920; // Keep fixed for PC/Landscape
    targetImageHeight = 1080;
    filenameSuffix = "1920x1080";
    isPortraitView = false;
  }

  // Pass targetImageWidth to generateImageExportHTML for potential style scaling
  const imageHtml = generateImageExportHTML(currentProcessedData.daysMapData, isPortraitView, currentSectionName, targetImageWidth);

  const tempExportElement = document.createElement('div');
  tempExportElement.style.position = 'absolute'; tempExportElement.style.left = '-9999px'; tempExportElement.style.top = '-9999px';
  // Set temp element width to the target image width for html2canvas rendering context
  tempExportElement.style.width = `${targetImageWidth}px`;
  tempExportElement.style.backgroundColor = '#ffffff';
  tempExportElement.innerHTML = imageHtml;
  document.body.appendChild(tempExportElement);

  try {
    if (exportButton) { exportButton.textContent = "Generating Image..."; exportButton.disabled = true; }

    const canvas = await html2canvas(tempExportElement, {
      scale: window.devicePixelRatio || 1, // Use devicePixelRatio for sharpness on high-DPI phone screens
      useCORS: true, logging: false, backgroundColor: null,
      width: tempExportElement.scrollWidth, height: tempExportElement.scrollHeight,
      windowWidth: tempExportElement.scrollWidth, windowHeight: tempExportElement.scrollHeight
    });

    // The canvas from html2canvas is already at the desired resolution (tempExportElement.scrollWidth * scale)
    // For dynamic phone sizes, we want the canvas to be the image.
    // For fixed PC size, we scale into the target 1920x1080.

    let finalCanvas;

    if (isPortraitView) {
        // For portrait (phone), the html2canvas output should already be close to what we need.
        // We just need to ensure it's precisely targetImageWidth x targetImageHeight.
        // html2canvas's canvas 'width' and 'height' attributes are after its internal scaling.
        // We want the *content* to be rendered as if it's on a canvas of targetImageWidth x targetImageHeight.
        
        // Create a new canvas with the exact phone dimensions
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetImageWidth * window.devicePixelRatio; // Adjust for device pixel ratio for the final canvas
        finalCanvas.height = targetImageHeight * window.devicePixelRatio;
        finalCanvas.style.width = `${targetImageWidth}px`;
        finalCanvas.style.height = `${targetImageHeight}px`;

        const ctx = finalCanvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio); // Scale context for drawing
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, targetImageWidth, targetImageHeight); // Fill based on CSS pixels

        // Draw the captured canvas (which was rendered based on targetImageWidth for its CSS)
        // onto the devicePixelRatio-adjusted final canvas.
        // We need to scale the source canvas (from html2canvas) to fit the target phone dimensions,
        // respecting aspect ratio and adding padding.

        const capturedContentWidth = canvas.width / (window.devicePixelRatio || 1) ; // Back to CSS pixels from html2canvas output
        const capturedContentHeight = canvas.height / (window.devicePixelRatio || 1);

        const paddingFactor = 0.96; // 2% margin on each side for phone
        const effectiveTargetWidth = targetImageWidth * paddingFactor;
        const effectiveTargetHeight = targetImageHeight * paddingFactor;

        const scaleRatio = Math.min(effectiveTargetWidth / capturedContentWidth, effectiveTargetHeight / capturedContentHeight);
        
        const newWidth = capturedContentWidth * scaleRatio;
        const newHeight = capturedContentHeight * scaleRatio;
        const x = (targetImageWidth - newWidth) / 2;
        const y = (targetImageHeight - newHeight) / 2;
        
        ctx.drawImage(canvas, x, y, newWidth, newHeight);

    } else {
        // For Landscape (PC) - existing scaling logic
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetImageWidth; // e.g. 1920
        finalCanvas.height = targetImageHeight; // e.g. 1080
        const ctx = finalCanvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, targetImageWidth, targetImageHeight);

        const capturedWidth = canvas.width; // scrollWidth * scale
        const capturedHeight = canvas.height; // scrollHeight * scale

        const paddingFactor = 0.92;
        const effectiveTargetWidth = targetImageWidth * paddingFactor;
        const effectiveTargetHeight = targetImageHeight * paddingFactor;
        const scaleRatio = Math.min(effectiveTargetWidth / capturedWidth, effectiveTargetHeight / capturedHeight);
        const newWidth = capturedWidth * scaleRatio;
        const newHeight = capturedHeight * scaleRatio;
        const x = (targetImageWidth - newWidth) / 2;
        const y = (targetImageHeight - newHeight) / 2;
        ctx.drawImage(canvas, x, y, newWidth, newHeight);
    }


    const imageDataURL = finalCanvas.toDataURL("image/png");
    let downloadFilename = `weekly_schedule_${filenameSuffix}.png`;
    if (currentSectionName) {
        const sanitizedSectionName = currentSectionName.replace(/[^a-z0-9_\-]/gi, '_').replace(/_{2,}/g, '_');
        downloadFilename = `weekly_schedule_${sanitizedSectionName}_${filenameSuffix}.png`;
    }
    const downloadLink = document.createElement("a"); downloadLink.href = imageDataURL; downloadLink.download = downloadFilename;
    document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink);

  } catch (error) { console.error("Error exporting to image:", error); alert("Failed to export image. See console for details.");
  } finally {
    document.body.removeChild(tempExportElement);
    if (exportButton) {
      exportButton.textContent = "Export Schedule as Image";
      const hasData = currentProcessedData?.daysMapData && Object.values(currentProcessedData.daysMapData).some(arr => arr.length > 0);
      exportButton.disabled = !hasData;
    }
  }
}


// ... (rest of the script: if (exportButton) ... )

if (exportButton) { exportButton.addEventListener("click", exportScheduleToImage); }