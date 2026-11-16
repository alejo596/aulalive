import { StatsService } from '../src/services/stats.service';

describe('AulaLive Core Business Logic & Grade Calculation Tests', () => {
  describe('Chilean 60% standard grade calculation (1.0 - 7.0)', () => {
    it('should return 1.0 when score is 0', () => {
      const grade = StatsService.calculateChileanGrade(0, 10);
      expect(grade).toBe(1.0);
    });

    it('should return exactly 4.0 when exactly 60% is reached (approval threshold)', () => {
      const grade = StatsService.calculateChileanGrade(6, 10);
      expect(grade).toBe(4.0);
    });

    it('should return 7.0 when score is 100% (max score)', () => {
      const grade = StatsService.calculateChileanGrade(10, 10);
      expect(grade).toBe(7.0);
    });

    it('should return a failing grade below 4.0 when score is below 60%', () => {
      const grade = StatsService.calculateChileanGrade(3, 10);
      // Formula: 1.0 + 3.0 * (3 / 6) = 2.5
      expect(grade).toBe(2.5);
    });

    it('should calculate proportional honors grade above 4.0 when score is above 60%', () => {
      const grade = StatsService.calculateChileanGrade(8, 10);
      // Formula: 4.0 + 3.0 * ((8 - 6) / 4) = 5.5
      expect(grade).toBe(5.5);
    });
  });
});

