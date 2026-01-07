document.addEventListener('DOMContentLoaded', () => {
    const chapterSelect = document.getElementById('chapter-select');
    const startBtn = document.getElementById('start-btn');
    const quizArea = document.getElementById('quiz-area');
    const setupArea = document.getElementById('setup-area');
    const questionText = document.getElementById('question-text');
    const latinInputsContainer = document.getElementById('latin-inputs-container');
    const genderSelect = document.getElementById('gender-select');
    const posSelect = document.getElementById('pos-select');
    const checkBtn = document.getElementById('check-btn');
    const feedbackArea = document.getElementById('feedback-area');
    const feedbackMessage = document.getElementById('feedback-message');
    const fullEntryDisplay = document.getElementById('full-entry-display');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    let currentChapterWords = [];
    let currentIndex = 0;
    let score = 0;
    let lastFocusedInput = null;

    console.log("Script loaded and DOM content ready.");

    // Initialize Chapters
    if (typeof wordsData !== 'undefined') {
        if (Array.isArray(wordsData) && wordsData.length > 0) {
            wordsData.forEach((chapter, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = chapter.chapter || `Chapter ${index + 1}`;
                chapterSelect.appendChild(option);
            });
        } else {
            console.error("wordsData is empty or not an array.");
        }
    } else {
        console.error("wordsData is undefined. Check if data.js is loaded correctly.");
    }

    // Macron Helpers
    const vowels = {
        'a': 'ā', 'e': 'ē', 'i': 'ī', 'o': 'ō', 'u': 'ū',
        'A': 'Ā', 'E': 'Ē', 'I': 'Ī', 'O': 'Ō', 'U': 'Ū'
    };

    function addMacronSupport(inputElement) {
        inputElement.addEventListener('input', (e) => {
            let val = e.target.value;
            let original = val;
            
            for (const [key, char] of Object.entries(vowels)) {
                // replaceAll with string literal arguments does NOT use regex
                // so we construct the literal string "(a)" to find and replace with "ā"
                val = val.replaceAll(`(${key})`, char);
            }

            if (val !== original) {
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                e.target.value = val;
                // Adjust cursor position: replaced 3 chars `(a)` with 1 `ā`, so shift back 2
                e.target.setSelectionRange(start - 2, end - 2);
            }
        });

        inputElement.addEventListener('focus', () => {
            lastFocusedInput = inputElement;
        });
    }

    // Button Click
    document.querySelectorAll('.macron-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!lastFocusedInput) return; // No input selected yet

            const char = btn.textContent;
            const start = lastFocusedInput.selectionStart;
            const end = lastFocusedInput.selectionEnd;
            const val = lastFocusedInput.value;
            lastFocusedInput.value = val.substring(0, start) + char + val.substring(end);
            lastFocusedInput.focus();
            lastFocusedInput.setSelectionRange(start + 1, start + 1);
        });
    });

    startBtn.addEventListener('click', () => {
        const chapterIndex = chapterSelect.value;
        if (chapterIndex === "") return;
        
        currentChapterWords = [...wordsData[chapterIndex].words];
        currentChapterWords.sort(() => Math.random() - 0.5);

        currentIndex = 0;
        score = 0;
        
        setupArea.classList.add('hidden');
        quizArea.style.display = 'flex';
        quizArea.classList.remove('hidden');
        
        updateProgress();
        showCard();
    });

    function showCard() {
        if (currentIndex >= currentChapterWords.length) {
            finishQuiz();
            return;
        }

        const word = currentChapterWords[currentIndex];
        questionText.textContent = word.translation;
        
        // Generate inputs based on principal parts
        latinInputsContainer.innerHTML = '';
        const parts = word.latin.split(',').map(s => s.trim());
        
        parts.forEach((part, index) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Part ${index + 1}`;
            input.className = 'latin-part-input';
            input.autocomplete = 'off';
            input.style.marginBottom = '5px';
            input.style.width = '100%';
            
            addMacronSupport(input);
            latinInputsContainer.appendChild(input);
            
            // Focus first input automatically
            if (index === 0) {
                input.focus();
                lastFocusedInput = input;
            }
        });

        genderSelect.value = '';
        posSelect.value = '';
        
        feedbackArea.style.display = 'none';
        feedbackArea.classList.remove('correct', 'incorrect');
        checkBtn.disabled = false;
        checkBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
    }

    checkBtn.addEventListener('click', () => {
        const word = currentChapterWords[currentIndex];
        const userGender = genderSelect.value;
        const userPos = posSelect.value;
        
        // 1. Validate Latin Parts
        const targetParts = word.latin.split(',').map(s => s.trim().toLowerCase());
        const userInputs = document.querySelectorAll('.latin-part-input');
        
        let allPartsCorrect = true;
        let incorrectIndices = [];

        if (userInputs.length !== targetParts.length) {
             // Should not happen if UI is consistent with data
             allPartsCorrect = false;
        } else {
            userInputs.forEach((input, index) => {
                const val = input.value.trim().toLowerCase();
                if (val !== targetParts[index]) {
                    allPartsCorrect = false;
                    incorrectIndices.push(index + 1);
                    input.style.borderColor = 'red';
                } else {
                    input.style.borderColor = '#27ae60'; // Green border for correct parts
                }
            });
        }

        // 2. Gender
        let targetGender = word.gender ? word.gender.trim() : "none";
        if (targetGender === "") targetGender = "none";
        const isGenderCorrect = (userGender === targetGender);

        // 3. POS
        let targetPos = word.pos ? word.pos.trim().toLowerCase() : "";
        let userPosValue = userPos.toLowerCase();
        let isPosCorrect = false;

        if (userPos !== "") {
             // Map full names to abbreviations common in the dataset
             const aliases = {
                 'adjective': ['adj'],
                 'adverb': ['adv'],
                 'preposition': ['prep'],
                 'conjunction': ['conj'],
                 // Add others if necessary, though noun/verb usually spelled out
             };

             // Search for the user's term OR any known aliases
             // e.g. "adverb" -> search for "adverb" OR "adv"
             let searchTerms = aliases[userPosValue] ? [userPosValue, ...aliases[userPosValue]] : [userPosValue];
             
             // Create a regex pattern that matches any of the terms as a whole word
             // \b matches boundary between word char (\w) and non-word char (\W)
             // "adv." contains "adv" followed by "." (\W), so \badv\b matches it.
             const pattern = `\\b(${searchTerms.join('|')})\\b`;
             const regex = new RegExp(pattern, 'i');
             
             if (regex.test(targetPos)) {
                 isPosCorrect = true;
             }
        }

        const isCorrect = allPartsCorrect && isGenderCorrect && isPosCorrect;

        if (isCorrect) {
            score++;
            feedbackArea.classList.add('correct');
            feedbackMessage.textContent = "Correct!";
        } else {
            feedbackArea.classList.add('incorrect');
            let msg = "Incorrect. ";
            if (!allPartsCorrect) msg += `Check Latin Part(s): ${incorrectIndices.join(', ')}. `;
            if (!isGenderCorrect) msg += `Gender is wrong (Expected: ${targetGender}). `;
            if (!isPosCorrect) msg += `Part of Speech is wrong (Expected: ${targetPos}). `;
            feedbackMessage.textContent = msg;
        }

        fullEntryDisplay.innerHTML = `
            <strong>Latin:</strong> ${word.latin}<br>
            <strong>Gender:</strong> ${word.gender || "N/A"}<br>
            <strong>POS:</strong> ${word.pos}
        `;

        feedbackArea.style.display = 'block';
        checkBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
        nextBtn.focus();
        
        updateProgress();
    });

    nextBtn.addEventListener('click', () => {
        currentIndex++;
        showCard();
    });

    function updateProgress() {
        const percent = (currentIndex / currentChapterWords.length) * 100;
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Word ${currentIndex + 1} of ${currentChapterWords.length}`;
    }

    function finishQuiz() {
        quizArea.innerHTML = `
            <h2>Quiz Complete!</h2>
            <p>Your Score: ${score} / ${currentChapterWords.length}</p>
            <button onclick="location.reload()">Back to Menu</button>
        `;
    }
});