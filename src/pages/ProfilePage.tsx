import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { testResultsApi, userApi } from '@/lib/api';
import { UserStats, TestResult, DifficultyLevel, TimerOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CleanStatsCard from '@/components/CleanStatsCard';
import ProgressChart from '@/components/ProgressChart';
import Navbar from '@/components/Navbar';
import InitialsAvatar from '@/components/InitialsAvatar';
import AvatarUpload from '@/components/AvatarUpload';
import AdBanner from '@/components/AdBanner';
import Footer from '@/components/Footer';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Settings, 
  Download, 
  Trash2, 
  LogOut, 
  Eye, 
  EyeOff, 
  Trophy,
  Shield,
  Clock,
  Zap,
  Camera,
  Info,
  Check,
  X
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  // Theme detection hook (same as CleanStatsCard)
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  
  // Data states
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | 'all'>('all');
  const [progressDifficultyFilter, setProgressDifficultyFilter] = useState<DifficultyLevel | 'all'>('all');
  const [refreshKey] = useState(0);
  
  // Edit states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarRefreshing, setAvatarRefreshing] = useState(false);
  const [deleteHistoryDialogOpen, setDeleteHistoryDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Password strength calculation (same as registration)
  const passwordStrength = useMemo(() => {
    const password = passwordFormData.newPassword;
    const criteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    };

    const score = Object.values(criteria).filter(Boolean).length;
    
    let label = 'Weak';
    let color = 'bg-red-500';
    
    if (score >= 4) {
      label = 'Strong';
      color = 'bg-green-500';
    } else if (score >= 3) {
      label = 'Good';
      color = 'bg-blue-500';
    } else if (score >= 2) {
      label = 'Fair';
      color = 'bg-yellow-500';
    }

    return { score, label, color, criteria };
  }, [passwordFormData.newPassword]);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  // Close account info tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showAccountInfo) {
        setShowAccountInfo(false);
      }
    };

    if (showAccountInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAccountInfo]);

  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Handle nested user object structure
        const actualUser = (user as any)?.user || user;
        const username = actualUser?.username;
        
        if (!username) {
          setError('Unable to determine username');
          return;
        }

        const [statsResponse, testsResponse] = await Promise.all([
          testResultsApi.getUserStats(username).catch(() => null),
          testResultsApi.getTestResults({
            username: username,
            limit: 10
          }).catch(() => ({ data: [] }))
        ]);

        setUserStats(statsResponse);
        setRecentTests(testsResponse.data || []);
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAuthenticated, refreshKey]);

  // DISABLED: Window focus event listener (suspected cause of file selection reload)
  // useEffect(() => {
  //   let lastFocusTime = Date.now();
    
  //   const handleFocus = () => {
  //     const now = Date.now();
  //     const timeSinceLastFocus = now - lastFocusTime;
      
  //     // Only refresh if window was out of focus for more than 5 seconds
  //     // This prevents file dialog focus events from triggering refresh
  //     if (timeSinceLastFocus > 5000) {
  //       console.log('🔄 Window focus - refreshing data (was away for', timeSinceLastFocus, 'ms)');
  //       setRefreshKey(prev => prev + 1);
  //     } else {
  //       console.log('🔄 Window focus - ignoring (only away for', timeSinceLastFocus, 'ms)');
  //     }
      
  //     lastFocusTime = now;
  //   };

  //   const handleBlur = () => {
  //     lastFocusTime = Date.now();
  //   };

  //   window.addEventListener('focus', handleFocus);
  //   window.addEventListener('blur', handleBlur);
    
  //   return () => {
  //     window.removeEventListener('focus', handleFocus);
  //     window.removeEventListener('blur', handleBlur);
  //   };
  // }, []);



  const validatePasswordForm = (): boolean => {
    const newErrors: typeof passwordErrors = {};

    // Current password validation
    if (!passwordFormData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    // New password validation (same as registration)
    if (!passwordFormData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordFormData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 3) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and number';
    } else if (passwordFormData.currentPassword === passwordFormData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    // Confirm password validation
    if (!passwordFormData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (!validatePasswordForm()) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      
      // Handle nested user object structure
      const actualUser = (user as any)?.user || user;
      
      await userApi.changePassword(actualUser.id, {
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword
      });
      
      setPasswordDialogOpen(false);
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
      
    } catch (error) {
      console.error('Failed to change password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordInputChange = (field: keyof typeof passwordFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPasswordFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // Clear errors when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Clear confirm password error if new password changes
    if (field === 'newPassword' && passwordErrors.confirmPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        confirmPassword: undefined
      }));
    }
  };

  const handleDeleteAllHistory = async () => {
    if (!user || confirmationText !== 'DELETE') return;

    try {
      setActionLoading(true);
      
      // Handle nested user object structure
      const actualUser = (user as any)?.user || user;
      const username = actualUser?.username;
      
      if (!username) {
        setError('Unable to determine username');
        return;
      }
      
      await userApi.deleteAllTestHistory(username);
      
      setRecentTests([]);
      setUserStats(null);
      setDeleteHistoryDialogOpen(false);
      setConfirmationText('');
      
      // Show success message
      setError(null);
      
    } catch (error) {
      console.error('Failed to delete test history:', error);
      setError('Failed to delete test history');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Start state management
  const [quickStartTimer, setQuickStartTimer] = useState<TimerOption | null>(null);
  const [quickStartDifficulty, setQuickStartDifficulty] = useState<DifficultyLevel | null>(null);
  const [shakeAnimation, setShakeAnimation] = useState(false);

  const handleQuickStart = () => {
    if (!quickStartTimer || !quickStartDifficulty) {
      // Show shake animation for missing selections
      setShakeAnimation(true);
      setTimeout(() => setShakeAnimation(false), 600);
      return;
    }

    // Navigate directly to typing test with selected parameters
    navigate(`/test?timer=${quickStartTimer}&difficulty=${quickStartDifficulty}`);
  };

  // Filter tests by difficulty
  const filteredTests = difficultyFilter === 'all' 
    ? recentTests 
    : recentTests.filter(test => test.difficulty === difficultyFilter);

  // Filter progress chart data by difficulty
  const filteredProgressTests = progressDifficultyFilter === 'all' 
    ? recentTests 
    : recentTests.filter(test => test.difficulty === progressDifficultyFilter);

  const handleExportCSV = () => {
    if (!user) return;
    
    // Handle nested user object structure
    const actualUser = (user as any)?.user || user;
    const username = actualUser?.username;
    
    if (!username) return;
    
    const exportUrl = userApi.exportTestHistory(username);
    window.open(exportUrl, '_blank');
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/');
  };

  // Clear avatar dialog state when closed
  const handleAvatarDialogClose = () => {
    setAvatarDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle nested user object structure for derived values
  const actualUser = (user as any)?.user || user;
  const isGoogleUser = !!actualUser?.google_id;
  const hasTests = recentTests.length > 0;

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden flex flex-col"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 40px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 60px)'
      }}
    >
      {/* Large Background Circle centered */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div 
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 'min(180vh, 90vw)',
            height: 'min(180vh, 90vw)',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            boxShadow: '0 0 80px rgba(34, 197, 94, 0.3), 0 0 160px rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.1)'
          }}
        />
      </div>
      
      {/* Bottom Right Corner Circle */}
      <div className="fixed z-0" style={{ bottom: '-65vh', right: '-55vh' }}>
        <div 
          className="rounded-full pointer-events-none"
          style={{
            width: '100vh',
            height: '100vh',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            boxShadow: '0 0 60px rgba(34, 197, 94, 0.3), 0 0 120px rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.1)'
          }}
        />
      </div>

      <Navbar backUrl="/" className="sticky" />

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 relative z-10">
        {error && (
          <Card 
            className="mb-6 border-destructive/50 bg-destructive/5"
            role="alert"
            aria-live="polite"
          >
            <CardContent className="py-4">
              <p className="text-destructive text-sm" id="error-message">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Mobile Layout - Narrow Screens (xl and below) */}
        <div className="block xl:hidden space-y-6">
          {/* 1. User Profile Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              {/* Clean Profile Header */}
              <div className="text-center space-y-4 mb-6">
                <div className="relative mx-auto w-16 h-16">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-background shadow-md">
                    {actualUser?.profile_picture ? (
                      <img
                        src={actualUser.profile_picture}
                        alt={actualUser.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <InitialsAvatar 
                        username={actualUser?.username || 'User'} 
                        size="lg"
                        className="w-full h-full rounded-none border-0"
                      />
                    )}
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-center text-green-600 dark:text-white font-mono">
                    <span 
                      style={{
                        textShadow: isDark 
                          ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                          : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {actualUser?.username}
                    </span>
                  </h3>
                  <div className="flex justify-center">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        {isGoogleUser ? 'Google Account' : 'TapTest Account'}
                      </Badge>
                      {!isGoogleUser && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-muted/50"
                            onClick={() => setShowAccountInfo(!showAccountInfo)}
                            aria-label="Account type information"
                          >
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          {showAccountInfo && (
                            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs p-2 rounded-md shadow-lg border border-border z-10 w-48">
                              <div className="text-center">
                                <p className="text-muted-foreground">Signed in with username, not via Google</p>
                              </div>
                              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover border-l border-t border-border rotate-45"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Organized Layout */}
              <div className="space-y-3">
                {/* Primary Actions - Single Row */}
                <div className={`grid gap-2 ${!isGoogleUser ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <Button variant="outline" size="default" className="flex items-center justify-center gap-2 min-h-[44px]" onClick={() => setAvatarDialogOpen(true)}>
                    <Camera className="h-4 w-4" />
                    <span className="text-xs">Photo</span>
                  </Button>
                  {!isGoogleUser && (
                    <Button variant="outline" size="default" className="flex items-center justify-center gap-2 min-h-[44px]" onClick={() => setPasswordDialogOpen(true)}>
                      <Settings className="h-4 w-4" />
                        <span className="text-[10px] sm:text-xs">Password</span>
                    </Button>
                  )}
                </div>

                {/* Sign Out - Distinct styling */}
                <Button variant="ghost" size="default" className="w-full min-h-[44px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Stats Cards */}
          <section className="grid grid-cols-2 gap-3" aria-labelledby="mobile-stats-heading">
            <h2 id="mobile-stats-heading" className="sr-only">Performance Statistics</h2>
            
            <CleanStatsCard
              icon={Trophy}
              title="Best WPM"
              value={userStats?.best_wpm || 0}
              subtitle="Personal record"
              trend="up"
              trendValue="+5%"
            />
            
            <CleanStatsCard
              icon={TrendingUp}
              title="Average WPM"
              value={Math.round(userStats?.average_wpm || 0)}
              subtitle="Across all tests"
              trend="up"
              trendValue="+2%"
            />
            
            <CleanStatsCard
              icon={Target}
              title="Total Tests"
              value={userStats?.total_tests || 0}
              subtitle="Completed attempts"
              trend="neutral"
            />
            
            <CleanStatsCard
              icon={Calendar}
              title="Last Test"
              value={hasTests && recentTests[0]?.created_at 
                ? new Date(recentTests[0].created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  })
                : 'Never'
              }
              subtitle="Most recent"
            />
          </section>

          {/* Advertisement Banner - Mobile */}
          <div className="py-6">
            <AdBanner 
              size="horizontal" 
              slot="profile-mobile-banner"
              className="mx-auto"
            />
          </div>

          {/* 3. Charts and Data Tabs (exact copy from desktop) */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" aria-label="Profile data views">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto" role="tablist">
              <TabsTrigger value="overview" role="tab" aria-controls="overview-panel" className="flex items-center justify-center gap-1 sm:gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Progress</span>
              </TabsTrigger>
              <TabsTrigger value="history" role="tab" aria-controls="history-panel" className="flex items-center justify-center gap-1 sm:gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Test History</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" role="tab" aria-controls="analytics-panel" className="flex items-center justify-center gap-1 sm:gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6" id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center space-x-1 text-sm sm:text-lg">
                        <TrendingUp className="h-3 w-3 sm:h-5 sm:w-5" aria-hidden="true" />
                        <span className="truncate text-green-600 dark:text-white font-mono">
                          <span 
                            style={{
                              textShadow: isDark 
                                ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                                : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                              letterSpacing: '0.02em'
                            }}
                          >
                            Progression
                          </span>
                        </span>
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center flex-shrink-0">
                      <Select 
                        value={progressDifficultyFilter} 
                        onValueChange={(value: 'all' | DifficultyLevel) => setProgressDifficultyFilter(value)}
                        aria-label="Filter progress chart by difficulty"
                      >
                        <SelectTrigger className="w-20 sm:w-32 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div role="img" aria-label="Progress chart showing typing performance over time" className="w-full">
                    <ProgressChart data={filteredProgressTests} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6" id="history-panel" role="tabpanel" aria-labelledby="history-tab">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-1 sm:space-x-2 text-sm sm:text-lg">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                        <span className="text-green-600 dark:text-white font-mono">
                          <span 
                            style={{
                              textShadow: isDark 
                                ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                                : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                              letterSpacing: '0.02em'
                            }}
                          >
                            Recent
                          </span>
                        </span>
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center">
                      <Select 
                        value={difficultyFilter} 
                        onValueChange={(value: 'all' | DifficultyLevel) => setDifficultyFilter(value)}
                        aria-label="Filter tests by difficulty"
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTests.length > 0 ? (
                    <div className="space-y-3">
                      {filteredTests.slice(0, 10).map((result, index) => (
                        <div key={result.id || index} className="p-3 sm:p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                          {/* Mobile Layout - Stacked */}
                          <div className="flex flex-col space-y-2 sm:hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div className={`
                                  text-sm px-2 py-1 font-medium flex-shrink-0 rounded-md text-white shadow-sm
                                  ${result.difficulty === 'easy' ? 'bg-green-500' : 
                                    result.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}
                                `}>
                                  {result.difficulty === 'easy' ? 'E' : result.difficulty === 'medium' ? 'M' : 'H'}
                                </div>
                                <span className="font-medium text-sm truncate">{result.wpm} WPM</span>
                              </div>
                              <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                                <div>{result.created_at ? new Date(result.created_at).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short', 
                                  day: 'numeric',
                                  timeZone: 'Asia/Kolkata'
                                }) : 'Unknown date'}</div>
                                <div className="text-xs">{result.created_at ? (() => {
                                  const date = new Date(result.created_at);
                                  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                                  return istDate.toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                })() : 'Unknown time'}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Desktop Layout - Horizontal */}
                          <div className="hidden sm:flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`
                                text-sm px-2 py-1 font-medium flex-shrink-0 rounded-md text-white shadow-sm
                                ${result.difficulty === 'easy' ? 'bg-green-500' : 
                                  result.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}
                              `}>
                                {result.difficulty === 'easy' ? 'E' : result.difficulty === 'medium' ? 'M' : 'H'}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{result.wpm} WPM</span>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground text-right">
                              <div>{result.created_at ? new Date(result.created_at).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short', 
                                day: 'numeric',
                                timeZone: 'Asia/Kolkata'
                              }) : 'Unknown date'}</div>
                              <div className="text-xs">{result.created_at ? (() => {
                                const date = new Date(result.created_at);
                                const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                                return istDate.toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              })() : 'Unknown time'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Pagination placeholder */}
                      {filteredTests.length > 10 && (
                        <div className="text-center py-4">
                          <Button variant="outline" size="sm">
                            Load More Results
                          </Button>
                        </div>
                      )}
                      
                      {/* Color Legend */}
                      <div className="flex items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded text-white flex items-center justify-center text-[8px] sm:text-[10px] font-medium">E</div>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Easy</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded text-white flex items-center justify-center text-[8px] sm:text-[10px] font-medium">M</div>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Medium</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded text-white flex items-center justify-center text-[8px] sm:text-[10px] font-medium">H</div>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Hard</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 mb-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center border border-primary/20">
                        <Target className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        {difficultyFilter === 'all' ? 'No tests taken yet' : `No ${difficultyFilter} tests found`}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {difficultyFilter === 'all' 
                          ? 'Start typing to see your results here!' 
                          : 'Try a different difficulty filter or take more tests'
                        }
                      </p>
                      <Button onClick={() => navigate('/')}>
                        Take Your First Test
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6" id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-green-600 dark:text-white font-mono">
                      <span 
                        style={{
                          textShadow: isDark 
                            ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                            : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                          letterSpacing: '0.02em'
                        }}
                      >
                        Performance Breakdown
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Best Accuracy</span>
                        <span className="text-sm font-bold">{userStats?.best_accuracy || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Average Accuracy</span>
                        <span className="text-sm font-bold">{userStats?.average_accuracy?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Improvement</span>
                        <span className="text-sm font-bold text-green-600">+{userStats?.improvement_trend?.wpm_change || 0} WPM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-green-600 dark:text-white font-mono">
                      <span 
                        style={{
                          textShadow: isDark 
                            ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                            : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                          letterSpacing: '0.02em'
                        }}
                      >
                        Difficulty Distribution
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Easy</span>
                        <span className="text-sm font-bold">{userStats?.difficulty_breakdown?.easy || 0} tests</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Medium</span>
                        <span className="text-sm font-bold">{userStats?.difficulty_breakdown?.medium || 0} tests</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Hard</span>
                        <span className="text-sm font-bold">{userStats?.difficulty_breakdown?.hard || 0} tests</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* 4. Quick Start Card */}
          <Card className={`border-0 shadow-lg transition-all duration-200 ${shakeAnimation ? 'animate-shake' : ''}`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-green-600 dark:text-white font-mono">
                <span 
                  style={{
                    textShadow: isDark 
                      ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                      : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                    letterSpacing: '0.02em'
                  }}
                >
                  Quick Start
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Select timer and difficulty to start a test</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timer Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Timer</label>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 5] as TimerOption[]).map((duration) => (
                    <Button
                      key={duration}
                      variant={quickStartTimer === duration ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuickStartTimer(duration)}
                      className="text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {duration}m
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((difficulty) => (
                    <Button
                      key={difficulty}
                      variant={quickStartDifficulty === difficulty ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuickStartDifficulty(difficulty)}
                      className="text-xs capitalize"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {difficulty}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Start Test Button */}
              <div className="pt-2 border-t border-border/30">
                <Button
                  onClick={handleQuickStart}
                  className={`w-full text-sm font-medium transition-all duration-200 ${
                    quickStartTimer && quickStartDifficulty
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg'
                      : 'bg-muted-foreground/20 text-muted-foreground cursor-not-allowed hover:bg-muted-foreground/20'
                  }`}
                  disabled={!quickStartTimer || !quickStartDifficulty}
                >
                  Start Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 5. Export and Delete Buttons */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="default" 
                  className="w-full justify-center min-h-[44px]" 
                  onClick={handleExportCSV}
                  disabled={!hasTests}
                >
                  <Download className="h-4 w-4 mr-1" />
                  <span className="text-[10px] sm:text-xs">Export CSV</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="default" 
                  className="w-full justify-center min-h-[44px] text-destructive hover:text-destructive" 
                  onClick={() => setDeleteHistoryDialogOpen(true)}
                  disabled={!hasTests}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span className="text-[10px] sm:text-xs">Delete All</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Ad - Mobile Rectangle */}
          <div className="pt-6 flex justify-center">
            <AdBanner 
              size="rectangle" 
              slot="profile-mobile-bottom"
              className="mx-auto"
            />
          </div>
        </div>

        {/* Desktop Layout - Wide Screens (xl and up) */}
        <div className="hidden xl:grid xl:grid-cols-12 gap-8">
          {/* Left Column - Account Card (320px on desktop) */}
          <aside className="xl:col-span-3 space-y-6" role="complementary" aria-label="Account management">
            {/* Account Card */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                {/* Clean Profile Header */}
                <div className="text-center space-y-4 mb-6">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-background shadow-md">
                      {actualUser?.profile_picture ? (
                        <img
                          src={actualUser.profile_picture}
                          alt={actualUser.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar 
                          username={actualUser?.username || 'User'} 
                          size="lg"
                          className="w-full h-full rounded-none border-0"
                        />
                      )}
                    </div>
                    {avatarRefreshing && (
                      <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-center text-green-600 dark:text-white font-mono">
                      <span 
                        style={{
                          textShadow: isDark 
                            ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                            : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                          letterSpacing: '0.02em'
                        }}
                      >
                        {actualUser?.username}
                      </span>
                    </h3>
                    <div className="flex justify-center">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {isGoogleUser ? 'Google Account' : 'TapTest Account'}
                        </Badge>
                        {!isGoogleUser && (
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-muted/50"
                              onClick={() => setShowAccountInfo(!showAccountInfo)}
                              aria-label="Account type information"
                            >
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            {showAccountInfo && (
                              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs p-2 rounded-md shadow-lg border border-border z-10 w-48">
                                <div className="text-center">
                                  {/* <p className="font-medium mb-1">TapTest Account</p> */}
                                  <p className="text-muted-foreground">Signed in with username, not via Google</p>
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover border-l border-t border-border rotate-45"></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Organized Layout */}
                <div className="space-y-3">
                  {/* Primary Actions - Single Row */}
                  <div className={`grid gap-2 ${!isGoogleUser ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <Button variant="outline" size="default" className="flex items-center justify-center gap-2 min-h-[44px]" onClick={() => setAvatarDialogOpen(true)}>
                      <Camera className="h-4 w-4" />
                      <span className="text-xs">Photo</span>
                    </Button>
                    {!isGoogleUser && (
                      <Button variant="outline" size="default" className="flex items-center justify-center gap-2 min-h-[44px]" onClick={() => setPasswordDialogOpen(true)}>
                        <Settings className="h-4 w-4" />
                        <span className="text-xs">Password</span>
                      </Button>
                    )}
                  </div>

                  {/* Sign Out - Distinct styling */}
                  <Button variant="ghost" size="default" className="w-full min-h-[44px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Start Card */}
            <Card className={`border-0 shadow-lg transition-all duration-200 ${shakeAnimation ? 'animate-shake' : ''}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-green-600 dark:text-white font-mono">
                <span 
                  style={{
                    textShadow: isDark 
                      ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                      : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                    letterSpacing: '0.02em'
                  }}
                >
                  Quick Start
                </span>
              </CardTitle>
                <p className="text-xs text-muted-foreground">Select timer and difficulty to start a test</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timer Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Timer</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([1, 2, 5] as TimerOption[]).map((duration) => (
                      <Button
                        key={duration}
                        variant={quickStartTimer === duration ? "default" : "outline"}
                        size="sm"
                        onClick={() => setQuickStartTimer(duration)}
                        className="text-xs"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {duration}m
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Difficulty Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((difficulty) => (
                      <Button
                        key={difficulty}
                        variant={quickStartDifficulty === difficulty ? "default" : "outline"}
                        size="sm"
                        onClick={() => setQuickStartDifficulty(difficulty)}
                        className="text-xs capitalize"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {difficulty}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Start Test Button */}
                <div className="pt-2 border-t border-border/30">
                  <Button
                    onClick={handleQuickStart}
                    className={`w-full text-sm font-medium transition-all duration-200 ${
                      quickStartTimer && quickStartDifficulty
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg'
                        : 'bg-muted-foreground/20 text-muted-foreground cursor-not-allowed hover:bg-muted-foreground/20'
                    }`}
                    disabled={!quickStartTimer || !quickStartDifficulty}
                  >
                    Start Test
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="default" 
                    className="w-full justify-center min-h-[44px]" 
                    onClick={handleExportCSV}
                    disabled={!hasTests}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="text-[10px] sm:text-xs">Export CSV</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="default" 
                    className="w-full justify-center min-h-[44px] text-destructive hover:text-destructive" 
                    onClick={() => setDeleteHistoryDialogOpen(true)}
                    disabled={!hasTests}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="text-[10px] sm:text-xs">Delete All</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Ad - Desktop Left Sidebar Rectangle */}
            <div className="pt-6 flex justify-center">
              <AdBanner 
                size="rectangle" 
                slot="profile-desktop-sidebar-bottom"
                className="mx-auto"
              />
            </div>
          </aside>

          {/* Right Column - Stats & History (fluid) */}
          <main className="xl:col-span-9 space-y-6" role="main" aria-label="Profile statistics and history">
            {/* Summary Stats Cards */}
            <section className="grid grid-cols-4 gap-6" aria-labelledby="stats-heading">
              <h2 id="stats-heading" className="sr-only">Performance Statistics</h2>
              
              <CleanStatsCard
                icon={Trophy}
                title="Best WPM"
                value={userStats?.best_wpm || 0}
                subtitle="Personal record"
                trend="up"
                trendValue="+5%"
              />
              
              <CleanStatsCard
                icon={TrendingUp}
                title="Average WPM"
                value={Math.round(userStats?.average_wpm || 0)}
                subtitle="Across all tests"
                trend="up"
                trendValue="+2%"
              />
              
              <CleanStatsCard
                icon={Target}
                title="Total Tests"
                value={userStats?.total_tests || 0}
                subtitle="Completed attempts"
                trend="neutral"
              />
              
              <CleanStatsCard
                icon={Calendar}
                title="Last Test"
                value={hasTests && recentTests[0]?.created_at 
                  ? new Date(recentTests[0].created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric'
                    })
                  : 'Never'
                }
                subtitle="Most recent"
              />
            </section>

            {/* Advertisement Banner - Desktop */}
            <div className="py-6">
              <AdBanner 
                size="horizontal" 
                slot="profile-desktop-banner"
                className="mx-auto"
              />
            </div>

            {/* Charts and Data Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" aria-label="Profile data views">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto" role="tablist">
                <TabsTrigger value="overview" role="tab" aria-controls="overview-panel" className="flex items-center justify-center gap-1 sm:gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Progress</span>
                </TabsTrigger>
                <TabsTrigger value="history" role="tab" aria-controls="history-panel" className="flex items-center justify-center gap-1 sm:gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Test History</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" role="tab" aria-controls="analytics-panel" className="flex items-center justify-center gap-1 sm:gap-2">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6" id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center space-x-1 text-sm sm:text-lg">
                          <TrendingUp className="h-3 w-3 sm:h-5 sm:w-5" aria-hidden="true" />
                          <span className="truncate text-green-600 dark:text-white font-mono">
                          <span 
                            style={{
                              textShadow: isDark 
                                ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                                : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                              letterSpacing: '0.02em'
                            }}
                          >
                            Progression
                          </span>
                        </span>
                        </CardTitle>
                        {/* <CardDescription>
                          Track your typing speed and accuracy improvements
                        </CardDescription> */}
                      </div>
                      
                      {/* Difficulty Filter for Progress */}
                      <div className="flex items-center flex-shrink-0">
                        <Select 
                          value={progressDifficultyFilter} 
                          onValueChange={(value: 'all' | DifficultyLevel) => setProgressDifficultyFilter(value)}
                          aria-label="Filter progress chart by difficulty"
                        >
                          <SelectTrigger className="w-20 sm:w-32 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div role="img" aria-label="Progress chart showing typing performance over time" className="w-full">
                      <ProgressChart data={filteredProgressTests} className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6" id="history-panel" role="tabpanel" aria-labelledby="history-tab">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-1 sm:space-x-2 text-sm sm:text-lg">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                          <span className="text-green-600 dark:text-white font-mono">
                            <span 
                              style={{
                                textShadow: document.documentElement.classList.contains('dark') 
                                  ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                                  : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                                letterSpacing: '0.02em'
                              }}
                            >
                              Recent
                            </span>
                          </span>
                        </CardTitle>
                      </div>
                      
                      {/* Difficulty Filter */}
                      <div className="flex items-center">
                        <Select 
                          value={difficultyFilter} 
                          onValueChange={(value: 'all' | DifficultyLevel) => setDifficultyFilter(value)}
                          aria-label="Filter tests by difficulty"
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredTests.length > 0 ? (
                      <div className="space-y-3">
                        {filteredTests.slice(0, 10).map((result, index) => (
                          <div key={result.id || index} className="p-3 sm:p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                            {/* Mobile Layout - Stacked */}
                            <div className="flex flex-col space-y-2 sm:hidden">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <div className={`
                                    text-xs px-1.5 py-0.5 font-medium flex-shrink-0 rounded-md text-white shadow-sm
                                    ${result.difficulty === 'easy' ? 'bg-green-500' : 
                                      result.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}
                                  `}>
                                    {result.difficulty === 'easy' ? 'E' : result.difficulty === 'medium' ? 'M' : 'H'}
                                  </div>
                                  <span className="font-medium text-sm truncate">{result.wpm} WPM</span>
                                </div>
                                <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                                  <div>{result.created_at ? new Date(result.created_at).toLocaleDateString('en-IN', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    timeZone: 'Asia/Kolkata'
                                  }) : 'Unknown'}</div>
                                  <div className="text-xs">{result.created_at ? (() => {
                                    const date = new Date(result.created_at);
                                    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                                    return istDate.toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                  })() : 'Unknown time'}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Desktop Layout - Horizontal */}
                            <div className="hidden sm:flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`
                                  text-sm px-2 py-1 font-medium flex-shrink-0 rounded-md text-white shadow-sm
                                  ${result.difficulty === 'easy' ? 'bg-green-500' : 
                                    result.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}
                                `}>
                                  {result.difficulty === 'easy' ? 'E' : result.difficulty === 'medium' ? 'M' : 'H'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium">{result.wpm} WPM</span>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground text-right">
                                <div>{result.created_at ? new Date(result.created_at).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short', 
                                  day: 'numeric',
                                  timeZone: 'Asia/Kolkata'
                                }) : 'Unknown date'}</div>
                                <div className="text-xs">{result.created_at ? (() => {
                                  const date = new Date(result.created_at);
                                  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                                  return istDate.toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                })() : 'Unknown time'}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination placeholder */}
                        {filteredTests.length > 10 && (
                          <div className="text-center py-4">
                            <Button variant="outline" size="sm">
                              Load More Results
                            </Button>
                          </div>
                        )}
                        
                        {/* Color Legend */}
                        <div className="flex items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-border/30">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded text-white flex items-center justify-center text-[8px] sm:text-[10px] font-medium">E</div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Easy</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded text-white flex items-center justify-center text-[8px] sm:text-[10px] font-medium">M</div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Medium</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded text-white flex items-center justify-center text-[8px] sm:text-[10px] font-medium">H</div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Hard</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 mb-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center border border-primary/20">
                          <Target className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">
                          {difficultyFilter === 'all' ? 'No tests taken yet' : `No ${difficultyFilter} tests found`}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {difficultyFilter === 'all' 
                            ? 'Start typing to see your results here!' 
                            : 'Try a different difficulty filter or take more tests'
                          }
                        </p>
                        <Button onClick={() => navigate('/')}>
                          Take Your First Test
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6" id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-green-600 dark:text-white font-mono">
                      <span 
                        style={{
                          textShadow: isDark 
                            ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                            : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                          letterSpacing: '0.02em'
                        }}
                      >
                        Performance Breakdown
                      </span>
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Best Accuracy</span>
                          <span className="text-sm font-bold">{userStats?.best_accuracy || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Average Accuracy</span>
                          <span className="text-sm font-bold">{userStats?.average_accuracy.toFixed(1) || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Improvement Trend</span>
                          <span className="text-sm font-bold text-green-600">
                            +{userStats?.improvement_trend?.wpm_change || 0} WPM
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-green-600 dark:text-white font-mono">
                      <span 
                        style={{
                          textShadow: isDark 
                            ? '1px 1px 0 rgb(34, 197, 94), -1px -1px 0 rgb(34, 197, 94), 1px -1px 0 rgb(34, 197, 94), -1px 1px 0 rgb(34, 197, 94)'
                            : '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                          letterSpacing: '0.02em'
                        }}
                      >
                        Difficulty Distribution
                      </span>
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Easy</span>
                          <span className="text-sm font-bold">{userStats?.difficulty_breakdown?.easy || 0} tests</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Medium</span>
                          <span className="text-sm font-bold">{userStats?.difficulty_breakdown?.medium || 0} tests</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Hard</span>
                          <span className="text-sm font-bold">{userStats?.difficulty_breakdown?.hard || 0} tests</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>

        {/* Dialogs */}
        {/* Change Password Dialog */}
        {!isGoogleUser && (
          <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
            setPasswordDialogOpen(open);
            if (open) {
              setError(null); // Clear background errors when dialog opens
            }
          }}>
            <DialogContent className="w-[95%] max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Update your account password. Make sure it's strong and secure.
                </DialogDescription>
              </DialogHeader>

              {/* Error Display within Dialog */}
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordFormData.currentPassword}
                      onChange={handlePasswordInputChange('currentPassword')}
                      className={passwordErrors.currentPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-3 min-h-[44px] min-w-[44px]"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordFormData.newPassword}
                      onChange={handlePasswordInputChange('newPassword')}
                      className={passwordErrors.newPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-3 min-h-[44px] min-w-[44px]"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Password Strength Indicator */}
                  {passwordFormData.newPassword && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Password strength:</span>
                        <span className={`text-xs font-medium ${
                          passwordStrength.score >= 3 ? 'text-green-600' : 
                          passwordStrength.score >= 2 ? 'text-blue-600' :
                          passwordStrength.score >= 1 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className={`flex items-center gap-1 ${passwordStrength.criteria.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.criteria.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          8+ characters
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.criteria.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.criteria.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          Uppercase
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.criteria.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.criteria.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          Lowercase
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.criteria.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.criteria.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          Number
                        </div>
                      </div>
                    </div>
                  )}

                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordFormData.confirmPassword}
                      onChange={handlePasswordInputChange('confirmPassword')}
                      className={passwordErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-3 min-h-[44px] min-w-[44px]"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-row gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setPasswordFormData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setPasswordErrors({});
                  }}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none"
                >
                  {actionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                  <span className="sm:hidden">Change</span>
                  <span className="hidden sm:inline">Change Password</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete All History Dialog */}
        <AlertDialog open={deleteHistoryDialogOpen} onOpenChange={setDeleteHistoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Test History</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all your typing test results and statistics.
                <br /><br />
                <strong>Type "DELETE" to confirm:</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmationText('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllHistory}
                disabled={confirmationText !== 'DELETE' || actionLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {actionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                Delete All History
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Avatar Upload Dialog */}
        <Dialog open={avatarDialogOpen} onOpenChange={handleAvatarDialogClose}>
          <DialogContent className="w-[95vw] max-w-md sm:max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Update Profile Picture</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Upload a new profile picture (PNG, JPEG, GIF, WebP - max 5MB)
              </DialogDescription>
            </DialogHeader>
            <AvatarUpload
              currentImageUrl={actualUser?.profile_picture}
              username={actualUser?.username || 'User'}
              userId={actualUser?.id || 0}
              onUploadSuccess={async () => {
                try {
                  setAvatarRefreshing(true);
                  await refreshUser();
                  setAvatarDialogOpen(false);
                } catch (error) {
                  console.error('Failed to refresh user after upload:', error);
                  // Still close dialog even if refresh fails
                  setAvatarDialogOpen(false);
                } finally {
                  setAvatarRefreshing(false);
                }
              }}
              onCancel={handleAvatarDialogClose}
            />
          </DialogContent>
        </Dialog>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign Out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out? You'll need to log in again to access your profile and test history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLogout} className="bg-destructive hover:bg-destructive/90">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProfilePage;