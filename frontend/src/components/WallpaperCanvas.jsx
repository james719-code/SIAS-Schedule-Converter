import React, { useRef, useState, useEffect } from 'react'
import { Download, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Smartphone, Monitor, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import html2canvas from 'html2canvas'
import { getDeviceInfo, parseStartAndEndMinutes } from '@/lib/scheduleParser'

const themeStyles = {
  ocean: {
    bg: 'bg-slate-50 border-slate-200 text-slate-900',
    title: 'text-blue-900',
    subtitle: 'text-blue-950 font-bold',
    cardBg: 'bg-white/95 border-slate-200 text-slate-900 shadow-md',
    headerAccent: 'text-blue-600 font-bold',
    itemBg: 'bg-blue-50/80 border border-blue-100 text-slate-800',
    roomBadge: 'bg-blue-100 text-blue-950 font-bold',
    tableBorder: 'border-blue-900/20',
    tableHeaderBg: 'bg-blue-100/70 text-blue-950'
  },
  dark: {
    bg: 'bg-slate-950 border-slate-800 text-slate-100',
    title: 'text-sky-400',
    subtitle: 'text-slate-300 font-bold',
    cardBg: 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-xl',
    headerAccent: 'text-sky-400 font-bold',
    itemBg: 'bg-slate-800/80 border border-slate-700 text-slate-200',
    roomBadge: 'bg-slate-700 text-slate-100 font-bold',
    tableBorder: 'border-slate-800',
    tableHeaderBg: 'bg-slate-800/90 text-sky-300'
  },
  midnight: {
    bg: 'bg-purple-950 border-purple-800 text-purple-100',
    title: 'text-purple-300',
    subtitle: 'text-purple-200 font-bold',
    cardBg: 'bg-purple-900/95 border-purple-800 text-purple-100 shadow-xl',
    headerAccent: 'text-purple-300 font-bold',
    itemBg: 'bg-purple-800/80 border border-purple-700 text-purple-200',
    roomBadge: 'bg-purple-700 text-purple-100 font-bold',
    tableBorder: 'border-purple-800',
    tableHeaderBg: 'bg-purple-800/90 text-purple-200'
  },
  maroon: {
    bg: 'bg-amber-50/80 border-rose-200 text-stone-900',
    title: 'text-red-900',
    subtitle: 'text-red-950 font-bold',
    cardBg: 'bg-white/95 border-rose-200 text-stone-900 shadow-md',
    headerAccent: 'text-red-800 font-bold',
    itemBg: 'bg-red-50/80 border border-red-100 text-stone-800',
    roomBadge: 'bg-red-100 text-red-950 font-bold',
    tableBorder: 'border-red-900/20',
    tableHeaderBg: 'bg-red-100/70 text-red-950'
  },
  wisteria: {
    bg: 'bg-purple-50/80 border-purple-200 text-slate-900',
    title: 'text-purple-900',
    subtitle: 'text-purple-950 font-bold',
    cardBg: 'bg-white/95 border-purple-200 text-slate-900 shadow-md',
    headerAccent: 'text-purple-700 font-bold',
    itemBg: 'bg-purple-50/80 border border-purple-100 text-slate-800',
    roomBadge: 'bg-purple-100 text-purple-950 font-bold',
    tableBorder: 'border-purple-900/20',
    tableHeaderBg: 'bg-purple-100/70 text-purple-950'
  },
  emerald: {
    bg: 'bg-emerald-50/80 border-emerald-200 text-slate-900',
    title: 'text-emerald-900',
    subtitle: 'text-emerald-950 font-bold',
    cardBg: 'bg-white/95 border-emerald-200 text-slate-900 shadow-md',
    headerAccent: 'text-emerald-700 font-bold',
    itemBg: 'bg-emerald-50/80 border border-emerald-100 text-slate-800',
    roomBadge: 'bg-emerald-100 text-emerald-950 font-bold',
    tableBorder: 'border-emerald-900/20',
    tableHeaderBg: 'bg-emerald-100/70 text-emerald-950'
  },
  summer: {
    bg: 'bg-amber-50 border-amber-200 text-amber-950',
    title: 'text-amber-900',
    subtitle: 'text-amber-950 font-bold',
    cardBg: 'bg-white/95 border-amber-200 text-amber-950 shadow-md',
    headerAccent: 'text-amber-600 font-bold',
    itemBg: 'bg-amber-50/80 border border-amber-100 text-amber-900',
    roomBadge: 'bg-amber-100 text-amber-950 font-bold',
    tableBorder: 'border-amber-900/20',
    tableHeaderBg: 'bg-amber-100/70 text-amber-950'
  },
  sakura: {
    bg: 'bg-pink-50/80 border-pink-200 text-slate-900',
    title: 'text-pink-900',
    subtitle: 'text-pink-950 font-bold',
    cardBg: 'bg-white/95 border-pink-200 text-slate-900 shadow-md',
    headerAccent: 'text-pink-600 font-bold',
    itemBg: 'bg-pink-50/80 border border-pink-100 text-slate-800',
    roomBadge: 'bg-pink-100 text-pink-950 font-bold',
    tableBorder: 'border-pink-900/20',
    tableHeaderBg: 'bg-pink-100/70 text-pink-950'
  }
}

// Compact Day Header Abbreviations (M, T, W, TH, F, S)
const SHORT_DAY_LABELS = {
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'TH',
  Friday: 'F',
  Saturday: 'S'
}

// Helper to convert minutes from midnight to 12-hour display string (e.g. 1080 -> "6:00")
const parseMinutesToDisplayTime = (totalMins) => {
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  let displayHour = hours % 12
  if (displayHour === 0) displayHour = 12
  const minStr = mins === 0 ? '00' : mins.toString().padStart(2, '0')
  return `${displayHour}:${minStr}`
}

// Full Master List of 30-Minute Granularity Time Slots (7:00 AM to 6:30 PM)
const TIME_SLOTS = [
  { id: '7:00', display: '7:00', start: 420, end: 450 },
  { id: '7:30', display: '', isHalfHour: true, start: 450, end: 480 },
  { id: '8:00', display: '8:00', start: 480, end: 510 },
  { id: '8:30', display: '', isHalfHour: true, start: 510, end: 540 },
  { id: '9:00', display: '9:00', start: 540, end: 570 },
  { id: '9:30', display: '', isHalfHour: true, start: 570, end: 600 },
  { id: '10:00', display: '10:00', start: 600, end: 630 },
  { id: '10:30', display: '', isHalfHour: true, start: 630, end: 660 },
  { id: '11:00', display: '11:00', start: 660, end: 690 },
  { id: '11:30', display: '', isHalfHour: true, start: 690, end: 720 },
  { id: '12:00', display: '12:00', start: 720, end: 750 },
  { id: '12:30', display: '', isHalfHour: true, start: 750, end: 780 },
  { id: '1:00', display: '1:00', start: 780, end: 810 },
  { id: '1:30', display: '', isHalfHour: true, start: 810, end: 840 },
  { id: '2:00', display: '2:00', start: 840, end: 870 },
  { id: '2:30', display: '', isHalfHour: true, start: 870, end: 900 },
  { id: '3:00', display: '3:00', start: 900, end: 930 },
  { id: '3:30', display: '', isHalfHour: true, start: 930, end: 960 },
  { id: '4:00', display: '4:00', start: 960, end: 990 },
  { id: '4:30', display: '', isHalfHour: true, start: 990, end: 1020 },
  { id: '5:00', display: '5:00', start: 1020, end: 1050 },
  { id: '5:30', display: '', isHalfHour: true, start: 1050, end: 1080 },
  { id: '6:00', display: '6:00', start: 1080, end: 1110 },
  { id: '6:30', display: '', isHalfHour: true, start: 1110, end: 1140 }
]

// 21 High-Contrast Distinct Color Palettes with Maximum Hue Separation
const TIMETABLE_BLOCK_COLORS = [
  { bg: '#991b1b', text: '#ffffff', border: '#b91c1c', dot: '#f87171' }, // 1. Vibrant Crimson Red
  { bg: '#047857', text: '#ffffff', border: '#059669', dot: '#34d399' }, // 2. Emerald Mint Teal
  { bg: '#b45309', text: '#ffffff', border: '#d97706', dot: '#fbbf24' }, // 3. Amber Gold
  { bg: '#3730a3', text: '#ffffff', border: '#4338ca', dot: '#818cf8' }, // 4. Deep Indigo Violet
  { bg: '#15803d', text: '#ffffff', border: '#16a34a', dot: '#4ade80' }, // 5. Forest Lime Green
  { bg: '#9d174d', text: '#ffffff', border: '#be185d', dot: '#f472b6' }, // 6. Vivid Berry Pink
  { bg: '#1e40af', text: '#ffffff', border: '#1d4ed8', dot: '#60a5fa' }, // 7. Royal Sapphire Blue
  { bg: '#c2410c', text: '#ffffff', border: '#ea580c', dot: '#fb923c' }, // 8. Tangerine Orange
  { bg: '#6b21a8', text: '#ffffff', border: '#7e22ce', dot: '#c084fc' }, // 9. Deep Plum Purple
  { bg: '#0e7490', text: '#ffffff', border: '#06b6d4', dot: '#22d3ee' }, // 10. Peacock Cyan
  { bg: '#881337', text: '#ffffff', border: '#9f1239', dot: '#fb7185' }, // 11. Dark Wine Ruby
  { bg: '#78350f', text: '#ffffff', border: '#92400e', dot: '#f59e0b' }, // 12. Golden Bronze
  { bg: '#581c87', text: '#ffffff', border: '#6b21a8', dot: '#e879f9' }, // 13. Deep Amethyst Violet
  { bg: '#0f766e', text: '#ffffff', border: '#14b8a6', dot: '#2dd4bf' }, // 14. Dark Cyan Teal
  { bg: '#451a03', text: '#ffffff', border: '#78350f', dot: '#d97706' }, // 15. Dark Espresso
  { bg: '#1d4ed8', text: '#ffffff', border: '#2563eb', dot: '#38bdf8' }, // 16. Electric Blue
  { bg: '#be123c', text: '#ffffff', border: '#e11d48', dot: '#fda4af' }, // 17. Coral Rose
  { bg: '#365314', text: '#ffffff', border: '#4d7c0f', dot: '#a3e635' }, // 18. Olive Moss
  { bg: '#701a75', text: '#ffffff', border: '#86198f', dot: '#f0abfc' }, // 19. Dark Orchid Pink
  { bg: '#1e293b', text: '#ffffff', border: '#334155', dot: '#94a3b8' }, // 20. Charcoal Slate
  { bg: '#312e81', text: '#ffffff', border: '#3730a3', dot: '#a5b4fc' }, // 21. Midnight Blue
]

// Standalone Custom Component for Subject Legend Pill (Built specifically for pixel-perfect html2canvas export)
function SubjectLegendChip({ item, colorObj, fontScale = 1 }) {
  const basePx = Math.max(9, Math.round(10.5 * fontScale))
  const dotPx = Math.max(6, Math.round(7 * fontScale))

  return (
    <div
      style={{
        backgroundColor: colorObj.bg,
        color: colorObj.text,
        borderColor: colorObj.border,
        fontSize: `${basePx}px`,
        lineHeight: 1.25,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3.5px 8px',
        borderRadius: '8px',
        borderWidth: '1px',
        borderStyle: 'solid',
        fontWeight: 700,
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
      className="shadow-2xs shrink-0 select-none"
    >
      <span
        style={{
          backgroundColor: colorObj.dot,
          width: `${dotPx}px`,
          height: `${dotPx}px`,
          minWidth: `${dotPx}px`,
          minHeight: `${dotPx}px`,
          borderRadius: '9999px',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      <span style={{ fontWeight: 700, lineHeight: 1.25, fontFamily: 'Inter, Poppins, system-ui, sans-serif' }} className="min-w-0">
        {item.subject}
      </span>
      <span style={{ fontWeight: 600, opacity: 0.9, fontSize: '0.9em', lineHeight: 1.25, fontFamily: 'Inter, Poppins, system-ui, sans-serif', flexShrink: 0, whiteSpace: 'nowrap' }}>
        ({item.room})
      </span>
    </div>
  )
}

// Standalone Custom Component for Timetable Grid Class Block (Built specifically for pixel-perfect html2canvas export)
function ClassBlockChip({ block, colorObj }) {
  const roomText = (block.subj.room || '').toUpperCase()
  const len = roomText.length

  let fontSizePx = 10
  if (len >= 11) fontSizePx = 7.5
  else if (len >= 8) fontSizePx = 8.5

  return (
    <div
      title={`${block.subj.subject} (${block.subj.room}) - ${block.subj.time}`}
      style={{
        gridColumnStart: block.gridColStart,
        gridColumnEnd: block.gridColEnd,
        gridRowStart: block.gridRowStart,
        gridRowEnd: block.gridRowEnd,
        backgroundColor: colorObj.bg,
        borderColor: colorObj.border,
        color: colorObj.text,
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        borderRadius: '8px',
        borderWidth: '1px',
        borderStyle: 'solid',
        boxSizing: 'border-box'
      }}
      className="z-20 shadow-xs group hover:brightness-110"
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          pointerEvents: 'none'
        }}
      >
        <span
          style={{
            fontSize: `${fontSizePx}px`,
            lineHeight: 1.1,
            fontFamily: 'Inter, Poppins, system-ui, sans-serif',
            fontWeight: 900,
            textAlign: 'center',
            wordBreak: 'break-word',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            margin: 0,
            padding: 0
          }}
          className="select-none max-w-full"
        >
          {roomText}
        </span>
      </div>
    </div>
  )
}

export default function WallpaperCanvas({
  currentTheme = 'ocean',
  processedData,
  sectionName = '',
  customTitle,
  customFont,
  wallpaperFormat = 'cards',
  bgConfig,
  cardOpacity,
  cardFontSize = 100,
  cardDimensions,
  customBgImage,
  viewMode,
  setViewMode
}) {
  const containerRef = useRef(null)
  const fullscreenContainerRef = useRef(null)
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const activeTheme = themeStyles[currentTheme] || themeStyles.ocean
  const isMobileView = viewMode === 'mobile'

  // Fixed Structural Dimensions matching target device wallpaper ratios (414x896 phone, 1152x648 desktop)
  const canvasFixedDimensions = isMobileView
    ? { width: '414px', height: '896px', minWidth: '414px', minHeight: '896px', maxWidth: '414px', maxHeight: '896px' }
    : { width: '1152px', height: '648px', minWidth: '1152px', minHeight: '648px', maxWidth: '1152px', maxHeight: '648px' }

  // Adjust zoom to fit device preview comfortably on screen
  useEffect(() => {
    setPan({ x: 0, y: 0 })
    if (isMobileView) {
      setZoom(0.85)
    } else {
      setZoom(0.75)
    }
  }, [viewMode])

  // Native Fullscreen API & Escape Key Handlers
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true)
    } else {
      setIsFullscreen(false)
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }

  // Target specific overlay element for native browser fullscreen and lock page scrolling
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      if (fullscreenContainerRef.current && fullscreenContainerRef.current.requestFullscreen) {
        fullscreenContainerRef.current.requestFullscreen().catch(() => {})
      }
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [isFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {})
        }
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  // Zoom handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 3.0))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.3))
  const handleZoomReset = () => {
    setZoom(isMobileView ? 0.85 : 0.75)
    setPan({ x: 0, y: 0 })
  }

  // Mouse / Touch Panning Handlers
  const handleMouseDown = (e) => {
    setIsPanning(true)
    setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    setPan({ x: e.clientX - startPanPos.x, y: e.clientY - startPanPos.y })
  }

  const handleMouseUp = () => setIsPanning(false)

  // Export Wallpaper Image to Device with High DPR Scale (3.5x for vector-sharp text export)
  const handleExportImage = async () => {
    if (!containerRef.current) return
    try {
      setIsExporting(true)
      const info = getDeviceInfo()
      const exportScale = Math.max(3.5, Math.round((info.dpr || 2) * 150) / 100)
      const canvas = await html2canvas(containerRef.current, {
        scale: exportScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      })
      const link = document.createElement('a')
      link.download = `SIAS_Schedule_Wallpaper_${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Wallpaper Export Error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const fontFamilies = {
    modern: 'Inter, Poppins, sans-serif',
    serif: 'Playfair Display, serif',
    hand: 'Caveat, cursive',
    mono: 'Fira Code, monospace',
    slab: 'Roboto Slab, serif',
    pacifico: 'Pacifico, cursive',
    oswald: 'Oswald, sans-serif',
    quicksand: 'Quicksand, sans-serif'
  }

  const selectedFont = fontFamilies[customFont] || fontFamilies.modern
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Dynamic Saturday Support
  const hasSaturdayClasses = (processedData?.Saturday?.length || 0) > 0
  const timetableDays = hasSaturdayClasses
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // Extract unique subjects for Legend & Unique Color Assignment
  const uniqueSubjectsList = []
  const subjectSeenMap = new Set()
  if (processedData) {
    Object.values(processedData).forEach(items => {
      items?.forEach(subj => {
        if (!subjectSeenMap.has(subj.subject)) {
          subjectSeenMap.add(subj.subject)
          uniqueSubjectsList.push(subj)
        }
      })
    })
  }

  // Assign distinct colors from 21-color palette to each unique subject
  const getSubjectColorObj = (subjName) => {
    const idx = uniqueSubjectsList.findIndex(s => s.subject === subjName)
    if (idx !== -1) {
      return TIMETABLE_BLOCK_COLORS[idx % TIMETABLE_BLOCK_COLORS.length]
    }
    let hash = 0
    for (let i = 0; i < subjName.length; i++) hash = subjName.charCodeAt(i) + ((hash << 5) - hash)
    const fallbackIdx = Math.abs(hash) % TIMETABLE_BLOCK_COLORS.length
    return TIMETABLE_BLOCK_COLORS[fallbackIdx]
  }

  // Dynamic Schedule Time Boundary Calculation (Prune unused morning/evening hours)
  const getScheduleTimeBounds = (data) => {
    let minStart = 24 * 60
    let maxEnd = 0

    if (data) {
      Object.values(data).forEach(dayItems => {
        dayItems?.forEach(item => {
          const { start, end } = parseStartAndEndMinutes(item.time)
          if (start > 0) minStart = Math.min(minStart, start)
          if (end > 0) maxEnd = Math.max(maxEnd, end)
        })
      })
    }

    if (minStart === 24 * 60) minStart = 480 // 8:00 AM fallback
    if (maxEnd === 0) maxEnd = 1020 // 5:00 PM fallback

    // Floor minStart to hour start (e.g. 7:30 AM -> 7:00 AM [420])
    const startMins = Math.floor(minStart / 60) * 60
    // Ceil maxEnd to hour end (e.g. 5:15 PM -> 6:00 PM [1080])
    const endMins = Math.max(startMins + 120, Math.ceil(maxEnd / 60) * 60)

    return { startMins, endMins }
  }

  const timeBounds = getScheduleTimeBounds(processedData)
  
  // Filter TIME_SLOTS to dynamically prune unused morning and evening hours
  const activeTimeSlots = TIME_SLOTS.filter(
    s => s.start >= timeBounds.startMins && s.end <= timeBounds.endMins
  )

  const activeSlotsToUse = activeTimeSlots.length > 0 ? activeTimeSlots : TIME_SLOTS

  // Compute Timetable Matrix Grid Placements with 30-minute granularity
  const numDays = timetableDays.length
  const classBlocks = []
  
  timetableDays.forEach((day, dayIdx) => {
    const daySubjects = processedData?.[day] || []
    daySubjects.forEach(subj => {
      const { start, end } = parseStartAndEndMinutes(subj.time)
      if (start === 0 && end === 0) return

      let startSlotIdx = activeSlotsToUse.findIndex(s => start >= s.start && start < s.end)
      if (startSlotIdx === -1 && start <= activeSlotsToUse[0].start) startSlotIdx = 0

      let endSlotIdx = activeSlotsToUse.findIndex(s => end > s.start && end <= s.end)
      if (endSlotIdx === -1 && end >= activeSlotsToUse[activeSlotsToUse.length - 1].end) endSlotIdx = activeSlotsToUse.length - 1

      if (startSlotIdx !== -1) {
        if (endSlotIdx === -1 || endSlotIdx < startSlotIdx) endSlotIdx = startSlotIdx

        const durationSlots = (endSlotIdx - startSlotIdx) + 1
        const gridRowStart = startSlotIdx + 2
        const gridRowEnd = endSlotIdx + 3

        classBlocks.push({
          subj,
          dayIdx,
          startSlotIdx,
          endSlotIdx,
          durationSlots,
          gridRowStart,
          gridRowEnd,
          gridColStart: dayIdx + 2,
          gridColEnd: dayIdx + 3
        })
      }
    })
  })

  // Font scale calculation for cards and subject legend
  const cardFontScale = (cardFontSize || 100) / 100

  // Render Inner Fixed Canvas Element
  const renderCanvasElement = () => (
    <div
      ref={containerRef}
      style={{
        ...canvasFixedDimensions,
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: 'center center',
        transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        fontFamily: selectedFont
      }}
      className={`relative rounded-3xl p-4 sm:p-7 shadow-2xl overflow-hidden shrink-0 transition-all ${activeTheme.bg}`}
    >
      {/* Mock Phone Notch & Status Bar (Hidden during PNG Export) */}
      {isMobileView && (
        <div data-html2canvas-ignore="true" className="absolute top-0 left-0 right-0 h-9 px-6 pt-2 flex items-center justify-between text-[10px] font-semibold opacity-70 pointer-events-none z-30">
          <span>9:41</span>
          <div className="w-20 h-4 bg-black/40 dark:bg-white/40 rounded-full mx-auto" />
          <div className="flex items-center gap-1">
            <span className="text-[9px]">5G</span>
            <div className="w-3.5 h-2 rounded border border-current p-0.5 flex items-center">
              <div className="w-full h-full bg-current rounded-xs" />
            </div>
          </div>
        </div>
      )}

      {/* Mock Phone Home Bar (Hidden during PNG Export) */}
      {isMobileView && (
        <div data-html2canvas-ignore="true" className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-current opacity-30 rounded-full pointer-events-none z-30" />
      )}

      {/* Mock Desktop Resolution Tag (Hidden during PNG Export) */}
      {!isMobileView && (
        <div data-html2canvas-ignore="true" className="absolute top-3 right-4 px-2.5 py-0.5 rounded-full bg-black/20 dark:bg-white/10 text-[9px] font-mono font-semibold opacity-60 pointer-events-none z-30">
          16:9 Desktop (1152×648px)
        </div>
      )}

      {/* Custom Background Image Overlay */}
      {customBgImage && (
        <div
          className="absolute inset-0 rounded-3xl bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url(${customBgImage})`,
            opacity: bgConfig.opacity / 100,
            transform: `translate(${bgConfig.x}px, ${bgConfig.y}px) scale(${bgConfig.scale / 100})`
          }}
        />
      )}

      {/* Wallpaper Content Container - Flex Col to fill full card height dynamically */}
      <div className={`relative z-10 flex flex-col justify-between h-full space-y-3 ${isMobileView ? 'pt-4 pb-2' : ''}`}>
        {/* Header Title */}
        <div className="text-center space-y-0.5 shrink-0">
          <h2
            style={{ fontFamily: customFont === 'modern' ? 'Caveat, cursive' : selectedFont }}
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${activeTheme.title}`}
          >
            {customTitle || 'Class Schedule'}
          </h2>
          <div className={`text-xs uppercase tracking-widest font-bold ${activeTheme.subtitle}`}>
            {sectionName ? sectionName : 'WEEKLY TIMETABLE'}
          </div>
        </div>

        {/* FORMAT MODE 1: CARDS VIEW - Dynamic Flex Wrapping for Room Badges to Prevent Cropping */}
        {wallpaperFormat === 'cards' && (
          <div className={`grid gap-3.5 ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} flex-1`}>
            {dayNames.map((day) => {
              const daySubjects = processedData?.[day] || []
              const dim = cardDimensions[day] || { w: 100, h: 100, x: 0, y: 0 }
              return (
                <div
                  key={day}
                  style={{
                    opacity: cardOpacity / 100,
                    transform: `translate(${dim.x}px, ${dim.y}px) scale(${dim.w / 100}, ${dim.h / 100})`,
                    fontSize: `${cardFontScale * 0.875}rem`
                  }}
                  className={`rounded-2xl border p-3 shadow-md backdrop-blur-md transition-all space-y-2 shrink-0 ${activeTheme.cardBg}`}
                >
                  <div className="font-bold text-[1em] tracking-wide border-b border-current/10 pb-1 flex justify-between items-center shrink-0">
                    <span className={activeTheme.headerAccent}>{day}</span>
                  </div>

                  {daySubjects.length === 0 ? (
                    <div className="text-[0.85em] opacity-50 italic py-3 text-center">Free Day</div>
                  ) : (
                    <div className="space-y-2">
                      {daySubjects.map((item, i) => (
                        <div key={i} className={`rounded-xl p-2.5 space-y-1 shrink-0 ${activeTheme.itemBg}`}>
                          <div className="font-bold text-[0.85em] leading-snug break-words whitespace-normal">{item.subject}</div>
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[0.75em] pt-0.5 min-w-0">
                            <span className="font-semibold">{item.time}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[0.75em] font-extrabold tracking-wide uppercase max-w-full truncate border border-current/10 shadow-2xs ${activeTheme.roomBadge}`}>
                              {item.room}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* FORMAT MODE 2: TIMETABLE MATRIX VIEW (Using Dedicated Standalone Custom Chip Components) */}
        {wallpaperFormat === 'timetable' && (
          <div className={`rounded-2xl border p-3 sm:p-4 flex flex-col justify-between flex-1 min-h-0 space-y-3 ${activeTheme.cardBg} ${activeTheme.tableBorder}`}>
            {/* Unified 2D CSS Grid Table - Header row set to 28px */}
            <div
              style={{
                gridTemplateColumns: `42px repeat(${numDays}, minmax(0, 1fr))`,
                gridTemplateRows: `28px repeat(${activeSlotsToUse.length}, minmax(11px, 1fr))`
              }}
              className="grid gap-0 relative flex-1 min-h-0"
            >
              {/* Row 1: Time Header Chip */}
              <div
                style={{ gridColumnStart: 1, gridColumnEnd: 2, gridRowStart: 1, gridRowEnd: 2 }}
                className={`rounded-lg p-1 font-mono text-[9.5px] font-bold flex items-center justify-center mb-2 ${activeTheme.tableHeaderBg}`}
              >
                TIME
              </div>

              {/* Day Headers Chips (Compact M, T, W, TH, F, S) */}
              {timetableDays.map((d, idx) => (
                <div
                  key={d}
                  style={{
                    gridColumnStart: idx + 2,
                    gridColumnEnd: idx + 3,
                    gridRowStart: 1,
                    gridRowEnd: 2
                  }}
                  className={`rounded-lg p-1 text-center uppercase font-extrabold text-[10px] tracking-wider flex items-center justify-center mb-2 ${activeTheme.tableHeaderBg}`}
                >
                  {SHORT_DAY_LABELS[d] || d}
                </div>
              ))}

              {/* Dynamic Time Column Labels - Pure text with zero background boxes or borders */}
              {activeSlotsToUse.map((slot, slotIdx) => {
                const isLastSlot = slotIdx === activeSlotsToUse.length - 1
                return (
                  <div
                    key={slot.id}
                    style={{
                      gridColumnStart: 1,
                      gridColumnEnd: 2,
                      gridRowStart: slotIdx + 2,
                      gridRowEnd: slotIdx + 3
                    }}
                    className={`font-mono text-[9px] font-semibold relative border-r border-current/20 select-none ${
                      slot.isHalfHour
                        ? 'border-t border-dashed border-current/20 dark:border-white/15'
                        : 'border-t border-solid border-current/30 dark:border-white/25'
                    }`}
                  >
                    {/* Time Marker centered directly on top border line - Pure text, zero padding/box */}
                    <div className="absolute top-0 left-0 right-0 -translate-y-1/2 flex items-center justify-center z-30 pointer-events-none">
                      {slot.display ? (
                        <span className="font-mono font-extrabold text-[9px] opacity-90 leading-none select-none">
                          {slot.display}
                        </span>
                      ) : (
                        <span className="text-[7px] font-bold font-mono opacity-40 leading-none select-none">
                          :30
                        </span>
                      )}
                    </div>

                    {/* Closing boundary label at the bottom of the table - Pure text, zero padding/box */}
                    {isLastSlot && (
                      <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 flex items-center justify-center z-30 pointer-events-none">
                        <span className="font-mono font-extrabold text-[9px] opacity-90 leading-none select-none">
                          {parseMinutesToDisplayTime(slot.end)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Base Background Grid Cells */}
              {timetableDays.map((_, dayIdx) =>
                activeSlotsToUse.map((slot, slotIdx) => {
                  const isLastCol = dayIdx === timetableDays.length - 1
                  return (
                    <div
                      key={`bg-${dayIdx}-${slotIdx}`}
                      style={{
                        gridColumnStart: dayIdx + 2,
                        gridColumnEnd: dayIdx + 3,
                        gridRowStart: slotIdx + 2,
                        gridRowEnd: slotIdx + 3
                      }}
                      className={`bg-transparent min-h-[10px] ${
                        slot.isHalfHour
                          ? 'border-t border-dashed border-current/20 dark:border-white/15'
                          : 'border-t border-solid border-current/30 dark:border-white/25'
                      } ${!isLastCol ? 'border-r border-current/15 dark:border-white/10' : ''}`}
                    />
                  )
                })
              )}

              {/* Class Blocks - Rendered with Standalone Custom ClassBlockChip Component */}
              {classBlocks.map((block, idx) => {
                const colorObj = getSubjectColorObj(block.subj.subject)
                return (
                  <ClassBlockChip
                    key={idx}
                    block={block}
                    colorObj={colorObj}
                  />
                )
              })}
            </div>

            {/* Subject Legend Section - Rendered with Standalone Custom SubjectLegendChip Component */}
            {uniqueSubjectsList.length > 0 && (
              <div className="pt-2 border-t border-current/15 space-y-1 shrink-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 flex items-center justify-between">
                  <span style={{ fontSize: `${cardFontScale * 0.65}rem` }}>Subject Legend</span>
                  <span style={{ fontSize: `${cardFontScale * 0.55}rem` }} className="font-mono opacity-60">
                    ({uniqueSubjectsList.length} Subjects)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-w-full">
                  {uniqueSubjectsList.map((item, idx) => {
                    const colorObj = getSubjectColorObj(item.subject)
                    return (
                      <SubjectLegendChip
                        key={idx}
                        item={item}
                        colorObj={colorObj}
                        fontScale={cardFontScale}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Watermark */}
        <div className="text-right text-[10px] opacity-60 font-medium pt-1 shrink-0">
          James Ryan | SIAS Organizer
        </div>
      </div>
    </div>
  )

  // Fullscreen Website Overlay View (Targeted Fullscreen Node & Scroll Lock)
  if (isFullscreen) {
    return (
      <div
        ref={fullscreenContainerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999999,
          backgroundColor: '#020617'
        }}
        className="bg-slate-950 text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200"
      >
        {/* Fullscreen Header Control Toolbar - 100% Opaque Solid Dark Background */}
        <header className="h-14 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between shadow-md z-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 font-extrabold text-sm text-sky-400">
              <Sparkles className="h-4 w-4" />
              Fullscreen Studio
            </span>

            {setViewMode && (
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <Button
                  variant={isMobileView ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                  className="h-7 text-xs font-semibold rounded-lg px-2.5"
                >
                  <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile (9:19.5)
                </Button>
                <Button
                  variant={!isMobileView ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('desktop')}
                  className="h-7 text-xs font-semibold rounded-lg px-2.5"
                >
                  <Monitor className="h-3.5 w-3.5 mr-1" /> Desktop (16:9)
                </Button>
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom Out" className="h-7 w-7 p-0 rounded-lg text-slate-200 hover:text-white">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono font-semibold px-2 min-w-[45px] text-center select-none text-slate-200">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom In" className="h-7 w-7 p-0 rounded-lg text-slate-200 hover:text-white">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleZoomReset} title="Reset View" className="h-7 w-7 p-0 rounded-lg text-slate-200 hover:text-white">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleExportImage}
              disabled={isExporting}
              className="gap-1.5 h-8 rounded-xl text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Download Wallpaper'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="gap-1.5 h-8 rounded-xl text-xs font-semibold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <Minimize2 className="h-3.5 w-3.5 text-sky-400" />
              <span>Exit Fullscreen</span>
              <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 rounded border border-slate-700">Esc</kbd>
            </Button>
          </div>
        </header>

        {/* Main Canvas Viewport Area */}
        <main
          className="flex-1 relative overflow-auto bg-slate-950 p-4 sm:p-10 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {renderCanvasElement()}
        </main>
      </div>
    )
  }

  // Normal In-Page Display
  return (
    <div className="space-y-4">
      {/* Top Action Bar - Non-wrapping 1-row layout utilizing full width on all screen sizes */}
      <div className="flex items-center justify-between gap-2 bg-muted/40 p-2 sm:p-3 rounded-2xl border border-border/40 w-full overflow-x-auto">
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out" className="h-8 w-8 p-0 rounded-lg sm:w-auto sm:px-2 text-xs">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] sm:text-xs font-mono font-semibold px-1.5 min-w-[36px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In" className="h-8 w-8 p-0 rounded-lg sm:w-auto sm:px-2 text-xs">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomReset} title="Reset View" className="h-8 w-8 p-0 rounded-lg sm:w-auto sm:px-2 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <span className="hidden md:inline-flex items-center gap-1 ml-2 text-[10px] font-mono font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {isMobileView ? 'Mobile Frame: 414×896px (9:19.5)' : 'Desktop Frame: 1152×648px (16:9)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1.5 rounded-lg text-xs font-semibold"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportImage}
            disabled={isExporting}
            className="gap-1.5 h-8 rounded-lg text-xs font-semibold px-2.5 sm:px-3"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Download Wallpaper'}</span>
          </Button>
        </div>
      </div>

      {/* Interactive Wallpaper Canvas Workspace */}
      <div
        className="relative overflow-auto max-w-full rounded-2xl border border-border bg-slate-950/20 p-4 sm:p-8 min-h-[500px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderCanvasElement()}
      </div>
    </div>
  )
}
