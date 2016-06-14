// langconv.js - progflow

// convCpp: produce C++ source code from the save representation; this will
// perform some static semantic analysis since the Simulator only detects errors
// at runtime
function convCpp(saveRep) {
    var params = {
        funcs: [],        // the list of function identifiers
        funcdecls: [],    // the actual declaration strings
        bodies: []        // the function body strings
    };

    var prepend1 = "// " + saveRep.label + ".cpp\n#include <iostream>\n";
    var prepend2 = "using namespace std;\n\n";

    // produce forward declarations of all function names
    for (var proc of saveRep.children)
        params.funcs.push(proc.label);

    // generate C++ code
    for (var proc of saveRep.children)
        funcCpp(proc,params);

    // after main code generation
    if ('includeCmath' in params)
        prepend1 += "#include <cmath>\n";

    var funcdecls = params.funcdecls.reduce(function(prev,cur){
        return prev + "\n" + cur;
    });
    var funcdefs = params.bodies.reduce(function(prev,cur){
        return prev + "\n" + cur;
    },'');
    return prepend1 + prepend2 + funcdecls + "\n" + funcdefs + "\n";
}

// funcCpp: implementation function for single function generation
function funcCpp(saveRep,params) {
    var inner = "";  // inner text of proc

    // generate a scope block of all the function names; this way we don't
    // misinterpret function ids as variable ids
    var fscope = {};
    for (var fid of params.funcs)
        fscope[fid] = null;

    // produce the function body; we do this first so we can accurately
    // determine the number of arguments to the function easily
    var code = "";
    var scopes = [fscope];
    var addStmt = function(text) {
        code += (new Array((scopes.length-1)*4+1)).join(' ') + text + "\n";
    };
    blockCpp(saveRep,scopes,params,addStmt,true);

    // generate a forward declaration for the function; the arguments have
    // well-known names
    var paramList = "";
    var decl = "";
    if (saveRep.argc > 0) {
        paramList += "double arg1";
        for (var i = 1;i < saveRep.argc;++i)
            paramList += ",double arg" + String(i+1);
    }
    decl = (saveRep.label=="main" ? "int "
            : searchForConstruct(saveRep,"flowret") ? "double " : "void ")
                + saveRep.label + "(" + paramList + ")";

    params.funcdecls.push(decl+";");
    params.bodies.push(decl+"\n"+code);
}

function delagateCpp(saveRep,scopes,params,addStmt) {
    if (saveRep.kind == "flowoperation")
        operationCpp(saveRep,scopes,params,addStmt);

    if (saveRep.kind == "flowin")
        inCpp(saveRep,scopes,params,addStmt);

    if (saveRep.kind == "flowout")
        outCpp(saveRep,scopes,params,addStmt);

    if (saveRep.kind == "flowif")
        ifCpp(saveRep,scopes,params,addStmt);

    if (saveRep.kind == "flowwhile")
        whileCpp(saveRep,scopes,params,addStmt);

    if (saveRep.kind == "flowbreak")
        breakCpp(saveRep,scopes,params,addStmt);

    if (saveRep.kind == "flowret")
        retCpp(saveRep,scopes,params,addStmt);
}

// generates a block of C++ code
function blockCpp(saveRep,scopes,params,addStmt,doBraces) {
    // generate a new scope for the function's local variables
    var s = {};
    saveRep.argc = 0;

    // create a temporary scope for the function's parameters; this helps us
    // accurately count them but not include them in the set of local variables
    var argscope = {};
    scopes.push(argscope);

    // search the current block level for variable references; we use this to
    // figure out which names were introduced in this scope
    for (var o of saveRep.children) {
        var ids = [];

        if (o.kind == 'flowoperation') {
            // build an expression parser like a FlowOperationLogic does to find
            // identifiers that are modified
            var expr = new ExpressionParser(o.logic.expr,false,true);
            ids = expr.findNodes('identifier').map(
                function(x){return x.id;});
            o.cache = expr;
        }
        else if (o.kind == 'flowret') {
            // like above but for FlowReturnLogic
            var expr = new ExpressionParser(o.logic.expr,false,false);
            ids = expr.findNodes('identifier').map(
                function(x){return x.id});
            o.cache = expr;
        }
        else if (o.kind == 'flowin' || o.kind == 'flowout') {
            // use the FormatString class to parse any expressions used in the
            // format string that could potentially declare variables
            var fs = new FormatString(o.logic.formatString);
            ids = fs.getIdentifiers();
            o.cache = fs;
        }

        // go through each of the idenfiers; if the name hasn't been referenced,
        // add to the current scope
        for (var name of ids) {
            if (!searchScopes(scopes,name)) {
                // count arguments and don't include them in the parameter
                // count
                if (name.match(/^arg[0-9]+$/)) {
                    saveRep.argc += 1;
                    argscope[name] = null; // include in argument scope
                    continue;
                }
                s[name] = null;
            }
        }
    }
    scopes.pop(); // pop off argument scope

    // generate code in the new scope

    if (doBraces)
        addStmt("{");
    scopes.push(s);

    // first create variable declarations for all the local variables introduced
    // in this scope
    for (var name in s)
        addStmt("double " + name + ";");

    // now create the constructs
    for (var o of saveRep.children) {
        delagateCpp(o,scopes,params,addStmt);
    }

    // unload the scope
    scopes.pop();
    if (doBraces)
        addStmt("}");
}

function operationCpp(saveRep,scopes,params,addStmt) {
    // the expression should already be cached in the save rep
    addStmt( saveRep.cache.convCpp(params) + ";" );
}

function inCpp(saveRep,scopes,params,addStmt) {
    var parts = saveRep.cache.getParts();
    for (var p of parts) {
        if (p.kind == 'lit') {
            addStmt("cout << \"" + p.object + "\";");
        }
        else /* if (p.kind == 'obj') */ {
            if (typeof p.object == 'object') // it's an expression
                addStmt("cin >> " + p.object.convCpp(params) + ";");
            else // it's a string (simple variable)
                addStmt("cin >> " + p.object + ";");
        }
    }
}

function outCpp(saveRep,scopes,params,addStmt) {
    var parts = saveRep.cache.getParts();

    // handle special case for empty output statements with newline
    if (parts.length == 0 && saveRep.logic.nl)
        addStmt("cout << \"\\n\";");

    // generate the output statement
    for (var i = 0;i < parts.length;++i) {
        var stmt;
        var suff = "";
        var nl1 = "", nl2 = "";
        var p = parts[i];

        // chain output expressions together if this is not the first expression
        if (i > 0)
            stmt = "     << ";
        else
            stmt = "cout << ";

        // if this is the last expression, add appropriate terminators
        if (i+1 == parts.length) {
            if (saveRep.logic.nl) {
                nl1 = "\\n";
                nl2 = " << \"\\n\"";
            }
            suff = ";"
        }

        // add an output expression
        if (p.kind == 'lit') {
            addStmt(stmt + "\"" + p.object + nl1 + "\"" + suff);
        }
        else /* if (p.kind == 'obj') */ {
            if (typeof p.object == 'object') // it's an expression
                addStmt(stmt + p.object.convCpp(params) + nl2 + suff);
            else // it's a string (simple variable)
                addStmt(stmt + p.object + nl2 + suff);
        }
        prev = true;
    }
}

function ifCpp(saveRep,scopes,params,addStmt) {
    // build an expression just like the IfLogic node does
    var expr = new ExpressionParser(saveRep.logic.cond,true,false);

    // generate true part
    addStmt("if (" + expr.convCpp(params) + ") {");
    blockCpp(saveRep.truePart,scopes,params,addStmt,false);
    addStmt("}");

    // generate false part (if it is non-empty)
    if (saveRep.falsePart.children.length > 0) {
        addStmt("else {");
        blockCpp(saveRep.falsePart,scopes,params,addStmt,false);
        addStmt("}");
    }
}

function whileCpp(saveRep,scopes,params,addStmt) {
    var expr = new ExpressionParser(saveRep.logic.cond,true,false);

    // generate body
    addStmt("while (" + expr.convCpp(params) + ") {");
    blockCpp(saveRep.body,scopes,params,addStmt,false);
    addStmt("}");
}

function breakCpp(saveRep,scopes,params,addStmt) {
    // TODO: check for appropriate context

    addStmt("break;");
}
function retCpp(saveRep,scopes,params,addStmt) {
    addStmt("return " + saveRep.cache.convCpp(params) + ";");
}

function convPython(saveRep) {

}

// helpers

function searchForConstruct(saveRep,kind) {
    if (saveRep.kind == kind)
        return saveRep;

    // recursively search through any possible subconstructs
    if ('truePart' in saveRep && searchForConstruct(saveRep.truePart,kind))
        return saveRep.truePart;
    if ('falsePart' in saveRep && searchForConstruct(saveRep.falsePart,kind))
        return saveRep.falsePart;
    if ('children' in saveRep) {
        for (var o of saveRep.children) {
            if (searchForConstruct(o,kind))
                return o;
        }
    }

    // otherwise not found
    return null;
}

function searchScopes(scopes,name) {
    // determine if 'name' is a key for any of the dictionaries in list 'scopes'
    for (var s of scopes) {
        if (name in s)
            return true;
    }
    return false;
}
