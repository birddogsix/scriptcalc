const lineNumbers = document.querySelector("#lineNumbers")
const calcAnswers = document.querySelector("#calcAnswers")
const codeText = document.querySelector("#codeText")

// function updateLines(event) {
    // const linesHTML = event.target.value.split("\n").map((_, i) => i < 10 ? " " + (i + 1) : i + 1).join("<br>")
    // lineNumbers.innerHTML = linesHTML
// }

function updateCalculations(target) {
    text = target.value
    const calculator = new Calculator(text, true)
    let answersHTML = calculator.solveAll().join("<br>")
    calculator.lines.forEach(l=>console.log(l.tokens,l.ast,l.variables,""+l.functions.a))
    calcAnswers.innerHTML = answersHTML
}

updateCalculations(codeText)