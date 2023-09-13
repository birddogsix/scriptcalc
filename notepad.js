const lineNumbers = document.querySelector("#lineNumbers")
const calcAnswers = document.querySelector("#calcAnswers")
const codeText = document.querySelector("#codeText")

function updateLineNumbers(target) {
    const linesHTML = target.value.split("\n").map((_, i) => i + 1).join("\n")
    lineNumbers.innerHTML = linesHTML
    updatePositions()
}

function updateCalculations(target) {
    text = target.value
    const calculator = new Calculator(text, true)
    let answersHTML = calculator.solveAll().join("\n")
    calculator.lines.forEach(l=>console.log(l.tokens,l.ast,l.variables,l.functions,`${l.functions.f}`))
    calcAnswers.innerHTML = answersHTML
}

function updatePositions() {
    lineNumbers.scrollTop = codeText.scrollTop
    calcAnswers.scrollTop = codeText.scrollTop
}

updateCalculations(codeText)
updateLineNumbers(codeText)