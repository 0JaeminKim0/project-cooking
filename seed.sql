-- Insert sample projects
INSERT OR IGNORE INTO projects (id, name, client_company, rfp_content, rfp_summary, requirements_analysis) VALUES 
  (1, 'AI 챗봇 개발', 'TechCorp', 'AI 기반 고객 상담 챗봇 시스템 구축 프로젝트', 'GPT 기반 챗봇 개발 및 시스템 통합', 'AI/ML 전문성, 웹 개발, API 통합 경험 필요'),
  (2, 'ERP 시스템 구축', 'ManufacturingCo', '제조업 특화 ERP 시스템 개발', '제조업 프로세스 최적화를 위한 ERP 개발', 'ERP 경험, 제조업 도메인 지식, 데이터베이스 설계 필요');

-- Insert sample team members
INSERT OR IGNORE INTO team_members (id, project_id, name, role, mbti, skills_extracted, experience_summary) VALUES 
  (1, 1, '김민수', 'AI Engineer', 'INTP', 'Python, TensorFlow, NLP, API 개발', '3년 AI 개발 경험, 챗봇 프로젝트 2건'),
  (2, 1, '이지영', 'Frontend Developer', 'ENFP', 'React, JavaScript, UI/UX, 반응형 웹', '4년 프론트엔드 개발, 10개 웹앱 구축'),
  (3, 1, '박성호', 'Backend Developer', 'ISTJ', 'Node.js, Database, API, 클라우드', '5년 백엔드 개발, AWS 전문가'),
  (4, 2, '최유진', 'ERP Consultant', 'ENTJ', 'ERP, SAP, 제조업, 프로세스 설계', '8년 ERP 컨설팅, 제조업 특화'),
  (5, 2, '장민호', 'Database Architect', 'INTJ', 'PostgreSQL, Oracle, 데이터 모델링', '6년 DB 설계, 대용량 시스템 구축');

-- Insert sample analysis results
INSERT OR IGNORE INTO analysis_results (project_id, team_chemistry_score, domain_coverage_score, technical_coverage_score, overall_fit_score, recommendations) VALUES 
  (1, 85.5, 90.0, 88.0, 87.8, 'AI 전문성과 웹 개발 역량이 우수함. 팀 케미스트리 향상을 위한 소통 강화 필요'),
  (2, 92.0, 95.0, 85.0, 90.7, 'ERP 및 제조업 도메인 전문성이 뛰어남. 기술 스택 업데이트 교육 권장');