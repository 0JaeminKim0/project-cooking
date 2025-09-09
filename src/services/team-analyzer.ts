import { CloudflareBindings, TeamMember, MBTI_COMPATIBILITY, AnalyzeTeamResponse } from '../types';

export class TeamAnalyzer {
  constructor(private bindings: CloudflareBindings) {}

  async analyzeTeamChemistry(teamMembers: TeamMember[]): Promise<number> {
    if (teamMembers.length < 2) return 80; // Default score for single member

    let totalCompatibility = 0;
    let pairCount = 0;

    // Calculate MBTI compatibility between all pairs
    for (let i = 0; i < teamMembers.length; i++) {
      for (let j = i + 1; j < teamMembers.length; j++) {
        const mbti1 = teamMembers[i].mbti;
        const mbti2 = teamMembers[j].mbti;
        
        if (mbti1 && mbti2) {
          const compatibility = this.getMBTICompatibility(mbti1, mbti2);
          totalCompatibility += compatibility;
          pairCount++;
        }
      }
    }

    if (pairCount === 0) return 75; // Default score when no MBTI data

    return Math.round((totalCompatibility / pairCount) * 100);
  }

  private getMBTICompatibility(mbti1: string, mbti2: string): number {
    // Check direct compatibility
    if (MBTI_COMPATIBILITY[mbti1]?.[mbti2]) {
      return MBTI_COMPATIBILITY[mbti1][mbti2];
    }
    
    // Check reverse compatibility
    if (MBTI_COMPATIBILITY[mbti2]?.[mbti1]) {
      return MBTI_COMPATIBILITY[mbti2][mbti1];
    }

    // Calculate compatibility based on cognitive functions
    return this.calculateCognitiveFunctionCompatibility(mbti1, mbti2);
  }

  private calculateCognitiveFunctionCompatibility(mbti1: string, mbti2: string): number {
    // Simplified compatibility calculation
    const type1 = this.parseToMBTI(mbti1);
    const type2 = this.parseToMBTI(mbti2);

    let compatibility = 0.5; // Base compatibility

    // Same thinking/feeling preference increases compatibility
    if (type1.thinking === type2.thinking) compatibility += 0.2;
    
    // Complementary extraversion/introversion
    if (type1.extraversion !== type2.extraversion) compatibility += 0.1;
    
    // Similar judging/perceiving for work style
    if (type1.judging === type2.judging) compatibility += 0.15;

    return Math.min(compatibility, 1.0);
  }

  private parseToMBTI(mbti: string) {
    return {
      extraversion: mbti[0] === 'E',
      sensing: mbti[1] === 'S', 
      thinking: mbti[2] === 'T',
      judging: mbti[3] === 'J'
    };
  }

  calculateDomainCoverage(projectRequirements: string[], teamSkills: string[]): number {
    if (projectRequirements.length === 0) return 100;
    
    const normalizedRequirements = projectRequirements.map(r => r.toLowerCase());
    const normalizedSkills = teamSkills.map(s => s.toLowerCase());
    
    let coveredCount = 0;
    
    for (const requirement of normalizedRequirements) {
      const isSkillCovered = normalizedSkills.some(skill => 
        skill.includes(requirement) || requirement.includes(skill) ||
        this.isRelatedSkill(requirement, skill)
      );
      
      if (isSkillCovered) {
        coveredCount++;
      }
    }
    
    return Math.round((coveredCount / normalizedRequirements.length) * 100);
  }

  private isRelatedSkill(requirement: string, skill: string): boolean {
    const skillMappings: Record<string, string[]> = {
      'ai': ['python', 'tensorflow', 'pytorch', 'machine learning', 'nlp', 'deep learning'],
      'frontend': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css'],
      'backend': ['node.js', 'express', 'django', 'flask', 'spring', 'api'],
      'database': ['postgresql', 'mysql', 'mongodb', 'sql', 'nosql', 'redis'],
      'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'serverless'],
      'mobile': ['react native', 'flutter', 'ios', 'android', 'kotlin', 'swift']
    };

    for (const [category, skills] of Object.entries(skillMappings)) {
      if (requirement.includes(category) && skills.some(s => skill.includes(s))) {
        return true;
      }
      if (skill.includes(category) && skills.some(s => requirement.includes(s))) {
        return true;
      }
    }

    return false;
  }

  generateVisualizationData(
    projectRequirements: string[],
    teamMembers: TeamMember[],
    scores: {
      chemistry: number;
      domain: number;
      technical: number;
    }
  ) {
    // Radar Chart Data
    const radarCategories = ['AI/ML', '웹개발', '모바일', '클라우드', '데이터베이스', '보안', 'UI/UX', '프로젝트관리'];
    const projectScores = radarCategories.map(() => Math.floor(Math.random() * 40) + 60); // Mock scores
    const teamScores = radarCategories.map((_, i) => Math.min(projectScores[i] + Math.floor(Math.random() * 30) - 15, 100));

    // MBTI Compatibility Network
    const nodes = teamMembers.map(member => ({
      id: member.name || 'Unknown',
      name: member.name || 'Unknown', 
      mbti: member.mbti || 'XXXX'
    }));

    const edges: {source: string; target: string; compatibility: number}[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const compatibility = this.getMBTICompatibility(nodes[i].mbti, nodes[j].mbti);
        edges.push({
          source: nodes[i].id,
          target: nodes[j].id,
          compatibility: compatibility
        });
      }
    }

    // Coverage Heatmap
    const categories = ['기술 역량', '도메인 지식', '프로젝트 경험', '팀워크', '리더십', '커뮤니케이션'];
    const coverageScores = [
      scores.technical,
      scores.domain,
      75 + Math.floor(Math.random() * 20), // Mock experience score
      scores.chemistry,
      70 + Math.floor(Math.random() * 25), // Mock leadership score  
      80 + Math.floor(Math.random() * 15)  // Mock communication score
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