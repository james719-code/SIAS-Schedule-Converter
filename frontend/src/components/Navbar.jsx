import React, { useState } from 'react'
import { Calendar, Palette, Menu, X, Waves, Moon, Sparkles, Shield, Flower2, Leaf, Sun, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

const themes = [
  { id: 'ocean', name: 'Ocean', color: '#2563eb', icon: Waves },
  { id: 'dark', name: 'Dark Mode', color: '#1e293b', icon: Moon },
  { id: 'midnight', name: 'Midnight', color: '#7c3aed', icon: Sparkles },
  { id: 'maroon', name: 'Maroon', color: '#991b1b', icon: Shield },
  { id: 'wisteria', name: 'Wisteria', color: '#9333ea', icon: Flower2 },
  { id: 'emerald', name: 'Emerald', color: '#059669', icon: Leaf },
  { id: 'summer', name: 'Summer', color: '#f59e0b', icon: Sun },
  { id: 'sakura', name: 'Sakura', color: '#ec4899', icon: Heart },
]

export default function Navbar({ currentTheme, setTheme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)

  const activeThemeObj = themes.find(t => t.id === currentTheme) || themes[0]
  const ActiveIcon = activeThemeObj.icon

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        
        {/* Brand Logo */}
        <a href="#home" className="flex items-center gap-2.5 font-bold text-xl tracking-tight hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Calendar className="h-5 w-5" />
          </div>
          <span>
            SIAS <span className="text-primary font-extrabold">Organizer</span>
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#home" className="text-foreground/80 hover:text-foreground transition-colors">Home</a>
          <a href="#generator" className="text-foreground/80 hover:text-foreground transition-colors">Generator</a>
          <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">Features</a>
        </nav>

        {/* Theme Picker & Controls */}
        <div className="flex items-center gap-3">
          {/* Multiple Theme Buttons with Symbols (Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card/60 p-1.5 shadow-2xs">
            {themes.map((t) => {
              const IconSymbol = t.icon
              const isActive = currentTheme === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={`${t.name} Theme`}
                  className={`flex items-center justify-center h-7 w-7 rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm scale-110'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <IconSymbol className="h-3.5 w-3.5" />
                </button>
              )
            })}
          </div>

          {/* Theme Dropdown Button for Mobile/Smaller Screens */}
          <div className="relative lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setThemePickerOpen(!themePickerOpen)}
              title="Select Color Theme"
              className="gap-2 rounded-xl h-9 text-xs font-semibold"
            >
              <ActiveIcon className="h-4 w-4 text-primary" />
              <span>{activeThemeObj.name}</span>
            </Button>

            {themePickerOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-popover p-2 shadow-xl backdrop-blur-md z-50">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mb-1">Theme Palette & Symbol</div>
                <div className="space-y-1">
                  {themes.map((t) => {
                    const IconSymbol = t.icon
                    const isActive = currentTheme === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id)
                          setThemePickerOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <IconSymbol className="h-4 w-4" />
                          {t.name}
                        </span>
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-6 py-4 shadow-lg">
          <nav className="flex flex-col gap-4 text-base font-medium">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="text-foreground/90 hover:text-primary py-1"
            >
              Home
            </a>
            <a
              href="#generator"
              onClick={() => setMobileMenuOpen(false)}
              className="text-foreground/90 hover:text-primary py-1"
            >
              Generator
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-foreground/90 hover:text-primary py-1"
            >
              Features
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
