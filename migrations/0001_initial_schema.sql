-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  client_company TEXT,
  rfp_content TEXT,
  rfp_summary TEXT,
  requirements_analysis TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  mbti TEXT,
  cd_card_content TEXT,
  skills_extracted TEXT,
  experience_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  team_chemistry_score REAL,
  domain_coverage_score REAL,
  technical_coverage_score REAL,
  overall_fit_score REAL,
  recommendations TEXT,
  study_materials TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Uploaded files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  team_member_id INTEGER,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'rfp', 'cd_card'
  file_size INTEGER,
  storage_key TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_members_project_id ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_project_id ON analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_project_id ON uploaded_files(project_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_team_member_id ON uploaded_files(team_member_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);