import React, { useState, useEffect } from 'react'
import { Sparkles, Calendar, Layers, Image as ImageIcon, SlidersHorizontal, Table, Smartphone, Monitor, Download, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'
import Navbar from '@/components/Navbar'
import UploadSection from '@/components/UploadSection'
import CustomizationPanel from '@/components/CustomizationPanel'
import ScheduleGrid from '@/components/ScheduleGrid'
import WallpaperCanvas from '@/components/WallpaperCanvas'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { parseScheduleForDisplay, sortByTime } from '@/lib/scheduleParser'

const PRIMARY_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://flaskproject-gurc.onrender.com'
const FALLBACK_API_BASE_URL = import.meta.env.VITE_FALLBACK_API_BASE_URL || 'http://localhost:5000'

async function postWithFallback(path, formData) {
  const primaryEndpoint = `${PRIMARY_API_BASE_URL}${path}`
  const fallbackEndpoint = `${FALLBACK_API_BASE_URL}${path}`

  try {
    const res = await fetch(primaryEndpoint, { method: 'POST', body: formData })
    const data = await res.json()
    if (res.ok) return data
    console.warn(`Primary backend (${primaryEndpoint}) returned error. Trying fallback...`)
  } catch (primaryErr) {
    console.warn(`Primary backend (${primaryEndpoint}) unreachable/sleeping. Trying fallback...`, primaryErr)
  }

  // Attempt fallback endpoint
  try {
    const fallbackRes = await fetch(fallbackEndpoint, { method: 'POST', body: formData })
    const fallbackData = await fallbackRes.json()
    if (!fallbackRes.ok) throw new Error(fallbackData.error || `Server Status: ${fallbackRes.status}`)
    return fallbackData
  } catch (fallbackErr) {
    throw new Error('Backend server is starting up (Render cold boot). Please wait a few seconds and click submit again!')
  }
}

export default function App() {
  const [theme, setTheme] = useState('ocean')
  const [uploadMode, setUploadMode] = useState('single')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [compareSettings, setCompareSettings] = useState({
    preset: 'class-day',
    dayStart: '07:00',
    dayEnd: '21:00',
    minMinutes: 30
  })

  const [processedData, setProcessedData] = useState(null)
  const [compareData, setCompareData] = useState(null)
  const [sectionName, setSectionName] = useState('')
  const [viewMode, setViewMode] = useState('web') // 'web', 'mobile', 'desktop'

  // Customization state
  const [customTitle, setCustomTitle] = useState('')
  const [customFont, setCustomFont] = useState('modern')
  const [wallpaperFormat, setWallpaperFormat] = useState('cards') // 'cards' or 'timetable'
  const [bgConfig, setBgConfig] = useState({ x: 0, y: 0, scale: 100, opacity: 100 })
  const [cardOpacity, setCardOpacity] = useState(100)
  const [cardFontSize, setCardFontSize] = useState(100)
  const [selectedDay, setSelectedDay] = useState('all')
  const [cardDimensions, setCardDimensions] = useState({
    Monday: { w: 100, h: 100, x: 0, y: 0 },
    Tuesday: { w: 100, h: 100, x: 0, y: 0 },
    Wednesday: { w: 100, h: 100, x: 0, y: 0 },
    Thursday: { w: 100, h: 100, x: 0, y: 0 },
    Friday: { w: 100, h: 100, x: 0, y: 0 },
    Saturday: { w: 100, h: 100, x: 0, y: 0 },
  })
  const [customBgImage, setCustomBgImage] = useState(null)
  const [customBgName, setCustomBgName] = useState('')

  // Undo / Redo history state stack
  const [historyStack, setHistoryStack] = useState([])
  const [redoStack, setRedoStack] = useState([])

  // Synchronize document attribute with theme state
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Save current customization state snapshot to history stack before making an edit
  const pushStateToHistory = () => {
    const stateSnapshot = {
      customTitle,
      customFont,
      wallpaperFormat,
      bgConfig: { ...bgConfig },
      cardOpacity,
      cardFontSize,
      cardDimensions: JSON.parse(JSON.stringify(cardDimensions))
    }
    setHistoryStack(prev => [...prev.slice(-35), stateSnapshot])
    setRedoStack([])
  }

  // Wrapped State Setters with Automatic History Tracking
  const updateCustomTitle = (val) => {
    pushStateToHistory()
    setCustomTitle(val)
  }

  const updateCustomFont = (val) => {
    pushStateToHistory()
    setCustomFont(val)
  }

  const updateWallpaperFormat = (val) => {
    pushStateToHistory()
    setWallpaperFormat(val)
  }

  const updateBgConfig = (val) => {
    pushStateToHistory()
    setBgConfig(val)
  }

  const updateCardOpacity = (val) => {
    pushStateToHistory()
    setCardOpacity(val)
  }

  const updateCardFontSize = (val) => {
    pushStateToHistory()
    setCardFontSize(val)
  }

  const updateCardDimensions = (val) => {
    pushStateToHistory()
    setCardDimensions(val)
  }

  const handleUndo = () => {
    if (historyStack.length === 0) return
    const currentState = {
      customTitle,
      customFont,
      wallpaperFormat,
      bgConfig: { ...bgConfig },
      cardOpacity,
      cardFontSize,
      cardDimensions: JSON.parse(JSON.stringify(cardDimensions))
    }
    const previousState = historyStack[historyStack.length - 1]

    setRedoStack(prev => [currentState, ...prev])
    setHistoryStack(prev => prev.slice(0, -1))

    setCustomTitle(previousState.customTitle)
    setCustomFont(previousState.customFont)
    setWallpaperFormat(previousState.wallpaperFormat || 'cards')
    setBgConfig(previousState.bgConfig)
    setCardOpacity(previousState.cardOpacity)
    setCardFontSize(previousState.cardFontSize ?? 100)
    setCardDimensions(previousState.cardDimensions)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const nextState = redoStack[0]
    const currentState = {
      customTitle,
      customFont,
      wallpaperFormat,
      bgConfig: { ...bgConfig },
      cardOpacity,
      cardFontSize,
      cardDimensions: JSON.parse(JSON.stringify(cardDimensions))
    }

    setHistoryStack(prev => [...prev, currentState])
    setRedoStack(prev => prev.slice(1))

    setCustomTitle(nextState.customTitle)
    setCustomFont(nextState.customFont)
    setWallpaperFormat(nextState.wallpaperFormat || 'cards')
    setBgConfig(nextState.bgConfig)
    setCardOpacity(nextState.cardOpacity)
    setCardFontSize(nextState.cardFontSize ?? 100)
    setCardDimensions(nextState.cardDimensions)
  }

  // Parse raw schedule items into day map using accurate SIAS day token extractor
  const transformDataToDaysMap = (backendData) => {
    const daysMap = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: []
    }

    if (!backendData || !backendData.subjects) return daysMap

    for (const subjectData of backendData.subjects) {
      const cleanedSubject = (subjectData.subject || "N/A").replace(/\s+/g, ' ').trim()

      for (const schedule of subjectData.schedules || []) {
        const originalTimeString = schedule.time || ""
        const parsedSchedule = parseScheduleForDisplay(originalTimeString)

        if (parsedSchedule) {
          const scheduleEntry = {
            subject: cleanedSubject,
            time: parsedSchedule.time,
            room: (schedule.room || "N/A").replace(/\s+/g, ''),
          }

          parsedSchedule.days.forEach(day => {
            if (daysMap[day]) {
              daysMap[day].push(scheduleEntry)
            }
          })
        }
      }
    }

    // Sort classes chronologically within each day
    Object.keys(daysMap).forEach(day => {
      daysMap[day].sort(sortByTime)
    })

    return daysMap
  }

  // Handle uploaded PDF files
  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return

    setSelectedFiles(files)
    setErrorMessage('')
    setIsLoading(true)

    if (uploadMode === 'single') {
      const formData = new FormData()
      formData.append('pdf_file', files[0])

      try {
        const data = await postWithFallback('/process-pdf', formData)
        setSectionName(data.sectionName || '')
        const dayMapped = transformDataToDaysMap(data)
        setProcessedData(dayMapped)
        setCompareData(null)
      } catch (err) {
        console.error('API Error:', err)
        setErrorMessage(err.message || 'Error processing PDF schedule')
      } finally {
        setIsLoading(false)
      }
    } else {
      if (files.length !== 2) {
        setErrorMessage('Please select exactly 2 PDF files to compare schedules')
        setIsLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('pdf_files', files[0])
      formData.append('pdf_files', files[1])

      try {
        const data = await postWithFallback('/compare-schedules', formData)
        setCompareData(data)
        setProcessedData(null)
      } catch (err) {
        console.error('Compare Error:', err)
        setErrorMessage(err.message || 'Error comparing schedules')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Handle Custom Background Upload
  const handleCustomBgUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCustomBgName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => setCustomBgImage(event.target?.result)
    reader.readAsDataURL(file)
  }

  const handleClearCustomBg = () => {
    setCustomBgImage(null)
    setCustomBgName('')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      {/* Navigation Bar */}
      <Navbar currentTheme={theme} setTheme={setTheme} />

      <main className="flex-1 space-y-12 pb-16">
        {/* Hero Section */}
        <section id="home" className="relative overflow-hidden pt-12 pb-8 sm:pt-20 sm:pb-12 text-center">
          <div className="container max-w-5xl px-4 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              High-Performance Go Appwrite Engine
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
              Your Schedule, <br />
              <span className="text-primary font-extrabold tracking-tight">
                Reimagined.
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
              Convert your SIAS COE PDF schedule into beautiful, customizable wallpapers for your phone or desktop in seconds.
            </p>
          </div>
        </section>

        {/* Generator Section */}
        <section id="generator" className="container max-w-7xl px-4 sm:px-8 space-y-8">
          {/* Upload Card */}
          <UploadSection
            uploadMode={uploadMode}
            setUploadMode={setUploadMode}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            onFilesSelected={handleFilesSelected}
            compareSettings={compareSettings}
            setCompareSettings={setCompareSettings}
            customBgName={customBgName}
            onCustomBgUpload={handleCustomBgUpload}
            onClearCustomBg={handleClearCustomBg}
            isLoading={isLoading}
          />

          {/* Error Feedback Message */}
          {errorMessage && (
            <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Generator Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Customization Sidebar */}
            <div className="lg:col-span-4">
              <CustomizationPanel
                customTitle={customTitle}
                setCustomTitle={updateCustomTitle}
                customFont={customFont}
                setCustomFont={updateCustomFont}
                wallpaperFormat={wallpaperFormat}
                setWallpaperFormat={updateWallpaperFormat}
                bgConfig={bgConfig}
                setBgConfig={updateBgConfig}
                cardOpacity={cardOpacity}
                setCardOpacity={updateCardOpacity}
                cardFontSize={cardFontSize}
                setCardFontSize={updateCardFontSize}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                cardDimensions={cardDimensions}
                setCardDimensions={updateCardDimensions}
                customBgImage={customBgImage}
                customBgName={customBgName}
                onCustomBgUpload={handleCustomBgUpload}
                onClearCustomBg={handleClearCustomBg}
                canUndo={historyStack.length > 0}
                canRedo={redoStack.length > 0}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>

            {/* Right Column: Interactive Schedule & Wallpaper Display */}
            <div className="lg:col-span-8 space-y-6">
              {/* View Mode Toggle Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/50 shadow-xs">
                <span className="text-sm font-bold pl-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Preview Display
                </span>

                <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-muted p-1 rounded-xl w-full sm:w-auto">
                  <Button
                    variant={viewMode === 'web' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('web')}
                    className="h-8 text-[11px] sm:text-xs font-semibold rounded-lg px-2 sm:px-3"
                  >
                    Web Grid
                  </Button>
                  <Button
                    variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('mobile')}
                    className="h-8 text-[11px] sm:text-xs font-semibold rounded-lg px-2 sm:px-3"
                  >
                    Mobile
                  </Button>
                  <Button
                    variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('desktop')}
                    className="h-8 text-[11px] sm:text-xs font-semibold rounded-lg px-2 sm:px-3"
                  >
                    Desktop
                  </Button>
                </div>
              </div>

              {/* Dynamic View Mode Renderer */}
              {viewMode === 'web' ? (
                <ScheduleGrid
                  processedData={processedData}
                  compareData={compareData}
                  sectionName={sectionName}
                />
              ) : (
                <WallpaperCanvas
                  currentTheme={theme}
                  processedData={processedData}
                  sectionName={sectionName}
                  customTitle={customTitle}
                  customFont={customFont}
                  wallpaperFormat={wallpaperFormat}
                  bgConfig={bgConfig}
                  cardOpacity={cardOpacity}
                  cardFontSize={cardFontSize}
                  cardDimensions={cardDimensions}
                  customBgImage={customBgImage}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                />
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container max-w-7xl px-4 sm:px-8 py-12 border-t border-border/40">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Why use SIAS Organizer?</h2>
            <p className="text-sm text-muted-foreground">
              Built specifically for university students to make class schedule management fast, elegant, and seamless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">Smart Parsing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automatically extracts subject codes, descriptions, class times, and room locations from SIAS COE PDFs.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">Multiple Themes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose from 8 curated color themes with glassmorphism effects and custom background upload support.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">HD Wallpaper Export</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generates high-definition images perfectly sized for mobile lockscreens and desktop wallpapers.
              </p>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/40">
        <div className="container max-w-7xl px-4 sm:px-8 text-center text-xs text-muted-foreground space-y-1">
          <p>&copy; 2026 James Ryan S. Gallego | SIAS Schedule Organizer</p>
          <p>Free online tool to convert SIAS PDF schedules into wallpapers.</p>
        </div>
      </footer>
    </div>
  )
}
