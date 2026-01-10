// Developed By: James Ryan S. Gallego

// function imports 
import initScrollSpy from "./scrollSpy.js";

const API_ENDPOINT = 'https://flaskproject-gurc.onrender.com/process-pdf';

// Screen Detection and Export
export const getDeviceInfo = () => {
    const dpr = window.devicePixelRatio || 1;
    const logicalW = window.screen.width;
    const logicalH = window.screen.height;
    const physicalW = Math.round(logicalW * dpr);
    const physicalH = Math.round(logicalH * dpr);

    return {
        width: window.innerWidth,
        height: window.innerHeight,
        logicalW,
        logicalH,
        physicalW,
        physicalH,
        dpr,
        isMobile: logicalW <= 768,
        type: logicalW <= 768 ? 'mobile' : 'desktop'
    };
};

export const currentScreenType = getDeviceInfo().type;

// Global element for screen size display
const screenSizeDisplay = document.getElementById("screen-size-display");

function updateScreenSizeDisplay() {
    const info = getDeviceInfo();
    if (screenSizeDisplay) {
        screenSizeDisplay.textContent = `Wallpaper Size: ${info.physicalW} x ${info.physicalH}`;
    }

    // Hide/Show preview toggles based on actual hardware device type
    if (viewMobileBtn) viewMobileBtn.style.display = info.isMobile ? 'inline-flex' : 'none';
    if (viewDesktopBtn) viewDesktopBtn.style.display = info.isMobile ? 'none' : 'inline-flex';
}

// DOM Element References
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
const bgUploadInput = document.getElementById("bg-upload");
const bgFilenameSpan = document.getElementById("bg-filename");
const clearBgBtn = document.getElementById("clear-bg-btn");

const viewWebBtn = document.getElementById("view-web");
const viewMobileBtn = document.getElementById("view-mobile");
const viewDesktopBtn = document.getElementById("view-desktop");
const canvasPreviewWrapper = document.getElementById("canvas-preview-wrapper");

// Customization Elements
const toggleCustomization = document.getElementById("toggle-customization");
const customizationControls = document.getElementById("customization-controls");
const fontSelect = document.getElementById("font-select");
const customTitleInput = document.getElementById("custom-title");
const bgXSlider = document.getElementById("bg-x");
const bgYSlider = document.getElementById("bg-y");
const bgScaleSlider = document.getElementById("bg-scale");
const bgOpacitySlider = document.getElementById("bg-opacity");
const cardDaySelect = document.getElementById("card-day-select");
const cardWidthSlider = document.getElementById("card-width");
const cardHeightSlider = document.getElementById("card-height");
const cardXSlider = document.getElementById("card-x");
const cardYSlider = document.getElementById("card-y");
const cardOpacitySlider = document.getElementById("card-opacity");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");

const zoomControls = document.getElementById("zoom-controls");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const zoomResetBtn = document.getElementById("zoom-reset");
const zoomLevelSpan = document.getElementById("zoom-level");

let currentProcessedData = null;
let customBgImage = null;
let currentViewMode = 'web'; // 'web', 'mobile', 'desktop'
let previewZoom = 1.0;

// Pan State
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panX = 0;
let panY = 0;

// State for Customization
let customFont = 'modern';
let customTitle = '';
let bgConfig = { x: 0, y: 0, scale: 100, opacity: 100 };
let cardOpacity = 100;
let cardDimensions = {
    Monday: { w: 100, h: 100, x: 0, y: 0 },
    Tuesday: { w: 100, h: 100, x: 0, y: 0 },
    Wednesday: { w: 100, h: 100, x: 0, y: 0 },
    Thursday: { w: 100, h: 100, x: 0, y: 0 },
    Friday: { w: 100, h: 100, x: 0, y: 0 },
    Saturday: { w: 100, h: 100, x: 0, y: 0 }
};

// History Stacks
let historyStack = [];
let redoStack = [];
const MAX_HISTORY = 50;

function saveState() {
    const state = {
        customFont,
        customTitle,
        bgConfig: { ...bgConfig },
        cardOpacity,
        cardDimensions: JSON.parse(JSON.stringify(cardDimensions))
    };

    // Don't push identical state
    if (historyStack.length > 0) {
        const lastState = historyStack[historyStack.length - 1];
        if (JSON.stringify(lastState) === JSON.stringify(state)) return;
    }

    historyStack.push(state);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    redoStack = []; // Clear redo stack on new action
    updateHistoryButtons();
}

function restoreState(state) {
    customFont = state.customFont;
    customTitle = state.customTitle;
    bgConfig = { ...state.bgConfig };
    cardOpacity = state.cardOpacity;
    cardDimensions = JSON.parse(JSON.stringify(state.cardDimensions));

    applyStateToUI();
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
}

function undo() {
    if (historyStack.length === 0) return;

    // Save current state to redo stack first
    const currentState = {
        customFont,
        customTitle,
        bgConfig: { ...bgConfig },
        cardOpacity,
        cardDimensions: JSON.parse(JSON.stringify(cardDimensions))
    };
    redoStack.push(currentState);

    const previousState = historyStack.pop();
    restoreState(previousState);
    updateHistoryButtons();
}

function redo() {
    if (redoStack.length === 0) return;

    const nextState = redoStack.pop();
    // Save current to history before applying next
    const currentState = {
        customFont,
        customTitle,
        bgConfig: { ...bgConfig },
        cardOpacity,
        cardDimensions: JSON.parse(JSON.stringify(cardDimensions))
    };
    historyStack.push(currentState);

    restoreState(nextState);
    updateHistoryButtons();
}

function updateHistoryButtons() {
    undoBtn.disabled = historyStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
}

function applyStateToUI() {
    fontSelect.value = customFont;
    customTitleInput.value = customTitle;
    bgXSlider.value = bgConfig.x;
    bgYSlider.value = bgConfig.y;
    bgScaleSlider.value = bgConfig.scale;
    bgOpacitySlider.value = bgConfig.opacity;
    cardOpacitySlider.value = cardOpacity;

    // Update card sliders based on currently selected day
    const day = cardDaySelect.value;
    if (day === 'all') {
        // Use Monday as reference
        cardWidthSlider.value = cardDimensions.Monday.w;
        cardHeightSlider.value = cardDimensions.Monday.h;
        cardXSlider.value = cardDimensions.Monday.x;
        cardYSlider.value = cardDimensions.Monday.y;
    } else {
        cardWidthSlider.value = cardDimensions[day].w;
        cardHeightSlider.value = cardDimensions[day].h;
        cardXSlider.value = cardDimensions[day].x;
        cardYSlider.value = cardDimensions[day].y;
    }
}

// Attach Undo/Redo Listeners
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

// Initialization and Event Listeners

document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme from local storage
    const savedTheme = localStorage.getItem('theme') || 'default';
    setTheme(savedTheme);
    initGhostMode();
    updateScreenSizeDisplay();
});

window.addEventListener('resize', updateScreenSizeDisplay);

// Ghost Mode Logic for Mobile
function initGhostMode() {
    const sliders = document.querySelectorAll('.customization-panel input[type="range"]');
    const column = document.querySelector('.customization-column');

    function enableGhostMode(e) {
        if (window.innerWidth > 768) return; // Mobile only
        column.classList.add('ghost-mode');
        const row = e.target.closest('.slider-row');
        if (row) row.classList.add('active-row');
    }

    function disableGhostMode() {
        column.classList.remove('ghost-mode');
        document.querySelectorAll('.slider-row.active-row').forEach(el => {
            el.classList.remove('active-row');
        });
    }

    sliders.forEach(slider => {
        slider.addEventListener('touchstart', enableGhostMode);
        slider.addEventListener('touchend', disableGhostMode);
        slider.addEventListener('mousedown', enableGhostMode);
        slider.addEventListener('mouseup', disableGhostMode);
        // Also handle mouseleave in case they drag out
        slider.addEventListener('mouseleave', disableGhostMode);
    });
}

// Toggle Customization Panel
if (toggleCustomization) {
    toggleCustomization.addEventListener('click', () => {
        // Check if mobile
        if (window.innerWidth <= 768) {
            const column = document.querySelector('.customization-column');
            column.classList.toggle('expanded');

            // Adjust chevron
            const isExpanded = column.classList.contains('expanded');
            toggleCustomization.querySelector('.fa-chevron-down').style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        } else {
            // Desktop behavior
            const isHidden = customizationControls.style.display === 'none';
            customizationControls.style.display = isHidden ? 'grid' : 'none';
            toggleCustomization.querySelector('.fa-chevron-down').style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    });
}

// General Settings Change
// Use 'change' for history saving to avoid flood during typing, 'input' for live preview
customTitleInput.addEventListener('focus', saveState); // Save state before edit starts
customTitleInput.addEventListener('input', (e) => {
    customTitle = e.target.value;
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
});

// Font Change
fontSelect.addEventListener('focus', saveState);
fontSelect.addEventListener('change', (e) => {
    customFont = e.target.value;
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
});

// Background Position/Scale/Opacity Change
function updateBgConfig() {
    bgConfig.x = parseInt(bgXSlider.value);
    bgConfig.y = parseInt(bgYSlider.value);
    bgConfig.scale = parseInt(bgScaleSlider.value);
    bgConfig.opacity = parseInt(bgOpacitySlider.value);
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
}
// Save state on pointerdown (start of slide)
[bgXSlider, bgYSlider, bgScaleSlider, bgOpacitySlider].forEach(el => {
    el.addEventListener('pointerdown', saveState);
    el.addEventListener('input', updateBgConfig);
});

// Card Opacity
cardOpacitySlider.addEventListener('pointerdown', saveState);
cardOpacitySlider.addEventListener('input', (e) => {
    cardOpacity = parseInt(e.target.value);
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
});

// Card Dimension Change
cardDaySelect.addEventListener('change', () => {
    const day = cardDaySelect.value;
    // Update sliders to reflect current selection
    if (day === 'all') {
        // Just take Monday as representative or reset to 100? Let's take Monday.
        cardWidthSlider.value = cardDimensions.Monday.w;
        cardHeightSlider.value = cardDimensions.Monday.h;
        cardXSlider.value = cardDimensions.Monday.x;
        cardYSlider.value = cardDimensions.Monday.y;
    } else {
        cardWidthSlider.value = cardDimensions[day].w;
        cardHeightSlider.value = cardDimensions[day].h;
        cardXSlider.value = cardDimensions[day].x;
        cardYSlider.value = cardDimensions[day].y;
    }
});

function updateCardDimensions() {
    const day = cardDaySelect.value;
    const w = parseInt(cardWidthSlider.value);
    const h = parseInt(cardHeightSlider.value);
    const x = parseInt(cardXSlider.value);
    const y = parseInt(cardYSlider.value);

    if (day === 'all') {
        Object.keys(cardDimensions).forEach(d => {
            cardDimensions[d].w = w;
            cardDimensions[d].h = h;
            cardDimensions[d].x = x;
            cardDimensions[d].y = y;
        });
    } else {
        cardDimensions[day].w = w;
        cardDimensions[day].h = h;
        cardDimensions[day].x = x;
        cardDimensions[day].y = y;
    }
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
}
[cardWidthSlider, cardHeightSlider, cardXSlider, cardYSlider].forEach(el => {
    el.addEventListener('pointerdown', saveState);
    el.addEventListener('input', updateCardDimensions);
});

// Drag and Drop File Handling
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

// Theme Switching Handlers
themeButtons.forEach(button => {
    button.addEventListener('click', () => setTheme(button.dataset.theme));
});

// Mobile Navigation Menu Toggle
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Full Screen Mode Toggle
if (fullscreenButton) {
    fullscreenButton.addEventListener('click', toggleFullScreen);
}

// Export Functionality
if (exportButton) {
    exportButton.addEventListener("click", exportScheduleToImage);
}

// Navbar Theme Toggle Button
themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'default' : 'dark';
    setTheme(newTheme);
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
});

// View Toggle Handlers
viewWebBtn.addEventListener('click', () => switchView('web'));
viewMobileBtn.addEventListener('click', () => switchView('mobile'));
viewDesktopBtn.addEventListener('click', () => switchView('desktop'));

function switchView(mode) {
    currentViewMode = mode;

    // Update button states
    [viewWebBtn, viewMobileBtn, viewDesktopBtn].forEach(btn => btn.classList.remove('active'));
    if (mode === 'web') viewWebBtn.classList.add('active');
    if (mode === 'mobile') viewMobileBtn.classList.add('active');
    if (mode === 'desktop') viewDesktopBtn.classList.add('active');

    // Update UI visibility
    if (mode === 'web') {
        excelPreview.style.display = "grid";
        canvasPreviewWrapper.style.display = "none";
        zoomControls.style.display = "none";
    } else {
        excelPreview.style.display = "none";
        canvasPreviewWrapper.style.display = "flex";
        zoomControls.style.display = "flex";
        if (currentProcessedData) updatePreview();
    }
}

// Zoom and Pan Logic
function updateZoom() {
    const canvas = canvasPreviewWrapper.querySelector('canvas');
    if (canvas) {
        canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${previewZoom})`;
        canvas.style.transformOrigin = 'center center'; // Center scaling
        zoomLevelSpan.textContent = `${Math.round(previewZoom * 100)}%`;
    }
}

zoomInBtn.addEventListener('click', () => {
    if (previewZoom < 3.0) {
        previewZoom += 0.1;
        updateZoom();
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (previewZoom > 0.5) {
        previewZoom -= 0.1;
        updateZoom();
    }
});

zoomResetBtn.addEventListener('click', () => {
    previewZoom = 1.0;
    panX = 0;
    panY = 0;
    updateZoom();
});

// Mouse Wheel Zoom
canvasPreviewWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.min(Math.max(previewZoom + delta, 0.5), 3.0);
        previewZoom = newZoom;
        updateZoom();
    }
});

// Panning Logic
function startPan(e) {
    if (currentViewMode === 'web') return; // Disable pan in grid view (though wrapper hidden anyway)
    isPanning = true;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    panStartX = clientX - panX;
    panStartY = clientY - panY;
    canvasPreviewWrapper.style.cursor = 'grabbing';
}

function doPan(e) {
    if (!isPanning) return;
    e.preventDefault(); // Prevent scroll on touch
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    panX = clientX - panStartX;
    panY = clientY - panStartY;
    updateZoom();
}

function endPan() {
    isPanning = false;
    canvasPreviewWrapper.style.cursor = 'grab';
}

// Mouse Events
canvasPreviewWrapper.addEventListener('mousedown', startPan);
canvasPreviewWrapper.addEventListener('mousemove', doPan);
canvasPreviewWrapper.addEventListener('mouseup', endPan);
canvasPreviewWrapper.addEventListener('mouseleave', endPan);

// Touch Events
canvasPreviewWrapper.addEventListener('touchstart', startPan);
canvasPreviewWrapper.addEventListener('touchmove', doPan);
canvasPreviewWrapper.addEventListener('touchend', endPan);

// Custom Background Handling
bgUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            customBgImage = img;
            bgFilenameSpan.textContent = file.name.length > 15 ? file.name.substring(0, 12) + "..." : file.name;
            clearBgBtn.style.display = "inline-flex";
            if (currentProcessedData && currentViewMode !== 'web') updatePreview();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

clearBgBtn.addEventListener("click", () => {
    customBgImage = null;
    bgUploadInput.value = "";
    bgFilenameSpan.textContent = "";
    clearBgBtn.style.display = "none";
    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
});

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update active state on color swatches
    themeButtons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (currentProcessedData && currentViewMode !== 'web') updatePreview();
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

// Core File Processing and API Interaction

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

    // Reset UI state before processing
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

        // Update Preview if in Canvas mode
        if (currentViewMode !== 'web') updatePreview();

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

// Data Transformation Logic

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

// Web View Rendering

function convertTo24HourTime(timeString) {
    if (!timeString || typeof timeString !== "string") return 0;
    const timeLower = timeString.toLowerCase().trim();

    // Case 1: Direct match like "1pm", "10am", "8:30am"
    let match = timeLower.match(/^(\d{1,2}(?::\d{2})?)\s*(am|pm)/);
    if (match) {
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

    // Case 2: Range like "1-3pm", "10-12pm", "8-9am" (no am/pm on start, inherit from end)
    const rangeMatch = timeLower.match(/^(\d{1,2}(?::\d{2})?)\s*-\s*\d{1,2}(?::\d{2})?\s*(am|pm)/);
    if (rangeMatch) {
        const hourMinPart = rangeMatch[1];
        const period = rangeMatch[2]; // Inherit period from end time
        let [hourStr, minuteStr] = hourMinPart.split(":");
        let hour = parseInt(hourStr, 10);
        let minute = minuteStr ? parseInt(minuteStr, 10) : 0;
        if (isNaN(hour) || isNaN(minute)) return 0;
        if (period === "pm" && hour !== 12) hour += 12;
        else if (period === "am" && hour === 12) hour = 0;
        return hour * 60 + minute;
    }

    return 0;
}

const sortByTime = (a, b) => {
    function extractStartTimeForConversion(fullTimeStr) {
        if (!fullTimeStr || typeof fullTimeStr !== "string") return "";
        const timeLower = fullTimeStr.toLowerCase().trim();

        // Case 1: Start has its own am/pm like "10am-12pm" or "1am-2am"
        const startWithPeriod = timeLower.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
        if (startWithPeriod) {
            return startWithPeriod[1].trim();
        }

        // Case 2: Range where only end has am/pm like "1-3pm" - return full string for convertTo24HourTime to handle
        const rangePattern = timeLower.match(/^(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/i);
        if (rangePattern) {
            return fullTimeStr.trim(); // Return full range, let convertTo24HourTime extract start with inherited period
        }

        // Fallback: just return as-is
        return fullTimeStr.trim();
    }
    return convertTo24HourTime(extractStartTimeForConversion(a.time)) - convertTo24HourTime(extractStartTimeForConversion(b.time));
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

// Canvas Rendering and Export Logic

function drawDotPattern(ctx, width, height, color) {
    const dotSize = width * 0.002;
    const spacing = width * 0.03;

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.1;

    for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath(); ctx.fill();
}

function getWrappedLines(ctx, text, maxWidth) {
    const words = text.split(' ');
    let line = '';
    let lines = [];

    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function measureCardContentHeight(ctx, schedule, contentWidth, layout, fonts, fontFamily) {
    let height = fonts.dayTitle.size + (fonts.dayTitle.size * 0.6) + (fonts.dayTitle.size * 1.2);
    if (schedule.length === 0) { height += fonts.details.size; }
    else {
        for (const item of schedule) {
            ctx.font = `${fonts.subject.weight} ${fonts.subject.size}px ${fontFamily}`;
            // Measure Subject Lines
            const subjectLines = getWrappedLines(ctx, item.subject, contentWidth);
            height += (subjectLines.length * fonts.subject.size * 1.15);

            // Measure Details Lines
            ctx.font = `${fonts.details.weight} ${fonts.details.size}px ${fontFamily}`;
            const detailsText = `${item.time}  •  ${item.room}`;
            const detailsLines = getWrappedLines(ctx, detailsText, contentWidth);
            height += (detailsLines.length * fonts.details.size * 1.15);

            height += layout.entryGap;
        }
        height -= layout.entryGap;
    }
    return height;
}

function drawCard(ctx, dayName, schedule, x, y, width, height, layout, fonts, palette, fontFamily) {
    ctx.shadowColor = palette.shadow; ctx.shadowBlur = 20; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 5;

    // Apply Card Opacity
    ctx.save();
    ctx.globalAlpha = cardOpacity / 100;
    ctx.fillStyle = palette.cardBg;
    drawRoundedRect(ctx, x, y, width, height, layout.cardRadius);
    ctx.restore();

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
            const subjectLines = getWrappedLines(ctx, item.subject, contentWidth);
            for (const line of subjectLines) { ctx.fillText(line, contentX, currentY); currentY += fonts.subject.size * 1.15; }

            ctx.fillStyle = palette.details; ctx.font = `${fonts.details.weight} ${fonts.details.size}px ${fontFamily}`;
            const detailsText = `${item.time}  •  ${item.room}`;
            const detailsLines = getWrappedLines(ctx, detailsText, contentWidth);
            for (const line of detailsLines) { ctx.fillText(line, contentX, currentY); currentY += fonts.details.size * 1.15; }

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

    // Resolve Font Family
    let fontFamily = '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'; // default
    if (customFont === 'serif') fontFamily = '"Playfair Display", serif';
    else if (customFont === 'hand') fontFamily = '"Caveat", cursive';
    else if (customFont === 'mono') fontFamily = '"Fira Code", monospace';
    else if (customFont === 'modern') fontFamily = '"Poppins", sans-serif';
    else if (customFont === 'slab') fontFamily = '"Roboto Slab", serif';
    else if (customFont === 'pacifico') fontFamily = '"Pacifico", cursive';
    else if (customFont === 'oswald') fontFamily = '"Oswald", sans-serif';
    else if (customFont === 'quicksand') fontFamily = '"Quicksand", sans-serif';


    // Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    if (customBgImage) {
        // Draw custom background with customization
        const imgRatio = customBgImage.width / customBgImage.height;
        const canvasRatio = width / height;
        let baseW, baseH;

        // Calculate 'contain' size first as base, or 'cover'? Cover is standard for wallpapers.
        if (imgRatio > canvasRatio) {
            baseH = height;
            baseW = height * imgRatio;
        } else {
            baseW = width;
            baseH = width / imgRatio;
        }

        // Apply scaling
        const scaledW = baseW * (bgConfig.scale / 100);
        const scaledH = baseH * (bgConfig.scale / 100);

        // Center then apply offsets
        const centerX = width / 2;
        const centerY = height / 2;

        // Offset is percentage of canvas dimension
        const offsetX = (width * (bgConfig.x / 100));
        const offsetY = (height * (bgConfig.y / 100));

        const drawX = centerX - (scaledW / 2) + offsetX;
        const drawY = centerY - (scaledH / 2) + offsetY;

        ctx.save();
        ctx.globalAlpha = bgConfig.opacity / 100;
        ctx.drawImage(customBgImage, drawX, drawY, scaledW, scaledH);
        ctx.restore();
    } else {
        drawDotPattern(ctx, width, height, palette.dayTitle);
    }

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
    let mainTitle = sectionName ? `Schedule for ${sectionName}` : 'Weekly Schedule';
    if (customTitle && customTitle.trim() !== '') {
        mainTitle = customTitle;
    }
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

                // Apply Custom Card Dimensions
                const dims = cardDimensions[dayName] || { w: 100, h: 100, x: 0, y: 0 };
                const wScale = dims.w / 100;
                const hScale = dims.h / 100;

                // Offset is pixel value but needs to be scaled relative to canvas resolution
                // Since user sliders are -100 to 100, let's assume they mean relative units or raw pixels.
                // If we want it to feel consistent, we should scale it by the canvas scale factor.
                const xOffset = (dims.x || 0) * scale;
                const yOffset = (dims.y || 0) * scale;

                const actualW = finalCardWidth * wScale;
                const actualH = rowHeight * hScale;

                // Center the card in its grid cell? Or top-left? Center usually looks better if shrinking.
                // If growing, it will overlap neighbors.
                // Added xOffset and yOffset to the centered position.
                const cx = cardX + (finalCardWidth - actualW) / 2 + xOffset;
                const cy = currentY + (rowHeight - actualH) / 2 + yOffset;

                drawCard(ctx, dayName, daySchedule, cx, cy, actualW, actualH, finalLayout, finalFonts, palette, fontFamily);
            }
        }
        currentY += rowHeight + finalLayout.gap;
    }

    // Watermark
    ctx.save();
    const watermarkSize = finalFonts.details.size * 1.1;
    ctx.font = `italic ${watermarkSize}px ${fontFamily}`;
    ctx.fillStyle = "rgba(100, 100, 100, 0.4)";
    if (theme === 'dark') ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText("James Ryan | SIAS Organizer", width - finalLayout.padding, height - finalLayout.padding / 2);
    ctx.restore();
}

async function updatePreview() {
    if (!currentProcessedData || !currentProcessedData.daysMapData) return;

    const currentSectionName = currentProcessedData.sectionName || "";
    const selectedTheme = localStorage.getItem('theme') || 'default';

    // Determine dimensions based on mode
    let targetWidth, targetHeight;
    let isPortrait = false;

    const info = getDeviceInfo();
    if (currentViewMode === 'mobile') {
        if (!info.isMobile) {
            targetWidth = 1080;
            targetHeight = 1920;
        } else {
            targetWidth = info.physicalW;
            targetHeight = info.physicalH;
        }
        isPortrait = true;
    } else {
        targetWidth = info.physicalW;
        targetHeight = info.physicalH;
        isPortrait = targetHeight > targetWidth;
    }

    // Scale down for preview display to fit container height/width
    // But we render high res then let CSS scale it
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    // CSS styling for preview
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "600px";
    canvas.style.boxShadow = "0 10px 30px rgba(0,0,0,0.2)";
    canvas.style.borderRadius = "12px";

    const ctx = canvas.getContext('2d');

    await drawScheduleOnCanvas(ctx, {
        width: targetWidth,
        height: targetHeight,
        isPortrait: isPortrait,
        data: currentProcessedData.daysMapData,
        sectionName: currentSectionName,
        theme: selectedTheme
    });

    canvasPreviewWrapper.innerHTML = '';
    canvasPreviewWrapper.appendChild(canvas);
    updateZoom(); // Re-apply zoom to new canvas
}

async function exportScheduleToImage() {
    if (!currentProcessedData || !currentProcessedData.daysMapData) {
        alert("No schedule data to export.");
        return;
    }
    const currentSectionName = currentProcessedData.sectionName || "";
    const selectedTheme = localStorage.getItem('theme') || 'default';

    // Decide dimensions based on current view mode or default to screen
    let targetImageWidth, targetImageHeight, isPortraitView;

    const info = getDeviceInfo();
    if (currentViewMode === 'mobile') {
        if (!info.isMobile) {
            targetImageWidth = 1080;
            targetImageHeight = 1920;
        } else {
            targetImageWidth = info.physicalW;
            targetImageHeight = info.physicalH;
        }
        isPortraitView = true;
    } else {
        targetImageWidth = info.physicalW;
        targetImageHeight = info.physicalH;
        isPortraitView = targetImageHeight > targetImageWidth;
    }

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

// Initialize scrollspy
initScrollSpy();