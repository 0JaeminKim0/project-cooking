// Global variables
let currentProject = null;
let currentTeamMembers = [];
let radarChartInstance = null;
let coverageChartInstance = null;
let selectedRfpFile = null;
let selectedCdCardFile = null;
let isDemoMode = false;

// DOM elements
const createProjectForm = document.getElementById('createProjectForm');
const addTeamMemberForm = document.getElementById('addTeamMemberForm');
const projectList = document.getElementById('projectList');
const projectDetails = document.getElementById('projectDetails');
const teamMembersList = document.getElementById('teamMembersList');
const analyzeTeamBtn = document.getElementById('analyzeTeamBtn');
const analysisResults = document.getElementById('analysisResults');
const backToProjectsBtn = document.getElementById('backToProjects');
const demoModeToggle = document.getElementById('demoModeToggle');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setupEventListeners();
    setupFileUploads();
});

// Event listeners
function setupEventListeners() {
    createProjectForm.addEventListener('submit', handleCreateProject);
    addTeamMemberForm.addEventListener('submit', handleAddTeamMember);
    analyzeTeamBtn.addEventListener('click', handleAnalyzeTeam);
    backToProjectsBtn.addEventListener('click', backToProjectList);
    
    // Demo mode toggle
    demoModeToggle.addEventListener('change', handleDemoModeToggle);
    
    // Demo test buttons
    document.getElementById('demoTestBtn').addEventListener('click', handleDemoTest);
    document.getElementById('resetDemoBtn').addEventListener('click', handleResetDemo);
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${getNotificationIcon(type)} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function showLoading(message = '처리 중...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class=\"loading-content\">
            <div class=\"loading-spinner mb-4 mx-auto\"></div>
            <p class=\"text-gray-700\">${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// AI Analysis Loading Modal Functions
function showAIAnalysisModal() {
    const overlay = document.createElement('div');
    overlay.id = 'aiAnalysisModal';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fadeIn';
    overlay.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform animate-slideUp">
            <!-- Header -->
            <div class="text-center mb-6">
                <div class="relative inline-block">
                    <div class="w-20 h-20 mx-auto mb-4 relative">
                        <div class="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                        <div class="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                            <i class="fas fa-brain text-3xl text-purple-600 animate-bounce"></i>
                        </div>
                    </div>
                    <!-- Floating particles -->
                    <div class="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-ping delay-75"></div>
                    <div class="absolute -top-1 -left-3 w-2 h-2 bg-green-400 rounded-full animate-ping delay-150"></div>
                    <div class="absolute -bottom-3 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping delay-300"></div>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">🤖 AI 상세 분석 중</h3>
                <p class="text-gray-600">고급 AI 알고리즘이 팀을 분석하고 있습니다</p>
            </div>
            
            <!-- Progress Animation -->
            <div class="mb-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-600">분석 진행률</span>
                    <span id="analysisProgress" class="text-sm font-semibold text-purple-600">0%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div id="progressBar" class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out transform origin-left scale-x-0"></div>
                </div>
            </div>
            
            <!-- Analysis Steps -->
            <div class="space-y-3">
                <div id="step1" class="flex items-center p-3 rounded-lg bg-purple-50 border-l-4 border-purple-500">
                    <div class="w-6 h-6 mr-3 bg-purple-500 rounded-full flex items-center justify-center animate-spin">
                        <i class="fas fa-cog text-white text-sm"></i>
                    </div>
                    <span class="text-purple-700 font-medium">팀 구성 분석</span>
                </div>
                
                <div id="step2" class="flex items-center p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300 opacity-50">
                    <div class="w-6 h-6 mr-3 bg-gray-300 rounded-full flex items-center justify-center">
                        <i class="fas fa-users text-white text-sm"></i>
                    </div>
                    <span class="text-gray-600">MBTI 케미스트리 계산</span>
                </div>
                
                <div id="step3" class="flex items-center p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300 opacity-50">
                    <div class="w-6 h-6 mr-3 bg-gray-300 rounded-full flex items-center justify-center">
                        <i class="fas fa-chart-line text-white text-sm"></i>
                    </div>
                    <span class="text-gray-600">도메인 적합성 평가</span>
                </div>
                
                <div id="step4" class="flex items-center p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300 opacity-50">
                    <div class="w-6 h-6 mr-3 bg-gray-300 rounded-full flex items-center justify-center">
                        <i class="fas fa-lightbulb text-white text-sm"></i>
                    </div>
                    <span class="text-gray-600">AI 권장사항 생성</span>
                </div>
            </div>
            
            <!-- Animated dots -->
            <div class="text-center mt-6">
                <div class="flex items-center justify-center space-x-1">
                    <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75"></div>
                    <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Start progress animation
    startAnalysisProgressAnimation();
}

function hideAIAnalysisModal() {
    const modal = document.getElementById('aiAnalysisModal');
    if (modal) {
        // Add fade out animation
        modal.classList.add('animate-fadeOut');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function startAnalysisProgressAnimation() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('analysisProgress');
    const steps = ['step1', 'step2', 'step3', 'step4'];
    
    if (!progressBar || !progressText) return;
    
    let currentStep = 0;
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 8 + 3; // Random increment between 3-11% (더 느리게)
        
        if (progress > 100) {
            progress = 100;
            clearInterval(interval);
        }
        
        // Update progress bar
        progressBar.style.transform = `scaleX(${progress / 100})`;
        progressText.textContent = `${Math.round(progress)}%`;
        
        // Activate steps progressively
        const stepIndex = Math.floor((progress / 100) * steps.length);
        if (stepIndex > currentStep && stepIndex < steps.length) {
            // Complete previous step
            if (currentStep < steps.length) {
                const prevStep = document.getElementById(steps[currentStep]);
                if (prevStep) {
                    prevStep.classList.remove('bg-purple-50', 'border-purple-500', 'opacity-50');
                    prevStep.classList.add('bg-green-50', 'border-green-500');
                    prevStep.querySelector('.bg-purple-500, .bg-gray-300').className = 'w-6 h-6 mr-3 bg-green-500 rounded-full flex items-center justify-center';
                    prevStep.querySelector('.fa-cog, .fas').className = 'fas fa-check text-white text-sm';
                    prevStep.querySelector('span').className = 'text-green-700 font-medium';
                }
            }
            
            // Activate current step
            currentStep = stepIndex;
            if (currentStep < steps.length) {
                const currentStepEl = document.getElementById(steps[currentStep]);
                if (currentStepEl) {
                    currentStepEl.classList.remove('bg-gray-50', 'border-gray-300', 'opacity-50');
                    currentStepEl.classList.add('bg-purple-50', 'border-purple-500');
                    currentStepEl.querySelector('.bg-gray-300').className = 'w-6 h-6 mr-3 bg-purple-500 rounded-full flex items-center justify-center animate-spin';
                    currentStepEl.querySelector('span').className = 'text-purple-700 font-medium';
                }
            }
        }
    }, 1200); // Update every 1.2초로 더 느리게 (90초 타임아웃에 맞춰 조정)
}

// API functions
async function apiRequest(url, options = {}) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            timeout: 90000, // 90초로 증가
            ...options
        });
        return response.data;
    } catch (error) {
        console.error('API 요청 오류:', error);
        
        if (error.response) {
            throw new Error(error.response.data?.error || 'API 요청 중 오류가 발생했습니다.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('요청 시간이 초과되었습니다 (90초). AI 분석이 복잡하여 시간이 오래 걸릴 수 있습니다. 다시 시도해주세요.');
        } else {
            throw new Error('네트워크 오류가 발생했습니다.');
        }
    }
}

// Project management
async function loadProjects() {
    try {
        const mode = isDemoMode ? 'demo' : 'real';
        const projects = await apiRequest(`/api/projects?mode=${mode}`);
        displayProjects(projects);
        updateModeIndicator();
    } catch (error) {
        console.error('프로젝트 로드 실패:', error);
        showNotification('프로젝트를 불러오는데 실패했습니다.', 'error');
    }
}

function displayProjects(projects) {
    if (projects.length === 0) {
        projectList.innerHTML = `
            <div class=\"text-center py-8 text-gray-500\">
                <i class=\"fas fa-folder-open text-4xl mb-3\"></i>
                <p>프로젝트가 없습니다. 새 프로젝트를 생성해보세요!</p>
            </div>
        `;
        return;
    }

    projectList.innerHTML = projects.map(project => `
        <div class=\"project-item bg-gray-50 p-4 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors\" 
             onclick=\"selectProject(${project.id})\">
            <div class=\"flex justify-between items-start\">
                <div class=\"flex-1\">
                    <h5 class=\"font-semibold text-gray-800\">${project.name}</h5>
                    ${project.client_company ? `<p class=\"text-sm text-gray-600\">${project.client_company}</p>` : ''}
                    ${project.rfp_summary ? `<p class=\"text-sm text-gray-500 mt-1\">${project.rfp_summary.slice(0, 100)}...</p>` : ''}
                </div>
                <div class=\"text-right\">
                    <span class=\"text-xs text-gray-500\">${formatDate(project.created_at)}</span>
                    <div class=\"flex items-center mt-1\">
                        <i class=\"fas fa-arrow-right text-blue-600\"></i>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function handleCreateProject(e) {
    e.preventDefault();
    
    const projectName = document.getElementById('projectName').value;
    const clientCompany = document.getElementById('clientCompany').value;
    let rfpContent = document.getElementById('rfpContent').value;

    if (!projectName.trim()) {
        showNotification('프로젝트명을 입력해주세요.', 'warning');
        return;
    }

    try {
        showLoading('프로젝트를 생성하고 AI 분석 중...');
        
        // If RFP file is selected, read its content
        if (selectedRfpFile && !rfpContent.trim()) {
            try {
                rfpContent = await readFileContent(selectedRfpFile);
            } catch (error) {
                console.warn('파일 읽기 실패, 텍스트 입력 내용 사용:', error);
            }
        }
        
        const projectData = {
            name: projectName,
            client_company: clientCompany,
            rfp_content: rfpContent
        };

        const project = await apiRequest('/api/projects', {
            method: 'POST',
            data: projectData
        });

        // Upload RFP file if selected
        if (selectedRfpFile) {
            try {
                await uploadFile(selectedRfpFile, 'rfp', project.id);
                showNotification('RFP 파일이 업로드되었습니다.', 'info');
            } catch (error) {
                console.warn('RFP 파일 업로드 실패:', error);
            }
        }

        hideLoading();
        showNotification('프로젝트가 성공적으로 생성되었습니다!', 'success');
        
        // Reset form and file selections
        createProjectForm.reset();
        selectedRfpFile = null;
        document.getElementById('rfpFileInfo').classList.add('hidden');
        
        // Reload projects and select the new one
        await loadProjects();
        selectProject(project.id);
        
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        
        // For text files, read as text
        if (file.type === 'text/plain') {
            reader.readAsText(file);
        } else {
            // For other files, we'll just use a placeholder
            // In a real implementation, you'd want to use OCR or document parsing
            resolve(`[${file.name} 파일이 업로드됨 - 내용 분석 필요]`);
        }
    });
}

async function selectProject(projectId) {
    try {
        showLoading('프로젝트 정보를 불러오는 중...');
        
        const projectData = await apiRequest(`/api/projects/${projectId}`);
        
        currentProject = projectData.project;
        currentTeamMembers = projectData.team_members || [];
        
        document.getElementById('currentProjectName').textContent = currentProject.name;
        
        displayTeamMembers();
        updateAnalyzeButton();
        
        // Show project details section
        document.getElementById('projectDetails').classList.remove('hidden');
        document.getElementById('projectDetails').scrollIntoView({ behavior: 'smooth' });
        
        // Setup file uploads for project details page
        setTimeout(() => {
            setupFileUploadArea('cdCardUploadArea', 'cdCardFileInput', 'cdCardFileInfo', 'cdCardFileName', 'removeCdCardFile', handleCdCardFileSelect);
        }, 100);
        
        // If there's existing analysis, show it
        if (projectData.analysis) {
            displayAnalysisResults(projectData.analysis);
        } else {
            analysisResults.classList.add('hidden');
        }
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

// Team member management
function displayTeamMembers() {
    if (currentTeamMembers.length === 0) {
        teamMembersList.innerHTML = `
            <div class=\"text-center py-8 text-gray-500\">
                <i class=\"fas fa-user-friends text-4xl mb-3\"></i>
                <p>팀원이 없습니다. 팀원을 추가해보세요!</p>
            </div>
        `;
        return;
    }

    teamMembersList.innerHTML = currentTeamMembers.map(member => `
        <div class=\"team-member-card fade-in\">
            <div class=\"flex justify-between items-start\">
                <div class=\"flex-1\">
                    <div class=\"flex items-center mb-2\">
                        <h6 class=\"font-semibold text-gray-800\">${member.name}</h6>
                        <span class=\"ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded\">${member.role}</span>
                        ${member.mbti ? `<span class=\"ml-2 mbti-badge ${getMBTICategory(member.mbti)}\">${member.mbti}</span>` : ''}
                    </div>
                    ${member.skills_extracted ? `<p class=\"text-sm text-gray-600\">스킬: ${member.skills_extracted}</p>` : ''}
                    ${member.experience_summary ? `<p class=\"text-sm text-gray-500 mt-1\">${member.experience_summary}</p>` : ''}
                </div>
                <div class=\"ml-4\">
                    <button onclick=\"removeMember(${member.id})\" 
                            class=\"text-red-500 hover:text-red-700 text-sm\">
                        <i class=\"fas fa-trash\"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function getMBTICategory(mbti) {
    const analysts = ['INTJ', 'INTP', 'ENTJ', 'ENTP'];
    const diplomats = ['INFJ', 'INFP', 'ENFJ', 'ENFP'];
    const sentinels = ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'];
    const explorers = ['ISTP', 'ISFP', 'ESTP', 'ESFP'];
    
    if (analysts.includes(mbti)) return 'mbti-analyst';
    if (diplomats.includes(mbti)) return 'mbti-diplomat';
    if (sentinels.includes(mbti)) return 'mbti-sentinel';
    if (explorers.includes(mbti)) return 'mbti-explorer';
    return 'mbti-analyst'; // default
}

async function handleAddTeamMember(e) {
    e.preventDefault();
    
    const memberData = {
        project_id: currentProject.id,
        name: document.getElementById('memberName').value,
        role: document.getElementById('memberRole').value,
        mbti: document.getElementById('memberMbti').value || null
    };

    if (!memberData.name.trim() || !memberData.role.trim()) {
        showNotification('이름과 역할을 입력해주세요.', 'warning');
        return;
    }

    try {
        showLoading('팀원을 추가하고 있습니다...');

        const member = await apiRequest('/api/team-members', {
            method: 'POST',
            data: memberData
        });

        // Upload CD card file if selected
        if (selectedCdCardFile) {
            try {
                await uploadFile(selectedCdCardFile, 'cd_card', currentProject.id, member.id);
                showNotification('CD 카드가 업로드되었습니다. AI가 자동으로 스킬을 분석합니다.', 'info');
                
                // In a real implementation, you would process the CD card and update the member's skills
                // For now, we'll add a placeholder
                member.skills_extracted = '업로드된 CD 카드에서 추출된 스킬 (분석 중...)';
                member.experience_summary = 'CD 카드 기반 경험 분석 중...';
            } catch (error) {
                console.warn('CD 카드 업로드 실패:', error);
            }
        }

        currentTeamMembers.push(member);
        displayTeamMembers();
        updateAnalyzeButton();
        
        // Reset form and file selections
        addTeamMemberForm.reset();
        selectedCdCardFile = null;
        const cdCardFileInfo = document.getElementById('cdCardFileInfo');
        if (cdCardFileInfo) {
            cdCardFileInfo.classList.add('hidden');
        }
        
        hideLoading();
        showNotification('팀원이 추가되었습니다!', 'success');
        
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

function updateAnalyzeButton() {
    const hasMembers = currentTeamMembers.length > 0;
    analyzeTeamBtn.disabled = !hasMembers;
    
    if (hasMembers) {
        analyzeTeamBtn.innerHTML = '<i class=\"fas fa-brain mr-2\"></i>AI 팀 분석 시작';
    } else {
        analyzeTeamBtn.innerHTML = '<i class=\"fas fa-brain mr-2\"></i>팀원을 먼저 추가해주세요';
    }
}

// Team analysis
async function handleAnalyzeTeam() {
    if (!currentProject || currentTeamMembers.length === 0) {
        showNotification('분석할 팀원이 없습니다.', 'warning');
        return;
    }

    try {
        showAIAnalysisModal();
        
        const analysisData = await apiRequest('/api/analyze-team', {
            method: 'POST',
            data: { project_id: currentProject.id }
        });

        hideAIAnalysisModal();
        displayAnalysisResults(analysisData);
        
        showNotification('🎉 AI 팀 분석이 완료되었습니다!', 'success');
        
    } catch (error) {
        hideAIAnalysisModal();
        showNotification(error.message, 'error');
    }
}

function displayAnalysisResults(analysis) {
    // Show results section
    analysisResults.classList.remove('hidden');
    analysisResults.scrollIntoView({ behavior: 'smooth' });

    // Update score cards with animation
    animateScore('overallScore', analysis.overall_fit_score);
    animateScore('chemistryScore', analysis.team_chemistry_score);
    animateScore('domainScore', analysis.domain_coverage_score);
    animateScore('technicalScore', analysis.technical_coverage_score);

    // Update recommendations
    document.getElementById('recommendationsContent').innerHTML = formatText(analysis.recommendations);
    document.getElementById('studyMaterialsContent').innerHTML = formatText(analysis.study_materials);

    // Create charts
    if (analysis.visualization_data) {
        createRadarChart(analysis.visualization_data.radar_chart);
        createCoverageChart(analysis.visualization_data.coverage_heatmap);
    }
}

function animateScore(elementId, targetScore) {
    const element = document.getElementById(elementId);
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = targetScore / steps;
    let currentScore = 0;
    
    const timer = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(timer);
        }
        element.textContent = Math.round(currentScore);
    }, duration / steps);
}

function formatText(text) {
    if (!text) return '<p class=\"text-gray-500\">내용이 없습니다.</p>';
    
    // Split by newlines and create paragraphs
    return text.split('\\n').filter(line => line.trim()).map(line => `<p class=\"mb-2\">${line.trim()}</p>`).join('');
}

// Chart creation
function createRadarChart(data) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    // Destroy existing chart
    if (radarChartInstance) {
        radarChartInstance.destroy();
    }
    
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: '프로젝트 요구사항',
                    data: data.project_requirements,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    pointBackgroundColor: 'rgb(239, 68, 68)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(239, 68, 68)'
                },
                {
                    label: '팀 역량',
                    data: data.team_capabilities,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(59, 130, 246)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createCoverageChart(data) {
    const ctx = document.getElementById('coverageChart').getContext('2d');
    
    // Destroy existing chart
    if (coverageChartInstance) {
        coverageChartInstance.destroy();
    }
    
    coverageChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.categories,
            datasets: [{
                label: '커버리지 점수',
                data: data.coverage_scores,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)', 
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)',
                    'rgb(245, 158, 11)',
                    'rgb(16, 185, 129)',
                    'rgb(59, 130, 246)',
                    'rgb(139, 92, 246)',
                    'rgb(236, 72, 153)'
                ],
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + '%';
                        }
                    }
                }
            }
        }
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function backToProjectList() {
    projectDetails.classList.add('hidden');
    analysisResults.classList.add('hidden');
    currentProject = null;
    currentTeamMembers = [];
    
    // Reset forms
    addTeamMemberForm.reset();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Add some helper functions for future enhancements
function removeMember(memberId) {
    // This would be implemented to remove team members
    showNotification('팀원 삭제 기능은 아직 구현되지 않았습니다.', 'info');
}

// Error handling for images and charts
window.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        e.target.style.display = 'none';
    }
});

// File upload functionality
function setupFileUploads() {
    // RFP File Upload
    setupFileUploadArea('rfpUploadArea', 'rfpFileInput', 'rfpFileInfo', 'rfpFileName', 'removeRfpFile', handleRfpFileSelect);
    
    // CD Card File Upload (will be setup when project details are shown)
    setupFileUploadArea('cdCardUploadArea', 'cdCardFileInput', 'cdCardFileInfo', 'cdCardFileName', 'removeCdCardFile', handleCdCardFileSelect);
}

function setupFileUploadArea(uploadAreaId, fileInputId, fileInfoId, fileNameId, removeButtonId, onFileSelect) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);
    const fileInfo = document.getElementById(fileInfoId);
    const removeButton = document.getElementById(removeButtonId);

    if (!uploadArea || !fileInput) return; // Elements might not exist yet

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileSelect(file, fileInfo, fileNameId);
        }
    });

    // Remove file
    if (removeButton) {
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            fileInfo.classList.add('hidden');
            if (uploadAreaId === 'rfpUploadArea') selectedRfpFile = null;
            if (uploadAreaId === 'cdCardUploadArea') selectedCdCardFile = null;
        });
    }

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            fileInput.files = files;
            onFileSelect(file, fileInfo, fileNameId);
        }
    });
}

function handleRfpFileSelect(file, fileInfo, fileNameId) {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('파일 크기가 10MB를 초과합니다.', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('지원하지 않는 파일 형식입니다. PDF, DOC, DOCX, TXT 파일만 업로드 가능합니다.', 'error');
        return;
    }

    selectedRfpFile = file;
    document.getElementById(fileNameId).textContent = `${file.name} (${formatFileSize(file.size)})`;
    fileInfo.classList.remove('hidden');
    
    showNotification('RFP 파일이 선택되었습니다. 프로젝트 생성 시 자동으로 분석됩니다.', 'success');
}

function handleCdCardFileSelect(file, fileInfo, fileNameId) {
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('파일 크기가 5MB를 초과합니다.', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('지원하지 않는 파일 형식입니다. PDF, JPG, PNG 파일만 업로드 가능합니다.', 'error');
        return;
    }

    selectedCdCardFile = file;
    document.getElementById(fileNameId).textContent = `${file.name} (${formatFileSize(file.size)})`;
    fileInfo.classList.remove('hidden');
    
    showNotification('CD 카드가 선택되었습니다. 팀원 추가 시 자동으로 분석됩니다.', 'success');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function uploadFile(file, fileType, projectId = null, teamMemberId = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', fileType);
    if (projectId) formData.append('project_id', projectId);
    if (teamMemberId) formData.append('team_member_id', teamMemberId);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('파일 업로드 중 오류가 발생했습니다.');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('파일 업로드 오류:', error);
        throw error;
    }
}

// Demo test functionality
async function handleDemoTest() {
    try {
        // Show confirmation dialog
        if (!confirm('🚀 데모 테스트를 시작하시겠습니까?\n\n샘플 프로젝트 3개와 각각의 팀원들이 자동으로 생성됩니다.\n생성 완료 후 자동으로 AI 분석도 실행됩니다.')) {
            return;
        }

        showLoading('🔮 데모 데이터를 생성하고 있습니다...\n잠시만 기다려주세요 (약 10-15초)');
        
        // Generate demo data
        const demoData = await apiRequest('/api/demo/generate', {
            method: 'POST'
        });
        
        showNotification('✨ 데모 데이터가 성공적으로 생성되었습니다!', 'success');
        
        // Show demo info
        document.getElementById('demoInfo').classList.remove('hidden');
        
        // Reload projects
        await loadProjects();
        
        hideLoading();
        
        // Auto-select and analyze first project
        if (demoData.projects && demoData.projects.length > 0) {
            showNotification('🤖 첫 번째 프로젝트의 AI 분석을 시작합니다...', 'info');
            
            setTimeout(async () => {
                try {
                    await selectProject(demoData.projects[0].id);
                    
                    // Wait a bit for UI to settle
                    setTimeout(async () => {
                        await handleAnalyzeTeam();
                        
                        // Show success message with tips
                        setTimeout(() => {
                            showNotification('🎉 데모 완료! 다른 프로젝트들도 확인해보세요!', 'success');
                        }, 2000);
                    }, 1000);
                } catch (error) {
                    console.error('Auto analysis failed:', error);
                }
            }, 500);
        }
        
    } catch (error) {
        hideLoading();
        showNotification('데모 데이터 생성 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

async function handleResetDemo() {
    try {
        if (!confirm('🗑️ 모든 데모 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        showLoading('데모 데이터를 초기화하고 있습니다...');
        
        await apiRequest('/api/demo/reset', {
            method: 'DELETE'
        });
        
        // Hide demo info
        document.getElementById('demoInfo').classList.add('hidden');
        
        // Reset UI state
        backToProjectList();
        await loadProjects();
        
        hideLoading();
        showNotification('모든 데모 데이터가 삭제되었습니다.', 'info');
        
    } catch (error) {
        hideLoading();
        showNotification('데이터 초기화 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// Enhanced project display with demo indicators
function displayProjectsWithDemo(projects) {
    if (projects.length === 0) {
        projectList.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-folder-open text-4xl mb-3"></i>
                <p>프로젝트가 없습니다.</p>
                <p class="text-sm mt-2">🚀 Demo Test로 샘플 프로젝트를 생성해보세요!</p>
            </div>
        `;
        return;
    }

    // Detect if these are demo projects
    const demoIndicators = ['🤖', '📱', '🏥'];
    const hasDemoProjects = projects.some(p => demoIndicators.some(icon => p.name.includes(icon)));

    projectList.innerHTML = projects.map(project => `
        <div class="project-item bg-gray-50 p-4 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors fade-in" 
             onclick="selectProject(${project.id})">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center">
                        <h5 class="font-semibold text-gray-800">${project.name}</h5>
                        ${hasDemoProjects && demoIndicators.some(icon => project.name.includes(icon)) ? 
                            '<span class="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">DEMO</span>' : 
                            ''}
                    </div>
                    ${project.client_company ? `<p class="text-sm text-gray-600">${project.client_company}</p>` : ''}
                    ${project.rfp_summary ? `<p class="text-sm text-gray-500 mt-1">${project.rfp_summary.slice(0, 100)}...</p>` : ''}
                </div>
                <div class="text-right">
                    <span class="text-xs text-gray-500">${formatDate(project.created_at)}</span>
                    <div class="flex items-center mt-1">
                        <i class="fas fa-arrow-right text-blue-600"></i>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Override the original displayProjects function
function displayProjects(projects) {
    displayProjectsWithDemo(projects);
}

// Add demo project quick actions
function addDemoProjectActions() {
    const demoProjects = document.querySelectorAll('.project-item');
    demoProjects.forEach((item, index) => {
        if (item.querySelector('.bg-purple-100')) { // Demo project
            const actionBtn = document.createElement('button');
            actionBtn.className = 'ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600';
            actionBtn.innerHTML = '<i class="fas fa-zap mr-1"></i>분석';
            actionBtn.onclick = (e) => {
                e.stopPropagation();
                // Quick analysis for demo projects
                const projectId = item.getAttribute('onclick').match(/\d+/)[0];
                quickAnalyzeProject(parseInt(projectId));
            };
            
            const titleDiv = item.querySelector('h5').parentElement;
            titleDiv.appendChild(actionBtn);
        }
    });
}

async function quickAnalyzeProject(projectId) {
    try {
        showLoading('프로젝트를 선택하고 AI 분석을 시작합니다...');
        
        await selectProject(projectId);
        
        setTimeout(async () => {
            if (currentTeamMembers && currentTeamMembers.length > 0) {
                await handleAnalyzeTeam();
                hideLoading();
            } else {
                hideLoading();
                showNotification('팀원이 없는 프로젝트입니다.', 'warning');
            }
        }, 1000);
        
    } catch (error) {
        hideLoading();
        showNotification('빠른 분석 중 오류가 발생했습니다.', 'error');
    }
}

// Demo Mode Functions
function handleDemoModeToggle() {
    isDemoMode = demoModeToggle.checked;
    console.log('🎛️ Demo Mode Toggle Changed:', isDemoMode ? 'ON' : 'OFF');
    
    // Update UI elements first
    updateModeIndicator();
    
    // Then reload projects with new mode
    loadProjects();
    
    // Show notification
    showNotification(
        isDemoMode ? 
        '🎭 Demo 모드가 활성화되었습니다. Demo 프로젝트만 표시됩니다.' : 
        '💼 실제 모드가 활성화되었습니다. 실제 프로젝트만 표시됩니다.',
        'info'
    );
    
    // Save preference to localStorage
    saveDemoModePreference();
}

function updateModeIndicator() {
    const modeText = isDemoMode ? 'Demo 모드' : '실제 모드';
    const modeColor = isDemoMode ? 'text-purple-600' : 'text-blue-600';
    
    // Update any mode indicators in the UI
    const indicators = document.querySelectorAll('.mode-indicator');
    indicators.forEach(indicator => {
        indicator.textContent = modeText;
        indicator.className = `mode-indicator ${modeColor} font-medium`;
    });
    
    // Update project creation form visibility - CRITICAL FOR DEMO MODE
    const createSection = document.getElementById('projectCreationSection');
    if (createSection) {
        if (isDemoMode) {
            createSection.style.display = 'none';
            createSection.classList.add('hidden');
        } else {
            createSection.style.display = 'block';
            createSection.classList.remove('hidden');
        }
        console.log('Project creation section:', isDemoMode ? 'HIDDEN' : 'VISIBLE');
    }
    
    // Update demo buttons visibility  
    const demoButtons = document.querySelector('.flex.justify-center.space-x-4.mb-8');
    if (demoButtons) {
        if (isDemoMode) {
            demoButtons.style.display = 'flex';
            demoButtons.classList.remove('hidden');
        } else {
            demoButtons.style.display = 'none';
            demoButtons.classList.add('hidden');
        }
        console.log('Demo buttons:', isDemoMode ? 'VISIBLE' : 'HIDDEN');
    }
    
    // Update demo info visibility
    const demoInfo = document.getElementById('demoInfo');
    if (demoInfo && isDemoMode) {
        demoInfo.classList.remove('hidden');
    } else if (demoInfo && !isDemoMode) {
        demoInfo.classList.add('hidden');
    }
}

// Initialize demo mode based on URL parameter or localStorage
function initializeDemoMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get('demo');
    const savedMode = localStorage.getItem('demoMode');
    
    if (demoParam === 'true' || savedMode === 'true') {
        isDemoMode = true;
        demoModeToggle.checked = true;
    }
    
    updateModeIndicator();
}

// Save demo mode preference
function saveDemoModePreference() {
    localStorage.setItem('demoMode', isDemoMode.toString());
}

// Override loadProjects to save preference
const originalLoadProjects = loadProjects;
loadProjects = async function() {
    saveDemoModePreference();
    return await originalLoadProjects();
};

// Console log for debugging
console.log('AI 팀 분석 서비스 JavaScript 로드됨');
console.log('사용 가능한 기능: 프로젝트 생성, 팀원 추가, AI 분석, 파일 업로드, 데모 테스트, Demo Mode Toggle');

// Initialize demo mode on page load  
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App.js DOMContentLoaded - Starting initialization');
    
    setTimeout(() => {
        console.log('🔧 Initializing demo mode...');
        initializeDemoMode();
        
        // Force update UI elements after DOM is ready
        console.log('🎨 Updating UI mode indicators...');
        updateModeIndicator();
        
        console.log('✅ App.js initialization complete');
    }, 200); // Slight delay to ensure DOM is ready
});