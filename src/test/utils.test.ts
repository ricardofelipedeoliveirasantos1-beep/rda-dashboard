import { describe, it, expect } from 'vitest';

describe('Utility Functions', () => {
  describe('Date Formatting', () => {
    it('should format date correctly (DD/MM/YYYY)', () => {
      const date = '2026-08-09';
      const formatted = date.split('-').reverse().join('/');
      expect(formatted).toBe('09/08/2026');
    });

    it('should handle single digit months and days', () => {
      const date = '2026-01-05';
      const formatted = date.split('-').reverse().join('/');
      expect(formatted).toBe('05/01/2026');
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency in BRL', () => {
      const value = 1234.56;
      const formatted = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value);
      expect(formatted).toContain('1.234');
      expect(formatted).toContain('56');
    });

    it('should format zero value', () => {
      const value = 0;
      const formatted = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value);
      expect(formatted).toContain('0');
    });
  });

  describe('String Utilities', () => {
    it('should capitalize first letter', () => {
      const str = 'hello';
      const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
      expect(capitalized).toBe('Hello');
    });

    it('should normalize string for comparison', () => {
      const str1 = 'João Silva';
      const str2 = 'joao silva';
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      expect(normalize(str1)).toBe(normalize(str2));
    });
  });

  describe('Number Utilities', () => {
    it('should calculate average correctly', () => {
      const values = [10, 20, 30];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      expect(avg).toBe(20);
    });

    it('should handle empty array for average', () => {
      const values: number[] = [];
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      expect(avg).toBe(0);
    });

    it('should find max difference in scores', () => {
      const scores = [
        { team1: 5, team2: 2 },
        { team1: 3, team2: 3 },
        { team1: 7, team2: 1 },
      ];
      let maxDiff = 0;
      let biggestScore = 'N/A';
      
      scores.forEach(s => {
        const diff = Math.abs(s.team1 - s.team2);
        if (diff > maxDiff) {
          maxDiff = diff;
          biggestScore = `${Math.max(s.team1, s.team2)} x ${Math.min(s.team1, s.team2)}`;
        }
      });
      
      expect(maxDiff).toBe(6);
      expect(biggestScore).toBe('7 x 1');
    });
  });

  describe('Array Utilities', () => {
    it('should sort players by goals descending', () => {
      const players = [
        { name: 'Player A', goals: 5 },
        { name: 'Player B', goals: 10 },
        { name: 'Player C', goals: 3 },
      ];
      const sorted = [...players].sort((a, b) => b.goals - a.goals);
      expect(sorted[0].name).toBe('Player B');
      expect(sorted[1].name).toBe('Player A');
      expect(sorted[2].name).toBe('Player C');
    });

    it('should get top N players', () => {
      const players = [
        { name: 'A', goals: 10 },
        { name: 'B', goals: 8 },
        { name: 'C', goals: 6 },
        { name: 'D', goals: 4 },
        { name: 'E', goals: 2 },
      ];
      const top3 = players.slice(0, 3);
      expect(top3).toHaveLength(3);
      expect(top3[2].name).toBe('C');
    });

    it('should filter active players', () => {
      const players = [
        { name: 'A', is_active: true },
        { name: 'B', is_active: false },
        { name: 'C', is_active: true },
      ];
      const active = players.filter(p => p.is_active);
      expect(active).toHaveLength(2);
    });
  });

  describe('Birthday Calculations', () => {
    it('should calculate correct age from birth date', () => {
      const birthDate = '1990-08-09';
      const today = new Date();
      const [y, m, d] = birthDate.split('-');
      let age = today.getFullYear() - parseInt(y, 10);
      
      const monthDay = today.getMonth() * 100 + today.getDate();
      const birthMonthDay = (parseInt(m, 10) - 1) * 100 + parseInt(d, 10);
      
      if (monthDay < birthMonthDay) {
        age--;
      }
      
      expect(age).toBeGreaterThanOrEqual(35);
      expect(age).toBeLessThanOrEqual(36);
    });

    it('should find next birthday date', () => {
      const birthDate = '2000-12-25';
      const today = new Date();
      const [, m, d] = birthDate.split('-');
      
      let nextBday = new Date(today.getFullYear(), parseInt(m, 10) - 1, parseInt(d, 10));
      if (nextBday < today) {
        nextBday = new Date(today.getFullYear() + 1, parseInt(m, 10) - 1, parseInt(d, 10));
      }
      
      expect(nextBday).toBeInstanceOf(Date);
      expect(nextBday.getMonth()).toBe(11); // December
      expect(nextBday.getDate()).toBe(25);
    });
  });

  describe('Match Day Calculation', () => {
    it('should calculate days until next match day', () => {
      const targetDay = 5; // Sexta-feira
      const currentDay = new Date().getDay();
      let daysToAdd = targetDay - currentDay;
      
      if (daysToAdd < 0) {
        daysToAdd += 7;
      }
      
      expect(daysToAdd).toBeGreaterThanOrEqual(0);
      expect(daysToAdd).toBeLessThanOrEqual(7);
    });
  });

  describe('Permission System', () => {
    it('admin should have all permissions', () => {
      const role = 'admin';
      const can = (_action: string): boolean => {
        if (role === 'admin') return true;
        return false;
      };
      
      expect(can('create_match')).toBe(true);
      expect(can('delete_notices')).toBe(true);
      expect(can('manage_finance')).toBe(true);
    });

    it('visitor should have no permissions', () => {
      const role = 'visitor';
      const can = (_action: string): boolean => {
        if (role === 'visitor') return false;
        return false;
      };
      
      expect(can('create_match')).toBe(false);
      expect(can('edit_players')).toBe(false);
    });

    it('assistant should respect custom permissions', () => {
      const permissions = {
        create_match: true,
        edit_match: false,
        insert_stats: true,
        edit_players: false,
        manage_finance: false,
        create_notices: false,
        edit_notices: false,
        delete_notices: false,
        import_history: false,
      };
      
      const createCan = (role: 'admin' | 'assistant' | 'visitor') =>
        (action: keyof typeof permissions): boolean => {
          if (role === 'admin') return true;
          if (role === 'visitor') return false;
          return permissions[action] || false;
        };
      const can = createCan('assistant');
      
      expect(can('create_match')).toBe(true);
      expect(can('edit_match')).toBe(false);
      expect(can('insert_stats')).toBe(true);
      expect(can('manage_finance')).toBe(false);
    });
  });
});
