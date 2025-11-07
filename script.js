// Load questions from JSON
async function loadQuiz(totalQuestions, questionType) {
  try {
    // Fetch real JSON file
    const response = await fetch('quiz.json');
    allQuestions = await response.json();

    // Filter questions by type
    if (questionType === 'single') {
      questions = allQuestions.filter(q => !q.is_multi_choice);
    } else if (questionType === 'multi') {
      questions = allQuestions.filter(q => q.is_multi_choice);
    } else {
      // Mixed type
      const multiQuestions = allQuestions.filter(q => q.is_multi_choice);
      const singleQuestions = allQuestions.filter(q => !q.is_multi_choice);
      
      let multiCount = Math.floor(totalQuestions * 0.25);
      let singleCount = totalQuestions - multiCount;
      
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
    questions.forEach(q => q.userSelected = []);
    
    totalQsElement.textContent = questions.length;
  } catch (error) {
    quizContainer.innerHTML = `<p style="color:red">❌ Error loading quiz: ${error}</p>`;
  }
}
