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
        let projects = await apiRequest(`/api/projects?mode=${mode}`);
        
        // Additional filtering for real mode to exclude demo-like projects
        if (!isDemoMode) {
            const demoLikeNames = [
                '📊 글로벌 제조업체 디지털 전환 전략',
                '🏦 금융사 ESG 경영 컨설팅', 
                '🚀 스타트업 성장 전략 및 투자 유치'
            ];
            projects = projects.filter(project => !demoLikeNames.includes(project.name));
        }
        
        displayProjects(projects);
        updateModeIndicator();
    } catch (error) {
        console.error('프로젝트 로드 실패:', error);
        showNotification('프로젝트를 불러오는데 실패했습니다.', 'error');
    }
}

function displayProjects(projects) {
    if (projects.length === 0) {
        let emptyMessage, emptyIcon, emptyActions = '';
        
        if (isDemoMode) {
            emptyMessage = '데모 프로젝트가 없습니다.';
            emptyIcon = 'fas fa-flask text-purple-500';
            emptyActions = `
                <div class="mt-4">
                    <p class="text-sm text-gray-600 mb-3">🚀 Demo Test 버튼을 클릭하여 샘플 프로젝트를 생성해보세요!</p>
                    <button onclick="handleDemoTest()" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                        <i class="fas fa-magic mr-2"></i>Demo Test 시작
                    </button>
                </div>
            `;
        } else {
            emptyMessage = '실제 프로젝트가 없습니다.';
            emptyIcon = 'fas fa-briefcase text-blue-500';
            emptyActions = `
                <div class="mt-4">
                    <p class="text-sm text-gray-600 mb-3">새로운 컨설팅 프로젝트를 생성하여 AI 팀 분석을 시작해보세요!</p>
                    <button onclick="scrollToProjectCreation()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-plus mr-2"></i>프로젝트 생성하기
                    </button>
                </div>
            `;
        }
            
        projectList.innerHTML = `
            <div class="text-center py-12">
                <i class="${emptyIcon} text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">${emptyMessage}</h3>
                ${emptyActions}
            </div>
        `;
        return;
    }

    // Add header with instructions if in demo mode
    const headerHtml = isDemoMode ? `
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div class="flex items-center">
                <i class="fas fa-magic text-purple-600 mr-2"></i>
                <div>
                    <h4 class="font-semibold text-purple-800">🎭 Demo 모드</h4>
                    <p class="text-sm text-purple-700 mt-1">
                        아래 샘플 프로젝트 중 하나를 클릭하여 팀 구성을 확인하고 AI 분석을 체험해보세요!
                    </p>
                </div>
            </div>
        </div>
    ` : '';

    projectList.innerHTML = headerHtml + projects.map(project => {
        const isDemoProject = project.name.includes('📊') || project.name.includes('🏦') || project.name.includes('🚀');
        const demoIndicator = isDemoProject ? `
            <span class="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full border border-purple-200 animate-pulse">
                <i class="fas fa-flask mr-1"></i>DEMO
            </span>
        ` : '';

        return `
            <div class="project-item bg-white border border-gray-200 p-4 rounded-lg hover:bg-gray-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5" 
                 onclick="selectProject(${project.id})">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center">
                            <h5 class="font-semibold text-gray-800">${project.name}</h5>
                            ${demoIndicator}
                        </div>
                        ${project.client_company ? `<p class="text-sm text-gray-600 mt-1">
                            <i class="fas fa-building mr-1"></i>${project.client_company}
                        </p>` : ''}
                        ${project.rfp_summary ? `<p class="text-sm text-gray-500 mt-2 line-clamp-2">${project.rfp_summary.slice(0, 120)}...</p>` : ''}
                        ${isDemoMode && isDemoProject ? `
                            <div class="mt-2 text-xs text-purple-600">
                                <i class="fas fa-mouse-pointer mr-1"></i>클릭하여 팀 구성 보기 → AI 분석 체험
                            </div>
                        ` : ''}
                    </div>
                    <div class="text-right ml-4">
                        <span class="text-xs text-gray-500">${formatDate(project.created_at)}</span>
                        <div class="flex items-center mt-1 justify-end">
                            <i class="fas fa-arrow-right text-blue-600 hover:text-blue-800 transition-colors"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function handleCreateProject(e) {
    e.preventDefault();
    
    const projectName = document.getElementById('projectName').value;
    const clientCompany = document.getElementById('clientCompany').value;
    let rfpContent = document.getElementById('rfpContent').value;
    
    // Check which input method is active
    const textInputSection = document.getElementById('textInputSection');
    const fileUploadSection = document.getElementById('fileUploadSection');
    const isFileUploadMode = !fileUploadSection.classList.contains('hidden');

    if (!projectName.trim()) {
        showNotification('프로젝트명을 입력해주세요.', 'warning');
        return;
    }

    // Validate RFP content based on input method
    if (isFileUploadMode) {
        if (!selectedRfpFile) {
            showNotification('RFP 파일을 업로드하거나 직접 입력 탭에서 내용을 입력해주세요.', 'warning');
            return;
        }
    } else {
        if (!rfpContent.trim()) {
            showNotification('RFP 내용을 입력하거나 파일 업로드 탭에서 파일을 선택해주세요.', 'warning');
            return;
        }
    }

    try {
        showLoading('프로젝트를 생성하고 AI 분석 중...');
        
        // If file is selected, read its content
        if (selectedRfpFile) {
            try {
                const fileContent = await readFileContent(selectedRfpFile);
                // Combine file content with manual input if both exist
                if (rfpContent.trim()) {
                    rfpContent = rfpContent + '\n\n=== 업로드된 파일 내용 ===\n' + fileContent;
                } else {
                    rfpContent = fileContent;
                }
            } catch (error) {
                console.warn('파일 읽기 실패:', error);
                if (!rfpContent.trim()) {
                    throw new Error('파일을 읽을 수 없습니다. 직접 입력 모드를 사용해주세요.');
                }
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

        // File content is already included in RFP content, no separate upload needed

        hideLoading();
        showNotification('프로젝트가 성공적으로 생성되었습니다!', 'success');
        
        // Reset form and file selections
        createProjectForm.reset();
        selectedRfpFile = null;
        
        // Reset file upload UI
        const uploadedFileInfo = document.getElementById('uploadedFileInfo');
        const rfpDropZone = document.getElementById('rfpDropZone');
        const rfpFileInput = document.getElementById('rfpFileInput');
        
        if (uploadedFileInfo) uploadedFileInfo.classList.add('hidden');
        if (rfpDropZone) rfpDropZone.classList.remove('hidden');
        if (rfpFileInput) rfpFileInput.value = '';
        
        // Reset to text input tab
        const textInputTab = document.getElementById('textInputTab');
        const fileUploadTab = document.getElementById('fileUploadTab');
        const textInputSection = document.getElementById('textInputSection');
        const fileUploadSection = document.getElementById('fileUploadSection');
        
        if (textInputTab && fileUploadTab && textInputSection && fileUploadSection) {
            textInputTab.classList.add('border-blue-500', 'text-blue-600');
            textInputTab.classList.remove('border-transparent', 'text-gray-500');
            fileUploadTab.classList.add('border-transparent', 'text-gray-500');
            fileUploadTab.classList.remove('border-blue-500', 'text-blue-600');
            textInputSection.classList.remove('hidden');
            fileUploadSection.classList.add('hidden');
        }
        
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
        
        // For text files, read as text
        if (file.type === 'text/plain') {
            reader.onload = (e) => {
                const content = e.target.result;
                const summary = summarizeContent(content);
                resolve(`=== 텍스트 파일 내용 (${file.name}) ===\n\n${content}\n\n=== 내용 요약 ===\n${summary}`);
            };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file, 'UTF-8');
        } 
        // For PDF files, attempt enhanced text extraction
        else if (file.type === 'application/pdf') {
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    // Convert to string for pattern matching
                    let rawText = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        rawText += String.fromCharCode(uint8Array[i]);
                    }
                    
                    // Extract text between stream objects (PDF structure)
                    const extractedTexts = [];
                    
                    // Method 1: Look for text streams
                    const streamPattern = /stream\s*(.*?)\s*endstream/gs;
                    let match;
                    while ((match = streamPattern.exec(rawText)) !== null) {
                        const streamContent = match[1];
                        // Decode basic text content
                        const decodedText = extractTextFromPDFStream(streamContent);
                        if (decodedText && decodedText.length > 5) {
                            extractedTexts.push(decodedText);
                        }
                    }
                    
                    // Method 2: Look for direct text patterns
                    const textPatterns = [
                        /\(([\uAC00-\uD7A3\u3131-\u3163\w\s\.,!?\-:：]+)\)/g, // Text in parentheses
                        /\[([\uAC00-\uD7A3\u3131-\u3163\w\s\.,!?\-:：]+)\]/g, // Text in brackets
                        /Tj\s*([^\n\r]*)/g, // PDF text show operators
                        /TJ\s*\[([^\]]*)\]/g // PDF text show array
                    ];
                    
                    textPatterns.forEach(pattern => {
                        let match;
                        while ((match = pattern.exec(rawText)) !== null) {
                            const text = match[1].trim();
                            if (text.length > 2 && /[\uAC00-\uD7A3\u3131-\u3163]/.test(text)) {
                                extractedTexts.push(text);
                            }
                        }
                    });
                    
                    // Method 3: Unicode extraction for Korean text
                    const unicodeKoreanPattern = /\\([0-9]{3,4})/g;
                    const koreanChars = [];
                    while ((match = unicodeKoreanPattern.exec(rawText)) !== null) {
                        const charCode = parseInt(match[1], 8);
                        if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
                            koreanChars.push(String.fromCharCode(charCode));
                        }
                    }
                    
                    if (koreanChars.length > 0) {
                        extractedTexts.push(koreanChars.join(''));
                    }
                    
                    // Combine and clean extracted text
                    const combinedText = extractedTexts
                        .filter(text => text && text.trim().length > 2)
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    if (combinedText && combinedText.length > 10) {
                        const summary = summarizeContent(combinedText);
                        resolve(`=== PDF 파일 내용 (${file.name}) ===\n\n${combinedText.substring(0, 2000)}\n\n=== 추출된 내용 요약 ===\n${summary}\n\n[주의: 클라이언트 기반 PDF 파싱으로 일부 내용이 누락될 수 있습니다.]`);
                    } else {
                        resolve(createFallbackFileInfo(file, 'PDF', '한국어 텍스트를 추출할 수 없었습니다. PDF의 구조가 복잡하거나 이미지 기반일 수 있습니다.'));
                    }
                } catch (error) {
                    console.warn('PDF 파싱 오류:', error);
                    resolve(createFallbackFileInfo(file, 'PDF', 'PDF 파싱 중 오류가 발생했습니다.'));
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        }
        // For DOCX files, attempt XML-based text extraction
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const extractedText = await extractTextFromDOCX(arrayBuffer);
                    
                    if (extractedText && extractedText.length > 10) {
                        const summary = summarizeContent(extractedText);
                        resolve(`=== DOCX 파일 내용 (${file.name}) ===\n\n${extractedText}\n\n=== 추출된 내용 요약 ===\n${summary}\n\n[주의: 기본 DOCX 파싱으로 서식 정보는 제외됩니다.]`);
                    } else {
                        resolve(createFallbackFileInfo(file, 'Word', '텍스트 내용을 추출할 수 없었습니다. 문서가 복잡하거나 보호되어 있을 수 있습니다.'));
                    }
                } catch (error) {
                    console.warn('DOCX 파싱 오류:', error);
                    resolve(createFallbackFileInfo(file, 'Word', 'DOCX 파싱 중 오류가 발생했습니다.'));
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        }
        // For DOC files and other documents
        else if (file.type === 'application/msword') {
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    let text = '';
                    
                    // Try different encodings for DOC files
                    const encodings = ['utf-8', 'euc-kr', 'cp949', 'iso-8859-1'];
                    let bestText = '';
                    
                    for (const encoding of encodings) {
                        try {
                            const decoder = new TextDecoder(encoding, { fatal: false });
                            const decoded = decoder.decode(uint8Array);
                            
                            // Count Korean characters to find best encoding
                            const koreanCount = (decoded.match(/[\uAC00-\uD7A3]/g) || []).length;
                            if (koreanCount > bestText.match(/[\uAC00-\uD7A3]/g)?.length || 0) {
                                bestText = decoded;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    // Extract readable text patterns
                    const readableText = bestText.match(/[\uAC00-\uD7A3\u3131-\u3163\w\s\.,!?\-:：\n\r]+/g);
                    
                    if (readableText && readableText.length > 0) {
                        const cleanedText = readableText
                            .filter(text => text.trim().length > 5)
                            .join(' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 2000);
                        
                        const summary = summarizeContent(cleanedText);
                        resolve(`=== DOC 파일 내용 (${file.name}) ===\n\n${cleanedText}\n\n=== 추출된 내용 요약 ===\n${summary}\n\n[주의: 기본 DOC 파싱으로 일부 내용이 누락될 수 있습니다.]`);
                    } else {
                        resolve(createFallbackFileInfo(file, 'Word', 'DOC 파일에서 텍스트를 추출할 수 없었습니다.'));
                    }
                } catch (error) {
                    console.warn('DOC 파싱 오류:', error);
                    resolve(createFallbackFileInfo(file, 'Word (DOC)', 'DOC 파싱 중 오류가 발생했습니다.'));
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        }
        // For other document files
        else {
            resolve(createFallbackFileInfo(file, getFileTypeDescription(file.type), '지원되지 않는 파일 형식입니다.'));
        }
    });
}

// Content summarization function
function summarizeContent(content) {
    if (!content || content.length < 50) {
        return '내용이 너무 짧아 요약할 수 없습니다.';
    }
    
    const lines = content.split('\n').filter(line => line.trim());
    const summary = [];
    
    // Extract key points
    const keyPatterns = [
        /프로젝트.*?[:：]/gi,
        /기업.*?[:：]/gi,
        /회사.*?[:：]/gi,
        /요구사항.*?[:：]/gi,
        /목표.*?[:：]/gi,
        /기간.*?[:：]/gi,
        /예산.*?[:：]/gi,
        /범위.*?[:：]/gi,
        /성과.*?[:：]/gi,
        /기대.*?[:：]/gi
    ];
    
    lines.forEach(line => {
        keyPatterns.forEach(pattern => {
            if (pattern.test(line)) {
                summary.push(`• ${line.trim()}`);
            }
        });
    });
    
    // If no key patterns found, extract first few meaningful lines
    if (summary.length === 0) {
        const meaningfulLines = lines
            .filter(line => line.length > 10)
            .slice(0, 5)
            .map(line => `• ${line.trim()}`);
        summary.push(...meaningfulLines);
    }
    
    return summary.length > 0 ? summary.join('\n') : '주요 내용을 자동으로 요약할 수 없습니다.';
}

// Helper function to extract text from PDF streams
function extractTextFromPDFStream(streamContent) {
    try {
        // Remove PDF operators and extract text
        let text = streamContent
            .replace(/BT\s*/g, '') // Begin text
            .replace(/ET\s*/g, '') // End text
            .replace(/Tf\s*/g, '') // Font
            .replace(/Td\s*/g, '') // Text positioning
            .replace(/TL\s*/g, '') // Text leading
            .replace(/Tm\s*[\d\s\.\-]+/g, '') // Text matrix
            .replace(/q\s*/g, '') // Save state
            .replace(/Q\s*/g, '') // Restore state
            .replace(/cm\s*[\d\s\.\-]+/g, '') // Coordinate matrix
            .replace(/re\s*/g, '') // Rectangle
            .replace(/f\s*/g, '') // Fill
            .replace(/S\s*/g, '') // Stroke
            .replace(/RG\s*[\d\s\.]+/g, '') // Color
            .replace(/rg\s*[\d\s\.]+/g, '') // Color
            .replace(/gs\s*\w+/g, ''); // Graphics state
        
        // Extract text in parentheses or brackets
        const textMatches = text.match(/\(([^)]+)\)|<([^>]+)>/g);
        if (textMatches) {
            return textMatches
                .map(match => match.replace(/[()<>]/g, ''))
                .filter(text => text.trim().length > 0)
                .join(' ');
        }
        
        return '';
    } catch (error) {
        return '';
    }
}

// Helper function to extract text from DOCX files
async function extractTextFromDOCX(arrayBuffer) {
    try {
        // Convert ArrayBuffer to binary string
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        
        // Look for document.xml content (DOCX is a ZIP with XML files)
        const documentXMLPattern = /document\.xml.*?<w:document[^>]*>(.*?)<\/w:document>/s;
        const match = documentXMLPattern.exec(binaryString);
        
        if (match) {
            const xmlContent = match[1];
            
            // Extract text from w:t elements
            const textPattern = /<w:t[^>]*>(.*?)<\/w:t>/gs;
            const textNodes = [];
            let textMatch;
            
            while ((textMatch = textPattern.exec(xmlContent)) !== null) {
                const text = textMatch[1]
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .trim();
                
                if (text.length > 0) {
                    textNodes.push(text);
                }
            }
            
            return textNodes.join(' ').substring(0, 2000);
        }
        
        // Fallback: try to find Korean text directly in the binary
        const koreanPattern = /[\uAC00-\uD7A3\u3131-\u3163\s\w\.,!?\-:：]+/g;
        const koreanMatches = binaryString.match(koreanPattern);
        
        if (koreanMatches) {
            return koreanMatches
                .filter(text => text.trim().length > 5)
                .join(' ')
                .substring(0, 2000);
        }
        
        return '';
    } catch (error) {
        console.warn('DOCX 추출 오류:', error);
        return '';
    }
}

// Helper function to create fallback file info with better guidance
function createFallbackFileInfo(file, fileTypeName, reason) {
    const isKorean = /[\uAC00-\uD7A3]/.test(file.name);
    
    return `=== ${fileTypeName} 파일 (${file.name}) ===

⚠️ 자동 텍스트 추출 실패

사유: ${reason}

파일 정보:
- 파일명: ${file.name}
- 크기: ${(file.size / 1024 / 1024).toFixed(2)} MB
- 형식: ${file.type}
- 업로드: ${new Date().toLocaleString()}

💡 권장 해결 방법:

1️⃣ 텍스트 파일로 변환하여 업로드
   - 문서를 열고 "다른 이름으로 저장" → "텍스트 파일(.txt)" 선택
   - UTF-8 인코딩 옵션이 있다면 선택
   - 변환된 .txt 파일을 다시 업로드

2️⃣ 직접 입력 사용 (추천)
   - 위의 "직접 입력" 탭 클릭
   - 문서 내용을 복사하여 붙여넣기
   - 이 방법이 가장 정확합니다

3️⃣ 문서를 열고 주요 내용만 입력
   아래 템플릿을 참고하여 주요 정보만 입력하세요:

--- RFP 주요 내용 템플릿 ---

프로젝트: [프로젝트명]
기업: [고객사명]
기간: [프로젝트 기간]
예산: [총 예산]

주요 요구사항:
1. [요구사항 1]
2. [요구사항 2]
3. [요구사항 3]

기대효과:
- [기대효과 1]
- [기대효과 2]

기술요구사항:
- [기술요구사항 1]
- [기술요구사항 2]

📝 위 템플릿에 맞춰 문서 내용을 입력하면 AI 분석이 더 정확해집니다.

`;
}

function getFileTypeDescription(mimeType) {
    const descriptions = {
        'application/msword': 'Microsoft Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Microsoft Word (DOCX)',
        'application/pdf': 'PDF',
        'text/plain': '텍스트'
    };
    return descriptions[mimeType] || '알 수 없는 형식의';
}

// Mock file upload function (for demonstration purposes)
// In a real implementation, this would upload files to the server
async function uploadFile(file, type, projectId, memberId = null) {
    return new Promise((resolve) => {
        // Simulate file upload delay
        setTimeout(() => {
            console.log(`Mock file upload: ${file.name} (${type}) for project ${projectId}${memberId ? `, member ${memberId}` : ''}`);
            resolve({
                success: true,
                message: `파일 "${file.name}"이 업로드되었습니다.`,
                fileId: Date.now(),
                url: `mock://uploaded/${file.name}`
            });
        }, 1000);
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
        
        // Show team member addition section
        const addTeamMemberSection = document.getElementById('addTeamMemberSection');
        if (addTeamMemberSection) {
            addTeamMemberSection.classList.remove('hidden');
        }
        
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
                <p class=\"mb-4\">팀원이 없습니다. 팀원을 추가해보세요!</p>
                <button onclick=\"scrollToAddMember()\" class=\"bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors\">
                    <i class=\"fas fa-user-plus mr-2\"></i>첫 번째 팀원 추가하기
                </button>
            </div>
        `;
        return;
    }

    const teamMembersHtml = currentTeamMembers.map(member => `
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
    
    // Add "Add Member" button at the end
    const addMemberButton = `
        <div class=\"text-center py-6\">
            <button onclick=\"scrollToAddMember()\" class=\"bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors\">
                <i class=\"fas fa-user-plus mr-2\"></i>팀원 추가하기
            </button>
        </div>
    `;
    
    teamMembersList.innerHTML = teamMembersHtml + addMemberButton;
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
    
    // Hide team member addition section
    const addTeamMemberSection = document.getElementById('addTeamMemberSection');
    if (addTeamMemberSection) {
        addTeamMemberSection.classList.add('hidden');
    }
    
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
    setupRfpInputTabs();
    setupRfpFileUpload();
    
    // CD Card File Upload (will be setup when project details are shown)
    setupFileUploadArea('cdCardUploadArea', 'cdCardFileInput', 'cdCardFileInfo', 'cdCardFileName', 'removeCdCardFile', handleCdCardFileSelect);
}

// Setup RFP input method tabs
function setupRfpInputTabs() {
    const textInputTab = document.getElementById('textInputTab');
    const fileUploadTab = document.getElementById('fileUploadTab');
    const textInputSection = document.getElementById('textInputSection');
    const fileUploadSection = document.getElementById('fileUploadSection');

    if (!textInputTab || !fileUploadTab) return;

    textInputTab.addEventListener('click', () => {
        // Switch to text input
        textInputTab.classList.add('border-blue-500', 'text-blue-600');
        textInputTab.classList.remove('border-transparent', 'text-gray-500');
        fileUploadTab.classList.add('border-transparent', 'text-gray-500');
        fileUploadTab.classList.remove('border-blue-500', 'text-blue-600');
        
        textInputSection.classList.remove('hidden');
        fileUploadSection.classList.add('hidden');
    });

    fileUploadTab.addEventListener('click', () => {
        // Switch to file upload
        fileUploadTab.classList.add('border-blue-500', 'text-blue-600');
        fileUploadTab.classList.remove('border-transparent', 'text-gray-500');
        textInputTab.classList.add('border-transparent', 'text-gray-500');
        textInputTab.classList.remove('border-blue-500', 'text-blue-600');
        
        fileUploadSection.classList.remove('hidden');
        textInputSection.classList.add('hidden');
    });
}

// Setup RFP file upload with drag and drop
function setupRfpFileUpload() {
    const dropZone = document.getElementById('rfpDropZone');
    const fileInput = document.getElementById('rfpFileInput');
    const uploadedFileInfo = document.getElementById('uploadedFileInfo');
    const uploadedFileName = document.getElementById('uploadedFileName');
    const uploadedFileSize = document.getElementById('uploadedFileSize');
    const filePreview = document.getElementById('filePreview');
    const removeFileBtn = document.getElementById('removeFileBtn');

    if (!dropZone || !fileInput) return;

    // Click to select file
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-400', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleRfpFileSelect(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleRfpFileSelect(file);
        }
    });

    // Remove file button
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedRfpFile = null;
            fileInput.value = '';
            uploadedFileInfo.classList.add('hidden');
            dropZone.classList.remove('hidden');
        });
    }

    // Handle RFP file selection
    async function handleRfpFileSelect(file) {
        // Validate file type and size
        const allowedTypes = ['application/pdf', 'application/msword', 
                             'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                             'text/plain'];
        
        if (!allowedTypes.includes(file.type)) {
            showNotification('지원하지 않는 파일 형식입니다. PDF, DOC, DOCX, TXT 파일만 업로드 가능합니다.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            showNotification('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
            return;
        }

        selectedRfpFile = file;
        
        // Show file info
        uploadedFileName.textContent = file.name;
        uploadedFileSize.textContent = `크기: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        
        // Show loading state for preview
        filePreview.innerHTML = `<div class="flex items-center text-blue-600">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            파일 내용을 분석하고 있습니다...
        </div>`;
        
        try {
            // Read and process file content
            const content = await readFileContent(file);
            
            // Display enhanced preview with formatting
            const lines = content.split('\n');
            const previewLines = lines.slice(0, 15); // Show first 15 lines
            
            filePreview.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold text-green-700">
                            <i class="fas fa-check-circle mr-1"></i>파일 내용 추출 완료
                        </span>
                        <span class="text-xs text-gray-500">
                            ${lines.length > 15 ? `${lines.length}줄 중 15줄 미리보기` : `총 ${lines.length}줄`}
                        </span>
                    </div>
                    <div class="bg-gray-50 p-3 rounded text-sm max-h-48 overflow-y-auto border-l-4 border-blue-500">
                        <pre class="whitespace-pre-wrap font-mono text-xs leading-relaxed">${previewLines.join('\n')}</pre>
                        ${lines.length > 15 ? '<div class="text-center text-gray-500 mt-2 text-xs">... (더 많은 내용이 있습니다)</div>' : ''}
                    </div>
                    <div class="text-xs text-green-600 flex items-center">
                        <i class="fas fa-info-circle mr-1"></i>
                        프로젝트 생성 시 전체 내용이 RFP에 포함됩니다
                    </div>
                </div>
            `;
            
            showNotification(`파일 "${file.name}" 내용이 성공적으로 추출되었습니다.`, 'success');
            
        } catch (error) {
            console.warn('파일 미리보기 오류:', error);
            filePreview.innerHTML = `
                <div class="text-orange-600 text-sm">
                    <i class="fas fa-exclamation-triangle mr-1"></i>
                    파일 미리보기를 생성할 수 없습니다. 프로젝트 생성 시 내용 추출을 다시 시도합니다.
                </div>
            `;
        }
        
        dropZone.classList.add('hidden');
        uploadedFileInfo.classList.remove('hidden');
    }
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
        // Show confirmation dialog with clear instructions
        if (!confirm('🚀 데모 테스트를 시작하시겠습니까?\n\n📋 3개의 샘플 컨설팅 프로젝트와 전문 팀원들이 생성됩니다:\n• 디지털 전환 전략 프로젝트\n• ESG 경영 컨설팅 프로젝트  \n• 스타트업 투자유치 프로젝트\n\n✨ 생성 후 체험 방법:\n1️⃣ Demo 모드 토글을 켜주세요\n2️⃣ 관심있는 프로젝트를 클릭하세요\n3️⃣ 팀원 구성을 확인하세요\n4️⃣ "AI 팀 분석 시작" 버튼을 클릭하세요')) {
            return;
        }

        showLoading('📋 데모 프로젝트를 생성하고 있습니다...\n\n전문 컨설팅 프로젝트 3개와\n각 프로젝트별 팀원 4명씩 총 12명을 생성 중입니다\n\n잠시만 기다려주세요 (약 5-10초)');
        
        // Generate demo data
        const demoData = await apiRequest('/api/demo/generate', {
            method: 'POST'
        });
        
        hideLoading();
        
        // Automatically enable demo mode after creation
        const demoToggle = document.getElementById('demoModeToggle');
        if (demoToggle && !demoToggle.checked) {
            demoToggle.checked = true;
            isDemoMode = true;
            updateModeIndicator();
        }
        
        // Show demo info banner
        const demoInfo = document.getElementById('demoInfo');
        if (demoInfo) {
            demoInfo.classList.remove('hidden');
        }
        
        // Reload projects to show demo data
        await loadProjects();
        
        // Show success with step-by-step guidance
        showNotification('✨ 데모 프로젝트 생성 완료!', 'success');
        
        // Show detailed step-by-step instructions
        setTimeout(() => {
            showDemoGuidanceModal();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        showNotification('데모 데이터 생성 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// Demo guidance modal
function showDemoGuidanceModal() {
    const overlay = document.createElement('div');
    overlay.id = 'demoGuidanceModal';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fadeIn';
    overlay.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-lg mx-4 shadow-2xl transform animate-slideUp">
            <!-- Header -->
            <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-rocket text-3xl text-white"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">🎯 데모 체험 가이드</h3>
                <p class="text-gray-600">3개의 전문 컨설팅 프로젝트가 준비되었습니다!</p>
            </div>
            
            <!-- Steps -->
            <div class="space-y-4 mb-6">
                <div class="flex items-start p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                    <div class="w-8 h-8 mr-3 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                        <h4 class="font-semibold text-blue-800 mb-1">프로젝트 선택하기</h4>
                        <p class="text-blue-700 text-sm">아래 목록에서 관심있는 프로젝트를 클릭하세요</p>
                        <ul class="text-xs text-blue-600 mt-1 ml-2">
                            <li>• 📊 글로벌 제조업체 디지털 전환 전략</li>
                            <li>• 🏦 금융사 ESG 경영 컨설팅</li>
                            <li>• 🚀 스타트업 성장 전략 및 투자 유치</li>
                        </ul>
                    </div>
                </div>
                
                <div class="flex items-start p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                    <div class="w-8 h-8 mr-3 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                        <h4 class="font-semibold text-green-800 mb-1">팀 구성 확인하기</h4>
                        <p class="text-green-700 text-sm">각 프로젝트에는 4명의 전문 컨설턴트가 배정되어 있습니다</p>
                        <p class="text-xs text-green-600 mt-1">• 역할, MBTI, 전문 스킬, 경험을 확인해보세요</p>
                    </div>
                </div>
                
                <div class="flex items-start p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg">
                    <div class="w-8 h-8 mr-3 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                        <h4 class="font-semibold text-purple-800 mb-1">AI 분석 시작하기</h4>
                        <p class="text-purple-700 text-sm">"AI 팀 분석 시작" 버튼을 클릭하여 고급 AI 분석을 체험하세요</p>
                        <p class="text-xs text-purple-600 mt-1">• 팀 케미스트리, 도메인 적합성, 권장사항을 확인할 수 있습니다</p>
                    </div>
                </div>
            </div>
            
            <!-- Action buttons -->
            <div class="flex space-x-3">
                <button onclick="hideDemoGuidanceModal()" 
                        class="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                    <i class="fas fa-times mr-2"></i>닫기
                </button>
                <button onclick="hideDemoGuidanceModal(); scrollToProjects();" 
                        class="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all">
                    <i class="fas fa-arrow-down mr-2"></i>프로젝트 보기
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function hideDemoGuidanceModal() {
    const modal = document.getElementById('demoGuidanceModal');
    if (modal) {
        modal.classList.add('animate-fadeOut');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function scrollToProjects() {
    const projectSection = document.getElementById('projectList');
    if (projectSection) {
        projectSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function scrollToProjectCreation() {
    const createSection = document.getElementById('projectCreationSection');
    if (createSection) {
        createSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Focus on project name input for better UX
        setTimeout(() => {
            const projectNameInput = document.getElementById('projectName');
            if (projectNameInput) {
                projectNameInput.focus();
            }
        }, 500);
    }
}

function scrollToAddMember() {
    const addMemberSection = document.getElementById('addTeamMemberSection');
    if (addMemberSection) {
        addMemberSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Focus on member name input for better UX
        setTimeout(() => {
            const memberNameInput = document.getElementById('memberName');
            if (memberNameInput) {
                memberNameInput.focus();
            }
        }, 500);
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