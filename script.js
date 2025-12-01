// --- Eléments du DOM ---
const startScreen = document.getElementById("start-screen");
const quizContainer = document.getElementById("quiz-container");
const startButtons = document.querySelectorAll(".start-btn");

const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");

// --- Variables Globales ---
let allQuestions = []; // Contient TOUTES les questions chargées du CSV
let questions = [];    // Contient SEULEMENT les questions de la partie en cours
let currentQuestionIndex = 0;
let score = 0;
let isQuestionValidated = false;

// --- Chargement initial ---
fetch('questions.csv')
    .then(response => response.text())
    .then(data => {
        parseCSV(data);
        // On ne lance plus startQuiz() ici directement.
        // On attend que l'utilisateur choisisse le nombre de questions.
        console.log("Questions chargées : " + allQuestions.length);
    })
    .catch(error => console.error("Erreur CSV:", error));

// --- Gestion des clics sur le menu de démarrage ---
startButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const count = btn.dataset.count;
        initGame(count);
    });
});

function initGame(count) {
    // 1. On mélange la totalité des questions disponibles
    shuffleArray(allQuestions);

    // 2. On sélectionne le nombre demandé
    if (count === "all") {
        questions = [...allQuestions]; // Copie tout
    } else {
        // ParseInt pour s'assurer que c'est un nombre, puis slice
        let limit = parseInt(count);
        // Sécurité : ne pas essayer de prendre plus de questions qu'il n'y en a
        if (limit > allQuestions.length) limit = allQuestions.length;
        questions = allQuestions.slice(0, limit);
    }

    // 3. Changement d'interface
    startScreen.classList.add("hide");
    quizContainer.classList.remove("hide");

    // 4. Lancement
    startQuiz();
}

// --- Parsing CSV ---
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    allQuestions = []; // Réinitialisation

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line) {
            const parts = line.split(';');
            
            // Sécurité pour éviter les lignes vides ou incomplètes
            if (parts.length < 6) continue;

            const correctAnswerStr = (parts[6] || "").trim().toUpperCase();
            const themeStr = (parts[7] || "Général").trim();

            const rawOptions = [
                { id: 'A', text: parts[1] },
                { id: 'B', text: parts[2] },
                { id: 'C', text: parts[3] },
                { id: 'D', text: parts[4] },
                { id: 'E', text: parts[5] }
            ];

            const cleanAnswers = [];
            rawOptions.forEach(opt => {
                if (opt.text && opt.text.trim() !== "") {
                    cleanAnswers.push({
                        text: opt.text,
                        correct: correctAnswerStr.includes(opt.id)
                    });
                }
            });

            const newQuestion = {
                question: parts[0],
                answers: cleanAnswers,
                theme: themeStr,
                userSuccess: false
            };
            
            allQuestions.push(newQuestion);
        }
    }
}

// --- Fonctions Utilitaires ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Logique du Quiz (Similaire à avant) ---

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    showQuestion();
}

function showQuestion() {
    resetState();
    let currentQuestion = questions[currentQuestionIndex];
    let questionNo = currentQuestionIndex + 1;
    
    questionElement.innerHTML = `
        <span class="theme-badge">${currentQuestion.theme}</span><br>
        Question ${questionNo} / ${questions.length}<br>
        ${currentQuestion.question}
    `;
    
    nextButton.innerHTML = "Valider";
    isQuestionValidated = false;

    currentQuestion.answers.forEach(answer => {
        const button = document.createElement("button");
        button.innerHTML = answer.text;
        button.classList.add("btn");
        button.dataset.correct = answer.correct ? "true" : "false";
        button.addEventListener("click", selectAnswer);
        answerButtons.appendChild(button);
    });
}

function resetState(){
    while(answerButtons.firstChild){
        answerButtons.removeChild(answerButtons.firstChild);
    }
}

function selectAnswer(e){
    if(isQuestionValidated) return;
    const selectedBtn = e.target;
    selectedBtn.classList.toggle("selected");
}

function checkAnswer() {
    const buttons = Array.from(answerButtons.children);
    let allCorrect = true;

    buttons.forEach(button => {
        const isSelected = button.classList.contains("selected");
        const isActuallyCorrect = button.dataset.correct === "true";

        if (isSelected && !isActuallyCorrect) {
            allCorrect = false;
            button.classList.add("incorrect");
        } else if (!isSelected && isActuallyCorrect) {
            allCorrect = false;
        }
        
        if (isActuallyCorrect) {
            button.classList.add("correct");
        }
        button.disabled = true;
    });

    if (allCorrect) {
        score++;
        questions[currentQuestionIndex].userSuccess = true;
    } else {
        questions[currentQuestionIndex].userSuccess = false;
    }

    isQuestionValidated = true;
    nextButton.innerHTML = "Suivant";
}

function showScore(){
    resetState();
    
    const percentage = Math.round((score / questions.length) * 100);
    
    // Stats par thème (basées uniquement sur les questions jouées)
    const statsByTheme = {};
    questions.forEach(q => {
        if (!statsByTheme[q.theme]) {
            statsByTheme[q.theme] = { total: 0, success: 0 };
        }
        statsByTheme[q.theme].total++;
        if (q.userSuccess) {
            statsByTheme[q.theme].success++;
        }
    });

    let statsHTML = `<div class="stats-container">
        <h3>Détails par Thème :</h3>
        <table class="stats-table">
            <tr>
                <th>Thème</th>
                <th>Score</th>
                <th>%</th>
            </tr>`;

    for (const [theme, data] of Object.entries(statsByTheme)) {
        const themePct = Math.round((data.success / data.total) * 100);
        let colorClass = themePct >= 70 ? "text-success" : (themePct < 40 ? "text-danger" : "text-warning");
        
        statsHTML += `
            <tr>
                <td>${theme}</td>
                <td>${data.success} / ${data.total}</td>
                <td class="${colorClass}">${themePct}%</td>
            </tr>
        `;
    }
    statsHTML += `</table></div>`;

    questionElement.innerHTML = `
        <div class="final-score-block">
            <h2>Votre Score Final</h2>
            <div class="big-score">${score} / ${questions.length}</div>
            <div class="percentage-badge">${percentage}%</div>
        </div>
        ${statsHTML}
    `;

    // Important : le bouton permet de revenir au MENU PRINCIPAL maintenant
    nextButton.innerHTML = "Menu Principal"; 
    isQuestionValidated = true;
}

function handleNextButton(){
    if (isQuestionValidated) {
        if (nextButton.innerHTML === "Menu Principal") {
            // Retour au menu de démarrage
            quizContainer.classList.add("hide");
            startScreen.classList.remove("hide");
            // On peut réinitialiser si besoin, mais initGame le fera au prochain clic
        } else {
            currentQuestionIndex++;
            if(currentQuestionIndex < questions.length){
                showQuestion();
            } else {
                showScore();
            }
        }
    } else {
        checkAnswer();
    }
}

nextButton.addEventListener("click", handleNextButton);