import { FieldDefinition } from '../../types/index.js';

export const demographicsFields: Record<string, FieldDefinition> = {
  education: {
    id: 'education',
    name: 'Highest Education Level',
    type: 'select',
    required: true,
    options: [
      'High school diploma/equivalent','Vocational school','Associate degree/some college',
      "Bachelor's degree", "Master's, Ph.D., J.D., etc.", 'Other'
    ]
  },
  employmentStatus: {
    id: 'employmentStatus',
    name: 'Employment Status',
    type: 'select',
    required: true,
    options: [
      'Employed/Self-employed (full- or part-time)','Retired','Student','Homemaker','In the military',
      'Not seeking employment','Unemployed'
    ]
  },
  occupation: {
    id: 'occupation',
    name: 'Occupation',
    type: 'text',
    required: false,
    placeholder: 'e.g., Teacher, Engineer, Manager'
  },
  industry: {
    id: 'industry',
    name: 'Industry',
    type: 'text',
    required: false,
    placeholder: 'e.g., Education, Technology, Healthcare'
  },
  militaryAffiliation: {
    id: 'militaryAffiliation',
    name: 'Military/Government Affiliation',
    type: 'select',
    required: false,
    options: [
      'None','Active Military','Military Veteran','Military Reserves/National Guard',
      'Federal Employee','State/Local Government Employee'
    ]
  }
}; 