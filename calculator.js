/**
 * TODO
 * make sure all tokens are being used and throw an error if not
 * fix incorrect error throwing
 */

class Token {
    constructor(type, value) {
        this.type = type
        this.value = value
    }
}

class Node {
    constructor(token) {
        this.type = token.type
        this.value = token.value
        this.children = []
    }

    addChild(node) {
        this.children.push(node)
    }

}

class Line {

    constructor(input, variables, functions) {

        this.answer

        // for tokenization
        this.input = input
        this.position = 0
        this.tokens = []

        // for parsing
        this.ast
        this.tokenIndex = 0

        // for evaluation
        this.variables = variables
        this.functions = functions

    }

    #isFunction(str) {
        return !!this.functions?.[str]
    }

    #isVariable(str) {
        return this.variables?.[str] != undefined
    }

    tokenize() {

        if (this.input.length == 0) return

        // Tokenization logic
        while (this.position < this.input.length) {

            const char = this.input[this.position]
            let buffer = ""

            if (char == " ") {
                // Skip spaces
                this.position++
                continue
            }

            let getNumber = () => {
                do {
                    buffer += this.input[this.position]
                    this.position++
                } while (this.input[this.position]?.match(/[0-9.]/))

                if (buffer == ".") {
                    throw new Error("Unknown character \".\".")
                }
                this.tokens.push(new Token("number", buffer))
                // check if there needs to be implied multiplication
                if (this.input[this.position]?.match(/[a-zA-Z(]/)) {
                    this.tokens.push(new Token("operator", "*"))
                }

                // reverse position
                this.position--

                buffer = ""
            }

            if (char == "-") {
                const prevChar = this.input[this.position - 1]
                if (!prevChar || prevChar.match(/[+*/^(,=-]/)) {
                    // negative number
                    const nextChar = this.input[this.position + 1]
                    if (nextChar.match(/[a-zA-Z(]/)) {
                        // multiply by -1
                        this.tokens.push(new Token("number", "-1"))
                        this.tokens.push(new Token("operator", "*"))
                        //this.position++
                    } else {
                        getNumber()
                    }
                } else {
                    // operation
                    this.tokens.push(new Token("operator", "-"))
                }
            } else if (char.match(/[+*/^]/)) {
                this.tokens.push(new Token("operator", char))
            } else if (char.match(/[0-9.]/)) {
                getNumber()
            } else if (char.match(/[a-zA-Z]/)) {

                do {
                    buffer += this.input[this.position]
                    this.position++
                } while (this.input[this.position]?.match(/[a-zA-Z]/))
                this.position--

                if (this.#isFunction(buffer)) {
                    this.tokens.push(new Token("function", buffer))
                } else if (this.#isVariable(buffer)) {
                    this.tokens.push(new Token("variable", buffer))
                } else {
                    const nextChar = this.input?.[this.position + 1]
                    if (nextChar == "(") {
                        this.tokens.push(new Token("possible function", buffer))
                    } else {
                        this.tokens.push(new Token("possible variable", buffer))
                    }
                }

                if (this.input?.[this.position + 1]?.match(/[0-9.]/)) {
                    this.tokens.push(new Token("operator", "*"))
                }

                buffer = ""

            } else if (char == "(" || char == ")") {
                this.tokens.push(new Token("parenthesis", char))
                if (char == ")" && this.input[this.position + 1]?.match(/[a-zA-Z0-9(]/)) {
                    this.tokens.push(new Token("operator", "*"))
                }
            } else if (char == ",") {
                this.tokens.push(new Token("comma", char))
            } else if (char == "=") {
                this.tokens.push(new Token("assignment", char))
            } else {
                throw new Error("Unknown character \"" + char + "\".")
            }

            this.position++
        }
    }

    parse() {
        if (this.tokens.length == 0) throw new Error("Input not tokenized.")
        this.ast = this.#parseLevel()
    }

    #parseParLevel() {
        if (this.tokenIndex >= this.tokens.length) {
            throw new Error("Invalid syntax")
        }
        const currentToken = this.tokens[this.tokenIndex]
        this.tokenIndex++

        if (currentToken.type == 'number' || currentToken.type == 'variable' || currentToken.type == "possible variable") {
            return new Node(currentToken)
        } else if (currentToken.type == 'parenthesis' && currentToken.value == '(') {
            const expressionNode = this.#parseLevel()
            const closingParenthesisToken = this.tokens?.[this.tokenIndex]
            if (!closingParenthesisToken) throw new Error("Missing closing parenthesis")
            if (closingParenthesisToken.type == 'parenthesis' && closingParenthesisToken.value == ')') {
                this.tokenIndex++
                return expressionNode
            } else {
                throw new Error("Mismatched parentheses.")
            }
        } else if (currentToken.type == 'function' || currentToken.type == "possible function") {
            // Handle function calls
            const functionNode = new Node(currentToken)
            const openingParenthesisToken = this.tokens[this.tokenIndex]
            if (openingParenthesisToken.type == 'parenthesis' && openingParenthesisToken.value == '(') {
                this.tokenIndex++
                while (this.tokens[this.tokenIndex]?.type != 'parenthesis' || this.tokens[this.tokenIndex]?.value != ')') {
                    functionNode.addChild(this.#parseLevel())
                    if (this.tokens[this.tokenIndex]?.type == 'comma') {
                        this.tokenIndex++
                    }
                }
                this.tokenIndex++ // Consume the closing parenthesis ')'
                return functionNode
            } else {
                throw new Error("Missing opening parenthesis for function.")
            }
        } else {
            throw new Error("Unexpected token \"" + currentToken.value + "\" in term.")
        }
    }

    #parseLevel(levels = [`=`, `+-`, `*/`, `^`]) {

        let nextLevels = levels.slice(1)
        const noMoreLevels = nextLevels.length == 0

        let leftNode
        if (noMoreLevels) {
            leftNode = this.#parseParLevel()
        } else {
            leftNode = this.#parseLevel(nextLevels)
        }

        while (this.tokenIndex < this.tokens.length) {

            const currentToken = this.tokens[this.tokenIndex]

            if (!levels[0].includes(currentToken.value)) {
                break
            }

            this.tokenIndex++
            const operatorNode = new Node(currentToken)
            operatorNode.addChild(leftNode)
            if (noMoreLevels) {
                operatorNode.addChild(this.#parseParLevel())
            } else {
                operatorNode.addChild(this.#parseLevel(nextLevels))
            }
            leftNode = operatorNode

        }

        return leftNode

    }

    evaluate() {
        if (!this.ast) throw new Error("Input not parsed.")
        this.answer = this.#evaluateNode(this.ast)
        return this.answer
    }

    #evaluateNode(node, varKeeps = []) {

        const currentValue = node.value
        switch (node.type) {

            case "number":
                const num = Number(currentValue)
                if (isNaN(num)) throw new Error("Number \"" + currentValue + "\" was not able to be parsed.")
                return num

            case "assignment":
                const assignTo = node.children[0]

                switch (assignTo.type) {
                    case "variable":
                    case "possible variable":
                        if (assignTo.value == "ans") {
                            throw new Error("Invalid redefinition of reserved variable \"ans\"")
                        }
                        let varValue = this.#evaluateNode(node.children[1])
                        this.variables[assignTo.value] = varValue
                        return varValue

                    case "function":
                    case "possible function":
                        const functionName = assignTo.value

                        const functionParamNodes = assignTo.children
                        if (functionParamNodes.some(param => param.type != "variable" && param.type != "possible variable")) {
                            throw new Error("Invalid function parameters")
                        }
                        const functionParams = functionParamNodes.map(child => child.value)

                        let insideFunction = this.#evaluateNode(node.children[1], functionParams).replace("^", "**")
                        let functionValue = `(${functionParams})=>\`${insideFunction}\``
                        this.functions[functionName] = eval(functionValue)
                        return

                    default:
                        throw new Error("Invalid assignment.")
                }

            case "variable":
            case "possible variable":
                if (varKeeps.includes(currentValue)) return `\${${currentValue}}`
                const varAns = this.variables?.[currentValue]
                if (varAns == undefined) throw new Error("Unknown variable \"" + currentValue + "\"")
                return this.variables[currentValue]

            case "operator":
                const leftValue = this.#evaluateNode(node.children[0], varKeeps)
                const rightValue = this.#evaluateNode(node.children[1], varKeeps)
                return this.#evaluateOperator(currentValue, leftValue, rightValue, varKeeps)

            case "function":
                let currentFunc = this.functions[currentValue]
                let funcParams = node.children
                let simplifiedParams = funcParams.map(param => this.#evaluateNode(param, varKeeps))
                const funcString = currentFunc(...simplifiedParams)
                if (varKeeps.length > 0) {
                    return funcString
                }
                return eval(funcString)

            case "possible function":
                throw new Error("Function \"" + currentValue + "\" does not exist")

            default:
                throw new Error("Uknown node type \"" + node.type + "\".")
        }

    }

    #evaluateOperator(operator, left, right, varKeeps = []) {

        if (varKeeps.some(keep => String(left).includes(keep) || String(right).includes(keep))) {
            return left + operator + right
        }

        switch (operator) {
            case '+':
                return left + right
            case '-':
                return left - right
            case '*':
                return left * right
            case '/':
                if (right == 0) {
                    throw new Error("Division by zero.")
                }
                return left / right
            case '^':
                return left ** right
            default:
                throw new Error("Unknown operator \"" + operator + "\"")
        }
    }

    getStoredAnswer() {
        return this.answer
    }

}

class Calculator {
    constructor(input, debug = false) {

        this.variables = {
            e: Math.E,
            pi: Math.PI
        }
        this.functions = {
            sin: (a) => `Math.sin(${a})`,
            cos: (a) => `Math.cos(${a})`,
            tan: (a) => `Math.tan(${a})`,
            sqrt: (a) => `Math.sqrt(${a})`,
            abs: (a) => `Math.abs(${a})`,
            ln: (a) => `Math.log(${a})`,
            round: (a) => `Math.round(${a})`,
        }

        this.debug = debug
        this.lines = input.split("\n").map(line => new Line(line, this.variables, this.functions))
        this.currentLine = 0
        this.answers = []

    }

    solveAll() {
        const numberOfLines = this.lines.length
        while (this.currentLine < numberOfLines) {
            this.solveNext()
        }
        return this.answers
    }

    getSolvedAnswers() {
        return this.answers
    }

    solveNext() {
        let line = this.lines[this.currentLine]
        let answer
        try {
            line.tokenize()
            line.parse()
            answer = this.lines[this.currentLine].evaluate()
        } catch (e) {
            if (this.debug) console.log(e)
        }
        this.answers.push(answer)
        this.variables["ans"] = this.answers.at(-1)
        this.currentLine++
        return answer
    }
}