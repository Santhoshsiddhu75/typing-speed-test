import React from 'react';
import { TestResult } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestsTableProps {
  data: TestResult[];
  className?: string;
}

const TestsTable: React.FC<TestsTableProps> = ({ data, className }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 dark:from-green-900 dark:to-green-800 dark:text-green-200 dark:border-green-700 shadow-sm';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 dark:from-yellow-900 dark:to-yellow-800 dark:text-yellow-200 dark:border-yellow-700 shadow-sm';
      case 'hard':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 dark:from-red-900 dark:to-red-800 dark:text-red-200 dark:border-red-700 shadow-sm';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200 dark:border-gray-700 shadow-sm';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!data.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="relative mx-auto w-fit mb-6">
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full">
            <Target className="w-16 h-16 text-primary/60" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full animate-bounce">
            <span className="text-xs">📊</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium">No test results found</p>
          <p className="text-sm max-w-md mx-auto">Complete some typing tests to see your detailed history and performance metrics here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-sm rounded-xl border border-border/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                <th className="text-left p-6 font-semibold text-foreground">Date</th>
                <th className="text-left p-6 font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                      <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    WPM
                  </div>
                </th>
                <th className="text-left p-6 font-semibold text-foreground">CPM</th>
                <th className="text-left p-6 font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                      <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    Accuracy
                  </div>
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Time
                  </div>
                </th>
                <th className="text-left p-6 font-semibold text-foreground">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {data.map((test, index) => (
                <tr
                  key={test.id || index}
                  className="border-b border-border/30 last:border-b-0 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300 group"
                >
                  <td className="p-6">
                    <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {formatDate(test.created_at)}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">{test.wpm}</div>
                      <span className="text-xs text-muted-foreground">wpm</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-foreground">{test.cpm}</div>
                      <span className="text-xs text-muted-foreground">cpm</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className={cn("font-semibold text-lg", getAccuracyColor(test.accuracy))}>
                      {test.accuracy.toFixed(1)}%
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-foreground">{test.totalTime}</div>
                      <span className="text-xs text-muted-foreground">sec</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <Badge className={cn(getDifficultyColor(test.difficulty), "px-3 py-1 text-xs font-semibold")} variant="secondary">
                      {test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((test, index) => (
          <div
            key={test.id || index}
            className="p-5 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {formatDate(test.created_at)}
                </div>
                <Badge className={cn(getDifficultyColor(test.difficulty), "px-3 py-1.5 text-xs font-semibold")} variant="secondary">
                  {test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}
                </Badge>
              </div>
              <div className="w-2 h-2 bg-primary/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">WPM</div>
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{test.wpm}</div>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Accuracy</div>
                </div>
                <div className={cn("text-2xl font-bold", getAccuracyColor(test.accuracy))}>
                  {test.accuracy.toFixed(1)}%
                </div>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">CPM</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{test.cpm}</div>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Time</div>
                </div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{test.totalTime}s</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestsTable;