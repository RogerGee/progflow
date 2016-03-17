// logic.js - progflow

// constants used by logic objects
const DEFAULT_OPERATION = 'nop';

// FlowBlockLogic - logic handling for flowblock visuals; a block is a collection
// of statements that may or may not return a value
function FlowBlockLogic(visual,block) {
    var locals = {}; // local variables
    var stack = []; // stack of local variables lists

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // createVariable() - create new variable (name must not be in use in this
    // scope)
    function createVariable(name,index) {
        if (typeof locals[name] == "undefined") {
            // create variable; the default value is zero
            var nv;
            if (typeof index != 'undefined') {
                nv = {};
                nv[index] = 0;
            }
            else
                nv = {value: 0};

            locals[name] = nv;
            return true;
        }

        return false;
    }

    // renameVariable() - change an existing variable name (only if the new
    // name is not in use in the immediate scope)
    function renameVariable(name,newname) {
        if (typeof locals[name] != "undefined") {
            if (createVariable(newname)) {
                locals[newname] = locals[name];
                delete locals[name];
                return true;
            }
        }

        return false;
    }

    // lookupVariable() - look up value of variable; must already be in use either
    // in this scope or in an outer scope
    function lookupVariable(name,index) {
        if (typeof locals[name] == "undefined") {
            if (block != null)
                return block.lookupVariable(name,index);

            return null;
        }

        if (typeof index != 'undefined')
            return locals[name][index];
        return locals[name].value; // may be undefined
    }

    // updateVariable() - update existing variable value; this looks into an
    // overlapping (i.e. outer) scope to potentially update a variable
    function updateVariable(name,value,index) {
        if (typeof locals[name] == "undefined") {
            if (block != null)
                return block.updateVariable(name,value,index);

            return false;
        }

        if (typeof index != 'undefined')
            locals[name][index] = value;
        else
            locals[name].value = value;
        return true;
    }

    // updateCreateVariable() - update existing variable value or create new
    // variable with value
    function updateCreateVariable(name,value,index) {
        if (typeof locals[name] == "undefined") {
            // make sure name isn't in use in a wider scope
            if (block != null && block.updateVariable(name,value,index))
                return;

            createVariable(name,index);
            // let control fall through to update new variable
        }

        if (typeof index != 'undefined')
            locals[name][index] = value;
        else
            locals[name].value = value;
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

    // exec() - executes each of the child nodes in a context that provides
    // (optionally) the specified arguments; the 'next' callback controls what
    // happens after
    function exec(args) {
        var it = visual.newChildIter();

        // to simulate recursion we must reset and save our local variables
        // list each time we are called
        stack.push(locals);
        locals = {};

        // create 'args' if it does not exist (it shouldn't for an initial call)
        if (typeof args == 'undefined') {
            args = {
                next: function(){} // does nothing
            }
        }

        // load parameters to procedure call into local variable list
        if (typeof args.params != 'undefined') {

        }

        var nx = function() {
            var child = visual.nextChild(it);
            if (child == null) {
                // we have executed every single child in the simulation
                locals = stack.pop(); // undo stack frame
                args.next(); // call the 'next' callback to continue
                return;
            }

            var logic = child.getLogic(); // get logic node via visual
            var ret = logic.exec(newargs); // pass the child node a reference to ourself

            // if the return value is defined, call the 'next' function to continue; a
            // return structure should therefore not call its next callback
            if (typeof ret != 'undefined')
                args.next(ret);

            return ret;
        };
        var newargs = {
            next: nx
        };
        nx();
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    this.createVariable = createVariable;
    this.renameVariable = renameVariable;
    this.lookupVariable = lookupVariable;
    this.updateVariable = updateVariable;
    this.updateCreateVariable = updateCreateVariable;
    this.findBlock = findBlock;
    this.getName = visual.getLabel;
    this.ontoggle = ontoggle;
    this.exec = exec;
}

// FlowOperationLogic - logic handling for flow-operation visuals
function FlowOperationLogic(visual,block) {
    var expr = new ExpressionParser("",false,true); // the expression the operation node will execute

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
            var newexpr = new ExpressionParser(newexprStr,false,true);
            if (!newexpr.error()) {
                if (!newexpr.containsNode('assign-expr')) {
                    terminal.addLine("operation block: warning: "
                        + newexprStr + ": statement has no effect",'warning-line');
                }

                expr = newexpr;
                syncLabel();

                // unselect the node if successfully updated
                visual.ontoggle();
                context.drawScreen();
            }
            else {
                var msg = "operation block: parse error: " + newexprStr;
                var parseError = newexpr.errorMsg();
                if (parseError != "")
                    msg += ": " + parseError;
                terminal.addLine(msg,'error-line');
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
    function exec(args) {
        try {
            expr.evaluate(block);
            args.next();
        }
        catch (e) {
            // the expression evaluation can throw errors; this stops the
            // execution of the program
            terminal.addLine('operation-block: eval error: '+e,'error-line');
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.ontoggle = ontoggle;
    this.exec = exec;
    syncLabel();
}

////////////////////////////////////////////////////////////////////////////////
// FlowInOutLogic - logic handling for input/output visuals
////////////////////////////////////////////////////////////////////////////////

function FlowInOutLogic(visual,block,param) {
    var formatString = new FormatString("");

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function ontoggle(state) {
        if (!state) {
            // reset
            nodePanel.innerHTML = '';
            return;
        }

        nodePanel.addLabel("Edit IO Statement:",true);
        nodePanel.addBreak(false);
        nodePanel.addLabel("Formatted String:");
        nodePanel.addTextField('flow-io-entry',1024,formatString.fs);
        nodePanel.addBreak(false);
        nodePanel.addButtonB('submit',function(){
            var newstr = nodePanel.getElementValue('flow-io-entry');
            formatString = new FormatString(newstr);
            visual.setLabel(newstr);
            visual.ontoggle();
            context.drawScreen();
        });
    }

    function exec(args) {
        if (param == 'in') {
            formatString.input(block,args.next);
        }
        else {
            formatString.output(block);
            args.next();
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.ontoggle = ontoggle;
    this.exec = exec;
}

////////////////////////////////////////////////////////////////////////////////
// FlowIfLogic
////////////////////////////////////////////////////////////////////////////////

function FlowIfLogic(visual,block) {
    var expr = new ExpressionParser("false",true,false);

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function ontoggle(state) {
        if (!state) {
            // reset
            nodePanel.innerHTML = '';
            return;
        }

        nodePanel.addLabel("Edit If Condition:",true);
        nodePanel.addBreak(false);
        nodePanel.addLabel("Condition:");
        nodePanel.addTextField('flow-ifcond-entry',1024,expr.expr());
        nodePanel.addBreak(false);
        nodePanel.addButtonB('submit',function(){
            var newstr = nodePanel.getElementValue('flow-ifcond-entry');
            var newexpr = new ExpressionParser(newstr,true,false);
            if (!newexpr.error()) {
                if (newexpr.empty()) {
                    terminal.addLine("if block: condition: must not be empty",
                        'error-line');
                    return;
                }
                if (newexpr.parseTree().root.typeOf() != 'boolean') {
                    terminal.addLine("if block: condition: expression must evaluate"
                        + " to a Boolean value",'error-line');
                    return; // take no action
                }
                expr = newexpr;
                visual.setLabel(newstr);
                visual.ontoggle();
                context.drawScreen();
            }
            else { // take no action
                var msg = "if block: parse error: " + newstr;
                var parseError = newexpr.errorMsg();
                if (parseError != "")
                    msg += ": " + parseError;
                terminal.addLine(msg,'error-line');
            }
        });
    }

    function exec(args) {
        // we implement the if-statement with an if-statement: go figure; there
        // is no need to call next ourselves since we are a control structure and
        // redirect control somewhere else

        if (expr.evaluate(block)) {
            visual.getTruePart().getLogic().exec(args);
        }
        else {
            visual.getFalsePart().getLogic().exec(args);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.ontoggle = ontoggle;
    this.exec = exec;

    visual.setLabel(expr.expr());
}

////////////////////////////////////////////////////////////////////////////////
// FlowWhileLogic
////////////////////////////////////////////////////////////////////////////////

function FlowWhileLogic(visual,block) {
    var expr = new ExpressionParser("false",true,false);

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function ontoggle(state) {
        if (!state) {
            // reset
            nodePanel.innerHTML = '';
            return;
        }

        nodePanel.addLabel("Edit While Condition:",true);
        nodePanel.addBreak(false);
        nodePanel.addLabel("Condition:");
        nodePanel.addTextField('flow-whilecond-entry',1024,expr.expr());
        nodePanel.addBreak(false);
        nodePanel.addButtonB('submit',function(){
            var newstr = nodePanel.getElementValue('flow-whilecond-entry');
            var newexpr = new ExpressionParser(newstr,true,false);
            if (!newexpr.error()) {
                if (newexpr.empty()) {
                    terminal.addLine("while block: condition: must not be empty",
                        'error-line');
                    return;
                }
                if (newexpr.parseTree().root.typeOf() != 'boolean') {
                    terminal.addLine("while block: condition: expression must evaluate"
                        + " to a Boolean value",'error-line');
                    return; // take no action
                }
                expr = newexpr;
                visual.setLabel(newstr);
                visual.ontoggle();
                context.drawScreen();
            }
            else { // take no action
                var msg = "while block: parse error: " + newstr;
                var parseError = newexpr.errorMsg();
                if (parseError != "")
                    msg += ": " + parseError;
                terminal.addLine(msg,'error-line');
            }
        });
    }

    function exec(args) {
        // we must try our best to prevent an infinite loop; to do this, we give
        // the loop 5 seconds of execution time before killing it

        var cond;
        var newargs;
        var fn = function() {
            // perform one loop iteration
            try {
                if (cond = expr.evaluate(block)) {
                    visual.getBody().getLogic().exec(newargs);
                }
            } catch (e) {
                terminal.addLine("while block: error: "+e,'error-line');
                return;
            }

            // if the while loop is finished running (i.e. its condition was false),
            // then continue on to the next node in the simulation
            if (!cond)
                args.next();
        };
        newargs = {next: fn};

        fn();
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.ontoggle = ontoggle;
    this.exec = exec;

    visual.setLabel(expr.expr());
}

////////////////////////////////////////////////////////////////////////////////
// FormatString
////////////////////////////////////////////////////////////////////////////////

const SPACESEP_REGEX = /[^\s]+/g;
const FORMAT_TOKEN_REGEX = /%[a-zA-Z_][a-zA-Z_0-9]*/g;
const FORMAT_EXPR_GRAB_REGEX = /%{(.+)}/g;

function FormatString(fs) {
    this.fs = fs;
}

FormatString.prototype.output = function(block) {
    var output = "", last = 0;
    var errors = [];
    FORMAT_TOKEN_REGEX.lastIndex = 0;
    FORMAT_EXPR_GRAB_REGEX.lastIndex = 0;
    while (true) {
        var m = FORMAT_TOKEN_REGEX.exec(this.fs); // simple variable name
        var n = FORMAT_EXPR_GRAB_REGEX.exec(this.fs); // output expression

        if (!m && !n)
            break;

        while (true) {
            if (m && (!n || n.index >= m.index)) {
                output += this.fs.substring(last,m.index);

                // grab the variable name by stripping off the leading '%' sign; then
                // lookup the variable's value
                var vname = m[0].substring(1);
                var value = block.lookupVariable(vname);
                if (value == null) {
                    output += "'?'";
                    errors.push("variable '" + vname + "' is undefined");
                }
                else {
                    output += String(value);
                }

                last = m.index + m[0].length;
                m = null;
            }
            else if (n) {
                output += this.fs.substring(last,n.index);

                // parse the contents of the first captured group as an expression
                var expr = new ExpressionParser(n[1],false,false);
                if (expr.error()) {
                    output += "'?'";
                    errors.push(expr.errorMsg());
                }
                else {
                    // evaluate the expression
                    try {
                        output += String(expr.evaluate(block));
                    } catch (e) {
                        output += "'?'";
                        errors.push(e);
                    }
                }

                last = n.index + n[0].length;
                n = null;
            }
            else
                break;
        }
    }
    output += this.fs.substring(last,this.fs.length);

    // we consider the output block errors to be warnings
    for (var e of errors)
        terminal.addLine("output block: warning: " + e,'warning-line');
    terminal.addLine(output);
};

FormatString.prototype.input = function(block,next) {
    var things = [], last = 0, errors = [];
    FORMAT_TOKEN_REGEX.lastIndex = 0;
    FORMAT_EXPR_GRAB_REGEX.lastIndex = 0;
    while (true) {
        var m = FORMAT_TOKEN_REGEX.exec(this.fs); // simple variable assignment
        var n = FORMAT_EXPR_GRAB_REGEX.exec(this.fs); // l-val from expression
        if (!m && !n)
            break;

        while (true) {
            if (m && (!n || n.index >= m.index)) {
                things.push({s:this.fs.substring(last,m.index)}); // prompt text
                things.push({v:m[0].substring(1)}); // variable
                last = m.index + m[0].length;
                m = null;
            }
            else if (n) {
                var expr = new ExpressionParser(n[1],false,false);
                things.push({s:this.fs.substring(last,n.index)}); // prompt text
                if (expr.error()) {
                    errors.push("parse error: " + expr.errorMsg());
                }
                else if (typeof expr.parseTree().root.lval == 'undefined') {
                    // the expression must evaluate to an l-value
                    errors.push("expression '" + expr.expr() + "' is not assignable");
                }
                else {
                    // add the expression that will generate an l-value
                    things.push({e:expr});
                }
                last = n.index + n[0].length;
                n = null;
            }
            else
                break;
        }
    }
    var final = this.fs.substring(last,this.fs.length);
    if (final != "")
        things.push({s:final});

    var cb = function(){
        this.iter = 0;
        this.things = things;
        this.extra = [];
    };
    cb.prototype.next = function() {
        while (this.iter < this.things.length) {
            if (typeof this.things[this.iter].s != 'undefined') {
                var ln = terminal.newLine();
                ln.addText(this.things[this.iter++].s);
                ln.finish(false);
            }
            else {
                var done = this.iter+1 >= this.things.length;
                if (this.extra.length > 0) {
                    // use tokens that were previously read
                    inputRequest(this.extra[0]);
                    this.extra.splice(0,1); // consume token

                    // if we are done with the input operation, call the
                    // 'next' callback; otherwise make a recursive call
                    if (done)
                        next(); // original callback
                    else
                        this.next();
                }
                else {
                    var obj = this;
                    terminal.inputMode(function(ttext){
                        try {
                            var ts = ttext.match(SPACESEP_REGEX);
                            if (!ts) {
                                throw "input sequence was empty";
                            }

                            // update variable value (or create if not seen); save
                            // any extra tokens for a future operation
                            obj.inputRequest(ts[0]);
                            obj.extra = obj.extra.concat(ts.slice(1));
                        } catch (e) {
                            terminal.addLine("input block: error: " + e,'error-line');
                            return; // don't call 'next' since this is an error
                        }

                        // if we are done with the input operation, call the
                        // 'next' callback; otherwise make a recursive call
                        if (done)
                            next(); // original callback
                        else
                            obj.next();
                    });
                }

                // the callback will handle the rest of the operation
                return;
            }
        }
    };
    cb.prototype.inputRequest = function(tok) {
        // consume an input request (aka a 'thing') and process it
        var thing = this.things[this.iter++];

        if ('v' in thing) {
            block.updateCreateVariable(thing.v,Number(tok));
        }
        else if ('e' in thing) {
            thing.e.parseTree().root.lval(block)(Number(tok));
        }
    };

    if (errors.length > 0) {
        for (var e of errors)
            terminal.addLine("input block: error: " + e,'error-line');
        // cause the simulation to fail by not calling 'next'
    }
    else {
        try {
            var o = new cb();
            o.next();
        } catch (e) {
            terminal.addLine("input block: error: " + e,'error-line');
        }
    }
};

////////////////////////////////////////////////////////////////////////////////
// ExpressionParser - produces a syntax tree of the simple expression language
// used by the simulator
////////////////////////////////////////////////////////////////////////////////

// regular expressions for lexing
const IDENT_REGEX = /[a-zA-Z_][a-zA-Z_0-9]*/;
const NUMER_REGEX = /[0-9]*(?:\.?[0-9]+)/;
const SYMBOL_REGEX = /\(|\)|\[|\]|\+|-|\*|\/|\^|,|==|=|<=|>=|<>|<|>/; // list longest strings first
const EXPR_REGEX = /([a-zA-Z_][a-zA-Z_0-9]*)|([0-9]*(?:\.?[0-9]+))|(\(|\)|\[|\]|\+|-|\*|\/\/|\/|\^|,|==|=|<=|>=|<>|<|>)/g;

// expression types for evaluation
AssignmentExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'assign-expr';
};
LogicORExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'or-expr';
};
LogicANDExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'and-expr';
};
EqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'eq-expr';
};
NotEqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'not-eq-expr';
};
LessThanExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'less-expr';
};
GreaterThanExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'greater-expr';
};
LessThanEqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'less-eq-expr';
};
GreaterThanEqualExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'greater-eq-expr';
};
AddExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'add-expr';
};
SubtractExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'subtract-expr';
};
MultiplyExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'multiply-expr';
};
DivideExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'divide-expr';
};
IDivideExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'idivide-expr';
};
ExponentExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'exponent-expr';
};
NegateExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'negate-expr';
};
NotExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'not-expr';
};
FunctionCallExpressionNode = function(left,right) {
    this.left = left;
    this.right = right;
    this.kind = 'function-call';
};
IdentifierNode = function(tok,index) {
    this.id = tok.text;
    this.kind = 'identifier';
    this.index = index;
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
IDivideExpressionNode.prototype.eval = function(block) {
    return Math.floor(this.left.eval(block) / this.right.eval(block));
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
    // special identifiers
    if (this.id == 'true')
        return true;
    if (this.id == 'false')
        return false;

    // lookup variable based on identifier and index; index may be undefined
    if (typeof this.index != 'undefined')
        var index = Math.floor(this.index.eval(block));
    var v = block.lookupVariable(this.id,index);
    if (v == null) {
        throw "'" + this + "': variable is undefined";
    }

    return v;
};
IdentifierNode.prototype.lval = function(block) {
    var id = this.id;
    if (typeof this.index != 'undefined')
        var index = Math.floor(this.index.eval(block));
    return function(val) { block.updateCreateVariable(id,val,index); };
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
IDivideExpressionNode.prototype.toString = function() {
    return '(' + this.left + ') // (' + this.right + ')';
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
    if (typeof this.index != 'undefined')
        return this.id + '[' + this.index + ']';
    return this.id;
};
NumberNode.prototype.toString = function() {
    return String(this.value);
};

// typeOf prototypes for expression types
AssignmentExpressionNode.prototype.typeOf = function() {
    return this.right.typeOf();
};
LogicORExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
LogicANDExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
EqualExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
NotEqualExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
LessThanExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
GreaterThanExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
LessThanEqualExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
GreaterThanEqualExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
AddExpressionNode.prototype.typeOf = function() {
    return 'number';
};
SubtractExpressionNode.prototype.typeOf = function() {
    return 'number';
};
MultiplyExpressionNode.prototype.typeOf = function() {
    return 'number';
};
DivideExpressionNode.prototype.typeOf = function() {
    return 'number';
};
IDivideExpressionNode.prototype.typeOf = function() {
    return 'number';
};
ExponentExpressionNode.prototype.typeOf = function() {
    return 'number';
};
NegateExpressionNode.prototype.typeOf = function() {
    return 'number';
};
NotExpressionNode.prototype.typeOf = function() {
    return 'boolean';
};
IdentifierNode.prototype.typeOf = function() {
    if (this.id == 'true' || this.id == 'false')
        return 'boolean';

    // a variable doesn't necessarily have a value at this point...
    return 'variable';
};
NumberNode.prototype.typeOf = function() {
    return 'number';
};

function ExpressionParser(expr,allowBoolean,allowAssignment) {
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
                    // some identifiers are treated specially (such as 'true')
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
                parseTree.root = expression();
                if (iter < toks.length) {
                    throw "stray token could not be matched: '" + toks[iter].text + "'";
                }
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

    function expression(node) {
        return assignmentExpression(node);
    }
    function assignmentExpression(node) {
        var result = orExpression(node);
        result = assignmentExpressionOpt(result);
        return result;
    }
    function assignmentExpressionOpt(node) {
        if (matchToken('symbol','=')) {
            if (!allowAssignment) {
                throw "assignment-operator '=' is not allowed";
            }

            // do some semantic checking
            if (node.kind != 'identifier') {
                throw "left-hand side of assign-expr is not assignable";
            }

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
        if (matchToken('symbol','or')) {
            if (!allowBoolean) {
                throw "or-operator 'or' is not allowed";
            }

            return orExpressionOpt( new LogicORExpressionNode(node,andExpression()) );
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
            if (!allowBoolean) {
                throw "and-operator 'and' is not allowed";
            }

            return andExpressionOpt( new LogicANDExpressionNode(node,equalityExpression()) );
        }

        return node;
    }
    function equalityExpression(node) {
        var result = relationalExpression(node);
        result = equalityExpressionOpt(result);
        return result;
    }
    function equalityExpressionOpt(node) {
        if (matchToken('symbol','==')) {
            if (!allowBoolean) {
                throw "equality-operator '==' is not allowed";
            }

            return equalityExpressionOpt( new EqualExpressionNode(node,relationalExpression()) );
        }
        else if (matchToken('symbol','<>')) {
            if (!allowBoolean) {
                throw "inequality-operator '<>' is not allowed";
            }

            return equalityExpressionOpt( new NotEqualExpressionNode(node,relationalExpression()) );
        }

        return node;
    }
    function relationalExpression(node) {
        var result = additiveExpression(node);
        result = relationalExpressionOpt(result);
        return result;
    }
    function relationalExpressionOpt(node) {
        if (matchToken('symbol','<')) {
            if (!allowBoolean) {
                throw "relational-operator '<' is not allowed";
            }

            return relationalExpressionOpt( new LessThanExpressionNode(node,additiveExpression()) );
        }
        else if (matchToken('symbol','>')) {
            if (!allowBoolean) {
                throw "relational-operator '>' is not allowed";
            }

            return relationalExpressionOpt( new GreaterThanExpressionNode(node,additiveExpression()) );
        }
        else if (matchToken('symbol','<=')) {
            if (!allowBoolean) {
                throw "relational-operator '<=' is not allowed";
            }

            return relationalExpressionOpt( new LessThanEqualExpressionNode(node,additiveExpression()) );
        }
        else if (matchToken('symbol','>=')) {
            if (!allowBoolean) {
                throw "relational-operator '>=' is not allowed";
            }

            return relationalExpressionOpt( new GreaterThanEqualExpressionNode(node,additiveExpression()) );
        }

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
        else if (matchToken('symbol','//'))
            return multiplicativeExpressionOpt( new IDivideExpressionNode(node,exponentialExpression()) );

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
        if (ex = matchToken('identifier')) {
            if (matchToken('symbol','[')) {
                var index = expression();
                if (!matchToken('symbol',']')) {
                    throw "expected matching ']' for indexed variable";
                }
                return new IdentifierNode(ex,index);
            }
            return new IdentifierNode(ex);
        }

        if (ex = matchToken('number'))
            return new NumberNode(ex);

        // parenthesized expression
        if (matchToken('symbol','(')) {
            var newnode = expression();
            if (!matchToken('symbol',')')) {
                throw "expected matching ')' for parenthesized expression";
            }
            return newnode;
        }

        if (iter < toks.length)
            throw "cannot understand token: '" + toks[iter].text + "'";
        throw "expected token after '" + toks[toks.length-1].text + "'";
    }

    function evaluate(block) {
        if (parseTree.empty)
            return; // nothing to do
        if (typeof parseTree.root == 'undefined')
            throw "the expression was malformed";

        return parseTree.root.eval(block);
    }

    // findNode() - finds a node in the parse tree with the specified kind; this
    // function only checks for existence
    function containsNode(exprKind) {
        function recall(node) {
            if (node.kind == exprKind)
                return true;
            if (typeof node.left == 'undefined' || typeof node.right == 'undefined')
                return false;
            return recall(node.left) || recall(node.right);
        }

        return recall(parseTree.root);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    if (typeof allowBoolean == 'undefined')
        allowBoolean = true;
    if (typeof allowAssignment == 'undefined')
        allowAssignment = true;

    tokenize();
    parse();
    this.empty = function(){return parseTree.empty;};
    this.parseTree = function(){return parseTree;};
    this.evaluate = evaluate;
    this.error = function(){return errorMsg!=null;};
    this.errorMsg = function(){return errorMsg;};
    this.expr = function(){return expr;};
    this.containsNode = containsNode;
}
