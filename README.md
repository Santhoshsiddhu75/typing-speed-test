# Typing Speed Test

A modern, responsive typing speed test application built with React, TypeScript, TailwindCSS, ShadCN UI, and comprehensive Playwright testing.

## Features

### ✨ Core Functionality
- **Timer Options**: 1, 2, or 5-minute tests
- **Difficulty Levels**: Easy, Medium, Hard with appropriate text complexity
- **Real-time Stats**: WPM, CPM, Accuracy, Timer countdown
- **Character-level Feedback**: Visual indicators for correct/incorrect typing
- **Responsive Design**: Mobile-first approach with seamless tablet/desktop scaling

### 🎨 UI/UX
- **Modern Design**: Clean interface using ShadCN UI components
- **Theme Support**: CSS variables for easy customization
- **Smooth Animations**: TailwindCSS transitions and custom animations
- **Accessibility First**: WCAG compliant with keyboard navigation
- **Error Handling**: Comprehensive error boundaries and user feedback

### 🧪 Testing
- **Playwright Test Suite**: E2E testing across multiple browsers
- **Visual Regression**: Screenshot comparisons for UI consistency
- **Responsive Testing**: Multiple viewport sizes and devices
- **Accessibility Testing**: Keyboard navigation and screen reader support

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS + ShadCN UI components
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Testing**: Playwright
- **Build Tool**: Vite
- **Package Manager**: npm

## Project Structure

```
typing-speed-test/
├── src/
│   ├── components/
│   │   ├── ui/           # ShadCN UI components
│   │   └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── SetupScreen.tsx
│   │   └── TypingTestScreen.tsx
│   ├── data/
│   │   └── texts.ts      # Mock text data by difficulty
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── types/
│   │   └── index.ts      # TypeScript definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/                # Playwright test suite
├── public/
└── config files
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone and install dependencies**:
```bash
cd typing-speed-test
npm install
```

2. **Start development server**:
```bash
npm run dev
```

3. **Build for production**:
```bash
npm run build
```

4. **Preview production build**:
```bash
npm run preview
```

### Testing

1. **Run all tests**:
```bash
npm run test
```

2. **Run tests with UI**:
```bash
npm run test:ui
```

3. **Debug tests**:
```bash
npm run test:debug
```

## Component Architecture

### SetupScreen
- Timer selection (1, 2, 5 minutes)
- Difficulty selection (Easy, Medium, Hard)
- Responsive grid layout
- Smooth transitions and hover effects
- URL parameter navigation

### TypingTestScreen
- Real-time character tracking
- Live statistics calculation
- Timer countdown functionality
- Results modal with comprehensive stats
- Character-level visual feedback
- Keyboard event handling

### UI Components
- **Button**: Multiple variants and sizes
- **Card**: Consistent content containers
- **Dialog**: Modal for results display
- **Progress**: Visual progress indication

## Accessibility Features

- **Keyboard Navigation**: Full app navigable via keyboard
- **ARIA Labels**: Comprehensive labeling for screen readers
- **Focus Management**: Proper focus trapping and indicators
- **Color Contrast**: WCAG AA compliant color schemes
- **Responsive Text**: Scales properly with browser zoom
- **Reduced Motion**: Respects user motion preferences

## Testing Strategy

### Test Categories
1. **Functional Tests**: Core functionality and user flows
2. **Responsive Tests**: Layout across different screen sizes
3. **Accessibility Tests**: Keyboard navigation and ARIA compliance
4. **Visual Regression**: UI consistency across updates
5. **Error Handling**: Boundary conditions and error states

### Browser Coverage
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

## Performance Considerations

- **Code Splitting**: Lazy loading for optimal bundle size
- **Memoization**: React.memo and useMemo where appropriate
- **Efficient Updates**: Optimized state management
- **Image Optimization**: Responsive images and formats
- **Bundle Analysis**: Regular bundle size monitoring

## Customization

### Themes
Modify CSS variables in `src/index.css`:
```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --background: 0 0% 100%;
  /* ... other variables */
}
```

### Text Content
Add new difficulty texts in `src/data/texts.ts`:
```typescript
export const TEXTS: TextData = {
  easy: ["Your easy texts..."],
  medium: ["Your medium texts..."],
  hard: ["Your hard texts..."]
}
```

## Browser Support

- Modern browsers with ES2020 support
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Future Enhancements

- [ ] User accounts and progress tracking
- [ ] Multiple language support
- [ ] Custom text import
- [ ] Detailed analytics dashboard
- [ ] Multiplayer competitions
- [ ] Advanced typing exercises