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
    console.log('Demo Mode:', isDemoMode ? 'ON' : 'OFF');
    
    // Reload projects with new mode
    loadProjects();
    
    // Update UI elements
    updateModeIndicator();
    
    // Show notification
    showNotification(
        isDemoMode ? 
        '🎭 Demo 모드가 활성화되었습니다. Demo 프로젝트만 표시됩니다.' : 
        '💼 실제 모드가 활성화되었습니다. 실제 프로젝트만 표시됩니다.',
        'info'
    );
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
    
    // Update project creation form visibility
    const createSection = document.querySelector('.bg-white.rounded-lg.shadow-lg');
    if (createSection) {
        createSection.style.display = isDemoMode ? 'none' : 'block';
    }
    
    // Update demo buttons visibility
    const demoButtons = document.querySelector('.flex.justify-center.space-x-4.mb-8');
    if (demoButtons) {
        demoButtons.style.display = isDemoMode ? 'flex' : 'none';
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
    setTimeout(initializeDemoMode, 100); // Slight delay to ensure DOM is ready
});