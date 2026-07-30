import React, { useRef } from 'react'
import { UploadCloud, FileText, X, Layers, Image as ImageIcon, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

export default function UploadSection({
  uploadMode,
  setUploadMode,
  selectedFiles,
  setSelectedFiles,
  onFilesSelected,
  compareSettings,
  setCompareSettings,
  customBgName,
  onCustomBgUpload,
  onClearCustomBg,
  isLoading
}) {
  const fileInputRef = useRef(null)
  const bgInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files)
    }
  }

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Upload Enrollment PDF
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select one PDF for a schedule wallpaper or two PDFs to compare available free time.
          </p>
        </div>

        {/* Upload Mode Selector */}
        <Tabs value={uploadMode} onValueChange={setUploadMode} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              Single
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2 text-xs sm:text-sm">
              <Layers className="h-4 w-4" />
              Compare
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Drag & Drop File Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/30 hover:bg-primary/5 p-8 text-center transition-all duration-200"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple={uploadMode === 'compare'}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-semibold text-base">
              {uploadMode === 'compare' ? 'Drop 2 PDF files here' : 'Drop PDF file here'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              or <span className="text-primary font-medium underline">browse files</span> from your device
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            PDF files only
          </span>
        </div>
      </div>

      {/* Selected File Pills */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl bg-secondary/80 px-3 py-1.5 text-xs font-medium text-secondary-foreground shadow-sm"
            >
              <FileText className="h-4 w-4 text-primary" />
              <span className="truncate max-w-[200px]">{file.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Compare Window Settings (Visible in Compare Mode) */}
      {uploadMode === 'compare' && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Schedule Comparison Settings
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Window Preset</label>
              <select
                value={compareSettings.preset}
                onChange={(e) => {
                  const val = e.target.value
                  const presets = {
                    'class-day': { start: '07:00', end: '21:00' },
                    'all-day': { start: '00:00', end: '23:59' },
                    morning: { start: '06:00', end: '12:00' },
                    afternoon: { start: '12:00', end: '18:00' },
                    evening: { start: '18:00', end: '23:00' },
                  }
                  if (presets[val]) {
                    setCompareSettings({
                      ...compareSettings,
                      preset: val,
                      dayStart: presets[val].start,
                      dayEnd: presets[val].end,
                    })
                  } else {
                    setCompareSettings({ ...compareSettings, preset: 'custom' })
                  }
                }}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="class-day">Class Day (7am - 9pm)</option>
                <option value="all-day">All Day (24 Hours)</option>
                <option value="morning">Morning (6am - 12pm)</option>
                <option value="afternoon">Afternoon (12pm - 6pm)</option>
                <option value="evening">Evening (6pm - 11pm)</option>
                <option value="custom">Custom Window</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Day Start</label>
              <Input
                type="time"
                value={compareSettings.dayStart}
                onChange={(e) => setCompareSettings({ ...compareSettings, dayStart: e.target.value, preset: 'custom' })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Day End</label>
              <Input
                type="time"
                value={compareSettings.dayEnd}
                onChange={(e) => setCompareSettings({ ...compareSettings, dayEnd: e.target.value, preset: 'custom' })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Free Minutes</label>
              <Input
                type="number"
                min="5"
                step="5"
                value={compareSettings.minMinutes}
                onChange={(e) => setCompareSettings({ ...compareSettings, minMinutes: parseInt(e.target.value) || 15 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Background Image Uploader */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/40">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => bgInputRef.current?.click()}
            className="gap-2 rounded-xl"
          >
            <ImageIcon className="h-4 w-4 text-primary" />
            Custom Background Image
          </Button>
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            onChange={onCustomBgUpload}
            className="hidden"
          />

          {customBgName && (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-xl">
              <span className="truncate max-w-[150px]">{customBgName}</span>
              <button onClick={onClearCustomBg} className="hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
