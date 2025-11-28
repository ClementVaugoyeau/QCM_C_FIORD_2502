// Eléments du DOM
const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let isQuestionValidated = false;

// Chargement du CSV
fetch('questions.csv')
    .then(response => response.text())
    .then(data => {
        parseCSV(data);
        shuffleArray(questions); 
        startQuiz();
    })
    .catch(error => console.error("Erreur CSV:", error));

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    // i = 1 pour sauter l'en-tête
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line) {
            const parts = line.split(';');
            
            // STRUCTURE DU CSV :
            // 0: Question
            // 1-5: Options A-E
            // 6: Réponse(s)
            // 7: Thème (NOUVEAU)

            const correctAnswerStr = (parts[6] || "").trim().toUpperCase();
            const themeStr = (parts[7] || "Général").trim(); // Récupération du thème
            
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
                theme: themeStr,       // On stocke le thème
                userSuccess: false     // On initialise le succès à faux
            };
            
            questions.push(newQuestion);
        }
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    showQuestion();
}

function showQuestion() {
    resetState();
    let currentQuestion = questions[currentQuestionIndex];
    let questionNo = currentQuestionIndex + 1;
    
    // Ajout d'un petit badge pour afficher le thème en cours (optionnel mais sympa)
    questionElement.innerHTML = `
        <span class="theme-badge">${currentQuestion.theme}</span><br>
        ${questionNo}. ${currentQuestion.question}
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

    // Mise à jour du score ET de l'état de la question actuelle
    if (allCorrect) {
        score++;
        questions[currentQuestionIndex].userSuccess = true;
    } else {
        questions[currentQuestionIndex].userSuccess = false;
    }

    isQuestionValidated = true;
    nextButton.innerHTML = "Suivant";
}

// --- NOUVELLE FONCTION D'AFFICHAGE DU SCORE ---
function showScore(){
    resetState();
    
    // 1. Calcul du pourcentage global
    const percentage = Math.round((score / questions.length) * 100);
    
    // 2. Calcul par Thème
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

    // 3. Génération du HTML pour les stats
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
        // Ajout d'une couleur selon la performance (vert si > 70%, rouge si < 40%)
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

    // 4. Affichage final
    questionElement.innerHTML = `
        <div class="final-score-block">
            <h2>Votre Score Final</h2>
            <div class="big-score">${score} / ${questions.length}</div>
            <div class="percentage-badge">${percentage}%</div>
        </div>
        ${statsHTML}
    `;

    nextButton.innerHTML = "Rejouer";
    isQuestionValidated = true;
}

function handleNextButton(){
    if (isQuestionValidated) {
        if (nextButton.innerHTML === "Rejouer") {
            shuffleArray(questions);
            startQuiz();
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