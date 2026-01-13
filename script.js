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
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    let currentChapterWords = [];
    let currentIndex = 0;
    let score = 0;
    let lastFocusedInput = null;

    console.log("Script loaded and DOM content ready.");

    // Dark Mode Toggle
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isNowDark = document.body.classList.contains('dark-mode');
        darkModeToggle.textContent = isNowDark ? '☀️' : '🌙';
        localStorage.setItem('darkMode', isNowDark);
    });

    // Initialize Chapters
    if (typeof wordsData === 'undefined' || !Array.isArray(wordsData) || wordsData.length === 0) {
        console.error("wordsData is undefined, empty, or not an array. Check if data.js is loaded correctly.");
        questionText.textContent = "Error: Failed to load vocabulary data. Please refresh the page.";
        startBtn.disabled = true;
        return;
    }

    wordsData.forEach((chapter, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = chapter.chapter || `Chapter ${index + 1}`;
        chapterSelect.appendChild(option);
    });

    // Macron Helpers
    const vowels = {
        'a': 'ā', 'e': 'ē', 'i': 'ī', 'o': 'ō', 'u': 'ū',
        'A': 'Ā', 'E': 'Ē', 'I': 'Ī', 'O': 'Ō', 'U': 'Ū'
    };

    const capitalToMacron = {
        'A': 'ā', 'E': 'ē', 'I': 'ī', 'O': 'ō', 'U': 'ū'
    };

    function addMacronSupport(inputElement) {
        inputElement.addEventListener('input', (e) => {
            let val = e.target.value;
            let original = val;
            const start = e.target.selectionStart;

            for (const [key, char] of Object.entries(vowels)) {
                // replaceAll with string literal arguments does NOT use regex
                // so we construct the literal string "(a)" to find and replace with "ā"
                val = val.replaceAll(`(${key})`, char);
            }

            for (const [cap, macron] of Object.entries(capitalToMacron)) {
                val = val.replaceAll(cap, macron);
            }

            if (val !== original) {
                e.target.value = val;

                // Calculate cursor position more accurately by counting replacements before cursor
                // This handles multiple replacements correctly
                let newPos = start;
                let offset = 0;

                // Re-scan the original string to calculate position offset
                for (const [key, char] of Object.entries(vowels)) {
                    const pattern = `(${key})`;
                    let searchIndex = 0;
                    let match;
                    while ((match = original.indexOf(pattern, searchIndex)) !== -1) {
                        // Check if this match occurred before or at the cursor position
                        if (match + pattern.length <= start) {
                            // Calculate how many characters this replacement removes
                            // "(a)" -> "ā" removes 2 characters
                            offset += pattern.length - char.length;
                        }
                        searchIndex = match + pattern.length;
                    }
                }

                for (const [cap, macron] of Object.entries(capitalToMacron)) {
                    let searchIndex = 0;
                    let match;
                    while ((match = original.indexOf(cap, searchIndex)) !== -1) {
                        if (match + cap.length <= start) {
                            // Capital letter replacement: "A" -> "ā" removes 0 characters
                            // But we still need to track position
                            offset += cap.length - macron.length;
                        }
                        searchIndex = match + cap.length;
                    }
                }

                newPos = Math.max(0, start - offset);
                e.target.setSelectionRange(newPos, newPos);
            }
        });

        inputElement.addEventListener('focus', () => {
            if (document.contains(inputElement)) {
                lastFocusedInput = inputElement;
            }
        });
    }

    // Button Click
    document.querySelectorAll('.macron-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!lastFocusedInput || !document.contains(lastFocusedInput)) {
                lastFocusedInput = null;
                return;
            }

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
        if (chapterIndex === "") {
            alert("Please select a chapter before starting the quiz.");
            return;
        }
        
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
        // Update progress immediately when showing a new card
        updateProgress();

        if (currentIndex >= currentChapterWords.length) {
            finishQuiz();
            return;
        }

        const word = currentChapterWords[currentIndex];
        questionText.textContent = word.translation;

        // Clear previous lastFocusedInput to prevent memory leaks
        lastFocusedInput = null;

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

        // Validate that user has provided input
        const userInputs = document.querySelectorAll('.latin-part-input');
        let hasAnyInput = false;
        userInputs.forEach(input => {
            if (input.value.trim() !== '') {
                hasAnyInput = true;
            }
        });

        if (!hasAnyInput && userGender === '' && userPos === '') {
            feedbackArea.style.display = 'block';
            feedbackArea.classList.remove('correct', 'incorrect');
            feedbackMessage.textContent = "Please enter at least one field before checking.";
            return;
        }

        // 1. Validate Latin Parts
        const targetParts = word.latin.split(',').map(s => s.trim().toLowerCase());
        
        let allPartsCorrect = true;
        let incorrectIndices = [];

        if (userInputs.length !== targetParts.length) {
             // Should not happen if UI is consistent with data
             allPartsCorrect = false;
        } else {
            userInputs.forEach((input, index) => {
                const val = input.value.trim().toLowerCase();
                const target = targetParts[index];
                
                // Allow optional hyphen if target starts with it
                // e.g. target "-o", user "o" -> correct
                const match = (val === target) || (target.startsWith('-') && val === target.substring(1));

                if (!match) {
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

        // Detect if it's a Chant
        // Heuristic: Translation contains "Chant" OR latin starts with "-"
        if (word.translation.toLowerCase().includes('chant') || (targetPos === "" && word.latin.startsWith('-'))) {
            targetPos = "chant";
        }

        let userPosValue = userPos.toLowerCase();
        let isPosCorrect = false;

        if (userPos !== "") {
            // Expand POS matching to handle variations like 'verb, defective', '3rd conjugation verb', etc.
            const posVariations = {
                'noun': ['noun'],
                'verb': ['verb'],
                'adjective': ['adjective', 'adj'],
                'adverb': ['adverb', 'adv'],
                'preposition': ['preposition', 'prep'],
                'conjunction': ['conjunction', 'conj'],
                'pronoun': ['pronoun'],
                'interjection': ['interjection'],
                'chant': ['chant']
            };

            // Get variations for the user's selection
            const variations = posVariations[userPosValue] || [userPosValue];

            // Try to match any variation as a whole word in targetPos
            for (const variation of variations) {
                const pattern = `\\b${variation}\\b`;
                const regex = new RegExp(pattern, 'i');
                if (regex.test(targetPos)) {
                    isPosCorrect = true;
                    break;
                }
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
        if (currentChapterWords.length === 0) return;
        const displayIndex = Math.min(currentIndex, currentChapterWords.length);
        const percent = (displayIndex / currentChapterWords.length) * 100;
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Word ${displayIndex} of ${currentChapterWords.length}`;
    }

    function finishQuiz() {
        // Clear lastFocusedInput to prevent memory leak
        lastFocusedInput = null;

        // Hide game elements
        document.querySelector('.progress-container').style.display = 'none';
        document.getElementById('progress-text').style.display = 'none';
        document.querySelector('.question-box').style.display = 'none';
        document.querySelector('.input-group').style.display = 'none';
        document.querySelector('.controls').style.display = 'none';

        // Explicitly hide feedback area
        feedbackArea.style.display = 'none';

        // Create or show results
        let results = document.getElementById('results-area');
        if (!results) {
            results = document.createElement('div');
            results.id = 'results-area';
            results.style.textAlign = 'center';
            quizArea.appendChild(results);
        }
        results.innerHTML = `
            <h2>Quiz Complete!</h2>
            <p>Your Score: ${score} / ${currentChapterWords.length}</p>
            <div style="margin-top: 20px;">
                <button id="retry-btn">Try Again</button>
                <button onclick="location.reload()" style="margin-left: 10px; background-color: #7f8c8d;">Back to Menu</button>
            </div>
        `;
        results.style.display = 'block';

        document.getElementById('retry-btn').onclick = () => {
            results.style.display = 'none';
            // Show game elements
            document.querySelector('.progress-container').style.display = 'block';
            document.getElementById('progress-text').style.display = 'block';
            document.querySelector('.question-box').style.display = 'block';
            document.querySelector('.input-group').style.display = 'flex';
            document.querySelector('.controls').style.display = 'flex';
            
            // Reset state
            currentChapterWords.sort(() => Math.random() - 0.5);
            currentIndex = 0;
            score = 0;
            updateProgress();
            showCard();
        };
    }
});