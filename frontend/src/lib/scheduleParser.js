const DISPLAY_DAY_ALIASES = {
  M: "Monday",
  MON: "Monday",
  MONDAY: "Monday",
  T: "Tuesday",
  TUE: "Tuesday",
  TUES: "Tuesday",
  TUESDAY: "Tuesday",
  W: "Wednesday",
  WED: "Wednesday",
  WEDNESDAY: "Wednesday",
  TH: "Thursday",
  THU: "Thursday",
  THUR: "Thursday",
  THURS: "Thursday",
  THURSDAY: "Thursday",
  F: "Friday",
  FRI: "Friday",
  FRIDAY: "Friday",
  S: "Saturday",
  SAT: "Saturday",
  SATURDAY: "Saturday",
  MTWTHF: "MTWThF",
  MWF: "MWF",
  TTH: "TTH",
}

const DISPLAY_DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function parseCompactDisplayDays(token) {
  const normalized = token.toUpperCase().trim()
  if (!normalized) return []

  if (DISPLAY_DAY_ALIASES[normalized]) {
    if (normalized === "MWF") return ["Monday", "Wednesday", "Friday"]
    if (normalized === "TTH") return ["Tuesday", "Thursday"]
    if (normalized === "MTWTHF") return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    return [DISPLAY_DAY_ALIASES[normalized]]
  }

  if (!/^[MTWHFS]+$/.test(normalized)) return []

  const days = []
  let index = 0

  while (index < normalized.length) {
    if (normalized.substring(index, index + 2) === "TH") {
      days.push("Thursday")
      index += 2
    } else {
      const char = normalized[index]
      if (DISPLAY_DAY_ALIASES[char]) {
        days.push(DISPLAY_DAY_ALIASES[char])
      }
      index += 1
    }
  }

  return days
}

export function extractDisplayDays(dayText) {
  const found = []

  for (const token of dayText.toUpperCase().match(/[A-Z]+/g) || []) {
    for (const day of parseCompactDisplayDays(token)) {
      if (!found.includes(day)) found.push(day)
    }
  }

  return DISPLAY_DAYS_ORDER.filter(day => found.includes(day))
}

export function cleanScheduleTimeForDisplay(timeText) {
  return timeText
    .replace(/[–—−]/g, "-")
    .replace(/\bto\b/ig, "-")
    .replace(/a\.?m\.?/ig, " AM")
    .replace(/p\.?m\.?/ig, " PM")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseScheduleForDisplay(rawTimeString) {
  const raw = (rawTimeString || "").replace(/\s+/g, " ").trim()
  
  // Extract start and end time range
  const timeMatch = raw.match(
    /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)\s*(?:-|–|—|−|\bto\b)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i
  )

  if (!timeMatch) return null

  // Day tokens exist before or after the time match (ignoring AM/PM inside time string)
  const dayText = `${raw.slice(0, timeMatch.index)} ${raw.slice(timeMatch.index + timeMatch[0].length)}`
  const days = extractDisplayDays(dayText)

  if (!days.length) return null

  return {
    days,
    time: cleanScheduleTimeForDisplay(timeMatch[0]),
  }
}

// Convert schedule start time to minutes since midnight for chronological sorting
export function convertTo24HourTime(timeString) {
  if (!timeString || typeof timeString !== "string") return 0
  const timeLower = timeString.toLowerCase().trim()

  // Case 1: Start has explicit am/pm e.g. "10 am-12 pm" or "8:00 AM"
  let match = timeLower.match(/^(\d{1,2}(?::\d{2})?)\s*(am|pm)/)
  if (match) {
    const hourMinPart = match[1]
    const period = match[2]
    let [hourStr, minuteStr] = hourMinPart.split(":")
    let hour = parseInt(hourStr, 10)
    let minute = minuteStr ? parseInt(minuteStr, 10) : 0
    if (isNaN(hour) || isNaN(minute)) return 0
    if (period === "pm" && hour !== 12) hour += 12
    else if (period === "am" && hour === 12) hour = 0
    return hour * 60 + minute
  }

  // Case 2: Range like "8-11 am", "5-6 pm", "10-12 pm" (inherit am/pm from end time)
  const rangeMatch = timeLower.match(/^(\d{1,2}(?::\d{2})?)\s*-\s*\d{1,2}(?::\d{2})?\s*(am|pm)/)
  if (rangeMatch) {
    const hourMinPart = rangeMatch[1]
    const period = rangeMatch[2]
    let [hourStr, minuteStr] = hourMinPart.split(":")
    let hour = parseInt(hourStr, 10)
    let minute = minuteStr ? parseInt(minuteStr, 10) : 0
    if (isNaN(hour) || isNaN(minute)) return 0
    if (period === "pm" && hour !== 12) hour += 12
    else if (period === "am" && hour === 12) hour = 0
    return hour * 60 + minute
  }

  return 0
}

export function parseStartAndEndMinutes(timeString) {
  if (!timeString || typeof timeString !== "string") return { start: 0, end: 0 }
  
  const clean = timeString.toLowerCase().replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim()

  const match = clean.match(
    /(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i
  )

  if (!match) return { start: 0, end: 0 }

  let startStr = match[1]
  let startPeriod = match[2]
  let endStr = match[3]
  let endPeriod = match[4]

  if (!startPeriod && endPeriod) startPeriod = endPeriod
  if (!endPeriod && startPeriod) endPeriod = startPeriod

  const startParts = startStr.split(':')
  let startH = parseInt(startParts[0], 10) || 0
  let startM = parseInt(startParts[1], 10) || 0

  if (startPeriod === 'pm' && startH < 12) startH += 12
  if (startPeriod === 'am' && startH === 12) startH = 0
  if (!startPeriod && startH >= 1 && startH <= 6) startH += 12
  const startMin = startH * 60 + startM

  const endParts = endStr.split(':')
  let endH = parseInt(endParts[0], 10) || 0
  let endM = parseInt(endParts[1], 10) || 0

  if (endPeriod === 'pm' && endH < 12) endH += 12
  if (endPeriod === 'am' && endH === 12) endH = 0
  if (!endPeriod && endH >= 1 && endH <= 6) endH += 12
  const endMin = endH * 60 + endM

  return { start: startMin, end: endMin }
}

export const sortByTime = (a, b) => {
  const timeA = convertTo24HourTime(a.time)
  const timeB = convertTo24HourTime(b.time)
  return timeA - timeB
}

// Device Screen Resolution Calculation for Wallpapers
export function getDeviceInfo() {
  let detectedDPR = window.devicePixelRatio || 1

  if (detectedDPR === 1) {
    const ratios = [3.5, 3.0, 2.625, 2.5, 2.0, 1.75, 1.5, 1.35, 1.25]
    for (const r of ratios) {
      if (window.matchMedia(`(-webkit-min-device-pixel-ratio: ${r}), (min-resolution: ${r * 96}dpi)`).matches) {
        detectedDPR = r
        break
      }
    }
  }

  const logicalW = window.screen.width
  const logicalH = window.screen.height

  const physicalW = Math.max(Math.round(logicalW * detectedDPR), window.outerWidth || 0)
  const physicalH = Math.max(Math.round(logicalH * detectedDPR), window.outerHeight || 0)

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    logicalW,
    logicalH,
    physicalW,
    physicalH,
    dpr: detectedDPR,
    isMobile: logicalW <= 768 || window.innerWidth <= 768,
    type: (logicalW <= 768 || window.innerWidth <= 768) ? 'mobile' : 'desktop'
  }
}
