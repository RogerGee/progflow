// logic.js - progflow

// FlowBlockLogic - logic handling for flowblock visuals
function FlowBlockLogic(visual,block) {
    var locals = {}; // local variables

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // createVariable() - create new variable (name must not be in use in this
    // scope)
    function createVariable(name,initialValue) {
        if (typeof locals[name] == "undefined") {
            locals[name] = initialValue;
            return true;
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

    // ontoggle() - invoked when the visual in front of the logic is toggled
    // by the user (i.e. selected)
    function ontoggle(state) {

    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    this.createVariable = createVariable;
    this.lookupVariable = lookupVariable;
    this.updateVariable = updateVariable;
    this.ontoggle = ontoggle;
}

// FlowOperationLogic - logic handling for flow-operation visuals
function FlowOperationLogic(visual,block) {

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function ontoggle(state) {

    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
    ////////////////////////////////////////////////////////////////////////////

    this.ontoggle = ontoggle;
}
