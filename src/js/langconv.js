// langconv.js - progflow

////////////////////////////////////////////////////////////////////////////////
// BEGIN C++ CODE GENERATION FUNCTIONALITY
////////////////////////////////////////////////////////////////////////////////

const CPP_ARRAY_SIZE = 256;
const ARRAY_ACCESS_MACRO = "#define INDEX(x) (int(x) & 0xff)";
const ARG_REGEX = /^arg([1-9][0-9]*)$/;

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
    if ('usesArrays' in params)
        prepend1 += ARRAY_ACCESS_MACRO + "\n";

    var funcdecls = params.funcdecls.reduce(function(prev,cur){
        if (prev == '')
            return cur;
        return prev + "\n" + cur;
    },'');
    var funcdefs = params.bodies.reduce(function(prev,cur){
        if (prev == '')
            return cur;
        return prev + "\n" + cur;
    },'');
    if (funcdecls.length > 0)
        funcdecls += "\n\n";
    return prepend1 + prepend2 + funcdecls + funcdefs;
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

    if (saveRep.label != "main") // only add if not main procedure
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

    // this function takes an IdentifierNode object and converts it to a string
    // identifier; it also marks array-type identifiers for later processing; we
    // store all array type references but will only resolve those that are
    // declared in this scope
    var arrays = {};
    function cppIdString(x) {
        // if a variable index was used, we mark an array reference for the
        // variable name
        if (typeof x.index != 'undefined') {
            arrays[x.id] = null;
        }
        return x.id
    }

    // search the current block level for variable references; we use this to
    // figure out which names were introduced in this scope
    for (var o of saveRep.children) {
        var ids = [];

        // this function recursively searches for only argument variables OR
        // array-type usage of variables that have already been defined; this is
        // so we can scope these properly
        function searchSpecialIds(node) {
            var fs = null;
            var expr = null;
            if (node.kind == 'flowoperation') {
                if (typeof node.cache == "undefined") {
                    // build an expression parser like a FlowOperationLogic does to find
                    // identifiers that are modified
                    expr = new ExpressionParser(node.logic.expr,false,true);
                    node.cache = expr;
                }
                else
                    expr = node.cache;
            }
            else if (node.kind == 'flowret') {
                if (typeof node.cache == 'undefined') {
                    // build the return expression
                    expr = new ExpressionParser(node.logic.expr,false,false);
                    node.cache = expr;
                }
                else
                    expr = node.cache;
            }
            else if (node.kind == 'flowin' || node.kind == 'flowout') {
                if (typeof node.cache == 'undefined') {
                    // use the FormatString class to parse any expressions used
                    // in the format string that could potentially declare
                    // variables
                    fs = new FormatString(node.logic.formatString);
                    node.cache = fs;
                }
                else
                    fs = node.cache;
            }
            else if (node.kind == 'flowif') {
                if (typeof node.cache == 'undefined') {
                    // build an expression just like an IfLogic node
                    expr = new ExpressionParser(node.logic.cond,true,false);
                    node.cache = expr;
                }
                else
                    expr = node.cache;
                searchSpecialIds(node.truePart);
                searchSpecialIds(node.falsePart);
            }
            else if (node.kind == 'flowwhile') {
                if (typeof node.cache == 'undefined') {
                    // build an expression just like a WhileLogic node
                    expr = new ExpressionParser(node.logic.cond,true,false);
                    node.cache = expr;
                }
                else
                    expr = node.cache;
                searchSpecialIds(node.body);
            }
            else if (node.kind == 'flowblock') {
                for (var child of node.children)
                    searchSpecialIds(child);
            }

            // generate ids; only keep those that are argument references; we
            // also will store references to array-type variables when we call
            // the 'cppIdString' function
            if (fs) {
                ids.concat(fs.getIdentifiers(cppIdString).filter(
                    function(x){x.match(ARG_REGEX);}));
            }
            if (expr) {
                ids.concat(expr.findNodes('identifier').map(cppIdString).filter(
                    function(x){x.match(ARG_REGEX);}));
            }
        }

        // handle top-level constructs (these ids always go into our scope if
        // they haven't been found already)
        if (o.kind == 'flowoperation') {
            var expr;
            if (typeof o.cache == "undefined") {
                // build an expression parser like a FlowOperationLogic does to find
                // identifiers that are modified
                expr = new ExpressionParser(o.logic.expr,false,true);
                o.cache = expr;
            }
            else
                expr = o.cache;
            ids = expr.findNodes('identifier').map(cppIdString);
        }
        else if (o.kind == 'flowret') {
            // like above but for FlowReturnLogic
            var expr;
            if (typeof o.cache == 'undefined') {
                expr = new ExpressionParser(o.logic.expr,false,false);
                o.cache = expr;
            }
            else
                expr = o.cache;
            ids = expr.findNodes('identifier').map(cppIdString);
        }
        else if (o.kind == 'flowin' || o.kind == 'flowout') {
            var fs;
            if (typeof o.cache == 'undefined') {
                // use the FormatString class to parse any expressions used in the
                // format string that could potentially declare variables
                fs = new FormatString(o.logic.formatString);
                o.cache = fs;
            }
            else
                fs = o.cache;
            ids = fs.getIdentifiers(cppIdString);
        }
        else {
            searchSpecialIds(o);
        }

        // go through each of the idenfiers; if the name hasn't been referenced,
        // add to the current scope
        for (var name of ids) {
            if (!searchScopes(scopes,name)) {
                var m;
                // count arguments and don't include them in the new scope
                if (m = name.match(ARG_REGEX)) {
                    if (saveRep.argc < m[1])
                        saveRep.argc = Number(m[1]);

                    // include the name in the temporary argument scope; this
                    // allows us to only consider unique arguments
                    argscope[name] = null;
                    continue;
                }

                // add the identifier to the scope name table
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
    var created = false;
    var vardecls = "";
    for (var name in s) {
        vardecls += (created ? "," : "double");
        if (vardecls.length >= 80) {
            addStmt(vardecls);
            vardecls = "       ";
        }
        vardecls += " " + name;
        if (name in arrays) {
            // handle special array-type variables; arrays in ProgFlow work by
            // key-value pairs where the key is always an integer; to implement
            // this in C++, we have to have a statically sized array; an array
            // name has a trailing '_'
            vardecls += ", " + name + "_[" + CPP_ARRAY_SIZE + "]";
            params.usesArrays = true;
        }
        created = true;
    }
    if (vardecls.length > 0)
        addStmt(vardecls + ";");

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
    var text = "";
    for (var i = 0;i < parts.length;++i) {
        var nl1 = "", nl2 = "";
        var p = parts[i];

        // check for long lines and break them if needed
        if (text.length >= 80) {
            addStmt(text);
            text = "    ";
        }

        // chain output expressions together if this is not the first expression
        if (i > 0)
            text += " << ";
        else
            text += "cout << ";

        // if this is the last expression, add appropriate terminators
        if (i+1 == parts.length) {
            if (saveRep.logic.nl) {
                nl1 = "\\n";
                nl2 = " << \"\\n\"";
            }
        }

        // add an output expression
        if (p.kind == 'lit') {
            text += "\"" + p.object + nl1 + "\"";
        }
        else /* if (p.kind == 'obj') */ {
            if (typeof p.object == 'object') // it's an expression
                text += p.object.convCpp(params) + nl2;
            else // it's a string (simple variable)
                text += p.object + nl2;
        }
    }
    if (text.length > 0)
        addStmt(text + ";");
}

function ifCpp(saveRep,scopes,params,addStmt) {
    var expr = saveRep.cache;

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
    var expr = saveRep.cache;

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

////////////////////////////////////////////////////////////////////////////////
// END C++ CODE GENERATION FUNCTIONALITY
////////////////////////////////////////////////////////////////////////////////

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
