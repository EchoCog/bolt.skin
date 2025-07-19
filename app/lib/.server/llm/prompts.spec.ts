import { describe, expect, it } from 'vitest';
import { getSkinTwinPrompt, getSystemPrompt } from './prompts';

describe('prompts', () => {
  describe('getSkinTwinPrompt', () => {
    it('should return a string containing SkinTwin prompt', () => {
      const prompt = getSkinTwinPrompt();
      expect(prompt).toContain('SkinTwin - Virtual Turbo Reactor Formulation Vessel');
      expect(prompt).toContain('virtual chemical reaction vessel');
      expect(prompt).toContain('formulation chemist');
      expect(prompt).toContain('safe ingredients');
    });

    it('should include required table structure descriptions', () => {
      const prompt = getSkinTwinPrompt();
      expect(prompt).toContain('ingredient name in the first col');
      expect(prompt).toContain('gram amount in the second col');
      expect(prompt).toContain('INCI composition in the third col');
      expect(prompt).toContain('costing estimates for raw materials in ZAR');
    });

    it('should include reaction simulation instructions', () => {
      const prompt = getSkinTwinPrompt();
      expect(prompt).toContain('simulate each step');
      expect(prompt).toContain('adding the ingredient in that step to the vessel');
      expect(prompt).toContain('list all the equations and ingredients inside the vessel');
    });

    it('should include tone and style requirements', () => {
      const prompt = getSkinTwinPrompt();
      expect(prompt).toContain('humorous and friendly');
      expect(prompt).toContain('technical rigor');
      expect(prompt).toContain('mad scientist enthusiasm');
    });

    it('should include safety requirements', () => {
      const prompt = getSkinTwinPrompt();
      expect(prompt).toContain('fully avoid any restricted chemicals');
      expect(prompt).toContain('use only safe ingredients');
      expect(prompt).toContain('Safety First');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return a string containing Deep Tree Echo prompt', () => {
      const prompt = getSystemPrompt();
      expect(prompt).toContain('Deep Tree Echo');
      expect(prompt).toContain('AI architect');
      expect(prompt).toContain('polymath');
    });
  });
});