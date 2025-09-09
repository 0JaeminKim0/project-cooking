// Cloudflare bindings
export interface CloudflareBindings {
  DB: D1Database;
  R2: R2Bucket;
  OPENAI_API_KEY?: string;
}

// Database models
export interface Project {
  id?: number;
  name: string;
  client_company?: string;
  rfp_content?: string;
  rfp_summary?: string;
  requirements_analysis?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id?: number;
  project_id: number;
  name: string;
  role: string;
  mbti?: string;
  cd_card_content?: string;
  skills_extracted?: string;
  experience_summary?: string;
  created_at?: string;
}

export interface AnalysisResult {
  id?: number;
  project_id: number;
  team_chemistry_score?: number;
  domain_coverage_score?: number;
  technical_coverage_score?: number;
  overall_fit_score?: number;
  recommendations?: string;
  study_materials?: string;
  created_at?: string;
}

export interface UploadedFile {
  id?: number;
  project_id?: number;
  team_member_id?: number;
  filename: string;
  file_type: 'rfp' | 'cd_card';
  file_size?: number;
  storage_key: string;
  processed?: boolean;
  created_at?: string;
}

// API request/response types
export interface CreateProjectRequest {
  name: string;
  client_company?: string;
  rfp_content?: string;
}

export interface AddTeamMemberRequest {
  project_id: number;
  name: string;
  role: string;
  mbti?: string;
}

export interface AnalyzeTeamRequest {
  project_id: number;
}

export interface AnalyzeTeamResponse {
  team_chemistry_score: number;
  domain_coverage_score: number;
  technical_coverage_score: number;
  overall_fit_score: number;
  recommendations: string;
  study_materials: string;
  visualization_data: {
    radar_chart: {
      labels: string[];
      project_requirements: number[];
      team_capabilities: number[];
    };
    mbti_compatibility: {
      nodes: { id: string; name: string; mbti: string }[];
      edges: { source: string; target: string; compatibility: number }[];
    };
    coverage_heatmap: {
      categories: string[];
      coverage_scores: number[];
    };
  };
}

// MBTI compatibility matrix
export const MBTI_COMPATIBILITY: Record<string, Record<string, number>> = {
  'ENFP': { 'INTJ': 0.9, 'INFJ': 0.8, 'ENFJ': 0.7, 'ENTP': 0.8 },
  'INTJ': { 'ENFP': 0.9, 'ENTP': 0.8, 'INFP': 0.7, 'ENTJ': 0.7 },
  'INFP': { 'ENFJ': 0.9, 'INTJ': 0.7, 'ENTP': 0.6, 'INFJ': 0.8 },
  'ENTP': { 'INTJ': 0.8, 'INFJ': 0.7, 'ENFP': 0.8, 'ENTJ': 0.7 },
  'ENFJ': { 'INFP': 0.9, 'ISFP': 0.8, 'ENFP': 0.7, 'INTJ': 0.6 },
  'INFJ': { 'ENTP': 0.7, 'ENFP': 0.8, 'INFP': 0.8, 'INTJ': 0.7 },
  'ENTJ': { 'INTP': 0.8, 'INTJ': 0.7, 'ENTP': 0.7, 'INFJ': 0.6 },
  'INTP': { 'ENTJ': 0.8, 'ENTP': 0.9, 'INFJ': 0.7, 'INTJ': 0.8 },
  'ESTJ': { 'ISFP': 0.7, 'ISTP': 0.6, 'INFP': 0.5, 'INTP': 0.6 },
  'ISTJ': { 'ESFP': 0.7, 'ENFP': 0.6, 'ESTP': 0.6, 'ISFP': 0.7 },
  'ESFJ': { 'ISFP': 0.8, 'INFP': 0.7, 'ISTP': 0.6, 'ESTP': 0.7 },
  'ISFJ': { 'ESFP': 0.8, 'ENFP': 0.7, 'ESTP': 0.7, 'ESFJ': 0.8 },
  'ESTP': { 'ISFJ': 0.7, 'ESFJ': 0.7, 'ISTJ': 0.6, 'ISFP': 0.8 },
  'ISTP': { 'ESFJ': 0.6, 'ESTJ': 0.6, 'ENFJ': 0.5, 'ESTP': 0.7 },
  'ESFP': { 'ISTJ': 0.7, 'ISFJ': 0.8, 'INFJ': 0.6, 'INTJ': 0.5 },
  'ISFP': { 'ENFJ': 0.8, 'ESFJ': 0.8, 'ESTJ': 0.7, 'ESTP': 0.8 }
};