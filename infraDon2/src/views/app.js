"use strict";

const languagePrompt = {
  question: "What is your favorite programming language",
  options: ["1. JavaScript", "2. PHP", "3. Java", "4. Assembly", "5. Rust", "6. TypeScript"]
};

const coursePrompt = {
  question: "Ce challenge est-il difficile?",
  options: ["Oui", "Non"]
}


const createPoll = (poll) => {
  const { question, options } = poll;
  const scores = new Array(options.length).fill(0);
  const displayScores = new Map();
  options.forEach((option) => {
    displayScores.set(option, 0);
  });
  const answer = (number) => {
    if (Number.isInteger(number) && number <= options.length && number > 0) {
      scores[number - 1]++;
      displayScores.set(options[number - 1], scores[number - 1]);
    } else {
      console.error("Enter a valid option");
    }
    return {
        question,
        displayScores
    }
  };
  return answer;
};

const languagePoll = createPoll(languagePrompt);
const coursePoll = createPoll(coursePrompt);


// Tester le sondage sur les langages de programmation
console.log("=== Sondage : Quel est votre langage de programmation préféré ? ===");

// Soumettre des réponses au sondage sur les langages
console.log(languagePoll(1)); // Vote pour "1. JavaScript"
console.log(languagePoll(5)); // Vote pour "5. Rust"
console.log(languagePoll(6)); // Vote pour "6. TypeScript"
console.log(languagePoll(7)); // Vote non valide (numéro hors plage)
console.log(languagePoll(3)); // Vote pour "3. Java"
console.log(languagePoll(1)); // Vote à nouveau pour "1. JavaScript"

// Afficher les résultats du sondage
const languageResults = languagePoll();
console.log("Question :", languageResults.question);
console.log("Résultats des votes :");
languageResults.displayScores.forEach((score, option) => {
  console.log(`${option}: ${score} vote(s)`);
});

console.log("\n");

// Tester le sondage sur la difficulté du challenge
console.log("=== Sondage : Ce challenge est-il difficile ? ===");

// Soumettre des réponses au sondage sur le challenge
console.log(coursePoll(1)); // Vote pour "Oui"
console.log(coursePoll(2)); // Vote pour "Non"
console.log(coursePoll(0)); // Vote non valide (numéro hors plage)
console.log(coursePoll(1)); // Vote pour "Oui"

// Afficher les résultats du sondage
const courseResults = coursePoll();
console.log("Question :", courseResults.question);
console.log("Résultats des votes :");
courseResults.displayScores.forEach((score, option) => {
  console.log(`${option}: ${score} vote(s)`);
});
