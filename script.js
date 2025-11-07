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
});

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
  
  const markButton = document.createElement('button');
  markButton.classList.add('mark-review');
  markButton.innerHTML = markedQuestions.has(index) ? 
    '<i class="fas fa-bookmark marked"></i>' : 
    '<i class="far fa-bookmark"></i>';
  markButton.addEventListener('click', () => toggleMarkQuestion(index));
  
  headerDiv.appendChild(textDiv);
  headerDiv.appendChild(markButton);
  qDiv.appendChild(headerDiv);
  
  // Answers
  const ul = document.createElement('ul');
  ul.classList.add('answers');
  
  q.answers.forEach(ans => {
    const li = document.createElement('li');
    li.textContent = ans;
    
    if (q.userSelected && q.userSelected.includes(ans)) {
      li.classList.add('selected');
    }
    
    li.addEventListener('click', () => selectAnswer(index, ans, q.is_multi_choice));
    ul.appendChild(li);
  });
  
  qDiv.appendChild(ul);
  quizContainer.appendChild(qDiv);
  
  // Update navigation buttons
  updateNavigationButtons();
  currentQElement.textContent = index + 1;
}

// Select/deselect answer
function selectAnswer(qIndex, answer, isMulti) {
  const q = questions[qIndex];
  
  if (isMulti) {
    if (q.userSelected.includes(answer)) {
      // Deselect
      q.userSelected = q.userSelected.filter(a => a !== answer);
    } else {
      // Select
      q.userSelected.push(answer);
    }
  } else {
    // Single choice - replace selection
    q.userSelected = [answer];
  }
  
  // Re-render question to update UI
  renderQuestion(qIndex);
}

// Toggle mark question for review
function toggleMarkQuestion(index) {
  if (markedQuestions.has(index)) {
    markedQuestions.delete(index);
  } else {
    markedQuestions.add(index);
  }
  updateMarkedCount();
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
  
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="result-summary">
      <h2>Quiz Results</h2>
      <p>Congratulations, ${userName}!</p>
      
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

// Render results based on filter
function renderResults(filter = 'all') {
  resultsContainer.innerHTML = '';
  
  questions.forEach((q, idx) => {
    if (filter === 'correct' && !q.isCorrect) return;
    if (filter === 'wrong' && q.isCorrect) return;
    
    const qDiv = document.createElement('div');
    qDiv.classList.add('question-card');
    qDiv.classList.add(q.isCorrect ? 'correct-card' : 'wrong-card');
    
    const title = document.createElement('h3');
    title.textContent = `${idx + 1}. ${q.question}`;
    qDiv.appendChild(title);
    
    const ul = document.createElement('ul');
    ul.classList.add('answers');
    
    q.answers.forEach(ans => {
      const li = document.createElement('li');
      li.textContent = ans;
      
      if (q.correct_answers.includes(ans)) {
        li.classList.add('correct');
      }
      
      if (q.userSelected && q.userSelected.includes(ans) && !q.correct_answers.includes(ans)) {
        li.classList.add('incorrect');
      }
      
      if (q.userSelected && q.userSelected.includes(ans)) {
        li.style.fontWeight = 'bold';
      }
      
      ul.appendChild(li);
    });
    
    qDiv.appendChild(ul);
    resultsContainer.appendChild(qDiv);
  });
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