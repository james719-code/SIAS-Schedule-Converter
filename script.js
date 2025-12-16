// Developed By: James Ryan S. Gallego

const API_ENDPOINT = 'https://flaskproject-gurc.onrender.com/process-pdf';

// --- DOM Elements ---
const uploadInput = document.getElementById("xlsx-upload");
const dragDropArea = document.getElementById("drag-drop-area");
const excelPreview = document.getElementById("excel-preview");
const previewContainer = document.getElementById("preview-container");
const exportButton = document.getElementById("export-image-btn");
const fullscreenButton = document.getElementById("fullscreen-btn");
const themeButtons = document.querySelectorAll(".theme-btn");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");
const themeToggle = document.getElementById("theme-toggle");

let currentProcessedData = null;

// =========================================================================
// --- INITIALIZATION & EVENT LISTENERS ---
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'default';
    setTheme(savedTheme);
});

// Drag & Drop
dragDropArea.addEventListener("click", () => uploadInput.click());
uploadInput.addEventListener("change", (e) => handleFileSelect(e.target.files[0]));
dragDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dragDropArea.style.borderColor = "var(--primary)";
    dragDropArea.style.backgroundColor = "rgba(var(--primary), 0.1)";
});
dragDropArea.addEventListener("dragleave", () => {
    dragDropArea.style.borderColor = "";
    dragDropArea.style.backgroundColor = "";
});
dragDropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDropArea.style.borderColor = "";
    dragDropArea.style.backgroundColor = "";
    handleFileSelect(e.dataTransfer.files[0]);
});

// Theme Switching
themeButtons.forEach(button => {
    button.addEventListener('click', () => setTheme(button.dataset.theme));
});

// Mobile Menu
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Full Screen Toggle
if(fullscreenButton) {
    fullscreenButton.addEventListener('click', toggleFullScreen);
}

// Export
if(exportButton) {
    exportButton.addEventListener("click", exportScheduleToImage);
}

// Theme Toggle Button (Navbar)
themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'default' : 'dark';
    setTheme(newTheme);
});

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update active state on color swatches
    themeButtons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if(activeBtn) activeBtn.classList.add('active');
}

function toggleFullScreen() {
    previewContainer.classList.toggle('fullscreen-mode');
    const icon = fullscreenButton.querySelector('i');
    const text = fullscreenButton.querySelector('.btn-text');

    if (previewContainer.classList.contains('fullscreen-mode')) {
        icon.classList.remove('fa-expand');
        icon.classList.add('fa-compress');
        text.textContent = "Exit Full Screen";
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    } else {
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
        text.textContent = "Full Screen";
        document.body.style.overflow = "";
    }
}

// =========================================================================
// --- CORE FILE HANDLING ---
// =========================================================================

async function handleFileSelect(file) {
    if (!file) return;

    if (file.size === 0) {
        showError("The selected file is empty.");
        return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showError("Please upload a valid .pdf file.");
        return;
    }

    // Reset UI
    currentProcessedData = null;
    excelPreview.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Processing your schedule...</p>
        </div>`;
    if (exportButton) exportButton.disabled = true;
    if (fullscreenButton) fullscreenButton.disabled = true;

    const formData = new FormData();
    formData.append('pdf_file', file);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server Status: ${response.status}`);
        }

        const transformedData = transformBackendDataToDaysMap(data);
        currentProcessedData = transformedData;

        // Check if we actually have data
        const hasData = Object.values(currentProcessedData.daysMapData).some(arr => arr.length > 0);

        if (!hasData) {
            showError("No schedule data could be extracted.");
            return;
        }

        // Render HTML for Web View
        renderScheduleWeb(currentProcessedData.daysMapData);

        // Enable buttons
        if (exportButton) exportButton.disabled = false;
        if (fullscreenButton) fullscreenButton.disabled = false;

    } catch (error) {
        console.error("Backend Error:", error);
        showError(error.message);
    }
}

function showError(message) {
    excelPreview.innerHTML = `
        <div class="empty-state" style="color: var(--primary);">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error: ${message}</p>
        </div>`;
    if (exportButton) exportButton.disabled = true;
    if (fullscreenButton) fullscreenButton.disabled = true;
}

// =========================================================================
// --- DATA TRANSFORMATION ---
// =========================================================================

function transformBackendDataToDaysMap(backendData) {
    const daysMap = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };

    if (!backendData || !backendData.subjects) {
        return { daysMapData: daysMap, sectionName: "" };
    }

    const dayRegex = /([MTWFHSaTh]+)$/i;

    for (const subjectData of backendData.subjects) {
        const cleanedSubject = subjectData.subject.replace(/\s+/g, ' ').trim();

        for (const schedule of subjectData.schedules) {
            const originalTimeString = schedule.time;
            const match = originalTimeString.match(dayRegex);

            if (match) {
                const daysString = match[1].toUpperCase();
                const timePartRaw = originalTimeString.substring(0, match.index);
                const cleanedTimePart = timePartRaw.replace(/\s/g, '');
                const cleanedRoom = schedule.room.replace(/\s/g, '');

                const scheduleEntry = {
                    subject: cleanedSubject,
                    time: cleanedTimePart,
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
    const sectionName = backendData.sectionName ? backendData.sectionName.replace(/\s+/g, ' ').trim() : "";
    return { daysMapData: daysMap, sectionName: sectionName };
}

// =========================================================================
// --- WEB RENDERING ---
// =========================================================================

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
            return firstPartMatch[1];
        }
        return fullTimeStr.split("-")[0].trim();
    }
    return convertTo24HourTime(extractActualStartTime(a.time)) - convertTo24HourTime(extractActualStartTime(b.time));
};

function renderScheduleWeb(daysMap) {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const container = document.createElement('div');
    container.className = 'schedule-grid-container';

    daysOrder.forEach(day => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';

        // Header
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        dayColumn.appendChild(header);

        // Content
        const schedule = daysMap[day]?.sort(sortByTime) || [];

        if (schedule.length === 0) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'class-card';
            emptyCard.style.opacity = '0.5';
            emptyCard.innerHTML = '<span class="subject-name" style="font-weight:400">No classes</span>';
            dayColumn.appendChild(emptyCard);
        } else {
            schedule.forEach(item => {
                const card = document.createElement('div');
                card.className = 'class-card';
                card.innerHTML = `
                    <span class="subject-name">${item.subject}</span>
                    <div class="class-details">
                        <span><i class="far fa-clock"></i> ${item.time}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${item.room}</span>
                    </div>
                `;
                dayColumn.appendChild(card);
            });
        }
        container.appendChild(dayColumn);
    });

    excelPreview.innerHTML = '';
    excelPreview.appendChild(container);
}

// =========================================================================
// --- CANVAS EXPORT LOGIC ---
// =========================================================================

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
    ctx.shadowColor = palette.shadow; ctx.shadowBlur = 20; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 5;
    ctx.fillStyle = palette.cardBg;
    drawRoundedRect(ctx, x, y, width, height, layout.cardRadius);
    ctx.shadowColor = 'transparent';

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
        default: { bg: '#F4F7FC', cardBg: '#FFFFFF', shadow: 'rgba(100, 100, 150, 0.1)', title: '#1A253C', dayTitle: '#2563eb', subject: '#2C3E50', details: '#5A6B7B', separator: '#EAEFF7' },
        dark: { bg: '#121212', cardBg: '#1E1E1E', shadow: 'rgba(0, 0, 0, 0.5)', title: '#E0E0E0', dayTitle: '#38bdf8', subject: '#E0E0E0', details: '#B0B0B0', separator: '#2A2A2A' },
        maroon: { bg: '#FDF5E6', cardBg: '#FFFFFF', shadow: 'rgba(128, 0, 0, 0.1)', title: '#800000', dayTitle: '#A52A2A', subject: '#4B3832', details: '#6F4E37', separator: '#EAE0D3' },
        wisteria: { bg: '#F5F3F7', cardBg: '#FFFFFF', shadow: 'rgba(155, 137, 179, 0.15)', title: '#9B89B3', dayTitle: '#9333ea', subject: '#3D3C42', details: '#5A5863', separator: '#E6E0F0' },
        summer: { bg: '#FFFBEA', cardBg: '#FFFFFF', shadow: 'rgba(255, 199, 0, 0.2)', title: '#F57C00', dayTitle: '#d97706', subject: '#5D4037', details: '#795548', separator: '#FFF8E1' },
        sakura: { bg: '#FEF9FA', cardBg: '#FFFFFF', shadow: 'rgba(255, 183, 197, 0.2)', title: '#E895A5', dayTitle: '#db2777', subject: '#5C474B', details: '#756367', separator: '#FFF5F7' }
    };

    const palette = themes[theme] || themes.default;
    const fontFamily = '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

    // Background
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
            bgImage.onload = () => { ctx.drawImage(bgImage, 0, 0, width, height); resolve(); };
            bgImage.onerror = () => { resolve(); };
        });
    }
    await backgroundPromise;

    // Layout Calculations
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
    const titleAreaHeight = idealLayout.padding + idealFonts.title.size * 2.5;
    const availableHeight = height - titleAreaHeight - idealLayout.padding;
    const scale = Math.min(1.0, availableHeight / totalIdealGridHeight);

    const finalLayout = Object.fromEntries(Object.entries(idealLayout).map(([k, v]) => [k, v * scale]));
    finalLayout.padding = idealLayout.padding; // Keep padding standard
    const finalFonts = {
        base: idealFonts.base * scale,
        title: { size: idealFonts.title.size * scale, weight: 700 },
        dayTitle: { size: idealFonts.dayTitle.size * scale, weight: 600 },
        subject: { size: idealFonts.subject.size * scale, weight: 600 },
        details: { size: idealFonts.details.size * scale, weight: 400 },
    };

    // Draw Title
    ctx.fillStyle = palette.title;
    ctx.font = `${finalFonts.title.weight} ${finalFonts.title.size}px ${fontFamily}`;
    ctx.textAlign = 'center';
    const mainTitle = sectionName ? `Schedule for ${sectionName}` : 'Weekly Schedule';
    const titleY = finalLayout.padding + finalFonts.title.size;

    ctx.shadowColor = 'rgba(0,0,0,0.1)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
    ctx.fillText(mainTitle, width / 2, titleY);
    ctx.shadowColor = 'transparent';

    // Draw Grid
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

    // Watermark
    ctx.save();
    const watermarkSize = finalFonts.details.size * 1.1;
    ctx.font = `italic ${watermarkSize}px ${fontFamily}`;
    ctx.fillStyle = "rgba(100, 100, 100, 0.4)";
    if(theme === 'dark') ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText("James Ryan | SIAS Organizer", width - finalLayout.padding, height - finalLayout.padding/2);
    ctx.restore();
}

async function exportScheduleToImage() {
    if (!currentProcessedData || !currentProcessedData.daysMapData) {
        alert("No schedule data to export.");
        return;
    }
    const currentSectionName = currentProcessedData.sectionName || "";
    const selectedTheme = localStorage.getItem('theme') || 'default';

    // High Res Calculation
    const dpr = window.devicePixelRatio || 2;
    const targetImageWidth = screen.width * dpr;
    const targetImageHeight = screen.height * dpr;
    const isPortraitView = targetImageHeight > targetImageWidth;

    const canvas = document.createElement('canvas');
    canvas.width = targetImageWidth;
    canvas.height = targetImageHeight;
    const ctx = canvas.getContext('2d');

    const originalText = exportButton.querySelector('.btn-text').textContent;
    exportButton.querySelector('.btn-text').textContent = "Generating...";
    exportButton.disabled = true;

    try {
        await drawScheduleOnCanvas(ctx, {
            width: targetImageWidth,
            height: targetImageHeight,
            isPortrait: isPortraitView,
            data: currentProcessedData.daysMapData,
            sectionName: currentSectionName,
            theme: selectedTheme
        });

        const imageDataURL = canvas.toDataURL("image/png");
        const sanitizedSectionName = currentSectionName.replace(/[^a-z0-9]/gi, "_") || "MySchedule";

        const downloadLink = document.createElement("a");
        downloadLink.href = imageDataURL;
        downloadLink.download = `SIAS_${sanitizedSectionName}_${selectedTheme}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (error) {
        console.error("Export Error:", error);
        alert("Failed to create image.");
    } finally {
        exportButton.querySelector('.btn-text').textContent = originalText;
        exportButton.disabled = false;
    }
}