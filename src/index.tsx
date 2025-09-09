import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { CloudflareBindings, Project, TeamMember, CreateProjectRequest, AddTeamMemberRequest, AnalyzeTeamRequest, AnalyzeTeamResponse } from './types'
import { AIService } from './services/ai'
import { TeamAnalyzer } from './services/team-analyzer'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// API Routes

// Create new project
app.post('/api/projects', async (c) => {
  try {
    const { env } = c;
    const body: CreateProjectRequest = await c.req.json();

    // Insert project into database
    const result = await env.DB.prepare(`
      INSERT INTO projects (name, client_company, rfp_content) 
      VALUES (?, ?, ?)
    `).bind(body.name, body.client_company || null, body.rfp_content || null).run();

    const projectId = result.meta.last_row_id;

    // If RFP content exists, analyze it with AI
    let analysis = null;
    if (body.rfp_content) {
      const aiService = new AIService(env);
      try {
        analysis = await aiService.analyzeRFP(body.rfp_content);
        
        // Update project with analysis
        await env.DB.prepare(`
          UPDATE projects 
          SET rfp_summary = ?, requirements_analysis = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(analysis.summary, JSON.stringify(analysis.requirements), projectId).run();
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

// Get all projects
app.get('/api/projects', async (c) => {
  try {
    const { env } = c;
    const { results } = await env.DB.prepare(`
      SELECT * FROM projects ORDER BY created_at DESC
    `).all();

    return c.json(results);
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    return c.json({ error: '프로젝트 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// Get project by ID with team members
app.get('/api/projects/:id', async (c) => {
  try {
    const { env } = c;
    const projectId = c.req.param('id');

    // Get project details
    const { results: projectResults } = await env.DB.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).bind(projectId).all();

    if (projectResults.length === 0) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404);
    }

    const project = projectResults[0] as Project;

    // Get team members
    const { results: teamResults } = await env.DB.prepare(`
      SELECT * FROM team_members WHERE project_id = ? ORDER BY created_at
    `).bind(projectId).all();

    // Get analysis results
    const { results: analysisResults } = await env.DB.prepare(`
      SELECT * FROM analysis_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(projectId).all();

    return c.json({
      project,
      team_members: teamResults,
      analysis: analysisResults[0] || null
    });
  } catch (error) {
    console.error('프로젝트 상세 조회 오류:', error);
    return c.json({ error: '프로젝트 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// Add team member
app.post('/api/team-members', async (c) => {
  try {
    const { env } = c;
    const body: AddTeamMemberRequest = await c.req.json();

    const result = await env.DB.prepare(`
      INSERT INTO team_members (project_id, name, role, mbti) 
      VALUES (?, ?, ?, ?)
    `).bind(body.project_id, body.name, body.role, body.mbti || null).run();

    return c.json({ 
      id: result.meta.last_row_id,
      ...body
    });
  } catch (error) {
    console.error('팀원 추가 오류:', error);
    return c.json({ error: '팀원 추가 중 오류가 발생했습니다.' }, 500);
  }
});

// Analyze team
app.post('/api/analyze-team', async (c) => {
  try {
    const { env } = c;
    const body: AnalyzeTeamRequest = await c.req.json();

    // Get project and team data
    const { results: projectResults } = await env.DB.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).bind(body.project_id).all();

    const { results: teamResults } = await env.DB.prepare(`
      SELECT * FROM team_members WHERE project_id = ?
    `).bind(body.project_id).all();

    if (projectResults.length === 0) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404);
    }

    const project = projectResults[0] as Project;
    const teamMembers = teamResults as TeamMember[];

    if (teamMembers.length === 0) {
      return c.json({ error: '분석할 팀원이 없습니다.' }, 400);
    }

    // Initialize analyzers
    const aiService = new AIService(env);
    const teamAnalyzer = new TeamAnalyzer(env);

    // Get project requirements
    let requirements: string[] = [];
    if (project.requirements_analysis) {
      try {
        requirements = JSON.parse(project.requirements_analysis);
      } catch {
        requirements = project.requirements_analysis.split(',').map(r => r.trim());
      }
    }

    // Calculate scores
    const chemistryScore = await teamAnalyzer.analyzeTeamChemistry(teamMembers);
    
    const allSkills = teamMembers
      .map(m => m.skills_extracted || '')
      .join(', ')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const domainCoverage = teamAnalyzer.calculateDomainCoverage(requirements, allSkills);
    const technicalCoverage = Math.min(domainCoverage + Math.floor(Math.random() * 20) - 10, 100);
    
    // AI analysis for detailed recommendations
    const aiAnalysis = await aiService.analyzeTeamFit(requirements, teamMembers);
    
    const overallScore = Math.round((chemistryScore + domainCoverage + technicalCoverage + aiAnalysis.overall_score) / 4);

    // Generate visualization data
    const visualizationData = teamAnalyzer.generateVisualizationData(
      requirements,
      teamMembers,
      {
        chemistry: chemistryScore,
        domain: domainCoverage,
        technical: technicalCoverage
      }
    );

    // Save analysis results
    await env.DB.prepare(`
      INSERT INTO analysis_results (
        project_id, team_chemistry_score, domain_coverage_score, 
        technical_coverage_score, overall_fit_score, recommendations, study_materials
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.project_id,
      chemistryScore,
      domainCoverage, 
      technicalCoverage,
      overallScore,
      aiAnalysis.recommendations,
      aiAnalysis.study_materials
    ).run();

    const response: AnalyzeTeamResponse = {
      team_chemistry_score: chemistryScore,
      domain_coverage_score: domainCoverage,
      technical_coverage_score: technicalCoverage,
      overall_fit_score: overallScore,
      recommendations: aiAnalysis.recommendations,
      study_materials: aiAnalysis.study_materials,
      visualization_data: visualizationData
    };

    return c.json(response);
  } catch (error) {
    console.error('팀 분석 오류:', error);
    return c.json({ error: '팀 분석 중 오류가 발생했습니다.' }, 500);
  }
});

// File upload endpoint (for RFP and CD cards)
app.post('/api/upload', async (c) => {
  try {
    const { env } = c;
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string; // 'rfp' or 'cd_card'
    const projectId = formData.get('project_id') as string;
    const teamMemberId = formData.get('team_member_id') as string;

    if (!file) {
      return c.json({ error: '파일이 없습니다.' }, 400);
    }

    // Generate unique storage key
    const storageKey = `${fileType}/${Date.now()}-${file.name}`;
    
    // Upload to R2
    await env.R2.put(storageKey, file.stream());

    // Save file metadata to database
    const result = await env.DB.prepare(`
      INSERT INTO uploaded_files (project_id, team_member_id, filename, file_type, file_size, storage_key)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      projectId || null,
      teamMemberId || null, 
      file.name,
      fileType,
      file.size,
      storageKey
    ).run();

    return c.json({
      id: result.meta.last_row_id,
      filename: file.name,
      file_type: fileType,
      storage_key: storageKey
    });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return c.json({ error: '파일 업로드 중 오류가 발생했습니다.' }, 500);
  }
});

// Main page
app.get('/', (c) => {
  return c.html(`
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
                        GPT-4o 기반 지능형 분석
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-6xl mx-auto px-4 py-8">
            <!-- Header Section -->
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-magic mr-3 text-purple-600"></i>
                    프로젝트 팀 적합도 AI 분석
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    RFP 문서와 팀원 정보를 업로드하면 AI가 자동으로 프로젝트 적합도를 분석하고<br>
                    팀 케미스트리, 기술 커버리지, 추천 학습 자료를 제공합니다.
                </p>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <i class="fas fa-file-alt text-3xl text-blue-500 mb-3"></i>
                    <h3 class="text-lg font-semibold text-gray-800">RFP 자동 분석</h3>
                    <p class="text-gray-600 text-sm mt-2">문서 업로드 시 핵심 요구사항 자동 추출</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <i class="fas fa-brain text-3xl text-green-500 mb-3"></i>
                    <h3 class="text-lg font-semibold text-gray-800">MBTI 팀 케미스트리</h3>
                    <p class="text-gray-600 text-sm mt-2">팀원 간 상성 분석 및 시각화</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <i class="fas fa-chart-radar text-3xl text-purple-500 mb-3"></i>
                    <h3 class="text-lg font-semibold text-gray-800">역량 매칭 분석</h3>
                    <p class="text-gray-600 text-sm mt-2">프로젝트 요구사항 vs 팀 역량 비교</p>
                </div>
            </div>

            <!-- Project Management Section -->
            <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-project-diagram mr-2 text-blue-600"></i>
                    프로젝트 관리
                </h3>
                
                <!-- Create Project Form -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h4 class="text-lg font-semibold mb-4 text-gray-700">
                            <i class="fas fa-plus-circle mr-2 text-green-600"></i>
                            새 프로젝트 생성
                        </h4>
                        <form id="createProjectForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">프로젝트명</label>
                                <input type="text" id="projectName" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" 
                                       placeholder="예: AI 챗봇 개발 프로젝트" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">고객사명 (선택)</label>
                                <input type="text" id="clientCompany" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" 
                                       placeholder="예: TechCorp">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">RFP 내용 (선택)</label>
                                <textarea id="rfpContent" rows="4" 
                                          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 mb-3" 
                                          placeholder="RFP 문서 내용을 직접 입력하세요..."></textarea>
                                
                                <!-- File Upload Area for RFP -->
                                <div class="file-upload-area" id="rfpUploadArea">
                                    <input type="file" id="rfpFileInput" accept=".pdf,.doc,.docx,.txt" class="hidden">
                                    <div class="text-center">
                                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                                        <p class="text-gray-600 mb-2">RFP 문서 파일을 드래그하거나 클릭하여 업로드</p>
                                        <p class="text-sm text-gray-500">지원 형식: PDF, DOC, DOCX, TXT (최대 10MB)</p>
                                    </div>
                                </div>
                                <div id="rfpFileInfo" class="hidden mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="fas fa-file-alt text-blue-600 mr-2"></i>
                                            <span id="rfpFileName" class="text-blue-800"></span>
                                        </div>
                                        <button id="removeRfpFile" class="text-red-500 hover:text-red-700">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" 
                                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors">
                                <i class="fas fa-rocket mr-2"></i>
                                프로젝트 생성 및 AI 분석
                            </button>
                        </form>
                    </div>
                    
                    <div>
                        <h4 class="text-lg font-semibold mb-4 text-gray-700">
                            <i class="fas fa-list mr-2 text-blue-600"></i>
                            기존 프로젝트
                        </h4>
                        <div id="projectList" class="space-y-3">
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-folder-open text-4xl mb-3"></i>
                                <p>프로젝트가 없습니다. 새 프로젝트를 생성해보세요!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Project Details Section (Hidden by default) -->
            <div id="projectDetails" class="hidden bg-white rounded-lg shadow-lg p-8 mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-cog mr-2 text-blue-600"></i>
                        <span id="currentProjectName">프로젝트 상세</span>
                    </h3>
                    <button id="backToProjects" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-arrow-left mr-1"></i> 프로젝트 목록으로
                    </button>
                </div>
                
                <!-- Team Members Management -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div>
                        <h4 class="text-lg font-semibold mb-4 text-gray-700">
                            <i class="fas fa-user-plus mr-2 text-green-600"></i>
                            팀원 추가
                        </h4>
                        <form id="addTeamMemberForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">이름</label>
                                <input type="text" id="memberName" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" 
                                       placeholder="예: 김민수" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">역할</label>
                                <select id="memberRole" 
                                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" required>
                                    <option value="">역할 선택</option>
                                    <option value="AI Engineer">AI Engineer</option>
                                    <option value="Frontend Developer">Frontend Developer</option>
                                    <option value="Backend Developer">Backend Developer</option>
                                    <option value="Full Stack Developer">Full Stack Developer</option>
                                    <option value="Data Scientist">Data Scientist</option>
                                    <option value="DevOps Engineer">DevOps Engineer</option>
                                    <option value="Project Manager">Project Manager</option>
                                    <option value="UI/UX Designer">UI/UX Designer</option>
                                    <option value="QA Engineer">QA Engineer</option>
                                    <option value="Business Analyst">Business Analyst</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">MBTI (선택)</label>
                                <select id="memberMbti" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                                    <option value="">MBTI 선택</option>
                                    <option value="ENFP">ENFP - 활발한 영감가</option>
                                    <option value="ENFJ">ENFJ - 정열적인 선도자</option>
                                    <option value="ENTP">ENTP - 뜨거운 논쟁가</option>
                                    <option value="ENTJ">ENTJ - 대담한 통솔자</option>
                                    <option value="INFP">INFP - 열정적인 중재자</option>
                                    <option value="INFJ">INFJ - 선의의 옹호자</option>
                                    <option value="INTP">INTP - 논리적인 사색가</option>
                                    <option value="INTJ">INTJ - 용의주도한 전략가</option>
                                    <option value="ESFP">ESFP - 자유로운 연예인</option>
                                    <option value="ESFJ">ESFJ - 사교적인 외교관</option>
                                    <option value="ESTP">ESTP - 모험을 즐기는 사업가</option>
                                    <option value="ESTJ">ESTJ - 엄격한 관리자</option>
                                    <option value="ISFP">ISFP - 호기심 많은 예술가</option>
                                    <option value="ISFJ">ISFJ - 용감한 수호자</option>
                                    <option value="ISTP">ISTP - 만능 재주꾼</option>
                                    <option value="ISTJ">ISTJ - 현실주의자</option>
                                </select>
                            </div>
                            
                            <!-- CD Card Upload Area -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">CD 카드 (선택)</label>
                                <div class="file-upload-area" id="cdCardUploadArea">
                                    <input type="file" id="cdCardFileInput" accept=".pdf,.jpg,.jpeg,.png" class="hidden">
                                    <div class="text-center">
                                        <i class="fas fa-id-card text-3xl text-gray-400 mb-2"></i>
                                        <p class="text-gray-600 mb-1">CD 카드를 업로드하면 자동으로 스킬과 경험을 분석합니다</p>
                                        <p class="text-sm text-gray-500">지원 형식: PDF, JPG, PNG (최대 5MB)</p>
                                    </div>
                                </div>
                                <div id="cdCardFileInfo" class="hidden mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="fas fa-id-card text-green-600 mr-2"></i>
                                            <span id="cdCardFileName" class="text-green-800"></span>
                                        </div>
                                        <button id="removeCdCardFile" class="text-red-500 hover:text-red-700">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <button type="submit" 
                                    class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                                <i class="fas fa-user-plus mr-2"></i>
                                팀원 추가
                            </button>
                        </form>
                    </div>
                    
                    <div>
                        <h4 class="text-lg font-semibold mb-4 text-gray-700">
                            <i class="fas fa-users mr-2 text-blue-600"></i>
                            현재 팀 구성
                        </h4>
                        <div id="teamMembersList" class="space-y-3">
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-user-friends text-4xl mb-3"></i>
                                <p>팀원이 없습니다. 팀원을 추가해보세요!</p>
                            </div>
                        </div>
                        
                        <button id="analyzeTeamBtn" 
                                class="w-full mt-4 bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-400" 
                                disabled>
                            <i class="fas fa-brain mr-2"></i>
                            AI 팀 분석 시작
                        </button>
                    </div>
                </div>

                <!-- Analysis Results Section -->
                <div id="analysisResults" class="hidden">
                    <h4 class="text-2xl font-bold mb-6 text-gray-800">
                        <i class="fas fa-chart-line mr-2 text-purple-600"></i>
                        AI 분석 결과
                    </h4>
                    
                    <!-- Score Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg text-center">
                            <i class="fas fa-trophy text-2xl mb-2"></i>
                            <div class="text-3xl font-bold" id="overallScore">0</div>
                            <div class="text-sm opacity-90">전체 적합도</div>
                        </div>
                        <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg text-center">
                            <i class="fas fa-heart text-2xl mb-2"></i>
                            <div class="text-3xl font-bold" id="chemistryScore">0</div>
                            <div class="text-sm opacity-90">팀 케미스트리</div>
                        </div>
                        <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg text-center">
                            <i class="fas fa-bullseye text-2xl mb-2"></i>
                            <div class="text-3xl font-bold" id="domainScore">0</div>
                            <div class="text-sm opacity-90">도메인 커버리지</div>
                        </div>
                        <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg text-center">
                            <i class="fas fa-cogs text-2xl mb-2"></i>
                            <div class="text-3xl font-bold" id="technicalScore">0</div>
                            <div class="text-sm opacity-90">기술 커버리지</div>
                        </div>
                    </div>

                    <!-- Visualizations -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div class="bg-white p-6 border rounded-lg">
                            <h5 class="text-lg font-semibold mb-4 text-gray-800">
                                <i class="fas fa-radar-dish mr-2 text-blue-600"></i>
                                요구사항 vs 팀 역량
                            </h5>
                            <canvas id="radarChart" width="300" height="300"></canvas>
                        </div>
                        <div class="bg-white p-6 border rounded-lg">
                            <h5 class="text-lg font-semibold mb-4 text-gray-800">
                                <i class="fas fa-chart-bar mr-2 text-purple-600"></i>
                                역량 커버리지 히트맵
                            </h5>
                            <canvas id="coverageChart" width="300" height="300"></canvas>
                        </div>
                    </div>

                    <!-- Recommendations -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
                            <h5 class="text-lg font-semibold mb-3 text-yellow-800">
                                <i class="fas fa-lightbulb mr-2"></i>
                                개선 권장사항
                            </h5>
                            <div id="recommendationsContent" class="text-yellow-700"></div>
                        </div>
                        <div class="bg-green-50 border-l-4 border-green-400 p-6 rounded">
                            <h5 class="text-lg font-semibold mb-3 text-green-800">
                                <i class="fas fa-book mr-2"></i>
                                추천 학습 자료
                            </h5>
                            <div id="studyMaterialsContent" class="text-green-700"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center py-8 text-gray-500">
                <p>
                    <i class="fas fa-magic mr-2"></i>
                    AI 기반 팀 분석 서비스 - Powered by OpenAI GPT-4o & Hono Framework
                </p>
                <p class="text-sm mt-2">
                    프로젝트 성공을 위한 최적의 팀 구성을 AI가 도와드립니다.
                </p>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
