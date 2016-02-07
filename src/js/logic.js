// logic.js - progflow

function FlowBlockLogic(visual) {
    var locals = {}; // local variables

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // createVariable() - create new variable (name must not be in use)
    function createVariable(name,initialValue) {
        if (typeof locals[name] == "undefined") {
            locals[name] = initialValue;
            return true;
        }

        return false;
    }

    // lookupVariable() - look up value of variable; must already be in use
    function lookupVariable(name) {
        if (typeof locals[name] == "undefined")
            return null;

        return locals[name];
    }

    // updateVariable() - update existing variable value
    function updateVariable(name,value) {
        if (typeof locals[name] == "undefined")
            return false;

        locals[name] = value;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    this.createVariable = createVariable;
    this.lookupVariable = lookupVariable;
    this.updateVariable = updateVariable;
}
