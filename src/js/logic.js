// logic.js - progflow

// constants used by logic objects
const DEFAULT_OPERATION = 'nop';

// FlowBlockLogic - logic handling for flowblock visuals; a block is a collection
// of statements that may or may not return a value
function FlowBlockLogic(visual) {
    var locals = {}; // local variables
    var stack = []; // stack of local variables lists

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // createVariable() - create new variable (name must not be in use in this
    // scope)
    function createVariable(block,name) {
        if (typeof locals[name] == "undefined") {
            locals[name] = 0;
            return true;
        }

        return false;
    }

    // renameVariable() - change an existing variable name (only if the new
    // name is not in use in the immediate scope)
    function renameVariable(block,name,newname) {
        if (typeof locals[name] != "undefined") {
            if (createVariable(newname)) {
                delete locals[name];
                return true;
            }
        }

        return false;
    }

    // lookupVariable() - look up value of variable; must already be in use either
    // in this scope or in an outer scope
    function lookupVariable(block,name) {
        if (typeof locals[name] == "undefined") {
            if (block != null)
                return block.lookupVariable(name);

            return null;
        }

        return locals[name];
    }

    // updateVariable() - update existing variable value; this looks into an
    // overlapping (i.e. outer) scope to potentially update a variable
    function updateVariable(block,name,value) {
        if (typeof locals[name] == "undefined") {
            if (block != null)
                return block.updateVariable(name,value);

            return false;
        }

        locals[name] = value;
        return true;
    }

    // findBlock() - searches for the named block at or above this level
    function findBlock(block,name) {
        var flag = null;
        visual.forEachChild(function(obj){
            if (obj.type == 'block' && obj.getLabel() == name) {
                flag = obj;
                return false;
            }
            return true;
        });

        if (flag != null)
            return flag;
        if (visual.getLabel() == name)
            return this;
        if (block == null)
            return null;

        return block.findBlock(name);
    }

    // ontoggle() - invoked when the visual in front of the logic is toggled
    // by the user (i.e. selected)
    function ontoggle(state) {

    }

    // exec() - performs the execution step of the simulation
    function exec(block) {
        var retval = null;

        // to simulate recursion we must reset and save our local variables
        // list each time we are called
        stack.push(locals);
        locals = {};

        visual.forEachChild(function(child){
            var logic = child.getLogic(); // get logic node via visual
            logic.exec(this); // pass the child node a reference to our block

            // if some child node reports back a return value then we keep it
            // and consider it to terminate our procedure
            if (typeof logic.retval != 'undefined') {
                retval = logic.retval;
                return false;
            }

            return true;
        });

        locals = stack.pop();
        return retval;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    this.createVariable = createVariable;
    this.renameVariable = renameVariable;
    this.lookupVariable = lookupVariable;
    this.updateVariable = updateVariable;
    this.getName = visual.getLabel;
    this.ontoggle = ontoggle;
    this.exec = exec;
}

// FlowOperationLogic - logic handling for flow-operation visuals; the visual operates
// either in 'float' or 'int' mode when evaluating an operation
function FlowOperationLogic(visual,block,mode) {
    var expr = new ExpressionParser(""); // the expression the operation node will execute

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // ontoggle() - invoked when the visual in front of the logic is toggled
    // by the user (i.e. selected)
    function ontoggle(state) {
        if (!state) {
            // reset
            nodePanel.innerHTML = '';
            return;
        }

        // set up HTML view for editing the expression
        nodePanel.addLabel("Edit Operation:",true);
        nodePanel.addBreak(false);
        nodePanel.addLabel("Expression:");
        nodePanel.addTextField('flow-operation-entry',1024,expr.expr());
        nodePanel.addBreak(false);
        nodePanel.addButtonB('submit', function(){
            var newexprStr = nodePanel.getElementValue('flow-operation-entry');
            var newexpr = new ExpressionParser(newexprStr);
            if (!newexpr.error()) {
                expr = newexpr;
                syncLabel();

                // unselect the node if successfully updated
                visual.ontoggle();
                context.drawScreen();
            }
            else {
                var msg = "operation block: parse error";
                var parseError = newexpr.errorMsg();
                if (parseError != "")
                    msg += ": " + parseError;
                terminal.addLine(msg);
            }
        });
    }

    function syncLabel() {
        if (expr.expr() == "")
            visual.setLabel(DEFAULT_OPERATION);
        else
            visual.setLabel(expr.expr());
    }

    // exec() - perform execution step within the simulation
    function exec(block) {

    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
    ////////////////////////////////////////////////////////////////////////////

    this.ontoggle = ontoggle;
    this.exec = exec;

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    syncLabel();
}


// ExpressionParser - produces a syntax tree of the simple expression language
// used by the simulator
const IDENT_REGEX = /[a-zA-Z_][a-zA-Z_0-9]*/;
const NUMER_REGEX = /[0-9]*(?:\.?[0-9]+)/;
const SYMBOL_REGEX = /\(|\)|\+|-|\*|\/|\^|,|==|=|<=|>=|<>|<|>/; // list longest strings first
const EXPR_REGEX = /([a-zA-Z_][a-zA-Z_0-9]*)|([0-9]*(?:\.?[0-9]+))|(\(|\)|\+|-|\*|\/|\^|,|==|=|<=|>=|<>|<|>)/g;
function ExpressionParser(expr) {
    var toks = [];
    var iter = 0;
    var parseTree = {empty: true};
    var errorMsg = null;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // tokenize() - produce lexical tokens from the input expression
    function tokenize() {
        var stoks = expr.match(EXPR_REGEX);
        toks = [];

        if (stoks == null)
            return;

        // turn string tokens into object tokens that have a 'kind' property
        for (var tok of stoks) {
            var otok = {text: tok,kind: 'unknown'};
            if (tok.match(IDENT_REGEX)) {
                // Special Cases: operators that are made of letters
                if (tok == "and" || tok == "or" || tok == "mod" || tok == "not")
                    otok.kind = 'symbol';
                else
                    otok.kind = 'identifier';
            }
            else if (tok.match(NUMER_REGEX))
                otok.kind = 'number';
            else //if (tok.match(SYMBOL_REGEX))
                otok.kind = 'symbol';
            toks.push(otok);
        }
    }

    // parse() - produce a parse tree from the list of lexical tokens
    function parse() {
        parseTree = {empty: true};
        errorMsg = null;
        iter = 0;

        if (toks.length > 0) {
            parseTree.empty = false;
            try {
                parseTree.root = assignmentExpression({});
            } catch (errorMessage) {
                errorMsg = errorMessage;
            }
        }
    }

    function matchToken(kind,text) {
        if (iter >= toks.length)
            return false;

        if (toks[iter].kind == kind) {
            if (typeof text != 'undefined') {
                if (toks[iter].text == text) {
                    return toks[iter++];
                }
                return false;
            }
            return toks[iter++];
        }

        return false;
    }

    function assignmentExpression(node) {
        var result = orExpression(node);
        result = assignmentExpressionOpt(result);
        return result;
    }
    function assignmentExpressionOpt(node) {
        if (matchToken('symbol','=')) {
            var newnode = {};
            newnode.kind = 'assignment';
            newnode.left = node;
            newnode.right = assignmentExpression({}); // force a right-most eval
            return newnode;
        }
        return node;
    }
    function orExpression(node) {
        var result = andExpression(node);
        result = orExpressionOpt(result);
        return result;
    }
    function orExpressionOpt(node) {
        if (matchToken('symbol','or')) {
            var newnode = {};
            newnode.kind = 'logic-or';
            newnode.left = node;
            newnode.right = andExpression({});
            return orExpressionOpt(newnode);
        }
        return node;
    }
    function andExpression(node) {
        var result = equalityExpression(node);
        result = andExpressionOpt(result);
        return result;
    }
    function andExpressionOpt(node) {
        if (matchToken('symbol','and')) {
            var newnode = {};
            newnode.kind = 'logic-and';
            newnode.left = node;
            newnode.right = equalityExpression({});
            return andExpressionOpt(newnode);
        }
        return node;
    }
    function equalityExpression(node) {
        var result = relationalExpression(node);
        result = equalityExpressionOpt(result);
        return result;
    }
    function equalityExpressionOpt(node) {
        var newnode = {};
        if (matchToken('symbol','=='))
            newnode.kind = 'equality-equal';
        else if (matchToken('symbol','<>'))
            newnode.kind = 'equality-not-equal';
        else
            return node;

        newnode.left = node;
        newnode.right = relationalExpression({});
        return equalityExpressionOpt(newnode);
    }
    function relationalExpression(node) {
        var result = additiveExpression(node);
        result = relationalExpressionOpt(result);
        return result;
    }
    function relationalExpressionOpt(node) {
        var newnode = {};
        if (matchToken('symbol','<'))
            newnode.kind = 'relational-less-than';
        else if (matchToken('symbol','>'))
            newnode.kind = 'relational-greater-than';
        else if (matchToken('symbol','<='))
            newnode.kind = 'relational-less-than-equal-to';
        else if (matchToken('symbol','>='))
            newnode.kind = 'relational-greater-than-equal-to';
        else
            return node;

        newnode.left = node;
        newnode.right = additiveExpression({});
        return relationalExpressionOpt(newnode);
    }
    function additiveExpression(node) {
        var result = multiplicativeExpression(node);
        result = additiveExpressionOpt(result);
        return result;
    }
    function additiveExpressionOpt(node) {
        var newnode = {};
        if (matchToken('symbol','+'))
            newnode.kind = 'additive-add';
        else if (matchToken('symbol','-'))
            newnode.kind = 'additive-sub';
        else
            return node;

        newnode.left = node;
        newnode.right = multiplicativeExpression({});
        return additiveExpressionOpt(newnode);
    }
    function multiplicativeExpression(node) {
        var result = exponentialExpression(node);
        result = multiplicativeExpressionOpt(result);
        return result;
    }
    function multiplicativeExpressionOpt(node) {
        var newnode = {};
        if (matchToken('symbol','*'))
            newnode.kind = 'multiplicative-multiply';
        else if (matchToken('symbol','-'))
            newnode.kind = 'multiplicative-divide';
        else
            return node;

        newnode.left = node;
        newnode.right = exponentialExpression({});
        return multiplicativeExpressionOpt(newnode);
    }
    function exponentialExpression(node) {
        var result = prefixExpression(node);
        result = exponentialExpressionOpt(result);
        return result;
    }
    function exponentialExpressionOpt(node) {
        if (matchToken('symbol','^')) {
            var newnode = {};
            newnode.left = node;
            newnode.right = prefixExpression({});
            return exponentialExpressionOpt(newnode);
        }
        return node;
    }
    function prefixExpression(node) {
        var newnode = {};
        if (matchToken('symbol','-'))
            newnode.kind = 'prefix-negate';
        else if (matchToken('symbol','not'))
            newnode.kind = 'prefix-not';
        else {
            return functionCallExpression(node);
        }

        newnode.left = prefixExpression(node);
        newnode.right = null;
        return newnode;
    }
    function functionCallExpression(node) {
        var result = primaryExpression(node);
        result = functionCallExpressionOpt(node);
        return result;
    }
    function functionCallExpressionOpt(node) {
        if (matchToken('symbol','(')) {
            var newnode = {};
            newnode.kind = 'function-call';
            newnode.left = node; // the function id
            newnode.right = null; // TODO: parse function call list
            if (!matchToken('symbol',')')) {
                throw "expected ')' to close function-call";
            }
            return newnode;
        }
        return node;
    }
    function primaryExpression(node) {
        var ex = matchToken('identifier');
        if (ex) {
            node.kind = 'identifier';
            node.id = ex.text;
            return node;
        }

        ex = matchToken('number');
        if (ex) {
            node.kind = 'number';
            node.value = Number(ex.text);
            return node;
        }

        // parenthesized expressions are marked as 'expression' kind
        if (matchToken('symbol','(')) {
            node.kind = 'expression';
            node.child = assignmentExpression({});
            if (!matchToken('symbol',')')) {
                throw "expected matching ')' for parenthesized expression";
            }
            return node;
        }

        throw "cannot understand token: " + JSON.stringify(toks[iter]);
    }

    function evaluate(block) {

    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    tokenize();
    parse();
    this.empty = function(){return parseTree.empty;};
    this.parseTree = function(){return parseTree;};
    this.evaluate = evaluate;
    this.error = function(){return errorMsg!=null;};
    this.errorMsg = function(){return errorMsg;};
    this.expr = function(){return expr;};
}
