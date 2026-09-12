import { supabase } from '../supabaseClient';
import type { RuleTemplate } from '../../core/referential/types';

type RuleTemplateRow = {
  id: string;
  category: RuleTemplate['category'];
  label: string;
  short_label: string;
  icon: string;
  age_min: number;
  age_max: number;
  focus_year: number;
  is_thematic_eligible: boolean;
  default_points: number;
  difficulty: RuleTemplate['difficulty'];
  split_into: string[];
};

function toRuleTemplate(row: RuleTemplateRow): RuleTemplate {
  return {
    id: row.id,
    category: row.category,
    label: row.label,
    shortLabel: row.short_label,
    icon: row.icon,
    ageMin: row.age_min,
    ageMax: row.age_max,
    focusYear: row.focus_year,
    isThematicEligible: row.is_thematic_eligible,
    defaultPoints: row.default_points,
    difficulty: row.difficulty,
    splitInto: row.split_into,
  };
}

export async function fetchRuleTemplates(): Promise<RuleTemplate[]> {
  const { data, error } = await supabase.from('rule_template').select('*');
  if (error) throw error;
  return (data as RuleTemplateRow[]).map(toRuleTemplate);
}
