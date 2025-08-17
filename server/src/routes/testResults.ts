import { Router } from 'express';
import { z } from 'zod';
import testResultsService from '../services/testResultsService.js';
import { CreateTestResultSchema, GetTestResultsSchema, ApiResponse } from '../types/index.js';

const router = Router();

/**
 * POST /api/tests
 * Save a new test result
 */
router.post('/tests', async (req, res) => {
  try {
    // Validate request body
    const validationResult = CreateTestResultSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      } satisfies ApiResponse);
    }

    const testData = validationResult.data;

    // Save test result
    const result = await testResultsService.createTestResult(testData);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Test result saved successfully'
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error saving test result:', error);
    console.error('Request body was:', req.body);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    } satisfies ApiResponse);
  }
});

/**
 * GET /api/tests?username=XYZ
 * Get test results for a user
 */
router.get('/tests', async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = GetTestResultsSchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      } satisfies ApiResponse);
    }

    const params = validationResult.data;

    // Get test results
    const results = await testResultsService.getTestResults(params);

    res.json({
      success: true,
      data: results
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error fetching test results:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } satisfies ApiResponse);
  }
});

/**
 * GET /api/tests/stats/:username
 * Get user statistics (for future use)
 */
router.get('/tests/stats/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Basic username validation
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username'
      } satisfies ApiResponse);
    }

    const stats = await testResultsService.getUserStats(username);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No test results found for this user'
      } satisfies ApiResponse);
    }

    res.json({
      success: true,
      data: stats
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } satisfies ApiResponse);
  }
});

/**
 * GET /api/tests/leaderboard
 * Get leaderboard (for future use)
 */
router.get('/tests/leaderboard', async (req, res) => {
  try {
    const difficulty = req.query.difficulty as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit > 50) {
      return res.status(400).json({
        success: false,
        error: 'Limit cannot exceed 50'
      } satisfies ApiResponse);
    }

    const leaderboard = await testResultsService.getLeaderboard(difficulty, limit);

    res.json({
      success: true,
      data: leaderboard
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } satisfies ApiResponse);
  }
});

/**
 * DELETE /api/tests
 * Delete all test results for a user
 */
router.delete('/tests', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      } satisfies ApiResponse);
    }

    // Basic username validation
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username'
      } satisfies ApiResponse);
    }

    const deletedCount = await testResultsService.deleteUserResults(username);

    res.json({
      success: true,
      data: {
        deleted: deletedCount,
        message: `Deleted ${deletedCount} test results for user ${username}`
      }
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error deleting user test results:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } satisfies ApiResponse);
  }
});

/**
 * GET /api/tests/export
 * Export test results as CSV
 */
router.get('/tests/export', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      } satisfies ApiResponse);
    }

    // Get test results
    const results = await testResultsService.getTestResults({
      username,
      limit: 1000, // Large limit for export
      offset: 0
    });

    // Generate CSV content
    const headers = ['Date', 'WPM', 'CPM', 'Accuracy (%)', 'Time (s)', 'Difficulty'];
    const csvContent = [
      headers.join(','),
      ...results.data.map(test => [
        new Date(test.created_at).toISOString(),
        test.wpm,
        test.cpm,
        test.accuracy,
        test.total_time,
        test.difficulty
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="typing-test-history-${username}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting test results:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } satisfies ApiResponse);
  }
});

export default router;