import { CloudflareBindings } from '../types';

// OpenAI API integration for GPT-4o
export class AIService {
  constructor(private bindings: CloudflareBindings) {}

  async analyzeRFP(rfpContent: string): Promise<{summary: string, requirements: string[]}> {
    const prompt = `
다음 RFP 문서를 분석해서 다음과 같이 응답해주세요:

1. 프로젝트 요약 (3-5줄)
2. 핵심 기술 요구사항 (목록 형태)
3. 필요한 역할/스킬 (목록 형태)

RFP 내용:
${rfpContent}

JSON 형태로 응답해주세요:
{
  "summary": "프로젝트 요약...",
  "requirements": ["요구사항1", "요구사항2", ...],
  "required_skills": ["스킬1", "스킬2", ...]
}`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary,
        requirements: [...(parsed.requirements || []), ...(parsed.required_skills || [])]
      };
    } catch (error) {
      console.error('RFP 분석 중 오류:', error);
      return {
        summary: rfpContent.slice(0, 200) + '...',
        requirements: ['기술 요구사항 분석 필요']
      };
    }
  }

  async extractSkillsFromCD(cdContent: string): Promise<{skills: string[], experience: string}> {
    const prompt = `
다음 이력서/CD 카드 내용에서 기술 스킬과 프로젝트 경험을 추출해주세요:

CD 카드 내용:
${cdContent}

JSON 형태로 응답해주세요:
{
  "skills": ["Python", "React", "AWS", ...],
  "experience": "간략한 경험 요약",
  "domain_experience": ["도메인1", "도메인2", ...],
  "project_count": 5
}`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response);
      return {
        skills: parsed.skills || [],
        experience: parsed.experience || '경험 정보 분석 필요'
      };
    } catch (error) {
      console.error('CD 카드 분석 중 오류:', error);
      return {
        skills: ['기술 스킬 분석 필요'],
        experience: '경험 정보 분석 필요'
      };
    }
  }

  async analyzeTeamFit(projectRequirements: string[], teamMembers: any[]): Promise<{
    overall_score: number;
    domain_coverage: number;
    technical_coverage: number;
    recommendations: string;
    study_materials: string;
  }> {
    const prompt = `
프로젝트 요구사항과 팀 구성을 분석해서 적합도를 평가해주세요:

프로젝트 요구사항:
${projectRequirements.join(', ')}

팀 구성:
${teamMembers.map(m => `${m.name} (${m.role}): ${m.skills_extracted || ''}`).join('\n')}

다음 기준으로 평가해주세요:
1. 전체 적합도 (0-100점)
2. 도메인 커버리지 (0-100점)  
3. 기술 커버리지 (0-100점)
4. 개선 권장사항
5. 추천 학습 자료

JSON 형태로 응답해주세요:
{
  "overall_score": 85,
  "domain_coverage": 90,
  "technical_coverage": 80,
  "recommendations": "상세 권장사항...",
  "study_materials": "추천 학습 자료 리스트..."
}`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response);
      return {
        overall_score: parsed.overall_score || 0,
        domain_coverage: parsed.domain_coverage || 0,
        technical_coverage: parsed.technical_coverage || 0,
        recommendations: parsed.recommendations || '분석 권장사항 생성 필요',
        study_materials: parsed.study_materials || '학습 자료 생성 필요'
      };
    } catch (error) {
      console.error('팀 적합도 분석 중 오류:', error);
      return {
        overall_score: 75,
        domain_coverage: 70,
        technical_coverage: 80,
        recommendations: '상세 분석을 위해 더 많은 정보가 필요합니다.',
        study_materials: '프로젝트 관련 기초 자료 학습을 권장합니다.'
      };
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const apiKey = this.bindings.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that analyzes project requirements and team capabilities. Always respond in Korean and provide JSON formatted responses when requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}