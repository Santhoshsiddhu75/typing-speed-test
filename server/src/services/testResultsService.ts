import database from '../db/database.js';
import { TestResult, CreateTestResultRequest, GetTestResultsRequest, PaginatedResponse, UserStats } from '../types/index.js';

export class TestResultsService {
  
  /**
   * Save a new test result
   */
  async createTestResult(data: CreateTestResultRequest): Promise<TestResult> {
    const sql = `
      INSERT INTO test_results (
        username, wpm, cpm, accuracy, total_time, difficulty,
        total_characters, correct_characters, incorrect_characters, test_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.username,
      data.wpm,
      data.cpm,
      data.accuracy,
      data.total_time,
      data.difficulty,
      data.total_characters,
      data.correct_characters,
      data.incorrect_characters,
      data.test_text || null
    ];

    const result = await database.run(sql, params);
    
    // Fetch the created record
    const createdResult = await database.get<TestResult>(
      'SELECT * FROM test_results WHERE id = ?',
      [result.lastID]
    );

    if (!createdResult) {
      throw new Error('Failed to retrieve created test result');
    }

    return createdResult;
  }

  /**
   * Get test results for a user with filtering and pagination
   */
  async getTestResults(params: GetTestResultsRequest): Promise<PaginatedResponse<TestResult>> {
    let whereConditions = ['username = ?'];
    let queryParams: any[] = [params.username];

    // Add optional filters
    if (params.difficulty) {
      whereConditions.push('difficulty = ?');
      queryParams.push(params.difficulty);
    }

    if (params.start_date) {
      whereConditions.push('created_at >= ?');
      queryParams.push(params.start_date);
    }

    if (params.end_date) {
      whereConditions.push('created_at <= ?');
      queryParams.push(params.end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) as count FROM test_results WHERE ${whereClause}`;
    const countResult = await database.get<{ count: number }>(countSql, queryParams);
    const total = countResult?.count || 0;

    // Get paginated results
    const dataSql = `
      SELECT * FROM test_results 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...queryParams, params.limit, params.offset];
    const results = await database.all<TestResult>(dataSql, dataParams);

    return {
      data: results,
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < total
      }
    };
  }

  /**
   * Get user statistics (for future profile/stats pages)
   */
  async getUserStats(username: string): Promise<UserStats | null> {
    const stats = await database.get(`
      SELECT 
        username,
        COUNT(*) as total_tests,
        ROUND(AVG(wpm), 2) as average_wpm,
        ROUND(AVG(accuracy), 2) as average_accuracy,
        MAX(wpm) as best_wpm,
        MAX(accuracy) as best_accuracy,
        SUM(total_time) as total_time_spent,
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count
      FROM test_results 
      WHERE username = ?
      GROUP BY username
    `, [username]);

    if (!stats) {
      return null;
    }

    // Calculate improvement trend (last 10 tests vs previous 10 tests)
    const recentTests = await database.all(`
      SELECT wpm, accuracy FROM test_results 
      WHERE username = ?
      ORDER BY created_at DESC 
      LIMIT 20
    `, [username]);

    let wpm_change = 0;
    let accuracy_change = 0;

    if (recentTests.length >= 10) {
      const recent10 = recentTests.slice(0, 10);
      const previous10 = recentTests.slice(10, 20);
      
      if (previous10.length > 0) {
        const recentAvgWpm = recent10.reduce((sum, test) => sum + test.wpm, 0) / recent10.length;
        const previousAvgWpm = previous10.reduce((sum, test) => sum + test.wpm, 0) / previous10.length;
        wpm_change = recentAvgWpm - previousAvgWpm;

        const recentAvgAcc = recent10.reduce((sum, test) => sum + test.accuracy, 0) / recent10.length;
        const previousAvgAcc = previous10.reduce((sum, test) => sum + test.accuracy, 0) / previous10.length;
        accuracy_change = recentAvgAcc - previousAvgAcc;
      }
    }

    return {
      username: stats.username,
      total_tests: stats.total_tests,
      average_wpm: stats.average_wpm,
      average_accuracy: stats.average_accuracy,
      best_wpm: stats.best_wpm,
      best_accuracy: stats.best_accuracy,
      total_time_spent: stats.total_time_spent,
      improvement_trend: {
        wpm_change: Math.round(wpm_change * 100) / 100,
        accuracy_change: Math.round(accuracy_change * 100) / 100
      },
      difficulty_breakdown: {
        easy: stats.easy_count,
        medium: stats.medium_count,
        hard: stats.hard_count
      }
    };
  }

  /**
   * Get recent test results across all users (for leaderboards)
   */
  async getLeaderboard(difficulty?: string, limit = 10): Promise<TestResult[]> {
    let sql = `
      SELECT * FROM test_results 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (difficulty) {
      sql += ` AND difficulty = ?`;
      params.push(difficulty);
    }

    sql += ` ORDER BY wpm DESC, accuracy DESC LIMIT ?`;
    params.push(limit);

    return await database.all<TestResult>(sql, params);
  }

  /**
   * Delete all test results for a user (for account deletion)
   */
  async deleteUserResults(username: string): Promise<number> {
    const result = await database.run(
      'DELETE FROM test_results WHERE username = ?',
      [username]
    );
    return result.changes;
  }
}

export const testResultsService = new TestResultsService();
export default testResultsService;