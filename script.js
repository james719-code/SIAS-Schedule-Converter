// Required setup for PDF.js. This MUST be at the top.
const uploadInput = document.getElementById("xlsx-upload");
const dragDropArea = document.getElementById("drag-drop-area");
const excelPreview = document.getElementById("excel-preview");
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
      const data = reader.result;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: data });
        const pdf = await loadingTask.promise;

        if (pdf.numPages < 1) {
          showError("The PDF file is empty or invalid.");
          return;
        }

        let combinedData = {
          daysMapData: { Monday:[], Tuesday:[], Wednesday:[], Thursday:[], Friday:[], Saturday:[] },
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
        const webHtml = generateWebDisplayHTML(currentProcessedData.daysMapData);
        displayHTMLContent(webHtml);

        const hasData = Object.values(currentProcessedData.daysMapData).some(arr => arr.length > 0);
        if (exportButton) exportButton.disabled = !hasData;

        if (!hasData && !excelPreview.querySelector('p[style*="color:red"]')) {
          excelPreview.innerHTML = `<p>No schedule data found. Please ensure it is the correct "Certificate of Enrollment" file and is not an image.</p>`;
        }
      } catch (error) {
        console.error("Error processing PDF file:", error);
        showError("Error processing PDF: Ensure it's valid, not corrupted, and text-based.");
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

// --- PDF PARSING & UTILITY LOGIC (Unchanged) ---
function processPdfTextContent(textContent) {
  const daysMap = { Monday:[], Tuesday:[], Wednesday:[], Thursday:[], Friday:[], Saturday:[] };
  let extractedSectionName = "";
  const rows = {};
  for (const item of textContent.items) {
    const y = Math.round(item.transform[5]);
    if (!rows[y]) rows[y] = [];
    rows[y].push({ text: item.str, x: item.transform[4] });
  }
  const scheduleRegex = /((?:\d{1,2}:\d{2}-\d{1,2}:\d{2}|\d{1,2}-\d{1,2})\s*(?:am|pm))\s+([A-ZTHSA]+)/i;
  for (const y in rows) {
    const rowItems = rows[y].sort((a, b) => a.x - b.x);
    const fullLineText = rowItems.map((item) => item.text).join(" ");
    const match = fullLineText.match(scheduleRegex);
    if (match) {
      const time = match[1].trim();
      const daysString = match[2].trim();
      const fullScheduleString = match[0];
      const parts = fullLineText.split(fullScheduleString);
      let subject = parts[0].trim().replace(/^[A-Z0-9-]+\s+[A-Z0-9-]+\s*/, "").replace(/\s+\d\.\d$/, "").trim();
      const remainingPart = parts[1].trim();
      const remainingParts = remainingPart.split(/\s+/);
      const section = remainingParts.pop();
      let roomRaw = remainingParts.join("");
      const roomMatch = roomRaw.match(/^([A-Za-z]+)(\d+)/);
      let room = roomMatch ? `${roomMatch[1]} ${roomMatch[2]}` : roomRaw;
      if (section && !extractedSectionName) extractedSectionName = section;
      if (room === "IITROOM 2") room = "IITRM 20";
      let i = 0;
      const tempDaysUpper = daysString.toUpperCase();
      while (i < tempDaysUpper.length) {
        if (i + 1 < tempDaysUpper.length && tempDaysUpper.substring(i, i + 2) === "TH") {
          daysMap.Thursday.push({ subject, time, room }); i += 2;
        } else if (i + 1 < tempDaysUpper.length && tempDaysUpper.substring(i, i + 2) === "SA") {
          daysMap.Saturday.push({ subject, time, room }); i += 2;
        } else {
          const dayCode = tempDaysUpper.charAt(i);
          if (dayCode === "M") daysMap.Monday.push({ subject, time, room });
          else if (dayCode === "T") daysMap.Tuesday.push({ subject, time, room });
          else if (dayCode === "W") daysMap.Wednesday.push({ subject, time, room });
          else if (dayCode === "F") daysMap.Friday.push({ subject, time, room });
          else if (dayCode === "S") daysMap.Saturday.push({ subject, time, room });
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
  const hourMinPart = match[1]; const period = match[2];
  let [hourStr, minuteStr] = hourMinPart.split(":");
  let hour = parseInt(hourStr, 10); let minute = minuteStr ? parseInt(minuteStr, 10) : 0;
  if (isNaN(hour) || isNaN(minute)) return 0;
  if (period === "pm" && hour !== 12) hour += 12; else if (period === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}
const sortByTime = (a, b) => {
  function extractActualStartTime(fullTimeStr) {
    if (!fullTimeStr || typeof fullTimeStr !== "string") return "";
    let match = fullTimeStr.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (match && match[1]) return match[1].trim();
    const firstPartMatch = fullTimeStr.match(/^(\d{1,2}(?::\d{2})?)/);
    if (firstPartMatch && firstPartMatch[1]) {
      const numericStart = firstPartMatch[1];
      const periodMatch = fullTimeStr.match(/(am|pm)\s*$/i);
      if (periodMatch && periodMatch[1]) return `${numericStart} ${periodMatch[1]}`;
      return numericStart;
    }
    return fullTimeStr.split("-")[0].trim();
  }
  return convertTo24HourTime(extractActualStartTime(a.time)) - convertTo24HourTime(extractActualStartTime(b.time));
};
function generateWebDisplayHTML(daysMap) {
  let htmlContent = "<div style='padding: 10px; background-color: #fff; border: 1px solid #e0e0e0; margin-top:10px;'><h2 style='text-align: center; font-family: sans-serif; margin-bottom: 15px; color: #555;'>Weekly Schedule (Preview)</h2><table style='width: 100%; margin: 0 auto; border-collapse: collapse; font-family: sans-serif; font-size: 13px;'><thead style='background-color: #f8f8f8;'><tr><th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Day</th><th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Subject & Time</th><th style='padding: 10px; text-align: left; border-bottom: 2px solid #ddd;'>Room</th></tr></thead><tbody>";
  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (const day of daysOrder) {
    const daySchedule = daysMap[day]?.sort(sortByTime) || [];
    const daySubjects = daySchedule.map((item) => `${item.subject} (${item.time})`).join("<br>");
    const dayRooms = daySchedule.map((item) => item.room).join("<br>");
    htmlContent += `<tr><td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee; font-weight: bold;'>${day}</td><td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee;'>${daySubjects||" "}</td><td style='padding: 8px; vertical-align: top; border-bottom: 1px solid #eee;'>${dayRooms||" "}</td></tr>`;
  }
  return htmlContent + "</tbody></table></div>";
}
function displayHTMLContent(htmlContent) { excelPreview.innerHTML = htmlContent; }


// --- FINAL, "SMART GRID" CANVAS DRAWING ENGINE ---
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath(); ctx.fill();
}

function measureCardContentHeight(ctx, schedule, contentWidth, layout, fonts, fontFamily) {
    let height = fonts.dayTitle.size + (fonts.dayTitle.size * 0.6) + (fonts.dayTitle.size * 1.2);
    if (schedule.length === 0) { height += fonts.details.size; } 
    else {
        for (const item of schedule) {
            ctx.font = `${fonts.subject.weight} ${fonts.subject.size}px ${fontFamily}`;
            const words = item.subject.split(' '); let line = ''; let lineCount = 0;
            for (const word of words) {
                const testLine = line ? `${line} ${word}` : word;
                if (ctx.measureText(testLine).width > contentWidth && line) { lineCount++; line = word; } else { line = testLine; }
            }
            lineCount++; height += (lineCount * fonts.subject.size * 1.15);
            height += (fonts.details.size * 1.1); height += layout.entryGap;
        }
        height -= layout.entryGap;
    }
    return height;
}

function drawCard(ctx, dayName, schedule, x, y, width, height, layout, fonts, palette, fontFamily) {
    ctx.shadowColor = palette.shadow; ctx.shadowBlur = 20 * (fonts.base / 24);
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 5 * (fonts.base / 24);
    ctx.fillStyle = palette.cardBg; drawRoundedRect(ctx, x, y, width, height, layout.cardRadius);
    ctx.shadowColor = 'transparent'; ctx.textAlign = 'left';
    const contentX = x + layout.cardPadding; const contentWidth = width - layout.cardPadding * 2;
    
    // This is now a top-aligned layout, not vertically centered.
    let currentY = y + layout.cardPadding;
    
    ctx.fillStyle = palette.dayTitle; ctx.font = `${fonts.dayTitle.weight} ${fonts.dayTitle.size}px ${fontFamily}`;
    ctx.fillText(dayName.toUpperCase(), contentX, currentY);
    currentY += fonts.dayTitle.size + (fonts.dayTitle.size * 0.6);

    ctx.strokeStyle = palette.separator; ctx.lineWidth = Math.max(1, 2 * (fonts.base / 24));
    ctx.beginPath(); ctx.moveTo(contentX, currentY); ctx.lineTo(contentX + contentWidth, currentY); ctx.stroke();
    currentY += (fonts.dayTitle.size * 1.2);

    if (schedule.length === 0) {
        ctx.fillStyle = palette.details; ctx.font = `${fonts.details.weight} ${fonts.details.size}px ${fontFamily}`;
        ctx.fillText("No classes", contentX, currentY);
    } else {
        for (const item of schedule) {
            ctx.font = `${fonts.subject.weight} ${fonts.subject.size}px ${fontFamily}`; ctx.fillStyle = palette.subject;
            const words = item.subject.split(' '); let line = ''; let subjectLines = [];
            for (const word of words) {
                const testLine = line ? `${line} ${word}` : word;
                if (ctx.measureText(testLine).width > contentWidth && line) { subjectLines.push(line); line = word; } else { line = testLine; }
            }
            subjectLines.push(line);
            for(const line of subjectLines) { ctx.fillText(line, contentX, currentY); currentY += fonts.subject.size * 1.15; }
            ctx.fillStyle = palette.details; ctx.font = `${fonts.details.weight} ${fonts.details.size}px ${fontFamily}`;
            ctx.fillText(`${item.time}  •  ${item.room}`, contentX, currentY);
            currentY += layout.entryGap;
        }
    }
}

async function drawScheduleOnCanvas(ctx, options) {
    const { width, height, isPortrait, data, sectionName } = options;
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const gridConfig = { cols: isPortrait ? 2 : 3, rows: isPortrait ? 3 : 2 };
    const palette = { bg: '#F4F7FC', cardBg: '#FFFFFF', shadow: 'rgba(100, 100, 150, 0.1)', title: '#1A253C', dayTitle: '#3A506B', subject: '#2C3E50', details: '#5A6B7B', separator: '#EAEFF7' };
    const fontFamily = '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

    // --- 1. DEFINE IDEAL METRICS ---
    const idealBaseFontSize = isPortrait ? width / 35 : 28;
    const idealLayout = {
        padding: isPortrait ? width * 0.08 : 70,
        gap: isPortrait ? width * 0.05 : 35,
        cardRadius: 16, cardPadding: isPortrait ? width * 0.06 : 35,
        entryGap: idealBaseFontSize * 1.4,
    };
    const idealFonts = {
        base: idealBaseFontSize, title: { size: idealBaseFontSize * 1.8, weight: 700 },
        dayTitle: { size: idealBaseFontSize * 1.1, weight: 600 },
        subject: { size: idealBaseFontSize, weight: 600 },
        details: { size: idealBaseFontSize * 0.9, weight: 400 },
    };

    // --- 2. PRE-CALCULATE REQUIRED HEIGHT & SCALING ---
    const idealCardWidth = (width - idealLayout.padding * 2 - idealLayout.gap * (gridConfig.cols - 1)) / gridConfig.cols;
    const contentWidth = idealCardWidth - idealLayout.cardPadding * 2;
    let idealRowHeights = [];
    for (let r = 0; r < gridConfig.rows; r++) {
        let maxRowHeight = 0;
        for (let c = 0; c < gridConfig.cols; c++) {
            const dayIndex = r * gridConfig.cols + c;
            if (dayIndex < daysOrder.length) {
                const daySchedule = data[daysOrder[dayIndex]]?.sort(sortByTime) || [];
                const contentHeight = measureCardContentHeight(ctx, daySchedule, contentWidth, idealLayout, idealFonts, fontFamily);
                maxRowHeight = Math.max(maxRowHeight, contentHeight);
            }
        }
        idealRowHeights.push(idealLayout.cardPadding * 2 + maxRowHeight);
    }
    const totalIdealGridHeight = idealRowHeights.reduce((a, b) => a + b, 0) + (idealLayout.gap * (gridConfig.rows - 1));
    const titleAreaHeight = idealLayout.padding + idealFonts.title.size + idealFonts.title.size * 1.5;
    const availableHeight = height - titleAreaHeight - idealLayout.padding;
    const scale = Math.min(1.0, availableHeight / totalIdealGridHeight);

    // --- 3. CREATE FINAL, SCALED METRICS ---
    const finalLayout = Object.fromEntries(Object.entries(idealLayout).map(([k, v]) => [k, v * scale]));
    finalLayout.padding = idealLayout.padding;
    const finalFonts = {
        base: idealFonts.base * scale,
        title: { size: idealFonts.title.size * scale, weight: 700 },
        dayTitle: { size: idealFonts.dayTitle.size * scale, weight: 600 },
        subject: { size: idealFonts.subject.size * scale, weight: 600 },
        details: { size: idealFonts.details.size * scale, weight: 400 },
    };
    
    // --- 4. DRAWING ---
    ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = palette.title; ctx.font = `${finalFonts.title.weight} ${finalFonts.title.size}px ${fontFamily}`;
    ctx.textAlign = 'center'; const mainTitle = sectionName ? `Schedule for ${sectionName}` : 'Weekly Schedule';
    const titleY = finalLayout.padding + finalFonts.title.size;
    ctx.fillText(mainTitle, width / 2, titleY);

    let currentY = titleY + finalFonts.title.size * 1.5;
    const finalCardWidth = idealCardWidth * scale;
    const totalGridWidth = (finalCardWidth * gridConfig.cols) + (finalLayout.gap * (gridConfig.cols - 1));
    const gridStartX = (width - totalGridWidth) / 2;

    for (let r = 0; r < gridConfig.rows; r++) {
        const rowHeight = idealRowHeights[r] * scale;
        for (let c = 0; c < gridConfig.cols; c++) {
            const dayIndex = r * gridConfig.cols + c;
            if (dayIndex < daysOrder.length) {
                const dayName = daysOrder[dayIndex];
                const daySchedule = data[dayName]?.sort(sortByTime) || [];
                const cardX = gridStartX + c * (finalCardWidth + finalLayout.gap);
                // Call the updated top-aligned drawCard function
                drawCard(ctx, dayName, daySchedule, cardX, currentY, finalCardWidth, rowHeight, finalLayout, finalFonts, palette, fontFamily);
            }
        }
        currentY += rowHeight + finalLayout.gap;
    }
}


// --- IMAGE EXPORT FUNCTION ---
async function exportScheduleToImage() {
  if (!currentProcessedData || !currentProcessedData.daysMapData) {
    alert("No schedule data to export. Please upload a file first.");
    return;
  }
  const currentSectionName = currentProcessedData.sectionName || "";

  const targetImageWidth = screen.width;
  const targetImageHeight = screen.height;
  const isPortraitView = targetImageHeight > targetImageWidth;
  const filenameSuffix = `${targetImageWidth}x${targetImageHeight}_wallpaper`;

  const canvas = document.createElement('canvas');
  canvas.width = targetImageWidth;
  canvas.height = targetImageHeight;
  const ctx = canvas.getContext('2d');

  try {
    if (exportButton) {
      exportButton.textContent = "Generating Wallpaper...";
      exportButton.disabled = true;
    }
    
    await drawScheduleOnCanvas(ctx, {
        width: targetImageWidth,
        height: targetImageHeight,
        isPortrait: isPortraitView,
        data: currentProcessedData.daysMapData,
        sectionName: currentSectionName
    });

    const imageDataURL = canvas.toDataURL("image/png");
    let downloadFilename = `schedule_wallpaper_${filenameSuffix}.png`;
    if (currentSectionName) {
      const sanitizedSectionName = currentSectionName.replace(/[^a-z0-9_\-]/gi, "_").replace(/_{2,}/g, "_");
      downloadFilename = `schedule_${sanitizedSectionName}_${filenameSuffix}.png`;
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
    if (exportButton) {
      exportButton.textContent = "Export as Wallpaper";
      const hasData = currentProcessedData?.daysMapData && Object.values(currentProcessedData.daysMapData).some(arr => arr.length > 0);
      exportButton.disabled = !hasData;
    }
  }
}

if (exportButton) {
  exportButton.addEventListener("click", exportScheduleToImage);
}