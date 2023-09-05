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

        this.answer = "error"

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
        return !!this.variables?.[str]
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
                this.position--

                this.tokens.push(new Token("number", buffer))
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
                    // either a new assignment or an error
                    const nextChar = this.input?.[this.position + 1]
                    if (nextChar == "(") {
                        this.tokens.push(new Token("possible function", buffer))
                    } else {
                        this.tokens.push(new Token("possible variable", buffer))
                    }
                }

                buffer = ""

            } else if (char == "(" || char == ")") {
                this.tokens.push(new Token("parenthesis", char))
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
        if (this.input.length == 0) return
        this.ast = this.#parseEqLevel()
    }

    // Parentheses Level Priority
    #parseParLevel() {
        if (this.tokenIndex >= this.tokens.length) {
            throw new Error("Missing closing parenthesis.")
        }
        const currentToken = this.tokens[this.tokenIndex]
        this.tokenIndex++

        if (currentToken.type == 'number' || currentToken.type == 'variable' || currentToken.type == "possible variable") {
            return new Node(currentToken)
        } else if (currentToken.type == 'parenthesis' && currentToken.value == '(') {
            const expressionNode = this.#parseEqLevel()
            const closingParenthesisToken = this.tokens[this.tokenIndex]
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
                    functionNode.addChild(this.#parseEqLevel())
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

    // Exponent Level Priority
    #parseExpLevel() {
        let leftNode = this.#parseParLevel()

        while (this.tokenIndex < this.tokens.length) {
            const currentToken = this.tokens[this.tokenIndex]

            // Check if the current token is an exponent operator
            if (currentToken.type == 'operator' && `^`.includes(currentToken.value)) {
                this.tokenIndex++
                const operatorNode = new Node(currentToken)
                operatorNode.addChild(leftNode)
                operatorNode.addChild(this.#parseParLevel())
                leftNode = operatorNode
            } else {
                break
            }
        }

        return leftNode
    }

    // Multiplication Level Priority
    #parseMultLevel() {
        let leftNode = this.#parseExpLevel()

        while (this.tokenIndex < this.tokens.length) {
            const currentToken = this.tokens[this.tokenIndex]

            // Check if the current token is a multiplication or division operator
            if (currentToken.type == 'operator' && `*/`.includes(currentToken.value)) {
                this.tokenIndex++
                const operatorNode = new Node(currentToken)
                operatorNode.addChild(leftNode)
                operatorNode.addChild(this.#parseExpLevel())
                leftNode = operatorNode
            } else {
                break
            }
        }

        return leftNode
    }

    // Addition Level Priority
    #parseAddLevel() {
        let leftNode = this.#parseMultLevel()

        while (this.tokenIndex < this.tokens.length) {
            const currentToken = this.tokens[this.tokenIndex]

            // Check if the current token is an addition or subtraction operator
            if (currentToken.type == 'operator' && `+-`.includes(currentToken.value)) {
                this.tokenIndex++
                const operatorNode = new Node(currentToken)
                operatorNode.addChild(leftNode)
                operatorNode.addChild(this.#parseMultLevel())
                leftNode = operatorNode
            } else {
                break
            }
        }

        return leftNode
    }

    // Addition Level Priority
    #parseEqLevel() {
        let leftNode = this.#parseAddLevel()

        while (this.tokenIndex < this.tokens.length) {
            const currentToken = this.tokens[this.tokenIndex]

            // Check if the current token is an addition or subtraction operator
            if (currentToken.type == 'assignment') {
                this.tokenIndex++
                const operatorNode = new Node(currentToken)
                operatorNode.addChild(leftNode)
                operatorNode.addChild(this.#parseAddLevel())
                leftNode = operatorNode
            } else {
                break
            }
        }

        return leftNode
    }

    evaluate() {
        if (this.input.length == 0) return
        this.answer = this.#evaluateNode(this.ast)
        return this.answer
    }

    #evaluateNode(node) {

        if (node.type == 'number') {
            let num = Number(node.value)
            if (isNaN(num)) {
                throw new Error("Number \"" + node.value + "\" was not able to be parsed.")
            }
            return num
        } else if (node.type == "variable") {

            let varAnswer = this.variables?.[node.value]
            if (varAnswer) {
                return this.variables[node.value]
            } else {
                throw new Error("Unknown variable \"" + node.value + "\"")
            }

        } else if (node.type == "assignment") {

            const leftNode = node.children[0]
            if (leftNode.type == "possible variable" || leftNode.type == "variable") {

                // TODO how to assign variables in a whole calculator instead of just in this line

                const rightValue = this.#evaluateNode(node.children[1])
                this.variables[leftNode.value] = rightValue
                return rightValue

            } else if (leftNode.type == "possible function" || leftNode.type == "function") {

                // TODO how to assign functions in a whole calculator instead of just in this line

                const functionName = leftNode.value

                // get parameters
                let functionNodeParameters = leftNode.children

                // get equation for function
                let functionNodeEquation = node.children[1]

                // check for invalid parameters
                functionNodeParameters.some((node) => {
                    const isParameter = ["possible variable", "possible function", "variable", "function"].includes(node.type)
                    if (isParameter) {
                        return true
                    } else {
                        throw new Error("Invalid parameter \"" + node.value + "\" for function assignment \"" + functionName + "\"")
                    }
                })

                let functionParameters = functionNodeParameters.map(parameter => parameter.value)

                const formattedEquation = this.#formatEquation(functionNodeEquation)

                let functionString = `(${functionParameters})=>\`${formattedEquation}\``

                this.functions[functionName] = eval(functionString)

                return

            } else {
                throw new Error("Invalid assignment to \"" + leftNode.value + "\"")
            }

        } else if (node.type == 'operator') {

            const leftValue = this.#evaluateNode(node.children[0])
            const rightValue = this.#evaluateNode(node.children[1])
            return this.#evaluateOperator(node.value, leftValue, rightValue)

        } else if (node.type == 'function') {
            // Handle function evaluation
            return this.#evaluateFunction(node)
        } else {
            throw new Error("Invalid node type \"" + node.type + "\".")
        }


    }

    #evaluateOperator(operator, left, right) {
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

    #evaluateFunction(node) {
        let childrenAnswers = node.children.map(child => this.#evaluateNode(child))
        let currentFunction = this.functions?.[node.value]
        if (!currentFunction) {
            throw new Error("The function \"" + node.value + "\" does not exist.")
        }
        if (currentFunction.length != node.children.length) {
            throw new Error("Not the correct number of arguments for the function \"" + node.value + "\"")
        }
        let answer = eval(currentFunction(...childrenAnswers))
        if (answer) {
            return answer
        } else {
            throw new Error("Invalid function call")
        }
    }

    getStoredAnswer() {
        return this.answer
    }

    #formatEquation(node) {
        if (node.type == "function") {
            // TODO finish function replacement
            let currentFunc = this.functions[node.value]
            let subParameters = node.children.map(child => this.#formatEquation(child))
            if (subParameters.length != currentFunc.length) {
                throw new Error("Incorrect number of parameters for the function \"" + node.value + "\".")
            }
            return currentFunc(...subParameters)
        } else if (node.type == "operator") {
            let left = this.#formatEquation(node.children[0])
            let right = this.#formatEquation(node.children[1])
            return `${left}${node.value}${right}`
        } else if (node.type == "assignment") {
            throw new Error("Invalid assignment.")
        } else {
            return `\${${node.value}}`
        }
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

    enableDebug() {
        this.debug = true
    }

    disableDebug() {
        this.debug = false
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