import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { testResultsApi, userApi } from '@/lib/api';
import { UserStats, TestResult, DifficultyLevel, TimerOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Navbar from '@/components/Navbar';
import AvatarUpload from '@/components/AvatarUpload';
import AdBanner from '@/components/AdBanner';
import Footer from '@/components/Footer';
import FloatingKeys, { PROFILE_KEYS } from '@/components/landing/FloatingKeys';
import ProfileProgressChart from '@/components/profile/ProfileProgressChart';
import { useIntroProgress } from '@/hooks/useIntroProgress';
import { cn } from '@/lib/utils';
import {
  Shield,
  Info,
  Camera,
  Eye,
  EyeOff,
  LogOut,
  Download,
  Trash2,
  KeyRound,
  Check,
  X
} from 'lucide-react';

const DIFFICULTY_FILTERS: Array<{ value: DifficultyLevel | 'all'; label: string; short: string }> = [
  { value: 'all', label: 'All', short: 'All' },
  { value: 'easy', label: 'Easy', short: 'Easy' },
  { value: 'medium', label: 'Medium', short: 'Med' },
  { value: 'hard', label: 'Hard', short: 'Hard' }
];

const DIFFICULTY_DOT: Record<DifficultyLevel, string> = {
  easy: 'var(--difficulty-easy)',
  medium: 'var(--difficulty-medium)',
  hard: 'var(--difficulty-hard)'
};

/** Seconds into the shape the meta line and the fourth figure both want. */
const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
};

const formatMonthYear = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const formatTestDate = (value?: string): string => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

/** Phone widths get "28 Sep"; the full date wraps to two lines in 54px. */
const formatTestDateShort = (value?: string): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

const formatTestTime = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | 'all'>('all');
  const [progressDifficultyFilter, setProgressDifficultyFilter] = useState<DifficultyLevel | 'all'>('all');
  const [refreshKey] = useState(0);

  // Edit states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarRefreshing, setAvatarRefreshing] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
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

  // A new URL deserves a fresh attempt, e.g. straight after an avatar upload.
  useEffect(() => {
    setAvatarFailed(false);
  }, [(user as any)?.profile_picture, (user as any)?.user?.profile_picture]);

  // The figures count up to whatever the API returned, once it has landed.
  const intro = useIntroProgress(!loading);

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
  const username: string = actualUser?.username || 'You';

  const bestWpm = userStats?.best_wpm ?? 0;
  const averageWpm = Math.round(userStats?.average_wpm ?? 0);
  const averageAccuracy = userStats?.average_accuracy ?? 0;
  const bestAccuracy = userStats?.best_accuracy ?? 0;
  const totalTests = userStats?.total_tests ?? 0;
  const minutesTyped = Math.round((userStats?.total_time_spent ?? 0) / 60);
  const wpmChange = Math.round(userStats?.improvement_trend?.wpm_change ?? 0);
  const breakdown = userStats?.difficulty_breakdown;
  const memberSince = formatMonthYear(actualUser?.created_at);

  const shownBest = Math.round(bestWpm * intro);
  const shownAverage = Math.round(averageWpm * intro);
  const shownAccuracy = (averageAccuracy * intro).toFixed(1);
  const shownMinutes = Math.round(minutesTyped * intro);
  const shownHours = Math.floor(shownMinutes / 60);

  const breakdownMax = breakdown
    ? Math.max(breakdown.easy, breakdown.medium, breakdown.hard, 1)
    : 1;
  const distribution: Array<{ label: string; count: number; fill: string }> = [
    { label: 'Easy', count: breakdown?.easy ?? 0, fill: 'var(--pf-bar-easy)' },
    { label: 'Medium', count: breakdown?.medium ?? 0, fill: 'var(--pf-bar-medium)' },
    { label: 'Hard', count: breakdown?.hard ?? 0, fill: 'var(--pf-bar-hard)' }
  ];

  const visibleTests = filteredTests.slice(0, 10);
  const initial = username.charAt(0).toUpperCase();

  return (
    <div
      className="tt-pf tt-pf-anim min-h-screen flex flex-col"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <Navbar backUrl="/" className="sticky" />

      {/* One ground under the whole page: the landing page's two washes and its
          keycaps, so the profile sits on the same floor as everything else. */}
      <div className="tt-ground flex-1">
        <div className="tt-wash" aria-hidden="true" />
        <div className="tt-wash-mid" aria-hidden="true" />
        <div className="tt-wash-2" aria-hidden="true" />
        <FloatingKeys keys={PROFILE_KEYS} />

        <div className="tt-pf-top relative z-10 mx-auto w-full max-w-[1100px] px-[22px] pb-12 sm:px-10 lg:px-[90px]">

          {error && (
            <div
              className="tt-pf-a mb-6 rounded-lg border px-4 py-3"
              style={{ borderColor: 'var(--destructive)', background: 'var(--pf-chrome)' }}
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm" id="error-message" style={{ color: 'var(--destructive)' }}>{error}</p>
            </div>
          )}

          {/* ---- Masthead ---- */}
          <div className="flex items-start gap-4 sm:gap-[26px]">
            <div className="tt-pf-a tt-pf-d1 relative flex-shrink-0">
              <div
                className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full sm:h-[76px] sm:w-[76px]"
                style={{ background: 'var(--pf-avatar)', border: '1px solid var(--pf-avatar-ring)' }}
              >
                {actualUser?.profile_picture && !avatarFailed ? (
                  <img
                    src={actualUser.profile_picture}
                    alt={username}
                    className="h-full w-full object-cover"
                    // Google's lh3.googleusercontent.com avatars come back
                    // ERR_BLOCKED_BY_ORB in Chrome and Edge when the page sends a
                    // referrer; without one they load. Same fix as the navbar.
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span
                    className="font-sans text-[24px] sm:text-[30px]"
                    style={{ color: 'var(--pf-green)' }}
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                )}
              </div>
              {avatarRefreshing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                </div>
              )}
              <button
                type="button"
                aria-label="Change profile picture"
                onClick={() => setAvatarDialogOpen(true)}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full"
                style={{
                  background: 'var(--pf-chrome)',
                  border: '1px solid var(--pf-hair)',
                  color: 'var(--pf-dim)'
                }}
              >
                <Camera className="h-[13px] w-[13px]" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="tt-pf-name tt-pf-a tt-pf-d2 text-[32px] sm:text-[44px] lg:text-[54px]">
                {username}
              </h1>
              <div className="tt-pf-meta tt-pf-a tt-pf-d3 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:mt-3.5 sm:gap-x-7">
                {memberSince && <span>Member since {memberSince}</span>}
                <span>{totalTests} {totalTests === 1 ? 'test' : 'tests'}</span>
                <span>{formatMinutes(minutesTyped)} typed</span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  {isGoogleUser ? 'Google account' : 'TapTest account'}
                  {!isGoogleUser && (
                    <span className="relative inline-flex">
                      <button
                        type="button"
                        onClick={() => setShowAccountInfo(!showAccountInfo)}
                        aria-label="Account type information"
                        className="flex h-5 w-5 items-center justify-center rounded-full"
                        style={{ color: 'var(--pf-dim)' }}
                      >
                        <Info className="h-3 w-3" />
                      </button>
                      {showAccountInfo && (
                        <span
                          className="absolute left-1/2 top-6 z-20 w-48 -translate-x-1/2 rounded-md border p-2 text-center text-xs normal-case tracking-normal"
                          style={{
                            background: 'var(--popover)',
                            color: 'var(--popover-foreground)',
                            borderColor: 'var(--border)',
                            fontFamily: 'var(--font-serif)'
                          }}
                        >
                          Signed in with username, not via Google
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <span className="tt-pf-rule tt-pf-w tt-pf-d4 mt-5 sm:mt-[22px]" />

          {/* ---- The figures ----
              A grid, not a wrapping flex row: with flex, a zero-basis cell packs
              onto the same line as the full-width divider and collapses to 0px.
              The dividers are borders on the cells, so they match the row height. */}
          <div
            className="grid grid-cols-2 gap-y-6 pt-6 sm:grid-cols-3 sm:pt-7 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:gap-y-0"
            style={{ borderColor: 'var(--pf-hair)' }}
          >
            <div
              className="tt-pf-a tt-pf-d5 col-span-2 border-b pb-6 sm:col-span-3 lg:col-span-1 lg:border-b-0 lg:pb-0 lg:pr-[30px]"
              style={{ borderColor: 'var(--pf-hair)' }}
            >
              <div className="flex items-end gap-4">
                <span
                  className="tt-pf-num text-[58px] sm:text-[68px] lg:text-[78px]"
                  style={{ color: 'var(--pf-num)', lineHeight: 0.87, letterSpacing: '-0.05em' }}
                >
                  {shownBest}
                </span>
                <div className="pb-1">
                  <p className="tt-pf-cap m-0 text-[15px] leading-[1.22] sm:text-[16.5px]">
                    words a minute,<br />at your best
                  </p>
                  {wpmChange > 0 && (
                    <span className="tt-pf-chip mt-2">+{wpmChange} wpm and climbing</span>
                  )}
                </div>
              </div>
            </div>

            <div
              className="tt-pf-a tt-pf-d6 min-w-0 lg:border-l lg:pl-[30px]"
              style={{ borderColor: 'var(--pf-hair)' }}
            >
              <div className="flex items-baseline gap-2 lg:block">
                <span className="tt-pf-num text-[34px] sm:text-[40px] lg:text-[46px]">{shownAverage}</span>
                <span
                  className="tt-pf-cap text-[14px] sm:text-[15.5px] lg:mt-1.5 lg:block"
                  style={{ color: 'var(--pf-dim)' }}
                >
                  on average
                </span>
              </div>
            </div>

            <div
              className="tt-pf-a tt-pf-d7 min-w-0 border-l pl-5 lg:pl-[30px]"
              style={{ borderColor: 'var(--pf-hair)' }}
            >
              <div className="flex items-baseline gap-2 lg:block">
                <span className="tt-pf-num text-[34px] sm:text-[40px] lg:text-[46px]">
                  {shownAccuracy}<span className="text-[20px] lg:text-[26px]">%</span>
                </span>
                <span
                  className="tt-pf-cap text-[14px] sm:text-[15.5px] lg:mt-1.5 lg:block"
                  style={{ color: 'var(--pf-dim)' }}
                >
                  accurate
                </span>
              </div>
              {bestAccuracy > 0 && (
                <div
                  className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
                  style={{ color: 'var(--pf-dim)' }}
                >
                  Best {Math.round(bestAccuracy * 10) / 10}%
                </div>
              )}
            </div>

            <div
              className="tt-pf-a tt-pf-d8 hidden min-w-0 border-l pl-5 sm:block lg:pl-[30px]"
              style={{ borderColor: 'var(--pf-hair)' }}
            >
              <div className="flex items-baseline gap-2 lg:block">
                <span className="tt-pf-num text-[34px] sm:text-[40px] lg:text-[46px]">
                  {shownHours > 0 && (
                    <>
                      {shownHours}<span className="text-[20px] lg:text-[26px]">h </span>
                    </>
                  )}
                  {shownMinutes % 60}<span className="text-[20px] lg:text-[26px]">m</span>
                </span>
                <span
                  className="tt-pf-cap text-[14px] sm:text-[15.5px] lg:mt-1.5 lg:block"
                  style={{ color: 'var(--pf-dim)' }}
                >
                  at the keyboard
                </span>
              </div>
            </div>
          </div>

          <span className="tt-pf-hair mt-7" />

          {/* ---- Progression, and the two side panels ---- */}
          <div className="grid grid-cols-1 gap-9 pt-6 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
            <section aria-labelledby="progression-heading">
              <div className="tt-pf-a tt-pf-d9 flex items-baseline justify-between gap-3">
                <h2 id="progression-heading" className="tt-pf-eyebrow">Progression</h2>
                <div className="flex gap-3.5 sm:gap-[18px]">
                  {DIFFICULTY_FILTERS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProgressDifficultyFilter(option.value)}
                      aria-pressed={progressDifficultyFilter === option.value}
                      className={cn('tt-pf-tab', progressDifficultyFilter === option.value && 'is-on')}
                    >
                      <span className="sm:hidden">{option.short}</span>
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <ProfileProgressChart data={filteredProgressTests} className="mt-4" />

              <div
                className="tt-pf-f tt-pf-d14 mt-2 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.1em] sm:text-[10px]"
                style={{ color: 'var(--pf-dim)' }}
              >
                <span>
                  {filteredProgressTests.length > 1
                    ? `${Math.min(filteredProgressTests.length, 12)} tests ago`
                    : 'Not enough tests yet'}
                </span>
                {wpmChange > 0 && <span style={{ color: 'var(--pf-green)' }}>+{wpmChange} wpm</span>}
              </div>
            </section>

            <div>
              <section aria-labelledby="difficulty-heading">
                <h2 id="difficulty-heading" className="tt-pf-eyebrow tt-pf-a tt-pf-d10">By difficulty</h2>
                <div className="tt-pf-a tt-pf-d11 mt-4 flex flex-col gap-4">
                  {distribution.map((row, index) => (
                    <div key={row.label}>
                      <div
                        className="flex justify-between font-mono text-[11.5px]"
                        style={{ color: 'var(--pf-dim)' }}
                      >
                        <span>{row.label}</span>
                        <span>{row.count} {row.count === 1 ? 'test' : 'tests'}</span>
                      </div>
                      <div className="tt-pf-track mt-[7px]">
                        <span
                          className={cn('tt-pf-w', `tt-pf-d${12 + index}`)}
                          style={{
                            width: `${(row.count / breakdownMax) * 100}%`,
                            background: row.fill
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section
                aria-labelledby="quickstart-heading"
                className={cn('mt-7', shakeAnimation && 'animate-shake')}
              >
                <h2 id="quickstart-heading" className="tt-pf-eyebrow tt-pf-a tt-pf-d12">Go again</h2>
                <div className="tt-pf-a tt-pf-d13 mt-3.5 flex gap-2">
                  {([1, 2, 5] as TimerOption[]).map(duration => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setQuickStartTimer(duration)}
                      aria-pressed={quickStartTimer === duration}
                      className={cn('tt-pf-pill', quickStartTimer === duration && 'is-on')}
                    >
                      {duration}m
                    </button>
                  ))}
                </div>
                <div className="tt-pf-a tt-pf-d13 mt-2 flex gap-2">
                  {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setQuickStartDifficulty(level)}
                      aria-pressed={quickStartDifficulty === level}
                      className={cn('tt-pf-pill capitalize', quickStartDifficulty === level && 'is-on')}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleQuickStart}
                  disabled={!quickStartTimer || !quickStartDifficulty}
                  className="tt-pf-go tt-pf-a tt-pf-d14 mt-2.5"
                >
                  {quickStartTimer && quickStartDifficulty
                    ? `Start a ${quickStartTimer} minute ${quickStartDifficulty} test`
                    : 'Pick a length and a level'}
                </button>
              </section>
            </div>
          </div>

          <span className="tt-pf-hair mt-7" />

          {/* ---- Recent tests ---- */}
          <section aria-labelledby="recent-heading" className="pt-6">
            <div className="tt-pf-a tt-pf-d10 flex items-baseline justify-between gap-3">
              <h2 id="recent-heading" className="tt-pf-eyebrow">Recent tests</h2>
              <div className="flex gap-3.5 sm:gap-[18px]">
                {DIFFICULTY_FILTERS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDifficultyFilter(option.value)}
                    aria-pressed={difficultyFilter === option.value}
                    className={cn('tt-pf-tab', difficultyFilter === option.value && 'is-on')}
                  >
                    <span className="sm:hidden">{option.short}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {visibleTests.length > 0 ? (
              <div className="mt-2">
                {visibleTests.map((result, index) => (
                  <div
                    key={result.id ?? index}
                    className={cn('tt-pf-a flex items-center gap-3.5 py-3.5', `tt-pf-d${Math.min(14, 11 + index)}`)}
                    style={{
                      borderBottom: index === visibleTests.length - 1
                        ? undefined
                        : '1px solid var(--pf-hair-soft)'
                    }}
                  >
                    <span
                      className="w-[56px] flex-shrink-0 whitespace-nowrap font-mono text-[11px] sm:w-[110px] sm:text-[11.5px]"
                      style={{ color: 'var(--pf-dim)' }}
                    >
                      <span className="sm:hidden">{formatTestDateShort(result.created_at)}</span>
                      <span className="hidden sm:inline">{formatTestDate(result.created_at)}</span>
                    </span>
                    <span
                      className="tt-pf-num w-10 flex-shrink-0 text-[19px] sm:w-[70px] sm:text-[20px]"
                      style={{ color: result.wpm >= bestWpm && bestWpm > 0 ? 'var(--pf-num)' : undefined }}
                    >
                      {result.wpm}
                    </span>
                    <span
                      className="flex-1 font-mono text-[12.5px]"
                      style={{ color: 'var(--pf-dim)' }}
                    >
                      {Math.round(result.accuracy * 10) / 10}%
                    </span>
                    <span
                      className="hidden w-[80px] font-mono text-[11.5px] sm:block"
                      style={{ color: 'var(--pf-dim)' }}
                    >
                      {formatTestTime(result.created_at)}
                    </span>
                    <span
                      className="inline-flex flex-shrink-0 items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.12em]"
                      style={{ color: 'var(--pf-dim)' }}
                    >
                      <span
                        className="h-[7px] w-[7px] rounded-full"
                        style={{ background: DIFFICULTY_DOT[result.difficulty] }}
                      />
                      {result.difficulty}
                    </span>
                  </div>
                ))}

                {filteredTests.length > 10 && (
                  <p
                    className="tt-pf-f tt-pf-d14 mt-3 font-mono text-[10px] uppercase tracking-[0.15em]"
                    style={{ color: 'var(--pf-dim)' }}
                  >
                    Showing the latest 10 of {filteredTests.length}
                  </p>
                )}
              </div>
            ) : (
              <div className="tt-pf-a tt-pf-d11 mt-5">
                <p className="tt-pf-cap m-0 text-[17px] sm:text-[19px]" style={{ color: 'var(--pf-dim)' }}>
                  {difficultyFilter === 'all'
                    ? 'Nothing here yet. Your first result will open this page up.'
                    : `No ${difficultyFilter} tests yet — try another level, or run one now.`}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/start')}
                  className="tt-pf-link mt-2"
                >
                  <span>Take your first test</span>
                </button>
              </div>
            )}
          </section>

          {/* ---- Account ---- */}
          <span className="tt-pf-hair mt-7" />
          <div className="tt-pf-f tt-pf-d14 flex flex-wrap items-center gap-x-[18px] gap-y-0 pt-3">
            {!isGoogleUser && (
              <button type="button" className="tt-pf-link" onClick={() => setPasswordDialogOpen(true)}>
                <KeyRound className="h-[15px] w-[15px]" aria-hidden="true" />
                <span>Change password</span>
              </button>
            )}
            <button type="button" className="tt-pf-link" onClick={handleExportCSV} disabled={!hasTests}>
              <Download className="h-[15px] w-[15px]" aria-hidden="true" />
              <span>Export data</span>
            </button>
            <button type="button" className="tt-pf-link" onClick={handleLogout}>
              <LogOut className="h-[15px] w-[15px]" aria-hidden="true" />
              <span>Log out</span>
            </button>
            <button
              type="button"
              className="tt-pf-link is-danger"
              onClick={() => setDeleteHistoryDialogOpen(true)}
              disabled={!hasTests}
            >
              <Trash2 className="h-[15px] w-[15px]" aria-hidden="true" />
              <span>Delete history</span>
            </button>
          </div>

          <div className="tt-pf-f tt-pf-d14 pt-9">
            <AdBanner size="horizontal" slot="profile-banner" className="mx-auto" />
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

      <Footer />
    </div>
  );
};

export default ProfilePage;
