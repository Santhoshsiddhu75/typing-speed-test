"use client"

import React, { useMemo } from 'react';
import { TrendingUp, Trophy } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis, Cell } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TestResult } from '@/types';

interface ProgressChartProps {
  data: TestResult[];
  className?: string;
}



const ProgressChart: React.FC<ProgressChartProps> = ({ data, className }) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const chartRef = React.useRef<HTMLDivElement>(null);
  
  
  // Memoize axis components to prevent re-renders on hover
  const memoizedXAxis = useMemo(() => (
    <XAxis
      dataKey="testNumber"
      tickFormatter={(value) => `#${value}`}
      fontSize={12}
      axisLine={false}
      tickLine={false}
    />
  ), []);

  const memoizedYAxis = useMemo(() => (
    <YAxis 
      fontSize={12} 
      width={35}
      axisLine={false}
      tickLine={false}
    />
  ), []);

  const { chartData, averageWpm, bestTestIndex, improvement, isMobile } = useMemo(() => {
    const isMobileView = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    if (!data.length) return { chartData: [], averageWpm: 0, bestTestIndex: -1, improvement: 0, isMobile: isMobileView };

    // Group tests by difficulty and get last 8 of each
    const testsByDifficulty = data.reduce((acc, test) => {
      if (!acc[test.difficulty]) acc[test.difficulty] = [];
      acc[test.difficulty].push(test);
      return acc;
    }, {} as Record<string, typeof data>);

    // Get last 8 tests from each difficulty, then combine and sort chronologically
    const limitedData = Object.values(testsByDifficulty)
      .flatMap(difficultyTests => 
        difficultyTests
          .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())
          .slice(-8) // Last 8 per difficulty
      )
      .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
    
    // Apply mobile limitation if needed
    const maxBarsForMobile = 10;
    const displayData = isMobileView && limitedData.length > maxBarsForMobile 
      ? limitedData.slice(-maxBarsForMobile) 
      : limitedData;

    const processedData = displayData.map((test, index) => ({
      testNumber: isMobileView && limitedData.length > maxBarsForMobile 
        ? limitedData.length - maxBarsForMobile + index + 1 
        : index + 1,
      wpm: test.wpm,
      accuracy: test.accuracy,
      difficulty: test.difficulty,
      fill: "rgb(34, 197, 94)", // Your signature green
      fullDate: new Date(test.created_at || '').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    // Calculate average WPM
    const avgWpm = processedData.reduce((sum, test) => sum + test.wpm, 0) / processedData.length;
    
    // Find best test index (highest WPM)
    const bestIndex = processedData.reduce((bestIdx, test, idx) => 
      test.wpm > processedData[bestIdx].wpm ? idx : bestIdx, 0
    );

    // Calculate improvement (last 10 tests vs first 10 tests)
    const recentTests = processedData.slice(-10);
    const earlierTests = processedData.slice(0, 10);
    const recentAvg = recentTests.reduce((sum, test) => sum + test.wpm, 0) / recentTests.length;
    const earlierAvg = earlierTests.reduce((sum, test) => sum + test.wpm, 0) / earlierTests.length;
    const improvementPercent = processedData.length >= 10 ? ((recentAvg - earlierAvg) / earlierAvg * 100) : 0;

    return { 
      chartData: processedData, 
      averageWpm: Math.round(avgWpm * 10) / 10, // Round to 1 decimal
      bestTestIndex: bestIndex,
      improvement: Math.round(improvementPercent * 10) / 10,
      isMobile: isMobileView
    };
  }, [data]);

  if (!chartData.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Test Progress</CardTitle>
          <CardDescription>Track your typing speed improvement over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="mx-auto w-fit">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full border border-primary/20">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-muted-foreground">No tests taken yet</p>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">Start typing to see your WPM progression and track your improvement over time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }


  // Wrap in try-catch to prevent chart errors from crashing React
  const renderChart = () => {
    try {
      // Check if container has valid dimensions
      if (typeof window === 'undefined') {
        return (
          <div className="h-[250px] w-full flex items-center justify-center">
            <p>Loading chart...</p>
          </div>
        );
      }
      
      // FORCE explicit dimensions to prevent 0 width/height errors
      // Using BarChart directly to avoid ResponsiveContainer issues
      return (
        <div 
          ref={chartRef}
          className="h-[250px] sm:h-[300px] w-full min-h-[250px] min-w-[200px] flex justify-center relative"
          style={{ 
            width: '100%', 
            height: '250px', 
            minWidth: '200px', 
            minHeight: '250px',
            // Override any chart container styles that might add borders
            '--recharts-bar-stroke': 'none',
            '--recharts-bar-stroke-width': '0'
          } as React.CSSProperties}
          onMouseMove={(e) => {
            if (chartRef.current && hoveredIndex !== null) {
              const rect = chartRef.current.getBoundingClientRect();
              setMousePosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              });
            }
          }}
          onMouseLeave={() => {
            setHoveredIndex(null);
            setMousePosition({ x: 0, y: 0 });
          }}
        >
          <BarChart
            width={450}
            height={250}
            data={chartData}
            margin={{
              top: 15,
              right: 15,
              bottom: 20,
              left: 15,
            }}
            style={{
              // Force remove any potential borders
              '--recharts-bar-stroke': 'none',
              '--recharts-bar-stroke-width': '0'
            } as React.CSSProperties}
          >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
                vertical={false}
              />
              {memoizedXAxis}
              {memoizedYAxis}
              <Bar 
                dataKey="wpm" 
                radius={isMobile ? [4, 4, 0, 0] : [8, 8, 0, 0]}
                fill="rgb(34, 197, 94)"
                maxBarSize={isMobile ? 12 : 32}
                stroke="none"
                strokeWidth={0}
                style={{
                  cursor: 'default'
                }}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="rgb(34, 197, 94)"
                    stroke="none"
                    strokeWidth={0}
                    onMouseEnter={() => setHoveredIndex(index)}
                    style={{
                      cursor: 'default'
                    }}
                    className="chart-bar-cell"
                  />
                ))}
              </Bar>
              {/* Average Reference Line - placed after Bar so it appears on top */}
              <ReferenceLine 
                y={averageWpm} 
                stroke="rgb(239, 68, 68)"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={(props: any) => {
                  const { viewBox } = props;
                  const { x, y, width } = viewBox;
                  return (
                    <g>
                      <rect
                        x={x + width - 75}
                        y={y - 14}
                        width="70"
                        height="24"
                        fill="white"
                        stroke="rgb(239, 68, 68)"
                        strokeWidth="1"
                        rx="4"
                        ry="4"
                      />
                      <text
                        x={x + width - 40}
                        y={y - 1}
                        textAnchor="middle"
                        fill="rgb(239, 68, 68)"
                        fontSize="12"
                        fontWeight="500"
                        className="reference-line-text"
                      >
                        Avg: {averageWpm}
                      </text>
                    </g>
                  );
                }}
              />
            </BarChart>
          
          {/* Dynamic cursor-following tooltip - outside chart for proper layering */}
          {hoveredIndex !== null && mousePosition.x > 0 && (
            <div 
              className="bg-background border border-border rounded-lg p-3 shadow-lg transition-all duration-100 ease-out"
              style={{
                position: 'absolute',
                left: mousePosition.x > 225 ? mousePosition.x - 200 : mousePosition.x + 20,
                top: mousePosition.y > 125 ? mousePosition.y - 120 : mousePosition.y + 20,
                fontSize: '14px',
                zIndex: 1000,
                pointerEvents: 'none',
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
                minWidth: '180px',
                maxWidth: '200px'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Test #{chartData[hoveredIndex].testNumber}</span>
                {hoveredIndex === bestTestIndex && (
                  <div className="flex items-center gap-1" style={{ color: "rgb(251, 191, 36)" }}>
                    <Trophy className="h-3 w-3" />
                    <span className="text-xs font-semibold">Best</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>WPM:</span>
                  <span className="font-bold" style={{ color: "rgb(34, 197, 94)" }}>
                    {chartData[hoveredIndex].wpm}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span>{chartData[hoveredIndex].accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty:</span>
                  <span className="capitalize">{chartData[hoveredIndex].difficulty}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Chart render error:', error);
      return (
        <div className="h-[250px] sm:h-[300px] w-full flex items-center justify-center bg-muted/10 rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">Chart temporarily unavailable</p>
            <p className="text-xs text-muted-foreground/60">Data is being processed...</p>
          </div>
        </div>
      );
    }
  };

  return (
    <Card className={`${className} overflow-hidden`}>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Completely eliminate ALL possible borders and strokes on bars */
          .recharts-bar-rectangle,
          .recharts-rectangle,
          .recharts-bar,
          .recharts-active-bar,
          .recharts-tooltip-cursor,
          .recharts-layer rect,
          svg rect,
          g rect {
            stroke: none !important;
            stroke-width: 0 !important;
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Target all hover and active states */
          .recharts-bar-rectangle:hover,
          .recharts-rectangle:hover,
          .recharts-bar:hover,
          .recharts-active-bar:hover,
          .recharts-tooltip-cursor:hover,
          .recharts-layer rect:hover,
          svg rect:hover,
          g rect:hover,
          .recharts-bar-rectangle[stroke],
          .recharts-rectangle[stroke],
          rect[stroke] {
            stroke: none !important;
            stroke-width: 0 !important;
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Target only bar-related elements, NOT icons */
          .recharts-bar *,
          .recharts-layer rect,
          svg > g > g > rect {
            stroke: none !important;
            stroke-width: 0 !important;
          }
          
          /* But preserve grid lines and axes */
          .recharts-cartesian-grid line,
          .recharts-cartesian-axis line,
          .recharts-reference-line line {
            stroke: hsl(var(--border)) !important;
            stroke-width: 1 !important;
          }
          
          .recharts-reference-line line {
            stroke: rgb(239, 68, 68) !important;
            stroke-width: 2 !important;
          }
          
          /* ULTRA-STABLE axis text colors - completely immune to React re-renders */
          .recharts-cartesian-axis-tick text,
          .recharts-text text,
          .recharts-layer text {
            fill: #6b7280 !important;
            transition: none !important;
            animation: none !important;
          }
          
          /* Dark mode axis text - fixed colors (excluding reference line text) */
          .dark .recharts-cartesian-axis-tick text,
          .dark .recharts-text text:not(.reference-line-text),
          .dark .recharts-layer text:not(.reference-line-text) {
            fill: white !important;
            transition: none !important;
            animation: none !important;
          }
          
          /* Force override any dynamic fills on text elements only (excluding reference line text) */
          text[fill]:not(.reference-line-text) {
            fill: #6b7280 !important;
          }
          
          .dark text[fill]:not(.reference-line-text) {
            fill: white !important;
          }
          
          /* Prevent any hover effects on text (excluding reference line text) */
          text:hover:not(.reference-line-text) {
            fill: #6b7280 !important;
          }
          
          .dark text:hover:not(.reference-line-text) {
            fill: white !important;
          }
          
          /* Disable all pointer events on text to prevent interference */
          .recharts-cartesian-axis-tick text {
            pointer-events: none !important;
          }
          
          /* CSS-only hover effect for bars - NO React re-renders */
          .chart-bar-cell:hover {
            fill: rgb(21, 128, 61) !important;
          }
          
          /* Reference line text - FORCE black in dark mode with highest specificity */
          .dark .reference-line-text,
          .dark text.reference-line-text,
          html.dark .reference-line-text,
          html.dark text.reference-line-text {
            fill: black !important;
            color: black !important;
          }
        `
      }} />
      <CardHeader className="pb-3">
        <CardDescription className="text-sm">
          {chartData.length > 1 
            ? `Your last ${chartData.length} tests${
                typeof window !== 'undefined' && window.innerWidth <= 480 && data.length > 10 
                  ? ` (recent ${chartData.length} shown)`
                  : ''
              }`
            : "Track your typing speed improvement over time"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {renderChart()}
      </CardContent>
      <CardFooter className="pt-3">
        <div className="w-full">
          {improvement !== 0 && chartData.length >= 10 && (
            <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm font-medium">
              {improvement > 0 ? (
                <>
                  <span className="text-green-600">Improving by {Math.abs(improvement)}%</span>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                </>
              ) : (
                <>
                  <span className="text-red-500">Down by {Math.abs(improvement)}% this period</span>
                </>
              )}
            </div>
          )}
          {chartData.length > 0 && (
            <div className="flex items-center justify-center gap-3 sm:gap-6 p-2 sm:p-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border">
              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                <span className="text-xs text-muted-foreground font-medium">Average</span>
                <span className="text-sm sm:text-lg font-bold" style={{ color: "rgb(34, 197, 94)" }}>
                  {averageWpm} WPM
                </span>
              </div>
              <div className="w-px h-6 sm:h-8 bg-border"></div>
              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                <span className="text-xs text-muted-foreground font-medium">Best</span>
                <span className="text-sm sm:text-lg font-bold text-amber-600">
                  {Math.max(...chartData.map(d => d.wpm))} WPM
                </span>
              </div>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProgressChart;