// Global variables
let currentProject = null;
let currentTeamMembers = [];
let radarChartInstance = null;
let coverageChartInstance = null;

// DOM elements
const createProjectForm = document.getElementById('createProjectForm');
const addTeamMemberForm = document.getElementById('addTeamMemberForm');
const projectList = document.getElementById('projectList');
const projectDetails = document.getElementById('projectDetails');
const teamMembersList = document.getElementById('teamMembersList');
const analyzeTeamBtn = document.getElementById('analyzeTeamBtn');
const analysisResults = document.getElementById('analysisResults');
const backToProjectsBtn = document.getElementById('backToProjects');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    createProjectForm.addEventListener('submit', handleCreateProject);
    addTeamMemberForm.addEventListener('submit', handleAddTeamMember);
    analyzeTeamBtn.addEventListener('click', handleAnalyzeTeam);
    backToProjectsBtn.addEventListener('click', backToProjectList);
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

// API functions
async function apiRequest(url, options = {}) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            timeout: 30000,
            ...options
        });
        return response.data;
    } catch (error) {
        console.error('API 요청 오류:', error);
        
        if (error.response) {
            throw new Error(error.response.data?.error || 'API 요청 중 오류가 발생했습니다.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
        } else {
            throw new Error('네트워크 오류가 발생했습니다.');
        }
    }
}

// Project management
async function loadProjects() {
    try {
        const projects = await apiRequest('/api/projects');
        displayProjects(projects);
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
    
    const formData = new FormData(e.target);
    const projectData = {
        name: formData.get('projectName') || document.getElementById('projectName').value,
        client_company: formData.get('clientCompany') || document.getElementById('clientCompany').value,
        rfp_content: formData.get('rfpContent') || document.getElementById('rfpContent').value
    };

    if (!projectData.name.trim()) {
        showNotification('프로젝트명을 입력해주세요.', 'warning');
        return;
    }

    try {
        showLoading('프로젝트를 생성하고 AI 분석 중...');
        
        const project = await apiRequest('/api/projects', {
            method: 'POST',
            data: projectData
        });

        hideLoading();
        showNotification('프로젝트가 성공적으로 생성되었습니다!', 'success');
        
        // Reset form
        createProjectForm.reset();
        
        // Reload projects and select the new one
        await loadProjects();
        selectProject(project.id);
        
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
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
        const member = await apiRequest('/api/team-members', {
            method: 'POST',
            data: memberData
        });

        currentTeamMembers.push(member);
        displayTeamMembers();
        updateAnalyzeButton();
        
        // Reset form
        addTeamMemberForm.reset();
        
        showNotification('팀원이 추가되었습니다!', 'success');
        
    } catch (error) {
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
        showLoading('AI가 팀을 분석하고 있습니다... 잠시만 기다려주세요.');
        
        const analysisData = await apiRequest('/api/analyze-team', {
            method: 'POST',
            data: { project_id: currentProject.id }
        });

        hideLoading();
        displayAnalysisResults(analysisData);
        
        showNotification('팀 분석이 완료되었습니다!', 'success');
        
    } catch (error) {
        hideLoading();
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

// Console log for debugging
console.log('AI 팀 분석 서비스 JavaScript 로드됨');
console.log('사용 가능한 기능: 프로젝트 생성, 팀원 추가, AI 분석');