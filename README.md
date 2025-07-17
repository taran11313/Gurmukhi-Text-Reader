# Reader Application

A modern web application for reading religious texts in Gurmukhi page-by-page format. Built with React.js frontend and Node.js backend, featuring beautiful religious theming and responsive design.

## Features

- 📖 **Page-by-page PDF reading** - Navigate through religious texts easily
- 🎨 **Religious theming** - Beautiful saffron, gold, and cream color scheme
- 📱 **Responsive design** - Works on desktop, tablet, and mobile devices
- 🔖 **Bookmarks** - Save and manage your reading positions
- 💾 **Session persistence** - Remember your current page across visits
- ⌨️ **Keyboard navigation** - Arrow keys, Page Up/Down support
- 🔍 **Zoom controls** - Adjust text size for better readability
- 🌐 **Offline support** - Service worker for offline reading capability
- ♿ **Accessibility** - Screen reader support and keyboard navigation
- 🎯 **Touch gestures** - Swipe navigation on mobile devices

## Technology Stack

### Frontend
- **React.js** with TypeScript
- **Vite** for build tooling
- **CSS3** with custom properties for theming
- **Service Worker** for offline functionality
- **Responsive design** with mobile-first approach

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **SQLite/PostgreSQL** for data storage
- **Multer** for file uploads
- **PDF2pic** for PDF processing
- **Knex.js** for database operations

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- For actual PDF processing:
  - ImageMagick
  - Ghostscript

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/punjabi-religious-reader.git
cd punjabi-religious-reader
```

### 2. Install dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Set up environment variables

#### Backend (.env)
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

#### Frontend (.env)
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
```

### 4. Initialize the database
```bash
cd backend
npm run db:init
```

## Development

### Start the backend server
```bash
cd backend
npm run dev
```
The backend will run on http://localhost:3001

### Start the frontend development server
```bash
cd frontend
npm run dev
```
The frontend will run on http://localhost:3000

## PDF Processing Setup

For actual PDF processing (to see real page content instead of placeholders):

### Windows
1. Install ImageMagick: https://imagemagick.org/script/download.php#windows
2. Install Ghostscript: https://www.ghostscript.com/download/gsdnld.html
3. Ensure both are added to your system PATH
4. Restart the backend server

### macOS
```bash
brew install imagemagick ghostscript
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install imagemagick ghostscript
```

## Usage

1. **Upload PDF**: Use the API endpoint `/api/pdf/upload` to upload your Punjabi religious text
2. **Navigate**: Use arrow keys, navigation buttons, or touch gestures to move between pages
3. **Bookmark**: Click the bookmark button to save your current reading position
4. **Zoom**: Use + and - keys or zoom buttons to adjust text size
5. **Jump to page**: Enter a page number to navigate directly

## API Endpoints

### PDF Processing
- `POST /api/pdf/upload` - Upload and process PDF
- `GET /api/pdf/status/:jobId` - Check processing status
- `GET /api/pdf/jobs` - List all processing jobs

### Page Serving
- `GET /api/pages/:pageNumber` - Get page metadata
- `GET /api/pages/:pageNumber/image` - Get page image
- `GET /api/pages/:pageNumber/thumbnail` - Get page thumbnail

### Navigation
- `GET /api/navigation` - Get navigation metadata
- `POST /api/navigation/bookmark` - Save session state
- `GET /api/navigation/session/:sessionId` - Get session info

## Development Mode

The application includes a development mode that shows placeholder content when PDF processing dependencies are not installed. This allows you to:

- Test all UI functionality
- Develop new features
- Demonstrate the application
- Train users on the interface

## Building for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
```

## Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Religious Theming

The application uses a carefully chosen color palette that respects the sacred nature of the content:

- **Saffron (#FF9933)** - Primary color for headers and accents
- **Deep Blue (#1B365D)** - Navigation and borders
- **Cream (#FAF7F0)** - Main background
- **Gold (#D4AF37)** - Special elements and highlights
- **Warm White (#FEFEFE)** - Content backgrounds

## Accessibility

The application is built with accessibility in mind:

- Screen reader support
- Keyboard navigation
- High contrast colors
- Touch-friendly controls
- ARIA labels and semantic HTML

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with respect for Punjabi religious traditions
- Designed for comfortable reading of sacred texts
- Inspired by the need for accessible digital religious content

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**ੴ** - *In service of making sacred texts accessible to all*
