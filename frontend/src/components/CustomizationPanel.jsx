import React from 'react'
import { Undo2, Redo2, Type, Sliders, LayoutGrid, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

const fontOptions = [
  { id: 'modern', name: 'Modern Sans (Inter/Poppins)' },
  { id: 'serif', name: 'Elegant Serif (Playfair)' },
  { id: 'hand', name: 'Handwritten (Caveat)' },
  { id: 'mono', name: 'Monospace (Fira Code)' },
  { id: 'slab', name: 'Roboto Slab' },
  { id: 'pacifico', name: 'Pacifico' },
  { id: 'oswald', name: 'Oswald' },
  { id: 'quicksand', name: 'Quicksand' },
]

const daysList = ['all', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function CustomizationPanel({
  customTitle,
  setCustomTitle,
  customFont,
  setCustomFont,
  wallpaperFormat = 'cards',
  setWallpaperFormat,
  bgConfig,
  setBgConfig,
  cardOpacity,
  setCardOpacity,
  cardFontSize = 100,
  setCardFontSize,
  selectedDay,
  setSelectedDay,
  cardDimensions,
  setCardDimensions,
  customBgImage,
  customBgName,
  onCustomBgUpload,
  onClearCustomBg,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) {
  const currentDayDim = cardDimensions[selectedDay === 'all' ? 'Monday' : selectedDay] || { w: 100, h: 100, x: 0, y: 0 }

  const handleCardDimChange = (key, val) => {
    if (selectedDay === 'all') {
      const updated = { ...cardDimensions }
      Object.keys(updated).forEach(d => {
        updated[d] = { ...updated[d], [key]: val }
      })
      setCardDimensions(updated)
    } else {
      setCardDimensions({
        ...cardDimensions,
        [selectedDay]: {
          ...cardDimensions[selectedDay],
          [key]: val
        }
      })
    }
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2 font-bold text-base">
          <Sliders className="h-4 w-4 text-primary" />
          Wallpaper Customization
        </div>

        {/* Undo / Redo Action Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo Edit"
            className="h-8 w-8 rounded-lg"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo Edit"
            className="h-8 w-8 rounded-lg"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* General Title Setting */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5" /> Custom Title
        </label>
        <Input
          type="text"
          placeholder="e.g. 1st Sem Schedule 2026..."
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
        />
      </div>

      {/* Layout Format Selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground block">Wallpaper Layout Format</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={wallpaperFormat === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWallpaperFormat('cards')}
            className="h-9 text-xs rounded-xl font-semibold"
          >
            Cards View
          </Button>
          <Button
            type="button"
            variant={wallpaperFormat === 'timetable' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWallpaperFormat('timetable')}
            className="h-9 text-xs rounded-xl font-semibold"
          >
            Timetable Matrix
          </Button>
        </div>
      </div>

      {/* Typography Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground block font-medium">Font Family</label>
        <select
          value={customFont}
          onChange={(e) => setCustomFont(e.target.value)}
          className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium"
        >
          {fontOptions.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Background Image Adjustments & Custom Upload */}
      <div className="space-y-4 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5" /> Custom Background Image
          </label>
          {customBgImage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCustomBg}
              className="h-6 text-[11px] text-destructive hover:text-destructive px-2"
            >
              Remove Image
            </Button>
          )}
        </div>

        {/* File Input */}
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={onCustomBgUpload}
            className="hidden"
            id="custom-bg-input"
          />
          <label
            htmlFor="custom-bg-input"
            className="flex items-center justify-between w-full h-10 px-3 rounded-xl border border-dashed border-input bg-muted/30 hover:bg-muted/60 cursor-pointer text-xs transition-colors"
          >
            <span className="truncate text-muted-foreground">
              {customBgName || 'Upload custom wallpaper image...'}
            </span>
            <Image className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span>Opacity ({bgConfig.opacity}%)</span>
          </div>
          <Slider
            value={[bgConfig.opacity]}
            min={0}
            max={100}
            step={1}
            onValueChange={([val]) => setBgConfig({ ...bgConfig, opacity: val })}
          />

          <div className="flex items-center justify-between text-xs">
            <span>Horizontal Offset X ({bgConfig.x}px)</span>
          </div>
          <Slider
            value={[bgConfig.x]}
            min={-100}
            max={100}
            step={1}
            onValueChange={([val]) => setBgConfig({ ...bgConfig, x: val })}
          />

          <div className="flex items-center justify-between text-xs">
            <span>Vertical Offset Y ({bgConfig.y}px)</span>
          </div>
          <Slider
            value={[bgConfig.y]}
            min={-100}
            max={100}
            step={1}
            onValueChange={([val]) => setBgConfig({ ...bgConfig, y: val })}
          />

          <div className="flex items-center justify-between text-xs">
            <span>Scale Zoom ({bgConfig.scale}%)</span>
          </div>
          <Slider
            value={[bgConfig.scale]}
            min={50}
            max={200}
            step={1}
            onValueChange={([val]) => setBgConfig({ ...bgConfig, scale: val })}
          />
        </div>
      </div>

      {/* Card Dimensions & Layout Controls */}
      <div className="space-y-4 pt-2 border-t border-border/40">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5" /> Card Styling & Spacing
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span>Card Glass Opacity ({cardOpacity}%)</span>
          </div>
          <Slider
            value={[cardOpacity]}
            min={10}
            max={100}
            step={1}
            onValueChange={([val]) => setCardOpacity(val)}
          />

          <div className="flex items-center justify-between text-xs">
            <span>Card Font Size ({cardFontSize}%)</span>
          </div>
          <Slider
            value={[cardFontSize]}
            min={30}
            max={160}
            step={1}
            onValueChange={([val]) => setCardFontSize && setCardFontSize(val)}
          />

          <div className="pt-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Target Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs"
            >
              {daysList.map(d => (
                <option key={d} value={d}>{d === 'all' ? 'All Days' : d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span>Card Width ({currentDayDim.w}%)</span>
          </div>
          <Slider
            value={[currentDayDim.w]}
            min={50}
            max={150}
            step={1}
            onValueChange={([val]) => handleCardDimChange('w', val)}
          />

          <div className="flex items-center justify-between text-xs">
            <span>Card Height ({currentDayDim.h}%)</span>
          </div>
          <Slider
            value={[currentDayDim.h]}
            min={50}
            max={150}
            step={1}
            onValueChange={([val]) => handleCardDimChange('h', val)}
          />

          <div className="flex items-center justify-between text-xs">
            <span>Offset X ({currentDayDim.x}px)</span>
          </div>
          <Slider
            value={[currentDayDim.x]}
            min={-100}
            max={100}
            step={1}
            onValueChange={([val]) => handleCardDimChange('x', val)}
          />

          <div className="flex items-center justify-between text-xs">
            <span>Offset Y ({currentDayDim.y}px)</span>
          </div>
          <Slider
            value={[currentDayDim.y]}
            min={-100}
            max={100}
            step={1}
            onValueChange={([val]) => handleCardDimChange('y', val)}
          />
        </div>
      </div>
    </Card>
  )
}
