//Developed By: James Ryan S. Gallego

const API_ENDPOINT = 'https://flaskproject-gurc.onrender.com/process-pdf';

const uploadInput = document.getElementById("xlsx-upload");
const dragDropArea = document.getElementById("drag-drop-area");
const excelPreview = document.getElementById("excel-preview");
const exportButton = document.getElementById("export-image-btn");
const themeButtons = document.querySelectorAll(".theme-btn");

let currentProcessedData = null;

// --- Event Listeners ---
dragDropArea.addEventListener("click", () => uploadInput.click());
uploadInput.addEventListener("change", (e) => handleFileSelect(e.target.files[0]));
dragDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dragDropArea.style.backgroundColor = "var(--secondary-color)";
});
dragDropArea.addEventListener("dragleave", () => {
    dragDropArea.style.backgroundColor = "";
});
dragDropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
    dragDropArea.style.backgroundColor = "";
});

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const theme = button.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Apply saved theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'default';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const activeButton = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
    if(activeButton) {
        activeButton.classList.add('active');
    }
});


// =========================================================================
// --- CORE FILE HANDLING ---
// =========================================================================
async function handleFileSelect(file) {
    if (!file) {
        showError("No file was selected.");
        return;
    }
    if (file.size === 0) {
        showError("The selected file is empty (0 bytes). Please select a valid PDF.");
        return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showError("Please upload a valid .pdf file.");
        return;
    }

    currentProcessedData = null;
    excelPreview.innerHTML = "<p>Uploading and processing PDF...</p>";
    if (exportButton) exportButton.disabled = true;

    const formData = new FormData();
    formData.append('pdf_file', file);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        console.log(data);

        if (!response.ok) {
            throw new Error(data.error || `Server responded with status ${response.status}`);
        }

        const transformedData = transformBackendDataToDaysMap(data);
        currentProcessedData = transformedData;
        const webHtml = generateWebDisplayHTML(currentProcessedData.daysMapData);
        displayHTMLContent(webHtml);
        const hasData = Object.values(currentProcessedData.daysMapData).some(arr => arr.length > 0);
        if (exportButton) exportButton.disabled = !hasData;
        if (!hasData) {
            excelPreview.innerHTML = `<p>No schedule data could be extracted from the file.</p>`;
        }

    } catch (error) {
        console.error("Error communicating with backend:", error);
        showError(error.message);
    }
}

function showError(message) {
    excelPreview.innerHTML = `<p style="color:red; font-weight:bold;">Error: ${message}</p>`;
    if (exportButton) exportButton.disabled = true;
    currentProcessedData = null;
}

function transformBackendDataToDaysMap(backendData) {
    const daysMap = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };

    if (!backendData || !backendData.subjects) {
        return { daysMapData: daysMap, sectionName: "" };
    }

    // A more flexible regex that handles various time formats, including those with spaces.
    // It captures the time part and the day part separately.
    const scheduleRegex = /((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*-\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))|(?:\d{1,2}(?::\d{2})?-\d{1,2}(?::\d{2})?|\d{1,2}-\d{1,2})\s*(?:am|pm))\s+([MTWFHSaTh]+)/i;


    for (const subjectData of backendData.subjects) {
        for (const schedule of subjectData.schedules) {
            // 1. Clean the input strings to handle extra spaces from data extraction
            const cleanedTime = schedule.time.replace(/\s+/g, ' ').replace(/(\d)\s*-\s*(\d)/g, '$1-$2').trim();
            const cleanedSubject = subjectData.subject.replace(/\s+/g, ' ').trim();
            const cleanedRoom = schedule.room.replace(/\s+/g, ' ').trim();

            const match = cleanedTime.match(scheduleRegex);

            if (match) {
                const timePart = match[1].trim();
                const daysString = match[2].trim().toUpperCase();

                const scheduleEntry = {
                    subject: cleanedSubject,
                    time: timePart,
                    room: cleanedRoom,
                };

                let i = 0;
                while (i < daysString.length) {
                    if (daysString.substring(i, i + 2) === "TH") {
                        daysMap.Thursday.push(scheduleEntry);
                        i += 2;
                    } else {
                        const dayCode = daysString.charAt(i);
                        if (dayCode === "M") daysMap.Monday.push(scheduleEntry);
                        else if (dayCode === "T") daysMap.Tuesday.push(scheduleEntry);
                        else if (dayCode === "W") daysMap.Wednesday.push(scheduleEntry);
                        else if (dayCode === "F") daysMap.Friday.push(scheduleEntry);
                        else if (dayCode === "S") daysMap.Saturday.push(scheduleEntry);
                        i += 1;
                    }
                }
            }
        }
    }
    // Clean the section name as well
    const sectionName = backendData.sectionName ? backendData.sectionName.replace(/\s+/g, ' ').trim() : "";
    return { daysMapData: daysMap, sectionName: sectionName };
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
    let htmlContent = "<div id='preview-wrapper' style='padding: 10px; background-color: var(--card-background); border: var(--card-border); margin-top:10px; border-radius: 8px;'><h2 style='text-align: center; font-family: sans-serif; margin-bottom: 15px; color: var(--text-color);'>Weekly Schedule (Preview)</h2><table style='width: 100%; margin: 0 auto; border-collapse: collapse; font-family: sans-serif; font-size: 13px;'><thead style='background-color: var(--secondary-color);'><tr><th style='padding: 10px; text-align: left; border-bottom: 2px solid var(--card-border);'>Day</th><th style='padding: 10px; text-align: left; border-bottom: 2px solid var(--card-border);'>Subject & Time</th><th style='padding: 10px; text-align: left; border-bottom: 2px solid var(--card-border);'>Room</th></tr></thead><tbody>";
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const day of daysOrder) {
        const daySchedule = daysMap[day]?.sort(sortByTime) || [];
        const daySubjects = daySchedule.map((item) => `${item.subject} (${item.time})`).join("<br>");
        const dayRooms = daySchedule.map((item) => item.room).join("<br>");
        htmlContent += `<tr><td style='padding: 8px; vertical-align: top; border-bottom: 1px solid var(--card-border); font-weight: bold; color: var(--text-color);'>${day}</td><td style='padding: 8px; vertical-align: top; border-bottom: 1px solid var(--card-border); color: var(--text-color);'>${daySubjects||" "}</td><td style='padding: 8px; vertical-align: top; border-bottom: 1px solid var(--card-border); color: var(--text-color);'>${dayRooms||" "}</td></tr>`;
    }
    return htmlContent + "</tbody></table></div>";
}

function displayHTMLContent(htmlContent) { excelPreview.innerHTML = htmlContent; }

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
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    ctx.fillStyle = palette.cardBg;
    drawRoundedRect(ctx, x, y, width, height, layout.cardRadius);

    ctx.shadowColor = 'transparent'; // Reset shadow for other elements

    if (palette.cardBorder) {
        ctx.strokeStyle = palette.cardBorder;
        ctx.lineWidth = 1;
        // Redraw rounded rect for stroke
        ctx.beginPath(); ctx.moveTo(x + layout.cardRadius, y);
        ctx.lineTo(x + width - layout.cardRadius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + layout.cardRadius);
        ctx.lineTo(x + width, y + height - layout.cardRadius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + layout.cardRadius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - layout.cardRadius);
        ctx.lineTo(x, y + layout.cardRadius); ctx.quadraticCurveTo(x, y, x + layout.cardRadius, y);
        ctx.closePath(); ctx.stroke();
    }

    ctx.textAlign = 'left';
    const contentX = x + layout.cardPadding; const contentWidth = width - layout.cardPadding * 2;
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
    const { width, height, isPortrait, data, sectionName, theme } = options;
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const gridConfig = { cols: isPortrait ? 2 : 3, rows: isPortrait ? 3 : 2 };

    const themes = {
        default: { bg: '#F4F7FC', cardBg: '#FFFFFF', shadow: 'rgba(100, 100, 150, 0.1)', title: '#1A253C', dayTitle: '#3A506B', subject: '#2C3E50', details: '#5A6B7B', separator: '#EAEFF7' },
        dark: { bg: '#121212', cardBg: '#1E1E1E', shadow: 'rgba(0, 0, 0, 0.5)', title: '#E0E0E0', dayTitle: '#1E90FF', subject: '#E0E0E0', details: '#B0B0B0', separator: '#2A2A2A' },
        maroon: { bg: '#FDF5E6', cardBg: '#FFFFFF', shadow: 'rgba(128, 0, 0, 0.1)', title: '#800000', dayTitle: '#A52A2A', subject: '#4B3832', details: '#6F4E37', separator: '#EAE0D3' },
        wisteria: { bg: '#F5F3F7', cardBg: '#FFFFFF', shadow: 'rgba(155, 137, 179, 0.15)', title: '#9B89B3', dayTitle: '#8A799D', subject: '#3D3C42', details: '#5A5863', separator: '#E6E0F0' },
        'soft-pink': { bg: '#fff0f5', cardBg: '#FFFFFF', shadow: 'rgba(255, 105, 180, 0.1)', title: '#ff69b4', dayTitle: '#333', subject: '#333', details: '#555', separator: '#ffc0cb' },
        autumn: { bg: '#fdf6e8', cardBg: '#FEFBF6', shadow: 'rgba(136, 103, 54, 0.15)', title: '#D88C22', dayTitle: '#886736', subject: '#4D4030', details: '#6B5B47', separator: '#F7E7D4' },
        winter: { bg: '#F0F4F8', cardBg: '#FFFFFF', shadow: 'rgba(74, 144, 226, 0.1)', title: '#4A90E2', dayTitle: '#2F3B4B', subject: '#2F3B4B', details: '#5A6B7B', separator: '#EBF2FA' },
        summer: { bg: '#FFFBEA', cardBg: '#FFFFFF', shadow: 'rgba(255, 199, 0, 0.2)', title: '#F57C00', dayTitle: '#D4A000', subject: '#5D4037', details: '#795548', separator: '#FFF8E1' },
        sakura: { bg: '#FEF9FA', cardBg: '#FFFFFF', shadow: 'rgba(255, 183, 197, 0.2)', title: '#E895A5', dayTitle: '#D991A0', subject: '#5C474B', details: '#756367', separator: '#FFF5F7' }
    };

    const palette = themes[theme] || themes.default;
    const fontFamily = '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

    // --- Draw Thematic Backgrounds ---
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    const imageThemes = {
        summer: 'img/summer.jpg',
        autumn: 'img/autumn.jpg',
        winter: 'img/winter.jpg',
        sakura: 'img/sakura.jpg'
    };

    let backgroundPromise = Promise.resolve();

    if (imageThemes[theme]) {
        backgroundPromise = new Promise((resolve) => {
            const bgImage = new Image();
            bgImage.src = imageThemes[theme];
            bgImage.onload = () => {
                ctx.drawImage(bgImage, 0, 0, width, height);
                resolve();
            };
            bgImage.onerror = () => {
                console.error(`Failed to load ${imageThemes[theme]}. Using fallback color.`);
                ctx.fillStyle = palette.bg;
                ctx.fillRect(0, 0, width, height);
                resolve();
            };
        });
    }

    await backgroundPromise;

    const idealBaseFontSize = isPortrait ? width / 35 : 28;
    const idealLayout = {
        padding: isPortrait ? width * 0.08 : 70, gap: isPortrait ? width * 0.05 : 35,
        cardRadius: 16, cardPadding: isPortrait ? width * 0.06 : 35,
        entryGap: idealBaseFontSize * 1.4,
    };
    const idealFonts = {
        base: idealBaseFontSize, title: { size: idealBaseFontSize * 1.8, weight: 700 },
        dayTitle: { size: idealBaseFontSize * 1.1, weight: 600 },
        subject: { size: idealBaseFontSize, weight: 600 },
        details: { size: idealBaseFontSize * 0.9, weight: 400 },
    };

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

    const finalLayout = Object.fromEntries(Object.entries(idealLayout).map(([k, v]) => [k, v * scale]));
    finalLayout.padding = idealLayout.padding;
    const finalFonts = {
        base: idealFonts.base * scale,
        title: { size: idealFonts.title.size * scale, weight: 700 },
        dayTitle: { size: idealFonts.dayTitle.size * scale, weight: 600 },
        subject: { size: idealFonts.subject.size * scale, weight: 600 },
        details: { size: idealFonts.details.size * scale, weight: 400 },
    };

    // --- Draw Title ---
    ctx.fillStyle = palette.title;
    ctx.font = `${finalFonts.title.weight} ${finalFonts.title.size}px ${fontFamily}`;
    ctx.textAlign = 'center';
    const mainTitle = sectionName ? `Schedule for ${sectionName}` : 'Weekly Schedule';
    const titleY = finalLayout.padding + finalFonts.title.size;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(mainTitle, width / 2, titleY);
    ctx.shadowColor = 'transparent';

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
                drawCard(ctx, dayName, daySchedule, cardX, currentY, finalCardWidth, rowHeight, finalLayout, finalFonts, palette, fontFamily);
            }
        }
        currentY += rowHeight + finalLayout.gap;
    }

    // --- ADD WATERMARK ---
    ctx.save();
    const watermarkSize = finalFonts.details.size * 1.2;
    ctx.font = `italic ${watermarkSize}px ${fontFamily}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 3;
    ctx.fillText("James Ryan", width - finalLayout.padding, height - finalLayout.padding);
    ctx.restore();
}

async function exportScheduleToImage() {
    if (!currentProcessedData || !currentProcessedData.daysMapData) {
        alert("No schedule data to export. Please upload a file first.");
        return;
    }
    const currentSectionName = currentProcessedData.sectionName || "";
    const selectedTheme = localStorage.getItem('theme') || 'default';

    const dpr = window.devicePixelRatio || 1;

    const targetImageWidth = screen.width * dpr;
    const targetImageHeight = screen.height * dpr;
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
            sectionName: currentSectionName,
            theme: selectedTheme
        });

        const imageDataURL = canvas.toDataURL("image/png");
        let downloadFilename = `schedule_${selectedTheme}_${filenameSuffix}.png`;
        if (currentSectionName) {
            const sanitizedSectionName = currentSectionName.replace(/[^a-z0-9_\-]/gi, "_").replace(/_{2,}/g, "_");
            downloadFilename = `schedule_${sanitizedSectionName}_${selectedTheme}_${filenameSuffix}.png`;
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