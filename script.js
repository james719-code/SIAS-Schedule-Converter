// Required setup for PDF.js. This MUST be at the top.
const uploadInput = document.getElementById("xlsx-upload"); // Note: ID is kept for compatibility with existing HTML
const dragDropArea = document.getElementById("drag-drop-area");
const excelPreview = document.getElementById("excel-preview"); // Note: ID is kept for compatibility
const exportButton = document.getElementById("export-image-btn");

let currentProcessedData = null;

// --- Event Listeners ---
dragDropArea.addEventListener("click", () => uploadInput.click());
uploadInput.addEventListener("change", handleFileSelect);
dragDropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dragDropArea.style.backgroundColor = "#f4f4f4";
});
dragDropArea.addEventListener("dragleave", () => {
  dragDropArea.style.backgroundColor = "";
});
dragDropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  handleFileSelect({ target: { files: [file] } });
  dragDropArea.style.backgroundColor = "";
});

// --- Core File Handling ---
async function handleFileSelect(event) {
  const file = event.target.files[0];
  currentProcessedData = null;
  excelPreview.innerHTML = "<p>Processing PDF file...</p>";

  if (file && file.name.toLowerCase().endsWith(".pdf")) {
    const reader = new FileReader();
    reader.onload = async function () {
      const data = reader.result; // This will be an ArrayBuffer
      try {
        const loadingTask = pdfjsLib.getDocument({ data: data });
        const pdf = await loadingTask.promise;

        if (pdf.numPages < 1) {
          showError("The PDF file is empty or invalid.");
          return;
        }

        let combinedData = {
          daysMapData: {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
          },
          sectionName: "",
        };

        for (let i = 1; i <= pdf.numPages; i++) {
          excelPreview.innerHTML = `<p>Processing PDF file... (Page ${i}/${pdf.numPages})</p>`;
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageData = processPdfTextContent(textContent);

          for (const day in pageData.daysMapData) {
            combinedData.daysMapData[day].push(...pageData.daysMapData[day]);
          }

          if (pageData.sectionName && !combinedData.sectionName) {
            combinedData.sectionName = pageData.sectionName;
          }
        }

        currentProcessedData = combinedData;
        const webHtml = generateWebDisplayHTML(
          currentProcessedData.daysMapData
        );
        displayHTMLContent(webHtml);

        const hasData =
          currentProcessedData.daysMapData &&
          Object.values(currentProcessedData.daysMapData).some(
            (arr) => arr.length > 0
          );
        if (exportButton) exportButton.disabled = !hasData;

        if (!hasData && !excelPreview.querySelector('p[style*="color:red"]')) {
          excelPreview.innerHTML = `<p>No schedule data found in the PDF. Please ensure it is the correct "Certificate of Enrollment" file and is not an image.</p>`;
        }
      } catch (error) {
        console.error("Error processing PDF file:", error);
        showError(
          "Error processing the PDF file. Ensure it's valid, not corrupted, and text-based."
        );
      }
    };
    reader.onerror = () => showError("Error reading the file.");
    reader.readAsArrayBuffer(file);
  } else {
    showError("Please upload a valid .pdf file.");
  }
}

function showError(message) {
  excelPreview.innerHTML = `<p style="color:red; font-weight:bold;">${message}</p>`;
  if (exportButton) exportButton.disabled = true;
  currentProcessedData = null;
}

// --- NEW, ROBUST PDF PARSING LOGIC ---
function processPdfTextContent(textContent) {
  const daysMap = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };
  let extractedSectionName = "";

  // Group text items by their vertical position (y-coordinate) to form lines
  const rows = {};
  for (const item of textContent.items) {
    const y = Math.round(item.transform[5]); // Group by y-coordinate
    if (!rows[y]) rows[y] = [];
    rows[y].push({ text: item.str, x: item.transform[4] });
  }

  // This regex is the anchor. It finds the schedule string within a full line of text.
  // It captures: 1) The full time string, 2) The day characters.
  const scheduleRegex =
    /((?:\d{1,2}:\d{2}-\d{1,2}:\d{2}|\d{1,2}-\d{1,2})\s*(?:am|pm))\s+([A-ZTHSA]+)/i;

  for (const y in rows) {
    const rowItems = rows[y].sort((a, b) => a.x - b.x); // Sort text left-to-right
    const fullLineText = rowItems.map((item) => item.text).join(" ");

    const match = fullLineText.match(scheduleRegex);

    if (match) {
      const time = match[1].trim(); // e.g., "10:30-11:30 am"
      const daysString = match[2].trim(); // e.g., "MWTh"
      const fullScheduleString = match[0]; // The whole matched "time days" string

      const parts = fullLineText.split(fullScheduleString);

      // Extract Subject: everything before the schedule string
      let subjectPart = parts[0].trim();
      // Clean the subject: remove leading codes and trailing unit count
      let subject = subjectPart
        .replace(/^[A-Z0-9-]+\s+[A-Z0-9-]+\s*/, "")
        .replace(/\s+\d\.\d$/, "")
        .trim();

      // Extract Room and Section: everything after the schedule string
      const remainingPart = parts[1].trim();
      const remainingParts = remainingPart.split(/\s+/);
      const section = remainingParts.pop(); // The last part is the section
      let roomRaw = remainingParts.join("");

      // Separate room code and number, remove course suffix (like BSCS)
      const roomMatch = roomRaw.match(/^([A-Za-z]+)(\d+)/);
      let room = roomMatch ? `${roomMatch[1]} ${roomMatch[2]}` : roomRaw;

      if (section && !extractedSectionName) {
        extractedSectionName = section;
      }

      if (room === "IITROOM 2" ) {
        room = "IITRM 20"
      }

      // --- Correctly parse multi-day strings like "MWTh" ---
      let i = 0;
      const tempDaysUpper = daysString.toUpperCase();
      while (i < tempDaysUpper.length) {
        // Check for two-character day codes first
        if (
          i + 1 < tempDaysUpper.length &&
          tempDaysUpper.substring(i, i + 2) === "TH"
        ) {
          daysMap.Thursday.push({ subject, time, room });
          i += 2;
        } else if (
          i + 1 < tempDaysUpper.length &&
          tempDaysUpper.substring(i, i + 2) === "SA"
        ) {
          daysMap.Saturday.push({ subject, time, room });
          i += 2;
        } else {
          // Handle one-character day codes
          const dayCode = tempDaysUpper.charAt(i);
          if (dayCode === "M") daysMap.Monday.push({ subject, time, room });
          else if (dayCode === "T")
            daysMap.Tuesday.push({ subject, time, room });
          else if (dayCode === "W")
            daysMap.Wednesday.push({ subject, time, room });
          else if (dayCode === "F")
            daysMap.Friday.push({ subject, time, room });
          else if (dayCode === "S")
            daysMap.Saturday.push({ subject, time, room }); // Fallback for 'S'
          i += 1;
        }
      }
    }
  }

  return { daysMapData: daysMap, sectionName: extractedSectionName };
}

function convertTo24HourTime(timeString) {
  if (!timeString || typeof timeString !== "string") return 0;
  const timeLower = timeString.toLowerCase().trim();
  const match = timeLower.match(/^(\d{1,2}(?::\d{2})?)\s*(am|pm)/);

  if (!match) return 0;

  const hourMinPart = match[1];
  const period = match[2];
  let [hourStr, minuteStr] = hourMinPart.split(":");
  let hour = parseInt(hourStr, 10);
  let minute = minuteStr ? parseInt(minuteStr, 10) : 0;

  if (isNaN(hour) || isNaN(minute)) return 0;

  if (period === "pm" && hour !== 12) hour += 12;
  else if (period === "am" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

const sortByTime = (a, b) => {
  function extractActualStartTime(fullTimeStr) {
    if (!fullTimeStr || typeof fullTimeStr !== "string") return "";
    let match = fullTimeStr.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    const firstPartMatch = fullTimeStr.match(/^(\d{1,2}(?::\d{2})?)/);
    if (firstPartMatch && firstPartMatch[1]) {
      const numericStart = firstPartMatch[1];
      const periodMatch = fullTimeStr.match(/(am|pm)\s*$/i);
      if (periodMatch && periodMatch[1]) {
        return `${numericStart} ${periodMatch[1]}`;
      }
      return numericStart;
    }
    return fullTimeStr.split("-")[0].trim();
  }
  const startTimeA_str = extractActualStartTime(a.time);
  const startTimeB_str = extractActualStartTime(b.time);
  return (
    convertTo24HourTime(startTimeA_str) - convertTo24HourTime(startTimeB_str)
  );
};

function generateWebDisplayHTML(daysMap) {
  let htmlContent = "";
  htmlContent +=
    "<div style='padding: 10px; background-color: #fff; border: 1px solid #e0e0e0; margin-top:10px;'>";
  htmlContent +=
    "<h2 style='text-align: center; font-family: sans-serif; margin-bottom: 15px; color: #555;'>Weekly Schedule (Preview)</h2>";
  htmlContent +=
    "<table style='width: 100%; margin: 0 auto; border-collapse: collapse; font-family: sans-serif; font-size: 13px;'>";
  htmlContent += "<thead style='background-color: #f8f8f8;'><tr>";
  htmlContent +=
    "<th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Day</th>";
  htmlContent +=
    "<th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Subject & Time</th>";
  htmlContent +=
    "<th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Room</th>";
  htmlContent += "</tr></thead><tbody>";
  const daysOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  for (const day of daysOrder) {
    const daySchedule = daysMap[day] ? [...daysMap[day]].sort(sortByTime) : []; // Sorting happens here
    const daySubjects = daySchedule
      .map((item) => `${item.subject} (${item.time})`)
      .join("<br>");
    const dayRooms = daySchedule.map((item) => item.room).join("<br>");
    htmlContent += `<tr>
                        <td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee; font-weight: bold;'>${day}</td>
                        <td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee;'>${
                          daySubjects || " "
                        }</td>
                        <td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee;'>${
                          dayRooms || " "
                        }</td>
                    </tr>`;
  }
  htmlContent += "</tbody></table></div>";
  return htmlContent;
}

function generateImageExportHTML(
  daysMap,
  isPortrait,
  sectionName,
  targetWidthForStyles
) {
  let htmlContent = "";
  const mainTitleText = "Weekly Schedule";
  const fullTitle = sectionName
    ? `${mainTitleText} of ${sectionName}`
    : mainTitleText;

  const fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const titleColor = "#2c3e50";
  const tableHeaderTextColor = "#34495e";
  const tableBodyTextColor = "#2c3e50";
  const borderColor = "#dadce0";
  const headerBgColor = "#f8f9fa";

  let containerPadding,
    titleFontSize,
    titleFontWeight,
    titleMarginBottom,
    tableFontSize,
    tableWidthPct,
    cellPadding,
    lineHeight,
    dayFontWeight,
    headerFontWeight,
    dayNameCellWidth,
    subjectCellWidth,
    roomCellWidth;

  const basePortraitFontSize = 16;
  const baseLandscapeFontSize = 15;

  if (isPortrait) {
    const fontScaleFactor = targetWidthForStyles / 390;
    containerPadding = `${Math.round(30 * fontScaleFactor)}px ${Math.round(
      10 * fontScaleFactor
    )}px`;
    titleFontSize = `${Math.round(22 * fontScaleFactor)}px`;
    titleFontWeight = "700";
    titleMarginBottom = `${Math.round(25 * fontScaleFactor)}px`;
    tableFontSize = `${Math.round(
      basePortraitFontSize * Math.min(fontScaleFactor, 1.2)
    )}px`;
    tableWidthPct = "98%";
    cellPadding = `${Math.round(10 * fontScaleFactor)}px ${Math.round(
      6 * fontScaleFactor
    )}px`;
    lineHeight = "1.6";
    dayFontWeight = "700";
    headerFontWeight = "700";
    dayNameCellWidth = "25%";
    subjectCellWidth = "45%";
    roomCellWidth = "30%";
  } else {
    containerPadding = "50px 70px";
    titleFontSize = "34px";
    titleFontWeight = "600";
    titleMarginBottom = "35px";
    tableFontSize = `${baseLandscapeFontSize}px`;
    tableWidthPct = "90%";
    cellPadding = "14px 18px";
    lineHeight = "1.6";
    dayFontWeight = "600";
    headerFontWeight = "600";
    dayNameCellWidth = "20%";
    subjectCellWidth = "50%";
    roomCellWidth = "30%";
  }

  htmlContent += `<div style='padding: ${containerPadding}; background-color: #ffffff; width: 100%; box-sizing: border-box; font-family: ${fontFamily};'>`;
  htmlContent += `<h1 style='text-align: center; font-size: ${titleFontSize}; margin-bottom: ${titleMarginBottom}; font-weight: ${titleFontWeight}; color: ${titleColor};'>${fullTitle}</h1>`;
  htmlContent += `<table style='width: ${tableWidthPct}; margin: 0 auto; border-collapse: collapse; font-size: ${tableFontSize}; border: 1px solid ${borderColor};'>`;
  htmlContent += `<thead style='background-color: ${headerBgColor};'><tr>`;
  htmlContent += `<th style='padding: ${cellPadding}; text-align: left; font-weight: ${headerFontWeight}; border: 1px solid ${borderColor}; color: ${tableHeaderTextColor}; width: ${dayNameCellWidth};'>Day</th>`;
  htmlContent += `<th style='padding: ${cellPadding}; text-align: left; font-weight: ${headerFontWeight}; border: 1px solid ${borderColor}; color: ${tableHeaderTextColor}; width: ${subjectCellWidth};'>Subject & Time</th>`;
  htmlContent += `<th style='padding: ${cellPadding}; text-align: left; font-weight: ${headerFontWeight}; border: 1px solid ${borderColor}; color: ${tableHeaderTextColor}; width: ${roomCellWidth};'>Room</th>`;
  htmlContent += "</tr></thead><tbody>";

  const daysOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  for (const day of daysOrder) {
    const daySchedule = daysMap[day] ? [...daysMap[day]].sort(sortByTime) : []; // Sorting happens here
    const daySubjects = daySchedule
      .map((item) => `${item.subject} (${item.time})`)
      .join("<br>");
    const dayRooms = daySchedule.map((item) => item.room).join("<br>");
    htmlContent += `<tr>
                        <td style='padding: ${cellPadding}; vertical-align: top; font-weight: ${dayFontWeight}; border: 1px solid ${borderColor}; text-align: left; color: ${tableBodyTextColor};'>${day}</td>
                        <td style='padding: ${cellPadding}; vertical-align: top; border: 1px solid ${borderColor}; text-align: left; line-height: ${lineHeight}; color: ${tableBodyTextColor};'>${
      daySubjects || " "
    }</td>
                        <td style='padding: ${cellPadding}; vertical-align: top; border: 1px solid ${borderColor}; text-align: left; line-height: ${lineHeight}; color: ${tableBodyTextColor};'>${
      dayRooms || " "
    }</td>
                    </tr>`;
  }
  htmlContent += "</tbody></table></div>";
  return htmlContent;
}

function displayHTMLContent(htmlContent) {
  excelPreview.innerHTML = htmlContent;
}

async function exportScheduleToImage() {
  if (
    !currentProcessedData ||
    !currentProcessedData.daysMapData ||
    Object.values(currentProcessedData.daysMapData).every(
      (arr) => arr.length === 0
    )
  ) {
    alert(
      "No schedule data to export. Please upload and process a file first."
    );
    return;
  }
  const currentSectionName = currentProcessedData.sectionName || "";
  let targetImageWidth, targetImageHeight, filenameSuffix, isPortraitView;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  if (screenHeight > screenWidth) {
    targetImageWidth = screenWidth;
    targetImageHeight = screenHeight;
    filenameSuffix = `${screenWidth}x${screenHeight}`;
    isPortraitView = true;
  } else {
    targetImageWidth = 1920;
    targetImageHeight = 1080;
    filenameSuffix = "1920x1080";
    isPortraitView = false;
  }

  const imageHtml = generateImageExportHTML(
    currentProcessedData.daysMapData,
    isPortraitView,
    currentSectionName,
    targetImageWidth
  );

  const tempExportElement = document.createElement("div");
  tempExportElement.style.position = "absolute";
  tempExportElement.style.left = "-9999px";
  tempExportElement.style.top = "-9999px";
  tempExportElement.style.width = `${targetImageWidth}px`;
  tempExportElement.style.backgroundColor = "#ffffff";
  tempExportElement.innerHTML = imageHtml;
  document.body.appendChild(tempExportElement);

  try {
    if (exportButton) {
      exportButton.textContent = "Generating Image...";
      exportButton.disabled = true;
    }

    const canvas = await html2canvas(tempExportElement, {
      scale: window.devicePixelRatio || 1,
      useCORS: true,
      logging: false,
      backgroundColor: null,
      width: tempExportElement.scrollWidth,
      height: tempExportElement.scrollHeight,
      windowWidth: tempExportElement.scrollWidth,
      windowHeight: tempExportElement.scrollHeight,
    });

    let finalCanvas;

    if (isPortraitView) {
      finalCanvas = document.createElement("canvas");
      finalCanvas.width = targetImageWidth * (window.devicePixelRatio || 1);
      finalCanvas.height = targetImageHeight * (window.devicePixelRatio || 1);
      finalCanvas.style.width = `${targetImageWidth}px`;
      finalCanvas.style.height = `${targetImageHeight}px`;

      const ctx = finalCanvas.getContext("2d");
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, targetImageWidth, targetImageHeight);

      const capturedContentWidth =
        canvas.width / (window.devicePixelRatio || 1);
      const capturedContentHeight =
        canvas.height / (window.devicePixelRatio || 1);
      const paddingFactor = 0.96;
      const effectiveTargetWidth = targetImageWidth * paddingFactor;
      const effectiveTargetHeight = targetImageHeight * paddingFactor;
      const scaleRatio = Math.min(
        effectiveTargetWidth / capturedContentWidth,
        effectiveTargetHeight / capturedContentHeight
      );
      const newWidth = capturedContentWidth * scaleRatio;
      const newHeight = capturedContentHeight * scaleRatio;
      const x = (targetImageWidth - newWidth) / 2;
      const y = (targetImageHeight - newHeight) / 2;
      ctx.drawImage(canvas, x, y, newWidth, newHeight);
      ctx.scale(1, 1);
    } else {
      finalCanvas = document.createElement("canvas");
      finalCanvas.width = targetImageWidth;
      finalCanvas.height = targetImageHeight;
      const ctx = finalCanvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, targetImageWidth, targetImageHeight);

      const capturedWidth = canvas.width;
      const capturedHeight = canvas.height;
      const paddingFactor = 0.92;
      const effectiveTargetWidth = targetImageWidth * paddingFactor;
      const effectiveTargetHeight = targetImageHeight * paddingFactor;
      const scaleRatio = Math.min(
        effectiveTargetWidth / capturedWidth,
        effectiveTargetHeight / capturedHeight
      );
      const newWidth = capturedWidth * scaleRatio;
      const newHeight = capturedHeight * scaleRatio;
      const x = (targetImageWidth - newWidth) / 2;
      const y = (targetImageHeight - newHeight) / 2;
      ctx.drawImage(canvas, x, y, newWidth, newHeight);
    }

    const imageDataURL = finalCanvas.toDataURL("image/png");
    let downloadFilename = `weekly_schedule_${filenameSuffix}.png`;
    if (currentSectionName) {
      const sanitizedSectionName = currentSectionName
        .replace(/[^a-z0-9_\-]/gi, "_")
        .replace(/_{2,}/g, "_");
      downloadFilename = `weekly_schedule_${sanitizedSectionName}_${filenameSuffix}.png`;
    }
    const downloadLink = document.createElement("a");
    downloadLink.href = imageDataURL;
    downloadLink.download = downloadFilename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (error) {
    console.error("Error exporting to image:", error);
    alert("Failed to export image. See console for details.");
  } finally {
    if (tempExportElement.parentNode) {
      // Check if still child of body
      document.body.removeChild(tempExportElement);
    }
    if (exportButton) {
      exportButton.textContent = "Export Schedule as Image";
      const hasData =
        currentProcessedData?.daysMapData &&
        Object.values(currentProcessedData.daysMapData).some(
          (arr) => arr.length > 0
        );
      exportButton.disabled = !hasData;
    }
  }
}

if (exportButton) {
  exportButton.addEventListener("click", exportScheduleToImage);
}
