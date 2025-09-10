import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Database from 'sqlite3'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize SQLite database
const dbPath = process.env.DATABASE_PATH || './database.sqlite'
const db = new Database.Database(dbPath)

// Types
interface Project {
  id?: number;
  name: string;
  client_company?: string;
  rfp_content?: string;
  rfp_summary?: string;
  requirements_analysis?: string;
  created_at?: string;
  updated_at?: string;
}

interface TeamMember {
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

interface AnalysisResult {
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

// Database helper functions
const runQuery = (query: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
};

const getQuery = (query: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const allQuery = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Projects table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        client_company TEXT,
        rfp_content TEXT,
        rfp_summary TEXT,
        requirements_analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Team members table
    await runQuery(`
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
      )
    `);

    // Analysis results table
    await runQuery(`
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
      )
    `);

    // Uploaded files table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        team_member_id INTEGER,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        storage_key TEXT NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
      )
    `);

    // Insert initial seed data
    const projects = await allQuery('SELECT COUNT(*) as count FROM projects');
    if (projects[0].count === 0) {
      await runQuery(`
        INSERT INTO projects (name, client_company, rfp_content, rfp_summary, requirements_analysis) VALUES 
        ('AI 챗봇 개발', 'TechCorp', 'AI 기반 고객 상담 챗봇 시스템 구축 프로젝트', 'GPT 기반 챗봇 개발 및 시스템 통합', 'AI/ML 전문성, 웹 개발, API 통합 경험 필요'),
        ('ERP 시스템 구축', 'ManufacturingCo', '제조업 특화 ERP 시스템 개발', '제조업 프로세스 최적화를 위한 ERP 개발', 'ERP 경험, 제조업 도메인 지식, 데이터베이스 설계 필요')
      `);

      await runQuery(`
        INSERT INTO team_members (project_id, name, role, mbti, skills_extracted, experience_summary) VALUES 
        (1, '김민수', 'AI Engineer', 'INTP', 'Python, TensorFlow, NLP, API 개발', '3년 AI 개발 경험, 챗봇 프로젝트 2건'),
        (1, '이지영', 'Frontend Developer', 'ENFP', 'React, JavaScript, UI/UX, 반응형 웹', '4년 프론트엔드 개발, 10개 웹앱 구축'),
        (1, '박성호', 'Backend Developer', 'ISTJ', 'Node.js, Database, API, 클라우드', '5년 백엔드 개발, AWS 전문가'),
        (2, '최유진', 'ERP Consultant', 'ENTJ', 'ERP, SAP, 제조업, 프로세스 설계', '8년 ERP 컨설팅, 제조업 특화'),
        (2, '장민호', 'Database Architect', 'INTJ', 'PostgreSQL, Oracle, 데이터 모델링', '6년 DB 설계, 대용량 시스템 구축')
      `);

      await runQuery(`
        INSERT INTO analysis_results (project_id, team_chemistry_score, domain_coverage_score, technical_coverage_score, overall_fit_score, recommendations) VALUES 
        (1, 85.5, 90.0, 88.0, 87.8, 'AI 전문성과 웹 개발 역량이 우수함. 팀 케미스트리 향상을 위한 소통 강화 필요'),
        (2, 92.0, 95.0, 85.0, 90.7, 'ERP 및 제조업 도메인 전문성이 뛰어남. 기술 스택 업데이트 교육 권장')
      `);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// AI Service (mock implementation for Railway)
class AIService {
  async analyzeRFP(rfpContent: string): Promise<{summary: string, requirements: string[]}> {
    // Mock AI analysis since we don't have OpenAI API key in Railway by default
    return {
      summary: rfpContent.slice(0, 200) + '... (AI 분석 요약)',
      requirements: ['기술 스택 분석', '도메인 지식 요구', '프로젝트 관리 역량', '커뮤니케이션 스킬']
    };
  }

  async extractSkillsFromCD(cdContent: string): Promise<{skills: string[], experience: string}> {
    return {
      skills: ['추출된 스킬1', '추출된 스킬2', '추출된 스킬3'],
      experience: 'CD 카드 기반 경험 분석 결과'
    };
  }

  async analyzeTeamFit(projectRequirements: string[], teamMembers: any[]): Promise<{
    overall_score: number;
    domain_coverage: number;
    technical_coverage: number;
    recommendations: string;
    study_materials: string;
  }> {
    return {
      overall_score: 75 + Math.floor(Math.random() * 20),
      domain_coverage: 70 + Math.floor(Math.random() * 25),
      technical_coverage: 80 + Math.floor(Math.random() * 15),
      recommendations: '팀 구성이 전반적으로 우수합니다. 도메인 전문성 강화를 위한 추가 교육을 권장합니다.',
      study_materials: '프로젝트 관련 최신 기술 트렌드 학습과 도메인 지식 강화를 위한 온라인 코스를 추천합니다.'
    };
  }
}

// Team Analyzer
class TeamAnalyzer {
  async analyzeTeamChemistry(teamMembers: TeamMember[]): Promise<number> {
    if (teamMembers.length < 2) return 80;
    
    // Simple MBTI compatibility calculation
    let totalCompatibility = 0;
    let pairCount = 0;

    for (let i = 0; i < teamMembers.length; i++) {
      for (let j = i + 1; j < teamMembers.length; j++) {
        const mbti1 = teamMembers[i].mbti;
        const mbti2 = teamMembers[j].mbti;
        
        if (mbti1 && mbti2) {
          // Mock compatibility score
          totalCompatibility += 0.7 + Math.random() * 0.3;
          pairCount++;
        }
      }
    }

    if (pairCount === 0) return 75;
    return Math.round((totalCompatibility / pairCount) * 100);
  }

  calculateDomainCoverage(projectRequirements: string[], teamSkills: string[]): number {
    if (projectRequirements.length === 0) return 100;
    
    const normalizedRequirements = projectRequirements.map(r => r.toLowerCase());
    const normalizedSkills = teamSkills.map(s => s.toLowerCase());
    
    let coveredCount = 0;
    
    for (const requirement of normalizedRequirements) {
      const isSkillCovered = normalizedSkills.some(skill => 
        skill.includes(requirement) || requirement.includes(skill)
      );
      
      if (isSkillCovered) {
        coveredCount++;
      }
    }
    
    return Math.round((coveredCount / normalizedRequirements.length) * 100);
  }

  generateVisualizationData(projectRequirements: string[], teamMembers: TeamMember[], scores: any) {
    const radarCategories = ['AI/ML', '웹개발', '모바일', '클라우드', '데이터베이스', '보안', 'UI/UX', '프로젝트관리'];
    const projectScores = radarCategories.map(() => Math.floor(Math.random() * 40) + 60);
    const teamScores = radarCategories.map((_, i) => Math.min(projectScores[i] + Math.floor(Math.random() * 30) - 15, 100));

    const nodes = teamMembers.map(member => ({
      id: member.name || 'Unknown',
      name: member.name || 'Unknown', 
      mbti: member.mbti || 'XXXX'
    }));

    const edges: {source: string; target: string; compatibility: number}[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push({
          source: nodes[i].id,
          target: nodes[j].id,
          compatibility: 0.6 + Math.random() * 0.4
        });
      }
    }

    const categories = ['기술 역량', '도메인 지식', '프로젝트 경험', '팀워크', '리더십', '커뮤니케이션'];
    const coverageScores = [
      scores.technical,
      scores.domain,
      75 + Math.floor(Math.random() * 20),
      scores.chemistry,
      70 + Math.floor(Math.random() * 25),
      80 + Math.floor(Math.random() * 15)
    ];

    return {
      radar_chart: {
        labels: radarCategories,
        project_requirements: projectScores,
        team_capabilities: teamScores
      },
      mbti_compatibility: {
        nodes,
        edges
      },
      coverage_heatmap: {
        categories,
        coverage_scores: coverageScores
      }
    };
  }
}

// Create Hono app
const app = new Hono()

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Serve static files
app.use('/static/*', serveStatic({
  root: './public'
}))

// API Routes
app.get('/api/projects', async (c) => {
  try {
    const projects = await allQuery('SELECT * FROM projects ORDER BY created_at DESC');
    return c.json(projects);
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    return c.json({ error: '프로젝트 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.post('/api/projects', async (c) => {
  try {
    const body = await c.req.json();
    
    const result = await runQuery(
      'INSERT INTO projects (name, client_company, rfp_content) VALUES (?, ?, ?)',
      [body.name, body.client_company || null, body.rfp_content || null]
    );

    const projectId = result.lastID;

    // AI analysis
    let analysis = null;
    if (body.rfp_content) {
      const aiService = new AIService();
      try {
        analysis = await aiService.analyzeRFP(body.rfp_content);
        
        await runQuery(
          'UPDATE projects SET rfp_summary = ?, requirements_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [analysis.summary, JSON.stringify(analysis.requirements), projectId]
        );
      } catch (error) {
        console.error('RFP 분석 실패:', error);
      }
    }

    return c.json({ 
      id: projectId, 
      name: body.name,
      client_company: body.client_company,
      rfp_summary: analysis?.summary,
      requirements: analysis?.requirements
    });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    return c.json({ error: '프로젝트 생성 중 오류가 발생했습니다.' }, 500);
  }
});

app.get('/api/projects/:id', async (c) => {
  try {
    const projectId = c.req.param('id');

    const project = await getQuery('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    if (!project) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404);
    }

    const teamMembers = await allQuery('SELECT * FROM team_members WHERE project_id = ? ORDER BY created_at', [projectId]);
    const analysis = await getQuery('SELECT * FROM analysis_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1', [projectId]);

    return c.json({
      project,
      team_members: teamMembers,
      analysis: analysis || null
    });
  } catch (error) {
    console.error('프로젝트 상세 조회 오류:', error);
    return c.json({ error: '프로젝트 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.post('/api/team-members', async (c) => {
  try {
    const body = await c.req.json();

    const result = await runQuery(
      'INSERT INTO team_members (project_id, name, role, mbti) VALUES (?, ?, ?, ?)',
      [body.project_id, body.name, body.role, body.mbti || null]
    );

    return c.json({ 
      id: result.lastID,
      ...body
    });
  } catch (error) {
    console.error('팀원 추가 오류:', error);
    return c.json({ error: '팀원 추가 중 오류가 발생했습니다.' }, 500);
  }
});

app.post('/api/analyze-team', async (c) => {
  try {
    const body = await c.req.json();

    const project = await getQuery('SELECT * FROM projects WHERE id = ?', [body.project_id]);
    const teamMembers = await allQuery('SELECT * FROM team_members WHERE project_id = ?', [body.project_id]);

    if (!project) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404);
    }

    if (teamMembers.length === 0) {
      return c.json({ error: '분석할 팀원이 없습니다.' }, 400);
    }

    const aiService = new AIService();
    const teamAnalyzer = new TeamAnalyzer();

    let requirements: string[] = [];
    if (project.requirements_analysis) {
      try {
        requirements = JSON.parse(project.requirements_analysis);
      } catch {
        requirements = project.requirements_analysis.split(',').map((r: string) => r.trim());
      }
    }

    const chemistryScore = await teamAnalyzer.analyzeTeamChemistry(teamMembers);
    
    const allSkills = teamMembers
      .map(m => m.skills_extracted || '')
      .join(', ')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const domainCoverage = teamAnalyzer.calculateDomainCoverage(requirements, allSkills);
    const technicalCoverage = Math.min(domainCoverage + Math.floor(Math.random() * 20) - 10, 100);
    
    const aiAnalysis = await aiService.analyzeTeamFit(requirements, teamMembers);
    const overallScore = Math.round((chemistryScore + domainCoverage + technicalCoverage + aiAnalysis.overall_score) / 4);

    const visualizationData = teamAnalyzer.generateVisualizationData(
      requirements,
      teamMembers,
      {
        chemistry: chemistryScore,
        domain: domainCoverage,
        technical: technicalCoverage
      }
    );

    await runQuery(
      `INSERT INTO analysis_results (
        project_id, team_chemistry_score, domain_coverage_score, 
        technical_coverage_score, overall_fit_score, recommendations, study_materials
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.project_id,
        chemistryScore,
        domainCoverage, 
        technicalCoverage,
        overallScore,
        aiAnalysis.recommendations,
        aiAnalysis.study_materials
      ]
    );

    return c.json({
      team_chemistry_score: chemistryScore,
      domain_coverage_score: domainCoverage,
      technical_coverage_score: technicalCoverage,
      overall_fit_score: overallScore,
      recommendations: aiAnalysis.recommendations,
      study_materials: aiAnalysis.study_materials,
      visualization_data: visualizationData
    });
  } catch (error) {
    console.error('팀 분석 오류:', error);
    return c.json({ error: '팀 분석 중 오류가 발생했습니다.' }, 500);
  }
});

// Demo data generation endpoint
app.post('/api/demo/generate', async (c) => {
  try {
    // Sample project data (same as before)
    const sampleProjects = [
      {
        name: '📊 글로벌 제조업체 디지털 전환 전략',
        client_company: 'Global Manufacturing Corp',
        rfp_content: `전통적인 제조 공정을 Industry 4.0 기반으로 전환하는 디지털 혁신 컨설팅 프로젝트입니다.

주요 컨설팅 영역:
- 현재 업무 프로세스 분석 및 최적화
- IoT/AI 기반 스마트 팩토리 구축 전략
- 데이터 기반 의사결정 체계 수립
- 디지털 전환 로드맵 및 투자 계획
- 조직 변화 관리 및 교육 프로그램
- ROI 분석 및 성과 측정 지표 개발
- 글로벌 표준 프로세스 구축

프로젝트 규모: 12개월, 30억원
대상 공장: 국내외 15개 사업장`,
        requirements: ['디지털 전환', 'Industry 4.0', '프로세스 최적화', '변화관리', 'IoT/AI 전략', '데이터 분석', '조직 컨설팅', 'ROI 분석']
      },
      {
        name: '🏦 금융사 ESG 경영 컨설팅',  
        client_company: 'Korea Financial Group',
        rfp_content: `ESG(환경·사회·지배구조) 경영 체계 구축 및 지속가능경영 전략 수립 컨설팅입니다.

컨설팅 범위:
- ESG 현황 진단 및 Gap 분석
- ESG 전략 및 정책 수립
- 탄소중립 실행 계획 개발
- 사회적 가치 창출 프로그램 설계
- 지배구조 개선 방안
- ESG 성과지표(KPI) 체계 구축
- 이해관계자 소통 전략
- ESG 투자 및 상품 개발 전략

기대효과: ESG 평가 등급 상향, 브랜드 가치 제고
프로젝트 기간: 8개월`,
        requirements: ['ESG 경영', '지속가능경영', '탄소중립', '사회적 가치', '지배구조', '성과관리', '이해관계자 관리', '금융업 도메인']
      },
      {
        name: '🚀 스타트업 성장 전략 및 투자 유치',
        client_company: 'TechStart Ventures', 
        rfp_content: `AI 기반 핀테크 스타트업의 Series A 투자 유치 및 글로벌 진출 전략 컨설팅입니다.

컨설팅 서비스:
- 비즈니스 모델 검증 및 개선
- 시장 분석 및 경쟁사 벤치마킹
- 재무 모델링 및 투자 계획 수립
- 투자 유치 전략 및 IR 자료 제작
- 글로벌 진출 시장 분석
- 파트너십 및 제휴 전략
- 조직 구조 및 인재 채용 계획
- 규제 대응 및 컴플라이언스

목표: Series A 300억원 투자 유치
진출 목표: 동남아 3개국`,
        requirements: ['스타트업 전략', '투자유치', '비즈니스 모델', '시장분석', '재무모델링', '글로벌 진출', '핀테크', 'IR 전략']
      }
    ];

    // Sample team members for each project (consulting focused)
    const sampleTeamMembers = [
      // 디지털 전환 전략 팀
      [
        { name: '김민수', role: '디지털 전환 컨설턴트', mbti: 'ENTJ', skills: 'Industry 4.0, IoT 전략, 디지털 혁신, 프로세스 리엔지니어링', experience: '8년 제조업 디지털 전환, 대기업 스마트 팩토리 구축 15건' },
        { name: '이수정', role: '데이터 분석 전문가', mbti: 'INTJ', skills: ' 빅데이터 분석, AI/ML, 통계 모델링, 데이터 시각화', experience: '6년 데이터 컨설팅, 제조 데이터 분석 전문' },
        { name: '박영호', role: '변화관리 컨설턴트', mbti: 'ENFJ', skills: '조직 변화관리, 교육 프로그램 설계, 커뮤니케이션 전략', experience: '10년 조직 컨설팅, 대규모 변화관리 프로젝트 20건' },
        { name: '최혜진', role: '프로세스 혁신 전문가', mbti: 'ISTJ', skills: '프로세스 분석, 업무 최적화, 성과측정, 품질관리', experience: '7년 프로세스 컨설팅, 제조업 효율성 개선 전문' }
      ],
      // ESG 경영 컨설팅 팀  
      [
        { name: '정다영', role: 'ESG 전략 컨설턴트', mbti: 'INFJ', skills: 'ESG 전략, 지속가능경영, 탄소중립, 사회적 가치', experience: '5년 ESG 컨설팅, 금융권 ESG 체계 구축 전문' },
        { name: '송준혁', role: '환경경영 전문가', mbti: 'INTP', skills: '탄소배출 분석, 환경 리스크 관리, 녹색금융, 기후변화 대응', experience: '8년 환경 컨설팅, 탄소중립 로드맵 수립 12건' },
        { name: '한소라', role: '사회적 가치 컨설턴트', mbti: 'ESFP', skills: '사회공헌, 이해관계자 관리, 사회적 임팩트 측정', experience: '6년 CSV 컨설팅, 사회적 가치 프로그램 설계 전문' },
        { name: '윤재영', role: '지배구조 전문가', mbti: 'ESTJ', skills: '기업지배구조, 컴플라이언스, 위험관리, 내부통제', experience: '12년 지배구조 컨설팅, 금융권 거버넌스 구축 경험' }
      ],
      // 스타트업 성장 전략 팀
      [
        { name: '임창민', role: '경영전략 컨설턴트', mbti: 'ENTP', skills: '사업전략, 비즈니스 모델, 시장분석, 경쟁전략', experience: '9년 전략 컨설팅, 스타트업 성장 전략 수립 30건' },
        { name: '강은영', role: '투자유치 전문가', mbti: 'ENFP', skills: '투자유치, 재무모델링, IR 전략, 밸류에이션', experience: '7년 투자 컨설팅, 총 500억 투자유치 성공' },
        { name: '조성혁', role: '시장진출 전문가', mbti: 'ESTP', skills: '글로벌 진출, 해외시장 분석, 파트너십, 현지화 전략', experience: '8년 해외진출 컨설팅, 동남아 시장 진출 전문' },
        { name: '김나리', role: '핀테크 도메인 전문가', mbti: 'ISFJ', skills: '핀테크 트렌드, 금융 규제, 블록체인, 결제 시스템', experience: '6년 핀테크 컨설팅, 디지털 금융 서비스 기획 전문' }
      ]
    ];

    const createdProjects = [];
    
    // Create projects and team members
    for (let i = 0; i < sampleProjects.length; i++) {
      const project = sampleProjects[i];
      
      const projectResult = await runQuery(
        'INSERT INTO projects (name, client_company, rfp_content, rfp_summary, requirements_analysis) VALUES (?, ?, ?, ?, ?)',
        [
          project.name,
          project.client_company,
          project.rfp_content,
          project.rfp_content.split('\n')[0] + '...',
          JSON.stringify(project.requirements)
        ]
      );

      const projectId = projectResult.lastID;
      const teamMembers = sampleTeamMembers[i];
      
      const createdMembers = [];
      for (const member of teamMembers) {
        const memberResult = await runQuery(
          'INSERT INTO team_members (project_id, name, role, mbti, skills_extracted, experience_summary) VALUES (?, ?, ?, ?, ?, ?)',
          [projectId, member.name, member.role, member.mbti, member.skills, member.experience]
        );
        
        createdMembers.push({
          id: memberResult.lastID,
          ...member
        });
      }
      
      createdProjects.push({
        id: projectId,
        name: project.name,
        client_company: project.client_company,
        team_members: createdMembers
      });
    }

    return c.json({ 
      message: '데모 데이터가 성공적으로 생성되었습니다!',
      projects: createdProjects
    });
    
  } catch (error) {
    console.error('데모 데이터 생성 오류:', error);
    return c.json({ error: '데모 데이터 생성 중 오류가 발생했습니다.' }, 500);
  }
});

// Reset demo data endpoint
app.delete('/api/demo/reset', async (c) => {
  try {
    await runQuery('DELETE FROM analysis_results');
    await runQuery('DELETE FROM uploaded_files'); 
    await runQuery('DELETE FROM team_members');
    await runQuery('DELETE FROM projects');
    
    await runQuery('UPDATE SQLITE_SEQUENCE SET seq = 0 WHERE name = "projects"');
    await runQuery('UPDATE SQLITE_SEQUENCE SET seq = 0 WHERE name = "team_members"');
    await runQuery('UPDATE SQLITE_SEQUENCE SET seq = 0 WHERE name = "analysis_results"');
    await runQuery('UPDATE SQLITE_SEQUENCE SET seq = 0 WHERE name = "uploaded_files"');
    
    return c.json({ message: '데모 데이터가 초기화되었습니다.' });
    
  } catch (error) {
    console.error('데모 데이터 초기화 오류:', error);
    return c.json({ error: '데이터 초기화 중 오류가 발생했습니다.' }, 500);
  }
});

// Main page
app.get('/', (c) => {
  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI 기반 팀 분석 서비스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-lg border-b">
            <div class="max-w-6xl mx-auto px-4">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-users-gear text-2xl text-blue-600"></i>
                        <h1 class="text-2xl font-bold text-gray-800">AI 팀 분석 서비스</h1>
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-robot mr-1"></i>
                        Railway 배포 버전
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-6xl mx-auto px-4 py-8">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-magic mr-3 text-purple-600"></i>
                    프로젝트 팀 적합도 AI 분석
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
                    RFP 문서와 팀원 정보를 업로드하면 AI가 자동으로 프로젝트 적합도를 분석하고<br>
                    팀 케미스트리, 기술 커버리지, 추천 학습 자료를 제공합니다.
                </p>
                
                <div class="flex justify-center space-x-4 mb-8">
                    <button id="demoTestBtn" 
                            class="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg">
                        <i class="fas fa-flask mr-2"></i>
                        🚀 Demo Test 시작하기
                    </button>
                    <button id="resetDemoBtn" 
                            class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors">
                        <i class="fas fa-refresh mr-2"></i>
                        데모 초기화
                    </button>
                </div>
                
                <div id="demoInfo" class="hidden bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                    <div class="flex items-center justify-center">
                        <i class="fas fa-info-circle text-blue-600 mr-2"></i>
                        <span class="text-blue-800 font-medium">데모 모드: 샘플 프로젝트와 팀원이 자동 생성됩니다</span>
                    </div>
                </div>
            </div>

            <!-- 실제 프로젝트 생성 섹션 -->
            <div class="bg-white rounded-lg shadow-lg p-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-plus-circle mr-2 text-blue-600"></i>
                    새 프로젝트 생성
                </h3>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- 프로젝트 기본 정보 -->
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                            📋 프로젝트 정보
                        </h4>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">프로젝트명</label>
                                <input type="text" id="projectName" 
                                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="예: 글로벌 제조업체 디지털 전환 전략">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">고객사명</label>
                                <input type="text" id="clientCompany" 
                                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="예: Global Manufacturing Corp">
                            </div>
                        </div>
                    </div>
                    
                    <!-- RFP 내용 -->
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                            📄 RFP 내용
                        </h4>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">프로젝트 요구사항</label>
                                <textarea id="rfpContent" rows="6"
                                         class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                         placeholder="프로젝트의 주요 컨설팅 영역과 요구사항을 입력하세요...

예:
- 현재 업무 프로세스 분석 및 최적화
- 디지털 전환 전략 및 로드맵 수립
- 조직 변화관리 및 교육 프로그램
- 데이터 기반 의사결정 체계 구축
- ROI 분석 및 성과 측정 지표 개발"></textarea>
                            </div>
                            <button id="createProjectBtn" 
                                    class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-magic mr-2"></i>
                                프로젝트 생성 및 AI 분석
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 프로젝트 목록 섹션 -->
            <div class="mt-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-folder-open mr-2 text-blue-600"></i>
                    프로젝트 목록
                </h3>
                <div id="projectContainer" class="grid gap-6">
                    <!-- 프로젝트 목록이 여기에 동적으로 추가됩니다 -->
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-folder-open text-4xl mb-3"></i>
                        <p>프로젝트가 없습니다.</p>
                        <p class="text-sm mt-2">🚀 Demo Test로 샘플 프로젝트를 생성해보세요!</p>
                    </div>
                </div>
            </div>
            
            <!-- 프로젝트 상세 정보 섹션 -->
            <div id="projectDetails" class="hidden mt-8 bg-white rounded-lg shadow-lg p-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-info-circle mr-2 text-green-600"></i>
                    프로젝트 상세 정보
                </h3>
                <div id="projectDetailsContent">
                    <!-- 프로젝트 상세 내용이 여기에 동적으로 추가됩니다 -->
                </div>
            </div>
            
            <!-- 팀원 추가 섹션 -->
            <div id="addTeamMemberSection" class="hidden mt-8 bg-white rounded-lg shadow-lg p-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-user-plus mr-2 text-purple-600"></i>
                    팀원 추가
                </h3>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- 팀원 기본 정보 -->
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                            👤 기본 정보
                        </h4>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">이름</label>
                                <input type="text" id="memberName" 
                                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                       placeholder="예: 김민수">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">역할</label>
                                <select id="memberRole" 
                                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="">역할을 선택하세요</option>
                                    <option value="경영전략 컨설턴트">경영전략 컨설턴트</option>
                                    <option value="디지털 전환 컨설턴트">디지털 전환 컨설턴트</option>
                                    <option value="조직/HR 컨설턴트">조직/HR 컨설턴트</option>
                                    <option value="재무/회계 컨설턴트">재무/회계 컨설턴트</option>
                                    <option value="마케팅 컨설턴트">마케팅 컨설턴트</option>
                                    <option value="IT 컨설턴트">IT 컨설턴트</option>
                                    <option value="데이터 분석 전문가">데이터 분석 전문가</option>
                                    <option value="프로세스 혁신 전문가">프로세스 혁신 전문가</option>
                                    <option value="변화관리 컨설턴트">변화관리 컨설턴트</option>
                                    <option value="ESG 전략 컨설턴트">ESG 전략 컨설턴트</option>
                                    <option value="투자유치 전문가">투자유치 전문가</option>
                                    <option value="시장진출 전문가">시장진출 전문가</option>
                                    <option value="도메인 전문가">도메인 전문가</option>
                                    <option value="프로젝트 매니저">프로젝트 매니저</option>
                                    <option value="AI Engineer">AI Engineer</option>
                                    <option value="Frontend Developer">Frontend Developer</option>
                                    <option value="Backend Developer">Backend Developer</option>
                                    <option value="DevOps Engineer">DevOps Engineer</option>
                                    <option value="UI/UX Designer">UI/UX Designer</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">MBTI</label>
                                <select id="memberMbti" 
                                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="">MBTI를 선택하세요</option>
                                    <option value="INTJ">INTJ - 건축가</option>
                                    <option value="INTP">INTP - 논리술사</option>
                                    <option value="ENTJ">ENTJ - 통솔자</option>
                                    <option value="ENTP">ENTP - 변론가</option>
                                    <option value="INFJ">INFJ - 옹호자</option>
                                    <option value="INFP">INFP - 중재자</option>
                                    <option value="ENFJ">ENFJ - 선도자</option>
                                    <option value="ENFP">ENFP - 활동가</option>
                                    <option value="ISTJ">ISTJ - 현실주의자</option>
                                    <option value="ISFJ">ISFJ - 수호자</option>
                                    <option value="ESTJ">ESTJ - 경영자</option>
                                    <option value="ESFJ">ESFJ - 집정관</option>
                                    <option value="ISTP">ISTP - 만능재주꾼</option>
                                    <option value="ISFP">ISFP - 모험가</option>
                                    <option value="ESTP">ESTP - 사업가</option>
                                    <option value="ESFP">ESFP - 연예인</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 스킬 및 경험 -->
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                            🛠️ 스킬 & 경험
                        </h4>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">주요 스킬</label>
                                <input type="text" id="memberSkills" 
                                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                       placeholder="예: 디지털 전환 전략, 프로세스 리엔지니어링, 변화관리">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">경험 요약</label>
                                <textarea id="memberExperience" rows="4"
                                         class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                         placeholder="예: 8년 제조업 디지털 전환 컨설팅, 대기업 스마트 팩토리 구축 15건"></textarea>
                            </div>
                            <button id="addMemberBtn" 
                                    class="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors">
                                <i class="fas fa-user-plus mr-2"></i>
                                팀원 추가하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Enhanced demo functionality with loading and progress
            let currentProjects = [];
            let currentProject = null;
            let currentTeamMembers = [];

            function showLoading(message = '처리 중...') {
                const overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                overlay.innerHTML = \`
                    <div class="bg-white p-8 rounded-lg text-center max-w-md">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p class="text-gray-700">\${message}</p>
                    </div>
                \`;
                document.body.appendChild(overlay);
            }

            function hideLoading() {
                const overlay = document.getElementById('loadingOverlay');
                if (overlay) {
                    overlay.remove();
                }
            }

            function showNotification(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = \`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 \${
                    type === 'success' ? 'bg-green-500' : 
                    type === 'error' ? 'bg-red-500' : 
                    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                } text-white\`;
                notification.innerHTML = \`
                    <div class="flex items-center">
                        <i class="fas fa-\${
                            type === 'success' ? 'check-circle' : 
                            type === 'error' ? 'exclamation-circle' : 
                            type === 'warning' ? 'exclamation-triangle' : 'info-circle'
                        } mr-2"></i>
                        <span>\${message}</span>
                    </div>
                \`;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }

            async function loadProjects() {
                try {
                    const response = await axios.get('/api/projects');
                    currentProjects = response.data;
                    displayProjects(currentProjects);
                    
                    // Hide team member addition section
                    document.getElementById('addTeamMemberSection').classList.add('hidden');
                    document.getElementById('projectDetails').classList.add('hidden');
                } catch (error) {
                    console.error('프로젝트 로드 실패:', error);
                    showNotification('프로젝트를 불러오는데 실패했습니다.', 'error');
                }
            }

            function displayProjects(projects) {
                const container = document.getElementById('projectContainer');
                if (!container) return;

                if (projects.length === 0) {
                    container.innerHTML = \`
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-folder-open text-4xl mb-3"></i>
                            <p>프로젝트가 없습니다.</p>
                            <p class="text-sm mt-2">🚀 Demo Test로 샘플 프로젝트를 생성해보세요!</p>
                        </div>
                    \`;
                    return;
                }

                const demoIndicators = ['🤖', '📱', '🏥'];
                const hasDemoProjects = projects.some(p => demoIndicators.some(icon => p.name.includes(icon)));

                container.innerHTML = \`
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-list mr-2 text-blue-600"></i>
                        생성된 프로젝트 (\${projects.length}개)
                    </h3>
                    <div class="space-y-3">
                        \${projects.map(project => \`
                            <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors" 
                                 onclick="selectProject(\${project.id})">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <div class="flex items-center">
                                            <h5 class="font-semibold text-gray-800">\${project.name}</h5>
                                            \${hasDemoProjects && demoIndicators.some(icon => project.name.includes(icon)) ? 
                                                '<span class="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">DEMO</span>' : 
                                                ''}
                                        </div>
                                        \${project.client_company ? \`<p class="text-sm text-gray-600">\${project.client_company}</p>\` : ''}
                                        \${project.rfp_summary ? \`<p class="text-sm text-gray-500 mt-1">\${project.rfp_summary.slice(0, 100)}...</p>\` : ''}
                                    </div>
                                    <div class="text-right">
                                        <span class="text-xs text-gray-500">\${new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
                                        <div class="flex items-center mt-1">
                                            <i class="fas fa-arrow-right text-blue-600"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            }

            async function selectProject(projectId) {
                try {
                    showLoading('프로젝트 정보를 불러오는 중...');
                    
                    const response = await axios.get(\`/api/projects/\${projectId}\`);
                    const projectData = response.data;
                    
                    currentProject = projectData.project;
                    currentTeamMembers = projectData.team_members || [];
                    
                    hideLoading();
                    showProjectDetails(currentProject, currentTeamMembers, projectData.analysis);
                    
                    // Show team member addition section
                    document.getElementById('addTeamMemberSection').classList.remove('hidden');
                    
                } catch (error) {
                    hideLoading();
                    showNotification('프로젝트 조회 중 오류가 발생했습니다.', 'error');
                }
            }

            function showProjectDetails(project, teamMembers, analysis) {
                const container = document.getElementById('projectContainer');
                if (!container) return;

                container.innerHTML = \`
                    <div class="mb-6">
                        <button onclick="loadProjects()" class="text-blue-600 hover:text-blue-800 mb-4">
                            <i class="fas fa-arrow-left mr-1"></i> 프로젝트 목록으로
                        </button>
                        <h3 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-cog mr-2 text-blue-600"></i>
                            \${project.name}
                        </h3>
                        \${project.client_company ? \`<p class="text-gray-600">\${project.client_company}</p>\` : ''}
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div class="bg-blue-50 p-6 rounded-lg">
                            <h4 class="text-lg font-semibold mb-4 text-blue-800">
                                <i class="fas fa-users mr-2"></i>
                                팀 구성 (\${teamMembers.length}명)
                            </h4>
                            \${teamMembers.length === 0 ? 
                                '<p class="text-blue-700">팀원이 없습니다.</p>' :
                                teamMembers.map(member => \`
                                    <div class="bg-white p-3 rounded mb-2">
                                        <div class="flex items-center mb-1">
                                            <span class="font-medium">\${member.name}</span>
                                            <span class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">\${member.role}</span>
                                            \${member.mbti ? \`<span class="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">\${member.mbti}</span>\` : ''}
                                        </div>
                                        \${member.skills_extracted ? \`<p class="text-sm text-gray-600">스킬: \${member.skills_extracted}</p>\` : ''}
                                    </div>
                                \`).join('')
                            }
                            \${teamMembers.length > 0 ? \`
                                <button onclick="analyzeTeam(\${project.id})" 
                                        class="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                                    <i class="fas fa-brain mr-2"></i>
                                    AI 팀 분석 시작
                                </button>
                            \` : ''}
                        </div>

                        <div class="bg-green-50 p-6 rounded-lg">
                            <h4 class="text-lg font-semibold mb-4 text-green-800">
                                <i class="fas fa-file-alt mr-2"></i>
                                프로젝트 정보
                            </h4>
                            \${project.rfp_content ? \`
                                <div class="bg-white p-3 rounded mb-3">
                                    <h5 class="font-medium text-green-800 mb-2">RFP 내용</h5>
                                    <p class="text-sm text-gray-700">\${project.rfp_content.slice(0, 200)}...</p>
                                </div>
                            \` : ''}
                            \${project.requirements_analysis ? \`
                                <div class="bg-white p-3 rounded">
                                    <h5 class="font-medium text-green-800 mb-2">요구사항 분석</h5>
                                    <p class="text-sm text-gray-700">\${project.requirements_analysis}</p>
                                </div>
                            \` : ''}
                        </div>
                    </div>

                    \${analysis ? \`
                        <div id="analysisResults" class="bg-white p-6 rounded-lg border">
                            <h4 class="text-xl font-bold mb-4 text-purple-800">
                                <i class="fas fa-chart-line mr-2"></i>
                                AI 분석 결과
                            </h4>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div class="text-center p-4 bg-blue-100 rounded">
                                    <div class="text-2xl font-bold text-blue-800">\${Math.round(analysis.overall_fit_score || 0)}</div>
                                    <div class="text-sm text-blue-600">전체 적합도</div>
                                </div>
                                <div class="text-center p-4 bg-green-100 rounded">
                                    <div class="text-2xl font-bold text-green-800">\${Math.round(analysis.team_chemistry_score || 0)}</div>
                                    <div class="text-sm text-green-600">팀 케미스트리</div>
                                </div>
                                <div class="text-center p-4 bg-purple-100 rounded">
                                    <div class="text-2xl font-bold text-purple-800">\${Math.round(analysis.domain_coverage_score || 0)}</div>
                                    <div class="text-sm text-purple-600">도메인 커버리지</div>
                                </div>
                                <div class="text-center p-4 bg-orange-100 rounded">
                                    <div class="text-2xl font-bold text-orange-800">\${Math.round(analysis.technical_coverage_score || 0)}</div>
                                    <div class="text-sm text-orange-600">기술 커버리지</div>
                                </div>
                            </div>
                            \${analysis.recommendations ? \`
                                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                                    <h5 class="font-semibold text-yellow-800 mb-2">
                                        <i class="fas fa-lightbulb mr-2"></i>개선 권장사항
                                    </h5>
                                    <p class="text-yellow-700">\${analysis.recommendations}</p>
                                </div>
                            \` : ''}
                            \${analysis.study_materials ? \`
                                <div class="bg-green-50 border-l-4 border-green-400 p-4">
                                    <h5 class="font-semibold text-green-800 mb-2">
                                        <i class="fas fa-book mr-2"></i>추천 학습 자료
                                    </h5>
                                    <p class="text-green-700">\${analysis.study_materials}</p>
                                </div>
                            \` : ''}
                        </div>
                    \` : ''}
                \`;
            }

            async function analyzeTeam(projectId) {
                try {
                    showLoading('AI가 팀을 분석하고 있습니다... 잠시만 기다려주세요.');
                    
                    const response = await axios.post('/api/analyze-team', { project_id: projectId });
                    const analysis = response.data;
                    
                    hideLoading();
                    showNotification('팀 분석이 완료되었습니다!', 'success');
                    
                    // Reload project details to show analysis results
                    selectProject(projectId);
                    
                } catch (error) {
                    hideLoading();
                    showNotification('팀 분석 중 오류가 발생했습니다.', 'error');
                }
            }

            // Demo test functionality
            document.getElementById('demoTestBtn').addEventListener('click', async () => {
                if (confirm('🚀 데모 테스트를 시작하시겠습니까?\\n\\n📋 샘플 프로젝트 3개와 각각의 팀원들이 생성됩니다.\\n\\n체험 방법:\\n1️⃣ 생성된 프로젝트 중 하나를 클릭\\n2️⃣ 팀원 구성 확인\\n3️⃣ "AI 팀 분석 시작" 버튼 클릭\\n4️⃣ 분석 결과 확인')) {
                    try {
                        showLoading('📋 데모 데이터를 생성하고 있습니다...\\n\\n3개 프로젝트와 12명의 팀원을 만드는 중입니다\\n잠시만 기다려주세요 (약 5-10초)');
                        
                        const response = await axios.post('/api/demo/generate');
                        
                        showNotification('✨ 데모 데이터가 성공적으로 생성되었습니다!', 'success');
                        
                        // Show demo info
                        document.getElementById('demoInfo').classList.remove('hidden');
                        
                        // Load and display projects
                        await loadProjects();
                        
                        hideLoading();
                        
                        // Manual demo flow - let user experience each step
                        if (response.data.projects && response.data.projects.length > 0) {
                            showNotification('✨ 데모 데이터 생성 완료!\\n\\n이제 아래 단계를 직접 체험해보세요:\\n\\n1️⃣ 원하는 프로젝트를 클릭해서 선택하세요\\n2️⃣ 팀원 구성을 확인해보세요\\n3️⃣ "AI 팀 분석 시작" 버튼을 클릭해보세요', 'success');
                        }
                        
                    } catch (error) {
                        hideLoading();
                        showNotification('데모 데이터 생성 중 오류가 발생했습니다: ' + error.message, 'error');
                    }
                }
            });

            document.getElementById('resetDemoBtn').addEventListener('click', async () => {
                if (confirm('🗑️ 모든 데모 데이터를 삭제하시겠습니까?\\n\\n이 작업은 되돌릴 수 없습니다.')) {
                    try {
                        showLoading('데모 데이터를 초기화하고 있습니다...');
                        
                        await axios.delete('/api/demo/reset');
                        
                        // Hide demo info
                        document.getElementById('demoInfo').classList.add('hidden');
                        
                        // Clear project container
                        const container = document.getElementById('projectContainer');
                        if (container) {
                            container.innerHTML = \`
                                <div class="text-center py-8 text-gray-500">
                                    <i class="fas fa-folder-open text-4xl mb-3"></i>
                                    <p>프로젝트가 없습니다.</p>
                                    <p class="text-sm mt-2">🚀 Demo Test로 샘플 프로젝트를 생성해보세요!</p>
                                </div>
                            \`;
                        }
                        
                        hideLoading();
                        showNotification('모든 데모 데이터가 삭제되었습니다.', 'info');
                        
                    } catch (error) {
                        hideLoading();
                        showNotification('데이터 초기화 중 오류가 발생했습니다: ' + error.message, 'error');
                    }
                }
            });

            // Real project creation functionality
            document.getElementById('createProjectBtn').addEventListener('click', async () => {
                const projectName = document.getElementById('projectName').value.trim();
                const clientCompany = document.getElementById('clientCompany').value.trim();
                const rfpContent = document.getElementById('rfpContent').value.trim();

                if (!projectName) {
                    showNotification('프로젝트명을 입력해주세요.', 'error');
                    return;
                }

                if (!rfpContent) {
                    showNotification('RFP 내용을 입력해주세요.', 'error');
                    return;
                }

                try {
                    showLoading('프로젝트를 생성하고 AI 분석을 진행하고 있습니다...');
                    
                    const response = await axios.post('/api/projects', {
                        name: projectName,
                        client_company: clientCompany,
                        rfp_content: rfpContent
                    });

                    // Clear form
                    document.getElementById('projectName').value = '';
                    document.getElementById('clientCompany').value = '';
                    document.getElementById('rfpContent').value = '';

                    // Reload projects
                    await loadProjects();
                    
                    hideLoading();
                    showNotification('✅ 프로젝트가 성공적으로 생성되었습니다!\\n\\n프로젝트 목록에서 생성된 프로젝트를 클릭하여 팀원을 추가하세요.', 'success');

                } catch (error) {
                    hideLoading();
                    showNotification('프로젝트 생성 중 오류가 발생했습니다: ' + error.message, 'error');
                }
            });

            // Team member addition functionality
            document.getElementById('addMemberBtn').addEventListener('click', async () => {
                if (!currentProject) {
                    showNotification('먼저 프로젝트를 선택해주세요.', 'error');
                    return;
                }

                const name = document.getElementById('memberName').value.trim();
                const role = document.getElementById('memberRole').value;
                const mbti = document.getElementById('memberMbti').value;
                const skills = document.getElementById('memberSkills').value.trim();
                const experience = document.getElementById('memberExperience').value.trim();

                if (!name || !role || !mbti) {
                    showNotification('이름, 역할, MBTI는 필수 항목입니다.', 'error');
                    return;
                }

                try {
                    showLoading('팀원을 추가하고 있습니다...');
                    
                    const response = await axios.post('/api/team-members', {
                        project_id: currentProject.id,
                        name: name,
                        role: role,
                        mbti: mbti,
                        cd_card_content: skills + '\\n' + experience
                    });

                    // Clear form
                    document.getElementById('memberName').value = '';
                    document.getElementById('memberRole').value = '';
                    document.getElementById('memberMbti').value = '';
                    document.getElementById('memberSkills').value = '';
                    document.getElementById('memberExperience').value = '';

                    // Reload project details
                    await selectProject(currentProject.id);
                    
                    hideLoading();
                    showNotification('✅ 팀원이 성공적으로 추가되었습니다!\\n\\n팀 구성이 완료되면 "AI 팀 분석 시작" 버튼을 클릭하세요.', 'success');

                } catch (error) {
                    hideLoading();
                    showNotification('팀원 추가 중 오류가 발생했습니다: ' + error.message, 'error');
                }
            });

            // Initialize on page load
            document.addEventListener('DOMContentLoaded', () => {
                loadProjects();
            });
        </script>
    </body>
    </html>
  `;
  return c.html(html);
});

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`Server is running on port ${port}`);

// Initialize database and start server
initializeDatabase().then(() => {
  serve({
    fetch: app.fetch,
    port
  });
});

export default app;