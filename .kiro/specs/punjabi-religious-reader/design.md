# Design Document

## Overview

The Punjabi Religious PDF Reader is a web application that converts a 10,000-page Punjabi PDF into an accessible, page-by-page reading experience. The application emphasizes religious theming with appropriate colors, fonts, and layouts that honor the sacred nature of the content while providing modern web functionality.

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   File Storage  │
│   (React/Vue)   │◄──►│   (Node.js)     │◄──►│   (Images/DB)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React.js with responsive design
- **Backend**: Node.js with Express.js
- **PDF Processing**: PDF2pic or PDF.js for page conversion
- **Storage**: File system for page images, SQLite/PostgreSQL for metadata
- **Styling**: CSS-in-JS or Tailwind CSS for theming

## Components and Interfaces

### Frontend Components

#### 1. PageViewer Component
- **Purpose**: Display individual PDF pages as images
- **Props**: `pageNumber`, `totalPages`, `imageUrl`, `onPageChange`
- **Features**: 
  - Image optimization and lazy loading
  - Zoom functionality
  - Touch/swipe gestures for mobile

#### 2. NavigationControls Component
- **Purpose**: Provide page navigation interface
- **Features**:
  - Previous/Next buttons with religious iconography
  - Page number input with validation
  - Progress indicator
  - Keyboard shortcut support (arrow keys, Page Up/Down)

#### 3. ThemeProvider Component
- **Purpose**: Manage religious theming across the application
- **Features**:
  - Color scheme management (saffron, gold, deep blue palette)
  - Font loading for Punjabi/Gurmukhi script support
  - Background pattern/gradient application

#### 4. ResponsiveLayout Component
- **Purpose**: Ensure optimal viewing across devices
- **Features**:
  - Mobile-first responsive design
  - Touch-friendly controls for tablets/phones
  - Desktop keyboard navigation

### Backend API Endpoints

#### 1. Page Retrieval API
```
GET /api/pages/:pageNumber
- Returns: Page image URL and metadata
- Headers: Cache control for performance
```

#### 2. Navigation API
```
GET /api/navigation
- Returns: Total page count, current session state
POST /api/navigation/bookmark
- Saves user's current reading position
```

#### 3. PDF Processing API
```
POST /api/process-pdf (Admin only)
- Processes uploaded PDF into individual page images
- Returns: Processing status and progress
```

## Data Models

### Page Model
```typescript
interface Page {
  id: number;
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  processedAt: Date;
}
```

### UserSession Model
```typescript
interface UserSession {
  sessionId: string;
  currentPage: number;
  lastVisited: Date;
  bookmarks?: number[];
}
```

### Configuration Model
```typescript
interface AppConfig {
  totalPages: number;
  title: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
}
```

## Religious Theming Design

### Color Palette
- **Primary**: Saffron (#FF9933) - for headers and accent elements
- **Secondary**: Deep Blue (#1B365D) - for navigation and borders
- **Background**: Cream (#FAF7F0) - main background color
- **Text**: Dark Brown (#3C2415) - for optimal readability
- **Gold Accents**: (#D4AF37) - for special elements and highlights

### Typography
- **Primary Font**: 'Noto Sans Gurmukhi' for Punjabi text
- **Secondary Font**: 'Crimson Text' for English elements
- **Font Sizes**: Responsive scaling (16px base, up to 24px for headers)

### Visual Elements
- Subtle lotus or geometric patterns in background
- Rounded corners with soft shadows
- Peaceful, non-distracting animations
- Sacred symbols as navigation icons (where appropriate)

## Error Handling

### Client-Side Error Handling
- **Image Loading Failures**: Display placeholder with retry option
- **Navigation Errors**: Graceful fallback to valid page numbers
- **Network Issues**: Offline mode with cached pages
- **Invalid Input**: User-friendly validation messages

### Server-Side Error Handling
- **File Not Found**: Return appropriate HTTP status with fallback
- **PDF Processing Errors**: Detailed logging and admin notifications
- **Rate Limiting**: Prevent abuse while allowing normal reading
- **Database Errors**: Graceful degradation with cached responses

## Testing Strategy

### Unit Testing
- Component rendering and prop handling
- Navigation logic and page validation
- Theme application and responsive behavior
- PDF processing utilities

### Integration Testing
- API endpoint functionality
- Database operations and data integrity
- File storage and retrieval
- Cross-browser compatibility

### Performance Testing
- Page load times with large images
- Memory usage with extended reading sessions
- Mobile device performance
- Concurrent user handling

### Accessibility Testing
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation
- Mobile touch accessibility

## Performance Considerations

### Image Optimization
- Convert PDF pages to optimized WEBP/JPEG format
- Generate multiple sizes for different screen densities
- Implement progressive loading for large images
- Use CDN for global content delivery

### Caching Strategy
- Browser caching for static page images
- Service worker for offline reading capability
- Redis caching for frequently accessed pages
- Preload adjacent pages for smooth navigation

### Mobile Optimization
- Touch-optimized navigation controls
- Reduced image sizes for mobile networks
- Gesture-based page turning
- Responsive image serving based on device capabilities