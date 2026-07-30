import React from 'react'
import { Calendar, Clock, MapPin, Sparkles, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ScheduleGrid({ processedData, compareData, sectionName }) {
  if (compareData) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 font-bold text-lg text-primary mb-2">
            <CheckCircle2 className="h-5 w-5" />
            Schedule Comparison Results
          </div>
          <p className="text-sm text-muted-foreground">
            Common free-time slots found between both uploaded schedules:
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {compareData.commonFreeSlots?.map((slot, idx) => (
              <Badge key={idx} variant="default" className="text-sm px-3 py-1 gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {slot}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (!processedData || Object.keys(processedData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-lg">No Schedule Data Yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Upload a SIAS COE PDF above to automatically generate your interactive weekly schedule grid.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sectionName && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm font-bold border-primary text-primary">
              Section: {sectionName}
            </Badge>
          </div>
        </div>
      )}

      {/* Responsive Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dayNames.map((day) => {
          const daySubjects = processedData[day] || []
          return (
            <Card key={day} className="flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4 bg-muted/40 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>{day}</span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {daySubjects.length} {daySubjects.length === 1 ? 'class' : 'classes'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-1 space-y-2.5">
                {daySubjects.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic py-6 text-center">
                    No classes scheduled
                  </div>
                ) : (
                  daySubjects.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs hover:border-primary/40 transition-colors space-y-1.5"
                    >
                      <div className="font-semibold text-xs text-foreground line-clamp-2">
                        {item.subject}
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Clock className="h-3 w-3" />
                          {item.time}
                        </span>
                        <span className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-md font-mono">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {item.room}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
