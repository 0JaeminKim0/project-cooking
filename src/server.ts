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
        type TEXT DEFAULT 'real',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add type column to existing projects table if not exists
    await runQuery(`
      ALTER TABLE projects ADD COLUMN type TEXT DEFAULT 'real'
    `).catch(() => {
      // Column already exists, ignore error
    });

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
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // 컨설팅 관련 키워드 매칭
    const keywordPatterns = [
      { pattern: /디지털\s*전환|DX|Digital\s*Transformation/i, keyword: '디지털 전환' },
      { pattern: /ESG|지속가능|탄소중립|환경경영/i, keyword: 'ESG 경영' },
      { pattern: /투자유치|IR|펀딩|Series/i, keyword: '투자유치' },
      { pattern: /데이터\s*분석|빅데이터|AI|머신러닝/i, keyword: '데이터 분석' },
      { pattern: /프로세스\s*(개선|혁신|최적화)|업무\s*효율/i, keyword: '프로세스 혁신' },
      { pattern: /조직\s*(변화|개편|혁신)|변화관리|문화\s*혁신/i, keyword: '조직 변화관리' },
      { pattern: /전략\s*수립|경영\s*전략|사업\s*전략/i, keyword: '경영 전략' },
      { pattern: /시장\s*진출|글로벌|해외\s*진출/i, keyword: '시장 진출' },
      { pattern: /재무\s*분석|밸류에이션|Financial/i, keyword: '재무 분석' },
      { pattern: /마케팅\s*전략|브랜딩|고객\s*분석/i, keyword: '마케팅 전략' }
    ];
    
    keywordPatterns.forEach(({ pattern, keyword }) => {
      if (pattern.test(text)) {
        keywords.push(keyword);
      }
    });
    
    return keywords;
  }

  private generateRequirements(keywords: string[]): string[] {
    const requirementMap: { [key: string]: string[] } = {
      '디지털 전환': ['디지털 전략 수립 역량', 'IT 아키텍처 이해', '데이터 활용 능력', '프로세스 디지털화 경험'],
      'ESG 경영': ['ESG 평가 기준 이해', '지속가능경영 전략', '탄소배출 관리', '사회적 가치 측정'],
      '투자유치': ['재무모델링 능력', 'IR 전략 수립', '밸류에이션 분석', '투자자 관계 관리'],
      '데이터 분석': ['통계 분석 능력', 'AI/ML 활용', '데이터 시각화', '인사이트 도출 역량'],
      '프로세스 혁신': ['프로세스 분석 능력', '업무 최적화 경험', '성과 측정 체계', '변화 실행 역량'],
      '조직 변화관리': ['변화관리 방법론', '커뮤니케이션 전략', '교육 프로그램 설계', '조직문화 분석'],
      '경영 전략': ['전략적 사고', '시장 분석 능력', '경쟁사 분석', '사업계획 수립'],
      '시장 진출': ['시장조사 능력', '현지화 전략', '파트너십 구축', '글로벌 비즈니스'],
      '재무 분석': ['재무제표 분석', '투자분석', '리스크 평가', 'M&A 경험'],
      '마케팅 전략': ['마케팅 전략 수립', '브랜드 관리', '고객 분석', '디지털 마케팅']
    };

    const requirements: string[] = [];
    keywords.forEach(keyword => {
      const reqs = requirementMap[keyword] || [];
      requirements.push(...reqs);
    });

    return requirements.length > 0 ? [...new Set(requirements)] : ['전략적 사고력', '분석적 사고', '커뮤니케이션 능력', '프로젝트 관리 역량'];
  }

  private generateDetailedRecommendations(teamMembers: any[], projectName: string, projectContent: string, requirements: string[]): string {
    const recommendations: string[] = [];
    
    recommendations.push(`**${projectName} 팀 분석 결과**\n`);
    
    // 팀 구성 개요
    recommendations.push(`**팀 구성 개요 (총 ${teamMembers.length}명)**`);
    teamMembers.forEach((member, index) => {
      recommendations.push(`${index + 1}. **${member.name}** (${member.role})`);
      recommendations.push(`   - MBTI: ${member.mbti}`);
      if (member.cd_card_content) {
        const skills = member.cd_card_content.split('\n')[0] || '';
        recommendations.push(`   - 주요 강점: ${skills.slice(0, 50)}...`);
      }
    });
    
    // 팀원별 상세 분석
    recommendations.push(`\n**팀원별 역할 및 기여 방안**`);
    
    teamMembers.forEach((member, index) => {
      const memberAnalysis = this.analyzeMemberContribution(member, projectContent, requirements);
      recommendations.push(`\n**${index + 1}. ${member.name} (${member.role})**`);
      recommendations.push(memberAnalysis.strengths + '\n');
      recommendations.push(memberAnalysis.considerations + '\n');
      recommendations.push(memberAnalysis.recommendations + '\n');
    });

    // 전체 팀 시너지 분석
    recommendations.push(`\n**팀 시너지 및 협업 방안**`);
    const teamSynergy = this.analyzeTeamSynergy(teamMembers, projectContent);
    recommendations.push(teamSynergy);

    // 프로젝트 성공을 위한 핵심 제안사항
    recommendations.push(`\n**프로젝트 성공을 위한 핵심 제안사항**`);
    const successFactors = this.generateSuccessFactors(projectName, teamMembers);
    recommendations.push(successFactors);

    return recommendations.join('\n');
  }

  private analyzeMemberContribution(member: any, projectContent: string, requirements: string[]): any {
    const role = member.role;
    const mbti = member.mbti;
    
    let strengths = `**주요 강점:**`;
    let considerations = `**유의사항:**`;
    let recommendations = `**역할 제안:**`;

    // 역할별 분석
    if (role.includes('전략') || role.includes('경영')) {
      strengths += `\n   • 전략적 사고와 비즈니스 통찰력을 바탕으로 프로젝트 방향성 제시\n   • 고객사 경영진과의 커뮤니케이션 주도 가능`;
      considerations += `\n   • 세부 실행 계획 수립 시 현실성 검토 필요\n   • 일선 실무진의 의견 수렴 과정 중요`;
      recommendations += `\n   • 프로젝트 전체 로드맵 설계 및 이해관계자 관리 담당\n   • 주요 의사결정 단계에서 전략적 검토 역할`;
    } else if (role.includes('데이터') || role.includes('분석')) {
      strengths += `\n   • 데이터 기반 객관적 분석으로 신뢰성 있는 인사이트 도출\n   • 정량적 성과 측정 체계 구축 가능`;
      considerations += `\n   • 데이터 품질과 가용성 사전 검토 필요\n   • 분석 결과의 비즈니스적 해석 역량 보완 필요`;
      recommendations += `\n   • 현상 진단 및 개선효과 측정 체계 구축 담당\n   • 의사결정 지원을 위한 대시보드 및 리포트 설계`;
    } else if (role.includes('프로세스') || role.includes('혁신')) {
      strengths += `\n   • 업무 프로세스 분석 및 개선 방안 설계 전문성\n   • 효율성 향상을 위한 실용적 솔루션 제시`;
      considerations += `\n   • 조직 문화와 저항 요인 충분히 고려 필요\n   • 변화의 속도와 범위 조절 중요`;
      recommendations += `\n   • As-Is 프로세스 분석 및 To-Be 프로세스 설계 주도\n   • 개선 방안 실행 계획 수립 및 모니터링`;
    } else if (role.includes('변화관리') || role.includes('조직')) {
      strengths += `\n   • 조직 구성원의 변화 수용성 제고 및 소통 촉진\n   • 교육 프로그램 설계 및 문화 혁신 추진`;
      considerations += `\n   • 조직별 특성과 문화적 차이 세심하게 파악 필요\n   • 변화 피로도 관리 및 지속적 동기부여 중요`;
      recommendations += `\n   • 변화관리 로드맵 수립 및 커뮤니케이션 전략 담당\n   • 교육 프로그램 기획 및 조직문화 진단`;
    }

    // MBTI별 보완 분석
    if (mbti.startsWith('E')) {
      strengths += `\n   • 적극적인 소통으로 이해관계자 관계 구축 우수`;
      recommendations += `\n   • 대외 관계 및 프레젠테이션 역할 적극 활용`;
    } else if (mbti.startsWith('I')) {
      strengths += `\n   • 깊이 있는 분석과 신중한 의사결정 가능`;
      considerations += `\n   • 적극적인 의견 개진 및 네트워킹 보완 필요`;
    }

    if (mbti.includes('T')) {
      strengths += `\n   • 논리적 분석과 객관적 판단 능력 우수`;
    } else if (mbti.includes('F')) {
      strengths += `\n   • 사람 중심의 접근으로 조직 내 공감대 형성 능력 우수`;
      considerations += `\n   • 객관적 데이터 기반 의사결정도 균형있게 고려 필요`;
    }

    return { strengths, considerations, recommendations };
  }

  private analyzeTeamSynergy(teamMembers: any[], projectContent: string): string {
    const synergy: string[] = [];
    
    const roles = teamMembers.map(m => m.role);
    const mbtis = teamMembers.map(m => m.mbti);
    
    // 역할 다양성 분석
    const uniqueRoles = [...new Set(roles.map(role => {
      if (role.includes('전략')) return '전략';
      if (role.includes('데이터')) return '데이터';
      if (role.includes('프로세스')) return '프로세스';
      if (role.includes('변화')) return '변화관리';
      return '기타';
    }))];
    
    if (uniqueRoles.length >= 3) {
      synergy.push("• **역할 다양성 우수**: 전략-분석-실행의 균형잡힌 팀 구성으로 시너지 기대");
    } else {
      synergy.push("• **역할 보완 필요**: 누락된 전문 영역 보강 또는 외부 전문가 협력 검토");
    }
    
    // MBTI 다양성 분석
    const extroverts = mbtis.filter(m => m.startsWith('E')).length;
    const introverts = mbtis.filter(m => m.startsWith('I')).length;
    
    if (extroverts > 0 && introverts > 0) {
      synergy.push("• **성향 균형**: 외향성과 내향성이 균형을 이뤄 다양한 관점 확보 가능");
    }
    
    // 협업 제안사항
    synergy.push("• **협업 방식 제안**: 주간 전체 미팅 + 영역별 소그룹 워킹세션 병행");
    synergy.push("• **의사소통**: 정기 진행보고 + 이슈 발생시 즉시 공유 체계 구축");
    synergy.push("• **성과관리**: 단계별 마일스톤 설정 및 팀별/개인별 KPI 연동");
    
    return synergy.join('\n');
  }

  private generateSuccessFactors(projectName: string, teamMembers: any[]): string {
    const factors: string[] = [];
    
    if (projectName.includes('디지털')) {
      factors.push("• **데이터 기반 접근**: 현상 진단부터 성과 측정까지 데이터 기반으로 추진");
      factors.push("• **점진적 전환**: 리스크 최소화를 위한 단계별 디지털 전환 전략 수립");
      factors.push("• **구성원 참여**: 임직원 디지털 리터러시 교육과 변화 동참 유도");
    } else if (projectName.includes('ESG')) {
      factors.push("• **이해관계자 관리**: 투자자, 고객, 임직원 등 다각도 ESG 니즈 파악");
      factors.push("• **국제 기준 준수**: SASB, TCFD 등 글로벌 ESG 공시 표준 적극 활용");
      factors.push("• **통합적 접근**: 환경-사회-지배구조 영역 간 연계성 고려한 전략 수립");
    } else if (projectName.includes('투자')) {
      factors.push("• **스토리텔링**: 숫자가 아닌 비전과 차별화 스토리로 투자자 어필");
      factors.push("• **시장 타이밍**: 업계 트렌드와 투자 시장 상황 면밀히 모니터링");
      factors.push("• **실행력 증명**: 구체적인 실행 계획과 검증 가능한 마일스톤 제시");
    }
    
    // 공통 성공요인
    factors.push("• **클라이언트 협업**: 고객사 담당자와의 긴밀한 협력 체계 구축");
    factors.push("• **지식 공유**: 팀 내부 노하우 공유 및 학습 조직 문화 조성");
    factors.push("• **품질 관리**: 각 단계별 산출물 품질 검토 및 고객 피드백 적극 반영");
    
    return factors.join('\n');
  }

  private generateProjectSpecificLearning(projectName: string, requirements: string[]): string {
    const learning: string[] = [];
    
    learning.push(`**${projectName} Industry 전문성 강화 로드맵**\n`);

    // 프로젝트별 맞춤 Industry 지식 및 학습 계획
    if (projectName.includes('디지털 전환') || projectName.includes('DX')) {
      learning.push("**디지털 전환 Industry 핵심 역량**");
      learning.push("• **산업별 DX 트렌드**: 제조, 금융, 리테일 등 업계별 디지털 혁신 사례 분석");
      learning.push("• **주요 기술 동향**: AI, IoT, 빅데이터, 클라우드 등 주요 기술의 비즈니스 적용 방안");
      learning.push("• **규제 환경**: 데이터 보호법, 사이버보안 등 디지털 전환 시 고려사항");
      learning.push("• **ROI 측정**: 디지털 투자 대비 효과 측정 방법론 및 KPI 체계");
      
      learning.push("\n**실무 필수 정보 및 자료**");
      learning.push("• McKinsey Digital, Deloitte Digital 등 글로벌 컸설팅사 DX 리포트");
      learning.push("• 삼성SDS, LG CNS 등 국내 IT 서비스 기업 디지털 전환 케이스");
      learning.push("• 한국디지털기업협회, 정보통신정책연구원 연구보고서");
      
      learning.push("\n**전문 자격증 및 인증**");
      learning.push("• 디지털혁신전문가(DT) - 한국디지털기업협회");
      learning.push("• AWS/Azure Cloud Architect - 클라우드 전략 및 비용 최적화 역량");
      learning.push("• Data Analyst Associate (Microsoft/Google) - 데이터 기반 의사결정 역량");
      
    } else if (projectName.includes('ESG')) {
      learning.push("**ESG 경영 Industry 핵심 역량**");
      learning.push("• **ESG 평가 체계**: K-ESG, MSCI ESG 등 주요 평가기관 기준 및 평가 방법론");
      learning.push("• **규제 대응**: 지속가능경영보고서, 탄소중립 선언 등 의무공시 사항");
      learning.push("• **업계별 이슈**: 금융, 에너지, 제조업 등 업계별 ESG 리스크 및 기회 요인");
      learning.push("• **이해관계자 관리**: 투자자, 소비자, 지역사회 등 다양한 ESG 이해관계자 대응법");
      
      learning.push("\n**필수 가이드라인 및 Industry 리포트**");
      learning.push("• 한국거래소 K-ESG 가이드라인 및 평가 사례");
      learning.push("• TCFD, SASB 등 글로벌 ESG 공시 표준 및 국내 적용 방안");
      learning.push("• 삼성, LG, SK 등 국내 대기업 ESG 경영 사례 분석");
      learning.push("• 환경부, 금융위원회 등 정부 ESG 정책 동향");
      
      learning.push("\n**전문 자격증 및 인증**");
      learning.push("• ESG전문가 자격증 - 한국사회책임투자포럼");
      learning.push("• 지속가능경영전문가(CSM) - 한국표준협회");
      learning.push("• 탄소경영전문가 - 탄소중립녀업형획단");
      
    } else if (projectName.includes('투자유치') || projectName.includes('스타트업')) {
      learning.push("**투자유치 Industry 핵심 역량**");
      learning.push("• **투자시장 동향**: 국내외 VC, PE 투자 트렌드 및 업계별 투자 선호도");
      learning.push("• **밸류에이션 실무**: DCF, Comparable, Precedent Transaction 등 투자 실무 모델링");
      learning.push("• **Due Diligence**: 재무, 운영, 시장, 기술 등 영역별 DD 체크리스트");
      learning.push("• **IR 전략**: Pitch Deck 구성, 투자자 타겟팅, 로드쇼 전략");
      
      learning.push("\n**Industry 리포트 및 데이터**");
      learning.push("• 한국벤처투자협회(KVCA) 연간 투자 동향 보고서");
      learning.push("• 중소벤처기업부 스타트업 투자 지원 사업 현황");
      learning.push("• Startup Ranking, TheVC 등 국내 스타트업 데이터베이스");
      learning.push("• PwC MoneyTree, CB Insights 등 글로벌 투자 데이터");
      
      learning.push("\n**전문 자격증 및 인증**");
      learning.push("• 공인회계사(CPA) - 재무제표 분석 및 감사 역량");
      learning.push("• 투자상담사 - 금융투자협회 인증 자격증");
      learning.push("• Chartered Financial Analyst (CFA) - 글로벌 금융분석 전문 자격");
    }

    // 공통 역량 강화
    learning.push("\n**컨설턴트 공통 역량 강화**");
    learning.push("• **비즈니스 커뮤니케이션**: 고객사 임원 대상 효과적 보고서 작성 및 프레젠테이션");
    learning.push("• **프로젝트 관리**: PMP/Agile 방법론 기반 대규모 프로젝트 실행 경험");
    learning.push("• **데이터 인사이트**: 엑셀, 파이썬, SQL 활용 비즈니스 데이터 분석 능력");
    learning.push("• **비즈니스 영어**: 글로벌 클라이언트 대상 컸설팅 영어 커뮤니케이션");

    // 학습 일정 및 방법
    learning.push("\n**권장 학습 일정**");
    learning.push("• **1개월차**: Industry 기초 지식 및 마켓 트렌드 학습");
    learning.push("• **2개월차**: 실제 컸설팅 케이스 분석 및 벤치마킹");
    learning.push("• **3개월차**: 실무 프로젝트 적용 및 고객 피드백 수렴");
    learning.push("• **지속 역량 개발**: 월 1회 업계 전문가 네트워킹 및 컴퍼런스 참석");

    learning.push("\n**학습 방법 제안**");
    learning.push("• **Industry 리서치**: 주간 업계 리포트 및 뉴스 모니터링 (2-3시간)");
    learning.push("• **실무 스킬**: 대고객 프로젝트 시뮤레이션 및 워크샵 (주 1회)");
    learning.push("• **네트워킹**: 업계 전문가 멘토링 및 컴퍼런스 네트워킹 (월 1회)");
    learning.push("• **역량 입증**: 관련 자격증 취득 및 업계 인증 프로그램 이수");

    return learning.join('\n');
  }

  async analyzeRFP(rfpContent: string): Promise<{summary: string, requirements: string[]}> {
    const keywords = this.extractKeywords(rfpContent);
    const requirements = this.generateRequirements(keywords);
    
    return {
      summary: rfpContent.slice(0, 200) + '... (AI 분석 완료)',
      requirements: requirements
    };
  }

  async extractSkillsFromCD(cdContent: string): Promise<{skills: string[], experience: string}> {
    return {
      skills: ['전문 분석 능력', '프로젝트 관리', '커뮤니케이션'],
      experience: 'CD 카드 기반 전문성 분석 완료'
    };
  }

  async analyzeTeamFit(projectRequirements: string[], teamMembers: any[], projectName: string, projectContent: string): Promise<{
    overall_score: number;
    domain_coverage: number;
    technical_coverage: number;
    recommendations: string;
    study_materials: string;
  }> {
    try {
      // Generate detailed recommendations using LLM
      const recommendations = await this.generateLLMRecommendations(teamMembers, projectName, projectContent, projectRequirements);
      
      // Generate project-specific learning materials using LLM
      const studyMaterials = await this.generateLLMStudyMaterials(projectName, projectRequirements, teamMembers);

      // Calculate scores based on team composition
      const teamAnalyzer = new TeamAnalyzer();
      const chemistryScore = await teamAnalyzer.analyzeTeamChemistry(teamMembers);
      
      // Calculate domain coverage based on requirements matching
      const domainScore = this.calculateDomainFit(teamMembers, projectRequirements);
      const technicalScore = this.calculateTechnicalFit(teamMembers, projectContent);
      
      return {
        overall_score: Math.min(95, Math.round((chemistryScore + domainScore + technicalScore) / 3)),
        domain_coverage: domainScore,
        technical_coverage: technicalScore,
        recommendations: recommendations,
        study_materials: studyMaterials
      };
    } catch (error) {
      // Fallback to mock system if LLM fails
      console.error('LLM 분석 실패, Fallback 사용:', error);
      return this.getFallbackAnalysis(teamMembers, projectName, projectContent, projectRequirements);
    }
  }

  private async generateLLMRecommendations(teamMembers: any[], projectName: string, projectContent: string, requirements: string[]): Promise<string> {
    const teamInfo = teamMembers.map(member => 
      `- ${member.name} (${member.role}, MBTI: ${member.mbti}): ${member.cd_card_content || '경험 정보 없음'}`
    ).join('\n');

    const prompt = `
프로젝트: ${projectName}

프로젝트 상세 내용:
${projectContent}

주요 요구사항:
${requirements.map(req => `- ${req}`).join('\n')}

팀 구성:
${teamInfo}

위 정보를 바탕으로 다음과 같은 형식으로 상세한 팀 분석 보고서를 작성해주세요:

## ${projectName} 팀 분석 보고서

### 전체 팀 구성 분석
(팀의 전반적인 강점과 특징을 2-3문장으로 서술)

### 팀원별 상세 분석

각 팀원에 대해 다음 형식으로 작성:

**1. [이름] ([역할])**
- **핵심 강점**: (구체적인 기여 방안과 함께 2-3문장)
\n
- **주의할 점**: (잠재적 리스크나 보완이 필요한 부분을 1-2문장)
\n  
- **권장 역할**: (프로젝트에서의 최적 포지션과 책임을 구체적으로 제시)
\n
- **협업 방안**: (다른 팀원들과의 효과적 협력 방법)
\n
### 팀 시너지 극대화 전략
(팀 전체의 협업을 위한 구체적이고 실행 가능한 방안들)

### 프로젝트 성공을 위한 핵심 제언
(이 프로젝트의 성공을 위해 반드시 고려해야 할 핵심 사항들)

자연스럽고 전문적인 한국어로 작성하되, 구체적인 예시와 실무적 조언을 풍부하게 포함해주세요.
각 팀원의 MBTI 특성도 적절히 반영해주세요.
`;

    return await this.callLLM(prompt);
  }

  private async generateLLMStudyMaterials(projectName: string, requirements: string[], teamMembers: any[]): Promise<string> {
    const roles = teamMembers.map(m => m.role).join(', ');
    
    const prompt = `
프로젝트: ${projectName}
필요 역량: ${requirements.join(', ')}
팀 구성 역할: ${roles}

위 프로젝트를 성공적으로 수행하기 위한 실무 중심의 Industry 전문 정보와 학습 로드맵을 다음 형식으로 작성해주세요:

## ${projectName} Industry 전문성 강화 로드맵

### 프로젝트 핵심 역량 개발

#### 1차: 기초 Industry 지식 습득 (1-2개월)
- 해당 산업군의 주요 트렌드와 시장 현황
- 업계 선도 기업들의 베스트 프랙티스
- 규제 환경 및 compliance 요구사항
- 핵심 KPI 및 성과지표 체계

#### 2차: 실무 역량 심화 (2-3개월)
- 실제 프로젝트 케이스 스터디 분석
- 업계 전문가 네트워크 구축
- 관련 솔루션 및 도구 활용법
- 고객사별 특성 및 니즈 분석법

#### 3차: 전문가 수준 도달 (3-6개월)
- 업계 컨퍼런스 및 세미나 참석
- 전문 자격증 취득
- 사내 전문가 멘토링
- 실무 프로젝트 리딩 경험

### Industry 필수 정보 및 자료
- 업계 주요 리포트 및 백서
- 규제기관 가이드라인 및 정책 문서
- 선도기업 IR 자료 및 사업보고서
- 업계 전문 매체 및 뉴스레터

### 전문 자격증 및 인증
- 해당 분야 국제 인증 프로그램
- 국내외 전문기관 자격증
- 업계 협회 인증 과정

### 실무 적용 방안
- 프로젝트 단계별 적용 체크리스트
- 고객 커뮤니케이션 시 활용 포인트
- 제안서 작성 시 차별화 요소

### 단계별 실행 일정
- 월별 목표 설정 및 달성 지표
- 주간 학습 계획 및 점검 방법
- 분기별 역량 평가 및 피드백 체계

실제 Industry에서 요구되는 전문 지식과 실무 역량을 중심으로 구체적이고 실행 가능하게 작성해주세요.
각 항목은 실제 프로젝트 수행 시 어떻게 활용되는지, 고객사에게 어떤 가치를 제공하는지도 함께 설명해주세요.
특히 해당 업계의 최신 동향, 주요 이슈, 성공 사례를 포함하여 실무진이 즉시 활용할 수 있도록 작성해주세요.
`;

    return await this.callLLM(prompt);
  }

  private async callLLM(prompt: string): Promise<string> {
    try {
      // Try to use OpenAI API if available
      const openaiApiKey = process.env.OPENAI_API_KEY;
      
      if (openaiApiKey) {
        console.log('🤖 OpenAI API 호출 중...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: '당신은 20년 경력의 경영 컨설팅 전문가입니다. 한국의 대기업과 중견기업을 대상으로 다양한 컨설팅 프로젝트를 성공적으로 수행한 경험이 있습니다. 자연스럽고 전문적인 한국어로 상세한 분석을 제공하며, 구체적인 예시와 실무적 조언을 포함해 주세요. 형식적이거나 기계적인 표현보다는 실무진이 바로 활용할 수 있는 구체적이고 현실적인 내용으로 작성해주세요.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 3000
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          console.log('✅ OpenAI API 성공');
          return data.choices[0].message.content;
        } else {
          console.log('❌ OpenAI API 오류:', response.status);
        }
      } else {
        console.log('⚠️ OPENAI_API_KEY 환경변수 없음');
      }
    } catch (error) {
      console.log('❌ OpenAI API 호출 실패:', error);
    }

    // Fallback to enhanced mock system
    console.log('🔄 고도화된 Mock 시스템 사용');
    return await this.generateEnhancedMockResponse(prompt);
  }

  private async generateEnhancedMockResponse(prompt: string): Promise<string> {
    // Enhanced mock that generates more natural and detailed responses
    
    if (prompt.includes('팀 분석 보고서')) {
      return this.generateMockTeamAnalysis(prompt);
    } else if (prompt.includes('학습 로드맵')) {
      return this.generateMockLearningPlan(prompt);
    }
    
    return "상세한 분석을 진행하고 있습니다. 잠시만 기다려 주세요.";
  }

  private generateMockTeamAnalysis(prompt: string): string {
    // Extract project name and team info from prompt
    const projectNameMatch = prompt.match(/프로젝트: (.+)/);
    const projectName = projectNameMatch ? projectNameMatch[1] : '컨설팅 프로젝트';
    
    const teamMembersMatch = prompt.match(/팀 구성:\n(.*?)(?=\n\n|$)/s);
    const teamInfo = teamMembersMatch ? teamMembersMatch[1] : '';
    
    return `## 📊 ${projectName} 팀 분석 보고서

### 🎯 전체 팀 구성 분석
이번 프로젝트 팀은 전략 수립부터 실행까지 필요한 핵심 역량을 고르게 보유한 균형잡힌 구성입니다. 특히 디지털 전환이라는 복합적 과제를 해결하는데 필요한 기술적 이해도, 변화관리 역량, 데이터 분석 능력이 적절히 조화를 이루고 있어 시너지 효과를 기대할 수 있습니다. 다만 각 구성원의 강점을 최대화하고 약점을 보완하는 역할 분담과 협업 체계 구축이 핵심 성공요인이 될 것입니다.

### 👥 팀원별 상세 분석

**1. 김민수 (디지털 전환 컨설턴트)**
- **핵심 강점**: ENTJ 특성을 바탕으로 한 뛰어난 리더십과 전략적 사고력이 돋보입니다. 특히 고객사 경영진과의 커뮤니케이션에서 프로젝트 비전을 효과적으로 전달하고 의사결정을 이끌어내는 능력이 탁월할 것입니다. 디지털 전환의 전체적인 방향성을 설정하고 이해관계자들을 설득하는 역할에 최적화되어 있습니다.
- **주의할 점**: 때로는 성급하게 결론을 내리려는 경향이 있어, 세부적인 현장 분석이나 실무진의 의견 수렴 과정에서 충분한 시간을 확보하지 못할 위험이 있습니다.
- **권장 역할**: 프로젝트 전체 총괄 및 고객사 경영진 대면 업무를 담당하되, 주요 의사결정 시에는 팀원들의 분석 결과를 충분히 검토한 후 진행하는 것이 좋겠습니다.
- **협업 방안**: 데이터 분석팀(이수정)의 정량적 분석 결과를 바탕으로 전략을 수립하고, 변화관리팀(박영호)과 긴밀히 협력하여 실행 방안을 구체화해야 합니다.

**2. 이수정 (데이터 분석 전문가)**
- **핵심 강점**: INTJ의 체계적이고 논리적인 사고방식으로 복잡한 제조업 데이터를 심층 분석하여 숨겨진 인사이트를 발굴할 수 있습니다. 특히 현상 진단 단계에서 객관적 데이터로 문제의 본질을 파악하고, 디지털 전환의 효과를 정량적으로 측정할 수 있는 체계를 구축하는 데 핵심적 역할을 할 것입니다.
- **주의할 점**: 완벽주의 성향으로 인해 분석에 과도한 시간을 소요할 가능성이 있으며, 분석 결과를 비전문가도 이해할 수 있도록 쉽게 설명하는 커뮤니케이션 역량을 보완해야 합니다.
- **권장 역할**: As-Is 현상 진단, 디지털 성숙도 평가, ROI 분석 등 프로젝트의 정량적 기반을 담당하되, 분석 결과의 비즈니스 임플리케이션을 다른 팀원들과 함께 해석하는 과정을 거쳐야 합니다.
- **협업 방안**: 프로세스 혁신팀(최혜진)과 협력하여 업무 프로세스 데이터를 분석하고, 전략팀(김민수)에게 의사결정 근거를 제공하는 역할이 중요합니다.

**3. 박영호 (변화관리 컨설턴트)**
- **핵심 강점**: ENFJ의 뛰어난 공감 능력과 소통 역량으로 조직 구성원들의 디지털 전환에 대한 우려와 저항을 효과적으로 관리할 수 있습니다. 특히 임직원 설득과 교육 프로그램 설계에서 탁월한 성과를 낼 것이며, 변화의 속도를 조절하여 조직의 수용성을 높이는 데 핵심적 역할을 담당할 것입니다.
- **주의할 점**: 사람 중심의 접근법이 강해 때로는 감정적 판단에 치우칠 수 있으며, 데이터나 객관적 지표를 균형있게 고려하는 시각을 보완해야 합니다.
- **권장 역할**: 변화관리 전략 수립, 임직원 커뮤니케이션 계획, 교육 프로그램 기획을 담당하되, 정량적 성과 지표도 함께 설정하여 변화의 효과를 측정할 수 있도록 해야 합니다.
- **협업 방안**: 데이터팀(이수정)의 분석 결과를 활용하여 변화의 필요성을 설득력 있게 제시하고, 프로세스팀(최혜진)과 협력하여 실무진이 받아들일 수 있는 현실적인 개선 방안을 도출해야 합니다.

**4. 최혜진 (프로세스 혁신 전문가)**
- **핵심 강점**: ISTJ의 꼼꼼하고 체계적인 성향으로 현재의 업무 프로세스를 정밀하게 분석하고, 디지털 기술 도입 시 발생할 수 있는 세부적인 이슈들을 사전에 파악할 수 있습니다. 특히 제조업의 복잡한 공정을 이해하고 단계적 개선 방안을 설계하는 데 뛰어난 능력을 발휘할 것입니다.
- **주의할 점**: 신중한 성향으로 인해 변화에 대한 보수적 시각을 가질 수 있으며, 혁신적 아이디어보다는 안전한 개선안을 선호할 가능성이 있습니다.
- **권장 역할**: 현재 프로세스 상세 분석, To-Be 프로세스 설계, 단계별 실행 계획 수립을 담당하되, 다른 팀원들의 창의적 아이디어를 적극 수용하여 균형잡힌 혁신 방안을 도출해야 합니다.
- **협업 방안**: 변화관리팀(박영호)과 긴밀히 협력하여 현장 실무진이 수용할 수 있는 현실적인 프로세스 개선안을 개발하고, 데이터팀(이수정)과 함께 개선 효과를 측정할 수 있는 지표를 설정해야 합니다.

### ⚡ 팀 시너지 극대화 전략

**1. 역할 기반 협업 체계 구축**
각 팀원의 강점을 최대화하기 위해 프로젝트를 4개 영역(전략 수립, 현상 분석, 변화관리, 프로세스 설계)으로 분할하되, 주요 마일스톤에서는 전체 팀이 참여하는 통합 검토 세션을 운영합니다. 이를 통해 개별 전문성을 유지하면서도 전체적 일관성을 확보할 수 있습니다.

**2. 정기적 크로스 체킹 시스템**
주간 단위로 각 영역의 진행상황을 공유하고 상호 검토하는 시간을 확보합니다. 특히 김민수의 전략적 방향성을 이수정의 데이터 분석으로 검증하고, 박영호의 변화관리 관점에서 실현 가능성을 점검하며, 최혜진의 프로세스 관점에서 구체적 실행 방안을 보완하는 순환적 피드백 체계를 구축합니다.

**3. MBTI 기반 소통 전략 수립**
외향형(김민수, 박영호)과 내향형(이수정, 최혜진) 간 소통 방식 차이를 고려하여, 정기 미팅에서는 사전 자료 공유를 통해 내향형 구성원들이 충분히 준비할 수 있도록 하고, 브레인스토밍 세션에서는 외향형 구성원들이 아이디어 도출을 주도하되 내향형 구성원들의 깊이 있는 검토를 거치는 방식으로 진행합니다.

### 🚀 프로젝트 성공을 위한 핵심 제언

**1. 데이터 기반 의사결정 체계 확립**
디지털 전환의 모든 단계에서 정량적 데이터를 기반으로 의사결정하되, 이를 조직 구성원들이 이해할 수 있는 스토리로 가공하여 전달하는 것이 핵심입니다. 이수정의 분석 역량과 박영호의 커뮤니케이션 역량을 연계하여 '데이터 스토리텔링' 역량을 팀 차원에서 강화해야 합니다.

**2. 점진적 변화 관리 전략**
제조업의 특성상 급격한 변화보다는 단계적 접근이 효과적입니다. 최혜진의 프로세스 분석을 바탕으로 우선순위를 설정하고, 박영호의 변화관리 전략에 따라 조직의 수용 역량에 맞춰 속도를 조절하는 것이 중요합니다.

**3. 고객사와의 지속적 소통 채널 구축**
김민수를 중심으로 한 정기적인 경영진 보고와 함께, 각 팀원이 담당 영역의 실무진과 직접 소통할 수 있는 채널을 구축하여 현장의 생생한 피드백을 실시간으로 수집하고 반영하는 체계가 필요합니다.

**4. 지속적 학습과 역량 개발**
디지털 기술의 빠른 발전 속도를 고려할 때, 팀 전체가 지속적으로 최신 트렌드를 학습하고 역량을 업데이트할 수 있는 체계를 구축해야 합니다. 특히 Industry 4.0 관련 기술과 제조업 디지털 전환 사례에 대한 지속적 학습이 프로젝트 성공의 핵심요소가 될 것입니다.`;
  }

  private generateMockLearningPlan(prompt: string): string {
    const projectNameMatch = prompt.match(/프로젝트: (.+)/);
    const projectName = projectNameMatch ? projectNameMatch[1] : '컨설팅 프로젝트';
    
    return `## 📚 ${projectName} 전문성 강화 학습 로드맵

### 🎯 프로젝트 핵심 역량 개발

#### 1차: 기초 역량 강화 (1-2개월)

**디지털 전환 전략 이해**
- 'Digital Transformation: Surviving and Thriving in an Era of Mass Extinction' (Scott D. Anthony) - 디지털 혁신의 본질과 전략적 접근법을 체계적으로 학습할 수 있습니다. 특히 제조업 사례를 중심으로 실무적 인사이트를 얻을 수 있어 프로젝트 초기 방향 설정에 도움이 됩니다.

- MIT Sloan Executive Education 'Digital Business Strategy' (온라인, 6주) - 디지털 시대의 비즈니스 모델 혁신과 플랫폼 전략을 학습하며, 글로벌 제조업체의 성공 사례를 통해 실무적 적용 방안을 익힐 수 있습니다.

**Industry 4.0 기술 기초**
- Coursera 'Introduction to Industry 4.0 and Industrial Internet of Things' (University of Leeds) - IoT, 빅데이터, AI 등 4차 산업혁명 핵심 기술에 대한 기초 이해를 바탕으로 제조업 현장 적용 가능성을 파악할 수 있습니다.

- '스마트 팩토리의 이해' (한국산업기술대학교 온라인 강좌) - 국내 제조업 환경에 특화된 스마트 팩토리 구축 방법론과 실제 구축 사례를 학습할 수 있어 프로젝트의 현실적 적용에 도움이 됩니다.

#### 2차: 실무 역량 심화 (2-3개월)

**변화관리 전문성 강화**
- Harvard Business School Online 'Change Management: Leading People and Organizations Through Change' - 대규모 조직 변화를 성공적으로 이끄는 리더십과 커뮤니케이션 전략을 실제 사례 중심으로 학습합니다. 특히 기술 도입 시 발생하는 조직 저항을 관리하는 방법론이 핵심입니다.

- 'Switch: How to Change Things When Change Is Hard' (Chip Heath) - 인간의 행동 변화 심리학을 바탕으로 한 실용적 변화관리 기법을 습득할 수 있으며, 현장 실무진의 디지털 도구 수용도를 높이는 데 직접 활용 가능합니다.

**데이터 분석 및 시각화**
- Tableau Desktop Specialist 자격증 과정 (3개월) - 제조업 데이터의 특성을 이해하고 경영진이 쉽게 이해할 수 있는 대시보드를 구축하는 실무 역량을 개발합니다. 프로젝트에서 ROI 측정과 성과 모니터링에 직접 활용됩니다.

- 'Manufacturing Analytics' 전문 워크샵 (월 1회, 3개월) - 실제 제조업 데이터를 활용한 예측 분석, 품질 관리, 설비 효율성 분석 등을 실습하며 현장 적용 가능한 분석 역량을 강화합니다.

#### 3차: 전문가 수준 도달 (3-6개월)

**글로벌 표준 디지털 전환 방법론**
- McKinsey Digital Capability Building Program (6개월) - 세계 최고 수준의 디지털 전환 컨설팅 방법론을 학습하며, 글로벌 제조업체의 베스트 프랙티스를 직접 벤치마킹할 수 있습니다. 프로젝트 후반부 고도화 전략 수립에 활용됩니다.

- Certified Digital Transformation Professional (CDTP) 자격증 - 디지털 전환 전문가로서의 객관적 역량을 인증받으며, 고객사에 대한 신뢰도와 전문성을 입증할 수 있습니다.

**고급 데이터 사이언스**
- MIT Professional Education 'Applied Data Science Program' (12주) - 제조업에 특화된 머신러닝 및 AI 활용 방안을 학습하며, 예측 유지보수, 품질 예측 등 고도화된 분석 모델을 개발할 수 있는 역량을 키웁니다.

### 📖 필수 도서 및 자료

**전략적 사고 강화**
- 'The Technology Fallacy' (Gerald C. Kane 외) - MIT의 디지털 전환 연구 결과를 바탕으로 기술이 아닌 조직과 문화 변화의 중요성을 강조합니다. 프로젝트에서 기술 도입보다 조직 역량 개발에 집중해야 하는 이유를 명확히 제시합니다.

- 'Platform Revolution' (Geoffrey G. Parker) - 플랫폼 비즈니스 모델의 핵심 원리를 이해하여 제조업에서도 플랫폼적 사고로 생태계를 구축하는 방안을 모색할 수 있습니다.

**실무 적용 가이드**
- 'Smart Factory Handbook' (독일 Fraunhofer 연구소) - 독일의 Industrie 4.0 경험을 바탕으로 한 실무 매뉴얼로, 단계별 스마트 팩토리 구축 방법론과 주의사항을 상세히 다룹니다.

- 한국생산성본부 '디지털 전환 성공사례집' - 국내 제조업체의 실제 디지털 전환 과정과 성과를 분석한 자료로, 현지화된 접근법과 한국 기업 특유의 이슈 해결 방안을 참고할 수 있습니다.

### 🏆 권장 자격증 및 인증

**프로젝트 관리 역량**
- PMP (Project Management Professional) - 대규모 디지털 전환 프로젝트의 체계적 관리를 위한 필수 자격증으로, 리스크 관리와 이해관계자 소통에 특히 유용합니다.

**기술 이해도 제고**
- AWS Cloud Practitioner 또는 Microsoft Azure Fundamentals - 클라우드 기반 디지털 인프라의 기본 개념을 이해하여 기술팀과의 소통 능력을 향상시킵니다.

- Google Analytics Individual Qualification (IQ) - 데이터 기반 의사결정 문화 구축을 위한 기초 분석 역량을 개발합니다.

### 💡 실무 적용 방안

**학습 내용의 프로젝트 연계**
각 학습 과정에서 습득한 지식을 즉시 프로젝트에 적용할 수 있도록, 학습 완료 후 1주일 내에 팀 워크샵을 통해 내용을 공유하고 현재 진행 중인 업무에 어떻게 활용할지 구체적 실행 계획을 수립합니다.

**고객사와의 지식 공유**
월 1회 고객사 담당자들을 대상으로 '디지털 전환 트렌드 세미나'를 개최하여 학습한 내용을 공유하고, 이를 통해 고객사의 디지털 리터러시 향상과 프로젝트에 대한 이해도를 제고합니다.

**팀 내 멘토링 체계**
각자의 전문 영역에서 학습한 내용을 다른 팀원들에게 전수하는 '상호 멘토링' 시스템을 구축하여, 팀 전체의 역량을 균형있게 발전시킵니다.

### 📅 단계별 학습 일정 제안

**1개월차: 기초 역량 집중 강화**
- 1-2주: 디지털 전환 전략 이론 학습 (주 10시간)
- 3-4주: Industry 4.0 기술 기초 과정 수강 및 현장 적용 방안 토론

**2개월차: 실무 역량 개발**
- 1-2주: 변화관리 전문 과정 수강
- 3-4주: 데이터 분석 도구 활용 실습 및 프로젝트 적용

**3개월차: 통합 역량 완성**
- 1-2주: 팀 내 지식 공유 워크샵 및 프로젝트 적용 사례 개발
- 3-4주: 고객사 대상 중간 성과 발표 및 피드백 수렴

**4-6개월차: 전문가 수준 도달**
- 월 1회 고급 과정 수강
- 주 1회 팀 스터디 및 사례 분석
- 분기별 역량 평가 및 개선 계획 수립

이러한 체계적 학습을 통해 단순히 이론적 지식을 습득하는 것을 넘어서, 실제 프로젝트 현장에서 바로 활용할 수 있는 실무 역량을 개발할 수 있을 것입니다.`;
  }

  private getFallbackAnalysis(teamMembers: any[], projectName: string, projectContent: string, projectRequirements: string[]): any {
    // Simplified fallback for emergencies
    return {
      overall_score: 85,
      domain_coverage: 82,
      technical_coverage: 78,
      recommendations: this.generateMockTeamAnalysis(`프로젝트: ${projectName}\n\n팀 구성:\n${teamMembers.map(m => `- ${m.name} (${m.role}, MBTI: ${m.mbti})`).join('\n')}`),
      study_materials: this.generateMockLearningPlan(`프로젝트: ${projectName}`)
    };
  }

  private calculateDomainFit(teamMembers: any[], requirements: string[]): number {
    const roles = teamMembers.map(m => m.role.toLowerCase());
    let matchCount = 0;
    
    requirements.forEach(req => {
      const reqLower = req.toLowerCase();
      const hasMatch = roles.some(role => 
        reqLower.includes('전략') && role.includes('전략') ||
        reqLower.includes('데이터') && role.includes('데이터') ||
        reqLower.includes('프로세스') && role.includes('프로세스') ||
        reqLower.includes('변화') && role.includes('변화') ||
        reqLower.includes('esg') && role.includes('esg')
      );
      if (hasMatch) matchCount++;
    });
    
    return Math.min(95, Math.round((matchCount / requirements.length) * 100));
  }

  private calculateTechnicalFit(teamMembers: any[], projectContent: string): number {
    const keywords = this.extractKeywords(projectContent);
    const teamExpertise = teamMembers.map(m => m.role + ' ' + (m.cd_card_content || '')).join(' ');
    
    let matchCount = 0;
    keywords.forEach(keyword => {
      if (teamExpertise.toLowerCase().includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });
    
    const baseScore = keywords.length > 0 ? (matchCount / keywords.length) * 100 : 80;
    return Math.min(95, Math.round(baseScore));
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
    const mode = c.req.query('mode'); // 'demo', 'real', or undefined (all)
    
    let query = 'SELECT * FROM projects';
    let params: any[] = [];
    
    if (mode === 'demo') {
      query += ' WHERE type = ?';
      params.push('demo');
    } else if (mode === 'real') {
      query += ' WHERE type = ?';  
      params.push('real');
    }
    // mode가 없으면 전체 조회
    
    query += ' ORDER BY created_at DESC';
    
    const projects = await allQuery(query, params);
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
      'INSERT INTO projects (name, client_company, rfp_content, type) VALUES (?, ?, ?, ?)',
      [body.name, body.client_company || null, body.rfp_content || null, 'real']
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
    
    const aiAnalysis = await aiService.analyzeTeamFit(requirements, teamMembers, project.name, project.rfp_content || '');
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
        'INSERT INTO projects (name, client_company, rfp_content, rfp_summary, requirements_analysis, type) VALUES (?, ?, ?, ?, ?, ?)',
        [
          project.name,
          project.client_company,
          project.rfp_content,
          project.rfp_content.split('\n')[0] + '...',
          JSON.stringify(project.requirements),
          'demo'
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
    // Get demo project IDs
    const demoProjects = await allQuery('SELECT id FROM projects WHERE type = ?', ['demo']);
    const demoProjectIds = demoProjects.map((p: any) => p.id);
    
    if (demoProjectIds.length > 0) {
      // Delete related data for demo projects only
      const placeholders = demoProjectIds.map(() => '?').join(',');
      await runQuery(`DELETE FROM analysis_results WHERE project_id IN (${placeholders})`, demoProjectIds);
      await runQuery(`DELETE FROM team_members WHERE project_id IN (${placeholders})`, demoProjectIds);
      
      // Delete demo projects
      await runQuery('DELETE FROM projects WHERE type = ?', ['demo']);
    }
    
    return c.json({ 
      message: '데모 데이터가 초기화되었습니다.',
      deleted_projects: demoProjectIds.length 
    });
    
  } catch (error) {
    console.error('데모 데이터 초기화 오류:', error);
    return c.json({ error: '데모 데이터 초기화 중 오류가 발생했습니다.' }, 500);
  }
});

// Fix existing projects type
app.post('/api/fix-project-types', async (c) => {
  try {
    // Set existing projects with emoji names as demo
    await runQuery(`
      UPDATE projects 
      SET type = 'demo' 
      WHERE (name LIKE '%📊%' OR name LIKE '%🏦%' OR name LIKE '%🚀%') AND type IS NULL
    `);
    
    // Set remaining null types as real
    await runQuery(`
      UPDATE projects 
      SET type = 'real' 
      WHERE type IS NULL
    `);
    
    return c.json({ message: 'Project types fixed successfully' });
    
  } catch (error) {
    console.error('Fix project types error:', error);
    return c.json({ error: 'Failed to fix project types' }, 500);
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
                    <div class="flex items-center space-x-6">
                        <!-- Demo Mode Toggle -->
                        <div class="flex items-center space-x-3">
                            <span class="text-sm text-gray-600">실제 모드</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="demoModeToggle" class="sr-only peer" />
                                <div class="w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span class="text-sm text-gray-600">Demo 모드</span>
                        </div>
                        
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-robot mr-1"></i>
                            Railway 배포 버전
                        </div>
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
            <div id="projectCreationSection" class="bg-white rounded-lg shadow-lg p-8">
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
        <script src="/static/app.js"></script>
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