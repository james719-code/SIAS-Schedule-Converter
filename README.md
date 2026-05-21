# SIAS Schedule Organizer

Convert a SIAS Certificate of Enrollment (COE) PDF into a clean weekly schedule preview and export it as a phone or desktop wallpaper.

## Demo

<img src="docs/demo.gif" alt="SIAS Schedule Organizer demo" width="400">

[Open the demo GIF](docs/demo.gif)

## Live Demo

Use the hosted app here: [sias-schedule-organizer.netlify.app](https://sias-schedule-organizer.netlify.app/)

Suggested GitHub About text:

> Convert SIAS COE PDF schedules into clean, customizable weekly wallpaper images.

## What It Does

SIAS Schedule Organizer helps students turn hard-to-read SIAS schedule data into a visual weekly layout. Upload a SIAS COE PDF, review the parsed class schedule, choose a theme, optionally add a custom background, then download the result as a PNG wallpaper.

Key features:

- Upload SIAS COE PDF files.
- Extract subjects, meeting times, days, and rooms through a hosted parser.
- Preview schedules in a weekly grid.
- Switch between web, mobile, and desktop wallpaper views.
- Customize themes, fonts, title text, background image position, opacity, and card layout.
- Export the finished schedule as a PNG image.

## Supported Input

The app currently supports **PDF files from SIAS Certificate of Enrollment (COE) documents**.

The frontend posts the selected file to the configured parser endpoint:

```js
https://flaskproject-gurc.onrender.com/process-pdf
```

The frontend expects the parser to return schedule data in this shape:

```json
{
  "sectionName": "BSCS 1A",
  "subjects": [
    {
      "subject": "Introduction to Computing",
      "schedules": [
        {
          "time": "8:00AM-10:00AMMTH",
          "room": "LAB 1"
        }
      ]
    }
  ]
}
```

Day codes are read from the end of each `time` value:

| Code | Day |
| --- | --- |
| `M` | Monday |
| `T` | Tuesday |
| `W` | Wednesday |
| `TH` | Thursday |
| `F` | Friday |
| `S` | Saturday |

## Output

After parsing, the app generates:

- A browser-based weekly schedule preview.
- A high-resolution PNG wallpaper named with this pattern:

```text
SIAS_<section_name>_<theme>.png
```

The export size is based on the selected preview mode and the user's device screen size. Mobile preview defaults to `1080x1920` on non-mobile devices.

## Usage

1. Open the live demo or run the project locally.
2. Upload a SIAS COE PDF.
3. Review the generated weekly schedule.
4. Choose a color theme and view mode.
5. Optional: upload a custom background image and adjust the layout.
6. Click **Download Wallpaper** to export the PNG.

## Run Locally

This project is a static frontend. There is no build step.

Run it with any local static server from the repository root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also deploy the files directly to static hosting such as Netlify, GitHub Pages, or Vercel.

## Project Structure

```text
.
|-- index.html       # Main page and app markup
|-- styles.css       # App styling and responsive layout
|-- script.js        # Upload, parsing, preview, customization, and export logic
|-- scrollSpy.js     # Navigation scroll tracking
|-- robots.txt       # Search crawler rules
|-- sitemap.xml      # Public site map
`-- docs/            # README visual assets
```

## Notes

- PDF parsing depends on the hosted backend endpoint in `script.js`.
- External assets are loaded from CDNs, including Google Fonts and Font Awesome.
- The exported image includes a small `James Ryan | SIAS Organizer` watermark.

## Author

Created by James Ryan S. Gallego.
