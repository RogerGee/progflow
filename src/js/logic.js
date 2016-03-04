// logic.js - progflow

// constants used by logic objects
const DEFAULT_OPERATION = 'nop';

// FlowBlockLogic - logic handling for flowblock visuals; a block is a collection
// of statements that may or may not return a value
function FlowBlockLogic(visual,block,param) {
    var locals = {}; // local variables
    var stack = []; // stack of local variables lists

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // createVariable() - create new variable (name must not be in use in this
    // scope)
    function createVariable(name) {
        if (typeof locals[name] == "undefined") {
            locals[name] = 0;
            return true;
        }

        return false;
    }

    // renameVariable() - change an existing variable name (only if the new
    // name is not in use in the immediate scope)
    function renameVariable(name,newname) {
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
    function lookupVariable(name) {
        if (typeof locals[name] == "undefined") {
            if (block != null)
                return block.lookupVariable(name);

            return null;
        }

        return locals[name];
    }

    // updateVariable() - update existing variable value; this looks into an
    // overlapping (i.e. outer) scope to potentially update a variable
    function updateVariable(name,value) {
        if (typeof locals[name] == "undefined") {
            if (block != null)
                return block.updateVariable(name,value);

            return false;
        }

        locals[name] = value;
        return true;
    }

    // updateCreateVariable() - update existing variable value or create new
    // variable with value
    function updateCreateVariable(name,value) {
        if (typeof locals[name] == "undefined") {
            // make sure name isn't in use in a wider scope
            if (block != null && block.updateVariable(name,value))
                return;

            // let control fall through to create new variable
        }
        locals[name] = value;
    }

    // findBlock() - searches for the named block at or above this level
    function findBlock(name) {
        var flag = null;
        visual.forEachChild(function(obj){
            if (obj.type == 'block' && obj.getLabel() == name) {
                flag = obj.getLogic();
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
    function exec(args) {
        var retval = null;

        // to simulate recursion we must reset and save our local variables
        // list each time we are called
        stack.push(locals);
        locals = {};

        // TODO: load arguments

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
    this.updateCreateVariable = updateCreateVariable;
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
    function exec() {

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

////////////////////////////////////////////////////////////////////////////////
// ExpressionParser - produces a syntax tree of the simple expression language
// used by the simulator
////////////////////////////////////////////////////////////////////////////////

// regular expressions for lexing
const IDENT_REGEX = /[a-zA-Z_][a-zA-Z_0-9]*/;
const NUMER_REGEX = /[0-9]*(?:\.?[0-9]+)/;
const SYMBOL_REGEX = /\(|\)|\+|-|\*|\/|\^|,|==|=|<=|>=|<>|<|>/; // list longest strings first
const EXPR_REGEX = /([a-zA-Z_][a-zA-Z_0-9]*)|([0-9]*(?:\.?[0-9]+))|(\(|\)|\+|-|\*|\/|\^|,|==|=|<=|>=|<>|<|>)/g;

// expression types for evaluation
AssignmentExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
LogicORExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
LogicANDExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
EqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
NotEqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
LessThanExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
GreaterThanExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
LessThanEqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
GreaterThanEqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
AddExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
SubtractExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
MultiplyExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
DivideExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
ExponentExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
NegateExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
NotExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
FunctionCallExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
};
IdentifierNode = function(tok) {
    this.id = tok.text;
    this.kind = 'identifier';
};
NumberNode = function(tok) {
    this.value = Number(tok.text);
    this.kind = 'number';
};

// evaluation prototypes for expression types
AssignmentExpressionNode.prototype.eval = function(block) {
    if (typeof this.left.lval == 'undefined')
        throw "left-hand side is not assignable";

    var lval = this.left.lval(block); // a function that sets the lval of the left-expression
    var rval = this.right.eval(block); // result of evaluating right-expression
    lval(rval); // set l-value

    return rval;
};
AssignmentExpressionNode.prototype.lval = function(block) {
    // an assignment expression is assignable; consider: (a = b) = c
    return this.left.lval();
};
LogicORExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) || this.right.eval(block);
};
LogicANDExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) && this.right.eval(block);
};
EqualExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) == this.right.eval(block);
};
NotEqualExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) != this.right.eval(block);
};
LessThanExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) < this.right.eval(block);
};
GreaterThanExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) > this.right.eval(block);
};
LessThanEqualExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) <= this.right.eval(block);
};
GreaterThanEqualExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) >= this.right.eval(block);
};
AddExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) + this.right.eval(block);
};
SubtractExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) - this.right.eval(block);
};
MultiplyExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) * this.right.eval(block);
};
DivideExpressionNode.prototype.eval = function(block) {
    return this.left.eval(block) / this.right.eval(block);
};
ExponentExpressionNode.prototype.eval = function(block) {
    return Math.pow(this.left.eval(block),this.right.eval(block));
};
NegateExpressionNode.prototype.eval = function(block) {
    return -this.left.eval(block);
};
NotExpressionNode.prototype.eval = function(block) {
    return !this.left.eval(block);
};
FunctionCallExpressionNode.prototype.eval = function(block) {
    if (typeof this.left.kind == 'undefined' || this.left.kind == 'number') {
        throw "'" + this.left + "' is not a valid callable";
    }

    var fblk = block.findBlock(this.left.id);
    if (fblk == null) {
        throw "'" + this.left + "': function is undefined";
    }

    // TODO: call function with arguments

};
IdentifierNode.prototype.eval = function(block) {
    var v = block.lookupVariable(this.id);
    if (v == null) {
        throw "'" + this + "': variable is undefined";
    }

    return v;
};
IdentifierNode.prototype.lval = function(block) {
    return function(val) { block.updateCreateVariable(this.id,val); };
};
NumberNode.prototype.eval = function(block) {
    return this.value; // that was easy
};

// toString prototypes for expression types
AssignmentExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') = (' + this.right + ')';
};
LogicORExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') or (' + this.right + ')';
};
LogicANDExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') and (' + this.right + ')';
};
EqualExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') == (' + this.right + ')';
};
NotEqualExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') <> (' + this.right + ')';
};
LessThanExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') < (' + this.right + ')';
};
GreaterThanExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') > (' + this.right + ')';
};
LessThanEqualExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') <= (' + this.right + ')';
};
GreaterThanEqualExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') >= (' + this.right + ')';
};
AddExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') + (' + this.right + ')';
};
SubtractExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') - (' + this.right + ')';
};
MultiplyExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') * (' + this.right + ')';
};
DivideExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') / (' + this.right + ')';
};
ExponentExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') ^ (' + this.right + ')';
};
NegateExpressionNode.prototype.toString = function() {
    return '-' + this.left;
};
NotExpressionNode.prototype.toString = function() {
    return 'not ' + this.left;
};
IdentifierNode.prototype.toString = function() {
    return this.id;
};
NumberNode.prototype.toString = function() {
    return String(this.value);
};

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
                parseTree.root = assignmentExpression();
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
            // force a right-most evaluation
            return new AssignmentExpressionNode( node,assignmentExpression() );
        }

        return node;
    }
    function orExpression(node) {
        var result = andExpression(node);
        result = orExpressionOpt(result);
        return result;
    }
    function orExpressionOpt(node) {
        if (matchToken('symbol','or'))
            return orExpressionOpt( new LogicORExpressionNode(node,andExpression()) );

        return node;
    }
    function andExpression(node) {
        var result = equalityExpression(node);
        result = andExpressionOpt(result);
        return result;
    }
    function andExpressionOpt(node) {
        if (matchToken('symbol','and'))
            return andExpressionOpt( new LogicANDExpressionNode(node,equalityExpression()) );

        return node;
    }
    function equalityExpression(node) {
        var result = relationalExpression(node);
        result = equalityExpressionOpt(result);
        return result;
    }
    function equalityExpressionOpt(node) {
        if (matchToken('symbol','=='))
            return equalityExpressionOpt( new EqualExpressionNode(node,relationalExpression()) );
        else if (matchToken('symbol','<>'))
            return equalityExpressionOpt( new NotEqualExpressionNode(node,relationalExpression()) );

        return node;
    }
    function relationalExpression(node) {
        var result = additiveExpression(node);
        result = relationalExpressionOpt(result);
        return result;
    }
    function relationalExpressionOpt(node) {
        if (matchToken('symbol','<'))
            return relationalExpressionOpt( new LessThanExpressionNode(node,additiveExpression()) );
        else if (matchToken('symbol','>'))
            return relationalExpressionOpt( new GreaterThanExpressionNode(node,additiveExpression()) );
        else if (matchToken('symbol','<='))
            return relationalExpressionOpt( new LessThanEqualExpressionNode(node,additiveExpression()) );
        else if (matchToken('symbol','>='))
            return relationalExpressionOpt( new GreaterThanEqualExpressionNode(node,additiveExpression()) );

        return node;
    }
    function additiveExpression(node) {
        var result = multiplicativeExpression(node);
        result = additiveExpressionOpt(result);
        return result;
    }
    function additiveExpressionOpt(node) {
        if (matchToken('symbol','+'))
            return additiveExpressionOpt( new AddExpressionNode(node,multiplicativeExpression()) );
        else if (matchToken('symbol','-'))
            return additiveExpressionOpt( new SubtractExpressionNode(node,multiplicativeExpression()) );

        return node;
    }
    function multiplicativeExpression(node) {
        var result = exponentialExpression(node);
        result = multiplicativeExpressionOpt(result);
        return result;
    }
    function multiplicativeExpressionOpt(node) {
        if (matchToken('symbol','*'))
            return multiplicativeExpressionOpt( new MultiplyExpressionNode(node,exponentialExpression()) );
        else if (matchToken('symbol','/'))
            return multiplicativeExpressionOpt( new DivideExpressionNode(node,exponentialExpression()) );

        return node;
    }
    function exponentialExpression(node) {
        var result = prefixExpression(node);
        result = exponentialExpressionOpt(result);
        return result;
    }
    function exponentialExpressionOpt(node) {
        if (matchToken('symbol','^'))
            return exponentialExpressionOpt( new ExponentExpressionNode(node,prefixExpression()) );

        return node;
    }
    function prefixExpression(node) {
        if (matchToken('symbol','-'))
            return new NegateExpressionNode(prefixExpression(node),null);
        else if (matchToken('symbol','not'))
            return new NotExpressionNode(prefixExpression(node),null);

        return functionCallExpression(node);
    }
    function functionCallExpression(node) {
        var result = primaryExpression(node);
        result = functionCallExpressionOpt(result);
        return result;
    }
    function functionCallExpressionOpt(node) {
        if (matchToken('symbol','(')) {
            // TODO: parse function call list
            var newnode = new FunctionCallExpressionNode(node, null/*call-expr*/);
            if (!matchToken('symbol',')')) {
                throw "expected ')' to close function-call";
            }
            return newnode;
        }
        return node;
    }
    function primaryExpression(node) {
        var ex;
        if (ex = matchToken('identifier'))
            return new IdentifierNode(ex);

        if (ex = matchToken('number'))
            return new NumberNode(ex);

        // parenthesized expression
        if (matchToken('symbol','(')) {
            var newnode = assignmentExpression();
            if (!matchToken('symbol',')')) {
                throw "expected matching ')' for parenthesized expression";
            }
            return newnode;
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
