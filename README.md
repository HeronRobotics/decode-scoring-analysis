# FTC Performance Tracker

A React application designed for FIRST Tech Challenge (FTC) teams to track and analyze their game performance during matches.

## Features

- **Match Timer**: Start matches with configurable timers (2:00, 2:30, or no timer)
- **Cycle Recording**: Quick recording of ball cycles (1-3 balls) with success tracking
- **Gate Events**: Mark gate opening events on the timeline
- **Visual Timeline**: See all events displayed chronologically with visual indicators
- **Statistics**: Comprehensive stats including:
  - Average, standard deviation, min, and max cycle times
  - Average, standard deviation, min, and max balls scored per cycle
  - Accuracy percentages
  - Overall match summary
- **Data Export/Import**: Save and load match data in JSON format

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 7)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Start a Match**: Choose a timer option (2:00, 2:30, or No Timer)
2. **Record Cycles**: Click "Record Cycle" and specify:
   - Total balls in the cycle (1-3)
   - Number of balls scored (0 to total)
3. **Record Gates**: Click "Gate Open" when the gate opens
4. **View Statistics**: Stats are calculated automatically as you record events
5. **Export/Import**: Save your match data or load previous matches

## Match Data Format

Match data is exported in the format:
```
0:00; 1/2 at 1:40; 2/2 at 1:50; gate at 2:00; 3/3 at 2:10;
```

Where:
- `scored/total` = balls scored out of total balls in cycle
- `at X:XX` = timestamp of the event
- `gate` = gate opening event

## Technologies Used

- React 18
- Vite 7
- CSS3 for styling

## License

MIT
