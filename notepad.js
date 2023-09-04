const lineNumbers = document.querySelector("#lineNumbers")
const calcAnswers = document.querySelector("#calcAnswers")

// function updateLines(event) {
    // const linesHTML = event.target.value.split("\n").map((_, i) => i < 10 ? " " + (i + 1) : i + 1).join("<br>")
    // lineNumbers.innerHTML = linesHTML
// }

function updateCalculations(event) {
    const text = event.target.value
    const calculator = new Calculator(text)
    let answersHTML = calculator.solveAll().join("<br>")
    calcAnswers.innerHTML = answersHTML
}