// Quiz state
let allQuestions = [];
let questions = [];
let currentIndex = 0;
let timerInterval;
let totalSeconds = 0;
let markedQuestions = new Set();
let userName = "Quiz Taker";

// DOM elements
const setupScreen = document.getElementById('setup');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const quizContainer = document.getElementById('quiz-container');
const resultsContainer = document.getElementById('results-container');
const timerElement = document.getElementById('timer');
const timeRemainingElement = document.getElementById('time-remaining');
const progressBar = document.getElementById('quiz-progress');
const progressText = document.getElementById('progress-text');
const currentQElement = document.getElementById('current-q');
const totalQsElement = document.getElementById('total-qs');
const markedCountElement = document.getElementById('marked-count');
const userInfoElement = document.getElementById('user-info');
const navigationPanel = document.getElementById('navigation-panel');
const questionGrid = document.getElementById('question-grid');
const toggleNavBtn = document.getElementById('toggle-nav');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Load user name
  const savedName = localStorage.getItem('quizUserName');
  if (savedName) {
    document.getElementById('user-name').value = savedName;
    userName = savedName;
    userInfoElement.textContent = `Welcome, ${userName}!`;
  }

  // Event listeners
  document.getElementById('start-btn').addEventListener('click', startQuiz);
  document.getElementById('prev-btn').addEventListener('click', goToPrevious);
  document.getElementById('next-btn').addEventListener('click', goToNext);
  document.getElementById('submit-btn').addEventListener('click', submitQuiz);
  document.getElementById('user-name').addEventListener('input', updateUserName);
  toggleNavBtn.addEventListener('click', toggleNavigationPanel);
});

// Function to create question navigation
function createQuestionNavigation() {
  questionGrid.innerHTML = '';
  
  questions.forEach((q, index) => {
    const numberBtn = document.createElement('div');
    numberBtn.classList.add('question-number');
    numberBtn.textContent = index + 1;
    numberBtn.setAttribute('data-index', index);
    
    // Set initial state
    updateQuestionNumberState(numberBtn, index);
    
    // Add click event
    numberBtn.addEventListener('click', () => navigateToQuestion(index));
    
    questionGrid.appendChild(numberBtn);
  });
}

// Function to update question number appearance
function updateQuestionNumberState(numberBtn, index) {
  const q = questions[index];
  
  // Remove all state classes
  numberBtn.classList.remove('current', 'answered', 'marked');
  
  // Add current class if this is the current question
  if (index === currentIndex) {
    numberBtn.classList.add('current');
  }
  
  // Add answered class if question has answers
  if (q.userSelected && q.userSelected.length > 0) {
    numberBtn.classList.add('answered');
  }
  
  // Add marked class if question is marked
  if (markedQuestions.has(index)) {
    numberBtn.classList.add('marked');
  }
}

// Function to navigate to specific question
function navigateToQuestion(index) {
  if (index >= 0 && index < questions.length) {
    currentIndex = index;
    renderQuestion(currentIndex);
    updateProgress();
    updateQuestionNavigation();
  }
}

// Function to update all question numbers
function updateQuestionNavigation() {
  const numberButtons = questionGrid.querySelectorAll('.question-number');
  
  numberButtons.forEach((btn, index) => {
    updateQuestionNumberState(btn, index);
  });
}

// Function to toggle navigation panel
function toggleNavigationPanel() {
  navigationPanel.classList.toggle('collapsed');
  const icon = toggleNavBtn.querySelector('i');
  
  if (navigationPanel.classList.contains('collapsed')) {
    icon.className = 'fas fa-chevron-down';
    toggleNavBtn.title = 'Expand navigation';
  } else {
    icon.className = 'fas fa-chevron-up';
    toggleNavBtn.title = 'Collapse navigation';
  }
}

function updateUserName() {
  userName = document.getElementById('user-name').value;
  userInfoElement.textContent = `Welcome, ${userName}!`;
  localStorage.setItem('quizUserName', userName);
}

// Start quiz
async function startQuiz() {
  const numQuestions = parseInt(document.getElementById('num-questions').value);
  const timePerQuestion = parseInt(document.getElementById('time-per-question').value);
  const questionType = document.getElementById('question-type').value;
  
  if (isNaN(numQuestions) || numQuestions < 5) {
    alert("Please enter at least 5 questions.");
    return;
  }

  // Save user name
  localStorage.setItem('quizUserName', userName);

  // Show quiz screen
  setupScreen.style.display = 'none';
  quizScreen.style.display = 'block';
  timerElement.style.display = 'flex';
  
  // Load questions
  await loadQuiz(numQuestions, questionType);
  
  // Initialize quiz state
  currentIndex = 0;
  markedQuestions.clear();
  updateMarkedCount();

  // Create question navigation
  createQuestionNavigation();
  
  // Start timer
  totalSeconds = numQuestions * timePerQuestion;
  startTimer();
  
  // Render first question
  renderQuestion(currentIndex);
  updateProgress();
}

// Load questions from JSON
async function loadQuiz(totalQuestions, questionType) {
  try {
    const response = await fetch('quiz.json');
    allQuestions = await response.json();

    if (!allQuestions || allQuestions.length === 0) {
      quizContainer.innerHTML = '<p style="color:red">❌ No questions found in quiz.json</p>';
      return;
    }

    // Filter questions by type
    if (questionType === 'single') {
      questions = allQuestions.filter(q => !q.is_multi_choice);
    } else if (questionType === 'multi') {
      questions = allQuestions.filter(q => q.is_multi_choice);
    } else {
      // Mixed - maintain the original ratio
      const multiQuestions = allQuestions.filter(q => q.is_multi_choice);
      const singleQuestions = allQuestions.filter(q => !q.is_multi_choice);
      
      let multiCount = Math.floor(totalQuestions * 0.25);
      let singleCount = totalQuestions - multiCount;
      
      // Adjust if we don't have enough of one type
      if (multiCount > multiQuestions.length) {
        multiCount = multiQuestions.length;
        singleCount = Math.min(totalQuestions - multiCount, singleQuestions.length);
      } else if (singleCount > singleQuestions.length) {
        singleCount = singleQuestions.length;
        multiCount = Math.min(totalQuestions - singleCount, multiQuestions.length);
      }
      
      const selectedMulti = shuffleArray(multiQuestions).slice(0, multiCount);
      const selectedSingle = shuffleArray(singleQuestions).slice(0, singleCount);
      
      questions = shuffleArray([...selectedMulti, ...selectedSingle]);
      
      questions.forEach(item => {
        item.answers = shuffleArray(item.answers);
      });

    }
    
    // Limit to requested number
    questions = questions.slice(0, totalQuestions);
    
    // Initialize user selections
    questions.forEach(q => {
      q.userSelected = [];
    });
    
    // Update UI
    totalQsElement.textContent = questions.length;
    
  } catch (error) {
    quizContainer.innerHTML = `<p style="color:red">❌ Error loading quiz: ${error}</p>`;
  }
}

// Render current question
function renderQuestion(index) {
  const q = questions[index];
  quizContainer.innerHTML = '';
  
  const qDiv = document.createElement('div');
  qDiv.classList.add('question-block');
  
  // Question header with mark button
  const headerDiv = document.createElement('div');
  headerDiv.classList.add('question-header');
  
  const textDiv = document.createElement('div');
  textDiv.classList.add('question-text');
  
  const qTitle = document.createElement('h3');
  qTitle.textContent = `${index + 1}. ${q.question}`;
  textDiv.appendChild(qTitle);
  
  // Add question type indicator
  const typeIndicator = document.createElement('div');
  typeIndicator.classList.add('question-type-indicator');
  
  if (q.is_multi_choice) {
    typeIndicator.innerHTML = '<i class="fas fa-check-square"></i> Multiple Choice (Select all that apply)';
  } else {
    typeIndicator.innerHTML = '<i class="fas fa-dot-circle"></i> Single Choice (Select one)';
  }
  textDiv.appendChild(typeIndicator);
  
  const markButton = document.createElement('button');
  markButton.classList.add('mark-review');
  markButton.innerHTML = markedQuestions.has(index) ? 
    '<i class="fas fa-bookmark marked"></i>' : 
    '<i class="far fa-bookmark"></i>';
  markButton.addEventListener('click', () => toggleMarkQuestion(index));
  
  headerDiv.appendChild(textDiv);
  headerDiv.appendChild(markButton);
  qDiv.appendChild(headerDiv);
  
  // Answers container
  const answersContainer = document.createElement('div');
  answersContainer.classList.add('answers-container');
  answersContainer.classList.add(q.is_multi_choice ? 'multi-choice' : 'single-choice');
  
  q.answers.forEach((ans, ansIndex) => {
    const answerElement = createAnswerElement(q, index, ans, ansIndex);
    answersContainer.appendChild(answerElement);
  });
  
  qDiv.appendChild(answersContainer);
  
  // Add selection counter for multiple choice questions
  if (q.is_multi_choice) {
    const selectionCounter = document.createElement('div');
    selectionCounter.classList.add('selection-counter');
    selectionCounter.id = `selection-counter-${index}`;
    updateSelectionCounter(index);
    qDiv.appendChild(selectionCounter);
  }
  
  quizContainer.appendChild(qDiv);
  
  // Update navigation
  updateNavigationButtons();
  updateQuestionNavigation();
  currentQElement.textContent = index + 1;
}

// Create individual answer element based on question type
function createAnswerElement(question, qIndex, answer, ansIndex) {
  const answerDiv = document.createElement('div');
  answerDiv.classList.add('answer-option');
  
  const inputId = `q${qIndex}_a${ansIndex}`;
  const isSelected = question.userSelected && question.userSelected.includes(answer);
  
  // Unified design for both single and multiple choice
  if (question.is_multi_choice) {
    // Multiple choice - checkbox behavior but same visual design
    answerDiv.innerHTML = `
      <input type="checkbox" id="${inputId}" class="answer-checkbox" 
             ${isSelected ? 'checked' : ''}>
      <label for="${inputId}" class="answer-label ${isSelected ? 'selected' : ''}">
        <span class="custom-selector">
          <i class="fas fa-check"></i>
        </span>
        <span class="answer-text">${answer}</span>
      </label>
    `;
  } else {
    // Single choice - radio behavior but same visual design
    answerDiv.innerHTML = `
      <input type="radio" id="${inputId}" name="question_${qIndex}" class="answer-radio"
             ${isSelected ? 'checked' : ''}>
      <label for="${inputId}" class="answer-label ${isSelected ? 'selected' : ''}">
        <span class="custom-selector">
          <i class="fas fa-check"></i>
        </span>
        <span class="answer-text">${answer}</span>
      </label>
    `;
  }
  
  // Add click event to the entire answer div
  answerDiv.addEventListener('click', (e) => {
    // Prevent double triggering when clicking directly on the input
    if (e.target.type === 'checkbox' || e.target.type === 'radio') {
      return;
    }
    selectAnswer(qIndex, answer, question.is_multi_choice);
  });
  
  // Also add change event to the input
  const input = answerDiv.querySelector('input');
  input.addEventListener('change', (e) => {
    e.stopPropagation();
    selectAnswer(qIndex, answer, question.is_multi_choice);
  });
  
  return answerDiv;
}


// Update selection counter for multiple choice questions
function updateSelectionCounter(qIndex) {
  const q = questions[qIndex];
  const counter = document.getElementById(`selection-counter-${qIndex}`);
  if (counter) {
    counter.textContent = `Selected: ${q.userSelected.length} of ${q.answers.length}`;
  }
}

// Select/deselect answer - FIXED FOR MULTIPLE CHOICE
function selectAnswer(qIndex, answer, isMulti) {
  const q = questions[qIndex];
  
  if (isMulti) {
    // Multiple choice - toggle selection
    if (q.userSelected.includes(answer)) {
      // Deselect
      q.userSelected = q.userSelected.filter(a => a !== answer);
    } else {
      // Select
      q.userSelected.push(answer);
    }
    
    // Update selection counter
    updateSelectionCounter(qIndex);
  } else {
    // Single choice - replace selection
    q.userSelected = [answer];
  }
  
  // Update the visual state by re-rendering the question
  renderQuestion(qIndex);
  
  // Update question navigation to show answered state
  updateQuestionNavigation();
}


// Toggle mark question for review
function toggleMarkQuestion(index) {
  if (markedQuestions.has(index)) {
    markedQuestions.delete(index);
  } else {
    markedQuestions.add(index);
  }
  updateMarkedCount();
  updateQuestionNavigation();
  renderQuestion(index); // Re-render to update bookmark icon
}

// Update marked questions count
function updateMarkedCount() {
  markedCountElement.textContent = markedQuestions.size;
}

// Navigation functions
function goToPrevious() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion(currentIndex);
    updateProgress();
  }
}

function goToNext() {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
    updateProgress();
  }
}

// Update navigation buttons
function updateNavigationButtons() {
  document.getElementById('prev-btn').style.display = currentIndex === 0 ? 'none' : 'inline-flex';
  document.getElementById('next-btn').style.display = currentIndex === questions.length - 1 ? 'none' : 'inline-flex';
  document.getElementById('submit-container').style.display = currentIndex === questions.length - 1 ? 'block' : 'none';
}

// Update progress bar
function updateProgress() {
  const progress = ((currentIndex + 1) / questions.length) * 100;
  progressBar.style.width = `${progress}%`;
  progressText.textContent = `${Math.round(progress)}%`;
}

// Timer functions
function startTimer() {
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    totalSeconds--;
    updateTimerDisplay();
    
    // Timer warnings
    if (totalSeconds === 300) { // 5 minutes
      timeRemainingElement.classList.add('timer-warning');
    } else if (totalSeconds === 60) { // 1 minute
      timeRemainingElement.classList.remove('timer-warning');
      timeRemainingElement.classList.add('timer-danger');
    }
    
    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      alert("⏰ Time's up! Submitting your answers automatically.");
      submitQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timeRemainingElement.textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Submit quiz and show results
function submitQuiz() {
  clearInterval(timerInterval);
  
  // Hide quiz screen, show results
  quizScreen.style.display = 'none';
  resultsScreen.style.display = 'block';
  
  // Calculate results
  let score = 0;
  questions.forEach(q => {
    const correctSorted = [...q.correct_answers].sort().join('|');
    const chosenSorted = (q.userSelected || []).sort().join('|');
    q.isCorrect = correctSorted === chosenSorted;
    if (q.isCorrect) score++;
  });
  
  showResults(score);
}

// Display results
function showResults(score) {
  const correctCount = score;
  const wrongCount = questions.length - correctCount;
  const percentage = ((correctCount / questions.length) * 100).toFixed(1);
  
  const resultMessage = getResultMessage(percentage);

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="result-summary">
      <h2>${userName}, Quiz Results</h2>
      <div class="result-message ${resultMessage.class}">
        <div class="message-icon">${resultMessage.icon}</div>
        <h3>${resultMessage.title}</h3>
        <p class="message-text">${resultMessage.message}</p>
      </div>
      
      <div class="score-circle" style="--p: ${percentage}%">
        <div class="score-inner">
          <div class="score-percent">${percentage}%</div>
          <div class="score-text">Score</div>
        </div>
      </div>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-value stat-correct">${correctCount}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat">
          <div class="stat-value stat-wrong">${wrongCount}</div>
          <div class="stat-label">Wrong</div>
        </div>
        <div class="stat">
          <div class="stat-value">${questions.length}</div>
          <div class="stat-label">Total</div>
        </div>
      </div>
      
      <div id="filter-buttons">
        <button class="filter-btn active" data-filter="all">All Questions</button>
        <button class="filter-btn" data-filter="correct">Correct Answers</button>
        <button class="filter-btn" data-filter="wrong">Wrong Answers</button>
        <button class="filter-btn" data-filter="marked">Marked Questions</button>
      </div>
      
      <div style="margin-top: 20px;">
        <button class="btn btn-primary" onclick="restartQuiz()">
          <i class="fas fa-redo"></i> Take Another Quiz
        </button>
      </div>
    </div>
  `;
  
  // Add event listeners to filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Update button active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Filter results
      renderResults(this.getAttribute('data-filter'));
    });
  });
  
  // Render all questions initially
  renderResults('all');
}

// Render results based on filter - FIXED TO SHOW CORRECTLY
function renderResults(filter = 'all') {
  resultsContainer.innerHTML = '';
  
  questions.forEach((q, idx) => {
    if (filter === 'correct' && !q.isCorrect) return;
    if (filter === 'wrong' && q.isCorrect) return;
    if (filter === 'marked' && !markedQuestions.has(idx)) return;
    
    const qDiv = document.createElement('div');
    qDiv.classList.add('question-card');
    qDiv.classList.add(q.isCorrect ? 'correct-card' : 'wrong-card');
    
    // Add marked indicator
    if (markedQuestions.has(idx)) {
      const markIndicator = document.createElement('div');
      markIndicator.classList.add('marked-indicator');
      markIndicator.innerHTML = '<i class="fas fa-bookmark"></i> Marked for Review';
      qDiv.appendChild(markIndicator);
    }
    
    const title = document.createElement('h3');
    title.textContent = `${idx + 1}. ${q.question}`;
    qDiv.appendChild(title);
    
    // Add question type indicator in results
    const typeIndicator = document.createElement('div');
    typeIndicator.classList.add('question-type-indicator');
    typeIndicator.style.marginBottom = '15px';
    
    if (q.is_multi_choice) {
      typeIndicator.innerHTML = '<i class="fas fa-check-square"></i> Multiple Choice Question';
    } else {
      typeIndicator.innerHTML = '<i class="fas fa-dot-circle"></i> Single Choice Question';
    }
    qDiv.appendChild(typeIndicator);
    
    // Create results answers container with proper class
    const answersContainer = document.createElement('div');
    answersContainer.classList.add('answers-container');
    answersContainer.classList.add(q.is_multi_choice ? 'multi-choice' : 'single-choice');
    
    q.answers.forEach((ans, ansIndex) => {
      const answerElement = createResultAnswerElement(q, idx, ans, ansIndex);
      answersContainer.appendChild(answerElement);
    });
    
    qDiv.appendChild(answersContainer);
    
    // Add explanation if available
    if (q.explanation) {
      const explanationDiv = document.createElement('div');
      explanationDiv.classList.add('explanation');
      explanationDiv.innerHTML = `<strong>Explanation:</strong> ${q.explanation}`;
      qDiv.appendChild(explanationDiv);
    }
    
    resultsContainer.appendChild(qDiv);
  });
}
// Fixed function to show proper radio/checkbox indicators in results
function createResultAnswerElement(question, qIndex, answer, ansIndex) {
  const answerDiv = document.createElement('div');
  answerDiv.classList.add('answer-option');
  
  const isCorrectAnswer = question.correct_answers.includes(answer);
  const isUserSelected = question.userSelected && question.userSelected.includes(answer);
  
  // Add state classes for styling
  if (isCorrectAnswer) {
    answerDiv.classList.add('correct-answer');
  } else if (isUserSelected && !isCorrectAnswer) {
    answerDiv.classList.add('wrong-answer');
  }
  
  const inputId = `result_q${qIndex}_a${ansIndex}`;
  
  // Determine the state and styling
  let stateClass = isUserSelected ? 'selected' : '';
  let indicatorText = '';
  
  if (isCorrectAnswer && isUserSelected) {
    indicatorText = '<span class="answer-indicator correct-indicator"><i class="fas fa-check"></i> Correct & Selected</span>';
  } else if (isCorrectAnswer) {
    indicatorText = '<span class="answer-indicator correct-indicator"><i class="fas fa-check"></i> Correct Answer</span>';
  } else if (isUserSelected) {
    indicatorText = '<span class="answer-indicator incorrect-indicator"><i class="fas fa-times"></i> Your Selection</span>';
  }
  
  // Use proper selector type based on question type
  const selectorType = question.is_multi_choice ? 'checkbox' : 'radio';
  const selectorClass = question.is_multi_choice ? 'multi-choice' : 'single-choice';
  
  // Create the proper HTML structure for results
  answerDiv.innerHTML = `
    <div class="answer-option ${selectorClass}">
      <label class="answer-label ${stateClass}">
        <span class="custom-selector ${selectorType}">
          <i class="fas fa-check"></i>
        </span>
        <span class="answer-text">${answer} ${indicatorText}</span>
      </label>
    </div>
  `;
  
  return answerDiv;
}

// Restart quiz
function restartQuiz() {
  resultsScreen.style.display = 'none';
  setupScreen.style.display = 'block';
  timerElement.style.display = 'none';
}

// Utility functions
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Function to get creative result message based on percentage
function getResultMessage(percentage) {
  const score = parseFloat(percentage);
  
  if (score >= 86) {
    return {
      icon: "🏆",
      title: "Certified-level mastery!",
      message: "Outstanding work — you're ready to triumph in the PSM exam.",
      color: "var(--success)",
      class: "result-master"
    };
  } else if (score >= 75) {
    return {
      icon: "🎯",
      title: "So close!",
      message: "You're almost PSM-ready. A bit more polishing and you'll crush it.",
      color: "var(--primary)",
      class: "result-close"
    };
  } else if (score >= 50) {
    return {
      icon: "🚀",
      title: "Nice progress!",
      message: "You're getting the hang of it — keep refining your knowledge.",
      color: "#4cc9f0",
      class: "result-progress"
    };
  } else if (score >= 25) {
    return {
      icon: "🔥",
      title: "You're warming up!",
      message: "A little more focus and those Scrum concepts will start clicking.",
      color: "var(--warning)",
      class: "result-warming"
    };
  } else {
    return {
      icon: "🐣",
      title: "The journey has just begun!",
      message: "Time to explore the Scrum guide again and build a solid foundation.",
      color: "var(--danger)",
      class: "result-beginner"
    };
  }
}